import { NextRequest, NextResponse } from "next/server";
import { requireUser, errorResponse } from "@/lib/auth";
import { readToday } from "@/lib/request-today";
import { pendingOccurrences } from "@/lib/recurring";

/**
 * Rules with occurrences due through today on the reader's clock and not yet
 * confirmed or skipped. Computed on every request — there is no scheduler.
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await requireUser();
    return NextResponse.json(await pendingOccurrences(userId, readToday(req)));
  } catch (err) {
    return errorResponse(err, "GET /api/recurring/pending");
  }
}
