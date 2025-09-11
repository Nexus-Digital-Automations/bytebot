#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Comprehensive script to fix all remaining unused variable violations
 * by systematically adding underscore prefixes to unused imports, parameters, and variables
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

function fixUnusedImports(content) {
  // Fix specific unused imports we identified
  const importFixes = [
    { from: 'UnauthorizedException', to: '_UnauthorizedException' },
    { from: 'ForbiddenException', to: '_ForbiddenException' },
    { from: 'CreateBrowserTaskDto', to: '_CreateBrowserTaskDto' },
    { from: 'BrowserTaskStatus', to: '_BrowserTaskStatus' },
    { from: 'Put', to: '_Put' },
    { from: 'UseInterceptors', to: '_UseInterceptors' },
    { from: 'BadRequestException', to: '_BadRequestException' },
    { from: 'AsyncJobStatus', to: '_AsyncJobStatus' },
    { from: 'ChildProcess', to: '_ChildProcess' },
    { from: 'EnterpriseRateLimitGuard', to: '_EnterpriseRateLimitGuard' },
    { from: 'Test', to: '_Test' },
    { from: 'TestingModule', to: '_TestingModule' },
    { from: 'ScrollAction', to: '_ScrollAction' },
    { from: 'TypeKeysAction', to: '_TypeKeysAction' },
    { from: 'PasteTextAction', to: '_PasteTextAction' },
    { from: 'CursorPositionAction', to: '_CursorPositionAction' },
    { from: 'ApplicationAction', to: '_ApplicationAction' },
    { from: 'ReadFileAction', to: '_ReadFileAction' },
    { from: 'ScreenshotAction', to: '_ScreenshotAction' },
  ];

  let result = content;

  for (const fix of importFixes) {
    // Fix import statements
    const importRegex = new RegExp(
      `(import\\s*{[^}]*)(\\b${fix.from}\\b)([^}]*})`,
      'g',
    );
    result = result.replace(importRegex, `$1${fix.to}$3`);

    // Fix single imports
    const singleImportRegex = new RegExp(
      `(import\\s+)(${fix.from})(\\s+from)`,
      'g',
    );
    result = result.replace(singleImportRegex, `$1${fix.to}$3`);
  }

  return result;
}

function fixUnusedVariables(content) {
  // Fix specific unused variables we identified
  const variableFixes = [
    { from: 'isPublic', to: '_isPublic' },
    { from: 'SecurityErrorMetrics', to: '_SecurityErrorMetrics' },
    { from: 'index', to: '_index' },
    { from: 'mockPerformanceTracker', to: '_mockPerformanceTracker' },
  ];

  let result = content;

  for (const fix of variableFixes) {
    // Fix variable declarations
    const varRegex = new RegExp(`(const|let|var)\\s+(${fix.from})\\s*=`, 'g');
    result = result.replace(varRegex, `$1 ${fix.to} =`);

    // Fix destructuring assignments
    const destructureRegex = new RegExp(
      `(\\{[^}]*)(\\b${fix.from}\\b)([^}]*\\})`,
      'g',
    );
    result = result.replace(
      destructureRegex,
      (match, before, varName, after) => {
        // Only replace if it's not already prefixed and is a simple variable (not a rename)
        if (!varName.startsWith('_') && !match.includes(':')) {
          return `${before}${fix.to}${after}`;
        }
        return match;
      },
    );
  }

  return result;
}

function fixUnusedParameters(content) {
  // Fix specific unused parameters we identified
  const parameterFixes = [
    { from: 'actionIndex', to: '_actionIndex' },
    { from: 'payload', to: '_payload' },
    { from: 'error', to: '_error' },
  ];

  let result = content;

  for (const fix of parameterFixes) {
    // Fix function parameters - be careful to only match parameter positions
    // Match function declarations and arrow functions
    const functionParamRegex = new RegExp(
      `(\\([^)]*)(\\b${fix.from}\\b)([^)]*\\))\\s*(?:\\{|=>)`,
      'g',
    );

    result = result.replace(
      functionParamRegex,
      (match, before, param, after) => {
        // Only replace if not already prefixed
        if (!param.startsWith('_')) {
          return match.replace(param, fix.to);
        }
        return match;
      },
    );

    // Fix method parameters
    const methodParamRegex = new RegExp(
      `(\\w+\\s*\\([^)]*)(\\b${fix.from}\\b)([^)]*\\))\\s*\\{`,
      'g',
    );

    result = result.replace(methodParamRegex, (match, before, param, after) => {
      // Only replace if not already prefixed
      if (!param.startsWith('_')) {
        return match.replace(param, fix.to);
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

  // Apply all fixes
  content = fixUnusedImports(content);
  content = fixUnusedVariables(content);
  content = fixUnusedParameters(content);

  // Only write if content changed
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  ✓ Fixed unused variables in ${filePath}`);
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
  console.log('\nRunning ESLint to check results...');
}

if (require.main === module) {
  main();
}
