/**
 * Cross-Platform Test Execution Service
 *
 * Core orchestration service for executing tests across multiple platforms
 * including web browsers, mobile devices, desktop applications, and APIs.
 * Supports parallel execution, environment management, and result aggregation.
 *
 * @fileoverview Main service for cross-platform test execution
 * @author Bytebot Team
 * @version 1.0.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { WebTestExecutor } from './executors/web-test-executor.service';
import { MobileTestExecutor } from './executors/mobile-test-executor.service';
import { DesktopTestExecutor } from './executors/desktop-test-executor.service';
import { APITestExecutor } from './executors/api-test-executor.service';
import { TestEnvironmentManager } from './services/test-environment-manager.service';
import { ParallelExecutionService } from './services/parallel-execution.service';
import { ResultAggregationService } from './services/result-aggregation.service';

export interface CrossPlatformTestRequest {
  testSuite: TestSuiteDefinition;
  platforms: TestPlatform[];
  executionConfig: ExecutionConfiguration;
  environment?: EnvironmentConfiguration;
}

export interface TestSuiteDefinition {
  id: string;
  name: string;
  description: string;
  testFiles: TestFileDefinition[];
  dependencies: string[];
  setup?: string[];
  teardown?: string[];
}

export interface TestFileDefinition {
  path: string;
  content: string;
  platform: TestPlatform;
  framework: string;
  metadata: TestFileMetadata;
}

export interface TestFileMetadata {
  testCount: number;
  estimatedDuration: number;
  complexity: number;
  dependencies: string[];
  tags: string[];
}

export enum TestPlatform {
  WEB_CHROME = 'web-chrome',
  WEB_FIREFOX = 'web-firefox',
  WEB_SAFARI = 'web-safari',
  WEB_EDGE = 'web-edge',
  MOBILE_ANDROID = 'mobile-android',
  MOBILE_IOS = 'mobile-ios',
  DESKTOP_WINDOWS = 'desktop-windows',
  DESKTOP_MACOS = 'desktop-macos',
  DESKTOP_LINUX = 'desktop-linux',
  API_REST = 'api-rest',
  API_GRAPHQL = 'api-graphql',
  API_WEBSOCKET = 'api-websocket',
}

export interface ExecutionConfiguration {
  parallel: boolean;
  maxConcurrency: number;
  timeout: number;
  retries: number;
  failFast: boolean;
  reportFormat: ReportFormat[];
  screenshots: boolean;
  videos: boolean;
  logs: LogLevel;
}

export interface EnvironmentConfiguration {
  baseUrl?: string;
  variables: Record<string, string>;
  credentials?: CredentialConfiguration;
  proxy?: ProxyConfiguration;
  viewport?: ViewportConfiguration;
  locale?: string;
  timezone?: string;
}

export interface CredentialConfiguration {
  username?: string;
  password?: string;
  apiKey?: string;
  token?: string;
}

export interface ProxyConfiguration {
  host: string;
  port: number;
  username?: string;
  password?: string;
}

export interface ViewportConfiguration {
  width: number;
  height: number;
  deviceScaleFactor?: number;
}

export enum ReportFormat {
  JSON = 'json',
  XML = 'xml',
  HTML = 'html',
  JUNIT = 'junit',
  ALLURE = 'allure',
}

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
  TRACE = 'trace',
}

export interface TestExecutionResult {
  id: string;
  platform: TestPlatform;
  status: ExecutionStatus;
  startTime: Date;
  endTime: Date;
  duration: number;
  testResults: TestResult[];
  summary: TestSummary;
  artifacts: ExecutionArtifacts;
  errors?: ExecutionError[];
}

export enum ExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  TIMEOUT = 'timeout',
}

export interface TestResult {
  testName: string;
  status: TestStatus;
  duration: number;
  assertions: AssertionResult[];
  error?: string;
  stackTrace?: string;
  artifacts?: string[];
}

export enum TestStatus {
  PASSED = 'passed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
  PENDING = 'pending',
}

export interface AssertionResult {
  description: string;
  passed: boolean;
  expected?: any;
  actual?: any;
  error?: string;
}

export interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  pending: number;
  passRate: number;
}

export interface ExecutionArtifacts {
  screenshots: string[];
  videos: string[];
  logs: string[];
  reports: string[];
  coverage?: string;
}

export interface ExecutionError {
  type: string;
  message: string;
  stack?: string;
  timestamp: Date;
}

@Injectable()
export class CrossPlatformService {
  private readonly logger = new Logger(CrossPlatformService.name);
  private readonly executors: Map<TestPlatform, any> = new Map();

  constructor(
    private readonly webExecutor: WebTestExecutor,
    private readonly mobileExecutor: MobileTestExecutor,
    private readonly desktopExecutor: DesktopTestExecutor,
    private readonly apiExecutor: APITestExecutor,
    private readonly environmentManager: TestEnvironmentManager,
    private readonly parallelExecutionService: ParallelExecutionService,
    private readonly resultAggregationService: ResultAggregationService
  ) {
    this.initializeExecutors();
  }

  /**
   * Execute tests across multiple platforms
   *
   * @param request Cross-platform test execution request
   * @returns Aggregated execution results
   */
  async executeTests(request: CrossPlatformTestRequest): Promise<TestExecutionResult[]> {
    this.logger.log(`Starting cross-platform test execution for ${request.platforms.length} platforms`);
    const startTime = Date.now();

    try {
      // Setup test environments
      await this.environmentManager.setupEnvironments(request.platforms, request.environment);

      // Execute tests
      const results = request.executionConfig.parallel
        ? await this.executeTestsParallel(request)
        : await this.executeTestsSequential(request);

      // Aggregate results
      const aggregatedResults = await this.resultAggregationService.aggregateResults(results);

      this.logger.log(`Cross-platform execution completed in ${Date.now() - startTime}ms`);
      this.logger.log(`Total platforms: ${results.length}, Successful: ${results.filter(r => r.status === ExecutionStatus.COMPLETED).length}`);

      return aggregatedResults;
    } catch (error) {
      this.logger.error(`Cross-platform execution failed: ${error.message}`, error.stack);
      throw new Error(`Cross-platform execution failed: ${error.message}`);
    } finally {
      // Cleanup environments
      await this.environmentManager.cleanupEnvironments(request.platforms);
    }
  }

  /**
   * Execute tests in parallel across platforms
   */
  private async executeTestsParallel(request: CrossPlatformTestRequest): Promise<TestExecutionResult[]> {
    this.logger.log('Executing tests in parallel mode');

    const executionTasks = request.platforms.map(platform =>
      this.executePlatformTests(platform, request)
    );

    return this.parallelExecutionService.executeWithConcurrencyLimit(
      executionTasks,
      request.executionConfig.maxConcurrency
    );
  }

  /**
   * Execute tests sequentially across platforms
   */
  private async executeTestsSequential(request: CrossPlatformTestRequest): Promise<TestExecutionResult[]> {
    this.logger.log('Executing tests in sequential mode');

    const results: TestExecutionResult[] = [];

    for (const platform of request.platforms) {
      try {
        const result = await this.executePlatformTests(platform, request);
        results.push(result);

        // Check fail-fast option
        if (request.executionConfig.failFast && result.status === ExecutionStatus.FAILED) {
          this.logger.warn(`Fail-fast enabled, stopping execution after failure on ${platform}`);
          break;
        }
      } catch (error) {
        this.logger.error(`Platform execution failed for ${platform}: ${error.message}`);

        if (request.executionConfig.failFast) {
          throw error;
        }
      }
    }

    return results;
  }

  /**
   * Execute tests for a specific platform
   */
  private async executePlatformTests(
    platform: TestPlatform,
    request: CrossPlatformTestRequest
  ): Promise<TestExecutionResult> {
    this.logger.log(`Executing tests for platform: ${platform}`);

    const executor = this.getExecutorForPlatform(platform);
    if (!executor) {
      throw new Error(`No executor available for platform: ${platform}`);
    }

    const platformTests = request.testSuite.testFiles.filter(
      file => file.platform === platform || this.isPlatformCompatible(file.platform, platform)
    );

    if (platformTests.length === 0) {
      this.logger.warn(`No tests found for platform: ${platform}`);
      return this.createEmptyResult(platform);
    }

    const startTime = new Date();

    try {
      const result = await executor.executeTests({
        tests: platformTests,
        config: request.executionConfig,
        environment: request.environment,
      });

      const endTime = new Date();

      return {
        id: `exec-${platform}-${Date.now()}`,
        platform,
        status: ExecutionStatus.COMPLETED,
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        testResults: result.testResults,
        summary: this.calculateSummary(result.testResults),
        artifacts: result.artifacts,
        errors: result.errors,
      };
    } catch (error) {
      const endTime = new Date();
      this.logger.error(`Platform execution failed for ${platform}: ${error.message}`);

      return {
        id: `exec-${platform}-${Date.now()}`,
        platform,
        status: ExecutionStatus.FAILED,
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        testResults: [],
        summary: { total: 0, passed: 0, failed: 0, skipped: 0, pending: 0, passRate: 0 },
        artifacts: { screenshots: [], videos: [], logs: [], reports: [] },
        errors: [{
          type: 'ExecutionError',
          message: error.message,
          stack: error.stack,
          timestamp: new Date(),
        }],
      };
    }
  }

  /**
   * Initialize platform-specific executors
   */
  private initializeExecutors(): void {
    // Web platforms
    this.executors.set(TestPlatform.WEB_CHROME, this.webExecutor);
    this.executors.set(TestPlatform.WEB_FIREFOX, this.webExecutor);
    this.executors.set(TestPlatform.WEB_SAFARI, this.webExecutor);
    this.executors.set(TestPlatform.WEB_EDGE, this.webExecutor);

    // Mobile platforms
    this.executors.set(TestPlatform.MOBILE_ANDROID, this.mobileExecutor);
    this.executors.set(TestPlatform.MOBILE_IOS, this.mobileExecutor);

    // Desktop platforms
    this.executors.set(TestPlatform.DESKTOP_WINDOWS, this.desktopExecutor);
    this.executors.set(TestPlatform.DESKTOP_MACOS, this.desktopExecutor);
    this.executors.set(TestPlatform.DESKTOP_LINUX, this.desktopExecutor);

    // API platforms
    this.executors.set(TestPlatform.API_REST, this.apiExecutor);
    this.executors.set(TestPlatform.API_GRAPHQL, this.apiExecutor);
    this.executors.set(TestPlatform.API_WEBSOCKET, this.apiExecutor);
  }

  /**
   * Get executor for specific platform
   */
  private getExecutorForPlatform(platform: TestPlatform): any {
    return this.executors.get(platform);
  }

  /**
   * Check if test file platform is compatible with execution platform
   */
  private isPlatformCompatible(filePlatform: TestPlatform, executionPlatform: TestPlatform): boolean {
    // Web platforms are generally compatible with each other
    const webPlatforms = [
      TestPlatform.WEB_CHROME,
      TestPlatform.WEB_FIREFOX,
      TestPlatform.WEB_SAFARI,
      TestPlatform.WEB_EDGE,
    ];

    if (webPlatforms.includes(filePlatform) && webPlatforms.includes(executionPlatform)) {
      return true;
    }

    // Desktop platforms can sometimes be cross-compatible
    const desktopPlatforms = [
      TestPlatform.DESKTOP_WINDOWS,
      TestPlatform.DESKTOP_MACOS,
      TestPlatform.DESKTOP_LINUX,
    ];

    if (desktopPlatforms.includes(filePlatform) && desktopPlatforms.includes(executionPlatform)) {
      return true;
    }

    return false;
  }

  /**
   * Create empty result for platforms with no tests
   */
  private createEmptyResult(platform: TestPlatform): TestExecutionResult {
    const now = new Date();
    return {
      id: `exec-${platform}-${Date.now()}`,
      platform,
      status: ExecutionStatus.COMPLETED,
      startTime: now,
      endTime: now,
      duration: 0,
      testResults: [],
      summary: { total: 0, passed: 0, failed: 0, skipped: 0, pending: 0, passRate: 0 },
      artifacts: { screenshots: [], videos: [], logs: [], reports: [] },
    };
  }

  /**
   * Calculate test summary from results
   */
  private calculateSummary(testResults: TestResult[]): TestSummary {
    const total = testResults.length;
    const passed = testResults.filter(r => r.status === TestStatus.PASSED).length;
    const failed = testResults.filter(r => r.status === TestStatus.FAILED).length;
    const skipped = testResults.filter(r => r.status === TestStatus.SKIPPED).length;
    const pending = testResults.filter(r => r.status === TestStatus.PENDING).length;
    const passRate = total > 0 ? (passed / total) * 100 : 0;

    return { total, passed, failed, skipped, pending, passRate };
  }

  /**
   * Get available platforms for testing
   */
  async getAvailablePlatforms(): Promise<TestPlatform[]> {
    return this.environmentManager.getAvailablePlatforms();
  }

  /**
   * Validate platform compatibility
   */
  async validatePlatformCompatibility(
    platform: TestPlatform,
    testFiles: TestFileDefinition[]
  ): Promise<boolean> {
    return this.environmentManager.validatePlatformCompatibility(platform, testFiles);
  }
}