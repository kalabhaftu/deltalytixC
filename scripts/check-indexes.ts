import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkIndexes() {
  console.log('\n🔍 CHECKING INDEXES AND CONSTRAINTS\n')
  console.log('=' .repeat(80))

  try {
    // Get ALL indexes on Trade table
    const indexes = await prisma.$queryRaw<any[]>`
      SELECT 
        i.relname as index_name,
        a.attname as column_name,
        am.amname as index_type,
        idx.indisunique as is_unique,
        idx.indisprimary as is_primary,
        pg_get_indexdef(idx.indexrelid) as index_definition
      FROM pg_index idx
      JOIN pg_class i ON i.oid = idx.indexrelid
      JOIN pg_class t ON t.oid = idx.indrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      JOIN pg_am am ON am.oid = i.relam
      LEFT JOIN pg_attribute a ON a.attrelid = idx.indrelid AND a.attnum = ANY(idx.indkey)
      WHERE t.relname = 'Trade'
        AND n.nspname = 'public'
      ORDER BY i.relname, a.attnum;
    `

    console.log(`Found ${indexes.length} index(es) on Trade table:\n`)
    
    const uniqueIndexes = indexes.filter(i => i.is_unique && !i.is_primary)
    const regularIndexes = indexes.filter(i => !i.is_unique && !i.is_primary)
    
    if (uniqueIndexes.length > 0) {
      console.log('🔐 UNIQUE INDEXES (These act like unique constraints):\n')
      uniqueIndexes.forEach((idx, i) => {
        console.log(`${i + 1}. ${idx.index_name}`)
        console.log(`   Definition: ${idx.index_definition}`)
        console.log(`   Column: ${idx.column_name}\n`)
      })
    }

    if (regularIndexes.length > 0) {
      console.log('📊 REGULAR INDEXES:\n')
      regularIndexes.forEach((idx, i) => {
        console.log(`${i + 1}. ${idx.index_name}`)
        console.log(`   Definition: ${idx.index_definition}\n`)
      })
    }

    // Look for the problematic unique index
    const problematic = uniqueIndexes.find(idx => 
      idx.index_definition.includes('userId') && 
      idx.index_definition.includes('accountNumber')
    )

    if (problematic) {
      console.log('\n🎯 FOUND PROBLEMATIC UNIQUE INDEX:')
      console.log(`   Name: ${problematic.index_name}`)
      console.log(`   Definition: ${problematic.index_definition}`)
      
      console.log('\n🗑️  Removing it now...')
      await prisma.$executeRawUnsafe(`
        DROP INDEX IF EXISTS "public"."${problematic.index_name}";
      `)
      
      console.log('✅ Unique index removed!')
    } else {
      console.log('\n❓ Could not find unique index with userId and accountNumber')
    }

    // Also check constraints one more time with a different query
    console.log('\n\n🔍 CHECKING CONSTRAINTS (Alternative Query):\n')
    const constraints2 = await prisma.$queryRaw<any[]>`
      SELECT 
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name,
        tc.table_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_schema = 'public'
        AND tc.table_name = 'Trade'
        AND tc.constraint_type = 'UNIQUE'
      ORDER BY tc.constraint_name, kcu.ordinal_position;
    `

    if (constraints2.length > 0) {
      console.log('Found unique constraints via information_schema:')
      constraints2.forEach(c => {
        console.log(`  • ${c.constraint_name} on ${c.column_name}`)
      })
    } else {
      console.log('No unique constraints found via information_schema')
    }

    console.log('\n' + '='.repeat(80) + '\n')
  } catch (error) {
    console.error('❌ ERROR:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

checkIndexes()

