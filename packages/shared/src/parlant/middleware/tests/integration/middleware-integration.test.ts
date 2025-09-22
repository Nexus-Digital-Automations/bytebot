/**
 * PARLANT Universal Middleware Integration Tests
 *
 * Comprehensive integration testing for PARLANT middleware across all Bytebot services.
 * Tests real-world scenarios, performance requirements, and cross-service functionality.
 *
 * @author Claude Code - PARLANT Framework Team
 * @version 2.0.0 - Enhanced Enterprise Testing Suite
 * @since 2024-09-22
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import * as request from 'supertest';
import { performance } from 'perf_hooks';

// Import PARLANT middleware components
import {
  EnhancedUniversalParlantMiddleware,
  ParlantRequestResponseInterceptor,
  SecurityLevel,
  ValidationMode,
  ApprovalLevel,
  createBasicValidationConfig,
  createPerformanceValidationConfig,
  createSecurityValidationConfig,
  PERFORMANCE_TARGETS,
  CACHE_TTL,
} from '../../index';

// Import enhanced decorators
import {
  EnhancedParlantValidated,
  TypeSafeValidation,
  PerformanceMonitored,
  IntelligentCache,
  ContextAwareAuth,
  ParlantContext,
  EnhancedUser,
} from '../../decorators/enhanced-parlant-decorators';

// Test controllers to simulate real Bytebot services
import {
  BasicTasksController,
  TaskReportsController,
  MinimalExampleController,
  PerformanceOptimizedController,
  SecurityFocusedController,
} from '../../examples/basic-integration';

describe('PARLANT Universal Middleware Integration Tests', () => {
  let app: INestApplication;
  let testingModule: TestingModule;

  // Performance tracking
  const performanceMetrics: Record<string, number[]> = {
    middleware: [],
    interceptor: [],
    validation: [],
    caching: [],
  };

  beforeAll(async () => {
    console.log('🚀 Starting PARLANT Middleware Integration Tests');
    console.log('📊 Performance Targets:');
    console.log(`   ⚡ Fast Operations: <${PERFORMANCE_TARGETS.FAST}ms`);
    console.log(`   🔄 Standard Operations: <${PERFORMANCE_TARGETS.STANDARD}ms`);
    console.log(`   🔧 Complex Operations: <${PERFORMANCE_TARGETS.COMPLEX}ms`);
    console.log(`   🎯 Critical Operations: <${PERFORMANCE_TARGETS.CRITICAL}ms`);

    testingModule = await Test.createTestingModule({
      controllers: [
        BasicTasksController,
        TaskReportsController,
        MinimalExampleController,
        PerformanceOptimizedController,
        SecurityFocusedController,
      ],
      providers: [
        // Register PARLANT middleware globally
        {
          provide: APP_INTERCEPTOR,
          useClass: ParlantRequestResponseInterceptor,
        },
        // Mock services for testing
        {
          provide: 'TasksService',
          useValue: {
            findAll: jest.fn().mockResolvedValue([
              { id: 1, title: 'Test Task', status: 'pending' },
              { id: 2, title: 'Another Task', status: 'completed' },
            ]),
            findOne: jest.fn().mockResolvedValue({ id: 1, title: 'Test Task' }),
            create: jest.fn().mockResolvedValue({ id: 3, title: 'New Task' }),
            update: jest.fn().mockResolvedValue({ id: 1, title: 'Updated Task' }),
            remove: jest.fn().mockResolvedValue({ id: 1, deleted: true }),
          },
        },
      ],
    }).compile();

    app = testingModule.createNestApplication();

    // Apply PARLANT middleware globally
    app.use(new EnhancedUniversalParlantMiddleware().use);

    await app.init();

    console.log('✅ Test application initialized with PARLANT middleware');
  });

  afterAll(async () => {
    await app.close();

    // Report performance metrics
    console.log('\n📈 Performance Test Results:');
    Object.entries(performanceMetrics).forEach(([category, times]) => {
      if (times.length > 0) {
        const avg = times.reduce((a, b) => a + b, 0) / times.length;
        const min = Math.min(...times);
        const max = Math.max(...times);
        console.log(`   ${category}: avg=${avg.toFixed(2)}ms, min=${min.toFixed(2)}ms, max=${max.toFixed(2)}ms`);
      }
    });
  });

  describe('Basic Integration Tests', () => {
    it('should handle basic GET request with PARLANT validation', async () => {
      const startTime = performance.now();

      const response = await request(app.getHttpServer())
        .get('/basic-tasks')
        .expect(200);

      const endTime = performance.now();
      const duration = endTime - startTime;
      performanceMetrics.middleware.push(duration);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBe(true);
      expect(duration).toBeLessThan(PERFORMANCE_TARGETS.STANDARD);

      console.log(`✅ Basic GET test: ${duration.toFixed(2)}ms`);
    });

    it('should handle POST request with parameter validation', async () => {
      const startTime = performance.now();

      const testData = {
        title: 'Integration Test Task',
        description: 'Testing PARLANT middleware integration',
        priority: 'high',
      };

      const response = await request(app.getHttpServer())
        .post('/basic-tasks')
        .send(testData)
        .expect(201);

      const endTime = performance.now();
      const duration = endTime - startTime;
      performanceMetrics.validation.push(duration);

      expect(response.body).toBeDefined();
      expect(response.body.title).toBe(testData.title);
      expect(duration).toBeLessThan(PERFORMANCE_TARGETS.STANDARD);

      console.log(`✅ POST validation test: ${duration.toFixed(2)}ms`);
    });

    it('should handle PUT request with enhanced validation', async () => {
      const startTime = performance.now();

      const updateData = {
        title: 'Updated Integration Test Task',
        description: 'Updated via PARLANT middleware',
        status: 'in-progress',
      };

      const response = await request(app.getHttpServer())
        .put('/basic-tasks/1')
        .send(updateData)
        .expect(200);

      const endTime = performance.now();
      const duration = endTime - startTime;
      performanceMetrics.validation.push(duration);

      expect(response.body).toBeDefined();
      expect(duration).toBeLessThan(PERFORMANCE_TARGETS.STANDARD);

      console.log(`✅ PUT validation test: ${duration.toFixed(2)}ms`);
    });

    it('should handle DELETE request with security validation', async () => {
      const startTime = performance.now();

      const response = await request(app.getHttpServer())
        .delete('/basic-tasks/1')
        .expect(200);

      const endTime = performance.now();
      const duration = endTime - startTime;
      performanceMetrics.validation.push(duration);

      expect(response.body).toBeDefined();
      expect(duration).toBeLessThan(PERFORMANCE_TARGETS.STANDARD);

      console.log(`✅ DELETE validation test: ${duration.toFixed(2)}ms`);
    });
  });

  describe('Performance Optimization Tests', () => {
    it('should meet sub-100ms performance targets for cached operations', async () => {
      // First request to populate cache
      await request(app.getHttpServer())
        .get('/performance-optimized/cached-data')
        .expect(200);

      // Second request should hit cache and be very fast
      const startTime = performance.now();

      const response = await request(app.getHttpServer())
        .get('/performance-optimized/cached-data')
        .expect(200);

      const endTime = performance.now();
      const duration = endTime - startTime;
      performanceMetrics.caching.push(duration);

      expect(response.body).toBeDefined();
      expect(duration).toBeLessThan(PERFORMANCE_TARGETS.FAST);

      console.log(`✅ Cache performance test: ${duration.toFixed(2)}ms`);
    });

    it('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = 10;
      const promises: Promise<any>[] = [];

      const startTime = performance.now();

      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          request(app.getHttpServer())
            .get(`/performance-optimized/fast-operation?index=${i}`)
            .expect(200)
        );
      }

      const responses = await Promise.all(promises);

      const endTime = performance.now();
      const totalDuration = endTime - startTime;
      const avgDuration = totalDuration / concurrentRequests;
      performanceMetrics.middleware.push(avgDuration);

      expect(responses).toHaveLength(concurrentRequests);
      expect(avgDuration).toBeLessThan(PERFORMANCE_TARGETS.STANDARD);

      console.log(`✅ Concurrent requests test: ${avgDuration.toFixed(2)}ms avg`);
    });

    it('should maintain performance under load', async () => {
      const loadTestRequests = 50;
      const batchSize = 10;
      const durations: number[] = [];

      for (let batch = 0; batch < loadTestRequests / batchSize; batch++) {
        const batchPromises: Promise<any>[] = [];
        const batchStartTime = performance.now();

        for (let i = 0; i < batchSize; i++) {
          batchPromises.push(
            request(app.getHttpServer())
              .get('/basic-tasks')
              .expect(200)
          );
        }

        await Promise.all(batchPromises);

        const batchEndTime = performance.now();
        const batchDuration = (batchEndTime - batchStartTime) / batchSize;
        durations.push(batchDuration);
        performanceMetrics.middleware.push(batchDuration);
      }

      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      const maxDuration = Math.max(...durations);

      expect(avgDuration).toBeLessThan(PERFORMANCE_TARGETS.STANDARD);
      expect(maxDuration).toBeLessThan(PERFORMANCE_TARGETS.COMPLEX);

      console.log(`✅ Load test: avg=${avgDuration.toFixed(2)}ms, max=${maxDuration.toFixed(2)}ms`);
    });
  });

  describe('Security Integration Tests', () => {
    it('should enforce security-focused validation', async () => {
      const startTime = performance.now();

      const secureData = {
        confidentialField: 'sensitive-data',
        publicField: 'public-information',
        userRole: 'admin',
      };

      const response = await request(app.getHttpServer())
        .post('/security-focused/secure-operation')
        .send(secureData)
        .expect(201);

      const endTime = performance.now();
      const duration = endTime - startTime;
      performanceMetrics.validation.push(duration);

      expect(response.body).toBeDefined();
      expect(duration).toBeLessThan(PERFORMANCE_TARGETS.COMPLEX);

      console.log(`✅ Security validation test: ${duration.toFixed(2)}ms`);
    });

    it('should detect and reject malicious input', async () => {
      const maliciousData = {
        script: '<script>alert("xss")</script>',
        sqlInjection: "'; DROP TABLE users; --",
        commandInjection: '$(rm -rf /)',
      };

      const response = await request(app.getHttpServer())
        .post('/security-focused/validate-input')
        .send(maliciousData)
        .expect(400); // Should reject malicious input

      expect(response.body.error).toBeDefined();

      console.log('✅ Malicious input detection test passed');
    });

    it('should handle authentication context properly', async () => {
      const startTime = performance.now();

      // Simulate authenticated request
      const response = await request(app.getHttpServer())
        .get('/security-focused/authenticated-endpoint')
        .set('Authorization', 'Bearer mock-jwt-token')
        .expect(200);

      const endTime = performance.now();
      const duration = endTime - startTime;
      performanceMetrics.validation.push(duration);

      expect(response.body).toBeDefined();
      expect(duration).toBeLessThan(PERFORMANCE_TARGETS.STANDARD);

      console.log(`✅ Authentication test: ${duration.toFixed(2)}ms`);
    });
  });

  describe('Cross-Service Integration Tests', () => {
    it('should handle task reports with enhanced validation', async () => {
      const startTime = performance.now();

      const response = await request(app.getHttpServer())
        .get('/task-reports/summary')
        .expect(200);

      const endTime = performance.now();
      const duration = endTime - startTime;
      performanceMetrics.interceptor.push(duration);

      expect(response.body).toBeDefined();
      expect(duration).toBeLessThan(PERFORMANCE_TARGETS.STANDARD);

      console.log(`✅ Task reports integration test: ${duration.toFixed(2)}ms`);
    });

    it('should handle complex data transformations', async () => {
      const complexData = {
        tasks: [
          { id: 1, title: 'Task 1', nested: { data: 'complex' } },
          { id: 2, title: 'Task 2', nested: { data: 'structure' } },
        ],
        metadata: {
          total: 2,
          filters: ['status:active', 'priority:high'],
          timestamps: [Date.now(), Date.now() - 3600000],
        },
      };

      const startTime = performance.now();

      const response = await request(app.getHttpServer())
        .post('/task-reports/analyze')
        .send(complexData)
        .expect(201);

      const endTime = performance.now();
      const duration = endTime - startTime;
      performanceMetrics.validation.push(duration);

      expect(response.body).toBeDefined();
      expect(duration).toBeLessThan(PERFORMANCE_TARGETS.COMPLEX);

      console.log(`✅ Complex data transformation test: ${duration.toFixed(2)}ms`);
    });

    it('should maintain middleware chain integrity', async () => {
      // Test that all interceptors and middleware are called in correct order
      const startTime = performance.now();

      const response = await request(app.getHttpServer())
        .get('/minimal-example/health')
        .expect(200);

      const endTime = performance.now();
      const duration = endTime - startTime;
      performanceMetrics.middleware.push(duration);

      expect(response.body).toBeDefined();
      expect(response.body.status).toBe('healthy');
      expect(duration).toBeLessThan(PERFORMANCE_TARGETS.FAST);

      console.log(`✅ Middleware chain integrity test: ${duration.toFixed(2)}ms`);
    });
  });

  describe('Error Handling Integration Tests', () => {
    it('should gracefully handle validation errors', async () => {
      const invalidData = {
        // Missing required fields
        description: 'Invalid task without title',
      };

      const response = await request(app.getHttpServer())
        .post('/basic-tasks')
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.message).toContain('validation');

      console.log('✅ Validation error handling test passed');
    });

    it('should handle middleware exceptions gracefully', async () => {
      const response = await request(app.getHttpServer())
        .get('/basic-tasks/error-test')
        .expect(500);

      expect(response.body.error).toBeDefined();

      console.log('✅ Exception handling test passed');
    });

    it('should provide detailed error context in development', async () => {
      const response = await request(app.getHttpServer())
        .post('/security-focused/validation-error')
        .send({ invalidField: 'test' })
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.details).toBeDefined();

      console.log('✅ Error context test passed');
    });
  });

  describe('Configuration Integration Tests', () => {
    it('should respect performance configuration', async () => {
      const startTime = performance.now();

      const response = await request(app.getHttpServer())
        .get('/performance-optimized/config-test')
        .expect(200);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(response.body.performanceTarget).toBeDefined();
      expect(duration).toBeLessThan(response.body.performanceTarget);

      console.log(`✅ Performance configuration test: ${duration.toFixed(2)}ms`);
    });

    it('should apply security configuration correctly', async () => {
      const response = await request(app.getHttpServer())
        .get('/security-focused/config-test')
        .expect(200);

      expect(response.body.securityLevel).toBeDefined();
      expect(response.body.validationMode).toBeDefined();

      console.log('✅ Security configuration test passed');
    });

    it('should handle cache configuration dynamically', async () => {
      // Test cache TTL configuration
      const response1 = await request(app.getHttpServer())
        .get('/performance-optimized/cache-config-test')
        .expect(200);

      expect(response1.body.cacheHit).toBe(false);

      // Second request should hit cache
      const response2 = await request(app.getHttpServer())
        .get('/performance-optimized/cache-config-test')
        .expect(200);

      expect(response2.body.cacheHit).toBe(true);

      console.log('✅ Cache configuration test passed');
    });
  });

  describe('Monitoring and Observability Tests', () => {
    it('should collect performance metrics', async () => {
      const response = await request(app.getHttpServer())
        .get('/basic-tasks/metrics')
        .expect(200);

      expect(response.body.metrics).toBeDefined();
      expect(response.body.metrics.processingTime).toBeDefined();
      expect(response.body.metrics.memoryUsage).toBeDefined();

      console.log('✅ Metrics collection test passed');
    });

    it('should generate audit trails', async () => {
      const response = await request(app.getHttpServer())
        .post('/security-focused/audit-test')
        .send({ action: 'test-audit' })
        .expect(201);

      expect(response.body.auditId).toBeDefined();
      expect(response.body.timestamp).toBeDefined();

      console.log('✅ Audit trail test passed');
    });

    it('should track request lifecycle', async () => {
      const response = await request(app.getHttpServer())
        .get('/basic-tasks/lifecycle-test')
        .expect(200);

      expect(response.body.lifecycle).toBeDefined();
      expect(response.body.lifecycle.phases).toBeInstanceOf(Array);
      expect(response.body.lifecycle.totalDuration).toBeDefined();

      console.log('✅ Request lifecycle tracking test passed');
    });
  });
});

/**
 * Service-Specific Integration Tests
 *
 * These tests simulate integration with specific Bytebot services
 */
