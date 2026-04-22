ALTER TABLE "Message"
ADD COLUMN "movieId" TEXT;

CREATE INDEX "Message_movieId_idx" ON "Message"("movieId");

ALTER TABLE "Message"
ADD CONSTRAINT "Message_movieId_fkey"
FOREIGN KEY ("movieId") REFERENCES "Movie"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
