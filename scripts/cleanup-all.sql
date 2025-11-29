-- Complete Database Cleanup Script
-- Run this with: psql $DIRECT_URL -f scripts/cleanup-all.sql
-- Or use: npx prisma db execute --file scripts/cleanup-all.sql

-- Disable foreign key checks temporarily for faster cleanup
SET session_replication_role = 'replica';

-- Clear all tables in correct order (child tables first)
TRUNCATE TABLE public."BreachRecord" CASCADE;
TRUNCATE TABLE public."DailyAnchor" CASCADE;
TRUNCATE TABLE public."Payout" CASCADE;
TRUNCATE TABLE public."Trade" CASCADE;
TRUNCATE TABLE public."PhaseAccount" CASCADE;
TRUNCATE TABLE public."MasterAccount" CASCADE;
TRUNCATE TABLE public."LiveAccountTransaction" CASCADE;
TRUNCATE TABLE public."DailyNote" CASCADE;
TRUNCATE TABLE public."BacktestTrade" CASCADE;
TRUNCATE TABLE public."DashboardTemplate" CASCADE;
TRUNCATE TABLE public."TradeTag" CASCADE;
TRUNCATE TABLE public."TradingModel" CASCADE;
TRUNCATE TABLE public."WeeklyReview" CASCADE;
TRUNCATE TABLE public."Account" CASCADE;
TRUNCATE TABLE public."Group" CASCADE;
TRUNCATE TABLE public."User" CASCADE;

-- Re-enable foreign key checks
SET session_replication_role = 'origin';

-- Verify cleanup
SELECT 'BreachRecord' as table_name, COUNT(*) as row_count FROM public."BreachRecord"
UNION ALL SELECT 'DailyAnchor', COUNT(*) FROM public."DailyAnchor"
UNION ALL SELECT 'Payout', COUNT(*) FROM public."Payout"
UNION ALL SELECT 'Trade', COUNT(*) FROM public."Trade"
UNION ALL SELECT 'PhaseAccount', COUNT(*) FROM public."PhaseAccount"
UNION ALL SELECT 'MasterAccount', COUNT(*) FROM public."MasterAccount"
UNION ALL SELECT 'LiveAccountTransaction', COUNT(*) FROM public."LiveAccountTransaction"
UNION ALL SELECT 'DailyNote', COUNT(*) FROM public."DailyNote"
UNION ALL SELECT 'BacktestTrade', COUNT(*) FROM public."BacktestTrade"
UNION ALL SELECT 'DashboardTemplate', COUNT(*) FROM public."DashboardTemplate"
UNION ALL SELECT 'TradeTag', COUNT(*) FROM public."TradeTag"
UNION ALL SELECT 'TradingModel', COUNT(*) FROM public."TradingModel"
UNION ALL SELECT 'WeeklyReview', COUNT(*) FROM public."WeeklyReview"
UNION ALL SELECT 'Account', COUNT(*) FROM public."Account"
UNION ALL SELECT 'Group', COUNT(*) FROM public."Group"
UNION ALL SELECT 'User', COUNT(*) FROM public."User";

SELECT '✅ Database cleanup complete!' as status;

