"use client";

import { useEffect, useState } from "react";
import { animate, motion, useMotionValue, useReducedMotion, type PanInfo } from "framer-motion";
import { EmptyState } from "@/components/ui/EmptyState";
import { TransactionSheet } from "./TransactionSheet";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { PencilIcon, TrashIcon } from "@/components/shell/icons";
import { formatMXN } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Transaction, TransactionType, PaginatedTransactions } from "@/types";

interface Props {
  data: PaginatedTransactions | null;
  loading: boolean;
  page: number;
  onPageChange: (page: number) => void;
  /** Shown when there is nothing to list. Defaults to the filtered-view copy. */
  emptyTitle?: string;
  emptyHint?: string;
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

/** Revealed by a left swipe — width of the Editar + Eliminar action pair. */
const ACTION_WIDTH = 144;
/** Past this drag distance (projected forward by velocity) the row snaps open. */
const OPEN_THRESHOLD = 56;
const VELOCITY_PROJECTION = 0.2;

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

export function TransactionList({
  data, loading, page, onPageChange,
  emptyTitle = "Sin transacciones",
  emptyHint = "Ajusta los filtros para ver otros movimientos",
}: Props) {
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleteIntent, setDeleteIntent] = useState(false);
  // Bumped on every open so the sheet remounts fresh, same as AddRecordButton
  // — otherwise re-opening the same row twice (edit, then swipe-delete)
  // wouldn't pick up the new initialConfirmingDelete.
  const [session, setSession] = useState(0);
  // Only one row's swipe actions stay revealed at a time, like a native list.
  const [openRowId, setOpenRowId] = useState<string | null>(null);

  if (loading) {
    return <TableSkeleton rows={6} />;
  }

  if (!data || data.data.length === 0) {
    return <EmptyState icon="—" title={emptyTitle} description={emptyHint} />;
  }

  function openEdit(tx: Transaction) {
    setOpenRowId(null);
    setSession((s) => s + 1);
    setDeleteIntent(false);
    setEditing(tx);
  }

  function openDelete(tx: Transaction) {
    setOpenRowId(null);
    setSession((s) => s + 1);
    setDeleteIntent(true);
    setEditing(tx);
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
          {group.items.map((tx) => (
            <Row
              key={tx.id}
              tx={tx}
              isOpen={openRowId === tx.id}
              onOpenChange={(open) => setOpenRowId(open ? tx.id : null)}
              onEdit={() => openEdit(tx)}
              onDelete={() => openDelete(tx)}
            />
          ))}
        </div>
      ))}

      <TransactionSheet
        key={editing ? `${editing.id}-${session}` : "none"}
        transaction={editing}
        open={editing !== null}
        onClose={() => setEditing(null)}
        initialConfirmingDelete={deleteIntent}
      />

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

function Row({
  tx, isOpen, onOpenChange, onEdit, onDelete,
}: {
  tx: Transaction;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const type = tx.type as TransactionType;
  const reduceMotion = useReducedMotion();
  const x = useMotionValue(0);

  // Snap fully open or fully closed whenever `isOpen` changes — from this
  // row's own drag release, or from another row opening and this one
  // closing in response.
  useEffect(() => {
    if (reduceMotion) {
      x.set(isOpen ? -ACTION_WIDTH : 0);
      return;
    }
    const controls = animate(x, isOpen ? -ACTION_WIDTH : 0, {
      type: "spring", visualDuration: 0.25, bounce: 0,
    });
    return () => controls.stop();
  }, [isOpen, reduceMotion, x]);

  function handleDragEnd(_event: unknown, info: PanInfo) {
    const projected = info.offset.x + info.velocity.x * VELOCITY_PROJECTION;
    onOpenChange(projected < -OPEN_THRESHOLD);
  }

  return (
    <div className="relative overflow-hidden border-t border-divider">
      {!reduceMotion && (
        <div className="absolute inset-y-0 right-0 flex" style={{ width: ACTION_WIDTH }}>
          <ActionButton label="Editar" tone="neutral" onClick={onEdit}>
            <PencilIcon className="w-[18px] h-[18px]" />
          </ActionButton>
          <ActionButton label="Eliminar" tone="danger" onClick={onDelete}>
            <TrashIcon className="w-[18px] h-[18px]" />
          </ActionButton>
        </div>
      )}

      <motion.div
        drag={reduceMotion ? false : "x"}
        style={{ x }}
        dragConstraints={{ left: -ACTION_WIDTH, right: 0 }}
        dragElastic={{ left: 0.12, right: 0 }}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        // whileTap, not the .press CSS class: framer already owns this
        // element's transform for the drag offset, and a stylesheet
        // transform on :active would just lose that fight. No entrance
        // animation here — this list remounts on every tab visit (the
        // page-level route transition owns that), and fading rows in from
        // opacity 0 on every single remount briefly exposed the swipe-action
        // layer sitting behind them, which read as the row "resetting".
        whileTap={{ scale: 0.98 }}
        onClick={() => (isOpen ? onOpenChange(false) : onEdit())}
        className="relative bg-surface w-full text-left flex items-center justify-between py-[11px] cursor-pointer"
      >
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
      </motion.div>
    </div>
  );
}

function ActionButton({
  label, tone, onClick, children,
}: {
  label: string;
  tone: "neutral" | "danger";
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "press flex flex-1 flex-col items-center justify-center gap-1 text-white",
        tone === "neutral" ? "bg-surface-3" : "bg-red-fg"
      )}
    >
      {children}
      <span className="font-mono text-[9px] uppercase tracking-wide">{label}</span>
    </button>
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
