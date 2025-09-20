/**
 * Multi-Agent Coordination End-to-End Tests
 *
 * Comprehensive E2E tests for multi-agent browser automation coordination.
 * Tests complex workflows involving multiple agents, distributed task execution,
 * session sharing, data aggregation, and real-world scenarios.
 *
 * @author Claude Code
 * @version 1.0.0
 * @date 2025-09-20
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';
import { BrowserUseModule } from '../src/browser-use/browser-use.module';
import { SecurityModule } from '../src/common/security/security.module';
import { AuthModule } from '../src/auth/auth.module';
import { PrismaService } from '../src/database/prisma.service';
import {
  CreateOrchestrationDto,
  OrchestrationStrategy,
  TaskPriority,
  OrchestrationStatus
} from '../src/browser-use/dto/browser-orchestration.dto';

describe('Multi-Agent Coordination (E2E)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let authToken: string;
  let browserUseProcess: ChildProcess | null = null;

  // Test configuration for realistic scenarios
  const testConfig = {
    maxAgents: 8,
    maxSessions: 15,
    testTimeout: 120000, // 2 minutes for complex workflows
    realWorldUrls: {
      ecommerce: 'https://httpbin.org/html', // Mock e-commerce site
      forms: 'https://httpbin.org/forms/post', // Mock form site
      api: 'https://httpbin.org/json', // Mock API endpoint
      images: 'https://httpbin.org/image/jpeg', // Mock image site
      redirects: 'https://httpbin.org/redirect/3', // Mock redirect chain
    },
  };

  beforeAll(async () => {
    // Initialize test environment
    await setupTestEnvironment();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        SecurityModule,
        AuthModule,
        BrowserUseModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    authToken = await getTestAuthToken(app);

    // Clean test database
    await cleanupTestData();
  }, testConfig.testTimeout);

  afterAll(async () => {
    await cleanupTestData();
    await app?.close();
    await teardownTestEnvironment();
  }, testConfig.testTimeout);

  describe('Complex Multi-Agent Workflows', () => {
    it('should execute e-commerce data extraction workflow with multiple agents', async () => {
      const ecommerceWorkflowDto: CreateOrchestrationDto = {
        name: 'E-commerce Data Extraction Workflow',
        strategy: OrchestrationStrategy.HYBRID,
        maxConcurrentAgents: 5,
        maxConcurrentSessions: 8,
        tasks: [
          {
            name: 'Category Page Navigation',
            type: 'navigation',
            url: testConfig.realWorldUrls.ecommerce,
            instructions: 'Navigate to category page and extract category structure',
            priority: TaskPriority.CRITICAL,
            agentRequirements: {
              capabilities: ['web_navigation', 'data_extraction'],
              minMemory: 512,
            },
            expectedResults: {
              categories: 'array',
              navigationLinks: 'array',
              pageTitle: 'string',
            },
          },
          {
            name: 'Product Listing Extraction',
            type: 'data_extraction',
            url: testConfig.realWorldUrls.ecommerce,
            instructions: 'Extract product listings with names, prices, and availability',
            priority: TaskPriority.HIGH,
            agentRequirements: {
              capabilities: ['data_extraction', 'screenshot'],
              preferredBrowser: 'chrome',
            },
            dependencies: ['Category Page Navigation'],
            dataMapping: {
              products: {
                selector: '.product-item',
                fields: {
                  name: '.product-name',
                  price: '.product-price',
                  availability: '.stock-status',
                },
              },
            },
          },
          {
            name: 'Product Images Capture',
            type: 'screenshot',
            url: testConfig.realWorldUrls.images,
            instructions: 'Capture product images for visual analysis',
            priority: TaskPriority.NORMAL,
            agentRequirements: {
              capabilities: ['screenshot', 'image_processing'],
              minBandwidth: 100,
            },
            screenshotConfig: {
              format: 'PNG',
              quality: 90,
              fullPage: false,
              elementSelector: '.product-gallery',
            },
          },
          {
            name: 'Price Comparison Analysis',
            type: 'data_analysis',
            url: testConfig.realWorldUrls.api,
            instructions: 'Analyze pricing data and generate comparison report',
            priority: TaskPriority.HIGH,
            agentRequirements: {
              capabilities: ['data_analysis', 'report_generation'],
              processingPower: 'high',
            },
            dependencies: ['Product Listing Extraction'],
            analysisConfig: {
              metrics: ['min_price', 'max_price', 'average_price', 'price_distribution'],
              outputFormat: 'json',
            },
          },
          {
            name: 'Inventory Status Check',
            type: 'form_interaction',
            url: testConfig.realWorldUrls.forms,
            instructions: 'Check inventory status for high-priority products',
            priority: TaskPriority.NORMAL,
            agentRequirements: {
              capabilities: ['form_interaction', 'data_validation'],
            },
            dependencies: ['Product Listing Extraction'],
            formConfig: {
              method: 'POST',
              fields: {
                product_id: 'dynamic',
                check_inventory: 'true',
              },
            },
          },
        ],
        workflowConfig: {
          enableDataAggregation: true,
          aggregationStrategy: 'hierarchical',
          enableResultCaching: true,
          timeoutPerTask: 60,
          globalTimeout: 300,
        },
        coordinationRules: {
          taskDependencies: {
            enforceOrder: true,
            allowParallelExecution: true,
            waitForDependencies: true,
          },
          resourceSharing: {
            enableSessionReuse: true,
            enableDataSharing: true,
            maxSharedSessions: 3,
          },
          errorHandling: {
            retryFailedTasks: true,
            maxRetries: 2,
            propagateErrors: false,
            continueOnFailure: true,
          },
        },
      };

      // Create and execute the complex workflow
      const createResponse = await request(app.getHttpServer())
        .post('/browser-orchestration/orchestrations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(ecommerceWorkflowDto)
        .expect(HttpStatus.CREATED);

      const orchestrationId = createResponse.body.id;
      expect(orchestrationId).toBeDefined();

      // Execute the workflow
      const executeResponse = await request(app.getHttpServer())
        .post(`/browser-orchestration/orchestrations/${orchestrationId}/execute`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HttpStatus.OK);

      expect(executeResponse.body.status).toBe(OrchestrationStatus.RUNNING);

      // Monitor workflow execution with detailed tracking
      const executionMetrics = await monitorWorkflowExecution(orchestrationId, {
        trackAgentUtilization: true,
        trackSessionCoordination: true,
        trackDataFlow: true,
        trackPerformance: true,
      });

      // Validate workflow completion and results
      expect(executionMetrics.finalStatus).toBeOneOf([
        OrchestrationStatus.COMPLETED,
        OrchestrationStatus.PARTIALLY_COMPLETED
      ]);

      // Verify multi-agent coordination
      expect(executionMetrics.agentMetrics.totalAgentsUsed).toBeGreaterThanOrEqual(3);
      expect(executionMetrics.agentMetrics.maxConcurrentAgents).toBeLessThanOrEqual(5);
      expect(executionMetrics.agentMetrics.averageUtilization).toBeGreaterThan(50);

      // Verify task execution and dependencies
      expect(executionMetrics.taskMetrics.completedTasks).toBeGreaterThan(0);
      expect(executionMetrics.taskMetrics.dependencyViolations).toBe(0);

      // Verify data aggregation
      expect(executionMetrics.dataMetrics.aggregatedResults).toBeDefined();
      expect(executionMetrics.dataMetrics.dataConsistency).toBeGreaterThan(90);

      // Verify session coordination
      expect(executionMetrics.sessionMetrics.sessionsCreated).toBeGreaterThan(0);
      expect(executionMetrics.sessionMetrics.sessionsReused).toBeGreaterThanOrEqual(0);
      expect(executionMetrics.sessionMetrics.resourceEfficiency).toBeGreaterThan(70);
    }, testConfig.testTimeout);

    it('should handle complex form automation workflow across multiple pages', async () => {
      const formWorkflowDto: CreateOrchestrationDto = {
        name: 'Multi-Page Form Automation Workflow',
        strategy: OrchestrationStrategy.SEQUENTIAL,
        maxConcurrentAgents: 3,
        tasks: [
          {
            name: 'Initial Form Page Navigation',
            type: 'navigation',
            url: testConfig.realWorldUrls.forms,
            instructions: 'Navigate to initial form page and validate accessibility',
            priority: TaskPriority.CRITICAL,
            validationRules: {
              pageTitle: { required: true, pattern: '.*[Ff]orm.*' },
              formElements: { minCount: 1 },
              loadTime: { maxSeconds: 10 },
            },
          },
          {
            name: 'Form Field Discovery',
            type: 'form_analysis',
            url: testConfig.realWorldUrls.forms,
            instructions: 'Analyze form structure and identify required fields',
            priority: TaskPriority.HIGH,
            dependencies: ['Initial Form Page Navigation'],
            analysisConfig: {
              fieldTypes: ['text', 'email', 'password', 'select', 'checkbox', 'radio'],
              validationRules: true,
              requiredFields: true,
              formAction: true,
            },
          },
          {
            name: 'Form Data Population',
            type: 'form_interaction',
            url: testConfig.realWorldUrls.forms,
            instructions: 'Populate form fields with test data systematically',
            priority: TaskPriority.HIGH,
            dependencies: ['Form Field Discovery'],
            formData: {
              personal: {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                phone: '+1-555-0123',
              },
              address: {
                street: '123 Test Street',
                city: 'Test City',
                state: 'Test State',
                zipCode: '12345',
              },
              preferences: {
                newsletter: true,
                notifications: false,
                marketing: true,
              },
            },
            populationStrategy: {
              method: 'progressive',
              validateEachField: true,
              handleDynamicFields: true,
              waitForValidation: true,
            },
          },
          {
            name: 'Form Validation Check',
            type: 'form_validation',
            url: testConfig.realWorldUrls.forms,
            instructions: 'Validate form data and check for errors',
            priority: TaskPriority.HIGH,
            dependencies: ['Form Data Population'],
            validationConfig: {
              checkRequired: true,
              checkFormats: true,
              checkBusinessRules: true,
              captureValidationMessages: true,
            },
          },
          {
            name: 'Form Submission',
            type: 'form_submission',
            url: testConfig.realWorldUrls.forms,
            instructions: 'Submit form and capture response',
            priority: TaskPriority.CRITICAL,
            dependencies: ['Form Validation Check'],
            submissionConfig: {
              method: 'POST',
              waitForResponse: true,
              captureResponse: true,
              timeoutSeconds: 30,
            },
            expectedOutcomes: {
              successIndicators: ['.success-message', '.confirmation'],
              errorIndicators: ['.error-message', '.validation-error'],
              redirectPatterns: ['/success', '/confirmation', '/thank-you'],
            },
          },
        ],
        sessionConfig: {
          persistent: true,
          maintainState: true,
          cookieHandling: 'preserve',
          sessionTimeout: 300,
        },
      };

      const createResponse = await request(app.getHttpServer())
        .post('/browser-orchestration/orchestrations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(formWorkflowDto)
        .expect(HttpStatus.CREATED);

      const orchestrationId = createResponse.body.id;

      const executeResponse = await request(app.getHttpServer())
        .post(`/browser-orchestration/orchestrations/${orchestrationId}/execute`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HttpStatus.OK);

      // Monitor form workflow execution
      const formMetrics = await monitorWorkflowExecution(orchestrationId, {
        trackFormInteractions: true,
        trackValidationSteps: true,
        trackDataFlow: true,
        captureScreenshots: true,
      });

      // Validate form workflow completion
      expect(formMetrics.finalStatus).toBeOneOf([
        OrchestrationStatus.COMPLETED,
        OrchestrationStatus.PARTIALLY_COMPLETED
      ]);

      // Verify form interaction quality
      expect(formMetrics.formMetrics.fieldsPopulated).toBeGreaterThan(0);
      expect(formMetrics.formMetrics.validationErrors).toBe(0);
      expect(formMetrics.formMetrics.submissionSuccess).toBe(true);

      // Verify session persistence
      expect(formMetrics.sessionMetrics.sessionMaintained).toBe(true);
      expect(formMetrics.sessionMetrics.stateConsistency).toBeGreaterThan(95);
    }, testConfig.testTimeout);

    it('should coordinate data aggregation from multiple sources', async () => {
      const dataAggregationDto: CreateOrchestrationDto = {
        name: 'Multi-Source Data Aggregation Workflow',
        strategy: OrchestrationStrategy.PARALLEL,
        maxConcurrentAgents: 6,
        tasks: [
          {
            name: 'API Data Source 1',
            type: 'api_data_extraction',
            url: `${testConfig.realWorldUrls.api}?source=1`,
            instructions: 'Extract structured data from API source 1',
            priority: TaskPriority.HIGH,
            dataSchema: {
              type: 'object',
              properties: {
                users: { type: 'array' },
                metadata: { type: 'object' },
                timestamp: { type: 'string' },
              },
            },
          },
          {
            name: 'API Data Source 2',
            type: 'api_data_extraction',
            url: `${testConfig.realWorldUrls.api}?source=2`,
            instructions: 'Extract structured data from API source 2',
            priority: TaskPriority.HIGH,
            dataSchema: {
              type: 'object',
              properties: {
                products: { type: 'array' },
                categories: { type: 'array' },
                timestamp: { type: 'string' },
              },
            },
          },
          {
            name: 'Web Scraping Source 1',
            type: 'web_scraping',
            url: testConfig.realWorldUrls.ecommerce,
            instructions: 'Scrape structured data from web source 1',
            priority: TaskPriority.NORMAL,
            scrapingConfig: {
              selectors: {
                title: 'h1',
                content: '.main-content',
                links: 'a[href]',
                images: 'img[src]',
              },
              pagination: {
                enabled: false,
                maxPages: 3,
              },
            },
          },
          {
            name: 'Web Scraping Source 2',
            type: 'web_scraping',
            url: testConfig.realWorldUrls.redirects,
            instructions: 'Scrape data from web source 2 with redirect handling',
            priority: TaskPriority.NORMAL,
            scrapingConfig: {
              followRedirects: true,
              maxRedirects: 5,
              selectors: {
                finalUrl: 'window.location.href',
                pageData: 'body',
              },
            },
          },
          {
            name: 'Data Normalization',
            type: 'data_processing',
            url: 'internal://data-processor',
            instructions: 'Normalize data formats from all sources',
            priority: TaskPriority.HIGH,
            dependencies: [
              'API Data Source 1',
              'API Data Source 2',
              'Web Scraping Source 1',
              'Web Scraping Source 2'
            ],
            processingConfig: {
              normalizationRules: {
                dateFormat: 'ISO8601',
                textEncoding: 'UTF-8',
                numberFormat: 'decimal',
              },
              deduplication: {
                enabled: true,
                keyFields: ['id', 'name', 'url'],
              },
            },
          },
          {
            name: 'Data Aggregation and Report',
            type: 'data_aggregation',
            url: 'internal://aggregator',
            instructions: 'Aggregate normalized data and generate comprehensive report',
            priority: TaskPriority.CRITICAL,
            dependencies: ['Data Normalization'],
            aggregationConfig: {
              groupByFields: ['source', 'category', 'type'],
              aggregationFunctions: ['count', 'sum', 'average', 'min', 'max'],
              outputFormat: 'json',
              includeMetadata: true,
            },
          },
        ],
        dataFlow: {
          enableIntermediateStorage: true,
          dataValidation: true,
          schemaValidation: true,
          qualityChecks: {
            completeness: 95,
            accuracy: 90,
            consistency: 85,
          },
        },
      };

      const createResponse = await request(app.getHttpServer())
        .post('/browser-orchestration/orchestrations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(dataAggregationDto)
        .expect(HttpStatus.CREATED);

      const orchestrationId = createResponse.body.id;

      const executeResponse = await request(app.getHttpServer())
        .post(`/browser-orchestration/orchestrations/${orchestrationId}/execute`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HttpStatus.OK);

      // Monitor data aggregation workflow
      const aggregationMetrics = await monitorWorkflowExecution(orchestrationId, {
        trackDataFlow: true,
        trackDataQuality: true,
        trackProcessingSteps: true,
        captureIntermediateResults: true,
      });

      // Validate data aggregation results
      expect(aggregationMetrics.finalStatus).toBe(OrchestrationStatus.COMPLETED);

      // Verify data quality and completeness
      expect(aggregationMetrics.dataMetrics.sourcesProcessed).toBe(4);
      expect(aggregationMetrics.dataMetrics.dataQualityScore).toBeGreaterThan(80);
      expect(aggregationMetrics.dataMetrics.aggregationSuccess).toBe(true);

      // Verify parallel processing efficiency
      expect(aggregationMetrics.performanceMetrics.parallelEfficiency).toBeGreaterThan(70);
      expect(aggregationMetrics.performanceMetrics.totalProcessingTime).toBeLessThan(90);
    }, testConfig.testTimeout);
  });

  describe('Agent Coordination and Load Balancing', () => {
    it('should dynamically balance load across available agents', async () => {
      const loadBalancingDto: CreateOrchestrationDto = {
        name: 'Dynamic Load Balancing Test',
        strategy: OrchestrationStrategy.ADAPTIVE,
        maxConcurrentAgents: 4,
        autoScale: true,
        tasks: Array.from({ length: 12 }, (_, i) => ({
          name: `Load Test Task ${i + 1}`,
          type: 'mixed_workload',
          url: `${testConfig.realWorldUrls.api}?task=${i + 1}`,
          instructions: `Execute mixed workload task ${i + 1}`,
          priority: i % 3 === 0 ? TaskPriority.HIGH : TaskPriority.NORMAL,
          workloadType: i % 4 === 0 ? 'cpu_intensive' :
                       i % 4 === 1 ? 'memory_intensive' :
                       i % 4 === 2 ? 'network_intensive' : 'balanced',
          estimatedDuration: 30 + (i % 5) * 10, // Variable duration
        })),
        loadBalancing: {
          strategy: 'adaptive',
          metrics: ['cpu_usage', 'memory_usage', 'task_queue_length', 'response_time'],
          rebalanceThreshold: 0.8,
          rebalanceInterval: 10,
        },
      };

      const createResponse = await request(app.getHttpServer())
        .post('/browser-orchestration/orchestrations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(loadBalancingDto)
        .expect(HttpStatus.CREATED);

      const orchestrationId = createResponse.body.id;

      const executeResponse = await request(app.getHttpServer())
        .post(`/browser-orchestration/orchestrations/${orchestrationId}/execute`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HttpStatus.OK);

      // Monitor load balancing behavior
      const loadBalancingMetrics = await monitorLoadBalancing(orchestrationId, {
        monitoringInterval: 2000,
        trackAgentUtilization: true,
        trackTaskDistribution: true,
        trackRebalanceEvents: true,
      });

      // Validate load balancing effectiveness
      expect(loadBalancingMetrics.finalStatus).toBe(OrchestrationStatus.COMPLETED);
      expect(loadBalancingMetrics.loadBalancingMetrics.utilizationVariance).toBeLessThan(0.3);
      expect(loadBalancingMetrics.loadBalancingMetrics.rebalanceEvents).toBeGreaterThan(0);
      expect(loadBalancingMetrics.performanceMetrics.throughput).toBeGreaterThan(0.5);
    }, testConfig.testTimeout);

    it('should handle agent failures and redistribute tasks seamlessly', async () => {
      const failureResilienceDto: CreateOrchestrationDto = {
        name: 'Agent Failure Resilience Test',
        strategy: OrchestrationStrategy.FAULT_TOLERANT,
        maxConcurrentAgents: 5,
        tasks: [
          {
            name: 'Stable Task 1',
            type: 'navigation',
            url: testConfig.realWorldUrls.api,
            instructions: 'Reliable navigation task',
            priority: TaskPriority.HIGH,
          },
          {
            name: 'Failure-Prone Task',
            type: 'unreliable_operation',
            url: 'https://invalid-domain-failure-test.com',
            instructions: 'This task should cause agent issues',
            priority: TaskPriority.NORMAL,
            maxRetries: 3,
          },
          {
            name: 'Stable Task 2',
            type: 'data_extraction',
            url: testConfig.realWorldUrls.json,
            instructions: 'Reliable data extraction',
            priority: TaskPriority.HIGH,
          },
          {
            name: 'Recovery Task',
            type: 'navigation',
            url: testConfig.realWorldUrls.ecommerce,
            instructions: 'Task to verify system recovery',
            priority: TaskPriority.CRITICAL,
          },
        ],
        resilienceConfig: {
          enableFailureDetection: true,
          agentHealthMonitoring: true,
          automaticTaskRedistribution: true,
          isolateFailedAgents: true,
          agentRecoveryAttempts: 2,
        },
      };

      const createResponse = await request(app.getHttpServer())
        .post('/browser-orchestration/orchestrations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(failureResilienceDto)
        .expect(HttpStatus.CREATED);

      const orchestrationId = createResponse.body.id;

      const executeResponse = await request(app.getHttpServer())
        .post(`/browser-orchestration/orchestrations/${orchestrationId}/execute`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HttpStatus.OK);

      // Monitor failure handling and recovery
      const resilienceMetrics = await monitorFailureResilience(orchestrationId, {
        trackAgentHealth: true,
        trackTaskRedistribution: true,
        trackRecoveryEvents: true,
      });

      // Validate resilience and recovery
      expect(resilienceMetrics.finalStatus).toBeOneOf([
        OrchestrationStatus.COMPLETED,
        OrchestrationStatus.PARTIALLY_COMPLETED
      ]);

      expect(resilienceMetrics.resilienceMetrics.failureDetectionTime).toBeLessThan(10);
      expect(resilienceMetrics.resilienceMetrics.taskRedistributionSuccess).toBe(true);
      expect(resilienceMetrics.resilienceMetrics.systemRecoveryTime).toBeLessThan(30);
    }, testConfig.testTimeout);
  });

  describe('Session Coordination and Resource Management', () => {
    it('should optimize session reuse across multiple related tasks', async () => {
      const sessionOptimizationDto: CreateOrchestrationDto = {
        name: 'Session Optimization Workflow',
        strategy: OrchestrationStrategy.RESOURCE_OPTIMIZED,
        maxConcurrentSessions: 6,
        tasks: [
          {
            name: 'Login Session',
            type: 'authentication',
            url: `${testConfig.realWorldUrls.forms}?auth=true`,
            instructions: 'Establish authenticated session',
            priority: TaskPriority.CRITICAL,
            sessionConfig: {
              persistent: true,
              sessionId: 'auth_session_1',
              cookieHandling: 'preserve',
            },
          },
          {
            name: 'Profile Data Extraction',
            type: 'data_extraction',
            url: `${testConfig.realWorldUrls.api}?profile=true`,
            instructions: 'Extract user profile data using authenticated session',
            priority: TaskPriority.HIGH,
            dependencies: ['Login Session'],
            sessionConfig: {
              reuseSession: 'auth_session_1',
              requireAuthentication: true,
            },
          },
          {
            name: 'Settings Configuration',
            type: 'form_interaction',
            url: `${testConfig.realWorldUrls.forms}?settings=true`,
            instructions: 'Update user settings in authenticated session',
            priority: TaskPriority.NORMAL,
            dependencies: ['Login Session'],
            sessionConfig: {
              reuseSession: 'auth_session_1',
              maintainState: true,
            },
          },
          {
            name: 'Data Export',
            type: 'data_export',
            url: `${testConfig.realWorldUrls.api}?export=true`,
            instructions: 'Export user data using authenticated session',
            priority: TaskPriority.HIGH,
            dependencies: ['Profile Data Extraction', 'Settings Configuration'],
            sessionConfig: {
              reuseSession: 'auth_session_1',
              finalizeSession: true,
            },
          },
        ],
        sessionManagement: {
          enableSessionReuse: true,
          sessionPooling: true,
          optimizeResources: true,
          trackSessionMetrics: true,
        },
      };

      const createResponse = await request(app.getHttpServer())
        .post('/browser-orchestration/orchestrations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(sessionOptimizationDto)
        .expect(HttpStatus.CREATED);

      const orchestrationId = createResponse.body.id;

      const executeResponse = await request(app.getHttpServer())
        .post(`/browser-orchestration/orchestrations/${orchestrationId}/execute`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HttpStatus.OK);

      // Monitor session optimization
      const sessionMetrics = await monitorSessionOptimization(orchestrationId, {
        trackSessionReuse: true,
        trackResourceUtilization: true,
        trackAuthenticationState: true,
      });

      // Validate session optimization
      expect(sessionMetrics.finalStatus).toBe(OrchestrationStatus.COMPLETED);
      expect(sessionMetrics.sessionMetrics.reuseRate).toBeGreaterThan(70);
      expect(sessionMetrics.sessionMetrics.resourceEfficiency).toBeGreaterThan(80);
      expect(sessionMetrics.sessionMetrics.authenticationConsistency).toBe(100);
    }, testConfig.testTimeout);
  });

  // Helper Functions
  async function setupTestEnvironment(): Promise<void> {
    // Start browser-use process for testing
    const browserUsePath = path.join(process.cwd(), '../../browser-use');
    browserUseProcess = spawn('python', ['-m', 'browser_use.mcp.server'], {
      cwd: browserUsePath,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        BROWSER_USE_TEST_MODE: 'true',
        BROWSER_USE_HEADLESS: 'true',
      },
    });

    // Wait for browser-use to be ready
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  async function teardownTestEnvironment(): Promise<void> {
    if (browserUseProcess) {
      browserUseProcess.kill('SIGTERM');
      await new Promise(resolve => {
        browserUseProcess?.on('exit', resolve);
        setTimeout(resolve, 5000);
      });
    }
  }

  async function monitorWorkflowExecution(
    orchestrationId: string,
    options: {
      trackAgentUtilization?: boolean;
      trackSessionCoordination?: boolean;
      trackDataFlow?: boolean;
      trackPerformance?: boolean;
      trackFormInteractions?: boolean;
      trackValidationSteps?: boolean;
      captureScreenshots?: boolean;
      captureIntermediateResults?: boolean;
    }
  ): Promise<any> {
    const metrics: any = {
      agentMetrics: {},
      sessionMetrics: {},
      taskMetrics: {},
      dataMetrics: {},
      performanceMetrics: {},
      formMetrics: {},
    };

    let status = OrchestrationStatus.RUNNING;
    const startTime = Date.now();

    while (status === OrchestrationStatus.RUNNING) {
      try {
        const statusResponse = await request(app.getHttpServer())
          .get(`/browser-orchestration/orchestrations/${orchestrationId}/status`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(HttpStatus.OK);

        status = statusResponse.body.status;

        // Collect metrics based on options
        if (options.trackAgentUtilization) {
          const agentResponse = await request(app.getHttpServer())
            .get('/browser-orchestration/agents/status')
            .set('Authorization', `Bearer ${authToken}`);

          metrics.agentMetrics = {
            ...metrics.agentMetrics,
            totalAgentsUsed: agentResponse.body.totalAgents,
            maxConcurrentAgents: Math.max(
              metrics.agentMetrics.maxConcurrentAgents || 0,
              agentResponse.body.activeAgents
            ),
            averageUtilization: agentResponse.body.utilization,
          };
        }

        if (options.trackSessionCoordination) {
          metrics.sessionMetrics = {
            ...metrics.sessionMetrics,
            sessionsCreated: statusResponse.body.sessions?.total || 0,
            sessionsReused: statusResponse.body.sessions?.reused || 0,
            resourceEfficiency: statusResponse.body.resourceOptimization?.efficiency || 0,
          };
        }

        if (options.trackDataFlow) {
          metrics.dataMetrics = {
            ...metrics.dataMetrics,
            dataConsistency: statusResponse.body.dataQuality?.consistency || 0,
            aggregatedResults: statusResponse.body.results || {},
          };
        }

        metrics.taskMetrics = {
          completedTasks: statusResponse.body.progress?.completedTasks || 0,
          failedTasks: statusResponse.body.progress?.failedTasks || 0,
          dependencyViolations: statusResponse.body.dependencyIssues || 0,
        };

        if (status !== OrchestrationStatus.RUNNING) break;
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.warn('Error monitoring workflow:', error);
        break;
      }
    }

    metrics.finalStatus = status;
    metrics.totalExecutionTime = Date.now() - startTime;

    return metrics;
  }

  async function monitorLoadBalancing(
    orchestrationId: string,
    options: {
      monitoringInterval: number;
      trackAgentUtilization: boolean;
      trackTaskDistribution: boolean;
      trackRebalanceEvents: boolean;
    }
  ): Promise<any> {
    const metrics: any = {
      loadBalancingMetrics: {
        utilizationVariance: 0,
        rebalanceEvents: 0,
      },
      performanceMetrics: {},
    };

    let status = OrchestrationStatus.RUNNING;
    const utilizationHistory: number[][] = [];

    while (status === OrchestrationStatus.RUNNING) {
      try {
        const [statusResponse, agentResponse] = await Promise.all([
          request(app.getHttpServer())
            .get(`/browser-orchestration/orchestrations/${orchestrationId}/status`)
            .set('Authorization', `Bearer ${authToken}`),
          request(app.getHttpServer())
            .get('/browser-orchestration/agents/status')
            .set('Authorization', `Bearer ${authToken}`)
        ]);

        status = statusResponse.body.status;

        if (options.trackAgentUtilization && agentResponse.body.agentDetails) {
          const utilizations = agentResponse.body.agentDetails.map((agent: any) =>
            (agent.currentTasks / agent.maxTasks) * 100
          );
          utilizationHistory.push(utilizations);
        }

        if (status !== OrchestrationStatus.RUNNING) break;
        await new Promise(resolve => setTimeout(resolve, options.monitoringInterval));
      } catch (error) {
        break;
      }
    }

    // Calculate utilization variance
    if (utilizationHistory.length > 0) {
      const allUtilizations = utilizationHistory.flat();
      const mean = allUtilizations.reduce((a, b) => a + b, 0) / allUtilizations.length;
      const variance = allUtilizations.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / allUtilizations.length;
      metrics.loadBalancingMetrics.utilizationVariance = Math.sqrt(variance) / 100;
    }

    metrics.finalStatus = status;
    return metrics;
  }

  async function monitorFailureResilience(
    orchestrationId: string,
    options: {
      trackAgentHealth: boolean;
      trackTaskRedistribution: boolean;
      trackRecoveryEvents: boolean;
    }
  ): Promise<any> {
    const metrics: any = {
      resilienceMetrics: {
        failureDetectionTime: 0,
        taskRedistributionSuccess: false,
        systemRecoveryTime: 0,
      },
    };

    let status = OrchestrationStatus.RUNNING;
    let failureDetected = false;
    let failureTime = 0;

    while (status === OrchestrationStatus.RUNNING) {
      try {
        const statusResponse = await request(app.getHttpServer())
          .get(`/browser-orchestration/orchestrations/${orchestrationId}/status`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(HttpStatus.OK);

        status = statusResponse.body.status;

        // Detect failures
        if (!failureDetected && statusResponse.body.progress?.failedTasks > 0) {
          failureDetected = true;
          failureTime = Date.now();
        }

        // Detect recovery
        if (failureDetected && statusResponse.body.agents?.active > 0) {
          metrics.resilienceMetrics.systemRecoveryTime = (Date.now() - failureTime) / 1000;
          metrics.resilienceMetrics.taskRedistributionSuccess = true;
        }

        if (status !== OrchestrationStatus.RUNNING) break;
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        break;
      }
    }

    metrics.finalStatus = status;
    return metrics;
  }

  async function monitorSessionOptimization(
    orchestrationId: string,
    options: {
      trackSessionReuse: boolean;
      trackResourceUtilization: boolean;
      trackAuthenticationState: boolean;
    }
  ): Promise<any> {
    const metrics: any = {
      sessionMetrics: {
        reuseRate: 0,
        resourceEfficiency: 0,
        authenticationConsistency: 0,
      },
    };

    let status = OrchestrationStatus.RUNNING;

    while (status === OrchestrationStatus.RUNNING) {
      try {
        const statusResponse = await request(app.getHttpServer())
          .get(`/browser-orchestration/orchestrations/${orchestrationId}/status`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(HttpStatus.OK);

        status = statusResponse.body.status;

        // Track session metrics
        if (statusResponse.body.sessions) {
          const total = statusResponse.body.sessions.total || 1;
          const reused = statusResponse.body.sessions.reused || 0;
          metrics.sessionMetrics.reuseRate = (reused / total) * 100;
        }

        if (statusResponse.body.resourceOptimization) {
          metrics.sessionMetrics.resourceEfficiency =
            statusResponse.body.resourceOptimization.efficiency || 0;
        }

        if (status !== OrchestrationStatus.RUNNING) break;
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        break;
      }
    }

    metrics.finalStatus = status;
    return metrics;
  }

  async function cleanupTestData(): Promise<void> {
    try {
      await prismaService.browserTask.deleteMany({
        where: { name: { contains: 'Test' } },
      });
      await prismaService.browserSession.deleteMany({
        where: { name: { contains: 'Test' } },
      });
      await prismaService.browserOrchestration.deleteMany({
        where: { name: { contains: 'Test' } },
      });
    } catch (error) {
      console.warn('Error cleaning test data:', error);
    }
  }

  async function getTestAuthToken(app: INestApplication): Promise<string> {
    try {
      const authResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: process.env.TEST_USERNAME || 'test-user',
          password: process.env.TEST_PASSWORD || 'test-password',
        });

      if (authResponse.body?.accessToken) {
        return authResponse.body.accessToken;
      }
    } catch (error) {
      // Use mock token for testing
    }

    return 'mock-test-token-for-multi-agent-coordination';
  }
});

// Custom Jest matcher
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeOneOf(values: any[]): R;
    }
  }
}

expect.extend({
  toBeOneOf(received, argument) {
    const pass = argument.includes(received);
    return {
      message: () => pass
        ? `expected ${received} not to be one of ${argument}`
        : `expected ${received} to be one of ${argument}`,
      pass,
    };
  },
});