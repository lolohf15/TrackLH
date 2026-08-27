"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { TransactionSheet } from "./TransactionSheet";
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
  const [editing, setEditing] = useState<Transaction | null>(null);

  if (loading) {
    return <TableSkeleton rows={8} />;
  }

  if (!data || data.data.length === 0) {
    return <EmptyState icon="—" title="Sin transacciones" description="Ajusta los filtros para ver otros movimientos" />;
  }

  return (
    <div>
      <TransactionSheet
        key={editing?.id ?? "none"}
        transaction={editing}
        open={editing !== null}
        onClose={() => setEditing(null)}
      />

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <Th>Fecha</Th>
              <Th>Descripción</Th>
              <Th>Categoría</Th>
              <Th>Cuenta</Th>
              <Th>Tipo</Th>
              <Th right>Monto</Th>
            </tr>
          </thead>
          <tbody>
            {data.data.map((tx) => (
              <DesktopRow key={tx.id} tx={tx} onEdit={() => setEditing(tx)} />
            ))}
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
      "px-4 py-3 font-mono text-[10px] font-semibold text-text-dim uppercase tracking-[0.1em] whitespace-nowrap",
      right ? "text-right" : "text-left"
    )}>
      {children}
    </th>
  );
}

function DesktopRow({ tx, onEdit }: { tx: Transaction; onEdit: () => void }) {
  const type = tx.type as TransactionType;

  return (
    <tr
      onClick={onEdit}
      className="cursor-pointer border-t border-divider transition-colors duration-150 ease-out hover:bg-surface-2/50">
      <td className="px-4 py-3 whitespace-nowrap">
        <span className="font-mono text-xs text-text-dim">{formatDate(tx.date)}</span>
      </td>
      <td className="px-4 py-3 max-w-[220px]">
        <p className="text-sm text-text truncate">{tx.description ?? "—"}</p>
        {tx.notes && <p className="text-xs text-text-dim truncate mt-0.5">{tx.notes}</p>}
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-text-muted">{tx.category ?? <span className="text-text-faint">—</span>}</span>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-text-muted">
          {tx.account}
          {tx.toAccount && <span className="text-text-faint"> → {tx.toAccount}</span>}
        </span>
      </td>
      <td className="px-4 py-3">
        <Badge variant={type}>{tx.type}</Badge>
      </td>
      <td className="px-4 py-3 text-right whitespace-nowrap">
        <span className={cn(
          "font-mono text-sm font-semibold",
          type === "Gasto" ? "text-red-fg" : type === "Ingreso" ? "text-green-fg" : "text-amber-fg"
        )}>
          {type === "Gasto" ? "−" : type === "Ingreso" ? "+" : ""}
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
    <div className="flex items-center justify-between px-4 py-3 border-t border-border">
      <span className="font-mono text-[10.5px] text-text-dim">
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
        "w-7 h-7 flex items-center justify-center font-mono text-xs font-medium press border",
        "transition-colors duration-150 ease-out",
        active
          ? "border-accent text-accent"
          : "border-transparent text-text-dim hover:text-text-muted",
        disabled && "opacity-30 cursor-not-allowed hover:text-text-dim active:scale-100"
      )}
    >
      {children}
    </button>
  );
}
