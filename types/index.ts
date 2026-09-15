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
  /** Credit accounts: the approved line, or null when none is on file. */
  creditLimit: number | null;
  /** Credit accounts: what's owed right now. 0 once paid off. Null on debit. */
  debt: number | null;
  /** Credit accounts with a line: what's left to spend. Negative when over it. */
  availableCredit: number | null;
  /** Credit accounts with a line: share of the line in use, 0–100+. */
  utilizationPercent: number | null;
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
  /** Which span the figures below cover — week, month, year or all. */
  period: "week" | "month" | "year" | "all";
  totalAvailable: number;
  /** Debit money less what's owed on the credit cards. */
  netWorth: number;
  periodExpenses: number;
  periodIncome: number;
  netBalance: number;
  /** Zero for all-time, which has no previous span to compare against. */
  prevPeriodExpenses: number;
  prevPeriodIncome: number;
  budgetUsed: number;
  budgetTotal: number;
  budgetUsedPercent: number;
  accountBalances: AccountBalance[];
  categoryExpenses: CategorySummary[];
  budgetItems: BudgetItem[];
  lastSyncAt: string | null;
}

/** One category's share of a single chart slice. */
export interface BucketSlice {
  category: string;
  amount: number;
  color: string;
}

/** A single slice of the charted period — one day, or one month. */
export interface BucketBreakdown {
  /** `YYYY-MM-DD` for day slices, `YYYY-MM` for month ones. */
  key: string;
  expenses: number;
  income: number;
  /** The expense categories inside the slice, largest first. */
  slices: BucketSlice[];
}

/** Everything the Analytics tab draws for one period, in one response. */
export interface AnalyticsData {
  period: "week" | "month" | "year" | "all";
  /** The span covered, half-open, so the screen can title itself from the
   *  figures it is actually showing rather than from the selector. */
  from: string;
  to: string;
  /** How wide each bar is — days for a week or month, months beyond that. */
  granularity: "day" | "month";
  buckets: BucketBreakdown[];
  /**
   * The same slices one period earlier, aligned by index, so a chart can lay
   * last month over this one. Empty for all-time, which has no period before
   * it, and shorter than `buckets` when the earlier span had fewer days.
   */
  previousExpenses: number[];
  categories: CategorySummary[];
  expenses: number;
  income: number;
  net: number;
  /** Both zero for all-time, which has no span before it to compare against. */
  prevExpenses: number;
  prevIncome: number;
  /** Gasto rows in the period — the "across N movements" line. */
  expenseCount: number;
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

export interface YearlyNetPoint {
  month: string;
  income: number;
  expenses: number;
  net: number;
  hasData: boolean;
}

export interface YearlyDashboardData {
  year: number;
  months: YearlyNetPoint[];
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

/** Which column of a statement file answers which question. */
export interface StatementColumns {
  date: number;
  description: number;
  amount: number;
  charge: number;
  credit: number;
  balance: number;
}

/** A statement line that already has a movement in the ledger. */
export interface ReconciledRow {
  line: number;
  date: string;
  description: string;
  signedAmount: number;
  ledgerId: string;
  ledgerDate: string;
  ledgerDescription: string;
  /** Signed: negative means the bank posted it before it was logged. */
  dayGap: number;
}

/** A statement line with nothing to match it. These are what an import adds. */
export interface MissingRow {
  line: number;
  date: string;
  description: string;
  /** Negative left the account, positive arrived. */
  signedAmount: number;
  suggestedType: TransactionType;
  suggestedCategory: string | null;
}

/** A logged movement the statement never mentioned. Reported, never touched. */
export interface UnstatedRow {
  id: string;
  date: string;
  description: string;
  signedAmount: number;
  type: TransactionType;
}

/** Everything `POST /api/import/preview` answers with. Nothing is written yet. */
export interface StatementPreview {
  fileName: string;
  sheetName: string | null;
  truncated: boolean;
  headerLine: number;
  /** -1 when no header row could be found and the reader has to map by hand. */
  detectedHeader: number;
  columns: StatementColumns;
  columnCount: number;
  /** The file's first lines as text, so the mapping screen can show them. */
  sample: string[][];
  parsedCount: number;
  skipped: number;
  invertSigns: boolean;
  /** Absent when the file produced no rows at all. */
  period?: { from: string; to: string };
  closingBalance?: number | null;
  account?: { name: string; isCredit: boolean };
  matched?: ReconciledRow[];
  missing?: MissingRow[];
  extra?: UnstatedRow[];
  currentBalance?: number;
  /** Set when the file was read but nothing usable came out of it. */
  error?: string;
}

/** One past reconciliation, as the history list shows it. */
export interface ImportBatchSummary {
  id: string;
  account: string;
  fileName: string;
  rowsCreated: number;
  rowsMatched: number;
  periodFrom: string | null;
  periodTo: string | null;
  createdAt: string;
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
