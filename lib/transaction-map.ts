import type { Transaction } from "@/types";

type TransactionRow = {
  id: string;
  date: Date;
  amount: number;
  type: string;
  category: string | null;
  account: string;
  toAccount: string | null;
  description: string | null;
  notes: string | null;
  procesado: boolean;
  syncedAt: Date;
};

/** The one place a Prisma `Transaction` row turns into the wire shape. */
export function mapTransaction(t: TransactionRow): Transaction {
  return {
    id: t.id,
    date: t.date.toISOString(),
    amount: t.amount,
    type: t.type as Transaction["type"],
    category: t.category,
    account: t.account,
    toAccount: t.toAccount,
    description: t.description,
    notes: t.notes,
    procesado: t.procesado,
    syncedAt: t.syncedAt.toISOString(),
  };
}
