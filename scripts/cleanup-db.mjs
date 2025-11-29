/**
 * Complete Database Cleanup Script using Prisma
 * Run with: node scripts/cleanup-db.mjs
 */

import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'

// Database - using pooler connection for reliability
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres.hnbmdrvnmejytsdtbsoi:WP9CGb9IoV3JIfQS@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true'
    }
  }
})

// Supabase Storage
const SUPABASE_URL = 'https://hnbmdrvnmejytsdtbsoi.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuYm1kcnZubWVqeXRzZHRic29pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODYzMTA5OSwiZXhwIjoyMDc0MjA3MDk5fQ.szUU0AiVqjWB11-DM3vxsJ8M1ZIRy1x2Eh6-q_u1j9Y'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function clearStorageBucket(bucketName) {
  try {
    // List all files in the bucket recursively
    const { data: files, error: listError } = await supabase.storage
      .from(bucketName)
      .list('', { limit: 1000 })

    if (listError) {
      if (listError.message.includes('not found') || listError.message.includes('does not exist')) {
        console.log(`  ⚠️  Bucket "${bucketName}" does not exist, skipping`)
        return { success: true, filesDeleted: 0 }
      }
      console.log(`  ❌ Error listing bucket "${bucketName}": ${listError.message}`)
      return { success: false, filesDeleted: 0, error: listError.message }
    }

    if (!files || files.length === 0) {
      console.log(`  ℹ️  Bucket "${bucketName}" is already empty`)
      return { success: true, filesDeleted: 0 }
    }

    // Filter out folders (they have null metadata) and get file paths
    const filePaths = files
      .filter(file => file.id) // Only actual files have an id
      .map(file => file.name)

    if (filePaths.length === 0) {
      console.log(`  ℹ️  Bucket "${bucketName}" has no files`)
      return { success: true, filesDeleted: 0 }
    }

    // Delete all files
    const { error: deleteError } = await supabase.storage
      .from(bucketName)
      .remove(filePaths)

    if (deleteError) {
      console.log(`  ❌ Error deleting from "${bucketName}": ${deleteError.message}`)
      return { success: false, filesDeleted: 0, error: deleteError.message }
    }

    return { success: true, filesDeleted: filePaths.length }
  } catch (err) {
    console.log(`  ❌ Exception in "${bucketName}": ${err.message}`)
    return { success: false, filesDeleted: 0, error: String(err) }
  }
}

