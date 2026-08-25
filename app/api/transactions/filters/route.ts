import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth";

/**
 * Distinct values for the filter bar. Both queries are tenant-scoped: without
 * that, one person's account and category names would show up in everyone's
 * filter list.
 */
export async function GET() {
  try {
    const userId = await requireUser();

    const [categories, accounts] = await Promise.all([
      prisma.transaction.findMany({
        select: { category: true },
        distinct: ["category"],
        where: { userId, category: { not: null } },
        orderBy: { category: "asc" },
      }),
      prisma.transaction.findMany({
        select: { account: true },
        distinct: ["account"],
        where: { userId },
        orderBy: { account: "asc" },
      }),
    ]);

    return NextResponse.json({
      categories: categories.map((c) => c.category).filter((c): c is string => !!c),
      accounts: accounts.map((a) => a.account),
    });
  } catch (err) {
    return errorResponse(err, "GET /api/transactions/filters");
  }
}
