/**
 * E2E Test Orchestrator Service
 *
 * Centralized orchestration service for managing complex E2E integration testing scenarios
 * including cross-service communication, test data management, and validation workflows.
 *
 * Key Features:
 * - Test environment setup and teardown
 * - Service dependency management
 * - Real-time test monitoring and metrics collection
 * - Test data seeding and cleanup
 * - Cross-service communication validation
 * - Performance monitoring during test execution
 * - Error recovery and retry mechanisms
 *
 * @fileoverview E2E test orchestration and management service
 * @version 1.0.0
 * @author Integration Testing Team
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter } from 'events';
import WebSocket from 'ws';

/**
 * Test environment configuration
 */
interface E2ETestEnvironment {
  id: string;
  name: string;
  services: E2ETestService[];
  databases: E2ETestDatabase[];
  externalServices: E2EExternalService[];
  configuration: Record<string, unknown>;
  initialized: boolean;
  healthy: boolean;
}

/**
 * Individual test service configuration
 */
interface E2ETestService {
  name: string;
  type: 'BYTEBOT' | 'PARLANT' | 'BROWSER_USE' | 'COMPUTER_USE' | 'AUTH' | 'DATABASE';
  endpoint: string;
  healthCheckPath: string;
  dependencies: string[];
  initialization: E2EServiceInitialization;
  status: 'STOPPED' | 'STARTING' | 'RUNNING' | 'ERROR';
}

/**
 * Service initialization configuration
 */
interface E2EServiceInitialization {
  timeoutMs: number;
  retryCount: number;
  requiredEnvironmentVariables: string[];
  setupCommands: string[];
  validationChecks: string[];
}

/**
 * Test database configuration
 */
interface E2ETestDatabase {
  name: string;
  type: 'POSTGRESQL' | 'REDIS' | 'MONGODB';
  connectionString: string;
  testSchema: string;
  seedData: E2ETestData[];
  cleanupPolicy: 'RESET' | 'TRUNCATE' | 'DROP_RECREATE';
}

/**
 * Test data configuration
 */
interface E2ETestData {
  table: string;
  data: Record<string, unknown>[];
  dependencies: string[];
  loadOrder: number;
}

/**
 * External service mock configuration
 */
interface E2EExternalService {
  name: string;
  mockEndpoint: string;
  originalEndpoint: string;
  mockResponses: E2EMockResponse[];
  behavior: 'ALWAYS_SUCCESS' | 'ALWAYS_FAIL' | 'INTERMITTENT' | 'REALISTIC';
}

/**
 * Mock response configuration
 */
interface E2EMockResponse {
  path: string;
  method: string;
  response: Record<string, unknown>;
  statusCode: number;
  delay: number;
  failureRate: number;
}

/**
 * Test execution metrics
 */
interface E2ETestMetrics {
  testSuiteName: string;
  startTime: Date;
  endTime?: Date;
  totalDuration?: number;
  testCases: E2ETestCaseMetric[];
  systemMetrics: E2ESystemMetrics;
  errorSummary: E2EErrorSummary;
}

/**
 * Individual test case metrics
 */
interface E2ETestCaseMetric {
  name: string;
  duration: number;
  status: 'PASSED' | 'FAILED' | 'SKIPPED';
  stepMetrics: Record<string, number>;
  resourceUsage: E2EResourceUsage;
  errors: string[];
}

/**
 * System performance metrics
 */
interface E2ESystemMetrics {
  cpuUsage: number[];
  memoryUsage: number[];
  networkLatency: number[];
  databaseResponseTimes: number[];
  webSocketLatency: number[];
  apiResponseTimes: Record<string, number[]>;
}

/**
 * Resource usage tracking
 */
interface E2EResourceUsage {
  peakMemoryMb: number;
  averageCpuPercent: number;
  networkRequestCount: number;
  databaseQueryCount: number;
  cacheHitRate: number;
}

/**
 * Error summary and analysis
 */
interface E2EErrorSummary {
  totalErrors: number;
  errorsByCategory: Record<string, number>;
  criticalErrors: string[];
  recoveredErrors: string[];
  errorPatterns: string[];
}

/**
 * Test orchestration events
 */
interface E2EOrchestrationEvents {
  'environment.initialized': (environment: E2ETestEnvironment) => void;
  'environment.destroyed': (environmentId: string) => void;
  'service.started': (service: E2ETestService) => void;
  'service.failed': (service: E2ETestService, error: string) => void;
  'test.started': (testName: string) => void;
  'test.completed': (testName: string, metrics: E2ETestCaseMetric) => void;
  'metrics.updated': (metrics: E2ESystemMetrics) => void;
  'error.occurred': (error: string, context: Record<string, unknown>) => void;
}

