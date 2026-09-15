import ExcelJS from "exceljs";
import type { Cell } from "@/services/statement-parse";

/**
 * Getting an uploaded statement down to a grid of cells.
 *
 * Everything bank-specific lives in `services/statement-parse.ts`; this
 * module only cares about the container. Two shapes arrive in practice: a
 * spreadsheet, and a delimited text file whose delimiter and character set
 * are both a coin toss.
 */

/** Comfortably above any real statement, low enough to bound the work. */
export const MAX_BYTES = 5 * 1024 * 1024;
export const MAX_ROWS = 5000;

export interface ReadResult {
  rows: Cell[][];
  /** Which tab a workbook was read from, so the UI can say. */
  sheetName: string | null;
  truncated: boolean;
}

export class ImportFileError extends Error {
  constructor(readonly reason: "tooBig" | "empty" | "unsupported" | "unreadable") {
    super(reason);
    this.name = "ImportFileError";
  }
}

export async function readStatementFile(file: File): Promise<ReadResult> {
  if (file.size > MAX_BYTES) throw new ImportFileError("tooBig");
  if (file.size === 0) throw new ImportFileError("empty");

  const name = file.name.toLowerCase();
  const bytes = new Uint8Array(await file.arrayBuffer());

  // The old binary .xls is a different format entirely, and nothing here
  // reads it — better to say so than to hand back an empty grid.
  if (name.endsWith(".xls")) throw new ImportFileError("unsupported");

  if (name.endsWith(".xlsx") || name.endsWith(".xlsm") || looksLikeZip(bytes)) {
    return readWorkbook(bytes);
  }

  return readDelimited(bytes);
}

/** XLSX is a zip, and its magic bytes are the only reliable tell. */
function looksLikeZip(bytes: Uint8Array): boolean {
  return bytes[0] === 0x50 && bytes[1] === 0x4b;
}

// ------------------------------------------------------------- spreadsheet

async function readWorkbook(bytes: Uint8Array): Promise<ReadResult> {
  const wb = new ExcelJS.Workbook();

  try {
    await wb.xlsx.load(bytes as unknown as ArrayBuffer);
  } catch {
    throw new ImportFileError("unreadable");
  }

  // The first sheet that has anything in it. Some exports put a cover tab
  // ahead of the movements.
  const sheet = wb.worksheets.find((ws) => ws.rowCount > 0) ?? wb.worksheets[0];
  if (!sheet) throw new ImportFileError("empty");

  const rows: Cell[][] = [];
  const width = Math.max(sheet.columnCount, 1);
  const limit = Math.min(sheet.rowCount, MAX_ROWS);

  for (let r = 1; r <= limit; r++) {
    const row = sheet.getRow(r);
    const cells: Cell[] = [];
    for (let c = 1; c <= width; c++) cells.push(flatten(row.getCell(c).value));
    rows.push(cells);
  }

  return {
    rows,
    sheetName: sheet.name,
    truncated: sheet.rowCount > limit,
  };
}

/** ExcelJS hands back rich text, formulas and links as objects. */
function flatten(value: ExcelJS.CellValue): Cell {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value;
  if (typeof value === "number" || typeof value === "string") return value;
  if (typeof value === "boolean") return String(value);

  if (typeof value === "object") {
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join("");
    }
    if ("text" in value && typeof value.text === "string") return value.text;
    if ("result" in value) return flatten(value.result as ExcelJS.CellValue);
    if ("error" in value) return null;
  }

  return null;
}

// ----------------------------------------------------------------- text

/**
 * Bank CSVs out of Mexican online banking are often Windows-1252, not UTF-8,
 * and a mis-decode turns every accented merchant into mojibake that then
 * fails to match anything. Strict UTF-8 first, because it is the one that can
 * say "this isn't me"; cp1252 decodes any byte sequence, so it only works as
 * the fallback.
 */
export function decodeText(bytes: Uint8Array): string {
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    text = new TextDecoder("windows-1252").decode(bytes);
  }
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

const DELIMITERS = [",", ";", "\t", "|"];

/**
 * Whichever delimiter splits the sample into the most columns, consistently.
 * A Spanish-locale export uses `;` because the comma is already the decimal
 * point, and guessing wrong yields one fat column per row.
 */
export function sniffDelimiter(sample: string): string {
  let best = { delimiter: ",", columns: 0 };

  for (const delimiter of DELIMITERS) {
    const rows = parseDelimited(sample, delimiter).filter((r) => r.length > 0);
    if (rows.length === 0) continue;

    const counts = rows.map((r) => r.length).sort((a, b) => a - b);
    const median = counts[Math.floor(counts.length / 2)];
    if (median > best.columns) best = { delimiter, columns: median };
  }

  return best.delimiter;
}

/** RFC 4180: quoted fields may hold the delimiter, newlines and `""`. */
export function parseDelimited(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (quoted) {
      if (char !== '"') { field += char; continue; }
      if (text[i + 1] === '"') { field += '"'; i += 1; continue; }
      quoted = false;
      continue;
    }

    if (char === '"') { quoted = true; continue; }

    if (char === delimiter) { row.push(field.trim()); field = ""; continue; }

    if (char === "\r") continue;

    if (char === "\n") {
      row.push(field.trim());
      rows.push(row);
      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  if (field !== "" || row.length > 0) {
    row.push(field.trim());
    rows.push(row);
  }

  return rows;
}

function readDelimited(bytes: Uint8Array): ReadResult {
  const text = decodeText(bytes);
  if (text.trim() === "") throw new ImportFileError("empty");

  const delimiter = sniffDelimiter(text.slice(0, 8192));
  const all = parseDelimited(text, delimiter);

  return {
    rows: all.slice(0, MAX_ROWS),
    sheetName: null,
    truncated: all.length > MAX_ROWS,
  };
}
