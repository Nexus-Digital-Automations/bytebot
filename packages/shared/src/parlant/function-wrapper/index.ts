/**
 * PARLANT Phase 1 Function Wrapper Framework - Main Export Index
 *
 * Universal, type-safe function wrapping framework for PARLANT conversational
 * validation. Exports all core components, interfaces, types, and utilities
 * for comprehensive database function wrapping with maintained signatures.
 *
 * @fileoverview Main export index for function wrapper framework
 * @version 1.0.0
 * @author Function Wrapper Framework Agent
 * @created 2025-09-19
 */

// Core Interfaces and Types
export * from './interfaces/wrapper-types';

// Import runtime enum values for use in function bodies
import {
  WrapperConfig,
  ValidationLevel,
  FunctionCategory,
  DataClassification,
  AnyFunction,
  WrapFunction,
  SecurityRiskLevel,
  ErrorCategory
} from './interfaces/wrapper-types';

// Import factory for QuickStartHelper
import { EnterpriseFunctionWrapperFactory } from './factories/function-wrapper-factory';

// Import additional classes for use in function bodies
import { FunctionSignatureInspector, TypeSafeWrapperCreator } from './core/signature-preserving-wrapper';
import { WrapperRegistryManagementService } from './core/wrapper-registry-management';

// Core Implementation Components
export {
  SignaturePreservingWrapper,
  TypeSafeWrapperCreator,
  FunctionSignatureInspector,
  WrapperStatistics,
  FunctionSignature,
  CompatibilityResult,
  TypeValidator,
  TypeValidationResult
} from './core/signature-preserving-wrapper';

// Factory Components
export {
  EnterpriseFunctionWrapperFactory,
  WrapperCreationError,
  ConfigurationUseCase,
  AutoConfigOptions,
  FactoryStatistics,
  WrapperHealthStatus as FactoryWrapperHealthStatus,
  FactoryHealthStatus
} from './factories/function-wrapper-factory';

// Validation Components - Parameter Processing
export {
  ParameterCaptureValidationService,
  ParameterSanitizer,
  ParameterTypeAnalyzer,
  ParameterSecurityValidator,
  ParameterPerformanceOptimizer,
  SecurityRiskLevel,
  ChangeImpactLevel,
  CapturedParameter,
  ParameterMetadata,
  ParameterValidationResult,
  ParameterTypeAnalysis,
  ParameterTypeInfo,
  ParameterSecurityValidationResult,
  CustomValidationResult,
  ParameterPerformanceAnalysis,
  ParameterConversationSummary,
  ConversationPrompt,
  ParameterRiskAssessment,
  RecommendedAction,
  ParameterChangeValidationResult,
  ParameterChangeAnalysis,
  ParameterChange,
  SecurityImpactAssessment,
  BusinessImpactAssessment
} from './validation/parameter-capture-validation';

// Validation Components - Return Value Processing
export {
  ReturnValueProcessingService,
  ResultAnalyzer,
  ReturnValueSecurityProcessor,
  ResultTransformationEngine,
  ReturnValueAuditProcessor,
  ReturnValuePerformanceAnalyzer,
  DataValueLevel,
  ReturnValueProcessingResult,
  ReturnValueAnalysis,
  ReturnValueStructure,
  ReturnValueContentAnalysis,
  ReturnValueSecurityValidation,
  ReturnValuePerformanceAnalysis,
  ReturnValueBusinessImpact,
  ReturnValueAuditTrail,
  ReturnValueConversationSummary,
  SchemaValidationResult,
  ReturnValueSchema,
  PropertySchema,
  ItemSchema,
  TransformationOptions,
  TransformedReturnValue
} from './validation/return-value-processing';

// Registry and Management Components
export {
  WrapperRegistryManagementService,
  WrapperPerformanceMonitor,
  WrapperHealthMonitor,
  WrapperLifecycleManager,
  RegisteredWrapper,
  WrapperRegistrationMetadata,
  WrapperRegistrationFullMetadata,
  WrapperRuntimeStatistics,
  WrapperLifecycleInfo,
  WrapperRegistrationResult,
  WrapperUnregistrationResult,
  WrapperInfo,
  WrapperListFilters,
  RegistryStatistics,
  HealthCheckResult,
  WrapperHealthStatus,
  WrapperConfigUpdateResult,
  WrapperSearchCriteria,
  WrapperSearchResult,
  WrapperConfigurationExport,
  ExportedWrapperConfig,
  WrapperConfigurationImportResult,
  WrapperImportResult,
  RegistryConfiguration,
  FunctionRegistration,
  PerformanceMetrics,
  AggregatedPerformanceMetrics,
  WrapperInvocationEvent,
  WrapperErrorEvent,
  WrapperPerformanceEvent
} from './core/wrapper-registry-management';

/**
 * Framework Version Information
 */
