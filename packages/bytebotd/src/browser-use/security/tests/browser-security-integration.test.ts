/**
 * Browser Security Integration Test Suite
 *
 * Comprehensive test suite for validating the complete security framework integration
 * including authentication, authorization, validation, rate limiting, and audit trail.
 *
 * Performance targets:
 * - Authentication: < 50ms
 * - Authorization: < 30ms
 * - Validation: < 100ms
 * - Rate limiting: < 10ms
 * - Audit trail: < 200ms
 * - Total overhead: < 400ms
 * - End-to-end request: < 1000ms (P95)
 *
 * @author Security Integration Test Engineer
 */

import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { performance } from 'perf_hooks';

// Security components
import { BrowserSecurityIntegrationModule } from '../browser-security-integration.module';
import { BrowserUseAuthMiddleware } from '../../middleware/browser-use-auth.middleware';
import { BrowserUseRbacGuard } from '../../guards/browser-use-rbac.guard';
import { BrowserRequestValidatorService } from '../../validators/browser-request-validator.service';
import { BrowserRateLimiterService } from '../../rate-limiters/browser-rate-limiter.service';
import { BrowserAuditTrailService } from '../../audit/browser-audit-trail.service';

// Mock services
import { ParlantAuthenticationBridgeService } from '../../../../shared/src/parlant/security/authentication-bridge.service';
import { EnhancedJwtParlantBridgeService } from '../../../../shared/src/services/enhanced-jwt-parlant-bridge.service';

/**
 * Test configuration for security framework
 */
const TEST_SECURITY_CONFIG = {
  authentication: {
    enabled: true,
    requireMfa: false,
    sessionTimeout: 3600000,
    maxConcurrentSessions: 5,
    enforceTwoFactor: false,
    allowAnonymous: false,
  },
  authorization: {
    enabled: true,
    strictMode: true,
    roleHierarchy: true,
    permissionCaching: true,
    conversationalApproval: false, // Disabled for testing
    emergencyOverride: false,
  },
  validation: {
    enabled: true,
    strictMode: true,
    maxRequestSize: 10485760,
    contentScanning: true,
    malwareDetection: false,
    sensitiveDataRedaction: true,
  },
  rateLimiting: {
    enabled: true,
    adaptiveMode: false, // Disabled for consistent testing
    globalLimits: true,
    userLimits: true,
    endpointLimits: true,
    circuitBreaker: false,
  },
  auditTrail: {
    enabled: true,
    realTimeStreaming: false, // Disabled for testing performance
    cryptographicIntegrity: true,
    complianceMode: true,
    retentionDays: 30,
    sensitiveDataLogging: false,
  },
  monitoring: {
    enabled: true,
    realTimeAlerts: false,
    threatDetection: true,
    performanceMonitoring: true,
    complianceReporting: false,
    dashboardEnabled: true,
  },
  compliance: {
    gdprMode: true,
    hipaaMode: false,
    soc2Mode: true,
    pciDssMode: false,
    automatedReporting: false,
    dataClassification: true,
  },
};

/**
 * Mock test data
 */
const VALID_JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXIiLCJ1c2VySWQiOiJ0ZXN0LXVzZXItaWQiLCJyb2xlIjoiQURNSU4iLCJwZXJtaXNzaW9ucyI6WyJicm93c2VyOnRhc2s6Y3JlYXRlIiwiYnJvd3Nlcjp0YXNrOnZpZXciLCJicm93c2VyOnRhc2s6c3RvcCJdLCJpYXQiOjE2MzAwMDAwMDAsImV4cCI6OTk5OTk5OTk5OX0.test-signature';

const INVALID_JWT_TOKEN = 'invalid.jwt.token';

const MALICIOUS_PAYLOAD = {
  url: 'https://evil.com',
  task: "'; DROP TABLE users; --",
  script: '<script>alert("xss")</script>',
  command: 'rm -rf /',
};

const VALID_PAYLOAD = {
  url: 'https://example.com',
  task: 'navigate_to_page',
  parameters: {
    waitForSelector: '.content',
    timeout: 5000,
  },
};

/**
 * Performance measurement utilities
 */
class PerformanceMeasurement {
  private measurements: Map<string, number[]> = new Map();

