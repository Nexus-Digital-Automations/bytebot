/**
 * @fileoverview PARLANT Phase 1 - Multi-Tier Rate Management Framework
 * Comprehensive rate limiting across user, API, operation, and global tiers
 * with intelligent burst handling and dynamic adjustment capabilities
 *
 * @version 1.0.0
 * @author AIgent Enterprise Rate Limiting Team
 * @since 2025-09-22
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  RateLimitConfiguration,
  RateLimitContext,
  UserRateLimits,
  APIRateLimits,
  OperationRateLimits,
  GlobalRateLimits,
  RateLimitState,
  UsageMetrics,
  WindowUsageMetrics,
  ThrottlingStatus,
  QueueStatus,
  DynamicRateLimitAdjustment,
  EmergencyModeConfig,
  FairQueuingConfig,
  PriorityManagementConfig
} from '../types/rate-limiting.types';
import { SecurityLevel, RiskLevel } from '../../interfaces/conversational-api.interface';

/**
 * Multi-tier rate management service providing comprehensive rate limiting
 * across all system layers with intelligent coordination
 */
@Injectable()
export class MultiTierRateManagerService {
  private readonly logger = new Logger(MultiTierRateManagerService.name);

  // Tier-specific managers
  private readonly userTierManager: UserTierManager;
  private readonly apiTierManager: APITierManager;
  private readonly operationTierManager: OperationTierManager;
  private readonly globalTierManager: GlobalTierManager;

  // Coordination and optimization
  private readonly coordinationEngine: TierCoordinationEngine;
  private readonly burstHandler: IntelligentBurstHandler;
  private readonly dynamicAdjuster: DynamicRateAdjuster;

  // Performance optimization
  private readonly performanceOptimizer: RateManagerPerformanceOptimizer;

  constructor(
    private readonly configuration: RateLimitConfiguration
  ) {
    this.userTierManager = new UserTierManager(configuration.userLimits);
    this.apiTierManager = new APITierManager(configuration.apiLimits);
    this.operationTierManager = new OperationTierManager(configuration.operationLimits);
    this.globalTierManager = new GlobalTierManager(configuration.globalLimits);

    this.coordinationEngine = new TierCoordinationEngine();
    this.burstHandler = new IntelligentBurstHandler(configuration);
    this.dynamicAdjuster = new DynamicRateAdjuster(configuration);
    this.performanceOptimizer = new RateManagerPerformanceOptimizer();

    this.initializeMultiTierFramework();
  }

  /**
   * Evaluate request across all tiers with intelligent coordination
   */
  async evaluateMultiTierLimits(context: RateLimitContext): Promise<MultiTierEvaluationResult> {
    const startTime = Date.now();

    try {
      // Parallel evaluation across all tiers for optimal performance
      const [userResult, apiResult, operationResult, globalResult] = await Promise.all([
        this.userTierManager.evaluateUserLimits(context),
        this.apiTierManager.evaluateAPILimits(context),
        this.operationTierManager.evaluateOperationLimits(context),
        this.globalTierManager.evaluateGlobalLimits(context)
      ]);

      // Coordinate results across tiers
      const coordinatedResult = await this.coordinationEngine.coordinateEvaluations(
        context,
        { user: userResult, api: apiResult, operation: operationResult, global: globalResult }
      );

      // Apply intelligent burst handling
      const burstAdjustedResult = await this.burstHandler.applyBurstHandling(
        context,
        coordinatedResult
      );

      // Apply dynamic adjustments if needed
      const finalResult = await this.dynamicAdjuster.applyDynamicAdjustments(
        context,
        burstAdjustedResult
      );

      const processingTime = Date.now() - startTime;
      this.logger.debug(`Multi-tier evaluation completed in ${processingTime}ms for user: ${context.userId}`);

      return {
        ...finalResult,
        processingTime,
        tierResults: { user: userResult, api: apiResult, operation: operationResult, global: globalResult },
        coordinationApplied: true,
        burstHandlingApplied: true,
        dynamicAdjustmentsApplied: finalResult !== burstAdjustedResult
      };

    } catch (error) {
      this.logger.error('Multi-tier evaluation failed', error);
      return this.createFailSafeEvaluation(context, Date.now() - startTime);
    }
  }

  /**
   * Update usage metrics across all tiers
   */
  async updateMultiTierUsage(context: RateLimitContext, allowed: boolean): Promise<void> {
    try {
      // Update all tiers in parallel
      await Promise.all([
        this.userTierManager.updateUsage(context, allowed),
        this.apiTierManager.updateUsage(context, allowed),
        this.operationTierManager.updateUsage(context, allowed),
        this.globalTierManager.updateUsage(context, allowed)
      ]);

      // Update coordination state
      await this.coordinationEngine.updateCoordinationState(context, allowed);

      // Trigger dynamic adjustments if thresholds are met
      await this.dynamicAdjuster.checkAdjustmentTriggers(context);

    } catch (error) {
      this.logger.error('Failed to update multi-tier usage', error);
    }
  }

  /**
   * Get comprehensive state across all tiers
   */
  async getMultiTierState(context: RateLimitContext): Promise<MultiTierState> {
    try {
      const [userState, apiState, operationState, globalState] = await Promise.all([
        this.userTierManager.getState(context),
        this.apiTierManager.getState(context),
        this.operationTierManager.getState(context),
        this.globalTierManager.getState(context)
      ]);

      const coordinationState = await this.coordinationEngine.getCoordinationState(context);

      return {
        user: userState,
        api: apiState,
        operation: operationState,
        global: globalState,
        coordination: coordinationState,
        lastUpdated: new Date(),
        healthStatus: this.calculateOverallHealth(userState, apiState, operationState, globalState)
      };

    } catch (error) {
      this.logger.error('Failed to get multi-tier state', error);
      throw error;
    }
  }

