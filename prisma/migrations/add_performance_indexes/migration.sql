-- Performance optimization indexes for Deltalytix

-- Trade table optimizations
CREATE INDEX IF NOT EXISTS "Trade_userId_entryDate_idx" ON "Trade"("userId", "entryDate" DESC);
CREATE INDEX IF NOT EXISTS "Trade_accountNumber_entryDate_idx" ON "Trade"("accountNumber", "entryDate" DESC);
CREATE INDEX IF NOT EXISTS "Trade_instrument_entryDate_idx" ON "Trade"("instrument", "entryDate" DESC);
CREATE INDEX IF NOT EXISTS "Trade_pnl_idx" ON "Trade"("pnl");
CREATE INDEX IF NOT EXISTS "Trade_timeInPosition_idx" ON "Trade"("timeInPosition");
CREATE INDEX IF NOT EXISTS "Trade_commission_idx" ON "Trade"("commission");
CREATE INDEX IF NOT EXISTS "Trade_side_idx" ON "Trade"("side");
CREATE INDEX IF NOT EXISTS "Trade_tags_idx" ON "Trade" USING GIN ("tags");
CREATE INDEX IF NOT EXISTS "Trade_groupId_entryDate_idx" ON "Trade"("groupId", "entryDate" DESC);

-- Composite indexes for common filter combinations
CREATE INDEX IF NOT EXISTS "Trade_userId_accountNumber_entryDate_idx" ON "Trade"("userId", "accountNumber", "entryDate" DESC);
CREATE INDEX IF NOT EXISTS "Trade_userId_instrument_entryDate_idx" ON "Trade"("userId", "instrument", "entryDate" DESC);
CREATE INDEX IF NOT EXISTS "Trade_userId_pnl_entryDate_idx" ON "Trade"("userId", "pnl", "entryDate" DESC);

-- Account table optimizations
CREATE INDEX IF NOT EXISTS "Account_userId_propfirm_idx" ON "Account"("userId", "propfirm");
CREATE INDEX IF NOT EXISTS "Account_groupId_userId_idx" ON "Account"("groupId", "userId");
CREATE INDEX IF NOT EXISTS "Account_resetDate_idx" ON "Account"("resetDate") WHERE "resetDate" IS NOT NULL;

-- User table optimizations
CREATE INDEX IF NOT EXISTS "User_lastLoginAt_idx" ON "User"("lastLoginAt") WHERE "lastLoginAt" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "User_loginAttempts_lockedUntil_idx" ON "User"("loginAttempts", "lockedUntil");
CREATE INDEX IF NOT EXISTS "User_twoFactorEnabled_idx" ON "User"("twoFactorEnabled") WHERE "twoFactorEnabled" = true;

-- Mood table optimizations
CREATE INDEX IF NOT EXISTS "Mood_userId_day_idx" ON "Mood"("userId", "day" DESC);
CREATE INDEX IF NOT EXISTS "Mood_day_userId_idx" ON "Mood"("day" DESC, "userId");

-- Payout table optimizations
CREATE INDEX IF NOT EXISTS "Payout_accountId_date_idx" ON "Payout"("accountId", "date" DESC);
CREATE INDEX IF NOT EXISTS "Payout_accountNumber_date_idx" ON "Payout"("accountNumber", "date" DESC);
CREATE INDEX IF NOT EXISTS "Payout_status_date_idx" ON "Payout"("status", "date" DESC);

-- Group table optimizations
CREATE INDEX IF NOT EXISTS "Group_userId_name_idx" ON "Group"("userId", "name");

-- Notification table optimizations
CREATE INDEX IF NOT EXISTS "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt" DESC);

-- Tag table optimizations
CREATE INDEX IF NOT EXISTS "Tag_userId_name_idx" ON "Tag"("userId", "name");

