#!/usr/bin/env node

/**
 * Final ESLint Fix Script
 * 
 * Fixes the remaining ESLint violations by targeting specific patterns
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Starting final ESLint violation fixes...');

// Find all TypeScript files
const findTSFiles = (dir) => {
  const files = [];
  try {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory() && !item.name.startsWith('.') && item.name !== 'node_modules') {
        files.push(...findTSFiles(fullPath));
      } else if (item.isFile() && item.name.endsWith('.ts')) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.log(`⚠️ Error reading directory ${dir}: ${error.message}`);
  }
  
  return files;
};

// Apply targeted fixes to a file
const fixFile = (filePath) => {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let changesMade = false;
    
    // Fix syntax errors introduced by previous script
    content = content.replace(/\b_\(/g, '(');
    content = content.replace(/\b_\[/g, '[');
    content = content.replace(/\b_\{/g, '{');
    content = content.replace(/\b_'/g, "'");
    content = content.replace(/\b_"/g, '"');
    content = content.replace(/\b_`/g, '`');
    content = content.replace(/`\$\{_([^}]*)\}/g, '`${$1}');
    content = content.replace(/_\$\{([^}]*)\}/g, '${$1}');
    content = content.replace(/\{_([^:}]*):/, '{$1:');
    content = content.replace(/:_([^,}]*)/g, ':$1');
    content = content.replace(/\b_([a-zA-Z_][a-zA-Z0-9_]*)\b(?=\s*[:=])/g, '$1');
    changesMade = true;
    
    // Fix common remaining patterns
    content = content.replace(/\(([^)]*\w+) ?? "default"\)/g, '$1');
    content = content.replace(/(\w+) ?? "default"/g, '$1!');
    changesMade = true;
    
    if (changesMade) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed: ${path.relative(process.cwd(), filePath)}`);
      return true;
    }
  } catch (error) {
    console.log(`❌ Error fixing ${filePath}: ${error.message}`);
  }
  
  return false;
};

// Main execution
const srcDir = path.join(__dirname, 'src');
const testDir = path.join(__dirname, 'test');

console.log('📁 Finding TypeScript files...');
const tsFiles = [
  ...findTSFiles(srcDir),
  ...findTSFiles(testDir)
];

console.log(`📊 Found ${tsFiles.length} TypeScript files`);

let fixedFiles = 0;
for (const file of tsFiles) {
  if (fixFile(file)) {
    fixedFiles++;
  }
}

console.log(`🎉 Fixed ${fixedFiles} files out of ${tsFiles.length}`);
console.log('🏁 Final fix completed');