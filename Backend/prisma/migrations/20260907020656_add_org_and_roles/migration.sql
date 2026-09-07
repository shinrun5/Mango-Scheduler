-- Role gains OWNER (added but not used in this migration -> safe inside the txn)
ALTER TYPE "Role" ADD VALUE 'OWNER';

-- New tables
CREATE TABLE "Org" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "ownerId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Org_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ManagerStore" (
    "userId" INTEGER NOT NULL,
    "storeId" INTEGER NOT NULL,
    CONSTRAINT "ManagerStore_pkey" PRIMARY KEY ("userId","storeId")
);

-- One default Org for the existing data
INSERT INTO "Org" ("name") VALUES ('My Company');

-- Store.orgId: add, backfill to the default Org, enforce NOT NULL
ALTER TABLE "Store" ADD COLUMN "orgId" INTEGER;
UPDATE "Store" SET "orgId" = (SELECT "id" FROM "Org" ORDER BY "id" LIMIT 1);
ALTER TABLE "Store" ALTER COLUMN "orgId" SET NOT NULL;

-- User.orgId: nullable, backfill all existing users to the default Org
ALTER TABLE "User" ADD COLUMN "orgId" INTEGER;
UPDATE "User" SET "orgId" = (SELECT "id" FROM "Org" ORDER BY "id" LIMIT 1);

-- Existing MANAGER users -> managers of every existing store (owner narrows later)
INSERT INTO "ManagerStore" ("userId","storeId")
  SELECT u."id", s."id" FROM "User" u CROSS JOIN "Store" s WHERE u."role" = 'MANAGER';

-- Schedule: singleton (id default 1) -> one row per store
DELETE FROM "Schedule";
CREATE SEQUENCE "schedule_id_seq";
ALTER TABLE "Schedule" ALTER COLUMN "id" SET DEFAULT nextval('"schedule_id_seq"');
ALTER SEQUENCE "schedule_id_seq" OWNED BY "Schedule"."id";
ALTER TABLE "Schedule" ADD COLUMN "storeId" INTEGER;
INSERT INTO "Schedule" ("storeId","updatedAt") SELECT "id", CURRENT_TIMESTAMP FROM "Store";
ALTER TABLE "Schedule" ALTER COLUMN "storeId" SET NOT NULL;
CREATE UNIQUE INDEX "Schedule_storeId_key" ON "Schedule"("storeId");

-- ScheduleSnapshot.storeId: nullable (legacy snapshots stay NULL)
ALTER TABLE "ScheduleSnapshot" ADD COLUMN "storeId" INTEGER;

-- Foreign keys
ALTER TABLE "Store" ADD CONSTRAINT "Store_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "User" ADD CONSTRAINT "User_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ManagerStore" ADD CONSTRAINT "ManagerStore_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ManagerStore" ADD CONSTRAINT "ManagerStore_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ScheduleSnapshot" ADD CONSTRAINT "ScheduleSnapshot_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;
