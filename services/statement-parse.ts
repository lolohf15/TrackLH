/**
 * Turning a bank's file into rows this app can reason about.
 *
 * Deliberately free of any bank-specific template. Statements differ in
 * column names, column count, how many junk rows sit above the header, which
 * way amounts are signed and how dates are written, but they all answer the
 * same three questions per line: when, how much, and what did it say. Every
 * function here is about recovering those three from whatever shape arrived.
 *
 * Pure: it takes a grid of cells and gives back rows. Reading the upload is
 * `lib/import-file.ts`'s job, and matching them is `statement-match.ts`'s.
 */

import { round2 } from "./finance";

/** What a cell can be once a CSV or a worksheet has been flattened. */
export type Cell = string | number | Date | null;

export type ColumnRole =
  | "date"
  | "description"
  | "amount"
  | "charge"
  | "credit"
  | "balance";

/** Which column index answers which question. -1 means "not in this file". */
export type ColumnMap = Record<ColumnRole, number>;

export const EMPTY_MAP: ColumnMap = {
  date: -1,
  description: -1,
  amount: -1,
  charge: -1,
  credit: -1,
  balance: -1,
};

export interface StatementRow {
  /** Index into the original grid, so the UI can point at the source line. */
  line: number;
  /** `YYYY-MM-DD`. */
  date: string;
  description: string;
  /**
   * Signed the way the account experiences it: negative left the account,
   * positive arrived. A card purchase is negative on the card's own
   * statement, and so is a withdrawal on a debit one.
   */
  signedAmount: number;
  /** The running balance the statement printed, when it prints one. */
  balance: number | null;
}

export interface ParseOptions {
  /**
   * Some statements list charges as positive numbers in a single column and
   * let the reader infer the sign from context. One flip fixes the whole file.
   */
  invertSigns?: boolean;
}

export interface ParseResult {
  headerLine: number;
  columns: ColumnMap;
  headers: string[];
  rows: StatementRow[];
  /** Lines that looked like data but could not be read, for the UI to report. */
  skipped: number;
}

// ------------------------------------------------------------------- text

/** Lowercase, unaccented, punctuation-free. Used for every header guess. */
export function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cellText(value: Cell): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value).trim();
}

// ---------------------------------------------------------------- amounts

/**
 * `"$1,234.56"`, `"(1.234,56)"`, `"1234.56-"`, `"-$ 1,234.56"` and a bare
 * number all have to come out the same. Returns null for anything that isn't
 * a number at all, which is how a header or a footer row gets rejected.
 */
export function parseAmount(value: Cell): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return isFinite(value) ? round2(value) : null;
  if (value instanceof Date) return null;

  let text = value.trim();
  if (text === "") return null;

  let negative = false;

  // Accounting notation: a charge in parentheses.
  if (/^\(.*\)$/.test(text)) {
    negative = true;
    text = text.slice(1, -1);
  }

  // Some exports trail the sign instead of leading it.
  if (/-\s*$/.test(text)) {
    negative = true;
    text = text.replace(/-\s*$/, "");
  }

  text = text.replace(/[^0-9,.\-+]/g, "");
  if (text.startsWith("-")) negative = true;
  text = text.replace(/[+-]/g, "");
  if (text === "") return null;

  // Whichever separator comes last is the decimal one: `1,234.56` and
  // `1.234,56` are the same number written by two different conventions.
  const lastComma = text.lastIndexOf(",");
  const lastDot = text.lastIndexOf(".");

  if (lastComma >= 0 && lastDot >= 0) {
    const decimal = lastComma > lastDot ? "," : ".";
    const thousands = decimal === "," ? "." : ",";
    text = text.split(thousands).join("").replace(decimal, ".");
  } else {
    const at = Math.max(lastComma, lastDot);
    if (at >= 0) {
      const separator = text[at];
      const head = text.slice(0, at);
      const tail = text.length - at - 1;
      // Exactly three digits after a lone separator is a thousands group, not
      // cents: `1,234` and `1.234` are both one thousand two hundred thirty
      // four, whichever convention wrote them. `0.500` is the one exception,
      // since nobody writes five hundred that way.
      const thousands = (tail === 3 && head !== "0") || tail > 3;
      text = thousands
        ? text.split(separator).join("")
        : `${head}.${text.slice(at + 1)}`;
    }
  }

  const parsed = Number(text);
  if (!isFinite(parsed)) return null;
  return round2(negative ? -parsed : parsed);
}

// ------------------------------------------------------------------ dates

const MONTH_NAMES: Record<string, number> = {
  ene: 1, enero: 1, jan: 1, january: 1,
  feb: 2, febrero: 2, february: 2,
  mar: 3, marzo: 3, march: 3,
  abr: 4, abril: 4, apr: 4, april: 4,
  may: 5, mayo: 5,
  jun: 6, junio: 6, june: 6,
  jul: 7, julio: 7, july: 7,
  ago: 8, agosto: 8, aug: 8, august: 8,
  sep: 9, sept: 9, septiembre: 9, september: 9,
  oct: 10, octubre: 10, october: 10,
  nov: 11, noviembre: 11, november: 11,
  dic: 12, diciembre: 12, dec: 12, december: 12,
};

