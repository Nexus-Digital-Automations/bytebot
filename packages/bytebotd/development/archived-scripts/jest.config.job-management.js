/**
 * Jest Configuration for Job Management Testing Framework
 *
 * Comprehensive test configuration for enterprise job management system
 * covering unit tests, integration tests, performance tests, chaos engineering,
 * and security testing with specialized configurations for each test type.
 *
 * Test Categories:
 * - Unit Tests: Fast, isolated component testing
 * - Integration Tests: End-to-end workflow validation
 * - Performance Tests: Load testing and benchmarking
 * - Chaos Tests: Failure injection and resilience validation
 * - Security Tests: Security compliance and vulnerability testing
 *
 * @version 1.0.0 - Complete Job Management Test Configuration
 * @author Testing Framework Specialist
 */

const baseConfig = {
  // Base Jest configuration
  preset: 'ts-jest',
  testEnvironment: 'node',

  // Module resolution
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@test/(.*)$': '<rootDir>/test/$1',
  },

  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/test/setup/test-setup.ts',
    '<rootDir>/test/setup/job-management-setup.ts',
  ],

  // Coverage configuration
  collectCoverageFrom: [
    'src/computer-use/**/*.ts',
    '!src/computer-use/**/*.spec.ts',
    '!src/computer-use/**/*.test.ts',
    '!src/computer-use/**/*.d.ts',
    '!src/computer-use/**/index.ts',
  ],

  // Transform configuration
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },

  // File extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // Test path ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
  ],

  // Global variables
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.test.json',
      isolatedModules: true,
    },
  },

  // Verbose output
  verbose: true,

  // Error handling
  errorOnDeprecated: true,

  // Memory management
  logHeapUsage: true,
  detectOpenHandles: true,
  forceExit: true,
};

// Unit Tests Configuration
const unitTestConfig = {
  ...baseConfig,
  displayName: 'Job Management - Unit Tests',
  testMatch: [
    '<rootDir>/src/computer-use/**/__tests__/**/*.spec.ts',
    '<rootDir>/src/computer-use/**/*.spec.ts',
  ],

  // Fast execution for unit tests
  maxWorkers: '50%',
  testTimeout: 30000, // 30 seconds

  // Coverage requirements for unit tests
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    './src/computer-use/job-management.service.ts': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95,
    },
  },

  // Coverage reports
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  coverageDirectory: '<rootDir>/coverage/unit',

  // Mocking configuration
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Setup
  setupFiles: [
    '<rootDir>/test/setup/unit-test-setup.ts',
  ],
};

// Integration Tests Configuration
const integrationTestConfig = {
  ...baseConfig,
  displayName: 'Job Management - Integration Tests',
  testMatch: [
    '<rootDir>/test/integration/**/*.spec.ts',
  ],

  // Slower execution for integration tests
  maxWorkers: 2,
  testTimeout: 120000, // 2 minutes

  // Environment setup
  setupFilesAfterEnv: [
    '<rootDir>/test/setup/integration-setup.ts',
  ],

  // No coverage for integration tests (focus on functionality)
  collectCoverage: false,

  // Extended timeouts
  testEnvironmentOptions: {
    timeout: 120000,
  },

  // Real Redis instance for integration tests
  globalSetup: '<rootDir>/test/setup/redis-setup.js',
  globalTeardown: '<rootDir>/test/setup/redis-teardown.js',
};

// Performance Tests Configuration
const performanceTestConfig = {
  ...baseConfig,
  displayName: 'Job Management - Performance Tests',
  testMatch: [
    '<rootDir>/test/performance/**/*.spec.ts',
  ],

  // Single worker for accurate performance measurements
  maxWorkers: 1,
  testTimeout: 300000, // 5 minutes

  // Performance-specific setup
  setupFilesAfterEnv: [
    '<rootDir>/test/setup/performance-setup.ts',
  ],

  // No coverage for performance tests
  collectCoverage: false,

  // Extended memory limits
  testEnvironmentOptions: {
    timeout: 300000,
  },

  // Performance monitoring
  reporters: [
    'default',
    ['<rootDir>/test/reporters/performance-reporter.js', {
      outputFile: 'performance-results.json'
    }],
  ],
};

// Chaos Engineering Tests Configuration
const chaosTestConfig = {
  ...baseConfig,
  displayName: 'Job Management - Chaos Tests',
  testMatch: [
    '<rootDir>/test/chaos/**/*.spec.ts',
  ],

  // Limited workers for chaos testing
  maxWorkers: 1,
  testTimeout: 300000, // 5 minutes

  // Chaos-specific setup
  setupFilesAfterEnv: [
    '<rootDir>/test/setup/chaos-setup.ts',
  ],

  // No coverage for chaos tests
  collectCoverage: false,

  // Retry configuration for flaky chaos tests
  retryTimes: 2,

  // Custom test environment for chaos testing
  testEnvironment: '<rootDir>/test/environments/chaos-environment.js',

  // Chaos test reporting
  reporters: [
    'default',
    ['<rootDir>/test/reporters/chaos-reporter.js', {
      outputFile: 'chaos-results.json',
    }],
  ],
};

// Security Tests Configuration
const securityTestConfig = {
  ...baseConfig,
  displayName: 'Job Management - Security Tests',
  testMatch: [
    '<rootDir>/test/security/**/*.spec.ts',
  ],

  // Single worker for security tests
  maxWorkers: 1,
  testTimeout: 120000, // 2 minutes

  // Security-specific setup
  setupFilesAfterEnv: [
    '<rootDir>/test/setup/security-setup.ts',
  ],

  // No coverage for security tests
  collectCoverage: false,

  // Isolated test environment
  testEnvironment: '<rootDir>/test/environments/security-environment.js',

  // Security test reporting
  reporters: [
    'default',
    ['<rootDir>/test/reporters/security-reporter.js', {
      outputFile: 'security-results.json',
    }],
  ],
};

// Export configuration based on environment
module.exports = (() => {
  const testType = process.env.TEST_TYPE || 'unit';

  switch (testType) {
    case 'unit':
      return unitTestConfig;
    case 'integration':
      return integrationTestConfig;
    case 'performance':
      return performanceTestConfig;
    case 'chaos':
      return chaosTestConfig;
    case 'security':
      return securityTestConfig;
    case 'all':
      // Multi-project configuration for running all tests
      return {
        projects: [
          unitTestConfig,
          integrationTestConfig,
          performanceTestConfig,
          chaosTestConfig,
          securityTestConfig,
        ],
        collectCoverage: true,
        coverageDirectory: '<rootDir>/coverage/all',
        coverageReporters: ['text-summary', 'html'],
      };
    default:
      return unitTestConfig;
  }
})();