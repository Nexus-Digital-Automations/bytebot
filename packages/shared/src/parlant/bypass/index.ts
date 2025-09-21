/**
 * PARLANT Phase 1 Emergency Bypass System - Main Export Index
 *
 * Complete emergency bypass system with enterprise-grade security,
 * multi-tier authorization, and comprehensive audit capabilities.
 *
 * @version 1.0.0
 * @author PARLANT Emergency Bypass System Agent
 * @compliance GDPR, SOX, HIPAA, SOC2
 */

// =============================================================================
// CORE TYPES AND INTERFACES
// =============================================================================

export * from './types/bypass-core.types';

// =============================================================================
// SERVICES
// =============================================================================

// Import services for internal use
import { EmergencyTokenManagerService } from './tokens/emergency-token-manager.service';
import { BypassAuthorizationEngineService } from './authorization/bypass-authorization-engine.service';
import { AutomaticBypassTriggersService } from './monitoring/automatic-bypass-triggers.service';
import { BypassAbuseDetectionService } from './prevention/bypass-abuse-detection.service';
import { BypassAuditForensicsService } from './audit/bypass-audit-forensics.service';
import { BypassMonitoringHealthService } from './monitoring/bypass-monitoring-health.service';
import { ParlantBypassIntegrationService } from './integration/parlant-bypass-integration.service';

// Import types for internal use
import type {
  BypassOperationType,
  EmergencyBypassToken,
  ViolationSeverity,
  WorkflowStatus,
} from './types/bypass-core.types';

// Import service-specific types
import type {
  HealthCheckResult,
} from './monitoring/bypass-monitoring-health.service';
import type {
  OperationExecutionResult,
  IntegrationStatus,
  BypassOperationRequest,
  UserOperationContext,
} from './integration/parlant-bypass-integration.service';
import type {
  ComplianceReport,
  ComplianceTag,
} from './audit/bypass-audit-forensics.service';

// Token Management
export { EmergencyTokenManagerService } from './tokens/emergency-token-manager.service';
export type {
  CreateEmergencyTokenRequest,
  TokenRequestContext,
  ValidateTokenRequest,
  TokenValidationContext,
  TokenValidationResult,
  TokenStatistics
} from './tokens/emergency-token-manager.service';

// Authorization Engine
export { BypassAuthorizationEngineService } from './authorization/bypass-authorization-engine.service';
export type {
  BypassAuthorizationRequest,
  AuthorizationContext,
  BypassAuthorizationDecision,
  AuthorizationCondition,
  ConditionType,
  AuthorizationDecisionMetadata,
  RiskFactor,
  AuthorizationPerformanceMetrics
} from './authorization/bypass-authorization-engine.service';

// Automatic Triggers
export { AutomaticBypassTriggersService } from './monitoring/automatic-bypass-triggers.service';
export type {
  SystemHealthMetrics,
  ServiceHealthInfo,
  BypassTriggerConfig,
  TriggerCondition,
  TriggerConditionType,
  ComparisonOperator,
  BypassTriggerEvent,
  EventSeverity,
  TriggerStatistics
} from './monitoring/automatic-bypass-triggers.service';

// Abuse Detection
export { BypassAbuseDetectionService } from './prevention/bypass-abuse-detection.service';
export type {
  AbusePattern,
  DetectionAlgorithm,
  DetectionParameters,
  UserBehaviorProfile,
  BehaviorBaseline,
  BehaviorMetrics,
  BehaviorFlag,
  TrustLevel,
  AbuseDetectionEvent,
  DetectionEvidence,
  PreventionAction,
  DetectionStatistics
} from './prevention/bypass-abuse-detection.service';

// Audit and Forensics
export { BypassAuditForensicsService } from './audit/bypass-audit-forensics.service';
export type {
  BypassAuditEntry,
  AuditEntryType,
  AuditActor,
  ActorType,
  AuditAction,
  ActionCategory,
  AuditResource,
  ResourceType,
  DataSensitivityLevel,
  AuditOutcome,
  SecurityImpactLevel,
  AuditDetails,
  SecurityClassification,
  ComplianceTag,
  ForensicInvestigation,
  InvestigationType,
  InvestigationStatus,
  ForensicEvidence,
  EvidenceType,
  InvestigationFinding,
  FindingType,
  AuditQueryCriteria,
  IntegrityVerificationResult,
  ComplianceReport
} from './audit/bypass-audit-forensics.service';