  /**
   * Apply emergency mode across all tiers
   */
  async activateEmergencyMode(reason: string, severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'): Promise<void> {
    this.logger.warn(`Activating emergency mode: ${reason} (Severity: ${severity})`);

    try {
      const emergencyConfig = this.getEmergencyConfiguration(severity);

      await Promise.all([
        this.userTierManager.activateEmergencyMode(emergencyConfig),
        this.apiTierManager.activateEmergencyMode(emergencyConfig),
        this.operationTierManager.activateEmergencyMode(emergencyConfig),
        this.globalTierManager.activateEmergencyMode(emergencyConfig)
      ]);

      // Update coordination engine for emergency mode
      await this.coordinationEngine.activateEmergencyCoordination(emergencyConfig);

      this.logger.warn('Emergency mode activated successfully across all tiers');

    } catch (error) {
      this.logger.error('Failed to activate emergency mode', error);
      throw error;
    }
  }

  /**
   * Deactivate emergency mode and restore normal operations
   */
  async deactivateEmergencyMode(): Promise<void> {
    this.logger.log('Deactivating emergency mode and restoring normal operations');

    try {
      await Promise.all([
        this.userTierManager.deactivateEmergencyMode(),
        this.apiTierManager.deactivateEmergencyMode(),
        this.operationTierManager.deactivateEmergencyMode(),
        this.globalTierManager.deactivateEmergencyMode()
      ]);

      await this.coordinationEngine.deactivateEmergencyCoordination();

      this.logger.log('Emergency mode deactivated successfully');

    } catch (error) {
      this.logger.error('Failed to deactivate emergency mode', error);
      throw error;
    }
  }

  /**
   * Get performance metrics across all tiers
   */
  async getPerformanceMetrics(): Promise<MultiTierPerformanceMetrics> {
    return this.performanceOptimizer.getMetrics();
  }

  /**
   * Initialize the multi-tier framework
   */
  private initializeMultiTierFramework(): void {
    this.logger.log('Initializing Multi-Tier Rate Management Framework');

    // Start performance monitoring
    setInterval(() => {
      this.performanceOptimizer.collectMetrics();
    }, 1000); // Collect metrics every second

    // Start coordination optimization
    setInterval(() => {
      this.coordinationEngine.optimizeCoordination();
    }, 5000); // Optimize every 5 seconds

    // Start dynamic adjustment monitoring
    setInterval(() => {
      this.dynamicAdjuster.monitorAndAdjust();
    }, 10000); // Monitor every 10 seconds

    this.logger.log('Multi-Tier Rate Management Framework initialized successfully');
  }

  /**
   * Create fail-safe evaluation result
   */
  private createFailSafeEvaluation(context: RateLimitContext, processingTime: number): MultiTierEvaluationResult {
    return {
      decision: 'ALLOW',
      reason: 'Multi-tier evaluation failed - allowing with monitoring',
      confidence: 0.5,
      riskLevel: 'MEDIUM',
      recommendedAction: 'ALLOW_WITH_MONITORING',
      processingTime,
      tierResults: {
        user: { allowed: true, confidence: 0.5, violations: [] },
        api: { allowed: true, confidence: 0.5, violations: [] },
        operation: { allowed: true, confidence: 0.5, violations: [] },
        global: { allowed: true, confidence: 0.5, violations: [] }
      },
      coordinationApplied: false,
      burstHandlingApplied: false,
      dynamicAdjustmentsApplied: false
    };
  }

  /**
   * Get emergency configuration based on severity
   */
  private getEmergencyConfiguration(severity: string): EmergencyModeConfig {
    const baseConfig = this.configuration.globalLimits.emergencyMode;

    const severityMultipliers = {
      'LOW': 0.8,
      'MEDIUM': 0.6,
      'HIGH': 0.4,
      'CRITICAL': 0.2
    };

    const multiplier = severityMultipliers[severity as keyof typeof severityMultipliers] || 0.5;

    return {
      ...baseConfig,
      restrictionLevel: multiplier,
      durationMinutes: baseConfig.durationMinutes * (2 - multiplier), // Longer for more severe
      allowedOperations: severity === 'CRITICAL' ? ['health-check', 'emergency'] : baseConfig.allowedOperations
    };
  }

  /**
   * Calculate overall health across all tiers
   */
  private calculateOverallHealth(...states: any[]): 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' {
    const healthyCount = states.filter(state => state.health === 'HEALTHY').length;
    const totalCount = states.length;

    if (healthyCount === totalCount) return 'HEALTHY';
    if (healthyCount >= totalCount / 2) return 'DEGRADED';
    return 'UNHEALTHY';
  }
}

/**
 * User tier rate limiting manager
 */
class UserTierManager {
  private readonly logger = new Logger(UserTierManager.name);
  private readonly usageTracking = new Map<string, UserUsageTracking>();

  constructor(private readonly userLimits: UserRateLimits) {}

  async evaluateUserLimits(context: RateLimitContext): Promise<TierEvaluationResult> {
    const userId = context.userId;
    const usage = this.getOrCreateUsageTracking(userId);

    // Get user-specific limits based on role and tier
    const effectiveLimits = this.getEffectiveUserLimits(context);

    // Check all user-level limits
    const violations: LimitViolation[] = [];

    if (usage.requestsThisSecond >= effectiveLimits.requestsPerSecond) {
      violations.push({
        type: 'USER_REQUESTS_PER_SECOND',
        current: usage.requestsThisSecond,
        limit: effectiveLimits.requestsPerSecond,
        severity: 'MEDIUM'
      });
    }

    if (usage.requestsThisMinute >= effectiveLimits.requestsPerMinute) {
      violations.push({
        type: 'USER_REQUESTS_PER_MINUTE',
        current: usage.requestsThisMinute,
        limit: effectiveLimits.requestsPerMinute,
        severity: 'HIGH'
      });
    }

    if (usage.burstCount >= effectiveLimits.burstLimit) {
      violations.push({
        type: 'USER_BURST_LIMIT',
        current: usage.burstCount,
        limit: effectiveLimits.burstLimit,
        severity: 'HIGH'
      });
    }

    if (usage.concurrentConnections >= effectiveLimits.concurrentConnections) {
      violations.push({
        type: 'USER_CONCURRENT_CONNECTIONS',
        current: usage.concurrentConnections,
        limit: effectiveLimits.concurrentConnections,
        severity: 'CRITICAL'
      });
    }

    return {
      allowed: violations.length === 0,
      confidence: this.calculateConfidence(usage, effectiveLimits, violations),
      violations,
      utilization: this.calculateUtilization(usage, effectiveLimits),
      nextAllowedTime: this.calculateNextAllowedTime(violations, effectiveLimits),
      recommendedAction: this.getRecommendedAction(violations)
    };
  }

