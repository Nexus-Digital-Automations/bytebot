/**
 * PARLANT Error Handling and Recovery Service
 * Implements comprehensive error handling, fallback strategies, and circuit breaker patterns
 * for enterprise-grade resilience and fault tolerance
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  ParlantValidationRequest,
  ParlantValidationResponse,
  SecurityLevel,
  ParlantIntegrationError,
  ParlantValidationError,
  ParlantTimeoutError,
  PerformanceImpactAssessment,
} from '../types/parlant-shared.types';

/**
 * Circuit breaker states for fault tolerance management
 */
export enum CircuitBreakerState {
  CLOSED = 'closed',      // Normal operation
  OPEN = 'open',          // Failing fast, not attempting calls
  HALF_OPEN = 'half_open' // Testing if service has recovered
}

/**
 * Error recovery strategies for different failure scenarios
 */
export enum RecoveryStrategy {
  IMMEDIATE_RETRY = 'immediate_retry',
  EXPONENTIAL_BACKOFF = 'exponential_backoff',
  LINEAR_BACKOFF = 'linear_backoff',
  CIRCUIT_BREAKER = 'circuit_breaker',
  FALLBACK_SERVICE = 'fallback_service',
  CACHED_RESPONSE = 'cached_response',
  GRACEFUL_DEGRADATION = 'graceful_degradation',
  FAIL_FAST = 'fail_fast'
}

/**
 * Error severity levels for escalation and handling
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
  CATASTROPHIC = 'catastrophic'
}

/**
 * Fallback service types for different validation scenarios
 */
export enum FallbackServiceType {
  LOCAL_CACHE = 'local_cache',
  RULE_BASED_VALIDATOR = 'rule_based_validator',
  SIMPLIFIED_PARLANT = 'simplified_parlant',
  MANUAL_APPROVAL = 'manual_approval',
  AUTO_APPROVE_LOW_RISK = 'auto_approve_low_risk',
  AUTO_DENY_HIGH_RISK = 'auto_deny_high_risk'
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  /** Failure threshold to open circuit */
  failureThreshold: number;
  /** Success threshold to close circuit from half-open */
  successThreshold: number;
  /** Timeout before attempting recovery (ms) */
  timeout: number;
  /** Monitoring window for failure counting (ms) */
  monitoringWindow: number;
  /** Maximum concurrent requests in half-open state */
  halfOpenMaxRequests: number;
}

/**
 * Retry configuration for different strategies
 */
export interface RetryConfig {
  /** Maximum retry attempts */
  maxAttempts: number;
  /** Base delay between retries (ms) */
  baseDelay: number;
  /** Maximum delay between retries (ms) */
  maxDelay: number;
  /** Backoff multiplier for exponential strategy */
  backoffMultiplier: number;
  /** Jitter to prevent thundering herd */
  jitterEnabled: boolean;
}

/**
 * Error handling request
 */
export interface ErrorHandlingRequest {
  /** Original validation request */
  originalRequest: ParlantValidationRequest;
  /** Error that occurred */
  error: Error;
  /** Attempt number */
  attemptNumber: number;
  /** Previous attempts history */
  previousAttempts: ErrorAttempt[];
  /** Context for error handling */
  context: ErrorHandlingContext;
}

/**
 * Error handling context
 */
export interface ErrorHandlingContext {
  /** Service name where error occurred */
  serviceName: string;
  /** Operation ID for tracking */
  operationId: string;
  /** Request timestamp */
  timestamp: Date;
  /** User context */
  userContext: Record<string, unknown>;
  /** System state at time of error */
  systemState: SystemState;
}

/**
 * System state information
 */
export interface SystemState {
  /** CPU usage percentage */
  cpuUsage: number;
  /** Memory usage percentage */
  memoryUsage: number;
  /** Active connections count */
  activeConnections: number;
  /** Queue depth */
  queueDepth: number;
  /** Recent error rate */
  errorRate: number;
}

/**
 * Error attempt record
 */
export interface ErrorAttempt {
  /** Attempt timestamp */
  timestamp: Date;
  /** Error message */
  error: string;
  /** Recovery strategy used */
  strategy: RecoveryStrategy;
  /** Duration of attempt (ms) */
  duration: number;
  /** Result of attempt */
  result: 'success' | 'failure' | 'timeout';
}

/**
 * Error handling result
 */
