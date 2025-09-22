/**
 * PARLANT Quality Gates - Configuration System
 *
 * Comprehensive configuration system for PARLANT quality gates framework.
 * Provides default configurations, environment-specific settings, and
 * configuration validation for all quality gate types.
 *
 * @fileoverview Quality gates configuration system
 * @version 1.0.0
 * @author Quality Gates Framework Agent
 * @created 2025-09-20
 */

import {
  QualityGatePipelineConfig,
  QualityGateThresholds,
  RollbackConfiguration,
  ApprovalConfiguration,
  PipelineExecutionMode,
  RollbackStrategy,
  RollbackCondition,
  RecoveryStepType,
  NotificationChannel,
  ApproverType,
  ApprovalConditionType,
  QualityGatePriority,
  ThresholdOperator,
} from "../core/quality-gate-types";

import { PerformanceGateConfig } from "../gates/performance-gate";
import {
  SecurityGateConfig,
  ComplianceFramework,
  AuthMethodType,
  AuthStrengthLevel,
} from "../gates/security-gate";

/**
 * Environment Type Enumeration
 * Supported deployment environments
 */
export enum Environment {
  DEVELOPMENT = "development",
  STAGING = "staging",
  PRODUCTION = "production",
  TEST = "test",
}

/**
 * Quality Gates Framework Configuration
 * Master configuration for the entire quality gates framework
 */
export interface QualityGatesFrameworkConfig {
  /** Framework-wide settings */
  readonly framework: FrameworkConfig;

  /** Default pipeline configurations by environment */
  readonly pipelines: Record<Environment, QualityGatePipelineConfig>;

  /** Performance gate configurations */
  readonly performanceGates: Record<Environment, PerformanceGateConfig>;

  /** Security gate configurations */
  readonly securityGates: Record<Environment, SecurityGateConfig>;

  /** Coverage gate configurations */
  readonly coverageGates: Record<Environment, CoverageGateConfig>;

  /** Integrity gate configurations */
  readonly integrityGates: Record<Environment, IntegrityGateConfig>;

  /** Default threshold configurations */
  readonly thresholds: Record<Environment, QualityGateThresholds>;

  /** Rollback configurations by environment */
  readonly rollback: Record<Environment, RollbackConfiguration>;

  /** Approval configurations by environment */
  readonly approval: Record<Environment, ApprovalConfiguration>;
}

/**
 * Framework-wide Configuration
 * Global settings for the quality gates framework
 */
export interface FrameworkConfig {
  /** Framework version */
  readonly version: string;

  /** Default timeout for all operations */
  readonly defaultTimeout: number;

  /** Maximum concurrent gate executions */
  readonly maxConcurrentGates: number;

  /** Enable comprehensive logging */
  readonly enableLogging: boolean;

  /** Enable performance metrics collection */
  readonly enableMetrics: boolean;

  /** Enable audit trail */
  readonly enableAuditTrail: boolean;

  /** Default retry configuration */
  readonly defaultRetry: RetryConfig;

  /** Health check interval */
  readonly healthCheckInterval: number;

  /** Cleanup interval for old data */
  readonly cleanupInterval: number;
}

/**
 * Retry Configuration
 * Default retry settings for failed operations
 */
export interface RetryConfig {
  /** Maximum retry attempts */
  readonly maxAttempts: number;

  /** Base delay between retries */
  readonly baseDelay: number;

  /** Maximum delay between retries */
  readonly maxDelay: number;

  /** Backoff multiplier */
  readonly backoffMultiplier: number;

  /** Enable exponential backoff */
  readonly exponentialBackoff: boolean;
}

/**
 * Coverage Gate Configuration
 * Configuration for test coverage validation
 */
export interface CoverageGateConfig {
  /** Minimum test coverage percentage */
  readonly minTestCoverage: number;

  /** Minimum code coverage percentage */
  readonly minCodeCoverage: number;

  /** Minimum function coverage percentage */
  readonly minFunctionCoverage: number;

  /** Minimum branch coverage percentage */
  readonly minBranchCoverage: number;

  /** Minimum integration test coverage */
  readonly minIntegrationCoverage: number;

  /** Coverage analysis tools */
  readonly coverageTools: CoverageTool[];

  /** Exclude patterns from coverage */
  readonly excludePatterns: readonly string[];

  /** Coverage report formats */
  readonly reportFormats: readonly CoverageReportFormat[];

  /** Enable coverage trend analysis */
  readonly enableTrendAnalysis: boolean;

  /** Coverage baseline for comparison */
  readonly baseline?: CoverageBaseline;
}

/**
 * Coverage Tool Configuration
 * Configuration for coverage analysis tools
 */
export interface CoverageTool {
  /** Tool identifier */
  readonly id: string;

  /** Tool name */
  readonly name: string;

  /** Tool type */
  readonly type: CoverageToolType;

  /** Tool configuration */
  readonly config: Record<string, any>;

  /** Tool enabled */
  readonly enabled: boolean;

  /** Tool timeout */
  readonly timeout: number;
}

/**
 * Coverage Tool Type Enumeration
 * Types of coverage analysis tools
 */
