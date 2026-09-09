-- Shift pass-down log.
CREATE TABLE "ShiftNote" (
  "id" SERIAL NOT NULL,
  "storeId" INTEGER NOT NULL,
  "userId" INTEGER,
  "authorName" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'GENERAL',
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  "resolvedById" INTEGER,
  "resolvedName" TEXT,
  CONSTRAINT "ShiftNote_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ShiftNote_storeId_resolvedAt_id_idx" ON "ShiftNote"("storeId", "resolvedAt", "id");
ALTER TABLE "ShiftNote" ADD CONSTRAINT "ShiftNote_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ShiftNote" ADD CONSTRAINT "ShiftNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ShiftNote" ADD CONSTRAINT "ShiftNote_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
