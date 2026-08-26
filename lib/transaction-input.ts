import { prisma } from "@/lib/prisma";
import { isValidTransactionType, type TransactionType } from "@/types";

/** "2026-08-25T09:33:39" — a local wall clock, no zone. Seconds optional. */
const LOCAL_DATETIME_RE = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/;

/**
 * Rows carry a local wall clock, matching what the iOS shortcut writes. The
 * column is `timestamp without time zone`, so we pin the parsed parts to UTC
 * to store the clock the user actually saw rather than shifting it by the
 * server's zone.
 */
export function parseLocalDateTime(value: string): Date | null {
  const m = LOCAL_DATETIME_RE.exec(value);
  if (!m) return null;
  const [, y, mo, d, h, min, s] = m;
  const date = new Date(Date.UTC(+y, +mo - 1, +d, +h, +min, s ? +s : 0));
  // Reject overflow like 2026-02-31, which Date.UTC would silently roll over.
  if (date.getUTCMonth() !== +mo - 1 || date.getUTCDate() !== +d) return null;
  return date;
}

export interface CleanTransaction {
  date: Date;
  amount: number;
  type: TransactionType;
  category: string | null;
  account: string;
  toAccount: string | null;
  description: string | null;
}

type Result =
  | { ok: true; data: CleanTransaction }
  | { ok: false; error: string; status: number };

/**
 * The single gate every write goes through, so creating and editing can never
 * disagree about what a valid movement is.
 */
export async function validateTransactionInput(
  userId: string,
  body: Record<string, unknown>
): Promise<Result> {
  const { type, account, toAccount, category, amount, date, description } = body;

  if (typeof type !== "string" || !isValidTransactionType(type)) {
    return { ok: false, error: "Tipo de movimiento inválido", status: 400 };
  }

  // Accounts are per-user rows, so the valid set comes from the database —
  // the same source the form reads its options from.
  const ownAccounts = new Set(
    (
      await prisma.accountConfig.findMany({
        where: { userId },
        select: { account: true },
      })
    ).map((a) => a.account)
  );

  if (typeof account !== "string" || !ownAccounts.has(account)) {
    return { ok: false, error: "Cuenta inválida", status: 400 };
  }

  const parsedAmount = Number(amount);
  if (!isFinite(parsedAmount) || parsedAmount <= 0) {
    return { ok: false, error: "El monto debe ser mayor a 0", status: 400 };
  }

  const when = typeof date === "string" ? parseLocalDateTime(date) : null;
  if (!when) {
    return { ok: false, error: "Fecha inválida", status: 400 };
  }

  let resolvedToAccount: string | null = null;
  let resolvedCategory: string | null = null;

  if (type === "Transferencia") {
    if (typeof toAccount !== "string" || !ownAccounts.has(toAccount)) {
      return { ok: false, error: "Cuenta destino inválida", status: 400 };
    }
    if (toAccount === account) {
      return {
        ok: false,
        error: "La cuenta destino debe ser distinta a la de origen",
        status: 400,
      };
    }
    resolvedToAccount = toAccount;
  } else {
    if (typeof category !== "string" || category.trim() === "") {
      return { ok: false, error: "La categoría es obligatoria", status: 400 };
    }
    resolvedCategory = category.trim();
  }

  return {
    ok: true,
    data: {
      date: when,
      amount: Math.round(parsedAmount * 100) / 100, // rule 12
      type,
      category: resolvedCategory,
      account,
      toAccount: resolvedToAccount,
      description:
        typeof description === "string" && description.trim() !== ""
          ? description.trim()
          : null,
    },
  };
}
