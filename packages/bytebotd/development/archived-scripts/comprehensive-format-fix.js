#!/usr/bin/env node

/**
 * Comprehensive ESLint Format Fix Script
 * Fixes remaining parsing errors and formatting issues in ByteBotD auth tests
 */

const fs = require('fs');
const path = require('path');

// Files that need comprehensive formatting fixes
const filesToFix = [
  'src/auth/__tests__/aigent-parlant-security-bridge.integration.spec.ts',
  'src/auth/__tests__/auth.service.spec.ts',
  'src/auth/__tests__/controller-security.integration.spec.ts',
  'src/auth/__tests__/enterprise-auth-services.spec.ts',
  'src/auth/__tests__/jwt-auth.guard.security.spec.ts',
  'src/auth/__tests__/jwt-auth.guard.spec.ts',
  'src/auth/__tests__/roles.guard.security.spec.ts',
  'src/auth/__tests__/roles.guard.spec.ts',
  'src/auth/__tests__/security-penetration.spec.ts'
];

/**
 * Comprehensive formatting rules to apply
 */
const formatRules = [
  // Fix missing semicolons after expect statements
  {
    pattern: /expect\([^)]+\)[^;]*(\)\s*)(it\()/g,
    replacement: '$1;\n\n    $2'
  },
  // Fix missing line breaks after test descriptions
  {
    pattern: /\}\s*\)\s*;\s*(it\()/g,
    replacement: '});\n\n    $1'
  },
  // Fix missing line breaks in object properties
  {
    pattern: /(\w+):\s*([^,]+),(\w+):/g,
    replacement: '$1: $2,\n      $3:'
  },
  // Fix missing line breaks after console.log statements
  {
    pattern: /console\.log\([^)]+\);(\s*)(const|let|var|expect|jest)/g,
    replacement: 'console.log($1);\n      $2'
  },
  // Fix missing line breaks in function call chains
  {
    pattern: /\}\)\s*;(\s*)(it\(|describe\(|beforeEach|afterEach)/g,
    replacement: '});\n\n    $2'
  },
  // Fix object property formatting
  {
    pattern: /({[^}]*[^,\s])([\w]+):/g,
    replacement: '$1,\n      $2:'
  }
];

function formatFile(filePath) {
  console.log(`\n🔧 Formatting file: ${filePath}`);

  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let changesMade = 0;

    // Apply formatting rules
    formatRules.forEach((rule, index) => {
      const before = content;
      content = content.replace(rule.pattern, rule.replacement);
      if (content !== before) {
        changesMade++;
        console.log(`  ✅ Applied formatting rule ${index + 1}`);
      }
    });

    // Additional specific fixes for known issues

    // Fix test function spacing
    content = content.replace(/(\}\s*\)\s*;)\s*(it\s*\()/g, '$1\n\n    $2');

    // Fix expect statement formatting
    content = content.replace(/(\)\s*;)\s*(expect\s*\()/g, '$1\n      $2');

    // Fix console.log spacing
    content = content.replace(/(console\.log\([^)]+\);)\s*([a-zA-Z])/g, '$1\n      $2');

    // Fix object property spacing in expect calls
    content = content.replace(/(\w+):\s*([^,}]+),(\w+):/g, '$1: $2,\n        $3:');

    // Fix multiline object formatting
    content = content.replace(/(\{[^}]*[^,\s])\s*(\w+):/g, '$1,\n        $2:');

    if (changesMade > 0) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`  ✅ Fixed ${changesMade} formatting issues in ${filePath}`);
    } else {
      console.log(`  ℹ️  No formatting changes needed for ${filePath}`);
    }

    return changesMade;

  } catch (error) {
    console.error(`  ❌ Error formatting ${filePath}:`, error.message);
    return 0;
  }
}

function main() {
  console.log('🚀 Starting comprehensive ESLint format fix...');

  let totalChanges = 0;

  filesToFix.forEach(file => {
    const fullPath = path.join(__dirname, file);
    if (fs.existsSync(fullPath)) {
      totalChanges += formatFile(fullPath);
    } else {
      console.log(`⚠️  File not found: ${fullPath}`);
    }
  });

  console.log(`\n✅ Comprehensive formatting complete!`);
  console.log(`📊 Total changes made: ${totalChanges}`);
  console.log(`🔍 Run ESLint again to verify fixes...`);
}

if (require.main === module) {
  main();
}

module.exports = { formatFile, formatRules };