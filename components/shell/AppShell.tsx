"use client";

import { useContext, useState } from "react";
import { usePathname } from "next/navigation";
// Internal to Next, but the only handle on which route a subtree renders.
import { LayoutRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { AnimatePresence, motion, useIsPresent, useReducedMotion } from "framer-motion";
import { Sidebar } from "./Sidebar";
import { TabBar } from "./TabBar";
import { NAV_ITEMS } from "./nav";
import { AddRecordButton } from "@/components/transactions/AddRecordButton";
import { AddRecordProvider } from "@/components/transactions/AddRecordProvider";
import { GlassFilter } from "@/components/ui/GlassFilter";
import { ToastProvider } from "@/components/ui/Toast";
import { PreferencesSync } from "@/components/profile/PreferencesSync";

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
    <ToastProvider>
      <AddRecordProvider>
        <div className="flex min-h-dvh flex-col">
          <GlassFilter />
          <PreferencesSync />
          <Sidebar />

          <div className="relative flex flex-1 flex-col overflow-x-hidden md:pl-[72px]">
            {/* No bar on the phone: each tab titles itself. The spacer keeps
                content clear of the status bar and notch, and the scrim over
                it stops scrolled content from running under the clock when
                the app is installed (zero tall in a browser tab). */}
            <div className="pt-safe md:hidden shrink-0" aria-hidden />
            <div className="status-scrim md:hidden" aria-hidden />

            {/*
              A CSS-grid stack, not `mode="popLayout"`: popLayout leans on
              Framer's layout-projection measurement to know when it's safe to
              drop the exiting page from the DOM, and under Next's App Router
              that measurement can land at the wrong moment — an exiting page
              would occasionally never get removed, piling up as duplicate,
              pushed-down content on the next navigation. Every page here shares
              the same grid cell instead, so exiting and entering always overlap
              rather than stack, regardless of exactly when Framer clears the
              old one out.
            */}
            <div className="relative flex-1 grid">
              <AnimatePresence custom={direction} initial={false}>
                <Page key={pathname} direction={direction}>
                  {children}
                </Page>
              </AnimatePresence>
            </div>
          </div>

          <div className="tabbar-fade md:hidden" aria-hidden />
          <AddRecordButton />
          <TabBar />
        </div>
      </AddRecordProvider>
    </ToastProvider>
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
      className="[grid-area:1/1] min-w-0 page-ground pb-28 md:pb-8"
    >
      <FrozenRouter>{children}</FrozenRouter>
    </motion.main>
  );
}

/**
 * Keeps an exiting page on the route it was showing. `children` reads the
 * current route from context, so without this the page sliding out renders
 * the page sliding in, and the switch shows the new tab twice, offset and
 * half faded. A present page follows the live context, so refreshes and
 * query changes still reach it.
 */
function FrozenRouter({ children }: { children: React.ReactNode }) {
  const context = useContext(LayoutRouterContext);
  const isPresent = useIsPresent();
  const [frozen, setFrozen] = useState(context);
  if (isPresent && frozen !== context) setFrozen(context);

  return (
    <LayoutRouterContext.Provider value={isPresent ? context : frozen}>
      {children}
    </LayoutRouterContext.Provider>
  );
}
