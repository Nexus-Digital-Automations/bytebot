/**
 * PARLANT Phase 1 Security Context Propagation Service
 *
 * Enterprise-grade security context propagation system for all PARLANT operations.
 * Provides comprehensive context preservation, transmission, validation, and cleanup
 * across all conversational AI operations with enterprise security standards.
 *
 * @module ParlantSecurityContextPropagationService
 * @version 1.0.0
 * @author AIgent Security Context Specialist
 */

import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from "@nestjs/common";
import { EventEmitter } from "events";
import * as crypto from "crypto";
import { performance } from "perf_hooks";
import {
  ParlantUserContext,
  SecurityLevel,
  ParlantIntegrationError,
} from "../types/parlant-integration.types";

/**
 * Security context structure for PARLANT operations
 */
export interface SecurityContext {
  /** Unique context identifier */
  contextId: string;
  /** User authentication context */
  userContext: ParlantUserContext;
  /** Operation identifier this context belongs to */
  operationId: string;
  /** Security level of the operation */
  securityLevel: SecurityLevel;
  /** Context creation timestamp */
  createdAt: Date;
  /** Context last accessed timestamp */
  lastAccessed: Date;
  /** Context expiration timestamp */
  expiresAt: Date;
  /** Context encryption key */
  encryptionKey: string;
  /** Context integrity hash */
  integrityHash: string;
  /** Parent context ID for nested operations */
  parentContextId?: string;
  /** Child context IDs */
  childContextIds: string[];
  /** Context propagation chain */
  propagationChain: ContextPropagationEntry[];
  /** Security policies applied */
  securityPolicies: SecurityPolicy[];
  /** Context metadata */
  metadata: ContextMetadata;
}

/**
 * Context propagation entry for audit trail
 */
export interface ContextPropagationEntry {
  /** Service/component that received the context */
  serviceName: string;
  /** Timestamp when context was received */
  timestamp: Date;
  /** Context validation result */
  validationResult: ContextValidationResult;
  /** Processing duration in milliseconds */
  processingDuration: number;
  /** Context modifications made */
  modifications: ContextModification[];
}

/**
 * Context validation result
 */
export interface ContextValidationResult {
  /** Whether context is valid */
  isValid: boolean;
  /** Validation timestamp */
  timestamp: Date;
  /** Validation errors if any */
  errors: string[];
  /** Validation warnings */
  warnings: string[];
  /** Context integrity score (0-100) */
  integrityScore: number;
  /** Security compliance score (0-100) */
  complianceScore: number;
}

/**
 * Context modification record
 */
export interface ContextModification {
  /** Type of modification */
  type: "read" | "write" | "encrypt" | "decrypt" | "validate" | "expire";
  /** Field modified */
  field: string;
  /** Modification timestamp */
  timestamp: Date;
  /** Service that made the modification */
  serviceName: string;
  /** Reason for modification */
  reason: string;
}

/**
 * Security policy applied to context
 */
export interface SecurityPolicy {
  /** Policy identifier */
  policyId: string;
  /** Policy name */
  name: string;
  /** Policy type */
  type: "encryption" | "access_control" | "retention" | "audit" | "validation";
  /** Policy configuration */
  configuration: Record<string, unknown>;
  /** Policy enforcement level */
  enforcementLevel: "mandatory" | "recommended" | "optional";
  /** Policy application timestamp */
  appliedAt: Date;
}

/**
 * Context metadata
 */
export interface ContextMetadata {
  /** Request origin */
  origin: string;
  /** Client information */
  clientInfo: Record<string, unknown>;
  /** Network information */
  networkInfo: Record<string, unknown>;
  /** Performance metrics */
  performanceMetrics: PerformanceMetrics;
  /** Compliance requirements */
  complianceRequirements: string[];
  /** Custom attributes */
  customAttributes: Record<string, unknown>;
}

/**
 * Performance metrics for context operations
 */
