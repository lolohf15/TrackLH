import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Recent reconciliations, newest first, so each one can still be undone. */
export async function GET() {
  try {
    const userId = await requireUser();

    const batches = await prisma.importBatch.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json(
      batches.map((b) => ({
        id: b.id,
        account: b.account,
        fileName: b.fileName,
        rowsCreated: b.rowsCreated,
        rowsMatched: b.rowsMatched,
        periodFrom: b.periodFrom?.toISOString() ?? null,
        periodTo: b.periodTo?.toISOString() ?? null,
        createdAt: b.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    return errorResponse(err, "GET /api/import");
  }
}
