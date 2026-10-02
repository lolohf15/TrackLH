"use client";

import { useState } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Select } from "@/components/ui/Select";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { FilterIcon } from "@/components/shell/icons";
import { useT } from "@/lib/i18n-react";
import { VALID_TRANSACTION_TYPES } from "@/types";
import type { TransactionFilters, TransactionType } from "@/types";

/** Matching the movement form, the lists and the amounts. */
const TYPE_TONES: Record<TransactionType, string> = {
  Gasto: "var(--color-red)",
  Ingreso: "var(--color-green)",
  Transferencia: "var(--color-blue)",
};

interface Props {
  filters: TransactionFilters;
  categories: string[];
  accounts: string[];
  onChange: (filters: TransactionFilters) => void;
}

export function TransactionFiltersPanel({ filters, categories, accounts, onChange }: Props) {
  const t = useT();
  const [sheetOpen, setSheetOpen] = useState(false);

  function update(key: keyof TransactionFilters, value: string | number) {
    onChange({ ...filters, [key]: value, page: 1 });
  }

  // The span is navigation, not a filter: it has its own stepper above the
  // list, so clearing leaves it where it is.
  function reset() {
    onChange({ ...filters, category: "", account: "", type: "", page: 1 });
  }

  const sheetActiveCount = [filters.category, filters.account].filter(Boolean).length;
  const activeCount = sheetActiveCount + (filters.type ? 1 : 0);

  return (
    <>
      {/* Desktop: inline selects */}
      <div className="hidden sm:flex flex-wrap items-center gap-2">
        <Select value={filters.type} onChange={(v) => update("type", v)} placeholder={t.movements.allTypes}>
          {VALID_TRANSACTION_TYPES.map((type) => <option key={type} value={type}>{t.txType[type]}</option>)}
        </Select>
        <Select value={filters.account} onChange={(v) => update("account", v)} placeholder={t.movements.allAccounts}>
          {accounts.map((a) => <option key={a} value={a}>{a}</option>)}
        </Select>
        <Select value={filters.category} onChange={(v) => update("category", v)} placeholder={t.movements.allCategories}>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
        {activeCount > 0 && (
          <button
            onClick={reset}
            className="font-mono text-[10.5px] text-text-dim hover:text-text-muted underline underline-offset-2 transition-colors"
          >
            {t.movements.clear}
          </button>
        )}
      </div>

      {/* Mobile: every type in one track that fits the width — a row that
          scrolled sideways hid the last of them behind the filter button. */}
      <div className="sm:hidden flex items-center gap-2">
        <SegmentedControl
          options={[
            { value: "", label: t.common.all },
            ...VALID_TRANSACTION_TYPES.map((type) => ({
              value: type,
              label: t.movements.typeShort[type],
              tone: TYPE_TONES[type],
            })),
          ]}
          value={filters.type}
          onChange={(v) => update("type", v)}
          label={t.txSheet.type}
          size="sm"
          className="flex-1 min-w-0"
        />
        <button
          onClick={() => setSheetOpen(true)}
          aria-label={t.movements.filters}
          className="press relative w-11 h-11 -my-1.5 flex items-center justify-center text-text-muted shrink-0"
        >
          <span className="w-[34px] h-[34px] rounded-md bg-surface-2 flex items-center justify-center">
            <FilterIcon className="w-4 h-4" />
          </span>
          {sheetActiveCount > 0 && (
            <span className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-accent text-accent-ink text-[9px] flex items-center justify-center font-semibold">
              {sheetActiveCount}
            </span>
          )}
        </button>
      </div>

      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={t.movements.filters}>
        <div className="pb-6">
          {sheetActiveCount > 0 && (
            <div className="flex justify-end -mt-2 mb-3">
              <button
                onClick={reset}
                className="press font-mono text-[10.5px] text-text-dim underline underline-offset-2 py-1.5"
              >
                {t.movements.clear}
              </button>
            </div>
          )}

          <div className="space-y-4">
            <SheetField label={t.common.account}>
              <Select value={filters.account} onChange={(v) => update("account", v)} placeholder={t.movements.allAccounts} block>
                {accounts.map((a) => <option key={a} value={a}>{a}</option>)}
              </Select>
            </SheetField>
            <SheetField label={t.common.category}>
              <Select value={filters.category} onChange={(v) => update("category", v)} placeholder={t.movements.allCategories} block>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </SheetField>
          </div>

          <button
            onClick={() => setSheetOpen(false)}
            className="press w-full mt-6 rounded-md bg-accent text-accent-ink text-sm font-medium py-3.5 min-h-[48px]"
          >
            {t.movements.apply}
          </button>
        </div>
      </BottomSheet>
    </>
  );
}

function SheetField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs text-text-dim">{label}</label>
      {children}
    </div>
  );
}
