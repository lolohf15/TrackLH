import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatMXN } from "@/lib/utils";
import type { CategorySummary } from "@/types";

interface Props { data: CategorySummary[]; limit?: number }

/** Ranked ledger table: rank + name + inline bar + amount. No charting library. */
export function CategoryRanking({ data, limit = 10 }: Props) {
  const top = data.slice(0, limit);
  const max = Math.max(...top.map((c) => c.amount), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gasto por categoría</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {top.length === 0 ? (
          <EmptyState
            title="Sin gastos este mes"
            description="Sincroniza tus transacciones para ver el análisis por categoría"
          />
        ) : (
          <div className="flex flex-col">
            {top.map((c, i) => (
              <div key={c.category} className="flex items-center gap-2.5 py-[7px]">
                <span className="font-mono text-[11px] text-text-faint w-3.5 shrink-0">{i + 1}</span>
                <span className="text-[13px] text-text-muted w-[100px] shrink-0 truncate">{c.category}</span>
                <div className="flex-1 h-3 rounded-sm bg-surface-2 overflow-hidden">
                  <div className="h-full" style={{ background: c.color, width: `${Math.round((c.amount / max) * 100)}%` }} />
                </div>
                <span className="font-mono text-xs text-text-muted w-16 text-right shrink-0">
                  {formatMXN(c.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
