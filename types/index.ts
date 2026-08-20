export type TransactionType = "Gasto" | "Ingreso" | "Transferencia";

export const VALID_TRANSACTION_TYPES: TransactionType[] = [
  "Gasto",
  "Ingreso",
  "Transferencia",
];

export function isValidTransactionType(t: string): t is TransactionType {
  return VALID_TRANSACTION_TYPES.includes(t as TransactionType);
}

export type AccountName =
  | "Nu Crédito"
  | "Nu Débito"
  | "Revolut"
  | "Revolut Débito"
  | "BBVA Débito"
  | "Efectivo"
  | "Inversiones";

// Debit accounts: rule 6
export const DEBIT_ACCOUNTS: AccountName[] = [
  "Nu Débito",
  "Revolut Débito",
  "BBVA Débito",
  "Efectivo",
  "Inversiones",
];

// Credit accounts: rule 7 — Revolut is credit, not debit
export const CREDIT_ACCOUNTS: AccountName[] = ["Nu Crédito", "Revolut"];

export const ALL_ACCOUNTS: AccountName[] = [...DEBIT_ACCOUNTS, ...CREDIT_ACCOUNTS];

// Ledger dot colors — one distinct hue per debit account. Credit accounts
// are always red (rule: credit = red, never a neutral/positive color).
export const ACCOUNT_COLORS: Record<string, string> = {
  "Nu Débito": "#d99a15",
  "Revolut Débito": "#3a8f95",
  "BBVA Débito": "#5b7fb5",
  Efectivo: "#6b7075",
  Inversiones: "#4f9d5f",
  "Nu Crédito": "#e5484d",
  Revolut: "#e5484d",
};

export const TRANSACTION_TYPE_COLORS: Record<string, string> = {
  Gasto: "#e5484d",
  Ingreso: "#22a355",
  Transferencia: "#d99a15",
};

// Category colors — mapped by meaning onto the redesign's 7-swatch palette
// (3 warm / 3 cool / 1 neutral), plus one extra warm tone for the 8th
// category since our real Notion categories don't line up 1:1 with the
// design mockup's placeholder set.
export const CATEGORY_COLORS: Record<string, string> = {
  Alimentos: "#e0703a",  // warm orange (food)
  Gustos: "#d99a15",     // warm gold (discretionary treats)
  Salidas: "#d2452e",    // warm red (going out)
  Regalos: "#c2547a",    // warm rose (gifts)
  Servicios: "#3a8f95",  // cool teal (utilities)
  Gas: "#8b5cd9",        // cool violet (fuel/transport)
  Esenciales: "#4f9d5f", // cool green (essentials)
  Otro: "#6b7075",       // neutral gray
};

// Budget section exception: Gas (fuel/transport) shows green instead of
// its usual violet, matching the redesign's one-off contrast rule.
export const BUDGET_COLOR_OVERRIDES: Record<string, string> = {
  Gas: "#22a355",
};

// Rule 11: monthly category budgets
export const DEFAULT_BUDGETS: Array<{ category: string; amount: number }> = [
  { category: "Gas", amount: 3200 },
  { category: "Regalos", amount: 1000 },
  { category: "Salidas", amount: 1000 },
  { category: "Alimentos", amount: 1250 },
  { category: "Servicios", amount: 500 },
  { category: "Esenciales", amount: 500 },
  { category: "Gustos", amount: 500 },
  { category: "Otro", amount: 300 },
];

export const TOTAL_BUDGET = DEFAULT_BUDGETS.reduce((s, b) => s + b.amount, 0); // 8250

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

export interface SyncResult {
  success: boolean;
  count: number;
  skipped: number;
  warnings: string[];
  message: string;
  syncedAt: string;
}
