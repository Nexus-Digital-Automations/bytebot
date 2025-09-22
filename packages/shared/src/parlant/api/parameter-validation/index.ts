/**
 * PARLANT Phase 1 - Parameter Validation API Module
 *
 * Comprehensive parameter validation enabling conversational parameter verification
 * and sanitization with enterprise-grade security and intelligent user guidance.
 *
 * This module provides the complete PARLANT Phase 1 Parameter Validation system
 * with four specialized services working together to deliver revolutionary
 * parameter validation capabilities.
 *
 * @module ParlantParameterValidationAPI
 * @version 1.0.0
 * @author AIgent PARLANT Integration Team
 */

// ===== CORE SERVICES =====

export { ParameterValidationService } from './parameter-validation.service';
export { NaturalLanguageParameterInterface } from './natural-language-interface.service';
export { AdvancedValidationFramework } from './advanced-validation-framework.service';
export { SecurityIntegrationService } from './security-integration.service';

// ===== TYPE EXPORTS =====

// Parameter Validation Service Types
export type {
  ParameterValidationRequest,
  ParameterValidationResponse,
  ParameterSchema,
  ParameterDefinition,
  ValidationRule,
  SanitizationRule,
  BusinessRule,
  SecurityConstraint,
  ParameterValidationDetails,
  ParameterResult,
  SecurityAssessment,
  ThreatIndicator,
  PerformanceMetrics,
  ValidationOptions,
  UserContext,
  UserPreferences,
  ConfirmationPreferences,
  AccessibilityPreferences,
  UserSecurityContext,
  DeviceInfo,
  UserRiskAssessment,
  BusinessRuleViolation,
  SecurityViolation,
  SanitizationAction,
  ValidationWarning,
  TypeConversion,
  AuditRequirement
} from './parameter-validation.service';

// Natural Language Interface Types
export type {
  ParameterCollectionRequest,
  ParameterCollectionResponse,
  ParameterCollectionOptions,
  ConversationSummary,
  SatisfactionIndicator,
  ConversationMoment,
  ParameterGuidance,
  ParameterConflict,
  ConflictResolution,
  CollectionPerformanceMetrics,
  ParameterPrompt,
  PromptExample,
  NaturalLanguageParseRequest,
  NaturalLanguageParseResponse,
  ParseContext,
  ParseOptions,
  ParseAlternative
} from './natural-language-interface.service';

// Advanced Validation Framework Types
export type {
  ValidationLayer,
  ValidationLayerFunction,
  ValidationLayerConfig,
  ValidationLayerPerformance,
  ValidationLayerResult,
  ValidationMessage,
  LayerExecutionMetrics,
  ValidationContext,
  FunctionContext,
  FunctionSecurityContext,
  SessionData,
  UserPreferences as AdvancedUserPreferences,
  AutoCorrectionPreferences,
  NotificationPreferences,
  LearningPreferences,
  SessionRiskAssessment,
  SessionRiskFactor,
  ValidationHistoryEntry,
  UserAction,
  ValidationPipeline,
  ValidationPipelineConfig,
  ValidationPipelinePerformance,
  RetryConfig,
  CacheConfig,
  PerformanceThreshold,
  AdaptiveValidationConfig,
  AdaptationStrategy,
  AdaptationFunction,
  AdaptationConfig,
  AdaptationTrigger,
  AdaptationLimits,
  RollbackCondition,
  PipelinePerformanceHistory,
  PerformanceDataPoint,
  PerformanceTrend,
  PerformanceAnomaly
} from './advanced-validation-framework.service';

// Security Integration Service Types
export type {
  SecurityPolicy,
  SecurityRule,
  SecurityCondition,
  SecurityAction,
  ValidityPeriod,
  ThreatDetectionEngine,
  ThreatDetectionCapability,
  ThreatDetectionConfig,
  DetectionThreshold,
  MLSettings,
  FeatureExtractionConfig,
  ThreatDetectionPerformance,
  AccuracyMetrics,
  SecurityAuditLog,
  ParameterAuditDetails,
  ProcessingStep,
  SecurityDecision,
  RiskAssessmentResult,
  RiskFactor,
  ThreatAnalysisResult,
  SecurityActionResult,
  ComplianceAuditInfo,
  ParameterEncryptionConfig,
  SecureParameterStorage,
  StorageAccessControl,
  AccessCondition,
  RetentionPolicy
} from './security-integration.service';

