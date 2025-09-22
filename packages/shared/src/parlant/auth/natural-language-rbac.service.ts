/**
 * PARLANT Natural Language Role-Based Access Control (RBAC) Service
 *
 * Comprehensive RBAC system with natural language permission management,
 * conversational role assignment, dynamic permission validation through chat
 * interface, and intelligent permission recommendations based on user
 * conversation patterns.
 *
 * @author Claude Code (Parlant Permission Management Specialist)
 * @version 1.0.0
 * @priority CRITICAL - Natural language permission management
 */

import { Injectable, Logger } from "@nestjs/common";

// Core Permission Interfaces
export interface NaturalLanguagePermission {
  id: string;
  name: string;
  description: string;
  naturalLanguageDescriptions: string[];
  scopePatterns: string[];
  riskLevel: "low" | "medium" | "high" | "critical";
  conversationalApprovalRequired: boolean;
}

export interface ConversationalRole {
  id: string;
  name: string;
  displayName: string;
  description: string;
  naturalLanguageDescriptions: string[];
  permissions: string[];
  hierarchyLevel: number;
  conversationalAssignmentRequired: boolean;
  autoAssignmentPatterns?: string[];
}

export interface PermissionRequest {
  conversationId: string;
  userId: string;
  requestText: string;
  requestType: "grant" | "revoke" | "check" | "explain";
  context: {
    userRole?: string;
    currentPermissions?: string[];
    sessionData?: any;
    timestamp: Date;
  };
}

export interface PermissionResponse {
  success: boolean;
  action: "granted" | "denied" | "pending" | "explained";
  permissions?: string[];
  explanation: string;
  conversationalSteps?: ConversationalPermissionStep[];
  riskAssessment?: PermissionRiskAssessment;
  auditId: string;
}

export interface ConversationalPermissionStep {
  stepId: string;
  type: "explanation" | "confirmation" | "justification" | "approval";
  message: string;
  expectedInput?: string[];
  timeout: number;
  requiredApprover?: string;
}

export interface PermissionRiskAssessment {
  riskScore: number;
  riskFactors: string[];
  requiresAdditionalApproval: boolean;
  recommendedActions: string[];
  conversationalValidationRequired: boolean;
}

export interface IntelligentPermissionRecommendation {
  suggestedPermissions: string[];
  confidence: number;
  reasoning: string[];
  conversationPatterns: string[];
  userBehaviorAnalysis: {
    accessPatterns: string[];
    timePatterns: string[];
    frequentlyUsedFeatures: string[];
  };
}

@Injectable()
export class NaturalLanguageRBACService {
  private readonly logger = new Logger(NaturalLanguageRBACService.name);

  // In-memory storage for demo (in production, use database)
  private readonly permissions = new Map<string, NaturalLanguagePermission>();
  private readonly roles = new Map<string, ConversationalRole>();
  private readonly userPermissions = new Map<string, string[]>();
  private readonly userRoles = new Map<string, string[]>();
  private readonly conversationHistory = new Map<string, any[]>();

  // Performance and analytics tracking
  private readonly analyticsMetrics = {
    totalPermissionRequests: 0,
    naturalLanguageProcessingTime: 0,
    permissionGranted: 0,
    permissionDenied: 0,
    conversationalInteractions: 0,
  };

  constructor() {
    this.initializeDefaultPermissions();
    this.initializeDefaultRoles();
    this.logger.log(
      "🎭 Natural Language RBAC Service initialized with conversational permission management",
    );
  }

