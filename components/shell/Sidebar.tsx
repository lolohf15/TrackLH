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
        <img src="/TrackLHLogo.png" alt="TrackLH" className="w-7 h-7 rounded-lg shrink-0 object-cover" />
        <span className="ml-3 text-sm font-semibold text-text whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 delay-75">
          TrackLH
        </span>
      </div>

      <nav className="flex-1 flex flex-col gap-1 px-[18px] pt-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "press flex items-center h-10 rounded-xl transition-[background-color,color,transform] duration-150 ease-out",
                active ? "bg-green-bg text-green-fg" : "text-text-dim hover:bg-surface-2 hover:text-text-muted"
              )}
            >
              <span className="w-9 h-9 flex items-center justify-center shrink-0">
                <Icon className="w-[18px] h-[18px]" />
              </span>
              <span className="text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 delay-75">
                {label}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