export interface PerformanceMetrics {
  /** Context creation time in milliseconds */
  creationTime: number;
  /** Context propagation time in milliseconds */
  propagationTime: number;
  /** Context validation time in milliseconds */
  validationTime: number;
  /** Context serialization time in milliseconds */
  serializationTime: number;
  /** Context deserialization time in milliseconds */
  deserializationTime: number;
  /** Memory usage in bytes */
  memoryUsage: number;
}

/**
 * Context transmission package for cross-service communication
 */
export interface ContextTransmissionPackage {
  /** Encrypted context data */
  encryptedContext: string;
  /** Transmission timestamp */
  timestamp: Date;
  /** Source service identifier */
  sourceService: string;
  /** Target service identifier */
  targetService: string;
  /** Transmission signature */
  signature: string;
  /** Transmission metadata */
  transmissionMetadata: Record<string, unknown>;
}

/**
 * Context cache entry
 */
export interface ContextCacheEntry {
  /** Cached context */
  context: SecurityContext;
  /** Cache creation timestamp */
  createdAt: Date;
  /** Cache expiration timestamp */
  expiresAt: Date;
  /** Cache hit count */
  hitCount: number;
  /** Cache access history */
  accessHistory: Date[];
}

/**
 * Context garbage collection configuration
 */
export interface ContextGarbageCollectionConfig {
  /** Enable automatic cleanup */
  enabled: boolean;
  /** Cleanup interval in milliseconds */
  cleanupInterval: number;
  /** Context retention period in milliseconds */
  retentionPeriod: number;
  /** Maximum contexts to keep in memory */
  maxContextsInMemory: number;
  /** Cleanup batch size */
  cleanupBatchSize: number;
}

/**
 * Context correlation tracking
 */
export interface ContextCorrelation {
  /** Correlation ID */
  correlationId: string;
  /** Root context ID */
  rootContextId: string;
  /** All related context IDs */
  relatedContextIds: string[];
  /** Correlation creation timestamp */
  createdAt: Date;
  /** Correlation last updated timestamp */
  lastUpdated: Date;
  /** Correlation metadata */
  metadata: Record<string, unknown>;
}

/**
 * PARLANT Security Context Propagation Service
 *
 * Provides enterprise-grade security context propagation across all PARLANT operations
 * with comprehensive context preservation, validation, caching, and cleanup capabilities.
 */
