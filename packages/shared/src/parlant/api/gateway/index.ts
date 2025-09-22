/**
 * @fileoverview PARLANT Enterprise API Gateway - Main Export Index
 *
 * Central export file for all PARLANT Enterprise API Gateway components.
 * Provides comprehensive enterprise-grade API gateway functionality with
 * conversational validation, intelligent security, and real-time analytics.
 *
 * @version 1.0.0
 * @author AIgent Enterprise Gateway Team
 * @since 2025-09-21
 */

// Core Module Export
export {
  ParlantEnterpriseGatewayModule,
  DEFAULT_PARLANT_GATEWAY_CONFIG,
  DEFAULT_FEATURE_FLAGS,
  PARLANT_GATEWAY_CONFIG,
  validateParlantGatewayConfig,
  mergeParlantGatewayConfigs,
} from "./parlant-enterprise-gateway.module";

// Service Exports
export { ParlantEnterpriseGatewayMiddlewareService } from "./parlant-enterprise-gateway-middleware.service";
export { ParlantSecurityAuthenticationIntegrationService } from "./parlant-security-authentication-integration.service";
export { ParlantPerformanceMonitoringAnalyticsService } from "./parlant-performance-monitoring-analytics.service";
export { ParlantEnterpriseGatewayOrchestratorService } from "./parlant-enterprise-gateway-orchestrator.service";

// Interface Exports
export * from "../interfaces/gateway.interface";

// Configuration Type Exports
export type {
  ParlantEnterpriseGatewayConfig,
  ParlantGatewayFeatureFlags,
  ParlantEnterpriseGatewayModuleOptions,
  ParlantEnterpriseGatewayModuleAsyncOptions,
  ExternalServiceConfig,
  WebhookConfig,
  CallbackConfig,
  RetryConfig,
  FallbackConfig,
  RetentionPolicyConfig,
  RegulatoryRequirementConfig,
} from "./parlant-enterprise-gateway.module";

/**
 * Version Information
 */
export const PARLANT_GATEWAY_VERSION = "1.0.0";
export const PARLANT_GATEWAY_BUILD_DATE = "2025-09-21";
export const PARLANT_GATEWAY_AUTHOR = "AIgent Enterprise Gateway Team";

/**
 * Feature Compatibility Matrix
 */
export const FEATURE_COMPATIBILITY = {
  nodejs: ">=18.0.0",
  nestjs: ">=10.0.0",
  typescript: ">=5.0.0",
  rxjs: ">=7.0.0",
  "class-validator": ">=0.14.0",
  "class-transformer": ">=0.5.0",
};

/**
 * Supported Platforms
 */
export const SUPPORTED_PLATFORMS = ["linux", "darwin", "win32"] as const;

/**
 * Supported Environments
 */
export const SUPPORTED_ENVIRONMENTS = [
  "development",
  "staging",
  "production",
] as const;

/**
 * Performance Benchmarks
 */
export const PERFORMANCE_BENCHMARKS = {
  targetThroughput: "10,000+ requests/second",
  maxLatencyP95: "<100ms",
  maxLatencyP99: "<250ms",
  maxErrorRate: "<1%",
  availabilityTarget: ">99.9%",
  securityScanTime: "<50ms",
  validationTime: "<200ms",
} as const;

/**
 * Quick Start Configuration Templates
 */
export const QUICK_START_TEMPLATES = {
  development: {
    gateway: {
      enabled: true,
      environment: "development" as const,
    },
    performance: {
      targetThroughput: 1000,
      maxLatencyP95: 200,
      cacheEnabled: true,
    },
    security: {
      threatDetectionSensitivity: "MEDIUM" as const,
      authenticationRequired: true,
    },
    analytics: {
      enabled: true,
      realTimeAnalytics: true,
    },
  },
  production: {
    gateway: {
      enabled: true,
      environment: "production" as const,
    },
    performance: {
      targetThroughput: 15000,
      maxLatencyP95: 100,
      cacheEnabled: true,
    },
    security: {
      threatDetectionSensitivity: "HIGH" as const,
      authenticationRequired: true,
      auditingEnabled: true,
    },
    analytics: {
      enabled: true,
      realTimeAnalytics: true,
      predictiveAnalytics: true,
    },
  },
} as const;

/**
 * Integration Examples
 */