export const FRAMEWORK_VERSION = '1.0.0';
export const FRAMEWORK_NAME = 'PARLANT Function Wrapper Framework';

/**
 * Framework Capabilities
 */
export const FRAMEWORK_CAPABILITIES = {
  // Core Functionality
  typePreservation: true,
  signaturePreservation: true,
  asyncSupport: true,
  genericTypeSupport: true,

  // Validation Features
  parameterValidation: true,
  returnValueValidation: true,
  securityValidation: true,
  performanceMonitoring: true,

  // Registry Features
  wrapperRegistry: true,
  lifecycleManagement: true,
  healthMonitoring: true,
  statisticsTracking: true,

  // Enterprise Features
  batchProcessing: true,
  configurationTemplates: true,
  importExport: true,
  searchCapabilities: true,

  // PARLANT Integration
  conversationalValidation: true,
  auditTrails: true,
  businessImpactAssessment: true,
  complianceSupport: true
} as const;

/**
 * Default Configuration Factory
 * Creates sensible default configurations for common use cases
 */
export class DefaultConfigurationFactory {
  /**
   * Create default configuration for database read operations
   */
  static createDatabaseReadConfig(functionId: string): WrapperConfig {
    return {
      functionId,
      description: `Database read operation: ${functionId}`,
      validationLevel: ValidationLevel.MEDIUM,
      cacheable: true,
      cacheTtl: 300000, // 5 minutes
      monitoring: true,
      metadata: {
        category: FunctionCategory.DATABASE_READ,
        domain: 'database',
        dataClassification: DataClassification.INTERNAL,
        dependencies: ['database'],
        tags: ['database', 'read', 'cacheable']
      }
    };
  }

  /**
   * Create default configuration for database write operations
   */
  static createDatabaseWriteConfig(functionId: string): WrapperConfig {
    return {
      functionId,
      description: `Database write operation: ${functionId}`,
      validationLevel: ValidationLevel.HIGH,
      cacheable: false,
      monitoring: true,
      metadata: {
        category: FunctionCategory.DATABASE_WRITE,
        domain: 'database',
        dataClassification: DataClassification.CONFIDENTIAL,
        dependencies: ['database'],
        tags: ['database', 'write', 'transaction']
      }
    };
  }

  /**
   * Create default configuration for API operations
   */
  static createApiConfig(functionId: string): WrapperConfig {
    return {
      functionId,
      description: `API operation: ${functionId}`,
      validationLevel: ValidationLevel.MEDIUM,
      cacheable: true,
      cacheTtl: 60000, // 1 minute
      monitoring: true,
      metadata: {
        category: FunctionCategory.API_CALL,
        domain: 'api',
        dataClassification: DataClassification.INTERNAL,
        dependencies: ['network'],
        tags: ['api', 'external', 'network']
      }
    };
  }

  /**
   * Create default configuration for authentication operations
   */
  static createAuthConfig(functionId: string): WrapperConfig {
    return {
      functionId,
      description: `Authentication operation: ${functionId}`,
      validationLevel: ValidationLevel.CRITICAL,
      cacheable: false,
      monitoring: true,
      metadata: {
        category: FunctionCategory.AUTHENTICATION,
        domain: 'security',
        dataClassification: DataClassification.RESTRICTED,
        dependencies: ['auth-service'],
        tags: ['auth', 'security', 'critical']
      }
    };
  }

  /**
   * Create default configuration for utility operations
   */
  static createUtilityConfig(functionId: string): WrapperConfig {
    return {
      functionId,
      description: `Utility operation: ${functionId}`,
      validationLevel: ValidationLevel.LOW,
      cacheable: true,
      cacheTtl: 600000, // 10 minutes
      monitoring: true,
      metadata: {
        category: FunctionCategory.UTILITY,
        domain: 'utility',
        dataClassification: DataClassification.INTERNAL,
        dependencies: [],
        tags: ['utility', 'helper', 'general']
      }
    };
  }
}

/**
 * Quick Start Helper
 * Provides convenient methods for common wrapper creation scenarios
 */
export class QuickStartHelper {
  private static factory = new EnterpriseFunctionWrapperFactory();

  /**
   * Quickly wrap a database read function
   */
  static wrapDatabaseRead<T extends AnyFunction>(
    func: T,
    functionId: string
  ): WrapFunction<T> {
    const config = DefaultConfigurationFactory.createDatabaseReadConfig(functionId);
    return this.factory.createWrapper(func, config);
  }

  /**
   * Quickly wrap a database write function
   */
  static wrapDatabaseWrite<T extends AnyFunction>(
    func: T,
    functionId: string
  ): WrapFunction<T> {
    const config = DefaultConfigurationFactory.createDatabaseWriteConfig(functionId);
    return this.factory.createWrapper(func, config);
  }

