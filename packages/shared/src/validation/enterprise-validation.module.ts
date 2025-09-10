/**
 * Enterprise Validation Module - Comprehensive Input Validation & Sanitization Framework
 *
 * This module provides a complete enterprise-grade validation system for all Bytebot services
 * with advanced security features, centralized configuration, and service-specific customizations.
 *
 * Key Features:
 * - Multi-layer validation (syntax, semantics, security)
 * - Service-specific validation profiles
 * - Real-time threat detection and blocking
 * - Comprehensive audit logging
 * - Performance optimization
 * - Configuration-driven validation rules
 *
 * @fileoverview Enterprise validation framework for Bytebot platform
 * @version 3.0.0
 * @author Enterprise Security Validation Team
 */

import {
  Module,
  Global,
  DynamicModule,
  ArgumentMetadata,
} from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import {
  StandardizedValidationPipe,
  ValidationServiceType,
  ValidationSecurityLevel,
} from "../pipes/validation.standardized";
import {
  ValidationConfigurationService,
  ValidationProfileManager,
  SecurityThreatDetector,
  ValidationAuditLogger,
  ValidationMetricsCollector,
  ValidationCacheService,
} from "./services";

/**
 * Enterprise validation module configuration options
 */
export interface EnterpriseValidationModuleOptions {
  /** Service type for validation profile selection */
  serviceType: ValidationServiceType;

  /** Environment (development, staging, production) */
  environment?: string;

  /** Global security level override */
  globalSecurityLevel?: ValidationSecurityLevel;

  /** Enable comprehensive audit logging */
  enableAuditLogging?: boolean;

  /** Enable real-time metrics collection */
  enableMetrics?: boolean;

  /** Enable validation result caching for performance */
  enableCaching?: boolean;

  /** Custom validation rule overrides */
  customValidationRules?: Record<string, unknown>;

  /** Advanced threat detection configuration */
  threatDetectionConfig?: {
    enableAIThreatDetection?: boolean;
    threatSensitivity?: "low" | "medium" | "high" | "maximum";
    customThreatPatterns?: RegExp[];
  };

  /** Performance optimization settings */
  performanceConfig?: {
    enableAsyncValidation?: boolean;
    maxConcurrentValidations?: number;
    validationTimeout?: number;
  };
}

/**
 * Global Enterprise Validation Module
 * Provides centralized validation services across all Bytebot microservices
 */
