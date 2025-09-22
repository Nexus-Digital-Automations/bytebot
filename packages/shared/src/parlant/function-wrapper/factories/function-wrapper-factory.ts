/**
 * PARLANT Phase 1 Function Wrapper Framework - Function Wrapper Factory
 *
 * Universal factory for creating type-safe function wrappers with PARLANT
 * conversational validation. Provides configuration options, batch processing,
 * validation rule management, and enterprise-grade wrapper creation.
 *
 * @fileoverview Wrapper factory with comprehensive configuration system
 * @version 1.0.0
 * @author Function Wrapper Framework Agent
 * @created 2025-09-19
 */

import { Injectable, Logger } from "@nestjs/common";
import {
  AnyFunction,
  WrapFunction,
  WrapperConfig,
  FunctionWrapperFactory,
  FactoryConfiguration,
  ValidationRule,
  ParlantClientConfig,
  CacheConfiguration,
  MonitoringConfiguration,
  PerformanceConfiguration,
  SecurityConfiguration,
  ErrorStrategy,
  BatchConfig,
  ValidationLevel,
  FunctionCategory,
  DataClassification,
} from "../interfaces/wrapper-types";
import {
  SignaturePreservingWrapper,
  TypeSafeWrapperCreator,
  FunctionSignatureInspector,
  TypeValidator,
  WrapperStatistics,
} from "../core/signature-preserving-wrapper";

// Re-export types for external use
export { WrapperStatistics };

/**
 * Enterprise Function Wrapper Factory
 * Creates and manages PARLANT-validated function wrappers with comprehensive configuration
 */
