"use client";

import { Select } from "@/components/ui/Select";
import { useT } from "@/lib/i18n-react";
import type { StatementColumns } from "@/types";

type Role = keyof StatementColumns;

/**
 * What the file's columns were taken to mean, and a way to disagree.
 *
 * Detection gets the common shapes right, but there is no registry of bank
 * formats behind it and there never will be — so when it misses, the reader
 * needs to be able to point at the right column themselves rather than give
 * up on the file.
 */
export function ColumnMapper({
  columns,
  headerLine,
  columnCount,
  sample,
  invertSigns,
  busy,
  onChange,
  onHeaderLine,
  onInvertSigns,
  onReread,
}: {
  columns: StatementColumns;
  headerLine: number;
  columnCount: number;
  sample: string[][];
  invertSigns: boolean;
  busy: boolean;
  onChange: (role: Role, index: number) => void;
  onHeaderLine: (line: number) => void;
  onInvertSigns: (value: boolean) => void;
  onReread: () => void;
}) {
  const t = useT();

  const roles: Array<[Role, string]> = [
    ["date", t.reconcile.colDate],
    ["description", t.reconcile.colDescription],
    ["amount", t.reconcile.colAmount],
    ["charge", t.reconcile.colCharge],
    ["credit", t.reconcile.colCredit],
    ["balance", t.reconcile.colBalance],
  ];

  const header = sample[headerLine] ?? [];
  const indexes = Array.from({ length: columnCount }, (_, i) => i);

  return (
    <div className="space-y-3.5">
      <div className="grid grid-cols-2 gap-2.5">
        {roles.map(([role, label]) => (
          <label key={role} className="block">
            <span className="block font-mono text-[10px] font-semibold text-text-dim uppercase tracking-[0.1em] pb-1.5">
              {label}
            </span>
            <Select
              block
              aria-label={label}
              value={String(columns[role])}
              onChange={(value) => onChange(role, Number(value))}
            >
              <option value="-1">{t.reconcile.colNone}</option>
              {indexes.map((i) => (
                <option key={i} value={i}>
                  {/* The header's own word when the file has one, so the
                      reader recognizes the column they are choosing. */}
                  {header[i]?.trim() || t.reconcile.columnNumber(i + 1)}
                </option>
              ))}
            </Select>
          </label>
        ))}
      </div>

      <label className="block">
        <span className="block font-mono text-[10px] font-semibold text-text-dim uppercase tracking-[0.1em] pb-1.5">
          {t.reconcile.headerRow}
        </span>
        <Select
          block
          aria-label={t.reconcile.headerRow}
          value={String(headerLine)}
          onChange={(value) => onHeaderLine(Number(value))}
        >
          {sample.map((row, i) => (
            <option key={i} value={i}>
              {t.reconcile.rowNumber(i + 1)} · {row.filter(Boolean).slice(0, 3).join(" / ").slice(0, 44) || "—"}
            </option>
          ))}
        </Select>
      </label>

      <label className="flex items-start gap-2.5 cursor-pointer">
        <input
          type="checkbox"
          checked={invertSigns}
          onChange={(e) => onInvertSigns(e.target.checked)}
          className="mt-0.5 w-4 h-4 shrink-0 accent-[var(--color-accent)]"
        />
        <span className="text-[12.5px] text-text-muted leading-snug">
          {t.reconcile.invertSigns}
        </span>
      </label>

      <button
        type="button"
        onClick={onReread}
        disabled={busy}
        className="press w-full rounded-md border border-border bg-surface-2 px-4 py-2.5 text-[13px] text-text-muted hover:border-border-strong hover:text-text transition-colors duration-150 disabled:opacity-40"
      >
        {busy ? t.reconcile.analyzing : t.reconcile.reread}
      </button>
    </div>
  );
}