  /**
   * Quickly wrap an API function
   */
  static wrapApi<T extends AnyFunction>(
    func: T,
    functionId: string
  ): WrapFunction<T> {
    const config = DefaultConfigurationFactory.createApiConfig(functionId);
    return this.factory.createWrapper(func, config);
  }

  /**
   * Quickly wrap an authentication function
   */
  static wrapAuth<T extends AnyFunction>(
    func: T,
    functionId: string
  ): WrapFunction<T> {
    const config = DefaultConfigurationFactory.createAuthConfig(functionId);
    return this.factory.createWrapper(func, config);
  }

  /**
   * Quickly wrap a utility function
   */
  static wrapUtility<T extends AnyFunction>(
    func: T,
    functionId: string
  ): WrapFunction<T> {
    const config = DefaultConfigurationFactory.createUtilityConfig(functionId);
    return this.factory.createWrapper(func, config);
  }

  /**
   * Auto-wrap function with intelligent configuration detection
   */
  static autoWrap<T extends AnyFunction>(
    func: T,
    functionId: string,
    hints?: {
      isDatabase?: boolean;
      isWrite?: boolean;
      isAuth?: boolean;
      isApi?: boolean;
    }
  ): WrapFunction<T> {
    // Intelligent configuration selection based on hints and function analysis
    let config: WrapperConfig;

    if (hints?.isAuth) {
      config = DefaultConfigurationFactory.createAuthConfig(functionId);
    } else if (hints?.isDatabase && hints?.isWrite) {
      config = DefaultConfigurationFactory.createDatabaseWriteConfig(functionId);
    } else if (hints?.isDatabase) {
      config = DefaultConfigurationFactory.createDatabaseReadConfig(functionId);
    } else if (hints?.isApi) {
      config = DefaultConfigurationFactory.createApiConfig(functionId);
    } else {
      // Analyze function name for hints
      const name = func.name.toLowerCase();
      if (name.includes('auth') || name.includes('login') || name.includes('token')) {
        config = DefaultConfigurationFactory.createAuthConfig(functionId);
      } else if (name.includes('db') || name.includes('database') || name.includes('query')) {
        if (name.includes('create') || name.includes('update') || name.includes('delete') || name.includes('insert')) {
          config = DefaultConfigurationFactory.createDatabaseWriteConfig(functionId);
        } else {
          config = DefaultConfigurationFactory.createDatabaseReadConfig(functionId);
        }
      } else if (name.includes('api') || name.includes('http') || name.includes('fetch')) {
        config = DefaultConfigurationFactory.createApiConfig(functionId);
      } else {
        config = DefaultConfigurationFactory.createUtilityConfig(functionId);
      }
    }

    return this.factory.createWrapper(func, config);
  }
}

/**
 * Framework Validation Utilities
 * Utility functions for framework validation and debugging
 */
export class FrameworkValidationUtils {
  /**
   * Validate framework installation and configuration
   */
  static validateInstallation(): ValidationReport {
    const issues: string[] = [];
    const warnings: string[] = [];

    // Check required dependencies
    try {
      require('@nestjs/common');
    } catch {
      issues.push('Missing required dependency: @nestjs/common');
    }

    // Check framework capabilities
    const capabilities = Object.entries(FRAMEWORK_CAPABILITIES);
    const enabledCapabilities = capabilities.filter(([, enabled]) => enabled);

    if (enabledCapabilities.length < capabilities.length) {
      warnings.push('Some framework capabilities are disabled');
    }

    return {
      valid: issues.length === 0,
      issues,
      warnings,
      frameworkVersion: FRAMEWORK_VERSION,
      capabilities: FRAMEWORK_CAPABILITIES
    };
  }

  /**
   * Validate wrapper configuration
   */
  static validateWrapperConfig(config: WrapperConfig): ConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!config.functionId) {
      errors.push('functionId is required');
    }

    if (!config.description) {
      errors.push('description is required');
    }

    if (!config.validationLevel) {
      errors.push('validationLevel is required');
    }

    // Validate function ID format
    if (config.functionId && !/^[a-zA-Z][a-zA-Z0-9._-]*$/.test(config.functionId)) {
      errors.push('functionId must start with a letter and contain only alphanumeric characters, dots, underscores, and hyphens');
    }

    // Check for performance implications
    if (config.cacheTtl && config.cacheTtl > 3600000) { // > 1 hour
      warnings.push('Cache TTL is very long, consider shorter duration for better data freshness');
    }

    if (config.validationLevel === ValidationLevel.CRITICAL && config.cacheable) {
      warnings.push('Critical validation functions should typically not be cached');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Analyze function compatibility
   */
  static analyzeFunctionCompatibility<T extends AnyFunction>(
    func: T
  ): CompatibilityAnalysisResult {
    try {
      const compatibility = FunctionSignatureInspector.validateCompatibility(func);

      return {
        compatible: compatibility.compatible,
        signature: compatibility.signature,
        issues: compatibility.issues,
        warnings: compatibility.warnings,
        recommendations: compatibility.recommendations
      };
    } catch (error) {
      return {
        compatible: false,
        signature: null,
        issues: [`Analysis failed: ${error.message}`],
        warnings: [],
        recommendations: ['Ensure function is properly defined and accessible']
      };
    }
  }
}

