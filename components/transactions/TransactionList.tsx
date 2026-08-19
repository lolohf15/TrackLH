"use client";

import { EmptyState } from "@/components/ui/EmptyState";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { formatMXN } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Transaction, TransactionType, PaginatedTransactions } from "@/types";

interface Props {
  data: PaginatedTransactions | null;
  loading: boolean;
  page: number;
  onPageChange: (page: number) => void;
}

const dotColors: Record<TransactionType, string> = {
  Gasto: "bg-red-fg",
  Ingreso: "bg-green-fg",
  Transferencia: "bg-amber-fg",
};

function dayLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a: Date, b: Date) =>
    a.getUTCFullYear() === b.getFullYear() &&
    a.getUTCMonth() === b.getMonth() &&
    a.getUTCDate() === b.getDate();

  if (sameDay(d, today)) return "Hoy";
  if (sameDay(d, yesterday)) return "Ayer";

  return new Intl.DateTimeFormat("es-MX", {
    weekday: "long", day: "numeric", month: "short", timeZone: "UTC",
  }).format(d).replace(/^\w/, (c) => c.toUpperCase());
}

export function TransactionList({ data, loading, page, onPageChange }: Props) {
  if (loading) {
    return (
      <div className="bg-surface rounded-2xl border border-border shadow-card overflow-hidden">
        <TableSkeleton rows={6} />
      </div>
    );
  }

  if (!data || data.data.length === 0) {
    return (
      <div className="bg-surface rounded-2xl border border-border shadow-card">
        <EmptyState
          icon="📊"
          title="Sin transacciones"
          description="Ajusta los filtros para ver otros movimientos"
        />
      </div>
    );
  }

  const groups: Array<{ label: string; items: Transaction[] }> = [];
  for (const tx of data.data) {
    const label = dayLabel(tx.date);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(tx);
    else groups.push({ label, items: [tx] });
  }

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="text-xs font-semibold text-text-dim uppercase tracking-widest px-1 mb-2">
            {group.label}
          </p>
          <div className="bg-surface rounded-2xl border border-border shadow-card divide-y divide-border overflow-hidden">
            {group.items.map((tx) => <Row key={tx.id} tx={tx} />)}
          </div>
        </div>
      ))}

      {data.totalPages > 1 && (
        <div className="flex items-center justify-between px-1 pt-1">
          <span className="text-xs text-text-dim">
            Página {page} de {data.totalPages}
          </span>
          <div className="flex items-center gap-2">
            <PagBtn onClick={() => onPageChange(page - 1)} disabled={page <= 1}>‹ Anterior</PagBtn>
            <PagBtn onClick={() => onPageChange(page + 1)} disabled={page >= data.totalPages}>Siguiente ›</PagBtn>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ tx }: { tx: Transaction }) {
  const isGasto   = tx.type === "Gasto";
  const isIngreso = tx.type === "Ingreso";

  return (
    <div className="flex items-center justify-between px-4 py-3.5 active:bg-surface-2 transition-colors duration-150 ease-out">
      <div className="flex items-center gap-3 min-w-0">
        <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", dotColors[tx.type as TransactionType])} />
        <div className="min-w-0">
          <p className="text-sm font-medium text-text truncate">
            {tx.description ?? tx.category ?? "Transacción"}
          </p>
          <p className="text-xs text-text-dim">{tx.category ?? tx.type} · {tx.account}</p>
        </div>
      </div>
      <span className={cn(
        "text-sm font-semibold tabular-nums ml-3 shrink-0",
        isGasto   ? "text-red-fg" :
        isIngreso ? "text-green-fg" : "text-amber-fg"
      )}>
        {isGasto ? "−" : isIngreso ? "+" : ""}
        {formatMXN(tx.amount)}
      </span>
    </div>
  );
}

function PagBtn({
  children, onClick, disabled,
}: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "text-xs font-medium px-3 py-1.5 rounded-lg press",
        "transition-[background-color,color,transform] duration-150 ease-out",
        "text-text-dim hover:bg-surface-2 hover:text-text-muted",
        disabled && "opacity-30 cursor-not-allowed active:scale-100"
      )}
    >
      {children}
    </button>
  );
}
