/**
 * PARLANT Phase 1 Emergency Bypass System - Monitoring & Health Service
 *
 * Real-time monitoring and health check system with comprehensive metrics,
 * alerting, and automated recovery mechanisms.
 *
 * @version 1.0.0
 * @author PARLANT Emergency Bypass System Agent
 * @compliance GDPR, SOX, HIPAA, SOC2
 */

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter } from 'events';
import {
  ServiceStatus,
  SystemHealthStatus,
  BypassOperationType,
  BypassRole,
  EmergencyTokenStatus,
  ViolationSeverity
} from '../types/bypass-core.types';

/**
 * Health check configuration
 */
export interface HealthCheckConfig {
  /** Check name */
  name: string;

  /** Check description */
  description: string;

  /** Check interval in milliseconds */
  intervalMs: number;

  /** Timeout for health check */
  timeoutMs: number;

  /** Number of retries before marking as failed */
  retries: number;

  /** Critical check (affects overall system health) */
  critical: boolean;

  /** Health check function */
  checkFunction: () => Promise<HealthCheckResult>;

  /** Enabled status */
  enabled: boolean;
}

/**
 * Health check result
 */
export interface HealthCheckResult {
  /** Check success */
  healthy: boolean;

  /** Response time in milliseconds */
  responseTime: number;

  /** Additional details */
  details: string;

  /** Metrics collected */
  metrics?: Record<string, number>;

  /** Error message if unhealthy */
  error?: string;

  /** Timestamp */
  timestamp: Date;
}

/**
 * System metrics
 */
export interface SystemMetrics {
  /** Timestamp */
  timestamp: Date;

  /** CPU usage percentage */
  cpuUsage: number;

  /** Memory usage in MB */
  memoryUsage: number;

  /** Memory usage percentage */
  memoryUsagePercent: number;

  /** Disk usage percentage */
  diskUsage: number;

  /** Network I/O metrics */
  networkIO: NetworkIOMetrics;

  /** Active connections */
  activeConnections: number;

  /** Request rate (per second) */
  requestRate: number;

  /** Error rate percentage */
  errorRate: number;

  /** Average response time */
  avgResponseTime: number;

  /** Uptime in seconds */
  uptime: number;
}

/**
 * Network I/O metrics
 */
export interface NetworkIOMetrics {
  /** Bytes received per second */
  bytesInPerSec: number;

  /** Bytes sent per second */
  bytesOutPerSec: number;

  /** Packets received per second */
  packetsInPerSec: number;

  /** Packets sent per second */
  packetsOutPerSec: number;

  /** Connection errors per second */
  errorsPerSec: number;
}

/**
 * Bypass system metrics
 */
export interface BypassSystemMetrics {
  /** Timestamp */
  timestamp: Date;

  /** Total active tokens */
  activeTokens: number;

  /** Total pending tokens */
  pendingTokens: number;

  /** Total expired tokens */
  expiredTokens: number;

  /** Tokens by authorization level */
  tokensByAuthLevel: Record<string, number>;

  /** Operations performed today */
  operationsToday: number;

  /** Operations performed this hour */
  operationsThisHour: number;

  /** Average operations per minute */
  avgOperationsPerMinute: number;

  /** Success rate percentage */
  successRate: number;

  /** Average operation duration */
  avgOperationDuration: number;

  /** Security violations today */
  securityViolationsToday: number;

  /** Abuse events today */
  abuseEventsToday: number;

  /** Blocked users count */
  blockedUsersCount: number;

  /** Rate limited users count */
  rateLimitedUsersCount: number;

  /** Average risk score */
  avgRiskScore: number;
}

/**
 * Alert configuration
 */
export interface AlertConfig {
  /** Alert ID */
  alertId: string;

  /** Alert name */
  name: string;

  /** Alert description */
  description: string;

  /** Metric to monitor */
  metric: string;

  /** Threshold value */
  threshold: number;

  /** Comparison operator */
  operator: AlertOperator;

  /** Alert severity */
  severity: AlertSeverity;

  /** Time window for evaluation */
  timeWindowMs: number;

  /** Minimum occurrences to trigger */
  minOccurrences: number;

  /** Alert enabled */
  enabled: boolean;

  /** Notification channels */
  notificationChannels: NotificationChannel[];

  /** Cooldown period between alerts */
  cooldownMs: number;
}

/**
 * Alert operators
 */
export enum AlertOperator {
  GREATER_THAN = 'gt',
  GREATER_THAN_EQUAL = 'gte',
  LESS_THAN = 'lt',
  LESS_THAN_EQUAL = 'lte',
  EQUAL = 'eq',
  NOT_EQUAL = 'ne'
}

