"use client";

import { useState } from "react";
import { StackedBarChart } from "@/components/ui/StackedBarChart";
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

export function SpendChart({
  buckets,
  granularity,
}: {
  buckets: BucketBreakdown[];
  granularity: "day" | "month";
}) {
  const t = useT();
  const locale = useLocale();
  const [picked, setPicked] = useState<string | null>(null);

  // One column is always lit, and until the reader picks one it's the
  // heaviest — the slice worth explaining without being asked.
  const heaviest = buckets.reduce<BucketBreakdown | null>(
    (best, b) => (b.expenses > 0 && b.expenses > (best?.expenses ?? 0) ? b : best),
    null
  );
  const active = buckets.find((b) => b.key === (picked ?? heaviest?.key)) ?? null;

  // The average over the slices that actually saw spending — including the
  // empty ones would drag the line down to something no bar ever reaches.
  // With a single bar there's no average worth drawing: the line would just
  // trace the top of that one bar.
  const spending = buckets.filter((b) => b.expenses > 0);
  const average =
    spending.length > 1
      ? spending.reduce((sum, b) => sum + b.expenses, 0) / spending.length
      : 0;

  return (
    <section className="panel px-4 py-3.5 mt-3">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <p className="font-mono text-[10px] font-semibold text-text-dim uppercase tracking-[0.1em]">
          {granularity === "day" ? t.analytics.spendPerDay : t.analytics.spendPerMonth}
        </p>
        {active && (
          <p className="font-mono text-[10.5px] text-text-muted uppercase tracking-wide">
            {readoutLabel(active.key, granularity, locale)}{" "}
            <span className="text-text font-semibold">{formatMXN(active.expenses)}</span>
          </p>
        )}
      </div>

      <StackedBarChart
        bars={buckets.map((bucket, i) => ({
          key: bucket.key,
          label: axisLabel(bucket.key, granularity, i, buckets.length, locale),
          total: bucket.expenses,
          segments: bucket.slices.map((s) => ({ value: s.amount, color: s.color })),
        }))}
        reference={{ value: average, label: t.analytics.average }}
        highlightKey={active?.key ?? null}
        onSelect={setPicked}
      />

      {active && active.slices.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 pt-3 border-t border-divider">
          {active.slices.slice(0, 4).map((slice) => (
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
