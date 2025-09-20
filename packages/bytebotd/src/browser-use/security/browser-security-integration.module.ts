/**
 * Browser Security Integration Module
 *
 * Comprehensive security module that integrates all browser automation security components:
 * - Authentication middleware with Parlant bridge integration
 * - Role-based access control (RBAC) guards
 * - Request validation and sanitization
 * - Advanced rate limiting with adaptive algorithms
 * - Comprehensive audit trail with compliance features
 * - Real-time security monitoring and alerting
 *
 * This module provides a unified security layer for all browser automation operations,
 * ensuring enterprise-grade security, compliance, and auditability.
 *
 * @module BrowserSecurityIntegrationModule
 * @version 1.0.0
 * @author Security Integration Architect
 */

import {
  Module,
  DynamicModule,
  Provider,
  Global,
  Logger,
} from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Core security components
import { BrowserUseAuthMiddleware } from '../middleware/browser-use-auth.middleware';
import { BrowserUseRbacGuard } from '../guards/browser-use-rbac.guard';
import { BrowserRequestValidatorService } from '../validators/browser-request-validator.service';
import { BrowserRateLimiterService } from '../rate-limiters/browser-rate-limiter.service';
import { BrowserAuditTrailService } from '../audit/browser-audit-trail.service';

// Parlant authentication integration
import { ParlantAuthenticationBridgeService } from '../../../shared/src/parlant/security/authentication-bridge.service';
import { EnhancedJwtParlantBridgeService } from '../../../shared/src/services/enhanced-jwt-parlant-bridge.service';
import { ParlantIntegrationService } from '../parlant/parlant-integration.service';

// Security services (defined in this file)
// These will be extracted to separate files in production

/**
 * Browser security configuration interface
 */
export interface BrowserSecurityConfig {
  // Authentication settings
  authentication: {
    enabled: boolean;
    requireMfa: boolean;
    sessionTimeout: number;
    maxConcurrentSessions: number;
    enforceTwoFactor: boolean;
    allowAnonymous: boolean;
  };

  // Authorization settings
  authorization: {
    enabled: boolean;
    strictMode: boolean;
    roleHierarchy: boolean;
    permissionCaching: boolean;
    conversationalApproval: boolean;
    emergencyOverride: boolean;
  };

  // Request validation settings
  validation: {
    enabled: boolean;
    strictMode: boolean;
    maxRequestSize: number;
    contentScanning: boolean;
    malwareDetection: boolean;
    sensitiveDataRedaction: boolean;
  };

  // Rate limiting settings
  rateLimiting: {
    enabled: boolean;
    adaptiveMode: boolean;
    globalLimits: boolean;
    userLimits: boolean;
    endpointLimits: boolean;
    circuitBreaker: boolean;
  };

  // Audit trail settings
  auditTrail: {
    enabled: boolean;
    realTimeStreaming: boolean;
    cryptographicIntegrity: boolean;
    complianceMode: boolean;
    retentionDays: number;
    sensitiveDataLogging: boolean;
  };

  // Monitoring and alerting
  monitoring: {
    enabled: boolean;
    realTimeAlerts: boolean;
    threatDetection: boolean;
    performanceMonitoring: boolean;
    complianceReporting: boolean;
    dashboardEnabled: boolean;
  };

  // Compliance settings
  compliance: {
    gdprMode: boolean;
    hipaaMode: boolean;
    soc2Mode: boolean;
    pciDssMode: boolean;
    automatedReporting: boolean;
    dataClassification: boolean;
  };
}

/**
 * Default browser security configuration
 */
