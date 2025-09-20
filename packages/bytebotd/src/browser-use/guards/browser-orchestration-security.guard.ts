/**
 * Browser Orchestration Security Guard
 *
 * Comprehensive security implementation for distributed browser orchestration operations
 * providing advanced security controls, validation, and monitoring for multi-agent
 * browser automation workflows.
 *
 * Security Features:
 * - Multi-agent operation authorization and coordination
 * - Resource allocation and usage monitoring
 * - Advanced orchestration strategy validation
 * - Distributed security policy enforcement
 * - Cross-agent communication security
 * - Orchestration-specific rate limiting
 * - Resource consumption monitoring and limits
 * - Advanced audit logging for distributed operations
 *
 * Architecture:
 * - Extends existing BrowserSecurityGuard patterns
 * - Integrates with browser-use RBAC for permission control
 * - Implements orchestration-specific security constraints
 * - Provides distributed operation risk assessment
 * - Supports emergency orchestration controls
 *
 * @module BrowserOrchestrationSecurityGuard
 * @version 1.0.0
 * @author Specialized API Security & Validation Agent
 * @since Browser Orchestration Security Implementation
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  TooManyRequestsException,
  BadRequestException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';import { Reflector } from '@nestjs/core';import { ConfigService } from '@nestjs/config';import { Request, Response } from 'express';import { performance } from 'perf_hooks';import * as crypto from 'crypto';// Import base security componentsimport { BrowserSecurityGuard } from '../../browser/guards/browser-security.guard';import { BrowserUseRbacGuard } from './browser-use-rbac.guard';import { BrowserValidationService } from '../../browser/validation.service';// Import orchestration types and servicesimport {
  OrchestrationStrategy,
  TaskPriority,
  ResourceLimits,
  OrchestrationConfig,
  MultiAgentSession,
  OrchestrationMetrics,
  DistributedTask,
} from '../types/orchestration.types';

// Import security types
import {
  AuthenticatedRequest,
  BrowserUseUserContext,
  BrowserUseSessionContext,
  BrowserUseSecurityContext,
  BrowserPermission,
} from '../middleware/browser-use-auth.middleware';

// Import Parlant integration
import {
  ParlantIntegrationService,
  ParlantValidationRequest,
  ConversationalValidationError,
  RiskLevel,
} from '../parlant/parlant-integration.service';/*** Orchestration security levels
 */
export enum OrchestrationSecurityLevel {
  BASIC = 'basic',                    // Single-agent operationsCOORDINATED = 'coordinated',        // Multi-agent coordinationDISTRIBUTED = 'distributed',       // Complex distributed operationsENTERPRISE = 'enterprise',         // Enterprise-grade orchestrationCRITICAL = 'critical',             // Mission-critical orchestration}/**
 * Orchestration risk assessment levels
 */
export enum OrchestrationRiskLevel {
  MINIMAL = 'minimal',               // Low-risk single operationsMODERATE = 'moderate',             // Standard multi-agent operationsELEVATED = 'elevated',             // Complex orchestration patternsHIGH = 'high',                     // High-impact distributed operationsCRITICAL = 'critical',             // Critical infrastructure operations}/**
 * Resource allocation security context
 */
export interface ResourceSecurityContext {
  maxConcurrentAgents: number;
  maxMemoryUsageGB: number;
  maxCpuUsagePercent: number;
  maxNetworkBandwidthMBps: number;
  maxStorageUsageGB: number;
  maxExecutionTimeMs: number;
  allowedResourceTypes: string[];
  resourceQuotaEnforcement: boolean;
}

/**
 * Orchestration operation context
 */
export interface OrchestrationOperationContext {
  operationId: string;
  operationType: 'CREATE' | 'COORDINATE' | 'MONITOR' | 'TERMINATE' | 'SCALE';strategy: OrchestrationStrategy;agentCount: number;
  sessionCount: number;
  taskComplexity: 'SIMPLE' | 'MODERATE' | 'COMPLEX' | 'CRITICAL';estimatedDuration: number;resourceRequirements: ResourceLimits;
  securityLevel: OrchestrationSecurityLevel;
  riskLevel: OrchestrationRiskLevel;
  businessImpact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';complianceRequirements: string[];}

/**
 * Orchestration security validation result
 */
export interface OrchestrationSecurityResult {
  allowed: boolean;
  reason?: string;
  riskScore: number;
  violations: OrchestrationViolation[];
  resourceConstraints: ResourceConstraint[];
  recommendedAction: 'ALLOW' | 'BLOCK' | 'MONITOR' | 'RESTRICT' | 'ESCALATE';requiredApprovals: string[];conditions: OrchestrationCondition[];
  auditTrail: OrchestrationAuditEntry;
}

/**
 * Orchestration security violation
 */
export interface OrchestrationViolation {
  type: 'RESOURCE' | 'PERMISSION' | 'RATE_LIMIT' | 'SECURITY' | 'COMPLIANCE';severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';description: string;field?: string;
  value?: unknown;
  constraint?: string;
  recommendation?: string;
}

/**
 * Resource constraint enforcement
 */
export interface ResourceConstraint {
  type: 'CPU' | 'MEMORY' | 'NETWORK' | 'STORAGE' | 'TIME' | 'AGENTS';limit: number;current: number;
  enforcement: 'SOFT' | 'HARD' | 'ADAPTIVE';escalationThreshold: number;}

/**
 * Orchestration security condition
 */
export interface OrchestrationCondition {
  type: 'MONITORING' | 'APPROVAL' | 'RESOURCE_LIMIT' | 'TIME_LIMIT' | 'COMPLIANCE';description: string;parameters: Record<string, unknown>;
  mandatory: boolean;
  validUntil?: Date;
}

/**
 * Orchestration audit trail entry
 */
export interface OrchestrationAuditEntry {
  entryId: string;
  timestamp: Date;
  userId: string;
  sessionId: string;
  operationId: string;
  operationType: string;
  decision: 'GRANTED' | 'DENIED' | 'RESTRICTED' | 'ESCALATED';securityLevel: OrchestrationSecurityLevel;riskLevel: OrchestrationRiskLevel;
  riskScore: number;
  resourceUsage: Record<string, number>;
  agentCoordination: AgentCoordinationInfo[];
  processingTime: number;
  metadata: Record<string, unknown>;
}

/**
 * Agent coordination information
 */
export interface AgentCoordinationInfo {
  agentId: string;
  role: string;
  capabilities: string[];
  resourceAllocation: Record<string, number>;
  securityClearance: string;
  coordinationProtocol: string;
}

/**
 * Rate limiting configuration for orchestration
 */
export interface OrchestrationRateLimit {
  operationsPerMinute: number;
  agentsPerHour: number;
  resourcesPerDay: number;
  concurrentOperations: number;
  burstAllowance: number;
  cooldownPeriodMs: number;
}

/**
 * Orchestration security metrics
 */
export interface OrchestrationSecurityMetrics {
  totalOperations: number;
  allowedOperations: number;
  blockedOperations: number;
  escalatedOperations: number;
  averageRiskScore: number;
  resourceUtilization: Record<string, number>;
  securityViolations: Record<string, number>;
  averageProcessingTime: number;
  agentCoordinationSuccess: number;
}

/**
 * Browser Orchestration Security Guard
 *
 * Provides comprehensive security controls for distributed browser orchestration
 * operations, ensuring safe and controlled multi-agent automation workflows.
 */
@Injectable()
export class BrowserOrchestrationSecurityGuard implements CanActivate {
  private readonly logger = new Logger(BrowserOrchestrationSecurityGuard.name);

