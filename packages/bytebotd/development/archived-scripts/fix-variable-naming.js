#!/usr/bin/env node

/**
 * Variable Naming Fix Script
 * Fixes common variable naming mismatches that cause TypeScript errors
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get list of files with _error issues from TypeScript output
function getFilesWithIssues() {
  try {
    const output = execSync(
      'npx tsc --noEmit --skipLibCheck 2>&1 | grep "Cannot find name.*_error" | cut -d\'(\' -f1 | sort -u',
      {
        encoding: 'utf8',
        cwd: __dirname,
      },
    );
    return output.trim().split('\n').filter(Boolean);
  } catch (error) {
    console.error('Error getting TypeScript issues:', error.message);
    return [];
  }
}

// Fix variable naming issues in a file
function fixVariableNaming(filePath) {
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${filePath}`);
    return false;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let changes = 0;

  // Pattern 1: Fix catch blocks where error is declared but _error is used
  // Pattern: } catch (error) { ... _error ... }
  const catchBlocks = content.match(/} catch \((\w+)\) \{[\s\S]*?\n\s*}/g);
  if (catchBlocks) {
    catchBlocks.forEach((block) => {
      const errorVar = block.match(/} catch \((\w+)\)/)?.[1];
      if (errorVar && errorVar !== '_error') {
        // Replace _error with the actual declared variable in this catch block
        const fixedBlock = block.replace(/\b_error\b/g, errorVar);
        if (fixedBlock !== block) {
          content = content.replace(block, fixedBlock);
          changes++;
        }
      }
    });
  }

  // Pattern 2: Fix expect(_result) to expect(result)
  content = content.replace(/expect\(_result\)/g, 'expect(result)');
  if (content !== fs.readFileSync(filePath, 'utf8')) changes++;

  // Pattern 3: Fix _error parameter declarations in callbacks
  content = content.replace(
    /callback: \(_error: Error\)/g,
    'callback: (error: Error)',
  );
  if (content !== fs.readFileSync(filePath, 'utf8')) changes++;

  // Pattern 4: Fix _error in arrow functions and other contexts
  const originalContent = fs.readFileSync(filePath, 'utf8');

  if (content !== originalContent) {
    console.log(`Fixing variable naming in: ${filePath}`);
    fs.writeFileSync(filePath, content);
    return true;
  }

  return false;
}

// Main execution
console.log('🔧 Starting variable naming fix...');

const problematicFiles = getFilesWithIssues();
console.log(
  `Found ${problematicFiles.length} files with variable naming issues`,
);

let fixedFiles = 0;
problematicFiles.forEach((relativePath) => {
  const fullPath = path.join(__dirname, relativePath);
  if (fixVariableNaming(fullPath)) {
    fixedFiles++;
  }
});

console.log(`✅ Fixed variable naming issues in ${fixedFiles} files`);

// Run TypeScript check to see remaining issues
try {
  console.log('\n📊 Checking remaining TypeScript errors...');
  const output = execSync(
    'npx tsc --noEmit --skipLibCheck 2>&1 | grep "Cannot find name.*_error" | wc -l',
    {
      encoding: 'utf8',
      cwd: __dirname,
    },
  );
  const remainingErrors = parseInt(output.trim());
  console.log(`Remaining _error variable naming issues: ${remainingErrors}`);
} catch (error) {
  console.error('Error checking remaining issues:', error.message);
}
