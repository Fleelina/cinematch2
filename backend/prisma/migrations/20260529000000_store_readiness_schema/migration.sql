CREATE TYPE "AvatarType" AS ENUM ('upload', 'photo', 'character');
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY');
CREATE TYPE "InteractionType" AS ENUM ('LIKE', 'DISLIKE', 'SUPERLIKE', 'BLOCK');

ALTER TABLE "User"
ADD COLUMN "birthDate" TIMESTAMP(3),
ALTER COLUMN "avatarType" TYPE "AvatarType" USING (
  CASE
    WHEN "avatarType" IN ('upload', 'photo', 'character') THEN "avatarType"::"AvatarType"
    ELSE NULL
  END
),
ALTER COLUMN "gender" TYPE "Gender" USING (
  CASE
    WHEN lower("gender") = 'male' THEN 'MALE'::"Gender"
    WHEN lower("gender") = 'female' THEN 'FEMALE'::"Gender"
    WHEN lower("gender") = 'other' THEN 'OTHER'::"Gender"
    WHEN lower("gender") IN ('prefer_not_to_say', 'prefer-not-to-say') THEN 'PREFER_NOT_TO_SAY'::"Gender"
    ELSE NULL
  END
),
DROP COLUMN "age";

ALTER TABLE "Movie"
ALTER COLUMN "genres" TYPE JSONB USING (
  CASE
    WHEN "genres" IS NULL OR btrim("genres") = '' THEN NULL
    ELSE "genres"::jsonb
  END
),
ALTER COLUMN "cast" TYPE JSONB USING (
  CASE
    WHEN "cast" IS NULL OR btrim("cast") = '' THEN NULL
    ELSE "cast"::jsonb
  END
);

ALTER TABLE "Interaction"
ALTER COLUMN "type" TYPE "InteractionType" USING (
  CASE
    WHEN upper("type") = 'MATCHED' THEN 'LIKE'::"InteractionType"
    ELSE upper("type")::"InteractionType"
  END
);

ALTER TABLE "DailyTasteResult"
ALTER COLUMN "scores" TYPE JSONB USING (
  CASE WHEN btrim("scores") = '' THEN '{}'::jsonb ELSE "scores"::jsonb END
),
ALTER COLUMN "answers" TYPE JSONB USING (
  CASE WHEN btrim("answers") = '' THEN '[]'::jsonb ELSE "answers"::jsonb END
),
ALTER COLUMN "recommendations" TYPE JSONB USING (
  CASE WHEN btrim("recommendations") = '' THEN '[]'::jsonb ELSE "recommendations"::jsonb END
);

ALTER TABLE "Watchlist"
ADD COLUMN "movieId" TEXT;

UPDATE "Watchlist" w
SET "movieId" = m."id"
FROM "Movie" m
WHERE w."tmdbId" = m."tmdbId";

CREATE INDEX "Watchlist_movieId_idx" ON "Watchlist"("movieId");

ALTER TABLE "Watchlist"
ADD CONSTRAINT "Watchlist_movieId_fkey"
FOREIGN KEY ("movieId") REFERENCES "Movie"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
