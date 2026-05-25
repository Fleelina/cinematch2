ALTER TABLE "User" ADD COLUMN "profilePhotos" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "User"
SET "profilePhotos" = ARRAY["avatar"]
WHERE "avatar" IS NOT NULL AND "avatar" <> '';