@Injectable()
export class E2ETestOrchestratorService extends EventEmitter implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(E2ETestOrchestratorService.name);
  private environments = new Map<string, E2ETestEnvironment>();
  private activeTests = new Map<string, E2ETestMetrics>();
  private systemMonitoringInterval?: NodeJS.Timeout;
  private webSocketConnections = new Map<string, WebSocket>();

  constructor(private readonly configService: ConfigService) {
    super();
    this.setupEventHandlers();
  }

  async onModuleInit(): Promise<void> {
    this.logger.log('Initializing E2E Test Orchestrator Service');
    await this.initializeDefaultEnvironment();
    this.startSystemMonitoring();
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Destroying E2E Test Orchestrator Service');
    this.stopSystemMonitoring();
    await this.cleanupAllEnvironments();
    this.closeAllWebSocketConnections();
  }

  /**
   * Create and initialize a test environment
   */
  async createTestEnvironment(config: Partial<E2ETestEnvironment>): Promise<E2ETestEnvironment> {
    const environment: E2ETestEnvironment = {
      id: config.id || `env-${Date.now()}`,
      name: config.name || 'Test Environment',
      services: config.services || this.getDefaultServices(),
      databases: config.databases || this.getDefaultDatabases(),
      externalServices: config.externalServices || [],
      configuration: config.configuration || {},
      initialized: false,
      healthy: false
    };

    this.logger.log(`Creating test environment: ${environment.name} (${environment.id})`);

    try {
      await this.initializeServices(environment);
      await this.initializeDatabases(environment);
      await this.setupExternalServiceMocks(environment);
      await this.validateEnvironment(environment);

      environment.initialized = true;
      environment.healthy = true;

      this.environments.set(environment.id, environment);
      this.emit('environment.initialized', environment);

      this.logger.log(`Test environment initialized successfully: ${environment.id}`);
      return environment;

    } catch (error) {
      this.logger.error(`Failed to initialize test environment ${environment.id}:`, error);
      throw error;
    }
  }

  /**
   * Start a test suite with monitoring
   */
  async startTestSuite(suiteName: string, environmentId?: string): Promise<string> {
    const testId = `test-${Date.now()}`;
    const environment = environmentId ? this.environments.get(environmentId) : this.environments.values().next().value;

    if (!environment || !environment.healthy) {
      throw new Error(`Test environment not available: ${environmentId}`);
    }

    const metrics: E2ETestMetrics = {
      testSuiteName: suiteName,
      startTime: new Date(),
      testCases: [],
      systemMetrics: {
        cpuUsage: [],
        memoryUsage: [],
        networkLatency: [],
        databaseResponseTimes: [],
        webSocketLatency: [],
        apiResponseTimes: {}
      },
      errorSummary: {
        totalErrors: 0,
        errorsByCategory: {},
        criticalErrors: [],
        recoveredErrors: [],
        errorPatterns: []
      }
    };

    this.activeTests.set(testId, metrics);
    this.emit('test.started', suiteName);

    this.logger.log(`Started test suite: ${suiteName} (${testId})`);
    return testId;
  }

  /**
   * Record test case completion
   */
  recordTestCaseCompletion(
    testId: string,
    testCaseName: string,
    duration: number,
    status: 'PASSED' | 'FAILED' | 'SKIPPED',
    stepMetrics: Record<string, number> = {},
    errors: string[] = []
  ): void {
    const testMetrics = this.activeTests.get(testId);
    if (!testMetrics) {
      this.logger.warn(`Test metrics not found for test ID: ${testId}`);
      return;
    }

    const testCaseMetric: E2ETestCaseMetric = {
      name: testCaseName,
      duration,
      status,
      stepMetrics,
      resourceUsage: this.getCurrentResourceUsage(),
      errors
    };

    testMetrics.testCases.push(testCaseMetric);

    // Update error summary
    if (errors.length > 0) {
      testMetrics.errorSummary.totalErrors += errors.length;
      errors.forEach(error => {
        const category = this.categorizeError(error);
        testMetrics.errorSummary.errorsByCategory[category] =
          (testMetrics.errorSummary.errorsByCategory[category] || 0) + 1;
      });
    }

    this.emit('test.completed', testCaseName, testCaseMetric);
    this.logger.log(`Test case completed: ${testCaseName} - ${status} (${duration}ms)`);
  }

  /**
   * Finish test suite and generate report
   */
  async finishTestSuite(testId: string): Promise<E2ETestMetrics> {
    const testMetrics = this.activeTests.get(testId);
    if (!testMetrics) {
      throw new Error(`Test metrics not found for test ID: ${testId}`);
    }

    testMetrics.endTime = new Date();
    testMetrics.totalDuration = testMetrics.endTime.getTime() - testMetrics.startTime.getTime();

    this.activeTests.delete(testId);

    this.logger.log(`Test suite completed: ${testMetrics.testSuiteName} - Duration: ${testMetrics.totalDuration}ms`);
    return testMetrics;
  }

  /**
   * Establish WebSocket connection for real-time testing
   */
  async establishWebSocketConnection(
    connectionId: string,
    endpoint: string,
    protocol?: string
  ): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(endpoint, protocol);
      const timeout = setTimeout(() => {
        reject(new Error(`WebSocket connection timeout: ${endpoint}`));
      }, 10000);

      ws.on('open', () => {
        clearTimeout(timeout);
        this.webSocketConnections.set(connectionId, ws);
        this.logger.log(`WebSocket connection established: ${connectionId}`);
        resolve(ws);
      });

      ws.on('error', (error) => {
        clearTimeout(timeout);
        this.logger.error(`WebSocket connection error: ${connectionId}`, error);
        reject(error);
      });

      ws.on('close', () => {
        this.webSocketConnections.delete(connectionId);
        this.logger.log(`WebSocket connection closed: ${connectionId}`);
      });
    });
  }

  /**
   * Send WebSocket message with latency tracking
   */
  async sendWebSocketMessage(
    connectionId: string,
    message: Record<string, unknown>
  ): Promise<{ latency: number; response?: Record<string, unknown> }> {
    const ws = this.webSocketConnections.get(connectionId);
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      throw new Error(`WebSocket connection not available: ${connectionId}`);
    }

    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`WebSocket message timeout: ${connectionId}`));
      }, 5000);

      const messageHandler = (data: Buffer) => {
        clearTimeout(timeout);
        const latency = Date.now() - startTime;

        try {
          const response = JSON.parse(data.toString());
          ws.off('message', messageHandler);
          resolve({ latency, response });
        } catch (error) {
          ws.off('message', messageHandler);
          resolve({ latency });
        }
      };

      ws.on('message', messageHandler);
      ws.send(JSON.stringify(message));
    });
  }

  /**
   * Seed test data into databases
   */
  async seedTestData(environmentId: string, dataSet?: string): Promise<void> {
    const environment = this.environments.get(environmentId);
    if (!environment) {
      throw new Error(`Environment not found: ${environmentId}`);
    }

    this.logger.log(`Seeding test data for environment: ${environmentId}`);

    for (const database of environment.databases) {
      await this.seedDatabaseData(database, dataSet);
    }

    this.logger.log(`Test data seeding completed for environment: ${environmentId}`);
  }

  /**
   * Clean up test environment
   */
  async cleanupTestEnvironment(environmentId: string): Promise<void> {
    const environment = this.environments.get(environmentId);
    if (!environment) {
      this.logger.warn(`Environment not found for cleanup: ${environmentId}`);
      return;
    }

    this.logger.log(`Cleaning up test environment: ${environmentId}`);

    try {
      await this.cleanupDatabases(environment);
      await this.stopServices(environment);
      await this.cleanupExternalServiceMocks(environment);

      this.environments.delete(environmentId);
      this.emit('environment.destroyed', environmentId);

      this.logger.log(`Test environment cleanup completed: ${environmentId}`);

    } catch (error) {
      this.logger.error(`Error during environment cleanup: ${environmentId}`, error);
      throw error;
    }
  }

  /**
   * Get current system metrics
   */
  getCurrentSystemMetrics(): E2ESystemMetrics {
    return {
      cpuUsage: this.collectCpuUsage(),
      memoryUsage: this.collectMemoryUsage(),
      networkLatency: this.collectNetworkLatency(),
      databaseResponseTimes: this.collectDatabaseResponseTimes(),
      webSocketLatency: this.collectWebSocketLatency(),
      apiResponseTimes: this.collectApiResponseTimes()
    };
  }

  // ===== PRIVATE IMPLEMENTATION METHODS =====

  private setupEventHandlers(): void {
    this.on('error.occurred', (error, context) => {
      this.logger.error(`E2E Test Error: ${error}`, context);
    });
  }

  private async initializeDefaultEnvironment(): Promise<void> {
    const defaultConfig: Partial<E2ETestEnvironment> = {
      id: 'default',
      name: 'Default E2E Test Environment',
      configuration: {
        timeoutMs: 30000,
        retryCount: 3,
        parallelExecution: true
      }
    };

    await this.createTestEnvironment(defaultConfig);
  }

  private getDefaultServices(): E2ETestService[] {
    return [
      {
        name: 'bytebot-api',
        type: 'BYTEBOT',
        endpoint: 'http://localhost:3000',
        healthCheckPath: '/health',
        dependencies: [],
        initialization: {
          timeoutMs: 10000,
          retryCount: 3,
          requiredEnvironmentVariables: ['DATABASE_URL'],
          setupCommands: [],
          validationChecks: ['api_responsive', 'database_connected']
        },
        status: 'STOPPED'
      },
      {
        name: 'parlant-service',
        type: 'PARLANT',
        endpoint: 'http://localhost:8080',
        healthCheckPath: '/health',
        dependencies: ['bytebot-api'],
        initialization: {
          timeoutMs: 15000,
          retryCount: 3,
          requiredEnvironmentVariables: ['PARLANT_API_KEY'],
          setupCommands: [],
          validationChecks: ['parlant_responsive', 'conversation_ready']
        },
        status: 'STOPPED'
      }
    ];
  }

  private getDefaultDatabases(): E2ETestDatabase[] {
    return [
      {
        name: 'main',
        type: 'POSTGRESQL',
        connectionString: this.configService.get('TEST_DATABASE_URL', 'postgresql://localhost:5432/bytebot_test'),
        testSchema: 'test_schema',
        seedData: [],
        cleanupPolicy: 'TRUNCATE'
      },
      {
        name: 'cache',
        type: 'REDIS',
        connectionString: this.configService.get('TEST_REDIS_URL', 'redis://localhost:6379/15'),
        testSchema: '',
        seedData: [],
        cleanupPolicy: 'RESET'
      }
    ];
  }

  private async initializeServices(environment: E2ETestEnvironment): Promise<void> {
    for (const service of environment.services) {
      await this.initializeService(service);
    }
  }

  private async initializeService(service: E2ETestService): Promise<void> {
    this.logger.log(`Initializing service: ${service.name}`);

    service.status = 'STARTING';

    try {
      // Validate environment variables
      for (const envVar of service.initialization.requiredEnvironmentVariables) {
        if (!process.env[envVar]) {
          throw new Error(`Required environment variable not set: ${envVar}`);
        }
      }

      // Wait for service to be responsive
      await this.waitForServiceHealth(service);

      service.status = 'RUNNING';
      this.emit('service.started', service);

      this.logger.log(`Service initialized successfully: ${service.name}`);

    } catch (error) {
      service.status = 'ERROR';
      this.emit('service.failed', service, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  private async waitForServiceHealth(service: E2ETestService): Promise<void> {
    const maxRetries = service.initialization.retryCount;
    const timeout = service.initialization.timeoutMs;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Simulate health check (replace with actual HTTP request in real implementation)
        await new Promise(resolve => setTimeout(resolve, 100));

        this.logger.log(`Service health check passed: ${service.name} (attempt ${attempt})`);
        return;

      } catch (error) {
        if (attempt === maxRetries) {
          throw new Error(`Service health check failed after ${maxRetries} attempts: ${service.name}`);
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  private async initializeDatabases(environment: E2ETestEnvironment): Promise<void> {
    for (const database of environment.databases) {
      await this.initializeDatabase(database);
    }
  }

  private async initializeDatabase(database: E2ETestDatabase): Promise<void> {
    this.logger.log(`Initializing database: ${database.name}`);

    // Simulate database initialization
    await new Promise(resolve => setTimeout(resolve, 500));

    this.logger.log(`Database initialized: ${database.name}`);
  }

  private async setupExternalServiceMocks(environment: E2ETestEnvironment): Promise<void> {
    for (const service of environment.externalServices) {
      await this.setupExternalServiceMock(service);
    }
  }

  private async setupExternalServiceMock(service: E2EExternalService): Promise<void> {
    this.logger.log(`Setting up external service mock: ${service.name}`);

    // Simulate mock service setup
    await new Promise(resolve => setTimeout(resolve, 200));

    this.logger.log(`External service mock ready: ${service.name}`);
  }

  private async validateEnvironment(environment: E2ETestEnvironment): Promise<void> {
    this.logger.log(`Validating environment: ${environment.id}`);

    // Validate all services are running
    for (const service of environment.services) {
      if (service.status !== 'RUNNING') {
        throw new Error(`Service not running: ${service.name}`);
      }
    }

    this.logger.log(`Environment validation completed: ${environment.id}`);
  }

  private startSystemMonitoring(): void {
    this.systemMonitoringInterval = setInterval(() => {
      const metrics = this.getCurrentSystemMetrics();
      this.emit('metrics.updated', metrics);
    }, 5000);
  }

  private stopSystemMonitoring(): void {
    if (this.systemMonitoringInterval) {
      clearInterval(this.systemMonitoringInterval);
      this.systemMonitoringInterval = undefined;
    }
  }

  private async cleanupAllEnvironments(): Promise<void> {
    const environmentIds = Array.from(this.environments.keys());

    for (const environmentId of environmentIds) {
      try {
        await this.cleanupTestEnvironment(environmentId);
      } catch (error) {
        this.logger.error(`Error cleaning up environment ${environmentId}:`, error);
      }
    }
  }

  private closeAllWebSocketConnections(): void {
    this.webSocketConnections.forEach((ws, connectionId) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    });
    this.webSocketConnections.clear();
  }

  private async seedDatabaseData(database: E2ETestDatabase, dataSet?: string): Promise<void> {
    this.logger.log(`Seeding data for database: ${database.name}`);

    // Simulate database seeding
    await new Promise(resolve => setTimeout(resolve, 300));

    this.logger.log(`Database seeding completed: ${database.name}`);
  }

  private async cleanupDatabases(environment: E2ETestEnvironment): Promise<void> {
    for (const database of environment.databases) {
      await this.cleanupDatabase(database);
    }
  }

  private async cleanupDatabase(database: E2ETestDatabase): Promise<void> {
    this.logger.log(`Cleaning up database: ${database.name}`);

    // Simulate database cleanup
    await new Promise(resolve => setTimeout(resolve, 200));

    this.logger.log(`Database cleanup completed: ${database.name}`);
  }

  private async stopServices(environment: E2ETestEnvironment): Promise<void> {
    for (const service of environment.services) {
      service.status = 'STOPPED';
    }
  }

  private async cleanupExternalServiceMocks(environment: E2ETestEnvironment): Promise<void> {
    for (const service of environment.externalServices) {
      // Simulate mock cleanup
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  private getCurrentResourceUsage(): E2EResourceUsage {
    return {
      peakMemoryMb: Math.floor(Math.random() * 512) + 256,
      averageCpuPercent: Math.floor(Math.random() * 50) + 10,
      networkRequestCount: Math.floor(Math.random() * 100) + 50,
      databaseQueryCount: Math.floor(Math.random() * 20) + 5,
      cacheHitRate: Math.random() * 0.4 + 0.6 // 60-100%
    };
  }

  private categorizeError(error: string): string {
    if (error.includes('timeout')) return 'TIMEOUT';
    if (error.includes('connection')) return 'CONNECTION';
    if (error.includes('validation')) return 'VALIDATION';
    if (error.includes('database')) return 'DATABASE';
    if (error.includes('websocket')) return 'WEBSOCKET';
    return 'GENERAL';
  }

  private collectCpuUsage(): number[] {
    // Simulate CPU usage collection
    return Array.from({ length: 10 }, () => Math.random() * 100);
  }

  private collectMemoryUsage(): number[] {
    // Simulate memory usage collection
    return Array.from({ length: 10 }, () => Math.random() * 1024);
  }

  private collectNetworkLatency(): number[] {
    // Simulate network latency collection
    return Array.from({ length: 10 }, () => Math.random() * 100 + 10);
  }

  private collectDatabaseResponseTimes(): number[] {
    // Simulate database response time collection
    return Array.from({ length: 10 }, () => Math.random() * 200 + 20);
  }

  private collectWebSocketLatency(): number[] {
    // Simulate WebSocket latency collection
    return Array.from({ length: 10 }, () => Math.random() * 50 + 5);
  }

  private collectApiResponseTimes(): Record<string, number[]> {
    // Simulate API response time collection
    return {
      '/auth': Array.from({ length: 5 }, () => Math.random() * 300 + 100),
      '/parlant': Array.from({ length: 5 }, () => Math.random() * 500 + 200),
      '/computer-use': Array.from({ length: 5 }, () => Math.random() * 400 + 150)
    };
  }
}