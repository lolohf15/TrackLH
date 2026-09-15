import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getAccountSums } from "@/lib/account-sums";
import { parseLocalDateTime } from "@/lib/transaction-input";
import { computeAccountBalancesFromSums, round2 } from "@/services/finance";
import {
  defaultTypeFor,
  reconcile,
  signedForAccount,
  suggestCategories,
  type LedgerMovement,
} from "@/services/statement-match";
import type { StatementRow } from "@/services/statement-parse";
import { isValidTransactionType, type TransactionType } from "@/types";

/**
 * The database side of reconciling a statement: pulling the movements worth
 * comparing against, and writing the ones the reader accepted.
 *
 * The comparison itself is in `services/statement-match.ts` and knows nothing
 * about Prisma, which is what makes it testable against the awkward cases.
 */

/** Slack on each end of the statement's span, since posting lags spending. */
const WINDOW_DAYS = 6;

/** How far back category suggestions look. Plenty, and bounded. */
const HISTORY_LIMIT = 2000;

export interface ReconcileResult {
  account: { name: string; isCredit: boolean };
  matched: Array<{
    line: number;
    date: string;
    description: string;
    signedAmount: number;
    ledgerId: string;
    ledgerDate: string;
    ledgerDescription: string;
    dayGap: number;
  }>;
  missing: Array<{
    line: number;
    date: string;
    description: string;
    signedAmount: number;
    suggestedType: TransactionType;
    suggestedCategory: string | null;
  }>;
  extra: Array<{
    id: string;
    date: string;
    description: string;
    signedAmount: number;
    type: TransactionType;
  }>;
  /** What the ledger says the account is worth right now. */
  currentBalance: number;
}

export async function reconcileAgainstLedger(
  userId: string,
  accountName: string,
  rows: StatementRow[]
): Promise<ReconcileResult | null> {
  const config = await prisma.accountConfig.findUnique({
    where: { userId_account: { userId, account: accountName } },
  });
  if (!config) return null;

  const dates = rows.map((r) => r.date).sort();
  const first = dates[0] ?? null;
  const last = dates[dates.length - 1] ?? null;

  const [ledgerRows, history, sums, configs] = await Promise.all([
    first && last
      ? prisma.transaction.findMany({
          where: {
            userId,
            date: { gte: shift(first, -WINDOW_DAYS), lt: shift(last, WINDOW_DAYS + 1) },
            // A transfer touches the account from either side: a card payment
            // is an abono on the card's statement and names it as `toAccount`.
            OR: [{ account: accountName }, { toAccount: accountName }],
          },
          orderBy: { date: "desc" },
        })
      : Promise.resolve([]),
    prisma.transaction.findMany({
      where: { userId, category: { not: null }, description: { not: null } },
      select: { description: true, category: true },
      orderBy: { date: "desc" },
      take: HISTORY_LIMIT,
    }),
    getAccountSums(userId),
    prisma.accountConfig.findMany({ where: { userId } }),
  ]);

  const ledger: LedgerMovement[] = [];
  for (const row of ledgerRows) {
    const signed = signedForAccount(
      { amount: row.amount, type: row.type as TransactionType, account: row.account, toAccount: row.toAccount },
      accountName
    );
    if (signed === null) continue;

    ledger.push({
      id: row.id,
      date: row.date.toISOString(),
      signedAmount: signed,
      description: row.description ?? "",
      type: row.type as TransactionType,
      category: row.category,
      counterparty: row.account === accountName ? row.toAccount : row.account,
    });
  }

  const result = reconcile(rows, ledger);
  const suggestions = suggestCategories(
    result.missing,
    // `not: null` filters the rows but doesn't narrow the type Prisma infers.
    history.map((h) => ({ description: h.description ?? "", category: h.category }))
  );

  const balance = computeAccountBalancesFromSums(sums, configs).find(
    (b) => b.account === accountName
  );

  return {
    account: { name: accountName, isCredit: config.isCredit },
    matched: result.matched.map((m) => ({
      line: m.statement.line,
      date: m.statement.date,
      description: m.statement.description,
      signedAmount: m.statement.signedAmount,
      ledgerId: m.ledger.id,
      ledgerDate: m.ledger.date,
      ledgerDescription: m.ledger.description,
      dayGap: m.dayGap,
    })),
    missing: result.missing.map((row, index) => ({
      line: row.line,
      date: row.date,
      description: row.description,
      signedAmount: row.signedAmount,
      suggestedType: defaultTypeFor(row.signedAmount, config.isCredit),
      suggestedCategory: suggestions.get(index) ?? null,
    })),
    extra: result.extra.map((m) => ({
      id: m.id,
      date: m.date,
      description: m.description,
      signedAmount: m.signedAmount,
      type: m.type,
    })),
    currentBalance: balance?.currentBalance ?? 0,
  };
}

