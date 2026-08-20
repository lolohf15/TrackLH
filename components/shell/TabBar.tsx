"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav";

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-surface/95 backdrop-blur-md border-t border-border pb-safe">
      <div className="grid grid-cols-4">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "press flex flex-col items-center justify-center gap-1.5 pt-2.5 pb-2 border-t-2 transition-colors duration-150 ease-out",
                active ? "border-accent" : "border-transparent"
              )}
            >
              <Icon className={cn("w-3.5 h-3.5 transition-colors duration-150", active ? "text-accent" : "text-text-dim")} />
              <span className={cn(
                "font-mono text-[9px] font-medium uppercase tracking-wide transition-colors duration-150",
                active ? "text-accent" : "text-text-dim"
              )}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
