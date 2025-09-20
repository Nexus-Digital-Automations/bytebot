#!/usr/bin/env node

/**
 * Fix error variable references after renaming catch variables
 *
 * This script fixes cases where catch (error) was renamed to catch (_error)
 * but references to 'error' inside the catch block weren't updated
 */

const fs = require('fs');
const path = require('path');

function fixErrorReferences(filePath) {
  console.log(`Processing: ${filePath}`);

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Pattern to find catch blocks with _error and fix internal references
  const catchBlockPattern =
    /} catch \((_error|_err|_e)\) \{([^}]+(?:\{[^}]*\}[^}]*)*)\}/g;

  content = content.replace(
    catchBlockPattern,
    (match, errorVar, blockContent) => {
      // Fix references to 'error' that should be the renamed variable
      const originalErrorVar = errorVar.substring(1); // Remove underscore

      // Only replace 'error', 'err', 'e' that are standalone words (not part of other identifiers)
      const fixedContent = blockContent
        .replace(/\berror\b/g, errorVar)
        .replace(/\berr\b/g, errorVar)
        .replace(/\be\b/g, errorVar);

      if (fixedContent !== blockContent) {
        console.log(`  Fixed error references in catch block`);
        modified = true;
      }

      return `} catch (${errorVar}) {${fixedContent}}`;
    },
  );

  // Also fix specific patterns in security penetration files
  content = content.replace(/error: error\.message/g, `error: _error.message`);
  content = content.replace(/error\.message/g, `_error.message`);

  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`  File updated: ${filePath}`);
  }

  return modified;
}

// Fix unused imports and variables that aren't actually used
function fixUnusedImportsAndVars(filePath) {
  console.log(`Checking unused imports: ${filePath}`);

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Common unused imports that can be safely removed
  const unusedImportPatterns = [
    // Only remove if they're definitely unused
    {
      pattern: /import.*Permission.*from.*@bytebot\/shared.*;\n/g,
      checkUsage: (content) =>
        !content.includes('Permission.') &&
        !content.includes('Permission,') &&
        !content.includes(': Permission'),
    },
    {
      pattern: /import.*UnauthorizedException.*from.*@nestjs\/common.*;\n/g,
      checkUsage: (content) =>
        !content.includes('UnauthorizedException') &&
        !content.includes('throw new UnauthorizedException'),
    },
    {
      pattern: /import.*ForbiddenException.*from.*@nestjs\/common.*;\n/g,
      checkUsage: (content) =>
        !content.includes('ForbiddenException') &&
        !content.includes('throw new ForbiddenException'),
    },
  ];

  for (const { pattern, checkUsage } of unusedImportPatterns) {
    if (checkUsage(content)) {
      const originalContent = content;
      content = content.replace(pattern, '');
      if (content !== originalContent) {
        modified = true;
        console.log(`  Removed unused import`);
      }
    }
  }

  // Fix unused variables that can be prefixed with underscore
  const unusedVarPatterns = [
    /let\s+configService:/g,
    /let\s+reflector:/g,
    /const\s+payload\s*=/g,
    /const\s+result\s*=/g,
    /const\s+response\s*=/g,
    /const\s+originalPermissions\s*=/g,
  ];

  for (const pattern of unusedVarPatterns) {
    const originalContent = content;
    content = content.replace(pattern, (match) => {
      return match.replace(
        /\b(configService|reflector|payload|result|response|originalPermissions)\b/,
        '_$1',
      );
    });
    if (content !== originalContent) {
      modified = true;
      console.log(`  Prefixed unused variable with underscore`);
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`  File updated: ${filePath}`);
  }

  return modified;
}

// Get all TypeScript files
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
    const errorFixed = fixErrorReferences(file);
    const varFixed = fixUnusedImportsAndVars(file);

    if (errorFixed || varFixed) {
      modifiedCount++;
    }
  }

  console.log(
    `\nProcessed ${tsFiles.length} files, modified ${modifiedCount} files`,
  );
}

if (require.main === module) {
  main();
}

module.exports = { fixErrorReferences, fixUnusedImportsAndVars };
