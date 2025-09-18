/**
 * Global Parlant Integration Module
 *
 * Enterprise-grade module for deploying universal Parlant conversational AI validation
 * across ALL REST endpoints in the entire AIgent ecosystem. This module ensures
 * comprehensive API layer integration with high-performance optimization and
 * real-time monitoring capabilities.
 *
 * Features:
 * - Universal API endpoint coverage with conversational validation
 * - Automatic deployment across all NestJS applications
 * - High-throughput optimization with intelligent caching
 * - Real-time monitoring and audit trails
 * - Performance metrics and analytics
 * - Enterprise-grade security and compliance
 *
 * @author AIgent Integration Team
 * @version 1.0.0
 */

import {
  Module,
  DynamicModule,
  MiddlewareConsumer,
  NestModule,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ParlantIntegrationModule } from "./parlant-integration.module";
import { UniversalParlantValidationMiddleware } from "../middleware/universal-parlant-validation.middleware";
import { ParlantIntegrationService } from "../services/parlant-integration.service";
import { ParlantValidationInterceptor } from "../interceptors/parlant-validation.interceptor";
import { PerformanceModule } from "../performance/performance.module";
import { MonitoringModule } from "../monitoring/monitoring.module";
import { SecurityLevel } from "../types/parlant-integration.types";

/**
 * Configuration for global Parlant integration deployment
 */
export interface GlobalParlantIntegrationConfig {
  /** Enable universal middleware for all endpoints */
  enableUniversalMiddleware: boolean;

  /** Enable global interceptor for additional validation */
  enableGlobalInterceptor: boolean;

  /** Enable real-time API monitoring dashboard */
  enableMonitoringDashboard: boolean;

  /** Performance optimization settings */
  performance: {
    /** Enable high-throughput caching */
    enableCaching: boolean;

    /** Cache TTL in milliseconds */
    cacheTtl: number;

    /** Maximum concurrent validations */
    maxConcurrentValidations: number;

    /** Validation timeout in milliseconds */
    validationTimeoutMs: number;
  };

  /** Monitoring and analytics configuration */
  monitoring: {
    /** Enable comprehensive audit logging */
    enableAuditLogging: boolean;

    /** Enable performance metrics collection */
    enableMetrics: boolean;

    /** Enable real-time alerting */
    enableAlerting: boolean;

    /** Metrics collection interval in milliseconds */
    metricsInterval: number;
  };

  /** Security and compliance settings */
  security: {
    /** Default security level for endpoints without explicit validation */
    defaultSecurityLevel: SecurityLevel;

    /** Enable risk-based security level assignment */
    enableRiskBasedAssignment: boolean;

    /** Enable compliance reporting */
    enableComplianceReporting: boolean;
  };
}

/**
 * Default configuration for production deployment
 */
const DEFAULT_CONFIG: GlobalParlantIntegrationConfig = {
  enableUniversalMiddleware: true,
  enableGlobalInterceptor: true,
  enableMonitoringDashboard: true,
  performance: {
    enableCaching: true,
    cacheTtl: 300000, // 5 minutes
    maxConcurrentValidations: 1000,
    validationTimeoutMs: 5000,
  },
  monitoring: {
    enableAuditLogging: true,
    enableMetrics: true,
    enableAlerting: true,
    metricsInterval: 60000, // 1 minute
  },
  security: {
    defaultSecurityLevel: SecurityLevel._MEDIUM,
    enableRiskBasedAssignment: true,
    enableComplianceReporting: true,
  },
};

/**
 * Global Parlant Integration Module
 *
 * Provides enterprise-grade universal Parlant conversational AI validation
 * across ALL REST endpoints in the AIgent ecosystem with comprehensive
 * monitoring, performance optimization, and compliance features.
 */
@Module({})
export class GlobalParlantIntegrationModule implements NestModule {
  /**
   * Register global Parlant integration for the entire application
   */
  static forRoot(
    config: Partial<GlobalParlantIntegrationConfig> = {},
  ): DynamicModule {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };

