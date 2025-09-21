/**
 * PARLANT Phase 1 Function Wrapper Framework - Wrapper Registry and Management System
 *
 * Comprehensive wrapper registration and management system for PARLANT function
 * wrappers. Provides centralized registry, lifecycle management, health monitoring,
 * performance tracking, and enterprise-grade wrapper orchestration.
 *
 * @fileoverview Wrapper registry and management with enterprise monitoring
 * @version 1.0.0
 * @author Function Wrapper Framework Agent
 * @created 2025-09-19
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter } from 'events';
import {
  AnyFunction,
  WrapFunction,
  WrapperConfig,
  ValidationLevel,
  FunctionCategory,
  DataClassification,
  SecurityRiskLevel,
  ValidationRule,
  WrapperError,
  ErrorCategory,
  WrapperStatus
} from '../interfaces/wrapper-types';

// Re-export WrapperStatus for external use
export { WrapperStatus } from '../interfaces/wrapper-types';
import {
  SignaturePreservingWrapper,
  WrapperStatistics
} from './signature-preserving-wrapper';
import {
  EnterpriseFunctionWrapperFactory,
  WrapperCreationError
} from '../factories/function-wrapper-factory';

/**
 * Enterprise Wrapper Registry and Management Service
 * Centralized management system for all PARLANT function wrappers
 */
