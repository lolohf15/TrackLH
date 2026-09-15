import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth";
import { apiMessages } from "@/lib/api-lang";
import { parseCreditLimit } from "@/lib/account-input";

/**
 * Transactions store the account as plain text, not a foreign key, so a rename
 * has to carry the history with it or every past movement would still point at
 * a name that no longer exists.
 */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUser();
    const m = await apiMessages();
    const id = Number((await ctx.params).id);
    if (!Number.isInteger(id)) {
      return NextResponse.json({ error: m.accountInvalid }, { status: 400 });
    }

    const existing = await prisma.accountConfig.findFirst({ where: { id, userId } });
    if (!existing) {
      return NextResponse.json({ error: m.accountMissing }, { status: 404 });
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) {
      return NextResponse.json({ error: m.invalidJson }, { status: 400 });
    }

    const nextName =
      typeof body.account === "string" && body.account.trim() !== ""
        ? body.account.trim().slice(0, 60)
        : existing.account;
    const nextIsCredit = typeof body.isCredit === "boolean" ? body.isCredit : existing.isCredit;
    const nextColor = typeof body.color === "string" ? body.color : existing.color;
    // An omitted field keeps what's on file; switching to debit drops the line.
    const nextCreditLimit =
      "creditLimit" in body
        ? parseCreditLimit(body.creditLimit, nextIsCredit)
        : parseCreditLimit(existing.creditLimit, nextIsCredit);

    const renamed = nextName !== existing.account;

    try {
      await prisma.$transaction([
        prisma.accountConfig.update({
          where: { id },
          data: {
            account: nextName,
            isCredit: nextIsCredit,
            creditLimit: nextCreditLimit,
            color: nextColor,
          },
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
        return NextResponse.json({ error: m.accountExists }, { status: 409 });
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
    const m = await apiMessages();
    const id = Number((await ctx.params).id);
    if (!Number.isInteger(id)) {
      return NextResponse.json({ error: m.accountInvalid }, { status: 400 });
    }

    const existing = await prisma.accountConfig.findFirst({ where: { id, userId } });
    if (!existing) {
      return NextResponse.json({ error: m.accountMissing }, { status: 404 });
    }

    const used = await prisma.transaction.count({
      where: {
        userId,
        OR: [{ account: existing.account }, { toAccount: existing.account }],
      },
    });

    if (used > 0) {
      return NextResponse.json(
        { error: m.accountInUse(existing.account, used) },
        { status: 409 }
      );
    }

    await prisma.accountConfig.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err, "DELETE /api/accounts/[id]");
  }
}
