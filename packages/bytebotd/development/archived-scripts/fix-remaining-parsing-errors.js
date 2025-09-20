#!/usr/bin/env node

/**
 * SUBAGENT 3 - ENHANCED PARSING ERROR FIX SCRIPT
 *
 * This script fixes specific remaining parsing errors identified by ESLint.
 */

const fs = require('fs');
const path = require('path');

// Enhanced parsing error fixes
function fixAdvancedParsingErrors(content) {
  // Fix 1: Double semicolons and extra semicolons
  content = content.replace(/;;+/g, ';');

  // Fix 2: Fix interface property declarations with extra commas/semicolons
  content = content.replace(/([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:\s*([^;,}]+);([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1: $2;\n  $3:');

  // Fix 3: Fix method parameter malformations
  content = content.replace(/async\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(\s*,/g, 'async $1(');
  content = content.replace(/function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(\s*,/g, 'function $1(');
  content = content.replace(/([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(\s*,/g, '$1(');

  // Fix 4: Fix object destructuring and type annotations
  content = content.replace(/:\s*{,/g, ': {');
  content = content.replace(/}\s*,\s*options:\s*{,/g, '},\n    options: {');

  // Fix 5: Fix import statement malformations
  content = content.replace(/import\s*{([^}]*);([^}]*?)}/g, 'import {\n$1\n$2\n}');

  // Fix 6: Fix template literal and expression malformations
  content = content.replace(/\$\{([^}]+)}([a-zA-Z_$])/g, '${$1}\n$2');

  // Fix 7: Fix class method declarations
  content = content.replace(/}\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g, '}\n\n  $1(');

  // Fix 8: Fix try-catch block formatting
  content = content.replace(/}\s*catch\s*\(/g, '} catch (');
  content = content.replace(/}\s*finally\s*{/g, '} finally {');

  // Fix 9: Fix arrow function malformations
  content = content.replace(/=>\s*{([^}]+)}([a-zA-Z])/g, '=> {\n$1\n};\n$2');

  // Fix 10: Fix export statement malformations
  content = content.replace(/export\s*{([^}]*);([^}]*?)}/g, 'export {\n$1\n$2\n}');

  // Fix 11: Fix interface property type declarations
  content = content.replace(/([a-zA-Z_$][a-zA-Z0-9_$]*)\?\s*:\s*([^;,}]+);([a-zA-Z_$])/g, '$1?: $2;\n  $3');

  // Fix 12: Fix malformed switch statements
  content = content.replace(/switch\s*\(\s*([^)]+)\s*\)\s*{([^}]+)}/gs, (match, condition, body) => {
    const fixedBody = body
      .replace(/case\s*([^:]+):\s*([^;]*);([a-zA-Z])/g, 'case $1:\n        $2;\n        $3')
      .replace(/break;([a-zA-Z])/g, 'break;\n      $1')
      .replace(/default:\s*([^;]*);/g, 'default:\n        $1;\n        break;');
    return `switch (${condition}) {\n${fixedBody}\n    }`;
  });

  // Fix 13: Fix describe/it test block formatting issues
  content = content.replace(/describe\s*\(\s*'([^']+)',\s*\(\)\s*=>\s*{([^{]*){/g, "describe('$1', () => {\n$2");
  content = content.replace(/it\s*\(\s*'([^']+)',\s*async\s*\(\)\s*=>\s*{([^{]*){/g, "it('$1', async () => {\n$2");

  // Fix 14: Fix object property assignment malformations
  content = content.replace(/([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:\s*([^,}]+),([a-zA-Z_$])/g, '$1: $2,\n      $3');

  // Fix 15: Fix malformed generic type declarations
  content = content.replace(/<([^>]+)>\s*\(\s*,/g, '<$1>(');

  // Fix 16: Fix return statement formatting
  content = content.replace(/return\s*([^;]+);([a-zA-Z])/g, 'return $1;\n    $2');

  // Fix 17: Fix async function declarations
  content = content.replace(/async\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(\s*([^)]*)\s*\)\s*:\s*([^{]+)\s*{/g, 'async $1($2): $3 {');

  // Fix 18: Fix interface extension malformations
  content = content.replace(/interface\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s+extends\s+([^{]+)\s*{/g, 'interface $1 extends $2 {');

  // Fix 19: Fix decorator malformations
  content = content.replace(/@([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(\s*([^)]*)\s*\)\s*;/g, '@$1($2)');
  content = content.replace(/@([a-zA-Z_$][a-zA-Z0-9_$]*)\s*;/g, '@$1');

  // Fix 20: Fix const/let/var declarations
  content = content.replace(/(const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:\s*([^=]+)=([^;]+);([a-zA-Z])/g, '$1 $2: $3 = $4;\n    $5');

  return content;
}

// Get all TypeScript files in common and configuration directories
function getAllTsFiles(dir) {
  const files = [];

  function traverseDir(currentDir) {
    try {
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
    } catch (error) {
      console.warn(`Warning: Cannot read directory ${currentDir}: ${error.message}`);
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
        const fixedContent = fixAdvancedParsingErrors(content);

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
  console.log('🚀 SUBAGENT 3 enhanced parsing error fix complete!');
}

// Run the script
main();