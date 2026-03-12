-- CreateEnum
CREATE TYPE "public"."TradeOutcome" AS ENUM ('GOOD_WIN', 'BAD_WIN', 'BREAKEVEN', 'GOOD_LOSS', 'BAD_LOSS');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."NotificationType" ADD VALUE 'RISK_ALERT';
ALTER TYPE "public"."NotificationType" ADD VALUE 'IMPORT_STATUS';
ALTER TYPE "public"."NotificationType" ADD VALUE 'WEEKLY_PERFORMANCE';
ALTER TYPE "public"."NotificationType" ADD VALUE 'STRATEGY_DEVIATION';
ALTER TYPE "public"."NotificationType" ADD VALUE 'SYSTEM_ANNOUNCEMENT';
ALTER TYPE "public"."NotificationType" ADD VALUE 'TRADE_STATUS';

-- AlterTable
ALTER TABLE "public"."Trade" ADD COLUMN     "outcome" "public"."TradeOutcome",
ADD COLUMN     "ruleBroken" BOOLEAN DEFAULT false;

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "timeFormat" TEXT NOT NULL DEFAULT '24h',
ALTER COLUMN "timezone" SET DEFAULT 'America/New_York';

-- CreateIndex
CREATE INDEX "BacktestTrade_userId_model_idx" ON "public"."BacktestTrade"("userId", "model");

-- CreateIndex
CREATE INDEX "DailyAnchor_date_idx" ON "public"."DailyAnchor"("date");

-- CreateIndex
CREATE INDEX "DailyNote_accountId_idx" ON "public"."DailyNote"("accountId");

-- CreateIndex
CREATE INDEX "DashboardTemplate_userId_idx" ON "public"."DashboardTemplate"("userId");

-- CreateIndex
CREATE INDEX "DashboardTemplate_userId_isDefault_idx" ON "public"."DashboardTemplate"("userId", "isDefault");

-- CreateIndex
CREATE INDEX "LiveAccountTransaction_accountId_createdAt_idx" ON "public"."LiveAccountTransaction"("accountId", "createdAt");

-- CreateIndex
CREATE INDEX "PhaseAccount_masterAccountId_phaseNumber_idx" ON "public"."PhaseAccount"("masterAccountId", "phaseNumber");

-- CreateIndex
CREATE INDEX "Trade_accountId_exitTime_idx" ON "public"."Trade"("accountId", "exitTime");

-- CreateIndex
CREATE INDEX "Trade_accountId_idx" ON "public"."Trade"("accountId");

-- CreateIndex
CREATE INDEX "Trade_accountId_phaseAccountId_idx" ON "public"."Trade"("accountId", "phaseAccountId");

-- CreateIndex
CREATE INDEX "Trade_entryId_idx" ON "public"."Trade"("entryId");

-- CreateIndex
CREATE INDEX "Trade_exitTime_idx" ON "public"."Trade"("exitTime");

-- CreateIndex
CREATE INDEX "Trade_groupId_idx" ON "public"."Trade"("groupId");

-- CreateIndex
CREATE INDEX "Trade_modelId_idx" ON "public"."Trade"("modelId");

-- CreateIndex
CREATE INDEX "Trade_symbol_idx" ON "public"."Trade"("symbol");

-- CreateIndex
CREATE INDEX "Trade_userId_accountNumber_id_idx" ON "public"."Trade"("userId", "accountNumber", "id");

-- CreateIndex
CREATE INDEX "TradingModel_userId_idx" ON "public"."TradingModel"("userId");

-- CreateIndex
CREATE INDEX "WeeklyReview_userId_idx" ON "public"."WeeklyReview"("userId");