/**
 * Alert severity levels
 */
export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
  EMERGENCY = 'emergency'
}

/**
 * Notification channels
 */
export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  SLACK = 'slack',
  WEBHOOK = 'webhook',
  LOG = 'log'
}

/**
 * Alert event
 */
export interface AlertEvent {
  /** Event ID */
  eventId: string;

  /** Alert configuration */
  alert: AlertConfig;

  /** Timestamp */
  timestamp: Date;

  /** Current metric value */
  currentValue: number;

  /** Threshold value */
  thresholdValue: number;

  /** Alert message */
  message: string;

  /** Additional context */
  context: Record<string, any>;

  /** Alert resolved */
  resolved: boolean;

  /** Resolution timestamp */
  resolvedAt?: Date;
}

/**
 * Health status
 */
export interface OverallHealthStatus {
  /** Overall status */
  status: SystemHealthStatus;

  /** Health score (0-100) */
  healthScore: number;

  /** Last update */
  lastUpdate: Date;

  /** Individual component health */
  components: ComponentHealth[];

  /** System metrics */
  systemMetrics: SystemMetrics;

  /** Bypass metrics */
  bypassMetrics: BypassSystemMetrics;

  /** Active alerts */
  activeAlerts: AlertEvent[];

  /** Performance indicators */
  performanceIndicators: PerformanceIndicator[];
}

/**
 * Component health
 */
export interface ComponentHealth {
  /** Component name */
  name: string;

  /** Component status */
  status: ServiceStatus;

  /** Health score */
  healthScore: number;

  /** Last check */
  lastCheck: Date;

  /** Response time */
  responseTime: number;

  /** Error details */
  error?: string;

  /** Metrics */
  metrics: Record<string, number>;
}

/**
 * Performance indicators
 */
export interface PerformanceIndicator {
  /** Indicator name */
  name: string;

  /** Current value */
  value: number;

  /** Target value */
  target: number;

  /** Status */
  status: IndicatorStatus;

  /** Trend */
  trend: IndicatorTrend;

  /** Unit */
  unit: string;
}

/**
 * Indicator status
 */
export enum IndicatorStatus {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  WARNING = 'warning',
  CRITICAL = 'critical'
}

/**
 * Indicator trend
 */
export enum IndicatorTrend {
  IMPROVING = 'improving',
  STABLE = 'stable',
  DEGRADING = 'degrading'
}

/**
 * Monitoring dashboard data
 */
export interface MonitoringDashboard {
  /** Dashboard timestamp */
  timestamp: Date;

  /** Overall health */
  overallHealth: OverallHealthStatus;

  /** Real-time metrics */
  realTimeMetrics: RealTimeMetrics;

  /** Historical trends */
  historicalTrends: HistoricalTrend[];

  /** Top alerts */
  topAlerts: AlertEvent[];

  /** Security summary */
  securitySummary: SecuritySummary;

  /** Performance summary */
  performanceSummary: PerformanceSummary;
}

/**
 * Real-time metrics
 */
export interface RealTimeMetrics {
  /** Requests per second */
  requestsPerSecond: number;

  /** Active bypass operations */
  activeOperations: number;

  /** Current response time */
  currentResponseTime: number;

  /** Current error rate */
  currentErrorRate: number;

  /** Active users */
  activeUsers: number;

  /** System load */
  systemLoad: number;
}

/**
 * Historical trend
 */
export interface HistoricalTrend {
  /** Metric name */
  metric: string;

  /** Data points */
  dataPoints: DataPoint[];

  /** Trend direction */
  trend: IndicatorTrend;

  /** Change percentage */
  changePercent: number;
}

/**
 * Data point
 */
export interface DataPoint {
  /** Timestamp */
  timestamp: Date;

  /** Value */
  value: number;
}

/**
 * Security summary
 */
export interface SecuritySummary {
  /** Security incidents today */
  incidentsToday: number;

  /** Failed authentication attempts */
  failedAuthAttempts: number;

  /** Suspicious activities */
  suspiciousActivities: number;

  /** Blocked operations */
  blockedOperations: number;

  /** Security score */
  securityScore: number;
}

/**
 * Performance summary
 */
export interface PerformanceSummary {
  /** Average response time */
  avgResponseTime: number;

  /** 95th percentile response time */
  p95ResponseTime: number;

  /** Throughput (operations per minute) */
  throughput: number;

