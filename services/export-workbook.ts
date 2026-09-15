import ExcelJS from "exceljs";
import type { Dictionary } from "@/lib/dictionary";
import type { Lang } from "@/lib/i18n";
import type { ExportBundle } from "@/lib/export-data";
import type { CategoryKind, Transaction } from "@/types";
import { UNCATEGORIZED, round2 } from "@/services/finance";

/**
 * The Excel export.
 *
 * Six sheets, all built from the same bundle: a cover, the raw ledger, and
 * four sheets that are already the shapes people rebuild by hand once they
 * open a finance export — balances, categories, a month-by-month, and a
 * category-against-month cross tab. Every figure is a real number with a
 * currency format rather than a pre-formatted string, so a pivot table or a
 * SUM over the file works the moment it opens.
 *
 * Nothing here touches the database: it takes the bundle `lib/export-data.ts`
 * reads and the dictionary `lib/api-lang.ts` picks, which keeps the sheet in
 * the reader's language without this module knowing how either is fetched.
 */

/** Pesos, two decimals. The app rounds display to whole pesos; a file people
 *  will do arithmetic on should not throw the cents away. */
const MONEY = '"$"#,##0.00';
const PERCENT = '0.0"%"';

const INK = "FF1F1D19";
const ACCENT = "FFC99B57";
const BAND = "FFF4F1EA";

/** Dates go in as real dates; only the mask differs by reader. */
const DATE_FORMAT: Record<Lang, string> = { es: "dd/mm/yyyy", en: "mm/dd/yyyy" };

type Column = {
  header: string;
  key: string;
  width: number;
  numFmt?: string;
};

export async function buildWorkbook(
  bundle: ExportBundle,
  dict: Dictionary,
  lang: Lang,
  generatedAt: Date = new Date()
): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "TrackLH";
  wb.created = generatedAt;

  buildSummary(wb, bundle, dict, lang, generatedAt);
  buildTransactions(wb, bundle, dict, lang);
  buildAccounts(wb, bundle, dict);
  buildCategories(wb, bundle, dict);
  buildMonthly(wb, bundle, dict);
  buildCategoryPivot(wb, bundle, dict);

  return (await wb.xlsx.writeBuffer()) as ArrayBuffer;
}

/** `TrackLH-2026-09-15.xlsx` — sorts by itself in a downloads folder. */
export function exportFileName(dict: Dictionary, generatedAt: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  const day =
    `${generatedAt.getFullYear()}-${p(generatedAt.getMonth() + 1)}-${p(generatedAt.getDate())}`;
  return `${dict.xlsx.fileStem}-${day}.xlsx`;
}

// ---------------------------------------------------------------- sheets

