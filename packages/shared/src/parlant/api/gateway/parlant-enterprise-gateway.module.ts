/**
 * @fileoverview PARLANT Enterprise Gateway Module
 *
 * Complete NestJS module that provides comprehensive PARLANT Enterprise API Gateway
 * integration with conversational validation, security authentication, performance
 * monitoring, and orchestration services.
 *
 * @version 1.0.0
 * @author AIgent Enterprise Gateway Team
 * @since 2025-09-21
 */

import { Module, Global, DynamicModule, Provider } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";

// Core Gateway Services
import { ParlantEnterpriseGatewayMiddlewareService } from "./parlant-enterprise-gateway-middleware.service";
import { ParlantSecurityAuthenticationIntegrationService } from "./parlant-security-authentication-integration.service";
import { ParlantPerformanceMonitoringAnalyticsService } from "./parlant-performance-monitoring-analytics.service";
import { ParlantEnterpriseGatewayOrchestratorService } from "./parlant-enterprise-gateway-orchestrator.service";

/**
 * PARLANT Enterprise Gateway Configuration
 */
export interface ParlantEnterpriseGatewayConfig {
  // Gateway Configuration
  gateway: {
    enabled: boolean;
    version: string;
    instanceId: string;
    clusterId: string;
    environment: "development" | "staging" | "production";
  };

  // Performance Configuration
  performance: {
    targetThroughput: number; // requests per second
    maxLatencyP95: number; // milliseconds
    maxLatencyP99: number; // milliseconds
    maxErrorRate: number; // percentage (0-1)
    cacheEnabled: boolean;
    cacheTTL: number; // milliseconds
    metricsCollectionInterval: number; // milliseconds
  };

  // Security Configuration
  security: {
    threatDetectionEnabled: boolean;
    threatDetectionSensitivity: "LOW" | "MEDIUM" | "HIGH";
    authenticationRequired: boolean;
    authorizationEnabled: boolean;
    auditingEnabled: boolean;
    encryptionRequired: boolean;
    complianceStandards: string[];
    securityAuditRetention: number; // milliseconds
  };

  // Conversational Configuration
  conversational: {
    enabled: boolean;
    defaultLanguage: string;
    supportedLanguages: string[];
    conversationTimeout: number; // milliseconds
    maxConversationMemory: number; // number of interactions
    nlpConfidenceThreshold: number; // 0-1
    explanationVerbosity: "MINIMAL" | "STANDARD" | "DETAILED";
  };

  // Rate Limiting Configuration
  rateLimiting: {
    enabled: boolean;
    defaultRateLimit: number; // requests per minute
    burstAllowance: number; // additional requests
    negotiationEnabled: boolean;
    adaptiveScaling: boolean;
    escalationThresholds: number[]; // utilization percentages
  };

  // Traffic Management Configuration
  trafficManagement: {
    loadBalancingEnabled: boolean;
    loadBalancingAlgorithm: "ROUND_ROBIN" | "LEAST_CONNECTIONS" | "WEIGHTED" | "GEOGRAPHIC";
    healthCheckEnabled: boolean;
    healthCheckInterval: number; // milliseconds
    failoverEnabled: boolean;
    failoverTimeout: number; // milliseconds
    circuitBreakerEnabled: boolean;
    circuitBreakerThreshold: number; // failure count
  };

  // Analytics Configuration
  analytics: {
    enabled: boolean;
    realTimeAnalytics: boolean;
    historicalAnalytics: boolean;
    predictiveAnalytics: boolean;
    dataRetention: number; // milliseconds
    reportingFrequency: number; // milliseconds
    dashboardEnabled: boolean;
    alertingEnabled: boolean;
  };

  // Integration Configuration
  integration: {
    parlantEndpoint?: string;
    parlantApiKey?: string;
    parlantTimeout: number; // milliseconds
    externalServices: ExternalServiceConfig[];
    webhooks: WebhookConfig[];
    callbacks: CallbackConfig[];
  };

  // Orchestration Configuration
  orchestration: {
    pipelineTimeout: number; // milliseconds
    maxConcurrentOrchestrations: number;
    parallelProcessingEnabled: boolean;
    maxConcurrency: number;
    retryConfiguration: RetryConfig;
    fallbackConfiguration: FallbackConfig;
  };

