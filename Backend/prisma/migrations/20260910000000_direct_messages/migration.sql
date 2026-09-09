-- 1-to-1 private messages between two logins.
CREATE TABLE "DirectMessage" (
  "id" SERIAL NOT NULL,
  "senderId" INTEGER NOT NULL,
  "recipientId" INTEGER NOT NULL,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "readAt" TIMESTAMP(3),
  CONSTRAINT "DirectMessage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "DirectMessage_senderId_recipientId_id_idx" ON "DirectMessage"("senderId", "recipientId", "id");
CREATE INDEX "DirectMessage_recipientId_senderId_id_idx" ON "DirectMessage"("recipientId", "senderId", "id");
ALTER TABLE "DirectMessage" ADD CONSTRAINT "DirectMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DirectMessage" ADD CONSTRAINT "DirectMessage_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