  // Security metrics tracking
  private readonly securityMetrics: OrchestrationSecurityMetrics = {
    totalOperations: 0,
    allowedOperations: 0,
    blockedOperations: 0,
    escalatedOperations: 0,
    averageRiskScore: 0,
    resourceUtilization: {},
    securityViolations: {},
    averageProcessingTime: 0,
    agentCoordinationSuccess: 0,
  };

  // Rate limiting trackers for orchestration operations
  private readonly orchestrationRateLimiters = new Map<string, {
    operations: number;
    agents: number;
    resources: number;
    windowStart: number;
    lastOperation: Date;
    violations: number;
  }>();

  // Resource allocation tracking
  private readonly resourceAllocations = new Map<string, {
    userId: string;
    allocatedResources: ResourceLimits;
    currentUsage: Record<string, number>;
    allocationTime: Date;
    expiresAt: Date;
  }>();

  // Active orchestration operations
  private readonly activeOrchestrations = new Map<string, OrchestrationOperationContext>();

  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
    private readonly baseSecurityGuard: BrowserSecurityGuard,
    private readonly rbacGuard: BrowserUseRbacGuard,
    private readonly validationService: BrowserValidationService,
    private readonly parlantService: ParlantIntegrationService,
  ) {
    this.logger.log('🛡️ Browser Orchestration Security Guard initialized');
    this.logSecurityConfiguration();

    // Start background monitoring and cleanup
    setInterval(() => this.performSecurityMaintenance(), 300000); // Every 5 minutes
    setInterval(() => this.logSecurityMetrics(), 600000); // Every 10 minutes
    setInterval(() => this.performResourceCleanup(), 180000); // Every 3 minutes
  }

  /**
   * Main guard method - validates orchestration security
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const startTime = performance.now();
    const operationId = this.generateOperationId();

    this.securityMetrics.totalOperations++;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const response = context.switchToHttp().getResponse<Response>();

    this.logger.debug(`[${operationId}] Orchestration security validation started`, {operationId,endpoint: `${request.method} ${request.url}`,
      userId: request.user?.userId,
      userAgent: request.headers['user-agent']?.substring(0, 100),
    });

    try {
      // Step 1: Apply base browser security validation
      const baseSecurityResult = await this.baseSecurityGuard.canActivate(context);
      if (!baseSecurityResult) {
        this.logger.warn(`[${operationId}] Base security validation failed`);this.securityMetrics.blockedOperations++;return false;
      }

      // Step 2: Apply RBAC validation
      const rbacResult = await this.rbacGuard.canActivate(context);
      if (!rbacResult) {
        this.logger.warn(`[${operationId}] RBAC validation failed`);this.securityMetrics.blockedOperations++;return false;
      }

      // Step 3: Build orchestration operation context
      const operationContext = await this.buildOrchestrationContext(request, operationId);

      // Step 4: Validate orchestration security requirements
      const securityResult = await this.validateOrchestrationSecurity(
        operationContext,
        request,
        context,
      );

      // Step 5: Apply security response
      await this.applyOrchestrationSecurityResponse(
        securityResult,
        operationContext,
        response,
      );

      // Step 6: Track operation and update metrics
      this.trackOrchestrationOperation(operationContext, securityResult, startTime);

      // Step 7: Store audit trail
      await this.storeSecurityAuditTrail(securityResult.auditTrail);

      const processingTime = performance.now() - startTime;
      this.updateSecurityMetrics(securityResult, processingTime);

      this.logger.log(`[${operationId}] Orchestration security validation completed`, {operationId,allowed: securityResult.allowed,
        riskScore: securityResult.riskScore,
        processingTime: `${processingTime.toFixed(2)}ms`,recommendedAction: securityResult.recommendedAction,});

      if (securityResult.allowed) {
        this.securityMetrics.allowedOperations++;
      } else {
        this.securityMetrics.blockedOperations++;
      }

      return securityResult.allowed;

    } catch (error) {
      const processingTime = performance.now() - startTime;

      this.logger.error(`[${operationId}] Orchestration security validation failed`, {operationId,error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        processingTime: `${processingTime.toFixed(2)}ms`,endpoint: `${request.method} ${request.url}`,
        userId: request.user?.userId,
      });

      this.securityMetrics.blockedOperations++;

      // Handle specific orchestration security errors
      if (error instanceof UnauthorizedException ||
          error instanceof ForbiddenException ||
          error instanceof TooManyRequestsException ||
          error instanceof BadRequestException ||
          error instanceof ServiceUnavailableException) {
        throw error;
      }

      // Generic orchestration security failure
      throw new ForbiddenException({
        message: 'Orchestration security validation failed',type: 'orchestration_security_failure',operationId,});
    }
  }

  /**
   * Build comprehensive orchestration operation context
   */
  private async buildOrchestrationContext(
    request: AuthenticatedRequest,
    operationId: string,
  ): Promise<OrchestrationOperationContext> {
    const body = request.body || {};
    const query = request.query || {};

    // Determine operation type from endpoint
    const operationType = this.determineOperationType(request.method, request.url);

    // Extract orchestration strategy
    const strategy = this.extractOrchestrationStrategy(body, query);

    // Assess task complexity
    const taskComplexity = this.assessTaskComplexity(body, strategy);

    // Determine security and risk levels
    const securityLevel = this.determineSecurityLevel(strategy, taskComplexity);
    const riskLevel = this.determineRiskLevel(strategy, taskComplexity, body);

    // Extract resource requirements
    const resourceRequirements = this.extractResourceRequirements(body);

    // Assess business impact
    const businessImpact = this.assessBusinessImpact(strategy, resourceRequirements);

    return {
      operationId,
      operationType,
      strategy,
      agentCount: strategy.maxAgents || 1,
      sessionCount: strategy.maxSessions || 1,
      taskComplexity,
      estimatedDuration: this.estimateOperationDuration(strategy, taskComplexity),
      resourceRequirements,
      securityLevel,
      riskLevel,
      businessImpact,
      complianceRequirements: this.determineComplianceRequirements(strategy, businessImpact),
    };
  }

