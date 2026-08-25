"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { CategoryDetail } from "@/components/dashboard/CategoryDetail";
import { EmptyState } from "@/components/ui/EmptyState";
import { ChartSkeleton } from "@/components/ui/Skeleton";
import { formatMXN, formatMonth, getCurrentMonth, cn } from "@/lib/utils";
import type { CategoryTrend } from "@/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function Categorias() {
  const { data, isLoading } =
    useSWR<{ months: string[]; trends: CategoryTrend[] }>("/api/categories/trend?months=6", fetcher);

  const trends = data?.trends ?? [];
  // Null means "nothing picked yet" and falls back to the first row, so the
  // default needs no effect to install it.
  const [picked, setPicked] = useState<string | null>(null);
  const selected = picked ?? trends[0]?.category ?? null;

  const selectedTrend = trends.find((t) => t.category === selected) ?? null;
  const total = trends.reduce((s, t) => s + t.currentAmount, 0);
  const max = Math.max(...trends.map((t) => t.currentAmount), 1);

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 pt-4 pb-6">
      <h1 className="text-[15px] font-semibold text-text mb-4">Categorías</h1>

      {isLoading ? (
        <ChartSkeleton height="h-96" />
      ) : trends.length === 0 ? (
        <EmptyState title="Sin categorías" description="Sincroniza tus transacciones para ver el desglose" />
      ) : (
        <div className="md:grid md:grid-cols-[1fr_360px] md:gap-10 md:items-start">
          <div>
            <p className="font-mono text-[10px] font-semibold text-text-dim uppercase tracking-[0.1em] px-1 pb-2">
              {formatMonth(getCurrentMonth())} · {formatMXN(total)} en {trends.length} categorías
            </p>
            <div className="panel px-4 pb-1">
              {trends.map((t) => (
                <CategoryRow
                  key={t.category}
                  trend={t}
                  max={max}
                  total={total}
                  active={t.category === selected}
                  onSelect={() => setPicked(t.category)}
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
  trend, max, total, active, onSelect,
}: { trend: CategoryTrend; max: number; total: number; active: boolean; onSelect: () => void }) {
  const pct = total > 0 ? Math.round((trend.currentAmount / total) * 100) : 0;
  const barPct = Math.round((trend.currentAmount / max) * 100);

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
        <RowContent trend={trend} pct={pct} barPct={barPct} />
      </button>

      {/* Mobile: push to detail route */}
      <Link
        href={`/categorias/${encodeURIComponent(trend.category)}`}
        className="md:hidden block py-[11px] border-t border-divider active:bg-surface-2/40 transition-colors duration-150 ease-out"
      >
        <RowContent trend={trend} pct={pct} barPct={barPct} />
      </Link>
    </>
  );
}

function RowContent({ trend, pct, barPct }: { trend: CategoryTrend; pct: number; barPct: number }) {
  return (
    <>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="flex items-center gap-2 text-[13.5px] text-text min-w-0">
          <span className="w-[7px] h-[7px] rounded-full shrink-0" style={{ backgroundColor: trend.color }} />
          <span className="truncate">{trend.category}</span>
        </span>
        <span className="font-mono text-[13px] font-semibold text-text whitespace-nowrap shrink-0 ml-2.5">
          {formatMXN(trend.currentAmount)}
          <span className="text-text-faint font-normal"> · {pct}%</span>
        </span>
      </div>
      <div className="h-1 w-full rounded-full bg-surface-2 overflow-hidden">
        <div className="h-full" style={{ width: `${barPct}%`, background: trend.color }} />
      </div>
    </>
  );
}
