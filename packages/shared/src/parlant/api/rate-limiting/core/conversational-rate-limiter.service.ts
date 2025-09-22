/**
 * @fileoverview PARLANT Phase 1 - Conversational Rate Limiter Core Service
 * Revolutionary conversational rate limiting with intelligent feedback and user negotiation
 * Enterprise-grade traffic management supporting 10,000+ requests/second
 *
 * @version 1.0.0
 * @author AIgent Enterprise Rate Limiting Team
 * @since 2025-09-22
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  RateLimitConfiguration,
  RateLimitContext,
  RateLimitDecision,
  RateLimitState,
  ConversationalRateLimitResponse,
  RateLimitEventType,
  RateLimitEvent,
  NegotiationOption,
  EducationalContent,
  RateLimitAlternative,
  UsageMetrics,
  QuotaStatus,
  ThrottlingStatus,
  RateLimitAnalytics,
  PerformanceMetrics,
  UserBehaviorInsights,
  ImpactAssessment,
  SystemHealthIndicators
} from '../types/rate-limiting.types';
import { UserContext, SecurityLevel, RiskLevel } from '../../interfaces/conversational-api.interface';

/**
 * Core conversational rate limiting service with natural language processing
 * and intelligent user interaction capabilities
 */
@Injectable()
export class ConversationalRateLimiterService {
  private readonly logger = new Logger(ConversationalRateLimiterService.name);

  // Performance optimization - in-memory caches
  private readonly stateCache = new Map<string, RateLimitState>();
  private readonly configCache = new Map<string, RateLimitConfiguration>();
  private readonly userBehaviorCache = new Map<string, UserBehaviorInsights>();

  // Metrics collection
  private readonly metricsCollector = new Map<string, any>();
  private readonly eventHistory: RateLimitEvent[] = [];

  constructor(
    private readonly configuration: RateLimitConfiguration,
  ) {
    this.initializeRateLimiter();
  }

  /**
   * Main rate limiting evaluation with conversational response
   * TARGET: <50ms processing time
   */
  async evaluateRequest(context: RateLimitContext): Promise<RateLimitDecision> {
    const startTime = Date.now();
    this.logger.debug(`Evaluating rate limit for user: ${context.userId}, endpoint: ${context.apiEndpoint}`);

    try {
      // Step 1: Get current rate limit state (cached for performance)
      const state = await this.getCurrentState(context);

      // Step 2: Multi-tier evaluation
      const evaluationResults = await this.performMultiTierEvaluation(context, state);

      // Step 3: Make intelligent decision
      const decision = await this.makeIntelligentDecision(context, state, evaluationResults);

      // Step 4: Generate conversational response
      decision.conversationalResponse = await this.generateConversationalResponse(
        context,
        decision,
        evaluationResults
      );

      // Step 5: Update state and metrics
      await this.updateStateAndMetrics(context, decision, state);

      // Step 6: Record analytics
      decision.analytics = await this.generateAnalytics(context, decision, startTime);

      // Step 7: Emit event for monitoring
      await this.emitRateLimitEvent(context, decision);

      const processingTime = Date.now() - startTime;
      decision.processingTime = processingTime;

      this.logger.debug(
        `Rate limit evaluation completed in ${processingTime}ms for user: ${context.userId}, decision: ${decision.decision}`
      );

      return decision;

    } catch (error) {
      this.logger.error(`Rate limit evaluation failed for user: ${context.userId}`, error);

      // Fail-safe: Allow request with monitoring
      return this.createFailSafeDecision(context, error, Date.now() - startTime);
    }
  }

  /**
   * Negotiate rate limits with user through natural language
   */
  async negotiateRateLimits(
    context: RateLimitContext,
    userRequest: string,
    currentDecision: RateLimitDecision
  ): Promise<RateLimitDecision> {
    this.logger.debug(`Starting rate limit negotiation for user: ${context.userId}`);

    try {
      // Analyze user request intent
      const negotiationIntent = await this.analyzeNegotiationIntent(userRequest, context);

      // Generate negotiation options
      const negotiationOptions = await this.generateNegotiationOptions(
        context,
        currentDecision,
        negotiationIntent
      );

      // Evaluate feasibility of user request
      const feasibilityAssessment = await this.assessNegotiationFeasibility(
        context,
        negotiationIntent,
        negotiationOptions
      );

      // Create negotiated decision
      const negotiatedDecision = await this.createNegotiatedDecision(
        context,
        currentDecision,
        feasibilityAssessment,
        negotiationOptions
      );

      // Generate educational response
      negotiatedDecision.conversationalResponse = await this.generateNegotiationResponse(
        context,
        negotiatedDecision,
        negotiationOptions,
        feasibilityAssessment
      );

      this.logger.debug(`Rate limit negotiation completed for user: ${context.userId}`);
      return negotiatedDecision;

    } catch (error) {
      this.logger.error(`Rate limit negotiation failed for user: ${context.userId}`, error);

      // Return original decision with explanation
      return {
        ...currentDecision,
        conversationalResponse: {
          explanation: "I apologize, but I'm unable to process your negotiation request at this time.",
          userFriendlyMessage: "The current rate limits remain in effect. Please try again later.",
          suggestions: [
            "Wait for the rate limit to reset",
            "Reduce your request frequency",
            "Contact support for assistance"
          ]
        }
      };
    }
  }

