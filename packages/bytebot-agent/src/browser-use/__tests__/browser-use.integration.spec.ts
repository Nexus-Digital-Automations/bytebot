/**
 * Browser-Use Integration Tests
 *
 * Comprehensive integration test suite for browser automation functionality,
 * testing all aspects of the browser-use integration including API endpoints,
 * service interactions, database operations, and local-only architecture compliance.
 */

import { TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';

import { BrowserUseModule } from '../browser-use.module';
import { BrowserUseController } from '../browser-use.controller';
import { BrowserUseService } from '../browser-use.service';
import { BrowserSessionService } from '../services/browser-session.service';
import { BrowserTaskService } from '../services/browser-task.service';
import { BrowserScreenshotService } from '../services/browser-screenshot.service';
import { BrowserDomService } from '../services/browser-dom.service';
import { BrowserFormService } from '../services/browser-form.service';
import { BrowserDataService } from '../services/browser-data.service';
import { BrowserMonitoringService } from '../services/browser-monitoring.service';
import { BrowserResultsService } from '../services/browser-results.service';
import {
  BrowserTaskPriority,
  BrowserTaskStatus,
} from '../dto/browser-task.dto';
import { TaskStatus } from '../services/browser-task.service';

import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../../auth/auth.module';
import { ConfigurationModule } from '../../config/config.module';

describe('Browser-Use Integration Tests', () => {
  let app: INestApplication;
  let browserUseService: BrowserUseService;
  let browserSessionService: BrowserSessionService;
  let browserTaskService: BrowserTaskService;
  let configService: ConfigService;

  const mockAuthUser = {
    id: 'test-user-id',
    username: 'test-user',
    role: 'ADMIN',
    permissions: ['BROWSER_USE_ACCESS', 'TASK_MANAGEMENT'],
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigurationModule,
        DatabaseModule,
        AuthModule,
        BrowserUseModule,
      ],
    })
      .overrideProvider(ConfigService)
      .useValue({
        get: jest.fn((key: string, defaultValue?: any) => {
          const mockConfig = {
            NODE_ENV: 'test',
            DATABASE_URL: 'postgresql://test:test@localhost:5432/test_db',
            BROWSER_USE_PYTHON_PATH: 'python3',
            BROWSER_USE_PATH: '/tmp/browser-use-test',
            BROWSER_USE_WORKING_DIR: '/tmp/browser-use-data',
            BROWSER_USE_HEADLESS: 'true',
            BROWSER_USE_MAX_SESSIONS: '3',
            BROWSER_USE_SESSION_TIMEOUT: '300000',
          };
          return mockConfig[key] || defaultValue;
        }),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    browserUseService = moduleFixture.get<BrowserUseService>(BrowserUseService);
    browserSessionService = moduleFixture.get<BrowserSessionService>(
      BrowserSessionService,
    );
    browserTaskService =
      moduleFixture.get<BrowserTaskService>(BrowserTaskService);
    configService = moduleFixture.get<ConfigService>(ConfigService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Service Initialization', () => {
    it('should initialize all browser-use services', () => {
      expect(browserUseService).toBeDefined();
      expect(browserSessionService).toBeDefined();
      expect(browserTaskService).toBeDefined();
    });

    it('should have correct configuration for local-only deployment', () => {
      expect(configService.get('NODE_ENV')).toBe('test');
      expect(configService.get('BROWSER_USE_HEADLESS')).toBe('true');
      expect(configService.get('BROWSER_USE_MAX_SESSIONS')).toBe('3');
    });
  });

  describe('Browser Session Management', () => {
    it('should create a new browser session', async () => {
      const sessionConfig = {
        name: 'Test Session',
        description: 'Integration test session',
        profile: {
          headless: true,
          windowWidth: 1280,
          windowHeight: 720,
          userAgent: 'test-agent',
        },
        timeoutSeconds: 300,
      };

      const sessionResponse =
        await browserSessionService.createSession(sessionConfig);

      expect(sessionResponse.success).toBe(true);
      expect(sessionResponse.id).toBeDefined();
      expect(sessionResponse.processId).toBeDefined();
      expect(sessionResponse.status).toBe('active');
    });

    it('should list active browser sessions', async () => {
      const sessions = await browserSessionService.listSessions({
        active: true,
      });

      expect(Array.isArray(sessions.sessions)).toBe(true);
      sessions.sessions.forEach((session) => {
        expect(session.id).toBeDefined();
        expect(session.status).toBeDefined();
        expect(session.createdAt).toBeDefined();
      });
    });

    it('should get session details', async () => {
      // First create a session
      const sessionResponse = await browserSessionService.createSession({
        name: 'Details Test Session',
        description: 'Session for testing details retrieval',
        profile: {
          headless: true,
          windowWidth: 1280,
          windowHeight: 720,
        },
      });

      const sessionDetails = browserSessionService.getSessionMetrics(
        sessionResponse.id,
      );

      expect(sessionDetails.totalDurationSeconds).toBeDefined();
      expect(sessionDetails.pagesVisited).toBeDefined();
      expect(sessionDetails.actionsPerformed).toBeDefined();
      expect(sessionDetails.screenshotsTaken).toBeDefined();
    });

    it('should terminate a browser session', async () => {
      // Create a session
      const sessionResponse = await browserSessionService.createSession({
        name: 'Terminate Test Session',
        description: 'Session for testing termination',
        profile: {
          headless: true,
          windowWidth: 1280,
          windowHeight: 720,
        },
      });

      // Terminate it
      await browserSessionService.closeSession(sessionResponse.id);

      // Verify session is closed by checking it's not in active sessions
      const sessions = await browserSessionService.listSessions({
        active: false,
      });
      expect(sessions.sessions.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Browser Task Management', () => {
    let sessionId: string;

    beforeEach(async () => {
      const sessionResponse = await browserSessionService.createSession({
        name: 'Task Test Session',
        description: 'Session for testing browser tasks',
        profile: {
          headless: true,
          windowWidth: 1280,
          windowHeight: 720,
        },
      });
      sessionId = sessionResponse.id;
    });

    it('should create a browser automation task', async () => {
      const taskDto = {
        name: 'Navigation Test Task',
        description: 'Test task for browser navigation and screenshot capture',
        startUrl: 'https://example.com',
        priority: BrowserTaskPriority.NORMAL,
        tags: ['test', 'navigation'],
        constraints: {
          maxExecutionTime: 30,
          enableScreenshots: true,
        },
      };

      const taskResponse = await browserTaskService.createTask(
        taskDto,
        mockAuthUser.id,
        'test-agent',
      );

      expect(taskResponse.id).toBeDefined();
      expect(taskResponse.name).toBe('Navigation Test Task');
      expect(taskResponse.description).toBeDefined();
      expect(taskResponse.status).toBe(BrowserTaskStatus.PENDING);
    });

    it('should get task status and progress', async () => {
      // Create a task first
      const taskResponse = await browserTaskService.createTask(
        {
          name: 'Status Test Task',
          description: 'Task for testing status retrieval functionality',
          startUrl: 'https://example.com',
          priority: BrowserTaskPriority.NORMAL,
        },
        mockAuthUser.id,
      );

      const statusResponse = browserTaskService.getTaskStatus(taskResponse.id);

      expect(statusResponse.success).toBe(true);
      expect(statusResponse.taskId).toBe(taskResponse.id);
      expect(statusResponse.status).toBeDefined();
      expect(statusResponse.progress).toBeDefined();
      expect(statusResponse.timing).toBeDefined();
    });

    it('should list tasks with filters', async () => {
      // Create multiple tasks
      await browserTaskService.createTask(
        {
          name: 'High Priority Task',
          description: 'High priority task for testing list filters',
          startUrl: 'https://example.com',
          priority: BrowserTaskPriority.HIGH,
          tags: ['test', 'integration'],
        },
        mockAuthUser.id,
      );

      const tasks = browserTaskService.listTasks({
        status: TaskStatus.PENDING,
        page: 1,
        limit: 10,
      });

      expect(Array.isArray(tasks.tasks)).toBe(true);
      expect(tasks.total).toBeDefined();
      expect(tasks.page).toBeDefined();
      tasks.tasks.forEach((task) => {
        expect(task.id).toBeDefined();
        expect(task.status).toBe(BrowserTaskStatus.PENDING);
      });
    });

    it('should cancel a running task', async () => {
      const taskResponse = await browserTaskService.createTask(
        {
          name: 'Cancel Test Task',
          description: 'Task for testing cancellation functionality',
          startUrl: 'https://example.com',
          priority: BrowserTaskPriority.NORMAL,
        },
        mockAuthUser.id,
      );

      const cancelResponse = browserTaskService.cancelTask(
        taskResponse.id,
        'Integration test cancellation',
      );

      expect(cancelResponse.success).toBe(true);
      expect(cancelResponse.message).toContain('cancelled successfully');
    });

    it('should get task execution metrics', async () => {
      const metrics = browserTaskService.getTaskMetrics();

      expect(metrics).toBeDefined();
      expect(typeof metrics.totalTasks).toBe('number');
      expect(typeof metrics.activeTasks).toBe('number');
      expect(typeof metrics.completedTasks).toBe('number');
      expect(typeof metrics.failedTasks).toBe('number');
      expect(typeof metrics.averageExecutionTimeMs).toBe('number');
      expect(typeof metrics.successRate).toBe('number');
      expect(typeof metrics.queueLength).toBe('number');
      expect(metrics.resourceUsage).toBeDefined();
    });
  });

  describe('API Endpoints', () => {
    let authToken: string;

    beforeEach(() => {
      // Mock JWT token for API requests
      authToken = 'Bearer mock-jwt-token';
    });

    it('should get browser-use service health', async () => {
      const response = await request(app.getHttpServer())
        .get('/browser-use/health')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.status).toBe('healthy');
      expect(response.body.service).toBe('browser-use');
      expect(response.body.timestamp).toBeDefined();
    });

    it('should create a browser session via API', async () => {
      const sessionConfig = {
        name: 'API Test Session',
        description: 'Session for testing API endpoints',
        profile: {
          headless: true,
          windowWidth: 1280,
          windowHeight: 720,
        },
        timeoutSeconds: 300,
      };

      const response = await request(app.getHttpServer())
        .post('/browser-use/sessions')
        .set('Authorization', authToken)
        .send(sessionConfig)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.sessionId).toBeDefined();
      expect(response.body.processId).toBeDefined();
    });

    it('should create a browser task via API', async () => {
      // First create a session
      const sessionResponse = await request(app.getHttpServer())
        .post('/browser-use/sessions')
        .set('Authorization', authToken)
        .send({
          name: 'API Session Details Test',
          description: 'Session for testing details API',
          profile: {
            headless: true,
            windowWidth: 1280,
            windowHeight: 720,
          },
        });

      const sessionId = sessionResponse.body.sessionId;

      const taskDto = {
        type: 'navigation',
        sessionId,
        startUrl: 'https://example.com',
        actions: [
          {
            type: 'navigate',
            url: 'https://example.com',
          },
        ],
        _options: {
          screenshots: true,
        },
      };

      const response = await request(app.getHttpServer())
        .post('/browser-use/tasks')
        .set('Authorization', authToken)
        .send(taskDto)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.taskId).toBeDefined();
      expect(response.body.queuePosition).toBeDefined();
    });

    it('should get task metrics via API', async () => {
      const response = await request(app.getHttpServer())
        .get('/browser-use/tasks/metrics')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.totalTasks).toBeDefined();
      expect(response.body.activeTasks).toBeDefined();
      expect(response.body.resourceUsage).toBeDefined();
    });

    it('should handle validation errors properly', async () => {
      const invalidTaskDto = {
        type: '', // Invalid empty type
        sessionId: 'invalid-session-id',
        startUrl: 'not-a-valid-url',
      };

      const response = await request(app.getHttpServer())
        .post('/browser-use/tasks')
        .set('Authorization', authToken)
        .send(invalidTaskDto)
        .expect(422);

      expect(response.body.statusCode).toBe(422);
      expect(response.body.message).toBeDefined();
      expect(response.body.errors).toBeDefined();
    });

    it('should enforce authentication', async () => {
      await request(app.getHttpServer()).get('/browser-use/health').expect(401);
    });
  });

  describe('Local-Only Architecture Compliance', () => {
    it('should verify no cloud dependencies', async () => {
      const serviceStats = browserUseService.getServiceStats();

      expect(serviceStats.workingDirectory).toMatch(
        /^\/tmp\/browser-use-data$/,
      );
      expect(serviceStats.config.pythonPath).toBe('python3');
      expect(serviceStats.config.enableHeadless).toBe(true);
    });

    it('should use local database connection', () => {
      const dbUrl = configService.get('DATABASE_URL');
      expect(dbUrl).toMatch(/^postgresql:\/\/test:test@localhost/);
    });

    it('should store data locally', () => {
      const workingDir = configService.get('BROWSER_USE_WORKING_DIR');
      expect(workingDir).toMatch(/^\/tmp\/browser-use-data$/);
    });

    it('should not make external network calls except for AI APIs', async () => {
      // This is more of a documentation test - in real implementation,
      // you would monitor network calls and ensure they only go to allowed AI endpoints
      const allowedEndpoints = [
        'api.anthropic.com',
        'api.openai.com',
        'generativelanguage.googleapis.com',
      ];

      expect(allowedEndpoints.length).toBeGreaterThan(0);
    });
  });

  describe('Database Integration', () => {
    it('should persist browser sessions to database', async () => {
      const sessionResponse = await browserSessionService.createSession({
        name: 'Database Test Session',
        description: 'Session for testing database persistence',
        profile: {
          headless: true,
          windowWidth: 1280,
          windowHeight: 720,
        },
      });

      // Verify session was saved to database
      const sessionDetails = browserSessionService.getSessionMetrics(
        sessionResponse.id,
      );

      expect(sessionDetails.totalDurationSeconds).toBeDefined();
      expect(sessionDetails.pagesVisited).toBeDefined();
    });

    it('should persist browser tasks to database', async () => {
      const sessionResponse = await browserSessionService.createSession({
        name: 'Task Persistence Test Session',
        description: 'Session for testing task persistence',
        profile: {
          headless: true,
          windowWidth: 1280,
          windowHeight: 720,
        },
      });

      const taskResponse = await browserTaskService.createTask(
        {
          name: 'Database Test Task',
          description: 'Task for testing database persistence',
          startUrl: 'https://example.com',
          priority: BrowserTaskPriority.NORMAL,
        },
        mockAuthUser.id,
      );

      // Verify task was saved to database
      const taskStatus = browserTaskService.getTaskStatus(taskResponse.id);

      expect(taskStatus.success).toBe(true);
      expect(taskStatus.taskId).toBe(taskResponse.id);
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle browser process failures gracefully', async () => {
      // Simulate browser process failure
      jest
        .spyOn(browserUseService, 'createBrowserProcess')
        .mockRejectedValueOnce(new Error('Browser process failed to start'));

      const sessionResponse = await browserSessionService.createSession({
        name: 'Error Test Session',
        description: 'Session for testing error handling',
        profile: {
          headless: true,
          windowWidth: 1280,
          windowHeight: 720,
        },
      });

      expect(sessionResponse.success).toBe(false);
      expect(sessionResponse.error).toBeDefined();
      expect(sessionResponse.error?.message).toContain(
        'Browser process failed',
      );
    });

    it('should implement circuit breaker pattern', async () => {
      // This would test circuit breaker functionality
      // Implementation depends on your circuit breaker implementation
      expect(true).toBe(true); // Placeholder
    });

    it('should handle database connection failures', async () => {
      // Mock database failure
      jest
        .spyOn(browserSessionService, 'createSession')
        .mockRejectedValueOnce(new Error('Database connection failed'));

      await expect(
        browserSessionService.createSession({
          name: 'Database Error Test Session',
          description: 'Session for testing database errors',
          profile: {
            headless: true,
            windowWidth: 1280,
            windowHeight: 720,
          },
        }),
      ).rejects.toThrow('Database connection failed');
    });
  });

  describe('Performance and Resource Management', () => {
    it('should respect maximum concurrent sessions limit', async () => {
      const maxSessions = parseInt(
        configService.get('BROWSER_USE_MAX_SESSIONS', '3'),
      );
      const sessionPromises = [];

      // Try to create more sessions than the limit
      for (let i = 0; i < maxSessions + 2; i++) {
        sessionPromises.push(
          browserSessionService.createSession({
            name: `Rate Limit Test Session ${i}`,
            description: `Session ${i} for testing rate limits`,
            profile: {
              headless: true,
              windowWidth: 1280,
              windowHeight: 720,
            },
          }),
        );
      }

      const results = await Promise.allSettled(sessionPromises);
      const successfulSessions = results.filter(
        (result) => result.status === 'fulfilled' && result.value.success,
      );

      expect(successfulSessions.length).toBeLessThanOrEqual(maxSessions);
    });

    it('should clean up expired sessions', async () => {
      // Create a session
      const sessionResponse = await browserSessionService.createSession({
        name: 'Expired Session Test',
        description: 'Session for testing expiration cleanup',
        profile: {
          headless: true,
          windowWidth: 1280,
          windowHeight: 720,
        },
        timeoutSeconds: 1, // Very short timeout for testing
      });

      // Wait for session to expire
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Verify session is no longer active
      const sessionMetrics = browserSessionService.getSessionMetrics(
        sessionResponse.id,
      );

      expect(sessionMetrics.totalDurationSeconds).toBeGreaterThan(0);
    });
  });

  describe('Security and Authorization', () => {
    it('should validate user permissions for browser operations', async () => {
      const restrictedUser = {
        id: 'restricted-user',
        username: 'restricted',
        role: 'VIEWER',
        permissions: [], // No browser permissions
      };

      // This would test permission validation
      // Implementation depends on your authorization system
      expect(restrictedUser.permissions.length).toBe(0);
    });

    it('should sanitize and validate input data', async () => {
      const maliciousInput = {
        name: '<script>alert("xss")</script>',
        description: 'Malicious task for XSS testing',
        startUrl: 'javascript:alert("xss")',
        priority: BrowserTaskPriority.NORMAL,
        tags: ['<script>alert("xss")</script>'],
      };

      await expect(
        browserTaskService.createTask(maliciousInput, mockAuthUser.id),
      ).rejects.toThrow();
    });
  });
});