export enum CoverageToolType {
  JEST = "jest",
  NYC = "nyc",
  ISTANBUL = "istanbul",
  COVERALLS = "coveralls",
  CODECOV = "codecov",
  SONARQUBE = "sonarqube",
}

/**
 * Coverage Report Format Enumeration
 * Supported coverage report formats
 */
export enum CoverageReportFormat {
  LCOV = "lcov",
  JSON = "json",
  HTML = "html",
  XML = "xml",
  TEXT = "text",
}

/**
 * Coverage Baseline
 * Baseline coverage metrics for comparison
 */
export interface CoverageBaseline {
  /** Baseline test coverage */
  readonly testCoverage: number;

  /** Baseline code coverage */
  readonly codeCoverage: number;

  /** Baseline function coverage */
  readonly functionCoverage: number;

  /** Baseline branch coverage */
  readonly branchCoverage: number;

  /** Baseline timestamp */
  readonly timestamp: Date;

  /** Baseline environment */
  readonly environment: string;
}

/**
 * Integrity Gate Configuration
 * Configuration for function wrapper integrity validation
 */
export interface IntegrityGateConfig {
  /** Enable signature validation */
  readonly enableSignatureValidation: boolean;

  /** Enable type validation */
  readonly enableTypeValidation: boolean;

  /** Enable behavior validation */
  readonly enableBehaviorValidation: boolean;

  /** Enable performance validation */
  readonly enablePerformanceValidation: boolean;

  /** Integrity check tools */
  readonly integrityTools: IntegrityTool[];

  /** Validation strictness level */
  readonly strictnessLevel: IntegrityStrictnessLevel;

  /** Maximum allowed deviation percentage */
  readonly maxDeviationPercentage: number;

  /** Integrity baseline for comparison */
  readonly baseline?: IntegrityBaseline;
}

/**
 * Integrity Tool Configuration
 * Configuration for integrity validation tools
 */
export interface IntegrityTool {
  /** Tool identifier */
  readonly id: string;

  /** Tool name */
  readonly name: string;

  /** Tool type */
  readonly type: IntegrityToolType;

  /** Tool configuration */
  readonly config: Record<string, any>;

  /** Tool enabled */
  readonly enabled: boolean;

  /** Tool timeout */
  readonly timeout: number;
}

/**
 * Integrity Tool Type Enumeration
 * Types of integrity validation tools
 */
export enum IntegrityToolType {
  SIGNATURE_VALIDATOR = "signature_validator",
  TYPE_CHECKER = "type_checker",
  BEHAVIOR_TESTER = "behavior_tester",
  PERFORMANCE_MONITOR = "performance_monitor",
  CUSTOM_VALIDATOR = "custom_validator",
}

/**
 * Integrity Strictness Level Enumeration
 * Levels of integrity validation strictness
 */
export enum IntegrityStrictnessLevel {
  LENIENT = "lenient",
  STANDARD = "standard",
  STRICT = "strict",
  PARANOID = "paranoid",
}

/**
 * Integrity Baseline
 * Baseline integrity metrics for comparison
 */
export interface IntegrityBaseline {
  /** Baseline signature validation score */
  readonly signatureScore: number;

  /** Baseline type validation score */
  readonly typeScore: number;

  /** Baseline behavior validation score */
  readonly behaviorScore: number;

  /** Baseline performance score */
  readonly performanceScore: number;

  /** Baseline timestamp */
  readonly timestamp: Date;

  /** Baseline environment */
  readonly environment: string;
}

/**
 * Default Quality Gates Configuration Factory
 * Creates default configurations for different environments
 */
export class DefaultQualityGatesConfigFactory {
  /**
   * Create complete framework configuration
   * @returns Default framework configuration
   */
  static createFrameworkConfig(): QualityGatesFrameworkConfig {
    return {
      framework: this.createFrameworkConfig(),
      pipelines: {
        [Environment.DEVELOPMENT]: this.createDevelopmentPipelineConfig(),
        [Environment.STAGING]: this.createStagingPipelineConfig(),
        [Environment.PRODUCTION]: this.createProductionPipelineConfig(),
        [Environment.TEST]: this.createTestPipelineConfig(),
      },
      performanceGates: {
        [Environment.DEVELOPMENT]: this.createDevelopmentPerformanceConfig(),
        [Environment.STAGING]: this.createStagingPerformanceConfig(),
        [Environment.PRODUCTION]: this.createProductionPerformanceConfig(),
        [Environment.TEST]: this.createTestPerformanceConfig(),
      },
      securityGates: {
        [Environment.DEVELOPMENT]: this.createDevelopmentSecurityConfig(),
        [Environment.STAGING]: this.createStagingSecurityConfig(),
        [Environment.PRODUCTION]: this.createProductionSecurityConfig(),
        [Environment.TEST]: this.createTestSecurityConfig(),
      },
      coverageGates: {
        [Environment.DEVELOPMENT]: this.createDevelopmentCoverageConfig(),
        [Environment.STAGING]: this.createStagingCoverageConfig(),
        [Environment.PRODUCTION]: this.createProductionCoverageConfig(),
        [Environment.TEST]: this.createTestCoverageConfig(),
      },
      integrityGates: {
        [Environment.DEVELOPMENT]: this.createDevelopmentIntegrityConfig(),
        [Environment.STAGING]: this.createStagingIntegrityConfig(),
        [Environment.PRODUCTION]: this.createProductionIntegrityConfig(),
        [Environment.TEST]: this.createTestIntegrityConfig(),
      },
      thresholds: {
        [Environment.DEVELOPMENT]: this.createDevelopmentThresholds(),
        [Environment.STAGING]: this.createStagingThresholds(),
        [Environment.PRODUCTION]: this.createProductionThresholds(),
        [Environment.TEST]: this.createTestThresholds(),
      },
      rollback: {
        [Environment.DEVELOPMENT]: this.createDevelopmentRollbackConfig(),
        [Environment.STAGING]: this.createStagingRollbackConfig(),
        [Environment.PRODUCTION]: this.createProductionRollbackConfig(),
        [Environment.TEST]: this.createTestRollbackConfig(),
      },
      approval: {
        [Environment.DEVELOPMENT]: this.createDevelopmentApprovalConfig(),
        [Environment.STAGING]: this.createStagingApprovalConfig(),
        [Environment.PRODUCTION]: this.createProductionApprovalConfig(),
        [Environment.TEST]: this.createTestApprovalConfig(),
      },
    };
  }