export const INTEGRATION_EXAMPLES = {
  basicSetup: `
import { Module } from '@nestjs/common';
import { ParlantEnterpriseGatewayModule } from '@parlant/enterprise-gateway';

@Module({
  imports: [
    ParlantEnterpriseGatewayModule.forRoot({
      config: {
        gateway: {
          enabled: true,
          environment: 'production',
        },
        performance: {
          targetThroughput: 10000,
          maxLatencyP95: 100,
        },
      },
    }),
  ],
})
export class AppModule {}
  `,

  asyncSetup: `
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ParlantEnterpriseGatewayModule } from '@parlant/enterprise-gateway';

@Module({
  imports: [
    ConfigModule.forRoot(),
    ParlantEnterpriseGatewayModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        config: {
          gateway: {
            enabled: configService.get('PARLANT_ENABLED', true),
            environment: configService.get('NODE_ENV', 'development'),
          },
          integration: {
            parlantEndpoint: configService.get('PARLANT_ENDPOINT'),
            parlantApiKey: configService.get('PARLANT_API_KEY'),
          },
        },
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
  `,

  customController: `
import { Controller, Post, Body, Inject } from '@nestjs/common';
import {
  ParlantEnterpriseGatewayOrchestratorService,
  APIRequest
} from '@parlant/enterprise-gateway';

@Controller('api')
export class ApiController {
  constructor(
    private readonly orchestrator: ParlantEnterpriseGatewayOrchestratorService,
  ) {}

  @Post('process')
  async processRequest(@Body() request: APIRequest) {
    return await this.orchestrator.orchestrateAPIRequest(request);
  }
}
  `,

  middleware: `
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ParlantEnterpriseGatewayMiddlewareService } from '@parlant/enterprise-gateway';

@Injectable()
export class GatewayMiddleware implements NestMiddleware {
  constructor(
    private readonly gatewayMiddleware: ParlantEnterpriseGatewayMiddlewareService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const apiRequest = this.transformRequestToAPIRequest(req);
    const validationResult = await this.gatewayMiddleware.processConversationalValidation(apiRequest);

    if (validationResult.approved) {
      next();
    } else {
      res.status(403).json({
        error: 'Request validation failed',
        explanation: validationResult.explanation,
      });
    }
  }

  private transformRequestToAPIRequest(req: Request): any {
    // Transform Express request to APIRequest format
    return {
      id: req.headers['x-request-id'] || 'generated-id',
      endpoint: req.path,
      method: req.method,
      headers: req.headers,
      parameters: { ...req.query, ...req.params },
      body: req.body,
      userContext: {
        userId: req.user?.id,
        roles: req.user?.roles || [],
        permissions: req.user?.permissions || [],
        sessionId: req.sessionID,
        authLevel: 'BASIC',
      },
      securityLevel: 'MEDIUM',
      operation: {
        type: 'API_CALL',
        id: req.path,
        name: \`\${req.method} \${req.path}\`,
        description: 'API request processing',
        baselineExecutionTime: 100,
        currentState: {
          phase: 'VALIDATION',
          status: 'PENDING',
          startTime: new Date(),
          currentStep: 'initial',
          totalSteps: 1,
          completedSteps: 0,
        },
        progress: {
          percentage: 0,
          estimatedTimeRemaining: 100,
          currentActivity: 'Processing request',
          milestones: [],
        },
        userContext: req.user,
        securityLevel: 'MEDIUM',
      },
    };
  }
}
  `,
} as const;

/**
 * Troubleshooting Guide
 */
export const TROUBLESHOOTING_GUIDE = {
  commonIssues: {
    "High Latency": [
      "Check performance configuration targets",
      "Enable caching if not already enabled",
      "Review concurrent request limits",
      "Analyze performance metrics dashboard",
    ],
    "Security Validation Failures": [
      "Verify threat detection sensitivity settings",
      "Check authentication and authorization configuration",
      "Review security audit logs",
      "Validate user context and permissions",
    ],
    "Rate Limiting Issues": [
      "Check rate limiting configuration",
      "Enable adaptive scaling",
      "Review negotiation settings",
      "Monitor usage patterns",
    ],
    "Analytics Not Working": [
      "Verify analytics configuration is enabled",
      "Check data retention settings",
      "Review dashboard configuration",
      "Validate metrics collection interval",
    ],
  },
  performanceOptimization: [
    "Enable intelligent caching",
    "Optimize database queries",
    "Implement request batching",
    "Configure proper load balancing",
    "Monitor resource utilization",
    "Enable predictive scaling",
  ],
  securityBestPractices: [
    "Enable comprehensive threat detection",
    "Implement multi-factor authentication",
    "Configure proper audit trails",
    "Regular security policy updates",
    "Monitor for security anomalies",
    "Enable compliance reporting",
  ],
} as const;

/**
 * Migration Guides
 */
export const MIGRATION_GUIDES = {
  fromV0ToV1: [
    "Update module imports to use new ParlantEnterpriseGatewayModule",
    "Migrate configuration to new format",
    "Update service injection patterns",
    "Review feature flag settings",
    "Test all integration points",
  ],
  configurationChanges: [
    "gateway.enabled replaces old isEnabled",
    "performance.targetThroughput replaces maxRequestsPerSecond",
    "security.threatDetectionSensitivity replaces securityLevel",
    "analytics.enabled replaces enableAnalytics",
  ],
} as const;

/**
 * Default Export - The Module
 */
export default ParlantEnterpriseGatewayModule;