// ===== ENUM EXPORTS =====

// Parameter Validation Service Enums
export {
  ParameterType,
  ValidationRuleType,
  SanitizationType,
  RuleSeverity,
  SecurityConstraintType,
  ThreatType,
  SecurityViolationType,
  ParameterValidationStatus,
  ValidationWarningType,
  ValidationStrictness,
  AutoCorrectionLevel,
  NotificationLevel,
  NotificationChannel,
  LearningScope,
  PrivacyLevel
} from './parameter-validation.service';

// Natural Language Interface Enums
export {
  InteractionStyle,
  SatisfactionType,
  MomentType,
  UserReaction,
  GuidanceType,
  DifficultyLevel,
  ConflictType,
  ResolutionStrategy,
  PromptType,
  ResponseFormat,
  CorrectionLevel
} from './natural-language-interface.service';

// Advanced Validation Framework Enums
export {
  MessageSeverity,
  ValidationStrictness as FrameworkValidationStrictness,
  AutoCorrectionLevel as FrameworkAutoCorrectionLevel,
  NotificationLevel as FrameworkNotificationLevel,
  NotificationChannel as FrameworkNotificationChannel,
  LearningScope as FrameworkLearningScope,
  PrivacyLevel as FrameworkPrivacyLevel,
  SessionRiskType,
  ValidationResult,
  UserActionType,
  CacheKeyStrategy,
  AlertAction,
  AdaptationTriggerType,
  RollbackConditionType,
  TrendType,
  TrendDirection,
  AnomalyType
} from './advanced-validation-framework.service';

// Security Integration Service Enums
export {
  SecurityRuleType,
  ConditionType,
  ConditionLogic,
  SecurityActionType,
  EnforcementLevel,
  ComplianceFramework,
  DetectionMethod,
  PerformanceImpact,
  SensitivityLevel,
  UpdateFrequency,
  MLModelType,
  TextFeatureType,
  BehavioralFeatureType,
  ContextFeatureType,
  SecurityEventType,
  ProcessingStepResult,
  SecurityDecisionType,
  RiskFactorType,
  ComplianceStatus,
  EncryptionAlgorithm,
  KeyRotationFrequency,
  EncryptionScope,
  StorageBackend,
  PrincipalType,
  StoragePermission,
  AccessConditionType,
  ConditionOperator
} from './security-integration.service';

// ===== MODULE CONFIGURATION =====

/**
 * PARLANT Phase 1 Parameter Validation Module Configuration
 */
export interface ParlantParameterValidationConfig {
  /** Enable conversational parameter validation */
  enableConversationalValidation: boolean;

  /** Enable natural language interface */
  enableNaturalLanguageInterface: boolean;

  /** Enable advanced validation framework */
  enableAdvancedValidation: boolean;

  /** Enable security integration */
  enableSecurityIntegration: boolean;

  /** Performance requirements */
  performanceRequirements: ParameterValidationPerformanceConfig;

  /** Security configuration */
  securityConfig: ParameterValidationSecurityConfig;

  /** User experience configuration */
  userExperienceConfig: ParameterValidationUXConfig;

  /** Compliance requirements */
  complianceConfig: ParameterValidationComplianceConfig;
}

export interface ParameterValidationPerformanceConfig {
  /** Target validation time (ms) */
  targetValidationTime: number;

  /** Maximum validation time (ms) */
  maxValidationTime: number;

  /** Enable performance monitoring */
  enablePerformanceMonitoring: boolean;

  /** Cache configuration */
  cacheConfig: {
    enabled: boolean;
    ttl: number;
    maxSize: number;
  };

  /** Batch processing configuration */
  batchConfig: {
    enabled: boolean;
    batchSize: number;
    batchTimeout: number;
  };
}

export interface ParameterValidationSecurityConfig {
  /** Minimum security level */
  minimumSecurityLevel: SecurityLevel;

  /** Enable threat detection */
  enableThreatDetection: boolean;

  /** Enable sanitization */
  enableSanitization: boolean;

  /** Audit configuration */
  auditConfig: {
    enabled: boolean;
    level: string;
    retention: number;
  };

  /** Encryption configuration */
  encryptionConfig: {
    enabled: boolean;
    algorithm: string;
    keyRotation: string;
  };
}

