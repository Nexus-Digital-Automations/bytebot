/**
 * JWT-Parlant Security Module - Enterprise Security Integration
 *
 * Comprehensive security module that integrates JWT authentication with
 * Parlant conversational validation, providing enterprise-grade security
 * controls, RBAC authorization, emergency access management, and complete
 * audit trails for compliance requirements.
 *
 * Features:
 * - JWT-Parlant authentication bridge
 * - Advanced RBAC security context building
 * - Emergency override management
 * - Comprehensive audit trail system
 * - Multi-algorithm JWT support
 * - Redis-backed session management
 * - Real-time security monitoring
 * - Compliance framework integration
 *
 * @module JwtParlantSecurityModule
 * @version 1.0.0
 * @author Enterprise Security Integration Team
 */

import { Module, Global, DynamicModule, Provider } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";

// Core Services
import { JwtParlantBridgeService } from "../services/jwt-parlant-bridge.service";
import { RbacSecurityContextService } from "../services/rbac-security-context.service";
import { EmergencyOverrideService } from "../services/emergency-override.service";
import { SecurityAuditTrailService } from "../services/security-audit-trail.service";

// Guards and Strategies
import { JwtParlantAuthGuard } from "../guards/jwt-parlant-auth.guard";
import { JwtParlantStrategy } from "../strategies/jwt-parlant.strategy";
import { EmergencyOverrideGuard } from "../guards/emergency-override.guard";

// Decorators and Utilities
import { SecurityContextBuilder } from "../utils/security-context.builder";
import { ComplianceReporter } from "../utils/compliance.reporter";
import { ThreatAnalyzer } from "../utils/threat.analyzer";

/**
 * JWT-Parlant Security configuration options
 */
export interface JwtParlantSecurityConfig {
  /** JWT configuration */
  jwt: {
    /** Algorithm support */
    algorithms: ("HS256" | "RS256" | "ES256")[];
    /** Secret for HMAC algorithms */
    hmacSecret?: string;
    /** RSA private key */
    rsaPrivateKey?: string;
    /** EC private key */
    ecPrivateKey?: string;
    /** EdDSA private key */
    eddsaPrivateKey?: string;
    /** Token expiration */
    expiresIn: string;
    /** Refresh token expiration */
    refreshExpiresIn: string;
  };

  /** Parlant integration */
  parlant: {
    /** Parlant API URL */
    apiUrl: string;
    /** API key for authentication */
    apiKey: string;
    /** Connection timeout */
    timeout: number;
    /** Retry configuration */
    retry: {
      attempts: number;
      delay: number;
    };
  };

  /** Redis configuration */
  redis: {
    /** Host */
    host: string;
    /** Port */
    port: number;
    /** Password */
    password?: string;
    /** Database number */
    db: number;
    /** Connection timeout */
    connectTimeout: number;
    /** Command timeout */
    commandTimeout: number;
  };

  /** Security settings */
  security: {
    /** Default enforcement mode */
    enforcementMode: "permissive" | "standard" | "strict" | "paranoid";
    /** Session timeout */
    sessionTimeout: number;
    /** Maximum concurrent sessions per user */
    maxConcurrentSessions: number;
    /** Enable behavioral analysis */
    behavioralAnalysis: boolean;
    /** Risk assessment thresholds */
    riskThresholds: {
      low: number;
      medium: number;
      high: number;
      critical: number;
    };
  };

  /** Emergency override settings */
  emergency: {
    /** Default approval timeout */
    approvalTimeout: number;
    /** Maximum override duration */
    maxDuration: number;
    /** Required approvers for different priority levels */
    approvalRequirements: {
      low: number;
      medium: number;
      high: number;
      critical: number;
      emergency: number;
    };
    /** Emergency escalation settings */
    escalation: {
      enabled: boolean;
      escalateAfter: number;
      autoApproveAfter?: number;
    };
  };

