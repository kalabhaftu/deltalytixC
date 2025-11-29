-- Step 1: Find duplicate trades based on the unique constraint criteria
-- This query shows all duplicate groups

SELECT 
  "userId",
  "accountNumber",
  "instrument",
  "entryDate",
  "entryPrice",
  "quantity",
  "side",
  COUNT(*) as duplicate_count,
  array_agg(id ORDER BY "createdAt" DESC) as trade_ids
FROM "public"."Trade"
GROUP BY "userId", "accountNumber", "instrument", "entryDate", "entryPrice", "quantity", "side"
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- Step 2: Delete duplicates, keeping only the most recent one (based on createdAt)
-- WARNING: This will delete duplicate trades. Review the query above first!

DELETE FROM "public"."Trade"
WHERE id IN (
  SELECT id
  FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY "userId", "accountNumber", "instrument", "entryDate", "entryPrice", "quantity", "side"
        ORDER BY "createdAt" DESC
      ) as row_num
    FROM "public"."Trade"
  ) ranked
  WHERE row_num > 1
);

-- Step 3: After cleanup, apply the constraint
-- ALTER TABLE "public"."Trade" 
-- ADD CONSTRAINT "unique_trade_constraint" 
-- UNIQUE ("userId", "accountNumber", "instrument", "entryDate", "entryPrice", "quantity", "side");

