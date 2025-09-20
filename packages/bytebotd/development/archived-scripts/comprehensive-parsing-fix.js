#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Comprehensive parsing fix script for auth test files
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

  // Common parsing error patterns and fixes
  const fixes = [
    // Fix concatenated object properties
    { pattern: /,\s*([a-zA-Z_$][a-zA-Z0-9_$]*),\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, replacement: ', $1$2:' },

    // Fix split property names
    { pattern: /([a-zA-Z_$][a-zA-Z0-9_$]*),\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, replacement: '$1$2:' },

    // Fix unterminated strings in object values
    { pattern: /:\s*'([^']*),\s*([^']*)',/g, replacement: ": '$1$2'," },

    // Fix concatenated function calls
    { pattern: /\}\);([a-zA-Z])/g, replacement: '});\n      $1' },

    // Fix missing commas in arrays and objects
    { pattern: /'\s*'([^']*)'(?=\s*])/g, replacement: "', '$1'" },

    // Fix authorization header properties
    { pattern: /authorizatio,\s*n:/g, replacement: 'authorization:' },

    // Fix object property assignments
    { pattern: /{\s*,/g, replacement: '{' },

    // Fix trailing commas in concatenated objects
    { pattern: /,\s*\}\)/g, replacement: '\n      })' },

    // Fix template literal issues
    { pattern: /`([^`]*),\s*([^`]*)`/g, replacement: '`$1$2`' },

    // Fix constructor issues
    { pattern: /prototyp,\s*e:/g, replacement: 'prototype:' },

    // Fix role property splits
    { pattern: /rol,\s*e:/g, replacement: 'role:' },

    // Fix permission property splits
    { pattern: /permission,\s*s:/g, replacement: 'permissions:' },

    // Fix success property splits
    { pattern: /succes,\s*s:/g, replacement: 'success:' },

    // Fix userId property splits
    { pattern: /userI,\s*d:/g, replacement: 'userId:' },

    // Fix email property splits
    { pattern: /emai,\s*l:/g, replacement: 'email:' },

    // Fix metadata property splits
    { pattern: /metadat,\s*a:/g, replacement: 'metadata:' },

    // Fix activity property splits
    { pattern: /activit,\s*y:/g, replacement: 'activity:' },

    // Fix header property splits
    { pattern: /header,\s*s:/g, replacement: 'headers:' },

    // Fix query property splits in test contexts
    { pattern: /query\(\{,\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:\s*([^}]*)\s*\}/g, replacement: 'query({ $1: $2 })' },

    // Fix expect chain formatting
    { pattern: /expect\(200\);\/\//g, replacement: 'expect(200);\n\n        //' }
  ];

  fixes.forEach((fix, index) => {
    const beforeCount = (content.match(fix.pattern) || []).length;
    content = content.replace(fix.pattern, fix.replacement);
    const afterCount = (content.match(fix.pattern) || []).length;
    const fixChanges = beforeCount - afterCount;
    if (fixChanges > 0) {
      console.log(`  Fix ${index + 1}: Applied ${fixChanges} changes`);
      changes += fixChanges;
    }
  });

  // Manual pattern fixes for specific issues

  // Fix concatenated describe/it blocks
  content = content.replace(/\}\);([a-zA-Z_$][a-zA-Z0-9_$]*\s*\()/g, '});\n\n  $1');

  // Fix concatenated imports
  content = content.replace(/';import\s/g, "';\nimport ");

  // Fix malformed array closures
  content = content.replace(/\];for\s*\(/g, '];\n\n      for (');

  // Fix concatenated object method definitions
  content = content.replace(/\};([a-zA-Z_$][a-zA-Z0-9_$]*\s*\([^)]*\)\s*{)/g, '};\n\n  $1');

  // Fix concatenated variable declarations
  content = content.replace(/;([a-zA-Z_$][a-zA-Z0-9_$]*\s*=)/g, ';\n      $1');

  if (changes > 0) {
    fs.writeFileSync(filePath, content);
    console.log(`  Total changes applied: ${changes}`);
    totalChanges += changes;
  } else {
    console.log(`  No changes needed`);
  }
});

console.log(`\n=== COMPREHENSIVE PARSING FIX COMPLETE ===`);
console.log(`Total files processed: ${files.length}`);
console.log(`Total changes applied: ${totalChanges}`);
console.log(`===========================================`);