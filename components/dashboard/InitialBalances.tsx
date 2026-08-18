"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatMXN, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { ACCOUNT_COLORS } from "@/types";

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
  const [accounts, setAccounts] = useState<AccountConfig[]>([]);
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
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
      const msg = err instanceof Error ? err.message : "Error desconocido";
      setLoadError(msg);
      console.error("[InitialBalances] load error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);

  function updateRow(account: string, patch: Partial<RowState>) {
    setRows((prev) => ({ ...prev, [account]: { ...prev[account], ...patch } }));
  }

  async function save(account: string) {
    const row = rows[account];
    if (!row) return;

    const trimmed = row.desiredBalance.trim();
    if (trimmed === "") {
      updateRow(account, { error: "El saldo no puede estar vacío" });
      return;
    }
    const parsed = Number(trimmed);
    if (!isFinite(parsed)) {
      updateRow(account, { error: "Ingresa un número válido" });
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
        updateRow(account, { saving: false, error: body?.error ?? "Error al guardar" });
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
      const msg = err instanceof Error ? err.message : "Error de red";
      updateRow(account, { saving: false, error: msg });
      console.error("[InitialBalances] save error:", err);
    }
  }

  const debit  = accounts.filter((a) => !a.isCredit);
  const credit = accounts.filter((a) =>  a.isCredit);

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 bg-amber-bg border border-amber-border rounded-xl px-4 py-3">
        <svg className="w-4 h-4 text-amber-fg mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-xs text-amber-fg leading-relaxed">
          Escribe el saldo real actual de cada cuenta. La app calculará un ajuste local para que el saldo mostrado coincida.{" "}
          <span className="font-semibold">No se modifica Notion.</span>
        </p>
      </div>

      {loadError && (
        <div className="flex items-center justify-between bg-red-bg border border-red-border rounded-xl px-4 py-3">
          <p className="text-xs text-red-fg">{loadError}</p>
          <button
            onClick={loadAccounts}
            className="text-xs text-green-fg hover:text-[#6EE7A0] underline underline-offset-2 transition-colors ml-4 shrink-0"
          >
            Reintentar
          </button>
        </div>
      )}

      {loading && !loadError && (
        <div className="space-y-2.5">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-[120px] rounded-xl" />
          ))}
        </div>
      )}

      {!loading && !loadError && (
        <>
          {debit.length > 0 && (
            <AccountGroup title="Débito" accounts={debit} rows={rows} onUpdate={updateRow} onSave={save} />
          )}
          {credit.length > 0 && (
            <AccountGroup title="Crédito" accounts={credit} rows={rows} onUpdate={updateRow} onSave={save} />
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
      <p className="text-xs font-semibold text-text-dim uppercase tracking-widest">{title}</p>
      <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
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
  if (!row) return null;
  const color = account.color ?? ACCOUNT_COLORS[account.account] ?? "#737373";

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
          "text-xs px-2 py-0.5 rounded-full font-medium border",
          account.isCredit
            ? "bg-[#2A1A3D] text-violet-fg border-[#3D2A55]"
            : "bg-surface-2 text-text-dim border-border-strong"
        )}>
          {account.isCredit ? "Crédito" : "Débito"}
        </span>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-1.5 mb-3 text-xs">
        <span className="text-text-faint">
          Calculado:{" "}
          <span className="text-text-muted tabular-nums">{formatMXN(account.calculatedBalance)}</span>
        </span>
        {hasAdjustment && (
          <span className="text-text-faint">
            Ajuste:{" "}
            <span className={cn(
              "tabular-nums font-medium",
              account.balanceAdjustment >= 0 ? "text-green-fg" : "text-red-fg"
            )}>
              {adjustmentSign}{formatMXN(account.balanceAdjustment)}
            </span>
          </span>
        )}
        <span className="text-text-faint">
          Mostrado:{" "}
          <span className="text-text font-semibold tabular-nums">{formatMXN(account.currentBalance)}</span>
        </span>
      </div>

      <div className="flex flex-wrap items-end gap-2.5">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-text-dim">Saldo actual real (MXN)</label>
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
                "w-44 pl-7 pr-3 py-2 text-sm rounded-xl bg-bg text-text tabular-nums",
                "focus:outline-none focus:ring-1 focus:ring-green/50 transition-colors duration-150",
                row.error
                  ? "border border-red/70"
                  : "border border-border-strong hover:border-[#4a4a4a]"
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
          Guardar
        </Button>
      </div>

      <div className="mt-2.5 min-h-[16px]">
        {row.error && (
          <p className="text-xs text-red-fg">✗ {row.error}</p>
        )}
        {row.savedAt && !row.error && (
          <p className="text-xs text-green-fg">
            ✓ Saldos actualizados. Se aplicó un ajuste local sin modificar Notion.
          </p>
        )}
        {!row.savedAt && !row.error && account.adjustmentDate && (
          <p className="text-xs text-text-dim">
            Último ajuste: {formatDate(account.adjustmentDate)}
          </p>
        )}
      </div>
    </div>
  );
}
