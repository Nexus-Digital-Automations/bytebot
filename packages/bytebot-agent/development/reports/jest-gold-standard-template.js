/**
 * Bytebot Jest Gold Standard Configuration Template
 *
 * Extracted from BytebotD's enterprise-grade Jest framework
 * Optimized for TypeScript, NestJS, and large-scale testing
 *
 * Usage:
 * 1. Copy this file to your package root as jest.config.js
 * 2. Update displayName.name to match your package
 * 3. Adjust moduleNameMapper paths as needed
 * 4. Customize coverageThreshold for your critical modules
 *
 * @author Claude Code (Extracted from BytebotD)
 * @version 2.0.0
 */

module.exports = {
  // Display name for the test suite - UPDATE THIS
  displayName: {
    name: 'Your-Package-Name', // ← CHANGE THIS
    color: 'blue',
  },

  // Test environment
  testEnvironment: 'node',

  // Preset for TypeScript support
  preset: 'ts-jest',

  // Root directory for tests
  rootDir: '.',
  roots: ['<rootDir>/src'],

  // Module file extensions
  moduleFileExtensions: ['js', 'json', 'ts', 'tsx'],

  // Enhanced test file patterns
  testRegex: [
    '.*\\.spec\\.ts$',
    '.*\\.test\\.ts$',
    '.*(/__tests__/.*|(\\.|/)(test|spec))\\.(js|ts)$',
  ],

  // FIXED: Transform configuration (resolves .js file compilation warnings)
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        // TypeScript compilation options
        tsconfig: './tsconfig.json',
        // Enable diagnostics for better error reporting
        diagnostics: {
          warnOnly: true,
        },
      },
    ],
  },

  // Module name mapping for path resolution - CUSTOMIZE AS NEEDED
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@src/(.*)$': '<rootDir>/src/$1',
    '^@bytebot/shared$': '<rootDir>/../shared/src',
    '^@bytebot/shared/(.*)$': '<rootDir>/../shared/src/$1',
    // Add your custom paths here
  },

  // Setup files and configuration
  setupFiles: ['<rootDir>/src/test-utils/simple-setup.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/test-utils/setupAfterEnv.ts'],

  // Test timeout (30 seconds for integration tests)
  testTimeout: 30000,

  // Coverage configuration
  collectCoverage: false, // Only collect when explicitly requested
  coverageDirectory: '../coverage',

  // Coverage collection patterns
  collectCoverageFrom: [
    'src/**/*.(t|j)s',
    '!src/**/*.d.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.test.ts',
    '!src/**/__tests__/**',
    '!src/main.ts',
    '!src/test-utils/**',
  ],

  // Coverage reporters
  coverageReporters: ['html', 'lcov', 'text', 'text-summary', 'json', 'clover'],

  // ENTERPRISE COVERAGE THRESHOLDS - CUSTOMIZE FOR YOUR PACKAGE
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75,
    },
    // Example: Higher thresholds for critical modules
    './src/core/': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    './src/services/': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    // Add your critical modules here
  },

  // Ignore patterns for coverage
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
    '/src/test-utils/',
    '\\.d\\.ts$',
  ],

  // Module paths to ignore
  modulePathIgnorePatterns: [
    '<rootDir>/dist/',
    '<rootDir>/node_modules/',
    '<rootDir>/coverage/',
  ],

  // FIXED: Transform ignore patterns (prevents .js file compilation warnings)
  transformIgnorePatterns: ['node_modules/(?!(.*\\.(mjs|jsx?|tsx?))$)'],

  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Verbose output for debugging
  verbose: true,

  // Error handling and debugging
  errorOnDeprecated: false, // Allow deprecated APIs for now
  bail: false,

  // PERFORMANCE OPTIMIZATION
  maxWorkers: '50%', // Optimal CPU utilization
  cache: true,
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',

  // PRODUCTION-READY REPORTING
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: '<rootDir>/coverage/html-report',
        filename: 'test-report.html',
        expand: true,
        hideIcon: false,
        pageTitle: 'Your Package Test Report', // ← CHANGE THIS
      },
    ],
    [
      'jest-junit',
      {
        outputDirectory: '<rootDir>/coverage',
        outputName: 'junit.xml',
        suiteName: 'Your Package Tests', // ← CHANGE THIS
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true,
      },
    ],
  ],

  // Watch mode configuration
  watchman: true,
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/coverage/',
  ],

  // Notification settings
  notify: false,
  notifyMode: 'failure-change',

  // Test execution order
  testSequencer: '@jest/test-sequencer',

  // Force exit after tests complete
  forceExit: false,
  detectOpenHandles: true,

  // Mock configuration
  automock: false,
  unmockedModulePathPatterns: ['<rootDir>/node_modules/'],

  // Environment variables for tests
  testEnvironmentOptions: {
    NODE_ENV: 'test',
  },

  // Test location patterns
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/coverage/'],

  // Extensions to find modules
  moduleDirectories: ['node_modules', '<rootDir>/src'],
};

/**
 * REQUIRED DEPENDENCIES:
 *
 * npm install --save-dev \
 *   @jest/globals \
 *   @types/jest \
 *   jest \
 *   jest-html-reporters \
 *   jest-junit \
 *   ts-jest \
 *   typescript
 *
 * REQUIRED FILES:
 *
 * src/test-utils/simple-setup.ts - Basic test environment setup
 * src/test-utils/setupAfterEnv.ts - Custom matchers and utilities
 *
 * PACKAGE.JSON SCRIPTS:
 *
 * {
 *   "scripts": {
 *     "test": "jest --config jest.config.js",
 *     "test:watch": "jest --config jest.config.js --watch",
 *     "test:coverage": "jest --config jest.config.js --coverage",
 *     "test:ci": "jest --config jest.config.js --coverage --ci --watchAll=false"
 *   }
 * }
 */
