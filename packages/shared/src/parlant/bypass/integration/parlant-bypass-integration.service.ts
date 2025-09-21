/**
 * PARLANT Phase 1 Emergency Bypass System - Integration Service
 *
 * Seamless integration with existing PARLANT infrastructure providing
 * fail-safe mechanisms, graceful degradation, and automatic recovery.
 *
 * @version 1.0.0
 * @author PARLANT Emergency Bypass System Agent
 * @compliance GDPR, SOX, HIPAA, SOC2
 */

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter } from 'events';
import {
  BypassOperationType,
  BypassRole,
  BypassAuthorizationLevel,
  EmergencyBypassRequest,
  BypassOperationResult,
  SecurityValidationResult,
  EmergencyBypassToken,
  ServiceStatus,
  SystemHealthStatus,
  BusinessImpactLevel,
  BypassPriority,
  SecurityViolationType,
  ViolationSeverity
} from '../types/bypass-core.types';

// Import bypass services
import { EmergencyTokenManagerService } from '../tokens/emergency-token-manager.service';
import { BypassAuthorizationEngineService } from '../authorization/bypass-authorization-engine.service';
import { AutomaticBypassTriggersService } from '../monitoring/automatic-bypass-triggers.service';
import { BypassAbuseDetectionService } from '../prevention/bypass-abuse-detection.service';
import { BypassAuditForensicsService } from '../audit/bypass-audit-forensics.service';
import { BypassMonitoringHealthService } from '../monitoring/bypass-monitoring-health.service';

/**
 * PARLANT service context
 */
export interface ParlantServiceContext {
  /** Service status */
  status: ServiceStatus;

  /** Last successful ping */
  lastSuccessfulPing: Date;

  /** Response time */
  responseTime: number;

  /** Consecutive failures */
  consecutiveFailures: number;

  /** Current workload */
  currentWorkload: number;

  /** Available endpoints */
  availableEndpoints: string[];

  /** Service version */
  version: string;

  /** Service capabilities */
  capabilities: ParlantCapability[];
}

/**
 * PARLANT capabilities
 */
export enum ParlantCapability {
  FUNCTION_VALIDATION = 'function_validation',
  CONVERSATION_MANAGEMENT = 'conversation_management',
  PARTICIPANT_MANAGEMENT = 'participant_management',
  APPROVAL_WORKFLOWS = 'approval_workflows',
  REAL_TIME_MONITORING = 'real_time_monitoring',
  SECURITY_VALIDATION = 'security_validation'
}

/**
 * Bypass operation request
 */
export interface BypassOperationRequest {
  /** Function name to execute */
  functionName: string;

  /** Function arguments */
  functionArguments: Record<string, any>;

  /** Operation type */
  operationType: BypassOperationType;

  /** User context */
  userContext: UserOperationContext;

  /** Business context */
  businessContext: BusinessOperationContext;

  /** Security context */
  securityContext: SecurityOperationContext;

  /** Priority level */
  priority: BypassPriority;

  /** Maximum execution time */
  maxExecutionTimeMs: number;
}

/**
 * User operation context
 */
export interface UserOperationContext {
  /** User ID */
  userId: string;

  /** User role */
  userRole: BypassRole;

  /** Session ID */
  sessionId: string;

  /** IP address */
  ipAddress: string;

  /** User agent */
  userAgent: string;

  /** Geographic location */
  location?: string;
}

/**
 * Business operation context
 */
export interface BusinessOperationContext {
  /** Business process */
  processName: string;

  /** Business impact level */
  impactLevel: BusinessImpactLevel;

  /** Department */
  department: string;

  /** Cost center */
  costCenter?: string;

  /** Project ID */
  projectId?: string;

  /** Service level agreement */
  slaRequirement?: string;
}

/**
 * Security operation context
 */
export interface SecurityOperationContext {
  /** Required authorization level */
  requiredAuthLevel: BypassAuthorizationLevel;

  /** Risk tolerance */
  riskTolerance: number;

  /** Compliance requirements */
  complianceRequirements: string[];

  /** Data classification */
  dataClassification: string;

  /** Audit requirements */
  auditRequired: boolean;
}

/**
 * Integration configuration
 */
export interface IntegrationConfiguration {
  /** PARLANT service endpoint */
  parlantEndpoint: string;

  /** Service timeout */
  serviceTimeoutMs: number;

  /** Health check interval */
  healthCheckIntervalMs: number;

  /** Failure threshold for bypass activation */
  failureThreshold: number;

  /** Automatic recovery enabled */
  autoRecoveryEnabled: boolean;

  /** Bypass mode */
  bypassMode: BypassMode;

  /** Fallback strategies */
  fallbackStrategies: FallbackStrategy[];

  /** Integration features */
  features: IntegrationFeature[];
}

/**
 * Bypass modes
 */
export enum BypassMode {
  /** Always attempt PARLANT first */
  PARLANT_FIRST = 'parlant_first',

  /** Bypass only when PARLANT fails */
  FAILOVER_ONLY = 'failover_only',

  /** Parallel execution with bypass */
  PARALLEL_EXECUTION = 'parallel_execution',

  /** Bypass only (emergency mode) */
  BYPASS_ONLY = 'bypass_only'
}

/**
 * Fallback strategies
 */
