-- Per-store: NEW workers must be paired with an experienced coworker.
ALTER TABLE "Store" ADD COLUMN "pairNewWorkers" BOOLEAN NOT NULL DEFAULT false;
