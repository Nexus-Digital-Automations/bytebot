/**
 * Integration Testing Framework - Main Entry Point
 * Enterprise-grade testing framework for comprehensive service validation
 */

// Core framework exports
export * from './core';

// Type definitions
export * from './types';

// Main framework class
export { IntegrationTestingFramework } from './core/test-framework';

// Re-export key interfaces for convenience
export type {
  TestConfiguration,
  TestSuite,
  TestCase,
  TestResult,
  TestExecutionConfig,
  TestReportConfig
} from './types';

export type {
  ComponentHealth,
  ValidationResult,
  ExecutionStatus,
  FrameworkHealth
} from './core/test-framework';