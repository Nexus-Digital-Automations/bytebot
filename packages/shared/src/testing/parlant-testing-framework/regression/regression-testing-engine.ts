/**
 * PARLANT Regression Testing Engine
 *
 * Comprehensive regression testing system for automated testing of all 1,520+
 * database functions with baseline comparison, change detection, and automated
 * validation against known good states.
 *
 * @fileoverview Regression testing engine for PARLANT testing framework
 * @version 1.0.0
 * @author PARLANT Testing Framework Agent
 * @created 2025-09-20
 */

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { DatabaseFunction, TestCategory } from '../types/framework.types';
import {
  RegressionTestConfig,
  RegressionTestResult,
  RegressionTestStatus,
  RegressionBaseline,
  RegressionTestSuite,
  ChangeDetectionResult,
  BaselineComparison,
  RegressionTestExecution,
  FunctionRegressionTest,
  RegressionAlert,
  RegressionAlertType,
  ChangeType
} from '../types/regression-testing.types';
import { ParallelExecutionManager } from '../core/parallel-execution-manager';
import { AutomatedTestGenerator } from '../generators/automated-test-generator';

/**
 * Regression test execution context
 */
export interface RegressionExecutionContext {
  /** Execution identifier */
  executionId: string;

  /** Test environment */
  environment: 'development' | 'staging' | 'production' | 'regression';

  /** Baseline reference */
  baselineId: string;

  /** Functions to test */
  functions: DatabaseFunction[];

  /** Execution configuration */
  config: RegressionTestConfig;

  /** Metadata */
  metadata: {
    triggeredBy: 'MANUAL' | 'AUTOMATED' | 'CI_CD' | 'SCHEDULED';
    commitHash?: string;
    branch?: string;
    timestamp: Date;
  };
}

/**
 * Baseline storage and management
 */
export interface BaselineStorage {
  /** Store new baseline */
  storeBaseline(baseline: RegressionBaseline): Promise<void>;

  /** Retrieve baseline by ID */
  getBaseline(baselineId: string): Promise<RegressionBaseline | null>;

  /** List available baselines */
  listBaselines(): Promise<RegressionBaseline[]>;

  /** Update baseline */
  updateBaseline(baselineId: string, updates: Partial<RegressionBaseline>): Promise<void>;

  /** Delete baseline */
  deleteBaseline(baselineId: string): Promise<void>;
}

/**
 * Comprehensive regression testing engine
 */
@Injectable()
export class RegressionTestingEngine extends EventEmitter {
  private readonly logger = new Logger(RegressionTestingEngine.name);
  private readonly executionHistory: Map<string, RegressionTestExecution> = new Map();
  private readonly activeExecutions: Map<string, RegressionExecutionContext> = new Map();
  private readonly baselineStorage: BaselineStorage;

  constructor(
    private readonly parallelExecutionManager: ParallelExecutionManager,
    private readonly testGenerator: AutomatedTestGenerator,
    private readonly config: RegressionTestConfig,
    baselineStorage?: BaselineStorage
  ) {
    super();
    this.baselineStorage = baselineStorage || new FileBasedBaselineStorage();
    this.setupEventListeners();
  }

  // ============================================================================
  // Regression Test Execution
  // ============================================================================

