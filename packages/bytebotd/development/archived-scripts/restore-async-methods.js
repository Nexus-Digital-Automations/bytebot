#!/usr/bin/env node

/**
 * Restore async keyword for methods that use await
 *
 * This script identifies methods that use 'await' but lost their 'async' keyword
 * and restores the async keyword to fix TypeScript compilation errors.
 */

const fs = require('fs');
const path = require('path');

function restoreAsyncMethods() {
  console.log('🔧 Restoring async keyword for methods that use await...\n');

  const methodsToFix = [
    {
      file: 'src/browser-use/browser-use.service.ts',
      fixes: [
        {
          method: 'captureScreenshot',
          description: 'captureScreenshot uses await',
        },
        { method: 'extractDomData', description: 'extractDomData uses await' },
        { method: 'takeScreenshot', description: 'takeScreenshot uses await' },
        {
          method: 'extractPageData',
          description: 'extractPageData uses await',
        },
        { method: 'getSystemLoad', description: 'getSystemLoad uses await' },
      ],
    },
    {
      file: 'src/computer-use/computer-use.service.ts',
      fixes: [{ method: 'delay', description: 'delay returns Promise' }],
    },
  ];

  let totalFixed = 0;

  for (const fileConfig of methodsToFix) {
    const filePath = path.resolve(fileConfig.file);

    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${fileConfig.file}`);
      continue;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let fileModified = false;

    for (const fix of fileConfig.fixes) {
      // Look for method definitions that need async restored
      const methodPattern = new RegExp(
        `^(\\s*(?:private\\s+|public\\s+|protected\\s+)?)(${fix.method})\\s*\\(`,
        'gm',
      );

      // Check if method uses await and is not already async
      const methodMatch = content.match(methodPattern);
      if (methodMatch) {
        for (const match of methodMatch) {
          // Find the full method
          const startIndex = content.indexOf(match);
          const beforeMethod = content.substring(0, startIndex);
          const afterMethodStart = content.substring(startIndex);

          // Find the method body
          let braceCount = 0;
          let methodBodyStart = afterMethodStart.indexOf('{');
          if (methodBodyStart === -1) continue;

          let methodBodyEnd = methodBodyStart + 1;
          braceCount = 1;

          while (braceCount > 0 && methodBodyEnd < afterMethodStart.length) {
            if (afterMethodStart[methodBodyEnd] === '{') braceCount++;
            if (afterMethodStart[methodBodyEnd] === '}') braceCount--;
            methodBodyEnd++;
          }

          const methodBody = afterMethodStart.substring(
            methodBodyStart,
            methodBodyEnd,
          );

          // Check if method uses await and is not already async
          if (methodBody.includes('await ') && !match.includes('async ')) {
            const newMatch = match.replace(
              new RegExp(
                `^(\\s*(?:private\\s+|public\\s+|protected\\s+)?)(${fix.method})`,
              ),
              '$1async $2',
            );
            content = content.replace(match, newMatch);
            console.log(
              `✅ ${fileConfig.file}: Added async to ${fix.method} - ${fix.description}`,
            );
            fileModified = true;
            totalFixed++;
          }
        }
      }
    }

    if (fileModified) {
      fs.writeFileSync(filePath, content, 'utf8');
    }
  }

  console.log(`\n✨ Restored async keyword for ${totalFixed} methods.`);
}

// Run the fixes
if (require.main === module) {
  restoreAsyncMethods();
}

module.exports = { restoreAsyncMethods };
