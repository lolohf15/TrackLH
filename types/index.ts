import type { PeriodKind } from "@/services/period";
import type { CreditCycleInfo } from "@/services/credit-cycle";
import type { Frequency } from "@/services/recurrence";

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
  /** A key from lib/category-icons.ts, or null to show the first letter. */
  icon: string | null;
  kind: CategoryKind;
  sortOrder: number;
}

export interface AccountOption {
  account: string;
  isCredit: boolean;
  color: string | null;
  /** What it holds right now (negative on a card means money owed). */
  balance: number;
  /** Cards with a line on file: what's left to spend. Null otherwise. */
  availableCredit: number | null;
}

/** What the add-record form needs: this user's accounts and categories. */
export interface Catalog {
  accounts: AccountOption[];
  /** Ordered most-used first over the last 90 days, then by sortOrder. */
  expenseCategories: Category[];
  incomeCategories: Category[];
  /** The account the user last logged each type from, so the sheet can lead with it. */
  lastAccount: Partial<Record<TransactionType, string>>;
  /** The destination of the user's last transfer. */
  lastToAccount: string | null;
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
  /** Set when the movement was confirmed from a recurring rule. */
  recurringRuleId: string | null;
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
  /** Today falls inside the period, so the previous figures are cut to the
   *  same point of the span before. Set by the route, not the builder. */
  inProgress?: boolean;
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
  /** Today falls inside the period: `prevExpenses` and `prevIncome` cover the
   *  span before only up to the same point. */
  inProgress: boolean;
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

/** Where a card's last statement stands, as `/api/accounts` reports it. */
export interface CreditCycleStatus extends CreditCycleInfo {
  /** Where the last payment to this card came from, to prefill the next one. */
  lastPaymentFrom: string | null;
}

/** One row of `GET /api/accounts`. */
export interface AccountConfigView {
  id: number;
  account: string;
  isCredit: boolean;
  creditLimit: number | null;
  statementDay: number | null;
  dueDay: number | null;
  /** "cash" or "other" when it isn't a card; null for a debit or credit card. */
  kind: "cash" | "other" | null;
  /** Left out of the Wallet's deck and pocket; still in every total. */
  hiddenInWallet: boolean;
  color: string | null;
  currentBalance: number;
  /** Cards with a cut day; null for everything else. */
  cycle: CreditCycleStatus | null;
}

export interface TransactionFilters {
  /** Which span the list covers; "all" drops the date bound entirely, and
   *  "cycle" is a credit card's own cycle around the anchor, cut on `cut`. */
  period: PeriodKind | "cycle";
  /** Statement day, only read when `period` is "cycle". */
  cut?: number;
  /** `YYYY-MM-DD` of any day inside that span. */
  anchor: string;
  category: string;
  account: string;
  type: string;
  /** Free text over description, category and account; searches all time. */
  q?: string;
  page: number;
  limit: number;
}

export interface PaginatedTransactions {
  data: Transaction[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  /**
   * Each day on this page, summed over every movement of that day the filters
   * match, not only the ones on the page, so a day split across two pages
   * still heads with its whole total. Keyed `YYYY-MM-DD`.
   */
  dayTotals?: Record<string, { income: number; expenses: number }>;
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

/** One row of `GET /api/recurring`. Days are `YYYY-MM-DD`. */
export interface RecurringRuleView {
  id: string;
  type: TransactionType;
  amount: number;
  account: string;
  toAccount: string | null;
  category: string | null;
  description: string | null;
  frequency: Frequency;
  interval: number;
  /** The first occurrence. */
  startDate: string;
  endDate: string | null;
  /** False while paused. */
  active: boolean;
  /** The next occurrence still to confirm or skip. Null once the rule has
   *  run past its end date. */
  nextDate: string | null;
  /** What it comes to in an average month. */
  monthlyAmount: number;
}

export interface RecurringList {
  rules: RecurringRuleView[];
  /** Monthly equivalents of the active rules: the "fixed" part of a month. */
  fixedExpenses: number;
  fixedIncome: number;
}

/** A rule with occurrences waiting, as `GET /api/recurring/pending` lists it. */
export interface PendingOccurrence {
  rule: RecurringRuleView;
  /** The oldest one waiting, which is the one Confirm and Skip act on. */
  occurrenceDate: string;
  /** How many are waiting in all, this one included. */
  count: number;
}

/** One month of `GET /api/analytics/trends`. */
export interface TrendMonth {
  /** `YYYY-MM`. */
  key: string;
  income: number;
  expenses: number;
  /** The part of `expenses` confirmed from a recurring rule. */
  fixed: number;
  /** Debit money at the end of the month. */
  available: number;
  /** `available` less what was owed on the cards at the end of the month. */
  netWorth: number;
}

export interface CardTrend {
  account: string;
  color: string;
  limit: number;
  points: Array<{ key: string; debt: number; utilization: number }>;
}

/** What the trend charts on Analytics draw. */
export interface TrendsData {
  months: TrendMonth[];
  /** Cards with a limit on file, each month's end against it. */
  cards: CardTrend[];
  /** What the active recurring expenses come to a month, from the rules. */
  fixedCommitment: number;
}