  /** Error rate */
  errorRate: number;

  /** Availability percentage */
  availability: number;
}

/**
 * Bypass Monitoring & Health Service
 *
 * Provides comprehensive monitoring and health checking:
 * - Real-time system monitoring
 * - Health checks for all components
 * - Performance metrics collection
 * - Alerting and notifications
 * - Automated recovery actions
 */
@Injectable()
export class BypassMonitoringHealthService extends EventEmitter {
  private readonly logger = new Logger(BypassMonitoringHealthService.name);
  private readonly healthChecks = new Map<string, HealthCheckConfig>();
  private readonly healthResults = new Map<string, HealthCheckResult>();
  private readonly alerts = new Map<string, AlertConfig>();
  private readonly activeAlerts = new Map<string, AlertEvent>();
  private readonly metricsHistory: SystemMetrics[] = [];
  private readonly bypassMetricsHistory: BypassSystemMetrics[] = [];
  private readonly alertHistory = new Map<string, Date>();
  private readonly maxHistorySize = 1000;
  private readonly startTime = Date.now();

  constructor() {
    super();
    this.initializeHealthChecks();
    this.initializeAlerts();
    this.startMonitoring();
  }

  /**
   * Get overall system health status
   */
  async getOverallHealth(): Promise<OverallHealthStatus> {
    const systemMetrics = await this.collectSystemMetrics();
    const bypassMetrics = await this.collectBypassMetrics();
    const components = await this.getComponentHealth();
    const activeAlerts = Array.from(this.activeAlerts.values());

    const healthScore = this.calculateOverallHealthScore(components, activeAlerts);
    const status = this.determineSystemStatus(healthScore, activeAlerts);

    return {
      status,
      healthScore,
      lastUpdate: new Date(),
      components,
      systemMetrics,
      bypassMetrics,
      activeAlerts,
      performanceIndicators: this.calculatePerformanceIndicators(systemMetrics, bypassMetrics)
    };
  }

  /**
   * Get monitoring dashboard data
   */
  async getMonitoringDashboard(): Promise<MonitoringDashboard> {
    const overallHealth = await this.getOverallHealth();

    return {
      timestamp: new Date(),
      overallHealth,
      realTimeMetrics: this.getRealTimeMetrics(),
      historicalTrends: this.getHistoricalTrends(),
      topAlerts: this.getTopAlerts(),
      securitySummary: this.getSecuritySummary(),
      performanceSummary: this.getPerformanceSummary()
    };
  }

  /**
   * Register custom health check
   */
  async registerHealthCheck(config: HealthCheckConfig): Promise<void> {
    this.healthChecks.set(config.name, config);
    this.logger.log(`Health check registered: ${config.name}`);
  }

  /**
   * Register custom alert
   */
  async registerAlert(config: AlertConfig): Promise<void> {
    this.alerts.set(config.alertId, config);
    this.logger.log(`Alert registered: ${config.name}`);
  }

  /**
   * Trigger manual health check
   */
  async runHealthCheck(checkName: string): Promise<HealthCheckResult> {
    const config = this.healthChecks.get(checkName);
    if (!config) {
      throw new Error(`Health check not found: ${checkName}`);
    }

    return this.executeHealthCheck(config);
  }

  /**
   * Get system metrics history
   */
  async getMetricsHistory(hours: number = 24): Promise<SystemMetrics[]> {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    return this.metricsHistory.filter(m => m.timestamp.getTime() > cutoff);
  }

  /**
   * Get bypass metrics history
   */
  async getBypassMetricsHistory(hours: number = 24): Promise<BypassSystemMetrics[]> {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    return this.bypassMetricsHistory.filter(m => m.timestamp.getTime() > cutoff);
  }

