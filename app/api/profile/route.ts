import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth";
import { apiMessages } from "@/lib/api-lang";
import { getProfile } from "@/lib/profile";
import { parseProfileUpdate } from "@/services/profile-input";

/** Who's signed in, and the preferences that follow them across devices. */
export async function GET() {
  try {
    const userId = await requireUser();
    const profile = await getProfile(userId);
    if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(profile);
  } catch (err) {
    return errorResponse(err, "GET /api/profile");
  }
}

/** Changes only the fields sent; `null` puts a preference back to the default. */
export async function PATCH(req: NextRequest) {
  try {
    const userId = await requireUser();
    const m = await apiMessages();
    const body = await req.json().catch(() => null);

    const accounts = await prisma.accountConfig.findMany({ where: { userId }, select: { account: true } });
    const parsed = parseProfileUpdate(body, accounts.map((a) => a.account));
    if (!parsed.ok) {
      return NextResponse.json({ error: m.profileInvalid, field: parsed.field }, { status: 400 });
    }

    await prisma.user.update({ where: { id: userId }, data: parsed.data });
    return NextResponse.json(await getProfile(userId));
  } catch (err) {
    return errorResponse(err, "PATCH /api/profile");
  }
}