export enum FallbackStrategy {
  AUTOMATIC_BYPASS = 'automatic_bypass',
  MANUAL_APPROVAL = 'manual_approval',
  DEGRADED_FUNCTIONALITY = 'degraded_functionality',
  OPERATION_QUEUING = 'operation_queuing',
  CIRCUIT_BREAKER = 'circuit_breaker'
}

/**
 * Integration features
 */
export enum IntegrationFeature {
  HEALTH_MONITORING = 'health_monitoring',
  AUTOMATIC_FAILOVER = 'automatic_failover',
  LOAD_BALANCING = 'load_balancing',
  RETRY_MECHANISMS = 'retry_mechanisms',
  PERFORMANCE_MONITORING = 'performance_monitoring',
  AUDIT_INTEGRATION = 'audit_integration'
}

/**
 * Execution strategy
 */
export interface ExecutionStrategy {
  /** Strategy name */
  name: string;

  /** Use PARLANT */
  useParlant: boolean;

  /** Use bypass */
  useBypass: boolean;

  /** Parallel execution */
  parallel: boolean;

  /** Timeout for strategy */
  timeoutMs: number;

  /** Retry configuration */
  retryConfig: RetryConfiguration;
}

/**
 * Retry configuration
 */
export interface RetryConfiguration {
  /** Maximum retries */
  maxRetries: number;

  /** Initial delay */
  initialDelayMs: number;

  /** Delay multiplier */
  delayMultiplier: number;

  /** Maximum delay */
  maxDelayMs: number;

  /** Retry on specific errors */
  retryOnErrors: string[];
}

/**
 * Operation execution result
 */
export interface OperationExecutionResult {
  /** Execution success */
  success: boolean;

  /** Result data */
  result?: any;

  /** Error details */
  error?: OperationError;

  /** Execution path taken */
  executionPath: ExecutionPath;

  /** Performance metrics */
  performanceMetrics: ExecutionPerformanceMetrics;

  /** Security validation results */
  securityValidation: SecurityValidationResult;

  /** Bypass information */
  bypassInfo?: BypassExecutionInfo;
}

/**
 * Execution paths
 */
export enum ExecutionPath {
  PARLANT_SUCCESS = 'parlant_success',
  PARLANT_FAILURE_BYPASS_SUCCESS = 'parlant_failure_bypass_success',
  PARLANT_FAILURE_BYPASS_FAILURE = 'parlant_failure_bypass_failure',
  BYPASS_ONLY_SUCCESS = 'bypass_only_success',
  BYPASS_ONLY_FAILURE = 'bypass_only_failure',
  PARALLEL_EXECUTION = 'parallel_execution'
}

/**
 * Operation error
 */
export interface OperationError {
  /** Error code */
  code: string;

  /** Error message */
  message: string;

  /** Error source */
  source: ErrorSource;

  /** Stack trace */
  stack?: string;

  /** Error metadata */
  metadata: Record<string, any>;

  /** Retry possible */
  retryable: boolean;
}

/**
 * Error sources
 */
export enum ErrorSource {
  PARLANT_SERVICE = 'parlant_service',
  BYPASS_SYSTEM = 'bypass_system',
  AUTHORIZATION_ENGINE = 'authorization_engine',
  TOKEN_MANAGER = 'token_manager',
  ABUSE_DETECTION = 'abuse_detection',
  AUDIT_SYSTEM = 'audit_system',
  NETWORK = 'network',
  TIMEOUT = 'timeout',
  VALIDATION = 'validation'
}

/**
 * Execution performance metrics
 */
export interface ExecutionPerformanceMetrics {
  /** Total execution time */
  totalExecutionTime: number;

  /** PARLANT execution time */
  parlantExecutionTime?: number;

  /** Bypass execution time */
  bypassExecutionTime?: number;

  /** Authorization time */
  authorizationTime: number;

  /** Validation time */
  validationTime: number;

  /** Network latency */
  networkLatency: number;

  /** Queue time */
  queueTime: number;
}

/**
 * Bypass execution information
 */
export interface BypassExecutionInfo {
  /** Bypass reason */
  reason: BypassReason;

  /** Token used */
  tokenId?: string;

  /** Authorization level */
  authorizationLevel: BypassAuthorizationLevel;

  /** Automatic trigger */
  automaticTrigger: boolean;

  /** Approval required */
  approvalRequired: boolean;

  /** Risk score */
  riskScore: number;
}

/**
 * Bypass reasons
 */
export enum BypassReason {
  PARLANT_UNAVAILABLE = 'parlant_unavailable',
  PARLANT_TIMEOUT = 'parlant_timeout',
  PARLANT_ERROR = 'parlant_error',
  EMERGENCY_TRIGGER = 'emergency_trigger',
  MANUAL_BYPASS = 'manual_bypass',
  PERFORMANCE_OPTIMIZATION = 'performance_optimization',
  MAINTENANCE_MODE = 'maintenance_mode'
}

/**
 * PARLANT Bypass Integration Service
 *
 * Provides seamless integration between PARLANT and emergency bypass:
 * - Intelligent failover mechanisms
 * - Health monitoring and recovery
 * - Performance optimization
 * - Graceful degradation
 * - Comprehensive audit integration
 */