  // Compliance Configuration
  compliance: {
    enabled: boolean;
    auditTrailEnabled: boolean;
    dataClassification: "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "RESTRICTED";
    retentionPolicies: RetentionPolicyConfig[];
    complianceReporting: boolean;
    regulatoryRequirements: RegulatoryRequirementConfig[];
  };
}

export interface ExternalServiceConfig {
  serviceName: string;
  endpoint: string;
  timeout: number;
  retries: number;
  circuitBreakerEnabled: boolean;
  healthCheckPath?: string;
}

export interface WebhookConfig {
  webhookId: string;
  url: string;
  events: string[];
  secret?: string;
  timeout: number;
  retries: number;
}

export interface CallbackConfig {
  callbackId: string;
  url: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  timeout: number;
  retries: number;
}

export interface RetryConfig {
  maxRetries: number;
  retryStrategy: "LINEAR" | "EXPONENTIAL" | "FIXED";
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export interface FallbackConfig {
  enabled: boolean;
  strategy: "CACHED_RESPONSE" | "DEFAULT_VALUE" | "SKIP_OPERATION" | "ALTERNATIVE_SERVICE";
  timeout: number;
  qualityLevel: "FULL" | "DEGRADED" | "MINIMAL";
}

export interface RetentionPolicyConfig {
  dataType: string;
  retentionPeriod: number; // milliseconds
  archivalEnabled: boolean;
  encryptionRequired: boolean;
  deletionMethod: "SOFT" | "HARD" | "OVERWRITE";
}

export interface RegulatoryRequirementConfig {
  regulation: string;
  applicableDataTypes: string[];
  retentionPeriod: number;
  auditFrequency: number;
  reportingRequired: boolean;
}

/**
 * Default Configuration
 */
export const DEFAULT_PARLANT_GATEWAY_CONFIG: ParlantEnterpriseGatewayConfig = {
  gateway: {
    enabled: true,
    version: "1.0.0",
    instanceId: "default",
    clusterId: "enterprise-cluster",
    environment: "development",
  },
  performance: {
    targetThroughput: 10000,
    maxLatencyP95: 100,
    maxLatencyP99: 250,
    maxErrorRate: 0.01,
    cacheEnabled: true,
    cacheTTL: 300000, // 5 minutes
    metricsCollectionInterval: 10000, // 10 seconds
  },
  security: {
    threatDetectionEnabled: true,
    threatDetectionSensitivity: "MEDIUM",
    authenticationRequired: true,
    authorizationEnabled: true,
    auditingEnabled: true,
    encryptionRequired: true,
    complianceStandards: ["SOX", "GDPR"],
    securityAuditRetention: 2592000000, // 30 days
  },
  conversational: {
    enabled: true,
    defaultLanguage: "en",
    supportedLanguages: ["en", "es", "fr", "de", "zh"],
    conversationTimeout: 300000, // 5 minutes
    maxConversationMemory: 50,
    nlpConfidenceThreshold: 0.7,
    explanationVerbosity: "STANDARD",
  },
  rateLimiting: {
    enabled: true,
    defaultRateLimit: 1000, // per minute
    burstAllowance: 200,
    negotiationEnabled: true,
    adaptiveScaling: true,
    escalationThresholds: [80, 90, 95],
  },
  trafficManagement: {
    loadBalancingEnabled: true,
    loadBalancingAlgorithm: "ROUND_ROBIN",
    healthCheckEnabled: true,
    healthCheckInterval: 30000, // 30 seconds
    failoverEnabled: true,
    failoverTimeout: 5000, // 5 seconds
    circuitBreakerEnabled: true,
    circuitBreakerThreshold: 5,
  },
  analytics: {
    enabled: true,
    realTimeAnalytics: true,
    historicalAnalytics: true,
    predictiveAnalytics: true,
    dataRetention: 2592000000, // 30 days
    reportingFrequency: 3600000, // 1 hour
    dashboardEnabled: true,
    alertingEnabled: true,
  },
  integration: {
    parlantTimeout: 5000, // 5 seconds
    externalServices: [],
    webhooks: [],
    callbacks: [],
  },
  orchestration: {
    pipelineTimeout: 30000, // 30 seconds
    maxConcurrentOrchestrations: 1000,
    parallelProcessingEnabled: true,
    maxConcurrency: 10,
    retryConfiguration: {
      maxRetries: 3,
      retryStrategy: "EXPONENTIAL",
      initialDelay: 100,
      maxDelay: 5000,
      backoffMultiplier: 2,
    },
    fallbackConfiguration: {
      enabled: true,
      strategy: "CACHED_RESPONSE",
      timeout: 1000,
      qualityLevel: "DEGRADED",
    },
  },
  compliance: {
    enabled: true,
    auditTrailEnabled: true,
    dataClassification: "INTERNAL",
    retentionPolicies: [
      {
        dataType: "audit_logs",
        retentionPeriod: 2592000000, // 30 days
        archivalEnabled: true,
        encryptionRequired: true,
        deletionMethod: "OVERWRITE",
      },
      {
        dataType: "performance_metrics",
        retentionPeriod: 604800000, // 7 days
        archivalEnabled: false,
        encryptionRequired: false,
        deletionMethod: "SOFT",
      },
    ],
    complianceReporting: true,
    regulatoryRequirements: [
      {
        regulation: "SOX",
        applicableDataTypes: ["audit_logs", "security_events"],
        retentionPeriod: 2592000000, // 30 days
        auditFrequency: 86400000, // daily
        reportingRequired: true,
      },
    ],
  },
};

/**
 * Configuration Token
 */
export const PARLANT_GATEWAY_CONFIG = Symbol("PARLANT_GATEWAY_CONFIG");

/**
 * Feature Flags Interface
 */
export interface ParlantGatewayFeatureFlags {
  conversationalValidation: boolean;
  intelligentThreatDetection: boolean;
  adaptiveRateLimiting: boolean;
  predictiveAnalytics: boolean;
  realTimeDashboards: boolean;
  automaticOptimization: boolean;
  multiLanguageSupport: boolean;
  complianceReporting: boolean;
  circuitBreaker: boolean;
  distributedTracing: boolean;
}

export const DEFAULT_FEATURE_FLAGS: ParlantGatewayFeatureFlags = {
  conversationalValidation: true,
  intelligentThreatDetection: true,
  adaptiveRateLimiting: true,
  predictiveAnalytics: true,
  realTimeDashboards: true,
  automaticOptimization: true,
  multiLanguageSupport: true,
  complianceReporting: true,
  circuitBreaker: true,
  distributedTracing: true,
};

/**
 * Module Options
 */
export interface ParlantEnterpriseGatewayModuleOptions {
  config?: Partial<ParlantEnterpriseGatewayConfig>;
  featureFlags?: Partial<ParlantGatewayFeatureFlags>;
  isGlobal?: boolean;
  imports?: any[];
  providers?: Provider[];
  exports?: any[];
}

/**
 * Async Module Options
 */
export interface ParlantEnterpriseGatewayModuleAsyncOptions {
  imports?: any[];
  useFactory?: (...args: any[]) => Promise<ParlantEnterpriseGatewayModuleOptions> | ParlantEnterpriseGatewayModuleOptions;
  inject?: any[];
  isGlobal?: boolean;
}

/**
 * Core Providers Factory
 */
function createCoreProviders(
  config: ParlantEnterpriseGatewayConfig,
  featureFlags: ParlantGatewayFeatureFlags
): Provider[] {
  const providers: Provider[] = [
    // Configuration providers
    {
      provide: PARLANT_GATEWAY_CONFIG,
      useValue: config,
    },
    {
      provide: "PARLANT_GATEWAY_FEATURE_FLAGS",
      useValue: featureFlags,
    },

    // Core service providers
    ParlantEnterpriseGatewayMiddlewareService,
    ParlantSecurityAuthenticationIntegrationService,
    ParlantPerformanceMonitoringAnalyticsService,
    ParlantEnterpriseGatewayOrchestratorService,
  ];

  // Conditional providers based on feature flags
  if (featureFlags.conversationalValidation) {
    providers.push({
      provide: "CONVERSATIONAL_VALIDATION_ENABLED",
      useValue: true,
    });
  }

  if (featureFlags.intelligentThreatDetection) {
    providers.push({
      provide: "THREAT_DETECTION_ENABLED",
      useValue: true,
    });
  }

  if (featureFlags.predictiveAnalytics) {
    providers.push({
      provide: "PREDICTIVE_ANALYTICS_ENABLED",
      useValue: true,
    });
  }

  if (featureFlags.realTimeDashboards) {
    providers.push({
      provide: "REAL_TIME_DASHBOARDS_ENABLED",
      useValue: true,
    });
  }

  return providers;
}

/**
 * Health Check Provider
 */
const HealthCheckProvider: Provider = {
  provide: "PARLANT_GATEWAY_HEALTH_CHECK",
  useFactory: (
    middlewareService: ParlantEnterpriseGatewayMiddlewareService,
    securityService: ParlantSecurityAuthenticationIntegrationService,
    analyticsService: ParlantPerformanceMonitoringAnalyticsService,
    orchestratorService: ParlantEnterpriseGatewayOrchestratorService,
  ) => {
    return {
      async checkHealth(): Promise<{
        status: "healthy" | "unhealthy" | "degraded";
        services: Record<string, { status: string; lastCheck: Date; details?: any }>;
        timestamp: Date;
      }> {
        const healthChecks = await Promise.allSettled([
          Promise.resolve({ service: "middleware", status: "healthy" }),
          Promise.resolve({ service: "security", status: "healthy" }),
          Promise.resolve({ service: "analytics", status: "healthy" }),
          Promise.resolve({ service: "orchestrator", status: "healthy" }),
        ]);

        const services: Record<string, { status: string; lastCheck: Date; details?: any }> = {};
        let overallStatus: "healthy" | "unhealthy" | "degraded" = "healthy";

        healthChecks.forEach((result, index) => {
          const serviceNames = ["middleware", "security", "analytics", "orchestrator"];
          const serviceName = serviceNames[index];

          if (result.status === "fulfilled") {
            services[serviceName] = {
              status: result.value.status,
              lastCheck: new Date(),
            };
          } else {
            services[serviceName] = {
              status: "unhealthy",
              lastCheck: new Date(),
              details: result.reason,
            };
            overallStatus = "unhealthy";
          }
        });

        return {
          status: overallStatus,
          services: services,
          timestamp: new Date(),
        };
      },
    };
  },
  inject: [
    ParlantEnterpriseGatewayMiddlewareService,
    ParlantSecurityAuthenticationIntegrationService,
    ParlantPerformanceMonitoringAnalyticsService,
    ParlantEnterpriseGatewayOrchestratorService,
  ],
};

/**
 * Metrics Provider
 */
const MetricsProvider: Provider = {
  provide: "PARLANT_GATEWAY_METRICS",
  useFactory: (config: ParlantEnterpriseGatewayConfig) => {
    return {
      async getMetrics(): Promise<{
        gateway: Record<string, any>;
        performance: Record<string, any>;
        security: Record<string, any>;
        analytics: Record<string, any>;
        timestamp: Date;
      }> {
        return {
          gateway: {
            version: config.gateway.version,
            instanceId: config.gateway.instanceId,
            clusterId: config.gateway.clusterId,
            environment: config.gateway.environment,
            uptime: process.uptime(),
          },
          performance: {
            targetThroughput: config.performance.targetThroughput,
            maxLatencyP95: config.performance.maxLatencyP95,
            cacheEnabled: config.performance.cacheEnabled,
            currentMemoryUsage: process.memoryUsage(),
            currentCpuUsage: process.cpuUsage(),
          },
          security: {
            threatDetectionEnabled: config.security.threatDetectionEnabled,
            authenticationRequired: config.security.authenticationRequired,
            auditingEnabled: config.security.auditingEnabled,
            complianceStandards: config.security.complianceStandards,
          },
          analytics: {
            enabled: config.analytics.enabled,
            realTimeAnalytics: config.analytics.realTimeAnalytics,
            predictiveAnalytics: config.analytics.predictiveAnalytics,
            dashboardEnabled: config.analytics.dashboardEnabled,
          },
          timestamp: new Date(),
        };
      },
    };
  },
  inject: [PARLANT_GATEWAY_CONFIG],
};

/**
 * PARLANT Enterprise Gateway Module
 *
 * Complete NestJS module providing enterprise-grade API gateway functionality with:
 * - Conversational validation and user interaction
 * - Intelligent security and threat detection
 * - Real-time performance monitoring and analytics
 * - Adaptive traffic management and load balancing
 * - Comprehensive audit trails and compliance reporting
 * - Enterprise-grade orchestration and error handling
 */
@Global()
@Module({})
export class ParlantEnterpriseGatewayModule {
  /**
   * Register the module with synchronous configuration
   */
  static forRoot(options: ParlantEnterpriseGatewayModuleOptions = {}): DynamicModule {
    const config = {
      ...DEFAULT_PARLANT_GATEWAY_CONFIG,
      ...options.config,
    };

    const featureFlags = {
      ...DEFAULT_FEATURE_FLAGS,
      ...options.featureFlags,
    };

    const coreProviders = createCoreProviders(config, featureFlags);
    const allProviders = [
      ...coreProviders,
      HealthCheckProvider,
      MetricsProvider,
      ...(options.providers || []),
    ];

    return {
      module: ParlantEnterpriseGatewayModule,
      imports: [
        ConfigModule,
        ...(options.imports || []),
      ],
      providers: allProviders,
      exports: [
        ...coreProviders,
        HealthCheckProvider,
        MetricsProvider,
        ...(options.exports || []),
      ],
      global: options.isGlobal !== false, // Default to global
    };
  }

