/**
 * Enterprise API CUA Integration Tests
 * 
 * This test suite provides comprehensive integration testing for Enterprise API
 * routing and rate limiting with Computer Use Agent functionality, ensuring
 * enterprise-grade performance, security, and scalability.
 * 
 * Integration Coverage:
 * - Enterprise API routing for CUA operations
 * - Rate limiting and throttling for computer use endpoints
 * - Authentication and authorization integration
 * - Load balancing and request distribution
 * - Enterprise monitoring and audit trail integration
 * - Performance optimization under enterprise load
 * 
 * Test Scenarios:
 * - High-volume enterprise workloads through CUA endpoints
 * - Rate limiting enforcement and graceful degradation
 * - Multi-tenant isolation and resource allocation
 * - Enterprise security compliance validation
 * - API versioning and backward compatibility
 * - Integration with enterprise monitoring systems
 * 
 * @author Claude Code - Subagent 6
 * @version 1.0.0
 */

import { Test, TestingModule } from '@nestjs/testing';import { INestApplication } from '@nestjs/common';import { HttpStatus } from '@nestjs/common';import * as request from 'supertest';import { EnterpriseApiGatewayController } from '../enterprise-api-gateway.controller';import { EnterpriseApiRoutingService } from '../enterprise-api-routing.service';import { EnterpriseApiRateLimitService } from '../enterprise-api-rate-limit.service';import { EnterpriseApiModule } from '../enterprise-api.module';import { ComputerUseService } from '../../computer-use/computer-use.service';import { ComputerUseModule } from '../../computer-use/computer-use.module';import { ParlantValidatedComputerUseService } from '../../parlant/parlant-validated-computer-use.service';import { ParlantModule } from '../../parlant/parlant.module';import { NutService } from '../../nut/nut.service';import { MetricsService } from '../../metrics/metrics.service';import { CacheService } from '../../cache/cache.service';import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';import { RolesGuard } from '../../auth/guards/roles.guard';import {ComputerAction,
  MoveMouseAction,
  ClickMouseAction,
  ScreenshotAction,
} from '@bytebot/shared';import * as jwt from 'jsonwebtoken';import { assertClientDefined, getClientSafely } from '../../__tests__/test-utils/mock-types';// Enterprise API integration test interfacesinterface EnterpriseIntegrationContext {
  app: INestApplication;
  enterpriseApiController: EnterpriseApiGatewayController;
  enterpriseRoutingService: EnterpriseApiRoutingService;
  enterpriseRateLimitService: EnterpriseApiRateLimitService;
  computerUseService: ComputerUseService;
  parlantValidatedService: ParlantValidatedComputerUseService;
  metricsService: MetricsService;
  cacheService: CacheService;
  nutService: NutService;
}

interface EnterpriseTestClient {
  clientId: string;
  tenantId: string;
  userRole: 'ADMIN' | 'OPERATOR' | 'USER';rateLimitTier: 'ENTERPRISE' | 'PREMIUM' | 'STANDARD';authToken: string;requestCount: number;
  successfulRequests: number;
  failedRequests: number;
}

interface EnterpriseLoadTestMetrics {
  testId: string;
  startTime: number;
  endTime: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
  throughputRps: number;
  rateLimitHits: number;
  authFailures: number;
  memoryUsage: NodeJS.MemoryUsage;
}

