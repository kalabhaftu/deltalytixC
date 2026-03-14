/**
 * GET /api/paths - API route index
 * Returns a list of all API paths for documentation and health checks.
 * Used by scripts/test-api-routes.js and to prevent 404s from tooling (e.g. Chrome DevTools).
 */

import { NextResponse } from 'next/server'

const PATHS = [
  '/api',
  '/api/auth/check',
  '/api/auth/callback',
  '/api/auth/profile',
  '/api/auth/delete-account',
  '/api/settings/account-filters',
  '/api/settings/backtest-mode',
  '/api/tags',
  '/api/tags/[id]',
  '/api/user/trading-models',
  '/api/user/trading-models/[id]',
  '/api/user/data',
  '/api/user/data/backup',
  '/api/user/goals',
  '/api/dashboard/stats',
  '/api/v1/init',
  '/api/v1/trades',
  '/api/v1/reports/stats',
  '/api/news-events',
  '/api/notifications',
  '/api/notifications/[id]',
  '/api/prop-firm-templates',
  '/api/prop-firm/accounts',
  '/api/prop-firm/accounts/[id]',
  '/api/prop-firm/accounts/[id]/trades',
  '/api/prop-firm/accounts/[id]/payouts',
  '/api/prop-firm/accounts/[id]/transition',
  '/api/prop-firm/accounts/validate-trade',
  '/api/prop-firm/payouts',
  '/api/prop-firm/payouts/[id]',
  '/api/accounts',
  '/api/accounts/[id]',
  '/api/accounts/[id]/trades',
  '/api/live-accounts/[id]/transactions',
  '/api/journal/list',
  '/api/journal/daily',
  '/api/journal/daily/[id]',
  '/api/journal/ai-analysis',
  '/api/calendar/notes',
  '/api/data/import',
  '/api/data/export',
  '/api/trades',
  '/api/trades/quick-add',
  '/api/ai/format-trades',
  '/api/ai/mappings',
  '/api/backtesting',
  '/api/health/edge',
  '/api/build-id',
  '/api/cron/daily-anchors',
  '/api/cron/evaluate-phases',
]

export async function GET() {
  return NextResponse.json({
    paths: PATHS,
    count: PATHS.length,
    note: 'Use scripts/test-api-routes.js to test all routes.',
  })
}
