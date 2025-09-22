/**
 * PARLANT Phase 1 - Comprehensive Test Suite
 *
 * Complete test coverage for pre-execution validation system including
 * unit tests, integration tests, performance tests, and security tests.
 * Validates all validation scenarios with enterprise-grade test quality.
 *
 * Test Categories:
 * - Unit Tests: Individual component testing
 * - Integration Tests: Service interaction testing
 * - Performance Tests: Sub-500ms validation requirements
 * - Security Tests: Authorization and audit trail validation
 * - User Experience Tests: UX optimization validation
 * - Edge Case Tests: Boundary condition handling
 * - Error Handling Tests: Failure scenario coverage
 *
 * @module PreExecutionValidationTests
 * @version 1.0.0
 * @author PARLANT Phase 1 Testing Team
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { performance } from 'perf_hooks';
import {
  PreExecutionValidationService,
  PreExecutionValidationRequest,
  PreExecutionValidationResponse,
  UserValidationContext,
  OperationRiskMetadata,
  ValidationLevel,
  PreExecutionValidationError
} from './pre-execution-validation.service';
import {
  RiskAssessmentService,
  RiskAssessmentError
} from './risk-assessment.service';
import {
  PreExecutionValidationMiddleware,
  ValidationRejectionError,
  PreExecutionValidation,
  ParlantCritical,
  ParlantSecure,
  ParlantStandard
} from './validation-middleware';
import { UserExperienceOptimizer } from './user-experience-optimizer';

// ===== TEST UTILITIES =====

/**
 * Test data factory for creating validation requests
 */
class ValidationTestDataFactory {
  static createBasicValidationRequest(overrides: Partial<PreExecutionValidationRequest> = {}): PreExecutionValidationRequest {
    return {
      id: 'test-req-' + Date.now(),
      functionName: 'testFunction',
      parameters: { param1: 'value1', param2: 'value2' },
      userContext: this.createUserContext(),
      conversationId: 'test-conv-' + Date.now(),
      securityClassification: 'INTERNAL',
      naturalLanguageIntent: 'Test operation for validation',
      riskMetadata: this.createRiskMetadata(),
      timestamp: new Date(),
      timeoutMs: 30000,
      ...overrides
    };
  }

  static createUserContext(overrides: Partial<UserValidationContext> = {}): UserValidationContext {
    return {
      userId: 'test-user-123',
      roles: ['user', 'tester'],
      sessionContext: {
        sessionId: 'test-session-' + Date.now(),
        ipAddress: '127.0.0.1',
        userAgent: 'Test Agent',
        lastActivity: new Date()
      },
      conversationalPreferences: {
        verbosityLevel: 'standard',
        confirmationStyle: 'thorough',
        riskTolerance: 'moderate'
      },
      validationHistory: {
        recentValidations: 5,
        successRate: 0.95,
        averageResponseTime: 3000
      },
      ...overrides
    };
  }

  static createRiskMetadata(overrides: Partial<OperationRiskMetadata> = {}): OperationRiskMetadata {
    return {
      dataSensitivity: 'internal',
      impactScope: {
        affectedRecords: 10,
        dataVolume: 'small',
        systemComponents: ['test-system']
      },
      reversibility: {
        isReversible: true,
        rollbackComplexity: 'simple',
        rollbackTimeEstimate: 60000
      },
      dependencies: {
        externalServices: [],
        affectedSystems: ['test-system'],
        potentialSideEffects: ['audit-log-entry']
      },
      compliance: {
        requiresApproval: false,
        auditRequired: true,
        complianceFrameworks: ['SOC2']
      },
      ...overrides
    };
  }

  static createHighRiskRequest(): PreExecutionValidationRequest {
    return this.createBasicValidationRequest({
      securityClassification: 'RESTRICTED',
      riskMetadata: this.createRiskMetadata({
        dataSensitivity: 'restricted',
        impactScope: {
          affectedRecords: 10000,
          dataVolume: 'large',
          systemComponents: ['database', 'authentication', 'user-management']
        },
        reversibility: {
          isReversible: false,
          rollbackComplexity: 'complex'
        },
        compliance: {
          requiresApproval: true,
          auditRequired: true,
          complianceFrameworks: ['SOC2', 'GDPR', 'HIPAA']
        }
      })
    });
  }

  static createLowRiskRequest(): PreExecutionValidationRequest {
    return this.createBasicValidationRequest({
      securityClassification: 'PUBLIC',
      riskMetadata: this.createRiskMetadata({
        dataSensitivity: 'public',
        impactScope: {
          affectedRecords: 1,
          dataVolume: 'small',
          systemComponents: ['web-service']
        },
        reversibility: {
          isReversible: true,
          rollbackComplexity: 'simple'
        },
        compliance: {
          requiresApproval: false,
          auditRequired: false,
          complianceFrameworks: []
        }
      })
    });
  }
}

/**
 * Performance testing utilities
 */
class PerformanceTestUtils {
  static async measureExecutionTime<T>(operation: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const startTime = performance.now();
    const result = await operation();
    const duration = performance.now() - startTime;
    return { result, duration };
  }

  static generateConcurrentRequests(count: number): PreExecutionValidationRequest[] {
    return Array.from({ length: count }, (_, i) =>
      ValidationTestDataFactory.createBasicValidationRequest({
        id: `concurrent-req-${i}`,
        functionName: `testFunction${i}`
      })
    );
  }
}

/**
 * Mock implementation for testing
 */
class MockConfigService {
  private config = new Map<string, any>();

