/**
 * Fix 'use client' import merge issue
 */

const fs = require('fs');
const glob = require('glob');

function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Fix: 'use client' import -> 'use client'\n\nimport
    if (content.includes("'use client' import")) {
      content = content.replace(/'use client' import/g, "'use client'\n\nimport");
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed: ${filePath}`);
      return true;
    }
    
    // Fix: 'use server' import -> 'use server'\n\nimport
    if (content.includes("'use server' import")) {
      content = content.replace(/'use server' import/g, "'use server'\n\nimport");
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
    return false;
  }
}

function main() {
  console.log('🔧 Fixing use client/import issues...\n');
  
  const files = glob.sync('**/*.{tsx,ts,jsx,js}', { 
    ignore: ['**/node_modules/**', '**/.next/**', '**/scripts/**']
  });
  
  let fixed = 0;
  for (const file of files) {
    if (fixFile(file)) {
      fixed++;
    }
  }
  
  console.log(`\n✨ Fixed ${fixed} files`);
}

main();