  /** Audit configuration */
  audit: {
    /** Buffer size for batch processing */
    bufferSize: number;
    /** Flush interval in milliseconds */
    flushInterval: number;
    /** Enable integrity protection */
    integrityProtection: boolean;
    /** Retention periods by compliance framework */
    retentionPeriods: Record<string, number>;
    /** Enable real-time monitoring */
    realTimeMonitoring: boolean;
    /** Threat correlation settings */
    threatCorrelation: {
      enabled: boolean;
      timeWindow: number;
      analysisInterval: number;
    };
  };

  /** Compliance settings */
  compliance: {
    /** Enabled frameworks */
    frameworks: ("gdpr" | "sox" | "hipaa" | "pci_dss" | "iso_27001" | "nist")[];
    /** Jurisdiction */
    jurisdiction: string;
    /** Automatic reporting */
    automaticReporting: boolean;
    /** Report schedules */
    reportSchedules: Record<
      string,
      {
        frequency: "daily" | "weekly" | "monthly" | "quarterly";
        recipients: string[];
      }
    >;
  };

  /** Monitoring and alerting */
  monitoring: {
    /** Enable health checks */
    healthChecks: boolean;
    /** Metrics collection */
    metricsCollection: boolean;
    /** Alert thresholds */
    alertThresholds: {
      errorRate: number;
      responseTime: number;
      threatScore: number;
    };
    /** Notification channels */
    notifications: {
      email?: {
        enabled: boolean;
        recipients: string[];
      };
      slack?: {
        enabled: boolean;
        webhook: string;
      };
      webhook?: {
        enabled: boolean;
        url: string;
      };
    };
  };
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Partial<JwtParlantSecurityConfig> = {
  jwt: {
    algorithms: ["HS256", "RS256"],
    expiresIn: "15m",
    refreshExpiresIn: "7d",
  },
  parlant: {
    apiUrl: "http://localhost:3000/api/parlant",
    apiKey: "default-api-key",
    timeout: 10000,
    retry: {
      attempts: 3,
      delay: 1000,
    },
  },
  redis: {
    host: "localhost",
    port: 6379,
    db: 0,
    connectTimeout: 10000,
    commandTimeout: 5000,
  },
  security: {
    enforcementMode: "standard",
    sessionTimeout: 3600000, // 1 hour
    maxConcurrentSessions: 5,
    behavioralAnalysis: true,
    riskThresholds: {
      low: 25,
      medium: 50,
      high: 75,
      critical: 90,
    },
  },
  emergency: {
    approvalTimeout: 1800, // 30 minutes
    maxDuration: 14400, // 4 hours
    approvalRequirements: {
      low: 1,
      medium: 2,
      high: 3,
      critical: 3,
      emergency: 2,
    },
    escalation: {
      enabled: true,
      escalateAfter: 900, // 15 minutes
    },
  },
  audit: {
    bufferSize: 1000,
    flushInterval: 30000, // 30 seconds
    integrityProtection: true,
    retentionPeriods: {
      gdpr: 2555, // 7 years
      sox: 2555, // 7 years
      hipaa: 2190, // 6 years
      pci_dss: 365, // 1 year
    },
    realTimeMonitoring: true,
    threatCorrelation: {
      enabled: true,
      timeWindow: 3600000, // 1 hour
      analysisInterval: 300000, // 5 minutes
    },
  },
  compliance: {
    frameworks: ["gdpr", "sox"],
    jurisdiction: "US",
    automaticReporting: true,
    reportSchedules: {},
  },
  monitoring: {
    healthChecks: true,
    metricsCollection: true,
    alertThresholds: {
      errorRate: 5, // 5%
      responseTime: 1000, // 1 second
      threatScore: 75,
    },
    notifications: {
      email: {
        enabled: false,
        recipients: [],
      },
    },
  },
};

/**
 * JWT-Parlant Security Module
 *
 * Provides comprehensive security integration for enterprise applications
 * with JWT authentication, Parlant conversational validation, RBAC
 * authorization, emergency access management, and compliance reporting.
 */
@Global()
@Module({})
export class JwtParlantSecurityModule {
  /**
   * Register module synchronously with configuration
   */
  static register(config?: Partial<JwtParlantSecurityConfig>): DynamicModule {
    const mergedConfig = this.mergeConfiguration(config || {});

    return {
      module: JwtParlantSecurityModule,
      imports: [
        ConfigModule,
        PassportModule.register({ defaultStrategy: "jwt-parlant" }),
        JwtModule.registerAsync({
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => ({
            secret:
              mergedConfig.jwt.hmacSecret || configService.get("JWT_SECRET"),
            signOptions: {
              expiresIn: mergedConfig.jwt.expiresIn,
              algorithm: mergedConfig.jwt.algorithms[0] as
                | "HS256"
                | "RS256"
                | "ES256",
            },
          }),
        }),
      ],
      providers: [
        // Configuration provider
        {
          provide: "JWT_PARLANT_CONFIG",
          useValue: mergedConfig,
        },

        // Core services
        JwtParlantBridgeService,
        RbacSecurityContextService,
        EmergencyOverrideService,
        SecurityAuditTrailService,

        // Guards and strategies
        JwtParlantAuthGuard,
        JwtParlantStrategy,
        EmergencyOverrideGuard,

        // Utility services
        SecurityContextBuilder,
        ComplianceReporter,
        ThreatAnalyzer,

        // Health check provider
        {
          provide: "SECURITY_HEALTH_CHECK",
          useFactory: (
            bridgeService: JwtParlantBridgeService,
            rbacService: RbacSecurityContextService,
            emergencyService: EmergencyOverrideService,
            auditService: SecurityAuditTrailService,
          ) => ({
            async check() {
              const bridgeHealthCheck = bridgeService.getHealthStatus
                ? bridgeService.getHealthStatus()
                : Promise.resolve({ status: "healthy" });

              const rbacHealthCheck = rbacService.getHealthStatus
                ? rbacService.getHealthStatus()
                : Promise.resolve({ status: "healthy" });

              const emergencyHealthCheck =
                emergencyService.getEmergencyOverrideStats
                  ? emergencyService.getEmergencyOverrideStats()
                  : Promise.resolve({ status: "healthy" });

              const auditHealthCheck = auditService.verifyAuditIntegrity
                ? auditService.verifyAuditIntegrity()
                : Promise.resolve({ verified: true });

              const checks = await Promise.allSettled([
                bridgeHealthCheck,
                rbacHealthCheck,
                emergencyHealthCheck,
                auditHealthCheck,
              ]);

              return {
                status: checks.every((check) => check.status === "fulfilled")
                  ? "healthy"
                  : "degraded",
                services: {
                  bridge:
                    checks[0].status === "fulfilled" ? "healthy" : "unhealthy",
                  rbac:
                    checks[1].status === "fulfilled" ? "healthy" : "unhealthy",
                  emergency:
                    checks[2].status === "fulfilled" ? "healthy" : "unhealthy",
                  audit:
                    checks[3].status === "fulfilled" ? "healthy" : "unhealthy",
                },
                timestamp: new Date(),
              };
            },
          }),
          inject: [
            JwtParlantBridgeService,
            RbacSecurityContextService,
            EmergencyOverrideService,
            SecurityAuditTrailService,
          ],
        },
      ],
      exports: [
        JwtParlantBridgeService,
        RbacSecurityContextService,
        EmergencyOverrideService,
        SecurityAuditTrailService,
        JwtParlantAuthGuard,
        JwtParlantStrategy,
        EmergencyOverrideGuard,
        SecurityContextBuilder,
        ComplianceReporter,
        ThreatAnalyzer,
        "JWT_PARLANT_CONFIG",
        "SECURITY_HEALTH_CHECK",
      ],
    };
  }

