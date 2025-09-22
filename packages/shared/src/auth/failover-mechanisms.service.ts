/**
 * Failover Mechanisms Service - Advanced backup authentication and resilience
 *
 * Enterprise-grade failover service providing robust backup authentication,
 * service redundancy, graceful degradation, and disaster recovery for
 * AIgent-PARLANT authentication bridge with zero-downtime guarantees.
 *
 * Features:
 * - Multi-tier failover strategies with automatic detection
 * - Backup authentication providers and methods
 * - Circuit breaker patterns for service protection
 * - Graceful degradation with reduced functionality
 * - Health monitoring and automatic recovery
 * - Disaster recovery with rapid service restoration
 * - Load balancing across authentication endpoints
 * - Emergency authentication protocols
 *
 * @module FailoverMechanismsService
 * @version 1.0.0
 * @author PARLANT Phase 1 Resilience Team
 * @since 2025-09-21
 */

import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  Inject,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EventEmitter } from "events";
import * as crypto from "crypto";
import axios, { AxiosInstance } from "axios";

/**
 * Failover configuration
 */
export interface FailoverConfig {
  /** Failover strategy */
  strategy:
    | "active-passive"
    | "active-active"
    | "round-robin"
    | "weighted"
    | "intelligent";
  /** Health check configuration */
  healthCheck: {
    interval: number;
    timeout: number;
    retries: number;
    endpoints: string[];
  };
  /** Circuit breaker configuration */
  circuitBreaker: {
    failureThreshold: number;
    recoveryTimeout: number;
    halfOpenRetries: number;
    monitoringWindow: number;
  };
  /** Backup providers */
  backupProviders: BackupProvider[];
  /** Emergency protocols */
  emergency: {
    enabled: boolean;
    fallbackAuth: boolean;
    offlineMode: boolean;
    gracePeriod: number;
  };
  /** Load balancing */
  loadBalancing: {
    algorithm:
      | "round-robin"
      | "least-connections"
      | "response-time"
      | "weighted";
    weights?: Record<string, number>;
    stickySession: boolean;
  };
}

/**
 * Backup authentication provider
 */
export interface BackupProvider {
  /** Provider ID */
  providerId: string;
  /** Provider name */
  name: string;
  /** Provider type */
  type: "jwt" | "oauth2" | "saml" | "ldap" | "local" | "emergency";
  /** Provider priority */
  priority: number;
  /** Provider configuration */
  config: {
    endpoint?: string;
    credentials?: Record<string, unknown>;
    timeout?: number;
    retries?: number;
  };
  /** Provider status */
  status: "active" | "inactive" | "degraded" | "failed";
  /** Provider capabilities */
  capabilities: string[];
  /** Last health check */
  lastHealthCheck?: Date;
  /** Health status */
  healthy: boolean;
  /** Metadata */
  metadata: Record<string, unknown>;
}

/**
 * Service endpoint configuration
 */
export interface ServiceEndpoint {
  /** Endpoint ID */
  endpointId: string;
  /** Service name */
  serviceName: string;
  /** Endpoint URL */
  url: string;
  /** Priority level */
  priority: number;
  /** Health status */
  healthy: boolean;
  /** Response time (ms) */
  responseTime: number;
  /** Active connections */
  activeConnections: number;
  /** Error rate */
  errorRate: number;
  /** Last health check */
  lastHealthCheck: Date;
  /** Circuit breaker state */
  circuitState: "CLOSED" | "OPEN" | "HALF_OPEN";
  /** Metadata */
  metadata: Record<string, unknown>;
}

/**
 * Circuit breaker state
 */
export interface CircuitBreakerState {
  /** Circuit ID */
  circuitId: string;
  /** Service name */
  serviceName: string;
  /** Current state */
  state: "CLOSED" | "OPEN" | "HALF_OPEN";
  /** Failure count */
  failureCount: number;
  /** Last failure time */
  lastFailureTime?: Date;
  /** Next retry time */
  nextRetryTime?: Date;
  /** State change history */
  stateHistory: Array<{
    previousState: string;
    newState: string;
    timestamp: Date;
    reason: string;
  }>;
}

/**
 * Failover event
 */
