-- 1. New tables ------------------------------------------------------------
CREATE TABLE "User" (
  "id"           TEXT NOT NULL,
  "email"        TEXT NOT NULL,
  "name"         TEXT,
  "passwordHash" TEXT,
  "onboardedAt"  TIMESTAMP(3),
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE TABLE "Category" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "name"      TEXT NOT NULL,
  "color"     TEXT NOT NULL,
  "kind"      TEXT NOT NULL DEFAULT 'expense',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Category_userId_kind_name_key" ON "Category"("userId", "kind", "name");
CREATE INDEX "Category_userId_idx" ON "Category"("userId");

-- 2. The owner. Already has data, so the wizard is marked done. ------------
INSERT INTO "User" ("id", "email", "name", "onboardedAt")
VALUES ('usr_owner_lorenzo', 'lolohf15@gmail.com', 'Lorenzo', CURRENT_TIMESTAMP);

-- 3. Tenant columns, nullable first so existing rows survive the add -------
ALTER TABLE "Transaction"   ADD COLUMN "userId" TEXT;
ALTER TABLE "AccountConfig" ADD COLUMN "userId" TEXT;
ALTER TABLE "BudgetConfig"  ADD COLUMN "userId" TEXT;

-- 4. Backfill every existing row to the owner -----------------------------
UPDATE "Transaction"   SET "userId" = 'usr_owner_lorenzo' WHERE "userId" IS NULL;
UPDATE "AccountConfig" SET "userId" = 'usr_owner_lorenzo' WHERE "userId" IS NULL;
UPDATE "BudgetConfig"  SET "userId" = 'usr_owner_lorenzo' WHERE "userId" IS NULL;

-- 5. Lock the columns down. The DEFAULT on Transaction is what keeps the
--    iOS shortcut writing successfully without a user context. ------------
ALTER TABLE "Transaction"   ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "Transaction"   ALTER COLUMN "userId" SET DEFAULT 'usr_owner_lorenzo';
ALTER TABLE "AccountConfig" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "BudgetConfig"  ALTER COLUMN "userId" SET NOT NULL;

ALTER TABLE "Transaction"   ADD CONSTRAINT "Transaction_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AccountConfig" ADD CONSTRAINT "AccountConfig_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BudgetConfig"  ADD CONSTRAINT "BudgetConfig_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Category"      ADD CONSTRAINT "Category_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 6. Names are only unique within a tenant now ----------------------------
DROP INDEX "AccountConfig_account_key";
CREATE UNIQUE INDEX "AccountConfig_userId_account_key" ON "AccountConfig"("userId", "account");
DROP INDEX "BudgetConfig_category_key";
CREATE UNIQUE INDEX "BudgetConfig_userId_category_key" ON "BudgetConfig"("userId", "category");

CREATE INDEX "Transaction_userId_idx"        ON "Transaction"("userId");
CREATE INDEX "Transaction_userId_date_idx"   ON "Transaction"("userId", "date");
CREATE INDEX "AccountConfig_userId_idx"      ON "AccountConfig"("userId");
CREATE INDEX "BudgetConfig_userId_idx"       ON "BudgetConfig"("userId");

-- 7. Give the owner the categories that were hardcoded constants ----------
INSERT INTO "Category" ("id", "userId", "name", "color", "kind", "sortOrder") VALUES
  ('cat_owner_gas',        'usr_owner_lorenzo', 'Gas',        '#8b5cd9', 'expense', 0),
  ('cat_owner_regalos',    'usr_owner_lorenzo', 'Regalos',    '#c2547a', 'expense', 1),
  ('cat_owner_salidas',    'usr_owner_lorenzo', 'Salidas',    '#d2452e', 'expense', 2),
  ('cat_owner_alimentos',  'usr_owner_lorenzo', 'Alimentos',  '#e0703a', 'expense', 3),
  ('cat_owner_servicios',  'usr_owner_lorenzo', 'Servicios',  '#3a8f95', 'expense', 4),
  ('cat_owner_esenciales', 'usr_owner_lorenzo', 'Esenciales', '#4f9d5f', 'expense', 5),
  ('cat_owner_gustos',     'usr_owner_lorenzo', 'Gustos',     '#d99a15', 'expense', 6),
  ('cat_owner_otro',       'usr_owner_lorenzo', 'Otro',       '#6b7075', 'expense', 7),
  ('cat_owner_dinero_mes', 'usr_owner_lorenzo', 'Dinero Mes', '#22a355', 'income',  0),
  ('cat_owner_extra_cash', 'usr_owner_lorenzo', 'Extra Cash', '#4f9d5f', 'income',  1),
  ('cat_owner_otro_in',    'usr_owner_lorenzo', 'Otro',       '#6b7075', 'income',  2);
