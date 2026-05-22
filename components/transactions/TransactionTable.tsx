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
      <div className="bg-white rounded-2xl border border-[#E5DED2] shadow-card overflow-hidden">
        <TableSkeleton rows={8} />
      </div>
    );
  }

  if (!data || data.data.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#E5DED2] shadow-card">
        <EmptyState
          icon="📊"
          title="Sin transacciones"
          description="Ajusta los filtros o sincroniza tus datos de Notion"
        />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E5DED2] shadow-card overflow-hidden">
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-[#FDFAF7] border-b border-[#E5DED2]">
              <Th>Fecha</Th>
              <Th>Descripción</Th>
              <Th>Categoría</Th>
              <Th>Cuenta</Th>
              <Th>Tipo</Th>
              <Th right>Monto</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5DED2]">
            {data.data.map((tx) => <DesktopRow key={tx.id} tx={tx} />)}
          </tbody>
        </table>
      </div>

      {/* Mobile list */}
      <div className="md:hidden divide-y divide-[#E5DED2]">
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
      "px-6 py-3.5 text-xs font-semibold text-[#6B7280] uppercase tracking-widest whitespace-nowrap",
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
    <tr className="hover:bg-[#FDFAF7] transition-colors group">
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="text-xs text-[#6B7280]">{formatDate(tx.date)}</span>
      </td>
      <td className="px-6 py-4 max-w-[220px]">
        <p className="text-sm font-medium text-[#111827] truncate">
          {tx.description ?? "—"}
        </p>
        {tx.notes && <p className="text-xs text-[#6B7280] truncate">{tx.notes}</p>}
      </td>
      <td className="px-6 py-4">
        <span className="text-sm text-[#4B5563]">{tx.category ?? <span className="text-[#D4CCBE]">—</span>}</span>
      </td>
      <td className="px-6 py-4">
        <span className="text-sm text-[#4B5563]">
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
          isGasto   ? "text-[#C0392B]" :
          isIngreso ? "text-[#16A34A]" : "text-[#C6A15B]"
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
  const dotColors = { Gasto: "bg-[#C0392B]", Ingreso: "bg-[#16A34A]", Transferencia: "bg-[#C6A15B]" };

  return (
    <div className="flex items-center justify-between px-4 py-3.5 hover:bg-[#FDFAF7] transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", dotColors[tx.type as TransactionType])} />
        <div className="min-w-0">
          <p className="text-sm font-medium text-[#111827] truncate">
            {tx.description ?? tx.category ?? "Transacción"}
          </p>
          <p className="text-xs text-[#6B7280]">{formatDate(tx.date)} · {tx.account}</p>
        </div>
      </div>
      <span className={cn(
        "text-sm font-semibold tabular-nums ml-3 shrink-0",
        isGasto   ? "text-[#C0392B]" :
        isIngreso ? "text-[#16A34A]" : "text-[#C6A15B]"
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
    <div className="flex items-center justify-between px-6 py-3.5 border-t border-[#E5DED2]">
      <span className="text-xs text-[#6B7280]">
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
          ? "bg-[#C6A15B] text-white"
          : "text-[#6B7280] hover:bg-[#F8F5F0] hover:text-[#4B5563]",
        disabled && "opacity-30 cursor-not-allowed hover:bg-transparent"
      )}
    >
      {children}
    </button>
  );
}