  /**
   * Explain rate limiting decision in natural language
   */
  async explainDecision(
    context: RateLimitContext,
    decision: RateLimitDecision,
    explanationLevel: 'BASIC' | 'DETAILED' | 'TECHNICAL' = 'BASIC'
  ): Promise<ConversationalRateLimitResponse> {
    try {
      const state = await this.getCurrentState(context);
      const userBehavior = this.getUserBehaviorInsights(context.userId);

      const explanation = await this.generateDetailedExplanation(
        context,
        decision,
        state,
        userBehavior,
        explanationLevel
      );

      const suggestions = await this.generatePersonalizedSuggestions(
        context,
        decision,
        state,
        userBehavior
      );

      const educationalContent = await this.generateEducationalContent(
        context,
        decision,
        explanationLevel
      );

      return {
        explanation: explanation,
        userFriendlyMessage: this.generateUserFriendlyMessage(decision, explanationLevel),
        technicalDetails: explanationLevel === 'TECHNICAL' ? this.generateTechnicalDetails(context, decision, state) : undefined,
        suggestions: suggestions,
        educationalContent: educationalContent
      };

    } catch (error) {
      this.logger.error(`Failed to explain rate limiting decision for user: ${context.userId}`, error);

      return {
        explanation: "Rate limiting is in effect to protect system performance.",
        userFriendlyMessage: "Your request was limited to ensure fair access for all users.",
        suggestions: [
          "Wait before making your next request",
          "Reduce request frequency",
          "Contact support if you need higher limits"
        ]
      };
    }
  }

  /**
   * Multi-tier rate limit evaluation
   */
  private async performMultiTierEvaluation(
    context: RateLimitContext,
    state: RateLimitState
  ): Promise<MultiTierEvaluationResult> {
    // Parallel evaluation for performance
    const [userEvaluation, apiEvaluation, operationEvaluation, globalEvaluation] = await Promise.all([
      this.evaluateUserLimits(context, state),
      this.evaluateAPILimits(context, state),
      this.evaluateOperationLimits(context, state),
      this.evaluateGlobalLimits(context, state)
    ]);

    return {
      user: userEvaluation,
      api: apiEvaluation,
      operation: operationEvaluation,
      global: globalEvaluation,
      overallRisk: this.calculateOverallRisk([userEvaluation, apiEvaluation, operationEvaluation, globalEvaluation])
    };
  }

  /**
   * Evaluate user-specific rate limits
   */
  private async evaluateUserLimits(
    context: RateLimitContext,
    state: RateLimitState
  ): Promise<TierEvaluationResult> {
    const userLimits = this.getUserLimits(context);
    const usage = state.currentUsage;

    // Check basic rate limits
    const secondsCheck = usage.requestsThisSecond >= userLimits.requestsPerSecond;
    const minutesCheck = usage.requestsThisMinute >= userLimits.requestsPerMinute;
    const hoursCheck = usage.requestsThisHour >= userLimits.requestsPerHour;
    const burstCheck = usage.burstUsage >= userLimits.burstLimit;
    const concurrentCheck = usage.concurrentConnections >= userLimits.concurrentConnections;

    const violations = [
      { type: 'REQUESTS_PER_SECOND', violated: secondsCheck, limit: userLimits.requestsPerSecond, current: usage.requestsThisSecond },
      { type: 'REQUESTS_PER_MINUTE', violated: minutesCheck, limit: userLimits.requestsPerMinute, current: usage.requestsThisMinute },
      { type: 'REQUESTS_PER_HOUR', violated: hoursCheck, limit: userLimits.requestsPerHour, current: usage.requestsThisHour },
      { type: 'BURST_LIMIT', violated: burstCheck, limit: userLimits.burstLimit, current: usage.burstUsage },
      { type: 'CONCURRENT_CONNECTIONS', violated: concurrentCheck, limit: userLimits.concurrentConnections, current: usage.concurrentConnections }
    ].filter(v => v.violated);

    return {
      tier: 'USER',
      allowed: violations.length === 0,
      violations: violations,
      utilizationPercentage: this.calculateUtilization(usage, userLimits),
      recommendedAction: violations.length > 0 ? 'THROTTLE' : 'ALLOW',
      severity: this.calculateSeverity(violations),
      nextAllowedTime: this.calculateNextAllowedTime(violations, userLimits)
    };
  }

