import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth";
import type { Catalog, CategoryKind } from "@/types";

/**
 * The accounts and categories this user actually has. The add-record form
 * reads its options from here and `POST /api/transactions` validates against
 * the same rows, so the form can never offer something the server rejects.
 */
export async function GET() {
  try {
    const userId = await requireUser();

    const [accounts, categories] = await Promise.all([
      prisma.accountConfig.findMany({
        where: { userId },
        orderBy: [{ isCredit: "asc" }, { account: "asc" }],
        select: { account: true, isCredit: true, color: true },
      }),
      prisma.category.findMany({
        where: { userId },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
    ]);

    const shape = (kind: CategoryKind) =>
      categories
        .filter((c) => c.kind === kind)
        .map((c) => ({
          id: c.id,
          name: c.name,
          color: c.color,
          kind: c.kind as CategoryKind,
          sortOrder: c.sortOrder,
        }));

    const catalog: Catalog = {
      accounts,
      expenseCategories: shape("expense"),
      incomeCategories: shape("income"),
    };

    return NextResponse.json(catalog);
  } catch (err) {
    return errorResponse(err, "GET /api/catalog");
  }
}
