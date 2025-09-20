/**
 * PARLANT Phase 1 - Risk-Based Approval Workflow Engine
 *
 * Provides intelligent approval workflow system with escalation procedures,
 * dual-approval mechanisms, and risk-contextualized routing based on
 * comprehensive risk assessment results.
 *
 * Architecture: Local-only with enterprise security standards
 * Integration: PARLANT validation system compatible
 * Standards: TypeScript strict, comprehensive error handling
 */

import { EventEmitter } from 'events';

/**
 * Core approval workflow interfaces and types
 */
export interface ApprovalRequest {
  readonly id: string;
  readonly requesterId: string;
  readonly timestamp: Date;
  readonly operation: DatabaseOperation;
  readonly riskAssessment: RiskAssessmentResult;
  readonly _context: OperationContext;
  readonly _metadata: Record<string, unknown>;
  priority: ApprovalPriority;
  status: ApprovalStatus;
  approvers: ApprovalRecord[];
  escalationLevel: number;
  deadline?: Date;
  businessJustification?: string;
  technicalJustification?: string;
}

export interface DatabaseOperation {
  readonly type:
    | 'SELECT'
    | 'INSERT'
    | 'UPDATE'
    | 'DELETE'
    | 'CREATE'
    | 'ALTER'
    | 'DROP'
    | 'BACKUP'
    | 'RESTORE';
  readonly target: string;
  readonly schema?: string;
  readonly affectedRows?: number;
  readonly queryComplexity: number;
  readonly estimatedExecutionTime: number;
  readonly dataVolume: number;
  readonly parameters: Record<string, unknown>;
}

export interface RiskAssessmentResult {
  readonly overallScore: number;
  readonly dimensions: {
    readonly dataSensitivity: number;
    readonly operationImpact: number;
    readonly userContext: number;
    readonly timingFactors: number;
    readonly complianceRequirements: number;
  };
  readonly riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  readonly confidenceScore: number;
  readonly validationRequirements: ValidationRequirement[];
  readonly mitigationStrategies: string[];
  readonly complianceFlags: ComplianceFlag[];
}

export interface OperationContext {
  readonly userId: string;
  readonly userRole: string;
  readonly sessionId: string;
  readonly sourceIp: string;
  readonly userAgent: string;
  readonly department: string;
  readonly accessLevel: number;
  readonly previousActions: string[];
  readonly timeOfDay: string;
  readonly workingHours: boolean;
  readonly geographic: GeographicContext;
}

export interface GeographicContext {
  readonly country: string;
  readonly region: string;
  readonly timezone: string;
  readonly regulatoryJurisdiction: string[];
  readonly dataResidencyRequirements: string[];
}

export interface ValidationRequirement {
  readonly type: string;
  readonly description: string;
  readonly mandatory: boolean;
  readonly automatable: boolean;
  readonly estimatedTime: number;
  readonly dependencies: string[];
}

export interface ComplianceFlag {
  readonly regulation: string;
  readonly requirement: string;
  readonly severity: 'INFO' | 'WARNING' | 'CRITICAL';
  readonly description: string;
  readonly remediation: string[];
}

export interface ApprovalRecord {
  readonly approverId: string;
  readonly approverRole: string;
  readonly timestamp: Date;
  readonly decision: 'APPROVED' | 'REJECTED' | 'PENDING' | 'DELEGATED';
  readonly reasoning: string;
  readonly conditions?: string[];
  readonly delegatedTo?: string;
  readonly validationResults?: ValidationResult[];
}

export interface ValidationResult {
  readonly validationType: string;
  readonly status: 'PASSED' | 'FAILED' | 'WARNING' | 'PENDING';
  readonly score: number;
  readonly details: string;
  readonly evidence: unknown[];
  readonly recommendations: string[];
}

export type ApprovalPriority =
  | 'LOW'
  | 'NORMAL'
  | 'HIGH'
  | 'URGENT'
  | 'EMERGENCY';
export type ApprovalStatus =
  | 'PENDING'
  | 'UNDER_REVIEW'
  | 'ESCALATED'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CANCELLED';

