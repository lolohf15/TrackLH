/**
 * Matching a statement against what the user already logged.
 *
 * This is the whole point of the import. Everyone using TrackLH captures as
 * they spend, so by the time a statement arrives the ledger is not empty and
 * a plain bulk insert would duplicate most of it. What the reader needs is
 * the difference: which lines they already have, which they forgot, and which
 * they logged that the bank never saw.
 *
 * The one rule that matters is that assignment is one to one. Two identical
 * 145.00 rides in the same week must not both match the single ride that got
 * logged — one of them is genuinely missing, and collapsing them would hide
 * exactly the movement this feature exists to surface.
 */

import type { StatementRow } from "./statement-parse";
import { fold } from "./statement-parse";
import type { TransactionType } from "@/types";

/** A movement already in the ledger, seen from the account being reconciled. */
export interface LedgerMovement {
  id: string;
  /** Stored ISO string. */
  date: string;
  /** Negative left the account, positive arrived. */
  signedAmount: number;
  description: string;
  type: TransactionType;
  category: string | null;
  /** The other account, when this is a transfer. */
  counterparty: string | null;
}

export interface Match {
  statement: StatementRow;
  ledger: LedgerMovement;
  /** Signed: negative means the bank posted it before the user logged it. */
  dayGap: number;
  score: number;
}

export interface Reconciliation {
  /** Statement rows that already have a movement. Nothing to do. */
  matched: Match[];
  /** On the statement, missing from the ledger. The import creates these. */
  missing: StatementRow[];
  /** In the ledger, absent from the statement. Shown, never touched. */
  extra: LedgerMovement[];
}

/** Banks post a day or two after the fact, and people log a day late too. */
const DEFAULT_MAX_DAY_GAP = 4;

/** Below this, two descriptions are treated as unrelated rather than similar. */
const SUGGESTION_FLOOR = 0.34;

/**
 * How the reconciled account experiences a movement, or null when the
 * movement doesn't touch it at all.
 *
 * Mirrors rules 6 and 7 exactly: a transfer leaves the account it names and
 * arrives at `toAccount`, which is why a card payment shows up as an abono on
 * the card's own statement and a cargo on the debit account's.
 */
export function signedForAccount(
  movement: {
    amount: number;
    type: TransactionType;
    account: string;
    toAccount: string | null;
  },
  account: string
): number | null {
  if (movement.type === "Transferencia") {
    if (movement.account === account) return -movement.amount;
    if (movement.toAccount === account) return movement.amount;
    return null;
  }

  if (movement.account !== account) return null;
  return movement.type === "Ingreso" ? movement.amount : -movement.amount;
}

/**
 * What a statement line most likely is, before the reader corrects it.
 *
 * Money arriving at a credit card is a payment, and TrackLH models that as a
 * transfer rather than income — so the card case defaults to a transfer whose
 * other side the reader still has to name.
 */
export function defaultTypeFor(signedAmount: number, isCredit: boolean): TransactionType {
  if (signedAmount < 0) return "Gasto";
  return isCredit ? "Transferencia" : "Ingreso";
}

// ------------------------------------------------------------- similarity

/**
 * Words that appear on half the lines of any statement and say nothing about
 * which movement this is. Left in, they make every pair look alike.
 */
const NOISE = new Set([
  "compra", "pago", "pagos", "cargo", "abono", "tarjeta", "debito", "credito",
  "spei", "transferencia", "traspaso", "deposito", "retiro", "mxn", "usd",
  "suc", "sucursal", "mexico", "mex", "ref", "referencia", "aut", "autorizacion",
  "num", "folio", "clave", "operacion", "movimiento", "con", "por", "del", "las",
  "los", "una", "the", "and", "for", "payment", "purchase", "card", "transfer",
]);

/** Meaningful words only: no noise, no auth codes, nothing under three letters. */
function tokenize(text: string): Set<string> {
  return new Set(
    fold(text)
      .split(" ")
      .filter((t) => t.length >= 3 && !NOISE.has(t) && !/^\d+$/.test(t))
  );
}

/**
 * 0 to 1. Jaccard over meaningful words, with a floor for the case where one
 * description is simply the other one truncated — "OXXO" against
 * "OXXO SUC 4421" shares everything it has.
 */
