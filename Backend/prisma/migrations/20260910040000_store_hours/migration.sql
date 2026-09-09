-- Explicit store hours for the availability editor defaults.
ALTER TABLE "Store" ADD COLUMN "openTime" TEXT;
ALTER TABLE "Store" ADD COLUMN "closeTime" TEXT;
ALTER TABLE "Store" ADD COLUMN "nightStart" TEXT;
