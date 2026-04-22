-- Keep migration history aligned with the existing database drift
-- and add the new Expo push notification token column.
CREATE UNIQUE INDEX IF NOT EXISTS "Match_user1Id_user2Id_key" ON "Match"("user1Id", "user2Id");

ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "pushToken" TEXT;
