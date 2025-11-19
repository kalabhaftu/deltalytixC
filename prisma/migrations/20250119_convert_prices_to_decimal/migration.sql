-- AlterTable: Convert price fields from String to Decimal and remove base64 image fields
-- This migration safely converts existing data

-- Step 1: Add new decimal columns
ALTER TABLE "public"."Trade" ADD COLUMN "entryPrice_new" DECIMAL(20,10);
ALTER TABLE "public"."Trade" ADD COLUMN "closePrice_new" DECIMAL(20,10);
ALTER TABLE "public"."Trade" ADD COLUMN "stopLoss_new" DECIMAL(20,10);
ALTER TABLE "public"."Trade" ADD COLUMN "takeProfit_new" DECIMAL(20,10);

-- Step 2: Copy data, converting strings to decimals (handles null/empty strings)
UPDATE "public"."Trade" 
SET "entryPrice_new" = CASE 
  WHEN "entryPrice" ~ '^[0-9]+\.?[0-9]*$' THEN "entryPrice"::DECIMAL(20,10)
  ELSE NULL 
END;

UPDATE "public"."Trade" 
SET "closePrice_new" = CASE 
  WHEN "closePrice" ~ '^[0-9]+\.?[0-9]*$' THEN "closePrice"::DECIMAL(20,10)
  ELSE NULL 
END;

UPDATE "public"."Trade" 
SET "stopLoss_new" = CASE 
  WHEN "stopLoss" IS NOT NULL AND "stopLoss" ~ '^[0-9]+\.?[0-9]*$' THEN "stopLoss"::DECIMAL(20,10)
  ELSE NULL 
END;

UPDATE "public"."Trade" 
SET "takeProfit_new" = CASE 
  WHEN "takeProfit" IS NOT NULL AND "takeProfit" ~ '^[0-9]+\.?[0-9]*$' THEN "takeProfit"::DECIMAL(20,10)
  ELSE NULL 
END;

-- Step 3: Drop old columns
ALTER TABLE "public"."Trade" DROP COLUMN "entryPrice";
ALTER TABLE "public"."Trade" DROP COLUMN "closePrice";
ALTER TABLE "public"."Trade" DROP COLUMN "stopLoss";
ALTER TABLE "public"."Trade" DROP COLUMN "takeProfit";

-- Step 4: Rename new columns
ALTER TABLE "public"."Trade" RENAME COLUMN "entryPrice_new" TO "entryPrice";
ALTER TABLE "public"."Trade" RENAME COLUMN "closePrice_new" TO "closePrice";
ALTER TABLE "public"."Trade" RENAME COLUMN "stopLoss_new" TO "stopLoss";
ALTER TABLE "public"."Trade" RENAME COLUMN "takeProfit_new" TO "takeProfit";

-- Step 5: Add NOT NULL constraint to required fields
ALTER TABLE "public"."Trade" ALTER COLUMN "entryPrice" SET NOT NULL;
ALTER TABLE "public"."Trade" ALTER COLUMN "closePrice" SET NOT NULL;

-- Step 6: Remove base64 image fields (already done in schema, ensuring DB cleanup)
ALTER TABLE "public"."Trade" DROP COLUMN IF EXISTS "imageBase64";
ALTER TABLE "public"."Trade" DROP COLUMN IF EXISTS "imageBase64Second";
ALTER TABLE "public"."Trade" DROP COLUMN IF EXISTS "imageBase64Third";
ALTER TABLE "public"."Trade" DROP COLUMN IF EXISTS "imageBase64Fourth";
ALTER TABLE "public"."Trade" DROP COLUMN IF EXISTS "imageBase64Fifth";
ALTER TABLE "public"."Trade" DROP COLUMN IF EXISTS "imageBase64Sixth";