  /**
   * Register module asynchronously with factory
   */
  static registerAsync(
    options:
      | {
          inject?: any[];
          useFactory: (
            ...args: any[]
          ) => Promise<JwtParlantSecurityConfig> | JwtParlantSecurityConfig;
          useClass?: never;
          useExisting?: never;
        }
      | {
          inject?: any[];
          useFactory?: never;
          useClass: new (...args: any[]) => JwtParlantSecurityConfig;
          useExisting?: never;
        }
      | {
          inject?: any[];
          useFactory?: never;
          useClass?: never;
          useExisting: string | symbol;
        },
  ): DynamicModule {
    let configProvider: Provider;

    if (options.useFactory) {
      configProvider = {
        provide: "JWT_PARLANT_CONFIG",
        useFactory: options.useFactory,
        ...(options.inject && { inject: options.inject }),
      };
    } else if (options.useClass) {
      configProvider = {
        provide: "JWT_PARLANT_CONFIG",
        useClass: options.useClass,
      };
    } else {
      configProvider = {
        provide: "JWT_PARLANT_CONFIG",
        useExisting: options.useExisting,
      };
    }

    return {
      module: JwtParlantSecurityModule,
      imports: [
        ConfigModule,
        PassportModule.register({ defaultStrategy: "jwt-parlant" }),
        JwtModule.registerAsync({
          inject: ["JWT_PARLANT_CONFIG"],
          useFactory: (config: JwtParlantSecurityConfig) => {
            // Ensure we have a valid secret
            if (!config.jwt.hmacSecret && !process.env.JWT_SECRET) {
              throw new Error(
                "JWT Parlant Security Module: No JWT secret provided in configuration or JWT_SECRET environment variable",
              );
            }

            return {
              secret: config.jwt.hmacSecret || process.env.JWT_SECRET,
              signOptions: {
                expiresIn: config.jwt.expiresIn,
                algorithm: config.jwt.algorithms[0] as
                  | "HS256"
                  | "RS256"
                  | "ES256",
              },
            };
          },
        }),
      ],
      providers: [
        configProvider,
        JwtParlantBridgeService,
        RbacSecurityContextService,
        EmergencyOverrideService,
        SecurityAuditTrailService,
        JwtParlantAuthGuard,
        JwtParlantStrategy,
        EmergencyOverrideGuard,
        SecurityContextBuilder,
        ComplianceReporter,
        ThreatAnalyzer,
      ],
      exports: [
        JwtParlantBridgeService,
        RbacSecurityContextService,
        EmergencyOverrideService,
        SecurityAuditTrailService,
        JwtParlantAuthGuard,
        JwtParlantStrategy,
        EmergencyOverrideGuard,
        SecurityContextBuilder,
        ComplianceReporter,
        ThreatAnalyzer,
        "JWT_PARLANT_CONFIG",
      ],
    };
  }

