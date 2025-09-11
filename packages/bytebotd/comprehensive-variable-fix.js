#!/usr/bin/env node

/**
 * Comprehensive Variable Naming Fix Script
 * Fixes all variable naming mismatches that cause TypeScript errors
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get all files with variable naming issues
function getFilesWithIssues() {
  try {
    const output = execSync(
      'npx tsc --noEmit --skipLibCheck 2>&1 | grep "Cannot find name" | cut -d\'(\' -f1 | sort -u',
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
  const originalContent = content;
  let changes = 0;

  // 1. Fix _result → result in expect statements and general usage
  content = content.replace(/expect\(_result\)/g, 'expect(result)');
  content = content.replace(/\b_result\b/g, 'result');

  // 2. Fix _response → response in test contexts
  content = content.replace(/\b_response\b/g, 'response');

  // 3. Fix _error issues in catch blocks
  // Pattern: } catch (error) { ... _error ... }
  const catchBlocks = content.match(/} catch \((\w+)\) \{[\s\S]*?\n\s*}/g);
  if (catchBlocks) {
    catchBlocks.forEach((block) => {
      const errorVar = block.match(/} catch \((\w+)\)/)?.[1];
      if (errorVar && errorVar !== '_error') {
        const fixedBlock = block.replace(/\b_error\b/g, errorVar);
        if (fixedBlock !== block) {
          content = content.replace(block, fixedBlock);
          changes++;
        }
      }
    });
  }

  // 4. Fix loop variable issues (for ... in, for ... of, forEach)
  // Pattern: forEach((item, _index) => { ... index ... })
  const forEachBlocks = content.match(
    /forEach\(\(([^,]+),\s*([^)]+)\)\s*=>\s*\{[\s\S]*?\n\s*\}\)/g,
  );
  if (forEachBlocks) {
    forEachBlocks.forEach((block) => {
      const match = block.match(/forEach\(\(([^,]+),\s*([^)]+)\)/);
      if (match) {
        const item = match[1].trim();
        const indexVar = match[2].trim();

        // If the declared variable is different from usage in the block
        if (indexVar === '_index' && block.includes(' index')) {
          const fixedBlock = block.replace(/\bindex\b/g, '_index');
          content = content.replace(block, fixedBlock);
          changes++;
        } else if (indexVar === 'index' && block.includes('_index')) {
          const fixedBlock = block.replace(/\b_index\b/g, 'index');
          content = content.replace(block, fixedBlock);
          changes++;
        }
      }
    });
  }

  // 5. Fix async/await and promise handling
  // Pattern: .then((_result) => { ... result ... })
  const thenBlocks = content.match(
    /\.then\(\(([^)]+)\)\s*=>\s*\{[\s\S]*?\}\)/g,
  );
  if (thenBlocks) {
    thenBlocks.forEach((block) => {
      const paramMatch = block.match(/\.then\(\(([^)]+)\)/);
      if (paramMatch) {
        const param = paramMatch[1].trim();
        if (param === '_result' && block.includes(' result')) {
          const fixedBlock = block.replace(/\bresult\b/g, '_result');
          content = content.replace(block, fixedBlock);
          changes++;
        } else if (param === 'result' && block.includes('_result')) {
          const fixedBlock = block.replace(/\b_result\b/g, 'result');
          content = content.replace(block, fixedBlock);
          changes++;
        }
      }
    });
  }

  // 6. Fix function parameter vs usage mismatches
  // Look for function declarations and check parameter usage
  const funcDeclarations = content.match(
    /function\s+\w+\([^)]*\)\s*\{[\s\S]*?\n\}/g,
  );
  if (funcDeclarations) {
    funcDeclarations.forEach((func) => {
      const paramMatch = func.match(/function\s+\w+\(([^)]*)\)/);
      if (paramMatch) {
        const params = paramMatch[1]
          .split(',')
          .map((p) => p.trim().split(' ').pop());
        params.forEach((param) => {
          if (param === 'error' && func.includes('_error')) {
            const fixedFunc = func.replace(/\b_error\b/g, 'error');
            content = content.replace(func, fixedFunc);
            changes++;
          } else if (param === '_error' && func.includes(' error ')) {
            const fixedFunc = func.replace(/\berror\b/g, '_error');
            content = content.replace(func, fixedFunc);
            changes++;
          }
        });
      }
    });
  }

  // 7. Fix arrow function parameter mismatches
  const arrowFunctions = content.match(/\([^)]*\)\s*=>\s*\{[\s\S]*?\}/g);
  if (arrowFunctions) {
    arrowFunctions.forEach((func) => {
      const paramMatch = func.match(/\(([^)]*)\)\s*=>/);
      if (paramMatch) {
        const params = paramMatch[1]
          .split(',')
          .map((p) => p.trim().split(' ').pop());
        params.forEach((param) => {
          if (param === 'response' && func.includes('_response')) {
            const fixedFunc = func.replace(/\b_response\b/g, 'response');
            content = content.replace(func, fixedFunc);
            changes++;
          } else if (param === '_response' && func.includes(' response ')) {
            const fixedFunc = func.replace(/\bresponse\b/g, '_response');
            content = content.replace(func, fixedFunc);
            changes++;
          }
        });
      }
    });
  }

  if (content !== originalContent) {
    console.log(`Fixing variable naming in: ${filePath}`);
    fs.writeFileSync(filePath, content);
    return true;
  }

  return false;
}

// Main execution
console.log('🔧 Starting comprehensive variable naming fix...');

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
  const errorOutput = execSync(
    'npx tsc --noEmit --skipLibCheck 2>&1 | grep "Cannot find name" | wc -l',
    {
      encoding: 'utf8',
      cwd: __dirname,
    },
  );
  const remainingErrors = parseInt(errorOutput.trim());
  console.log(`Remaining variable naming issues: ${remainingErrors}`);

  // Show specific patterns remaining
  const patterns = execSync(
    'npx tsc --noEmit --skipLibCheck 2>&1 | grep "Cannot find name" | head -5',
    {
      encoding: 'utf8',
      cwd: __dirname,
    },
  );
  if (patterns.trim()) {
    console.log('\nRemaining patterns:');
    console.log(patterns);
  }
} catch (error) {
  console.error('Error checking remaining issues:', error.message);
}
