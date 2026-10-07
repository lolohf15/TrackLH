"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { PeriodNav } from "@/components/dashboard/PeriodNav";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { TrendBadge } from "@/components/ui/TrendBadge";
import { ChartSkeleton } from "@/components/ui/Skeleton";
import { useAddRecord } from "@/components/transactions/AddRecordProvider";
import { TrendsPanel } from "@/components/analytics/TrendCharts";
import { CategoryBars } from "@/components/charts/CategoryBars";
import { CategoryTreemap } from "@/components/charts/CategoryTreemap";
import { HeatCalendar } from "@/components/charts/HeatCalendar";
import { MoneyFlowChart } from "@/components/charts/MoneyFlowChart";
import { BudgetPace } from "@/components/charts/BudgetPace";
import { InsightList, insightText } from "@/components/charts/InsightList";
import { AnalyticsTable } from "@/components/charts/AnalyticsTable";
import { formatMXN, cn } from "@/lib/utils";
import { dayKey, formatPeriodLabel, todayAnchor, wallClockNow, type PeriodKind } from "@/services/period";
import { useLocale, useT } from "@/lib/i18n-react";
import type { AnalyticsData, TrendsData } from "@/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

/**
 * "Where did my money go", one screen per week, month or year: the figure,
 * what's notable about it in words, then the charts that answer it (by day,
 * by category, by day of the calendar, from income to savings), budgets
 * against the month's pace, and the months around it.
 */
export default function Analytics() {
  const t = useT();
  const locale = useLocale();
  const openAddRecord = useAddRecord();
  const [kind, setKind] = useState<PeriodKind>("month");
  const [anchor, setAnchor] = useState(todayAnchor);
  // Captured once rather than read during render.
  const [openedAt] = useState(() => wallClockNow().getTime());
  const [todayKey] = useState(() => dayKey(todayAnchor()));

  const { data, isLoading } = useSWR<AnalyticsData>(
    `/api/analytics?period=${kind}&anchor=${dayKey(anchor)}&today=${todayKey}`,
    fetcher,
    // The period on screen stays until its replacement lands.
    { keepPreviousData: true }
  );
  const { data: trends, isLoading: trendsLoading } = useSWR<TrendsData>(
    `/api/analytics/trends?period=${kind}&anchor=${dayKey(anchor)}&today=${todayKey}`,
    fetcher,
    { keepPreviousData: true }
  );

  // Named from the figures on screen, not the button just pressed.
  const periodLabel = data
    ? formatPeriodLabel(
        { kind: data.period, range: { from: new Date(data.from), to: new Date(data.to) }, previous: null, bucket: data.granularity },
        locale
      ) ?? t.home.allTime
    : "";

  const trend =
    data && data.prevExpenses > 0 ? Math.round(((data.expenses - data.prevExpenses) / data.prevExpenses) * 100) : null;
  const vs = data?.inProgress
    ? { week: t.analytics.vsSameDayWeek, month: t.analytics.vsSameDayMonth, year: t.analytics.vsSameDayYear }
    : { week: t.analytics.vsPrevWeek, month: t.analytics.vsPrevMonth, year: t.analytics.vsPrevYear };
  const vsLabel = data && data.period !== "all" ? vs[data.period] : undefined;

  const spanQuery = data ? `period=${data.period}&anchor=${data.from.slice(0, 10)}` : "";
  const empty = data !== undefined && data.expenseCount === 0 && data.income === 0;

  // The category sentence rides on the treemap; the rest lead the screen.
  const categoryNote = data?.insights.find((i) => i.kind === "categoryVsUsual");
  const leading = data?.insights.filter((i) => i !== categoryNote) ?? [];

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 pt-3 pb-6">
      <PeriodNav
        kind={kind}
        anchor={anchor}
        onKindChange={setKind}
        onAnchorChange={setAnchor}
        now={openedAt}
        kinds={["week", "month", "year"]}
      />

      {!data ? (
        <div className="mt-3">
          <ChartSkeleton height="h-96" />
        </div>
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
        <div className={cn("mt-3 transition-opacity duration-200 ease-out", isLoading && "opacity-50")}>
          {/* The period's figure and which way it moved. */}
          <section className="px-1 pt-2 pb-4 md:pb-5">
            <p className="text-[12px] text-text-dim">
              {t.analytics.spent} · {periodLabel}
            </p>
            <div className="flex items-baseline gap-2.5 mt-0.5 flex-wrap">
              <p className="text-[34px] font-semibold text-text tabular-nums tracking-[-0.03em] leading-tight">
                {formatMXN(data.expenses)}
              </p>
              {trend !== null && (
                <span className="flex items-center gap-1.5 text-[11.5px] text-text-dim">
                  <TrendBadge value={trend} polarity="down-good" />
                  {vsLabel}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 mt-1.5 text-[12.5px] text-text-muted tabular-nums">
              <span>
                {t.analytics.income} <b className="font-semibold text-text">{formatMXN(data.income)}</b>
              </span>
              <span>
                {t.analytics.net}{" "}
                {/* Before the period's first income, spending is all there is to
                    subtract from: that's waiting on payday, not a loss. */}
                <b
                  className={cn(
                    "font-semibold",
                    data.income === 0 && data.inProgress ? "text-text" : data.net < 0 ? "text-red-fg" : "text-green-fg"
                  )}
                >
                  {formatMXN(data.net)}
                </b>
              </span>
              <Link
                href={`/wallet?${spanQuery}`}
                className="ml-auto font-mono text-[10px] font-medium uppercase tracking-wide text-accent hover:brightness-125 min-h-[32px] flex items-center"
              >
                {t.home.seeAll} →
              </Link>
            </div>
          </section>

          <div className="grid gap-3 md:grid-cols-2 md:gap-x-6 md:items-start">
            <div className="flex flex-col gap-3">
              <InsightList insights={leading} />
              <CategoryBars
                buckets={data.buckets}
                granularity={data.granularity}
                categories={data.categories}
                periodLabel={periodLabel}
                total={data.expenses}
                todayKey={todayKey}
              />
              {data.period === "month" && (
                <HeatCalendar buckets={data.buckets} periodLabel={periodLabel} todayKey={todayKey} />
              )}
              {data.period === "month" && data.monthProgress !== null && (
                <BudgetPace budgets={data.budgets} monthProgress={data.monthProgress} inProgress={data.inProgress} />
              )}
            </div>

            <div className="flex flex-col gap-3">
              {data.categories.length > 0 && (
                <CategoryTreemap
                  categories={data.categories}
                  periodLabel={periodLabel}
                  total={data.expenses}
                  spanQuery={spanQuery}
                  note={categoryNote ? insightText(categoryNote, t) : null}
                />
              )}
              {data.flow && <MoneyFlowChart flow={data.flow} periodLabel={periodLabel} spanQuery={spanQuery} />}
              {trends ? (
                <div className={cn("transition-opacity duration-200", trendsLoading && "opacity-50")}>
                  <TrendsPanel data={trends} partialKey={todayKey.slice(0, 7)} />
                </div>
              ) : (
                <ChartSkeleton height="h-72" />
              )}
            </div>
          </div>

          <div className="mt-4">
            <AnalyticsTable data={data} />
          </div>
        </div>
      )}
    </div>
  );
}
