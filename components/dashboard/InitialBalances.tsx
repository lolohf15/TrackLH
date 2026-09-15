"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatMXN, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { UNKNOWN_COLOR } from "@/types";
import { useT } from "@/lib/i18n-react";

interface AccountConfig {
  id: number;
  account: string;
  initialBalance: number;
  initialBalanceDate: string | null;
  balanceAdjustment: number;
  adjustmentDate: string | null;
  calculatedBalance: number;
  currentBalance: number;
  isCredit: boolean;
  color: string | null;
  createdAt: string;
  updatedAt: string;
}

interface RowState {
  desiredBalance: string;
  saving: boolean;
  savedAt: string | null;
  error: string | null;
  dirty: boolean;
}

interface Props { onSaved: () => void }

export function InitialBalances({ onSaved }: Props) {
  const t = useT();
  const [accounts, setAccounts] = useState<AccountConfig[]>([]);
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/accounts");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `Error ${res.status}`);
      }
      const data: AccountConfig[] = await res.json();
      setAccounts(data);
      setRows((prev) => {
        const next: Record<string, RowState> = {};
        for (const a of data) {
          next[a.account] = prev[a.account]?.dirty
            ? prev[a.account]
            : {
                desiredBalance: String(a.currentBalance),
                saving: false,
                savedAt: null,
                error: null,
                dirty: false,
              };
        }
        return next;
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : t.common.unknownError;
      setLoadError(msg);
      console.error("[InitialBalances] load error:", err);
    } finally {
      setLoading(false);
    }
  }, [t.common.unknownError]);

  // Plain fetch-on-mount: the panel needs the write-back response shape that
  // `save()` also consumes, which is why it isn't on SWR like the read-only
  // views. The rule can't tell that apart from a render-loop.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadAccounts(); }, [loadAccounts]);

  // The first pass already starts in the loading state, so only a manual
  // re-fetch has to put it back there.
  function refresh() {
    setLoading(true);
    setLoadError(null);
    loadAccounts();
  }

  function updateRow(account: string, patch: Partial<RowState>) {
    setRows((prev) => ({ ...prev, [account]: { ...prev[account], ...patch } }));
  }

  async function save(account: string) {
    const row = rows[account];
    if (!row) return;

    const trimmed = row.desiredBalance.trim();
    if (trimmed === "") {
      updateRow(account, { error: t.balances.emptyBalance });
      return;
    }
    const parsed = Number(trimmed);
    if (!isFinite(parsed)) {
      updateRow(account, { error: t.balances.invalidNumber });
      return;
    }

    updateRow(account, { saving: true, error: null });

    try {
      const res = await fetch("/api/accounts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account, desiredBalance: parsed }),
      });

      const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));

      if (!res.ok) {
        updateRow(account, { saving: false, error: body?.error ?? t.balances.saveError });
        return;
      }

      const updated = body as AccountConfig;
      setAccounts((prev) => prev.map((a) => (a.account === account ? updated : a)));
      updateRow(account, {
        saving: false,
        savedAt: new Date().toISOString(),
        dirty: false,
        error: null,
        desiredBalance: String(updated.currentBalance),
      });
      onSaved();
    } catch (err) {
      const msg = err instanceof Error ? err.message : t.balances.networkError;
      updateRow(account, { saving: false, error: msg });
      console.error("[InitialBalances] save error:", err);
    }
  }

  const debit  = accounts.filter((a) => !a.isCredit);
  const credit = accounts.filter((a) =>  a.isCredit);

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-md bg-amber-bg border border-amber-border px-4 py-3">
        <svg className="w-4 h-4 text-amber-fg mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-xs text-amber-fg leading-relaxed">
          {t.balances.intro}{" "}
          <span className="font-semibold">{t.balances.movementsUnchanged}</span>
        </p>
      </div>

      {loadError && (
        <div className="flex items-center justify-between rounded-md bg-red-bg border border-red-border px-4 py-3">
          <p className="text-xs text-red-fg">{loadError}</p>
          <button
            onClick={refresh}
            className="text-xs text-accent hover:brightness-125 underline underline-offset-2 transition-colors ml-4 shrink-0"
          >
            {t.balances.retry}
          </button>
        </div>
      )}

      {loading && !loadError && (
        <div className="space-y-2.5">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-[120px]" />
          ))}
        </div>
      )}

      {!loading && !loadError && (
        <>
          {debit.length > 0 && (
            <AccountGroup title={t.wallet.debit} accounts={debit} rows={rows} onUpdate={updateRow} onSave={save} />
          )}
          {credit.length > 0 && (
            <AccountGroup title={t.wallet.credit} accounts={credit} rows={rows} onUpdate={updateRow} onSave={save} />
          )}
        </>
      )}
    </div>
  );
}

