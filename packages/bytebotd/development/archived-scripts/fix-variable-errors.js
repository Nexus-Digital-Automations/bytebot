#!/usr/bin/env node

/**
 * Comprehensive Variable Fix Script
 * Fixes all variable naming conflicts and undefined variable references
 * in the bytebotd package that are causing TypeScript compilation failures
 */

const fs = require('fs');
const path = require('path');

// Files to fix
const files = [
  'src/computer-use/job-management.service.ts',
  'src/computer-use/dto/computer-action-validation.pipe.ts',
];

// Fix patterns
const fixes = [
  // Fix crypto reference
  { search: /(?<!_)crypto(?!_)/g, replace: '_crypto' },

  // Fix undefined 'error' variables in catch blocks - change to _error
  {
    search: /catch \(([^)]+)\) \{[^}]*error instanceof Error/g,
    replace: (match, variable) => {
      return match.replace(
        /error instanceof Error/g,
        `${variable} instanceof Error`,
      );
    },
  },

  // Fix undefined 'result' variables
  { search: /(?<![\w_])result(?![\w_])/g, replace: '_result' },

  // Fix _i variable reference
  { search: /_i/g, replace: 'i' },

  // Fix Logger _error method calls
  { search: /this\.logger\._error/g, replace: 'this.logger.error' },
];

console.log('🔧 Starting comprehensive variable fix...\n');

files.forEach((fileName) => {
  const filePath = path.join(__dirname, fileName);
  console.log(`📁 Processing: ${fileName}`);

  if (!fs.existsSync(filePath)) {
    console.log(`   ❌ File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;

  // Apply fixes
  fixes.forEach((fix, index) => {
    const before = content;
    if (typeof fix.replace === 'function') {
      content = content.replace(fix.search, fix.replace);
    } else {
      content = content.replace(fix.search, fix.replace);
    }
    if (before !== content) {
      console.log(`   ✅ Applied fix ${index + 1}`);
    }
  });

  // Manual fixes for specific patterns

  // Fix specific error variable patterns in catch blocks
  content = content.replace(
    /catch \(([^)]+)\) \{[\s\S]*?error instanceof Error.*?\}/g,
    (match, variable) => {
      return match.replace(/(?<!_)error(?!_)/g, variable);
    },
  );

  // Fix formatValidationErrors method parameter conflicts
  content = content.replace(
    /formatValidationErrors\(.*?\): Array<\{[\s\S]*?\}> \{[\s\S]*?return errors\.map\(([^)]+)\) => \(\{[\s\S]*?\}\)\);[\s\S]*?\}/g,
    (match, parameter) => {
      // Replace 'error' with the actual parameter name in the method body
      return match.replace(
        /(?<![\w_])error\.([a-zA-Z_][a-zA-Z0-9_]*)/g,
        `${parameter}.$1`,
      );
    },
  );

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`   🎉 File updated successfully`);
  } else {
    console.log(`   📝 No changes needed`);
  }

  console.log('');
});

console.log('✨ Variable fix completed!\n');
console.log('🧪 Running ESLint to verify fixes...\n');

// Run ESLint to verify
const { execSync } = require('child_process');
try {
  const eslintResult = execSync(
    'npx eslint src/computer-use/job-management.service.ts src/computer-use/dto/computer-action-validation.pipe.ts --no-cache',
    { encoding: 'utf8', cwd: __dirname },
  );
  console.log('✅ ESLint check passed!');
} catch (error) {
  console.log('❌ ESLint errors remain:');
  console.log(error.stdout);
  console.log('\n🔄 Will need manual fixes for remaining issues');
}
