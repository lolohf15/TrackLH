import { prisma } from "@/lib/prisma";
import { getAccountSums } from "@/lib/account-sums";
import { mapTransaction } from "@/lib/transaction-map";
import { computeAccountBalancesFromSums } from "@/services/finance";
import type { AccountBalance, CategoryKind, Transaction } from "@/types";
import { mapAccountConfig, mapBudget } from "@/lib/money";
import { getCreditCardStatus, type CreditCardStatus } from "@/lib/credit-sums";
import { listRules } from "@/lib/recurring";
import type { RecurringList } from "@/types";

export interface ExportCategory {
  name: string;
  kind: CategoryKind;
  color: string;
  /** Icon key from lib/category-icons.ts, or null when none is set. */
  icon: string | null;
  /** Monthly budget, or 0 when none is set. Income categories never carry one. */
  budget: number;
}

/** Everything one person's workbook is built from, already tenant-scoped. */
export interface ExportBundle {
  user: { email: string; name: string | null };
  /** Newest first, the same order the app lists them in. */
  transactions: Transaction[];
  balances: AccountBalance[];
  categories: ExportCategory[];
  /** Cards with a cut day: where each statement stands, by account. */
  cycles: Map<string, CreditCardStatus>;
  /** Every recurring rule, paused and ended ones included. */
  recurring: RecurringList;
}

/**
 * Reads the user's entire ledger for the export.
 *
 * Unlike every other read in this app, this one is deliberately unpaginated:
 * a partial export is worse than none, since the whole point is walking away
 * with the full history. Balances still come from the same aggregate query
 * the dashboard uses rather than being re-summed here, so the numbers in the
 * file are the numbers on screen.
 */
export async function collectExportData(userId: string, today: Date): Promise<ExportBundle> {
  const [user, rows, accountConfigs, categories, budgets, sums, recurring] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { email: true, name: true },
    }),
    prisma.transaction.findMany({ where: { userId }, orderBy: { date: "desc" } }),
    prisma.accountConfig
      .findMany({ where: { userId }, orderBy: { account: "asc" } })
      .then((rows) => rows.map(mapAccountConfig)),
    prisma.category.findMany({
      where: { userId },
      orderBy: [{ kind: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.budgetConfig.findMany({ where: { userId } }).then((rows) => rows.map(mapBudget)),
    getAccountSums(userId),
    listRules(userId),
  ]);

  const budgetMap = new Map(budgets.map((b) => [b.category, b.amount]));

  const balances = computeAccountBalancesFromSums(sums, accountConfigs).sort(
    // Debit first, then the cards — how the Wallet tab reads top to bottom.
    (a, b) =>
      Number(a.isCredit) - Number(b.isCredit) || a.account.localeCompare(b.account)
  );

  const cycles = await getCreditCardStatus(
    userId,
    accountConfigs.flatMap((a) =>
      a.isCredit && a.statementDay != null
        ? [{
            account: a.account,
            statementDay: a.statementDay,
            dueDay: a.dueDay,
            initialBalance: a.initialBalance,
            balanceAdjustment: a.balanceAdjustment,
          }]
        : []
    ),
    today
  );

  return {
    user,
    cycles,
    recurring,
    transactions: rows.map(mapTransaction),
    balances,
    categories: categories.map((c) => ({
      name: c.name,
      color: c.color,
      icon: c.icon,
      kind: c.kind as CategoryKind,
      budget: budgetMap.get(c.name) ?? 0,
    })),
  };
}