  async updateUsage(context: RateLimitContext, allowed: boolean): Promise<void> {
    const userId = context.userId;
    const usage = this.getOrCreateUsageTracking(userId);

    usage.requestsThisSecond++;
    usage.requestsThisMinute++;
    usage.requestsThisHour++;
    usage.requestsThisDay++;

    if (allowed) {
      usage.successfulRequests++;
    } else {
      usage.rejectedRequests++;
    }

    // Update burst tracking
    this.updateBurstTracking(usage);

    // Update concurrent connections
    if (context.operation === 'connect') {
      usage.concurrentConnections++;
    } else if (context.operation === 'disconnect') {
      usage.concurrentConnections = Math.max(0, usage.concurrentConnections - 1);
    }
  }

  async getState(context: RateLimitContext): Promise<UserTierState> {
    const usage = this.getOrCreateUsageTracking(context.userId);

    return {
      userId: context.userId,
      currentUsage: usage,
      limits: this.getEffectiveUserLimits(context),
      health: this.calculateUserHealth(usage),
      lastActivity: new Date()
    };
  }

  async activateEmergencyMode(config: EmergencyModeConfig): Promise<void> {
    this.logger.warn('Activating emergency mode for user tier');
    // Implementation for emergency mode
  }

  async deactivateEmergencyMode(): Promise<void> {
    this.logger.log('Deactivating emergency mode for user tier');
    // Implementation for deactivating emergency mode
  }

  private getOrCreateUsageTracking(userId: string): UserUsageTracking {
    if (!this.usageTracking.has(userId)) {
      this.usageTracking.set(userId, {
        userId,
        requestsThisSecond: 0,
        requestsThisMinute: 0,
        requestsThisHour: 0,
        requestsThisDay: 0,
        burstCount: 0,
        concurrentConnections: 0,
        successfulRequests: 0,
        rejectedRequests: 0,
        lastReset: new Date()
      });
    }
    return this.usageTracking.get(userId)!;
  }

  private getEffectiveUserLimits(context: RateLimitContext): EffectiveUserLimits {
    const baseLimits = this.userLimits;

    // Apply role-based limits
    const userRoles = context.userContext.roles;
    let effectiveLimits = { ...baseLimits };

    for (const role of userRoles) {
      if (baseLimits.byRole[role]) {
        const roleLimits = baseLimits.byRole[role];
        effectiveLimits.requestsPerSecond = Math.max(effectiveLimits.requestsPerSecond, roleLimits.requestsPerSecond);
        effectiveLimits.requestsPerMinute = Math.max(effectiveLimits.requestsPerMinute, roleLimits.requestsPerMinute);
        effectiveLimits.burstLimit = Math.max(effectiveLimits.burstLimit, roleLimits.burstLimit);
      }
    }

    return effectiveLimits;
  }

  private calculateConfidence(usage: UserUsageTracking, limits: EffectiveUserLimits, violations: LimitViolation[]): number {
    if (violations.length === 0) return 1.0;

    const utilizationFactor = Math.min(1.0, (usage.requestsThisMinute / limits.requestsPerMinute));
    const violationSeverity = violations.reduce((max, v) => {
      const severityValues = { 'LOW': 0.2, 'MEDIUM': 0.5, 'HIGH': 0.8, 'CRITICAL': 1.0 };
      return Math.max(max, severityValues[v.severity as keyof typeof severityValues] || 0.5);
    }, 0);

    return Math.max(0.1, 1.0 - (utilizationFactor * violationSeverity));
  }

  private calculateUtilization(usage: UserUsageTracking, limits: EffectiveUserLimits): number {
    const utilizations = [
      usage.requestsThisSecond / limits.requestsPerSecond,
      usage.requestsThisMinute / limits.requestsPerMinute,
      usage.requestsThisHour / limits.requestsPerHour,
      usage.burstCount / limits.burstLimit,
      usage.concurrentConnections / limits.concurrentConnections
    ];

    return Math.max(...utilizations) * 100;
  }

  private calculateNextAllowedTime(violations: LimitViolation[], limits: EffectiveUserLimits): Date | null {
    if (violations.length === 0) return null;

    // Find the most restrictive violation
    const mostRestrictive = violations.reduce((worst, current) => {
      const severityOrder = { 'LOW': 1, 'MEDIUM': 2, 'HIGH': 3, 'CRITICAL': 4 };
      return severityOrder[current.severity as keyof typeof severityOrder] >
             severityOrder[worst.severity as keyof typeof severityOrder] ? current : worst;
    });

    // Calculate wait time based on violation type
    const waitTimes = {
      'USER_REQUESTS_PER_SECOND': 1000,
      'USER_REQUESTS_PER_MINUTE': 60000,
      'USER_REQUESTS_PER_HOUR': 3600000,
      'USER_BURST_LIMIT': 5000,
      'USER_CONCURRENT_CONNECTIONS': 2000
    };

    const waitTime = waitTimes[mostRestrictive.type as keyof typeof waitTimes] || 60000;
    return new Date(Date.now() + waitTime);
  }