  /**
   * Process natural language permission requests
   */
  async processPermissionRequest(
    request: PermissionRequest,
  ): Promise<PermissionResponse> {
    const startTime = performance.now();
    this.analyticsMetrics.totalPermissionRequests++;

    try {
      this.logger.debug(
        `Processing permission request for conversation: ${request.conversationId}`,
      );

      // Step 1: Parse natural language request
      const parsedRequest = await this.parseNaturalLanguageRequest(
        request.requestText,
      );

      // Step 2: Risk assessment
      const riskAssessment = await this.assessPermissionRisk(
        request,
        parsedRequest,
      );

      // Step 3: Process request based on type
      let response: PermissionResponse;
      switch (request.requestType) {
        case "grant":
          response = await this.processGrantRequest(
            request,
            parsedRequest,
            riskAssessment,
          );
          break;
        case "revoke":
          response = await this.processRevokeRequest(
            request,
            parsedRequest,
            riskAssessment,
          );
          break;
        case "check":
          response = await this.processCheckRequest(request, parsedRequest);
          break;
        case "explain":
          response = await this.processExplainRequest(request, parsedRequest);
          break;
        default:
          throw new Error(`Unknown request type: ${request.requestType}`);
      }

      // Step 4: Update conversation history
      this.updateConversationHistory(request.conversationId, request, response);

      // Step 5: Update metrics
      const processingTime = performance.now() - startTime;
      this.analyticsMetrics.naturalLanguageProcessingTime = processingTime;

      this.logger.log(
        `Permission request processed in ${processingTime.toFixed(2)}ms for conversation: ${request.conversationId}`,
      );
      return response;
    } catch (error) {
      this.logger.error(
        `Permission request failed for conversation: ${request.conversationId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Parse natural language permission request
   */
  private async parseNaturalLanguageRequest(requestText: string): Promise<{
    permissions: string[];
    action: string;
    confidence: number;
    entities: any[];
  }> {
    const text = requestText.toLowerCase();
    const permissions: string[] = [];
    let action = "unknown";
    let confidence = 0.5;
    const entities: any[] = [];

    // Action detection
    if (
      text.includes("give") ||
      text.includes("grant") ||
      text.includes("allow") ||
      text.includes("need")
    ) {
      action = "grant";
      confidence = 0.9;
    } else if (
      text.includes("remove") ||
      text.includes("revoke") ||
      text.includes("deny") ||
      text.includes("take away")
    ) {
      action = "revoke";
      confidence = 0.9;
    } else if (
      text.includes("check") ||
      text.includes("do i have") ||
      text.includes("can i")
    ) {
      action = "check";
      confidence = 0.8;
    } else if (
      text.includes("explain") ||
      text.includes("what is") ||
      text.includes("what does")
    ) {
      action = "explain";
      confidence = 0.8;
    }

    // Permission pattern matching
    const permissionPatterns = [
      { pattern: /read|view|see|access/, permission: "read" },
      { pattern: /write|edit|modify|update/, permission: "write" },
      { pattern: /delete|remove|destroy/, permission: "delete" },
      { pattern: /admin|administrator|manage/, permission: "admin" },
      { pattern: /user|users|user.management/, permission: "user_management" },
      {
        pattern: /system|systems|system.config/,
        permission: "system_configuration",
      },
      { pattern: /api|apis|api.access/, permission: "api_access" },
      { pattern: /database|db|data/, permission: "database_access" },
      {
        pattern: /security|secure|security.audit/,
        permission: "security_audit",
      },
      { pattern: /monitor|monitoring|logs/, permission: "monitoring" },
    ];

    for (const { pattern, permission } of permissionPatterns) {
      if (pattern.test(text)) {
        permissions.push(permission);
        entities.push({
          type: "permission",
          value: permission,
          confidence: 0.85,
        });
      }
    }

    // Resource detection
    const resourcePatterns = [
      { pattern: /file|files|document|documents/, resource: "files" },
      { pattern: /user|users|account|accounts/, resource: "users" },
      { pattern: /project|projects/, resource: "projects" },
      { pattern: /report|reports|analytics/, resource: "reports" },
      { pattern: /configuration|config|settings/, resource: "configuration" },
    ];

    for (const { pattern, resource } of resourcePatterns) {
      if (pattern.test(text)) {
        entities.push({
          type: "resource",
          value: resource,
          confidence: 0.8,
        });
      }
    }

    return {
      permissions,
      action,
      confidence,
      entities,
    };
  }

  /**
   * Assess risk for permission request
   */
  private async assessPermissionRisk(
    request: PermissionRequest,
    parsedRequest: any,
  ): Promise<PermissionRiskAssessment> {
    let riskScore = 0.0;
    const riskFactors: string[] = [];
    const recommendedActions: string[] = [];

    // Permission risk assessment
    for (const permission of parsedRequest.permissions) {
      const permissionData = this.permissions.get(permission);
      if (permissionData) {
        switch (permissionData.riskLevel) {
          case "critical":
            riskScore += 0.4;
            riskFactors.push(`Critical permission requested: ${permission}`);
            recommendedActions.push("Require multi-level approval");
            break;
          case "high":
            riskScore += 0.3;
            riskFactors.push(`High-risk permission requested: ${permission}`);
            recommendedActions.push("Require manager approval");
            break;
          case "medium":
            riskScore += 0.2;
            riskFactors.push(`Medium-risk permission requested: ${permission}`);
            break;
          case "low":
            riskScore += 0.1;
            break;
        }
      }
    }

    // Context-based risk factors
    if (!request.context.userRole) {
      riskScore += 0.2;
      riskFactors.push("No user role context available");
    }

    if (parsedRequest.confidence < 0.7) {
      riskScore += 0.1;
      riskFactors.push("Low confidence in natural language parsing");
    }

    // Time-based risk assessment
    const currentHour = new Date().getHours();
    if (currentHour < 6 || currentHour > 22) {
      riskScore += 0.1;
      riskFactors.push("Off-hours permission request");
    }

    const requiresAdditionalApproval = riskScore >= 0.5;
    const conversationalValidationRequired = riskScore >= 0.3;

    if (requiresAdditionalApproval) {
      recommendedActions.push("Additional approval required");
    }

    return {
      riskScore,
      riskFactors,
      requiresAdditionalApproval,
      recommendedActions,
      conversationalValidationRequired,
    };
  }

  /**
   * Process grant permission request
   */
  private async processGrantRequest(
    request: PermissionRequest,
    parsedRequest: any,
    riskAssessment: PermissionRiskAssessment,
  ): Promise<PermissionResponse> {
    const auditId = `grant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Check if conversational validation is required
    if (riskAssessment.conversationalValidationRequired) {
      const conversationalSteps: ConversationalPermissionStep[] = [
        {
          stepId: "confirm-grant",
          type: "confirmation",
          message: `I understand you want to grant the following permissions: ${parsedRequest.permissions.join(", ")}. This action has a risk score of ${riskAssessment.riskScore.toFixed(2)}. Do you want to proceed?`,
          expectedInput: ["yes", "no", "proceed", "cancel"],
          timeout: 60000,
        },
      ];

      if (riskAssessment.requiresAdditionalApproval) {
        conversationalSteps.push({
          stepId: "manager-approval",
          type: "approval",
          message:
            "This permission grant requires manager approval. Please wait for approval confirmation.",
          timeout: 300000, // 5 minutes
          requiredApprover: "manager",
        });
      }

      return {
        success: false,
        action: "pending",
        explanation: `Permission grant request is pending conversational validation due to risk factors: ${riskAssessment.riskFactors.join(", ")}`,
        conversationalSteps,
        riskAssessment,
        auditId,
      };
    }

    // Grant permissions
    const currentPermissions = this.userPermissions.get(request.userId) || [];
    const newPermissions = [
      ...new Set([...currentPermissions, ...parsedRequest.permissions]),
    ];
    this.userPermissions.set(request.userId, newPermissions);

    this.analyticsMetrics.permissionGranted++;

    return {
      success: true,
      action: "granted",
      permissions: parsedRequest.permissions,
      explanation: `Successfully granted permissions: ${parsedRequest.permissions.join(", ")}`,
      riskAssessment,
      auditId,
    };
  }

  /**
   * Process revoke permission request
   */
  private async processRevokeRequest(
    request: PermissionRequest,
    parsedRequest: any,
    riskAssessment: PermissionRiskAssessment,
  ): Promise<PermissionResponse> {
    const auditId = `revoke-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const currentPermissions = this.userPermissions.get(request.userId) || [];
    const remainingPermissions = currentPermissions.filter(
      (perm) => !parsedRequest.permissions.includes(perm),
    );
    this.userPermissions.set(request.userId, remainingPermissions);

    return {
      success: true,
      action: "granted", // Revoke is considered successful granting of revocation
      permissions: parsedRequest.permissions,
      explanation: `Successfully revoked permissions: ${parsedRequest.permissions.join(", ")}`,
      riskAssessment,
      auditId,
    };
  }

  /**
   * Process check permission request
   */
  private async processCheckRequest(
    request: PermissionRequest,
    parsedRequest: any,
  ): Promise<PermissionResponse> {
    const auditId = `check-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const currentPermissions = this.userPermissions.get(request.userId) || [];
    const hasPermissions = parsedRequest.permissions.filter((perm) =>
      currentPermissions.includes(perm),
    );
    const missingPermissions = parsedRequest.permissions.filter(
      (perm) => !currentPermissions.includes(perm),
    );

    let explanation = "";
    if (hasPermissions.length > 0) {
      explanation += `You have the following permissions: ${hasPermissions.join(", ")}. `;
    }
    if (missingPermissions.length > 0) {
      explanation += `You are missing these permissions: ${missingPermissions.join(", ")}.`;
    }

    return {
      success: true,
      action: "explained",
      permissions: hasPermissions,
      explanation,
      auditId,
    };
  }

  /**
   * Process explain permission request
   */
  private async processExplainRequest(
    request: PermissionRequest,
    parsedRequest: any,
  ): Promise<PermissionResponse> {
    const auditId = `explain-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    let explanation = "Here are the permission explanations:\n";

    for (const permission of parsedRequest.permissions) {
      const permissionData = this.permissions.get(permission);
      if (permissionData) {
        explanation += `• ${permissionData.name}: ${permissionData.description}\n`;
        explanation += `  Risk Level: ${permissionData.riskLevel}\n`;
        explanation += `  Natural Language: ${permissionData.naturalLanguageDescriptions.join(", ")}\n\n`;
      }
    }

    return {
      success: true,
      action: "explained",
      explanation,
      auditId,
    };
  }

  /**
   * Generate intelligent permission recommendations
   */
  async generateIntelligentRecommendations(
    userId: string,
    conversationId: string,
  ): Promise<IntelligentPermissionRecommendation> {
    const conversationHistory =
      this.conversationHistory.get(conversationId) || [];
    const currentPermissions = this.userPermissions.get(userId) || [];

    // Analyze conversation patterns
    const conversationPatterns =
      this.analyzeConversationPatterns(conversationHistory);

    // Analyze user behavior
    const userBehaviorAnalysis = this.analyzeUserBehavior(
      userId,
      conversationHistory,
    );

    // Generate recommendations based on patterns
    const suggestedPermissions = this.generatePermissionSuggestions(
      conversationPatterns,
      userBehaviorAnalysis,
      currentPermissions,
    );

    return {
      suggestedPermissions,
      confidence: 0.8,
      reasoning: [
        "Based on conversation patterns showing frequent access requests",
        "User behavior indicates need for additional permissions",
        "Role-based recommendations for current user level",
      ],
      conversationPatterns,
      userBehaviorAnalysis,
    };
  }

  /**
   * Analyze conversation patterns for permission insights
   */
  private analyzeConversationPatterns(conversationHistory: any[]): string[] {
    const patterns: string[] = [];

    // Simple pattern analysis (in production, use ML algorithms)
    const requestCounts = new Map<string, number>();

    for (const conversation of conversationHistory) {
      if (conversation.request && conversation.request.requestText) {
        const text = conversation.request.requestText.toLowerCase();

        if (text.includes("file") || text.includes("document")) {
          requestCounts.set(
            "file_access",
            (requestCounts.get("file_access") || 0) + 1,
          );
        }
        if (text.includes("user") || text.includes("account")) {
          requestCounts.set(
            "user_management",
            (requestCounts.get("user_management") || 0) + 1,
          );
        }
        if (text.includes("admin") || text.includes("manage")) {
          requestCounts.set(
            "administrative",
            (requestCounts.get("administrative") || 0) + 1,
          );
        }
      }
    }

    // Generate patterns based on frequency
    for (const [pattern, count] of Array.from(requestCounts.entries())) {
      if (count >= 3) {
        patterns.push(`Frequent ${pattern} requests (${count} times)`);
      }
    }

    return patterns;
  }

  /**
   * Analyze user behavior for permission recommendations
   */
  private analyzeUserBehavior(
    userId: string,
    conversationHistory: any[],
  ): {
    accessPatterns: string[];
    timePatterns: string[];
    frequentlyUsedFeatures: string[];
  } {
    // Simple behavior analysis (in production, use sophisticated analytics)
    return {
      accessPatterns: [
        "Regular working hours access",
        "Consistent permission usage",
      ],
      timePatterns: ["9AM-5PM primary activity", "Occasional evening access"],
      frequentlyUsedFeatures: [
        "File management",
        "User administration",
        "Report generation",
      ],
    };
  }

  /**
   * Generate permission suggestions based on analysis
   */
  private generatePermissionSuggestions(
    conversationPatterns: string[],
    userBehaviorAnalysis: any,
    currentPermissions: string[],
  ): string[] {
    const suggestions: string[] = [];

    // Based on conversation patterns
    if (conversationPatterns.some((p) => p.includes("file"))) {
      if (!currentPermissions.includes("read_files"))
        suggestions.push("read_files");
      if (!currentPermissions.includes("write_files"))
        suggestions.push("write_files");
    }

    if (conversationPatterns.some((p) => p.includes("user_management"))) {
      if (!currentPermissions.includes("user_management"))
        suggestions.push("user_management");
    }

    if (conversationPatterns.some((p) => p.includes("administrative"))) {
      if (!currentPermissions.includes("admin")) suggestions.push("admin");
    }

    return suggestions;
  }

  /**
   * Update conversation history
   */
  private updateConversationHistory(
    conversationId: string,
    request: PermissionRequest,
    response: PermissionResponse,
  ): void {
    const history = this.conversationHistory.get(conversationId) || [];
    history.push({
      timestamp: new Date(),
      request,
      response,
    });
    this.conversationHistory.set(conversationId, history);
  }

  /**
   * Initialize default permissions
   */
  private initializeDefaultPermissions(): void {
    const defaultPermissions: NaturalLanguagePermission[] = [
      {
        id: "read",
        name: "Read Access",
        description: "Permission to read and view content",
        naturalLanguageDescriptions: [
          "read",
          "view",
          "see",
          "access",
          "look at",
        ],
        scopePatterns: ["read.*", "view.*"],
        riskLevel: "low",
        conversationalApprovalRequired: false,
      },
      {
        id: "write",
        name: "Write Access",
        description: "Permission to create and modify content",
        naturalLanguageDescriptions: [
          "write",
          "edit",
          "modify",
          "update",
          "change",
        ],
        scopePatterns: ["write.*", "edit.*", "modify.*"],
        riskLevel: "medium",
        conversationalApprovalRequired: true,
      },
      {
        id: "delete",
        name: "Delete Access",
        description: "Permission to delete content",
        naturalLanguageDescriptions: ["delete", "remove", "destroy", "erase"],
        scopePatterns: ["delete.*", "remove.*"],
        riskLevel: "high",
        conversationalApprovalRequired: true,
      },
      {
        id: "admin",
        name: "Administrative Access",
        description: "Full administrative permissions",
        naturalLanguageDescriptions: [
          "admin",
          "administrator",
          "manage",
          "control",
        ],
        scopePatterns: ["admin.*", "manage.*"],
        riskLevel: "critical",
        conversationalApprovalRequired: true,
      },
      {
        id: "user_management",
        name: "User Management",
        description: "Permission to manage user accounts",
        naturalLanguageDescriptions: [
          "user management",
          "manage users",
          "user admin",
        ],
        scopePatterns: ["user.*", "account.*"],
        riskLevel: "high",
        conversationalApprovalRequired: true,
      },
    ];

    for (const permission of defaultPermissions) {
      this.permissions.set(permission.id, permission);
    }
  }

  /**
   * Initialize default roles
   */
  private initializeDefaultRoles(): void {
    const defaultRoles: ConversationalRole[] = [
      {
        id: "viewer",
        name: "Viewer",
        displayName: "Content Viewer",
        description: "Can view and read content",
        naturalLanguageDescriptions: ["viewer", "reader", "observer"],
        permissions: ["read"],
        hierarchyLevel: 1,
        conversationalAssignmentRequired: false,
        autoAssignmentPatterns: ["I want to view", "I need to read"],
      },
      {
        id: "editor",
        name: "Editor",
        displayName: "Content Editor",
        description: "Can view, create, and modify content",
        naturalLanguageDescriptions: ["editor", "writer", "contributor"],
        permissions: ["read", "write"],
        hierarchyLevel: 2,
        conversationalAssignmentRequired: true,
        autoAssignmentPatterns: ["I want to edit", "I need to write"],
      },
      {
        id: "manager",
        name: "Manager",
        displayName: "Content Manager",
        description: "Can view, create, modify, and delete content",
        naturalLanguageDescriptions: ["manager", "supervisor", "lead"],
        permissions: ["read", "write", "delete"],
        hierarchyLevel: 3,
        conversationalAssignmentRequired: true,
      },
      {
        id: "admin",
        name: "Administrator",
        displayName: "System Administrator",
        description: "Full system access and control",
        naturalLanguageDescriptions: ["admin", "administrator", "system admin"],
        permissions: ["read", "write", "delete", "admin", "user_management"],
        hierarchyLevel: 4,
        conversationalAssignmentRequired: true,
      },
    ];

    for (const role of defaultRoles) {
      this.roles.set(role.id, role);
    }
  }

  /**
   * Get user permissions
   */
  getUserPermissions(userId: string): string[] {
    return this.userPermissions.get(userId) || [];
  }

  /**
   * Get analytics metrics
   */
  getAnalyticsMetrics() {
    return { ...this.analyticsMetrics };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string; metrics: any }> {
    return {
      status: "healthy",
      metrics: this.getAnalyticsMetrics(),
    };
  }
}
