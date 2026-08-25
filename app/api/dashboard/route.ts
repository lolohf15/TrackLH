import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth";
import { buildDashboardData, getCurrentMonth } from "@/services/finance";
import type { Transaction } from "@/types";

export async function GET(req: NextRequest) {
  try {
    const userId = await requireUser();

    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month") ?? getCurrentMonth();

    const [rows, accountConfigs, budgetConfigs, categories, latest] = await Promise.all([
      prisma.transaction.findMany({ where: { userId }, orderBy: { date: "desc" } }),
      prisma.accountConfig.findMany({ where: { userId } }),
      prisma.budgetConfig.findMany({ where: { userId } }),
      prisma.category.findMany({ where: { userId } }),
      prisma.transaction.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
    ]);

    const transactions: Transaction[] = rows.map((t) => ({
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

    const data = buildDashboardData(
      transactions,
      month,
      accountConfigs,
      budgetConfigs,
      latest?.createdAt.toISOString() ?? null,
      colors
    );

    return NextResponse.json(data);
  } catch (err) {
    return errorResponse(err, "GET /api/dashboard");
  }
}
