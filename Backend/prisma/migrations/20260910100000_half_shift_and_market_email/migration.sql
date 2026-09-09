-- Hand off part of a shift on the marketplace + email the store on a post.
ALTER TABLE "ShiftChangeRequest" ADD COLUMN "handoffStart" TIMESTAMP(3);
ALTER TABLE "ShiftChangeRequest" ADD COLUMN "handoffEnd" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "notifyOnMarketplacePost" BOOLEAN NOT NULL DEFAULT true;
