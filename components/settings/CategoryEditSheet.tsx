"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { CategoryIcon, CATEGORY_ICONS } from "@/components/ui/CategoryIcon";
import { ColorPicker, PALETTE } from "./ColorPicker";
import { useT } from "@/lib/i18n-react";
import { cn } from "@/lib/utils";
import {
  CATEGORY_ICON_KEYS,
  isCategoryIconKey,
  suggestCategoryIcon,
  type CategoryIconKey,
} from "@/lib/category-icons";
import type { CategoryKind } from "@/types";


export interface EditableCategory {
  id: string;
  name: string;
  color: string;
  icon: string | null;
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
  const t = useT();
  const isNew = category === null;
  const kinds = [
    { value: "expense" as const, label: t.categorySheet.expense },
    { value: "income" as const, label: t.categorySheet.income },
  ];

  const [name, setName] = useState(category?.name ?? "");
  const [kind, setKind] = useState<CategoryKind>(category?.kind ?? "expense");
  const [color, setColor] = useState(category?.color ?? PALETTE[0]);
  // Until one is picked, the icon follows the name — typing "Gasolina" puts
  // a pump on it — so most categories never need the grid at all.
  const [pickedIcon, setPickedIcon] = useState<CategoryIconKey | null>(
    isCategoryIconKey(category?.icon) ? category.icon : null
  );
  const icon = pickedIcon ?? suggestCategoryIcon(name);
  const [budget, setBudget] = useState(
    category?.budget ? String(category.budget) : ""
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [replacementId, setReplacementId] = useState("");

  // Only fetched once someone asks to delete: the choices for what comes next.
  const { data: all } = useSWR<EditableCategory[]>(
    confirmingDelete ? "/api/categories" : null,
    (url: string) => fetch(url).then((r) => r.json())
  );
  const replacements = (all ?? []).filter((c) => c.kind === category?.kind && c.id !== category?.id);

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
          icon,
          budget: budget === "" ? 0 : Number(budget),
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload?.error ?? t.common.saveFailed);
        setBusy(false);
        return;
      }
      mutate((key) => typeof key === "string" && key.startsWith("/api/"));
      onClose();
    } catch {
      setError(t.common.offline);
      setBusy(false);
    }
  }

  async function remove() {
    if (busy || isNew) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/categories/${category.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replacementId: replacementId || undefined }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload?.error ?? t.common.deleteFailed);
        setBusy(false);
        setConfirmingDelete(false);
        return;
      }
      mutate((key) => typeof key === "string" && key.startsWith("/api/"));
      onClose();
    } catch {
      setError(t.common.offline);
      setBusy(false);
    }
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={isNew ? t.categorySheet.newTitle : t.categorySheet.editTitle}
    >
      <div className="pb-6 space-y-5">
        <Field label={t.common.name}>
          <div className="flex items-center gap-3">
            {/* The finished mark, live: what every list will show. */}
            <CategoryIcon icon={icon} name={name || "?"} color={color} size="lg" />
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.categorySheet.namePlaceholder}
              aria-label={t.categorySheet.nameLabel}
              autoFocus={isNew}
              className="flex-1 min-w-0 rounded-md bg-surface-2 border border-border px-3.5 py-3 min-h-[48px] text-[15px] text-text outline-none placeholder:text-text-faint focus:border-accent/60 transition-colors duration-150"
            />
          </div>
        </Field>

        {/* The kind decides whether a budget even applies, so it can't move
            once movements are already filed under it. */}
        {isNew && (
          <Field label={t.common.kind}>
            <SegmentedControl
              options={kinds}
              value={kind}
              onChange={setKind}
              label={t.categorySheet.kindLabel}
            />
          </Field>
        )}

        <Field label={t.common.color}>
          <ColorPicker value={color} onChange={setColor} />
        </Field>

        {/* A div, not Field's <label>: a label wrapping forty buttons would
            forward every stray tap on it to the first one. */}
        <div className="space-y-1.5">
          <span className="font-mono text-[10px] font-semibold text-text-dim uppercase tracking-[0.1em]">
            {t.categorySheet.icon}
          </span>
          <div role="radiogroup" aria-label={t.categorySheet.icon} className="grid grid-cols-7 gap-1">
            {CATEGORY_ICON_KEYS.map((key) => {
              const Glyph = CATEGORY_ICONS[key];
              const selected = key === icon;
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={t.categoryIcons[key]}
                  onClick={() => setPickedIcon(key)}
                  className={cn(
                    "press h-11 rounded-md grid place-items-center transition-colors duration-150",
                    selected ? "text-[var(--icon-tone)]" : "text-text-dim active:bg-surface-2"
                  )}
                  style={
                    selected
                      ? ({
                          "--icon-tone": color,
                          backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)`,
                          boxShadow: `inset 0 0 0 1.5px ${color}`,
                        } as React.CSSProperties)
                      : undefined
                  }
                >
                  <Glyph size={20} strokeWidth={2} aria-hidden="true" />
                </button>
              );
            })}
          </div>
        </div>

        {kind === "expense" && (
          <Field label={t.categorySheet.monthlyBudget}>
            <div className="flex items-baseline gap-2 rounded-md border border-border bg-surface-2 px-3.5 py-2.5">
              <span className="font-mono text-lg text-text-dim">$</span>
              <input
                value={budget}
                onChange={(e) => setBudget(e.target.value.replace(/[^\d.]/g, ""))}
                inputMode="decimal"
                placeholder="0"
                aria-label={t.categorySheet.monthlyBudget}
                className="flex-1 min-w-0 bg-transparent font-mono text-[19px] font-semibold text-text tabular-nums outline-none placeholder:text-text-faint"
              />
            </div>
          </Field>
        )}

        {renamed && (
          <p className="rounded-sm bg-amber-bg border border-amber-border text-amber-fg text-xs px-3.5 py-2.5 leading-relaxed">
            {t.accountSheet.renameWarning(name.trim())}
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
          {isNew ? t.categorySheet.addCategory : t.common.saveChanges}
        </Button>

        {!isNew &&
          (confirmingDelete ? (
            <div className="space-y-3">
              <p className="text-xs text-text-dim leading-relaxed">{t.categorySheet.keepsHistory}</p>
              <Field label={t.categorySheet.replaceLabel}>
                <select
                  value={replacementId}
                  onChange={(e) => setReplacementId(e.target.value)}
                  className="w-full rounded-md bg-surface-2 border border-border px-3.5 py-3 min-h-[48px] text-[15px] text-text outline-none focus:border-accent/60 transition-colors duration-150"
                >
                  <option value="">{t.categorySheet.replaceNone}</option>
                  {replacements.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="flex gap-2.5">
                <Button variant="secondary" size="lg" className="flex-1 py-3.5"
                  onClick={() => setConfirmingDelete(false)}>
                  {t.common.cancel}
                </Button>
                <Button variant="danger" size="lg" className="flex-1 py-3.5" loading={busy}
                  onClick={remove}>
                  {t.categorySheet.confirmDelete}
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="press w-full font-mono text-[10.5px] text-red-fg uppercase tracking-wide py-2.5"
            >
              {t.categorySheet.deleteCategory}
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
