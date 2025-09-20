#!/usr/bin/env node

/**
 * SUBAGENT 3 - COMPREHENSIVE PARSING ERROR FIX SCRIPT
 *
 * This script systematically fixes all parsing errors in the common and config directories
 * caused by missing line breaks, improper comma usage, and malformed interfaces.
 */

const fs = require('fs');
const path = require('path');

// Helper function to fix common parsing issues
function fixParsingErrors(content) {
  // Fix 1: Interface declarations with missing line breaks after semicolons
  content = content.replace(/;([a-zA-Z_$][a-zA-Z0-9_$]*:)/g, ';\n  $1');

  // Fix 2: Import statements with missing line breaks
  content = content.replace(/';([a-zA-Z])/g, '\';\n$1');
  content = content.replace(/';\/\//g, '\';\n\n//');

  // Fix 3: Object/interface properties with missing line breaks
  content = content.replace(/}([a-zA-Z_$][a-zA-Z0-9_$]*\s*:)/g, '}\n  $1');

  // Fix 4: Function calls and method chains with missing line breaks
  content = content.replace(/;([a-zA-Z_$][a-zA-Z0-9_$]*\()/g, ';\n$1');

  // Fix 5: Switch case statements with missing line breaks
  content = content.replace(/break;case/g, 'break;\n      case');

  // Fix 6: Comment blocks with missing line breaks
  content = content.replace(/\*\/([a-zA-Z])/g, '*/\n$1');

  // Fix 7: Decorator issues with missing line breaks
  content = content.replace(/@Injectable\(\);(\s*)export/g, '@Injectable()\nexport');

  // Fix 8: Fix malformed object commas and line breaks
  content = content.replace(/,;/g, ';');
  content = content.replace(/;,/g, ';');

  // Fix 9: Fix malformed interface/class declarations
  content = content.replace(/}\s*interface/g, '}\n\ninterface');
  content = content.replace(/}\s*export\s+interface/g, '}\n\nexport interface');
  content = content.replace(/}\s*export\s+class/g, '}\n\nexport class');

  // Fix 10: Fix malformed type definitions
  content = content.replace(/type\s*=\s*([^;]+);([a-zA-Z])/g, 'type = $1;\n$2');

  // Fix 11: Fix method signatures with missing line breaks
  content = content.replace(/}\s*async\s+([a-zA-Z_$])/g, '}\n\n  async $1');
  content = content.replace(/}\s*([a-zA-Z_$][a-zA-Z0-9_$]*\s*\()/g, '}\n\n  $1');

  // Fix 12: Fix template literal issues
  content = content.replace(/`([^`]*)}([a-zA-Z])/g, '`$1}\n$2');

  // Fix 13: Fix describe/it blocks formatting
  content = content.replace(/}\);(\s*)describe/g, '});\n\n$1describe');
  content = content.replace(/}\);(\s*)it\(/g, '});\n\n$1it(');

  // Fix 14: Fix return statements and object literals
  content = content.replace(/return\s*{([^}]+)}([a-zA-Z])/g, 'return {\n$1\n};\n$2');

  // Fix 15: Fix array and object destructuring
  content = content.replace(/=\s*{([^}]+)};([a-zA-Z])/g, '= {\n$1\n};\n$2');

  return content;
}

// Get all TypeScript files in common and configuration directories
function getAllTsFiles(dir) {
  const files = [];

  function traverseDir(currentDir) {
    const items = fs.readdirSync(currentDir);

    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        traverseDir(fullPath);
      } else if (item.endsWith('.ts') && !item.endsWith('.d.ts')) {
        files.push(fullPath);
      }
    }
  }

  traverseDir(dir);
  return files;
}

// Main execution
function main() {
  const targetDirs = [
    'src/common',
    'src/configuration'
  ];

  let totalFixed = 0;

  for (const dir of targetDirs) {
    if (!fs.existsSync(dir)) {
      console.log(`Directory ${dir} not found, skipping...`);
      continue;
    }

    console.log(`\n🔧 Processing directory: ${dir}`);
    const files = getAllTsFiles(dir);

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const fixedContent = fixParsingErrors(content);

        if (content !== fixedContent) {
          fs.writeFileSync(file, fixedContent, 'utf8');
          console.log(`  ✅ Fixed: ${path.relative('.', file)}`);
          totalFixed++;
        }
      } catch (error) {
        console.error(`  ❌ Error processing ${file}: ${error.message}`);
      }
    }
  }

  console.log(`\n🎯 Total files fixed: ${totalFixed}`);
  console.log('🚀 SUBAGENT 3 parsing error fix complete!');
}

// Run the script
main();