function AccountGroup({
  title, accounts, rows, onUpdate, onSave,
}: {
  title: string;
  accounts: AccountConfig[];
  rows: Record<string, RowState>;
  onUpdate: (account: string, patch: Partial<RowState>) => void;
  onSave: (account: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="font-mono text-[10px] font-semibold text-text-dim uppercase tracking-[0.1em]">{title}</p>
      <div className="panel divide-y divide-divider">
        {accounts.map((a, i) => (
          <AccountRow
            key={a.account}
            account={a}
            row={rows[a.account]}
            index={i}
            onUpdate={(patch) => onUpdate(a.account, patch)}
            onSave={() => onSave(a.account)}
          />
        ))}
      </div>
    </div>
  );
}

function AccountRow({
  account, row, index, onUpdate, onSave,
}: {
  account: AccountConfig;
  row: RowState | undefined;
  index: number;
  onUpdate: (patch: Partial<RowState>) => void;
  onSave: () => void;
}) {
  const t = useT();
  if (!row) return null;
  const color = account.color ?? UNKNOWN_COLOR;

  const adjustmentSign = account.balanceAdjustment >= 0 ? "+" : "";
  const hasAdjustment = account.balanceAdjustment !== 0;

  return (
    <div
      className="px-4 py-4 bg-surface transition-colors duration-150 ease-out hover:bg-surface-2 animate-fade-in-up"
      style={{ animationDelay: `${Math.min(index, 6) * 30}ms` }}
    >
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <span className="text-sm font-semibold text-text">{account.account}</span>
        <span className={cn(
          "font-mono text-[10px] px-1.5 py-0.5 font-medium border uppercase tracking-wide",
          account.isCredit
            ? "bg-red-bg text-red-fg border-red-border"
            : "bg-surface-2 text-text-dim border-border-strong"
        )}>
          {account.isCredit ? t.wallet.credit : t.wallet.debit}
        </span>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-1.5 mb-3 text-xs">
        <span className="text-text-faint">
          {t.balances.calculated}:{" "}
          <span className="text-text-muted tabular-nums">{formatMXN(account.calculatedBalance)}</span>
        </span>
        {hasAdjustment && (
          <span className="text-text-faint">
            {t.balances.adjustment}:{" "}
            <span className={cn(
              "tabular-nums font-medium",
              account.balanceAdjustment >= 0 ? "text-green-fg" : "text-red-fg"
            )}>
              {adjustmentSign}{formatMXN(account.balanceAdjustment)}
            </span>
          </span>
        )}
        <span className="text-text-faint">
          {t.balances.shown}:{" "}
          <span className="text-text font-semibold tabular-nums">{formatMXN(account.currentBalance)}</span>
        </span>
      </div>

      <div className="flex flex-wrap items-end gap-2.5">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-text-dim">{t.balances.currentBalance}</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-faint pointer-events-none">
              $
            </span>
            <input
              type="number"
              step="0.01"
              value={row.desiredBalance}
              onChange={(e) =>
                onUpdate({ desiredBalance: e.target.value, dirty: true, savedAt: null, error: null })
              }
              onKeyDown={(e) => { if (e.key === "Enter" && row.dirty) onSave(); }}
              className={cn(
                "w-44 rounded-md pl-7 pr-3 py-2 text-sm font-mono bg-bg text-text tabular-nums",
                "focus:outline-none focus:ring-1 focus:ring-accent/50 transition-colors duration-150",
                row.error
                  ? "border border-red-fg/70"
                  : "border border-border-strong hover:border-text-faint"
              )}
              placeholder="0.00"
            />
          </div>
        </div>

        <Button
          onClick={onSave}
          loading={row.saving}
          disabled={!row.dirty}
          variant="primary"
          size="sm"
          className="mb-0.5"
        >
          {t.common.save}
        </Button>
      </div>

      <div className="mt-2.5 min-h-[16px]">
        {row.error && (
          <p className="text-xs text-red-fg">✗ {row.error}</p>
        )}
        {row.savedAt && !row.error && (
          <p className="text-xs text-green-fg">
            ✓ {t.balances.saved}
          </p>
        )}
        {!row.savedAt && !row.error && account.adjustmentDate && (
          <p className="text-xs text-text-dim">
            {t.balances.lastAdjustment}: {formatDate(account.adjustmentDate)}
          </p>
        )}
      </div>
    </div>
  );
}
