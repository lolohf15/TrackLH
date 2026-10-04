import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { requireUser, errorResponse } from "@/lib/auth";
import { apiMessages } from "@/lib/api-lang";
import { validateTransactionInput } from "@/lib/transaction-input";
import { mapTransaction } from "@/lib/transaction-map";
import { buildTransactionId, isUniqueViolation } from "@/lib/transaction-id";
import { isPeriodKind, parseAnchor, resolvePeriod } from "@/services/period";
import { cycleContaining, parseCycleDay } from "@/services/credit-cycle";

function startOfDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

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
    // An account's history includes what came into it: a card's payments
    // arrive as transfers that name it as the destination.
    if (account)  where.OR = [{ account }, { toAccount: account }];
    if (type)     where.type     = type;

    // A named span around an anchor day, the same way Analytics asks, so a
    // link from any period there lands on exactly those movements. All-time
    // takes no bound at all. `month` stays for older links.
    const period = searchParams.get("period") ?? "";
    // A card's own cycle, from the day after one cut to the next. `cut` is
    // the statement day; the anchor is any day inside the cycle.
    const cut = parseCycleDay(searchParams.get("cut"));
    if (period === "cycle" && cut !== null) {
      const cycle = cycleContaining(cut, startOfDay(parseAnchor(searchParams.get("anchor"))));
      where.date = { gte: cycle.start, lt: cycle.end };
    } else if (isPeriodKind(period)) {
      if (period !== "all") {
        const { range } = resolvePeriod(period, parseAnchor(searchParams.get("anchor")));
        where.date = { gte: range.from, lt: range.to };
      }
    } else if (month) {
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

    const data = rows.map(mapTransaction);

    return NextResponse.json({ data, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    return errorResponse(err, "GET /api/transactions");
  }
}

/** Log a transaction into the signed-in user's ledger. */
export async function POST(req: NextRequest) {
  try {
    const userId = await requireUser();
    const m = await apiMessages();

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) {
      return NextResponse.json({ error: m.invalidJson }, { status: 400 });
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
          data: { id: buildTransactionId(when), ...data },
        });
        return NextResponse.json({ success: true, id: created.id }, { status: 201 });
      } catch (err) {
        if (!isUniqueViolation(err) || attempt >= 4) throw err;
      }
    }
  } catch (err) {
    return errorResponse(err, "POST /api/transactions");
  }
}
