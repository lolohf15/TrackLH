"use client";

import { Lightbulb } from "lucide-react";
import { Rich } from "./Rich";
import { formatMXN, cn } from "@/lib/utils";
import { useT } from "@/lib/i18n-react";
import type { Dictionary } from "@/lib/dictionary";
import type { Insight } from "@/types";

/** One insight in the reader's language. */
export function insightText(insight: Insight, t: Dictionary): string {
  switch (insight.kind) {
    case "categoryVsUsual":
      return insight.pct > 0
        ? t.insights.categoryUp(insight.category, insight.pct, formatMXN(insight.diff))
        : t.insights.categoryDown(insight.category, Math.abs(insight.pct));
    case "saved":
      return t.insights.saved(insight.pct, formatMXN(insight.amount));
    case "overspent":
      return t.insights.overspent(formatMXN(insight.amount));
    case "quietDays":
      return t.insights.quietDays(insight.days);
    case "topCategory":
      return t.insights.topCategory(insight.category, insight.pct);
  }
}

/** Sentences about the period, as a single grouped panel. */
export function InsightList({ insights, className }: { insights: Insight[]; className?: string }) {
  const t = useT();
  if (insights.length === 0) return null;
  return (
    <ul className={cn("panel divide-y divide-divider", className)}>
      {insights.map((insight, i) => (
        <li key={i} className="flex items-start gap-3 px-4 py-3">
          <span
            aria-hidden
            className="mt-px w-6 h-6 shrink-0 rounded-[7px] grid place-items-center"
            style={{ background: "color-mix(in srgb, var(--color-accent) 20%, transparent)" }}
          >
            <Lightbulb className="w-3.5 h-3.5 text-accent" strokeWidth={2.2} />
          </span>
          <p className="text-[13px] leading-snug text-text-muted">
            <Rich text={insightText(insight, t)} />
          </p>
        </li>
      ))}
    </ul>
  );
}