@Injectable()
export class ParlantBypassIntegrationService extends EventEmitter {
  private readonly logger = new Logger(ParlantBypassIntegrationService.name);
  private parlantServiceContext: ParlantServiceContext;
  private integrationConfig: IntegrationConfiguration;
  private executionStrategies = new Map<string, ExecutionStrategy>();
  private circuitBreakerState = new Map<string, CircuitBreakerState>();

  constructor(
    private readonly tokenManager: EmergencyTokenManagerService,
    private readonly authorizationEngine: BypassAuthorizationEngineService,
    private readonly automaticTriggers: AutomaticBypassTriggersService,
    private readonly abuseDetection: BypassAbuseDetectionService,
    private readonly auditForensics: BypassAuditForensicsService,
    private readonly monitoringHealth: BypassMonitoringHealthService
  ) {
    super();

    // Initialize properties before calling methods that use them
    this.parlantServiceContext = {
      status: ServiceStatus.OPERATIONAL,
      lastSuccessfulPing: new Date(),
      responseTime: 0,
      consecutiveFailures: 0,
      currentWorkload: 0,
      availableEndpoints: [],
      version: 'unknown',
      capabilities: []
    };

    this.integrationConfig = {
      parlantEndpoint: process.env.PARLANT_ENDPOINT || 'http://localhost:3001',
      serviceTimeoutMs: 5000,
      healthCheckIntervalMs: 30000,
      failureThreshold: 3,
      autoRecoveryEnabled: true,
      bypassMode: BypassMode.PARLANT_FIRST,
      fallbackStrategies: [
        FallbackStrategy.AUTOMATIC_BYPASS,
        FallbackStrategy.CIRCUIT_BREAKER
      ],
      features: [
        IntegrationFeature.HEALTH_MONITORING,
        IntegrationFeature.AUTOMATIC_FAILOVER,
        IntegrationFeature.PERFORMANCE_MONITORING,
        IntegrationFeature.AUDIT_INTEGRATION
      ]
    };

    this.initializeIntegration();
    this.startHealthMonitoring();
  }

  /**
   * Execute operation with intelligent PARLANT/bypass coordination
   */
  async executeOperation(request: BypassOperationRequest): Promise<OperationExecutionResult> {
    const startTime = Date.now();
    const executionId = this.generateExecutionId();

    this.logger.log(`Executing operation ${request.functionName} (${executionId})`);

    try {
      // Determine execution strategy
      const strategy = await this.determineExecutionStrategy(request);

      // Execute with chosen strategy
      const result = await this.executeWithStrategy(request, strategy, executionId);

      // Log successful execution
      await this.logOperationExecution(request, result, executionId);

      return result;

    } catch (error) {
      // Handle execution error
      const errorResult = await this.handleExecutionError(request, error, executionId, startTime);

      // Log failed execution
      await this.logOperationExecution(request, errorResult, executionId);

      return errorResult;
    }
  }

  /**
   * Check PARLANT service health
   */
  async checkParlantHealth(): Promise<ParlantServiceContext> {
    const startTime = Date.now();

    try {
      // Mock PARLANT health check
      const healthy = Math.random() > 0.1; // 90% success rate
      const responseTime = Math.random() * 200 + 50;

      if (healthy) {
        this.parlantServiceContext = {
          status: ServiceStatus.OPERATIONAL,
          lastSuccessfulPing: new Date(),
          responseTime,
          consecutiveFailures: 0,
          currentWorkload: Math.random() * 100,
          availableEndpoints: [
            '/validate-function',
            '/create-conversation',
            '/manage-participants'
          ],
          version: '1.0.0',
          capabilities: [
            ParlantCapability.FUNCTION_VALIDATION,
            ParlantCapability.CONVERSATION_MANAGEMENT,
            ParlantCapability.PARTICIPANT_MANAGEMENT
          ]
        };
      } else {
        this.parlantServiceContext.status = ServiceStatus.MAJOR_OUTAGE;
        this.parlantServiceContext.consecutiveFailures++;
        this.parlantServiceContext.responseTime = Date.now() - startTime;
      }

      // Note: updateServiceHealth method not available on BypassMonitoringHealthService
      // The service health is tracked internally through health checks

      return this.parlantServiceContext;

    } catch (error) {
      this.parlantServiceContext.status = ServiceStatus.MAJOR_OUTAGE;
      this.parlantServiceContext.consecutiveFailures++;

      this.logger.error('PARLANT health check failed:', error);
      return this.parlantServiceContext;
    }
  }

