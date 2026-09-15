import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth";
import { buildDashboardData, computeAccountBalancesFromSums } from "@/services/finance";
import { isPeriodKind, parseAnchor, resolvePeriod } from "@/services/period";
import { getAccountSums } from "@/lib/account-sums";
import { mapTransaction } from "@/lib/transaction-map";

export async function GET(req: NextRequest) {
  try {
    const userId = await requireUser();

    const { searchParams } = new URL(req.url);
    const kindParam = searchParams.get("period") ?? "month";
    const kind = isPeriodKind(kindParam) ? kindParam : "month";
    const anchor = parseAnchor(searchParams.get("anchor"));

    const period = resolvePeriod(kind, anchor);
    // Budgets stay monthly whatever is on screen, so the month holding the
    // anchor is fetched alongside the period even when it sits outside it.
    const budgetPeriod = resolvePeriod("month", anchor);

    // One window covering everything the figures need: the period, the span
    // before it for the trend arrows, and the budget month.
    const from = new Date(
      Math.min(
        period.range.from.getTime(),
        period.previous?.from.getTime() ?? Infinity,
        budgetPeriod.range.from.getTime()
      )
    );
    const to = new Date(
      Math.max(period.range.to.getTime(), budgetPeriod.range.to.getTime())
    );

    const [rows, accountSums, accountConfigs, budgetConfigs, categories, latest] = await Promise.all([
      prisma.transaction.findMany({
        where: { userId, date: { gte: from, lt: to } },
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
      period,
      accountBalances,
      budgetConfigs,
      budgetPeriod.range,
      latest?.createdAt.toISOString() ?? null,
      colors
    );

    return NextResponse.json(data);
  } catch (err) {
    return errorResponse(err, "GET /api/dashboard");
  }
}
