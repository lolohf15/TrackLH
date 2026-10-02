import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/money";
import { round2 } from "@/services/finance";
import { computeCycleInfo, getCycle, type CreditCycleInfo } from "@/services/credit-cycle";

export interface CreditCard {
  account: string;
  statementDay: number;
  dueDay: number | null;
  initialBalance: number;
  balanceAdjustment: number;
}

export interface CreditCardStatus extends CreditCycleInfo {
  /** Where the last payment to this card came from, to prefill the next one. */
  lastPaymentFrom: string | null;
}

/** The column is `timestamp without time zone`; compare it to a bare wall clock. */
function ts(d: Date): Prisma.Sql {
  return Prisma.sql`${d.toISOString().slice(0, 19)}::timestamp`;
}

type Row = {
  expenses_before: Prisma.Decimal | null;
  out_before: Prisma.Decimal | null;
  in_before: Prisma.Decimal | null;
  in_after: Prisma.Decimal | null;
  open_spend: Prisma.Decimal | null;
  last_payer: string | null;
};

/**
 * The cycle figures for every card with a cut day, one aggregate query per
 * card, summed in SQL the way `lib/account-sums.ts` does for balances. Cards
 * have different cut days, so they can't share one set of bounds.
 *
 * The balance adjustment counts from the start of history: it corrects
 * movements nobody logged, and there's no telling when they happened.
 */
export async function getCreditCardStatus(
  userId: string,
  cards: CreditCard[],
  today: Date
): Promise<Map<string, CreditCardStatus>> {
  const results = await Promise.all(
    cards.map(async (card) => {
      const { open, closed } = getCycle(card.statementDay, today);
      const cut = closed.end;
      const [row] = await prisma.$queryRaw<Row[]>`
        SELECT
          SUM(amount) FILTER (WHERE type = 'Gasto' AND account = ${card.account} AND date < ${ts(cut)}) AS expenses_before,
          SUM(amount) FILTER (WHERE type = 'Transferencia' AND account = ${card.account} AND date < ${ts(cut)}) AS out_before,
          SUM(amount) FILTER (WHERE type = 'Transferencia' AND "toAccount" = ${card.account} AND date < ${ts(cut)}) AS in_before,
          SUM(amount) FILTER (WHERE type = 'Transferencia' AND "toAccount" = ${card.account} AND date >= ${ts(cut)}) AS in_after,
          SUM(amount) FILTER (WHERE type = 'Gasto' AND account = ${card.account} AND date >= ${ts(open.start)} AND date < ${ts(open.end)}) AS open_spend,
          (SELECT t2.account FROM "Transaction" t2
            WHERE t2."userId" = ${userId} AND t2.type = 'Transferencia' AND t2."toAccount" = ${card.account}
            ORDER BY t2.date DESC LIMIT 1) AS last_payer
        FROM "Transaction"
        WHERE "userId" = ${userId} AND (account = ${card.account} OR "toAccount" = ${card.account})
      `;
      const n = (v: Prisma.Decimal | null | undefined) => round2(toNumber(v ?? 0));

      const balanceAtCut = round2(
        card.initialBalance + card.balanceAdjustment
        - n(row?.expenses_before) + n(row?.in_before) - n(row?.out_before)
      );
      const info = computeCycleInfo(card.statementDay, card.dueDay, today, {
        balanceAtCut,
        paidSinceStatement: n(row?.in_after),
        currentCycleSpend: n(row?.open_spend),
      });
      return [card.account, { ...info, lastPaymentFrom: row?.last_payer ?? null }] as const;
    })
  );
  return new Map(results);
}
