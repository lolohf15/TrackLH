"use client";

import Link from "next/link";
import { BarChart } from "@/components/ui/BarChart";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { formatMXN, formatMonth, cn } from "@/lib/utils";
import type { CategoryTrend } from "@/types";

export function CategoryDetail({ trend }: { trend: CategoryTrend }) {
  const isOver = trend.budget > 0 && trend.currentAmount >= trend.budget;
  const isWarning = trend.budget > 0 && trend.currentAmount / trend.budget >= 0.9;
  const pct = trend.budget > 0 ? Math.min((trend.currentAmount / trend.budget) * 100, 100) : 0;

  const barColor = isOver ? "var(--color-red)" : isWarning ? "var(--color-amber)" : trend.color;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: trend.color }} />
          <h2 className="text-base font-semibold text-text">{trend.category}</h2>
        </div>
        <Link
          href={`/movimientos?category=${encodeURIComponent(trend.category)}`}
          className="press rounded-full font-mono text-[10.5px] font-medium border border-border px-3.5 py-2 text-text-muted hover:text-text hover:border-border-strong transition-colors duration-150 ease-out shrink-0 uppercase tracking-wide"
        >
          Ver movimientos →
        </Link>
      </div>

      <div>
        <p className="font-mono text-[28px] font-semibold text-text leading-none">{formatMXN(trend.currentAmount)}</p>
        <p className="text-xs text-text-dim mt-1.5">este mes</p>
      </div>

      {trend.budget > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-dim">Presupuesto</span>
            <span className={cn("font-mono", isOver ? "text-red-fg" : isWarning ? "text-amber-fg" : "text-text-muted")}>
              {formatMXN(trend.currentAmount)} / {formatMXN(trend.budget)}
            </span>
          </div>
          <ProgressBar segments={[{ percent: pct, color: barColor }]} />
        </div>
      )}

      <div>
        <p className="font-mono text-[10px] font-semibold text-text-dim uppercase tracking-[0.1em] mb-3">Tendencia mensual</p>
        <BarChart
          bars={trend.points.map((p, i) => ({
            label: formatMonth(p.month).split(" ")[0].slice(0, 3),
            value: p.amount,
            highlight: i === trend.points.length - 1,
          }))}
          color={trend.color}
        />
      </div>
    </div>
  );
}
