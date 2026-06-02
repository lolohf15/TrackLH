"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/Card";
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
  const [expanded, setExpanded] = useState(false);

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
    <Card>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left focus:outline-none"
      >
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle>Ajuste de saldos actuales</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#8b949e]">{expanded ? "Ocultar" : "Configurar"}</span>
            <svg
              className={cn("w-3.5 h-3.5 text-[#6B7280] transition-transform duration-200", expanded && "rotate-180")}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </CardHeader>
      </button>

      {expanded && (
        <CardContent className="pt-0 space-y-5">
          {/* Info */}
          <div className="flex items-start gap-3 bg-amber-900/20 border border-amber-800/40 rounded-xl px-4 py-3">
            <svg className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-amber-400 leading-relaxed">
              Escribe el saldo real actual de cada cuenta. La app calculará un ajuste local para que el saldo mostrado coincida.{" "}
              <span className="font-semibold">No se modifica Notion.</span>
            </p>
          </div>

          {/* Load error */}
          {loadError && (
            <div className="flex items-center justify-between bg-red-900/20 border border-red-800/40 rounded-xl px-4 py-3">
              <p className="text-xs text-[#f85149]">{loadError}</p>
              <button
                onClick={loadAccounts}
                className="text-xs text-[#3fb950] hover:text-[#4fc461] underline underline-offset-2 transition-colors ml-4 shrink-0"
              >
                Reintentar
              </button>
            </div>
          )}

          {/* Skeleton */}
          {loading && !loadError && (
            <div className="space-y-2.5">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-[120px] rounded-xl" />
              ))}
            </div>
          )}

          {/* Account groups */}
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
        </CardContent>
      )}
    </Card>
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
      <p className="text-xs font-semibold text-[#8b949e] uppercase tracking-widest">{title}</p>
      <div className="border border-[#21262d] rounded-xl overflow-hidden divide-y divide-[#21262d]">
        {accounts.map((a) => (
          <AccountRow
            key={a.account}
            account={a}
            row={rows[a.account]}
            onUpdate={(patch) => onUpdate(a.account, patch)}
            onSave={() => onSave(a.account)}
          />
        ))}
      </div>
    </div>
  );
}

function AccountRow({
  account, row, onUpdate, onSave,
}: {
  account: AccountConfig;
  row: RowState | undefined;
  onUpdate: (patch: Partial<RowState>) => void;
  onSave: () => void;
}) {
  if (!row) return null;
  const color = account.color ?? ACCOUNT_COLORS[account.account] ?? "#6B7280";

  const adjustmentSign = account.balanceAdjustment >= 0 ? "+" : "";
  const hasAdjustment = account.balanceAdjustment !== 0;

  return (
    <div className="px-4 py-4 bg-[#161b22] hover:bg-[#1c2128] transition-colors">
      {/* Account header */}
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <span className="text-sm font-semibold text-[#e6edf3]">{account.account}</span>
        <span className={cn(
          "text-xs px-2 py-0.5 rounded-full font-medium border",
          account.isCredit
            ? "bg-purple-900/20 text-purple-400 border-purple-800/40"
            : "bg-[#21262d] text-[#8b949e] border-[#30363d]"
        )}>
          {account.isCredit ? "Crédito" : "Débito"}
        </span>
      </div>

      {/* Balance breakdown */}
      <div className="flex flex-wrap gap-x-5 gap-y-1.5 mb-3 text-xs">
        <span className="text-[#6B7280]">
          Calculado:{" "}
          <span className="text-[#c9d1d9] tabular-nums">{formatMXN(account.calculatedBalance)}</span>
        </span>
        {hasAdjustment && (
          <span className="text-[#6B7280]">
            Ajuste:{" "}
            <span className={cn(
              "tabular-nums font-medium",
              account.balanceAdjustment >= 0 ? "text-[#3fb950]" : "text-[#f85149]"
            )}>
              {adjustmentSign}{formatMXN(account.balanceAdjustment)}
            </span>
          </span>
        )}
        <span className="text-[#6B7280]">
          Mostrado:{" "}
          <span className="text-[#e6edf3] font-semibold tabular-nums">{formatMXN(account.currentBalance)}</span>
        </span>
      </div>

      {/* Input row */}
      <div className="flex flex-wrap items-end gap-2.5">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-[#8b949e]">Saldo actual real (MXN)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#6B7280] pointer-events-none">
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
                "w-44 pl-7 pr-3 py-2 text-sm rounded-xl bg-[#0d1117] text-[#e6edf3] tabular-nums",
                "focus:outline-none focus:ring-1 focus:ring-[#238636]/50 transition-all",
                row.error
                  ? "border border-red-700"
                  : "border border-[#30363d] hover:border-[#484f58]"
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

      {/* Feedback */}
      <div className="mt-2.5 min-h-[16px]">
        {row.error && (
          <p className="text-xs text-[#f85149]">✗ {row.error}</p>
        )}
        {row.savedAt && !row.error && (
          <p className="text-xs text-[#3fb950]">
            ✓ Saldos actualizados. Se aplicó un ajuste local sin modificar Notion.
          </p>
        )}
        {!row.savedAt && !row.error && account.adjustmentDate && (
          <p className="text-xs text-[#8b949e]">
            Último ajuste: {formatDate(account.adjustmentDate)}
          </p>
        )}
      </div>
    </div>
  );
}
