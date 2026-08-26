"use client";

import { useState } from "react";
import { mutate } from "swr";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { ColorPicker, PALETTE } from "./ColorPicker";
import { cn } from "@/lib/utils";
import type { CategoryKind } from "@/types";

export interface EditableCategory {
  id: string;
  name: string;
  color: string;
  kind: CategoryKind;
  budget: number;
}

interface Props {
  /** Null means "create a new one". */
  category: EditableCategory | null;
  open: boolean;
  onClose: () => void;
}

export function CategoryEditSheet({ category, open, onClose }: Props) {
  const isNew = category === null;

  const [name, setName] = useState(category?.name ?? "");
  const [kind, setKind] = useState<CategoryKind>(category?.kind ?? "expense");
  const [color, setColor] = useState(category?.color ?? PALETTE[0]);
  const [budget, setBudget] = useState(
    category?.budget ? String(category.budget) : ""
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const renamed = !isNew && name.trim() !== category.name;

  async function save() {
    if (busy || name.trim() === "") return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(isNew ? "/api/categories" : `/api/categories/${category.id}`, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          kind,
          color,
          budget: budget === "" ? 0 : Number(budget),
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload?.error ?? "No se pudo guardar");
        setBusy(false);
        return;
      }
      mutate((key) => typeof key === "string" && key.startsWith("/api/"));
      onClose();
    } catch {
      setError("Sin conexión. Revisa tu red e inténtalo de nuevo.");
      setBusy(false);
    }
  }

  async function remove() {
    if (busy || isNew) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/categories/${category.id}`, { method: "DELETE" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload?.error ?? "No se pudo eliminar");
        setBusy(false);
        setConfirmingDelete(false);
        return;
      }
      mutate((key) => typeof key === "string" && key.startsWith("/api/"));
      onClose();
    } catch {
      setError("Sin conexión. Revisa tu red e inténtalo de nuevo.");
      setBusy(false);
    }
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={isNew ? "Nueva categoría" : "Editar categoría"}
    >
      <div className="pb-6 space-y-5">
        <Field label="Nombre">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Mascotas"
            aria-label="Nombre de la categoría"
            autoFocus={isNew}
            className="w-full rounded-md bg-surface-2 border border-border px-3.5 py-3 min-h-[48px] text-[15px] text-text outline-none placeholder:text-text-faint focus:border-accent/60 transition-colors duration-150"
          />
        </Field>

        {/* The kind decides whether a budget even applies, so it can't move
            once movements are already filed under it. */}
        {isNew && (
          <Field label="Tipo">
            <div className="grid grid-cols-2 gap-1 rounded-md bg-surface-2 p-1">
              {[
                { label: "Gasto", value: "expense" as const },
                { label: "Ingreso", value: "income" as const },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setKind(opt.value)}
                  aria-pressed={kind === opt.value}
                  className={cn(
                    "press rounded-sm font-mono text-[11px] font-medium uppercase tracking-wide py-2.5 min-h-[40px]",
                    "transition-colors duration-150 ease-out",
                    kind === opt.value ? "bg-accent text-white shadow-panel" : "text-text-dim"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </Field>
        )}

        <Field label="Color">
          <ColorPicker value={color} onChange={setColor} />
        </Field>

        {kind === "expense" && (
          <Field label="Presupuesto mensual (opcional)">
            <div className="flex items-baseline gap-2 rounded-md border border-border bg-surface-2 px-3.5 py-2.5">
              <span className="font-mono text-lg text-text-dim">$</span>
              <input
                value={budget}
                onChange={(e) => setBudget(e.target.value.replace(/[^\d.]/g, ""))}
                inputMode="decimal"
                placeholder="0"
                aria-label="Presupuesto mensual"
                className="flex-1 min-w-0 bg-transparent font-mono text-[19px] font-semibold text-text tabular-nums outline-none placeholder:text-text-faint"
              />
            </div>
          </Field>
        )}

        {renamed && (
          <p className="rounded-sm bg-amber-bg border border-amber-border text-amber-fg text-xs px-3.5 py-2.5 leading-relaxed">
            Al renombrarla, tus movimientos anteriores pasan a decir «{name.trim()}».
          </p>
        )}

        {error && (
          <p className="rounded-sm bg-red-bg border border-red-border text-red-fg text-xs px-3.5 py-2.5 leading-relaxed">
            {error}
          </p>
        )}

        <Button
          onClick={save}
          disabled={name.trim() === ""}
          loading={busy && !confirmingDelete}
          size="lg"
          className="w-full py-3.5"
        >
          {isNew ? "Agregar categoría" : "Guardar cambios"}
        </Button>

        {!isNew &&
          (confirmingDelete ? (
            <div className="flex gap-2.5">
              <Button variant="secondary" size="lg" className="flex-1 py-3.5"
                onClick={() => setConfirmingDelete(false)}>
                Cancelar
              </Button>
              <Button variant="danger" size="lg" className="flex-1 py-3.5" loading={busy}
                onClick={remove}>
                Sí, eliminar
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="press w-full font-mono text-[10.5px] text-red-fg uppercase tracking-wide py-2.5"
            >
              Eliminar categoría
            </button>
          ))}
      </div>
    </BottomSheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="font-mono text-[10px] font-semibold text-text-dim uppercase tracking-[0.1em]">
        {label}
      </span>
      {children}
    </label>
  );
}
