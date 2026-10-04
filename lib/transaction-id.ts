import { Prisma } from "@prisma/client";

/**
 * Same id shape the shortcut generates: `2026-08-25-09-3339 - 5803`. The
 * random suffix can collide within the same second, and the id space is
 * shared across users, so whoever creates a row retries on a collision.
 */
export function buildTransactionId(at: Date): string {
  const p = (n: number, len = 2) => String(n).padStart(len, "0");
  const stamp =
    `${at.getUTCFullYear()}-${p(at.getUTCMonth() + 1)}-${p(at.getUTCDate())}` +
    `-${p(at.getUTCHours())}-${p(at.getUTCMinutes())}${p(at.getUTCSeconds())}`;
  return `${stamp} - ${p(Math.floor(Math.random() * 10000), 4)}`;
}

/**
 * A unique-constraint failure, optionally on a particular column. Prisma
 * reports the columns of the index that refused the row, so an id collision
 * and a second confirm of the same occurrence can be told apart.
 */
export function isUniqueViolation(err: unknown, column?: string): boolean {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== "P2002") return false;
  if (!column) return true;
  const target = err.meta?.target;
  return Array.isArray(target) ? target.includes(column) : String(target ?? "").includes(column);
}
