/**
 * Integration Test Template - Enterprise-Grade NestJS Integration Testing Framework
 *
 * COMPREHENSIVE TESTING ARCHITECTURE:
 * This template provides a battle-tested, enterprise-ready structure for integration tests with:
 * - Full NestJS application context with real dependencies and services
 * - Database integration with transaction isolation and rollback capabilities
 * - HTTP request simulation with proper middleware stack execution
 * - Authentication and authorization testing with JWT token management
 * - Performance monitoring and resource management with memory leak prevention
 * - Comprehensive error handling and edge case validation
 * - Concurrent operation testing and data consistency verification
 *
 * TEMPLATE USAGE GUIDE:
 * Replace the following placeholders with actual implementation values:
 * - [MODULE_NAME] - Name of the module being tested (e.g., UsersModule)
 * - [CONTROLLER_CLASS] - Actual controller class (e.g., UsersController)
 * - [SERVICE_DEPENDENCIES] - Real service dependencies (e.g., UsersService, EmailService)
 * - [API_ENDPOINTS] - Specific API endpoints to test (e.g., /api/users, /api/users/:id)
 * - [DATABASE_ENTITIES] - Database entities involved (e.g., User, UserProfile)
 *
 * PERFORMANCE & COMPLIANCE:
 * - Validates enterprise-grade response times (<100ms average, <5s total)
 * - Implements comprehensive logging for audit trails
 * - Follows local-only architecture compliance requirements
 * - Provides detailed error context for debugging
 *
 * @author Claude Code - Enterprise Integration Testing Specialist
 * @version 3.0.0 - Enhanced Enterprise Edition
 * @since Bytebot Agent Testing Framework v2.0
 * @lastUpdated 2025-09-10
 * @compliance Local-Only Architecture, Enterprise Security Standards
 */

import { TestingModule } from '@nestjs/testing';
import { INestApplication, Logger } from '@nestjs/common';
import request from 'supertest';
import type { Response } from 'supertest';

/**
 * Enterprise Integration Test Logging Configuration
 * Provides comprehensive audit trails for all test operations
 */
const logger = new Logger('IntegrationTestTemplate');

// Import the module being tested
// import { [MODULE_NAME] } from '../[module-file]';
// import { [CONTROLLER_CLASS] } from '../[controller-file]';

// Import dependencies
import { PrismaService } from '../../prisma/prisma.service';
// import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

// Import test utilities
import { createTestBuilder } from '../helpers/nestjs-test-builder';
import {
  createDatabaseTestHelper,
  // DatabaseTestUtils,
} from '../helpers/database-test-helper';
import {
  // createAuthTestHelper,
  AuthTestUtils,
} from '../helpers/auth-test-helper';
import { TestPerformanceMonitor } from '../helpers/nestjs-test-builder';