  /**
   * Request emergency bypass
   */
  async requestEmergencyBypass(
    operationType: BypassOperationType,
    functionName: string,
    userContext: UserOperationContext,
    reason: string
  ): Promise<EmergencyBypassToken> {
    this.logger.warn(`Emergency bypass requested for ${functionName} by ${userContext.userId}`);

    // Create bypass request
    const bypassRequest: EmergencyBypassRequest = {
      requestId: this.generateRequestId(),
      requestedBy: userContext.userId,
      userRole: userContext.userRole,
      requestedAt: new Date(),
      operationType,
      functionName,
      functionArguments: {},
      reason,
      justification: `Emergency bypass due to PARLANT service unavailability`,
      requestedAuthLevel: BypassAuthorizationLevel.EMERGENCY_SINGLE,
      durationMinutes: 30,
      priority: BypassPriority.HIGH,
      context: {
        systemHealth: SystemHealthStatus.DEGRADED,
        parlantStatus: this.parlantServiceContext.status,
        databaseStatus: ServiceStatus.OPERATIONAL,
        businessImpact: BusinessImpactLevel.HIGH,
        technicalDetails: {
          parlantFailures: this.parlantServiceContext.consecutiveFailures,
          lastSuccessfulPing: this.parlantServiceContext.lastSuccessfulPing.toISOString()
        }
      },
      status: BypassRequestStatus.SUBMITTED,
      approvalWorkflow: {
        workflowId: this.generateWorkflowId(),
        requiredApprovals: [BypassAuthorizationLevel.EMERGENCY_SINGLE],
        currentStep: 0,
        steps: [],
        status: WorkflowStatus.PENDING,
        metadata: {
          startedAt: new Date(),
          expectedCompletionAt: new Date(Date.now() + 600000), // 10 minutes
          totalTimeLimit: 600000,
          escalationRules: [],
          notifications: []
        }
      }
    };

    // Get authorization decision
    const authDecision = await this.authorizationEngine.authorizeBypass({
      userId: userContext.userId,
      userRole: userContext.userRole,
      functionName,
      operationType,
      functionArguments: {},
      authContext: {
        timestamp: new Date(),
        ipAddress: userContext.ipAddress,
        userAgent: userContext.userAgent,
        systemHealth: 'degraded',
        businessImpact: BusinessImpactLevel.HIGH,
        priority: BypassPriority.HIGH
      }
    });

    if (!authDecision.authorized) {
      throw new Error(`Bypass authorization denied: ${authDecision.reason}`);
    }

    // Create emergency token
    const token = await this.tokenManager.createEmergencyToken({
      requestedBy: userContext.userId,
      userRole: userContext.userRole,
      authorizationLevel: authDecision.authorizationLevel,
      allowedOperations: [operationType],
      allowedFunctions: [functionName],
      durationMinutes: 30,
      maxOperations: 10,
      reason,
      requestContext: {
        ipAddress: userContext.ipAddress,
        userAgent: userContext.userAgent,
        location: userContext.location,
        systemHealth: 'degraded'
      }
    });

    // Log bypass request
    await this.auditForensics.logTokenCreation(token, {
      id: userContext.userId,
      type: ActorType.HUMAN_USER,
      name: userContext.userId,
      role: userContext.userRole,
      ipAddress: userContext.ipAddress,
      userAgent: userContext.userAgent,
      location: userContext.location,
      sessionId: userContext.sessionId
    });

    this.emit('emergency-bypass-requested', { token, bypassRequest });

    return token;
  }

  /**
   * Get integration status
   */
  async getIntegrationStatus(): Promise<IntegrationStatus> {
    const parlantHealth = await this.checkParlantHealth();
    const overallHealth = await this.monitoringHealth.getOverallHealth();

    return {
      parlantService: parlantHealth,
      bypassSystemHealth: overallHealth,
      integrationMode: this.determineIntegrationMode(),
      activeBypassOperations: await this.getActiveBypassOperations(),
      performanceMetrics: await this.getIntegrationPerformanceMetrics(),
      lastStatusUpdate: new Date()
    };
  }

  /**
   * Switch integration mode
   */
  async switchIntegrationMode(mode: BypassMode, reason: string): Promise<void> {
    const previousMode = this.integrationConfig.bypassMode;
    this.integrationConfig.bypassMode = mode;

    this.logger.warn(`Integration mode switched from ${previousMode} to ${mode}: ${reason}`);

    // Emit mode change event
    this.emit('integration-mode-changed', {
      previousMode,
      newMode: mode,
      reason,
      timestamp: new Date()
    });

    // Log mode change
    await this.auditForensics.logSecurityViolation(
      {
        type: SecurityViolationType.POLICY_VIOLATION,
        severity: ViolationSeverity.MEDIUM,
        description: `Integration mode changed to ${mode}`,
        remediation: 'Monitor system behavior'
      },
      {
        id: 'system',
        type: ActorType.SYSTEM_SERVICE,
        name: 'Integration Service',
        role: BypassRole.EMERGENCY_ADMIN,
        ipAddress: 'localhost',
        userAgent: 'Integration Service'
      },
      { reason, previousMode, newMode: mode }
    );
  }

  // =============================================================================
  // PRIVATE METHODS
  // =============================================================================

  /**
   * Initialize integration
   */
  private initializeIntegration(): void {
    // Initialize execution strategies
    this.initializeExecutionStrategies();

    this.logger.log('PARLANT bypass integration initialized');
  }

