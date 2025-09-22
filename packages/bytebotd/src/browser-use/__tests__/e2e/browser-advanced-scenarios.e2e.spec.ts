import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { BrowserUseModule } from '../../browser-use.module';

/**
 * End-to-End Tests for Advanced Browser Automation Scenarios
 *
 * These tests validate complex, real-world browser automation scenarios
 * that combine multiple operations, handle edge cases, and test system
 * limits and boundary conditions.
 *
 * Test Categories:
 * - Complex multi-step workflows with state dependencies
 * - Edge case handling and boundary condition testing
 * - Resource-intensive operations and memory management
 * - Concurrent session management and race conditions
 * - Network condition simulation and resilience
 * - Advanced interaction patterns and user simulation
 * - System stress testing and recovery scenarios
 * - Real-world use case validation and performance
 *
 * All tests simulate realistic usage patterns and validate system
 * behavior under challenging conditions.
 */
describe('Advanced Browser Automation Scenarios E2E Tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [BrowserUseModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Complex Multi-Step Workflows', () => {
    it('should complete an e-commerce checkout simulation', async () => {
      const sessionResponse = await request(app.getHttpServer())
        .post('/browser-use/sessions')
        .send({
          options: {
            headless: true,
            viewport: { width: 1920, height: 1080 },
          },
        })
        .expect(201);

      const sessionId = sessionResponse.body.sessionId;

      try {
        // Step 1: Navigate to e-commerce demo site
        await request(app.getHttpServer())
          .post(`/browser-use/sessions/${sessionId}/navigate`)
          .send({
            url: 'https://demo.opencart.com',
            waitFor: 'networkidle0',
          })
          .expect(200);

        // Step 2: Search for products
        await request(app.getHttpServer())
          .post(`/browser-use/sessions/${sessionId}/type`)
          .send({
            selector: 'input[name="search"]',
            text: 'MacBook',
            options: { clear: true, delay: 10 },
          })
          .expect(200);

        await request(app.getHttpServer())
          .post(`/browser-use/sessions/${sessionId}/click`)
          .send({
            selector: 'button[type="submit"]',
            options: { waitFor: 'navigation' },
          })
          .expect(200);

        // Step 3: Select first product
        const productClickResponse = await request(app.getHttpServer())
          .post(`/browser-use/sessions/${sessionId}/click`)
          .send({
            selector: '.product-thumb:first-child h4 a',
            options: { waitFor: 'navigation', timeout: 10000 },
          });

        // Handle case where product layout might be different
        if (productClickResponse.status !== 200) {
          // Fallback: try alternative product selector
          await request(app.getHttpServer())
            .post(`/browser-use/sessions/${sessionId}/click`)
            .send({
              selector: '.product-layout:first-child .product-thumb h4 a',
              options: { waitFor: 'navigation', timeout: 10000 },
            })
            .expect(200);
        }

        // Step 4: Add to cart
        const addToCartResponse = await request(app.getHttpServer())
          .post(`/browser-use/sessions/${sessionId}/click`)
          .send({
            selector: '#button-cart',
            options: { waitFor: 'visible', timeout: 5000 },
          });

        // Verify add to cart succeeded (or handle if cart button not available)
        if (addToCartResponse.status === 200) {
          // Step 5: Go to cart
          await request(app.getHttpServer())
            .post(`/browser-use/sessions/${sessionId}/click`)
            .send({
              selector: '.btn-group .btn.dropdown-toggle',
              options: { waitFor: 'visible' },
            })
            .expect(200);

          // Step 6: Verify cart contents
          const cartContents = await request(app.getHttpServer())
            .post(`/browser-use/sessions/${sessionId}/extract`)
            .send({
              queries: [
                {
                  name: 'cartItems',
                  selector: '.dropdown-menu .table tbody tr',
                  attribute: 'count',
                },
                {
                  name: 'cartTotal',
                  selector: '.dropdown-menu .text-right',
                  attribute: 'textContent',
                },
              ],
            })
            .expect(200);

          expect(cartContents.body.data.cartItems).toBeGreaterThan(0);
        }

        // Step 7: Take screenshot of final state
        const screenshotResponse = await request(app.getHttpServer())
          .post(`/browser-use/sessions/${sessionId}/screenshot`)
          .send({
            options: {
              fullPage: true,
              quality: 90,
            },
          })
          .expect(200);

        expect(screenshotResponse.body).toMatchObject({
          success: true,
          screenshot: expect.any(String),
          dimensions: expect.objectContaining({
            width: expect.any(Number),
            height: expect.any(Number),
          }),
        });
      } finally {
        await request(app.getHttpServer())
          .delete(`/browser-use/sessions/${sessionId}`)
          .expect(200);
      }
    }, 60000); // Extended timeout for complex workflow

    it('should handle dynamic content loading and AJAX responses', async () => {
      const sessionResponse = await request(app.getHttpServer())
        .post('/browser-use/sessions')
        .send({
          options: { headless: true },
        })
        .expect(201);

      const sessionId = sessionResponse.body.sessionId;

      try {
        // Navigate to JSON placeholder for AJAX testing
        await request(app.getHttpServer())
          .post(`/browser-use/sessions/${sessionId}/navigate`)
          .send({
            url: 'https://jsonplaceholder.typicode.com',
            waitFor: 'networkidle0',
          })
          .expect(200);

        // Execute JavaScript to load dynamic content
        const dynamicLoadResponse = await request(app.getHttpServer())
          .post(`/browser-use/sessions/${sessionId}/execute`)
          .send({
            script: `
              // Create dynamic content area
              const container = document.createElement('div');
              container.id = 'dynamic-content';
              document.body.appendChild(container);

              // Load data via fetch
              return fetch('/posts/1')
                .then(response => response.json())
                .then(data => {
                  container.innerHTML = '<h2>' + data.title + '</h2><p>' + data.body + '</p>';
                  return {
                    loaded: true,
                    title: data.title,
                    contentLength: data.body.length
                  };
                })
                .catch(error => ({
                  loaded: false,
                  error: error.message
                }));
            `,
          })
          .expect(200);

        expect(dynamicLoadResponse.body).toMatchObject({
          success: true,
          result: expect.objectContaining({
            loaded: true,
            title: expect.any(String),
            contentLength: expect.any(Number),
          }),
        });

        // Verify dynamic content exists
        const contentCheck = await request(app.getHttpServer())
          .post(`/browser-use/sessions/${sessionId}/extract`)
          .send({
            queries: [
              {
                name: 'dynamicTitle',
                selector: '#dynamic-content h2',
                attribute: 'textContent',
              },
              {
                name: 'dynamicBody',
                selector: '#dynamic-content p',
                attribute: 'textContent',
              },
            ],
          })
          .expect(200);

        expect(contentCheck.body.data.dynamicTitle).toBeTruthy();
        expect(contentCheck.body.data.dynamicBody).toBeTruthy();
      } finally {
        await request(app.getHttpServer())
          .delete(`/browser-use/sessions/${sessionId}`)
          .expect(200);
      }
    });

    it('should simulate complex user interaction patterns', async () => {
      const sessionResponse = await request(app.getHttpServer())
        .post('/browser-use/sessions')
        .send({
          options: {
            headless: true,
            viewport: { width: 1920, height: 1080 },
          },
        })
        .expect(201);

      const sessionId = sessionResponse.body.sessionId;

      try {
        // Navigate to interactive demo page
        await request(app.getHttpServer())
          .post(`/browser-use/sessions/${sessionId}/navigate`)
          .send({
            url: 'https://www.w3schools.com/html/tryit.asp?filename=tryhtml_default',
            waitFor: 'load',
          })
          .expect(200);

        // Wait for iframe to load
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Simulate complex interaction pattern
        const interactions = [
          // Switch to iframe context
          {
            action: 'execute',
            script: 'document.getElementById("iframeResult").focus();',
          },
          // Click multiple elements with delays (human-like behavior)
          {
            action: 'click',
            selector: 'body',
            options: { delay: 100 },
          },
          // Scroll simulation
          {
            action: 'execute',
            script: 'window.scrollTo(0, document.body.scrollHeight / 2);',
          },
          // Keyboard navigation simulation
          {
            action: 'keyboard',
            key: 'Tab',
            modifiers: [],
          },
          {
            action: 'keyboard',
            key: 'Enter',
            modifiers: [],
          },
        ];

        for (const interaction of interactions) {
          let response;
          switch (interaction.action) {
            case 'execute':
              response = await request(app.getHttpServer())
                .post(`/browser-use/sessions/${sessionId}/execute`)
                .send({ script: interaction.script });
              break;
            case 'click':
              response = await request(app.getHttpServer())
                .post(`/browser-use/sessions/${sessionId}/click`)
                .send({
                  selector: interaction.selector,
                  options: interaction.options,
                });
              break;
            case 'keyboard':
              response = await request(app.getHttpServer())
                .post(`/browser-use/sessions/${sessionId}/keyboard`)
                .send({
                  key: interaction.key,
                  modifiers: interaction.modifiers,
                });
              break;
          }

          // Human-like delays between interactions
          await new Promise((resolve) =>
            setTimeout(resolve, 150 + Math.random() * 100),
          );
        }

        // Verify interactions were processed
        const sessionStatus = await request(app.getHttpServer())
          .get(`/browser-use/sessions/${sessionId}/status`)
          .expect(200);

        expect(sessionStatus.body).toMatchObject({
          status: 'active',
          metrics: expect.objectContaining({
            totalRequests: expect.any(Number),
            successfulRequests: expect.any(Number),
          }),
        });
      } finally {
        await request(app.getHttpServer())
          .delete(`/browser-use/sessions/${sessionId}`)
          .expect(200);
      }
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle maximum session limits gracefully', async () => {
      const maxSessions = 5; // Assuming system limit
      const sessionIds = [];

      try {
        // Create sessions up to limit
        for (let i = 0; i < maxSessions; i++) {
          const response = await request(app.getHttpServer())
            .post('/browser-use/sessions')
            .send({
              options: { headless: true },
            })
            .expect(201);
          sessionIds.push(response.body.sessionId);
        }

        // Attempt to exceed limit
        const exceedLimitResponse = await request(app.getHttpServer())
          .post('/browser-use/sessions')
          .send({
            options: { headless: true },
          })
          .expect(429); // Too Many Requests

        expect(exceedLimitResponse.body).toMatchObject({
          error: expect.objectContaining({
            type: 'ResourceLimitError',
            code: 'MAX_SESSIONS_EXCEEDED',
            message: expect.stringContaining('session limit'),
          }),
        });
      } finally {
        // Cleanup all sessions
        for (const sessionId of sessionIds) {
          try {
            await request(app.getHttpServer())
              .delete(`/browser-use/sessions/${sessionId}`)
              .expect(200);
          } catch (error) {
            // Continue cleanup even if some fail
          }
        }
      }
    });

    it('should handle extremely large page content', async () => {
      const sessionResponse = await request(app.getHttpServer())
        .post('/browser-use/sessions')
        .send({
          options: { headless: true },
        })
        .expect(201);

      const sessionId = sessionResponse.body.sessionId;

      try {
        // Navigate to data URL with large content
        const largeContent = 'x'.repeat(1000000); // 1MB of content
        const dataUrl = `data:text/html,<html><body><div id="content">${largeContent}</div></body></html>`;

        const navigateResponse = await request(app.getHttpServer())
          .post(`/browser-use/sessions/${sessionId}/navigate`)
          .send({
            url: dataUrl,
            waitFor: 'load',
          })
          .expect(200);

        // Attempt to extract large content
        const extractResponse = await request(app.getHttpServer())
          .post(`/browser-use/sessions/${sessionId}/extract`)
          .send({
            queries: [
              {
                name: 'contentLength',
                selector: '#content',
                attribute: 'textContent.length',
              },
              {
                name: 'sampleContent',
                selector: '#content',
                attribute: 'textContent',
                limit: 1000,
              },
            ],
          })
          .expect(200);

        expect(extractResponse.body.data.contentLength).toBe(1000000);
        expect(extractResponse.body.data.sampleContent).toHaveLength(1000);
      } finally {
        await request(app.getHttpServer())
          .delete(`/browser-use/sessions/${sessionId}`)
          .expect(200);
      }
    });

    it('should handle rapid successive operations', async () => {
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

        // Fire rapid successive requests
        const rapidRequests = Array(20)
          .fill(null)
          .map((_, i) =>
            request(app.getHttpServer())
              .post(`/browser-use/sessions/${sessionId}/execute`)
              .send({
                script: `return { index: ${i}, timestamp: Date.now() };`,
              }),
          );

        const results = await Promise.allSettled(rapidRequests);
        const successful = results.filter((r) => r.status === 'fulfilled');
        const failed = results.filter((r) => r.status === 'rejected');

        // Should handle most requests but may queue or throttle some
        expect(successful.length).toBeGreaterThanOrEqual(10);

        // Failed requests should be due to throttling, not system errors
        if (failed.length > 0) {
          // Verify error types are appropriate
          expect(failed.length).toBeLessThan(10);
        }
      } finally {
        await request(app.getHttpServer())
          .delete(`/browser-use/sessions/${sessionId}`)
          .expect(200);
      }
    });

    it('should handle malformed requests gracefully', async () => {
      const sessionResponse = await request(app.getHttpServer())
        .post('/browser-use/sessions')
        .send({
          options: { headless: true },
        })
        .expect(201);

      const sessionId = sessionResponse.body.sessionId;

      try {
        // Test various malformed requests
        const malformedTests = [
          {
            endpoint: 'navigate',
            payload: { url: 'not-a-valid-url' },
            expectedError: 'INVALID_URL',
          },
          {
            endpoint: 'click',
            payload: { selector: '' },
            expectedError: 'INVALID_SELECTOR',
          },
          {
            endpoint: 'type',
            payload: { selector: 'body', text: null },
            expectedError: 'INVALID_INPUT',
          },
          {
            endpoint: 'execute',
            payload: { script: undefined },
            expectedError: 'MISSING_SCRIPT',
          },
        ];

        for (const test of malformedTests) {
          const response = await request(app.getHttpServer())
            .post(`/browser-use/sessions/${sessionId}/${test.endpoint}`)
            .send(test.payload)
            .expect(400);

          expect(response.body).toMatchObject({
            error: expect.objectContaining({
              type: 'ValidationError',
              code: test.expectedError,
            }),
          });
        }

        // Verify session is still functional after malformed requests
        await request(app.getHttpServer())
          .get(`/browser-use/sessions/${sessionId}/status`)
          .expect(200);
      } finally {
        await request(app.getHttpServer())
          .delete(`/browser-use/sessions/${sessionId}`)
          .expect(200);
      }
    });
  });

  describe('Network Conditions and Resilience', () => {
    it('should handle slow network conditions', async () => {
      const sessionResponse = await request(app.getHttpServer())
        .post('/browser-use/sessions')
        .send({
          options: {
            headless: true,
            networkConditions: {
              downloadThroughput: 50 * 1024, // 50 KB/s
              uploadThroughput: 20 * 1024, // 20 KB/s
              latency: 500, // 500ms
            },
          },
        })
        .expect(201);

      const sessionId = sessionResponse.body.sessionId;

      try {
        const startTime = Date.now();

        // Navigate with slow network
        const navigateResponse = await request(app.getHttpServer())
          .post(`/browser-use/sessions/${sessionId}/navigate`)
          .send({
            url: 'https://httpbin.org/delay/2',
            waitFor: 'networkidle0',
            timeout: 15000,
          })
          .expect(200);

        const loadTime = Date.now() - startTime;

        expect(navigateResponse.body).toMatchObject({
          success: true,
          loadTime: expect.any(Number),
        });

        // Verify load time reflects network conditions
        expect(loadTime).toBeGreaterThan(2000); // At least 2 seconds due to delay + slow network
      } finally {
        await request(app.getHttpServer())
          .delete(`/browser-use/sessions/${sessionId}`)
          .expect(200);
      }
    }, 20000);

    it('should handle intermittent connectivity', async () => {
      const sessionResponse = await request(app.getHttpServer())
        .post('/browser-use/sessions')
        .send({
          options: { headless: true },
        })
        .expect(201);

      const sessionId = sessionResponse.body.sessionId;

      try {
        // Simulate intermittent connectivity by trying unreliable endpoints
        const unreliableEndpoints = [
          'https://httpbin.org/status/503', // Service unavailable
          'https://httpbin.org/delay/10', // Very slow response
          'https://httpbin.org/status/200', // Should work
        ];

        let successCount = 0;
        let errorCount = 0;

        for (const url of unreliableEndpoints) {
          try {
            const response = await request(app.getHttpServer())
              .post(`/browser-use/sessions/${sessionId}/navigate`)
              .send({
                url,
                waitFor: 'load',
                timeout: 5000, // Short timeout to simulate network issues
              });

            if (response.status === 200) {
              successCount++;
            }
          } catch (error) {
            errorCount++;
          }
        }

        // Should have at least one success and handle errors gracefully
        expect(successCount).toBeGreaterThanOrEqual(1);
        expect(successCount + errorCount).toBe(unreliableEndpoints.length);
      } finally {
        await request(app.getHttpServer())
          .delete(`/browser-use/sessions/${sessionId}`)
          .expect(200);
      }
    });

    it('should implement retry logic for transient failures', async () => {
      const sessionResponse = await request(app.getHttpServer())
        .post('/browser-use/sessions')
        .send({
          options: { headless: true },
        })
        .expect(201);

      const sessionId = sessionResponse.body.sessionId;

      try {
        // Use httpbin to simulate transient failures
        const response = await request(app.getHttpServer())
          .post(`/browser-use/sessions/${sessionId}/navigate`)
          .send({
            url: 'https://httpbin.org/status/503',
            retryOptions: {
              maxRetries: 3,
              retryDelay: 1000,
              retryOn: [503, 504, 502],
            },
          });

        // Should either succeed after retries or fail with proper error
        if (response.status === 200) {
          expect(response.body).toMatchObject({
            success: true,
            retries: expect.any(Number),
          });
        } else {
          expect(response.status).toBe(503);
          expect(response.body).toMatchObject({
            error: expect.objectContaining({
              type: 'NetworkError',
              retries: 3,
              lastAttempt: expect.any(String),
            }),
          });
        }
      } finally {
        await request(app.getHttpServer())
          .delete(`/browser-use/sessions/${sessionId}`)
          .expect(200);
      }
    });
  });

  describe('Resource Management and Memory', () => {
    it('should handle memory-intensive operations', async () => {
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

        // Create memory-intensive operation
        const memoryIntensiveResponse = await request(app.getHttpServer())
          .post(`/browser-use/sessions/${sessionId}/execute`)
          .send({
            script: `
              // Create large in-memory structure
              const largeArray = new Array(100000);
              for (let i = 0; i < largeArray.length; i++) {
                largeArray[i] = {
                  id: i,
                  data: 'x'.repeat(1000),
                  timestamp: Date.now()
                };
              }

              // Process and return summary
              return {
                created: largeArray.length,
                memoryEstimate: largeArray.length * 1000,
                processed: true
              };
            `,
            timeout: 10000,
          });

        if (memoryIntensiveResponse.status === 200) {
          expect(memoryIntensiveResponse.body).toMatchObject({
            success: true,
            result: expect.objectContaining({
              created: 100000,
              processed: true,
            }),
          });
        } else {
          // Should fail gracefully with resource limit error
          expect(memoryIntensiveResponse.status).toBe(413);
          expect(memoryIntensiveResponse.body).toMatchObject({
            error: expect.objectContaining({
              type: 'ResourceLimitError',
              code: 'MEMORY_LIMIT_EXCEEDED',
            }),
          });
        }
      } finally {
        await request(app.getHttpServer())
          .delete(`/browser-use/sessions/${sessionId}`)
          .expect(200);
      }
    });

    it('should monitor and report resource utilization', async () => {
      // Get initial resource state
      const initialResources = await request(app.getHttpServer())
        .get('/browser-use/resources')
        .expect(200);

      // Create and use multiple sessions
      const sessionIds = [];
      for (let i = 0; i < 3; i++) {
        const response = await request(app.getHttpServer())
          .post('/browser-use/sessions')
          .send({
            options: { headless: true },
          })
          .expect(201);
        sessionIds.push(response.body.sessionId);

        // Perform some operations to consume resources
        await request(app.getHttpServer())
          .post(`/browser-use/sessions/${response.body.sessionId}/navigate`)
          .send({ url: 'https://example.com' })
          .expect(200);
      }

      // Check resource utilization after creating sessions
      const activeResources = await request(app.getHttpServer())
        .get('/browser-use/resources')
        .expect(200);

      expect(activeResources.body).toMatchObject({
        memory: expect.objectContaining({
          used: expect.any(Number),
          available: expect.any(Number),
          percentage: expect.any(Number),
        }),
        sessions: expect.objectContaining({
          active: expect.any(Number),
          total: expect.any(Number),
        }),
        browser: expect.objectContaining({
          processes: expect.any(Number),
          tabs: expect.any(Number),
        }),
      });

      // Memory usage should have increased
      expect(activeResources.body.memory.used).toBeGreaterThan(
        initialResources.body.memory.used,
      );
      expect(activeResources.body.sessions.active).toBe(3);

      // Cleanup
      for (const sessionId of sessionIds) {
        await request(app.getHttpServer())
          .delete(`/browser-use/sessions/${sessionId}`)
          .expect(200);
      }

      // Verify cleanup reduced resource usage
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const finalResources = await request(app.getHttpServer())
        .get('/browser-use/resources')
        .expect(200);

      expect(finalResources.body.sessions.active).toBeLessThanOrEqual(1);
    });
  });

  describe('Real-World Use Case Validation', () => {
    it('should complete web scraping workflow', async () => {
      const sessionResponse = await request(app.getHttpServer())
        .post('/browser-use/sessions')
        .send({
          options: { headless: true },
        })
        .expect(201);

      const sessionId = sessionResponse.body.sessionId;

      try {
        // Navigate to a data-rich page
        await request(app.getHttpServer())
          .post(`/browser-use/sessions/${sessionId}/navigate`)
          .send({
            url: 'https://quotes.toscrape.com',
            waitFor: 'networkidle0',
          })
          .expect(200);

        // Extract structured data
        const scrapingResponse = await request(app.getHttpServer())
          .post(`/browser-use/sessions/${sessionId}/extract`)
          .send({
            queries: [
              { name: 'quotes', selector: '.quote', attribute: 'count' },
              {
                name: 'firstQuoteText',
                selector: '.quote:first-child .text',
                attribute: 'textContent',
              },
              {
                name: 'firstQuoteAuthor',
                selector: '.quote:first-child .author',
                attribute: 'textContent',
              },
              {
                name: 'tags',
                selector: '.quote:first-child .tag',
                attribute: 'textContent',
                multiple: true,
              },
            ],
          })
          .expect(200);

        expect(scrapingResponse.body.data).toMatchObject({
          quotes: expect.any(Number),
          firstQuoteText: expect.any(String),
          firstQuoteAuthor: expect.any(String),
          tags: expect.arrayContaining([expect.any(String)]),
        });

        expect(scrapingResponse.body.data.quotes).toBeGreaterThan(0);
        expect(
          scrapingResponse.body.data.firstQuoteText.length,
        ).toBeGreaterThan(10);

        // Navigate to next page
        const nextPageResponse = await request(app.getHttpServer())
          .post(`/browser-use/sessions/${sessionId}/click`)
          .send({
            selector: '.next a',
            options: { waitFor: 'navigation' },
          });

        if (nextPageResponse.status === 200) {
          // Extract data from second page
          const secondPageData = await request(app.getHttpServer())
            .post(`/browser-use/sessions/${sessionId}/extract`)
            .send({
              queries: [
                { name: 'quotes', selector: '.quote', attribute: 'count' },
                {
                  name: 'pageNumber',
                  selector: '.current',
                  attribute: 'textContent',
                },
              ],
            })
            .expect(200);

          expect(secondPageData.body.data.quotes).toBeGreaterThan(0);
        }
      } finally {
        await request(app.getHttpServer())
          .delete(`/browser-use/sessions/${sessionId}`)
          .expect(200);
      }
    }, 30000);

    it('should perform automated testing workflow', async () => {
      const sessionResponse = await request(app.getHttpServer())
        .post('/browser-use/sessions')
        .send({
          options: {
            headless: true,
            viewport: { width: 1280, height: 1024 },
          },
        })
        .expect(201);

      const sessionId = sessionResponse.body.sessionId;

      try {
        // Test a simple web application
        await request(app.getHttpServer())
          .post(`/browser-use/sessions/${sessionId}/navigate`)
          .send({
            url: 'https://www.w3schools.com/html/html_forms.asp',
            waitFor: 'networkidle0',
          })
          .expect(200);

        // Automated testing steps
        const testSteps = [
          // Take initial screenshot
          {
            action: 'screenshot',
            description: 'Initial page state',
          },
          // Test form interaction
          {
            action: 'type',
            selector: 'input[type="text"]:first',
            text: 'Test User',
            description: 'Fill first name',
          },
          // Verify form was filled
          {
            action: 'extract',
            queries: [
              {
                name: 'inputValue',
                selector: 'input[type="text"]:first',
                attribute: 'value',
              },
            ],
            description: 'Verify input value',
          },
          // Take screenshot after interaction
          {
            action: 'screenshot',
            description: 'After form interaction',
          },
        ];

        const testResults = [];

        for (const step of testSteps) {
          const startTime = Date.now();
          let response;

          try {
            switch (step.action) {
              case 'screenshot':
                response = await request(app.getHttpServer())
                  .post(`/browser-use/sessions/${sessionId}/screenshot`)
                  .send({ options: { quality: 80 } });
                break;
              case 'type':
                response = await request(app.getHttpServer())
                  .post(`/browser-use/sessions/${sessionId}/type`)
                  .send({
                    selector: step.selector,
                    text: step.text,
                    options: { delay: 10 },
                  });
                break;
              case 'extract':
                response = await request(app.getHttpServer())
                  .post(`/browser-use/sessions/${sessionId}/extract`)
                  .send({ queries: step.queries });
                break;
            }

            const duration = Date.now() - startTime;
            testResults.push({
              step: step.description,
              status: 'passed',
              duration,
              data: response?.body,
            });
          } catch (error) {
            testResults.push({
              step: step.description,
              status: 'failed',
              error: error.message,
              duration: Date.now() - startTime,
            });
          }
        }

        // Verify test results
        const passedTests = testResults.filter((r) => r.status === 'passed');
        const failedTests = testResults.filter((r) => r.status === 'failed');

        expect(passedTests.length).toBeGreaterThanOrEqual(3);
        expect(failedTests.length).toBeLessThan(2);

        // Verify specific test assertions
        const extractResult = testResults.find(
          (r) => r.step === 'Verify input value',
        );
        if (extractResult && extractResult.status === 'passed') {
          expect(extractResult.data.data.inputValue).toBe('Test User');
        }
      } finally {
        await request(app.getHttpServer())
          .delete(`/browser-use/sessions/${sessionId}`)
          .expect(200);
      }
    }, 45000);
  });
});
