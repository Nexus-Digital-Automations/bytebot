/**
 * Comprehensive PARLANT Integration Tests
 * Tests all PARLANT validation services working together in the Orchestrator
 */

import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ParlantOrchestratorService } from '../parlant-orchestrator.service';
import { MultiServiceValidationService } from '../multi-service-validation.service';
import { SecurityComplianceService } from '../security-compliance.service';
import { PerformanceOptimizationService } from '../performance-optimization.service';
import { ErrorHandlingRecoveryService } from '../error-handling-recovery.service';
import {
  ParlantValidationRequest,
  ParlantValidationResponse,
  SecurityLevel,
  ParlantUserContext,
  ParlantOrchestrationRequest,
  OrchestrationExecutionContext,
  ValidationQualityLevel,
  CircuitBreakerState,
  RecoveryStrategy,
  ErrorSeverity,
  ServiceValidationStatus,
} from '../../types/parlant-shared.types';

describe('PARLANT Integration Tests', () => {
  let module: TestingModule;
  let parlantService: ParlantOrchestratorService;
  let multiServiceValidation: MultiServiceValidationService;
  let securityCompliance: SecurityComplianceService;
  let performanceOptimization: PerformanceOptimizationService;
  let errorHandling: ErrorHandlingRecoveryService;

  const mockUserContext: ParlantUserContext = {
    userId: 'test-user-123',
    roles: ['user', 'admin'],
    sessionId: 'session-abc-123',
    ipAddress: '192.168.1.100',
    metadata: {
      department: 'engineering',
      clearanceLevel: 'standard'
    }
  };

  const mockValidationRequest: ParlantValidationRequest = {
    operationId: 'test-op-123',
    functionName: 'getUserData',
    packageName: 'user-service',
    description: 'Retrieve user data for profile display',
    parameters: {
      userId: 'user-456',
      includePrivateData: false
    },
    userContext: mockUserContext,
    securityLevel: SecurityLevel._MEDIUM,
    timeout: 5000
  };

  beforeEach(async () => {
    const moduleBuilder = Test.createTestingModule({
      providers: [
        ParlantOrchestratorService,
        MultiServiceValidationService,
        SecurityComplianceService,
        PerformanceOptimizationService,
        ErrorHandlingRecoveryService,
        {
          provide: Logger,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
            verbose: jest.fn(),
          },
        },
      ],
    });

    module = await moduleBuilder.compile();
    parlantService = module.get<ParlantOrchestratorService>(ParlantOrchestratorService);
    multiServiceValidation = module.get<MultiServiceValidationService>(MultiServiceValidationService);
    securityCompliance = module.get<SecurityComplianceService>(SecurityComplianceService);
    performanceOptimization = module.get<PerformanceOptimizationService>(PerformanceOptimizationService);
    errorHandling = module.get<ErrorHandlingRecoveryService>(ErrorHandlingRecoveryService);
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('ParlantOrchestratorService Integration', () => {
    it('should perform comprehensive PARLANT validation with all services', async () => {
      const orchestrationRequest: ParlantOrchestrationRequest = {
        operationId: 'comprehensive-test-001',
        functionName: 'processPayment',
        packageName: 'payment-service',
        description: 'Process customer payment transaction',
        parameters: {
          customerId: 'customer-789',
          amount: 150.00,
          currency: 'USD',
          paymentMethod: 'credit_card'
        },
        userContext: mockUserContext,
        securityClassification: SecurityLevel._HIGH,
        qualityLevel: ValidationQualityLevel.COMPREHENSIVE,
        enableRealTimeValidation: true,
        enablePerformanceOptimization: true,
        timeout: 10000
      };

      const executionContext: OrchestrationExecutionContext = {
        traceId: 'trace-abc-123',
        spanId: 'span-def-456',
        parentOperationId: 'parent-op-789',
        priority: 'high',
        deadline: new Date(Date.now() + 30000),
        resourceConstraints: {
          maxMemoryMb: 512,
          maxCpuPercent: 80,
          maxExecutionTimeMs: 25000
        },
        complianceRequirements: ['GDPR', 'PCI-DSS'],
        auditLevel: 'full'
      };

      // Execute comprehensive orchestration
      const result = await parlantService.orchestrateWithParlant(
        orchestrationRequest,
        executionContext
      );

      // Verify orchestration results
      expect(result).toBeDefined();
      expect(result.approved).toBeDefined();
      expect(result.conversationId).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.metadata).toBeDefined();
      expect(result.metadata.processingTime).toBeGreaterThan(0);
      expect(result.metadata.source).toBe('parlant');

      // Verify security classification was respected
      if (result.approved) {
        expect(result.executionContext).toBeDefined();
        expect(result.executionContext?.resourceLimits).toBeDefined();
        expect(result.executionContext?.securityRestrictions).toBeDefined();
      }
    }, 15000);

    it('should handle multiple validation quality levels', async () => {
      const testCases = [
        { level: ValidationQualityLevel.FAST, maxTime: 2000 },
        { level: ValidationQualityLevel.STANDARD, maxTime: 5000 },
        { level: ValidationQualityLevel.COMPREHENSIVE, maxTime: 10000 },
        { level: ValidationQualityLevel.EXHAUSTIVE, maxTime: 15000 }
      ];

      for (const testCase of testCases) {
        const request: ParlantOrchestrationRequest = {
          ...mockValidationRequest,
          operationId: `quality-test-${testCase.level}`,
          qualityLevel: testCase.level,
          timeout: testCase.maxTime
        };

        const context: OrchestrationExecutionContext = {
          traceId: `trace-${testCase.level}`,
          spanId: `span-${testCase.level}`,
          priority: 'normal',
          deadline: new Date(Date.now() + testCase.maxTime),
          resourceConstraints: {
            maxMemoryMb: 256,
            maxCpuPercent: 50,
            maxExecutionTimeMs: testCase.maxTime
          },
          complianceRequirements: [],
          auditLevel: 'standard'
        };

        const startTime = Date.now();
        const result = await parlantService.orchestrateWithParlant(request, context);
        const duration = Date.now() - startTime;

        expect(result).toBeDefined();
        expect(duration).toBeLessThan(testCase.maxTime);
        expect(result.metadata.processingTime).toBeLessThan(testCase.maxTime);
      }
    }, 20000);
  });

  describe('Multi-Service Validation Integration', () => {
    it('should coordinate validation across multiple services', async () => {
      const multiServiceRequest = {
        primaryRequest: mockValidationRequest,
        serviceEndpoints: [
          { serviceName: 'auth-service', endpoint: '/validate/permissions', weight: 0.3 },
          { serviceName: 'user-service', endpoint: '/validate/user', weight: 0.2 },
          { serviceName: 'security-service', endpoint: '/validate/security', weight: 0.3 },
          { serviceName: 'audit-service', endpoint: '/validate/compliance', weight: 0.2 }
        ],
        consensusAlgorithm: 'SUPERMAJORITY',
        timeoutMs: 8000,
        failureThreshold: 0.25
      };

      const result = await multiServiceValidation.coordinateMultiServiceValidation(
        multiServiceRequest
      );

      expect(result).toBeDefined();
      expect(result.overallStatus).toBeDefined();
      expect(result.serviceResults).toBeDefined();
      expect(result.serviceResults.size).toBeGreaterThan(0);
      expect(result.totalTimeMs).toBeGreaterThan(0);
      expect(result.summary).toBeDefined();

      // Verify consensus was reached
      expect([
        ServiceValidationStatus.SUCCESS,
        ServiceValidationStatus.PARTIAL_SUCCESS,
        ServiceValidationStatus.FAILURE
      ]).toContain(result.overallStatus);
    }, 12000);

    it('should handle service failures gracefully', async () => {
      const faultToleranceRequest = {
        primaryRequest: {
          ...mockValidationRequest,
          operationId: 'fault-tolerance-test',
          securityLevel: SecurityLevel._LOW // Lower security for fault tolerance testing
        },
        serviceEndpoints: [
          { serviceName: 'failing-service', endpoint: '/validate/fail', weight: 0.2 },
          { serviceName: 'slow-service', endpoint: '/validate/slow', weight: 0.2 },
          { serviceName: 'working-service', endpoint: '/validate/success', weight: 0.6 }
        ],
        consensusAlgorithm: 'SIMPLE_MAJORITY',
        timeoutMs: 5000,
        failureThreshold: 0.5
      };

      const result = await multiServiceValidation.coordinateMultiServiceValidation(
        faultToleranceRequest
      );

      expect(result).toBeDefined();
      expect(result.overallStatus).toBeDefined();

      // Should handle failures gracefully
      if (result.overallStatus === ServiceValidationStatus.PARTIAL_SUCCESS) {
        expect(result.serviceResults.size).toBeGreaterThan(0);
        // At least one service should have succeeded
        const successCount = Array.from(result.serviceResults.values())
          .filter(r => r.status === ServiceValidationStatus.SUCCESS).length;
        expect(successCount).toBeGreaterThan(0);
      }
    }, 10000);
  });

  describe('Security Compliance Integration', () => {
    it('should validate security compliance for different frameworks', async () => {
      const complianceFrameworks = ['GDPR', 'HIPAA', 'SOX', 'PCI-DSS'];

      for (const framework of complianceFrameworks) {
        const complianceRequest = {
          validationRequest: {
            ...mockValidationRequest,
            operationId: `compliance-test-${framework}`,
            securityLevel: SecurityLevel._HIGH
          },
          complianceFrameworks: [framework],
          auditLevel: 'comprehensive',
          requirementsProfile: 'enterprise',
          enforcementMode: 'strict'
        };

        const result = await securityCompliance.validateSecurityCompliance(
          complianceRequest
        );

        expect(result).toBeDefined();
        expect(result.compliant).toBeDefined();
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(100);
        expect(result.violations).toBeDefined();
        expect(result.remediation).toBeDefined();

        // Framework-specific validation
        if (result.compliant) {
          expect(result.score).toBeGreaterThan(70); // Minimum compliance threshold
        }
      }
    }, 12000);

    it('should generate comprehensive audit trails', async () => {
      const auditRequest = {
        validationRequest: {
          ...mockValidationRequest,
          operationId: 'audit-trail-test',
          securityLevel: SecurityLevel._CRITICAL
        },
        complianceFrameworks: ['GDPR', 'SOX'],
        auditLevel: 'full',
        requirementsProfile: 'financial',
        enforcementMode: 'audit'
      };

      const result = await securityCompliance.validateSecurityCompliance(
        auditRequest
      );

      expect(result).toBeDefined();
      expect(result.violations).toBeDefined();

      // High security levels should have detailed audit information
      if (result.violations.length > 0) {
        result.violations.forEach(violation => {
          expect(violation.type).toBeDefined();
          expect(violation.severity).toBeDefined();
          expect(violation.description).toBeDefined();
          expect(violation.component).toBeDefined();
        });
      }
    }, 8000);
  });

  describe('Performance Optimization Integration', () => {
    it('should optimize validation performance with caching', async () => {
      const optimizationRequest = {
        validationRequest: {
          ...mockValidationRequest,
          operationId: 'performance-cache-test'
        },
        cacheStrategy: 'L1_L2_L3',
        cacheTtlMs: 30000,
        asyncProcessing: 'IMMEDIATE',
        performanceTarget: 'SUB_1000MS',
        enableStreaming: false
      };

      // First request (cache miss)
      const startTime1 = Date.now();
      const result1 = await performanceOptimization.optimizeValidation(
        optimizationRequest
      );
      const duration1 = Date.now() - startTime1;

      expect(result1).toBeDefined();
      expect(result1.optimized).toBe(true);
      expect(result1.cacheHit).toBe(false);
      expect(result1.processingTimeMs).toBeGreaterThan(0);

      // Second request (cache hit)
      const startTime2 = Date.now();
      const result2 = await performanceOptimization.optimizeValidation(
        optimizationRequest
      );
      const duration2 = Date.now() - startTime2;

      expect(result2).toBeDefined();
      expect(result2.optimized).toBe(true);
      expect(result2.cacheHit).toBe(true);
      expect(duration2).toBeLessThan(duration1); // Cache should be faster
    }, 10000);

    it('should handle different async processing strategies', async () => {
      const strategies = ['IMMEDIATE', 'ASYNC', 'BATCH', 'STREAMING'];

      for (const strategy of strategies) {
        const optimizationRequest = {
          validationRequest: {
            ...mockValidationRequest,
            operationId: `async-test-${strategy}`
          },
          cacheStrategy: 'L1_ONLY',
          cacheTtlMs: 10000,
          asyncProcessing: strategy,
          performanceTarget: 'BALANCED',
          enableStreaming: strategy === 'STREAMING'
        };

        const result = await performanceOptimization.optimizeValidation(
          optimizationRequest
        );

        expect(result).toBeDefined();
        expect(result.optimized).toBe(true);
        expect(result.asyncStrategy).toBe(strategy);
        expect(result.processingTimeMs).toBeGreaterThan(0);

        // Strategy-specific validation
        if (strategy === 'IMMEDIATE') {
          expect(result.processingTimeMs).toBeLessThan(2000);
        } else if (strategy === 'STREAMING') {
          expect(result.streamingEnabled).toBe(true);
        }
      }
    }, 15000);
  });

  describe('Error Handling and Recovery Integration', () => {
    it('should handle errors with circuit breaker patterns', async () => {
      const errorRequest = {
        originalRequest: {
          ...mockValidationRequest,
          operationId: 'circuit-breaker-test',
          functionName: 'failingFunction'
        },
        error: new Error('Simulated service failure'),
        attemptNumber: 1,
        previousAttempts: [],
        context: {
          serviceName: 'test-service',
          operationId: 'circuit-breaker-test',
          timestamp: new Date(),
          userContext: mockUserContext,
          systemState: {
            cpuUsage: 45,
            memoryUsage: 60,
            activeConnections: 120,
            queueDepth: 5,
            errorRate: 15
          }
        }
      };

      const result = await errorHandling.handleError(errorRequest);

      expect(result).toBeDefined();
      expect(result.handled).toBeDefined();
      expect(result.strategy).toBeDefined();
      expect(result.recommendedAction).toBeDefined();
      expect(result.errorAnalysis).toBeDefined();
      expect(result.recoveryMetadata).toBeDefined();

      // Verify error analysis
      expect(result.errorAnalysis.category).toBeDefined();
      expect(result.errorAnalysis.severity).toBeDefined();
      expect(result.errorAnalysis.rootCause).toBeDefined();
      expect(result.errorAnalysis.impact).toBeDefined();

      // Verify recovery strategy selection
      expect([
        RecoveryStrategy.IMMEDIATE_RETRY,
        RecoveryStrategy.EXPONENTIAL_BACKOFF,
        RecoveryStrategy.CIRCUIT_BREAKER,
        RecoveryStrategy.FALLBACK_SERVICE,
        RecoveryStrategy.GRACEFUL_DEGRADATION
      ]).toContain(result.strategy);
    }, 8000);

    it('should collect and report error handling metrics', async () => {
      const metrics = await errorHandling.getErrorHandlingMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.circuitBreakers).toBeDefined();
      expect(metrics.errorPatterns).toBeDefined();
      expect(metrics.fallbackServices).toBeDefined();

      // Verify circuit breaker metrics structure
      if (Array.isArray(metrics.circuitBreakers) && metrics.circuitBreakers.length > 0) {
        metrics.circuitBreakers.forEach((cb: any) => {
          expect(cb.service).toBeDefined();
          expect(cb.state).toBeDefined();
          expect([
            CircuitBreakerState.CLOSED,
            CircuitBreakerState.OPEN,
            CircuitBreakerState.HALF_OPEN
          ]).toContain(cb.state);
        });
      }
    }, 5000);
  });

  describe('End-to-End Integration Tests', () => {
    it('should perform complete validation workflow with all services', async () => {
      const e2eRequest: ParlantOrchestrationRequest = {
        operationId: 'e2e-integration-test',
        functionName: 'completeWorkflow',
        packageName: 'integration-service',
        description: 'End-to-end validation workflow test',
        parameters: {
          workflowId: 'workflow-123',
          steps: ['validate', 'process', 'audit', 'complete']
        },
        userContext: mockUserContext,
        securityClassification: SecurityLevel._HIGH,
        qualityLevel: ValidationQualityLevel.COMPREHENSIVE,
        enableRealTimeValidation: true,
        enablePerformanceOptimization: true,
        enableErrorRecovery: true,
        timeout: 20000
      };

      const executionContext: OrchestrationExecutionContext = {
        traceId: 'e2e-trace-123',
        spanId: 'e2e-span-456',
        priority: 'high',
        deadline: new Date(Date.now() + 30000),
        resourceConstraints: {
          maxMemoryMb: 1024,
          maxCpuPercent: 90,
          maxExecutionTimeMs: 25000
        },
        complianceRequirements: ['GDPR', 'PCI-DSS', 'SOX'],
        auditLevel: 'comprehensive'
      };

      // Execute complete workflow
      const startTime = Date.now();
      const result = await parlantService.orchestrateWithParlant(
        e2eRequest,
        executionContext
      );
      const totalDuration = Date.now() - startTime;

      // Comprehensive validation
      expect(result).toBeDefined();
      expect(result.approved).toBeDefined();
      expect(result.conversationId).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.metadata).toBeDefined();
      expect(result.metadata.processingTime).toBeGreaterThan(0);
      expect(totalDuration).toBeLessThan(25000); // Should complete within time limit

      // Verify all metadata is populated
      expect(result.metadata.startTime).toBeDefined();
      expect(result.metadata.endTime).toBeDefined();
      expect(result.metadata.cacheStatus).toBeDefined();
      expect(result.metadata.source).toBeDefined();
      expect(result.metadata.riskAssessment).toBeDefined();

      // Verify risk assessment
      expect(result.metadata.riskAssessment.level).toBeDefined();
      expect(result.metadata.riskAssessment.score).toBeGreaterThanOrEqual(0);
      expect(result.metadata.riskAssessment.score).toBeLessThanOrEqual(100);
      expect(result.metadata.riskAssessment.factors).toBeDefined();
      expect(result.metadata.riskAssessment.mitigations).toBeDefined();

      // Verify execution context if approved
      if (result.approved && result.executionContext) {
        expect(result.executionContext.constraints).toBeDefined();
        expect(result.executionContext.resourceLimits).toBeDefined();
        expect(result.executionContext.securityRestrictions).toBeDefined();
        expect(result.executionContext.monitoring).toBeDefined();
      }
    }, 30000);

    it('should maintain performance under concurrent load', async () => {
      const concurrentRequests = 10;
      const promises: Promise<any>[] = [];

      for (let i = 0; i < concurrentRequests; i++) {
        const request: ParlantOrchestrationRequest = {
          operationId: `concurrent-test-${i}`,
          functionName: 'concurrentOperation',
          packageName: 'load-test-service',
          description: `Concurrent validation test ${i}`,
          parameters: { requestId: i, timestamp: Date.now() },
          userContext: mockUserContext,
          securityClassification: SecurityLevel._MEDIUM,
          qualityLevel: ValidationQualityLevel.STANDARD,
          enablePerformanceOptimization: true,
          timeout: 10000
        };

        const context: OrchestrationExecutionContext = {
          traceId: `concurrent-trace-${i}`,
          spanId: `concurrent-span-${i}`,
          priority: 'normal',
          deadline: new Date(Date.now() + 15000),
          resourceConstraints: {
            maxMemoryMb: 256,
            maxCpuPercent: 70,
            maxExecutionTimeMs: 12000
          },
          complianceRequirements: [],
          auditLevel: 'standard'
        };

        promises.push(parlantService.orchestrateWithParlant(request, context));
      }

      const startTime = Date.now();
      const results = await Promise.allSettled(promises);
      const totalDuration = Date.now() - startTime;

      // Verify all requests completed
      expect(results.length).toBe(concurrentRequests);

      // Count successful requests
      const successfulRequests = results.filter(
        result => result.status === 'fulfilled' && result.value?.approved !== undefined
      ).length;

      // Should have high success rate under load
      expect(successfulRequests).toBeGreaterThan(concurrentRequests * 0.8);

      // Should complete within reasonable time
      expect(totalDuration).toBeLessThan(20000);

      // Verify individual request performance
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          expect(result.value).toBeDefined();
          expect(result.value.metadata.processingTime).toBeLessThan(12000);
        } else {
          console.warn(`Request ${index} failed:`, result.reason);
        }
      });
    }, 25000);
  });
});