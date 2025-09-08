/**
 * Jest Integration Testing Configuration for Bytebot Monorepo
 * 
 * Comprehensive integration testing setup for cross-package interactions,
 * API integrations, database connections, and service orchestration.
 * 
 * Integration Test Categories:
 * - Cross-package communication testing
 * - API endpoint integration testing
 * - Database integration and transaction testing
 * - External service integration testing
 * - WebSocket and real-time communication testing
 * - Authentication and authorization flow testing
 * 
 * @author Claude Code (DevOps & Test Infrastructure Specialist)
 * @version 1.0.0
 * @created 2025-09-06
 */

module.exports = {
  // Display name for integration tests
  displayName: {
    name: 'Integration Tests',
    color: 'yellow',
  },

  // Root directory configuration
  rootDir: '.',

  // Test environment for integration tests
  testEnvironment: 'node',

  // Preset for TypeScript support
  preset: 'ts-jest',

  // Integration test file patterns
  testMatch: [
    '<rootDir>/packages/**/src/**/*.integration.{test,spec}.{js,ts}',
    '<rootDir>/packages/**/__tests__/**/*.integration.{test,spec}.{js,ts}',
    '<rootDir>/tests/integration/**/*.{test,spec}.{js,ts}',
  ],

  // Setup files for integration tests
  setupFiles: ['<rootDir>/scripts/integration-test-setup.js'],
  setupFilesAfterEnv: ['<rootDir>/scripts/integration-test-afterenv.js'],

  // Global setup and teardown for integration environment
  globalSetup: '<rootDir>/scripts/integration-global-setup.js',
  globalTeardown: '<rootDir>/scripts/integration-global-teardown.js',

  // Module name mapping for cross-package imports
  moduleNameMapper: {
    '^@bytebot/shared$': '<rootDir>/packages/shared/src',
    '^@bytebot/shared/(.*)$': '<rootDir>/packages/shared/src/$1',
    '^@bytebot/agent$': '<rootDir>/packages/bytebot-agent/src',
    '^@bytebot/agent/(.*)$': '<rootDir>/packages/bytebot-agent/src/$1',
    '^@bytebot/ui$': '<rootDir>/packages/bytebot-ui/src',
    '^@bytebot/ui/(.*)$': '<rootDir>/packages/bytebot-ui/src/$1',
    '^@bytebot/bytebotd$': '<rootDir>/packages/bytebotd/src',
    '^@bytebot/bytebotd/(.*)$': '<rootDir>/packages/bytebotd/src/$1',
    '^@test/(.*)$': '<rootDir>/tests/$1',
  },

  // Transform configuration
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: './tsconfig.json',
        diagnostics: {
          warnOnly: true,
        },
      },
    ],
  },

  // Extended test timeout for integration tests
  testTimeout: 60000,

  // Coverage configuration for integration tests
  collectCoverage: false, // Only collect when explicitly requested
  coverageDirectory: '<rootDir>/coverage-workspace/integration',

  // Coverage collection patterns for integration testing
  collectCoverageFrom: [
    'packages/*/src/**/*.{js,ts}',
    'tests/integration/**/*.{js,ts}',
    '!packages/*/src/**/*.d.ts',
    '!packages/*/src/**/*.{test,spec}.{js,ts}',
    '!packages/*/src/**/__tests__/**',
    '!packages/*/src/test-utils/**',
  ],

  // Coverage reporters
  coverageReporters: ['html', 'lcov', 'text', 'text-summary', 'json'],

  // Integration test coverage thresholds
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60,
    },
  },

  // Performance optimization for integration tests
  maxWorkers: 2, // Limited workers for integration tests to avoid conflicts
  cache: true,
  cacheDirectory: '<rootDir>/node_modules/.cache/jest-integration',

  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Verbose output for debugging
  verbose: true,

  // Error handling
  errorOnDeprecated: false,
  bail: false,

  // Test sequence ordering for integration tests
  testSequencer: '<rootDir>/scripts/integration-test-sequencer.js',

  // Integration test reporting
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: '<rootDir>/coverage-workspace/integration/html-report',
        filename: 'integration-test-report.html',
        expand: true,
        hideIcon: false,
        pageTitle: 'Bytebot Integration Test Report',
        reportTitle: 'Cross-Package Integration Testing Results',
      },
    ],
    [
      'jest-junit',
      {
        outputDirectory: '<rootDir>/coverage-workspace/integration',
        outputName: 'integration-junit.xml',
        suiteName: 'Bytebot Integration Tests',
        classNameTemplate: '{packagename}.{classname}',
        titleTemplate: 'Integration - {title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true,
      },
    ],
  ],

  // Watch mode configuration
  watchman: true,
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/packages/*/node_modules/',
    '<rootDir>/packages/*/dist/',
    '<rootDir>/coverage-workspace/',
  ],

  // Test path ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
  ],

  // Module paths to ignore
  modulePathIgnorePatterns: [
    '<rootDir>/packages/*/node_modules/',
    '<rootDir>/packages/*/dist/',
  ],

  // Transform ignore patterns
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.(mjs|jsx?|tsx?))$)',
  ],

  // Environment variables for integration tests
  testEnvironmentOptions: {
    NODE_ENV: 'test',
    INTEGRATION_TEST: 'true',
    LOG_LEVEL: 'error',
  },

  // Notification settings
  notify: false,
  notifyMode: 'failure-change',

  // Force exit configuration
  forceExit: true, // Integration tests may have lingering handles
  detectOpenHandles: true,

  // Mock configuration
  automock: false,
  unmockedModulePathPatterns: ['<rootDir>/node_modules/'],

  // Extensions to find modules
  moduleDirectories: ['node_modules', '<rootDir>/packages'],

  // Test result processor for integration test analysis
  testResultsProcessor: '<rootDir>/scripts/integration-results-processor.js',
};