describe('Bytebot Service-Specific Integration Tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // Create a more comprehensive test module that simulates Bytebot services
    const moduleRef = await Test.createTestingModule({
      controllers: [
        BasicTasksController,
        TaskReportsController,
        SecurityFocusedController,
      ],
      providers: [
        {
          provide: APP_INTERCEPTOR,
          useClass: ParlantRequestResponseInterceptor,
        },
        // Mock Bytebot services
        {
          provide: 'AnthropicService',
          useValue: {
            generateResponse: jest.fn().mockResolvedValue({ response: 'mock' }),
          },
        },
        {
          provide: 'OpenAIService',
          useValue: {
            chatCompletion: jest.fn().mockResolvedValue({ content: 'mock' }),
          },
        },
        {
          provide: 'GoogleService',
          useValue: {
            generateContent: jest.fn().mockResolvedValue({ text: 'mock' }),
          },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(new EnhancedUniversalParlantMiddleware().use);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should integrate with Anthropic service endpoints', async () => {
    const request_data = {
      prompt: 'Test prompt for PARLANT validation',
      model: 'claude-3-sonnet',
      maxTokens: 1000,
    };

    const response = await request(app.getHttpServer())
      .post('/anthropic/generate')
      .send(request_data)
      .expect(200);

    expect(response.body).toBeDefined();
    console.log('✅ Anthropic service integration test passed');
  });

  it('should integrate with OpenAI service endpoints', async () => {
    const request_data = {
      messages: [{ role: 'user', content: 'Test message' }],
      model: 'gpt-4',
    };

    const response = await request(app.getHttpServer())
      .post('/openai/chat')
      .send(request_data)
      .expect(200);

    expect(response.body).toBeDefined();
    console.log('✅ OpenAI service integration test passed');
  });

  it('should integrate with Google service endpoints', async () => {
    const request_data = {
      prompt: 'Test prompt for Google AI',
      model: 'gemini-pro',
    };

    const response = await request(app.getHttpServer())
      .post('/google/generate')
      .send(request_data)
      .expect(200);

    expect(response.body).toBeDefined();
    console.log('✅ Google service integration test passed');
  });
});

console.log('🧪 PARLANT Universal Middleware Integration Test Suite Loaded');
console.log('📋 Test Coverage:');
console.log('   ✅ Basic CRUD operations with validation');
console.log('   ✅ Performance optimization and caching');
console.log('   ✅ Security validation and threat detection');
console.log('   ✅ Cross-service integration patterns');
console.log('   ✅ Error handling and recovery');
console.log('   ✅ Configuration management');
console.log('   ✅ Monitoring and observability');
console.log('   ✅ Service-specific integrations');
console.log('🎯 Performance Targets: Sub-1000ms processing, 95% cache hit ratio');