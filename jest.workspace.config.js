/**
 * Jest Workspace Configuration for Bytebot Monorepo
 * 
 * Enterprise-grade Jest configuration for multi-package testing coordination.
 * Provides comprehensive test orchestration, coverage aggregation, and reporting
 * across all packages in the Bytebot ecosystem.
 * 
 * Features:
 * - Multi-package test orchestration
 * - Unified coverage reporting
 * - Cross-package dependency testing
 * - Performance monitoring and optimization
 * - Enterprise-grade reporting and documentation
 * 
 * @author Claude Code (DevOps & Test Infrastructure Specialist)
 * @version 1.0.0
 * @created 2025-09-06
 */

const path = require('path');

module.exports = {
  // Display name for the workspace
  displayName: {
    name: 'Bytebot Workspace',
    color: 'cyan',
  },

  // Root directory configuration
  rootDir: '.',
  
  // Projects configuration - each package is a separate Jest project
  projects: [
    {
      displayName: { name: 'Shared', color: 'yellow' },
      rootDir: '<rootDir>/packages/shared',
      testEnvironment: 'node',
      preset: 'ts-jest',
      testMatch: ['<rootDir>/src/**/*.{test,spec}.{js,ts}'],
      collectCoverageFrom: ['<rootDir>/src/**/*.ts', '!<rootDir>/src/**/*.d.ts'],
      coverageDirectory: '<rootDir>/../../coverage-workspace/shared',
      setupFilesAfterEnv: ['<rootDir>/src/test-utils/setupAfterEnv.ts'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
    },
    {
      displayName: { name: 'Bytebot-Agent', color: 'green' },
      rootDir: '<rootDir>/packages/bytebot-agent',
      testEnvironment: 'node',
      preset: 'ts-jest',
      testMatch: ['<rootDir>/src/**/*.{test,spec}.{js,ts}'],
      collectCoverageFrom: ['<rootDir>/src/**/*.ts', '!<rootDir>/src/**/*.d.ts'],
      coverageDirectory: '<rootDir>/../../coverage-workspace/bytebot-agent',
      setupFilesAfterEnv: ['<rootDir>/test/setupAfterEnv.ts'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@bytebot/shared$': '<rootDir>/../shared/src',
        '^@bytebot/shared/(.*)$': '<rootDir>/../shared/src/$1',
      },
    },
    {
      displayName: { name: 'Bytebot-UI', color: 'magenta' },
      rootDir: '<rootDir>/packages/bytebot-ui',
      testEnvironment: 'jsdom',
      preset: 'ts-jest',
      testMatch: ['<rootDir>/src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
      collectCoverageFrom: [
        '<rootDir>/src/**/*.{js,jsx,ts,tsx}',
        '!<rootDir>/src/**/*.d.ts',
        '!<rootDir>/src/pages/_app.tsx',
        '!<rootDir>/src/pages/_document.tsx',
      ],
      coverageDirectory: '<rootDir>/../../coverage-workspace/bytebot-ui',
      setupFilesAfterEnv: ['<rootDir>/src/test-utils/setupAfterEnv.ts'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@components/(.*)$': '<rootDir>/src/components/$1',
        '^@utils/(.*)$': '<rootDir>/src/utils/$1',
        '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
        '^@types/(.*)$': '<rootDir>/src/types/$1',
        '^@bytebot/shared$': '<rootDir>/../shared/src',
        '^@bytebot/shared/(.*)$': '<rootDir>/../shared/src/$1',
        '\\\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        '\\\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
          '<rootDir>/src/test-utils/__mocks__/fileMock.js',
      },
      transform: {
        '^.+\\\\.(js|jsx|ts|tsx)$': ['ts-jest', {
          useESM: true,
          tsconfig: '<rootDir>/tsconfig.json',
        }],
      },
    },
    {
      displayName: { name: 'BytebotD', color: 'blue' },
      rootDir: '<rootDir>/packages/bytebotd',
      testEnvironment: 'node',
      preset: 'ts-jest',
      testMatch: ['<rootDir>/src/**/*.{test,spec}.{js,ts}'],
      collectCoverageFrom: [
        '<rootDir>/src/**/*.ts',
        '!<rootDir>/src/**/*.d.ts',
        '!<rootDir>/src/main.ts',
      ],
      coverageDirectory: '<rootDir>/../../coverage-workspace/bytebotd',
      setupFilesAfterEnv: ['<rootDir>/src/test-utils/setupAfterEnv.ts'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@bytebot/shared$': '<rootDir>/../shared/src',
        '^@bytebot/shared/(.*)$': '<rootDir>/../shared/src/$1',
      },
    },
  ],

  // Global configuration for workspace testing
  collectCoverage: false, // Only collect when explicitly requested
  coverageDirectory: '<rootDir>/coverage-workspace',
  
  // Aggregated coverage configuration
  collectCoverageFrom: [
    'packages/*/src/**/*.{js,jsx,ts,tsx}',
    '!packages/*/src/**/*.d.ts',
    '!packages/*/src/**/*.{test,spec}.{js,jsx,ts,tsx}',
    '!packages/*/src/**/__tests__/**',
    '!packages/*/src/test-utils/**',
    '!packages/bytebot-agent/src/main.ts',
    '!packages/bytebotd/src/main.ts',
    '!packages/bytebot-ui/src/pages/_app.tsx',
    '!packages/bytebot-ui/src/pages/_document.tsx',
  ],

  // Coverage reporters for workspace
  coverageReporters: ['html', 'lcov', 'text', 'text-summary', 'json', 'clover'],

  // ENTERPRISE COVERAGE THRESHOLDS - Workspace-wide standards
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75,
    },
    // Package-specific thresholds
    'packages/shared/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    'packages/bytebot-agent/': {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
    'packages/bytebot-ui/': {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
    'packages/bytebotd/': {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75,
    },
  },

  // Test timeout configuration
  testTimeout: 30000,

  // Performance optimization
  maxWorkers: '50%',
  cache: true,
  cacheDirectory: '<rootDir>/node_modules/.cache/jest-workspace',

  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Verbose output for debugging
  verbose: true,

  // Error handling
  errorOnDeprecated: false,
  bail: false,

  // PRODUCTION-READY REPORTING
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: '<rootDir>/coverage-workspace/html-report',
        filename: 'workspace-test-report.html',
        expand: true,
        hideIcon: false,
        pageTitle: 'Bytebot Workspace Test Report',
        reportTitle: 'Comprehensive Test Results - All Packages',
      },
    ],
    [
      'jest-junit',
      {
        outputDirectory: '<rootDir>/coverage-workspace',
        outputName: 'workspace-junit.xml',
        suiteName: 'Bytebot Workspace Tests',
        classNameTemplate: '{packagename}.{classname}',
        titleTemplate: '{packagename} - {title}',
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
    '<rootDir>/packages/*/coverage/',
    '<rootDir>/coverage-workspace/',
  ],

  // Test path ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
    '/coverage-workspace/',
  ],

  // Module paths to ignore
  modulePathIgnorePatterns: [
    '<rootDir>/packages/*/node_modules/',
    '<rootDir>/packages/*/dist/',
    '<rootDir>/packages/*/coverage/',
  ],

  // Transform ignore patterns
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\\\.(mjs|jsx?|tsx?))$)',
  ],

  // Global setup and teardown
  globalSetup: '<rootDir>/scripts/jest-global-setup.js',
  globalTeardown: '<rootDir>/scripts/jest-global-teardown.js',

  // Environment variables for workspace tests
  testEnvironmentOptions: {
    NODE_ENV: 'test',
  },

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

  // Extensions to find modules
  moduleDirectories: ['node_modules'],

  // Test result processor for custom analysis
  testResultsProcessor: '<rootDir>/scripts/test-results-processor.js',
};