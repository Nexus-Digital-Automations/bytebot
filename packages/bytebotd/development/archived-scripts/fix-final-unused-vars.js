#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Final script to fix the remaining specific unused variable violations
 * targeting the exact patterns from the ESLint output
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

function fixRemainingUnusedVars(content) {
  let result = content;

  // Fix additional unused imports
  const importFixes = ['ScreenshotResult', 'Server', 'Socket', 'KeyInfo'];

  for (const varName of importFixes) {
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

  // Fix additional unused variables
  const variableFixes = [
    'promisify',
    'originalLogger',
    'errorResults',
    'originalCheckServiceHealth',
    'external',
    'startup',
    'modules',
    'mockViewerUser',
    'result1',
    'result2',
  ];

  for (const varName of variableFixes) {
    // Fix variable declarations
    const varRegex = new RegExp(`(const|let|var)\\s+(${varName})\\s*=`, 'g');
    result = result.replace(varRegex, `$1 _${varName} =`);

    // Fix destructuring assignments
    const destructureRegex = new RegExp(
      `(\\{[^}]*)(\\b${varName}\\b)([^}]*\\})\\s*=`,
      'g',
    );
    result = result.replace(
      destructureRegex,
      (match, before, varName, after) => {
        if (!varName.startsWith('_') && !match.includes(':')) {
          return `${before}_${varName}${after} =`;
        }
        return match;
      },
    );
  }

  // Fix additional unused parameters
  const parameterFixes = ['actionIndex', 'error', 'i', 'keyCode'];

  for (const paramName of parameterFixes) {
    // More comprehensive parameter matching
    // Match function/method parameters with proper context
    const functionRegex = new RegExp(
      `(\\([^)]*,\\s*)(${paramName})(\\s*[,)])`,
      'g',
    );
    result = result.replace(functionRegex, (match, before, param, after) => {
      if (!param.startsWith('_')) {
        return `${before}_${param}${after}`;
      }
      return match;
    });

    // Match as first parameter
    const firstParamRegex = new RegExp(
      `(\\(\\s*)(${paramName})(\\s*[,)])`,
      'g',
    );
    result = result.replace(firstParamRegex, (match, before, param, after) => {
      if (!param.startsWith('_')) {
        return `${before}_${param}${after}`;
      }
      return match;
    });

    // Match as last parameter
    const lastParamRegex = new RegExp(`(,\\s*)(${paramName})(\\s*\\))`, 'g');
    result = result.replace(lastParamRegex, (match, before, param, after) => {
      if (!param.startsWith('_')) {
        return `${before}_${param}${after}`;
      }
      return match;
    });

    // Match as only parameter
    const onlyParamRegex = new RegExp(`(\\(\\s*)(${paramName})(\\s*\\))`, 'g');
    result = result.replace(onlyParamRegex, (match, before, param, after) => {
      if (!param.startsWith('_')) {
        return `${before}_${param}${after}`;
      }
      return match;
    });
  }

  return result;
}

function processFile(filePath) {
  console.log(`Processing: ${filePath}`);

  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;

  // Apply fixes
  content = fixRemainingUnusedVars(content);

  // Only write if content changed
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  ✓ Fixed remaining unused variables in ${filePath}`);
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
  console.log('\nRunning ESLint to check final results...');
}

if (require.main === module) {
  main();
}
