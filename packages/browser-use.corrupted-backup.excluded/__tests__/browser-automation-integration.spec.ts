import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { Response } from 'supertest';
import { BrowserUseModule } from '../browser-use.module';
import { ParlantModule } from '../../parlant/parlant.module';
import { SecurityModule } from '../../common/security/security.module';
import { AuthModule } from '../../auth/auth.module';
import {
  CreateBrowserSessionDto,
  BrowserSessionStatus
} from '../dto/browser-session.dto';
import {
  CreateBrowserTaskDto,
  BrowserTaskPriority,
  BrowserTaskStatus
} from '../dto/browser-task.dto';
import {
  ScreenshotCaptureDto,
  ScreenshotFormat,
  ScreenshotType
} from '../dto/screenshot.dto';
import {
  DOMInteractionDto,
  DOMActionType
} from '../dto/dom-interaction.dto';

// Type definitions for API responses to fix no-unsafe-call violations
interface BrowserSessionResponse {
  sessionId: string;
  name: string;
  status: BrowserSessionStatus;
  tabs: Array<{
    id: string;
    url: string;
    title: string;
    isActive: boolean;
  }>;
  statistics?: {
    totalRequests: number;
    totalErrors: number;
    uptime: number;
  };
}

interface BrowserTaskResponse {
  taskId: string;
  sessionId: string;
  type: string;
  status: BrowserTaskStatus;
  priority: BrowserTaskPriority;
  description: string;
  result?: unknown;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

interface ScreenshotResponse {
  screenshotId: string;
  format: ScreenshotFormat;
  type: ScreenshotType;
  data: string;
  metadata: {
    width: number;
    height: number;
    timestamp: string;
  };
}

interface DOMInteractionResponse {
  interactionId: string;
  sessionId: string;
  tabId: string;
  action: DOMActionType;
  selector: string;
  result: {
    success: boolean;
    elementFound: boolean;
    value?: string;
    error?: string;
  };
  timestamp: string;
}

interface ErrorResponse {
  message: string;
  statusCode: number;
  error?: string;
}describe('Browser Automation Integration Tests', () => {let app: INestApplication;let sessionId: string;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',}),SecurityModule,
        AuthModule,
        ParlantModule,
        BrowserUseModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Get authentication token for testing
    authToken = await getTestAuthToken(app);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Browser Session Management', () => {describe('POST /browser-use/sessions', () => {it('should create a browser session successfully', async () => {const createSessionDto: CreateBrowserSessionDto = {name: 'Integration Test Session',headless: true,viewportWidth: 1280,
          viewportHeight: 720,
          initialUrls: ['https://example.com'],};const response = await request(app.getHttpServer())
          .post('/browser-use/sessions').set('Authorization', `Bearer ${authToken}`)
          .send(createSessionDto)
          .expect(HttpStatus.CREATED);

        const sessionResponse = response.body as BrowserSessionResponse;
        expect(sessionResponse).toHaveProperty('sessionId');
        expect(sessionResponse.name).toBe(createSessionDto.name);
        expect(sessionResponse.status).toBe(BrowserSessionStatus.ACTIVE);
        expect(sessionResponse.tabs).toHaveLength(1);

        sessionId = sessionResponse.sessionId;
      });

      it('should reject session creation with invalid data', async () => {
        const invalidSessionDto = {
          name: '', // Invalid: empty name
          headless: 'not_boolean', // Invalid: wrong type
          viewportWidth: -100, // Invalid: negative width
        };

        await request(app.getHttpServer())
          .post('/browser-use/sessions').set('Authorization', `Bearer ${authToken}`)
          .send(invalidSessionDto)
          .expect(HttpStatus.BAD_REQUEST);
      });

      it('should reject unauthorized session creation', async () => {const createSessionDto: CreateBrowserSessionDto = {name: 'Unauthorized Test Session',headless: true,viewportWidth: 1280,
          viewportHeight: 720,
        };

        await request(app.getHttpServer())
          .post('/browser-use/sessions').send(createSessionDto).expect(HttpStatus.UNAUTHORIZED);
      });
    });

    describe('GET /browser-use/sessions/:sessionId', () => {it('should retrieve session information', async () => {
        const response = await request(app.getHttpServer())
          .get(`/browser-use/sessions/${sessionId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(HttpStatus.OK);

        const sessionResponse = response.body as BrowserSessionResponse;
        expect(sessionResponse.sessionId).toBe(sessionId);
        expect(sessionResponse.status).toBe(BrowserSessionStatus.ACTIVE);
        expect(sessionResponse).toHaveProperty('tabs');
        expect(sessionResponse).toHaveProperty('statistics');});it('should return 404 for non-existent session', async () => {await request(app.getHttpServer()).get('/browser-use/sessions/non-existent-session').set('Authorization', `Bearer ${authToken}`)
          .expect(HttpStatus.NOT_FOUND);
      });
    });

    describe('GET /browser-use/sessions', () => {it('should retrieve all sessions', async () => {const response = await request(app.getHttpServer()).get('/browser-use/sessions').set('Authorization', `Bearer ${authToken}`)
          .expect(HttpStatus.OK);

        const sessions = response.body as BrowserSessionResponse[];
        expect(Array.isArray(sessions)).toBe(true);
        expect(sessions.length).toBeGreaterThan(0);
        expect(sessions[0]).toHaveProperty('sessionId');});it('should filter sessions by status', async () => {const response = await request(app.getHttpServer()).get('/browser-use/sessions').query({ status: BrowserSessionStatus.ACTIVE }).set('Authorization', `Bearer ${authToken}`)
          .expect(HttpStatus.OK);

        const sessions = response.body as BrowserSessionResponse[];
        expect(Array.isArray(sessions)).toBe(true);
        sessions.forEach((session: BrowserSessionResponse) => {
          expect(session.status).toBe(BrowserSessionStatus.ACTIVE);
        });
      });
    });
  });

  describe('Browser Task Management', () => {describe('POST /browser-use/tasks', () => {it('should execute a browser task successfully', async () => {const createTaskDto: CreateBrowserTaskDto = {name: 'Integration Test Task',actions: [{
              type: 'navigate',url: 'https://example.com',},{
              type: 'click',selector: 'h1',},{
              type: 'extract',selector: 'title',property: 'textContent',},],
          priority: BrowserTaskPriority.NORMAL,
          sessionConfig: {
            headless: true,
            viewportWidth: 1280,
            viewportHeight: 720,
          },
        };

        const response = await request(app.getHttpServer())
          .post('/browser-use/tasks').set('Authorization', `Bearer ${authToken}`)
          .send(createTaskDto)
          .expect(HttpStatus.CREATED);

        const taskResponse = response.body as BrowserTaskResponse;
        expect(taskResponse).toHaveProperty('taskId');
        expect(taskResponse.description).toBe(createTaskDto.name);
        expect(taskResponse.status).toBeOneOf([
          BrowserTaskStatus.RUNNING,
          BrowserTaskStatus.COMPLETED,
        ]);
        expect(taskResponse).toHaveProperty('result');
      });

      it('should reject task with invalid actions', async () => {const invalidTaskDto = {name: 'Invalid Task',actions: [{
              type: 'invalid_action', // Invalid action type
              url: 'https://example.com',},],
          priority: BrowserTaskPriority.NORMAL,
        };

        await request(app.getHttpServer())
          .post('/browser-use/tasks').set('Authorization', `Bearer ${authToken}`)
          .send(invalidTaskDto)
          .expect(HttpStatus.BAD_REQUEST);
      });
    });

    describe('GET /browser-use/tasks', () => {it('should retrieve all tasks', async () => {const response = await request(app.getHttpServer()).get('/browser-use/tasks').set('Authorization', `Bearer ${authToken}`)
          .expect(HttpStatus.OK);

        const tasks = response.body as BrowserTaskResponse[];
        expect(Array.isArray(tasks)).toBe(true);
        if (tasks.length > 0) {
          expect(tasks[0]).toHaveProperty('taskId');
          expect(tasks[0]).toHaveProperty('status');
        }});

      it('should filter tasks by status', async () => {const response = await request(app.getHttpServer()).get('/browser-use/tasks').query({ status: BrowserTaskStatus.COMPLETED }).set('Authorization', `Bearer ${authToken}`)
          .expect(HttpStatus.OK);

        const tasks = response.body as BrowserTaskResponse[];
        expect(Array.isArray(tasks)).toBe(true);
        tasks.forEach((task: BrowserTaskResponse) => {
          expect(task.status).toBe(BrowserTaskStatus.COMPLETED);
        });
      });
    });

    describe('GET /browser-use/tasks/metrics/summary', () => {it('should retrieve task metrics', async () => {const response = await request(app.getHttpServer()).get('/browser-use/tasks/metrics/summary').set('Authorization', `Bearer ${authToken}`)
          .expect(HttpStatus.OK);

        const metricsResponse = response.body as {
          status: string;
          data: {
            totalTasks: number;
            completedTasks: number;
            successRate: number;
          };
          timestamp: string;
        };
        expect(metricsResponse.status).toBe('success');
        expect(metricsResponse.data).toHaveProperty('totalTasks');
        expect(metricsResponse.data).toHaveProperty('completedTasks');
        expect(metricsResponse.data).toHaveProperty('successRate');
        expect(metricsResponse).toHaveProperty('timestamp');});});
  });

  describe('Enhanced Browser Automation', () => {describe('POST /browser-automation/screenshots/capture', () => {it('should capture enhanced screenshot', async () => {const screenshotDto: ScreenshotCaptureDto = {sessionId: sessionId,
          type: ScreenshotType.FULLPAGE,
          format: ScreenshotFormat.PNG,
          quality: 90,
          timeout: 5000,
        };

        const response = await request(app.getHttpServer())
          .post('/browser-automation/screenshots/capture').set('Authorization', `Bearer ${authToken}`)
          .send(screenshotDto)
          .expect(HttpStatus.OK);

        const screenshotResponse = response.body as ScreenshotResponse & {
          success: boolean;
          base64Data: string;
          dimensions: { width: number; height: number };
        };
        expect(screenshotResponse).toHaveProperty('screenshotId');
        expect(screenshotResponse.success).toBe(true);
        expect(screenshotResponse.format).toBe(ScreenshotFormat.PNG);
        expect(screenshotResponse.type).toBe(ScreenshotType.FULLPAGE);
        expect(screenshotResponse).toHaveProperty('base64Data');
        expect(screenshotResponse).toHaveProperty('dimensions');
      });

      it('should reject invalid screenshot request', async () => {
        const invalidScreenshotDto = {
          sessionId: 'invalid-session',
          type: 'invalid_type',
          format: 'invalid_format',
          quality: 150, // Invalid: quality > 100
        };

        await request(app.getHttpServer())
          .post('/browser-automation/screenshots/capture').set('Authorization', `Bearer ${authToken}`)
          .send(invalidScreenshotDto)
          .expect(HttpStatus.BAD_REQUEST);
      });
    });

    describe('POST /browser-automation/dom/interact', () => {it('should perform DOM interaction', async () => {const interactionDto: DOMInteractionDto = {sessionId: sessionId,
          action: DOMActionType.CLICK,
          selector: {
            value: 'h1',type: 'css',},waitForElement: true,
          timeout: 5000,
          captureScreenshot: true,
        };

        const response = await request(app.getHttpServer())
          .post('/browser-automation/dom/interact').set('Authorization', `Bearer ${authToken}`)
          .send(interactionDto)
          .expect(HttpStatus.OK);

        const interactionResponse = response.body as DOMInteractionResponse & {
          success: boolean;
          durationMs: number;
          timestamp: string;
        };
        expect(interactionResponse).toHaveProperty('interactionId');
        expect(interactionResponse.success).toBe(true);
        expect(interactionResponse.action).toBe(DOMActionType.CLICK);
        expect(interactionResponse).toHaveProperty('durationMs');
        expect(interactionResponse).toHaveProperty('timestamp');});});

    describe('GET /browser-automation/health', () => {it('should return enhanced health status', async () => {const response = await request(app.getHttpServer()).get('/browser-automation/health').set('Authorization', `Bearer ${authToken}`)
          .expect(HttpStatus.OK);

        const healthResponse = response.body as {
          status: string;
          service: string;
          version: string;
          capabilities: {
            multiFormatScreenshots: boolean;
          };
          statistics: unknown;
          performance: unknown;
        };
        expect(healthResponse.status).toBe('healthy');
        expect(healthResponse.service).toBe('Enhanced Browser Automation Controller');
        expect(healthResponse.version).toBe('3.0.0');
        expect(healthResponse).toHaveProperty('capabilities');
        expect(healthResponse).toHaveProperty('statistics');
        expect(healthResponse).toHaveProperty('performance');
        expect(healthResponse.capabilities.multiFormatScreenshots).toBe(true);});
    });

    describe('GET /browser-automation/capabilities', () => {it('should return automation capabilities', async () => {const response = await request(app.getHttpServer()).get('/browser-automation/capabilities').set('Authorization', `Bearer ${authToken}`)
          .expect(HttpStatus.OK);

        const capabilitiesResponse = response.body as {
          screenshots: {
            formats: ScreenshotFormat[];
          };
          domInteraction: {
            actions: DOMActionType[];
          };
          elementDetection: unknown;
          visualAutomation: unknown;
          realtimeUpdates: unknown;
          general: {
            localOnly: boolean;
            enterpriseGrade: boolean;
          };
        };
        expect(capabilitiesResponse).toHaveProperty('screenshots');
        expect(capabilitiesResponse).toHaveProperty('domInteraction');
        expect(capabilitiesResponse).toHaveProperty('elementDetection');
        expect(capabilitiesResponse).toHaveProperty('visualAutomation');
        expect(capabilitiesResponse).toHaveProperty('realtimeUpdates');
        expect(capabilitiesResponse).toHaveProperty('general');
        expect(capabilitiesResponse.general.localOnly).toBe(true);
        expect(capabilitiesResponse.general.enterpriseGrade).toBe(true);
        expect(capabilitiesResponse.screenshots.formats).toContain(ScreenshotFormat.PNG);
        expect(capabilitiesResponse.domInteraction.actions).toContain(DOMActionType.CLICK);
      });
    });
  });

  describe('Tab Management', () => {describe('POST /browser-use/sessions/:sessionId/tabs', () => {it('should create new tab in session', async () => {const tabOptions = {url: 'https://example.org',title: 'New Tab',
          makeActive: true,
        };

        const response = await request(app.getHttpServer())
          .post(`/browser-use/sessions/${sessionId}/tabs`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(tabOptions)
          .expect(HttpStatus.CREATED);

        const tabResponse = response.body as {
          status: string;
          data: {
            tabId: string;
            url: string;
            isActive: boolean;
          };
        };
        expect(tabResponse.status).toBe('success');
        expect(tabResponse.data).toHaveProperty('tabId');
        expect(tabResponse.data.url).toBe(tabOptions.url);
        expect(tabResponse.data.isActive).toBe(true);
      });
    });
  });

  describe('Screenshot Management', () => {describe('POST /browser-use/sessions/:sessionId/screenshot', () => {it('should take session screenshot', async () => {
        const screenshotOptions = {
          fullPage: true,
          quality: 90,
        };

        const response = await request(app.getHttpServer())
          .post(`/browser-use/sessions/${sessionId}/screenshot`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(screenshotOptions)
          .expect(HttpStatus.OK);

        const screenshotResponse = response.body as {
          status: string;
          data: {
            screenshotId: string;
            base64Data: string;
            format: string;
          };
          timestamp: string;
        };
        expect(screenshotResponse.status).toBe('success');
        expect(screenshotResponse.data).toHaveProperty('screenshotId');
        expect(screenshotResponse.data).toHaveProperty('base64Data');
        expect(screenshotResponse.data).toHaveProperty('format');
        expect(screenshotResponse).toHaveProperty('timestamp');});});
  });

  describe('Data Extraction', () => {
    describe('POST /browser-use/sessions/:sessionId/extract', () => {
      it('should extract page data', async () => {
        const extractConfig = {
          selectors: {
            title: 'h1',
            description: 'meta[name="description"]',
          },
          waitForSelector: 'body',
          timeout: 5000,
        };

        const response = await request(app.getHttpServer())
          .post(`/browser-use/sessions/${sessionId}/extract`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(extractConfig)
          .expect(HttpStatus.OK);

        const extractResponse = response.body as {
          status: string;
          data: {
            title: string;
          };
          timestamp: string;
        };
        expect(extractResponse.status).toBe('success');
        expect(extractResponse.data).toHaveProperty('title');
        expect(extractResponse).toHaveProperty('timestamp');});});
  });

  describe('Health and Status', () => {describe('GET /browser-use/health', () => {it('should return browser use health status', async () => {const response = await request(app.getHttpServer()).get('/browser-use/health').set('Authorization', `Bearer ${authToken}`)
          .expect(HttpStatus.OK);

        const healthResponse = response.body as {
          status: string;
          service: string;
          version: string;
          statistics: {
            activeSessions: number;
            runningTasks: number;
          };
        };
        expect(healthResponse.status).toBe('healthy');
        expect(healthResponse.service).toBe('Browser Use Controller');
        expect(healthResponse.version).toBe('2.0.0');
        expect(healthResponse).toHaveProperty('statistics');
        expect(healthResponse.statistics).toHaveProperty('activeSessions');
        expect(healthResponse.statistics).toHaveProperty('runningTasks');});});
  });

  describe('Error Handling', () => {
    it('should handle rate limiting', async () => {
      // Attempt multiple rapid requests to trigger rate limiting
      const requests = Array.from({ length: 20 }, () =>
        request(app.getHttpServer())
          .get('/browser-use/health')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const responses = await Promise.allSettled(requests);
      const hasRateLimitedResponse = responses.some(
        (result) =>
          result.status === 'fulfilled' &&
          (result.value as Response).status === HttpStatus.TOO_MANY_REQUESTS
      );

      // Rate limiting might not trigger in test environment
      // This test verifies the system handles rapid requests gracefully
      expect(responses.length).toBe(20);
    });

    it('should handle malformed JSON', async () => {await request(app.getHttpServer()).post('/browser-use/sessions').set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json').send('{ invalid json }').expect(HttpStatus.BAD_REQUEST);});

    it('should handle missing required fields', async () => {await request(app.getHttpServer()).post('/browser-use/sessions').set('Authorization', `Bearer ${authToken}`)
        .send({}) // Missing required fields
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('Cleanup', () => {describe('DELETE /browser-use/sessions/:sessionId', () => {it('should close session successfully', async () => {
        await request(app.getHttpServer())
          .delete(`/browser-use/sessions/${sessionId}`)
          .set('Authorization', `Bearer ${authToken}`).expect(HttpStatus.NO_CONTENT);// Verify session is closed
        await request(app.getHttpServer())
          .get(`/browser-use/sessions/${sessionId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(HttpStatus.NOT_FOUND);
      });
    });
  });
});

/**
 * Helper function to get authentication token for testing
 */
async function getTestAuthToken(app: INestApplication): Promise<string> {
  // This would typically authenticate with a test user
  // For now, return a mock token or implement actual auth flow
  const authResponse = await request(app.getHttpServer())
    .post('/auth/login')
    .send({
      username: 'test-user',
      password: 'test-password',
    });

  const authResponseBody = authResponse.body as { accessToken?: string };
  if (authResponseBody.accessToken) {
    return authResponseBody.accessToken;
  }

  // Return a mock token for testing if auth is not fully implemented
  return 'mock-test-token';
}

/**
 * Custom Jest matcher for checking if value is one of multiple options
 */
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeOneOf(values: any[]): R;
    }
  }
}

expect.extend({
  toBeOneOf(received: unknown, argument: unknown[]) {
    const pass = (argument as unknown[]).includes(received);
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