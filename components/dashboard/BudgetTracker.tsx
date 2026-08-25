"use client";

import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatMXN } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { CATEGORY_COLORS, BUDGET_COLOR_OVERRIDES } from "@/types";
import type { BudgetItem } from "@/types";

function rowColor(item: BudgetItem): string {
  if (item.percentage >= 100) return "#e5484d";
  if (item.percentage >= 90) return "#d99a15";
  return BUDGET_COLOR_OVERRIDES[item.category] ?? CATEGORY_COLORS[item.category] ?? "#6b7075";
}

export function BudgetTracker({ data, bare = false }: { data: BudgetItem[]; bare?: boolean }) {
  const totalSpent  = data.reduce((s, b) => s + b.spent, 0);
  const totalBudget = data.reduce((s, b) => s + b.budget, 0);
  const totalPct    = totalBudget > 0 ? Math.min(Math.round((totalSpent / totalBudget) * 100), 100) : 0;
  const isOver      = totalPct >= 100;
  const isNear      = totalPct >= 90;
  const totalColor  = isOver ? "text-red-fg" : isNear ? "text-amber-fg" : "text-text";

  const body = data.length === 0 ? (
    <EmptyState
      title="Sin presupuestos"
      description="Los presupuestos se cargan automáticamente"
    />
  ) : (
    <>
      <div className="flex flex-col gap-3">
        {data.map((item) => <BudgetRow key={item.category} item={item} />)}
      </div>

      <div className="mt-4 pt-3 border-t border-divider flex items-baseline justify-between">
        <span className="font-mono text-[10px] font-semibold text-text-dim uppercase tracking-[0.1em]">Total</span>
        <span className="font-mono text-[13px]">
          <span className={cn("font-semibold", totalColor)}>{formatMXN(totalSpent)}</span>
          <span className="text-text-faint"> / {formatMXN(totalBudget)}</span>
        </span>
      </div>
    </>
  );

  if (bare) return body;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3.5">
        <CardTitle>Presupuesto mensual</CardTitle>
        {data.length > 0 && (
          <span className={cn("font-mono text-[11px] font-semibold", totalColor)}>
            {totalPct}%
          </span>
        )}
      </CardHeader>
      <CardContent className="pt-0">{body}</CardContent>
    </Card>
  );
}

function BudgetRow({ item }: { item: BudgetItem }) {
  const color = rowColor(item);
  const valueColor = item.percentage >= 100 ? "text-red-fg" : item.percentage >= 90 ? "text-amber-fg" : "text-text";

  return (
    <div>
      <div className="flex items-baseline justify-between mb-[5px]">
        <span className="text-[13px] text-text-muted">{item.category}</span>
        <span className="font-mono text-xs">
          <span className={cn("font-semibold", valueColor)}>{formatMXN(item.spent)}</span>
          <span className="text-text-faint"> / {formatMXN(item.budget)}</span>
        </span>
      </div>
      <div className="h-[3px] w-full rounded-full bg-surface-2 overflow-hidden">
        <div className="h-full" style={{ width: `${Math.min(item.percentage, 100)}%`, background: color }} />
      </div>
    </div>
  );
}