function overlap(left: Set<string>, right: Set<string>): number {
  if (left.size === 0 || right.size === 0) return 0;

  let shared = 0;
  for (const token of left) if (right.has(token)) shared += 1;
  if (shared === 0) return 0;

  const jaccard = shared / (left.size + right.size - shared);
  const containment = shared / Math.min(left.size, right.size);
  return Math.max(jaccard, containment * 0.85);
}

export function describeSimilarity(a: string, b: string): number {
  return overlap(tokenize(a), tokenize(b));
}

// ---------------------------------------------------------------- matching

function dayOf(iso: string): number {
  return Math.floor(Date.parse(iso.slice(0, 10)) / 86_400_000);
}

/**
 * Pairs statement rows with ledger movements, then reports what is left over
 * on each side.
 *
 * Amounts have to agree to the cent and to the sign: a 450 charge never
 * reconciles against a 450 deposit, however close the dates. Within that,
 * the best pair wins, and greedy assignment over a score-sorted list is what
 * keeps it one to one.
 */
export function reconcile(
  statement: StatementRow[],
  ledger: LedgerMovement[],
  maxDayGap: number = DEFAULT_MAX_DAY_GAP
): Reconciliation {
  interface Candidate {
    s: number;
    l: number;
    dayGap: number;
    score: number;
  }

  const candidates: Candidate[] = [];

  statement.forEach((row, s) => {
    const rowDay = dayOf(row.date);

    ledger.forEach((movement, l) => {
      if (Math.sign(movement.signedAmount) !== Math.sign(row.signedAmount)) return;
      if (Math.abs(movement.signedAmount - row.signedAmount) > 0.005) return;

      const dayGap = dayOf(movement.date) - rowDay;
      if (Math.abs(dayGap) > maxDayGap) return;

      // Same-day is the strongest signal there is; wording is the tie-break,
      // since a bank rarely writes a purchase the way a person does.
      const closeness = 1 - Math.abs(dayGap) / (maxDayGap + 1);
      const similarity = describeSimilarity(row.description, movement.description);

      candidates.push({ s, l, dayGap, score: closeness * 2 + similarity });
    });
  });

  candidates.sort((a, b) => b.score - a.score);

  const claimedStatement = new Set<number>();
  const claimedLedger = new Set<number>();
  const matched: Match[] = [];

  for (const candidate of candidates) {
    if (claimedStatement.has(candidate.s) || claimedLedger.has(candidate.l)) continue;
    claimedStatement.add(candidate.s);
    claimedLedger.add(candidate.l);
    matched.push({
      statement: statement[candidate.s],
      ledger: ledger[candidate.l],
      dayGap: candidate.dayGap,
      score: Math.round(candidate.score * 100) / 100,
    });
  }

  matched.sort((a, b) => a.statement.date.localeCompare(b.statement.date));

  return {
    matched,
    missing: statement.filter((_, s) => !claimedStatement.has(s)),
    extra: ledger.filter((_, l) => !claimedLedger.has(l)),
  };
}

/**
 * A category for each unmatched row, taken from the closest thing the user
 * has already filed by hand.
 *
 * No rules table and nothing to configure: if they have called "OXXO SUC
 * 4421" groceries twice, the next OXXO line arrives pre-filled, and if they
 * have never seen the merchant it arrives blank rather than guessed. History
 * here is the user's whole ledger, not just the reconciled window.
 */
export function suggestCategories(
  rows: StatementRow[],
  history: Array<{ description: string; category: string | null }>
): Map<number, string> {
  // Tokenized once rather than once per row: backfilling a year of history
  // asks hundreds of rows against thousands of past movements.
  const past = history
    .filter((h) => h.category && h.description)
    .map((h) => ({ category: h.category as string, tokens: tokenize(h.description) }));

  const suggestions = new Map<number, string>();
  if (past.length === 0) return suggestions;

  rows.forEach((row, index) => {
    const tokens = tokenize(row.description);
    let best = { category: "", score: SUGGESTION_FLOOR };

    for (const entry of past) {
      const score = overlap(tokens, entry.tokens);
      if (score > best.score) best = { category: entry.category, score };
    }

    if (best.category !== "") suggestions.set(index, best.category);
  });

  return suggestions;
}
