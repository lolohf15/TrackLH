"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { CategoryRanking } from "@/components/dashboard/CategoryRanking";
import { AccountBalances } from "@/components/dashboard/AccountBalances";
import { BudgetTracker } from "@/components/dashboard/BudgetTracker";
import { MonthPickerSheet } from "@/components/dashboard/MonthPickerSheet";
import { TransactionList } from "@/components/transactions/TransactionList";
import { ChartSkeleton } from "@/components/ui/Skeleton";
import { MetricTile } from "@/components/ui/MetricTile";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useLocale, useT } from "@/lib/i18n-react";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { dayKey, monthKey, resolvePeriod, type Period, type PeriodKind } from "@/services/period";
import { formatMXN, cn } from "@/lib/utils";
import { useCountUp } from "@/lib/useCountUp";
import type { DashboardData, PaginatedTransactions, YearlyDashboardData } from "@/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function Home() {
  const t = useT();
  const locale = useLocale();
  const [kind, setKind] = useState<PeriodKind>("month");
  // The day being looked at. Every period is "the week/month/year containing
  // this date", so navigating is a matter of moving it rather than of
  // special-casing each span.
  const [anchor, setAnchor] = useState(() => new Date());
  // Captured once rather than read during render: reading the clock while
  // rendering makes the component non-deterministic, and a dashboard left
  // open across midnight is not worth that.
  const [openedAt] = useState(() => Date.now());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(() => new Date().getUTCFullYear());

  const period = resolvePeriod(kind, anchor);

  const { data: dashboard, isLoading: dashLoading } = useSWR<DashboardData>(
    `/api/dashboard?period=${kind}&anchor=${dayKey(anchor)}`,
    fetcher
  );

  const { data: recent, isLoading: recentLoading } =
    useSWR<PaginatedTransactions>(`/api/transactions?limit=5&page=1`, fetcher);

  const { data: yearly, isLoading: yearlyLoading } =
    useSWR<YearlyDashboardData>(pickerOpen ? `/api/dashboard/yearly?year=${pickerYear}` : null, fetcher);

  function navigate(dir: -1 | 1) {
    const next = new Date(anchor);
    if (kind === "week") next.setUTCDate(next.getUTCDate() + dir * 7);
    else if (kind === "month") next.setUTCMonth(next.getUTCMonth() + dir);
    else if (kind === "year") next.setUTCFullYear(next.getUTCFullYear() + dir);
    setAnchor(next);
  }

  function pickPeriod(next: PeriodKind) {
    // Jumping back to today on every switch would lose the place someone
    // navigated to; the anchor stays put and the span around it changes.
    setKind(next);
  }

  function openPicker() {
    setPickerYear(anchor.getUTCFullYear());
    setPickerOpen(true);
  }

  // A period that already contains today has no "next" to walk into.
  const atLatest = kind === "all" || period.range.to.getTime() > openedAt;

  const income = dashboard?.periodIncome ?? 0;
  const expenses = dashboard?.periodExpenses ?? 0;
  const net = dashboard?.netBalance ?? 0;
  // A span with no activity at all is not "100% spent" — it has nothing to
  // split, so the bar stays an empty track rather than going fully red.
  const hasActivity = income + expenses > 0;
  const incomePct = hasActivity ? Math.round((income / (income + expenses)) * 100) : 0;

  const prevExpenses = dashboard?.prevPeriodExpenses ?? 0;
  const prevIncome = dashboard?.prevPeriodIncome ?? 0;
  const expensesTrend = prevExpenses > 0 ? Math.round(((expenses - prevExpenses) / prevExpenses) * 100) : null;
  const incomeTrend = prevIncome > 0 ? Math.round(((income - prevIncome) / prevIncome) * 100) : null;

  const totalAvailableDisplay = useCountUp(dashboard?.totalAvailable ?? 0, formatMXN);
  const incomeDisplay = useCountUp(income, formatMXN);
  const expensesDisplay = useCountUp(expenses, formatMXN);
  const netDisplay = useCountUp(net, formatMXN);

  if (dashLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 md:px-8 pt-2 pb-6">
        <ChartSkeleton height="h-[420px]" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto md:px-8">

      {/* Period nav. No page title: the tab bar already names this screen,
          and repeating it costs a row before any figure appears. */}
      <div className="flex items-center gap-2 px-4 md:px-0 pt-3 pb-2.5">
        <SegmentedControl
          options={[
            { value: "week", label: t.home.periodWeek },
            { value: "month", label: t.home.periodMonth },
            { value: "year", label: t.home.periodYear },
            { value: "all", label: t.home.periodAll },
          ]}
          value={kind}
          onChange={pickPeriod}
          label={t.home.title}
          size="sm"
          className="flex-1 min-w-0"
        />

        {/* All-time has no span to step through, so the stepper goes away
            and the segments take the width back. */}
        {kind !== "all" && (
          <div className="flex items-center shrink-0 -my-2">
            <MonthNavButton label={t.home.prevPeriod} onClick={() => navigate(-1)}>
              ‹
            </MonthNavButton>
            <button
              onClick={openPicker}
              disabled={kind !== "month"}
              className="press font-mono text-[10px] text-text-muted min-w-[70px] text-center uppercase tracking-wide hover:text-text transition-colors duration-150 ease-out disabled:hover:text-text-muted"
            >
              {periodLabel(period, locale)}
            </button>
            <MonthNavButton
              label={t.home.nextPeriod}
              onClick={() => navigate(1)}
              disabled={atLatest}
            >
              ›
            </MonthNavButton>
          </div>
        )}
      </div>

      <div className="md:grid md:grid-cols-[1fr_360px] md:gap-8 md:items-start">
        <div className="px-4 md:px-0 space-y-3">

          {/* This month, as one group: the total, then how it split, then what's left */}
          <div className="panel">
            <MetricTile
              label={t.home.totalBalance}
              value={totalAvailableDisplay}
              size="lg"
              hint={t.home.debitAccounts((dashboard?.accountBalances ?? []).filter((a) => !a.isCredit).length)}
              className="px-4 pt-3.5 pb-3.5"
            />

            <div className="grid grid-cols-2 border-t border-divider">
              <MetricTile
                label={t.home.income}
                value={incomeDisplay}
                trend={incomeTrend}
                className="px-4 py-3 border-r border-divider"
              />
              <MetricTile
                label={t.home.expenses}
                value={expensesDisplay}
                trend={expensesTrend}
                trendPolarity="down-good"
                className="px-4 py-3"
              />
            </div>

            <div className="px-4 py-3 border-t border-divider">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-mono text-[10px] font-semibold text-text-dim uppercase tracking-[0.1em]">{kind === "month" ? t.home.monthlySavings : t.home.savings}</span>
                <span className={cn("text-[13px] font-semibold tabular-nums", net >= 0 ? "text-green-fg" : "text-red-fg")}>
                  {netDisplay}
                </span>
              </div>
              <ProgressBar
                height={6}
                segments={
                  hasActivity
                    ? [
                        { percent: incomePct, color: "var(--color-green-fg)" },
                        { percent: 100 - incomePct, color: "var(--color-red-fg)" },
                      ]
                    : []
                }
              />
            </div>
          </div>

          {/* Recent activity — the group label sits above its group, not inside it */}
          <section>
            <SectionLabel>
              {t.home.recentActivity}
              <Link href="/movimientos" className="font-mono text-[10px] font-medium text-accent hover:brightness-125 tracking-wide normal-case">
                {t.home.seeAll} →
              </Link>
            </SectionLabel>
            <div className="panel px-4 pb-2">
              <TransactionList
                data={recent ?? null}
                loading={recentLoading}
                page={1}
                onPageChange={() => {}}
                emptyTitle={t.home.emptyTitle}
                emptyHint={t.home.emptyHint}
              />
            </div>
          </section>

          {/* Mobile: budget + ranking continue the same stack */}
          <section className="md:hidden">
            <SectionLabel>{kind === "month" ? t.home.budget : t.home.budgetThisMonth}</SectionLabel>
            <div className="panel px-4 py-4">
              <BudgetTracker data={(dashboard?.budgetItems ?? []).slice(0, 4)} bare />
            </div>
          </section>

          <div className="md:hidden">
            <CategoryRanking data={dashboard?.categoryExpenses ?? []} limit={5} />
          </div>
        </div>

        {/* Desktop right rail */}
        <div className="hidden md:flex flex-col gap-3">
          <BudgetTracker data={dashboard?.budgetItems ?? []} />
          <CategoryRanking data={dashboard?.categoryExpenses ?? []} limit={7} />
          <AccountBalances data={dashboard?.accountBalances ?? []} />
        </div>
      </div>

      <MonthPickerSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        year={pickerYear}
        onYearChange={setPickerYear}
        data={yearly}
        loading={yearlyLoading}
        selectedMonth={monthKey(period.range.from)}
        onSelect={(month) => {
          const [y, m] = month.split("-").map(Number);
          setAnchor(new Date(Date.UTC(y, m - 1, 1)));
          setPickerOpen(false);
        }}
      />
    </div>
  );
}

