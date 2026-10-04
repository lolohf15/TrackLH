"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { Minus, Plus, X } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { HoldButton } from "@/components/ui/HoldButton";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Switch } from "@/components/ui/Switch";
import { useToast } from "@/components/ui/Toast";
import { CategoryGrid } from "@/components/transactions/RecordPickers";
import { cn, formatMXNCents, getToday } from "@/lib/utils";
import { evaluateAmount, isExpression } from "@/lib/amount-expression";
import { useT } from "@/lib/i18n-react";
import { MAX_INTERVAL, type Frequency } from "@/services/recurrence";
import {
  UNKNOWN_COLOR, VALID_TRANSACTION_TYPES,
  type AccountOption, type Catalog, type RecurringRuleView, type TransactionType,
} from "@/types";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`${url} → ${r.status}`);
    return r.json();
  });

const TYPE_TONES: Record<TransactionType, string> = {
  Gasto: "var(--color-red)",
  Ingreso: "var(--color-green)",
  Transferencia: "var(--color-blue)",
};

const INPUT =
  "w-full rounded-md bg-surface-2 border border-border px-3.5 min-h-[48px] text-[15px] text-text outline-none placeholder:text-text-faint focus:border-accent/60 transition-colors duration-150";

/**
 * Create or edit a recurring movement. The movement half — type, amount,
 * account, category — reads the same catalog the record sheet does, so a
 * rule offers exactly what its Confirm will accept.
 */
