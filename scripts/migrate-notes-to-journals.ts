/**
 * Migration Script: DailyNote -> DailyJournal
 * 
 * This script migrates old DailyNote records to the new DailyJournal system.
 * It checks all users and migrates their notes, preserving data integrity.
 * 
 * Usage: npx tsx scripts/migrate-notes-to-journals.ts
 */

import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables from .env.local first, then .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

const prisma = new PrismaClient()

interface MigrationStats {
  totalUsers: number
  totalNotes: number
  migratedNotes: number
  skippedNotes: number
  errors: number
  errorDetails: Array<{ userId: string; date: string; error: string }>
}

async function migrateNotesToJournals() {
  console.log('🔍 Starting DailyNote → DailyJournal migration...\n')

  const stats: MigrationStats = {
    totalUsers: 0,
    totalNotes: 0,
    migratedNotes: 0,
    skippedNotes: 0,
    errors: 0,
    errorDetails: []
  }

  try {
    // Check database connection
    await prisma.$connect()
    console.log('✅ Database connection established\n')

    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true
      }
    })

    stats.totalUsers = users.length
    console.log(`📊 Found ${users.length} users\n`)

    // Migrate notes for each user
    for (const user of users) {
      console.log(`👤 Processing user: ${user.email} (${user.id})`)

      try {
        // Get all notes for this user
        const notes = await prisma.dailyNote.findMany({
          where: {
            userId: user.id
          },
          orderBy: {
            date: 'asc'
          }
        })

        console.log(`   📝 Found ${notes.length} notes`)
        stats.totalNotes += notes.length

        if (notes.length === 0) {
          console.log(`   ⏭️  No notes to migrate, skipping\n`)
          continue
        }

        // Migrate each note
        for (const note of notes) {
          try {
            // Check if journal already exists for this date
            const existingJournal = await prisma.dailyNote.findUnique({
              where: {
                userId_accountId_date: {
                  userId: user.id,
                  accountId: '', // Empty string for nullable unique constraint
                  date: note.date
                }
              }
            })

            if (existingJournal && existingJournal.note) {
              console.log(`   ⏭️  Journal already exists for ${note.date.toISOString().split('T')[0]}, skipping`)
              stats.skippedNotes++
              continue
            }

            // Create or update journal entry
            await prisma.dailyNote.upsert({
              where: {
                userId_accountId_date: {
                  userId: user.id,
                  accountId: '', // Empty string for nullable unique constraint
                  date: note.date
                }
              },
              update: {
                note: note.note,
                emotion: null // Old notes don't have emotion
              },
              create: {
                userId: user.id,
                accountId: null,
                date: note.date,
                note: note.note,
                emotion: null
              }
            })

            console.log(`   ✅ Migrated: ${note.date.toISOString().split('T')[0]}`)
            stats.migratedNotes++

          } catch (noteError) {
            console.error(`   ❌ Error migrating note for ${note.date.toISOString().split('T')[0]}:`, noteError)
            stats.errors++
            stats.errorDetails.push({
              userId: user.id,
              date: note.date.toISOString().split('T')[0],
              error: noteError instanceof Error ? noteError.message : 'Unknown error'
            })
          }
        }

        console.log(`   ✅ Completed user migration\n`)

      } catch (userError) {
        console.error(`   ❌ Error processing user ${user.email}:`, userError)
        stats.errors++
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(60))
    console.log('📊 MIGRATION SUMMARY')
    console.log('='.repeat(60))
    console.log(`Total Users:         ${stats.totalUsers}`)
    console.log(`Total Notes Found:   ${stats.totalNotes}`)
    console.log(`✅ Migrated:         ${stats.migratedNotes}`)
    console.log(`⏭️  Skipped:          ${stats.skippedNotes}`)
    console.log(`❌ Errors:           ${stats.errors}`)
    console.log('='.repeat(60))

    if (stats.errorDetails.length > 0) {
      console.log('\n❌ Error Details:')
      stats.errorDetails.forEach(detail => {
        console.log(`   User: ${detail.userId}, Date: ${detail.date}`)
        console.log(`   Error: ${detail.error}\n`)
      })
    }

    if (stats.errors === 0 && stats.migratedNotes > 0) {
      console.log('\n✅ Migration completed successfully!')
    } else if (stats.errors > 0) {
      console.log('\n⚠️  Migration completed with errors. Please review the error details above.')
    } else {
      console.log('\n✅ No notes to migrate.')
    }

  } catch (error) {
    console.error('\n❌ Fatal error during migration:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run migration
migrateNotesToJournals()
  .then(() => {
    console.log('\n👋 Migration script finished.')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Migration failed:', error)
    process.exit(1)
  })

