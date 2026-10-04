-- Recurring movements. A rule never posts on its own: each occurrence waits
-- for a Confirm, which creates an ordinary "Transaction" row linked back to it.
CREATE TABLE "RecurringRule" (
  "id"          TEXT NOT NULL,
  "userId"      TEXT NOT NULL,
  "type"        TEXT NOT NULL,
  "amount"      DECIMAL(14,2) NOT NULL,
  "account"     TEXT NOT NULL,
  "toAccount"   TEXT,
  "category"    TEXT,
  "description" TEXT,
  "frequency"   TEXT NOT NULL,
  "interval"    INTEGER NOT NULL DEFAULT 1,
  "anchorDate"  TIMESTAMP(3) NOT NULL,
  "dayOfMonth"  INTEGER,
  "nextDueDate" TIMESTAMP(3) NOT NULL,
  "endDate"     TIMESTAMP(3),
  "active"      BOOLEAN NOT NULL DEFAULT true,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RecurringRule_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RecurringRule_type_check" CHECK ("type" IN ('Gasto', 'Ingreso', 'Transferencia')),
  CONSTRAINT "RecurringRule_frequency_check" CHECK ("frequency" IN ('weekly', 'monthly', 'yearly')),
  CONSTRAINT "RecurringRule_interval_check" CHECK ("interval" BETWEEN 1 AND 52),
  CONSTRAINT "RecurringRule_dayOfMonth_check" CHECK ("dayOfMonth" BETWEEN 1 AND 31),
  CONSTRAINT "RecurringRule_amount_check" CHECK ("amount" > 0)
);

CREATE INDEX "RecurringRule_userId_idx" ON "RecurringRule"("userId");

ALTER TABLE "RecurringRule" ADD CONSTRAINT "RecurringRule_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- The link from a movement back to its rule. Both nullable with no default:
-- the iOS shortcut inserts without knowing they exist, and every row it has
-- ever written stays valid.
ALTER TABLE "Transaction"
  ADD COLUMN "recurringRuleId" TEXT,
  ADD COLUMN "occurrenceDate"  TIMESTAMP(3);

-- One movement per occurrence. Postgres treats NULLs as distinct, so the
-- unique index leaves every hand-logged and shortcut row alone.
CREATE UNIQUE INDEX "Transaction_recurringRuleId_occurrenceDate_key"
  ON "Transaction"("recurringRuleId", "occurrenceDate");

-- Deleting a rule keeps what it already logged; the movements just lose the link.
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_recurringRuleId_fkey"
  FOREIGN KEY ("recurringRuleId") REFERENCES "RecurringRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