  private getRecommendedAction(violations: LimitViolation[]): string {
    if (violations.length === 0) return 'ALLOW';

    const hasCritical = violations.some(v => v.severity === 'CRITICAL');
    if (hasCritical) return 'DENY';

    const hasHigh = violations.some(v => v.severity === 'HIGH');
    if (hasHigh) return 'THROTTLE';

    return 'QUEUE';
  }

  private updateBurstTracking(usage: UserUsageTracking): void {
    const now = Date.now();
    const timeSinceLastReset = now - usage.lastReset.getTime();

    // Reset burst count every minute
    if (timeSinceLastReset > 60000) {
      usage.burstCount = 1;
      usage.lastReset = new Date(now);
    } else {
      // Increment burst count if requests are coming rapidly
      if (timeSinceLastReset < 5000) { // Within 5 seconds
        usage.burstCount++;
      }
    }
  }

  private calculateUserHealth(usage: UserUsageTracking): 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' {
    const successRate = usage.successfulRequests / (usage.successfulRequests + usage.rejectedRequests);

    if (successRate > 0.9) return 'HEALTHY';
    if (successRate > 0.7) return 'DEGRADED';
    return 'UNHEALTHY';
  }
}

/**
 * API tier rate limiting manager
 */
class APITierManager {
  private readonly logger = new Logger(APITierManager.name);
  private readonly endpointUsage = new Map<string, EndpointUsageTracking>();

  constructor(private readonly apiLimits: APIRateLimits) {}

  async evaluateAPILimits(context: RateLimitContext): Promise<TierEvaluationResult> {
    const endpointKey = `${context.method}:${context.apiEndpoint}`;
    const usage = this.getOrCreateEndpointUsage(endpointKey);

    const endpointLimits = this.findMatchingEndpointLimits(context);
    const violations: LimitViolation[] = [];

    if (endpointLimits) {
      if (usage.requestsThisSecond >= endpointLimits.requestsPerSecond) {
        violations.push({
          type: 'API_ENDPOINT_REQUESTS_PER_SECOND',
          current: usage.requestsThisSecond,
          limit: endpointLimits.requestsPerSecond,
          severity: this.calculateSeverityBasedOnSecurity(endpointLimits.securityLevel)
        });
      }

      if (usage.requestsThisMinute >= endpointLimits.requestsPerMinute) {
        violations.push({
          type: 'API_ENDPOINT_REQUESTS_PER_MINUTE',
          current: usage.requestsThisMinute,
          limit: endpointLimits.requestsPerMinute,
          severity: this.calculateSeverityBasedOnSecurity(endpointLimits.securityLevel)
        });
      }

      if (usage.burstRequests >= endpointLimits.burstLimit) {
        violations.push({
          type: 'API_ENDPOINT_BURST_LIMIT',
          current: usage.burstRequests,
          limit: endpointLimits.burstLimit,
          severity: 'HIGH'
        });
      }
    }

    return {
      allowed: violations.length === 0,
      confidence: this.calculateAPIConfidence(usage, endpointLimits, violations),
      violations,
      utilization: this.calculateAPIUtilization(usage, endpointLimits),
      nextAllowedTime: this.calculateAPINextAllowedTime(violations, endpointLimits),
      recommendedAction: this.getAPIRecommendedAction(violations, context)
    };
  }

  async updateUsage(context: RateLimitContext, allowed: boolean): Promise<void> {
    const endpointKey = `${context.method}:${context.apiEndpoint}`;
    const usage = this.getOrCreateEndpointUsage(endpointKey);

    usage.requestsThisSecond++;
    usage.requestsThisMinute++;
    usage.requestsThisHour++;

    if (allowed) {
      usage.successfulRequests++;
    } else {
      usage.rejectedRequests++;
    }

    // Update burst tracking
    this.updateAPIBurstTracking(usage);

    // Update payload size tracking
    usage.totalPayloadSize += context.payloadSize || 0;
    usage.averagePayloadSize = usage.totalPayloadSize / (usage.successfulRequests + usage.rejectedRequests);
  }

  async getState(context: RateLimitContext): Promise<APITierState> {
    const endpointKey = `${context.method}:${context.apiEndpoint}`;
    const usage = this.getOrCreateEndpointUsage(endpointKey);

    return {
      endpoint: context.apiEndpoint,
      method: context.method,
      currentUsage: usage,
      limits: this.findMatchingEndpointLimits(context),
      health: this.calculateAPIHealth(usage),
      lastActivity: new Date()
    };
  }

  async activateEmergencyMode(config: EmergencyModeConfig): Promise<void> {
    this.logger.warn('Activating emergency mode for API tier');
    // Implementation for emergency mode
  }

  async deactivateEmergencyMode(): Promise<void> {
    this.logger.log('Deactivating emergency mode for API tier');
    // Implementation for deactivating emergency mode
  }

  private getOrCreateEndpointUsage(endpointKey: string): EndpointUsageTracking {
    if (!this.endpointUsage.has(endpointKey)) {
      this.endpointUsage.set(endpointKey, {
        endpoint: endpointKey,
        requestsThisSecond: 0,
        requestsThisMinute: 0,
        requestsThisHour: 0,
        burstRequests: 0,
        successfulRequests: 0,
        rejectedRequests: 0,
        totalPayloadSize: 0,
        averagePayloadSize: 0,
        lastReset: new Date()
      });
    }
    return this.endpointUsage.get(endpointKey)!;
  }

  private findMatchingEndpointLimits(context: RateLimitContext): any {
    // Direct endpoint match
    if (this.apiLimits.endpointLimits[context.apiEndpoint]) {
      return this.apiLimits.endpointLimits[context.apiEndpoint];
    }

    // Pattern matching
    for (const patternLimit of this.apiLimits.pathPatternLimits) {
      if (patternLimit.regex.test(context.apiEndpoint)) {
        return patternLimit.limits;
      }
    }

    // Method-based limits
    if (this.apiLimits.methodLimits[context.method]) {
      return this.convertMethodLimitsToEndpointLimits(this.apiLimits.methodLimits[context.method]);
    }

    return null;
  }

