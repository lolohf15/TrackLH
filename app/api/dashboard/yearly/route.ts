import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth";
import { computeYearlyNet } from "@/services/finance";
import { mapTransaction } from "@/lib/transaction-map";
import type { YearlyDashboardData } from "@/types";

export async function GET(req: NextRequest) {
  try {
    const userId = await requireUser();

    const { searchParams } = new URL(req.url);
    const year = Number(searchParams.get("year")) || new Date().getFullYear();

    const rows = await prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) },
      },
      orderBy: { date: "desc" },
    });

    const transactions = rows.map(mapTransaction);

    const data: YearlyDashboardData = { year, months: computeYearlyNet(transactions, year) };

    return NextResponse.json(data);
  } catch (err) {
    return errorResponse(err, "GET /api/dashboard/yearly");
  }
}
