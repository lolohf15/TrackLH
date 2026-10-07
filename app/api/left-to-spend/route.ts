import { NextRequest, NextResponse } from "next/server";
import { requireUser, errorResponse } from "@/lib/auth";
import { readToday } from "@/lib/request-today";
import { getLeftToSpend } from "@/lib/left-to-spend";

/** Inicio's "Te quedan $X · $Y por día", for the month holding today. */
export async function GET(req: NextRequest) {
  try {
    const userId = await requireUser();
    const left = await getLeftToSpend(userId, readToday(req));
    return NextResponse.json({ left });
  } catch (err) {
    return errorResponse(err, "GET /api/left-to-spend");
  }
}
