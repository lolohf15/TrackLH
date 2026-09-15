import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth";
import { buildDashboardData, getCurrentMonth, getPrevMonth, computeAccountBalancesFromSums } from "@/services/finance";
import { getAccountSums } from "@/lib/account-sums";
import { mapTransaction } from "@/lib/transaction-map";

export async function GET(req: NextRequest) {
  try {
    const userId = await requireUser();

    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month") ?? getCurrentMonth();

    // The dashboard only ever needs this month and the one before it (for
    // trend arrows) — account balances cover all-time separately, via SQL
    // sums, so this query no longer has to carry the whole ledger.
    const [cy, cm] = month.split("-").map(Number);
    const [py, pm] = getPrevMonth(month).split("-").map(Number);
    const rangeStart = new Date(Date.UTC(py, pm - 1, 1));
    const rangeEnd = new Date(Date.UTC(cy, cm, 1));

    const [rows, accountSums, accountConfigs, budgetConfigs, categories, latest] = await Promise.all([
      prisma.transaction.findMany({
        where: { userId, date: { gte: rangeStart, lt: rangeEnd } },
        orderBy: { date: "desc" },
      }),
      getAccountSums(userId),
      prisma.accountConfig.findMany({ where: { userId } }),
      prisma.budgetConfig.findMany({ where: { userId } }),
      prisma.category.findMany({ where: { userId } }),
      prisma.transaction.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
    ]);

    const transactions = rows.map(mapTransaction);
    const colors = new Map(categories.map((c) => [c.name, c.color]));
    const accountBalances = computeAccountBalancesFromSums(accountSums, accountConfigs);

    const data = buildDashboardData(
      transactions,
      month,
      accountBalances,
      budgetConfigs,
      latest?.createdAt.toISOString() ?? null,
      colors
    );

    return NextResponse.json(data);
  } catch (err) {
    return errorResponse(err, "GET /api/dashboard");
  }
}
