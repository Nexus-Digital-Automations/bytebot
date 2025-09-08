/**
 * Jest Configuration for Bytebot-Agent Package
 *
 * Enterprise-grade Jest configuration optimized for:
 * - NestJS applications with authentication and agent processing
 * - API endpoints testing with custom matchers
 * - Agent workflow validation and performance monitoring
 * - TypeScript compilation with strict mode support
 * - Coverage thresholds for critical agent modules
 *
 * @author Claude Code (Based on BytebotD Gold Standard)
 * @version 2.0.0
 */

module.exports = {
  // Display name for the test suite
  displayName: {
    name: 'Bytebot-Agent',
    color: 'cyan',
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

  // Module name mapping for path resolution
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@src/(.*)$': '<rootDir>/src/$1',
    '^@bytebot/shared$': '<rootDir>/../shared/src',
    '^@bytebot/shared/(.*)$': '<rootDir>/../shared/src/$1',
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

  // ENTERPRISE COVERAGE THRESHOLDS - Agent-specific modules
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75,
    },
    // Higher thresholds for critical agent modules
    './src/agent/': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    './src/auth/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    './src/tasks/': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    './src/prisma/': {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
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
        pageTitle: 'Bytebot-Agent Test Report',
      },
    ],
    [
      'jest-junit',
      {
        outputDirectory: '<rootDir>/coverage',
        outputName: 'junit.xml',
        suiteName: 'Bytebot-Agent Tests',
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
