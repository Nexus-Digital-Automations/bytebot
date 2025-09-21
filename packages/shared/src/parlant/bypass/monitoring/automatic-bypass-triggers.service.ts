/**
 * PARLANT Phase 1 Emergency Bypass System - Automatic Bypass Triggers
 *
 * Intelligent system monitoring with automatic bypass activation for
 * system-critical operations when PARLANT service is unavailable.
 *
 * @version 1.0.0
 * @author PARLANT Emergency Bypass System Agent
 * @compliance GDPR, SOX, HIPAA, SOC2
 */

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter } from 'events';
import {
  BypassOperationType,
  BypassAuthorizationLevel,
  BypassRole,
  BusinessImpactLevel,
  BypassPriority,
  SystemHealthStatus,
  ServiceStatus,
  EmergencyBypassRequest,
  BypassRequestStatus,
  WorkflowStatus
} from '../types/bypass-core.types';

/**
 * System health metrics
 */
export interface SystemHealthMetrics {
  /** CPU utilization percentage */
  cpuUtilization: number;

  /** Memory utilization percentage */
  memoryUtilization: number;

  /** Disk utilization percentage */
  diskUtilization: number;

  /** Network latency in milliseconds */
  networkLatency: number;

  /** Database response time in milliseconds */
  databaseResponseTime: number;

  /** Active connections count */
  activeConnections: number;

  /** Error rate percentage */
  errorRate: number;

  /** Timestamp of metrics */
  timestamp: Date;
}

/**
 * Service health status
 */
export interface ServiceHealthInfo {
  /** Service name */
  serviceName: string;

  /** Service status */
  status: ServiceStatus;

  /** Response time */
  responseTime: number;

  /** Last successful ping */
  lastSuccessfulPing: Date;

  /** Consecutive failures */
  consecutiveFailures: number;

  /** Error details */
  lastError?: string;
}

/**
 * Automatic bypass trigger configuration
 */
export interface BypassTriggerConfig {
  /** Trigger name */
  name: string;

  /** Trigger description */
  description: string;

  /** Operation type this trigger handles */
  operationType: BypassOperationType;

  /** Functions this trigger applies to */
  targetFunctions: string[];

  /** Trigger conditions */
  conditions: TriggerCondition[];

  /** Automatic authorization level */
  authorizationLevel: BypassAuthorizationLevel;

  /** Priority of operations */
  priority: BypassPriority;

  /** Business impact level */
  businessImpact: BusinessImpactLevel;

  /** Maximum duration for bypass (minutes) */
  maxDurationMinutes: number;

  /** Maximum operations allowed */
  maxOperations: number;

  /** Trigger enabled status */
  enabled: boolean;

  /** Cooldown period between triggers (minutes) */
  cooldownMinutes: number;
}

/**
 * Trigger condition
 */
export interface TriggerCondition {
  /** Condition type */
  type: TriggerConditionType;

  /** Metric to monitor */
  metric: string;

  /** Comparison operator */
  operator: ComparisonOperator;

  /** Threshold value */
  threshold: number;

  /** Duration condition must be met (seconds) */
  durationSeconds: number;

  /** Weight of this condition */
  weight: number;
}

/**
 * Trigger condition types
 */
export enum TriggerConditionType {
  SYSTEM_HEALTH = 'system_health',
  SERVICE_AVAILABILITY = 'service_availability',
  ERROR_RATE = 'error_rate',
  RESPONSE_TIME = 'response_time',
  RESOURCE_UTILIZATION = 'resource_utilization',
  CONSECUTIVE_FAILURES = 'consecutive_failures'
}

/**
 * Comparison operators
 */
export enum ComparisonOperator {
  GREATER_THAN = 'gt',
  GREATER_THAN_EQUAL = 'gte',
  LESS_THAN = 'lt',
  LESS_THAN_EQUAL = 'lte',
  EQUAL = 'eq',
  NOT_EQUAL = 'ne'
}

/**
 * Bypass trigger event
 */
export interface BypassTriggerEvent {
  /** Event ID */
  eventId: string;

  /** Trigger name that fired */
  triggerName: string;

  /** Timestamp */
  timestamp: Date;

  /** System metrics at time of trigger */
  systemMetrics: SystemHealthMetrics;

  /** Service status at time of trigger */
  serviceStatus: ServiceHealthInfo[];

  /** Trigger conditions that were met */
  metConditions: TriggerCondition[];

