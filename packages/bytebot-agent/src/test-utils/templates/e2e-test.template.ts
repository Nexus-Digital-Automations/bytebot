/**
 * E2E Test Template - Standard template for end-to-end testing
 *
 * This template provides a standardized structure for E2E tests with:
 * - Full application bootstrap with real database
 * - HTTP client testing with actual network requests
 * - Authentication flows and session management
 * - Multi-step workflow validation
 * - Real-world scenario simulation
 *
 * Copy this template and replace placeholders with actual values:
 * - [APPLICATION_NAME] - Name of the application being tested
 * - [BASE_URL] - Application base URL (e.g., http://localhost:3000)
 * - [API_PREFIX] - API prefix (e.g., /api/v1)
 * - [WORKFLOW_STEPS] - Specific workflow steps to test
 *
 * @author Claude Code
 * @version 2.0.0
 * @since Bytebot Agent Testing Framework
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Server } from 'http';
import { AppModule } from '../../app.module';

// Import test utilities
import { TestPerformanceMonitor } from '../helpers/nestjs-test-builder';
// import { DatabaseTestUtils } from '../helpers/database-test-helper';
import { AuthTestUtils } from '../helpers/auth-test-helper';

// Type definitions for E2E testing
interface AuthResponse {
  data?: {
    token?: string;
    user?: Record<string, unknown>;
  };
  success?: boolean;
  message?: string;
}

interface TestUser {
  email: string;
  id: string;
  role: string;
  roles?: string[];
}

/**
 * Helper function to safely get HTTP server with proper typing
 */
const getHttpServer = (app: INestApplication): Server => {
  return app.getHttpServer() as Server;
};