const DEFAULT_SECURITY_CONFIG: BrowserSecurityConfig = {
  authentication: {
    enabled: true,
    requireMfa: false,
    sessionTimeout: 3600000, // 1 hour
    maxConcurrentSessions: 5,
    enforceTwoFactor: false,
    allowAnonymous: false,
  },
  authorization: {
    enabled: true,
    strictMode: false,
    roleHierarchy: true,
    permissionCaching: true,
    conversationalApproval: true,
    emergencyOverride: true,
  },
  validation: {
    enabled: true,
    strictMode: false,
    maxRequestSize: 10485760, // 10MB
    contentScanning: true,
    malwareDetection: false,
    sensitiveDataRedaction: true,
  },
  rateLimiting: {
    enabled: true,
    adaptiveMode: true,
    globalLimits: true,
    userLimits: true,
    endpointLimits: true,
    circuitBreaker: true,
  },
  auditTrail: {
    enabled: true,
    realTimeStreaming: true,
    cryptographicIntegrity: true,
    complianceMode: true,
    retentionDays: 2555, // 7 years
    sensitiveDataLogging: false,
  },
  monitoring: {
    enabled: true,
    realTimeAlerts: true,
    threatDetection: true,
    performanceMonitoring: true,
    complianceReporting: true,
    dashboardEnabled: true,
  },
  compliance: {
    gdprMode: true,
    hipaaMode: false,
    soc2Mode: true,
    pciDssMode: false,
    automatedReporting: true,
    dataClassification: true,
  },
};

/**
 * Browser Security Integration Module
 *
 * Comprehensive security integration module that provides:
 * - Unified configuration management
 * - Integrated security component orchestration
 * - Performance monitoring and optimization
 * - Compliance and audit capabilities
 * - Real-time threat detection and response
 */
@Global()
@Module({})
export class BrowserSecurityIntegrationModule {
  private static readonly logger = new Logger(BrowserSecurityIntegrationModule.name);

  /**
   * Create the browser security module with configuration
   */
  static forRoot(config?: Partial<BrowserSecurityConfig>): DynamicModule {
    const securityConfig = { ...DEFAULT_SECURITY_CONFIG, ...config };

    this.logger.log('🔐 Initializing Browser Security Integration Module');
    this.logger.log(`🛡️ Security features enabled: ${this.getEnabledFeatures(securityConfig).join(', ')}`);

    const providers: Provider[] = [
      // Configuration provider
      {
        provide: 'BROWSER_SECURITY_CONFIG',
        useValue: securityConfig,
      },

      // Core security services
      SecurityConfigurationService,
      ThreatDetectionService,
      SecurityDashboardService,

      // Authentication services
      {
        provide: ParlantAuthenticationBridgeService,
        useClass: ParlantAuthenticationBridgeService,
      },
      {
        provide: EnhancedJwtParlantBridgeService,
        useClass: EnhancedJwtParlantBridgeService,
      },

      // Parlant integration
      {
        provide: ParlantIntegrationService,
        useClass: ParlantIntegrationService,
      },

      // Security middleware and guards
      {
        provide: BrowserUseAuthMiddleware,
        useClass: BrowserUseAuthMiddleware,
      },
      {
        provide: APP_GUARD,
        useClass: BrowserUseRbacGuard,
      },

      // Validation and rate limiting
      {
        provide: BrowserRequestValidatorService,
        useClass: BrowserRequestValidatorService,
      },
      {
        provide: BrowserRateLimiterService,
        useClass: BrowserRateLimiterService,
      },

      // Audit trail
      {
        provide: BrowserAuditTrailService,
        useClass: BrowserAuditTrailService,
      },

      // Security interceptors
      {
        provide: APP_INTERCEPTOR,
        useClass: SecurityMetricsInterceptor,
      },
      {
        provide: APP_INTERCEPTOR,
        useClass: ComplianceMonitoringInterceptor,
      },
    ];

    // Add conditional providers based on configuration
    if (securityConfig.monitoring.enabled) {
      providers.push(
        SecurityDashboardService,
      );
    }

    if (securityConfig.monitoring.threatDetection) {
      providers.push(
        ThreatDetectionService,
      );
    }

    return {
      module: BrowserSecurityIntegrationModule,
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
      ],
      providers,
      exports: [
        'BROWSER_SECURITY_CONFIG',
        SecurityConfigurationService,
        BrowserUseAuthMiddleware,
        BrowserUseRbacGuard,
        BrowserRequestValidatorService,
        BrowserRateLimiterService,
        BrowserAuditTrailService,
        ThreatDetectionService,
        SecurityDashboardService,
        ParlantAuthenticationBridgeService,
        EnhancedJwtParlantBridgeService,
        ParlantIntegrationService,
      ],
    };
  }

  /**
   * Create async module with configuration from ConfigService
   */
  static forRootAsync(configFactory: {
    useFactory: (...args: any[]) => Promise<Partial<BrowserSecurityConfig>> | Partial<BrowserSecurityConfig>;
    inject?: any[];
  }): DynamicModule {
    return {
      module: BrowserSecurityIntegrationModule,
      imports: [ConfigModule],
      providers: [
        {
          provide: 'BROWSER_SECURITY_CONFIG',
          useFactory: async (...args: any[]) => {
            const userConfig = await configFactory.useFactory(...args);
            return { ...DEFAULT_SECURITY_CONFIG, ...userConfig };
          },
          inject: configFactory.inject || [],
        },
        // ... other providers (same as forRoot)
        SecurityConfigurationService,
        ThreatDetectionService,
        SecurityDashboardService,
        ParlantAuthenticationBridgeService,
        EnhancedJwtParlantBridgeService,
        ParlantIntegrationService,
        BrowserUseAuthMiddleware,
        {
          provide: APP_GUARD,
          useClass: BrowserUseRbacGuard,
        },
        BrowserRequestValidatorService,
        BrowserRateLimiterService,
        BrowserAuditTrailService,
        {
          provide: APP_INTERCEPTOR,
          useClass: SecurityMetricsInterceptor,
        },
        {
          provide: APP_INTERCEPTOR,
          useClass: ComplianceMonitoringInterceptor,
        },
      ],
      exports: [
        'BROWSER_SECURITY_CONFIG',
        SecurityConfigurationService,
        BrowserUseAuthMiddleware,
        BrowserUseRbacGuard,
        BrowserRequestValidatorService,
        BrowserRateLimiterService,
        BrowserAuditTrailService,
        ThreatDetectionService,
        SecurityDashboardService,
        ParlantAuthenticationBridgeService,
        EnhancedJwtParlantBridgeService,
        ParlantIntegrationService,
      ],
    };
  }

  /**
   * Get list of enabled security features
   */
  private static getEnabledFeatures(config: BrowserSecurityConfig): string[] {
    const features: string[] = [];

    if (config.authentication.enabled) features.push('Authentication');
    if (config.authorization.enabled) features.push('Authorization (RBAC)');
    if (config.validation.enabled) features.push('Request Validation');
    if (config.rateLimiting.enabled) features.push('Rate Limiting');
    if (config.auditTrail.enabled) features.push('Audit Trail');
    if (config.monitoring.enabled) features.push('Security Monitoring');
    if (config.monitoring.threatDetection) features.push('Threat Detection');
    if (config.compliance.gdprMode) features.push('GDPR Compliance');
    if (config.compliance.soc2Mode) features.push('SOC 2 Compliance');

    return features;
  }
}

