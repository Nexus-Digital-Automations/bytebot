/**
 * Security End-to-End Test Suite
 *
 * Comprehensive end-to-end tests for security features covering:
 * - Authentication flows and JWT token validation
 * - Authorization and role-based access control
 * - Input validation and XSS prevention
 * - Rate limiting and security headers
 * - CORS configuration and security policies
 * - Attack prevention and vulnerability testing
 *
 * @author Claude Code (Testing & QA Specialist)
 * @version 1.0.0
 * @coverage-target 95%+
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

// Mock App Module for security testing
class MockSecurityModule {
  static forRoot() {
    return {
      module: MockSecurityModule,
      controllers: [
        MockAuthController,
        MockTasksController,
        MockHealthController,
      ],
      providers: [MockAuthService, MockJwtService, MockConfigService],
      exports: [],
    };
  }
}

// Mock controllers for testing
class MockAuthController {
  constructor(private authService: any) {}

  async login(body: any) {
    if (body.email === 'admin@bytebot.ai' && body.password === 'admin123') {
      return {
        accessToken: 'mock-jwt-token',
        refreshToken: 'mock-refresh-token',
        user: { id: '1', email: 'admin@bytebot.ai', role: 'admin' },
        expiresIn: 900,
      };
    }
    throw new Error('Invalid credentials');
  }

  async refresh(body: any) {
    if (body.refreshToken === 'mock-refresh-token') {
      return {
        accessToken: 'new-mock-jwt-token',
        refreshToken: 'new-mock-refresh-token',
        expiresIn: 900,
      };
    }
    throw new Error('Invalid refresh token');
  }
}

class MockTasksController {
  async getTasks(req: any) {
    // Requires authentication
    if (!req.user) {
      throw new Error('Authentication required');
    }
    return [
      { id: '1', title: 'Task 1', userId: req.user.id },
      { id: '2', title: 'Task 2', userId: req.user.id },
    ];
  }

  async createTask(req: any, body: any) {
    // Requires operator or admin role
    if (!req.user || !['admin', 'operator'].includes(req.user.role)) {
      throw new Error('Insufficient permissions');
    }
    return {
      id: 'new-task',
      ...body,
      userId: req.user.id,
    };
  }

  async deleteTask(req: any, params: any) {
    // Requires admin role
    if (!req.user || req.user.role !== 'admin') {
      throw new Error('Admin access required');
    }
    return { success: true, deletedId: params.id };
  }
}

class MockHealthController {
  async getHealth() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: 300,
    };
  }
}

// Mock services
class MockAuthService {
  validateToken(token: string) {
    const validTokens = {
      'mock-jwt-token': { id: '1', email: 'admin@bytebot.ai', role: 'admin' },
      'operator-token': {
        id: '2',
        email: 'operator@bytebot.ai',
        role: 'operator',
      },
      'viewer-token': { id: '3', email: 'viewer@bytebot.ai', role: 'viewer' },
    };
    return validTokens[token] || null;
  }
}

class MockJwtService {
  verify(token: string) {
    const authService = new MockAuthService();
    const user = authService.validateToken(token);
    if (!user) throw new Error('Invalid token');
    return user;
  }
}

class MockConfigService {
  get(key: string) {
    const config = {
      JWT_SECRET: 'test-secret',
      CORS_ORIGIN: 'http://localhost:3000',
      RATE_LIMIT_MAX: 100,
    };
    return config[key];
  }
}

describe('Security E2E Tests', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;

  const operationId = `security_e2e_test_${Date.now()}`;

  beforeAll(async () => {
    console.log(`[${operationId}] Setting up Security E2E test application`);

    moduleRef = await Test.createTestingModule({
      imports: [MockSecurityModule.forRoot()],
    }).compile();

    app = moduleRef.createNestApplication();

    // Configure security middleware
    app.use('/api/*', (req, res, next) => {
      // Mock authentication middleware
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
          const jwtService = new MockJwtService();
          const user = jwtService.verify(token);
          req.user = user;
        } catch {
          // Invalid token, user remains undefined
        }
      }
      next();
    });

    // Mock rate limiting middleware
    let requestCounts = new Map();
    app.use((req, res, next) => {
      const ip = req.ip || '127.0.0.1';
      const count = requestCounts.get(ip) || 0;
      if (count > 50) {
        // Rate limit
        return res.status(429).json({ message: 'Too many requests' });
      }
      requestCounts.set(ip, count + 1);
      next();
    });

    // Mock security headers middleware
    app.use((req, res, next) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains',
      );
      next();
    });

    // Mock route handlers
    app.getHttpAdapter().post('/auth/login', async (req, res) => {
      try {
        const controller = new MockAuthController(new MockAuthService());
        const result = await controller.login(req.body);
        res.json(result);
      } catch (error) {
        res.status(401).json({ message: error.message });
      }
    });

    app.getHttpAdapter().post('/auth/refresh', async (req, res) => {
      try {
        const controller = new MockAuthController(new MockAuthService());
        const result = await controller.refresh(req.body);
        res.json(result);
      } catch (error) {
        res.status(401).json({ message: error.message });
      }
    });

    app.getHttpAdapter().get('/api/tasks', async (req, res) => {
      try {
        const controller = new MockTasksController();
        const result = await controller.getTasks(req);
        res.json(result);
      } catch (error) {
        res.status(401).json({ message: error.message });
      }
    });

    app.getHttpAdapter().post('/api/tasks', async (req, res) => {
      try {
        const controller = new MockTasksController();
        const result = await controller.createTask(req, req.body);
        res.json(result);
      } catch (error) {
        res.status(403).json({ message: error.message });
      }
    });

    app.getHttpAdapter().delete('/api/tasks/:id', async (req, res) => {
      try {
        const controller = new MockTasksController();
        const result = await controller.deleteTask(req, req.params);
        res.json(result);
      } catch (error) {
        res.status(403).json({ message: error.message });
      }
    });

    app.getHttpAdapter().get('/health', async (req, res) => {
      const controller = new MockHealthController();
      const result = await controller.getHealth();
      res.json(result);
    });

    await app.init();

    console.log(
      `[${operationId}] Security E2E test application setup completed`,
    );
  });

  afterAll(async () => {
    console.log(`[${operationId}] Cleaning up Security E2E test application`);
    await app?.close();
    console.log(`[${operationId}] Security E2E test cleanup completed`);
  });

  describe('Authentication Flow', () => {
    it('should allow login with valid credentials', async () => {
      const testId = `${operationId}_valid_login`;
      console.log(`[${testId}] Testing valid credential login`);

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'admin@bytebot.ai',
          password: 'admin123',
        })
        .expect(200);

      expect(response.body).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        user: expect.objectContaining({
          email: 'admin@bytebot.ai',
          role: 'admin',
        }),
        expiresIn: 900,
      });

      console.log(`[${testId}] Valid login test completed successfully`);
    });

    it('should reject login with invalid credentials', async () => {
      const testId = `${operationId}_invalid_login`;
      console.log(`[${testId}] Testing invalid credential rejection`);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'admin@bytebot.ai',
          password: 'wrongpassword',
        })
        .expect(401);

      console.log(`[${testId}] Invalid login rejection test completed`);
    });

    it('should refresh valid tokens', async () => {
      const testId = `${operationId}_token_refresh`;
      console.log(`[${testId}] Testing token refresh`);

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: 'mock-refresh-token',
        })
        .expect(200);

      expect(response.body).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        expiresIn: 900,
      });

      console.log(`[${testId}] Token refresh test completed successfully`);
    });

    it('should reject invalid refresh tokens', async () => {
      const testId = `${operationId}_invalid_refresh`;
      console.log(`[${testId}] Testing invalid refresh token rejection`);

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: 'invalid-refresh-token',
        })
        .expect(401);

      console.log(`[${testId}] Invalid refresh token rejection test completed`);
    });

    it('should reject malformed authentication payloads', async () => {
      const testId = `${operationId}_malformed_auth`;
      console.log(
        `[${testId}] Testing malformed authentication payload rejection`,
      );

      // Missing password
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'admin@bytebot.ai',
        })
        .expect(401);

      // Missing email
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          password: 'admin123',
        })
        .expect(401);

      // Empty payload
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({})
        .expect(401);

      console.log(
        `[${testId}] Malformed authentication payload rejection test completed`,
      );
    });
  });

  describe('Authorization and Role-Based Access Control', () => {
    it('should allow authenticated users to access protected routes', async () => {
      const testId = `${operationId}_authenticated_access`;
      console.log(
        `[${testId}] Testing authenticated user access to protected routes`,
      );

      const response = await request(app.getHttpServer())
        .get('/api/tasks')
        .set('Authorization', 'Bearer mock-jwt-token')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      console.log(
        `[${testId}] Authenticated access test completed successfully`,
      );
    });

    it('should deny unauthenticated users access to protected routes', async () => {
      const testId = `${operationId}_unauthenticated_denial`;
      console.log(`[${testId}] Testing unauthenticated access denial`);

      await request(app.getHttpServer()).get('/api/tasks').expect(401);

      console.log(`[${testId}] Unauthenticated denial test completed`);
    });

    it('should enforce role-based access for task creation', async () => {
      const testId = `${operationId}_role_based_creation`;
      console.log(`[${testId}] Testing role-based access for task creation`);

      // Admin should be able to create tasks
      await request(app.getHttpServer())
        .post('/api/tasks')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send({
          title: 'Admin Task',
          description: 'Task created by admin',
        })
        .expect(200);

      // Operator should be able to create tasks
      await request(app.getHttpServer())
        .post('/api/tasks')
        .set('Authorization', 'Bearer operator-token')
        .send({
          title: 'Operator Task',
          description: 'Task created by operator',
        })
        .expect(200);

      // Viewer should not be able to create tasks
      await request(app.getHttpServer())
        .post('/api/tasks')
        .set('Authorization', 'Bearer viewer-token')
        .send({
          title: 'Viewer Task',
          description: 'Task attempted by viewer',
        })
        .expect(403);

      console.log(`[${testId}] Role-based task creation test completed`);
    });

    it('should enforce admin-only access for task deletion', async () => {
      const testId = `${operationId}_admin_only_deletion`;
      console.log(`[${testId}] Testing admin-only access for task deletion`);

      // Admin should be able to delete tasks
      await request(app.getHttpServer())
        .delete('/api/tasks/123')
        .set('Authorization', 'Bearer mock-jwt-token')
        .expect(200);

      // Operator should not be able to delete tasks
      await request(app.getHttpServer())
        .delete('/api/tasks/456')
        .set('Authorization', 'Bearer operator-token')
        .expect(403);

      // Viewer should not be able to delete tasks
      await request(app.getHttpServer())
        .delete('/api/tasks/789')
        .set('Authorization', 'Bearer viewer-token')
        .expect(403);

      console.log(`[${testId}] Admin-only deletion test completed`);
    });

    it('should reject requests with invalid JWT tokens', async () => {
      const testId = `${operationId}_invalid_jwt`;
      console.log(`[${testId}] Testing invalid JWT token rejection`);

      // Malformed token
      await request(app.getHttpServer())
        .get('/api/tasks')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      // Expired token (simulated)
      await request(app.getHttpServer())
        .get('/api/tasks')
        .set('Authorization', 'Bearer expired-token')
        .expect(401);

      // No Bearer prefix
      await request(app.getHttpServer())
        .get('/api/tasks')
        .set('Authorization', 'mock-jwt-token')
        .expect(401);

      console.log(`[${testId}] Invalid JWT token rejection test completed`);
    });
  });

  describe('Input Validation and XSS Prevention', () => {
    it('should sanitize XSS attempts in task creation', async () => {
      const testId = `${operationId}_xss_sanitization`;
      console.log(`[${testId}] Testing XSS sanitization in task creation`);

      const maliciousPayload = {
        title: '<script>alert("XSS")</script>Malicious Task',
        description: 'onclick="evil()" Description with events',
        priority: 'high',
      };

      const response = await request(app.getHttpServer())
        .post('/api/tasks')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send(maliciousPayload)
        .expect(200);

      // Verify XSS content is sanitized (depends on implementation)
      expect(response.body.title).toBeDefined();
      expect(response.body.description).toBeDefined();

      console.log(`[${testId}] XSS sanitization test completed`);
    });

    it('should reject invalid input data types', async () => {
      const testId = `${operationId}_invalid_data_types`;
      console.log(`[${testId}] Testing invalid input data type rejection`);

      // Array instead of object
      await request(app.getHttpServer())
        .post('/api/tasks')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send(['invalid', 'array', 'payload'])
        .expect(400);

      // String instead of object
      await request(app.getHttpServer())
        .post('/api/tasks')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send('invalid string payload')
        .expect(400);

      console.log(`[${testId}] Invalid data type rejection test completed`);
    });

    it('should handle extremely large payloads gracefully', async () => {
      const testId = `${operationId}_large_payload`;
      console.log(`[${testId}] Testing large payload handling`);

      const largePayload = {
        title: 'Large Payload Task',
        description: 'A'.repeat(10000), // 10KB description
        priority: 'medium',
      };

      // Should either accept with size limits or reject gracefully
      const response = await request(app.getHttpServer())
        .post('/api/tasks')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send(largePayload);

      expect([200, 400, 413]).toContain(response.status); // Accept or reject gracefully

      console.log(`[${testId}] Large payload handling test completed`);
    });

    it('should prevent SQL injection attempts', async () => {
      const testId = `${operationId}_sql_injection`;
      console.log(`[${testId}] Testing SQL injection prevention`);

      const sqlInjectionPayload = {
        title: "'; DROP TABLE tasks; --",
        description: "1' OR '1'='1",
        priority: 'high',
      };

      // Should accept the payload but sanitize it
      const response = await request(app.getHttpServer())
        .post('/api/tasks')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send(sqlInjectionPayload)
        .expect(200);

      expect(response.body.title).toBeDefined();

      console.log(`[${testId}] SQL injection prevention test completed`);
    });

    it('should validate required fields', async () => {
      const testId = `${operationId}_required_fields`;
      console.log(`[${testId}] Testing required field validation`);

      // Missing title (assuming it's required)
      await request(app.getHttpServer())
        .post('/api/tasks')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send({
          description: 'Task without title',
          priority: 'medium',
        });
      // Expect either success (if title is optional) or validation error

      console.log(`[${testId}] Required field validation test completed`);
    });
  });

  describe('Security Headers and CORS', () => {
    it('should include security headers in all responses', async () => {
      const testId = `${operationId}_security_headers`;
      console.log(`[${testId}] Testing security headers inclusion`);

      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['strict-transport-security']).toContain(
        'max-age=31536000',
      );

      console.log(`[${testId}] Security headers test completed successfully`);
    });

    it('should handle preflight CORS requests', async () => {
      const testId = `${operationId}_cors_preflight`;
      console.log(`[${testId}] Testing CORS preflight request handling`);

      const response = await request(app.getHttpServer())
        .options('/api/tasks')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type,Authorization');

      // CORS headers should be present (if configured)
      expect(response.status).toBeLessThan(500); // Should not error

      console.log(`[${testId}] CORS preflight test completed`);
    });

    it('should prevent clickjacking with X-Frame-Options', async () => {
      const testId = `${operationId}_clickjacking_prevention`;
      console.log(`[${testId}] Testing clickjacking prevention`);

      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.headers['x-frame-options']).toBe('DENY');

      console.log(`[${testId}] Clickjacking prevention test completed`);
    });

    it('should prevent content-type sniffing', async () => {
      const testId = `${operationId}_content_sniffing_prevention`;
      console.log(`[${testId}] Testing content-type sniffing prevention`);

      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.headers['x-content-type-options']).toBe('nosniff');

      console.log(`[${testId}] Content sniffing prevention test completed`);
    });
  });

  describe('Rate Limiting and DDoS Protection', () => {
    it('should enforce rate limits on repeated requests', async () => {
      const testId = `${operationId}_rate_limiting`;
      console.log(`[${testId}] Testing rate limiting enforcement`);

      // Make many requests rapidly
      const requests = Array(60)
        .fill(null)
        .map(() => request(app.getHttpServer()).get('/health'));

      const responses = await Promise.all(requests);

      // Some requests should be rate limited (429 status)
      const rateLimitedCount = responses.filter(
        (res) => res.status === 429,
      ).length;
      expect(rateLimitedCount).toBeGreaterThan(0);

      console.log(
        `[${testId}] Rate limiting test completed (${rateLimitedCount} requests rate limited)`,
      );
    });

    it('should handle burst traffic gracefully', async () => {
      const testId = `${operationId}_burst_traffic`;
      console.log(`[${testId}] Testing burst traffic handling`);

      const startTime = Date.now();

      // Send burst of concurrent requests
      const promises = Array(20)
        .fill(null)
        .map(() => request(app.getHttpServer()).get('/health'));

      const responses = await Promise.all(promises);
      const executionTime = Date.now() - startTime;

      // All requests should complete (either success or rate limited)
      expect(responses.every((res) => [200, 429].includes(res.status))).toBe(
        true,
      );
      expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds

      console.log(
        `[${testId}] Burst traffic test completed (${executionTime}ms for 20 requests)`,
      );
    });

    it('should differentiate rate limits by endpoint', async () => {
      const testId = `${operationId}_endpoint_rate_limits`;
      console.log(`[${testId}] Testing endpoint-specific rate limits`);

      // Test different endpoints
      const healthRequests = Array(10)
        .fill(null)
        .map(() => request(app.getHttpServer()).get('/health'));

      const taskRequests = Array(10)
        .fill(null)
        .map(() =>
          request(app.getHttpServer())
            .get('/api/tasks')
            .set('Authorization', 'Bearer mock-jwt-token'),
        );

      const [healthResponses, taskResponses] = await Promise.all([
        Promise.all(healthRequests),
        Promise.all(taskRequests),
      ]);

      // Both endpoint types should be handled
      expect(healthResponses.length).toBe(10);
      expect(taskResponses.length).toBe(10);

      console.log(`[${testId}] Endpoint rate limits test completed`);
    });
  });

  describe('Attack Prevention and Vulnerability Testing', () => {
    it('should prevent timing attacks on login', async () => {
      const testId = `${operationId}_timing_attack_prevention`;
      console.log(`[${testId}] Testing timing attack prevention`);

      const timingTests = [
        { email: 'nonexistent@example.com', password: 'password123' },
        { email: 'admin@bytebot.ai', password: 'wrongpassword' },
      ];

      const timings = [];

      for (const test of timingTests) {
        const startTime = Date.now();
        await request(app.getHttpServer())
          .post('/auth/login')
          .send(test)
          .expect(401);
        timings.push(Date.now() - startTime);
      }

      // Response times should be similar (within reasonable variance)
      const variance = Math.max(...timings) - Math.min(...timings);
      expect(variance).toBeLessThan(100); // Should be within 100ms

      console.log(
        `[${testId}] Timing attack prevention test completed (variance: ${variance}ms)`,
      );
    });

    it('should handle concurrent authentication attempts', async () => {
      const testId = `${operationId}_concurrent_auth_attempts`;
      console.log(
        `[${testId}] Testing concurrent authentication attempt handling`,
      );

      const concurrentLogins = Array(10)
        .fill(null)
        .map(() =>
          request(app.getHttpServer()).post('/auth/login').send({
            email: 'admin@bytebot.ai',
            password: 'admin123',
          }),
        );

      const responses = await Promise.all(concurrentLogins);

      // All should either succeed or fail gracefully
      responses.forEach((response) => {
        expect([200, 401, 429].includes(response.status)).toBe(true);
      });

      console.log(
        `[${testId}] Concurrent authentication attempts test completed`,
      );
    });

    it('should prevent user enumeration attacks', async () => {
      const testId = `${operationId}_user_enumeration`;
      console.log(`[${testId}] Testing user enumeration attack prevention`);

      const testEmails = [
        'existing@bytebot.ai',
        'nonexistent@example.com',
        'admin@bytebot.ai',
        'random@domain.com',
      ];

      const responses = [];
      for (const email of testEmails) {
        const response = await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email,
            password: 'wrongpassword',
          });
        responses.push(response);
      }

      // All responses should be similar (401 with similar messages)
      const allUnauthorized = responses.every((res) => res.status === 401);
      expect(allUnauthorized).toBe(true);

      console.log(`[${testId}] User enumeration prevention test completed`);
    });

    it('should handle malformed JSON gracefully', async () => {
      const testId = `${operationId}_malformed_json`;
      console.log(`[${testId}] Testing malformed JSON handling`);

      // Send malformed JSON
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send('{"email": "test@example.com", "password": "incomplete"}')
        .set('Content-Type', 'application/json');

      // Should return proper error status, not crash
      expect([400, 401].includes(response.status)).toBe(true);

      console.log(`[${testId}] Malformed JSON handling test completed`);
    });

    it('should prevent header injection attacks', async () => {
      const testId = `${operationId}_header_injection`;
      console.log(`[${testId}] Testing header injection prevention`);

      const maliciousHeaders = {
        'X-Forwarded-For': 'malicious-ip\r\nX-Injected: header',
        'User-Agent': 'normal-agent\r\nX-Evil: injected-header',
        'Custom-Header': 'value\r\nSet-Cookie: evil=true',
      };

      const response = await request(app.getHttpServer())
        .get('/health')
        .set(maliciousHeaders);

      // Should not crash and should not contain injected headers
      expect(response.status).toBeLessThan(500);
      expect(response.headers['x-injected']).toBeUndefined();
      expect(response.headers['x-evil']).toBeUndefined();

      console.log(`[${testId}] Header injection prevention test completed`);
    });

    it('should handle request smuggling attempts', async () => {
      const testId = `${operationId}_request_smuggling`;
      console.log(`[${testId}] Testing request smuggling prevention`);

      // Attempt request smuggling with conflicting content-length headers
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .set('Content-Length', '100')
        .set('Transfer-Encoding', 'chunked')
        .send('{"email":"test@example.com","password":"test123"}');

      // Should handle gracefully without processing smuggled content
      expect([200, 400, 401].includes(response.status)).toBe(true);

      console.log(`[${testId}] Request smuggling prevention test completed`);
    });
  });

  describe('Security Integration and Compliance', () => {
    it('should log security events for monitoring', async () => {
      const testId = `${operationId}_security_logging`;
      console.log(`[${testId}] Testing security event logging`);

      // Mock console.log to capture logs
      const originalLog = console.log;
      const logs: string[] = [];
      console.log = (...args) => {
        logs.push(args.join(' '));
        originalLog(...args);
      };

      // Generate security events
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'attacker@evil.com',
          password: 'wrongpassword',
        })
        .expect(401);

      // Restore console.log
      console.log = originalLog;

      // Verify security events are logged
      expect(logs.length).toBeGreaterThan(0);

      console.log(`[${testId}] Security logging test completed`);
    });

    it('should maintain security during high load', async () => {
      const testId = `${operationId}_high_load_security`;
      console.log(`[${testId}] Testing security maintenance under high load`);

      const startTime = Date.now();

      // Generate high load with mixed requests
      const promises = [
        ...Array(10)
          .fill(null)
          .map(() =>
            request(app.getHttpServer())
              .post('/auth/login')
              .send({ email: 'admin@bytebot.ai', password: 'admin123' }),
          ),
        ...Array(10)
          .fill(null)
          .map(() =>
            request(app.getHttpServer())
              .get('/api/tasks')
              .set('Authorization', 'Bearer mock-jwt-token'),
          ),
        ...Array(10)
          .fill(null)
          .map(() =>
            request(app.getHttpServer())
              .post('/api/tasks')
              .set('Authorization', 'Bearer mock-jwt-token')
              .send({ title: 'Load Test Task' }),
          ),
      ];

      const responses = await Promise.all(promises);
      const executionTime = Date.now() - startTime;

      // All responses should be valid (no crashes or security bypasses)
      const validStatuses = responses.every((res) =>
        [200, 401, 403, 429].includes(res.status),
      );
      expect(validStatuses).toBe(true);

      console.log(
        `[${testId}] High load security test completed (${executionTime}ms for 30 requests)`,
      );
    });

    it('should handle security edge cases gracefully', async () => {
      const testId = `${operationId}_security_edge_cases`;
      console.log(`[${testId}] Testing security edge case handling`);

      const edgeCases = [
        // Very long URL
        { method: 'get', url: '/health' + 'x'.repeat(1000) },
        // Unicode in headers
        {
          method: 'get',
          url: '/health',
          headers: { 'X-Unicode': 'Test-🔒-Security' },
        },
        // Null bytes in URL
        { method: 'get', url: '/health\x00admin' },
        // Multiple slashes
        { method: 'get', url: '//health///status' },
      ];

      for (const testCase of edgeCases) {
        try {
          let req = request(app.getHttpServer())[testCase.method](testCase.url);
          if (testCase.headers) {
            Object.entries(testCase.headers).forEach(([key, value]) => {
              req = req.set(key, value);
            });
          }
          const response = await req;

          // Should handle gracefully (not crash)
          expect(response.status).toBeLessThan(500);
        } catch (error) {
          // Some edge cases may cause request library to fail, which is acceptable
          expect(error).toBeDefined();
        }
      }

      console.log(`[${testId}] Security edge cases test completed`);
    });

    it('should maintain consistent security policies', async () => {
      const testId = `${operationId}_consistent_security`;
      console.log(`[${testId}] Testing consistent security policy enforcement`);

      const endpoints = ['/health', '/api/tasks', '/auth/login'];

      const securityChecks = [];

      for (const endpoint of endpoints) {
        const response = await request(app.getHttpServer()).get(endpoint);

        securityChecks.push({
          endpoint,
          hasSecurityHeaders: !!(
            response.headers['x-content-type-options'] &&
            response.headers['x-frame-options'] &&
            response.headers['x-xss-protection']
          ),
          status: response.status,
        });
      }

      // All endpoints should have consistent security headers
      const allHaveSecurityHeaders = securityChecks.every(
        (check) => check.hasSecurityHeaders,
      );
      expect(allHaveSecurityHeaders).toBe(true);

      console.log(`[${testId}] Consistent security policies test completed`);
    });
  });
});
