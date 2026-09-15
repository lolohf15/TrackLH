import { prisma } from "@/lib/prisma";
import { round2, type AccountSums } from "@/services/finance";

/**
 * Per-account income/expense/transfer totals across the user's entire
 * history — summed in SQL instead of pulling every transaction row into
 * memory, since an account's balance depends on all of it, not just the
 * current month. This is the only way `/api/dashboard` and `/api/accounts`
 * stay cheap as the ledger grows past a few months of history.
 */
export async function getAccountSums(userId: string): Promise<Map<string, AccountSums>> {
  const [byAccount, transfersIn] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["account", "type"],
      where: { userId },
      _sum: { amount: true },
    }),
    prisma.transaction.groupBy({
      by: ["toAccount"],
      where: { userId, type: "Transferencia", toAccount: { not: null } },
      _sum: { amount: true },
    }),
  ]);

  const sums = new Map<string, AccountSums>();
  function ensure(account: string): AccountSums {
    let s = sums.get(account);
    if (!s) {
      s = { income: 0, expenses: 0, transfersIn: 0, transfersOut: 0 };
      sums.set(account, s);
    }
    return s;
  }

  for (const row of byAccount) {
    const amount = round2(row._sum.amount ?? 0);
    const s = ensure(row.account);
    if (row.type === "Ingreso") s.income = amount;
    else if (row.type === "Gasto") s.expenses = amount;
    else if (row.type === "Transferencia") s.transfersOut = amount;
  }

  for (const row of transfersIn) {
    if (!row.toAccount) continue;
    ensure(row.toAccount).transfersIn = round2(row._sum.amount ?? 0);
  }

  return sums;
}
