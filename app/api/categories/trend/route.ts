import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth";
import {
  computeCategoryTrends,
  getCurrentMonth,
  getPrevMonth,
} from "@/services/finance";
import { mapTransaction } from "@/lib/transaction-map";

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

    // Only the window being charted matters here — no reason to pull years
    // of older history just to compute a 6-month trend.
    const [fy, fm] = months[0].split("-").map(Number);
    const rangeStart = new Date(Date.UTC(fy, fm - 1, 1));

    const [rows, budgetConfigs, categories] = await Promise.all([
      prisma.transaction.findMany({
        where: { userId, date: { gte: rangeStart } },
        orderBy: { date: "desc" },
      }),
      prisma.budgetConfig.findMany({ where: { userId } }),
      prisma.category.findMany({ where: { userId } }),
    ]);

    const txs = rows.map(mapTransaction);
    const colors = new Map(categories.map((c) => [c.name, c.color]));
    const trends = computeCategoryTrends(txs, months, budgetConfigs, colors);

    return NextResponse.json({ months, trends });
  } catch (err) {
    return errorResponse(err, "GET /api/categories/trend");
  }
}