/**
 * Type Definitions for Utilities
 */
export interface ValidationReport {
  readonly valid: boolean;
  readonly issues: readonly string[];
  readonly warnings: readonly string[];
  readonly frameworkVersion: string;
  readonly capabilities: typeof FRAMEWORK_CAPABILITIES;
}

export interface ConfigValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
}

export interface CompatibilityAnalysisResult {
  readonly compatible: boolean;
  readonly signature: import('./core/signature-preserving-wrapper').FunctionSignature<any> | null;
  readonly issues: readonly string[];
  readonly warnings: readonly string[];
  readonly recommendations: readonly string[];
}

/**
 * Framework Constants
 */
export const FRAMEWORK_CONSTANTS = {
  DEFAULT_VALIDATION_TIMEOUT: 30000,
  DEFAULT_CACHE_TTL: 300000,
  DEFAULT_MAX_PARAMETER_SIZE: 10485760, // 10MB
  DEFAULT_MAX_RETURN_SIZE: 52428800,   // 50MB
  DEFAULT_HEALTH_CHECK_INTERVAL: 60000,
  DEFAULT_CLEANUP_INTERVAL: 300000,

  VALIDATION_LEVELS: Object.values(ValidationLevel),
  FUNCTION_CATEGORIES: Object.values(FunctionCategory),
  DATA_CLASSIFICATIONS: Object.values(DataClassification),
  SECURITY_RISK_LEVELS: Object.values(SecurityRiskLevel),

  SUPPORTED_PARAMETER_TYPES: [
    'string', 'number', 'boolean', 'object', 'array', 'function', 'undefined', 'null'
  ],

  SUPPORTED_RETURN_TYPES: [
    'string', 'number', 'boolean', 'object', 'array', 'function', 'undefined', 'null', 'promise'
  ]
} as const;

/**
 * Framework Error Classes
 */
export class FrameworkError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly category: ErrorCategory,
    public readonly metadata: Record<string, any> = {}
  ) {
    super(message);
    this.name = 'FrameworkError';
  }
}

export class ConfigurationError extends FrameworkError {
  constructor(message: string, metadata: Record<string, any> = {}) {
    super(
      message,
      'CONFIGURATION_ERROR',
      ErrorCategory.CONFIGURATION_ERROR,
      metadata
    );
    this.name = 'ConfigurationError';
  }
}

export class ValidationError extends FrameworkError {
  constructor(message: string, metadata: Record<string, any> = {}) {
    super(
      message,
      'VALIDATION_ERROR',
      ErrorCategory.VALIDATION_ERROR,
      metadata
    );
    this.name = 'ValidationError';
  }
}

/**
 * Framework Metadata
 */
export const FRAMEWORK_METADATA = {
  name: FRAMEWORK_NAME,
  version: FRAMEWORK_VERSION,
  description: 'Universal type-safe function wrapping framework for PARLANT conversational validation',
  author: 'Function Wrapper Framework Agent',
  license: 'Enterprise',

  compatibility: {
    node: '>=16.0.0',
    typescript: '>=4.5.0',
    nestjs: '>=8.0.0'
  },

  features: [
    'Type-safe function wrapping with signature preservation',
    'PARLANT conversational validation integration',
    'Enterprise-grade parameter and return value processing',
    'Comprehensive wrapper registry and lifecycle management',
    'Advanced security validation and sanitization',
    'Performance monitoring and optimization',
    'Audit trails and compliance support',
    'Batch processing and configuration templates'
  ],

  useCases: [
    'Database function wrapping with conversational validation',
    'API endpoint security enhancement',
    'Authentication and authorization validation',
    'Business logic compliance checking',
    'Data processing pipeline validation',
    'Enterprise workflow orchestration'
  ]
} as const;

// Default export for convenience
export default {
  // Core classes
  EnterpriseFunctionWrapperFactory,
  WrapperRegistryManagementService,
  TypeSafeWrapperCreator,

  // Utilities
  DefaultConfigurationFactory,
  QuickStartHelper,
  FrameworkValidationUtils,

  // Constants
  FRAMEWORK_VERSION,
  FRAMEWORK_CAPABILITIES,
  FRAMEWORK_CONSTANTS,
  FRAMEWORK_METADATA,

  // Error classes
  FrameworkError,
  ConfigurationError,
  ValidationError
};