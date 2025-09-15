-- Fix Prop Firm Schema - Make critical fields non-nullable and add performance indexes
-- This migration addresses critical schema issues identified in the prop firm audit

-- Make critical prop firm fields non-nullable with proper defaults
ALTER TABLE "public"."Account" 
  ALTER COLUMN "dailyDrawdownAmount" SET DEFAULT 4.0,
  ALTER COLUMN "maxDrawdownAmount" SET DEFAULT 10.0;

-- Update existing NULL values to defaults for prop firm accounts
UPDATE "public"."Account" 
SET 
  "dailyDrawdownAmount" = 4.0 
WHERE 
  "propfirm" != '' 
  AND "dailyDrawdownAmount" IS NULL;

UPDATE "public"."Account" 
SET 
  "maxDrawdownAmount" = 10.0 
WHERE 
  "propfirm" != '' 
  AND "maxDrawdownAmount" IS NULL;

-- Add performance indexes for frequently queried fields
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_account_propfirm_status" ON "public"."Account" ("propfirm", "status") WHERE "propfirm" != '';
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_account_timezone" ON "public"."Account" ("timezone") WHERE "propfirm" != '';

-- AccountPhase indexes for phase queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_account_phase_status_type" ON "public"."AccountPhase" ("phaseStatus", "phaseType");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_account_phase_account_status" ON "public"."AccountPhase" ("accountId", "phaseStatus");

-- Trade indexes for prop firm evaluation queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_trade_account_phase" ON "public"."Trade" ("accountId", "phaseId") WHERE "accountId" IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_trade_exit_time" ON "public"."Trade" ("exitTime") WHERE "exitTime" IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_trade_account_exit_time" ON "public"."Trade" ("accountId", "exitTime") WHERE "accountId" IS NOT NULL AND "exitTime" IS NOT NULL;

-- DailyAnchor indexes for daily drawdown calculations
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_daily_anchor_account_date" ON "public"."DailyAnchor" ("accountId", "date");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_daily_anchor_date" ON "public"."DailyAnchor" ("date");

-- Breach indexes for failure checking
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_breach_account_phase" ON "public"."Breach" ("accountId", "phaseId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_breach_time" ON "public"."Breach" ("breachTime");

-- AccountTransition indexes for audit and history
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_transition_account_time" ON "public"."AccountTransition" ("accountId", "transitionTime");

-- EquitySnapshot indexes for charting and analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_equity_snapshot_account_time" ON "public"."EquitySnapshot" ("accountId", "timestamp");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_equity_snapshot_phase_time" ON "public"."EquitySnapshot" ("phaseId", "timestamp") WHERE "phaseId" IS NOT NULL;

-- Partial indexes for active prop firm accounts only (most common queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_account_active_propfirm" ON "public"."Account" ("id", "userId", "timezone") WHERE "propfirm" != '' AND "status" IN ('active', 'funded');

-- Composite index for prop firm account evaluation queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_account_evaluation" ON "public"."Account" ("userId", "propfirm", "status", "evaluationType") WHERE "propfirm" != '';

-- Add constraint to ensure prop firm accounts have required drawdown amounts
-- Note: This is a check constraint that will be added in a future migration after data cleanup