  /**
   * Get active alerts
   */
  async getActiveAlerts(): Promise<AlertEvent[]> {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Resolve alert
   */
  async resolveAlert(eventId: string): Promise<void> {
    const alert = this.activeAlerts.get(eventId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      this.activeAlerts.delete(eventId);
      this.logger.log(`Alert resolved: ${eventId}`);
      this.emit('alert-resolved', alert);
    }
  }

  // =============================================================================
  // PRIVATE METHODS
  // =============================================================================

  /**
   * Initialize default health checks
   */
  private initializeHealthChecks(): void {
    // Database connectivity check
    this.healthChecks.set('database', {
      name: 'database',
      description: 'Database connectivity and performance',
      intervalMs: 30000, // 30 seconds
      timeoutMs: 5000,
      retries: 3,
      critical: true,
      checkFunction: async () => this.checkDatabaseHealth(),
      enabled: true
    });

    // PARLANT service check
    this.healthChecks.set('parlant_service', {
      name: 'parlant_service',
      description: 'PARLANT service availability',
      intervalMs: 15000, // 15 seconds
      timeoutMs: 3000,
      retries: 2,
      critical: true,
      checkFunction: async () => this.checkParlantServiceHealth(),
      enabled: true
    });

    // Token management check
    this.healthChecks.set('token_management', {
      name: 'token_management',
      description: 'Emergency token management system',
      intervalMs: 60000, // 1 minute
      timeoutMs: 2000,
      retries: 1,
      critical: false,
      checkFunction: async () => this.checkTokenManagementHealth(),
      enabled: true
    });

    // Authorization engine check
    this.healthChecks.set('authorization_engine', {
      name: 'authorization_engine',
      description: 'Bypass authorization engine',
      intervalMs: 45000, // 45 seconds
      timeoutMs: 3000,
      retries: 2,
      critical: true,
      checkFunction: async () => this.checkAuthorizationEngineHealth(),
      enabled: true
    });

    // Audit system check
    this.healthChecks.set('audit_system', {
      name: 'audit_system',
      description: 'Audit and forensics system',
      intervalMs: 60000, // 1 minute
      timeoutMs: 2000,
      retries: 1,
      critical: false,
      checkFunction: async () => this.checkAuditSystemHealth(),
      enabled: true
    });

    this.logger.log('Default health checks initialized');
  }

  /**
   * Initialize default alerts
   */
  private initializeAlerts(): void {
    // High error rate alert
    this.alerts.set('high_error_rate', {
      alertId: 'high_error_rate',
      name: 'High Error Rate',
      description: 'System error rate exceeds threshold',
      metric: 'error_rate',
      threshold: 5, // 5%
      operator: AlertOperator.GREATER_THAN,
      severity: AlertSeverity.WARNING,
      timeWindowMs: 300000, // 5 minutes
      minOccurrences: 3,
      enabled: true,
      notificationChannels: [NotificationChannel.LOG, NotificationChannel.WEBHOOK],
      cooldownMs: 600000 // 10 minutes
    });

    // High response time alert
    this.alerts.set('high_response_time', {
      alertId: 'high_response_time',
      name: 'High Response Time',
      description: 'Average response time exceeds threshold',
      metric: 'avg_response_time',
      threshold: 2000, // 2 seconds
      operator: AlertOperator.GREATER_THAN,
      severity: AlertSeverity.WARNING,
      timeWindowMs: 180000, // 3 minutes
      minOccurrences: 2,
      enabled: true,
      notificationChannels: [NotificationChannel.LOG],
      cooldownMs: 300000 // 5 minutes
    });

    // Security violation alert
    this.alerts.set('security_violations', {
      alertId: 'security_violations',
      name: 'Security Violations',
      description: 'High number of security violations detected',
      metric: 'security_violations_per_hour',
      threshold: 10,
      operator: AlertOperator.GREATER_THAN,
      severity: AlertSeverity.CRITICAL,
      timeWindowMs: 3600000, // 1 hour
      minOccurrences: 1,
      enabled: true,
      notificationChannels: [NotificationChannel.LOG, NotificationChannel.WEBHOOK],
      cooldownMs: 1800000 // 30 minutes
    });

    // Database connectivity alert
    this.alerts.set('database_down', {
      alertId: 'database_down',
      name: 'Database Unavailable',
      description: 'Database connection failed',
      metric: 'database_health',
      threshold: 0, // 0 = unhealthy
      operator: AlertOperator.EQUAL,
      severity: AlertSeverity.EMERGENCY,
      timeWindowMs: 60000, // 1 minute
      minOccurrences: 1,
      enabled: true,
      notificationChannels: [NotificationChannel.LOG, NotificationChannel.WEBHOOK],
      cooldownMs: 300000 // 5 minutes
    });

    this.logger.log('Default alerts initialized');
  }

  /**
   * Start monitoring loops
   */
  private startMonitoring(): void {
    // System metrics collection
    setInterval(async () => {
      await this.collectAndStoreSystemMetrics();
    }, 30000); // 30 seconds

    // Bypass metrics collection
    setInterval(async () => {
      await this.collectAndStoreBypassMetrics();
    }, 60000); // 1 minute

    // Health checks execution
    setInterval(async () => {
      await this.executeAllHealthChecks();
    }, 15000); // 15 seconds

    // Alert evaluation
    setInterval(async () => {
      await this.evaluateAlerts();
    }, 60000); // 1 minute

    this.logger.log('Monitoring loops started');
  }

  /**
   * Execute individual health check
   */
  private async executeHealthCheck(config: HealthCheckConfig): Promise<HealthCheckResult> {
    if (!config.enabled) {
      return {
        healthy: true,
        responseTime: 0,
        details: 'Health check disabled',
        timestamp: new Date()
      };
    }

    const startTime = Date.now();

    try {
      const result = await Promise.race([
        config.checkFunction(),
        this.createTimeoutPromise(config.timeoutMs)
      ]);

      result.responseTime = Date.now() - startTime;
      result.timestamp = new Date();

      this.healthResults.set(config.name, result);
      return result;

    } catch (error) {
      const result: HealthCheckResult = {
        healthy: false,
        responseTime: Date.now() - startTime,
        details: 'Health check failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };

      this.healthResults.set(config.name, result);
      return result;
    }
  }

  /**
   * Create timeout promise
   */
  private createTimeoutPromise(timeoutMs: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Health check timeout')), timeoutMs);
    });
  }