  /** Automatic bypass request generated */
  bypassRequest: EmergencyBypassRequest;

  /** Event severity */
  severity: EventSeverity;
}

/**
 * Event severity levels
 */
export enum EventSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
  EMERGENCY = 'emergency'
}

/**
 * Automatic Bypass Triggers Service
 *
 * Provides intelligent monitoring and automatic bypass activation:
 * - Real-time system health monitoring
 * - Service availability tracking
 * - Configurable trigger conditions
 * - Automatic emergency bypass generation
 * - Prevention of cascade failures
 */
@Injectable()
export class AutomaticBypassTriggersService extends EventEmitter {
  private readonly logger = new Logger(AutomaticBypassTriggersService.name);
  private readonly triggerConfigs = new Map<string, BypassTriggerConfig>();
  private readonly lastTriggerTime = new Map<string, Date>();
  private readonly systemMetrics: SystemHealthMetrics[] = [];
  private readonly serviceHealth = new Map<string, ServiceHealthInfo>();
  private readonly monitoringInterval = 30000; // 30 seconds
  private readonly maxMetricsHistory = 100;

  constructor() {
    super();
    this.initializeDefaultTriggers();
    this.startSystemMonitoring();
  }

  /**
   * Register bypass trigger configuration
   */
  async registerTrigger(config: BypassTriggerConfig): Promise<void> {
    this.triggerConfigs.set(config.name, config);
    this.logger.warn(`Bypass trigger registered: ${config.name} for ${config.operationType}`);
  }

  /**
   * Update trigger configuration
   */
  async updateTrigger(name: string, updates: Partial<BypassTriggerConfig>): Promise<void> {
    const existing = this.triggerConfigs.get(name);
    if (!existing) {
      throw new Error(`Trigger not found: ${name}`);
    }

    const updated = { ...existing, ...updates };
    this.triggerConfigs.set(name, updated);
    this.logger.warn(`Bypass trigger updated: ${name}`);
  }

