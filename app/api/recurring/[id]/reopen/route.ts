import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth";
import { apiMessages } from "@/lib/api-lang";
import { parseDay } from "@/services/recurrence";
import { addDays } from "@/services/credit-cycle";

/**
 * The Undo behind a Confirm or a Skip: the occurrence goes back to pending.
 *
 * A Confirm's undo names the movement it created, and only that one is
 * deleted: a client undoing a tap that turned out to be a duplicate must
 * never take out the movement another phone logged. A Skip's undo names
 * none, and if the occurrence has a movement by now it stays handled.
 *
 * The rule only steps back if nothing was handled after this occurrence —
 * undoing one skip shouldn't reopen the next week's as well.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUser();
    const m = await apiMessages();
    const { id } = await ctx.params;

    const rule = await prisma.recurringRule.findFirst({ where: { id, userId } });
    if (!rule) {
      return NextResponse.json({ error: m.ruleMissing }, { status: 404 });
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const occurrence = parseDay(body?.occurrenceDate);
    if (!occurrence) {
      return NextResponse.json({ error: m.dateInvalid }, { status: 400 });
    }

    const transactionId = typeof body?.transactionId === "string" ? body.transactionId : null;

    await prisma.$transaction(async (tx) => {
      if (transactionId) {
        await tx.transaction.deleteMany({
          where: { id: transactionId, userId, recurringRuleId: id, occurrenceDate: occurrence },
        });
      }
      const stillLogged = await tx.transaction.count({
        where: { recurringRuleId: id, occurrenceDate: occurrence },
      });
      if (stillLogged > 0) return;
      await tx.recurringRule.updateMany({
        where: { id, nextDueDate: addDays(occurrence, 1) },
        data: { nextDueDate: occurrence },
      });
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err, "POST /api/recurring/[id]/reopen");
  }
}
