import type {
  Transaction,
  AccountBalance,
  CategorySummary,
  BudgetItem,
  DashboardData,
} from "@/types";
import { ACCOUNT_COLORS, DEFAULT_BUDGETS, TOTAL_BUDGET } from "@/types";

const CATEGORY_COLORS = [
  "#C6A15B", "#9B72CF", "#D4518A", "#D4762A", "#2EA87A",
  "#4F7BE8", "#2E9EC4", "#7B9E5C", "#B8763E", "#A06BAE",
];

// Rule 12: all amounts rounded to 2 decimals
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function getPrevMonth(month: string): string {
  const [year, m] = month.split("-").map(Number);
  const d = new Date(year, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function getTransactionMonth(date: string): string {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function filterByMonth(transactions: Transaction[], month: string): Transaction[] {
  if (!month) return transactions;
  return transactions.filter((t) => getTransactionMonth(t.date) === month);
}

/**
 * Rule 6 (debit):  balance = initial + income − expenses − transfersOut + transfersIn
 * Rule 7 (credit): balance = initial − expenses + transfersIn (payments)
 *
 * Transfers NEVER count as income or expense (rule 10).
 */
export function computeAccountBalances(
  transactions: Transaction[],
  configs: Array<{ account: string; initialBalance: number; isCredit: boolean; color: string | null; balanceAdjustment?: number }>
): AccountBalance[] {
  const configMap = new Map(configs.map((c) => [c.account, c]));

  const accounts = new Set([
    ...configs.map((c) => c.account),
    ...transactions.map((t) => t.account),
    ...transactions.filter((t) => t.toAccount).map((t) => t.toAccount as string),
  ]);

  return Array.from(accounts).map((account) => {
    const config = configMap.get(account);
    const initialBalance = config?.initialBalance ?? 0;
    const isCredit = config?.isCredit ?? false;
    const color = config?.color ?? ACCOUNT_COLORS[account] ?? "#9CA3AF";
    const balanceAdjustment = config?.balanceAdjustment ?? 0;

    let income = 0;
    let expenses = 0;
    let transfersIn = 0;
    let transfersOut = 0;

    for (const t of transactions) {
      if (t.type === "Ingreso" && t.account === account) {
        income = round2(income + t.amount);
      } else if (t.type === "Gasto" && t.account === account) {
        expenses = round2(expenses + t.amount);
      } else if (t.type === "Transferencia") {
        if (t.account === account) transfersOut = round2(transfersOut + t.amount);
        if (t.toAccount === account) transfersIn = round2(transfersIn + t.amount);
      }
    }

    // Rule 6 vs rule 7 — credit accounts don't accumulate income
    const calculatedBalance = isCredit
      ? round2(initialBalance - expenses + transfersIn - transfersOut)
      : round2(initialBalance + income - expenses + transfersIn - transfersOut);

    const currentBalance = round2(calculatedBalance + balanceAdjustment);

    return { account, initialBalance, calculatedBalance, balanceAdjustment, currentBalance, income, expenses, transfersIn, transfersOut, isCredit, color };
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
  month: string
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
    .map(([category, { amount, count }], i) => ({
      category,
      amount,
      count,
      percentage: total > 0 ? round2((amount / total) * 100) : 0,
      color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
    }));
}

export function computeBudgetItems(
  transactions: Transaction[],
  month: string,
  budgets: Array<{ category: string; amount: number }>
): BudgetItem[] {
  const categoryExpenses = computeCategoryExpenses(transactions, month);
  const expMap = new Map(categoryExpenses.map((c) => [c.category, c.amount]));

  return budgets.map(({ category, amount: budget }) => {
    const spent = expMap.get(category) ?? 0;
    return {
      category,
      budget,
      spent,
      percentage: budget > 0 ? Math.min(round2((spent / budget) * 100), 100) : 0,
      remaining: round2(budget - spent),
    };
  });
}

// Rule 11: budget utilization — use actual configured totals, not the hardcoded constant
function computeBudgetUtilization(
  budgetItems: BudgetItem[]
): { budgetUsed: number; budgetTotal: number; budgetUsedPercent: number } {
  const budgetUsed  = round2(budgetItems.reduce((s, b) => s + b.spent, 0));
  const budgetTotal = round2(budgetItems.reduce((s, b) => s + b.budget, 0)) || TOTAL_BUDGET;
  const budgetUsedPercent = budgetTotal > 0 ? Math.min(round2((budgetUsed / budgetTotal) * 100), 100) : 0;
  return { budgetUsed, budgetTotal, budgetUsedPercent };
}

export function buildDashboardData(
  transactions: Transaction[],
  month: string,
  accountConfigs: Array<{ account: string; initialBalance: number; isCredit: boolean; color: string | null; balanceAdjustment?: number }>,
  budgetConfigs: Array<{ category: string; amount: number }>,
  lastSyncAt: string | null
): DashboardData {
  const accountBalances = computeAccountBalances(transactions, accountConfigs);
  const totalAvailable = computeTotalAvailable(accountBalances);
  const monthlyExpenses = computeMonthlyExpenses(transactions, month);
  const monthlyIncome = computeMonthlyIncome(transactions, month);
  const netBalance = round2(monthlyIncome - monthlyExpenses);
  const categoryExpenses = computeCategoryExpenses(transactions, month);

  const prevMonth = getPrevMonth(month);
  const prevMonthExpenses = computeMonthlyExpenses(transactions, prevMonth);
  const prevMonthIncome   = computeMonthlyIncome(transactions, prevMonth);

  // Use DEFAULT_BUDGETS if no DB configs exist yet
  const effectiveBudgets = budgetConfigs.length > 0 ? budgetConfigs : DEFAULT_BUDGETS;
  const budgetItems = computeBudgetItems(transactions, month, effectiveBudgets);
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
    transactionCount: transactions.length,
  };
}
