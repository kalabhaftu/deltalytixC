-- Add missing name column to Account table
ALTER TABLE "public"."Account" ADD COLUMN IF NOT EXISTS "name" TEXT;