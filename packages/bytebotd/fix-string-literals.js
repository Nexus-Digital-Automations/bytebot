#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Fix broken string literals and character encoding issues
 */
function fixStringLiterals(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    let originalContent = content;
    let hasChanges = false;

    // Pattern 1: Fix unescaped carriage returns in strings
    content = content.replace(/(['"`])([^'"`]*?)\\r\s*\n([^'"`]*?)\1/g, '$1$2\\\\r\\\\n$3$1');

    // Pattern 2: Fix broken multiline strings with actual carriage returns
    content = content.replace(/(['"`])([^'"`]*?)\r\s*\n([^'"`]*?)(['"`])/g, '$1$2\\\\r\\\\n$3$4');

    // Pattern 3: Fix embedded newlines in string literals that break across lines
    content = content.replace(/(['"`])([^'"`]*?)\\n\s*\n([^'"`]*?)\1/g, '$1$2\\\\n$3$1');

    // Pattern 4: Fix broken template literals
    content = content.replace(/`([^`]*?)\\n\s*\n([^`]*?)`/g, '`$1\\\\n$2`');

    // Pattern 5: Fix improperly terminated strings
    content = content.replace(/(['"`])([^'"`]*?)$\s*\n\s*([^'"`]*?)\1/gm, '$1$2$3$1');

    // Pattern 6: Fix mixed string delimiters causing issues
    content = content.replace(/(['"`])([^'"`]*?)(['"`])(?=\s*[\n,;}])/g, (match, start, middle, end) => {
      if (start !== end) {
        return start + middle + start;
      }
      return match;
    });

    // Pattern 7: Clean up malformed escape sequences
    content = content.replace(/\\\\n/g, '\\n');
    content = content.replace(/\\\\r/g, '\\r');
    content = content.replace(/\\\\t/g, '\\t');

    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      console.log(`✓ Fixed string literals in: ${filePath}`);
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
        if (fixStringLiterals(fullPath)) {
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
console.log('🔧 Starting string literal cleanup...\n');

const startTime = Date.now();
const srcResult = processDirectory('./src');

const endTime = Date.now();
const duration = endTime - startTime;

console.log('\n📊 Summary:');
console.log(`   Files processed: ${srcResult.processed}`);
console.log(`   Files fixed: ${srcResult.fixed}`);
console.log(`   Duration: ${duration}ms`);

if (srcResult.fixed > 0) {
  console.log('\n✅ String literal cleanup completed successfully!');
  console.log('🚀 Ready to retry TypeScript compilation...');
} else {
  console.log('\n✨ No string literal issues found - codebase is clean!');
}

process.exit(0);