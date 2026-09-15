import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth";
import {
  computeBucketBreakdowns,
  computeCategoryExpenses,
  computeExpenses,
  computeIncome,
  filterByRange,
  round2,
} from "@/services/finance";
import { bucketsFor, isPeriodKind, parseAnchor, resolvePeriod } from "@/services/period";
import { mapTransaction } from "@/lib/transaction-map";
import type { AnalyticsData } from "@/types";

/**
 * Everything the Analytics tab draws, for one period, in one response. It
 * overlaps `/api/dashboard` on the category breakdown, but Home has no use
 * for a bar per day and shouldn't carry one in its payload.
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await requireUser();

    const { searchParams } = new URL(req.url);
    const kindParam = searchParams.get("period") ?? "month";
    const kind = isPeriodKind(kindParam) ? kindParam : "month";
    const anchor = parseAnchor(searchParams.get("anchor"));
    const period = resolvePeriod(kind, anchor);

    // All-time starts at the user's first movement, not at 1970 — without
    // this the chart would try to draw a bar for every month since.
    const earliest =
      kind === "all"
        ? await prisma.transaction.findFirst({
            where: { userId },
            orderBy: { date: "asc" },
            select: { date: true },
          })
        : null;

    const buckets = bucketsFor(period, earliest?.date);

    // One window covering the bars and the span before them, which only the
    // trend arrows need.
    const from = new Date(
      Math.min(
        buckets[0]?.range.from.getTime() ?? period.range.from.getTime(),
        period.previous?.from.getTime() ?? Infinity
      )
    );

    const [rows, categoryRows] = await Promise.all([
      prisma.transaction.findMany({
        where: { userId, date: { gte: from, lt: period.range.to } },
        orderBy: { date: "desc" },
      }),
      prisma.category.findMany({ where: { userId } }),
    ]);

    const transactions = rows.map(mapTransaction);
    const colors = new Map(categoryRows.map((c) => [c.name, c.color]));

    const expenses = computeExpenses(transactions, period.range);
    const income = computeIncome(transactions, period.range);

    const data: AnalyticsData = {
      period: kind,
      from: period.range.from.toISOString(),
      to: period.range.to.toISOString(),
      granularity: period.bucket,
      buckets: computeBucketBreakdowns(transactions, buckets, period.bucket, colors),
      categories: computeCategoryExpenses(transactions, period.range, colors),
      expenses,
      income,
      net: round2(income - expenses),
      prevExpenses: period.previous ? computeExpenses(transactions, period.previous) : 0,
      prevIncome: period.previous ? computeIncome(transactions, period.previous) : 0,
      expenseCount: filterByRange(transactions, period.range).filter((t) => t.type === "Gasto").length,
    };

    return NextResponse.json(data);
  } catch (err) {
    return errorResponse(err, "GET /api/analytics");
  }
}
