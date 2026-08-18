"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Sparkline } from "@/components/dashboard/Sparkline";
import { CategoryDetail } from "@/components/dashboard/CategoryDetail";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ChartSkeleton } from "@/components/ui/Skeleton";
import { formatMXN, cn } from "@/lib/utils";
import type { CategoryTrend } from "@/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function Categorias() {
  const { data, isLoading } =
    useSWR<{ months: string[]; trends: CategoryTrend[] }>("/api/categories/trend?months=6", fetcher);

  const trends = data?.trends ?? [];
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (!selected && trends.length > 0) setSelected(trends[0].category);
  }, [trends, selected]);

  const selectedTrend = trends.find((t) => t.category === selected) ?? null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-6 space-y-4">
      <h1 className="text-lg font-semibold text-text">Categorías</h1>

      {isLoading ? (
        <ChartSkeleton height="h-96" />
      ) : trends.length === 0 ? (
        <Card>
          <EmptyState title="Sin categorías" description="Sincroniza tus transacciones para ver el desglose" />
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4 items-start">
          {/* List */}
          <div className="bg-surface rounded-2xl border border-border shadow-card divide-y divide-border overflow-hidden">
            {trends.map((t) => (
              <CategoryRow
                key={t.category}
                trend={t}
                active={t.category === selected}
                onSelect={() => setSelected(t.category)}
              />
            ))}
          </div>

          {/* Desktop detail panel */}
          {selectedTrend && (
            <Card className="hidden lg:block sticky top-20">
              <div className="p-6">
                <CategoryDetail trend={selectedTrend} />
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function CategoryRow({
  trend, active, onSelect,
}: { trend: CategoryTrend; active: boolean; onSelect: () => void }) {
  const values = trend.points.map((p) => p.amount);

  return (
    <>
      {/* Desktop: select in place */}
      <button
        onClick={onSelect}
        className={cn(
          "hidden lg:flex w-full items-center justify-between px-4 py-3.5 text-left transition-colors duration-150 ease-out",
          active ? "bg-surface-2" : "hover:bg-surface-2/60"
        )}
      >
        <RowContent trend={trend} values={values} />
      </button>

      {/* Mobile: push to detail route */}
      <Link
        href={`/categorias/${encodeURIComponent(trend.category)}`}
        className="lg:hidden flex items-center justify-between px-4 py-3.5 active:bg-surface-2 transition-colors duration-150 ease-out"
      >
        <RowContent trend={trend} values={values} />
      </Link>
    </>
  );
}

function RowContent({ trend, values }: { trend: CategoryTrend; values: number[] }) {
  return (
    <>
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: trend.color }} />
        <div className="min-w-0">
          <p className="text-sm font-medium text-text truncate">{trend.category}</p>
          <p className="text-xs text-text-dim tabular-nums">{formatMXN(trend.currentAmount)}</p>
        </div>
      </div>
      <Sparkline values={values} color={trend.color} />
    </>
  );
}
