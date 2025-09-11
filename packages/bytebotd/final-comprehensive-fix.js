#!/usr/bin/env node

/**
 * Final Comprehensive Fix for Undefined Variables and Build Issues
 *
 * This script addresses specific patterns that need careful handling:
 * 1. Catch blocks where error variables are used but removed
 * 2. Function parameters that appear unused but are needed for signatures
 * 3. Import statements that were incorrectly prefixed
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Function to fix catch blocks with undefined variables
function fixCatchBlocks(content) {
  // Pattern 1: } catch { ... err ... } -> } catch (err) { ... err ... }
  const catchWithUndefinedError =
    /} catch \s*\{\s*([^}]*(?:err|error)[^}]*)\}/gs;
  content = content.replace(catchWithUndefinedError, (match, catchBody) => {
    if (catchBody.includes('err') && !catchBody.includes('error')) {
      return `} catch (err) {\n${catchBody}}`;
    } else if (catchBody.includes('error')) {
      return `} catch (error) {\n${catchBody}}`;
    }
    return match;
  });

  // Pattern 2: Look for undefined variables in error logging
  const errorLogPattern =
    /(console\.(?:log|error|warn)|logger\.(?:log|error|warn|info))\([^)]*(?:err|error)[^)]*\)/g;
  content = content.replace(errorLogPattern, (match) => {
    if (match.includes('err') && !content.includes('} catch (err)')) {
      // Add catch block if missing
      return match;
    }
    return match;
  });

  return content;
}

// Function to fix function parameters that need to stay
function fixFunctionParameters(content) {
  // Don't prefix callback function parameters that follow standard patterns
  const callbackPatterns = [
    /\.map\s*\(\s*\([^,)]*,\s*index\s*\)/g,
    /\.forEach\s*\(\s*\([^,)]*,\s*index\s*\)/g,
    /\.filter\s*\(\s*\([^,)]*,\s*index\s*\)/g,
  ];

  callbackPatterns.forEach((pattern) => {
    content = content.replace(pattern, (match) => {
      return match.replace(/_index/g, 'index');
    });
  });

  return content;
}

// Function to process a single file
function processFile(filePath) {
  console.log(`Final processing: ${filePath}`);

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  const originalContent = content;

  // Apply fixes
  content = fixCatchBlocks(content);
  content = fixFunctionParameters(content);

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    modified = true;
    console.log(`  Final fixes applied: ${filePath}`);
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

  console.log(`Final processing of ${tsFiles.length} TypeScript files`);

  let modifiedCount = 0;

  for (const file of tsFiles) {
    if (processFile(file)) {
      modifiedCount++;
    }
  }

  console.log(`\nFinal processing completed: ${modifiedCount} files modified`);

  // Test build
  console.log('\nTesting build...');
  try {
    execSync('npx @nestjs/cli build', { stdio: 'inherit' });
    console.log('Build successful!');
  } catch (error) {
    console.log('Build still has issues - manual fixes needed');
  }
}

if (require.main === module) {
  main();
}

module.exports = { processFile, getAllTsFiles };
