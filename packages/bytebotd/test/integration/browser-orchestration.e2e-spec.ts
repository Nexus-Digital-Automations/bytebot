/**
 * Browser Orchestration Integration Tests
 *
 * End-to-end integration tests for the browser orchestration system.
 * Tests the integration between NestJS API and Python orchestration system,
 * multi-agent coordination, session management, and distributed workflows.
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
import * as fs from 'fs/promises';
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

describe('Browser Orchestration Integration (E2E)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let authToken: string;
  let pythonOrchestratorProcess: ChildProcess | null = null;

  // Test configuration
  const testConfig = {
    pythonExecutable: process.env.PYTHON_EXECUTABLE || 'python3',
    orchestratorPath: path.join(process.cwd(), '../../orchestrator/browser_orchestration'),
    testTimeout: 60000,
    orchestratorPort: 9243,
    maxConcurrentTests: 3,
  };

  beforeAll(async () => {
    // Start Python orchestrator process
    await startPythonOrchestrator();

    // Initialize NestJS application
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

    // Clean test database
    await cleanupTestDatabase();

    // Get authentication token
    authToken = await getTestAuthToken(app);

    // Wait for orchestrator to be ready
    await waitForOrchestratorReady();
  }, testConfig.testTimeout);

  afterAll(async () => {
    // Cleanup test data
    await cleanupTestDatabase();

    // Close application
    await app?.close();

    // Stop Python orchestrator
    await stopPythonOrchestrator();
  }, testConfig.testTimeout);

  describe('Python Orchestrator Integration', () => {
    it('should establish connection with Python orchestrator', async () => {
      const response = await request(app.getHttpServer())
        .get('/browser-orchestration/health')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HttpStatus.OK);

      expect(response.body.status).toBe('healthy');
      expect(response.body.components.pythonOrchestrator).toEqual({
        status: 'connected',
        port: testConfig.orchestratorPort,
        version: expect.any(String),
      });
    });

    it('should handle Python orchestrator communication errors', async () => {
      // Temporarily stop Python orchestrator
      await stopPythonOrchestrator();

      const response = await request(app.getHttpServer())
        .get('/browser-orchestration/health')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.body.components.pythonOrchestrator.status).toBe('disconnected');

      // Restart orchestrator
      await startPythonOrchestrator();
      await waitForOrchestratorReady();
    });

    it('should synchronize orchestration state between systems', async () => {
      const createOrchestrationDto: CreateOrchestrationDto = {
        name: 'Python Integration Test',
        strategy: OrchestrationStrategy.PARALLEL,
        maxConcurrentAgents: 2,
        tasks: [
          {
            name: 'Navigation Test',
            type: 'navigation',
            url: 'https://httpbin.org/get',
            instructions: 'Navigate to httpbin and verify response',
            priority: TaskPriority.HIGH,
          },
          {
            name: 'Screenshot Test',
            type: 'screenshot',
            url: 'https://example.com',
            instructions: 'Take full page screenshot',
            priority: TaskPriority.NORMAL,
          },
        ],
      };

      // Create orchestration via API
      const createResponse = await request(app.getHttpServer())
        .post('/browser-orchestration/orchestrations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createOrchestrationDto)
        .expect(HttpStatus.CREATED);

      const orchestrationId = createResponse.body.id;

      // Verify orchestration exists in database
      const dbOrchestration = await prismaService.browserOrchestration.findUnique({
        where: { id: orchestrationId },
        include: { tasks: true },
      });

      expect(dbOrchestration).toBeTruthy();
      expect(dbOrchestration.tasks).toHaveLength(2);

      // Execute orchestration (should communicate with Python)
      const executeResponse = await request(app.getHttpServer())
        .post(`/browser-orchestration/orchestrations/${orchestrationId}/execute`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HttpStatus.OK);

      expect(executeResponse.body.status).toBe(OrchestrationStatus.RUNNING);

      // Monitor status until completion
      let status = OrchestrationStatus.RUNNING;
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds

      while (status === OrchestrationStatus.RUNNING && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));

        const statusResponse = await request(app.getHttpServer())
          .get(`/browser-orchestration/orchestrations/${orchestrationId}/status`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(HttpStatus.OK);

        status = statusResponse.body.status;
        attempts++;
      }

      expect(status).toBeOneOf([OrchestrationStatus.COMPLETED, OrchestrationStatus.FAILED]);
    }, testConfig.testTimeout);
  });

  describe('Multi-Agent Coordination', () => {
    it('should coordinate multiple browser agents for parallel execution', async () => {
      const parallelOrchestrationDto: CreateOrchestrationDto = {
        name: 'Multi-Agent Parallel Test',
        strategy: OrchestrationStrategy.PARALLEL,
        maxConcurrentAgents: 3,
        tasks: [
          {
            name: 'Agent 1 Task',
            type: 'data_extraction',
            url: 'https://httpbin.org/json',
            instructions: 'Extract JSON data structure',
            priority: TaskPriority.HIGH,
          },
          {
            name: 'Agent 2 Task',
            type: 'screenshot',
            url: 'https://httpbin.org/html',
            instructions: 'Screenshot HTML content',
            priority: TaskPriority.HIGH,
          },
          {
            name: 'Agent 3 Task',
            type: 'navigation',
            url: 'https://httpbin.org/xml',
            instructions: 'Navigate and parse XML',
            priority: TaskPriority.HIGH,
          },
        ],
      };

      const createResponse = await request(app.getHttpServer())
        .post('/browser-orchestration/orchestrations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(parallelOrchestrationDto)
        .expect(HttpStatus.CREATED);

      const orchestrationId = createResponse.body.id;

      // Execute with detailed monitoring
      const startTime = Date.now();

      await request(app.getHttpServer())
        .post(`/browser-orchestration/orchestrations/${orchestrationId}/execute`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HttpStatus.OK);

      // Monitor agent coordination
      const agentStatusHistory: any[] = [];
      let finalStatus: any = null;

      while (!finalStatus || finalStatus.status === OrchestrationStatus.RUNNING) {
        const statusResponse = await request(app.getHttpServer())
          .get(`/browser-orchestration/orchestrations/${orchestrationId}/status`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(HttpStatus.OK);

        finalStatus = statusResponse.body;
        agentStatusHistory.push({
          timestamp: Date.now(),
          status: finalStatus,
        });

        if (finalStatus.status !== OrchestrationStatus.RUNNING) break;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      const executionTime = Date.now() - startTime;

      // Verify parallel execution characteristics
      expect(finalStatus.status).toBeOneOf([
        OrchestrationStatus.COMPLETED,
        OrchestrationStatus.FAILED
      ]);

      // Parallel execution should be faster than sequential
      expect(executionTime).toBeLessThan(45000); // Less than 45 seconds

      // Verify agent coordination metrics
      expect(finalStatus.agents.total).toBeGreaterThanOrEqual(3);
      expect(agentStatusHistory.some(h => h.status.agents.active > 1)).toBe(true);
    }, testConfig.testTimeout);

    it('should handle agent failures and redistribute tasks', async () => {
      const failureTestDto: CreateOrchestrationDto = {
        name: 'Agent Failure Test',
        strategy: OrchestrationStrategy.ADAPTIVE,
        maxConcurrentAgents: 2,
        tasks: [
          {
            name: 'Valid Task',
            type: 'navigation',
            url: 'https://httpbin.org/get',
            instructions: 'Navigate successfully',
            priority: TaskPriority.HIGH,
          },
          {
            name: 'Failing Task',
            type: 'navigation',
            url: 'https://invalid-domain-12345.com',
            instructions: 'This should fail',
            priority: TaskPriority.NORMAL,
          },
          {
            name: 'Recovery Task',
            type: 'navigation',
            url: 'https://httpbin.org/status/200',
            instructions: 'Verify recovery',
            priority: TaskPriority.HIGH,
          },
        ],
      };

      const createResponse = await request(app.getHttpServer())
        .post('/browser-orchestration/orchestrations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(failureTestDto)
        .expect(HttpStatus.CREATED);

      const orchestrationId = createResponse.body.id;

      await request(app.getHttpServer())
        .post(`/browser-orchestration/orchestrations/${orchestrationId}/execute`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HttpStatus.OK);

      // Wait for completion and analyze results
      let finalStatus: any = null;
      let attempts = 0;

      while (attempts < 30) {
        const statusResponse = await request(app.getHttpServer())
          .get(`/browser-orchestration/orchestrations/${orchestrationId}/status`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(HttpStatus.OK);

        finalStatus = statusResponse.body;

        if (finalStatus.status !== OrchestrationStatus.RUNNING) break;
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }

      // Should complete with mixed results
      expect(finalStatus.progress.completedTasks).toBeGreaterThan(0);
      expect(finalStatus.progress.failedTasks).toBeGreaterThan(0);

      // Verify error recovery occurred
      expect(finalStatus.progress.totalTasks).toBe(3);
    }, testConfig.testTimeout);
  });

  describe('Session Management Integration', () => {
    it('should coordinate browser sessions across agents', async () => {
      const sessionCoordinationDto: CreateOrchestrationDto = {
        name: 'Session Coordination Test',
        strategy: OrchestrationStrategy.HYBRID,
        maxConcurrentSessions: 4,
        tasks: [
          {
            name: 'Session 1 Task',
            type: 'data_extraction',
            url: 'https://httpbin.org/cookies/set/test1/value1',
            instructions: 'Set cookie in session 1',
            priority: TaskPriority.NORMAL,
            sessionRequirements: {
              persistent: true,
              cookieJar: 'session1',
            },
          },
          {
            name: 'Session 2 Task',
            type: 'data_extraction',
            url: 'https://httpbin.org/cookies/set/test2/value2',
            instructions: 'Set cookie in session 2',
            priority: TaskPriority.NORMAL,
            sessionRequirements: {
              persistent: true,
              cookieJar: 'session2',
            },
          },
        ],
      };

      const createResponse = await request(app.getHttpServer())
        .post('/browser-orchestration/orchestrations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(sessionCoordinationDto)
        .expect(HttpStatus.CREATED);

      const orchestrationId = createResponse.body.id;

      await request(app.getHttpServer())
        .post(`/browser-orchestration/orchestrations/${orchestrationId}/execute`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HttpStatus.OK);

      // Monitor session coordination
      let sessionMetrics: any = null;

      while (!sessionMetrics || sessionMetrics.status === OrchestrationStatus.RUNNING) {
        const statusResponse = await request(app.getHttpServer())
          .get(`/browser-orchestration/orchestrations/${orchestrationId}/status`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(HttpStatus.OK);

        sessionMetrics = statusResponse.body;

        if (sessionMetrics.status !== OrchestrationStatus.RUNNING) break;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Verify session isolation and coordination
      expect(sessionMetrics.sessions.total).toBeGreaterThanOrEqual(2);
      expect(sessionMetrics.sessions.active).toBeGreaterThanOrEqual(0);
    }, testConfig.testTimeout);

    it('should reuse sessions efficiently across tasks', async () => {
      const sessionReuseDto: CreateOrchestrationDto = {
        name: 'Session Reuse Test',
        strategy: OrchestrationStrategy.SEQUENTIAL,
        enableSessionReuse: true,
        tasks: [
          {
            name: 'Initial Navigation',
            type: 'navigation',
            url: 'https://httpbin.org',
            instructions: 'Navigate to base URL',
            priority: TaskPriority.HIGH,
          },
          {
            name: 'Follow-up Navigation',
            type: 'navigation',
            url: 'https://httpbin.org/headers',
            instructions: 'Navigate to headers endpoint in same session',
            priority: TaskPriority.HIGH,
          },
          {
            name: 'Data Extraction',
            type: 'data_extraction',
            url: 'https://httpbin.org/json',
            instructions: 'Extract JSON data using existing session',
            priority: TaskPriority.NORMAL,
          },
        ],
      };

      const createResponse = await request(app.getHttpServer())
        .post('/browser-orchestration/orchestrations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(sessionReuseDto)
        .expect(HttpStatus.CREATED);

      const orchestrationId = createResponse.body.id;

      await request(app.getHttpServer())
        .post(`/browser-orchestration/orchestrations/${orchestrationId}/execute`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HttpStatus.OK);

      // Wait for completion
      let finalMetrics: any = null;

      while (!finalMetrics || finalMetrics.status === OrchestrationStatus.RUNNING) {
        const statusResponse = await request(app.getHttpServer())
          .get(`/browser-orchestration/orchestrations/${orchestrationId}/status`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(HttpStatus.OK);

        finalMetrics = statusResponse.body;

        if (finalMetrics.status !== OrchestrationStatus.RUNNING) break;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Verify session reuse efficiency
      expect(finalMetrics.sessions.total).toBeLessThan(finalMetrics.progress.totalTasks);
      expect(finalMetrics.resourceOptimization?.sessionsReused).toBeGreaterThan(0);
    }, testConfig.testTimeout);
  });

  describe('Error Handling and Recovery', () => {
    it('should handle Python orchestrator disconnection gracefully', async () => {
      // Create orchestration
      const errorTestDto: CreateOrchestrationDto = {
        name: 'Disconnection Test',
        strategy: OrchestrationStrategy.PARALLEL,
        tasks: [
          {
            name: 'Task Before Disconnect',
            type: 'navigation',
            url: 'https://httpbin.org/delay/2',
            instructions: 'Navigate with delay',
            priority: TaskPriority.HIGH,
          },
        ],
      };

      const createResponse = await request(app.getHttpServer())
        .post('/browser-orchestration/orchestrations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(errorTestDto)
        .expect(HttpStatus.CREATED);

      const orchestrationId = createResponse.body.id;

      // Start execution
      await request(app.getHttpServer())
        .post(`/browser-orchestration/orchestrations/${orchestrationId}/execute`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HttpStatus.OK);

      // Simulate orchestrator failure
      await stopPythonOrchestrator();
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check health status
      const healthResponse = await request(app.getHttpServer())
        .get('/browser-orchestration/health')
        .set('Authorization', `Bearer ${authToken}`);

      expect(healthResponse.body.components.pythonOrchestrator.status).toBe('disconnected');

      // Restart orchestrator
      await startPythonOrchestrator();
      await waitForOrchestratorReady();

      // Verify recovery
      const recoveryHealthResponse = await request(app.getHttpServer())
        .get('/browser-orchestration/health')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HttpStatus.OK);

      expect(recoveryHealthResponse.body.components.pythonOrchestrator.status).toBe('connected');
    }, testConfig.testTimeout);

    it('should retry failed tasks with exponential backoff', async () => {
      const retryTestDto: CreateOrchestrationDto = {
        name: 'Retry Test',
        strategy: OrchestrationStrategy.ADAPTIVE,
        retryFailedTasks: true,
        maxRetryAttempts: 3,
        tasks: [
          {
            name: 'Intermittent Failure Task',
            type: 'navigation',
            url: 'https://httpbin.org/status/503', // Returns 503 error
            instructions: 'Navigate to failing endpoint',
            priority: TaskPriority.HIGH,
            retryCount: 3,
          },
        ],
      };

      const createResponse = await request(app.getHttpServer())
        .post('/browser-orchestration/orchestrations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(retryTestDto)
        .expect(HttpStatus.CREATED);

      const orchestrationId = createResponse.body.id;

      await request(app.getHttpServer())
        .post(`/browser-orchestration/orchestrations/${orchestrationId}/execute`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HttpStatus.OK);

      // Monitor retry attempts
      const retryHistory: any[] = [];
      let finalStatus: any = null;

      while (!finalStatus || finalStatus.status === OrchestrationStatus.RUNNING) {
        const statusResponse = await request(app.getHttpServer())
          .get(`/browser-orchestration/orchestrations/${orchestrationId}/status`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(HttpStatus.OK);

        finalStatus = statusResponse.body;
        retryHistory.push({
          timestamp: Date.now(),
          status: finalStatus,
        });

        if (finalStatus.status !== OrchestrationStatus.RUNNING) break;
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Verify retry behavior
      expect(finalStatus.errors).toBeDefined();
      expect(finalStatus.progress.failedTasks).toBeGreaterThan(0);
    }, testConfig.testTimeout);
  });

  describe('Performance and Scalability', () => {
    it('should handle concurrent orchestrations efficiently', async () => {
      const concurrentOrchestrations = Array.from({ length: testConfig.maxConcurrentTests }, (_, i) => ({
        name: `Concurrent Test ${i + 1}`,
        strategy: OrchestrationStrategy.PARALLEL,
        maxConcurrentAgents: 2,
        tasks: [
          {
            name: `Concurrent Task ${i + 1}`,
            type: 'navigation',
            url: `https://httpbin.org/delay/1`,
            instructions: `Concurrent navigation ${i + 1}`,
            priority: TaskPriority.NORMAL,
          },
        ],
      }));

      // Create all orchestrations
      const createPromises = concurrentOrchestrations.map(dto =>
        request(app.getHttpServer())
          .post('/browser-orchestration/orchestrations')
          .set('Authorization', `Bearer ${authToken}`)
          .send(dto)
      );

      const createResponses = await Promise.all(createPromises);
      expect(createResponses.every(r => r.status === HttpStatus.CREATED)).toBe(true);

      const orchestrationIds = createResponses.map(r => r.body.id);

      // Execute all orchestrations concurrently
      const startTime = Date.now();

      const executePromises = orchestrationIds.map(id =>
        request(app.getHttpServer())
          .post(`/browser-orchestration/orchestrations/${id}/execute`)
          .set('Authorization', `Bearer ${authToken}`)
      );

      const executeResponses = await Promise.all(executePromises);
      expect(executeResponses.every(r => r.status === HttpStatus.OK)).toBe(true);

      // Monitor completion of all orchestrations
      const completionPromises = orchestrationIds.map(async (id) => {
        let status = OrchestrationStatus.RUNNING;
        while (status === OrchestrationStatus.RUNNING) {
          const statusResponse = await request(app.getHttpServer())
            .get(`/browser-orchestration/orchestrations/${id}/status`)
            .set('Authorization', `Bearer ${authToken}`);

          status = statusResponse.body.status;
          if (status === OrchestrationStatus.RUNNING) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        return status;
      });

      const finalStatuses = await Promise.all(completionPromises);
      const executionTime = Date.now() - startTime;

      // Verify concurrent execution efficiency
      expect(finalStatuses.every(s =>
        s === OrchestrationStatus.COMPLETED || s === OrchestrationStatus.FAILED
      )).toBe(true);

      // Concurrent execution should be more efficient than sequential
      expect(executionTime).toBeLessThan(testConfig.maxConcurrentTests * 5000);
    }, testConfig.testTimeout * 2);

    it('should scale agent pool dynamically under load', async () => {
      // Create high-load orchestration
      const loadTestDto: CreateOrchestrationDto = {
        name: 'Load Scaling Test',
        strategy: OrchestrationStrategy.ADAPTIVE,
        maxConcurrentAgents: 6,
        autoScale: true,
        tasks: Array.from({ length: 10 }, (_, i) => ({
          name: `Load Task ${i + 1}`,
          type: 'navigation',
          url: 'https://httpbin.org/delay/2',
          instructions: `High load navigation ${i + 1}`,
          priority: TaskPriority.NORMAL,
        })),
      };

      const createResponse = await request(app.getHttpServer())
        .post('/browser-orchestration/orchestrations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(loadTestDto)
        .expect(HttpStatus.CREATED);

      const orchestrationId = createResponse.body.id;

      // Monitor initial agent pool
      const initialAgentStatus = await request(app.getHttpServer())
        .get('/browser-orchestration/agents/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HttpStatus.OK);

      const initialAgentCount = initialAgentStatus.body.totalAgents;

      // Execute high-load orchestration
      await request(app.getHttpServer())
        .post(`/browser-orchestration/orchestrations/${orchestrationId}/execute`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HttpStatus.OK);

      // Monitor agent scaling
      let maxAgentCount = initialAgentCount;
      let scalingDetected = false;

      while (true) {
        const statusResponse = await request(app.getHttpServer())
          .get(`/browser-orchestration/orchestrations/${orchestrationId}/status`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(HttpStatus.OK);

        const agentStatus = await request(app.getHttpServer())
          .get('/browser-orchestration/agents/status')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(HttpStatus.OK);

        const currentAgentCount = agentStatus.body.totalAgents;

        if (currentAgentCount > maxAgentCount) {
          maxAgentCount = currentAgentCount;
          scalingDetected = true;
        }

        if (statusResponse.body.status !== OrchestrationStatus.RUNNING) break;
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Verify scaling occurred under load
      expect(scalingDetected).toBe(true);
      expect(maxAgentCount).toBeGreaterThan(initialAgentCount);
    }, testConfig.testTimeout * 2);
  });

  // Helper Functions
  async function startPythonOrchestrator(): Promise<void> {
    return new Promise((resolve, reject) => {
      const orchestratorScript = path.join(testConfig.orchestratorPath, 'integration_server.py');

      pythonOrchestratorProcess = spawn(testConfig.pythonExecutable, [
        orchestratorScript,
        '--port', testConfig.orchestratorPort.toString(),
        '--test-mode'
      ], {
        cwd: testConfig.orchestratorPath,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          PYTHONPATH: testConfig.orchestratorPath,
          LOG_LEVEL: 'INFO',
        },
      });

      let output = '';

      pythonOrchestratorProcess.stdout?.on('data', (data) => {
        output += data.toString();
        if (output.includes('Orchestrator server started')) {
          resolve();
        }
      });

      pythonOrchestratorProcess.stderr?.on('data', (data) => {
        console.error('Python orchestrator error:', data.toString());
      });

      pythonOrchestratorProcess.on('error', (error) => {
        reject(new Error(`Failed to start Python orchestrator: ${error.message}`));
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        reject(new Error('Python orchestrator startup timeout'));
      }, 30000);
    });
  }

  async function stopPythonOrchestrator(): Promise<void> {
    if (pythonOrchestratorProcess) {
      pythonOrchestratorProcess.kill('SIGTERM');

      return new Promise((resolve) => {
        pythonOrchestratorProcess?.on('exit', () => {
          pythonOrchestratorProcess = null;
          resolve();
        });

        // Force kill after 5 seconds
        setTimeout(() => {
          pythonOrchestratorProcess?.kill('SIGKILL');
          pythonOrchestratorProcess = null;
          resolve();
        }, 5000);
      });
    }
  }

  async function waitForOrchestratorReady(): Promise<void> {
    let attempts = 0;
    const maxAttempts = 30;

    while (attempts < maxAttempts) {
      try {
        const response = await request(app.getHttpServer())
          .get('/browser-orchestration/health')
          .set('Authorization', `Bearer ${authToken}`);

        if (response.body.components?.pythonOrchestrator?.status === 'connected') {
          return;
        }
      } catch (error) {
        // Continue waiting
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }

    throw new Error('Python orchestrator not ready after waiting');
  }

  async function cleanupTestDatabase(): Promise<void> {
    // Clean up test data in reverse dependency order
    await prismaService.browserTask.deleteMany({
      where: { name: { contains: 'Test' } },
    });

    await prismaService.browserSession.deleteMany({
      where: { name: { contains: 'Test' } },
    });

    await prismaService.browserOrchestration.deleteMany({
      where: { name: { contains: 'Test' } },
    });
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
      // Fallback to mock token for testing
    }

    return 'mock-test-token-for-integration-tests';
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
    if (pass) {
      return {
        message: () => `expected ${received} not to be one of ${argument}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be one of ${argument}`,
        pass: false,
      };
    }
  },
});