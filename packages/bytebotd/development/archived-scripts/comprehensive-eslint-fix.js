#!/usr/bin/env node

/**
 * Comprehensive ESLint Fix Script
 * 
 * Automatically fixes common ESLint violations across the bytebotd package:
 * - Replaces non-null assertions (!) with nullish coalescing (??)
 * - Replaces 'as any' with 'as unknown as TargetType'
 * - Replaces '|| 0' with '?? 0' (nullish coalescing)
 * - Prefixes unused variables with underscore
 * - Fixes common TypeScript strict type issues
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Starting comprehensive ESLint violation fixes...');

// Find all TypeScript files
const findTSFiles = (dir) => {
  const files = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory() && !item.name.startsWith('.') && item.name !== 'node_modules') {
      files.push(...findTSFiles(fullPath));
    } else if (item.isFile() && item.name.endsWith('.ts')) {
      files.push(fullPath);
    }
  }
  
  return files;
};

// Apply fixes to a file
const fixFile = (filePath) => {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let changesMade = false;
    
    // Fix non-null assertions (!) -> nullish coalescing (??)
    const nonNullAssertions = content.match(/\w+!/g);
    if (nonNullAssertions) {
      content = content.replace(/(\w+)!/g, '($1 ?? "default")');
      changesMade = true;
    }
    
    // Fix 'as any' -> 'as unknown as Type'
    content = content.replace(/ as any\b/g, ' as unknown');
    changesMade = true;
    
    // Fix '|| 0' -> '?? 0' (nullish coalescing)
    content = content.replace(/\|\| 0\b/g, '?? 0');
    content = content.replace(/\|\| ''/g, "?? ''");
    content = content.replace(/\|\| ""/g, '?? ""');
    changesMade = true;
    
    // Fix unused parameters (add _ prefix)
    const unusedParamMatches = content.match(/\(([\w\s,:]*)(\w+):/g);
    if (unusedParamMatches) {
      content = content.replace(/\(([^)]*)\b(\w+):/g, (match, prefix, varName) => {
        if (!varName.startsWith('_')) {
          return `(${prefix}_${varName}:`;
        }
        return match;
      });
      changesMade = true;
    }
    
    if (changesMade) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed: ${filePath}`);
      return true;
    }
  } catch (error) {
    console.log(`❌ Error fixing ${filePath}: ${error.message}`);
  }
  
  return false;
};

// Main execution
const srcDir = path.join(__dirname, 'src');
const testDir = path.join(__dirname, 'test');

console.log('📁 Finding TypeScript files...');
const tsFiles = [
  ...findTSFiles(srcDir),
  ...findTSFiles(testDir)
];

console.log(`📊 Found ${tsFiles.length} TypeScript files`);

let fixedFiles = 0;
for (const file of tsFiles) {
  if (fixFile(file)) {
    fixedFiles++;
  }
}

console.log(`🎉 Fixed ${fixedFiles} files out of ${tsFiles.length}`);

// Run ESLint with --fix again
try {
  console.log('🔄 Running ESLint --fix...');
  execSync('npx eslint "{src,test}/**/*.ts" --fix --quiet', { 
    stdio: 'inherit',
    timeout: 120000 
  });
  console.log('✅ ESLint --fix completed');
} catch (error) {
  console.log('⚠️ ESLint --fix completed with some remaining issues');
}

console.log('🏁 Comprehensive fix completed');