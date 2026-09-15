"use client";

import { useState } from "react";
import { Select } from "@/components/ui/Select";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { ChevronDownIcon } from "@/components/shell/icons";
import { cn, formatMXNExact, formatDate } from "@/lib/utils";
import { useT } from "@/lib/i18n-react";
import type {
  AccountOption,
  Category,
  MissingRow,
  ReconciledRow,
  TransactionType,
  UnstatedRow,
} from "@/types";

/** What the reader changed about a row before accepting it. */
export interface RowEdit {
  type: TransactionType;
  category: string | null;
  counterparty: string | null;
}

/**
 * The answer, in three parts.
 *
 * "Te faltaron" is the only section that opens by default and the only one
 * with controls, because it is the only one with anything to decide. The
 * other two exist so the reader can trust the first: a count they can expand
 * and check beats a number they have to take on faith.
 */
export function ReconcileReview({
  matched,
  missing,
  extra,
  accounts,
  categories,
  statementAccount,
  selection,
  edits,
  onToggle,
  onSelectAll,
  onEdit,
}: {
  matched: ReconciledRow[];
  missing: MissingRow[];
  extra: UnstatedRow[];
  accounts: AccountOption[];
  categories: Category[];
  statementAccount: string;
  selection: Set<number>;
  edits: Record<number, RowEdit>;
  onToggle: (index: number) => void;
  onSelectAll: (all: boolean) => void;
  onEdit: (index: number, patch: Partial<RowEdit>) => void;
}) {
  const t = useT();
  const allSelected = missing.length > 0 && selection.size === missing.length;

  return (
    <div className="space-y-3">
      <Section
        title={t.reconcile.missing}
        hint={t.reconcile.missingHint}
        count={missing.length}
        tone="accent"
        defaultOpen
      >
        {missing.length === 0 ? (
          <p className="py-5 text-center text-[12.5px] text-text-dim">{t.reconcile.allClear}</p>
        ) : (
          <>
            <button
              type="button"
              onClick={() => onSelectAll(!allSelected)}
              className="press py-2 text-[11.5px] text-accent"
            >
              {allSelected ? t.reconcile.selectNone : t.reconcile.selectAll}
            </button>

            <div className="space-y-1.5">
              {missing.map((row, index) => (
                <MissingRowCard
                  key={`${row.line}-${row.date}`}
                  row={row}
                  edit={edits[index]}
                  checked={selection.has(index)}
                  accounts={accounts}
                  categories={categories}
                  statementAccount={statementAccount}
                  onToggle={() => onToggle(index)}
                  onEdit={(patch) => onEdit(index, patch)}
                />
              ))}
            </div>
          </>
        )}
      </Section>

      <Section title={t.reconcile.matched} hint={t.reconcile.matchedHint} count={matched.length}>
        {matched.map((row) => (
          <div
            key={row.ledgerId}
            className="flex items-center justify-between gap-3 py-2.5 border-t border-divider first:border-t-0"
          >
            <div className="min-w-0">
              <p className="text-[12.5px] text-text truncate">
                {row.description || row.ledgerDescription || "—"}
              </p>
              <p className="font-mono text-[10.5px] text-text-dim mt-0.5">
                {formatDate(`${row.date}T12:00:00Z`)}
                {row.dayGap !== 0 && ` · ${t.reconcile.dayGap(row.dayGap)}`}
              </p>
            </div>
            <Amount value={row.signedAmount} />
          </div>
        ))}
      </Section>

      <Section title={t.reconcile.extra} hint={t.reconcile.extraHint} count={extra.length}>
        {extra.map((row) => (
          <div
            key={row.id}
            className="flex items-center justify-between gap-3 py-2.5 border-t border-divider first:border-t-0"
          >
            <div className="min-w-0">
              <p className="text-[12.5px] text-text truncate">{row.description || "—"}</p>
              <p className="font-mono text-[10.5px] text-text-dim mt-0.5">
                {formatDate(row.date)}
              </p>
            </div>
            <Amount value={row.signedAmount} />
          </div>
        ))}
      </Section>
    </div>
  );
}