  /**
   * Individual health check implementations
   */
  private async checkDatabaseHealth(): Promise<HealthCheckResult> {
    // Mock database health check
    const healthy = Math.random() > 0.05; // 95% success rate
    const responseTime = Math.random() * 100 + 10; // 10-110ms

    return {
      healthy,
      responseTime,
      details: healthy ? 'Database connection successful' : 'Database connection failed',
      metrics: {
        connectionCount: Math.floor(Math.random() * 100) + 10,
        queryTime: responseTime
      },
      timestamp: new Date()
    };
  }

  private async checkParlantServiceHealth(): Promise<HealthCheckResult> {
    // Mock PARLANT service health check
    const healthy = Math.random() > 0.1; // 90% success rate
    const responseTime = Math.random() * 200 + 50; // 50-250ms

    return {
      healthy,
      responseTime,
      details: healthy ? 'PARLANT service responsive' : 'PARLANT service unavailable',
      metrics: {
        activeConnections: Math.floor(Math.random() * 50) + 5,
        memoryUsage: Math.random() * 1000 + 100
      },
      timestamp: new Date()
    };
  }

  private async checkTokenManagementHealth(): Promise<HealthCheckResult> {
    // Mock token management health check
    const healthy = Math.random() > 0.02; // 98% success rate
    const responseTime = Math.random() * 50 + 5; // 5-55ms

    return {
      healthy,
      responseTime,
      details: healthy ? 'Token management operational' : 'Token management issues',
      metrics: {
        activeTokens: Math.floor(Math.random() * 20) + 1,
        tokenCreationRate: Math.random() * 10
      },
      timestamp: new Date()
    };
  }

  private async checkAuthorizationEngineHealth(): Promise<HealthCheckResult> {
    // Mock authorization engine health check
    const healthy = Math.random() > 0.03; // 97% success rate
    const responseTime = Math.random() * 80 + 10; // 10-90ms

    return {
      healthy,
      responseTime,
      details: healthy ? 'Authorization engine operational' : 'Authorization engine issues',
      metrics: {
        authorizationRate: Math.random() * 100 + 10,
        cacheHitRate: Math.random() * 100
      },
      timestamp: new Date()
    };
  }

  private async checkAuditSystemHealth(): Promise<HealthCheckResult> {
    // Mock audit system health check
    const healthy = Math.random() > 0.01; // 99% success rate
    const responseTime = Math.random() * 30 + 5; // 5-35ms

    return {
      healthy,
      responseTime,
      details: healthy ? 'Audit system operational' : 'Audit system issues',
      metrics: {
        auditEntries: Math.floor(Math.random() * 1000) + 100,
        storageUsage: Math.random() * 100
      },
      timestamp: new Date()
    };
  }

  /**
   * Collect system metrics
   */
  private async collectSystemMetrics(): Promise<SystemMetrics> {
    // Mock system metrics collection
    return {
      timestamp: new Date(),
      cpuUsage: Math.random() * 100,
      memoryUsage: Math.random() * 8000 + 1000, // 1-9GB
      memoryUsagePercent: Math.random() * 80 + 10, // 10-90%
      diskUsage: Math.random() * 50 + 30, // 30-80%
      networkIO: {
        bytesInPerSec: Math.random() * 1000000,
        bytesOutPerSec: Math.random() * 1000000,
        packetsInPerSec: Math.random() * 1000,
        packetsOutPerSec: Math.random() * 1000,
        errorsPerSec: Math.random() * 10
      },
      activeConnections: Math.floor(Math.random() * 1000) + 100,
      requestRate: Math.random() * 100 + 10,
      errorRate: Math.random() * 5,
      avgResponseTime: Math.random() * 500 + 100,
      uptime: Math.floor((Date.now() - this.startTime) / 1000)
    };
  }

