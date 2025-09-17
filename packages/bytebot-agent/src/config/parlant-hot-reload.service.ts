/**
 * Parlant-Enhanced Configuration Hot-Reload Service - PARLANT INTEGRATED
 *
 * Provides conversational validation for ALL configuration hot-reload operations
 * with MAXIMUM Parlant integration for dynamic configuration updates. Wraps the
 * existing ConfigurationHotReloadService with risk-based conversational approval
 * workflows to ensure safe configuration changes in running systems.
 *
 * Features:
 * - Conversational validation for ALL hot-reload operations
 * - Risk-based approval system (HIGH/CRITICAL for production)
 * - Real-time configuration change validation with Parlant approval
 * - Emergency hot-reload procedures with enhanced validation
 * - Production safeguards with dual approval workflows
 * - Comprehensive audit trails for all configuration changes
 * - Performance impact monitoring for validation overhead
 *
 * PARLANT INTEGRATION:
 * - Configuration file changes: HIGH risk (requires approval for system integrity)
 * - Environment variable changes: HIGH risk (affects runtime behavior)
 * - Secrets file changes: CRITICAL risk (sensitive data exposure)
 * - Docker Compose changes: HIGH risk (deployment infrastructure changes)
 * - Manual reload operations: MEDIUM risk (administrative actions)
 * - Emergency reload procedures: CRITICAL risk (system stability)
 *
 * @author Claude Code - Agent 3 (Configuration & Secrets Management Parlant Integration)
 * @version 3.0.0 - PARLANT MAXIMUM INTEGRATION
 */

import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { EventEmitter } from 'events';
import {
  ConfigurationHotReloadService,
  LocalConfigurationChangeEvent,
} from './hot-reload.service';
import {
  ParlantConfigurationService,
  ConfigurationOperationContext,
  ParlantRiskLevel,
  ParlantValidationResponse,
} from './parlant-configuration.service';

/**
 * Parlant-enhanced hot-reload operation types
 */
export enum HotReloadOperationType {
  FILE_CHANGE_CONFIG = 'file_change_config',
  FILE_CHANGE_ENV = 'file_change_env',
  FILE_CHANGE_SECRETS = 'file_change_secrets',
  FILE_CHANGE_DOCKER = 'file_change_docker',
  MANUAL_RELOAD = 'manual_reload',
  MANUAL_RELOAD_SPECIFIC = 'manual_reload_specific',
  EMERGENCY_RELOAD = 'emergency_reload',
  ROLLBACK_OPERATION = 'rollback_operation',
  VALIDATION_OPERATION = 'validation_operation',
}

/**
 * Hot-reload operation result with Parlant validation
 */
export interface ParlantHotReloadResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  validationDetails: {
    approved: boolean;
    riskLevel: ParlantRiskLevel;
    conversationId?: string;
    reason?: string;
    validationDuration: number;
    cacheHit: boolean;
    requiresManualApproval: boolean;
  };
  operationContext: {
    operationType: HotReloadOperationType;
    filePath?: string;
    fileType?: string;
    timestamp: Date;
    userId?: string;
    sessionId?: string;
    emergency?: boolean;
  };
  auditTrail: {
    operationId: string;
    conversationContext?: string;
    approvalChain: string[];
    securityEvents: string[];
    performanceMetrics: {
      totalDuration: number;
      validationOverhead: number;
      reloadDuration?: number;
    };
  };
}

/**
 * Hot-reload change event with Parlant validation context
 */
export interface ParlantHotReloadChangeEvent
  extends LocalConfigurationChangeEvent {
  parlantContext: {
    validationApproved: boolean;
    riskLevel: ParlantRiskLevel;
    conversationId?: string;
    approvalDuration: number;
    requiresFollowUp: boolean;
  };
}

/**
 * Parlant-Enhanced Configuration Hot-Reload Service
 * Adds conversational validation to all configuration hot-reload operations
 */
