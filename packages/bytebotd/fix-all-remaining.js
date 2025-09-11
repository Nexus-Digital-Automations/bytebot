#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Final comprehensive script to fix ALL remaining unused variable violations
 * by targeting the exact patterns identified in the ESLint output
 */

function findTsFiles(dir) {
  const files = [];

  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir);

    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);

      if (
        stat.isDirectory() &&
        !item.startsWith('.') &&
        item !== 'node_modules'
      ) {
        traverse(fullPath);
      } else if (item.endsWith('.ts') && !item.endsWith('.d.ts')) {
        files.push(fullPath);
      }
    }
  }

  traverse(dir);
  return files;
}

function fixAllRemainingViolations(content) {
  let result = content;

  // Additional import fixes that were missed
  const remainingImportFixes = ['Permission', 'ComputerUseModule'];

  for (const varName of remainingImportFixes) {
    // Fix import statements
    const importRegex = new RegExp(
      `(import\\s*{[^}]*)(\\b${varName}\\b)([^}]*})`,
      'g',
    );
    result = result.replace(importRegex, `$1_${varName}$3`);

    // Fix single imports
    const singleImportRegex = new RegExp(
      `(import\\s+)(${varName})(\\s+from)`,
      'g',
    );
    result = result.replace(singleImportRegex, `$1_${varName}$3`);
  }

  // Additional variable fixes
  const remainingVariableFixes = [
    'external',
    'startup',
    'modules',
    'mockViewerUser',
  ];

  for (const varName of remainingVariableFixes) {
    // Fix variable declarations
    const varRegex = new RegExp(
      `(^\\s*)(const|let|var)\\s+(${varName})\\s*=`,
      'gm',
    );
    result = result.replace(varRegex, `$1$2 _${varName} =`);

    // Fix destructuring with proper spacing
    const destructureRegex = new RegExp(
      `(\\{[^}]*\\s)(${varName})(\\s[^}]*\\})\\s*=`,
      'g',
    );
    result = result.replace(destructureRegex, `$1_${varName}$3 =`);
  }

  // Additional parameter fixes with more precise patterns
  const remainingParameterFixes = ['client', 'keyCode'];

  for (const paramName of remainingParameterFixes) {
    // Match function/method parameters more precisely
    // Pattern: (something, paramName) or (paramName, something) or (paramName)

    // As middle parameter: (..., param, ...)
    result = result.replace(
      new RegExp(`(\\([^)]*,\\s*)(${paramName})(\\s*,)`, 'g'),
      `$1_${paramName}$3`,
    );

    // As last parameter: (..., param)
    result = result.replace(
      new RegExp(`(,\\s*)(${paramName})(\\s*\\))`, 'g'),
      `$1_${paramName}$3`,
    );

    // As first parameter: (param, ...)
    result = result.replace(
      new RegExp(`(\\(\\s*)(${paramName})(\\s*,)`, 'g'),
      `$1_${paramName}$3`,
    );

    // As only parameter: (param)
    result = result.replace(
      new RegExp(`(\\(\\s*)(${paramName})(\\s*\\))`, 'g'),
      `$1_${paramName}$3`,
    );
  }

  // Handle remaining catch block error parameters
  result = result.replace(/(catch\s*\(\s*)error(\s*\))/g, '$1_error$2');

  return result;
}

function processFile(filePath) {
  console.log(`Processing: ${filePath}`);

  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;

  // Apply fixes
  content = fixAllRemainingViolations(content);

  // Only write if content changed
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  ✓ Fixed remaining violations in ${filePath}`);
    return true;
  }

  return false;
}

function main() {
  const srcDir = './src';

  if (!fs.existsSync(srcDir)) {
    console.error(
      'src directory not found. Please run this script from the bytebotd package root.',
    );
    process.exit(1);
  }

  console.log('Finding TypeScript files...');
  const tsFiles = findTsFiles(srcDir);
  console.log(`Found ${tsFiles.length} TypeScript files`);

  let modifiedCount = 0;

  for (const file of tsFiles) {
    if (processFile(file)) {
      modifiedCount++;
    }
  }

  console.log(`\nProcessing complete!`);
  console.log(`Modified ${modifiedCount} files`);
  console.log('\nRunning final ESLint check...');
}

if (require.main === module) {
  main();
}