function MissingRowCard({
  row, edit, checked, accounts, categories, statementAccount, onToggle, onEdit,
}: {
  row: MissingRow;
  edit: RowEdit;
  checked: boolean;
  accounts: AccountOption[];
  categories: Category[];
  statementAccount: string;
  onToggle: () => void;
  onEdit: (patch: Partial<RowEdit>) => void;
}) {
  const t = useT();
  const arriving = row.signedAmount > 0;

  // Money that left the account is spending or a transfer out; money that
  // arrived is income or a transfer in. Nothing else is physically possible,
  // so nothing else is offered.
  const types: Array<{ value: TransactionType; label: string }> = [
    arriving
      ? { value: "Ingreso", label: t.txType.Ingreso }
      : { value: "Gasto", label: t.txType.Gasto },
    { value: "Transferencia", label: t.txType.Transferencia },
  ];

  const usable = categories.filter((c) =>
    edit.type === "Ingreso" ? c.kind === "income" : c.kind === "expense"
  );

  const needsCounterparty = edit.type === "Transferencia";
  const missingCounterparty = checked && needsCounterparty && !edit.counterparty;

  return (
    <div
      className={cn(
        "rounded-md border transition-colors duration-150",
        checked ? "border-accent/40 bg-surface-2" : "border-border bg-surface",
        missingCounterparty && "border-red/50"
      )}
    >
      <label className="flex items-center gap-3 px-3 py-2.5 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="w-4 h-4 shrink-0 accent-[var(--color-accent)]"
        />
        <span className="min-w-0 flex-1">
          <span className="block text-[12.5px] text-text truncate">
            {row.description || "—"}
          </span>
          <span className="block font-mono text-[10.5px] text-text-dim mt-0.5">
            {formatDate(`${row.date}T12:00:00Z`)}
          </span>
        </span>
        <Amount value={row.signedAmount} />
      </label>

      {checked && (
        <div className="px-3 pb-3 pt-0.5 space-y-2.5 border-t border-divider">
          <SegmentedControl
            options={types}
            value={edit.type}
            onChange={(value) => onEdit({ type: value })}
            label={t.reconcile.rowType}
          />

          {needsCounterparty ? (
            <Select
              block
              aria-label={arriving ? t.reconcile.rowCounterpartyIn : t.reconcile.rowCounterpartyOut}
              placeholder={t.reconcile.pickAccount}
              value={edit.counterparty ?? ""}
              onChange={(value) => onEdit({ counterparty: value || null })}
            >
              {accounts
                .filter((a) => a.account !== statementAccount)
                .map((a) => (
                  <option key={a.account} value={a.account}>
                    {a.account}
                  </option>
                ))}
            </Select>
          ) : (
            <Select
              block
              aria-label={t.reconcile.rowCategory}
              placeholder={t.reconcile.noCategory}
              value={edit.category ?? ""}
              onChange={(value) => onEdit({ category: value || null })}
            >
              {usable.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </Select>
          )}
        </div>
      )}
    </div>
  );
}

function Amount({ value }: { value: number }) {
  return (
    <span
      className={cn(
        "font-mono text-[12.5px] shrink-0 tabular-nums",
        value < 0 ? "text-text" : "text-green-fg"
      )}
    >
      {value > 0 && "+"}
      {formatMXNExact(value)}
    </span>
  );
}

function Section({
  title, hint, count, tone, defaultOpen, children,
}: {
  title: string;
  hint: string;
  count: number;
  tone?: "accent";
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen === true);

  return (
    <div className="panel px-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="press w-full flex items-center justify-between gap-3 py-3.5 text-left"
      >
        <span className="min-w-0">
          <span className="flex items-center gap-2">
            <span
              className={cn(
                "font-mono text-[13px] tabular-nums",
                tone === "accent" && count > 0 ? "text-accent" : "text-text"
              )}
            >
              {count}
            </span>
            <span className="text-[13.5px] text-text">{title}</span>
          </span>
          <span className="block text-[11.5px] text-text-dim mt-0.5">{hint}</span>
        </span>
        <ChevronDownIcon
          className={cn(
            "w-4 h-4 text-text-faint shrink-0 transition-transform duration-200 ease-out",
            open && "rotate-180"
          )}
        />
      </button>

      {open && <div className="pb-3">{children}</div>}
    </div>
  );
}
