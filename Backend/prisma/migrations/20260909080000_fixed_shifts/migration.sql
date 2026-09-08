-- Standing weekly assignment: an employee always works this store/day/window.
CREATE TABLE "FixedShift" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "storeId" INTEGER NOT NULL,
    "day" "DayOfWeek" NOT NULL,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FixedShift_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "FixedShift_storeId_idx" ON "FixedShift"("storeId");
CREATE UNIQUE INDEX "FixedShift_employeeId_storeId_day_start_end_key"
  ON "FixedShift"("employeeId", "storeId", "day", "start", "end");
ALTER TABLE "FixedShift" ADD CONSTRAINT "FixedShift_employeeId_fkey"
  FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FixedShift" ADD CONSTRAINT "FixedShift_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