export interface ErrorHandlingResult {
  /** Whether error was successfully handled */
  handled: boolean;
  /** Recovery strategy used */
  strategy: RecoveryStrategy;
  /** Fallback response if applicable */
  fallbackResponse?: ParlantValidationResponse;
  /** Recommended action */
  recommendedAction: string;
  /** Error analysis */
  errorAnalysis: ErrorAnalysis;
  /** Recovery metadata */
  recoveryMetadata: RecoveryMetadata;
}

/**
 * Error analysis information
 */
export interface ErrorAnalysis {
  /** Error category */
  category: string;
  /** Error severity */
  severity: ErrorSeverity;
  /** Root cause analysis */
  rootCause: string;
  /** Impact assessment */
  impact: PerformanceImpactAssessment;
  /** Correlation with other errors */
  correlatedErrors: string[];
}

/**
 * Recovery metadata
 */
export interface RecoveryMetadata {
  /** Recovery start time */
  startTime: Date;
  /** Recovery end time */
  endTime: Date;
  /** Total recovery time (ms) */
  recoveryTime: number;
  /** Resource utilization during recovery */
  resourceUtilization: Record<string, unknown>;
  /** Success probability */
  successProbability: number;
}

/**
 * Circuit breaker metrics
 */
export interface CircuitBreakerMetrics {
  /** Current state */
  state: CircuitBreakerState;
  /** Failure count in current window */
  failureCount: number;
  /** Success count in current window */
  successCount: number;
  /** Last failure timestamp */
  lastFailureTime?: Date;
  /** Last success timestamp */
  lastSuccessTime?: Date;
  /** State transition history */
  stateHistory: StateTransition[];
}

/**
 * State transition record
 */
export interface StateTransition {
  /** Previous state */
  fromState: CircuitBreakerState;
  /** New state */
  toState: CircuitBreakerState;
  /** Transition timestamp */
  timestamp: Date;
  /** Reason for transition */
  reason: string;
}

/**
 * Fallback service response
 */
export interface FallbackServiceResponse {
  /** Service type used */
  serviceType: FallbackServiceType;
  /** Response generated */
  response: ParlantValidationResponse;
  /** Confidence in fallback response */
  confidence: number;
  /** Limitations of fallback */
  limitations: string[];
}

@Injectable()
export class ErrorHandlingRecoveryService {
  private readonly logger = new Logger(ErrorHandlingRecoveryService.name);

  /** Circuit breaker states by service */
  private circuitBreakers = new Map<string, CircuitBreakerMetrics>();

  /** Default circuit breaker configuration */
  private defaultCircuitBreakerConfig: CircuitBreakerConfig = {
    failureThreshold: 5,
    successThreshold: 3,
    timeout: 30000, // 30 seconds
    monitoringWindow: 60000, // 1 minute
    halfOpenMaxRequests: 3
  };