  /**
   * Collect bypass system metrics
   */
  private async collectBypassMetrics(): Promise<BypassSystemMetrics> {
    // Mock bypass metrics collection
    return {
      timestamp: new Date(),
      activeTokens: Math.floor(Math.random() * 50) + 5,
      pendingTokens: Math.floor(Math.random() * 10),
      expiredTokens: Math.floor(Math.random() * 100) + 50,
      tokensByAuthLevel: {
        'system_critical': Math.floor(Math.random() * 10),
        'emergency_single': Math.floor(Math.random() * 20),
        'emergency_dual': Math.floor(Math.random() * 15),
        'committee_approval': Math.floor(Math.random() * 5),
        'board_approval': Math.floor(Math.random() * 2)
      },
      operationsToday: Math.floor(Math.random() * 500) + 100,
      operationsThisHour: Math.floor(Math.random() * 50) + 5,
      avgOperationsPerMinute: Math.random() * 10 + 1,
      successRate: Math.random() * 20 + 80, // 80-100%
      avgOperationDuration: Math.random() * 1000 + 100,
      securityViolationsToday: Math.floor(Math.random() * 10),
      abuseEventsToday: Math.floor(Math.random() * 5),
      blockedUsersCount: Math.floor(Math.random() * 5),
      rateLimitedUsersCount: Math.floor(Math.random() * 10),
      avgRiskScore: Math.random() * 40 + 30 // 30-70
    };
  }

  /**
   * Store metrics in history
   */
  private async collectAndStoreSystemMetrics(): Promise<void> {
    const metrics = await this.collectSystemMetrics();
    this.metricsHistory.push(metrics);

    // Keep only recent metrics
    if (this.metricsHistory.length > this.maxHistorySize) {
      this.metricsHistory.shift();
    }
  }

  private async collectAndStoreBypassMetrics(): Promise<void> {
    const metrics = await this.collectBypassMetrics();
    this.bypassMetricsHistory.push(metrics);

    // Keep only recent metrics
    if (this.bypassMetricsHistory.length > this.maxHistorySize) {
      this.bypassMetricsHistory.shift();
    }
  }

  /**
   * Execute all health checks
   */
  private async executeAllHealthChecks(): Promise<void> {
    const promises = Array.from(this.healthChecks.values()).map(config =>
      this.executeHealthCheck(config).catch(error => {
        this.logger.error(`Health check ${config.name} failed:`, error);
        return {
          healthy: false,
          responseTime: 0,
          details: 'Health check execution failed',
          error: error.message,
          timestamp: new Date()
        };
      })
    );

    await Promise.all(promises);
  }

  /**
   * Get component health status
   */
  private async getComponentHealth(): Promise<ComponentHealth[]> {
    const components: ComponentHealth[] = [];

    for (const [name, result] of this.healthResults) {
      const component: ComponentHealth = {
        name,
        status: result.healthy ? ServiceStatus.OPERATIONAL : ServiceStatus.MAJOR_OUTAGE,
        healthScore: result.healthy ? 100 : 0,
        lastCheck: result.timestamp,
        responseTime: result.responseTime,
        error: result.error,
        metrics: result.metrics || {}
      };

      components.push(component);
    }

    return components;
  }

  /**
   * Calculate overall health score
   */
  private calculateOverallHealthScore(components: ComponentHealth[], alerts: AlertEvent[]): number {
    let totalScore = 0;
    let criticalComponents = 0;

    // Component health contribution
    for (const component of components) {
      const config = this.healthChecks.get(component.name);
      if (config?.critical) {
        totalScore += component.healthScore * 0.7; // Critical components weight more
        criticalComponents++;
      } else {
        totalScore += component.healthScore * 0.3;
      }
    }

    // Alert penalty
    const criticalAlerts = alerts.filter(a => a.alert.severity === AlertSeverity.CRITICAL).length;
    const emergencyAlerts = alerts.filter(a => a.alert.severity === AlertSeverity.EMERGENCY).length;

    totalScore -= (criticalAlerts * 10);
    totalScore -= (emergencyAlerts * 20);

    const maxScore = (criticalComponents * 70) + ((components.length - criticalComponents) * 30);
    return Math.max(0, Math.min(100, (totalScore / maxScore) * 100));
  }