function buildSummary(
  wb: ExcelJS.Workbook,
  bundle: ExportBundle,
  dict: Dictionary,
  lang: Lang,
  generatedAt: Date
): void {
  const x = dict.xlsx;
  const ws = wb.addWorksheet(x.sheets.summary, {
    properties: { defaultColWidth: 18 },
    views: [{ showGridLines: false }],
  });
  ws.getColumn(1).width = 30;
  ws.getColumn(2).width = 26;
  ws.getColumn(3).width = 52;

  const title = ws.getCell("A1");
  title.value = x.title;
  title.font = { bold: true, size: 15, color: { argb: INK } };
  ws.getRow(1).height = 26;

  const { transactions, balances, categories, user } = bundle;

  // Rows are newest first, so the span runs from the last one to the first.
  const newest = transactions[0]?.date ?? null;
  const oldest = transactions[transactions.length - 1]?.date ?? null;
  const coverage =
    oldest && newest
      ? `${formatDay(oldest, lang)} — ${formatDay(newest, lang)}`
      : x.empty;

  let row = 3;
  row = meta(ws, row, x.user, user.name ? `${user.name} · ${user.email}` : user.email);
  row = meta(ws, row, x.generatedAt, formatStamp(generatedAt, lang));
  row = meta(ws, row, x.coverage, coverage);

  const totalAvailable = round2(
    balances.filter((b) => !b.isCredit).reduce((s, b) => s + b.currentBalance, 0)
  );
  const cardDebt = round2(balances.reduce((s, b) => s + (b.debt ?? 0), 0));

  row += 1;
  row = block(ws, row, x.blocks.networth, [
    [x.fields.totalAvailable, totalAvailable, MONEY],
    [x.fields.cardDebt, cardDebt, MONEY],
    [x.fields.netWorth, round2(totalAvailable - cardDebt), MONEY],
  ]);

  const income = round2(
    transactions.filter((t) => t.type === "Ingreso").reduce((s, t) => s + t.amount, 0)
  );
  const expenses = round2(
    transactions.filter((t) => t.type === "Gasto").reduce((s, t) => s + t.amount, 0)
  );

  row += 1;
  row = block(ws, row, x.blocks.history, [
    [x.fields.totalIncome, income, MONEY],
    [x.fields.totalExpenses, expenses, MONEY],
    [x.fields.net, round2(income - expenses), MONEY],
  ]);

  row += 1;
  row = block(ws, row, x.blocks.counts, [
    [x.fields.movementCount, transactions.length],
    [x.fields.accountCount, balances.length],
    [x.fields.categoryCount, categories.length],
  ]);

  row += 1;
  sectionLabel(ws, row, x.contents);
  row += 1;
  for (const [name, hint] of [
    [x.sheets.transactions, x.sheetHints.transactions],
    [x.sheets.accounts, x.sheetHints.accounts],
    [x.sheets.categories, x.sheetHints.categories],
    [x.sheets.monthly, x.sheetHints.monthly],
    [x.sheets.byCategory, x.sheetHints.byCategory],
  ]) {
    const cell = ws.getCell(row, 1);
    cell.value = name;
    cell.font = { bold: true, size: 11, color: { argb: INK } };
    const note = ws.getCell(row, 2);
    note.value = hint;
    note.font = { size: 11, color: { argb: "FF5B554B" } };
    ws.mergeCells(row, 2, row, 3);
    row += 1;
  }
}

function buildTransactions(
  wb: ExcelJS.Workbook,
  bundle: ExportBundle,
  dict: Dictionary,
  lang: Lang
): void {
  const h = dict.xlsx.headers;

  // `Ingresos` and `Gastos` sit beside `Monto` on purpose: the stored amount
  // is always positive, so splitting it by sign here is what makes a pivot
  // or a plain SUM over the column mean anything.
  const columns: Column[] = [
    { header: h.date, key: "date", width: 13, numFmt: DATE_FORMAT[lang] },
    { header: h.month, key: "month", width: 10 },
    { header: h.type, key: "type", width: 15 },
    { header: h.account, key: "account", width: 20 },
    { header: h.toAccount, key: "toAccount", width: 20 },
    { header: h.category, key: "category", width: 20 },
    { header: h.description, key: "description", width: 32 },
    { header: h.amount, key: "amount", width: 14, numFmt: MONEY },
    { header: h.income, key: "income", width: 14, numFmt: MONEY },
    { header: h.expense, key: "expense", width: 14, numFmt: MONEY },
    { header: h.notes, key: "notes", width: 28 },
    { header: h.id, key: "id", width: 24 },
  ];

  const ws = table(wb, dict.xlsx.sheets.transactions, columns);

  for (const t of bundle.transactions) {
    ws.addRow({
      // Stored UTC-pinned, and ExcelJS converts from epoch milliseconds
      // without a timezone shift — so the day in the file is the day the
      // movement was logged, wherever the file is opened.
      date: new Date(t.date),
      month: t.date.slice(0, 7),
      type: dict.txType[t.type],
      account: t.account,
      toAccount: t.toAccount ?? "",
      category: t.type === "Gasto" ? (t.category ?? UNCATEGORIZED) : (t.category ?? ""),
      description: t.description ?? "",
      amount: t.amount,
      income: t.type === "Ingreso" ? t.amount : null,
      expense: t.type === "Gasto" ? t.amount : null,
      notes: t.notes ?? "",
      id: t.id,
    });
  }

  band(ws, columns.length);
}