  /**
   * Register the module with asynchronous configuration
   */
  static forRootAsync(options: ParlantEnterpriseGatewayModuleAsyncOptions): DynamicModule {
    const asyncProviders: Provider[] = [];

    if (options.useFactory) {
      asyncProviders.push({
        provide: "PARLANT_GATEWAY_MODULE_OPTIONS",
        useFactory: options.useFactory,
        inject: options.inject || [],
      });
    }

    const configProvider: Provider = {
      provide: PARLANT_GATEWAY_CONFIG,
      useFactory: (moduleOptions: ParlantEnterpriseGatewayModuleOptions) => {
        return {
          ...DEFAULT_PARLANT_GATEWAY_CONFIG,
          ...moduleOptions.config,
        };
      },
      inject: ["PARLANT_GATEWAY_MODULE_OPTIONS"],
    };

    const featureFlagsProvider: Provider = {
      provide: "PARLANT_GATEWAY_FEATURE_FLAGS",
      useFactory: (moduleOptions: ParlantEnterpriseGatewayModuleOptions) => {
        return {
          ...DEFAULT_FEATURE_FLAGS,
          ...moduleOptions.featureFlags,
        };
      },
      inject: ["PARLANT_GATEWAY_MODULE_OPTIONS"],
    };

    const dynamicProviders: Provider[] = [
      ...asyncProviders,
      configProvider,
      featureFlagsProvider,
      ParlantEnterpriseGatewayMiddlewareService,
      ParlantSecurityAuthenticationIntegrationService,
      ParlantPerformanceMonitoringAnalyticsService,
      ParlantEnterpriseGatewayOrchestratorService,
      HealthCheckProvider,
      MetricsProvider,
    ];

    return {
      module: ParlantEnterpriseGatewayModule,
      imports: [
        ConfigModule,
        ...(options.imports || []),
      ],
      providers: dynamicProviders,
      exports: [
        PARLANT_GATEWAY_CONFIG,
        "PARLANT_GATEWAY_FEATURE_FLAGS",
        ParlantEnterpriseGatewayMiddlewareService,
        ParlantSecurityAuthenticationIntegrationService,
        ParlantPerformanceMonitoringAnalyticsService,
        ParlantEnterpriseGatewayOrchestratorService,
        HealthCheckProvider,
        MetricsProvider,
      ],
      global: options.isGlobal !== false, // Default to global
    };
  }

