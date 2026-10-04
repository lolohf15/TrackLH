import { Prisma } from "@prisma/client";

/**
 * A date as a bare wall-clock literal. Transaction dates are `timestamp
 * without time zone` holding the clock the person saw, pinned to UTC (see
 * `lib/transaction-input.ts`), so a bound has to be compared the same way.
 */
export function ts(d: Date): Prisma.Sql {
  return Prisma.sql`${d.toISOString().slice(0, 19)}::timestamp`;
}