  /** Default retry configuration */
  private defaultRetryConfig: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    jitterEnabled: true
  };

  /** Error pattern cache for learning */
  private errorPatterns = new Map<string, ErrorPattern>();

  /** Fallback service registry */
  private fallbackServices = new Map<FallbackServiceType, FallbackService>();

  constructor() {
    this.initializeFallbackServices();
    this.startCircuitBreakerMonitoring();
  }

  /**
   * Handle error with comprehensive recovery strategies
   */
  async handleError(request: ErrorHandlingRequest): Promise<ErrorHandlingResult> {
    this.logger.warn('Handling error with comprehensive recovery strategies', {
      operationId: request.context.operationId,
      error: request.error.message,
      attemptNumber: request.attemptNumber
    });

    const startTime = new Date();

    try {
      // Analyze error
      const errorAnalysis = await this.analyzeError(request);

      // Determine recovery strategy
      const strategy = await this.determineRecoveryStrategy(request, errorAnalysis);

      // Execute recovery
      const recoveryResult = await this.executeRecovery(request, strategy);

      // Update circuit breaker
      this.updateCircuitBreaker(request.context.serviceName, recoveryResult.success);

      // Learn from error pattern
      await this.learnFromError(request, errorAnalysis, strategy);

      const endTime = new Date();

      return {
        handled: recoveryResult.success,
        strategy,
        fallbackResponse: recoveryResult.response,
        recommendedAction: recoveryResult.recommendedAction,
        errorAnalysis,
        recoveryMetadata: {
          startTime,
          endTime,
          recoveryTime: endTime.getTime() - startTime.getTime(),
          resourceUtilization: await this.getResourceUtilization(),
          successProbability: recoveryResult.successProbability
        }
      };

    } catch (error) {
      const errorObj = error as Error;
      this.logger.error('Error in error handling', {
        operationId: request.context.operationId,
        error: errorObj.message
      });

      // Return catastrophic failure handling
      return this.handleCatastrophicFailure(request, errorObj);
    }
  }

  /**
   * Analyze error to determine type, severity, and patterns
   */
  private async analyzeError(request: ErrorHandlingRequest): Promise<ErrorAnalysis> {
    const error = request.error;

    // Categorize error
    let category = 'unknown';
    let severity = ErrorSeverity.MEDIUM;

    if (error instanceof ParlantTimeoutError) {
      category = 'timeout';
      severity = ErrorSeverity.MEDIUM;
    } else if (error instanceof ParlantValidationError) {
      category = 'validation';
      severity = ErrorSeverity.LOW;
    } else if (error instanceof ParlantIntegrationError) {
      category = 'integration';
      severity = ErrorSeverity.HIGH;
    } else if (error.message.includes('network') || error.message.includes('connection')) {
      category = 'network';
      severity = ErrorSeverity.HIGH;
    } else if (error.message.includes('memory') || error.message.includes('resource')) {
      category = 'resource';
      severity = ErrorSeverity.CRITICAL;
    }

    // Analyze system impact
    const impact = await this.assessPerformanceImpact(request);

    // Find correlated errors
    const correlatedErrors = this.findCorrelatedErrors(error, request.context);

    return {
      category,
      severity,
      rootCause: await this.determineRootCause(error, request.context),
      impact,
      correlatedErrors
    };
  }

  /**
   * Determine optimal recovery strategy based on error analysis
   */
  private async determineRecoveryStrategy(
    request: ErrorHandlingRequest,
    analysis: ErrorAnalysis
  ): Promise<RecoveryStrategy> {
    const { attemptNumber, context } = request;

    // Check circuit breaker state
    const circuitState = this.getCircuitBreakerState(context.serviceName);
    if (circuitState === CircuitBreakerState.OPEN) {
      return RecoveryStrategy.FALLBACK_SERVICE;
    }

    // Strategy based on error type and severity
    switch (analysis.category) {
      case 'timeout':
        if (attemptNumber < 2) {
          return RecoveryStrategy.IMMEDIATE_RETRY;
        } else if (attemptNumber < 4) {
          return RecoveryStrategy.EXPONENTIAL_BACKOFF;
        } else {
          return RecoveryStrategy.FALLBACK_SERVICE;
        }

      case 'network':
        return attemptNumber < 3 ?
          RecoveryStrategy.EXPONENTIAL_BACKOFF :
          RecoveryStrategy.CIRCUIT_BREAKER;

      case 'validation':
        // Validation errors shouldn't be retried
        return RecoveryStrategy.FALLBACK_SERVICE;

      case 'resource':
        if (analysis.severity === ErrorSeverity.CRITICAL) {
          return RecoveryStrategy.GRACEFUL_DEGRADATION;
        } else {
          return RecoveryStrategy.LINEAR_BACKOFF;
        }

      default:
        // Unknown errors - be conservative
        return attemptNumber === 1 ?
          RecoveryStrategy.IMMEDIATE_RETRY :
          RecoveryStrategy.FALLBACK_SERVICE;
    }
  }

  /**
   * Execute recovery strategy
   */
  private async executeRecovery(
    request: ErrorHandlingRequest,
    strategy: RecoveryStrategy
  ): Promise<RecoveryExecutionResult> {

    this.logger.debug('Executing recovery strategy', {
      strategy,
      operationId: request.context.operationId
    });

    switch (strategy) {
      case RecoveryStrategy.IMMEDIATE_RETRY:
        return this.executeImmediateRetry(request);

      case RecoveryStrategy.EXPONENTIAL_BACKOFF:
        return this.executeExponentialBackoff(request);

      case RecoveryStrategy.LINEAR_BACKOFF:
        return this.executeLinearBackoff(request);

      case RecoveryStrategy.CIRCUIT_BREAKER:
        return this.executeCircuitBreaker(request);

      case RecoveryStrategy.FALLBACK_SERVICE:
        return this.executeFallbackService(request);

      case RecoveryStrategy.CACHED_RESPONSE:
        return this.executeCachedResponse(request);

      case RecoveryStrategy.GRACEFUL_DEGRADATION:
        return this.executeGracefulDegradation(request);

      case RecoveryStrategy.FAIL_FAST:
        return this.executeFailFast(request);

      default:
        return {
          success: false,
          recommendedAction: 'Manual intervention required',
          successProbability: 0
        };
    }
  }

  /**
   * Execute immediate retry strategy
   */
  private async executeImmediateRetry(request: ErrorHandlingRequest): Promise<RecoveryExecutionResult> {
    try {
      // Immediate retry with no delay
      const response = await this.retryOriginalRequest(request.originalRequest);
      return {
        success: true,
        response,
        recommendedAction: 'Request succeeded on immediate retry',
        successProbability: 0.7
      };
    } catch {
      return {
        success: false,
        recommendedAction: 'Immediate retry failed, consider exponential backoff',
        successProbability: 0.3
      };
    }
  }

  /**
   * Execute exponential backoff strategy
   */
  private async executeExponentialBackoff(request: ErrorHandlingRequest): Promise<RecoveryExecutionResult> {
    const config = this.defaultRetryConfig;
    const delay = Math.min(
      config.baseDelay * Math.pow(config.backoffMultiplier, request.attemptNumber - 1),
      config.maxDelay
    );

    // Add jitter if enabled
    const finalDelay = config.jitterEnabled ?
      delay + Math.random() * delay * 0.1 : delay;

    await this.sleep(finalDelay);

    try {
      const response = await this.retryOriginalRequest(request.originalRequest);
      return {
        success: true,
        response,
        recommendedAction: 'Request succeeded with exponential backoff',
        successProbability: 0.6
      };
    } catch {
      return {
        success: false,
        recommendedAction: 'Exponential backoff retry failed, consider fallback service',
        successProbability: 0.2
      };
    }
  }

  /**
   * Execute linear backoff strategy
   */
  private async executeLinearBackoff(request: ErrorHandlingRequest): Promise<RecoveryExecutionResult> {
    const delay = this.defaultRetryConfig.baseDelay * request.attemptNumber;
    await this.sleep(delay);

    try {
      const response = await this.retryOriginalRequest(request.originalRequest);
      return {
        success: true,
        response,
        recommendedAction: 'Request succeeded with linear backoff',
        successProbability: 0.5
      };
    } catch {
      return {
        success: false,
        recommendedAction: 'Linear backoff retry failed, consider fallback service',
        successProbability: 0.2
      };
    }
  }

  /**
   * Execute circuit breaker strategy
   */
  private async executeCircuitBreaker(request: ErrorHandlingRequest): Promise<RecoveryExecutionResult> {
    const serviceName = request.context.serviceName;
    const circuitState = this.getCircuitBreakerState(serviceName);

    if (circuitState === CircuitBreakerState.OPEN) {
      // Circuit is open, use fallback immediately
      return this.executeFallbackService(request);
    } else if (circuitState === CircuitBreakerState.HALF_OPEN) {
      // Limited attempts in half-open state
      try {
        const response = await this.retryOriginalRequest(request.originalRequest);
        this.recordCircuitBreakerSuccess(serviceName);
        return {
          success: true,
          response,
          recommendedAction: 'Circuit breaker test succeeded',
          successProbability: 0.4
        };
      } catch {
        this.recordCircuitBreakerFailure(serviceName);
        return this.executeFallbackService(request);
      }
    } else {
      // Circuit is closed, normal operation
      try {
        const response = await this.retryOriginalRequest(request.originalRequest);
        return {
          success: true,
          response,
          recommendedAction: 'Normal circuit breaker operation succeeded',
          successProbability: 0.8
        };
      } catch {
        this.recordCircuitBreakerFailure(serviceName);
        return {
          success: false,
          recommendedAction: 'Circuit breaker failure recorded',
          successProbability: 0.1
        };
      }
    }
  }

  /**
   * Execute fallback service strategy
   */
  private async executeFallbackService(request: ErrorHandlingRequest): Promise<RecoveryExecutionResult> {
    const securityLevel = request.originalRequest.securityLevel;

    // Determine appropriate fallback service
    let fallbackType: FallbackServiceType;

    if (securityLevel === SecurityLevel._MINIMAL || securityLevel === SecurityLevel._LOW) {
      fallbackType = FallbackServiceType.AUTO_APPROVE_LOW_RISK;
    } else if (securityLevel === SecurityLevel._CRITICAL || securityLevel === SecurityLevel.CLASSIFIED) {
      fallbackType = FallbackServiceType.AUTO_DENY_HIGH_RISK;
    } else {
      fallbackType = FallbackServiceType.RULE_BASED_VALIDATOR;
    }

    try {
      const fallbackService = this.fallbackServices.get(fallbackType);
      if (!fallbackService) {
        throw new Error(`Fallback service ${fallbackType} not available`);
      }

      const fallbackResponse = await fallbackService.validate(request.originalRequest);

      return {
        success: true,
        response: fallbackResponse.response,
        recommendedAction: `Fallback service ${fallbackType} provided response`,
        successProbability: fallbackResponse.confidence
      };
    } catch {
      return {
        success: false,
        recommendedAction: 'Fallback service failed, manual intervention required',
        successProbability: 0
      };
    }
  }

  /**
   * Execute cached response strategy
   */
  private async executeCachedResponse(request: ErrorHandlingRequest): Promise<RecoveryExecutionResult> {
    // Try to find cached response for similar request
    const cacheKey = this.generateCacheKey(request.originalRequest);
    const cachedResponse = await this.getCachedValidationResponse(cacheKey);

    if (cachedResponse) {
      return {
        success: true,
        response: cachedResponse,
        recommendedAction: 'Cached response provided',
        successProbability: 0.6
      };
    } else {
      return {
        success: false,
        recommendedAction: 'No cached response available, try fallback service',
        successProbability: 0
      };
    }
  }

  /**
   * Execute graceful degradation strategy
   */
  private async executeGracefulDegradation(request: ErrorHandlingRequest): Promise<RecoveryExecutionResult> {
    // Provide simplified validation with reduced functionality
    const simplifiedResponse: ParlantValidationResponse = {
      approved: request.originalRequest.securityLevel === SecurityLevel._MINIMAL,
      conversationId: `degraded-${Date.now()}`,
      reason: 'Graceful degradation - simplified validation applied',
      confidence: 0.3,
      metadata: {
        startTime: new Date(),
        endTime: new Date(),
        processingTime: 1,
        cacheStatus: 'miss',
        source: 'fallback',
        riskAssessment: {
          level: SecurityLevel._MEDIUM,
          factors: ['Service degradation'],
          score: 50,
          mitigations: ['Enhanced monitoring', 'Manual review queue']
        }
      }
    };

    return {
      success: true,
      response: simplifiedResponse,
      recommendedAction: 'Graceful degradation response provided',
      successProbability: 0.4
    };
  }

  /**
   * Execute fail fast strategy
   */
  private async executeFailFast(_request: ErrorHandlingRequest): Promise<RecoveryExecutionResult> {
    return {
      success: false,
      recommendedAction: 'Fail fast strategy - immediate failure to prevent cascade',
      successProbability: 0
    };
  }

  /**
   * Retry original request (placeholder - would integrate with actual PARLANT service)
   */
  private async retryOriginalRequest(_request: ParlantValidationRequest): Promise<ParlantValidationResponse> {
    // This would integrate with the actual PARLANT validation service
    // For now, simulate based on security level

    await this.sleep(100); // Simulate processing time

    // Simulate random failure for demonstration
    if (Math.random() < 0.3) {
      throw new Error('Simulated validation failure');
    }

    return {
      approved: _request.securityLevel !== SecurityLevel._CRITICAL,
      conversationId: `retry-${Date.now()}`,
      reason: 'Validation completed on retry',
      confidence: 0.8,
      metadata: {
        startTime: new Date(),
        endTime: new Date(),
        processingTime: 100,
        cacheStatus: 'miss',
        source: 'parlant',
        riskAssessment: {
          level: _request.securityLevel,
          factors: [],
          score: 20,
          mitigations: []
        }
      }
    };
  }

  /**
   * Initialize fallback services
   */
  private initializeFallbackServices(): void {
    // Rule-based validator
    this.fallbackServices.set(FallbackServiceType.RULE_BASED_VALIDATOR, {
      validate: async (_request: ParlantValidationRequest): Promise<FallbackServiceResponse> => {
        const approved = this.evaluateSecurityRules(_request);
        return {
          serviceType: FallbackServiceType.RULE_BASED_VALIDATOR,
          response: {
            approved,
            conversationId: `rule-${Date.now()}`,
            reason: 'Rule-based validation',
            confidence: 0.7,
            metadata: {
              startTime: new Date(),
              endTime: new Date(),
              processingTime: 10,
              cacheStatus: 'miss',
              source: 'fallback',
              riskAssessment: {
                level: _request.securityLevel,
                factors: ['Rule-based evaluation'],
                score: approved ? 20 : 80,
                mitigations: ['Manual review recommended']
              }
            }
          },
          confidence: 0.7,
          limitations: ['Basic rule evaluation', 'No conversational context']
        };
      }
    });

    // Auto-approve low risk
    this.fallbackServices.set(FallbackServiceType.AUTO_APPROVE_LOW_RISK, {
      validate: async (_request: ParlantValidationRequest): Promise<FallbackServiceResponse> => {
        return {
          serviceType: FallbackServiceType.AUTO_APPROVE_LOW_RISK,
          response: {
            approved: true,
            conversationId: `auto-approve-${Date.now()}`,
            reason: 'Auto-approved for low risk operation',
            confidence: 0.6,
            metadata: {
              startTime: new Date(),
              endTime: new Date(),
              processingTime: 1,
              cacheStatus: 'miss',
              source: 'fallback',
              riskAssessment: {
                level: SecurityLevel._LOW,
                factors: ['Low risk auto-approval'],
                score: 10,
                mitigations: []
              }
            }
          },
          confidence: 0.6,
          limitations: ['No validation performed', 'Auto-approval only']
        };
      }
    });

    // Auto-deny high risk
    this.fallbackServices.set(FallbackServiceType.AUTO_DENY_HIGH_RISK, {
      validate: async (_request: ParlantValidationRequest): Promise<FallbackServiceResponse> => {
        return {
          serviceType: FallbackServiceType.AUTO_DENY_HIGH_RISK,
          response: {
            approved: false,
            conversationId: `auto-deny-${Date.now()}`,
            reason: 'Auto-denied for high risk operation',
            confidence: 0.9,
            metadata: {
              startTime: new Date(),
              endTime: new Date(),
              processingTime: 1,
              cacheStatus: 'miss',
              source: 'fallback',
              riskAssessment: {
                level: SecurityLevel._CRITICAL,
                factors: ['High risk auto-denial'],
                score: 90,
                mitigations: ['Manual approval required']
              }
            }
          },
          confidence: 0.9,
          limitations: ['No validation performed', 'Auto-denial only']
        };
      }
    });
  }

  /**
   * Evaluate security rules for rule-based fallback
   */
  private evaluateSecurityRules(_request: ParlantValidationRequest): boolean {
    // Simple rule-based evaluation
    if (_request.securityLevel === SecurityLevel._CRITICAL ||
        _request.securityLevel === SecurityLevel.CLASSIFIED) {
      return false;
    }

    if (_request.functionName.includes('delete') ||
        _request.functionName.includes('remove')) {
      return false;
    }

    return true;
  }

  /**
   * Start circuit breaker monitoring
   */
  private startCircuitBreakerMonitoring(): void {
    setInterval(() => {
      this.circuitBreakers.forEach((metrics, serviceName) => {
        this.updateCircuitBreakerState(serviceName, metrics);
      });
    }, 10000); // Check every 10 seconds
  }

  /**
   * Update circuit breaker state based on metrics
   */
  private updateCircuitBreakerState(serviceName: string, metrics: CircuitBreakerMetrics): void {
    const config = this.defaultCircuitBreakerConfig;
    const now = new Date();

    switch (metrics.state) {
      case CircuitBreakerState.CLOSED:
        if (metrics.failureCount >= config.failureThreshold) {
          this.transitionCircuitBreakerState(serviceName, CircuitBreakerState.OPEN, 'Failure threshold exceeded');
        }
        break;

      case CircuitBreakerState.OPEN:
        if (metrics.lastFailureTime &&
            now.getTime() - metrics.lastFailureTime.getTime() >= config.timeout) {
          this.transitionCircuitBreakerState(serviceName, CircuitBreakerState.HALF_OPEN, 'Timeout period elapsed');
        }
        break;

      case CircuitBreakerState.HALF_OPEN:
        if (metrics.successCount >= config.successThreshold) {
          this.transitionCircuitBreakerState(serviceName, CircuitBreakerState.CLOSED, 'Success threshold met');
        }
        break;
    }
  }

  /**
   * Transition circuit breaker state
   */
  private transitionCircuitBreakerState(
    serviceName: string,
    newState: CircuitBreakerState,
    reason: string
  ): void {
    const metrics = this.circuitBreakers.get(serviceName);
    if (!metrics) return;

    const transition: StateTransition = {
      fromState: metrics.state,
      toState: newState,
      timestamp: new Date(),
      reason
    };

    metrics.state = newState;
    metrics.stateHistory.push(transition);

    // Reset counters on state change
    if (newState === CircuitBreakerState.CLOSED) {
      metrics.failureCount = 0;
      metrics.successCount = 0;
    }

    this.logger.warn('Circuit breaker state transition', {
      serviceName,
      fromState: transition.fromState,
      toState: transition.toState,
      reason
    });
  }

  /**
   * Get circuit breaker state for service
   */
  private getCircuitBreakerState(serviceName: string): CircuitBreakerState {
    const metrics = this.circuitBreakers.get(serviceName);
    return metrics?.state || CircuitBreakerState.CLOSED;
  }

  /**
   * Record circuit breaker success
   */
  private recordCircuitBreakerSuccess(serviceName: string): void {
    let metrics = this.circuitBreakers.get(serviceName);
    if (!metrics) {
      metrics = this.initializeCircuitBreakerMetrics(serviceName);
    }

    metrics.successCount++;
    metrics.lastSuccessTime = new Date();

    this.updateCircuitBreaker(serviceName, true);
  }

  /**
   * Record circuit breaker failure
   */
  private recordCircuitBreakerFailure(serviceName: string): void {
    let metrics = this.circuitBreakers.get(serviceName);
    if (!metrics) {
      metrics = this.initializeCircuitBreakerMetrics(serviceName);
    }

    metrics.failureCount++;
    metrics.lastFailureTime = new Date();

    this.updateCircuitBreaker(serviceName, false);
  }

  /**
   * Initialize circuit breaker metrics for service
   */
  private initializeCircuitBreakerMetrics(serviceName: string): CircuitBreakerMetrics {
    const metrics: CircuitBreakerMetrics = {
      state: CircuitBreakerState.CLOSED,
      failureCount: 0,
      successCount: 0,
      stateHistory: []
    };

    this.circuitBreakers.set(serviceName, metrics);
    return metrics;
  }

  /**
   * Update circuit breaker with result
   */
  private updateCircuitBreaker(serviceName: string, success: boolean): void {
    if (success) {
      this.recordCircuitBreakerSuccess(serviceName);
    } else {
      this.recordCircuitBreakerFailure(serviceName);
    }
  }

  /**
   * Assess performance impact of error
   */
  private async assessPerformanceImpact(request: ErrorHandlingRequest): Promise<PerformanceImpactAssessment> {
    const systemState = request.context.systemState;

    let impactLevel: 'minimal' | 'low' | 'medium' | 'high' | 'critical' = 'minimal';
    let degradationPercent = 0;

    if (systemState.errorRate > 50) {
      impactLevel = 'critical';
      degradationPercent = 75;
    } else if (systemState.errorRate > 25) {
      impactLevel = 'high';
      degradationPercent = 50;
    } else if (systemState.errorRate > 10) {
      impactLevel = 'medium';
      degradationPercent = 25;
    } else if (systemState.errorRate > 5) {
      impactLevel = 'low';
      degradationPercent = 10;
    }

    return {
      impactLevel,
      affectedComponents: [request.context.serviceName],
      degradationPercent,
      mitigationStrategies: [
        'Circuit breaker activation',
        'Fallback service routing',
        'Load balancing adjustment'
      ]
    };
  }

  /**
   * Find correlated errors
   */
  private findCorrelatedErrors(_error: Error, _context: ErrorHandlingContext): string[] {
    // This would implement correlation analysis across recent errors
    // For now, return empty array
    return [];
  }

  /**
   * Determine root cause of error
   */
  private async determineRootCause(error: Error, _context: ErrorHandlingContext): Promise<string> {
    // Advanced root cause analysis would go here
    // For now, return basic categorization based on error message

    if (error.message.includes('timeout')) {
      return 'Request timeout - possible network latency or service overload';
    } else if (error.message.includes('connection')) {
      return 'Connection failure - network connectivity or service unavailability';
    } else if (error.message.includes('validation')) {
      return 'Validation failure - invalid input parameters or business rules';
    } else if (error.message.includes('auth')) {
      return 'Authentication failure - invalid credentials or permissions';
    } else {
      return 'Unknown error - requires manual investigation';
    }
  }

  /**
   * Learn from error patterns for future optimization
   */
  private async learnFromError(
    request: ErrorHandlingRequest,
    analysis: ErrorAnalysis,
    strategy: RecoveryStrategy
  ): Promise<void> {
    const patternKey = `${analysis.category}-${analysis.severity}-${strategy}`;

    let pattern = this.errorPatterns.get(patternKey);
    if (!pattern) {
      pattern = {
        category: analysis.category,
        severity: analysis.severity,
        strategy,
        occurrences: 0,
        successRate: 0,
        averageRecoveryTime: 0
      };
    }

    pattern.occurrences++;
    // Update success rate and recovery time based on result

    this.errorPatterns.set(patternKey, pattern);

    this.logger.debug('Error pattern updated', {
      patternKey,
      occurrences: pattern.occurrences
    });
  }

  /**
   * Handle catastrophic failure
   */
  private handleCatastrophicFailure(request: ErrorHandlingRequest, error: Error): ErrorHandlingResult {
    this.logger.error('Catastrophic failure in error handling', {
      operationId: request.context.operationId,
      error: error.message
    });

    return {
      handled: false,
      strategy: RecoveryStrategy.FAIL_FAST,
      recommendedAction: 'Catastrophic failure - immediate manual intervention required',
      errorAnalysis: {
        category: 'catastrophic',
        severity: ErrorSeverity.CATASTROPHIC,
        rootCause: 'Error handling system failure',
        impact: {
          impactLevel: 'critical',
          affectedComponents: ['error-handling-system'],
          degradationPercent: 100,
          mitigationStrategies: ['System restart', 'Failover to backup systems']
        },
        correlatedErrors: []
      },
      recoveryMetadata: {
        startTime: new Date(),
        endTime: new Date(),
        recoveryTime: 0,
        resourceUtilization: {},
        successProbability: 0
      }
    };
  }

  /**
   * Generate cache key for validation request
   */
  private generateCacheKey(_request: ParlantValidationRequest): string {
    return `validation:${_request.functionName}:${_request.packageName}:${_request.securityLevel}:${JSON.stringify(_request.parameters)}`;
  }

  /**
   * Get cached validation response
   */
  private async getCachedValidationResponse(_cacheKey: string): Promise<ParlantValidationResponse | null> {
    // This would integrate with the caching system
    // For now, return null (no cache hit)
    return null;
  }

  /**
   * Get current resource utilization
   */
  private async getResourceUtilization(): Promise<Record<string, unknown>> {
    // This would integrate with system monitoring
    return {
      cpu: process.cpuUsage(),
      memory: process.memoryUsage(),
      timestamp: new Date()
    };
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get error handling metrics
   */
  async getErrorHandlingMetrics(): Promise<Record<string, unknown>> {
    return {
      circuitBreakers: Array.from(this.circuitBreakers.entries()).map(([service, metrics]) => ({
        service,
        state: metrics.state,
        failureCount: metrics.failureCount,
        successCount: metrics.successCount,
        lastFailureTime: metrics.lastFailureTime,
        lastSuccessTime: metrics.lastSuccessTime
      })),
      errorPatterns: Array.from(this.errorPatterns.entries()).map(([pattern, data]) => ({
        pattern,
        ...data
      })),
      fallbackServices: Array.from(this.fallbackServices.keys())
    };
  }
}

/**
 * Error pattern interface for learning
 */
interface ErrorPattern {
  category: string;
  severity: ErrorSeverity;
  strategy: RecoveryStrategy;
  occurrences: number;
  successRate: number;
  averageRecoveryTime: number;
}

/**
 * Recovery execution result
 */
interface RecoveryExecutionResult {
  success: boolean;
  response?: ParlantValidationResponse;
  recommendedAction: string;
  successProbability: number;
}

/**
 * Fallback service interface
 */
interface FallbackService {
  validate(request: ParlantValidationRequest): Promise<FallbackServiceResponse>;
}