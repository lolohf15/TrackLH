"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { useT } from "@/lib/i18n-react";
import { dayKey, todayAnchor } from "@/services/period";
import type { Frequency } from "@/services/recurrence";
import type { PendingOccurrence, RecurringList, RecurringRuleView, TransactionType } from "@/types";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`${url} → ${r.status}`);
    return r.json();
  });

/**
 * What's waiting to be confirmed, as of today on the reader's clock. The key
 * is captured once per mount, like `useAccounts`: a screen left open across
 * midnight isn't worth reading the clock on every render.
 */
export function usePendingRecurring() {
  const [key] = useState(() => `/api/recurring/pending?today=${dayKey(todayAnchor())}`);
  return useSWR<PendingOccurrence[]>(key, fetcher);
}

export function useRecurringList() {
  return useSWR<RecurringList>("/api/recurring", fetcher);
}

/** "Mensual", or "Cada 2 meses" once the interval is more than one. */
export function useFrequencyLabel() {
  const t = useT();
  return (frequency: Frequency, interval: number): string =>
    interval > 1 ? t.recurring.every(interval, frequency) : t.recurring[frequency];
}

/** What a rule is called on screen: its own name, its category, or the route. */
export function ruleTitle(rule: Pick<RecurringRuleView, "description" | "category" | "account" | "toAccount">): string {
  return rule.description ?? rule.category ?? `${rule.account} → ${rule.toAccount ?? ""}`;
}

/** Refreshes every view that reads from the API. */
export function refreshAll() {
  return mutate((key) => typeof key === "string" && key.startsWith("/api/"));
}

/** The same three colours every amount in the app is written in. */
export const AMOUNT_TONES: Record<TransactionType, string> = {
  Gasto: "text-red-fg",
  Ingreso: "text-green-fg",
  Transferencia: "text-blue-fg",
};

export interface OccurrenceResult {
  id?: string;
  /** Confirm: someone already logged this occurrence; this tap changed nothing. */
  alreadyLogged?: boolean;
  /** Skip: it had already been confirmed or skipped. */
  alreadyHandled?: boolean;
}

/** Sends an occurrence action and throws with the server's own message. */
export async function postOccurrence(
  ruleId: string,
  action: "confirm" | "skip" | "reopen",
  body: Record<string, unknown>
): Promise<OccurrenceResult> {
  const res = await fetch(
    `/api/recurring/${encodeURIComponent(ruleId)}/${action}?today=${dayKey(todayAnchor())}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(payload?.error ?? "");
  return payload;
}
