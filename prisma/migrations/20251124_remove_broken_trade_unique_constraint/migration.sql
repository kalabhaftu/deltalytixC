-- AlterTable: Remove the broken unique constraint that prevents importing same trade data to different accounts
-- The constraint was: @@unique([userId, accountNumber, instrument, entryTime, side, entryPrice])
-- This incorrectly blocked imports of the same broker trades to different app accounts

-- Drop the constraint if it exists
ALTER TABLE "public"."Trade" DROP CONSTRAINT IF EXISTS "Trade_userId_accountNumber_instrument_entryTime_side_entryPrice_key";

