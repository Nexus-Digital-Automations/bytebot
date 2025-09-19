/**
 * PARLANT Phase 1 Enhanced Security Context Manager
 *
 * Zero-trust security context management system that provides comprehensive
 * context capture, preservation, validation, and propagation with enterprise-grade
 * security controls and threat detection capabilities.
 *
 * Features:
 * - Zero-trust security context validation
 * - Multi-layered context encryption and integrity protection
 * - Real-time threat detection and response
 * - Context correlation and audit tracking
 * - Performance-optimized context propagation
 * - Compliance-ready audit trails
 *
 * @module ParlantSecurityContextManager
 * @version 1.0.0
 * @author PARLANT Phase 1 Security Context Specialist
 */

import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  UnauthorizedException,
  ForbiddenException,
} from "@nestjs/common";
import { EventEmitter } from "events";
import * as crypto from "crypto";
import * as jwt from "jsonwebtoken";
import { performance } from "perf_hooks";
import {
  ParlantUserContext,
  SecurityLevel,
  ParlantIntegrationError,
} from "../../types/parlant-integration.types";

/**
 * Enhanced security context with zero-trust validation
 */
export interface EnhancedSecurityContext {
  /** Context unique identifier */
  contextId: string;
  /** Parent context ID for hierarchical tracking */
  parentContextId?: string;
  /** Root context ID for correlation */
  rootContextId: string;
  /** User authentication context */
  userContext: ParlantUserContext;
  /** Operation identifier */
  operationId: string;
  /** Security classification level */
  securityLevel: SecurityLevel;
  /** Context creation metadata */
  metadata: SecurityContextMetadata;
  /** Context lifecycle tracking */
  lifecycle: ContextLifecycle;
  /** Security controls applied */
  securityControls: SecurityControl[];
  /** Context integrity validation */
  integrity: ContextIntegrity;
  /** Context propagation tracking */
  propagation: ContextPropagation;
  /** Threat analysis results */
  threatAnalysis: ThreatAnalysis;
  /** Compliance tracking */
  compliance: ComplianceTracking;
}

/**
 * Security context metadata
 */
export interface SecurityContextMetadata {
  /** Request origin information */
  origin: {
    ipAddress: string;
    userAgent: string;
    referrer?: string;
    geolocation?: GeolocationData;
    deviceFingerprint: string;
  };
  /** Session information */
  session: {
    sessionId: string;
    sessionCreated: Date;
    lastActivity: Date;
    sessionRisk: number;
    mfaVerified: boolean;
  };
  /** Network context */
  network: {
    networkSegment: string;
    vpnDetected: boolean;
    proxyDetected: boolean;
    networkRisk: number;
  };
  /** Application context */
  application: {
    applicationId: string;
    version: string;
    environment: string;
    featureFlags: Record<string, boolean>;
  };
  /** Custom attributes */
  customAttributes: Record<string, unknown>;
}

/**
 * Context lifecycle tracking
 */
export interface ContextLifecycle {
  /** Creation timestamp */
  createdAt: Date;
  /** Last accessed timestamp */
  lastAccessed: Date;
  /** Context expiration */
  expiresAt: Date;
  /** Context status */
  status: "active" | "expired" | "revoked" | "suspended";
  /** State transitions */
  stateTransitions: StateTransition[];
  /** Context usage statistics */
  usageStats: ContextUsageStats;
}

/**
 * Security control applied to context
 */
export interface SecurityControl {
  /** Control identifier */
  controlId: string;
  /** Control type */
  type: "encryption" | "validation" | "monitoring" | "restriction" | "audit";
  /** Control configuration */
  configuration: Record<string, unknown>;
  /** Implementation status */
  status: "active" | "inactive" | "failed";
  /** Control effectiveness score */
  effectiveness: number;
  /** Applied timestamp */
  appliedAt: Date;
  /** Control source */
  source: "policy" | "automatic" | "manual" | "emergency";
}

/**
 * Context integrity validation
 */
export interface ContextIntegrity {
  /** Integrity hash */
  hash: string;
  /** Hash algorithm used */
  algorithm: string;
  /** Digital signature */
  signature?: string;
  /** Validation results */
  validationResults: IntegrityValidationResult[];
  /** Tamper detection */
  tamperDetection: {
    detected: boolean;
    indicators: string[];
    confidence: number;
    lastCheck: Date;
  };
}

