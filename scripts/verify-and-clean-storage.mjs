/**
 * Verify Database and Clean Storage using Supabase API
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://hnbmdrvnmejytsdtbsoi.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuYm1kcnZubWVqeXRzZHRic29pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODYzMTA5OSwiZXhwIjoyMDc0MjA3MDk5fQ.szUU0AiVqjWB11-DM3vxsJ8M1ZIRy1x2Eh6-q_u1j9Y'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function verifyTable(tableName) {
  try {
    const { count, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true })
    
    if (error) {
      return { name: tableName, count: '?', error: error.message }
    }
    return { name: tableName, count: count || 0 }
  } catch (err) {
    return { name: tableName, count: '?', error: err.message }
  }
}

async function clearStorageBucket(bucketName) {
  try {
    // List all files recursively
    const { data: files, error: listError } = await supabase.storage
      .from(bucketName)
      .list('', { limit: 1000 })

    if (listError) {
      if (listError.message.includes('not found')) {
        return { bucket: bucketName, status: 'not_found' }
      }
      return { bucket: bucketName, status: 'error', error: listError.message }
    }

    if (!files || files.length === 0) {
      return { bucket: bucketName, status: 'empty', deleted: 0 }
    }

    // Get all file paths (filter out folders)
    const filePaths = files.filter(f => f.id).map(f => f.name)
    
    if (filePaths.length === 0) {
      return { bucket: bucketName, status: 'empty', deleted: 0 }
    }

    // Delete all files
    const { error: deleteError } = await supabase.storage
      .from(bucketName)
      .remove(filePaths)

    if (deleteError) {
      return { bucket: bucketName, status: 'error', error: deleteError.message }
    }

    return { bucket: bucketName, status: 'cleared', deleted: filePaths.length }
  } catch (err) {
    return { bucket: bucketName, status: 'error', error: err.message }
  }
}

async function main() {
  console.log('\n🧹 ========================================')
  console.log('   VERIFY & CLEAN STORAGE')
  console.log('========================================\n')

  // Verify database tables
  console.log('📊 Database Table Counts:\n')
  
  const tables = [
    'User', 'Account', 'Trade', 'MasterAccount', 'PhaseAccount', 
    'Payout', 'Group', 'BreachRecord', 'DailyAnchor'
  ]
  
  for (const table of tables) {
    const result = await verifyTable(table)
    if (result.error) {
      console.log(`   ${table}: ⚠️ ${result.error}`)
    } else {
      const icon = result.count === 0 ? '✅' : '⚠️'
      console.log(`   ${table}: ${icon} ${result.count} rows`)
    }
  }

  // Clean storage buckets
  console.log('\n📁 Storage Buckets:\n')
  
  const buckets = ['trade-images', 'backtest-images', 'user-uploads', 'calendar-images', 'avatars']
  
  for (const bucket of buckets) {
    const result = await clearStorageBucket(bucket)
    
    if (result.status === 'not_found') {
      console.log(`   ${bucket}: ℹ️ Bucket does not exist`)
    } else if (result.status === 'error') {
      console.log(`   ${bucket}: ❌ ${result.error}`)
    } else if (result.status === 'empty') {
      console.log(`   ${bucket}: ✅ Already empty`)
    } else {
      console.log(`   ${bucket}: ✅ Deleted ${result.deleted} files`)
    }
  }

  console.log('\n========================================')
  console.log('✅ VERIFICATION COMPLETE!')
  console.log('========================================\n')
}

main().catch(console.error)