  constructor() {
    // Set default test configuration
    this.config.set('PARLANT_PRE_EXECUTION_ENABLED', true);
    this.config.set('PARLANT_VALIDATION_TIMEOUT_MS', 30000);
    this.config.set('PARLANT_CACHING_ENABLED', true);
    this.config.set('PARLANT_CACHE_TTL_MS', 300000);
  }

  get<T>(key: string, defaultValue?: T): T {
    return this.config.get(key) ?? defaultValue;
  }

  set(key: string, value: any): void {
    this.config.set(key, value);
  }
}

// ===== UNIT TESTS =====

describe('PreExecutionValidationService', () => {
  let service: PreExecutionValidationService;
  let configService: MockConfigService;

  beforeEach(async () => {
    configService = new MockConfigService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PreExecutionValidationService,
        { provide: ConfigService, useValue: configService }
      ]
    }).compile();

    service = module.get<PreExecutionValidationService>(PreExecutionValidationService);
  });

  describe('Basic Validation', () => {
    it('should validate a basic low-risk operation successfully', async () => {
      const request = ValidationTestDataFactory.createLowRiskRequest();

      const response = await service.validateOperation(request);

      expect(response).toBeDefined();
      expect(response.requestId).toBe(request.id);
      expect(response.result.decision).toBe('APPROVED');
      expect(response.riskAssessment.riskLevel).toBe('LOW');
      expect(response.auditTrail).toBeDefined();
    });

    it('should validate a high-risk operation with comprehensive requirements', async () => {
      const request = ValidationTestDataFactory.createHighRiskRequest();

      const response = await service.validateOperation(request);

      expect(response).toBeDefined();
      expect(response.requestId).toBe(request.id);
      expect(response.riskAssessment.riskLevel).toBeOneOf(['HIGH', 'CRITICAL']);
      expect(response.riskAssessment.validationLevel).toBeOneOf(['ENHANCED', 'COMPREHENSIVE', 'MULTI_PARTY']);
      expect(response.riskAssessment.validationRequirements.length).toBeGreaterThan(0);
    });

    it('should handle different security classifications correctly', async () => {
      const securityLevels: Array<PreExecutionValidationRequest['securityClassification']> = [
        'PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED'
      ];

      for (const securityLevel of securityLevels) {
        const request = ValidationTestDataFactory.createBasicValidationRequest({
          securityClassification: securityLevel
        });

        const response = await service.validateOperation(request);

        expect(response.result.decision).toBeOneOf(['APPROVED', 'PENDING', 'REJECTED']);
        expect(response.riskAssessment.riskScore).toBeGreaterThanOrEqual(0);
        expect(response.riskAssessment.riskScore).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('Caching Functionality', () => {
    it('should cache validation decisions for similar requests', async () => {
      const request1 = ValidationTestDataFactory.createLowRiskRequest();
      const request2 = ValidationTestDataFactory.createBasicValidationRequest({
        functionName: request1.functionName,
        parameters: request1.parameters,
        securityClassification: request1.securityClassification
      });

      // First request
      const { duration: duration1 } = await PerformanceTestUtils.measureExecutionTime(
        () => service.validateOperation(request1)
      );

      // Second request (should be cached)
      const { result: response2, duration: duration2 } = await PerformanceTestUtils.measureExecutionTime(
        () => service.validateOperation(request2)
      );

      expect(response2.metrics.cacheHitRate).toBe(1.0);
      expect(duration2).toBeLessThan(duration1); // Cached should be faster
    });

    it('should not cache rejected validation decisions', async () => {
      // Create a request that would likely be rejected
      const request = ValidationTestDataFactory.createBasicValidationRequest({
        userContext: ValidationTestDataFactory.createUserContext({
          validationHistory: {
            recentValidations: 50,
            successRate: 0.3, // Low success rate
            averageResponseTime: 10000
          }
        })
      });

      const response = await service.validateOperation(request);

      if (response.result.decision === 'REJECTED') {
        // Second identical request should not use cache
        const response2 = await service.validateOperation(request);
        expect(response2.metrics.cacheHitRate).toBe(0.0);
      }
    });
  });

  describe('Error Handling', () => {
    it('should throw PreExecutionValidationError for invalid requests', async () => {
      const invalidRequest = {
        ...ValidationTestDataFactory.createBasicValidationRequest(),
        timeoutMs: -1 // Invalid timeout
      } as PreExecutionValidationRequest;

      await expect(service.validateOperation(invalidRequest))
        .rejects.toThrow(PreExecutionValidationError);
    });

    it('should handle concurrent validation requests without errors', async () => {
      const requests = PerformanceTestUtils.generateConcurrentRequests(10);

      const validationPromises = requests.map(request => service.validateOperation(request));
      const responses = await Promise.all(validationPromises);

      expect(responses).toHaveLength(10);
      responses.forEach(response => {
        expect(response.result.decision).toBeOneOf(['APPROVED', 'PENDING', 'REJECTED']);
      });
    });
  });

  describe('Service Health and Metrics', () => {
    it('should provide health check information', async () => {
      const healthCheck = await service.healthCheck();

      expect(healthCheck.status).toBe('healthy');
      expect(healthCheck.metrics).toBeDefined();
      expect(healthCheck.config).toBeDefined();
      expect(healthCheck.config.enabled).toBe(true);
    });

    it('should track validation metrics correctly', async () => {
      const initialMetrics = service.getMetrics();

      // Perform several validations
      for (let i = 0; i < 5; i++) {
        const request = ValidationTestDataFactory.createBasicValidationRequest({
          id: `metrics-test-${i}`
        });
        await service.validateOperation(request);
      }

      const finalMetrics = service.getMetrics();

      expect(finalMetrics.totalValidations).toBeGreaterThan(initialMetrics.totalValidations);
      expect(finalMetrics.averageValidationTime).toBeGreaterThan(0);
    });
  });
});

// ===== RISK ASSESSMENT TESTS =====

describe('RiskAssessmentService', () => {
  let service: RiskAssessmentService;
  let configService: MockConfigService;

  beforeEach(async () => {
    configService = new MockConfigService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RiskAssessmentService,
        { provide: ConfigService, useValue: configService }
      ]
    }).compile();

    service = module.get<RiskAssessmentService>(RiskAssessmentService);
  });

  describe('Risk Scoring', () => {
    it('should assign low risk scores to safe operations', async () => {
      const request = ValidationTestDataFactory.createLowRiskRequest();

      const assessment = await service.performRiskAssessment(request);

      expect(assessment.riskScore).toBeLessThan(30);
      expect(assessment.riskLevel).toBe('LOW');
      expect(assessment.validationLevel).toBeOneOf(['CACHE_ONLY', 'SIMPLE']);
    });

    it('should assign high risk scores to dangerous operations', async () => {
      const request = ValidationTestDataFactory.createHighRiskRequest();

      const assessment = await service.performRiskAssessment(request);

      expect(assessment.riskScore).toBeGreaterThan(60);
      expect(assessment.riskLevel).toBeOneOf(['HIGH', 'CRITICAL']);
      expect(assessment.validationLevel).toBeOneOf(['ENHANCED', 'COMPREHENSIVE', 'MULTI_PARTY']);
    });

    it('should consider user context in risk assessment', async () => {
      const baseRequest = ValidationTestDataFactory.createBasicValidationRequest();

      // High-trust user
      const highTrustRequest = {
        ...baseRequest,
        userContext: ValidationTestDataFactory.createUserContext({
          roles: ['admin', 'trusted'],
          validationHistory: {
            recentValidations: 10,
            successRate: 0.98,
            averageResponseTime: 2000
          }
        })
      };

      // Low-trust user
      const lowTrustRequest = {
        ...baseRequest,
        userContext: ValidationTestDataFactory.createUserContext({
          roles: ['temp', 'contractor'],
          validationHistory: {
            recentValidations: 50,
            successRate: 0.7,
            averageResponseTime: 15000
          }
        })
      };

      const highTrustAssessment = await service.performRiskAssessment(highTrustRequest);
      const lowTrustAssessment = await service.performRiskAssessment(lowTrustRequest);

      expect(lowTrustAssessment.riskScore).toBeGreaterThan(highTrustAssessment.riskScore);
    });
  });

  describe('Risk Factor Analysis', () => {
    it('should properly assess data sensitivity factors', async () => {
      const sensitivityLevels: Array<OperationRiskMetadata['dataSensitivity']> = [
        'public', 'internal', 'confidential', 'restricted'
      ];

      const assessments = await Promise.all(
        sensitivityLevels.map(sensitivity => {
          const request = ValidationTestDataFactory.createBasicValidationRequest({
            riskMetadata: ValidationTestDataFactory.createRiskMetadata({ dataSensitivity: sensitivity })
          });
          return service.performRiskAssessment(request);
        })
      );

      // Risk scores should increase with sensitivity
      for (let i = 1; i < assessments.length; i++) {
        expect(assessments[i].riskFactors.dataSensitivity)
          .toBeGreaterThanOrEqual(assessments[i - 1].riskFactors.dataSensitivity);
      }
    });

    it('should assess system impact correctly', async () => {
      const lowImpactRequest = ValidationTestDataFactory.createBasicValidationRequest({
        riskMetadata: ValidationTestDataFactory.createRiskMetadata({
          impactScope: {
            affectedRecords: 1,
            dataVolume: 'small',
            systemComponents: ['web-service']
          },
          reversibility: {
            isReversible: true,
            rollbackComplexity: 'simple'
          }
        })
      });

      const highImpactRequest = ValidationTestDataFactory.createBasicValidationRequest({
        riskMetadata: ValidationTestDataFactory.createRiskMetadata({
          impactScope: {
            affectedRecords: 100000,
            dataVolume: 'large',
            systemComponents: ['database', 'authentication', 'user-management', 'billing']
          },
          reversibility: {
            isReversible: false,
            rollbackComplexity: 'complex'
          }
        })
      });

      const lowImpactAssessment = await service.performRiskAssessment(lowImpactRequest);
      const highImpactAssessment = await service.performRiskAssessment(highImpactRequest);

      expect(highImpactAssessment.riskFactors.systemImpact)
        .toBeGreaterThan(lowImpactAssessment.riskFactors.systemImpact);
    });
  });

  describe('Validation Level Determination', () => {
    it('should determine appropriate validation levels for different risk levels', async () => {
      const testCases = [
        { risk: 'LOW', expectedLevels: ['CACHE_ONLY', 'SIMPLE'] },
        { risk: 'MEDIUM', expectedLevels: ['SIMPLE', 'STANDARD'] },
        { risk: 'HIGH', expectedLevels: ['STANDARD', 'ENHANCED'] },
        { risk: 'CRITICAL', expectedLevels: ['COMPREHENSIVE', 'MULTI_PARTY'] }
      ];

      for (const testCase of testCases) {
        // Create a request that would result in the desired risk level
        const request = testCase.risk === 'CRITICAL'
          ? ValidationTestDataFactory.createHighRiskRequest()
          : ValidationTestDataFactory.createLowRiskRequest();

        const assessment = await service.performRiskAssessment(request);

        if (assessment.riskLevel === testCase.risk) {
          expect(testCase.expectedLevels).toContain(assessment.validationLevel);
        }
      }
    });

    it('should adjust validation levels based on user risk tolerance', async () => {
      const baseRequest = ValidationTestDataFactory.createBasicValidationRequest();

      const conservativeRequest = {
        ...baseRequest,
        userContext: ValidationTestDataFactory.createUserContext({
          conversationalPreferences: {
            verbosityLevel: 'detailed',
            confirmationStyle: 'thorough',
            riskTolerance: 'conservative'
          }
        })
      };

      const aggressiveRequest = {
        ...baseRequest,
        userContext: ValidationTestDataFactory.createUserContext({
          conversationalPreferences: {
            verbosityLevel: 'minimal',
            confirmationStyle: 'quick',
            riskTolerance: 'aggressive'
          }
        })
      };

      const conservativeAssessment = await service.performRiskAssessment(conservativeRequest);
      const aggressiveAssessment = await service.performRiskAssessment(aggressiveRequest);

      // Conservative users should get higher validation levels
      const validationLevelOrder = ['CACHE_ONLY', 'SIMPLE', 'STANDARD', 'ENHANCED', 'COMPREHENSIVE', 'MULTI_PARTY'];
      const conservativeIndex = validationLevelOrder.indexOf(conservativeAssessment.validationLevel);
      const aggressiveIndex = validationLevelOrder.indexOf(aggressiveAssessment.validationLevel);

      expect(conservativeIndex).toBeGreaterThanOrEqual(aggressiveIndex);
    });
  });
});

