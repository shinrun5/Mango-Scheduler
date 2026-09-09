-- Per-weekday and per-date store hours.

CREATE TABLE "StoreHours" (
  "id" SERIAL NOT NULL,
  "storeId" INTEGER NOT NULL,
  "day" "DayOfWeek" NOT NULL,
  "closed" BOOLEAN NOT NULL DEFAULT false,
  "openTime" TEXT,
  "closeTime" TEXT,
  "nightStart" TEXT,
  CONSTRAINT "StoreHours_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "StoreHours_storeId_day_key" ON "StoreHours"("storeId", "day");
ALTER TABLE "StoreHours" ADD CONSTRAINT "StoreHours_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "StoreHoliday" (
  "id" SERIAL NOT NULL,
  "storeId" INTEGER NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "label" TEXT,
  "closed" BOOLEAN NOT NULL DEFAULT true,
  "openTime" TEXT,
  "closeTime" TEXT,
  "nightStart" TEXT,
  CONSTRAINT "StoreHoliday_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "StoreHoliday_storeId_date_key" ON "StoreHoliday"("storeId", "date");
CREATE INDEX "StoreHoliday_storeId_date_idx" ON "StoreHoliday"("storeId", "date");
ALTER TABLE "StoreHoliday" ADD CONSTRAINT "StoreHoliday_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
