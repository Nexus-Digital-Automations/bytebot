#!/usr/bin/env node

/**
 * Comprehensive Fix for @typescript-eslint/require-await violations
 *
 * This script identifies and fixes methods marked as 'async' that don't contain
 * any 'await' expressions by removing the 'async' keyword and adjusting the
 * return type from Promise<T> to T.
 */

const fs = require('fs');
const path = require('path');

// Files and methods to fix based on ESLint output
const methodsToFix = [
  // Auth module violations
  {
    file: 'src/auth/__tests__/auth.service.spec.ts',
    methods: [
      { line: 135, name: 'logout' },
      { line: 140, name: 'generateTokens' },
      { line: 208, name: 'findUserById' },
      { line: 504, name: 'arrow function' },
      { line: 520, name: 'arrow function' },
      { line: 535, name: 'arrow function' },
      { line: 546, name: 'arrow function' },
    ],
  },
  {
    file: 'src/auth/__tests__/roles.guard.spec.ts',
    methods: [
      { line: 42, name: 'canActivate' },
      { line: 406, name: 'arrow function' },
      { line: 517, name: 'arrow function' },
    ],
  },
  {
    file: 'src/auth/auth.module.ts',
    methods: [{ line: 39, name: 'useFactory' }],
  },
  {
    file: 'src/auth/guards/enhanced-jwt-auth.guard.ts',
    methods: [
      { line: 654, name: 'validateComputerUsePermissions' },
      { line: 721, name: 'validateVncSession' },
      { line: 799, name: 'exceedsConcurrentSessionLimit' },
    ],
  },
  {
    file: 'src/auth/guards/roles.guard.ts',
    methods: [{ line: 90, name: 'canActivate' }],
  },
  {
    file: 'src/auth/strategies/jwt.strategy.ts',
    methods: [{ line: 63, name: 'validate' }],
  },
  // Browser-use service violations
  {
    file: 'src/browser-use/browser-async-job.service.ts',
    methods: [
      { line: 91, name: 'createAsyncJob' },
      { line: 309, name: 'getQueueStatus' },
      { line: 636, name: 'processFormFilling' },
      { line: 644, name: 'processScreenshotCapture' },
      { line: 654, name: 'processCustomWorkflow' },
      { line: 665, name: 'completeJob' },
      { line: 699, name: 'handleJobFailure' },
      { line: 757, name: 'updateJobProgress' },
      { line: 856, name: 'createExtractionSession' },
    ],
  },
  {
    file: 'src/browser-use/browser-session.service.ts',
    methods: [
      { line: 154, name: 'getSession' },
      { line: 170, name: 'getAllSessions' },
      { line: 231, name: 'createTab' },
      { line: 288, name: 'closeTab' },
      { line: 327, name: 'switchTab' },
      { line: 360, name: 'updateActivity' },
      { line: 390, name: 'initializeBrowserSession' },
      { line: 415, name: 'terminateBrowserSession' },
    ],
  },
  {
    file: 'src/browser-use/browser-task.service.ts',
    methods: [
      { line: 127, name: 'createTask' },
      { line: 174, name: 'getTask' },
    ],
  },
  // Computer-use service violations
  {
    file: 'src/computer-use/computer-use.service.ts',
    methods: [
      { line: 264, name: 'validateAction' },
      { line: 388, name: 'executeAction' },
      { line: 651, name: 'validateContextAndBounds' },
      { line: 707, name: 'validateBounds' },
      { line: 789, name: 'findElementText' },
      { line: 848, name: 'takeScreenshot' },
      { line: 966, name: 'clickElement' },
      { line: 1040, name: 'typeText' },
      { line: 1109, name: 'keyPress' },
      { line: 1171, name: 'scrollPage' },
      { line: 1233, name: 'hoverElement' },
      { line: 1293, name: 'rightClickElement' },
      { line: 1371, name: 'dragElement' },
      { line: 1459, name: 'selectText' },
      { line: 1523, name: 'checkElementExists' },
      { line: 1573, name: 'getElementInfo' },
      { line: 1635, name: 'waitForElement' },
      { line: 1707, name: 'getPageInfo' },
      { line: 1753, name: 'executeBrowserAction' },
    ],
  },
  // Add more files as needed...
];

/**
 * Fixes require-await violations in a file by removing 'async' from methods
 * that don't contain 'await' expressions
 */
function fixRequireAwaitViolations(filePath) {
  const fullPath = path.resolve(filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;

  // Pattern to match async methods/functions that don't contain await
  const asyncPatterns = [
    // Async method patterns
    /async\s+(\w+)\s*\([^)]*\):\s*Promise<([^>]+)>\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g,
    // Async arrow function patterns
    /async\s*\([^)]*\)\s*:\s*Promise<([^>]+)>\s*=>\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g,
    // Static async method patterns
    /static\s+async\s+(\w+)\s*\([^)]*\):\s*Promise<([^>]+)>\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g,
  ];

  // More targeted approach: look for specific method signatures and check if they contain await
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Look for async method declarations
    if (
      line.includes('async ') &&
      (line.includes('(') || line.includes('=>'))
    ) {
      // Find the complete method body
      let methodStart = i;
      let braceCount = 0;
      let methodEnd = i;
      let foundOpenBrace = false;

      // Find method body boundaries
      for (let j = i; j < lines.length; j++) {
        const currentLine = lines[j];

        if (currentLine.includes('{')) {
          foundOpenBrace = true;
          braceCount += (currentLine.match(/\{/g) || []).length;
        }
        if (currentLine.includes('}')) {
          braceCount -= (currentLine.match(/\}/g) || []).length;
        }

        if (foundOpenBrace && braceCount === 0) {
          methodEnd = j;
          break;
        }
      }

      // Extract method body and check for await
      const methodBody = lines.slice(methodStart, methodEnd + 1).join('\n');

      if (!methodBody.includes('await ') && !methodBody.includes('await(')) {
        // This method is async but has no await - fix it
        console.log(
          `🔧 Fixing async method without await at line ${i + 1}: ${line.trim().substring(0, 60)}...`,
        );

        // Remove async keyword and convert Promise<T> to T
        let fixedLine = line
          .replace(/async\s+/g, '')
          .replace(/:\s*Promise<([^>]+)>/g, ': $1');

        lines[i] = fixedLine;
        modified = true;
      }
    }
  }

  if (modified) {
    const newContent = lines.join('\n');
    fs.writeFileSync(fullPath, newContent, 'utf8');
    console.log(`✅ Fixed require-await violations in: ${filePath}`);
    return true;
  } else {
    console.log(`ℹ️  No require-await violations found in: ${filePath}`);
    return false;
  }
}

/**
 * Process all TypeScript files in src directory
 */
function processAllFiles() {
  const srcDir = path.resolve('src');
  const tsFiles = [];

  // Recursively find all TypeScript files
  function findTsFiles(dir) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory() && !file.includes('node_modules')) {
        findTsFiles(fullPath);
      } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
        tsFiles.push(fullPath);
      }
    }
  }

  findTsFiles(srcDir);

  console.log(
    `\n🔍 Processing ${tsFiles.length} TypeScript files for require-await violations...\n`,
  );

  let fixedFiles = 0;

  for (const file of tsFiles) {
    const relativePath = path.relative(process.cwd(), file);
    if (fixRequireAwaitViolations(relativePath)) {
      fixedFiles++;
    }
  }

  console.log(
    `\n✨ Complete! Fixed ${fixedFiles} files with require-await violations.`,
  );
}

// Run the fix
if (require.main === module) {
  processAllFiles();
}

module.exports = { fixRequireAwaitViolations, processAllFiles };