  /**
   * Validate orchestration security requirements
   */
  private async validateOrchestrationSecurity(
    context: OrchestrationOperationContext,
    request: AuthenticatedRequest,
    executionContext: ExecutionContext,
  ): Promise<OrchestrationSecurityResult> {
    const violations: OrchestrationViolation[] = [];
    const resourceConstraints: ResourceConstraint[] = [];
    const conditions: OrchestrationCondition[] = [];
    const requiredApprovals: string[] = [];

    let riskScore = 0;

    // 1. Validate orchestration strategy security
    const strategyValidation = await this.validateOrchestrationStrategy(context, request);
    riskScore += strategyValidation.riskScore;
    violations.push(...strategyValidation.violations);

    // 2. Validate resource allocation and limits
    const resourceValidation = await this.validateResourceAllocation(context, request);
    riskScore += resourceValidation.riskScore;
    violations.push(...resourceValidation.violations);
    resourceConstraints.push(...resourceValidation.constraints);

    // 3. Validate rate limiting for orchestration operations
    const rateLimitValidation = await this.validateOrchestrationRateLimit(context, request);
    riskScore += rateLimitValidation.riskScore;
    violations.push(...rateLimitValidation.violations);

    // 4. Validate agent coordination security
    const coordinationValidation = await this.validateAgentCoordination(context, request);
    riskScore += coordinationValidation.riskScore;
    violations.push(...coordinationValidation.violations);

    // 5. Validate compliance requirements
    const complianceValidation = await this.validateComplianceRequirements(context, request);
    riskScore += complianceValidation.riskScore;
    violations.push(...complianceValidation.violations);
    conditions.push(...complianceValidation.conditions);

    // 6. Assess conversational validation requirement
    const conversationalValidation = await this.assessConversationalValidation(context, executionContext);
    if (conversationalValidation.required && !conversationalValidation.approved) {
      riskScore += 25;
      requiredApprovals.push('conversational_approval');}// 7. Determine final security decision
    const recommendedAction = this.determineSecurityAction(riskScore, violations, context);
    const allowed = this.determineAllowedStatus(recommendedAction, violations);

    // 8. Generate security conditions
    const securityConditions = this.generateSecurityConditions(context, riskScore, violations);
    conditions.push(...securityConditions);

    // 9. Create audit trail
    const auditTrail = this.createOrchestrationAuditEntry(
      context,
      request,
      riskScore,
      recommendedAction,
      violations,
    );

    return {
      allowed,
      reason: allowed ? undefined : this.generateDenialReason(violations, recommendedAction),
      riskScore,
      violations,
      resourceConstraints,
      recommendedAction,
      requiredApprovals,
      conditions,
      auditTrail,
    };
  }

  /**
   * Validate orchestration strategy security
   */
  private async validateOrchestrationStrategy(
    context: OrchestrationOperationContext,
    request: AuthenticatedRequest,
  ): Promise<{
    riskScore: number;
    violations: OrchestrationViolation[];
  }> {
    const violations: OrchestrationViolation[] = [];
    let riskScore = 0;

    const { strategy } = context;

    // Validate agent count limits
    if (strategy.maxAgents > 50) {
      violations.push({
        type: 'RESOURCE',severity: 'HIGH',description: 'Excessive agent count requested',field: 'maxAgents',value: strategy.maxAgents,constraint: 'maxAgents <= 50',recommendation: 'Reduce agent count or request special approval',});riskScore += 20;
    }

    // Validate session count limits
    if (strategy.maxSessions > 100) {
      violations.push({
        type: 'RESOURCE',severity: 'HIGH',description: 'Excessive session count requested',field: 'maxSessions',value: strategy.maxSessions,constraint: 'maxSessions <= 100',recommendation: 'Reduce session count or use distributed allocation',});riskScore += 15;
    }

    // Validate coordination complexity
    if (strategy.coordinationMode === 'HIERARCHICAL' && strategy.maxAgents > 20) {violations.push({type: 'SECURITY',severity: 'MEDIUM',description: 'Complex hierarchical coordination may pose coordination risks',field: 'coordinationMode',value: strategy.coordinationMode,recommendation: 'Consider peer-to-peer coordination for large agent counts',});riskScore += 10;
    }

    // Validate task distribution strategy
    if (strategy.taskDistribution === 'CUSTOM' && !strategy.customDistributionLogic) {violations.push({type: 'SECURITY',severity: 'MEDIUM',description: 'Custom task distribution without defined logic',field: 'taskDistribution',value: strategy.taskDistribution,recommendation: 'Provide custom distribution logic or use standard strategies',});riskScore += 8;
    }

    // Validate failover configuration
    if (!strategy.failoverConfig && strategy.maxAgents > 10) {
      violations.push({
        type: 'RESOURCE',severity: 'MEDIUM',description: 'No failover configuration for multi-agent operation',field: 'failoverConfig',recommendation: 'Configure failover handling for robust orchestration',});riskScore += 5;
    }

    return { riskScore, violations };
  }

  /**
   * Validate resource allocation and constraints
   */
  private async validateResourceAllocation(
    context: OrchestrationOperationContext,
    request: AuthenticatedRequest,
  ): Promise<{
    riskScore: number;
    violations: OrchestrationViolation[];
    constraints: ResourceConstraint[];
  }> {
    const violations: OrchestrationViolation[] = [];
    const constraints: ResourceConstraint[] = [];
    let riskScore = 0;

    const { resourceRequirements } = context;
    const userId = request.user.userId;

    // Get current resource allocation for user
    const currentAllocation = this.resourceAllocations.get(userId);
    const globalResourceUsage = this.calculateGlobalResourceUsage();

    // Validate memory requirements
    if (resourceRequirements.maxMemoryGB > 32) {
      violations.push({
        type: 'RESOURCE',severity: 'HIGH',description: 'Excessive memory allocation requested',field: 'maxMemoryGB',value: resourceRequirements.maxMemoryGB,constraint: 'maxMemoryGB <= 32',recommendation: 'Optimize memory usage or request enterprise allocation',});riskScore += 15;
    }

    constraints.push({
      type: 'MEMORY',limit: Math.min(resourceRequirements.maxMemoryGB, 32),current: currentAllocation?.currentUsage.memory || 0,
      enforcement: 'HARD',escalationThreshold: 0.8,});

    // Validate CPU requirements
    if (resourceRequirements.maxCpuCores > 16) {
      violations.push({
        type: 'RESOURCE',severity: 'HIGH',description: 'Excessive CPU allocation requested',field: 'maxCpuCores',value: resourceRequirements.maxCpuCores,constraint: 'maxCpuCores <= 16',recommendation: 'Distribute workload across multiple operations',});riskScore += 12;
    }

    constraints.push({
      type: 'CPU',limit: Math.min(resourceRequirements.maxCpuCores, 16),current: currentAllocation?.currentUsage.cpu || 0,
      enforcement: 'HARD',escalationThreshold: 0.9,});

    // Validate network bandwidth
    if (resourceRequirements.maxNetworkMBps > 1000) {
      violations.push({
        type: 'RESOURCE',severity: 'MEDIUM',description: 'High network bandwidth requested',field: 'maxNetworkMBps',value: resourceRequirements.maxNetworkMBps,recommendation: 'Consider network optimization or staged operations',});riskScore += 8;
    }

    constraints.push({
      type: 'NETWORK',limit: Math.min(resourceRequirements.maxNetworkMBps, 1000),current: currentAllocation?.currentUsage.network || 0,
      enforcement: 'SOFT',escalationThreshold: 0.8,});

    // Validate execution time
    if (resourceRequirements.maxExecutionTimeMs > 7200000) { // 2 hours
      violations.push({
        type: 'RESOURCE',severity: 'MEDIUM',description: 'Extended execution time requested',field: 'maxExecutionTimeMs',value: resourceRequirements.maxExecutionTimeMs,constraint: 'maxExecutionTimeMs <= 7200000',recommendation: 'Break into smaller operations or request extended approval',});riskScore += 10;
    }

    constraints.push({
      type: 'TIME',limit: Math.min(resourceRequirements.maxExecutionTimeMs, 7200000),current: 0,
      enforcement: 'HARD',escalationThreshold: 0.9,});

    // Check global resource limits
    if (globalResourceUsage.totalMemoryGB > 100) {
      violations.push({
        type: 'RESOURCE',severity: 'HIGH',description: 'Global memory usage limit approaching',recommendation: 'Wait for resource availability or request priority allocation',
      });
      riskScore += 20;
    }

    return { riskScore, violations, constraints };
  }

