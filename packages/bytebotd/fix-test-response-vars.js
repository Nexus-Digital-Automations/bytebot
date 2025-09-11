#!/usr/bin/env node

/**
 * Automated Test File Response Variable Fix Script
 *
 * This script fixes a common pattern in test files where variables are declared
 * with underscore prefix (const _response) but then used without underscore (response),
 * causing "no-undef" ESLint errors.
 *
 * @author ESLint Test Cleanup Specialist
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

/**
 * Fix response variable inconsistencies in test files
 */
function fixResponseVariables() {
  console.log('🔧 Starting automated test response variable fixes...');

  // Find all test files
  const testFiles = glob.sync(
    '**/*.{spec,test,e2e-spec,mock-spec,simple-spec}.ts',
    {
      cwd: process.cwd(),
      ignore: ['node_modules/**', 'dist/**', 'coverage/**'],
    },
  );

  console.log(`📁 Found ${testFiles.length} test files to process`);

  let totalFixes = 0;

  testFiles.forEach((filePath) => {
    const fullPath = path.resolve(filePath);
    console.log(`\n🔍 Processing: ${filePath}`);

    try {
      let content = fs.readFileSync(fullPath, 'utf8');
      const originalContent = content;
      let fileFixes = 0;

      // Pattern 1: Fix const _response but used as response
      const responsePatterns = [
        // Match const _variable = ... followed by usage of variable without underscore
        {
          // Find const _response = await request(...
          regex: /const\s+_response\s*=\s*await\s+request\([^}]+\}\);?/g,
          replacement: (match) =>
            match.replace('const _response', 'const response'),
        },
        {
          // Find const _result = ... pattern
          regex: /const\s+_result\s*=\s*[^;]+;/g,
          replacement: (match) =>
            match.replace('const _result', 'const result'),
        },
        {
          // Find const _error = ... in catch blocks
          regex: /catch\s*\(\s*_error\s*\)\s*{/g,
          replacement: 'catch (error) {',
        },
      ];

      // Apply fixes
      responsePatterns.forEach((pattern) => {
        const matches = content.match(pattern.regex);
        if (matches) {
          content = content.replace(pattern.regex, pattern.replacement);
          fileFixes += matches.length;
        }
      });

      // Pattern 2: Fix import issues
      const importFixes = [
        {
          // Fix incorrect imports like _Test, _TestingModule
          regex: /import\s*{\s*_Test,\s*_TestingModule\s*}/g,
          replacement: 'import { Test, TestingModule }',
        },
        {
          // Fix _TestingModule as TestingModule
          regex: /_TestingModule/g,
          replacement: 'TestingModule',
        },
        {
          // Fix _Test as Test
          regex: /_Test(?!ingModule)/g,
          replacement: 'Test',
        },
      ];

      importFixes.forEach((fix) => {
        const matches = content.match(fix.regex);
        if (matches) {
          content = content.replace(fix.regex, fix.replacement);
          fileFixes += matches.length;
        }
      });

      // Pattern 3: Fix undefined variables that should be defined
      const undefinedVarFixes = [
        {
          // Fix i is not defined in loops - add let i declaration
          regex: /for\s*\(\s*i\s*=\s*0/g,
          replacement: 'for (let i = 0',
        },
        {
          // Fix __error is not defined - should be error or _error
          regex: /__error/g,
          replacement: '_error',
        },
      ];

      undefinedVarFixes.forEach((fix) => {
        const matches = content.match(fix.regex);
        if (matches) {
          content = content.replace(fix.regex, fix.replacement);
          fileFixes += matches.length;
        }
      });

      // Write file if changes were made
      if (content !== originalContent) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`  ✅ Applied ${fileFixes} fixes`);
        totalFixes += fileFixes;
      } else {
        console.log(`  ℹ️  No fixes needed`);
      }
    } catch (error) {
      console.error(`  ❌ Error processing ${filePath}:`, error.message);
    }
  });

  console.log(
    `\n🎉 Total fixes applied: ${totalFixes} across ${testFiles.length} test files`,
  );
}

// Execute if called directly
if (require.main === module) {
  fixResponseVariables();
}

module.exports = { fixResponseVariables };