/**
 * Security Metrics Interceptor
 *
 * Collects performance and security metrics for all browser automation requests
 */
@Injectable()
export class SecurityMetricsInterceptor {
  private readonly logger = new Logger(SecurityMetricsInterceptor.name);

  constructor(
    private readonly auditTrailService: BrowserAuditTrailService,
    private readonly securityDashboard: SecurityDashboardService,
  ) {}

  async intercept(context: any, next: any): Promise<any> {
    const startTime = performance.now();
    const request = context.switchToHttp().getRequest();

    try {
      const result = await next.handle();
      const processingTime = performance.now() - startTime;

      // Record successful operation metrics
      await this.recordOperationMetrics(request, 'SUCCESS', processingTime);

      return result;

    } catch (error) {
      const processingTime = performance.now() - startTime;

      // Record failed operation metrics
      await this.recordOperationMetrics(request, 'FAILURE', processingTime, error);

      throw error;
    }
  }

  private async recordOperationMetrics(
    request: any,
    outcome: 'SUCCESS' | 'FAILURE',
    processingTime: number,
    error?: any
  ): Promise<void> {
    try {
      // Update security dashboard metrics
      this.securityDashboard.recordOperationMetric({
        endpoint: request.url,
        method: request.method,
        outcome,
        processingTime,
        timestamp: new Date(),
        userId: request.user?.userId,
        sessionId: request.session?.sessionId,
        error: error instanceof Error ? error.message : undefined,
      });

    } catch (metricsError) {
      this.logger.error('Failed to record operation metrics', metricsError);
    }
  }
}

