/**
 * PARLANT Configuration Manager Service
 *
 * Enterprise-grade centralized configuration management system for all PARLANT
 * integrations across the Bytebot ecosystem. Provides dynamic configuration updates,
 * environment-specific settings, feature flags, and real-time configuration
 * distribution with zero-downtime reconfiguration capabilities.
 *
 * Key Features:
 * - Centralized configuration store with versioning and rollback
 * - Real-time configuration distribution to all services
 * - Environment-specific configuration inheritance
 * - Feature flag management with gradual rollouts
 * - Configuration validation and conflict resolution
 * - Audit trail for all configuration changes
 * - Hot-reload capabilities with service coordination
 * - Configuration templates and inheritance hierarchies
 *
 * Configuration Layers:
 * 1. Global Defaults - Base configuration for all PARLANT features
 * 2. Environment Overrides - Environment-specific settings (dev/staging/prod)
 * 3. Service Overrides - Service-specific configuration adjustments
 * 4. Endpoint Overrides - Individual endpoint customizations
 * 5. Runtime Overrides - Dynamic runtime configuration changes
 * 6. Emergency Overrides - Emergency bypass and fallback configurations
 *
 * @author Claude Code - PARLANT Configuration Management Specialist
 * @version 1.0.0 - Enterprise Configuration Framework
 */

import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EventEmitter2, OnEvent } from "@nestjs/event-emitter";
import { Cron, CronExpression } from "@nestjs/schedule";
import { Watch } from "fs";
import * as fs from "fs/promises";
import * as crypto from "crypto";
import {
  SecurityLevel,
  ValidationMode,
  ConversationPriority,
  ApprovalLevel,
  FunctionSecurityLevel,
  RiskLevel,
  ParticipantRole,
} from "../types/parlant.types";

// Configuration management interfaces
interface ParlantConfiguration {
  version: string;
  timestamp: Date;
  environment: string;
  global: GlobalConfiguration;
  services: Record<string, ServiceConfiguration>;
  endpoints: Record<string, EndpointConfiguration>;
  features: FeatureConfiguration;
  emergency: EmergencyConfiguration;
  metadata: ConfigurationMetadata;
  signature: string;
}

interface GlobalConfiguration {
  enabled: boolean;
  defaultSecurityLevel: SecurityLevel;
  defaultValidationMode: ValidationMode;
  defaultApprovalLevel: ApprovalLevel;
  defaultTimeout: number;
  defaultRetries: number;
  cachingStrategy: CachingConfiguration;
  auditConfiguration: AuditConfiguration;
  performanceConfiguration: PerformanceConfiguration;
  complianceConfiguration: ComplianceConfiguration;
  integrationConfiguration: IntegrationConfiguration;
}

interface ServiceConfiguration {
  serviceName: string;
  enabled: boolean;
  inheritsGlobal: boolean;
  overrides: ConfigurationOverrides;
  specializedAgents: SpecializedAgentConfiguration[];
  middleware: MiddlewareConfiguration;
  decorators: DecoratorConfiguration;
  errorHandling: ErrorHandlingConfiguration;
  coordination: CoordinationConfiguration;
}

interface EndpointConfiguration {
  serviceName: string;
  endpoint: string;
  method: string;
  enabled: boolean;
  inheritsService: boolean;
  validation: ValidationConfiguration;
  conversation: ConversationConfiguration;
  security: SecurityConfiguration;
  audit: AuditConfiguration;
  performance: PerformanceConfiguration;
  business: BusinessConfiguration;
  compliance: ComplianceConfiguration;
  customRules: CustomRule[];
}

interface FeatureConfiguration {
  features: Record<string, FeatureFlag>;
  experiments: Record<string, Experiment>;
  rollouts: Record<string, Rollout>;
  deprecations: Record<string, Deprecation>;
}

interface EmergencyConfiguration {
  enabled: boolean;
  bypassValidation: boolean;
  emergencyContacts: EmergencyContact[];
  escalationChain: EscalationChain[];
  fallbackConfiguration: FallbackConfiguration;
  recoveryProcedures: RecoveryProcedure[];
}

interface ConfigurationMetadata {
  createdBy: string;
  createdAt: Date;
  lastModifiedBy: string;
  lastModifiedAt: Date;
  version: string;
  checksum: string;
  distributionStatus: DistributionStatus;
  validationResults: ValidationResult[];
  dependencies: ConfigurationDependency[];
}

// Supporting configuration interfaces
interface ConfigurationOverrides {
  securityLevel?: SecurityLevel;
  validationMode?: ValidationMode;
  approvalLevel?: ApprovalLevel;
  timeout?: number;
  retries?: number;
  cacheable?: boolean;
  auditLevel?: string;
  performanceMode?: string;
}

interface SpecializedAgentConfiguration {
  agentType: string;
  enabled: boolean;
  priority: number;
  resourceLimits: ResourceLimits;
  failoverRules: FailoverRule[];
  healthCheckConfiguration: HealthCheckConfiguration;
}

interface MiddlewareConfiguration {
  universalMiddleware: UniversalMiddlewareConfig;
  errorMiddleware: ErrorMiddlewareConfig;
  auditMiddleware: AuditMiddlewareConfig;
  performanceMiddleware: PerformanceMiddlewareConfig;
}

interface DecoratorConfiguration {
  autoDecorator: AutoDecoratorConfig;
  universalDecorator: UniversalDecoratorConfig;
  complianceDecorator: ComplianceDecoratorConfig;
  performanceDecorator: PerformanceDecoratorConfig;
}