  /**
   * Execute comprehensive regression testing for all functions
   */
  async executeRegressionTests(
    functions: DatabaseFunction[],
    executionContext: Partial<RegressionExecutionContext> = {}
  ): Promise<RegressionTestResult> {
    const startTime = Date.now();
    const executionId = executionContext.executionId || `regression_${Date.now()}`;

    this.logger.log(`Starting regression test execution: ${executionId} for ${functions.length} functions`);

    try {
      // Create execution context
      const context: RegressionExecutionContext = {
        executionId,
        environment: executionContext.environment || 'regression',
        baselineId: executionContext.baselineId || await this.getLatestBaselineId(),
        functions,
        config: this.config,
        metadata: {
          triggeredBy: executionContext.metadata?.triggeredBy || 'MANUAL',
          commitHash: executionContext.metadata?.commitHash,
          branch: executionContext.metadata?.branch,
          timestamp: new Date()
        }
      };

      // Store active execution
      this.activeExecutions.set(executionId, context);

      // Load baseline for comparison
      const baseline = await this.loadBaseline(context.baselineId);
      if (!baseline) {
        throw new Error(`Baseline not found: ${context.baselineId}`);
      }

      // Generate regression tests for all functions
      const regressionTestSuite = await this.generateRegressionTestSuite(functions, baseline);

      // Execute tests in parallel
      const testResults = await this.executeTestSuiteInParallel(regressionTestSuite, context);

      // Perform change detection analysis
      const changeDetection = await this.performChangeDetection(testResults, baseline);

      // Generate baseline comparison
      const baselineComparison = await this.generateBaselineComparison(testResults, baseline);

      // Analyze regression alerts
      const regressionAlerts = await this.analyzeRegressionAlerts(changeDetection, baselineComparison);

      // Create comprehensive result
      const regressionResult: RegressionTestResult = {
        executionId,
        timestamp: new Date(),
        duration: Date.now() - startTime,
        status: this.determineExecutionStatus(testResults, regressionAlerts),
        functionsTestested: functions.length,
        testsExecuted: testResults.length,
        testsPassed: testResults.filter(r => r.status === 'PASSED').length,
        testsFailed: testResults.filter(r => r.status === 'FAILED').length,
        testsSkipped: testResults.filter(r => r.status === 'SKIPPED').length,
        baselineComparison,
        changeDetection,
        regressionAlerts,
        testResults,
        summary: this.generateExecutionSummary(testResults, changeDetection, regressionAlerts),
        metadata: context.metadata
      };

      // Store execution result
      this.storeExecutionResult(executionId, regressionResult);

      // Update baseline if configured
      if (this.config.autoUpdateBaseline && regressionResult.status === 'PASSED') {
        await this.updateBaseline(baseline, regressionResult);
      }

      // Emit completion event
      this.emit('regression:completed', {
        executionId,
        status: regressionResult.status,
        duration: regressionResult.duration,
        alertCount: regressionAlerts.length,
        changeCount: changeDetection.changesDetected.length
      });

      this.logger.log(`Regression testing completed: ${executionId} in ${regressionResult.duration}ms`);
      return regressionResult;

    } catch (error) {
      this.logger.error(`Regression testing failed: ${error.message}`, error.stack);

      // Create failure result
      const failureResult: RegressionTestResult = {
        executionId,
        timestamp: new Date(),
        duration: Date.now() - startTime,
        status: RegressionTestStatus.ERROR,
        functionsTestested: functions.length,
        testsExecuted: 0,
        testsPassed: 0,
        testsFailed: 0,
        testsSkipped: 0,
        baselineComparison: null,
        changeDetection: null,
        regressionAlerts: [],
        testResults: [],
        summary: `Regression testing failed: ${error.message}`,
        metadata: executionContext.metadata || { triggeredBy: 'MANUAL', timestamp: new Date() },
        error: error.message
      };

      this.storeExecutionResult(executionId, failureResult);
      throw new Error(`Regression testing failed: ${error.message}`);

    } finally {
      // Cleanup active execution
      this.activeExecutions.delete(executionId);
    }
  }

  /**
   * Generate regression test suite for functions
   */
  private async generateRegressionTestSuite(
    functions: DatabaseFunction[],
    baseline: RegressionBaseline
  ): Promise<RegressionTestSuite> {
    const startTime = Date.now();

    try {
      const regressionTests: FunctionRegressionTest[] = [];

      // Generate regression tests for each function
      for (const func of functions) {
        const baselineTest = baseline.functionTests.find(t => t.functionName === func.name);

        const regressionTest: FunctionRegressionTest = {
          functionName: func.name,
          testType: 'REGRESSION',
          baselineResult: baselineTest?.expectedResult,
          testScenarios: await this.generateFunctionTestScenarios(func, baselineTest),
          validationCriteria: this.createValidationCriteria(func, baselineTest),
          changeDetectors: this.createChangeDetectors(func),
          executionConfig: {
            timeout: this.config.testTimeout,
            retryCount: this.config.maxRetries,
            parallelExecution: true
          }
        };

        regressionTests.push(regressionTest);
      }

      const testSuite: RegressionTestSuite = {
        suiteId: `regression_suite_${Date.now()}`,
        name: 'PARLANT Comprehensive Regression Test Suite',
        description: `Regression testing for ${functions.length} database functions`,
        baselineId: baseline.baselineId,
        regressionTests,
        executionConfig: {
          parallelExecution: this.config.parallelExecution,
          maxConcurrency: this.config.maxConcurrency,
          batchSize: this.config.batchSize,
          failFast: this.config.failFast
        },
        generationTime: Date.now() - startTime
      };

      this.logger.log(`Generated regression test suite: ${regressionTests.length} tests in ${testSuite.generationTime}ms`);
      return testSuite;

    } catch (error) {
      this.logger.error(`Failed to generate regression test suite: ${error.message}`, error.stack);
      throw new Error(`Test suite generation failed: ${error.message}`);
    }
  }