/**
 * Compliance Monitoring Interceptor
 *
 * Monitors all operations for compliance requirements and triggers alerts
 */
@Injectable()
export class ComplianceMonitoringInterceptor {
  private readonly logger = new Logger(ComplianceMonitoringInterceptor.name);

  constructor(
    private readonly auditTrailService: BrowserAuditTrailService,
    private readonly configService: SecurityConfigurationService,
  ) {}

  async intercept(context: any, next: any): Promise<any> {
    const request = context.switchToHttp().getRequest();

    // Pre-operation compliance checks
    await this.performPreOperationComplianceChecks(request);

    try {
      const result = await next.handle();

      // Post-operation compliance validation
      await this.performPostOperationComplianceChecks(request, result);

      return result;

    } catch (error) {
      // Record compliance failure
      await this.recordComplianceFailure(request, error);
      throw error;
    }
  }

  private async performPreOperationComplianceChecks(request: any): Promise<void> {
    const config = this.configService.getConfig();

    // Check for GDPR compliance requirements
    if (config.compliance.gdprMode) {
      await this.checkGdprCompliance(request);
    }

    // Check for SOC 2 compliance requirements
    if (config.compliance.soc2Mode) {
      await this.checkSoc2Compliance(request);
    }
  }

  private async performPostOperationComplianceChecks(request: any, result: any): Promise<void> {
    // Check for data classification requirements
    await this.checkDataClassification(request, result);

    // Check for retention policy compliance
    await this.checkRetentionCompliance(request, result);
  }

  private async checkGdprCompliance(request: any): Promise<void> {
    // Placeholder for GDPR compliance checks
    // Would implement actual GDPR validation logic
  }

  private async checkSoc2Compliance(request: any): Promise<void> {
    // Placeholder for SOC 2 compliance checks
    // Would implement actual SOC 2 validation logic
  }

  private async checkDataClassification(request: any, result: any): Promise<void> {
    // Placeholder for data classification checks
    // Would implement data classification validation
  }

  private async checkRetentionCompliance(request: any, result: any): Promise<void> {
    // Placeholder for retention policy compliance checks
    // Would implement retention policy validation
  }

  private async recordComplianceFailure(request: any, error: any): Promise<void> {
    try {
      await this.auditTrailService.recordEvent({
        eventType: BrowserAuditEventType.COMPLIANCE_VIOLATION,
        severity: AuditEventSeverity.HIGH,
        userId: request.user?.userId,
        sessionId: request.session?.sessionId,
        description: 'Compliance violation detected',
        resource: request.url,
        action: request.method,
        outcome: 'FAILURE',
        ipAddress: request.ip,
        userAgent: request.get('User-Agent'),
        data: {
          error: error instanceof Error ? error.message : String(error),
          compliance_check: 'pre_operation',
        },
        complianceFlags: ['COMPLIANCE_VIOLATION'],
      });
    } catch (auditError) {
      this.logger.error('Failed to record compliance failure', auditError);
    }
  }
}

/**
 * Threat Detection Service
 *
 * Advanced threat detection and response for browser automation operations
 */
@Injectable()
export class ThreatDetectionService {
  private readonly logger = new Logger(ThreatDetectionService.name);

  // Threat detection state
  private readonly threatIntelligence = new Map<string, ThreatIndicator>();
  private readonly behaviorProfiles = new Map<string, UserBehaviorProfile>();
  private readonly anomalyDetectors = new Map<string, AnomalyDetector>();

  constructor() {
    this.logger.log('🛡️ Threat Detection Service initialized');
    this.initializeAnomalyDetectors();
  }

  /**
   * Analyze request for threats
   */
  async analyzeRequest(request: any): Promise<ThreatAnalysisResult> {
    const threats: ThreatIndicator[] = [];

    // IP-based threat detection
    const ipThreats = await this.analyzeIpReputation(request.ip);
    threats.push(...ipThreats);

    // User behavior analysis
    const behaviorThreats = await this.analyzeBehaviorAnomalies(request);
    threats.push(...behaviorThreats);

    // Content analysis
    const contentThreats = await this.analyzeRequestContent(request);
    threats.push(...contentThreats);

    // Determine overall threat level
    const threatLevel = this.calculateThreatLevel(threats);

    return {
      threats,
      threatLevel,
      riskScore: this.calculateRiskScore(threats),
      recommended_action: this.determineRecommendedAction(threatLevel),
      confidence: this.calculateConfidence(threats),
    };
  }