async function main() {
  console.log('\n🧹 ========================================')
  console.log('   COMPLETE DATABASE & STORAGE CLEANUP')
  console.log('========================================\n')

  try {
    // Step 1: Clear Database Tables using Prisma deleteMany
    console.log('📊 STEP 1: Clearing Database Tables...\n')

    // Delete in order respecting foreign key constraints (children first)
    
    // 1. Delete breach records
    try {
      const count = await prisma.breachRecord.deleteMany({})
      console.log(`   ✅ Cleared "BreachRecord" (${count.count} rows)`)
    } catch (err) { console.log(`   ⚠️  BreachRecord: ${err.message}`) }

    // 2. Delete daily anchors
    try {
      const count = await prisma.dailyAnchor.deleteMany({})
      console.log(`   ✅ Cleared "DailyAnchor" (${count.count} rows)`)
    } catch (err) { console.log(`   ⚠️  DailyAnchor: ${err.message}`) }

    // 3. Delete payouts
    try {
      const count = await prisma.payout.deleteMany({})
      console.log(`   ✅ Cleared "Payout" (${count.count} rows)`)
    } catch (err) { console.log(`   ⚠️  Payout: ${err.message}`) }

    // 4. Delete trades
    try {
      const count = await prisma.trade.deleteMany({})
      console.log(`   ✅ Cleared "Trade" (${count.count} rows)`)
    } catch (err) { console.log(`   ⚠️  Trade: ${err.message}`) }

    // 5. Delete phase accounts
    try {
      const count = await prisma.phaseAccount.deleteMany({})
      console.log(`   ✅ Cleared "PhaseAccount" (${count.count} rows)`)
    } catch (err) { console.log(`   ⚠️  PhaseAccount: ${err.message}`) }

    // 6. Delete master accounts
    try {
      const count = await prisma.masterAccount.deleteMany({})
      console.log(`   ✅ Cleared "MasterAccount" (${count.count} rows)`)
    } catch (err) { console.log(`   ⚠️  MasterAccount: ${err.message}`) }

    // 7. Delete live account transactions
    try {
      const count = await prisma.liveAccountTransaction.deleteMany({})
      console.log(`   ✅ Cleared "LiveAccountTransaction" (${count.count} rows)`)
    } catch (err) { console.log(`   ⚠️  LiveAccountTransaction: ${err.message}`) }

    // 8. Delete daily notes
    try {
      const count = await prisma.dailyNote.deleteMany({})
      console.log(`   ✅ Cleared "DailyNote" (${count.count} rows)`)
    } catch (err) { console.log(`   ⚠️  DailyNote: ${err.message}`) }

    // 9. Delete backtest trades
    try {
      const count = await prisma.backtestTrade.deleteMany({})
      console.log(`   ✅ Cleared "BacktestTrade" (${count.count} rows)`)
    } catch (err) { console.log(`   ⚠️  BacktestTrade: ${err.message}`) }

    // 10. Delete dashboard templates
    try {
      const count = await prisma.dashboardTemplate.deleteMany({})
      console.log(`   ✅ Cleared "DashboardTemplate" (${count.count} rows)`)
    } catch (err) { console.log(`   ⚠️  DashboardTemplate: ${err.message}`) }

    // 11. Delete trade tags
    try {
      const count = await prisma.tradeTag.deleteMany({})
      console.log(`   ✅ Cleared "TradeTag" (${count.count} rows)`)
    } catch (err) { console.log(`   ⚠️  TradeTag: ${err.message}`) }

    // 12. Delete trading models
    try {
      const count = await prisma.tradingModel.deleteMany({})
      console.log(`   ✅ Cleared "TradingModel" (${count.count} rows)`)
    } catch (err) { console.log(`   ⚠️  TradingModel: ${err.message}`) }

    // 13. Delete weekly reviews
    try {
      const count = await prisma.weeklyReview.deleteMany({})
      console.log(`   ✅ Cleared "WeeklyReview" (${count.count} rows)`)
    } catch (err) { console.log(`   ⚠️  WeeklyReview: ${err.message}`) }

    // 14. Delete accounts
    try {
      const count = await prisma.account.deleteMany({})
      console.log(`   ✅ Cleared "Account" (${count.count} rows)`)
    } catch (err) { console.log(`   ⚠️  Account: ${err.message}`) }

    // 15. Delete groups
    try {
      const count = await prisma.group.deleteMany({})
      console.log(`   ✅ Cleared "Group" (${count.count} rows)`)
    } catch (err) { console.log(`   ⚠️  Group: ${err.message}`) }

    // 16. Delete users (last, as everything references users)
    try {
      const count = await prisma.user.deleteMany({})
      console.log(`   ✅ Cleared "User" (${count.count} rows)`)
    } catch (err) { console.log(`   ⚠️  User: ${err.message}`) }

    // Step 2: Verify counts
    console.log('\n📈 Verification...\n')
    
    const counts = await Promise.all([
      prisma.user.count(),
      prisma.account.count(),
      prisma.trade.count(),
      prisma.masterAccount.count(),
      prisma.phaseAccount.count(),
      prisma.payout.count()
    ])

    console.log(`   Users: ${counts[0]}`)
    console.log(`   Accounts: ${counts[1]}`)
    console.log(`   Trades: ${counts[2]}`)
    console.log(`   MasterAccounts: ${counts[3]}`)
    console.log(`   PhaseAccounts: ${counts[4]}`)
    console.log(`   Payouts: ${counts[5]}`)

    // Step 3: Clear Storage Buckets
    console.log('\n📁 STEP 2: Clearing Storage Buckets...\n')

    const buckets = [
      'trade-images',
      'backtest-images',
      'user-uploads',
      'calendar-images',
      'avatars'
    ]

    for (const bucket of buckets) {
      process.stdout.write(`   Clearing "${bucket}"... `)
      const result = await clearStorageBucket(bucket)
      
      if (result.success) {
        if (result.filesDeleted > 0) {
          console.log(`✅ Deleted ${result.filesDeleted} files`)
        }
      }
    }

    console.log('\n========================================')
    console.log('✅ CLEANUP COMPLETE!')
    console.log('========================================')
    console.log('\nDatabase is now fresh and ready for testing.\n')

  } catch (error) {
    console.error('❌ Cleanup failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()