  /**
   * Execute test suite using parallel execution
   */
  private async executeTestSuiteInParallel(
    testSuite: RegressionTestSuite,
    context: RegressionExecutionContext
  ): Promise<any[]> {
    const startTime = Date.now();

    try {
      // Convert regression tests to executable test format
      const executableTests = testSuite.regressionTests.map(test => ({
        id: `${test.functionName}_regression`,
        name: `Regression test for ${test.functionName}`,
        type: 'REGRESSION',
        function: test.functionName,
        scenarios: test.testScenarios,
        validation: test.validationCriteria,
        config: test.executionConfig
      }));

      // Execute tests using parallel execution manager
      const results = await this.parallelExecutionManager.executeTestsInParallel(
        executableTests,
        context.executionId
      );

      this.logger.log(`Executed ${executableTests.length} regression tests in ${Date.now() - startTime}ms`);
      return results.testResults;

    } catch (error) {
      this.logger.error(`Failed to execute test suite: ${error.message}`, error.stack);
      throw new Error(`Test suite execution failed: ${error.message}`);
    }
  }

  // ============================================================================
  // Change Detection and Analysis
  // ============================================================================

  /**
   * Perform comprehensive change detection
   */
  private async performChangeDetection(
    testResults: any[],
    baseline: RegressionBaseline
  ): Promise<ChangeDetectionResult> {
    const startTime = Date.now();

    try {
      const changesDetected: any[] = [];
      const stabilityAnalysis: any[] = [];

      // Analyze each test result for changes
      for (const result of testResults) {
        const baselineTest = baseline.functionTests.find(t =>
          t.functionName === result.functionName
        );

        if (baselineTest) {
          // Detect functional changes
          const functionalChanges = await this.detectFunctionalChanges(result, baselineTest);
          if (functionalChanges.length > 0) {
            changesDetected.push({
              type: 'FUNCTIONAL',
              functionName: result.functionName,
              changes: functionalChanges,
              severity: this.calculateChangeSeverity(functionalChanges),
              impact: this.assessChangeImpact(functionalChanges)
            });
          }

          // Detect performance changes
          const performanceChanges = await this.detectPerformanceChanges(result, baselineTest);
          if (performanceChanges.length > 0) {
            changesDetected.push({
              type: 'PERFORMANCE',
              functionName: result.functionName,
              changes: performanceChanges,
              severity: this.calculateChangeSeverity(performanceChanges),
              impact: this.assessChangeImpact(performanceChanges)
            });
          }

          // Analyze stability
          const stability = this.analyzeStability(result, baselineTest);
          stabilityAnalysis.push({
            functionName: result.functionName,
            stabilityScore: stability.score,
            factors: stability.factors,
            recommendation: stability.recommendation
          });
        }
      }

      const changeDetectionResult: ChangeDetectionResult = {
        analysisId: `change_detection_${Date.now()}`,
        timestamp: new Date(),
        analysisTime: Date.now() - startTime,
        changesDetected,
        stabilityAnalysis,
        overallStability: this.calculateOverallStability(stabilityAnalysis),
        changeCategories: this.categorizeChanges(changesDetected),
        riskAssessment: this.assessOverallRisk(changesDetected, stabilityAnalysis)
      };

      this.logger.log(`Change detection completed: ${changesDetected.length} changes detected in ${changeDetectionResult.analysisTime}ms`);
      return changeDetectionResult;

    } catch (error) {
      this.logger.error(`Change detection failed: ${error.message}`, error.stack);
      throw new Error(`Change detection failed: ${error.message}`);
    }
  }

  /**
   * Generate baseline comparison report
   */
  private async generateBaselineComparison(
    testResults: any[],
    baseline: RegressionBaseline
  ): Promise<BaselineComparison> {
    const startTime = Date.now();

    try {
      const functionComparisons: any[] = [];
      let matchingResults = 0;
      let differentResults = 0;
      let newFunctions = 0;
      let missingFunctions = 0;

      // Compare each test result with baseline
      for (const result of testResults) {
        const baselineTest = baseline.functionTests.find(t =>
          t.functionName === result.functionName
        );

        if (baselineTest) {
          const comparison = await this.compareFunctionResults(result, baselineTest);
          functionComparisons.push(comparison);

          if (comparison.matches) {
            matchingResults++;
          } else {
            differentResults++;
          }
        } else {
          newFunctions++;
          functionComparisons.push({
            functionName: result.functionName,
            status: 'NEW_FUNCTION',
            matches: false,
            differences: ['Function not present in baseline'],
            current: result,
            baseline: null
          });
        }
      }

      // Check for missing functions
      for (const baselineTest of baseline.functionTests) {
        const currentResult = testResults.find(r => r.functionName === baselineTest.functionName);
        if (!currentResult) {
          missingFunctions++;
          functionComparisons.push({
            functionName: baselineTest.functionName,
            status: 'MISSING_FUNCTION',
            matches: false,
            differences: ['Function missing from current execution'],
            current: null,
            baseline: baselineTest
          });
        }
      }

      const baselineComparison: BaselineComparison = {
        comparisonId: `baseline_comparison_${Date.now()}`,
        timestamp: new Date(),
        comparisonTime: Date.now() - startTime,
        baselineId: baseline.baselineId,
        baselineTimestamp: baseline.timestamp,
        currentExecutionId: 'current',
        functionComparisons,
        summary: {
          totalFunctions: testResults.length + missingFunctions,
          matchingResults,
          differentResults,
          newFunctions,
          missingFunctions,
          compatibilityScore: this.calculateCompatibilityScore(functionComparisons)
        },
        regressionDetected: differentResults > 0,
        significantChanges: functionComparisons.filter(c => c.significance === 'HIGH').length,
        overallAssessment: this.generateOverallAssessment(functionComparisons)
      };

      this.logger.log(`Baseline comparison completed: ${functionComparisons.length} functions compared in ${baselineComparison.comparisonTime}ms`);
      return baselineComparison;

    } catch (error) {
      this.logger.error(`Baseline comparison failed: ${error.message}`, error.stack);
      throw new Error(`Baseline comparison failed: ${error.message}`);
    }
  }

