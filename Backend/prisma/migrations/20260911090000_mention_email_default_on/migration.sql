-- @-mentions are directed at you specifically -- opt-out, like marketplace posts,
-- not opt-in like the general "new chat messages" nudge.
ALTER TABLE "User" ADD COLUMN "notifyOnMention" BOOLEAN NOT NULL DEFAULT true;
