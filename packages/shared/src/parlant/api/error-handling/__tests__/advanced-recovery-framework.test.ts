/**
 * PARLANT Phase 1 - Advanced Recovery Framework Tests
 *
 * Comprehensive test suite for the advanced error recovery framework,
 * covering multi-stage recovery workflows and automated strategies.
 *
 * @version 1.0.0
 * @author PARLANT Phase 1 Implementation Team
 */

import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  BadRequestException,
  UnauthorizedException,
  InternalServerErrorException
} from '@nestjs/common';

import {
  AdvancedRecoveryFramework,
  RecoveryWorkflowEngine,
  AutomatedRecoveryStrategies,
  RecoverySession,
  RecoveryAttemptResult,
  RecoveryStage
} from '../advanced-recovery-framework';

import {
  ConversationalErrorContext,
  ConversationalErrorCategory
} from '../conversational-error-handler';

describe('AdvancedRecoveryFramework', () => {
  let framework: AdvancedRecoveryFramework;
  let workflowEngine: RecoveryWorkflowEngine;
  let automatedStrategies: AutomatedRecoveryStrategies;
  let eventEmitter: EventEmitter2;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        AdvancedRecoveryFramework,
        RecoveryWorkflowEngine,
        AutomatedRecoveryStrategies,
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn()
          }
        }
      ]
    }).compile();

    framework = module.get<AdvancedRecoveryFramework>(AdvancedRecoveryFramework);
    workflowEngine = module.get<RecoveryWorkflowEngine>(RecoveryWorkflowEngine);
    automatedStrategies = module.get<AutomatedRecoveryStrategies>(AutomatedRecoveryStrategies);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('Recovery Initiation', () => {
    const createTestContext = (): ConversationalErrorContext => ({
      userId: 'test-user',
      sessionId: 'test-session',
      timestamp: new Date(),
      requestId: 'test-request'
    });

    it('should initiate recovery for BadRequestException', async () => {
      // Arrange
      const error = new BadRequestException('Invalid input');
      const context = createTestContext();

      // Act
      const result = await framework.initiateRecovery(error, context);

      // Assert
      expect(result.session).toBeDefined();
      expect(result.session.sessionId).toMatch(/^RECOVERY_SESSION_/);
      expect(result.session.originalError).toBe(error);
      expect(result.session.context).toBe(context);
      expect(result.session.status).toBe('ACTIVE');
      expect(result.session.workflow.workflowId).toBe('user_input_recovery');
      expect(result.initialResult).toBeDefined();
    });

    it('should initiate recovery for UnauthorizedException', async () => {
      // Arrange
      const error = new UnauthorizedException('Authentication required');
      const context = createTestContext();

      // Act
      const result = await framework.initiateRecovery(error, context);

      // Assert
      expect(result.session.workflow.workflowId).toBe('authentication_recovery');
    });

    it('should initiate recovery for InternalServerErrorException', async () => {
      // Arrange
      const error = new InternalServerErrorException('System error');
      const context = createTestContext();

      // Act
      const result = await framework.initiateRecovery(error, context);

      // Assert
      expect(result.session.workflow.workflowId).toBe('system_error_recovery');
    });

    it('should emit recovery session started event', async () => {
      // Arrange
      const error = new BadRequestException('Invalid input');
      const context = createTestContext();

      // Act
      await framework.initiateRecovery(error, context);

      // Assert
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'recovery.session.started',
        expect.objectContaining({
          sessionId: expect.any(String),
          errorType: 'BadRequestException',
          workflowId: 'user_input_recovery'
        })
      );
    });
  });

  describe('Recovery Continuation', () => {
    it('should continue recovery and advance stages', async () => {
      // Arrange
      const error = new BadRequestException('Invalid input');
      const context = createTestContext();
      const { session } = await framework.initiateRecovery(error, context);

      // Act
      const result = await framework.continueRecovery(session.sessionId);

      // Assert
      expect(result).toBeDefined();
      expect(result?.strategy).toBeDefined();
      expect(result?.stage).toBeDefined();
      expect(result?.duration).toBeGreaterThan(0);
    });

    it('should return null for invalid session ID', async () => {
      // Act
      const result = await framework.continueRecovery('invalid-session-id');

      // Assert
      expect(result).toBeNull();
    });

    it('should handle session completion', async () => {
      // Arrange
      const error = new BadRequestException('Invalid input');
      const context = createTestContext();
      const { session } = await framework.initiateRecovery(error, context);

      // Mock successful recovery
      jest.spyOn(workflowEngine, 'executeNextStage').mockResolvedValue({
        attemptId: 'test-attempt',
        success: true,
        strategy: 'auto_input_validation',
        stage: RecoveryStage.IMMEDIATE,
        duration: 1000,
        userActionsRequired: [],
        userActionsCompleted: ['Input validated'],
        confidence: 0.9,
        metadata: {}
      });

      // Act
      const result = await framework.continueRecovery(session.sessionId);

      // Assert
      expect(result?.success).toBe(true);
    });
  });

  describe('Recovery Status', () => {
    it('should return recovery status for valid session', async () => {
      // Arrange
      const error = new BadRequestException('Invalid input');
      const context = createTestContext();
      const { session } = await framework.initiateRecovery(error, context);

      // Act
      const status = framework.getRecoveryStatus(session.sessionId);

      // Assert
      expect(status).toBeDefined();
      expect(status?.sessionId).toBe(session.sessionId);
      expect(status?.status).toBe('ACTIVE');
    });

    it('should return null for invalid session ID', () => {
      // Act
      const status = framework.getRecoveryStatus('invalid-session-id');

      // Assert
      expect(status).toBeNull();
    });
  });

  describe('Recovery Completion', () => {
    it('should complete recovery with user satisfaction', async () => {
      // Arrange
      const error = new BadRequestException('Invalid input');
      const context = createTestContext();
      const { session } = await framework.initiateRecovery(error, context);

      // Act
      framework.completeRecovery(session.sessionId, 4.5);

      // Assert - session should be removed from active sessions
      const activeSessions = framework.getActiveRecoverySessions();
      expect(activeSessions.find(s => s.sessionId === session.sessionId)).toBeUndefined();
    });

    it('should complete recovery without user satisfaction', async () => {
      // Arrange
      const error = new BadRequestException('Invalid input');
      const context = createTestContext();
      const { session } = await framework.initiateRecovery(error, context);

      // Act & Assert - should not throw
      expect(() => framework.completeRecovery(session.sessionId)).not.toThrow();
    });
  });

  describe('Active Sessions Management', () => {
    it('should track active recovery sessions', async () => {
      // Arrange
      const error1 = new BadRequestException('Invalid input 1');
      const error2 = new UnauthorizedException('Auth required');
      const context = createTestContext();

      // Act
      const { session: session1 } = await framework.initiateRecovery(error1, context);
      const { session: session2 } = await framework.initiateRecovery(error2, context);

      const activeSessions = framework.getActiveRecoverySessions();

      // Assert
      expect(activeSessions).toHaveLength(2);
      expect(activeSessions.map(s => s.sessionId)).toContain(session1.sessionId);
      expect(activeSessions.map(s => s.sessionId)).toContain(session2.sessionId);
    });

    it('should remove completed sessions from active list', async () => {
      // Arrange
      const error = new BadRequestException('Invalid input');
      const context = createTestContext();
      const { session } = await framework.initiateRecovery(error, context);

      // Act
      framework.completeRecovery(session.sessionId);
      const activeSessions = framework.getActiveRecoverySessions();

      // Assert
      expect(activeSessions.find(s => s.sessionId === session.sessionId)).toBeUndefined();
    });
  });
});

