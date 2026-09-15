"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav";

/**
 * A floating capsule rather than a bar welded to the bottom edge: content
 * runs underneath it and refracts through the glass, which is the whole
 * point of the material. The middle column is left empty — the add button
 * docks there, rising out of the capsule.
 */
export function TabBar() {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  const left = NAV_ITEMS.slice(0, 2);
  const right = NAV_ITEMS.slice(2);

  return (
    <nav
      className="md:hidden fixed left-3 right-3 z-30"
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 10px)" }}
    >
      <div className="glass glass-refract rounded-full h-[62px] grid grid-cols-5 items-center px-1.5">
        {left.map((item) => (
          <Tab key={item.href} item={item} pathname={pathname} reduceMotion={reduceMotion} />
        ))}

        {/* The add button's berth. Nothing renders here. */}
        <div aria-hidden="true" />

        {right.map((item) => (
          <Tab key={item.href} item={item} pathname={pathname} reduceMotion={reduceMotion} />
        ))}
      </div>
    </nav>
  );
}

function Tab({
  item,
  pathname,
  reduceMotion,
}: {
  item: (typeof NAV_ITEMS)[number];
  pathname: string;
  reduceMotion: boolean | null;
}) {
  const { href, label, icon: Icon } = item;
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Link
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
        "press relative flex flex-col items-center justify-center gap-[3px] h-[52px] rounded-full",
        "transition-colors duration-150 ease-out",
        active ? "text-accent" : "text-text-dim"
      )}
    >
      {active && (
        <motion.div
          layoutId="tab-lens"
          className="absolute inset-0 rounded-full bg-accent/12"
          transition={
            reduceMotion ? { duration: 0 } : { type: "spring", visualDuration: 0.3, bounce: 0.15 }
          }
        />
      )}
      <Icon className="relative w-[19px] h-[19px]" active={active} />
      <span
        className={cn(
          "relative font-mono text-[8.5px] uppercase tracking-wide leading-none",
          active ? "font-semibold" : "font-medium"
        )}
      >
        {label}
      </span>
    </Link>
  );
}
