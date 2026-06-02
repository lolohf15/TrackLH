"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import { StatCard } from "./StatCard";
import { CategoryChart } from "./CategoryChart";
import { AccountChart } from "./AccountChart";
import { AccountBalances } from "./AccountBalances";
import { BudgetTracker } from "./BudgetTracker";
import { SyncButton } from "./SyncButton";
import { InitialBalances } from "./InitialBalances";
import { TransactionTable } from "@/components/transactions/TransactionTable";
import { TransactionFiltersPanel } from "@/components/transactions/TransactionFilters";
import { StatCardSkeleton, ChartSkeleton } from "@/components/ui/Skeleton";
import { formatMXN, formatMonth, getCurrentMonth } from "@/lib/utils";
import type { DashboardData, PaginatedTransactions, TransactionFilters } from "@/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function buildTxUrl(f: TransactionFilters): string {
  const p = new URLSearchParams();
  if (f.month)    p.set("month", f.month);
  if (f.category) p.set("category", f.category);
  if (f.account)  p.set("account", f.account);
  if (f.type)     p.set("type", f.type);
  p.set("page", String(f.page));
  p.set("limit", String(f.limit));
  return `/api/transactions?${p}`;
}

function pctChange(current: number, prev: number): number | null {
  if (prev === 0) return null;
  return Math.round(((current - prev) / prev) * 100);
}

export function Dashboard() {
  const [dashMonth, setDashMonth] = useState(getCurrentMonth());
  const [filters, setFilters] = useState<TransactionFilters>({
    month: getCurrentMonth(), category: "", account: "", type: "", page: 1, limit: 50,
  });

  const { data: dashboard, isLoading: dashLoading, mutate: mutateDashboard } =
    useSWR<DashboardData>(`/api/dashboard?month=${dashMonth}`, fetcher);

  const { data: transactions, isLoading: txLoading } =
    useSWR<PaginatedTransactions>(buildTxUrl(filters), fetcher);

  const { data: filterOptions } =
    useSWR<{ categories: string[]; accounts: string[] }>("/api/transactions/filters", fetcher);

  const handleSyncComplete = useCallback(() => { mutateDashboard(); }, [mutateDashboard]);

  function navigateMonth(dir: -1 | 1) {
    const [y, m] = dashMonth.split("-").map(Number);
    const d = new Date(y, m - 1 + dir, 1);
    const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    setDashMonth(next);
    setFilters((f) => ({ ...f, month: next, page: 1 }));
  }

  const netBalance   = dashboard?.netBalance   ?? 0;
  const prevExpenses = dashboard?.prevMonthExpenses ?? 0;
  const prevIncome   = dashboard?.prevMonthIncome   ?? 0;

  const expensesTrend = pctChange(dashboard?.monthlyExpenses ?? 0, prevExpenses);
  const incomeTrend   = pctChange(dashboard?.monthlyIncome   ?? 0, prevIncome);
  const netTrend      = pctChange(netBalance, dashboard ? dashboard.prevMonthIncome - dashboard.prevMonthExpenses : 0);

  return (
    <div className="min-h-screen bg-[#0d1117]">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-[#0d1117]/95 backdrop-blur-md border-b border-[#21262d]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 shrink-0 bg-[#238636] rounded-xl flex items-center justify-center shadow-sm shadow-[#238636]/30">
              <span className="text-white text-xs font-bold">T</span>
            </div>
            {/* Month navigation */}
            <div className="flex items-center gap-1.5 min-w-0">
              <button
                onClick={() => navigateMonth(-1)}
                aria-label="Mes anterior"
                className="w-6 h-6 flex items-center justify-center rounded-lg text-[#8b949e] hover:bg-[#21262d] hover:text-[#e6edf3] transition-colors text-sm"
              >
                ‹
              </button>
              <div className="min-w-0 text-center">
                <h1 className="text-sm font-semibold text-[#e6edf3] leading-none">TrackLH</h1>
                <p className="text-xs text-[#8b949e] mt-0.5 truncate">{formatMonth(dashMonth)}</p>
              </div>
              <button
                onClick={() => navigateMonth(1)}
                aria-label="Mes siguiente"
                disabled={dashMonth >= getCurrentMonth()}
                className="w-6 h-6 flex items-center justify-center rounded-lg text-[#8b949e] hover:bg-[#21262d] hover:text-[#e6edf3] transition-colors text-sm disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ›
              </button>
            </div>
          </div>
          <SyncButton lastSyncAt={dashboard?.lastSyncAt ?? null} onSyncComplete={handleSyncComplete} />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* Stat cards */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {dashLoading ? (
            Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          ) : (
            <>
              <StatCard
                title="Total disponible"
                value={formatMXN(dashboard?.totalAvailable ?? 0)}
                subtitle="cuentas débito"
                accent="default"
                icon={<WalletIcon />}
              />
              <StatCard
                title="Gastado este mes"
                value={formatMXN(dashboard?.monthlyExpenses ?? 0)}
                subtitle={formatMonth(dashMonth)}
                accent="red"
                trend={expensesTrend}
                trendPositiveIsGood={false}
                icon={<ArrowDownIcon />}
              />
              <StatCard
                title="Ingresos del mes"
                value={formatMXN(dashboard?.monthlyIncome ?? 0)}
                subtitle={formatMonth(dashMonth)}
                accent="green"
                trend={incomeTrend}
                icon={<ArrowUpIcon />}
              />
              <StatCard
                title="Ahorro del mes"
                value={formatMXN(netBalance)}
                subtitle={netBalance >= 0 ? "superávit" : "déficit"}
                accent={netBalance >= 0 ? "green" : "red"}
                trend={netTrend}
                icon={<SavingsIcon />}
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
              <CategoryChart data={dashboard?.categoryExpenses ?? []} />
              <AccountChart data={(dashboard?.accountBalances ?? []).filter((a) => !a.isCredit)} />
            </>
          )}
        </section>

        {/* Accounts + Budget */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {dashLoading ? (
            <><ChartSkeleton height="h-64" /><ChartSkeleton height="h-64" /></>
          ) : (
            <>
              <AccountBalances data={dashboard?.accountBalances ?? []} />
              <BudgetTracker data={dashboard?.budgetItems ?? []} />
            </>
          )}
        </section>

        {/* Settings */}
        <section>
          <InitialBalances onSaved={handleSyncComplete} />
        </section>

        {/* Transactions */}
        <section className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-xs font-semibold text-[#8b949e] uppercase tracking-widest">
              Historial de transacciones
            </h2>
            <TransactionFiltersPanel
              filters={filters}
              categories={filterOptions?.categories ?? []}
              accounts={filterOptions?.accounts ?? []}
              onChange={setFilters}
            />
          </div>
          <TransactionTable
            data={transactions ?? null}
            loading={txLoading}
            page={filters.page}
            onPageChange={(p) => setFilters((f) => ({ ...f, page: p }))}
          />
        </section>

      </main>
    </div>
  );
}

function WalletIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18-3a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6.75A2.25 2.25 0 0018.75 4.5h-13.5A2.25 2.25 0 003 6.75V9" />
    </svg>
  );
}

function ArrowDownIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6L9 12.75l4.286-4.286a11.948 11.948 0 014.306 6.43l.776 2.898m0 0l3.182-5.511m-3.182 5.51l-5.511-3.181" />
    </svg>
  );
}

function ArrowUpIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.286 4.286a11.948 11.948 0 014.306-6.43l.776-2.898m0 0l3.182 5.511m-3.182-5.51l-5.511 3.181" />
    </svg>
  );
}

function SavingsIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
