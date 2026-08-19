"use client";

import { useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { NAV_ITEMS } from "./nav";

const SWIPE_THRESHOLD = 60;
const DIRECTION_LOCK_RATIO = 1.2;

type TouchState = { x: number; y: number; locked: "x" | "y" | null };

/**
 * Horizontal swipe between the 4 main tabs. Only arms on an exact tab
 * route (not sub-routes like /categorias/[category]) and yields to any
 * ancestor marked data-swipe-ignore (e.g. a horizontally scrollable table).
 */
export function useSwipeNav() {
  const router = useRouter();
  const pathname = usePathname();
  const touch = useRef<TouchState | null>(null);

  const index = NAV_ITEMS.findIndex((item) => item.href === pathname);

  function onTouchStart(e: React.TouchEvent) {
    if (index === -1) {
      touch.current = null;
      return;
    }
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY, locked: null };
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!touch.current) return;
    const t = e.touches[0];
    const dx = t.clientX - touch.current.x;
    const dy = t.clientY - touch.current.y;

    if (!touch.current.locked) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      const ignored = (e.target as HTMLElement).closest?.("[data-swipe-ignore]");
      touch.current.locked =
        !ignored && Math.abs(dx) > Math.abs(dy) * DIRECTION_LOCK_RATIO ? "x" : "y";
    }
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (!touch.current || touch.current.locked !== "x") {
      touch.current = null;
      return;
    }
    const t = e.changedTouches[0];
    const dx = t.clientX - touch.current.x;
    touch.current = null;

    if (Math.abs(dx) < SWIPE_THRESHOLD) return;
    const next = index + (dx < 0 ? 1 : -1);
    if (next >= 0 && next < NAV_ITEMS.length) router.push(NAV_ITEMS[next].href);
  }

  return { onTouchStart, onTouchMove, onTouchEnd };
}
