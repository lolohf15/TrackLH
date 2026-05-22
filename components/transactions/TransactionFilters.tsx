"use client";

import { getMonthOptions } from "@/lib/utils";
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

  function update(key: keyof TransactionFilters, value: string | number) {
    onChange({ ...filters, [key]: value, page: 1 });
  }

  function reset() {
    onChange({ month: "", category: "", account: "", type: "", page: 1, limit: filters.limit });
  }

  const hasFilters = filters.month || filters.category || filters.account || filters.type;

  return (
    <div className="flex flex-wrap items-center gap-2">
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

      {hasFilters && (
        <button
          onClick={reset}
          className="text-xs text-[#6B7280] hover:text-[#4B5563] underline underline-offset-2 transition-colors"
        >
          Limpiar
        </button>
      )}
    </div>
  );
}

function Select({
  value, onChange, placeholder, children,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-xs bg-white border border-[#E5DED2] rounded-xl px-3 py-1.5 text-[#4B5563]
        hover:border-[#D4CCBE] hover:text-[#111827]
        focus:outline-none focus:ring-1 focus:ring-[#C6A15B]/40 focus:border-[#C6A15B]/60
        appearance-none cursor-pointer transition-all duration-150 shadow-sm"
    >
      <option value="">{placeholder}</option>
      {children}
    </select>
  );
}
