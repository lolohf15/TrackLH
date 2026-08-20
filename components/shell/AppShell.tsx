"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Sidebar } from "./Sidebar";
import { TabBar } from "./TabBar";
import { useSwipeNav } from "./useSwipeNav";
import { NAV_ITEMS } from "./nav";

function tabIndex(pathname: string): number {
  return NAV_ITEMS.findIndex((item) =>
    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
  );
}

const SLIDE_DISTANCE = 18;

const variants = {
  enter: (direction: number) => ({ opacity: 0, x: direction * SLIDE_DISTANCE }),
  center: { opacity: 1, x: 0 },
  exit: (direction: number) => ({ opacity: 0, x: direction * -SLIDE_DISTANCE }),
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const swipe = useSwipeNav();

  const currentIndex = tabIndex(pathname);
  const prevIndexRef = useRef(currentIndex);
  const direction =
    currentIndex === -1 || prevIndexRef.current === -1 || currentIndex === prevIndexRef.current
      ? 1
      : currentIndex > prevIndexRef.current
      ? 1
      : -1;

  useEffect(() => {
    prevIndexRef.current = currentIndex;
  }, [currentIndex]);

  return (
    <div className="min-h-screen bg-bg">
      <Sidebar />

      <div className="md:pl-[72px]">
        <header className="sticky top-0 z-20 bg-surface/95 backdrop-blur-md border-b border-border md:hidden">
          <div className="px-4 py-3 flex items-center gap-2.5">
            <img src="/TrackLHLogo.png" alt="TrackLH" className="w-6 h-6 shrink-0 object-cover" />
            <h1 className="font-mono text-xs font-semibold tracking-[0.15em] text-text truncate">TRACKLH</h1>
          </div>
        </header>

        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.main
            key={pathname}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
            className="bg-surface md:bg-transparent pb-24 md:pb-8 min-h-[calc(100vh-49px)] md:min-h-screen"
            onTouchStart={swipe.onTouchStart}
            onTouchMove={swipe.onTouchMove}
            onTouchEnd={swipe.onTouchEnd}
          >
            {children}
          </motion.main>
        </AnimatePresence>
      </div>

      <TabBar />
    </div>
  );
}
