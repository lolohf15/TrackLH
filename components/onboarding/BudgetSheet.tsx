"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { useToast } from "@/components/ui/Toast";
import { EXPENSE_CATEGORY_PRESETS } from "@/services/presets";
import { useT } from "@/lib/i18n-react";
import type { CategoryKind } from "@/types";

interface CategoryRow {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  kind: CategoryKind;
  budget: number;
}

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`${url} → ${r.status}`);
    return r.json();
  });

/** What the presets suggest for a category of that name, if anything. */
function suggestion(name: string): number {
  return EXPENSE_CATEGORY_PRESETS.find((p) => p.name === name)?.budget ?? 0;
}

/**
 * Every expense category's monthly cap on one screen. The suggested figure
 * shows as a placeholder, never as a value: an empty field means "no cap",
 * and "Usar sugeridos" is the explicit way to take the suggestions.
 */
export function BudgetSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  return (
    <BottomSheet open={open} onClose={onClose} title={t.budgetSheet.title}>
      {open && <BudgetForm onDone={onClose} />}
    </BottomSheet>
  );
}

function BudgetForm({ onDone }: { onDone: () => void }) {
  const t = useT();
  const toast = useToast();
  const { data } = useSWR<CategoryRow[]>("/api/categories", fetcher);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories = (data ?? []).filter((c) => c.kind === "expense");
  const valueOf = (c: CategoryRow) => values[c.name] ?? (c.budget > 0 ? String(c.budget) : "");
  const anySuggestion = categories.some((c) => suggestion(c.name) > 0);

  function applySuggested() {
    setValues((prev) => {
      const next = { ...prev };
      for (const c of categories) {
        const s = suggestion(c.name);
        if (s > 0 && valueOf(c) === "") next[c.name] = String(s);
      }
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setError(null);
    const items = categories.map((c) => {
      const n = Number(valueOf(c).replace(/[^\d.]/g, ""));
      return { category: c.name, amount: Number.isFinite(n) && n > 0 ? n : 0 };
    });
    try {
      const res = await fetch("/api/budgets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.error ?? t.budgetSheet.saveFailed);
        setSaving(false);
        return;
      }
      await mutate((key) => typeof key === "string" && key.startsWith("/api/"));
      toast({ message: t.budgetSheet.saved });
      onDone();
    } catch {
      setError(t.common.offline);
      setSaving(false);
    }
  }

  if (!data) {
    return (
      <div className="pb-6 space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[52px]" />
        ))}
      </div>
    );
  }

  if (categories.length === 0) {
    return <p className="pb-8 text-[14px] text-text-muted">{t.budgetSheet.noCategories}</p>;
  }

  return (
    <div className="pb-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <p className="text-[13.5px] text-text-muted leading-relaxed">{t.budgetSheet.intro}</p>
        {anySuggestion && (
          <button
            type="button"
            onClick={applySuggested}
            className="press shrink-0 font-mono text-[10.5px] font-medium text-accent uppercase tracking-wide min-h-[32px] hover:brightness-125"
          >
            {t.budgetSheet.useSuggested}
          </button>
        )}
      </div>

      <div className="panel divide-y divide-divider">
        {categories.map((c) => (
          <label key={c.id} className="flex items-center gap-3 px-4 py-2.5 min-h-[56px]">
            <CategoryIcon icon={c.icon} name={c.name} color={c.color} size="md" />
            <span className="flex-1 min-w-0 truncate text-[14px] text-text">{c.name}</span>
            <span className="flex items-center gap-1.5 shrink-0">
              <span className="text-[13px] text-text-faint">$</span>
              <input
                inputMode="decimal"
                value={valueOf(c)}
                placeholder={suggestion(c.name) > 0 ? String(suggestion(c.name)) : "0"}
                onChange={(e) => setValues((v) => ({ ...v, [c.name]: e.target.value }))}
                aria-label={`${c.name}, ${t.budgetSheet.perMonth}`}
                className="w-[92px] rounded-sm bg-surface-2 border border-border px-2.5 py-2 text-right text-[15px] text-text tabular-nums outline-none placeholder:text-text-faint/70 focus:border-accent/60 transition-colors duration-150"
              />
            </span>
          </label>
        ))}
      </div>

      {error && (
        <p role="alert" className="rounded-sm bg-red-bg border border-red-border text-red-fg text-xs px-3.5 py-2.5">
          {error}
        </p>
      )}

      <Button size="lg" className="w-full py-3.5" loading={saving} onClick={save}>
        {t.budgetSheet.save}
      </Button>
    </div>
  );
}
