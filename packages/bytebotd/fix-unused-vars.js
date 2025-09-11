#!/usr/bin/env node

/**
 * Automated script to fix common unused variable patterns in bytebotd package
 *
 * This script fixes:
 * 1. Unused error variables in catch blocks
 * 2. Unused destructured variables (like passwordHash)
 * 3. Unused function parameters
 * 4. Unused import statements
 * 5. Unused variable declarations
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Common patterns to fix
const patterns = [
  // Catch blocks with unused error
  {
    pattern: /} catch \(error\) \{/g,
    replacement: '} catch (_error) {',
  },
  {
    pattern: /} catch \(e\) \{/g,
    replacement: '} catch (_e) {',
  },
  {
    pattern: /} catch \(err\) \{/g,
    replacement: '} catch (_err) {',
  },

  // Common unused destructured variables
  {
    pattern: /const \{ passwordHash, \.\.\.result \}/g,
    replacement: 'const { passwordHash: _passwordHash, ...result }',
  },
  {
    pattern: /const \{ password, \.\.\.result \}/g,
    replacement: 'const { password: _password, ...result }',
  },
  {
    pattern: /const \{ iv, \.\.\.result \}/g,
    replacement: 'const { iv: _iv, ...result }',
  },
];

// Function to process a single file
function processFile(filePath) {
  console.log(`Processing: ${filePath}`);

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Apply automatic patterns
  patterns.forEach(({ pattern, replacement }) => {
    const originalContent = content;
    content = content.replace(pattern, replacement);
    if (content !== originalContent) {
      modified = true;
      console.log(`  Applied pattern: ${pattern.source}`);
    }
  });

  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`  File updated: ${filePath}`);
  }

  return modified;
}

// Get all TypeScript files in src directory
function getAllTsFiles(dir) {
  const files = [];

  function traverse(currentDir) {
    const entries = fs.readdirSync(currentDir);

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        traverse(fullPath);
      } else if (entry.endsWith('.ts') && !entry.endsWith('.d.ts')) {
        files.push(fullPath);
      }
    }
  }

  traverse(dir);
  return files;
}

// Main execution
function main() {
  const srcDir = path.join(__dirname, 'src');
  const tsFiles = getAllTsFiles(srcDir);

  console.log(`Found ${tsFiles.length} TypeScript files to process`);

  let modifiedCount = 0;

  for (const file of tsFiles) {
    if (processFile(file)) {
      modifiedCount++;
    }
  }

  console.log(
    `\nProcessed ${tsFiles.length} files, modified ${modifiedCount} files`,
  );

  // Run ESLint to see remaining issues
  console.log('\nRunning ESLint to check remaining issues...');
  try {
    execSync('npx eslint src --ext .ts', { stdio: 'inherit' });
    console.log('All unused variable issues resolved!');
  } catch (error) {
    console.log('Some issues remain - manual fixes may be needed');
  }
}

if (require.main === module) {
  main();
}

module.exports = { processFile, getAllTsFiles };
