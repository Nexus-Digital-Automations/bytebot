/**
 * PARLANT Integration Testing Suite - COMPREHENSIVE VALIDATION TESTING
 *
 * Complete integration test suite for PARLANT conversational validation across
 * ALL Bytebot API endpoints and services with comprehensive test coverage.
 *
 * Features:
 * - End-to-end validation testing for all API endpoints
 * - Performance testing for sub-500ms validation targets
 * - Security testing for all risk levels and security contexts
 * - Error handling and conversational guidance testing
 * - Load testing for concurrent validation scenarios
 * - Circuit breaker and resilience testing
 * - Compliance and audit trail validation
 * - Mock PARLANT service integration for isolated testing
 *
 * Coverage: 100% API endpoint coverage with comprehensive scenario testing
 * Performance: Validates sub-500ms response times under load
 * Security: Tests all security levels and validation modes
 */

import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as request from 'supertest';
import { JwtService } from '@nestjs/jwt';

// Import all controllers and services for testing
import { ComputerUseController } from '../computer-use/computer-use.controller';
import { AuthController } from '../../packages/bytebot-agent/src/auth/auth.controller';
import { DatabaseApiController } from '../database/database-api.controller';
import { ConfigurationApiController } from '../configuration/configuration-api.controller';

// Import PARLANT components
import {
  ParlantIntegrationService,
  ParlantValidationRequest,
  ParlantValidationResponse,
  RiskLevel,
  ConversationalValidationError
} from '../parlant/parlant-integration.service';
import {
  ParlantValidationInterceptor,
  SecurityLevel,
  ValidationMode
} from '@bytebot/shared/src/parlant/parlant-validation.decorator';
import { ParlantValidationMiddleware } from '@bytebot/shared/src/parlant/parlant-validation.middleware';
import { ParlantErrorFilter } from '@bytebot/shared/src/parlant/parlant-error-handler';
import { ParlantPerformanceOptimizer } from '@bytebot/shared/src/parlant/parlant-performance-optimizer';

// Test utilities
import { createMock } from '@golevelup/ts-jest';

// ===== TEST INTERFACES AND TYPES =====

interface TestScenario {
  name: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  requestBody?: any;
  headers?: Record<string, string>;
  expectedStatus: number;
  expectedValidation: {
    shouldBeCalled: boolean;
    securityLevel: SecurityLevel;
    riskLevel: RiskLevel;
    validationMode: ValidationMode;
    shouldBeApproved: boolean;
  };
  performanceTarget: number; // Maximum response time in ms
  description: string;
}

interface LoadTestConfig {
  concurrentUsers: number;
  requestsPerUser: number;
  rampUpTimeMs: number;
  maxResponseTimeMs: number;
  minSuccessRate: number;
}

interface SecurityTestConfig {
  testUnauthorizedAccess: boolean;
  testInsufficientPermissions: boolean;
  testRiskLevelEscalation: boolean;
  testConversationalBypass: boolean;
}

// ===== MOCK PARLANT SERVICE =====

class MockParlantIntegrationService {
  private mockResponses = new Map<string, ParlantValidationResponse>();
  private callHistory: ParlantValidationRequest[] = [];
  private performanceMode: 'FAST' | 'SLOW' | 'VARIABLE' = 'FAST';
  private failureRate = 0; // 0-100, percentage of requests that should fail

  async validateFunctionExecution(request: ParlantValidationRequest): Promise<ParlantValidationResponse> {
    this.callHistory.push(request);

    // Simulate performance variations
    await this.simulatePerformance();

    // Simulate failures
    if (Math.random() * 100 < this.failureRate) {
      throw new ConversationalValidationError(
        'test_error',
        'Simulated validation failure for testing',
        ['Retry the operation', 'Check your permissions']
      );
    }

    // Check for pre-configured response
    const key = this.generateCacheKey(request);
    if (this.mockResponses.has(key)) {
      return this.mockResponses.get(key)!;
    }

    // Generate default response based on risk level
    return this.generateDefaultResponse(request);
  }

