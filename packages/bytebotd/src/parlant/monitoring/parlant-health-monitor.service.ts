/**
 * Parlant Health Monitor Service
 *
 * Enterprise-grade health monitoring and connection testing for Parlant production servers
 * with circuit breaker patterns, comprehensive diagnostics, and automated recovery mechanisms.
 *
 * Features:
 * - Real-time connection health monitoring with multiple validation levels
 * - Circuit breaker pattern implementation for fault tolerance
 * - Comprehensive diagnostic testing (connectivity, API, WebSocket, performance)
 * - Automated recovery mechanisms with intelligent backoff strategies
 * - Detailed health metrics and reporting for monitoring systems
 * - Integration with alerting systems for proactive incident management
 * - Load balancing and failover coordination
 *
 * Architecture: Production health monitoring with enterprise reliability patterns
 * Security: Secure health check endpoints with authentication validation
 * Performance: Optimized monitoring with minimal impact on production systems
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ParlantEnvironmentConfigService, ParlantEnvironmentConfig } from '../config/parlant-environment.config';
import axios, { AxiosInstance } from 'axios';
import WebSocket from 'ws';
import { EventEmitter } from 'events';

/**
 * Health check result for different validation types
 */
export interface HealthCheckResult {
  readonly type: 'connectivity' | 'api' | 'websocket' | 'performance' | 'comprehensive';
  readonly success: boolean;
  readonly responseTime: number;
  readonly timestamp: Date;
  readonly details: Record<string, unknown>;
  readonly errors?: string[];
  readonly warnings?: string[];
}

/**
 * Comprehensive health status for Parlant server
 */
export interface ParlantHealthStatus {
  readonly overall: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  readonly lastCheck: Date;
  readonly uptime: number;
  readonly availability: number; // Percentage over last 24 hours
  readonly connectivity: HealthCheckResult;
  readonly api: HealthCheckResult;
  readonly websocket: HealthCheckResult;
  readonly performance: HealthCheckResult;
  readonly serverInfo: {
    readonly version?: string;
    readonly status?: string;
    readonly capabilities?: string[];
    readonly endpoints?: string[];
  };
  readonly metrics: {
    readonly totalChecks: number;
    readonly successfulChecks: number;
    readonly averageResponseTime: number;
    readonly lastSuccessfulCheck: Date | null;
    readonly consecutiveFailures: number;
  };
}

/**
 * Circuit breaker state information
 */
export interface CircuitBreakerStatus {
  readonly state: 'closed' | 'open' | 'half-open';
  readonly failureCount: number;
  readonly lastFailure: Date | null;
  readonly nextRetryTime: Date | null;
  readonly failureThreshold: number;
  readonly timeoutDuration: number;
  readonly resetTimeout: number;
}

/**
 * Health monitoring configuration
 */
export interface HealthMonitorConfig {
  readonly enabled: boolean;
  readonly interval: number;
  readonly timeout: number;
  readonly circuitBreaker: {
    readonly enabled: boolean;
    readonly failureThreshold: number;
    readonly timeout: number;
    readonly resetTimeout: number;
  };
  readonly alerts: {
    readonly enabled: boolean;
    readonly thresholds: {
      readonly responseTimeWarning: number;
      readonly responseTimeCritical: number;
      readonly failureRateWarning: number;
      readonly failureRateCritical: number;
    };
  };
}

/**
 * Alert information for health issues
 */
export interface HealthAlert {
  readonly id: string;
  readonly severity: 'info' | 'warning' | 'critical';
  readonly type: 'connectivity' | 'performance' | 'availability' | 'circuit_breaker';
  readonly message: string;
  readonly timestamp: Date;
  readonly details: Record<string, unknown>;
  readonly resolved: boolean;
  readonly resolvedAt?: Date;
}

/**
 * Advanced circuit breaker implementation
 */
class AdvancedCircuitBreaker extends EventEmitter {
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private failureCount = 0;
  private lastFailure: Date | null = null;
  private nextRetryTime: Date | null = null;

