import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth";
import { apiMessages } from "@/lib/api-lang";

/** Exactly what deleting would remove, for the confirmation screen. */
export async function GET() {
  try {
    const userId = await requireUser();
    const [accounts, transactions, categories, recurring, budgets] = await Promise.all([
      prisma.accountConfig.count({ where: { userId } }),
      prisma.transaction.count({ where: { userId } }),
      prisma.category.count({ where: { userId } }),
      prisma.recurringRule.count({ where: { userId } }),
      prisma.budgetConfig.count({ where: { userId } }),
    ]);
    return NextResponse.json({ accounts, transactions, categories, recurring, budgets });
  } catch (err) {
    return errorResponse(err, "GET /api/profile/delete");
  }
}

/**
 * Deletes the account and everything in it. The body has to carry the
 * account's own email, typed by hand on the confirmation screen, so no single
 * tap (or stray request) can do it. Every table hangs off User with a
 * cascade; movements are removed first anyway, so the cascade never has to
 * walk the biggest table on its own.
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await requireUser();
    const m = await apiMessages();
    const body = (await req.json().catch(() => null)) as { email?: unknown } | null;
    const typed = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (!user) return NextResponse.json({ error: m.unauthorized }, { status: 401 });
    if (!typed || typed !== user.email.toLowerCase()) {
      return NextResponse.json({ error: m.deleteEmailMismatch }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.transaction.deleteMany({ where: { userId } }),
      prisma.user.delete({ where: { id: userId } }),
    ]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err, "POST /api/profile/delete");
  }
}
