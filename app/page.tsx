"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { CategoryRanking } from "@/components/dashboard/CategoryRanking";
import { AccountBalances } from "@/components/dashboard/AccountBalances";
import { BudgetTracker } from "@/components/dashboard/BudgetTracker";
import { TransactionList } from "@/components/transactions/TransactionList";
import { ChartSkeleton } from "@/components/ui/Skeleton";
import { formatMXN, formatMonth, getCurrentMonth, cn } from "@/lib/utils";
import type { DashboardData, PaginatedTransactions } from "@/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function Home() {
  const [dashMonth, setDashMonth] = useState(getCurrentMonth());

  const { data: dashboard, isLoading: dashLoading } =
    useSWR<DashboardData>(`/api/dashboard?month=${dashMonth}`, fetcher);

  const { data: recent, isLoading: recentLoading } =
    useSWR<PaginatedTransactions>(`/api/transactions?limit=5&page=1`, fetcher);

  function navigateMonth(dir: -1 | 1) {
    const [y, m] = dashMonth.split("-").map(Number);
    const d = new Date(y, m - 1 + dir, 1);
    setDashMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const income = dashboard?.monthlyIncome ?? 0;
  const expenses = dashboard?.monthlyExpenses ?? 0;
  const net = dashboard?.netBalance ?? 0;
  const netTotal = income + expenses || 1;
  const incomePct = Math.round((income / netTotal) * 100);

  const prevExpenses = dashboard?.prevMonthExpenses ?? 0;
  const prevIncome = dashboard?.prevMonthIncome ?? 0;
  const expensesTrend = prevExpenses > 0 ? Math.round(((expenses - prevExpenses) / prevExpenses) * 100) : null;
  const incomeTrend = prevIncome > 0 ? Math.round(((income - prevIncome) / prevIncome) * 100) : null;

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
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigateMonth(-1)}
            aria-label="Mes anterior"
            className="press w-[22px] h-[22px] flex items-center justify-center border border-border text-text-muted hover:border-border-strong transition-colors duration-150 ease-out text-xs"
          >
            ‹
          </button>
          <span className="font-mono text-[11px] text-text-muted min-w-[88px] text-center uppercase tracking-wide">
            {formatMonth(dashMonth)}
          </span>
          <button
            onClick={() => navigateMonth(1)}
            aria-label="Mes siguiente"
            disabled={dashMonth >= getCurrentMonth()}
            className="press w-[22px] h-[22px] flex items-center justify-center border border-border text-text-muted hover:border-border-strong transition-colors duration-150 ease-out text-xs disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ›
          </button>
        </div>
      </div>

      <div className="md:grid md:grid-cols-[1fr_360px] md:gap-8 md:items-start">
        <div>

          {/* Balance ledger */}
          <div className="px-4 md:px-0 py-4 border-t border-b border-border md:border-b-0">
            <div className="font-mono text-[10px] font-semibold text-text-dim uppercase tracking-[0.1em] mb-2">Saldo total</div>
            <div className="font-mono text-[38px] font-semibold text-text tracking-tight leading-none">
              {formatMXN(dashboard?.totalAvailable ?? 0)}
            </div>
            <div className="text-xs text-text-dim mt-1.5">
              {(dashboard?.accountBalances ?? []).filter((a) => !a.isCredit).length} cuentas de débito
            </div>
          </div>

          {/* Income / expense strip */}
          <div className="grid grid-cols-2 border-b border-border">
            <div className="px-4 py-4 border-r border-border">
              <div className="font-mono text-[10px] font-semibold text-text-dim uppercase tracking-[0.1em]">Ingresos</div>
              <div className="font-mono text-[19px] font-semibold text-text mt-1.5">{formatMXN(income)}</div>
              {incomeTrend !== null && (
                <div className={cn("font-mono text-[11px] mt-1", incomeTrend >= 0 ? "text-green-fg" : "text-red-fg")}>
                  {incomeTrend >= 0 ? "▲" : "▼"} {Math.abs(incomeTrend)}%
                </div>
              )}
            </div>
            <div className="px-4 py-4">
              <div className="font-mono text-[10px] font-semibold text-text-dim uppercase tracking-[0.1em]">Gastos</div>
              <div className="font-mono text-[19px] font-semibold text-text mt-1.5">{formatMXN(expenses)}</div>
              {expensesTrend !== null && (
                <div className={cn("font-mono text-[11px] mt-1", expensesTrend <= 0 ? "text-green-fg" : "text-red-fg")}>
                  {expensesTrend >= 0 ? "▲" : "▼"} {Math.abs(expensesTrend)}%
                </div>
              )}
            </div>
          </div>

          {/* Net bar */}
          <div className="px-4 md:px-0 py-4 border-b border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[10px] font-semibold text-text-dim uppercase tracking-[0.1em]">Ahorro del mes</span>
              <span className={cn("font-mono text-[13px] font-semibold", net >= 0 ? "text-green-fg" : "text-red-fg")}>
                {formatMXN(net)}
              </span>
            </div>
            <div className="flex h-1.5 w-full bg-surface-2 overflow-hidden">
              <div className="h-full bg-green-fg" style={{ width: `${incomePct}%` }} />
              <div className="h-full bg-red-fg" style={{ width: `${100 - incomePct}%` }} />
            </div>
          </div>

          {/* Recent activity */}
          <div className="px-4 md:px-0 py-4">
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-[10px] font-semibold text-text-dim uppercase tracking-[0.1em]">Actividad reciente</span>
              <Link href="/movimientos" className="font-mono text-[10px] text-accent hover:brightness-125 tracking-wide">
                VER TODO →
              </Link>
            </div>
            <TransactionList data={recent ?? null} loading={recentLoading} page={1} onPageChange={() => {}} />
          </div>

        </div>

        {/* Desktop right rail: budget + category ranking */}
        <div className="hidden md:flex flex-col border-l border-border">
          <BudgetTracker data={dashboard?.budgetItems ?? []} />
          <CategoryRanking data={dashboard?.categoryExpenses ?? []} limit={7} />
          <AccountBalances data={dashboard?.accountBalances ?? []} />
        </div>

        {/* Mobile: stacked below */}
        <div className="md:hidden px-4 border-t border-border">
          <BudgetTrackerMobile data={dashboard?.budgetItems ?? []} />
          <CategoryRanking data={dashboard?.categoryExpenses ?? []} limit={5} />
        </div>
      </div>
    </div>
  );
}

function BudgetTrackerMobile({ data }: { data: DashboardData["budgetItems"] }) {
  return (
    <div className="py-4 border-b border-border">
      <div className="flex items-center justify-between mb-3.5">
        <span className="font-mono text-[10px] font-semibold text-text-dim uppercase tracking-[0.1em]">Presupuesto</span>
      </div>
      <BudgetTracker data={data.slice(0, 4)} bare />
    </div>
  );
}