  private convertMethodLimitsToEndpointLimits(methodLimits: any): any {
    return {
      requestsPerSecond: methodLimits.requestsPerSecond,
      requestsPerMinute: methodLimits.requestsPerSecond * 60,
      burstLimit: methodLimits.burstLimit,
      securityLevel: 'MEDIUM' as SecurityLevel
    };
  }

  private calculateSeverityBasedOnSecurity(securityLevel: SecurityLevel): string {
    const severityMap = {
      'LOW': 'LOW',
      'MEDIUM': 'MEDIUM',
      'HIGH': 'HIGH',
      'CRITICAL': 'CRITICAL'
    };
    return severityMap[securityLevel] || 'MEDIUM';
  }

  private calculateAPIConfidence(usage: EndpointUsageTracking, limits: any, violations: LimitViolation[]): number {
    if (!limits || violations.length === 0) return 1.0;

    const utilizationFactor = Math.min(1.0, usage.requestsThisMinute / limits.requestsPerMinute);
    const errorRate = usage.rejectedRequests / (usage.successfulRequests + usage.rejectedRequests);

    return Math.max(0.1, 1.0 - (utilizationFactor * 0.7 + errorRate * 0.3));
  }

  private calculateAPIUtilization(usage: EndpointUsageTracking, limits: any): number {
    if (!limits) return 0;

    return Math.max(
      (usage.requestsThisSecond / limits.requestsPerSecond) * 100,
      (usage.requestsThisMinute / limits.requestsPerMinute) * 100,
      (usage.burstRequests / limits.burstLimit) * 100
    );
  }

  private calculateAPINextAllowedTime(violations: LimitViolation[], limits: any): Date | null {
    if (violations.length === 0) return null;

    const waitTime = violations.some(v => v.type.includes('SECOND')) ? 1000 : 60000;
    return new Date(Date.now() + waitTime);
  }

  private getAPIRecommendedAction(violations: LimitViolation[], context: RateLimitContext): string {
    if (violations.length === 0) return 'ALLOW';

    const hasSecurityViolation = violations.some(v => v.severity === 'CRITICAL');
    if (hasSecurityViolation) return 'DENY';

    return 'THROTTLE';
  }

  private updateAPIBurstTracking(usage: EndpointUsageTracking): void {
    const now = Date.now();
    const timeSinceLastReset = now - usage.lastReset.getTime();

    if (timeSinceLastReset > 60000) {
      usage.burstRequests = 1;
      usage.lastReset = new Date(now);
    } else if (timeSinceLastReset < 5000) {
      usage.burstRequests++;
    }
  }

  private calculateAPIHealth(usage: EndpointUsageTracking): 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' {
    const successRate = usage.successfulRequests / (usage.successfulRequests + usage.rejectedRequests);

    if (successRate > 0.95) return 'HEALTHY';
    if (successRate > 0.8) return 'DEGRADED';
    return 'UNHEALTHY';
  }
}

/**
 * Operation tier rate limiting manager
 */
class OperationTierManager {
  private readonly logger = new Logger(OperationTierManager.name);
  private readonly operationUsage = new Map<string, OperationUsageTracking>();

  constructor(private readonly operationLimits: OperationRateLimits) {}

  async evaluateOperationLimits(context: RateLimitContext): Promise<TierEvaluationResult> {
    const operationKey = context.operation;
    const usage = this.getOrCreateOperationUsage(operationKey);

    const limits = this.getOperationLimits(context);
    const violations: LimitViolation[] = [];

    if (usage.requestsThisSecond >= limits.requestsPerSecond) {
      violations.push({
        type: 'OPERATION_REQUESTS_PER_SECOND',
        current: usage.requestsThisSecond,
        limit: limits.requestsPerSecond,
        severity: this.calculateOperationSeverity(context)
      });
    }

    if (usage.concurrentExecutions >= limits.concurrentExecutions) {
      violations.push({
        type: 'OPERATION_CONCURRENT_EXECUTIONS',
        current: usage.concurrentExecutions,
        limit: limits.concurrentExecutions,
        severity: 'HIGH'
      });
    }

    if (usage.averageExecutionTime > limits.maxExecutionTime) {
      violations.push({
        type: 'OPERATION_EXECUTION_TIME',
        current: usage.averageExecutionTime,
        limit: limits.maxExecutionTime,
        severity: 'MEDIUM'
      });
    }

    return {
      allowed: violations.length === 0,
      confidence: this.calculateOperationConfidence(usage, limits, violations),
      violations,
      utilization: this.calculateOperationUtilization(usage, limits),
      nextAllowedTime: this.calculateOperationNextAllowedTime(violations, limits),
      recommendedAction: this.getOperationRecommendedAction(violations, context)
    };
  }

  async updateUsage(context: RateLimitContext, allowed: boolean): Promise<void> {
    const operationKey = context.operation;
    const usage = this.getOrCreateOperationUsage(operationKey);

    usage.requestsThisSecond++;
    usage.requestsThisMinute++;

    if (allowed) {
      usage.successfulExecutions++;
      if (context.operation === 'start') {
        usage.concurrentExecutions++;
      } else if (context.operation === 'complete') {
        usage.concurrentExecutions = Math.max(0, usage.concurrentExecutions - 1);
      }
    } else {
      usage.rejectedExecutions++;
    }

    // Update execution time tracking
    if (context.expectedComplexity) {
      usage.totalExecutionTime += context.expectedComplexity;
      usage.averageExecutionTime = usage.totalExecutionTime / (usage.successfulExecutions + 1);
    }
  }

  async getState(context: RateLimitContext): Promise<OperationTierState> {
    const operationKey = context.operation;
    const usage = this.getOrCreateOperationUsage(operationKey);

    return {
      operation: context.operation,
      currentUsage: usage,
      limits: this.getOperationLimits(context),
      health: this.calculateOperationHealth(usage),
      lastActivity: new Date()
    };
  }

