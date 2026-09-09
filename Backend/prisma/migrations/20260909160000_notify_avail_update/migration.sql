-- Manager opt-in: notify me when a worker updates a future week's availability.
ALTER TABLE "User" ADD COLUMN "notifyOnAvailabilityUpdate" BOOLEAN NOT NULL DEFAULT false;