  /**
   * Update user behavior profile
   */
  async updateBehaviorProfile(userId: string, request: any): Promise<void> {
    let profile = this.behaviorProfiles.get(userId);

    if (!profile) {
      profile = {
        userId,
        requestPatterns: [],
        timePatterns: [],
        locationPatterns: [],
        lastUpdated: new Date(),
        anomalyScore: 0,
      };
      this.behaviorProfiles.set(userId, profile);
    }

    // Update patterns
    profile.requestPatterns.push({
      endpoint: request.url,
      method: request.method,
      timestamp: new Date(),
      userAgent: request.get('User-Agent'),
      ipAddress: request.ip,
    });

    // Keep only recent patterns (last 100)
    if (profile.requestPatterns.length > 100) {
      profile.requestPatterns = profile.requestPatterns.slice(-100);
    }

    profile.lastUpdated = new Date();

    // Calculate new anomaly score
    profile.anomalyScore = this.calculateAnomalyScore(profile);
  }

  // Private helper methods (placeholder implementations)
  private initializeAnomalyDetectors(): void {
    // Initialize various anomaly detection algorithms
  }

  private async analyzeIpReputation(ipAddress: string): Promise<ThreatIndicator[]> {
    // Placeholder for IP reputation analysis
    return [];
  }

  private async analyzeBehaviorAnomalies(request: any): Promise<ThreatIndicator[]> {
    // Placeholder for behavior anomaly analysis
    return [];
  }

  private async analyzeRequestContent(request: any): Promise<ThreatIndicator[]> {
    // Placeholder for content analysis
    return [];
  }

  private calculateThreatLevel(threats: ThreatIndicator[]): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (threats.some(t => t.severity === 'CRITICAL')) return 'CRITICAL';
    if (threats.some(t => t.severity === 'HIGH')) return 'HIGH';
    if (threats.some(t => t.severity === 'MEDIUM')) return 'MEDIUM';
    return 'LOW';
  }

  private calculateRiskScore(threats: ThreatIndicator[]): number {
    return threats.reduce((score, threat) => {
      const severityScore = { LOW: 1, MEDIUM: 3, HIGH: 7, CRITICAL: 10 };
      return score + (severityScore[threat.severity] * threat.confidence);
    }, 0);
  }

  private determineRecommendedAction(threatLevel: string): string {
    switch (threatLevel) {
      case 'CRITICAL': return 'BLOCK_REQUEST';
      case 'HIGH': return 'REQUIRE_MFA';
      case 'MEDIUM': return 'ENHANCED_MONITORING';
      default: return 'ALLOW';
    }
  }

  private calculateConfidence(threats: ThreatIndicator[]): number {
    if (threats.length === 0) return 1.0;
    return threats.reduce((sum, threat) => sum + threat.confidence, 0) / threats.length;
  }

  private calculateAnomalyScore(profile: UserBehaviorProfile): number {
    // Placeholder for anomaly score calculation
    return 0.1;
  }
}

/**
 * Security Configuration Service
 *
 * Centralized configuration management for all security components
 */
@Injectable()
export class SecurityConfigurationService {
  private readonly logger = new Logger(SecurityConfigurationService.name);

  constructor(
    @Inject('BROWSER_SECURITY_CONFIG') private readonly config: BrowserSecurityConfig,
  ) {
    this.logger.log('⚙️ Security Configuration Service initialized');
  }

  getConfig(): BrowserSecurityConfig {
    return this.config;
  }

  isFeatureEnabled(feature: keyof BrowserSecurityConfig): boolean {
    return this.config[feature]?.enabled || false;
  }

  getAuthenticationConfig() {
    return this.config.authentication;
  }

  getAuthorizationConfig() {
    return this.config.authorization;
  }

  getValidationConfig() {
    return this.config.validation;
  }

  getRateLimitingConfig() {
    return this.config.rateLimiting;
  }

  getAuditTrailConfig() {
    return this.config.auditTrail;
  }

  getMonitoringConfig() {
    return this.config.monitoring;
  }

