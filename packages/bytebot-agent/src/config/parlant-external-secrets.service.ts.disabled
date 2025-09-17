/**
 * Parlant-Enhanced External Secrets Service - PARLANT INTEGRATED
 *
 * Provides conversational validation for ALL external secrets management operations
 * with MAXIMUM Parlant integration for multi-provider secret operations. Wraps the
 * existing ExternalSecretsService with risk-based conversational approval workflows
 * to ensure secure external secrets management with enterprise-grade validation.
 *
 * Features:
 * - Conversational validation for ALL external secret operations
 * - Risk-based approval system (CRITICAL for external integrations)
 * - Real-time external provider health validation with Parlant approval
 * - Multi-provider secret access with enhanced security controls
 * - Production safeguards with dual approval workflows for external access
 * - Comprehensive audit trails for all external secret operations
 * - Performance impact monitoring for validation overhead
 *
 * PARLANT INTEGRATION:
 * - External secret access: CRITICAL risk (external system access)
 * - Provider health checks: HIGH risk (system monitoring operations)
 * - Secret listing: HIGH risk (enumeration of sensitive data)
 * - Provider initialization: CRITICAL risk (establishing external connections)
 * - Service statistics: MEDIUM risk (operational data access)
 * - Emergency external operations: CRITICAL risk (incident response)
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
import { ExternalSecretsService } from './external-secrets.service';
import {
  ParlantConfigurationService,
  ConfigurationOperationContext,
  ParlantRiskLevel,
  ParlantValidationResponse,
} from './parlant-configuration.service';

/**
 * External secret provider types
 */
type SecretProvider =
  | 'vault'
  | 'aws-secrets-manager'
  | 'azure-key-vault'
  | 'google-secret-manager'
  | 'kubernetes';

/**
 * Parlant-enhanced external secret operation types
 */
export enum ExternalSecretOperationType {
  GET_SECRET = 'get_secret',
  LIST_SECRETS = 'list_secrets',
  PROVIDER_HEALTH_CHECK = 'provider_health_check',
  SERVICE_STATISTICS = 'service_statistics',
  PROVIDER_INITIALIZATION = 'provider_initialization',
  EMERGENCY_SECRET_ACCESS = 'emergency_secret_access',
  MULTI_PROVIDER_OPERATION = 'multi_provider_operation',
  EXTERNAL_INTEGRATION_VALIDATION = 'external_integration_validation',
}

/**
 * External secret metadata with Parlant context
 */
export interface ParlantExternalSecretMetadata {
  name: string;
  version: string;
  provider: SecretProvider;
  lastModified: Date;
  nextRotation?: Date;
  tags?: Record<string, string>;
  parlantContext: {
    accessApproved: boolean;
    riskLevel: ParlantRiskLevel;
    conversationId?: string;
    requiresRevalidation: boolean;
    externalProvider: boolean;
  };
}

/**
 * External secret value with Parlant validation
 */
export interface ParlantExternalSecretValue {
  value: string;
  metadata: ParlantExternalSecretMetadata;
  binary?: boolean;
  parlantValidation: {
    accessApproved: boolean;
    validationDuration: number;
    conversationId?: string;
    riskAssessment: ParlantRiskLevel;
    externalProviderTrusted: boolean;
  };
}

/**
 * External secrets operation result with Parlant validation
 */
export interface ParlantExternalSecretsOperationResult<T = any> {
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
    operationType: ExternalSecretOperationType;
    provider?: SecretProvider;
    secretName?: string;
    emergencyOperation?: boolean;
    timestamp: Date;
    userId?: string;
    sessionId?: string;
  };
  auditTrail: {
    operationId: string;
    conversationContext?: string;
    approvalChain: string[];
    securityEvents: string[];
    externalProviderEvents: string[];
    performanceMetrics: {
      totalDuration: number;
      validationOverhead: number;
      externalProviderDuration?: number;
      providerCount?: number;
    };
  };
}

/**
 * Provider health status with Parlant validation
 */
