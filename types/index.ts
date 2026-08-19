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

// White at descending opacity — used for category and account charts so
// they read as black/white/green/red instead of introducing gray hues.
// Green/red stay reserved for income/expense, amber for budgets.
export const CHART_PALETTE = [
  "rgba(255,255,255,0.95)",
  "rgba(255,255,255,0.82)",
  "rgba(255,255,255,0.70)",
  "rgba(255,255,255,0.58)",
  "rgba(255,255,255,0.48)",
  "rgba(255,255,255,0.40)",
  "rgba(255,255,255,0.33)",
  "rgba(255,255,255,0.27)",
  "rgba(255,255,255,0.22)",
  "rgba(255,255,255,0.18)",
] as const;

export const ACCOUNT_COLORS: Record<string, string> = {
  "Nu Crédito": CHART_PALETTE[0],
  "Nu Débito": CHART_PALETTE[1],
  Revolut:       CHART_PALETTE[2],
  "Revolut Débito": CHART_PALETTE[3],
  "BBVA Débito": CHART_PALETTE[4],
  Efectivo:      CHART_PALETTE[5],
  Inversiones:   CHART_PALETTE[6],
};

export const TRANSACTION_TYPE_COLORS: Record<string, string> = {
  Gasto: "#DC2626",
  Ingreso: "#4ADE80",
  Transferencia: "#D97706",
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
