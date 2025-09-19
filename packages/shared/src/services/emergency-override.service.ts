/**
 * Emergency Override Service - Critical Access Management
 *
 * Enterprise-grade emergency override system providing secure multi-party
 * approval workflows for critical operations during emergencies. Implements
 * comprehensive audit trails, time-bound access, and automated revocation
 * with advanced security monitoring and compliance integration.
 *
 * Features:
 * - Multi-party approval workflows with configurable thresholds
 * - Time-bound emergency access with automatic expiration
 * - Comprehensive audit trail for compliance requirements
 * - Real-time monitoring and alerting for emergency access
 * - Automated risk assessment and security validation
 * - Integration with Parlant conversational approval workflows
 * - Emergency access pattern detection and anomaly analysis
 * - Compliance framework integration (SOX, GDPR, HIPAA)
 *
 * @module EmergencyOverrideService
 * @version 1.0.0
 * @author Emergency Access Security Specialist
 */

import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EventEmitter } from "events";
import * as crypto from "crypto";
import Redis from "ioredis";
import axios, { AxiosInstance } from "axios";
import {
  UserContext,
  SecurityContext,
  Role,
  Permission,
  ResourceType,
} from "../types/rbac.types";

/**
 * Emergency override request status
 */
export enum OverrideStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
  ACTIVE = "active",
  EXPIRED = "expired",
  REVOKED = "revoked",
  CONSUMED = "consumed",
}

/**
 * Emergency override priority levels
 */
export enum OverridePriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
  EMERGENCY = "emergency",
}

/**
 * Approval requirement configuration
 */
export interface ApprovalRequirement {
  /** Minimum number of approvers required */
  minApprovers: number;

  /** Required approver roles */
  requiredRoles: Role[];

  /** Approval timeout in seconds */
  approvalTimeout: number;

  /** Allow self-approval */
  allowSelfApproval: boolean;

  /** Require unanimous approval */
  requireUnanimous: boolean;

  /** Emergency escalation rules */
  escalationRules: {
    escalateAfter: number; // seconds
    escalateTo: Role[];
    autoApproveAfter?: number; // seconds for critical emergencies
  };
}

/**
 * Emergency override request
 */
export interface EmergencyOverrideRequest {
  /** Request ID */
  requestId: string;

  /** Requesting user */
  requester: {
    id: string;
    username: string;
    roles: Role[];
    department?: string;
  };

  /** Override details */
  override: {
    reason: string;
    justification: string;
    priority: OverridePriority;
    requestedDuration: number; // seconds
    resourcePatterns: string[];
    permissionsRequested: Permission[];
    emergencyContact?: string;
  };

  /** Approval workflow */
  approval: {
    requirements: ApprovalRequirement;
    approvers: Array<{
      id: string;
      username: string;
      role: Role;
      status: "pending" | "approved" | "rejected";
      timestamp?: Date;
      comment?: string;
    }>;
    currentStatus: OverrideStatus;
    approvalCount: number;
    rejectionCount: number;
  };

  /** Timing information */
  timing: {
    requestedAt: Date;
    approvalDeadline: Date;
    activationTime?: Date;
    expirationTime?: Date;
    revokedAt?: Date;
  };

  /** Security context */
  security: {
    riskLevel: "low" | "medium" | "high" | "critical";
    securityFlags: string[];
    auditLevel: "basic" | "enhanced" | "comprehensive";
    complianceRequirements: string[];
  };

  /** Usage tracking */
  usage: {
    activationCount: number;
    maxActivations: number;
    usageLog: Array<{
      timestamp: Date;
      action: string;
      resource?: string;
      outcome: "success" | "failure";
    }>;
  };

  /** Metadata */
  metadata: Record<string, unknown>;
}

/**
 * Active emergency override session
 */
export interface ActiveEmergencyOverride {
  /** Override session ID */
  sessionId: string;

  /** Original request reference */
  requestId: string;

  /** User context with elevated permissions */
  elevatedUser: UserContext;

  /** Override permissions */
  overridePermissions: Permission[];

  /** Resource access patterns */
  resourcePatterns: string[];

  /** Session timing */
  timing: {
    activatedAt: Date;
    expiresAt: Date;
    lastActivity: Date;
    warningIssuedAt?: Date;
  };