  getComplianceConfig() {
    return this.config.compliance;
  }
}

/**
 * Security Dashboard Service
 *
 * Real-time security monitoring and metrics dashboard
 */
@Injectable()
export class SecurityDashboardService {
  private readonly logger = new Logger(SecurityDashboardService.name);

  // Dashboard metrics
  private readonly metrics = {
    operations: {
      total: 0,
      successful: 0,
      failed: 0,
      averageResponseTime: 0,
    },
    authentication: {
      successful: 0,
      failed: 0,
      mfaRequired: 0,
      sessionsActive: 0,
    },
    authorization: {
      granted: 0,
      denied: 0,
      escalations: 0,
    },
    validation: {
      passed: 0,
      failed: 0,
      violations: 0,
    },
    rateLimiting: {
      allowed: 0,
      blocked: 0,
      adaptiveAdjustments: 0,
    },
    threats: {
      detected: 0,
      blocked: 0,
      investigated: 0,
    },
    compliance: {
      violations: 0,
      gdprRequests: 0,
      auditEvents: 0,
    },
  };

  constructor() {
    this.logger.log('📊 Security Dashboard Service initialized');
  }

  recordOperationMetric(metric: OperationMetric): void {
    this.metrics.operations.total++;

    if (metric.outcome === 'SUCCESS') {
      this.metrics.operations.successful++;
    } else {
      this.metrics.operations.failed++;
    }

    this.metrics.operations.averageResponseTime =
      (this.metrics.operations.averageResponseTime + metric.processingTime) / 2;
  }

  getSecurityMetrics() {
    return {
      ...this.metrics,
      timestamp: new Date(),
      uptime: process.uptime(),
    };
  }

  getSecurityStatus(): SecurityStatus {
    const totalOperations = this.metrics.operations.total;
    const successRate = totalOperations > 0 ? (this.metrics.operations.successful / totalOperations) * 100 : 100;
    const authSuccessRate = this.metrics.authentication.successful + this.metrics.authentication.failed > 0 ?
      (this.metrics.authentication.successful / (this.metrics.authentication.successful + this.metrics.authentication.failed)) * 100 : 100;

    let overallStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL' = 'HEALTHY';

    if (successRate < 95 || authSuccessRate < 98) {
      overallStatus = 'WARNING';
    }

    if (successRate < 90 || authSuccessRate < 95 || this.metrics.threats.detected > 10) {
      overallStatus = 'CRITICAL';
    }

    return {
      status: overallStatus,
      successRate,
      authSuccessRate,
      threatsDetected: this.metrics.threats.detected,
      complianceViolations: this.metrics.compliance.violations,
      lastUpdate: new Date(),
    };
  }
}

// Supporting interfaces
interface ThreatIndicator {
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number;
  description: string;
  source: string;
}

interface ThreatAnalysisResult {
  threats: ThreatIndicator[];
  threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskScore: number;
  recommended_action: string;
  confidence: number;
}

interface UserBehaviorProfile {
  userId: string;
  requestPatterns: RequestPattern[];
  timePatterns: number[];
  locationPatterns: string[];
  lastUpdated: Date;
  anomalyScore: number;
}

interface RequestPattern {
  endpoint: string;
  method: string;
  timestamp: Date;
  userAgent: string;
  ipAddress: string;
}

interface AnomalyDetector {
  type: string;
  threshold: number;
  enabled: boolean;
}

interface OperationMetric {
  endpoint: string;
  method: string;
  outcome: 'SUCCESS' | 'FAILURE';
  processingTime: number;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  error?: string;
}

interface SecurityStatus {
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  successRate: number;
  authSuccessRate: number;
  threatsDetected: number;
  complianceViolations: number;
  lastUpdate: Date;
}

// Import statement for audit event types
import { BrowserAuditEventType, AuditEventSeverity } from '../audit/browser-audit-trail.service';
import { Inject, Injectable } from '@nestjs/common';

/**
 * Export the module and all related types for external use
 */
export {
  BrowserSecurityConfig,
  SecurityMetricsInterceptor,
  ComplianceMonitoringInterceptor,
  ThreatDetectionService,
  SecurityConfigurationService,
  SecurityDashboardService,
};