export function RecurringEditSheet({
  rule,
  open,
  onClose,
}: {
  /** Null creates a new one. */
  rule: RecurringRuleView | null;
  open: boolean;
  onClose: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const isNew = rule === null;
  const { data: catalog } = useSWR<Catalog>("/api/catalog", fetcher);
  const accounts = catalog?.accounts ?? [];

  const [type, setType] = useState<TransactionType>(rule?.type ?? "Gasto");
  const [amount, setAmount] = useState(rule ? String(rule.amount) : "");
  const [description, setDescription] = useState(rule?.description ?? "");
  const [pickedAccount, setPickedAccount] = useState<string | null>(rule?.account ?? null);
  const [pickedToAccount, setPickedToAccount] = useState<string | null>(rule?.toAccount ?? null);
  const [category, setCategory] = useState(rule?.category ?? "");
  const [frequency, setFrequency] = useState<Frequency>(rule?.frequency ?? "monthly");
  const [interval, setIntervalCount] = useState(rule?.interval ?? 1);
  const [startDate, setStartDate] = useState(rule?.startDate ?? getToday());
  const [endDate, setEndDate] = useState(rule?.endDate ?? "");
  const [active, setActive] = useState(rule?.active ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isTransfer = type === "Transferencia";
  const account = pickedAccount ?? catalog?.lastAccount?.[type] ?? accounts[0]?.account ?? "";
  const toAccount = isTransfer
    ? pickedToAccount && pickedToAccount !== account
      ? pickedToAccount
      : accounts.find((a) => a.account !== account)?.account ?? ""
    : "";
  const categories =
    type === "Ingreso" ? catalog?.incomeCategories ?? [] : catalog?.expenseCategories ?? [];

  const value = evaluateAmount(amount);
  const canSave =
    !busy &&
    value !== null &&
    value > 0 &&
    !!account &&
    (isTransfer ? !!toAccount : !!category) &&
    !!startDate;

  function refreshAll() {
    return mutate((key) => typeof key === "string" && key.startsWith("/api/"));
  }

  async function save() {
    if (!canSave || value === null) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        isNew ? "/api/recurring" : `/api/recurring/${encodeURIComponent(rule.id)}?today=${getToday()}`,
        {
          method: isNew ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type,
            amount: value,
            account,
            toAccount: isTransfer ? toAccount : null,
            category: isTransfer ? null : category,
            description: description.trim() || null,
            frequency,
            interval,
            startDate,
            endDate: endDate || null,
            active,
          }),
        }
      );
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload?.error ?? t.recurring.saveFailed);
        setBusy(false);
        return;
      }
      refreshAll();
      onClose();
      toast({ message: isNew ? t.recurring.created : t.txSheet.changesSaved });
    } catch {
      setError(t.common.offline);
      setBusy(false);
    }
  }

  async function remove() {
    if (isNew || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/recurring/${encodeURIComponent(rule.id)}`, { method: "DELETE" });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        setError(payload?.error ?? t.common.deleteFailed);
        setBusy(false);
        return;
      }
      refreshAll();
      onClose();
      toast({ message: t.recurring.deleted });
    } catch {
      setError(t.common.offline);
      setBusy(false);
    }
  }

  const unit =
    frequency === "weekly"
      ? t.recurring.weekly
      : frequency === "monthly"
        ? t.recurring.monthly
        : t.recurring.yearly;

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={isNew ? t.recurring.newTitle : t.recurring.editTitle}
    >
      <div className="pb-6 space-y-5">
        <SegmentedControl
          options={VALID_TRANSACTION_TYPES.map((v) => ({ value: v, label: t.txType[v], tone: TYPE_TONES[v] }))}
          value={type}
          onChange={(next) => {
            setType(next);
            setCategory("");
          }}
          label={t.txSheet.type}
        />

        <Field label={t.common.amount}>
          <div className="flex items-baseline gap-2 rounded-md border border-border bg-surface-2 px-3.5 py-2.5 focus-within:border-accent/60 transition-colors duration-150">
            <span className="font-mono text-lg text-text-dim">$</span>
            <input
              value={amount}
              // Digits, a decimal point and the arithmetic the record sheet
              // takes, so "3*89" works here too.
              onChange={(e) => setAmount(e.target.value.replace(/[^\d.,+\-*/()×÷ ]/g, ""))}
              inputMode="decimal"
              placeholder="0"
              aria-label={t.common.amount}
              autoFocus={isNew}
              className="flex-1 min-w-0 bg-transparent font-mono text-[19px] font-semibold text-text tabular-nums outline-none placeholder:text-text-faint"
            />
          </div>
          {value !== null && isExpression(amount) && (
            <span className="block text-[13px] text-accent tabular-nums pt-0.5">= {formatMXNCents(value)}</span>
          )}
        </Field>

        <Field label={t.recurring.name}>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t.recurring.namePlaceholder}
            aria-label={t.recurring.name}
            className={INPUT}
          />
        </Field>

        <Field label={isTransfer ? t.txSheet.fromAccount : t.common.account} as="div">
          <AccountChips accounts={accounts} value={account} onChange={setPickedAccount} label={t.common.account} />
        </Field>

        {isTransfer ? (
          <Field label={t.txSheet.toAccount} as="div">
            <AccountChips
              accounts={accounts}
              value={toAccount}
              exclude={account}
              onChange={setPickedToAccount}
              label={t.txSheet.toAccount}
            />
          </Field>
        ) : (
          <Field label={t.common.category} as="div">
            <div className="pt-1">
              <CategoryGrid key={type} categories={categories} value={category} onChange={setCategory} />
            </div>
          </Field>
        )}

        <Field label={t.recurring.frequency} as="div">
          <SegmentedControl
            options={[
              { value: "weekly" as const, label: t.recurring.weekly },
              { value: "monthly" as const, label: t.recurring.monthly },
              { value: "yearly" as const, label: t.recurring.yearly },
            ]}
            value={frequency}
            onChange={setFrequency}
            label={t.recurring.frequency}
          />
        </Field>

        <Field label={t.recurring.interval} as="div">
          <div className="flex items-center justify-between gap-3 rounded-md bg-surface-2 border border-border pl-3.5 pr-1 min-h-[52px]">
            <span className="text-[14px] text-text">
              {interval > 1 ? t.recurring.every(interval, frequency) : unit}
            </span>
            <div className="flex items-center">
              <StepButton
                label="−"
                disabled={interval <= 1}
                onClick={() => setIntervalCount((n) => Math.max(1, n - 1))}
              >
                <Minus size={16} />
              </StepButton>
              <span className="w-7 text-center font-mono text-[15px] font-semibold tabular-nums">{interval}</span>
              <StepButton
                label="+"
                disabled={interval >= MAX_INTERVAL}
                onClick={() => setIntervalCount((n) => Math.min(MAX_INTERVAL, n + 1))}
              >
                <Plus size={16} />
              </StepButton>
            </div>
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-2.5">
          <Field label={t.recurring.startDate}>
            <input
              type="date"
              value={startDate}
              onChange={(e) => e.target.value && setStartDate(e.target.value)}
              aria-label={t.recurring.startDate}
              className={cn(INPUT, "font-mono text-[14px] tabular-nums")}
            />
          </Field>
          <Field label={t.recurring.endDate} as="div">
            <div className="relative">
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                aria-label={t.recurring.endDate}
                className={cn(INPUT, "font-mono text-[14px] tabular-nums", endDate && "pr-10")}
              />
              {endDate && (
                <button
                  type="button"
                  onClick={() => setEndDate("")}
                  aria-label={t.movements.clear}
                  className="absolute right-0 top-0 w-11 h-full grid place-items-center text-text-dim"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </Field>
        </div>

        {!isNew && (
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[14px] text-text">{t.recurring.active}</p>
              <p className="text-[11.5px] text-text-dim leading-relaxed mt-0.5">{t.recurring.activeHint}</p>
            </div>
            <Switch checked={active} onChange={setActive} label={t.recurring.active} />
          </div>
        )}

        {error && (
          <p role="alert" className="rounded-sm bg-red-bg border border-red-border text-red-fg text-xs px-3.5 py-2.5 leading-relaxed">
            {error}
          </p>
        )}

        <Button onClick={save} disabled={!canSave} loading={busy} size="lg" className="w-full py-3.5">
          {isNew ? t.recurring.add : t.common.saveChanges}
        </Button>

        {!isNew && (
          <div className="space-y-2">
            <HoldButton
              label={t.recurring.holdToDelete}
              holdingLabel={t.txSheet.keepHolding}
              onConfirm={remove}
              disabled={busy}
            />
            <p className="text-[11.5px] text-text-dim text-center">{t.recurring.deleteHint}</p>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}

function Field({
  label, children, as = "label",
}: { label: string; children: React.ReactNode; as?: "label" | "div" }) {
  const Tag = as;
  return (
    <Tag className="block space-y-1.5">
      <span className="block font-mono text-[10px] font-semibold text-text-dim uppercase tracking-[0.1em]">
        {label}
      </span>
      {children}
    </Tag>
  );
}

function StepButton({
  label, disabled, onClick, children,
}: { label: string; disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="press w-11 h-11 rounded-full grid place-items-center text-text-muted disabled:opacity-30"
    >
      {children}
    </button>
  );
}

/** Accounts as a row of chips that scrolls sideways: a rule's account is
 *  picked once, so it doesn't earn the record sheet's full list. */
function AccountChips({
  accounts, value, exclude, onChange, label,
}: {
  accounts: AccountOption[];
  value: string;
  exclude?: string;
  onChange: (account: string) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-2 overflow-x-auto -mx-5 px-5 pb-0.5">
      {accounts
        .filter((a) => a.account !== exclude)
        .map((a) => {
          const selected = a.account === value;
          return (
            <button
              key={a.account}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(a.account)}
              className={cn(
                "press shrink-0 inline-flex items-center gap-2 rounded-full pl-3 pr-3.5 min-h-[44px] border text-[13.5px] transition-colors duration-150",
                selected ? "bg-accent/15 border-accent/50 text-text font-semibold" : "bg-surface-2 border-border text-text-muted"
              )}
            >
              <span
                aria-hidden="true"
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: a.color ?? UNKNOWN_COLOR }}
              />
              {a.account}
            </button>
          );
        })}
    </div>
  );
}
