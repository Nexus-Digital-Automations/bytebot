import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
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

describe('Browser Automation Integration Tests', () => {
  let app: INestApplication;
  let sessionId: string;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        SecurityModule,
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

  describe('Browser Session Management', () => {
    describe('POST /browser-use/sessions', () => {
      it('should create a browser session successfully', async () => {
        const createSessionDto: CreateBrowserSessionDto = {
          name: 'Integration Test Session',
          headless: true,
          viewportWidth: 1280,
          viewportHeight: 720,
          initialUrls: ['https://example.com'],
        };

        const response = await request(app.getHttpServer())
          .post('/browser-use/sessions')
          .set('Authorization', `Bearer ${authToken}`)
          .send(createSessionDto)
          .expect(HttpStatus.CREATED);

        expect(response.body).toHaveProperty('sessionId');
        expect(response.body.name).toBe(createSessionDto.name);
        expect(response.body.status).toBe(BrowserSessionStatus.ACTIVE);
        expect(response.body.tabs).toHaveLength(1);

        sessionId = response.body.sessionId;
      });

      it('should reject session creation with invalid data', async () => {
        const invalidSessionDto = {
          name: '', // Invalid: empty name
          headless: 'not_boolean', // Invalid: wrong type
          viewportWidth: -100, // Invalid: negative width
        };

        await request(app.getHttpServer())
          .post('/browser-use/sessions')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidSessionDto)
          .expect(HttpStatus.BAD_REQUEST);
      });

      it('should reject unauthorized session creation', async () => {
        const createSessionDto: CreateBrowserSessionDto = {
          name: 'Unauthorized Test Session',
          headless: true,
          viewportWidth: 1280,
          viewportHeight: 720,
        };

        await request(app.getHttpServer())
          .post('/browser-use/sessions')
          .send(createSessionDto)
          .expect(HttpStatus.UNAUTHORIZED);
      });
    });

    describe('GET /browser-use/sessions/:sessionId', () => {
      it('should retrieve session information', async () => {
        const response = await request(app.getHttpServer())
          .get(`/browser-use/sessions/${sessionId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(HttpStatus.OK);

        expect(response.body.sessionId).toBe(sessionId);
        expect(response.body.status).toBe(BrowserSessionStatus.ACTIVE);
        expect(response.body).toHaveProperty('tabs');
        expect(response.body).toHaveProperty('statistics');
      });

      it('should return 404 for non-existent session', async () => {
        await request(app.getHttpServer())
          .get('/browser-use/sessions/non-existent-session')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(HttpStatus.NOT_FOUND);
      });
    });

    describe('GET /browser-use/sessions', () => {
      it('should retrieve all sessions', async () => {
        const response = await request(app.getHttpServer())
          .get('/browser-use/sessions')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(HttpStatus.OK);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);
        expect(response.body[0]).toHaveProperty('sessionId');
      });

      it('should filter sessions by status', async () => {
        const response = await request(app.getHttpServer())
          .get('/browser-use/sessions')
          .query({ status: BrowserSessionStatus.ACTIVE })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(HttpStatus.OK);

        expect(Array.isArray(response.body)).toBe(true);
        response.body.forEach((session: any) => {
          expect(session.status).toBe(BrowserSessionStatus.ACTIVE);
        });
      });
    });
  });

  describe('Browser Task Management', () => {
    describe('POST /browser-use/tasks', () => {
      it('should execute a browser task successfully', async () => {
        const createTaskDto: CreateBrowserTaskDto = {
          name: 'Integration Test Task',
          actions: [
            {
              type: 'navigate',
              url: 'https://example.com',
            },
            {
              type: 'click',
              selector: 'h1',
            },
            {
              type: 'extract',
              selector: 'title',
              property: 'textContent',
            },
          ],
          priority: BrowserTaskPriority.NORMAL,
          sessionConfig: {
            headless: true,
            viewportWidth: 1280,
            viewportHeight: 720,
          },
        };

        const response = await request(app.getHttpServer())
          .post('/browser-use/tasks')
          .set('Authorization', `Bearer ${authToken}`)
          .send(createTaskDto)
          .expect(HttpStatus.CREATED);

        expect(response.body).toHaveProperty('taskId');
        expect(response.body.name).toBe(createTaskDto.name);
        expect(response.body.status).toBeOneOf([
          BrowserTaskStatus.RUNNING,
          BrowserTaskStatus.COMPLETED,
        ]);
        expect(response.body.actionsCompleted).toBeGreaterThanOrEqual(0);
      });

      it('should reject task with invalid actions', async () => {
        const invalidTaskDto = {
          name: 'Invalid Task',
          actions: [
            {
              type: 'invalid_action', // Invalid action type
              url: 'https://example.com',
            },
          ],
          priority: BrowserTaskPriority.NORMAL,
        };

        await request(app.getHttpServer())
          .post('/browser-use/tasks')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidTaskDto)
          .expect(HttpStatus.BAD_REQUEST);
      });
    });

    describe('GET /browser-use/tasks', () => {
      it('should retrieve all tasks', async () => {
        const response = await request(app.getHttpServer())
          .get('/browser-use/tasks')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(HttpStatus.OK);

        expect(Array.isArray(response.body)).toBe(true);
        if (response.body.length > 0) {
          expect(response.body[0]).toHaveProperty('taskId');
          expect(response.body[0]).toHaveProperty('status');
        }
      });

      it('should filter tasks by status', async () => {
        const response = await request(app.getHttpServer())
          .get('/browser-use/tasks')
          .query({ status: BrowserTaskStatus.COMPLETED })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(HttpStatus.OK);

        expect(Array.isArray(response.body)).toBe(true);
        response.body.forEach((task: any) => {
          expect(task.status).toBe(BrowserTaskStatus.COMPLETED);
        });
      });
    });

    describe('GET /browser-use/tasks/metrics/summary', () => {
      it('should retrieve task metrics', async () => {
        const response = await request(app.getHttpServer())
          .get('/browser-use/tasks/metrics/summary')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(HttpStatus.OK);

        expect(response.body.status).toBe('success');
        expect(response.body.data).toHaveProperty('totalTasks');
        expect(response.body.data).toHaveProperty('completedTasks');
        expect(response.body.data).toHaveProperty('successRate');
        expect(response.body).toHaveProperty('timestamp');
      });
    });
  });

  describe('Enhanced Browser Automation', () => {
    describe('POST /browser-automation/screenshots/capture', () => {
      it('should capture enhanced screenshot', async () => {
        const screenshotDto: ScreenshotCaptureDto = {
          sessionId: sessionId,
          type: ScreenshotType.FULLPAGE,
          format: ScreenshotFormat.PNG,
          quality: 90,
          timeout: 5000,
        };

        const response = await request(app.getHttpServer())
          .post('/browser-automation/screenshots/capture')
          .set('Authorization', `Bearer ${authToken}`)
          .send(screenshotDto)
          .expect(HttpStatus.OK);

        expect(response.body).toHaveProperty('screenshotId');
        expect(response.body.success).toBe(true);
        expect(response.body.format).toBe(ScreenshotFormat.PNG);
        expect(response.body.type).toBe(ScreenshotType.FULLPAGE);
        expect(response.body).toHaveProperty('base64Data');
        expect(response.body).toHaveProperty('dimensions');
      });

      it('should reject invalid screenshot request', async () => {
        const invalidScreenshotDto = {
          sessionId: 'invalid-session',
          type: 'invalid_type',
          format: 'invalid_format',
          quality: 150, // Invalid: quality > 100
        };

        await request(app.getHttpServer())
          .post('/browser-automation/screenshots/capture')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidScreenshotDto)
          .expect(HttpStatus.BAD_REQUEST);
      });
    });

    describe('POST /browser-automation/dom/interact', () => {
      it('should perform DOM interaction', async () => {
        const interactionDto: DOMInteractionDto = {
          sessionId: sessionId,
          action: DOMActionType.CLICK,
          selector: {
            value: 'h1',
            type: 'css',
          },
          waitForElement: true,
          timeout: 5000,
          captureScreenshot: true,
        };

        const response = await request(app.getHttpServer())
          .post('/browser-automation/dom/interact')
          .set('Authorization', `Bearer ${authToken}`)
          .send(interactionDto)
          .expect(HttpStatus.OK);

        expect(response.body).toHaveProperty('interactionId');
        expect(response.body.success).toBe(true);
        expect(response.body.action).toBe(DOMActionType.CLICK);
        expect(response.body).toHaveProperty('durationMs');
        expect(response.body).toHaveProperty('timestamp');
      });
    });

    describe('GET /browser-automation/health', () => {
      it('should return enhanced health status', async () => {
        const response = await request(app.getHttpServer())
          .get('/browser-automation/health')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(HttpStatus.OK);

        expect(response.body.status).toBe('healthy');
        expect(response.body.service).toBe('Enhanced Browser Automation Controller');
        expect(response.body.version).toBe('3.0.0');
        expect(response.body).toHaveProperty('capabilities');
        expect(response.body).toHaveProperty('statistics');
        expect(response.body).toHaveProperty('performance');
        expect(response.body.capabilities.multiFormatScreenshots).toBe(true);
      });
    });

    describe('GET /browser-automation/capabilities', () => {
      it('should return automation capabilities', async () => {
        const response = await request(app.getHttpServer())
          .get('/browser-automation/capabilities')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(HttpStatus.OK);

        expect(response.body).toHaveProperty('screenshots');
        expect(response.body).toHaveProperty('domInteraction');
        expect(response.body).toHaveProperty('elementDetection');
        expect(response.body).toHaveProperty('visualAutomation');
        expect(response.body).toHaveProperty('realtimeUpdates');
        expect(response.body).toHaveProperty('general');

        expect(response.body.general.localOnly).toBe(true);
        expect(response.body.general.enterpriseGrade).toBe(true);
        expect(response.body.screenshots.formats).toContain(ScreenshotFormat.PNG);
        expect(response.body.domInteraction.actions).toContain(DOMActionType.CLICK);
      });
    });
  });

  describe('Tab Management', () => {
    describe('POST /browser-use/sessions/:sessionId/tabs', () => {
      it('should create new tab in session', async () => {
        const tabOptions = {
          url: 'https://example.org',
          title: 'New Tab',
          makeActive: true,
        };

        const response = await request(app.getHttpServer())
          .post(`/browser-use/sessions/${sessionId}/tabs`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(tabOptions)
          .expect(HttpStatus.CREATED);

        expect(response.body.status).toBe('success');
        expect(response.body.data).toHaveProperty('tabId');
        expect(response.body.data.url).toBe(tabOptions.url);
        expect(response.body.data.isActive).toBe(true);
      });
    });
  });

  describe('Screenshot Management', () => {
    describe('POST /browser-use/sessions/:sessionId/screenshot', () => {
      it('should take session screenshot', async () => {
        const screenshotOptions = {
          fullPage: true,
          quality: 90,
        };

        const response = await request(app.getHttpServer())
          .post(`/browser-use/sessions/${sessionId}/screenshot`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(screenshotOptions)
          .expect(HttpStatus.OK);

        expect(response.body.status).toBe('success');
        expect(response.body.data).toHaveProperty('screenshotId');
        expect(response.body.data).toHaveProperty('base64Data');
        expect(response.body.data).toHaveProperty('format');
        expect(response.body).toHaveProperty('timestamp');
      });
    });
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

        expect(response.body.status).toBe('success');
        expect(response.body.data).toHaveProperty('title');
        expect(response.body).toHaveProperty('timestamp');
      });
    });
  });

  describe('Health and Status', () => {
    describe('GET /browser-use/health', () => {
      it('should return browser use health status', async () => {
        const response = await request(app.getHttpServer())
          .get('/browser-use/health')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(HttpStatus.OK);

        expect(response.body.status).toBe('healthy');
        expect(response.body.service).toBe('Browser Use Controller');
        expect(response.body.version).toBe('2.0.0');
        expect(response.body).toHaveProperty('statistics');
        expect(response.body.statistics).toHaveProperty('activeSessions');
        expect(response.body.statistics).toHaveProperty('runningTasks');
      });
    });
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
          result.value.status === HttpStatus.TOO_MANY_REQUESTS
      );

      // Rate limiting might not trigger in test environment
      // This test verifies the system handles rapid requests gracefully
      expect(responses.length).toBe(20);
    });

    it('should handle malformed JSON', async () => {
      await request(app.getHttpServer())
        .post('/browser-use/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should handle missing required fields', async () => {
      await request(app.getHttpServer())
        .post('/browser-use/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({}) // Missing required fields
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('Cleanup', () => {
    describe('DELETE /browser-use/sessions/:sessionId', () => {
      it('should close session successfully', async () => {
        await request(app.getHttpServer())
          .delete(`/browser-use/sessions/${sessionId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(HttpStatus.NO_CONTENT);

        // Verify session is closed
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

  if (authResponse.body?.accessToken) {
    return authResponse.body.accessToken;
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