-- Post table optimizations
CREATE INDEX IF NOT EXISTS "Post_type_status_createdAt_idx" ON "Post"("type", "status", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Post_userId_createdAt_idx" ON "Post"("userId", "createdAt" DESC);

-- Comment table optimizations
CREATE INDEX IF NOT EXISTS "Comment_postId_createdAt_idx" ON "Comment"("postId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Comment_userId_createdAt_idx" ON "Comment"("userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Comment_parentId_createdAt_idx" ON "Comment"("parentId", "createdAt" DESC) WHERE "parentId" IS NOT NULL;

-- Vote table optimizations
CREATE INDEX IF NOT EXISTS "Vote_postId_type_createdAt_idx" ON "Vote"("postId", "type", "createdAt" DESC);

-- Order table optimizations
CREATE INDEX IF NOT EXISTS "Order_userId_accountId_time_idx" ON "Order"("userId", "accountId", "time" DESC);
CREATE INDEX IF NOT EXISTS "Order_symbol_time_idx" ON "Order"("symbol", "time" DESC);

-- FinancialEvent table optimizations
CREATE INDEX IF NOT EXISTS "FinancialEvent_date_importance_idx" ON "FinancialEvent"("date" DESC, "importance");
CREATE INDEX IF NOT EXISTS "FinancialEvent_country_date_idx" ON "FinancialEvent"("country", "date" DESC);
CREATE INDEX IF NOT EXISTS "FinancialEvent_lang_date_idx" ON "FinancialEvent"("lang", "date" DESC);

-- AuditLog table optimizations
CREATE INDEX IF NOT EXISTS "AuditLog_userId_timestamp_idx" ON "AuditLog"("userId", "timestamp" DESC);
CREATE INDEX IF NOT EXISTS "AuditLog_action_timestamp_idx" ON "AuditLog"("action", "timestamp" DESC);
CREATE INDEX IF NOT EXISTS "AuditLog_riskLevel_timestamp_idx" ON "AuditLog"("riskLevel", "timestamp" DESC);
CREATE INDEX IF NOT EXISTS "AuditLog_ipAddress_timestamp_idx" ON "AuditLog"("ipAddress", "timestamp" DESC);

-- SecurityEvent table optimizations
CREATE INDEX IF NOT EXISTS "SecurityEvent_type_severity_createdAt_idx" ON "SecurityEvent"("type", "severity", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "SecurityEvent_source_createdAt_idx" ON "SecurityEvent"("source", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "SecurityEvent_resolved_severity_idx" ON "SecurityEvent"("resolved", "severity") WHERE "resolved" = false;

-- TradeAnalytics table optimizations
CREATE INDEX IF NOT EXISTS "TradeAnalytics_tradeId_computedAt_idx" ON "TradeAnalytics"("tradeId", "computedAt" DESC);
CREATE INDEX IF NOT EXISTS "TradeAnalytics_mae_mfe_idx" ON "TradeAnalytics"("mae", "mfe");

-- HistoricalData table optimizations
CREATE INDEX IF NOT EXISTS "HistoricalData_symbol_timestamp_idx" ON "HistoricalData"("symbol", "timestamp" DESC);
CREATE INDEX IF NOT EXISTS "HistoricalData_databentSymbol_timestamp_idx" ON "HistoricalData"("databentSymbol", "timestamp" DESC);

-- Shared table optimizations
CREATE INDEX IF NOT EXISTS "Shared_userId_createdAt_idx" ON "Shared"("userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Shared_isPublic_createdAt_idx" ON "Shared"("isPublic", "createdAt" DESC) WHERE "isPublic" = true;
CREATE INDEX IF NOT EXISTS "Shared_expiresAt_idx" ON "Shared"("expiresAt") WHERE "expiresAt" IS NOT NULL;

-- Newsletter table optimizations
CREATE INDEX IF NOT EXISTS "Newsletter_isActive_idx" ON "Newsletter"("isActive") WHERE "isActive" = true;

-- Materialized views for common aggregations (PostgreSQL specific)
-- These can significantly speed up dashboard queries

-- Daily trade summary materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS daily_trade_summary AS
SELECT 
    "userId",
    "accountNumber",
    DATE("entryDate") as trade_date,
    COUNT(*) as trade_count,
    SUM("pnl") as total_pnl,
    SUM("commission") as total_commission,
    AVG("pnl") as avg_pnl,
    SUM(CASE WHEN "pnl" > 0 THEN 1 ELSE 0 END) as winning_trades,
    SUM(CASE WHEN "pnl" < 0 THEN 1 ELSE 0 END) as losing_trades,
    SUM(CASE WHEN "pnl" = 0 THEN 1 ELSE 0 END) as breakeven_trades,
    MAX("pnl") as best_trade,
    MIN("pnl") as worst_trade,
    AVG("timeInPosition") as avg_time_in_position
FROM "Trade"
GROUP BY "userId", "accountNumber", DATE("entryDate");

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS "daily_trade_summary_userId_date_idx" ON daily_trade_summary("userId", trade_date DESC);
CREATE INDEX IF NOT EXISTS "daily_trade_summary_accountNumber_date_idx" ON daily_trade_summary("accountNumber", trade_date DESC);

-- Monthly account summary materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS monthly_account_summary AS
SELECT 
    "userId",
    "accountNumber",
    DATE_TRUNC('month', "entryDate"::date) as month,
    COUNT(*) as total_trades,
    SUM("pnl") as total_pnl,
    SUM("commission") as total_commission,
    SUM(CASE WHEN "pnl" > 0 THEN 1 ELSE 0 END) as winning_trades,
    ROUND(
        (SUM(CASE WHEN "pnl" > 0 THEN 1 ELSE 0 END)::decimal / COUNT(*)) * 100, 2
    ) as win_rate
FROM "Trade"
GROUP BY "userId", "accountNumber", DATE_TRUNC('month', "entryDate"::date);

-- Create index on monthly summary
CREATE INDEX IF NOT EXISTS "monthly_account_summary_userId_month_idx" ON monthly_account_summary("userId", month DESC);

-- Instrument performance materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS instrument_performance AS
SELECT 
    "userId",
    "instrument",
    COUNT(*) as trade_count,
    SUM("pnl") as total_pnl,
    AVG("pnl") as avg_pnl,
    SUM(CASE WHEN "pnl" > 0 THEN 1 ELSE 0 END) as winning_trades,
    ROUND(
        (SUM(CASE WHEN "pnl" > 0 THEN 1 ELSE 0 END)::decimal / COUNT(*)) * 100, 2
    ) as win_rate,
    MAX("pnl") as best_trade,
    MIN("pnl") as worst_trade
FROM "Trade"
GROUP BY "userId", "instrument";

-- Create index on instrument performance
CREATE INDEX IF NOT EXISTS "instrument_performance_userId_instrument_idx" ON instrument_performance("userId", "instrument");

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_trade_summaries()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY daily_trade_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_account_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY instrument_performance;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON INDEX "Trade_userId_entryDate_idx" IS 'Primary index for user trade queries ordered by date';
COMMENT ON INDEX "Trade_accountNumber_entryDate_idx" IS 'Index for account-specific trade queries';
COMMENT ON INDEX "Trade_tags_idx" IS 'GIN index for tag-based queries using array operations';
COMMENT ON MATERIALIZED VIEW daily_trade_summary IS 'Precomputed daily trading statistics for faster dashboard loading';
COMMENT ON FUNCTION refresh_trade_summaries IS 'Function to refresh all trading summary materialized views';
