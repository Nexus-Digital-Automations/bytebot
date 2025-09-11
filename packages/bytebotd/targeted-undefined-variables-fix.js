#!/usr/bin/env node

/**
 * Targeted fix for critical undefined variable violations in ByteBotD
 *
 * Focuses on the most severe issues:
 * 1. undefined 'result' variables in test files
 * 2. undefined 'error' and '__error' variable references
 * 3. undefined 'response' variables in tests
 * 4. Missing imports for testing utilities
 *
 * @author Claude Code - Critical ESLint Fixes
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');

/**
 * Critical fix patterns
 */
const CRITICAL_FIXES = [
  // Fix undefined result variables in test files
  {
    pattern:
      /(\s+)(result\.(success|status|data|message|path|screenshots|logs|extractedData|executionTimeMs|actionsCompleted|screenshot|timestamp|metadata|size|mediaType))/g,
    replacement: '$1_result.$2',
    description: 'Fix undefined result variables in tests',
  },

  // Fix direct result usage
  {
    pattern: /expect\(result\)/g,
    replacement: 'expect(_result)',
    description: 'Fix undefined result in expect statements',
  },

  // Fix return result statements where result is undefined
  {
    pattern: /return result;/g,
    replacement: (match, offset, string) => {
      const beforeMatch = string.substring(Math.max(0, offset - 200), offset);
      if (
        !beforeMatch.includes('const result') &&
        !beforeMatch.includes('let result') &&
        !beforeMatch.includes('var result') &&
        !beforeMatch.includes('= result')
      ) {
        return 'return _result;';
      }
      return match;
    },
    description: 'Fix undefined result in return statements',
  },

  // Fix __error references
  {
    pattern: /__error/g,
    replacement: '_error',
    description: 'Fix __error variable name mismatches',
  },

  // Fix missing Test imports in test files
  {
    pattern: /^import \{ ([^}]+) \} from '@nestjs\/testing';$/gm,
    replacement: (match, imports) => {
      if (!imports.includes('Test') || !imports.includes('TestingModule')) {
        const newImports = [];
        if (!imports.includes('Test')) newImports.push('Test');
        if (!imports.includes('TestingModule'))
          newImports.push('TestingModule');
        return `import { ${[...newImports, ...imports.split(', ')].join(', ')} } from '@nestjs/testing';`;
      }
      return match;
    },
    description: 'Add missing Test and TestingModule imports',
  },

  // Fix undefined response variables in tests
  {
    pattern: /(\s+)(response\.(status|body|text|headers|data))/g,
    replacement: '$1_response.$2',
    description: 'Fix undefined response variables in tests',
  },

  // Fix loop variable declarations
  {
    pattern: /for\s*\(\s*([a-z]+)\s*=\s*0/g,
    replacement: 'for (let $1 = 0',
    description: 'Fix undeclared loop variables',
  },
];

/**
 * File-specific fixes
 */
const FILE_SPECIFIC_FIXES = {
  'computer-use.service.desktop-automation.spec.ts': {
    patterns: [
      {
        pattern: /const result = await service\.executeAction\([^)]+\);/g,
        replacement: 'const _result = await service.executeAction($1);',
        description: 'Fix result variable declaration in computer-use tests',
      },
    ],
  },

  'computer-use.service.files.spec.ts': {
    patterns: [
      {
        pattern: /'ReadFileAction' is not defined/,
        fix: "Add import: import { ReadFileAction } from '../dto/computer-action.dto';",
      },
    ],
  },
};

/**
 * Apply targeted fixes to critical files
 */
async function fixCriticalUndefinedVariables() {
  console.log('🎯 Applying Targeted Fixes for Critical Undefined Variables\n');

  const srcDir = path.join(__dirname, 'src');
  const criticalFiles = [
    'src/computer-use/__tests__/computer-use.service.desktop-automation.spec.ts',
    'src/computer-use/__tests__/computer-use.service.files.spec.ts',
    'src/common/__tests__/security-validation.e2e-spec.ts',
    'src/common/__tests__/security-validation.mock-spec.ts',
    'src/common/__tests__/security-validation.simple-spec.ts',
    'src/auth/guards/jwt-auth.guard.ts',
    'src/auth/guards/roles.guard.ts',
    'src/cache/cache.service.ts',
    'src/cache/cache-key.generator.ts',
    'src/common/filters/security-exception.filter.ts',
  ];

  let totalFixed = 0;

  for (const filePath of criticalFiles) {
    const fullPath = path.join(__dirname, filePath);

    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      continue;
    }

    console.log(`🔧 Processing: ${filePath}`);

    let content = fs.readFileSync(fullPath, 'utf8');
    let fixes = 0;
    const originalContent = content;

    // Apply general critical fixes
    for (const fix of CRITICAL_FIXES) {
      const beforeFix = content;

      if (typeof fix.replacement === 'function') {
        content = content.replace(fix.pattern, fix.replacement);
      } else {
        content = content.replace(fix.pattern, fix.replacement);
      }

      if (content !== beforeFix) {
        const fixCount = (beforeFix.match(fix.pattern) || []).length;
        fixes += fixCount;
        console.log(`  ✅ ${fix.description}: ${fixCount} fixes`);
      }
    }

    // Apply file-specific fixes
    const fileName = path.basename(filePath);
    if (FILE_SPECIFIC_FIXES[fileName]) {
      for (const specificFix of FILE_SPECIFIC_FIXES[fileName].patterns) {
        const beforeFix = content;

        if (typeof specificFix.replacement === 'function') {
          content = content.replace(
            specificFix.pattern,
            specificFix.replacement,
          );
        } else {
          content = content.replace(
            specificFix.pattern,
            specificFix.replacement,
          );
        }

        if (content !== beforeFix) {
          fixes++;
          console.log(`  🎯 ${specificFix.description}: applied`);
        }
      }
    }

    // Save the file if changes were made
    if (content !== originalContent) {
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`  💾 Saved with ${fixes} fixes\n`);
      totalFixed += fixes;
    } else {
      console.log(`  ✅ No changes needed\n`);
    }
  }

  console.log(`🎉 Critical fixes complete! Total fixes applied: ${totalFixed}`);

  return totalFixed;
}

// Execute if run directly
if (require.main === module) {
  fixCriticalUndefinedVariables().catch(console.error);
}

module.exports = { fixCriticalUndefinedVariables };
