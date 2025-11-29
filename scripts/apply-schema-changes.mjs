/**
 * Apply Schema Optimization Changes
 * Run with: node scripts/apply-schema-changes.mjs
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres.hnbmdrvnmejytsdtbsoi:WP9CGb9IoV3JIfQS@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true'
    }
  }
})

async function main() {
  console.log('\n🔧 Applying Schema Optimization Changes...\n')

  try {
    // Phase 1: Remove Unused Indexes (safe to run even if they don't exist)
    console.log('📊 Phase 1: Removing unused indexes...')
    
    const indexesToDrop = [
      'Account_userId_number_idx',
      'idx_account_user_group',
      'idx_account_number_user',
      'WeeklyReview_userId_idx',
      'idx_phase_account_active',
      'idx_trade_user_created',
      'idx_trade_user_account_created',
      'idx_trade_entry_time',
      'idx_trade_symbol_user',
      'idx_master_account_user_status',
      'idx_master_account_active',
      'MasterAccount_isActive_idx',
      'MasterAccount_userId_isActive_idx',
      'idx_backtest_user_date',
      'idx_backtest_user_outcome',
      'idx_daily_note_user_date'
    ]

    for (const indexName of indexesToDrop) {
      try {
        await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "public"."${indexName}"`)
        console.log(`   ✅ Dropped index: ${indexName}`)
      } catch (err) {
        console.log(`   ⚠️ Could not drop index ${indexName}: ${err.message}`)
      }
    }

    // Phase 2: Create new enums if they don't exist
    console.log('\n📊 Phase 2: Creating new enums...')
    
    try {
      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          CREATE TYPE "public"."DrawdownType" AS ENUM ('static', 'trailing');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$
      `)
      console.log('   ✅ Created DrawdownType enum')
    } catch (err) {
      console.log(`   ⚠️ DrawdownType: ${err.message}`)
    }

    try {
      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          CREATE TYPE "public"."PayoutStatus" AS ENUM ('pending', 'approved', 'paid', 'rejected');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$
      `)
      console.log('   ✅ Created PayoutStatus enum')
    } catch (err) {
      console.log(`   ⚠️ PayoutStatus: ${err.message}`)
    }

    // Phase 3: Add missing index
    console.log('\n📊 Phase 3: Adding missing indexes...')
    
    try {
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "DailyNote_accountId_idx" ON "public"."DailyNote"("accountId")
      `)
      console.log('   ✅ Created DailyNote_accountId_idx')
    } catch (err) {
      console.log(`   ⚠️ DailyNote_accountId_idx: ${err.message}`)
    }

    try {
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "MasterAccount_userId_status_idx" ON "public"."MasterAccount"("userId", "status")
      `)
      console.log('   ✅ Created MasterAccount_userId_status_idx')
    } catch (err) {
      console.log(`   ⚠️ MasterAccount_userId_status_idx: ${err.message}`)
    }

    // Phase 4: Column modifications
    console.log('\n📊 Phase 4: Modifying columns...')

    // Drop isActive column from MasterAccount
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "public"."MasterAccount" DROP COLUMN IF EXISTS "isActive"`)
      console.log('   ✅ Dropped MasterAccount.isActive column')
    } catch (err) {
      console.log(`   ⚠️ MasterAccount.isActive: ${err.message}`)
    }

    // Drop createdAt column from Payout
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "public"."Payout" DROP COLUMN IF EXISTS "createdAt"`)
      console.log('   ✅ Dropped Payout.createdAt column')
    } catch (err) {
      console.log(`   ⚠️ Payout.createdAt: ${err.message}`)
    }

    // Add updatedAt to Account
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "public"."Account" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3)`)
      await prisma.$executeRawUnsafe(`UPDATE "public"."Account" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL`)
      console.log('   ✅ Added Account.updatedAt column')
    } catch (err) {
      console.log(`   ⚠️ Account.updatedAt: ${err.message}`)
    }

    // Add updatedAt to BreachRecord  
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "public"."BreachRecord" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3)`)
      await prisma.$executeRawUnsafe(`UPDATE "public"."BreachRecord" SET "updatedAt" = "breachTime" WHERE "updatedAt" IS NULL`)
      console.log('   ✅ Added BreachRecord.updatedAt column')
    } catch (err) {
      console.log(`   ⚠️ BreachRecord.updatedAt: ${err.message}`)
    }

    // Phase 5: Convert Trade.tags to array
    console.log('\n📊 Phase 5: Converting Trade.tags to array...')
    
    try {
      // Check if tags is already an array type
      const columnInfo = await prisma.$queryRaw`
        SELECT data_type FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'Trade' AND column_name = 'tags'
      `
      
      if (columnInfo[0]?.data_type !== 'ARRAY') {
        // Add new column
        await prisma.$executeRawUnsafe(`ALTER TABLE "public"."Trade" ADD COLUMN IF NOT EXISTS "tags_new" TEXT[]`)
        
        // Convert data
        await prisma.$executeRawUnsafe(`
          UPDATE "public"."Trade" 
          SET "tags_new" = CASE 
            WHEN "tags" IS NULL OR "tags" = '' THEN '{}'::TEXT[]
            ELSE string_to_array("tags", ',')
          END
        `)
        
        // Drop old and rename
        await prisma.$executeRawUnsafe(`ALTER TABLE "public"."Trade" DROP COLUMN IF EXISTS "tags"`)
        await prisma.$executeRawUnsafe(`ALTER TABLE "public"."Trade" RENAME COLUMN "tags_new" TO "tags"`)
        console.log('   ✅ Converted Trade.tags to array')
      } else {
        console.log('   ℹ️ Trade.tags is already an array')
      }
    } catch (err) {
      console.log(`   ⚠️ Trade.tags conversion: ${err.message}`)
    }

    // Phase 6: Clean up empty string defaults
    console.log('\n📊 Phase 6: Cleaning up empty strings...')
    
    try {
      await prisma.$executeRawUnsafe(`UPDATE "public"."Trade" SET "entryId" = NULL WHERE "entryId" = ''`)
      await prisma.$executeRawUnsafe(`UPDATE "public"."Trade" SET "side" = NULL WHERE "side" = ''`)
      await prisma.$executeRawUnsafe(`UPDATE "public"."Trade" SET "groupId" = NULL WHERE "groupId" = ''`)
      console.log('   ✅ Converted empty strings to NULL')
    } catch (err) {
      console.log(`   ⚠️ Empty string cleanup: ${err.message}`)
    }

    console.log('\n========================================')
    console.log('✅ Schema optimization completed!')
    console.log('========================================\n')
    console.log('Next steps:')
    console.log('1. Run: npx prisma generate')
    console.log('2. Restart the development server')
    console.log('')

  } catch (error) {
    console.error('❌ Schema optimization failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()

