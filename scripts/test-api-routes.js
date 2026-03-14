#!/usr/bin/env node
/**
 * API Route Health Check Script
 *
 * Tests all API routes and reports status codes.
 * Run with: node scripts/test-api-routes.js [baseUrl]
 *
 * Usage:
 *   npm run dev          # In one terminal
 *   node scripts/test-api-routes.js http://localhost:3000   # In another
 *
 * Or add to package.json: "test:api": "node scripts/test-api-routes.js http://localhost:3000"
 */

const BASE_URL = process.argv[2] || 'http://localhost:3000'

// All API routes with their HTTP methods and optional body
// Routes return 401 when unauthenticated - that's OK (route exists)
// 404 = route not found (broken)
const ROUTES = [
  // Root & index
  { path: '/api', method: 'GET' },
  { path: '/api/paths', method: 'GET' },

  // Auth
  { path: '/api/auth/check', method: 'GET' },
  { path: '/api/auth/callback', method: 'GET' },
  { path: '/api/auth/profile', method: 'GET' },
  { path: '/api/auth/delete-account', method: 'POST', body: {} },

  // Settings
  { path: '/api/settings/account-filters', method: 'GET' },
  { path: '/api/settings/account-filters', method: 'POST', body: {} },
  { path: '/api/settings/backtest-mode', method: 'GET' },

  // Tags
  { path: '/api/tags', method: 'GET' },
  { path: '/api/tags/test-id', method: 'GET' },

  // User
  { path: '/api/user/trading-models', method: 'GET' },
  { path: '/api/user/trading-models/test-id', method: 'GET' },
  { path: '/api/user/data', method: 'GET' },
  { path: '/api/user/data/backup', method: 'GET' },
  { path: '/api/user/goals', method: 'GET' },

  // Dashboard & Stats
  { path: '/api/dashboard/stats', method: 'GET' },

  // V1 API
  { path: '/api/v1/init', method: 'GET' },
  { path: '/api/v1/trades', method: 'GET' },
  { path: '/api/v1/reports/stats', method: 'POST', body: {} },
  { path: '/api/news-events', method: 'GET' },

  // Notifications
  { path: '/api/notifications', method: 'GET' },
  { path: '/api/notifications?unreadOnly=true&limit=1', method: 'GET' },
  { path: '/api/notifications/test-id', method: 'GET' },

  // Prop Firm
  { path: '/api/prop-firm-templates', method: 'GET' },
  { path: '/api/prop-firm/accounts', method: 'GET' },
  { path: '/api/prop-firm/accounts/test-id', method: 'GET' },
  { path: '/api/prop-firm/accounts/test-id/trades', method: 'GET' },
  { path: '/api/prop-firm/accounts/test-id/payouts', method: 'GET' },
  { path: '/api/prop-firm/accounts/test-id/transition', method: 'POST', body: {} },
  { path: '/api/prop-firm/accounts/validate-trade', method: 'POST', body: {} },
  { path: '/api/prop-firm/payouts', method: 'GET' },
  { path: '/api/prop-firm/payouts/test-id', method: 'GET' },

  // Accounts
  { path: '/api/accounts', method: 'GET' },
  { path: '/api/accounts/test-id', method: 'GET' },
  { path: '/api/accounts/test-id/trades', method: 'GET' },

  // Live Accounts
  { path: '/api/live-accounts/test-id/transactions', method: 'GET' },

  // Journal
  { path: '/api/journal/list', method: 'GET' },
  { path: '/api/journal/daily', method: 'GET' },
  { path: '/api/journal/daily?date=2024-01-01', method: 'GET' },
  { path: '/api/journal/daily/test-id', method: 'GET' },
  { path: '/api/journal/ai-analysis', method: 'POST', body: { date: '2024-01-01' } },

  // Calendar
  { path: '/api/calendar/notes', method: 'GET' },

  // Data
  { path: '/api/data/export', method: 'GET' },
  // import is POST with FormData - skip or add minimal test

  // Trades
  { path: '/api/trades', method: 'GET' },
  { path: '/api/trades/quick-add', method: 'POST', body: {} },

  // AI
  { path: '/api/ai/format-trades', method: 'POST', body: { trades: [] } },
  { path: '/api/ai/mappings', method: 'POST', body: { headers: [] } },

  // Backtesting
  { path: '/api/backtesting', method: 'GET' },
  { path: '/api/backtesting', method: 'POST', body: {} },

  // Health & Build
  { path: '/api/health/edge', method: 'GET' },
  { path: '/api/build-id', method: 'GET' },

  // Cron (will 401 without CRON_SECRET - that's expected)
  { path: '/api/cron/daily-anchors', method: 'GET' },
  { path: '/api/cron/evaluate-phases', method: 'GET' },
]