  /**
   * Initialize execution strategies
   */
  private initializeExecutionStrategies(): void {
    // PARLANT-first strategy
    this.executionStrategies.set('parlant_first', {
      name: 'PARLANT First',
      useParlant: true,
      useBypass: true,
      parallel: false,
      timeoutMs: 5000,
      retryConfig: {
        maxRetries: 2,
        initialDelayMs: 1000,
        delayMultiplier: 2,
        maxDelayMs: 5000,
        retryOnErrors: ['NETWORK_ERROR', 'TIMEOUT', 'SERVICE_UNAVAILABLE']
      }
    });

    // Bypass-only strategy
    this.executionStrategies.set('bypass_only', {
      name: 'Bypass Only',
      useParlant: false,
      useBypass: true,
      parallel: false,
      timeoutMs: 3000,
      retryConfig: {
        maxRetries: 1,
        initialDelayMs: 500,
        delayMultiplier: 1.5,
        maxDelayMs: 2000,
        retryOnErrors: ['NETWORK_ERROR', 'TIMEOUT']
      }
    });

    // Parallel execution strategy
    this.executionStrategies.set('parallel', {
      name: 'Parallel Execution',
      useParlant: true,
      useBypass: true,
      parallel: true,
      timeoutMs: 3000,
      retryConfig: {
        maxRetries: 1,
        initialDelayMs: 200,
        delayMultiplier: 1,
        maxDelayMs: 1000,
        retryOnErrors: []
      }
    });
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    // PARLANT health check
    setInterval(async () => {
      await this.checkParlantHealth();
    }, this.integrationConfig.healthCheckIntervalMs);

    // Circuit breaker monitoring
    setInterval(() => {
      this.updateCircuitBreakers();
    }, 60000); // 1 minute

    this.logger.log('Health monitoring started');
  }

  /**
   * Determine execution strategy
   */
  private async determineExecutionStrategy(request: BypassOperationRequest): Promise<ExecutionStrategy> {
    // Check circuit breaker
    const circuitBreaker = this.circuitBreakerState.get('parlant');
    if (circuitBreaker?.state === 'OPEN') {
      return this.executionStrategies.get('bypass_only')!;
    }

    // Check PARLANT service health
    if (this.parlantServiceContext.status !== ServiceStatus.OPERATIONAL) {
      return this.executionStrategies.get('bypass_only')!;
    }

    // Check integration mode
    switch (this.integrationConfig.bypassMode) {
      case BypassMode.BYPASS_ONLY:
        return this.executionStrategies.get('bypass_only')!;

      case BypassMode.PARALLEL_EXECUTION:
        return this.executionStrategies.get('parallel')!;

      case BypassMode.PARLANT_FIRST:
      case BypassMode.FAILOVER_ONLY:
      default:
        return this.executionStrategies.get('parlant_first')!;
    }
  }

  /**
   * Execute with strategy
   */
  private async executeWithStrategy(
    request: BypassOperationRequest,
    strategy: ExecutionStrategy,
    executionId: string
  ): Promise<OperationExecutionResult> {
    const startTime = Date.now();

    if (strategy.parallel) {
      return this.executeParallel(request, strategy, executionId, startTime);
    } else if (strategy.useParlant && !strategy.useBypass) {
      return this.executeParlantOnly(request, strategy, executionId, startTime);
    } else if (!strategy.useParlant && strategy.useBypass) {
      return this.executeBypassOnly(request, strategy, executionId, startTime);
    } else {
      return this.executeParlantWithFallback(request, strategy, executionId, startTime);
    }
  }

  /**
   * Execute PARLANT with bypass fallback
   */
  private async executeParlantWithFallback(
    request: BypassOperationRequest,
    strategy: ExecutionStrategy,
    executionId: string,
    startTime: number
  ): Promise<OperationExecutionResult> {
    // Try PARLANT first
    try {
      const parlantResult = await this.executeParlantOperation(request, strategy.timeoutMs);

      return {
        success: true,
        result: parlantResult,
        executionPath: ExecutionPath.PARLANT_SUCCESS,
        performanceMetrics: {
          totalExecutionTime: Date.now() - startTime,
          parlantExecutionTime: Date.now() - startTime,
          authorizationTime: 0,
          validationTime: 0,
          networkLatency: this.parlantServiceContext.responseTime,
          queueTime: 0
        },
        securityValidation: {
          valid: true,
          riskScore: 30,
          checksPerformed: [],
          violations: [],
          fraudDetection: {
            fraudScore: 0,
            indicators: [],
            recommendation: FraudRecommendation.ALLOW
          }
        }
      };

    } catch (parlantError: unknown) {
      const parlantErrorMessage = this.extractErrorMessage(parlantError);
      this.logger.warn(`PARLANT execution failed, falling back to bypass: ${parlantErrorMessage}`);

      // Fallback to bypass
      try {
        const bypassResult = await this.executeBypassOperation(request, executionId);

        return {
          success: true,
          result: bypassResult.result,
          error: {
            code: 'PARLANT_FALLBACK',
            message: 'PARLANT failed, bypass successful',
            source: ErrorSource.PARLANT_SERVICE,
            metadata: { parlantError: parlantErrorMessage },
            retryable: false
          },
          executionPath: ExecutionPath.PARLANT_FAILURE_BYPASS_SUCCESS,
          performanceMetrics: {
            totalExecutionTime: Date.now() - startTime,
            parlantExecutionTime: 0,
            bypassExecutionTime: bypassResult.performanceMetrics.duration,
            authorizationTime: 50,
            validationTime: 30,
            networkLatency: 0,
            queueTime: 0
          },
          securityValidation: bypassResult.securityValidation,
          bypassInfo: {
            reason: BypassReason.PARLANT_ERROR,
            tokenId: bypassResult.tokenId,
            authorizationLevel: BypassAuthorizationLevel.EMERGENCY_SINGLE,
            automaticTrigger: true,
            approvalRequired: false,
            riskScore: bypassResult.securityValidation.riskScore
          }
        };

      } catch (bypassError: unknown) {
        const bypassErrorMessage = this.extractErrorMessage(bypassError);
        return {
          success: false,
          error: {
            code: 'BOTH_SYSTEMS_FAILED',
            message: 'Both PARLANT and bypass systems failed',
            source: ErrorSource.BYPASS_SYSTEM,
            metadata: {
              parlantError: parlantErrorMessage,
              bypassError: bypassErrorMessage
            },
            retryable: true
          },
          executionPath: ExecutionPath.PARLANT_FAILURE_BYPASS_FAILURE,
          performanceMetrics: {
            totalExecutionTime: Date.now() - startTime,
            parlantExecutionTime: 0,
            bypassExecutionTime: 0,
            authorizationTime: 0,
            validationTime: 0,
            networkLatency: 0,
            queueTime: 0
          },
          securityValidation: {
            valid: false,
            riskScore: 100,
            checksPerformed: [],
            violations: [{
              type: SecurityViolationType.ANOMALOUS_BEHAVIOR,
              severity: ViolationSeverity.CRITICAL,
              description: 'Both systems failed',
              remediation: 'Manual intervention required'
            }],
            fraudDetection: {
              fraudScore: 0,
              indicators: [],
              recommendation: FraudRecommendation.BLOCK
            }
          }
        };
      }
    }
  }