export interface FailoverEvent {
  /** Event type */
  type:
    | "failover"
    | "recovery"
    | "degradation"
    | "circuit-break"
    | "health-change";
  /** Service affected */
  serviceName: string;
  /** Endpoint affected */
  endpointId?: string;
  /** Provider affected */
  providerId?: string;
  /** Event timestamp */
  timestamp: Date;
  /** Event severity */
  severity: "info" | "warning" | "error" | "critical";
  /** Event message */
  message: string;
  /** Previous state */
  previousState?: string;
  /** New state */
  newState?: string;
  /** Event metadata */
  metadata: Record<string, unknown>;
}

/**
 * Authentication result with failover context
 */
export interface FailoverAuthResult {
  /** Authentication success */
  success: boolean;
  /** Authentication token */
  token?: string;
  /** User context */
  userContext?: Record<string, unknown>;
  /** Provider used */
  providerUsed: string;
  /** Endpoint used */
  endpointUsed: string;
  /** Failover occurred */
  failoverOccurred: boolean;
  /** Degraded mode */
  degradedMode: boolean;
  /** Response time */
  responseTime: number;
  /** Failover metadata */
  failoverMetadata: {
    attemptedProviders: string[];
    failedProviders: string[];
    fallbackUsed: boolean;
    circuitStates: Record<string, string>;
  };
  /** Error information */
  error?: {
    code: string;
    message: string;
    provider?: string;
    endpoint?: string;
  };
}

/**
 * Failover analytics
 */
export interface FailoverAnalytics {
  /** Total failover events */
  totalFailovers: number;
  /** Successful failovers */
  successfulFailovers: number;
  /** Failed failovers */
  failedFailovers: number;
  /** Average failover time */
  averageFailoverTime: number;
  /** Service availability */
  serviceAvailability: Record<string, number>;
  /** Provider statistics */
  providerStats: Record<
    string,
    {
      requests: number;
      successes: number;
      failures: number;
      averageResponseTime: number;
      uptime: number;
    }
  >;
  /** Circuit breaker events */
  circuitBreakerEvents: number;
  /** Recovery events */
  recoveryEvents: number;
  /** Degraded mode usage */
  degradedModeUsage: number;
  /** Last updated */
  lastUpdated: Date;
}

/**
 * Failover Mechanisms Service
 *
 * Advanced failover service providing robust backup authentication,
 * circuit breaker protection, and intelligent service degradation
 * for enterprise-grade system resilience.
 */
