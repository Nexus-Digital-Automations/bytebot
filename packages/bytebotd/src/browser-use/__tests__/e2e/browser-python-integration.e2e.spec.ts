import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { BrowserUseModule } from '../../browser-use.module';
import { PythonIntegrationService } from '../../python-integration.service';

/**
 * End-to-End Tests for Python Framework Integration
 *
 * These tests validate the integration between the NestJS Browser-Use API
 * and the Python browser-use framework, ensuring seamless communication
 * and consistent behavior across both platforms.
 *
 * Test Categories:
 * - Python framework initialization and health checks
 * - Cross-platform session management and synchronization
 * - Python-specific browser automation features
 * - Error handling and fallback mechanisms
 * - Performance comparison and optimization
 * - Data serialization and communication protocols
 *
 * All tests verify bi-directional communication and data consistency
 * between Node.js and Python components.
 */
describe('Browser Python Integration E2E Tests', () => {
  let app: INestApplication;
  let pythonIntegrationService: PythonIntegrationService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [BrowserUseModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    pythonIntegrationService = moduleFixture.get<PythonIntegrationService>(PythonIntegrationService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Python Framework Health and Status', () => {
    it('should verify Python framework is available and responsive', async () => {
      const response = await request(app.getHttpServer())
        .get('/browser-use/python/health')
        .expect(200);

      expect(response.body).toMatchObject({
        python: expect.objectContaining({
          version: expect.any(String),
          status: 'healthy',
          framework: expect.objectContaining({
            browserUse: expect.objectContaining({
              version: expect.any(String),
              installed: true
            }),
            playwright: expect.objectContaining({
              version: expect.any(String),
              installed: true
            })
          })
        }),
        communication: expect.objectContaining({
          protocol: expect.any(String),
          latency: expect.any(Number),
          lastPing: expect.any(String)
        }),
        capabilities: expect.arrayContaining([
          'browser_automation',
          'session_management',
          'advanced_interactions'
        ])
      });
    });

    it('should handle Python framework unavailability gracefully', async () => {
      // Simulate Python framework disconnection
      const response = await request(app.getHttpServer())
        .post('/browser-use/python/disconnect')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        status: 'disconnected'
      });

      // Verify API still functions with fallback
      const sessionResponse = await request(app.getHttpServer())
        .post('/browser-use/sessions')
        .send({
          options: { headless: true },
          fallback: 'nodejs'
        })
        .expect(201);

      expect(sessionResponse.body).toMatchObject({
        sessionId: expect.any(String),
        backend: 'nodejs',
        warning: expect.stringContaining('Python framework unavailable')
      });

      // Cleanup session
      await request(app.getHttpServer())
        .delete(`/browser-use/sessions/${sessionResponse.body.sessionId}`)
        .expect(200);

      // Reconnect Python framework
      await request(app.getHttpServer())
        .post('/browser-use/python/connect')
        .expect(200);
    });

    it('should report detailed Python framework diagnostics', async () => {
      const response = await request(app.getHttpServer())
        .get('/browser-use/python/diagnostics')
        .expect(200);

      expect(response.body).toMatchObject({
        environment: expect.objectContaining({
          pythonPath: expect.any(String),
          virtualEnv: expect.any(String),
          workingDirectory: expect.any(String)
        }),
        dependencies: expect.objectContaining({
          browserUse: expect.objectContaining({
            version: expect.any(String),
            path: expect.any(String)
          }),
          playwright: expect.objectContaining({
            version: expect.any(String),
            browsers: expect.arrayContaining(['chromium'])
          })
        }),
        performance: expect.objectContaining({
          startupTime: expect.any(Number),
          memoryUsage: expect.any(Number),
          activeProcesses: expect.any(Number)
        }),
        errors: expect.any(Array)
      });
    });
  });

  describe('Cross-Platform Session Management', () => {
    it('should create and manage sessions through Python framework', async () => {
      // Create session using Python backend
      const createResponse = await request(app.getHttpServer())
        .post('/browser-use/sessions')
        .send({
          options: {
            headless: true,
            backend: 'python'
          }
        })
        .expect(201);

      expect(createResponse.body).toMatchObject({
        sessionId: expect.any(String),
        backend: 'python',
        pythonProcess: expect.objectContaining({
          pid: expect.any(Number),
          status: 'active'
        })
      });

      const sessionId = createResponse.body.sessionId;

      // Verify session is accessible from Node.js
      const statusResponse = await request(app.getHttpServer())
        .get(`/browser-use/sessions/${sessionId}/status`)
        .expect(200);

      expect(statusResponse.body).toMatchObject({
        sessionId,
        backend: 'python',
        status: 'active',
        pythonIntegration: expect.objectContaining({
          connected: true,
          processId: expect.any(Number)
        })
      });

      // Test cross-platform navigation
      await request(app.getHttpServer())
        .post(`/browser-use/sessions/${sessionId}/navigate`)
        .send({
          url: 'https://example.com',
          pythonOptions: {
            waitFor: 'networkidle',
            timeout: 30000
          }
        })
        .expect(200);

      // Verify navigation succeeded through Python
      const extractResponse = await request(app.getHttpServer())
        .post(`/browser-use/sessions/${sessionId}/extract`)
        .send({
          queries: [
            { name: 'title', selector: 'title', attribute: 'textContent' },
            { name: 'url', selector: null, attribute: 'url' }
          ],
          backend: 'python'
        })
        .expect(200);

      expect(extractResponse.body).toMatchObject({
        success: true,
        backend: 'python',
        data: expect.objectContaining({
          title: expect.any(String),
          url: expect.stringContaining('example.com')
        })
      });

      // Cleanup
      await request(app.getHttpServer())
        .delete(`/browser-use/sessions/${sessionId}`)
        .expect(200);
    });

    it('should synchronize session state between Node.js and Python', async () => {
      const sessionResponse = await request(app.getHttpServer())
        .post('/browser-use/sessions')
        .send({
          options: { headless: true, backend: 'python' }
        })
        .expect(201);

      const sessionId = sessionResponse.body.sessionId;

      try {
        // Perform operations through Python
        await request(app.getHttpServer())
          .post(`/browser-use/sessions/${sessionId}/navigate`)
          .send({ url: 'https://example.com' })
          .expect(200);

        // Verify state is synchronized to Node.js
        const nodeStatus = await request(app.getHttpServer())
          .get(`/browser-use/sessions/${sessionId}/status`)
          .expect(200);

        expect(nodeStatus.body).toMatchObject({
          sessionId,
          status: 'active',
          currentUrl: 'https://example.com',
          synchronization: expect.objectContaining({
            lastSync: expect.any(String),
            status: 'synced'
          })
        });

        // Force synchronization and verify consistency
        const syncResponse = await request(app.getHttpServer())
          .post(`/browser-use/sessions/${sessionId}/sync`)
          .expect(200);

        expect(syncResponse.body).toMatchObject({
          success: true,
          changes: expect.any(Array),
          timestamp: expect.any(String)
        });
      } finally {
        await request(app.getHttpServer())
          .delete(`/browser-use/sessions/${sessionId}`)
          .expect(200);
      }
    });

    it('should handle session migration between backends', async () => {
      // Create session with Node.js backend
      const nodeSessionResponse = await request(app.getHttpServer())
        .post('/browser-use/sessions')
        .send({
          options: { headless: true, backend: 'nodejs' }
        })
        .expect(201);

      const sessionId = nodeSessionResponse.body.sessionId;

      try {
        // Perform some operations
        await request(app.getHttpServer())
          .post(`/browser-use/sessions/${sessionId}/navigate`)
          .send({ url: 'https://example.com' })
          .expect(200);

        // Migrate session to Python backend
        const migrateResponse = await request(app.getHttpServer())
          .post(`/browser-use/sessions/${sessionId}/migrate`)
          .send({
            targetBackend: 'python',
            preserveState: true
          })
          .expect(200);

        expect(migrateResponse.body).toMatchObject({
          success: true,
          sessionId,
          previousBackend: 'nodejs',
          currentBackend: 'python',
          migrationTime: expect.any(Number)
        });

        // Verify session still functions with Python backend
        const statusResponse = await request(app.getHttpServer())
          .get(`/browser-use/sessions/${sessionId}/status`)
          .expect(200);

        expect(statusResponse.body).toMatchObject({
          sessionId,
          backend: 'python',
          currentUrl: 'https://example.com',
          status: 'active'
        });
      } finally {
        await request(app.getHttpServer())
          .delete(`/browser-use/sessions/${sessionId}`)
          .expect(200);
      }
    });
  });

  describe('Python-Specific Features', () => {
    let sessionId: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/browser-use/sessions')
        .send({
          options: { headless: true, backend: 'python' }
        })
        .expect(201);
      sessionId = response.body.sessionId;
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

    it('should execute Python-specific automation scripts', async () => {
      await request(app.getHttpServer())
        .post(`/browser-use/sessions/${sessionId}/navigate`)
        .send({ url: 'https://example.com' })
        .expect(200);

      // Execute Python automation script
      const response = await request(app.getHttpServer())
        .post(`/browser-use/sessions/${sessionId}/python/execute`)
        .send({
          script: `
            from browser_use import Page

            # Advanced Python automation
            page = session.page
            title = await page.title()
            elements = await page.query_selector_all('*')

            return {
                'title': title,
                'elementCount': len(elements),
                'userAgent': await page.evaluate('navigator.userAgent')
            }
          `,
          timeout: 10000
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        result: expect.objectContaining({
          title: expect.any(String),
          elementCount: expect.any(Number),
          userAgent: expect.any(String)
        }),
        executionTime: expect.any(Number),
        backend: 'python'
      });
    });

    it('should utilize Python browser-use advanced interactions', async () => {
      await request(app.getHttpServer())
        .post(`/browser-use/sessions/${sessionId}/navigate`)
        .send({ url: 'https://example.com' })
        .expect(200);

      // Use Python-specific advanced interactions
      const response = await request(app.getHttpServer())
        .post(`/browser-use/sessions/${sessionId}/python/advanced-interaction`)
        .send({
          action: 'smart_click',
          target: 'first visible link',
          options: {
            useAI: true,
            fallbackStrategies: ['xpath', 'text_content', 'position'],
            timeout: 15000
          }
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        action: 'smart_click',
        strategy: expect.any(String),
        element: expect.objectContaining({
          tagName: expect.any(String),
          selector: expect.any(String)
        }),
        executionTime: expect.any(Number)
      });
    });

    it('should handle Python-specific error scenarios', async () => {
      // Test Python import error handling
      const importErrorResponse = await request(app.getHttpServer())
        .post(`/browser-use/sessions/${sessionId}/python/execute`)
        .send({
          script: 'import non_existent_module'
        })
        .expect(400);

      expect(importErrorResponse.body).toMatchObject({
        error: expect.objectContaining({
          type: 'PythonExecutionError',
          subtype: 'ImportError',
          message: expect.stringContaining('non_existent_module'),
          traceback: expect.any(String)
        })
      });

      // Test Python syntax error handling
      const syntaxErrorResponse = await request(app.getHttpServer())
        .post(`/browser-use/sessions/${sessionId}/python/execute`)
        .send({
          script: 'invalid python syntax @@#'
        })
        .expect(400);

      expect(syntaxErrorResponse.body).toMatchObject({
        error: expect.objectContaining({
          type: 'PythonExecutionError',
          subtype: 'SyntaxError',
          message: expect.any(String),
          line: expect.any(Number)
        })
      });
    });

    it('should benchmark Python vs Node.js performance', async () => {
      await request(app.getHttpServer())
        .post(`/browser-use/sessions/${sessionId}/navigate`)
        .send({ url: 'https://example.com' })
        .expect(200);

      // Run performance benchmark
      const benchmarkResponse = await request(app.getHttpServer())
        .post(`/browser-use/sessions/${sessionId}/benchmark`)
        .send({
          operations: [
            { type: 'extract', selector: 'title' },
            { type: 'click', selector: 'body' },
            { type: 'execute', script: 'return document.readyState;' }
          ],
          iterations: 10,
          backends: ['python', 'nodejs']
        })
        .expect(200);

      expect(benchmarkResponse.body).toMatchObject({
        results: expect.objectContaining({
          python: expect.objectContaining({
            averageTime: expect.any(Number),
            totalTime: expect.any(Number),
            successRate: expect.any(Number)
          }),
          nodejs: expect.objectContaining({
            averageTime: expect.any(Number),
            totalTime: expect.any(Number),
            successRate: expect.any(Number)
          })
        }),
        comparison: expect.objectContaining({
          faster: expect.stringMatching(/^(python|nodejs|comparable)$/),
          speedDifference: expect.any(Number),
          recommendation: expect.any(String)
        })
      });
    });
  });

  describe('Communication Protocol Validation', () => {
    it('should handle large data transfers between Node.js and Python', async () => {
      const sessionResponse = await request(app.getHttpServer())
        .post('/browser-use/sessions')
        .send({
          options: { headless: true, backend: 'python' }
        })
        .expect(201);

      const sessionId = sessionResponse.body.sessionId;

      try {
        await request(app.getHttpServer())
          .post(`/browser-use/sessions/${sessionId}/navigate`)
          .send({ url: 'https://example.com' })
          .expect(200);

        // Transfer large data set
        const largeData = Array(1000).fill().map((_, i) => ({
          id: i,
          data: `test-data-${i}`.repeat(100)
        }));

        const response = await request(app.getHttpServer())
          .post(`/browser-use/sessions/${sessionId}/python/process-data`)
          .send({
            data: largeData,
            operation: 'validate_and_count'
          })
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          processedCount: 1000,
          dataSize: expect.any(Number),
          transferTime: expect.any(Number),
          validationResult: 'passed'
        });
      } finally {
        await request(app.getHttpServer())
          .delete(`/browser-use/sessions/${sessionId}`)
          .expect(200);
      }
    });

    it('should handle protocol version compatibility', async () => {
      const compatibilityResponse = await request(app.getHttpServer())
        .get('/browser-use/python/compatibility')
        .expect(200);

      expect(compatibilityResponse.body).toMatchObject({
        protocolVersion: expect.objectContaining({
          current: expect.any(String),
          supported: expect.arrayContaining([expect.any(String)])
        }),
        compatibility: expect.objectContaining({
          status: expect.stringMatching(/^(compatible|warning|incompatible)$/),
          issues: expect.any(Array),
          recommendations: expect.any(Array)
        }),
        features: expect.objectContaining({
          supported: expect.arrayContaining([expect.any(String)]),
          deprecated: expect.any(Array),
          experimental: expect.any(Array)
        })
      });
    });

    it('should recover from communication failures', async () => {
      const sessionResponse = await request(app.getHttpServer())
        .post('/browser-use/sessions')
        .send({
          options: { headless: true, backend: 'python' }
        })
        .expect(201);

      const sessionId = sessionResponse.body.sessionId;

      try {
        // Simulate communication failure
        const failureResponse = await request(app.getHttpServer())
          .post(`/browser-use/sessions/${sessionId}/python/simulate-failure`)
          .send({ type: 'communication_timeout' })
          .expect(200);

        expect(failureResponse.body).toMatchObject({
          success: true,
          simulation: 'communication_timeout'
        });

        // Attempt operation that should trigger recovery
        const recoveryResponse = await request(app.getHttpServer())
          .post(`/browser-use/sessions/${sessionId}/navigate`)
          .send({
            url: 'https://example.com',
            recovery: true
          })
          .expect(200);

        expect(recoveryResponse.body).toMatchObject({
          success: true,
          recovery: expect.objectContaining({
            attempted: true,
            successful: true,
            method: expect.any(String)
          })
        });
      } finally {
        await request(app.getHttpServer())
          .delete(`/browser-use/sessions/${sessionId}`)
          .expect(200);
      }
    });
  });

  describe('Resource Management', () => {
    it('should manage Python process lifecycle efficiently', async () => {
      const initialProcesses = await request(app.getHttpServer())
        .get('/browser-use/python/processes')
        .expect(200);

      const initialCount = initialProcesses.body.processes.length;

      // Create multiple Python sessions
      const sessionIds = [];
      for (let i = 0; i < 5; i++) {
        const response = await request(app.getHttpServer())
          .post('/browser-use/sessions')
          .send({
            options: { headless: true, backend: 'python' }
          })
          .expect(201);
        sessionIds.push(response.body.sessionId);
      }

      // Verify processes were created
      const activeProcesses = await request(app.getHttpServer())
        .get('/browser-use/python/processes')
        .expect(200);

      expect(activeProcesses.body.processes.length).toBeGreaterThan(initialCount);

      // Clean up sessions
      for (const sessionId of sessionIds) {
        await request(app.getHttpServer())
          .delete(`/browser-use/sessions/${sessionId}`)
          .expect(200);
      }

      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify processes were cleaned up
      const finalProcesses = await request(app.getHttpServer())
        .get('/browser-use/python/processes')
        .expect(200);

      expect(finalProcesses.body.processes.length).toBeLessThanOrEqual(initialCount + 1);
    });

    it('should monitor Python framework resource usage', async () => {
      const resourceResponse = await request(app.getHttpServer())
        .get('/browser-use/python/resources')
        .expect(200);

      expect(resourceResponse.body).toMatchObject({
        memory: expect.objectContaining({
          used: expect.any(Number),
          available: expect.any(Number),
          percentage: expect.any(Number)
        }),
        cpu: expect.objectContaining({
          usage: expect.any(Number),
          loadAverage: expect.any(Array)
        }),
        processes: expect.objectContaining({
          active: expect.any(Number),
          idle: expect.any(Number),
          zombie: expect.any(Number)
        }),
        limits: expect.objectContaining({
          maxProcesses: expect.any(Number),
          maxMemory: expect.any(Number),
          enforced: expect.any(Boolean)
        }),
        timestamp: expect.any(String)
      });
    });
  });
});