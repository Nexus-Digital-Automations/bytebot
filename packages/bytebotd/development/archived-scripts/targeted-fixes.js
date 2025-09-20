#!/usr/bin/env node
/**
 * Targeted ESLint Fixes for bytebotd Package
 * Carefully fixes specific common issues without introducing new problems
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🎯 Starting targeted ESLint fixes for bytebotd package...\n');

// Get current violation count
function getCurrentViolationCount() {
  try {
    const result = execSync(
      'npx eslint "{src,test}/**/*.ts" 2>&1 | grep -c "error\\|warning"',
      { encoding: 'utf8', cwd: __dirname },
    );
    return parseInt(result.trim());
  } catch (error) {
    return 0;
  }
}

const initialCount = getCurrentViolationCount();
console.log(`📊 Initial violation count: ${initialCount}\n`);

// Target specific problematic files for manual fixes
const targetFiles = [
  'src/cache/cache-key.generator.ts',
  'src/cache/cache.service.ts',
  'src/mcp/compressor.ts',
];

// Fix specific patterns
function fixFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`   ❌ File not found: ${filePath}`);
    return false;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  let fixesApplied = 0;

  // Fix __error to _error (but be careful about existing _error)
  if (
    content.includes('__error') &&
    !content.includes('_error instanceof Error ? __error')
  ) {
    content = content.replace(/__error/g, '_error');
    fixesApplied++;
    console.log(`   ✅ Fixed __error references`);
  }

  // Fix logger._error to logger.error
  if (content.includes('this.logger._error')) {
    content = content.replace(/this\.logger\._error/g, 'this.logger.error');
    fixesApplied++;
    console.log(`   ✅ Fixed logger._error method calls`);
  }

  // Fix specific undefined 'result' variables in cache files
  if (filePath.includes('cache') && content.includes('result = ')) {
    content = content.replace(/(?<!_)result(\s*=)/g, '_result$1');
    fixesApplied++;
    console.log(`   ✅ Fixed undefined result variables`);
  }

  // Fix _result constant reassignment in compressor.ts
  if (
    filePath.includes('compressor.ts') &&
    content.includes('const _result') &&
    content.includes('_result =')
  ) {
    content = content.replace(/const _result/g, 'let _result');
    fixesApplied++;
    console.log(`   ✅ Fixed const reassignment issue`);
  }

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(
      `   🎉 ${fixesApplied} fixes applied to ${path.basename(filePath)}`,
    );
    return true;
  } else {
    console.log(`   📝 No changes needed for ${path.basename(filePath)}`);
    return false;
  }
}

// Process target files
let totalFilesFixed = 0;
for (const file of targetFiles) {
  const filePath = path.join(__dirname, file);
  console.log(`🔍 Processing: ${file}`);

  if (fixFile(filePath)) {
    totalFilesFixed++;
  }
  console.log('');
}

// Check improvement
console.log('🧪 Checking violation count after fixes...\n');
const finalCount = getCurrentViolationCount();
const improvement = initialCount - finalCount;

console.log(`📈 Results:`);
console.log(`   Initial violations: ${initialCount}`);
console.log(`   Final violations: ${finalCount}`);
console.log(`   Improvement: ${improvement} violations fixed`);
console.log(`   Files modified: ${totalFilesFixed}`);

if (improvement > 0) {
  console.log(`\n✅ Successfully reduced violations by ${improvement}!`);
} else {
  console.log(`\n⚠️ No improvement detected. May need more targeted fixes.`);
}

console.log('\n🎯 Targeted fixes completed!');
