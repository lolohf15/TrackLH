"use client";

import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatMXN } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { BudgetItem } from "@/types";

export function BudgetTracker({ data }: { data: BudgetItem[] }) {
  const totalSpent  = data.reduce((s, b) => s + b.spent, 0);
  const totalBudget = data.reduce((s, b) => s + b.budget, 0);
  const totalPct    = totalBudget > 0 ? Math.min(Math.round((totalSpent / totalBudget) * 100), 100) : 0;
  const isOver      = totalPct >= 100;
  const isNear      = totalPct >= 90;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle>Presupuesto mensual</CardTitle>
        {data.length > 0 && (
          <span className={cn(
            "text-xs font-semibold tabular-nums",
            isOver ? "text-[#f85149]" : isNear ? "text-[#d29922]" : "text-[#3fb950]"
          )}>
            {totalPct}% usado
          </span>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        {data.length === 0 ? (
          <EmptyState
            title="Sin presupuestos"
            description="Los presupuestos se cargan automáticamente"
          />
        ) : (
          <>
            <div className="space-y-4">
              {data.map((item) => <BudgetRow key={item.category} item={item} />)}
            </div>

            {/* Total footer */}
            <div className="mt-5 pt-4 border-t border-[#21262d]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[#c9d1d9] uppercase tracking-widest">Total</span>
                <div className="flex items-center gap-1.5 tabular-nums">
                  <span className={cn(
                    "text-sm font-semibold",
                    isOver ? "text-[#f85149]" : isNear ? "text-[#d29922]" : "text-[#e6edf3]"
                  )}>
                    {formatMXN(totalSpent)}
                  </span>
                  <span className="text-[#6B7280] text-xs">/ {formatMXN(totalBudget)}</span>
                </div>
              </div>
              <div className="h-2 bg-[#21262d] rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-700",
                    isOver ? "bg-[#f85149]" : isNear ? "bg-[#d29922]" : "bg-[#238636]"
                  )}
                  style={{ width: `${totalPct}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs text-[#8b949e]">
                {isOver
                  ? `${formatMXN(totalSpent - totalBudget)} sobre el presupuesto total`
                  : `${formatMXN(totalBudget - totalSpent)} disponible`}
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function BudgetRow({ item }: { item: BudgetItem }) {
  const isOver    = item.percentage >= 100;
  const isWarning = item.percentage >= 90;

  const barColor = isOver
    ? "bg-[#f85149]"
    : isWarning
    ? "bg-[#d29922]"
    : "bg-[#238636]";

  const valueColor = isOver
    ? "text-[#f85149]"
    : isWarning
    ? "text-[#d29922]"
    : "text-[#e6edf3]";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-[#c9d1d9]">{item.category}</span>
        <div className="flex items-center gap-1.5 tabular-nums">
          <span className={cn("text-sm font-semibold", valueColor)}>
            {formatMXN(item.spent)}
          </span>
          <span className="text-[#6B7280] text-xs">/ {formatMXN(item.budget)}</span>
        </div>
      </div>
      <div className="h-1.5 bg-[#21262d] rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-700", barColor)}
          style={{ width: `${Math.min(item.percentage, 100)}%` }}
        />
      </div>
      <p className="text-xs text-[#8b949e]">
        {isOver
          ? `${formatMXN(Math.abs(item.remaining))} sobre el límite`
          : `${formatMXN(item.remaining)} disponible`}
      </p>
    </div>
  );
}