function buildAccounts(wb: ExcelJS.Workbook, bundle: ExportBundle, dict: Dictionary): void {
  const h = dict.xlsx.headers;

  const columns: Column[] = [
    { header: h.account, key: "account", width: 22 },
    { header: h.accountKind, key: "kind", width: 14 },
    { header: h.initialBalance, key: "initial", width: 15, numFmt: MONEY },
    { header: h.income, key: "income", width: 15, numFmt: MONEY },
    { header: h.expense, key: "expenses", width: 15, numFmt: MONEY },
    { header: h.transfersIn, key: "transfersIn", width: 20, numFmt: MONEY },
    { header: h.transfersOut, key: "transfersOut", width: 20, numFmt: MONEY },
    { header: h.adjustment, key: "adjustment", width: 13, numFmt: MONEY },
    { header: h.currentBalance, key: "balance", width: 16, numFmt: MONEY },
    { header: h.creditLimit, key: "limit", width: 16, numFmt: MONEY },
    { header: h.debt, key: "debt", width: 14, numFmt: MONEY },
    { header: h.availableCredit, key: "available", width: 17, numFmt: MONEY },
    { header: h.utilization, key: "utilization", width: 14, numFmt: PERCENT },
  ];

  const ws = table(wb, dict.xlsx.sheets.accounts, columns);

  for (const b of bundle.balances) {
    ws.addRow({
      account: b.account,
      kind: b.isCredit ? dict.wallet.credit : dict.wallet.debit,
      initial: b.initialBalance,
      // A credit account never accumulates income (rule 7), so the column
      // stays empty there rather than showing a zero that looks like data.
      income: b.isCredit ? null : b.income,
      expenses: b.expenses,
      transfersIn: b.transfersIn,
      transfersOut: b.transfersOut,
      adjustment: b.balanceAdjustment,
      balance: b.currentBalance,
      limit: b.creditLimit,
      debt: b.debt,
      available: b.availableCredit,
      utilization: b.utilizationPercent,
    });
  }

  band(ws, columns.length);
}

function buildCategories(wb: ExcelJS.Workbook, bundle: ExportBundle, dict: Dictionary): void {
  const h = dict.xlsx.headers;

  const columns: Column[] = [
    { header: h.category, key: "name", width: 24 },
    { header: h.type, key: "kind", width: 12 },
    { header: h.budget, key: "budget", width: 18, numFmt: MONEY },
    { header: h.allTime, key: "total", width: 17, numFmt: MONEY },
    { header: h.count, key: "count", width: 13 },
    { header: h.monthlyAverage, key: "average", width: 17, numFmt: MONEY },
    { header: h.color, key: "color", width: 11 },
  ];

  const ws = table(wb, dict.xlsx.sheets.categories, columns);

  // Kept apart by kind, not merged by name: `@@unique([userId, kind, name])`
  // lets someone have both a "Becas" they spend and a "Becas" they receive,
  // and one row summing the two would be a number with no meaning.
  const totals = {
    expense: totalsByCategory(bundle.transactions, "Gasto"),
    income: totalsByCategory(bundle.transactions, "Ingreso"),
  };

  const kindLabel: Record<CategoryKind, string> = {
    expense: dict.categorySheet.expense,
    income: dict.categorySheet.income,
  };

  for (const c of bundle.categories) {
    addCategoryRow(ws, c.name, kindLabel[c.kind], c.budget, c.color, totals[c.kind]);
  }

  // Then anything the ledger still refers to but the settings no longer list:
  // a renamed or deleted category keeps its movements, and dropping it here
  // would leave this sheet's totals short of the Movimientos sheet's.
  for (const kind of ["expense", "income"] as const) {
    const configured = new Set(
      bundle.categories.filter((c) => c.kind === kind).map((c) => c.name)
    );
    const orphans = Array.from(totals[kind].keys())
      .filter((name) => !configured.has(name))
      .sort((a, b) => a.localeCompare(b));

    for (const name of orphans) {
      addCategoryRow(ws, name, kindLabel[kind], 0, null, totals[kind]);
    }
  }

  band(ws, columns.length);
}

interface CategoryTotals {
  amount: number;
  count: number;
  /** The months it was actually used in — what the average divides by. */
  months: Set<string>;
}

/** One movement type's totals per category name. Transfers are never either. */
function totalsByCategory(
  transactions: Transaction[],
  type: "Gasto" | "Ingreso"
): Map<string, CategoryTotals> {
  const map = new Map<string, CategoryTotals>();

  for (const t of transactions) {
    if (t.type !== type) continue;
    // An income row with no category has nothing to file it under; a spending
    // row does, and it is the same bucket the charts use.
    const name = t.category ?? (type === "Gasto" ? UNCATEGORIZED : null);
    if (!name) continue;

    const entry = map.get(name) ?? { amount: 0, count: 0, months: new Set<string>() };
    entry.amount += t.amount;
    entry.count += 1;
    entry.months.add(t.date.slice(0, 7));
    map.set(name, entry);
  }

  return map;
}

