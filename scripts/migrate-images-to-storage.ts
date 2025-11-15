/**
 * ONE-TIME MIGRATION SCRIPT
 * Migrates all base64 images from database to Supabase storage
 * 
 * Usage: tsx scripts/migrate-images-to-storage.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as archiver from 'archiver'
import * as dotenv from 'dotenv'

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY // Need service role key for direct DB access

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Image fields to migrate
const IMAGE_FIELDS = [
  'imageBase64',
  'imageBase64Second',
  'imageBase64Third',
  'imageBase64Fourth',
  'imageBase64Fifth',
  'imageBase64Sixth',
  'cardPreviewImage'
]

interface TradeWithImages {
  id: string
  userId: string
  instrument: string
  [key: string]: any
}

interface MigrationResult {
  tradeId: string
  field: string
  success: boolean
  storageUrl?: string
  error?: string
}

/**
 * Step 1: Fetch all trades with base64 images
 */
async function fetchTradesWithBase64(): Promise<TradeWithImages[]> {
  console.log('📊 Fetching trades with base64 images...')
  
  const { data, error } = await supabase
    .from('Trade')
    .select('*')
    .or(IMAGE_FIELDS.map(field => `${field}.like.data:image/%`).join(','))
  
  if (error) {
    throw new Error(`Failed to fetch trades: ${error.message}`)
  }
  
  console.log(`✅ Found ${data?.length || 0} trades with base64 images`)
  return data || []
}

/**
 * Step 2: Create backup ZIP of all base64 images
 */
async function createBackupZip(trades: TradeWithImages[]): Promise<string> {
  console.log('\n💾 Creating backup ZIP...')
  
  const backupDir = path.join(process.cwd(), 'backups')
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true })
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const zipPath = path.join(backupDir, `images-backup-${timestamp}.zip`)
  
  const output = fs.createWriteStream(zipPath)
  const archive = archiver('zip', { zlib: { level: 9 } })
  
  return new Promise((resolve, reject) => {
    output.on('close', () => {
      const sizeMB = (archive.pointer() / 1024 / 1024).toFixed(2)
      console.log(`✅ Backup created: ${zipPath} (${sizeMB} MB)`)
      resolve(zipPath)
    })
    
    archive.on('error', reject)
    archive.pipe(output)
    
    let imageCount = 0
    
    for (const trade of trades) {
      for (const field of IMAGE_FIELDS) {
        const base64Data = trade[field]
        if (base64Data && base64Data.startsWith('data:image/')) {
          // Extract image data
          const base64Content = base64Data.split(',')[1]
          const buffer = Buffer.from(base64Content, 'base64')
          
          // Determine extension from mime type
          const mimeMatch = base64Data.match(/data:image\/([^;]+)/)
          const extension = mimeMatch ? mimeMatch[1] : 'png'
          
          // Create filename
          const filename = `trade-${trade.id}-${field}.${extension}`
          archive.append(buffer, { name: filename })
          imageCount++
        }
      }
    }
    
    console.log(`📦 Added ${imageCount} images to backup`)
    archive.finalize()
  })
}

/**
 * Step 3: Ensure storage bucket exists
 */
async function ensureBucket(): Promise<string> {
  const bucketName = 'trade-images'
  
  const { data: buckets } = await supabase.storage.listBuckets()
  const exists = buckets?.some(b => b.name === bucketName)
  
  if (!exists) {
    console.log(`📦 Creating storage bucket: ${bucketName}`)
    const { error } = await supabase.storage.createBucket(bucketName, {
      public: true,
      fileSizeLimit: 10485760 // 10MB
    })
    
    if (error) {
      throw new Error(`Failed to create bucket: ${error.message}`)
    }
  }
  
  return bucketName
}

/**
 * Step 4: Upload base64 image to storage
 */
