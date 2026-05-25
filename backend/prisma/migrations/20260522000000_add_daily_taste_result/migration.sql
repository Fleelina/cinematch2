-- CreateTable
CREATE TABLE "DailyTasteResult" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "mood" TEXT NOT NULL,
    "scores" TEXT NOT NULL,
    "answers" TEXT NOT NULL,
    "recommendations" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyTasteResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyTasteResult_userId_idx" ON "DailyTasteResult"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyTasteResult_userId_date_key" ON "DailyTasteResult"("userId", "date");

-- AddForeignKey
ALTER TABLE "DailyTasteResult" ADD CONSTRAINT "DailyTasteResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