  /**
   * Create default framework configuration
   * @returns Framework configuration
   */
  private static createFrameworkConfig(): FrameworkConfig {
    return {
      version: "1.0.0",
      defaultTimeout: 300000, // 5 minutes
      maxConcurrentGates: 10,
      enableLogging: true,
      enableMetrics: true,
      enableAuditTrail: true,
      defaultRetry: {
        maxAttempts: 3,
        baseDelay: 1000,
        maxDelay: 30000,
        backoffMultiplier: 2,
        exponentialBackoff: true,
      },
      healthCheckInterval: 60000, // 1 minute
      cleanupInterval: 3600000, // 1 hour
    };
  }

  // Pipeline Configurations

  /**
   * Create development pipeline configuration
   * @returns Development pipeline configuration
   */
  private static createDevelopmentPipelineConfig(): QualityGatePipelineConfig {
    return {
      executionMode: PipelineExecutionMode.CONTINUE_ALL,
      continueOnFailure: true,
      failFast: false,
      timeout: 600000, // 10 minutes
      parallelExecution: true,
      maxParallelGates: 5,
      rollbackConfig: this.createDevelopmentRollbackConfig(),
      approvalConfig: this.createDevelopmentApprovalConfig(),
    };
  }

  /**
   * Create staging pipeline configuration
   * @returns Staging pipeline configuration
   */
  private static createStagingPipelineConfig(): QualityGatePipelineConfig {
    return {
      executionMode: PipelineExecutionMode.FAIL_FAST,
      continueOnFailure: false,
      failFast: true,
      timeout: 900000, // 15 minutes
      parallelExecution: true,
      maxParallelGates: 8,
      rollbackConfig: this.createStagingRollbackConfig(),
      approvalConfig: this.createStagingApprovalConfig(),
    };
  }

  /**
   * Create production pipeline configuration
   * @returns Production pipeline configuration
   */
  private static createProductionPipelineConfig(): QualityGatePipelineConfig {
    return {
      executionMode: PipelineExecutionMode.PRIORITY_BASED,
      continueOnFailure: false,
      failFast: true,
      timeout: 1800000, // 30 minutes
      parallelExecution: true,
      maxParallelGates: 10,
      rollbackConfig: this.createProductionRollbackConfig(),
      approvalConfig: this.createProductionApprovalConfig(),
    };
  }

  /**
   * Create test pipeline configuration
   * @returns Test pipeline configuration
   */
  private static createTestPipelineConfig(): QualityGatePipelineConfig {
    return {
      executionMode: PipelineExecutionMode.CONTINUE_ALL,
      continueOnFailure: true,
      failFast: false,
      timeout: 300000, // 5 minutes
      parallelExecution: true,
      maxParallelGates: 3,
      rollbackConfig: this.createTestRollbackConfig(),
      approvalConfig: this.createTestApprovalConfig(),
    };
  }

  // Performance Gate Configurations

  /**
   * Create development performance gate configuration
   * @returns Development performance configuration
   */
  private static createDevelopmentPerformanceConfig(): PerformanceGateConfig {
    return {
      timeout: 120000,
      retryAttempts: 2,
      retryDelay: 5000,
      parallelExecution: true,
      dependencies: [],
      customParams: {},
      environmentOverrides: {},
      responseTimeThreshold: 2000, // 2 seconds
      throughputThreshold: 50, // 50 ops/sec
      memoryThreshold: 512 * 1024 * 1024, // 512MB
      cpuThreshold: 80, // 80%
      errorRateThreshold: 5, // 5%
      resourceThresholds: {
        dbConnectionPoolThreshold: 70,
        networkBandwidthThreshold: 100 * 1024 * 1024, // 100MB/s
        diskIoThreshold: 1000,
        cacheHitRateThreshold: 70,
      },
      enableProfiling: true,
      profilingSampleRate: 0.1,
      monitoringWindow: 30000, // 30 seconds
    };
  }

