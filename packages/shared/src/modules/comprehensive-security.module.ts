/**
 * Comprehensive Security Module - Enterprise Security Framework
 *
 * This module provides a complete security framework for Bytebot microservices including:
 * - Comprehensive security middleware with CORS and CSP policies
 * - Real-time security monitoring and threat detection
 * - Environment-specific configurations and deployment support
 * - Security event logging and alerting system
 * - CSP violation reporting and nonce generation
 * - Attack pattern detection and automated response
 *
 * @fileoverview Enterprise security module with comprehensive protection
 * @version 2.0.0
 * @author Security Framework Implementation Specialist
 */

import { Module, Global, MiddlewareConsumer, NestModule } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { ComprehensiveSecurityMiddleware } from "../middleware/comprehensive-security.middleware";
import { SecurityMonitoringService } from "../services/security-monitoring.service";

/**
 * Service-specific security configurations
 */
export const SERVICE_SECURITY_CONFIGS = {
  "bytebot-agent": {
    enableSwagger: true,
    enableVNC: false,
    enableHSTS: true,
    securityLevel: "HIGH",
  },
  bytebotd: {
    enableSwagger: false,
    enableVNC: true,
    enableHSTS: true,
    securityLevel: "MAXIMUM",
  },
  "bytebot-ui": {
    enableSwagger: false,
    enableVNC: true, // For embedded VNC viewer
    enableHSTS: true,
    securityLevel: "STANDARD",
  },
} as const;

/**
 * Comprehensive Security Module
 *
 * Provides enterprise-grade security middleware and monitoring for all Bytebot services.
 * Automatically configures service-specific security policies and monitoring.
 */
@Global()
@Module({
  imports: [
    ConfigModule,
    EventEmitterModule.forRoot({
      // Event emitter configuration for security events
      wildcard: false,
      delimiter: ".",
      newListener: false,
      removeListener: false,
      maxListeners: 10,
      verboseMemoryLeak: true,
      ignoreErrors: false,
    }),
  ],
  providers: [
    ComprehensiveSecurityMiddleware,
    SecurityMonitoringService,
    {
      provide: "SECURITY_CONFIG",
      useFactory: (configService: ConfigService) => {
        const serviceName = configService.get("SERVICE_NAME", "unknown");
        const environment = configService.get("NODE_ENV", "development");

        // Get service-specific configuration
        const serviceConfig = SERVICE_SECURITY_CONFIGS[
          serviceName as keyof typeof SERVICE_SECURITY_CONFIGS
        ] || {
          enableSwagger: false,
          enableVNC: false,
          enableHSTS: true,
          securityLevel: "STANDARD",
        };

        return {
          serviceName,
          environment,
          ...serviceConfig,
          customOrigins: configService
            .get("CORS_ORIGINS", "")
            .split(",")
            .filter(Boolean),
          enableSecurityLogging: environment !== "test",
          enableCSPReporting:
            configService.get("ENABLE_CSP_REPORTING", "true") === "true",
          enableRealTimeAlerting:
            configService.get("ENABLE_SECURITY_ALERTS", "true") === "true",
        };
      },
      inject: [ConfigService],
    },
  ],
  exports: [
    ComprehensiveSecurityMiddleware,
    SecurityMonitoringService,
    "SECURITY_CONFIG",
  ],
})
export class ComprehensiveSecurityModule implements NestModule {
  constructor(
    private readonly securityMiddleware: ComprehensiveSecurityMiddleware,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Configure middleware for all routes
   */
  configure(consumer: MiddlewareConsumer): void {
    // Apply security middleware to all routes
    consumer.apply(this.securityMiddleware).forRoutes("*");

    const serviceName = this.configService.get("SERVICE_NAME", "unknown");
    const environment = this.configService.get("NODE_ENV", "development");

    console.log(
      `🔒 Comprehensive Security Module configured for ${serviceName} in ${environment} environment`,
    );
  }
}

/**
 * Security Health Check Provider
 *
 * Provides health check endpoint for security middleware status
 */
export class SecurityHealthProvider {
  constructor(
    private readonly securityMonitoring: SecurityMonitoringService,
    private readonly securityMiddleware: ComprehensiveSecurityMiddleware,
  ) {}

