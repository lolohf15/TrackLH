-- Accounts that aren't cards: cash, or anything else (savings, investments).
-- Nullable with no default, so every existing account stays a card and keeps
-- computing the way it did; nothing that inserts here has to learn about it.
ALTER TABLE "AccountConfig"
  ADD COLUMN "kind" TEXT,
  ADD CONSTRAINT "AccountConfig_kind_check" CHECK ("kind" IN ('cash', 'other'));
