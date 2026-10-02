import type { Prisma } from "@prisma/client";

/**
 * Money is `numeric(14,2)` in the database, which Prisma hands back as a
 * `Decimal` object. Everything past the read — the finance rules, the wire,
 * the client — works in plain numbers, so each model crosses over here, once,
 * right where it is read.
 *
 * Doing arithmetic on a Decimal by accident is the failure this guards
 * against: `+` concatenates its string form, and `JSON.stringify` sends it as
 * a string. Two decimals of cents fit a double exactly enough for display and
 * sums at this scale, and the rounding to cents already happened in SQL.
 */
type Money = Prisma.Decimal | number;

export function toNumber(value: Money): number {
  return typeof value === "number" ? value : value.toNumber();
}

export function toNumberOrNull(value: Money | null): number | null {
  return value === null ? null : toNumber(value);
}

type WithAccountMoney = {
  initialBalance: Money;
  balanceAdjustment: Money;
  creditLimit: Money | null;
};

/** An `AccountConfig` row with its three money columns as numbers. */
export function mapAccountConfig<T extends WithAccountMoney>(
  row: T
): Omit<T, keyof WithAccountMoney> & { initialBalance: number; balanceAdjustment: number; creditLimit: number | null } {
  return {
    ...row,
    initialBalance: toNumber(row.initialBalance),
    balanceAdjustment: toNumber(row.balanceAdjustment),
    creditLimit: toNumberOrNull(row.creditLimit),
  };
}

/** A `BudgetConfig` row with its amount as a number. */
export function mapBudget<T extends { amount: Money }>(row: T): Omit<T, "amount"> & { amount: number } {
  return { ...row, amount: toNumber(row.amount) };
}
