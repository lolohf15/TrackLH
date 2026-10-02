-- Credit cards get a cycle: the cut-off day and the payment due day. Both
-- nullable with no default, so every existing account keeps computing the way
-- it did, and nothing that inserts into "AccountConfig" has to learn about them.
ALTER TABLE "AccountConfig"
  ADD COLUMN "statementDay" INTEGER,
  ADD COLUMN "dueDay" INTEGER,
  ADD CONSTRAINT "AccountConfig_statementDay_check" CHECK ("statementDay" BETWEEN 1 AND 31),
  ADD CONSTRAINT "AccountConfig_dueDay_check" CHECK ("dueDay" BETWEEN 1 AND 31);
