import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { requireUser, errorResponse } from "@/lib/auth";
import { validateTransactionInput } from "@/lib/transaction-input";
import type { Transaction } from "@/types";

export async function GET(req: NextRequest) {
  try {
    const userId = await requireUser();

    const { searchParams } = new URL(req.url);
    const month    = searchParams.get("month")    ?? "";
    const category = searchParams.get("category") ?? "";
    const account  = searchParams.get("account")  ?? "";
    const type     = searchParams.get("type")     ?? "";
    const page     = Math.max(1, parseInt(searchParams.get("page")  ?? "1"));
    const limit    = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50")));

    // Seeded with the tenant so the count and the page always share a scope.
    const where: Prisma.TransactionWhereInput = { userId };
    if (category) where.category = category;
    if (account)  where.account  = account;
    if (type)     where.type     = type;

    if (month) {
      const [year, m] = month.split("-").map(Number);
      where.date = { gte: new Date(Date.UTC(year, m - 1, 1)), lt: new Date(Date.UTC(year, m, 1)) };
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
  } catch (err) {
    return errorResponse(err, "GET /api/transactions");
  }
}

/** Same id shape the shortcut generates: `2026-08-25-09-3339 - 5803`. */
function buildId(at: Date): string {
  const p = (n: number, len = 2) => String(n).padStart(len, "0");
  const stamp =
    `${at.getUTCFullYear()}-${p(at.getUTCMonth() + 1)}-${p(at.getUTCDate())}` +
    `-${p(at.getUTCHours())}-${p(at.getUTCMinutes())}${p(at.getUTCSeconds())}`;
  return `${stamp} - ${p(Math.floor(Math.random() * 10000), 4)}`;
}

/** Log a transaction into the signed-in user's ledger. */
export async function POST(req: NextRequest) {
  try {
    const userId = await requireUser();

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) {
      return NextResponse.json({ error: "Cuerpo de solicitud inválido (JSON)" }, { status: 400 });
    }

    const check = await validateTransactionInput(userId, body);
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: check.status });
    }
    const when = check.data.date;

    const data = { userId, ...check.data, procesado: false };

    // The random suffix can collide within the same second, and the id space
    // is shared across users.
    for (let attempt = 0; ; attempt++) {
      try {
        const created = await prisma.transaction.create({
          data: { id: buildId(when), ...data },
        });
        return NextResponse.json({ success: true, id: created.id }, { status: 201 });
      } catch (err) {
        const isCollision =
          err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
        if (!isCollision || attempt >= 4) throw err;
      }
    }
  } catch (err) {
    return errorResponse(err, "POST /api/transactions");
  }
}
