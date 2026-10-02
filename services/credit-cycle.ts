/**
 * A credit card runs on its own calendar: a cycle ends on the cut-off day, the
 * statement for it is due some days later, and a new cycle starts the day after
 * the cut, wherever that falls in the month. Everything else in the app stays
 * monthly; this module is only about the card's own cycles.
 *
 * Pure date math, no I/O. Every date is a UTC midnight standing for a wall-clock
 * day, the same convention transaction rows use (see `services/period.ts`).
 * Cycles are half-open like `DateRange`: `start` is the first day in it, `end`
 * is the day after the cut.
 */

import { round2 } from "./finance";

const DAY_MS = 86_400_000;

export interface Cycle {
  /** First day of the cycle: the day after the previous cut. */
  start: Date;
  /** The day after the cut, so the cycle is `[start, end)`. */
  end: Date;
  /** The cut-off day itself, the last day inside the cycle. */
  statementDate: Date;
}

function utc(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day));
}

function lastDayOfMonth(year: number, month: number): number {
  return utc(year, month + 1, 0).getUTCDate();
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * DAY_MS);
}

/** Whole days from `from` to `to`; negative when `to` is earlier. */
export function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / DAY_MS);
}

/** `day` of that month, or its last day when the month is shorter (31 → 28 Feb). */
export function clampedDay(year: number, month: number, day: number): Date {
  return utc(year, month, Math.min(day, lastDayOfMonth(year, month)));
}

/** Months are allowed to run past 11 or below 0; Date.UTC folds them into years. */
function cutIn(statementDay: number, year: number, month: number): Date {
  const first = utc(year, month, 1);
  return clampedDay(first.getUTCFullYear(), first.getUTCMonth(), statementDay);
}

function cycleEndingAt(statementDay: number, statementDate: Date): Cycle {
  const prevCut = cutIn(statementDay, statementDate.getUTCFullYear(), statementDate.getUTCMonth() - 1);
  return { start: addDays(prevCut, 1), end: addDays(statementDate, 1), statementDate };
}

/** The cycle a given day belongs to. */
export function cycleContaining(statementDay: number, day: Date): Cycle {
  const y = day.getUTCFullYear();
  const m = day.getUTCMonth();
  const cutThisMonth = cutIn(statementDay, y, m);
  const statementDate = day.getTime() <= cutThisMonth.getTime() ? cutThisMonth : cutIn(statementDay, y, m + 1);
  return cycleEndingAt(statementDay, statementDate);
}

/** The cycle one step before or after. */
export function stepCycle(statementDay: number, cycle: Cycle, dir: -1 | 1): Cycle {
  const d = cycle.statementDate;
  return cycleEndingAt(statementDay, cutIn(statementDay, d.getUTCFullYear(), d.getUTCMonth() + dir));
}

/**
 * The cycle still open on `today` (its cut hasn't happened yet, or is today)
 * and the last one that closed before it.
 */
export function getCycle(statementDay: number, today: Date): { open: Cycle; closed: Cycle } {
  const open = cycleContaining(statementDay, today);
  return { open, closed: stepCycle(statementDay, open, -1) };
}

/**
 * When a statement is due. A due day after the cut day falls in the same
 * month as the cut; on or before it, in the month after. A short month that
 * would put it on or before the cut pushes it one more month.
 */
export function getDueDate(statementDay: number, dueDay: number, cycle: Cycle): Date {
  const cut = cycle.statementDate;
  const y = cut.getUTCFullYear();
  const m = cut.getUTCMonth();
  let due = dueDay > statementDay ? cutIn(dueDay, y, m) : cutIn(dueDay, y, m + 1);
  if (due.getTime() <= cut.getTime()) due = cutIn(dueDay, y, m + 1);
  return due;
}

/** Sums for one card, read from the ledger around the last cut. */
export interface CycleSums {
  /** The card's balance at the end of the cut day: initial + adjustment
   *  − expenses + payments − transfers out, everything up to the cut.
   *  Negative while money is owed. */
  balanceAtCut: number;
  /** Payments (transfers into the card) dated after the cut. */
  paidSinceStatement: number;
  /** Expenses dated inside the open cycle. */
  currentCycleSpend: number;
}

export interface CreditCycleInfo {
  statementDay: number;
  dueDay: number | null;
  /** The last cut, `YYYY-MM-DD`. */
  lastStatementDate: string;
  /** The next cut, `YYYY-MM-DD`: the end of the open cycle. */
  nextStatementDate: string;
  /** The open cycle, `YYYY-MM-DD` to `YYYY-MM-DD`, both included. */
  cycleStart: string;
  cycleEnd: string;
  /** When the last statement is due, `YYYY-MM-DD`. Null without a due day. */
  dueDate: string | null;
  /** What was owed at the cut: the "pay this to avoid interest" amount. */
  statementBalance: number;
  paidSinceStatement: number;
  /** What's still owed of the statement. 0 once it's paid. */
  remainingToPay: number;
  currentCycleSpend: number;
  /** Days from today to the due date; negative once it's passed. Null without a due day. */
  daysUntilDue: number | null;
}

export function dayKeyOf(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Statement balance = what was owed at the cut, floored at 0. It equals the
 * cycle's spending when the previous statement was paid in full, and carries
 * the rest forward when it wasn't. Remaining = statement − paid since, floored.
 */
export function computeCycleInfo(
  statementDay: number,
  dueDay: number | null,
  today: Date,
  sums: CycleSums
): CreditCycleInfo {
  const { open, closed } = getCycle(statementDay, today);
  const statementBalance = round2(Math.max(0, -sums.balanceAtCut));
  const paidSinceStatement = round2(sums.paidSinceStatement);
  const remainingToPay = round2(Math.max(0, statementBalance - paidSinceStatement));
  const due = dueDay !== null ? getDueDate(statementDay, dueDay, closed) : null;

  return {
    statementDay,
    dueDay,
    lastStatementDate: dayKeyOf(closed.statementDate),
    nextStatementDate: dayKeyOf(open.statementDate),
    cycleStart: dayKeyOf(open.start),
    cycleEnd: dayKeyOf(open.statementDate),
    dueDate: due ? dayKeyOf(due) : null,
    statementBalance,
    paidSinceStatement,
    remainingToPay,
    currentCycleSpend: round2(sums.currentCycleSpend),
    daysUntilDue: due ? daysBetween(today, due) : null,
  };
}

/** A day of the month typed into a form: 1–31, or null to clear it. */
export function parseCycleDay(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= 31 ? n : null;
}

export type DueTone = "paid" | "ok" | "soon" | "overdue";

/** How urgent a statement looks: paid, comfortable, under 5 days, or late. */
export function dueTone(info: Pick<CreditCycleInfo, "remainingToPay" | "daysUntilDue">): DueTone | null {
  if (info.daysUntilDue === null) return null;
  if (info.remainingToPay <= 0) return "paid";
  if (info.daysUntilDue < 0) return "overdue";
  if (info.daysUntilDue < 5) return "soon";
  return "ok";
}