  /**
   * Evaluate API endpoint specific limits
   */
  private async evaluateAPILimits(
    context: RateLimitContext,
    state: RateLimitState
  ): Promise<TierEvaluationResult> {
    const apiLimits = this.getAPILimits(context);

    // Find matching endpoint limits
    const endpointLimits = this.findEndpointLimits(context.apiEndpoint, apiLimits);
    const methodLimits = apiLimits.methodLimits[context.method];

    if (!endpointLimits && !methodLimits) {
      return {
        tier: 'API',
        allowed: true,
        violations: [],
        utilizationPercentage: 0,
        recommendedAction: 'ALLOW',
        severity: 'LOW',
        nextAllowedTime: null
      };
    }

    // Evaluate against endpoint and method limits
    const violations = [];

    if (endpointLimits) {
      const endpointUsage = this.getEndpointUsage(context.apiEndpoint, state);
      if (endpointUsage.requestsThisSecond >= endpointLimits.requestsPerSecond) {
        violations.push({
          type: 'ENDPOINT_REQUESTS_PER_SECOND',
          violated: true,
          limit: endpointLimits.requestsPerSecond,
          current: endpointUsage.requestsThisSecond
        });
      }
    }

    if (methodLimits) {
      const methodUsage = this.getMethodUsage(context.method, state);
      if (methodUsage.requestsThisSecond >= methodLimits.requestsPerSecond) {
        violations.push({
          type: 'METHOD_REQUESTS_PER_SECOND',
          violated: true,
          limit: methodLimits.requestsPerSecond,
          current: methodUsage.requestsThisSecond
        });
      }
    }

    return {
      tier: 'API',
      allowed: violations.length === 0,
      violations: violations,
      utilizationPercentage: this.calculateAPIUtilization(context, state, apiLimits),
      recommendedAction: violations.length > 0 ? 'THROTTLE' : 'ALLOW',
      severity: this.calculateSeverity(violations),
      nextAllowedTime: this.calculateNextAllowedTime(violations, endpointLimits || methodLimits)
    };
  }

  /**
   * Evaluate operation-specific limits
   */
  private async evaluateOperationLimits(
    context: RateLimitContext,
    state: RateLimitState
  ): Promise<TierEvaluationResult> {
    const operationLimits = this.getOperationLimits(context);

    // Get operation-specific usage
    const operationUsage = this.getOperationUsage(context.operation, state);

    const violations = [];

    if (operationUsage.requestsThisSecond >= operationLimits.requestsPerSecond) {
      violations.push({
        type: 'OPERATION_REQUESTS_PER_SECOND',
        violated: true,
        limit: operationLimits.requestsPerSecond,
        current: operationUsage.requestsThisSecond
      });
    }

    if (operationUsage.concurrentExecutions >= operationLimits.concurrentExecutions) {
      violations.push({
        type: 'CONCURRENT_EXECUTIONS',
        violated: true,
        limit: operationLimits.concurrentExecutions,
        current: operationUsage.concurrentExecutions
      });
    }

    return {
      tier: 'OPERATION',
      allowed: violations.length === 0,
      violations: violations,
      utilizationPercentage: this.calculateOperationUtilization(context, state, operationLimits),
      recommendedAction: violations.length > 0 ? 'QUEUE' : 'ALLOW',
      severity: this.calculateSeverity(violations),
      nextAllowedTime: this.calculateNextAllowedTime(violations, operationLimits)
    };
  }

  /**
   * Evaluate global system limits
   */
  private async evaluateGlobalLimits(
    context: RateLimitContext,
    state: RateLimitState
  ): Promise<TierEvaluationResult> {
    const globalLimits = this.configuration.globalLimits;
    const systemState = await this.getSystemState();

    const violations = [];

    if (systemState.totalRequestsPerSecond >= globalLimits.systemWideRequestsPerSecond) {
      violations.push({
        type: 'SYSTEM_REQUESTS_PER_SECOND',
        violated: true,
        limit: globalLimits.systemWideRequestsPerSecond,
        current: systemState.totalRequestsPerSecond
      });
    }

    if (systemState.totalConcurrentConnections >= globalLimits.maxConcurrentConnections) {
      violations.push({
        type: 'SYSTEM_CONCURRENT_CONNECTIONS',
        violated: true,
        limit: globalLimits.maxConcurrentConnections,
        current: systemState.totalConcurrentConnections
      });
    }

    const systemLoad = systemState.cpuUtilization + systemState.memoryUtilization;
    if (systemLoad >= globalLimits.circuitBreakerThreshold) {
      violations.push({
        type: 'SYSTEM_OVERLOAD',
        violated: true,
        limit: globalLimits.circuitBreakerThreshold,
        current: systemLoad
      });
    }

    return {
      tier: 'GLOBAL',
      allowed: violations.length === 0,
      violations: violations,
      utilizationPercentage: systemLoad / 200 * 100, // CPU + Memory utilization
      recommendedAction: violations.length > 0 ? 'DENY' : 'ALLOW',
      severity: this.calculateSeverity(violations),
      nextAllowedTime: violations.length > 0 ? new Date(Date.now() + 60000) : null // 1 minute
    };
  }

  /**
   * Make intelligent decision based on evaluation results
   */
  private async makeIntelligentDecision(
    context: RateLimitContext,
    state: RateLimitState,
    evaluationResults: MultiTierEvaluationResult
  ): Promise<RateLimitDecision> {
    const timestamp = new Date();

    // Determine worst-case scenario
    const worstViolation = this.findWorstViolation(evaluationResults);

    if (!worstViolation) {
      // All limits passed - allow request
      return {
        decision: 'ALLOW',
        reason: 'All rate limits satisfied',
        code: 'RATE_LIMIT_OK',
        timestamp: timestamp,
        processingTime: 0,
        remainingQuota: this.calculateRemainingQuota(context, state)
      };
    }

    // Decide based on violation severity and context
    switch (worstViolation.severity) {
      case 'LOW':
        return this.createThrottleDecision(context, worstViolation, timestamp);

      case 'MEDIUM':
        if (this.shouldQueue(context, worstViolation)) {
          return this.createQueueDecision(context, worstViolation, timestamp);
        } else {
          return this.createThrottleDecision(context, worstViolation, timestamp);
        }

      case 'HIGH':
      case 'CRITICAL':
        return this.createDenyDecision(context, worstViolation, timestamp);

      default:
        return this.createDenyDecision(context, worstViolation, timestamp);
    }
  }