describe('Enterprise API CUA Integration Tests', () => {let context: EnterpriseIntegrationContext;let testModule: TestingModule;
  const testClients: EnterpriseTestClient[] = [];
  const loadTestMetrics: EnterpriseLoadTestMetrics[] = [];

  /**
   * Setup Enterprise API integration test environment
   */
  beforeAll(async () => {
    testModule = await Test.createTestingModule({
      imports: [
        ComputerUseModule,
        ParlantModule,
        EnterpriseApiModule,
      ],
    })
      .overrideProvider(NutService)
      .useValue(createMockNutService())
      .overrideGuard(JwtAuthGuard)
      .useValue(createMockJwtAuthGuard())
      .overrideGuard(RolesGuard)
      .useValue(createMockRolesGuard())
      .compile();

    const app = testModule.createNestApplication();
    await app.init();

    context = {
      app,
      enterpriseApiController: testModule.get<EnterpriseApiGatewayController>(EnterpriseApiGatewayController),
      enterpriseRoutingService: testModule.get<EnterpriseApiRoutingService>(EnterpriseApiRoutingService),
      enterpriseRateLimitService: testModule.get<EnterpriseApiRateLimitService>(EnterpriseApiRateLimitService),
      computerUseService: testModule.get<ComputerUseService>(ComputerUseService),
      parlantValidatedService: testModule.get<ParlantValidatedComputerUseService>(ParlantValidatedComputerUseService),
      metricsService: testModule.get<MetricsService>(MetricsService),
      cacheService: testModule.get<CacheService>(CacheService),
      nutService: testModule.get<NutService>(NutService),
    };

    // Create test clients for enterprise scenarios
    await createTestClients();
  });

  afterAll(async () => {
    await context?.app?.close();
    await testModule?.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    resetClientMetrics();
  });

  describe('Enterprise API Routing Integration', () => {it('should route computer use operations through enterprise gateway', async () => {const client = testClients.find(c => c.rateLimitTier === 'ENTERPRISE');expect(client).toBeDefined();// Type assertion after assertion check
      const enterpriseClient = client as EnterpriseTestClient;

      const moveMouseAction: MoveMouseAction = {
        action: 'move_mouse',coordinates: { x: 200, y: 300 },};

      const response = await request(context.app.getHttpServer())
        .post('/enterprise/computer-use/action').set('Authorization', `Bearer ${enterpriseClient.authToken}`)
        .set('X-Client-ID', enterpriseClient.clientId).set('X-Tenant-ID', enterpriseClient.tenantId).send(moveMouseAction).expect(HttpStatus.OK);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(context.nutService.mouseMoveEvent).toHaveBeenCalledWith(200, 300);

      // Verify enterprise routing headers
      expect(response.headers).toHaveProperty('x-enterprise-request-id');expect(response.headers).toHaveProperty('x-rate-limit-remaining');expect(response.headers).toHaveProperty('x-tenant-id');enterpriseClient.successfulRequests++;});

    it('should handle enterprise API versioning and backward compatibility', async () => {const client = testClients.find(c => c.rateLimitTier === 'PREMIUM');expect(client).toBeDefined();// Type assertion after assertion check
      const premiumClient = client as EnterpriseTestClient;

      // Test v1 API endpoint
      const v1Response = await request(context.app.getHttpServer())
        .post('/enterprise/v1/computer-use/screenshot').set('Authorization', `Bearer ${premiumClient.authToken}`)
        .set('X-Client-ID', premiumClient.clientId).set('API-Version', '1.0').expect(HttpStatus.OK);expect(v1Response.body).toBeDefined();
      expect(v1Response.headers['api-version']).toBe('1.0');// Test v2 API endpoint (future compatibility)const v2Response = await request(context.app.getHttpServer())
        .post('/enterprise/v2/computer-use/screenshot').set('Authorization', `Bearer ${premiumClient.authToken}`)
        .set('X-Client-ID', premiumClient.clientId).set('API-Version', '2.0').expect(HttpStatus.OK);expect(v2Response.body).toBeDefined();
      expect(v2Response.headers['api-version']).toBe('2.0');premiumClient.successfulRequests += 2;});

    it('should provide enterprise multi-tenant isolation', async () => {const tenant1Client = testClients.find(c => c.tenantId === 'tenant-enterprise-1');const tenant2Client = testClients.find(c => c.tenantId === 'tenant-enterprise-2');expect(tenant1Client).toBeDefined();expect(tenant2Client).toBeDefined();

      // Type assertions after assertion checks
      const tenant1 = getClientSafely(tenant1Client);
      const tenant2 = getClientSafely(tenant2Client);

      // Execute action for tenant 1
      const tenant1Response = await request(context.app.getHttpServer())
        .post('/enterprise/computer-use/cursor-position').set('Authorization', `Bearer ${tenant1.authToken}`)
        .set('X-Tenant-ID', tenant1.tenantId).expect(HttpStatus.OK);// Execute action for tenant 2
      const tenant2Response = await request(context.app.getHttpServer())
        .post('/enterprise/computer-use/cursor-position').set('Authorization', `Bearer ${tenant2.authToken}`)
        .set('X-Tenant-ID', tenant2.tenantId).expect(HttpStatus.OK);// Verify tenant isolation
      expect(tenant1Response.headers['x-tenant-id']).toBe(tenant1.tenantId);expect(tenant2Response.headers['x-tenant-id']).toBe(tenant2.tenantId);expect(tenant1Response.headers['x-tenant-id']).not.toBe(tenant2Response.headers['x-tenant-id']);// Verify both tenants can access the service independentlyexpect(tenant1Response.body.success).toBe(true);
      expect(tenant2Response.body.success).toBe(true);

      tenant1.successfulRequests++;
      tenant2.successfulRequests++;
    });
  });

  describe('Enterprise Rate Limiting and Throttling', () => {it('should enforce rate limits based on client tier', async () => {const standardClient = testClients.find(c => c.rateLimitTier === 'STANDARD');const enterpriseClient = testClients.find(c => c.rateLimitTier === 'ENTERPRISE');expect(standardClient).toBeDefined();expect(enterpriseClient).toBeDefined();

      // Type assertions after assertion checks
      const standard = getClientSafely(standardClient);
      const enterprise = getClientSafely(enterpriseClient);

      // Test standard tier rate limit (lower limit)
      const standardRequests = Array.from({ length: 15 }, () =>
        request(context.app.getHttpServer())
          .post('/enterprise/computer-use/cursor-position').set('Authorization', `Bearer ${standard.authToken}`)
          .set('X-Client-ID', standard.clientId));const standardResults = await Promise.allSettled(standardRequests);
      const standardSuccessful = standardResults.filter(r => r.status === 'fulfilled' && r.value.status === HttpStatus.OK);const standardRateLimited = standardResults.filter(r => r.status === 'fulfilled' && r.value.status === HttpStatus.TOO_MANY_REQUESTS);expect(standardRateLimited.length).toBeGreaterThan(0); // Some requests should be rate limited// Test enterprise tier rate limit (higher limit)
      const enterpriseRequests = Array.from({ length: 15 }, () =>
        request(context.app.getHttpServer())
          .post('/enterprise/computer-use/cursor-position').set('Authorization', `Bearer ${enterprise.authToken}`)
          .set('X-Client-ID', enterprise.clientId));const enterpriseResults = await Promise.allSettled(enterpriseRequests);
      const enterpriseSuccessful = enterpriseResults.filter(r => r.status === 'fulfilled' && r.value.status === HttpStatus.OK);expect(enterpriseSuccessful.length).toBeGreaterThan(standardSuccessful.length); // Enterprise should have higher limits});

    it('should provide graceful degradation under rate limit pressure', async () => {const client = testClients.find(c => c.rateLimitTier === 'PREMIUM');expect(client).toBeDefined();// Type assertion after assertion check
      const premiumClient = getClientSafely(client);

      // Generate high-volume requests to trigger rate limiting
      const highVolumeRequests = Array.from({ length: 50 }, (_, i) =>
        request(context.app.getHttpServer())
          .post('/enterprise/computer-use/screenshot').set('Authorization', `Bearer ${premiumClient.authToken}`)
          .set('X-Client-ID', premiumClient.clientId).set('X-Request-Priority', i < 10 ? 'HIGH' : 'NORMAL') // First 10 requests have high priority);const results = await Promise.allSettled(highVolumeRequests);
      
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.status === HttpStatus.OK);const rateLimited = results.filter(r => r.status === 'fulfilled' && r.value.status === HttpStatus.TOO_MANY_REQUESTS);const serviceUnavailable = results.filter(r => r.status === 'fulfilled' && r.value.status === HttpStatus.SERVICE_UNAVAILABLE);// Verify graceful degradationexpect(successful.length).toBeGreaterThan(0); // Some requests should succeed
      expect(rateLimited.length).toBeGreaterThan(0); // Some should be rate limited
      
      // High priority requests should have better success rate
      const highPrioritySuccess = results.slice(0, 10).filter(r => r.status === 'fulfilled' && r.value.status === HttpStatus.OK);const normalPrioritySuccess = results.slice(10).filter(r => r.status === 'fulfilled' && r.value.status === HttpStatus.OK);expect(highPrioritySuccess.length / 10).toBeGreaterThanOrEqual(normalPrioritySuccess.length / 40);});

    it('should implement adaptive rate limiting based on system load', async () => {const client = testClients.find(c => c.rateLimitTier === 'ENTERPRISE');expect(client).toBeDefined();// Type assertion after assertion check
      const enterpriseClient = getClientSafely(client);

      // Mock high system load
      jest.spyOn(context.metricsService, 'getSystemMetrics').mockResolvedValue({cpuUsage: 85, // High CPU usage
          memoryUsage: 90, // High memory usage
          activeConnections: 150,
          requestsPerSecond: 250,
        });

      // Make requests under high system load
      const loadTestRequests = Array.from({ length: 20 }, () =>
        request(context.app.getHttpServer())
          .post('/enterprise/computer-use/action').set('Authorization', `Bearer ${enterpriseClient.authToken}`)
          .send({ action: 'move_mouse', coordinates: { x: 100, y: 200 } }));const highLoadResults = await Promise.allSettled(loadTestRequests);
      const highLoadSuccessful = highLoadResults.filter(r => r.status === 'fulfilled' && r.value.status === HttpStatus.OK);// Mock normal system loadjest.spyOn(context.metricsService, 'getSystemMetrics').mockResolvedValue({cpuUsage: 25, // Normal CPU usage
          memoryUsage: 40, // Normal memory usage
          activeConnections: 50,
          requestsPerSecond: 80,
        });

      // Make requests under normal system load
      const normalLoadResults = await Promise.allSettled(loadTestRequests);
      const normalLoadSuccessful = normalLoadResults.filter(r => r.status === 'fulfilled' && r.value.status === HttpStatus.OK);// More requests should succeed under normal loadexpect(normalLoadSuccessful.length).toBeGreaterThanOrEqual(highLoadSuccessful.length);
    });
  });

  describe('Enterprise Performance and Scalability', () => {it('should handle enterprise-scale concurrent operations', async () => {const testId = generateTestId();const concurrentClients = 10;
      const requestsPerClient = 5;
      
      const startTime = Date.now();
      const initialMemory = process.memoryUsage();
      
      // Create concurrent load from multiple enterprise clients
      const clientPromises = testClients.slice(0, concurrentClients).map(async (client) => {
        const clientRequests = Array.from({ length: requestsPerClient }, (_, i) => 
          request(context.app.getHttpServer())
            .post('/enterprise/computer-use/action').set('Authorization', `Bearer ${client.authToken}`)
            .set('X-Client-ID', client.clientId).send({action: 'move_mouse',coordinates: { x: 100 + i * 10, y: 200 + i * 10 }})
        );
        
        return Promise.allSettled(clientRequests);
      });

      const allResults = await Promise.all(clientPromises);
      const endTime = Date.now();
      const finalMemory = process.memoryUsage();

      // Calculate metrics
      const totalRequests = concurrentClients * requestsPerClient;
      const successfulRequests = allResults.flat().filter(r => 
        r.status === 'fulfilled' && r.value.status === HttpStatus.OK).length;const failedRequests = totalRequests - successfulRequests;
      const totalTime = endTime - startTime;
      const throughputRps = (successfulRequests / totalTime) * 1000;

      const metrics: EnterpriseLoadTestMetrics = {
        testId,
        startTime,
        endTime,
        totalRequests,
        successfulRequests,
        failedRequests,
        averageResponseTime: totalTime / totalRequests,
        maxResponseTime: totalTime, // Simplified for testing
        minResponseTime: 10, // Simplified for testing
        throughputRps,
        rateLimitHits: failedRequests, // Simplified assumption
        authFailures: 0,
        memoryUsage: finalMemory,
      };

      loadTestMetrics.push(metrics);

      // Performance assertions
      expect(successfulRequests).toBeGreaterThan(totalRequests * 0.8); // At least 80% success rate
      expect(throughputRps).toBeGreaterThan(10); // Minimum throughput requirement
      expect(finalMemory.heapUsed - initialMemory.heapUsed).toBeLessThan(100 * 1024 * 1024); // <100MB memory growth
    });

    it('should optimize caching for enterprise workloads', async () => {const client = testClients.find(c => c.rateLimitTier === 'ENTERPRISE');expect(client).toBeDefined();// Mock cache service for testing
      const cacheGetSpy = jest.spyOn(context.cacheService, 'get');const cacheSetSpy = jest.spyOn(context.cacheService, 'set');cacheGetSpy.mockResolvedValue(null); // First call: cache misscacheSetSpy.mockResolvedValue(undefined);

      // First request (should hit cache miss and set cache)
      const firstResponse = await request(context.app.getHttpServer())
        .post('/enterprise/computer-use/cursor-position').set('Authorization', `Bearer ${getClientSafely(client).authToken}`)
        .set('X-Cache-Strategy', 'enterprise-optimized').expect(HttpStatus.OK);// Mock cache hit for subsequent requests
      cacheGetSpy.mockResolvedValue({ x: 500, y: 600, timestamp: Date.now() });

      // Second request (should hit cache)
      const secondResponse = await request(context.app.getHttpServer())
        .post('/enterprise/computer-use/cursor-position').set('Authorization', `Bearer ${getClientSafely(client).authToken}`)
        .set('X-Cache-Strategy', 'enterprise-optimized').expect(HttpStatus.OK);expect(firstResponse.body.success).toBe(true);
      expect(secondResponse.body.success).toBe(true);
      
      // Verify cache optimization was attempted
      expect(cacheGetSpy).toHaveBeenCalledTimes(2);
      expect(cacheSetSpy).toHaveBeenCalledTimes(1); // Only on first request
    });

    it('should provide enterprise monitoring and audit integration', async () => {const client = testClients.find(c => c.userRole === 'ADMIN');expect(client).toBeDefined();// Mock metrics collection
      const recordMetricSpy = jest.spyOn(context.metricsService, 'recordMetric');recordMetricSpy.mockResolvedValue(undefined);// Execute monitored operation
      const response = await request(context.app.getHttpServer())
        .post('/enterprise/computer-use/action').set('Authorization', `Bearer ${getClientSafely(client).authToken}`)
        .set('X-Audit-Required', 'true').set('X-Compliance-Level', 'SOC2').send({action: 'write_file',path: '/tmp/enterprise-audit-test.txt',data: Buffer.from('Enterprise audit test content').toString('base64')}).expect(HttpStatus.OK);

      expect(response.body.success).toBe(true);
      expect(response.headers).toHaveProperty('x-audit-trail-id');expect(response.headers).toHaveProperty('x-compliance-status');// Verify monitoring integrationexpect(recordMetricSpy).toHaveBeenCalled();
      
      // Check audit headers
      expect(response.headers['x-compliance-status']).toBe('compliant');});});

  describe('Enterprise Security and Compliance', () => {it('should enforce enterprise authentication and authorization', async () => {// Test without authenticationawait request(context.app.getHttpServer())
        .post('/enterprise/computer-use/action').send({ action: 'screenshot' }).expect(HttpStatus.UNAUTHORIZED);// Test with invalid token
      await request(context.app.getHttpServer())
        .post('/enterprise/computer-use/action').set('Authorization', 'Bearer invalid-token').send({ action: 'screenshot' }).expect(HttpStatus.UNAUTHORIZED);// Test with expired token
      const expiredToken = jwt.sign(
        { sub: 'test-user', role: 'USER', exp: Math.floor(Date.now() / 1000) - 3600 },'test-secret');await request(context.app.getHttpServer())
        .post('/enterprise/computer-use/action').set('Authorization', `Bearer ${expiredToken}`)
        .send({ action: 'screenshot' }).expect(HttpStatus.UNAUTHORIZED);// Test with valid token but insufficient permissions
      const userClient = testClients.find(c => c.userRole === 'USER');expect(userClient).toBeDefined();const user = getClientSafely(userClient);

      await request(context.app.getHttpServer())
        .post('/enterprise/admin/computer-use/system-action').set('Authorization', `Bearer ${user.authToken}`)
        .send({ action: 'system_shutdown' }).expect(HttpStatus.FORBIDDEN);});

    it('should implement enterprise data security and encryption', async () => {const client = testClients.find(c => c.rateLimitTier === 'ENTERPRISE');expect(client).toBeDefined();// Test encrypted file operation
      const sensitiveData = {
        confidential: true,
        classification: 'enterprise-secret',content: 'Highly sensitive enterprise data'};const response = await request(context.app.getHttpServer())
        .post('/enterprise/computer-use/secure-action').set('Authorization', `Bearer ${getClientSafely(client).authToken}`)
        .set('X-Encryption-Required', 'true').set('X-Data-Classification', 'confidential').send({action: 'write_file',path: '/tmp/enterprise-secure-test.enc',data: Buffer.from(JSON.stringify(sensitiveData)).toString('base64'),encryptionOptions: {algorithm: 'AES-256-GCM',keyDerivation: 'PBKDF2'}})
        .expect(HttpStatus.OK);

      expect(response.body.success).toBe(true);
      expect(response.headers).toHaveProperty('x-encryption-status');expect(response.headers['x-encryption-status']).toBe('encrypted');});it('should provide comprehensive compliance reporting', async () => {const adminClient = testClients.find(c => c.userRole === 'ADMIN');expect(adminClient).toBeDefined();// Type assertion after assertion check
      const admin = getClientSafely(adminClient);

      // Execute compliance-monitored operations
      const complianceOperations = [
        { action: 'screenshot', classification: 'public' },{ action: 'cursor_position', classification: 'internal' },{ action: 'move_mouse', coordinates: { x: 100, y: 200 }, classification: 'internal' }];for (const operation of complianceOperations) {
        await request(context.app.getHttpServer())
          .post('/enterprise/computer-use/action').set('Authorization', `Bearer ${admin.authToken}`)
          .set('X-Compliance-Tracking', 'enabled').set('X-Data-Classification', operation.classification).send(operation).expect(HttpStatus.OK);
      }

      // Request compliance report
      const reportResponse = await request(context.app.getHttpServer())
        .get('/enterprise/compliance/report').set('Authorization', `Bearer ${admin.authToken}`)
        .query({
          startDate: new Date(Date.now() - 3600000).toISOString(), // Last hour
          endDate: new Date().toISOString(),
          includeDataClassification: true
        })
        .expect(HttpStatus.OK);

      expect(reportResponse.body).toHaveProperty('complianceReport');expect(reportResponse.body.complianceReport).toHaveProperty('operationsAudited');expect(reportResponse.body.complianceReport).toHaveProperty('securityViolations');expect(reportResponse.body.complianceReport).toHaveProperty('dataClassificationBreakdown');expect(reportResponse.body.complianceReport.operationsAudited).toBeGreaterThanOrEqual(3);});
  });

  // Helper Functions for Enterprise API Integration Testing

  /**
   * Create test clients for various enterprise scenarios
   */
  async function createTestClients(): Promise<void> {
    const clientConfigs = [
      { tenantId: 'tenant-enterprise-1', userRole: 'ADMIN', rateLimitTier: 'ENTERPRISE' },{ tenantId: 'tenant-enterprise-2', userRole: 'OPERATOR', rateLimitTier: 'ENTERPRISE' },{ tenantId: 'tenant-premium-1', userRole: 'OPERATOR', rateLimitTier: 'PREMIUM' },{ tenantId: 'tenant-premium-2', userRole: 'USER', rateLimitTier: 'PREMIUM' },{ tenantId: 'tenant-standard-1', userRole: 'USER', rateLimitTier: 'STANDARD' },{ tenantId: 'tenant-standard-2', userRole: 'USER', rateLimitTier: 'STANDARD' },
    ];

    for (const config of clientConfigs) {
      const clientId = `client-${config.tenantId}-${Date.now()}`;const authToken = jwt.sign({
          sub: `user-${clientId}`,
          role: config.userRole,
          tenantId: config.tenantId,
          rateLimitTier: config.rateLimitTier,
          exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiry
        },
        'test-secret');testClients.push({
        clientId,
        tenantId: config.tenantId,
        userRole: config.userRole as 'ADMIN' | 'OPERATOR' | 'USER',rateLimitTier: config.rateLimitTier as 'ENTERPRISE' | 'PREMIUM' | 'STANDARD',
        authToken,
        requestCount: 0,
        successfulRequests: 0,
        failedRequests: 0,
      });
    }
  }

  /**
   * Reset client metrics for test isolation
   */
  function resetClientMetrics(): void {
    testClients.forEach(client => {
      client.requestCount = 0;
      client.successfulRequests = 0;
      client.failedRequests = 0;
    });
  }

  /**
   * Generate unique test ID
   */
  function generateTestId(): string {
    return `enterprise_test${Date.now()}${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Create mock JWT auth guard
   */
  function createMockJwtAuthGuard() {
    return {
      canActivate: jest.fn().mockImplementation((context) => {
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers.authorization;
        
        if (!authHeader?.startsWith('Bearer ')) {return false;}
        
        try {
          const token = authHeader.substring(7);
          const decoded = jwt.verify(token, 'test-secret');request.user = decoded;return true;
        } catch {
          return false;
        }
      }),
    };
  }

  /**
   * Create mock roles guard
   */
  function createMockRolesGuard() {
    return {
      canActivate: jest.fn().mockImplementation((context) => {
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        
        // Allow all roles for testing (can be customized per test)
        return !!user;
      }),
    };
  }

  /**
   * Create mock NUT service for testing
   */
  function createMockNutService(): Partial<NutService> {
    return {
      mouseMoveEvent: jest.fn().mockResolvedValue({ success: true }),
      mouseClickEvent: jest.fn().mockResolvedValue({ success: true }),
      mouseButtonEvent: jest.fn().mockResolvedValue({ success: true }),
      mouseWheelEvent: jest.fn().mockResolvedValue({ success: true }),
      holdKeys: jest.fn().mockResolvedValue({ success: true }),
      sendKeys: jest.fn().mockResolvedValue({ success: true }),
      typeText: jest.fn().mockResolvedValue({ success: true }),
      pasteText: jest.fn().mockResolvedValue({ success: true }),
      screendump: jest.fn().mockResolvedValue(Buffer.from('mocked-enterprise-screenshot')),
      getCursorPosition: jest.fn().mockResolvedValue({ x: 500, y: 600 }),
    };
  }
});