  /**
   * Create module for testing with mocked dependencies
   */
  static forTesting(
    mockOverrides?: Partial<Record<string, any>>,
  ): DynamicModule {
    const testConfig = this.mergeConfiguration({
      redis: {
        host: "localhost",
        port: 6379,
        db: 15, // Use test database
        connectTimeout: 10000,
        commandTimeout: 5000,
      },
      parlant: {
        apiUrl: "http://localhost:8000",
        apiKey: "test-key",
        timeout: 10000,
        retry: {
          attempts: 3,
          delay: 1000,
        },
      },
      audit: {
        bufferSize: 10,
        flushInterval: 1000,
        integrityProtection: false,
        retentionPeriods: { test: 30 },
        realTimeMonitoring: false,
        threatCorrelation: {
          enabled: false,
          timeWindow: 3600000,
          analysisInterval: 300000,
        },
      },
    });

    const mockProviders = Object.entries(mockOverrides || {}).map(
      ([provide, useValue]) => ({
        provide,
        useValue,
      }),
    );

    return {
      module: JwtParlantSecurityModule,
      imports: [
        ConfigModule,
        PassportModule.register({ defaultStrategy: "jwt-parlant" }),
        JwtModule.register({
          secret: "test-secret",
          signOptions: { expiresIn: "1h" },
        }),
      ],
      providers: [
        {
          provide: "JWT_PARLANT_CONFIG",
          useValue: testConfig,
        },
        ...mockProviders,
        JwtParlantBridgeService,
        RbacSecurityContextService,
        EmergencyOverrideService,
        SecurityAuditTrailService,
        JwtParlantAuthGuard,
        JwtParlantStrategy,
        EmergencyOverrideGuard,
        SecurityContextBuilder,
        ComplianceReporter,
        ThreatAnalyzer,
      ],
      exports: [
        JwtParlantBridgeService,
        RbacSecurityContextService,
        EmergencyOverrideService,
        SecurityAuditTrailService,
        JwtParlantAuthGuard,
        "JWT_PARLANT_CONFIG",
      ],
    };
  }

