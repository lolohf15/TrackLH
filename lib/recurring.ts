import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/money";
import { validateTransactionInput } from "@/lib/transaction-input";
import type { ApiMessages } from "@/lib/api-lang";
import { round2 } from "@/services/finance";
import {
  MAX_INTERVAL, dueOccurrences, firstOnOrAfter, isFrequency, monthlyEquivalent, parseDay,
  type Frequency, type Schedule,
} from "@/services/recurrence";
import type { PendingOccurrence, RecurringList, RecurringRuleView, TransactionType } from "@/types";

type RuleRow = {
  id: string;
  type: string;
  amount: Prisma.Decimal | number;
  account: string;
  toAccount: string | null;
  category: string | null;
  description: string | null;
  frequency: string;
  interval: number;
  anchorDate: Date;
  dayOfMonth: number | null;
  nextDueDate: Date;
  endDate: Date | null;
  active: boolean;
};

export function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function scheduleOf(row: RuleRow): Schedule {
  return {
    frequency: row.frequency as Frequency,
    interval: row.interval,
    anchorDate: row.anchorDate,
    dayOfMonth: row.dayOfMonth,
    endDate: row.endDate,
  };
}

/** The next occurrence still to handle. `nextDueDate` is the first day not
 *  yet handled, so the occurrence is the first one on or after it. */
export function nextOccurrence(row: RuleRow): Date | null {
  return firstOnOrAfter(scheduleOf(row), row.nextDueDate);
}

/** The one place a rule row turns into the wire shape. */
export function serializeRule(row: RuleRow): RecurringRuleView {
  const amount = toNumber(row.amount);
  const next = nextOccurrence(row);
  return {
    id: row.id,
    type: row.type as TransactionType,
    amount,
    account: row.account,
    toAccount: row.toAccount,
    category: row.category,
    description: row.description,
    frequency: row.frequency as Frequency,
    interval: row.interval,
    startDate: dayKey(row.anchorDate),
    endDate: row.endDate ? dayKey(row.endDate) : null,
    active: row.active,
    nextDate: next ? dayKey(next) : null,
    monthlyAmount: monthlyEquivalent(amount, row.frequency as Frequency, row.interval),
  };
}

/** Every rule this user has, with the monthly fixed figures beside them. */
export async function listRules(userId: string): Promise<RecurringList> {
  const rows = await prisma.recurringRule.findMany({
    where: { userId },
    orderBy: [{ active: "desc" }, { nextDueDate: "asc" }, { createdAt: "asc" }],
  });
  const rules = rows.map(serializeRule);

  // A paused rule, or one past its end, isn't part of what a month costs.
  const live = rules.filter((r) => r.active && r.nextDate !== null);
  const sum = (type: TransactionType) =>
    round2(live.filter((r) => r.type === type).reduce((s, r) => s + r.monthlyAmount, 0));

  return { rules, fixedExpenses: sum("Gasto"), fixedIncome: sum("Ingreso") };
}

/**
 * What's waiting: for each active rule, the occurrences from the first
 * unhandled day through `today` that don't already have a movement. Lazy on
 * purpose — no cron, nothing posts on its own — so whatever was missed while
 * the app sat closed is simply still here the next time it opens.
 */
export async function pendingOccurrences(userId: string, today: Date): Promise<PendingOccurrence[]> {
  const rows = await prisma.recurringRule.findMany({
    where: { userId, active: true, nextDueDate: { lte: today } },
    orderBy: { nextDueDate: "asc" },
  });
  if (rows.length === 0) return [];

  // Occurrences that already have their movement — logged from the record
  // sheet, or confirmed in a request that didn't get to advance the rule.
  const logged = await prisma.transaction.findMany({
    where: { userId, recurringRuleId: { in: rows.map((r) => r.id) }, occurrenceDate: { not: null } },
    select: { recurringRuleId: true, occurrenceDate: true },
  });
  const done = new Set(logged.map((t) => `${t.recurringRuleId}:${dayKey(t.occurrenceDate!)}`));

  const out: PendingOccurrence[] = [];
  for (const row of rows) {
    const due = dueOccurrences(scheduleOf(row), row.nextDueDate, today).filter(
      (d) => !done.has(`${row.id}:${dayKey(d)}`)
    );
    if (due.length === 0) continue;
    out.push({ rule: serializeRule(row), occurrenceDate: dayKey(due[0]), count: due.length });
  }
  return out.sort((a, b) => a.occurrenceDate.localeCompare(b.occurrenceDate));
}

/**
 * The oldest occurrence still waiting for a rule, or null when nothing is.
 * Confirm and Skip only ever act on this one, so a catch-up is worked through
 * in order and nothing gets silently stepped over.
 */
export async function oldestPending(row: RuleRow, today: Date): Promise<Date | null> {
  const due = dueOccurrences(scheduleOf(row), row.nextDueDate, today);
  if (due.length === 0) return null;
  const logged = await prisma.transaction.findMany({
    where: { recurringRuleId: row.id, occurrenceDate: { in: due } },
    select: { occurrenceDate: true },
  });
  const done = new Set(logged.map((t) => dayKey(t.occurrenceDate!)));
  return due.find((d) => !done.has(dayKey(d))) ?? null;
}

export interface CleanRule {
  type: TransactionType;
  amount: number;
  account: string;
  toAccount: string | null;
  category: string | null;
  description: string | null;
  frequency: Frequency;
  interval: number;
  anchorDate: Date;
  dayOfMonth: number | null;
  endDate: Date | null;
  active: boolean;
}

type Result = { ok: true; data: CleanRule } | { ok: false; error: string; status: number };

/**
 * The gate every rule write goes through. The movement half — type, account,
 * category, amount — is checked by the very function that checks a movement,
 * so a rule can never hold something its Confirm would then refuse.
 */
export async function validateRuleInput(
  userId: string,
  body: Record<string, unknown>,
  m: ApiMessages
): Promise<Result> {
  const start = parseDay(body.startDate);
  if (!start) return { ok: false, error: m.dateInvalid, status: 400 };

  const movement = await validateTransactionInput(userId, {
    ...body,
    date: `${dayKey(start)}T12:00:00`,
  });
  if (!movement.ok) return movement;

  if (!isFrequency(body.frequency)) {
    return { ok: false, error: m.frequencyInvalid, status: 400 };
  }
  const interval = body.interval === undefined || body.interval === null ? 1 : Number(body.interval);
  if (!Number.isInteger(interval) || interval < 1 || interval > MAX_INTERVAL) {
    return { ok: false, error: m.intervalInvalid, status: 400 };
  }

  let endDate: Date | null = null;
  if (body.endDate !== undefined && body.endDate !== null && body.endDate !== "") {
    endDate = parseDay(body.endDate);
    if (!endDate || endDate.getTime() < start.getTime()) {
      return { ok: false, error: m.endBeforeStart, status: 400 };
    }
  }

  const { type, amount, account, toAccount, category, description } = movement.data;
  return {
    ok: true,
    data: {
      type,
      amount,
      account,
      toAccount,
      category,
      description,
      frequency: body.frequency,
      interval,
      anchorDate: start,
      // The start date's own day. A rule started on the 31st stays on the
      // 31st, clamped only in the months that don't have one.
      dayOfMonth: body.frequency === "weekly" ? null : start.getUTCDate(),
      endDate,
      active: body.active === undefined ? true : body.active !== false,
    },
  };
}
