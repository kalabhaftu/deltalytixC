-- SAFE VERSION: Shows what will be deleted before actually deleting
-- Run this first to see what duplicates exist

-- View duplicates (read-only, safe to run)
SELECT 
  "userId",
  "accountNumber",
  "instrument",
  "entryDate",
  "entryPrice",
  "quantity",
  "side",
  COUNT(*) as duplicate_count,
  array_agg(id ORDER BY "createdAt" DESC) as trade_ids,
  array_agg("createdAt" ORDER BY "createdAt" DESC) as created_dates
FROM "public"."Trade"
GROUP BY "userId", "accountNumber", "instrument", "entryDate", "entryPrice", "quantity", "side"
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC
LIMIT 100;

-- To see the actual duplicate trades (with all fields):
-- SELECT * FROM "public"."Trade"
-- WHERE ("userId", "accountNumber", "instrument", "entryDate", "entryPrice", "quantity", "side") IN (
--   SELECT "userId", "accountNumber", "instrument", "entryDate", "entryPrice", "quantity", "side"
--   FROM "public"."Trade"
--   GROUP BY "userId", "accountNumber", "instrument", "entryDate", "entryPrice", "quantity", "side"
--   HAVING COUNT(*) > 1
-- )
-- ORDER BY "userId", "accountNumber", "instrument", "entryDate", "entryPrice", "quantity", "side", "createdAt" DESC;

