"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col fixed top-0 left-0 bottom-0 z-30 w-[72px] hover:w-[220px] group bg-surface border-r border-border transition-[width] duration-200 ease-out overflow-hidden">
      <div className="h-16 flex items-center px-[22px] shrink-0 border-b border-border">
        <img src="/TrackLHLogo.png" alt="TrackLH" className="w-6 h-6 shrink-0 object-cover" />
        <span className="ml-3 font-mono text-xs font-semibold tracking-[0.15em] text-text whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 delay-75">
          TRACKLH
        </span>
      </div>

      <nav className="flex-1 flex flex-col pt-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "press flex items-center h-11 border-l-2 transition-colors duration-150 ease-out",
                active ? "border-accent text-accent" : "border-transparent text-text-dim hover:text-text-muted"
              )}
            >
              <span className="w-9 h-9 flex items-center justify-center shrink-0 pl-[7px]">
                <Icon className="w-[15px] h-[15px]" />
              </span>
              <span className="font-mono text-[11px] font-medium uppercase tracking-wide whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 delay-75">
                {label}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
