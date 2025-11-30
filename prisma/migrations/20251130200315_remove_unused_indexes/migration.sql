-- DropUnusedIndexes
-- This migration removes unused indexes identified by Supabase's database linter

-- BacktestTrade
DROP INDEX IF EXISTS "BacktestTrade_userId_model_idx";

-- DailyAnchor
DROP INDEX IF EXISTS "DailyAnchor_date_idx";

-- DailyNote
DROP INDEX IF EXISTS "DailyNote_accountId_idx";

-- DashboardTemplate
DROP INDEX IF EXISTS "DashboardTemplate_userId_idx";
DROP INDEX IF EXISTS "DashboardTemplate_userId_isDefault_idx";

-- LiveAccountTransaction
DROP INDEX IF EXISTS "LiveAccountTransaction_accountId_createdAt_idx";

-- PhaseAccount
DROP INDEX IF EXISTS "PhaseAccount_masterAccountId_phaseNumber_idx";

-- Trade
DROP INDEX IF EXISTS "Trade_accountId_exitTime_idx";
DROP INDEX IF EXISTS "Trade_accountId_idx";
DROP INDEX IF EXISTS "Trade_accountId_phaseAccountId_idx";
DROP INDEX IF EXISTS "Trade_entryId_idx";
DROP INDEX IF EXISTS "Trade_exitTime_idx";
DROP INDEX IF EXISTS "Trade_groupId_idx";
DROP INDEX IF EXISTS "Trade_modelId_idx";
DROP INDEX IF EXISTS "Trade_symbol_idx";
DROP INDEX IF EXISTS "Trade_userId_accountNumber_id_idx";

-- TradingModel
DROP INDEX IF EXISTS "TradingModel_userId_idx";

-- WeeklyReview
DROP INDEX IF EXISTS "WeeklyReview_userId_idx";
