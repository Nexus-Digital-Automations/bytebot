/**
 * PARLANT Phase 1 Function Registration System - Auto Registration Service
 *
 * Implements automatic function registration based on discovery results.
 * Provides intelligent registration with conflict resolution, validation,
 * and integration with the main registry system.
 *
 * @fileoverview Auto registration service for discovered functions
 * @version 1.0.0
 * @author Auto Registration Agent #4
 */

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  RegistrationResult
} from '../core/registry.interface';
import {
  FunctionDiscoveryEntry,
  FunctionRegistryEntry,
  FunctionMetadata,
  FunctionRegistrationConfig,
  FunctionDependencyInfo,
  FunctionHealthStatus,
  FunctionVersionInfo,
  RegistrationTimestamps,
  RegistrationStatus,
  PerformanceCharacteristics,
  IntensityLevel,
  Permission,
  PermissionScope,
  AuditRequirement,
  AuditType,
  AuditLevel,
  CacheConfig,
  CacheStrategy,
  CacheStorageType,
  MonitoringConfig,
  MonitoringMetric,
  ErrorHandlingConfig,
  ErrorHandlingStrategy,
  RetryConfig,
  CircuitBreakerConfig,
  FallbackConfig,
  FallbackStrategy,
  FunctionSecurityAssessment,
  SecurityConsideration,
  SecurityConsiderationType,
  SecuritySeverity
} from '../core/registry.types';
import {
  FunctionSecurityLevel,
  RiskLevel,
  ValidationMode,
  ApprovalLevel,
  AuthorInfo,
  SecurityConstraint
} from '../../../types/parlant-integration.types';

/**
 * Registration conflict types
 */
export enum RegistrationConflictType {
  _FUNCTION_EXISTS = 'function_exists',
  _NAME_COLLISION = 'name_collision',
  _SIGNATURE_MISMATCH = 'signature_mismatch',
  _LOCATION_CONFLICT = 'location_conflict',
  _VERSION_CONFLICT = 'version_conflict'
}

/**
 * Registration conflict resolution strategies
 */
export enum ConflictResolutionStrategy {
  _SKIP = 'skip',
  _OVERWRITE = 'overwrite',
  _MERGE = 'merge',
  _VERSION_INCREMENT = 'version_increment',
  _RENAME = 'rename',
  _MANUAL_REVIEW = 'manual_review'
}

/**
 * Registration conflict information
 */
export interface RegistrationConflict {
  type: RegistrationConflictType;
  functionId: string;
  existing: FunctionRegistryEntry;
  incoming: FunctionDiscoveryEntry;
  recommendedStrategy: ConflictResolutionStrategy;
  description: string;
  severity: ConflictSeverity;
}

export enum ConflictSeverity {
  _LOW = 'low',
  _MEDIUM = 'medium',
  _HIGH = 'high',
  _CRITICAL = 'critical'
}

/**
 * Auto registration configuration
 */
export interface AutoRegistrationConfig {
  /** Enable automatic registration */
  enabled: boolean;

  /** Conflict resolution strategy */
  conflictResolution: ConflictResolutionStrategy;

  /** Minimum confidence threshold for auto registration */
  confidenceThreshold: number;

  /** Maximum functions to register per batch */
  batchSize: number;

  /** Enable validation before registration */
  validateBeforeRegistration: boolean;

  /** Enable security assessment */
  enableSecurityAssessment: boolean;

  /** Enable dependency analysis */
  enableDependencyAnalysis: boolean;

  /** Default configuration template */
  defaultConfigTemplate: string;

  /** Notification settings */
  notifications: NotificationConfig;

  /** Retry settings */
  retry: RetryConfig;
}

export interface NotificationConfig {
  /** Enable notifications */
  enabled: boolean;

  /** Notification channels */
  channels: string[];

  /** Notify on conflicts */
  notifyOnConflicts: boolean;

  /** Notify on failures */
  notifyOnFailures: boolean;

  /** Notify on successful registrations */
  notifyOnSuccess: boolean;
}

/**
 * Auto registration result
 */
export interface AutoRegistrationResult {
  /** Total functions processed */
  totalProcessed: number;

  /** Successfully registered functions */
  successfulRegistrations: string[];

