/**
 * Jest Configuration for Browser-Use E2E Tests
 *
 * This configuration is specifically designed for end-to-end testing
 * of browser automation APIs with real browser instances and network calls.
 *
 * Features:
 * - Extended timeouts for browser operations
 * - Real browser testing environment
 * - Network request handling
 * - Comprehensive test reporting
 * - Resource cleanup and management
 * - Performance monitoring integration
 */

module.exports = {
  // Test environment configuration
  preset: 'ts-jest',
  testEnvironment: 'node',

  // Test file patterns
  testMatch: [
    '<rootDir>/e2e/**/*.e2e.spec.ts',
    '<rootDir>/integration/**/*.integration.spec.ts'
  ],

  // Module resolution
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },

  // Coverage configuration for E2E tests
  collectCoverage: true,
  coverageDirectory: '../../../coverage/browser-use-e2e',
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json-summary',
    'cobertura'
  ],
  collectCoverageFrom: [
    '../**/*.{ts,js}',
    '!../**/*.spec.ts',
    '!../**/*.test.ts',
    '!../**/__tests__/**',
    '!../**/__mocks__/**',
    '!../node_modules/**',
    '!../dist/**',
  ],

  // Extended timeouts for browser operations
  testTimeout: 60000, // 60 seconds default
  setupFilesAfterEnv: ['<rootDir>/setup/e2e-setup.ts'],

  // Test execution configuration
  maxConcurrency: 3, // Limit concurrent tests to manage browser resources
  maxWorkers: 3,

  // Error handling and reporting
  verbose: true,
  detectOpenHandles: true,
  detectLeaks: true,
  forceExit: true,

  // Global configuration
  globals: {
    'ts-jest': {
      tsconfig: {
        target: 'es2020',
        module: 'commonjs',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
      },
    },
  },

  // Test result processor for detailed reporting
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: '../../../coverage/browser-use-e2e',
        filename: 'e2e-report.html',
        expand: true,
        hideIcon: false,
        pageTitle: 'Browser-Use E2E Test Report',
        logoImgPath: undefined,
        inlineSource: true,
      },
    ],
    [
      'jest-junit',
      {
        outputDirectory: '../../../coverage/browser-use-e2e',
        outputName: 'junit-e2e.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true,
      },
    ],
  ],

  // Module mapping for absolute imports
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/../$1',
    '^@browser-use/(.*)$': '<rootDir>/../$1',
    '^@test-utils/(.*)$': '<rootDir>/test-utils/$1',
  },

  // Test sequencing for resource management
  testSequencer: '<rootDir>/setup/e2e-sequencer.js',

  // Custom test environment options
  testEnvironmentOptions: {
    // Node.js specific options for E2E testing
    node: {
      // Increase memory limit for browser operations
      maxOldSpaceSize: 4096,
    },
  },

  // Retry configuration for flaky E2E tests
  retry: {
    retries: 2, // Retry failed tests up to 2 times
    retryImmediately: false,
  },

  // Performance monitoring
  logHeapUsage: true,

  // Clear mocks and restore all mocks between tests
  clearMocks: true,
  restoreMocks: true,
  resetMocks: false, // Don't reset mocks as E2E tests need real implementations
};