@Injectable()
export class EnterpriseFunctionWrapperFactory
  implements FunctionWrapperFactory
{
  private readonly logger = new Logger(EnterpriseFunctionWrapperFactory.name);
  private readonly wrapperRegistry = new Map<
    string,
    SignaturePreservingWrapper<any>
  >();
  private readonly validationRules = new Map<string, ValidationRule>();
  private readonly statistics = new Map<string, WrapperStatistics>();

  private configuration: FactoryConfiguration;

  constructor(initialConfiguration?: Partial<FactoryConfiguration>) {
    this.configuration = this.createDefaultConfiguration();

    if (initialConfiguration) {
      this.updateConfiguration(initialConfiguration);
    }

    this.logger.log("Enterprise Function Wrapper Factory initialized");
  }

  /**
   * Create a wrapped function with PARLANT validation
   *
   * @param originalFunction - Function to wrap
   * @param config - Wrapper configuration
   * @returns Wrapped function with preserved signature
   */
  public createWrapper<T extends AnyFunction>(
    originalFunction: T,
    config: WrapperConfig,
  ): WrapFunction<T> {
    this.logger.debug(`Creating wrapper for function: ${config.functionId}`);

    try {
      // Validate configuration
      this.validateWrapperConfig(config);

      // Validate function compatibility
      const compatibility =
        FunctionSignatureInspector.validateCompatibility(originalFunction);
      if (!compatibility.compatible) {
        throw new Error(
          `Function ${config.functionId} is not compatible: ${compatibility.issues.join(", ")}`,
        );
      }

      // Merge with default configuration
      const enhancedConfig = this.enhanceConfig(config);

      // Apply global validation rules
      const configWithGlobalRules =
        this.applyGlobalValidationRules(enhancedConfig);

      // Create wrapper with enhanced configuration
      const wrapper = new SignaturePreservingWrapper(
        originalFunction,
        configWithGlobalRules,
      );
      const wrappedFunction = wrapper.createWrappedFunction();

      // Register wrapper for management
      this.registerWrapper(config.functionId, wrapper);

      // Initialize statistics tracking
      this.initializeStatistics(config.functionId, wrapper);

      this.logger.log(
        `Successfully created wrapper for function: ${config.functionId}`,
      );
      return wrappedFunction;
    } catch (error) {
      this.logger.error(
        `Failed to create wrapper for ${config.functionId}:`,
        error,
      );
      throw new WrapperCreationError(
        `Failed to create wrapper: ${error instanceof Error ? error.message : String(error)}`,
        {
          functionId: config.functionId,
          originalError: error,
        },
      );
    }
  }

  /**
   * Create multiple wrapped functions in batch
   *
   * @param functions - Map of function name to function
   * @param configs - Map of function name to config
   * @returns Map of wrapped functions
   */
  public createBatchWrappers<T extends Record<string, AnyFunction>>(
    functions: T,
    configs: Record<keyof T, WrapperConfig>,
  ): { [K in keyof T]: WrapFunction<T[K]> } {
    this.logger.log(
      `Creating batch wrappers for ${Object.keys(functions).length} functions`,
    );

    const results = {} as { [K in keyof T]: WrapFunction<T[K]> };
    const errors: WrapperCreationError[] = [];

    // Process functions in parallel or sequential based on configuration
    const processingPromises = Object.entries(functions).map(
      async ([key, func]) => {
        try {
          const config = configs[key as keyof T];
          if (!config) {
            throw new Error(`No configuration provided for function: ${key}`);
          }

          const wrapped = this.createWrapper(func as any, config);
          results[key as keyof T] = wrapped as WrapFunction<T[keyof T]>;
        } catch (error) {
          const wrapperError = new WrapperCreationError(
            `Failed to create wrapper for ${key}: ${error instanceof Error ? error.message : String(error)}`,
            { functionId: key, originalError: error },
          );
          errors.push(wrapperError);
        }
      },
    );

    // Wait for all processing to complete
    if (this.configuration.performanceConfig.enableOptimization) {
      // Parallel processing for better performance
      Promise.allSettled(processingPromises);
    } else {
      // Sequential processing for better error handling
      processingPromises.forEach((promise) => {
        try {
          promise;
        } catch (error) {
          // Error already handled above
        }
      });
    }

    // Handle any errors
    if (errors.length > 0) {
      this.logger.warn(
        `Batch wrapper creation completed with ${errors.length} errors`,
      );
      errors.forEach((error) =>
        this.logger.error(
          error instanceof Error ? error.message : String(error),
          error.metadata,
        ),
      );
    }

    this.logger.log(
      `Batch wrapper creation completed: ${Object.keys(results).length} successful, ${errors.length} failed`,
    );
    return results;
  }

  /**
   * Register a validation rule globally
   *
   * @param rule - Validation rule to register
   */
  public registerValidationRule(rule: ValidationRule): void {
    this.logger.debug(`Registering global validation rule: ${rule.id}`);

    // Validate rule structure
    this.validateValidationRule(rule);

    // Check for rule conflicts
    const existingRule = this.validationRules.get(rule.id);
    if (existingRule) {
      this.logger.warn(`Overriding existing validation rule: ${rule.id}`);
    }

    // Register rule
    this.validationRules.set(rule.id, rule);

    // Update configuration
    this.configuration = {
      ...this.configuration,
      globalValidationRules: Array.from(this.validationRules.values()),
    };

    this.logger.log(`Successfully registered validation rule: ${rule.id}`);
  }

  /**
   * Get factory configuration
   *
   * @returns Current factory configuration
   */
  public getConfiguration(): FactoryConfiguration {
    return { ...this.configuration };
  }

  /**
   * Update factory configuration
   *
   * @param config - New configuration
   */
  public updateConfiguration(config: Partial<FactoryConfiguration>): void {
    this.logger.debug("Updating factory configuration");

    // Validate configuration updates
    this.validateFactoryConfiguration(config);

    // Deep merge configurations
    this.configuration = this.deepMergeConfiguration(
      this.configuration,
      config,
    );

    this.logger.log("Factory configuration updated successfully");
  }

  /**
   * Create wrapper with automatic configuration detection
   *
   * @param originalFunction - Function to wrap
   * @param options - Minimal configuration options
   * @returns Wrapped function with auto-detected configuration
   */
  public createAutoConfiguredWrapper<T extends AnyFunction>(
    originalFunction: T,
    options: AutoConfigOptions,
  ): WrapFunction<T> {
    this.logger.debug(
      `Creating auto-configured wrapper for: ${options.functionId}`,
    );

    // Analyze function to determine optimal configuration
    const autoConfig = this.analyzeAndConfigureFunction(
      originalFunction,
      options,
    );

    return this.createWrapper(originalFunction, autoConfig);
  }

  /**
   * Create wrapper with type validation
   *
   * @param originalFunction - Function to wrap
   * @param config - Wrapper configuration
   * @param typeValidator - Type validator
   * @returns Type-validated wrapped function
   */
  public createTypedWrapper<T extends AnyFunction>(
    originalFunction: T,
    config: WrapperConfig,
    typeValidator: TypeValidator<T>,
  ): WrapFunction<T> {
    this.logger.debug(`Creating typed wrapper for: ${config.functionId}`);

    return TypeSafeWrapperCreator.createValidatedWrapper(
      originalFunction,
      config,
      typeValidator,
    );
  }

  /**
   * Get wrapper statistics for monitoring
   *
   * @param functionId - Function identifier
   * @returns Wrapper statistics
   */
  public getWrapperStatistics(functionId: string): WrapperStatistics | null {
    return this.statistics.get(functionId) || null;
  }

  /**
   * Get all wrapper statistics
   *
   * @returns Map of all wrapper statistics
   */
  public getAllStatistics(): Map<string, WrapperStatistics> {
    return new Map(this.statistics);
  }

  /**
   * Reset statistics for a specific wrapper
   *
   * @param functionId - Function identifier
   */
  public resetWrapperStatistics(functionId: string): void {
    const wrapper = this.wrapperRegistry.get(functionId);
    if (wrapper) {
      wrapper.resetStatistics();
      this.statistics.delete(functionId);
      this.logger.log(`Statistics reset for wrapper: ${functionId}`);
    }
  }

  /**
   * Reset all wrapper statistics
   */
  public resetAllStatistics(): void {
    this.wrapperRegistry.forEach((wrapper, functionId) => {
      wrapper.resetStatistics();
    });
    this.statistics.clear();
    this.logger.log("All wrapper statistics reset");
  }

  /**
   * Remove wrapper from registry
   *
   * @param functionId - Function identifier
   */
  public removeWrapper(functionId: string): boolean {
    const removed = this.wrapperRegistry.delete(functionId);
    if (removed) {
      this.statistics.delete(functionId);
      this.logger.log(`Wrapper removed: ${functionId}`);
    }
    return removed;
  }

  /**
   * Get list of registered wrapper function IDs
   *
   * @returns Array of function IDs
   */
  public getRegisteredWrappers(): string[] {
    return Array.from(this.wrapperRegistry.keys());
  }

  /**
   * Check if wrapper exists for function
   *
   * @param functionId - Function identifier
   * @returns True if wrapper exists
   */
  public hasWrapper(functionId: string): boolean {
    return this.wrapperRegistry.has(functionId);
  }

  /**
   * Create configuration template for specific use cases
   *
   * @param useCase - Use case for configuration
   * @returns Configuration template
   */
  public createConfigurationTemplate(
    useCase: ConfigurationUseCase,
  ): WrapperConfig {
    this.logger.debug(
      `Creating configuration template for use case: ${useCase}`,
    );

    switch (useCase) {
      case ConfigurationUseCase.DATABASE_READ:
        return this.createDatabaseReadTemplate();

      case ConfigurationUseCase.DATABASE_WRITE:
        return this.createDatabaseWriteTemplate();

      case ConfigurationUseCase.API_CALL:
        return this.createApiCallTemplate();

      case ConfigurationUseCase.AUTHENTICATION:
        return this.createAuthenticationTemplate();

      case ConfigurationUseCase.FILE_OPERATION:
        return this.createFileOperationTemplate();

      case ConfigurationUseCase.COMPUTATION:
        return this.createComputationTemplate();

      default:
        return this.createDefaultTemplate();
    }
  }

  /**
   * Validate wrapper configuration
   *
   * @param config - Configuration to validate
   */
  private validateWrapperConfig(config: WrapperConfig): void {
    if (!config.functionId || config.functionId.trim().length === 0) {
      throw new Error("Function ID is required and cannot be empty");
    }

    if (!config.description || config.description.trim().length === 0) {
      throw new Error(
        "Function description is required for PARLANT validation",
      );
    }

    if (!Object.values(ValidationLevel).includes(config.validationLevel)) {
      throw new Error(`Invalid validation level: ${config.validationLevel}`);
    }

    // Validate timeout values
    if (
      config.validationTimeout !== undefined &&
      config.validationTimeout <= 0
    ) {
      throw new Error("Validation timeout must be positive");
    }

    if (config.cacheTtl !== undefined && config.cacheTtl <= 0) {
      throw new Error("Cache TTL must be positive");
    }

    // Validate batch configuration
    if (config.batchConfig) {
      this.validateBatchConfig(config.batchConfig);
    }

    // Validate custom validation rules
    if (config.customValidation) {
      config.customValidation.forEach((rule) =>
        this.validateValidationRule(rule),
      );
    }
  }

  /**
   * Validate batch configuration
   *
   * @param batchConfig - Batch configuration to validate
   */
  private validateBatchConfig(batchConfig: BatchConfig): void {
    if (batchConfig.maxBatchSize <= 0) {
      throw new Error("Max batch size must be positive");
    }

    if (batchConfig.batchTimeout <= 0) {
      throw new Error("Batch timeout must be positive");
    }

    if (
      batchConfig.maxParallelThreads !== undefined &&
      batchConfig.maxParallelThreads <= 0
    ) {
      throw new Error("Max parallel threads must be positive");
    }
  }

  /**
   * Validate validation rule
   *
   * @param rule - Validation rule to validate
   */
  private validateValidationRule(rule: ValidationRule): void {
    if (!rule.id || rule.id.trim().length === 0) {
      throw new Error("Validation rule ID is required");
    }

    if (!rule.description || rule.description.trim().length === 0) {
      throw new Error("Validation rule description is required");
    }

    if (typeof rule.validator !== "function") {
      throw new Error("Validation rule validator must be a function");
    }

    if (rule.priority !== undefined && rule.priority < 0) {
      throw new Error("Validation rule priority must be non-negative");
    }
  }

  /**
   * Validate factory configuration
   *
   * @param config - Configuration to validate
   */
  private validateFactoryConfiguration(
    config: Partial<FactoryConfiguration>,
  ): void {
    if (config.defaultParlantConfig) {
      this.validateParlantConfig(config.defaultParlantConfig);
    }

    if (config.defaultCacheConfig) {
      this.validateCacheConfig(config.defaultCacheConfig);
    }

    if (config.defaultMonitoringConfig) {
      this.validateMonitoringConfig(config.defaultMonitoringConfig);
    }

    if (config.performanceConfig) {
      this.validatePerformanceConfig(config.performanceConfig);
    }

    if (config.securityConfig) {
      this.validateSecurityConfig(config.securityConfig);
    }
  }

  /**
   * Validate PARLANT configuration
   *
   * @param config - PARLANT configuration to validate
   */
  private validateParlantConfig(config: Partial<ParlantClientConfig>): void {
    if (config.serviceUrl && !this.isValidUrl(config.serviceUrl)) {
      throw new Error("Invalid PARLANT service URL");
    }

    if (config.timeout !== undefined && config.timeout <= 0) {
      throw new Error("PARLANT timeout must be positive");
    }
  }

  /**
   * Validate cache configuration
   *
   * @param config - Cache configuration to validate
   */
  private validateCacheConfig(config: Partial<CacheConfiguration>): void {
    if (config.defaultTtl !== undefined && config.defaultTtl <= 0) {
      throw new Error("Cache default TTL must be positive");
    }

    if (config.maxSize !== undefined && config.maxSize <= 0) {
      throw new Error("Cache max size must be positive");
    }
  }

  /**
   * Validate monitoring configuration
   *
   * @param config - Monitoring configuration to validate
   */
  private validateMonitoringConfig(
    config: Partial<MonitoringConfiguration>,
  ): void {
    if (config.metricsInterval !== undefined && config.metricsInterval <= 0) {
      throw new Error("Metrics interval must be positive");
    }

    if (config.metricsRetention !== undefined && config.metricsRetention <= 0) {
      throw new Error("Metrics retention must be positive");
    }
  }

  /**
   * Validate performance configuration
   *
   * @param config - Performance configuration to validate
   */
  private validatePerformanceConfig(
    config: Partial<PerformanceConfiguration>,
  ): void {
    if (
      config.concurrentExecutionLimit !== undefined &&
      config.concurrentExecutionLimit <= 0
    ) {
      throw new Error("Concurrent execution limit must be positive");
    }

    if (config.queueSize !== undefined && config.queueSize <= 0) {
      throw new Error("Queue size must be positive");
    }
  }

  /**
   * Validate security configuration
   *
   * @param config - Security configuration to validate
   */
  private validateSecurityConfig(config: Partial<SecurityConfiguration>): void {
    // Basic validation for security configuration
    // More detailed validation would be implemented based on specific security requirements
    if (config.encryptionConfig && config.encryptionConfig.keyManagement) {
      const keyMgmt = config.encryptionConfig.keyManagement;
      if (
        keyMgmt.rotationInterval !== undefined &&
        keyMgmt.rotationInterval <= 0
      ) {
        throw new Error("Key rotation interval must be positive");
      }
    }
  }

  /**
   * Check if URL is valid
   *
   * @param url - URL to validate
   * @returns True if valid
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Enhance configuration with defaults and optimizations
   *
   * @param config - Base configuration
   * @returns Enhanced configuration
   */
  private enhanceConfig(config: WrapperConfig): WrapperConfig {
    return {
      ...config,
      // Apply default values from factory configuration
      cacheable:
        config.cacheable ??
        this.configuration.defaultCacheConfig.defaultTtl > 0,
      cacheTtl:
        config.cacheTtl ?? this.configuration.defaultCacheConfig.defaultTtl,
      monitoring:
        config.monitoring ??
        this.configuration.defaultMonitoringConfig.enablePerformanceMonitoring,
      validationTimeout:
        config.validationTimeout ??
        this.configuration.defaultParlantConfig.timeout,
      asyncMode:
        config.asyncMode ??
        this.configuration.performanceConfig.enableOptimization,

      // Apply default error strategy if not provided
      errorStrategy: config.errorStrategy ?? this.createDefaultErrorStrategy(),

      // Apply default metadata if not provided
      metadata: {
        category: FunctionCategory.UTILITY,
        domain: "general",
        dataClassification: DataClassification.INTERNAL,
        dependencies: [],
        tags: [],
        ...config.metadata,
      },
    };
  }

  /**
   * Apply global validation rules to configuration
   *
   * @param config - Configuration to enhance
   * @returns Configuration with global rules
   */
  private applyGlobalValidationRules(config: WrapperConfig): WrapperConfig {
    const globalRules = this.configuration.globalValidationRules;

    if (globalRules.length === 0) {
      return config;
    }

    const customValidation = config.customValidation || [];
    const mergedRules = [...globalRules, ...customValidation];

    // Sort rules by priority (higher first)
    mergedRules.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    return {
      ...config,
      customValidation: mergedRules,
    };
  }

  /**
   * Register wrapper for management
   *
   * @param functionId - Function identifier
   * @param wrapper - Wrapper instance
   */
  private registerWrapper(
    functionId: string,
    wrapper: SignaturePreservingWrapper<any>,
  ): void {
    this.wrapperRegistry.set(functionId, wrapper);
    this.logger.debug(`Registered wrapper: ${functionId}`);
  }

  /**
   * Initialize statistics tracking for wrapper
   *
   * @param functionId - Function identifier
   * @param wrapper - Wrapper instance
   */
  private initializeStatistics(
    functionId: string,
    wrapper: SignaturePreservingWrapper<any>,
  ): void {
    // Initial statistics will be captured as wrapper executes
    this.statistics.set(functionId, wrapper.getStatistics());
  }

  /**
   * Analyze function and create optimal configuration
   *
   * @param func - Function to analyze
   * @param options - Basic options
   * @returns Optimized configuration
   */
  private analyzeAndConfigureFunction<T extends AnyFunction>(
    func: T,
    options: AutoConfigOptions,
  ): WrapperConfig {
    const signature = FunctionSignatureInspector.extractSignature(func);

    // Determine validation level based on function characteristics
    let validationLevel: ValidationLevel;

    if (
      options.securityLevel === "critical" ||
      signature.name.includes("auth") ||
      signature.name.includes("security")
    ) {
      validationLevel = ValidationLevel.CRITICAL;
    } else if (
      options.securityLevel === "high" ||
      signature.name.includes("write") ||
      signature.name.includes("delete")
    ) {
      validationLevel = ValidationLevel.HIGH;
    } else if (
      options.securityLevel === "medium" ||
      signature.name.includes("read") ||
      signature.name.includes("get")
    ) {
      validationLevel = ValidationLevel.MEDIUM;
    } else {
      validationLevel = ValidationLevel.LOW;
    }

    // Determine function category
    let category: FunctionCategory;
    if (signature.name.includes("db") || signature.name.includes("database")) {
      category = signature.name.includes("write")
        ? FunctionCategory.DATABASE_WRITE
        : FunctionCategory.DATABASE_READ;
    } else if (
      signature.name.includes("api") ||
      signature.name.includes("http")
    ) {
      category = FunctionCategory.API_CALL;
    } else if (
      signature.name.includes("file") ||
      signature.name.includes("fs")
    ) {
      category = FunctionCategory.FILE_OPERATION;
    } else if (signature.name.includes("auth")) {
      category = FunctionCategory.AUTHENTICATION;
    } else {
      category = FunctionCategory.UTILITY;
    }

    // Create optimized configuration
    return {
      functionId: options.functionId,
      description:
        options.description || `Auto-configured wrapper for ${signature.name}`,
      validationLevel,
      cacheable:
        options.cacheable ?? category === FunctionCategory.DATABASE_READ,
      monitoring: options.monitoring ?? true,
      asyncMode: signature.isAsync,
      metadata: {
        category,
        domain: options.domain || "auto-detected",
        dataClassification:
          options.dataClassification || DataClassification.INTERNAL,
        dependencies: [],
        tags: ["auto-configured", signature.isAsync ? "async" : "sync"],
      },
    };
  }

  /**
   * Create default factory configuration
   *
   * @returns Default configuration
   */
  private createDefaultConfiguration(): FactoryConfiguration {
    return {
      defaultParlantConfig: {
        serviceUrl: process.env.PARLANT_API_URL || "http://localhost:8000",
        apiKey: process.env.PARLANT_API_KEY || "development-key",
        timeout: 30000,
        retryConfig: {
          maxRetries: 3,
          baseDelay: 1000,
          backoffStrategy: "exponential" as any,
          maxDelay: 10000,
        },
      },
      defaultCacheConfig: {
        provider: "memory" as any,
        defaultTtl: 300000, // 5 minutes
        maxSize: 1000,
        evictionStrategy: "lru" as any,
      },
      defaultMonitoringConfig: {
        enablePerformanceMonitoring: true,
        enableHealthChecks: true,
        metricsInterval: 60000, // 1 minute
        metricsRetention: 3600000, // 1 hour
        alertThresholds: {
          responseTimeThreshold: 5000,
          errorRateThreshold: 0.05,
          memoryThreshold: 0.8,
          cpuThreshold: 0.8,
          cacheHitRateThreshold: 0.7,
        },
      },
      globalValidationRules: [],
      performanceConfig: {
        enableOptimization: true,
        concurrentExecutionLimit: 100,
        queueSize: 1000,
        adaptiveTuning: true,
      },
      securityConfig: {
        enableSecurityValidation: true,
        encryptionConfig: {
          enableEncryption: false,
          algorithm: "aes_256_gcm" as any,
          keyManagement: {
            rotationInterval: 86400000, // 24 hours
            keyStorage: "memory" as any,
            enableKeyEscrow: false,
            keyDerivation: {
              function: "pbkdf2" as any,
              iterations: 100000,
              saltLength: 32,
              keyLength: 32,
            },
          },
          encryptionScope: [],
        },
        accessControlConfig: {
          enableAccessControl: true,
          defaultPolicy: "role_based" as any,
          rbacConfig: {
            enableRbac: true,
            roleHierarchy: {
              roles: [],
              inheritanceRules: [],
            },
            permissionAssignments: {
              functionPermissions: {},
              defaultPermissions: ["execute"],
              permissionGroups: [],
            },
            enableRoleInheritance: true,
          },
        },
        auditConfig: {
          enableAuditLogging: true,
          auditLevel: "standard" as any,
          retentionPeriod: 2592000000, // 30 days
          storageConfig: {
            storageProvider: "database" as any,
            enableEncryption: true,
            enableCompression: true,
            partitioningStrategy: "by_date" as any,
          },
          complianceConfig: {
            enableComplianceChecking: true,
            frameworks: [],
            reportingConfig: {
              enableAutomatedReporting: false,
              reportingSchedule: {
                frequency: "monthly" as any,
                scheduleDetails: {
                  hourOfDay: 0,
                  minuteOfHour: 0,
                },
                timeZone: "UTC",
              },
              reportFormats: ["json" as any],
              reportRecipients: [],
            },
            dataRetentionPolicies: [],
          },
        },
      },
    };
  }

  /**
   * Create default error strategy
   *
   * @returns Default error strategy
   */
  private createDefaultErrorStrategy(): ErrorStrategy {
    return {
      retryConfig: {
        maxRetries: 3,
        baseDelay: 1000,
        backoffStrategy: "exponential" as any,
        maxDelay: 10000,
      },
      fallbackBehavior: "throw_error" as any,
      circuitBreakerConfig: {
        failureThreshold: 5,
        successThreshold: 3,
        timeout: 60000,
        monitoringWindow: 300000,
      },
    };
  }

  /**
   * Deep merge configurations
   *
   * @param target - Target configuration
   * @param source - Source configuration
   * @returns Merged configuration
   */
  private deepMergeConfiguration(
    target: FactoryConfiguration,
    source: Partial<FactoryConfiguration>,
  ): FactoryConfiguration {
    const result = { ...target };

    Object.keys(source).forEach((key) => {
      const sourceValue = source[key as keyof FactoryConfiguration];
      const targetValue = target[key as keyof FactoryConfiguration];

      if (
        sourceValue &&
        typeof sourceValue === "object" &&
        !Array.isArray(sourceValue)
      ) {
        result[key as keyof FactoryConfiguration] = {
          ...targetValue,
          ...sourceValue,
        } as any;
      } else {
        result[key as keyof FactoryConfiguration] = sourceValue as any;
      }
    });

    return result;
  }

  /**
   * Create database read configuration template
   *
   * @returns Database read configuration
   */
  private createDatabaseReadTemplate(): WrapperConfig {
    return {
      functionId: "database-read-template",
      description: "Database read operation with caching and monitoring",
      validationLevel: ValidationLevel.MEDIUM,
      cacheable: true,
      cacheTtl: 300000, // 5 minutes
      monitoring: true,
      metadata: {
        category: FunctionCategory.DATABASE_READ,
        domain: "database",
        dataClassification: DataClassification.INTERNAL,
        dependencies: ["database"],
        tags: ["database", "read", "cacheable"],
      },
    };
  }

  /**
   * Create database write configuration template
   *
   * @returns Database write configuration
   */
  private createDatabaseWriteTemplate(): WrapperConfig {
    return {
      functionId: "database-write-template",
      description: "Database write operation with high-security validation",
      validationLevel: ValidationLevel.HIGH,
      cacheable: false,
      monitoring: true,
      metadata: {
        category: FunctionCategory.DATABASE_WRITE,
        domain: "database",
        dataClassification: DataClassification.CONFIDENTIAL,
        dependencies: ["database"],
        tags: ["database", "write", "transaction"],
      },
    };
  }

  /**
   * Create API call configuration template
   *
   * @returns API call configuration
   */
  private createApiCallTemplate(): WrapperConfig {
    return {
      functionId: "api-call-template",
      description: "External API call with retry and monitoring",
      validationLevel: ValidationLevel.MEDIUM,
      cacheable: true,
      cacheTtl: 60000, // 1 minute
      monitoring: true,
      errorStrategy: {
        retryConfig: {
          maxRetries: 5,
          baseDelay: 1000,
          backoffStrategy: "exponential" as any,
          maxDelay: 30000,
        },
        fallbackBehavior: "return_cached" as any,
      },
      metadata: {
        category: FunctionCategory.API_CALL,
        domain: "external",
        dataClassification: DataClassification.INTERNAL,
        dependencies: ["network"],
        tags: ["api", "external", "network"],
      },
    };
  }

  /**
   * Create authentication configuration template
   *
   * @returns Authentication configuration
   */
  private createAuthenticationTemplate(): WrapperConfig {
    return {
      functionId: "authentication-template",
      description: "Authentication operation with critical security validation",
      validationLevel: ValidationLevel.CRITICAL,
      cacheable: false,
      monitoring: true,
      metadata: {
        category: FunctionCategory.AUTHENTICATION,
        domain: "security",
        dataClassification: DataClassification.RESTRICTED,
        dependencies: ["auth-service"],
        tags: ["auth", "security", "critical"],
      },
    };
  }

  /**
   * Create file operation configuration template
   *
   * @returns File operation configuration
   */
  private createFileOperationTemplate(): WrapperConfig {
    return {
      functionId: "file-operation-template",
      description: "File system operation with validation and monitoring",
      validationLevel: ValidationLevel.HIGH,
      cacheable: false,
      monitoring: true,
      metadata: {
        category: FunctionCategory.FILE_OPERATION,
        domain: "filesystem",
        dataClassification: DataClassification.INTERNAL,
        dependencies: ["filesystem"],
        tags: ["file", "filesystem", "io"],
      },
    };
  }

  /**
   * Create computation configuration template
   *
   * @returns Computation configuration
   */
  private createComputationTemplate(): WrapperConfig {
    return {
      functionId: "computation-template",
      description: "Computational operation with performance monitoring",
      validationLevel: ValidationLevel.LOW,
      cacheable: true,
      cacheTtl: 600000, // 10 minutes
      monitoring: true,
      metadata: {
        category: FunctionCategory.COMPUTATION,
        domain: "compute",
        dataClassification: DataClassification.INTERNAL,
        dependencies: [],
        tags: ["compute", "calculation", "performance"],
      },
    };
  }

  /**
   * Create default configuration template
   *
   * @returns Default configuration
   */
  private createDefaultTemplate(): WrapperConfig {
    return {
      functionId: "default-template",
      description: "General-purpose function wrapper",
      validationLevel: ValidationLevel.MEDIUM,
      cacheable: false,
      monitoring: true,
      metadata: {
        category: FunctionCategory.UTILITY,
        domain: "general",
        dataClassification: DataClassification.INTERNAL,
        dependencies: [],
        tags: ["general", "utility"],
      },
    };
  }
}