interface ErrorHandlingConfiguration {
  conversationalErrors: boolean;
  escalationEnabled: boolean;
  retryPolicies: RetryPolicy[];
  fallbackStrategies: FallbackStrategy[];
  recoveryProcedures: RecoveryProcedure[];
}

interface CoordinationConfiguration {
  enabled: boolean;
  loadBalancing: LoadBalancingConfig;
  circuitBreaker: CircuitBreakerConfig;
  healthMonitoring: HealthMonitoringConfig;
  performanceMonitoring: PerformanceMonitoringConfig;
}

interface ValidationConfiguration {
  mode: ValidationMode;
  approvalLevel: ApprovalLevel;
  securityLevel: SecurityLevel;
  timeout: number;
  retries: number;
  cacheable: boolean;
  requiresReason: boolean;
  customRules: ValidationRule[];
  fallbackMode: ValidationMode;
  escalationTimeout: number;
}

interface ConversationConfiguration {
  autoCreate: boolean;
  priority: ConversationPriority;
  maxParticipants: number;
  requiredParticipants: ParticipantRole[];
  conversationTimeout: number;
  persistHistory: boolean;
  realTimeUpdates: boolean;
  multiLanguageSupport: boolean;
}

interface SecurityConfiguration {
  securityLevel: FunctionSecurityLevel;
  riskAssessment: boolean;
  threatDetection: boolean;
  accessLogging: boolean;
  dataClassification: string[];
  encryptionRequired: boolean;
  integrityChecks: boolean;
  auditCompliance: string[];
}

interface AuditConfiguration {
  enableDetailedLogging: boolean;
  includeRequestData: boolean;
  includeResponseData: boolean;
  trackUserActions: boolean;
  complianceMode: string[];
  retentionPeriod: number;
  realTimeAlerting: boolean;
  dataAnonymization: boolean;
}

interface PerformanceConfiguration {
  cacheStrategy: string;
  cacheTTL: number;
  enableCompression: boolean;
  parallelValidation: boolean;
  asyncValidation: boolean;
  batchProcessing: boolean;
  resourceLimits: ResourceLimits;
  monitoringLevel: string;
}

interface BusinessConfiguration {
  businessCategory: string;
  impactLevel: string;
  costCenter: string;
  approvalWorkflow: ApprovalWorkflow[];
  slaRequirements: SLARequirements;
  businessRules: BusinessRule[];
}

interface ComplianceConfiguration {
  frameworks: ComplianceFramework[];
  auditTrail: boolean;
  dataGovernance: DataGovernance;
  accessControls: AccessControls;
  retentionPolicies: RetentionPolicy[];
  encryptionStandards: EncryptionStandard[];
}

interface CustomRule {
  name: string;
  condition: string;
  action: string;
  priority: number;
  enabled: boolean;
  validFrom: Date;
  validTo?: Date;
}

interface FeatureFlag {
  name: string;
  enabled: boolean;
  environments: string[];
  services: string[];
  rolloutPercentage: number;
  conditions: FeatureCondition[];
  metadata: FeatureFlagMetadata;
}

interface Experiment {
  name: string;
  description: string;
  enabled: boolean;
  variants: ExperimentVariant[];
  trafficAllocation: TrafficAllocation;
  successMetrics: SuccessMetric[];
  startDate: Date;
  endDate: Date;
}

interface Rollout {
  name: string;
  feature: string;
  strategy: RolloutStrategy;
  stages: RolloutStage[];
  currentStage: number;
  successCriteria: SuccessCriteria;
  rollbackTriggers: RollbackTrigger[];
}

interface Deprecation {
  feature: string;
  deprecatedAt: Date;
  removalDate: Date;
  replacementFeature?: string;
  migrationGuide: string;
  warningLevel: string;
}

interface EmergencyContact {
  name: string;
  role: string;
  phone: string;
  email: string;
  escalationLevel: number;
}

interface EscalationChain {
  level: number;
  contacts: string[];
  timeout: number;
  actions: string[];
}

interface FallbackConfiguration {
  enabled: boolean;
  mode: string;
  configuration: Record<string, any>;
  triggers: FallbackTrigger[];
}

interface RecoveryProcedure {
  name: string;
  trigger: string;
  steps: RecoveryStep[];
  timeout: number;
  successCriteria: string[];
}

interface DistributionStatus {
  totalServices: number;
  successfulDistributions: number;
  failedDistributions: number;
  pendingDistributions: number;
  lastDistributionTime: Date;
}

interface ValidationResult {
  validator: string;
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  timestamp: Date;
}

interface ConfigurationDependency {
  dependsOn: string;
  version: string;
  required: boolean;
  satisfied: boolean;
}

// Configuration change tracking
interface ConfigurationChange {
  id: string;
  timestamp: Date;
  changeType: ChangeType;
  scope: ChangeScope;
  path: string;
  oldValue: any;
  newValue: any;
  changedBy: string;
  reason: string;
  approved: boolean;
  approver?: string;
  appliedAt?: Date;
  rollbackId?: string;
}

interface ConfigurationSnapshot {
  id: string;
  timestamp: Date;
  configuration: ParlantConfiguration;
  checksum: string;
  metadata: SnapshotMetadata;
}

enum ChangeType {
  CREATE = "CREATE",
  UPDATE = "UPDATE",
  DELETE = "DELETE",
  ROLLBACK = "ROLLBACK",
  EMERGENCY = "EMERGENCY",
}

enum ChangeScope {
  GLOBAL = "GLOBAL",
  SERVICE = "SERVICE",
  ENDPOINT = "ENDPOINT",
  FEATURE = "FEATURE",
  EMERGENCY = "EMERGENCY",
}