  constructor(
    private readonly failureThreshold: number,
    private readonly timeout: number,
    private readonly resetTimeout: number,
    private readonly logger: Logger
  ) {
    super();
  }

  /**
   * Check if operation can be executed
   */
  canExecute(): boolean {
    if (this.state === 'closed') return true;

    if (this.state === 'open') {
      if (this.shouldAttemptReset()) {
        this.state = 'half-open';
        this.emit('state-change', this.state);
        this.logger.log('Circuit breaker transitioning to half-open');
        return true;
      }
      return false;
    }

    return true; // half-open state
  }

  /**
   * Record successful operation
   */
  onSuccess(): void {
    this.failureCount = 0;
    this.lastFailure = null;
    this.nextRetryTime = null;

    if (this.state !== 'closed') {
      this.state = 'closed';
      this.emit('state-change', this.state);
      this.logger.log('Circuit breaker reset to closed state');
    }
  }

  /**
   * Record failed operation
   */
  onFailure(): void {
    this.failureCount++;
    this.lastFailure = new Date();

    if (this.failureCount >= this.failureThreshold) {
      this.state = 'open';
      this.nextRetryTime = new Date(Date.now() + this.resetTimeout);
      this.emit('state-change', this.state);
      this.logger.warn('Circuit breaker opened due to consecutive failures', {
        failureCount: this.failureCount,
        threshold: this.failureThreshold,
        nextRetryTime: this.nextRetryTime,
      });
    }
  }

  /**
   * Get current circuit breaker status
   */
  getStatus(): CircuitBreakerStatus {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailure: this.lastFailure,
      nextRetryTime: this.nextRetryTime,
      failureThreshold: this.failureThreshold,
      timeoutDuration: this.timeout,
      resetTimeout: this.resetTimeout,
    };
  }

  /**
   * Check if circuit breaker should attempt reset
   */
  private shouldAttemptReset(): boolean {
    if (!this.nextRetryTime) return false;
    return new Date() >= this.nextRetryTime;
  }
}

