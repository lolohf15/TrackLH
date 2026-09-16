"use client";

import { useEffect, useState } from "react";
import { animate, motion, useMotionValue, useReducedMotion, type PanInfo } from "framer-motion";
import { EmptyState } from "@/components/ui/EmptyState";
import { TransactionSheet } from "./TransactionSheet";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { PencilIcon, TrashIcon } from "@/components/shell/icons";
import { formatMXN } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { currentLocale } from "@/lib/i18n";
import { useT } from "@/lib/i18n-react";
import type { Dictionary } from "@/lib/dictionary";
import type { Transaction, TransactionType, PaginatedTransactions } from "@/types";

interface Props {
  data: PaginatedTransactions | null;
  loading: boolean;
  page: number;
  onPageChange: (page: number) => void;
  /** Shown when there is nothing to list. Defaults to the filtered-view copy. */
  emptyTitle?: string;
  emptyHint?: string;
  /** Off for a preview of the first few, where paging would lead nowhere —
   *  Inicio's recent activity has "ver todo" for that. */
  paginate?: boolean;
}

/** As a value rather than a class: the row's marker mixes it down for its
 *  ring, and `color-mix` needs the colour itself to do that. */
const typeColors: Record<TransactionType, string> = {
  Gasto: "var(--color-red-fg)",
  Ingreso: "var(--color-green-fg)",
  Transferencia: "var(--color-blue-fg)",
};

const amountColors: Record<TransactionType, string> = {
  Gasto: "text-red-fg",
  Ingreso: "text-green-fg",
  Transferencia: "text-blue-fg",
};

/** Revealed by a left swipe — width of the Editar + Eliminar action pair. */
const ACTION_WIDTH = 144;
/** Past this drag distance (projected forward by velocity) the row snaps open. */
const OPEN_THRESHOLD = 56;
const VELOCITY_PROJECTION = 0.2;

/** Takes the dictionary rather than reading it: this runs per row, outside
 *  a component, so it can't hold a hook of its own. */
function dayLabel(dateStr: string, t: Dictionary): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a: Date, b: Date) =>
    a.getUTCFullYear() === b.getFullYear() &&
    a.getUTCMonth() === b.getMonth() &&
    a.getUTCDate() === b.getDate();

  if (sameDay(d, today)) return t.dates.today;
  if (sameDay(d, yesterday)) return t.dates.yesterday;

  return new Intl.DateTimeFormat(currentLocale(), {
    weekday: "long", day: "numeric", month: "short", timeZone: "UTC",
  }).format(d).replace(/^\w/, (c) => c.toUpperCase());
}

export function TransactionList({
  data, loading, page, onPageChange,
  emptyTitle,
  emptyHint,
  paginate = true,
}: Props) {
  const t = useT();
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
    return (
      <EmptyState
        icon="—"
        title={emptyTitle ?? t.movements.emptyTitle}
        description={emptyHint ?? t.movements.emptyHint}
      />
    );
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
    const label = dayLabel(tx.date, t);
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

      {paginate && data.totalPages > 1 && (
        <div className="flex items-center justify-between pt-3">
          <span className="font-mono text-[10.5px] text-text-dim">
            {t.common.page} {page} {t.common.of} {data.totalPages}
          </span>
          <div className="flex items-center gap-2">
            <PagBtn onClick={() => onPageChange(page - 1)} disabled={page <= 1}>‹ {t.common.previous}</PagBtn>
            <PagBtn onClick={() => onPageChange(page + 1)} disabled={page >= data.totalPages}>{t.common.next} ›</PagBtn>
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
  const t = useT();
  const type = tx.type as TransactionType;
  const reduceMotion = useReducedMotion();
  const x = useMotionValue(0);
  const [dragging, setDragging] = useState(false);

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
        // Hidden outright while the row sits closed. Left mounted and merely
        // covered, this layer bleeds a hairline of itself around its own box
        // — the row above it is composited and its edges land on fractional
        // pixels — which drew a faint rectangle on every row in the list.
        // The delay keeps it painted through the close animation; there is
        // none on the way in, so a drag reveals it at once.
        <div
          className={cn(
            "absolute inset-y-0 right-0 flex transition-[visibility] duration-0",
            !isOpen && !dragging && "invisible delay-300"
          )}
          style={{ width: ACTION_WIDTH }}
        >
          <ActionButton label={t.actions.edit} tone="neutral" onClick={onEdit}>
            <PencilIcon className="w-[18px] h-[18px]" />
          </ActionButton>
          <ActionButton label={t.actions.delete} tone="danger" onClick={onDelete}>
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
        onDragStart={() => setDragging(true)}
        onDragEnd={(event, info) => {
          setDragging(false);
          handleDragEnd(event, info);
        }}
        // whileTap, not the .press CSS class: framer already owns this
        // element's transform for the drag offset, and a stylesheet
        // transform on :active would just lose that fight. No entrance
        // animation here — this list remounts on every tab visit (the
        // page-level route transition owns that), and fading rows in from
        // opacity 0 on every single remount briefly exposed the swipe-action
        // layer sitting behind them, which read as the row "resetting".
        whileTap={{ scale: 0.98 }}
        onClick={() => (isOpen ? onOpenChange(false) : onEdit())}
        // Opaque only while there's something behind it to hide. A row that
        // carries its own background all the time cuts a flat rectangle out
        // of the panel's edge glow, which reads as every transaction sitting
        // in a box of its own. The delay matches the action layer's, so the
        // cover outlasts the close animation.
        className={cn(
          "relative w-full text-left flex items-center justify-between py-[13px] cursor-pointer",
          "transition-[background-color] duration-0",
          isOpen || dragging ? "bg-surface" : "bg-transparent delay-300"
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* A dot inside a ring, not a bare dot: at this size the ring is
              what gives the row a left edge to hang off. */}
          <span
            className="w-[22px] h-[22px] rounded-full grid place-items-center shrink-0"
            style={{ border: `1px solid color-mix(in srgb, ${typeColors[type]} 32%, transparent)` }}
          >
            <span
              className="w-[7px] h-[7px] rounded-full"
              style={{ background: typeColors[type] }}
            />
          </span>
          <div className="min-w-0">
            <p className="text-[13.5px] text-text truncate">
              {tx.description ?? tx.category ?? t.movements.fallbackName}
            </p>
            <p className="text-[11.5px] text-text-dim mt-0.5 truncate">{tx.category ?? tx.type} · {tx.account}</p>
          </div>
        </div>
        <span className={cn("font-mono text-[13.5px] font-semibold ml-2.5 shrink-0", amountColors[type])}>
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
        "press flex flex-1 flex-col items-center justify-center gap-1",
        tone === "neutral" ? "bg-surface-3 text-text" : "bg-red-fg text-red-ink"
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
