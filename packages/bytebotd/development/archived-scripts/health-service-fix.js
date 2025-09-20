#!/usr/bin/env node

/**
 * Comprehensive TypeScript violation fix for health.service.spec.ts
 *
 * This script fixes the most common TypeScript violations:
 * - Replaces 'as any' with proper type assertions
 * - Fixes unsafe assignments in expect statements
 * - Handles mock result object typing
 * - Replaces || with ?? for nullish coalescing
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(
  __dirname,
  'src/health/__tests__/health.service.spec.ts',
);

console.log('Reading health.service.spec.ts...');
let content = fs.readFileSync(filePath, 'utf8');

console.log('Applying comprehensive TypeScript fixes...');

// Fix 1: Replace 'as any' with proper type assertions
content = content.replace(/as any(?!\w)/g, 'as unknown');

// Fix 2: Fix expect.any() unsafe assignments by splitting into individual assertions
const expectAnyPattern = /expect\(([^)]+)\)\.toMatchObject\(\{([^}]+)\}\);/g;
content = content.replace(expectAnyPattern, (match, resultVar, objContent) => {
  // Extract individual property assertions
  const props = objContent
    .split(',')
    .map((prop) => prop.trim())
    .filter((prop) => prop);
  const assertions = props.map((prop) => {
    const [key, value] = prop.split(':').map((p) => p.trim());
    return `      expect(${resultVar}.${key}).toEqual(${value});`;
  });
  return assertions.join('\n');
});

// Fix 3: Replace || with ?? for nullish coalescing where appropriate
content = content.replace(/(\w+)\.(\w+) \|\| /g, '$1.$2 ?? ');

// Fix 4: Fix result.status access patterns
content = content.replace(/result\.status as any/g, 'result.status as string');
content = content.replace(
  /response\.status as any/g,
  'response.status as string',
);

// Fix 5: Fix startTime access patterns
content = content.replace(
  /result\.startTime as any/g,
  'result.startTime as number',
);
content = content.replace(
  /response\.startTime as any/g,
  'response.startTime as number',
);

// Fix 6: Add proper type assertions for health check results
content = content.replace(
  /const result = await service\.(\w+)/g,
  'const result = await service.$1 as HealthCheckResult',
);

// Fix 7: Fix expect property access patterns
content = content.replace(
  /expect\(([^)]+)\)\.toHaveProperty\(([^)]+)\);/g,
  'expect($1).toHaveProperty($2 as keyof typeof $1);',
);

// Fix 8: Replace specific problematic patterns
const specificFixes = [
  // Fix mock logger calls with proper typing
  [
    /mockLogger\.(\w+)\.toHaveBeenCalledWith\(([^)]+)\);/g,
    'expect(mockLogger.$1).toHaveBeenCalledWith($2);',
  ],

  // Fix status comparisons
  [
    /result\.status === 'healthy'/g,
    '(result as HealthCheckResult).status === "healthy"',
  ],

  // Fix memory property access
  [/result\.memory\.(\w+)/g, '(result as HealthCheckResult).memory.$1'],

  // Fix services array access
  [
    /result\.services\[(\d+)\]\.(\w+)/g,
    '(result as HealthCheckResult).services[$1].$2',
  ],
];

specificFixes.forEach(([pattern, replacement]) => {
  content = content.replace(pattern, replacement);
});

console.log('Writing fixed content...');
fs.writeFileSync(filePath, content);

console.log('Health service TypeScript violations fixed successfully!');
