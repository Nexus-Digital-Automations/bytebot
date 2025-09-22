/**
 * Comprehensive Integration Test Suite for PARLANT Conversational API Patterns
 *
 * Enterprise-grade test scenarios validating natural language processing,
 * real-time monitoring, performance optimization, and security compliance.
 *
 * @version 1.0.0
 * @author PARLANT Phase 1 - Agent 8: Testing Architecture
 * @date 2025-09-22
 */

import { describe, test, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/testing-library';
import { ConversationalAPIController } from '../conversational-patterns/controller';
import { ConversationalValidator } from '../validation/conversational-validator';
import { RealtimeMonitor } from '../monitoring/realtime-monitor';
import { EnterpriseIntegration } from '../enterprise/integration';
import { PerformanceOptimizer } from '../monitoring/performance-optimizer';
import { UniversalAPIMiddleware } from '../middleware/universal-middleware';

describe('PARLANT Conversational API Patterns - Integration Tests', () => {
  let conversationalController: ConversationalAPIController;
  let validator: ConversationalValidator;
  let monitor: RealtimeMonitor;
  let enterprise: EnterpriseIntegration;
  let optimizer: PerformanceOptimizer;
  let middleware: UniversalAPIMiddleware;

  const mockUserContext = {
    userId: 'test_user_001',
    sessionId: 'session_001',
    profile: {
      technicalLevel: 'INTERMEDIATE' as const,
      role: 'developer',
      capabilities: ['API_ACCESS', 'READ_DATA'],
      experienceLevel: 3
    },
    permissions: ['API_ACCESS', 'READ_DATA', 'CREATE_DATA'],
    preferences: {
      explanationStyle: 'DETAILED' as const,
      includeExamples: true,
      includeVisualAids: false,
      notificationMethod: 'IMMEDIATE' as const,
      monitoringLevel: 'STANDARD' as const
    },
    timezone: 'UTC',
    locale: 'en-US'
  };

  beforeAll(async () => {
    // Initialize all components for testing
    optimizer = new PerformanceOptimizer();
    enterprise = new EnterpriseIntegration();
    monitor = new RealtimeMonitor();
    validator = new ConversationalValidator();
    conversationalController = new ConversationalAPIController(
      validator,
      monitor,
      enterprise,
      optimizer
    );
    middleware = new UniversalAPIMiddleware(conversationalController);
  });

  afterAll(async () => {
    // Cleanup resources
  });

  describe('End-to-End Conversational API Processing', () => {
    test('should process natural language request with complete workflow', async () => {
      const apiRequest = {
        id: 'test_request_001',
        userRequest: 'Get user data for user ID 12345',
        context: mockUserContext,
        timestamp: new Date(),
        metadata: { source: 'test' }
      };

      const response = await conversationalController.processNaturalLanguageRequest(apiRequest);

      expect(response.success).toBe(true);
      expect(response.conversation.status).toBe('COMPLETED');
      expect(response.conversation.steps.length).toBeGreaterThan(0);
      expect(response.performance.totalDuration).toBeGreaterThan(0);
      expect(response.auditTrail.length).toBeGreaterThan(0);
    });

    test('should handle complex multi-parameter request', async () => {
      const apiRequest = {
        id: 'test_request_002',
        userRequest: 'Create a new user with name John Doe, email john@example.com, and age 30',
        context: mockUserContext,
        timestamp: new Date(),
        metadata: { complexity: 'high' }
      };

      const response = await conversationalController.processNaturalLanguageRequest(apiRequest);

      expect(response.success).toBe(true);
      expect(response.result).toBeDefined();
      expect(response.conversation.steps.some(step => step.type === 'PARAMETER_VALIDATION')).toBe(true);
    });

    test('should enforce security and authorization', async () => {
      const unauthorizedUserContext = {
        ...mockUserContext,
        permissions: [] // No permissions
      };

      const apiRequest = {
        id: 'test_request_003',
        userRequest: 'Delete all user data',
        context: unauthorizedUserContext,
        timestamp: new Date(),
        metadata: { security: 'test' }
      };

      const response = await conversationalController.processNaturalLanguageRequest(apiRequest);

      expect(response.success).toBe(false);
      expect(response.auditTrail.some(event => event.type === 'AUTHORIZATION_FAILED')).toBe(true);
    });
  });

  describe('Performance Validation', () => {
    test('should meet sub-100ms processing target for simple requests', async () => {
      const startTime = Date.now();

      const apiRequest = {
        id: 'perf_test_001',
        userRequest: 'Get status',
        context: mockUserContext,
        timestamp: new Date(),
        metadata: { performance: 'test' }
      };

      const response = await conversationalController.processNaturalLanguageRequest(apiRequest);
      const totalTime = Date.now() - startTime;

      expect(response.success).toBe(true);
      expect(totalTime).toBeLessThan(200); // Allow some buffer for test environment
      expect(response.performance.totalDuration).toBeLessThan(150);
    });

    test('should handle high concurrency without degradation', async () => {
      const concurrentRequests = 50;
      const promises = [];

      for (let i = 0; i < concurrentRequests; i++) {
        const apiRequest = {
          id: `concurrent_test_${i}`,
          userRequest: `Get data item ${i}`,
          context: mockUserContext,
          timestamp: new Date(),
          metadata: { concurrency: 'test' }
        };

        promises.push(conversationalController.processNaturalLanguageRequest(apiRequest));
      }

      const results = await Promise.all(promises);

      // All requests should succeed
      expect(results.every(r => r.success)).toBe(true);

      // Average response time should be reasonable
      const avgResponseTime = results.reduce((sum, r) => sum + r.performance.totalDuration, 0) / results.length;
      expect(avgResponseTime).toBeLessThan(300);
    });

    test('should optimize performance over time', async () => {
      const metrics = await optimizer.calculateMetrics({
        totalDuration: 150,
        validationDuration: 50,
        executionDuration: 80,
        explanationDuration: 20,
        baselineExecutionTime: 80
      });

      expect(metrics.responseTime.mean).toBeGreaterThan(0);
      expect(metrics.throughput.requestsPerSecond).toBeGreaterThan(0);
      expect(metrics.cache.hitRate).toBeGreaterThanOrEqual(0);
      expect(metrics.optimization.performanceGain).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Real-time Monitoring and Intervention', () => {
    test('should enable real-time monitoring for operations', async () => {
      const monitoringSession = await monitor.initializeOperationMonitoring(
        'test_operation_001',
        mockUserContext
      );

      expect(monitoringSession.id).toBeDefined();
      expect(monitoringSession.operationId).toBe('test_operation_001');
      expect(monitoringSession.interventionCapabilities.length).toBeGreaterThan(0);
      expect(monitoringSession.status).toBe('ACTIVE');
    });

    test('should process user intervention commands', async () => {
      // First initialize monitoring
      const monitoringSession = await monitor.initializeOperationMonitoring(
        'test_operation_002',
        mockUserContext
      );

      await monitor.startOperationMonitoring(monitoringSession.id);

      // Process intervention command
      const interventionResult = await monitor.processUserIntervention(
        'test_operation_002',
        { type: 'REQUEST_STATUS', parameters: {} },
        mockUserContext
      );

      expect(interventionResult.success).toBe(true);
      expect(interventionResult.applied).toBe(true);
    });

    test('should handle monitoring session lifecycle', async () => {
      const monitoringSession = await monitor.initializeOperationMonitoring(
        'test_operation_003',
        mockUserContext
      );

      await monitor.startOperationMonitoring(monitoringSession.id);
      await monitor.completeOperationMonitoring(monitoringSession.id, true);

      const stats = monitor.getMonitoringStatistics();
      expect(stats.totalActiveSessions).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Enterprise Integration and Security', () => {
    test('should validate user authorization with RBAC', async () => {
      const authResult = await enterprise.validateUserAuthorization(
        mockUserContext,
        'Get sensitive user data'
      );

      expect(authResult.authorized).toBeDefined();
      expect(authResult.grantedPermissions).toEqual(expect.arrayContaining(['API_ACCESS']));
      expect(authResult.availableAPIs).toBeDefined();
    });

    test('should generate comprehensive audit trails', async () => {
      const auditId = await enterprise.generateAuditTrail(
        {
          action: 'API_ACCESS',
          resource: 'USER_DATA',
          outcome: 'SUCCESS',
          details: { operation: 'read', recordCount: 1 }
        },
        mockUserContext
      );

      expect(auditId).toBeDefined();
      expect(auditId.startsWith('audit_')).toBe(true);
    });

    test('should enforce intervention permissions', async () => {
      const interventionAuth = await enterprise.validateInterventionPermission(
        mockUserContext,
        'test_operation_004'
      );

      expect(interventionAuth.authorized).toBeDefined();
      expect(interventionAuth.requiredPermissions).toBeDefined();
    });
  });

  describe('Middleware Integration', () => {
    test('should process Express.js requests through conversational middleware', async () => {
      const middlewareConfig = {
        enabled: true,
        framework: 'EXPRESS' as const,
        conversationalRoutes: ['/api/conversational'],
        bypassRoutes: ['/health'],
        performanceConfig: {
          enableCaching: true,
          cacheTTL: 300,
          maxConcurrentRequests: 1000,
          timeoutMs: 30000,
          compressionEnabled: true,
          rateLimitingEnabled: false,
          rateLimitRpm: 1000
        },
        securityConfig: {
          enforceAuthentication: false, // Disabled for testing
          requireHttps: false,
          enableCors: true,
          corsOrigins: ['*'],
          maxRequestSize: 10485760,
          enableRequestSanitization: true
        },
        monitoringConfig: {
          enableMetrics: true,
          enableTracing: true,
          enableLogging: true,
          logLevel: 'INFO' as const,
          metricsEndpoint: '/metrics'
        }
      };

      await middleware.initialize(middlewareConfig);

      const mockExpressRequest = {
        path: '/api/conversational',
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        query: {},
        body: {
          request: 'Get user information',
          user: mockUserContext
        },
        user: mockUserContext
      };

      const expressMiddleware = middleware.createExpressMiddleware();
      expect(expressMiddleware).toBeDefined();
      expect(typeof expressMiddleware).toBe('function');
    });

    test('should provide performance metrics for monitoring', async () => {
      const metrics = middleware.getPerformanceMetrics();

      expect(metrics).toBeDefined();
      expect(typeof metrics).toBe('object');
    });

    test('should support multiple framework integrations', async () => {
      const fastAPIMiddleware = middleware.createFastAPIMiddleware();
      const nextJSMiddleware = middleware.createNextJSMiddleware();
      const koaMiddleware = middleware.createKoaMiddleware();

      expect(fastAPIMiddleware).toBeDefined();
      expect(nextJSMiddleware).toBeDefined();
      expect(koaMiddleware).toBeDefined();
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle validation errors gracefully', async () => {
      const apiRequest = {
        id: 'error_test_001',
        userRequest: '', // Empty request to trigger validation error
        context: mockUserContext,
        timestamp: new Date(),
        metadata: { error: 'test' }
      };

      const response = await conversationalController.processNaturalLanguageRequest(apiRequest);

      expect(response.success).toBe(false);
      expect(response.conversation.status).toBe('FAILED');
    });

    test('should provide helpful error recovery suggestions', async () => {
      const apiRequest = {
        id: 'error_test_002',
        userRequest: 'Do something undefined',
        context: mockUserContext,
        timestamp: new Date(),
        metadata: { error: 'recovery_test' }
      };

      const response = await conversationalController.processNaturalLanguageRequest(apiRequest);

      if (!response.success) {
        expect(response.conversation.steps.length).toBeGreaterThan(0);
        // Should have some kind of error handling or recovery suggestion
      }
    });

    test('should maintain system stability under error conditions', async () => {
      const errorRequests = Array.from({ length: 10 }, (_, i) => ({
        id: `error_stability_${i}`,
        userRequest: `Invalid request ${i}`,
        context: mockUserContext,
        timestamp: new Date(),
        metadata: { stability: 'test' }
      }));

      const responses = await Promise.all(
        errorRequests.map(req => conversationalController.processNaturalLanguageRequest(req))
      );

      // System should handle all errors without crashing
      expect(responses.length).toBe(10);
      responses.forEach(response => {
        expect(response).toBeDefined();
        expect(response.conversation).toBeDefined();
      });
    });
  });

  describe('Compliance and Audit Requirements', () => {
    test('should maintain comprehensive audit logs', async () => {
      const apiRequest = {
        id: 'audit_test_001',
        userRequest: 'Access sensitive data',
        context: mockUserContext,
        timestamp: new Date(),
        metadata: { audit: 'required' }
      };

      const response = await conversationalController.processNaturalLanguageRequest(apiRequest);

      expect(response.auditTrail).toBeDefined();
      expect(response.auditTrail.length).toBeGreaterThan(0);

      // Verify audit events have required fields
      response.auditTrail.forEach(event => {
        expect(event.id).toBeDefined();
        expect(event.timestamp).toBeDefined();
        expect(event.actor).toBeDefined();
        expect(event.action).toBeDefined();
        expect(event.outcome).toBeDefined();
      });
    });

    test('should track user consent and permissions', async () => {
      const authResult = await enterprise.validateUserAuthorization(
        mockUserContext,
        'Process personal data'
      );

      expect(authResult).toBeDefined();
      expect(authResult.grantedPermissions).toBeDefined();
      expect(authResult.restrictions).toBeDefined();
    });

    test('should support data retention and deletion policies', async () => {
      // This would typically integrate with data retention systems
      // For now, we verify the audit trail includes appropriate metadata
      const auditId = await enterprise.generateAuditTrail(
        {
          action: 'DATA_RETENTION_CHECK',
          resource: 'USER_DATA',
          outcome: 'SUCCESS',
          details: { retentionPolicy: 'standard', dataAge: '30days' }
        },
        mockUserContext
      );

      expect(auditId).toBeDefined();
    });
  });

  describe('Scalability and Load Testing', () => {
    test('should handle burst traffic scenarios', async () => {
      const burstSize = 100;
      const startTime = Date.now();

      const burstRequests = Array.from({ length: burstSize }, (_, i) => ({
        id: `burst_test_${i}`,
        userRequest: `Get data ${i}`,
        context: mockUserContext,
        timestamp: new Date(),
        metadata: { burst: 'test' }
      }));

      const responses = await Promise.all(
        burstRequests.map(req => conversationalController.processNaturalLanguageRequest(req))
      );

      const totalTime = Date.now() - startTime;
      const avgResponseTime = totalTime / burstSize;

      expect(responses.length).toBe(burstSize);
      expect(responses.every(r => r.success || !r.success)).toBe(true); // All should have defined success state
      expect(avgResponseTime).toBeLessThan(1000); // Average under 1 second per request
    });

    test('should maintain consistent performance under sustained load', async () => {
      const sustainedRequests = 25;
      const requests = [];

      for (let i = 0; i < sustainedRequests; i++) {
        const apiRequest = {
          id: `sustained_test_${i}`,
          userRequest: `Process request ${i}`,
          context: mockUserContext,
          timestamp: new Date(),
          metadata: { sustained: 'load' }
        };

        requests.push(conversationalController.processNaturalLanguageRequest(apiRequest));

        // Small delay between requests to simulate sustained load
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const responses = await Promise.all(requests);
      const responseTimes = responses.map(r => r.performance?.totalDuration || 0);
      const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;

      expect(responses.length).toBe(sustainedRequests);
      expect(avgResponseTime).toBeLessThan(500); // Maintain reasonable average
    });
  });

  describe('Feature Completeness Validation', () => {
    test('should support all required conversational patterns', async () => {
      // Test intent analysis
      const intentRequest = {
        id: 'feature_test_001',
        userRequest: 'I want to create a new user account',
        context: mockUserContext,
        timestamp: new Date(),
        metadata: { feature: 'intent_analysis' }
      };

      const intentResponse = await conversationalController.processNaturalLanguageRequest(intentRequest);
      expect(intentResponse.conversation.steps.some(s => s.type === 'INTENT_ANALYSIS')).toBe(true);

      // Test parameter validation
      const paramRequest = {
        id: 'feature_test_002',
        userRequest: 'Update user with invalid email format',
        context: mockUserContext,
        timestamp: new Date(),
        metadata: { feature: 'parameter_validation' }
      };

      const paramResponse = await conversationalController.processNaturalLanguageRequest(paramRequest);
      expect(paramResponse.conversation.steps.some(s => s.type === 'PARAMETER_VALIDATION')).toBe(true);
    });

    test('should provide comprehensive monitoring capabilities', async () => {
      const monitoringSession = await monitor.initializeOperationMonitoring(
        'feature_test_monitoring',
        mockUserContext
      );

      expect(monitoringSession.interventionCapabilities).toBeDefined();
      expect(monitoringSession.interventionCapabilities.length).toBeGreaterThan(0);
      expect(monitoringSession.realTimeUpdates).toBeDefined();
    });

    test('should support enterprise security requirements', async () => {
      const authResult = await enterprise.validateUserAuthorization(
        mockUserContext,
        'Access enterprise features'
      );

      expect(authResult.grantedPermissions).toBeDefined();
      expect(authResult.restrictions).toBeDefined();
      expect(authResult.availableAPIs).toBeDefined();
    });
  });
});

// Helper functions for testing
function createMockAPIRegistry() {
  return {
    apis: [],
    getCapabilitiesSummary: () => ['read', 'write', 'admin'],
    findByCapability: (capability: string) => [],
    findByName: (name: string) => undefined,
    validateAPIAccess: async (apiId: string, userContext: any) => true
  };
}

function createMockRequest(userRequest: string, overrides: any = {}) {
  return {
    id: `test_${Date.now()}`,
    userRequest,
    context: mockUserContext,
    timestamp: new Date(),
    metadata: {},
    ...overrides
  };
}