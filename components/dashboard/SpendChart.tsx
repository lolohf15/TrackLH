"use client";

import { useState } from "react";
import { LineChart } from "@/components/ui/LineChart";
import { formatMXN } from "@/lib/utils";
import { useLocale, useT } from "@/lib/i18n-react";
import type { BucketBreakdown } from "@/types";

/** `YYYY-MM-DD` or `YYYY-MM`, both stored UTC-pinned. */
function bucketDate(key: string): Date {
  return new Date(key.length === 7 ? `${key}-01T00:00:00Z` : `${key}T00:00:00Z`);
}

/**
 * How dense the axis can get before it stops being readable: a month has
 * thirty-one columns and room for about six labels, so the rest go blank and
 * the ones left spill over their neighbours.
 */
function axisLabel(
  key: string,
  granularity: "day" | "month",
  index: number,
  count: number,
  locale: string
): string | null {
  const date = bucketDate(key);

  if (granularity === "month") {
    const step = count <= 12 ? 1 : Math.ceil(count / 8);
    if (index % step !== 0) return null;
    return new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" })
      .format(date)
      .replace(".", "");
  }

  // A week is short enough to name its days.
  if (count <= 7) {
    return new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" })
      .format(date)
      .replace(".", "");
  }

  const step = Math.ceil(count / 6);
  return index % step === 0 ? String(date.getUTCDate()) : null;
}

/** What the readout calls the column you picked. */
function readoutLabel(key: string, granularity: "day" | "month", locale: string): string {
  return new Intl.DateTimeFormat(
    locale,
    granularity === "month"
      ? { month: "long", year: "numeric", timeZone: "UTC" }
      : { day: "numeric", month: "short", timeZone: "UTC" }
  ).format(bucketDate(key));
}

/** Rounded at every step, so the line's figures match the ones beside it. */
function runningTotal(values: number[]): number[] {
  let sum = 0;
  return values.map((value) => {
    sum = Math.round((sum + value) * 100) / 100;
    return sum;
  });
}

export function SpendChart({
  buckets,
  previousExpenses,
  granularity,
  title,
}: {
  buckets: BucketBreakdown[];
  previousExpenses: number[];
  granularity: "day" | "month";
  /** Defaults to what the chart plots; Inicio calls it the month's pace. */
  title?: string;
}) {
  const t = useT();
  const locale = useLocale();
  const [picked, setPicked] = useState<string | null>(null);

  // Running totals, not each slice's own figure: what a period costs is a
  // line that only climbs, and laying the last one under it turns "I spent
  // this" into "I'm ahead of where I was" — the question worth asking
  // halfway through a month.
  const cumulative = runningTotal(buckets.map((b) => b.expenses));
  const previous = runningTotal(previousExpenses);

  // Called out by default: the last slice that actually saw spending. Its
  // running total is the period's total, and it has categories to list —
  // the true last day of a month usually has neither.
  const lastSpending = buckets.reduce(
    (found, b, i) => (b.expenses > 0 ? i : found),
    -1
  );
  const activeKey = picked ?? buckets[lastSpending]?.key ?? null;
  const activeIndex = buckets.findIndex((b) => b.key === activeKey);
  const active = activeIndex >= 0 ? buckets[activeIndex] : null;

  return (
    <section className="panel px-4 py-3.5 mt-3">
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <p className="font-mono text-[10px] font-semibold text-text-dim uppercase tracking-[0.1em]">
          {title ?? t.analytics.cumulativeSpend}
        </p>
        {previous.length > 1 && (
          <span className="flex items-center gap-1.5 font-mono text-[9.5px] text-text-faint uppercase tracking-wide">
            <span className="w-4 border-t border-dashed border-text-faint" />
            {t.analytics.previousPeriod}
          </span>
        )}
      </div>

      <LineChart
        points={buckets.map((bucket, i) => ({
          key: bucket.key,
          label: axisLabel(bucket.key, granularity, i, buckets.length, locale),
          value: cumulative[i],
        }))}
        comparison={previous.length > 1 ? previous : null}
        color="var(--color-accent)"
        selectedKey={activeKey}
        onSelect={setPicked}
        format={formatMXN}
      />

      {active && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 pt-3 border-t border-divider">
          <span className="font-mono text-[10.5px] text-text-muted uppercase tracking-wide">
            {readoutLabel(active.key, granularity, locale)}{" "}
            <span className="text-text font-semibold">{formatMXN(active.expenses)}</span>{" "}
            <span className="text-text-faint normal-case">{t.analytics.thatDay}</span>
          </span>
          {active.slices.slice(0, 3).map((slice) => (
            <span key={slice.category} className="flex items-center gap-1.5 min-w-0">
              <span
                className="w-[6px] h-[6px] rounded-full shrink-0"
                style={{ backgroundColor: slice.color }}
              />
              <span className="text-[11.5px] text-text-muted truncate">{slice.category}</span>
              <span className="font-mono text-[11px] text-text-dim shrink-0">
                {formatMXN(slice.amount)}
              </span>
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