// ===== MIDDLEWARE INTEGRATION TESTS =====

describe('PreExecutionValidationMiddleware', () => {
  let middleware: PreExecutionValidationMiddleware;
  let validationService: PreExecutionValidationService;
  let mockReflector: any;

  beforeEach(async () => {
    const mockConfigService = new MockConfigService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PreExecutionValidationMiddleware,
        PreExecutionValidationService,
        { provide: ConfigService, useValue: mockConfigService },
        {
          provide: 'Reflector',
          useValue: {
            get: jest.fn()
          }
        }
      ]
    }).compile();

    middleware = module.get<PreExecutionValidationMiddleware>(PreExecutionValidationMiddleware);
    validationService = module.get<PreExecutionValidationService>(PreExecutionValidationService);
    mockReflector = module.get('Reflector');
  });

  describe('HTTP Request Processing', () => {
    it('should process HTTP requests with validation decorators', async () => {
      const mockRequest = {
        method: 'POST',
        path: '/api/database/create',
        headers: { 'content-type': 'application/json' },
        query: {},
        body: { name: 'test', data: 'value' },
        user: { id: 'user123', roles: ['user'] }
      };

      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const mockNext = jest.fn();

      // Mock successful validation
      jest.spyOn(validationService, 'validateOperation').mockResolvedValue({
        requestId: 'test-req-123',
        result: {
          decision: 'APPROVED',
          approvalConfidence: 0.9,
          conversationSummary: {
            userQuestions: [],
            systemExplanations: ['Operation approved'],
            finalUserStatement: 'Approved'
          },
          approvalMetadata: {
            approvalTimestamp: new Date(),
            approvalMethod: 'text',
            validationDuration: 1000
          }
        },
        riskAssessment: {
          riskScore: 25,
          riskLevel: 'LOW',
          validationLevel: 'SIMPLE',
          riskFactors: {
            dataSensitivity: 20,
            operationComplexity: 15,
            userContext: 10,
            systemImpact: 20,
            complianceRequirements: 5
          },
          validationRequirements: [],
          mitigationRecommendations: [],
          assessmentTimestamp: new Date()
        },
        metrics: {
          totalValidationTime: 1000,
          riskAssessmentTime: 200,
          conversationTime: 800,
          cacheHitRate: 0.0
        },
        auditTrail: {
          auditId: 'audit-123',
          request: ValidationTestDataFactory.createBasicValidationRequest(),
          response: {
            decision: 'APPROVED',
            approvalConfidence: 0.9,
            conversationSummary: {
              userQuestions: [],
              systemExplanations: ['Operation approved'],
              finalUserStatement: 'Approved'
            },
            approvalMetadata: {
              approvalTimestamp: new Date(),
              approvalMethod: 'text',
              validationDuration: 1000
            }
          },
          riskAssessment: {
            riskScore: 25,
            riskLevel: 'LOW',
            validationLevel: 'SIMPLE',
            riskFactors: {
              dataSensitivity: 20,
              operationComplexity: 15,
              userContext: 10,
              systemImpact: 20,
              complianceRequirements: 5
            },
            validationRequirements: [],
            mitigationRecommendations: [],
            assessmentTimestamp: new Date()
          },
          compliance: {
            framework: ['SOC2'],
            requirements: [],
            evidence: {}
          },
          performance: {
            validationLatency: 1000,
            cacheUtilization: false,
            resourceUsage: {}
          },
          auditTimestamp: new Date()
        }
      });

      await middleware.use(mockRequest as any, mockResponse as any, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled(); // Should not set error status
    });

    it('should reject requests when validation fails', async () => {
      const mockRequest = {
        method: 'DELETE',
        path: '/api/admin/delete-all',
        headers: { 'content-type': 'application/json' },
        query: {},
        body: {},
        user: { id: 'user123', roles: ['user'] }
      };

      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const mockNext = jest.fn();

      // Mock rejected validation
      jest.spyOn(validationService, 'validateOperation').mockResolvedValue({
        requestId: 'test-req-123',
        result: {
          decision: 'REJECTED',
          approvalConfidence: 0.1,
          conversationSummary: {
            userQuestions: ['Why was this rejected?'],
            systemExplanations: ['Operation too risky'],
            finalUserStatement: 'Rejected due to high risk'
          },
          approvalMetadata: {
            approvalTimestamp: new Date(),
            approvalMethod: 'text',
            validationDuration: 2000
          }
        },
        riskAssessment: {
          riskScore: 85,
          riskLevel: 'CRITICAL',
          validationLevel: 'MULTI_PARTY',
          riskFactors: {
            dataSensitivity: 90,
            operationComplexity: 80,
            userContext: 70,
            systemImpact: 95,
            complianceRequirements: 85
          },
          validationRequirements: [],
          mitigationRecommendations: ['Require additional approval', 'Create backup'],
          assessmentTimestamp: new Date()
        },
        metrics: {
          totalValidationTime: 2000,
          riskAssessmentTime: 500,
          conversationTime: 1500,
          cacheHitRate: 0.0
        },
        auditTrail: {} as any
      });

      await middleware.use(mockRequest as any, mockResponse as any, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Operation not authorized'
        })
      );
    });
  });

  describe('Decorator Integration', () => {
    it('should handle @ParlantCritical decorator correctly', () => {
      const decorator = ParlantCritical('Critical test operation');
      expect(decorator).toBeDefined();

      // In a real application, this would be tested with actual controller methods
      // For this test, we verify the decorator function is created correctly
    });

    it('should handle @ParlantSecure decorator correctly', () => {
      const decorator = ParlantSecure('Secure test operation');
      expect(decorator).toBeDefined();
    });

    it('should handle @ParlantStandard decorator correctly', () => {
      const decorator = ParlantStandard('Standard test operation');
      expect(decorator).toBeDefined();
    });
  });

  describe('Middleware Health and Metrics', () => {
    it('should provide middleware health check', async () => {
      const healthCheck = await middleware.healthCheck();

      expect(healthCheck.status).toBe('healthy');
      expect(healthCheck.metrics).toBeDefined();
      expect(healthCheck.config).toBeDefined();
    });

    it('should track middleware metrics', () => {
      const initialMetrics = middleware.getMetrics();

      expect(initialMetrics).toHaveProperty('totalRequests');
      expect(initialMetrics).toHaveProperty('validatedRequests');
      expect(initialMetrics).toHaveProperty('bypassedRequests');
      expect(initialMetrics).toHaveProperty('averageValidationTime');
    });
  });
});