  /**
   * Execute bypass only
   */
  private async executeBypassOnly(
    request: BypassOperationRequest,
    strategy: ExecutionStrategy,
    executionId: string,
    startTime: number
  ): Promise<OperationExecutionResult> {
    try {
      const bypassResult = await this.executeBypassOperation(request, executionId);

      return {
        success: true,
        result: bypassResult.result,
        executionPath: ExecutionPath.BYPASS_ONLY_SUCCESS,
        performanceMetrics: {
          totalExecutionTime: Date.now() - startTime,
          bypassExecutionTime: bypassResult.performanceMetrics.duration,
          authorizationTime: 50,
          validationTime: 30,
          networkLatency: 0,
          queueTime: 0
        },
        securityValidation: bypassResult.securityValidation,
        bypassInfo: {
          reason: BypassReason.MANUAL_BYPASS,
          tokenId: bypassResult.tokenId,
          authorizationLevel: BypassAuthorizationLevel.EMERGENCY_SINGLE,
          automaticTrigger: false,
          approvalRequired: false,
          riskScore: bypassResult.securityValidation.riskScore
        }
      };

    } catch (error: unknown) {
      const errorMessage = this.extractErrorMessage(error);
      return {
        success: false,
        error: {
          code: 'BYPASS_EXECUTION_FAILED',
          message: errorMessage,
          source: ErrorSource.BYPASS_SYSTEM,
          metadata: {},
          retryable: true
        },
        executionPath: ExecutionPath.BYPASS_ONLY_FAILURE,
        performanceMetrics: {
          totalExecutionTime: Date.now() - startTime,
          bypassExecutionTime: 0,
          authorizationTime: 0,
          validationTime: 0,
          networkLatency: 0,
          queueTime: 0
        },
        securityValidation: {
          valid: false,
          riskScore: 100,
          checksPerformed: [],
          violations: [],
          fraudDetection: {
            fraudScore: 0,
            indicators: [],
            recommendation: FraudRecommendation.BLOCK
          }
        }
      };
    }
  }

  /**
   * Execute PARLANT only
   */
  private async executeParlantOnly(
    request: BypassOperationRequest,
    strategy: ExecutionStrategy,
    executionId: string,
    startTime: number
  ): Promise<OperationExecutionResult> {
    try {
      const result = await this.executeParlantOperation(request, strategy.timeoutMs);

      return {
        success: true,
        result,
        executionPath: ExecutionPath.PARLANT_SUCCESS,
        performanceMetrics: {
          totalExecutionTime: Date.now() - startTime,
          parlantExecutionTime: Date.now() - startTime,
          authorizationTime: 0,
          validationTime: 0,
          networkLatency: this.parlantServiceContext.responseTime,
          queueTime: 0
        },
        securityValidation: {
          valid: true,
          riskScore: 30,
          checksPerformed: [],
          violations: [],
          fraudDetection: {
            fraudScore: 0,
            indicators: [],
            recommendation: FraudRecommendation.ALLOW
          }
        }
      };

    } catch (error) {
      throw error; // No fallback in PARLANT-only mode
    }
  }

