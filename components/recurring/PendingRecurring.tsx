"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { useToast } from "@/components/ui/Toast";
import { TransactionSheet } from "@/components/transactions/TransactionSheet";
import { shortDay } from "@/components/wallet/DueBadge";
import { cn, formatMXN, formatMXNCents } from "@/lib/utils";
import { hapticTap } from "@/lib/haptics";
import { useLocale, useT } from "@/lib/i18n-react";
import { useCategoryLookup } from "@/lib/use-category-icons";
import {
  AMOUNT_TONES, postOccurrence, refreshAll, ruleTitle, usePendingRecurring, type OccurrenceResult,
} from "./use-recurring";
import type { PendingOccurrence } from "@/types";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

/**
 * Recurring movements that came due and are waiting for a yes. One tap logs
 * one as it's on file; tapping the row opens it in the record sheet first, for
 * the month the gym charged a different amount. Renders nothing when there's
 * nothing waiting, which is most days.
 */
export function PendingRecurring() {
  const t = useT();
  const toast = useToast();
  const reduceMotion = useReducedMotion();
  const { data } = usePendingRecurring();

  // Hidden the moment it's acted on, before the refetch lands, so the row
  // doesn't sit there looking untouched for a round trip.
  const [handled, setHandled] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<PendingOccurrence | null>(null);
  const [session, setSession] = useState(0);

  const keyOf = (p: PendingOccurrence) => `${p.rule.id}:${p.occurrenceDate}`;
  const items = (data ?? []).filter((p) => !handled.has(keyOf(p)));

  function summary(p: PendingOccurrence): string {
    const r = p.rule;
    return `${t.txType[r.type]} · ${formatMXNCents(r.amount)} · ${ruleTitle(r)}`;
  }

  async function act(p: PendingOccurrence, action: "confirm" | "skip") {
    if (busy) return;
    const key = keyOf(p);
    setBusy(key);
    let result: OccurrenceResult;
    try {
      result = await postOccurrence(p.rule.id, action, { occurrenceDate: p.occurrenceDate });
    } catch (err) {
      setBusy(null);
      toast({
        message: (err instanceof Error && err.message) || t.recurring.actionFailed,
        tone: "error",
      });
      return;
    }
    if (action === "confirm") hapticTap();
    setBusy(null);
    setHandled((h) => new Set(h).add(key));
    refreshAll();
    // Somebody beat this tap to it — another phone, a double tap. Nothing
    // here changed, so there's nothing for an Undo to take back, and offering
    // one would delete what they logged.
    const message = action === "confirm" ? t.txSheet.registered : t.recurring.skipped;
    if (result.alreadyLogged || result.alreadyHandled) {
      toast({ message, detail: summary(p) });
      return;
    }
    // The next one in a catch-up comes back under a new key; this one stays gone.
    toast({
      message,
      detail: summary(p),
      action: {
        label: t.txSheet.undo,
        onClick: async () => {
          try {
            await postOccurrence(p.rule.id, "reopen", {
              occurrenceDate: p.occurrenceDate,
              transactionId: action === "confirm" ? result.id : undefined,
            });
          } catch {
            toast({ message: t.txSheet.undoFailed, tone: "error" });
            return;
          }
          setHandled((h) => {
            const next = new Set(h);
            next.delete(key);
            return next;
          });
          refreshAll();
        },
      },
    });
  }

  if (items.length === 0 && !reviewing) return null;

  return (
    <section>
      <div className="flex items-baseline justify-between px-1 pb-2">
        <span className="font-mono text-[10px] font-semibold text-text-dim uppercase tracking-[0.1em]">
          {t.recurring.pending}
        </span>
        <Link
          href="/perfil/recurrentes"
          className="font-mono text-[10px] font-medium text-accent hover:brightness-125 tracking-wide"
        >
          {t.recurring.manage} →
        </Link>
      </div>

      <div className="panel px-4">
        <AnimatePresence initial={false}>
          {items.map((p) => (
            <motion.div
              key={p.rule.id}
              layout={!reduceMotion}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: reduceMotion ? 0.12 : 0.26, ease: EASE_OUT }}
              className="overflow-hidden border-t border-divider first:border-t-0"
            >
              <PendingRow
                item={p}
                busy={busy === keyOf(p)}
                disabled={busy !== null}
                onReview={() => {
                  setSession((s) => s + 1);
                  setReviewing(p);
                }}
                onConfirm={() => act(p, "confirm")}
                onSkip={() => act(p, "skip")}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <TransactionSheet
        key={`review-${session}`}
        open={reviewing !== null}
        onClose={() => setReviewing(null)}
        confirm={
          reviewing
            ? { ruleId: reviewing.rule.id, occurrenceDate: reviewing.occurrenceDate }
            : undefined
        }
        prefill={
          reviewing
            ? {
                type: reviewing.rule.type,
                account: reviewing.rule.account,
                toAccount: reviewing.rule.toAccount,
                amount: reviewing.rule.amount,
                category: reviewing.rule.category,
                description: reviewing.rule.description,
                day: reviewing.occurrenceDate,
              }
            : undefined
        }
      />
    </section>
  );
}

function PendingRow({
  item, busy, disabled, onReview, onConfirm, onSkip,
}: {
  item: PendingOccurrence;
  busy: boolean;
  disabled: boolean;
  onReview: () => void;
  onConfirm: () => void;
  onSkip: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  const lookup = useCategoryLookup();
  const r = item.rule;
  const category =
    r.type === "Transferencia" ? null : lookup(r.category, r.type === "Ingreso" ? "income" : "expense");
  const color =
    r.type === "Transferencia" ? "var(--color-blue)" : category?.color ?? "var(--color-text-muted)";

  return (
    <div className="pt-3 pb-2.5">
      <button
        type="button"
        onClick={onReview}
        aria-label={`${t.recurring.editBeforeConfirm}: ${ruleTitle(r)}`}
        className="press w-full flex items-center gap-3 text-left"
      >
        <CategoryIcon
          icon={r.type === "Transferencia" ? "transfer" : category?.icon}
          name={ruleTitle(r)}
          color={color}
          size="md"
        />
        <span className="min-w-0 flex-1">
          <span className="block text-[13.5px] text-text truncate">{ruleTitle(r)}</span>
          <span className="block text-[11.5px] text-text-dim mt-0.5 truncate">
            {r.type === "Transferencia" ? `${r.account} → ${r.toAccount}` : r.account}
            {" · "}
            {shortDay(item.occurrenceDate, locale)}
            {item.count > 1 && (
              <span className="text-amber-fg"> · {t.recurring.pendingCount(item.count)}</span>
            )}
          </span>
        </span>
        <span className={cn("font-mono text-[13.5px] font-semibold shrink-0", AMOUNT_TONES[r.type])}>
          {r.type === "Gasto" ? "−" : r.type === "Ingreso" ? "+" : ""}
          {formatMXN(r.amount)}
        </span>
      </button>

      {/* Under the text, not beside it: three things across a phone is one
          too many, and the thumb lands on the right edge anyway. */}
      <div className="flex items-center justify-end gap-1 mt-1">
        <button
          type="button"
          onClick={onSkip}
          disabled={disabled}
          className="press rounded-full px-3.5 min-h-[44px] font-mono text-[10.5px] font-medium uppercase tracking-wide text-text-dim hover:text-text disabled:opacity-40"
        >
          {t.recurring.skip}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={disabled}
          className="press inline-flex items-center gap-1.5 rounded-full px-4 min-h-[44px] bg-accent/15 border border-accent/40 text-accent font-mono text-[10.5px] font-semibold uppercase tracking-wide disabled:opacity-50"
        >
          {busy ? (
            <span className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin-fast" />
          ) : (
            <Check size={14} strokeWidth={2.6} aria-hidden="true" />
          )}
          {t.recurring.confirm}
        </button>
      </div>
    </div>
  );
}
