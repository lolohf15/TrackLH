import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth";
import { computeYearlyNet } from "@/services/finance";
import type { Transaction, YearlyDashboardData } from "@/types";

export async function GET(req: NextRequest) {
  try {
    const userId = await requireUser();

    const { searchParams } = new URL(req.url);
    const year = Number(searchParams.get("year")) || new Date().getFullYear();

    const rows = await prisma.transaction.findMany({ where: { userId }, orderBy: { date: "desc" } });

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

    const data: YearlyDashboardData = { year, months: computeYearlyNet(transactions, year) };

    return NextResponse.json(data);
  } catch (err) {
    return errorResponse(err, "GET /api/dashboard/yearly");
  }
}
