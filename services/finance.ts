import type {
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

export function filterByMonth(transactions: Transaction[], month: string): Transaction[] {
  if (!month) return transactions;
  return transactions.filter((t) => getTransactionMonth(t.date) === month);
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
export function computeMonthlyIncome(transactions: Transaction[], month: string): number {
  return round2(
    filterByMonth(transactions, month)
      .filter((t) => t.type === "Ingreso")
      .reduce((sum, t) => sum + t.amount, 0)
  );
}

// Rule 9: only Gasto type
export function computeMonthlyExpenses(transactions: Transaction[], month: string): number {
  return round2(
    filterByMonth(transactions, month)
      .filter((t) => t.type === "Gasto")
      .reduce((sum, t) => sum + t.amount, 0)
  );
}

export function computeCategoryExpenses(
  transactions: Transaction[],
  month: string,
  colors: ColorMap
): CategorySummary[] {
  // Rule 11: only Gasto counts toward categories
  const monthly = filterByMonth(transactions, month).filter((t) => t.type === "Gasto");

  const map = new Map<string, { amount: number; count: number }>();
  for (const t of monthly) {
    const cat = t.category ?? "Sin categoría";
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
  months: string[],
  budgets: Array<{ category: string; amount: number }>,
  colors: ColorMap
): CategoryTrend[] {
  const budgetMap = new Map(budgets.map((b) => [b.category, b.amount]));

  const perMonth = months.map((m) => computeCategoryExpenses(transactions, m, colors));
  const currentSummaries = perMonth[perMonth.length - 1];

  const categories = new Set<string>();
  for (const summary of perMonth) {
    for (const c of summary) categories.add(c.category);
  }

  return Array.from(categories)
    .map((category) => {
      const currentEntry = currentSummaries.find((c) => c.category === category);
      const points = months.map((month, i) => ({
        month,
        amount: perMonth[i].find((c) => c.category === category)?.amount ?? 0,
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
  month: string,
  budgets: Array<{ category: string; amount: number }>,
  colors: ColorMap
): BudgetItem[] {
  const categoryExpenses = computeCategoryExpenses(transactions, month, colors);
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
    const month = `${year}-${String(i + 1).padStart(2, "0")}`;
    const income = computeMonthlyIncome(transactions, month);
    const expenses = computeMonthlyExpenses(transactions, month);
    return {
      month,
      income,
      expenses,
      net: round2(income - expenses),
      hasData: filterByMonth(transactions, month).length > 0,
    };
  });
}

export function buildDashboardData(
  transactions: Transaction[],
  month: string,
  accountBalances: AccountBalance[],
  budgetConfigs: Array<{ category: string; amount: number }>,
  lastSyncAt: string | null,
  colors: ColorMap
): DashboardData {
  const totalAvailable = computeTotalAvailable(accountBalances);
  const monthlyExpenses = computeMonthlyExpenses(transactions, month);
  const monthlyIncome = computeMonthlyIncome(transactions, month);
  const netBalance = round2(monthlyIncome - monthlyExpenses);
  const categoryExpenses = computeCategoryExpenses(transactions, month, colors);

  const prevMonth = getPrevMonth(month);
  const prevMonthExpenses = computeMonthlyExpenses(transactions, prevMonth);
  const prevMonthIncome   = computeMonthlyIncome(transactions, prevMonth);

  // No global fallback: a new user simply has no budgets until they set some.
  const budgetItems = computeBudgetItems(transactions, month, budgetConfigs, colors);
  const { budgetUsed, budgetTotal, budgetUsedPercent } = computeBudgetUtilization(budgetItems);

  return {
    totalAvailable,
    monthlyExpenses,
    monthlyIncome,
    netBalance,
    prevMonthExpenses,
    prevMonthIncome,
    budgetUsed,
    budgetTotal,
    budgetUsedPercent,
    accountBalances,
    categoryExpenses,
    budgetItems,
    lastSyncAt,
  };
}