  /**
   * Get security health status
   */
  async getSecurityHealth(): Promise<{
    status: "healthy" | "warning" | "critical";
    timestamp: Date;
    middleware: {
      active: boolean;
      config: any;
    };
    monitoring: {
      active: boolean;
      summary: any;
    };
    metrics: {
      eventsLastHour: number;
      alertsLastHour: number;
      criticalAlertsLast24h: number;
    };
  }> {
    try {
      const summary =
        await this.securityMonitoring.getSecurityDashboardSummary();
      const middlewareConfig = this.securityMiddleware.getSecurityConfig();

      const criticalAlertsLast24h = summary.recentAlerts.filter(
        (alert) =>
          alert.level === "critical" &&
          Date.now() - alert.timestamp.getTime() < 86400000,
      ).length;

      let status: "healthy" | "warning" | "critical" = "healthy";

      if (criticalAlertsLast24h > 0) {
        status = "critical";
      } else if (summary.highRiskEvents > 10) {
        status = "warning";
      }

      return {
        status,
        timestamp: new Date(),
        middleware: {
          active: true,
          config: {
            environment: middlewareConfig.environment,
            serviceName: middlewareConfig.serviceName,
            csp: middlewareConfig.enableCSP,
            hsts: middlewareConfig.enableHSTS,
            riskScoring: middlewareConfig.enableRiskScoring,
          },
        },
        monitoring: {
          active: true,
          summary: {
            totalEvents: summary.totalEvents,
            criticalAlerts: summary.criticalAlerts,
            highRiskEvents: summary.highRiskEvents,
            blockedRequests: summary.blockedRequests,
          },
        },
        metrics: {
          eventsLastHour: summary.totalEvents,
          alertsLastHour: summary.recentAlerts.length,
          criticalAlertsLast24h,
        },
      };
    } catch (error) {
      return {
        status: "critical",
        timestamp: new Date(),
        middleware: {
          active: false,
          config: null,
        },
        monitoring: {
          active: false,
          summary: null,
        },
        metrics: {
          eventsLastHour: 0,
          alertsLastHour: 0,
          criticalAlertsLast24h: 0,
        },
      };
    }
  }
}

/**
 * Security Deployment Helper
 *
 * Provides utilities for deploying security configurations across services
 */
export class SecurityDeploymentHelper {
  /**
   * Validate environment configuration for security deployment
   */
  static validateEnvironmentConfig(configService: ConfigService): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    const environment = configService.get("NODE_ENV");
    const serviceName = configService.get("SERVICE_NAME");

    // Required configuration validation
    if (!environment) {
      errors.push("NODE_ENV is required");
    }

    if (!serviceName) {
      warnings.push("SERVICE_NAME not set, using default configuration");
    }

    // Production-specific validations
    if (environment === "production") {
      const corsOrigins = configService.get("CORS_ORIGINS");
      if (!corsOrigins || corsOrigins.includes("localhost")) {
        errors.push("Production CORS_ORIGINS must not include localhost");
      }

      const jwtSecret = configService.get("JWT_SECRET");
      if (!jwtSecret || jwtSecret.length < 32) {
        errors.push("JWT_SECRET must be at least 32 characters in production");
      }

      const enableHSTS = configService.get("ENABLE_HSTS", "true");
      if (enableHSTS !== "true") {
        warnings.push("HSTS should be enabled in production");
      }
    }

    // Security feature validations
    const enableCSPReporting = configService.get("ENABLE_CSP_REPORTING");
    if (enableCSPReporting === undefined) {
      warnings.push("ENABLE_CSP_REPORTING not configured, using default");
    }

    const enableSecurityAlerts = configService.get("ENABLE_SECURITY_ALERTS");
    if (enableSecurityAlerts === undefined) {
      warnings.push("ENABLE_SECURITY_ALERTS not configured, using default");
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get recommended security configuration for service and environment
   */
  static getRecommendedConfig(
    serviceName: string,
    environment: string,
  ): Record<string, any> {
    const baseConfig = {
      NODE_ENV: environment,
      SERVICE_NAME: serviceName,
      ENABLE_SECURITY_LOGGING: environment !== "test",
      ENABLE_CSP_REPORTING: environment !== "production", // Disable in prod to reduce noise
      ENABLE_SECURITY_ALERTS: "true",
    };

    const serviceConfig =
      SERVICE_SECURITY_CONFIGS[
        serviceName as keyof typeof SERVICE_SECURITY_CONFIGS
      ];
    if (serviceConfig) {
      return {
        ...baseConfig,
        ENABLE_SWAGGER:
          serviceConfig.enableSwagger && environment !== "production",
        ENABLE_VNC: serviceConfig.enableVNC,
        ENABLE_HSTS: serviceConfig.enableHSTS && environment === "production",
      };
    }

    return baseConfig;
  }

  /**
   * Generate security configuration documentation
   */
  static generateSecurityConfigDocs(serviceName: string): string {
    const config =
      SERVICE_SECURITY_CONFIGS[
        serviceName as keyof typeof SERVICE_SECURITY_CONFIGS
      ];

    return `
# Security Configuration for ${serviceName}

## Security Level: ${config?.securityLevel || "STANDARD"}

### Required Environment Variables:
- NODE_ENV=production|development|staging
- SERVICE_NAME=${serviceName}
- CORS_ORIGINS=https://app.bytebot.ai,https://bytebot.ai
- JWT_SECRET=<secure-random-key-32-chars-minimum>

### Optional Security Features:
- ENABLE_CSP_REPORTING=${config?.enableSwagger ? "true" : "false"} # CSP violation reporting
- ENABLE_SECURITY_ALERTS=true # Real-time security alerting
- ENABLE_HSTS=${config?.enableHSTS ? "true" : "false"} # HTTP Strict Transport Security
- ENABLE_SWAGGER=${config?.enableSwagger ? "true" : "false"} # API documentation (dev only)
- ENABLE_VNC=${config?.enableVNC ? "true" : "false"} # VNC viewer support

### Security Headers Applied:
- Content-Security-Policy with dynamic nonce generation
- HTTP Strict Transport Security (production only)
- X-Frame-Options: ${config?.enableVNC ? "SAMEORIGIN" : "DENY"}
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin

### CORS Policy:
- Environment-specific origin validation
- Support for WebSocket connections
- Credentials included for authenticated requests
- Preflight caching: 24h production, 1h development

### Monitoring & Alerting:
- Real-time security event processing
- Attack pattern detection (CORS floods, CSP bypasses, brute force)
- Risk scoring with automated threat response
- Security metrics collection and dashboard integration
`;
  }
}

export default ComprehensiveSecurityModule;
