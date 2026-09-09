-- Per-store group chat.

ALTER TABLE "User" ADD COLUMN "notifyOnChatMessage" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "lastChatEmailAt" TIMESTAMP(3);

CREATE TABLE "Message" (
  "id" SERIAL NOT NULL,
  "storeId" INTEGER NOT NULL,
  "userId" INTEGER,
  "authorName" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Message_storeId_id_idx" ON "Message"("storeId", "id");
ALTER TABLE "Message" ADD CONSTRAINT "Message_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "MessageRead" (
  "userId" INTEGER NOT NULL,
  "storeId" INTEGER NOT NULL,
  "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MessageRead_pkey" PRIMARY KEY ("userId", "storeId")
);
ALTER TABLE "MessageRead" ADD CONSTRAINT "MessageRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MessageRead" ADD CONSTRAINT "MessageRead_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
