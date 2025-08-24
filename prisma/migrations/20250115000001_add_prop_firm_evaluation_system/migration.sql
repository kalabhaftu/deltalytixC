-- Prop Firm Evaluation System Migration
-- This migration adds comprehensive support for prop firm account evaluation phases,
-- drawdown tracking, payout management, and business rules compliance.

-- First, create the enums
CREATE TYPE "public"."AccountStatus" AS ENUM ('active', 'failed', 'passed', 'funded');
CREATE TYPE "public"."PhaseType" AS ENUM ('phase_1', 'phase_2', 'funded');
CREATE TYPE "public"."PhaseStatus" AS ENUM ('active', 'passed', 'failed');
CREATE TYPE "public"."DrawdownType" AS ENUM ('absolute', 'percent');
CREATE TYPE "public"."DrawdownMode" AS ENUM ('static', 'trailing');
CREATE TYPE "public"."EvaluationType" AS ENUM ('one_step', 'two_step');
CREATE TYPE "public"."BreachType" AS ENUM ('daily_drawdown', 'max_drawdown');

-- Extend the Account table with new evaluation fields
ALTER TABLE "public"."Account" ADD COLUMN "name" TEXT;
ALTER TABLE "public"."Account" ADD COLUMN "daily_drawdown_amount" DOUBLE PRECISION;
ALTER TABLE "public"."Account" ADD COLUMN "daily_drawdown_type" "public"."DrawdownType" DEFAULT 'percent';
ALTER TABLE "public"."Account" ADD COLUMN "max_drawdown_amount" DOUBLE PRECISION;
ALTER TABLE "public"."Account" ADD COLUMN "max_drawdown_type" "public"."DrawdownType" DEFAULT 'percent';
ALTER TABLE "public"."Account" ADD COLUMN "drawdown_mode_max" "public"."DrawdownMode" DEFAULT 'static';
ALTER TABLE "public"."Account" ADD COLUMN "evaluation_type" "public"."EvaluationType" DEFAULT 'two_step';
ALTER TABLE "public"."Account" ADD COLUMN "timezone" TEXT DEFAULT 'UTC';
ALTER TABLE "public"."Account" ADD COLUMN "daily_reset_time" TEXT DEFAULT '00:00';
ALTER TABLE "public"."Account" ADD COLUMN "status" "public"."AccountStatus" DEFAULT 'active';

-- Config flags for business rules
ALTER TABLE "public"."Account" ADD COLUMN "dd_include_open_pnl" BOOLEAN DEFAULT false;
ALTER TABLE "public"."Account" ADD COLUMN "progression_include_open_pnl" BOOLEAN DEFAULT false;
ALTER TABLE "public"."Account" ADD COLUMN "allow_manual_phase_override" BOOLEAN DEFAULT false;

-- Funded account payout configuration
ALTER TABLE "public"."Account" ADD COLUMN "profit_split_percent" DOUBLE PRECISION DEFAULT 80;
ALTER TABLE "public"."Account" ADD COLUMN "payout_cycle_days" INTEGER DEFAULT 14;
ALTER TABLE "public"."Account" ADD COLUMN "min_days_to_first_payout" INTEGER DEFAULT 4;
ALTER TABLE "public"."Account" ADD COLUMN "payout_eligibility_min_profit" DOUBLE PRECISION;
ALTER TABLE "public"."Account" ADD COLUMN "reset_on_payout" BOOLEAN DEFAULT false;
ALTER TABLE "public"."Account" ADD COLUMN "reduce_balance_by_payout" BOOLEAN DEFAULT true;
ALTER TABLE "public"."Account" ADD COLUMN "funded_reset_balance" DOUBLE PRECISION;

