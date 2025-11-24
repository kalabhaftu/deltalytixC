import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function findConstraint() {
  console.log('\n🔍 FINDING EXACT CONSTRAINT NAME\n')
  console.log('=' .repeat(80))

  try {
    // Get ALL constraints on Trade table
    const allConstraints = await prisma.$queryRaw<any[]>`
      SELECT 
        con.conname as constraint_name,
        con.contype as constraint_type,
        pg_get_constraintdef(con.oid) as constraint_definition,
        CASE con.contype
          WHEN 'u' THEN 'UNIQUE'
          WHEN 'p' THEN 'PRIMARY KEY'
          WHEN 'f' THEN 'FOREIGN KEY'
          WHEN 'c' THEN 'CHECK'
          ELSE 'OTHER'
        END as type_name
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
      WHERE rel.relname = 'Trade'
        AND nsp.nspname = 'public'
      ORDER BY con.contype, con.conname;
    `

    console.log(`Found ${allConstraints.length} constraint(s) on Trade table:\n`)
    
    allConstraints.forEach((c, idx) => {
      console.log(`${idx + 1}. ${c.type_name}: ${c.constraint_name}`)
      console.log(`   Definition: ${c.constraint_definition}\n`)
    })

    // Specifically look for the problematic one
    const problematic = allConstraints.find(c => 
      c.constraint_definition.includes('userId') && 
      c.constraint_definition.includes('accountNumber')
    )

    if (problematic) {
      console.log('\n🎯 FOUND PROBLEMATIC CONSTRAINT:')
      console.log(`   Name: ${problematic.constraint_name}`)
      console.log(`   Type: ${problematic.type_name}`)
      console.log(`   Definition: ${problematic.constraint_definition}`)
      
      console.log('\n🗑️  Removing it now...')
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "public"."Trade" 
        DROP CONSTRAINT IF EXISTS "${problematic.constraint_name}";
      `)
      
      console.log('✅ Constraint removed!')
      
      // Verify
      const verify = await prisma.$queryRawUnsafe<any[]>(`
        SELECT conname 
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        WHERE rel.relname = 'Trade'
          AND nsp.nspname = 'public'
          AND con.conname = '${problematic.constraint_name}';
      `)
      
      if (verify.length === 0) {
        console.log('✅ Verified: Constraint is gone!')
      } else {
        console.log('⚠️  Warning: Constraint still exists')
      }
    } else {
      console.log('\n❓ Could not find constraint with userId and accountNumber')
      console.log('   It might be named differently or already removed')
    }

    console.log('\n' + '='.repeat(80) + '\n')
  } catch (error) {
    console.error('❌ ERROR:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

findConstraint()

