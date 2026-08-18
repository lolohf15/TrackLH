"use client";

import { useState } from "react";
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

  const activeCount = [filters.month, filters.category, filters.account, filters.type].filter(Boolean).length;

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
            className="text-xs text-text-dim hover:text-text-muted underline underline-offset-2 transition-colors"
          >
            Limpiar
          </button>
        )}
      </div>

      {/* Mobile: single trigger -> bottom sheet */}
      <div className="sm:hidden">
        <button
          onClick={() => setSheetOpen(true)}
          className="press flex items-center gap-2 text-xs font-medium bg-surface border border-border rounded-xl px-3.5 py-2 text-text-muted transition-transform duration-150 ease-out"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
          </svg>
          Filtros
          {activeCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-green text-white text-[10px] flex items-center justify-center font-semibold">
              {activeCount}
            </span>
          )}
        </button>
      </div>

      {sheetOpen && (
        <div className="sm:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/60 animate-fade-in"
            onClick={() => setSheetOpen(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-surface border-t border-border-strong rounded-t-3xl p-5 pb-safe animate-sheet-up max-h-[80vh] overflow-y-auto">
            <div className="w-9 h-1 bg-surface-3 rounded-full mx-auto mb-5" />
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-semibold text-text">Filtros</h3>
              {activeCount > 0 && (
                <button onClick={reset} className="text-xs text-text-dim underline underline-offset-2">
                  Limpiar
                </button>
              )}
            </div>

            <div className="space-y-4">
              <SheetField label="Mes">
                <Select value={filters.month} onChange={(v) => update("month", v)} placeholder="Todos los meses" full>
                  {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </Select>
              </SheetField>
              <SheetField label="Tipo">
                <Select value={filters.type} onChange={(v) => update("type", v)} placeholder="Todos los tipos" full>
                  {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </Select>
              </SheetField>
              <SheetField label="Cuenta">
                <Select value={filters.account} onChange={(v) => update("account", v)} placeholder="Todas las cuentas" full>
                  {accounts.map((a) => <option key={a} value={a}>{a}</option>)}
                </Select>
              </SheetField>
              <SheetField label="Categoría">
                <Select value={filters.category} onChange={(v) => update("category", v)} placeholder="Todas las categorías" full>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              </SheetField>
            </div>

            <button
              onClick={() => setSheetOpen(false)}
              className="press w-full mt-6 bg-green text-white text-sm font-medium rounded-xl py-3 transition-transform duration-150 ease-out"
            >
              Aplicar
            </button>
          </div>
        </div>
      )}
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

function Select({
  value, onChange, placeholder, children, full,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "text-xs bg-surface border border-border rounded-xl px-3 py-1.5 text-text-muted",
        "hover:border-border-strong hover:text-text",
        "focus:outline-none focus:ring-1 focus:ring-green/40 focus:border-green/60",
        "appearance-none cursor-pointer transition-colors duration-150 shadow-sm",
        full && "w-full py-2.5 bg-bg"
      )}
    >
      <option value="">{placeholder}</option>
      {children}
    </select>
  );
}
