/**
 * Core Integration Testing Framework
 * Central orchestration and management for enterprise testing operations
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  TestConfiguration,
  TestSuite,
  TestResult,
  TestStatus,
  TestExecutionConfig,
  TestReportConfig
} from '@/types';
import { TestRunner } from './test-runner';
import { TestExecutor } from './test-executor';
import { TestLifecycle } from './test-lifecycle';
import { TestContext } from './test-context';
import { TestScheduler } from './test-scheduler';
import { TestOrchestrator } from './test-orchestrator';

/**
 * Main Integration Testing Framework
 * Coordinates all testing operations and provides unified interface
 */
@Injectable()
export class IntegrationTestingFramework {
  private readonly logger = new Logger(IntegrationTestingFramework.name);

  private testRunner!: TestRunner;
  private testExecutor!: TestExecutor;
  private testLifecycle!: TestLifecycle;
  private testContext!: TestContext;
  private testScheduler!: TestScheduler;
  private testOrchestrator!: TestOrchestrator;

  private isInitialized = false;
  private currentExecution: string | null = null;

  constructor() {
    this.logger.log('Initializing Integration Testing Framework');
  }

  /**
   * Initialize the testing framework with configuration
   */
  async initialize(configuration: TestConfiguration): Promise<void> {
    try {
      this.logger.log('Starting framework initialization');

      // Initialize core components
      this.testContext = new TestContext(configuration);
      this.testLifecycle = new TestLifecycle(this.testContext);
      this.testExecutor = new TestExecutor(this.testContext, this.testLifecycle);
      this.testRunner = new TestRunner(this.testExecutor, this.testContext);
      this.testScheduler = new TestScheduler(this.testRunner, this.testContext);
      this.testOrchestrator = new TestOrchestrator(
        this.testScheduler,
        this.testRunner,
        this.testContext
      );

      // Initialize each component
      await this.testContext.initialize();
      await this.testLifecycle.initialize();
      await this.testExecutor.initialize();
      await this.testRunner.initialize();
      await this.testScheduler.initialize();
      await this.testOrchestrator.initialize();

      this.isInitialized = true;
      this.logger.log('Framework initialization completed successfully');
    } catch (error) {
      this.logger.error('Framework initialization failed', error);
      throw new Error(`Framework initialization failed: ${error.message}`);
    }
  }

  /**
   * Execute a test suite with comprehensive validation
   */
  async executeTestSuite(
    testSuite: TestSuite,
    executionConfig?: TestExecutionConfig
  ): Promise<TestResult[]> {
    this.ensureInitialized();

    try {
      this.logger.log(`Starting execution of test suite: ${testSuite.name}`);

      // Generate unique execution ID
      const executionId = this.generateExecutionId();
      this.currentExecution = executionId;

      // Schedule and execute test suite
      const results = await this.testOrchestrator.orchestrateTestSuite(
        testSuite,
        executionId,
        executionConfig
      );

      this.logger.log(`Test suite execution completed: ${testSuite.name}`);
      this.currentExecution = null;

      return results;
    } catch (error) {
      this.logger.error(`Test suite execution failed: ${testSuite.name}`, error);
      this.currentExecution = null;
      throw error;
    }
  }

  /**
   * Execute multiple test suites in parallel or sequence
   */
  async executeTestSuites(
    testSuites: TestSuite[],
    executionConfig?: TestExecutionConfig
  ): Promise<Map<string, TestResult[]>> {
    this.ensureInitialized();

    try {
      this.logger.log(`Starting execution of ${testSuites.length} test suites`);

      const executionId = this.generateExecutionId();
      this.currentExecution = executionId;

      const results = await this.testOrchestrator.orchestrateMultipleTestSuites(
        testSuites,
        executionId,
        executionConfig
      );

      this.logger.log(`Multiple test suites execution completed`);
      this.currentExecution = null;

      return results;
    } catch (error) {
      this.logger.error(`Multiple test suites execution failed`, error);
      this.currentExecution = null;
      throw error;
    }
  }

  /**
   * Execute continuous testing with monitoring and reporting
   */
  async executeContinuousTesting(
    testSuites: TestSuite[],
    executionConfig: TestExecutionConfig,
    interval: number = 300000 // 5 minutes default
  ): Promise<void> {
    this.ensureInitialized();

    this.logger.log('Starting continuous testing execution');

    const executionId = this.generateExecutionId();
    this.currentExecution = executionId;

    try {
      await this.testOrchestrator.orchestrateContinuousTesting(
        testSuites,
        executionId,
        executionConfig,
        interval
      );
    } catch (error) {
      this.logger.error('Continuous testing execution failed', error);
      this.currentExecution = null;
      throw error;
    }
  }

  /**
   * Generate comprehensive test report
   */
  async generateReport(
    results: TestResult[],
    reportConfig: TestReportConfig
  ): Promise<string> {
    this.ensureInitialized();

    try {
      this.logger.log('Generating comprehensive test report');

      const reportPath = await this.testOrchestrator.generateComprehensiveReport(
        results,
        reportConfig
      );

      this.logger.log(`Test report generated: ${reportPath}`);
      return reportPath;
    } catch (error) {
      this.logger.error('Test report generation failed', error);
      throw error;
    }
  }