  startMeasurement(operation: string): () => void {
    const startTime = performance.now();
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;

      if (!this.measurements.has(operation)) {
        this.measurements.set(operation, []);
      }
      this.measurements.get(operation)!.push(duration);
    };
  }

  getStats(operation: string): {
    count: number;
    average: number;
    min: number;
    max: number;
    p95: number;
    p99: number;
  } {
    const measurements = this.measurements.get(operation) || [];
    if (measurements.length === 0) {
      return { count: 0, average: 0, min: 0, max: 0, p95: 0, p99: 0 };
    }

    const sorted = [...measurements].sort((a, b) => a - b);
    const count = measurements.length;
    const average = measurements.reduce((sum, val) => sum + val, 0) / count;
    const min = Math.min(...measurements);
    const max = Math.max(...measurements);
    const p95Index = Math.floor(count * 0.95);
    const p99Index = Math.floor(count * 0.99);
    const p95 = sorted[p95Index] || max;
    const p99 = sorted[p99Index] || max;

    return { count, average, min, max, p95, p99 };
  }

  getAllStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    for (const [operation, _] of this.measurements) {
      stats[operation] = this.getStats(operation);
    }
    return stats;
  }
}

describe('Browser Security Integration Tests', () => {
  let app: INestApplication;
  let module: TestingModule;
  let performanceTracker: PerformanceMeasurement;

  // Service instances
  let authMiddleware: BrowserUseAuthMiddleware;
  let rbacGuard: BrowserUseRbacGuard;
  let validator: BrowserRequestValidatorService;
  let rateLimiter: BrowserRateLimiterService;
  let auditTrail: BrowserAuditTrailService;

  beforeAll(async () => {
    performanceTracker = new PerformanceMeasurement();

    // Create test module with security configuration
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        BrowserSecurityIntegrationModule.forRoot(TEST_SECURITY_CONFIG),
      ],
    })
    .overrideProvider(ParlantAuthenticationBridgeService)
    .useValue(createMockParlantAuthService())
    .overrideProvider(EnhancedJwtParlantBridgeService)
    .useValue(createMockJwtBridgeService())
    .compile();

    app = module.createNestApplication();
    await app.init();

    // Get service instances
    authMiddleware = module.get<BrowserUseAuthMiddleware>(BrowserUseAuthMiddleware);
    rbacGuard = module.get<BrowserUseRbacGuard>(BrowserUseRbacGuard);
    validator = module.get<BrowserRequestValidatorService>(BrowserRequestValidatorService);
    rateLimiter = module.get<BrowserRateLimiterService>(BrowserRateLimiterService);
    auditTrail = module.get<BrowserAuditTrailService>(BrowserAuditTrailService);
  });

  afterAll(async () => {
    await app.close();

    // Log performance results
    console.log('\n🚀 SECURITY FRAMEWORK PERFORMANCE RESULTS:');
    console.log('='.repeat(60));
    const allStats = performanceTracker.getAllStats();
    for (const [operation, stats] of Object.entries(allStats)) {
      console.log(`\n📊 ${operation}:`);
      console.log(`   Count: ${stats.count}`);
      console.log(`   Average: ${stats.average.toFixed(2)}ms`);
      console.log(`   P95: ${stats.p95.toFixed(2)}ms`);
      console.log(`   P99: ${stats.p99.toFixed(2)}ms`);
      console.log(`   Min/Max: ${stats.min.toFixed(2)}ms / ${stats.max.toFixed(2)}ms`);
    }
    console.log('='.repeat(60));
  });

  describe('Authentication Middleware Integration', () => {
    it('should successfully authenticate valid JWT tokens', async () => {
      const endMeasurement = performanceTracker.startMeasurement('authentication_valid');

      const mockRequest = createMockRequest({
        headers: { authorization: `Bearer ${VALID_JWT_TOKEN}` },
      });
      const mockResponse = createMockResponse();
      const mockNext = jest.fn();

      await authMiddleware.use(mockRequest, mockResponse, mockNext);

      endMeasurement();

      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.user).toBeDefined();
      expect(mockRequest.user.userId).toBe('test-user-id');
      expect(mockRequest.user.role).toBe('ADMIN');
    });

    it('should reject invalid JWT tokens', async () => {
      const endMeasurement = performanceTracker.startMeasurement('authentication_invalid');

      const mockRequest = createMockRequest({
        headers: { authorization: `Bearer ${INVALID_JWT_TOKEN}` },
      });
      const mockResponse = createMockResponse();
      const mockNext = jest.fn();

      await expect(
        authMiddleware.use(mockRequest, mockResponse, mockNext)
      ).rejects.toThrow();

      endMeasurement();

      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should meet authentication performance targets', () => {
      const stats = performanceTracker.getStats('authentication_valid');
      expect(stats.p95).toBeLessThan(50); // < 50ms target
      expect(stats.average).toBeLessThan(25); // Average should be even faster
    });
  });

  describe('Authorization Guard Integration', () => {
    it('should grant access to users with proper permissions', async () => {
      const endMeasurement = performanceTracker.startMeasurement('authorization_granted');

      const mockContext = createMockExecutionContext({
        user: {
          userId: 'test-user-id',
          role: 'ADMIN',
          permissions: ['browser:task:create', 'browser:task:view', 'browser:task:stop'],
        },
        route: { handler: { name: 'createBrowserTask' } },
      });

      const canActivate = await rbacGuard.canActivate(mockContext);

      endMeasurement();

      expect(canActivate).toBe(true);
    });

    it('should deny access to users without proper permissions', async () => {
      const endMeasurement = performanceTracker.startMeasurement('authorization_denied');

      const mockContext = createMockExecutionContext({
        user: {
          userId: 'test-user-id',
          role: 'USER',
          permissions: ['browser:task:view'],
        },
        route: { handler: { name: 'createBrowserTask' } },
      });

      const canActivate = await rbacGuard.canActivate(mockContext);

      endMeasurement();

      expect(canActivate).toBe(false);
    });

    it('should meet authorization performance targets', () => {
      const stats = performanceTracker.getStats('authorization_granted');
      expect(stats.p95).toBeLessThan(30); // < 30ms target
    });
  });

  describe('Request Validation Integration', () => {
    it('should pass valid requests through validation', async () => {
      const endMeasurement = performanceTracker.startMeasurement('validation_valid');

      const result = await validator.validateRequest(VALID_PAYLOAD, {
        contentType: 'application/json',
        userAgent: 'test-agent',
        ipAddress: '127.0.0.1',
      });

      endMeasurement();

      expect(result.isValid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should detect and block malicious requests', async () => {
      const endMeasurement = performanceTracker.startMeasurement('validation_malicious');

      const result = await validator.validateRequest(MALICIOUS_PAYLOAD, {
        contentType: 'application/json',
        userAgent: 'test-agent',
        ipAddress: '127.0.0.1',
      });

      endMeasurement();

      expect(result.isValid).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations.some(v => v.type === 'SQL_INJECTION')).toBe(true);
      expect(result.violations.some(v => v.type === 'XSS')).toBe(true);
    });

    it('should meet validation performance targets', () => {
      const stats = performanceTracker.getStats('validation_valid');
      expect(stats.p95).toBeLessThan(100); // < 100ms target
    });
  });

  describe('Rate Limiting Integration', () => {
    it('should allow requests within rate limits', async () => {
      const endMeasurement = performanceTracker.startMeasurement('rate_limiting_allowed');

      const result = await rateLimiter.checkRateLimit({
        userId: 'test-user-1',
        ipAddress: '127.0.0.1',
        endpoint: '/api/browser/task',
        operation: 'create_task',
      });

      endMeasurement();

      expect(result.allowed).toBe(true);
      expect(result.remainingRequests).toBeGreaterThan(0);
    });

    it('should block requests exceeding rate limits', async () => {
      const endMeasurement = performanceTracker.startMeasurement('rate_limiting_blocked');

      // Exhaust rate limit
      for (let i = 0; i < 10; i++) {
        await rateLimiter.checkRateLimit({
          userId: 'test-user-2',
          ipAddress: '127.0.0.2',
          endpoint: '/api/browser/task',
          operation: 'create_task',
        });
      }

      // This should be blocked
      const result = await rateLimiter.checkRateLimit({
        userId: 'test-user-2',
        ipAddress: '127.0.0.2',
        endpoint: '/api/browser/task',
        operation: 'create_task',
      });

      endMeasurement();

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('rate limit exceeded');
    });

    it('should meet rate limiting performance targets', () => {
      const stats = performanceTracker.getStats('rate_limiting_allowed');
      expect(stats.p95).toBeLessThan(10); // < 10ms target
    });
  });

  describe('Audit Trail Integration', () => {
    it('should record security events with cryptographic integrity', async () => {
      const endMeasurement = performanceTracker.startMeasurement('audit_trail_recording');

      const eventId = await auditTrail.recordEvent({
        eventType: 'BROWSER_TASK_CREATED',
        severity: 'MEDIUM',
        userId: 'test-user-id',
        sessionId: 'test-session-id',
        description: 'User created a new browser automation task',
        resource: '/api/browser/task',
        action: 'POST',
        outcome: 'SUCCESS',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        data: VALID_PAYLOAD,
        complianceFlags: ['GDPR', 'SOC2'],
      });

      endMeasurement();

      expect(eventId).toBeDefined();
      expect(typeof eventId).toBe('string');
    });

    it('should retrieve audit events with integrity verification', async () => {
      const endMeasurement = performanceTracker.startMeasurement('audit_trail_retrieval');

      const events = await auditTrail.getEvents({
        userId: 'test-user-id',
        startTime: new Date(Date.now() - 3600000), // Last hour
        endTime: new Date(),
        verifyIntegrity: true,
      });

      endMeasurement();

      expect(events).toBeDefined();
      expect(Array.isArray(events.events)).toBe(true);
      expect(events.integrityStatus).toBe('VERIFIED');
    });

    it('should meet audit trail performance targets', () => {
      const stats = performanceTracker.getStats('audit_trail_recording');
      expect(stats.p95).toBeLessThan(200); // < 200ms target
    });
  });

  describe('End-to-End Security Framework Integration', () => {
    it('should complete full security workflow within performance targets', async () => {
      const endMeasurement = performanceTracker.startMeasurement('e2e_security_workflow');

      // Simulate a complete request through all security layers
      const mockRequest = createMockRequest({
        headers: { authorization: `Bearer ${VALID_JWT_TOKEN}` },
        body: VALID_PAYLOAD,
        url: '/api/browser/task',
        method: 'POST',
        ip: '127.0.0.1',
      });

      // 1. Authentication
      const mockResponse = createMockResponse();
      const mockNext = jest.fn();
      await authMiddleware.use(mockRequest, mockResponse, mockNext);

      // 2. Authorization
      const mockContext = createMockExecutionContext({
        user: mockRequest.user,
        route: { handler: { name: 'createBrowserTask' } },
      });
      const authorized = await rbacGuard.canActivate(mockContext);

      // 3. Validation
      const validation = await validator.validateRequest(mockRequest.body, {
        contentType: 'application/json',
        userAgent: mockRequest.get('User-Agent'),
        ipAddress: mockRequest.ip,
      });

      // 4. Rate limiting
      const rateLimit = await rateLimiter.checkRateLimit({
        userId: mockRequest.user.userId,
        ipAddress: mockRequest.ip,
        endpoint: mockRequest.url,
        operation: 'create_task',
      });

      // 5. Audit trail
      const auditEventId = await auditTrail.recordEvent({
        eventType: 'BROWSER_TASK_CREATED',
        severity: 'MEDIUM',
        userId: mockRequest.user.userId,
        sessionId: mockRequest.session?.sessionId,
        description: 'Complete security workflow test',
        resource: mockRequest.url,
        action: mockRequest.method,
        outcome: 'SUCCESS',
        ipAddress: mockRequest.ip,
        userAgent: mockRequest.get('User-Agent'),
        data: mockRequest.body,
        complianceFlags: ['TEST'],
      });

      endMeasurement();

      // Verify all components succeeded
      expect(mockNext).toHaveBeenCalled();
      expect(authorized).toBe(true);
      expect(validation.isValid).toBe(true);
      expect(rateLimit.allowed).toBe(true);
      expect(auditEventId).toBeDefined();
    });

    it('should meet overall end-to-end performance targets', () => {
      const stats = performanceTracker.getStats('e2e_security_workflow');
      expect(stats.p95).toBeLessThan(1000); // < 1000ms P95 target
      expect(stats.average).toBeLessThan(500); // Average should be much faster
    });

    it('should maintain performance under load', async () => {
      const iterations = 50;
      const promises: Promise<void>[] = [];

      for (let i = 0; i < iterations; i++) {
        promises.push((async () => {
          const endMeasurement = performanceTracker.startMeasurement('load_test_iteration');

          const mockRequest = createMockRequest({
            headers: { authorization: `Bearer ${VALID_JWT_TOKEN}` },
            body: VALID_PAYLOAD,
            url: '/api/browser/task',
            method: 'POST',
            ip: '127.0.0.1',
          });

          // Simulate abbreviated security workflow
          await validator.validateRequest(mockRequest.body, {
            contentType: 'application/json',
            userAgent: 'test-agent',
            ipAddress: '127.0.0.1',
          });

          await rateLimiter.checkRateLimit({
            userId: `load-test-user-${i}`,
            ipAddress: '127.0.0.1',
            endpoint: '/api/browser/task',
            operation: 'create_task',
          });

          endMeasurement();
        })());
      }

      await Promise.all(promises);

      const stats = performanceTracker.getStats('load_test_iteration');
      expect(stats.p95).toBeLessThan(1000); // Performance should not degrade significantly
      expect(stats.count).toBe(iterations);
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle authentication service failures gracefully', async () => {
      // Test with service failure simulation
      const mockRequest = createMockRequest({
        headers: { authorization: 'Bearer error-token' },
      });
      const mockResponse = createMockResponse();
      const mockNext = jest.fn();

      await expect(
        authMiddleware.use(mockRequest, mockResponse, mockNext)
      ).rejects.toThrow();

      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should maintain audit trail during component failures', async () => {
      // Even if other components fail, audit trail should record the failure
      const eventId = await auditTrail.recordEvent({
        eventType: 'AUTHENTICATION_FAILURE',
        severity: 'HIGH',
        userId: null,
        sessionId: null,
        description: 'Authentication failed for invalid token',
        resource: '/api/browser/task',
        action: 'POST',
        outcome: 'FAILURE',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        data: { error: 'Invalid JWT token' },
        complianceFlags: ['SECURITY_INCIDENT'],
      });

      expect(eventId).toBeDefined();
    });
  });
});

