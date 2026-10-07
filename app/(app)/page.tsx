"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { AccountBalances } from "@/components/dashboard/AccountBalances";
import { UpcomingPayments } from "@/components/dashboard/UpcomingPayments";
import { PendingRecurring } from "@/components/recurring/PendingRecurring";
import { TransactionList } from "@/components/transactions/TransactionList";
import { FirstSteps } from "@/components/onboarding/FirstSteps";
import { useAddRecord } from "@/components/transactions/AddRecordProvider";
import { BalanceHero } from "@/components/home/BalanceHero";
import { LeftToSpendCard } from "@/components/home/LeftToSpendCard";
import { PaceCard } from "@/components/home/PaceCard";
import { InsightList } from "@/components/charts/InsightList";
import { Button } from "@/components/ui/Button";
import { ChartSkeleton } from "@/components/ui/Skeleton";
import { useT } from "@/lib/i18n-react";
import { dayKey, todayAnchor } from "@/services/period";
import type { AnalyticsData, DashboardData, LeftToSpend, PaginatedTransactions } from "@/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

/**
 * Inicio answers "how am I doing today": what there is, what's left to spend
 * this month and per day, the month's pace against last month's, anything
 * waiting on a decision, one thing worth knowing, and the latest movements.
 * Where the money went is Analytics' question.
 */
export default function Home() {
  const t = useT();
  const openAddRecord = useAddRecord();
  // Captured once: a dashboard left open across midnight isn't worth a
  // component that reads the clock on every render.
  const [today] = useState(() => dayKey(todayAnchor()));

  const { data: dashboard, isLoading: dashLoading } = useSWR<DashboardData>(
    `/api/dashboard?period=month&anchor=${today}&today=${today}`,
    fetcher
  );
  const { data: analytics } = useSWR<AnalyticsData>(
    `/api/analytics?period=month&anchor=${today}&today=${today}`,
    fetcher
  );
  const { data: left } = useSWR<{ left: LeftToSpend | null }>(`/api/left-to-spend?today=${today}`, fetcher);
  const { data: recent, isLoading: recentLoading } = useSWR<PaginatedTransactions>(
    "/api/transactions?limit=5&page=1",
    fetcher
  );

  if (dashLoading || !dashboard) {
    return (
      <div className="max-w-6xl mx-auto px-4 md:px-8 pt-6 pb-6">
        <ChartSkeleton height="h-[420px]" />
      </div>
    );
  }

  const balances = dashboard.accountBalances ?? [];
  // Only worth naming when card debt pulls it away from the total.
  const hasDebt = dashboard.totalAvailable !== dashboard.netWorth;
  // A pace line needs something on either side of it.
  const hasPace = !!analytics && (analytics.expenses > 0 || analytics.previousExpenses.some((v) => v > 0));
  const previousMonthStart = new Date(Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 2, 1)).toISOString();

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 pb-6">
      <BalanceHero
        total={dashboard.totalAvailable}
        netWorth={hasDebt ? dashboard.netWorth : null}
        accounts={balances.filter((a) => !a.isCredit).length}
      />

      <div className="mt-4 md:mt-6 md:grid md:grid-cols-[1fr_380px] md:gap-6 md:items-start">
        <div className="flex flex-col gap-3">
          {/* Only for someone who just arrived; it hides itself when done. */}
          <FirstSteps />
          {left && <LeftToSpendCard left={left.left} />}
          {/* Waiting on a decision: recurring movements to confirm, cards due. */}
          <PendingRecurring />
          <UpcomingPayments balances={balances} />
          {analytics && hasPace && (
            <PaceCard
              buckets={analytics.buckets}
              previousExpenses={analytics.previousExpenses}
              todayKey={today}
              previousMonthStart={previousMonthStart}
            />
          )}
          {analytics && <InsightList insights={analytics.insights.slice(0, 1)} />}
        </div>

        <div className="flex flex-col gap-3 mt-3 md:mt-0">
          <section>
            <div className="flex items-baseline justify-between px-1 pt-1 pb-2">
              <h2 className="font-mono text-[10px] font-semibold text-text-dim uppercase tracking-[0.1em]">
                {t.overview.recent}
              </h2>
              <Link
                href="/wallet"
                className="font-mono text-[10px] font-medium text-accent hover:brightness-125 tracking-wide min-h-[28px] flex items-center"
              >
                {t.home.seeAll} →
              </Link>
            </div>
            <div className="panel px-4 pb-2">
              <TransactionList
                data={recent ?? null}
                loading={recentLoading}
                page={1}
                onPageChange={() => {}}
                paginate={false}
                emptyTitle={t.home.emptyTitle}
                emptyHint={t.home.emptyHint}
                emptyAction={
                  <Button size="sm" onClick={() => openAddRecord({ type: "Gasto" })}>
                    {t.emptyActions.logMovement}
                  </Button>
                }
              />
            </div>
          </section>
          <div className="hidden md:block">
            <AccountBalances data={balances} />
          </div>
        </div>
      </div>
    </div>
  );
}
