import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth";
import { apiMessages } from "@/lib/api-lang";
import { isCategoryIconKey } from "@/lib/category-icons";

/**
 * Like accounts, transactions name their category in plain text, and the
 * monthly budget is keyed by that same name — so a rename has to move all
 * three together or the history and the budget come unstuck.
 */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUser();
    const m = await apiMessages();
    const { id } = await ctx.params;

    const existing = await prisma.category.findFirst({ where: { id, userId } });
    if (!existing) {
      return NextResponse.json({ error: m.categoryMissing }, { status: 404 });
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) {
      return NextResponse.json({ error: m.invalidJson }, { status: 400 });
    }

    const nextName =
      typeof body.name === "string" && body.name.trim() !== ""
        ? body.name.trim().slice(0, 40)
        : existing.name;
    const nextColor = typeof body.color === "string" ? body.color : existing.color;
    // Absent leaves the icon alone; null (or a key this build doesn't know)
    // clears it back to the first-letter fallback.
    const nextIcon =
      body.icon === undefined ? existing.icon : isCategoryIconKey(body.icon) ? body.icon : null;
    const renamed = nextName !== existing.name;

    const rawBudget = Number(body.budget);
    const budget = Number.isFinite(rawBudget) && rawBudget > 0 ? rawBudget : 0;
    const touchesBudget = body.budget !== undefined && existing.kind === "expense";

    try {
      await prisma.$transaction([
        prisma.category.update({
          where: { id },
          data: { name: nextName, color: nextColor, icon: nextIcon },
        }),
        ...(renamed
          ? [
              prisma.transaction.updateMany({
                where: { userId, category: existing.name },
                data: { category: nextName },
              }),
              // The budget row is keyed by name, so it moves too.
              prisma.budgetConfig.updateMany({
                where: { userId, category: existing.name },
                data: { category: nextName },
              }),
              // And so do recurring rules — only the ones of this category's
              // kind, since an expense and an income category can share a name.
              prisma.recurringRule.updateMany({
                where: {
                  userId,
                  category: existing.name,
                  type: existing.kind === "income" ? "Ingreso" : "Gasto",
                },
                data: { category: nextName },
              }),
            ]
          : []),
      ]);

      if (touchesBudget) {
        if (budget > 0) {
          await prisma.budgetConfig.upsert({
            where: { userId_category: { userId, category: nextName } },
            create: { userId, category: nextName, amount: budget },
            update: { amount: budget },
          });
        } else {
          await prisma.budgetConfig.deleteMany({ where: { userId, category: nextName } });
        }
      }
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        return NextResponse.json(
          { error: m.categoryExists },
          { status: 409 }
        );
      }
      throw err;
    }

    return NextResponse.json({ success: true, renamed });
  } catch (err) {
    return errorResponse(err, "PATCH /api/categories/[id]");
  }
}

/**
 * Deleting a category never touches the movements already filed under it:
 * they keep its name, so the history reads the same. What moves on is what
 * comes next. Recurring rules would keep logging the old name, so they need
 * a `replacementId` (another category of the same kind) to carry on under.
 */
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUser();
    const m = await apiMessages();
    const { id } = await ctx.params;

    const existing = await prisma.category.findFirst({ where: { id, userId } });
    if (!existing) {
      return NextResponse.json({ error: m.categoryMissing }, { status: 404 });
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const replacementId = typeof body?.replacementId === "string" ? body.replacementId : null;
    const replacement = replacementId
      ? await prisma.category.findFirst({
          where: { id: replacementId, userId, kind: existing.kind, NOT: { id } },
        })
      : null;
    if (replacementId && !replacement) {
      return NextResponse.json({ error: m.categoryMissing }, { status: 404 });
    }

    const ruleWhere = {
      userId,
      category: existing.name,
      type: existing.kind === "income" ? "Ingreso" : "Gasto",
    };
    const rules = await prisma.recurringRule.count({ where: ruleWhere });
    if (rules > 0 && !replacement) {
      return NextResponse.json(
        { error: m.categoryInRules(existing.name, rules) },
        { status: 409 }
      );
    }

    await prisma.$transaction([
      ...(replacement && rules > 0
        ? [prisma.recurringRule.updateMany({ where: ruleWhere, data: { category: replacement.name } })]
        : []),
      prisma.category.delete({ where: { id } }),
      prisma.budgetConfig.deleteMany({ where: { userId, category: existing.name } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err, "DELETE /api/categories/[id]");
  }
}