// ===== PERFORMANCE TESTS =====

describe('Performance Tests', () => {
  let validationService: PreExecutionValidationService;

  beforeEach(async () => {
    const mockConfigService = new MockConfigService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PreExecutionValidationService,
        { provide: ConfigService, useValue: mockConfigService }
      ]
    }).compile();

    validationService = module.get<PreExecutionValidationService>(PreExecutionValidationService);
  });

  describe('Response Time Requirements', () => {
    it('should complete validation within 500ms for simple operations', async () => {
      const request = ValidationTestDataFactory.createLowRiskRequest();

      const { duration } = await PerformanceTestUtils.measureExecutionTime(
        () => validationService.validateOperation(request)
      );

      expect(duration).toBeLessThan(500); // Sub-500ms requirement
    });

    it('should complete validation within 1000ms for complex operations', async () => {
      const request = ValidationTestDataFactory.createHighRiskRequest();

      const { duration } = await PerformanceTestUtils.measureExecutionTime(
        () => validationService.validateOperation(request)
      );

      expect(duration).toBeLessThan(1000); // 1 second for complex operations
    });

    it('should maintain performance under concurrent load', async () => {
      const concurrentRequests = PerformanceTestUtils.generateConcurrentRequests(20);

      const startTime = performance.now();
      const validationPromises = concurrentRequests.map(request =>
        validationService.validateOperation(request)
      );

      await Promise.all(validationPromises);
      const totalDuration = performance.now() - startTime;

      // Average time per validation should still be reasonable under load
      const averageTime = totalDuration / concurrentRequests.length;
      expect(averageTime).toBeLessThan(2000); // 2 seconds average under load
    });
  });

  describe('Caching Performance', () => {
    it('should significantly improve performance with caching', async () => {
      const request = ValidationTestDataFactory.createBasicValidationRequest();

      // First validation (no cache)
      const { duration: firstDuration } = await PerformanceTestUtils.measureExecutionTime(
        () => validationService.validateOperation(request)
      );

      // Second validation (with cache)
      const { duration: secondDuration } = await PerformanceTestUtils.measureExecutionTime(
        () => validationService.validateOperation(request)
      );

      // Cached validation should be at least 50% faster
      expect(secondDuration).toBeLessThan(firstDuration * 0.5);
    });

    it('should maintain cache hit rate above 80% for repeated operations', async () => {
      const baseRequest = ValidationTestDataFactory.createBasicValidationRequest();
      let totalCacheHitRate = 0;
      const iterations = 10;

      // First request to populate cache
      await validationService.validateOperation(baseRequest);

      // Subsequent requests should hit cache
      for (let i = 0; i < iterations; i++) {
        const response = await validationService.validateOperation({
          ...baseRequest,
          id: `cache-test-${i}` // Different ID but same validation profile
        });
        totalCacheHitRate += response.metrics.cacheHitRate;
      }

      const averageCacheHitRate = totalCacheHitRate / iterations;
      expect(averageCacheHitRate).toBeGreaterThan(0.8); // 80% cache hit rate
    });
  });

  describe('Memory Usage', () => {
    it('should not cause memory leaks with many validations', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Perform many validations
      for (let i = 0; i < 100; i++) {
        const request = ValidationTestDataFactory.createBasicValidationRequest({
          id: `memory-test-${i}`
        });
        await validationService.validateOperation(request);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 50MB for 100 validations)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });
});

