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

const amountColors: Record<TransactionType, string> = {
  Gasto: "text-red-fg",
  Ingreso: "text-green-fg",
  Transferencia: "text-amber-fg",
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
    return <TableSkeleton rows={6} />;
  }

  if (!data || data.data.length === 0) {
    return <EmptyState icon="—" title="Sin transacciones" description="Ajusta los filtros para ver otros movimientos" />;
  }

  const groups: Array<{ label: string; items: Transaction[] }> = [];
  for (const tx of data.data) {
    const label = dayLabel(tx.date);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(tx);
    else groups.push({ label, items: [tx] });
  }

  return (
    <div>
      {groups.map((group) => (
        <div key={group.label}>
          <p className="font-mono text-[9px] font-semibold text-text-faint uppercase tracking-[0.1em] pt-3.5 pb-1">
            {group.label}
          </p>
          {group.items.map((tx) => <Row key={tx.id} tx={tx} />)}
        </div>
      ))}

      {data.totalPages > 1 && (
        <div className="flex items-center justify-between pt-3">
          <span className="font-mono text-[10.5px] text-text-dim">
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
  const type = tx.type as TransactionType;

  return (
    <div className="flex items-center justify-between py-[11px] border-t border-divider">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className={cn("w-[5px] h-[5px] rounded-full shrink-0", dotColors[type])} />
        <div className="min-w-0">
          <p className="text-[13px] text-text truncate">
            {tx.description ?? tx.category ?? "Transacción"}
          </p>
          <p className="font-mono text-[10.5px] text-text-dim mt-0.5">{tx.category ?? tx.type} · {tx.account}</p>
        </div>
      </div>
      <span className={cn("font-mono text-[13px] font-semibold ml-2.5 shrink-0", amountColors[type])}>
        {type === "Gasto" ? "−" : type === "Ingreso" ? "+" : ""}
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
        "font-mono text-[10.5px] font-medium px-2.5 py-1.5 press",
        "transition-colors duration-150 ease-out",
        "text-text-dim hover:text-text-muted",
        disabled && "opacity-30 cursor-not-allowed active:scale-100"
      )}
    >
      {children}
    </button>
  );
}
