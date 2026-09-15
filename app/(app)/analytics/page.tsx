"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { CategoryDetail } from "@/components/dashboard/CategoryDetail";
import { PeriodNav } from "@/components/dashboard/PeriodNav";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ChartSkeleton } from "@/components/ui/Skeleton";
import { formatMXN, cn } from "@/lib/utils";
import { dayKey, formatPeriodLabel, resolvePeriod, type PeriodKind } from "@/services/period";
import { useLocale, useT } from "@/lib/i18n-react";
import type { CategorySummary, CategoryTrend, DashboardData } from "@/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function Analytics() {
  const t = useT();
  const locale = useLocale();
  const [kind, setKind] = useState<PeriodKind>("month");
  const [anchor, setAnchor] = useState(() => new Date());
  // Captured once rather than read during render, which would make the
  // component non-deterministic.
  const [openedAt] = useState(() => Date.now());

  // The breakdown follows the period on screen.
  const { data: dashboard, isLoading } = useSWR<DashboardData>(
    `/api/dashboard?period=${kind}&anchor=${dayKey(anchor)}`,
    fetcher
  );

  // The per-category sparkline is always the last six months, whatever the
  // period is — a trend needs more than one span to be a trend.
  const { data: trendData } =
    useSWR<{ months: string[]; trends: CategoryTrend[] }>("/api/categories/trend?months=6", fetcher);

  const categories = dashboard?.categoryExpenses ?? [];
  // Null means "nothing picked yet" and falls back to the first row, so the
  // default needs no effect to install it.
  const [picked, setPicked] = useState<string | null>(null);
  const selected = picked ?? categories[0]?.category ?? null;
  const selectedTrend = trendData?.trends.find((x) => x.category === selected) ?? null;

  const total = categories.reduce((s, c) => s + c.amount, 0);
  const max = Math.max(...categories.map((c) => c.amount), 1);

  const periodLabel = formatPeriodLabel(resolvePeriod(kind, anchor), locale) ?? t.home.allTime;

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 pt-3 pb-6">
      <PeriodNav
        kind={kind}
        anchor={anchor}
        onKindChange={setKind}
        onAnchorChange={setAnchor}
        now={openedAt}
      />

      {isLoading ? (
        <ChartSkeleton height="h-96" />
      ) : categories.length === 0 ? (
        <div className="panel mt-3">
          <EmptyState title={t.analytics.emptyTitle} description={t.analytics.emptyHint} />
        </div>
      ) : (
        <div className="md:grid md:grid-cols-[1fr_360px] md:gap-10 md:items-start mt-3">
          <div>
            <p className="font-mono text-[10px] font-semibold text-text-dim uppercase tracking-[0.1em] px-1 pb-2">
              {t.analytics.summary(periodLabel, formatMXN(total), categories.length)}
            </p>
            <div className="panel px-4 pb-1">
              {categories.map((c) => (
                <CategoryRow
                  key={c.category}
                  category={c}
                  max={max}
                  active={c.category === selected}
                  onSelect={() => setPicked(c.category)}
                />
              ))}
            </div>
          </div>

          {/* Desktop detail panel */}
          {selectedTrend && (
            <div className="panel hidden md:block sticky top-6 px-5 py-4">
              <CategoryDetail trend={selectedTrend} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CategoryRow({
  category, max, active, onSelect,
}: {
  category: CategorySummary;
  max: number;
  active: boolean;
  onSelect: () => void;
}) {
  const barPct = Math.round((category.amount / max) * 100);

  return (
    <>
      {/* Desktop: select in place */}
      <button
        onClick={onSelect}
        className={cn(
          "hidden md:block w-full text-left py-[11px] border-t border-divider transition-colors duration-150 ease-out",
          active && "bg-surface-2/40"
        )}
      >
        <RowContent category={category} barPct={barPct} />
      </button>

      {/* Mobile: push to detail route */}
      <Link
        href={`/analytics/${encodeURIComponent(category.category)}`}
        className="md:hidden block py-[11px] border-t border-divider active:bg-surface-2/40 transition-colors duration-150 ease-out"
      >
        <RowContent category={category} barPct={barPct} />
      </Link>
    </>
  );
}

function RowContent({ category, barPct }: { category: CategorySummary; barPct: number }) {
  return (
    <>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="flex items-center gap-2 text-[13.5px] text-text min-w-0">
          <span className="w-[7px] h-[7px] rounded-full shrink-0" style={{ backgroundColor: category.color }} />
          <span className="truncate">{category.category}</span>
        </span>
        <span className="font-mono text-[13px] font-semibold text-text whitespace-nowrap shrink-0 ml-2.5">
          {formatMXN(category.amount)}
          <span className="text-text-faint font-normal"> · {Math.round(category.percentage)}%</span>
        </span>
      </div>
      <ProgressBar segments={[{ percent: barPct, color: category.color }]} height={4} />
    </>
  );
}
