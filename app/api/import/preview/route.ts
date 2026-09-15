import { NextRequest, NextResponse } from "next/server";
import { requireUser, errorResponse } from "@/lib/auth";
import { apiMessages } from "@/lib/api-lang";
import { ImportFileError, readStatementFile } from "@/lib/import-file";
import { reconcileAgainstLedger } from "@/lib/reconcile";
import {
  closingBalanceOf,
  detectColumns,
  parseStatement,
  EMPTY_MAP,
  type Cell,
  type ColumnMap,
  type ColumnRole,
} from "@/services/statement-parse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** How many raw lines the mapping screen shows so the reader can see the file. */
const SAMPLE_ROWS = 8;

/**
 * Reads a statement and compares it against the ledger without writing
 * anything.
 *
 * The file never leaves this request: it is parsed in memory, the rows go
 * back to the browser for review, and `POST /api/import/commit` receives the
 * ones that were accepted. Re-posting the same file with a corrected mapping
 * is how the reader fixes a bad guess, which is why nothing is persisted yet.
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await requireUser();
    const m = await apiMessages();

    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    const account = String(form?.get("account") ?? "").trim();

    if (!(file instanceof File)) {
      return NextResponse.json({ error: m.importNoFile }, { status: 400 });
    }
    if (account === "") {
      return NextResponse.json({ error: m.accountFieldRequired }, { status: 400 });
    }

    let grid: Cell[][];
    let sheetName: string | null;
    let truncated: boolean;
    try {
      ({ rows: grid, sheetName, truncated } = await readStatementFile(file));
    } catch (err) {
      if (err instanceof ImportFileError) {
        const message = {
          tooBig: m.importTooBig,
          empty: m.importEmptyFile,
          unsupported: m.importUnsupported,
          unreadable: m.importUnreadable,
        }[err.reason];
        return NextResponse.json({ error: message }, { status: 400 });
      }
      throw err;
    }

    const detected = detectColumns(grid);
    const override = readColumnOverride(form?.get("columns"));
    const headerOverride = readInt(form?.get("headerLine"));
    const invertSigns = String(form?.get("invertSigns") ?? "") === "true";

    // A file whose header could not be found still gets a mapping screen:
    // the reader picks the columns off the sample by hand.
    const headerLine = headerOverride ?? (detected.headerLine >= 0 ? detected.headerLine : 0);
    const columns = override ?? detected.columns;

    const parsed = parseStatement(grid, { columns, headerLine, invertSigns });

    const sample = grid.slice(0, SAMPLE_ROWS).map((row) => row.map(asText));
    const columnCount = grid.reduce((width, row) => Math.max(width, row.length), 0);

    const base = {
      fileName: file.name,
      sheetName,
      truncated,
      headerLine,
      columns,
      columnCount,
      sample,
      detectedHeader: detected.headerLine,
      parsedCount: parsed.rows.length,
      skipped: parsed.skipped,
      invertSigns,
    };

    if (parsed.rows.length === 0) {
      return NextResponse.json({
        ...base,
        error: detected.headerLine < 0 ? m.importNoTable : m.importNoRows,
      });
    }

    const result = await reconcileAgainstLedger(userId, account, parsed.rows);
    if (!result) {
      return NextResponse.json({ error: m.accountNamedMissing(account) }, { status: 404 });
    }

    const dates = parsed.rows.map((r) => r.date).sort();

    return NextResponse.json({
      ...base,
      period: { from: dates[0], to: dates[dates.length - 1] },
      closingBalance: closingBalanceOf(parsed.rows),
      ...result,
    });
  } catch (err) {
    return errorResponse(err, "POST /api/import/preview");
  }
}

const ROLES: ColumnRole[] = ["date", "description", "amount", "charge", "credit", "balance"];

/** The reader's own mapping, when they corrected what detection guessed. */
function readColumnOverride(raw: FormDataEntryValue | null | undefined): ColumnMap | null {
  if (typeof raw !== "string" || raw === "") return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;

  const source = parsed as Record<string, unknown>;
  const columns: ColumnMap = { ...EMPTY_MAP };
  for (const role of ROLES) {
    const value = Number(source[role]);
    columns[role] = Number.isInteger(value) && value >= 0 ? value : -1;
  }
  return columns;
}

function readInt(raw: FormDataEntryValue | null | undefined): number | null {
  if (typeof raw !== "string" || raw === "") return null;
  const value = Number(raw);
  return Number.isInteger(value) && value >= 0 ? value : null;
}

function asText(value: Cell): string {
  if (value === null) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value);
}
