import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth";
import { apiMessages } from "@/lib/api-lang";
import { toNumber } from "@/lib/money";
import { readToday } from "@/lib/request-today";
import { dayKey, oldestPending } from "@/lib/recurring";
import { validateTransactionInput } from "@/lib/transaction-input";
import { buildTransactionId, isUniqueViolation } from "@/lib/transaction-id";
import { addDays } from "@/services/credit-cycle";
import { parseDay } from "@/services/recurrence";

/**
 * Log one occurrence as a movement. The body names the occurrence and may
 * override what this one actually came to — the amount, the day, the account
 * — all checked by the same gate a hand-logged movement goes through.
 *
 * Idempotent per occurrence: a unique index on (rule, occurrence) means a
 * second tap, a retry, or two phones at once all end with one movement, and
 * every one of them answers with its id.
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
    if (!body || !occurrence) {
      return NextResponse.json({ error: m.dateInvalid }, { status: 400 });
    }

    const already = await prisma.transaction.findFirst({
      where: { recurringRuleId: id, occurrenceDate: occurrence },
      select: { id: true },
    });
    if (already) {
      return NextResponse.json({ success: true, id: already.id, alreadyLogged: true });
    }

    const due = rule.active ? await oldestPending(rule, readToday(req)) : null;
    if (!due || due.getTime() !== occurrence.getTime()) {
      return NextResponse.json({ error: m.occurrenceNotDue }, { status: 409 });
    }

    const pick = (key: string, fallback: unknown) => (body[key] !== undefined ? body[key] : fallback);
    const check = await validateTransactionInput(userId, {
      type: pick("type", rule.type),
      account: pick("account", rule.account),
      toAccount: pick("toAccount", rule.toAccount),
      category: pick("category", rule.category),
      amount: pick("amount", toNumber(rule.amount)),
      description: pick("description", rule.description),
      // Midday, the way a back-dated movement is logged, unless the person
      // said when it really happened.
      date: pick("date", `${dayKey(occurrence)}T12:00:00`),
    });
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: check.status });
    }

    for (let attempt = 0; ; attempt++) {
      try {
        const [created] = await prisma.$transaction([
          prisma.transaction.create({
            data: {
              id: buildTransactionId(check.data.date),
              userId,
              ...check.data,
              procesado: false,
              recurringRuleId: id,
              occurrenceDate: occurrence,
            },
          }),
          // Conditional, so a slower duplicate can't drag the rule backwards.
          prisma.recurringRule.updateMany({
            where: { id, nextDueDate: { lte: occurrence } },
            data: { nextDueDate: addDays(occurrence, 1) },
          }),
        ]);
        return NextResponse.json({ success: true, id: created.id }, { status: 201 });
      } catch (err) {
        if (isUniqueViolation(err, "occurrenceDate")) {
          // Someone else confirmed it a moment ago. Same outcome, same answer.
          const winner = await prisma.transaction.findFirst({
            where: { recurringRuleId: id, occurrenceDate: occurrence },
            select: { id: true },
          });
          if (winner) return NextResponse.json({ success: true, id: winner.id, alreadyLogged: true });
        }
        if (!isUniqueViolation(err) || attempt >= 4) throw err;
      }
    }
  } catch (err) {
    return errorResponse(err, "POST /api/recurring/[id]/confirm");
  }
}
