#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Comprehensive comma fix for remaining parsing errors
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
  let originalContent = content;

  // Comprehensive comma fixes for TypeScript parsing errors
  const fixes = [
    // Service provider missing commas
    { pattern: /provide:\s*(\w+)useValue:/g, replacement: 'provide: $1, useValue:' },
    { pattern: /provide:\s*(\w+)useClass:/g, replacement: 'provide: $1, useClass:' },

    // Function parameter missing commas
    { pattern: /(\w+):\s*(\w+)(\w+):\s*(\w+)/g, replacement: '$1: $2, $3: $4' },
    { pattern: /(\w+):\s*string(\w+):/g, replacement: '$1: string, $2:' },
    { pattern: /(\w+):\s*(\w+)(\w+):/g, replacement: '$1: $2, $3:' },

    // Object property missing commas
    { pattern: /(\w+):\s*(\w+),?\s*(\w+):\s*(\w+),?\s*(\w+):\s*(\w+)/g, replacement: '$1: $2, $3: $4, $5: $6' },

    // Function call parameter missing commas
    { pattern: /req:\s*(\w+)res:\s*(\w+)/g, replacement: 'req: $1, res: $2' },
    { pattern: /path:\s*string(\w+):/g, replacement: 'path: string, $1:' },

    // Variable declaration fixes
    { pattern: /let,\s*(\w+):/g, replacement: 'let $1:' },
    { pattern: /const,\s*(\w+):/g, replacement: 'const $1:' },

    // Type definition missing commas
    { pattern: /key:\s*string(\w+):\s*(\w+)/g, replacement: 'key: string, $1: $2' },

    // Mock service missing commas
    { pattern: /(\w+):\s*jest\.fn\(\)(\w+):/g, replacement: '$1: jest.fn(), $2:' },

    // Object literal missing commas
    { pattern: /(\w+):\s*'([^']*)'(\w+):/g, replacement: "$1: '$2', $3:" },
    { pattern: /(\w+):\s*(\w+)\.(\w+)(\w+):/g, replacement: '$1: $2.$3, $4:' },

    // Additional specific patterns found in errors
    { pattern: /(\w+):\s*\(([^)]*)\)\s*\?\?\s*(\w+)\.(\w+)(\w+):/g, replacement: '$1: ($2) ?? $3.$4, $5:' },

    // Line break issues
    { pattern: /(\w+);console\.log\(/g, replacement: '$1;\n      console.log(' },
    { pattern: /async\s*\(\)\s*\{(\w+)/g, replacement: 'async () => {\n      $1' },

    // Additional comma patterns
    { pattern: /(\w+):\s*(\w+)(\w+)\s*=>/g, replacement: '$1: $2, $3 =>' },
    { pattern: /(\w+):\s*(\w+)(\w+)\s*\)/g, replacement: '$1: $2, $3)' }
  ];

  fixes.forEach(({ pattern, replacement }) => {
    if (pattern.test(content)) {
      content = content.replace(pattern, replacement);
      if (content !== originalContent) {
        changes++;
        originalContent = content;
      }
    }
  });

  if (changes > 0) {
    fs.writeFileSync(filePath, content);
    console.log(`  Applied ${changes} comprehensive comma fixes`);
    totalChanges += changes;
  } else {
    console.log(`  No additional comma fixes needed`);
  }
});

console.log(`\n=== COMPREHENSIVE COMMA FIX COMPLETE ===`);
console.log(`Total files processed: ${files.length}`);
console.log(`Total comma fixes applied: ${totalChanges}`);
console.log(`=========================================`);