-- Create AccountPhase table
CREATE TABLE "public"."AccountPhase" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "phaseType" "public"."PhaseType" NOT NULL,
    "phaseStatus" "public"."PhaseStatus" NOT NULL DEFAULT 'active',
    "profitTarget" DOUBLE PRECISION,
    "phaseStartAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "phaseEndAt" TIMESTAMP(3),
    
    -- Running stats snapshot for fast rendering
    "currentEquity" DOUBLE PRECISION DEFAULT 0,
    "currentBalance" DOUBLE PRECISION DEFAULT 0,
    "netProfitSincePhaseStart" DOUBLE PRECISION DEFAULT 0,
    "highestEquitySincePhaseStart" DOUBLE PRECISION DEFAULT 0,
    "totalTrades" INTEGER DEFAULT 0,
    "winningTrades" INTEGER DEFAULT 0,
    "totalCommission" DOUBLE PRECISION DEFAULT 0,
    
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountPhase_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraint for AccountPhase
ALTER TABLE "public"."AccountPhase" ADD CONSTRAINT "AccountPhase_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add phase tracking to Trade table
ALTER TABLE "public"."Trade" ADD COLUMN "phaseId" TEXT;
ALTER TABLE "public"."Trade" ADD COLUMN "accountId" TEXT;
ALTER TABLE "public"."Trade" ADD COLUMN "symbol" TEXT;
ALTER TABLE "public"."Trade" ADD COLUMN "strategy" TEXT;
ALTER TABLE "public"."Trade" ADD COLUMN "fees" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "public"."Trade" ADD COLUMN "realizedPnl" DOUBLE PRECISION;
ALTER TABLE "public"."Trade" ADD COLUMN "entryTime" TIMESTAMP(3);
ALTER TABLE "public"."Trade" ADD COLUMN "exitTime" TIMESTAMP(3);
ALTER TABLE "public"."Trade" ADD COLUMN "equityAtOpen" DOUBLE PRECISION;
ALTER TABLE "public"."Trade" ADD COLUMN "equityAtClose" DOUBLE PRECISION;
ALTER TABLE "public"."Trade" ADD COLUMN "rawBrokerId" TEXT;

-- Add foreign key constraint for Trade to AccountPhase
ALTER TABLE "public"."Trade" ADD CONSTRAINT "Trade_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "public"."AccountPhase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."Trade" ADD CONSTRAINT "Trade_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Extend Payout table
ALTER TABLE "public"."Payout" ADD COLUMN "amountRequested" DOUBLE PRECISION;
ALTER TABLE "public"."Payout" ADD COLUMN "amountPaid" DOUBLE PRECISION;
ALTER TABLE "public"."Payout" ADD COLUMN "requestedAt" TIMESTAMP(3);
ALTER TABLE "public"."Payout" ADD COLUMN "paidAt" TIMESTAMP(3);
ALTER TABLE "public"."Payout" ADD COLUMN "notes" TEXT;

-- Rename existing columns to match new schema
ALTER TABLE "public"."Payout" RENAME COLUMN "amount" TO "amountRequested_old";
ALTER TABLE "public"."Payout" RENAME COLUMN "date" TO "requestedAt_old";

-- Create Breach table
CREATE TABLE "public"."Breach" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "phaseId" TEXT,
    "breachType" "public"."BreachType" NOT NULL,
    "breachAmount" DOUBLE PRECISION NOT NULL,
    "breachThreshold" DOUBLE PRECISION NOT NULL,
    "equity" DOUBLE PRECISION NOT NULL,
    "breachTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Breach_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints for Breach
ALTER TABLE "public"."Breach" ADD CONSTRAINT "Breach_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."Breach" ADD CONSTRAINT "Breach_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "public"."AccountPhase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create DailyAnchor table for daily drawdown tracking
CREATE TABLE "public"."DailyAnchor" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "anchorEquity" DOUBLE PRECISION NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyAnchor_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraint and unique constraint for DailyAnchor
ALTER TABLE "public"."DailyAnchor" ADD CONSTRAINT "DailyAnchor_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create EquitySnapshot table for charts and tracking
CREATE TABLE "public"."EquitySnapshot" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "phaseId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "equity" DOUBLE PRECISION NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL,
    "openPnl" DOUBLE PRECISION DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EquitySnapshot_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints for EquitySnapshot
