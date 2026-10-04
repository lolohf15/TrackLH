import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth";
import { apiMessages } from "@/lib/api-lang";
import { readToday } from "@/lib/request-today";
import { oldestPending } from "@/lib/recurring";
import { addDays } from "@/services/credit-cycle";
import { parseDay } from "@/services/recurrence";

/** Pass on one occurrence: the rule moves on, nothing is logged. */
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

    const due = rule.active ? await oldestPending(rule, readToday(req)) : null;
    if (!due || due.getTime() !== occurrence.getTime()) {
      // Already skipped or confirmed: a repeat tap lands here and is fine.
      if (rule.nextDueDate.getTime() > occurrence.getTime()) {
        return NextResponse.json({ success: true, alreadyHandled: true });
      }
      return NextResponse.json({ error: m.occurrenceNotDue }, { status: 409 });
    }

    await prisma.recurringRule.updateMany({
      where: { id, nextDueDate: { lte: occurrence } },
      data: { nextDueDate: addDays(occurrence, 1) },
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err, "POST /api/recurring/[id]/skip");
  }
}