@Global()
@Module({})
export class EnterpriseValidationModule {
  /**
   * Register the validation module for a specific service
   * @param options Service-specific validation configuration
   * @returns Configured dynamic module
   */
  static forService(options: EnterpriseValidationModuleOptions): DynamicModule {
    const {
      serviceType,
      environment = process.env.NODE_ENV || "development",
      globalSecurityLevel,
      enableAuditLogging = environment !== "development",
      enableMetrics = true,
      enableCaching = environment === "production",
      customValidationRules = {},
      threatDetectionConfig = {},
      performanceConfig = {},
    } = options;

    return {
      module: EnterpriseValidationModule,
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: [".env.local", ".env"],
        }),
      ],
      providers: [
        // Core validation services
        {
          provide: "VALIDATION_CONFIG",
          useValue: {
            serviceType,
            environment,
            globalSecurityLevel,
            enableAuditLogging,
            enableMetrics,
            enableCaching,
            customValidationRules,
            threatDetectionConfig,
            performanceConfig,
          },
        },
        ValidationConfigurationService,
        ValidationProfileManager,
        SecurityThreatDetector,
        ValidationAuditLogger,
        ValidationMetricsCollector,
        ValidationCacheService,

        // Service-specific validation pipe
        {
          provide: "SERVICE_VALIDATION_PIPE",
          useFactory: (
            configService: ValidationConfigurationService,
            profileManager: ValidationProfileManager,
            threatDetector: SecurityThreatDetector,
            auditLogger: ValidationAuditLogger,
            metricsCollector: ValidationMetricsCollector,
            cacheService: ValidationCacheService,
          ) => {
            return new EnterpriseValidationPipe({
              configService,
              profileManager,
              threatDetector,
              auditLogger,
              metricsCollector,
              cacheService,
              serviceType,
              environment,
              globalSecurityLevel,
            });
          },
          inject: [
            ValidationConfigurationService,
            ValidationProfileManager,
            SecurityThreatDetector,
            ValidationAuditLogger,
            ValidationMetricsCollector,
            ValidationCacheService,
          ],
        },
      ],
      exports: [
        ValidationConfigurationService,
        ValidationProfileManager,
        SecurityThreatDetector,
        ValidationAuditLogger,
        ValidationMetricsCollector,
        ValidationCacheService,
        "SERVICE_VALIDATION_PIPE",
      ],
    };
  }

  /**
   * Register validation module with default enterprise configuration
   * @param serviceType Target service type
   * @returns Configured dynamic module with enterprise defaults
   */
  static forEnterprise(serviceType: ValidationServiceType): DynamicModule {
    const environment = process.env.NODE_ENV || "development";

    // Enterprise-grade default configuration
    const enterpriseOptions: EnterpriseValidationModuleOptions = {
      serviceType,
      environment,
      globalSecurityLevel:
        environment === "production"
          ? ValidationSecurityLevel._MAXIMUM
          : ValidationSecurityLevel._HIGH,
      enableAuditLogging: true,
      enableMetrics: true,
      enableCaching: environment === "production",
      threatDetectionConfig: {
        enableAIThreatDetection: true,
        threatSensitivity: "high",
        customThreatPatterns: [
          // Advanced pattern detection for enterprise environments
          /(?:union|select|insert|update|delete|drop|create|alter|exec|execute)[\s/*]*(?:[[()].*?[)\]]|[^\s;]+)/gi,
          /<(?:script|iframe|object|embed|applet|form|input|svg)[\s\S]*?>/gi,
          /(?:javascript|vbscript|data:text\/html|expression\(|@import|document\.|window\.|eval\()/gi,
          // eslint-disable-next-line no-control-regex
          /(?:\${|<%|\{\{|__\w+__|\.\.\/|\.\.\\|\x00|\r\n\r\n)/g,
        ],
      },
      performanceConfig: {
        enableAsyncValidation: true,
        maxConcurrentValidations: 100,
        validationTimeout: 5000, // 5 seconds
      },
      customValidationRules: {
        // Enterprise-specific validation rules
        strictFilePathValidation: true,
        enhancedXSSDetection: true,
        advancedSQLInjectionProtection: true,
        commandInjectionPrevention: true,
        templateInjectionProtection: true,
        pathTraversalPrevention: true,
        nullByteProtection: true,
        unicodeSecurityValidation: true,
        csvInjectionProtection: true,
        ldapInjectionProtection: true,
        xmlExternalEntityProtection: true,
        deserializationAttackProtection: true,
      },
    };

    return this.forService(enterpriseOptions);
  }

  /**
   * Register validation module for development environment
   * @param serviceType Target service type
   * @returns Configured dynamic module with development-friendly settings
   */
  static forDevelopment(serviceType: ValidationServiceType): DynamicModule {
    return this.forService({
      serviceType,
      environment: "development",
      globalSecurityLevel: ValidationSecurityLevel._DEVELOPMENT,
      enableAuditLogging: false,
      enableMetrics: true,
      enableCaching: false,
      threatDetectionConfig: {
        enableAIThreatDetection: false,
        threatSensitivity: "low",
      },
      performanceConfig: {
        enableAsyncValidation: false,
        maxConcurrentValidations: 10,
        validationTimeout: 10000, // 10 seconds
      },
    });
  }

  /**
   * Register validation module for testing environment
   * @param serviceType Target service type
   * @returns Configured dynamic module with testing-optimized settings
   */
  static forTesting(serviceType: ValidationServiceType): DynamicModule {
    return this.forService({
      serviceType,
      environment: "test",
      globalSecurityLevel: ValidationSecurityLevel._STANDARD,
      enableAuditLogging: false,
      enableMetrics: false,
      enableCaching: false,
      threatDetectionConfig: {
        enableAIThreatDetection: false,
        threatSensitivity: "medium",
      },
      performanceConfig: {
        enableAsyncValidation: false,
        maxConcurrentValidations: 1,
        validationTimeout: 1000, // 1 second
      },
    });
  }
}

/**
 * Enhanced Enterprise Validation Pipe
 * Combines all validation services for comprehensive input validation
 */
export class EnterpriseValidationPipe extends StandardizedValidationPipe {
  constructor(
    private readonly options: {
      configService: ValidationConfigurationService;
      profileManager: ValidationProfileManager;
      threatDetector: SecurityThreatDetector;
      auditLogger: ValidationAuditLogger;
      metricsCollector: ValidationMetricsCollector;
      cacheService: ValidationCacheService;
      serviceType: ValidationServiceType;
      environment: string;
      globalSecurityLevel?: ValidationSecurityLevel;
    },
  ) {
    // Initialize base validation pipe with enhanced configuration
    const profile = options.profileManager.getProfile(
      options.serviceType,
      options.environment,
      options.globalSecurityLevel,
    );

    super(options.serviceType, options.environment, profile);
  }

  /**
   * Enhanced transform method with enterprise features
   */
  async transform(
    value: unknown,
    metadata: ArgumentMetadata,
  ): Promise<unknown> {
    const operationId = `enterprise-validation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    try {
      // Check cache for previously validated inputs (if enabled)
      if (this.options.cacheService.isCachingEnabled()) {
        const cachedResult =
          await this.options.cacheService.getCachedValidation(value, metadata);
        if (cachedResult) {
          this.options.metricsCollector.recordCacheHit(operationId);
          return cachedResult;
        }
        this.options.metricsCollector.recordCacheMiss(operationId);
      }

      // Perform advanced threat detection
      const threatAnalysis = this.options.threatDetector.analyzeThreat(value, {
        serviceType: this.options.serviceType,
        environment: this.options.environment,
        operationId,
      });

      if (threatAnalysis.isHighRisk) {
        await this.options.auditLogger.logSecurityThreat(threatAnalysis);
        throw new Error(
          `High-risk security threat detected: ${threatAnalysis.threatTypes.join(", ")}`,
        );
      }

      // Execute base validation with enhanced error handling
      const validatedResult = await super.transform(value, metadata);

      // Cache successful validation result (if enabled)
      if (this.options.cacheService.isCachingEnabled()) {
        await this.options.cacheService.cacheValidationResult(
          value,
          metadata,
          validatedResult,
        );
      }

      // Record success metrics
      const processingTime = Date.now() - startTime;
      this.options.metricsCollector.recordValidationSuccess({
        operationId,
        serviceType: this.options.serviceType,
        processingTimeMs: processingTime,
        inputSize: JSON.stringify(value).length,
        threatRiskScore: threatAnalysis.riskScore,
      });

      return validatedResult;
    } catch (err) {
      const processingTime = Date.now() - startTime;

      // Log validation failure with detailed context
      await this.options.auditLogger.logValidationFailure({
        operationId,
        serviceType: this.options.serviceType,
        error: err as Error,
        inputValue: value,
        metadata,
        processingTimeMs: processingTime,
      });

      // Record failure metrics
      this.options.metricsCollector.recordValidationFailure({
        operationId,
        serviceType: this.options.serviceType,
        errorType: (err as Error).constructor.name,
        processingTimeMs: processingTime,
      });

      throw err;
    }
  }
}

export default EnterpriseValidationModule;