export interface ParameterValidationUXConfig {
  /** Default interaction style */
  defaultInteractionStyle: InteractionStyle;

  /** Enable smart suggestions */
  enableSmartSuggestions: boolean;

  /** Enable auto-correction */
  enableAutoCorrection: boolean;

  /** Language support */
  languageSupport: string[];

  /** Accessibility features */
  accessibilityFeatures: {
    screenReader: boolean;
    highContrast: boolean;
    largeText: boolean;
    voiceControl: boolean;
  };
}

export interface ParameterValidationComplianceConfig {
  /** Required compliance frameworks */
  requiredFrameworks: ComplianceFramework[];

  /** Data retention policies */
  retentionPolicies: Record<string, number>;

  /** Privacy settings */
  privacySettings: {
    dataMinimization: boolean;
    consentManagement: boolean;
    rightToErasure: boolean;
  };
}

// ===== DEFAULT CONFIGURATION =====

/**
 * Default PARLANT Phase 1 Parameter Validation Configuration
 */
export const defaultParlantParameterValidationConfig: ParlantParameterValidationConfig = {
  enableConversationalValidation: true,
  enableNaturalLanguageInterface: true,
  enableAdvancedValidation: true,
  enableSecurityIntegration: true,

  performanceRequirements: {
    targetValidationTime: 200, // 200ms target
    maxValidationTime: 2000, // 2s timeout
    enablePerformanceMonitoring: true,
    cacheConfig: {
      enabled: true,
      ttl: 300000, // 5 minutes
      maxSize: 10000
    },
    batchConfig: {
      enabled: true,
      batchSize: 10,
      batchTimeout: 100
    }
  },

  securityConfig: {
    minimumSecurityLevel: SecurityLevel.INTERNAL,
    enableThreatDetection: true,
    enableSanitization: true,
    auditConfig: {
      enabled: true,
      level: 'detailed',
      retention: 90 // 90 days
    },
    encryptionConfig: {
      enabled: true,
      algorithm: 'AES-256-GCM',
      keyRotation: 'monthly'
    }
  },

  userExperienceConfig: {
    defaultInteractionStyle: InteractionStyle.GUIDED,
    enableSmartSuggestions: true,
    enableAutoCorrection: true,
    languageSupport: ['en', 'es', 'fr', 'de'],
    accessibilityFeatures: {
      screenReader: true,
      highContrast: true,
      largeText: true,
      voiceControl: false
    }
  },

  complianceConfig: {
    requiredFrameworks: [ComplianceFramework.GDPR, ComplianceFramework.SOX],
    retentionPolicies: {
      'parameter_logs': 90,
      'audit_trails': 2555, // 7 years
      'security_events': 1095 // 3 years
    },
    privacySettings: {
      dataMinimization: true,
      consentManagement: true,
      rightToErasure: true
    }
  }
};

// ===== MODULE FACTORY =====

/**
 * Factory class for creating and configuring PARLANT Parameter Validation services
 */
export class ParlantParameterValidationFactory {
  /**
   * Create a complete parameter validation system
   */
  static createParameterValidationSystem(
    config: Partial<ParlantParameterValidationConfig> = {}
  ): ParlantParameterValidationSystem {
    const finalConfig = { ...defaultParlantParameterValidationConfig, ...config };

    return new ParlantParameterValidationSystem(finalConfig);
  }

  /**
   * Create parameter validation service only
   */
  static createParameterValidationService(
    validationBridge: any,
    contextBuilder: any
  ): ParameterValidationService {
    return new ParameterValidationService(validationBridge, contextBuilder);
  }

  /**
   * Create natural language interface only
   */
  static createNaturalLanguageInterface(
    validationBridge: any
  ): NaturalLanguageParameterInterface {
    return new NaturalLanguageParameterInterface(validationBridge);
  }

  /**
   * Create advanced validation framework only
   */
  static createAdvancedValidationFramework(): AdvancedValidationFramework {
    return new AdvancedValidationFramework();
  }

  /**
   * Create security integration service only
   */
  static createSecurityIntegrationService(): SecurityIntegrationService {
    return new SecurityIntegrationService();
  }
}

/**
 * Complete PARLANT Parameter Validation System
 */
