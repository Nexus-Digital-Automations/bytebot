/**
 * Jest Configuration for Bytebot-UI Package
 *
 * Enterprise-grade Jest configuration optimized for:
 * - Next.js React applications with TypeScript
 * - React Testing Library integration
 * - UI component testing with user interactions
 * - Socket.io client testing
 * - Tailwind CSS styling validation
 * - Frontend performance monitoring
 *
 * @author Claude Code (Based on BytebotD Gold Standard)
 * @version 2.0.0
 */

const nextJest = require("next/jest");

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: "./",
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  // Display name for the test suite
  displayName: {
    name: "Bytebot-UI",
    color: "magenta",
  },

  // Test environment for React components (defined below with options)

  // Setup files and configuration
  setupFilesAfterEnv: ["<rootDir>/src/test-utils/setupAfterEnv.ts"],
  setupFiles: ["<rootDir>/src/test-utils/simple-setup.ts"],

  // Module file extensions
  moduleFileExtensions: ["js", "jsx", "json", "ts", "tsx"],

  // Enhanced test file patterns
  testRegex: [
    ".*\\.(test|spec)\\.(js|jsx|ts|tsx)$",
    ".*(/__tests__/.*|(\\.|/)(test|spec))\\.(js|jsx|ts|tsx)$",
  ],

  // Transform configuration is handled by Next.js

  // Module name mapping for path resolution and static assets
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@src/(.*)$": "<rootDir>/src/$1",
    "^@components/(.*)$": "<rootDir>/src/components/$1",
    "^@utils/(.*)$": "<rootDir>/src/utils/$1",
    "^@hooks/(.*)$": "<rootDir>/src/hooks/$1",
    "^@types/(.*)$": "<rootDir>/src/types/$1",
    "^@bytebot/shared$": "<rootDir>/../shared/src",
    "^@bytebot/shared/(.*)$": "<rootDir>/../shared/src/$1",
    // Next.js component mocks
    "^next/image$": "<rootDir>/src/test-utils/__mocks__/next-image.js",
    "^next/link$": "<rootDir>/src/test-utils/__mocks__/next-link.js",
    "^next/router$": "<rootDir>/src/test-utils/mocks/next-router.ts",
    // Handle static imports
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
    "\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$":
      "<rootDir>/src/test-utils/__mocks__/fileMock.js",
  },

  // Test timeout (increased for UI interactions)
  testTimeout: 30000,

  // Coverage configuration
  collectCoverage: false, // Only collect when explicitly requested
  coverageDirectory: "../coverage",

  // Coverage collection patterns
  collectCoverageFrom: [
    "src/**/*.(t|j)s?(x)",
    "!src/**/*.d.ts",
    "!src/**/*.spec.(t|j)s?(x)",
    "!src/**/*.test.(t|j)s?(x)",
    "!src/**/__tests__/**",
    "!src/test-utils/**",
    "!src/pages/_app.tsx",
    "!src/pages/_document.tsx",
  ],

  // Coverage reporters
  coverageReporters: ["html", "lcov", "text", "text-summary", "json", "clover"],

  // ENTERPRISE COVERAGE THRESHOLDS - UI-specific modules
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
    // Higher thresholds for critical UI modules
    "./src/components/": {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75,
    },
    "./src/hooks/": {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    "./src/utils/": {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },

  // Ignore patterns for coverage
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/dist/",
    "/coverage/",
    "/src/test-utils/",
    "\\.d\\.ts$",
    "/public/",
    "/.next/",
  ],

  // Module paths to ignore
  modulePathIgnorePatterns: [
    "<rootDir>/dist/",
    "<rootDir>/node_modules/",
    "<rootDir>/coverage/",
    "<rootDir>/.next/",
  ],

  // Transform ignore patterns
  transformIgnorePatterns: [
    "/node_modules/(?!(.*\\.(mjs|jsx?|tsx?))$)",
    "^.+\\.module\\.(css|sass|scss)$",
  ],

  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Verbose output for debugging
  verbose: true,

  // Error handling and debugging
  errorOnDeprecated: false,
  bail: false,

  // PERFORMANCE OPTIMIZATION
  maxWorkers: "50%",
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
        pageTitle: "Bytebot-UI Test Report",
      },
    ],
    [
      "jest-junit",
      {
        outputDirectory: "<rootDir>/coverage",
        outputName: "junit.xml",
        suiteName: "Bytebot-UI Tests",
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
    "<rootDir>/.next/",
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
  testEnvironment: "jsdom",
  testEnvironmentOptions: {
    url: "http://localhost:3000",
  },

  // Test location patterns
  testPathIgnorePatterns: ["/node_modules/", "/dist/", "/coverage/", "/.next/"],

  // Extensions to find modules
  moduleDirectories: ["node_modules", "<rootDir>/src"],
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);
