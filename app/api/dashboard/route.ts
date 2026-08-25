import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildDashboardData, getCurrentMonth } from "@/services/finance";
import type { Transaction } from "@/types";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month") || getCurrentMonth();

  const [transactions, accountConfigs, budgetConfigs, latest] = await Promise.all([
    prisma.transaction.findMany({ orderBy: { date: "desc" } }),
    prisma.accountConfig.findMany(),
    prisma.budgetConfig.findMany(),
    prisma.transaction.findFirst({
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
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

  const data = buildDashboardData(
    txs,
    month,
    accountConfigs,
    budgetConfigs,
    latest?.createdAt.toISOString() ?? null
  );

  return NextResponse.json(data);
}