// Monitoring and Health
export { BypassMonitoringHealthService } from './monitoring/bypass-monitoring-health.service';
export type {
  HealthCheckConfig,
  HealthCheckResult,
  SystemMetrics,
  NetworkIOMetrics,
  BypassSystemMetrics,
  AlertConfig,
  AlertOperator,
  AlertSeverity,
  NotificationChannel,
  AlertEvent,
  OverallHealthStatus,
  ComponentHealth,
  PerformanceIndicator,
  IndicatorStatus,
  IndicatorTrend,
  MonitoringDashboard,
  RealTimeMetrics,
  HistoricalTrend,
  SecuritySummary,
  PerformanceSummary
} from './monitoring/bypass-monitoring-health.service';

// Integration Service
export { ParlantBypassIntegrationService } from './integration/parlant-bypass-integration.service';
export type {
  ParlantServiceContext,
  ParlantCapability,
  BypassOperationRequest,
  UserOperationContext,
  BusinessOperationContext,
  SecurityOperationContext,
  IntegrationConfiguration,
  BypassMode,
  FallbackStrategy,
  IntegrationFeature,
  ExecutionStrategy,
  RetryConfiguration,
  OperationExecutionResult,
  ExecutionPath,
  OperationError,
  ErrorSource,
  ExecutionPerformanceMetrics,
  BypassExecutionInfo,
  BypassReason,
  IntegrationStatus,
  IntegrationPerformanceMetrics
} from './integration/parlant-bypass-integration.service';

// =============================================================================
// BYPASS SYSTEM FACTORY
// =============================================================================

/**
 * PARLANT Emergency Bypass System Factory
 *
 * Creates and configures the complete bypass system with all components.
 */
export class ParlantBypassSystemFactory {
  /**
   * Create complete bypass system
   */
  static createBypassSystem(): ParlantBypassSystem {
    // Create individual services
    const tokenManager = new EmergencyTokenManagerService();
    const authorizationEngine = new BypassAuthorizationEngineService();
    const automaticTriggers = new AutomaticBypassTriggersService();
    const abuseDetection = new BypassAbuseDetectionService();
    const auditForensics = new BypassAuditForensicsService();
    const monitoringHealth = new BypassMonitoringHealthService();

    // Create integration service with all dependencies
    const integration = new ParlantBypassIntegrationService(
      tokenManager,
      authorizationEngine,
      automaticTriggers,
      abuseDetection,
      auditForensics,
      monitoringHealth
    );

    return new ParlantBypassSystem(
      tokenManager,
      authorizationEngine,
      automaticTriggers,
      abuseDetection,
      auditForensics,
      monitoringHealth,
      integration
    );
  }
}

/**
 * Complete PARLANT Emergency Bypass System
 *
 * Orchestrates all bypass system components and provides unified interface.
 */
export class ParlantBypassSystem {
  constructor(
    public readonly tokenManager: EmergencyTokenManagerService,
    public readonly authorizationEngine: BypassAuthorizationEngineService,
    public readonly automaticTriggers: AutomaticBypassTriggersService,
    public readonly abuseDetection: BypassAbuseDetectionService,
    public readonly auditForensics: BypassAuditForensicsService,
    public readonly monitoringHealth: BypassMonitoringHealthService,
    public readonly integration: ParlantBypassIntegrationService
  ) {
    this.setupEventHandlers();
  }

  /**
   * Initialize the complete bypass system
   */
  async initialize(): Promise<void> {
    // Register default health checks
    await this.monitoringHealth.registerHealthCheck({
      name: 'bypass_system_health',
      description: 'Overall bypass system health',
      intervalMs: 60000,
      timeoutMs: 5000,
      retries: 2,
      critical: true,
      checkFunction: async () => this.performSystemHealthCheck(),
      enabled: true
    });

    // Register PARLANT service monitoring
    this.automaticTriggers.on('bypass-triggered', async (event) => {
      await this.handleAutomaticBypass(event);
    });

    // Register abuse detection alerts
    this.abuseDetection.on('abuse-detected', async (event) => {
      await this.handleAbuseDetection(event);
    });

    // Register monitoring alerts
    this.monitoringHealth.on('alert-triggered', async (event) => {
      await this.handleSystemAlert(event);
    });

    console.log('PARLANT Emergency Bypass System initialized successfully');
  }