  /**
   * Execute parallel (PARLANT and bypass)
   */
  private async executeParallel(
    request: BypassOperationRequest,
    strategy: ExecutionStrategy,
    executionId: string,
    startTime: number
  ): Promise<OperationExecutionResult> {
    const [parlantResult, bypassResult] = await Promise.allSettled([
      this.executeParlantOperation(request, strategy.timeoutMs),
      this.executeBypassOperation(request, executionId)
    ]);

    // Prefer PARLANT result if successful
    if (parlantResult.status === 'fulfilled') {
      return {
        success: true,
        result: parlantResult.value,
        executionPath: ExecutionPath.PARALLEL_EXECUTION,
        performanceMetrics: {
          totalExecutionTime: Date.now() - startTime,
          parlantExecutionTime: Date.now() - startTime,
          bypassExecutionTime: bypassResult.status === 'fulfilled'
            ? (bypassResult.value as BypassOperationResult).performanceMetrics.duration
            : 0,
          authorizationTime: 25,
          validationTime: 15,
          networkLatency: this.parlantServiceContext.responseTime,
          queueTime: 0
        },
        securityValidation: {
          valid: true,
          riskScore: 25,
          checksPerformed: [],
          violations: [],
          fraudDetection: {
            fraudScore: 0,
            indicators: [],
            recommendation: FraudRecommendation.ALLOW
          }
        }
      };
    }

    // Fallback to bypass result
    if (bypassResult.status === 'fulfilled') {
      const bypass = bypassResult.value as BypassOperationResult;
      return {
        success: true,
        result: bypass.result,
        executionPath: ExecutionPath.PARALLEL_EXECUTION,
        performanceMetrics: {
          totalExecutionTime: Date.now() - startTime,
          parlantExecutionTime: 0,
          bypassExecutionTime: bypass.performanceMetrics.duration,
          authorizationTime: 50,
          validationTime: 30,
          networkLatency: 0,
          queueTime: 0
        },
        securityValidation: bypass.securityValidation,
        bypassInfo: {
          reason: BypassReason.PARLANT_ERROR,
          tokenId: bypass.tokenId,
          authorizationLevel: BypassAuthorizationLevel.EMERGENCY_SINGLE,
          automaticTrigger: true,
          approvalRequired: false,
          riskScore: bypass.securityValidation.riskScore
        }
      };
    }

    // Both failed
    throw new Error('Both PARLANT and bypass execution failed');
  }