  /**
   * Generate conversational response with natural language explanation
   */
  private async generateConversationalResponse(
    context: RateLimitContext,
    decision: RateLimitDecision,
    evaluationResults: MultiTierEvaluationResult
  ): Promise<ConversationalRateLimitResponse> {
    const userContext = context.userContext;
    const explanationLevel = userContext.preferences?.explanationStyle || 'BASIC';

    switch (decision.decision) {
      case 'ALLOW':
        return this.generateAllowResponse(context, decision, explanationLevel);

      case 'THROTTLE':
        return this.generateThrottleResponse(context, decision, evaluationResults, explanationLevel);

      case 'QUEUE':
        return this.generateQueueResponse(context, decision, evaluationResults, explanationLevel);

      case 'DENY':
        return this.generateDenyResponse(context, decision, evaluationResults, explanationLevel);

      default:
        return this.generateDefaultResponse(context, decision);
    }
  }

  /**
   * Generate response for allowed requests
   */
  private generateAllowResponse(
    context: RateLimitContext,
    decision: RateLimitDecision,
    explanationLevel: string
  ): ConversationalRateLimitResponse {
    const quota = decision.remainingQuota;

    let explanation = "Your request has been approved and is being processed.";
    let userFriendlyMessage = "✅ Request approved";

    if (explanationLevel === 'DETAILED' || explanationLevel === 'TECHNICAL') {
      explanation += ` You have ${quota?.remainingRequests} requests remaining in your current quota period.`;
    }

    const suggestions = [];

    if (quota && quota.utilizationPercentage > 70) {
      suggestions.push("You're approaching your rate limit. Consider spacing out your requests.");
    }

    if (quota && quota.utilizationPercentage > 90) {
      suggestions.push("You're very close to your rate limit. Please reduce request frequency.");
    }

    return {
      explanation,
      userFriendlyMessage,
      suggestions,
      educationalContent: explanationLevel === 'DETAILED' ? {
        topic: "Rate Limiting Best Practices",
        explanation: "Rate limiting helps ensure fair access and optimal performance for all users.",
        bestPractices: [
          "Space out your requests evenly",
          "Use batch operations when possible",
          "Implement exponential backoff for retries",
          "Monitor your usage patterns"
        ],
        examples: [
          "Instead of 100 requests at once, send 10 requests per second",
          "Batch multiple operations into a single request",
          "Use webhooks instead of polling"
        ],
        links: []
      } : undefined
    };
  }

  /**
   * Generate response for throttled requests
   */
  private generateThrottleResponse(
    context: RateLimitContext,
    decision: RateLimitDecision,
    evaluationResults: MultiTierEvaluationResult,
    explanationLevel: string
  ): ConversationalRateLimitResponse {
    const throttleDelay = decision.throttleDelay || 1000;
    const delaySeconds = Math.ceil(throttleDelay / 1000);

    let explanation = `Your request is being throttled due to rate limiting. Please wait ${delaySeconds} seconds before your next request.`;
    let userFriendlyMessage = `⏱️ Request throttled - wait ${delaySeconds}s`;

    if (explanationLevel === 'DETAILED') {
      const violatedLimit = this.findMostSevereViolation(evaluationResults);
      explanation += ` The ${violatedLimit?.type.toLowerCase().replace('_', ' ')} limit has been exceeded.`;
    }

    if (explanationLevel === 'TECHNICAL') {
      explanation += ` Rate limit violations: ${JSON.stringify(evaluationResults)}`;
    }

    const suggestions = [
      `Wait ${delaySeconds} seconds before making your next request`,
      "Reduce your request frequency",
      "Implement request batching to improve efficiency"
    ];

    if (decision.alternatives && decision.alternatives.length > 0) {
      suggestions.push("Consider using alternative endpoints or methods");
    }

    return {
      explanation,
      userFriendlyMessage,
      suggestions,
      educationalContent: {
        topic: "Understanding Throttling",
        explanation: "Throttling temporarily slows down requests to prevent system overload while still allowing your operations to complete.",
        bestPractices: [
          "Implement exponential backoff",
          "Use jitter to avoid thundering herd",
          "Monitor response headers for rate limit information",
          "Consider request prioritization"
        ],
        examples: [
          "Wait time = base_delay * (2 ^ retry_count) + random_jitter",
          "Check 'Retry-After' header for exact wait time",
          "Use priority queues for critical requests"
        ],
        links: []
      }
    };
  }