  /**
   * Validate orchestration rate limits
   */
  private async validateOrchestrationRateLimit(
    context: OrchestrationOperationContext,
    request: AuthenticatedRequest,
  ): Promise<{
    riskScore: number;
    violations: OrchestrationViolation[];
  }> {
    const violations: OrchestrationViolation[] = [];
    let riskScore = 0;

    const userId = request.user.userId;
    const now = Date.now();
    const rateLimitKey = `${userId}:orchestration`;

    // Get or create rate limit tracker
    let tracker = this.orchestrationRateLimiters.get(rateLimitKey);
    if (!tracker || now - tracker.windowStart > 3600000) { // 1 hour window
      tracker = {
        operations: 0,
        agents: 0,
        resources: 0,
        windowStart: now,
        lastOperation: new Date(),
        violations: 0,
      };
      this.orchestrationRateLimiters.set(rateLimitKey, tracker);
    }

    // Update tracker
    tracker.operations++;
    tracker.agents += context.agentCount;
    tracker.resources += this.calculateResourceScore(context.resourceRequirements);
    tracker.lastOperation = new Date();

    // Check rate limits based on operation type and security level
    const limits = this.getOrchestrationRateLimits(context.securityLevel, request.user);

    // Check operations per hour
    if (tracker.operations > limits.operationsPerMinute * 60) {
      violations.push({
        type: 'RATE_LIMIT',severity: 'HIGH',description: 'Orchestration operations rate limit exceeded',field: 'operationsPerHour',
        value: tracker.operations,
        constraint: `operationsPerHour <= ${limits.operationsPerMinute * 60}`,
        recommendation: 'Reduce operation frequency or request rate limit increase',});riskScore += 25;
      tracker.violations++;
    }

    // Check agents per hour
    if (tracker.agents > limits.agentsPerHour) {
      violations.push({
        type: 'RATE_LIMIT',severity: 'HIGH',description: 'Agent allocation rate limit exceeded',field: 'agentsPerHour',
        value: tracker.agents,
        constraint: `agentsPerHour <= ${limits.agentsPerHour}`,
        recommendation: 'Reduce agent count or distribute across time',});riskScore += 20;
      tracker.violations++;
    }

    // Check resource allocation rate
    if (tracker.resources > limits.resourcesPerDay) {
      violations.push({
        type: 'RATE_LIMIT',severity: 'HIGH',description: 'Resource allocation rate limit exceeded',field: 'resourcesPerDay',
        value: tracker.resources,
        constraint: `resourcesPerDay <= ${limits.resourcesPerDay}`,
        recommendation: 'Optimize resource usage or request quota increase',});riskScore += 15;
      tracker.violations++;
    }

    // Check concurrent operations
    const concurrentOps = this.countConcurrentOperations(userId);
    if (concurrentOps > limits.concurrentOperations) {
      violations.push({
        type: 'RATE_LIMIT',severity: 'CRITICAL',description: 'Concurrent orchestration operations limit exceeded',field: 'concurrentOperations',
        value: concurrentOps,
        constraint: `concurrentOperations <= ${limits.concurrentOperations}`,
        recommendation: 'Wait for operations to complete or terminate non-essential operations',});riskScore += 30;
      tracker.violations++;
    }

    // Apply penalties for repeated violations
    if (tracker.violations > 3) {
      riskScore += tracker.violations * 5;
    }

    return { riskScore, violations };
  }

  /**
   * Validate agent coordination security
   */
  private async validateAgentCoordination(
    context: OrchestrationOperationContext,
    request: AuthenticatedRequest,
  ): Promise<{
    riskScore: number;
    violations: OrchestrationViolation[];
  }> {
    const violations: OrchestrationViolation[] = [];
    let riskScore = 0;

    const { strategy, agentCount } = context;

    // Validate coordination protocol security
    if (strategy.coordinationProtocol === 'PEER_TO_PEER' && agentCount > 20) {violations.push({type: 'SECURITY',severity: 'MEDIUM',description: 'Peer-to-peer coordination may have security risks at scale',field: 'coordinationProtocol',value: strategy.coordinationProtocol,recommendation: 'Consider hierarchical coordination for large agent counts',});riskScore += 10;
    }

    // Validate communication security
    if (!strategy.encryptedCommunication && context.securityLevel !== OrchestrationSecurityLevel.BASIC) {
      violations.push({
        type: 'SECURITY',severity: 'HIGH',description: 'Unencrypted agent communication for sensitive operations',field: 'encryptedCommunication',value: false,recommendation: 'Enable encrypted communication for enhanced security',});riskScore += 15;
    }

    // Validate agent isolation
    if (!strategy.agentIsolation && agentCount > 5) {
      violations.push({
        type: 'SECURITY',severity: 'MEDIUM',description: 'No agent isolation for multi-agent operations',field: 'agentIsolation',value: false,recommendation: 'Enable agent isolation to prevent cross-contamination',});riskScore += 8;
    }

    // Validate monitoring and observability
    if (!strategy.monitoringEnabled && context.businessImpact !== 'LOW') {violations.push({type: 'SECURITY',severity: 'MEDIUM',description: 'No monitoring enabled for business-critical operations',field: 'monitoringEnabled',value: false,recommendation: 'Enable comprehensive monitoring for operation visibility',});riskScore += 12;
    }

    return { riskScore, violations };
  }