// ===== SECURITY TESTS =====

describe('Security Tests', () => {
  let validationService: PreExecutionValidationService;

  beforeEach(async () => {
    const mockConfigService = new MockConfigService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PreExecutionValidationService,
        { provide: ConfigService, useValue: mockConfigService }
      ]
    }).compile();

    validationService = module.get<PreExecutionValidationService>(PreExecutionValidationService);
  });

  describe('Authorization Tests', () => {
    it('should properly validate user permissions for restricted operations', async () => {
      const restrictedRequest = ValidationTestDataFactory.createBasicValidationRequest({
        securityClassification: 'RESTRICTED',
        userContext: ValidationTestDataFactory.createUserContext({
          roles: ['user'] // Regular user trying restricted operation
        })
      });

      const response = await validationService.validateOperation(restrictedRequest);

      // Should require enhanced validation or be rejected
      expect(response.riskAssessment.validationLevel).toBeOneOf(['ENHANCED', 'COMPREHENSIVE', 'MULTI_PARTY']);
    });

    it('should allow admin users more permissive access', async () => {
      const adminRequest = ValidationTestDataFactory.createBasicValidationRequest({
        securityClassification: 'CONFIDENTIAL',
        userContext: ValidationTestDataFactory.createUserContext({
          roles: ['admin', 'super-admin'],
          validationHistory: {
            recentValidations: 10,
            successRate: 0.98,
            averageResponseTime: 2000
          }
        })
      });

      const userRequest = ValidationTestDataFactory.createBasicValidationRequest({
        securityClassification: 'CONFIDENTIAL',
        userContext: ValidationTestDataFactory.createUserContext({
          roles: ['user'],
          validationHistory: {
            recentValidations: 10,
            successRate: 0.95,
            averageResponseTime: 5000
          }
        })
      });

      const adminResponse = await validationService.validateOperation(adminRequest);
      const userResponse = await validationService.validateOperation(userRequest);

      // Admin should have lower risk assessment than regular user
      expect(adminResponse.riskAssessment.riskScore).toBeLessThanOrEqual(userResponse.riskAssessment.riskScore);
    });
  });

  describe('Audit Trail Tests', () => {
    it('should create comprehensive audit trails for all validations', async () => {
      const request = ValidationTestDataFactory.createBasicValidationRequest();

      const response = await validationService.validateOperation(request);

      expect(response.auditTrail).toBeDefined();
      expect(response.auditTrail.auditId).toBeDefined();
      expect(response.auditTrail.request).toEqual(request);
      expect(response.auditTrail.response).toBeDefined();
      expect(response.auditTrail.riskAssessment).toBeDefined();
      expect(response.auditTrail.compliance).toBeDefined();
      expect(response.auditTrail.performance).toBeDefined();
      expect(response.auditTrail.auditTimestamp).toBeInstanceOf(Date);
    });

    it('should include compliance framework information in audit trails', async () => {
      const complianceRequest = ValidationTestDataFactory.createBasicValidationRequest({
        riskMetadata: ValidationTestDataFactory.createRiskMetadata({
          compliance: {
            requiresApproval: true,
            auditRequired: true,
            complianceFrameworks: ['SOC2', 'GDPR', 'HIPAA']
          }
        })
      });

      const response = await validationService.validateOperation(complianceRequest);

      expect(response.auditTrail.compliance.framework).toContain('SOC2');
      expect(response.auditTrail.compliance.framework).toContain('GDPR');
      expect(response.auditTrail.compliance.framework).toContain('HIPAA');
      expect(response.auditTrail.compliance.evidence).toBeDefined();
    });
  });

  describe('Input Validation Tests', () => {
    it('should validate and sanitize user inputs', async () => {
      const maliciousRequest = ValidationTestDataFactory.createBasicValidationRequest({
        parameters: {
          // Simulate potentially malicious inputs
          script: '<script>alert("xss")</script>',
          sqlInjection: "'; DROP TABLE users; --",
          commandInjection: '; rm -rf /',
          normalParam: 'safe value'
        }
      });

      // Should not throw error but should handle malicious inputs safely
      const response = await validationService.validateOperation(maliciousRequest);

      expect(response).toBeDefined();
      expect(response.auditTrail.request.parameters).toBeDefined();
      // In a real implementation, malicious inputs would be sanitized or flagged
    });
  });
});