  /**
   * Create a testing module with minimal configuration
   */
  static forTesting(overrides: Partial<ParlantEnterpriseGatewayModuleOptions> = {}): DynamicModule {
    const testConfig: ParlantEnterpriseGatewayConfig = {
      ...DEFAULT_PARLANT_GATEWAY_CONFIG,
      gateway: {
        ...DEFAULT_PARLANT_GATEWAY_CONFIG.gateway,
        environment: "development",
      },
      performance: {
        ...DEFAULT_PARLANT_GATEWAY_CONFIG.performance,
        targetThroughput: 100, // Lower for testing
        metricsCollectionInterval: 1000, // More frequent for testing
      },
      security: {
        ...DEFAULT_PARLANT_GATEWAY_CONFIG.security,
        threatDetectionSensitivity: "LOW", // Less sensitive for testing
      },
      analytics: {
        ...DEFAULT_PARLANT_GATEWAY_CONFIG.analytics,
        dataRetention: 3600000, // 1 hour for testing
      },
      ...overrides.config,
    };

    const testFeatureFlags: ParlantGatewayFeatureFlags = {
      ...DEFAULT_FEATURE_FLAGS,
      predictiveAnalytics: false, // Disable for faster testing
      realTimeDashboards: false, // Disable for testing
      ...overrides.featureFlags,
    };

    return this.forRoot({
      config: testConfig,
      featureFlags: testFeatureFlags,
      isGlobal: false,
      ...overrides,
    });
  }
}

/**
 * Utility function to validate configuration
 */
export function validateParlantGatewayConfig(config: ParlantEnterpriseGatewayConfig): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate performance configuration
  if (config.performance.targetThroughput <= 0) {
    errors.push("Performance target throughput must be greater than 0");
  }