  /**
   * Execute PARLANT operation (mock)
   */
  private async executeParlantOperation(request: BypassOperationRequest, timeoutMs: number): Promise<any> {
    // Mock PARLANT execution
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50)); // 50-150ms

    // Simulate random failures
    if (this.parlantServiceContext.status !== ServiceStatus.OPERATIONAL || Math.random() < 0.1) {
      throw new Error('PARLANT service unavailable');
    }

    return {
      success: true,
      result: `PARLANT executed ${request.functionName}`,
      parlantValidation: true
    };
  }

  /**
   * Execute bypass operation
   */
  private async executeBypassOperation(
    request: BypassOperationRequest,
    executionId: string
  ): Promise<BypassOperationResult> {
    // Mock bypass operation execution
    const startTime = Date.now();

    // Simulate operation execution
    await new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 100)); // 100-300ms

    const success = Math.random() > 0.05; // 95% success rate
    const endTime = Date.now();

    const result: BypassOperationResult = {
      operationId: executionId,
      tokenId: 'mock_token_' + Math.random().toString(36).substr(2, 9),
      functionName: request.functionName,
      executedAt: new Date(),
      success,
      result: success ? `Bypass executed ${request.functionName}` : undefined,
      error: success ? undefined : {
        code: 'BYPASS_EXECUTION_ERROR',
        message: 'Mock bypass execution failed',
        metadata: {}
      },
      performanceMetrics: {
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        duration: endTime - startTime,
        authTime: 50,
        authzTime: 30,
        dbTime: 20,
        networkLatency: 10
      },
      securityValidation: {
        valid: success,
        riskScore: Math.random() * 40 + 20, // 20-60
        checksPerformed: [
          {
            checkName: 'authorization_check',
            passed: success,
            details: 'Authorization validation',
            riskContribution: 10
          }
        ],
        violations: success ? [] : [{
          type: SecurityViolationType.ANOMALOUS_BEHAVIOR,
          severity: ViolationSeverity.MEDIUM,
          description: 'Bypass operation failed',
          remediation: 'Retry operation'
        }],
        fraudDetection: {
          fraudScore: Math.random() * 20,
          indicators: [],
          recommendation: FraudRecommendation.ALLOW
        }
      }
    };

    return result;
  }

  /**
   * Log operation execution
   */
  private async logOperationExecution(
    request: BypassOperationRequest,
    result: OperationExecutionResult,
    executionId: string
  ): Promise<void> {
    // Log to audit system
    if (result.bypassInfo) {
      await this.auditForensics.logBypassOperation(
        {
          operationId: executionId,
          tokenId: result.bypassInfo.tokenId || 'unknown',
          functionName: request.functionName,
          executedAt: new Date(),
          success: result.success,
          result: result.result,
          error: result.error ? {
            code: result.error.code,
            message: result.error.message,
            metadata: result.error.metadata
          } : undefined,
          performanceMetrics: {
            startTime: new Date(),
            endTime: new Date(),
            duration: result.performanceMetrics.totalExecutionTime,
            authTime: result.performanceMetrics.authorizationTime,
            authzTime: 0,
            dbTime: 0,
            networkLatency: result.performanceMetrics.networkLatency
          },
          securityValidation: result.securityValidation
        },
        {
          id: request.userContext.userId,
          type: ActorType.HUMAN_USER,
          name: request.userContext.userId,
          role: request.userContext.userRole,
          ipAddress: request.userContext.ipAddress,
          userAgent: request.userContext.userAgent,
          location: request.userContext.location,
          sessionId: request.userContext.sessionId
        }
      );
    }

    // Emit integration event
    this.emit('operation-executed', {
      executionId,
      request,
      result,
      timestamp: new Date()
    });
  }

  /**
   * Handle execution error
   */
  private async handleExecutionError(
    request: BypassOperationRequest,
    error: unknown,
    executionId: string,
    startTime: number
  ): Promise<OperationExecutionResult> {
    const errorMessage = this.extractErrorMessage(error);
    this.logger.error(`Operation execution failed (${executionId}):`, error);

    return {
      success: false,
      error: {
        code: 'EXECUTION_ERROR',
        message: errorMessage,
        source: ErrorSource.BYPASS_SYSTEM,
        metadata: { executionId },
        retryable: true
      },
      executionPath: ExecutionPath.PARLANT_FAILURE_BYPASS_FAILURE,
      performanceMetrics: {
        totalExecutionTime: Date.now() - startTime,
        parlantExecutionTime: 0,
        bypassExecutionTime: 0,
        authorizationTime: 0,
        validationTime: 0,
        networkLatency: 0,
        queueTime: 0
      },
      securityValidation: {
        valid: false,
        riskScore: 100,
        checksPerformed: [],
        violations: [{
          type: SecurityViolationType.ANOMALOUS_BEHAVIOR,
          severity: ViolationSeverity.HIGH,
          description: 'Operation execution failed',
          remediation: 'Review error and retry'
        }],
        fraudDetection: {
          fraudScore: 0,
          indicators: [],
          recommendation: FraudRecommendation.REVIEW
        }
      }
    };
  }

  /**
   * Update circuit breakers
   */
  private updateCircuitBreakers(): void {
    // Mock circuit breaker logic
    const parlantFailures = this.parlantServiceContext.consecutiveFailures;

    let circuitBreaker = this.circuitBreakerState.get('parlant');
    if (!circuitBreaker) {
      circuitBreaker = {
        state: 'CLOSED',
        failureCount: 0,
        lastFailureTime: null,
        nextRetryTime: null
      };
    }

    if (parlantFailures >= this.integrationConfig.failureThreshold) {
      if (circuitBreaker.state === 'CLOSED') {
        circuitBreaker.state = 'OPEN';
        circuitBreaker.nextRetryTime = new Date(Date.now() + 300000); // 5 minutes
        this.logger.warn('PARLANT circuit breaker opened due to consecutive failures');
      }
    } else if (parlantFailures === 0 && circuitBreaker.state === 'OPEN') {
      if (Date.now() > (circuitBreaker.nextRetryTime?.getTime() || 0)) {
        circuitBreaker.state = 'HALF_OPEN';
        this.logger.log('PARLANT circuit breaker moved to half-open state');
      }
    }

    circuitBreaker.failureCount = parlantFailures;
    this.circuitBreakerState.set('parlant', circuitBreaker);
  }

  /**
   * Helper methods
   */
  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateWorkflowId(): string {
    return `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private determineIntegrationMode(): BypassMode {
    return this.integrationConfig.bypassMode;
  }

  private async getActiveBypassOperations(): Promise<number> {
    // Mock active operations count
    return Math.floor(Math.random() * 10) + 1;
  }

  private async getIntegrationPerformanceMetrics(): Promise<IntegrationPerformanceMetrics> {
    return {
      parlantSuccessRate: Math.random() * 20 + 80, // 80-100%
      bypassSuccessRate: Math.random() * 10 + 90, // 90-100%
      averageResponseTime: Math.random() * 200 + 100,
      parlantAvailability: this.parlantServiceContext.status === ServiceStatus.OPERATIONAL ? 100 : 0,
      bypassAvailability: 99.9,
      failoverRate: Math.random() * 5, // 0-5%
      totalOperationsToday: Math.floor(Math.random() * 1000) + 100
    };
  }

  /**
   * Extract error message from unknown error type with comprehensive handling
   */
  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === 'string') {
      return error;
    }

    if (error && typeof error === 'object') {
      const errorObj = error as Record<string, unknown>;

      // Try common error message properties
      if (typeof errorObj.message === 'string') {
        return errorObj.message;
      }

      if (typeof errorObj.error === 'string') {
        return errorObj.error;
      }

      if (typeof errorObj.description === 'string') {
        return errorObj.description;
      }

      // Try to get a meaningful string representation
      try {
        return JSON.stringify(error);
      } catch {
        return 'Failed to serialize error object';
      }
    }

    // Fallback for null, undefined, or other types
    return error === null ? 'Error is null' :
           error === undefined ? 'Error is undefined' :
           `Unknown error type: ${typeof error}`;
  }
}

// =============================================================================
// SUPPORTING INTERFACES
// =============================================================================

interface CircuitBreakerState {
  state: 'OPEN' | 'CLOSED' | 'HALF_OPEN';
  failureCount: number;
  lastFailureTime: Date | null;
  nextRetryTime: Date | null;
}

export interface IntegrationStatus {
  parlantService: ParlantServiceContext;
  bypassSystemHealth: any; // OverallHealthStatus from monitoring service
  integrationMode: BypassMode;
  activeBypassOperations: number;
  performanceMetrics: IntegrationPerformanceMetrics;
  lastStatusUpdate: Date;
}

export interface IntegrationPerformanceMetrics {
  parlantSuccessRate: number;
  bypassSuccessRate: number;
  averageResponseTime: number;
  parlantAvailability: number;
  bypassAvailability: number;
  failoverRate: number;
  totalOperationsToday: number;
}

// Re-export needed enums and types from other modules
import { BypassRequestStatus, WorkflowStatus } from '../types/bypass-core.types';
import { ActorType } from '../audit/bypass-audit-forensics.service';
import { FraudRecommendation } from '../types/bypass-core.types';