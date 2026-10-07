"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { CategoryDetail } from "@/components/dashboard/CategoryDetail";
import { CategoryRow } from "@/components/dashboard/CategoryRow";
import { PeriodNav } from "@/components/dashboard/PeriodNav";
import { SpendChart } from "@/components/dashboard/SpendChart";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { useAddRecord } from "@/components/transactions/AddRecordProvider";
import { MetricTile } from "@/components/ui/MetricTile";
import { Ring } from "@/components/ui/Ring";
import { ChartSkeleton } from "@/components/ui/Skeleton";
import { TrendCharts } from "@/components/analytics/TrendCharts";
import { formatMXN, cn } from "@/lib/utils";
import { dayKey, formatPeriodLabel, todayAnchor, wallClockNow, type PeriodKind } from "@/services/period";
import { useLocale, useT } from "@/lib/i18n-react";
import type { AnalyticsData, CategoryTrend, TrendsData } from "@/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function Analytics() {
  const t = useT();
  const openAddRecord = useAddRecord();
  const locale = useLocale();
  const [kind, setKind] = useState<PeriodKind>("month");
  const [anchor, setAnchor] = useState(todayAnchor);
  // Captured once rather than read during render, which would make the
  // component non-deterministic.
  const [openedAt] = useState(() => wallClockNow().getTime());

  // Everything on this screen but the sparkline comes from one request, so
  // changing the period redraws the whole tab at once.
  const { data, isLoading } = useSWR<AnalyticsData>(
    `/api/analytics?period=${kind}&anchor=${dayKey(anchor)}&today=${dayKey(todayAnchor())}`,
    fetcher,
    // Stepping to another period keeps the one on screen until its
    // replacement lands, instead of blanking the tab to a skeleton on every
    // tap of the arrows.
    { keepPreviousData: true }
  );

  // Months either side of the period. Its own request so
  // the period's figures above don't wait on a walk through balance history.
  const { data: trends, isLoading: trendsLoading } = useSWR<TrendsData>(
    `/api/analytics/trends?period=${kind}&anchor=${dayKey(anchor)}&today=${dayKey(todayAnchor())}`,
    fetcher,
    { keepPreviousData: true }
  );

  // The per-category sparkline is always the last six months, whatever the
  // period is — a trend needs more than one span to be a trend.
  const { data: trendData } =
    useSWR<{ months: string[]; trends: CategoryTrend[] }>("/api/categories/trend?months=6", fetcher);

  const categories = data?.categories ?? [];
  // Null means "nothing picked yet" and falls back to the first row, so the
  // default needs no effect to install it.
  const [picked, setPicked] = useState<string | null>(null);
  const selected = picked ?? categories[0]?.category ?? null;
  const selectedTrend = trendData?.trends.find((x) => x.category === selected) ?? null;

  // Named after the span the figures came from, not the one being asked for:
  // while a new period loads, the old one is still what's on screen.
  const periodLabel = data
    ? formatPeriodLabel(
        {
          kind: data.period,
          range: { from: new Date(data.from), to: new Date(data.to) },
          previous: null,
          bucket: data.granularity,
        },
        locale
      ) ?? t.home.allTime
    : "";

  // Nothing to compare against on the first period a user ever logs, and
  // nothing before all-time either.
  const trend =
    data && data.prevExpenses > 0
      ? Math.round(((data.expenses - data.prevExpenses) / data.prevExpenses) * 100)
      : null;
  // Off `data`, like the heading: which span the comparison is against has to
  // describe the figures on screen, not the button just pressed.
  // A running period is compared up to the same point, and says so.
  const vs = data?.inProgress
    ? { week: t.analytics.vsSameDayWeek, month: t.analytics.vsSameDayMonth, year: t.analytics.vsSameDayYear }
    : { week: t.analytics.vsPrevWeek, month: t.analytics.vsPrevMonth, year: t.analytics.vsPrevYear };
  const vsPrevious = data && data.period !== "all" ? vs[data.period] : undefined;

  // The span on screen, as Wallet reads it — so "see movements" lands on
  // exactly the rows these figures were added up from.
  const spanQuery = data
    ? data.period === "all"
      ? "period=all"
      : `period=${data.period}&anchor=${data.from.slice(0, 10)}`
    : "";

  const top = categories[0] ?? null;
  const empty = data !== undefined && data.expenseCount === 0 && data.income === 0;

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 pt-3 pb-6">
      <PeriodNav
        kind={kind}
        anchor={anchor}
        onKindChange={setKind}
        onAnchorChange={setAnchor}
        now={openedAt}
      />

      {/* Only the very first load gets a skeleton: past that there's always a
          period on screen, and it stays there, faded, until its replacement
          arrives. */}
      {!data ? (
        <ChartSkeleton height="h-96" />
      ) : empty ? (
        <div className="panel mt-3">
          <EmptyState
            title={t.analytics.emptyTitle}
            description={t.analytics.emptyHint}
            action={
              <Button size="sm" onClick={() => openAddRecord({ type: "Gasto" })}>
                {t.emptyActions.logMovement}
              </Button>
            }
          />
        </div>
      ) : (
        <div
          className={cn(
            "md:grid md:grid-cols-[1fr_360px] md:gap-10 md:items-start",
            "transition-opacity duration-200 ease-out",
            isLoading && "opacity-50"
          )}
        >
          <div>
            {/* What the period came to, and which way it moved. */}
            <section className="tint tint-gold px-4 pt-3.5 pb-3 mt-3">
              <MetricTile
                label={`${t.analytics.spent} · ${periodLabel}`}
                value={formatMXN(data.expenses)}
                size="lg"
                trend={trend}
                trendPolarity="down-good"
                trendLabel={vsPrevious}
              />

              <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-border">
                <Figure label={t.analytics.income} value={formatMXN(data.income)} />
                <Figure
                  label={t.analytics.net}
                  value={formatMXN(data.net)}
                  tone={data.net < 0 ? "text-red-fg" : "text-green-fg"}
                />
              </div>

              <Link
                href={`/wallet?${spanQuery}`}
                className="press flex items-center justify-between gap-2 mt-3 pt-3 -mb-1 min-h-[36px] border-t border-border font-mono text-[10.5px] font-medium text-accent uppercase tracking-wide hover:brightness-125"
              >
                <span className="truncate">{t.analytics.seeMovements(periodLabel)}</span>
                <span aria-hidden>→</span>
              </Link>
            </section>

            <SpendChart
              buckets={data.buckets}
              previousExpenses={data.previousExpenses}
              granularity={data.granularity}
            />

            {categories.length > 0 && (
              <section className="tint tint-red mt-3">
                <div className="flex items-center gap-4 px-4 py-4">
                  <Ring
                    segments={categories.map((c) => ({ value: c.amount, color: c.color }))}
                    size={96}
                    thickness={10}
                  >
                    {top && (
                      <>
                        <span className="text-[16px] font-semibold text-text tabular-nums leading-none">
                          {Math.round(top.percentage)}%
                        </span>
                        <span className="text-[9.5px] text-text-dim truncate max-w-[62px] mt-1">
                          {top.category}
                        </span>
                      </>
                    )}
                  </Ring>

                  <div className="min-w-0">
                    <p className="font-mono text-[10px] font-semibold text-text-dim uppercase tracking-[0.1em]">
                      {t.analytics.breakdown}
                    </p>
                    <p className="text-[13px] text-text mt-1.5">
                      {t.analytics.breakdownMeta(categories.length, data.expenseCount)}
                    </p>
                  </div>
                </div>

                <div className="px-4 pb-2">
                  {categories.map((c) => (
                    <div key={c.category} className="contents">
                      {/* Desktop selects in place; the phone pushes to the
                          category's own screen. */}
                      <CategoryRow
                        category={c}
                        active={c.category === selected}
                        onSelect={() => setPicked(c.category)}
                        className="hidden md:flex"
                      />
                      <CategoryRow
                        category={c}
                        href={`/analytics/${encodeURIComponent(c.category)}?${spanQuery}`}
                        className="md:hidden flex"
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Desktop detail panel */}
          {selectedTrend && (
            <div className="panel hidden md:block sticky top-6 px-5 py-4 mt-3">
              <CategoryDetail trend={selectedTrend} spanQuery={spanQuery} />
            </div>
          )}
        </div>
      )}

      {/* The longer view: how the months around this one went. Shown even
          for an empty period, since the months before it may not be. */}
      {!trends ? (
        data && <ChartSkeleton height="h-72" />
      ) : (
        <div
          className={cn(
            "mt-6 transition-opacity duration-200 ease-out",
            trendsLoading && "opacity-50"
          )}
        >
          <p className="font-mono text-[10px] font-semibold text-text-dim uppercase tracking-[0.1em] px-1">
            {t.analytics.trends} ·{" "}
            {data?.period === "year"
              ? t.analytics.yearByMonth(data.from.slice(0, 4))
              : t.analytics.lastMonths(trends.months.length)}
          </p>
          <div className="md:grid md:grid-cols-2 md:gap-x-6 md:items-start">
            <TrendCharts data={trends} partialKey={dayKey(todayAnchor()).slice(0, 7)} />
          </div>
        </div>
      )}
    </div>
  );
}

/** A small figure with its eyebrow — the two that ride under the headline. */
function Figure({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <p className="font-mono text-[10px] font-semibold text-text-dim uppercase tracking-[0.1em]">
        {label}
      </p>
      <p className={cn("text-[17px] font-semibold tabular-nums mt-0.5", tone ?? "text-text")}>
        {value}
      </p>
    </div>
  );
}
