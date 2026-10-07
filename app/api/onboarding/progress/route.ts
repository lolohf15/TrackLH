import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth";
import { apiMessages } from "@/lib/api-lang";
import type { FirstStepsProgress } from "@/lib/first-steps";

/**
 * What the "Primeros pasos" card needs to tick its steps. Every answer is a
 * count or an existence check, so this stays cheap enough to read on every
 * visit to Inicio while the card is showing.
 */
export async function GET() {
  try {
    const userId = await requireUser();

    const [user, movement, balance, credit, unconfigured, budget, recurring] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { firstStepsDismissedAt: true } }),
      prisma.transaction.findFirst({ where: { userId }, select: { id: true } }),
      prisma.accountConfig.findFirst({
        where: { userId, OR: [{ initialBalance: { not: 0 } }, { balanceAdjustment: { not: 0 } }] },
        select: { id: true },
      }),
      prisma.accountConfig.count({ where: { userId, isCredit: true } }),
      prisma.accountConfig.count({
        where: { userId, isCredit: true, OR: [{ statementDay: null }, { dueDay: null }] },
      }),
      prisma.budgetConfig.findFirst({ where: { userId, amount: { gt: 0 } }, select: { id: true } }),
      prisma.recurringRule.findFirst({ where: { userId }, select: { id: true } }),
    ]);

    const progress: FirstStepsProgress = {
      dismissed: user?.firstStepsDismissedAt != null,
      hasMovement: movement !== null,
      hasBalance: balance !== null,
      creditAccounts: credit,
      creditConfigured: credit > 0 && unconfigured === 0,
      hasBudget: budget !== null,
      hasRecurring: recurring !== null,
    };
    return NextResponse.json(progress);
  } catch (err) {
    return errorResponse(err, "GET /api/onboarding/progress");
  }
}

/** Closes the card (`{ dismissed: true }`) or brings it back (`false`, for Undo). */
export async function PATCH(req: NextRequest) {
  try {
    const userId = await requireUser();
    const m = await apiMessages();

    const body = (await req.json().catch(() => null)) as { dismissed?: unknown } | null;
    if (typeof body?.dismissed !== "boolean") {
      return NextResponse.json({ error: m.invalidJson }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { firstStepsDismissedAt: body.dismissed ? new Date() : null },
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err, "PATCH /api/onboarding/progress");
  }
}
