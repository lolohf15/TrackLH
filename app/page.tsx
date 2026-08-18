"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { StatCard } from "@/components/dashboard/StatCard";
import { CategoryChart } from "@/components/dashboard/CategoryChart";
import { AccountChart } from "@/components/dashboard/AccountChart";
import { AccountBalances } from "@/components/dashboard/AccountBalances";
import { BudgetTracker } from "@/components/dashboard/BudgetTracker";
import { TransactionList } from "@/components/transactions/TransactionList";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/Card";
import { StatCardSkeleton, ChartSkeleton } from "@/components/ui/Skeleton";
import { formatMXN, formatMonth, getCurrentMonth } from "@/lib/utils";
import { ArrowDownIcon, ArrowUpIcon, SavingsIcon, WalletIcon } from "@/components/shell/icons";
import type { DashboardData, PaginatedTransactions } from "@/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function pctChange(current: number, prev: number): number | null {
  if (prev === 0) return null;
  return Math.round(((current - prev) / prev) * 100);
}

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

  const netBalance   = dashboard?.netBalance   ?? 0;
  const prevExpenses = dashboard?.prevMonthExpenses ?? 0;
  const prevIncome   = dashboard?.prevMonthIncome   ?? 0;

  const expensesTrend = pctChange(dashboard?.monthlyExpenses ?? 0, prevExpenses);
  const incomeTrend   = pctChange(dashboard?.monthlyIncome   ?? 0, prevIncome);
  const netTrend      = pctChange(netBalance, dashboard ? dashboard.prevMonthIncome - dashboard.prevMonthExpenses : 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-6 space-y-5">

      {/* Page header: month nav */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-text">Resumen</h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <button
              onClick={() => navigateMonth(-1)}
              aria-label="Mes anterior"
              className="press w-5 h-5 flex items-center justify-center rounded-md text-text-dim hover:bg-surface-2 hover:text-text transition-[background-color,color,transform] duration-150 ease-out text-xs"
            >
              ‹
            </button>
            <p className="text-xs text-text-dim min-w-[110px]">{formatMonth(dashMonth)}</p>
            <button
              onClick={() => navigateMonth(1)}
              aria-label="Mes siguiente"
              disabled={dashMonth >= getCurrentMonth()}
              className="press w-5 h-5 flex items-center justify-center rounded-md text-text-dim hover:bg-surface-2 hover:text-text transition-[background-color,color,transform] duration-150 ease-out text-xs disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {/* Bento stat grid */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:grid-rows-2">
        {dashLoading ? (
          <>
            <div className="col-span-2 lg:col-span-2 lg:row-span-2"><StatCardSkeleton /></div>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <div className="col-span-2 lg:col-span-2"><StatCardSkeleton /></div>
          </>
        ) : (
          <>
            <StatCard
              title="Total disponible"
              value={formatMXN(dashboard?.totalAvailable ?? 0)}
              subtitle="cuentas débito"
              accent="default"
              icon={<WalletIcon className="w-4 h-4" />}
              large
              className="col-span-2 lg:col-span-2 lg:row-span-2"
            />
            <StatCard
              title="Gastado este mes"
              value={formatMXN(dashboard?.monthlyExpenses ?? 0)}
              subtitle={formatMonth(dashMonth)}
              accent="red"
              trend={expensesTrend}
              trendPositiveIsGood={false}
              icon={<ArrowDownIcon className="w-4 h-4" />}
              className="lg:col-start-3 lg:row-start-1"
            />
            <StatCard
              title="Ingresos del mes"
              value={formatMXN(dashboard?.monthlyIncome ?? 0)}
              subtitle={formatMonth(dashMonth)}
              accent="green"
              trend={incomeTrend}
              icon={<ArrowUpIcon className="w-4 h-4" />}
              className="lg:col-start-4 lg:row-start-1"
            />
            <StatCard
              title="Ahorro del mes"
              value={formatMXN(netBalance)}
              subtitle={netBalance >= 0 ? "superávit" : "déficit"}
              accent={netBalance >= 0 ? "green" : "red"}
              trend={netTrend}
              icon={<SavingsIcon className="w-4 h-4" />}
              className="col-span-2 lg:col-span-2 lg:col-start-3 lg:row-start-2"
            />
          </>
        )}
      </section>

      {/* Charts */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {dashLoading ? (
          <><ChartSkeleton height="h-80" /><ChartSkeleton height="h-80" /></>
        ) : (
          <>
            <CategoryChart data={dashboard?.categoryExpenses ?? []} limit={6} />
            <AccountChart data={(dashboard?.accountBalances ?? []).filter((a) => !a.isCredit)} />
          </>
        )}
      </section>

      {/* Mini accounts + budget, each linking to its full view */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {dashLoading ? (
          <><ChartSkeleton height="h-56" /><ChartSkeleton height="h-56" /></>
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle>Saldo por cuenta</CardTitle>
                <Link href="/cuentas" className="text-xs text-text-dim hover:text-green-fg transition-colors">
                  Ver todas →
                </Link>
              </CardHeader>
              <CardContent className="pt-0">
                <AccountBalances data={(dashboard?.accountBalances ?? []).slice(0, 5)} bare />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle>Presupuesto mensual</CardTitle>
                <Link href="/categorias" className="text-xs text-text-dim hover:text-green-fg transition-colors">
                  Ver todo →
                </Link>
              </CardHeader>
              <CardContent className="pt-0">
                <BudgetTracker data={(dashboard?.budgetItems ?? []).slice(0, 4)} bare />
              </CardContent>
            </Card>
          </>
        )}
      </section>

      {/* Recent activity preview */}
      <section className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-semibold text-text-dim uppercase tracking-widest">
            Actividad reciente
          </h2>
          <Link href="/movimientos" className="text-xs text-text-dim hover:text-green-fg transition-colors">
            Ver todos →
          </Link>
        </div>
        <TransactionList data={recent ?? null} loading={recentLoading} page={1} onPageChange={() => {}} />
      </section>

    </div>
  );
}
