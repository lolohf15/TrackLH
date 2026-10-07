import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth";
import { apiMessages } from "@/lib/api-lang";

const MAX_BUDGET = 1e9;

/**
 * Sets several monthly budgets at once, for the budget step of "Primeros
 * pasos". Each entry names one of the person's own expense categories; zero
 * clears that budget. Anything naming a category they don't have is refused
 * whole, so a stale screen can't leave half its budgets written.
 */
export async function PUT(req: NextRequest) {
  try {
    const userId = await requireUser();
    const m = await apiMessages();

    const body = (await req.json().catch(() => null)) as { items?: unknown } | null;
    const items = Array.isArray(body?.items) ? body.items : null;
    if (!items || items.length === 0 || items.length > 200) {
      return NextResponse.json({ error: m.invalidJson }, { status: 400 });
    }

    const clean: { category: string; amount: number }[] = [];
    for (const raw of items as Record<string, unknown>[]) {
      const category = typeof raw?.category === "string" ? raw.category : "";
      const amount = typeof raw?.amount === "number" ? raw.amount : NaN;
      if (!category || !Number.isFinite(amount) || amount < 0 || amount > MAX_BUDGET) {
        return NextResponse.json({ error: m.invalidJson }, { status: 400 });
      }
      clean.push({ category, amount: Math.round(amount * 100) / 100 });
    }

    const owned = await prisma.category.findMany({
      where: { userId, kind: "expense", name: { in: clean.map((c) => c.category) } },
      select: { name: true },
    });
    const names = new Set(owned.map((c) => c.name));
    const unknown = clean.find((c) => !names.has(c.category));
    if (unknown) {
      return NextResponse.json({ error: m.categoryMissing }, { status: 404 });
    }

    await prisma.$transaction(
      clean.map((c) =>
        c.amount > 0
          ? prisma.budgetConfig.upsert({
              where: { userId_category: { userId, category: c.category } },
              create: { userId, category: c.category, amount: c.amount },
              update: { amount: c.amount },
            })
          : prisma.budgetConfig.deleteMany({ where: { userId, category: c.category } })
      )
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err, "PUT /api/budgets");
  }
}
