"use client";

import { use, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { ChevronLeft } from "lucide-react";
import { ChartPanel } from "@/components/charts/ChartPanel";
import { StackedBarChart } from "@/components/ui/StackedBarChart";
import { TransactionList } from "@/components/transactions/TransactionList";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { TrendBadge } from "@/components/ui/TrendBadge";
import { ChartSkeleton } from "@/components/ui/Skeleton";
import { useCategoryIcons } from "@/lib/use-category-icons";
import { formatMXN, cn } from "@/lib/utils";
import { useLocale, useT } from "@/lib/i18n-react";
import { dayKey, formatPeriodLabel, todayAnchor } from "@/services/period";
import type { CategoryDetailData, PaginatedTransactions } from "@/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

/**
 * One category, for the span it was opened from: what it came to and which
 * way it moved, its budget against the month's pace, its last six months,
 * what it's mostly made of, and the movements themselves.
 */
export default function CategoryDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ period?: string; anchor?: string }>;
}) {
  const t = useT();
  const locale = useLocale();
  const iconFor = useCategoryIcons();
  const { category } = use(params);
  const { period = "month", anchor } = use(searchParams);
  const name = decodeURIComponent(category);
  const [today] = useState(() => dayKey(todayAnchor()));
  const span = new URLSearchParams({ period, anchor: anchor ?? today }).toString();

  const { data } = useSWR<CategoryDetailData>(
    `/api/categories/detail?category=${encodeURIComponent(name)}&${span}&today=${today}`,
    fetcher
  );
  const { data: movements, isLoading: movementsLoading } = useSWR<PaginatedTransactions>(
    `/api/transactions?category=${encodeURIComponent(name)}&type=Gasto&${span}&limit=20&page=1`,
    fetcher
  );

  const periodLabel = data
    ? formatPeriodLabel(
        { kind: data.period, range: { from: new Date(data.from), to: new Date(data.to) }, previous: null, bucket: "day" },
        locale
      )
    : "";
  const trend = data && data.previous > 0 ? Math.round(((data.total - data.previous) / data.previous) * 100) : null;
  const monthLabel = (key: string) =>
    new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" }).format(new Date(`${key}-01T00:00:00Z`)).replace(".", "");
  const active = data?.months.filter((m) => m.amount > 0) ?? [];
  const average = active.length > 1 ? active.reduce((s, m) => s + m.amount, 0) / active.length : 0;

  return (
    <div className="max-w-xl mx-auto px-4 pt-3 pb-6">
      <Link
        href="/analytics"
        className="press inline-flex items-center gap-1 -ml-1 min-h-[36px] pr-2 font-mono text-[10.5px] uppercase tracking-wide text-text-dim hover:text-text"
      >
        <ChevronLeft className="w-4 h-4" aria-hidden />
        {t.nav.analytics}
      </Link>

      {!data ? (
        <ChartSkeleton height="h-80" />
      ) : (
        <div className="flex flex-col gap-3">
          <header className="px-1 pt-1 pb-2">
            <div className="flex items-center gap-2.5">
              <CategoryIcon icon={iconFor(name, "expense")} name={name} color={data.color} size="md" />
              <h1 className="text-[17px] font-semibold text-text">{name}</h1>
            </div>
            <p className="mt-3 text-[34px] font-semibold text-text tabular-nums tracking-[-0.03em] leading-none">
              {formatMXN(data.total)}
            </p>
            <p className="mt-2 flex items-center gap-1.5 text-[12px] text-text-dim">
              {periodLabel}
              {trend !== null && (
                <>
                  <span aria-hidden>·</span>
                  <TrendBadge value={trend} polarity="down-good" />
                  {data.period === "week"
                    ? data.inProgress ? t.analytics.vsSameDayWeek : t.analytics.vsPrevWeek
                    : data.period === "year"
                      ? data.inProgress ? t.analytics.vsSameDayYear : t.analytics.vsPrevYear
                      : data.inProgress ? t.analytics.vsSameDayMonth : t.analytics.vsPrevMonth}
                </>
              )}
            </p>
          </header>

          {data.budget !== null && data.monthProgress !== null && (
            <section className="panel px-4 py-3.5">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-mono text-[10px] font-semibold text-text-dim uppercase tracking-[0.1em]">
                  {t.analytics.budget}
                </h2>
                <span className="text-[12px] text-text-muted tabular-nums">
                  {t.charts.budgetOf(formatMXN(data.total), formatMXN(data.budget))}
                </span>
              </div>
              <div className="relative mt-2.5 h-[8px] rounded-full bg-surface-2">
                <span
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{
                    width: `${Math.min(100, (data.total / data.budget) * 100)}%`,
                    background: data.total > data.budget ? "var(--color-red)" : data.color,
                  }}
                />
                {data.inProgress && (
                  <span
                    aria-hidden
                    className="absolute -top-[3px] -bottom-[3px] w-[2px] -translate-x-1/2 rounded-full bg-text"
                    style={{ left: `${data.monthProgress}%` }}
                  />
                )}
              </div>
              {data.inProgress && (
                <p className="mt-2 text-[11.5px] text-text-dim">{t.charts.budgetsHint(data.monthProgress)}</p>
              )}
            </section>
          )}

          <ChartPanel title={t.categoryDetail.lastSixMonths}>
            <StackedBarChart
              bars={data.months.map((m) => ({
                key: m.month,
                label: monthLabel(m.month),
                total: m.amount,
                segments: [{ value: m.amount, color: data.color }],
              }))}
              reference={average > 0 ? { value: average, label: t.analytics.average } : undefined}
              highlightKey={data.months[data.months.length - 1]?.month ?? null}
            />
          </ChartPanel>

          {data.top.length > 0 && (
            <section className="panel px-4 pt-3.5 pb-1.5">
              <h2 className="font-mono text-[10px] font-semibold text-text-dim uppercase tracking-[0.1em]">
                {t.categoryDetail.topDescriptions}
              </h2>
              <ul className="mt-1">
                {data.top.map((d, i) => (
                  <li key={d.description} className={cn("flex items-center justify-between gap-3 py-2.5", i > 0 && "border-t border-divider")}>
                    <div className="min-w-0">
                      <p className="text-[13.5px] text-text truncate">{d.description}</p>
                      <p className="text-[11.5px] text-text-dim">{t.categoryDetail.timesAmount(d.count, formatMXN(d.amount))}</p>
                    </div>
                    <span
                      className="h-[6px] rounded-full shrink-0"
                      style={{ width: `${Math.max(8, (d.amount / data.top[0].amount) * 72)}px`, background: data.color }}
                      aria-hidden
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <div className="flex items-baseline justify-between px-1 pt-1 pb-2">
              <h2 className="font-mono text-[10px] font-semibold text-text-dim uppercase tracking-[0.1em]">
                {t.categoryDetail.movements}
              </h2>
              <Link
                href={`/wallet?category=${encodeURIComponent(name)}&${span}`}
                className="font-mono text-[10px] font-medium text-accent hover:brightness-125 tracking-wide min-h-[28px] flex items-center"
              >
                {t.categoryDetail.seeAll} →
              </Link>
            </div>
            <div className="panel px-4 pb-2">
              <TransactionList
                data={movements ?? null}
                loading={movementsLoading}
                page={1}
                onPageChange={() => {}}
                paginate={false}
                emptyTitle={t.categoryDetail.noMovements}
                emptyHint=""
              />
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
