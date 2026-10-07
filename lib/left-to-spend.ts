import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/money";
import { scheduleOf } from "@/lib/recurring";
import { dueOccurrences } from "@/services/recurrence";
import { leftToSpend, unmatchedOccurrences, type LeftToSpend } from "@/services/left-to-spend";
import { UNCATEGORIZED } from "@/services/finance";
import { dayKey, resolvePeriod } from "@/services/period";

const DAY = 86_400_000;

/**
 * Gathers what `leftToSpend` needs for the month holding `today`: the
 * budgets, what came in and went out so far (by category too), the recurring
 * occurrences still due before the month ends, and the income of the three
 * months before as a fallback for anyone with no budget.
 */
export async function getLeftToSpend(userId: string, today: Date): Promise<LeftToSpend | null> {
  const month = resolvePeriod("month", today).range;
  const lastDay = new Date(month.to.getTime() - DAY);
  const historyFrom = new Date(Date.UTC(month.from.getUTCFullYear(), month.from.getUTCMonth() - 3, 1));

  const [rows, rules, history, budgets] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId, date: { gte: month.from, lt: month.to }, type: { in: ["Gasto", "Ingreso"] } },
      select: { type: true, amount: true, category: true, account: true, recurringRuleId: true, occurrenceDate: true },
    }),
    prisma.recurringRule.findMany({
      where: { userId, active: true, type: { in: ["Gasto", "Ingreso"] } },
    }),
    prisma.transaction.groupBy({
      by: ["date"],
      where: { userId, type: "Ingreso", date: { gte: historyFrom, lt: month.from } },
      _sum: { amount: true },
    }),
    prisma.budgetConfig.findMany({ where: { userId }, select: { category: true, amount: true } }),
  ]);

  const movements = rows.map((r) => ({ ...r, amount: toNumber(r.amount) }));
  const sum = (type: string) => movements.filter((m) => m.type === type).reduce((s, m) => s + m.amount, 0);

  // Each rule's occurrences from its first unhandled day to the month's end,
  // less the ones already confirmed and the ones typed in by hand.
  const confirmed = new Set(
    movements.filter((m) => m.recurringRuleId && m.occurrenceDate).map((m) => `${m.recurringRuleId}:${dayKey(m.occurrenceDate!)}`)
  );
  const occurrences = rules.flatMap((rule) => {
    const from = rule.nextDueDate.getTime() > month.from.getTime() ? rule.nextDueDate : month.from;
    return dueOccurrences(scheduleOf(rule), from, lastDay, 40)
      .filter((d) => !confirmed.has(`${rule.id}:${dayKey(d)}`))
      .map(() => ({ type: rule.type, category: rule.category, account: rule.account, amount: toNumber(rule.amount) }));
  });
  const pending = unmatchedOccurrences(occurrences, movements);
  const pendingOf = (type: string) => pending.filter((o) => o.type === type).reduce((s, o) => s + o.amount, 0);

  const byCategory = (items: Array<{ type: string; category: string | null; amount: number }>) => {
    const out = new Map<string, number>();
    for (const m of items) {
      if (m.type !== "Gasto") continue;
      const key = m.category ?? UNCATEGORIZED;
      out.set(key, (out.get(key) ?? 0) + m.amount);
    }
    return out;
  };

  // Average over the months that had any income, so a month before the
  // first payday doesn't drag it down.
  const perMonth = new Map<string, number>();
  for (const h of history) {
    const key = dayKey(h.date).slice(0, 7);
    perMonth.set(key, (perMonth.get(key) ?? 0) + toNumber(h._sum.amount ?? 0));
  }
  const months = Array.from(perMonth.values()).filter((v) => v > 0);
  const averageIncome = months.length ? months.reduce((a, b) => a + b, 0) / months.length : 0;

  return leftToSpend({
    today,
    month,
    incomeSoFar: sum("Ingreso"),
    spentSoFar: sum("Gasto"),
    pendingIncome: pendingOf("Ingreso"),
    pendingFixed: pendingOf("Gasto"),
    hasIncomeRules: rules.some((r) => r.type === "Ingreso"),
    averageIncome,
    budgets: budgets.map((b) => ({ category: b.category, amount: toNumber(b.amount) })),
    spentByCategory: byCategory(movements),
    pendingByCategory: byCategory(pending),
  });
}
