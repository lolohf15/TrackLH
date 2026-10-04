import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth";
import { apiMessages } from "@/lib/api-lang";
import { dayKey, listRules, validateRuleInput } from "@/lib/recurring";
import { addDays } from "@/services/credit-cycle";

/** This user's recurring rules, and what they add up to in a month. */
export async function GET() {
  try {
    const userId = await requireUser();
    return NextResponse.json(await listRules(userId));
  } catch (err) {
    return errorResponse(err, "GET /api/recurring");
  }
}

/**
 * Create a rule. With `transactionId` it is made from a movement just logged
 * ("make recurring" in the record sheet): that movement becomes its first
 * occurrence, so it never shows up as pending a second time.
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await requireUser();
    const m = await apiMessages();

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) {
      return NextResponse.json({ error: m.invalidJson }, { status: 400 });
    }

    const source =
      typeof body.transactionId === "string"
        ? await prisma.transaction.findFirst({ where: { id: body.transactionId, userId } })
        : null;
    if (typeof body.transactionId === "string" && (!source || source.recurringRuleId)) {
      return NextResponse.json({ error: m.movementMissing }, { status: 404 });
    }

    const check = await validateRuleInput(
      userId,
      source ? { ...body, startDate: dayKey(source.date) } : body,
      m
    );
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: check.status });
    }
    const rule = check.data;

    if (!source) {
      const created = await prisma.recurringRule.create({
        data: { userId, ...rule, nextDueDate: rule.anchorDate },
      });
      return NextResponse.json({ success: true, id: created.id }, { status: 201 });
    }

    // The movement is the first occurrence: link it, and start the rule's
    // count from the day after.
    const created = await prisma.$transaction(async (tx) => {
      const r = await tx.recurringRule.create({
        data: { userId, ...rule, nextDueDate: addDays(rule.anchorDate, 1) },
      });
      await tx.transaction.update({
        where: { id: source.id },
        data: { recurringRuleId: r.id, occurrenceDate: rule.anchorDate },
      });
      return r;
    });
    return NextResponse.json({ success: true, id: created.id }, { status: 201 });
  } catch (err) {
    return errorResponse(err, "POST /api/recurring");
  }
}