  // ============================================================================
  // Baseline Management
  // ============================================================================

  /**
   * Create new baseline from successful test execution
   */
  async createBaseline(
    functions: DatabaseFunction[],
    testResults: any[],
    baselineMetadata: {
      name: string;
      description: string;
      version?: string;
      tags?: string[];
    }
  ): Promise<RegressionBaseline> {
    const startTime = Date.now();

    try {
      const baselineId = `baseline_${Date.now()}`;

      // Create function tests from results
      const functionTests = testResults.map(result => ({
        functionName: result.functionName,
        expectedResult: result.result,
        expectedPerformance: result.performance,
        testScenarios: result.scenarios,
        validationRules: result.validation,
        metadata: {
          lastUpdated: new Date(),
          testCount: result.testCount || 1,
          successRate: result.successRate || 100
        }
      }));

      // Create baseline
      const baseline: RegressionBaseline = {
        baselineId,
        name: baselineMetadata.name,
        description: baselineMetadata.description,
        version: baselineMetadata.version || '1.0.0',
        timestamp: new Date(),
        functionTests,
        metadata: {
          totalFunctions: functions.length,
          environment: 'baseline',
          createdBy: 'RegressionTestingEngine',
          tags: baselineMetadata.tags || [],
          statistics: {
            averageResponseTime: this.calculateAverageResponseTime(testResults),
            totalTestCases: testResults.length,
            coveragePercentage: 100 // Assuming full coverage for baseline
          }
        },
        creationTime: Date.now() - startTime
      };

      // Store baseline
      await this.baselineStorage.storeBaseline(baseline);

      this.logger.log(`Created baseline: ${baselineId} with ${functionTests.length} function tests in ${baseline.creationTime}ms`);

      // Emit baseline creation event
      this.emit('baseline:created', {
        baselineId,
        functionCount: functionTests.length,
        creationTime: baseline.creationTime
      });

      return baseline;

    } catch (error) {
      this.logger.error(`Failed to create baseline: ${error.message}`, error.stack);
      throw new Error(`Baseline creation failed: ${error.message}`);
    }
  }

  /**
   * Update existing baseline with new test results
   */
  async updateBaseline(
    baseline: RegressionBaseline,
    regressionResult: RegressionTestResult
  ): Promise<RegressionBaseline> {
    try {
      // Update function tests with new results
      for (const testResult of regressionResult.testResults) {
        const existingTest = baseline.functionTests.find(t =>
          t.functionName === testResult.functionName
        );

        if (existingTest) {
          // Update existing test
          existingTest.expectedResult = testResult.result;
          existingTest.expectedPerformance = testResult.performance;
          existingTest.metadata.lastUpdated = new Date();
          existingTest.metadata.testCount = (existingTest.metadata.testCount || 0) + 1;
        } else {
          // Add new test
          baseline.functionTests.push({
            functionName: testResult.functionName,
            expectedResult: testResult.result,
            expectedPerformance: testResult.performance,
            testScenarios: testResult.scenarios,
            validationRules: testResult.validation,
            metadata: {
              lastUpdated: new Date(),
              testCount: 1,
              successRate: 100
            }
          });
        }
      }

      // Update baseline metadata
      baseline.metadata.totalFunctions = baseline.functionTests.length;
      baseline.metadata.statistics.totalTestCases = baseline.functionTests.length;

      // Store updated baseline
      await this.baselineStorage.updateBaseline(baseline.baselineId, baseline);

      this.logger.log(`Updated baseline: ${baseline.baselineId} with ${regressionResult.testResults.length} results`);

      return baseline;

    } catch (error) {
      this.logger.error(`Failed to update baseline: ${error.message}`, error.stack);
      throw new Error(`Baseline update failed: ${error.message}`);
    }
  }

