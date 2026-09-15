import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth";
import { apiMessages } from "@/lib/api-lang";

export const dynamic = "force-dynamic";

/**
 * Undoes an import: the movements it created go, and so does the batch.
 *
 * Deleted by `importId` scoped to the tenant rather than by the ids the
 * browser holds, so the reader gets back exactly the state they had before
 * the import even if they edited a row since.
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUser();
    const m = await apiMessages();
    const { id } = await params;

    const batch = await prisma.importBatch.findFirst({ where: { id, userId } });
    if (!batch) {
      return NextResponse.json({ error: m.importBatchMissing }, { status: 404 });
    }

    const [{ count }] = await prisma.$transaction([
      prisma.transaction.deleteMany({ where: { userId, importId: id } }),
      prisma.importBatch.delete({ where: { id } }),
    ]);

    return NextResponse.json({ success: true, deleted: count });
  } catch (err) {
    return errorResponse(err, "DELETE /api/import/[id]");
  }
}
