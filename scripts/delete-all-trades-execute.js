#!/usr/bin/env node

/**
 * Script to delete all trades from the database
 * Run with: node scripts/delete-all-trades-execute.js
 *
 * ⚠️ WARNING: This will permanently delete ALL trades!
 */

const { PrismaClient } = require('@prisma/client')

async function deleteAllTrades() {
  const prisma = new PrismaClient()

  try {
    console.log('🔄 Connecting to database...')

    // Test database connection
    await prisma.$queryRaw`SELECT 1 as test_connection`
    console.log('✅ Database connection established')

    // Get total count before deletion
    const totalTrades = await prisma.trade.count()
    console.log(`📊 Found ${totalTrades} trades in database`)

    if (totalTrades === 0) {
      console.log('ℹ️  No trades to delete')
      return
    }

    // Show warning
    console.log('⚠️  WARNING: This will delete ALL trades permanently!')
    console.log('⚠️  This action cannot be undone!')
    console.log(`🗑️  Deleting ${totalTrades} trades...`)

    // Delete all trades and related data
    console.log('🗑️  Deleting all trades and related data...')

    // Delete in proper order to respect foreign keys
    const deletedTrades = await prisma.trade.deleteMany({})
    const deletedEquitySnapshots = await prisma.equitySnapshot.deleteMany({})
    const deletedBreaches = await prisma.breach.deleteMany({})
    const deletedAccountPhases = await prisma.accountPhase.deleteMany({})

    console.log(`✅ Successfully deleted ${deletedTrades.count} trades`)
    console.log(`✅ Successfully deleted ${deletedEquitySnapshots.count} equity snapshots`)
    console.log(`✅ Successfully deleted ${deletedBreaches.count} breaches`)
    console.log(`✅ Successfully deleted ${deletedAccountPhases.count} account phases`)

    // Verify deletion
    const remainingTrades = await prisma.trade.count()
    console.log(`📊 Remaining trades: ${remainingTrades}`)

    // Get all user IDs to clear their caches
    const userIds = await prisma.account.findMany({
      select: { userId: true },
      distinct: ['userId']
    })

    console.log(`🔄 Clearing caches for ${userIds.length} users...`)

    // Clear cache by revalidating tags (simulate Next.js cache invalidation)
    if (userIds.length > 0) {
      const { revalidateTag } = await import('next/cache')
      for (const { userId } of userIds) {
        try {
          revalidateTag(`accounts-${userId}`)
          revalidateTag(`user-data-${userId}`)
          revalidateTag(`grouped-trades-${userId}`)
          revalidateTag(`trades-${userId}`)
          console.log(`✅ Cleared cache for user: ${userId}`)
        } catch (error) {
          console.log(`⚠️  Could not clear cache for user: ${userId} (this is normal in script context)`)
        }
      }
    }

    if (remainingTrades === 0) {
      console.log('🎉 All trades deleted successfully!')
      console.log('🎉 All user caches cleared!')
    } else {
      console.log('⚠️  Warning: Some trades may still remain')
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error('Full error:', error)
  } finally {
    await prisma.$disconnect()
    console.log('🔌 Database connection closed')
  }
}

// Execute the deletion
deleteAllTrades().catch(console.error)