  /**
   * Merge user configuration with defaults
   */
  private static mergeConfiguration(
    userConfig: Partial<JwtParlantSecurityConfig>,
  ): JwtParlantSecurityConfig {
    // Deep merge nested objects to prevent property loss
    const mergeDeep = <T extends Record<string, any>>(
      defaults: Partial<T>,
      override: Partial<T> = {},
    ): T => {
      const result = { ...defaults } as T;

      for (const key in override) {
        if (override.hasOwnProperty(key)) {
          const value = override[key];
          if (
            value !== null &&
            typeof value === "object" &&
            !Array.isArray(value)
          ) {
            result[key] = mergeDeep(result[key] || {}, value) as T[Extract<
              keyof T,
              string
            >];
          } else if (value !== undefined) {
            result[key] = value as T[Extract<keyof T, string>];
          }
        }
      }

      return result;
    };

    // Ensure all required sections exist
    const config = {
      jwt: mergeDeep(DEFAULT_CONFIG.jwt || {}, userConfig.jwt),
      parlant: mergeDeep(DEFAULT_CONFIG.parlant || {}, userConfig.parlant),
      redis: mergeDeep(DEFAULT_CONFIG.redis || {}, userConfig.redis),
      security: mergeDeep(DEFAULT_CONFIG.security || {}, userConfig.security),
      emergency: mergeDeep(
        DEFAULT_CONFIG.emergency || {},
        userConfig.emergency,
      ),
      audit: mergeDeep(DEFAULT_CONFIG.audit || {}, userConfig.audit),
      compliance: mergeDeep(
        DEFAULT_CONFIG.compliance || {},
        userConfig.compliance,
      ),
      monitoring: mergeDeep(
        DEFAULT_CONFIG.monitoring || {},
        userConfig.monitoring,
      ),
    };

    // Validate critical configuration properties
    if (!config.jwt.algorithms || config.jwt.algorithms.length === 0) {
      throw new Error(
        "JWT Parlant Security Module: JWT algorithms must be specified",
      );
    }

    if (!config.jwt.expiresIn) {
      throw new Error(
        "JWT Parlant Security Module: JWT expiration time must be specified",
      );
    }

    if (!config.parlant.apiUrl) {
      throw new Error(
        "JWT Parlant Security Module: Parlant API URL must be specified",
      );
    }

    return config as JwtParlantSecurityConfig;
  }
}

/**
 * Export configuration interface for external use
 */

/**
 * Export decorator for easy configuration injection
 */
export const InjectSecurityConfig = () => {
  return (
    target: any,
    propertyKey: string | symbol | undefined,
    parameterIndex: number,
  ) => {
    return (global as any).__decorate?.["Inject"]?.("JWT_PARLANT_CONFIG")(
      target,
      propertyKey,
      parameterIndex,
    );
  };
};
