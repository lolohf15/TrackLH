import { NextResponse } from "next/server";
import { requireUser, errorResponse } from "@/lib/auth";
import { apiDictionary } from "@/lib/api-lang";
import { collectExportData } from "@/lib/export-data";
import { buildWorkbook, exportFileName } from "@/services/export-workbook";

const XLSX_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

// ExcelJS is a Node library — it needs zlib and Buffer, neither of which the
// edge runtime has.
export const runtime = "nodejs";
// The whole point is a fresh snapshot of the ledger, so nothing about this
// response may be reused: not by Next, not by a CDN, not by the browser.
export const dynamic = "force-dynamic";

/** The signed-in user's entire ledger as an .xlsx workbook. */
export async function GET() {
  try {
    const userId = await requireUser();
    const { dict, lang } = await apiDictionary();

    const generatedAt = new Date();
    const bundle = await collectExportData(userId);
    const buffer = await buildWorkbook(bundle, dict, lang, generatedAt);

    const name = exportFileName(dict, generatedAt);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": XLSX_TYPE,
        "Content-Length": String(buffer.byteLength),
        // The plain `filename` is the ASCII fallback for readers that predate
        // RFC 5987; `filename*` is what every current browser actually uses.
        "Content-Disposition":
          `attachment; filename="${name.replace(/[^\x20-\x7e]/g, "_")}"; ` +
          `filename*=UTF-8''${encodeURIComponent(name)}`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (err) {
    return errorResponse(err, "GET /api/export");
  }
}
