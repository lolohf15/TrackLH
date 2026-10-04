import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth";
import { apiMessages } from "@/lib/api-lang";
import { toNumber } from "@/lib/money";
import { readToday } from "@/lib/request-today";
import { dayKey, nextOccurrence, validateRuleInput } from "@/lib/recurring";

/**
 * Edit a rule, pause it or resume it. Omitted fields keep what's on file.
 * Nothing it already logged changes: those are ordinary movements now.
 */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUser();
    const m = await apiMessages();
    const { id } = await ctx.params;

    const existing = await prisma.recurringRule.findFirst({ where: { id, userId } });
    if (!existing) {
      return NextResponse.json({ error: m.ruleMissing }, { status: 404 });
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) {
      return NextResponse.json({ error: m.invalidJson }, { status: 400 });
    }

    const merged: Record<string, unknown> = {
      type: existing.type,
      amount: toNumber(existing.amount),
      account: existing.account,
      toAccount: existing.toAccount,
      category: existing.category,
      description: existing.description,
      frequency: existing.frequency,
      interval: existing.interval,
      startDate: dayKey(existing.anchorDate),
      endDate: existing.endDate ? dayKey(existing.endDate) : null,
      active: existing.active,
      ...body,
    };
    const check = await validateRuleInput(userId, merged, m);
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: check.status });
    }
    const rule = check.data;

    // Where the count of unhandled days resumes from. A new start date only
    // ever moves it forward: everything before the old mark was already
    // confirmed or skipped, and moving the billing day from the 4th to the
    // 1st mustn't bring back the 1st of a month that was already paid.
    let nextDueDate = existing.nextDueDate;
    if (rule.anchorDate.getTime() > nextDueDate.getTime()) nextDueDate = rule.anchorDate;

    const pausing = !rule.active && existing.active;
    const resuming = rule.active && !existing.active;
    if (resuming) {
      // The months it sat paused aren't billed. What was already due before
      // the pause still is, so the mark only jumps when nothing was.
      const today = readToday(req);
      const owed = nextOccurrence({ ...existing, ...rule, nextDueDate });
      const owedBeforePause =
        owed !== null && existing.pausedAt !== null && owed.getTime() <= existing.pausedAt.getTime();
      if (!owedBeforePause && today.getTime() > nextDueDate.getTime()) nextDueDate = today;
    }

    await prisma.recurringRule.update({
      where: { id },
      data: {
        ...rule,
        nextDueDate,
        pausedAt: pausing ? readToday(req) : rule.active ? null : existing.pausedAt,
      },
    });

    return NextResponse.json({ success: true, id });
  } catch (err) {
    return errorResponse(err, "PATCH /api/recurring/[id]");
  }
}

/** Delete a rule. What it already logged stays; it just loses the link. */
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUser();
    const m = await apiMessages();
    const { id } = await ctx.params;

    const existing = await prisma.recurringRule.findFirst({ where: { id, userId } });
    if (!existing) {
      return NextResponse.json({ error: m.ruleMissing }, { status: 404 });
    }

    // The foreign key is ON DELETE SET NULL, so the movements survive it.
    await prisma.recurringRule.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err, "DELETE /api/recurring/[id]");
  }
}
