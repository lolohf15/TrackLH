import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import type { Transaction } from "@/types";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const month    = searchParams.get("month")    ?? "";
  const category = searchParams.get("category") ?? "";
  const account  = searchParams.get("account")  ?? "";
  const type     = searchParams.get("type")     ?? "";
  const page     = Math.max(1, parseInt(searchParams.get("page")  ?? "1"));
  const limit    = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50")));

  const where: Prisma.TransactionWhereInput = {};
  if (category) where.category = category;
  if (account)  where.account  = account;
  if (type)     where.type     = type;

  if (month) {
    const [year, m] = month.split("-").map(Number);
    where.date = { gte: new Date(year, m - 1, 1), lt: new Date(year, m, 1) };
  }

  const [total, rows] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where,
      orderBy: { date: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  const data: Transaction[] = rows.map((t) => ({
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

  return NextResponse.json({ data, total, page, limit, totalPages: Math.ceil(total / limit) });
}