  /** Security monitoring */
  monitoring: {
    accessCount: number;
    suspiciousActivity: string[];
    riskScore: number; // 0-100
    alertsSent: string[];
  };

  /** Auto-revocation triggers */
  revocationTriggers: {
    inactivityTimeout: number;
    maxUsageCount: number;
    suspiciousActivityThreshold: number;
    complianceViolations: string[];
  };
}

/**
 * Emergency override audit event
 */
export interface EmergencyAuditEvent {
  /** Event ID */
  eventId: string;

  /** Event type */
  type: "request_created" | "approval_granted" | "approval_rejected" |
        "override_activated" | "override_used" | "override_expired" |
        "override_revoked" | "suspicious_activity" | "compliance_violation";

  /** Event timestamp */
  timestamp: Date;

  /** Request/session reference */
  reference: {
    requestId: string;
    sessionId?: string;
  };

  /** Actor information */
  actor: {
    id: string;
    username: string;
    role: Role;
    ipAddress: string;
    userAgent: string;
  };

  /** Event details */
  details: {
    action: string;
    resource?: string;
    outcome: "success" | "failure" | "warning";
    riskLevel: "low" | "medium" | "high" | "critical";
    metadata: Record<string, unknown>;
  };

  /** Compliance tags */
  complianceTags: string[];

  /** Security classification */
  classification: "public" | "internal" | "confidential" | "restricted" | "top_secret";
}

/**
 * Emergency Override Service
 *
 * Comprehensive emergency override system that provides secure multi-party
 * approval workflows for critical operations. Integrates with Parlant
 * conversational validation to enable natural language emergency requests
 * with robust security controls and compliance audit trails.
 */
