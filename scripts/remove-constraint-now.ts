import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function removeConstraint() {
  console.log('\n🔧 REMOVING UNIQUE CONSTRAINT FROM DATABASE\n')
  console.log('=' .repeat(80))

  try {
    // First, check what constraints exist
    console.log('Checking existing constraints...')
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

    console.log(`\nFound ${constraints.length} unique constraint(s):\n`)
    constraints.forEach(c => {
      console.log(`  • ${c.constraint_name}`)
      console.log(`    ${c.constraint_definition}\n`)
    })

    // Find the problematic constraint
    const brokenConstraint = constraints.find(c => 
      c.constraint_definition.includes('userId') && 
      c.constraint_definition.includes('accountNumber') &&
      c.constraint_definition.includes('instrument')
    )

    if (!brokenConstraint) {
      console.log('✅ Constraint not found - may have already been removed')
      return
    }

    console.log(`\n🗑️  Removing constraint: ${brokenConstraint.constraint_name}`)
    
    // Drop the constraint
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "public"."Trade" 
      DROP CONSTRAINT IF EXISTS "${brokenConstraint.constraint_name}";
    `)

    console.log('✅ SUCCESS! Constraint removed.')
    
    // Verify it's gone
    const remainingConstraints = await prisma.$queryRaw<any[]>`
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

    console.log(`\n✅ Verification: ${remainingConstraints.length} unique constraint(s) remaining`)
    if (remainingConstraints.length === 0) {
      console.log('   All unique constraints removed from Trade table')
    } else {
      remainingConstraints.forEach(c => {
        console.log(`   • ${c.constraint_name}`)
      })
    }

    console.log('\n' + '='.repeat(80))
    console.log('✅ COMPLETE - You can now import the same CSV to different accounts!\n')
  } catch (error) {
    console.error('❌ ERROR:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

removeConstraint()