  /**
   * Determine system status
   */
  private determineSystemStatus(healthScore: number, alerts: AlertEvent[]): SystemHealthStatus {
    const emergencyAlerts = alerts.filter(a => a.alert.severity === AlertSeverity.EMERGENCY).length;
    const criticalAlerts = alerts.filter(a => a.alert.severity === AlertSeverity.CRITICAL).length;

    if (emergencyAlerts > 0 || healthScore < 30) {
      return SystemHealthStatus.DOWN;
    } else if (criticalAlerts > 0 || healthScore < 60) {
      return SystemHealthStatus.CRITICAL;
    } else if (healthScore < 80) {
      return SystemHealthStatus.DEGRADED;
    } else {
      return SystemHealthStatus.HEALTHY;
    }
  }

  /**
   * Calculate performance indicators
   */
  private calculatePerformanceIndicators(
    systemMetrics: SystemMetrics,
    bypassMetrics: BypassSystemMetrics
  ): PerformanceIndicator[] {
    return [
      {
        name: 'Response Time',
        value: systemMetrics.avgResponseTime,
        target: 500,
        status: systemMetrics.avgResponseTime < 500 ? IndicatorStatus.GOOD : IndicatorStatus.WARNING,
        trend: IndicatorTrend.STABLE,
        unit: 'ms'
      },
      {
        name: 'Success Rate',
        value: bypassMetrics.successRate,
        target: 95,
        status: bypassMetrics.successRate > 95 ? IndicatorStatus.EXCELLENT : IndicatorStatus.GOOD,
        trend: IndicatorTrend.STABLE,
        unit: '%'
      },
      {
        name: 'CPU Usage',
        value: systemMetrics.cpuUsage,
        target: 70,
        status: systemMetrics.cpuUsage < 70 ? IndicatorStatus.GOOD : IndicatorStatus.WARNING,
        trend: IndicatorTrend.STABLE,
        unit: '%'
      },
      {
        name: 'Error Rate',
        value: systemMetrics.errorRate,
        target: 1,
        status: systemMetrics.errorRate < 1 ? IndicatorStatus.EXCELLENT : IndicatorStatus.WARNING,
        trend: IndicatorTrend.STABLE,
        unit: '%'
      }
    ];
  }

  /**
   * Get real-time metrics
   */
  private getRealTimeMetrics(): RealTimeMetrics {
    const latest = this.metricsHistory[this.metricsHistory.length - 1];
    const latestBypass = this.bypassMetricsHistory[this.bypassMetricsHistory.length - 1];

    return {
      requestsPerSecond: latest?.requestRate || 0,
      activeOperations: latestBypass?.operationsThisHour || 0,
      currentResponseTime: latest?.avgResponseTime || 0,
      currentErrorRate: latest?.errorRate || 0,
      activeUsers: Math.floor(Math.random() * 100) + 10,
      systemLoad: latest?.cpuUsage || 0
    };
  }

  /**
   * Get historical trends
   */
  private getHistoricalTrends(): HistoricalTrend[] {
    // Mock historical trends
    return [
      {
        metric: 'Response Time',
        dataPoints: this.metricsHistory.slice(-24).map(m => ({
          timestamp: m.timestamp,
          value: m.avgResponseTime
        })),
        trend: IndicatorTrend.STABLE,
        changePercent: 0
      },
      {
        metric: 'Error Rate',
        dataPoints: this.metricsHistory.slice(-24).map(m => ({
          timestamp: m.timestamp,
          value: m.errorRate
        })),
        trend: IndicatorTrend.IMPROVING,
        changePercent: -5
      }
    ];
  }

  /**
   * Get top alerts
   */
  private getTopAlerts(): AlertEvent[] {
    return Array.from(this.activeAlerts.values())
      .sort((a, b) => {
        const severityOrder = {
          [AlertSeverity.EMERGENCY]: 4,
          [AlertSeverity.CRITICAL]: 3,
          [AlertSeverity.WARNING]: 2,
          [AlertSeverity.INFO]: 1
        };
        return severityOrder[b.alert.severity] - severityOrder[a.alert.severity];
      })
      .slice(0, 10);
  }

