"use client";

import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatMXN } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { BudgetItem } from "@/types";

export function BudgetTracker({ data, bare = false }: { data: BudgetItem[]; bare?: boolean }) {
  const totalSpent  = data.reduce((s, b) => s + b.spent, 0);
  const totalBudget = data.reduce((s, b) => s + b.budget, 0);
  const totalPct    = totalBudget > 0 ? Math.min(Math.round((totalSpent / totalBudget) * 100), 100) : 0;
  const isOver      = totalPct >= 100;
  const isNear      = totalPct >= 90;

  const body = data.length === 0 ? (
    <EmptyState
      title="Sin presupuestos"
      description="Los presupuestos se cargan automáticamente"
    />
  ) : (
    <>
      <div className="space-y-4">
        {data.map((item, i) => <BudgetRow key={item.category} item={item} index={i} />)}
      </div>

      <div className="mt-5 pt-4 border-t border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-widest">Total</span>
          <div className="flex items-center gap-1.5 tabular-nums">
            <span className={cn(
              "text-sm font-semibold",
              isOver ? "text-red-fg" : isNear ? "text-amber-fg" : "text-text"
            )}>
              {formatMXN(totalSpent)}
            </span>
            <span className="text-text-faint text-xs">/ {formatMXN(totalBudget)}</span>
          </div>
        </div>
        <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full origin-left transition-transform duration-500 ease-out",
              isOver ? "bg-red-fg" : isNear ? "bg-amber-fg" : "bg-green-fg"
            )}
            style={{ transform: `scaleX(${totalPct / 100})` }}
          />
        </div>
        <p className="mt-1.5 text-xs text-text-dim">
          {isOver
            ? `${formatMXN(totalSpent - totalBudget)} sobre el presupuesto total`
            : `${formatMXN(totalBudget - totalSpent)} disponible`}
        </p>
      </div>
    </>
  );

  if (bare) return body;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle>Presupuesto mensual</CardTitle>
        {data.length > 0 && (
          <span className={cn(
            "text-xs font-semibold tabular-nums",
            isOver ? "text-red-fg" : isNear ? "text-amber-fg" : "text-green-fg"
          )}>
            {totalPct}% usado
          </span>
        )}
      </CardHeader>
      <CardContent className="pt-0">{body}</CardContent>
    </Card>
  );
}

function BudgetRow({ item, index }: { item: import("@/types").BudgetItem; index: number }) {
  const isOver    = item.percentage >= 100;
  const isWarning = item.percentage >= 90;

  const barColor = isOver
    ? "bg-red-fg"
    : isWarning
    ? "bg-amber-fg"
    : "bg-green-fg";

  const valueColor = isOver
    ? "text-red-fg"
    : isWarning
    ? "text-amber-fg"
    : "text-text";

  return (
    <div
      className="space-y-1.5 animate-fade-in-up"
      style={{ animationDelay: `${Math.min(index, 6) * 40}ms` }}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm text-text-muted">{item.category}</span>
        <div className="flex items-center gap-1.5 tabular-nums">
          <span className={cn("text-sm font-semibold", valueColor)}>
            {formatMXN(item.spent)}
          </span>
          <span className="text-text-faint text-xs">/ {formatMXN(item.budget)}</span>
        </div>
      </div>
      <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full origin-left transition-transform duration-500 ease-out", barColor)}
          style={{ transform: `scaleX(${Math.min(item.percentage, 100) / 100})` }}
        />
      </div>
      <p className="text-xs text-text-dim">
        {isOver
          ? `${formatMXN(Math.abs(item.remaining))} sobre el límite`
          : `${formatMXN(item.remaining)} disponible`}
      </p>
    </div>
  );
}