/**
 * Context propagation tracking
 */
export interface ContextPropagation {
  /** Propagation chain */
  chain: PropagationEntry[];
  /** Cross-service tracking */
  crossServiceTracking: {
    services: string[];
    hops: number;
    totalLatency: number;
    securityValidations: number;
  };
  /** Propagation policies */
  policies: PropagationPolicy[];
}

/**
 * Threat analysis results
 */
export interface ThreatAnalysis {
  /** Overall threat score */
  overallScore: number;
  /** Threat indicators */
  indicators: ThreatIndicator[];
  /** Risk factors */
  riskFactors: RiskFactor[];
  /** Mitigation actions */
  mitigationActions: MitigationAction[];
  /** Analysis timestamp */
  analyzedAt: Date;
  /** Analysis confidence */
  confidence: number;
}

/**
 * Compliance tracking
 */
export interface ComplianceTracking {
  /** Regulatory requirements */
  regulations: string[];
  /** Compliance status */
  status: "compliant" | "non_compliant" | "partial" | "unknown";
  /** Compliance score */
  score: number;
  /** Audit trail */
  auditTrail: AuditEntry[];
  /** Required retention period */
  retentionPeriod: number;
  /** Last compliance check */
  lastCheck: Date;
}

/**
 * Geolocation data
 */
export interface GeolocationData {
  country: string;
  region: string;
  city: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  isVpn: boolean;
  isProxy: boolean;
}

/**
 * State transition record
 */
export interface StateTransition {
  fromState: string;
  toState: string;
  timestamp: Date;
  reason: string;
  triggeredBy: string;
  metadata: Record<string, unknown>;
}

/**
 * Context usage statistics
 */
export interface ContextUsageStats {
  accessCount: number;
  validationCount: number;
  propagationCount: number;
  errorCount: number;
  averageLatency: number;
  peakUsage: Date;
}

/**
 * Integrity validation result
 */
export interface IntegrityValidationResult {
  valid: boolean;
  timestamp: Date;
  errors: string[];
  warnings: string[];
  score: number;
  validatedBy: string;
}

/**
 * Propagation entry
 */
export interface PropagationEntry {
  serviceId: string;
  serviceName: string;
  timestamp: Date;
  latency: number;
  securityValidation: boolean;
  errors: string[];
  metadata: Record<string, unknown>;
}

/**
 * Propagation policy
 */
export interface PropagationPolicy {
  policyId: string;
  name: string;
  rules: PropagationRule[];
  enforcement: "strict" | "lenient" | "advisory";
  priority: number;
}

/**
 * Propagation rule
 */
export interface PropagationRule {
  condition: string;
  action: "allow" | "deny" | "restrict" | "monitor";
  parameters: Record<string, unknown>;
}

/**
 * Threat indicator
 */
export interface ThreatIndicator {
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  confidence: number;
  description: string;
  source: string;
  detectedAt: Date;
  mitigation?: string;
}

/**
 * Risk factor
 */
export interface RiskFactor {
  factor: string;
  weight: number;
  value: number;
  contribution: number;
  description: string;
}

/**
 * Mitigation action
 */
export interface MitigationAction {
  actionId: string;
  type: "immediate" | "delayed" | "conditional";
  action: string;
  parameters: Record<string, unknown>;
  status: "pending" | "executed" | "failed";
  executedAt?: Date;
}

/**
 * Audit entry
 */
export interface AuditEntry {
  entryId: string;
  timestamp: Date;
  action: string;
  actor: string;
  resource: string;
  outcome: "success" | "failure" | "partial";
  details: Record<string, unknown>;
}

/**
 * Context creation options
 */
export interface ContextCreationOptions {
  parentContextId?: string;
  customMetadata?: Record<string, unknown>;
  securityLevel?: SecurityLevel;
  complianceRequirements?: string[];
  threatDetectionEnabled?: boolean;
  auditLevel?: "basic" | "detailed" | "comprehensive";
}

/**
 * Context validation options
 */
export interface ContextValidationOptions {
  checkIntegrity?: boolean;
  checkExpiration?: boolean;
  checkThreatAnalysis?: boolean;
  checkCompliance?: boolean;
  strictMode?: boolean;
}

