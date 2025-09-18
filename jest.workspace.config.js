/**
 * ===================================================================
 * BYTEBOT MONOREPO JEST WORKSPACE CONFIGURATION
 * Enterprise-Grade Multi-Package Test Orchestration System
 * ===================================================================
 *
 * COMPREHENSIVE TESTING INFRASTRUCTURE
 *
 * This critical configuration file orchestrates testing across the entire
 * Bytebot monorepo ecosystem, providing enterprise-grade test coordination,
 * coverage aggregation, and performance optimization for multi-package
 * development workflows.
 *
 * WORKSPACE ARCHITECTURE:
 * - Multi-Package Coordination: Unified testing across 4 core packages
 * - Environment Isolation: Package-specific test environments (Node.js, jsdom)
 * - Coverage Aggregation: Workspace-wide coverage reporting and thresholds
 * - Performance Optimization: Parallel execution with intelligent caching
 *
 * PACKAGE ECOSYSTEM:
 * 1. shared: Core shared library (85% coverage threshold - highest standard)
 * 2. bytebot-agent: Core agent functionality (70% coverage standard)
 * 3. bytebot-ui: React-based user interface (70% coverage, jsdom environment)
 * 4. bytebotd: Backend daemon service (75% coverage standard)
 *
 * ENTERPRISE FEATURES:
 * - Unified Coverage Thresholds: Package-specific quality standards
 * - Multi-Format Reporting: HTML, LCOV, JSON, JUnit for different stakeholders
 * - Performance Monitoring: Resource optimization and execution timing
 * - CI/CD Integration: Professional reporting for automated workflows
 *
 * TESTING ENVIRONMENT CONFIGURATION:
 * - Node.js Environment: Backend packages (shared, bytebot-agent, bytebotd)
 * - jsdom Environment: Frontend package (bytebot-ui) for DOM testing
 * - TypeScript Integration: Full ts-jest preset with proper configuration
 * - Module Resolution: Comprehensive path mapping and alias support
 *
 * COVERAGE ANALYSIS FEATURES:
 * - Global Coverage: 75% minimum across all packages
 * - Package-Specific Thresholds: Tailored standards per package type
 * - Comprehensive Metrics: Lines, branches, functions, statements analysis
 * - Exclusion Patterns: Intelligent filtering of non-testable code
 *
 * PERFORMANCE OPTIMIZATION:
 * - Worker Management: 50% CPU utilization for optimal parallel execution
 * - Intelligent Caching: Jest cache optimization for faster subsequent runs
 * - Watch Mode: Optimized file watching with ignore patterns
 * - Transform Optimization: Efficient TypeScript and asset processing
 *
 * CI/CD INTEGRATION:
 * - JUnit XML: Standardized test result format for CI systems
 * - HTML Reports: Visual dashboards for stakeholder review
 * - JSON Coverage: Machine-readable coverage data for trending analysis
 * - Professional Notifications: Configurable alert systems
 *
 * @author Claude Code (DevOps & Test Infrastructure Specialist)
 * @version 2.0.0
 * @created 2025-09-06
 * @lastModified 2025-09-10
 * @classification Enterprise Infrastructure
 */

const path = require("path");

