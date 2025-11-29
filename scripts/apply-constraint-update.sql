-- Complete script to update unique constraint from instrument to symbol
-- Run this in Supabase SQL Editor
-- This will: 1) Drop old constraint, 2) Clean duplicates, 3) Add new constraint

-- Step 1: Drop the old constraint
ALTER TABLE "public"."Trade" 
DROP CONSTRAINT IF EXISTS "unique_trade_constraint";

-- Step 2: Clean any duplicates that might exist with the new constraint criteria
-- Keep the most recent trade (highest createdAt) for each duplicate group
WITH ranked_trades AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "userId", "accountNumber", "symbol", "entryDate", "entryPrice", "side", "quantity"
      ORDER BY "createdAt" DESC, id DESC
    ) as row_num
  FROM "public"."Trade"
)
DELETE FROM "public"."Trade"
WHERE id IN (
  SELECT id FROM ranked_trades WHERE row_num > 1
);

-- Step 3: Add the new unique constraint with symbol instead of instrument
ALTER TABLE "public"."Trade" 
ADD CONSTRAINT "unique_trade_identification" 
UNIQUE ("userId", "accountNumber", "symbol", "entryDate", "entryPrice", "side", "quantity");

-- Verification: Check that constraint was created
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public."Trade"'::regclass
AND conname = 'unique_trade_identification';

