"use client";

import { useEffect, useRef, useState } from "react";
import { mutate } from "swr";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { CheckIcon } from "@/components/shell/icons";
import { cn, getToday, withLocalTime } from "@/lib/utils";
import {
  ALL_ACCOUNTS,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  VALID_TRANSACTION_TYPES,
  type TransactionType,
} from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
}

const DEFAULT_ACCOUNT = "Revolut";

export function AddRecordSheet({ open, onClose }: Props) {
  const [type, setType] = useState<TransactionType>("Gasto");
  const [account, setAccount] = useState<string>(DEFAULT_ACCOUNT);
  const [toAccount, setToAccount] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [day, setDay] = useState(getToday());

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // A fresh slate per opening comes from the remount `AddRecordButton` forces,
  // so there's nothing to reset here — only the pending auto-close to cancel.
  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  const isTransfer = type === "Transferencia";
  const categories = type === "Ingreso" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const parsedAmount = Number(amount);

  const canSubmit =
    !saving &&
    isFinite(parsedAmount) &&
    parsedAmount > 0 &&
    !!account &&
    (isTransfer ? !!toAccount && toAccount !== account : !!category);

  async function submit() {
    if (!canSubmit) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          account,
          toAccount: isTransfer ? toAccount : undefined,
          category: isTransfer ? undefined : category,
          amount: parsedAmount,
          date: withLocalTime(day),
          description: description.trim() || undefined,
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload?.error ?? "No se pudo guardar el movimiento");
        return;
      }

      setSaved(true);
      // Refresh every view that reads from the API, so the new row shows up
      // without a manual reload.
      mutate((key) => typeof key === "string" && key.startsWith("/api/"));
      closeTimer.current = setTimeout(onClose, 700);
    } catch {
      setError("Sin conexión. Revisa tu red e inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Nuevo movimiento">
      <div className="pb-6 space-y-5">
        {/* Tipo — a pill riding inside a track, the way iOS segments work */}
        <div className="grid grid-cols-3 gap-1 rounded-md bg-surface-2 p-1">
          {VALID_TRANSACTION_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setType(t);
                setCategory("");
              }}
              aria-pressed={type === t}
              className={cn(
                "press rounded-sm font-mono text-[11px] font-medium uppercase tracking-wide py-2.5 min-h-[40px]",
                "transition-colors duration-150 ease-out",
                type === t ? "bg-accent text-white shadow-panel" : "text-text-dim"
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Monto — the one field that always matters, so it leads */}
        <Field label="Monto">
          <div className="flex items-baseline gap-2 rounded-md border border-border bg-surface-2 px-3.5 py-2.5 focus-within:border-accent/60 transition-colors duration-150">
            <span className="font-mono text-2xl text-text-dim">$</span>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
              inputMode="decimal"
              placeholder="0"
              aria-label="Monto"
              className="flex-1 min-w-0 bg-transparent font-mono text-[30px] font-semibold text-text tabular-nums outline-none placeholder:text-text-faint"
            />
          </div>
        </Field>

        <Field label={isTransfer ? "Cuenta origen" : "Cuenta"}>
          <Select value={account} onChange={setAccount} block aria-label="Cuenta">
            {ALL_ACCOUNTS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </Select>
        </Field>

        {isTransfer ? (
          <Field label="Cuenta destino">
            <Select
              value={toAccount}
              onChange={setToAccount}
              placeholder="Selecciona una cuenta"
              block
              aria-label="Cuenta destino"
            >
              {ALL_ACCOUNTS.filter((a) => a !== account).map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </Select>
          </Field>
        ) : (
          <Field label="Categoría">
            <Select
              value={category}
              onChange={setCategory}
              placeholder="Selecciona una categoría"
              block
              aria-label="Categoría"
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
          </Field>
        )}

        <Field label="Nota (opcional)">
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ej. Oxxo"
            aria-label="Nota"
            className="w-full rounded-md bg-surface-2 border border-border px-3.5 py-3 min-h-[48px] text-[15px] text-text outline-none placeholder:text-text-faint focus:border-accent/60 transition-colors duration-150"
          />
        </Field>

        <Field label="Fecha">
          <input
            type="date"
            value={day}
            max={getToday()}
            onChange={(e) => setDay(e.target.value)}
            aria-label="Fecha"
            className="w-full rounded-md bg-surface-2 border border-border px-3.5 py-3 min-h-[48px] font-mono text-[15px] text-text outline-none focus:border-accent/60 transition-colors duration-150"
          />
        </Field>

        {error && (
          <p className="rounded-sm bg-red-bg border border-red-border text-red-fg text-xs px-3.5 py-2.5">
            {error}
          </p>
        )}

        <Button
          onClick={submit}
          disabled={!canSubmit}
          loading={saving}
          size="lg"
          className={cn("w-full py-3.5", saved && "bg-green-fg")}
        >
          {saved ? (
            <>
              <CheckIcon className="w-4 h-4" />
              Guardado
            </>
          ) : (
            "Guardar movimiento"
          )}
        </Button>
      </div>
    </BottomSheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="font-mono text-[10px] font-semibold text-text-dim uppercase tracking-[0.1em]">
        {label}
      </span>
      {children}
    </label>
  );
}