function shift(day: string, days: number): Date {
  const at = new Date(`${day}T00:00:00Z`);
  at.setUTCDate(at.getUTCDate() + days);
  return at;
}

// ----------------------------------------------------------------- commit

export interface CommitRow {
  date: string;
  /**
   * Signed the way the reconciled account saw it, exactly as the statement
   * had it. The stored amount is its magnitude; the sign is what says which
   * way a transfer ran, and it is not recoverable from the magnitude alone.
   */
  signedAmount: number;
  type: TransactionType;
  category?: string | null;
  /** The other account, required when the row is a transfer. */
  counterparty?: string | null;
  description?: string | null;
}

export interface CommitInput {
  account: string;
  fileName: string;
  rows: CommitRow[];
  rowsMatched?: number;
  periodFrom?: string | null;
  periodTo?: string | null;
  /** Debit accounts only: cuadra the account against the statement's close. */
  closingBalance?: number | null;
}

type CommitResult =
  | { ok: true; importId: string; created: number }
  | { ok: false; error: "account" | "row"; line: number | null };

/**
 * Writes an accepted reconciliation.
 *
 * Everything is re-checked here rather than trusted from the review screen:
 * the rows travel through the browser between preview and commit, and the
 * account and category names they carry have to be this user's own.
 *
 * Categories are allowed to be null, which `validateTransactionInput` refuses
 * for a typed-in movement. The column has always been nullable and the charts
 * already file those rows under "Sin categoría" — forcing a choice on three
 * hundred backfilled rows would be the wrong trade at the wrong moment.
 */
