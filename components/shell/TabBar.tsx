"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav";

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-surface/95 backdrop-blur-md border-t border-border pb-safe">
      <div className="grid grid-cols-4 px-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className="press flex flex-col items-center justify-center gap-1 py-2.5 transition-transform duration-150 ease-out"
            >
              <Icon className={cn("w-5 h-5 transition-colors duration-150", active ? "text-green-fg" : "text-text-dim")} />
              <span className={cn("text-[10px] font-medium transition-colors duration-150", active ? "text-green-fg" : "text-text-dim")}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