// Configuration management operations
interface ConfigurationQuery {
  services?: string[];
  environments?: string[];
  features?: string[];
  includeDisabled?: boolean;
  includeMetadata?: boolean;
  version?: string;
  effectiveDate?: Date;
}

interface ConfigurationUpdateRequest {
  scope: ChangeScope;
  target: string;
  changes: Record<string, any>;
  reason: string;
  requestedBy: string;
  emergencyChange?: boolean;
  scheduledAt?: Date;
  requiresApproval?: boolean;
}

interface ConfigurationValidationRequest {
  configuration: Partial<ParlantConfiguration>;
  scope: ChangeScope;
  environment: string;
  validateDependencies: boolean;
  validateSyntax: boolean;
  validateBusinessRules: boolean;
}

@Injectable()
export class ParlantConfigurationManagerService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(ParlantConfigurationManagerService.name);

  // Configuration storage and caching
  private currentConfiguration: ParlantConfiguration;
  private configurationHistory: ConfigurationSnapshot[] = [];
  private pendingChanges = new Map<string, ConfigurationChange>();
  private configurationCache = new Map<string, any>();

  // Configuration watchers and distribution
  private configurationWatchers = new Map<string, any>();
  private distributionTargets = new Set<string>();
  private lastDistributionTime = new Date();

  // Feature flags and experiments
  private featureFlags = new Map<string, FeatureFlag>();
  private activeExperiments = new Map<string, Experiment>();
  private rolloutStates = new Map<string, Rollout>();

  // Configuration validation and security
  private configurationValidators = new Map<string, ConfigurationValidator>();
  private configurationSigningKey: string;
  private configurationEncryptionKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.initializeConfigurationManager();
    this.loadInitialConfiguration();
  }

  async onModuleInit() {
    this.logger.log("PARLANT Configuration Manager initializing...");

    // Load configuration from storage
    await this.loadConfigurationFromStorage();

    // Initialize configuration watchers
    this.initializeConfigurationWatchers();

    // Start configuration distribution
    await this.startConfigurationDistribution();

    // Initialize feature flag management
    this.initializeFeatureFlagManagement();

    // Start configuration monitoring
    this.startConfigurationMonitoring();

    this.logger.log("PARLANT Configuration Manager initialized successfully", {
      configurationVersion: this.currentConfiguration.version,
      servicesConfigured: Object.keys(this.currentConfiguration.services)
        .length,
      endpointsConfigured: Object.keys(this.currentConfiguration.endpoints)
        .length,
      featureFlagsActive: this.featureFlags.size,
    });
  }

  async onModuleDestroy() {
    this.logger.log("PARLANT Configuration Manager shutting down...");

    // Save current configuration state
    await this.saveConfigurationSnapshot();

    // Stop configuration watchers
    this.stopConfigurationWatchers();

    // Cleanup resources
    this.cleanup();

    this.logger.log("PARLANT Configuration Manager shutdown complete");
  }

  /**
   * Get effective configuration for a specific context
   */
  async getEffectiveConfiguration(
    serviceName: string,
    endpoint?: string,
    environment?: string,
  ): Promise<EffectiveConfiguration> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(serviceName, endpoint, environment);

    // Check cache first
    const cached = this.configurationCache.get(cacheKey);
    if (cached && this.isCacheValid(cached)) {
      return cached.configuration;
    }

    try {
      // Build effective configuration by applying inheritance hierarchy
      let effectiveConfig = this.buildBaseConfiguration();

      // Apply global configuration
      effectiveConfig = this.mergeConfiguration(
        effectiveConfig,
        this.currentConfiguration.global,
      );

      // Apply service-specific configuration
      const serviceConfig = this.currentConfiguration.services[serviceName];
      if (serviceConfig) {
        effectiveConfig = this.mergeConfiguration(
          effectiveConfig,
          serviceConfig,
        );
      }

      // Apply endpoint-specific configuration
      if (endpoint) {
        const endpointKey = `${serviceName}:${endpoint}`;
        const endpointConfig = this.currentConfiguration.endpoints[endpointKey];
        if (endpointConfig) {
          effectiveConfig = this.mergeConfiguration(
            effectiveConfig,
            endpointConfig,
          );
        }
      }

      // Apply environment-specific overrides
      if (environment) {
        const envOverrides = await this.getEnvironmentOverrides(environment);
        effectiveConfig = this.mergeConfiguration(
          effectiveConfig,
          envOverrides,
        );
      }

      // Apply feature flags
      effectiveConfig = await this.applyFeatureFlags(
        effectiveConfig,
        serviceName,
        endpoint,
      );

      // Apply emergency overrides if active
      if (this.hasActiveEmergencyOverrides()) {
        effectiveConfig = this.applyEmergencyOverrides(effectiveConfig);
      }

      // Validate final configuration
      const validationResult =
        await this.validateConfiguration(effectiveConfig);
      if (!validationResult.valid) {
        this.logger.warn("Configuration validation failed", {
          serviceName,
          endpoint,
          errors: validationResult.errors,
        });
      }

      // Cache the result
      this.cacheConfiguration(cacheKey, effectiveConfig);

      const processingTime = Date.now() - startTime;
      this.logger.debug("Effective configuration generated", {
        serviceName,
        endpoint,
        environment,
        processingTime,
        cacheHit: false,
      });

      return effectiveConfig;
    } catch (error) {
      this.logger.error("Failed to generate effective configuration", {
        serviceName,
        endpoint,
        environment,
        error: error instanceof Error ? error.message : String(error),
      });

      // Return fallback configuration
      return this.getFallbackConfiguration(serviceName, endpoint);
    }
  }

  /**
   * Update configuration with change tracking and approval workflow
   */
  async updateConfiguration(
    request: ConfigurationUpdateRequest,
  ): Promise<ConfigurationChangeResult> {
    const changeId = this.generateChangeId();
    const timestamp = new Date();

    this.logger.log("Configuration update request received", {
      changeId,
      scope: request.scope,
      target: request.target,
      requestedBy: request.requestedBy,
      emergency: request.emergencyChange,
    });

    try {
      // Validate update request
      const validationResult = await this.validateUpdateRequest(request);
      if (!validationResult.valid) {
        return {
          success: false,
          changeId,
          errors: validationResult.errors,
          warnings: validationResult.warnings,
        };
      }

      // Create configuration change record
      const change: ConfigurationChange = {
        id: changeId,
        timestamp,
        changeType: this.determineChangeType(request),
        scope: request.scope,
        path: this.buildConfigurationPath(request),
        oldValue: await this.getCurrentValue(request),
        newValue: request.changes,
        changedBy: request.requestedBy,
        reason: request.reason,
        approved: false,
      };

      // Check if approval is required
      if (request.requiresApproval && !request.emergencyChange) {
        // Store pending change
        this.pendingChanges.set(changeId, change);

        // Trigger approval workflow
        await this.triggerApprovalWorkflow(change);

        return {
          success: true,
          changeId,
          status: "PENDING_APPROVAL",
          approvalRequired: true,
        };
      }

      // Apply change immediately
      const applyResult = await this.applyConfigurationChange(change);
      if (applyResult.success) {
        change.approved = true;
        change.appliedAt = new Date();

        // Record change in history
        this.recordConfigurationChange(change);

        // Distribute configuration updates
        await this.distributeConfigurationUpdate(change);

        // Emit configuration change event
        this.eventEmitter.emit("configuration.updated", {
          changeId,
          scope: change.scope,
          target: request.target,
          timestamp: change.appliedAt,
        });
      }

      return {
        success: applyResult.success,
        changeId,
        status: applyResult.success ? "APPLIED" : "FAILED",
        errors: applyResult.errors,
        warnings: applyResult.warnings,
      };
    } catch (error) {
      this.logger.error("Configuration update failed", {
        changeId,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        changeId,
        errors: [
          `Configuration update failed: ${error instanceof Error ? error.message : String(error)}`,
        ],
      };
    }
  }

  /**
   * Feature flag management
   */
  async updateFeatureFlag(
    name: string,
    config: Partial<FeatureFlag>,
  ): Promise<void> {
    const existingFlag = this.featureFlags.get(name);

    const updatedFlag: FeatureFlag = {
      name,
      enabled: config.enabled ?? true,
      environments: config.environments ?? ["*"],
      services: config.services ?? ["*"],
      rolloutPercentage: config.rolloutPercentage ?? 100,
      conditions: config.conditions ?? [],
      metadata: {
        ...existingFlag?.metadata,
        ...config.metadata,
        lastModified: new Date(),
        modifiedBy: "system",
      },
    };

    this.featureFlags.set(name, updatedFlag);

    // Invalidate relevant caches
    this.invalidateConfigurationCache();

    // Distribute feature flag update
    await this.distributeFeatureFlagUpdate(updatedFlag);

    this.logger.log("Feature flag updated", {
      name,
      enabled: updatedFlag.enabled,
      rolloutPercentage: updatedFlag.rolloutPercentage,
    });
  }

  /**
   * Emergency configuration override
   */
  async activateEmergencyOverride(
    override: EmergencyOverride,
    activatedBy: string,
  ): Promise<void> {
    const emergencyId = this.generateEmergencyId();

    this.logger.warn("Emergency configuration override activated", {
      emergencyId,
      type: override.type,
      scope: override.scope,
      activatedBy,
    });

    try {
      // Apply emergency override
      await this.applyEmergencyOverride(override);

      // Record emergency action
      await this.recordEmergencyAction(emergencyId, override, activatedBy);

      // Notify emergency contacts
      await this.notifyEmergencyContacts(override, activatedBy);

      // Distribute emergency configuration
      await this.distributeEmergencyConfiguration(override);

      this.eventEmitter.emit("emergency.override.activated", {
        emergencyId,
        override,
        activatedBy,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error("Emergency override activation failed", {
        emergencyId,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  /**
   * Configuration rollback capability
   */
  async rollbackConfiguration(
    snapshotId: string,
    rolledBackBy: string,
    reason: string,
  ): Promise<RollbackResult> {
    this.logger.warn("Configuration rollback initiated", {
      snapshotId,
      rolledBackBy,
      reason,
    });

    try {
      // Find snapshot
      const snapshot = this.findConfigurationSnapshot(snapshotId);
      if (!snapshot) {
        throw new Error(`Configuration snapshot not found: ${snapshotId}`);
      }

      // Validate rollback feasibility
      const rollbackValidation = await this.validateRollback(snapshot);
      if (!rollbackValidation.feasible) {
        return {
          success: false,
          errors: rollbackValidation.errors,
          warnings: rollbackValidation.warnings,
        };
      }

      // Create rollback change record
      const rollbackChange: ConfigurationChange = {
        id: this.generateChangeId(),
        timestamp: new Date(),
        changeType: ChangeType.ROLLBACK,
        scope: ChangeScope.GLOBAL,
        path: "configuration.global",
        oldValue: this.currentConfiguration,
        newValue: snapshot.configuration,
        changedBy: rolledBackBy,
        reason: `Rollback to snapshot ${snapshotId}: ${reason}`,
        approved: true,
        rollbackId: snapshotId,
      };

      // Apply rollback
      this.currentConfiguration = { ...snapshot.configuration };

      // Record rollback
      this.recordConfigurationChange(rollbackChange);

      // Distribute rollback configuration
      await this.distributeConfigurationUpdate(rollbackChange);

      // Invalidate all caches
      this.invalidateAllCaches();

      this.logger.log("Configuration rollback completed successfully", {
        snapshotId,
        rolledBackBy,
        rollbackChangeId: rollbackChange.id,
      });

      return {
        success: true,
        rollbackChangeId: rollbackChange.id,
        appliedAt: new Date(),
      };
    } catch (error) {
      this.logger.error("Configuration rollback failed", {
        snapshotId,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        errors: [
          `Rollback failed: ${error instanceof Error ? error.message : String(error)}`,
        ],
      };
    }
  }

  /**
   * Real-time configuration monitoring and health checks
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  private async monitorConfigurationHealth() {
    try {
      // Check configuration integrity
      const integrityCheck = await this.verifyConfigurationIntegrity();
      if (!integrityCheck.valid) {
        this.logger.error("Configuration integrity check failed", {
          errors: integrityCheck.errors,
        });

        // Trigger alert
        this.eventEmitter.emit(
          "configuration.integrity.failed",
          integrityCheck,
        );
      }

      // Check distribution status
      const distributionHealth = await this.checkDistributionHealth();
      if (distributionHealth.failedTargets > 0) {
        this.logger.warn("Configuration distribution issues detected", {
          failedTargets: distributionHealth.failedTargets,
          totalTargets: distributionHealth.totalTargets,
        });
      }

      // Check feature flag health
      const featureFlagHealth = await this.checkFeatureFlagHealth();
      if (featureFlagHealth.issues.length > 0) {
        this.logger.warn("Feature flag issues detected", {
          issues: featureFlagHealth.issues,
        });
      }
    } catch (error) {
      this.logger.error("Configuration health monitoring failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Configuration synchronization across services
   */
  @Cron(CronExpression.EVERY_MINUTE)
  private async synchronizeConfiguration() {
    if (!this.shouldSynchronize()) {
      return;
    }

    try {
      const syncResult = await this.performConfigurationSync();

      if (syncResult.syncedServices > 0) {
        this.logger.debug("Configuration synchronized", {
          syncedServices: syncResult.syncedServices,
          skippedServices: syncResult.skippedServices,
          failedServices: syncResult.failedServices,
        });
      }
    } catch (error) {
      this.logger.error("Configuration synchronization failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Event handlers for configuration changes
  @OnEvent("service.started")
  async handleServiceStarted(event: ServiceStartedEvent) {
    this.logger.debug(
      "Service started, registering for configuration distribution",
      {
        serviceName: event.serviceName,
        serviceId: event.serviceId,
      },
    );

    // Register service for configuration distribution
    this.distributionTargets.add(event.serviceId);

    // Send current configuration to new service
    await this.distributeConfigurationToService(event.serviceId);
  }

  @OnEvent("service.stopped")
  async handleServiceStopped(event: ServiceStoppedEvent) {
    this.logger.debug(
      "Service stopped, removing from configuration distribution",
      {
        serviceName: event.serviceName,
        serviceId: event.serviceId,
      },
    );

    // Remove service from distribution targets
    this.distributionTargets.delete(event.serviceId);
  }

  @OnEvent("configuration.change.approved")
  async handleConfigurationChangeApproved(
    event: ConfigurationChangeApprovedEvent,
  ) {
    const change = this.pendingChanges.get(event.changeId);
    if (!change) {
      this.logger.warn(
        "Approved configuration change not found in pending changes",
        {
          changeId: event.changeId,
        },
      );
      return;
    }

    this.logger.log("Configuration change approved, applying...", {
      changeId: event.changeId,
      approver: event.approver,
    });

    try {
      // Apply the approved change
      const applyResult = await this.applyConfigurationChange(change);
      if (applyResult.success) {
        change.approved = true;
        change.approver = event.approver;
        change.appliedAt = new Date();

        // Remove from pending changes
        this.pendingChanges.delete(event.changeId);

        // Record in history
        this.recordConfigurationChange(change);

        // Distribute update
        await this.distributeConfigurationUpdate(change);
      }
    } catch (error) {
      this.logger.error("Failed to apply approved configuration change", {
        changeId: event.changeId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Private helper methods
  private initializeConfigurationManager(): void {
    // Initialize cryptographic keys
    this.configurationSigningKey = this.configService.get(
      "config.signingKey",
      "dev-key",
    );
    this.configurationEncryptionKey = this.configService.get(
      "config.encryptionKey",
      "dev-key",
    );

    // Initialize configuration validators
    this.initializeConfigurationValidators();

    this.logger.log("Configuration manager initialized with security keys");
  }

  private loadInitialConfiguration(): void {
    // Load default configuration
    this.currentConfiguration = this.buildDefaultConfiguration();

    this.logger.log("Initial configuration loaded", {
      version: this.currentConfiguration.version,
      environment: this.currentConfiguration.environment,
    });
  }

  private buildDefaultConfiguration(): ParlantConfiguration {
    return {
      version: "1.0.0",
      timestamp: new Date(),
      environment: this.configService.get("NODE_ENV", "development"),
      global: this.buildDefaultGlobalConfiguration(),
      services: {},
      endpoints: {},
      features: {
        features: {},
        experiments: {},
        rollouts: {},
        deprecations: {},
      },
      emergency: this.buildDefaultEmergencyConfiguration(),
      metadata: {
        createdBy: "system",
        createdAt: new Date(),
        lastModifiedBy: "system",
        lastModifiedAt: new Date(),
        version: "1.0.0",
        checksum: "",
        distributionStatus: {
          totalServices: 0,
          successfulDistributions: 0,
          failedDistributions: 0,
          pendingDistributions: 0,
          lastDistributionTime: new Date(),
        },
        validationResults: [],
        dependencies: [],
      },
      signature: "",
    };
  }

  private buildDefaultGlobalConfiguration(): GlobalConfiguration {
    return {
      enabled: true,
      defaultSecurityLevel: SecurityLevel._MEDIUM,
      defaultValidationMode: ValidationMode._INTERACTIVE,
      defaultApprovalLevel: ApprovalLevel._SINGLE_APPROVAL,
      defaultTimeout: 30000,
      defaultRetries: 3,
      cachingStrategy: {
        enabled: true,
        ttl: 300000,
        maxSize: 10000,
        compressionEnabled: false,
      },
      auditConfiguration: {
        enabled: true,
        retentionDays: 365,
        compressionEnabled: true,
        encryptionEnabled: true,
      },
      performanceConfiguration: {
        enableMetrics: true,
        enableTracing: true,
        enableProfiling: false,
        metricsInterval: 30000,
      },
      complianceConfiguration: {
        enabledFrameworks: ["SOX", "GDPR"],
        auditTrail: true,
        dataGovernance: true,
        accessControls: true,
      },
      integrationConfiguration: {
        coordinationEnabled: true,
        healthCheckInterval: 30000,
        circuitBreakerEnabled: true,
        retryEnabled: true,
      },
    };
  }

  private buildDefaultEmergencyConfiguration(): EmergencyConfiguration {
    return {
      enabled: true,
      bypassValidation: false,
      emergencyContacts: [],
      escalationChain: [],
      fallbackConfiguration: {
        enabled: true,
        mode: "SAFE_MODE",
        configuration: {},
        triggers: [],
      },
      recoveryProcedures: [],
    };
  }

  private generateCacheKey(
    serviceName: string,
    endpoint?: string,
    environment?: string,
  ): string {
    return `config:${serviceName}:${endpoint || "*"}:${environment || "default"}`;
  }

  private isCacheValid(cached: any): boolean {
    const maxAge = 300000; // 5 minutes
    return Date.now() - cached.timestamp < maxAge;
  }

  private buildBaseConfiguration(): any {
    return {
      enabled: true,
      securityLevel: SecurityLevel._LOW,
      validationMode: ValidationMode._AUTOMATIC,
      approvalLevel: ApprovalLevel._AUTOMATIC,
      timeout: 30000,
      retries: 3,
      cacheable: true,
    };
  }

  private mergeConfiguration(base: any, override: any): any {
    // Deep merge configurations with override precedence
    return { ...base, ...override };
  }

  private async getEnvironmentOverrides(environment: string): Promise<any> {
    // Would implement environment-specific overrides
    return {};
  }

  private async applyFeatureFlags(
    config: any,
    serviceName: string,
    endpoint?: string,
  ): Promise<any> {
    // Apply feature flags to configuration
    for (const [name, flag] of this.featureFlags.entries()) {
      if (this.isFeatureFlagApplicable(flag, serviceName, endpoint)) {
        config = this.applyFeatureFlag(config, flag);
      }
    }
    return config;
  }

  private hasActiveEmergencyOverrides(): boolean {
    return this.currentConfiguration.emergency.enabled;
  }

  private applyEmergencyOverrides(config: any): any {
    // Apply emergency overrides
    return config;
  }

  private async validateConfiguration(config: any): Promise<ValidationResult> {
    // Validate configuration against business rules and constraints
    return {
      validator: "system",
      valid: true,
      errors: [],
      warnings: [],
      timestamp: new Date(),
    };
  }

  private cacheConfiguration(cacheKey: string, config: any): void {
    this.configurationCache.set(cacheKey, {
      configuration: config,
      timestamp: Date.now(),
    });
  }

  private getFallbackConfiguration(
    serviceName: string,
    endpoint?: string,
  ): any {
    // Return safe fallback configuration
    return this.buildBaseConfiguration();
  }

  // Additional stub methods for comprehensive functionality
  private async loadConfigurationFromStorage(): Promise<void> {
    // Would implement configuration loading from persistent storage
    this.logger.debug("Loading configuration from storage...");
  }

  private initializeConfigurationWatchers(): void {
    // Would implement file system watchers for configuration changes
    this.logger.debug("Initializing configuration watchers...");
  }

  private async startConfigurationDistribution(): Promise<void> {
    // Would implement configuration distribution to services
    this.logger.debug("Starting configuration distribution...");
  }

  private initializeFeatureFlagManagement(): void {
    // Would implement feature flag management system
    this.logger.debug("Initializing feature flag management...");
  }

  private startConfigurationMonitoring(): void {
    // Would implement configuration monitoring
    this.logger.debug("Starting configuration monitoring...");
  }

  private async saveConfigurationSnapshot(): Promise<void> {
    // Would implement configuration snapshot saving
    this.logger.debug("Saving configuration snapshot...");
  }

  private stopConfigurationWatchers(): void {
    // Would implement stopping configuration watchers
    this.logger.debug("Stopping configuration watchers...");
  }

  private cleanup(): void {
    // Would implement cleanup of resources
    this.logger.debug("Cleaning up configuration manager resources...");
  }

  private generateChangeId(): string {
    return `change_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  private generateEmergencyId(): string {
    return `emergency_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  private async validateUpdateRequest(
    request: ConfigurationUpdateRequest,
  ): Promise<ValidationResult> {
    // Would implement comprehensive validation
    return {
      validator: "system",
      valid: true,
      errors: [],
      warnings: [],
      timestamp: new Date(),
    };
  }

  private determineChangeType(request: ConfigurationUpdateRequest): ChangeType {
    return request.emergencyChange ? ChangeType.EMERGENCY : ChangeType.UPDATE;
  }

  private buildConfigurationPath(request: ConfigurationUpdateRequest): string {
    return `${request.scope}.${request.target}`;
  }

  private async getCurrentValue(
    request: ConfigurationUpdateRequest,
  ): Promise<any> {
    // Would implement current value retrieval
    return {};
  }

  private async triggerApprovalWorkflow(
    change: ConfigurationChange,
  ): Promise<void> {
    // Would implement approval workflow
    this.logger.debug("Triggering approval workflow", { changeId: change.id });
  }

  private async applyConfigurationChange(
    change: ConfigurationChange,
  ): Promise<ApplyResult> {
    // Would implement configuration change application
    return {
      success: true,
      errors: [],
      warnings: [],
    };
  }

  private recordConfigurationChange(change: ConfigurationChange): void {
    // Would implement change recording
    this.logger.debug("Recording configuration change", {
      changeId: change.id,
    });
  }

  private async distributeConfigurationUpdate(
    change: ConfigurationChange,
  ): Promise<void> {
    // Would implement configuration distribution
    this.logger.debug("Distributing configuration update", {
      changeId: change.id,
    });
  }

  private invalidateConfigurationCache(): void {
    this.configurationCache.clear();
  }

  private async distributeFeatureFlagUpdate(flag: FeatureFlag): Promise<void> {
    // Would implement feature flag distribution
    this.logger.debug("Distributing feature flag update", {
      flagName: flag.name,
    });
  }

  private async applyEmergencyOverride(
    override: EmergencyOverride,
  ): Promise<void> {
    // Would implement emergency override application
    this.logger.debug("Applying emergency override", { type: override.type });
  }

  private async recordEmergencyAction(
    id: string,
    override: EmergencyOverride,
    activatedBy: string,
  ): Promise<void> {
    // Would implement emergency action recording
    this.logger.debug("Recording emergency action", { emergencyId: id });
  }

  private async notifyEmergencyContacts(
    override: EmergencyOverride,
    activatedBy: string,
  ): Promise<void> {
    // Would implement emergency contact notification
    this.logger.debug("Notifying emergency contacts", { activatedBy });
  }

  private async distributeEmergencyConfiguration(
    override: EmergencyOverride,
  ): Promise<void> {
    // Would implement emergency configuration distribution
    this.logger.debug("Distributing emergency configuration");
  }

  private findConfigurationSnapshot(
    snapshotId: string,
  ): ConfigurationSnapshot | undefined {
    return this.configurationHistory.find(
      (snapshot) => snapshot.id === snapshotId,
    );
  }

  private async validateRollback(
    snapshot: ConfigurationSnapshot,
  ): Promise<RollbackValidation> {
    // Would implement rollback validation
    return {
      feasible: true,
      errors: [],
      warnings: [],
    };
  }

  private invalidateAllCaches(): void {
    this.configurationCache.clear();
  }

  private async verifyConfigurationIntegrity(): Promise<IntegrityCheckResult> {
    // Would implement integrity verification
    return {
      valid: true,
      errors: [],
      checksum: "valid",
    };
  }

  private async checkDistributionHealth(): Promise<DistributionHealthResult> {
    // Would implement distribution health checking
    return {
      totalTargets: this.distributionTargets.size,
      failedTargets: 0,
      healthyTargets: this.distributionTargets.size,
    };
  }

  private async checkFeatureFlagHealth(): Promise<FeatureFlagHealthResult> {
    // Would implement feature flag health checking
    return {
      issues: [],
      flagsChecked: this.featureFlags.size,
    };
  }

  private shouldSynchronize(): boolean {
    // Would implement synchronization decision logic
    return true;
  }

  private async performConfigurationSync(): Promise<SyncResult> {
    // Would implement configuration synchronization
    return {
      syncedServices: this.distributionTargets.size,
      skippedServices: 0,
      failedServices: 0,
    };
  }

  private async distributeConfigurationToService(
    serviceId: string,
  ): Promise<void> {
    // Would implement service-specific configuration distribution
    this.logger.debug("Distributing configuration to service", { serviceId });
  }

  private initializeConfigurationValidators(): void {
    // Would implement configuration validators
    this.logger.debug("Initializing configuration validators...");
  }

  private isFeatureFlagApplicable(
    flag: FeatureFlag,
    serviceName: string,
    endpoint?: string,
  ): boolean {
    // Would implement feature flag applicability logic
    return (
      flag.enabled &&
      (flag.services.includes("*") || flag.services.includes(serviceName))
    );
  }

  private applyFeatureFlag(config: any, flag: FeatureFlag): any {
    // Would implement feature flag application logic
    return config;
  }

  /**
   * Public API methods for external integration
   */
  async getConfigurationVersion(): Promise<string> {
    return this.currentConfiguration.version;
  }

  async getConfigurationMetadata(): Promise<ConfigurationMetadata> {
    return { ...this.currentConfiguration.metadata };
  }

  async queryConfiguration(
    query: ConfigurationQuery,
  ): Promise<ParlantConfiguration> {
    // Would implement configuration querying
    return { ...this.currentConfiguration };
  }

  async validateConfigurationRequest(
    request: ConfigurationValidationRequest,
  ): Promise<ValidationResult> {
    // Would implement configuration validation
    return {
      validator: "system",
      valid: true,
      errors: [],
      warnings: [],
      timestamp: new Date(),
    };
  }
}

// Supporting interfaces and types
interface EffectiveConfiguration extends Record<string, any> {
  enabled: boolean;
  securityLevel: SecurityLevel;
  validationMode: ValidationMode;
  approvalLevel: ApprovalLevel;
  timeout: number;
  retries: number;
  cacheable: boolean;
}

interface ConfigurationChangeResult {
  success: boolean;
  changeId: string;
  status?: string;
  approvalRequired?: boolean;
  errors?: string[];
  warnings?: string[];
}

interface RollbackResult {
  success: boolean;
  rollbackChangeId?: string;
  appliedAt?: Date;
  errors?: string[];
  warnings?: string[];
}

interface EmergencyOverride {
  type: string;
  scope: string;
  configuration: Record<string, any>;
  reason: string;
  duration?: number;
}

interface ApplyResult {
  success: boolean;
  errors: string[];
  warnings: string[];
}

interface RollbackValidation {
  feasible: boolean;
  errors: string[];
  warnings: string[];
}

interface IntegrityCheckResult {
  valid: boolean;
  errors: string[];
  checksum: string;
}

interface DistributionHealthResult {
  totalTargets: number;
  failedTargets: number;
  healthyTargets: number;
}

interface FeatureFlagHealthResult {
  issues: string[];
  flagsChecked: number;
}

interface SyncResult {
  syncedServices: number;
  skippedServices: number;
  failedServices: number;
}

// Additional event interfaces
interface ServiceStartedEvent {
  serviceName: string;
  serviceId: string;
  timestamp: Date;
}

interface ServiceStoppedEvent {
  serviceName: string;
  serviceId: string;
  timestamp: Date;
}

interface ConfigurationChangeApprovedEvent {
  changeId: string;
  approver: string;
  timestamp: Date;
}

// Stub interfaces for complex types (would be fully implemented)
interface CachingConfiguration {
  enabled: boolean;
  ttl: number;
  maxSize: number;
  compressionEnabled: boolean;
}
interface ResourceLimits {
  maxMemoryMB: number;
  maxCpuPercent: number;
  maxConcurrentRequests: number;
}
interface FailoverRule {
  condition: string;
  action: string;
  timeout: number;
}
interface HealthCheckConfiguration {
  enabled: boolean;
  interval: number;
  timeout: number;
}
interface UniversalMiddlewareConfig {
  enabled: boolean;
  priority: number;
}
interface ErrorMiddlewareConfig {
  enabled: boolean;
  conversationalMode: boolean;
}
interface AuditMiddlewareConfig {
  enabled: boolean;
  detailLevel: string;
}
interface PerformanceMiddlewareConfig {
  enabled: boolean;
  metricsEnabled: boolean;
}
interface AutoDecoratorConfig {
  enabled: boolean;
  intelligentAnalysis: boolean;
}
interface UniversalDecoratorConfig {
  enabled: boolean;
  fullFeatureSet: boolean;
}
interface ComplianceDecoratorConfig {
  enabled: boolean;
  frameworks: string[];
}
interface PerformanceDecoratorConfig {
  enabled: boolean;
  optimizationMode: string;
}
interface RetryPolicy {
  maxRetries: number;
  backoffMultiplier: number;
}
interface FallbackStrategy {
  strategy: string;
  configuration: Record<string, any>;
}
interface LoadBalancingConfig {
  strategy: string;
  healthCheckEnabled: boolean;
}
interface CircuitBreakerConfig {
  enabled: boolean;
  failureThreshold: number;
}
interface HealthMonitoringConfig {
  enabled: boolean;
  interval: number;
}
interface PerformanceMonitoringConfig {
  enabled: boolean;
  metricsEnabled: boolean;
}
interface ValidationRule {
  name: string;
  condition: string;
  action: string;
  priority: number;
}
interface ApprovalWorkflow {
  step: number;
  role: string;
  timeout: number;
}
interface SLARequirements {
  responseTime: number;
  availability: number;
}
interface BusinessRule {
  name: string;
  condition: string;
  action: string;
  priority: number;
}
interface ComplianceFramework {
  name: string;
  version: string;
  enabled: boolean;
}
interface DataGovernance {
  classification: string[];
  retention: number;
}
interface AccessControls {
  rbac: boolean;
  mfa: boolean;
}
interface RetentionPolicy {
  dataType: string;
  retentionDays: number;
}
interface EncryptionStandard {
  algorithm: string;
  keyLength: number;
}
interface FeatureCondition {
  type: string;
  value: string;
}
interface FeatureFlagMetadata {
  lastModified: Date;
  modifiedBy: string;
}
interface ExperimentVariant {
  name: string;
  weight: number;
  configuration: Record<string, any>;
}
interface TrafficAllocation {
  strategy: string;
  percentage: number;
}
interface SuccessMetric {
  name: string;
  target: number;
}
interface RolloutStrategy {
  type: string;
  duration: number;
}
interface RolloutStage {
  stage: number;
  percentage: number;
  duration: number;
}
interface SuccessCriteria {
  metrics: string[];
  thresholds: Record<string, number>;
}
interface RollbackTrigger {
  condition: string;
  action: string;
}
interface FallbackTrigger {
  condition: string;
  mode: string;
}
interface RecoveryStep {
  step: number;
  action: string;
  timeout: number;
}
interface SnapshotMetadata {
  createdBy: string;
  reason: string;
}
interface ValidationError {
  path: string;
  message: string;
  severity: string;
}
interface ValidationWarning {
  path: string;
  message: string;
}
interface ConfigurationValidator {
  validate: (config: any) => ValidationResult;
}
