-- Performance Optimization: Add indexes for frequently queried columns

-- Trade table indexes for common query patterns
-- Index for user + created date queries (dashboard stats, recent trades)
CREATE INDEX IF NOT EXISTS "idx_trade_user_created" 
ON "public"."Trade"("userId", "createdAt" DESC);

-- Index for account + created date queries (account-specific trade lists)
CREATE INDEX IF NOT EXISTS "idx_trade_account_created" 
ON "public"."Trade"("accountNumber", "createdAt" DESC);

-- Index for user + account + created date (filtered account queries)
CREATE INDEX IF NOT EXISTS "idx_trade_user_account_created" 
ON "public"."Trade"("userId", "accountNumber", "createdAt" DESC);

-- Index for entry time queries (trade timeline analysis)
CREATE INDEX IF NOT EXISTS "idx_trade_entry_time" 
ON "public"."Trade"("entryTime" DESC) WHERE "entryTime" IS NOT NULL;

-- Index for symbol-based queries (instrument analysis)
CREATE INDEX IF NOT EXISTS "idx_trade_symbol_user" 
ON "public"."Trade"("symbol", "userId") WHERE "symbol" IS NOT NULL;

-- Account table indexes
-- Index for user + group queries (account filtering)
CREATE INDEX IF NOT EXISTS "idx_account_user_group" 
ON "public"."Account"("userId", "groupId");

-- Index for number lookups (frequently used in joins)
CREATE INDEX IF NOT EXISTS "idx_account_number_user" 
ON "public"."Account"("number", "userId");

-- MasterAccount indexes for prop firm features
-- Index for user + status queries (active account filtering)
CREATE INDEX IF NOT EXISTS "idx_master_account_user_status" 
ON "public"."MasterAccount"("userId", "status", "isActive");

-- Index for active accounts lookup
CREATE INDEX IF NOT EXISTS "idx_master_account_active" 
ON "public"."MasterAccount"("userId", "isActive", "currentPhase") WHERE "isActive" = true;

-- PhaseAccount indexes
-- Index for master account + phase queries
CREATE INDEX IF NOT EXISTS "idx_phase_account_master_phase" 
ON "public"."PhaseAccount"("masterAccountId", "phaseNumber", "status");

-- Index for active phases
CREATE INDEX IF NOT EXISTS "idx_phase_account_active" 
ON "public"."PhaseAccount"("masterAccountId", "status") WHERE "status" = 'active';

-- DailyAnchor indexes for daily drawdown calculations
CREATE INDEX IF NOT EXISTS "idx_daily_anchor_phase_date" 
ON "public"."DailyAnchor"("phaseAccountId", "date" DESC);

-- BacktestTrade indexes for backtesting features
CREATE INDEX IF NOT EXISTS "idx_backtest_user_date" 
ON "public"."BacktestTrade"("userId", "dateExecuted" DESC);

CREATE INDEX IF NOT EXISTS "idx_backtest_user_outcome" 
ON "public"."BacktestTrade"("userId", "outcome");

-- DailyNote indexes for calendar features
CREATE INDEX IF NOT EXISTS "idx_daily_note_user_date" 
ON "public"."DailyNote"("userId", "date" DESC);

-- Comments on indexes for documentation
COMMENT ON INDEX "idx_trade_user_created" IS 'Optimizes dashboard stats and recent trades queries';
COMMENT ON INDEX "idx_trade_account_created" IS 'Optimizes account-specific trade list queries';
COMMENT ON INDEX "idx_account_user_group" IS 'Optimizes account filtering by group';
COMMENT ON INDEX "idx_master_account_user_status" IS 'Optimizes prop firm account filtering';
COMMENT ON INDEX "idx_phase_account_master_phase" IS 'Optimizes phase account lookups';


