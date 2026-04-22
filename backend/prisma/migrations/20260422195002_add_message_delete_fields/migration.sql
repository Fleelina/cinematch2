-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "deletedFor" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "deletedForAll" BOOLEAN NOT NULL DEFAULT false;
