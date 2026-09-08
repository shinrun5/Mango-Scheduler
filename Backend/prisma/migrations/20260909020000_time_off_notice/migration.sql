-- Time off is a notice, not an approval workflow: drop status/resolved, add cancel + ack.
DROP INDEX IF EXISTS "TimeOffRequest_employeeId_status_idx";
ALTER TABLE "TimeOffRequest"
  DROP COLUMN "status",
  DROP COLUMN "resolvedAt",
  DROP COLUMN "resolvedById",
  ADD COLUMN "cancelledAt" TIMESTAMP(3),
  ADD COLUMN "acknowledgedAt" TIMESTAMP(3),
  ADD COLUMN "acknowledgedById" INTEGER;
DROP TYPE IF EXISTS "TimeOffStatus";
CREATE INDEX "TimeOffRequest_employeeId_idx" ON "TimeOffRequest"("employeeId");
