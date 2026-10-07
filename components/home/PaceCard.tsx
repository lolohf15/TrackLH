"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ChartPanel, PanelNote } from "@/components/charts/ChartPanel";
import { Rich } from "@/components/charts/Rich";
import { formatMXN } from "@/lib/utils";
import { useLocale, useT } from "@/lib/i18n-react";
import type { BucketBreakdown } from "@/types";

const W = 300;
const H = 96;
const PAD_TOP = 8;
const PAD_BOTTOM = 4;

function running(values: number[]): number[] {
  let sum = 0;
  return values.map((v) => (sum = Math.round((sum + v) * 100) / 100));
}

/**
 * This month's spending so far, against last month's at the same day. The
 * line stops at today: past it there's nothing yet, and a flat line to the
 * month's end would read as "nothing more to come".
 */
export function PaceCard({
  buckets,
  previousExpenses,
  todayKey,
  previousMonthStart,
}: {
  buckets: BucketBreakdown[];
  previousExpenses: number[];
  todayKey: string;
  /** ISO date of the first of last month, to name it. */
  previousMonthStart: string;
}) {
  const t = useT();
  const locale = useLocale();
  const reduceMotion = useReducedMotion();
  const [picked, setPicked] = useState<number | null>(null);

  const days = buckets.length;
  const todayIndex = Math.max(0, buckets.findIndex((b) => b.key === todayKey));
  const end = buckets.findIndex((b) => b.key === todayKey) === -1 ? days - 1 : todayIndex;
  const current = running(buckets.map((b) => b.expenses)).slice(0, end + 1);
  const previous = running(previousExpenses);

  const max = Math.max(1, ...current, ...previous);
  const x = (i: number) => (days <= 1 ? 0 : (i / (days - 1)) * W);
  const y = (v: number) => PAD_TOP + (1 - v / max) * (H - PAD_TOP - PAD_BOTTOM);
  const path = (vals: number[]) => vals.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const area = `${path(current)} L${x(current.length - 1).toFixed(1)},${H} L0,${H} Z`;

  const at = picked !== null && picked <= end ? picked : end;
  const day = at + 1;
  const now = current[at] ?? 0;
  // Last month at the same date; a shorter month has already ended by then.
  const then = previous[Math.min(at, previous.length - 1)] ?? 0;
  const diff = Math.round(now - then);
  const monthName = new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" })
    .format(new Date(previousMonthStart))
    .replace(".", "");

  const readout =
    previous.length === 0 ? (
      <Rich text={`**${formatMXN(now)}**`} />
    ) : Math.abs(diff) < 1 ? (
      <Rich text={t.overview.paceEven(formatMXN(now), day, monthName)} />
    ) : diff > 0 ? (
      <Rich text={t.overview.paceMore(formatMXN(now), day, formatMXN(diff), monthName)} />
    ) : (
      <Rich text={t.overview.paceLess(formatMXN(now), day, formatMXN(-diff), monthName)} />
    );

  return (
    <ChartPanel
      title={t.overview.paceTitle}
      aside={previous.length > 0 ? <PanelNote>{t.overview.paceVs(monthName, day)}</PanelNote> : undefined}
      readout={readout}
    >
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="block overflow-visible" aria-hidden>
          <defs>
            <linearGradient id="pace-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.28" />
              <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <line x1="0" x2={W} y1={H - 0.5} y2={H - 0.5} stroke="var(--color-border)" />
          {previous.length > 1 && (
            <path d={path(previous)} fill="none" stroke="var(--color-text-faint)" strokeWidth="1.4" strokeDasharray="3 3" />
          )}
          {current.length > 1 && <path d={area} fill="url(#pace-fill)" />}
          <motion.path
            d={path(current)}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={reduceMotion ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
          />
          {picked !== null && picked <= end && (
            <line x1={x(at)} x2={x(at)} y1={y(now)} y2={H} stroke="var(--color-text-dim)" strokeWidth="1" />
          )}
          <circle cx={x(at)} cy={y(now)} r="3.8" fill="var(--color-accent)" stroke="var(--color-surface)" strokeWidth="1.5" />
        </svg>
        {/* A column per day that has happened, so the line can be scrubbed. */}
        <div className="absolute inset-0 flex">
          {buckets.map((b, i) => (
            <button
              key={b.key}
              type="button"
              disabled={i > end}
              tabIndex={i > end ? -1 : 0}
              onClick={() => setPicked(i === picked ? null : i)}
              aria-label={`${i + 1}`}
              className="flex-1 min-w-0 h-full outline-none focus-visible:bg-surface-2/50 disabled:cursor-default"
            />
          ))}
        </div>
      </div>
      <div className="flex justify-between font-mono text-[9px] text-text-faint uppercase">
        <span>1</span>
        <span>{days}</span>
      </div>
    </ChartPanel>
  );
}
