#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Fix embedded newlines in TypeScript files
 */
function fixEmbeddedNewlines(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    let originalContent = content;
    let hasChanges = false;

    // Fix multiple patterns of embedded newlines:
    // 1. \\n patterns in strings and comments
    // 2. Malformed multiline patterns
    // 3. Mixed character encodings

    // Pattern 1: Direct \\n replacements in code
    content = content.replace(/\\n(?=\s*[A-Za-z_$])/g, '\n');

    // Pattern 2: Embedded newlines in class/interface/function bodies
    content = content.replace(/(\{|;|:)\s*\\n\s*([A-Za-z_$@])/g, '$1\n  $2');

    // Pattern 3: Malformed docstring patterns
    content = content.replace(/\/\*\*\\n\s*\*/g, '/**\n *');
    content = content.replace(/\*\\n\s*\*\//g, '*\n */');

    // Pattern 4: Import/export statement newlines
    content = content.replace(/;\\n(import|export|interface|class|function)/g, ';\n$1');

    // Pattern 5: Clean up class/interface body formatting
    content = content.replace(/\{\\n\s*([A-Za-z_$])/g, '{\n  $1');
    content = content.replace(/([;}])\\n\s*([A-Za-z_$@])/g, '$1\n  $2');

    // Pattern 6: Fix method/function body formatting
    content = content.replace(/\):?\s*\{\\n/g, ') {\n');
    content = content.replace(/\}\s*\\n\s*([A-Za-z_$@])/g, '}\n\n$1');

    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      console.log(`✓ Fixed embedded newlines in: ${filePath}`);
      hasChanges = true;
    }

    return hasChanges;
  } catch (error) {
    console.error(`✗ Error processing ${filePath}:`, error.message);
    return false;
  }
}

/**
 * Recursively process all TypeScript files
 */
function processDirectory(dir, excludeDirs = ['node_modules', '.git', 'dist', 'build', 'coverage']) {
  let totalFixed = 0;
  let totalProcessed = 0;

  try {
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        if (!excludeDirs.includes(item) && !item.startsWith('.')) {
          const subResult = processDirectory(fullPath, excludeDirs);
          totalFixed += subResult.fixed;
          totalProcessed += subResult.processed;
        }
      } else if (item.endsWith('.ts') && !item.endsWith('.d.ts')) {
        totalProcessed++;
        if (fixEmbeddedNewlines(fullPath)) {
          totalFixed++;
        }
      }
    }
  } catch (error) {
    console.error(`Error processing directory ${dir}:`, error.message);
  }

  return { fixed: totalFixed, processed: totalProcessed };
}

// Main execution
console.log('🔧 Starting embedded newline cleanup...\n');

const startTime = Date.now();
const srcResult = processDirectory('./src');

const endTime = Date.now();
const duration = endTime - startTime;

console.log('\n📊 Summary:');
console.log(`   Files processed: ${srcResult.processed}`);
console.log(`   Files fixed: ${srcResult.fixed}`);
console.log(`   Duration: ${duration}ms`);

if (srcResult.fixed > 0) {
  console.log('\n✅ Newline cleanup completed successfully!');
  console.log('🚀 Ready to retry TypeScript compilation...');
} else {
  console.log('\n✨ No embedded newlines found - codebase is clean!');
}

process.exit(0);