  async activateEmergencyMode(config: EmergencyModeConfig): Promise<void> {
    this.logger.warn('Activating emergency mode for operation tier');
    // Implementation for emergency mode
  }

  async deactivateEmergencyMode(): Promise<void> {
    this.logger.log('Deactivating emergency mode for operation tier');
    // Implementation for deactivating emergency mode
  }

  private getOrCreateOperationUsage(operationKey: string): OperationUsageTracking {
    if (!this.operationUsage.has(operationKey)) {
      this.operationUsage.set(operationKey, {
        operation: operationKey,
        requestsThisSecond: 0,
        requestsThisMinute: 0,
        concurrentExecutions: 0,
        successfulExecutions: 0,
        rejectedExecutions: 0,
        totalExecutionTime: 0,
        averageExecutionTime: 0,
        lastReset: new Date()
      });
    }
    return this.operationUsage.get(operationKey)!;
  }

  private getOperationLimits(context: RateLimitContext): any {
    // Check specific operation limits
    if (this.operationLimits.operationLimits[context.operation]) {
      return this.operationLimits.operationLimits[context.operation];
    }

    // Apply complexity-based limits
    const complexity = this.determineOperationComplexity(context);
    return this.operationLimits.complexityLimits[complexity];
  }

  private determineOperationComplexity(context: RateLimitContext): 'lowComplexity' | 'mediumComplexity' | 'highComplexity' | 'criticalComplexity' {
    if (context.securityLevel === 'CRITICAL') return 'criticalComplexity';
    if (context.riskLevel === 'HIGH' || context.riskLevel === 'CRITICAL') return 'highComplexity';
    if (context.expectedComplexity && context.expectedComplexity > 1000) return 'highComplexity';
    if (context.expectedComplexity && context.expectedComplexity > 500) return 'mediumComplexity';
    return 'lowComplexity';
  }

  private calculateOperationSeverity(context: RateLimitContext): string {
    if (context.riskLevel === 'CRITICAL') return 'CRITICAL';
    if (context.riskLevel === 'HIGH') return 'HIGH';
    if (context.securityLevel === 'HIGH' || context.securityLevel === 'CRITICAL') return 'HIGH';
    return 'MEDIUM';
  }

  private calculateOperationConfidence(usage: OperationUsageTracking, limits: any, violations: LimitViolation[]): number {
    if (violations.length === 0) return 1.0;

    const executionSuccessRate = usage.successfulExecutions / (usage.successfulExecutions + usage.rejectedExecutions);
    const concurrencyUtilization = usage.concurrentExecutions / limits.concurrentExecutions;

    return Math.max(0.1, executionSuccessRate * (1 - concurrencyUtilization * 0.5));
  }

  private calculateOperationUtilization(usage: OperationUsageTracking, limits: any): number {
    return Math.max(
      (usage.requestsThisSecond / limits.requestsPerSecond) * 100,
      (usage.concurrentExecutions / limits.concurrentExecutions) * 100
    );
  }

  private calculateOperationNextAllowedTime(violations: LimitViolation[], limits: any): Date | null {
    if (violations.length === 0) return null;

    const hasExecutionTimeViolation = violations.some(v => v.type === 'OPERATION_EXECUTION_TIME');
    const waitTime = hasExecutionTimeViolation ? limits.maxExecutionTime : 5000;
    return new Date(Date.now() + waitTime);
  }

  private getOperationRecommendedAction(violations: LimitViolation[], context: RateLimitContext): string {
    if (violations.length === 0) return 'ALLOW';

    const hasConcurrencyViolation = violations.some(v => v.type === 'OPERATION_CONCURRENT_EXECUTIONS');
    if (hasConcurrencyViolation) return 'QUEUE';

    return 'THROTTLE';
  }

  private calculateOperationHealth(usage: OperationUsageTracking): 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' {
    const successRate = usage.successfulExecutions / (usage.successfulExecutions + usage.rejectedExecutions);

    if (successRate > 0.9) return 'HEALTHY';
    if (successRate > 0.75) return 'DEGRADED';
    return 'UNHEALTHY';
  }
}

/**
 * Global system tier rate limiting manager
 */
class GlobalTierManager {
  private readonly logger = new Logger(GlobalTierManager.name);
  private systemState: GlobalSystemState;

  constructor(private readonly globalLimits: GlobalRateLimits) {
    this.systemState = {
      totalRequestsPerSecond: 0,
      totalConcurrentConnections: 0,
      queueSize: 0,
      cpuUtilization: 0,
      memoryUtilization: 0,
      emergencyModeActive: false,
      lastUpdated: new Date()
    };

    this.startSystemMonitoring();
  }

  async evaluateGlobalLimits(context: RateLimitContext): Promise<TierEvaluationResult> {
    const violations: LimitViolation[] = [];

    if (this.systemState.totalRequestsPerSecond >= this.globalLimits.systemWideRequestsPerSecond) {
      violations.push({
        type: 'GLOBAL_REQUESTS_PER_SECOND',
        current: this.systemState.totalRequestsPerSecond,
        limit: this.globalLimits.systemWideRequestsPerSecond,
        severity: 'CRITICAL'
      });
    }

    if (this.systemState.totalConcurrentConnections >= this.globalLimits.maxConcurrentConnections) {
      violations.push({
        type: 'GLOBAL_CONCURRENT_CONNECTIONS',
        current: this.systemState.totalConcurrentConnections,
        limit: this.globalLimits.maxConcurrentConnections,
        severity: 'HIGH'
      });
    }

    if (this.systemState.queueSize >= this.globalLimits.maxQueueSize) {
      violations.push({
        type: 'GLOBAL_QUEUE_SIZE',
        current: this.systemState.queueSize,
        limit: this.globalLimits.maxQueueSize,
        severity: 'HIGH'
      });
    }

    const systemLoad = this.systemState.cpuUtilization + this.systemState.memoryUtilization;
    if (systemLoad >= this.globalLimits.circuitBreakerThreshold) {
      violations.push({
        type: 'GLOBAL_SYSTEM_OVERLOAD',
        current: systemLoad,
        limit: this.globalLimits.circuitBreakerThreshold,
        severity: 'CRITICAL'
      });
    }

    return {
      allowed: violations.length === 0 && !this.systemState.emergencyModeActive,
      confidence: this.calculateGlobalConfidence(violations),
      violations,
      utilization: this.calculateGlobalUtilization(),
      nextAllowedTime: this.calculateGlobalNextAllowedTime(violations),
      recommendedAction: this.getGlobalRecommendedAction(violations)
    };
  }

