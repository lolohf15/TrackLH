import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth";
import { apiMessages } from "@/lib/api-lang";
import { parseDay } from "@/services/recurrence";

/**
 * The Undo behind a Confirm or a Skip: the occurrence goes back to pending,
 * and the movement a Confirm logged for it is deleted.
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

    await prisma.$transaction([
      prisma.transaction.deleteMany({
        where: { userId, recurringRuleId: id, occurrenceDate: occurrence },
      }),
      prisma.recurringRule.updateMany({
        where: { id, nextDueDate: { gt: occurrence } },
        data: { nextDueDate: occurrence },
      }),
    ]);
    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err, "POST /api/recurring/[id]/reopen");
  }
}