  /**
   * Create staging performance gate configuration
   * @returns Staging performance configuration
   */
  private static createStagingPerformanceConfig(): PerformanceGateConfig {
    return {
      ...this.createDevelopmentPerformanceConfig(),
      responseTimeThreshold: 1500, // 1.5 seconds
      throughputThreshold: 100, // 100 ops/sec
      memoryThreshold: 256 * 1024 * 1024, // 256MB
      cpuThreshold: 70, // 70%
      errorRateThreshold: 3, // 3%
      resourceThresholds: {
        dbConnectionPoolThreshold: 60,
        networkBandwidthThreshold: 150 * 1024 * 1024, // 150MB/s
        diskIoThreshold: 800,
        cacheHitRateThreshold: 80,
      },
      profilingSampleRate: 0.2,
      monitoringWindow: 60000, // 1 minute
    };
  }

  /**
   * Create production performance gate configuration
   * @returns Production performance configuration
   */
  private static createProductionPerformanceConfig(): PerformanceGateConfig {
    return {
      ...this.createDevelopmentPerformanceConfig(),
      responseTimeThreshold: 1000, // 1 second - Critical requirement
      throughputThreshold: 200, // 200 ops/sec
      memoryThreshold: 128 * 1024 * 1024, // 128MB
      cpuThreshold: 60, // 60%
      errorRateThreshold: 1, // 1%
      resourceThresholds: {
        dbConnectionPoolThreshold: 50,
        networkBandwidthThreshold: 200 * 1024 * 1024, // 200MB/s
        diskIoThreshold: 500,
        cacheHitRateThreshold: 90,
      },
      profilingSampleRate: 0.5,
      monitoringWindow: 120000, // 2 minutes
    };
  }

  /**
   * Create test performance gate configuration
   * @returns Test performance configuration
   */
  private static createTestPerformanceConfig(): PerformanceGateConfig {
    return {
      ...this.createDevelopmentPerformanceConfig(),
      responseTimeThreshold: 5000, // 5 seconds
      throughputThreshold: 10, // 10 ops/sec
      memoryThreshold: 1024 * 1024 * 1024, // 1GB
      cpuThreshold: 90, // 90%
      errorRateThreshold: 10, // 10%
      enableProfiling: false,
      profilingSampleRate: 0.01,
      monitoringWindow: 15000, // 15 seconds
    };
  }

  // Security Gate Configurations

  /**
   * Create development security gate configuration
   * @returns Development security configuration
   */
  private static createDevelopmentSecurityConfig(): SecurityGateConfig {
    return {
      timeout: 180000,
      retryAttempts: 2,
      retryDelay: 5000,
      parallelExecution: true,
      dependencies: [],
      customParams: {},
      environmentOverrides: {},
      enableVulnerabilityScanning: true,
      enableAuthValidation: true,
      enableAuthzValidation: true,
      enableComplianceChecking: false,
      enableThreatDetection: true,
      maxCriticalVulnerabilities: 0,
      maxHighVulnerabilities: 5,
      minAuthSuccessRate: 90,
      maxAuthzViolations: 10,
      minComplianceScore: 70,
      maxThreatAlerts: 20,
      scanningTools: [
        {
          id: "eslint-security",
          name: "ESLint Security Rules",
          type: "static_analysis" as any,
          config: { rules: "security" },
          enabled: true,
          timeout: 60000,
        },
      ],
      complianceFrameworks: [],
      authMethods: [
        {
          id: "jwt-auth",
          type: AuthMethodType.JWT,
          config: { algorithm: "HS256" },
          strengthLevel: AuthStrengthLevel.MEDIUM,
          enabled: true,
        },
      ],
      authzPolicies: [],
      threatRules: [],
    };
  }

  /**
   * Create staging security gate configuration
   * @returns Staging security configuration
   */
  private static createStagingSecurityConfig(): SecurityGateConfig {
    return {
      ...this.createDevelopmentSecurityConfig(),
      enableComplianceChecking: true,
      maxCriticalVulnerabilities: 0,
      maxHighVulnerabilities: 2,
      minAuthSuccessRate: 95,
      maxAuthzViolations: 5,
      minComplianceScore: 80,
      maxThreatAlerts: 10,
      complianceFrameworks: [ComplianceFramework.SOC2],
      authMethods: [
        {
          id: "jwt-auth",
          type: AuthMethodType.JWT,
          config: { algorithm: "RS256" },
          strengthLevel: AuthStrengthLevel.HIGH,
          enabled: true,
        },
      ],
    };
  }

  /**
   * Create production security gate configuration
   * @returns Production security configuration
   */
  private static createProductionSecurityConfig(): SecurityGateConfig {
    return {
      ...this.createDevelopmentSecurityConfig(),
      enableComplianceChecking: true,
      maxCriticalVulnerabilities: 0, // Zero tolerance for critical vulnerabilities
      maxHighVulnerabilities: 0,
      minAuthSuccessRate: 99,
      maxAuthzViolations: 0,
      minComplianceScore: 95,
      maxThreatAlerts: 3,
      complianceFrameworks: [
        ComplianceFramework.SOC2,
        ComplianceFramework.ISO_27001,
        ComplianceFramework.GDPR,
      ],
      authMethods: [
        {
          id: "jwt-auth",
          type: AuthMethodType.JWT,
          config: { algorithm: "RS256" },
          strengthLevel: AuthStrengthLevel.CRITICAL,
          enabled: true,
        },
        {
          id: "oauth2-auth",
          type: AuthMethodType.OAUTH2,
          config: { provider: "enterprise" },
          strengthLevel: AuthStrengthLevel.CRITICAL,
          enabled: true,
        },
      ],
    };
  }

