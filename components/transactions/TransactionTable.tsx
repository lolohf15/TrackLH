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
      <div className="bg-[#161b22] rounded-2xl border border-[#21262d] shadow-card overflow-hidden">
        <TableSkeleton rows={8} />
      </div>
    );
  }

  if (!data || data.data.length === 0) {
    return (
      <div className="bg-[#161b22] rounded-2xl border border-[#21262d] shadow-card">
        <EmptyState
          icon="📊"
          title="Sin transacciones"
          description="Ajusta los filtros o sincroniza tus datos de Notion"
        />
      </div>
    );
  }

  return (
    <div className="bg-[#161b22] rounded-2xl border border-[#21262d] shadow-card overflow-hidden">
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-[#0d1117] border-b border-[#21262d]">
              <Th>Fecha</Th>
              <Th>Descripción</Th>
              <Th>Categoría</Th>
              <Th>Cuenta</Th>
              <Th>Tipo</Th>
              <Th right>Monto</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#21262d]">
            {data.data.map((tx) => <DesktopRow key={tx.id} tx={tx} />)}
          </tbody>
        </table>
      </div>

      {/* Mobile list */}
      <div className="md:hidden divide-y divide-[#21262d]">
        {data.data.map((tx) => <MobileRow key={tx.id} tx={tx} />)}
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
      "px-6 py-3.5 text-xs font-semibold text-[#8b949e] uppercase tracking-widest whitespace-nowrap",
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
    <tr className="hover:bg-[#1c2128] transition-colors group">
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="text-xs text-[#8b949e]">{formatDate(tx.date)}</span>
      </td>
      <td className="px-6 py-4 max-w-[220px]">
        <p className="text-sm font-medium text-[#e6edf3] truncate">
          {tx.description ?? "—"}
        </p>
        {tx.notes && <p className="text-xs text-[#8b949e] truncate">{tx.notes}</p>}
      </td>
      <td className="px-6 py-4">
        <span className="text-sm text-[#c9d1d9]">{tx.category ?? <span className="text-[#30363d]">—</span>}</span>
      </td>
      <td className="px-6 py-4">
        <span className="text-sm text-[#c9d1d9]">
          {tx.account}
          {tx.toAccount && <span className="text-[#6B7280]"> → {tx.toAccount}</span>}
        </span>
      </td>
      <td className="px-6 py-4">
        <Badge variant={tx.type as TransactionType}>{tx.type}</Badge>
      </td>
      <td className="px-6 py-4 text-right whitespace-nowrap">
        <span className={cn(
          "text-sm font-semibold tabular-nums",
          isGasto   ? "text-[#f85149]" :
          isIngreso ? "text-[#3fb950]" : "text-[#d29922]"
        )}>
          {isGasto ? "−" : isIngreso ? "+" : ""}
          {formatMXN(tx.amount)}
        </span>
      </td>
    </tr>
  );
}

function MobileRow({ tx }: { tx: Transaction }) {
  const isGasto   = tx.type === "Gasto";
  const isIngreso = tx.type === "Ingreso";
  const dotColors = { Gasto: "bg-[#f85149]", Ingreso: "bg-[#3fb950]", Transferencia: "bg-[#d29922]" };

  return (
    <div className="flex items-center justify-between px-4 py-3.5 hover:bg-[#1c2128] transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", dotColors[tx.type as TransactionType])} />
        <div className="min-w-0">
          <p className="text-sm font-medium text-[#e6edf3] truncate">
            {tx.description ?? tx.category ?? "Transacción"}
          </p>
          <p className="text-xs text-[#8b949e]">{formatDate(tx.date)} · {tx.account}</p>
        </div>
      </div>
      <span className={cn(
        "text-sm font-semibold tabular-nums ml-3 shrink-0",
        isGasto   ? "text-[#f85149]" :
        isIngreso ? "text-[#3fb950]" : "text-[#d29922]"
      )}>
        {isGasto ? "−" : isIngreso ? "+" : ""}
        {formatMXN(tx.amount)}
      </span>
    </div>
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
    <div className="flex items-center justify-between px-6 py-3.5 border-t border-[#21262d]">
      <span className="text-xs text-[#8b949e]">
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
        "w-7 h-7 flex items-center justify-center rounded-lg text-xs font-medium transition-all duration-150",
        active
          ? "bg-[#238636] text-white"
          : "text-[#8b949e] hover:bg-[#21262d] hover:text-[#c9d1d9]",
        disabled && "opacity-30 cursor-not-allowed hover:bg-transparent"
      )}
    >
      {children}
    </button>
  );
}
