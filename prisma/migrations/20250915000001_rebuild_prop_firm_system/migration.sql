-- Complete rebuild of prop firm tracking system
-- This migration redesigns the prop firm system from scratch

-- First, drop existing constraints and indexes if they exist
DROP INDEX IF EXISTS "Account_propfirm_status_idx";
DROP INDEX IF EXISTS "Account_userId_propfirm_status_evaluationType_idx";

-- Create new comprehensive enums
DO $$ BEGIN
    CREATE TYPE "PropFirmType" AS ENUM ('FTMO', 'MyForexFunds', 'FundedNext', 'TheForexFirm', 'TopTierTrader', 'SurgeTrader', 'TrueForexFunds', 'FundingTraders', 'E8Funding', 'FastTrackTrading', 'Other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "AccountPhaseType" AS ENUM ('phase_1', 'phase_2', 'funded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "PhaseStatus" AS ENUM ('active', 'passed', 'failed', 'pending');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Update Account table with new prop firm structure
ALTER TABLE "public"."Account" 
ADD COLUMN IF NOT EXISTS "firmType" "PropFirmType",
ADD COLUMN IF NOT EXISTS "accountSize" DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS "currency" VARCHAR(3) DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS "leverage" INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS "isDemo" BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS "serverInfo" TEXT,
ADD COLUMN IF NOT EXISTS "tradingPlatform" VARCHAR(50),
ADD COLUMN IF NOT EXISTS "lastSyncAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "syncEnabled" BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS "notes" TEXT;

-- Add comprehensive prop firm configuration
ALTER TABLE "public"."Account"
ADD COLUMN IF NOT EXISTS "phase1AccountId" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "phase2AccountId" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "fundedAccountId" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "phase1Login" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "phase2Login" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "fundedLogin" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "phase1Password" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "phase2Password" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "fundedPassword" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "phase1Server" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "phase2Server" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "fundedServer" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "purchaseDate" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "challengeStartDate" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "challengeEndDate" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "fundedDate" TIMESTAMP(3);

-- Add drawdown configuration with proper defaults
ALTER TABLE "public"."Account"
ADD COLUMN IF NOT EXISTS "phase1ProfitTarget" DECIMAL(5,2) DEFAULT 10.00,
ADD COLUMN IF NOT EXISTS "phase2ProfitTarget" DECIMAL(5,2) DEFAULT 5.00,
ADD COLUMN IF NOT EXISTS "phase1MaxDrawdown" DECIMAL(5,2) DEFAULT 10.00,
ADD COLUMN IF NOT EXISTS "phase2MaxDrawdown" DECIMAL(5,2) DEFAULT 10.00,
ADD COLUMN IF NOT EXISTS "fundedMaxDrawdown" DECIMAL(5,2) DEFAULT 5.00,
ADD COLUMN IF NOT EXISTS "phase1DailyDrawdown" DECIMAL(5,2) DEFAULT 5.00,
ADD COLUMN IF NOT EXISTS "phase2DailyDrawdown" DECIMAL(5,2) DEFAULT 5.00,
ADD COLUMN IF NOT EXISTS "fundedDailyDrawdown" DECIMAL(5,2) DEFAULT 3.00,
ADD COLUMN IF NOT EXISTS "trailingDrawdownEnabled" BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS "minTradingDaysPhase1" INTEGER DEFAULT 4,
ADD COLUMN IF NOT EXISTS "minTradingDaysPhase2" INTEGER DEFAULT 4,
ADD COLUMN IF NOT EXISTS "maxTradingDaysPhase1" INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS "maxTradingDaysPhase2" INTEGER DEFAULT 60;

-- Add payout configuration
ALTER TABLE "public"."Account"
ADD COLUMN IF NOT EXISTS "initialProfitSplit" DECIMAL(5,2) DEFAULT 80.00,
ADD COLUMN IF NOT EXISTS "maxProfitSplit" DECIMAL(5,2) DEFAULT 90.00,
ADD COLUMN IF NOT EXISTS "profitSplitIncrementPerPayout" DECIMAL(5,2) DEFAULT 5.00,
ADD COLUMN IF NOT EXISTS "minPayoutAmount" DECIMAL(10,2) DEFAULT 50.00,
ADD COLUMN IF NOT EXISTS "maxPayoutAmount" DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS "payoutFrequencyDays" INTEGER DEFAULT 14,
ADD COLUMN IF NOT EXISTS "minDaysBeforeFirstPayout" INTEGER DEFAULT 7,
ADD COLUMN IF NOT EXISTS "resetOnPayout" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "scaleOnPayout" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "maxSimultaneousAccounts" INTEGER DEFAULT 1;

-- Add trading rules
ALTER TABLE "public"."Account"
ADD COLUMN IF NOT EXISTS "newsTradinAllowed" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "weekendHoldingAllowed" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "hedgingAllowed" BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS "eaAllowed" BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS "martingaleAllowed" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "maxLotSize" DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS "maxDailyLossStreak" INTEGER,
ADD COLUMN IF NOT EXISTS "maxPositions" INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS "consistencyRule" DECIMAL(5,2) DEFAULT 30.00;

-- Create comprehensive PropFirmPhase table
CREATE TABLE IF NOT EXISTS "public"."PropFirmPhase" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "phaseType" "AccountPhaseType" NOT NULL,
    "status" "PhaseStatus" NOT NULL DEFAULT 'pending',
    
    -- Phase-specific account details
    "brokerAccountId" TEXT NOT NULL,
    "brokerLogin" TEXT,
    "brokerPassword" TEXT,
    "brokerServer" TEXT,
    "startingBalance" DECIMAL(15,2) NOT NULL,
    "currentBalance" DECIMAL(15,2) NOT NULL,
    "currentEquity" DECIMAL(15,2) NOT NULL,
    "highWaterMark" DECIMAL(15,2) NOT NULL,
    
    -- Phase targets and limits
    "profitTarget" DECIMAL(15,2) NOT NULL,
    "profitTargetPercent" DECIMAL(5,2) NOT NULL,
    "maxDrawdownAmount" DECIMAL(15,2) NOT NULL,
    "maxDrawdownPercent" DECIMAL(5,2) NOT NULL,
    "dailyDrawdownAmount" DECIMAL(15,2) NOT NULL,
    "dailyDrawdownPercent" DECIMAL(5,2) NOT NULL,
    
    -- Phase progress tracking
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "daysTraded" INTEGER DEFAULT 0,
    "minTradingDays" INTEGER NOT NULL,
    "maxTradingDays" INTEGER,
    
    -- Statistics
    "totalTrades" INTEGER DEFAULT 0,
    "winningTrades" INTEGER DEFAULT 0,
    "losingTrades" INTEGER DEFAULT 0,
    "totalVolume" DECIMAL(15,2) DEFAULT 0,
    "totalCommission" DECIMAL(10,2) DEFAULT 0,
    "totalSwap" DECIMAL(10,2) DEFAULT 0,
    "bestTrade" DECIMAL(10,2) DEFAULT 0,
    "worstTrade" DECIMAL(10,2) DEFAULT 0,
    "currentStreak" INTEGER DEFAULT 0,
    "bestStreak" INTEGER DEFAULT 0,
    "worstStreak" INTEGER DEFAULT 0,
    
    -- Risk metrics
    "maxDrawdownEncountered" DECIMAL(10,2) DEFAULT 0,
    "maxDailyLoss" DECIMAL(10,2) DEFAULT 0,
    "avgTradeSize" DECIMAL(10,2) DEFAULT 0,
    "profitFactor" DECIMAL(10,4) DEFAULT 0,
    "winRate" DECIMAL(5,2) DEFAULT 0,
    "riskRewardRatio" DECIMAL(10,4) DEFAULT 0,
    
    -- Metadata
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropFirmPhase_pkey" PRIMARY KEY ("id")
);