  /**
   * Create test security gate configuration
   * @returns Test security configuration
   */
  private static createTestSecurityConfig(): SecurityGateConfig {
    return {
      ...this.createDevelopmentSecurityConfig(),
      enableVulnerabilityScanning: false,
      enableComplianceChecking: false,
      enableThreatDetection: false,
      maxCriticalVulnerabilities: 100,
      maxHighVulnerabilities: 100,
      minAuthSuccessRate: 50,
      maxAuthzViolations: 100,
      maxThreatAlerts: 100,
      scanningTools: [],
    };
  }

  // Coverage Gate Configurations

  /**
   * Create development coverage gate configuration
   * @returns Development coverage configuration
   */
  private static createDevelopmentCoverageConfig(): CoverageGateConfig {
    return {
      minTestCoverage: 70,
      minCodeCoverage: 70,
      minFunctionCoverage: 70,
      minBranchCoverage: 60,
      minIntegrationCoverage: 50,
      coverageTools: [
        {
          id: "jest-coverage",
          name: "Jest Coverage",
          type: CoverageToolType.JEST,
          config: { collectCoverage: true },
          enabled: true,
          timeout: 120000,
        },
      ],
      excludePatterns: ["**/node_modules/**", "**/dist/**", "**/*.test.ts"],
      reportFormats: [CoverageReportFormat.LCOV, CoverageReportFormat.HTML],
      enableTrendAnalysis: true,
    };
  }

  /**
   * Create staging coverage gate configuration
   * @returns Staging coverage configuration
   */
  private static createStagingCoverageConfig(): CoverageGateConfig {
    return {
      ...this.createDevelopmentCoverageConfig(),
      minTestCoverage: 85,
      minCodeCoverage: 85,
      minFunctionCoverage: 85,
      minBranchCoverage: 75,
      minIntegrationCoverage: 70,
    };
  }

  /**
   * Create production coverage gate configuration
   * @returns Production coverage configuration
   */
  private static createProductionCoverageConfig(): CoverageGateConfig {
    return {
      ...this.createDevelopmentCoverageConfig(),
      minTestCoverage: 95, // 95%+ requirement
      minCodeCoverage: 95,
      minFunctionCoverage: 95,
      minBranchCoverage: 90,
      minIntegrationCoverage: 85,
      coverageTools: [
        {
          id: "jest-coverage",
          name: "Jest Coverage",
          type: CoverageToolType.JEST,
          config: { collectCoverage: true },
          enabled: true,
          timeout: 180000,
        },
        {
          id: "sonarqube",
          name: "SonarQube Analysis",
          type: CoverageToolType.SONARQUBE,
          config: { projectKey: "parlant-quality-gates" },
          enabled: true,
          timeout: 300000,
        },
      ],
    };
  }

  /**
   * Create test coverage gate configuration
   * @returns Test coverage configuration
   */
  private static createTestCoverageConfig(): CoverageGateConfig {
    return {
      ...this.createDevelopmentCoverageConfig(),
      minTestCoverage: 50,
      minCodeCoverage: 50,
      minFunctionCoverage: 50,
      minBranchCoverage: 40,
      minIntegrationCoverage: 30,
      enableTrendAnalysis: false,
    };
  }

  // Integrity Gate Configurations

  /**
   * Create development integrity gate configuration
   * @returns Development integrity configuration
   */
  private static createDevelopmentIntegrityConfig(): IntegrityGateConfig {
    return {
      enableSignatureValidation: true,
      enableTypeValidation: true,
      enableBehaviorValidation: true,
      enablePerformanceValidation: false,
      integrityTools: [
        {
          id: "typescript-checker",
          name: "TypeScript Type Checker",
          type: IntegrityToolType.TYPE_CHECKER,
          config: { strict: true },
          enabled: true,
          timeout: 60000,
        },
      ],
      strictnessLevel: IntegrityStrictnessLevel.STANDARD,
      maxDeviationPercentage: 10,
    };
  }

  /**
   * Create staging integrity gate configuration
   * @returns Staging integrity configuration
   */
  private static createStagingIntegrityConfig(): IntegrityGateConfig {
    return {
      ...this.createDevelopmentIntegrityConfig(),
      enablePerformanceValidation: true,
      strictnessLevel: IntegrityStrictnessLevel.STRICT,
      maxDeviationPercentage: 5,
    };
  }

  /**
   * Create production integrity gate configuration
   * @returns Production integrity configuration
   */
  private static createProductionIntegrityConfig(): IntegrityGateConfig {
    return {
      ...this.createDevelopmentIntegrityConfig(),
      enablePerformanceValidation: true,
      integrityTools: [
        {
          id: "typescript-checker",
          name: "TypeScript Type Checker",
          type: IntegrityToolType.TYPE_CHECKER,
          config: { strict: true },
          enabled: true,
          timeout: 120000,
        },
        {
          id: "signature-validator",
          name: "Function Signature Validator",
          type: IntegrityToolType.SIGNATURE_VALIDATOR,
          config: { enforceStrict: true },
          enabled: true,
          timeout: 60000,
        },
      ],
      strictnessLevel: IntegrityStrictnessLevel.PARANOID,
      maxDeviationPercentage: 2,
    };
  }

