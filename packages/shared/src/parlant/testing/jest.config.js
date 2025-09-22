/**
 * ===================================================================
 * PARLANT TESTING FRAMEWORK - JEST CONFIGURATION
 * Enterprise-Grade Testing Environment Configuration
 * ===================================================================
 *
 * COMPREHENSIVE JEST TESTING CONFIGURATION
 *
 * This configuration file establishes the enterprise-grade Jest testing
 * environment for PARLANT Bytebot middleware testing framework, providing
 * comprehensive test execution, coverage analysis, and reporting capabilities
 * across all testing domains.
 *
 * TESTING FEATURES:
 * - Multi-Environment Testing: Node.js and jsdom environments
 * - Comprehensive Coverage: 95%+ coverage thresholds with detailed reporting
 * - Performance Optimization: Parallel execution with intelligent caching
 * - Advanced Reporting: HTML, LCOV, JSON, and JUnit reporting formats
 * - Mock Management: Sophisticated mocking and test isolation
 *
 * @author Claude Code (Testing Configuration Specialist)
 * @version 1.0.0
 * @created 2025-09-22
 * @classification Enterprise Testing Infrastructure
 */

module.exports = {
  // Test environment configuration
  testEnvironment: 'node',

  // Root directory for testing
  rootDir: '.',

  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.spec.ts',
    '**/?(*.)(test|spec).ts'
  ],

  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/utils/test-setup.ts'
  ],

  // Module name mapping for path resolution
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@utils/(.*)$': '<rootDir>/utils/$1',
    '^@mocks/(.*)$': '<rootDir>/mocks/$1',
    '^@fixtures/(.*)$': '<rootDir>/fixtures/$1',
    '^@config/(.*)$': '<rootDir>/config/$1'
  },

  // File extensions to consider
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'jsx',
    'json'
  ],

  // Transform configuration
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: false,
        tsconfig: {
          compilerOptions: {
            esModuleInterop: true,
            allowSyntheticDefaultImports: true,
            experimentalDecorators: true,
            emitDecoratorMetadata: true
          }
        }
      }
    ]
  },

  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    '**/*.ts',
    '!**/*.d.ts',
    '!**/*.test.ts',
    '!**/*.spec.ts',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!**/dist/**',
    '!**/build/**',
    '!jest.config.js'
  ],

  // Coverage directory
  coverageDirectory: '<rootDir>/coverage',

  // Coverage reporters
  coverageReporters: [
    'html',
    'lcov',
    'text',
    'text-summary',
    'json',
    'clover',
    'cobertura'
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    },
    // Framework-specific thresholds
    './unit/': {
      branches: 98,
      functions: 98,
      lines: 98,
      statements: 98
    },
    './integration/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    './e2e/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    './performance/': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './security/': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    },
    './compatibility/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    './quality-gates/': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    }
  },

  // Test timeout (30 seconds)
  testTimeout: 30000,

  // Parallel execution
  maxWorkers: '50%',

  // Cache configuration
  cache: true,
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',

  // Mock configuration
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Verbose output
  verbose: true,

  // Error handling
  errorOnDeprecated: false,
  bail: false,

  // Test sequencer
  testSequencer: '@jest/test-sequencer',

  // Reporters configuration
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: '<rootDir>/coverage/html-report',
        filename: 'parlant-testing-framework-report.html',
        expand: true,
        hideIcon: false,
        pageTitle: 'PARLANT Testing Framework Report',
        reportTitle: 'Comprehensive Testing Results - All Frameworks',
        includeFailureMsg: true,
        includeSuiteFailure: true
      }
    ],
    [
      'jest-junit',
      {
        outputDirectory: '<rootDir>/coverage',
        outputName: 'parlant-testing-junit.xml',
        suiteName: 'PARLANT Testing Framework',
        classNameTemplate: '{packagename}.{classname}',
        titleTemplate: '{packagename} - {title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true
      }
    ]
  ],

  // Watch configuration
  watchman: true,
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/coverage/',
    '<rootDir>/dist/',
    '<rootDir>/build/'
  ],

  // Test path ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/dist/',
    '/build/'
  ],

  // Module paths to ignore
  modulePathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/coverage/',
    '<rootDir>/dist/',
    '<rootDir>/build/'
  ],

  // Transform ignore patterns
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.(mjs|jsx?|tsx?))$)'
  ],

  // Global setup and teardown
  globalSetup: '<rootDir>/utils/jest-global-setup.ts',
  globalTeardown: '<rootDir>/utils/jest-global-teardown.ts',

  // Test environment options
  testEnvironmentOptions: {
    NODE_ENV: 'test'
  },

  // Notification settings
  notify: false,
  notifyMode: 'failure-change',

  // Force exit configuration
  forceExit: false,
  detectOpenHandles: true,

  // Mock configuration
  automock: false,
  unmockedModulePathPatterns: [
    '<rootDir>/node_modules/'
  ],

  // Extensions to find modules
  moduleDirectories: [
    'node_modules',
    '<rootDir>'
  ],

  // Preset configuration
  preset: 'ts-jest',

  // Projects configuration for multi-framework testing
  projects: [
    {
      displayName: { name: 'Unit Tests', color: 'cyan' },
      testMatch: ['<rootDir>/unit/**/*.{test,spec}.ts'],
      coverageDirectory: '<rootDir>/coverage/unit'
    },
    {
      displayName: { name: 'Integration Tests', color: 'yellow' },
      testMatch: ['<rootDir>/integration/**/*.{test,spec}.ts'],
      coverageDirectory: '<rootDir>/coverage/integration',
      testTimeout: 60000 // 1 minute for integration tests
    },
    {
      displayName: { name: 'E2E Tests', color: 'green' },
      testMatch: ['<rootDir>/e2e/**/*.{test,spec}.ts'],
      coverageDirectory: '<rootDir>/coverage/e2e',
      testTimeout: 300000 // 5 minutes for E2E tests
    },
    {
      displayName: { name: 'Performance Tests', color: 'magenta' },
      testMatch: ['<rootDir>/performance/**/*.{test,spec}.ts'],
      coverageDirectory: '<rootDir>/coverage/performance',
      testTimeout: 600000 // 10 minutes for performance tests
    },
    {
      displayName: { name: 'Security Tests', color: 'red' },
      testMatch: ['<rootDir>/security/**/*.{test,spec}.ts'],
      coverageDirectory: '<rootDir>/coverage/security',
      testTimeout: 300000 // 5 minutes for security tests
    },
    {
      displayName: { name: 'Compatibility Tests', color: 'blue' },
      testMatch: ['<rootDir>/compatibility/**/*.{test,spec}.ts'],
      coverageDirectory: '<rootDir>/coverage/compatibility',
      testTimeout: 300000 // 5 minutes for compatibility tests
    },
    {
      displayName: { name: 'Quality Gates', color: 'gray' },
      testMatch: ['<rootDir>/quality-gates/**/*.{test,spec}.ts'],
      coverageDirectory: '<rootDir>/coverage/quality-gates',
      testTimeout: 1800000 // 30 minutes for quality gates
    }
  ]
};