async function testRoute(route) {
  const url = `${BASE_URL}${route.path}`
  const options = {
    method: route.method,
    headers: { 'Content-Type': 'application/json' },
    redirect: 'manual',
  }
  if (route.body && (route.method === 'POST' || route.method === 'PATCH' || route.method === 'PUT')) {
    options.body = JSON.stringify(route.body)
  }

  try {
    const res = await fetch(url, options)
    return { status: res.status, ok: res.ok }
  } catch (err) {
    const msg = err.cause?.code === 'ECONNREFUSED'
      ? 'Connection refused - is the dev server running? (npm run dev)'
      : err.message
    return { error: msg }
  }
}

async function main() {
  console.log(`\n🔍 Testing API routes at ${BASE_URL}\n`)
  console.log('Legend: 200/201 = OK | 401 = Auth required (OK) | 404 = NOT FOUND | 500 = Server error\n')
  console.log('Note: Run "npm run dev" in another terminal first.\n')

  // Quick connectivity check
  try {
    const ping = await fetch(`${BASE_URL}/api`, { method: 'GET' })
    if (ping.status) {
      console.log('✓ Server reachable\n')
    }
  } catch (e) {
    console.error('✗ Cannot reach server. Ensure "npm run dev" is running.\n')
    process.exit(1)
  }

  const results = { ok: [], auth: [], notFound: [], serverError: [], connectionError: [], other: [] }

  for (const route of ROUTES) {
    const label = `${route.method.padEnd(6)} ${route.path}`
    const result = await testRoute(route)

    if (result.error) {
      results.connectionError.push({ label, error: result.error })
      console.log(`❌ ${label} → ${result.error}`)
      continue
    }

    const status = result.status
    if (status === 200 || status === 201) {
      results.ok.push(label)
      console.log(`✅ ${label} → ${status}`)
    } else if (status === 401 || status === 403) {
      results.auth.push(label)
      console.log(`🔐 ${label} → ${status} (auth required)`)
    } else if (status === 404) {
      results.notFound.push(label)
      console.log(`⚠️  ${label} → 404 NOT FOUND`)
    } else if (status >= 500) {
      results.serverError.push({ label, error: `HTTP ${status}` })
      console.log(`❌ ${label} → ${status}`)
    } else {
      results.other.push({ label, status })
      console.log(`➖ ${label} → ${status}`)
    }
  }

  console.log('\n' + '─'.repeat(60))
  console.log('\n📊 Summary:')
  console.log(`   OK (200/201):       ${results.ok.length}`)
  console.log(`   Auth (401/403):     ${results.auth.length} (expected when unauthenticated)`)
  console.log(`   404 NOT FOUND:     ${results.notFound.length}`)
  console.log(`   Server errors 5xx: ${results.serverError.length}`)
  console.log(`   Connection errors: ${results.connectionError.length}`)
  console.log(`   Other:             ${results.other.length}`)

  if (results.notFound.length > 0) {
    console.log('\n⚠️  Routes returning 404 (may need implementation):')
    results.notFound.forEach((r) => console.log(`   - ${r}`))
  }
  if (results.serverError.length > 0) {
    console.log('\n❌ Routes with server errors (5xx):')
    results.serverError.forEach(({ label, error }) => console.log(`   - ${label}: ${error}`))
  }
  if (results.connectionError.length > 0 && results.connectionError.length === ROUTES.length) {
    console.log('\n❌ All requests failed - ensure "npm run dev" is running.')
  }

  const exitCode = results.notFound.length > 0 || results.serverError.length > 0 ? 1 : 0
  process.exit(exitCode)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