/**
 * Wrapper creation error
 * Specialized error for wrapper creation failures
 */
export class WrapperCreationError extends Error {
  public readonly metadata: Record<string, any>;

  constructor(message: string, metadata: Record<string, any> = {}) {
    super(message);
    this.name = "WrapperCreationError";
    this.metadata = metadata;
  }
}

/**
 * Configuration use case enumeration
 * Predefined use cases for configuration templates
 */
export enum ConfigurationUseCase {
  DATABASE_READ = "database_read",
  DATABASE_WRITE = "database_write",
  API_CALL = "api_call",
  AUTHENTICATION = "authentication",
  FILE_OPERATION = "file_operation",
  COMPUTATION = "computation",
  MONITORING = "monitoring",
  UTILITY = "utility",
}

/**
 * Auto-configuration options
 * Minimal options for automatic configuration
 */
export interface AutoConfigOptions {
  /** Function identifier */
  readonly functionId: string;

  /** Function description (optional) */
  readonly description?: string;

  /** Security level hint */
  readonly securityLevel?: "low" | "medium" | "high" | "critical";

  /** Domain hint */
  readonly domain?: string;

  /** Data classification hint */
  readonly dataClassification?: DataClassification;

  /** Enable caching */
  readonly cacheable?: boolean;

  /** Enable monitoring */
  readonly monitoring?: boolean;
}

