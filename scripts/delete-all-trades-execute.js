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

    // Delete all trades
    const deletedCount = await prisma.trade.deleteMany({})
    console.log(`✅ Successfully deleted ${deletedCount.count} trades`)

    // Verify deletion
    const remainingTrades = await prisma.trade.count()
    console.log(`📊 Remaining trades: ${remainingTrades}`)

    if (remainingTrades === 0) {
      console.log('🎉 All trades deleted successfully!')
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