  /**
   * Enable/disable trigger
   */
  async setTriggerStatus(name: string, enabled: boolean): Promise<void> {
    const trigger = this.triggerConfigs.get(name);
    if (!trigger) {
      throw new Error(`Trigger not found: ${name}`);
    }

    trigger.enabled = enabled;
    this.logger.warn(`Bypass trigger ${name} ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get all trigger configurations
   */
  async getTriggerConfigs(): Promise<BypassTriggerConfig[]> {
    return Array.from(this.triggerConfigs.values());
  }

  /**
   * Get current system health metrics
   */
  async getCurrentSystemHealth(): Promise<SystemHealthMetrics> {
    return this.systemMetrics[this.systemMetrics.length - 1] || this.createEmptyMetrics();
  }

  /**
   * Get service health status
   */
  async getServiceHealth(): Promise<ServiceHealthInfo[]> {
    return Array.from(this.serviceHealth.values());
  }

  /**
   * Update service health status
   */
  async updateServiceHealth(serviceName: string, status: ServiceStatus, responseTime: number, error?: string): Promise<void> {
    const existing = this.serviceHealth.get(serviceName);
    const consecutiveFailures = status === ServiceStatus.OPERATIONAL
      ? 0
      : (existing?.consecutiveFailures || 0) + 1;

    const healthInfo: ServiceHealthInfo = {
      serviceName,
      status,
      responseTime,
      lastSuccessfulPing: status === ServiceStatus.OPERATIONAL ? new Date() : existing?.lastSuccessfulPing || new Date(),
      consecutiveFailures,
      lastError: error
    };

    this.serviceHealth.set(serviceName, healthInfo);

    // Check for triggers after service health update
    await this.checkTriggers();
  }

  /**
   * Force trigger evaluation (for testing)
   */
  async evaluateTriggers(): Promise<BypassTriggerEvent[]> {
    return this.checkTriggers();
  }

  /**
   * Get trigger statistics
   */
  async getTriggerStatistics(): Promise<TriggerStatistics> {
    const triggers = Array.from(this.triggerConfigs.values());

    return {
      totalTriggers: triggers.length,
      enabledTriggers: triggers.filter(t => t.enabled).length,
      triggersToday: this.getTriggersInPeriod(24 * 60 * 60 * 1000), // 24 hours
      triggersByType: this.groupTriggersByType(),
      lastTriggerTime: Math.max(...Array.from(this.lastTriggerTime.values()).map(d => d.getTime())) || 0,
      averageResponseTime: this.calculateAverageResponseTime()
    };
  }

  // =============================================================================
  // PRIVATE METHODS
  // =============================================================================

  /**
   * Initialize default trigger configurations
   */
  private initializeDefaultTriggers(): void {
    // Critical database operations trigger
    this.registerTrigger({
      name: 'database_critical_outage',
      description: 'Automatic bypass for critical database operations during PARLANT outage',
      operationType: BypassOperationType.DATABASE_CRITICAL,
      targetFunctions: ['*'], // All database functions
      conditions: [
        {
          type: TriggerConditionType.SERVICE_AVAILABILITY,
          metric: 'parlant_service',
          operator: ComparisonOperator.NOT_EQUAL,
          threshold: ServiceStatus.OPERATIONAL as any,
          durationSeconds: 60,
          weight: 1.0
        },
        {
          type: TriggerConditionType.CONSECUTIVE_FAILURES,
          metric: 'parlant_consecutive_failures',
          operator: ComparisonOperator.GREATER_THAN_EQUAL,
          threshold: 3,
          durationSeconds: 30,
          weight: 0.8
        }
      ],
      authorizationLevel: BypassAuthorizationLevel.SYSTEM_CRITICAL,
      priority: BypassPriority.CRITICAL,
      businessImpact: BusinessImpactLevel.CRITICAL,
      maxDurationMinutes: 30,
      maxOperations: 50,
      enabled: true,
      cooldownMinutes: 5
    });

    // Authentication critical operations trigger
    this.registerTrigger({
      name: 'auth_critical_failure',
      description: 'Automatic bypass for authentication operations during system failure',
      operationType: BypassOperationType.AUTH_CRITICAL,
      targetFunctions: ['authenticateUser', 'validateToken', 'refreshToken'],
      conditions: [
        {
          type: TriggerConditionType.ERROR_RATE,
          metric: 'auth_error_rate',
          operator: ComparisonOperator.GREATER_THAN,
          threshold: 50, // 50% error rate
          durationSeconds: 120,
          weight: 1.0
        },
        {
          type: TriggerConditionType.RESPONSE_TIME,
          metric: 'auth_response_time',
          operator: ComparisonOperator.GREATER_THAN,
          threshold: 5000, // 5 seconds
          durationSeconds: 60,
          weight: 0.7
        }
      ],
      authorizationLevel: BypassAuthorizationLevel.EMERGENCY_SINGLE,
      priority: BypassPriority.HIGH,
      businessImpact: BusinessImpactLevel.HIGH,
      maxDurationMinutes: 15,
      maxOperations: 100,
      enabled: true,
      cooldownMinutes: 2
    });

    // Security incident response trigger
    this.registerTrigger({
      name: 'security_incident_auto_response',
      description: 'Automatic bypass for security incident response operations',
      operationType: BypassOperationType.SECURITY_INCIDENT,
      targetFunctions: ['blockUser', 'revokeTokens', 'emergencyLockdown'],
      conditions: [
        {
          type: TriggerConditionType.SYSTEM_HEALTH,
          metric: 'security_threat_level',
          operator: ComparisonOperator.GREATER_THAN_EQUAL,
          threshold: 80, // High threat level
          durationSeconds: 30,
          weight: 1.0
        }
      ],
      authorizationLevel: BypassAuthorizationLevel.SYSTEM_CRITICAL,
      priority: BypassPriority.CRITICAL,
      businessImpact: BusinessImpactLevel.CRITICAL,
      maxDurationMinutes: 60,
      maxOperations: 20,
      enabled: true,
      cooldownMinutes: 1
    });

    // System maintenance trigger
    this.registerTrigger({
      name: 'maintenance_auto_bypass',
      description: 'Automatic bypass for maintenance operations during planned downtime',
      operationType: BypassOperationType.MAINTENANCE,
      targetFunctions: ['updateConfiguration', 'restartService', 'deployUpdate'],
      conditions: [
        {
          type: TriggerConditionType.SERVICE_AVAILABILITY,
          metric: 'maintenance_mode',
          operator: ComparisonOperator.EQUAL,
          threshold: 1, // Maintenance mode active
          durationSeconds: 0,
          weight: 1.0
        }
      ],
      authorizationLevel: BypassAuthorizationLevel.EMERGENCY_SINGLE,
      priority: BypassPriority.MEDIUM,
      businessImpact: BusinessImpactLevel.LOW,
      maxDurationMinutes: 120,
      maxOperations: 10,
      enabled: true,
      cooldownMinutes: 30
    });

    this.logger.warn('Default bypass triggers initialized');
  }

  /**
   * Start system monitoring
   */
  private startSystemMonitoring(): void {
    // Simulate system metrics collection
    setInterval(async () => {
      await this.collectSystemMetrics();
      await this.checkTriggers();
    }, this.monitoringInterval);

    this.logger.warn('System monitoring started');
  }

  /**
   * Collect current system metrics
   */
  private async collectSystemMetrics(): Promise<void> {
    // In a real implementation, these would be collected from actual system monitoring
    const metrics: SystemHealthMetrics = {
      cpuUtilization: Math.random() * 100,
      memoryUtilization: Math.random() * 100,
      diskUtilization: Math.random() * 100,
      networkLatency: Math.random() * 100 + 10,
      databaseResponseTime: Math.random() * 1000 + 50,
      activeConnections: Math.floor(Math.random() * 1000) + 100,
      errorRate: Math.random() * 10,
      timestamp: new Date()
    };

    this.systemMetrics.push(metrics);

    // Keep only recent metrics
    if (this.systemMetrics.length > this.maxMetricsHistory) {
      this.systemMetrics.shift();
    }
  }

  /**
   * Check all triggers for activation
   */
  private async checkTriggers(): Promise<BypassTriggerEvent[]> {
    const triggeredEvents: BypassTriggerEvent[] = [];

    for (const [name, config] of this.triggerConfigs) {
      if (!config.enabled) {
        continue;
      }

      // Check cooldown
      const lastTrigger = this.lastTriggerTime.get(name);
      if (lastTrigger) {
        const cooldownMs = config.cooldownMinutes * 60 * 1000;
        if (Date.now() - lastTrigger.getTime() < cooldownMs) {
          continue;
        }
      }

      // Evaluate trigger conditions
      const evaluationResult = await this.evaluateTriggerConditions(config);
      if (evaluationResult.shouldTrigger) {
        const event = await this.createTriggerEvent(config, evaluationResult.metConditions);
        triggeredEvents.push(event);
        this.lastTriggerTime.set(name, new Date());

        // Emit event
        this.emit('bypass-triggered', event);
      }
    }

    return triggeredEvents;
  }

  /**
   * Evaluate trigger conditions
   */
  private async evaluateTriggerConditions(config: BypassTriggerConfig): Promise<TriggerEvaluationResult> {
    const metConditions: TriggerCondition[] = [];
    let totalWeight = 0;
    let metWeight = 0;

    for (const condition of config.conditions) {
      totalWeight += condition.weight;

      const conditionMet = await this.evaluateCondition(condition);
      if (conditionMet) {
        metConditions.push(condition);
        metWeight += condition.weight;
      }
    }

    // Require at least 70% of weighted conditions to be met
    const shouldTrigger = (metWeight / totalWeight) >= 0.7;

    return {
      shouldTrigger,
      metConditions,
      totalWeight,
      metWeight
    };
  }

  /**
   * Evaluate individual condition
   */
  private async evaluateCondition(condition: TriggerCondition): Promise<boolean> {
    let currentValue: number;

    switch (condition.type) {
      case TriggerConditionType.SYSTEM_HEALTH:
        currentValue = await this.getSystemHealthMetric(condition.metric);
        break;

      case TriggerConditionType.SERVICE_AVAILABILITY:
        currentValue = await this.getServiceAvailabilityMetric(condition.metric);
        break;

      case TriggerConditionType.ERROR_RATE:
        currentValue = await this.getErrorRateMetric(condition.metric);
        break;

      case TriggerConditionType.RESPONSE_TIME:
        currentValue = await this.getResponseTimeMetric(condition.metric);
        break;

      case TriggerConditionType.RESOURCE_UTILIZATION:
        currentValue = await this.getResourceUtilizationMetric(condition.metric);
        break;

      case TriggerConditionType.CONSECUTIVE_FAILURES:
        currentValue = await this.getConsecutiveFailuresMetric(condition.metric);
        break;

      default:
        return false;
    }

    return this.compareValues(currentValue, condition.operator, condition.threshold);
  }

  /**
   * Compare values based on operator
   */
  private compareValues(actual: number, operator: ComparisonOperator, threshold: number): boolean {
    switch (operator) {
      case ComparisonOperator.GREATER_THAN:
        return actual > threshold;
      case ComparisonOperator.GREATER_THAN_EQUAL:
        return actual >= threshold;
      case ComparisonOperator.LESS_THAN:
        return actual < threshold;
      case ComparisonOperator.LESS_THAN_EQUAL:
        return actual <= threshold;
      case ComparisonOperator.EQUAL:
        return actual === threshold;
      case ComparisonOperator.NOT_EQUAL:
        return actual !== threshold;
      default:
        return false;
    }
  }

  /**
   * Get system health metric value
   */
  private async getSystemHealthMetric(metric: string): Promise<number> {
    const latest = this.systemMetrics[this.systemMetrics.length - 1];
    if (!latest) return 0;

    switch (metric) {
      case 'cpu_utilization':
        return latest.cpuUtilization;
      case 'memory_utilization':
        return latest.memoryUtilization;
      case 'disk_utilization':
        return latest.diskUtilization;
      case 'network_latency':
        return latest.networkLatency;
      case 'database_response_time':
        return latest.databaseResponseTime;
      case 'active_connections':
        return latest.activeConnections;
      case 'security_threat_level':
        return Math.random() * 100; // Mock threat level
      default:
        return 0;
    }
  }

  /**
   * Convert ServiceStatus enum to numeric metric value
   */
  private serviceStatusToNumber(status: ServiceStatus): number {
    switch (status) {
      case ServiceStatus.OPERATIONAL:
        return 1.0; // Fully operational
      case ServiceStatus.DEGRADED:
        return 0.7; // Partially operational
      case ServiceStatus.PARTIAL_OUTAGE:
        return 0.3; // Limited functionality
      case ServiceStatus.MAJOR_OUTAGE:
        return 0.0; // Not operational
      case ServiceStatus.MAINTENANCE:
        return 0.5; // Planned downtime
      default:
        return 0.0; // Unknown status, assume worst case
    }
  }

  /**
   * Get service availability metric
   */
  private async getServiceAvailabilityMetric(metric: string): Promise<number> {
    if (metric === 'parlant_service') {
      const health = this.serviceHealth.get('parlant');
      return health ? this.serviceStatusToNumber(health.status) : this.serviceStatusToNumber(ServiceStatus.MAJOR_OUTAGE);
    }

    if (metric === 'maintenance_mode') {
      // Mock maintenance mode check
      return 0; // 0 = not in maintenance, 1 = in maintenance
    }

    return this.serviceStatusToNumber(ServiceStatus.OPERATIONAL);
  }

  /**
   * Get error rate metric
   */
  private async getErrorRateMetric(metric: string): Promise<number> {
    const latest = this.systemMetrics[this.systemMetrics.length - 1];
    if (!latest) return 0;

    if (metric === 'auth_error_rate') {
      // Mock authentication error rate
      return Math.random() * 20; // 0-20% error rate
    }

    return latest.errorRate;
  }

  /**
   * Get response time metric
   */
  private async getResponseTimeMetric(metric: string): Promise<number> {
    if (metric === 'auth_response_time') {
      // Mock authentication response time
      return Math.random() * 2000 + 100; // 100-2100ms
    }

    const latest = this.systemMetrics[this.systemMetrics.length - 1];
    return latest?.databaseResponseTime || 0;
  }

  /**
   * Get resource utilization metric
   */
  private async getResourceUtilizationMetric(metric: string): Promise<number> {
    const latest = this.systemMetrics[this.systemMetrics.length - 1];
    if (!latest) return 0;

    switch (metric) {
      case 'cpu':
        return latest.cpuUtilization;
      case 'memory':
        return latest.memoryUtilization;
      case 'disk':
        return latest.diskUtilization;
      default:
        return 0;
    }
  }

  /**
   * Get consecutive failures metric
   */
  private async getConsecutiveFailuresMetric(metric: string): Promise<number> {
    if (metric === 'parlant_consecutive_failures') {
      const health = this.serviceHealth.get('parlant');
      return health?.consecutiveFailures || 0;
    }

    return 0;
  }

  /**
   * Create trigger event
   */
  private async createTriggerEvent(
    config: BypassTriggerConfig,
    metConditions: TriggerCondition[]
  ): Promise<BypassTriggerEvent> {
    const eventId = `trigger_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date();

    // Create emergency bypass request
    const bypassRequest: EmergencyBypassRequest = {
      requestId: `auto_${eventId}`,
      requestedBy: 'system_automatic_trigger',
      userRole: BypassRole.EMERGENCY_ADMIN,
      requestedAt: timestamp,
      operationType: config.operationType,
      functionName: config.targetFunctions[0] || 'automatic_bypass',
      functionArguments: {},
      reason: `Automatic bypass triggered by ${config.name}`,
      justification: `System conditions met trigger thresholds: ${metConditions.map(c => c.metric).join(', ')}`,
      requestedAuthLevel: config.authorizationLevel,
      durationMinutes: config.maxDurationMinutes,
      priority: config.priority,
      context: {
        systemHealth: SystemHealthStatus.CRITICAL,
        parlantStatus: ServiceStatus.MAJOR_OUTAGE,
        databaseStatus: ServiceStatus.OPERATIONAL,
        businessImpact: config.businessImpact,
        technicalDetails: {
          triggerName: config.name,
          metConditions: metConditions.map(c => c.metric)
        }
      },
      status: BypassRequestStatus.APPROVED,
      approvalWorkflow: {
        workflowId: `auto_workflow_${eventId}`,
        requiredApprovals: [config.authorizationLevel],
        currentStep: 1,
        steps: [],
        status: WorkflowStatus.APPROVED,
        metadata: {
          startedAt: timestamp,
          expectedCompletionAt: timestamp,
          completedAt: timestamp,
          totalTimeLimit: 0,
          escalationRules: [],
          notifications: []
        }
      }
    };

    const event: BypassTriggerEvent = {
      eventId,
      triggerName: config.name,
      timestamp,
      systemMetrics: await this.getCurrentSystemHealth(),
      serviceStatus: await this.getServiceHealth(),
      metConditions,
      bypassRequest,
      severity: this.calculateEventSeverity(config, metConditions)
    };

    this.logger.error(`Automatic bypass triggered: ${config.name} (Event: ${eventId})`);

    return event;
  }

  /**
   * Calculate event severity
   */
  private calculateEventSeverity(config: BypassTriggerConfig, metConditions: TriggerCondition[]): EventSeverity {
    if (config.priority === BypassPriority.CRITICAL) {
      return EventSeverity.CRITICAL;
    } else if (config.businessImpact === BusinessImpactLevel.CRITICAL) {
      return EventSeverity.EMERGENCY;
    } else if (metConditions.length >= config.conditions.length) {
      return EventSeverity.HIGH;
    } else if (config.priority === BypassPriority.HIGH) {
      return EventSeverity.MEDIUM;
    } else {
      return EventSeverity.LOW;
    }
  }

  /**
   * Create empty metrics
   */
  private createEmptyMetrics(): SystemHealthMetrics {
    return {
      cpuUtilization: 0,
      memoryUtilization: 0,
      diskUtilization: 0,
      networkLatency: 0,
      databaseResponseTime: 0,
      activeConnections: 0,
      errorRate: 0,
      timestamp: new Date()
    };
  }

  /**
   * Get triggers in time period
   */
  private getTriggersInPeriod(milliseconds: number): number {
    const cutoff = Date.now() - milliseconds;
    return Array.from(this.lastTriggerTime.values()).filter(
      time => time.getTime() > cutoff
    ).length;
  }

  /**
   * Group triggers by type
   */
  private groupTriggersByType(): Record<string, number> {
    const groups: Record<string, number> = {};

    for (const config of this.triggerConfigs.values()) {
      const type = config.operationType;
      groups[type] = (groups[type] || 0) + 1;
    }

    return groups;
  }

  /**
   * Calculate average response time
   */
  private calculateAverageResponseTime(): number {
    const services = Array.from(this.serviceHealth.values());
    if (services.length === 0) return 0;

    const total = services.reduce((sum, service) => sum + service.responseTime, 0);
    return total / services.length;
  }
}

// =============================================================================
// SUPPORTING INTERFACES
// =============================================================================

interface TriggerEvaluationResult {
  shouldTrigger: boolean;
  metConditions: TriggerCondition[];
  totalWeight: number;
  metWeight: number;
}

export interface TriggerStatistics {
  totalTriggers: number;
  enabledTriggers: number;
  triggersToday: number;
  triggersByType: Record<string, number>;
  lastTriggerTime: number;
  averageResponseTime: number;
}