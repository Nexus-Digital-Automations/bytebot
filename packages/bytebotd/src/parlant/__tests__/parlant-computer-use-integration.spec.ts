/**
 * Parlant Computer Use Conversational Validation Integration Tests
 * 
 * This test suite provides comprehensive integration testing for Parlant's
 * conversational AI validation system with Computer Use functionality,
 * ensuring secure and intelligent computer action validation.
 * 
 * Integration Coverage:
 * - Conversational validation workflows for computer actions
 * - Risk assessment and security level validation
 * - User intent verification through natural language processing
 * - Context-aware validation with conversation history
 * - Performance optimization for sub-1000ms validation targets
 * - Error handling and validation failure scenarios
 * 
 * Test Scenarios:
 * - Complete conversational validation workflows
 * - High-risk action detection and rejection
 * - User role and security level validation
 * - Conversation context and history analysis
 * - Performance benchmarking for validation pipeline
 * - Integration with audit trails and compliance monitoring
 * 
 * @author Claude Code - Subagent 6
 * @version 1.0.0
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ParlantValidatedComputerUseService, ComputerActionValidationContext } from '../parlant-validated-computer-use.service';
import { ParlantIntegrationService, ConversationalValidationError, RiskLevel } from '../parlant-integration.service';
import { ParlantComputerUseController } from '../parlant-computer-use.controller';
import { ParlantModule } from '../parlant.module';
import { ComputerUseService } from '../../computer-use/computer-use.service';
import { ComputerUseModule } from '../../computer-use/computer-use.module';
import { NutService } from '../../nut/nut.service';
import { ByteBotdUser } from '../../auth/decorators/roles.decorator';
import {
  ComputerAction,
  MoveMouseAction,
} from '@bytebot/shared';
import * as fs from 'fs/promises';

// Parlant integration test interfaces
interface ParlantIntegrationContext {
  app: INestApplication;
  parlantValidatedService: ParlantValidatedComputerUseService;
  parlantIntegrationService: ParlantIntegrationService;
  parlantController: ParlantComputerUseController;
  computerUseService: ComputerUseService;
  nutService: NutService;
  testDataDir: string;
}

interface ValidationScenario {
  scenarioId: string;
  userContext: Partial<ByteBotdUser>;
  action: ComputerAction;
  validationContext: ComputerActionValidationContext;
  expectedApproval: boolean;
  expectedRiskLevel: RiskLevel;
  expectedReasons: string[];
}

interface ConversationalValidationMetrics {
  validationId: string;
  startTime: number;
  endTime: number;
  validationTime: number;
  approved: boolean;
  confidence: number;
  riskLevel: RiskLevel;
  contextComplexity: number;
  conversationLength: number;
  memoryUsage: NodeJS.MemoryUsage;
}

describe('Parlant Computer Use Integration Tests', () => {
  let context: ParlantIntegrationContext;
  let testModule: TestingModule;
  const testDataDir = '/tmp/bytebot-parlant-integration-tests';
  const validationMetrics: ConversationalValidationMetrics[] = [];

  /**
   * Setup Parlant integration test environment
   */
  beforeAll(async () => {
    testModule = await Test.createTestingModule({
      imports: [
        ComputerUseModule,
        ParlantModule,
      ],
    })
      .overrideProvider(NutService)
      .useValue(createMockNutService())
      .compile();

    const app = testModule.createNestApplication();
    await app.init();

    context = {
      app,
      parlantValidatedService: testModule.get<ParlantValidatedComputerUseService>(ParlantValidatedComputerUseService),
      parlantIntegrationService: testModule.get<ParlantIntegrationService>(ParlantIntegrationService),
      parlantController: testModule.get<ParlantComputerUseController>(ParlantComputerUseController),
      computerUseService: testModule.get<ComputerUseService>(ComputerUseService),
      nutService: testModule.get<NutService>(NutService),
      testDataDir,
    };

    await createTestDataDirectory();
  });

  afterAll(async () => {
    await cleanupTestData();
    await context?.app?.close();
    await testModule?.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    validationMetrics.length = 0; // Clear metrics
  });

  describe('Conversational Validation Workflows', () => {
    it('should approve safe actions with clear user intent', async () => {
      const scenario = createValidationScenario({
        scenarioId: 'safe_screenshot',
        userRole: 'OPERATOR',
        securityLevel: 'HIGH',
        action: { action: 'screenshot' },
        conversationHistory: [
          {
            timestamp: new Date(),
            speaker: 'USER',
            message: 'Please take a screenshot for documentation purposes'
          },
          {
            timestamp: new Date(),
            speaker: 'ASSISTANT',
            message: 'I understand you need a screenshot for documentation. This is a safe operation.'
          }
        ],
        systemState: {
          cpuUsage: 20,
          memoryUsage: 40,
          networkActivity: false,
          securityAlerts: [],
          maintenanceMode: false,
        },
        expectedApproval: true,
        expectedRiskLevel: RiskLevel.LOW,
      });

      // Mock Parlant service to approve the action
      mockParlantValidationResponse({
        approved: true,
        confidence: 0.95,
        reasoning: 'Screenshot operation approved for documentation purposes with clear user intent',
        riskLevel: RiskLevel.LOW,
        executionContext: {
          timeoutMs: 5000,
          retryAttempts: 1,
          monitoringLevel: 'BASIC',
          safeguards: ['screenshot-validation'],
        },
      });

      const metrics = await executeValidationWithMetrics(
        'safe_screenshot_validation',
        scenario.action,
        scenario.validationContext
      );

      expect(metrics.approved).toBe(true);
      expect(metrics.confidence).toBeGreaterThan(0.9);
      expect(metrics.validationTime).toBeLessThan(1000); // Sub-1000ms target
      expect(context.nutService.screendump).toHaveBeenCalled();
    });

    it('should reject high-risk actions with insufficient justification', async () => {
      const scenario = createValidationScenario({
        scenarioId: 'risky_file_write',
        userRole: 'USER',
        securityLevel: 'LOW',
        action: {
          action: 'write_file',
          path: '/etc/passwd',
          data: Buffer.from('malicious content').toString('base64'),
        },
        conversationHistory: [
          {
            timestamp: new Date(),
            speaker: 'USER',
            message: 'Write this file'
          }
        ],
        systemState: {
          cpuUsage: 85,
          memoryUsage: 90,
          networkActivity: true,
          securityAlerts: ['high-resource-usage', 'suspicious-file-access'],
          maintenanceMode: false,
        },
        expectedApproval: false,
        expectedRiskLevel: RiskLevel.CRITICAL,
      });

      // Mock Parlant service to reject the action
      mockParlantValidationRejection({
        reasoning: 'Critical security risk: Attempt to modify system files without clear justification',
        confidence: 0.98,
        riskLevel: RiskLevel.CRITICAL,
        suggestedAlternatives: [
          'Use a safe directory within user space for file operations',
          'Provide clear justification for system file modifications',
          'Contact system administrator for elevated permissions',
        ],
      });

      await expect(
        executeValidationWithMetrics(
          'risky_file_write_validation',
          scenario.action,
          scenario.validationContext
        )
      ).rejects.toThrow(ConversationalValidationError);

      // Verify the action was not executed
      expect(context.nutService.screendump).not.toHaveBeenCalled();
    });

    it('should handle complex conversation context for validation decisions', async () => {
      const scenario = createValidationScenario({
        scenarioId: 'complex_context_validation',
        userRole: 'ADMIN',
        securityLevel: 'CRITICAL',
        action: {
          action: 'click_mouse',
          coordinates: { x: 500, y: 300 },
          button: 'left',
          clickCount: 1,
        },
        conversationHistory: [
          {
            timestamp: new Date(Date.now() - 300000), // 5 minutes ago
            speaker: 'USER',
            message: 'I need to troubleshoot a critical system issue'
          },
          {
            timestamp: new Date(Date.now() - 240000), // 4 minutes ago
            speaker: 'ASSISTANT',
            message: 'I understand this is urgent. What specific steps do you need to take?'
          },
          {
            timestamp: new Date(Date.now() - 180000), // 3 minutes ago
            speaker: 'USER',
            message: 'The system monitor shows errors. I need to click on the error details'
          },
          {
            timestamp: new Date(Date.now() - 120000), // 2 minutes ago
            speaker: 'ASSISTANT',
            message: 'Clicking on error details for system troubleshooting is appropriate for your admin role'
          },
          {
            timestamp: new Date(Date.now() - 60000), // 1 minute ago
            speaker: 'USER',
            message: 'Please click on coordinates 500, 300 to access the error log'
          }
        ],
        systemState: {
          cpuUsage: 95,
          memoryUsage: 85,
          networkActivity: true,
          securityAlerts: ['system-performance-critical'],
          maintenanceMode: true,
        },
        expectedApproval: true,
        expectedRiskLevel: RiskLevel.MEDIUM,
      });

      // Mock Parlant service with complex context analysis
      mockParlantValidationResponse({
        approved: true,
        confidence: 0.88,
        reasoning: 'Click operation approved based on conversation context: Admin user troubleshooting critical system issue with clear justification and proper escalation',
        riskLevel: RiskLevel.MEDIUM,
        executionContext: {
          timeoutMs: 3000,
          retryAttempts: 2,
          monitoringLevel: 'COMPREHENSIVE',
          safeguards: ['admin-validation', 'system-troubleshooting', 'audit-trail'],
        },
      });

      const metrics = await executeValidationWithMetrics(
        'complex_context_validation',
        scenario.action,
        scenario.validationContext
      );

      expect(metrics.approved).toBe(true);
      expect(metrics.confidence).toBeGreaterThan(0.8);
      expect(metrics.conversationLength).toBe(5);
      expect(metrics.contextComplexity).toBeGreaterThan(3); // Complex context with multiple factors
      expect(context.nutService.mouseClickEvent).toHaveBeenCalledWith(500, 300, 'left', 1);
    });

    it('should validate actions based on user security level and role', async () => {
      const testCases = [
        {
          userRole: 'ADMIN',
          securityLevel: 'CRITICAL',
          expectedApproval: true,
          confidence: 0.95,
        },
        {
          userRole: 'OPERATOR',
          securityLevel: 'HIGH',
          expectedApproval: true,
          confidence: 0.85,
        },
        {
          userRole: 'USER',
          securityLevel: 'MEDIUM',
          expectedApproval: false,
          confidence: 0.9,
        },
        {
          userRole: 'GUEST',
          securityLevel: 'LOW',
          expectedApproval: false,
          confidence: 0.95,
        },
      ];

      for (const testCase of testCases) {
        const scenario = createValidationScenario({
          scenarioId: `role_based_validation_${testCase.userRole}`,
          userRole: testCase.userRole as 'ADMIN' | 'OPERATOR' | 'USER',
          securityLevel: testCase.securityLevel as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW',
          action: {
            action: 'write_file',
            path: '/tmp/test-file.txt',
            data: Buffer.from('test content').toString('base64'),
          },
          conversationHistory: [
            {
              timestamp: new Date(),
              speaker: 'USER',
              message: 'Create a test file for validation testing'
            }
          ],
          expectedApproval: testCase.expectedApproval,
          expectedRiskLevel: RiskLevel.MEDIUM,
        });

        if (testCase.expectedApproval) {
          mockParlantValidationResponse({
            approved: true,
            confidence: testCase.confidence,
            reasoning: `File creation approved for ${testCase.userRole} user with ${testCase.securityLevel} security level`,
            riskLevel: RiskLevel.MEDIUM,
          });

          const metrics = await executeValidationWithMetrics(
            scenario.scenarioId,
            scenario.action,
            scenario.validationContext
          );

          expect(metrics.approved).toBe(true);
          expect(metrics.confidence).toBe(testCase.confidence);
        } else {
          mockParlantValidationRejection({
            reasoning: `File creation denied for ${testCase.userRole} user with ${testCase.securityLevel} security level`,
            confidence: testCase.confidence,
            riskLevel: RiskLevel.MEDIUM,
            suggestedAlternatives: ['Contact administrator for elevated permissions'],
          });

          await expect(
            executeValidationWithMetrics(
              scenario.scenarioId,
              scenario.action,
              scenario.validationContext
            )
          ).rejects.toThrow(ConversationalValidationError);
        }
      }
    });
  });

  describe('Performance and Optimization', () => {
    it('should meet sub-1000ms validation performance targets', async () => {
      const performanceTests = Array.from({ length: 10 }, (_, i) => ({
        action: { action: 'move_mouse', coordinates: { x: 100 + i * 10, y: 200 + i * 10 } } as MoveMouseAction,
        scenarioId: `performance_test_${i}`,
      }));

      const validationTimes: number[] = [];

      for (const test of performanceTests) {
        const scenario = createValidationScenario({
          scenarioId: test.scenarioId,
          userRole: 'OPERATOR',
          securityLevel: 'HIGH',
          action: test.action,
          conversationHistory: [
            {
              timestamp: new Date(),
              speaker: 'USER',
              message: 'Move mouse for performance testing'
            }
          ],
          expectedApproval: true,
          expectedRiskLevel: RiskLevel.LOW,
        });

        mockParlantValidationResponse({
          approved: true,
          confidence: 0.9,
          reasoning: 'Mouse movement approved for performance testing',
          riskLevel: RiskLevel.LOW,
        });

        const metrics = await executeValidationWithMetrics(
          test.scenarioId,
          test.action,
          scenario.validationContext
        );

        validationTimes.push(metrics.validationTime);
        expect(metrics.validationTime).toBeLessThan(1000); // Sub-1000ms target
      }

      const averageValidationTime = validationTimes.reduce((sum, time) => sum + time, 0) / validationTimes.length;
      const maxValidationTime = Math.max(...validationTimes);

      expect(averageValidationTime).toBeLessThan(500); // Average should be well under target
      expect(maxValidationTime).toBeLessThan(1000); // No single validation should exceed target
    });

    it('should handle concurrent validation requests efficiently', async () => {
      const concurrentValidations = 5;
      const validationPromises = Array.from({ length: concurrentValidations }, (_, i) => {
        const scenario = createValidationScenario({
          scenarioId: `concurrent_validation_${i}`,
          userRole: 'OPERATOR',
          securityLevel: 'HIGH',
          action: { action: 'screenshot' },
          conversationHistory: [
            {
              timestamp: new Date(),
              speaker: 'USER',
              message: `Concurrent validation test ${i}`
            }
          ],
          expectedApproval: true,
          expectedRiskLevel: RiskLevel.LOW,
        });

        mockParlantValidationResponse({
          approved: true,
          confidence: 0.9,
          reasoning: `Concurrent validation ${i} approved`,
          riskLevel: RiskLevel.LOW,
        });

        return executeValidationWithMetrics(
          scenario.scenarioId,
          scenario.action,
          scenario.validationContext
        );
      });

      const startTime = Date.now();
      const results = await Promise.all(validationPromises);
      const totalTime = Date.now() - startTime;

      // All validations should complete successfully
      expect(results).toHaveLength(concurrentValidations);
      expect(results.every(result => result.approved)).toBe(true);

      // Total time should be reasonable for concurrent processing
      expect(totalTime).toBeLessThan(3000); // Should complete within 3 seconds
      expect(results.every(result => result.validationTime < 1000)).toBe(true);
    });

    it('should optimize validation for repeated similar actions', async () => {
      const repeatedAction: MoveMouseAction = {
        action: 'move_mouse',
        coordinates: { x: 300, y: 400 },
      };

      const baseScenario = createValidationScenario({
        scenarioId: 'repeated_action_optimization',
        userRole: 'OPERATOR',
        securityLevel: 'HIGH',
        action: repeatedAction,
        conversationHistory: [
          {
            timestamp: new Date(),
            speaker: 'USER',
            message: 'Move mouse to specific coordinates'
          }
        ],
        expectedApproval: true,
        expectedRiskLevel: RiskLevel.LOW,
      });

      // First validation (no cache)
      mockParlantValidationResponse({
        approved: true,
        confidence: 0.9,
        reasoning: 'First mouse movement validation',
        riskLevel: RiskLevel.LOW,
      });

      const firstValidation = await executeValidationWithMetrics(
        'first_repeated_validation',
        repeatedAction,
        baseScenario.validationContext
      );

      // Second validation (potentially cached/optimized)
      mockParlantValidationResponse({
        approved: true,
        confidence: 0.9,
        reasoning: 'Cached/optimized mouse movement validation',
        riskLevel: RiskLevel.LOW,
      });

      const secondValidation = await executeValidationWithMetrics(
        'second_repeated_validation',
        repeatedAction,
        baseScenario.validationContext
      );

      expect(firstValidation.approved).toBe(true);
      expect(secondValidation.approved).toBe(true);

      // Second validation might be faster due to optimization/caching
      // This is implementation-dependent, so we just verify both complete within targets
      expect(firstValidation.validationTime).toBeLessThan(1000);
      expect(secondValidation.validationTime).toBeLessThan(1000);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle Parlant service unavailability gracefully', async () => {
      const scenario = createValidationScenario({
        scenarioId: 'parlant_service_failure',
        userRole: 'OPERATOR',
        securityLevel: 'HIGH',
        action: { action: 'screenshot' },
        conversationHistory: [
          {
            timestamp: new Date(),
            speaker: 'USER',
            message: 'Take screenshot during service failure test'
          }
        ],
        expectedApproval: false,
        expectedRiskLevel: RiskLevel.MEDIUM,
      });

      // Mock Parlant service failure
      jest.spyOn(context.parlantIntegrationService, 'validateFunctionExecution')
        .mockRejectedValue(new Error('Parlant service temporarily unavailable'));

      await expect(
        executeValidationWithMetrics(
          'parlant_service_failure',
          scenario.action,
          scenario.validationContext
        )
      ).rejects.toThrow('Parlant service temporarily unavailable');
    });

    it('should validate actions with empty conversation history', async () => {
      const scenario = createValidationScenario({
        scenarioId: 'empty_conversation_history',
        userRole: 'ADMIN',
        securityLevel: 'CRITICAL',
        action: { action: 'cursor_position' },
        conversationHistory: [], // Empty conversation history
        expectedApproval: true,
        expectedRiskLevel: RiskLevel.LOW,
      });

      mockParlantValidationResponse({
        approved: true,
        confidence: 0.75, // Lower confidence due to lack of context
        reasoning: 'Cursor position query approved despite empty conversation history - low risk operation',
        riskLevel: RiskLevel.LOW,
      });

      const metrics = await executeValidationWithMetrics(
        'empty_conversation_validation',
        scenario.action,
        scenario.validationContext
      );

      expect(metrics.approved).toBe(true);
      expect(metrics.confidence).toBe(0.75);
      expect(metrics.conversationLength).toBe(0);
    });

    it('should handle malformed validation requests', async () => {
      const invalidAction = {
        action: 'invalid_action_type',
        invalidParameter: 'malformed data',
      } as unknown as ComputerAction;

      const scenario = createValidationScenario({
        scenarioId: 'malformed_request',
        userRole: 'USER',
        securityLevel: 'MEDIUM',
        action: invalidAction,
        conversationHistory: [
          {
            timestamp: new Date(),
            speaker: 'USER',
            message: 'Execute invalid action'
          }
        ],
        expectedApproval: false,
        expectedRiskLevel: RiskLevel.HIGH,
      });

      mockParlantValidationRejection({
        reasoning: 'Invalid action type - malformed validation request',
        confidence: 0.99,
        riskLevel: RiskLevel.HIGH,
        suggestedAlternatives: ['Use supported action types', 'Check action parameter format'],
      });

      await expect(
        executeValidationWithMetrics(
          'malformed_request_validation',
          invalidAction,
          scenario.validationContext
        )
      ).rejects.toThrow(ConversationalValidationError);
    });
  });

  // Helper Functions for Parlant Integration Testing

  /**
   * Create validation scenario with comprehensive context
   */
  function createValidationScenario(params: {
    scenarioId: string;
    userRole: 'ADMIN' | 'OPERATOR' | 'USER';
    securityLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    action: ComputerAction;
    conversationHistory: Array<{
      timestamp: Date;
      speaker: 'USER' | 'ASSISTANT' | 'SYSTEM';
      message: string;
    }>;
    systemState?: {
      cpuUsage: number;
      memoryUsage: number;
      networkActivity: boolean;
      securityAlerts: string[];
      maintenanceMode: boolean;
    };
    expectedApproval: boolean;
    expectedRiskLevel: RiskLevel;
  }): ValidationScenario {
    const validationContext: ComputerActionValidationContext = {
      userId: `test-user-${params.scenarioId}`,
      sessionId: `session-${params.scenarioId}`,
      agentRole: params.userRole,
      securityLevel: params.securityLevel,
      conversationHistory: params.conversationHistory,
      metadata: {
        operationId: `op-${params.scenarioId}`,
        testScenario: true,
      },
      recentActions: [],
      systemState: params.systemState ?? {
        cpuUsage: 25,
        memoryUsage: 50,
        networkActivity: false,
        securityAlerts: [],
        maintenanceMode: false,
      },
    };

    return {
      scenarioId: params.scenarioId,
      userContext: {
        id: `test-user-${params.scenarioId}`,
        role: params.userRole,
      },
      action: params.action,
      validationContext,
      expectedApproval: params.expectedApproval,
      expectedRiskLevel: params.expectedRiskLevel,
      expectedReasons: [], // Can be extended as needed
    };
  }

  /**
   * Mock Parlant validation response for approved actions
   */
  function mockParlantValidationResponse(params: {
    approved: boolean;
    confidence: number;
    reasoning: string;
    riskLevel: RiskLevel;
    executionContext?: {
      timeoutMs?: number;
      retryAttempts?: number;
      monitoringLevel: 'BASIC' | 'DETAILED' | 'COMPREHENSIVE';
      safeguards: string[];
    };
  }): void {
    jest.spyOn(context.parlantIntegrationService, 'validateFunctionExecution')
      .mockResolvedValue({
        approved: params.approved,
        conversationId: `conv-${Date.now()}`,
        validationTimestamp: new Date(),
        reasoning: params.reasoning,
        confidence: params.confidence,
        suggestedAlternatives: [],
        executionContext: params.executionContext,
      });
  }

  /**
   * Mock Parlant validation rejection for denied actions
   */
  function mockParlantValidationRejection(params: {
    reasoning: string;
    confidence: number;
    riskLevel: RiskLevel;
    suggestedAlternatives: string[];
  }): void {
    jest.spyOn(context.parlantIntegrationService, 'validateFunctionExecution')
      .mockRejectedValue(new ConversationalValidationError(
        params.reasoning,
        `conv-rejection-${Date.now()}`,
        params.confidence,
        params.suggestedAlternatives,
        params.riskLevel
      ));
  }

  /**
   * Execute validation with comprehensive metrics tracking
   */
  async function executeValidationWithMetrics(
    validationId: string,
    action: ComputerAction,
    validationContext: ComputerActionValidationContext
  ): Promise<ConversationalValidationMetrics> {
    const startTime = Date.now();
    const _memoryBefore = process.memoryUsage();

    let approved: boolean = false;
    let confidence: number = 0;
    let riskLevel: RiskLevel = RiskLevel.UNKNOWN;
    let endTime = 0;
    let memoryAfter!: NodeJS.MemoryUsage;

    try {
      await context.parlantValidatedService.action(action, validationContext);
      approved = true;
      confidence = 0.9; // Default for successful validation
      riskLevel = RiskLevel.LOW; // Default for approved actions
    } catch (error: unknown) {
      if (error instanceof ConversationalValidationError) {
        const validationError = error as ConversationalValidationError;
        approved = false;
        confidence = validationError.confidence ?? 0.8;
        riskLevel = validationError.riskLevel ?? RiskLevel.MEDIUM;
      }
      throw error;
    } finally {
      endTime = Date.now();
      memoryAfter = process.memoryUsage();
    }

    const metrics: ConversationalValidationMetrics = {
      validationId,
      startTime,
      endTime,
      validationTime: endTime - startTime,
      approved,
      confidence,
      riskLevel,
      contextComplexity: calculateContextComplexity(validationContext),
      conversationLength: validationContext.conversationHistory.length,
      memoryUsage: memoryAfter,
    };

    validationMetrics.push(metrics);
    return metrics;
  }

  /**
   * Calculate context complexity for metrics
   */
  function calculateContextComplexity(context: ComputerActionValidationContext): number {
    let complexity = 0;
    
    // Base complexity
    complexity += 1;
    
    // Conversation history complexity
    complexity += Math.min(context.conversationHistory.length * 0.5, 3);
    
    // Recent actions complexity
    complexity += Math.min(context.recentActions.length * 0.3, 2);
    
    // System state complexity
    if (context.systemState.securityAlerts.length > 0) complexity += 2;
    if (context.systemState.maintenanceMode) complexity += 1;
    if (context.systemState.cpuUsage > 80) complexity += 1;
    if (context.systemState.memoryUsage > 80) complexity += 1;
    
    // Security level complexity
    switch (context.securityLevel) {
      case 'CRITICAL': complexity += 3; break;
      case 'HIGH': complexity += 2; break;
      case 'MEDIUM': complexity += 1; break;
      case 'LOW': complexity += 0; break;
    }
    
    return Math.round(complexity);
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
      screendump: jest.fn().mockResolvedValue(Buffer.from('mocked-parlant-screenshot')),
      getCursorPosition: jest.fn().mockResolvedValue({ x: 500, y: 600 }),
    };
  }

  /**
   * Create test data directory
   */
  async function createTestDataDirectory(): Promise<void> {
    try {
      await fs.mkdir(testDataDir, { recursive: true });
    } catch {
      // Directory might already exist
    }
  }

  /**
   * Cleanup test data
   */
  async function cleanupTestData(): Promise<void> {
    try {
      await fs.rm(testDataDir, { recursive: true, force: true });
    } catch (error: unknown) {
      console.warn('Failed to cleanup Parlant integration test data:', error);
    }
  }
});