  /** Failed registrations */
  failedRegistrations: RegistrationFailure[];

  /** Detected conflicts */
  conflicts: RegistrationConflict[];

  /** Registration statistics */
  statistics: RegistrationStatistics;

  /** Processing duration */
  duration: number;

  /** Batch ID */
  batchId: string;
}

export interface RegistrationFailure {
  functionId: string;
  error: string;
  details: Record<string, unknown>;
  retryable: boolean;
}

export interface RegistrationStatistics {
  /** Functions registered by discovery method */
  byDiscoveryMethod: Record<string, number>;

  /** Functions registered by security level */
  bySecurityLevel: Record<string, number>;

  /** Functions registered by package */
  byPackage: Record<string, number>;

  /** Average confidence score */
  averageConfidence: number;

  /** Average processing time per function */
  averageProcessingTime: number;
}

/**
 * Automatic function registration service
 */
@Injectable()
export class AutoRegistrationService {
  private readonly logger = new Logger(AutoRegistrationService.name);

  constructor(
    private readonly eventEmitter: EventEmitter2
  ) {}

  /**
   * Automatically register discovered functions
   */
  async registerFunctions(
    discoveredFunctions: FunctionDiscoveryEntry[],
    config: AutoRegistrationConfig
  ): Promise<AutoRegistrationResult> {
    const startTime = Date.now();
    const batchId = this.generateBatchId();

    this.logger.log(`Starting auto registration batch ${batchId} with ${discoveredFunctions.length} functions`);

    const result: AutoRegistrationResult = {
      totalProcessed: 0,
      successfulRegistrations: [],
      failedRegistrations: [],
      conflicts: [],
      statistics: this.initializeStatistics(),
      duration: 0,
      batchId
    };

    try {
      // Filter functions by confidence threshold
      const qualifiedFunctions = discoveredFunctions.filter(
        func => func.confidence >= config.confidenceThreshold
      );

      this.logger.debug(`${qualifiedFunctions.length} functions meet confidence threshold of ${config.confidenceThreshold}`);

      // Process functions in batches
      const batches = this.createBatches(qualifiedFunctions, config.batchSize);

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        this.logger.debug(`Processing batch ${i + 1}/${batches.length} with ${batch.length} functions`);

        await this.processBatch(batch, config, result);
      }

      // Calculate final statistics
      result.totalProcessed = discoveredFunctions.length;
      result.duration = Date.now() - startTime;
      this.calculateFinalStatistics(result);

      // Send notifications
      if (config.notifications.enabled) {
        await this.sendNotifications(result, config.notifications);
      }

      // Emit events
      this.eventEmitter.emit('auto-registration.completed', result);

      this.logger.log(
        `Auto registration batch ${batchId} completed: ` +
        `${result.successfulRegistrations.length} successful, ` +
        `${result.failedRegistrations.length} failed, ` +
        `${result.conflicts.length} conflicts`
      );

      return result;

    } catch (error) {
      this.logger.error(`Auto registration batch ${batchId} failed: ${error.message}`, error.stack);
      this.eventEmitter.emit('auto-registration.failed', { batchId, error: error.message });
      throw error;
    }
  }

  /**
   * Register single function with conflict detection
   */
  async registerFunction(
    discoveredFunction: FunctionDiscoveryEntry,
    config: AutoRegistrationConfig
  ): Promise<RegistrationResult> {
    const functionId = this.generateFunctionId(discoveredFunction);

    this.logger.debug(`Registering function: ${functionId}`);

    try {
      // Check for existing registration
      const existingFunction = await this.checkExistingFunction(functionId);

      if (existingFunction) {
        const conflict = await this.detectConflict(discoveredFunction, existingFunction);
        if (conflict) {
          return await this.handleConflict(conflict, config);
        }
      }

      // Validate function if enabled
      if (config.validateBeforeRegistration) {
        const validationResult = await this.validateFunction(discoveredFunction);
        if (!validationResult.valid) {
          return {
            success: false,
            functionId,
            message: `Validation failed: ${validationResult.errors.join(', ')}`,
            warnings: validationResult.warnings,
            metadata: { validationErrors: validationResult.errors }
          };
        }
      }

      // Create registry entry
      const registryEntry = await this.createRegistryEntry(discoveredFunction, config);

      // Register the function
      const registrationResult = await this.performRegistration(registryEntry);

      // Emit success event
      this.eventEmitter.emit('function.registered', {
        functionId,
        method: discoveredFunction.method,
        confidence: discoveredFunction.confidence
      });

      return registrationResult;

    } catch (error) {
      this.logger.error(`Failed to register function ${functionId}: ${error.message}`, error.stack);

      this.eventEmitter.emit('function.registration-failed', {
        functionId,
        error: error.message
      });

      return {
        success: false,
        functionId,
        message: `Registration failed: ${error.message}`,
        warnings: [],
        metadata: { error: error.message }
      };
    }
  }

  /**
   * Detect and resolve registration conflicts
   */
  async detectAndResolveConflicts(
    discoveredFunctions: FunctionDiscoveryEntry[],
    resolutionStrategy: ConflictResolutionStrategy
  ): Promise<RegistrationConflict[]> {
    const conflicts: RegistrationConflict[] = [];

    for (const discoveredFunction of discoveredFunctions) {
      const functionId = this.generateFunctionId(discoveredFunction);
      const existingFunction = await this.checkExistingFunction(functionId);

      if (existingFunction) {
        const conflict = await this.detectConflict(discoveredFunction, existingFunction);
        if (conflict) {
          conflicts.push(conflict);

          // Apply resolution strategy
          await this.applyConflictResolution(conflict, resolutionStrategy);
        }
      }
    }

    return conflicts;
  }

  // ===========================
  // PRIVATE HELPER METHODS
  // ===========================

  /**
   * Generate unique batch ID
   */
  private generateBatchId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate function ID from discovery entry
   */
  private generateFunctionId(discoveredFunction: FunctionDiscoveryEntry): string {
    const { name, location } = discoveredFunction;
    const cleanPath = location.filePath.replace(/[^a-zA-Z0-9]/g, '_');
    return `${location.packageName}_${location.moduleName}_${name}_${cleanPath}_${location.lineNumber}`;
  }

  /**
   * Initialize registration statistics
   */
  private initializeStatistics(): RegistrationStatistics {
    return {
      byDiscoveryMethod: {},
      bySecurityLevel: {},
      byPackage: {},
      averageConfidence: 0,
      averageProcessingTime: 0
    };
  }

  /**
   * Create batches of functions for processing
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Process a batch of functions
   */
  private async processBatch(
    batch: FunctionDiscoveryEntry[],
    config: AutoRegistrationConfig,
    result: AutoRegistrationResult
  ): Promise<void> {
    const promises = batch.map(async (discoveredFunction) => {
      const functionId = this.generateFunctionId(discoveredFunction);
      const startTime = Date.now();

      try {
        const registrationResult = await this.registerFunction(discoveredFunction, config);

        if (registrationResult.success) {
          result.successfulRegistrations.push(functionId);
          this.updateStatistics(result.statistics, discoveredFunction, Date.now() - startTime);
        } else {
          result.failedRegistrations.push({
            functionId,
            error: registrationResult.message,
            details: registrationResult.metadata || {},
            retryable: this.isRetryableError(registrationResult.message)
          });
        }

      } catch (error) {
        result.failedRegistrations.push({
          functionId,
          error: error.message,
          details: { stack: error.stack },
          retryable: this.isRetryableError(error.message)
        });
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Check if function already exists in registry
   */
  private async checkExistingFunction(functionId: string): Promise<FunctionRegistryEntry | null> {
    // This would query the actual registry
    // For now, return null (no existing function)
    return null;
  }

  /**
   * Detect conflicts between discovered and existing functions
   */
  private async detectConflict(
    discoveredFunction: FunctionDiscoveryEntry,
    existingFunction: FunctionRegistryEntry
  ): Promise<RegistrationConflict | null> {
    const conflicts: RegistrationConflictType[] = [];

    // Check for name collision
    if (discoveredFunction.name === existingFunction.name) {
      conflicts.push(RegistrationConflictType._NAME_COLLISION);
    }

    // Check for signature mismatch
    if (this.hasSignatureMismatch(discoveredFunction, existingFunction)) {
      conflicts.push(RegistrationConflictType._SIGNATURE_MISMATCH);
    }

    // Check for location conflict
    if (this.hasLocationConflict(discoveredFunction, existingFunction)) {
      conflicts.push(RegistrationConflictType._LOCATION_CONFLICT);
    }

    if (conflicts.length === 0) {
      return null;
    }

    const primaryConflict = conflicts[0];
    const severity = this.assessConflictSeverity(conflicts);

    return {
      type: primaryConflict,
      functionId: existingFunction.id,
      existing: existingFunction,
      incoming: discoveredFunction,
      recommendedStrategy: this.recommendResolutionStrategy(conflicts, severity),
      description: this.generateConflictDescription(conflicts),
      severity
    };
  }

  /**
   * Check for signature mismatch
   */
  private hasSignatureMismatch(
    discoveredFunction: FunctionDiscoveryEntry,
    existingFunction: FunctionRegistryEntry
  ): boolean {
    const discoveredParams = discoveredFunction.signature.parameters.length;
    const existingParams = existingFunction.signature.parameters.length;

    return discoveredParams !== existingParams ||
           discoveredFunction.signature.isAsync !== existingFunction.signature.isAsync;
  }

  /**
   * Check for location conflict
   */
  private hasLocationConflict(
    discoveredFunction: FunctionDiscoveryEntry,
    existingFunction: FunctionRegistryEntry
  ): boolean {
    // This would check if the same function appears in different locations
    return false; // Simplified for now
  }

  /**
   * Assess conflict severity
   */
  private assessConflictSeverity(conflicts: RegistrationConflictType[]): ConflictSeverity {
    if (conflicts.includes(RegistrationConflictType._SIGNATURE_MISMATCH)) {
      return ConflictSeverity._HIGH;
    }
    if (conflicts.includes(RegistrationConflictType._NAME_COLLISION)) {
      return ConflictSeverity._MEDIUM;
    }
    return ConflictSeverity._LOW;
  }

  /**
   * Recommend conflict resolution strategy
   */
  private recommendResolutionStrategy(
    conflicts: RegistrationConflictType[],
    severity: ConflictSeverity
  ): ConflictResolutionStrategy {
    if (severity === ConflictSeverity._HIGH) {
      return ConflictResolutionStrategy._MANUAL_REVIEW;
    }
    if (conflicts.includes(RegistrationConflictType._SIGNATURE_MISMATCH)) {
      return ConflictResolutionStrategy._VERSION_INCREMENT;
    }
    return ConflictResolutionStrategy._MERGE;
  }

  /**
   * Generate conflict description
   */
  private generateConflictDescription(conflicts: RegistrationConflictType[]): string {
    const descriptions = {
      [RegistrationConflictType._FUNCTION_EXISTS]: 'Function already exists in registry',
      [RegistrationConflictType._NAME_COLLISION]: 'Function name collision detected',
      [RegistrationConflictType._SIGNATURE_MISMATCH]: 'Function signature mismatch',
      [RegistrationConflictType._LOCATION_CONFLICT]: 'Function location conflict',
      [RegistrationConflictType._VERSION_CONFLICT]: 'Function version conflict'
    };

    return conflicts.map(conflict => descriptions[conflict]).join('; ');
  }

  /**
   * Handle registration conflict
   */
  private async handleConflict(
    conflict: RegistrationConflict,
    config: AutoRegistrationConfig
  ): Promise<RegistrationResult> {
    const strategy = config.conflictResolution !== ConflictResolutionStrategy._MANUAL_REVIEW
      ? config.conflictResolution
      : conflict.recommendedStrategy;

    return await this.applyConflictResolution(conflict, strategy);
  }

  /**
   * Apply conflict resolution strategy
   */
  private async applyConflictResolution(
    conflict: RegistrationConflict,
    strategy: ConflictResolutionStrategy
  ): Promise<RegistrationResult> {
    const functionId = conflict.functionId;

    switch (strategy) {
      case ConflictResolutionStrategy._SKIP:
        return {
          success: false,
          functionId,
          message: 'Function registration skipped due to conflict',
          warnings: [`Conflict: ${conflict.description}`],
          metadata: { conflict, strategy }
        };

      case ConflictResolutionStrategy._OVERWRITE:
        // Would replace existing function
        return {
          success: true,
          functionId,
          message: 'Function overwritten',
          warnings: [`Overwrote existing function: ${conflict.description}`],
          metadata: { conflict, strategy }
        };

      case ConflictResolutionStrategy._MERGE:
        // Would merge function information
        return {
          success: true,
          functionId,
          message: 'Function information merged',
          warnings: [`Merged with existing function: ${conflict.description}`],
          metadata: { conflict, strategy }
        };

      case ConflictResolutionStrategy._VERSION_INCREMENT:
        // Would create new version
        return {
          success: true,
          functionId: `${functionId}_v2`,
          message: 'Function registered as new version',
          warnings: [`Created new version due to conflict: ${conflict.description}`],
          metadata: { conflict, strategy }
        };

      case ConflictResolutionStrategy._RENAME:
        // Would rename the function
        return {
          success: true,
          functionId: `${functionId}_alt`,
          message: 'Function registered with alternate name',
          warnings: [`Renamed due to conflict: ${conflict.description}`],
          metadata: { conflict, strategy }
        };

      case ConflictResolutionStrategy._MANUAL_REVIEW:
      default:
        return {
          success: false,
          functionId,
          message: 'Function requires manual review',
          warnings: [`Manual review required: ${conflict.description}`],
          metadata: { conflict, strategy, requiresManualReview: true }
        };
    }
  }

  /**
   * Validate function before registration
   */
  private async validateFunction(discoveredFunction: FunctionDiscoveryEntry): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate function name
    if (!discoveredFunction.name || discoveredFunction.name.trim() === '') {
      errors.push('Function name is required');
    }

    // Validate location
    if (!discoveredFunction.location.filePath) {
      errors.push('Function file path is required');
    }

    // Validate confidence
    if (discoveredFunction.confidence < 0 || discoveredFunction.confidence > 1) {
      errors.push('Function confidence must be between 0 and 1');
    }

    // Check for suspicious patterns
    if (discoveredFunction.name.includes('test') || discoveredFunction.name.includes('mock')) {
      warnings.push('Function appears to be test or mock code');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Create registry entry from discovered function
   */
  private async createRegistryEntry(
    discoveredFunction: FunctionDiscoveryEntry,
    config: AutoRegistrationConfig
  ): Promise<FunctionRegistryEntry> {
    const functionId = this.generateFunctionId(discoveredFunction);
    const now = new Date();

    // Create metadata
    const metadata: FunctionMetadata = {
      description: `Auto-discovered function: ${discoveredFunction.name}`,
      purpose: 'Automatically discovered function',
      examples: [],
      tags: ['auto-discovered', discoveredFunction.method],
      relatedFunctions: [],
      performance: this.createDefaultPerformanceCharacteristics(),
      author: this.createDefaultAuthorInfo(),
      documentation: [],
      deprecation: undefined
    };

    // Create security assessment
    const security: FunctionSecurityAssessment = await this.assessSecurity(discoveredFunction);

    // Create registration configuration
    const registrationConfig: FunctionRegistrationConfig = this.createDefaultConfiguration(config);

    // Create dependency info
    const dependencies: FunctionDependencyInfo = {
      direct: [],
      transitive: [],
      dependents: [],
      external: [],
      graphMetadata: {
        complexity: 0,
        depth: 0,
        breadth: 0,
        circularDependencies: false,
        criticalPath: []
      }
    };

    // Create health status
    const health: FunctionHealthStatus = {
      score: 0.8, // Default healthy score
      indicators: [],
      lastCheck: now,
      trend: 'unknown' as any,
      history: []
    };

    // Create version info
    const version: FunctionVersionInfo = {
      current: '1.0.0',
      history: [{
        version: '1.0.0',
        timestamp: now,
        author: 'auto-discovery',
        changes: [{
          type: 'feature' as any,
          description: 'Initial auto-discovery',
          breaking: false,
          impact: 'none' as any
        }],
        tags: ['initial', 'auto-discovered']
      }],
      comparison: {
        previousVersion: {
          version: '',
          differences: [],
          compatible: true,
          migrationRequired: false
        },
        latestStable: {
          version: '1.0.0',
          differences: [],
          compatible: true,
          migrationRequired: false
        },
        compatibility: {
          backward: 'full' as any,
          forward: 'full' as any,
          api: 'full' as any,
          binary: 'full' as any
        }
      },
      migration: {
        required: false,
        steps: [],
        complexity: 'trivial' as any,
        estimatedDuration: '0 minutes'
      }
    };

    // Create timestamps
    const timestamps: RegistrationTimestamps = {
      registered: now,
      updated: now,
      accessed: now,
      healthCheck: now,
      validated: now
    };

    return {
      id: functionId,
      name: discoveredFunction.name,
      qualifiedName: `${discoveredFunction.location.packageName}.${discoveredFunction.location.moduleName}.${discoveredFunction.name}`,
      signature: discoveredFunction.signature,
      metadata,
      security,
      config: registrationConfig,
      dependencies,
      health,
      version,
      timestamps,
      status: RegistrationStatus._ACTIVE
    };
  }

  /**
   * Create default performance characteristics
   */
  private createDefaultPerformanceCharacteristics(): PerformanceCharacteristics {
    return {
      timeComplexity: 'O(1)',
      spaceComplexity: 'O(1)',
      averageExecutionTime: undefined,
      memoryUsage: undefined,
      cpuIntensity: IntensityLevel._LOW,
      ioIntensity: IntensityLevel._LOW,
      networkUsage: IntensityLevel._NONE
    };
  }

  /**
   * Create default author info
   */
  private createDefaultAuthorInfo(): AuthorInfo {
    return {
      name: 'Auto Discovery System',
      email: undefined,
      team: 'PARLANT Registry',
      createdAt: new Date(),
    };
  }

  /**
   * Assess function security
   */
  private async assessSecurity(discoveredFunction: FunctionDiscoveryEntry): Promise<FunctionSecurityAssessment> {
    // Simplified security assessment
    const functionName = discoveredFunction.name.toLowerCase();

    let securityLevel = FunctionSecurityLevel._PUBLIC;
    let riskLevel = RiskLevel._LOW;
    const considerations: SecurityConsideration[] = [];

    // Check for sensitive patterns
    if (functionName.includes('auth') || functionName.includes('login') || functionName.includes('password')) {
      securityLevel = FunctionSecurityLevel._RESTRICTED;
      riskLevel = RiskLevel._HIGH;
      considerations.push({
        type: SecurityConsiderationType._AUTHENTICATION_BYPASS,
        description: 'Function appears to handle authentication',
        severity: SecuritySeverity._HIGH,
        mitigations: ['Require multi-factor authentication', 'Add audit logging']
      });
    }

    if (functionName.includes('admin') || functionName.includes('delete') || functionName.includes('drop')) {
      securityLevel = FunctionSecurityLevel._CONFIDENTIAL;
      riskLevel = RiskLevel._HIGH;
      considerations.push({
        type: SecurityConsiderationType._PRIVILEGE_ESCALATION,
        description: 'Function appears to have administrative privileges',
        severity: SecuritySeverity._HIGH,
        mitigations: ['Require explicit approval', 'Implement role-based access control']
      });
    }

    return {
      level: securityLevel,
      risk: riskLevel,
      considerations,
      permissions: [{
        name: 'execute',
        scope: PermissionScope._EXECUTE,
        description: 'Permission to execute the function',
        required: true
      }],
      constraints: [],
      auditRequirements: [{
        type: AuditType._ACCESS_LOG,
        level: AuditLevel._BASIC,
        retentionPeriod: 90,
        description: 'Log function access attempts'
      }]
    };
  }

  /**
   * Create default registration configuration
   */
  private createDefaultConfiguration(config: AutoRegistrationConfig): FunctionRegistrationConfig {
    return {
      enabled: true,
      defaultValidationMode: ValidationMode._STRICT,
      defaultApprovalLevel: ApprovalLevel._AUTOMATIC,
      defaultTimeout: 30000,
      cache: {
        enabled: true,
        ttl: 3600,
        strategy: CacheStrategy._FUNCTION_LEVEL,
        keyPattern: '{functionId}:{parameters}',
        storageType: CacheStorageType._MEMORY
      },
      monitoring: {
        enabled: true,
        metrics: [
          MonitoringMetric._EXECUTION_TIME,
          MonitoringMetric._ERROR_RATE,
          MonitoringMetric._CALL_FREQUENCY
        ],
        alerting: {
          enabled: true,
          thresholds: [],
          channels: []
        },
        samplingRate: 0.1
      },
      errorHandling: {
        strategy: ErrorHandlingStrategy._RETRY,
        retry: {
          maxAttempts: 3,
          initialDelay: 1000,
          delayMultiplier: 2,
          maxDelay: 10000,
          jitter: true
        },
        circuitBreaker: {
          failureThreshold: 5,
          successThreshold: 3,
          timeout: 60000,
          retryDelay: 30000
        },
        fallback: {
          strategy: FallbackStrategy._RETURN_ERROR,
          config: {}
        }
      },
      overrides: []
    };
  }

  /**
   * Perform actual function registration
   */
  private async performRegistration(registryEntry: FunctionRegistryEntry): Promise<RegistrationResult> {
    // This would interact with the actual registry service
    // For now, simulate successful registration

    this.logger.debug(`Registering function ${registryEntry.id} in registry`);

    // Simulate registration delay
    await new Promise(resolve => setTimeout(resolve, 10));

    return {
      success: true,
      functionId: registryEntry.id,
      message: 'Function registered successfully',
      warnings: [],
      metadata: {
        registrationTime: new Date().toISOString(),
        confidence: 0.9
      }
    };
  }

  /**
   * Update registration statistics
   */
  private updateStatistics(
    statistics: RegistrationStatistics,
    discoveredFunction: FunctionDiscoveryEntry,
    processingTime: number
  ): void {
    // Update by discovery method
    const method = discoveredFunction.method;
    statistics.byDiscoveryMethod[method] = (statistics.byDiscoveryMethod[method] || 0) + 1;

    // Update by package
    const packageName = discoveredFunction.location.packageName;
    statistics.byPackage[packageName] = (statistics.byPackage[packageName] || 0) + 1;

    // Update confidence and processing time (would need proper accumulation)
    statistics.averageConfidence = discoveredFunction.confidence;
    statistics.averageProcessingTime = processingTime;
  }

  /**
   * Calculate final statistics
   */
  private calculateFinalStatistics(result: AutoRegistrationResult): void {
    // Calculate averages and totals
    const total = result.successfulRegistrations.length;
    if (total > 0) {
      // This would properly calculate averages from accumulated values
      // For now, keep the current values
    }
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(errorMessage: string): boolean {
    const retryablePatterns = [
      'timeout',
      'connection',
      'network',
      'temporary',
      'rate limit'
    ];

    return retryablePatterns.some(pattern =>
      errorMessage.toLowerCase().includes(pattern)
    );
  }

  /**
   * Send notifications about registration results
   */
  private async sendNotifications(
    result: AutoRegistrationResult,
    config: NotificationConfig
  ): Promise<void> {
    if (!config.enabled) return;

    const notifications: Array<{ type: string; message: string; data: any }> = [];

    // Success notifications
    if (config.notifyOnSuccess && result.successfulRegistrations.length > 0) {
      notifications.push({
        type: 'success',
        message: `Successfully registered ${result.successfulRegistrations.length} functions`,
        data: { batchId: result.batchId, count: result.successfulRegistrations.length }
      });
    }

    // Failure notifications
    if (config.notifyOnFailures && result.failedRegistrations.length > 0) {
      notifications.push({
        type: 'failure',
        message: `Failed to register ${result.failedRegistrations.length} functions`,
        data: { batchId: result.batchId, failures: result.failedRegistrations }
      });
    }

    // Conflict notifications
    if (config.notifyOnConflicts && result.conflicts.length > 0) {
      notifications.push({
        type: 'conflict',
        message: `Detected ${result.conflicts.length} registration conflicts`,
        data: { batchId: result.batchId, conflicts: result.conflicts }
      });
    }

    // Send notifications to configured channels
    for (const notification of notifications) {
      for (const channel of config.channels) {
        try {
          await this.sendNotification(channel, notification);
        } catch (error) {
          this.logger.warn(`Failed to send notification to ${channel}: ${error.message}`);
        }
      }
    }
  }

  /**
   * Send notification to specific channel
   */
  private async sendNotification(channel: string, notification: any): Promise<void> {
    // This would integrate with actual notification services
    this.logger.log(`Sending ${notification.type} notification to ${channel}: ${notification.message}`);
  }
}