-- Reconciling a statement against the ledger. One batch per file the user
-- accepts, so an import that mapped a column wrong is undone by deleting its
-- rows rather than hunting them down one at a time.
--
-- There is deliberately no "source" column: `importId IS NOT NULL` already
-- says a row came from a statement, and tagging the rows that predate this
-- migration as shortcut or manual would be a guess written into the data.
CREATE TABLE "ImportBatch" (
  "id"          TEXT NOT NULL,
  "userId"      TEXT NOT NULL,
  "account"     TEXT NOT NULL,
  "fileName"    TEXT NOT NULL,
  "rowsCreated" INTEGER NOT NULL DEFAULT 0,
  "rowsMatched" INTEGER NOT NULL DEFAULT 0,
  "periodFrom"  TIMESTAMP(3),
  "periodTo"    TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ImportBatch_userId_idx" ON "ImportBatch"("userId");

ALTER TABLE "ImportBatch"
  ADD CONSTRAINT "ImportBatch_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Nullable with no default: every row that already exists keeps behaving
-- exactly as it did, and the change is metadata-only in Postgres.
ALTER TABLE "Transaction" ADD COLUMN "importId" TEXT;
CREATE INDEX "Transaction_importId_idx" ON "Transaction"("importId");

-- SET NULL rather than CASCADE: undoing an import deletes its movements on
-- purpose and in order. If a batch ever disappears some other way, the
-- movements it created are the user's own records and outlive it.
ALTER TABLE "Transaction"
  ADD CONSTRAINT "Transaction_importId_fkey"
  FOREIGN KEY ("importId") REFERENCES "ImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
