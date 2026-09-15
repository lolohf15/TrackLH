import { round2 } from "@/services/finance";

/**
 * A blank field clears the line rather than erroring — "I don't track a limit
 * on this card" is a real answer. Only a credit account can carry one, so
 * flipping an account to debit drops whatever limit it had.
 */
export function parseCreditLimit(raw: unknown, isCredit: boolean): number | null {
  if (!isCredit) return null;
  if (raw === null || raw === undefined || raw === "") return null;
  const n = Number(raw);
  return isFinite(n) && n > 0 ? round2(n) : null;
}
