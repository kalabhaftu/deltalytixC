-- CreateIndex
-- CRITICAL FIX: Add account-specific unique constraint for trade deduplication
-- This allows the same trade to exist across different accounts but prevents duplicates within the same account
-- skipDuplicates in batch-operations.ts will now work correctly
CREATE UNIQUE INDEX "Trade_userId_accountNumber_instrument_entryTime_side_entryPr_key" ON "public"."Trade"("userId", "accountNumber", "instrument", "entryTime", "side", "entryPrice");

