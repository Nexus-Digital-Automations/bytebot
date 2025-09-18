/**
 * Parlant Retry & Failover Service - Enterprise Resilience Strategy
 * 
 * Provides intelligent retry logic and failover strategies for Parlant validation
 * operations ensuring maximum availability and reliability under failure conditions.
 * 
 * Features:
 * - Exponential backoff with jitter for retry strategies
 * - Circuit breaker integration for intelligent failover
 * - Multi-endpoint failover with health-based routing
 * - Bulk operation retry with batch optimization
 * - Graceful degradation and fallback mechanisms
 * - Real-time retry analytics and optimization
 * 
 * Architecture: Multi-tier resilience with intelligent retry patterns
 * Availability: 99.9%+ target with automatic failover
 * Recovery: Sub-30 second failover time with graceful degradation
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';
import { ParlantValidationRequest, ParlantValidationResponse, RiskLevel } from '../parlant-integration.service';
import { ParlantCircuitBreakerService, CircuitBreakerState } from './parlant-circuit-breaker.service';

// ===== RETRY & FAILOVER INTERFACES =====

/**
 * Retry configuration for different operation types
 */
export interface RetryConfig {
  readonly maxAttempts: number;
  readonly baseDelayMs: number;
  readonly maxDelayMs: number;
  readonly exponentialBase: number;
  readonly jitterEnabled: boolean;
  readonly retryOnErrors: string[];
  readonly timeoutMs: number;
  readonly circuitBreakerEnabled: boolean;
}

/**
 * Failover endpoint configuration
 */
export interface FailoverEndpoint {
  readonly url: string;
  readonly priority: number;
  readonly healthWeight: number;
  readonly maxConcurrentRequests: number;
  readonly enabled: boolean;
  readonly region?: string;
  readonly capabilities: string[];
}

/**
 * Retry attempt metadata
 */
export interface RetryAttempt {
  readonly attemptNumber: number;
  readonly timestamp: Date;
  readonly endpoint: string;
  readonly delayMs: number;
  readonly error?: Error;
  readonly responseTime?: number;
  readonly circuitBreakerState: CircuitBreakerState;
}

/**
 * Failover operation result
 */
export interface FailoverResult<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: Error;
  readonly totalAttempts: number;
  readonly totalTime: number;
  readonly successfulEndpoint?: string;
  readonly failedEndpoints: string[];
  readonly retryAttempts: RetryAttempt[];
  readonly degradedMode: boolean;
  readonly fallbackUsed: boolean;
}

/**
 * Bulk operation retry configuration
 */
export interface BulkRetryConfig {
  readonly batchSize: number;
  readonly maxConcurrentBatches: number;
  readonly failFastThreshold: number;
  readonly partialSuccessAllowed: boolean;
  readonly prioritizeHighRisk: boolean;
}

/**
 * Retry analytics and metrics
 */
export interface RetryAnalytics {
  readonly totalRetries: number;
  readonly successfulRetries: number;
  readonly failedRetries: number;
  readonly averageRetryCount: number;
  readonly averageRecoveryTime: number;
  readonly endpointSuccessRates: Map<string, number>;
  readonly errorDistribution: Map<string, number>;
  readonly timeDistribution: {
    immediate: number;
    fast: number;      // < 1s
    medium: number;    // 1-5s
    slow: number;      // > 5s
  };
}

/**
 * Mutable version of RetryAnalytics for internal state management
 */
interface MutableRetryAnalytics {
  totalRetries: number;
  successfulRetries: number;
  failedRetries: number;
  averageRetryCount: number;
  averageRecoveryTime: number;
  endpointSuccessRates: Map<string, number>;
  errorDistribution: Map<string, number>;
  timeDistribution: {
    immediate: number;
    fast: number;
    medium: number;
    slow: number;
  };
}

/**
 * Graceful degradation strategy
 */
