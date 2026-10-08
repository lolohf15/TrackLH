"use client";

import { useLayoutEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { lightAt } from "@/lib/glass";
import { useT } from "@/lib/i18n-react";
import { NAV_ITEMS } from "./nav";

/**
 * A floating capsule rather than a bar welded to the bottom edge: content
 * runs underneath it and refracts through the glass, which is the whole
 * point of the material. The middle column is left empty — the add button
 * docks there, rising out of the capsule.
 */
export function TabBar() {
  const pathname = usePathname();

  const left = NAV_ITEMS.slice(0, 2);
  const right = NAV_ITEMS.slice(2);

  // Which of the five columns the current tab sits in; the + takes the third.
  const index = NAV_ITEMS.findIndex((item) => isActive(item.href, pathname));
  const column = index < 0 ? 0 : index < 2 ? index : index + 1;

  // The pill travels like a drop of the same glass: it stretches along the
  // way and settles round at the tab. A WAAPI animation, so it runs on the
  // compositor; the style below already holds where it ends.
  const pill = useRef<HTMLSpanElement>(null);
  const shownColumn = useRef(column);
  useLayoutEffect(() => {
    const el = pill.current;
    const from = shownColumn.current;
    shownColumn.current = column;
    if (!el || from === column || index < 0) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Mid-flight, start from where it is rather than where it was headed.
    const running = el.getAnimations();
    const start = running.length ? getComputedStyle(el).transform : `translateX(${from * 100}%)`;
    running.forEach((a) => a.cancel());

    const stretch = 1 + Math.min(0.32, 0.16 * Math.abs(column - from));
    el.animate(
      [
        { transform: start },
        { transform: `translateX(${((from + column) / 2) * 100}%) scale(${stretch}, 0.9)`, offset: 0.45 },
        { transform: `translateX(${column * 100}%)` },
      ],
      { duration: 440, easing: "cubic-bezier(0.23, 1, 0.32, 1)" }
    );
  }, [column, index]);

  return (
    <nav
      className="md:hidden fixed left-3 right-3 z-30"
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 10px)" }}
    >
      {/* The cast that deepens while content runs underneath. */}
      <span aria-hidden="true" className="tabbar-depth absolute inset-0 rounded-full pointer-events-none" />
      <div className="glass glass-refract relative rounded-full h-[62px] grid grid-cols-5 items-center px-1.5">
        {/* One pill for the whole bar, moved by transform alone: it slides
            from tab to tab on the compositor, so a page loading at the same
            moment can't make it stutter the way a JS-driven layout
            animation does. */}
        <span
          ref={pill}
          aria-hidden="true"
          className="tab-pill absolute top-[5px] left-1.5 h-[52px] rounded-full pointer-events-none"
          style={{
            width: "calc((100% - 12px) / 5)",
            transform: `translateX(${column * 100}%)`,
            opacity: index < 0 ? 0 : 1,
          }}
        />
        {left.map((item) => (
          <Tab key={item.href} item={item} pathname={pathname} />
        ))}

        {/* The add button's berth. Nothing renders here. */}
        <div aria-hidden="true" />

        {right.map((item) => (
          <Tab key={item.href} item={item} pathname={pathname} />
        ))}
      </div>
    </nav>
  );
}

function isActive(href: string, pathname: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function Tab({
  item,
  pathname,
}: {
  item: (typeof NAV_ITEMS)[number];
  pathname: string;
}) {
  const t = useT();
  const { href, key, icon: Icon } = item;
  const label = t.nav[key];
  const active = isActive(href, pathname);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      onPointerDown={lightAt}
      onClick={(e) => {
        // Re-tapping the current tab scrolls to top, like a native tab bar
        if (active) {
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }}
      className={cn(
        // Lights up under the finger instead of shrinking: the pill's
        // travel is the tab's motion.
        "glass-touch relative flex flex-col items-center justify-center gap-[3px] h-[52px] rounded-full",
        "transition-colors duration-150 ease-out",
        active ? "text-accent" : "text-text-dim"
      )}
    >
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