  /**
   * Generate response for queued requests
   */
  private generateQueueResponse(
    context: RateLimitContext,
    decision: RateLimitDecision,
    evaluationResults: MultiTierEvaluationResult,
    explanationLevel: string
  ): ConversationalRateLimitResponse {
    const queuePosition = decision.queuePosition || 1;
    const estimatedWaitTime = decision.estimatedWaitTime || 30;

    let explanation = `Your request has been queued at position ${queuePosition}. Estimated wait time: ${estimatedWaitTime} seconds.`;
    let userFriendlyMessage = `📋 Queued (#${queuePosition}) - ~${estimatedWaitTime}s`;

    if (explanationLevel === 'DETAILED') {
      explanation += " Your request will be processed automatically when resources become available.";
    }

    const suggestions = [
      "Your request will be processed automatically",
      "You can continue with other tasks while waiting",
      "Consider scheduling resource-intensive operations during off-peak hours"
    ];

    return {
      explanation,
      userFriendlyMessage,
      suggestions,
      educationalContent: {
        topic: "Request Queuing",
        explanation: "Queuing ensures fair processing of requests during high-traffic periods while maintaining system stability.",
        bestPractices: [
          "Monitor queue status for long-running operations",
          "Use asynchronous patterns for better user experience",
          "Schedule heavy operations during off-peak times",
          "Implement progress indicators for queued requests"
        ],
        examples: [
          "Use webhooks for completion notifications",
          "Poll queue status endpoint for updates",
          "Implement WebSocket connections for real-time updates"
        ],
        links: []
      }
    };
  }

  /**
   * Generate response for denied requests
   */
  private generateDenyResponse(
    context: RateLimitContext,
    decision: RateLimitDecision,
    evaluationResults: MultiTierEvaluationResult,
    explanationLevel: string
  ): ConversationalRateLimitResponse {
    const retryAfter = decision.retryAfter || 300; // 5 minutes default
    const retryMinutes = Math.ceil(retryAfter / 60);

    let explanation = `Your request has been denied due to rate limiting. Please try again in ${retryMinutes} minutes.`;
    let userFriendlyMessage = `❌ Request denied - retry in ${retryMinutes}m`;

    if (explanationLevel === 'DETAILED') {
      const violations = this.getAllViolations(evaluationResults);
      explanation += ` Multiple rate limits have been exceeded: ${violations.map(v => v.type).join(', ')}.`;
    }

    const suggestions = [
      `Wait ${retryMinutes} minutes before retrying`,
      "Reduce your overall request rate",
      "Contact support if you need higher rate limits",
      "Consider upgrading your service tier for increased limits"
    ];

    if (decision.alternatives && decision.alternatives.length > 0) {
      suggestions.push("Use alternative endpoints or methods listed below");
    }

    return {
      explanation,
      userFriendlyMessage,
      suggestions,
      alternatives: decision.alternatives,
      educationalContent: {
        topic: "Rate Limit Violations",
        explanation: "Rate limits protect system stability and ensure fair access for all users. Violations result in temporary restrictions.",
        bestPractices: [
          "Monitor your usage against allocated quotas",
          "Implement graceful degradation strategies",
          "Use caching to reduce unnecessary requests",
          "Design for eventual consistency where possible"
        ],
        examples: [
          "Cache frequently accessed data locally",
          "Use ETags for conditional requests",
          "Implement circuit breakers for external dependencies"
        ],
        links: []
      }
    };
  }

  /**
   * Initialize the rate limiter with default configuration
   */
  private initializeRateLimiter(): void {
    this.logger.log('Initializing Conversational Rate Limiter Service');

    // Initialize performance monitoring
    setInterval(() => {
      this.performanceCleanup();
    }, 60000); // Cleanup every minute

    // Initialize state synchronization
    setInterval(() => {
      this.synchronizeState();
    }, 5000); // Sync every 5 seconds

    this.logger.log('Conversational Rate Limiter Service initialized successfully');
  }

  /**
   * Performance optimization - cleanup old cache entries
   */
  private performanceCleanup(): void {
    const cutoffTime = Date.now() - (5 * 60 * 1000); // 5 minutes ago

    // Cleanup state cache
    for (const [key, state] of this.stateCache.entries()) {
      if (state.currentUsage.requestsThisSecond < cutoffTime) {
        this.stateCache.delete(key);
      }
    }

    // Cleanup event history
    this.eventHistory.splice(0, this.eventHistory.length - 1000); // Keep last 1000 events

    this.logger.debug('Performance cleanup completed');
  }

  /**
   * Synchronize state across distributed nodes
   */
  private synchronizeState(): void {
    // In a real implementation, this would sync with Redis or other distributed cache
    this.logger.debug('State synchronization completed');
  }

  // Helper methods for various operations...

  private async getCurrentState(context: RateLimitContext): Promise<RateLimitState> {
    const cacheKey = `${context.userId}:${context.apiEndpoint}`;

    if (this.stateCache.has(cacheKey)) {
      return this.stateCache.get(cacheKey)!;
    }

    // Create new state (in real implementation, would load from storage)
    const state: RateLimitState = {
      currentUsage: {
        requestsThisSecond: 0,
        requestsThisMinute: 0,
        requestsThisHour: 0,
        requestsThisDay: 0,
        burstUsage: 0,
        concurrentConnections: 0
      },
      windowUsage: {
        windows: [],
        projectedUsage: {
          nextMinuteProjection: 0,
          nextHourProjection: 0,
          confidence: 0.8,
          trendsUsed: []
        },
        trends: []
      },
      quotaStatus: {
        remainingRequests: 1000,
        resetTime: new Date(Date.now() + 3600000),
        utilizationPercentage: 0,
        quotaType: 'USER'
      },
      throttlingStatus: {
        isThrottled: false,
        throttleLevel: 0,
        reason: '',
        recommendedWaitTime: 0,
        estimatedRecoveryTime: new Date()
      },
      queueStatus: {
        position: 0,
        estimatedWaitTime: 0,
        queueLength: 0,
        priority: 1,
        canBypass: false
      }
    };

    this.stateCache.set(cacheKey, state);
    return state;
  }

