"use client";

import useSWR from "swr";
import type { Catalog, Category, CategoryKind } from "@/types";

// Throws on a failed response so SWR keeps the last good catalog instead of
// caching an error body in its place — the form reads deep into this shape.
const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`${url} → ${r.status}`);
    return r.json();
  });

/**
 * Icons by category name, for the views that only carry a name and a colour
 * (charts, rankings, movement rows). Reads the same `/api/catalog` the record
 * sheet does, so it's one request shared across the app rather than an icon
 * threaded through every aggregate the server computes.
 *
 * Names are unique per kind, not overall; pass the kind when it's known.
 */
export function useCategoryLookup(): (
  name: string | null | undefined,
  kind?: CategoryKind
) => Category | null {
  const { data } = useSWR<Catalog>("/api/catalog", fetcher);

  return (name, kind) => {
    if (!name || !data) return null;
    const pools =
      kind === "income"
        ? [data.incomeCategories]
        : kind === "expense"
          ? [data.expenseCategories]
          : [data.expenseCategories, data.incomeCategories];
    for (const pool of pools) {
      const hit = pool.find((c) => c.name === name);
      if (hit) return hit;
    }
    return null;
  };
}

/** Just the icon key, for the views that already know the colour. */
export function useCategoryIcons(): (
  name: string | null | undefined,
  kind?: CategoryKind
) => string | null {
  const lookup = useCategoryLookup();
  return (name, kind) => lookup(name, kind)?.icon ?? null;
}