export interface ParlantProviderHealthStatus {
  providersHealth: Record<SecretProvider, boolean>;
  overallHealthy: boolean;
  parlantValidation: {
    healthCheckApproved: boolean;
    validationDuration: number;
    conversationId?: string;
    riskAssessment: ParlantRiskLevel;
    requiresFollowUp: boolean;
  };
}

/**
 * Parlant-Enhanced External Secrets Service
 * Adds conversational validation to all external secrets management operations
 */
@Injectable()
export class ParlantExternalSecretsService
  extends EventEmitter
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger('ParlantExternalSecretsService');
  private isInitialized = false;
  private externalSecretsMetrics = {
    totalExternalOperations: 0,
    approvedOperations: 0,
    rejectedOperations: 0,
    externalProviderFailures: 0,
    emergencyOperations: 0,
    averageValidationTime: 0,
    cacheHitRate: 0,
    providersMonitored: 0,
  };

  constructor(
    private readonly externalSecretsService: ExternalSecretsService,
    private readonly parlantConfigService: ParlantConfigurationService,
  ) {
    super();
    this.logger.log('Parlant-Enhanced External Secrets Service initialized');
    this.logger.log(
      'PARLANT INTEGRATION: Conversational validation active for ALL external secrets operations',
    );
  }

  /**
   * Initialize Parlant external secrets service
   */
  onModuleInit(): void {
    try {
      this.logger.log(
        'Initializing Parlant-Enhanced External Secrets Service...',
      );

      // Set up event listeners for external secrets service events
      this.setupExternalSecretsEventListeners();

      // Initialize Parlant external secrets monitoring
      this.initializeParlantExternalSecretsMonitoring();

      this.isInitialized = true;
      this.logger.log(
        'Parlant-Enhanced External Secrets Service initialized successfully',
      );
    } catch (error) {
      this.logger.error(
        'Parlant-Enhanced External Secrets Service initialization failed',
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
    this.logger.log('Destroying Parlant-Enhanced External Secrets Service...');

    try {
      // Remove event listeners
      this.removeAllListeners();

      this.isInitialized = false;
      this.logger.log(
        'Parlant-Enhanced External Secrets Service destroyed successfully',
        {
          finalMetrics: this.getExternalSecretsMetrics(),
        },
      );
    } catch (error) {
      this.logger.error(
        'Error during Parlant-Enhanced External Secrets Service destruction',
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  /**
   * Get external secret with Parlant validation
   */
  async getSecretWithParlant(
    name: string,
    version?: string,
    user = 'system',
    sessionId?: string,
    emergency = false,
  ): Promise<
    ParlantExternalSecretsOperationResult<ParlantExternalSecretValue | null>
  > {
    const operationId = `parlant-get-external-secret-${Date.now()}`;
    const startTime = Date.now();

    try {
      this.logger.log(
        `[${operationId}] External secret access requested with Parlant validation`,
        {
          name,
          version,
          user,
          sessionId,
          emergency,
        },
      );

      // Determine risk level based on context
      const riskLevel = emergency
        ? ParlantRiskLevel.CRITICAL
        : ParlantRiskLevel.CRITICAL; // External access is always CRITICAL

      // PARLANT VALIDATION: External secret access (CRITICAL risk)
      const context: ConfigurationOperationContext = {
        riskLevel,
        requiresApproval: true, // ALL external secret access requires approval
        auditRequired: true,
        productionSafeguards: this.isProductionEnvironment(),
        configurationScope: 'external-secrets-access',
        changeImpact: emergency
          ? 'critical-emergency-external-access'
          : 'external-provider-secret-access',
        emergencyOperation: emergency,
      };

      const validation =
        await this.parlantConfigService.validateConfigurationOperation(context);

      this.updateExternalSecretsMetrics(validation);

      if (emergency) {
        this.externalSecretsMetrics.emergencyOperations++;
      }

      if (!validation.approved) {
        this.logger.warn(
          `[${operationId}] External secret access rejected by Parlant validation`,
          {
            reason: validation.reason,
            conversationId: validation.conversationId,
            secretName: name,
          },
        );

        return this.createExternalSecretsOperationResult(
          false,
          null,
          'External secret access rejected by Parlant validation',
          validation,
          ExternalSecretOperationType.GET_SECRET,
          operationId,
          { name, version, user, sessionId, emergency },
          Date.now() - startTime,
        );
      }

      // Execute external secret access
      const secretAccessStartTime = Date.now();
      const externalSecret = await this.externalSecretsService.getSecret(
        name,
        version,
      );
      const secretAccessDuration = Date.now() - secretAccessStartTime;

      // Enhance secret with Parlant context if found
      const parlantSecret: ParlantExternalSecretValue | null = externalSecret
        ? {
            value: externalSecret.value,
            binary: externalSecret.binary,
            metadata: {
              ...externalSecret.metadata,
              parlantContext: {
                accessApproved: validation.approved,
                riskLevel: validation.riskLevel,
                conversationId: validation.conversationId,
                requiresRevalidation: true, // External secrets always require revalidation
                externalProvider: true,
              },
            },
            parlantValidation: {
              accessApproved: validation.approved,
              validationDuration:
                validation.performanceImpact.validationDuration,
              conversationId: validation.conversationId,
              riskAssessment: validation.riskLevel,
              externalProviderTrusted: true, // Assume configured providers are trusted
            },
          }
        : null;

      this.logger.log(
        `[${operationId}] External secret access completed with Parlant approval`,
        {
          secretFound: !!externalSecret,
          provider: externalSecret?.metadata.provider,
          secretAccessDuration,
          conversationId: validation.conversationId,
          emergency,
        },
      );

      return this.createExternalSecretsOperationResult(
        true,
        parlantSecret,
        undefined,
        validation,
        ExternalSecretOperationType.GET_SECRET,
        operationId,
        { name, version, user, sessionId, emergency },
        Date.now() - startTime,
        secretAccessDuration,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `[${operationId}] External secret access failed with error`,
        {
          error: errorMessage,
          secretName: name,
          user,
          emergency,
        },
      );

      this.externalSecretsMetrics.externalProviderFailures++;

      // Create dummy validation for error case
      const errorValidation: ParlantValidationResponse = {
        approved: false,
        reason: 'External secret access operation failed with error',
        riskLevel: ParlantRiskLevel.CRITICAL,
        performanceImpact: {
          validationDuration: Date.now() - startTime,
          cacheHit: false,
          optimization: 'none',
        },
      };

      return this.createExternalSecretsOperationResult(
        false,
        null,
        errorMessage,
        errorValidation,
        ExternalSecretOperationType.GET_SECRET,
        operationId,
        { name, version, user, sessionId, emergency },
        Date.now() - startTime,
      );
    }
  }

  /**
   * List external secrets with Parlant validation
   */
  async listSecretsWithParlant(
    user = 'system',
    sessionId?: string,
    emergency = false,
  ): Promise<
    ParlantExternalSecretsOperationResult<ParlantExternalSecretMetadata[]>
  > {
    const operationId = `parlant-list-external-secrets-${Date.now()}`;
    const startTime = Date.now();

    try {
      this.logger.log(
        `[${operationId}] External secrets listing requested with Parlant validation`,
        {
          user,
          sessionId,
          emergency,
        },
      );

      // Determine risk level based on context
      const riskLevel = emergency
        ? ParlantRiskLevel.CRITICAL
        : ParlantRiskLevel.HIGH; // Listing is HIGH risk

      // PARLANT VALIDATION: External secrets listing (HIGH/CRITICAL risk)
      const context: ConfigurationOperationContext = {
        riskLevel,
        requiresApproval: true, // Listing external secrets requires approval
        auditRequired: true,
        productionSafeguards: this.isProductionEnvironment(),
        configurationScope: 'external-secrets-enumeration',
        changeImpact: emergency
          ? 'critical-emergency-secrets-enumeration'
          : 'external-provider-secrets-listing',
        emergencyOperation: emergency,
      };

      const validation =
        await this.parlantConfigService.validateConfigurationOperation(context);

      this.updateExternalSecretsMetrics(validation);

      if (emergency) {
        this.externalSecretsMetrics.emergencyOperations++;
      }

      if (!validation.approved) {
        this.logger.warn(
          `[${operationId}] External secrets listing rejected by Parlant validation`,
          {
            reason: validation.reason,
            conversationId: validation.conversationId,
          },
        );

        return this.createExternalSecretsOperationResult(
          false,
          [],
          'External secrets listing rejected by Parlant validation',
          validation,
          ExternalSecretOperationType.LIST_SECRETS,
          operationId,
          { user, sessionId, emergency },
          Date.now() - startTime,
        );
      }

      // Execute external secrets listing
      const listingStartTime = Date.now();
      const externalSecrets = await this.externalSecretsService.listSecrets();
      const listingDuration = Date.now() - listingStartTime;

      // Enhance secrets metadata with Parlant context
      const parlantSecrets: ParlantExternalSecretMetadata[] =
        externalSecrets.map((secret) => ({
          ...secret,
          parlantContext: {
            accessApproved: validation.approved,
            riskLevel: validation.riskLevel,
            conversationId: validation.conversationId,
            requiresRevalidation: true,
            externalProvider: true,
          },
        }));

      this.logger.log(
        `[${operationId}] External secrets listing completed with Parlant approval`,
        {
          secretsFound: externalSecrets.length,
          providers: [...new Set(externalSecrets.map((s) => s.provider))],
          listingDuration,
          conversationId: validation.conversationId,
          emergency,
        },
      );

      return this.createExternalSecretsOperationResult(
        true,
        parlantSecrets,
        undefined,
        validation,
        ExternalSecretOperationType.LIST_SECRETS,
        operationId,
        { user, sessionId, emergency },
        Date.now() - startTime,
        listingDuration,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `[${operationId}] External secrets listing failed with error`,
        {
          error: errorMessage,
          user,
          emergency,
        },
      );

      this.externalSecretsMetrics.externalProviderFailures++;

      // Create dummy validation for error case
      const errorValidation: ParlantValidationResponse = {
        approved: false,
        reason: 'External secrets listing operation failed with error',
        riskLevel: ParlantRiskLevel.HIGH,
        performanceImpact: {
          validationDuration: Date.now() - startTime,
          cacheHit: false,
          optimization: 'none',
        },
      };

      return this.createExternalSecretsOperationResult(
        false,
        [],
        errorMessage,
        errorValidation,
        ExternalSecretOperationType.LIST_SECRETS,
        operationId,
        { user, sessionId, emergency },
        Date.now() - startTime,
      );
    }
  }

  /**
   * Get providers health with Parlant validation
   */
  async getProvidersHealthWithParlant(
    user = 'system',
    sessionId?: string,
  ): Promise<
    ParlantExternalSecretsOperationResult<ParlantProviderHealthStatus>
  > {
    const operationId = `parlant-providers-health-${Date.now()}`;
    const startTime = Date.now();

    try {
      this.logger.debug(
        `[${operationId}] External providers health check requested with Parlant validation`,
        {
          user,
          sessionId,
        },
      );

      // PARLANT VALIDATION: Provider health checks (HIGH risk)
      const context: ConfigurationOperationContext = {
        riskLevel: ParlantRiskLevel.HIGH, // Health checks are HIGH risk
        requiresApproval: this.isProductionEnvironment(), // Requires approval in production
        auditRequired: true,
        productionSafeguards: this.isProductionEnvironment(),
        configurationScope: 'external-provider-health-monitoring',
        changeImpact: 'external-provider-health-check',
        emergencyOperation: false,
      };

      const validation =
        await this.parlantConfigService.validateConfigurationOperation(context);

      this.updateExternalSecretsMetrics(validation);

      if (!validation.approved) {
        this.logger.warn(
          `[${operationId}] External providers health check rejected by Parlant validation`,
          {
            reason: validation.reason,
            conversationId: validation.conversationId,
          },
        );

        return this.createExternalSecretsOperationResult(
          false,
          undefined,
          'External providers health check rejected by Parlant validation',
          validation,
          ExternalSecretOperationType.PROVIDER_HEALTH_CHECK,
          operationId,
          { user, sessionId },
          Date.now() - startTime,
        );
      }

      // Execute provider health checks
      const healthCheckStartTime = Date.now();
      const providersHealth =
        await this.externalSecretsService.getProvidersHealth();
      const healthCheckDuration = Date.now() - healthCheckStartTime;

      // Calculate overall health status
      const healthyProviders = Object.values(providersHealth).filter(
        (healthy) => healthy,
      ).length;
      const totalProviders = Object.keys(providersHealth).length;
      const overallHealthy =
        healthyProviders === totalProviders && totalProviders > 0;

      // Create enhanced health status with Parlant context
      const parlantHealthStatus: ParlantProviderHealthStatus = {
        providersHealth,
        overallHealthy,
        parlantValidation: {
          healthCheckApproved: validation.approved,
          validationDuration: validation.performanceImpact.validationDuration,
          conversationId: validation.conversationId,
          riskAssessment: validation.riskLevel,
          requiresFollowUp: !overallHealthy,
        },
      };

      this.externalSecretsMetrics.providersMonitored = totalProviders;

      this.logger.debug(
        `[${operationId}] External providers health check completed with Parlant approval`,
        {
          totalProviders,
          healthyProviders,
          overallHealthy,
          healthCheckDuration,
          conversationId: validation.conversationId,
        },
      );

      return this.createExternalSecretsOperationResult(
        true,
        parlantHealthStatus,
        undefined,
        validation,
        ExternalSecretOperationType.PROVIDER_HEALTH_CHECK,
        operationId,
        { user, sessionId },
        Date.now() - startTime,
        healthCheckDuration,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `[${operationId}] External providers health check failed with error`,
        {
          error: errorMessage,
          user,
        },
      );

      this.externalSecretsMetrics.externalProviderFailures++;

      // Create dummy validation for error case
      const errorValidation: ParlantValidationResponse = {
        approved: false,
        reason: 'External providers health check operation failed with error',
        riskLevel: ParlantRiskLevel.HIGH,
        performanceImpact: {
          validationDuration: Date.now() - startTime,
          cacheHit: false,
          optimization: 'none',
        },
      };

      return this.createExternalSecretsOperationResult(
        false,
        undefined,
        errorMessage,
        errorValidation,
        ExternalSecretOperationType.PROVIDER_HEALTH_CHECK,
        operationId,
        { user, sessionId },
        Date.now() - startTime,
      );
    }
  }

  /**
   * Get service statistics with Parlant validation
   */
  async getServiceStatisticsWithParlant(
    user = 'system',
    sessionId?: string,
  ): Promise<
    ParlantExternalSecretsOperationResult<{
      providersCount: number;
      hasPrimaryProvider: boolean;
      fallbackProvidersCount: number;
      isHealthy: boolean;
    }>
  > {
    const operationId = `parlant-service-statistics-${Date.now()}`;
    const startTime = Date.now();

    try {
      this.logger.debug(
        `[${operationId}] External secrets service statistics requested with Parlant validation`,
        {
          user,
          sessionId,
        },
      );

      // PARLANT VALIDATION: Service statistics (MEDIUM risk)
      const context: ConfigurationOperationContext = {
        riskLevel: ParlantRiskLevel.MEDIUM, // Statistics are MEDIUM risk
        requiresApproval: false, // Statistics don't require approval
        auditRequired: true,
        productionSafeguards: this.isProductionEnvironment(),
        configurationScope: 'external-secrets-service-monitoring',
        changeImpact: 'service-statistics-access',
        emergencyOperation: false,
      };

      const validation =
        await this.parlantConfigService.validateConfigurationOperation(context);

      this.updateExternalSecretsMetrics(validation);

      if (!validation.approved) {
        this.logger.warn(
          `[${operationId}] External secrets service statistics rejected by Parlant validation`,
          {
            reason: validation.reason,
            conversationId: validation.conversationId,
          },
        );

        return this.createExternalSecretsOperationResult(
          false,
          undefined,
          'External secrets service statistics rejected by Parlant validation',
          validation,
          ExternalSecretOperationType.SERVICE_STATISTICS,
          operationId,
          { user, sessionId },
          Date.now() - startTime,
        );
      }

      // Execute service statistics retrieval
      const statisticsStartTime = Date.now();
      const serviceStatistics =
        this.externalSecretsService.getServiceStatistics();
      const statisticsDuration = Date.now() - statisticsStartTime;

      this.logger.debug(
        `[${operationId}] External secrets service statistics completed with Parlant approval`,
        {
          providersCount: serviceStatistics.providersCount,
          hasPrimaryProvider: serviceStatistics.hasPrimaryProvider,
          statisticsDuration,
          conversationId: validation.conversationId,
        },
      );

      return this.createExternalSecretsOperationResult(
        true,
        serviceStatistics,
        undefined,
        validation,
        ExternalSecretOperationType.SERVICE_STATISTICS,
        operationId,
        { user, sessionId },
        Date.now() - startTime,
        statisticsDuration,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `[${operationId}] External secrets service statistics failed with error`,
        {
          error: errorMessage,
          user,
        },
      );

      // Create dummy validation for error case
      const errorValidation: ParlantValidationResponse = {
        approved: false,
        reason:
          'External secrets service statistics operation failed with error',
        riskLevel: ParlantRiskLevel.MEDIUM,
        performanceImpact: {
          validationDuration: Date.now() - startTime,
          cacheHit: false,
          optimization: 'none',
        },
      };

      return this.createExternalSecretsOperationResult(
        false,
        undefined,
        errorMessage,
        errorValidation,
        ExternalSecretOperationType.SERVICE_STATISTICS,
        operationId,
        { user, sessionId },
        Date.now() - startTime,
      );
    }
  }

  /**
   * Get external secrets metrics with Parlant validation data
   */
  getExternalSecretsMetrics(): typeof this.externalSecretsMetrics {
    return { ...this.externalSecretsMetrics };
  }

  /**
   * Setup event listeners for external secrets service events
   */
  private setupExternalSecretsEventListeners(): void {
    // Listen for provider health issues
    this.externalSecretsService.on(
      'providersUnhealthy',
      (unhealthyProviders: string[]) => {
        this.handleUnhealthyProvidersWithParlant(unhealthyProviders);
      },
    );

    this.logger.debug(
      'External secrets event listeners configured for Parlant validation',
    );
  }

  /**
   * Initialize Parlant external secrets monitoring
   */
  private initializeParlantExternalSecretsMonitoring(): void {
    // Set up periodic metrics collection
    setInterval(() => {
      this.collectExternalSecretsMetrics();
    }, 60000); // Collect metrics every minute

    this.logger.debug('Parlant external secrets monitoring initialized');
  }

  /**
   * Handle unhealthy providers with Parlant validation
   */
  private async handleUnhealthyProvidersWithParlant(
    unhealthyProviders: string[],
  ): Promise<void> {
    const operationId = `parlant-unhealthy-providers-${Date.now()}`;

    try {
      this.logger.warn(
        `[${operationId}] Unhealthy external providers detected, requiring Parlant validation`,
        {
          unhealthyProviders,
        },
      );

      // CRITICAL risk validation for unhealthy providers
      const context: ConfigurationOperationContext = {
        riskLevel: ParlantRiskLevel.CRITICAL, // Unhealthy providers are CRITICAL risk
        requiresApproval: true,
        auditRequired: true,
        productionSafeguards: this.isProductionEnvironment(),
        configurationScope: 'external-provider-health-incident',
        changeImpact: 'critical-external-provider-failure',
        emergencyOperation: true,
      };

      const validation =
        await this.parlantConfigService.validateConfigurationOperation(context);

      this.updateExternalSecretsMetrics(validation);
      this.externalSecretsMetrics.emergencyOperations++;
      this.externalSecretsMetrics.externalProviderFailures +=
        unhealthyProviders.length;

      this.emit('parlantUnhealthyExternalProviders', {
        unhealthyProviders,
        parlantValidation: validation,
        operationId,
      });

      this.logger.error(
        `[${operationId}] Unhealthy external providers processed with Parlant validation`,
        {
          approved: validation.approved,
          conversationId: validation.conversationId,
          unhealthyCount: unhealthyProviders.length,
        },
      );
    } catch (error) {
      this.logger.error(
        `[${operationId}] Error processing unhealthy external providers with Parlant`,
        {
          error: error instanceof Error ? error.message : String(error),
          unhealthyProvidersCount: unhealthyProviders.length,
        },
      );
    }
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
   * Update external secrets metrics
   */
  private updateExternalSecretsMetrics(
    validation: ParlantValidationResponse,
  ): void {
    this.externalSecretsMetrics.totalExternalOperations++;

    if (validation.approved) {
      this.externalSecretsMetrics.approvedOperations++;
    } else {
      this.externalSecretsMetrics.rejectedOperations++;
    }

    // Update average validation time
    const currentAvg = this.externalSecretsMetrics.averageValidationTime;
    const newTime = validation.performanceImpact.validationDuration;
    this.externalSecretsMetrics.averageValidationTime =
      (currentAvg * (this.externalSecretsMetrics.totalExternalOperations - 1) +
        newTime) /
      this.externalSecretsMetrics.totalExternalOperations;

    // Update cache hit rate
    if (validation.performanceImpact.cacheHit) {
      const hitCount =
        this.externalSecretsMetrics.cacheHitRate *
          (this.externalSecretsMetrics.totalExternalOperations - 1) +
        1;
      this.externalSecretsMetrics.cacheHitRate =
        hitCount / this.externalSecretsMetrics.totalExternalOperations;
    } else {
      const hitCount =
        this.externalSecretsMetrics.cacheHitRate *
        (this.externalSecretsMetrics.totalExternalOperations - 1);
      this.externalSecretsMetrics.cacheHitRate =
        hitCount / this.externalSecretsMetrics.totalExternalOperations;
    }
  }

  /**
   * Collect external secrets metrics periodically
   */
  private collectExternalSecretsMetrics(): void {
    this.logger.debug('Collecting Parlant external secrets metrics', {
      metrics: this.externalSecretsMetrics,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Create external secrets operation result object
   */
  private createExternalSecretsOperationResult<T>(
    success: boolean,
    data?: T,
    error?: string,
    validation?: ParlantValidationResponse,
    operationType?: ExternalSecretOperationType,
    operationId?: string,
    operationContext?: any,
    totalDuration?: number,
    externalOperationDuration?: number,
  ): ParlantExternalSecretsOperationResult<T> {
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
        operationType: operationType || ExternalSecretOperationType.GET_SECRET,
        provider: operationContext?.provider,
        secretName: operationContext?.name,
        emergencyOperation: operationContext?.emergency || false,
        timestamp: new Date(),
        userId: operationContext?.user,
        sessionId: operationContext?.sessionId,
      },
      auditTrail: {
        operationId: operationId || `external-secrets-operation-${Date.now()}`,
        conversationContext: validation?.conversationId,
        approvalChain: validation?.approved
          ? ['parlant-approved']
          : ['parlant-rejected'],
        securityEvents: [],
        externalProviderEvents: [],
        performanceMetrics: {
          totalDuration: totalDuration || 0,
          validationOverhead:
            validation?.performanceImpact.validationDuration || 0,
          externalProviderDuration: externalOperationDuration,
          providerCount: this.externalSecretsMetrics.providersMonitored,
        },
      },
    };
  }
}