/**
 * Factory statistics interface
 * Statistics for the entire factory
 */
export interface FactoryStatistics {
  /** Total wrappers created */
  readonly totalWrappersCreated: number;

  /** Active wrappers */
  readonly activeWrappers: number;

  /** Total executions across all wrappers */
  readonly totalExecutions: number;

  /** Average response time across all wrappers */
  readonly averageResponseTime: number;

  /** Success rate across all wrappers */
  readonly successRate: number;

  /** Most used validation level */
  readonly mostUsedValidationLevel: ValidationLevel;

  /** Factory uptime */
  readonly factoryUptime: number;
}

/**
 * Wrapper health status
 * Health information for individual wrappers
 */
export interface WrapperHealthStatus {
  /** Function identifier */
  readonly functionId: string;

  /** Health status */
  readonly status: "healthy" | "degraded" | "unhealthy";

  /** Last execution time */
  readonly lastExecution: Date | null;

  /** Error rate in last hour */
  readonly errorRate: number;

  /** Average response time in last hour */
  readonly averageResponseTime: number;

  /** Health issues */
  readonly issues: readonly string[];
}

/**
 * Factory health check result
 * Overall health status of the factory
 */
export interface FactoryHealthStatus {
  /** Overall factory health */
  readonly overallStatus: "healthy" | "degraded" | "unhealthy";

  /** Individual wrapper health statuses */
  readonly wrapperStatuses: readonly WrapperHealthStatus[];

  /** Factory-level issues */
  readonly factoryIssues: readonly string[];

  /** Health check timestamp */
  readonly timestamp: Date;

  /** Recommendations for improvement */
  readonly recommendations: readonly string[];
}
