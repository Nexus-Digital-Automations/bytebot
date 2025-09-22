/**
 * Comprehensive Security Integration Testing Framework
 *
 * Main entry point for the security integration testing framework that provides
 * end-to-end security validation, cross-service security testing, regression testing,
 * and comprehensive security test automation for PARLANT Bytebot middleware.
 *
 * @author Bytebot Security Team
 * @version 1.0.0
 */

export * from './e2e/security-e2e-framework';
export * from './integration/cross-service-security';
export * from './automation/security-test-automation';
export * from './regression/security-regression-suite';
export * from './performance/security-performance-testing';
export * from './data-management/security-test-data-manager';
export * from './environment/security-test-environment';
export * from './reporting/security-analytics-dashboard';
export * from './compliance/security-compliance-validator';
export * from './monitoring/security-monitoring-integration';

export * from './types/security-test-types';
export * from './config/security-test-config';
export * from './utils/security-test-utils';

// Core framework classes
export { SecurityIntegrationTestFramework } from './core/security-integration-framework';
export { SecurityTestOrchestrator } from './core/security-test-orchestrator';
export { SecurityValidationEngine } from './core/security-validation-engine';

// Test execution types
export {
  SecurityTestSuite,
  SecurityTestCase,
  SecurityTestResult,
  SecurityTestReport,
  SecurityValidationResult
} from './types/security-test-types';

// Configuration types
export {
  SecurityTestConfig,
  SecurityEnvironmentConfig,
  SecurityComplianceConfig
} from './config/security-test-config';

/**
 * Main Security Integration Testing Framework
 *
 * Provides comprehensive security testing capabilities including:
 * - End-to-end security validation
 * - Cross-service security testing
 * - Security regression testing
 * - Performance security testing
 * - Compliance validation
 * - Real-time monitoring integration
 */
export class SecurityTestingFramework {
  private framework: SecurityIntegrationTestFramework;
  private orchestrator: SecurityTestOrchestrator;
  private validator: SecurityValidationEngine;

  constructor(config?: Partial<SecurityTestConfig>) {
    this.framework = new SecurityIntegrationTestFramework(config);
    this.orchestrator = new SecurityTestOrchestrator(config);
    this.validator = new SecurityValidationEngine(config);
  }

  /**
   * Initialize the security testing framework
   */
  async initialize(): Promise<void> {
    await this.framework.initialize();
    await this.orchestrator.initialize();
    await this.validator.initialize();
  }

  /**
   * Run comprehensive security test suite
   */
  async runFullSecurityTestSuite(): Promise<SecurityTestReport> {
    return this.orchestrator.runFullTestSuite();
  }

  /**
   * Run specific security test category
   */
  async runSecurityTestCategory(category: string): Promise<SecurityTestReport> {
    return this.orchestrator.runTestCategory(category);
  }

  /**
   * Validate security compliance
   */
  async validateSecurityCompliance(): Promise<SecurityValidationResult> {
    return this.validator.validateCompliance();
  }

  /**
   * Generate comprehensive security report
   */
  async generateSecurityReport(): Promise<SecurityTestReport> {
    return this.framework.generateComprehensiveReport();
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await this.framework.cleanup();
    await this.orchestrator.cleanup();
    await this.validator.cleanup();
  }
}

// Default export
export default SecurityTestingFramework;