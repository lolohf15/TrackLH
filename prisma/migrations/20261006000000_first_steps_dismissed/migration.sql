-- The "Primeros pasos" card on Inicio. Nullable, so the iOS shortcut and every
-- existing insert are unaffected.
ALTER TABLE "User" ADD COLUMN "firstStepsDismissedAt" TIMESTAMP(3);

-- Everyone already using the app has set things up their own way: they never
-- see the card. Only accounts that finish the new welcome from now on do.
UPDATE "User" SET "firstStepsDismissedAt" = CURRENT_TIMESTAMP WHERE "onboardedAt" IS NOT NULL;
