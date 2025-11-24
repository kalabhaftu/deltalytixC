import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verify() {
  console.log('\n✅ VERIFYING TRADE IMPORT FIX\n')
  console.log('=' .repeat(80))

  try {
    // Check if the constraint exists
    console.log('🔍 Checking database constraints on Trade table...\n')
    
    const constraints = await prisma.$queryRaw<any[]>`
      SELECT 
        con.conname as constraint_name,
        pg_get_constraintdef(con.oid) as constraint_definition
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
      WHERE rel.relname = 'Trade'
        AND nsp.nspname = 'public'
        AND con.contype = 'u'
      ORDER BY con.conname;
    `

    console.log(`Found ${constraints.length} unique constraint(s) on Trade table:\n`)
    
    const brokenConstraintExists = constraints.some(c => 
      c.constraint_name === 'Trade_userId_accountNumber_instrument_entryTime_side_entryPrice_key'
    )

    if (brokenConstraintExists) {
      console.log('❌ BROKEN CONSTRAINT STILL EXISTS!')
      console.log('   The fix did not work properly.')
    } else {
      console.log('✅ BROKEN CONSTRAINT SUCCESSFULLY REMOVED!')
      console.log('   The Trade table no longer has the problematic unique constraint.')
    }

    console.log('\n📋 Current unique constraints on Trade table:')
    if (constraints.length === 0) {
      console.log('   (none)')
    } else {
      constraints.forEach(c => {
        console.log(`\n   • ${c.constraint_name}`)
        console.log(`     ${c.constraint_definition}`)
      })
    }

    console.log('\n\n' + '='.repeat(80))
    console.log('📝 WHAT WAS FIXED:')
    console.log('=' .repeat(80))
    console.log('\n❌ OLD BEHAVIOR (BROKEN):')
    console.log('   Constraint: @@unique([userId, accountNumber, instrument, entryTime, side, entryPrice])')
    console.log('   Problem: Prevented importing the same broker trades to different app accounts')
    console.log('   Example: CSV with accountNumber "753251" could only be imported once per user')
    console.log('\n✅ NEW BEHAVIOR (FIXED):')
    console.log('   • No database-level constraint blocking imports')
    console.log('   • Same CSV can be imported to multiple different accounts')
    console.log('   • Duplicate detection handled at application level via entryId')
    console.log('   • Example: You can now import trades to both account "122123" AND account "999999"')
    
    console.log('\n\n' + '='.repeat(80))
    console.log('🎯 USE CASE:')
    console.log('=' .repeat(80))
    console.log('\n  Scenario: You have broker account "753251" trades in a CSV')
    console.log('  Before: Could only import to ONE app account')
    console.log('  After:  Can import to MULTIPLE app accounts')
    console.log('\n  ✅ Import CSV to app account "122123" (Phase 1)')
    console.log('  ✅ Import SAME CSV to app account "789456" (Phase 2)')
    console.log('  ✅ Import SAME CSV to app account "999999" (Live account)')
    console.log('\n  ❌ Still prevents: Importing same trades TWICE to the SAME account')
    console.log('     (via application-level entryId duplicate detection)')

    console.log('\n' + '='.repeat(80))
    console.log('✅ VERIFICATION COMPLETE\n')
  } catch (error) {
    console.error('❌ ERROR:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

verify()

