/**
 * PARLANT Concurrent Validation Testing Framework
 *
 * Specialized testing framework for validating PARLANT conversational AI
 * validation capabilities under high concurrency scenarios. Ensures proper
 * validation processing, response accuracy, and performance under load.
 *
 * Key Testing Areas:
 * - Concurrent validation request processing
 * - Validation accuracy under high load
 * - Response time consistency across sessions
 * - Validation state isolation between sessions
 * - PARLANT service resilience under concurrent load
 * - Conversation context preservation during validation
 * - Error handling and recovery in concurrent scenarios
 *
 * @author Claude Code
 * @version 1.0.0
 */

import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';
import {
  ConversationalMessage,
  ConversationalMessageType,
  ValidationRequestMessage,
  ValidationAction,
  ValidationContext,
} from '../../src/common/websocket/conversational-websocket-bridge.service';

// ===== PARLANT VALIDATION TESTING TYPES =====

/**
 * PARLANT validation test configuration
 */
export interface ParlantValidationTestConfig {
  maxConcurrentValidations: number;
  validationTimeout: number; // milliseconds
  expectedResponseTime: number; // milliseconds
  validationAccuracyThreshold: number; // 0.0 to 1.0
  retryAttempts: number;
  enableAccuracyTesting: boolean;
  enablePerformanceTesting: boolean;
  enableResilienceTesting: boolean;
  enableStateIsolationTesting: boolean;
  validationComplexity: 'simple' | 'moderate' | 'complex' | 'mixed';
  conversationContextDepth: number;
}

/**
 * Validation test case definition
 */
export interface ValidationTestCase {
  testId: string;
  sessionId: string;
  action: ValidationAction;
  context: ValidationContext;
  expectedResult: 'approved' | 'rejected' | 'conditional';
  expectedConfidence: number; // 0.0 to 1.0
  complexity: 'simple' | 'moderate' | 'complex';
  validationTimeout: number;
  conversationHistory: ConversationalMessage[];
}

/**
 * Validation test result
 */
export interface ValidationTestResult {
  testId: string;
  sessionId: string;
  requestTimestamp: number;
  responseTimestamp?: number;
  responseTime?: number;
  actualResult?: 'approved' | 'rejected' | 'conditional' | 'timeout' | 'error';
  actualConfidence?: number;
  accuracy: boolean;
  performanceCompliant: boolean;
  errorMessage?: string;
  conversationContextPreserved: boolean;
  validationDetails: {
    reasoning?: string;
    conversationalResponse?: string;
    conditions?: Array<{ condition: string; description: string }>;
  };
}

/**
 * Concurrent validation test results
 */
export interface ConcurrentValidationTestResults {
  testConfiguration: ParlantValidationTestConfig;
  testDuration: number;
  totalValidations: number;
  successfulValidations: number;
  failedValidations: number;
  timedOutValidations: number;
  accuracyScore: number; // 0.0 to 1.0
  performanceScore: number; // 0.0 to 1.0
  resilienceScore: number; // 0.0 to 1.0
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  throughput: number; // validations per second
  concurrencyEfficiency: number; // 0.0 to 1.0
  validationResults: ValidationTestResult[];
  performanceBottlenecks: string[];
  recommendations: string[];
}

/**
 * PARLANT service mock for testing
 */
export interface ParlantServiceMock {
  processValidation(request: ValidationTestCase): Promise<ValidationTestResult>;
  getServiceHealth(): { status: 'healthy' | 'degraded' | 'unhealthy'; responseTime: number };
  simulateLoad(concurrency: number): Promise<void>;
  reset(): void;
}

// ===== PARLANT VALIDATION TESTER =====

/**
 * ParlantConcurrentValidationTester
 *
 * Comprehensive testing framework for validating PARLANT conversational AI
 * capabilities under concurrent load scenarios.
 */
export class ParlantConcurrentValidationTester extends EventEmitter {
  private activeValidations = new Map<string, ValidationTestCase>();
  private validationResults: ValidationTestResult[] = [];
  private testStartTime = 0;
  private testEndTime = 0;
  private parlantServiceMock: ParlantServiceMock;

  constructor(
    private config: ParlantValidationTestConfig,
    parlantServiceMock?: ParlantServiceMock
  ) {
    super();
    this.parlantServiceMock = parlantServiceMock || this.createDefaultServiceMock();
  }

