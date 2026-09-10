-- @-mentions in store chat: userIds referenced in a message body
ALTER TABLE "Message" ADD COLUMN "mentions" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];
