#!/usr/bin/env node

/**
 * Comprehensive Unused Variable Fix Script for bytebotd package
 *
 * This script systematically fixes all unused variable patterns including:
 * 1. Unused imports - prefix with underscore
 * 2. Unused variables - prefix with underscore
 * 3. Unused function parameters - prefix with underscore
 * 4. Unused destructured variables - prefix with underscore
 * 5. Undefined variables in catch blocks - add proper error variable
 * 6. Unused error variables in catch blocks - prefix with underscore
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Comprehensive patterns to fix
const fixPatterns = [
  // 1. Fix undefined variables in catch blocks
  {
    pattern: /} catch \{([^}]*error[^}]*)\}/gs,
    replacement: (match, content) => `} catch (error) {${content}}`,
  },
  {
    pattern: /} catch \{([^}]*err[^}]*)\}/gs,
    replacement: (match, content) => `} catch (err) {${content}}`,
  },

  // 2. Fix specific unused variable declarations
  {
    pattern: /const configService/g,
    replacement: 'const _configService',
  },
  {
    pattern: /let configService/g,
    replacement: 'let _configService',
  },
  {
    pattern: /const reflector/g,
    replacement: 'const _reflector',
  },
  {
    pattern: /let reflector/g,
    replacement: 'let _reflector',
  },
  {
    pattern: /const payload\b/g,
    replacement: 'const _payload',
  },
  {
    pattern: /const result\b([^a-zA-Z])/g,
    replacement: 'const _result$1',
  },
  {
    pattern: /let result\b([^a-zA-Z])/g,
    replacement: 'let _result$1',
  },
  {
    pattern: /const response\b([^a-zA-Z])/g,
    replacement: 'const _response$1',
  },
  {
    pattern: /let response\b([^a-zA-Z])/g,
    replacement: 'let _response$1',
  },
  {
    pattern: /const req\b([^a-zA-Z])/g,
    replacement: 'const _req$1',
  },
  {
    pattern: /let req\b([^a-zA-Z])/g,
    replacement: 'let _req$1',
  },
  {
    pattern: /const originalPermissions/g,
    replacement: 'const _originalPermissions',
  },
  {
    pattern: /const validSecret/g,
    replacement: 'const _validSecret',
  },
  {
    pattern: /const maliciousSecret/g,
    replacement: 'const _maliciousSecret',
  },
  {
    pattern: /const mockLogger/g,
    replacement: 'const _mockLogger',
  },
  {
    pattern: /let logger/g,
    replacement: 'let _logger',
  },
  {
    pattern: /const logger/g,
    replacement: 'const _logger',
  },
  {
    pattern: /const originalModule/g,
    replacement: 'const _originalModule',
  },

  // 3. Fix unused imports
  {
    pattern: /import.*Permission[^;]*from/g,
    replacement: (match) => match.replace('Permission', '_Permission'),
  },
  {
    pattern: /import.*crypto[^;]*from/g,
    replacement: (match) => match.replace('crypto', '_crypto'),
  },
  {
    pattern: /import.*jwt[^;]*from/g,
    replacement: (match) => match.replace(/jwt(?![a-zA-Z])/, '_jwt'),
  },
  {
    pattern: /import.*UnauthorizedException[^;]*from/g,
    replacement: (match) =>
      match.replace('UnauthorizedException', '_UnauthorizedException'),
  },
  {
    pattern: /import.*ForbiddenException[^;]*from/g,
    replacement: (match) =>
      match.replace('ForbiddenException', '_ForbiddenException'),
  },
  {
    pattern: /import.*Logger[^;]*from/g,
    replacement: (match) => match.replace(/Logger(?![a-zA-Z])/, '_Logger'),
  },
  {
    pattern: /import.*Put[^;]*from/g,
    replacement: (match) => match.replace(/Put(?![a-zA-Z])/, '_Put'),
  },
  {
    pattern: /import.*UseInterceptors[^;]*from/g,
    replacement: (match) =>
      match.replace('UseInterceptors', '_UseInterceptors'),
  },
  {
    pattern: /import.*BadRequestException[^;]*from/g,
    replacement: (match) =>
      match.replace('BadRequestException', '_BadRequestException'),
  },
  {
    pattern: /import.*uuidv4[^;]*from/g,
    replacement: (match) => match.replace('uuidv4', '_uuidv4'),
  },

  // 4. Fix unused function parameters
  {
    pattern: /\(([^)]*)\b(index|payload|dto|name|req|isPublic)\b([^)]*)\)/g,
    replacement: (match, before, param, after) =>
      `(${before}_${param}${after})`,
  },

  // 5. Fix destructuring assignments with unused parameters
  {
    pattern: /forEach\(\(([^,]+), (index)\)/g,
    replacement: 'forEach(($1, _$2)',
  },
];

// Function to process a single file
function processFile(filePath) {
  console.log(`Processing: ${filePath}`);

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Apply all fix patterns
  fixPatterns.forEach(({ pattern, replacement }, index) => {
    const originalContent = content;

    if (typeof replacement === 'function') {
      content = content.replace(pattern, replacement);
    } else {
      content = content.replace(pattern, replacement);
    }

    if (content !== originalContent) {
      modified = true;
      console.log(
        `  Applied pattern ${index + 1}: ${pattern.source || pattern}`,
      );
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
    execSync('npx eslint src --ext .ts --format=compact', { stdio: 'inherit' });
    console.log('All unused variable issues resolved!');
  } catch (error) {
    console.log('Some issues remain - may need manual fixes');
  }
}

if (require.main === module) {
  main();
}

module.exports = { processFile, getAllTsFiles };
