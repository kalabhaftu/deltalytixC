-- Add emotion and accountId fields to DailyNote table for journal functionality
ALTER TABLE "public"."DailyNote" ADD COLUMN "emotion" TEXT;
ALTER TABLE "public"."DailyNote" ADD COLUMN "accountId" TEXT;

-- Add index for accountId lookups
CREATE INDEX "DailyNote_accountId_idx" ON "public"."DailyNote"("accountId");

-- Add composite index for userId, accountId, date queries
CREATE INDEX "DailyNote_userId_accountId_date_idx" ON "public"."DailyNote"("userId", "accountId", "date");

-- Drop old unique constraint that doesn't include accountId
DROP INDEX IF EXISTS "DailyNote_userId_date_key";

-- Add new unique constraint including accountId (one journal per user per account per day)
CREATE UNIQUE INDEX "DailyNote_userId_accountId_date_key" ON "public"."DailyNote"("userId", "accountId", "date");

-- Add foreign key constraint for accountId
ALTER TABLE "public"."DailyNote" ADD CONSTRAINT "DailyNote_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

