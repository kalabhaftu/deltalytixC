import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function removeConstraint() {
  console.log('\n🔧 REMOVING BROKEN TRADE UNIQUE CONSTRAINT\n')
  console.log('=' .repeat(80))

  try {
    // Drop the constraint if it exists
    console.log('Executing SQL to drop constraint...')
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "public"."Trade" 
      DROP CONSTRAINT IF EXISTS "Trade_userId_accountNumber_instrument_entryTime_side_entryPrice_key";
    `)

    console.log('✅ SUCCESS! The broken unique constraint has been removed.')
    console.log('\n📝 What this fixes:')
    console.log('   ✅ You can now import the same CSV trades to DIFFERENT accounts')
    console.log('   ✅ Same broker trades can exist in multiple app accounts')
    console.log('   ✅ Duplicate detection still works via entryId at application level')
    console.log('\n' + '='.repeat(80))
  } catch (error) {
    console.error('❌ ERROR:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

removeConstraint()