function addCategoryRow(
  ws: ExcelJS.Worksheet,
  name: string,
  kind: string,
  budget: number,
  color: string | null,
  totals: Map<string, CategoryTotals>
): void {
  const entry = totals.get(name);
  const months = entry?.months.size ?? 0;
  ws.addRow({
    name,
    kind,
    budget: budget > 0 ? budget : null,
    total: entry ? round2(entry.amount) : 0,
    count: entry?.count ?? 0,
    // Averaged over the months that actually have movements, not over the
    // calendar — a category used twice a year would otherwise read as ~0.
    average: entry && months > 0 ? round2(entry.amount / months) : 0,
    color: color ?? "",
  });
}

function buildMonthly(wb: ExcelJS.Workbook, bundle: ExportBundle, dict: Dictionary): void {
  const h = dict.xlsx.headers;

  const columns: Column[] = [
    { header: h.month, key: "month", width: 12 },
    { header: h.income, key: "income", width: 16, numFmt: MONEY },
    { header: h.expense, key: "expenses", width: 16, numFmt: MONEY },
    { header: h.net, key: "net", width: 16, numFmt: MONEY },
    { header: h.savingsRate, key: "rate", width: 15, numFmt: PERCENT },
    { header: h.count, key: "count", width: 13 },
  ];

  const ws = table(wb, dict.xlsx.sheets.monthly, columns);

  for (const m of monthlyTotals(bundle.transactions)) {
    const net = round2(m.income - m.expenses);
    ws.addRow({
      month: m.month,
      income: m.income,
      expenses: m.expenses,
      net,
      // Nothing earned means no rate to quote, not a rate of zero.
      rate: m.income > 0 ? round2((net / m.income) * 100) : null,
      count: m.count,
    });
  }

  band(ws, columns.length);
}

function buildCategoryPivot(
  wb: ExcelJS.Workbook,
  bundle: ExportBundle,
  dict: Dictionary
): void {
  const h = dict.xlsx.headers;
  const { months, rows } = spendingByCategoryAndMonth(bundle.transactions);

  const columns: Column[] = [
    { header: h.category, key: "category", width: 24 },
    ...months.map((m) => ({ header: m, key: m, width: 13, numFmt: MONEY })),
    { header: h.total, key: "__total", width: 15, numFmt: MONEY },
  ];

  const ws = table(wb, dict.xlsx.sheets.byCategory, columns);

  for (const entry of rows) {
    const values: Record<string, string | number | null> = { category: entry.category };
    for (const m of months) values[m] = entry.byMonth.get(m) ?? null;
    values.__total = entry.total;
    ws.addRow(values);
  }

  if (rows.length === 0) return;

  const totalRow: Record<string, string | number> = { category: dict.xlsx.headers.total };
  for (const m of months) {
    totalRow[m] = round2(rows.reduce((s, r) => s + (r.byMonth.get(m) ?? 0), 0));
  }
  totalRow.__total = round2(rows.reduce((s, r) => s + r.total, 0));

  const added = ws.addRow(totalRow);
  added.font = { bold: true };
  added.eachCell((cell) => {
    cell.border = { top: { style: "thin", color: { argb: "FFCFC8B8" } } };
  });

  band(ws, columns.length, 1);
}

// ------------------------------------------------------------ aggregates

interface MonthTotals {
  month: string;
  income: number;
  expenses: number;
  count: number;
}

