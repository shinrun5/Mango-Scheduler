-- Employee "no back-to-back days" scheduling preference.
ALTER TABLE "Employee" ADD COLUMN "noConsecutiveDays" BOOLEAN NOT NULL DEFAULT false;
