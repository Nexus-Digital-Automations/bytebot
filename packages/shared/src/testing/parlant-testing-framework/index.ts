/**
 * PARLANT Comprehensive Automated Testing Framework
 *
 * Enterprise-grade testing framework for PARLANT database function wrapping system
 * targeting 95%+ code coverage with sub-1000ms performance validation.
 *
 * Features:
 * - Automated test generation for 1,520+ database functions
 * - Parallel test execution for high-volume testing
 * - Performance benchmarking and regression detection
 * - Security vulnerability scanning integration
 * - Comprehensive coverage reporting and analytics
 *
 * @fileoverview Main export index for PARLANT testing framework
 * @version 1.0.0
 * @author PARLANT Testing Framework Agent
 * @created 2025-09-20
 */

// Core Testing Framework Components
export * from './core/test-framework-engine';
export * from './core/test-executor';
export * from './core/parallel-execution-manager';
export * from './core/test-result-aggregator';

// Test Generation Systems
export * from './generators/automated-test-generator';
export * from './generators/unit-test-generator';
export * from './generators/integration-test-generator';
export * from './generators/performance-test-generator';
export * from './generators/security-test-generator';

// Testing Utilities
export * from './utils/mock-database-factory';
export * from './utils/test-data-generator';
export * from './utils/assertion-helpers';
export * from './utils/performance-measurement';

// Performance and Security Testing
export * from './performance/performance-testing-suite';
export * from './performance/load-testing-engine';
export * from './performance/benchmark-manager';
export * from './security/security-testing-framework';
export * from './security/vulnerability-scanner';

// Coverage and Reporting
export * from './coverage/coverage-analyzer';
export * from './coverage/coverage-reporting-dashboard';
export * from './coverage/coverage-export-integration';
export * from './coverage/coverage-reporter';
export * from './coverage/regression-detector';

// Regression Testing
export * from './regression/regression-testing-engine';

// Integration and Automation
export * from './automation/ci-cd-integration';
export * from './automation/test-automation-scripts';
export * from './automation/continuous-testing-manager';

// Types and Interfaces
export * from './types/test-framework.types';
export * from './types/test-execution.types';
export * from './types/performance-testing.types';
export * from './types/security-testing.types';
export * from './types/coverage-reporting.types';
export * from './types/regression-testing.types';

/**
 * Framework Version and Metadata
 */
export const PARLANT_TESTING_FRAMEWORK_VERSION = '1.0.0';
export const FRAMEWORK_NAME = 'PARLANT Comprehensive Testing Framework';

/**
 * Framework Capabilities
 */
export const TESTING_FRAMEWORK_CAPABILITIES = {
  // Core Testing
  unitTesting: true,
  integrationTesting: true,
  performanceTesting: true,
  securityTesting: true,
  regressionTesting: true,

  // Automation
  automatedTestGeneration: true,
  parallelExecution: true,
  continuousTesting: true,
  ciCdIntegration: true,

  // Analytics
  coverageReporting: true,
  performanceBenchmarking: true,
  regressionDetection: true,
  securityScanning: true,

  // Targets
  targetCoverage: 95,
  maxResponseTime: 1000, // milliseconds
  supportedFunctions: 1520,
  parallelWorkers: 10
} as const;

/**
 * Default Framework Configuration
 */
export const DEFAULT_TESTING_CONFIG = {
  coverage: {
    target: 95,
    threshold: {
      global: {
        branches: 95,
        functions: 95,
        lines: 95,
        statements: 95
      }
    }
  },
  performance: {
    maxResponseTime: 1000,
    loadTestConcurrency: 100,
    benchmarkIterations: 1000
  },
  parallel: {
    maxWorkers: 10,
    batchSize: 50,
    timeout: 30000
  },
  security: {
    vulnerabilityScanning: true,
    authenticationTesting: true,
    authorizationTesting: true,
    dataProtectionTesting: true
  }
} as const;

/**
 * Quick Start Testing Factory
 */
export class ParlantTestingFrameworkFactory {
  /**
   * Create complete testing suite for PARLANT database functions
   */
  static createComprehensiveTestSuite(config?: Partial<typeof DEFAULT_TESTING_CONFIG>) {
    // Implementation will be in core/test-framework-engine
    throw new Error('Implementation pending - to be implemented in core framework');
  }

  /**
   * Create unit testing suite for specific function category
   */
  static createUnitTestSuite(category: string, functions: string[]) {
    // Implementation will be in generators/unit-test-generator
    throw new Error('Implementation pending - to be implemented in unit test generator');
  }

