"use client";

import { useState } from "react";
import { TransactionSheet, type RecordPrefill } from "@/components/transactions/TransactionSheet";
import type { AccountBalance, CreditCycleStatus } from "@/types";

/**
 * A card payment is a Transferencia into the card, the way it has always
 * been logged. It starts from where the last payment came from (or the first
 * debit account), for what's left of the statement; all of it stays editable.
 */
export function payPrefill(
  card: string,
  cycle: CreditCycleStatus | null,
  balances: AccountBalance[]
): RecordPrefill {
  const from =
    cycle?.lastPaymentFrom && cycle.lastPaymentFrom !== card
      ? cycle.lastPaymentFrom
      : balances.find((b) => !b.isCredit && b.account !== card)?.account ?? null;
  return {
    type: "Transferencia",
    account: from,
    toAccount: card,
    amount: cycle && cycle.remainingToPay > 0 ? cycle.remainingToPay : null,
  };
}

/** The record sheet, opened prefilled. Remounted per opening so each starts clean. */
export function usePaySheet() {
  const [prefill, setPrefill] = useState<RecordPrefill | null>(null);
  const [session, setSession] = useState(0);
  const [open, setOpen] = useState(false);

  function pay(next: RecordPrefill) {
    setPrefill(next);
    setSession((s) => s + 1);
    setOpen(true);
  }

  const sheet = (
    <TransactionSheet
      key={`pay-${session}`}
      open={open}
      onClose={() => setOpen(false)}
      prefill={prefill ?? undefined}
    />
  );

  return { pay, sheet };
}