  // ============================================================================
  // Alert and Regression Analysis
  // ============================================================================

  /**
   * Analyze regression alerts based on changes and comparisons
   */
  private async analyzeRegressionAlerts(
    changeDetection: ChangeDetectionResult,
    baselineComparison: BaselineComparison
  ): Promise<RegressionAlert[]> {
    const alerts: RegressionAlert[] = [];

    try {
      // Analyze functional regressions
      const functionalChanges = changeDetection.changesDetected.filter(c => c.type === 'FUNCTIONAL');
      for (const change of functionalChanges) {
        if (change.severity === 'HIGH' || change.severity === 'CRITICAL') {
          alerts.push({
            alertId: `functional_${Date.now()}_${Math.random()}`,
            type: RegressionAlertType.FUNCTIONAL_REGRESSION,
            severity: change.severity as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
            functionName: change.functionName,
            title: `Functional regression detected in ${change.functionName}`,
            description: `Function behavior has changed: ${change.changes.map(c => c.description).join(', ')}`,
            impact: change.impact,
            recommendation: this.generateRegressionRecommendation(change),
            timestamp: new Date(),
            evidence: {
              changeType: ChangeType.FUNCTIONAL,
              changes: change.changes,
              severity: change.severity
            }
          });
        }
      }

      // Analyze performance regressions
      const performanceChanges = changeDetection.changesDetected.filter(c => c.type === 'PERFORMANCE');
      for (const change of performanceChanges) {
        if (change.severity === 'MEDIUM' || change.severity === 'HIGH' || change.severity === 'CRITICAL') {
          alerts.push({
            alertId: `performance_${Date.now()}_${Math.random()}`,
            type: RegressionAlertType.PERFORMANCE_REGRESSION,
            severity: change.severity as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
            functionName: change.functionName,
            title: `Performance regression detected in ${change.functionName}`,
            description: `Function performance has degraded: ${change.changes.map(c => c.description).join(', ')}`,
            impact: change.impact,
            recommendation: this.generatePerformanceRecommendation(change),
            timestamp: new Date(),
            evidence: {
              changeType: ChangeType.PERFORMANCE,
              changes: change.changes,
              severity: change.severity
            }
          });
        }
      }

      // Analyze compatibility issues
      if (baselineComparison.summary.compatibilityScore < this.config.minCompatibilityScore) {
        alerts.push({
          alertId: `compatibility_${Date.now()}`,
          type: RegressionAlertType.COMPATIBILITY_ISSUE,
          severity: 'HIGH',
          functionName: 'MULTIPLE',
          title: 'Baseline compatibility issues detected',
          description: `Compatibility score (${baselineComparison.summary.compatibilityScore.toFixed(1)}%) below threshold (${this.config.minCompatibilityScore}%)`,
          impact: 'Multiple functions show compatibility issues with the baseline',
          recommendation: 'Review changed functions and consider baseline update or rollback',
          timestamp: new Date(),
          evidence: {
            additionalData: {
              compatibilityScore: baselineComparison.summary.compatibilityScore,
              threshold: this.config.minCompatibilityScore,
              affectedFunctions: baselineComparison.functionComparisons.filter(c => !c.matches).length
            }
          }
        });
      }

      this.logger.log(`Generated ${alerts.length} regression alerts`);
      return alerts;

    } catch (error) {
      this.logger.error(`Failed to analyze regression alerts: ${error.message}`, error.stack);
      return [];
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    this.on('regression:completed', (event) => {
      this.logger.log(`Regression test completed: ${event.executionId} (${event.status})`);
    });

    this.on('baseline:created', (event) => {
      this.logger.log(`Baseline created: ${event.baselineId} with ${event.functionCount} functions`);
    });

    this.on('regression:alert', (alert) => {
      this.logger.warn(`Regression alert: ${alert.title} (${alert.severity})`);
    });
  }

  /**
   * Load baseline from storage
   */
  private async loadBaseline(baselineId: string): Promise<RegressionBaseline | null> {
    try {
      return await this.baselineStorage.getBaseline(baselineId);
    } catch (error) {
      this.logger.error(`Failed to load baseline ${baselineId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Get latest baseline ID
   */
  private async getLatestBaselineId(): Promise<string> {
    try {
      const baselines = await this.baselineStorage.listBaselines();
      if (baselines.length === 0) {
        throw new Error('No baselines available');
      }

      // Return most recent baseline
      const latest = baselines.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
      return latest.baselineId;
    } catch (error) {
      this.logger.error(`Failed to get latest baseline: ${error.message}`);
      throw new Error('No baseline available for regression testing');
    }
  }

  /**
   * Generate function test scenarios
   */
  private async generateFunctionTestScenarios(
    func: DatabaseFunction,
    baselineTest?: any
  ): Promise<any[]> {
    // Use existing test generator to create scenarios
    const testConfig = {
      categories: ['UNIT', 'FUNCTIONAL'] as TestCategory[],
      includePerformanceTests: true,
      includeSecurityTests: false,
      generateMockData: true,
      testDataVolume: 'medium' as 'small' | 'medium' | 'large',
      maxTestsPerFunction: 50,
      includeBoundaryTests: true,
      includeErrorTests: true,
      parallelGeneration: false
    };

    try {
      const generatedTests = await this.testGenerator.generateTestsForFunction(func, testConfig);
      return generatedTests.generatedTests || [];
    } catch (error) {
      this.logger.warn(`Failed to generate scenarios for ${func.name}: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * Create validation criteria for function
   */
  private createValidationCriteria(func: DatabaseFunction, baselineTest?: any): any {
    return {
      resultValidation: {
        type: 'EXACT_MATCH',
        tolerance: 0
      },
      performanceValidation: {
        maxResponseTime: this.config.maxResponseTimeMs,
        maxDeviationPercent: this.config.maxPerformanceDeviation
      },
      behaviorValidation: {
        checkSideEffects: true,
        validateState: true
      }
    };
  }

  /**
   * Create change detectors for function
   */
  private createChangeDetectors(func: DatabaseFunction): any[] {
    return [
      {
        type: 'RESULT_CHANGE',
        sensitivity: 'HIGH',
        threshold: 0
      },
      {
        type: 'PERFORMANCE_CHANGE',
        sensitivity: 'MEDIUM',
        threshold: this.config.maxPerformanceDeviation
      },
      {
        type: 'BEHAVIOR_CHANGE',
        sensitivity: 'HIGH',
        threshold: 0
      }
    ];
  }

  /**
   * Detect functional changes between results
   */
  private async detectFunctionalChanges(current: any, baseline: any): Promise<any[]> {
    const changes: any[] = [];

    // Compare results
    if (JSON.stringify(current.result) !== JSON.stringify(baseline.expectedResult)) {
      changes.push({
        type: 'RESULT_CHANGE',
        description: 'Function output has changed',
        current: current.result,
        baseline: baseline.expectedResult,
        severity: 'HIGH'
      });
    }

    // Compare behavior
    if (current.sideEffects !== baseline.sideEffects) {
      changes.push({
        type: 'BEHAVIOR_CHANGE',
        description: 'Function side effects have changed',
        current: current.sideEffects,
        baseline: baseline.sideEffects,
        severity: 'MEDIUM'
      });
    }

    return changes;
  }

  /**
   * Detect performance changes between results
   */
  private async detectPerformanceChanges(current: any, baseline: any): Promise<any[]> {
    const changes: any[] = [];

    if (current.performance && baseline.expectedPerformance) {
      const currentTime = current.performance.responseTime;
      const baselineTime = baseline.expectedPerformance.responseTime;
      const deviation = ((currentTime - baselineTime) / baselineTime) * 100;

      if (Math.abs(deviation) > this.config.maxPerformanceDeviation) {
        changes.push({
          type: 'PERFORMANCE_CHANGE',
          description: `Response time changed by ${deviation.toFixed(1)}%`,
          current: currentTime,
          baseline: baselineTime,
          deviation,
          severity: deviation > 50 ? 'HIGH' : deviation > 20 ? 'MEDIUM' : 'LOW'
        });
      }
    }

    return changes;
  }

  /**
   * Analyze stability of function
   */
  private analyzeStability(current: any, baseline: any): any {
    const factors = [];
    let score = 100;

    // Check result consistency
    if (current.result !== baseline.expectedResult) {
      factors.push('Result inconsistency');
      score -= 30;
    }

    // Check performance consistency
    if (current.performance && baseline.expectedPerformance) {
      const deviation = Math.abs(
        (current.performance.responseTime - baseline.expectedPerformance.responseTime) /
        baseline.expectedPerformance.responseTime * 100
      );

      if (deviation > 10) {
        factors.push('Performance variation');
        score -= 20;
      }
    }

    return {
      score: Math.max(0, score),
      factors,
      recommendation: score > 80 ? 'STABLE' : score > 60 ? 'MONITOR' : 'INVESTIGATE'
    };
  }

  /**
   * Calculate change severity
   */
  private calculateChangeSeverity(changes: any[]): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const severities = changes.map(c => c.severity);

    if (severities.includes('CRITICAL')) return 'CRITICAL';
    if (severities.includes('HIGH')) return 'HIGH';
    if (severities.includes('MEDIUM')) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Assess change impact
   */
  private assessChangeImpact(changes: any[]): string {
    const resultChanges = changes.filter(c => c.type === 'RESULT_CHANGE').length;
    const performanceChanges = changes.filter(c => c.type === 'PERFORMANCE_CHANGE').length;
    const behaviorChanges = changes.filter(c => c.type === 'BEHAVIOR_CHANGE').length;

    const impacts = [];
    if (resultChanges > 0) impacts.push(`${resultChanges} result changes`);
    if (performanceChanges > 0) impacts.push(`${performanceChanges} performance changes`);
    if (behaviorChanges > 0) impacts.push(`${behaviorChanges} behavior changes`);

    return impacts.join(', ') || 'No significant impact';
  }

  /**
   * Calculate overall stability
   */
  private calculateOverallStability(stabilityAnalysis: any[]): number {
    if (stabilityAnalysis.length === 0) return 100;

    const totalScore = stabilityAnalysis.reduce((sum, analysis) => sum + analysis.stabilityScore, 0);
    return totalScore / stabilityAnalysis.length;
  }

  /**
   * Categorize changes
   */
  private categorizeChanges(changes: any[]): Record<string, number> {
    const categories: Record<string, number> = {
      FUNCTIONAL: 0,
      PERFORMANCE: 0,
      BEHAVIOR: 0,
      OTHER: 0
    };

    for (const change of changes) {
      categories[change.type] = (categories[change.type] || 0) + 1;
    }

    return categories;
  }

  /**
   * Assess overall risk
   */
  private assessOverallRisk(changes: any[], stabilityAnalysis: any[]): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const criticalChanges = changes.filter(c => c.severity === 'CRITICAL').length;
    const highChanges = changes.filter(c => c.severity === 'HIGH').length;
    const unstableFunctions = stabilityAnalysis.filter(s => s.stabilityScore < 60).length;

    if (criticalChanges > 0 || unstableFunctions > changes.length * 0.3) return 'CRITICAL';
    if (highChanges > 2 || unstableFunctions > changes.length * 0.2) return 'HIGH';
    if (highChanges > 0 || unstableFunctions > 0) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Compare function results
   */
  private async compareFunctionResults(current: any, baseline: any): Promise<any> {
    const differences = [];

    // Compare results
    if (JSON.stringify(current.result) !== JSON.stringify(baseline.expectedResult)) {
      differences.push('Result mismatch');
    }

    // Compare performance
    if (current.performance && baseline.expectedPerformance) {
      const deviation = Math.abs(
        (current.performance.responseTime - baseline.expectedPerformance.responseTime) /
        baseline.expectedPerformance.responseTime * 100
      );

      if (deviation > this.config.maxPerformanceDeviation) {
        differences.push(`Performance deviation: ${deviation.toFixed(1)}%`);
      }
    }

    return {
      functionName: current.functionName,
      status: differences.length === 0 ? 'MATCH' : 'DIFFERENT',
      matches: differences.length === 0,
      differences,
      current,
      baseline,
      significance: differences.length > 1 ? 'HIGH' : differences.length > 0 ? 'MEDIUM' : 'LOW'
    };
  }

  /**
   * Calculate compatibility score
   */
  private calculateCompatibilityScore(comparisons: any[]): number {
    if (comparisons.length === 0) return 100;

    const matchingCount = comparisons.filter(c => c.matches).length;
    return (matchingCount / comparisons.length) * 100;
  }

  /**
   * Generate overall assessment
   */
  private generateOverallAssessment(comparisons: any[]): string {
    const matchingCount = comparisons.filter(c => c.matches).length;
    const compatibilityScore = this.calculateCompatibilityScore(comparisons);

    if (compatibilityScore >= 95) return 'FULLY_COMPATIBLE';
    if (compatibilityScore >= 85) return 'MOSTLY_COMPATIBLE';
    if (compatibilityScore >= 70) return 'PARTIALLY_COMPATIBLE';
    return 'INCOMPATIBLE';
  }

  /**
   * Determine execution status
   */
  private determineExecutionStatus(testResults: any[], alerts: RegressionAlert[]): RegressionTestStatus {
    const criticalAlerts = alerts.filter(a => a.severity === 'CRITICAL').length;
    const highAlerts = alerts.filter(a => a.severity === 'HIGH').length;
    const failedTests = testResults.filter(r => r.status === 'FAILED').length;

    if (criticalAlerts > 0 || failedTests > testResults.length * 0.1) return RegressionTestStatus.FAILED;
    if (highAlerts > 0 || failedTests > 0) return RegressionTestStatus.WARNING;
    return RegressionTestStatus.PASSED;
  }

  /**
   * Generate execution summary
   */
  private generateExecutionSummary(testResults: any[], changeDetection: ChangeDetectionResult, alerts: RegressionAlert[]): string {
    const passedCount = testResults.filter(r => r.status === 'PASSED').length;
    const failedCount = testResults.filter(r => r.status === 'FAILED').length;
    const changesCount = changeDetection?.changesDetected.length || 0;
    const alertsCount = alerts.length;

    return `Regression testing completed: ${passedCount} passed, ${failedCount} failed, ${changesCount} changes detected, ${alertsCount} alerts generated`;
  }

  /**
   * Generate regression recommendation
   */
  private generateRegressionRecommendation(change: any): string {
    switch (change.severity) {
      case 'CRITICAL':
        return 'Immediate investigation required. Consider rollback if this is a production deployment.';
      case 'HIGH':
        return 'Thorough testing recommended before deployment. Review changes carefully.';
      case 'MEDIUM':
        return 'Monitor closely and validate changes align with expected behavior.';
      default:
        return 'Document changes and continue monitoring.';
    }
  }

  /**
   * Generate performance recommendation
   */
  private generatePerformanceRecommendation(change: any): string {
    const changes = change.changes || [];
    const hasSlowdown = changes.some(c => c.deviation > 0);

    if (hasSlowdown) {
      return 'Performance degradation detected. Profile the function and optimize bottlenecks.';
    } else {
      return 'Performance improvement detected. Validate that functionality remains correct.';
    }
  }

  /**
   * Calculate average response time
   */
  private calculateAverageResponseTime(testResults: any[]): number {
    const responseTimes = testResults
      .filter(r => r.performance?.responseTime)
      .map(r => r.performance.responseTime);

    if (responseTimes.length === 0) return 0;

    return responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
  }

  /**
   * Store execution result
   */
  private storeExecutionResult(executionId: string, result: RegressionTestResult): void {
    const execution: RegressionTestExecution = {
      executionId,
      timestamp: result.timestamp,
      status: result.status,
      duration: result.duration,
      functionsTestested: result.functionsTestested,
      result
    };

    this.executionHistory.set(executionId, execution);

    // Limit history size
    if (this.executionHistory.size > this.config.maxHistorySize) {
      const oldestKey = this.executionHistory.keys().next().value;
      this.executionHistory.delete(oldestKey);
    }
  }

  /**
   * Get execution history
   */
  getExecutionHistory(): RegressionTestExecution[] {
    return Array.from(this.executionHistory.values());
  }

  /**
   * Get active executions
   */
  getActiveExecutions(): RegressionExecutionContext[] {
    return Array.from(this.activeExecutions.values());
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.executionHistory.clear();
    this.activeExecutions.clear();
    this.removeAllListeners();
  }
}

/**
 * File-based baseline storage implementation
 */
class FileBasedBaselineStorage implements BaselineStorage {
  private readonly basePath = path.join(process.cwd(), 'regression-baselines');

  constructor() {
    this.ensureBaseDirectory();
  }

  async storeBaseline(baseline: RegressionBaseline): Promise<void> {
    const filePath = path.join(this.basePath, `${baseline.baselineId}.json`);
    await fs.promises.writeFile(filePath, JSON.stringify(baseline, null, 2));
  }

  async getBaseline(baselineId: string): Promise<RegressionBaseline | null> {
    try {
      const filePath = path.join(this.basePath, `${baselineId}.json`);
      const content = await fs.promises.readFile(filePath, 'utf-8');
      const baseline = JSON.parse(content);

      // Convert timestamp strings back to Date objects
      baseline.timestamp = new Date(baseline.timestamp);
      return baseline;
    } catch (error) {
      return null;
    }
  }

  async listBaselines(): Promise<RegressionBaseline[]> {
    try {
      const files = await fs.promises.readdir(this.basePath);
      const baselineFiles = files.filter(f => f.endsWith('.json'));

      const baselines: RegressionBaseline[] = [];
      for (const file of baselineFiles) {
        const baselineId = file.replace('.json', '');
        const baseline = await this.getBaseline(baselineId);
        if (baseline) {
          baselines.push(baseline);
        }
      }

      return baselines;
    } catch (error) {
      return [];
    }
  }

  async updateBaseline(baselineId: string, updates: Partial<RegressionBaseline>): Promise<void> {
    const existing = await this.getBaseline(baselineId);
    if (!existing) {
      throw new Error(`Baseline not found: ${baselineId}`);
    }

    const updated = { ...existing, ...updates };
    await this.storeBaseline(updated);
  }

  async deleteBaseline(baselineId: string): Promise<void> {
    const filePath = path.join(this.basePath, `${baselineId}.json`);
    await fs.promises.unlink(filePath);
  }

  private async ensureBaseDirectory(): Promise<void> {
    try {
      await fs.promises.access(this.basePath);
    } catch {
      await fs.promises.mkdir(this.basePath, { recursive: true });
    }
  }
}