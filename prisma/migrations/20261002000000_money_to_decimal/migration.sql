-- Money moves from double precision to numeric(14,2): exact cents instead of
-- binary fractions, rounded once here rather than on every read.
--
-- Defaults stay 0 and nothing new becomes required, so the iOS shortcut keeps
-- inserting exactly as before: a JSON number cast to numeric on the way in,
-- and "userId" still filled by its own default.
--
-- Changing a column's type rewrites the table under an exclusive lock. At a
-- few hundred rows that lasts well under a second. Prisma runs each migration
-- in a transaction, so a failure leaves every column as it was.
ALTER TABLE "Transaction"
  ALTER COLUMN "amount" TYPE numeric(14,2) USING round("amount"::numeric, 2);

ALTER TABLE "AccountConfig"
  ALTER COLUMN "initialBalance"    TYPE numeric(14,2) USING round("initialBalance"::numeric, 2),
  ALTER COLUMN "balanceAdjustment" TYPE numeric(14,2) USING round("balanceAdjustment"::numeric, 2),
  ALTER COLUMN "creditLimit"       TYPE numeric(14,2) USING round("creditLimit"::numeric, 2);

ALTER TABLE "BudgetConfig"
  ALTER COLUMN "amount" TYPE numeric(14,2) USING round("amount"::numeric, 2);
