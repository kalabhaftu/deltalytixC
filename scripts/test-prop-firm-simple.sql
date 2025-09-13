-- Simple SQL test for Prop Firm Evaluation System
-- This script creates test data directly in the database

-- Create test user
INSERT INTO "public"."User" (id, email, name, "createdAt", "updatedAt") 
VALUES ('test-prop-user', 'test@propfirm.com', 'Test Prop User', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET "updatedAt" = NOW();

-- Create test prop firm account
INSERT INTO "public"."Account" (
    id, number, name, propfirm, "userId", "startingBalance", status,
    "dailyDrawdownAmount", "dailyDrawdownType", "maxDrawdownAmount", "maxDrawdownType",
    "drawdownModeMax", "evaluationType", timezone, "dailyResetTime",
    "ddIncludeOpenPnl", "progressionIncludeOpenPnl", "allowManualPhaseOverride",
    "profitSplitPercent", "payoutCycleDays", "minDaysToFirstPayout",
    "resetOnPayout", "reduceBalanceByPayout", "createdAt", "updatedAt"
) VALUES (
    'test-prop-account-id', 'PROP-001', 'Test Prop Account', 'TestFirm', 'test-prop-user',
    10000, 'active', 5, 'percent', 10, 'percent', 'static', 'two_step', 'UTC', '00:00',
    false, false, false, 80, 14, 4, false, true, NOW(), NOW()
) ON CONFLICT (id) DO UPDATE SET "updatedAt" = NOW();

-- Create initial Phase 1
INSERT INTO "public"."AccountPhase" (
    id, "accountId", "phaseType", "phaseStatus", "profitTarget", "phaseStartAt",
    "currentEquity", "currentBalance", "netProfitSincePhaseStart", 
    "highestEquitySincePhaseStart", "totalTrades", "winningTrades", "totalCommission",
    "createdAt", "updatedAt"
) VALUES (
    'test-phase-1-id', 'test-prop-account-id', 'phase_1', 'active', 800, NOW(),
    10000, 10000, 0, 10000, 0, 0, 0, NOW(), NOW()
) ON CONFLICT (id) DO UPDATE SET "updatedAt" = NOW();

-- Create daily anchors
INSERT INTO "public"."DailyAnchor" (id, "accountId", date, "anchorEquity", "computedAt")
VALUES 
    ('daily-anchor-1', 'test-prop-account-id', '2024-01-01', 10000, NOW()),
    ('daily-anchor-2', 'test-prop-account-id', '2024-01-02', 11000, NOW())
ON CONFLICT (id) DO UPDATE SET "anchorEquity" = EXCLUDED."anchorEquity";

-- Create test trades
INSERT INTO "public"."Trade" (
    id, "accountNumber", quantity, "entryId", "closeId", instrument, 
    "entryPrice", "closePrice", "entryDate", "closeDate", pnl, "timeInPosition",
    "userId", side, commission, "createdAt", comment, "videoUrl", tags,
    "imageBase64", "imageBase64Second", "imageBase64Third", "imageBase64Fourth", "groupId",
    "phaseId", "accountId", symbol, strategy, fees, "realizedPnl", "entryTime", "exitTime",
    "equityAtOpen", "equityAtClose", "rawBrokerId", "closeReason"
) VALUES 
-- Day 1: Two profitable trades (+$1000 total)
('trade-1', 'PROP-001', 1, null, null, 'ES', '4500.00', '4510.00', 
 '2024-01-01T09:00:00.000Z', '2024-01-01T10:00:00.000Z', 500, 1, 'test-prop-user', 
 'LONG', 4.5, NOW(), null, null, '{}', null, null, null, null, null,
 'test-phase-1-id', 'test-prop-account-id', 'ES', null, 4.5, 500, 
 '2024-01-01T09:00:00.000Z', '2024-01-01T10:00:00.000Z', null, null, null, null),

('trade-2', 'PROP-001', 1, null, null, 'ES', '4510.00', '4520.00', 
 '2024-01-01T11:00:00.000Z', '2024-01-01T12:00:00.000Z', 500, 1, 'test-prop-user', 
 'LONG', 4.5, NOW(), null, null, '{}', null, null, null, null, null,
 'test-phase-1-id', 'test-prop-account-id', 'ES', null, 4.5, 500, 
 '2024-01-01T11:00:00.000Z', '2024-01-01T12:00:00.000Z', null, null, null, null),

-- Day 2: Large losing trade (-$1000) - should trigger daily DD breach (5% = $550 limit based on $11k anchor)
('trade-3', 'PROP-001', 2, null, null, 'ES', '4520.00', '4515.00', 
 '2024-01-02T09:00:00.000Z', '2024-01-02T10:00:00.000Z', -1000, 1, 'test-prop-user', 
 'LONG', 9, NOW(), null, null, '{}', null, null, null, null, null,
 'test-phase-1-id', 'test-prop-account-id', 'ES', null, 9, -1000, 
 '2024-01-02T09:00:00.000Z', '2024-01-02T10:00:00.000Z', null, null, null, null)

ON CONFLICT (id) DO UPDATE SET pnl = EXCLUDED.pnl;

-- Check the data
SELECT 'Account Status:' as info, status, "startingBalance", "dailyDrawdownAmount" 
FROM "public"."Account" WHERE id = 'test-prop-account-id';

SELECT 'Phase Status:' as info, "phaseType", "phaseStatus", "profitTarget", "currentEquity"
FROM "public"."AccountPhase" WHERE "accountId" = 'test-prop-account-id';

SELECT 'Trades:' as info, "entryDate", pnl, "accountId", "phaseId" 
FROM "public"."Trade" WHERE "userId" = 'test-prop-user' ORDER BY "entryDate";

SELECT 'Daily Anchors:' as info, date, "anchorEquity" 
FROM "public"."DailyAnchor" WHERE "accountId" = 'test-prop-account-id' ORDER BY date;