  /**
   * Validate compliance requirements
   */
  private async validateComplianceRequirements(
    context: OrchestrationOperationContext,
    request: AuthenticatedRequest,
  ): Promise<{
    riskScore: number;
    violations: OrchestrationViolation[];
    conditions: OrchestrationCondition[];
  }> {
    const violations: OrchestrationViolation[] = [];
    const conditions: OrchestrationCondition[] = [];
    let riskScore = 0;

    const { complianceRequirements, businessImpact } = context;

    // Check for required compliance certifications
    for (const requirement of complianceRequirements) {
      switch (requirement) {
        case 'SOC2':if (!this.validateSOC2Compliance(context, request)) {violations.push({
              type: 'COMPLIANCE',severity: 'HIGH',description: 'SOC2 compliance requirements not met',recommendation: 'Ensure SOC2 controls are implemented',});riskScore += 20;
          }
          break;

        case 'GDPR':if (!this.validateGDPRCompliance(context, request)) {violations.push({
              type: 'COMPLIANCE',severity: 'HIGH',description: 'GDPR compliance requirements not met',recommendation: 'Implement GDPR data protection measures',});riskScore += 25;
          }
          break;

        case 'HIPAA':if (!this.validateHIPAACompliance(context, request)) {violations.push({
              type: 'COMPLIANCE',severity: 'CRITICAL',description: 'HIPAA compliance requirements not met',recommendation: 'Implement HIPAA security safeguards',});riskScore += 30;
          }
          break;
      }
    }

    // Add compliance monitoring conditions
    if (complianceRequirements.length > 0) {
      conditions.push({
        type: 'COMPLIANCE',description: 'Enhanced compliance monitoring required',parameters: {requirements: complianceRequirements,
          auditLevel: 'COMPREHENSIVE',retentionPeriod: '7_YEARS',},mandatory: true,
      });
    }

    // Add data protection conditions for high-impact operations
    if (businessImpact === 'HIGH' || businessImpact === 'CRITICAL') {conditions.push({type: 'MONITORING',description: 'Continuous security monitoring required',parameters: {monitoringLevel: 'REAL_TIME',alertThresholds: 'STRICT',incidentResponse: 'IMMEDIATE',},mandatory: true,
      });
    }

    return { riskScore, violations, conditions };
  }

  // ===== HELPER METHODS =====

  private determineOperationType(method: string, url: string): 'CREATE' | 'COORDINATE' | 'MONITOR' | 'TERMINATE' | 'SCALE' {if (method === 'POST' && url.includes('/orchestrate')) return 'CREATE';if (method === 'PUT' && url.includes('/coordinate')) return 'COORDINATE';if (method === 'GET' && url.includes('/monitor')) return 'MONITOR';if (method === 'DELETE') return 'TERMINATE';if (method === 'PATCH' && url.includes('/scale')) return 'SCALE';return 'CREATE';}private extractOrchestrationStrategy(body: any, query: any): OrchestrationStrategy {
    return body.strategy || query.strategy || {
      maxAgents: 1,
      maxSessions: 1,
      coordinationMode: 'SIMPLE',taskDistribution: 'ROUND_ROBIN',coordinationProtocol: 'HTTP',encryptedCommunication: false,agentIsolation: false,
      monitoringEnabled: false,
    };
  }

  private assessTaskComplexity(body: any, strategy: OrchestrationStrategy): 'SIMPLE' | 'MODERATE' | 'COMPLEX' | 'CRITICAL' {const agentCount = strategy.maxAgents || 1;const taskCount = body.tasks?.length || 1;
    const actionCount = body.tasks?.reduce((total, task) => total + (task.actions?.length || 0), 0) || 1;

    if (agentCount <= 2 && taskCount <= 5 && actionCount <= 20) return 'SIMPLE';if (agentCount <= 10 && taskCount <= 20 && actionCount <= 100) return 'MODERATE';if (agentCount <= 25 && taskCount <= 50 && actionCount <= 500) return 'COMPLEX';return 'CRITICAL';}private determineSecurityLevel(
    strategy: OrchestrationStrategy,
    complexity: 'SIMPLE' | 'MODERATE' | 'COMPLEX' | 'CRITICAL',): OrchestrationSecurityLevel {if (complexity === 'CRITICAL') return OrchestrationSecurityLevel.CRITICAL;if (complexity === 'COMPLEX' || strategy.maxAgents > 20) return OrchestrationSecurityLevel.ENTERPRISE;if (complexity === 'MODERATE' || strategy.maxAgents > 5) return OrchestrationSecurityLevel.DISTRIBUTED;if (strategy.maxAgents > 1) return OrchestrationSecurityLevel.COORDINATED;return OrchestrationSecurityLevel.BASIC;
  }

  private determineRiskLevel(
    strategy: OrchestrationStrategy,
    complexity: 'SIMPLE' | 'MODERATE' | 'COMPLEX' | 'CRITICAL',body: any,): OrchestrationRiskLevel {
    if (complexity === 'CRITICAL') return OrchestrationRiskLevel._CRITICAL;if (complexity === 'COMPLEX') return OrchestrationRiskLevel._HIGH;if (complexity === 'MODERATE' || strategy.maxAgents > 10) return OrchestrationRiskLevel.ELEVATED;if (strategy.maxAgents > 1) return OrchestrationRiskLevel._MODERATE;return OrchestrationRiskLevel._MINIMAL;
  }

  private extractResourceRequirements(body: any): ResourceLimits {
    return body.resourceLimits || {
      maxMemoryGB: 4,
      maxCpuCores: 2,
      maxNetworkMBps: 100,
      maxStorageGB: 10,
      maxExecutionTimeMs: 1800000, // 30 minutes
    };
  }

