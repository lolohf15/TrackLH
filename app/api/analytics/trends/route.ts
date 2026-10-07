import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth";
import { readToday } from "@/lib/request-today";
import { getTrends } from "@/lib/trends";
import { trendWindow } from "@/services/trend-window";
import { isPeriodKind, monthKey, parseAnchor } from "@/services/period";

/**
 * The trend charts under Analytics' breakdown: the months either side of the
 * period on screen. Kept apart from `/api/analytics` so the period's own
 * figures don't wait on balance history.
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await requireUser();

    const { searchParams } = new URL(req.url);
    const kindParam = searchParams.get("period") ?? "month";
    const kind = isPeriodKind(kindParam) ? kindParam : "month";
    const anchor = parseAnchor(searchParams.get("anchor"));

    const today = readToday(req);
    const earliest = await prisma.transaction.findFirst({
      where: { userId },
      orderBy: { date: "asc" },
      select: { date: true },
    });

    // Only months that have happened and that the ledger reaches: a month
    // still ahead has no end to report a balance at, and one before the first
    // movement would chart a history nobody logged.
    const window = trendWindow(kind, anchor);
    const firstMonth = earliest ? monthKey(earliest.date) : monthKey(today);
    const months = window.months.filter((m) => m >= firstMonth && m <= monthKey(today));

    const data = await getTrends(userId, { months, range: window.range });
    return NextResponse.json(data);
  } catch (err) {
    return errorResponse(err, "GET /api/analytics/trends");
  }
}