export class ParlantParameterValidationSystem {
  public readonly parameterValidationService: ParameterValidationService;
  public readonly naturalLanguageInterface: NaturalLanguageParameterInterface;
  public readonly advancedValidationFramework: AdvancedValidationFramework;
  public readonly securityIntegrationService: SecurityIntegrationService;

  constructor(
    private readonly config: ParlantParameterValidationConfig,
    private readonly validationBridge?: any,
    private readonly contextBuilder?: any
  ) {
    // Initialize services based on configuration
    if (config.enableSecurityIntegration) {
      this.securityIntegrationService = new SecurityIntegrationService();
    }

    if (config.enableAdvancedValidation) {
      this.advancedValidationFramework = new AdvancedValidationFramework();
    }

    if (config.enableNaturalLanguageInterface && validationBridge) {
      this.naturalLanguageInterface = new NaturalLanguageParameterInterface(validationBridge);
    }

    if (config.enableConversationalValidation && validationBridge && contextBuilder) {
      this.parameterValidationService = new ParameterValidationService(
        validationBridge,
        contextBuilder
      );
    }
  }

  /**
   * Get system configuration
   */
  getConfiguration(): ParlantParameterValidationConfig {
    return { ...this.config };
  }

  /**
   * Update system configuration
   */
  updateConfiguration(updates: Partial<ParlantParameterValidationConfig>): void {
    Object.assign(this.config, updates);
  }

  /**
   * Get system health status
   */
  async getHealthStatus(): Promise<ParameterValidationHealthStatus> {
    const services = {
      parameterValidation: !!this.parameterValidationService,
      naturalLanguageInterface: !!this.naturalLanguageInterface,
      advancedValidation: !!this.advancedValidationFramework,
      securityIntegration: !!this.securityIntegrationService
    };

    const enabledServices = Object.values(services).filter(Boolean).length;
    const totalServices = Object.keys(services).length;

    return {
      overall: enabledServices === totalServices ? 'healthy' : 'degraded',
      services,
      configuration: this.config,
      timestamp: new Date(),
      version: '1.0.0'
    };
  }

  /**
   * Get system performance metrics
   */
  async getPerformanceMetrics(): Promise<ParameterValidationSystemMetrics> {
    // This would collect metrics from all services
    return {
      totalValidations: 0,
      averageValidationTime: 0,
      successRate: 1.0,
      cacheHitRate: 0.85,
      securityThreatsDetected: 0,
      conversationalInteractions: 0,
      timestamp: new Date()
    };
  }
}

// ===== SUPPORTING INTERFACES =====

export interface ParameterValidationHealthStatus {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  services: {
    parameterValidation: boolean;
    naturalLanguageInterface: boolean;
    advancedValidation: boolean;
    securityIntegration: boolean;
  };
  configuration: ParlantParameterValidationConfig;
  timestamp: Date;
  version: string;
}

export interface ParameterValidationSystemMetrics {
  totalValidations: number;
  averageValidationTime: number;
  successRate: number;
  cacheHitRate: number;
  securityThreatsDetected: number;
  conversationalInteractions: number;
  timestamp: Date;
}

// ===== UTILITY FUNCTIONS =====

/**
 * Validate parameter validation configuration
 */