  /**
   * Create test integrity gate configuration
   * @returns Test integrity configuration
   */
  private static createTestIntegrityConfig(): IntegrityGateConfig {
    return {
      ...this.createDevelopmentIntegrityConfig(),
      enableBehaviorValidation: false,
      strictnessLevel: IntegrityStrictnessLevel.LENIENT,
      maxDeviationPercentage: 25,
    };
  }

  // Threshold Configurations

  /**
   * Create development thresholds
   * @returns Development thresholds
   */
  private static createDevelopmentThresholds(): QualityGateThresholds {
    return {
      critical: {
        metric: "overallScore",
        value: 70,
        operator: ThresholdOperator.GREATER_THAN_OR_EQUAL,
        unit: "percentage",
        description: "Minimum overall quality score",
      },
      warning: {
        metric: "warningCount",
        value: 10,
        operator: ThresholdOperator.LESS_THAN_OR_EQUAL,
        unit: "count",
        description: "Maximum warnings allowed",
      },
      success: {
        metric: "overallScore",
        value: 90,
        operator: ThresholdOperator.GREATER_THAN_OR_EQUAL,
        unit: "percentage",
        description: "Target quality score",
      },
      custom: {},
    };
  }

  /**
   * Create staging thresholds
   * @returns Staging thresholds
   */
  private static createStagingThresholds(): QualityGateThresholds {
    return {
      critical: {
        metric: "overallScore",
        value: 85,
        operator: ThresholdOperator.GREATER_THAN_OR_EQUAL,
        unit: "percentage",
        description: "Minimum overall quality score",
      },
      warning: {
        metric: "warningCount",
        value: 5,
        operator: ThresholdOperator.LESS_THAN_OR_EQUAL,
        unit: "count",
        description: "Maximum warnings allowed",
      },
      success: {
        metric: "overallScore",
        value: 95,
        operator: ThresholdOperator.GREATER_THAN_OR_EQUAL,
        unit: "percentage",
        description: "Target quality score",
      },
      custom: {},
    };
  }

  /**
   * Create production thresholds
   * @returns Production thresholds
   */
  private static createProductionThresholds(): QualityGateThresholds {
    return {
      critical: {
        metric: "overallScore",
        value: 95,
        operator: ThresholdOperator.GREATER_THAN_OR_EQUAL,
        unit: "percentage",
        description: "Minimum overall quality score",
      },
      warning: {
        metric: "warningCount",
        value: 0,
        operator: ThresholdOperator.EQUALS,
        unit: "count",
        description: "Zero warnings required",
      },
      success: {
        metric: "overallScore",
        value: 99,
        operator: ThresholdOperator.GREATER_THAN_OR_EQUAL,
        unit: "percentage",
        description: "Target quality score",
      },
      custom: {
        responseTime: {
          metric: "responseTime",
          value: 1000,
          operator: ThresholdOperator.LESS_THAN_OR_EQUAL,
          unit: "milliseconds",
          description: "Sub-1000ms response time requirement",
        },
      },
    };
  }

  /**
   * Create test thresholds
   * @returns Test thresholds
   */
  private static createTestThresholds(): QualityGateThresholds {
    return {
      critical: {
        metric: "overallScore",
        value: 50,
        operator: ThresholdOperator.GREATER_THAN_OR_EQUAL,
        unit: "percentage",
        description: "Minimum overall quality score",
      },
      warning: {
        metric: "warningCount",
        value: 50,
        operator: ThresholdOperator.LESS_THAN_OR_EQUAL,
        unit: "count",
        description: "Maximum warnings allowed",
      },
      success: {
        metric: "overallScore",
        value: 80,
        operator: ThresholdOperator.GREATER_THAN_OR_EQUAL,
        unit: "percentage",
        description: "Target quality score",
      },
      custom: {},
    };
  }

  // Rollback Configurations

  /**
   * Create development rollback configuration
   * @returns Development rollback configuration
   */
  private static createDevelopmentRollbackConfig(): RollbackConfiguration {
    return {
      enabled: false,
      strategy: RollbackStrategy.MANUAL,
      triggers: [],
      timeout: 300000,
      recoveryProcedures: [],
      notifications: {
        enabled: false,
        channels: [],
        recipients: [],
        templates: {},
      },
    };
  }

