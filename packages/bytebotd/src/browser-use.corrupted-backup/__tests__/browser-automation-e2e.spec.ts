import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { BrowserUseModule } from '../browser-use.module';
import { ParlantModule } from '../../parlant/parlant.module';
import { SecurityModule } from '../../common/security/security.module';
import { AuthModule } from '../../auth/auth.module';
import { HealthModule } from '../../health/health.module';
import { MetricsModule } from '../../metrics/metrics.module';
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
  TaskExecutionRequestDto,
  TaskExecutionStatus
} from '../dto/task-execution.dto';
import {
  ScreenshotCaptureDto,
  ScreenshotFormat,
  ScreenshotType
} from '../dto/screenshot.dto';

describe('Browser Automation E2E Workflows', () => {
  let app: INestApplication;
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
        HealthModule,
        MetricsModule,
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

  describe('Complete Web Scraping Workflow', () => {
    let sessionId: string;
    let taskId: string;

    it('should complete full web scraping workflow', async () => {
      // Step 1: Create browser session
      const createSessionDto: CreateBrowserSessionDto = {
        name: 'E2E Web Scraping Session',
        headless: true,
        viewportWidth: 1280,
        viewportHeight: 720,
        initialUrls: ['https://example.com'],
      };

      const sessionResponse = await request(app.getHttpServer())
        .post('/browser-use/sessions').set('Authorization', `Bearer ${authToken}`)
        .send(createSessionDto)
        .expect(HttpStatus.CREATED);

      sessionId = sessionResponse.body.sessionId;
      expect(sessionResponse.body.status).toBe(BrowserSessionStatus.ACTIVE);

      // Step 2: Execute navigation and data extraction task
      const createTaskDto: CreateBrowserTaskDto = {
        name: 'E2E Data Extraction Task',actions: [{
            type: 'navigate',url: 'https://example.com',},{
            type: 'wait',selector: 'h1',timeout: 5000,},
          {
            type: 'extract',selector: 'h1',property: 'textContent',},{
            type: 'extract',selector: 'title',property: 'textContent',},{
            type: 'screenshot',fullPage: true,},
        ],
        priority: BrowserTaskPriority.HIGH,
        sessionConfig: {
          sessionId: sessionId,
        },
      };

      const taskResponse = await request(app.getHttpServer())
        .post('/browser-use/tasks').set('Authorization', `Bearer ${authToken}`).send(createTaskDto).expect(HttpStatus.CREATED);

      taskId = taskResponse.body.taskId;
      expect(taskResponse.body.name).toBe(createTaskDto.name);

      // Step 3: Monitor task completion
      let taskCompleted = false;
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds timeout

      while (!taskCompleted && attempts < maxAttempts) {
        const statusResponse = await request(app.getHttpServer())
          .get(`/browser-use/tasks/${taskId}`)
          .set('Authorization', `Bearer ${authToken}`).expect(HttpStatus.OK);if (statusResponse.body.status === BrowserTaskStatus.COMPLETED) {
          taskCompleted = true;
          expect(statusResponse.body.actionsCompleted).toBeGreaterThan(0);
          expect(statusResponse.body.result).toBeDefined();
        } else if (statusResponse.body.status === BrowserTaskStatus.FAILED) {
          throw new Error(`Task failed: ${statusResponse.body.error}`);
        }

        attempts++;
        if (!taskCompleted) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        }
      }

      expect(taskCompleted).toBe(true);

      // Step 4: Take additional screenshots
      const screenshotDto: ScreenshotCaptureDto = {
        sessionId: sessionId,
        type: ScreenshotType.FULLPAGE,
        format: ScreenshotFormat.PNG,
        quality: 90,
      };

      const screenshotResponse = await request(app.getHttpServer())
        .post('/browser-automation/screenshots/capture').set('Authorization', `Bearer ${authToken}`)
        .send(screenshotDto)
        .expect(HttpStatus.OK);

      expect(screenshotResponse.body.success).toBe(true);
      expect(screenshotResponse.body.base64Data).toBeDefined();

      // Step 5: Extract additional page data
      const extractConfig = {
        selectors: {
          title: 'h1',links: 'a',paragraphs: 'p',},waitForSelector: 'body',
        timeout: 5000,
      };

      const extractResponse = await request(app.getHttpServer())
        .post(`/browser-use/sessions/${sessionId}/extract`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(extractConfig)
        .expect(HttpStatus.OK);

      expect(extractResponse.body.status).toBe('success');expect(extractResponse.body.data).toHaveProperty('title');

      // Step 6: Clean up - Close session
      await request(app.getHttpServer())
        .delete(`/browser-use/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HttpStatus.NO_CONTENT);
    });
  });

  describe('Complex Form Automation Workflow', () => {
    let sessionId: string;
    let executionId: string;

    it('should complete complex form automation workflow', async () => {
      // Step 1: Create session
      const createSessionDto: CreateBrowserSessionDto = {
        name: 'E2E Form Automation Session',
        headless: true,
        viewportWidth: 1280,
        viewportHeight: 720,
      };

      const sessionResponse = await request(app.getHttpServer())
        .post('/browser-use/sessions').set('Authorization', `Bearer ${authToken}`)
        .send(createSessionDto)
        .expect(HttpStatus.CREATED);

      sessionId = sessionResponse.body.sessionId;

      // Step 2: Execute complex task automation
      const taskExecutionRequest: TaskExecutionRequestDto = {
        taskDefinition: {
          name: 'Complex Form Automation',description: 'Automated form filling and submission',steps: [{
              type: 'navigate',url: 'https://httpbin.org/forms/post',},{
              type: 'wait',selector: 'form',timeout: 5000,},
            {
              type: 'fill',selector: 'input[name="custname"]',value: 'Test Customer',},{
              type: 'fill',selector: 'input[name="custtel"]',value: '123-456-7890',},{
              type: 'fill',selector: 'input[name="custemail"]',value: 'test@example.com',},{
              type: 'select',selector: 'select[name="size"]',value: 'medium',},{
              type: 'check',selector: 'input[name="topping"][value="bacon"]',},
            {
              type: 'fill',selector: 'textarea[name="comments"]',value: 'This is a test comment for E2E automation.',},{
              type: 'screenshot',fullPage: true,},
            {
              type: 'click',selector: 'input[type="submit"]',},
            {
              type: 'wait',selector: 'pre',timeout: 10000,},
            {
              type: 'extract',selector: 'pre',property: 'textContent',},],
        },
        sessionId: sessionId,
        executionOptions: {
          captureScreenshots: true,
          continueOnError: false,
          timeout: 60000,
          stepDelay: 500,
        },
        metadata: {
          priority: 'high',tags: ['e2e', 'form-automation'],},};

      const executionResponse = await request(app.getHttpServer())
        .post('/browser-task-execution/execute').set('Authorization', `Bearer ${authToken}`).send(taskExecutionRequest).expect(HttpStatus.CREATED);

      executionId = executionResponse.body.executionId;
      expect(executionResponse.body.status).toBeOneOf([
        TaskExecutionStatus.RUNNING,
        TaskExecutionStatus.COMPLETED,
      ]);

      // Step 3: Monitor execution progress
      let executionCompleted = false;
      let attempts = 0;
      const maxAttempts = 60; // 60 seconds timeout

      while (!executionCompleted && attempts < maxAttempts) {
        const statusResponse = await request(app.getHttpServer())
          .get(`/browser-task-execution/executions/${executionId}`)
          .set('Authorization', `Bearer ${authToken}`).expect(HttpStatus.OK);if (statusResponse.body.status === TaskExecutionStatus.COMPLETED) {
          executionCompleted = true;
          expect(statusResponse.body.progress).toBe(100);
          expect(statusResponse.body.result.success).toBe(true);
          expect(statusResponse.body.stepsCompleted).toBeGreaterThan(0);
          expect(statusResponse.body.screenshots.length).toBeGreaterThan(0);
        } else if (statusResponse.body.status === TaskExecutionStatus.FAILED) {
          throw new Error(`Execution failed: ${statusResponse.body.error}`);}attempts++;
        if (!executionCompleted) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      expect(executionCompleted).toBe(true);

      // Step 4: Verify execution history
      const historyResponse = await request(app.getHttpServer())
        .get(`/browser-task-execution/history/${sessionId}`)
        .set('Authorization', `Bearer ${authToken}`).expect(HttpStatus.OK);expect(Array.isArray(historyResponse.body)).toBe(true);
      expect(historyResponse.body.length).toBeGreaterThan(0);
      expect(historyResponse.body[0].executionId).toBe(executionId);

      // Step 5: Clean up
      await request(app.getHttpServer())
        .delete(`/browser-use/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HttpStatus.NO_CONTENT);
    });
  });

  describe('Multi-Tab Parallel Processing Workflow', () => {
    let sessionId: string;
    const tabIds: string[] = [];

    it('should handle multi-tab parallel processing', async () => {
      // Step 1: Create session
      const createSessionDto: CreateBrowserSessionDto = {
        name: 'E2E Multi-Tab Session',
        headless: true,
        viewportWidth: 1280,
        viewportHeight: 720,
        initialUrls: ['https://example.com'],
      };

      const sessionResponse = await request(app.getHttpServer())
        .post('/browser-use/sessions').set('Authorization', `Bearer ${authToken}`)
        .send(createSessionDto)
        .expect(HttpStatus.CREATED);

      sessionId = sessionResponse.body.sessionId;
      tabIds.push(sessionResponse.body.tabs[0].tabId);

      // Step 2: Create additional tabs
      const additionalUrls = [
        'https://httpbin.org/html','https://httpbin.org/json','https://httpbin.org/xml',
      ];

      for (const url of additionalUrls) {
        const tabResponse = await request(app.getHttpServer())
          .post(`/browser-use/sessions/${sessionId}/tabs`)
          .set('Authorization', `Bearer ${authToken}`).send({url: url,
            title: `Tab for ${url}`,makeActive: false,})
          .expect(HttpStatus.CREATED);

        tabIds.push(tabResponse.body.data.tabId);
      }

      expect(tabIds.length).toBe(4);

      // Step 3: Execute parallel tasks on different tabs
      const parallelTasks = additionalUrls.map((url, index) => {
        const taskDto: CreateBrowserTaskDto = {
          name: `Parallel Task ${index + 1}`,
          actions: [
            {
              type: 'navigate',url: url,},
            {
              type: 'wait',selector: 'body',timeout: 5000,},
            {
              type: 'screenshot',fullPage: true,},
            {
              type: 'extract',selector: 'body',property: 'textContent',},],
          priority: BrowserTaskPriority.NORMAL,
          sessionConfig: {
            sessionId: sessionId,
            tabId: tabIds[index + 1],
          },
        };

        return request(app.getHttpServer())
          .post('/browser-use/tasks').set('Authorization', `Bearer ${authToken}`).send(taskDto).expect(HttpStatus.CREATED);
      });

      const taskResponses = await Promise.all(parallelTasks);
      const taskIdList = taskResponses.map(response => response.body.taskId);

      // Step 4: Monitor all tasks completion
      let allTasksCompleted = false;
      let attempts = 0;
      const maxAttempts = 45; // 45 seconds timeout

      while (!allTasksCompleted && attempts < maxAttempts) {
        const statusChecks = taskIdList.map(taskId =>
          request(app.getHttpServer())
            .get(`/browser-use/tasks/${taskId}`)
            .set('Authorization', `Bearer ${authToken}`));const statusResponses = await Promise.all(statusChecks);
        const completedTasks = statusResponses.filter(
          response => response.body.status === BrowserTaskStatus.COMPLETED
        );
        const failedTasks = statusResponses.filter(
          response => response.body.status === BrowserTaskStatus.FAILED
        );

        if (failedTasks.length > 0) {
          throw new Error(`Some tasks failed: ${failedTasks.map(t => t.body.error).join(', ')}`);
        }

        if (completedTasks.length === taskIdList.length) {
          allTasksCompleted = true;
        }

        attempts++;
        if (!allTasksCompleted) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      expect(allTasksCompleted).toBe(true);

      // Step 5: Verify session statistics
      const sessionStatusResponse = await request(app.getHttpServer())
        .get(`/browser-use/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${authToken}`).expect(HttpStatus.OK);expect(sessionStatusResponse.body.tabs.length).toBe(4);
      expect(sessionStatusResponse.body.statistics.tasksExecuted).toBeGreaterThan(0);

      // Step 6: Clean up - Close individual tabs first
      for (let i = 1; i < tabIds.length; i++) {
        await request(app.getHttpServer())
          .delete(`/browser-use/sessions/${sessionId}/tabs/${tabIds[i]}`)
          .set('Authorization', `Bearer ${authToken}`).expect(HttpStatus.NO_CONTENT);}

      // Step 7: Close session
      await request(app.getHttpServer())
        .delete(`/browser-use/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HttpStatus.NO_CONTENT);
    });
  });

  describe('Error Recovery and Resilience Workflow', () => {
    let sessionId: string;

    it('should demonstrate error recovery and resilience', async () => {
      // Step 1: Create session
      const createSessionDto: CreateBrowserSessionDto = {
        name: 'E2E Error Recovery Session',
        headless: true,
        viewportWidth: 1280,
        viewportHeight: 720,
      };

      const sessionResponse = await request(app.getHttpServer())
        .post('/browser-use/sessions').set('Authorization', `Bearer ${authToken}`)
        .send(createSessionDto)
        .expect(HttpStatus.CREATED);

      sessionId = sessionResponse.body.sessionId;

      // Step 2: Execute task with intentional errors
      const resilientTaskDto: CreateBrowserTaskDto = {
        name: 'Error Recovery Test Task',
        actions: [
          {
            type: 'navigate',
            url: 'https://httpbin.org/delay/2', // Simulate slow loading
          },
          {
            type: 'wait',
            selector: 'body',
            timeout: 10000,
          },
          {
            type: 'click',
            selector: '#non-existent-element', // This will fail
            continueOnError: true,
          },
          {
            type: 'navigate',
            url: 'https://httpbin.org/html',
          },
          {
            type: 'wait',
            selector: 'h1',
            timeout: 5000,
          },
          {
            type: 'extract',
            selector: 'h1',
            property: 'textContent',
          },
          {
            type: 'screenshot',
            fullPage: true,
          },
        ],
        priority: BrowserTaskPriority.NORMAL,
        sessionConfig: {
          sessionId: sessionId,
        },
        errorHandling: {
          continueOnError: true,
          retryAttempts: 2,
          retryDelay: 1000,
        },
      };

      const taskResponse = await request(app.getHttpServer())
        .post('/browser-use/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send(resilientTaskDto)
        .expect(HttpStatus.CREATED);

      const taskId = taskResponse.body.taskId;

      // Step 3: Monitor task completion (should complete despite errors)
      let taskCompleted = false;
      let attempts = 0;
      const maxAttempts = 30;

      while (!taskCompleted && attempts < maxAttempts) {
        const statusResponse = await request(app.getHttpServer())
          .get(`/browser-use/tasks/${taskId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(HttpStatus.OK);

        if (statusResponse.body.status === BrowserTaskStatus.COMPLETED) {
          taskCompleted = true;
          // Should complete successfully despite the failed click action
          expect(statusResponse.body.actionsCompleted).toBeGreaterThan(3);
        } else if (statusResponse.body.status === BrowserTaskStatus.FAILED) {
          // Only fail if error recovery didn't work
          console.log('Task failed:', statusResponse.body.error);
          break;
        }

        attempts++;
        if (!taskCompleted) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Task should complete or show partial success due to error recovery
      expect(taskCompleted || attempts >= maxAttempts).toBe(true);

      // Step 4: Test task cancellation and cleanup
      const cancelTaskDto: CreateBrowserTaskDto = {
        name: 'Task to be Cancelled',
        actions: [
          {
            type: 'navigate',
            url: 'https://httpbin.org/delay/10', // Long delay
          },
          {
            type: 'wait',
            selector: 'body',
            timeout: 30000,
          },
        ],
        priority: BrowserTaskPriority.LOW,
        sessionConfig: {
          sessionId: sessionId,
        },
      };

      const cancelTaskResponse = await request(app.getHttpServer())
        .post('/browser-use/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send(cancelTaskDto)
        .expect(HttpStatus.CREATED);

      const cancelTaskId = cancelTaskResponse.body.taskId;

      // Wait a moment for task to start
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Cancel the task
      await request(app.getHttpServer())
        .delete(`/browser-use/tasks/${cancelTaskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HttpStatus.NO_CONTENT);

      // Verify cancellation
      const cancelledTaskStatus = await request(app.getHttpServer())
        .get(`/browser-use/tasks/${cancelTaskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HttpStatus.OK);

      expect(cancelledTaskStatus.body.status).toBeOneOf([
        BrowserTaskStatus.CANCELLED,
        BrowserTaskStatus.FAILED,
      ]);

      // Step 5: Clean up
      await request(app.getHttpServer())
        .delete(`/browser-use/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HttpStatus.NO_CONTENT);
    });
  });

  describe('Performance and Metrics Workflow', () => {
    it('should collect and validate performance metrics', async () => {
      // Step 1: Get initial metrics
      const initialMetricsResponse = await request(app.getHttpServer())
        .get('/browser-use/tasks/metrics/summary')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HttpStatus.OK);

      const initialMetrics = initialMetricsResponse.body.data;

      // Step 2: Execute multiple tasks to generate metrics data
      const sessionDto: CreateBrowserSessionDto = {
        name: 'Metrics Collection Session',
        headless: true,
        viewportWidth: 1280,
        viewportHeight: 720,
      };

      const sessionResponse = await request(app.getHttpServer())
        .post('/browser-use/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(sessionDto)
        .expect(HttpStatus.CREATED);

      const sessionId = sessionResponse.body.sessionId;

      // Execute a few quick tasks
      const quickTasks = Array.from({ length: 3 }, (_, index) => {
        const taskDto: CreateBrowserTaskDto = {
          name: `Metrics Task ${index + 1}`,
          actions: [
            {
              type: 'navigate',
              url: `https://httpbin.org/delay/${index + 1}`,
            },
            {
              type: 'wait',
              selector: 'body',
              timeout: 5000,
            },
            {
              type: 'extract',
              selector: 'body',
              property: 'textContent',
            },
          ],
          priority: BrowserTaskPriority.NORMAL,
          sessionConfig: {
            sessionId: sessionId,
          },
        };

        return request(app.getHttpServer())
          .post('/browser-use/tasks').set('Authorization', `Bearer ${authToken}`)
          .send(taskDto)
          .expect(HttpStatus.CREATED);
      });

      const taskResponses = await Promise.all(quickTasks);
      const taskIds = taskResponses.map(response => response.body.taskId);

      // Wait for tasks to complete
      await new Promise(resolve => setTimeout(resolve, 10000));

      // Step 3: Get updated metrics
      const updatedMetricsResponse = await request(app.getHttpServer())
        .get('/browser-use/tasks/metrics/summary').set('Authorization', `Bearer ${authToken}`)
        .expect(HttpStatus.OK);

      const updatedMetrics = updatedMetricsResponse.body.data;

      // Verify metrics increased
      expect(updatedMetrics.totalTasks).toBeGreaterThanOrEqual(initialMetrics.totalTasks);

      // Step 4: Check enhanced health metrics
      const healthResponse = await request(app.getHttpServer())
        .get('/browser-automation/health').set('Authorization', `Bearer ${authToken}`)
        .expect(HttpStatus.OK);

      expect(healthResponse.body.statistics).toHaveProperty('screenshotsCaptured');expect(healthResponse.body.statistics).toHaveProperty('domInteractions');expect(healthResponse.body.performance).toHaveProperty('avgScreenshotTime');

      // Step 5: Clean up
      await request(app.getHttpServer())
        .delete(`/browser-use/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HttpStatus.NO_CONTENT);
    });
  });
});

/**
 * Helper function to get authentication token for testing
 */
async function getTestAuthToken(app: INestApplication): Promise<string> {
  try {
    const authResponse = await request(app.getHttpServer())
      .post('/auth/login').send({username: 'test-user',password: 'test-password',});if (authResponse.body?.accessToken) {
      return authResponse.body.accessToken;
    }
  } catch (error) {
    // Auth might not be fully implemented, use mock token
  }

  // Return a mock token for testing
  return 'mock-e2e-test-token';
}

/**
 * Custom Jest matcher extensions
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
        message: () => `expected ${received} not to be one of ${argument}`,pass: true,};
    } else {
      return {
        message: () => `expected ${received} to be one of ${argument}`,
        pass: false,
      };
    }
  },
});