/** A date before its ambiguity is resolved. */
interface RawDate {
  /** The two numbers that could each be the day or the month, in file order. */
  first: number;
  second: number;
  /** Null when the file wrote `15/ENE` and left the year to the reader. */
  year: number | null;
  /** True once a month name pinned which of the two is the month. */
  monthKnown: boolean;
  /** Which position held the month, when it is known. */
  monthFirst: boolean;
}

function parseRawDate(value: Cell): RawDate | null {
  if (value === null || value === undefined) return null;

  // A worksheet cell that is already a date needs no guessing at all.
  if (value instanceof Date) {
    return {
      first: value.getUTCMonth() + 1,
      second: value.getUTCDate(),
      year: value.getUTCFullYear(),
      monthKnown: true,
      monthFirst: true,
    };
  }

  const text = String(value).trim();
  if (text === "") return null;

  // ISO first: unambiguous, and the only form where the year leads.
  const iso = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/.exec(text);
  if (iso) {
    return {
      first: +iso[2],
      second: +iso[3],
      year: +iso[1],
      monthKnown: true,
      monthFirst: true,
    };
  }

  const parts = text.split(/[\s/.\-]+/).filter((p) => p !== "");
  if (parts.length < 2) return null;

  const named = parts.findIndex((p) => MONTH_NAMES[fold(p)] !== undefined);
  if (named >= 0) {
    const month = MONTH_NAMES[fold(parts[named])];
    const numbers = parts.filter((_, i) => i !== named).map((p) => parseInt(p, 10));
    const day = numbers.find((n) => Number.isFinite(n) && n >= 1 && n <= 31);
    if (day === undefined) return null;
    const year = numbers.find((n) => Number.isFinite(n) && n > 31) ?? null;
    return { first: month, second: day, year, monthKnown: true, monthFirst: true };
  }

  const a = parseInt(parts[0], 10);
  const b = parseInt(parts[1], 10);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  if (a < 1 || a > 31 || b < 1 || b > 31) return null;

  let year: number | null = null;
  if (parts.length >= 3) {
    const c = parseInt(parts[2], 10);
    if (Number.isFinite(c)) year = c < 100 ? 2000 + c : c;
  }

  return { first: a, second: b, year, monthKnown: false, monthFirst: false };
}

function isRealDate(y: number, m: number, d: number): boolean {
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/**
 * Resolves a whole column at once, because a single `05/03/2026` cannot say
 * whether it is March or May but a column containing one `17/…` can. Only
 * once the order is settled are missing years filled in, from whatever the
 * dated rows agreed on.
 *
 * Mexican statements are day-first, so that is the tie-break when the file
 * is ambiguous from top to bottom.
 */
export function parseDateColumn(values: Cell[]): Array<string | null> {
  const raws = values.map(parseRawDate);

  let dayFirst = true;
  for (const raw of raws) {
    if (!raw || raw.monthKnown) continue;
    if (raw.first > 12 && raw.second <= 12) { dayFirst = true; break; }
    if (raw.second > 12 && raw.first <= 12) { dayFirst = false; break; }
  }

  const years = raws
    .filter((r): r is RawDate => r !== null && r.year !== null)
    .map((r) => r.year as number);
  const fallbackYear = mode(years) ?? new Date().getUTCFullYear();

  return raws.map((raw) => {
    if (!raw) return null;

    const monthFirst = raw.monthKnown ? raw.monthFirst : !dayFirst;
    const month = monthFirst ? raw.first : raw.second;
    const day = monthFirst ? raw.second : raw.first;
    const year = raw.year ?? fallbackYear;

    if (!isRealDate(year, month, day)) return null;

    const p = (n: number) => String(n).padStart(2, "0");
    return `${year}-${p(month)}-${p(day)}`;
  });
}

function mode(values: number[]): number | null {
  if (values.length === 0) return null;
  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0][0];
}

// ---------------------------------------------------------------- headers

/** Header words seen on Mexican and US statements, longest match wins. */
const ROLE_WORDS: Array<[ColumnRole, string[]]> = [
  ["charge", ["cargo", "cargos", "retiro", "retiros", "debito", "cargo mxn", "debit", "withdrawal", "withdrawals", "egreso"]],
  ["credit", ["abono", "abonos", "deposito", "depositos", "credito", "credit", "deposit", "deposits", "ingreso"]],
  ["balance", ["saldo", "balance", "saldo final", "saldo actual"]],
  ["amount", ["importe", "monto", "amount", "cantidad", "valor", "importe mxn"]],
  ["description", ["descripcion", "concepto", "detalle", "referencia", "description", "movimiento", "movimientos", "establecimiento", "beneficiario", "memo", "narrative"]],
  ["date", ["fecha", "fecha operacion", "fecha de operacion", "fecha de cargo", "fecha cargo", "fecha valor", "f operacion", "date", "transaction date", "posted date"]],
];

