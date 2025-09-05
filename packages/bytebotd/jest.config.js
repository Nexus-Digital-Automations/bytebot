/**
 * Jest Configuration for BytebotD Package
 *
 * Production-ready Jest testing framework configuration with:
 * - TypeScript compilation and path mapping support
 * - Comprehensive coverage reporting with thresholds
 * - NestJS testing utilities and decorator mocking
 * - Performance optimization for large codebases
 * - Custom matchers and test environment setup
 * - Proper cleanup and resource management
 *
 * @author Claude Code
 * @version 1.0.0
 */

module.exports = {
  // Display name for the test suite
  displayName: {
    name: 'BytebotD',
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

  // Test file patterns
  testRegex: [
    '.*\\.spec\\.ts$',
    '.*\\.test\\.ts$',
    '.*(/__tests__/.*|(\\.|/)(test|spec))\\.(js|ts)$',
  ],

  // Transform configuration for TypeScript
  transform: {
    '^.+\\.(t|j)s$': [
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

  // Coverage thresholds - enforcing high code quality
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75,
    },
    // Specific thresholds for critical modules
    './src/computer-use/': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    './src/cua-integration/': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
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

  // Transform ignore patterns (don't transform node_modules)
  transformIgnorePatterns: ['node_modules/(?!(.*\\.(ts|tsx|js|jsx))$)'],

  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Verbose output for debugging
  verbose: true,

  // Error handling and debugging
  errorOnDeprecated: false, // Allow deprecated APIs for now
  bail: false,

  // Performance optimization
  maxWorkers: '50%',
  cache: true,
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',

  // Test result processors
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: '<rootDir>/coverage/html-report',
        filename: 'test-report.html',
        expand: true,
        hideIcon: false,
        pageTitle: 'BytebotD Test Report',
      },
    ],
    [
      'jest-junit',
      {
        outputDirectory: '<rootDir>/coverage',
        outputName: 'junit.xml',
        suiteName: 'BytebotD Tests',
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

  // Transform ignore patterns for node_modules
  transformIgnorePatterns: ['node_modules/(?!(.*\\.(mjs|jsx?|tsx?))$)'],
};
