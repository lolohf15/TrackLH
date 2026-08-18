import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeCategoryTrends, getCurrentMonth, getPrevMonth } from "@/services/finance";
import { DEFAULT_BUDGETS } from "@/types";
import type { Transaction } from "@/types";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const count = Math.min(12, Math.max(2, parseInt(searchParams.get("months") ?? "6")));

  const months: string[] = [];
  let cursor = getCurrentMonth();
  for (let i = 0; i < count; i++) {
    months.unshift(cursor);
    cursor = getPrevMonth(cursor);
  }

  const [transactions, budgetConfigs] = await Promise.all([
    prisma.transaction.findMany({ orderBy: { date: "desc" } }),
    prisma.budgetConfig.findMany(),
  ]);

  const txs: Transaction[] = transactions.map((t) => ({
    id: t.id,
    date: t.date.toISOString(),
    amount: t.amount,
    type: t.type as Transaction["type"],
    category: t.category,
    account: t.account,
    toAccount: t.toAccount,
    description: t.description,
    notes: t.notes,
    procesado: t.procesado,
    syncedAt: t.syncedAt.toISOString(),
  }));

  const effectiveBudgets = budgetConfigs.length > 0 ? budgetConfigs : DEFAULT_BUDGETS;
  const trends = computeCategoryTrends(txs, months, effectiveBudgets);

  return NextResponse.json({ months, trends });
}
