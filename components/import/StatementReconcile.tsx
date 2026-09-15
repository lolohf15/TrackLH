"use client";

import { useRef, useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { ColumnMapper } from "@/components/import/ColumnMapper";
import { ReconcileReview, type RowEdit } from "@/components/import/ReconcileReview";
import { ImportHistory } from "@/components/import/ImportHistory";
import { ChevronDownIcon, DownloadIcon } from "@/components/shell/icons";
import { cn, formatMXNExact, formatDate } from "@/lib/utils";
import { useT } from "@/lib/i18n-react";
import type { Catalog, MissingRow, StatementColumns, StatementPreview } from "@/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

/**
 * The reconciliation flow, start to finish.
 *
 * Two server round trips and nothing in between: `preview` reads the file and
 * compares it against the ledger without writing, and `commit` takes only the
 * rows that survived review. Re-reading with a corrected mapping is just
 * another preview, which is why the file stays in state the whole time.
 */
export function StatementReconcile() {
  const t = useT();
  const { data: catalog } = useSWR<Catalog>("/api/catalog", fetcher);
  const { mutate: refreshHistory } = useSWR("/api/import", fetcher);

  const fileInput = useRef<HTMLInputElement>(null);

  const [account, setAccount] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<StatementPreview | null>(null);
  const [columns, setColumns] = useState<StatementColumns | null>(null);
  const [headerLine, setHeaderLine] = useState<number | null>(null);
  const [invertSigns, setInvertSigns] = useState(false);

  const [selection, setSelection] = useState<Set<number>>(new Set());
  const [edits, setEdits] = useState<Record<number, RowEdit>>({});
  const [applyBalance, setApplyBalance] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<number | null>(null);
  const [showMapping, setShowMapping] = useState(false);

  const accounts = catalog?.accounts ?? [];
  const categories = [
    ...(catalog?.expenseCategories ?? []),
    ...(catalog?.incomeCategories ?? []),
  ];

  async function analyze(override?: {
    columns?: StatementColumns;
    headerLine?: number;
    invertSigns?: boolean;
  }) {
    if (!file || account === "") return;

    setBusy(true);
    setError(null);

    const form = new FormData();
    form.append("file", file);
    form.append("account", account);

    const nextColumns = override?.columns ?? columns;
    const nextHeader = override?.headerLine ?? headerLine;
    const nextInvert = override?.invertSigns ?? invertSigns;

    if (nextColumns) form.append("columns", JSON.stringify(nextColumns));
    if (nextHeader !== null) form.append("headerLine", String(nextHeader));
    if (nextInvert) form.append("invertSigns", "true");

    try {
      const res = await fetch("/api/import/preview", { method: "POST", body: form });
      const body = await res.json();

      if (!res.ok) throw new Error(body?.error ?? t.common.unknownError);

      const next = body as StatementPreview;
      setPreview(next);
      setColumns(next.columns);
      setHeaderLine(next.headerLine);
      setInvertSigns(next.invertSigns);
      seedReview(next.missing ?? []);

      // A file that read but yielded nothing needs the mapping controls open,
      // since that is the only thing left to change.
      if (next.error) setShowMapping(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.unknownError);
    } finally {
      setBusy(false);
    }
  }

  function seedReview(missing: MissingRow[]) {
    setSelection(new Set(missing.map((_, i) => i)));
    setEdits(
      Object.fromEntries(
        missing.map((row, i) => [
          i,
          {
            type: row.suggestedType,
            category: row.suggestedCategory,
            counterparty: null,
          } satisfies RowEdit,
        ])
      )
    );
    setApplyBalance(false);
  }

  async function commit() {
    if (!preview?.missing || !preview.account) return;

    const rows = preview.missing
      .map((row, index) => ({ row, edit: edits[index], index }))
      .filter(({ index }) => selection.has(index));

    if (rows.length === 0) {
      setError(t.reconcile.missingHint);
      return;
    }

    const incomplete = rows.some(
      ({ edit }) => edit.type === "Transferencia" && !edit.counterparty
    );
    if (incomplete) {
      setError(t.reconcile.pickAccount);
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/import/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account: preview.account.name,
          fileName: preview.fileName,
          rowsMatched: preview.matched?.length ?? 0,
          periodFrom: preview.period?.from ?? null,
          periodTo: preview.period?.to ?? null,
          closingBalance: canApplyBalance() && applyBalance ? preview.closingBalance : null,
          rows: rows.map(({ row, edit }) => ({
            date: row.date,
            signedAmount: row.signedAmount,
            type: edit.type,
            category: edit.category,
            counterparty: edit.counterparty,
            description: row.description,
          })),
        }),
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? t.common.unknownError);

      setDone(body.created ?? rows.length);
      await refreshHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.unknownError);
    } finally {
      setBusy(false);
    }
  }

  /** A statement's balance is the account's; a card's is the debt, its mirror. */
  function canApplyBalance(): boolean {
    return (
      preview?.closingBalance !== null &&
      preview?.closingBalance !== undefined &&
      preview.account?.isCredit === false
    );
  }

  function reset() {
    setFile(null);
    setPreview(null);
    setColumns(null);
    setHeaderLine(null);
    setInvertSigns(false);
    setSelection(new Set());
    setEdits({});
    setError(null);
    setDone(null);
    setShowMapping(false);
    if (fileInput.current) fileInput.current.value = "";
  }

  if (done !== null) {
    return (
      <div className="space-y-3">
        <div className="panel px-4 py-6 text-center space-y-1.5">
          <p className="text-[15px] font-semibold text-text">{t.reconcile.doneTitle}</p>
          <p className="text-[13px] text-text-muted">{t.reconcile.doneCount(done)}</p>
        </div>
        <Button className="w-full" onClick={reset}>
          {t.reconcile.again}
        </Button>
        <ImportHistory onChanged={refreshHistory} />
      </div>
    );
  }

  if (!preview) {
    return (
      <div className="space-y-3">
        <div className="panel px-4 py-4 space-y-3.5">
          <label className="block">
            <span className="block font-mono text-[10px] font-semibold text-text-dim uppercase tracking-[0.1em] pb-1.5">
              {t.reconcile.account}
            </span>
            <Select
              block
              aria-label={t.reconcile.account}
              placeholder={t.reconcile.pickAccount}
              value={account}
              onChange={setAccount}
            >
              {accounts.map((a) => (
                <option key={a.account} value={a.account}>
                  {a.account}
                </option>
              ))}
            </Select>
          </label>

          <div>
            <span className="block font-mono text-[10px] font-semibold text-text-dim uppercase tracking-[0.1em] pb-1.5">
              {t.reconcile.file}
            </span>
            <label
              className={cn(
                "press flex flex-col items-center justify-center gap-1.5 rounded-md border border-dashed px-4 py-7 cursor-pointer transition-colors duration-150",
                file ? "border-accent/50 bg-surface-2" : "border-border hover:border-border-strong"
              )}
            >
              <input
                ref={fileInput}
                type="file"
                accept=".csv,.xlsx,.xlsm,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="sr-only"
                onChange={(e) => {
                  setFile(e.target.files?.[0] ?? null);
                  setError(null);
                }}
              />
              <DownloadIcon className="w-4 h-4 text-text-faint rotate-180" />
              <span className="text-[13px] text-text text-center break-all">
                {file?.name ?? t.reconcile.filePick}
              </span>
              <span className="text-[11px] text-text-dim">{t.reconcile.fileFormats}</span>
            </label>
          </div>

          <Button
            className="w-full"
            loading={busy}
            disabled={!file || account === ""}
            onClick={() => analyze()}
          >
            {busy ? t.reconcile.analyzing : t.reconcile.analyze}
          </Button>

          {error && (
            <p role="alert" className="text-[11.5px] text-red-fg">
              {error}
            </p>
          )}
        </div>

        <ImportHistory onChanged={refreshHistory} />
      </div>
    );
  }

  // Null while the file read but produced nothing usable: the mapping panel
  // above is then the only thing on screen worth touching.
  const reconciled = preview.error ? null : preview.account;

  return (
    <div className="space-y-3">
      <div className="panel px-4 py-3.5">
        <p className="text-[13px] text-text truncate">{preview.fileName}</p>
        <p className="font-mono text-[10.5px] text-text-dim mt-1">
          {preview.period
            ? t.reconcile.period(
                formatDate(`${preview.period.from}T12:00:00Z`),
                formatDate(`${preview.period.to}T12:00:00Z`)
              )
            : t.reconcile.readCount(preview.parsedCount)}
          {preview.skipped > 0 && ` · ${t.reconcile.skippedCount(preview.skipped)}`}
        </p>
        {preview.truncated && (
          <p className="text-[11px] text-amber-fg mt-1.5">{t.reconcile.truncated}</p>
        )}
        {preview.error && (
          <p role="alert" className="text-[11.5px] text-red-fg mt-1.5">
            {preview.error}
          </p>
        )}
      </div>

      <div className="panel px-4">
        <button
          type="button"
          onClick={() => setShowMapping((s) => !s)}
          aria-expanded={showMapping}
          className="press w-full flex items-center justify-between gap-3 py-3.5 text-left"
        >
          <span className="min-w-0">
            <span className="block text-[13.5px] text-text">{t.reconcile.mappingTitle}</span>
            <span className="block text-[11.5px] text-text-dim mt-0.5">
              {t.reconcile.mappingHint}
            </span>
          </span>
          <ChevronDownIcon
            className={cn(
              "w-4 h-4 text-text-faint shrink-0 transition-transform duration-200 ease-out",
              showMapping && "rotate-180"
            )}
          />
        </button>

        {showMapping && columns && headerLine !== null && (
          <div className="pb-4">
            <ColumnMapper
              columns={columns}
              headerLine={headerLine}
              columnCount={preview.columnCount}
              sample={preview.sample}
              invertSigns={invertSigns}
              busy={busy}
              onChange={(role, index) => setColumns({ ...columns, [role]: index })}
              onHeaderLine={setHeaderLine}
              onInvertSigns={setInvertSigns}
              onReread={() => analyze()}
            />
          </div>
        )}
      </div>

      {reconciled && (
        <>
          <ReconcileReview
            matched={preview.matched ?? []}
            missing={preview.missing ?? []}
            extra={preview.extra ?? []}
            accounts={accounts}
            categories={categories}
            statementAccount={reconciled.name}
            selection={selection}
            edits={edits}
            onToggle={(index) =>
              setSelection((current) => {
                const next = new Set(current);
                if (next.has(index)) next.delete(index);
                else next.add(index);
                return next;
              })
            }
            onSelectAll={(all) =>
              setSelection(
                all ? new Set((preview.missing ?? []).map((_, i) => i)) : new Set()
              )
            }
            onEdit={(index, patch) =>
              setEdits((current) => ({ ...current, [index]: { ...current[index], ...patch } }))
            }
          />

          {canApplyBalance() && (
            <BalancePanel
              bank={preview.closingBalance ?? 0}
              // What the account will be worth once the picked rows exist,
              // not what it is worth now: the number worth showing is whether
              // this reconciliation ties out, and before the rows are added
              // the gap is only the rows themselves restated.
              projected={
                (preview.currentBalance ?? 0) +
                (preview.missing ?? []).reduce(
                  (sum, row, index) => (selection.has(index) ? sum + row.signedAmount : sum),
                  0
                )
              }
              pending={preview.extra?.length ?? 0}
              apply={applyBalance}
              onApply={setApplyBalance}
            />
          )}

          <Button className="w-full" loading={busy} onClick={commit}>
            {busy ? t.reconcile.saving : t.reconcile.commit(selection.size)}
          </Button>
        </>
      )}

      {error && (
        <p role="alert" className="text-[11.5px] text-red-fg px-1">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={reset}
        className="press w-full py-2.5 text-[12.5px] text-text-dim hover:text-text transition-colors duration-150"
      >
        {t.reconcile.startOver}
      </button>
    </div>
  );
}

/**
 * Where the account lands against what the bank printed.
 *
 * Credit accounts never get here: their statements quote a debt, which is the
 * mirror of the balance this app stores, and offering to set one to the other
 * would write the sign in backwards.
 */
function BalancePanel({
  bank, projected, pending, apply, onApply,
}: {
  bank: number;
  projected: number;
  /** Movements the ledger has that the statement doesn't. */
  pending: number;
  apply: boolean;
  onApply: (value: boolean) => void;
}) {
  const t = useT();
  const difference = bank - projected;
  const tiesOut = Math.abs(difference) < 0.005;

  return (
    <div className="panel px-4 py-4 space-y-3">
      <p className="font-mono text-[10px] font-semibold text-text-dim uppercase tracking-[0.1em]">
        {t.reconcile.balance}
      </p>

      <Row label={t.reconcile.balanceBank} value={formatMXNExact(bank)} />
      <Row label={t.reconcile.balanceApp} value={formatMXNExact(projected)} />

      <div className="flex items-center justify-between gap-3 border-t border-divider pt-3">
        <span className="text-[12.5px] text-text-muted">{t.reconcile.balanceDiff}</span>
        <span
          className={cn(
            "font-mono text-[13px] tabular-nums",
            tiesOut ? "text-green-fg" : "text-text"
          )}
        >
          {formatMXNExact(difference)}
        </span>
      </div>

      {/* A movement the bank hasn't posted yet is a gap that closes itself,
          so adjusting over it writes a plug that goes stale on its own. */}
      {pending > 0 && (
        <p className="text-[11.5px] text-amber-fg leading-relaxed">
          {t.reconcile.balancePending(pending)}
        </p>
      )}

      <label className="flex items-start gap-2.5 cursor-pointer pt-0.5">
        <input
          type="checkbox"
          checked={apply}
          onChange={(e) => onApply(e.target.checked)}
          className="mt-0.5 w-4 h-4 shrink-0 accent-[var(--color-accent)]"
        />
        <span className="text-[12.5px] text-text-muted leading-snug">
          {t.reconcile.balanceApply}
        </span>
      </label>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[12.5px] text-text-muted">{label}</span>
      <span className="font-mono text-[13px] text-text tabular-nums">{value}</span>
    </div>
  );
}