export function validateParameterValidationConfig(
  config: ParlantParameterValidationConfig
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (config.performanceRequirements.targetValidationTime > config.performanceRequirements.maxValidationTime) {
    errors.push('Target validation time cannot exceed maximum validation time');
  }

  if (config.performanceRequirements.targetValidationTime < 50) {
    errors.push('Target validation time should be at least 50ms for realistic performance');
  }

  if (config.securityConfig.auditConfig.retention < 30) {
    errors.push('Audit log retention should be at least 30 days for compliance');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Create default user context for testing
 */
export function createDefaultUserContext(): UserContext {
  return {
    userId: 'test-user',
    roles: ['user'],
    permissions: ['parameter-validation'],
    sessionId: 'test-session',
    preferences: {
      validationStyle: 'standard',
      confirmationPreferences: {
        alwaysConfirmSanitization: false,
        confirmTypeConversions: true,
        confirmDefaultValues: false,
        enableBatchConfirmation: true
      },
      language: 'en',
      accessibility: {
        screenReader: false,
        highContrast: false,
        largeText: false,
        voiceInteraction: false
      }
    },
    securityContext: {
      securityClearance: SecurityLevel.INTERNAL,
      accessRestrictions: [],
      ipAddress: '127.0.0.1',
      deviceInfo: {
        deviceType: 'desktop',
        operatingSystem: 'linux',
        browserInfo: 'chrome',
        securityStatus: 'secure'
      },
      riskAssessment: {
        riskLevel: RiskLevel.LOW,
        riskFactors: [],
        trustScore: 85,
        suspiciousActivity: false
      }
    }
  };
}

/**
 * Create example parameter schema for testing
 */
export function createExampleParameterSchema(): ParameterSchema {
  return {
    parameters: {
      username: {
        type: ParameterType.STRING,
        description: 'User login name',
        validationRules: [
          {
            type: ValidationRuleType.MIN_LENGTH,
            config: { minLength: 3 },
            errorMessage: 'Username must be at least 3 characters',
            conversationalExplanation: 'Please provide a username with at least 3 characters'
          },
          {
            type: ValidationRuleType.REGEX_PATTERN,
            config: { pattern: '^[a-zA-Z0-9_]+$' },
            errorMessage: 'Username can only contain letters, numbers, and underscores',
            conversationalExplanation: 'Username should only use letters, numbers, and underscores'
          }
        ],
        sanitizationRules: [
          {
            type: SanitizationType.TRIM_WHITESPACE,
            config: {},
            requireConfirmation: false,
            explanation: 'Remove extra spaces from username'
          }
        ],
        securityLevel: SecurityLevel.INTERNAL,
        examples: ['john_doe', 'user123', 'admin_user']
      },
      email: {
        type: ParameterType.EMAIL,
        description: 'User email address',
        validationRules: [
          {
            type: ValidationRuleType.REGEX_PATTERN,
            config: { pattern: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$' },
            errorMessage: 'Please provide a valid email address',
            conversationalExplanation: 'Email should be in format: user@domain.com'
          }
        ],
        sanitizationRules: [
          {
            type: SanitizationType.TRIM_WHITESPACE,
            config: {},
            requireConfirmation: false,
            explanation: 'Remove extra spaces from email'
          }
        ],
        securityLevel: SecurityLevel.CONFIDENTIAL,
        examples: ['user@example.com', 'admin@company.org']
      }
    },
    required: ['username'],
    businessRules: [
      {
        id: 'unique-username',
        description: 'Username must be unique in the system',
        condition: 'username not exists in database',
        severity: RuleSeverity.ERROR,
        conversationalExplanation: 'This username is already taken, please choose another'
      }
    ],
    securityConstraints: [
      {
        type: SecurityConstraintType.INJECTION_PREVENTION,
        config: { enableSqlInjectionDetection: true },
        riskLevel: RiskLevel.HIGH,
        mitigationStrategies: ['parameter sanitization', 'parameterized queries']
      }
    ]
  };
}

// ===== MODULE METADATA =====

/**
 * PARLANT Phase 1 Parameter Validation Module Metadata
 */
export const PARLANT_PARAMETER_VALIDATION_MODULE_INFO = {
  name: 'PARLANT Phase 1 Parameter Validation',
  version: '1.0.0',
  description: 'Comprehensive parameter validation enabling conversational parameter verification and sanitization with enterprise-grade security',
  author: 'AIgent PARLANT Integration Team',
  license: 'Proprietary',
  dependencies: {
    '@nestjs/common': '^10.0.0',
    '@nestjs/core': '^10.0.0'
  },
  features: [
    'Conversational parameter interpretation and validation',
    'Multi-layer validation (syntax, semantics, business rules)',
    'Intelligent sanitization with user confirmation',
    'Natural language parameter format conversion',
    'Enterprise-grade security against injection attacks',
    'Sub-200ms parameter validation response times',
    'Adaptive validation based on user expertise level',
    'Comprehensive audit logging and compliance'
  ],
  services: {
    'ParameterValidationService': 'Core parameter validation with conversational AI integration',
    'NaturalLanguageParameterInterface': 'Conversational parameter collection and guidance',
    'AdvancedValidationFramework': 'Multi-layer validation with adaptive pipelines',
    'SecurityIntegrationService': 'Enterprise security and threat detection'
  },
  buildInfo: {
    buildDate: new Date().toISOString(),
    environment: 'production',
    optimization: 'enabled'
  }
} as const;