export interface DegradationStrategy {
  readonly level: 'NONE' | 'PARTIAL' | 'MINIMAL' | 'EMERGENCY';
  readonly cacheOnly: boolean;
  readonly reduceValidation: boolean;
  readonly allowBypass: boolean;
  readonly notifyUsers: boolean;
  readonly fallbackResponse: ParlantValidationResponse;
}

// ===== RETRY & FAILOVER SERVICE =====

@Injectable()
export class ParlantRetryFailoverService extends EventEmitter {
  private readonly logger = new Logger(ParlantRetryFailoverService.name);
  
  // Retry configurations by risk level
  private readonly retryConfigs: Map<RiskLevel, RetryConfig> = new Map([
    [RiskLevel.MINIMAL, {
      maxAttempts: 5,
      baseDelayMs: 100,
      maxDelayMs: 5000,
      exponentialBase: 2,
      jitterEnabled: true,
      retryOnErrors: ['TIMEOUT', 'CONNECTION_ERROR', 'RATE_LIMITED'],
      timeoutMs: 10000,
      circuitBreakerEnabled: true,
    }],
    [RiskLevel.LOW, {
      maxAttempts: 4,
      baseDelayMs: 200,
      maxDelayMs: 8000,
      exponentialBase: 2,
      jitterEnabled: true,
      retryOnErrors: ['TIMEOUT', 'CONNECTION_ERROR', 'RATE_LIMITED'],
      timeoutMs: 15000,
      circuitBreakerEnabled: true,
    }],
    [RiskLevel.MEDIUM, {
      maxAttempts: 3,
      baseDelayMs: 500,
      maxDelayMs: 10000,
      exponentialBase: 1.5,
      jitterEnabled: true,
      retryOnErrors: ['TIMEOUT', 'CONNECTION_ERROR'],
      timeoutMs: 20000,
      circuitBreakerEnabled: true,
    }],
    [RiskLevel.HIGH, {
      maxAttempts: 2,
      baseDelayMs: 1000,
      maxDelayMs: 15000,
      exponentialBase: 1.5,
      jitterEnabled: false,
      retryOnErrors: ['TIMEOUT'],
      timeoutMs: 30000,
      circuitBreakerEnabled: true,
    }],
    [RiskLevel.CRITICAL, {
      maxAttempts: 1,
      baseDelayMs: 0,
      maxDelayMs: 0,
      exponentialBase: 1,
      jitterEnabled: false,
      retryOnErrors: [],
      timeoutMs: 30000,
      circuitBreakerEnabled: false,
    }],
  ]);
  
  // Failover endpoints configuration
  private readonly failoverEndpoints: FailoverEndpoint[] = [
    {
      url: 'http://localhost:8000',
      priority: 1,
      healthWeight: 100,
      maxConcurrentRequests: 50,
      enabled: true,
      region: 'local',
      capabilities: ['validation', 'conversation', 'audit'],
    },
    // Additional endpoints would be configured here
  ];
  
  // Current endpoint health and load tracking
  private readonly endpointHealth = new Map<string, {
    healthy: boolean;
    responseTime: number;
    errorCount: number;
    successCount: number;
    concurrentRequests: number;
    lastCheck: Date;
  }>();
  
  // Retry analytics tracking
  private retryAnalytics: MutableRetryAnalytics = {
    totalRetries: 0,
    successfulRetries: 0,
    failedRetries: 0,
    averageRetryCount: 0,
    averageRecoveryTime: 0,
    endpointSuccessRates: new Map(),
    errorDistribution: new Map(),
    timeDistribution: {
      immediate: 0,
      fast: 0,
      medium: 0,
      slow: 0,
    },
  };
  
