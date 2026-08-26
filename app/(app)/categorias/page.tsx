"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { CategoryDetail } from "@/components/dashboard/CategoryDetail";
import { EmptyState } from "@/components/ui/EmptyState";
import { ChartSkeleton } from "@/components/ui/Skeleton";
import { PlusIcon } from "@/components/shell/icons";
import { CategoryEditSheet, type EditableCategory } from "@/components/settings/CategoryEditSheet";
import { formatMXN, formatMonth, getCurrentMonth, cn } from "@/lib/utils";
import type { CategoryTrend } from "@/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function Categorias() {
  const { data, isLoading } =
    useSWR<{ months: string[]; trends: CategoryTrend[] }>("/api/categories/trend?months=6", fetcher);

  // The trends view only knows categories that have spending; managing them
  // needs the full list, including the ones still at zero.
  const { data: all } = useSWR<EditableCategory[]>("/api/categories", fetcher);
  const [editMode, setEditMode] = useState(false);
  const [editing, setEditing] = useState<EditableCategory | "new" | null>(null);

  const trends = data?.trends ?? [];
  // Null means "nothing picked yet" and falls back to the first row, so the
  // default needs no effect to install it.
  const [picked, setPicked] = useState<string | null>(null);
  const selected = picked ?? trends[0]?.category ?? null;

  const selectedTrend = trends.find((t) => t.category === selected) ?? null;
  const total = trends.reduce((s, t) => s + t.currentAmount, 0);
  const max = Math.max(...trends.map((t) => t.currentAmount), 1);

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 pt-4 pb-6">
      <div className="flex items-baseline justify-between mb-4">
        <h1 className="text-[15px] font-semibold text-text">Categorías</h1>
        <button
          type="button"
          onClick={() => setEditMode((v) => !v)}
          className="press -my-2 -mr-2 px-2 py-2 font-mono text-[10.5px] uppercase tracking-wide text-accent"
        >
          {editMode ? "Listo" : "Editar"}
        </button>
      </div>

      {editMode ? (
        <ManageList
          categories={all ?? []}
          onEdit={(c) => setEditing(c)}
          onAdd={() => setEditing("new")}
        />
      ) : isLoading ? (
        <ChartSkeleton height="h-96" />
      ) : trends.length === 0 ? (
        <div className="panel">
          <EmptyState
            title="Aún no hay gastos"
            description="Registra un movimiento y aquí verás en qué se te va el dinero"
          />
        </div>
      ) : (
        <div className="md:grid md:grid-cols-[1fr_360px] md:gap-10 md:items-start">
          <div>
            <p className="font-mono text-[10px] font-semibold text-text-dim uppercase tracking-[0.1em] px-1 pb-2">
              {formatMonth(getCurrentMonth())} · {formatMXN(total)} en {trends.length} categorías
            </p>
            <div className="panel px-4 pb-1">
              {trends.map((t) => (
                <CategoryRow
                  key={t.category}
                  trend={t}
                  max={max}
                  total={total}
                  active={t.category === selected}
                  onSelect={() => setPicked(t.category)}
                />
              ))}
            </div>
          </div>

          {/* Desktop detail panel */}
          {selectedTrend && (
            <div className="panel hidden md:block sticky top-6 px-5 py-4">
              <CategoryDetail trend={selectedTrend} />
            </div>
          )}
        </div>
      )}

      <CategoryEditSheet
        key={editing === "new" ? "new" : editing?.id ?? "none"}
        category={editing === "new" ? null : editing}
        open={editing !== null}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}

/** Edit mode: every category the user has, spending or not. */
function ManageList({
  categories, onEdit, onAdd,
}: {
  categories: EditableCategory[];
  onEdit: (c: EditableCategory) => void;
  onAdd: () => void;
}) {
  const expense = categories.filter((c) => c.kind === "expense");
  const income = categories.filter((c) => c.kind === "income");

  return (
    <div className="space-y-3 max-w-xl">
      <section>
        <p className="font-mono text-[10px] font-semibold text-text-dim uppercase tracking-[0.1em] px-1 pb-2">
          Gasto
        </p>
        <div className="panel px-4">
          {expense.map((c) => <ManageRow key={c.id} category={c} onClick={() => onEdit(c)} />)}
          <button
            type="button"
            onClick={onAdd}
            className="press w-full flex items-center gap-2.5 py-3 border-t border-divider text-left text-accent"
          >
            <PlusIcon className="w-3.5 h-3.5 shrink-0" />
            <span className="text-[13.5px]">Agregar categoría</span>
          </button>
        </div>
      </section>

      {income.length > 0 && (
        <section>
          <p className="font-mono text-[10px] font-semibold text-text-dim uppercase tracking-[0.1em] px-1 pb-2">
            Ingreso
          </p>
          <div className="panel px-4">
            {income.map((c) => <ManageRow key={c.id} category={c} onClick={() => onEdit(c)} />)}
          </div>
        </section>
      )}
    </div>
  );
}

function ManageRow({ category, onClick }: { category: EditableCategory; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="press w-full flex items-center justify-between py-3 border-t border-divider first:border-t-0 text-left"
    >
      <span className="flex items-center gap-2.5 min-w-0">
        <span
          className="w-[7px] h-[7px] rounded-full shrink-0"
          style={{ backgroundColor: category.color }}
        />
        <span className="text-[13.5px] text-text truncate">{category.name}</span>
      </span>
      <span className="font-mono text-[11px] text-text-dim shrink-0 ml-2.5">
        {category.kind === "expense" && category.budget > 0 ? formatMXN(category.budget) : "—"}
      </span>
    </button>
  );
}

function CategoryRow({
  trend, max, total, active, onSelect,
}: { trend: CategoryTrend; max: number; total: number; active: boolean; onSelect: () => void }) {
  const pct = total > 0 ? Math.round((trend.currentAmount / total) * 100) : 0;
  const barPct = Math.round((trend.currentAmount / max) * 100);

  return (
    <>
      {/* Desktop: select in place */}
      <button
        onClick={onSelect}
        className={cn(
          "hidden md:block w-full text-left py-[11px] border-t border-divider transition-colors duration-150 ease-out",
          active && "bg-surface-2/40"
        )}
      >
        <RowContent trend={trend} pct={pct} barPct={barPct} />
      </button>

      {/* Mobile: push to detail route */}
      <Link
        href={`/categorias/${encodeURIComponent(trend.category)}`}
        className="md:hidden block py-[11px] border-t border-divider active:bg-surface-2/40 transition-colors duration-150 ease-out"
      >
        <RowContent trend={trend} pct={pct} barPct={barPct} />
      </Link>
    </>
  );
}

function RowContent({ trend, pct, barPct }: { trend: CategoryTrend; pct: number; barPct: number }) {
  return (
    <>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="flex items-center gap-2 text-[13.5px] text-text min-w-0">
          <span className="w-[7px] h-[7px] rounded-full shrink-0" style={{ backgroundColor: trend.color }} />
          <span className="truncate">{trend.category}</span>
        </span>
        <span className="font-mono text-[13px] font-semibold text-text whitespace-nowrap shrink-0 ml-2.5">
          {formatMXN(trend.currentAmount)}
          <span className="text-text-faint font-normal"> · {pct}%</span>
        </span>
      </div>
      <div className="h-1 w-full rounded-full bg-surface-2 overflow-hidden">
        <div className="h-full" style={{ width: `${barPct}%`, background: trend.color }} />
      </div>
    </>
  );
}
