import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { BrowserUseModule } from '../../browser-use.module';
import { BrowserUseService } from '../../browser-use.service';
import { BrowserInteractionService } from '../../browser-interaction.service';
import { BrowserSessionService } from '../../browser-session.service';
import { PythonIntegrationService } from '../../python-integration.service';
import { ErrorHandlerService } from '../../error-handler.service';

/**
 * End-to-End Tests for Browser Automation API
 *
 * These tests validate complete browser automation workflows from API request
 * through to final response, including error handling and monitoring capabilities.
 *
 * Test Categories:
 * - Complete browser session lifecycle (create → interact → destroy)
 * - Multi-step automation scenarios with real browser operations
 * - Cross-session data consistency and state management
 * - Error recovery and resilience testing with real failures
 * - Performance validation under realistic load conditions
 * - Security testing with malicious input and boundary conditions
 * - Monitoring and analytics validation with real metrics
 * - Health monitoring and system diagnostics
 *
 * All tests use real browser instances and validate actual automation behavior.
 */
describe('Browser Automation E2E Tests', () => {
  let app: INestApplication;
  let browserUseService: BrowserUseService;
  let browserInteractionService: BrowserInteractionService;
  let browserSessionService: BrowserSessionService;
  let pythonIntegrationService: PythonIntegrationService;
  let errorHandlerService: ErrorHandlerService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [BrowserUseModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Get service instances for direct validation
    browserUseService = moduleFixture.get<BrowserUseService>(BrowserUseService);
    browserInteractionService = moduleFixture.get<BrowserInteractionService>(
      BrowserInteractionService,
    );
    browserSessionService = moduleFixture.get<BrowserSessionService>(
      BrowserSessionService,
    );
    pythonIntegrationService = moduleFixture.get<PythonIntegrationService>(
      PythonIntegrationService,
    );
    errorHandlerService =
      moduleFixture.get<ErrorHandlerService>(ErrorHandlerService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Complete Browser Session Lifecycle', () => {
    let sessionId: string;

    it('should complete full session workflow: create → configure → interact → destroy', async () => {
      const startTime = Date.now();

      // Step 1: Create new browser session
      const createResponse = await request(app.getHttpServer())
        .post('/browser-use/sessions')
        .send({
          options: {
            headless: true,
            viewport: { width: 1920, height: 1080 },
            timeout: 30000,
          },
        })
        .expect(201);

      expect(createResponse.body).toMatchObject({
        sessionId: expect.any(String),
        status: 'created',
        configuration: expect.objectContaining({
          headless: true,
          viewport: { width: 1920, height: 1080 },
        }),
      });

      sessionId = createResponse.body.sessionId;

      // Step 2: Navigate to a test page
      const navigateResponse = await request(app.getHttpServer())
        .post(`/browser-use/sessions/${sessionId}/navigate`)
        .send({
          url: 'https://example.com',
          waitFor: 'networkidle0',
        })
        .expect(200);

      expect(navigateResponse.body).toMatchObject({
        success: true,
        url: 'https://example.com',
        title: expect.any(String),
        loadTime: expect.any(Number),
      });

      // Step 3: Perform multiple interactions
      const clickResponse = await request(app.getHttpServer())
        .post(`/browser-use/sessions/${sessionId}/click`)
        .send({
          selector: 'body',
          options: { waitFor: 'visible', timeout: 5000 },
        })
        .expect(200);

      expect(clickResponse.body).toMatchObject({
        success: true,
        selector: 'body',
        timestamp: expect.any(String),
        executionTime: expect.any(Number),
      });

      // Step 4: Extract page data
      const extractResponse = await request(app.getHttpServer())
        .post(`/browser-use/sessions/${sessionId}/extract`)
        .send({
          queries: [
            { name: 'title', selector: 'title', attribute: 'textContent' },
            { name: 'url', selector: null, attribute: 'url' },
          ],
        })
        .expect(200);

      expect(extractResponse.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          title: expect.any(String),
          url: expect.any(String),
        }),
        extractionTime: expect.any(Number),
      });

      // Step 5: Take screenshot for validation
      const screenshotResponse = await request(app.getHttpServer())
        .post(`/browser-use/sessions/${sessionId}/screenshot`)
        .send({
          options: {
            fullPage: true,
            quality: 80,
          },
        })
        .expect(200);

      expect(screenshotResponse.body).toMatchObject({
        success: true,
        screenshot: expect.any(String), // Base64 encoded
        dimensions: expect.objectContaining({
          width: expect.any(Number),
          height: expect.any(Number),
        }),
      });

      // Step 6: Get session status and metrics
      const statusResponse = await request(app.getHttpServer())
        .get(`/browser-use/sessions/${sessionId}/status`)
        .expect(200);

      expect(statusResponse.body).toMatchObject({
        sessionId,
        status: 'active',
        uptime: expect.any(Number),
        metrics: expect.objectContaining({
          totalRequests: expect.any(Number),
          successfulRequests: expect.any(Number),
          averageResponseTime: expect.any(Number),
        }),
      });

      // Step 7: Clean destroy session
      const destroyResponse = await request(app.getHttpServer())
        .delete(`/browser-use/sessions/${sessionId}`)
        .expect(200);

      expect(destroyResponse.body).toMatchObject({
        success: true,
        sessionId,
        cleanupTime: expect.any(Number),
      });

      // Validate total workflow performance
      const totalTime = Date.now() - startTime;
      expect(totalTime).toBeLessThan(60000); // Complete workflow < 60 seconds

      // Verify session is properly cleaned up
      await request(app.getHttpServer())
        .get(`/browser-use/sessions/${sessionId}/status`)
        .expect(404);
    });

    it('should handle session timeout and automatic cleanup', async () => {
      // Create session with short timeout
      const createResponse = await request(app.getHttpServer())
        .post('/browser-use/sessions')
        .send({
          options: {
            headless: true,
            timeout: 2000, // 2 seconds
          },
        })
        .expect(201);

      const sessionId = createResponse.body.sessionId;

      // Wait for timeout
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Session should be automatically cleaned up
      await request(app.getHttpServer())
        .get(`/browser-use/sessions/${sessionId}/status`)
        .expect(404);
    });
  });

  describe('Multi-Step Automation Scenarios', () => {
    let sessionId: string;

    beforeEach(async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/browser-use/sessions')
        .send({
          options: {
            headless: true,
            viewport: { width: 1920, height: 1080 },
          },
        })
        .expect(201);

      sessionId = createResponse.body.sessionId;
    });

    afterEach(async () => {
      try {
        await request(app.getHttpServer())
          .delete(`/browser-use/sessions/${sessionId}`)
          .expect(200);
      } catch (error) {
        // Session may already be cleaned up
      }
    });

    it('should complete complex form submission workflow', async () => {
      // Navigate to form page
      await request(app.getHttpServer())
        .post(`/browser-use/sessions/${sessionId}/navigate`)
        .send({ url: 'https://httpbin.org/forms/post' })
        .expect(200);

      // Fill form fields
      await request(app.getHttpServer())
        .post(`/browser-use/sessions/${sessionId}/type`)
        .send({
          selector: 'input[name="custname"]',
          text: 'Test User',
          options: { delay: 10 },
        })
        .expect(200);

      await request(app.getHttpServer())
        .post(`/browser-use/sessions/${sessionId}/type`)
        .send({
          selector: 'input[name="custemail"]',
          text: 'test@example.com',
          options: { delay: 10 },
        })
        .expect(200);

      // Select dropdown option
      await request(app.getHttpServer())
        .post(`/browser-use/sessions/${sessionId}/select`)
        .send({
          selector: 'select[name="size"]',
          value: 'medium',
        })
        .expect(200);

      // Submit form
      await request(app.getHttpServer())
        .post(`/browser-use/sessions/${sessionId}/click`)
        .send({
          selector: 'input[type="submit"]',
          options: { waitFor: 'navigation' },
        })
        .expect(200);

      // Verify submission success
      const extractResponse = await request(app.getHttpServer())
        .post(`/browser-use/sessions/${sessionId}/extract`)
        .send({
          queries: [
            { name: 'title', selector: 'title', attribute: 'textContent' },
          ],
        })
        .expect(200);

      expect(extractResponse.body.data.title).toContain('httpbin.org');
    });

    it('should handle multi-page navigation workflow', async () => {
      const pages = [
        'https://example.com',
        'https://httpbin.org',
        'https://jsonplaceholder.typicode.com',
      ];

      const results = [];

      for (const url of pages) {
        // Navigate to page
        const navigateResponse = await request(app.getHttpServer())
          .post(`/browser-use/sessions/${sessionId}/navigate`)
          .send({
            url,
            waitFor: 'networkidle0',
          })
          .expect(200);

        // Extract page data
        const extractResponse = await request(app.getHttpServer())
          .post(`/browser-use/sessions/${sessionId}/extract`)
          .send({
            queries: [
              { name: 'title', selector: 'title', attribute: 'textContent' },
              { name: 'url', selector: null, attribute: 'url' },
            ],
          })
          .expect(200);

        results.push({
          url,
          title: extractResponse.body.data.title,
          loadTime: navigateResponse.body.loadTime,
        });
      }

      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result.url).toBe(pages[index]);
        expect(result.title).toBeTruthy();
        expect(result.loadTime).toBeGreaterThan(0);
      });
    });

    it('should execute JavaScript and handle dynamic content', async () => {
      // Navigate to page with dynamic content
      await request(app.getHttpServer())
        .post(`/browser-use/sessions/${sessionId}/navigate`)
        .send({ url: 'https://example.com' })
        .expect(200);

      // Execute JavaScript to modify page
      const executeResponse = await request(app.getHttpServer())
        .post(`/browser-use/sessions/${sessionId}/execute`)
        .send({
          script: `
            document.body.innerHTML += '<div id="test-element">Dynamic Content</div>';
            return document.getElementById('test-element').textContent;
          `,
        })
        .expect(200);

      expect(executeResponse.body).toMatchObject({
        success: true,
        result: 'Dynamic Content',
        executionTime: expect.any(Number),
      });

      // Verify dynamic content exists
      const extractResponse = await request(app.getHttpServer())
        .post(`/browser-use/sessions/${sessionId}/extract`)
        .send({
          queries: [
            {
              name: 'dynamicContent',
              selector: '#test-element',
              attribute: 'textContent',
            },
          ],
        })
        .expect(200);

      expect(extractResponse.body.data.dynamicContent).toBe('Dynamic Content');
    });
  });

  describe('Error Recovery and Resilience', () => {
    let sessionId: string;

    beforeEach(async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/browser-use/sessions')
        .send({
          options: {
            headless: true,
            viewport: { width: 1920, height: 1080 },
          },
        })
        .expect(201);

      sessionId = createResponse.body.sessionId;
    });

    afterEach(async () => {
      try {
        await request(app.getHttpServer())
          .delete(`/browser-use/sessions/${sessionId}`)
          .expect(200);
      } catch (error) {
        // Session may already be cleaned up
      }
    });

    it('should handle navigation errors gracefully', async () => {
      // Attempt to navigate to invalid URL
      const response = await request(app.getHttpServer())
        .post(`/browser-use/sessions/${sessionId}/navigate`)
        .send({
          url: 'https://invalid-domain-that-does-not-exist.com',
        })
        .expect(400);

      expect(response.body).toMatchObject({
        error: expect.objectContaining({
          type: 'NavigationError',
          message: expect.stringContaining('navigation'),
          code: expect.any(String),
          timestamp: expect.any(String),
        }),
        sessionId,
        correlationId: expect.any(String),
      });

      // Verify session is still active after error
      await request(app.getHttpServer())
        .get(`/browser-use/sessions/${sessionId}/status`)
        .expect(200);
    });

    it('should handle selector timeouts with proper error classification', async () => {
      await request(app.getHttpServer())
        .post(`/browser-use/sessions/${sessionId}/navigate`)
        .send({ url: 'https://example.com' })
        .expect(200);

      // Attempt to click non-existent element with short timeout
      const response = await request(app.getHttpServer())
        .post(`/browser-use/sessions/${sessionId}/click`)
        .send({
          selector: '#non-existent-element',
          options: { timeout: 1000 },
        })
        .expect(404);

      expect(response.body).toMatchObject({
        error: expect.objectContaining({
          type: 'ElementNotFoundError',
          message: expect.stringContaining('selector'),
          code: 'ELEMENT_NOT_FOUND',
          details: expect.objectContaining({
            selector: '#non-existent-element',
            timeout: 1000,
          }),
        }),
      });
    });

    it('should recover from browser crash and restart session', async () => {
      // Simulate browser crash by executing invalid JavaScript
      await request(app.getHttpServer())
        .post(`/browser-use/sessions/${sessionId}/navigate`)
        .send({ url: 'https://example.com' })
        .expect(200);

      // Execute script that causes browser issues
      const response = await request(app.getHttpServer())
        .post(`/browser-use/sessions/${sessionId}/execute`)
        .send({
          script: 'throw new Error("Simulated browser crash");',
        })
        .expect(500);

      expect(response.body).toMatchObject({
        error: expect.objectContaining({
          type: 'JavaScriptExecutionError',
          code: 'SCRIPT_EXECUTION_FAILED',
        }),
      });

      // Session should attempt automatic recovery
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Verify session can still handle requests after recovery
      await request(app.getHttpServer())
        .post(`/browser-use/sessions/${sessionId}/navigate`)
        .send({ url: 'https://example.com' })
        .expect(200);
    });

    it('should handle concurrent request conflicts gracefully', async () => {
      await request(app.getHttpServer())
        .post(`/browser-use/sessions/${sessionId}/navigate`)
        .send({ url: 'https://example.com' })
        .expect(200);

      // Send multiple concurrent requests
      const promises = [
        request(app.getHttpServer())
          .post(`/browser-use/sessions/${sessionId}/click`)
          .send({ selector: 'body' }),
        request(app.getHttpServer())
          .post(`/browser-use/sessions/${sessionId}/type`)
          .send({ selector: 'body', text: 'test' }),
        request(app.getHttpServer())
          .post(`/browser-use/sessions/${sessionId}/extract`)
          .send({
            queries: [
              { name: 'title', selector: 'title', attribute: 'textContent' },
            ],
          }),
      ];

      const results = await Promise.allSettled(promises);

      // At least one should succeed, others may be queued or rejected with proper error
      const successes = results.filter((r) => r.status === 'fulfilled').length;
      const rejections = results.filter((r) => r.status === 'rejected').length;

      expect(successes).toBeGreaterThanOrEqual(1);

      // Rejections should be due to concurrency control, not crashes
      if (rejections > 0) {
        const rejectedResult = results.find(
          (r) => r.status === 'rejected',
        ) as PromiseRejectedResult;
        expect(rejectedResult.reason.message).toMatch(/concurrent|queue|busy/i);
      }
    });
  });

  describe('Performance Validation', () => {
    it('should handle high-frequency session creation and destruction', async () => {
      const startTime = Date.now();
      const sessionCount = 10;
      const sessions = [];

      // Create multiple sessions rapidly
      for (let i = 0; i < sessionCount; i++) {
        const createResponse = await request(app.getHttpServer())
          .post('/browser-use/sessions')
          .send({
            options: {
              headless: true,
              viewport: { width: 800, height: 600 },
            },
          })
          .expect(201);

        sessions.push(createResponse.body.sessionId);
      }

      // Destroy all sessions
      const destroyPromises = sessions.map((sessionId) =>
        request(app.getHttpServer())
          .delete(`/browser-use/sessions/${sessionId}`)
          .expect(200),
      );

      await Promise.all(destroyPromises);

      const totalTime = Date.now() - startTime;
      const averageTimePerSession = totalTime / sessionCount;

      expect(averageTimePerSession).toBeLessThan(3000); // < 3 seconds per session
      expect(totalTime).toBeLessThan(30000); // Total < 30 seconds
    });

    it('should maintain performance under sustained load', async () => {
      const sessionResponse = await request(app.getHttpServer())
        .post('/browser-use/sessions')
        .send({
          options: { headless: true },
        })
        .expect(201);

      const sessionId = sessionResponse.body.sessionId;

      try {
        await request(app.getHttpServer())
          .post(`/browser-use/sessions/${sessionId}/navigate`)
          .send({ url: 'https://example.com' })
          .expect(200);

        // Execute rapid operations
        const operations = [];
        for (let i = 0; i < 50; i++) {
          operations.push(
            request(app.getHttpServer())
              .post(`/browser-use/sessions/${sessionId}/extract`)
              .send({
                queries: [
                  {
                    name: 'title',
                    selector: 'title',
                    attribute: 'textContent',
                  },
                ],
              }),
          );
        }

        const startTime = Date.now();
        const results = await Promise.allSettled(operations);
        const totalTime = Date.now() - startTime;

        const successCount = results.filter(
          (r) => r.status === 'fulfilled',
        ).length;
        const averageTime = totalTime / operations.length;

        expect(successCount).toBeGreaterThanOrEqual(40); // 80% success rate
        expect(averageTime).toBeLessThan(1000); // Average < 1 second
      } finally {
        await request(app.getHttpServer())
          .delete(`/browser-use/sessions/${sessionId}`)
          .expect(200);
      }
    });

    it('should monitor and report performance metrics', async () => {
      const metricsResponse = await request(app.getHttpServer())
        .get('/browser-use/metrics')
        .expect(200);

      expect(metricsResponse.body).toMatchObject({
        system: expect.objectContaining({
          activeSessions: expect.any(Number),
          totalSessions: expect.any(Number),
          averageSessionDuration: expect.any(Number),
          memoryUsage: expect.objectContaining({
            used: expect.any(Number),
            total: expect.any(Number),
            percentage: expect.any(Number),
          }),
        }),
        performance: expect.objectContaining({
          averageResponseTime: expect.any(Number),
          requestsPerMinute: expect.any(Number),
          errorRate: expect.any(Number),
        }),
        health: expect.objectContaining({
          status: expect.stringMatching(/^(healthy|degraded|unhealthy)$/),
          uptime: expect.any(Number),
          lastHealthCheck: expect.any(String),
        }),
      });
    });
  });

  describe('Security Validation', () => {
    let sessionId: string;

    beforeEach(async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/browser-use/sessions')
        .send({
          options: { headless: true },
        })
        .expect(201);

      sessionId = createResponse.body.sessionId;
    });

    afterEach(async () => {
      try {
        await request(app.getHttpServer())
          .delete(`/browser-use/sessions/${sessionId}`)
          .expect(200);
      } catch (error) {
        // Session may already be cleaned up
      }
    });

    it('should sanitize malicious selectors', async () => {
      await request(app.getHttpServer())
        .post(`/browser-use/sessions/${sessionId}/navigate`)
        .send({ url: 'https://example.com' })
        .expect(200);

      // Test XSS attempt in selector
      const response = await request(app.getHttpServer())
        .post(`/browser-use/sessions/${sessionId}/click`)
        .send({
          selector: '<script>alert("XSS")</script>',
          options: { timeout: 1000 },
        })
        .expect(400);

      expect(response.body).toMatchObject({
        error: expect.objectContaining({
          type: 'ValidationError',
          code: 'INVALID_SELECTOR',
          message: expect.stringContaining('selector'),
        }),
      });
    });

    it('should prevent JavaScript injection in execution', async () => {
      await request(app.getHttpServer())
        .post(`/browser-use/sessions/${sessionId}/navigate`)
        .send({ url: 'https://example.com' })
        .expect(200);

      // Attempt to execute malicious JavaScript
      const response = await request(app.getHttpServer())
        .post(`/browser-use/sessions/${sessionId}/execute`)
        .send({
          script:
            'window.location.href = "https://malicious-site.com"; document.cookie;',
        })
        .expect(403);

      expect(response.body).toMatchObject({
        error: expect.objectContaining({
          type: 'SecurityError',
          code: 'FORBIDDEN_OPERATION',
          message: expect.stringContaining('security'),
        }),
      });
    });

    it('should enforce URL allowlist for navigation', async () => {
      // Attempt to navigate to potentially dangerous URL
      const response = await request(app.getHttpServer())
        .post(`/browser-use/sessions/${sessionId}/navigate`)
        .send({
          url: 'javascript:alert("XSS")',
        })
        .expect(400);

      expect(response.body).toMatchObject({
        error: expect.objectContaining({
          type: 'ValidationError',
          code: 'INVALID_URL',
          message: expect.stringContaining('url'),
        }),
      });
    });

    it('should limit resource consumption per session', async () => {
      await request(app.getHttpServer())
        .post(`/browser-use/sessions/${sessionId}/navigate`)
        .send({ url: 'https://example.com' })
        .expect(200);

      // Attempt to consume excessive resources
      const largeDataScript = `
        const data = new Array(1000000).fill('x').join('');
        return data;
      `;

      const response = await request(app.getHttpServer())
        .post(`/browser-use/sessions/${sessionId}/execute`)
        .send({
          script: largeDataScript,
        })
        .expect(413);

      expect(response.body).toMatchObject({
        error: expect.objectContaining({
          type: 'ResourceLimitError',
          code: 'PAYLOAD_TOO_LARGE',
        }),
      });
    });
  });

  describe('Monitoring and Analytics', () => {
    it('should track and report session analytics', async () => {
      const analyticsResponse = await request(app.getHttpServer())
        .get('/browser-use/analytics')
        .expect(200);

      expect(analyticsResponse.body).toMatchObject({
        sessions: expect.objectContaining({
          total: expect.any(Number),
          active: expect.any(Number),
          completed: expect.any(Number),
          failed: expect.any(Number),
        }),
        operations: expect.objectContaining({
          totalRequests: expect.any(Number),
          successRate: expect.any(Number),
          averageExecutionTime: expect.any(Number),
          errorDistribution: expect.any(Object),
        }),
        performance: expect.objectContaining({
          throughput: expect.any(Number),
          latency: expect.objectContaining({
            p50: expect.any(Number),
            p95: expect.any(Number),
            p99: expect.any(Number),
          }),
          resourceUtilization: expect.objectContaining({
            cpu: expect.any(Number),
            memory: expect.any(Number),
          }),
        }),
        timestamp: expect.any(String),
      });
    });

    it('should provide health monitoring endpoints', async () => {
      const healthResponse = await request(app.getHttpServer())
        .get('/browser-use/health')
        .expect(200);

      expect(healthResponse.body).toMatchObject({
        status: expect.stringMatching(/^(healthy|degraded|unhealthy)$/),
        components: expect.objectContaining({
          browserService: expect.any(String),
          sessionManager: expect.any(String),
          pythonIntegration: expect.any(String),
          errorHandler: expect.any(String),
        }),
        checks: expect.arrayContaining([
          expect.objectContaining({
            name: expect.any(String),
            status: expect.any(String),
            duration: expect.any(Number),
          }),
        ]),
        uptime: expect.any(Number),
        timestamp: expect.any(String),
      });
    });

    it('should generate comprehensive error reports', async () => {
      // Trigger some errors for reporting
      const sessionResponse = await request(app.getHttpServer())
        .post('/browser-use/sessions')
        .send({ options: { headless: true } })
        .expect(201);

      const sessionId = sessionResponse.body.sessionId;

      // Generate various errors
      await request(app.getHttpServer())
        .post(`/browser-use/sessions/${sessionId}/navigate`)
        .send({ url: 'https://invalid-url-for-testing.com' })
        .expect(400);

      await request(app.getHttpServer())
        .post(`/browser-use/sessions/${sessionId}/click`)
        .send({ selector: '#non-existent' })
        .expect(404);

      // Get error report
      const errorReportResponse = await request(app.getHttpServer())
        .get('/browser-use/errors/report')
        .query({ sessionId })
        .expect(200);

      expect(errorReportResponse.body).toMatchObject({
        sessionId,
        errorSummary: expect.objectContaining({
          totalErrors: expect.any(Number),
          errorTypes: expect.any(Object),
          timeRange: expect.objectContaining({
            start: expect.any(String),
            end: expect.any(String),
          }),
        }),
        errors: expect.arrayContaining([
          expect.objectContaining({
            type: expect.any(String),
            message: expect.any(String),
            timestamp: expect.any(String),
            context: expect.any(Object),
          }),
        ]),
      });

      // Cleanup
      await request(app.getHttpServer())
        .delete(`/browser-use/sessions/${sessionId}`)
        .expect(200);
    });
  });

  describe('System Integration', () => {
    it('should integrate with Python browser-use framework', async () => {
      const integrationResponse = await request(app.getHttpServer())
        .get('/browser-use/python/status')
        .expect(200);

      expect(integrationResponse.body).toMatchObject({
        pythonFramework: expect.objectContaining({
          version: expect.any(String),
          status: expect.stringMatching(/^(connected|disconnected|error)$/),
          capabilities: expect.arrayContaining([expect.any(String)]),
        }),
        integration: expect.objectContaining({
          status: expect.any(String),
          lastSync: expect.any(String),
          syncErrors: expect.any(Number),
        }),
      });
    });

    it('should handle graceful shutdown and cleanup', async () => {
      // Create test sessions
      const sessionIds = [];
      for (let i = 0; i < 3; i++) {
        const response = await request(app.getHttpServer())
          .post('/browser-use/sessions')
          .send({ options: { headless: true } })
          .expect(201);
        sessionIds.push(response.body.sessionId);
      }

      // Trigger graceful shutdown
      const shutdownResponse = await request(app.getHttpServer())
        .post('/browser-use/shutdown')
        .send({ graceful: true })
        .expect(200);

      expect(shutdownResponse.body).toMatchObject({
        success: true,
        message: expect.stringContaining('shutdown'),
        cleanedSessions: sessionIds.length,
      });

      // Verify all sessions are cleaned up
      for (const sessionId of sessionIds) {
        await request(app.getHttpServer())
          .get(`/browser-use/sessions/${sessionId}/status`)
          .expect(404);
      }
    });
  });
});