/** Oldest month first — a time series reads left to right, top to bottom. */
function monthlyTotals(transactions: Transaction[]): MonthTotals[] {
  const map = new Map<string, MonthTotals>();

  for (const t of transactions) {
    const month = t.date.slice(0, 7);
    const entry = map.get(month) ?? { month, income: 0, expenses: 0, count: 0 };
    entry.count += 1;
    // Rule 10: a transfer moves money without earning or spending it, so it
    // is counted as a movement and nothing else.
    if (t.type === "Ingreso") entry.income += t.amount;
    else if (t.type === "Gasto") entry.expenses += t.amount;
    map.set(month, entry);
  }

  return Array.from(map.values())
    .map((m) => ({ ...m, income: round2(m.income), expenses: round2(m.expenses) }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

interface PivotRow {
  category: string;
  byMonth: Map<string, number>;
  total: number;
}

/** Spending only (rule 11), biggest category first. */
function spendingByCategoryAndMonth(transactions: Transaction[]): {
  months: string[];
  rows: PivotRow[];
} {
  const months = new Set<string>();
  const map = new Map<string, PivotRow>();

  for (const t of transactions) {
    if (t.type !== "Gasto") continue;
    const month = t.date.slice(0, 7);
    const category = t.category ?? UNCATEGORIZED;
    months.add(month);

    const row = map.get(category) ?? { category, byMonth: new Map(), total: 0 };
    row.byMonth.set(month, (row.byMonth.get(month) ?? 0) + t.amount);
    row.total += t.amount;
    map.set(category, row);
  }

  for (const row of map.values()) {
    row.total = round2(row.total);
    for (const [month, amount] of row.byMonth) row.byMonth.set(month, round2(amount));
  }

  return {
    months: Array.from(months).sort(),
    rows: Array.from(map.values()).sort((a, b) => b.total - a.total),
  };
}

// --------------------------------------------------------------- styling

/** A sheet that is one table: styled header, frozen, filterable. */
function table(wb: ExcelJS.Workbook, name: string, columns: Column[]): ExcelJS.Worksheet {
  const ws = wb.addWorksheet(name, {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  ws.columns = columns.map((c) => ({
    header: c.header,
    key: c.key,
    width: c.width,
    style: c.numFmt ? { numFmt: c.numFmt } : undefined,
  }));

  const header = ws.getRow(1);
  header.height = 22;
  header.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
  header.alignment = { vertical: "middle" };
  header.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: INK } };
  });

  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: columns.length },
  };

  return ws;
}

/**
 * Alternating row shading, applied once the rows exist. Excel's own banded
 * table styles need a table definition ExcelJS writes differently across
 * readers, so the fill goes on the cells directly.
 */
function band(ws: ExcelJS.Worksheet, columnCount: number, skipLast = 0): void {
  const last = ws.rowCount - skipLast;
  for (let r = 2; r <= last; r += 2) {
    const row = ws.getRow(r);
    for (let c = 1; c <= columnCount; c++) {
      row.getCell(c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: BAND } };
    }
  }
}

function sectionLabel(ws: ExcelJS.Worksheet, row: number, text: string): void {
  const cell = ws.getCell(row, 1);
  cell.value = text.toUpperCase();
  cell.font = { bold: true, size: 10, color: { argb: ACCENT } };
}

function meta(ws: ExcelJS.Worksheet, row: number, label: string, value: string): number {
  const key = ws.getCell(row, 1);
  key.value = label;
  key.font = { size: 11, color: { argb: "FF837C6F" } };

  const cell = ws.getCell(row, 2);
  cell.value = value;
  cell.font = { size: 11, color: { argb: INK } };
  ws.mergeCells(row, 2, row, 3);

  return row + 1;
}

/** A titled group of label/number pairs on the cover sheet. */
function block(
  ws: ExcelJS.Worksheet,
  row: number,
  title: string,
  entries: Array<[string, number] | [string, number, string]>
): number {
  sectionLabel(ws, row, title);
  let at = row + 1;

  for (const [label, value, numFmt] of entries) {
    const key = ws.getCell(at, 1);
    key.value = label;
    key.font = { size: 11, color: { argb: INK } };

    const cell = ws.getCell(at, 2);
    cell.value = value;
    cell.font = { size: 11, bold: true, color: { argb: INK } };
    cell.alignment = { horizontal: "left" };
    if (numFmt) cell.numFmt = numFmt;

    at += 1;
  }

  return at;
}

// ----------------------------------------------------------------- dates

const LOCALES: Record<Lang, string> = { es: "es-MX", en: "en-US" };

/** UTC throughout: stored dates are a wall clock pinned to it. */
function formatDay(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(LOCALES[lang], {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

/** The moment the file was built, which is a real instant, so local time. */
function formatStamp(at: Date, lang: Lang): string {
  return new Intl.DateTimeFormat(LOCALES[lang], {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(at);
}
