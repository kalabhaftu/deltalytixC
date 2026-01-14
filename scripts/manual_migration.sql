-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."BacktestDirection" AS ENUM ('BUY', 'SELL');

-- CreateEnum
CREATE TYPE "public"."BacktestModel" AS ENUM ('ICT_2022', 'MSNR', 'TTFM', 'PRICE_ACTION', 'SUPPLY_DEMAND', 'SMART_MONEY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "public"."BacktestOutcome" AS ENUM ('WIN', 'LOSS', 'BREAKEVEN');

-- CreateEnum
CREATE TYPE "public"."BacktestSession" AS ENUM ('ASIAN', 'LONDON', 'NEW_YORK');

-- CreateEnum
CREATE TYPE "public"."BreachType" AS ENUM ('daily_drawdown', 'max_drawdown');

-- CreateEnum
CREATE TYPE "public"."DrawdownType" AS ENUM ('static', 'trailing');

-- CreateEnum
CREATE TYPE "public"."MarketBias" AS ENUM ('BULLISH', 'BEARISH', 'UNDECIDED');

-- CreateEnum
CREATE TYPE "public"."MasterAccountStatus" AS ENUM ('active', 'funded', 'failed');

-- CreateEnum
CREATE TYPE "public"."PayoutStatus" AS ENUM ('pending', 'approved', 'paid', 'rejected');

-- CreateEnum
CREATE TYPE "public"."NotificationPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('FUNDED_PENDING_APPROVAL', 'FUNDED_APPROVED', 'FUNDED_DECLINED', 'PHASE_TRANSITION_PENDING', 'PAYOUT_APPROVED', 'PAYOUT_REJECTED', 'SYSTEM', 'RISK_ALERT', 'IMPORT_STATUS', 'WEEKLY_PERFORMANCE', 'STRATEGY_DEVIATION', 'SYSTEM_ANNOUNCEMENT', 'TRADE_STATUS', 'RISK_DAILY_LOSS_80', 'RISK_DAILY_LOSS_95', 'RISK_MAX_DRAWDOWN_80', 'RISK_MAX_DRAWDOWN_95', 'IMPORT_PROCESSING', 'IMPORT_COMPLETE', 'STRATEGY_SESSION_VIOLATION');

-- CreateEnum
CREATE TYPE "public"."PhaseAccountStatus" AS ENUM ('active', 'passed', 'failed', 'archived', 'pending', 'pending_approval');

-- CreateEnum
CREATE TYPE "public"."TransactionType" AS ENUM ('DEPOSIT', 'WITHDRAWAL');

-- CreateEnum
CREATE TYPE "public"."WeeklyExpectation" AS ENUM ('BULLISH_EXPANSION', 'BEARISH_EXPANSION', 'CONSOLIDATION');

-- CreateTable
CREATE TABLE "public"."Account" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "name" TEXT,
    "broker" TEXT,
    "startingBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BacktestTrade" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pair" TEXT NOT NULL,
    "direction" "public"."BacktestDirection" NOT NULL,
    "outcome" "public"."BacktestOutcome" NOT NULL,
    "session" "public"."BacktestSession" NOT NULL,
    "model" "public"."BacktestModel" NOT NULL,
    "customModel" TEXT,
    "riskRewardRatio" DOUBLE PRECISION NOT NULL,
    "entryPrice" DOUBLE PRECISION NOT NULL,
    "stopLoss" DOUBLE PRECISION NOT NULL,
    "takeProfit" DOUBLE PRECISION NOT NULL,
    "exitPrice" DOUBLE PRECISION NOT NULL,
    "pnl" DOUBLE PRECISION NOT NULL,
    "imageOne" TEXT,
    "imageTwo" TEXT,
    "imageThree" TEXT,
    "imageFour" TEXT,
    "imageFive" TEXT,
    "imageSix" TEXT,
    "cardPreviewImage" TEXT,
    "notes" TEXT,
    "tags" TEXT[],
    "dateExecuted" TIMESTAMP(3) NOT NULL,
    "backtestDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "riskPoints" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rewardPoints" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "BacktestTrade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BreachRecord" (
    "id" TEXT NOT NULL,
    "phaseAccountId" TEXT NOT NULL,
    "breachType" "public"."BreachType" NOT NULL,
    "breachAmount" DOUBLE PRECISION NOT NULL,
    "breachTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentEquity" DOUBLE PRECISION NOT NULL,
    "accountSize" DOUBLE PRECISION NOT NULL,
    "dailyStartBalance" DOUBLE PRECISION,
    "highWaterMark" DOUBLE PRECISION,
    "tradeId" TEXT,
    "notes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BreachRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DailyAnchor" (
    "id" TEXT NOT NULL,
    "phaseAccountId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "anchorEquity" DOUBLE PRECISION NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyAnchor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DailyNote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "accountId" TEXT,
    "emotion" TEXT,

    CONSTRAINT "DailyNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DashboardTemplate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "layout" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DashboardTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LiveAccountTransaction" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "public"."TransactionType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveAccountTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MasterAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "propFirmName" TEXT NOT NULL,
    "accountSize" DOUBLE PRECISION NOT NULL,
    "evaluationType" TEXT NOT NULL,
    "currentPhase" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "public"."MasterAccountStatus" NOT NULL DEFAULT 'active',
    "isArchived" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "MasterAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Payout" (
    "id" TEXT NOT NULL,
    "masterAccountId" TEXT NOT NULL,
    "phaseAccountId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "public"."PayoutStatus" NOT NULL DEFAULT 'pending',
    "requestDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedDate" TIMESTAMP(3),
    "paidDate" TIMESTAMP(3),
    "rejectedDate" TIMESTAMP(3),
    "notes" TEXT,
    "rejectionReason" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PhaseAccount" (
    "id" TEXT NOT NULL,
    "masterAccountId" TEXT NOT NULL,
    "phaseNumber" INTEGER NOT NULL,
    "phaseId" TEXT,
    "status" "public"."PhaseAccountStatus" NOT NULL DEFAULT 'active',
    "profitTargetPercent" DOUBLE PRECISION NOT NULL,
    "dailyDrawdownPercent" DOUBLE PRECISION NOT NULL,
    "maxDrawdownPercent" DOUBLE PRECISION NOT NULL,
    "maxDrawdownType" "public"."DrawdownType" NOT NULL DEFAULT 'static',
    "minTradingDays" INTEGER NOT NULL DEFAULT 0,
    "timeLimitDays" INTEGER,
    "consistencyRulePercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "profitSplitPercent" DOUBLE PRECISION,
    "payoutCycleDays" INTEGER,
    "minProfitForPayout" DOUBLE PRECISION,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),

    CONSTRAINT "PhaseAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Trade" (
    "id" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "entryId" TEXT,
    "instrument" TEXT NOT NULL,
    "entryPrice" TEXT NOT NULL,
    "closePrice" TEXT NOT NULL,
    "entryDate" TEXT NOT NULL,
    "closeDate" TEXT NOT NULL,
    "pnl" DOUBLE PRECISION NOT NULL,
    "timeInPosition" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "userId" TEXT NOT NULL,
    "side" TEXT,
    "commission" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "comment" TEXT,
    "groupId" TEXT,
    "cardPreviewImage" TEXT,
    "imageOne" TEXT,
    "imageTwo" TEXT,
    "imageThree" TEXT,
    "imageFour" TEXT,
    "imageFive" TEXT,
    "imageSix" TEXT,
    "accountId" TEXT,
    "phaseAccountId" TEXT,
    "symbol" TEXT,
    "entryTime" TIMESTAMP(3),
    "exitTime" TIMESTAMP(3),
    "closeReason" TEXT,
    "stopLoss" TEXT,
    "takeProfit" TEXT,
    "tags" TEXT[],
    "marketBias" "public"."MarketBias",
    "modelId" TEXT,
    "selectedRules" JSONB,
    "newsDay" BOOLEAN DEFAULT false,
    "selectedNews" TEXT,
    "newsTraded" BOOLEAN DEFAULT false,
    "biasTimeframe" TEXT,
    "narrativeTimeframe" TEXT,
    "entryTimeframe" TEXT,
    "structureTimeframe" TEXT,
    "orderType" TEXT,
    "chartLinks" TEXT,

    CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TradeTag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#3b82f6',
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TradeTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TradingModel" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rules" JSONB NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TradingModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "auth_user_id" TEXT NOT NULL,
    "isFirstConnection" BOOLEAN NOT NULL DEFAULT true,
    "thorToken" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "theme" TEXT NOT NULL DEFAULT 'system',
    "firstName" TEXT,
    "lastName" TEXT,
    "accountFilterSettings" TEXT,
    "goalSettings" JSONB,
    "backtestInputMode" TEXT NOT NULL DEFAULT 'manual',

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "public"."NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "actionRequired" BOOLEAN NOT NULL DEFAULT false,
    "invalidationKey" TEXT,
    "priority" "public"."NotificationPriority" NOT NULL DEFAULT 'MEDIUM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WeeklyReview" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "calendarImage" TEXT,
    "expectation" "public"."WeeklyExpectation",
    "actualOutcome" "public"."WeeklyExpectation",
    "isCorrect" BOOLEAN,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "public"."Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_number_userId_key" ON "public"."Account"("number", "userId");

-- CreateIndex
CREATE INDEX "BacktestTrade_userId_model_idx" ON "public"."BacktestTrade"("userId", "model");

-- CreateIndex
CREATE UNIQUE INDEX "BacktestTrade_userId_pair_dateExecuted_entryPrice_direction_key" ON "public"."BacktestTrade"("userId", "pair", "dateExecuted", "entryPrice", "direction");

-- CreateIndex
CREATE INDEX "BreachRecord_phaseAccountId_idx" ON "public"."BreachRecord"("phaseAccountId");

-- CreateIndex
CREATE INDEX "DailyAnchor_date_idx" ON "public"."DailyAnchor"("date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyAnchor_phaseAccountId_date_key" ON "public"."DailyAnchor"("phaseAccountId", "date");

-- CreateIndex
CREATE INDEX "DailyNote_accountId_idx" ON "public"."DailyNote"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyNote_userId_accountId_date_key" ON "public"."DailyNote"("userId", "accountId", "date");

-- CreateIndex
CREATE INDEX "DashboardTemplate_userId_idx" ON "public"."DashboardTemplate"("userId");

-- CreateIndex
CREATE INDEX "DashboardTemplate_userId_isActive_idx" ON "public"."DashboardTemplate"("userId", "isActive");

-- CreateIndex
CREATE INDEX "DashboardTemplate_userId_isDefault_idx" ON "public"."DashboardTemplate"("userId", "isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "DashboardTemplate_userId_name_key" ON "public"."DashboardTemplate"("userId", "name");

-- CreateIndex
CREATE INDEX "LiveAccountTransaction_accountId_createdAt_idx" ON "public"."LiveAccountTransaction"("accountId", "createdAt");

-- CreateIndex
CREATE INDEX "LiveAccountTransaction_userId_idx" ON "public"."LiveAccountTransaction"("userId");

-- CreateIndex
CREATE INDEX "MasterAccount_userId_status_idx" ON "public"."MasterAccount"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "MasterAccount_userId_accountName_key" ON "public"."MasterAccount"("userId", "accountName");

-- CreateIndex
CREATE INDEX "Payout_masterAccountId_idx" ON "public"."Payout"("masterAccountId");

-- CreateIndex
CREATE INDEX "Payout_phaseAccountId_idx" ON "public"."Payout"("phaseAccountId");

-- CreateIndex
CREATE INDEX "PhaseAccount_masterAccountId_idx" ON "public"."PhaseAccount"("masterAccountId");

-- CreateIndex
CREATE INDEX "PhaseAccount_masterAccountId_phaseNumber_idx" ON "public"."PhaseAccount"("masterAccountId", "phaseNumber");

-- CreateIndex
CREATE INDEX "PhaseAccount_masterAccountId_status_idx" ON "public"."PhaseAccount"("masterAccountId", "status");

-- CreateIndex
CREATE INDEX "PhaseAccount_phaseId_idx" ON "public"."PhaseAccount"("phaseId");

-- CreateIndex
CREATE INDEX "PhaseAccount_status_idx" ON "public"."PhaseAccount"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PhaseAccount_masterAccountId_phaseNumber_key" ON "public"."PhaseAccount"("masterAccountId", "phaseNumber");

-- CreateIndex
CREATE INDEX "Trade_accountId_exitTime_idx" ON "public"."Trade"("accountId", "exitTime");

-- CreateIndex
CREATE INDEX "Trade_accountId_idx" ON "public"."Trade"("accountId");

-- CreateIndex
CREATE INDEX "Trade_accountId_phaseAccountId_idx" ON "public"."Trade"("accountId", "phaseAccountId");

-- CreateIndex
CREATE INDEX "Trade_accountNumber_idx" ON "public"."Trade"("accountNumber");

-- CreateIndex
CREATE INDEX "Trade_entryId_idx" ON "public"."Trade"("entryId");

-- CreateIndex
CREATE INDEX "Trade_exitTime_idx" ON "public"."Trade"("exitTime");

-- CreateIndex
CREATE INDEX "Trade_groupId_idx" ON "public"."Trade"("groupId");

-- CreateIndex
CREATE INDEX "Trade_modelId_idx" ON "public"."Trade"("modelId");

-- CreateIndex
CREATE INDEX "Trade_phaseAccountId_exitTime_idx" ON "public"."Trade"("phaseAccountId", "exitTime");

-- CreateIndex
CREATE INDEX "Trade_phaseAccountId_idx" ON "public"."Trade"("phaseAccountId");

-- CreateIndex
CREATE INDEX "Trade_symbol_idx" ON "public"."Trade"("symbol");

-- CreateIndex
CREATE INDEX "Trade_userId_accountNumber_id_idx" ON "public"."Trade"("userId", "accountNumber", "id");

-- CreateIndex
CREATE INDEX "Trade_userId_accountNumber_idx" ON "public"."Trade"("userId", "accountNumber");

-- CreateIndex
CREATE INDEX "Trade_userId_entryDate_idx" ON "public"."Trade"("userId", "entryDate" DESC);

-- CreateIndex
CREATE INDEX "Trade_userId_entryId_idx" ON "public"."Trade"("userId", "entryId");

-- CreateIndex
CREATE INDEX "Trade_userId_idx" ON "public"."Trade"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Trade_userId_accountNumber_symbol_entryDate_entryPrice_side_key" ON "public"."Trade"("userId", "accountNumber", "symbol", "entryDate", "entryPrice", "side", "quantity");

-- CreateIndex
CREATE INDEX "TradeTag_userId_idx" ON "public"."TradeTag"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TradeTag_name_userId_key" ON "public"."TradeTag"("name", "userId");

-- CreateIndex
CREATE INDEX "TradingModel_userId_idx" ON "public"."TradingModel"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TradingModel_userId_name_key" ON "public"."TradingModel"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_auth_user_id_key" ON "public"."User"("auth_user_id");

-- CreateIndex
CREATE INDEX "User_auth_user_id_idx" ON "public"."User"("auth_user_id");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "public"."Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_userId_actionRequired_idx" ON "public"."Notification"("userId", "actionRequired");

-- CreateIndex
CREATE INDEX "Notification_userId_invalidationKey_idx" ON "public"."Notification"("userId", "invalidationKey");

-- CreateIndex
CREATE INDEX "WeeklyReview_userId_idx" ON "public"."WeeklyReview"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyReview_userId_startDate_key" ON "public"."WeeklyReview"("userId", "startDate");

-- AddForeignKey
ALTER TABLE "public"."Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BacktestTrade" ADD CONSTRAINT "BacktestTrade_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BreachRecord" ADD CONSTRAINT "BreachRecord_phaseAccountId_fkey" FOREIGN KEY ("phaseAccountId") REFERENCES "public"."PhaseAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DailyAnchor" ADD CONSTRAINT "DailyAnchor_phaseAccountId_fkey" FOREIGN KEY ("phaseAccountId") REFERENCES "public"."PhaseAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DailyNote" ADD CONSTRAINT "DailyNote_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DailyNote" ADD CONSTRAINT "DailyNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DashboardTemplate" ADD CONSTRAINT "DashboardTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LiveAccountTransaction" ADD CONSTRAINT "LiveAccountTransaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LiveAccountTransaction" ADD CONSTRAINT "LiveAccountTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MasterAccount" ADD CONSTRAINT "MasterAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Payout" ADD CONSTRAINT "Payout_masterAccountId_fkey" FOREIGN KEY ("masterAccountId") REFERENCES "public"."MasterAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Payout" ADD CONSTRAINT "Payout_phaseAccountId_fkey" FOREIGN KEY ("phaseAccountId") REFERENCES "public"."PhaseAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PhaseAccount" ADD CONSTRAINT "PhaseAccount_masterAccountId_fkey" FOREIGN KEY ("masterAccountId") REFERENCES "public"."MasterAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Trade" ADD CONSTRAINT "Trade_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Trade" ADD CONSTRAINT "Trade_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "public"."TradingModel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Trade" ADD CONSTRAINT "Trade_phaseAccountId_fkey" FOREIGN KEY ("phaseAccountId") REFERENCES "public"."PhaseAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TradeTag" ADD CONSTRAINT "TradeTag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TradingModel" ADD CONSTRAINT "TradingModel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WeeklyReview" ADD CONSTRAINT "WeeklyReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