function roleOf(header: string): ColumnRole | null {
  const folded = fold(header);
  if (folded === "") return null;

  for (const [role, words] of ROLE_WORDS) {
    if (words.includes(folded)) return role;
  }
  // Then a looser pass, so "Fecha de operación (DD/MM)" still lands.
  for (const [role, words] of ROLE_WORDS) {
    if (words.some((w) => folded.startsWith(w) || folded.includes(` ${w}`))) return role;
  }
  return null;
}

/**
 * Finds the header row and what each column is.
 *
 * Statements open with a few lines of branch, account number and period
 * before the table starts, so the header is whichever of the first rows names
 * the most roles. A file with no header at all scores zero everywhere and
 * comes back with `headerLine: -1`, which the UI turns into manual mapping.
 */
export function detectColumns(grid: Cell[][], searchDepth = 25): {
  headerLine: number;
  columns: ColumnMap;
  headers: string[];
} {
  let best = { line: -1, score: 0, columns: { ...EMPTY_MAP }, headers: [] as string[] };

  for (let i = 0; i < Math.min(grid.length, searchDepth); i++) {
    const cells = grid[i].map(cellText);
    const columns: ColumnMap = { ...EMPTY_MAP };
    let score = 0;

    cells.forEach((cell, index) => {
      const role = roleOf(cell);
      // First column to claim a role keeps it: statements that repeat "Fecha"
      // for operation and value dates mean the first one.
      if (role && columns[role] === -1) {
        columns[role] = index;
        score += 1;
      }
    });

    // A date column plus something to read as money is the minimum that can
    // be called a statement.
    const hasMoney =
      columns.amount !== -1 || columns.charge !== -1 || columns.credit !== -1;
    if (columns.date !== -1 && hasMoney && score > best.score) {
      best = { line: i, score, columns, headers: cells };
    }
  }

  return { headerLine: best.line, columns: best.columns, headers: best.headers };
}

// ----------------------------------------------------------------- rows

/**
 * Applies a mapping to the grid and returns the movements.
 *
 * Rows that don't parse are counted rather than thrown: a statement almost
 * always ends in a totals line, and half of them carry a "saldo anterior"
 * opener. Neither is a movement, and neither should stop an import.
 */
export function buildRows(
  grid: Cell[][],
  columns: ColumnMap,
  headerLine: number,
  options: ParseOptions = {}
): { rows: StatementRow[]; skipped: number } {
  const body = grid.slice(headerLine + 1);
  const dates = parseDateColumn(body.map((r) => r[columns.date] ?? null));

  const rows: StatementRow[] = [];
  let skipped = 0;

  body.forEach((cells, i) => {
    const date = dates[i];
    if (!date) {
      // A row with no date and no numbers is blank padding, not a failure.
      if (cells.some((c) => cellText(c) !== "")) skipped += 1;
      return;
    }

    const signed = signedAmountOf(cells, columns, options.invertSigns === true);
    if (signed === null || signed === 0) {
      skipped += 1;
      return;
    }

    rows.push({
      line: headerLine + 1 + i,
      date,
      description:
        columns.description === -1 ? "" : cellText(cells[columns.description]).slice(0, 200),
      signedAmount: signed,
      balance: columns.balance === -1 ? null : parseAmount(cells[columns.balance]),
    });
  });

  return { rows, skipped };
}

function signedAmountOf(
  cells: Cell[],
  columns: ColumnMap,
  invert: boolean
): number | null {
  const flip = invert ? -1 : 1;

  // Split columns are unambiguous, so they win when the file has both.
  if (columns.charge !== -1 || columns.credit !== -1) {
    const charge = columns.charge === -1 ? null : parseAmount(cells[columns.charge]);
    const credit = columns.credit === -1 ? null : parseAmount(cells[columns.credit]);

    // Written as a magnitude in its own column, so the column is the sign.
    if (charge !== null && charge !== 0) return round2(-Math.abs(charge) * flip);
    if (credit !== null && credit !== 0) return round2(Math.abs(credit) * flip);
    return null;
  }

  if (columns.amount === -1) return null;
  const amount = parseAmount(cells[columns.amount]);
  return amount === null ? null : round2(amount * flip);
}

/**
 * What the account was worth when the statement closed.
 *
 * The latest date wins rather than the last line, because plenty of banks
 * print newest first. Null when the file carries no balance column at all.
 */
export function closingBalanceOf(rows: StatementRow[]): number | null {
  let best: StatementRow | null = null;

  for (const row of rows) {
    if (row.balance === null) continue;
    if (!best || row.date >= best.date) best = row;
  }

  return best?.balance ?? null;
}

/** The whole pipeline, for a file whose columns were already agreed on. */
export function parseStatement(
  grid: Cell[][],
  options: ParseOptions & { columns?: ColumnMap; headerLine?: number } = {}
): ParseResult {
  const detected = detectColumns(grid);
  const columns = options.columns ?? detected.columns;
  const headerLine = options.headerLine ?? detected.headerLine;

  if (headerLine < 0 || columns.date === -1) {
    return { headerLine, columns, headers: detected.headers, rows: [], skipped: 0 };
  }

  const { rows, skipped } = buildRows(grid, columns, headerLine, options);
  return { headerLine, columns, headers: detected.headers, rows, skipped };
}
