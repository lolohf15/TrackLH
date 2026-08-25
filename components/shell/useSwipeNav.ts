"use client";

import { useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { NAV_ITEMS } from "./nav";

/**
 * Tab position + neighbour navigation for the horizontal swipe gesture.
 * Only armed on an exact tab route, so sub-routes like /categorias/[category]
 * keep their normal back-navigation instead of swiping between tabs.
 */
export function useTabNav() {
  const router = useRouter();
  const pathname = usePathname();

  const index = NAV_ITEMS.findIndex((item) => item.href === pathname);

  const go = useCallback(
    (direction: 1 | -1) => {
      const next = index + direction;
      if (index === -1 || next < 0 || next >= NAV_ITEMS.length) return;
      router.push(NAV_ITEMS[next].href);
    },
    [index, router]
  );

  return {
    armed: index !== -1,
    canPrev: index > 0,
    canNext: index !== -1 && index < NAV_ITEMS.length - 1,
    go,
  };
}