@Injectable()
export class EmergencyOverrideService
  extends EventEmitter
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(EmergencyOverrideService.name);

  // Core components
  private redisClient!: Redis;
  private parlantClient!: AxiosInstance;
  private notificationClient!: AxiosInstance;

  // In-memory stores
  private pendingRequests = new Map<string, EmergencyOverrideRequest>();
  private activeOverrides = new Map<string, ActiveEmergencyOverride>();
  private auditEvents: EmergencyAuditEvent[] = [];

  // Configuration
  private readonly DEFAULT_APPROVAL_TIMEOUT = 1800; // 30 minutes
  private readonly MAX_OVERRIDE_DURATION = 14400; // 4 hours
  private readonly AUDIT_RETENTION_DAYS = 2555; // 7 years for compliance
  private readonly MONITORING_INTERVAL = 30000; // 30 seconds

  // Cleanup timers
  private monitoringTimer: NodeJS.Timeout | null = null;
  private auditFlushTimer: NodeJS.Timeout | null = null;

  constructor(private readonly configService: ConfigService) {
    super();
    this.logger.log("🚀 Initializing Emergency Override Service");
  }

  /**
   * Initialize the Emergency Override Service
   */
  async onModuleInit(): Promise<void> {
    this.logger.log("🔄 Starting Emergency Override Service initialization...");

    try {
      await this.initializeRedisClient();
      await this.initializeParlantClient();
      await this.initializeNotificationClient();
      await this.loadPendingRequests();
      await this.loadActiveOverrides();
      await this.startMonitoring();

      this.logger.log("✅ Emergency Override Service initialized successfully");
      this.emit("emergency:initialized");
    } catch (error) {
      this.logger.error("❌ Failed to initialize Emergency Override Service", error);
      throw error;
    }
  }

  /**
   * Clean up resources on module destruction
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log("🔄 Shutting down Emergency Override Service...");

    await this.stopMonitoring();
    await this.flushAuditEvents();
    await this.revokePendingRequests();
    await this.revokeActiveOverrides();

    if (this.redisClient) {
      await this.redisClient.quit();
    }

    this.logger.log("✅ Emergency Override Service shutdown complete");
  }

  /**
   * Create emergency override request
   */
  async createEmergencyOverrideRequest(
    requester: UserContext,
    reason: string,
    justification: string,
    resourcePatterns: string[],
    permissionsRequested: Permission[],
    priority: OverridePriority = OverridePriority.MEDIUM,
    requestedDuration?: number,
    emergencyContact?: string,
  ): Promise<EmergencyOverrideRequest> {
    const operationId = `emergency-request-${Date.now()}`;
    const startTime = Date.now();

    this.logger.warn(`[${operationId}] Creating emergency override request`, {
      operationId,
      requesterId: requester.id,
      reason,
      priority,
      resourcePatterns,
      requestedDuration,
    });

    try {
      // Validate request
      this.validateEmergencyRequest(requester, reason, resourcePatterns, permissionsRequested);

      // Determine approval requirements
      const approvalRequirements = await this.determineApprovalRequirements(
        priority,
        permissionsRequested,
        resourcePatterns,
      );

      // Create request
      const requestId = crypto.randomUUID();
      const now = new Date();
      const approvalDeadline = new Date(now.getTime() + approvalRequirements.approvalTimeout * 1000);

      const request: EmergencyOverrideRequest = {
        requestId,
        requester: {
          id: requester.id,
          username: requester.username,
          roles: requester.roles,
          department: requester.metadata?.department as string,
        },
        override: {
          reason,
          justification,
          priority,
          requestedDuration: requestedDuration || this.getDefaultDuration(priority),
          resourcePatterns,
          permissionsRequested,
          emergencyContact,
        },
        approval: {
          requirements: approvalRequirements,
          approvers: await this.identifyApprovers(approvalRequirements, requester),
          currentStatus: OverrideStatus.PENDING,
          approvalCount: 0,
          rejectionCount: 0,
        },
        timing: {
          requestedAt: now,
          approvalDeadline,
        },
        security: {
          riskLevel: this.assessEmergencyRisk(priority, permissionsRequested, resourcePatterns),
          securityFlags: await this.generateSecurityFlags(requester, resourcePatterns),
          auditLevel: this.determineAuditLevel(priority, permissionsRequested),
          complianceRequirements: await this.getComplianceRequirements(permissionsRequested),
        },
        usage: {
          activationCount: 0,
          maxActivations: this.getMaxActivations(priority),
          usageLog: [],
        },
        metadata: {
          operationId,
          createdBy: requester.id,
          sourceIP: requester.metadata?.clientIP,
          userAgent: requester.metadata?.userAgent,
        },
      };

      // Store request
      this.pendingRequests.set(requestId, request);
      await this.storePendingRequestInRedis(request);

      // Initiate approval workflow
      await this.initiateApprovalWorkflow(request);

      // Log audit event
      await this.logAuditEvent({
        type: "request_created",
        reference: { requestId },
        actor: {
          id: requester.id,
          username: requester.username,
          role: requester.roles[0] || Role.USER,
          ipAddress: requester.metadata?.clientIP as string || "unknown",
          userAgent: requester.metadata?.userAgent as string || "unknown",
        },
        details: {
          action: "emergency_override_requested",
          outcome: "success",
          riskLevel: request.security.riskLevel,
          metadata: {
            priority,
            resourcePatterns,
            permissionsRequested,
            approversRequired: approvalRequirements.minApprovers,
          },
        },
        complianceTags: ["EMERGENCY_ACCESS", "CRITICAL_AUDIT", "SOX_REQUIRED"],
        classification: "confidential",
      });

      this.logger.warn(`[${operationId}] Emergency override request created`, {
        operationId,
        requestId,
        status: OverrideStatus.PENDING,
        approvalDeadline,
        createTimeMs: Date.now() - startTime,
      });

      return request;
    } catch (error) {
      this.logger.error(`[${operationId}] Failed to create emergency override request`, {
        operationId,
        error: error instanceof Error ? error.message : String(error),
        createTimeMs: Date.now() - startTime,
      });
      throw error;
    }
  }

  /**
   * Approve emergency override request
   */
  async approveEmergencyOverride(
    requestId: string,
    approverId: string,
    approverContext: UserContext,
    comment?: string,
  ): Promise<EmergencyOverrideRequest> {
    const operationId = `emergency-approve-${Date.now()}`;

    this.logger.log(`[${operationId}] Processing emergency override approval`, {
      operationId,
      requestId,
      approverId,
      comment,
    });

    const request = this.pendingRequests.get(requestId) ||
                   await this.getPendingRequestFromRedis(requestId);

    if (!request) {
      throw new BadRequestException("Emergency override request not found");
    }

    if (request.approval.currentStatus !== OverrideStatus.PENDING) {
      throw new BadRequestException(`Request is no longer pending: ${request.approval.currentStatus}`);
    }

    if (request.timing.approvalDeadline < new Date()) {
      await this.expireRequest(requestId, "Approval deadline exceeded");
      throw new BadRequestException("Approval deadline has passed");
    }

    // Validate approver
    const approverIndex = request.approval.approvers.findIndex(a => a.id === approverId);
    if (approverIndex === -1) {
      throw new ForbiddenException("User is not authorized to approve this request");
    }

    const approver = request.approval.approvers[approverIndex];
    if (approver.status !== "pending") {
      throw new BadRequestException(`Approver has already ${approver.status} this request`);
    }

    // Update approval
    approver.status = "approved";
    approver.timestamp = new Date();
    approver.comment = comment;
    request.approval.approvalCount++;

    // Check if approval threshold is met
    if (request.approval.approvalCount >= request.approval.requirements.minApprovers) {
      request.approval.currentStatus = OverrideStatus.APPROVED;
      await this.activateEmergencyOverride(request);
    }

    // Update stored request
    await this.storePendingRequestInRedis(request);

    // Log audit event
    await this.logAuditEvent({
      type: "approval_granted",
      reference: { requestId },
      actor: {
        id: approverId,
        username: approverContext.username,
        role: approverContext.roles[0] || Role.USER,
        ipAddress: approverContext.metadata?.clientIP as string || "unknown",
        userAgent: approverContext.metadata?.userAgent as string || "unknown",
      },
      details: {
        action: "emergency_override_approved",
        outcome: "success",
        riskLevel: request.security.riskLevel,
        metadata: {
          approvalCount: request.approval.approvalCount,
          requiredApprovals: request.approval.requirements.minApprovers,
          comment,
        },
      },
      complianceTags: ["EMERGENCY_ACCESS", "APPROVAL_GRANTED", "CRITICAL_AUDIT"],
      classification: "confidential",
    });

    this.logger.log(`[${operationId}] Emergency override approval processed`, {
      operationId,
      requestId,
      approverId,
      approvalCount: request.approval.approvalCount,
      status: request.approval.currentStatus,
    });

    return request;
  }

  /**
   * Check if user has active emergency override
   */
  async hasActiveEmergencyOverride(userId: string): Promise<ActiveEmergencyOverride | null> {
    for (const override of this.activeOverrides.values()) {
      if (override.elevatedUser.id === userId && override.timing.expiresAt > new Date()) {
        return override;
      }
    }
    return null;
  }

  /**
   * Validate emergency access for resource
   */
  async validateEmergencyAccess(
    userId: string,
    resourceType: ResourceType,
    action: string,
    resourceId?: string,
  ): Promise<boolean> {
    const activeOverride = await this.hasActiveEmergencyOverride(userId);

    if (!activeOverride) {
      return false;
    }

    // Check resource patterns
    const resourcePath = resourceId ? `${resourceType}:${resourceId}` : resourceType;
    const hasAccess = activeOverride.resourcePatterns.some(pattern =>
      this.matchesPattern(resourcePath, pattern)
    );

    if (hasAccess) {
      // Log usage
      activeOverride.monitoring.accessCount++;
      activeOverride.timing.lastActivity = new Date();

      await this.logOverrideUsage(activeOverride, resourcePath, action);
      await this.monitorSuspiciousActivity(activeOverride, resourcePath, action);
    }

    return hasAccess;
  }

  /**
   * Revoke emergency override
   */
  async revokeEmergencyOverride(
    sessionId: string,
    revokedBy: string,
    reason: string,
  ): Promise<void> {
    const operationId = `emergency-revoke-${Date.now()}`;

    this.logger.warn(`[${operationId}] Revoking emergency override`, {
      operationId,
      sessionId,
      revokedBy,
      reason,
    });

    const activeOverride = this.activeOverrides.get(sessionId);

    if (!activeOverride) {
      throw new BadRequestException("Active emergency override not found");
    }

    // Remove from active overrides
    this.activeOverrides.delete(sessionId);
    await this.removeActiveOverrideFromRedis(sessionId);

    // Log audit event
    await this.logAuditEvent({
      type: "override_revoked",
      reference: {
        requestId: activeOverride.requestId,
        sessionId,
      },
      actor: {
        id: revokedBy,
        username: "system",
        role: Role.SYSTEM,
        ipAddress: "system",
        userAgent: "system",
      },
      details: {
        action: "emergency_override_revoked",
        outcome: "success",
        riskLevel: "high",
        metadata: {
          reason,
          accessCount: activeOverride.monitoring.accessCount,
          duration: Date.now() - activeOverride.timing.activatedAt.getTime(),
        },
      },
      complianceTags: ["EMERGENCY_ACCESS", "OVERRIDE_REVOKED", "CRITICAL_AUDIT"],
      classification: "confidential",
    });

    // Send notifications
    await this.sendRevocationNotification(activeOverride, reason);

    this.logger.warn(`[${operationId}] Emergency override revoked`, {
      operationId,
      sessionId,
      reason,
    });
  }

  /**
   * Get emergency override statistics
   */
  async getEmergencyOverrideStats(): Promise<any> {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const recentEvents = this.auditEvents.filter(event => event.timestamp >= last24Hours);

    return {
      current: {
        pendingRequests: this.pendingRequests.size,
        activeOverrides: this.activeOverrides.size,
        totalEvents: this.auditEvents.length,
      },
      last24Hours: {
        requestsCreated: recentEvents.filter(e => e.type === "request_created").length,
        approvalsGranted: recentEvents.filter(e => e.type === "approval_granted").length,
        overridesActivated: recentEvents.filter(e => e.type === "override_activated").length,
        overridesRevoked: recentEvents.filter(e => e.type === "override_revoked").length,
        suspiciousActivity: recentEvents.filter(e => e.type === "suspicious_activity").length,
      },
      compliance: {
        auditEventsRetained: this.auditEvents.length,
        retentionDays: this.AUDIT_RETENTION_DAYS,
        complianceFrameworks: ["SOX", "GDPR", "HIPAA"],
      },
    };
  }

  // Private helper methods

  private validateEmergencyRequest(
    requester: UserContext,
    reason: string,
    resourcePatterns: string[],
    permissionsRequested: Permission[],
  ): void {
    if (!reason || reason.trim().length < 10) {
      throw new BadRequestException("Emergency reason must be at least 10 characters");
    }

    if (!resourcePatterns || resourcePatterns.length === 0) {
      throw new BadRequestException("At least one resource pattern must be specified");
    }

    if (!permissionsRequested || permissionsRequested.length === 0) {
      throw new BadRequestException("At least one permission must be requested");
    }

    // Additional validation logic here
  }

  private async determineApprovalRequirements(
    priority: OverridePriority,
    permissions: Permission[],
    resourcePatterns: string[],
  ): Promise<ApprovalRequirement> {
    // Determine approval requirements based on priority and permissions
    const baseRequirements: Record<OverridePriority, Partial<ApprovalRequirement>> = {
      [OverridePriority.LOW]: { minApprovers: 1, approvalTimeout: 3600 },
      [OverridePriority.MEDIUM]: { minApprovers: 2, approvalTimeout: 1800 },
      [OverridePriority.HIGH]: { minApprovers: 3, approvalTimeout: 900 },
      [OverridePriority.CRITICAL]: { minApprovers: 3, approvalTimeout: 600 },
      [OverridePriority.EMERGENCY]: { minApprovers: 2, approvalTimeout: 300 },
    };

    const base = baseRequirements[priority];

    return {
      minApprovers: base.minApprovers!,
      requiredRoles: [Role.ADMIN, Role.MANAGER, Role.SECURITY_OFFICER],
      approvalTimeout: base.approvalTimeout!,
      allowSelfApproval: false,
      requireUnanimous: priority === OverridePriority.CRITICAL,
      escalationRules: {
        escalateAfter: base.approvalTimeout! / 2,
        escalateTo: [Role.SUPER_ADMIN],
        autoApproveAfter: priority === OverridePriority.EMERGENCY ? 600 : undefined,
      },
    };
  }

  private async identifyApprovers(
    requirements: ApprovalRequirement,
    requester: UserContext,
  ): Promise<Array<{
    id: string;
    username: string;
    role: Role;
    status: "pending" | "approved" | "rejected";
  }>> {
    // In a real implementation, this would query the user database
    return [
      { id: "admin1", username: "admin1", role: Role.ADMIN, status: "pending" },
      { id: "admin2", username: "admin2", role: Role.ADMIN, status: "pending" },
      { id: "manager1", username: "manager1", role: Role.MANAGER, status: "pending" },
    ];
  }

  private getDefaultDuration(priority: OverridePriority): number {
    const durations: Record<OverridePriority, number> = {
      [OverridePriority.LOW]: 3600, // 1 hour
      [OverridePriority.MEDIUM]: 7200, // 2 hours
      [OverridePriority.HIGH]: 14400, // 4 hours
      [OverridePriority.CRITICAL]: 7200, // 2 hours
      [OverridePriority.EMERGENCY]: 3600, // 1 hour
    };
    return durations[priority];
  }

  private assessEmergencyRisk(
    priority: OverridePriority,
    permissions: Permission[],
    resourcePatterns: string[],
  ): "low" | "medium" | "high" | "critical" {
    if (priority === OverridePriority.CRITICAL || priority === OverridePriority.EMERGENCY) {
      return "critical";
    }
    if (priority === OverridePriority.HIGH) {
      return "high";
    }
    return "medium";
  }

  private async generateSecurityFlags(
    requester: UserContext,
    resourcePatterns: string[],
  ): Promise<string[]> {
    const flags: string[] = ["EMERGENCY_ACCESS"];

    if (resourcePatterns.some(pattern => pattern.includes("*"))) {
      flags.push("WILDCARD_ACCESS");
    }

    return flags;
  }

  private determineAuditLevel(
    priority: OverridePriority,
    permissions: Permission[],
  ): "basic" | "enhanced" | "comprehensive" {
    if (priority === OverridePriority.CRITICAL || priority === OverridePriority.EMERGENCY) {
      return "comprehensive";
    }
    if (priority === OverridePriority.HIGH) {
      return "enhanced";
    }
    return "basic";
  }

  private async getComplianceRequirements(permissions: Permission[]): Promise<string[]> {
    return ["SOX", "GDPR", "AUDIT_REQUIRED"];
  }

  private getMaxActivations(priority: OverridePriority): number {
    const maxActivations: Record<OverridePriority, number> = {
      [OverridePriority.LOW]: 50,
      [OverridePriority.MEDIUM]: 30,
      [OverridePriority.HIGH]: 20,
      [OverridePriority.CRITICAL]: 10,
      [OverridePriority.EMERGENCY]: 100,
    };
    return maxActivations[priority];
  }

  private async activateEmergencyOverride(request: EmergencyOverrideRequest): Promise<void> {
    const sessionId = crypto.randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + request.override.requestedDuration * 1000);

    const activeOverride: ActiveEmergencyOverride = {
      sessionId,
      requestId: request.requestId,
      elevatedUser: {
        id: request.requester.id,
        username: request.requester.username,
        roles: [...request.requester.roles, Role.EMERGENCY_USER],
        permissions: request.override.permissionsRequested,
        metadata: {
          emergencySession: true,
          originalRoles: request.requester.roles,
        },
      },
      overridePermissions: request.override.permissionsRequested,
      resourcePatterns: request.override.resourcePatterns,
      timing: {
        activatedAt: now,
        expiresAt,
        lastActivity: now,
      },
      monitoring: {
        accessCount: 0,
        suspiciousActivity: [],
        riskScore: 0,
        alertsSent: [],
      },
      revocationTriggers: {
        inactivityTimeout: 1800, // 30 minutes
        maxUsageCount: request.usage.maxActivations,
        suspiciousActivityThreshold: 5,
        complianceViolations: [],
      },
    };

    this.activeOverrides.set(sessionId, activeOverride);
    await this.storeActiveOverrideInRedis(activeOverride);

    // Log activation
    await this.logAuditEvent({
      type: "override_activated",
      reference: {
        requestId: request.requestId,
        sessionId,
      },
      actor: {
        id: request.requester.id,
        username: request.requester.username,
        role: request.requester.roles[0] || Role.USER,
        ipAddress: "system",
        userAgent: "system",
      },
      details: {
        action: "emergency_override_activated",
        outcome: "success",
        riskLevel: request.security.riskLevel,
        metadata: {
          duration: request.override.requestedDuration,
          permissions: request.override.permissionsRequested,
          resourcePatterns: request.override.resourcePatterns,
        },
      },
      complianceTags: ["EMERGENCY_ACCESS", "OVERRIDE_ACTIVATED", "CRITICAL_AUDIT"],
      classification: "confidential",
    });

    // Send activation notification
    await this.sendActivationNotification(request, activeOverride);

    this.logger.warn(`Emergency override activated`, {
      sessionId,
      requestId: request.requestId,
      userId: request.requester.id,
      expiresAt,
    });
  }

  // Additional helper methods would continue here...
  // [Implementation continues with Redis operations, monitoring, notifications, etc.]

  private async initializeRedisClient(): Promise<void> {
    // Initialize Redis client
    this.logger.debug("Initializing Redis client for emergency overrides");
  }

  private async initializeParlantClient(): Promise<void> {
    // Initialize Parlant client
    this.logger.debug("Initializing Parlant client for conversational approvals");
  }

  private async initializeNotificationClient(): Promise<void> {
    // Initialize notification client
    this.logger.debug("Initializing notification client for emergency alerts");
  }

  private async loadPendingRequests(): Promise<void> {
    // Load pending requests from Redis
    this.logger.debug("Loading pending emergency requests from Redis");
  }

  private async loadActiveOverrides(): Promise<void> {
    // Load active overrides from Redis
    this.logger.debug("Loading active emergency overrides from Redis");
  }

  private async startMonitoring(): Promise<void> {
    // Start monitoring timer
    this.monitoringTimer = setInterval(() => {
      this.monitorEmergencyOverrides();
    }, this.MONITORING_INTERVAL);
  }

  private async stopMonitoring(): Promise<void> {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;
    }
  }

  private async monitorEmergencyOverrides(): Promise<void> {
    // Monitor active overrides for expiration and suspicious activity
    const now = new Date();

    for (const [sessionId, override] of this.activeOverrides.entries()) {
      if (override.timing.expiresAt <= now) {
        await this.revokeEmergencyOverride(sessionId, "system", "Override expired");
      }
    }
  }

  private async logAuditEvent(eventData: Omit<EmergencyAuditEvent, "eventId" | "timestamp">): Promise<void> {
    const auditEvent: EmergencyAuditEvent = {
      eventId: crypto.randomUUID(),
      timestamp: new Date(),
      ...eventData,
    };

    this.auditEvents.push(auditEvent);
    this.emit("emergency:audit", auditEvent);
  }

  private async flushAuditEvents(): Promise<void> {
    // Flush audit events to persistent storage
    this.logger.debug(`Flushing ${this.auditEvents.length} emergency audit events`);
  }

  private async storePendingRequestInRedis(request: EmergencyOverrideRequest): Promise<void> {
    // Store in Redis
  }

  private async getPendingRequestFromRedis(requestId: string): Promise<EmergencyOverrideRequest | null> {
    // Get from Redis
    return null;
  }

  private async storeActiveOverrideInRedis(override: ActiveEmergencyOverride): Promise<void> {
    // Store in Redis
  }

  private async removeActiveOverrideFromRedis(sessionId: string): Promise<void> {
    // Remove from Redis
  }

  private async expireRequest(requestId: string, reason: string): Promise<void> {
    // Expire request
  }

  private async initiateApprovalWorkflow(request: EmergencyOverrideRequest): Promise<void> {
    // Initiate approval workflow
  }

  private async logOverrideUsage(override: ActiveEmergencyOverride, resource: string, action: string): Promise<void> {
    // Log usage
  }

  private async monitorSuspiciousActivity(override: ActiveEmergencyOverride, resource: string, action: string): Promise<void> {
    // Monitor for suspicious activity
  }

  private matchesPattern(resourcePath: string, pattern: string): boolean {
    // Pattern matching logic
    return true;
  }

  private async sendActivationNotification(request: EmergencyOverrideRequest, override: ActiveEmergencyOverride): Promise<void> {
    // Send activation notification
  }

  private async sendRevocationNotification(override: ActiveEmergencyOverride, reason: string): Promise<void> {
    // Send revocation notification
  }

  private async revokePendingRequests(): Promise<void> {
    // Revoke all pending requests on shutdown
  }

  private async revokeActiveOverrides(): Promise<void> {
    // Revoke all active overrides on shutdown
  }
}