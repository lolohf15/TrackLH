-- Credit accounts get an approved line, so the app can answer "how much can I
-- still spend on this card" instead of only "how much do I owe".
--
-- Nullable on purpose, with no default: every existing account starts without
-- a line on file and keeps behaving exactly as it did before. Adding a
-- nullable column with no default is a metadata-only change in Postgres — it
-- doesn't rewrite the table or hold a lock.
ALTER TABLE "AccountConfig" ADD COLUMN "creditLimit" DOUBLE PRECISION;
