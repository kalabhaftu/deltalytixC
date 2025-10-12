-- CreateEnum
CREATE TYPE "public"."TradingModel" AS ENUM ('ICT_2022', 'MSNR', 'TTFM', 'PRICE_ACTION');

-- CreateEnum
CREATE TYPE "public"."BreachType" AS ENUM ('daily_drawdown', 'max_drawdown');

-- CreateEnum
CREATE TYPE "public"."PhaseAccountStatus" AS ENUM ('active', 'passed', 'failed', 'archived', 'pending');

-- CreateEnum
CREATE TYPE "public"."BacktestDirection" AS ENUM ('BUY', 'SELL');

-- CreateEnum
CREATE TYPE "public"."BacktestOutcome" AS ENUM ('WIN', 'LOSS', 'BREAKEVEN');

-- CreateEnum
CREATE TYPE "public"."BacktestSession" AS ENUM ('ASIAN', 'LONDON', 'NEW_YORK');

-- CreateEnum
CREATE TYPE "public"."BacktestModel" AS ENUM ('ICT_2022', 'MSNR', 'TTFM', 'PRICE_ACTION', 'SUPPLY_DEMAND', 'SMART_MONEY', 'CUSTOM');

-- CreateTable
CREATE TABLE "public"."Trade" (
    "id" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "entryId" TEXT DEFAULT '',
    "instrument" TEXT NOT NULL,
    "entryPrice" TEXT NOT NULL,
    "closePrice" TEXT NOT NULL,
    "entryDate" TEXT NOT NULL,
    "closeDate" TEXT NOT NULL,
    "pnl" DOUBLE PRECISION NOT NULL,
    "timeInPosition" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "userId" TEXT NOT NULL,
    "side" TEXT DEFAULT '',
    "commission" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "comment" TEXT,
    "imageBase64" TEXT,
    "imageBase64Second" TEXT,
    "groupId" TEXT DEFAULT '',
    "imageBase64Third" TEXT,
    "imageBase64Fourth" TEXT,
    "imageBase64Fifth" TEXT,
    "imageBase64Sixth" TEXT,
    "cardPreviewImage" TEXT,
    "accountId" TEXT,
    "phaseAccountId" TEXT,
    "symbol" TEXT,
    "entryTime" TIMESTAMP(3),
    "exitTime" TIMESTAMP(3),
    "closeReason" TEXT,
    "stopLoss" TEXT,
    "takeProfit" TEXT,
    "tradingModel" "public"."TradingModel",

    CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
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
    "backtestInputMode" TEXT NOT NULL DEFAULT 'manual',

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Group" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
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
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MasterAccount_pkey" PRIMARY KEY ("id")
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
    "maxDrawdownType" TEXT NOT NULL DEFAULT 'static',
    "minTradingDays" INTEGER NOT NULL DEFAULT 0,
    "timeLimitDays" INTEGER,
    "consistencyRulePercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "profitSplitPercent" DOUBLE PRECISION,
    "payoutCycleDays" INTEGER,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),

    CONSTRAINT "PhaseAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Payout" (
    "id" TEXT NOT NULL,
    "masterAccountId" TEXT NOT NULL,
    "phaseAccountId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requestDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedDate" TIMESTAMP(3),
    "paidDate" TIMESTAMP(3),
    "rejectedDate" TIMESTAMP(3),
    "notes" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "public"."BreachRecord" (
    "id" TEXT NOT NULL,
    "phaseAccountId" TEXT NOT NULL,
    "breachType" TEXT NOT NULL,
    "breachAmount" DOUBLE PRECISION NOT NULL,
    "breachTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentEquity" DOUBLE PRECISION NOT NULL,
    "accountSize" DOUBLE PRECISION NOT NULL,
    "dailyStartBalance" DOUBLE PRECISION,
    "highWaterMark" DOUBLE PRECISION,
    "tradeId" TEXT,
    "notes" TEXT,

    CONSTRAINT "BreachRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Account" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "name" TEXT,
    "broker" TEXT,
    "startingBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "userId" TEXT NOT NULL,
    "groupId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
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

    CONSTRAINT "BacktestTrade_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Trade_accountNumber_idx" ON "public"."Trade"("accountNumber");

-- CreateIndex
CREATE INDEX "Trade_userId_idx" ON "public"."Trade"("userId");

-- CreateIndex
CREATE INDEX "Trade_groupId_idx" ON "public"."Trade"("groupId");

-- CreateIndex
CREATE INDEX "Trade_accountId_idx" ON "public"."Trade"("accountId");

-- CreateIndex
CREATE INDEX "Trade_phaseAccountId_idx" ON "public"."Trade"("phaseAccountId");

-- CreateIndex
CREATE INDEX "Trade_entryTime_idx" ON "public"."Trade"("entryTime");

-- CreateIndex
CREATE INDEX "Trade_symbol_idx" ON "public"."Trade"("symbol");

-- CreateIndex
CREATE INDEX "Trade_accountId_phaseAccountId_idx" ON "public"."Trade"("accountId", "phaseAccountId");

-- CreateIndex
CREATE INDEX "Trade_exitTime_idx" ON "public"."Trade"("exitTime");

-- CreateIndex
CREATE INDEX "Trade_accountId_exitTime_idx" ON "public"."Trade"("accountId", "exitTime");

-- CreateIndex
CREATE INDEX "Trade_userId_accountNumber_idx" ON "public"."Trade"("userId", "accountNumber");

-- CreateIndex
CREATE INDEX "Trade_userId_entryTime_idx" ON "public"."Trade"("userId", "entryTime");

-- CreateIndex
CREATE INDEX "Trade_entryId_idx" ON "public"."Trade"("entryId");

-- CreateIndex
CREATE INDEX "Trade_userId_entryId_idx" ON "public"."Trade"("userId", "entryId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_auth_user_id_key" ON "public"."User"("auth_user_id");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "Group_userId_idx" ON "public"."Group"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Group_name_userId_key" ON "public"."Group"("name", "userId");

-- CreateIndex
CREATE INDEX "MasterAccount_userId_idx" ON "public"."MasterAccount"("userId");

-- CreateIndex
CREATE INDEX "MasterAccount_propFirmName_idx" ON "public"."MasterAccount"("propFirmName");

-- CreateIndex
CREATE INDEX "MasterAccount_currentPhase_idx" ON "public"."MasterAccount"("currentPhase");

-- CreateIndex
CREATE INDEX "MasterAccount_isActive_idx" ON "public"."MasterAccount"("isActive");

-- CreateIndex
CREATE INDEX "MasterAccount_userId_isActive_idx" ON "public"."MasterAccount"("userId", "isActive");

-- CreateIndex
CREATE INDEX "PhaseAccount_masterAccountId_idx" ON "public"."PhaseAccount"("masterAccountId");

-- CreateIndex
CREATE INDEX "PhaseAccount_phaseNumber_idx" ON "public"."PhaseAccount"("phaseNumber");

-- CreateIndex
CREATE INDEX "PhaseAccount_status_idx" ON "public"."PhaseAccount"("status");

-- CreateIndex
CREATE INDEX "PhaseAccount_phaseId_idx" ON "public"."PhaseAccount"("phaseId");

-- CreateIndex
CREATE INDEX "PhaseAccount_masterAccountId_phaseNumber_idx" ON "public"."PhaseAccount"("masterAccountId", "phaseNumber");

-- CreateIndex
CREATE INDEX "PhaseAccount_masterAccountId_status_idx" ON "public"."PhaseAccount"("masterAccountId", "status");

-- CreateIndex
CREATE INDEX "Payout_masterAccountId_idx" ON "public"."Payout"("masterAccountId");

-- CreateIndex
CREATE INDEX "Payout_phaseAccountId_idx" ON "public"."Payout"("phaseAccountId");

-- CreateIndex
CREATE INDEX "Payout_status_idx" ON "public"."Payout"("status");

-- CreateIndex
CREATE INDEX "DailyAnchor_phaseAccountId_idx" ON "public"."DailyAnchor"("phaseAccountId");

-- CreateIndex
CREATE INDEX "DailyAnchor_date_idx" ON "public"."DailyAnchor"("date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyAnchor_phaseAccountId_date_key" ON "public"."DailyAnchor"("phaseAccountId", "date");

-- CreateIndex
CREATE INDEX "BreachRecord_phaseAccountId_idx" ON "public"."BreachRecord"("phaseAccountId");

-- CreateIndex
CREATE INDEX "BreachRecord_breachType_idx" ON "public"."BreachRecord"("breachType");

-- CreateIndex
CREATE INDEX "BreachRecord_breachTime_idx" ON "public"."BreachRecord"("breachTime");

-- CreateIndex
CREATE INDEX "Account_number_idx" ON "public"."Account"("number");

-- CreateIndex
CREATE INDEX "Account_groupId_idx" ON "public"."Account"("groupId");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "public"."Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_number_userId_key" ON "public"."Account"("number", "userId");

-- CreateIndex
CREATE INDEX "DashboardTemplate_userId_idx" ON "public"."DashboardTemplate"("userId");

-- CreateIndex
CREATE INDEX "DashboardTemplate_userId_isActive_idx" ON "public"."DashboardTemplate"("userId", "isActive");

-- CreateIndex
CREATE INDEX "DashboardTemplate_userId_isDefault_idx" ON "public"."DashboardTemplate"("userId", "isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "DashboardTemplate_userId_name_key" ON "public"."DashboardTemplate"("userId", "name");

-- CreateIndex
CREATE INDEX "BacktestTrade_userId_idx" ON "public"."BacktestTrade"("userId");

-- CreateIndex
CREATE INDEX "BacktestTrade_userId_outcome_idx" ON "public"."BacktestTrade"("userId", "outcome");

-- CreateIndex
CREATE INDEX "BacktestTrade_userId_session_idx" ON "public"."BacktestTrade"("userId", "session");

-- CreateIndex
CREATE INDEX "BacktestTrade_userId_model_idx" ON "public"."BacktestTrade"("userId", "model");

-- CreateIndex
CREATE INDEX "BacktestTrade_dateExecuted_idx" ON "public"."BacktestTrade"("dateExecuted");

-- AddForeignKey
ALTER TABLE "public"."Trade" ADD CONSTRAINT "Trade_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Trade" ADD CONSTRAINT "Trade_phaseAccountId_fkey" FOREIGN KEY ("phaseAccountId") REFERENCES "public"."PhaseAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Group" ADD CONSTRAINT "Group_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MasterAccount" ADD CONSTRAINT "MasterAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PhaseAccount" ADD CONSTRAINT "PhaseAccount_masterAccountId_fkey" FOREIGN KEY ("masterAccountId") REFERENCES "public"."MasterAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Payout" ADD CONSTRAINT "Payout_masterAccountId_fkey" FOREIGN KEY ("masterAccountId") REFERENCES "public"."MasterAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Payout" ADD CONSTRAINT "Payout_phaseAccountId_fkey" FOREIGN KEY ("phaseAccountId") REFERENCES "public"."PhaseAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DailyAnchor" ADD CONSTRAINT "DailyAnchor_phaseAccountId_fkey" FOREIGN KEY ("phaseAccountId") REFERENCES "public"."PhaseAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BreachRecord" ADD CONSTRAINT "BreachRecord_phaseAccountId_fkey" FOREIGN KEY ("phaseAccountId") REFERENCES "public"."PhaseAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Account" ADD CONSTRAINT "Account_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DashboardTemplate" ADD CONSTRAINT "DashboardTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BacktestTrade" ADD CONSTRAINT "BacktestTrade_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