    return {
      module: GlobalParlantIntegrationModule,
      imports: [
        // Import performance optimization module
        process.env.NODE_ENV === "production"
          ? PerformanceModule.forProduction()
          : PerformanceModule.forDevelopment(),

        // Import monitoring module with Parlant conversational interface
        MonitoringModule,

        // Import core Parlant integration module
        ParlantIntegrationModule.forRoot({
          enabled: true,
          connection: {
            baseUrl: process.env.PARLANT_API_URL || "http://localhost:8000",
            websocketUrl:
              process.env.PARLANT_WS_URL || "ws://localhost:8000/ws",
            apiKey: process.env.PARLANT_API_KEY || "",
            sessionTimeout: parseInt(
              process.env.PARLANT_SESSION_TIMEOUT || "300000",
            ),
            maxRetries: parseInt(process.env.PARLANT_MAX_RETRIES || "3"),
            cacheTtl: finalConfig.performance.cacheTtl,
            debugMode: process.env.NODE_ENV === "development",
          },
          cache: {
            enabled: finalConfig.performance.enableCaching,
            type: "hybrid",
            defaultTtl: finalConfig.performance.cacheTtl,
            maxSize: 50000,
            evictionPolicy: "lru",
          },
          websocket: {
            enabled: true,
            reconnectAttempts: 5,
            heartbeatInterval: 30000,
            connectionTimeout: 10000,
          },
          authentication: {
            jwtSecret: process.env.JWT_SECRET || "default-secret",
            tokenExpiration: "1h",
            refreshTokenEnabled: true,
            sessionDuration: 3600000,
          },
          globalDecorators: {
            enabled: true,
            defaultSecurityLevel: finalConfig.security.defaultSecurityLevel,
            autoWrapMethods: false, // Let universal middleware handle this
          },
        }),
      ],
      providers: [
        // Configuration provider
        {
          provide: "GLOBAL_PARLANT_CONFIG",
          useValue: finalConfig,
        },

        // Universal middleware provider
        {
          provide: UniversalParlantValidationMiddleware,
          useFactory: (parlantService: ParlantIntegrationService) => {
            return new UniversalParlantValidationMiddleware(parlantService, {
              enabled: finalConfig.enableUniversalMiddleware,
              defaultSecurityLevel: finalConfig.security.defaultSecurityLevel,
              bypassDecoratedEndpoints: true,
              enableCaching: finalConfig.performance.enableCaching,
              cacheTtl: finalConfig.performance.cacheTtl,
              enableMonitoring: finalConfig.monitoring.enableMetrics,
              riskBasedAssignment: {
                enabled: finalConfig.security.enableRiskBasedAssignment,
                rules: [], // Use default rules from middleware
              },
              excludePatterns: [
                "/health",
                "/metrics",
                "/favicon.ico",
                "/robots.txt",
                "/_next",
                "/static",
                "/assets",
                "/docs",
                "/swagger",
              ],
              performance: {
                maxConcurrentValidations:
                  finalConfig.performance.maxConcurrentValidations,
                timeoutMs: finalConfig.performance.validationTimeoutMs,
                retryAttempts: 2,
              },
            });
          },
          inject: [ParlantIntegrationService],
        },

        // Global interceptor provider (if enabled)
        ...(finalConfig.enableGlobalInterceptor
          ? [
              {
                provide: ParlantValidationInterceptor,
                useFactory: (
                  reflector: Reflector,
                  parlantService: ParlantIntegrationService,
                ) => {
                  return new ParlantValidationInterceptor(
                    reflector,
                    parlantService,
                  );
                },
                inject: [Reflector, ParlantIntegrationService],
              },
            ]
          : []),

        // Monitoring service provider
        {
          provide: "PARLANT_MONITORING_SERVICE",
          useFactory: () => {
            return new ParlantMonitoringService(finalConfig);
          },
        },
      ],
      exports: [
        ParlantIntegrationService,
        UniversalParlantValidationMiddleware,
        "GLOBAL_PARLANT_CONFIG",
        "PARLANT_MONITORING_SERVICE",
      ],
      global: true,
    };
  }

  /**
   * Configure universal middleware for all routes
   */
  configure(consumer: MiddlewareConsumer) {
    // Apply universal Parlant validation middleware to all routes
    consumer.apply(UniversalParlantValidationMiddleware).forRoutes("*"); // Apply to ALL routes
  }
}

/**
 * Parlant Monitoring Service for real-time analytics and alerting
 */
class ParlantMonitoringService {
  private metrics = {
    totalValidations: 0,
    successfulValidations: 0,
    failedValidations: 0,
    averageValidationTime: 0,
    cacheHitRate: 0,
    endpointMetrics: new Map<
      string,
      {
        requests: number;
        approvals: number;
        denials: number;
        averageTime: number;
      }
    >(),
  };