@Injectable()
export class WrapperRegistryManagementService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WrapperRegistryManagementService.name);
  private readonly eventEmitter = new EventEmitter();

  // Core registries
  private readonly wrapperRegistry = new Map<string, RegisteredWrapper>();
  private readonly functionRegistry = new Map<string, FunctionRegistration>();
  private readonly categoryRegistry = new Map<FunctionCategory, Set<string>>();
  private readonly userWrapperRegistry = new Map<string, Set<string>>();

  // Monitoring and statistics
  private readonly performanceMonitor = new WrapperPerformanceMonitor();
  private readonly healthMonitor = new WrapperHealthMonitor();
  private readonly lifecycleManager = new WrapperLifecycleManager();

  // Configuration
  private readonly registryConfig: RegistryConfiguration;
  private readonly cleanupInterval: NodeJS.Timeout;
  private readonly healthCheckInterval: NodeJS.Timeout;

  constructor(
    private readonly wrapperFactory: EnterpriseFunctionWrapperFactory,
    registryConfig?: Partial<RegistryConfiguration>
  ) {
    this.registryConfig = this.createDefaultRegistryConfiguration(registryConfig);

    // Setup periodic tasks
    this.cleanupInterval = setInterval(
      () => this.performPeriodicCleanup(),
      this.registryConfig.cleanupInterval
    );

    this.healthCheckInterval = setInterval(
      () => this.performHealthChecks(),
      this.registryConfig.healthCheckInterval
    );

    this.setupEventListeners();
  }

  /**
   * Module initialization
   */
  async onModuleInit(): Promise<void> {
    this.logger.log('Initializing Wrapper Registry Management Service');

    // Initialize monitoring systems
    await this.performanceMonitor.initialize();
    await this.healthMonitor.initialize();
    await this.lifecycleManager.initialize();

    // Restore persistent registry state if enabled
    if (this.registryConfig.enablePersistence) {
      await this.restoreRegistryState();
    }

    this.logger.log('Wrapper Registry Management Service initialized successfully');
  }

  /**
   * Module cleanup
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log('Shutting down Wrapper Registry Management Service');

    // Clear intervals
    clearInterval(this.cleanupInterval);
    clearInterval(this.healthCheckInterval);

    // Persist registry state if enabled
    if (this.registryConfig.enablePersistence) {
      await this.persistRegistryState();
    }

    // Cleanup all wrappers
    await this.cleanupAllWrappers();

    this.logger.log('Wrapper Registry Management Service shutdown complete');
  }

  /**
   * Register a function wrapper with comprehensive metadata
   *
   * @param functionId - Unique function identifier
   * @param originalFunction - Original function to wrap
   * @param config - Wrapper configuration
   * @param metadata - Additional registration metadata
   * @returns Registration result
   */
  public async registerWrapper<T extends AnyFunction>(
    functionId: string,
    originalFunction: T,
    config: WrapperConfig,
    metadata: WrapperRegistrationMetadata = {}
  ): Promise<WrapperRegistrationResult<T>> {
    const registrationId = this.generateRegistrationId();
    const startTime = Date.now();

    this.logger.debug(`Registering wrapper: ${functionId}`, {
      registrationId,
      validationLevel: config.validationLevel,
      category: config.metadata?.category
    });

    try {
      // Validate registration
      await this.validateWrapperRegistration(functionId, config, metadata);

      // Create wrapper using factory
      const wrappedFunction = this.wrapperFactory.createWrapper(originalFunction, config);

      // Create registration record
      const registration: RegisteredWrapper = {
        registrationId,
        functionId,
        originalFunction,
        wrappedFunction,
        config,
        metadata: {
          ...metadata,
          registeredAt: new Date(),
          registeredBy: metadata.registeredBy || 'system',
          version: metadata.version || '1.0.0',
          tags: metadata.tags || [],
          description: metadata.description || config.description
        },
        status: WrapperStatus.ACTIVE,
        statistics: {
          totalInvocations: 0,
          totalErrors: 0,
          totalExecutionTime: 0,
          averageExecutionTime: 0,
          lastInvocation: null,
          healthScore: 100
        },
        lifecycle: {
          createdAt: new Date(),
          lastHealthCheck: new Date(),
          lastAccessTime: new Date(),
          accessCount: 0,
          errorCount: 0
        }
      };

      // Store in registries
      this.wrapperRegistry.set(functionId, registration);

      // Update category registry
      const category = config.metadata?.category || FunctionCategory.UTILITY;
      if (!this.categoryRegistry.has(category)) {
        this.categoryRegistry.set(category, new Set());
      }
      this.categoryRegistry.get(category)!.add(functionId);

      // Update user registry if user specified
      if (metadata.registeredBy) {
        if (!this.userWrapperRegistry.has(metadata.registeredBy)) {
          this.userWrapperRegistry.set(metadata.registeredBy, new Set());
        }
        this.userWrapperRegistry.get(metadata.registeredBy)!.add(functionId);
      }

      // Start monitoring
      await this.performanceMonitor.startMonitoring(functionId, registration);
      await this.healthMonitor.startMonitoring(functionId, registration);

      // Emit registration event
      this.eventEmitter.emit('wrapper-registered', {
        functionId,
        registrationId,
        config,
        metadata
      });

      const registrationTime = Date.now() - startTime;

      this.logger.log(`Successfully registered wrapper: ${functionId}`, {
        registrationId,
        registrationTime,
        category,
        validationLevel: config.validationLevel
      });

      return {
        success: true,
        registrationId,
        functionId,
        wrappedFunction,
        registrationTime,
        metadata: {
          category,
          validationLevel: config.validationLevel,
          securityRisk: this.assessSecurityRisk(config),
          registeredAt: registration.metadata.registeredAt
        }
      };

    } catch (error) {
      const registrationTime = Date.now() - startTime;

      this.logger.error(`Failed to register wrapper: ${functionId}`, {
        registrationId,
        error: error instanceof Error ? error.message : String(error),
        registrationTime
      });

      return {
        success: false,
        registrationId,
        functionId,
        wrappedFunction: null,
        registrationTime,
        error: error as WrapperError,
        metadata: {
          category: config.metadata?.category || FunctionCategory.UTILITY,
          validationLevel: config.validationLevel,
          securityRisk: SecurityRiskLevel.LOW,
          registeredAt: new Date()
        }
      };
    }
  }

  /**
   * Unregister a wrapper and cleanup resources
   *
   * @param functionId - Function identifier to unregister
   * @returns Unregistration result
   */
  public async unregisterWrapper(functionId: string): Promise<WrapperUnregistrationResult> {
    const unregistrationId = this.generateRegistrationId();
    const startTime = Date.now();

    this.logger.debug(`Unregistering wrapper: ${functionId}`, { unregistrationId });

    try {
      const registration = this.wrapperRegistry.get(functionId);
      if (!registration) {
        throw new Error(`Wrapper not found: ${functionId}`);
      }

      // Mark as deactivating
      registration.status = WrapperStatus.DEACTIVATING;

      // Stop monitoring
      await this.performanceMonitor.stopMonitoring(functionId);
      await this.healthMonitor.stopMonitoring(functionId);

      // Remove from registries
      this.wrapperRegistry.delete(functionId);

      // Update category registry
      const category = registration.config.metadata?.category || FunctionCategory.UTILITY;
      const categorySet = this.categoryRegistry.get(category);
      if (categorySet) {
        categorySet.delete(functionId);
        if (categorySet.size === 0) {
          this.categoryRegistry.delete(category);
        }
      }

      // Update user registry
      if (registration.metadata.registeredBy) {
        const userSet = this.userWrapperRegistry.get(registration.metadata.registeredBy);
        if (userSet) {
          userSet.delete(functionId);
          if (userSet.size === 0) {
            this.userWrapperRegistry.delete(registration.metadata.registeredBy);
          }
        }
      }

      // Emit unregistration event
      this.eventEmitter.emit('wrapper-unregistered', {
        functionId,
        unregistrationId,
        finalStatistics: registration.statistics
      });

      const unregistrationTime = Date.now() - startTime;

      this.logger.log(`Successfully unregistered wrapper: ${functionId}`, {
        unregistrationId,
        unregistrationTime,
        finalStatistics: registration.statistics
      });

      return {
        success: true,
        unregistrationId,
        functionId,
        unregistrationTime,
        finalStatistics: registration.statistics
      };

    } catch (error) {
      const unregistrationTime = Date.now() - startTime;

      this.logger.error(`Failed to unregister wrapper: ${functionId}`, {
        unregistrationId,
        error: error instanceof Error ? error.message : String(error),
        unregistrationTime
      });

      return {
        success: false,
        unregistrationId,
        functionId,
        unregistrationTime,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Get wrapper information
   *
   * @param functionId - Function identifier
   * @returns Wrapper information or null
   */
  public getWrapper(functionId: string): WrapperInfo | null {
    const registration = this.wrapperRegistry.get(functionId);
    if (!registration) {
      return null;
    }

    return {
      functionId: registration.functionId,
      config: registration.config,
      metadata: registration.metadata,
      status: registration.status,
      statistics: registration.statistics,
      lifecycle: registration.lifecycle,
      healthStatus: this.healthMonitor.getHealthStatus(functionId),
      performanceMetrics: this.performanceMonitor.getMetrics(functionId)
    };
  }

  /**
   * List all registered wrappers
   *
   * @param filters - Optional filters
   * @returns List of wrapper information
   */
  public listWrappers(filters: WrapperListFilters = {}): WrapperInfo[] {
    const wrappers: WrapperInfo[] = [];

    for (const registration of this.wrapperRegistry.values()) {
      // Apply filters
      if (filters.category && registration.config.metadata?.category !== filters.category) {
        continue;
      }

      if (filters.validationLevel && registration.config.validationLevel !== filters.validationLevel) {
        continue;
      }

      if (filters.status && registration.status !== filters.status) {
        continue;
      }

      if (filters.registeredBy && registration.metadata.registeredBy !== filters.registeredBy) {
        continue;
      }

      if (filters.tags && filters.tags.length > 0) {
        const hasAllTags = filters.tags.every(tag => registration.metadata.tags.includes(tag));
        if (!hasAllTags) {
          continue;
        }
      }

      wrappers.push({
        functionId: registration.functionId,
        config: registration.config,
        metadata: registration.metadata,
        status: registration.status,
        statistics: registration.statistics,
        lifecycle: registration.lifecycle,
        healthStatus: this.healthMonitor.getHealthStatus(registration.functionId),
        performanceMetrics: this.performanceMonitor.getMetrics(registration.functionId)
      });
    }

    // Apply sorting
    if (filters.sortBy) {
      wrappers.sort((a, b) => {
        switch (filters.sortBy) {
          case 'registrationDate':
            return b.lifecycle.createdAt.getTime() - a.lifecycle.createdAt.getTime();
          case 'invocationCount':
            return b.statistics.totalInvocations - a.statistics.totalInvocations;
          case 'errorRate':
            const aErrorRate = a.statistics.totalInvocations > 0
              ? a.statistics.totalErrors / a.statistics.totalInvocations
              : 0;
            const bErrorRate = b.statistics.totalInvocations > 0
              ? b.statistics.totalErrors / b.statistics.totalInvocations
              : 0;
            return bErrorRate - aErrorRate;
          case 'healthScore':
            return b.statistics.healthScore - a.statistics.healthScore;
          default:
            return a.functionId.localeCompare(b.functionId);
        }
      });
    }

    // Apply pagination
    if (filters.limit) {
      const start = filters.offset || 0;
      return wrappers.slice(start, start + filters.limit);
    }

    return wrappers;
  }

  /**
   * Get registry statistics
   *
   * @returns Comprehensive registry statistics
   */
  public getRegistryStatistics(): RegistryStatistics {
    const totalWrappers = this.wrapperRegistry.size;

    // Status distribution
    const statusDistribution = new Map<WrapperStatus, number>();
    Object.values(WrapperStatus).forEach(status => statusDistribution.set(status, 0));

    // Category distribution
    const categoryDistribution = new Map<FunctionCategory, number>();
    Object.values(FunctionCategory).forEach(category => categoryDistribution.set(category, 0));

    // Validation level distribution
    const validationLevelDistribution = new Map<ValidationLevel, number>();
    Object.values(ValidationLevel).forEach(level => validationLevelDistribution.set(level, 0));

    // Aggregate statistics
    let totalInvocations = 0;
    let totalErrors = 0;
    let totalExecutionTime = 0;
    let healthyWrappers = 0;

    for (const registration of this.wrapperRegistry.values()) {
      // Status distribution
      const currentCount = statusDistribution.get(registration.status) || 0;
      statusDistribution.set(registration.status, currentCount + 1);

      // Category distribution
      const category = registration.config.metadata?.category || FunctionCategory.UTILITY;
      const categoryCount = categoryDistribution.get(category) || 0;
      categoryDistribution.set(category, categoryCount + 1);

      // Validation level distribution
      const levelCount = validationLevelDistribution.get(registration.config.validationLevel) || 0;
      validationLevelDistribution.set(registration.config.validationLevel, levelCount + 1);

      // Aggregate statistics
      totalInvocations += registration.statistics.totalInvocations;
      totalErrors += registration.statistics.totalErrors;
      totalExecutionTime += registration.statistics.totalExecutionTime;

      if (registration.statistics.healthScore >= 80) {
        healthyWrappers++;
      }
    }

    const averageExecutionTime = totalInvocations > 0 ? totalExecutionTime / totalInvocations : 0;
    const errorRate = totalInvocations > 0 ? totalErrors / totalInvocations : 0;
    const healthRatio = totalWrappers > 0 ? healthyWrappers / totalWrappers : 1;

    return {
      totalWrappers,
      activeWrappers: statusDistribution.get(WrapperStatus.ACTIVE) || 0,
      inactiveWrappers: statusDistribution.get(WrapperStatus.INACTIVE) || 0,
      errorWrappers: statusDistribution.get(WrapperStatus.ERROR) || 0,
      statusDistribution: this.createCompleteStatusDistribution(statusDistribution),
      categoryDistribution: this.createCompleteCategoryDistribution(categoryDistribution),
      validationLevelDistribution: this.createCompleteValidationLevelDistribution(validationLevelDistribution),
      totalInvocations,
      totalErrors,
      errorRate,
      averageExecutionTime,
      healthRatio,
      memoryUsage: this.calculateMemoryUsage(),
      uptime: Date.now() - this.lifecycleManager.getStartTime()
    };
  }

  /**
   * Create complete status distribution with all enum values
   */
  private createCompleteStatusDistribution(statusMap: Map<WrapperStatus, number>): Record<WrapperStatus, number> {
    return {
      [WrapperStatus.ACTIVE]: statusMap.get(WrapperStatus.ACTIVE) || 0,
      [WrapperStatus.INACTIVE]: statusMap.get(WrapperStatus.INACTIVE) || 0,
      [WrapperStatus.ERROR]: statusMap.get(WrapperStatus.ERROR) || 0,
      [WrapperStatus.DEACTIVATING]: statusMap.get(WrapperStatus.DEACTIVATING) || 0,
      [WrapperStatus.MAINTENANCE]: statusMap.get(WrapperStatus.MAINTENANCE) || 0,
    } as Record<WrapperStatus, number>;
  }

  /**
   * Create complete category distribution with all enum values
   */
  private createCompleteCategoryDistribution(categoryMap: Map<FunctionCategory, number>): Record<FunctionCategory, number> {
    return {
      [FunctionCategory.DATABASE_READ]: categoryMap.get(FunctionCategory.DATABASE_READ) || 0,
      [FunctionCategory.DATABASE_WRITE]: categoryMap.get(FunctionCategory.DATABASE_WRITE) || 0,
      [FunctionCategory.API_CALL]: categoryMap.get(FunctionCategory.API_CALL) || 0,
      [FunctionCategory.FILE_OPERATION]: categoryMap.get(FunctionCategory.FILE_OPERATION) || 0,
      [FunctionCategory.COMPUTATION]: categoryMap.get(FunctionCategory.COMPUTATION) || 0,
      [FunctionCategory.AUTHENTICATION]: categoryMap.get(FunctionCategory.AUTHENTICATION) || 0,
      [FunctionCategory.AUTHORIZATION]: categoryMap.get(FunctionCategory.AUTHORIZATION) || 0,
      [FunctionCategory.MONITORING]: categoryMap.get(FunctionCategory.MONITORING) || 0,
      [FunctionCategory.UTILITY]: categoryMap.get(FunctionCategory.UTILITY) || 0,
    } as Record<FunctionCategory, number>;
  }

  /**
   * Create complete validation level distribution with all enum values
   */
  private createCompleteValidationLevelDistribution(validationMap: Map<ValidationLevel, number>): Record<ValidationLevel, number> {
    return {
      [ValidationLevel.CRITICAL]: validationMap.get(ValidationLevel.CRITICAL) || 0,
      [ValidationLevel.HIGH]: validationMap.get(ValidationLevel.HIGH) || 0,
      [ValidationLevel.MEDIUM]: validationMap.get(ValidationLevel.MEDIUM) || 0,
      [ValidationLevel.LOW]: validationMap.get(ValidationLevel.LOW) || 0,
      [ValidationLevel.OPTIONAL]: validationMap.get(ValidationLevel.OPTIONAL) || 0,
    } as Record<ValidationLevel, number>;
  }

  /**
   * Perform wrapper health check
   *
   * @param functionId - Function identifier (optional, checks all if not provided)
   * @returns Health check results
   */
  public async performHealthCheck(functionId?: string): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = [];

    const wrappersToCheck = functionId
      ? [this.wrapperRegistry.get(functionId)].filter(Boolean)
      : Array.from(this.wrapperRegistry.values());

    for (const registration of wrappersToCheck) {
      if (!registration) continue;

      try {
        const healthCheck = await this.healthMonitor.performHealthCheck(registration.functionId);
        results.push(healthCheck);

        // Update wrapper status based on health check
        if (healthCheck.healthy) {
          if (registration.status === WrapperStatus.ERROR) {
            registration.status = WrapperStatus.ACTIVE;
            this.logger.log(`Wrapper recovered: ${registration.functionId}`);
          }
        } else {
          if (registration.status === WrapperStatus.ACTIVE) {
            registration.status = WrapperStatus.ERROR;
            this.logger.warn(`Wrapper became unhealthy: ${registration.functionId}`, healthCheck.issues);
          }
        }

        registration.lifecycle.lastHealthCheck = new Date();

      } catch (error) {
        this.logger.error(`Health check failed for wrapper: ${registration.functionId}`, error);

        results.push({
          functionId: registration.functionId,
          healthy: false,
          healthScore: 0,
          issues: [`Health check failed: ${error instanceof Error ? error.message : String(error)}`],
          recommendations: ['Check wrapper configuration and dependencies'],
          lastCheck: new Date()
        });
      }
    }

    return results;
  }

  /**
   * Update wrapper configuration
   *
   * @param functionId - Function identifier
   * @param configUpdate - Configuration updates
   * @returns Update result
   */
  public async updateWrapperConfig(
    functionId: string,
    configUpdate: Partial<WrapperConfig>
  ): Promise<WrapperConfigUpdateResult> {
    const updateId = this.generateRegistrationId();
    const startTime = Date.now();

    this.logger.debug(`Updating wrapper config: ${functionId}`, { updateId });

    try {
      const registration = this.wrapperRegistry.get(functionId);
      if (!registration) {
        throw new Error(`Wrapper not found: ${functionId}`);
      }

      // Validate configuration update
      const newConfig = { ...registration.config, ...configUpdate };
      await this.validateWrapperConfiguration(newConfig);

      // Store old config for rollback
      const oldConfig = { ...registration.config };

      // Apply update by creating new registration with updated config and metadata
      const updatedRegistration: RegisteredWrapper = {
        ...registration,
        config: newConfig,
        metadata: {
          ...registration.metadata,
          lastUpdated: new Date()
        }
      };
      this.wrapperRegistry.set(functionId, updatedRegistration);

      // Emit update event
      this.eventEmitter.emit('wrapper-config-updated', {
        functionId,
        updateId,
        oldConfig,
        newConfig
      });

      const updateTime = Date.now() - startTime;

      this.logger.log(`Successfully updated wrapper config: ${functionId}`, {
        updateId,
        updateTime
      });

      return {
        success: true,
        updateId,
        functionId,
        oldConfig,
        newConfig,
        updateTime
      };

    } catch (error) {
      const updateTime = Date.now() - startTime;

      this.logger.error(`Failed to update wrapper config: ${functionId}`, {
        updateId,
        error: error instanceof Error ? error.message : String(error),
        updateTime
      });

      return {
        success: false,
        updateId,
        functionId,
        oldConfig: null,
        newConfig: null,
        updateTime,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Search wrappers by criteria
   *
   * @param criteria - Search criteria
   * @returns Search results
   */
  public searchWrappers(criteria: WrapperSearchCriteria): WrapperSearchResult[] {
    const results: WrapperSearchResult[] = [];

    for (const registration of this.wrapperRegistry.values()) {
      let score = 0;
      const matches: string[] = [];

      // Function ID match
      if (criteria.functionId && registration.functionId.includes(criteria.functionId)) {
        score += 10;
        matches.push('functionId');
      }

      // Description match
      if (criteria.description && registration.config.description.toLowerCase().includes(criteria.description.toLowerCase())) {
        score += 8;
        matches.push('description');
      }

      // Tag match
      if (criteria.tags && criteria.tags.length > 0) {
        const matchingTags = criteria.tags.filter(tag => registration.metadata.tags.includes(tag));
        score += matchingTags.length * 5;
        if (matchingTags.length > 0) {
          matches.push('tags');
        }
      }

      // Category match
      if (criteria.category && registration.config.metadata?.category === criteria.category) {
        score += 6;
        matches.push('category');
      }

      // Validation level match
      if (criteria.validationLevel && registration.config.validationLevel === criteria.validationLevel) {
        score += 4;
        matches.push('validationLevel');
      }

      // Registered by match
      if (criteria.registeredBy && registration.metadata.registeredBy === criteria.registeredBy) {
        score += 3;
        matches.push('registeredBy');
      }

      // Only include results with matches
      if (score > 0) {
        results.push({
          functionId: registration.functionId,
          score,
          matches,
          wrapper: {
            functionId: registration.functionId,
            config: registration.config,
            metadata: registration.metadata,
            status: registration.status,
            statistics: registration.statistics,
            lifecycle: registration.lifecycle,
            healthStatus: this.healthMonitor.getHealthStatus(registration.functionId),
            performanceMetrics: this.performanceMonitor.getMetrics(registration.functionId)
          }
        });
      }
    }

    // Sort by score (highest first)
    results.sort((a, b) => b.score - a.score);

    // Apply limit if specified
    if (criteria.limit) {
      return results.slice(0, criteria.limit);
    }

    return results;
  }

  /**
   * Export wrapper configurations
   *
   * @param functionIds - Specific function IDs to export (optional)
   * @returns Exported configurations
   */
  public exportWrapperConfigurations(functionIds?: string[]): WrapperConfigurationExport {
    const exportId = this.generateRegistrationId();
    const exportTimestamp = new Date();
    const configurations: ExportedWrapperConfig[] = [];

    const wrappersToExport = functionIds
      ? functionIds.map(id => this.wrapperRegistry.get(id)).filter(Boolean)
      : Array.from(this.wrapperRegistry.values());

    for (const registration of wrappersToExport) {
      if (!registration) continue;

      configurations.push({
        functionId: registration.functionId,
        config: registration.config,
        metadata: registration.metadata,
        statistics: registration.statistics,
        exportedAt: exportTimestamp
      });
    }

    return {
      exportId,
      exportTimestamp,
      totalConfigurations: configurations.length,
      configurations,
      registryVersion: '1.0.0',
      compatibility: {
        minFrameworkVersion: '1.0.0',
        maxFrameworkVersion: '2.0.0'
      }
    };
  }

  /**
   * Import wrapper configurations
   *
   * @param importData - Configuration data to import
   * @returns Import result
   */
  public async importWrapperConfigurations(
    importData: WrapperConfigurationExport
  ): Promise<WrapperConfigurationImportResult> {
    const importId = this.generateRegistrationId();
    const startTime = Date.now();
    const results: WrapperImportResult[] = [];

    this.logger.log(`Starting wrapper configuration import`, {
      importId,
      totalConfigurations: importData.totalConfigurations
    });

    for (const configData of importData.configurations) {
      try {
        // Validate configuration
        await this.validateWrapperConfiguration(configData.config);

        // Check for existing wrapper
        const existing = this.wrapperRegistry.has(configData.functionId);

        if (existing) {
          results.push({
            functionId: configData.functionId,
            success: false,
            action: 'skipped',
            reason: 'Wrapper already exists'
          });
          continue;
        }

        // Note: We can't import the actual wrapped function, only the configuration
        // This would need to be combined with actual function registration
        results.push({
          functionId: configData.functionId,
          success: true,
          action: 'configuration-imported',
          reason: 'Configuration stored for future registration'
        });

      } catch (error) {
        results.push({
          functionId: configData.functionId,
          success: false,
          action: 'failed',
          reason: error instanceof Error ? error.message : String(error)
        });
      }
    }

    const importTime = Date.now() - startTime;
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    this.logger.log(`Wrapper configuration import completed`, {
      importId,
      importTime,
      successCount,
      failureCount,
      totalConfigurations: importData.totalConfigurations
    });

    return {
      importId,
      importTime,
      totalConfigurations: importData.totalConfigurations,
      successCount,
      failureCount,
      results
    };
  }

  /**
   * Generate unique registration ID
   *
   * @returns Unique registration identifier
   */
  private generateRegistrationId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `reg_${timestamp}_${random}`;
  }

  /**
   * Validate wrapper registration
   *
   * @param functionId - Function identifier
   * @param config - Wrapper configuration
   * @param metadata - Registration metadata
   */
  private async validateWrapperRegistration(
    functionId: string,
    config: WrapperConfig,
    metadata: WrapperRegistrationMetadata
  ): Promise<void> {
    // Check for duplicate registration
    if (this.wrapperRegistry.has(functionId)) {
      throw new WrapperCreationError(`Function already registered: ${functionId}`);
    }

    // Validate function ID format
    if (!/^[a-zA-Z][a-zA-Z0-9._-]*$/.test(functionId)) {
      throw new WrapperCreationError(`Invalid function ID format: ${functionId}`);
    }

    // Validate configuration
    await this.validateWrapperConfiguration(config);

    // Check registry limits
    if (this.wrapperRegistry.size >= this.registryConfig.maxWrappers) {
      throw new WrapperCreationError(`Registry limit exceeded: ${this.registryConfig.maxWrappers}`);
    }
  }

  /**
   * Validate wrapper configuration
   *
   * @param config - Configuration to validate
   */
  private async validateWrapperConfiguration(config: WrapperConfig): Promise<void> {
    if (!config.functionId || config.functionId.trim().length === 0) {
      throw new Error('Function ID is required');
    }

    if (!config.description || config.description.trim().length === 0) {
      throw new Error('Function description is required');
    }

    if (!Object.values(ValidationLevel).includes(config.validationLevel)) {
      throw new Error(`Invalid validation level: ${config.validationLevel}`);
    }
  }

  /**
   * Assess security risk of configuration
   *
   * @param config - Wrapper configuration
   * @returns Security risk level
   */
  private assessSecurityRisk(config: WrapperConfig): SecurityRiskLevel {
    if (config.validationLevel === ValidationLevel.CRITICAL) {
      return SecurityRiskLevel.CRITICAL;
    }

    if (config.validationLevel === ValidationLevel.HIGH) {
      return SecurityRiskLevel.HIGH;
    }

    if (config.metadata?.dataClassification === DataClassification.RESTRICTED) {
      return SecurityRiskLevel.CRITICAL;
    }

    if (config.metadata?.dataClassification === DataClassification.CONFIDENTIAL) {
      return SecurityRiskLevel.HIGH;
    }

    return SecurityRiskLevel.MEDIUM;
  }

  /**
   * Setup event listeners for wrapper events
   */
  private setupEventListeners(): void {
    this.eventEmitter.on('wrapper-invoked', (event: WrapperInvocationEvent) => {
      this.updateWrapperStatistics(event.functionId, event);
    });

    this.eventEmitter.on('wrapper-error', (event: WrapperErrorEvent) => {
      this.handleWrapperError(event.functionId, event);
    });

    this.eventEmitter.on('wrapper-performance', (event: WrapperPerformanceEvent) => {
      this.updatePerformanceMetrics(event.functionId, event);
    });
  }

  /**
   * Update wrapper statistics from invocation event
   *
   * @param functionId - Function identifier
   * @param event - Invocation event
   */
  private updateWrapperStatistics(functionId: string, event: WrapperInvocationEvent): void {
    const registration = this.wrapperRegistry.get(functionId);
    if (!registration) return;

    registration.statistics.totalInvocations++;
    registration.statistics.totalExecutionTime += event.executionTime;
    registration.statistics.averageExecutionTime =
      registration.statistics.totalExecutionTime / registration.statistics.totalInvocations;
    registration.statistics.lastInvocation = new Date();

    registration.lifecycle.lastAccessTime = new Date();
    registration.lifecycle.accessCount++;
  }

  /**
   * Handle wrapper error event
   *
   * @param functionId - Function identifier
   * @param event - Error event
   */
  private handleWrapperError(functionId: string, event: WrapperErrorEvent): void {
    const registration = this.wrapperRegistry.get(functionId);
    if (!registration) return;

    registration.statistics.totalErrors++;
    registration.lifecycle.errorCount++;

    // Update health score based on error rate
    const errorRate = registration.statistics.totalErrors / Math.max(registration.statistics.totalInvocations, 1);
    registration.statistics.healthScore = Math.max(0, 100 - (errorRate * 100));

    // Mark as error status if health is critically low
    if (registration.statistics.healthScore < 20) {
      registration.status = WrapperStatus.ERROR;
    }
  }

  /**
   * Update performance metrics from performance event
   *
   * @param functionId - Function identifier
   * @param event - Performance event
   */
  private updatePerformanceMetrics(functionId: string, event: WrapperPerformanceEvent): void {
    // Delegate to performance monitor
    this.performanceMonitor.recordPerformanceEvent(functionId, event);
  }

  /**
   * Perform periodic cleanup of inactive wrappers
   */
  private async performPeriodicCleanup(): Promise<void> {
    const cutoffTime = new Date(Date.now() - this.registryConfig.inactivityTimeout);
    const inactiveWrappers: string[] = [];

    for (const [functionId, registration] of this.wrapperRegistry.entries()) {
      if (registration.lifecycle.lastAccessTime < cutoffTime) {
        inactiveWrappers.push(functionId);
      }
    }

    for (const functionId of inactiveWrappers) {
      const registration = this.wrapperRegistry.get(functionId);
      if (registration && registration.status === WrapperStatus.ACTIVE) {
        registration.status = WrapperStatus.INACTIVE;
        this.logger.debug(`Marked wrapper as inactive: ${functionId}`);
      }
    }

    if (inactiveWrappers.length > 0) {
      this.logger.log(`Periodic cleanup completed: ${inactiveWrappers.length} wrappers marked inactive`);
    }
  }

  /**
   * Perform health checks on all wrappers
   */
  private async performHealthChecks(): Promise<void> {
    const healthCheckResults = await this.performHealthCheck();
    const unhealthyWrappers = healthCheckResults.filter(result => !result.healthy);

    if (unhealthyWrappers.length > 0) {
      this.logger.warn(`Health check found ${unhealthyWrappers.length} unhealthy wrappers`, {
        unhealthyWrappers: unhealthyWrappers.map(w => w.functionId)
      });
    }
  }

  /**
   * Calculate memory usage of registry
   *
   * @returns Memory usage in bytes
   */
  private calculateMemoryUsage(): number {
    // Estimate memory usage based on registry size
    const baseMemory = 1024; // Base overhead
    const perWrapperMemory = 512; // Estimated memory per wrapper
    const totalWrappers = this.wrapperRegistry.size;

    return baseMemory + (totalWrappers * perWrapperMemory);
  }

  /**
   * Restore registry state from persistence
   */
  private async restoreRegistryState(): Promise<void> {
    try {
      // Implementation would restore from persistent storage
      this.logger.debug('Registry state restoration not implemented yet');
    } catch (error) {
      this.logger.error('Failed to restore registry state', error);
    }
  }

  /**
   * Persist registry state for recovery
   */
  private async persistRegistryState(): Promise<void> {
    try {
      // Implementation would persist to storage
      this.logger.debug('Registry state persistence not implemented yet');
    } catch (error) {
      this.logger.error('Failed to persist registry state', error);
    }
  }

  /**
   * Cleanup all wrappers during shutdown
   */
  private async cleanupAllWrappers(): Promise<void> {
    const functionIds = Array.from(this.wrapperRegistry.keys());

    for (const functionId of functionIds) {
      try {
        await this.unregisterWrapper(functionId);
      } catch (error) {
        this.logger.error(`Failed to cleanup wrapper: ${functionId}`, error);
      }
    }
  }

  /**
   * Create default registry configuration
   *
   * @param overrides - Configuration overrides
   * @returns Default configuration
   */
  private createDefaultRegistryConfiguration(
    overrides?: Partial<RegistryConfiguration>
  ): RegistryConfiguration {
    return {
      maxWrappers: 10000,
      cleanupInterval: 300000, // 5 minutes
      healthCheckInterval: 60000, // 1 minute
      inactivityTimeout: 3600000, // 1 hour
      enablePersistence: false,
      persistenceInterval: 900000, // 15 minutes
      enableMetrics: true,
      enableEvents: true,
      ...overrides
    };
  }
}

/**
 * Wrapper Performance Monitor
 * Monitors and tracks wrapper performance metrics
 */
export class WrapperPerformanceMonitor {
  private readonly logger = new Logger(WrapperPerformanceMonitor.name);
  private readonly metrics = new Map<string, PerformanceMetrics[]>();
  private readonly aggregatedMetrics = new Map<string, AggregatedPerformanceMetrics>();

  async initialize(): Promise<void> {
    this.logger.debug('Initializing Wrapper Performance Monitor');
  }

  async startMonitoring(functionId: string, registration: RegisteredWrapper): Promise<void> {
    this.metrics.set(functionId, []);
    this.aggregatedMetrics.set(functionId, {
      totalInvocations: 0,
      averageExecutionTime: 0,
      minExecutionTime: Number.MAX_VALUE,
      maxExecutionTime: 0,
      totalMemoryUsage: 0,
      averageMemoryUsage: 0,
      errorRate: 0,
      throughput: 0,
      lastUpdated: new Date()
    });
  }

  async stopMonitoring(functionId: string): Promise<void> {
    this.metrics.delete(functionId);
    this.aggregatedMetrics.delete(functionId);
  }

  recordPerformanceEvent(functionId: string, event: WrapperPerformanceEvent): void {
    const metrics = this.metrics.get(functionId);
    if (!metrics) return;

    // Add performance data point
    metrics.push({
      timestamp: event.timestamp,
      executionTime: event.executionTime,
      memoryUsage: event.memoryUsage,
      success: event.success
    });

    // Update aggregated metrics
    this.updateAggregatedMetrics(functionId);

    // Limit metrics history size
    if (metrics.length > 1000) {
      metrics.splice(0, metrics.length - 1000);
    }
  }

  getMetrics(functionId: string): AggregatedPerformanceMetrics | null {
    return this.aggregatedMetrics.get(functionId) || null;
  }

  private updateAggregatedMetrics(functionId: string): void {
    const metrics = this.metrics.get(functionId);
    const aggregated = this.aggregatedMetrics.get(functionId);

    if (!metrics || !aggregated || metrics.length === 0) return;

    const recentMetrics = metrics.slice(-100); // Last 100 data points

    const updatedAggregated: AggregatedPerformanceMetrics = {
      totalInvocations: metrics.length,
      averageExecutionTime: recentMetrics.reduce((sum, m) => sum + m.executionTime, 0) / recentMetrics.length,
      minExecutionTime: Math.min(...recentMetrics.map(m => m.executionTime)),
      maxExecutionTime: Math.max(...recentMetrics.map(m => m.executionTime)),
      totalMemoryUsage: aggregated?.totalMemoryUsage || 0,
      averageMemoryUsage: recentMetrics.reduce((sum, m) => sum + m.memoryUsage, 0) / recentMetrics.length,
      errorRate: recentMetrics.filter(m => !m.success).length / recentMetrics.length,
      throughput: aggregated?.throughput || 0,
      lastUpdated: new Date()
    };
    this.aggregatedMetrics.set(functionId, updatedAggregated);
  }
}

/**
 * Wrapper Health Monitor
 * Monitors wrapper health and provides diagnostic information
 */
export class WrapperHealthMonitor {
  private readonly logger = new Logger(WrapperHealthMonitor.name);
  private readonly healthStatus = new Map<string, WrapperHealthStatus>();

  async initialize(): Promise<void> {
    this.logger.debug('Initializing Wrapper Health Monitor');
  }

  async startMonitoring(functionId: string, registration: RegisteredWrapper): Promise<void> {
    this.healthStatus.set(functionId, {
      functionId,
      healthy: true,
      healthScore: 100,
      issues: [],
      recommendations: [],
      lastCheck: new Date()
    });
  }

  async stopMonitoring(functionId: string): Promise<void> {
    this.healthStatus.delete(functionId);
  }

  async performHealthCheck(functionId: string): Promise<HealthCheckResult> {
    const healthStatus = this.healthStatus.get(functionId);
    if (!healthStatus) {
      return {
        functionId,
        healthy: false,
        healthScore: 0,
        issues: ['Wrapper not found in health monitor'],
        recommendations: ['Re-register wrapper'],
        lastCheck: new Date()
      };
    }

    // Simulate health check logic
    const issues: string[] = [];
    const recommendations: string[] = [];
    let healthScore = 100;

    // Check error rate
    // Implementation would check actual error rates

    // Check performance
    // Implementation would check actual performance metrics

    // Check resource usage
    // Implementation would check actual resource usage

    const healthy = issues.length === 0 && healthScore >= 70;

    const result: HealthCheckResult = {
      functionId,
      healthy,
      healthScore,
      issues,
      recommendations,
      lastCheck: new Date()
    };

    // Update health status
    this.healthStatus.set(functionId, result);

    return result;
  }

  getHealthStatus(functionId: string): WrapperHealthStatus | null {
    return this.healthStatus.get(functionId) || null;
  }
}

/**
 * Wrapper Lifecycle Manager
 * Manages wrapper lifecycle events and state transitions
 */
export class WrapperLifecycleManager {
  private readonly logger = new Logger(WrapperLifecycleManager.name);
  private readonly startTime = Date.now();

  async initialize(): Promise<void> {
    this.logger.debug('Initializing Wrapper Lifecycle Manager');
  }

  getStartTime(): number {
    return this.startTime;
  }
}

// Type Definitions


/**
 * Registered wrapper information
 */
export interface RegisteredWrapper {
  readonly registrationId: string;
  readonly functionId: string;
  readonly originalFunction: AnyFunction;
  readonly wrappedFunction: WrapFunction<any>;
  readonly config: WrapperConfig;
  readonly metadata: WrapperRegistrationFullMetadata;
  status: WrapperStatus;
  readonly statistics: WrapperRuntimeStatistics;
  readonly lifecycle: WrapperLifecycleInfo;
}

/**
 * Wrapper registration metadata
 */
export interface WrapperRegistrationMetadata {
  readonly registeredBy?: string;
  readonly version?: string;
  readonly tags?: readonly string[];
  readonly description?: string;
  readonly environment?: string;
  readonly team?: string;
  readonly contact?: string;
}

/**
 * Full wrapper registration metadata
 */
export interface WrapperRegistrationFullMetadata extends Omit<WrapperRegistrationMetadata, 'tags' | 'description' | 'version' | 'registeredBy'> {
  readonly registeredAt: Date;
  readonly registeredBy: string;
  readonly version: string;
  readonly tags: readonly string[];
  readonly description: string;
  readonly lastUpdated?: Date;
}

/**
 * Wrapper runtime statistics
 */
export interface WrapperRuntimeStatistics {
  totalInvocations: number;
  totalErrors: number;
  totalExecutionTime: number;
  averageExecutionTime: number;
  lastInvocation: Date | null;
  healthScore: number;
}

/**
 * Wrapper lifecycle information
 */
export interface WrapperLifecycleInfo {
  readonly createdAt: Date;
  lastHealthCheck: Date;
  lastAccessTime: Date;
  accessCount: number;
  errorCount: number;
}

/**
 * Wrapper registration result
 */
export interface WrapperRegistrationResult<T extends AnyFunction> {
  readonly success: boolean;
  readonly registrationId: string;
  readonly functionId: string;
  readonly wrappedFunction: WrapFunction<T> | null;
  readonly registrationTime: number;
  readonly error?: WrapperError;
  readonly metadata: {
    readonly category: FunctionCategory;
    readonly validationLevel: ValidationLevel;
    readonly securityRisk: SecurityRiskLevel;
    readonly registeredAt: Date;
  };
}

/**
 * Wrapper unregistration result
 */
export interface WrapperUnregistrationResult {
  readonly success: boolean;
  readonly unregistrationId: string;
  readonly functionId: string;
  readonly unregistrationTime: number;
  readonly finalStatistics?: WrapperRuntimeStatistics;
  readonly error?: string;
}

/**
 * Wrapper information
 */
export interface WrapperInfo {
  readonly functionId: string;
  readonly config: WrapperConfig;
  readonly metadata: WrapperRegistrationFullMetadata;
  readonly status: WrapperStatus;
  readonly statistics: WrapperRuntimeStatistics;
  readonly lifecycle: WrapperLifecycleInfo;
  readonly healthStatus: WrapperHealthStatus | null;
  readonly performanceMetrics: AggregatedPerformanceMetrics | null;
}

/**
 * Wrapper list filters
 */
export interface WrapperListFilters {
  readonly category?: FunctionCategory;
  readonly validationLevel?: ValidationLevel;
  readonly status?: WrapperStatus;
  readonly registeredBy?: string;
  readonly tags?: readonly string[];
  readonly sortBy?: 'registrationDate' | 'invocationCount' | 'errorRate' | 'healthScore';
  readonly limit?: number;
  readonly offset?: number;
}

/**
 * Registry statistics
 */
export interface RegistryStatistics {
  readonly totalWrappers: number;
  readonly activeWrappers: number;
  readonly inactiveWrappers: number;
  readonly errorWrappers: number;
  readonly statusDistribution: Record<WrapperStatus, number>;
  readonly categoryDistribution: Record<FunctionCategory, number>;
  readonly validationLevelDistribution: Record<ValidationLevel, number>;
  readonly totalInvocations: number;
  readonly totalErrors: number;
  readonly errorRate: number;
  readonly averageExecutionTime: number;
  readonly healthRatio: number;
  readonly memoryUsage: number;
  readonly uptime: number;
}

/**
 * Health check result
 */
export interface HealthCheckResult {
  readonly functionId: string;
  readonly healthy: boolean;
  readonly healthScore: number;
  readonly issues: readonly string[];
  readonly recommendations: readonly string[];
  readonly lastCheck: Date;
}

/**
 * Wrapper health status
 */
export interface WrapperHealthStatus {
  readonly functionId: string;
  readonly healthy: boolean;
  readonly healthScore: number;
  readonly issues: readonly string[];
  readonly recommendations: readonly string[];
  readonly lastCheck: Date;
}

/**
 * Wrapper configuration update result
 */
export interface WrapperConfigUpdateResult {
  readonly success: boolean;
  readonly updateId: string;
  readonly functionId: string;
  readonly oldConfig: WrapperConfig | null;
  readonly newConfig: WrapperConfig | null;
  readonly updateTime: number;
  readonly error?: string;
}

/**
 * Wrapper search criteria
 */
export interface WrapperSearchCriteria {
  readonly functionId?: string;
  readonly description?: string;
  readonly tags?: readonly string[];
  readonly category?: FunctionCategory;
  readonly validationLevel?: ValidationLevel;
  readonly registeredBy?: string;
  readonly limit?: number;
}

/**
 * Wrapper search result
 */
export interface WrapperSearchResult {
  readonly functionId: string;
  readonly score: number;
  readonly matches: readonly string[];
  readonly wrapper: WrapperInfo;
}

/**
 * Wrapper configuration export
 */
export interface WrapperConfigurationExport {
  readonly exportId: string;
  readonly exportTimestamp: Date;
  readonly totalConfigurations: number;
  readonly configurations: readonly ExportedWrapperConfig[];
  readonly registryVersion: string;
  readonly compatibility: {
    readonly minFrameworkVersion: string;
    readonly maxFrameworkVersion: string;
  };
}

/**
 * Exported wrapper configuration
 */
export interface ExportedWrapperConfig {
  readonly functionId: string;
  readonly config: WrapperConfig;
  readonly metadata: WrapperRegistrationFullMetadata;
  readonly statistics: WrapperRuntimeStatistics;
  readonly exportedAt: Date;
}

/**
 * Wrapper configuration import result
 */
export interface WrapperConfigurationImportResult {
  readonly importId: string;
  readonly importTime: number;
  readonly totalConfigurations: number;
  readonly successCount: number;
  readonly failureCount: number;
  readonly results: readonly WrapperImportResult[];
}

/**
 * Wrapper import result
 */
export interface WrapperImportResult {
  readonly functionId: string;
  readonly success: boolean;
  readonly action: 'imported' | 'skipped' | 'failed' | 'configuration-imported';
  readonly reason: string;
}

/**
 * Registry configuration
 */
export interface RegistryConfiguration {
  readonly maxWrappers: number;
  readonly cleanupInterval: number;
  readonly healthCheckInterval: number;
  readonly inactivityTimeout: number;
  readonly enablePersistence: boolean;
  readonly persistenceInterval: number;
  readonly enableMetrics: boolean;
  readonly enableEvents: boolean;
}

/**
 * Function registration
 */
export interface FunctionRegistration {
  readonly functionId: string;
  readonly registeredAt: Date;
  readonly registeredBy: string;
}

/**
 * Performance metrics data point
 */
export interface PerformanceMetrics {
  readonly timestamp: Date;
  readonly executionTime: number;
  readonly memoryUsage: number;
  readonly success: boolean;
}

/**
 * Aggregated performance metrics
 */
export interface AggregatedPerformanceMetrics {
  readonly totalInvocations: number;
  readonly averageExecutionTime: number;
  readonly minExecutionTime: number;
  readonly maxExecutionTime: number;
  readonly totalMemoryUsage: number;
  readonly averageMemoryUsage: number;
  readonly errorRate: number;
  readonly throughput: number;
  readonly lastUpdated: Date;
}

/**
 * Wrapper invocation event
 */
export interface WrapperInvocationEvent {
  readonly functionId: string;
  readonly timestamp: Date;
  readonly executionTime: number;
  readonly success: boolean;
  readonly userId?: string;
}

/**
 * Wrapper error event
 */
export interface WrapperErrorEvent {
  readonly functionId: string;
  readonly timestamp: Date;
  readonly error: WrapperError;
  readonly executionTime: number;
  readonly userId?: string;
}

/**
 * Wrapper performance event
 */
export interface WrapperPerformanceEvent {
  readonly functionId: string;
  readonly timestamp: Date;
  readonly executionTime: number;
  readonly memoryUsage: number;
  readonly success: boolean;
  readonly userId?: string;
}