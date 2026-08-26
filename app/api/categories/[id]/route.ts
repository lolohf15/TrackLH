import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth";

/**
 * Like accounts, transactions name their category in plain text, and the
 * monthly budget is keyed by that same name — so a rename has to move all
 * three together or the history and the budget come unstuck.
 */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUser();
    const { id } = await ctx.params;

    const existing = await prisma.category.findFirst({ where: { id, userId } });
    if (!existing) {
      return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 });
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) {
      return NextResponse.json({ error: "Cuerpo de solicitud inválido (JSON)" }, { status: 400 });
    }

    const nextName =
      typeof body.name === "string" && body.name.trim() !== ""
        ? body.name.trim().slice(0, 40)
        : existing.name;
    const nextColor = typeof body.color === "string" ? body.color : existing.color;
    const renamed = nextName !== existing.name;

    const rawBudget = Number(body.budget);
    const budget = Number.isFinite(rawBudget) && rawBudget > 0 ? rawBudget : 0;
    const touchesBudget = body.budget !== undefined && existing.kind === "expense";

    try {
      await prisma.$transaction([
        prisma.category.update({
          where: { id },
          data: { name: nextName, color: nextColor },
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
          { error: "Ya tienes una categoría con ese nombre" },
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

/** Refuses to delete a category that still has movements behind it. */
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUser();
    const { id } = await ctx.params;

    const existing = await prisma.category.findFirst({ where: { id, userId } });
    if (!existing) {
      return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 });
    }

    const used = await prisma.transaction.count({
      where: { userId, category: existing.name },
    });

    if (used > 0) {
      return NextResponse.json(
        {
          error:
            `"${existing.name}" tiene ${used} ${used === 1 ? "movimiento" : "movimientos"}. ` +
            `Cámbialos de categoría antes de eliminarla.`,
        },
        { status: 409 }
      );
    }

    await prisma.$transaction([
      prisma.category.delete({ where: { id } }),
      prisma.budgetConfig.deleteMany({ where: { userId, category: existing.name } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err, "DELETE /api/categories/[id]");
  }
}