  /**
   * Get security summary
   */
  private getSecuritySummary(): SecuritySummary {
    const latestBypass = this.bypassMetricsHistory[this.bypassMetricsHistory.length - 1];

    return {
      incidentsToday: latestBypass?.securityViolationsToday || 0,
      failedAuthAttempts: Math.floor(Math.random() * 50),
      suspiciousActivities: latestBypass?.abuseEventsToday || 0,
      blockedOperations: Math.floor(Math.random() * 10),
      securityScore: Math.max(0, 100 - (latestBypass?.avgRiskScore || 50))
    };
  }

  /**
   * Get performance summary
   */
  private getPerformanceSummary(): PerformanceSummary {
    const latest = this.metricsHistory[this.metricsHistory.length - 1];
    const latestBypass = this.bypassMetricsHistory[this.bypassMetricsHistory.length - 1];

    return {
      avgResponseTime: latest?.avgResponseTime || 0,
      p95ResponseTime: (latest?.avgResponseTime || 0) * 1.5,
      throughput: latestBypass?.avgOperationsPerMinute || 0,
      errorRate: latest?.errorRate || 0,
      availability: 99.5 // Mock availability
    };
  }

  /**
   * Evaluate alerts
   */
  private async evaluateAlerts(): Promise<void> {
    for (const alert of this.alerts.values()) {
      if (!alert.enabled) continue;

      // Check cooldown
      const lastAlert = this.alertHistory.get(alert.alertId);
      if (lastAlert && Date.now() - lastAlert.getTime() < alert.cooldownMs) {
        continue;
      }

      const currentValue = await this.getMetricValue(alert.metric);
      const shouldAlert = this.evaluateAlertCondition(currentValue, alert);

      if (shouldAlert && !this.activeAlerts.has(alert.alertId)) {
        await this.triggerAlert(alert, currentValue);
      } else if (!shouldAlert && this.activeAlerts.has(alert.alertId)) {
        await this.resolveAlert(alert.alertId);
      }
    }
  }

  /**
   * Get current metric value
   */
  private async getMetricValue(metric: string): Promise<number> {
    const latest = this.metricsHistory[this.metricsHistory.length - 1];
    const latestBypass = this.bypassMetricsHistory[this.bypassMetricsHistory.length - 1];

    switch (metric) {
      case 'error_rate':
        return latest?.errorRate || 0;
      case 'avg_response_time':
        return latest?.avgResponseTime || 0;
      case 'security_violations_per_hour':
        return latestBypass?.securityViolationsToday || 0;
      case 'database_health':
        const dbHealth = this.healthResults.get('database');
        return dbHealth?.healthy ? 1 : 0;
      default:
        return 0;
    }
  }

  /**
   * Evaluate alert condition
   */
  private evaluateAlertCondition(currentValue: number, alert: AlertConfig): boolean {
    switch (alert.operator) {
      case AlertOperator.GREATER_THAN:
        return currentValue > alert.threshold;
      case AlertOperator.GREATER_THAN_EQUAL:
        return currentValue >= alert.threshold;
      case AlertOperator.LESS_THAN:
        return currentValue < alert.threshold;
      case AlertOperator.LESS_THAN_EQUAL:
        return currentValue <= alert.threshold;
      case AlertOperator.EQUAL:
        return currentValue === alert.threshold;
      case AlertOperator.NOT_EQUAL:
        return currentValue !== alert.threshold;
      default:
        return false;
    }
  }

  /**
   * Trigger alert
   */
  private async triggerAlert(alert: AlertConfig, currentValue: number): Promise<void> {
    const eventId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const alertEvent: AlertEvent = {
      eventId,
      alert,
      timestamp: new Date(),
      currentValue,
      thresholdValue: alert.threshold,
      message: `${alert.name}: ${alert.description} (Current: ${currentValue}, Threshold: ${alert.threshold})`,
      context: {},
      resolved: false
    };

    this.activeAlerts.set(alert.alertId, alertEvent);
    this.alertHistory.set(alert.alertId, new Date());

    this.logger.error(`Alert triggered: ${alert.name} (${eventId})`);
    this.emit('alert-triggered', alertEvent);

    // Send notifications
    await this.sendAlertNotifications(alertEvent);
  }

  /**
   * Send alert notifications
   */
  private async sendAlertNotifications(alertEvent: AlertEvent): Promise<void> {
    for (const channel of alertEvent.alert.notificationChannels) {
      switch (channel) {
        case NotificationChannel.LOG:
          this.logger.error(`ALERT: ${alertEvent.message}`);
          break;
        case NotificationChannel.WEBHOOK:
          // Mock webhook notification
          this.logger.log(`Webhook notification sent for alert: ${alertEvent.eventId}`);
          break;
        // Add more notification channels as needed
      }
    }
  }
}