  // Degradation strategies
  private readonly degradationStrategies: Map<string, DegradationStrategy> = new Map([
    ['circuit_open', {
      level: 'PARTIAL',
      cacheOnly: true,
      reduceValidation: true,
      allowBypass: false,
      notifyUsers: true,
      fallbackResponse: this.createFallbackResponse(),
    }],
    ['all_endpoints_down', {
      level: 'EMERGENCY',
      cacheOnly: true,
      reduceValidation: false,
      allowBypass: true,
      notifyUsers: true,
      fallbackResponse: this.createEmergencyFallbackResponse(),
    }],
  ]);
  
  // Bulk operation configuration
  private readonly bulkRetryConfig: BulkRetryConfig = {
    batchSize: 10,
    maxConcurrentBatches: 5,
    failFastThreshold: 0.5, // 50% failure rate
    partialSuccessAllowed: true,
    prioritizeHighRisk: true,
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly circuitBreakerService: ParlantCircuitBreakerService
  ) {
    super();
    
    const operationId = `retry_failover_init_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    this.logger.log(`[${operationId}] Initializing Parlant Retry & Failover Service`, {
      retryConfigs: Object.fromEntries(this.retryConfigs),
      failoverEndpoints: this.failoverEndpoints.map(e => ({ url: e.url, priority: e.priority })),
      bulkRetryConfig: this.bulkRetryConfig,
      degradationStrategies: Array.from(this.degradationStrategies.keys()),
    });

    // Initialize endpoint health tracking
    this.initializeEndpointHealth();
    
    // Start health monitoring
    this.startHealthMonitoring();
    
    // Listen to circuit breaker events
    this.circuitBreakerService.on('stateChanged', (event: { 
      previousState: string; 
      newState: string; 
      timestamp: Date; 
      failureCount?: number; 
      lastFailure?: Date 
    }) => {
      this.handleCircuitBreakerStateChange(event);
    });
  }

  /**
   * Execute validation with comprehensive retry and failover logic
   * 
   * @param request - Validation request
   * @param operation - Operation function to execute
   * @returns Result with retry and failover metadata
   */
  async executeWithRetryFailover<T>(
    request: ParlantValidationRequest,
    operation: (endpoint: string) => Promise<T>
  ): Promise<FailoverResult<T>> {
    const startTime = performance.now();
    const config = this.getRetryConfig(request.riskLevel);
    const retryAttempts: RetryAttempt[] = [];
    const failedEndpoints: string[] = [];
    
    let lastError: Error | undefined;
    let currentAttempt = 0;
    
    this.logger.debug(`[${request.operationId}] Starting retry/failover execution`, {
      operationId: request.operationId,
      riskLevel: request.riskLevel,
      maxAttempts: config.maxAttempts,
      availableEndpoints: this.getHealthyEndpoints().length,
    });

    // Check for degraded mode conditions
    const degradationStrategy = this.assessDegradationNeed();
    if (degradationStrategy && degradationStrategy.level !== 'NONE') {
      return this.executeDegradedOperation(request, degradationStrategy, startTime);
    }

    // Attempt operation with retry logic
    while (currentAttempt < config.maxAttempts) {
      currentAttempt++;
      
      // Select best available endpoint
      const endpoint = this.selectOptimalEndpoint(failedEndpoints);
      if (!endpoint) {
        break; // No healthy endpoints available
      }

      const attemptStartTime = performance.now();
      
      try {
        // Apply circuit breaker protection if enabled
        if (config.circuitBreakerEnabled) {
          const circuitResult = await this.circuitBreakerService.executeWithProtection(
            () => operation(endpoint.url),
            request.operationId
          );
          
          if (circuitResult.success) {
            // Success - update analytics and return
            const totalTime = performance.now() - startTime;
            this.updateSuccessAnalytics(currentAttempt, totalTime, endpoint.url);
            
            this.logger.debug(`[${request.operationId}] Operation succeeded on attempt ${currentAttempt}`, {
              endpoint: endpoint.url,
              totalTime: `${totalTime.toFixed(2)}ms`,
              attempts: currentAttempt,
            });
            
            return {
              success: true,
              data: circuitResult.data,
              totalAttempts: currentAttempt,
              totalTime,
              successfulEndpoint: endpoint.url,
              failedEndpoints,
              retryAttempts,
              degradedMode: false,
              fallbackUsed: false,
            };
          } else {
            lastError = circuitResult.error;
          }
        } else {
          // Direct operation execution
          const result = await this.executeWithTimeout(
            () => operation(endpoint.url),
            config.timeoutMs,
            request.operationId
          );
          
          // Success
          const totalTime = performance.now() - startTime;
          this.updateSuccessAnalytics(currentAttempt, totalTime, endpoint.url);
          
          return {
            success: true,
            data: result,
            totalAttempts: currentAttempt,
            totalTime,
            successfulEndpoint: endpoint.url,
            failedEndpoints,
            retryAttempts,
            degradedMode: false,
            fallbackUsed: false,
          };
        }
        
      } catch (error) {
        lastError = error as Error;
        const attemptTime = performance.now() - attemptStartTime;
        
        // Calculate delay for next attempt before creating retry attempt object
        const delayMs = currentAttempt < config.maxAttempts ? this.calculateRetryDelay(currentAttempt, config) : 0;
        
        // Record failed attempt
        const retryAttempt: RetryAttempt = {
          attemptNumber: currentAttempt,
          timestamp: new Date(),
          endpoint: endpoint.url,
          delayMs: delayMs,
          error: lastError,
          responseTime: attemptTime,
          circuitBreakerState: this.circuitBreakerService.getCircuitBreakerStats().state,
        };
        
        retryAttempts.push(retryAttempt);
        failedEndpoints.push(endpoint.url);
        
        // Update endpoint health
        this.updateEndpointHealth(endpoint.url, false, attemptTime);
        
        this.logger.warn(`[${request.operationId}] Attempt ${currentAttempt} failed`, {
          endpoint: endpoint.url,
          error: lastError.message,
          attemptTime: `${attemptTime.toFixed(2)}ms`,
          remainingAttempts: config.maxAttempts - currentAttempt,
        });
        
        // Check if we should retry this error type
        if (!this.shouldRetryError(lastError, config)) {
          this.logger.debug(`[${request.operationId}] Error type not retryable: ${lastError.message}`);
          break;
        }
        
        // Apply delay before next attempt (if not last attempt)
        if (currentAttempt < config.maxAttempts && delayMs > 0) {
          this.logger.debug(`[${request.operationId}] Delaying ${delayMs}ms before retry ${currentAttempt + 1}`);
          await this.delay(delayMs);
        }
      }
    }
    
    // All attempts failed - update analytics and return failure
    const totalTime = performance.now() - startTime;
    this.updateFailureAnalytics(currentAttempt, totalTime);
    
    this.logger.error(`[${request.operationId}] All retry attempts failed`, {
      totalAttempts: currentAttempt,
      totalTime: `${totalTime.toFixed(2)}ms`,
      lastError: lastError?.message,
      failedEndpoints,
    });
    
    // Attempt fallback/degraded response
    const fallbackResult = await this.attemptFallbackResponse(request);
    
    return {
      success: false,
      error: lastError ?? new Error('All retry attempts exhausted'),
      totalAttempts: currentAttempt,
      totalTime,
      failedEndpoints,
      retryAttempts,
      degradedMode: fallbackResult.degradedMode,
      fallbackUsed: fallbackResult.fallbackUsed,
      data: fallbackResult.data,
    };
  }

  /**
   * Execute bulk operations with intelligent retry and batching
   * 
   * @param requests - Array of validation requests
   * @param operation - Operation function for individual requests
   * @returns Bulk operation results with retry analytics
   */
  async executeBulkWithRetry<T>(
    requests: ParlantValidationRequest[],
    operation: (request: ParlantValidationRequest, endpoint: string) => Promise<T>
  ): Promise<{
    results: Array<FailoverResult<T> | null>;
    summary: {
      totalRequests: number;
      successfulRequests: number;
      failedRequests: number;
      totalRetries: number;
      averageTime: number;
      partialSuccess: boolean;
    };
  }> {
    const startTime = performance.now();
    const totalRequests = requests.length;
    
    this.logger.log(`Starting bulk retry operation for ${totalRequests} requests`, {
      batchSize: this.bulkRetryConfig.batchSize,
      maxConcurrentBatches: this.bulkRetryConfig.maxConcurrentBatches,
      prioritizeHighRisk: this.bulkRetryConfig.prioritizeHighRisk,
    });
    
    // Sort requests by priority if enabled
    const sortedRequests = this.bulkRetryConfig.prioritizeHighRisk
      ? this.sortRequestsByPriority(requests)
      : requests;
    
    // Split into batches
    const batches = this.createBatches(sortedRequests, this.bulkRetryConfig.batchSize);
    const results: Array<FailoverResult<T> | null> = new Array<FailoverResult<T> | null>(totalRequests).fill(null);
    
    let processedBatches = 0;
    let successfulRequests = 0;
    let failedRequests = 0;
    let totalRetries = 0;
    
    // Process batches with concurrency control
    for (let i = 0; i < batches.length; i += this.bulkRetryConfig.maxConcurrentBatches) {
      const batchGroup = batches.slice(i, i + this.bulkRetryConfig.maxConcurrentBatches);
      
      const batchPromises = batchGroup.map(async (batch, batchIndex) => {
        const actualBatchIndex = i + batchIndex;
        
        const batchResults = await Promise.allSettled(
          batch.map(async (request, requestIndex) => {
            const globalIndex = actualBatchIndex * this.bulkRetryConfig.batchSize + requestIndex;
            
            try {
              const result = await this.executeWithRetryFailover(
                request,
                (endpoint) => operation(request, endpoint)
              );
              
              totalRetries += result.totalAttempts - 1; // Exclude initial attempt
              
              if (result.success) {
                successfulRequests++;
              } else {
                failedRequests++;
              }
              
              return { result, globalIndex };
            } catch (error) {
              failedRequests++;
              return {
                result: {
                  success: false,
                  error: error as Error,
                  totalAttempts: 1,
                  totalTime: 0,
                  failedEndpoints: [],
                  retryAttempts: [],
                  degradedMode: false,
                  fallbackUsed: false,
                } as FailoverResult<T>,
                globalIndex,
              };
            }
          })
        );
        
        // Update results array
        batchResults.forEach((result) => {
          if (result.status === 'fulfilled') {
            results[result.value.globalIndex] = result.value.result;
          }
        });
        
        processedBatches++;
        
        // Check fail-fast threshold
        const failureRate = failedRequests / (successfulRequests + failedRequests);
        if (failureRate > this.bulkRetryConfig.failFastThreshold && processedBatches > 2) {
          this.logger.warn(`Bulk operation exceeding failure threshold: ${(failureRate * 100).toFixed(1)}%`);
          
          if (!this.bulkRetryConfig.partialSuccessAllowed) {
            throw new Error(`Bulk operation failed: failure rate ${(failureRate * 100).toFixed(1)}% exceeds threshold`);
          }
        }
      });
      
      await Promise.all(batchPromises);
    }
    
    const totalTime = performance.now() - startTime;
    const averageTime = totalTime / totalRequests;
    
    const summary = {
      totalRequests,
      successfulRequests,
      failedRequests,
      totalRetries,
      averageTime,
      partialSuccess: successfulRequests > 0 && failedRequests > 0,
    };
    
    this.logger.log('Bulk retry operation completed', {
      ...summary,
      totalTime: `${totalTime.toFixed(2)}ms`,
      successRate: `${((successfulRequests / totalRequests) * 100).toFixed(1)}%`,
    });
    
    return { results, summary };
  }

  /**
   * Get current retry and failover analytics
   * 
   * @returns Comprehensive retry analytics
   */
  getRetryAnalytics(): RetryAnalytics {
    return { ...this.retryAnalytics };
  }

  /**
   * Force endpoint health status (for testing/admin)
   * 
   * @param endpoint - Endpoint URL
   * @param healthy - Health status
   * @param reason - Reason for status change
   */
  forceEndpointHealth(endpoint: string, healthy: boolean, reason: string): void {
    const health = this.endpointHealth.get(endpoint);
    if (health) {
      health.healthy = healthy;
      health.lastCheck = new Date();
      
      this.logger.warn(`Endpoint health forced: ${endpoint} -> ${healthy ? 'HEALTHY' : 'UNHEALTHY'}`, {
        endpoint,
        healthy,
        reason,
        timestamp: new Date().toISOString(),
      });
      
      this.emit('endpointHealthChanged', {
        endpoint,
        healthy,
        reason: `FORCED: ${reason}`,
        timestamp: new Date(),
      });
    }
  }

  // ===== PRIVATE HELPER METHODS =====

  private getRetryConfig(riskLevel: RiskLevel): RetryConfig {
    const config = this.retryConfigs.get(riskLevel) ?? this.retryConfigs.get(RiskLevel.MEDIUM);
    if (!config) {
      // Fallback configuration if none found
      return {
        maxAttempts: 3,
        baseDelayMs: 1000,
        maxDelayMs: 10000,
        backoffMultiplier: 2,
        jitterMs: 100,
        timeoutMs: 30000,
        retryableErrors: ['TIMEOUT', 'NETWORK_ERROR', 'RATE_LIMIT'],
        circuitBreakerEnabled: true
      };
    }
    return config;
  }

  private getHealthyEndpoints(): FailoverEndpoint[] {
    return this.failoverEndpoints.filter(endpoint => {
      const health = this.endpointHealth.get(endpoint.url);
      return endpoint.enabled && (!health || health.healthy);
    });
  }

  private selectOptimalEndpoint(excludeEndpoints: string[]): FailoverEndpoint | null {
    const healthyEndpoints = this.getHealthyEndpoints()
      .filter(endpoint => !excludeEndpoints.includes(endpoint.url));
    
    if (healthyEndpoints.length === 0) {
      return null;
    }
    
    // Select based on priority and current load
    return healthyEndpoints.reduce((best, current) => {
      const currentHealth = this.endpointHealth.get(current.url);
      const bestHealth = this.endpointHealth.get(best.url);
      
      // Prioritize by priority first, then by load and response time
      if (current.priority < best.priority) return current;
      if (current.priority > best.priority) return best;
      
      // Same priority - select based on performance
      const currentLoad = currentHealth ? currentHealth.concurrentRequests / current.maxConcurrentRequests : 0;
      const bestLoad = bestHealth ? bestHealth.concurrentRequests / best.maxConcurrentRequests : 0;
      
      return currentLoad < bestLoad ? current : best;
    });
  }

  private shouldRetryError(error: Error, config: RetryConfig): boolean {
    const errorType = this.categorizeError(error);
    return config.retryOnErrors.includes(errorType);
  }

  private categorizeError(error: Error): string {
    const message = error.message.toLowerCase();
    
    if (message.includes('timeout') ?? message.includes('timed out')) {
      return 'TIMEOUT';
    }
    if (message.includes('connection') ?? message.includes('network')) {
      return 'CONNECTION_ERROR';
    }
    if (message.includes('rate limit') ?? message.includes('too many requests')) {
      return 'RATE_LIMITED';
    }
    if (message.includes('server error') ?? message.includes('internal error')) {
      return 'SERVER_ERROR';
    }
    
    return 'UNKNOWN_ERROR';
  }

  private calculateRetryDelay(attemptNumber: number, config: RetryConfig): number {
    if (config.baseDelayMs === 0) return 0;
    
    // Calculate exponential backoff
    let delay = config.baseDelayMs * Math.pow(config.exponentialBase, attemptNumber - 1);
    
    // Apply maximum delay limit
    delay = Math.min(delay, config.maxDelayMs);
    
    // Add jitter if enabled
    if (config.jitterEnabled) {
      const jitter = delay * 0.1 * Math.random(); // Up to 10% jitter
      delay += jitter;
    }
    
    return Math.floor(delay);
  }

  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    _operationId: string
  ): Promise<T> {
    return Promise.race([
      operation(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Operation timeout after ${timeoutMs}ms`)), timeoutMs)
      ),
    ]);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private updateSuccessAnalytics(attempts: number, totalTime: number, endpoint: string): void {
    this.retryAnalytics.totalRetries += (attempts - 1);
    this.retryAnalytics.successfulRetries++;
    
    // Update average retry count
    const totalOperations = this.retryAnalytics.successfulRetries + this.retryAnalytics.failedRetries;
    this.retryAnalytics.averageRetryCount = 
      (this.retryAnalytics.averageRetryCount * (totalOperations - 1) + (attempts - 1)) / totalOperations;
    
    // Update endpoint success rate
    const currentRate = this.retryAnalytics.endpointSuccessRates.get(endpoint) ?? 0;
    this.retryAnalytics.endpointSuccessRates.set(endpoint, currentRate + 1);
    
    // Update time distribution
    this.updateTimeDistribution(totalTime);
  }

  private updateFailureAnalytics(attempts: number, totalTime: number): void {
    this.retryAnalytics.totalRetries += (attempts - 1);
    this.retryAnalytics.failedRetries++;
    
    // Update average retry count
    const totalOperations = this.retryAnalytics.successfulRetries + this.retryAnalytics.failedRetries;
    this.retryAnalytics.averageRetryCount = 
      (this.retryAnalytics.averageRetryCount * (totalOperations - 1) + (attempts - 1)) / totalOperations;
    
    // Update time distribution
    this.updateTimeDistribution(totalTime);
  }

  private updateTimeDistribution(totalTime: number): void {
    if (totalTime < 100) {
      this.retryAnalytics.timeDistribution.immediate++;
    } else if (totalTime < 1000) {
      this.retryAnalytics.timeDistribution.fast++;
    } else if (totalTime < 5000) {
      this.retryAnalytics.timeDistribution.medium++;
    } else {
      this.retryAnalytics.timeDistribution.slow++;
    }
  }

  private updateEndpointHealth(endpoint: string, success: boolean, responseTime: number): void {
    const health = this.endpointHealth.get(endpoint);
    if (health) {
      if (success) {
        health.successCount++;
        health.healthy = true;
        health.errorCount = Math.max(0, health.errorCount - 1); // Gradual recovery
      } else {
        health.errorCount++;
        if (health.errorCount > 5) {
          health.healthy = false;
        }
      }
      
      health.responseTime = (health.responseTime + responseTime) / 2; // Moving average
      health.lastCheck = new Date();
    }
  }

  private assessDegradationNeed(): DegradationStrategy | null {
    const circuitStats = this.circuitBreakerService.getCircuitBreakerStats();
    
    if (circuitStats.state === CircuitBreakerState.OPEN) {
      return this.degradationStrategies.get('circuit_open') ?? null;
    }
    
    const healthyEndpoints = this.getHealthyEndpoints();
    if (healthyEndpoints.length === 0) {
      return this.degradationStrategies.get('all_endpoints_down') ?? null;
    }
    
    return null;
  }

  private async executeDegradedOperation<T>(
    request: ParlantValidationRequest,
    strategy: DegradationStrategy,
    startTime: number
  ): Promise<FailoverResult<T>> {
    const totalTime = performance.now() - startTime;
    
    this.logger.warn(`Executing in degraded mode: ${strategy.level}`, {
      operationId: request.operationId,
      strategy: strategy.level,
      cacheOnly: strategy.cacheOnly,
      allowBypass: strategy.allowBypass,
    });
    
    return {
      success: true,
      data: strategy.fallbackResponse as T, // Type assertion to match return type
      totalAttempts: 0,
      totalTime,
      failedEndpoints: [],
      retryAttempts: [],
      degradedMode: true,
      fallbackUsed: true,
    };
  }

  private async attemptFallbackResponse(request: ParlantValidationRequest): Promise<{
    degradedMode: boolean;
    fallbackUsed: boolean;
    data?: unknown;
  }> {
    // Try cache-only response for low-risk operations
    if (request.riskLevel === RiskLevel.MINIMAL || request.riskLevel === RiskLevel.LOW) {
      return {
        degradedMode: true,
        fallbackUsed: true,
        data: this.createFallbackResponse(),
      };
    }
    
    return {
      degradedMode: false,
      fallbackUsed: false,
    };
  }

  private createFallbackResponse(): ParlantValidationResponse {
    return {
      approved: false,
      conversationId: `fallback_${Date.now()}`,
      validationTimestamp: new Date(),
      reasoning: 'Fallback response due to service degradation - operation blocked for safety',
      confidence: 0,
      suggestedAlternatives: ['Retry operation later', 'Contact system administrator'],
    };
  }

  private createEmergencyFallbackResponse(): ParlantValidationResponse {
    return {
      approved: false,
      conversationId: `emergency_${Date.now()}`,
      validationTimestamp: new Date(),
      reasoning: 'Emergency fallback - validation service unavailable',
      confidence: 0,
      suggestedAlternatives: ['Service temporarily unavailable', 'Retry in a few minutes'],
    };
  }

  private sortRequestsByPriority(requests: ParlantValidationRequest[]): ParlantValidationRequest[] {
    const priorityOrder = [RiskLevel.CRITICAL, RiskLevel.HIGH, RiskLevel.MEDIUM, RiskLevel.LOW, RiskLevel.MINIMAL];
    
    return requests.sort((a, b) => {
      const aPriority = priorityOrder.indexOf(a.riskLevel);
      const bPriority = priorityOrder.indexOf(b.riskLevel);
      return aPriority - bPriority;
    });
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private initializeEndpointHealth(): void {
    this.failoverEndpoints.forEach(endpoint => {
      this.endpointHealth.set(endpoint.url, {
        healthy: true,
        responseTime: 0,
        errorCount: 0,
        successCount: 0,
        concurrentRequests: 0,
        lastCheck: new Date(),
      });
    });
  }

  private startHealthMonitoring(): void {
    setInterval(async () => {
      for (const endpoint of this.failoverEndpoints) {
        try {
          const startTime = performance.now();
          
          // TODO: Implement actual health check
          // const response = await fetch(`${endpoint.url}/health`, { timeout: 5000 });
          const responseTime = performance.now() - startTime;
          
          this.updateEndpointHealth(endpoint.url, true, responseTime);
          
        } catch (error) {
          this.updateEndpointHealth(endpoint.url, false, 0);
          this.logger.debug(`Health check failed for ${endpoint.url}:`, error);
        }
      }
    }, 30000); // Every 30 seconds

    // Log analytics every 5 minutes
    setInterval(() => {
      this.logger.log('Retry & Failover Analytics', this.getRetryAnalytics());
    }, 5 * 60 * 1000);
  }

  private handleCircuitBreakerStateChange(event: { previousState: string; newState: string; timestamp: Date; failureCount?: number; lastFailure?: Date }): void {
    this.logger.log(`Circuit breaker state changed: ${event.previousState} -> ${event.newState}`, {
      previousState: event.previousState,
      newState: event.newState,
      timestamp: event.timestamp,
    });
    
    // Trigger degradation assessment if circuit opens
    if (event.newState === CircuitBreakerState.OPEN) {
      this.emit('degradationTriggered', {
        reason: 'circuit_breaker_open',
        timestamp: new Date(),
      });
    }
  }
}