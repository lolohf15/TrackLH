"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Sidebar } from "./Sidebar";
import { TabBar } from "./TabBar";
import { NAV_ITEMS } from "./nav";
import { AddRecordButton } from "@/components/transactions/AddRecordButton";

function tabIndex(pathname: string): number {
  return NAV_ITEMS.findIndex((item) =>
    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
  );
}

/** How far the entering page starts off — and the exiting one leaves to. */
const SLIDE_OFFSET = 24;

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

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <Sidebar />

      <div className="relative flex flex-1 flex-col overflow-x-hidden md:pl-[72px]">
        <header className="scroll-edge sticky top-0 z-20 shrink-0 pt-safe bg-bg/75 backdrop-blur-xl md:hidden">
          <div className="px-4 py-3 flex items-center gap-2.5">
            <img src="/TrackLHLogo.png" alt="TrackLH" className="w-6 h-6 shrink-0 object-cover" />
            <h1 className="font-mono text-xs font-semibold tracking-[0.15em] text-text truncate">TRACKLH</h1>
          </div>
        </header>

        <AnimatePresence mode="popLayout" custom={direction} initial={false}>
          <Page key={pathname} direction={direction}>
            {children}
          </Page>
        </AnimatePresence>
      </div>

      <AddRecordButton />
      <TabBar />
    </div>
  );
}

/**
 * One page instance. Navigation happens by tapping a tab; the transition just
 * carries the tab-bar direction, so the new page enters from the side the tab
 * sits on and the old one leaves the other way.
 */
function Page({
  children,
  direction,
}: {
  children: React.ReactNode;
  direction: number;
}) {
  const reduceMotion = useReducedMotion();

  const variants = reduceMotion
    ? {
        enter: { opacity: 0, x: 0 },
        center: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: 0 },
      }
    : {
        enter: (dir: number) => ({ opacity: 0, x: dir * SLIDE_OFFSET }),
        center: { opacity: 1, x: 0 },
        exit: (dir: number) => ({ opacity: 0, x: dir * -SLIDE_OFFSET }),
      };

  return (
    <motion.main
      custom={direction}
      variants={variants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={
        reduceMotion
          ? { duration: 0.15, ease: "linear" }
          : { type: "spring", visualDuration: 0.28, bounce: 0 }
      }
      className="flex-1 bg-surface md:bg-transparent pb-28 md:pb-8"
    >
      {children}
    </motion.main>
  );
}
