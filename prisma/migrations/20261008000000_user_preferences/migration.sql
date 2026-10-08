-- Profile and preferences (session 11). Every column is nullable and nothing
-- is backfilled: null means "the app's default", so existing users see no
-- change until they pick something.
ALTER TABLE "User"
  ADD COLUMN "avatarEmoji"     TEXT,
  ADD COLUMN "avatarColor"     TEXT,
  ADD COLUMN "defaultAccount"  TEXT,
  ADD COLUMN "defaultType"     TEXT,
  ADD COLUMN "weekStart"       INTEGER,
  ADD COLUMN "analyticsPeriod" TEXT,
  ADD COLUMN "theme"           TEXT,
  ADD COLUMN "language"        TEXT;