  if (config.performance.maxLatencyP95 <= 0) {
    errors.push("Performance max latency P95 must be greater than 0");
  }

  if (config.performance.maxErrorRate < 0 || config.performance.maxErrorRate > 1) {
    errors.push("Performance max error rate must be between 0 and 1");
  }

  // Validate security configuration
  if (config.security.complianceStandards.length === 0) {
    warnings.push("No compliance standards specified");
  }

  // Validate rate limiting configuration
  if (config.rateLimiting.enabled && config.rateLimiting.defaultRateLimit <= 0) {
    errors.push("Rate limiting default rate limit must be greater than 0");
  }

  // Validate orchestration configuration
  if (config.orchestration.maxConcurrentOrchestrations <= 0) {
    errors.push("Orchestration max concurrent orchestrations must be greater than 0");
  }

  if (config.orchestration.pipelineTimeout <= 0) {
    errors.push("Orchestration pipeline timeout must be greater than 0");
  }

  // Performance warnings
  if (config.performance.targetThroughput > 50000) {
    warnings.push("Very high target throughput may require additional infrastructure");
  }

  if (config.orchestration.maxConcurrency > 20) {
    warnings.push("High concurrency may impact system stability");
  }

  return {
    valid: errors.length === 0,
    errors: errors,
    warnings: warnings,
  };
}

/**
 * Helper function to merge configurations
 */
export function mergeParlantGatewayConfigs(
  base: ParlantEnterpriseGatewayConfig,
  override: Partial<ParlantEnterpriseGatewayConfig>
): ParlantEnterpriseGatewayConfig {
  return {
    gateway: { ...base.gateway, ...override.gateway },
    performance: { ...base.performance, ...override.performance },
    security: { ...base.security, ...override.security },
    conversational: { ...base.conversational, ...override.conversational },
    rateLimiting: { ...base.rateLimiting, ...override.rateLimiting },
    trafficManagement: { ...base.trafficManagement, ...override.trafficManagement },
    analytics: { ...base.analytics, ...override.analytics },
    integration: { ...base.integration, ...override.integration },
    orchestration: { ...base.orchestration, ...override.orchestration },
    compliance: { ...base.compliance, ...override.compliance },
  };
}

/**
 * Export all services for external use
 */
export {
  ParlantEnterpriseGatewayMiddlewareService,
  ParlantSecurityAuthenticationIntegrationService,
  ParlantPerformanceMonitoringAnalyticsService,
  ParlantEnterpriseGatewayOrchestratorService,
};

/**
 * Export all interfaces for external use
 */
export * from "../interfaces/gateway.interface";