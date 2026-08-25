"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  AnimatePresence,
  animate,
  motion,
  useDragControls,
  useMotionValue,
  useReducedMotion,
  type PanInfo,
} from "framer-motion";
import { Sidebar } from "./Sidebar";
import { TabBar } from "./TabBar";
import { useTabNav } from "./useSwipeNav";
import { NAV_ITEMS } from "./nav";
import { AddRecordButton } from "@/components/transactions/AddRecordButton";

function tabIndex(pathname: string): number {
  return NAV_ITEMS.findIndex((item) =>
    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
  );
}

/** Past this projected distance the swipe commits instead of snapping back. */
const COMMIT_DISTANCE = 80;
/** How far ahead a flick's velocity is projected (Apple-style momentum projection). */
const VELOCITY_PROJECTION = 0.15;
/** How far the entering page starts off its resting position. */
const ENTER_OFFSET = 32;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const currentIndex = tabIndex(pathname);

  // Which way the next page should slide. Tracked as state adjusted during
  // render (React's documented "value from a previous render" pattern) rather
  // than a ref, so the direction is settled before the exiting page paints.
  const [nav, setNav] = useState({ index: currentIndex, direction: 1 });
  let direction = nav.direction;
  if (nav.index !== currentIndex) {
    direction =
      currentIndex === -1 || nav.index === -1 ? 1 : currentIndex > nav.index ? 1 : -1;
    setNav({ index: currentIndex, direction });
  }

  // Measured on the client so the exit slide travels a real screen width.
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const update = () => setWidth(window.innerWidth);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <Sidebar />

      <div className="relative flex flex-1 flex-col md:pl-[72px]">
        <header className="scroll-edge sticky top-0 z-20 shrink-0 pt-safe bg-bg/75 backdrop-blur-xl md:hidden">
          <div className="px-4 py-3 flex items-center gap-2.5">
            <img src="/TrackLHLogo.png" alt="TrackLH" className="w-6 h-6 shrink-0 object-cover" />
            <h1 className="font-mono text-xs font-semibold tracking-[0.15em] text-text truncate">TRACKLH</h1>
          </div>
        </header>

        <AnimatePresence mode="popLayout" custom={direction} initial={false}>
          <SwipePage key={pathname} direction={direction} width={width}>
            {children}
          </SwipePage>
        </AnimatePresence>
      </div>

      <AddRecordButton />
      <TabBar />
    </div>
  );
}

/**
 * One page instance. Owns its own `x` so the entering and exiting pages never
 * fight over a shared motion value, and so a committed swipe hands its live
 * dragged position straight to the exit animation with no visible seam.
 */
function SwipePage({
  children,
  direction,
  width,
}: {
  children: React.ReactNode;
  direction: number;
  width: number;
}) {
  const x = useMotionValue(0);
  const dragControls = useDragControls();
  const reduceMotion = useReducedMotion();
  const { armed, canPrev, canNext, go } = useTabNav();

  const swipeEnabled = armed && !reduceMotion;

  function onPointerDown(event: React.PointerEvent) {
    if (!swipeEnabled) return;
    // Mouse drags would fight text selection; the gesture is a touch affordance.
    if (event.pointerType === "mouse") return;
    if ((event.target as HTMLElement).closest?.("[data-swipe-ignore]")) return;
    dragControls.start(event);
  }

  function onDragEnd(_event: unknown, info: PanInfo) {
    // Project where the flick was heading rather than only where it stopped,
    // so a fast short swipe commits like it does on iOS.
    const projected = info.offset.x + info.velocity.x * VELOCITY_PROJECTION;

    if (Math.abs(projected) >= COMMIT_DISTANCE) {
      const next: 1 | -1 = projected < 0 ? 1 : -1;
      if ((next === 1 && canNext) || (next === -1 && canPrev)) {
        go(next);
        return; // the exit variant picks x up from where the finger left it
      }
    }

    animate(x, 0, { type: "spring", visualDuration: 0.3, bounce: 0.15 });
  }

  const variants = reduceMotion
    ? {
        enter: { opacity: 0, x: 0 },
        center: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: 0 },
      }
    : {
        enter: (dir: number) => ({ opacity: 0, x: dir * ENTER_OFFSET }),
        center: { opacity: 1, x: 0 },
        exit: (dir: number) => ({ opacity: 0, x: dir * -width }),
      };

  return (
    <motion.main
      style={{ x }}
      custom={direction}
      variants={variants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={
        reduceMotion
          ? { duration: 0.15, ease: "linear" }
          : { type: "spring", visualDuration: 0.35, bounce: 0 }
      }
      drag={swipeEnabled ? "x" : false}
      dragListener={false}
      dragControls={dragControls}
      dragMomentum={false}
      dragElastic={0.5}
      dragConstraints={{ left: canNext ? -width : 0, right: canPrev ? width : 0 }}
      onPointerDown={onPointerDown}
      onDragEnd={onDragEnd}
      className="flex-1 bg-surface md:bg-transparent pb-28 md:pb-8"
    >
      {children}
    </motion.main>
  );
}
