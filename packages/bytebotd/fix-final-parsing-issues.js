#!/usr/bin/env node

/**
 * SUBAGENT 3 - FINAL TARGETED PARSING ERROR FIX
 *
 * This script fixes the remaining critical parsing errors in specific files.
 */

const fs = require('fs');

// Specific fixes for the most problematic patterns
function fixCriticalParsingErrors(content) {
  // Fix 1: Method signature with malformed parameters
  content = content.replace(
    /async executeWithRetry<T>\(\s*,\s*operation: \(\) => Promise<T>,\s*options: \{\s*,\s*maxAttempts: number;\s*,/gs,
    'async executeWithRetry<T>(\n    operation: () => Promise<T>,\n    options: {\n      maxAttempts: number;'
  );

  // Fix 2: Object type definitions with hanging commas
  content = content.replace(/{\s*,\s*([a-zA-Z_$])/g, '{\n      $1');
  content = content.replace(/;\s*,\s*([a-zA-Z_$])/g, ';\n      $1');

  // Fix 3: Function call arguments with malformed structure
  content = content.replace(/\(\s*,\s*([a-zA-Z_$])/g, '(\n    $1');
  content = content.replace(/,\s*,\s*([a-zA-Z_$])/g, ',\n    $1');

  // Fix 4: Missing opening braces for describe/it blocks
  content = content.replace(
    /it\s*\(\s*'([^']+)',\s*async\s*\(\)\s*=>\s*([a-zA-Z])/g,
    "it('$1', async () => {\n    $2"
  );

  content = content.replace(
    /describe\s*\(\s*'([^']+)',\s*\(\)\s*=>\s*([a-zA-Z])/g,
    "describe('$1', () => {\n  $2"
  );

  // Fix 5: Function parameters with malformed structure in createFailureScenario calls
  content = content.replace(
    /createFailureScenario\(\s*([^{]+)/g,
    'createFailureScenario({\n    $1'
  );

  // Fix 6: Fix beforeAll function call
  content = content.replace(
    /beforeAll\s*\(\s*async\s*\(\)\s*=>\s*testModule\s*=/g,
    'beforeAll(async () => {\n    testModule ='
  );

  // Fix 7: Fix specific method parameter alignment issues
  content = content.replace(
    /strategy: 'linear' \| 'exponential' \| 'fibonacci';\s*,\s*/g,
    "strategy: 'linear' | 'exponential' | 'fibonacci';\n      "
  );

  // Fix 8: Fix template literal issues with line breaks
  content = content.replace(
    /`scenario\$\{Date\.now\(\)\}\s*\$\{Math\.random\(\)\.toString\(36\)\.substring\(7\)\}`/g,
    '`scenario_${Date.now()}_${Math.random().toString(36).substring(7)}`'
  );

  // Fix 9: Fix return statement formatting in interfaces
  content = content.replace(
    /return \{\s*,\s*/g,
    'return {\n      '
  );

  // Fix 10: Fix specific error patterns we've identified
  content = content.replace(
    /(\w+):\s*string;\s*;\s*/g,
    '$1: string;\n  '
  );

  return content;
}

// Main execution for specific files
function main() {
  const problematicFiles = [
    'src/common/__tests__/cua-error-recovery-integration.spec.ts',
    'src/configuration/configuration-api.controller.ts'
  ];

  let totalFixed = 0;

  for (const file of problematicFiles) {
    if (!fs.existsSync(file)) {
      console.log(`File ${file} not found, skipping...`);
      continue;
    }

    try {
      const content = fs.readFileSync(file, 'utf8');
      const fixedContent = fixCriticalParsingErrors(content);

      if (content !== fixedContent) {
        fs.writeFileSync(file, fixedContent, 'utf8');
        console.log(`✅ Critical fixes applied to: ${file}`);
        totalFixed++;
      } else {
        console.log(`ℹ️  No additional fixes needed for: ${file}`);
      }
    } catch (error) {
      console.error(`❌ Error processing ${file}: ${error.message}`);
    }
  }

  console.log(`\n🎯 Critical fixes applied to ${totalFixed} files`);
  console.log('🚀 SUBAGENT 3 final targeted fix complete!');
}

// Run the script
main();