  /**
   * Execute comprehensive concurrent validation testing
   */
  async executeConcurrentValidationTest(): Promise<ConcurrentValidationTestResults> {
    this.testStartTime = performance.now();
    this.validationResults = [];
    this.activeValidations.clear();

    this.emit('testStarted', {
      timestamp: Date.now(),
      config: this.config,
    });

    try {
      // Phase 1: Generate test cases
      const testCases = await this.generateValidationTestCases();

      // Phase 2: Execute concurrent validations
      await this.executeConcurrentValidations(testCases);

      // Phase 3: Analyze results
      const results = await this.analyzeValidationResults();

      this.testEndTime = performance.now();

      this.emit('testCompleted', {
        timestamp: Date.now(),
        results,
      });

      return results;

    } catch (error) {
      this.emit('testError', {
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Generate comprehensive validation test cases
   */
  private async generateValidationTestCases(): Promise<ValidationTestCase[]> {
    const testCases: ValidationTestCase[] = [];

    for (let i = 0; i < this.config.maxConcurrentValidations; i++) {
      const sessionId = `validation_session_${i.toString().padStart(4, '0')}`;
      const testId = `validation_test_${Date.now()}_${i}`;

      const complexity = this.getValidationComplexity(i);
      const testCase = await this.createValidationTestCase(testId, sessionId, complexity, i);

      testCases.push(testCase);
    }

    this.emit('testCasesGenerated', {
      timestamp: Date.now(),
      count: testCases.length,
      complexityDistribution: this.getComplexityDistribution(testCases),
    });

    return testCases;
  }

  /**
   * Get validation complexity for test case
   */
  private getValidationComplexity(index: number): 'simple' | 'moderate' | 'complex' {
    switch (this.config.validationComplexity) {
      case 'simple':
        return 'simple';
      case 'moderate':
        return 'moderate';
      case 'complex':
        return 'complex';
      case 'mixed':
        // Distribute complexity evenly
        const remainder = index % 3;
        return remainder === 0 ? 'simple' : remainder === 1 ? 'moderate' : 'complex';
      default:
        return 'moderate';
    }
  }

  /**
   * Create a validation test case
   */
  private async createValidationTestCase(
    testId: string,
    sessionId: string,
    complexity: 'simple' | 'moderate' | 'complex',
    index: number
  ): Promise<ValidationTestCase> {
    const action = this.createValidationAction(complexity, index);
    const context = this.createValidationContext(sessionId, index);
    const conversationHistory = this.createConversationHistory(sessionId, complexity);

    // Determine expected result based on action complexity and risk
    const expectedResult = this.determineExpectedResult(action, complexity);
    const expectedConfidence = this.calculateExpectedConfidence(action, complexity);

    return {
      testId,
      sessionId,
      action,
      context,
      expectedResult,
      expectedConfidence,
      complexity,
      validationTimeout: this.config.validationTimeout,
      conversationHistory,
    };
  }

  /**
   * Create validation action based on complexity
   */
  private createValidationAction(complexity: 'simple' | 'moderate' | 'complex', index: number): ValidationAction {
    const actionTypes = {
      simple: ['read_file', 'list_directory', 'get_status'],
      moderate: ['write_file', 'create_directory', 'send_email'],
      complex: ['delete_database', 'modify_permissions', 'execute_script'],
    };

    const actionType = actionTypes[complexity][index % actionTypes[complexity].length];

    return {
      actionType,
      actionId: `action_${complexity}_${index}`,
      description: `${complexity} validation test action: ${actionType}`,
      parameters: this.generateActionParameters(actionType, complexity),
      reversible: complexity === 'simple',
      impact: {
        scope: complexity === 'simple' ? 'local' : complexity === 'moderate' ? 'limited' : 'external',
        severity: complexity === 'simple' ? 'low' : complexity === 'moderate' ? 'medium' : 'high',
        confidence: 0.8 + (complexity === 'simple' ? 0.15 : complexity === 'moderate' ? 0.1 : 0.0),
      },
    };
  }

  /**
   * Generate action parameters based on type and complexity
   */
  private generateActionParameters(actionType: string, complexity: string): Record<string, unknown> {
    const baseParams = {
      testMode: true,
      complexity,
      timestamp: Date.now(),
    };

    switch (actionType) {
      case 'read_file':
        return { ...baseParams, filePath: '/test/documents/sample.txt', encoding: 'utf8' };
      case 'write_file':
        return { ...baseParams, filePath: '/test/output/result.txt', content: 'Test content', append: false };
      case 'delete_database':
        return { ...baseParams, database: 'test_db', confirmDeletion: true, backupFirst: true };
      case 'send_email':
        return { ...baseParams, recipient: 'test@example.com', subject: 'Test Email', body: 'Test content' };
      case 'execute_script':
        return { ...baseParams, scriptPath: '/test/scripts/validation.sh', arguments: ['--test', '--safe'] };
      default:
        return baseParams;
    }
  }

  /**
   * Create validation context
   */
  private createValidationContext(sessionId: string, index: number): ValidationContext {
    return {
      userId: `test_user_${index % 10}`, // Distribute across 10 users
      requestId: `request_${sessionId}_${Date.now()}`,
      timestamp: Date.now(),
      source: 'concurrent_test',
      environment: 'test',
      sessionContext: {
        sessionId,
        conversationId: `conv_${sessionId}`,
        clientId: `client_${sessionId}`,
        testScenario: 'concurrent_validation',
      },
    };
  }

  /**
   * Create conversation history for context
   */
  private createConversationHistory(sessionId: string, complexity: string): ConversationalMessage[] {
    const historyDepth = Math.min(this.config.conversationContextDepth,
      complexity === 'simple' ? 3 : complexity === 'moderate' ? 7 : 12);

    const history: ConversationalMessage[] = [];

    for (let i = 0; i < historyDepth; i++) {
      history.push({
        type: ConversationalMessageType.HEARTBEAT,
        messageId: `history_${sessionId}_${i}`,
        sessionId,
        timestamp: Date.now() - (historyDepth - i) * 1000,
        sequence: i + 1,
        payload: {
          messageType: 'conversation_context',
          content: `Historical context message ${i + 1} for ${complexity} validation`,
          contextRelevance: 0.8 - (i * 0.1),
        },
        metadata: {
          priority: 'low',
          requiresAck: false,
          compression: false,
          routingHints: ['conversation_history'],
        },
      });
    }

    return history;
  }

  /**
   * Determine expected validation result
   */
  private determineExpectedResult(
    action: ValidationAction,
    complexity: string
  ): 'approved' | 'rejected' | 'conditional' {
    // Simple heuristic for test expectations
    if (complexity === 'simple' && action.reversible) {
      return 'approved';
    }

    if (complexity === 'complex' && action.impact.severity === 'high') {
      return action.impact.scope === 'external' ? 'rejected' : 'conditional';
    }

    if (complexity === 'moderate') {
      return 'conditional';
    }

    return 'approved';
  }

  /**
   * Calculate expected confidence level
   */
  private calculateExpectedConfidence(action: ValidationAction, complexity: string): number {
    let baseConfidence = action.impact.confidence;

    // Adjust based on complexity
    switch (complexity) {
      case 'simple':
        baseConfidence += 0.1;
        break;
      case 'complex':
        baseConfidence -= 0.15;
        break;
    }

    return Math.max(0.5, Math.min(1.0, baseConfidence));
  }

  /**
   * Execute concurrent validations
   */
  private async executeConcurrentValidations(testCases: ValidationTestCase[]): Promise<void> {
    this.emit('validationStarted', {
      timestamp: Date.now(),
      totalValidations: testCases.length,
    });

    // Execute validations in batches to control concurrency
    const batchSize = Math.min(50, this.config.maxConcurrentValidations);
    const batches = [];

    for (let i = 0; i < testCases.length; i += batchSize) {
      batches.push(testCases.slice(i, i + batchSize));
    }

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];

      this.emit('batchStarted', {
        timestamp: Date.now(),
        batchIndex: batchIndex + 1,
        totalBatches: batches.length,
        batchSize: batch.length,
      });

      // Execute batch concurrently
      const batchPromises = batch.map(testCase => this.executeValidationTest(testCase));
      await Promise.allSettled(batchPromises);

      this.emit('batchCompleted', {
        timestamp: Date.now(),
        batchIndex: batchIndex + 1,
        completedValidations: this.validationResults.length,
      });

      // Small delay between batches to prevent overwhelming
      if (batchIndex < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    this.emit('validationCompleted', {
      timestamp: Date.now(),
      totalResults: this.validationResults.length,
    });
  }

  /**
   * Execute individual validation test
   */
  private async executeValidationTest(testCase: ValidationTestCase): Promise<ValidationTestResult> {
    this.activeValidations.set(testCase.testId, testCase);

    const startTime = performance.now();
    let result: ValidationTestResult;

    try {
      // Simulate PARLANT validation processing
      result = await this.parlantServiceMock.processValidation(testCase);

      // Calculate performance metrics
      result.responseTime = performance.now() - startTime;
      result.performanceCompliant = result.responseTime <= this.config.expectedResponseTime;

      // Check accuracy
      result.accuracy = this.validateAccuracy(testCase, result);

      // Check conversation context preservation
      result.conversationContextPreserved = this.validateConversationContext(testCase, result);

    } catch (error) {
      result = {
        testId: testCase.testId,
        sessionId: testCase.sessionId,
        requestTimestamp: Date.now() - (performance.now() - startTime),
        responseTime: performance.now() - startTime,
        actualResult: 'error',
        accuracy: false,
        performanceCompliant: false,
        errorMessage: error instanceof Error ? error.message : String(error),
        conversationContextPreserved: false,
        validationDetails: {},
      };
    }

    this.validationResults.push(result);
    this.activeValidations.delete(testCase.testId);

    this.emit('validationResult', {
      timestamp: Date.now(),
      testId: testCase.testId,
      result: result.actualResult,
      responseTime: result.responseTime,
      accuracy: result.accuracy,
    });

    return result;
  }

  /**
   * Validate accuracy of validation result
   */
  private validateAccuracy(testCase: ValidationTestCase, result: ValidationTestResult): boolean {
    if (!result.actualResult || result.actualResult === 'error' || result.actualResult === 'timeout') {
      return false;
    }

    // Check if result matches expected
    const resultMatches = result.actualResult === testCase.expectedResult;

    // Check if confidence is within acceptable range
    const confidenceAcceptable = result.actualConfidence ?
      Math.abs(result.actualConfidence - testCase.expectedConfidence) <= 0.2 : false;

    return resultMatches && confidenceAcceptable;
  }

  /**
   * Validate conversation context preservation
   */
  private validateConversationContext(testCase: ValidationTestCase, result: ValidationTestResult): boolean {
    // Check if validation response references conversation context appropriately
    if (result.validationDetails.conversationalResponse) {
      const response = result.validationDetails.conversationalResponse;

      // Simple heuristic: response should be contextually appropriate
      const contextualKeywords = ['conversation', 'discussed', 'mentioned', 'context'];
      const hasContextualReferences = contextualKeywords.some(keyword =>
        response.toLowerCase().includes(keyword));

      return hasContextualReferences || testCase.complexity === 'simple';
    }

    return true; // Default to true if no conversational response
  }

  /**
   * Analyze validation test results
   */
  private async analyzeValidationResults(): Promise<ConcurrentValidationTestResults> {
    const testDuration = this.testEndTime - this.testStartTime;

    // Calculate basic metrics
    const totalValidations = this.validationResults.length;
    const successfulValidations = this.validationResults.filter(r =>
      r.actualResult && ['approved', 'rejected', 'conditional'].includes(r.actualResult)).length;
    const failedValidations = this.validationResults.filter(r => r.actualResult === 'error').length;
    const timedOutValidations = this.validationResults.filter(r => r.actualResult === 'timeout').length;

    // Calculate accuracy score
    const accurateResults = this.validationResults.filter(r => r.accuracy).length;
    const accuracyScore = totalValidations > 0 ? accurateResults / totalValidations : 0;

    // Calculate performance score
    const performantResults = this.validationResults.filter(r => r.performanceCompliant).length;
    const performanceScore = totalValidations > 0 ? performantResults / totalValidations : 0;

    // Calculate resilience score (ability to handle load without errors)
    const resilienceScore = totalValidations > 0 ? successfulValidations / totalValidations : 0;

    // Calculate response time metrics
    const responseTimes = this.validationResults
      .filter(r => r.responseTime)
      .map(r => r.responseTime!)
      .sort((a, b) => a - b);

    const averageResponseTime = responseTimes.length > 0 ?
      responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length : 0;

    const p95ResponseTime = responseTimes.length > 0 ?
      responseTimes[Math.floor(responseTimes.length * 0.95)] : 0;

    const p99ResponseTime = responseTimes.length > 0 ?
      responseTimes[Math.floor(responseTimes.length * 0.99)] : 0;

    // Calculate throughput
    const throughput = testDuration > 0 ? (successfulValidations / testDuration) * 1000 : 0;

    // Calculate concurrency efficiency
    const theoreticalMaxThroughput = this.config.maxConcurrentValidations / (this.config.expectedResponseTime / 1000);
    const concurrencyEfficiency = theoreticalMaxThroughput > 0 ? throughput / theoreticalMaxThroughput : 0;

    // Identify performance bottlenecks
    const performanceBottlenecks = this.identifyPerformanceBottlenecks();

    // Generate recommendations
    const recommendations = this.generateValidationRecommendations({
      accuracyScore,
      performanceScore,
      resilienceScore,
      averageResponseTime,
      throughput,
      concurrencyEfficiency,
    });

    return {
      testConfiguration: this.config,
      testDuration,
      totalValidations,
      successfulValidations,
      failedValidations,
      timedOutValidations,
      accuracyScore,
      performanceScore,
      resilienceScore,
      averageResponseTime,
      p95ResponseTime,
      p99ResponseTime,
      throughput,
      concurrencyEfficiency,
      validationResults: this.validationResults,
      performanceBottlenecks,
      recommendations,
    };
  }

  /**
   * Identify performance bottlenecks
   */
  private identifyPerformanceBottlenecks(): string[] {
    const bottlenecks: string[] = [];

    // Analyze response time distribution
    const responseTimes = this.validationResults
      .filter(r => r.responseTime)
      .map(r => r.responseTime!);

    if (responseTimes.length > 0) {
      const averageTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      const maxTime = Math.max(...responseTimes);

      if (averageTime > this.config.expectedResponseTime * 1.5) {
        bottlenecks.push('average_response_time_high');
      }

      if (maxTime > this.config.expectedResponseTime * 3) {
        bottlenecks.push('maximum_response_time_excessive');
      }

      // Check for response time variance
      const variance = responseTimes.reduce((sum, time) => sum + Math.pow(time - averageTime, 2), 0) / responseTimes.length;
      const standardDeviation = Math.sqrt(variance);

      if (standardDeviation > averageTime * 0.5) {
        bottlenecks.push('response_time_inconsistent');
      }
    }

    // Analyze failure patterns
    const errorRate = this.validationResults.filter(r => r.actualResult === 'error').length / this.validationResults.length;
    if (errorRate > 0.05) { // 5% error rate threshold
      bottlenecks.push('high_error_rate');
    }

    const timeoutRate = this.validationResults.filter(r => r.actualResult === 'timeout').length / this.validationResults.length;
    if (timeoutRate > 0.02) { // 2% timeout rate threshold
      bottlenecks.push('high_timeout_rate');
    }

    return bottlenecks;
  }

  /**
   * Generate validation recommendations
   */
  private generateValidationRecommendations(metrics: {
    accuracyScore: number;
    performanceScore: number;
    resilienceScore: number;
    averageResponseTime: number;
    throughput: number;
    concurrencyEfficiency: number;
  }): string[] {
    const recommendations: string[] = [];

    // Accuracy recommendations
    if (metrics.accuracyScore < this.config.validationAccuracyThreshold) {
      recommendations.push('Improve validation accuracy through better training data and model tuning');
      recommendations.push('Review validation logic for edge cases and complex scenarios');
    }

    // Performance recommendations
    if (metrics.performanceScore < 0.8) {
      recommendations.push('Optimize validation processing pipeline for better response times');
      recommendations.push('Consider implementing validation result caching for similar requests');
    }

    // Resilience recommendations
    if (metrics.resilienceScore < 0.9) {
      recommendations.push('Implement better error handling and recovery mechanisms');
      recommendations.push('Add circuit breaker patterns for external service dependencies');
    }

    // Concurrency recommendations
    if (metrics.concurrencyEfficiency < 0.7) {
      recommendations.push('Optimize concurrent request handling and resource allocation');
      recommendations.push('Consider implementing request queuing and load balancing');
    }

    // Throughput recommendations
    if (metrics.throughput < this.config.maxConcurrentValidations * 0.8) {
      recommendations.push('Scale validation processing capacity to handle higher throughput');
      recommendations.push('Implement parallel processing for independent validation tasks');
    }

    return recommendations;
  }

  /**
   * Get complexity distribution of test cases
   */
  private getComplexityDistribution(testCases: ValidationTestCase[]): Record<string, number> {
    const distribution: Record<string, number> = { simple: 0, moderate: 0, complex: 0 };

    testCases.forEach(testCase => {
      distribution[testCase.complexity]++;
    });

    return distribution;
  }

  /**
   * Create default PARLANT service mock
   */
  private createDefaultServiceMock(): ParlantServiceMock {
    return {
      async processValidation(request: ValidationTestCase): Promise<ValidationTestResult> {
        // Simulate processing time based on complexity
        const processingTime = {
          simple: 200 + Math.random() * 300,    // 200-500ms
          moderate: 500 + Math.random() * 700,  // 500-1200ms
          complex: 1000 + Math.random() * 1500, // 1000-2500ms
        }[request.complexity];

        await new Promise(resolve => setTimeout(resolve, processingTime));

        // Simulate validation logic
        const result: ValidationTestResult = {
          testId: request.testId,
          sessionId: request.sessionId,
          requestTimestamp: Date.now() - processingTime,
          responseTimestamp: Date.now(),
          actualResult: request.expectedResult,
          actualConfidence: request.expectedConfidence + (Math.random() - 0.5) * 0.1,
          accuracy: true, // Will be calculated by tester
          performanceCompliant: true, // Will be calculated by tester
          conversationContextPreserved: true, // Will be calculated by tester
          validationDetails: {
            reasoning: `Validation completed for ${request.action.actionType} with ${request.complexity} complexity`,
            conversationalResponse: `Based on our conversation, I ${request.expectedResult === 'approved' ? 'approve' : 'recommend caution for'} this ${request.action.actionType} action.`,
            conditions: request.expectedResult === 'conditional' ? [
              { condition: 'user_confirmation', description: 'Requires explicit user confirmation' }
            ] : undefined,
          },
        };

        // Simulate occasional errors (5% rate)
        if (Math.random() < 0.05) {
          result.actualResult = 'error';
          result.errorMessage = 'Simulated validation service error';
          result.accuracy = false;
        }

        // Simulate occasional timeouts (2% rate)
        if (Math.random() < 0.02) {
          result.actualResult = 'timeout';
          result.accuracy = false;
        }

        return result;
      },

      getServiceHealth(): { status: 'healthy' | 'degraded' | 'unhealthy'; responseTime: number } {
        return {
          status: 'healthy',
          responseTime: 50 + Math.random() * 100,
        };
      },

      async simulateLoad(concurrency: number): Promise<void> {
        // Simulate load on the service
        await new Promise(resolve => setTimeout(resolve, concurrency * 10));
      },

      reset(): void {
        // Reset service state
      }
    };
  }

  /**
   * Get current test status
   */
  getTestStatus(): {
    active: boolean;
    progress: number;
    completed: number;
    active_validations: number;
    duration: number;
  } {
    const totalValidations = this.config.maxConcurrentValidations;
    const completed = this.validationResults.length;
    const activeValidations = this.activeValidations.size;
    const progress = totalValidations > 0 ? completed / totalValidations : 0;
    const duration = this.testStartTime > 0 ? performance.now() - this.testStartTime : 0;

    return {
      active: activeValidations > 0 || (this.testStartTime > 0 && this.testEndTime === 0),
      progress,
      completed,
      active_validations: activeValidations,
      duration,
    };
  }

  /**
   * Get real-time validation metrics
   */
  getRealTimeMetrics(): {
    accuracy: number;
    averageResponseTime: number;
    throughput: number;
    errorRate: number;
    recentResults: ValidationTestResult[];
  } {
    const recentResults = this.validationResults.slice(-20); // Last 20 results
    const accurateResults = recentResults.filter(r => r.accuracy).length;
    const accuracy = recentResults.length > 0 ? accurateResults / recentResults.length : 0;

    const responseTimes = recentResults.filter(r => r.responseTime).map(r => r.responseTime!);
    const averageResponseTime = responseTimes.length > 0 ?
      responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length : 0;

    const currentTime = performance.now();
    const recentTimeWindow = 10000; // 10 seconds
    const recentValidations = this.validationResults.filter(r =>
      r.responseTimestamp && (currentTime - (r.responseTimestamp - this.testStartTime)) <= recentTimeWindow);
    const throughput = recentValidations.length / (recentTimeWindow / 1000);

    const errorResults = recentResults.filter(r => r.actualResult === 'error').length;
    const errorRate = recentResults.length > 0 ? errorResults / recentResults.length : 0;

    return {
      accuracy,
      averageResponseTime,
      throughput,
      errorRate,
      recentResults,
    };
  }
}