export interface WorkflowConfiguration {
  readonly riskThresholds: RiskThresholds;
  readonly approvalRules: ApprovalRule[];
  readonly escalationPolicies: EscalationPolicy[];
  readonly timeoutSettings: TimeoutSettings;
  readonly notificationSettings: NotificationSettings;
  readonly auditSettings: AuditSettings;
}

export interface RiskThresholds {
  readonly lowRisk: { max: number; approvers: number; timeLimit: number };
  readonly mediumRisk: { max: number; approvers: number; timeLimit: number };
  readonly highRisk: { max: number; approvers: number; timeLimit: number };
  readonly criticalRisk: { max: number; approvers: number; timeLimit: number };
}

export interface ApprovalRule {
  readonly id: string;
  readonly condition: string;
  readonly requiredApprovers: string[];
  readonly minimumApprovals: number;
  readonly maximumTime: number;
  readonly allowDelegation: boolean;
  readonly requireConsensus: boolean;
  readonly skipOnLowRisk: boolean;
}

export interface EscalationPolicy {
  readonly id: string;
  readonly triggerConditions: string[];
  readonly escalationPath: string[];
  readonly timeoutMinutes: number;
  readonly notificationChannels: string[];
  readonly automaticApproval: boolean;
  readonly emergencyBypass: boolean;
}

export interface TimeoutSettings {
  readonly defaultTimeout: number;
  readonly lowRiskTimeout: number;
  readonly mediumRiskTimeout: number;
  readonly highRiskTimeout: number;
  readonly criticalRiskTimeout: number;
  readonly escalationInterval: number;
  readonly emergencyBypassTimeout: number;
}

export interface NotificationSettings {
  readonly channels: string[];
  readonly templates: Record<string, string>;
  readonly urgencyLevels: Record<string, string[]>;
  readonly deliveryMethods: string[];
  readonly retryPolicy: RetryPolicy;
}

export interface RetryPolicy {
  readonly maxRetries: number;
  readonly retryInterval: number;
  readonly backoffMultiplier: number;
  readonly maxInterval: number;
}

export interface AuditSettings {
  readonly logLevel: 'BASIC' | 'DETAILED' | 'COMPREHENSIVE';
  readonly retentionPeriod: number;
  readonly encryptionRequired: boolean;
  readonly complianceReporting: boolean;
  readonly realTimeMonitoring: boolean;
}

export interface WorkflowMetrics {
  readonly totalRequests: number;
  readonly approvedRequests: number;
  readonly rejectedRequests: number;
  readonly escalatedRequests: number;
  readonly averageProcessingTime: number;
  readonly riskDistribution: Record<string, number>;
  readonly approverWorkload: Record<string, number>;
  readonly complianceScore: number;
  readonly systemPerformance: PerformanceMetrics;
}

export interface PerformanceMetrics {
  readonly avgResponseTime: number;
  readonly throughput: number;
  readonly errorRate: number;
  readonly availability: number;
  readonly scalabilityMetrics: ScalabilityMetrics;
}

export interface ScalabilityMetrics {
  readonly concurrentRequests: number;
  readonly queueDepth: number;
  readonly resourceUtilization: number;
  readonly bottleneckAnalysis: string[];
}

/**
 * Risk-Based Approval Workflow Engine
 *
 * Provides comprehensive approval workflow management with intelligent
 * routing, escalation procedures, and risk-contextualized decision making.
 */
export class RiskBasedApprovalWorkflowService extends EventEmitter {
  private readonly configuration: WorkflowConfiguration;
  private readonly pendingRequests: Map<string, ApprovalRequest>;
  private readonly approvalHistory: Map<string, ApprovalRecord[]>;
  private readonly workflowMetrics: WorkflowMetrics;
  private readonly escalationTimers: Map<string, NodeJS.Timeout>;
  private readonly notificationQueue: unknown[];
  private readonly auditTrail: unknown[];