  /**
   * Create performance testing suite with sub-1000ms validation
   */
  static createPerformanceTestSuite(functions: string[], targetMs: number = 1000) {
    // Implementation will be in performance/performance-testing-suite
    throw new Error('Implementation pending - to be implemented in performance suite');
  }

  /**
   * Create security testing suite for authentication and authorization
   */
  static createSecurityTestSuite(functions: string[]) {
    // Implementation will be in security/security-testing-framework
    throw new Error('Implementation pending - to be implemented in security framework');
  }
}

/**
 * Framework Constants
 */
export const TESTING_CONSTANTS = {
  // Performance Thresholds
  MAX_RESPONSE_TIME_MS: 1000,
  MAX_LOAD_TEST_DURATION_MS: 60000,
  MAX_PARALLEL_WORKERS: 10,

  // Coverage Requirements
  MIN_COVERAGE_PERCENTAGE: 95,
  MIN_BRANCH_COVERAGE: 95,
  MIN_FUNCTION_COVERAGE: 95,
  MIN_LINE_COVERAGE: 95,

  // Test Execution
  DEFAULT_TEST_TIMEOUT: 30000,
  DEFAULT_BATCH_SIZE: 50,
  MAX_RETRY_ATTEMPTS: 3,

  // Security Testing
  VULNERABILITY_SCAN_TIMEOUT: 120000,
  AUTH_TEST_TIMEOUT: 10000,
  DATA_PROTECTION_TIMEOUT: 15000,

  // Database Testing
  MOCK_DB_RESPONSE_TIME: 10,
  MAX_MOCK_CONNECTIONS: 100,
  TEST_DATA_CLEANUP_TIMEOUT: 5000
} as const;

/**
 * Framework Error Classes
 */
export class TestingFrameworkError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly category: 'SETUP' | 'EXECUTION' | 'VALIDATION' | 'PERFORMANCE' | 'SECURITY',
    public readonly metadata: Record<string, any> = {}
  ) {
    super(message);
    this.name = 'TestingFrameworkError';
  }
}

export class TestExecutionError extends TestingFrameworkError {
  constructor(message: string, metadata: Record<string, any> = {}) {
    super(message, 'TEST_EXECUTION_ERROR', 'EXECUTION', metadata);
    this.name = 'TestExecutionError';
  }
}

export class PerformanceTestError extends TestingFrameworkError {
  constructor(message: string, metadata: Record<string, any> = {}) {
    super(message, 'PERFORMANCE_TEST_ERROR', 'PERFORMANCE', metadata);
    this.name = 'PerformanceTestError';
  }
}

export class SecurityTestError extends TestingFrameworkError {
  constructor(message: string, metadata: Record<string, any> = {}) {
    super(message, 'SECURITY_TEST_ERROR', 'SECURITY', metadata);
    this.name = 'SecurityTestError';
  }
}

/**
 * Framework Metadata
 */
export const FRAMEWORK_METADATA = {
  name: FRAMEWORK_NAME,
  version: PARLANT_TESTING_FRAMEWORK_VERSION,
  description: 'Comprehensive automated testing framework for PARLANT database function wrapping system',
  author: 'PARLANT Testing Framework Agent',
  license: 'Enterprise',

  compatibility: {
    node: '>=18.0.0',
    typescript: '>=4.5.0',
    jest: '>=29.0.0',
    nestjs: '>=8.0.0'
  },

  features: [
    'Automated test generation for 1,520+ database functions',
    'Parallel test execution with up to 10 concurrent workers',
    'Sub-1000ms performance validation and load testing',
    'Comprehensive security testing and vulnerability scanning',
    '95%+ code coverage reporting and analysis',
    'Regression detection and performance benchmarking',
    'CI/CD integration and continuous testing automation',
    'Mock database factory with realistic interaction simulation'
  ],

  testCategories: [
    'Unit Testing - Individual function wrapper validation',
    'Integration Testing - End-to-end PARLANT-AIgent flows',
    'Performance Testing - Response time and load validation',
    'Security Testing - Authentication, authorization, data protection',
    'Regression Testing - Automated testing for all functions',
    'Load Testing - High-volume concurrent execution testing'
  ]
} as const;

// Default export for convenience
export default {
  // Core classes
  ParlantTestingFrameworkFactory,

  // Constants
  PARLANT_TESTING_FRAMEWORK_VERSION,
  TESTING_FRAMEWORK_CAPABILITIES,
  DEFAULT_TESTING_CONFIG,
  TESTING_CONSTANTS,
  FRAMEWORK_METADATA,

  // Error classes
  TestingFrameworkError,
  TestExecutionError,
  PerformanceTestError,
  SecurityTestError
};