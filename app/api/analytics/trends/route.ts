import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth";
import { readToday } from "@/lib/request-today";
import { getTrends } from "@/lib/trends";
import { trendWindow } from "@/services/trend-window";
import { addDays } from "@/services/credit-cycle";
import { isPeriodKind, monthKey, parseAnchor, resolvePeriod } from "@/services/period";

/**
 * The trend charts under Analytics' breakdown: months either side of the
 * period on screen, and its spending by weekday. Kept apart from
 * `/api/analytics` so the period's own figures don't wait on balance history.
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await requireUser();

    const { searchParams } = new URL(req.url);
    const kindParam = searchParams.get("period") ?? "month";
    const kind = isPeriodKind(kindParam) ? kindParam : "month";
    const anchor = parseAnchor(searchParams.get("anchor"));
    const period = resolvePeriod(kind, anchor);

    // The weekday averages divide by how many of each day have actually
    // happened: not the rest of a week still ahead, and for all-time not
    // every Monday since 1970 but since the first movement.
    const today = readToday(req);
    const tomorrow = addDays(today, 1);
    const earliest = await prisma.transaction.findFirst({
      where: { userId },
      orderBy: { date: "asc" },
      select: { date: true },
    });
    const from =
      kind === "all" && earliest
        ? new Date(Date.UTC(earliest.date.getUTCFullYear(), earliest.date.getUTCMonth(), earliest.date.getUTCDate()))
        : period.range.from;
    const to = period.range.to.getTime() > tomorrow.getTime() ? tomorrow : period.range.to;

    // Only months that have happened and that the ledger reaches: a month
    // still ahead has no end to report a balance at, and one before the first
    // movement would chart a history nobody logged.
    const window = trendWindow(kind, anchor);
    const firstMonth = earliest ? monthKey(earliest.date) : monthKey(today);
    const months = window.months.filter((m) => m >= firstMonth && m <= monthKey(today));

    const data = await getTrends(
      userId,
      { months, range: window.range },
      { from, to: to.getTime() > from.getTime() ? to : from }
    );
    return NextResponse.json(data);
  } catch (err) {
    return errorResponse(err, "GET /api/analytics/trends");
  }
}
