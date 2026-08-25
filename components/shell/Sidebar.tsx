"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col fixed top-0 left-0 bottom-0 z-30 w-[72px] hover:w-[220px] group bg-surface border-r border-border transition-[width] duration-200 ease-out overflow-hidden">
      <div className="h-16 flex items-center px-[22px] shrink-0">
        <img src="/TrackLHLogo.png" alt="TrackLH" className="w-6 h-6 shrink-0 object-cover" />
        <span className="ml-3 font-mono text-xs font-semibold tracking-[0.15em] text-text whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 delay-75">
          TRACKLH
        </span>
      </div>

      <nav className="flex-1 flex flex-col gap-0.5 px-3 pt-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                // A filled pill carries the selection; a colored edge-rule would
                // only work while the rail is collapsed.
                "press flex items-center h-11 rounded-md transition-colors duration-150 ease-out",
                active ? "bg-accent/12 text-accent" : "text-text-dim hover:bg-white/[0.04] hover:text-text-muted"
              )}
            >
              <span className="w-[42px] h-9 flex items-center justify-center shrink-0">
                <Icon className="w-[18px] h-[18px]" active={active} />
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