-- Create DailyEquitySnapshot for detailed tracking
CREATE TABLE IF NOT EXISTS "public"."DailyEquitySnapshot" (
    "id" TEXT NOT NULL,
    "phaseId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "openingBalance" DECIMAL(15,2) NOT NULL,
    "closingBalance" DECIMAL(15,2) NOT NULL,
    "highWaterMark" DECIMAL(15,2) NOT NULL,
    "dailyPnL" DECIMAL(10,2) NOT NULL,
    "floatingPnL" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "commission" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "swap" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "volume" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "trades" INTEGER NOT NULL DEFAULT 0,
    "maxDrawdownFromHWM" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "dailyDrawdownUsed" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "maxDrawdownUsed" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "isBreached" BOOLEAN NOT NULL DEFAULT false,
    "breachType" TEXT,
    "breachAmount" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyEquitySnapshot_pkey" PRIMARY KEY ("id")
);

-- Create DrawdownBreach table
CREATE TABLE IF NOT EXISTS "public"."DrawdownBreach" (
    "id" TEXT NOT NULL,
    "phaseId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "breachType" "BreachType" NOT NULL,
    "breachAmount" DECIMAL(10,2) NOT NULL,
    "limitAmount" DECIMAL(10,2) NOT NULL,
    "equityAtBreach" DECIMAL(15,2) NOT NULL,
    "balanceAtBreach" DECIMAL(15,2) NOT NULL,
    "tradeIdTrigger" TEXT,
    "breachedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,

    CONSTRAINT "DrawdownBreach_pkey" PRIMARY KEY ("id")
);

