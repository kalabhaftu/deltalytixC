/**
 * Complete Database and Storage Cleanup Script
 * Clears all tables and storage buckets for fresh testing
 * 
 * Run with: npx tsx scripts/cleanup-all.ts
 */

import { createClient } from '@supabase/supabase-js'

// Configuration from temp.txt
const DIRECT_URL = 'postgresql://postgres.hnbmdrvnmejytsdtbsoi:WP9CGb9IoV3JIfQS@aws-1-us-east-1.pooler.supabase.com:5432/postgres'
const SUPABASE_URL = 'https://hnbmdrvnmejytsdtbsoi.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuYm1kcnZubWVqeXRzZHRic29pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODYzMTA5OSwiZXhwIjoyMDc0MjA3MDk5fQ.szUU0AiVqjWB11-DM3vxsJ8M1ZIRy1x2Eh6-q_u1j9Y'

// Initialize Supabase client with service role key for admin access
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Tables to clear in order (respecting foreign key constraints)
// Child tables first, then parent tables
const TABLES_TO_CLEAR = [
  // Child tables (have foreign keys to other tables)
  'BreachRecord',
  'DailyAnchor',
  'Payout',
  'Trade',
  'PhaseAccount',
  'MasterAccount',
  'LiveAccountTransaction',
  'DailyNote',
  'BacktestTrade',
  'DashboardTemplate',
  'TradeTag',
  'TradingModel',
  'WeeklyReview',
  'Account',
  'Group',
  // Parent table (has foreign keys from other tables)
  'User'
]

// Storage buckets to clear
const STORAGE_BUCKETS = [
  'trade-images',
  'backtest-images', 
  'user-uploads',
  'calendar-images'
]

async function clearTable(tableName: string): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    // Use raw SQL to delete all rows
    const { data, error } = await supabase
      .from(tableName)
      .delete()
      .neq('id', '') // This is a trick to delete all rows

    if (error) {
      // Try alternative method with direct SQL
      const { error: sqlError } = await supabase.rpc('exec_sql', {
        query: `DELETE FROM public."${tableName}"`
      })
      
      if (sqlError) {
        return { success: false, count: 0, error: sqlError.message }
      }
    }

    return { success: true, count: 0 }
  } catch (err) {
    return { success: false, count: 0, error: String(err) }
  }
}

async function clearStorageBucket(bucketName: string): Promise<{ success: boolean; filesDeleted: number; error?: string }> {
  try {
    // List all files in the bucket
    const { data: files, error: listError } = await supabase.storage
      .from(bucketName)
      .list('', { limit: 1000 })

    if (listError) {
      // Bucket might not exist
      if (listError.message.includes('not found')) {
        console.log(`  ⚠️  Bucket "${bucketName}" does not exist, skipping`)
        return { success: true, filesDeleted: 0 }
      }
      return { success: false, filesDeleted: 0, error: listError.message }
    }

    if (!files || files.length === 0) {
      console.log(`  ℹ️  Bucket "${bucketName}" is already empty`)
      return { success: true, filesDeleted: 0 }
    }

    // Delete all files
    const filePaths = files.map(file => file.name)
    const { error: deleteError } = await supabase.storage
      .from(bucketName)
      .remove(filePaths)

    if (deleteError) {
      return { success: false, filesDeleted: 0, error: deleteError.message }
    }

    return { success: true, filesDeleted: filePaths.length }
  } catch (err) {
    return { success: false, filesDeleted: 0, error: String(err) }
  }
}

async function main() {
  console.log('\n🧹 ========================================')
  console.log('   COMPLETE DATABASE & STORAGE CLEANUP')
  console.log('========================================\n')
  
  console.log('⚠️  WARNING: This will DELETE ALL DATA!')
  console.log('   - All database tables will be cleared')
  console.log('   - All storage buckets will be emptied')
  console.log('')

  // Step 1: Clear Database Tables
  console.log('📊 STEP 1: Clearing Database Tables...\n')
  
  for (const table of TABLES_TO_CLEAR) {
    process.stdout.write(`   Clearing "${table}"... `)
    const result = await clearTable(table)
    
    if (result.success) {
      console.log('✅ Done')
    } else {
      console.log(`⚠️  ${result.error || 'Failed'}`)
    }
  }

  // Step 2: Clear Storage Buckets
  console.log('\n📁 STEP 2: Clearing Storage Buckets...\n')
  
  for (const bucket of STORAGE_BUCKETS) {
    process.stdout.write(`   Clearing bucket "${bucket}"... `)
    const result = await clearStorageBucket(bucket)
    
    if (result.success) {
      if (result.filesDeleted > 0) {
        console.log(`✅ Deleted ${result.filesDeleted} files`)
      } else {
        console.log('✅ Already empty')
      }
    } else {
      console.log(`⚠️  ${result.error || 'Failed'}`)
    }
  }

  console.log('\n========================================')
  console.log('✅ CLEANUP COMPLETE!')
  console.log('========================================')
  console.log('\nDatabase is now fresh and ready for testing.\n')
}

// Run the cleanup
main().catch(console.error)

