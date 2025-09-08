/**
 * Jest Configuration for Shared Package
 *
 * Enterprise-grade Jest configuration optimized for:
 * - Shared utilities and types validation
 * - Cross-package compatibility testing
 * - Security utility testing
 * - Validation pipeline testing
 * - TypeScript strict mode compilation
 *
 * @author Claude Code (Based on BytebotD Gold Standard)
 * @version 2.0.0
 */

module.exports = {
  // Display name for the test suite
  displayName: {
    name: "Shared",
    color: "yellow",
  },

  // Test environment
  testEnvironment: "node",

  // Preset for TypeScript support
  preset: "ts-jest",

  // Root directory for tests
  rootDir: ".",
  roots: ["<rootDir>/src"],

  // Module file extensions
  moduleFileExtensions: ["js", "json", "ts", "tsx"],

  // Enhanced test file patterns
  testRegex: [
    ".*\\.spec\\.ts$",
    ".*\\.test\\.ts$",
    ".*(/__tests__/.*|(\\.|/)(test|spec))\\.(js|ts)$",
  ],

  // FIXED: Transform configuration (resolves .js file compilation warnings)
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        // TypeScript compilation options
        tsconfig: "./tsconfig.json",
        // Enable diagnostics for better error reporting
        diagnostics: {
          warnOnly: true,
        },
      },
    ],
  },

  // Module name mapping for path resolution
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@src/(.*)$": "<rootDir>/src/$1",
  },

  // Setup files and configuration
  setupFiles: ["<rootDir>/src/test-utils/simple-setup.ts"],
  setupFilesAfterEnv: ["<rootDir>/src/test-utils/setupAfterEnv.ts"],

  // Test timeout (30 seconds for integration tests)
  testTimeout: 30000,

  // Coverage configuration
  collectCoverage: false, // Only collect when explicitly requested
  coverageDirectory: "../coverage",

  // Coverage collection patterns
  collectCoverageFrom: [
    "src/**/*.(t|j)s",
    "!src/**/*.d.ts",
    "!src/**/*.interface.ts",
    "!src/**/*.spec.ts",
    "!src/**/*.test.ts",
    "!src/**/__tests__/**",
    "!src/test-utils/**",
    "!src/index.ts", // Main export file
  ],

  // Coverage reporters
  coverageReporters: ["html", "lcov", "text", "text-summary", "json", "clover"],

  // ENTERPRISE COVERAGE THRESHOLDS - Shared utilities (highest standards)
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    // Higher thresholds for critical shared modules
    "./src/security/": {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95,
    },
    "./src/utils/": {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    "./src/validation/": {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95,
    },
  },

  // Ignore patterns for coverage
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/dist/",
    "/coverage/",
    "/src/test-utils/",
    "\\.d\\.ts$",
  ],

  // Module paths to ignore
  modulePathIgnorePatterns: [
    "<rootDir>/dist/",
    "<rootDir>/node_modules/",
    "<rootDir>/coverage/",
  ],

  // FIXED: Transform ignore patterns (prevents .js file compilation warnings)
  transformIgnorePatterns: ["node_modules/(?!(.*\\.(mjs|jsx?|tsx?))$)"],

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
  maxWorkers: "50%", // Optimal CPU utilization
  cache: true,
  cacheDirectory: "<rootDir>/node_modules/.cache/jest",

  // PRODUCTION-READY REPORTING
  reporters: [
    "default",
    [
      "jest-html-reporters",
      {
        publicPath: "<rootDir>/coverage/html-report",
        filename: "test-report.html",
        expand: true,
        hideIcon: false,
        pageTitle: "Shared Utilities Test Report",
      },
    ],
    [
      "jest-junit",
      {
        outputDirectory: "<rootDir>/coverage",
        outputName: "junit.xml",
        suiteName: "Shared Utilities Tests",
        classNameTemplate: "{classname}",
        titleTemplate: "{title}",
        ancestorSeparator: " › ",
        usePathForSuiteName: true,
      },
    ],
  ],

  // Watch mode configuration
  watchman: true,
  watchPathIgnorePatterns: [
    "<rootDir>/node_modules/",
    "<rootDir>/dist/",
    "<rootDir>/coverage/",
  ],

  // Notification settings
  notify: false,
  notifyMode: "failure-change",

  // Test execution order
  testSequencer: "@jest/test-sequencer",

  // Force exit after tests complete
  forceExit: false,
  detectOpenHandles: true,

  // Mock configuration
  automock: false,
  unmockedModulePathPatterns: ["<rootDir>/node_modules/"],

  // Environment variables for tests
  testEnvironmentOptions: {
    NODE_ENV: "test",
  },

  // Test location patterns
  testPathIgnorePatterns: ["/node_modules/", "/dist/", "/coverage/"],

  // Extensions to find modules
  moduleDirectories: ["node_modules", "<rootDir>/src"],
};