  /**
   * Create staging rollback configuration
   * @returns Staging rollback configuration
   */
  private static createStagingRollbackConfig(): RollbackConfiguration {
    return {
      enabled: true,
      strategy: RollbackStrategy.GRADUAL,
      triggers: [
        {
          id: "critical-failure",
          condition: RollbackCondition.CRITICAL_GATE_FAILURE,
          threshold: 0,
          evaluationWindow: 60000,
          enabled: true,
        },
      ],
      timeout: 600000,
      recoveryProcedures: [
        {
          id: "restart-service",
          name: "Restart Application Service",
          steps: [
            {
              id: "stop-service",
              name: "Stop Service",
              type: RecoveryStepType.SERVICE_RESTART,
              config: { service: "app", action: "stop" },
              timeout: 30000,
              continueOnFailure: false,
            },
            {
              id: "start-service",
              name: "Start Service",
              type: RecoveryStepType.SERVICE_RESTART,
              config: { service: "app", action: "start" },
              timeout: 60000,
              continueOnFailure: false,
            },
          ],
          timeout: 120000,
          retryConfig: {
            maxAttempts: 2,
            delay: 5000,
            backoffStrategy: "exponential",
            maxDelay: 30000,
          },
        },
      ],
      notifications: {
        enabled: true,
        channels: [NotificationChannel.EMAIL, NotificationChannel.SLACK],
        recipients: ["devops@company.com"],
        templates: {
          rollback: "Rollback executed in staging environment",
        },
      },
    };
  }

  /**
   * Create production rollback configuration
   * @returns Production rollback configuration
   */
  private static createProductionRollbackConfig(): RollbackConfiguration {
    return {
      enabled: true,
      strategy: RollbackStrategy.BLUE_GREEN,
      triggers: [
        {
          id: "critical-failure",
          condition: RollbackCondition.CRITICAL_GATE_FAILURE,
          threshold: 0,
          evaluationWindow: 30000,
          enabled: true,
        },
        {
          id: "error-rate-spike",
          condition: RollbackCondition.ERROR_RATE_THRESHOLD,
          threshold: 1,
          evaluationWindow: 60000,
          enabled: true,
        },
        {
          id: "response-time-spike",
          condition: RollbackCondition.RESPONSE_TIME_THRESHOLD,
          threshold: 1000,
          evaluationWindow: 60000,
          enabled: true,
        },
      ],
      timeout: 1800000, // 30 minutes
      recoveryProcedures: [
        {
          id: "blue-green-rollback",
          name: "Blue-Green Deployment Rollback",
          steps: [
            {
              id: "switch-traffic",
              name: "Switch Traffic to Blue Environment",
              type: RecoveryStepType.CONFIG_CHANGE,
              config: {
                configFile: "load-balancer.conf",
                changes: { target: "blue" },
              },
              timeout: 30000,
              continueOnFailure: false,
            },
            {
              id: "health-check",
              name: "Validate Blue Environment Health",
              type: RecoveryStepType.API_CALL,
              config: {
                url: "http://blue.internal/health",
                method: "GET",
              },
              timeout: 60000,
              continueOnFailure: false,
            },
          ],
          timeout: 300000,
          retryConfig: {
            maxAttempts: 3,
            delay: 10000,
            backoffStrategy: "fixed",
            maxDelay: 10000,
          },
        },
      ],
      notifications: {
        enabled: true,
        channels: [
          NotificationChannel.EMAIL,
          NotificationChannel.SLACK,
          NotificationChannel.PAGER_DUTY,
        ],
        recipients: ["sre@company.com", "engineering-leads@company.com"],
        templates: {
          rollback: "CRITICAL: Production rollback executed",
        },
      },
    };
  }

  /**
   * Create test rollback configuration
   * @returns Test rollback configuration
   */
  private static createTestRollbackConfig(): RollbackConfiguration {
    return {
      enabled: false,
      strategy: RollbackStrategy.IMMEDIATE,
      triggers: [],
      timeout: 60000,
      recoveryProcedures: [],
      notifications: {
        enabled: false,
        channels: [],
        recipients: [],
        templates: {},
      },
    };
  }

  // Approval Configurations

  /**
   * Create development approval configuration
   * @returns Development approval configuration
   */
  private static createDevelopmentApprovalConfig(): ApprovalConfiguration {
    return {
      enabled: false,
      requirements: [],
      timeout: 3600000, // 1 hour
      autoApprovalConditions: [
        {
          id: "auto-approve-dev",
          criteria: {
            environments: ["development"],
            users: [],
            qualityScoreThreshold: 80,
            noCriticalFailures: true,
            additionalCriteria: {},
          },
          enabled: true,
          description: "Auto-approve development deployments",
        },
      ],
      notifications: {
        enabled: false,
        channels: [],
        recipients: [],
        escalation: {
          enabled: false,
          delay: 0,
          levels: [],
        },
      },
    };
  }

  /**
   * Create staging approval configuration
   * @returns Staging approval configuration
   */
  private static createStagingApprovalConfig(): ApprovalConfiguration {
    return {
      enabled: true,
      requirements: [
        {
          id: "tech-lead-approval",
          name: "Technical Lead Approval",
          approvers: [
            {
              type: ApproverType.ROLE,
              identifier: "tech-lead",
              permissions: ["approve-staging"],
            },
          ],
          minApprovals: 1,
          conditions: [
            {
              id: "staging-deployment",
              type: ApprovalConditionType.HIGH_RISK_CHANGE,
              parameters: { environment: "staging" },
              description: "Staging deployment requires approval",
            },
          ],
          priority: 1,
        },
      ],
      timeout: 7200000, // 2 hours
      autoApprovalConditions: [
        {
          id: "auto-approve-low-risk",
          criteria: {
            environments: ["staging"],
            users: [],
            qualityScoreThreshold: 95,
            noCriticalFailures: true,
            additionalCriteria: {
              maxChangedFiles: 5,
              testCoverage: 90,
            },
          },
          enabled: true,
          description: "Auto-approve low-risk staging changes",
        },
      ],
      notifications: {
        enabled: true,
        channels: [NotificationChannel.EMAIL, NotificationChannel.SLACK],
        recipients: ["tech-leads@company.com"],
        escalation: {
          enabled: true,
          delay: 3600000, // 1 hour
          levels: [
            {
              level: 1,
              recipients: ["engineering-manager@company.com"],
              messageTemplate: "Approval needed: {title}",
              channels: [NotificationChannel.EMAIL],
            },
          ],
        },
      },
    };
  }