  private assessBusinessImpact(
    strategy: OrchestrationStrategy,
    resources: ResourceLimits,
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {if (strategy.maxAgents > 50 || resources.maxMemoryGB > 64) return 'CRITICAL';if (strategy.maxAgents > 20 || resources.maxMemoryGB > 32) return 'HIGH';if (strategy.maxAgents > 5 || resources.maxMemoryGB > 8) return 'MEDIUM';return 'LOW';}private estimateOperationDuration(
    strategy: OrchestrationStrategy,
    complexity: 'SIMPLE' | 'MODERATE' | 'COMPLEX' | 'CRITICAL',): number {const baseTime = {
      'SIMPLE': 300000,    // 5 minutes'MODERATE': 900000,  // 15 minutes'COMPLEX': 1800000,  // 30 minutes'CRITICAL': 3600000, // 60 minutes}[complexity];return baseTime * Math.log(strategy.maxAgents + 1);
  }

  private determineComplianceRequirements(
    strategy: OrchestrationStrategy,
    businessImpact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',): string[] {const requirements: string[] = [];

    if (businessImpact === 'CRITICAL') {requirements.push('SOC2', 'GDPR', 'HIPAA');} else if (businessImpact === 'HIGH') {requirements.push('SOC2', 'GDPR');} else if (businessImpact === 'MEDIUM') {requirements.push('SOC2');}return requirements;
  }

  private async assessConversationalValidation(
    context: OrchestrationOperationContext,
    executionContext: ExecutionContext,
  ): Promise<{ required: boolean; approved?: boolean }> {
    // Require conversational validation for high-risk operations
    if (context.riskLevel === OrchestrationRiskLevel._CRITICAL ||
        context.businessImpact === 'CRITICAL' ||
        context.agentCount > 25) {
      try {
        const validationRequest: ParlantValidationRequest = {
          functionName: `OrchestrationValidation.${context.operationType}`,
          functionParams: this.sanitizeOrchestrationParams(context),
          actionDescription: this.generateOrchestrationDescription(context),
          context: {
            userId: 'system', // Will be updated by callersessionId: context.operationId,agentRole: 'USER',conversationHistory: [],metadata: {
              operationType: context.operationType,
              riskLevel: context.riskLevel,
              businessImpact: context.businessImpact,
              agentCount: context.agentCount,
            },
          },
          riskLevel: this.mapRiskLevel(context.riskLevel),
          operationId: context.operationId,
        };

        const response = await this.parlantService.validateFunctionExecution(validationRequest);
        return {
          required: true,
          approved: response.approved,
        };
      } catch (error) {
        this.logger.error('Conversational validation failed', error);return { required: true, approved: false };}
    }

    return { required: false };
  }

  private determineSecurityAction(
    riskScore: number,
    violations: OrchestrationViolation[],
    context: OrchestrationOperationContext,
  ): 'ALLOW' | 'BLOCK' | 'MONITOR' | 'RESTRICT' | 'ESCALATE' {const criticalViolations = violations.filter(v => v.severity === 'CRITICAL').length;const highViolations = violations.filter(v => v.severity === 'HIGH').length;if (criticalViolations > 0 || riskScore >= 100) return 'BLOCK';if (highViolations > 2 || riskScore >= 80) return 'ESCALATE';if (highViolations > 0 || riskScore >= 60) return 'RESTRICT';if (riskScore >= 40) return 'MONITOR';return 'ALLOW';}private determineAllowedStatus(
    action: 'ALLOW' | 'BLOCK' | 'MONITOR' | 'RESTRICT' | 'ESCALATE',violations: OrchestrationViolation[],): boolean {
    return action === 'ALLOW' || action === 'MONITOR' || action === 'RESTRICT';}private generateSecurityConditions(
    context: OrchestrationOperationContext,
    riskScore: number,
    violations: OrchestrationViolation[],
  ): OrchestrationCondition[] {
    const conditions: OrchestrationCondition[] = [];

    // Add monitoring condition for moderate+ risk
    if (riskScore >= 40) {
      conditions.push({
        type: 'MONITORING',description: 'Enhanced monitoring required for operation',parameters: {level: riskScore >= 60 ? 'COMPREHENSIVE' : 'STANDARD',alertThreshold: riskScore >= 80 ? 'STRICT' : 'NORMAL',},mandatory: true,
      });
    }

    // Add resource limits for resource violations
    const resourceViolations = violations.filter(v => v.type === 'RESOURCE');if (resourceViolations.length > 0) {conditions.push({
        type: 'RESOURCE_LIMIT',description: 'Strict resource monitoring and limits enforced',parameters: {enforcement: 'HARD',alertOnThreshold: 0.8,autoTerminateOnExcess: true,
        },
        mandatory: true,
      });
    }

    // Add time limits for long-running operations
    if (context.estimatedDuration > 3600000) { // > 1 hour
      conditions.push({
        type: 'TIME_LIMIT',description: 'Operation time limit enforced',parameters: {maxDurationMs: context.estimatedDuration * 1.2, // 20% buffer
          warningAtPercent: 80,
        },
        mandatory: true,
        validUntil: new Date(Date.now() + context.estimatedDuration * 1.2),
      });
    }

    return conditions;
  }

  private createOrchestrationAuditEntry(
    context: OrchestrationOperationContext,
    request: AuthenticatedRequest,
    riskScore: number,
    action: 'ALLOW' | 'BLOCK' | 'MONITOR' | 'RESTRICT' | 'ESCALATE',
    violations: OrchestrationViolation[],
  ): OrchestrationAuditEntry {
    return {
      entryId: this.generateAuditId(),
      timestamp: new Date(),
      userId: request.user.userId,
      sessionId: request.session.sessionId,
      operationId: context.operationId,
      operationType: context.operationType,
      decision: this.mapActionToDecision(action),
      securityLevel: context.securityLevel,
      riskLevel: context.riskLevel,
      riskScore,
      resourceUsage: this.calculateResourceUsage(context.resourceRequirements),
      agentCoordination: this.generateAgentCoordinationInfo(context),
      processingTime: 0, // Will be updated by caller
      metadata: {
        strategy: context.strategy,
        taskComplexity: context.taskComplexity,
        businessImpact: context.businessImpact,
        complianceRequirements: context.complianceRequirements,
        violationsCount: violations.length,
        endpoint: `${request.method} ${request.url}`,
        userAgent: request.headers['user-agent'],
      },
    };
  }

  // ===== UTILITY METHODS =====

  private generateOperationId(): string {
    return `orch_sec_${Date.now()}_${crypto.randomBytes(6).toString('hex')}';}

  private generateAuditId(): string {
    return `audit_${Date.now()}_${crypto.randomBytes(8).toString('hex')}';}

  private calculateGlobalResourceUsage(): Record<string, number> {
    let totalMemoryGB = 0;
    let totalCpuCores = 0;
    let totalNetworkMBps = 0;

    for (const allocation of this.resourceAllocations.values()) {
      totalMemoryGB += allocation.currentUsage.memory || 0;
      totalCpuCores += allocation.currentUsage.cpu || 0;
      totalNetworkMBps += allocation.currentUsage.network || 0;
    }

    return {
      totalMemoryGB,
      totalCpuCores,
      totalNetworkMBps,
      activeAllocations: this.resourceAllocations.size,
    };
  }

  private calculateResourceScore(limits: ResourceLimits): number {
    return (limits.maxMemoryGB * 2) +
           (limits.maxCpuCores * 4) +
           (limits.maxNetworkMBps / 100) +
           (limits.maxStorageGB / 10);
  }

  private getOrchestrationRateLimits(
    securityLevel: OrchestrationSecurityLevel,
    user: BrowserUseUserContext,
  ): OrchestrationRateLimit {
    const baseLimits = {
      [OrchestrationSecurityLevel.BASIC]: {
        operationsPerMinute: 10,
        agentsPerHour: 50,
        resourcesPerDay: 1000,
        concurrentOperations: 3,
        burstAllowance: 5,
        cooldownPeriodMs: 60000,
      },
      [OrchestrationSecurityLevel.COORDINATED]: {
        operationsPerMinute: 8,
        agentsPerHour: 100,
        resourcesPerDay: 2000,
        concurrentOperations: 5,
        burstAllowance: 3,
        cooldownPeriodMs: 120000,
      },
      [OrchestrationSecurityLevel.DISTRIBUTED]: {
        operationsPerMinute: 5,
        agentsPerHour: 200,
        resourcesPerDay: 5000,
        concurrentOperations: 8,
        burstAllowance: 2,
        cooldownPeriodMs: 300000,
      },
      [OrchestrationSecurityLevel.ENTERPRISE]: {
        operationsPerMinute: 3,
        agentsPerHour: 500,
        resourcesPerDay: 10000,
        concurrentOperations: 15,
        burstAllowance: 1,
        cooldownPeriodMs: 600000,
      },
      [OrchestrationSecurityLevel.CRITICAL]: {
        operationsPerMinute: 1,
        agentsPerHour: 1000,
        resourcesPerDay: 25000,
        concurrentOperations: 25,
        burstAllowance: 0,
        cooldownPeriodMs: 1800000,
      },
    };

    const limits = baseLimits[securityLevel];

    // Apply user-specific multipliers based on permissions
    if (user.permissions.includes(BrowserPermission.BROWSER_ORCHESTRATION_ADMIN)) {
      limits.operationsPerMinute *= 2;
      limits.agentsPerHour *= 2;
      limits.resourcesPerDay *= 2;
      limits.concurrentOperations *= 1.5;
    }

    return limits;
  }

  private countConcurrentOperations(userId: string): number {
    return Array.from(this.activeOrchestrations.values())
      .filter(op => op.operationId.includes(userId))
      .length;
  }

  private mapActionToDecision(action: 'ALLOW' | 'BLOCK' | 'MONITOR' | 'RESTRICT' | 'ESCALATE'): 'GRANTED' | 'DENIED' | 'RESTRICTED' | 'ESCALATED' {switch (action) {case 'ALLOW':case 'MONITOR':return 'GRANTED';case 'RESTRICT':return 'RESTRICTED';case 'ESCALATE':return 'ESCALATED';case 'BLOCK':default:return 'DENIED';
    }
  }

  private mapRiskLevel(riskLevel: OrchestrationRiskLevel): RiskLevel {
    switch (riskLevel) {
      case OrchestrationRiskLevel._MINIMAL:
        return RiskLevel._LOW;
      case OrchestrationRiskLevel._MODERATE:
        return RiskLevel._MODERATE;
      case OrchestrationRiskLevel.ELEVATED:
        return RiskLevel._HIGH;
      case OrchestrationRiskLevel._HIGH:
        return RiskLevel._HIGH;
      case OrchestrationRiskLevel._CRITICAL:
        return RiskLevel._CRITICAL;
      default:
        return RiskLevel._MODERATE;
    }
  }

  private sanitizeOrchestrationParams(context: OrchestrationOperationContext): Record<string, unknown> {
    return {
      operationType: context.operationType,
      agentCount: context.agentCount,
      sessionCount: context.sessionCount,
      taskComplexity: context.taskComplexity,
      estimatedDuration: context.estimatedDuration,
      businessImpact: context.businessImpact,
      // Exclude sensitive strategy details
    };
  }

  private generateOrchestrationDescription(context: OrchestrationOperationContext): string {
    return `Orchestration operation ${context.operationType} with ${context.agentCount} agents, ` +`${context.sessionCount} sessions, complexity: ${context.taskComplexity}, ` +`impact: ${context.businessImpact}`;
  }

  private generateDenialReason(
    violations: OrchestrationViolation[],
    action: 'ALLOW' | 'BLOCK' | 'MONITOR' | 'RESTRICT' | 'ESCALATE',
  ): string {
    if (violations.length === 0) {
      return `Operation ${action.toLowerCase()}ed by security policy`;
    }

    const criticalViolations = violations.filter(v => v.severity === 'CRITICAL');
    if (criticalViolations.length > 0) {
      return `Critical security violations: ${criticalViolations.map(v => v.description).join(`, ')}';}

    const highViolations = violations.filter(v => v.severity === 'HIGH');
    if (highViolations.length > 0) {
      return `High-severity violations: ${highViolations.map(v => v.description).join(`, ')}';}

    return `Security policy violations detected: ${violations.slice(0, 3).map(v => v.description).join(`, ')}';}

  private calculateResourceUsage(limits: ResourceLimits): Record<string, number> {
    return {
      memory: limits.maxMemoryGB,
      cpu: limits.maxCpuCores,
      network: limits.maxNetworkMBps,
      storage: limits.maxStorageGB,
      time: limits.maxExecutionTimeMs,
    };
  }

  private generateAgentCoordinationInfo(context: OrchestrationOperationContext): AgentCoordinationInfo[] {
    const coordination: AgentCoordinationInfo[] = [];

    for (let i = 0; i < Math.min(context.agentCount, 10); i++) {
      coordination.push({
        agentId: `agent_${i + 1}`,
        role: i === 0 ? 'coordinator' : 'worker',capabilities: ['browser_automation', 'data_extraction'],resourceAllocation: {memory: context.resourceRequirements.maxMemoryGB / context.agentCount,
          cpu: context.resourceRequirements.maxCpuCores / context.agentCount,
        },
        securityClearance: context.securityLevel,
        coordinationProtocol: context.strategy.coordinationProtocol || 'HTTP',});}

    return coordination;
  }

  private async applyOrchestrationSecurityResponse(
    result: OrchestrationSecurityResult,
    context: OrchestrationOperationContext,
    response: Response,
  ): Promise<void> {
    // Add orchestration security headers
    response.setHeader('X-Orchestration-Security-Level', context.securityLevel);response.setHeader('X-Orchestration-Risk-Level', context.riskLevel);response.setHeader('X-Orchestration-Risk-Score', result.riskScore.toString());response.setHeader('X-Orchestration-Action', result.recommendedAction);response.setHeader('X-Orchestration-Operation-ID', context.operationId);// Apply security response based on recommendationif (!result.allowed) {
      throw new ForbiddenException({
        message: result.reason || 'Orchestration security policy violation',type: 'orchestration_security_violation',operationId: context.operationId,riskScore: result.riskScore,
        violations: result.violations.map(v => v.description),
        resourceConstraints: result.resourceConstraints,
      });
    }

    // Apply restrictions for RESTRICT action
    if (result.recommendedAction === 'RESTRICT') {response.setHeader('X-Orchestration-Restrictions', 'ACTIVE');response.setHeader('X-Orchestration-Conditions', JSON.stringify(result.conditions));}// Apply monitoring for MONITOR action
    if (result.recommendedAction === 'MONITOR') {response.setHeader('X-Orchestration-Monitoring', 'ENHANCED');}// Handle escalation
    if (result.recommendedAction === 'ESCALATE') {this.securityMetrics.escalatedOperations++;if (result.requiredApprovals.includes('conversational_approval')) {throw new ConversationalValidationError(context.operationId,
          'Orchestration operation requires conversational approval',result.violations.map(v => v.description),);
      }

      throw new ForbiddenException({
        message: 'Orchestration operation requires escalation and approval',type: 'orchestration_escalation_required',
        operationId: context.operationId,
        requiredApprovals: result.requiredApprovals,
      });
    }
  }

  private trackOrchestrationOperation(
    context: OrchestrationOperationContext,
    result: OrchestrationSecurityResult,
    startTime: number,
  ): void {
    // Track active orchestration
    if (result.allowed) {
      this.activeOrchestrations.set(context.operationId, context);

      // Auto-cleanup after estimated duration + buffer
      setTimeout(() => {
        this.activeOrchestrations.delete(context.operationId);
      }, context.estimatedDuration + 300000); // 5-minute buffer
    }

    // Update processing time in audit trail
    result.auditTrail.processingTime = performance.now() - startTime;
  }

  private async storeSecurityAuditTrail(auditEntry: OrchestrationAuditEntry): Promise<void> {
    // Log comprehensive audit trail
    this.logger.log(`Orchestration Security Audit`, {entryId: auditEntry.entryId,operationId: auditEntry.operationId,
      decision: auditEntry.decision,
      riskScore: auditEntry.riskScore,
      processingTime: `${auditEntry.processingTime.toFixed(2)}ms`,metadata: auditEntry.metadata,});

    // In production, persist to secure audit database
    // await this.auditService.storeOrchestrationAudit(auditEntry);
  }

  private updateSecurityMetrics(result: OrchestrationSecurityResult, processingTime: number): void {
    // Update risk score average
    this.securityMetrics.averageRiskScore =
      (this.securityMetrics.averageRiskScore * (this.securityMetrics.totalOperations - 1) + result.riskScore) /
      this.securityMetrics.totalOperations;

    // Update processing time average
    this.securityMetrics.averageProcessingTime =
      (this.securityMetrics.averageProcessingTime * (this.securityMetrics.totalOperations - 1) + processingTime) /
      this.securityMetrics.totalOperations;

    // Track violations by type
    result.violations.forEach(violation => {
      const key = `${violation.type}_${violation.severity}`;this.securityMetrics.securityViolations[key] =(this.securityMetrics.securityViolations[key] || 0) + 1;
    });
  }

  private performSecurityMaintenance(): void {
    const now = Date.now();
    let cleanedTrackers = 0;
    let cleanedAllocations = 0;

    // Clean up expired rate limit trackers
    for (const [key, tracker] of this.orchestrationRateLimiters.entries()) {
      if (now - tracker.lastOperation.getTime() > 3600000) { // 1 hour
        this.orchestrationRateLimiters.delete(key);
        cleanedTrackers++;
      }
    }

    // Clean up expired resource allocations
    for (const [key, allocation] of this.resourceAllocations.entries()) {
      if (allocation.expiresAt < new Date()) {
        this.resourceAllocations.delete(key);
        cleanedAllocations++;
      }
    }

    if (cleanedTrackers > 0 || cleanedAllocations > 0) {
      this.logger.debug(`Security maintenance completed`, {
        cleanedTrackers,
        cleanedAllocations,
        activeTrackers: this.orchestrationRateLimiters.size,
        activeAllocations: this.resourceAllocations.size,
      });
    }
  }

  private performResourceCleanup(): void {
    const now = Date.now();
    let cleanedOperations = 0;

    // Clean up completed/expired orchestrations
    for (const [operationId, context] of this.activeOrchestrations.entries()) {
      const elapsedTime = now - Date.parse(context.operationId.split('_')[2]);
      if (elapsedTime > context.estimatedDuration + 600000) { // 10-minute buffer
        this.activeOrchestrations.delete(operationId);
        cleanedOperations++;
      }
    }

    if (cleanedOperations > 0) {
      this.logger.debug(`Resource cleanup completed`, {
        cleanedOperations,
        activeOrchestrations: this.activeOrchestrations.size,
      });
    }
  }

  private logSecurityMetrics(): void {
    const successRate = (this.securityMetrics.allowedOperations / this.securityMetrics.totalOperations) * 100;

    this.logger.log('🔒 Orchestration Security Metrics', {
      totalOperations: this.securityMetrics.totalOperations,
      allowedOperations: this.securityMetrics.allowedOperations,
      blockedOperations: this.securityMetrics.blockedOperations,
      escalatedOperations: this.securityMetrics.escalatedOperations,
      successRate: `${successRate.toFixed(2)}%`,averageRiskScore: this.securityMetrics.averageRiskScore.toFixed(2),averageProcessingTime: `${this.securityMetrics.averageProcessingTime.toFixed(2)}ms`,
      activeOrchestrations: this.activeOrchestrations.size,
      rateLimitTrackers: this.orchestrationRateLimiters.size,
      resourceAllocations: this.resourceAllocations.size,
    });
  }

  private logSecurityConfiguration(): void {
    this.logger.log('🔧 Orchestration Security Configuration', {
      securityLevels: Object.values(OrchestrationSecurityLevel),
      riskLevels: Object.values(OrchestrationRiskLevel),
      maxConcurrentOperations: 25,
      rateLimitingEnabled: true,
      resourceMonitoringEnabled: true,
      complianceEnforcementEnabled: true,
      conversationalValidationEnabled: true,
    });
  }

  // Compliance validation methods (placeholder implementations)
  private validateSOC2Compliance(context: OrchestrationOperationContext, request: AuthenticatedRequest): boolean {
    // Implement SOC2 compliance checks
    return context.strategy.monitoringEnabled && context.strategy.encryptedCommunication;
  }

  private validateGDPRCompliance(context: OrchestrationOperationContext, request: AuthenticatedRequest): boolean {
    // Implement GDPR compliance checks
    return context.strategy.agentIsolation && context.resourceRequirements.maxStorageGB < 100;
  }

  private validateHIPAACompliance(context: OrchestrationOperationContext, request: AuthenticatedRequest): boolean {
    // Implement HIPAA compliance checks
    return context.strategy.encryptedCommunication &&
           context.strategy.agentIsolation &&
           context.securityLevel !== OrchestrationSecurityLevel.BASIC;
  }

  /**
   * Get current orchestration security metrics
   */
  getOrchestrationSecurityMetrics(): OrchestrationSecurityMetrics {
    return {
      ...this.securityMetrics,
      resourceUtilization: this.calculateGlobalResourceUsage(),
    };
  }

  /**
   * Get active orchestration operations
   */
  getActiveOrchestrations(): OrchestrationOperationContext[] {
    return Array.from(this.activeOrchestrations.values());
  }

  /**
   * Force terminate orchestration operation (admin only)
   */
  async terminateOrchestration(operationId: string, reason: string): Promise<boolean> {
    const operation = this.activeOrchestrations.get(operationId);
    if (!operation) {
      return false;
    }

    this.activeOrchestrations.delete(operationId);

    this.logger.warn(`Orchestration operation terminated`, {
      operationId,
      reason,
      operationType: operation.operationType,
      agentCount: operation.agentCount,
    });

    return true;
  }
}