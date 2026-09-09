-- Employees keep seeing the last posted schedule while a new week is drafted.
ALTER TABLE "Schedule" ADD COLUMN "postedSnapshotId" INTEGER;