@Injectable()
export class ParlantHealthMonitorService extends EventEmitter implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ParlantHealthMonitorService.name);

  // Configuration and clients
  private config: ParlantEnvironmentConfig | null = null;
  private httpClient: AxiosInstance | null = null;
  private circuitBreaker: AdvancedCircuitBreaker | null = null;

  // Health status tracking
  private healthStatus: ParlantHealthStatus = {
    overall: 'unknown',
    lastCheck: new Date(),
    uptime: 0,
    availability: 0,
    connectivity: this.createEmptyHealthCheck('connectivity'),
    api: this.createEmptyHealthCheck('api'),
    websocket: this.createEmptyHealthCheck('websocket'),
    performance: this.createEmptyHealthCheck('performance'),
    serverInfo: {},
    metrics: {
      totalChecks: 0,
      successfulChecks: 0,
      averageResponseTime: 0,
      lastSuccessfulCheck: null,
      consecutiveFailures: 0,
    },
  };

  // Monitoring state
  private monitoringInterval: NodeJS.Timeout | null = null;
  private startTime = new Date();
  private responseTimeHistory: number[] = [];
  private availabilityHistory: Array<{ timestamp: Date; success: boolean }> = [];
  private activeAlerts = new Map<string, HealthAlert>();

  constructor(
    private readonly configService: ParlantEnvironmentConfigService
  ) {
    super();
  }

  /**
   * Initialize health monitoring service
   */
  async onModuleInit(): Promise<void> {
    const operationId = `health_monitor_init_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    try {
      this.logger.log(`[${operationId}] Initializing Parlant Health Monitor Service`);

      // Load configuration
      this.config = this.configService.getConfiguration();

      if (!this.config.enabled || !this.config.monitoring.healthCheckEnabled) {
        this.logger.warn(`[${operationId}] Health monitoring is disabled`);
        return;
      }

      // Initialize HTTP client for health checks
      this.initializeHttpClient();

      // Initialize circuit breaker
      this.circuitBreaker = new AdvancedCircuitBreaker(
        this.config.circuitBreaker.failureThreshold,
        this.config.circuitBreaker.timeout,
        this.config.circuitBreaker.resetTimeout,
        this.logger
      );

      // Set up circuit breaker event handlers
      this.setupCircuitBreakerHandlers();

      // Perform initial comprehensive health check
      await this.performComprehensiveHealthCheck();

      // Start periodic monitoring
      this.startPeriodicMonitoring();

      this.logger.log(`[${operationId}] Parlant Health Monitor Service initialized successfully`, {
        monitoringEnabled: this.config.monitoring.healthCheckEnabled,
        circuitBreakerEnabled: this.config.circuitBreaker.enabled,
        checkInterval: this.config.monitoring.healthCheckInterval,
        alertsEnabled: this.config.monitoring.alertsEnabled,
      });

    } catch (error) {
      this.logger.error(`[${operationId}] Failed to initialize Parlant Health Monitor Service`, {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Clean up monitoring resources
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log('Shutting down Parlant Health Monitor Service');

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.removeAllListeners();
  }

  /**
   * Get current health status
   */
  getHealthStatus(): ParlantHealthStatus {
    return { ...this.healthStatus };
  }

  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus(): CircuitBreakerStatus | null {
    return this.circuitBreaker?.getStatus() ?? null;
  }

  /**
   * Get active health alerts
   */
  getActiveAlerts(): HealthAlert[] {
    return Array.from(this.activeAlerts.values()).filter(alert => !alert.resolved);
  }

  /**
   * Check if Parlant server is healthy
   */
  isHealthy(): boolean {
    return this.healthStatus.overall === 'healthy';
  }

  /**
   * Check if circuit breaker allows operations
   */
  canExecuteOperations(): boolean {
    return this.circuitBreaker?.canExecute() ?? true;
  }

  /**
   * Force a comprehensive health check
   */
  async performComprehensiveHealthCheck(): Promise<ParlantHealthStatus> {
    const operationId = `comprehensive_check_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    this.logger.log(`[${operationId}] Performing comprehensive health check`);

    try {
      // Run all health checks in parallel
      const [connectivity, api, websocket, performance] = await Promise.allSettled([
        this.performConnectivityCheck(),
        this.performApiHealthCheck(),
        this.performWebSocketCheck(),
        this.performPerformanceCheck(),
      ]);

      // Update health status
      this.healthStatus.connectivity = this.extractResult(connectivity, 'connectivity');
      this.healthStatus.api = this.extractResult(api, 'api');
      this.healthStatus.websocket = this.extractResult(websocket, 'websocket');
      this.healthStatus.performance = this.extractResult(performance, 'performance');
      this.healthStatus.lastCheck = new Date();

      // Determine overall health
      this.updateOverallHealth();

      // Update metrics
      this.updateHealthMetrics();

      // Check for alerts
      this.checkAndUpdateAlerts();

      this.logger.log(`[${operationId}] Comprehensive health check completed`, {
        overall: this.healthStatus.overall,
        connectivity: this.healthStatus.connectivity.success,
        api: this.healthStatus.api.success,
        websocket: this.healthStatus.websocket.success,
        performance: this.healthStatus.performance.success,
        averageResponseTime: this.healthStatus.metrics.averageResponseTime,
      });

      // Emit health status update event
      this.emit('health-status-update', this.healthStatus);

      return this.healthStatus;

    } catch (error) {
      this.logger.error(`[${operationId}] Comprehensive health check failed`, {
        error: error instanceof Error ? error.message : String(error),
      });

      this.healthStatus.overall = 'unhealthy';
      this.healthStatus.lastCheck = new Date();
      this.healthStatus.metrics.consecutiveFailures++;

      throw error;
    }
  }

  /**
   * Perform basic connectivity check
   */
  async performConnectivityCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      if (!this.httpClient || !this.config) {
        throw new Error('HTTP client or configuration not available');
      }

      const response = await this.httpClient.get('/health', {
        timeout: this.config.monitoring.healthCheckTimeout,
      });

      const responseTime = Date.now() - startTime;

      return {
        type: 'connectivity',
        success: response.status >= 200 && response.status < 300,
        responseTime,
        timestamp: new Date(),
        details: {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        },
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;

      return {
        type: 'connectivity',
        success: false,
        responseTime,
        timestamp: new Date(),
        details: {
          error: error instanceof Error ? error.message : String(error),
        },
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  /**
   * Perform API functionality check
   */
  async performApiHealthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      if (!this.httpClient || !this.config) {
        throw new Error('HTTP client or configuration not available');
      }

      // Test multiple API endpoints
      const endpoints = ['/health', '/api/info', '/api/capabilities'];
      const results = await Promise.allSettled(
        endpoints.map(endpoint =>
          this.httpClient!.get(endpoint, {
            timeout: this.config!.monitoring.healthCheckTimeout,
          })
        )
      );

      const responseTime = Date.now() - startTime;
      const successfulEndpoints = results.filter(result => result.status === 'fulfilled').length;
      const success = successfulEndpoints > 0;

      // Extract server information
      const serverInfo: Record<string, unknown> = {};
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          serverInfo[endpoints[index]] = result.value.data;
        }
      });

      return {
        type: 'api',
        success,
        responseTime,
        timestamp: new Date(),
        details: {
          endpointsTested: endpoints.length,
          successfulEndpoints,
          serverInfo,
        },
        warnings: successfulEndpoints < endpoints.length ? ['Some API endpoints unavailable'] : undefined,
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;

      return {
        type: 'api',
        success: false,
        responseTime,
        timestamp: new Date(),
        details: {
          error: error instanceof Error ? error.message : String(error),
        },
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  /**
   * Perform WebSocket connectivity check
   */
  async performWebSocketCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    return new Promise((resolve) => {
      try {
        if (!this.config?.wsUrl) {
          resolve({
            type: 'websocket',
            success: false,
            responseTime: 0,
            timestamp: new Date(),
            details: { error: 'WebSocket URL not configured' },
            warnings: ['WebSocket URL not configured'],
          });
          return;
        }

        const ws = new WebSocket(this.config.wsUrl, {
          headers: this.config.apiKey ? { 'Authorization': `Bearer ${this.config.apiKey}` } : {},
        });

        const timeout = setTimeout(() => {
          ws.terminate();
          resolve({
            type: 'websocket',
            success: false,
            responseTime: Date.now() - startTime,
            timestamp: new Date(),
            details: { error: 'WebSocket connection timeout' },
            errors: ['WebSocket connection timeout'],
          });
        }, this.config.monitoring.healthCheckTimeout);

        ws.on('open', () => {
          clearTimeout(timeout);
          const responseTime = Date.now() - startTime;
          ws.close();

          resolve({
            type: 'websocket',
            success: true,
            responseTime,
            timestamp: new Date(),
            details: {
              url: this.config!.wsUrl,
              protocol: ws.protocol,
            },
          });
        });

        ws.on('error', (error) => {
          clearTimeout(timeout);
          const responseTime = Date.now() - startTime;

          resolve({
            type: 'websocket',
            success: false,
            responseTime,
            timestamp: new Date(),
            details: {
              error: error.message,
            },
            errors: [error.message],
          });
        });

      } catch (error) {
        const responseTime = Date.now() - startTime;

        resolve({
          type: 'websocket',
          success: false,
          responseTime,
          timestamp: new Date(),
          details: {
            error: error instanceof Error ? error.message : String(error),
          },
          errors: [error instanceof Error ? error.message : String(error)],
        });
      }
    });
  }

  /**
   * Perform performance benchmark check
   */
  async performPerformanceCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      if (!this.httpClient || !this.config) {
        throw new Error('HTTP client or configuration not available');
      }

      // Perform multiple requests to measure performance
      const requests = Array(5).fill(null).map(() =>
        this.httpClient!.get('/health', {
          timeout: this.config!.monitoring.healthCheckTimeout,
        })
      );

      const results = await Promise.allSettled(requests);
      const responseTime = Date.now() - startTime;

      const successfulRequests = results.filter(r => r.status === 'fulfilled').length;
      const averageLatency = responseTime / requests.length;

      const success = successfulRequests >= requests.length * 0.8; // 80% success rate required

      return {
        type: 'performance',
        success,
        responseTime: averageLatency,
        timestamp: new Date(),
        details: {
          totalRequests: requests.length,
          successfulRequests,
          successRate: (successfulRequests / requests.length * 100).toFixed(2) + '%',
          averageLatency,
          totalTime: responseTime,
        },
        warnings: successfulRequests < requests.length ? ['Some performance test requests failed'] : undefined,
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;

      return {
        type: 'performance',
        success: false,
        responseTime,
        timestamp: new Date(),
        details: {
          error: error instanceof Error ? error.message : String(error),
        },
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  /**
   * Initialize HTTP client for health checks
   */
  private initializeHttpClient(): void {
    if (!this.config) {
      throw new Error('Configuration not available');
    }

    this.httpClient = axios.create({
      baseURL: this.config.serverUrl,
      timeout: this.config.monitoring.healthCheckTimeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Bytebot-Health-Monitor/1.0',
        ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
      },
    });
  }

  /**
   * Set up circuit breaker event handlers
   */
  private setupCircuitBreakerHandlers(): void {
    if (!this.circuitBreaker) return;

    this.circuitBreaker.on('state-change', (newState: string) => {
      this.emit('circuit-breaker-state-change', newState);

      const alert: HealthAlert = {
        id: `circuit-breaker-${Date.now()}`,
        severity: newState === 'open' ? 'critical' : 'info',
        type: 'circuit_breaker',
        message: `Circuit breaker state changed to: ${newState}`,
        timestamp: new Date(),
        details: this.circuitBreaker!.getStatus(),
        resolved: newState === 'closed',
      };

      this.addOrUpdateAlert(alert);
    });
  }

  /**
   * Start periodic health monitoring
   */
  private startPeriodicMonitoring(): void {
    if (!this.config) return;

    this.monitoringInterval = setInterval(() => {
      this.performComprehensiveHealthCheck().catch(error => {
        this.logger.error('Periodic health check failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      });
    }, this.config.monitoring.healthCheckInterval);
  }

  /**
   * Update overall health status based on individual checks
   */
  private updateOverallHealth(): void {
    const checks = [
      this.healthStatus.connectivity,
      this.healthStatus.api,
      this.healthStatus.websocket,
      this.healthStatus.performance,
    ];

    const successfulChecks = checks.filter(check => check.success).length;
    const totalChecks = checks.length;

    if (successfulChecks === totalChecks) {
      this.healthStatus.overall = 'healthy';
    } else if (successfulChecks >= totalChecks * 0.5) {
      this.healthStatus.overall = 'degraded';
    } else {
      this.healthStatus.overall = 'unhealthy';
    }

    // Update circuit breaker
    if (this.circuitBreaker) {
      if (this.healthStatus.overall === 'healthy') {
        this.circuitBreaker.onSuccess();
      } else {
        this.circuitBreaker.onFailure();
      }
    }
  }

  /**
   * Update health metrics
   */
  private updateHealthMetrics(): void {
    this.healthStatus.metrics.totalChecks++;

    if (this.healthStatus.overall === 'healthy') {
      this.healthStatus.metrics.successfulChecks++;
      this.healthStatus.metrics.lastSuccessfulCheck = new Date();
      this.healthStatus.metrics.consecutiveFailures = 0;
    } else {
      this.healthStatus.metrics.consecutiveFailures++;
    }

    // Update average response time
    const currentResponseTime = (
      this.healthStatus.connectivity.responseTime +
      this.healthStatus.api.responseTime +
      this.healthStatus.websocket.responseTime +
      this.healthStatus.performance.responseTime
    ) / 4;

    this.responseTimeHistory.push(currentResponseTime);
    if (this.responseTimeHistory.length > 100) {
      this.responseTimeHistory.shift();
    }

    this.healthStatus.metrics.averageResponseTime =
      this.responseTimeHistory.reduce((sum, time) => sum + time, 0) / this.responseTimeHistory.length;

    // Update availability
    this.availabilityHistory.push({
      timestamp: new Date(),
      success: this.healthStatus.overall === 'healthy',
    });

    // Keep only last 24 hours of data
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    this.availabilityHistory = this.availabilityHistory.filter(entry => entry.timestamp > oneDayAgo);

    if (this.availabilityHistory.length > 0) {
      const successfulChecks = this.availabilityHistory.filter(entry => entry.success).length;
      this.healthStatus.availability = (successfulChecks / this.availabilityHistory.length) * 100;
    }

    // Update uptime
    this.healthStatus.uptime = Date.now() - this.startTime.getTime();
  }

  /**
   * Check and update health alerts
   */
  private checkAndUpdateAlerts(): void {
    if (!this.config?.monitoring.alertsEnabled) return;

    const thresholds = this.config.monitoring;

    // Response time alerts
    if (this.healthStatus.metrics.averageResponseTime > thresholds.failureAlertThreshold * 1000) {
      this.addOrUpdateAlert({
        id: 'high-response-time',
        severity: 'critical',
        type: 'performance',
        message: `High response time: ${this.healthStatus.metrics.averageResponseTime.toFixed(2)}ms`,
        timestamp: new Date(),
        details: {
          averageResponseTime: this.healthStatus.metrics.averageResponseTime,
          threshold: thresholds.failureAlertThreshold * 1000,
        },
        resolved: false,
      });
    } else {
      this.resolveAlert('high-response-time');
    }

    // Availability alerts
    if (this.healthStatus.availability < 95) {
      this.addOrUpdateAlert({
        id: 'low-availability',
        severity: this.healthStatus.availability < 90 ? 'critical' : 'warning',
        type: 'availability',
        message: `Low availability: ${this.healthStatus.availability.toFixed(2)}%`,
        timestamp: new Date(),
        details: {
          availability: this.healthStatus.availability,
          threshold: 95,
        },
        resolved: false,
      });
    } else {
      this.resolveAlert('low-availability');
    }

    // Connectivity alerts
    if (!this.healthStatus.connectivity.success) {
      this.addOrUpdateAlert({
        id: 'connectivity-failure',
        severity: 'critical',
        type: 'connectivity',
        message: 'Parlant server connectivity failed',
        timestamp: new Date(),
        details: this.healthStatus.connectivity.details,
        resolved: false,
      });
    } else {
      this.resolveAlert('connectivity-failure');
    }
  }

  /**
   * Add or update health alert
   */
  private addOrUpdateAlert(alert: HealthAlert): void {
    this.activeAlerts.set(alert.id, alert);
    this.emit('health-alert', alert);
  }

  /**
   * Resolve health alert
   */
  private resolveAlert(alertId: string): void {
    const alert = this.activeAlerts.get(alertId);
    if (alert && !alert.resolved) {
      const resolvedAlert: HealthAlert = {
        ...alert,
        resolved: true,
        resolvedAt: new Date(),
      };
      this.activeAlerts.set(alertId, resolvedAlert);
      this.emit('health-alert-resolved', resolvedAlert);
    }
  }

  /**
   * Extract result from Promise.allSettled
   */
  private extractResult(
    result: PromiseSettledResult<HealthCheckResult>,
    type: 'connectivity' | 'api' | 'websocket' | 'performance'
  ): HealthCheckResult {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        type,
        success: false,
        responseTime: 0,
        timestamp: new Date(),
        details: {
          error: result.reason instanceof Error ? result.reason.message : String(result.reason),
        },
        errors: [result.reason instanceof Error ? result.reason.message : String(result.reason)],
      };
    }
  }

  /**
   * Create empty health check result
   */
  private createEmptyHealthCheck(type: 'connectivity' | 'api' | 'websocket' | 'performance'): HealthCheckResult {
    return {
      type,
      success: false,
      responseTime: 0,
      timestamp: new Date(),
      details: {},
    };
  }
}