  /**
   * Create production approval configuration
   * @returns Production approval configuration
   */
  private static createProductionApprovalConfig(): ApprovalConfiguration {
    return {
      enabled: true,
      requirements: [
        {
          id: "dual-approval",
          name: "Dual Approval Required",
          approvers: [
            {
              type: ApproverType.ROLE,
              identifier: "tech-lead",
              permissions: ["approve-production"],
            },
            {
              type: ApproverType.ROLE,
              identifier: "sre-lead",
              permissions: ["approve-production"],
            },
          ],
          minApprovals: 2,
          conditions: [
            {
              id: "production-deployment",
              type: ApprovalConditionType.PRODUCTION_DEPLOYMENT,
              parameters: { environment: "production" },
              description: "Production deployment requires dual approval",
            },
          ],
          priority: 1,
        },
      ],
      timeout: 14400000, // 4 hours
      autoApprovalConditions: [], // No auto-approval for production
      notifications: {
        enabled: true,
        channels: [
          NotificationChannel.EMAIL,
          NotificationChannel.SLACK,
          NotificationChannel.PAGER_DUTY,
        ],
        recipients: [
          "tech-leads@company.com",
          "sre-team@company.com",
          "engineering-director@company.com",
        ],
        escalation: {
          enabled: true,
          delay: 1800000, // 30 minutes
          levels: [
            {
              level: 1,
              recipients: ["engineering-director@company.com"],
              messageTemplate: "URGENT: Production approval needed: {title}",
              channels: [
                NotificationChannel.EMAIL,
                NotificationChannel.PAGER_DUTY,
              ],
            },
            {
              level: 2,
              recipients: ["cto@company.com"],
              messageTemplate: "ESCALATED: Production approval needed: {title}",
              channels: [
                NotificationChannel.EMAIL,
                NotificationChannel.PAGER_DUTY,
              ],
            },
          ],
        },
      },
    };
  }

  /**
   * Create test approval configuration
   * @returns Test approval configuration
   */
  private static createTestApprovalConfig(): ApprovalConfiguration {
    return {
      enabled: false,
      requirements: [],
      timeout: 300000, // 5 minutes
      autoApprovalConditions: [
        {
          id: "auto-approve-all-test",
          criteria: {
            environments: ["test"],
            users: [],
            qualityScoreThreshold: 0,
            noCriticalFailures: false,
            additionalCriteria: {},
          },
          enabled: true,
          description: "Auto-approve all test deployments",
        },
      ],
      notifications: {
        enabled: false,
        channels: [],
        recipients: [],
        escalation: {
          enabled: false,
          delay: 0,
          levels: [],
        },
      },
    };
  }
}

/**
 * Configuration Validation Utilities
 * Utilities for validating quality gates configurations
 */
export class ConfigurationValidator {
  /**
   * Validate framework configuration
   * @param config - Framework configuration to validate
   * @returns Validation result
   */
  static validateFrameworkConfig(
    config: QualityGatesFrameworkConfig,
  ): ConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate framework settings
    if (config.framework.defaultTimeout <= 0) {
      errors.push("Default timeout must be greater than 0");
    }

    if (config.framework.maxConcurrentGates <= 0) {
      errors.push("Max concurrent gates must be greater than 0");
    }

    // Validate environment configurations
    for (const env of Object.values(Environment)) {
      if (!config.pipelines[env]) {
        errors.push(`Missing pipeline configuration for environment: ${env}`);
      }

      if (!config.thresholds[env]) {
        errors.push(`Missing threshold configuration for environment: ${env}`);
      }
    }

    // Validate production-specific requirements
    const prodConfig = config.performanceGates[Environment.PRODUCTION];
    if (prodConfig && prodConfig.responseTimeThreshold > 1000) {
      errors.push("Production response time threshold must be ≤ 1000ms");
    }

    const prodSecurity = config.securityGates[Environment.PRODUCTION];
    if (prodSecurity && prodSecurity.maxCriticalVulnerabilities > 0) {
      errors.push(
        "Production must have zero tolerance for critical vulnerabilities",
      );
    }

    const prodCoverage = config.coverageGates[Environment.PRODUCTION];
    if (prodCoverage && prodCoverage.minTestCoverage < 95) {
      warnings.push("Production test coverage should be ≥ 95%");
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

/**
 * Configuration Validation Result
 * Result of configuration validation
 */
export interface ConfigValidationResult {
  /** Whether configuration is valid */
  readonly valid: boolean;

  /** Validation errors */
  readonly errors: readonly string[];

  /** Validation warnings */
  readonly warnings: readonly string[];
}
