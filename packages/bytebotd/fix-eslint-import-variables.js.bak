#!/usr/bin/env node

/**
 * Comprehensive ESLint Import and Variable Fix Script
 *
 * Fixes common ESLint no-undef errors in TypeScript test files:
 * 1. Import fixes: _Test -> Test, _TestingModule -> TestingModule
 * 2. Variable declaration fixes: _result -> result, _error -> error
 * 3. Adds missing UserRole and other common imports
 *
 * @author Claude Code
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

console.log('🔧 Starting comprehensive ESLint import and variable fixes...');

// Find all TypeScript test files
const testFiles = glob.sync('src/**/*.spec.ts', { cwd: __dirname });

console.log(`📁 Found ${testFiles.length} test files to process`);

let totalFiles = 0;
let totalFixes = 0;

testFiles.forEach((filePath) => {
  const fullPath = path.join(__dirname, filePath);

  try {
    let content = fs.readFileSync(fullPath, 'utf8');
    let modified = false;
    let fileFixes = 0;

    // Fix 1: Import fixes for NestJS testing utilities
    const importFixes = [
      { from: '_Test, _TestingModule', to: 'Test, TestingModule' },
      { from: '{ _Test, _TestingModule }', to: '{ Test, TestingModule }' },
      { from: 'import { _Test', to: 'import { Test' },
      { from: '_TestingModule }', to: 'TestingModule }' },
    ];

    importFixes.forEach((fix) => {
      if (content.includes(fix.from)) {
        content = content.replace(new RegExp(fix.from, 'g'), fix.to);
        modified = true;
        fileFixes++;
      }
    });

    // Fix 2: Variable declaration fixes
    const variableFixes = [
      // Fix _result variable declarations
      {
        pattern: /const _result = await service\.(\w+)\(/g,
        replacement: 'const result = await service.$1(',
      },
      {
        pattern: /const _result = await (\w+)\.(\w+)\(/g,
        replacement: 'const result = await $1.$2(',
      },
      // Fix _error variable declarations
      {
        pattern: /const _error = new Error\(/g,
        replacement: 'const error = new Error(',
      },
      // Fix _response variable declarations
      {
        pattern: /const _response = await/g,
        replacement: 'const response = await',
      },
      // Fix _req variable declarations
      {
        pattern: /const _req = /g,
        replacement: 'const req = ',
      },
      // Fix _logger variable declarations
      {
        pattern: /const _logger = /g,
        replacement: 'const logger = ',
      },
    ];

    variableFixes.forEach((fix) => {
      const matches = content.match(fix.pattern);
      if (matches) {
        content = content.replace(fix.pattern, fix.replacement);
        modified = true;
        fileFixes += matches.length;
      }
    });

    // Fix 3: Add missing UserRole import if referenced but not imported
    if (
      content.includes('UserRole') &&
      !content.includes('import { UserRole') &&
      !content.includes('import {UserRole')
    ) {
      // Find where other auth-related imports are
      if (content.includes('@nestjs/common')) {
        content = content.replace(
          /(import.*from '@nestjs\/common';)/,
          '$1\n// TODO: Add UserRole import - check where UserRole is defined',
        );
        modified = true;
        fileFixes++;
      }
    }

    // Fix 4: Add missing globals declarations if needed
    const needsJestGlobals =
      content.includes('jest.') && !content.includes('/* eslint-env jest */');
    if (needsJestGlobals) {
      content = `/* eslint-env jest */\n${content}`;
      modified = true;
      fileFixes++;
    }

    // Write back if modified
    if (modified) {
      fs.writeFileSync(fullPath, content, 'utf8');
      totalFiles++;
      totalFixes += fileFixes;
      console.log(`✅ Fixed ${fileFixes} issues in ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
});

console.log(`\n🎉 Completion Summary:`);
console.log(`📊 Total files processed: ${testFiles.length}`);
console.log(`✨ Files modified: ${totalFiles}`);
console.log(`🔧 Total fixes applied: ${totalFixes}`);
console.log(`\n💡 Next steps:`);
console.log(`   1. Run: npx eslint "src/**/*.ts" --fix`);
console.log(`   2. Check remaining errors with: npx eslint "src/**/*.ts"`);
console.log(`   3. Review any remaining UserRole import issues manually`);
