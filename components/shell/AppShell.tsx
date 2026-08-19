"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { TabBar } from "./TabBar";
import { useSwipeNav } from "./useSwipeNav";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const swipe = useSwipeNav();

  return (
    <div className="min-h-screen bg-bg">
      <Sidebar />

      <div className="md:pl-[72px]">
        <header className="sticky top-0 z-20 bg-bg/95 backdrop-blur-md border-b border-border md:hidden">
          <div className="px-4 py-3 flex items-center gap-2.5">
            <img src="/TrackLHLogo.png" alt="TrackLH" className="w-7 h-7 rounded-lg shrink-0 object-cover" />
            <h1 className="text-sm font-semibold text-text truncate">TrackLH</h1>
          </div>
        </header>

        <main
          key={pathname}
          className="animate-fade-in-up pb-24 md:pb-8"
          onTouchStart={swipe.onTouchStart}
          onTouchMove={swipe.onTouchMove}
          onTouchEnd={swipe.onTouchEnd}
        >
          {children}
        </main>
      </div>

      <TabBar />
    </div>
  );
}
