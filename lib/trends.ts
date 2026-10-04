import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ts } from "@/lib/sql";
import { getAccountSums } from "@/lib/account-sums";
import { mapAccountConfig, toNumber } from "@/lib/money";
import { listRules } from "@/lib/recurring";
import { computeAccountBalancesFromSums, round2 } from "@/services/finance";
import type { DateRange } from "@/services/period";
import type { TrendsData } from "@/types";
import { countWeekdays } from "@/services/trend-window";


type MonthRow = {
  month: string;
  income: Prisma.Decimal | null;
  expenses: Prisma.Decimal | null;
  fixed: Prisma.Decimal | null;
};

type FlowRow = { month: string; account: string; flow: Prisma.Decimal | null };

type WeekdayRow = { dow: number; amount: Prisma.Decimal | null };

const n = (v: Prisma.Decimal | null | undefined) => round2(toNumber(v ?? 0));

/**
 * Everything the trend charts draw, summed in SQL: per month, what came in,
 * what went out and how much of that was a confirmed recurring charge; each
 * account's balance at the end of every month; and spending by weekday over
 * the period on screen.
 *
 * Balances run backwards from today's: an account at the end of a month is
 * what it holds now less everything that moved after. That lands on exactly
 * the figure the Wallet shows for the current month, adjustments included,
 * without having to know when an adjustment "happened".
 */
export async function getTrends(
  userId: string,
  window: { months: string[]; range: DateRange },
  period: DateRange
): Promise<TrendsData> {
  const { range } = window;

  const [monthRows, flowRows, inRows, weekdayRows, configs, sums, recurring] = await Promise.all([
    prisma.$queryRaw<MonthRow[]>`
      SELECT to_char(date_trunc('month', date), 'YYYY-MM') AS month,
        SUM(amount) FILTER (WHERE type = 'Ingreso') AS income,
        SUM(amount) FILTER (WHERE type = 'Gasto') AS expenses,
        -- By occurrence, not by rule: deleting a rule clears the link but
        -- keeps the day, and a month that was fixed stays fixed.
        SUM(amount) FILTER (WHERE type = 'Gasto' AND "occurrenceDate" IS NOT NULL) AS fixed
      FROM "Transaction"
      WHERE "userId" = ${userId} AND date >= ${ts(range.from)} AND date < ${ts(range.to)}
      GROUP BY 1
    `,
    // What left each account per month, from its own side. Income never
    // lands on a card (rule 7), so a stray one there counts for nothing, the
    // way `computeAccountBalancesFromSums` ignores it.
    prisma.$queryRaw<FlowRow[]>`
      SELECT to_char(date_trunc('month', t.date), 'YYYY-MM') AS month, t.account,
        SUM(CASE
          WHEN t.type = 'Ingreso' THEN CASE WHEN c."isCredit" THEN 0 ELSE t.amount END
          ELSE -t.amount
        END) AS flow
      FROM "Transaction" t
      LEFT JOIN "AccountConfig" c ON c."userId" = t."userId" AND c.account = t.account
      WHERE t."userId" = ${userId} AND t.date >= ${ts(range.from)}
      GROUP BY 1, 2
    `,
    prisma.$queryRaw<FlowRow[]>`
      SELECT to_char(date_trunc('month', date), 'YYYY-MM') AS month, "toAccount" AS account,
        SUM(amount) AS flow
      FROM "Transaction"
      WHERE "userId" = ${userId} AND type = 'Transferencia' AND "toAccount" IS NOT NULL
        AND date >= ${ts(range.from)}
      GROUP BY 1, 2
    `,
    prisma.$queryRaw<WeekdayRow[]>`
      SELECT EXTRACT(ISODOW FROM date)::int AS dow, SUM(amount) AS amount
      FROM "Transaction"
      WHERE "userId" = ${userId} AND type = 'Gasto'
        AND date >= ${ts(period.from)} AND date < ${ts(period.to)}
      GROUP BY 1
    `,
    prisma.accountConfig.findMany({ where: { userId } }).then((rows) => rows.map(mapAccountConfig)),
    getAccountSums(userId),
    listRules(userId),
  ]);

  const byMonth = new Map(monthRows.map((r) => [r.month, r]));

  const flows = new Map<string, Map<string, number>>(); // account → month → flow
  const addFlow = (account: string, month: string, amount: number) => {
    const perMonth = flows.get(account) ?? new Map<string, number>();
    perMonth.set(month, (perMonth.get(month) ?? 0) + amount);
    flows.set(account, perMonth);
  };
  for (const r of flowRows) addFlow(r.account, r.month, n(r.flow));
  for (const r of inRows) addFlow(r.account, r.month, n(r.flow));

  const balances = computeAccountBalancesFromSums(sums, configs);

  // Each account at the end of each charted month: today's balance less what
  // moved in the months after it. Months past the window still count, which
  // is why the flow queries have no upper bound.
  const endOf = new Map<string, number[]>();
  for (const b of balances) {
    const perMonth = flows.get(b.account) ?? new Map<string, number>();
    const later = Array.from(perMonth.entries());
    endOf.set(
      b.account,
      window.months.map((key) =>
        round2(b.currentBalance - later.reduce((s, [m, f]) => (m > key ? s + f : s), 0))
      )
    );
  }

  const months = window.months.map((key, i) => {
    const row = byMonth.get(key);
    let available = 0;
    let debt = 0;
    for (const b of balances) {
      const value = endOf.get(b.account)![i];
      if (b.isCredit) debt += Math.max(0, -value);
      else available += value;
    }
    return {
      key,
      income: n(row?.income),
      expenses: n(row?.expenses),
      fixed: n(row?.fixed),
      available: round2(available),
      netWorth: round2(available - debt),
    };
  });

  const cards = balances
    .filter((b) => b.isCredit && b.creditLimit !== null && b.creditLimit > 0)
    .map((b) => ({
      account: b.account,
      color: b.color,
      limit: b.creditLimit!,
      points: endOf.get(b.account)!.map((value, i) => {
        const owed = round2(Math.max(0, -value));
        return { key: window.months[i], debt: owed, utilization: round2((owed / b.creditLimit!) * 100) };
      }),
    }));

  const weekdays = Array.from({ length: 7 }, (_, i) =>
    n(weekdayRows.find((r) => r.dow === i + 1)?.amount)
  );

  return {
    months,
    cards,
    weekdays,
    weekdayCounts: countWeekdays(period),
    fixedCommitment: recurring.fixedExpenses,
  };
}