async function uploadToStorage(
  base64Data: string,
  userId: string,
  tradeId: string,
  field: string,
  bucketName: string
): Promise<string> {
  // Convert base64 to blob
  const base64Content = base64Data.split(',')[1]
  const buffer = Buffer.from(base64Content, 'base64')
  
  // Determine mime type and extension
  const mimeMatch = base64Data.match(/data:image\/([^;]+)/)
  const mimeType = mimeMatch ? `image/${mimeMatch[1]}` : 'image/png'
  const extension = mimeMatch ? mimeMatch[1] : 'png'
  
  // Create file path
  const timestamp = Date.now()
  const randomId = Math.random().toString(36).substr(2, 9)
  const fileName = `${field}_${timestamp}_${randomId}.${extension}`
  const filePath = `trades/${userId}/${tradeId}/${fileName}`
  
  // Upload to storage (NO COMPRESSION - keep original quality)
  const { error, data } = await supabase.storage
    .from(bucketName)
    .upload(filePath, buffer, {
      contentType: mimeType,
      cacheControl: '3600',
      upsert: false,
    })
  
  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`)
  }
  
  // Get public URL
  const { data: urlData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(filePath)
  
  return urlData.publicUrl
}

/**
 * Step 5: Migrate all images for all trades
 */
async function migrateAllImages(
  trades: TradeWithImages[],
  bucketName: string
): Promise<MigrationResult[]> {
  console.log('\n🚀 Starting image migration...')
  
  const results: MigrationResult[] = []
  let totalImages = 0
  let successCount = 0
  
  // Count total images
  for (const trade of trades) {
    for (const field of IMAGE_FIELDS) {
      if (trade[field] && trade[field].startsWith('data:image/')) {
        totalImages++
      }
    }
  }
  
  console.log(`📸 Total images to migrate: ${totalImages}`)
  
  for (const trade of trades) {
    for (const field of IMAGE_FIELDS) {
      const base64Data = trade[field]
      
      if (base64Data && base64Data.startsWith('data:image/')) {
        try {
          // Upload to storage
          const storageUrl = await uploadToStorage(
            base64Data,
            trade.userId,
            trade.id,
            field,
            bucketName
          )
          
          // Update database with storage URL
          const { error: updateError } = await supabase
            .from('Trade')
            .update({ [field]: storageUrl })
            .eq('id', trade.id)
          
          if (updateError) {
            throw new Error(`Database update failed: ${updateError.message}`)
          }
          
          successCount++
          results.push({
            tradeId: trade.id,
            field,
            success: true,
            storageUrl
          })
          
          // Progress indicator
          process.stdout.write(`\r✅ Migrated ${successCount}/${totalImages} images`)
          
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error'
          results.push({
            tradeId: trade.id,
            field,
            success: false,
            error: errorMsg
          })
          
          // STOP ON ERROR
          console.error(`\n\n❌ Migration failed for trade ${trade.id}, field ${field}`)
          console.error(`Error: ${errorMsg}`)
          throw error
        }
      }
    }
  }
  
  console.log('\n') // New line after progress
  return results
}

/**
 * Step 6: Clean up base64 from database
 */
async function cleanupBase64(trades: TradeWithImages[]): Promise<void> {
  console.log('\n🧹 Cleaning up base64 from database...')
  
  for (const trade of trades) {
    const updates: any = {}
    let hasUpdates = false
    
    for (const field of IMAGE_FIELDS) {
      // Only clean if it's a storage URL (starts with http)
      if (trade[field] && trade[field].startsWith('http')) {
        // Base64 was successfully migrated, we can leave the storage URL as-is
        // No cleanup needed - the storage URL is already in place
        continue
      } else if (trade[field] && trade[field].startsWith('data:image/')) {
        // This shouldn't happen if migration succeeded, but safety check
        console.warn(`⚠️ Trade ${trade.id} still has base64 in ${field}`)
      }
    }
  }
  
  console.log('✅ Database cleanup complete')
}

/**
 * Main migration function
 */
async function main() {
  console.log('🎯 IMAGE MIGRATION TOOL')
  console.log('=' .repeat(50))
  console.log('This will migrate all base64 images to Supabase storage')
  console.log('NO compression - original quality preserved')
  console.log('=' .repeat(50))
  
  let backupPath: string | null = null
  
  try {
    // Step 1: Fetch trades
    const trades = await fetchTradesWithBase64()
    
    if (trades.length === 0) {
      console.log('\n✅ No trades with base64 images found. Nothing to migrate!')
      process.exit(0)
    }
    
    // Step 2: Create backup
    backupPath = await createBackupZip(trades)
    console.log(`\n✅ Backup saved to: ${backupPath}`)
    console.log('⚠️  DO NOT delete this backup until migration is verified!\n')
    
    // Step 3: Ensure bucket exists
    const bucketName = await ensureBucket()
    
    // Step 4: Migrate images
    const results = await migrateAllImages(trades, bucketName)
    
    // Step 5: Verify all succeeded
    const failed = results.filter(r => !r.success)
    if (failed.length > 0) {
      throw new Error(`${failed.length} images failed to migrate`)
    }
    
    // Step 6: Clean up (already done in migrate step, storage URLs are in DB)
    await cleanupBase64(trades)
    
    // Success report
    console.log('\n' + '='.repeat(50))
    console.log('✅ MIGRATION COMPLETED SUCCESSFULLY!')
    console.log('='.repeat(50))
    console.log(`📊 Total trades migrated: ${trades.length}`)
    console.log(`📸 Total images migrated: ${results.length}`)
    console.log(`💾 Backup location: ${backupPath}`)
    console.log('\n✅ All images are now in Supabase storage')
    console.log('✅ Database now stores URLs instead of base64')
    console.log('\n⚠️  Keep the backup file for at least 7 days before deleting')
    
  } catch (error) {
    console.error('\n\n' + '='.repeat(50))
    console.error('❌ MIGRATION FAILED!')
    console.error('='.repeat(50))
    console.error(error)
    
    if (backupPath) {
      console.error(`\n📁 Your backup is safe at: ${backupPath}`)
      console.error('💡 You can manually restore from this backup if needed')
    }
    
    console.error('\n⚠️  Database may be in inconsistent state')
    console.error('💡 Some images may be migrated, some may still be base64')
    console.error('💡 You can run this script again to retry')
    
    process.exit(1)
  }
}

// Run migration
main()

