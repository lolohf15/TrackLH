"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav";

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-bg/75 backdrop-blur-xl border-t border-border/70 pb-safe">
      <div className="grid grid-cols-4">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              onClick={(e) => {
                // Re-tapping the current tab scrolls to top, like a native tab bar
                if (active) {
                  e.preventDefault();
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
              }}
              className={cn(
                "press flex flex-col items-center justify-center gap-1 pt-2 pb-1.5 min-h-[48px]",
                "transition-colors duration-150 ease-out",
                active ? "text-accent" : "text-text-dim"
              )}
            >
              <Icon className="w-5 h-5" active={active} />
              <span
                className={cn(
                  "font-mono text-[9.5px] uppercase tracking-wide leading-none",
                  active ? "font-semibold" : "font-medium"
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
