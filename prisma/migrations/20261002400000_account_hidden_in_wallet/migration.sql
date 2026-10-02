-- Accounts can be left out of the Wallet to keep it uncluttered. Defaults to
-- false, so every existing account stays visible and inserts that don't know
-- about it keep working.
ALTER TABLE "AccountConfig" ADD COLUMN "hiddenInWallet" BOOLEAN NOT NULL DEFAULT false;
