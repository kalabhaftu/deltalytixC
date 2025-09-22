-- Add missing entryId column to Trade table
ALTER TABLE "public"."Trade" ADD COLUMN IF NOT EXISTS "entryId" TEXT DEFAULT '';
