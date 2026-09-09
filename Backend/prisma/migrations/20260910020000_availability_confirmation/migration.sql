-- "I've checked my availability for this week" markers.
CREATE TABLE "AvailabilityConfirmation" (
  "employeeId" INTEGER NOT NULL,
  "weekStart" TIMESTAMP(3) NOT NULL,
  "confirmedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AvailabilityConfirmation_pkey" PRIMARY KEY ("employeeId", "weekStart")
);
ALTER TABLE "AvailabilityConfirmation" ADD CONSTRAINT "AvailabilityConfirmation_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
