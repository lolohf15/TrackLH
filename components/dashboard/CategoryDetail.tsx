"use client";

import Link from "next/link";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { formatMXN, formatMonth, cn } from "@/lib/utils";
import type { CategoryTrend } from "@/types";

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { month: string; amount: number } }> }) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="bg-surface border border-border-strong rounded-xl shadow-card-hover px-4 py-2.5 text-sm">
      <p className="font-medium text-text">{formatMonth(item.month)}</p>
      <p className="text-text-muted tabular-nums text-xs mt-0.5">{formatMXN(item.amount)}</p>
    </div>
  );
}

export function CategoryDetail({ trend }: { trend: CategoryTrend }) {
  const isOver = trend.budget > 0 && trend.currentAmount >= trend.budget;
  const isWarning = trend.budget > 0 && trend.currentAmount / trend.budget >= 0.9;
  const pct = trend.budget > 0 ? Math.min((trend.currentAmount / trend.budget) * 100, 100) : 0;

  const barColor = isOver ? "bg-red" : isWarning ? "bg-amber-fg" : "bg-green";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: trend.color }} />
          <h2 className="text-lg font-semibold text-text">{trend.category}</h2>
        </div>
        <Link
          href={`/movimientos?category=${encodeURIComponent(trend.category)}`}
          className="press text-xs font-medium bg-surface-2 border border-border rounded-xl px-3 py-1.5 text-text-muted hover:text-text hover:border-border-strong transition-[background-color,border-color,color,transform] duration-150 ease-out shrink-0"
        >
          Ver movimientos →
        </Link>
      </div>

      <div>
        <p className="text-3xl font-semibold tabular-nums text-text">{formatMXN(trend.currentAmount)}</p>
        <p className="text-xs text-text-dim mt-1">este mes</p>
      </div>

      {trend.budget > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-dim">Presupuesto</span>
            <span className={cn("font-medium tabular-nums", isOver ? "text-red-fg" : isWarning ? "text-amber-fg" : "text-text-muted")}>
              {formatMXN(trend.currentAmount)} / {formatMXN(trend.budget)}
            </span>
          </div>
          <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full origin-left transition-transform duration-500 ease-out", barColor)}
              style={{ transform: `scaleX(${pct / 100})` }}
            />
          </div>
        </div>
      )}

      <div>
        <p className="text-xs font-semibold text-text-dim uppercase tracking-widest mb-3">Tendencia mensual</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={trend.points} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
            <XAxis
              dataKey="month"
              tickFormatter={(m) => formatMonth(m).split(" ")[0].slice(0, 3)}
              tick={{ fontSize: 11, fill: "#737373" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
            <Bar dataKey="amount" radius={[4, 4, 0, 0]} maxBarSize={28}>
              {trend.points.map((p, i) => (
                <Cell key={i} fill={i === trend.points.length - 1 ? trend.color : "#262626"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