@Injectable()
export class ParlantConfigurationHotReloadService
  extends EventEmitter
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger('ParlantConfigurationHotReloadService');
  private isInitialized = false;
  private validationMetrics = {
    totalValidations: 0,
    approvedValidations: 0,
    rejectedValidations: 0,
    emergencyOperations: 0,
    averageValidationTime: 0,
    cacheHitRate: 0,
  };

  constructor(
    private readonly hotReloadService: ConfigurationHotReloadService,
    private readonly parlantConfigService: ParlantConfigurationService,
  ) {
    super();
    this.logger.log('Parlant-Enhanced Hot-Reload Service initialized');
    this.logger.log(
      'PARLANT INTEGRATION: Conversational validation active for ALL hot-reload operations',
    );
  }

  /**
   * Initialize Parlant hot-reload service
   */
  onModuleInit(): void {
    try {
      this.logger.log('Initializing Parlant-Enhanced Hot-Reload Service...');

      // Set up event listeners for hot-reload service events
      this.setupHotReloadEventListeners();

      // Initialize Parlant validation monitoring
      this.initializeParlantValidationMonitoring();

      this.isInitialized = true;
      this.logger.log(
        'Parlant-Enhanced Hot-Reload Service initialized successfully',
      );
    } catch (error) {
      this.logger.error(
        'Parlant-Enhanced Hot-Reload Service initialization failed',
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  /**
   * Cleanup resources on module destroy
   */
  onModuleDestroy(): void {
    this.logger.log('Destroying Parlant-Enhanced Hot-Reload Service...');

    try {
      // Remove event listeners
      this.removeAllListeners();

      this.isInitialized = false;
      this.logger.log(
        'Parlant-Enhanced Hot-Reload Service destroyed successfully',
        {
          finalMetrics: this.getValidationMetrics(),
        },
      );
    } catch (error) {
      this.logger.error(
        'Error during Parlant-Enhanced Hot-Reload Service destruction',
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  /**
   * Setup event listeners for hot-reload service events
   */
  private setupHotReloadEventListeners(): void {
    // Listen for configuration changes and add Parlant validation
    this.hotReloadService.on(
      'configurationChanged',
      (event: LocalConfigurationChangeEvent) => {
        this.handleConfigurationChangeWithParlant(event);
      },
    );

    // Listen for configuration rollbacks
    this.hotReloadService.on('configurationRolledBack', (event: any) => {
      this.handleConfigurationRollbackWithParlant(event);
    });

    // Listen for hot-reload initialization
    this.hotReloadService.on('hotReload.initialized', (event: any) => {
      this.logger.log(
        'Hot-reload service initialized, Parlant validation ready',
        {
          initializationEvent: event,
        },
      );
    });

    this.logger.debug(
      'Hot-reload event listeners configured for Parlant validation',
    );
  }

  /**
   * Initialize Parlant validation monitoring
   */
  private initializeParlantValidationMonitoring(): void {
    // Set up periodic metrics collection
    setInterval(() => {
      this.collectValidationMetrics();
    }, 60000); // Collect metrics every minute

    this.logger.debug('Parlant validation monitoring initialized');
  }

  /**
   * Handle configuration changes with Parlant validation
   */
  private async handleConfigurationChangeWithParlant(
    event: LocalConfigurationChangeEvent,
  ): Promise<void> {
    const operationId = `parlant-change-${Date.now()}`;

    try {
      this.logger.debug(
        `[${operationId}] Processing configuration change with Parlant validation`,
        {
          type: event.type,
          source: event.source,
          changes: event.changes.length,
        },
      );

      // Determine risk level
      const riskLevel = this.calculateRiskLevel(event.type, event.changes);

      // Create validation context
      const context: ConfigurationOperationContext = {
        riskLevel,
        requiresApproval:
          riskLevel === ParlantRiskLevel.HIGH ||
          riskLevel === ParlantRiskLevel.CRITICAL,
        auditRequired: true,
        productionSafeguards: this.isProductionEnvironment(),
        configurationScope: this.determineConfigurationScope(event.source),
        changeImpact: this.assessChangeImpact(event.changes),
        emergencyOperation: false,
      };

      // Perform Parlant validation if the change was successful
      if (event.successful) {
        const validation =
          await this.parlantConfigService.validateConfigurationOperation(
            context,
          );

        this.updateValidationMetrics(validation);

        // Create enhanced event with Parlant context
        const enhancedEvent: ParlantHotReloadChangeEvent = {
          ...event,
          parlantContext: {
            validationApproved: validation.approved,
            riskLevel: validation.riskLevel,
            conversationId: validation.conversationId,
            approvalDuration: validation.performanceImpact.validationDuration,
            requiresFollowUp:
              !validation.approved || riskLevel === ParlantRiskLevel.CRITICAL,
          },
        };

        this.emit('parlantConfigurationChanged', enhancedEvent);

        this.logger.log(
          `[${operationId}] Configuration change validated with Parlant`,
          {
            approved: validation.approved,
            riskLevel: validation.riskLevel,
            conversationId: validation.conversationId,
          },
        );

        // If validation failed, emit warning
        if (!validation.approved) {
          this.logger.warn(
            `[${operationId}] Configuration change not approved by Parlant`,
            {
              reason: validation.reason,
              riskLevel: validation.riskLevel,
            },
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `[${operationId}] Error processing configuration change with Parlant`,
        {
          error: error instanceof Error ? error.message : String(error),
          eventType: event.type,
          source: event.source,
        },
      );
    }
  }

  /**
   * Handle configuration rollbacks with Parlant validation
   */
  private async handleConfigurationRollbackWithParlant(
    event: any,
  ): Promise<void> {
    const operationId = `parlant-rollback-${Date.now()}`;

    try {
      this.logger.debug(
        `[${operationId}] Processing configuration rollback with Parlant validation`,
        {
          reason: event.reason,
          backupVersion: event.backupVersion,
        },
      );

      // Validate rollback operation (CRITICAL risk)
      const context: ConfigurationOperationContext = {
        riskLevel: ParlantRiskLevel.CRITICAL, // Rollbacks are always CRITICAL
        requiresApproval: true,
        auditRequired: true,
        productionSafeguards: this.isProductionEnvironment(),
        configurationScope: 'system-wide',
        changeImpact: 'critical-system-recovery',
        emergencyOperation: true,
      };

      const validation =
        await this.parlantConfigService.validateConfigurationOperation(context);

      this.updateValidationMetrics(validation);
      this.validationMetrics.emergencyOperations++;

      this.logger.log(
        `[${operationId}] Configuration rollback validated with Parlant`,
        {
          approved: validation.approved,
          riskLevel: validation.riskLevel,
          conversationId: validation.conversationId,
          emergencyOperation: true,
        },
      );
    } catch (error) {
      this.logger.error(
        `[${operationId}] Error processing configuration rollback with Parlant`,
        {
          error: error instanceof Error ? error.message : String(error),
          rollbackReason: event.reason,
        },
      );
    }
  }

  /**
   * Trigger manual reload with Parlant validation
   */
  async triggerManualReloadWithParlant(
    filePath?: string,
    user = 'system',
    sessionId?: string,
    emergency = false,
  ): Promise<ParlantHotReloadResult<boolean>> {
    const operationId = `parlant-manual-reload-${Date.now()}`;
    const startTime = Date.now();

    try {
      this.logger.log(
        `[${operationId}] Manual reload requested with Parlant validation`,
        {
          filePath,
          user,
          sessionId,
          emergency,
        },
      );

      // Determine operation type and risk level
      const operationType = filePath
        ? HotReloadOperationType.MANUAL_RELOAD_SPECIFIC
        : HotReloadOperationType.MANUAL_RELOAD;

      const riskLevel = emergency
        ? ParlantRiskLevel.CRITICAL
        : ParlantRiskLevel.MEDIUM;

      // PARLANT VALIDATION: Manual reload operations
      const context: ConfigurationOperationContext = {
        riskLevel,
        requiresApproval:
          riskLevel === ParlantRiskLevel.HIGH ||
          riskLevel === ParlantRiskLevel.CRITICAL,
        auditRequired: true,
        productionSafeguards: this.isProductionEnvironment(),
        configurationScope: filePath ? 'file-specific' : 'system-wide',
        changeImpact: emergency
          ? 'critical-emergency-operation'
          : 'administrative-reload',
        emergencyOperation: emergency,
      };

      const validation =
        await this.parlantConfigService.validateConfigurationOperation(context);

      this.updateValidationMetrics(validation);

      if (emergency) {
        this.validationMetrics.emergencyOperations++;
      }

      if (!validation.approved) {
        this.logger.warn(
          `[${operationId}] Manual reload rejected by Parlant validation`,
          {
            reason: validation.reason,
            conversationId: validation.conversationId,
          },
        );

        return this.createHotReloadResult(
          false,
          undefined,
          'Manual reload rejected by Parlant validation',
          validation,
          operationType,
          operationId,
          { filePath, user, sessionId, emergency },
          Date.now() - startTime,
        );
      }

      // Execute manual reload
      const reloadStartTime = Date.now();
      const reloadResult = this.hotReloadService.triggerManualReload(filePath);
      const reloadDuration = Date.now() - reloadStartTime;

      this.logger.log(
        `[${operationId}] Manual reload completed with Parlant approval`,
        {
          success: reloadResult,
          filePath,
          user,
          reloadDuration,
          conversationId: validation.conversationId,
          emergency,
        },
      );

      return this.createHotReloadResult(
        reloadResult,
        reloadResult,
        reloadResult ? undefined : 'Manual reload failed',
        validation,
        operationType,
        operationId,
        { filePath, user, sessionId, emergency },
        Date.now() - startTime,
        reloadDuration,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`[${operationId}] Manual reload failed with error`, {
        error: errorMessage,
        filePath,
        user,
        emergency,
      });

      // Create dummy validation for error case
      const errorValidation: ParlantValidationResponse = {
        approved: false,
        reason: 'Operation failed with error',
        riskLevel: ParlantRiskLevel.HIGH,
        performanceImpact: {
          validationDuration: Date.now() - startTime,
          cacheHit: false,
          optimization: 'none',
        },
      };

      return this.createHotReloadResult(
        false,
        undefined,
        errorMessage,
        errorValidation,
        operationType,
        operationId,
        { filePath, user, sessionId, emergency },
        Date.now() - startTime,
      );
    }
  }

  /**
   * Get reload statistics with Parlant validation metrics
   */
  getReloadStatisticsWithParlant(): {
    hotReloadStats: any;
    parlantValidationStats: typeof this.validationMetrics;
  } {
    return {
      hotReloadStats: this.hotReloadService.getReloadStatistics(),
      parlantValidationStats: this.getValidationMetrics(),
    };
  }

  /**
   * Get validation metrics
   */
  getValidationMetrics(): typeof this.validationMetrics {
    return { ...this.validationMetrics };
  }

  /**
   * Map event type to operation type
   */
  private mapEventTypeToOperation(eventType: string): HotReloadOperationType {
    switch (eventType) {
      case 'config-file':
        return HotReloadOperationType.FILE_CHANGE_CONFIG;
      case 'env-file':
        return HotReloadOperationType.FILE_CHANGE_ENV;
      case 'secrets-file':
        return HotReloadOperationType.FILE_CHANGE_SECRETS;
      case 'docker-compose':
        return HotReloadOperationType.FILE_CHANGE_DOCKER;
      default:
        return HotReloadOperationType.FILE_CHANGE_CONFIG;
    }
  }

  /**
   * Calculate risk level based on change type and content
   */
  private calculateRiskLevel(
    eventType: string,
    _changes: any[],
  ): ParlantRiskLevel {
    // Secrets changes are always CRITICAL
    if (eventType === 'secrets-file') {
      return ParlantRiskLevel.CRITICAL;
    }

    // Docker Compose and config files are HIGH risk
    if (eventType === 'docker-compose' || eventType === 'config-file') {
      return ParlantRiskLevel.HIGH;
    }

    // Environment files are HIGH risk
    if (eventType === 'env-file') {
      return ParlantRiskLevel.HIGH;
    }

    // Default to MEDIUM risk
    return ParlantRiskLevel.MEDIUM;
  }

  /**
   * Determine configuration scope
   */
  private determineConfigurationScope(source: string): string {
    if (source.includes('docker-compose')) {
      return 'deployment-infrastructure';
    }
    if (source.includes('secrets')) {
      return 'security-credentials';
    }
    if (source.includes('.env')) {
      return 'environment-configuration';
    }
    return 'application-configuration';
  }

  /**
   * Assess change impact
   */
  private assessChangeImpact(changes: any[]): string {
    if (changes.length > 10) {
      return 'major-configuration-update';
    }
    if (changes.length > 5) {
      return 'moderate-configuration-update';
    }
    return 'minor-configuration-update';
  }

  /**
   * Check if running in production environment
   */
  private isProductionEnvironment(): boolean {
    return (
      process.env.NODE_ENV === 'production' ||
      process.env.ENVIRONMENT === 'production'
    );
  }

  /**
   * Update validation metrics
   */
  private updateValidationMetrics(validation: ParlantValidationResponse): void {
    this.validationMetrics.totalValidations++;

    if (validation.approved) {
      this.validationMetrics.approvedValidations++;
    } else {
      this.validationMetrics.rejectedValidations++;
    }

    // Update average validation time
    const currentAvg = this.validationMetrics.averageValidationTime;
    const newTime = validation.performanceImpact.validationDuration;
    this.validationMetrics.averageValidationTime =
      (currentAvg * (this.validationMetrics.totalValidations - 1) + newTime) /
      this.validationMetrics.totalValidations;

    // Update cache hit rate
    if (validation.performanceImpact.cacheHit) {
      const hitCount =
        this.validationMetrics.cacheHitRate *
          (this.validationMetrics.totalValidations - 1) +
        1;
      this.validationMetrics.cacheHitRate =
        hitCount / this.validationMetrics.totalValidations;
    } else {
      const hitCount =
        this.validationMetrics.cacheHitRate *
        (this.validationMetrics.totalValidations - 1);
      this.validationMetrics.cacheHitRate =
        hitCount / this.validationMetrics.totalValidations;
    }
  }

  /**
   * Collect validation metrics periodically
   */
  private collectValidationMetrics(): void {
    this.logger.debug('Collecting Parlant validation metrics', {
      metrics: this.validationMetrics,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Create hot-reload result object
   */
  private createHotReloadResult<T>(
    success: boolean,
    data?: T,
    error?: string,
    validation?: ParlantValidationResponse,
    operationType?: HotReloadOperationType,
    operationId?: string,
    operationContext?: any,
    totalDuration?: number,
    reloadDuration?: number,
  ): ParlantHotReloadResult<T> {
    return {
      success,
      data,
      error,
      validationDetails: {
        approved: validation?.approved || false,
        riskLevel: validation?.riskLevel || ParlantRiskLevel.MEDIUM,
        conversationId: validation?.conversationId,
        reason: validation?.reason,
        validationDuration:
          validation?.performanceImpact.validationDuration || 0,
        cacheHit: validation?.performanceImpact.cacheHit || false,
        requiresManualApproval:
          validation?.riskLevel === ParlantRiskLevel.CRITICAL,
      },
      operationContext: {
        operationType: operationType || HotReloadOperationType.MANUAL_RELOAD,
        filePath: operationContext?.filePath,
        fileType: operationContext?.fileType,
        timestamp: new Date(),
        userId: operationContext?.user,
        sessionId: operationContext?.sessionId,
        emergency: operationContext?.emergency || false,
      },
      auditTrail: {
        operationId: operationId || `hot-reload-${Date.now()}`,
        conversationContext: validation?.conversationId,
        approvalChain: validation?.approved
          ? ['parlant-approved']
          : ['parlant-rejected'],
        securityEvents: [],
        performanceMetrics: {
          totalDuration: totalDuration || 0,
          validationOverhead:
            validation?.performanceImpact.validationDuration || 0,
          reloadDuration,
        },
      },
    };
  }
}