export async function commitImport(
  userId: string,
  input: CommitInput
): Promise<CommitResult> {
  const [accounts, categories] = await Promise.all([
    prisma.accountConfig.findMany({ where: { userId }, select: { account: true, isCredit: true } }),
    prisma.category.findMany({ where: { userId }, select: { name: true } }),
  ]);

  const names = new Set(accounts.map((a) => a.account));
  const known = new Set(categories.map((c) => c.name));
  const target = accounts.find((a) => a.account === input.account);
  if (!target) return { ok: false, error: "account", line: null };

  const ids = new Set<string>();
  const data: Array<{
    id: string;
    userId: string;
    date: Date;
    amount: number;
    type: string;
    category: string | null;
    account: string;
    toAccount: string | null;
    description: string | null;
    procesado: boolean;
  }> = [];

  for (const [index, row] of input.rows.entries()) {
    const when = parseLocalDateTime(`${row.date}T12:00:00`);
    const signed = Number(row.signedAmount);
    const amount = round2(Math.abs(signed));

    if (!when || !isFinite(signed) || amount <= 0 || !isValidTransactionType(row.type)) {
      return { ok: false, error: "row", line: index };
    }

    // Money that left the account cannot be income, and money that arrived
    // cannot be spending. The review screen never offers either, so a row
    // that says otherwise was rewritten on the way here.
    const arriving = signed > 0;
    if (row.type === (arriving ? "Gasto" : "Ingreso")) {
      return { ok: false, error: "row", line: index };
    }

    let account = input.account;
    let toAccount: string | null = null;
    let category: string | null = null;

    if (row.type === "Transferencia") {
      const other = typeof row.counterparty === "string" ? row.counterparty : "";
      if (!names.has(other) || other === input.account) {
        return { ok: false, error: "row", line: index };
      }
      // Direction follows the sign the statement showed: money leaving the
      // reconciled account makes it the source, money arriving makes it the
      // destination and the counterparty the source.
      if (arriving) {
        account = other;
        toAccount = input.account;
      } else {
        toAccount = other;
      }
    } else if (typeof row.category === "string" && row.category.trim() !== "") {
      const trimmed = row.category.trim();
      if (!known.has(trimmed)) return { ok: false, error: "row", line: index };
      category = trimmed;
    }

    data.push({
      id: uniqueId(when, ids),
      userId,
      date: when,
      amount,
      type: row.type,
      category,
      account,
      toAccount,
      description:
        typeof row.description === "string" && row.description.trim() !== ""
          ? row.description.trim().slice(0, 200)
          : null,
      procesado: false,
    });
  }

  const created = await prisma.$transaction(async (tx) => {
    const batch = await tx.importBatch.create({
      data: {
        userId,
        account: input.account,
        fileName: input.fileName.slice(0, 200),
        rowsCreated: data.length,
        rowsMatched: Math.max(0, Math.trunc(input.rowsMatched ?? 0)),
        periodFrom: input.periodFrom ? new Date(`${input.periodFrom}T00:00:00Z`) : null,
        periodTo: input.periodTo ? new Date(`${input.periodTo}T00:00:00Z`) : null,
      },
    });

    if (data.length > 0) {
      await tx.transaction.createMany({
        data: data.map((row) => ({ ...row, importId: batch.id })),
      });
    }

    return batch.id;
  });

  // Cuadrar happens after the rows exist, so the gap it records is whatever
  // the new movements could not explain. Credit accounts sit this out: their
  // statements quote a debt, which is the mirror of the balance stored here.
  if (input.closingBalance !== null && input.closingBalance !== undefined && !target.isCredit) {
    await applyClosingBalance(userId, input.account, input.closingBalance);
  }

  return { ok: true, importId: created, created: data.length };
}

/**
 * The same arithmetic `PUT /api/accounts` does for "my real balance is X":
 * whatever the movements cannot account for is stored as the adjustment.
 */
async function applyClosingBalance(
  userId: string,
  account: string,
  closingBalance: number
): Promise<void> {
  const [sums, configs] = await Promise.all([
    getAccountSums(userId),
    prisma.accountConfig.findMany({ where: { userId } }),
  ]);

  const calculated =
    computeAccountBalancesFromSums(sums, configs).find((b) => b.account === account)
      ?.calculatedBalance ?? 0;

  await prisma.accountConfig.update({
    where: { userId_account: { userId, account } },
    data: {
      balanceAdjustment: round2(closingBalance - calculated),
      adjustmentDate: new Date(),
    },
  });
}

/**
 * The shortcut's id shape, with a wider random tail.
 *
 * Imported rows all land at midday on their own date, so a month of one
 * statement shares very few distinct stamps — a four-digit suffix would
 * collide inside a single batch often enough to matter.
 */
function uniqueId(at: Date, taken: Set<string>): string {
  const p = (n: number) => String(n).padStart(2, "0");
  const stamp =
    `${at.getUTCFullYear()}-${p(at.getUTCMonth() + 1)}-${p(at.getUTCDate())}` +
    `-${p(at.getUTCHours())}-${p(at.getUTCMinutes())}${p(at.getUTCSeconds())}`;

  for (;;) {
    const id = `${stamp} - ${randomUUID().slice(0, 8)}`;
    if (!taken.has(id)) {
      taken.add(id);
      return id;
    }
  }
}
