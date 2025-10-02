/**
 * Automated Script to Replace Hardcoded Colors with Design Tokens
 * 
 * This script systematically replaces all hardcoded Tailwind color classes
 * and hex colors with semantic design tokens from our new color system.
 * 
 * Usage: node scripts/fix-hardcoded-colors.js
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Color replacement mappings
const COLOR_REPLACEMENTS = [
  // Text colors - Positive/Success
  { pattern: /text-green-(\d+)/g, replacement: 'text-success' },
  { pattern: /text-emerald-(\d+)/g, replacement: 'text-success' },
  
  // Text colors - Negative/Destructive
  { pattern: /text-red-(\d+)/g, replacement: 'text-destructive' },
  
  // Text colors - Warning
  { pattern: /text-yellow-(\d+)/g, replacement: 'text-warning' },
  { pattern: /text-amber-(\d+)/g, replacement: 'text-warning' },
  
  // Text colors - Info
  { pattern: /text-blue-(\d+)/g, replacement: 'text-info' },
  
  // Background colors - Positive/Success
  { pattern: /bg-green-50\/\d+/g, replacement: 'bg-success-bg' },
  { pattern: /bg-green-100\/\d+/g, replacement: 'bg-success-bg' },
  { pattern: /bg-green-(\d+)(?!\/)/g, replacement: 'bg-success' },
  { pattern: /bg-emerald-(\d+)/g, replacement: 'bg-success' },
  
  // Background colors - Negative/Destructive
  { pattern: /bg-red-50\/\d+/g, replacement: 'bg-destructive-bg' },
  { pattern: /bg-red-100\/\d+/g, replacement: 'bg-destructive-bg' },
  { pattern: /bg-red-(\d+)(?!\/)/g, replacement: 'bg-destructive' },
  
  // Background colors - Warning
  { pattern: /bg-yellow-(\d+)/g, replacement: 'bg-warning-bg' },
  { pattern: /bg-amber-(\d+)/g, replacement: 'bg-warning-bg' },
  
  // Background colors - Info
  { pattern: /bg-blue-(\d+)/g, replacement: 'bg-info-bg' },
  
  // Border colors - Positive/Success
  { pattern: /border-green-(\d+)/g, replacement: 'border-success/20' },
  { pattern: /border-emerald-(\d+)/g, replacement: 'border-success/20' },
  
  // Border colors - Negative/Destructive
  { pattern: /border-red-(\d+)/g, replacement: 'border-destructive/20' },
  
  // Border colors - Warning
  { pattern: /border-yellow-(\d+)/g, replacement: 'border-warning/20' },
  { pattern: /border-amber-(\d+)/g, replacement: 'border-warning/20' },
  
  // Border colors - Info
  { pattern: /border-blue-(\d+)/g, replacement: 'border-info/20' },
  
  // Dark mode variants - remove as we have consistent colors now
  { pattern: /dark:bg-green-(\d+)\/?\d*/g, replacement: '' },
  { pattern: /dark:bg-red-(\d+)\/?\d*/g, replacement: '' },
  { pattern: /dark:text-green-(\d+)/g, replacement: '' },
  { pattern: /dark:text-red-(\d+)/g, replacement: '' },
  { pattern: /dark:border-green-(\d+)\/?\d*/g, replacement: '' },
  { pattern: /dark:border-red-(\d+)\/?\d*/g, replacement: '' },
];

// Hex color replacements for chart files
const HEX_REPLACEMENTS = [
  // Green shades → success
  { pattern: /#10b981|#16a34a|#22c55e|#4ade80/gi, replacement: 'hsl(var(--chart-positive))' },
  { pattern: /#8b5cf6|#a78bfa/gi, replacement: 'hsl(var(--chart-3))' },
  
  // Red shades → destructive
  { pattern: /#ef4444|#dc2626|#f87171|#ff6b6b/gi, replacement: 'hsl(var(--chart-negative))' },
  
  // Blue shades → info
  { pattern: /#3b82f6|#60a5fa|#2563eb/gi, replacement: 'hsl(var(--chart-3))' },
  
  // Yellow/Orange → warning
  { pattern: /#f97316|#fb923c/gi, replacement: 'hsl(var(--chart-4))' },
  
  // Gray shades → neutral
  { pattern: /#9ca3af|#6b7280/gi, replacement: 'hsl(var(--chart-neutral))' },
];

/**
 * Process a single file
 */
function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Apply color class replacements
    COLOR_REPLACEMENTS.forEach(({ pattern, replacement }) => {
      if (pattern.test(content)) {
        content = content.replace(pattern, replacement);
        modified = true;
      }
    });
    
    // Apply hex color replacements
    HEX_REPLACEMENTS.forEach(({ pattern, replacement }) => {
      if (pattern.test(content)) {
        content = content.replace(pattern, replacement);
        modified = true;
      }
    });
    
    // Clean up double spaces from dark mode removal
    content = content.replace(/\s{2,}/g, ' ');
    
    // Save if modified
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

/**
 * Main execution
 */
function main() {
  console.log('🎨 Starting hardcoded color replacement...\n');
  
  // Target directories
  const targets = [
    'app/dashboard/**/*.{tsx,ts,jsx,js}',
    'components/**/*.{tsx,ts,jsx,js}',
    'app/*.{tsx,ts,jsx,js}',
  ];
  
  let totalFiles = 0;
  let modifiedFiles = 0;
  
  for (const target of targets) {
    const files = glob.sync(target, { ignore: ['**/node_modules/**', '**/.next/**'] });
    
    for (const file of files) {
      totalFiles++;
      if (processFile(file)) {
        modifiedFiles++;
      }
    }
  }
  
  console.log(`\n✨ Complete!`);
  console.log(`📊 ${modifiedFiles} of ${totalFiles} files modified`);
}

// Run
main();