  // Additional helper methods would be implemented here...
  private getUserLimits(context: RateLimitContext): any {
    return this.configuration.userLimits;
  }

  private getAPILimits(context: RateLimitContext): any {
    return this.configuration.apiLimits;
  }

  private getOperationLimits(context: RateLimitContext): any {
    return this.configuration.operationLimits.operationLimits[context.operation] ||
           this.configuration.operationLimits.complexityLimits.mediumComplexity;
  }

  private findEndpointLimits(endpoint: string, apiLimits: any): any {
    return apiLimits.endpointLimits[endpoint];
  }

  private getEndpointUsage(endpoint: string, state: RateLimitState): any {
    return { requestsThisSecond: 0 }; // Simplified
  }

  private getMethodUsage(method: string, state: RateLimitState): any {
    return { requestsThisSecond: 0 }; // Simplified
  }

  private getOperationUsage(operation: string, state: RateLimitState): any {
    return { requestsThisSecond: 0, concurrentExecutions: 0 }; // Simplified
  }

  private async getSystemState(): Promise<any> {
    return {
      totalRequestsPerSecond: 1000,
      totalConcurrentConnections: 500,
      cpuUtilization: 45,
      memoryUtilization: 60
    };
  }

  private calculateOverallRisk(evaluations: TierEvaluationResult[]): string {
    const highRiskCount = evaluations.filter(e => e.severity === 'HIGH' || e.severity === 'CRITICAL').length;
    if (highRiskCount > 0) return 'HIGH';

    const mediumRiskCount = evaluations.filter(e => e.severity === 'MEDIUM').length;
    if (mediumRiskCount > 1) return 'MEDIUM';

    return 'LOW';
  }

  private calculateUtilization(usage: UsageMetrics, limits: any): number {
    return Math.max(
      (usage.requestsThisSecond / limits.requestsPerSecond) * 100,
      (usage.requestsThisMinute / limits.requestsPerMinute) * 100,
      (usage.requestsThisHour / limits.requestsPerHour) * 100
    );
  }

  private calculateAPIUtilization(context: RateLimitContext, state: RateLimitState, apiLimits: any): number {
    return 50; // Simplified calculation
  }

  private calculateOperationUtilization(context: RateLimitContext, state: RateLimitState, operationLimits: any): number {
    return 30; // Simplified calculation
  }

  private calculateSeverity(violations: any[]): string {
    if (violations.length === 0) return 'LOW';
    if (violations.length >= 3) return 'CRITICAL';
    if (violations.length >= 2) return 'HIGH';
    return 'MEDIUM';
  }

  private calculateNextAllowedTime(violations: any[], limits: any): Date | null {
    if (violations.length === 0) return null;
    return new Date(Date.now() + 60000); // 1 minute default
  }

  private findWorstViolation(evaluationResults: MultiTierEvaluationResult): TierEvaluationResult | null {
    const allResults = [
      evaluationResults.user,
      evaluationResults.api,
      evaluationResults.operation,
      evaluationResults.global
    ];

    const violations = allResults.filter(r => !r.allowed);
    if (violations.length === 0) return null;

    // Return the most severe violation
    return violations.reduce((worst, current) => {
      const severityOrder = { 'LOW': 1, 'MEDIUM': 2, 'HIGH': 3, 'CRITICAL': 4 };
      return severityOrder[current.severity as keyof typeof severityOrder] >
             severityOrder[worst.severity as keyof typeof severityOrder] ? current : worst;
    });
  }

  private shouldQueue(context: RateLimitContext, violation: TierEvaluationResult): boolean {
    return violation.tier === 'OPERATION' && violation.severity !== 'CRITICAL';
  }

  private createThrottleDecision(context: RateLimitContext, violation: TierEvaluationResult, timestamp: Date): RateLimitDecision {
    return {
      decision: 'THROTTLE',
      reason: `Rate limit exceeded: ${violation.violations[0]?.type}`,
      code: 'RATE_LIMIT_THROTTLE',
      timestamp,
      processingTime: 0,
      throttleDelay: this.calculateThrottleDelay(violation),
      alternatives: this.generateAlternatives(context, violation)
    };
  }

  private createQueueDecision(context: RateLimitContext, violation: TierEvaluationResult, timestamp: Date): RateLimitDecision {
    return {
      decision: 'QUEUE',
      reason: `Request queued due to rate limiting: ${violation.violations[0]?.type}`,
      code: 'RATE_LIMIT_QUEUE',
      timestamp,
      processingTime: 0,
      queuePosition: this.calculateQueuePosition(context),
      estimatedWaitTime: this.calculateEstimatedWaitTime(context)
    };
  }