describe('Module Integration Tests', () => {
  let app: INestApplication;
  let testingModule: TestingModule;

  // Service instances
  let prismaService: PrismaService;
  let jwtService: JwtService;
  // let configService: ConfigService;

  // Test utilities
  let dbHelper: ReturnType<typeof createDatabaseTestHelper>;
  // let authHelper: ReturnType<typeof createAuthTestHelper>;

  // Test data
  let testUser: {
    id: string;
    email: string;
    role: string;
    username?: string;
    roles?: string[];
  };
  let authToken: string;

  beforeAll(async () => {
    const setupStartTime = Date.now();
    logger.log(
      '🚀 [SETUP] Initializing comprehensive integration test environment',
    );
    // Create comprehensive test application
    const testBuilder = createTestBuilder({
      mockDatabase: false, // Use real database for integration tests
      mockJwtService: false, // Use real JWT service
      mockConfigService: true,
      enableTransactions: true,
      testData: {
        NODE_ENV: 'test',
        JWT_SECRET: 'integration-test-jwt-secret',
        DATABASE_URL: 'file:./test-integration.db',
      },
    });

    // Add the module being tested
    testBuilder.addImports([
      // [MODULE_NAME],
      // Add other required modules
    ]);

    testingModule = await testBuilder.build();
    app = await testBuilder.createApp();

    // Get service instances
    prismaService = testingModule.get<PrismaService>(PrismaService);
    jwtService = testingModule.get<JwtService>(JwtService);
    // configService = testingModule.get<ConfigService>(ConfigService);

    // Initialize test utilities
    dbHelper = createDatabaseTestHelper({
      cleanupAfterEach: false, // Manual cleanup for integration tests
      seedData: true,
    });

    // authHelper = createAuthTestHelper({
    //   jwtSecret: 'integration-test-jwt-secret',
    // });

    await dbHelper.initialize();

    const setupDuration = Date.now() - setupStartTime;
    logger.log(
      `✅ [SETUP] Integration test environment initialized in ${setupDuration.toString()}ms`,
    );

    // Create test user and authentication token
    testUser = AuthTestUtils.DataFactory.createTestUser();
    authToken = jwtService.sign({
      sub: testUser.id,
      email: testUser.email,
      role: testUser.role,
    });
  });

  afterAll(async () => {
    const cleanupStartTime = Date.now();
    logger.log('🧹 [CLEANUP] Starting comprehensive test environment cleanup');

    try {
      // Cleanup in reverse order to prevent dependency issues
      await dbHelper.runCleanup();
      logger.log('✅ [CLEANUP] Database helper cleanup completed');

      await app.close();
      logger.log('✅ [CLEANUP] NestJS application closed');

      await testingModule.close();
      logger.log('✅ [CLEANUP] Testing module closed');

      const cleanupDuration = Date.now() - cleanupStartTime;
      logger.log(
        `✅ [CLEANUP] Complete test environment cleanup finished in ${cleanupDuration.toString()}ms`,
      );
    } catch (error) {
      logger.error(
        '❌ [CLEANUP] Error during test environment cleanup:',
        error,
      );
      throw error;
    }
  });

  beforeEach(async () => {
    const testResetStartTime = Date.now();
    logger.log(
      '🔄 [TEST-RESET] Preparing clean test environment for individual test',
    );

    try {
      // Reset database state for each test to ensure isolation
      await dbHelper.reset();
      logger.log('✅ [TEST-RESET] Database state reset completed');

      // Seed required test data with comprehensive user profile
      await prismaService.user.create({
        data: {
          id: testUser.id,
          email: testUser.email,
          username: testUser.username || `user_${testUser.id}`,
          passwordHash: 'test-password-hash',
          // Add other required fields based on your Prisma schema
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      const resetDuration = Date.now() - testResetStartTime;
      logger.log(
        `✅ [TEST-RESET] Test environment prepared in ${resetDuration.toString()}ms`,
      );
    } catch (error) {
      logger.error(
        '❌ [TEST-RESET] Error during test environment reset:',
        error,
      );
      throw error;
    }
  });

  describe('HTTP Endpoints', () => {
    describe('GET /[endpoint]', () => {
      it('should return [expected_data] for authenticated user', async () => {
        const testStartTime = Date.now();
        logger.log('📋 [TEST] Starting authenticated GET endpoint test');

        const response = await TestPerformanceMonitor.measure(
          'get-endpoint-authenticated',
          async (): Promise<Response> => {
            logger.log(
              '🔗 [HTTP] Making authenticated GET request to /[endpoint]',
            );
            const httpResponse = await request(app.getHttpServer())
              .get('/[endpoint]')
              .set('Authorization', `Bearer ${authToken}`)
              .expect(200);

            logger.log(
              `✅ [HTTP] GET request completed successfully in ${(Date.now() - testStartTime).toString()}ms`,
            );
            return httpResponse;
          },
        );

        // Comprehensive response validation with detailed logging
        logger.log('🔍 [VALIDATE] Validating response structure and content');
        expect(response.body as Record<string, unknown>).toMatchObject({
          success: true,
          data: expect.any(Array),
        });
        logger.log('✅ [VALIDATE] Response structure validation passed');

        // Validate response structure (uncomment when implementing API response validation)
        // expect(response.body).toBeValidApiResponse();

        // Performance assertions with enterprise standards
        const responseTime = Date.now() - testStartTime;
        expect(responseTime).toBeLessThan(1000); // Should complete within 1 second
        logger.log(
          `✅ [PERFORMANCE] Response time ${responseTime.toString()}ms meets enterprise standards (<1000ms)`,
        );
      });

      it('should return 401 for unauthenticated user', async () => {
        const testStartTime = Date.now();
        logger.log('🚫 [TEST] Starting unauthenticated access security test');

        const response = await request(app.getHttpServer())
          .get('/[endpoint]')
          .expect(401);

        const responseTime = Date.now() - testStartTime;
        logger.log(
          `✅ [SECURITY] Unauthenticated request properly rejected in ${responseTime.toString()}ms`,
        );

        expect(response.body as Record<string, unknown>).toMatchObject({
          success: false,
          error: expect.objectContaining({
            message: expect.stringContaining('Authentication'),
          }),
        });

        logger.log(
          '✅ [SECURITY] Authentication error response validation passed',
        );
      });

      it('should handle query parameters correctly', async () => {
        const queryParams = {
          limit: '10',
          offset: '0',
          sortBy: 'createdAt',
          order: 'desc',
        };

        const testStartTime = Date.now();
        logger.log('🔍 [TEST] Testing query parameter handling', {
          queryParams,
        });

        const response = await request(app.getHttpServer())
          .get('/[endpoint]')
          .query(queryParams)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        const responseTime = Date.now() - testStartTime;
        logger.log(
          `✅ [QUERY] Query parameters processed successfully in ${responseTime.toString()}ms`,
        );

        const responseBody = response.body as { data: unknown[] };
        expect(responseBody.data.length).toBeLessThanOrEqual(10);
        logger.log(
          `✅ [VALIDATE] Response data length (${responseBody.data.length.toString()}) respects limit parameter`,
        );
        // Add specific assertions based on expected behavior
      });

      it('should validate input parameters', async () => {
        const invalidParams = {
          limit: 'invalid',
          offset: -1,
        };

        const response = await request(app.getHttpServer())
          .get('/[endpoint]')
          .query(invalidParams)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);

        const responseBody = response.body as { error: { message: string } };
        expect(responseBody.error).toMatchObject({
          message: expect.stringContaining('validation'),
        });
      });
    });

    describe('POST /[endpoint]', () => {
      it('should create new resource successfully', async () => {
        const createData = {
          // Define test creation data
          name: 'Test Resource',
          description: 'Integration test resource',
        };

        const response = await TestPerformanceMonitor.measure(
          'post-endpoint-create',
          async (): Promise<Response> => {
            return request(app.getHttpServer())
              .post('/[endpoint]')
              .set('Authorization', `Bearer ${authToken}`)
              .send(createData)
              .expect(201);
          },
        );

        // expect(response.body).toBeValidApiResponse();
        const responseBody = response.body as { data: Record<string, unknown> };
        expect(responseBody.data).toMatchObject(createData);

        // Verify data was persisted in database
        // const createdResource = await prismaService.[entity].findUnique({
        //   where: { id: response.body.data.id },
        // });
        // expect(createdResource).toBeDefined();
      });

      it('should validate required fields', async () => {
        const incompleteData = {
          name: 'Test Resource',
          // missing required fields
        };

        const response = await request(app.getHttpServer())
          .post('/[endpoint]')
          .set('Authorization', `Bearer ${authToken}`)
          .send(incompleteData)
          .expect(400);

        const responseBody = response.body as {
          error: { message: string; details: unknown[] };
        };
        expect(responseBody.error).toMatchObject({
          message: expect.stringContaining('validation'),
          details: expect.any(Array),
        });
      });

      it('should handle duplicate creation attempts', async () => {
        const createData = {
          name: 'Unique Resource',
          uniqueField: 'unique-value',
        };

        // First creation should succeed
        await request(app.getHttpServer())
          .post('/[endpoint]')
          .set('Authorization', `Bearer ${authToken}`)
          .send(createData)
          .expect(201);

        // Second creation should fail
        const response = await request(app.getHttpServer())
          .post('/[endpoint]')
          .set('Authorization', `Bearer ${authToken}`)
          .send(createData)
          .expect(409);

        const responseBody = response.body as { error: { message: string } };
        expect(responseBody.error.message).toContain('already exists');
      });
    });

    describe('PUT /[endpoint]/:id', () => {
      let resourceId: string;

      beforeEach(async () => {
        // Create a resource to update
        const createResponse = await request(app.getHttpServer())
          .post('/[endpoint]')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Resource to Update',
            description: 'Will be updated',
          })
          .expect(201);

        const createResponseBody = createResponse.body as {
          data: { id: string };
        };
        resourceId = createResponseBody?.data?.id;
      });

      it('should update resource successfully', async () => {
        const updateData = {
          name: 'Updated Resource',
          description: 'Has been updated',
        };

        const response = await request(app.getHttpServer())
          .put(`/[endpoint]/${resourceId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(updateData)
          .expect(200);

        const responseBody = response.body as {
          data: { id: string } & Record<string, unknown>;
        };
        expect(responseBody.data).toMatchObject(updateData);
        expect(responseBody.data.id).toBe(resourceId);

        // Verify update persisted in database
        // const updatedResource = await prismaService.[entity].findUnique({
        //   where: { id: resourceId },
        // });
        // expect(updatedResource).toMatchObject(updateData);
      });

      it('should return 404 for non-existent resource', async () => {
        const nonExistentId = 'non-existent-id';

        const response = await request(app.getHttpServer())
          .put(`/[endpoint]/${nonExistentId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ name: 'Updated Name' })
          .expect(404);

        const responseBody = response.body as { error: { message: string } };
        expect(responseBody.error.message).toContain('not found');
      });
    });

    describe('DELETE /[endpoint]/:id', () => {
      let resourceId: string;

      beforeEach(async () => {
        // Create a resource to delete
        const createResponse = await request(app.getHttpServer())
          .post('/[endpoint]')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Resource to Delete',
            description: 'Will be deleted',
          })
          .expect(201);

        const createResponseBody = createResponse.body as {
          data: { id: string };
        };
        resourceId = createResponseBody?.data?.id;
      });

      it('should delete resource successfully', async () => {
        await request(app.getHttpServer())
          .delete(`/[endpoint]/${resourceId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(204);

        // Verify deletion in database
        // const deletedResource = await prismaService.[entity].findUnique({
        //   where: { id: resourceId },
        // });
        // expect(deletedResource).toBeNull();
      });

      it('should return 404 when trying to delete non-existent resource', async () => {
        const nonExistentId = 'non-existent-id';

        const response = await request(app.getHttpServer())
          .delete(`/[endpoint]/${nonExistentId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);

        const responseBody = response.body as { error: { message: string } };
        expect(responseBody.error.message).toContain('not found');
      });
    });
  });

  describe('Authentication and Authorization', () => {
    it('should handle different user roles correctly', async () => {
      // Test with different user roles
      const roles = ['USER', 'ADMIN', 'MODERATOR'];

      for (const role of roles) {
        const roleUser = AuthTestUtils.DataFactory.createTestUser({
          role: role as any,
        });
        const roleToken = jwtService.sign({
          sub: roleUser.id,
          email: roleUser.email,
          role: roleUser.role,
        });

        await request(app.getHttpServer())
          .get('/[endpoint]')
          .set('Authorization', `Bearer ${roleToken}`)
          .expect(200);

        // Add role-specific assertions
        // expect(response.body).toBeValidApiResponse();
      }
    });

    it('should handle expired tokens', async () => {
      const expiredToken = jwtService.sign(
        {
          sub: testUser.id,
          email: testUser.email,
          role: testUser.role,
        },
        { expiresIn: '1ms' },
      );

      // Wait for token to expire
      await new Promise((resolve) => setTimeout(resolve, 10));

      const response = await request(app.getHttpServer())
        .get('/[endpoint]')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      const responseBody = response.body as { error: { message: string } };
      expect(responseBody.error.message).toContain('expired');
    });

    it('should handle invalid tokens', async () => {
      const invalidToken = 'invalid.token.format';

      const response = await request(app.getHttpServer())
        .get('/[endpoint]')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401);

      expect(response.body.error.message).toContain('Invalid');
    });
  });

  describe('Database Integration', () => {
    it('should handle database constraints properly', async () => {
      // Test database-level constraints
      const constraintViolationData = {
        // Data that would violate database constraints
      };

      const response = await request(app.getHttpServer())
        .post('/[endpoint]')
        .set('Authorization', `Bearer ${authToken}`)
        .send(constraintViolationData)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should handle concurrent operations correctly', async () => {
      // Test concurrent database operations
      const concurrentPromises = Array.from({ length: 10 }, (_, i) =>
        request(app.getHttpServer())
          .post('/[endpoint]')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: `Concurrent Resource ${i}`,
            uniqueField: `unique-${i}`,
          }),
      );

      const results = await Promise.all(concurrentPromises);

      // All should succeed or fail gracefully with detailed result analysis
      const statusCounts = { created: 0, conflict: 0, other: 0 };
      results.forEach((result: request.Response) => {
        if (result.status === 201) statusCounts.created++;
        else if (result.status === 409) statusCounts.conflict++;
        else statusCounts.other++;

        expect([201, 409]).toContain(result.status); // Created or conflict
      });

      logger.log(`✅ [CONCURRENCY] Operation results:`, statusCounts);
    });

    it('should maintain data consistency', async () => {
      // Test data consistency across operations
      const createResponse = await request(app.getHttpServer())
        .post('/[endpoint]')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Consistency Test' })
        .expect(201);

      const resourceId = createResponse.body?.data?.id as string;

      // Verify immediate consistency
      const getResponse = await request(app.getHttpServer())
        .get(`/[endpoint]/${resourceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(getResponse.body.data).toMatchObject({
        id: resourceId,
        name: 'Consistency Test',
      });
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle moderate load efficiently', async () => {
      const concurrentRequests = 50;
      logger.log(
        `📋 [PERFORMANCE] Starting load test with ${concurrentRequests} concurrent requests`,
      );

      const requestPromises = Array.from(
        { length: concurrentRequests },
        (_, index) => {
          logger.log(
            `🚀 [LOAD-TEST] Preparing request ${index + 1}/${concurrentRequests}`,
          );
          return TestPerformanceMonitor.measure(
            `load-test-request-${index}`,
            () =>
              request(app.getHttpServer())
                .get('/[endpoint]')
                .set('Authorization', `Bearer ${authToken}`),
          );
        },
      );

      const startTime = Date.now();
      logger.log('🚀 [LOAD-TEST] Executing concurrent requests batch');
      const results = await Promise.all(requestPromises);
      const endTime = Date.now();

      const totalTime = endTime - startTime;
      const averageResponseTime = totalTime / concurrentRequests;
      const successfulRequests = results.filter(
        (r: request.Response) => r.status === 200,
      ).length;

      logger.log(`✅ [PERFORMANCE] Load test completed:`, {
        totalTime: `${totalTime}ms`,
        averageResponseTime: `${averageResponseTime.toFixed(2)}ms`,
        successRate: `${((successfulRequests / concurrentRequests) * 100).toFixed(1)}%`,
        successfulRequests,
        totalRequests: concurrentRequests,
      });

      expect(successfulRequests).toBe(concurrentRequests);
      expect(averageResponseTime).toBeLessThan(100); // Average under 100ms
      expect(totalTime).toBeLessThan(5000); // Total under 5 seconds

      logger.log('✅ [PERFORMANCE] All load test performance criteria met');
    });

    it('should maintain performance with database operations', async () => {
      const operationCount = 100;
      logger.log(
        `📋 [DB-PERFORMANCE] Starting database performance test with ${operationCount} operations`,
      );

      const operations = Array.from({ length: operationCount }, (_, i) => {
        if (i % 20 === 0) {
          logger.log(
            `🚀 [DB-PERFORMANCE] Preparing operation batch ${Math.floor(i / 20) + 1}/5`,
          );
        }
        return request(app.getHttpServer())
          .post('/[endpoint]')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: `Performance Test Resource ${i}`,
            description: `Performance test ${i}`,
          });
      });

      const startTime = Date.now();
      logger.log('🚀 [DB-PERFORMANCE] Executing database operation batch');
      const results = await Promise.allSettled(operations);
      const endTime = Date.now();

      const totalTime = endTime - startTime;
      const successfulOperations = results.filter(
        (r): r is PromiseFulfilledResult<request.Response> =>
          r.status === 'fulfilled' &&
          (r.value as request.Response).status === 201,
      ).length;

      const failedOperations = operationCount - successfulOperations;
      const throughput = successfulOperations / (totalTime / 1000);
      const successRate = (successfulOperations / operationCount) * 100;

      logger.log(`✅ [DB-PERFORMANCE] Database performance test completed:`, {
        totalTime: `${totalTime}ms`,
        successfulOperations,
        failedOperations,
        successRate: `${successRate.toFixed(1)}%`,
        throughput: `${throughput.toFixed(2)} ops/sec`,
      });

      expect(successfulOperations).toBeGreaterThan(operationCount * 0.9); // 90% success rate
      expect(throughput).toBeGreaterThan(10); // At least 10 operations per second

      logger.log('✅ [DB-PERFORMANCE] All database performance criteria met');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed requests gracefully', async () => {
      const malformedPayload = 'invalid json';

      const response = await request(app.getHttpServer())
        .post('/[endpoint]')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send(malformedPayload)
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toContain('Invalid');
    });

    it('should handle service unavailability', async () => {
      // Simulate service unavailability (mock database down, etc.)
      // This would require specific mocking of database connection failures
    });

    it('should provide meaningful error messages', async () => {
      const invalidData = {
        name: '', // Empty required field
        invalidField: 'should not be accepted',
      };

      const response = await request(app.getHttpServer())
        .post('/[endpoint]')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toMatchObject({
        message: expect.any(String),
        details: expect.any(Array),
      });

      // Error message should be descriptive
      expect(response.body.error.message.length).toBeGreaterThan(10);
    });
  });
});

// Export test utilities for reuse
export const IntegrationTestUtils = {
  createTestUser: (
    overrides: Record<string, unknown> = {},
  ): Record<string, unknown> => ({
    id: `int-test-user-${Date.now()}`,
    email: `integration-test-${Date.now()}@example.com`,
    roles: ['USER'],
    ...overrides,
  }),

  createTestData: (
    overrides: Record<string, unknown> = {},
  ): Record<string, unknown> => ({
    name: `Integration Test Resource ${Date.now()}`,
    description: 'Created during integration testing',
    ...overrides,
  }),

  createAuthToken: (
    jwtService: JwtService,
    user: Record<string, unknown>,
  ): string => {
    return jwtService.sign({
      sub: user.id as string,
      email: user.email as string,
      roles: user.roles as string[],
    });
  },
};