  /**
   * Get system status
   */
  async getSystemStatus(): Promise<BypassSystemStatus> {
    const [
      health,
      tokenStats,
      integrationStatus,
      detectionStats
    ] = await Promise.all([
      this.monitoringHealth.getOverallHealth(),
      this.tokenManager.getTokenStatistics(),
      this.integration.getIntegrationStatus(),
      this.abuseDetection.getDetectionStatistics()
    ]);

    return {
      systemHealth: health,
      tokenStatistics: tokenStats,
      integrationStatus,
      detectionStatistics: detectionStats,
      lastUpdate: new Date()
    };
  }

  /**
   * Execute emergency bypass operation
   */
  async executeEmergencyBypass(request: BypassOperationRequest): Promise<OperationExecutionResult> {
    return this.integration.executeOperation(request);
  }

  /**
   * Request emergency token
   */
  async requestEmergencyToken(
    operationType: BypassOperationType,
    functionName: string,
    userContext: UserOperationContext,
    reason: string
  ): Promise<EmergencyBypassToken> {
    return this.integration.requestEmergencyBypass(
      operationType,
      functionName,
      userContext,
      reason
    );
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(
    framework: ComplianceTag,
    startDate: Date,
    endDate: Date
  ): Promise<ComplianceReport> {
    return this.auditForensics.generateComplianceReport(
      framework,
      { startTime: startDate, endTime: endDate, timezone: 'UTC' }
    );
  }

  // =============================================================================
  // PRIVATE METHODS
  // =============================================================================

  /**
   * Setup event handlers between services
   */
  private setupEventHandlers(): void {
    // Forward integration events to audit system
    this.integration.on('operation-executed', async (event) => {
      if (event.result.bypassInfo) {
        // Already logged in integration service
      }
    });

    // Handle emergency bypass requests
    this.integration.on('emergency-bypass-requested', async (event) => {
      console.log(`Emergency bypass token created: ${event.token.tokenId}`);
    });

    // Handle mode changes
    this.integration.on('integration-mode-changed', async (event) => {
      console.log(`Integration mode changed to ${event.newMode}: ${event.reason}`);
    });
  }

  /**
   * Perform system health check
   */
  private async performSystemHealthCheck(): Promise<HealthCheckResult> {
    try {
      const [tokenHealth, authHealth, integrationHealth] = await Promise.all([
        this.checkTokenManagerHealth(),
        this.checkAuthorizationHealth(),
        this.checkIntegrationHealth()
      ]);

      const allHealthy = tokenHealth && authHealth && integrationHealth;

      return {
        healthy: allHealthy,
        responseTime: 0,
        details: allHealthy
          ? 'All bypass system components operational'
          : 'Some bypass system components experiencing issues',
        metrics: {
          tokenManager: tokenHealth ? 1 : 0,
          authorizationEngine: authHealth ? 1 : 0,
          integration: integrationHealth ? 1 : 0
        },
        timestamp: new Date()
      };

    } catch (error) {
      return {
        healthy: false,
        responseTime: 0,
        details: 'Bypass system health check failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  /**
   * Individual component health checks
   */
  private async checkTokenManagerHealth(): Promise<boolean> {
    try {
      const stats = await this.tokenManager.getTokenStatistics();
      return stats.total >= 0; // Basic validation
    } catch {
      return false;
    }
  }

  private async checkAuthorizationHealth(): Promise<boolean> {
    try {
      const workflows = await this.authorizationEngine.getActiveWorkflows();
      return Array.isArray(workflows); // Basic validation
    } catch {
      return false;
    }
  }

  private async checkIntegrationHealth(): Promise<boolean> {
    try {
      const status = await this.integration.getIntegrationStatus();
      return status.parlantService !== undefined; // Basic validation
    } catch {
      return false;
    }
  }

  /**
   * Event handlers
   */
  private async handleAutomaticBypass(event: any): Promise<void> {
    console.log(`Automatic bypass triggered: ${event.triggerName}`);
    // Additional handling logic here
  }

  private async handleAbuseDetection(event: any): Promise<void> {
    console.log(`Abuse detected: ${event.eventId} (Risk: ${event.riskScore})`);
    // Additional handling logic here
  }

  private async handleSystemAlert(event: any): Promise<void> {
    console.log(`System alert: ${event.alert.name} - ${event.message}`);
    // Additional handling logic here
  }
}

// =============================================================================
// SYSTEM STATUS INTERFACE
// =============================================================================

export interface BypassSystemStatus {
  systemHealth: any; // OverallHealthStatus
  tokenStatistics: any; // TokenStatistics
  integrationStatus: IntegrationStatus;
  detectionStatistics: any; // DetectionStatistics
  lastUpdate: Date;
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default ParlantBypassSystemFactory;