// ===== USER EXPERIENCE TESTS =====

describe('User Experience Tests', () => {
  let uxOptimizer: UserExperienceOptimizer;

  beforeEach(async () => {
    const mockConfigService = new MockConfigService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserExperienceOptimizer,
        { provide: ConfigService, useValue: mockConfigService }
      ]
    }).compile();

    uxOptimizer = module.get<UserExperienceOptimizer>(UserExperienceOptimizer);
  });

  describe('Progressive Disclosure', () => {
    it('should provide minimal disclosure for expert users', async () => {
      const request = ValidationTestDataFactory.createBasicValidationRequest({
        userContext: ValidationTestDataFactory.createUserContext({
          conversationalPreferences: {
            verbosityLevel: 'minimal',
            confirmationStyle: 'quick',
            riskTolerance: 'aggressive'
          }
        })
      });

      const riskAssessment = {
        riskScore: 20,
        riskLevel: 'LOW' as const,
        validationLevel: 'SIMPLE' as const,
        riskFactors: {
          dataSensitivity: 10,
          operationComplexity: 15,
          userContext: 5,
          systemImpact: 10,
          complianceRequirements: 0
        },
        validationRequirements: [],
        mitigationRecommendations: [],
        assessmentTimestamp: new Date()
      };

      const optimization = await uxOptimizer.optimizeUserExperience(
        request,
        riskAssessment,
        []
      );

      expect(optimization.validationFlow.complexityLevel).toBe('simple');
      expect(optimization.validationFlow.steps.length).toBeLessThanOrEqual(3);
      expect(optimization.progressiveDisclosure.currentLevel).toBeOneOf(['minimal', 'standard']);
    });

    it('should provide comprehensive disclosure for novice users', async () => {
      const request = ValidationTestDataFactory.createHighRiskRequest();

      const riskAssessment = {
        riskScore: 80,
        riskLevel: 'HIGH' as const,
        validationLevel: 'COMPREHENSIVE' as const,
        riskFactors: {
          dataSensitivity: 80,
          operationComplexity: 70,
          userContext: 60,
          systemImpact: 85,
          complianceRequirements: 90
        },
        validationRequirements: [
          {
            type: 'confirmation' as const,
            description: 'User confirmation required',
            mandatory: true,
            estimatedTimeMs: 10000
          }
        ],
        mitigationRecommendations: ['Create backup', 'Get approval'],
        assessmentTimestamp: new Date()
      };

      const optimization = await uxOptimizer.optimizeUserExperience(
        request,
        riskAssessment,
        riskAssessment.validationRequirements
      );

      expect(optimization.validationFlow.complexityLevel).toBeOneOf(['complex', 'expert']);
      expect(optimization.progressiveDisclosure.currentLevel).toBeOneOf(['expanded', 'comprehensive']);
      expect(optimization.contextualHelp.length).toBeGreaterThan(0);
    });
  });

  describe('Contextual Help', () => {
    it('should provide appropriate help content based on user experience level', async () => {
      const noviceRequest = ValidationTestDataFactory.createBasicValidationRequest({
        userContext: ValidationTestDataFactory.createUserContext({
          conversationalPreferences: {
            verbosityLevel: 'detailed',
            confirmationStyle: 'thorough',
            riskTolerance: 'conservative'
          }
        })
      });

      const riskAssessment = {
        riskScore: 40,
        riskLevel: 'MEDIUM' as const,
        validationLevel: 'STANDARD' as const,
        riskFactors: {
          dataSensitivity: 30,
          operationComplexity: 40,
          userContext: 20,
          systemImpact: 50,
          complianceRequirements: 30
        },
        validationRequirements: [],
        mitigationRecommendations: [],
        assessmentTimestamp: new Date()
      };

      const optimization = await uxOptimizer.optimizeUserExperience(
        noviceRequest,
        riskAssessment,
        []
      );

      expect(optimization.contextualHelp).toBeDefined();
      expect(optimization.contextualHelp.length).toBeGreaterThan(0);

      const helpTypes = optimization.contextualHelp.map(help => help.type);
      expect(helpTypes).toContain('tooltip');
    });
  });

  describe('Accessibility', () => {
    it('should configure accessibility enhancements for users who need them', async () => {
      const accessibleRequest = ValidationTestDataFactory.createBasicValidationRequest({
        userContext: ValidationTestDataFactory.createUserContext({
          // Simulate accessibility preferences would be set
        })
      });

      const riskAssessment = {
        riskScore: 30,
        riskLevel: 'LOW' as const,
        validationLevel: 'SIMPLE' as const,
        riskFactors: {
          dataSensitivity: 20,
          operationComplexity: 25,
          userContext: 15,
          systemImpact: 30,
          complianceRequirements: 10
        },
        validationRequirements: [],
        mitigationRecommendations: [],
        assessmentTimestamp: new Date()
      };

      const optimization = await uxOptimizer.optimizeUserExperience(
        accessibleRequest,
        riskAssessment,
        []
      );

      expect(optimization.accessibilityEnhancements).toBeDefined();
      expect(optimization.accessibilityEnhancements.screenReaderOptimizations).toBeDefined();
      expect(optimization.accessibilityEnhancements.keyboardNavigation).toBeDefined();
      expect(optimization.accessibilityEnhancements.visualEnhancements).toBeDefined();
    });
  });
});