module.exports = {
  /**
   * WORKSPACE IDENTIFICATION
   * Visual branding for Jest workspace in multi-project environments
   */
  displayName: {
    name: "Bytebot Workspace", // Human-readable workspace identifier
    color: "cyan", // Terminal color for visual distinction
  },

  /**
   * ROOT DIRECTORY CONFIGURATION
   * Establishes the base directory for all relative path resolution
   */
  rootDir: ".", // Current directory as workspace root

  /**
   * ===================================================================
   * MULTI-PACKAGE PROJECT CONFIGURATION
   * Enterprise-grade package coordination with individual configurations
   * ===================================================================
   *
   * Each package operates as an independent Jest project with:
   * - Dedicated test environment (Node.js or jsdom)
   * - Package-specific coverage thresholds and collection rules
   * - Custom module resolution and path mapping
   * - Tailored setup files and test patterns
   */
  projects: [
    {
      displayName: { name: "Shared", color: "yellow" },
      rootDir: "<rootDir>/packages/shared",
      testEnvironment: "node",
      preset: "ts-jest",
      testMatch: ["<rootDir>/src/**/*.{test,spec}.{js,ts}"],
      collectCoverageFrom: [
        "<rootDir>/src/**/*.ts",
        "!<rootDir>/src/**/*.d.ts",
      ],
      coverageDirectory: "<rootDir>/../../coverage-workspace/shared",
      setupFilesAfterEnv: ["<rootDir>/src/test-utils/setupAfterEnv.ts"],
      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
      },
    },
    {
      displayName: { name: "Bytebot-Agent", color: "green" },
      rootDir: "<rootDir>/packages/bytebot-agent",
      testEnvironment: "node",
      preset: "ts-jest",
      testMatch: ["<rootDir>/src/**/*.{test,spec}.{js,ts}"],
      collectCoverageFrom: [
        "<rootDir>/src/**/*.ts",
        "!<rootDir>/src/**/*.d.ts",
      ],
      coverageDirectory: "<rootDir>/../../coverage-workspace/bytebot-agent",
      setupFilesAfterEnv: ["<rootDir>/test/setupAfterEnv.ts"],
      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
        "^@bytebot/shared$": "<rootDir>/../shared/src",
        "^@bytebot/shared/(.*)$": "<rootDir>/../shared/src/$1",
      },
    },
    {
      displayName: { name: "Bytebot-UI", color: "magenta" },
      rootDir: "<rootDir>/packages/bytebot-ui",
      testEnvironment: "jsdom",
      preset: "ts-jest",
      testMatch: ["<rootDir>/src/**/*.{test,spec}.{js,jsx,ts,tsx}"],
      collectCoverageFrom: [
        "<rootDir>/src/**/*.{js,jsx,ts,tsx}",
        "!<rootDir>/src/**/*.d.ts",
        "!<rootDir>/src/pages/_app.tsx",
        "!<rootDir>/src/pages/_document.tsx",
      ],
      coverageDirectory: "<rootDir>/../../coverage-workspace/bytebot-ui",
      setupFilesAfterEnv: ["<rootDir>/src/test-utils/setupAfterEnv.ts"],
      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
        "^@components/(.*)$": "<rootDir>/src/components/$1",
        "^@utils/(.*)$": "<rootDir>/src/utils/$1",
        "^@hooks/(.*)$": "<rootDir>/src/hooks/$1",
        "^@types/(.*)$": "<rootDir>/src/types/$1",
        "^@bytebot/shared$": "<rootDir>/../shared/src",
        "^@bytebot/shared/(.*)$": "<rootDir>/../shared/src/$1",
        "\\\\.(css|less|scss|sass)$": "identity-obj-proxy",
        "\\\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$":
          "<rootDir>/src/test-utils/__mocks__/fileMock.js",
      },
      transform: {
        "^.+\\\\.(js|jsx|ts|tsx)$": [
          "ts-jest",
          {
            useESM: true,
            tsconfig: "<rootDir>/tsconfig.json",
          },
        ],
      },
    },
    {
      displayName: { name: "BytebotD", color: "blue" },
      rootDir: "<rootDir>/packages/bytebotd",
      testEnvironment: "node",
      preset: "ts-jest",
      testMatch: ["<rootDir>/src/**/*.{test,spec}.{js,ts}"],
      collectCoverageFrom: [
        "<rootDir>/src/**/*.ts",
        "!<rootDir>/src/**/*.d.ts",
        "!<rootDir>/src/main.ts",
      ],
      coverageDirectory: "<rootDir>/../../coverage-workspace/bytebotd",
      setupFilesAfterEnv: ["<rootDir>/src/test-utils/setupAfterEnv.ts"],
      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
        "^@bytebot/shared$": "<rootDir>/../shared/src",
        "^@bytebot/shared/(.*)$": "<rootDir>/../shared/src/$1",
      },
    },
  ],

  /**
   * ===================================================================
   * WORKSPACE-LEVEL COVERAGE CONFIGURATION
   * Aggregated coverage collection and reporting coordination
   * ===================================================================
   */

  /**
   * COVERAGE COLLECTION CONTROL
   * Disabled by default to prevent unnecessary overhead during development.
   * Enable explicitly via CLI: --coverage or --collectCoverage
   */
  collectCoverage: false, // Performance optimization - collect only when needed

  /**
   * CENTRALIZED COVERAGE DIRECTORY
   * All package coverage reports aggregate into this workspace directory
   */
  coverageDirectory: "<rootDir>/coverage-workspace", // Unified coverage artifacts location

  /**
   * COMPREHENSIVE COVERAGE COLLECTION PATTERNS
   * Defines which files across all packages should be included in coverage analysis
   */
  collectCoverageFrom: [
    "packages/*/src/**/*.{js,jsx,ts,tsx}",
    "!packages/*/src/**/*.d.ts",
    "!packages/*/src/**/*.{test,spec}.{js,jsx,ts,tsx}",
    "!packages/*/src/**/__tests__/**",
    "!packages/*/src/test-utils/**",
    "!packages/bytebot-agent/src/main.ts",
    "!packages/bytebotd/src/main.ts",
    "!packages/bytebot-ui/src/pages/_app.tsx",
    "!packages/bytebot-ui/src/pages/_document.tsx",
  ],

  /**
   * MULTI-FORMAT COVERAGE REPORTING
   * Comprehensive reporting suite for different stakeholders and use cases
   */
  coverageReporters: [
    "html",         // Interactive web dashboard for developers
    "lcov",         // Standard format for CI/CD and external tools
    "text",         // Console output for immediate feedback
    "text-summary", // Concise summary for quick assessment
    "json",         // Machine-readable data for automation
    "clover"        // XML format for legacy tool integration
  ],

  /**
   * ===================================================================
   * ENTERPRISE COVERAGE THRESHOLDS
   * Package-specific quality gates with graduated standards
   * ===================================================================
   *
   * THRESHOLD STRATEGY:
   * - shared: 85% (highest standard for reusable components)
   * - bytebotd: 75% (robust backend service standard)
   * - bytebot-agent/ui: 70% (development flexibility for evolving features)
   * - global: 75% (overall project quality baseline)
   */
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75,
    },
    // Package-specific thresholds
    "packages/shared/": {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    "packages/bytebot-agent/": {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
    "packages/bytebot-ui/": {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
    "packages/bytebotd/": {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75,
    },
  },

  /**
   * ===================================================================
   * PERFORMANCE AND EXECUTION OPTIMIZATION
   * Enterprise-grade performance tuning for large-scale test suites
   * ===================================================================
   */

  /**
   * TEST EXECUTION TIMEOUT
   * Maximum time allowed for individual test execution (30 seconds)
   * Prevents hanging tests from blocking CI/CD pipelines
   */
  testTimeout: 30000, // 30 seconds - enterprise timeout standard

  /**
   * PARALLEL EXECUTION OPTIMIZATION
   * Utilizes 50% of available CPU cores for optimal resource balance
   * between test speed and system responsiveness
   */
  maxWorkers: "50%", // Optimal performance/resource balance

  /**
   * INTELLIGENT CACHING SYSTEM
   * Enables Jest's built-in caching for faster subsequent test runs
   */
  cache: true, // Performance optimization enabled
  cacheDirectory: "<rootDir>/node_modules/.cache/jest-workspace", // Dedicated cache location

  /**
   * MOCK STATE MANAGEMENT
   * Ensures clean test isolation by resetting all mock states between tests
   * Prevents test interdependence and ensures reliable results
   */
  clearMocks: true,   // Clear call history between tests
  resetMocks: true,   // Reset mock implementations between tests
  restoreMocks: true, // Restore original implementations between tests

  /**
   * DEBUGGING AND DEVELOPMENT CONFIGURATION
   * Enhanced visibility and error handling for development workflows
   */
  verbose: true, // Detailed test execution output for debugging

  /**
   * ENTERPRISE ERROR HANDLING STRATEGY
   * Balanced approach between strict standards and practical development needs
   */
  errorOnDeprecated: false, // Allow deprecated APIs during migration periods
  bail: false, // Continue testing after failures for complete analysis

  // PRODUCTION-READY REPORTING
  reporters: [
    "default",
    [
      "jest-html-reporters",
      {
        publicPath: "<rootDir>/coverage-workspace/html-report",
        filename: "workspace-test-report.html",
        expand: true,
        hideIcon: false,
        pageTitle: "Bytebot Workspace Test Report",
        reportTitle: "Comprehensive Test Results - All Packages",
      },
    ],
    [
      "jest-junit",
      {
        outputDirectory: "<rootDir>/coverage-workspace",
        outputName: "workspace-junit.xml",
        suiteName: "Bytebot Workspace Tests",
        classNameTemplate: "{packagename}.{classname}",
        titleTemplate: "{packagename} - {title}",
        ancestorSeparator: " › ",
        usePathForSuiteName: true,
      },
    ],
  ],

  // Watch mode configuration
  watchman: true,
  watchPathIgnorePatterns: [
    "<rootDir>/node_modules/",
    "<rootDir>/packages/*/node_modules/",
    "<rootDir>/packages/*/dist/",
    "<rootDir>/packages/*/coverage/",
    "<rootDir>/coverage-workspace/",
  ],

  // Test path ignore patterns
  testPathIgnorePatterns: [
    "/node_modules/",
    "/dist/",
    "/coverage/",
    "/coverage-workspace/",
  ],

  // Module paths to ignore
  modulePathIgnorePatterns: [
    "<rootDir>/packages/*/node_modules/",
    "<rootDir>/packages/*/dist/",
    "<rootDir>/packages/*/coverage/",
  ],

  // Transform ignore patterns
  transformIgnorePatterns: ["node_modules/(?!(.*\\\\.(mjs|jsx?|tsx?))$)"],

  // Global setup and teardown
  globalSetup: "<rootDir>/scripts/jest-global-setup.js",
  globalTeardown: "<rootDir>/scripts/jest-global-teardown.js",

  // Environment variables for workspace tests
  testEnvironmentOptions: {
    NODE_ENV: "test",
  },

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

  // Extensions to find modules
  moduleDirectories: ["node_modules"],

  // Test result processor for custom analysis
  testResultsProcessor: "<rootDir>/scripts/test-results-processor.js",
};