  /**
   * Validate test suite configuration and dependencies
   */
  async validateTestSuite(testSuite: TestSuite): Promise<ValidationResult> {
    this.ensureInitialized();

    try {
      this.logger.log(`Validating test suite: ${testSuite.name}`);

      const validationResult = await this.testOrchestrator.validateTestSuite(testSuite);

      this.logger.log(`Test suite validation completed: ${testSuite.name}`);
      return validationResult;
    } catch (error) {
      this.logger.error(`Test suite validation failed: ${testSuite.name}`, error);
      throw error;
    }
  }

  /**
   * Get current test execution status
   */
  async getExecutionStatus(): Promise<ExecutionStatus | null> {
    if (!this.currentExecution) {
      return null;
    }

    return await this.testOrchestrator.getExecutionStatus(this.currentExecution);
  }

  /**
   * Stop current test execution
   */
  async stopExecution(): Promise<void> {
    if (this.currentExecution) {
      this.logger.log(`Stopping test execution: ${this.currentExecution}`);
      await this.testOrchestrator.stopExecution(this.currentExecution);
      this.currentExecution = null;
    }
  }

  /**
   * Get framework health and status information
   */
  async getFrameworkHealth(): Promise<FrameworkHealth> {
    const health: FrameworkHealth = {
      initialized: this.isInitialized,
      currentExecution: this.currentExecution,
      components: {
        testContext: await this.testContext?.getHealth() || { status: 'not_initialized' },
        testLifecycle: await this.testLifecycle?.getHealth() || { status: 'not_initialized' },
        testExecutor: await this.testExecutor?.getHealth() || { status: 'not_initialized' },
        testRunner: await this.testRunner?.getHealth() || { status: 'not_initialized' },
        testScheduler: await this.testScheduler?.getHealth() || { status: 'not_initialized' },
        testOrchestrator: await this.testOrchestrator?.getHealth() || { status: 'not_initialized' }
      },
      timestamp: new Date()
    };

    return health;
  }

  /**
   * Cleanup framework resources
   */
  async cleanup(): Promise<void> {
    try {
      this.logger.log('Starting framework cleanup');

      if (this.currentExecution) {
        await this.stopExecution();
      }

      if (this.testOrchestrator) {
        await this.testOrchestrator.cleanup();
      }
      if (this.testScheduler) {
        await this.testScheduler.cleanup();
      }
      if (this.testRunner) {
        await this.testRunner.cleanup();
      }
      if (this.testExecutor) {
        await this.testExecutor.cleanup();
      }
      if (this.testLifecycle) {
        await this.testLifecycle.cleanup();
      }
      if (this.testContext) {
        await this.testContext.cleanup();
      }

      this.isInitialized = false;
      this.logger.log('Framework cleanup completed');
    } catch (error) {
      this.logger.error('Framework cleanup failed', error);
      throw error;
    }
  }

  /**
   * Ensure framework is initialized before operations
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('Integration Testing Framework not initialized. Call initialize() first.');
    }
  }

  /**
   * Generate unique execution ID
   */
  private generateExecutionId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `exec_${timestamp}_${random}`;
  }
}

/**
 * Test suite validation result
 */
export interface ValidationResult {
  /** Validation status */
  valid: boolean;
  /** Validation errors */
  errors: ValidationError[];
  /** Validation warnings */
  warnings: ValidationWarning[];
  /** Validation summary */
  summary: ValidationSummary;
}

export interface ValidationError {
  /** Error type */
  type: string;
  /** Error message */
  message: string;
  /** Error location */
  location: string;
  /** Error severity */
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface ValidationWarning {
  /** Warning type */
  type: string;
  /** Warning message */
  message: string;
  /** Warning location */
  location: string;
  /** Recommended action */
  recommendation: string;
}

export interface ValidationSummary {
  /** Total test cases */
  totalTestCases: number;
  /** Valid test cases */
  validTestCases: number;
  /** Invalid test cases */
  invalidTestCases: number;
  /** Total dependencies */
  totalDependencies: number;
  /** Resolved dependencies */
  resolvedDependencies: number;
  /** Missing dependencies */
  missingDependencies: number;
}

/**
 * Test execution status
 */
export interface ExecutionStatus {
  /** Execution ID */
  id: string;
  /** Execution status */
  status: TestStatus;
  /** Start time */
  startTime: Date;
  /** End time */
  endTime?: Date;
  /** Progress percentage */
  progress: number;
  /** Current test suite */
  currentTestSuite?: string;
  /** Current test case */
  currentTestCase?: string;
  /** Completed test cases */
  completedTestCases: number;
  /** Total test cases */
  totalTestCases: number;
  /** Results summary */
  resultsSummary: {
    passed: number;
    failed: number;
    skipped: number;
    errors: number;
  };
}

/**
 * Framework health status
 */
export interface FrameworkHealth {
  /** Framework initialization status */
  initialized: boolean;
  /** Current execution ID */
  currentExecution: string | null;
  /** Component health status */
  components: {
    testContext: ComponentHealth;
    testLifecycle: ComponentHealth;
    testExecutor: ComponentHealth;
    testRunner: ComponentHealth;
    testScheduler: ComponentHealth;
    testOrchestrator: ComponentHealth;
  };
  /** Health check timestamp */
  timestamp: Date;
}

export interface ComponentHealth {
  /** Component status */
  status: 'healthy' | 'degraded' | 'unhealthy' | 'not_initialized';
  /** Status message */
  message?: string;
  /** Last activity timestamp */
  lastActivity?: Date;
  /** Component metrics */
  metrics?: Record<string, number>;
}