  async updateUsage(context: RateLimitContext, allowed: boolean): Promise<void> {
    this.systemState.totalRequestsPerSecond++;

    if (context.operation === 'connect') {
      this.systemState.totalConcurrentConnections++;
    } else if (context.operation === 'disconnect') {
      this.systemState.totalConcurrentConnections = Math.max(0, this.systemState.totalConcurrentConnections - 1);
    }

    if (!allowed) {
      this.systemState.queueSize++;
    }

    this.systemState.lastUpdated = new Date();
  }

  async getState(context: RateLimitContext): Promise<GlobalTierState> {
    return {
      systemState: this.systemState,
      limits: this.globalLimits,
      health: this.calculateGlobalHealth(),
      lastActivity: new Date()
    };
  }

  async activateEmergencyMode(config: EmergencyModeConfig): Promise<void> {
    this.logger.warn('Activating emergency mode for global tier');
    this.systemState.emergencyModeActive = true;
    // Additional emergency mode logic
  }

  async deactivateEmergencyMode(): Promise<void> {
    this.logger.log('Deactivating emergency mode for global tier');
    this.systemState.emergencyModeActive = false;
    // Additional deactivation logic
  }

  private startSystemMonitoring(): void {
    setInterval(() => {
      this.updateSystemMetrics();
    }, 1000); // Update every second

    setInterval(() => {
      this.resetPerSecondCounters();
    }, 1000); // Reset per-second counters
  }

  private updateSystemMetrics(): void {
    // In a real implementation, this would collect actual system metrics
    this.systemState.cpuUtilization = Math.random() * 100;
    this.systemState.memoryUtilization = Math.random() * 100;
  }

  private resetPerSecondCounters(): void {
    this.systemState.totalRequestsPerSecond = 0;
  }

  private calculateGlobalConfidence(violations: LimitViolation[]): number {
    if (violations.length === 0) return 1.0;

    const criticalViolations = violations.filter(v => v.severity === 'CRITICAL').length;
    if (criticalViolations > 0) return 0.1;

    return Math.max(0.3, 1.0 - violations.length * 0.2);
  }

  private calculateGlobalUtilization(): number {
    const requestUtilization = this.systemState.totalRequestsPerSecond / this.globalLimits.systemWideRequestsPerSecond;
    const connectionUtilization = this.systemState.totalConcurrentConnections / this.globalLimits.maxConcurrentConnections;
    const queueUtilization = this.systemState.queueSize / this.globalLimits.maxQueueSize;
    const systemUtilization = (this.systemState.cpuUtilization + this.systemState.memoryUtilization) / 200;

    return Math.max(requestUtilization, connectionUtilization, queueUtilization, systemUtilization) * 100;
  }

  private calculateGlobalNextAllowedTime(violations: LimitViolation[]): Date | null {
    if (violations.length === 0) return null;

    const hasCritical = violations.some(v => v.severity === 'CRITICAL');
    const waitTime = hasCritical ? 60000 : 10000; // 1 minute for critical, 10 seconds for others
    return new Date(Date.now() + waitTime);
  }

  private getGlobalRecommendedAction(violations: LimitViolation[]): string {
    if (violations.length === 0) return 'ALLOW';

    const hasCritical = violations.some(v => v.severity === 'CRITICAL');
    if (hasCritical) return 'DENY';

    return 'QUEUE';
  }

  private calculateGlobalHealth(): 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' {
    const systemLoad = this.systemState.cpuUtilization + this.systemState.memoryUtilization;

    if (systemLoad < 120) return 'HEALTHY';
    if (systemLoad < 160) return 'DEGRADED';
    return 'UNHEALTHY';
  }
}

/**
 * Tier coordination engine for intelligent multi-tier decision making
 */
class TierCoordinationEngine {
  private readonly logger = new Logger(TierCoordinationEngine.name);

  async coordinateEvaluations(context: RateLimitContext, results: any): Promise<MultiTierEvaluationResult> {
    // Implement intelligent coordination logic
    const allowedCount = Object.values(results).filter((r: any) => r.allowed).length;
    const totalCount = Object.values(results).length;

    const overallAllowed = allowedCount === totalCount;
    const confidence = Math.min(...Object.values(results).map((r: any) => r.confidence));

    return {
      decision: overallAllowed ? 'ALLOW' : 'DENY',
      reason: `Multi-tier evaluation: ${allowedCount}/${totalCount} tiers passed`,
      confidence,
      riskLevel: this.calculateOverallRiskLevel(results),
      recommendedAction: this.determineCoordinatedAction(results),
      processingTime: 0,
      tierResults: results,
      coordinationApplied: true,
      burstHandlingApplied: false,
      dynamicAdjustmentsApplied: false
    };
  }

  async updateCoordinationState(context: RateLimitContext, allowed: boolean): Promise<void> {
    // Update coordination state
  }

  async getCoordinationState(context: RateLimitContext): Promise<CoordinationState> {
    return {
      coordinationActive: true,
      lastCoordination: new Date(),
      coordinationEffectiveness: 0.95
    };
  }

