#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Targeted fix for missing comma parsing errors
const authTestsDir = './src/auth/__tests__';

// Get all TypeScript files in auth tests directory
const files = fs.readdirSync(authTestsDir)
  .filter(f => f.endsWith('.ts'))
  .map(f => path.join(authTestsDir, f));

let totalChanges = 0;

files.forEach(filePath => {
  console.log(`\nProcessing: ${filePath}`);
  let content = fs.readFileSync(filePath, 'utf8');
  let changes = 0;

  // Split content into lines for targeted line-based fixes
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    const lineNumber = index + 1;

    // Target specific line numbers based on the error report
    const errorLines = [102, 77, 59, 62, 71, 71, 52, 79, 95];

    if (errorLines.includes(lineNumber)) {
      console.log(`  Checking line ${lineNumber}: ${line.trim()}`);

      // Common patterns that need comma fixes
      const patterns = [
        // Missing comma after function parameters
        { pattern: /(\w+)\s+(\w+)\s*:/g, replacement: '$1, $2:' },

        // Missing comma between object properties
        { pattern: /([})'])\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, replacement: '$1, $2:' },

        // Missing comma after closing parenthesis
        { pattern: /\)\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, replacement: '), $1:' },

        // Missing comma after string literal
        { pattern: /('[^']*')\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, replacement: '$1, $2:' },

        // Missing comma after boolean
        { pattern: /(true|false)\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, replacement: '$1, $2:' },

        // Missing comma after number
        { pattern: /(\d+)\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, replacement: '$1, $2:' },

        // Missing comma in function parameters
        { pattern: /(\w+:\s*\w+)\s+(\w+:\s*\w+)/g, replacement: '$1, $2' },

        // Missing comma between type annotations
        { pattern: /(\w+)\s+(meta\?\:\s*Record<string)/g, replacement: '$1, $2' },

        // Missing comma in function type signatures
        { pattern: /(string)\s+(meta\?\:\s*Record)/g, replacement: '$1, $2' }
      ];

      let originalLine = line;
      patterns.forEach(({ pattern, replacement }) => {
        if (pattern.test(line)) {
          lines[index] = line.replace(pattern, replacement);
          if (lines[index] !== originalLine) {
            console.log(`    Applied fix: ${originalLine.trim()} -> ${lines[index].trim()}`);
            changes++;
          }
        }
      });
    }
  });

  if (changes > 0) {
    const newContent = lines.join('\n');
    fs.writeFileSync(filePath, newContent);
    console.log(`  Applied ${changes} comma fixes`);
    totalChanges += changes;
  } else {
    console.log(`  No comma fixes needed`);
  }
});

console.log(`\n=== MISSING COMMA FIX COMPLETE ===`);
console.log(`Total files processed: ${files.length}`);
console.log(`Total comma fixes applied: ${totalChanges}`);
console.log(`=====================================`);