@Injectable()
export class ParlantSecurityContextPropagationService
  extends EventEmitter
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(ParlantSecurityContextPropagationService.name);

  // Context storage and management
  private readonly activeContexts = new Map<string, SecurityContext>();
  private readonly contextCache = new Map<string, ContextCacheEntry>();
  private readonly contextCorrelations = new Map<string, ContextCorrelation>();
  private readonly transmissionHistory = new Map<string, ContextTransmissionPackage[]>();

  // Security configuration
  private readonly encryptionKey = this.generateMasterEncryptionKey();
  private readonly contextExpirationTime = 3600000; // 1 hour
  private readonly maxContextsInMemory = 10000;
  private readonly cacheRetentionTime = 1800000; // 30 minutes

  // Garbage collection configuration
  private readonly gcConfig: ContextGarbageCollectionConfig = {
    enabled: true,
    cleanupInterval: 300000, // 5 minutes
    retentionPeriod: 7200000, // 2 hours
    maxContextsInMemory: this.maxContextsInMemory,
    cleanupBatchSize: 100,
  };

  // Performance monitoring
  private readonly performanceStats = {
    totalContextsCreated: 0,
    totalContextsPropagated: 0,
    totalContextsValidated: 0,
    averageCreationTime: 0,
    averagePropagationTime: 0,
    averageValidationTime: 0,
    memoryUsage: 0,
    lastCleanupTime: new Date(),
  };

  // Cleanup timers
  private contextCleanupTimer: NodeJS.Timeout | null = null;
  private cacheCleanupTimer: NodeJS.Timeout | null = null;
  private performanceMonitorTimer: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.logger.log("🚀 Initializing PARLANT Security Context Propagation Service");
  }

  /**
   * Initialize the Security Context Propagation Service
   */
  async onModuleInit(): Promise<void> {
    this.logger.log("🔄 Starting Security Context Propagation initialization...");

    try {
      await this.initializeSecurityPolicies();
      await this.startPeriodicTasks();
      await this.validateSystemSecurity();

      this.logger.log("✅ Security Context Propagation Service initialized successfully");
      this.emit("context:service:initialized");
    } catch (error) {
      this.logger.error("❌ Failed to initialize Security Context Propagation Service", error);
      throw new ParlantIntegrationError(
        "Security Context Propagation initialization failed",
        "CONTEXT_INIT_ERROR",
        { error: error instanceof Error ? error.message : String(error) },
      );
    }
  }

  /**
   * Clean up resources on module destruction
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log("🔄 Shutting down Security Context Propagation Service...");

    await this.stopPeriodicTasks();
    await this.cleanupAllContexts();
    await this.saveContextState();

    this.logger.log("✅ Security Context Propagation Service shutdown complete");
  }

  /**
   * Create a new security context for PARLANT operation
   */
  async createSecurityContext(
    userContext: ParlantUserContext,
    operationId: string,
    securityLevel: SecurityLevel,
    metadata?: Record<string, unknown>,
  ): Promise<SecurityContext> {
    const startTime = performance.now();

    try {
      const contextId = this.generateContextId();
      const encryptionKey = this.generateContextEncryptionKey();
      const now = new Date();

      const securityContext: SecurityContext = {
        contextId,
        userContext: this.cloneUserContext(userContext),
        operationId,
        securityLevel,
        createdAt: now,
        lastAccessed: now,
        expiresAt: new Date(now.getTime() + this.contextExpirationTime),
        encryptionKey,
        integrityHash: "",
        childContextIds: [],
        propagationChain: [],
        securityPolicies: await this.getApplicableSecurityPolicies(securityLevel),
        metadata: {
          origin: metadata?.origin as string || "unknown",
          clientInfo: metadata?.clientInfo as Record<string, unknown> || {},
          networkInfo: metadata?.networkInfo as Record<string, unknown> || {},
          performanceMetrics: {
            creationTime: 0, // Will be updated
            propagationTime: 0,
            validationTime: 0,
            serializationTime: 0,
            deserializationTime: 0,
            memoryUsage: 0,
          },
          complianceRequirements: this.getComplianceRequirements(securityLevel),
          customAttributes: metadata?.customAttributes as Record<string, unknown> || {},
        },
      };

      // Generate integrity hash
      securityContext.integrityHash = await this.generateIntegrityHash(securityContext);

      // Store context
      this.activeContexts.set(contextId, securityContext);

      // Update performance metrics
      const creationTime = performance.now() - startTime;
      securityContext.metadata.performanceMetrics.creationTime = creationTime;
      this.updatePerformanceStats("creation", creationTime);

      // Emit creation event
      this.emit("context:created", {
        contextId,
        operationId,
        securityLevel,
        creationTime,
      });

      this.logger.debug(`✅ Security context created: ${contextId} (${creationTime.toFixed(2)}ms)`);

      return securityContext;
    } catch (error) {
      this.logger.error("❌ Failed to create security context", error);
      throw new ParlantIntegrationError(
        "Security context creation failed",
        "CONTEXT_CREATE_ERROR",
        { operationId, securityLevel, error: error instanceof Error ? error.message : String(error) },
      );
    }
  }

  /**
   * Propagate security context across services
   */
  async propagateSecurityContext(
    contextId: string,
    targetService: string,
    sourceService: string,
  ): Promise<ContextTransmissionPackage> {
    const startTime = performance.now();

    try {
      const context = this.activeContexts.get(contextId);
      if (!context) {
        throw new Error(`Security context not found: ${contextId}`);
      }

      // Validate context before propagation
      const validationResult = await this.validateContext(context);
      if (!validationResult.isValid) {
        throw new Error(`Invalid context for propagation: ${validationResult.errors.join(", ")}`);
      }

      // Create transmission package
      const transmissionPackage = await this.createTransmissionPackage(
        context,
        targetService,
        sourceService,
      );

      // Record propagation in context chain
      const propagationEntry: ContextPropagationEntry = {
        serviceName: targetService,
        timestamp: new Date(),
        validationResult,
        processingDuration: performance.now() - startTime,
        modifications: [],
      };

      context.propagationChain.push(propagationEntry);
      context.lastAccessed = new Date();

      // Store transmission history
      if (!this.transmissionHistory.has(contextId)) {
        this.transmissionHistory.set(contextId, []);
      }
      this.transmissionHistory.get(contextId)!.push(transmissionPackage);

      // Update performance metrics
      const propagationTime = performance.now() - startTime;
      context.metadata.performanceMetrics.propagationTime += propagationTime;
      this.updatePerformanceStats("propagation", propagationTime);

      // Emit propagation event
      this.emit("context:propagated", {
        contextId,
        sourceService,
        targetService,
        propagationTime,
      });

      this.logger.debug(
        `✅ Context propagated: ${contextId} from ${sourceService} to ${targetService} (${propagationTime.toFixed(2)}ms)`,
      );

      return transmissionPackage;
    } catch (error) {
      this.logger.error("❌ Failed to propagate security context", error);
      throw new ParlantIntegrationError(
        "Security context propagation failed",
        "CONTEXT_PROPAGATE_ERROR",
        { contextId, targetService, sourceService, error: error instanceof Error ? error.message : String(error) },
      );
    }
  }

  /**
   * Receive and validate transmitted security context
   */
  async receiveSecurityContext(
    transmissionPackage: ContextTransmissionPackage,
    receivingService: string,
  ): Promise<SecurityContext> {
    const startTime = performance.now();

    try {
      // Validate transmission package
      await this.validateTransmissionPackage(transmissionPackage);

      // Decrypt context
      const context = await this.decryptContextFromPackage(transmissionPackage);

      // Validate received context
      const validationResult = await this.validateContext(context);
      if (!validationResult.isValid) {
        throw new Error(`Received invalid context: ${validationResult.errors.join(", ")}`);
      }

      // Update context with reception information
      context.lastAccessed = new Date();

      // Add reception to propagation chain
      const receptionEntry: ContextPropagationEntry = {
        serviceName: receivingService,
        timestamp: new Date(),
        validationResult,
        processingDuration: performance.now() - startTime,
        modifications: [{
          type: "read",
          field: "context",
          timestamp: new Date(),
          serviceName: receivingService,
          reason: "context_reception",
        }],
      };

      context.propagationChain.push(receptionEntry);

      // Store received context
      this.activeContexts.set(context.contextId, context);

      // Update performance metrics
      const receptionTime = performance.now() - startTime;
      this.updatePerformanceStats("reception", receptionTime);

      // Emit reception event
      this.emit("context:received", {
        contextId: context.contextId,
        receivingService,
        sourceService: transmissionPackage.sourceService,
        receptionTime,
      });

      this.logger.debug(
        `✅ Context received: ${context.contextId} by ${receivingService} (${receptionTime.toFixed(2)}ms)`,
      );

      return context;
    } catch (error) {
      this.logger.error("❌ Failed to receive security context", error);
      throw new ParlantIntegrationError(
        "Security context reception failed",
        "CONTEXT_RECEIVE_ERROR",
        { receivingService, error: error instanceof Error ? error.message : String(error) },
      );
    }
  }

  /**
   * Validate security context integrity and compliance
   */
  async validateContext(context: SecurityContext): Promise<ContextValidationResult> {
    const startTime = performance.now();

    try {
      const errors: string[] = [];
      const warnings: string[] = [];

      // Validate context structure
      if (!context.contextId || !context.userContext || !context.operationId) {
        errors.push("Missing required context fields");
      }

      // Validate expiration
      if (context.expiresAt < new Date()) {
        errors.push("Context has expired");
      }

      // Validate integrity hash
      const expectedHash = await this.generateIntegrityHash(context);
      if (context.integrityHash !== expectedHash) {
        errors.push("Context integrity hash mismatch");
      }

      // Validate user context
      if (!context.userContext.userId || !context.userContext.sessionId) {
        errors.push("Invalid user context");
      }

      // Validate security level
      if (!Object.values(SecurityLevel).includes(context.securityLevel)) {
        errors.push("Invalid security level");
      }

      // Check for security policy compliance
      for (const policy of context.securityPolicies) {
        const complianceResult = await this.validatePolicyCompliance(context, policy);
        if (!complianceResult.compliant) {
          if (policy.enforcementLevel === "mandatory") {
            errors.push(`Mandatory policy violation: ${policy.name}`);
          } else {
            warnings.push(`Policy recommendation: ${policy.name}`);
          }
        }
      }

      // Calculate scores
      const integrityScore = errors.length === 0 ? 100 : Math.max(0, 100 - (errors.length * 25));
      const complianceScore = this.calculateComplianceScore(context, errors, warnings);

      const validationResult: ContextValidationResult = {
        isValid: errors.length === 0,
        timestamp: new Date(),
        errors,
        warnings,
        integrityScore,
        complianceScore,
      };

      // Update performance metrics
      const validationTime = performance.now() - startTime;
      context.metadata.performanceMetrics.validationTime += validationTime;
      this.updatePerformanceStats("validation", validationTime);

      this.logger.debug(
        `✅ Context validated: ${context.contextId} - Valid: ${validationResult.isValid} (${validationTime.toFixed(2)}ms)`,
      );

      return validationResult;
    } catch (error) {
      this.logger.error("❌ Failed to validate security context", error);
      throw new ParlantIntegrationError(
        "Security context validation failed",
        "CONTEXT_VALIDATE_ERROR",
        { contextId: context.contextId, error: error instanceof Error ? error.message : String(error) },
      );
    }
  }

  /**
   * Get security context by ID
   */
  async getSecurityContext(contextId: string): Promise<SecurityContext | null> {
    try {
      const context = this.activeContexts.get(contextId);
      if (!context) {
        return null;
      }

      // Check if context is expired
      if (context.expiresAt < new Date()) {
        await this.expireContext(contextId);
        return null;
      }

      // Update last accessed
      context.lastAccessed = new Date();

      return this.cloneContext(context);
    } catch (error) {
      this.logger.error("❌ Failed to get security context", error);
      return null;
    }
  }

  /**
   * Update security context
   */
  async updateSecurityContext(
    contextId: string,
    updates: Partial<SecurityContext>,
    serviceName: string,
    reason: string,
  ): Promise<SecurityContext> {
    try {
      const context = this.activeContexts.get(contextId);
      if (!context) {
        throw new Error(`Security context not found: ${contextId}`);
      }

      // Record modification
      const modification: ContextModification = {
        type: "write",
        field: Object.keys(updates).join(", "),
        timestamp: new Date(),
        serviceName,
        reason,
      };

      // Apply updates
      const updatedContext = {
        ...context,
        ...updates,
        lastAccessed: new Date(),
      };

      // Regenerate integrity hash
      updatedContext.integrityHash = await this.generateIntegrityHash(updatedContext);

      // Store updated context
      this.activeContexts.set(contextId, updatedContext);

      // Add modification to propagation chain
      if (updatedContext.propagationChain.length > 0) {
        const lastEntry = updatedContext.propagationChain[updatedContext.propagationChain.length - 1];
        lastEntry.modifications.push(modification);
      }

      this.logger.debug(`✅ Context updated: ${contextId} by ${serviceName}`);

      return updatedContext;
    } catch (error) {
      this.logger.error("❌ Failed to update security context", error);
      throw new ParlantIntegrationError(
        "Security context update failed",
        "CONTEXT_UPDATE_ERROR",
        { contextId, serviceName, error: error instanceof Error ? error.message : String(error) },
      );
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

      // Archive context for audit purposes
      await this.archiveContext(context);

      // Remove from active contexts
      this.activeContexts.delete(contextId);

      // Clean up related data
      this.contextCache.delete(contextId);
      this.transmissionHistory.delete(contextId);

      // Emit expiration event
      this.emit("context:expired", {
        contextId,
        operationId: context.operationId,
        expirationTime: new Date(),
      });

      this.logger.debug(`✅ Context expired: ${contextId}`);
    } catch (error) {
      this.logger.error("❌ Failed to expire security context", error);
    }
  }

  /**
   * Get context propagation statistics
   */
  getContextStatistics(): Record<string, unknown> {
    return {
      activeContexts: this.activeContexts.size,
      cachedContexts: this.contextCache.size,
      correlations: this.contextCorrelations.size,
      transmissionHistory: this.transmissionHistory.size,
      performanceStats: { ...this.performanceStats },
      memoryUsage: this.calculateMemoryUsage(),
      lastCleanup: this.performanceStats.lastCleanupTime,
    };
  }

  /**
   * Helper Methods
   */

  private generateContextId(): string {
    return `ctx_${Date.now()}_${crypto.randomBytes(16).toString("hex")}`;
  }

  private generateMasterEncryptionKey(): string {
    return process.env.PARLANT_CONTEXT_ENCRYPTION_KEY || crypto.randomBytes(32).toString("hex");
  }

  private generateContextEncryptionKey(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  private async generateIntegrityHash(context: SecurityContext): Promise<string> {
    const contextData = {
      contextId: context.contextId,
      userContext: context.userContext,
      operationId: context.operationId,
      securityLevel: context.securityLevel,
      createdAt: context.createdAt,
      encryptionKey: context.encryptionKey,
    };

    const data = JSON.stringify(contextData);
    return crypto.createHash("sha256").update(data).digest("hex");
  }

  private cloneUserContext(userContext: ParlantUserContext): ParlantUserContext {
    return {
      userId: userContext.userId,
      roles: [...userContext.roles],
      sessionId: userContext.sessionId,
      ipAddress: userContext.ipAddress,
      metadata: { ...userContext.metadata },
    };
  }

  private cloneContext(context: SecurityContext): SecurityContext {
    return {
      ...context,
      userContext: this.cloneUserContext(context.userContext),
      childContextIds: [...context.childContextIds],
      propagationChain: [...context.propagationChain],
      securityPolicies: [...context.securityPolicies],
      metadata: {
        ...context.metadata,
        performanceMetrics: { ...context.metadata.performanceMetrics },
      },
    };
  }

  private async initializeSecurityPolicies(): Promise<void> {
    // Initialize default security policies
    this.logger.debug("🔐 Initializing security policies...");
  }

  private async getApplicableSecurityPolicies(securityLevel: SecurityLevel): Promise<SecurityPolicy[]> {
    const policies: SecurityPolicy[] = [];

    // Add encryption policy for all levels
    policies.push({
      policyId: "encryption_policy",
      name: "Context Encryption Policy",
      type: "encryption",
      configuration: { algorithm: "AES-256-GCM" },
      enforcementLevel: "mandatory",
      appliedAt: new Date(),
    });

    // Add access control based on security level
    if (securityLevel === SecurityLevel._HIGH || securityLevel === SecurityLevel._CRITICAL) {
      policies.push({
        policyId: "access_control_policy",
        name: "Enhanced Access Control Policy",
        type: "access_control",
        configuration: { requireMFA: true },
        enforcementLevel: "mandatory",
        appliedAt: new Date(),
      });
    }

    return policies;
  }

  private getComplianceRequirements(securityLevel: SecurityLevel): string[] {
    const requirements = ["data_protection", "audit_trail"];

    if (securityLevel === SecurityLevel._HIGH || securityLevel === SecurityLevel._CRITICAL) {
      requirements.push("enhanced_monitoring", "incident_response");
    }

    if (securityLevel === SecurityLevel._CRITICAL) {
      requirements.push("real_time_threat_detection", "immediate_escalation");
    }

    return requirements;
  }

  private async createTransmissionPackage(
    context: SecurityContext,
    targetService: string,
    sourceService: string,
  ): Promise<ContextTransmissionPackage> {
    const encryptedContext = await this.encryptContext(context);
    const timestamp = new Date();

    const packageData = {
      encryptedContext,
      timestamp,
      sourceService,
      targetService,
    };

    const signature = this.generateTransmissionSignature(packageData);

    return {
      ...packageData,
      signature,
      transmissionMetadata: {
        contextId: context.contextId,
        securityLevel: context.securityLevel,
        transmissionId: crypto.randomBytes(16).toString("hex"),
      },
    };
  }

  private async encryptContext(context: SecurityContext): Promise<string> {
    const startTime = performance.now();

    try {
      const contextJson = JSON.stringify(context);
      const cipher = crypto.createCipher("aes-256-gcm", this.encryptionKey);
      let encrypted = cipher.update(contextJson, "utf8", "hex");
      encrypted += cipher.final("hex");

      // Update performance metrics
      const encryptionTime = performance.now() - startTime;
      context.metadata.performanceMetrics.serializationTime += encryptionTime;

      return encrypted;
    } catch (error) {
      this.logger.error("❌ Failed to encrypt context", error);
      throw new Error("Context encryption failed");
    }
  }

  private async decryptContextFromPackage(transmissionPackage: ContextTransmissionPackage): Promise<SecurityContext> {
    const startTime = performance.now();

    try {
      const decipher = crypto.createDecipher("aes-256-gcm", this.encryptionKey);
      let decrypted = decipher.update(transmissionPackage.encryptedContext, "hex", "utf8");
      decrypted += decipher.final("utf8");

      const context = JSON.parse(decrypted) as SecurityContext;

      // Update performance metrics
      const decryptionTime = performance.now() - startTime;
      context.metadata.performanceMetrics.deserializationTime += decryptionTime;

      return context;
    } catch (error) {
      this.logger.error("❌ Failed to decrypt context", error);
      throw new Error("Context decryption failed");
    }
  }

  private generateTransmissionSignature(packageData: Record<string, unknown>): string {
    const data = JSON.stringify(packageData);
    return crypto.createHmac("sha256", this.encryptionKey).update(data).digest("hex");
  }

  private async validateTransmissionPackage(transmissionPackage: ContextTransmissionPackage): Promise<void> {
    // Validate signature
    const packageData = {
      encryptedContext: transmissionPackage.encryptedContext,
      timestamp: transmissionPackage.timestamp,
      sourceService: transmissionPackage.sourceService,
      targetService: transmissionPackage.targetService,
    };

    const expectedSignature = this.generateTransmissionSignature(packageData);
    if (transmissionPackage.signature !== expectedSignature) {
      throw new Error("Invalid transmission package signature");
    }

    // Check transmission age
    const transmissionAge = Date.now() - transmissionPackage.timestamp.getTime();
    if (transmissionAge > 60000) { // 1 minute
      throw new Error("Transmission package too old");
    }
  }

  private async validatePolicyCompliance(
    context: SecurityContext,
    policy: SecurityPolicy,
  ): Promise<{ compliant: boolean; details: string }> {
    // Basic policy compliance validation
    switch (policy.type) {
      case "encryption":
        return {
          compliant: !!context.encryptionKey,
          details: context.encryptionKey ? "Context is encrypted" : "Context lacks encryption",
        };

      case "access_control":
        return {
          compliant: context.userContext.roles.length > 0,
          details: context.userContext.roles.length > 0 ? "User has roles assigned" : "No user roles assigned",
        };

      default:
        return { compliant: true, details: "Policy not implemented" };
    }
  }

  private calculateComplianceScore(
    context: SecurityContext,
    errors: string[],
    warnings: string[],
  ): number {
    const baseScore = 100;
    const errorPenalty = errors.length * 20;
    const warningPenalty = warnings.length * 5;

    return Math.max(0, baseScore - errorPenalty - warningPenalty);
  }

  private updatePerformanceStats(operation: string, duration: number): void {
    this.performanceStats.memoryUsage = this.calculateMemoryUsage();

    switch (operation) {
      case "creation":
        this.performanceStats.totalContextsCreated++;
        this.performanceStats.averageCreationTime = this.updateAverage(
          this.performanceStats.averageCreationTime,
          duration,
          this.performanceStats.totalContextsCreated,
        );
        break;

      case "propagation":
      case "reception":
        this.performanceStats.totalContextsPropagated++;
        this.performanceStats.averagePropagationTime = this.updateAverage(
          this.performanceStats.averagePropagationTime,
          duration,
          this.performanceStats.totalContextsPropagated,
        );
        break;

      case "validation":
        this.performanceStats.totalContextsValidated++;
        this.performanceStats.averageValidationTime = this.updateAverage(
          this.performanceStats.averageValidationTime,
          duration,
          this.performanceStats.totalContextsValidated,
        );
        break;
    }
  }

  private updateAverage(currentAverage: number, newValue: number, count: number): number {
    return (currentAverage * (count - 1) + newValue) / count;
  }

  private calculateMemoryUsage(): number {
    return (
      this.activeContexts.size +
      this.contextCache.size +
      this.contextCorrelations.size +
      this.transmissionHistory.size
    ) * 1024; // Rough estimate
  }

  private async archiveContext(context: SecurityContext): Promise<void> {
    // Archive context for audit purposes
    // This would typically write to a persistent storage
    this.logger.debug(`📦 Archiving context: ${context.contextId}`);
  }

  private async validateSystemSecurity(): Promise<void> {
    // Validate system security configuration
    this.logger.debug("🔒 Validating system security configuration...");
  }

  private async startPeriodicTasks(): Promise<void> {
    // Context cleanup every 5 minutes
    this.contextCleanupTimer = setInterval(() => {
      this.performContextCleanup();
    }, this.gcConfig.cleanupInterval);

    // Cache cleanup every 10 minutes
    this.cacheCleanupTimer = setInterval(() => {
      this.performCacheCleanup();
    }, 600000);

    // Performance monitoring every minute
    this.performanceMonitorTimer = setInterval(() => {
      this.updatePerformanceMonitoring();
    }, 60000);
  }

  private async stopPeriodicTasks(): Promise<void> {
    if (this.contextCleanupTimer) {
      clearInterval(this.contextCleanupTimer);
      this.contextCleanupTimer = null;
    }

    if (this.cacheCleanupTimer) {
      clearInterval(this.cacheCleanupTimer);
      this.cacheCleanupTimer = null;
    }

    if (this.performanceMonitorTimer) {
      clearInterval(this.performanceMonitorTimer);
      this.performanceMonitorTimer = null;
    }
  }

  private async performContextCleanup(): Promise<void> {
    const now = new Date();
    let cleanedCount = 0;

    for (const [contextId, context] of this.activeContexts.entries()) {
      if (context.expiresAt < now) {
        await this.expireContext(contextId);
        cleanedCount++;

        if (cleanedCount >= this.gcConfig.cleanupBatchSize) {
          break;
        }
      }
    }

    this.performanceStats.lastCleanupTime = now;

    if (cleanedCount > 0) {
      this.logger.debug(`🧹 Cleaned up ${cleanedCount} expired contexts`);
    }
  }

  private async performCacheCleanup(): Promise<void> {
    const now = new Date();
    let cleanedCount = 0;

    for (const [cacheKey, cacheEntry] of this.contextCache.entries()) {
      if (cacheEntry.expiresAt < now) {
        this.contextCache.delete(cacheKey);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug(`🧹 Cleaned up ${cleanedCount} expired cache entries`);
    }
  }

  private updatePerformanceMonitoring(): void {
    this.performanceStats.memoryUsage = this.calculateMemoryUsage();

    // Emit performance metrics
    this.emit("context:performance", this.performanceStats);
  }

  private async cleanupAllContexts(): Promise<void> {
    for (const contextId of this.activeContexts.keys()) {
      await this.expireContext(contextId);
    }
  }

  private async saveContextState(): Promise<void> {
    // Save critical context state for recovery
    this.logger.debug("💾 Saving context state...");
  }
}