"use client";

import Link from "next/link";
import { formatMXN, cn } from "@/lib/utils";
import { useT } from "@/lib/i18n-react";
import type { CategorySummary } from "@/types";

/**
 * One category, wherever it's listed: the marker, what it's called, its
 * share of the period, and what it came to. Analytics and Inicio show the
 * same list for the same reason, so they show it in the same shape.
 */
export function CategoryRow({
  category,
  href,
  onSelect,
  active,
  className,
}: {
  category: CategorySummary;
  /** Given, the row navigates. Otherwise it's a button and calls onSelect. */
  href?: string;
  onSelect?: () => void;
  active?: boolean;
  className?: string;
}) {
  const t = useT();

  const content = (
    <>
      <span className="flex items-center gap-3 min-w-0">
        <span
          className="w-[22px] h-[22px] rounded-full grid place-items-center shrink-0"
          style={{ border: `1px solid color-mix(in srgb, ${category.color} 32%, transparent)` }}
        >
          <span
            className="w-[7px] h-[7px] rounded-full"
            style={{ backgroundColor: category.color }}
          />
        </span>
        <span className="min-w-0">
          <span className="block text-[13.5px] text-text truncate">{category.category}</span>
          <span className="block text-[11.5px] text-text-dim mt-0.5">
            {Math.round(category.percentage)}% {t.analytics.ofSpends}
          </span>
        </span>
      </span>
      <span className="font-mono text-[13.5px] font-semibold text-text whitespace-nowrap shrink-0 ml-2.5">
        {formatMXN(category.amount)}
      </span>
    </>
  );

  const shape =
    "w-full flex items-center justify-between py-2.5 border-t border-divider text-left transition-colors duration-150 ease-out";

  if (href) {
    return (
      <Link href={href} className={cn(shape, "active:bg-surface-2/40", className)}>
        {content}
      </Link>
    );
  }

  return (
    <button onClick={onSelect} className={cn(shape, active && "bg-surface-2/40", className)}>
      {content}
    </button>
  );
}
