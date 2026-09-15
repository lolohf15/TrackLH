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
import { useLocale, useT } from "@/lib/i18n-react";
import { GaugeArc } from "@/components/ui/GaugeArc";
import { TickMeter } from "@/components/ui/TickMeter";
import { dayKey, formatPeriodLabel, monthKey, resolvePeriod } from "@/services/period";
import { formatMXN, cn } from "@/lib/utils";
import { useCountUp } from "@/lib/useCountUp";
import type { DashboardData, PaginatedTransactions, YearlyDashboardData } from "@/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function Home() {
  const t = useT();
  const locale = useLocale();
  // The day being looked at — the month around it is what Inicio shows.
  const [anchor, setAnchor] = useState(() => new Date());
  // Captured once rather than read during render: reading the clock while
  // rendering makes the component non-deterministic, and a dashboard left
  // open across midnight is not worth that.
  const [openedAt] = useState(() => Date.now());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(() => new Date().getUTCFullYear());

  const period = resolvePeriod("month", anchor);

  const { data: dashboard, isLoading: dashLoading } = useSWR<DashboardData>(
    `/api/dashboard?period=month&anchor=${dayKey(anchor)}`,
    fetcher
  );

  const { data: recent, isLoading: recentLoading } =
    useSWR<PaginatedTransactions>(`/api/transactions?limit=5&page=1`, fetcher);

  const { data: yearly, isLoading: yearlyLoading } =
    useSWR<YearlyDashboardData>(pickerOpen ? `/api/dashboard/yearly?year=${pickerYear}` : null, fetcher);

  function navigate(dir: -1 | 1) {
    const next = new Date(anchor);
    next.setUTCMonth(next.getUTCMonth() + dir);
    setAnchor(next);
  }

  function openPicker() {
    setPickerYear(anchor.getUTCFullYear());
    setPickerOpen(true);
  }

  // A period that already contains today has no "next" to walk into.
  const atLatest = period.range.to.getTime() > openedAt;

  const income = dashboard?.periodIncome ?? 0;
  const expenses = dashboard?.periodExpenses ?? 0;
  const net = dashboard?.netBalance ?? 0;
  // Nothing came in means there was nothing to keep — the dial reads empty
  // rather than dividing by a month that never started.
  const savingsRate = income > 0 ? Math.min(Math.max((net / income) * 100, 0), 100) : 0;

  const budgetUsed = dashboard?.budgetUsed ?? 0;
  const budgetTotal = dashboard?.budgetTotal ?? 0;
  const hasBudget = budgetTotal > 0;
  const budgetPct = dashboard?.budgetUsedPercent ?? 0;
  // The same bands the credit line reads by: fine, watch it, over.
  const budgetTone =
    budgetPct >= 100 ? "var(--color-red)" : budgetPct >= 80 ? "var(--color-amber)" : "var(--color-green)";

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

      {/* Inicio is the overview of a month. Slicing by week or year is a
          question you go to Analytics to ask. */}
      <div className="flex items-center justify-between px-4 md:px-0 pt-3 pb-2.5">
        <span className="text-[15px] font-semibold text-text">{t.home.title}</span>
        <div className="flex items-center -my-2 -mr-2">
          <MonthNavButton label={t.home.prevMonth} onClick={() => navigate(-1)}>
            ‹
          </MonthNavButton>
          <button
            onClick={openPicker}
            className="press font-mono text-[10px] text-text-muted min-w-[70px] text-center uppercase tracking-wide hover:text-text transition-colors duration-150 ease-out"
          >
            {formatPeriodLabel(period, locale)}
          </button>
          <MonthNavButton
            label={t.home.nextMonth}
            onClick={() => navigate(1)}
            disabled={atLatest}
          >
            ›
          </MonthNavButton>
        </div>
      </div>

      <div className="md:grid md:grid-cols-[1fr_360px] md:gap-8 md:items-start">
        <div className="px-4 md:px-0 space-y-3">

          {/* This month, as one group: the total and how it split. */}
          <div className="tint tint-gold">
            <MetricTile
              label={t.home.totalBalance}
              value={totalAvailableDisplay}
              size="lg"
              hint={t.home.debitAccounts((dashboard?.accountBalances ?? []).filter((a) => !a.isCredit).length)}
              className="px-4 pt-3.5 pb-3.5"
            />

            <div className="grid grid-cols-2 border-t border-border">
              <MetricTile
                label={t.home.income}
                value={incomeDisplay}
                trend={incomeTrend}
                className="px-4 py-3 border-r border-border"
              />
              <MetricTile
                label={t.home.expenses}
                value={expensesDisplay}
                trend={expensesTrend}
                trendPolarity="down-good"
                className="px-4 py-3"
              />
            </div>

          </div>

          {/* What the month came to, as two dials: how much of what came in
              stayed, and how much of the budget is gone. */}
          <div className={cn("grid gap-3", hasBudget ? "grid-cols-2" : "grid-cols-1")}>
            <div className="tint tint-green px-4 pt-3 pb-3.5">
              <p className="font-mono text-[10px] font-semibold text-text-dim uppercase tracking-[0.1em]">
                {t.home.monthlySavings}
              </p>
              <GaugeArc
                percent={savingsRate}
                color={net >= 0 ? "var(--color-green)" : "var(--color-red)"}
                className="mt-2"
              >
                <p className={cn("text-[19px] font-semibold tabular-nums leading-none", net >= 0 ? "text-text" : "text-red-fg")}>
                  {netDisplay}
                </p>
              </GaugeArc>
              <p className="text-[11px] text-text-dim text-center mt-1.5">
                {t.home.savingsRate(Math.round(savingsRate))}
              </p>
            </div>

            {hasBudget && (
              <div className="tint px-4 pt-3 pb-3.5 flex flex-col" style={{ ["--tint-hue" as string]: budgetTone }}>
                <p className="font-mono text-[10px] font-semibold text-text-dim uppercase tracking-[0.1em]">
                  {t.home.budgetThisMonth}
                </p>
                <div className="my-auto py-4">
                  <TickMeter percent={budgetPct} color={budgetTone} height={32} ticks={20} />
                </div>
                <p className="font-mono text-[11px] tabular-nums">
                  <span className="text-text font-semibold">{formatMXN(budgetUsed)}</span>
                  <span className="text-text-dim"> {t.common.of} {formatMXN(budgetTotal)}</span>
                </p>
                <p className="font-mono text-[11px] mt-0.5" style={{ color: budgetTone }}>
                  {Math.round(budgetPct)}%
                </p>
              </div>
            )}
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
            <SectionLabel>{t.home.budget}</SectionLabel>
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
