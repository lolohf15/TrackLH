"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import useSWR, { mutate } from "swr";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { CheckIcon } from "@/components/shell/icons";
import { cn, getToday, withLocalTime } from "@/lib/utils";
import { useT } from "@/lib/i18n-react";
import {
  VALID_TRANSACTION_TYPES,
  type Catalog,
  type Transaction,
  type TransactionType,
} from "@/types";


interface Props {
  open: boolean;
  onClose: () => void;
  /** Null (or absent) means a brand-new movement. */
  transaction?: Transaction | null;
  /** Opens straight into the delete confirm step — the swipe-to-delete row
   *  action skips the trip through the form to get there by hand. */
  initialConfirmingDelete?: boolean;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

/** The same three colours every list, amount and dot in the app already uses
 *  for these types — so picking one here rehearses reading one later. */
const TYPE_TONES: Record<TransactionType, string> = {
  Gasto: "var(--color-red)",
  Ingreso: "var(--color-green)",
  Transferencia: "var(--color-blue)",
};

/** The stored clock, as `YYYY-MM-DD`. Rows are wall clocks pinned to UTC. */
function dayOf(iso: string): string {
  return iso.slice(0, 10);
}

/**
 * Keep the original time of day when only the date is changed, so editing a
 * note doesn't silently move a movement to midday.
 */
function keepClock(iso: string, day: string): string {
  return `${day}T${iso.slice(11, 19)}`;
}

export function TransactionSheet({
  open,
  onClose,
  transaction = null,
  initialConfirmingDelete = false,
}: Props) {
  const isEdit = transaction !== null;
  const t = useT();
  // The value stays the stored Spanish one the rules compare against; only
  // what the button says changes with the language.
  const typeOptions = VALID_TRANSACTION_TYPES.map((type) => ({
    value: type,
    label: t.txType[type],
    tone: TYPE_TONES[type],
  }));
  // The options come from the same rows the server validates against, so the
  // form can never offer something the POST would reject.
  const { data: catalog } = useSWR<Catalog>("/api/catalog", fetcher);
  const accounts = catalog?.accounts ?? [];

  const [type, setType] = useState<TransactionType>(transaction?.type ?? "Gasto");
  const [account, setAccount] = useState<string>(transaction?.account ?? "");
  const [toAccount, setToAccount] = useState(transaction?.toAccount ?? "");
  const [category, setCategory] = useState(transaction?.category ?? "");
  const [amount, setAmount] = useState(transaction ? String(transaction.amount) : "");
  const [description, setDescription] = useState(transaction?.description ?? "");
  const [day, setDay] = useState(transaction ? dayOf(transaction.date) : getToday());
  const [confirmingDelete, setConfirmingDelete] = useState(initialConfirmingDelete);

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
  const categories =
    type === "Ingreso" ? catalog?.incomeCategories ?? [] : catalog?.expenseCategories ?? [];
  const parsedAmount = Number(amount);

  // Nothing selected yet and the catalog just arrived: lead with the first
  // account rather than an empty select the user has to open.
  const selectedAccount = account || accounts[0]?.account || "";

  const canSubmit =
    !saving &&
    isFinite(parsedAmount) &&
    parsedAmount > 0 &&
    !!selectedAccount &&
    (isTransfer ? !!toAccount && toAccount !== selectedAccount : !!category);

  async function submit() {
    if (!canSubmit) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(
        isEdit ? `/api/transactions/${encodeURIComponent(transaction.id)}` : "/api/transactions",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type,
            account: selectedAccount,
            toAccount: isTransfer ? toAccount : undefined,
            category: isTransfer ? undefined : category,
            amount: parsedAmount,
            date: isEdit ? keepClock(transaction.date, day) : withLocalTime(day),
            description: description.trim() || undefined,
          }),
        }
      );

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload?.error ?? t.txSheet.saveFailed);
        return;
      }

      setSaved(true);
      // Refresh every view that reads from the API, so the new row shows up
      // without a manual reload.
      mutate((key) => typeof key === "string" && key.startsWith("/api/"));
      closeTimer.current = setTimeout(onClose, 700);
    } catch {
      setError(t.common.offline);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!isEdit || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/transactions/${encodeURIComponent(transaction.id)}`, {
        method: "DELETE",
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload?.error ?? t.txSheet.deleteFailed);
        setSaving(false);
        setConfirmingDelete(false);
        return;
      }
      mutate((key) => typeof key === "string" && key.startsWith("/api/"));
      onClose();
    } catch {
      setError(t.common.offline);
      setSaving(false);
    }
  }

  // A user who skipped the wizard has nothing to pick from. Say so and point
  // at the fix instead of showing empty dropdowns.
  if (catalog && accounts.length === 0) {
    return (
      <BottomSheet open={open} onClose={onClose} title={t.txSheet.newTitle}>
        <div className="pb-8 pt-2 text-center space-y-4">
          <p className="text-[15px] text-text">{t.txSheet.noAccountsTitle}</p>
          <p className="text-[13px] text-text-dim leading-relaxed max-w-xs mx-auto">
            {t.txSheet.noAccountsHint}
          </p>
          <Link
            href="/bienvenida"
            onClick={onClose}
            className="press inline-flex items-center justify-center rounded-md bg-accent text-accent-ink text-sm font-medium px-5 py-3 min-h-[48px]"
          >
            {t.txSheet.setUpAccounts}
          </Link>
        </div>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={isEdit ? t.txSheet.editTitle : t.txSheet.newTitle}>
      <div className="pb-6 space-y-5">
        <SegmentedControl
          options={typeOptions}
          value={type}
          onChange={(next) => {
            setType(next);
            setCategory("");
          }}
          label={t.txSheet.type}
        />

        {/* Monto — the one field that always matters, so it leads */}
        <Field label={t.common.amount}>
          <div className="flex items-baseline gap-2 rounded-md border border-border bg-surface-2 px-3.5 py-2.5 focus-within:border-accent/60 transition-colors duration-150">
            <span className="font-mono text-2xl text-text-dim">$</span>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
              inputMode="decimal"
              placeholder="0"
              aria-label={t.common.amount}
              className="flex-1 min-w-0 bg-transparent font-mono text-[30px] font-semibold text-text tabular-nums outline-none placeholder:text-text-faint"
            />
          </div>
        </Field>

        <Field label={isTransfer ? t.txSheet.fromAccount : t.common.account}>
          <Select value={selectedAccount} onChange={setAccount} block aria-label={t.common.account}>
            {accounts.map((a) => (
              <option key={a.account} value={a.account}>{a.account}</option>
            ))}
          </Select>
        </Field>

        {isTransfer ? (
          <Field label={t.txSheet.toAccount}>
            <Select
              value={toAccount}
              onChange={setToAccount}
              placeholder={t.txSheet.pickAccount}
              block
              aria-label={t.txSheet.toAccount}
            >
              {accounts.filter((a) => a.account !== selectedAccount).map((a) => (
                <option key={a.account} value={a.account}>{a.account}</option>
              ))}
            </Select>
          </Field>
        ) : (
          <Field label={t.common.category}>
            <Select
              value={category}
              onChange={setCategory}
              placeholder={t.txSheet.pickCategory}
              block
              aria-label={t.common.category}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </Select>
          </Field>
        )}

        <Field label={t.txSheet.note}>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t.txSheet.notePlaceholder}
            aria-label={t.txSheet.note}
            className="w-full rounded-md bg-surface-2 border border-border px-3.5 py-3 min-h-[48px] text-[15px] text-text outline-none placeholder:text-text-faint focus:border-accent/60 transition-colors duration-150"
          />
        </Field>

        <Field label={t.common.date}>
          <input
            type="date"
            value={day}
            max={getToday()}
            onChange={(e) => setDay(e.target.value)}
            aria-label={t.common.date}
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
              {t.txSheet.saved}
            </>
          ) : isEdit ? (
            t.common.saveChanges
          ) : (
            t.txSheet.save
          )}
        </Button>

        {isEdit &&
          (confirmingDelete ? (
            <div className="flex gap-2.5">
              <Button variant="secondary" size="lg" className="flex-1 py-3.5"
                onClick={() => setConfirmingDelete(false)}>
                {t.common.cancel}
              </Button>
              <Button variant="danger" size="lg" className="flex-1 py-3.5" loading={saving}
                onClick={remove}>
                {t.txSheet.confirmDelete}
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="press w-full font-mono text-[10.5px] text-red-fg uppercase tracking-wide py-2.5"
            >
              {t.txSheet.deleteMovement}
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
