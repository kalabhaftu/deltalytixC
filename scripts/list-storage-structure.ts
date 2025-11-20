import { createClient } from '@/lib/supabase'

async function listStorage() {
  const supabase = await createClient()
  
  console.log('📁 Listing storage structure...\n')
  
  // List root level
  const { data: root, error: rootError } = await supabase.storage
    .from('trade-images')
    .list('', { limit: 100 })
  
  if (rootError) {
    console.error('Error:', rootError)
    return
  }
  
  console.log(`Root level (${root?.length || 0} items):`)
  for (const item of root || []) {
    console.log(`  ${item.id ? '📁' : '📄'} ${item.name}`)
    
    if (item.id) {
      // It's a folder, list its contents
      const { data: level1 } = await supabase.storage
        .from('trade-images')
        .list(item.name, { limit: 20 })
      
      if (level1 && level1.length > 0) {
        console.log(`    └─ (${level1.length} items)`)
        for (const sub of level1.slice(0, 5)) {
          console.log(`       ${sub.id ? '📁' : '📄'} ${sub.name}`)
          
          if (sub.id) {
            // Another folder level
            const { data: level2 } = await supabase.storage
              .from('trade-images')
              .list(`${item.name}/${sub.name}`, { limit: 10 })
            
            if (level2 && level2.length > 0) {
              console.log(`          └─ (${level2.length} items)`)
              for (const file of level2.slice(0, 3)) {
                console.log(`             📄 ${file.name}`)
              }
            }
          }
        }
      }
    }
  }
}

listStorage()

