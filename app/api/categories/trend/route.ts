import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth";
import {
  computeCategoryTrends,
  getCurrentMonth,
  getPrevMonth,
} from "@/services/finance";
import type { Transaction } from "@/types";

export async function GET(req: NextRequest) {
  try {
    const userId = await requireUser();

    const { searchParams } = new URL(req.url);
    const count = Math.min(
      12,
      Math.max(2, parseInt(searchParams.get("months") ?? "6")),
    );

    const months: string[] = [];
    let cursor = getCurrentMonth();
    for (let i = 0; i < count; i++) {
      months.unshift(cursor);
      cursor = getPrevMonth(cursor);
    }

    const [transactions, budgetConfigs, categories] = await Promise.all([
      prisma.transaction.findMany({
        where: { userId },
        orderBy: { date: "desc" },
      }),
      prisma.budgetConfig.findMany({ where: { userId } }),
      prisma.category.findMany({ where: { userId } }),
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

    const colors = new Map(categories.map((c) => [c.name, c.color]));
    const trends = computeCategoryTrends(txs, months, budgetConfigs, colors);

    return NextResponse.json({ months, trends });
  } catch (err) {
    return errorResponse(err, "GET /api/categories/trend");
  }
}
