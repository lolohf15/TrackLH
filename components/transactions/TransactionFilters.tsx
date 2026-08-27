"use client";

import { useState } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Select } from "@/components/ui/Select";
import { getMonthOptions, cn } from "@/lib/utils";
import type { TransactionFilters } from "@/types";

interface Props {
  filters: TransactionFilters;
  categories: string[];
  accounts: string[];
  onChange: (filters: TransactionFilters) => void;
}

const TYPES = ["Gasto", "Ingreso", "Transferencia"];

export function TransactionFiltersPanel({ filters, categories, accounts, onChange }: Props) {
  const months = getMonthOptions(24);
  const [sheetOpen, setSheetOpen] = useState(false);

  function update(key: keyof TransactionFilters, value: string | number) {
    onChange({ ...filters, [key]: value, page: 1 });
  }

  function reset() {
    onChange({ month: "", category: "", account: "", type: "", page: 1, limit: filters.limit });
  }

  const sheetActiveCount = [filters.month, filters.category, filters.account].filter(Boolean).length;
  const activeCount = sheetActiveCount + (filters.type ? 1 : 0);

  return (
    <>
      {/* Desktop: inline selects */}
      <div className="hidden sm:flex flex-wrap items-center gap-2">
        <Select value={filters.month} onChange={(v) => update("month", v)} placeholder="Todos los meses">
          {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </Select>
        <Select value={filters.type} onChange={(v) => update("type", v)} placeholder="Todos los tipos">
          {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </Select>
        <Select value={filters.account} onChange={(v) => update("account", v)} placeholder="Todas las cuentas">
          {accounts.map((a) => <option key={a} value={a}>{a}</option>)}
        </Select>
        <Select value={filters.category} onChange={(v) => update("category", v)} placeholder="Todas las categorías">
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
        {activeCount > 0 && (
          <button
            onClick={reset}
            className="font-mono text-[10.5px] text-text-dim hover:text-text-muted underline underline-offset-2 transition-colors"
          >
            Limpiar
          </button>
        )}
      </div>

      {/* Mobile: type chips + sheet trigger for the rest */}
      <div className="sm:hidden flex items-center gap-2">
        {/* Scrolls sideways itself, so the tab swipe has to keep its hands off. */}
        <div className="flex-1 flex gap-1.5 overflow-x-auto">
          <Chip active={filters.type === ""} onClick={() => update("type", "")}>Todos</Chip>
          {TYPES.map((t) => (
            <Chip key={t} active={filters.type === t} onClick={() => update("type", filters.type === t ? "" : t)}>
              {t}
            </Chip>
          ))}
        </div>
        <button
          onClick={() => setSheetOpen(true)}
          className="press flex items-center gap-1.5 rounded-full font-mono text-[10.5px] font-medium border border-border px-3 py-[7px] text-text-muted shrink-0"
        >
          Filtros
          {sheetActiveCount > 0 && (
            <span className="w-3.5 h-3.5 rounded-full bg-accent text-white text-[9px] flex items-center justify-center font-semibold">
              {sheetActiveCount}
            </span>
          )}
        </button>
      </div>

      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Filtros">
        <div className="pb-6">
          {sheetActiveCount > 0 && (
            <div className="flex justify-end -mt-2 mb-3">
              <button
                onClick={reset}
                className="press font-mono text-[10.5px] text-text-dim underline underline-offset-2 py-1.5"
              >
                Limpiar
              </button>
            </div>
          )}

          <div className="space-y-4">
            <SheetField label="Mes">
              <Select value={filters.month} onChange={(v) => update("month", v)} placeholder="Todos los meses" block>
                {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </Select>
            </SheetField>
            <SheetField label="Cuenta">
              <Select value={filters.account} onChange={(v) => update("account", v)} placeholder="Todas las cuentas" block>
                {accounts.map((a) => <option key={a} value={a}>{a}</option>)}
              </Select>
            </SheetField>
            <SheetField label="Categoría">
              <Select value={filters.category} onChange={(v) => update("category", v)} placeholder="Todas las categorías" block>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </SheetField>
          </div>

          <button
            onClick={() => setSheetOpen(false)}
            className="press w-full mt-6 rounded-md bg-accent text-white text-sm font-medium py-3.5 min-h-[48px]"
          >
            Aplicar
          </button>
        </div>
      </BottomSheet>
    </>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "press shrink-0 rounded-full font-mono text-[10.5px] font-medium tracking-wide uppercase px-3 py-[7px] border transition-colors duration-150 ease-out",
        active ? "border-accent text-accent bg-accent/10" : "border-border text-text-dim"
      )}
    >
      {children}
    </button>
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