ALTER TABLE "public"."EquitySnapshot" ADD CONSTRAINT "EquitySnapshot_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."EquitySnapshot" ADD CONSTRAINT "EquitySnapshot_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "public"."AccountPhase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create AccountTransition table for audit trail
CREATE TABLE "public"."AccountTransition" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "fromPhaseId" TEXT,
    "toPhaseId" TEXT,
    "fromStatus" "public"."AccountStatus",
    "toStatus" "public"."AccountStatus",
    "reason" TEXT,
    "triggeredBy" TEXT, -- userId who triggered the transition
    "transitionTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB DEFAULT '{}',

    CONSTRAINT "AccountTransition_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints for AccountTransition
ALTER TABLE "public"."AccountTransition" ADD CONSTRAINT "AccountTransition_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."AccountTransition" ADD CONSTRAINT "AccountTransition_fromPhaseId_fkey" FOREIGN KEY ("fromPhaseId") REFERENCES "public"."AccountPhase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."AccountTransition" ADD CONSTRAINT "AccountTransition_toPhaseId_fkey" FOREIGN KEY ("toPhaseId") REFERENCES "public"."AccountPhase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create AuditLog table for comprehensive audit trail
CREATE TABLE "public"."AuditLog" (
    "id" TEXT NOT NULL,
    "accountId" TEXT,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL, -- e.g., 'account', 'phase', 'trade', 'payout'
    "entityId" TEXT,
    "oldValues" JSONB,
    "newValues" JSONB,
    "metadata" JSONB DEFAULT '{}',
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints for AuditLog
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create indexes for performance
CREATE INDEX "AccountPhase_accountId_idx" ON "public"."AccountPhase"("accountId");
CREATE INDEX "AccountPhase_phaseType_idx" ON "public"."AccountPhase"("phaseType");
CREATE INDEX "AccountPhase_phaseStatus_idx" ON "public"."AccountPhase"("phaseStatus");

CREATE INDEX "Trade_phaseId_idx" ON "public"."Trade"("phaseId");
CREATE INDEX "Trade_accountId_idx" ON "public"."Trade"("accountId");
CREATE INDEX "Trade_entryTime_idx" ON "public"."Trade"("entryTime");
CREATE INDEX "Trade_symbol_idx" ON "public"."Trade"("symbol");

CREATE INDEX "Breach_accountId_idx" ON "public"."Breach"("accountId");
CREATE INDEX "Breach_phaseId_idx" ON "public"."Breach"("phaseId");
CREATE INDEX "Breach_breachTime_idx" ON "public"."Breach"("breachTime");

CREATE UNIQUE INDEX "DailyAnchor_accountId_date_key" ON "public"."DailyAnchor"("accountId", "date");
CREATE INDEX "DailyAnchor_date_idx" ON "public"."DailyAnchor"("date");

CREATE INDEX "EquitySnapshot_accountId_idx" ON "public"."EquitySnapshot"("accountId");
CREATE INDEX "EquitySnapshot_phaseId_idx" ON "public"."EquitySnapshot"("phaseId");
CREATE INDEX "EquitySnapshot_timestamp_idx" ON "public"."EquitySnapshot"("timestamp");

CREATE INDEX "AccountTransition_accountId_idx" ON "public"."AccountTransition"("accountId");
CREATE INDEX "AccountTransition_transitionTime_idx" ON "public"."AccountTransition"("transitionTime");

CREATE INDEX "AuditLog_accountId_idx" ON "public"."AuditLog"("accountId");
CREATE INDEX "AuditLog_userId_idx" ON "public"."AuditLog"("userId");
CREATE INDEX "AuditLog_timestamp_idx" ON "public"."AuditLog"("timestamp");
CREATE INDEX "AuditLog_entity_entityId_idx" ON "public"."AuditLog"("entity", "entityId");

-- Add account status index
CREATE INDEX "Account_status_idx" ON "public"."Account"("status");
CREATE INDEX "Account_evaluation_type_idx" ON "public"."Account"("evaluation_type");


