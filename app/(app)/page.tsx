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
import { formatMXN, formatMonth, getCurrentMonth, cn } from "@/lib/utils";
import { useCountUp } from "@/lib/useCountUp";
import type { DashboardData, PaginatedTransactions, YearlyDashboardData } from "@/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function Home() {
  const [dashMonth, setDashMonth] = useState(getCurrentMonth());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(() => Number(getCurrentMonth().split("-")[0]));

  const { data: dashboard, isLoading: dashLoading } =
    useSWR<DashboardData>(`/api/dashboard?month=${dashMonth}`, fetcher);

  const { data: recent, isLoading: recentLoading } =
    useSWR<PaginatedTransactions>(`/api/transactions?limit=5&page=1`, fetcher);

  const { data: yearly, isLoading: yearlyLoading } =
    useSWR<YearlyDashboardData>(pickerOpen ? `/api/dashboard/yearly?year=${pickerYear}` : null, fetcher);

  function navigateMonth(dir: -1 | 1) {
    const [y, m] = dashMonth.split("-").map(Number);
    const d = new Date(y, m - 1 + dir, 1);
    setDashMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  function openPicker() {
    setPickerYear(Number(dashMonth.split("-")[0]));
    setPickerOpen(true);
  }

  const income = dashboard?.monthlyIncome ?? 0;
  const expenses = dashboard?.monthlyExpenses ?? 0;
  const net = dashboard?.netBalance ?? 0;
  // A month with no activity at all is not "100% spent" — it has nothing to
  // split, so the bar stays an empty track rather than going fully red.
  const hasActivity = income + expenses > 0;
  const incomePct = hasActivity ? Math.round((income / (income + expenses)) * 100) : 0;

  const prevExpenses = dashboard?.prevMonthExpenses ?? 0;
  const prevIncome = dashboard?.prevMonthIncome ?? 0;
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

      {/* Month nav */}
      <div className="flex items-center justify-between px-4 md:px-0 pt-4 pb-3">
        <span className="text-[15px] font-semibold text-text">Resumen</span>
        <div className="flex items-center gap-0.5 -my-2 -mr-2">
          <MonthNavButton label="Mes anterior" onClick={() => navigateMonth(-1)}>
            ‹
          </MonthNavButton>
          <button
            onClick={openPicker}
            className="press font-mono text-[11px] text-text-muted min-w-[88px] text-center uppercase tracking-wide hover:text-text transition-colors duration-150 ease-out"
          >
            {formatMonth(dashMonth)}
          </button>
          <MonthNavButton
            label="Mes siguiente"
            onClick={() => navigateMonth(1)}
            disabled={dashMonth >= getCurrentMonth()}
          >
            ›
          </MonthNavButton>
        </div>
      </div>

      <div className="md:grid md:grid-cols-[1fr_360px] md:gap-8 md:items-start">
        <div className="px-4 md:px-0 space-y-3">

          {/* This month, as one group: the total, then how it split, then what's left */}
          <div className="panel">
            <div className="px-4 pt-4 pb-4">
              <div className="font-mono text-[10px] font-semibold text-text-dim uppercase tracking-[0.1em] mb-2">Saldo total</div>
              <div className="font-mono text-[38px] font-semibold text-text tracking-tight leading-none tabular-nums">
                {totalAvailableDisplay}
              </div>
              <div className="text-xs text-text-dim mt-1.5">
                {(dashboard?.accountBalances ?? []).filter((a) => !a.isCredit).length} cuentas de débito
              </div>
            </div>

            <div className="grid grid-cols-2 border-t border-divider">
              <div className="px-4 py-3.5 border-r border-divider">
                <div className="font-mono text-[10px] font-semibold text-text-dim uppercase tracking-[0.1em]">Ingresos</div>
                <div className="font-mono text-[19px] font-semibold text-text mt-1.5 tabular-nums">{incomeDisplay}</div>
                {incomeTrend !== null && (
                  <div className={cn("font-mono text-[11px] mt-1", incomeTrend >= 0 ? "text-green-fg" : "text-red-fg")}>
                    {incomeTrend >= 0 ? "▲" : "▼"} {Math.abs(incomeTrend)}%
                  </div>
                )}
              </div>
              <div className="px-4 py-3.5">
                <div className="font-mono text-[10px] font-semibold text-text-dim uppercase tracking-[0.1em]">Gastos</div>
                <div className="font-mono text-[19px] font-semibold text-text mt-1.5 tabular-nums">{expensesDisplay}</div>
                {expensesTrend !== null && (
                  <div className={cn("font-mono text-[11px] mt-1", expensesTrend <= 0 ? "text-green-fg" : "text-red-fg")}>
                    {expensesTrend >= 0 ? "▲" : "▼"} {Math.abs(expensesTrend)}%
                  </div>
                )}
              </div>
            </div>

            <div className="px-4 py-3.5 border-t border-divider">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[10px] font-semibold text-text-dim uppercase tracking-[0.1em]">Ahorro del mes</span>
                <span className={cn("font-mono text-[13px] font-semibold tabular-nums", net >= 0 ? "text-green-fg" : "text-red-fg")}>
                  {netDisplay}
                </span>
              </div>
              <div className="flex h-1.5 w-full rounded-full bg-surface-2 overflow-hidden">
                {hasActivity && (
                  <>
                    <div className="h-full bg-green-fg transition-[width] duration-300 ease-out" style={{ width: `${incomePct}%` }} />
                    <div className="h-full bg-red-fg transition-[width] duration-300 ease-out" style={{ width: `${100 - incomePct}%` }} />
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Recent activity — the group label sits above its group, not inside it */}
          <section>
            <SectionLabel>
              Actividad reciente
              <Link href="/movimientos" className="font-mono text-[10px] font-medium text-accent hover:brightness-125 tracking-wide normal-case">
                Ver todo →
              </Link>
            </SectionLabel>
            <div className="panel px-4 pb-2">
              <TransactionList
                data={recent ?? null}
                loading={recentLoading}
                page={1}
                onPageChange={() => {}}
                emptyTitle="Aún no hay movimientos"
                emptyHint="Toca el botón + para registrar tu primer gasto o ingreso"
              />
            </div>
          </section>

          {/* Mobile: budget + ranking continue the same stack */}
          <section className="md:hidden">
            <SectionLabel>Presupuesto</SectionLabel>
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
        selectedMonth={dashMonth}
        onSelect={(month) => { setDashMonth(month); setPickerOpen(false); }}
      />
    </div>
  );
}

/** 44px hit area around a 22px glyph box — the target grows, the chrome doesn't. */
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
      className="press w-11 h-11 flex items-center justify-center group disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100"
    >
      <span className="w-[26px] h-[26px] rounded-full flex items-center justify-center bg-surface-2 text-text-muted text-xs transition-colors duration-150 ease-out group-hover:bg-surface-3 group-hover:text-text">
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
