-- Complete script: Clean duplicates then add constraint
-- Run this in Supabase SQL Editor

-- Step 1: Delete duplicates, keeping the most recent trade (highest createdAt)
-- This uses a CTE to identify duplicates and keeps only the first one (most recent)
WITH ranked_trades AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "userId", "accountNumber", "instrument", "entryDate", "entryPrice", "quantity", "side"
      ORDER BY "createdAt" DESC, id DESC
    ) as row_num
  FROM "public"."Trade"
)
DELETE FROM "public"."Trade"
WHERE id IN (
  SELECT id FROM ranked_trades WHERE row_num > 1
);

-- Step 2: Add the unique constraint (now that duplicates are removed)
ALTER TABLE "public"."Trade" 
ADD CONSTRAINT "unique_trade_constraint" 
UNIQUE ("userId", "accountNumber", "instrument", "entryDate", "entryPrice", "quantity", "side");

-- Verification: Check that constraint was created
SELECT 
  conname as constraint_name,
  contype as constraint_type
FROM pg_constraint
WHERE conrelid = 'public."Trade"'::regclass
AND conname = 'unique_trade_constraint';