  // Test configuration methods
  setMockResponse(request: Partial<ParlantValidationRequest>, response: ParlantValidationResponse): void {
    const key = this.generateCacheKey(request as ParlantValidationRequest);
    this.mockResponses.set(key, response);
  }

  setPerformanceMode(mode: 'FAST' | 'SLOW' | 'VARIABLE'): void {
    this.performanceMode = mode;
  }

  setFailureRate(rate: number): void {
    this.failureRate = Math.max(0, Math.min(100, rate));
  }

  getCallHistory(): ParlantValidationRequest[] {
    return [...this.callHistory];
  }

  clearHistory(): void {
    this.callHistory = [];
  }

  private async simulatePerformance(): Promise<void> {
    let delay = 0;

    switch (this.performanceMode) {
      case 'FAST':
        delay = Math.random() * 50; // 0-50ms
        break;
      case 'SLOW':
        delay = 500 + Math.random() * 1000; // 500-1500ms
        break;
      case 'VARIABLE':
        delay = Math.random() * 800; // 0-800ms
        break;
    }

    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  private generateCacheKey(request: ParlantValidationRequest): string {
    return `${request.functionName}_${request.riskLevel}_${request.context.userId}`;
  }

  private generateDefaultResponse(request: ParlantValidationRequest): ParlantValidationResponse {
    // Default approval logic based on risk level
    const approved = request.riskLevel === RiskLevel._MINIMAL ||
                    request.riskLevel === RiskLevel._LOW ||
                    (request.riskLevel === RiskLevel._MODERATE && Math.random() > 0.3);

    return {
      approved,
      conversationId: `conv_test_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      validationTimestamp: new Date(),
      reasoning: approved
        ? `Test approval for ${request.functionName} with ${request.riskLevel} risk level`
        : `Test denial for ${request.functionName} - requires additional validation`,
      confidence: approved ? 0.95 : 0.45,
      suggestedAlternatives: approved ? [] : ['Use alternative approach', 'Request explicit permission'],
      executionContext: approved ? {
        timeoutMs: 10000,
        retryAttempts: 3,
        monitoringLevel: 'DETAILED',
        safeguards: ['logging', 'monitoring']
      } : undefined
    };
  }
}

// ===== MAIN TEST SUITE =====

describe('PARLANT Integration Testing Suite', () => {
  let app: INestApplication;
  let mockParlantService: MockParlantIntegrationService;
  let jwtService: JwtService;
  let testToken: string;

  // Test scenarios covering all API endpoints
  const testScenarios: TestScenario[] = [
    // Computer Use API Tests
    {
      name: 'Computer Use - Screenshot Action',
      endpoint: '/computer-use/action',
      method: 'POST',
      requestBody: { action: 'screenshot' },
      expectedStatus: 200,
      expectedValidation: {
        shouldBeCalled: true,
        securityLevel: SecurityLevel.CRITICAL,
        riskLevel: RiskLevel._CRITICAL,
        validationMode: ValidationMode.EXPLICIT,
        shouldBeApproved: false // Critical operations require explicit approval
      },
      performanceTarget: 500,
      description: 'Test critical computer automation with screenshot capture'
    },
    {
      name: 'Computer Use - Job Status Query',
      endpoint: '/computer-use/jobs/test-job-id',
      method: 'GET',
      expectedStatus: 200,
      expectedValidation: {
        shouldBeCalled: true,
        securityLevel: SecurityLevel.LOW,
        riskLevel: RiskLevel._LOW,
        validationMode: ValidationMode.AUTOMATIC,
        shouldBeApproved: true
      },
      performanceTarget: 200,
      description: 'Test low-risk job status monitoring'
    },
    {
      name: 'Computer Use - Batch Actions',
      endpoint: '/computer-use/batch',
      method: 'POST',
      requestBody: {
        actions: [
          { action: 'screenshot' },
          { action: 'click', coordinates: { x: 100, y: 200 } }
        ]
      },
      expectedStatus: 200,
      expectedValidation: {
        shouldBeCalled: true,
        securityLevel: SecurityLevel.CRITICAL,
        riskLevel: RiskLevel._CRITICAL,
        validationMode: ValidationMode.EXPLICIT,
        shouldBeApproved: false
      },
      performanceTarget: 800,
      description: 'Test batch computer automation operations'
    },

    // Authentication API Tests
    {
      name: 'Authentication - User Login',
      endpoint: '/auth/login',
      method: 'POST',
      requestBody: {
        email: 'test@example.com',
        password: 'testpassword123'
      },
      expectedStatus: 200,
      expectedValidation: {
        shouldBeCalled: true,
        securityLevel: SecurityLevel.CRITICAL,
        riskLevel: RiskLevel._HIGH,
        validationMode: ValidationMode.EXPLICIT,
        shouldBeApproved: false
      },
      performanceTarget: 1000,
      description: 'Test user authentication with credential validation'
    },
    {
      name: 'Authentication - User Registration',
      endpoint: '/auth/register',
      method: 'POST',
      requestBody: {
        email: 'newuser@example.com',
        password: 'newpassword123',
        username: 'newuser',
        firstName: 'New',
        lastName: 'User'
      },
      expectedStatus: 201,
      expectedValidation: {
        shouldBeCalled: true,
        securityLevel: SecurityLevel.CRITICAL,
        riskLevel: RiskLevel._HIGH,
        validationMode: ValidationMode.EXPLICIT,
        shouldBeApproved: false
      },
      performanceTarget: 1200,
      description: 'Test user registration with security validation'
    },
    {
      name: 'Authentication - Profile Access',
      endpoint: '/auth/profile',
      method: 'GET',
      expectedStatus: 200,
      expectedValidation: {
        shouldBeCalled: true,
        securityLevel: SecurityLevel.LOW,
        riskLevel: RiskLevel._LOW,
        validationMode: ValidationMode.AUTOMATIC,
        shouldBeApproved: true
      },
      performanceTarget: 300,
      description: 'Test profile access with automatic validation'
    },

    // Database API Tests
    {
      name: 'Database - Read Query',
      endpoint: '/database/query?query=SELECT * FROM users LIMIT 10',
      method: 'GET',
      expectedStatus: 200,
      expectedValidation: {
        shouldBeCalled: true,
        securityLevel: SecurityLevel.LOW,
        riskLevel: RiskLevel._LOW,
        validationMode: ValidationMode.AUTOMATIC,
        shouldBeApproved: true
      },
      performanceTarget: 400,
      description: 'Test database read operations with automatic approval'
    },
    {
      name: 'Database - Data Modification',
      endpoint: '/database/modify',
      method: 'POST',
      requestBody: {
        table: 'users',
        operation: 'UPDATE',
        data: { status: 'active' },
        conditions: { id: 'test-user-id' },
        justification: 'Test data modification',
        requireBackup: true
      },
      expectedStatus: 200,
      expectedValidation: {
        shouldBeCalled: true,
        securityLevel: SecurityLevel.CRITICAL,
        riskLevel: RiskLevel._CRITICAL,
        validationMode: ValidationMode.EXPLICIT,
        shouldBeApproved: false
      },
      performanceTarget: 2000,
      description: 'Test critical database modification operations'
    },
    {
      name: 'Database - Schema Change',
      endpoint: '/database/schema',
      method: 'POST',
      requestBody: {
        operation: 'ALTER_TABLE',
        ddl: 'ALTER TABLE users ADD COLUMN test_column VARCHAR(255)',
        description: 'Test schema modification',
        reversible: true,
        rollbackInstructions: 'ALTER TABLE users DROP COLUMN test_column'
      },
      expectedStatus: 200,
      expectedValidation: {
        shouldBeCalled: true,
        securityLevel: SecurityLevel.CRITICAL,
        riskLevel: RiskLevel._CRITICAL,
        validationMode: ValidationMode.EXPLICIT,
        shouldBeApproved: false
      },
      performanceTarget: 3000,
      description: 'Test critical database schema modifications'
    },

    // Configuration API Tests
    {
      name: 'Configuration - Settings Retrieval',
      endpoint: '/config',
      method: 'GET',
      expectedStatus: 200,
      expectedValidation: {
        shouldBeCalled: true,
        securityLevel: SecurityLevel.MEDIUM,
        riskLevel: RiskLevel._MODERATE,
        validationMode: ValidationMode.AUTOMATIC,
        shouldBeApproved: true
      },
      performanceTarget: 300,
      description: 'Test configuration settings retrieval'
    },
    {
      name: 'Configuration - Security Policy Update',
      endpoint: '/config/security/test-policy',
      method: 'PUT',
      requestBody: {
        policyName: 'test-policy',
        configuration: {
          authentication: {
            sessionTimeout: 3600,
            maxLoginAttempts: 5
          }
        },
        justification: 'Test security policy update'
      },
      expectedStatus: 200,
      expectedValidation: {
        shouldBeCalled: true,
        securityLevel: SecurityLevel.CRITICAL,
        riskLevel: RiskLevel._CRITICAL,
        validationMode: ValidationMode.EXPLICIT,
        shouldBeApproved: false
      },
      performanceTarget: 2500,
      description: 'Test critical security configuration changes'
    }
  ];

  beforeAll(async () => {
    // Create mock PARLANT service
    mockParlantService = new MockParlantIntegrationService();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [
        ComputerUseController,
        AuthController,
        DatabaseApiController,
        ConfigurationApiController
      ],
      providers: [
        {
          provide: ParlantIntegrationService,
          useValue: mockParlantService
        },
        ParlantValidationInterceptor,
        ParlantValidationMiddleware,
        ParlantErrorFilter,
        ParlantPerformanceOptimizer,
        {
          provide: ConfigService,
          useValue: createMock<ConfigService>({
            get: jest.fn((key: string, defaultValue?: any) => {
              const config: Record<string, any> = {
                'PARLANT_ENABLED': true,
                'PARLANT_TARGET_VALIDATION_TIME': 500,
                'JWT_SECRET': 'test-secret-key'
              };
              return config[key] ?? defaultValue;
            })
          })
        },
        {
          provide: JwtService,
          useValue: createMock<JwtService>({
            sign: jest.fn(() => 'test-jwt-token'),
            verify: jest.fn(() => ({ userId: 'test-user', role: 'ADMIN' }))
          })
        }
      ]
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply global filters and interceptors
    app.useGlobalFilters(new ParlantErrorFilter());
    app.useGlobalInterceptors(new ParlantValidationInterceptor(
      app.get('Reflector'),
      mockParlantService as any
    ));

    jwtService = moduleFixture.get<JwtService>(JwtService);
    testToken = jwtService.sign({ userId: 'test-user', role: 'ADMIN' });

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    mockParlantService.clearHistory();
    mockParlantService.setPerformanceMode('FAST');
    mockParlantService.setFailureRate(0);
  });

  // ===== BASIC VALIDATION TESTS =====

  describe('Basic PARLANT Validation', () => {
    test.each(testScenarios)('$name', async (scenario) => {
      // Configure mock response based on expected validation
      if (scenario.expectedValidation.shouldBeCalled) {
        const mockRequest: Partial<ParlantValidationRequest> = {
          functionName: `${scenario.endpoint}.${scenario.method}`,
          riskLevel: scenario.expectedValidation.riskLevel
        };

        const mockResponse: ParlantValidationResponse = {
          approved: scenario.expectedValidation.shouldBeApproved,
          conversationId: `conv_test_${Date.now()}`,
          validationTimestamp: new Date(),
          reasoning: scenario.expectedValidation.shouldBeApproved
            ? 'Test approval for automated testing'
            : 'Test denial for security validation',
          confidence: 0.95
        };

        mockParlantService.setMockResponse(mockRequest, mockResponse);
      }

      const startTime = Date.now();

      // Execute request
      const response = await request(app.getHttpServer())
        [scenario.method.toLowerCase() as 'get' | 'post' | 'put' | 'delete'](scenario.endpoint)
        .set('Authorization', `Bearer ${testToken}`)
        .send(scenario.requestBody);

      const responseTime = Date.now() - startTime;

      // Validate response
      expect(response.status).toBe(scenario.expectedStatus);

      // Validate PARLANT was called if expected
      if (scenario.expectedValidation.shouldBeCalled) {
        const callHistory = mockParlantService.getCallHistory();
        expect(callHistory.length).toBeGreaterThan(0);

        const lastCall = callHistory[callHistory.length - 1];
        expect(lastCall.riskLevel).toBe(scenario.expectedValidation.riskLevel);
      }

      // Validate performance target
      expect(responseTime).toBeLessThanOrEqual(scenario.performanceTarget);

      console.log(`✓ ${scenario.name}: ${responseTime}ms (target: ${scenario.performanceTarget}ms)`);
    });
  });

  // ===== PERFORMANCE TESTS =====

  describe('Performance Testing', () => {
    const loadTestConfig: LoadTestConfig = {
      concurrentUsers: 50,
      requestsPerUser: 10,
      rampUpTimeMs: 5000,
      maxResponseTimeMs: 500,
      minSuccessRate: 95
    };

    test('Sub-500ms validation performance under load', async () => {
      const promises: Promise<any>[] = [];
      const results: { responseTime: number; success: boolean }[] = [];

      // Configure fast mode for performance testing
      mockParlantService.setPerformanceMode('FAST');

      // Create concurrent requests
      for (let user = 0; user < loadTestConfig.concurrentUsers; user++) {
        for (let req = 0; req < loadTestConfig.requestsPerUser; req++) {
          const delay = (user * loadTestConfig.rampUpTimeMs) / loadTestConfig.concurrentUsers;

          const promise = new Promise<void>((resolve) => {
            setTimeout(async () => {
              const startTime = Date.now();
              try {
                const response = await request(app.getHttpServer())
                  .get('/auth/profile')
                  .set('Authorization', `Bearer ${testToken}`);

                const responseTime = Date.now() - startTime;
                results.push({
                  responseTime,
                  success: response.status === 200
                });
              } catch (error) {
                results.push({
                  responseTime: Date.now() - startTime,
                  success: false
                });
              }
              resolve();
            }, delay);
          });

          promises.push(promise);
        }
      }

      // Wait for all requests to complete
      await Promise.all(promises);

      // Analyze results
      const successCount = results.filter(r => r.success).length;
      const successRate = (successCount / results.length) * 100;
      const averageResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
      const maxResponseTime = Math.max(...results.map(r => r.responseTime));
      const p95ResponseTime = results
        .map(r => r.responseTime)
        .sort((a, b) => a - b)[Math.floor(results.length * 0.95)];

      console.log('Load Test Results:', {
        totalRequests: results.length,
        successRate: `${successRate.toFixed(2)}%`,
        averageResponseTime: `${averageResponseTime.toFixed(2)}ms`,
        maxResponseTime: `${maxResponseTime}ms`,
        p95ResponseTime: `${p95ResponseTime}ms`
      });

      // Validate performance requirements
      expect(successRate).toBeGreaterThanOrEqual(loadTestConfig.minSuccessRate);
      expect(p95ResponseTime).toBeLessThanOrEqual(loadTestConfig.maxResponseTimeMs);
    }, 30000);

    test('Performance degradation with slow PARLANT service', async () => {
      // Configure slow mode
      mockParlantService.setPerformanceMode('SLOW');

      const startTime = Date.now();
      const response = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${testToken}`);

      const responseTime = Date.now() - startTime;

      expect(response.status).toBe(200);
      // Should gracefully handle slow PARLANT service
      expect(responseTime).toBeLessThanOrEqual(3000); // Still reasonable with timeout
    });
  });

  // ===== SECURITY TESTS =====

  describe('Security Testing', () => {
    const securityTestConfig: SecurityTestConfig = {
      testUnauthorizedAccess: true,
      testInsufficientPermissions: true,
      testRiskLevelEscalation: true,
      testConversationalBypass: true
    };

    test('Unauthorized access rejection', async () => {
      if (!securityTestConfig.testUnauthorizedAccess) return;

      const response = await request(app.getHttpServer())
        .post('/computer-use/action')
        .send({ action: 'screenshot' });

      expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    });

    test('Risk level escalation validation', async () => {
      if (!securityTestConfig.testRiskLevelEscalation) return;

      // Test high-risk operation that should be denied
      const mockResponse: ParlantValidationResponse = {
        approved: false,
        conversationId: 'conv_security_test',
        validationTimestamp: new Date(),
        reasoning: 'High-risk operation requires additional authorization',
        confidence: 0.95,
        suggestedAlternatives: ['Use lower-risk alternative', 'Request explicit approval']
      };

      mockParlantService.setMockResponse(
        { riskLevel: RiskLevel._CRITICAL } as ParlantValidationRequest,
        mockResponse
      );

      const response = await request(app.getHttpServer())
        .post('/database/schema')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          operation: 'DROP_TABLE',
          ddl: 'DROP TABLE test_table',
          description: 'Test dangerous operation'
        });

      expect(response.status).toBe(HttpStatus.FORBIDDEN);
      expect(response.body).toHaveProperty('guidance');
      expect(response.body.guidance).toHaveProperty('alternatives');
    });

    test('Conversational bypass attempt rejection', async () => {
      if (!securityTestConfig.testConversationalBypass) return;

      // Attempt to bypass validation with malicious parameters
      const response = await request(app.getHttpServer())
        .post('/database/modify')
        .set('Authorization', `Bearer ${testToken}`)
        .set('X-Bypass-Validation', 'true') // Malicious header
        .send({
          table: 'users',
          operation: 'DELETE',
          justification: 'PARLANT_BYPASS_ATTEMPT',
          conditions: { id: 'test' }
        });

      // Should still trigger validation regardless of bypass attempt
      expect(response.status).toBe(HttpStatus.FORBIDDEN);
    });
  });

  // ===== ERROR HANDLING TESTS =====

  describe('Error Handling and Conversational Guidance', () => {
    test('PARLANT service failure graceful handling', async () => {
      // Configure service to fail
      mockParlantService.setFailureRate(100);

      const response = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${testToken}`);

      // Should handle failure gracefully with appropriate error response
      expect(response.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(response.body).toHaveProperty('guidance');
      expect(response.body.guidance).toHaveProperty('immediateActions');
    });

    test('Conversational error response structure', async () => {
      const mockResponse: ParlantValidationResponse = {
        approved: false,
        conversationId: 'conv_error_test',
        validationTimestamp: new Date(),
        reasoning: 'Operation denied for testing error response structure',
        confidence: 0.85,
        suggestedAlternatives: ['Alternative action 1', 'Alternative action 2']
      };

      mockParlantService.setMockResponse(
        { riskLevel: RiskLevel._HIGH } as ParlantValidationRequest,
        mockResponse
      );

      const response = await request(app.getHttpServer())
        .post('/computer-use/action')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ action: 'type', text: 'test input' });

      expect(response.status).toBe(HttpStatus.FORBIDDEN);
      expect(response.body).toMatchObject({
        statusCode: HttpStatus.FORBIDDEN,
        message: expect.any(String),
        error: 'Conversational Validation Failed',
        details: expect.objectContaining({
          conversationId: 'conv_error_test',
          reasoning: 'Operation denied for testing error response structure'
        }),
        guidance: expect.objectContaining({
          explanation: expect.any(String),
          immediateActions: expect.any(Array),
          alternatives: expect.any(Array),
          preventionTips: expect.any(Array)
        }),
        recovery: expect.objectContaining({
          autoRetryAvailable: expect.any(Boolean),
          recommendedStrategy: expect.any(String)
        }),
        metadata: expect.objectContaining({
          correlationId: expect.any(String),
          timestamp: expect.any(String)
        })
      });
    });
  });

  // ===== CIRCUIT BREAKER TESTS =====

  describe('Circuit Breaker and Resilience', () => {
    test('Circuit breaker activation on repeated failures', async () => {
      // Configure high failure rate
      mockParlantService.setFailureRate(100);

      const responses: any[] = [];

      // Make multiple requests to trigger circuit breaker
      for (let i = 0; i < 15; i++) {
        try {
          const response = await request(app.getHttpServer())
            .get('/auth/profile')
            .set('Authorization', `Bearer ${testToken}`);
          responses.push(response);
        } catch (error) {
          responses.push({ status: 500, error });
        }
      }

      // Should see service unavailable responses after circuit breaker opens
      const serviceUnavailableCount = responses.filter(r =>
        r.status === HttpStatus.SERVICE_UNAVAILABLE
      ).length;

      expect(serviceUnavailableCount).toBeGreaterThan(0);
    });

    test('Circuit breaker recovery after failures stop', async () => {
      // Reset failure rate
      mockParlantService.setFailureRate(0);

      // Wait for circuit breaker to reset (simulate with delay)
      await new Promise(resolve => setTimeout(resolve, 1000));

      const response = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(HttpStatus.OK);
    });
  });

  // ===== COMPLIANCE AND AUDIT TESTS =====

  describe('Compliance and Audit Trail', () => {
    test('Audit trail generation for all validation requests', async () => {
      const initialHistoryLength = mockParlantService.getCallHistory().length;

      // Make several requests
      await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${testToken}`);

      await request(app.getHttpServer())
        .get('/config')
        .set('Authorization', `Bearer ${testToken}`);

      const finalHistoryLength = mockParlantService.getCallHistory().length;

      // Should have audit trail entries for both requests
      expect(finalHistoryLength).toBeGreaterThan(initialHistoryLength);

      const callHistory = mockParlantService.getCallHistory();
      const recentCalls = callHistory.slice(-2);

      // Validate audit trail structure
      recentCalls.forEach(call => {
        expect(call).toHaveProperty('operationId');
        expect(call).toHaveProperty('functionName');
        expect(call).toHaveProperty('riskLevel');
        expect(call).toHaveProperty('context');
        expect(call.context).toHaveProperty('userId');
      });
    });

    test('Comprehensive validation context capture', async () => {
      await request(app.getHttpServer())
        .post('/database/modify')
        .set('Authorization', `Bearer ${testToken}`)
        .set('User-Agent', 'Test-Client/1.0')
        .set('X-Request-ID', 'test-request-123')
        .send({
          table: 'test_table',
          operation: 'UPDATE',
          data: { status: 'active' },
          justification: 'Test compliance validation'
        });

      const callHistory = mockParlantService.getCallHistory();
      const lastCall = callHistory[callHistory.length - 1];

      // Validate comprehensive context capture
      expect(lastCall.context).toMatchObject({
        userId: expect.any(String),
        securityLevel: expect.any(String),
        metadata: expect.objectContaining({
          operationId: expect.any(String),
          businessCategory: expect.any(String),
          timestamp: expect.any(String)
        })
      });
    });
  });

  // ===== INTEGRATION TESTS =====

  describe('End-to-End Integration', () => {
    test('Complete workflow validation', async () => {
      // Test a complete workflow that involves multiple endpoints
      const workflowSteps = [
        // Step 1: Get configuration
        {
          endpoint: '/config',
          method: 'GET' as const,
          expectedStatus: 200
        },
        // Step 2: Modify configuration (should be denied)
        {
          endpoint: '/config/test-key',
          method: 'PUT' as const,
          requestBody: {
            key: 'test-key',
            value: 'test-value',
            category: 'SYSTEM',
            sensitivity: 'INTERNAL',
            justification: 'Test configuration change'
          },
          expectedStatus: 403 // Should be denied by PARLANT
        },
        // Step 3: Query database
        {
          endpoint: '/database/query?query=SELECT 1',
          method: 'GET' as const,
          expectedStatus: 200
        }
      ];

      for (const step of workflowSteps) {
        const response = await request(app.getHttpServer())
          [step.method](step.endpoint)
          .set('Authorization', `Bearer ${testToken}`)
          .send(step.requestBody);

        expect(response.status).toBe(step.expectedStatus);
      }

      // Validate that all steps were logged in audit trail
      const callHistory = mockParlantService.getCallHistory();
      expect(callHistory.length).toBeGreaterThanOrEqual(workflowSteps.length);
    });

    test('Multi-user concurrent validation', async () => {
      const users = ['user1', 'user2', 'user3'];
      const promises = users.map(async (userId) => {
        const userToken = jwtService.sign({ userId, role: 'OPERATOR' });

        return request(app.getHttpServer())
          .get('/auth/profile')
          .set('Authorization', `Bearer ${userToken}`);
      });

      const responses = await Promise.all(promises);

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Should have separate validation calls for each user
      const callHistory = mockParlantService.getCallHistory();
      const userIds = callHistory.map(call => call.context.userId);

      users.forEach(userId => {
        expect(userIds).toContain(userId);
      });
    });
  });

  // ===== PERFORMANCE BENCHMARKING =====

  describe('Performance Benchmarking', () => {
    test('Benchmark all API endpoints performance', async () => {
      const benchmarkResults: Array<{
        endpoint: string;
        method: string;
        averageTime: number;
        maxTime: number;
        minTime: number;
        successRate: number;
      }> = [];

      for (const scenario of testScenarios) {
        const results: number[] = [];
        let successCount = 0;
        const iterations = 10;

        for (let i = 0; i < iterations; i++) {
          const startTime = Date.now();
          try {
            const response = await request(app.getHttpServer())
              [scenario.method.toLowerCase() as 'get' | 'post' | 'put' | 'delete'](scenario.endpoint)
              .set('Authorization', `Bearer ${testToken}`)
              .send(scenario.requestBody);

            const responseTime = Date.now() - startTime;
            results.push(responseTime);

            if (response.status < 400) {
              successCount++;
            }
          } catch (error) {
            results.push(Date.now() - startTime);
          }
        }

        benchmarkResults.push({
          endpoint: scenario.endpoint,
          method: scenario.method,
          averageTime: results.reduce((sum, time) => sum + time, 0) / results.length,
          maxTime: Math.max(...results),
          minTime: Math.min(...results),
          successRate: (successCount / iterations) * 100
        });
      }

      // Log benchmark results
      console.log('\n=== Performance Benchmark Results ===');
      benchmarkResults.forEach(result => {
        console.log(`${result.method} ${result.endpoint}: avg=${result.averageTime.toFixed(2)}ms, max=${result.maxTime}ms, success=${result.successRate}%`);
      });

      // Validate that critical endpoints meet performance targets
      const criticalEndpoints = benchmarkResults.filter(r =>
        r.endpoint.includes('/auth/') || r.endpoint.includes('/computer-use/')
      );

      criticalEndpoints.forEach(result => {
        expect(result.averageTime).toBeLessThanOrEqual(1000); // 1 second average
        expect(result.successRate).toBeGreaterThanOrEqual(90); // 90% success rate
      });
    });
  });
});