  constructor(configuration: WorkflowConfiguration) {
    super();
    this.configuration = configuration;
    this.pendingRequests = new Map();
    this.approvalHistory = new Map();
    this.escalationTimers = new Map();
    this.notificationQueue = [];
    this.auditTrail = [];

    this.workflowMetrics = {
      totalRequests: 0,
      approvedRequests: 0,
      rejectedRequests: 0,
      escalatedRequests: 0,
      averageProcessingTime: 0,
      riskDistribution: {},
      approverWorkload: {},
      complianceScore: 100,
      systemPerformance: {
        avgResponseTime: 0,
        throughput: 0,
        errorRate: 0,
        availability: 99.9,
        scalabilityMetrics: {
          concurrentRequests: 0,
          queueDepth: 0,
          resourceUtilization: 0,
          bottleneckAnalysis: [],
        },
      },
    };

    this.initializeWorkflowEngine();
  }

  /**
   * Initialize workflow engine with monitoring and cleanup processes
   */
  private initializeWorkflowEngine(): void {
    this.logAuditEvent('WORKFLOW_ENGINE_INITIALIZED', {
      timestamp: new Date(),
      configuration: this.configuration,
      systemState: 'OPERATIONAL',
    });

    // Start periodic cleanup and monitoring
    setInterval(() => this.performPeriodicMaintenance(), 60000); // Every minute
    setInterval(() => this.updateMetrics(), 30000); // Every 30 seconds
    setInterval(() => this.processNotificationQueue(), 5000); // Every 5 seconds
  }