  constructor(private readonly config: GlobalParlantIntegrationConfig) {
    if (config.monitoring.enableMetrics) {
      this.startMetricsCollection();
    }
  }

  /**
   * Start periodic metrics collection
   */
  private startMetricsCollection(): void {
    setInterval(() => {
      this.collectMetrics();
    }, this.config.monitoring.metricsInterval);
  }

  /**
   * Collect and process metrics
   */
  private collectMetrics(): void {
    // Implementation would collect metrics from various sources
    console.log("Parlant Integration Metrics:", {
      timestamp: new Date().toISOString(),
      totalValidations: this.metrics.totalValidations,
      successRate:
        this.metrics.totalValidations > 0
          ? (this.metrics.successfulValidations /
              this.metrics.totalValidations) *
            100
          : 0,
      averageValidationTime: this.metrics.averageValidationTime,
      cacheHitRate: this.metrics.cacheHitRate,
      endpointCount: this.metrics.endpointMetrics.size,
    });
  }

  /**
   * Get current metrics
   */
  public getMetrics() {
    return {
      ...this.metrics,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Utility functions for easy integration
 */
export class ParlantIntegrationUtils {
  /**
   * Create optimized configuration for high-throughput applications
   */
  static forHighThroughput(): Partial<GlobalParlantIntegrationConfig> {
    return {
      performance: {
        enableCaching: true,
        cacheTtl: 600000, // 10 minutes for high throughput stability
        maxConcurrentValidations: 10000, // Increased for high throughput
        validationTimeoutMs: 2000, // Reduced timeout for fast processing
      },
      monitoring: {
        enableAuditLogging: true,
        enableMetrics: true,
        enableAlerting: true, // Enable for production monitoring
        metricsInterval: 60000, // More frequent monitoring for high throughput
      },
      // High-throughput specific configuration
      enableUniversalMiddleware: true,
      enableGlobalInterceptor: true,
      enableMonitoringDashboard: true,
    };
  }

  /**
   * Create configuration for development environments
   */
  static forDevelopment(): Partial<GlobalParlantIntegrationConfig> {
    return {
      enableUniversalMiddleware: true,
      enableGlobalInterceptor: false, // Reduce overhead in dev
      enableMonitoringDashboard: true,
      performance: {
        enableCaching: false, // Disable caching for development
        cacheTtl: 60000,
        maxConcurrentValidations: 100,
        validationTimeoutMs: 10000,
      },
      monitoring: {
        enableAuditLogging: true,
        enableMetrics: true,
        enableAlerting: false,
        metricsInterval: 30000,
      },
      security: {
        defaultSecurityLevel: SecurityLevel._LOW,
        enableRiskBasedAssignment: true,
        enableComplianceReporting: false,
      },
    };
  }

  /**
   * Create configuration for maximum security environments
   */
  static forMaximumSecurity(): Partial<GlobalParlantIntegrationConfig> {
    return {
      security: {
        defaultSecurityLevel: SecurityLevel._HIGH,
        enableRiskBasedAssignment: true,
        enableComplianceReporting: true,
      },
      performance: {
        enableCaching: false, // Disable caching for maximum security
        cacheTtl: 0,
        maxConcurrentValidations: 500,
        validationTimeoutMs: 15000,
      },
      monitoring: {
        enableAuditLogging: true,
        enableMetrics: true,
        enableAlerting: true,
        metricsInterval: 10000, // Every 10 seconds
      },
    };
  }

  /**
   * Create configuration for ultra-high-throughput scenarios with maximum performance optimization
   */
  static forUltraHighThroughput(): Partial<GlobalParlantIntegrationConfig> {
    return {
      performance: {
        enableCaching: true,
        cacheTtl: 1800000, // 30 minutes for maximum stability
        maxConcurrentValidations: 25000, // Maximum concurrent processing
        validationTimeoutMs: 1500, // Very fast timeout for maximum throughput
      },
      monitoring: {
        enableAuditLogging: false, // Disable for maximum performance
        enableMetrics: true,
        enableAlerting: true,
        metricsInterval: 30000, // Very frequent monitoring
      },
      security: {
        defaultSecurityLevel: SecurityLevel._MEDIUM, // Balanced security for performance
        enableRiskBasedAssignment: true,
        enableComplianceReporting: false, // Disable for performance
      },
      // Ultra-high-throughput specific configuration
      enableUniversalMiddleware: true,
      enableGlobalInterceptor: false, // Disable interceptor for maximum performance
      enableMonitoringDashboard: true,
    };
  }
}
