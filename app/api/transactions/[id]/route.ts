import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth";
import { apiMessages } from "@/lib/api-lang";
import { validateTransactionInput } from "@/lib/transaction-input";

/**
 * Edit a movement. The id is never rewritten: it is what the iOS shortcut and
 * any past export refer to, so a correction keeps the same row.
 */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUser();
    const m = await apiMessages();
    const { id } = await ctx.params;

    // Scoped by user, so an id guessed from another ledger simply isn't found.
    const existing = await prisma.transaction.findFirst({ where: { id, userId } });
    if (!existing) {
      return NextResponse.json({ error: m.movementMissing }, { status: 404 });
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) {
      return NextResponse.json({ error: m.invalidJson }, { status: 400 });
    }

    const check = await validateTransactionInput(userId, body);
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: check.status });
    }

    await prisma.transaction.update({ where: { id }, data: check.data });

    return NextResponse.json({ success: true, id });
  } catch (err) {
    return errorResponse(err, "PATCH /api/transactions/[id]");
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUser();
    const m = await apiMessages();
    const { id } = await ctx.params;

    const existing = await prisma.transaction.findFirst({ where: { id, userId } });
    if (!existing) {
      return NextResponse.json({ error: m.movementMissing }, { status: 404 });
    }

    await prisma.transaction.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err, "DELETE /api/transactions/[id]");
  }
}