/**
 * Mock factory functions
 */
function createMockParlantAuthService() {
  return {
    validateToken: jest.fn().mockImplementation((token: string) => {
      if (token === VALID_JWT_TOKEN) {
        return Promise.resolve({
          valid: true,
          payload: {
            sub: 'test-user',
            userId: 'test-user-id',
            role: 'ADMIN',
            permissions: ['browser:task:create', 'browser:task:view', 'browser:task:stop'],
          },
        });
      }
      return Promise.reject(new Error('Invalid token'));
    }),
    refreshToken: jest.fn(),
    getUserPermissions: jest.fn().mockResolvedValue(['browser:task:create', 'browser:task:view', 'browser:task:stop']),
  };
}

function createMockJwtBridgeService() {
  return {
    validateJwtToken: jest.fn().mockImplementation((token: string) => {
      if (token === VALID_JWT_TOKEN) {
        return Promise.resolve({
          valid: true,
          decoded: {
            sub: 'test-user',
            userId: 'test-user-id',
            role: 'ADMIN',
            permissions: ['browser:task:create', 'browser:task:view', 'browser:task:stop'],
          },
        });
      }
      return Promise.reject(new Error('Invalid token'));
    }),
  };
}

function createMockRequest(overrides: any = {}) {
  return {
    headers: {},
    body: {},
    url: '/api/test',
    method: 'GET',
    ip: '127.0.0.1',
    get: jest.fn().mockReturnValue('test-agent'),
    ...overrides,
  };
}

function createMockResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  };
}

function createMockExecutionContext(overrides: any = {}) {
  return {
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue({
        user: overrides.user || {},
        url: '/api/test',
        method: 'GET',
      }),
    }),
    getHandler: jest.fn().mockReturnValue(overrides.route?.handler || {}),
    getClass: jest.fn().mockReturnValue({}),
  };
}