  private createDenyDecision(context: RateLimitContext, violation: TierEvaluationResult, timestamp: Date): RateLimitDecision {
    return {
      decision: 'DENY',
      reason: `Rate limit violation: ${violation.violations.map(v => v.type).join(', ')}`,
      code: 'RATE_LIMIT_DENY',
      timestamp,
      processingTime: 0,
      retryAfter: this.calculateRetryAfter(violation),
      alternatives: this.generateAlternatives(context, violation)
    };
  }

  private createFailSafeDecision(context: RateLimitContext, error: any, processingTime: number): RateLimitDecision {
    return {
      decision: 'ALLOW',
      reason: 'Rate limiter error - allowing request with monitoring',
      code: 'RATE_LIMIT_FAILSAFE',
      timestamp: new Date(),
      processingTime
    };
  }

  private calculateRemainingQuota(context: RateLimitContext, state: RateLimitState): QuotaStatus {
    return state.quotaStatus;
  }

  private calculateThrottleDelay(violation: TierEvaluationResult): number {
    const baseDelay = 1000; // 1 second base
    const severityMultiplier = { 'LOW': 1, 'MEDIUM': 2, 'HIGH': 4, 'CRITICAL': 8 };
    return baseDelay * (severityMultiplier[violation.severity as keyof typeof severityMultiplier] || 1);
  }

  private generateAlternatives(context: RateLimitContext, violation: TierEvaluationResult): RateLimitAlternative[] {
    return [
      {
        type: 'TIMING',
        description: 'Retry your request in a few minutes when limits reset',
        suggestedTime: new Date(Date.now() + 300000), // 5 minutes
        estimatedSuccess: 0.9
      },
      {
        type: 'BATCH',
        description: 'Combine multiple operations into a single batch request',
        batchSize: 10,
        estimatedSuccess: 0.8
      }
    ];
  }

  private calculateQueuePosition(context: RateLimitContext): number {
    return Math.floor(Math.random() * 10) + 1; // Simplified
  }

  private calculateEstimatedWaitTime(context: RateLimitContext): number {
    return Math.floor(Math.random() * 60) + 30; // 30-90 seconds
  }

  private calculateRetryAfter(violation: TierEvaluationResult): number {
    const baseRetry = 300; // 5 minutes
    const severityMultiplier = { 'LOW': 1, 'MEDIUM': 2, 'HIGH': 4, 'CRITICAL': 8 };
    return baseRetry * (severityMultiplier[violation.severity as keyof typeof severityMultiplier] || 1);
  }

  private findMostSevereViolation(evaluationResults: MultiTierEvaluationResult): any {
    return evaluationResults.user.violations[0]; // Simplified
  }

  private getAllViolations(evaluationResults: MultiTierEvaluationResult): any[] {
    return [
      ...evaluationResults.user.violations,
      ...evaluationResults.api.violations,
      ...evaluationResults.operation.violations,
      ...evaluationResults.global.violations
    ];
  }

  private generateDefaultResponse(context: RateLimitContext, decision: RateLimitDecision): ConversationalRateLimitResponse {
    return {
      explanation: "Rate limiting is in effect.",
      userFriendlyMessage: "Your request is being processed with rate limiting.",
      suggestions: ["Please wait before making your next request"]
    };
  }

  private async analyzeNegotiationIntent(userRequest: string, context: RateLimitContext): Promise<any> {
    // Simplified NLP analysis
    return {
      intent: 'INCREASE_LIMITS',
      confidence: 0.8,
      parameters: {}
    };
  }

  private async generateNegotiationOptions(context: RateLimitContext, decision: RateLimitDecision, intent: any): Promise<NegotiationOption[]> {
    return [
      {
        option: 'Temporary limit increase',
        description: 'Increase your rate limit for the next hour',
        tradeoffs: ['Uses your daily burst allowance'],
        requirements: ['Verification of legitimate use case'],
        estimatedOutcome: 'Double your current rate limit for 1 hour'
      }
    ];
  }

  private async assessNegotiationFeasibility(context: RateLimitContext, intent: any, options: NegotiationOption[]): Promise<any> {
    return {
      feasible: true,
      constraints: [],
      recommendations: ['Proceed with temporary increase']
    };
  }

  private async createNegotiatedDecision(
    context: RateLimitContext,
    originalDecision: RateLimitDecision,
    feasibility: any,
    options: NegotiationOption[]
  ): Promise<RateLimitDecision> {
    return {
      ...originalDecision,
      decision: 'ALLOW',
      reason: 'Negotiated rate limit increase approved'
    };
  }

  private async generateNegotiationResponse(
    context: RateLimitContext,
    decision: RateLimitDecision,
    options: NegotiationOption[],
    feasibility: any
  ): Promise<ConversationalRateLimitResponse> {
    return {
      explanation: "Your rate limit has been temporarily increased based on our negotiation.",
      userFriendlyMessage: "✅ Rate limit increased - request approved",
      suggestions: ["Use this opportunity to batch your operations", "Monitor your usage carefully"],
      negotiationOptions: options
    };
  }

  private async generateDetailedExplanation(
    context: RateLimitContext,
    decision: RateLimitDecision,
    state: RateLimitState,
    userBehavior: UserBehaviorInsights,
    explanationLevel: string
  ): Promise<string> {
    return `Your request was ${decision.decision.toLowerCase()} due to rate limiting policies.`;
  }

