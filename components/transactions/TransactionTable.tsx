"use client";

import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { formatMXN, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Transaction, TransactionType, PaginatedTransactions } from "@/types";

interface Props {
  data: PaginatedTransactions | null;
  loading: boolean;
  page: number;
  onPageChange: (page: number) => void;
}

export function TransactionTable({ data, loading, page, onPageChange }: Props) {
  if (loading) {
    return (
      <div className="bg-surface rounded-2xl border border-border shadow-card overflow-hidden">
        <TableSkeleton rows={8} />
      </div>
    );
  }

  if (!data || data.data.length === 0) {
    return (
      <div className="bg-surface rounded-2xl border border-border shadow-card">
        <EmptyState
          icon="📊"
          title="Sin transacciones"
          description="Ajusta los filtros o sincroniza tus datos de Notion"
        />
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-2xl border border-border shadow-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-bg border-b border-border">
              <Th>Fecha</Th>
              <Th>Descripción</Th>
              <Th>Categoría</Th>
              <Th>Cuenta</Th>
              <Th>Tipo</Th>
              <Th right>Monto</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.data.map((tx) => <DesktopRow key={tx.id} tx={tx} />)}
          </tbody>
        </table>
      </div>

      {data.totalPages > 1 && (
        <Pagination page={page} totalPages={data.totalPages} total={data.total} limit={data.limit} onPageChange={onPageChange} />
      )}
    </div>
  );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th className={cn(
      "px-6 py-3.5 text-xs font-semibold text-text-dim uppercase tracking-widest whitespace-nowrap",
      right ? "text-right" : "text-left"
    )}>
      {children}
    </th>
  );
}

function DesktopRow({ tx }: { tx: Transaction }) {
  const isGasto   = tx.type === "Gasto";
  const isIngreso = tx.type === "Ingreso";

  return (
    <tr className="transition-colors duration-150 ease-out hover:bg-surface-2 group">
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="text-xs text-text-dim">{formatDate(tx.date)}</span>
      </td>
      <td className="px-6 py-4 max-w-[220px]">
        <p className="text-sm font-medium text-text truncate">
          {tx.description ?? "—"}
        </p>
        {tx.notes && <p className="text-xs text-text-dim truncate">{tx.notes}</p>}
      </td>
      <td className="px-6 py-4">
        <span className="text-sm text-text-muted">{tx.category ?? <span className="text-border-strong">—</span>}</span>
      </td>
      <td className="px-6 py-4">
        <span className="text-sm text-text-muted">
          {tx.account}
          {tx.toAccount && <span className="text-text-faint"> → {tx.toAccount}</span>}
        </span>
      </td>
      <td className="px-6 py-4">
        <Badge variant={tx.type as TransactionType}>{tx.type}</Badge>
      </td>
      <td className="px-6 py-4 text-right whitespace-nowrap">
        <span className={cn(
          "text-sm font-semibold tabular-nums",
          isGasto   ? "text-red-fg" :
          isIngreso ? "text-green-fg" : "text-amber-fg"
        )}>
          {isGasto ? "−" : isIngreso ? "+" : ""}
          {formatMXN(tx.amount)}
        </span>
      </td>
    </tr>
  );
}

function Pagination({
  page, totalPages, total, limit, onPageChange,
}: { page: number; totalPages: number; total: number; limit: number; onPageChange: (p: number) => void }) {
  const start = (page - 1) * limit + 1;
  const end   = Math.min(page * limit, total);
  const pageCount = Math.min(totalPages, 5);
  const startPage = Math.max(1, Math.min(page - 2, totalPages - pageCount + 1));

  return (
    <div className="flex items-center justify-between px-6 py-3.5 border-t border-border">
      <span className="text-xs text-text-dim">
        {start}–{end} de {total}
      </span>
      <div className="flex items-center gap-1">
        <PagBtn onClick={() => onPageChange(page - 1)} disabled={page <= 1}>‹</PagBtn>
        {Array.from({ length: pageCount }, (_, i) => startPage + i).map((p) => (
          <PagBtn key={p} onClick={() => onPageChange(p)} active={p === page}>{p}</PagBtn>
        ))}
        <PagBtn onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>›</PagBtn>
      </div>
    </div>
  );
}

function PagBtn({
  children, onClick, disabled, active,
}: { children: React.ReactNode; onClick: () => void; disabled?: boolean; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-7 h-7 flex items-center justify-center rounded-lg text-xs font-medium press",
        "transition-[background-color,color,transform] duration-150 ease-out",
        active
          ? "bg-green text-white"
          : "text-text-dim hover:bg-surface-2 hover:text-text-muted",
        disabled && "opacity-30 cursor-not-allowed hover:bg-transparent active:scale-100"
      )}
    >
      {children}
    </button>
  );
}