describe('RecoveryWorkflowEngine', () => {
  let workflowEngine: RecoveryWorkflowEngine;
  let automatedStrategies: AutomatedRecoveryStrategies;
  let eventEmitter: EventEmitter2;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        RecoveryWorkflowEngine,
        AutomatedRecoveryStrategies,
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn()
          }
        }
      ]
    }).compile();

    workflowEngine = module.get<RecoveryWorkflowEngine>(RecoveryWorkflowEngine);
    automatedStrategies = module.get<AutomatedRecoveryStrategies>(AutomatedRecoveryStrategies);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('Session Management', () => {
    const createTestContext = (): ConversationalErrorContext => ({
      timestamp: new Date(),
      requestId: 'test-request'
    });

    it('should start recovery session with appropriate workflow', async () => {
      // Arrange
      const error = new BadRequestException('Invalid input');
      const context = createTestContext();

      // Act
      const session = await workflowEngine.startRecoverySession(error, context);

      // Assert
      expect(session.sessionId).toMatch(/^RECOVERY_SESSION_/);
      expect(session.originalError).toBe(error);
      expect(session.context).toBe(context);
      expect(session.workflow.workflowId).toBe('user_input_recovery');
      expect(session.currentStage).toBe(0);
      expect(session.attempts).toHaveLength(0);
      expect(session.status).toBe('ACTIVE');
      expect(session.startTime).toBeInstanceOf(Date);
    });

    it('should emit session started event', async () => {
      // Arrange
      const error = new BadRequestException('Invalid input');
      const context = createTestContext();

      // Act
      await workflowEngine.startRecoverySession(error, context);

      // Assert
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'recovery.session.started',
        expect.objectContaining({
          sessionId: expect.any(String),
          errorType: 'BadRequestException',
          workflowId: 'user_input_recovery'
        })
      );
    });
  });

  describe('Stage Execution', () => {
    it('should execute next stage successfully', async () => {
      // Arrange
      const error = new BadRequestException('Invalid input');
      const context = createTestContext();
      const session = await workflowEngine.startRecoverySession(error, context);

      // Act
      const result = await workflowEngine.executeNextStage(session.sessionId);

      // Assert
      expect(result).toBeDefined();
      expect(result?.attemptId).toMatch(/^RECOVERY_/);
      expect(result?.strategy).toBe('auto_input_validation');
      expect(result?.stage).toBe(RecoveryStage.IMMEDIATE);
      expect(result?.duration).toBeGreaterThan(0);
    });

    it('should advance to next stage when current strategies fail', async () => {
      // Arrange
      const error = new InternalServerErrorException('System error');
      const context = createTestContext();
      const session = await workflowEngine.startRecoverySession(error, context);

      // Mock all strategies in first stage to fail
      jest.spyOn(automatedStrategies, 'retryWithBackoff').mockResolvedValue({
        attemptId: 'test-attempt',
        success: false,
        strategy: 'exponential_backoff_retry',
        stage: RecoveryStage.IMMEDIATE,
        duration: 1000,
        userActionsRequired: [],
        userActionsCompleted: [],
        confidence: 0.3,
        metadata: {}
      });

      // Act - execute first stage (should fail)
      const result1 = await workflowEngine.executeNextStage(session.sessionId);
      // Execute second stage
      const result2 = await workflowEngine.executeNextStage(session.sessionId);

      // Assert
      expect(result1?.success).toBe(false);
      expect(result2?.strategy).toContain('cache_invalidation');
    });

    it('should complete session when all stages exhausted', async () => {
      // Arrange
      const error = new BadRequestException('Invalid input');
      const context = createTestContext();
      const session = await workflowEngine.startRecoverySession(error, context);

      // Mock all strategies to fail
      jest.spyOn(automatedStrategies, 'validateAndCorrectInput').mockResolvedValue({
        attemptId: 'test-attempt',
        success: false,
        strategy: 'auto_input_validation',
        stage: RecoveryStage.IMMEDIATE,
        duration: 1000,
        userActionsRequired: [],
        userActionsCompleted: [],
        confidence: 0.1,
        metadata: {}
      });

      // Act - execute all stages
      let result = await workflowEngine.executeNextStage(session.sessionId);
      while (result !== null) {
        result = await workflowEngine.executeNextStage(session.sessionId);
      }

      // Assert
      const sessionStatus = workflowEngine.getSessionStatus(session.sessionId);
      expect(sessionStatus?.status).toBe('FAILED');
      expect(sessionStatus?.outcome?.success).toBe(false);
    });

    it('should return null for invalid session ID', async () => {
      // Act
      const result = await workflowEngine.executeNextStage('invalid-session-id');

      // Assert
      expect(result).toBeNull();
    });

    it('should return null for inactive session', async () => {
      // Arrange
      const error = new BadRequestException('Invalid input');
      const context = createTestContext();
      const session = await workflowEngine.startRecoverySession(error, context);

      // Manually set session as completed
      const sessionStatus = workflowEngine.getSessionStatus(session.sessionId);
      if (sessionStatus) {
        sessionStatus.status = 'COMPLETED';
      }

      // Act
      const result = await workflowEngine.executeNextStage(session.sessionId);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('Session Status Tracking', () => {
    it('should track session status correctly', async () => {
      // Arrange
      const error = new BadRequestException('Invalid input');
      const context = createTestContext();
      const session = await workflowEngine.startRecoverySession(error, context);

      // Act
      const status = workflowEngine.getSessionStatus(session.sessionId);

      // Assert
      expect(status).toBeDefined();
      expect(status?.sessionId).toBe(session.sessionId);
      expect(status?.status).toBe('ACTIVE');
    });

    it('should return null for non-existent session', () => {
      // Act
      const status = workflowEngine.getSessionStatus('non-existent-session');

      // Assert
      expect(status).toBeNull();
    });

    it('should track active sessions correctly', async () => {
      // Arrange
      const error1 = new BadRequestException('Invalid input 1');
      const error2 = new UnauthorizedException('Auth required');
      const context = createTestContext();

      // Act
      const session1 = await workflowEngine.startRecoverySession(error1, context);
      const session2 = await workflowEngine.startRecoverySession(error2, context);

      const activeSessions = workflowEngine.getActiveSessions();

      // Assert
      expect(activeSessions).toHaveLength(2);
      expect(activeSessions.map(s => s.sessionId)).toContain(session1.sessionId);
      expect(activeSessions.map(s => s.sessionId)).toContain(session2.sessionId);
    });
  });

  describe('Session Completion', () => {
    it('should complete session with user satisfaction', async () => {
      // Arrange
      const error = new BadRequestException('Invalid input');
      const context = createTestContext();
      const session = await workflowEngine.startRecoverySession(error, context);

      // Set up successful outcome
      const sessionStatus = workflowEngine.getSessionStatus(session.sessionId);
      if (sessionStatus) {
        sessionStatus.outcome = {
          success: true,
          resolution: 'Test resolution',
          totalDuration: 5000
        };
      }

      // Act
      workflowEngine.completeSession(session.sessionId, 4.5);

      // Assert
      const activeSessions = workflowEngine.getActiveSessions();
      expect(activeSessions.find(s => s.sessionId === session.sessionId)).toBeUndefined();

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'recovery.session.closed',
        expect.objectContaining({
          sessionId: session.sessionId,
          userSatisfaction: 4.5
        })
      );
    });
  });
});

describe('AutomatedRecoveryStrategies', () => {
  let strategies: AutomatedRecoveryStrategies;

  beforeEach(() => {
    strategies = new AutomatedRecoveryStrategies();
  });

  describe('Retry with Backoff', () => {
    const createTestContext = (): ConversationalErrorContext => ({
      timestamp: new Date(),
      requestId: 'test-request'
    });

    it('should succeed with retry within max attempts', async () => {
      // Arrange
      const error = new Error('Temporary error');
      const context = createTestContext();

      // Act
      const result = await strategies.retryWithBackoff(error, context, { maxRetries: 3, baseDelay: 100 });

      // Assert
      expect(result.attemptId).toMatch(/^RECOVERY_/);
      expect(result.strategy).toBe('RETRY_WITH_BACKOFF');
      expect(result.stage).toBe(RecoveryStage.IMMEDIATE);
      expect(result.duration).toBeGreaterThan(0);
      expect(result.metadata.attempts).toBeGreaterThan(0);
      expect(result.metadata.attempts).toBeLessThanOrEqual(3);
    });

    it('should fail after max retries exhausted', async () => {
      // Arrange
      const error = new Error('Persistent error');
      const context = createTestContext();

      // Mock Math.random to always fail
      const originalRandom = Math.random;
      Math.random = jest.fn().mockReturnValue(0.1); // Always fail (< 0.3)

      try {
        // Act
        const result = await strategies.retryWithBackoff(error, context, { maxRetries: 2, baseDelay: 10 });

        // Assert
        expect(result.success).toBe(false);
        expect(result.metadata.attempts).toBe(2);
        expect(result.metadata.allAttemptsFailed).toBe(true);
        expect(result.confidence).toBe(0.2);
      } finally {
        // Restore Math.random
        Math.random = originalRandom;
      }
    });

    it('should use default parameters when not provided', async () => {
      // Arrange
      const error = new Error('Test error');
      const context = createTestContext();

      // Act
      const result = await strategies.retryWithBackoff(error, context);

      // Assert
      expect(result).toBeDefined();
      expect(result.strategy).toBe('RETRY_WITH_BACKOFF');
    });
  });

  describe('Cache Invalidation', () => {
    it('should succeed with cache invalidation', async () => {
      // Arrange
      const error = new Error('Cache-related error');
      const context = createTestContext();

      // Act
      const result = await strategies.invalidateCache(error, context);

      // Assert
      expect(result.attemptId).toMatch(/^RECOVERY_/);
      expect(result.strategy).toBe('CACHE_INVALIDATION');
      expect(result.stage).toBe(RecoveryStage.IMMEDIATE);
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should handle cache invalidation failure', async () => {
      // Arrange
      const error = new Error('Cache error');
      const context = createTestContext();

      // Mock Math.random to always fail
      const originalRandom = Math.random;
      Math.random = jest.fn().mockReturnValue(0.1); // Always fail (< 0.2)

      try {
        // Act
        const result = await strategies.invalidateCache(error, context);

        // Assert
        expect(result.success).toBe(false);
        expect(result.confidence).toBe(0.3);
        expect(result.userActionsRequired).toContain('Clear browser cache manually');
      } finally {
        // Restore Math.random
        Math.random = originalRandom;
      }
    });
  });

  describe('Connection Reset', () => {
    it('should succeed with connection reset', async () => {
      // Arrange
      const error = new Error('Connection error');
      const context = createTestContext();

      // Act
      const result = await strategies.resetConnection(error, context);

      // Assert
      expect(result.attemptId).toMatch(/^RECOVERY_/);
      expect(result.strategy).toBe('CONNECTION_RESET');
      expect(result.stage).toBe(RecoveryStage.IMMEDIATE);
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should handle connection reset failure', async () => {
      // Arrange
      const error = new Error('Network error');
      const context = createTestContext();

      // Mock Math.random to always fail
      const originalRandom = Math.random;
      Math.random = jest.fn().mockReturnValue(0.1); // Always fail (< 0.25)

      try {
        // Act
        const result = await strategies.resetConnection(error, context);

        // Assert
        expect(result.success).toBe(false);
        expect(result.confidence).toBe(0.25);
        expect(result.userActionsRequired).toContain('Check internet connection');
      } finally {
        // Restore Math.random
        Math.random = originalRandom;
      }
    });
  });

  describe('Input Validation Recovery', () => {
    it('should succeed with valid input correction', async () => {
      // Arrange
      const error = new BadRequestException('Validation failed');
      const context = createTestContext();

      // Act
      const result = await strategies.validateAndCorrectInput(error, context, {
        inputData: { email: 'valid@example.com' }
      });

      // Assert
      expect(result.attemptId).toMatch(/^RECOVERY_/);
      expect(result.strategy).toBe('INPUT_VALIDATION_RECOVERY');
      expect(result.stage).toBe(RecoveryStage.GUIDED);
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should handle input validation failure', async () => {
      // Arrange
      const error = new BadRequestException('Invalid input');
      const context = createTestContext();

      // Mock Math.random to always fail validation
      const originalRandom = Math.random;
      Math.random = jest.fn()
        .mockReturnValueOnce(0.1) // Email format invalid
        .mockReturnValueOnce(0.1) // Required field missing
        .mockReturnValueOnce(0.1); // Date format invalid

      try {
        // Act
        const result = await strategies.validateAndCorrectInput(error, context);

        // Assert
        expect(result.success).toBe(false);
        expect(result.confidence).toBe(0.6);
        expect(result.metadata.validationResults.valid).toBe(false);
        expect(result.metadata.validationResults.corrections.length).toBeGreaterThan(0);
      } finally {
        // Restore Math.random
        Math.random = originalRandom;
      }
    });
  });

  describe('Performance Requirements', () => {
    it('should complete retry strategy within reasonable time', async () => {
      // Arrange
      const error = new Error('Test error');
      const context = createTestContext();

      // Act
      const startTime = Date.now();
      await strategies.retryWithBackoff(error, context, { maxRetries: 1, baseDelay: 10 });
      const totalTime = Date.now() - startTime;

      // Assert
      expect(totalTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should complete cache invalidation quickly', async () => {
      // Arrange
      const error = new Error('Cache error');
      const context = createTestContext();

      // Act
      const startTime = Date.now();
      await strategies.invalidateCache(error, context);
      const totalTime = Date.now() - startTime;

      // Assert
      expect(totalTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('Strategy Metadata', () => {
    it('should include comprehensive metadata in results', async () => {
      // Arrange
      const error = new Error('Test error');
      const context = createTestContext();

      // Act
      const result = await strategies.retryWithBackoff(error, context, { maxRetries: 2 });

      // Assert
      expect(result.metadata).toBeDefined();
      expect(result.metadata.attempts).toBeGreaterThan(0);
      expect(typeof result.metadata.finalDelay).toBeDefined();
    });
  });
});