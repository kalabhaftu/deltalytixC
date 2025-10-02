-- Migration: Add stopLoss and takeProfit fields to Trade table
-- This enables proper R:R (Risk-Reward Ratio) calculations

ALTER TABLE "public"."Trade" 
ADD COLUMN IF NOT EXISTS "stopLoss" TEXT,
ADD COLUMN IF NOT EXISTS "takeProfit" TEXT;

-- Add comments for documentation
COMMENT ON COLUMN "public"."Trade"."stopLoss" IS 'Stop Loss price for R:R calculation';
COMMENT ON COLUMN "public"."Trade"."takeProfit" IS 'Take Profit price for R:R calculation';

