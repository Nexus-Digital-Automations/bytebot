/**
 * Integration Test Template - Standard template for NestJS integration tests
 *
 * This template provides a standardized structure for integration tests with:
 * - Full NestJS application context with real dependencies
 * - Database integration with transaction isolation
 * - HTTP request simulation with proper middleware
 * - Authentication and authorization testing
 * - Performance monitoring and resource management
 *
 * Copy this template and replace placeholders with actual values:
 * - [MODULE_NAME] - Name of the module being tested
 * - [CONTROLLER_CLASS] - Actual controller class
 * - [SERVICE_DEPENDENCIES] - Real service dependencies
 * - [API_ENDPOINTS] - Specific API endpoints to test
 * - [DATABASE_ENTITIES] - Database entities involved
 *
 * @author Claude Code
 * @version 2.0.0
 * @since Bytebot Agent Testing Framework
 */

import { TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';

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

    // Create test user and authentication token
    testUser = AuthTestUtils.DataFactory.createTestUser();
    authToken = jwtService.sign({
      sub: testUser.id,
      email: testUser.email,
      role: testUser.role,
    });
  });

  afterAll(async () => {
    // Cleanup in reverse order
    await dbHelper.runCleanup();
    await app.close();
    if (testingModule) {
      await testingModule.close();
    }
  });

  beforeEach(async () => {
    // Reset database state for each test
    await dbHelper.reset();

    // Seed required test data
    await prismaService.user.create({
      data: {
        id: testUser.id,
        email: testUser.email,
        username: testUser.username || `user_${testUser.id}`,
        passwordHash: 'test-password-hash',
        // Add other required fields based on your Prisma schema
      },
    });
  });

  describe('HTTP Endpoints', () => {
    describe('GET /[endpoint]', () => {
      it('should return [expected_data] for authenticated user', async () => {
        const response = await TestPerformanceMonitor.measure(
          'get-endpoint-authenticated',
          async () => {
            return request(app.getHttpServer())
              .get('/[endpoint]')
              .set('Authorization', `Bearer ${authToken}`)
              .expect(200);
          },
        );

        expect(response.body).toMatchObject({
          success: true,
          data: expect.any(Array),
        });

        // Validate response structure
        // expect(response.body).toBeValidApiResponse();

        // Performance assertions
        // expect(response.duration).toBeLessThan(1000); // Should complete within 1 second
      });

      it('should return 401 for unauthenticated user', async () => {
        const response = await request(app.getHttpServer())
          .get('/[endpoint]')
          .expect(401);

        expect(response.body).toMatchObject({
          success: false,
          error: expect.objectContaining({
            message: expect.stringContaining('Authentication'),
          }),
        });
      });

      it('should handle query parameters correctly', async () => {
        const queryParams = {
          limit: '10',
          offset: '0',
          sortBy: 'createdAt',
          order: 'desc',
        };

        const response = await request(app.getHttpServer())
          .get('/[endpoint]')
          .query(queryParams)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.data.length).toBeLessThanOrEqual(10);
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

        expect(response.body.error).toMatchObject({
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
          async () => {
            return request(app.getHttpServer())
              .post('/[endpoint]')
              .set('Authorization', `Bearer ${authToken}`)
              .send(createData)
              .expect(201);
          },
        );

        // expect(response.body).toBeValidApiResponse();
        expect(response.body.data).toMatchObject(createData);

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

        expect(response.body.error).toMatchObject({
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

        expect(response.body.error.message).toContain('already exists');
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

        resourceId = createResponse.body?.data?.id as string;
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

        expect(response.body.data).toMatchObject(updateData);
        expect(response.body.data.id).toBe(resourceId);

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

        expect(response.body.error.message).toContain('not found');
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

        resourceId = createResponse.body?.data?.id as string;
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

        expect(response.body.error.message).toContain('not found');
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

      expect(response.body.error.message).toContain('expired');
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

      // All should succeed or fail gracefully
      results.forEach((result) => {
        expect([201, 409]).toContain(result.status); // Created or conflict
      });
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
      const requestPromises = Array.from({ length: concurrentRequests }, () =>
        TestPerformanceMonitor.measure('load-test-request', () =>
          request(app.getHttpServer())
            .get('/[endpoint]')
            .set('Authorization', `Bearer ${authToken}`),
        ),
      );

      const startTime = Date.now();
      const results = await Promise.all(requestPromises);
      const endTime = Date.now();

      const totalTime = endTime - startTime;
      const averageResponseTime = totalTime / concurrentRequests;
      const successfulRequests = results.filter((r) => r.status === 200).length;

      expect(successfulRequests).toBe(concurrentRequests);
      expect(averageResponseTime).toBeLessThan(100); // Average under 100ms
      expect(totalTime).toBeLessThan(5000); // Total under 5 seconds
    });

    it('should maintain performance with database operations', async () => {
      const operationCount = 100;
      const operations = Array.from({ length: operationCount }, (_, i) =>
        request(app.getHttpServer())
          .post('/[endpoint]')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: `Performance Test Resource ${i}`,
            description: `Performance test ${i}`,
          }),
      );

      const startTime = Date.now();
      const results = await Promise.allSettled(operations);
      const endTime = Date.now();

      const successfulOperations = results.filter(
        (r) => r.status === 'fulfilled' && (r.value as any).status === 201,
      ).length;

      const throughput = successfulOperations / ((endTime - startTime) / 1000);

      expect(successfulOperations).toBeGreaterThan(operationCount * 0.9); // 90% success rate
      expect(throughput).toBeGreaterThan(10); // At least 10 operations per second
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
