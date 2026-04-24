-- AlterTable: User tablosuna gender alanı eklendi.
-- Nullable String olarak tanımlandı; mevcut kullanıcılar NULL olarak kalır.
ALTER TABLE "User" ADD COLUMN "gender" TEXT;
