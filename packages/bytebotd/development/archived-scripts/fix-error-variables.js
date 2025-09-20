#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Targeted script to fix specific error variable patterns
 * that weren't caught by previous scripts
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

function fixErrorVariables(content) {
  let result = content;

  // Fix all patterns of: const error = or let error =
  // But NOT inside catch blocks which should already be handled
  result = result.replace(
    /(^\s*)(const|let|var)\s+(error)\s*=/gm,
    '$1$2 _$3 =',
  );

  // Fix destructuring patterns: const { error } =
  result = result.replace(
    /(const|let|var)\s*\{\s*([^}]*,\s*)?error(\s*[,}])/g,
    '$1 { $2_error$3',
  );

  // Fix function parameters named error (not in catch blocks)
  // Be very careful to avoid catch blocks
  result = result.replace(
    /(\([^)]*,\s*)error(\s*[,)])/g,
    (match, before, after) => {
      // Don't modify if this looks like it might be in a catch block context
      if (before.includes('catch')) {
        return match;
      }
      return `${before}_error${after}`;
    },
  );

  return result;
}

function processFile(filePath) {
  console.log(`Processing: ${filePath}`);

  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;

  // Apply fixes
  content = fixErrorVariables(content);

  // Only write if content changed
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  ✓ Fixed error variables in ${filePath}`);
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
}

if (require.main === module) {
  main();
}
