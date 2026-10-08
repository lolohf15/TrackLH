import { NextRequest, NextResponse } from "next/server";
import { compare, hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth";
import { apiMessages } from "@/lib/api-lang";

const MIN_PASSWORD = 8;
const MAX_PASSWORD = 200;

/**
 * Changes the password, or sets a first one for someone who only ever signed
 * in with Google. Changing needs the current one: a session left open on a
 * shared device shouldn't be enough to take the account over.
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await requireUser();
    const m = await apiMessages();
    const body = (await req.json().catch(() => null)) as { current?: unknown; next?: unknown } | null;
    if (!body) return NextResponse.json({ error: m.invalidJson }, { status: 400 });

    const next = typeof body.next === "string" ? body.next : "";
    if (next.length < MIN_PASSWORD || next.length > MAX_PASSWORD) {
      return NextResponse.json({ error: m.passwordTooShort(MIN_PASSWORD), field: "next" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
    if (!user) return NextResponse.json({ error: m.unauthorized }, { status: 401 });

    if (user.passwordHash) {
      const current = typeof body.current === "string" ? body.current : "";
      if (!current || !(await compare(current, user.passwordHash))) {
        return NextResponse.json({ error: m.currentPasswordWrong, field: "current" }, { status: 400 });
      }
    }

    await prisma.user.update({ where: { id: userId }, data: { passwordHash: await hash(next, 12) } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err, "POST /api/profile/password");
  }
}
