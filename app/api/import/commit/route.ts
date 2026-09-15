import { NextRequest, NextResponse } from "next/server";
import { requireUser, errorResponse } from "@/lib/auth";
import { apiMessages } from "@/lib/api-lang";
import { commitImport, type CommitRow } from "@/lib/reconcile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Writes the rows the reader accepted, as one undoable batch. */
export async function POST(req: NextRequest) {
  try {
    const userId = await requireUser();
    const m = await apiMessages();

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) {
      return NextResponse.json({ error: m.invalidJson }, { status: 400 });
    }

    const account = typeof body.account === "string" ? body.account.trim() : "";
    if (account === "") {
      return NextResponse.json({ error: m.accountFieldRequired }, { status: 400 });
    }

    const rows = Array.isArray(body.rows) ? (body.rows as CommitRow[]) : [];
    if (rows.length === 0) {
      return NextResponse.json({ error: m.importNoSelection }, { status: 400 });
    }

    const result = await commitImport(userId, {
      account,
      fileName: typeof body.fileName === "string" ? body.fileName : "",
      rows,
      rowsMatched: Number(body.rowsMatched) || 0,
      periodFrom: asDay(body.periodFrom),
      periodTo: asDay(body.periodTo),
      closingBalance:
        typeof body.closingBalance === "number" && isFinite(body.closingBalance)
          ? body.closingBalance
          : null,
    });

    if (!result.ok) {
      const error =
        result.error === "account"
          ? m.accountNamedMissing(account)
          : m.importBadRow((result.line ?? 0) + 1);
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json(
      { success: true, importId: result.importId, created: result.created },
      { status: 201 }
    );
  } catch (err) {
    return errorResponse(err, "POST /api/import/commit");
  }
}

function asDay(value: unknown): string | null {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}