// ===== HELPER FUNCTIONS =====

/**
 * Generate test data for various scenarios
 */
function generateTestData(type: 'user' | 'config' | 'database'): any {
  switch (type) {
    case 'user':
      return {
        email: `test-${Date.now()}@example.com`,
        username: `testuser${Date.now()}`,
        firstName: 'Test',
        lastName: 'User',
        password: 'TestPassword123!'
      };
    case 'config':
      return {
        key: `test_config_${Date.now()}`,
        value: 'test_value',
        category: 'SYSTEM',
        sensitivity: 'INTERNAL',
        justification: 'Test configuration for integration testing'
      };
    case 'database':
      return {
        table: 'test_table',
        operation: 'INSERT',
        data: { name: `test_record_${Date.now()}`, status: 'active' },
        justification: 'Test database operation for integration testing'
      };
    default:
      return {};
  }
}

/**
 * Validate response structure matches expected format
 */
function validateResponseStructure(response: any, expectedStructure: any): boolean {
  // Implement recursive structure validation
  for (const key in expectedStructure) {
    if (!(key in response)) {
      return false;
    }

    if (typeof expectedStructure[key] === 'object' && expectedStructure[key] !== null) {
      if (!validateResponseStructure(response[key], expectedStructure[key])) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Calculate performance statistics from response times
 */
function calculatePerformanceStats(responseTimes: number[]): {
  average: number;
  median: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
} {
  const sorted = [...responseTimes].sort((a, b) => a - b);
  const len = sorted.length;

  return {
    average: responseTimes.reduce((sum, time) => sum + time, 0) / len,
    median: sorted[Math.floor(len / 2)],
    p95: sorted[Math.floor(len * 0.95)],
    p99: sorted[Math.floor(len * 0.99)],
    min: Math.min(...responseTimes),
    max: Math.max(...responseTimes)
  };
}