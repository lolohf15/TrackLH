export type TransactionType = "Gasto" | "Ingreso" | "Transferencia";

export const VALID_TRANSACTION_TYPES: TransactionType[] = [
  "Gasto",
  "Ingreso",
  "Transferencia",
];

export function isValidTransactionType(t: string): t is TransactionType {
  return VALID_TRANSACTION_TYPES.includes(t as TransactionType);
}

/** Fallback for a category or account that exists on a row but has no config. */
export const UNKNOWN_COLOR = "#6b7075";

export type CategoryKind = "expense" | "income";

export interface Category {
  id: string;
  name: string;
  color: string;
  kind: CategoryKind;
  sortOrder: number;
}

export interface AccountOption {
  account: string;
  isCredit: boolean;
  color: string | null;
}

/** What the add-record form needs: this user's accounts and categories. */
export interface Catalog {
  accounts: AccountOption[];
  expenseCategories: Category[];
  incomeCategories: Category[];
}

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  type: TransactionType;
  category: string | null;
  account: string;
  toAccount: string | null;
  description: string | null;
  notes: string | null;
  procesado: boolean;
  syncedAt: string;
}

export interface AccountBalance {
  account: string;
  initialBalance: number;
  calculatedBalance: number;
  balanceAdjustment: number;
  currentBalance: number;
  income: number;
  expenses: number;
  transfersIn: number;
  transfersOut: number;
  isCredit: boolean;
  color: string;
}

export interface CategorySummary {
  category: string;
  amount: number;
  percentage: number;
  count: number;
  color: string;
}

export interface BudgetItem {
  category: string;
  budget: number;
  spent: number;
  percentage: number;
  remaining: number;
  color: string;
}

export interface DashboardData {
  totalAvailable: number;
  monthlyExpenses: number;
  monthlyIncome: number;
  netBalance: number;
  prevMonthExpenses: number;
  prevMonthIncome: number;
  budgetUsed: number;
  budgetTotal: number;
  budgetUsedPercent: number;
  accountBalances: AccountBalance[];
  categoryExpenses: CategorySummary[];
  budgetItems: BudgetItem[];
  lastSyncAt: string | null;
  transactionCount: number;
}

export interface CategoryTrendPoint {
  month: string;
  amount: number;
}

export interface CategoryTrend {
  category: string;
  color: string;
  points: CategoryTrendPoint[];
  currentAmount: number;
  budget: number;
}

export interface TransactionFilters {
  month: string;
  category: string;
  account: string;
  type: string;
  page: number;
  limit: number;
}

export interface PaginatedTransactions {
  data: Transaction[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface NewTransactionInput {
  type: TransactionType;
  account: string;
  toAccount?: string;
  category?: string;
  amount: number;
  /** Local wall clock, `YYYY-MM-DDTHH:mm:ss`. */
  date: string;
  description?: string;
}
