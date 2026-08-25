import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { ensureDefaults } from "@/services/defaults";
import { ALL_ACCOUNTS, isValidTransactionType } from "@/types";
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
}

/** "2026-08-25T09:33:39" — a local wall clock, no zone. Seconds optional. */
const LOCAL_DATETIME_RE = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/;

/**
 * Rows carry a local wall clock, matching what the iOS shortcut writes. The
 * column is `timestamp without time zone`, so we pin the parsed parts to UTC
 * to store the clock the user actually saw rather than shifting it by the
 * server's zone.
 */
function parseLocalDateTime(value: string): Date | null {
  const m = LOCAL_DATETIME_RE.exec(value);
  if (!m) return null;
  const [, y, mo, d, h, min, s] = m;
  const date = new Date(
    Date.UTC(+y, +mo - 1, +d, +h, +min, s ? +s : 0)
  );
  // Reject overflow like 2026-02-31, which Date.UTC would silently roll over.
  if (date.getUTCMonth() !== +mo - 1 || date.getUTCDate() !== +d) return null;
  return date;
}

/** Same id shape the shortcut generates: `2026-08-25-09-3339 - 5803`. */
function buildId(at: Date): string {
  const p = (n: number, len = 2) => String(n).padStart(len, "0");
  const stamp =
    `${at.getUTCFullYear()}-${p(at.getUTCMonth() + 1)}-${p(at.getUTCDate())}` +
    `-${p(at.getUTCHours())}-${p(at.getUTCMinutes())}${p(at.getUTCSeconds())}`;
  return `${stamp} - ${p(Math.floor(Math.random() * 10000), 4)}`;
}

/** Log a transaction straight into the database the shortcut also writes to. */
export async function POST(req: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Cuerpo de solicitud inválido (JSON)" }, { status: 400 });
    }

    const {
      type, account, toAccount, category, amount, date, description,
    } = body as Record<string, unknown>;

    if (typeof type !== "string" || !isValidTransactionType(type)) {
      return NextResponse.json({ error: "Tipo de movimiento inválido" }, { status: 400 });
    }

    if (typeof account !== "string" || !ALL_ACCOUNTS.includes(account as never)) {
      return NextResponse.json({ error: "Cuenta inválida" }, { status: 400 });
    }

    const parsedAmount = Number(amount);
    if (!isFinite(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: "El monto debe ser mayor a 0" }, { status: 400 });
    }

    const when = typeof date === "string" ? parseLocalDateTime(date) : null;
    if (!when) {
      return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
    }

    let resolvedToAccount: string | null = null;
    let resolvedCategory: string | null = null;

    if (type === "Transferencia") {
      if (typeof toAccount !== "string" || !ALL_ACCOUNTS.includes(toAccount as never)) {
        return NextResponse.json({ error: "Cuenta destino inválida" }, { status: 400 });
      }
      if (toAccount === account) {
        return NextResponse.json(
          { error: "La cuenta destino debe ser distinta a la de origen" },
          { status: 400 }
        );
      }
      resolvedToAccount = toAccount;
    } else {
      if (typeof category !== "string" || category.trim() === "") {
        return NextResponse.json({ error: "La categoría es obligatoria" }, { status: 400 });
      }
      resolvedCategory = category.trim();
    }

    await ensureDefaults();

    const data = {
      date: when,
      amount: Math.round(parsedAmount * 100) / 100, // rule 12
      type,
      category: resolvedCategory,
      account,
      toAccount: resolvedToAccount,
      description:
        typeof description === "string" && description.trim() !== "" ? description.trim() : null,
      procesado: false,
    };

    // The random suffix can theoretically collide within the same second.
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
    console.error("[POST /api/transactions]", err);
    const message = err instanceof Error ? err.message : "Error interno del servidor";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
