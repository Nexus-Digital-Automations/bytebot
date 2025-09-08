/**
 * Jest E2E Testing Configuration for Bytebot Monorepo
 *
 * Comprehensive end-to-end testing setup for full system validation,
 * user workflow testing, and complete application integration testing.
 *
 * E2E Test Categories:
 * - Complete user workflow testing
 * - Browser automation and UI interaction testing
 * - Full system integration testing
 * - Performance and load testing
 * - Security and authentication flow testing
 * - Cross-browser compatibility testing
 *
 * @author Claude Code (DevOps & Test Infrastructure Specialist)
 * @version 1.0.0
 * @created 2025-09-06
 */

module.exports = {
  // Display name for E2E tests
  displayName: {
    name: "E2E Tests",
    color: "red",
  },

  // Root directory configuration
  rootDir: ".",

  // Test environment for E2E tests
  testEnvironment: "node",

  // Preset for TypeScript support
  preset: "ts-jest",

  // E2E test file patterns
  testMatch: [
    "<rootDir>/packages/**/src/**/*.e2e.{test,spec}.{js,ts}",
    "<rootDir>/packages/**/__tests__/**/*.e2e.{test,spec}.{js,ts}",
    "<rootDir>/tests/e2e/**/*.{test,spec}.{js,ts}",
  ],

  // Setup files for E2E tests
  setupFiles: ["<rootDir>/scripts/e2e-test-setup.js"],
  setupFilesAfterEnv: ["<rootDir>/scripts/e2e-test-afterenv.js"],

  // Global setup and teardown for E2E environment
  globalSetup: "<rootDir>/scripts/e2e-global-setup.js",
  globalTeardown: "<rootDir>/scripts/e2e-global-teardown.js",

  // Module name mapping for E2E tests
  moduleNameMapper: {
    "^@bytebot/shared$": "<rootDir>/packages/shared/src",
    "^@bytebot/shared/(.*)$": "<rootDir>/packages/shared/src/$1",
    "^@bytebot/agent$": "<rootDir>/packages/bytebot-agent/src",
    "^@bytebot/agent/(.*)$": "<rootDir>/packages/bytebot-agent/src/$1",
    "^@bytebot/ui$": "<rootDir>/packages/bytebot-ui/src",
    "^@bytebot/ui/(.*)$": "<rootDir>/packages/bytebot-ui/src/$1",
    "^@bytebot/bytebotd$": "<rootDir>/packages/bytebotd/src",
    "^@bytebot/bytebotd/(.*)$": "<rootDir>/packages/bytebotd/src/$1",
    "^@test/(.*)$": "<rootDir>/tests/$1",
    "^@e2e/(.*)$": "<rootDir>/tests/e2e/$1",
  },

  // Transform configuration
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        tsconfig: "./tsconfig.json",
        diagnostics: {
          warnOnly: true,
        },
      },
    ],
  },

  // Extended test timeout for E2E tests (longer due to browser automation)
  testTimeout: 120000,

  // Coverage configuration for E2E tests
  collectCoverage: false, // E2E tests focus on functional validation, not coverage
  coverageDirectory: "<rootDir>/coverage-workspace/e2e",

  // Coverage collection patterns for E2E testing (if needed)
  collectCoverageFrom: [
    "tests/e2e/**/*.{js,ts}",
    "!tests/e2e/**/*.d.ts",
    "!tests/e2e/**/*.{test,spec}.{js,ts}",
    "!tests/e2e/**/fixtures/**",
    "!tests/e2e/**/test-utils/**",
  ],

  // Coverage reporters
  coverageReporters: ["html", "lcov", "text", "text-summary"],

  // E2E test coverage thresholds (lower due to functional focus)
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },

  // Performance optimization for E2E tests
  maxWorkers: 1, // Single worker for E2E to avoid conflicts with browser instances
  cache: true,
  cacheDirectory: "<rootDir>/node_modules/.cache/jest-e2e",

  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Verbose output for debugging
  verbose: true,

  // Error handling
  errorOnDeprecated: false,
  bail: false, // Continue with other E2E tests even if one fails

  // Test sequence ordering for E2E tests
  testSequencer: "<rootDir>/scripts/e2e-test-sequencer.js",

  // E2E test reporting with screenshot and video capture
  reporters: [
    "default",
    [
      "jest-html-reporters",
      {
        publicPath: "<rootDir>/coverage-workspace/e2e/html-report",
        filename: "e2e-test-report.html",
        expand: true,
        hideIcon: false,
        pageTitle: "Bytebot E2E Test Report",
        reportTitle: "End-to-End Testing Results",
        inlineSource: true,
      },
    ],
    [
      "jest-junit",
      {
        outputDirectory: "<rootDir>/coverage-workspace/e2e",
        outputName: "e2e-junit.xml",
        suiteName: "Bytebot E2E Tests",
        classNameTemplate: "{packagename}.{classname}",
        titleTemplate: "E2E - {title}",
        ancestorSeparator: " › ",
        usePathForSuiteName: true,
      },
    ],
  ],

  // Watch mode configuration (typically disabled for E2E)
  watchman: false,
  watchPathIgnorePatterns: [
    "<rootDir>/node_modules/",
    "<rootDir>/packages/*/node_modules/",
    "<rootDir>/packages/*/dist/",
    "<rootDir>/coverage-workspace/",
    "<rootDir>/tests/e2e/screenshots/",
    "<rootDir>/tests/e2e/videos/",
  ],

  // Test path ignore patterns
  testPathIgnorePatterns: [
    "/node_modules/",
    "/dist/",
    "/coverage/",
    "/screenshots/",
    "/videos/",
  ],

  // Module paths to ignore
  modulePathIgnorePatterns: [
    "<rootDir>/packages/*/node_modules/",
    "<rootDir>/packages/*/dist/",
    "<rootDir>/tests/e2e/screenshots/",
    "<rootDir>/tests/e2e/videos/",
  ],

  // Transform ignore patterns
  transformIgnorePatterns: ["node_modules/(?!(.*\\.(mjs|jsx?|tsx?))$)"],

  // Environment variables for E2E tests
  testEnvironmentOptions: {
    NODE_ENV: "test",
    E2E_TEST: "true",
    LOG_LEVEL: "error",
    HEADLESS: "true", // Run browsers in headless mode by default
    BROWSER_TIMEOUT: "120000",
    PAGE_TIMEOUT: "30000",
    SCREENSHOT_ON_FAILURE: "true",
    VIDEO_RECORDING: "true",
  },

  // Notification settings
  notify: false,
  notifyMode: "failure-change",

  // Force exit configuration
  forceExit: true, // E2E tests often have browser processes that need cleanup
  detectOpenHandles: true,

  // Mock configuration
  automock: false,
  unmockedModulePathPatterns: ["<rootDir>/node_modules/"],

  // Extensions to find modules
  moduleDirectories: ["node_modules", "<rootDir>/packages", "<rootDir>/tests"],

  // Test result processor for E2E test analysis and artifact collection
  testResultsProcessor: "<rootDir>/scripts/e2e-results-processor.js",

  // Retry configuration for flaky E2E tests
  retry: {
    times: 2,
    condition: (err, numFailed) => {
      // Retry on network errors or browser crashes
      return (
        numFailed < 3 &&
        (err.message.includes("timeout") ||
          err.message.includes("disconnected") ||
          err.message.includes("net::ERR_"))
      );
    },
  },
};
