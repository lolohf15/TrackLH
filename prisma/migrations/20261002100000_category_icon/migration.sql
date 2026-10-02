-- Categories get an optional icon key. Nullable with no default: every
-- existing row keeps rendering (as its first letter) until the backfill
-- script or the user picks one, and nothing that inserts into "Category"
-- has to learn about it.
ALTER TABLE "Category" ADD COLUMN "icon" TEXT;