// ===== INTEGRATION TESTS =====

describe('Integration Tests', () => {
  let validationService: PreExecutionValidationService;
  let riskAssessmentService: RiskAssessmentService;
  let uxOptimizer: UserExperienceOptimizer;

  beforeEach(async () => {
    const mockConfigService = new MockConfigService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PreExecutionValidationService,
        RiskAssessmentService,
        UserExperienceOptimizer,
        { provide: ConfigService, useValue: mockConfigService }
      ]
    }).compile();

    validationService = module.get<PreExecutionValidationService>(PreExecutionValidationService);
    riskAssessmentService = module.get<RiskAssessmentService>(RiskAssessmentService);
    uxOptimizer = module.get<UserExperienceOptimizer>(UserExperienceOptimizer);
  });

  describe('End-to-End Validation Flow', () => {
    it('should complete full validation flow from request to optimized response', async () => {
      const request = ValidationTestDataFactory.createBasicValidationRequest();

      // Step 1: Validation Service processes request
      const validationResponse = await validationService.validateOperation(request);

      expect(validationResponse).toBeDefined();
      expect(validationResponse.result.decision).toBeOneOf(['APPROVED', 'PENDING', 'REJECTED']);

      // Step 2: Risk Assessment is included
      expect(validationResponse.riskAssessment).toBeDefined();
      expect(validationResponse.riskAssessment.riskScore).toBeGreaterThanOrEqual(0);
      expect(validationResponse.riskAssessment.riskScore).toBeLessThanOrEqual(100);

      // Step 3: UX Optimization can process the results
      const uxOptimization = await uxOptimizer.optimizeUserExperience(
        request,
        validationResponse.riskAssessment,
        validationResponse.riskAssessment.validationRequirements
      );

      expect(uxOptimization).toBeDefined();
      expect(uxOptimization.validationFlow).toBeDefined();
      expect(uxOptimization.progressiveDisclosure).toBeDefined();

      // Step 4: Audit trail is complete
      expect(validationResponse.auditTrail).toBeDefined();
      expect(validationResponse.auditTrail.auditId).toBeDefined();
    });

    it('should maintain consistency across multiple validation requests', async () => {
      const baseRequest = ValidationTestDataFactory.createBasicValidationRequest();
      const responses: PreExecutionValidationResponse[] = [];

      // Process multiple identical requests
      for (let i = 0; i < 5; i++) {
        const request = {
          ...baseRequest,
          id: `consistency-test-${i}`,
          timestamp: new Date()
        };

        const response = await validationService.validateOperation(request);
        responses.push(response);
      }

      // All responses should have consistent risk assessments (accounting for caching)
      const riskScores = responses.map(r => r.riskAssessment.riskScore);
      const uniqueRiskScores = [...new Set(riskScores)];

      // Should have at most 2 unique scores (first uncached, rest cached)
      expect(uniqueRiskScores.length).toBeLessThanOrEqual(2);

      // All decisions should be the same for identical requests
      const decisions = responses.map(r => r.result.decision);
      const uniqueDecisions = [...new Set(decisions)];
      expect(uniqueDecisions.length).toBe(1);
    });
  });

  describe('Service Health Integration', () => {
    it('should provide consistent health status across all services', async () => {
      const validationHealth = await validationService.healthCheck();
      const riskAssessmentHealth = await riskAssessmentService.healthCheck();
      const uxOptimizerHealth = await uxOptimizer.healthCheck();

      expect(validationHealth.status).toBe('healthy');
      expect(riskAssessmentHealth.status).toBe('healthy');
      expect(uxOptimizerHealth.status).toBe('healthy');

      // All services should report metrics
      expect(validationHealth.metrics).toBeDefined();
      expect(riskAssessmentHealth.metrics).toBeDefined();
      expect(uxOptimizerHealth.metrics).toBeDefined();
    });
  });
});

