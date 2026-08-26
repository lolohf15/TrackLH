import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth";

/**
 * Transactions store the account as plain text, not a foreign key, so a rename
 * has to carry the history with it or every past movement would still point at
 * a name that no longer exists.
 */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUser();
    const id = Number((await ctx.params).id);
    if (!Number.isInteger(id)) {
      return NextResponse.json({ error: "Cuenta inválida" }, { status: 400 });
    }

    const existing = await prisma.accountConfig.findFirst({ where: { id, userId } });
    if (!existing) {
      return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) {
      return NextResponse.json({ error: "Cuerpo de solicitud inválido (JSON)" }, { status: 400 });
    }

    const nextName =
      typeof body.account === "string" && body.account.trim() !== ""
        ? body.account.trim().slice(0, 60)
        : existing.account;
    const nextIsCredit = typeof body.isCredit === "boolean" ? body.isCredit : existing.isCredit;
    const nextColor = typeof body.color === "string" ? body.color : existing.color;

    const renamed = nextName !== existing.account;

    try {
      await prisma.$transaction([
        prisma.accountConfig.update({
          where: { id },
          data: { account: nextName, isCredit: nextIsCredit, color: nextColor },
        }),
        // Carry the history. Both sides of a transfer can name this account.
        ...(renamed
          ? [
              prisma.transaction.updateMany({
                where: { userId, account: existing.account },
                data: { account: nextName },
              }),
              prisma.transaction.updateMany({
                where: { userId, toAccount: existing.account },
                data: { toAccount: nextName },
              }),
            ]
          : []),
      ]);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        return NextResponse.json({ error: "Ya tienes una cuenta con ese nombre" }, { status: 409 });
      }
      throw err;
    }

    return NextResponse.json({ success: true, renamed });
  } catch (err) {
    return errorResponse(err, "PATCH /api/accounts/[id]");
  }
}

/** Refuses to delete an account that still has movements behind it. */
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUser();
    const id = Number((await ctx.params).id);
    if (!Number.isInteger(id)) {
      return NextResponse.json({ error: "Cuenta inválida" }, { status: 400 });
    }

    const existing = await prisma.accountConfig.findFirst({ where: { id, userId } });
    if (!existing) {
      return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
    }

    const used = await prisma.transaction.count({
      where: {
        userId,
        OR: [{ account: existing.account }, { toAccount: existing.account }],
      },
    });

    if (used > 0) {
      return NextResponse.json(
        {
          error:
            `"${existing.account}" tiene ${used} ${used === 1 ? "movimiento" : "movimientos"}. ` +
            `Bórralos o muévelos a otra cuenta antes de eliminarla.`,
        },
        { status: 409 }
      );
    }

    await prisma.accountConfig.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err, "DELETE /api/accounts/[id]");
  }
}
