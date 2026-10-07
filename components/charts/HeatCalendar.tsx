"use client";

import { useState } from "react";
import { ChartPanel, PanelNote } from "./ChartPanel";
import { Rich } from "./Rich";
import { formatMXN, cn } from "@/lib/utils";
import { useLocale, useT } from "@/lib/i18n-react";
import type { BucketBreakdown } from "@/types";

/**
 * The month as a calendar, each day shaded by what it cost. Expensive days
 * and weekly habits show without reading a number; a day opens its figure.
 */
export function HeatCalendar({
  buckets,
  periodLabel,
  todayKey,
}: {
  /** One per day of the month, in order. */
  buckets: BucketBreakdown[];
  periodLabel: string;
  todayKey: string;
}) {
  const t = useT();
  const locale = useLocale();
  const [picked, setPicked] = useState<string | null>(null);

  if (buckets.length === 0) return null;
  const first = new Date(`${buckets[0].key}T00:00:00Z`);
  const lead = (first.getUTCDay() + 6) % 7; // Monday first

  // Shaded against the busy-but-ordinary days, not the single rent day,
  // so the rest of the month doesn't wash out to the same pale square.
  const spent = buckets.map((b) => b.expenses).filter((v) => v > 0).sort((a, b) => a - b);
  const ceiling = spent.length ? spent[Math.floor((spent.length - 1) * 0.9)] : 1;

  // 5 Jan 2026 was a Monday.
  const heads = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(locale, { weekday: "narrow", timeZone: "UTC" }).format(new Date(Date.UTC(2026, 0, 5 + i)))
  );
  const dayName = (key: string) =>
    new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", timeZone: "UTC" })
      .format(new Date(`${key}T00:00:00Z`))
      .replace(".", "");

  const weekend = buckets
    .filter((b) => [0, 5, 6].includes(new Date(`${b.key}T00:00:00Z`).getUTCDay()))
    .reduce((s, b) => s + b.expenses, 0);
  const all = buckets.reduce((s, b) => s + b.expenses, 0);
  const weekendPct = all > 0 ? Math.round((weekend / all) * 100) : 0;

  const active = buckets.find((b) => b.key === picked);
  const readout = active ? (
    <Rich text={t.charts.calendarRead(dayName(active.key), formatMXN(active.expenses), active.count)} />
  ) : weekendPct >= 50 ? (
    <Rich text={t.charts.weekendShare(weekendPct)} />
  ) : (
    t.charts.tapDay
  );

  return (
    <ChartPanel
      title={`${periodLabel} · ${t.charts.calendar}`}
      aside={<PanelNote>{t.charts.calendarLegend}</PanelNote>}
      readout={readout}
    >
      <div className="grid grid-cols-7 gap-1.5" role="group" aria-label={`${periodLabel} · ${t.charts.calendar}`}>
        {heads.map((h, i) => (
          <span key={i} aria-hidden className="font-mono text-[9px] font-semibold text-text-faint text-center uppercase">
            {h}
          </span>
        ))}
        {Array.from({ length: lead }, (_, i) => (
          <span key={`lead-${i}`} aria-hidden />
        ))}
        {buckets.map((b) => {
          const future = b.key > todayKey;
          const strength = b.expenses > 0 ? 0.16 + Math.min(1, b.expenses / ceiling) * 0.84 : 0;
          const dark = strength > 0.62;
          const isToday = b.key === todayKey;
          return (
            <button
              key={b.key}
              type="button"
              disabled={future}
              onClick={() => setPicked((p) => (p === b.key ? null : b.key))}
              aria-pressed={picked === b.key}
              aria-label={`${dayName(b.key)}: ${formatMXN(b.expenses)}`}
              className={cn(
                "press aspect-square rounded-[7px] grid place-items-center font-mono text-[10px] tabular-nums transition-[box-shadow,background-color] duration-150",
                "outline-none focus-visible:ring-2 focus-visible:ring-text",
                future && "border border-dashed border-border text-text-faint cursor-default active:scale-100",
                !future && b.expenses === 0 && "bg-surface-2 text-text-dim",
                dark ? "text-accent-ink font-semibold" : !future && b.expenses > 0 && "text-text",
                picked === b.key && "ring-[1.5px] ring-text",
                isToday && picked !== b.key && "ring-1 ring-accent"
              )}
              style={
                b.expenses > 0
                  ? { background: `color-mix(in srgb, var(--color-accent) ${Math.round(strength * 100)}%, var(--color-surface-2))` }
                  : undefined
              }
            >
              {Number(b.key.slice(8))}
            </button>
          );
        })}
      </div>
    </ChartPanel>
  );
}