-- Create PayoutRequest table
CREATE TABLE IF NOT EXISTS "public"."PayoutRequest" (
    "id" TEXT NOT NULL,
    "phaseId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "requestedAmount" DECIMAL(10,2) NOT NULL,
    "eligibleAmount" DECIMAL(10,2) NOT NULL,
    "profitSplitPercent" DECIMAL(5,2) NOT NULL,
    "traderShare" DECIMAL(10,2) NOT NULL,
    "firmShare" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "paymentMethod" TEXT,
    "paymentDetails" JSONB,
    "notes" TEXT,

    CONSTRAINT "PayoutRequest_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints
ALTER TABLE "public"."PropFirmPhase" ADD CONSTRAINT "PropFirmPhase_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."DailyEquitySnapshot" ADD CONSTRAINT "DailyEquitySnapshot_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "public"."PropFirmPhase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."DailyEquitySnapshot" ADD CONSTRAINT "DailyEquitySnapshot_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."DrawdownBreach" ADD CONSTRAINT "DrawdownBreach_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "public"."PropFirmPhase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."DrawdownBreach" ADD CONSTRAINT "DrawdownBreach_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."PayoutRequest" ADD CONSTRAINT "PayoutRequest_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "public"."PropFirmPhase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."PayoutRequest" ADD CONSTRAINT "PayoutRequest_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."PayoutRequest" ADD CONSTRAINT "PayoutRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Update Trade table to link to phases
ALTER TABLE "public"."Trade" ADD COLUMN IF NOT EXISTS "propFirmPhaseId" TEXT;
ALTER TABLE "public"."Trade" ADD CONSTRAINT "Trade_propFirmPhaseId_fkey" FOREIGN KEY ("propFirmPhaseId") REFERENCES "public"."PropFirmPhase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create comprehensive indexes for performance
CREATE INDEX IF NOT EXISTS "PropFirmPhase_accountId_idx" ON "public"."PropFirmPhase"("accountId");
CREATE INDEX IF NOT EXISTS "PropFirmPhase_status_idx" ON "public"."PropFirmPhase"("status");
CREATE INDEX IF NOT EXISTS "PropFirmPhase_phaseType_idx" ON "public"."PropFirmPhase"("phaseType");
CREATE INDEX IF NOT EXISTS "PropFirmPhase_brokerAccountId_idx" ON "public"."PropFirmPhase"("brokerAccountId");
CREATE UNIQUE INDEX IF NOT EXISTS "PropFirmPhase_accountId_phaseType_unique" ON "public"."PropFirmPhase"("accountId", "phaseType");

CREATE INDEX IF NOT EXISTS "DailyEquitySnapshot_phaseId_date_idx" ON "public"."DailyEquitySnapshot"("phaseId", "date");
CREATE INDEX IF NOT EXISTS "DailyEquitySnapshot_accountId_date_idx" ON "public"."DailyEquitySnapshot"("accountId", "date");
CREATE INDEX IF NOT EXISTS "DailyEquitySnapshot_date_idx" ON "public"."DailyEquitySnapshot"("date");
CREATE UNIQUE INDEX IF NOT EXISTS "DailyEquitySnapshot_phaseId_date_unique" ON "public"."DailyEquitySnapshot"("phaseId", "date");

CREATE INDEX IF NOT EXISTS "DrawdownBreach_phaseId_idx" ON "public"."DrawdownBreach"("phaseId");
CREATE INDEX IF NOT EXISTS "DrawdownBreach_accountId_idx" ON "public"."DrawdownBreach"("accountId");
CREATE INDEX IF NOT EXISTS "DrawdownBreach_breachedAt_idx" ON "public"."DrawdownBreach"("breachedAt");
CREATE INDEX IF NOT EXISTS "DrawdownBreach_isActive_idx" ON "public"."DrawdownBreach"("isActive");

CREATE INDEX IF NOT EXISTS "PayoutRequest_phaseId_idx" ON "public"."PayoutRequest"("phaseId");
CREATE INDEX IF NOT EXISTS "PayoutRequest_accountId_idx" ON "public"."PayoutRequest"("accountId");
CREATE INDEX IF NOT EXISTS "PayoutRequest_userId_idx" ON "public"."PayoutRequest"("userId");
CREATE INDEX IF NOT EXISTS "PayoutRequest_status_idx" ON "public"."PayoutRequest"("status");
CREATE INDEX IF NOT EXISTS "PayoutRequest_requestedAt_idx" ON "public"."PayoutRequest"("requestedAt");

CREATE INDEX IF NOT EXISTS "Trade_propFirmPhaseId_idx" ON "public"."Trade"("propFirmPhaseId");
CREATE INDEX IF NOT EXISTS "Trade_entryTime_idx" ON "public"."Trade"("entryTime");
CREATE INDEX IF NOT EXISTS "Trade_exitTime_idx" ON "public"."Trade"("exitTime");

-- Account indexes
CREATE INDEX IF NOT EXISTS "Account_firmType_idx" ON "public"."Account"("firmType");
CREATE INDEX IF NOT EXISTS "Account_status_firmType_idx" ON "public"."Account"("status", "firmType");
CREATE INDEX IF NOT EXISTS "Account_userId_status_idx" ON "public"."Account"("userId", "status");