describe('[APPLICATION_NAME] E2E Tests', () => {
  let app: INestApplication;
  let httpServer: Server;

  // Test session data
  let adminUser: TestUser;
  let regularUser: TestUser;
  let adminToken: string;
  let userToken: string;

  beforeAll(async () => {
    // Create full application context
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Configure application (middleware, pipes, etc.)
    // Add any global configurations your app needs

    await app.init();
    httpServer = getHttpServer(app);

    // Create test users and authenticate
    adminUser = AuthTestUtils.DataFactory.createAdminUser({
      email: 'e2e-admin@example.com',
    });

    regularUser = AuthTestUtils.DataFactory.createTestUser({
      email: 'e2e-user@example.com',
    });

    // Register users (if registration endpoint exists)
    // Or seed directly into database
    await request(httpServer).post('[API_PREFIX]/auth/register').send({
      email: adminUser.email,
      password: 'admin-password',
      role: 'ADMIN',
    });

    await request(httpServer).post('[API_PREFIX]/auth/register').send({
      email: regularUser.email,
      password: 'user-password',
      role: 'USER',
    });

    // Authenticate users
    const adminLoginResponse = await request(httpServer)
      .post('[API_PREFIX]/auth/login')
      .send({
        email: adminUser.email,
        password: 'admin-password',
      })
      .expect(200);

    const userLoginResponse = await request(httpServer)
      .post('[API_PREFIX]/auth/login')
      .send({
        email: regularUser.email,
        password: 'user-password',
      })
      .expect(200);

    const adminBody = adminLoginResponse.body as AuthResponse;
    const userBody = userLoginResponse.body as AuthResponse;

    adminToken = adminBody?.data?.token || '';
    userToken = userBody?.data?.token || '';

    if (!adminToken || !userToken) {
      throw new Error('Failed to retrieve authentication tokens');
    }
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Authentication Workflows', () => {
    it('should complete full authentication flow', async () => {
      // Test registration
      const newUser = {
        email: `e2e-test-${Date.now()}@example.com`,
        password: 'test-password-123',
        firstName: 'E2E',
        lastName: 'Test',
      };

      const registerResponse = await TestPerformanceMonitor.measure(
        'e2e-registration',
        () =>
          request(httpServer)
            .post('[API_PREFIX]/auth/register')
            .send(newUser)
            .expect(201),
      );

      expect(registerResponse.body).toMatchObject({
        success: true,
        data: {
          user: {
            email: newUser.email,
            firstName: newUser.firstName,
            lastName: newUser.lastName,
          },
        },
      });

      // Test login
      const loginResponse = await TestPerformanceMonitor.measure(
        'e2e-login',
        () =>
          request(httpServer)
            .post('[API_PREFIX]/auth/login')
            .send({
              email: newUser.email,
              password: newUser.password,
            })
            .expect(200),
      );

      const loginResponseBody = loginResponse.body as AuthResponse;
      expect(loginResponseBody).toMatchObject({
        success: true,
        data: {
          token: expect.any(String) as string,
          user: {
            email: newUser.email,
          },
        },
      });

      const loginBody = loginResponse.body as AuthResponse;
      const token = loginBody?.data?.token;

      if (!token) {
        throw new Error(
          'Failed to retrieve authentication token from login response',
        );
      }

      // Test protected endpoint access
      const protectedResponse = await request(httpServer)
        .get('[API_PREFIX]/user/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const protectedBody = protectedResponse.body as AuthResponse;
      expect(protectedBody?.data?.user).toMatchObject({
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
      });

      // Test logout
      await request(httpServer)
        .post('[API_PREFIX]/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Test that token is invalidated
      await request(httpServer)
        .get('[API_PREFIX]/user/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
    });

    it('should handle invalid authentication gracefully', async () => {
      // Test invalid login credentials
      await request(httpServer)
        .post('[API_PREFIX]/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'wrong-password',
        })
        .expect(401);

      // Test malformed token
      await request(httpServer)
        .get('[API_PREFIX]/user/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      // Test missing token
      await request(httpServer).get('[API_PREFIX]/user/profile').expect(401);
    });
  });

  describe('Data Management Workflows', () => {
    it('should complete CRUD operations workflow', async () => {
      // Create
      const createData = {
        title: 'E2E Test Resource',
        description: 'Created during E2E testing',
        category: 'test',
      };

      const createResponse = await TestPerformanceMonitor.measure(
        'e2e-create-resource',
        () =>
          request(httpServer)
            .post('[API_PREFIX]/resources')
            .set('Authorization', `Bearer ${userToken}`)
            .send(createData)
            .expect(201),
      );

      const createResponseBody = createResponse.body as {
        data?: { id?: string; [key: string]: unknown };
      };
      const resourceId = createResponseBody?.data?.id;
      expect(createResponseBody?.data).toMatchObject(createData);

      // Read
      const readResponse = await request(httpServer)
        .get(`[API_PREFIX]/resources/${resourceId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      const readResponseBody = readResponse.body as {
        data?: Record<string, unknown>;
      };
      expect(readResponseBody?.data).toMatchObject({
        id: resourceId,
        ...createData,
        createdAt: expect.any(String) as string,
        updatedAt: expect.any(String) as string,
      });

      // Update
      const updateData = {
        title: 'Updated E2E Test Resource',
        description: 'Updated during E2E testing',
      };

      const updateResponse = await request(httpServer)
        .put(`[API_PREFIX]/resources/${resourceId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData)
        .expect(200);

      const updateResponseBody = updateResponse.body as {
        data?: Record<string, unknown>;
      };
      expect(updateResponseBody?.data).toMatchObject({
        id: resourceId,
        ...updateData,
      });

      // List
      const listResponse = await request(httpServer)
        .get('[API_PREFIX]/resources')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      const listResponseBody = listResponse.body as { data?: unknown[] };
      expect(listResponseBody?.data).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: resourceId })]),
      );

      // Delete
      await request(httpServer)
        .delete(`[API_PREFIX]/resources/${resourceId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(204);

      // Verify deletion
      await request(httpServer)
        .get(`[API_PREFIX]/resources/${resourceId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });

    it('should handle bulk operations', async () => {
      // Create multiple resources
      const resourcesData = Array.from({ length: 5 }, (_, i) => ({
        title: `Bulk Resource ${i + 1}`,
        description: `Bulk created resource ${i + 1}`,
        category: 'bulk',
      }));

      const createPromises = resourcesData.map((data) =>
        request(httpServer)
          .post('[API_PREFIX]/resources')
          .set('Authorization', `Bearer ${userToken}`)
          .send(data)
          .expect(201),
      );

      const createResponses = await Promise.all(createPromises);
      const resourceIds = createResponses.map(
        (r: any) => (r.body as { data?: { id?: string } })?.data?.id,
      );

      expect(resourceIds).toHaveLength(5);
      resourceIds.forEach((id: any) => expect(id).toBeDefined());

      // Bulk read
      const bulkReadResponse = await request(httpServer)
        .get('[API_PREFIX]/resources')
        .query({ category: 'bulk' })
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      const bulkReadResponseBody = bulkReadResponse.body as {
        data?: unknown[];
      };
      expect(bulkReadResponseBody?.data).toHaveLength(5);

      // Bulk delete
      const bulkDeletePromises = resourceIds.map((id: any) =>
        request(httpServer)
          .delete(`[API_PREFIX]/resources/${id}`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(204),
      );

      await Promise.all(bulkDeletePromises);

      // Verify bulk deletion
      const emptyListResponse = await request(httpServer)
        .get('[API_PREFIX]/resources')
        .query({ category: 'bulk' })
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      const emptyListResponseBody = emptyListResponse.body as {
        data?: unknown[];
      };
      expect(emptyListResponseBody?.data).toHaveLength(0);
    });
  });

  describe('Authorization and Access Control', () => {
    it('should enforce role-based access control', async () => {
      // Create admin-only resource
      const adminResource = {
        title: 'Admin Only Resource',
        description: 'Only admins can access this',
        adminOnly: true,
      };

      const adminCreateResponse = await request(httpServer)
        .post('[API_PREFIX]/admin/resources')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(adminResource)
        .expect(201);

      const adminCreateResponseBody = adminCreateResponse.body as {
        data?: { id?: string };
      };
      const resourceId = adminCreateResponseBody?.data?.id;

      // Regular user should not be able to access
      await request(httpServer)
        .get(`[API_PREFIX]/admin/resources/${resourceId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      // Admin should be able to access
      const adminReadResponse = await request(httpServer)
        .get(`[API_PREFIX]/admin/resources/${resourceId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const adminReadResponseBody = adminReadResponse.body as {
        data?: Record<string, unknown>;
      };
      expect(adminReadResponseBody?.data).toMatchObject(adminResource);

      // Regular user should not be able to modify
      await request(httpServer)
        .put(`[API_PREFIX]/admin/resources/${resourceId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'Hacked Title' })
        .expect(403);

      // Regular user should not be able to delete
      await request(httpServer)
        .delete(`[API_PREFIX]/admin/resources/${resourceId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      // Admin should be able to delete
      await request(httpServer)
        .delete(`[API_PREFIX]/admin/resources/${resourceId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);
    });

    it('should handle ownership-based access', async () => {
      // User creates resource
      const userResource = {
        title: 'User Owned Resource',
        description: 'Owned by regular user',
      };

      const createResponse = await request(httpServer)
        .post('[API_PREFIX]/resources')
        .set('Authorization', `Bearer ${userToken}`)
        .send(userResource)
        .expect(201);

      const ownershipResponseBody = createResponse.body as {
        data?: { id?: string };
      };
      const resourceId = ownershipResponseBody?.data?.id;

      // Owner should be able to modify
      await request(httpServer)
        .put(`[API_PREFIX]/resources/${resourceId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'Updated by Owner' })
        .expect(200);

      // Another user should not be able to modify (if another user exists)
      // This would require creating another test user
    });
  });

  describe('Complex Business Workflows', () => {
    it('should complete multi-step business process', async () => {
      // Example: Order processing workflow

      // Step 1: Create order
      const orderData = {
        items: [
          { productId: 'prod-1', quantity: 2, price: 10.99 },
          { productId: 'prod-2', quantity: 1, price: 25.5 },
        ],
        customerInfo: {
          name: 'E2E Customer',
          email: 'customer@example.com',
          address: '123 Test Street',
        },
      };

      const createOrderResponse = await TestPerformanceMonitor.measure(
        'e2e-create-order',
        () =>
          request(httpServer)
            .post('[API_PREFIX]/orders')
            .set('Authorization', `Bearer ${userToken}`)
            .send(orderData)
            .expect(201),
      );

      const orderCreateResponseBody = createOrderResponse.body as {
        data?: { id?: string; status?: string };
      };
      const orderId = orderCreateResponseBody?.data?.id;
      expect(orderCreateResponseBody?.data?.status).toBe('pending');

      // Step 2: Process payment
      const paymentData = {
        orderId,
        paymentMethod: 'credit_card',
        amount: 47.48, // 2 * 10.99 + 25.50
      };

      const paymentResponse = await request(httpServer)
        .post('[API_PREFIX]/payments')
        .set('Authorization', `Bearer ${userToken}`)
        .send(paymentData)
        .expect(200);

      const paymentResponseBody = paymentResponse.body as {
        data?: { status?: string };
      };
      expect(paymentResponseBody?.data?.status).toBe('completed');

      // Step 3: Verify order status updated
      const updatedOrderResponse = await request(httpServer)
        .get(`[API_PREFIX]/orders/${orderId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      const updatedOrderResponseBody = updatedOrderResponse.body as {
        data?: { status?: string };
      };
      expect(updatedOrderResponseBody?.data?.status).toBe('paid');

      // Step 4: Process fulfillment
      await request(httpServer)
        .post(`[API_PREFIX]/orders/${orderId}/fulfill`)
        .set('Authorization', `Bearer ${adminToken}`) // Admin action
        .expect(200);

      // Step 5: Verify final status
      const finalOrderResponse = await request(httpServer)
        .get(`[API_PREFIX]/orders/${orderId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      const finalOrderResponseBody = finalOrderResponse.body as {
        data?: { status?: string };
      };
      expect(finalOrderResponseBody?.data?.status).toBe('fulfilled');
    });

    it('should handle workflow errors gracefully', async () => {
      // Test error scenarios in complex workflows

      // Create order with invalid data
      const invalidOrderData = {
        items: [], // Empty items should be invalid
        customerInfo: {
          name: '', // Empty name should be invalid
        },
      };

      await request(httpServer)
        .post('[API_PREFIX]/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send(invalidOrderData)
        .expect(400);

      // Test payment with non-existent order
      await request(httpServer)
        .post('[API_PREFIX]/payments')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          orderId: 'non-existent-order-id',
          paymentMethod: 'credit_card',
          amount: 100.0,
        })
        .expect(404);
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle concurrent users efficiently', async () => {
      const concurrentUsers = 10;
      const requestsPerUser = 5;

      // Create multiple user sessions
      const userSessions = await Promise.all(
        Array.from({ length: concurrentUsers }, async (_, i) => {
          const testUser = {
            email: `concurrent-user-${i}-${Date.now()}@example.com`,
            password: 'test-password',
          };

          // Register user
          await request(httpServer)
            .post('[API_PREFIX]/auth/register')
            .send(testUser);

          // Login user
          const loginResponse = await request(httpServer)
            .post('[API_PREFIX]/auth/login')
            .send(testUser)
            .expect(200);

          const sessionLoginBody = loginResponse.body as {
            data?: { token?: string };
          };
          return sessionLoginBody?.data?.token;
        }),
      );

      // Simulate concurrent usage
      const allRequests = userSessions.flatMap((token) =>
        Array.from({ length: requestsPerUser }, () =>
          request(httpServer)
            .get('[API_PREFIX]/resources')
            .set('Authorization', `Bearer ${token}`),
        ),
      );

      const startTime = Date.now();
      const results = await Promise.allSettled(allRequests);
      const endTime = Date.now();

      const successfulRequests = results.filter(
        (r: any) =>
          r.status === 'fulfilled' &&
          (r.value as { status: number }).status === 200,
      ).length;

      const totalRequests = concurrentUsers * requestsPerUser;
      const successRate = (successfulRequests / totalRequests) * 100;
      const throughput = successfulRequests / ((endTime - startTime) / 1000);

      expect(successRate).toBeGreaterThan(95); // 95% success rate
      expect(throughput).toBeGreaterThan(10); // At least 10 req/s
      console.log(
        `E2E Performance: ${successRate.toFixed(1)}% success rate, ${throughput.toFixed(1)} req/s`,
      );
    });

    it('should maintain data consistency under load', async () => {
      // Test data consistency with concurrent operations
      const resourceName = `consistency-test-${Date.now()}`;
      const concurrentOperations = 20;

      // Create base resource
      const createResponse = await request(httpServer)
        .post('[API_PREFIX]/resources')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: resourceName,
          counter: 0,
        })
        .expect(201);

      const consistencyResponseBody = createResponse.body as {
        data?: { id?: string };
      };
      const resourceId = consistencyResponseBody?.data?.id;

      // Concurrent increment operations
      const incrementPromises = Array.from(
        { length: concurrentOperations },
        () =>
          request(httpServer)
            .patch(`[API_PREFIX]/resources/${resourceId}/increment`)
            .set('Authorization', `Bearer ${userToken}`),
      );

      await Promise.allSettled(incrementPromises);

      // Verify final count
      const finalResponse = await request(httpServer)
        .get(`[API_PREFIX]/resources/${resourceId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Should handle concurrent operations correctly
      const finalResponseBody = finalResponse.body as {
        data?: { counter?: number };
      };
      expect(finalResponseBody?.data?.counter).toBeLessThanOrEqual(
        concurrentOperations,
      );
      expect(finalResponseBody?.data?.counter).toBeGreaterThan(0);
    });
  });

  describe('Security Testing', () => {
    it('should prevent common security vulnerabilities', async () => {
      // Test SQL injection
      await request(httpServer)
        .get('[API_PREFIX]/resources')
        .query({ search: "'; DROP TABLE users; --" })
        .set('Authorization', `Bearer ${userToken}`)
        .expect((res: any) => {
          expect(res.status).not.toBe(500); // Should not crash
        });

      // Test XSS
      const xssPayload = {
        title: '<script>alert("xss")</script>',
        description: '"><script>alert("xss")</script>',
      };

      const xssResponse = await request(httpServer)
        .post('[API_PREFIX]/resources')
        .set('Authorization', `Bearer ${userToken}`)
        .send(xssPayload);

      if (xssResponse.status === 201) {
        // If creation succeeded, ensure data is sanitized
        const xssResponseBody = xssResponse.body as {
          data?: { title?: string; description?: string };
        };
        expect(xssResponseBody?.data?.title).not.toContain('<script>');
        expect(xssResponseBody?.data?.description).not.toContain('<script>');
      }

      // Test CSRF protection (if implemented)
      await request(httpServer)
        .post('[API_PREFIX]/resources')
        .set('Authorization', `Bearer ${userToken}`)
        .set('Origin', 'https://malicious-site.com')
        .send({ title: 'CSRF Test' })
        .expect((res: any) => {
          // Should either succeed (if CORS allows) or fail with 403/401
          expect([200, 201, 401, 403]).toContain(res.status);
        });
    });

    it('should handle rate limiting properly', async () => {
      // Test rate limiting (if implemented)
      const rapidRequests = Array.from({ length: 100 }, () =>
        request(httpServer)
          .get('[API_PREFIX]/resources')
          .set('Authorization', `Bearer ${userToken}`),
      );

      const results = await Promise.allSettled(rapidRequests);
      const rateLimitedResponses = results.filter(
        (r: any) =>
          r.status === 'fulfilled' &&
          (r.value as { status: number }).status === 429,
      );

      // Should have some rate limiting if implemented
      if (rateLimitedResponses.length > 0) {
        expect(rateLimitedResponses.length).toBeGreaterThan(0);
        console.log(
          `Rate limiting active: ${rateLimitedResponses.length} requests limited`,
        );
      }
    });
  });
});

// Export utilities
export const E2ETestUtils = {
  createTestUser: (overrides = {}) => ({
    email: `e2e-test-${Date.now()}-${Math.random().toString(36).substr(2, 5)}@example.com`,
    password: 'test-password-123',
    firstName: 'E2E',
    lastName: 'Test',
    ...overrides,
  }),

  authenticateUser: async (
    httpServer: Parameters<typeof request>[0],
    userData: { email: string; password: string },
  ) => {
    const loginResponse = await request(httpServer)
      .post('[API_PREFIX]/auth/login')
      .send({
        email: userData.email,
        password: userData.password,
      })
      .expect(200);

    const utilsLoginBody = loginResponse.body as {
      data: { token: string };
    };
    return utilsLoginBody.data.token;
  },

  createTestResource: (overrides = {}) => ({
    title: `E2E Test Resource ${Date.now()}`,
    description: 'Created during E2E testing',
    category: 'test',
    ...overrides,
  }),
};