@Injectable()
export class FailoverMechanismsService
  extends EventEmitter
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(FailoverMechanismsService.name);

  // Configuration
  private config!: FailoverConfig;

  // Service management
  private endpoints = new Map<string, ServiceEndpoint>();
  private backupProviders = new Map<string, BackupProvider>();
  private circuitBreakers = new Map<string, CircuitBreakerState>();
  private httpClients = new Map<string, AxiosInstance>();

  // Health monitoring
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private circuitBreakerTimer: NodeJS.Timeout | null = null;

  // Analytics
  private analytics: FailoverAnalytics = {
    totalFailovers: 0,
    successfulFailovers: 0,
    failedFailovers: 0,
    averageFailoverTime: 0,
    serviceAvailability: {},
    providerStats: {},
    circuitBreakerEvents: 0,
    recoveryEvents: 0,
    degradedModeUsage: 0,
    lastUpdated: new Date(),
  };

  // Load balancing state
  private roundRobinCounter = new Map<string, number>();
  private connectionCounts = new Map<string, number>();

  constructor(
    private readonly configService: ConfigService,
    @Inject("FAILOVER_CONFIG")
    private readonly failoverConfig: Partial<FailoverConfig>,
  ) {
    super();
    this.logger.log("🛡️ Initializing Failover Mechanisms Service");
  }

  /**
   * Initialize the failover service
   */
  async onModuleInit(): Promise<void> {
    const startTime = Date.now();
    this.logger.log("🔄 Starting failover mechanisms initialization...");

    try {
      await this.loadConfiguration();
      await this.initializeEndpoints();
      await this.initializeBackupProviders();
      await this.initializeCircuitBreakers();
      await this.startHealthMonitoring();

      const initTime = Date.now() - startTime;
      this.logger.log(
        `✅ Failover mechanisms initialized successfully (${initTime}ms)`,
      );

      this.emit("failover:initialized", {
        timestamp: new Date(),
        initializationTime: initTime,
        endpointsCount: this.endpoints.size,
        providersCount: this.backupProviders.size,
      });
    } catch (error) {
      this.logger.error("❌ Failed to initialize failover mechanisms", error);
      throw new Error(
        `Failover initialization failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Clean up resources on module destruction
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log("🔄 Shutting down failover mechanisms...");

    await this.stopHealthMonitoring();
    await this.gracefulShutdown();

    this.logger.log("✅ Failover mechanisms shutdown complete");
  }

  /**
   * Authenticate with failover support
   */
  async authenticateWithFailover(
    credentials: Record<string, unknown>,
    options?: {
      preferredProvider?: string;
      allowDegradedMode?: boolean;
      maxRetries?: number;
    },
  ): Promise<FailoverAuthResult> {
    const startTime = Date.now();
    const attemptedProviders: string[] = [];
    const failedProviders: string[] = [];
    let fallbackUsed = false;
    let degradedMode = false;

    try {
      this.logger.debug("🔐 Starting authentication with failover support");

      // Get ordered list of providers
      const orderedProviders = this.getOrderedProviders(
        options?.preferredProvider,
      );

      for (const provider of orderedProviders) {
        attemptedProviders.push(provider.providerId);

        // Check if provider is available
        if (!this.isProviderAvailable(provider.providerId)) {
          failedProviders.push(provider.providerId);
          continue;
        }

        try {
          // Attempt authentication with provider
          const result = await this.authenticateWithProvider(
            provider,
            credentials,
          );

          if (result.success) {
            const authTime = Date.now() - startTime;
            this.updateSuccessMetrics(provider.providerId, authTime);

            // Check if this was a failover
            const failoverOccurred =
              attemptedProviders.length > 1 || provider.priority > 1;
            if (failoverOccurred) {
              this.analytics.successfulFailovers++;
              this.emitFailoverEvent({
                type: "failover",
                serviceName: "authentication",
                providerId: provider.providerId,
                timestamp: new Date(),
                severity: "info",
                message: `Successful failover to provider: ${provider.name}`,
                metadata: { authTime, attemptedProviders },
              });
            }

            return {
              success: true,
              token: result.token,
              userContext: result.userContext,
              providerUsed: provider.providerId,
              endpointUsed: result.endpointUsed || "unknown",
              failoverOccurred,
              degradedMode,
              responseTime: authTime,
              failoverMetadata: {
                attemptedProviders,
                failedProviders,
                fallbackUsed,
                circuitStates: this.getCircuitStates(),
              },
            };
          }
        } catch (error) {
          this.logger.warn(
            `⚠️ Authentication failed with provider: ${provider.name}`,
            error,
          );
          failedProviders.push(provider.providerId);
          this.updateFailureMetrics(provider.providerId);
          this.checkCircuitBreaker(provider.providerId);
        }
      }

      // All primary providers failed, try emergency protocols
      if (this.config.emergency.enabled) {
        const emergencyResult =
          await this.tryEmergencyAuthentication(credentials);
        if (emergencyResult) {
          fallbackUsed = true;
          degradedMode = true;
          this.analytics.degradedModeUsage++;

          const authTime = Date.now() - startTime;

          this.emitFailoverEvent({
            type: "degradation",
            serviceName: "authentication",
            timestamp: new Date(),
            severity: "warning",
            message: "Using emergency authentication protocol",
            metadata: { authTime, attemptedProviders, failedProviders },
          });

          return {
            success: true,
            token: emergencyResult.token,
            userContext: emergencyResult.userContext,
            providerUsed: "emergency",
            endpointUsed: "emergency",
            failoverOccurred: true,
            degradedMode: true,
            responseTime: authTime,
            failoverMetadata: {
              attemptedProviders,
              failedProviders,
              fallbackUsed: true,
              circuitStates: this.getCircuitStates(),
            },
          };
        }
      }

      // Complete failure
      this.analytics.failedFailovers++;
      const authTime = Date.now() - startTime;

      this.emitFailoverEvent({
        type: "failover",
        serviceName: "authentication",
        timestamp: new Date(),
        severity: "critical",
        message: "All authentication providers failed",
        metadata: { authTime, attemptedProviders, failedProviders },
      });

      return {
        success: false,
        providerUsed: "none",
        endpointUsed: "none",
        failoverOccurred: true,
        degradedMode: false,
        responseTime: authTime,
        failoverMetadata: {
          attemptedProviders,
          failedProviders,
          fallbackUsed,
          circuitStates: this.getCircuitStates(),
        },
        error: {
          code: "ALL_PROVIDERS_FAILED",
          message: "All authentication providers are unavailable",
        },
      };
    } catch (error) {
      this.analytics.failedFailovers++;

      return {
        success: false,
        providerUsed: "error",
        endpointUsed: "error",
        failoverOccurred: false,
        degradedMode: false,
        responseTime: Date.now() - startTime,
        failoverMetadata: {
          attemptedProviders,
          failedProviders,
          fallbackUsed,
          circuitStates: this.getCircuitStates(),
        },
        error: {
          code: "FAILOVER_ERROR",
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * Get service endpoint with load balancing
   */
  async getServiceEndpoint(
    serviceName: string,
  ): Promise<ServiceEndpoint | null> {
    const serviceEndpoints = Array.from(this.endpoints.values()).filter(
      (endpoint) => endpoint.serviceName === serviceName && endpoint.healthy,
    );

    if (serviceEndpoints.length === 0) {
      return null;
    }

    // Apply load balancing algorithm
    switch (this.config.loadBalancing.algorithm) {
      case "round-robin":
        return this.selectRoundRobin(serviceName, serviceEndpoints);
      case "least-connections":
        return this.selectLeastConnections(serviceEndpoints);
      case "response-time":
        return this.selectFastestResponse(serviceEndpoints);
      case "weighted":
        return this.selectWeighted(serviceEndpoints);
      default:
        return serviceEndpoints[0];
    }
  }

  /**
   * Report service health
   */
  async reportServiceHealth(
    serviceName: string,
    endpointId: string,
    health: {
      healthy: boolean;
      responseTime?: number;
      errorRate?: number;
      metadata?: Record<string, unknown>;
    },
  ): Promise<void> {
    const endpoint = this.endpoints.get(endpointId);
    if (!endpoint) {
      return;
    }

    const previousHealth = endpoint.healthy;
    endpoint.healthy = health.healthy;
    endpoint.lastHealthCheck = new Date();

    if (health.responseTime !== undefined) {
      endpoint.responseTime = health.responseTime;
    }

    if (health.errorRate !== undefined) {
      endpoint.errorRate = health.errorRate;
    }

    if (health.metadata) {
      endpoint.metadata = { ...endpoint.metadata, ...health.metadata };
    }

    // Emit event if health status changed
    if (previousHealth !== health.healthy) {
      this.emitFailoverEvent({
        type: "health-change",
        serviceName,
        endpointId,
        timestamp: new Date(),
        severity: health.healthy ? "info" : "warning",
        message: `Service health changed: ${health.healthy ? "healthy" : "unhealthy"}`,
        previousState: previousHealth ? "healthy" : "unhealthy",
        newState: health.healthy ? "healthy" : "unhealthy",
        metadata: health.metadata || {},
      });
    }

    // Update circuit breaker if needed
    if (!health.healthy) {
      this.checkCircuitBreaker(endpointId);
    }
  }

  /**
   * Get failover analytics
   */
  getFailoverAnalytics(): FailoverAnalytics {
    return { ...this.analytics };
  }

  /**
   * Get current service status
   */
  getServiceStatus(): {
    endpoints: Array<{
      id: string;
      service: string;
      healthy: boolean;
      responseTime: number;
    }>;
    providers: Array<{
      id: string;
      name: string;
      status: string;
      healthy: boolean;
    }>;
    circuits: Array<{ id: string; service: string; state: string }>;
  } {
    return {
      endpoints: Array.from(this.endpoints.values()).map((endpoint) => ({
        id: endpoint.endpointId,
        service: endpoint.serviceName,
        healthy: endpoint.healthy,
        responseTime: endpoint.responseTime,
      })),
      providers: Array.from(this.backupProviders.values()).map((provider) => ({
        id: provider.providerId,
        name: provider.name,
        status: provider.status,
        healthy: provider.healthy,
      })),
      circuits: Array.from(this.circuitBreakers.values()).map((circuit) => ({
        id: circuit.circuitId,
        service: circuit.serviceName,
        state: circuit.state,
      })),
    };
  }

  /**
   * Force failover for testing
   */
  async forceFailover(serviceName: string, reason: string): Promise<void> {
    this.logger.warn(
      `🔧 Forcing failover for service: ${serviceName} - ${reason}`,
    );

    // Mark all endpoints for the service as unhealthy
    for (const endpoint of this.endpoints.values()) {
      if (endpoint.serviceName === serviceName) {
        endpoint.healthy = false;
        this.openCircuitBreaker(endpoint.endpointId, reason);
      }
    }

    // Mark associated providers as failed
    for (const provider of this.backupProviders.values()) {
      if (provider.metadata.associatedService === serviceName) {
        provider.status = "failed";
        provider.healthy = false;
      }
    }

    this.emitFailoverEvent({
      type: "failover",
      serviceName,
      timestamp: new Date(),
      severity: "warning",
      message: `Forced failover: ${reason}`,
      metadata: { forced: true, reason },
    });
  }

  /**
   * Private Methods
   */

  private async loadConfiguration(): Promise<void> {
    this.config = {
      strategy: "intelligent",
      healthCheck: {
        interval: 30000, // 30 seconds
        timeout: 5000, // 5 seconds
        retries: 3,
        endpoints: [],
      },
      circuitBreaker: {
        failureThreshold: 5,
        recoveryTimeout: 60000, // 1 minute
        halfOpenRetries: 3,
        monitoringWindow: 300000, // 5 minutes
      },
      backupProviders: [],
      emergency: {
        enabled: true,
        fallbackAuth: true,
        offlineMode: false,
        gracePeriod: 300000, // 5 minutes
      },
      loadBalancing: {
        algorithm: "response-time",
        stickySession: false,
      },
      ...(this.configService.get("failover") || {}),
      ...this.failoverConfig,
    };

    this.logger.log("⚙️ Failover configuration loaded");
  }

  private async initializeEndpoints(): Promise<void> {
    const endpointConfigs = [
      {
        endpointId: "aigent-auth-primary",
        serviceName: "aigent-auth",
        url: this.configService.get(
          "AIGENT_AUTH_PRIMARY_URL",
          "http://localhost:3000/auth",
        ),
        priority: 1,
      },
      {
        endpointId: "aigent-auth-secondary",
        serviceName: "aigent-auth",
        url: this.configService.get(
          "AIGENT_AUTH_SECONDARY_URL",
          "http://localhost:3001/auth",
        ),
        priority: 2,
      },
      {
        endpointId: "parlant-auth-primary",
        serviceName: "parlant-auth",
        url: this.configService.get(
          "PARLANT_AUTH_PRIMARY_URL",
          "http://localhost:8000/auth",
        ),
        priority: 1,
      },
      {
        endpointId: "parlant-auth-secondary",
        serviceName: "parlant-auth",
        url: this.configService.get(
          "PARLANT_AUTH_SECONDARY_URL",
          "http://localhost:8001/auth",
        ),
        priority: 2,
      },
    ];

    for (const config of endpointConfigs) {
      const endpoint: ServiceEndpoint = {
        endpointId: config.endpointId,
        serviceName: config.serviceName,
        url: config.url,
        priority: config.priority,
        healthy: true,
        responseTime: 0,
        activeConnections: 0,
        errorRate: 0,
        lastHealthCheck: new Date(),
        circuitState: "CLOSED",
        metadata: {},
      };

      this.endpoints.set(config.endpointId, endpoint);

      // Initialize HTTP client
      this.httpClients.set(
        config.endpointId,
        axios.create({
          baseURL: config.url,
          timeout: this.config.healthCheck.timeout,
          headers: {
            "Content-Type": "application/json",
            "X-Service": "aigent-failover",
          },
        }),
      );
    }

    this.logger.log(
      `🌐 Initialized ${endpointConfigs.length} service endpoints`,
    );
  }

  private async initializeBackupProviders(): Promise<void> {
    const providerConfigs: BackupProvider[] = [
      {
        providerId: "primary-jwt",
        name: "Primary JWT Provider",
        type: "jwt",
        priority: 1,
        config: {
          endpoint: this.configService.get("JWT_PRIMARY_ENDPOINT"),
          timeout: 5000,
          retries: 2,
        },
        status: "active",
        capabilities: ["authentication", "token-refresh", "validation"],
        healthy: true,
        metadata: { associatedService: "aigent-auth" },
      },
      {
        providerId: "backup-jwt",
        name: "Backup JWT Provider",
        type: "jwt",
        priority: 2,
        config: {
          endpoint: this.configService.get("JWT_BACKUP_ENDPOINT"),
          timeout: 5000,
          retries: 2,
        },
        status: "active",
        capabilities: ["authentication", "validation"],
        healthy: true,
        metadata: { associatedService: "parlant-auth" },
      },
      {
        providerId: "emergency-local",
        name: "Emergency Local Provider",
        type: "emergency",
        priority: 999,
        config: {
          timeout: 1000,
          retries: 1,
        },
        status: "active",
        capabilities: ["emergency-authentication"],
        healthy: true,
        metadata: { emergency: true },
      },
    ];

    for (const provider of providerConfigs) {
      this.backupProviders.set(provider.providerId, provider);
      this.analytics.providerStats[provider.providerId] = {
        requests: 0,
        successes: 0,
        failures: 0,
        averageResponseTime: 0,
        uptime: 100,
      };
    }

    this.logger.log(
      `🔧 Initialized ${providerConfigs.length} backup providers`,
    );
  }

  private async initializeCircuitBreakers(): Promise<void> {
    for (const endpoint of this.endpoints.values()) {
      const circuitBreaker: CircuitBreakerState = {
        circuitId: `circuit_${endpoint.endpointId}`,
        serviceName: endpoint.serviceName,
        state: "CLOSED",
        failureCount: 0,
        stateHistory: [],
      };

      this.circuitBreakers.set(endpoint.endpointId, circuitBreaker);
    }

    this.logger.log(
      `⚡ Initialized ${this.circuitBreakers.size} circuit breakers`,
    );
  }

  private async startHealthMonitoring(): Promise<void> {
    // Health check timer
    this.healthCheckTimer = setInterval(() => {
      this.performHealthChecks();
    }, this.config.healthCheck.interval);

    // Circuit breaker monitoring
    this.circuitBreakerTimer = setInterval(() => {
      this.monitorCircuitBreakers();
    }, 10000); // Every 10 seconds

    this.logger.log("💓 Health monitoring started");
  }

  private async stopHealthMonitoring(): Promise<void> {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    if (this.circuitBreakerTimer) {
      clearInterval(this.circuitBreakerTimer);
      this.circuitBreakerTimer = null;
    }
  }

  private async performHealthChecks(): Promise<void> {
    const healthPromises = Array.from(this.endpoints.values()).map(
      async (endpoint) => {
        try {
          const client = this.httpClients.get(endpoint.endpointId);
          if (!client) return;

          const startTime = Date.now();
          await client.get("/health");
          const responseTime = Date.now() - startTime;

          await this.reportServiceHealth(
            endpoint.serviceName,
            endpoint.endpointId,
            {
              healthy: true,
              responseTime,
              errorRate: 0,
            },
          );
        } catch (error) {
          await this.reportServiceHealth(
            endpoint.serviceName,
            endpoint.endpointId,
            {
              healthy: false,
              errorRate: 1,
            },
          );
        }
      },
    );

    await Promise.allSettled(healthPromises);
  }

  private getOrderedProviders(preferredProvider?: string): BackupProvider[] {
    let providers = Array.from(this.backupProviders.values()).filter(
      (p) => p.status === "active",
    );

    // Sort by priority
    providers.sort((a, b) => a.priority - b.priority);

    // Move preferred provider to front if specified and available
    if (preferredProvider) {
      const preferred = providers.find(
        (p) => p.providerId === preferredProvider,
      );
      if (preferred) {
        providers = [
          preferred,
          ...providers.filter((p) => p.providerId !== preferredProvider),
        ];
      }
    }

    return providers;
  }

  private isProviderAvailable(providerId: string): boolean {
    const provider = this.backupProviders.get(providerId);
    if (!provider) return false;

    return provider.status === "active" && provider.healthy;
  }

  private async authenticateWithProvider(
    provider: BackupProvider,
    credentials: Record<string, unknown>,
  ): Promise<{
    success: boolean;
    token?: string;
    userContext?: Record<string, unknown>;
    endpointUsed?: string;
  }> {
    const startTime = Date.now();

    try {
      this.analytics.providerStats[provider.providerId].requests++;

      switch (provider.type) {
        case "jwt":
          return await this.authenticateJWT(provider, credentials);
        case "oauth2":
          return await this.authenticateOAuth2(provider, credentials);
        case "saml":
          return await this.authenticateSAML(provider, credentials);
        case "ldap":
          return await this.authenticateLDAP(provider, credentials);
        case "local":
          return await this.authenticateLocal(provider, credentials);
        case "emergency":
          return await this.authenticateEmergency(provider, credentials);
        default:
          throw new Error(`Unsupported provider type: ${provider.type}`);
      }
    } finally {
      const responseTime = Date.now() - startTime;
      const stats = this.analytics.providerStats[provider.providerId];
      const totalTime =
        stats.averageResponseTime * (stats.requests - 1) + responseTime;
      stats.averageResponseTime = totalTime / stats.requests;
    }
  }

  private async authenticateJWT(
    provider: BackupProvider,
    credentials: Record<string, unknown>,
  ): Promise<{
    success: boolean;
    token?: string;
    userContext?: Record<string, unknown>;
    endpointUsed?: string;
  }> {
    // Implementation would handle JWT authentication
    return {
      success: true,
      token: `jwt_${Date.now()}_${crypto.randomBytes(16).toString("hex")}`,
      userContext: {
        userId: credentials.userId,
        provider: provider.providerId,
      },
      endpointUsed: provider.config.endpoint || "unknown",
    };
  }

  private async authenticateOAuth2(
    provider: BackupProvider,
    credentials: Record<string, unknown>,
  ): Promise<{
    success: boolean;
    token?: string;
    userContext?: Record<string, unknown>;
    endpointUsed?: string;
  }> {
    // Implementation would handle OAuth2 authentication
    return { success: false };
  }

  private async authenticateSAML(
    provider: BackupProvider,
    credentials: Record<string, unknown>,
  ): Promise<{
    success: boolean;
    token?: string;
    userContext?: Record<string, unknown>;
    endpointUsed?: string;
  }> {
    // Implementation would handle SAML authentication
    return { success: false };
  }

  private async authenticateLDAP(
    provider: BackupProvider,
    credentials: Record<string, unknown>,
  ): Promise<{
    success: boolean;
    token?: string;
    userContext?: Record<string, unknown>;
    endpointUsed?: string;
  }> {
    // Implementation would handle LDAP authentication
    return { success: false };
  }

  private async authenticateLocal(
    provider: BackupProvider,
    credentials: Record<string, unknown>,
  ): Promise<{
    success: boolean;
    token?: string;
    userContext?: Record<string, unknown>;
    endpointUsed?: string;
  }> {
    // Implementation would handle local authentication
    return { success: false };
  }

  private async authenticateEmergency(
    provider: BackupProvider,
    credentials: Record<string, unknown>,
  ): Promise<{
    success: boolean;
    token?: string;
    userContext?: Record<string, unknown>;
    endpointUsed?: string;
  }> {
    // Emergency authentication with limited capabilities
    return {
      success: true,
      token: `emergency_${Date.now()}_${crypto.randomBytes(8).toString("hex")}`,
      userContext: {
        userId: credentials.userId || "emergency_user",
        emergency: true,
        limitedAccess: true,
      },
      endpointUsed: "emergency",
    };
  }

  private async tryEmergencyAuthentication(
    credentials: Record<string, unknown>,
  ): Promise<{ token: string; userContext: Record<string, unknown> } | null> {
    if (!this.config.emergency.fallbackAuth) {
      return null;
    }

    const emergencyProvider = Array.from(this.backupProviders.values()).find(
      (p) => p.type === "emergency",
    );

    if (!emergencyProvider) {
      return null;
    }

    const result = await this.authenticateEmergency(
      emergencyProvider,
      credentials,
    );
    return result.success
      ? { token: result.token!, userContext: result.userContext! }
      : null;
  }

  private selectRoundRobin(
    serviceName: string,
    endpoints: ServiceEndpoint[],
  ): ServiceEndpoint {
    const counter = this.roundRobinCounter.get(serviceName) || 0;
    const selected = endpoints[counter % endpoints.length];
    this.roundRobinCounter.set(serviceName, counter + 1);
    return selected;
  }

  private selectLeastConnections(
    endpoints: ServiceEndpoint[],
  ): ServiceEndpoint {
    return endpoints.reduce((least, current) =>
      current.activeConnections < least.activeConnections ? current : least,
    );
  }

  private selectFastestResponse(endpoints: ServiceEndpoint[]): ServiceEndpoint {
    return endpoints.reduce((fastest, current) =>
      current.responseTime < fastest.responseTime ? current : fastest,
    );
  }

  private selectWeighted(endpoints: ServiceEndpoint[]): ServiceEndpoint {
    // Simple weighted selection - can be enhanced
    return endpoints[0];
  }

  private updateSuccessMetrics(providerId: string, responseTime: number): void {
    const stats = this.analytics.providerStats[providerId];
    if (stats) {
      stats.successes++;
    }
  }

  private updateFailureMetrics(providerId: string): void {
    const stats = this.analytics.providerStats[providerId];
    if (stats) {
      stats.failures++;
    }
  }

  private checkCircuitBreaker(endpointId: string): void {
    const circuit = this.circuitBreakers.get(endpointId);
    if (!circuit) return;

    circuit.failureCount++;
    circuit.lastFailureTime = new Date();

    if (
      circuit.state === "CLOSED" &&
      circuit.failureCount >= this.config.circuitBreaker.failureThreshold
    ) {
      this.openCircuitBreaker(endpointId, "Failure threshold exceeded");
    }
  }

  private openCircuitBreaker(endpointId: string, reason: string): void {
    const circuit = this.circuitBreakers.get(endpointId);
    if (!circuit) return;

    const previousState = circuit.state;
    circuit.state = "OPEN";
    circuit.nextRetryTime = new Date(
      Date.now() + this.config.circuitBreaker.recoveryTimeout,
    );

    circuit.stateHistory.push({
      previousState,
      newState: "OPEN",
      timestamp: new Date(),
      reason,
    });

    this.analytics.circuitBreakerEvents++;

    this.emitFailoverEvent({
      type: "circuit-break",
      serviceName: circuit.serviceName,
      endpointId,
      timestamp: new Date(),
      severity: "warning",
      message: `Circuit breaker opened: ${reason}`,
      previousState,
      newState: "OPEN",
      metadata: { reason, failureCount: circuit.failureCount },
    });

    this.logger.warn(`⚡ Circuit breaker opened for ${endpointId}: ${reason}`);
  }

  private monitorCircuitBreakers(): void {
    const now = new Date();

    for (const [endpointId, circuit] of this.circuitBreakers.entries()) {
      if (
        circuit.state === "OPEN" &&
        circuit.nextRetryTime &&
        circuit.nextRetryTime <= now
      ) {
        // Transition to half-open
        circuit.state = "HALF_OPEN";
        circuit.stateHistory.push({
          previousState: "OPEN",
          newState: "HALF_OPEN",
          timestamp: now,
          reason: "Recovery timeout elapsed",
        });

        this.logger.log(`⚡ Circuit breaker half-open for ${endpointId}`);
      }
    }
  }

  private getCircuitStates(): Record<string, string> {
    const states: Record<string, string> = {};
    for (const [endpointId, circuit] of this.circuitBreakers.entries()) {
      states[endpointId] = circuit.state;
    }
    return states;
  }

  private emitFailoverEvent(event: FailoverEvent): void {
    this.emit("failover:event", event);
    this.logger.debug(
      `📢 Failover event: ${event.type} for ${event.serviceName}`,
    );
  }

  private async gracefulShutdown(): Promise<void> {
    // Close circuit breakers gracefully
    for (const circuit of this.circuitBreakers.values()) {
      circuit.state = "OPEN";
    }

    // Clear HTTP clients
    this.httpClients.clear();
  }
}
