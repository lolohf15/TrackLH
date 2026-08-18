"use client";

import { usePathname } from "next/navigation";
import { mutate } from "swr";
import { Sidebar } from "./Sidebar";
import { TabBar } from "./TabBar";
import { SyncButton } from "@/components/dashboard/SyncButton";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-bg">
      <Sidebar />

      <div className="md:pl-[72px]">
        <header className="sticky top-0 z-20 bg-bg/95 backdrop-blur-md border-b border-border md:hidden">
          <div className="px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <img src="/TrackLHLogo.png" alt="TrackLH" className="w-7 h-7 rounded-lg shrink-0 object-cover" />
              <h1 className="text-sm font-semibold text-text truncate">TrackLH</h1>
            </div>
            <SyncButton lastSyncAt={null} onSyncComplete={() => mutate(() => true)} compact />
          </div>
        </header>

        <header className="hidden md:flex sticky top-0 z-20 bg-bg/95 backdrop-blur-md border-b border-border items-center justify-end px-8 h-16">
          <SyncButton lastSyncAt={null} onSyncComplete={() => mutate(() => true)} compact />
        </header>

        <main key={pathname} className="animate-fade-in-up pb-24 md:pb-8">
          {children}
        </main>
      </div>

      <TabBar />
    </div>
  );
}