/**
 * What the arrows are sitting on. A week names its two ends, since "week of
 * the 8th" means nothing at a glance; the longer spans name themselves.
 */
function periodLabel(period: Period, locale: string): string {
  const { kind, range } = period;
  if (kind === "year") return String(range.from.getUTCFullYear());
  if (kind === "month") {
    return new Intl.DateTimeFormat(locale, {
      month: "short", year: "numeric", timeZone: "UTC",
    }).format(range.from);
  }

  // The range is half-open, so the last day it covers is the instant before it ends.
  const last = new Date(range.to.getTime() - 1);
  // formatRange puts the month where the language wants it and drops the
  // repeat when both ends share one — "14–20 sept" but "Sep 14 – 20".
  return new Intl.DateTimeFormat(locale, {
    day: "numeric", month: "short", timeZone: "UTC",
  }).formatRange(range.from, last);
}

/** 36px hit area around a 22px glyph box — the target grows, the chrome doesn't. */
function MonthNavButton({
  label, onClick, disabled, children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      disabled={disabled}
      className="press w-9 h-9 flex items-center justify-center group disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100"
    >
      <span className="w-[22px] h-[22px] rounded-full flex items-center justify-center bg-surface-2 text-text-muted text-[11px] transition-colors duration-150 ease-out group-hover:bg-surface-3 group-hover:text-text">
        {children}
      </span>
    </button>
  );
}

/** Grouped-list caption: it names the panel below it and sits outside it. */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between px-1 pt-1 pb-2">
      <span className="font-mono text-[10px] font-semibold text-text-dim uppercase tracking-[0.1em] flex-1 flex items-baseline justify-between gap-2">
        {children}
      </span>
    </div>
  );
}
