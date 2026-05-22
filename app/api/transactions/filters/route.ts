import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const [categories, accounts] = await Promise.all([
    prisma.transaction.findMany({
      select: { category: true },
      distinct: ["category"],
      where: { category: { not: null } },
      orderBy: { category: "asc" },
    }),
    prisma.transaction.findMany({
      select: { account: true },
      distinct: ["account"],
      orderBy: { account: "asc" },
    }),
  ]);

  return NextResponse.json({
    categories: categories.map((c) => c.category).filter(Boolean),
    accounts: accounts.map((a) => a.account),
  });
}