  /**
   * Submit approval request with comprehensive risk assessment
   */
  public async submitApprovalRequest(
    operation: DatabaseOperation,
    _context: OperationContext,
    riskAssessment: RiskAssessmentResult,
    _metadata: Record<string, unknown> = {},
  ): Promise<ApprovalRequest> {
    const startTime = Date.now();

    try {
      // Generate unique request ID
      const requestId = this.generateRequestId();

      // Determine priority based on risk assessment
      const priority = this.calculatePriority(riskAssessment, context);

      // Create approval request
      const _request: ApprovalRequest = {
        id: requestId,
        requesterId: context.userId,
        timestamp: new Date(),
        operation,
        riskAssessment,
        context,
        metadata,
        priority,
        status: 'PENDING',
        approvers: [],
        escalationLevel: 0,
      };

      // Set deadline based on risk level and priority
      request.deadline = this.calculateDeadline(
        riskAssessment.riskLevel,
        priority,
      );

      // Route to appropriate approvers
      await this.routeToApprovers(request);

      // Store request
      this.pendingRequests.set(requestId, request);

      // Start escalation timer if configured
      this.scheduleEscalation(request);

      // Log audit event
      this.logAuditEvent('APPROVAL_REQUEST_SUBMITTED', {
        requestId,
        operation: operation.type,
        riskLevel: riskAssessment.riskLevel,
        priority,
        requester: context.userId,
        timestamp: new Date(),
      });

      // Update metrics
      this.workflowMetrics.totalRequests++;
      this.updateRiskDistribution(riskAssessment.riskLevel);

      // Emit event
      this.emit('requestSubmitted', request);

      const processingTime = Date.now() - startTime;
      this.logPerformanceMetric('submit_request', processingTime);

      return request;
    } catch (error) {
      this.logAuditEvent('APPROVAL_REQUEST_SUBMISSION_FAILED', {
        _error: error instanceof Error ? error.message : 'Unknown error',
        operation: operation.type,
        requester: context.userId,
        timestamp: new Date(),
      });

      throw new Error(
        `Failed to submit approval _request: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Process approval decision from approver
   */
  public async processApprovalDecision(
    requestId: string,
    approverId: string,
    decision: 'APPROVED' | 'REJECTED' | 'DELEGATED',
    reasoning: string,
    conditions: string[] = [],
    delegatedTo?: string,
    validationResults: ValidationResult[] = [],
  ): Promise<boolean> {
    const startTime = Date.now();

    try {
      const request = this.pendingRequests.get(requestId);
      if (!request) {
        throw new Error(`Approval request ${requestId} not found`);
      }

      // Validate approver authorization
      if (!this.isAuthorizedApprover(approverId, request)) {
        throw new Error(
          `Approver ${approverId} not authorized for request ${requestId}`,
        );
      }

      // Create approval record
      const approvalRecord: ApprovalRecord = {
        approverId,
        approverRole: await this.getApproverRole(approverId),
        timestamp: new Date(),
        decision,
        reasoning,
        conditions,
        delegatedTo,
        validationResults,
      };

      // Add to request
      request.approvers.push(approvalRecord);

      // Process decision
      const finalDecision = await this.evaluateApprovalDecision(request);

      if (finalDecision) {
        // Request is complete
        if (decision === 'APPROVED') {
          request.status = 'APPROVED';
          this.workflowMetrics.approvedRequests++;
        } else {
          request.status = 'REJECTED';
          this.workflowMetrics.rejectedRequests++;
        }

        // Remove from pending requests
        this.pendingRequests.delete(requestId);

        // Cancel escalation timer
        this.cancelEscalation(requestId);

        // Store in history
        this.approvalHistory.set(requestId, request.approvers);

        // Log completion
        this.logAuditEvent('APPROVAL_REQUEST_COMPLETED', {
          requestId,
          finalDecision: request.status,
          totalApprovers: request.approvers.length,
          processingTime: Date.now() - request.timestamp.getTime(),
          escalationLevel: request.escalationLevel,
        });
      } else if (decision === 'DELEGATED' && delegatedTo) {
        // Handle delegation
        await this.processDelegation(request, approverId, delegatedTo);
      }

      // Update approver workload metrics
      this.updateApproverWorkload(approverId);

      // Emit event
      this.emit('approvalDecision', {
        requestId,
        approverId,
        decision,
        finalDecision: request.status,
      });

      const processingTime = Date.now() - startTime;
      this.logPerformanceMetric('process_decision', processingTime);

      return finalDecision;
    } catch (error) {
      this.logAuditEvent('APPROVAL_DECISION_PROCESSING_FAILED', {
        requestId,
        approverId,
        _error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      });

      throw new Error(
        `Failed to process approval decision: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Route approval request to appropriate approvers
   */
  private async routeToApprovers(_request: ApprovalRequest): Promise<void> {
    const riskLevel = request.riskAssessment.riskLevel;
    const requiredApprovers = this.getRequiredApprovers(riskLevel, request);

    // Send notifications to approvers
    for (const approverId of requiredApprovers) {
      await this.sendApprovalNotification(approverId, request);
    }

    // Update request status
    request.status = 'UNDER_REVIEW';

    this.logAuditEvent('REQUEST_ROUTED_TO_APPROVERS', {
      requestId: request.id,
      approvers: requiredApprovers,
      riskLevel,
      timestamp: new Date(),
    });
  }

  /**
   * Get required approvers based on risk level and rules
   */
  private getRequiredApprovers(
    riskLevel: string,
    _request: ApprovalRequest,
  ): string[] {
    const _thresholds = this.configuration.riskThresholds;
    const approvers: string[] = [];

    switch (riskLevel) {
      case 'CRITICAL':
        approvers.push('senior-dba', 'security-lead', 'compliance-officer');
        break;
      case 'HIGH':
        approvers.push('senior-dba', 'security-lead');
        break;
      case 'MEDIUM':
        approvers.push('senior-dba');
        break;
      case 'LOW':
        approvers.push('junior-dba');
        break;
    }

    // Apply additional rules based on operation type
    if (
      request.operation.type === 'DROP' ||
      request.operation.type === 'ALTER'
    ) {
      approvers.push('senior-dba', 'data-architect');
    }

    // Remove duplicates
    return [...new Set(approvers)];
  }

  /**
   * Calculate priority based on risk assessment and context
   */
  private calculatePriority(
    riskAssessment: RiskAssessmentResult,
    _context: OperationContext,
  ): ApprovalPriority {
    const riskScore = riskAssessment.overallScore;
    const isEmergency = context.previousActions.includes('EMERGENCY_ACCESS');
    const isOutOfHours = !context.workingHours;

    if (isEmergency) return 'EMERGENCY';
    if (riskScore >= 90) return 'URGENT';
    if (riskScore >= 70) return 'HIGH';
    if (riskScore >= 40 || isOutOfHours) return 'NORMAL';
    return 'LOW';
  }

  /**
   * Calculate deadline based on risk level and priority
   */
  private calculateDeadline(
    riskLevel: string,
    priority: ApprovalPriority,
  ): Date {
    const now = new Date();
    const timeouts = this.configuration.timeoutSettings;

    let timeoutMinutes: number;

    if (priority === 'EMERGENCY') {
      timeoutMinutes = timeouts.emergencyBypassTimeout;
    } else {
      switch (riskLevel) {
        case 'LOW':
          timeoutMinutes = timeouts.lowRiskTimeout;
          break;
        case 'MEDIUM':
          timeoutMinutes = timeouts.mediumRiskTimeout;
          break;
        case 'HIGH':
          timeoutMinutes = timeouts.highRiskTimeout;
          break;
        case 'CRITICAL':
          timeoutMinutes = timeouts.criticalRiskTimeout;
          break;
        default:
          timeoutMinutes = timeouts.defaultTimeout;
      }
    }

    return new Date(now.getTime() + timeoutMinutes * 60 * 1000);
  }

  /**
   * Schedule escalation for approval request
   */
  private scheduleEscalation(_request: ApprovalRequest): void {
    if (!request.deadline) return;

    const escalationTime = request.deadline.getTime() - Date.now();

    if (escalationTime > 0) {
      const timer = setTimeout(() => {
        this.escalateRequest(request.id);
      }, escalationTime);

      this.escalationTimers.set(request.id, timer);
    }
  }

  /**
   * Escalate approval request
   */
  private async escalateRequest(requestId: string): Promise<void> {
    const request = this.pendingRequests.get(requestId);
    if (!request) return;

    request.escalationLevel++;
    request.status = 'ESCALATED';
    this.workflowMetrics.escalatedRequests++;

    // Find escalation policy
    const policy = this.configuration.escalationPolicies.find((p) =>
      this.evaluateEscalationConditions(p.triggerConditions, request),
    );

    if (policy) {
      // Route to escalation path
      for (const approverId of policy.escalationPath) {
        await this.sendUrgentNotification(approverId, request);
      }

      // Check for automatic approval
      if (policy.automaticApproval && request.escalationLevel >= 3) {
        await this.processApprovalDecision(
          requestId,
          'SYSTEM_AUTO_APPROVAL',
          'APPROVED',
          `Automatic approval due to escalation level ${request.escalationLevel}`,
          ['EMERGENCY_OVERRIDE'],
        );
      }
    }

    this.logAuditEvent('REQUEST_ESCALATED', {
      requestId,
      escalationLevel: request.escalationLevel,
      policy: policy?.id,
      timestamp: new Date(),
    });

    this.emit('requestEscalated', request);
  }

  /**
   * Evaluate whether approval request is complete
   */
  private async evaluateApprovalDecision(
    _request: ApprovalRequest,
  ): Promise<boolean> {
    const requiredApprovals = this.getRequiredApprovals(request);
    const receivedApprovals = request.approvers.filter(
      (a) => a.decision === 'APPROVED',
    ).length;
    const receivedRejections = request.approvers.filter(
      (a) => a.decision === 'REJECTED',
    ).length;

    // Check for rejections (any rejection fails the request)
    if (receivedRejections > 0) {
      return true; // Complete with rejection
    }

    // Check for sufficient approvals
    if (receivedApprovals >= requiredApprovals) {
      return true; // Complete with approval
    }

    return false; // Still pending
  }

  /**
   * Get required number of approvals based on risk level
   */
  private getRequiredApprovals(_request: ApprovalRequest): number {
    const riskLevel = request.riskAssessment.riskLevel;
    const thresholds = this.configuration.riskThresholds;

    switch (riskLevel) {
      case 'CRITICAL':
        return thresholds.criticalRisk.approvers;
      case 'HIGH':
        return thresholds.highRisk.approvers;
      case 'MEDIUM':
        return thresholds.mediumRisk.approvers;
      case 'LOW':
        return thresholds.lowRisk.approvers;
      default:
        return 1;
    }
  }

  /**
   * Check if user is authorized approver
   */
  private isAuthorizedApprover(
    approverId: string,
    _request: ApprovalRequest,
  ): boolean {
    const requiredApprovers = this.getRequiredApprovers(
      request.riskAssessment.riskLevel,
      request,
    );
    return (
      requiredApprovers.includes(approverId) ||
      approverId === 'SYSTEM_AUTO_APPROVAL'
    );
  }

  /**
   * Get approver role
   */
  private async getApproverRole(approverId: string): Promise<string> {
    // This would typically query a user management system
    const roleMap: Record<string, string> = {
      'senior-dba': 'Senior Database Administrator',
      'junior-dba': 'Database Administrator',
      'security-lead': 'Security Lead',
      'compliance-officer': 'Compliance Officer',
      'data-architect': 'Data Architect',
      SYSTEM_AUTO_APPROVAL: 'System Automatic Approval',
    };

    return roleMap[approverId] || 'Unknown Role';
  }

  /**
   * Process delegation of approval
   */
  private async processDelegation(
    _request: ApprovalRequest,
    fromApproverId: string,
    toApproverId: string,
  ): Promise<void> {
    // Send notification to delegated approver
    await this.sendApprovalNotification(toApproverId, request);

    this.logAuditEvent('APPROVAL_DELEGATED', {
      requestId: request.id,
      fromApprover: fromApproverId,
      toApprover: toApproverId,
      timestamp: new Date(),
    });
  }

  /**
   * Send approval notification
   */
  private async sendApprovalNotification(
    approverId: string,
    _request: ApprovalRequest,
  ): Promise<void> {
    const notification = {
      type: 'APPROVAL_REQUEST',
      approverId,
      requestId: request.id,
      priority: request.priority,
      deadline: request.deadline,
      summary: `${request.operation.type} operation requires approval`,
      details: request,
      timestamp: new Date(),
    };

    this.notificationQueue.push(notification);
  }

  /**
   * Send urgent notification for escalated requests
   */
  private async sendUrgentNotification(
    approverId: string,
    _request: ApprovalRequest,
  ): Promise<void> {
    const notification = {
      type: 'URGENT_APPROVAL_REQUEST',
      approverId,
      requestId: request.id,
      priority: 'URGENT',
      escalationLevel: request.escalationLevel,
      deadline: request.deadline,
      summary: `ESCALATED: ${request.operation.type} operation requires immediate approval`,
      details: request,
      timestamp: new Date(),
    };

    this.notificationQueue.push(notification);
  }

  /**
   * Evaluate escalation conditions
   */
  private evaluateEscalationConditions(
    conditions: string[],
    _request: ApprovalRequest,
  ): boolean {
    // This would implement condition evaluation logic
    return conditions.length > 0; // Simplified implementation
  }

  /**
   * Cancel escalation timer
   */
  private cancelEscalation(requestId: string): void {
    const timer = this.escalationTimers.get(requestId);
    if (timer) {
      clearTimeout(timer);
      this.escalationTimers.delete(requestId);
    }
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `REQ_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Update risk distribution metrics
   */
  private updateRiskDistribution(riskLevel: string): void {
    this.workflowMetrics.riskDistribution[riskLevel] =
      (this.workflowMetrics.riskDistribution[riskLevel] || 0) + 1;
  }

  /**
   * Update approver workload metrics
   */
  private updateApproverWorkload(approverId: string): void {
    this.workflowMetrics.approverWorkload[approverId] =
      (this.workflowMetrics.approverWorkload[approverId] || 0) + 1;
  }

  /**
   * Log performance metric
   */
  private logPerformanceMetric(operation: string, duration: number): void {
    const metrics = this.workflowMetrics.systemPerformance;

    // Update average response time
    const totalOps = this.workflowMetrics.totalRequests;
    metrics.avgResponseTime =
      (metrics.avgResponseTime * (totalOps - 1) + duration) / totalOps;

    // Calculate throughput (operations per second)
    metrics.throughput = totalOps / (Date.now() / 1000);

    // Update scalability metrics
    metrics.scalabilityMetrics.concurrentRequests = this.pendingRequests.size;
    metrics.scalabilityMetrics.queueDepth = this.notificationQueue.length;
  }

  /**
   * Log audit event
   */
  private logAuditEvent(eventType: string, details: unknown): void {
    const auditEvent = {
      timestamp: new Date(),
      eventType,
      details,
      service: 'RiskBasedApprovalWorkflowService',
      severity: this.getEventSeverity(eventType),
    };

    this.auditTrail.push(auditEvent);

    // Emit for external audit systems
    this.emit('auditEvent', auditEvent);
  }

  /**
   * Get event severity for audit logging
   */
  private getEventSeverity(
    eventType: string,
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const criticalEvents = [
      'APPROVAL_REQUEST_SUBMISSION_FAILED',
      'APPROVAL_DECISION_PROCESSING_FAILED',
    ];
    const highEvents = ['REQUEST_ESCALATED', 'EMERGENCY_APPROVAL'];
    const mediumEvents = ['APPROVAL_REQUEST_COMPLETED', 'APPROVAL_DELEGATED'];

    if (criticalEvents.includes(eventType)) return 'CRITICAL';
    if (highEvents.includes(eventType)) return 'HIGH';
    if (mediumEvents.includes(eventType)) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Perform periodic maintenance tasks
   */
  private performPeriodicMaintenance(): void {
    // Clean up expired requests
    const now = Date.now();
    for (const [requestId, request] of this.pendingRequests.entries()) {
      if (request.deadline && request.deadline.getTime() < now) {
        request.status = 'EXPIRED';
        this.pendingRequests.delete(requestId);
        this.cancelEscalation(requestId);

        this.logAuditEvent('REQUEST_EXPIRED', {
          requestId,
          expiredAt: new Date(),
          escalationLevel: request.escalationLevel,
        });
      }
    }

    // Clean up old audit trail entries
    const retentionPeriod = this.configuration.auditSettings.retentionPeriod;
    const cutoffTime = now - retentionPeriod * 24 * 60 * 60 * 1000;

    while (this.auditTrail.length > 0) {
      const oldestEvent = this.auditTrail[0] as { timestamp: Date };
      if (oldestEvent.timestamp.getTime() < cutoffTime) {
        this.auditTrail.shift();
      } else {
        break;
      }
    }
  }

  /**
   * Update metrics
   */
  private updateMetrics(): void {
    // Update system performance metrics
    const performance = this.workflowMetrics.systemPerformance;

    // Calculate availability
    const totalTime = Date.now();
    const downtime = 0; // Would track actual downtime
    performance.availability = ((totalTime - downtime) / totalTime) * 100;

    // Update compliance score based on adherence to policies
    this.workflowMetrics.complianceScore = this.calculateComplianceScore();

    // Emit metrics update
    this.emit('metricsUpdated', this.workflowMetrics);
  }

  /**
   * Calculate compliance score
   */
  private calculateComplianceScore(): number {
    const totalRequests = this.workflowMetrics.totalRequests;
    if (totalRequests === 0) return 100;

    const escalatedRequests = this.workflowMetrics.escalatedRequests;
    const escalationRate = escalatedRequests / totalRequests;

    // Score based on escalation rate (lower is better)
    let score = 100 - escalationRate * 50;

    // Factor in approval time compliance
    const avgProcessingTime = this.workflowMetrics.averageProcessingTime;
    const targetTime = 30 * 60 * 1000; // 30 minutes

    if (avgProcessingTime > targetTime) {
      score -= ((avgProcessingTime - targetTime) / targetTime) * 20;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Process notification queue
   */
  private processNotificationQueue(): void {
    while (this.notificationQueue.length > 0) {
      const notification = this.notificationQueue.shift();
      // In a real implementation, this would send the notification
      // via email, SMS, Slack, etc.
      this.emit('notificationSent', notification);
    }
  }

  /**
   * Get current workflow metrics
   */
  public getWorkflowMetrics(): WorkflowMetrics {
    return { ...this.workflowMetrics };
  }

  /**
   * Get pending requests count
   */
  public getPendingRequestsCount(): number {
    return this.pendingRequests.size;
  }

  /**
   * Get request by ID
   */
  public getRequest(requestId: string): ApprovalRequest | undefined {
    return this.pendingRequests.get(requestId);
  }

  /**
   * Get approval history for request
   */
  public getApprovalHistory(requestId: string): ApprovalRecord[] | undefined {
    return this.approvalHistory.get(requestId);
  }

  /**
   * Get audit trail
   */
  public getAuditTrail(limit: number = 100): unknown[] {
    return this.auditTrail.slice(-limit);
  }

  /**
   * Shutdown workflow engine
   */
  public shutdown(): void {
    // Cancel all escalation timers
    for (const timer of this.escalationTimers.values()) {
      clearTimeout(timer);
    }
    this.escalationTimers.clear();

    // Clear all intervals
    clearInterval();

    this.logAuditEvent('WORKFLOW_ENGINE_SHUTDOWN', {
      timestamp: new Date(),
      pendingRequests: this.pendingRequests.size,
      totalRequests: this.workflowMetrics.totalRequests,
    });

    this.emit('shutdown');
  }
}

/**
 * Default workflow configuration for enterprise environments
 */
export const defaultWorkflowConfiguration: WorkflowConfiguration = {
  riskThresholds: {
    lowRisk: { max: 30, approvers: 1, timeLimit: 60 },
    mediumRisk: { max: 60, approvers: 1, timeLimit: 30 },
    highRisk: { max: 85, approvers: 2, timeLimit: 15 },
    criticalRisk: { max: 100, approvers: 3, timeLimit: 5 },
  },
  approvalRules: [
    {
      id: 'high-risk-dual-approval',
      condition: 'riskScore >= 70',
      requiredApprovers: ['senior-dba', 'security-lead'],
      minimumApprovals: 2,
      maximumTime: 15,
      allowDelegation: true,
      requireConsensus: true,
      skipOnLowRisk: false,
    },
  ],
  escalationPolicies: [
    {
      id: 'timeout-escalation',
      triggerConditions: ['TIMEOUT'],
      escalationPath: ['senior-dba', 'security-lead', 'compliance-officer'],
      timeoutMinutes: 30,
      notificationChannels: ['email', 'sms'],
      automaticApproval: false,
      emergencyBypass: true,
    },
  ],
  timeoutSettings: {
    defaultTimeout: 30,
    lowRiskTimeout: 60,
    mediumRiskTimeout: 30,
    highRiskTimeout: 15,
    criticalRiskTimeout: 5,
    escalationInterval: 15,
    emergencyBypassTimeout: 2,
  },
  notificationSettings: {
    channels: ['email', 'sms', 'slack'],
    templates: {
      approval_request: 'Database operation requires your approval',
      urgent_request: 'URGENT: Database operation requires immediate approval',
      escalation: 'Request escalated to your attention',
    },
    urgencyLevels: {
      LOW: ['email'],
      NORMAL: ['email', 'slack'],
      HIGH: ['email', 'slack', 'sms'],
      URGENT: ['email', 'slack', 'sms'],
      EMERGENCY: ['sms', 'phone'],
    },
    deliveryMethods: ['push', 'email', 'sms'],
    retryPolicy: {
      maxRetries: 3,
      retryInterval: 5,
      backoffMultiplier: 2,
      maxInterval: 30,
    },
  },
  auditSettings: {
    logLevel: 'COMPREHENSIVE',
    retentionPeriod: 90,
    encryptionRequired: true,
    complianceReporting: true,
    realTimeMonitoring: true,
  },
};
