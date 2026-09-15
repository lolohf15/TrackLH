import type {
  BucketBreakdown,
  Transaction,
  AccountBalance,
  CategorySummary,
  BudgetItem,
  DashboardData,
  CategoryTrend,
  YearlyNetPoint,
} from "@/types";
import { UNKNOWN_COLOR } from "@/types";
import { getCurrentMonth, getPrevMonth } from "@/lib/utils";
import type { Bucket, DateRange, Period } from "./period";

/** What a Gasto with no category is filed under, on screen and in charts. */
export const UNCATEGORIZED = "Sin categoría";

/** Category name -> color, built from this user's Category rows. */
export type ColorMap = Map<string, string>;

// Re-exported so route handlers can pull month helpers from one place
// alongside the rest of the finance logic they already import from here.
export { getCurrentMonth, getPrevMonth };

// Rule 12: all amounts rounded to 2 decimals
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function getTransactionMonth(date: string): string {
  const d = new Date(date);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Half-open, matching `DateRange`: a movement at midnight belongs to the day
 *  that starts, not the one that ends. */
export function filterByRange(transactions: Transaction[], range: DateRange): Transaction[] {
  const from = range.from.getTime();
  const to = range.to.getTime();
  return transactions.filter((t) => {
    const at = new Date(t.date).getTime();
    return at >= from && at < to;
  });
}

/** Per-account totals across the user's whole history (rule 6/7 inputs). */
export interface AccountSums {
  income: number;
  expenses: number;
  transfersIn: number;
  transfersOut: number;
}

/**
 * Rule 6 (debit):  balance = initial + income − expenses − transfersOut + transfersIn
 * Rule 7 (credit): balance = initial − expenses + transfersIn (payments)
 *
 * Transfers NEVER count as income or expense (rule 10).
 *
 * Takes pre-aggregated sums rather than raw transactions — an account's
 * balance depends on its *entire* history, and summing that in SQL (see
 * `lib/account-sums.ts`) is the difference between one aggregate query and
 * pulling every transaction the user has ever logged into memory.
 */
export function computeAccountBalancesFromSums(
  sums: Map<string, AccountSums>,
  configs: Array<{ account: string; initialBalance: number; isCredit: boolean; color: string | null; balanceAdjustment?: number; creditLimit?: number | null }>
): AccountBalance[] {
  const configMap = new Map(configs.map((c) => [c.account, c]));

  const accounts = new Set([...configs.map((c) => c.account), ...sums.keys()]);

  return Array.from(accounts).map((account) => {
    const config = configMap.get(account);
    const initialBalance = config?.initialBalance ?? 0;
    const isCredit = config?.isCredit ?? false;
    const color = config?.color ?? UNKNOWN_COLOR;
    const balanceAdjustment = config?.balanceAdjustment ?? 0;

    const { income, expenses, transfersIn, transfersOut } =
      sums.get(account) ?? { income: 0, expenses: 0, transfersIn: 0, transfersOut: 0 };

    // Rule 6 vs rule 7 — credit accounts don't accumulate income
    const calculatedBalance = isCredit
      ? round2(initialBalance - expenses + transfersIn - transfersOut)
      : round2(initialBalance + income - expenses + transfersIn - transfersOut);

    const currentBalance = round2(calculatedBalance + balanceAdjustment);

    // A credit balance is negative while money is owed, so the debt is its
    // mirror. Overpaying pushes the balance positive: nothing is owed then,
    // and the surplus stays visible as the positive balance itself rather
    // than inflating the available line past the approved limit.
    const creditLimit = config?.creditLimit ?? null;
    const debt = isCredit ? round2(Math.max(0, -currentBalance)) : null;
    const availableCredit =
      debt !== null && creditLimit !== null ? round2(creditLimit - debt) : null;
    // Uncapped on purpose, unlike the budget percentages: going past the
    // approved line is exactly the thing worth seeing.
    const utilizationPercent =
      debt !== null && creditLimit !== null && creditLimit > 0
        ? round2((debt / creditLimit) * 100)
        : null;

    return {
      account, initialBalance, calculatedBalance, balanceAdjustment, currentBalance,
      income, expenses, transfersIn, transfersOut, isCredit, color,
      creditLimit, debt, availableCredit, utilizationPercent,
    };
  });
}

// Rule 8: total disponible = sum of debit accounts only
export function computeTotalAvailable(balances: AccountBalance[]): number {
  return round2(
    balances.filter((b) => !b.isCredit).reduce((sum, b) => sum + b.currentBalance, 0)
  );
}

// Rule 9: only Ingreso type
export function computeIncome(transactions: Transaction[], range: DateRange): number {
  return round2(
    filterByRange(transactions, range)
      .filter((t) => t.type === "Ingreso")
      .reduce((sum, t) => sum + t.amount, 0)
  );
}

// Rule 9: only Gasto type
export function computeExpenses(transactions: Transaction[], range: DateRange): number {
  return round2(
    filterByRange(transactions, range)
      .filter((t) => t.type === "Gasto")
      .reduce((sum, t) => sum + t.amount, 0)
  );
}

/**
 * Income and spending per chart slice, with each slice's expenses split by
 * category so a bar can be stacked.
 *
 * One pass over the ledger rather than one filter per bucket: a year charted
 * by month with a few thousand rows would otherwise walk the whole list
 * twelve times over. Rows are keyed by the prefix of their stored ISO date,
 * which is already UTC-pinned, so it lands in the same slice `bucketsFor`
 * drew.
 */
export function computeBucketBreakdowns(
  transactions: Transaction[],
  buckets: Bucket[],
  granularity: "day" | "month",
  colors: ColorMap
): BucketBreakdown[] {
  const keyLength = granularity === "day" ? 10 : 7;
  const indexOfKey = new Map(buckets.map((b, i) => [b.key, i]));

  const totals = buckets.map(() => ({
    income: 0,
    expenses: 0,
    byCategory: new Map<string, number>(),
  }));

  for (const t of transactions) {
    // Rule 10: a transfer is neither income nor spending, in any slice.
    if (t.type === "Transferencia") continue;

    const slot = totals[indexOfKey.get(t.date.slice(0, keyLength)) ?? -1];
    // Rows outside the charted span — the previous period, fetched in the
    // same query for the trend arrows — simply have no bar to land in.
    if (!slot) continue;

    if (t.type === "Ingreso") {
      slot.income += t.amount;
      continue;
    }

    slot.expenses += t.amount;
    const category = t.category ?? UNCATEGORIZED;
    slot.byCategory.set(category, (slot.byCategory.get(category) ?? 0) + t.amount);
  }

  return buckets.map((bucket, i) => ({
    key: bucket.key,
    income: round2(totals[i].income),
    expenses: round2(totals[i].expenses),
    slices: Array.from(totals[i].byCategory.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([category, amount]) => ({
        category,
        amount: round2(amount),
        color: colors.get(category) ?? UNKNOWN_COLOR,
      })),
  }));
}

export function computeCategoryExpenses(
  transactions: Transaction[],
  range: DateRange,
  colors: ColorMap
): CategorySummary[] {
  // Rule 11: only Gasto counts toward categories
  const inRange = filterByRange(transactions, range).filter((t) => t.type === "Gasto");

  const map = new Map<string, { amount: number; count: number }>();
  for (const t of inRange) {
    const cat = t.category ?? UNCATEGORIZED;
    const existing = map.get(cat) ?? { amount: 0, count: 0 };
    map.set(cat, { amount: round2(existing.amount + t.amount), count: existing.count + 1 });
  }

  const total = Array.from(map.values()).reduce((s, v) => s + v.amount, 0);

  return Array.from(map.entries())
    .sort((a, b) => b[1].amount - a[1].amount)
    .map(([category, { amount, count }]) => ({
      category,
      amount,
      count,
      percentage: total > 0 ? round2((amount / total) * 100) : 0,
      color: colors.get(category) ?? UNKNOWN_COLOR,
    }));
}

export function computeCategoryTrends(
  transactions: Transaction[],
  buckets: Bucket[],
  budgets: Array<{ category: string; amount: number }>,
  colors: ColorMap
): CategoryTrend[] {
  const budgetMap = new Map(budgets.map((b) => [b.category, b.amount]));

  const perBucket = buckets.map((b) => computeCategoryExpenses(transactions, b.range, colors));
  const currentSummaries = perBucket[perBucket.length - 1] ?? [];

  const categories = new Set<string>();
  for (const summary of perBucket) {
    for (const c of summary) categories.add(c.category);
  }

  return Array.from(categories)
    .map((category) => {
      const currentEntry = currentSummaries.find((c) => c.category === category);
      const points = buckets.map((bucket, i) => ({
        month: bucket.key,
        amount: perBucket[i].find((c) => c.category === category)?.amount ?? 0,
      }));
      return {
        category,
        color: currentEntry?.color ?? colors.get(category) ?? UNKNOWN_COLOR,
        points,
        currentAmount: currentEntry?.amount ?? 0,
        budget: budgetMap.get(category) ?? 0,
      };
    })
    .sort((a, b) => b.currentAmount - a.currentAmount);
}

export function computeBudgetItems(
  transactions: Transaction[],
  range: DateRange,
  budgets: Array<{ category: string; amount: number }>,
  colors: ColorMap
): BudgetItem[] {
  const categoryExpenses = computeCategoryExpenses(transactions, range, colors);
  const expMap = new Map(categoryExpenses.map((c) => [c.category, c.amount]));

  return budgets.map(({ category, amount: budget }) => {
    const spent = expMap.get(category) ?? 0;
    return {
      category,
      budget,
      spent,
      percentage: budget > 0 ? Math.min(round2((spent / budget) * 100), 100) : 0,
      remaining: round2(budget - spent),
      color: colors.get(category) ?? UNKNOWN_COLOR,
    };
  });
}

// Rule 11: budget utilization — always the user's own configured totals
function computeBudgetUtilization(
  budgetItems: BudgetItem[]
): { budgetUsed: number; budgetTotal: number; budgetUsedPercent: number } {
  const budgetUsed  = round2(budgetItems.reduce((s, b) => s + b.spent, 0));
  // `??` not `||`: a user who has budgeted nothing genuinely has a total of 0.
  const budgetTotal = round2(budgetItems.reduce((s, b) => s + b.budget, 0));
  const budgetUsedPercent = budgetTotal > 0 ? Math.min(round2((budgetUsed / budgetTotal) * 100), 100) : 0;
  return { budgetUsed, budgetTotal, budgetUsedPercent };
}

export function computeYearlyNet(transactions: Transaction[], year: number): YearlyNetPoint[] {
  return Array.from({ length: 12 }, (_, i) => {
    const range = {
      from: new Date(Date.UTC(year, i, 1)),
      to: new Date(Date.UTC(year, i + 1, 1)),
    };
    const income = computeIncome(transactions, range);
    const expenses = computeExpenses(transactions, range);
    return {
      month: `${year}-${String(i + 1).padStart(2, "0")}`,
      income,
      expenses,
      net: round2(income - expenses),
      hasData: filterByRange(transactions, range).length > 0,
    };
  });
}

export function buildDashboardData(
  transactions: Transaction[],
  period: Period,
  accountBalances: AccountBalance[],
  budgetConfigs: Array<{ category: string; amount: number }>,
  /**
   * Budgets are a monthly idea and stay one whatever period is on screen —
   * comparing a week of spending to a month's budget would read as being
   * wildly under. The calendar month holding the anchor, always.
   */
  budgetRange: DateRange,
  lastSyncAt: string | null,
  colors: ColorMap
): DashboardData {
  const totalAvailable = computeTotalAvailable(accountBalances);
  // Rule 8 is untouched — "total disponible" is still debit only. This is the
  // question asked beside it: what's left once the cards are paid off.
  const netWorth = round2(
    totalAvailable - accountBalances.reduce((sum, b) => sum + (b.debt ?? 0), 0)
  );
  const periodExpenses = computeExpenses(transactions, period.range);
  const periodIncome = computeIncome(transactions, period.range);
  const netBalance = round2(periodIncome - periodExpenses);
  const categoryExpenses = computeCategoryExpenses(transactions, period.range, colors);

  // All-time has nothing before it, so its trend arrows simply don't appear.
  const prevPeriodExpenses = period.previous ? computeExpenses(transactions, period.previous) : 0;
  const prevPeriodIncome = period.previous ? computeIncome(transactions, period.previous) : 0;

  // No global fallback: a new user simply has no budgets until they set some.
  const budgetItems = computeBudgetItems(transactions, budgetRange, budgetConfigs, colors);
  const { budgetUsed, budgetTotal, budgetUsedPercent } = computeBudgetUtilization(budgetItems);

  return {
    period: period.kind,
    totalAvailable,
    netWorth,
    periodExpenses,
    periodIncome,
    netBalance,
    prevPeriodExpenses,
    prevPeriodIncome,
    budgetUsed,
    budgetTotal,
    budgetUsedPercent,
    accountBalances,
    categoryExpenses,
    budgetItems,
    lastSyncAt,
  };
}