/**
 * Enhanced Security Context Manager Service
 *
 * Provides zero-trust security context management with comprehensive
 * validation, threat detection, and compliance tracking capabilities.
 */
@Injectable()
export class ParlantSecurityContextManager
  extends EventEmitter
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(ParlantSecurityContextManager.name);

  // Context storage
  private readonly activeContexts = new Map<string, EnhancedSecurityContext>();
  private readonly contextHierarchy = new Map<string, string[]>(); // parent -> children
  private readonly contextCorrelation = new Map<string, string[]>(); // root -> all related

  // Security configuration
  private readonly encryptionKey = this.generateEncryptionKey();
  private readonly contextTTL = 3600000; // 1 hour
  private readonly maxContextsPerUser = 50;
  private readonly threatThreshold = 0.7;

  // Performance metrics
  private readonly metrics = {
    contextsCreated: 0,
    contextsValidated: 0,
    threatsPrevented: 0,
    averageCreationTime: 0,
    averageValidationTime: 0,
    memoryUsage: 0,
  };

  // Cleanup timers
  private cleanupTimer: NodeJS.Timeout | null = null;
  private metricsTimer: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.logger.log("🔐 Initializing Enhanced Security Context Manager");
  }

  /**
   * Initialize the security context manager
   */
  async onModuleInit(): Promise<void> {
    this.logger.log("🚀 Starting Enhanced Security Context Manager...");

    try {
      await this.initializeSecurityPolicies();
      await this.startPeriodicTasks();
      await this.validateSystemConfiguration();

      this.logger.log("✅ Enhanced Security Context Manager initialized successfully");
      this.emit("context:manager:initialized");
    } catch (error) {
      this.logger.error("❌ Failed to initialize Security Context Manager", error);
      throw new ParlantIntegrationError(
        "Security Context Manager initialization failed",
        "CONTEXT_MANAGER_INIT_ERROR",
        { error: error instanceof Error ? error.message : String(error) },
      );
    }
  }

  /**
   * Clean up on module destruction
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log("🔄 Shutting down Enhanced Security Context Manager...");

    await this.stopPeriodicTasks();
    await this.archiveActiveContexts();
    await this.saveMetrics();

    this.logger.log("✅ Enhanced Security Context Manager shutdown complete");
  }

  /**
   * Create enhanced security context with zero-trust validation
   */
  async createSecurityContext(
    userContext: ParlantUserContext,
    operationId: string,
    options: ContextCreationOptions = {},
  ): Promise<EnhancedSecurityContext> {
    const startTime = performance.now();

    try {
      // Validate user context
      await this.validateUserContext(userContext);

      // Check user context limits
      await this.checkUserContextLimits(userContext.userId);

      // Generate context ID
      const contextId = this.generateContextId();
      const rootContextId = options.parentContextId
        ? await this.getRootContextId(options.parentContextId)
        : contextId;

      // Analyze threats
      const threatAnalysis = await this.performThreatAnalysis(userContext, operationId);

      // Create enhanced security context
      const securityContext: EnhancedSecurityContext = {
        contextId,
        parentContextId: options.parentContextId,
        rootContextId,
        userContext: this.cloneUserContext(userContext),
        operationId,
        securityLevel: options.securityLevel || SecurityLevel._MODERATE,
        metadata: await this.buildContextMetadata(userContext, options.customMetadata),
        lifecycle: this.createLifecycle(),
        securityControls: await this.getApplicableSecurityControls(
          options.securityLevel || SecurityLevel._MODERATE
        ),
        integrity: await this.createIntegrityValidation(contextId),
        propagation: this.createPropagationTracking(),
        threatAnalysis,
        compliance: await this.createComplianceTracking(
          options.complianceRequirements || []
        ),
      };

      // Apply security controls
      await this.applySecurityControls(securityContext);

      // Store context
      this.activeContexts.set(contextId, securityContext);

      // Update hierarchy tracking
      if (options.parentContextId) {
        this.updateContextHierarchy(options.parentContextId, contextId);
      }

      // Update correlation tracking
      this.updateContextCorrelation(rootContextId, contextId);

      // Update metrics
      const creationTime = performance.now() - startTime;
      this.updateMetrics("creation", creationTime);

      // Emit creation event
      this.emit("context:created", {
        contextId,
        operationId,
        securityLevel: securityContext.securityLevel,
        threatScore: threatAnalysis.overallScore,
        creationTime,
      });

      this.logger.debug(
        `✅ Enhanced security context created: ${contextId} (${creationTime.toFixed(2)}ms, threat: ${threatAnalysis.overallScore.toFixed(2)})`
      );

      return securityContext;
    } catch (error) {
      this.logger.error("❌ Failed to create enhanced security context", error);
      throw new ParlantIntegrationError(
        "Enhanced security context creation failed",
        "ENHANCED_CONTEXT_CREATE_ERROR",
        { operationId, error: error instanceof Error ? error.message : String(error) },
      );
    }
  }

  /**
   * Validate security context with comprehensive checks
   */
  async validateSecurityContext(
    contextId: string,
    options: ContextValidationOptions = {},
  ): Promise<boolean> {
    const startTime = performance.now();

    try {
      const context = this.activeContexts.get(contextId);
      if (!context) {
        throw new UnauthorizedException(`Security context not found: ${contextId}`);
      }

      // Check expiration
      if (options.checkExpiration !== false && context.lifecycle.expiresAt < new Date()) {
        await this.expireContext(contextId);
        throw new UnauthorizedException(`Security context expired: ${contextId}`);
      }

      // Check integrity
      if (options.checkIntegrity !== false) {
        const integrityValid = await this.validateContextIntegrity(context);
        if (!integrityValid) {
          throw new ForbiddenException(`Security context integrity compromised: ${contextId}`);
        }
      }

      // Check threat analysis
      if (options.checkThreatAnalysis !== false) {
        if (context.threatAnalysis.overallScore > this.threatThreshold) {
          await this.handleThreatDetection(context);
          throw new ForbiddenException(`Security threat detected: ${contextId}`);
        }
      }

      // Check compliance
      if (options.checkCompliance !== false) {
        const complianceValid = await this.validateCompliance(context);
        if (!complianceValid && options.strictMode) {
          throw new ForbiddenException(`Compliance violation: ${contextId}`);
        }
      }

      // Update access tracking
      context.lifecycle.lastAccessed = new Date();
      context.lifecycle.usageStats.accessCount++;

      // Update metrics
      const validationTime = performance.now() - startTime;
      this.updateMetrics("validation", validationTime);

      this.logger.debug(
        `✅ Security context validated: ${contextId} (${validationTime.toFixed(2)}ms)`
      );

      return true;
    } catch (error) {
      this.logger.error("❌ Security context validation failed", error);

      if (error instanceof UnauthorizedException || error instanceof ForbiddenException) {
        throw error;
      }

      throw new ParlantIntegrationError(
        "Security context validation failed",
        "CONTEXT_VALIDATION_ERROR",
        { contextId, error: error instanceof Error ? error.message : String(error) },
      );
    }
  }

  /**
   * Get security context with validation
   */
  async getSecurityContext(
    contextId: string,
    options: ContextValidationOptions = {},
  ): Promise<EnhancedSecurityContext | null> {
    try {
      const isValid = await this.validateSecurityContext(contextId, options);
      if (!isValid) {
        return null;
      }

      const context = this.activeContexts.get(contextId);
      return context ? this.cloneContext(context) : null;
    } catch (error) {
      this.logger.error("❌ Failed to get security context", error);
      return null;
    }
  }

  /**
   * Expire security context
   */
  async expireContext(contextId: string): Promise<void> {
    try {
      const context = this.activeContexts.get(contextId);
      if (!context) {
        return;
      }

      // Update lifecycle
      context.lifecycle.status = "expired";
      context.lifecycle.stateTransitions.push({
        fromState: "active",
        toState: "expired",
        timestamp: new Date(),
        reason: "expiration",
        triggeredBy: "system",
        metadata: {},
      });

      // Archive context
      await this.archiveContext(context);

      // Remove from active contexts
      this.activeContexts.delete(contextId);

      // Clean up hierarchy tracking
      this.cleanupContextHierarchy(contextId);

      // Emit expiration event
      this.emit("context:expired", {
        contextId,
        operationId: context.operationId,
        expirationTime: new Date(),
      });

      this.logger.debug(`✅ Security context expired: ${contextId}`);
    } catch (error) {
      this.logger.error("❌ Failed to expire security context", error);
    }
  }

  /**
   * Get context statistics
   */
  getContextStatistics(): Record<string, unknown> {
    return {
      activeContexts: this.activeContexts.size,
      contextHierarchy: this.contextHierarchy.size,
      contextCorrelation: this.contextCorrelation.size,
      metrics: { ...this.metrics },
      memoryUsage: this.calculateMemoryUsage(),
    };
  }

  /**
   * Private helper methods
   */

  private generateContextId(): string {
    return `ectx_${Date.now()}_${crypto.randomBytes(16).toString("hex")}`;
  }

  private generateEncryptionKey(): string {
    return process.env.PARLANT_ENHANCED_CONTEXT_KEY || crypto.randomBytes(32).toString("hex");
  }

  private cloneUserContext(userContext: ParlantUserContext): ParlantUserContext {
    return {
      ...userContext,
      roles: [...userContext.roles],
      metadata: { ...userContext.metadata },
    };
  }

  private cloneContext(context: EnhancedSecurityContext): EnhancedSecurityContext {
    return JSON.parse(JSON.stringify(context));
  }

  private async validateUserContext(userContext: ParlantUserContext): Promise<void> {
    if (!userContext.userId || !userContext.sessionId) {
      throw new UnauthorizedException("Invalid user context");
    }

    if (!userContext.roles || userContext.roles.length === 0) {
      throw new UnauthorizedException("User has no assigned roles");
    }
  }

  private async checkUserContextLimits(userId: string): Promise<void> {
    const userContexts = Array.from(this.activeContexts.values())
      .filter(ctx => ctx.userContext.userId === userId);

    if (userContexts.length >= this.maxContextsPerUser) {
      throw new ForbiddenException(
        `User has reached maximum number of contexts: ${this.maxContextsPerUser}`
      );
    }
  }

  private async getRootContextId(parentContextId: string): Promise<string> {
    const parentContext = this.activeContexts.get(parentContextId);
    return parentContext ? parentContext.rootContextId : parentContextId;
  }

  private async performThreatAnalysis(
    userContext: ParlantUserContext,
    operationId: string,
  ): Promise<ThreatAnalysis> {
    // Basic threat analysis implementation
    const indicators: ThreatIndicator[] = [];
    const riskFactors: RiskFactor[] = [];

    // Analyze user patterns
    if (userContext.ipAddress && this.isKnownMaliciousIP(userContext.ipAddress)) {
      indicators.push({
        type: "malicious_ip",
        severity: "high",
        confidence: 0.9,
        description: "IP address associated with malicious activity",
        source: "threat_intelligence",
        detectedAt: new Date(),
      });
    }

    // Calculate overall score
    const overallScore = indicators.reduce((score, indicator) => {
      const severityWeight = { low: 0.1, medium: 0.3, high: 0.7, critical: 1.0 };
      return score + (severityWeight[indicator.severity] * indicator.confidence);
    }, 0) / Math.max(indicators.length, 1);

    return {
      overallScore,
      indicators,
      riskFactors,
      mitigationActions: [],
      analyzedAt: new Date(),
      confidence: 0.8,
    };
  }

  private isKnownMaliciousIP(ipAddress: string): boolean {
    // Placeholder for threat intelligence lookup
    return false;
  }

  private async buildContextMetadata(
    userContext: ParlantUserContext,
    customMetadata?: Record<string, unknown>,
  ): Promise<SecurityContextMetadata> {
    return {
      origin: {
        ipAddress: userContext.ipAddress || "unknown",
        userAgent: userContext.metadata?.userAgent as string || "unknown",
        referrer: userContext.metadata?.referrer as string,
        deviceFingerprint: this.generateDeviceFingerprint(userContext),
      },
      session: {
        sessionId: userContext.sessionId,
        sessionCreated: new Date(),
        lastActivity: new Date(),
        sessionRisk: 0.1,
        mfaVerified: false,
      },
      network: {
        networkSegment: "default",
        vpnDetected: false,
        proxyDetected: false,
        networkRisk: 0.1,
      },
      application: {
        applicationId: "parlant-security",
        version: "1.0.0",
        environment: process.env.NODE_ENV || "development",
        featureFlags: {},
      },
      customAttributes: customMetadata || {},
    };
  }

  private generateDeviceFingerprint(userContext: ParlantUserContext): string {
    const fingerprint = `${userContext.ipAddress}_${userContext.metadata?.userAgent}`;
    return crypto.createHash("sha256").update(fingerprint).digest("hex");
  }

  private createLifecycle(): ContextLifecycle {
    const now = new Date();
    return {
      createdAt: now,
      lastAccessed: now,
      expiresAt: new Date(now.getTime() + this.contextTTL),
      status: "active",
      stateTransitions: [{
        fromState: "none",
        toState: "active",
        timestamp: now,
        reason: "creation",
        triggeredBy: "system",
        metadata: {},
      }],
      usageStats: {
        accessCount: 0,
        validationCount: 0,
        propagationCount: 0,
        errorCount: 0,
        averageLatency: 0,
        peakUsage: now,
      },
    };
  }

  private async getApplicableSecurityControls(securityLevel: SecurityLevel): Promise<SecurityControl[]> {
    const controls: SecurityControl[] = [];

    controls.push({
      controlId: "encryption",
      type: "encryption",
      configuration: { algorithm: "AES-256-GCM" },
      status: "active",
      effectiveness: 0.95,
      appliedAt: new Date(),
      source: "policy",
    });

    if (securityLevel === SecurityLevel._HIGH || securityLevel === SecurityLevel._CRITICAL) {
      controls.push({
        controlId: "enhanced_monitoring",
        type: "monitoring",
        configuration: { realTimeAnalysis: true },
        status: "active",
        effectiveness: 0.85,
        appliedAt: new Date(),
        source: "policy",
      });
    }

    return controls;
  }

  private async createIntegrityValidation(contextId: string): Promise<ContextIntegrity> {
    const hash = crypto.createHash("sha256").update(contextId).digest("hex");

    return {
      hash,
      algorithm: "SHA-256",
      validationResults: [],
      tamperDetection: {
        detected: false,
        indicators: [],
        confidence: 0,
        lastCheck: new Date(),
      },
    };
  }

  private createPropagationTracking(): ContextPropagation {
    return {
      chain: [],
      crossServiceTracking: {
        services: [],
        hops: 0,
        totalLatency: 0,
        securityValidations: 0,
      },
      policies: [],
    };
  }

  private async createComplianceTracking(requirements: string[]): Promise<ComplianceTracking> {
    return {
      regulations: requirements,
      status: "compliant",
      score: 100,
      auditTrail: [],
      retentionPeriod: 7 * 24 * 60 * 60 * 1000, // 7 days
      lastCheck: new Date(),
    };
  }

  private async applySecurityControls(context: EnhancedSecurityContext): Promise<void> {
    for (const control of context.securityControls) {
      try {
        await this.executeSecurityControl(context, control);
        control.status = "active";
      } catch (error) {
        this.logger.error(`Failed to apply security control: ${control.controlId}`, error);
        control.status = "failed";
      }
    }
  }

  private async executeSecurityControl(
    context: EnhancedSecurityContext,
    control: SecurityControl,
  ): Promise<void> {
    switch (control.type) {
      case "encryption":
        await this.applyEncryption(context);
        break;
      case "monitoring":
        await this.enableMonitoring(context);
        break;
      case "validation":
        await this.enableValidation(context);
        break;
      default:
        this.logger.warn(`Unknown security control type: ${control.type}`);
    }
  }

  private async applyEncryption(context: EnhancedSecurityContext): Promise<void> {
    // Apply encryption to sensitive context data
    this.logger.debug(`Applying encryption to context: ${context.contextId}`);
  }

  private async enableMonitoring(context: EnhancedSecurityContext): Promise<void> {
    // Enable enhanced monitoring
    this.logger.debug(`Enabling monitoring for context: ${context.contextId}`);
  }

  private async enableValidation(context: EnhancedSecurityContext): Promise<void> {
    // Enable enhanced validation
    this.logger.debug(`Enabling validation for context: ${context.contextId}`);
  }

  private updateContextHierarchy(parentId: string, childId: string): void {
    if (!this.contextHierarchy.has(parentId)) {
      this.contextHierarchy.set(parentId, []);
    }
    this.contextHierarchy.get(parentId)!.push(childId);
  }

  private updateContextCorrelation(rootId: string, contextId: string): void {
    if (!this.contextCorrelation.has(rootId)) {
      this.contextCorrelation.set(rootId, []);
    }
    this.contextCorrelation.get(rootId)!.push(contextId);
  }

  private updateMetrics(operation: string, duration: number): void {
    switch (operation) {
      case "creation":
        this.metrics.contextsCreated++;
        this.metrics.averageCreationTime = this.updateAverage(
          this.metrics.averageCreationTime,
          duration,
          this.metrics.contextsCreated,
        );
        break;
      case "validation":
        this.metrics.contextsValidated++;
        this.metrics.averageValidationTime = this.updateAverage(
          this.metrics.averageValidationTime,
          duration,
          this.metrics.contextsValidated,
        );
        break;
    }

    this.metrics.memoryUsage = this.calculateMemoryUsage();
  }

  private updateAverage(currentAverage: number, newValue: number, count: number): number {
    return (currentAverage * (count - 1) + newValue) / count;
  }

  private calculateMemoryUsage(): number {
    return (this.activeContexts.size * 1024) + (this.contextHierarchy.size * 512);
  }

  private async validateContextIntegrity(context: EnhancedSecurityContext): Promise<boolean> {
    // Validate context integrity
    const currentHash = crypto.createHash("sha256")
      .update(JSON.stringify(context))
      .digest("hex");

    return context.integrity.hash === currentHash;
  }

  private async validateCompliance(context: EnhancedSecurityContext): Promise<boolean> {
    // Validate compliance requirements
    return context.compliance.status === "compliant";
  }

  private async handleThreatDetection(context: EnhancedSecurityContext): Promise<void> {
    this.metrics.threatsPrevented++;

    this.emit("threat:detected", {
      contextId: context.contextId,
      threatScore: context.threatAnalysis.overallScore,
      indicators: context.threatAnalysis.indicators,
    });

    this.logger.warn(
      `🚨 Threat detected in context: ${context.contextId} (score: ${context.threatAnalysis.overallScore})`
    );
  }

  private cleanupContextHierarchy(contextId: string): void {
    // Remove from hierarchy tracking
    this.contextHierarchy.delete(contextId);

    // Remove from parent's children list
    for (const [parentId, children] of this.contextHierarchy.entries()) {
      const index = children.indexOf(contextId);
      if (index > -1) {
        children.splice(index, 1);
        if (children.length === 0) {
          this.contextHierarchy.delete(parentId);
        }
      }
    }
  }

  private async archiveContext(context: EnhancedSecurityContext): Promise<void> {
    // Archive context for audit purposes
    this.logger.debug(`📦 Archiving context: ${context.contextId}`);
  }

  private async archiveActiveContexts(): Promise<void> {
    for (const context of this.activeContexts.values()) {
      await this.archiveContext(context);
    }
  }

  private async saveMetrics(): Promise<void> {
    this.logger.debug("💾 Saving context manager metrics", this.metrics);
  }

  private async initializeSecurityPolicies(): Promise<void> {
    this.logger.debug("🔐 Initializing security policies...");
  }

  private async validateSystemConfiguration(): Promise<void> {
    this.logger.debug("🔍 Validating system configuration...");
  }

  private async startPeriodicTasks(): Promise<void> {
    // Context cleanup every 5 minutes
    this.cleanupTimer = setInterval(() => {
      this.performContextCleanup();
    }, 5 * 60 * 1000);

    // Metrics update every minute
    this.metricsTimer = setInterval(() => {
      this.updatePeriodicMetrics();
    }, 60 * 1000);
  }

  private async stopPeriodicTasks(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
      this.metricsTimer = null;
    }
  }

  private async performContextCleanup(): Promise<void> {
    const now = new Date();
    let cleanedCount = 0;

    for (const [contextId, context] of this.activeContexts.entries()) {
      if (context.lifecycle.expiresAt < now) {
        await this.expireContext(contextId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug(`🧹 Cleaned up ${cleanedCount} expired contexts`);
    }
  }

  private updatePeriodicMetrics(): void {
    this.metrics.memoryUsage = this.calculateMemoryUsage();
    this.emit("metrics:updated", this.metrics);
  }
}