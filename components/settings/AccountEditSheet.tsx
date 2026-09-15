"use client";

import { useState } from "react";
import { mutate } from "swr";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { ColorPicker, PALETTE } from "./ColorPicker";
import { useT } from "@/lib/i18n-react";


export interface EditableAccount {
  id: number;
  account: string;
  isCredit: boolean;
  creditLimit: number | null;
  color: string | null;
}

interface Props {
  /** Null means "create a new one". */
  account: EditableAccount | null;
  open: boolean;
  onClose: () => void;
}

export function AccountEditSheet({ account, open, onClose }: Props) {
  const t = useT();
  const isNew = account === null;
  const kinds = [
    { value: "debit" as const, label: t.wallet.debit },
    { value: "credit" as const, label: t.wallet.credit },
  ];

  const [name, setName] = useState(account?.account ?? "");
  const [isCredit, setIsCredit] = useState(account?.isCredit ?? false);
  const [creditLimit, setCreditLimit] = useState(
    account?.creditLimit != null ? String(account.creditLimit) : ""
  );
  const [color, setColor] = useState(account?.color ?? PALETTE[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const renamed = !isNew && name.trim() !== account.account;

  async function save() {
    if (busy || name.trim() === "") return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(isNew ? "/api/accounts" : `/api/accounts/${account.id}`, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account: name.trim(), isCredit, creditLimit, color }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload?.error ?? t.common.saveFailed);
        setBusy(false);
        return;
      }
      mutate((key) => typeof key === "string" && key.startsWith("/api/"));
      onClose();
    } catch {
      setError(t.common.offline);
      setBusy(false);
    }
  }

  async function remove() {
    if (busy || isNew) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/accounts/${account.id}`, { method: "DELETE" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload?.error ?? t.common.deleteFailed);
        setBusy(false);
        setConfirmingDelete(false);
        return;
      }
      mutate((key) => typeof key === "string" && key.startsWith("/api/"));
      onClose();
    } catch {
      setError(t.common.offline);
      setBusy(false);
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={isNew ? t.accountSheet.newTitle : t.accountSheet.editTitle}>
      <div className="pb-6 space-y-5">
        <Field label={t.common.name}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.accountSheet.namePlaceholder}
            aria-label={t.accountSheet.nameLabel}
            autoFocus={isNew}
            className="w-full rounded-md bg-surface-2 border border-border px-3.5 py-3 min-h-[48px] text-[15px] text-text outline-none placeholder:text-text-faint focus:border-accent/60 transition-colors duration-150"
          />
        </Field>

        <Field label={t.common.kind}>
          <SegmentedControl
            options={kinds}
            value={isCredit ? "credit" : "debit"}
            onChange={(v) => setIsCredit(v === "credit")}
            label={t.accountSheet.kindLabel}
          />
        </Field>

        {isCredit && (
          <Field label={t.accountSheet.creditLimit}>
            <div className="flex items-baseline gap-2 rounded-md border border-border bg-surface-2 px-3.5 py-2.5 focus-within:border-accent/60 transition-colors duration-150">
              <span className="font-mono text-lg text-text-dim">$</span>
              <input
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value.replace(/[^\d.]/g, ""))}
                inputMode="decimal"
                placeholder="0"
                aria-label={t.accountSheet.creditLimit}
                className="flex-1 min-w-0 bg-transparent font-mono text-[19px] font-semibold text-text tabular-nums outline-none placeholder:text-text-faint"
              />
            </div>
            <span className="block text-[11.5px] text-text-dim leading-relaxed pt-0.5">
              {t.accountSheet.creditLimitHint}
            </span>
          </Field>
        )}

        <Field label={t.common.color}>
          <ColorPicker value={color} onChange={setColor} />
        </Field>

        {renamed && (
          <p className="rounded-sm bg-amber-bg border border-amber-border text-amber-fg text-xs px-3.5 py-2.5 leading-relaxed">
            {t.accountSheet.renameWarning(name.trim())}
          </p>
        )}

        {error && (
          <p className="rounded-sm bg-red-bg border border-red-border text-red-fg text-xs px-3.5 py-2.5 leading-relaxed">
            {error}
          </p>
        )}

        <Button
          onClick={save}
          disabled={name.trim() === ""}
          loading={busy && !confirmingDelete}
          size="lg"
          className="w-full py-3.5"
        >
          {isNew ? t.wallet.addAccount : t.common.saveChanges}
        </Button>

        {!isNew &&
          (confirmingDelete ? (
            <div className="flex gap-2.5">
              <Button variant="secondary" size="lg" className="flex-1 py-3.5"
                onClick={() => setConfirmingDelete(false)}>
                {t.common.cancel}
              </Button>
              <Button variant="danger" size="lg" className="flex-1 py-3.5" loading={busy}
                onClick={remove}>
                {t.accountSheet.confirmDelete}
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="press w-full font-mono text-[10.5px] text-red-fg uppercase tracking-wide py-2.5"
            >
              {t.accountSheet.deleteAccount}
            </button>
          ))}
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
