"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronUp } from "lucide-react";
import { ChartPanel, PanelFigure } from "./ChartPanel";
import { Rich } from "./Rich";
import { formatMXN, cn } from "@/lib/utils";
import { useLocale, useT } from "@/lib/i18n-react";
import type { BucketBreakdown, CategorySummary } from "@/types";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

function bucketDate(key: string): Date {
  return new Date(key.length === 7 ? `${key}-01T00:00:00Z` : `${key}T00:00:00Z`);
}

/**
 * The tallest bar the scale is built for. One rent day is several times any
 * other, and drawn to it every other day is a sliver; past a clear outlier
 * the scale stops at the rest, and the outlier is drawn clipped and says so.
 */
function scaleMax(totals: number[]): { max: number; clipped: boolean } {
  const sorted = totals.filter((v) => v > 0).sort((a, b) => a - b);
  if (sorted.length === 0) return { max: 1, clipped: false };
  const top = sorted[sorted.length - 1];
  const p85 = sorted[Math.floor((sorted.length - 1) * 0.85)];
  if (sorted.length >= 5 && top > p85 * 2.4) return { max: p85 * 1.6, clipped: true };
  return { max: top, clipped: false };
}

/**
 * Spending per day (or per month, for a year), each bar stacked in its
 * categories' own colours: one bar says how much and on what. Tap a bar for
 * its breakdown.
 */
export function CategoryBars({
  buckets,
  granularity,
  categories,
  periodLabel,
  total,
  todayKey,
}: {
  buckets: BucketBreakdown[];
  granularity: "day" | "month";
  categories: CategorySummary[];
  periodLabel: string;
  total: number;
  /** `YYYY-MM-DD`; slices after it haven't happened yet. */
  todayKey: string;
}) {
  const t = useT();
  const locale = useLocale();
  const reduceMotion = useReducedMotion();
  const [picked, setPicked] = useState<string | null>(null);

  const { max, clipped } = scaleMax(buckets.map((b) => b.expenses));
  const n = buckets.length;
  const isFuture = (key: string) => key > todayKey.slice(0, key.length);

  // Axis labels: every day of a week, every week of a month, every month of
  // a year (as its initial).
  const tick = (key: string, i: number): string | null => {
    const d = bucketDate(key);
    if (granularity === "month") {
      return new Intl.DateTimeFormat(locale, { month: "narrow", timeZone: "UTC" }).format(d);
    }
    if (n <= 7) {
      return new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" }).format(d).replace(".", "");
    }
    return i % 7 === 0 ? String(d.getUTCDate()) : null;
  };

  const readoutLabel = (key: string) =>
    new Intl.DateTimeFormat(
      locale,
      granularity === "month" ? { month: "long", timeZone: "UTC" } : { day: "numeric", month: "short", timeZone: "UTC" }
    )
      .format(bucketDate(key))
      .replace(".", "");

  const active = buckets.find((b) => b.key === picked) ?? null;
  const readout = active ? (
    <Rich
      text={`**${readoutLabel(active.key)} · ${formatMXN(active.expenses)}** ${
        active.slices.length
          ? active.slices.slice(0, 3).map((s) => `${s.category} ${formatMXN(s.amount)}`).join(" · ")
          : t.charts.noSpend
      }`}
    />
  ) : granularity === "month" ? (
    t.charts.tapMonth
  ) : (
    t.charts.tapDay
  );

  const legend = categories.slice(0, 5);

  return (
    <ChartPanel
      title={`${periodLabel} · ${granularity === "month" ? t.charts.byMonth : t.charts.byDay}`}
      aside={<PanelFigure>{formatMXN(total)}</PanelFigure>}
      readout={readout}
    >
      <div>
        <div className="relative h-[150px] flex items-end gap-[2px] border-b border-border">
          {buckets.map((b, i) => {
            const future = isFuture(b.key);
            const height = Math.min(1, b.expenses / max);
            const over = clipped && b.expenses > max;
            const dim = picked !== null && picked !== b.key;
            return (
              <button
                key={b.key}
                type="button"
                disabled={future}
                onClick={() => setPicked((p) => (p === b.key ? null : b.key))}
                aria-pressed={picked === b.key}
                aria-label={`${readoutLabel(b.key)}: ${formatMXN(b.expenses)}`}
                className="relative flex-1 min-w-0 h-full flex flex-col justify-end items-center outline-none focus-visible:bg-surface-2 rounded-t-[3px] disabled:cursor-default"
              >
                {over && (
                  <ChevronUp
                    aria-hidden
                    className="absolute top-0 w-3 h-3 text-text-dim"
                    strokeWidth={2.5}
                  />
                )}
                {b.expenses > 0 ? (
                  <motion.span
                    className={cn(
                      "w-full max-w-[22px] flex flex-col-reverse gap-px overflow-hidden rounded-t-[3px] origin-bottom transition-opacity duration-200",
                      over && "mt-3.5"
                    )}
                    style={{ height: `calc(${height * 100}% - ${over ? 14 : 0}px)`, opacity: dim ? 0.35 : 1 }}
                    initial={reduceMotion ? false : { scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ duration: 0.45, ease: EASE_OUT, delay: Math.min(i * 0.012, 0.3) }}
                  >
                    {b.slices.map((s) => (
                      <span
                        key={s.category}
                        className="block w-full shrink-0"
                        style={{ flexGrow: s.amount, flexBasis: 0, minHeight: 2, background: s.color }}
                      />
                    ))}
                  </motion.span>
                ) : (
                  <span
                    className={cn("w-full max-w-[22px] h-[2px] rounded-full", future ? "bg-surface-2" : "bg-surface-3")}
                  />
                )}
              </button>
            );
          })}
        </div>
        <div className="flex gap-[2px] mt-1.5">
          {buckets.map((b, i) => (
            <span
              key={b.key}
              className={cn(
                "flex-1 min-w-0 font-mono text-[9px] uppercase text-center whitespace-nowrap overflow-visible",
                picked === b.key ? "text-text" : "text-text-faint"
              )}
            >
              {tick(b.key, i)}
            </span>
          ))}
        </div>
      </div>

      {legend.length > 0 && (
        <ul className="flex flex-wrap gap-x-3 gap-y-1">
          {legend.map((c) => (
            <li key={c.category} className="flex items-center gap-1.5 text-[11px] text-text-muted">
              <span aria-hidden className="w-2 h-2 rounded-[2px]" style={{ background: c.color }} />
              {c.category}
            </li>
          ))}
        </ul>
      )}
    </ChartPanel>
  );
}