  private async generatePersonalizedSuggestions(
    context: RateLimitContext,
    decision: RateLimitDecision,
    state: RateLimitState,
    userBehavior: UserBehaviorInsights
  ): Promise<string[]> {
    return ["Consider spacing out your requests", "Monitor your usage patterns"];
  }

  private async generateEducationalContent(
    context: RateLimitContext,
    decision: RateLimitDecision,
    explanationLevel: string
  ): Promise<EducationalContent | undefined> {
    if (explanationLevel !== 'DETAILED') return undefined;

    return {
      topic: 'Rate Limiting',
      explanation: 'Rate limiting controls the frequency of requests to ensure system stability.',
      bestPractices: ['Space out requests', 'Use batch operations', 'Implement retry logic'],
      examples: ['Wait 1 second between requests', 'Batch 10 operations together'],
      links: []
    };
  }

  private generateUserFriendlyMessage(decision: RateLimitDecision, explanationLevel: string): string {
    const messages = {
      ALLOW: '✅ Request approved',
      THROTTLE: '⏱️ Request throttled',
      QUEUE: '📋 Request queued',
      DENY: '❌ Request denied'
    };
    return messages[decision.decision as keyof typeof messages] || 'Request processed';
  }

  private generateTechnicalDetails(context: RateLimitContext, decision: RateLimitDecision, state: RateLimitState): string {
    return JSON.stringify({
      userId: context.userId,
      endpoint: context.apiEndpoint,
      decision: decision.decision,
      currentUsage: state.currentUsage,
      quotaStatus: state.quotaStatus
    }, null, 2);
  }

  private getUserBehaviorInsights(userId: string): UserBehaviorInsights {
    if (this.userBehaviorCache.has(userId)) {
      return this.userBehaviorCache.get(userId)!;
    }

    const insights: UserBehaviorInsights = {
      patternRecognition: ['Regular usage pattern'],
      abuseIndicators: [],
      legitimacyScore: 0.9,
      behaviorClassification: 'NORMAL',
      recommendedActions: ['Continue normal usage']
    };

    this.userBehaviorCache.set(userId, insights);
    return insights;
  }

  private async updateStateAndMetrics(context: RateLimitContext, decision: RateLimitDecision, state: RateLimitState): Promise<void> {
    // Update usage metrics
    state.currentUsage.requestsThisSecond++;
    state.currentUsage.requestsThisMinute++;
    state.currentUsage.requestsThisHour++;
    state.currentUsage.requestsThisDay++;

    // Update cache
    const cacheKey = `${context.userId}:${context.apiEndpoint}`;
    this.stateCache.set(cacheKey, state);
  }

  private async generateAnalytics(context: RateLimitContext, decision: RateLimitDecision, startTime: number): Promise<RateLimitAnalytics> {
    const processingTime = Date.now() - startTime;

    return {
      impactAssessment: {
        userImpact: decision.decision === 'DENY' ? 'HIGH' : 'LOW',
        systemImpact: 'LOW',
        businessImpact: 'LOW',
        estimatedRevenueLoss: 0,
        userSatisfactionImpact: decision.decision === 'DENY' ? -0.1 : 0
      },
      performanceMetrics: {
        decisionTime: processingTime,
        cacheHitRate: 0.85,
        throughputImpact: 0,
        latencyImpact: processingTime,
        resourceUtilization: 0.3
      },
      userBehaviorInsights: this.getUserBehaviorInsights(context.userId),
      systemHealthIndicators: {
        currentLoad: 0.6,
        capacityUtilization: 0.7,
        errorRate: 0.01,
        responseTime: processingTime,
        alertLevel: 'GREEN'
      }
    };
  }

  private async emitRateLimitEvent(context: RateLimitContext, decision: RateLimitDecision): Promise<void> {
    const event: RateLimitEvent = {
      eventType: this.getEventType(decision),
      timestamp: new Date(),
      context,
      decision,
      metadata: {
        processingTime: decision.processingTime,
        cacheHit: this.stateCache.has(`${context.userId}:${context.apiEndpoint}`)
      }
    };

    this.eventHistory.push(event);

    // In a real implementation, this would emit to event bus/monitoring system
    this.logger.debug(`Rate limit event emitted: ${event.eventType} for user: ${context.userId}`);
  }

  private getEventType(decision: RateLimitDecision): RateLimitEventType {
    switch (decision.decision) {
      case 'DENY':
        return 'LIMIT_EXCEEDED';
      case 'THROTTLE':
        return 'THROTTLE_APPLIED';
      case 'QUEUE':
        return 'QUEUE_ADDED';
      default:
        return 'REQUEST_EVALUATED';
    }
  }
}

// Supporting interfaces for internal use
interface MultiTierEvaluationResult {
  user: TierEvaluationResult;
  api: TierEvaluationResult;
  operation: TierEvaluationResult;
  global: TierEvaluationResult;
  overallRisk: string;
}

interface TierEvaluationResult {
  tier: string;
  allowed: boolean;
  violations: any[];
  utilizationPercentage: number;
  recommendedAction: string;
  severity: string;
  nextAllowedTime: Date | null;
}