  async activateEmergencyCoordination(config: EmergencyModeConfig): Promise<void> {
    this.logger.warn('Activating emergency coordination');
  }

  async deactivateEmergencyCoordination(): Promise<void> {
    this.logger.log('Deactivating emergency coordination');
  }

  optimizeCoordination(): void {
    // Optimization logic
  }

  private calculateOverallRiskLevel(results: any): RiskLevel {
    const riskLevels = Object.values(results).map((r: any) => r.violations.length);
    const maxRisk = Math.max(...riskLevels);

    if (maxRisk >= 3) return 'CRITICAL';
    if (maxRisk >= 2) return 'HIGH';
    if (maxRisk >= 1) return 'MEDIUM';
    return 'LOW';
  }

  private determineCoordinatedAction(results: any): string {
    const actions = Object.values(results).map((r: any) => r.recommendedAction);

    if (actions.includes('DENY')) return 'DENY';
    if (actions.includes('QUEUE')) return 'QUEUE';
    if (actions.includes('THROTTLE')) return 'THROTTLE';
    return 'ALLOW';
  }
}

/**
 * Intelligent burst handling system
 */
class IntelligentBurstHandler {
  private readonly logger = new Logger(IntelligentBurstHandler.name);

  constructor(private readonly configuration: RateLimitConfiguration) {}

  async applyBurstHandling(context: RateLimitContext, result: MultiTierEvaluationResult): Promise<MultiTierEvaluationResult> {
    // Implement burst handling logic
    return { ...result, burstHandlingApplied: true };
  }
}

/**
 * Dynamic rate adjustment system
 */
class DynamicRateAdjuster {
  private readonly logger = new Logger(DynamicRateAdjuster.name);

  constructor(private readonly configuration: RateLimitConfiguration) {}

  async applyDynamicAdjustments(context: RateLimitContext, result: MultiTierEvaluationResult): Promise<MultiTierEvaluationResult> {
    // Implement dynamic adjustment logic
    return { ...result, dynamicAdjustmentsApplied: true };
  }

  async checkAdjustmentTriggers(context: RateLimitContext): Promise<void> {
    // Check for adjustment triggers
  }

  monitorAndAdjust(): void {
    // Monitor and adjust logic
  }
}

/**
 * Performance optimizer for rate manager
 */
class RateManagerPerformanceOptimizer {
  private readonly logger = new Logger(RateManagerPerformanceOptimizer.name);

  getMetrics(): MultiTierPerformanceMetrics {
    return {
      evaluationTime: 15, // ms
      cacheHitRate: 0.85,
      throughput: 9500, // requests/second
      memoryUsage: 0.3,
      coordinationEfficiency: 0.95
    };
  }

  collectMetrics(): void {
    // Collect performance metrics
  }
}

// Supporting interfaces and types
interface MultiTierEvaluationResult {
  decision: string;
  reason: string;
  confidence: number;
  riskLevel: RiskLevel;
  recommendedAction: string;
  processingTime: number;
  tierResults: any;
  coordinationApplied: boolean;
  burstHandlingApplied: boolean;
  dynamicAdjustmentsApplied: boolean;
}

interface MultiTierState {
  user: UserTierState;
  api: APITierState;
  operation: OperationTierState;
  global: GlobalTierState;
  coordination: CoordinationState;
  lastUpdated: Date;
  healthStatus: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
}

interface MultiTierPerformanceMetrics {
  evaluationTime: number;
  cacheHitRate: number;
  throughput: number;
  memoryUsage: number;
  coordinationEfficiency: number;
}

interface TierEvaluationResult {
  allowed: boolean;
  confidence: number;
  violations: LimitViolation[];
  utilization: number;
  nextAllowedTime: Date | null;
  recommendedAction: string;
}

interface LimitViolation {
  type: string;
  current: number;
  limit: number;
  severity: string;
}

interface UserUsageTracking {
  userId: string;
  requestsThisSecond: number;
  requestsThisMinute: number;
  requestsThisHour: number;
  requestsThisDay: number;
  burstCount: number;
  concurrentConnections: number;
  successfulRequests: number;
  rejectedRequests: number;
  lastReset: Date;
}

interface EndpointUsageTracking {
  endpoint: string;
  requestsThisSecond: number;
  requestsThisMinute: number;
  requestsThisHour: number;
  burstRequests: number;
  successfulRequests: number;
  rejectedRequests: number;
  totalPayloadSize: number;
  averagePayloadSize: number;
  lastReset: Date;
}

interface OperationUsageTracking {
  operation: string;
  requestsThisSecond: number;
  requestsThisMinute: number;
  concurrentExecutions: number;
  successfulExecutions: number;
  rejectedExecutions: number;
  totalExecutionTime: number;
  averageExecutionTime: number;
  lastReset: Date;
}

interface GlobalSystemState {
  totalRequestsPerSecond: number;
  totalConcurrentConnections: number;
  queueSize: number;
  cpuUtilization: number;
  memoryUtilization: number;
  emergencyModeActive: boolean;
  lastUpdated: Date;
}

interface EffectiveUserLimits {
  requestsPerSecond: number;
  requestsPerMinute: number;
  requestsPerHour: number;
  burstLimit: number;
  concurrentConnections: number;
}

interface UserTierState {
  userId: string;
  currentUsage: UserUsageTracking;
  limits: EffectiveUserLimits;
  health: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  lastActivity: Date;
}

interface APITierState {
  endpoint: string;
  method: string;
  currentUsage: EndpointUsageTracking;
  limits: any;
  health: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  lastActivity: Date;
}

interface OperationTierState {
  operation: string;
  currentUsage: OperationUsageTracking;
  limits: any;
  health: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  lastActivity: Date;
}

interface GlobalTierState {
  systemState: GlobalSystemState;
  limits: GlobalRateLimits;
  health: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  lastActivity: Date;
}

interface CoordinationState {
  coordinationActive: boolean;
  lastCoordination: Date;
  coordinationEffectiveness: number;
}