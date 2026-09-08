-- One-week availability override per employee.
CREATE TABLE "WeekAvailability" (
    "employeeId" INTEGER NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "windows" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WeekAvailability_pkey" PRIMARY KEY ("employeeId", "weekStart")
);

ALTER TABLE "WeekAvailability"
  ADD CONSTRAINT "WeekAvailability_employeeId_fkey"
  FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
