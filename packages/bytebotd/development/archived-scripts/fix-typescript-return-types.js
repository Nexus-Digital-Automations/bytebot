#!/usr/bin/env node

/**
 * Fix TypeScript return types after removing async keywords
 *
 * This script fixes return type mismatches that occur after removing 'async'
 * from methods that don't use 'await'. It updates Promise<T> return types to T.
 */

const fs = require('fs');
const path = require('path');

/**
 * Fix TypeScript compilation errors caused by async/Promise type mismatches
 */
function fixTypeScriptReturnTypes() {
  console.log('🔧 Fixing TypeScript return type mismatches...\n');

  const fixes = [
    // browser-async-job.service.ts
    {
      file: 'src/browser-use/browser-async-job.service.ts',
      fixes: [
        {
          from: /getQueueStatus\(\): Promise<{/,
          to: 'getQueueStatus(): {',
          description: 'Fix getQueueStatus return type',
        },
      ],
    },

    // browser-session.service.ts
    {
      file: 'src/browser-use/browser-session.service.ts',
      fixes: [
        {
          from: /createTab\(\s*sessionId: string,\s*tabOptions[^)]*\): Promise<BrowserTabInfoDto>/,
          to: (match) =>
            match.replace('Promise<BrowserTabInfoDto>', 'BrowserTabInfoDto'),
          description: 'Fix createTab return type',
        },
        {
          from: /updateActivity\(\s*sessionId: string[^)]*\): Promise<void>/,
          to: (match) => match.replace('Promise<void>', 'void'),
          description: 'Fix updateActivity return type',
        },
        {
          from: /initializeBrowserSession\([^)]*\): Promise<void>/,
          to: (match) => match.replace('Promise<void>', 'void'),
          description: 'Fix initializeBrowserSession return type',
        },
        {
          from: /terminateBrowserSession\([^)]*\): Promise<void>/,
          to: (match) => match.replace('Promise<void>', 'void'),
          description: 'Fix terminateBrowserSession return type',
        },
      ],
    },

    // browser-task.service.ts
    {
      file: 'src/browser-use/browser-task.service.ts',
      fixes: [
        {
          from: /updateTaskStatus\([^)]*\): Promise<void>/,
          to: (match) => match.replace('Promise<void>', 'void'),
          description: 'Fix updateTaskStatus return type',
        },
        {
          from: /updateTaskProgress\([^)]*\): Promise<void>/,
          to: (match) => match.replace('Promise<void>', 'void'),
          description: 'Fix updateTaskProgress return type',
        },
        {
          from: /getTasksByStatus\([^)]*\): Promise<BrowserTaskResultDto\[\]>/,
          to: (match) =>
            match.replace(
              'Promise<BrowserTaskResultDto[]>',
              'BrowserTaskResultDto[]',
            ),
          description: 'Fix getTasksByStatus return type',
        },
        {
          from: /getTaskMetrics\(\): Promise<{/,
          to: 'getTaskMetrics(): {',
          description: 'Fix getTaskMetrics return type',
        },
      ],
    },

    // browser-use.controller.ts - need to re-add async for methods that use await
    {
      file: 'src/browser-use/browser-use.controller.ts',
      fixes: [
        {
          from: /createTab\(\s*@Param\('sessionId'\) sessionId: string,/,
          to: "async createTab(\n    @Param('sessionId') sessionId: string,",
          description: 'Re-add async to createTab (uses await)',
        },
        {
          from: /takeScreenshot\(\s*@Param\('sessionId'\) sessionId: string,/,
          to: "async takeScreenshot(\n    @Param('sessionId') sessionId: string,",
          description: 'Re-add async to takeScreenshot (uses await)',
        },
        {
          from: /extractPageData\(\s*@Param\('sessionId'\) sessionId: string,/,
          to: "async extractPageData(\n    @Param('sessionId') sessionId: string,",
          description: 'Re-add async to extractPageData (uses await)',
        },
      ],
    },

    // mcp/compressor.ts - need to re-add async for methods that use await
    {
      file: 'src/mcp/compressor.ts',
      fixes: [
        {
          from: /static compressToSize\(/,
          to: 'static async compressToSize(',
          description: 'Re-add async to compressToSize (uses await)',
        },
        {
          from: /static compressWithResize\(/,
          to: 'static async compressWithResize(',
          description: 'Re-add async to compressWithResize (uses await)',
        },
      ],
    },

    // nut.service.ts
    {
      file: 'src/nut/nut.service.ts',
      fixes: [
        {
          from: /private delay\(ms: number\): void/,
          to: 'private delay(ms: number): Promise<void>',
          description: 'Fix delay return type (returns Promise)',
        },
      ],
    },

    // security-config.deployment.ts - need to re-add async
    {
      file: 'src/security/security-config.deployment.ts',
      fixes: [
        {
          from: /static applySecurityToApp\(/,
          to: 'static async applySecurityToApp(',
          description: 'Re-add async to applySecurityToApp (needs to be async)',
        },
      ],
    },
  ];

  let totalFixed = 0;

  for (const fileConfig of fixes) {
    const filePath = path.resolve(fileConfig.file);

    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${fileConfig.file}`);
      continue;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let fileModified = false;

    for (const fix of fileConfig.fixes) {
      const { from, to, description } = fix;

      if (typeof to === 'function') {
        // Dynamic replacement
        if (from.test(content)) {
          content = content.replace(from, to);
          console.log(`✅ ${fileConfig.file}: ${description}`);
          fileModified = true;
          totalFixed++;
        }
      } else {
        // Simple string replacement
        if (from.test(content)) {
          content = content.replace(from, to);
          console.log(`✅ ${fileConfig.file}: ${description}`);
          fileModified = true;
          totalFixed++;
        }
      }
    }

    if (fileModified) {
      fs.writeFileSync(filePath, content, 'utf8');
    }
  }

  console.log(`\n✨ Fixed ${totalFixed} TypeScript return type issues.`);
}

// Run the fixes
if (require.main === module) {
  fixTypeScriptReturnTypes();
}

module.exports = { fixTypeScriptReturnTypes };
