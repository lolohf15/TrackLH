"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import useSWR, { mutate } from "swr";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowDown, CalendarDays, NotebookPen, Repeat } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { SuccessCheck } from "@/components/ui/SuccessCheck";
import { HoldButton } from "@/components/ui/HoldButton";
import { useToast } from "@/components/ui/Toast";
import { AmountKeypad } from "./AmountKeypad";
import { AccountList, AccountPill, CategoryGrid, DatePanel, RepeatPanel, useDayLabel } from "./RecordPickers";
import { postOccurrence, useFrequencyLabel } from "@/components/recurring/use-recurring";
import type { Frequency } from "@/services/recurrence";
import { cn, formatMXNCents, getToday, withLocalTime } from "@/lib/utils";
import { evaluateAmount, isExpression } from "@/lib/amount-expression";
import { keyFromKeyboard, pressKey } from "@/lib/amount-input";
import { hapticTap } from "@/lib/haptics";
import { useT } from "@/lib/i18n-react";
import {
  VALID_TRANSACTION_TYPES,
  type AccountOption,
  type Catalog,
  type Transaction,
  type TransactionType,
} from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Null (or absent) means a brand-new movement. */
  transaction?: Transaction | null;
  /** Opened from the row's swipe-to-delete: lead with the delete control. */
  initialConfirmingDelete?: boolean;
  /** A new movement that starts filled in, like a card payment. Everything
   *  in it stays editable before saving. */
  prefill?: RecordPrefill;
  /** A recurring occurrence being reviewed before it's logged: saving
   *  confirms it instead of creating a free-standing movement. */
  confirm?: { ruleId: string; occurrenceDate: string };
}

export interface RecordPrefill {
  type: TransactionType;
  account?: string | null;
  toAccount?: string | null;
  amount?: number | null;
  category?: string | null;
  description?: string | null;
  /** `YYYY-MM-DD`. Defaults to today. */
  day?: string | null;
}

// Throws on a failed response so SWR keeps the last good catalog instead of
// caching an error body in its place — the form reads deep into this shape.
const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`${url} → ${r.status}`);
    return r.json();
  });

/** The same three colours every list, amount and dot in the app already uses
 *  for these types — so picking one here rehearses reading one later. */
const TYPE_TONES: Record<TransactionType, string> = {
  Gasto: "var(--color-red)",
  Ingreso: "var(--color-green)",
  Transferencia: "var(--color-blue)",
};

/** Round figures offered while the amount is empty, by what's being logged. */
const QUICK_AMOUNTS: Record<TransactionType, number[]> = {
  Gasto: [50, 100, 200, 500],
  Ingreso: [500, 1000, 2000, 5000],
  Transferencia: [500, 1000, 2000, 5000],
};

/** How long "Registrado" stays up before the sheet gets out of the way. */
const DONE_HOLD_MS = 750;

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

/** What sits under the footer: the keypad, or whichever picker is open. */
type Panel = "keypad" | "account" | "toAccount" | "date" | "repeat" | null;
type Phase = "form" | "saving" | "done";

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

/** What can be spent from an account, or null when there's no ceiling to show. */
function spendable(a: AccountOption | undefined): number | null {
  if (!a) return null;
  if (!a.isCredit) return a.balance;
  return a.availableCredit;
}

/**
 * "5000+1250.5" → "5,000+1,250.5" for display only. The integer part of each
 * number gets grouped; what's typed after a decimal point is left as typed.
 */
function groupThousands(text: string): string {
  return text.replace(/\d+(\.\d*)?/g, (num) => {
    const [int, frac] = num.split(".");
    const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return frac === undefined ? grouped : `${grouped}.${frac}`;
  });
}

/** The amount as it was stored, typed back out for the keypad. */
function amountText(amount: number): string {
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(2).replace(/0$/, "");
}

