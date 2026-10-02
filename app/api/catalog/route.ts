import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth";
import { getAccountSums } from "@/lib/account-sums";
import { mapAccountConfig } from "@/lib/money";
import { computeAccountBalancesFromSums } from "@/services/finance";
import {
  VALID_TRANSACTION_TYPES,
  type Catalog,
  type CategoryKind,
  type TransactionType,
} from "@/types";

/** How far back "most used" looks when ordering the category picker. */
const USAGE_WINDOW_DAYS = 90;

/**
 * Everything the record sheet needs to open ready to use: the accounts with
 * what each holds, the categories ordered by how often this user actually
 * picks them, and the account they reached for last. `POST /api/transactions`
 * validates against the same rows, so the form never offers something the
 * server would reject.
 */
export async function GET() {
  try {
    const userId = await requireUser();

    // Rows are wall clocks pinned to UTC; a day either side of the window
    // edge only nudges an ordering, so plain UTC arithmetic is enough here.
    const since = new Date(Date.now() - USAGE_WINDOW_DAYS * 86_400_000);

    const [configs, sums, categories, usage, ...lastByType] = await Promise.all([
      prisma.accountConfig.findMany({
        where: { userId },
        orderBy: [{ isCredit: "asc" }, { account: "asc" }],
      }),
      getAccountSums(userId),
      prisma.category.findMany({
        where: { userId },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
      prisma.transaction.groupBy({
        by: ["type", "category"],
        where: { userId, date: { gte: since }, category: { not: null } },
        _count: { _all: true },
      }),
      // createdAt, not date: a movement backdated to last week was still the
      // last one *logged*, which is what "the account you just used" means.
      ...VALID_TRANSACTION_TYPES.map((type) =>
        prisma.transaction.findFirst({
          where: { userId, type },
          orderBy: { createdAt: "desc" },
          select: { account: true, toAccount: true },
        })
      ),
    ]);

    const rows = configs.map(mapAccountConfig);
    const balances = new Map(
      computeAccountBalancesFromSums(sums, rows).map((b) => [b.account, b])
    );

    const uses = new Map<string, number>();
    for (const row of usage) {
      const kind: CategoryKind = row.type === "Ingreso" ? "income" : "expense";
      uses.set(`${kind}:${row.category}`, row._count._all);
    }

    const shape = (kind: CategoryKind) =>
      categories
        .filter((c) => c.kind === kind)
        .map((c, index) => ({
          category: {
            id: c.id,
            name: c.name,
            color: c.color,
            icon: c.icon,
            kind: c.kind as CategoryKind,
            sortOrder: c.sortOrder,
          },
          uses: uses.get(`${kind}:${c.name}`) ?? 0,
          index,
        }))
        // Stable within ties, so categories nobody has used yet keep the
        // order the user gave them.
        .sort((a, b) => b.uses - a.uses || a.index - b.index)
        .map((entry) => entry.category);

    const lastAccount: Catalog["lastAccount"] = {};
    VALID_TRANSACTION_TYPES.forEach((type: TransactionType, i) => {
      const account = lastByType[i]?.account;
      if (account) lastAccount[type] = account;
    });
    const transferIndex = VALID_TRANSACTION_TYPES.indexOf("Transferencia");

    const catalog: Catalog = {
      accounts: rows.map((a) => {
        const b = balances.get(a.account);
        return {
          account: a.account,
          isCredit: a.isCredit,
          color: a.color,
          balance: b?.currentBalance ?? a.initialBalance,
          availableCredit: b?.availableCredit ?? null,
        };
      }),
      expenseCategories: shape("expense"),
      incomeCategories: shape("income"),
      lastAccount,
      lastToAccount: lastByType[transferIndex]?.toAccount ?? null,
    };

    return NextResponse.json(catalog);
  } catch (err) {
    return errorResponse(err, "GET /api/catalog");
  }
}
