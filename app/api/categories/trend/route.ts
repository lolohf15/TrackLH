import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth";
import { computeCategoryTrends } from "@/services/finance";
import { monthKey, type Bucket } from "@/services/period";
import { mapTransaction } from "@/lib/transaction-map";

export async function GET(req: NextRequest) {
  try {
    const userId = await requireUser();

    const { searchParams } = new URL(req.url);
    const count = Math.min(
      12,
      Math.max(2, parseInt(searchParams.get("months") ?? "6")),
    );

    // The last `count` calendar months, oldest first, ending with this one.
    const now = new Date();
    const buckets: Bucket[] = Array.from({ length: count }, (_, i) => {
      const offset = i - (count - 1);
      const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1));
      const to = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, 1));
      return { key: monthKey(from), range: { from, to } };
    });

    // Only the window being charted matters here — no reason to pull years
    // of older history just to compute a 6-month trend.
    const [rows, budgetConfigs, categories] = await Promise.all([
      prisma.transaction.findMany({
        where: { userId, date: { gte: buckets[0].range.from } },
        orderBy: { date: "desc" },
      }),
      prisma.budgetConfig.findMany({ where: { userId } }),
      prisma.category.findMany({ where: { userId } }),
    ]);

    const txs = rows.map(mapTransaction);
    const colors = new Map(categories.map((c) => [c.name, c.color]));
    const trends = computeCategoryTrends(txs, buckets, budgetConfigs, colors);

    return NextResponse.json({ months: buckets.map((b) => b.key), trends });
  } catch (err) {
    return errorResponse(err, "GET /api/categories/trend");
  }
}