export function TransactionSheet({
  open,
  onClose,
  transaction = null,
  initialConfirmingDelete = false,
  prefill,
  confirm,
}: Props) {
  const isEdit = transaction !== null;
  // Only a brand-new movement can start a rule: an edit already has its
  // place in the ledger, and a confirmation already belongs to one.
  const canRepeat = !isEdit && !confirm;
  const t = useT();
  const toast = useToast();
  const reduceMotion = useReducedMotion();
  const dayLabel = useDayLabel();

  // The options come from the same rows the server validates against, so the
  // form can never offer something the POST would reject.
  const { data: catalog } = useSWR<Catalog>("/api/catalog", fetcher);
  const accounts = catalog?.accounts ?? [];

  const [type, setType] = useState<TransactionType>(transaction?.type ?? prefill?.type ?? "Gasto");
  // Null until the user picks one: then the account follows the type, so a
  // switch to Ingreso lands on the account income usually goes to.
  const [pickedAccount, setPickedAccount] = useState<string | null>(
    transaction?.account ?? prefill?.account ?? null
  );
  const [pickedToAccount, setPickedToAccount] = useState<string | null>(
    transaction?.toAccount ?? prefill?.toAccount ?? null
  );
  const [category, setCategory] = useState(transaction?.category ?? prefill?.category ?? "");
  const [amount, setAmount] = useState(
    transaction ? amountText(transaction.amount) : prefill?.amount ? amountText(prefill.amount) : ""
  );
  const [description, setDescription] = useState(transaction?.description ?? prefill?.description ?? "");
  const [noteOpen, setNoteOpen] = useState(!!(transaction?.description ?? prefill?.description));
  const [day, setDay] = useState(transaction ? dayOf(transaction.date) : prefill?.day ?? getToday());
  const [repeat, setRepeat] = useState<Frequency | null>(null);
  const frequencyLabel = useFrequencyLabel();
  // A movement that arrives already filled in — an edit, or a recurring one
  // being reviewed — opens on itself rather than on the keypad.
  const [panel, setPanel] = useState<Panel>(isEdit || confirm ? null : "keypad");

  const [phase, setPhase] = useState<Phase>("form");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const afterClose = useRef<(() => void) | null>(null);
  const deleteRef = useRef<HTMLDivElement>(null);

  // A fresh slate per opening comes from the remount `AddRecordButton` forces,
  // so there's nothing to reset here — only the pending auto-close to cancel.
  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  // Opened from swipe-to-delete: bring the delete control into view.
  useEffect(() => {
    if (!open || !initialConfirmingDelete) return;
    const id = setTimeout(() => deleteRef.current?.scrollIntoView({ block: "center", behavior: "smooth" }), 350);
    return () => clearTimeout(id);
  }, [open, initialConfirmingDelete]);

  const isTransfer = type === "Transferencia";
  const categories =
    type === "Ingreso" ? catalog?.incomeCategories ?? [] : catalog?.expenseCategories ?? [];

  const account =
    pickedAccount ?? catalog?.lastAccount?.[type] ?? accounts[0]?.account ?? "";
  const fallbackTo =
    catalog?.lastToAccount && catalog.lastToAccount !== account
      ? catalog.lastToAccount
      : accounts.find((a) => a.account !== account)?.account ?? "";
  const toAccount = isTransfer
    ? pickedToAccount && pickedToAccount !== account
      ? pickedToAccount
      : fallbackTo
    : "";

  const fromOption = accounts.find((a) => a.account === account);
  const toOption = accounts.find((a) => a.account === toAccount);

  const value = evaluateAmount(amount);
  const showResult = value !== null && isExpression(amount);

  // Red pill: spending (or moving) more than the account has. When editing,
  // the balance already has this movement taken out of it, so add it back.
  const ceiling = spendable(fromOption);
  const alreadyCounted =
    isEdit && transaction.account === account && transaction.type !== "Ingreso"
      ? transaction.amount
      : 0;
  const over =
    type !== "Ingreso" && value !== null && ceiling !== null && value > ceiling + alreadyCounted;

  const canSubmit =
    phase === "form" &&
    !busy &&
    value !== null &&
    value > 0 &&
    !!account &&
    (isTransfer ? !!toAccount && toAccount !== account : !!category);

  function summary(v: number): string {
    const amountLabel = formatMXNCents(v);
    return isTransfer
      ? `${t.txType[type]} · ${amountLabel} · ${account} → ${toAccount}`
      : `${t.txType[type]} · ${amountLabel} · ${category} · ${account}`;
  }

  function refreshAll() {
    // Refresh every view that reads from the API, so the change shows up
    // without a manual reload.
    return mutate((key) => typeof key === "string" && key.startsWith("/api/"));
  }

  function equals() {
    if (value !== null) setAmount(amountText(value));
  }

  // A desktop keyboard drives the keypad while it's open.
  useEffect(() => {
    if (!open || panel !== "keypad" || phase !== "form") return;
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, [contenteditable]")) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Backspace") {
        e.preventDefault();
        setAmount((a) => a.slice(0, -1));
        return;
      }
      if (e.key === "=") {
        e.preventDefault();
        equals();
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        if (showResult) equals();
        else submit();
        return;
      }
      const key = keyFromKeyboard(e.key);
      if (key) {
        e.preventDefault();
        setAmount((a) => pressKey(a, key));
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  /** Leave the sheet, then run whatever was waiting for it to be gone. */
  function finish() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
    onClose();
    const next = afterClose.current;
    afterClose.current = null;
    next?.();
  }

  function requestClose() {
    if (phase === "saving") return; // the answer is on its way; let it land
    if (phase === "done") finish();
    else onClose();
  }

  async function submit() {
    if (!canSubmit || value === null) return;
    setError(null);

    const fields = {
      type,
      account,
      toAccount: isTransfer ? toAccount : undefined,
      category: isTransfer ? undefined : category,
      amount: value,
      date: isEdit ? keepClock(transaction.date, day) : withLocalTime(day),
      description: description.trim() || undefined,
    };
    const body = JSON.stringify(fields);
    const text = summary(value);

    if (isEdit) {
      setBusy(true);
      try {
        const res = await fetch(`/api/transactions/${encodeURIComponent(transaction.id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body,
        });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(payload?.error ?? t.txSheet.saveFailed);
          return;
        }
        refreshAll();
        onClose();
        toast({ message: t.txSheet.changesSaved, detail: text });
      } catch {
        setError(t.common.offline);
      } finally {
        setBusy(false);
      }
      return;
    }

    // A new movement gets the full confirmation: the form steps back, the
    // ring spins for as long as the server takes, and closes into a check
    // only once the row is really there.
    // The panel stays as it is: the form fades out but keeps its height, so
    // the sheet doesn't shrink under the ring.
    setPhase("saving");
    try {
      const res = confirm
        ? await fetch(
            `/api/recurring/${encodeURIComponent(confirm.ruleId)}/confirm?today=${getToday()}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              // An emptied note is sent as null, not left out: left out, the
              // server falls back to the rule's own and the note comes back.
              body: JSON.stringify({
                ...fields,
                description: fields.description ?? null,
                occurrenceDate: confirm.occurrenceDate,
              }),
            }
          )
        : await fetch("/api/transactions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
          });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || typeof payload?.id !== "string") {
        setPhase("form");
        setError(payload?.error ?? t.txSheet.saveFailed);
        return;
      }

      const id: string = payload.id;
      // A confirm another phone (or a second tap) got to first: nothing here
      // was created, so there's nothing to undo.
      const changedNothing = payload.alreadyLogged === true;

      // The movement is in. Its rule rides on it as the first occurrence, so
      // a failure here leaves a logged movement and says so, rather than
      // pretending the save didn't happen.
      let ruleId: string | null = null;
      let ruleFailed = false;
      if (repeat) {
        const made = await fetch("/api/recurring", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...fields, transactionId: id, frequency: repeat, interval: 1 }),
        }).catch(() => null);
        const madePayload = await made?.json().catch(() => ({}));
        if (made?.ok && typeof madePayload?.id === "string") ruleId = madePayload.id;
        else ruleFailed = true;
      }

      setPhase("done");
      hapticTap();
      refreshAll();

      const detail = repeat && ruleId ? `${text} · ${frequencyLabel(repeat, 1)}` : text;

      afterClose.current = () => {
        if (ruleFailed) {
          toast({ message: t.recurring.createFailed, detail: text, tone: "error" });
          return;
        }
        if (changedNothing) {
          toast({ message: t.txSheet.registered, detail });
          return;
        }
        toast({
          message: t.txSheet.registered,
          detail,
          action: {
            label: t.txSheet.undo,
            onClick: async () => {
              try {
                if (confirm) {
                  // Back to pending, with the movement it logged gone.
                  await postOccurrence(confirm.ruleId, "reopen", {
                    occurrenceDate: confirm.occurrenceDate,
                    transactionId: id,
                  });
                } else {
                  // The rule first: deleting the movement alone would leave
                  // a rule behind that nobody asked to keep.
                  if (ruleId) {
                    const gone = await fetch(`/api/recurring/${encodeURIComponent(ruleId)}`, {
                      method: "DELETE",
                    });
                    if (!gone.ok) throw new Error();
                  }
                  const undo = await fetch(`/api/transactions/${encodeURIComponent(id)}`, {
                    method: "DELETE",
                  });
                  if (!undo.ok) throw new Error();
                }
              } catch {
                toast({ message: t.txSheet.undoFailed, tone: "error" });
                return;
              }
              refreshAll();
              toast({ message: t.txSheet.deleted, detail: text });
            },
          },
        });
      };
      closeTimer.current = setTimeout(finish, DONE_HOLD_MS);
    } catch {
      setPhase("form");
      setError(t.common.offline);
    }
  }

  async function remove() {
    if (!isEdit || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/transactions/${encodeURIComponent(transaction.id)}`, {
        method: "DELETE",
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload?.error ?? t.txSheet.deleteFailed);
        return;
      }
      refreshAll();
      onClose();
      toast({
        message: t.txSheet.deleted,
        detail: summary(transaction.amount),
      });
    } catch {
      setError(t.common.offline);
    } finally {
      setBusy(false);
    }
  }

  /** After a pick, go back to typing if the amount still needs it. */
  function closePicker() {
    setPanel(value === null ? "keypad" : null);
  }

  // A user who skipped the wizard has nothing to pick from. Say so and point
  // at the fix instead of showing an empty form.
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

  const typeOptions = VALID_TRANSACTION_TYPES.map((v) => ({
    value: v,
    label: t.txType[v],
    tone: TYPE_TONES[v],
  }));

  const panelTransition = reduceMotion
    ? { duration: 0.12 }
    : { duration: 0.22, ease: EASE_OUT };

  return (
    <BottomSheet
      open={open}
      onClose={requestClose}
      // A new movement skips the heading: the type control already says what
      // this is, and the keypad needs the 40px more than the title does.
      title={isEdit ? t.txSheet.editTitle : confirm ? t.recurring.editBeforeConfirm : undefined}
    >
      <div className="relative">
        <motion.div
          className="pt-2 pb-4"
          animate={
            phase === "form"
              ? { opacity: 1, scale: 1, filter: "blur(0px)" }
              : reduceMotion
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.97, filter: "blur(3px)" }
          }
          transition={{ duration: 0.2, ease: EASE_OUT }}
          aria-hidden={phase !== "form"}
          inert={phase !== "form"}
        >
          <SegmentedControl
            options={typeOptions}
            value={type}
            onChange={(next) => {
              setType(next);
              setCategory("");
            }}
            label={t.txSheet.type}
          />

          {/* The amount leads: big, centred, and the keypad's only output. */}
          <div className="pt-4 pb-3 flex flex-col items-center">
            <button
              type="button"
              onClick={() => setPanel("keypad")}
              aria-label={`${t.common.amount}: ${amount || "0"}`}
              aria-expanded={panel === "keypad"}
              className="max-w-full flex items-baseline justify-center px-2 min-h-[56px]"
            >
              <span
                className={cn(
                  "text-[44px] leading-none font-semibold tabular-nums tracking-tight truncate transition-colors duration-150",
                  amount === "" ? "text-text-faint" : over ? "text-red-fg" : "text-text"
                )}
              >
                ${amount ? groupThousands(amount) : "0"}
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  "ml-1 w-[3px] h-[38px] self-center rounded-full bg-accent",
                  panel === "keypad" ? "animate-caret" : "opacity-0"
                )}
              />
            </button>

            <p
              aria-live="polite"
              className="h-5 mt-1 text-[14px] text-accent tabular-nums transition-opacity duration-150"
              style={{ opacity: showResult ? 1 : 0 }}
            >
              {showResult && value !== null ? `= ${formatMXNCents(value)}` : ""}
            </p>

            {/* Stacked for a transfer: two pills side by side don't fit a
                phone, and a transfer has no category grid to make room for. */}
            <div
              className={cn(
                "mt-1 flex items-center justify-center max-w-full",
                isTransfer ? "flex-col gap-1" : "gap-2"
              )}
            >
              <AccountPill
                account={fromOption}
                over={over}
                label={isTransfer ? t.txSheet.fromAccount : t.common.account}
                onClick={() => setPanel(panel === "account" ? null : "account")}
              />
              {isTransfer && (
                <>
                  <ArrowDown size={16} aria-hidden="true" className="text-text-dim shrink-0" />
                  <AccountPill
                    account={toOption}
                    over={false}
                    label={t.txSheet.toAccount}
                    onClick={() => setPanel(panel === "toAccount" ? null : "toAccount")}
                  />
                </>
              )}
            </div>
          </div>

          {!isTransfer && (
            <CategoryGrid
              key={type}
              categories={categories}
              value={category}
              onChange={setCategory}
            />
          )}

          <AnimatePresence initial={false}>
            {noteOpen && (
              <motion.div
                key="note"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={panelTransition}
                className="overflow-hidden"
              >
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onFocus={() => setPanel(null)}
                  placeholder={t.txSheet.notePlaceholder}
                  aria-label={t.txSheet.note}
                  // Only when the person just asked for a note. A note that
                  // arrives filled in (an edit, a recurring one under review)
                  // would otherwise pull the keyboard up over the sheet.
                  autoFocus={!isEdit && !prefill?.description}
                  className="mt-4 w-full rounded-md bg-surface-2 border border-border px-3.5 min-h-[48px] text-[15px] text-text outline-none placeholder:text-text-faint focus:border-accent/60 transition-colors duration-150"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <p role="alert" className="mt-4 rounded-sm bg-red-bg border border-red-border text-red-fg text-xs px-3.5 py-2.5">
              {error}
            </p>
          )}

          <div className="mt-3.5 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPanel(panel === "date" ? null : "date")}
              aria-label={`${t.common.date}: ${dayLabel(day)}`}
              aria-expanded={panel === "date"}
              className={cn(
                "press shrink-0 inline-flex items-center gap-1.5 rounded-full px-3.5 min-h-[48px] border text-[13.5px] transition-colors duration-150",
                day === getToday()
                  ? "bg-surface-2 border-border text-text"
                  : "bg-accent/15 border-accent/40 text-text"
              )}
            >
              <CalendarDays size={18} aria-hidden="true" />
              <span className="max-w-[88px] truncate">{dayLabel(day)}</span>
            </button>

            {!noteOpen && (
              <button
                type="button"
                onClick={() => setNoteOpen(true)}
                aria-label={t.txSheet.addNote}
                className="press shrink-0 w-12 h-12 rounded-full grid place-items-center bg-surface-2 border border-border text-text-dim"
              >
                <NotebookPen size={18} aria-hidden="true" />
              </button>
            )}

            {canRepeat && (
              <button
                type="button"
                onClick={() => setPanel(panel === "repeat" ? null : "repeat")}
                aria-label={`${t.recurring.repeat}: ${repeat ? frequencyLabel(repeat, 1) : t.recurring.noRepeat}`}
                aria-expanded={panel === "repeat"}
                className={cn(
                  "press shrink-0 w-12 h-12 rounded-full grid place-items-center border transition-colors duration-150",
                  repeat
                    ? "bg-accent/15 border-accent/40 text-accent"
                    : "bg-surface-2 border-border text-text-dim"
                )}
              >
                <Repeat size={18} aria-hidden="true" />
              </button>
            )}

            <Button
              onClick={submit}
              disabled={!canSubmit}
              loading={busy}
              size="lg"
              className="flex-1 min-h-[48px] rounded-full"
            >
              {isEdit ? t.common.saveChanges : confirm ? t.recurring.confirm : t.txSheet.save}
            </Button>
          </div>

          <AnimatePresence initial={false} mode="popLayout">
            {panel && (
              <motion.div
                key={panel}
                initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: reduceMotion ? 0 : 8, transition: { duration: 0.12 } }}
                transition={panelTransition}
                className="pt-3"
              >
                {panel === "keypad" && (
                  <AmountKeypad
                    value={amount}
                    onChange={setAmount}
                    onEquals={equals}
                    quickAmounts={QUICK_AMOUNTS[type]}
                  />
                )}
                {panel === "account" && (
                  <AccountList
                    title={isTransfer ? t.txSheet.fromAccount : t.common.account}
                    accounts={accounts}
                    value={account}
                    onChange={(a) => {
                      setPickedAccount(a);
                      closePicker();
                    }}
                  />
                )}
                {panel === "toAccount" && (
                  <AccountList
                    title={t.txSheet.toAccount}
                    accounts={accounts}
                    value={toAccount}
                    exclude={account}
                    onChange={(a) => {
                      setPickedToAccount(a);
                      closePicker();
                    }}
                  />
                )}
                {panel === "date" && (
                  <DatePanel
                    value={day}
                    onChange={(d) => {
                      setDay(d);
                      closePicker();
                    }}
                  />
                )}
                {panel === "repeat" && (
                  <RepeatPanel
                    value={repeat}
                    onChange={(f) => {
                      setRepeat(f);
                      closePicker();
                    }}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {isEdit && (
            <div ref={deleteRef} className="mt-6">
              <HoldButton
                label={t.txSheet.holdToDelete}
                holdingLabel={t.txSheet.keepHolding}
                onConfirm={remove}
                disabled={busy}
              />
            </div>
          )}
        </motion.div>

        {/* The confirmation, over the form it replaces. The form stays
            mounted underneath so the sheet keeps its height and doesn't
            jump while the ring spins. */}
        <AnimatePresence>
          {phase !== "form" && (
            <motion.button
              type="button"
              key="done"
              onClick={() => phase === "done" && finish()}
              aria-label={phase === "done" ? t.txSheet.registered : t.txSheet.saving}
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 pb-10 cursor-default"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <SuccessCheck state={phase === "done" ? "done" : "pending"} />
              <motion.span
                className="text-[18px] font-semibold text-text"
                initial={{ opacity: 0, y: reduceMotion ? 0 : 6 }}
                animate={phase === "done" ? { opacity: 1, y: 0 } : { opacity: 0, y: reduceMotion ? 0 : 6 }}
                transition={{ duration: 0.25, delay: 0.2, ease: EASE_OUT }}
              >
                {t.txSheet.registered}
              </motion.span>
              <motion.span
                className="text-[13.5px] text-text-dim tabular-nums px-6 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: phase === "done" ? 1 : 0 }}
                transition={{ duration: 0.2, delay: 0.26 }}
              >
                {value !== null ? summary(value) : ""}
              </motion.span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </BottomSheet>
  );
}