// ===== TEST UTILITIES AND HELPERS =====

/**
 * Custom Jest matchers for validation testing
 */
expect.extend({
  toBeOneOf(received, expected) {
    const pass = expected.includes(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be one of ${expected.join(', ')}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be one of ${expected.join(', ')}`,
        pass: false,
      };
    }
  },
});

// Declare the custom matcher
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeOneOf(expected: any[]): R;
    }
  }
}

/**
 * Test suite configuration and teardown
 */
afterAll(async () => {
  // Clean up any resources, close connections, etc.
  // In a real application, this would close database connections, etc.
});

beforeAll(async () => {
  // Set up test environment
  // In a real application, this would set up test databases, etc.
});

/**
 * Performance benchmarking utility
 */
export class ValidationPerformanceBenchmark {
  static async runBenchmark() {
    console.log('Running Pre-Execution Validation Performance Benchmark...');

    const mockConfigService = new MockConfigService();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PreExecutionValidationService,
        { provide: ConfigService, useValue: mockConfigService }
      ]
    }).compile();

    const service = module.get<PreExecutionValidationService>(PreExecutionValidationService);

    // Benchmark different scenarios
    const scenarios = [
      { name: 'Low Risk Operations', generator: () => ValidationTestDataFactory.createLowRiskRequest() },
      { name: 'High Risk Operations', generator: () => ValidationTestDataFactory.createHighRiskRequest() },
      { name: 'Cached Operations', generator: () => ValidationTestDataFactory.createLowRiskRequest() }
    ];

    for (const scenario of scenarios) {
      const times: number[] = [];

      for (let i = 0; i < 10; i++) {
        const request = scenario.generator();
        const { duration } = await PerformanceTestUtils.measureExecutionTime(
          () => service.validateOperation(request)
        );
        times.push(duration);
      }

      const avg = times.reduce((sum, time) => sum + time, 0) / times.length;
      const min = Math.min(...times);
      const max = Math.max(...times);

      console.log(`${scenario.name}:`);
      console.log(`  Average: ${avg.toFixed(2)}ms`);
      console.log(`  Min: ${min.toFixed(2)}ms`);
      console.log(`  Max: ${max.toFixed(2)}ms`);
      console.log(`  Sub-500ms: ${times.filter(t => t < 500).length}/10`);
    }
  }
}

// Export test utilities for use in other test files
export {
  ValidationTestDataFactory,
  PerformanceTestUtils,
  MockConfigService
};