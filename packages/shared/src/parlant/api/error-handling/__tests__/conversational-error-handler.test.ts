/**
 * PARLANT Phase 1 - Conversational Error Handler Tests
 *
 * Comprehensive test suite for the conversational error handling system,
 * covering all scenarios and recovery paths with enterprise-grade validation.
 *
 * @version 1.0.0
 * @author PARLANT Phase 1 Implementation Team
 */

import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  InternalServerErrorException
} from '@nestjs/common';

import {
  ConversationalErrorHandler,
  ErrorNaturalLanguageProcessor,
  ConversationalErrorContext,
  ConversationalErrorSeverity,
  ConversationalErrorCategory,
  ConversationalErrorResponse
} from '../conversational-error-handler';

describe('ConversationalErrorHandler', () => {
  let errorHandler: ConversationalErrorHandler;
  let nlpProcessor: ErrorNaturalLanguageProcessor;
  let eventEmitter: EventEmitter2;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        ConversationalErrorHandler,
        ErrorNaturalLanguageProcessor,
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn()
          }
        }
      ]
    }).compile();

    errorHandler = module.get<ConversationalErrorHandler>(ConversationalErrorHandler);
    nlpProcessor = module.get<ErrorNaturalLanguageProcessor>(ErrorNaturalLanguageProcessor);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('Error Processing', () => {
    const createTestContext = (overrides: Partial<ConversationalErrorContext> = {}): ConversationalErrorContext => ({
      userId: 'test-user-123',
      sessionId: 'session-456',
      userLanguage: 'en',
      userExpertiseLevel: 'INTERMEDIATE',
      endpoint: '/api/test',
      method: 'POST',
      parameters: { testParam: 'value' },
      headers: { 'user-agent': 'test-agent' },
      timestamp: new Date(),
      requestId: 'req-789',
      ...overrides
    });

    it('should process BadRequestException correctly', async () => {
      // Arrange
      const error = new BadRequestException('Invalid input format');
      const context = createTestContext();

      // Act
      const result = await errorHandler.processError(error, context);

      // Assert
      expect(result).toBeDefined();
      expect(result.severity).toBe(ConversationalErrorSeverity.WARNING);
      expect(result.category).toBe(ConversationalErrorCategory.USER_INPUT);
      expect(result.title).toBe('Input Validation Issue');
      expect(result.message).toContain('information you provided');
      expect(result.guidance).toBeDefined();
      expect(result.guidance.immediateActions).toHaveLength(2);
      expect(result.recoveryRecommendations).toHaveLength(2);
      expect(result.tracking.processingTime).toBeGreaterThan(0);
    });

    it('should process UnauthorizedException correctly', async () => {
      // Arrange
      const error = new UnauthorizedException('Authentication required');
      const context = createTestContext();

      // Act
      const result = await errorHandler.processError(error, context);

      // Assert
      expect(result.severity).toBe(ConversationalErrorSeverity.ERROR);
      expect(result.category).toBe(ConversationalErrorCategory.AUTHENTICATION);
      expect(result.title).toBe('Authentication Required');
      expect(result.message).toContain('sign in');
      expect(result.guidance.immediateActions[0].action).toContain('logging in');
    });

    it('should process ForbiddenException correctly', async () => {
      // Arrange
      const error = new ForbiddenException('Access denied');
      const context = createTestContext();

      // Act
      const result = await errorHandler.processError(error, context);

      // Assert
      expect(result.severity).toBe(ConversationalErrorSeverity.ERROR);
      expect(result.category).toBe(ConversationalErrorCategory.AUTHORIZATION);
      expect(result.title).toBe('Access Permission Issue');
      expect(result.message).toContain('permission');
    });

    it('should process NotFoundException correctly', async () => {
      // Arrange
      const error = new NotFoundException('Resource not found');
      const context = createTestContext();

      // Act
      const result = await errorHandler.processError(error, context);

      // Assert
      expect(result.severity).toBe(ConversationalErrorSeverity.WARNING);
      expect(result.category).toBe(ConversationalErrorCategory.USER_INPUT);
      expect(result.message).toContain('information you provided');
    });

    it('should process InternalServerErrorException correctly', async () => {
      // Arrange
      const error = new InternalServerErrorException('Internal server error');
      const context = createTestContext();

      // Act
      const result = await errorHandler.processError(error, context);

      // Assert
      expect(result.severity).toBe(ConversationalErrorSeverity.CRITICAL);
      expect(result.category).toBe(ConversationalErrorCategory.SYSTEM);
      expect(result.title).toBe('System Temporarily Unavailable');
      expect(result.message).toContain('technical issue');
    });

    it('should include technical details for expert users', async () => {
      // Arrange
      const error = new Error('Test error');
      const context = createTestContext({ userExpertiseLevel: 'EXPERT' });

      // Act
      const result = await errorHandler.processError(error, context);

      // Assert
      expect(result.technicalDetails).toBeDefined();
      expect(result.technicalDetails?.errorCode).toBe('Error');
      expect(result.technicalDetails?.stackTrace).toBeDefined();
      expect(result.technicalDetails?.systemInfo).toBeDefined();
    });

    it('should not include technical details for non-expert users', async () => {
      // Arrange
      const error = new Error('Test error');
      const context = createTestContext({ userExpertiseLevel: 'BEGINNER' });

      // Act
      const result = await errorHandler.processError(error, context);

      // Assert
      expect(result.technicalDetails).toBeUndefined();
    });

    it('should emit analytics event', async () => {
      // Arrange
      const error = new Error('Test error');
      const context = createTestContext();

      // Act
      await errorHandler.processError(error, context);

      // Assert
      expect(eventEmitter.emit).toHaveBeenCalledWith('error.processed', expect.objectContaining({
        errorId: expect.any(String),
        category: expect.any(String),
        severity: expect.any(String),
        processingTime: expect.any(Number),
        userId: context.userId
      }));
    });

    it('should handle processing errors gracefully', async () => {
      // Arrange
      const error = new Error('Test error');
      const context = createTestContext();

      // Mock nlpProcessor to throw error
      jest.spyOn(nlpProcessor, 'processErrorToNaturalLanguage').mockRejectedValue(new Error('NLP failed'));

      // Act
      const result = await errorHandler.processError(error, context);

      // Assert
      expect(result).toBeDefined();
      expect(result.title).toBe('System Error');
      expect(result.message).toContain('unexpected error occurred');
    });
  });

  describe('Error Classification', () => {
    it('should classify errors correctly based on type', async () => {
      const testCases = [
        {
          error: new BadRequestException(),
          expectedSeverity: ConversationalErrorSeverity.WARNING,
          expectedCategory: ConversationalErrorCategory.USER_INPUT
        },
        {
          error: new UnauthorizedException(),
          expectedSeverity: ConversationalErrorSeverity.ERROR,
          expectedCategory: ConversationalErrorCategory.AUTHENTICATION
        },
        {
          error: new ForbiddenException(),
          expectedSeverity: ConversationalErrorSeverity.ERROR,
          expectedCategory: ConversationalErrorCategory.AUTHORIZATION
        },
        {
          error: new NotFoundException(),
          expectedSeverity: ConversationalErrorSeverity.WARNING,
          expectedCategory: ConversationalErrorCategory.USER_INPUT
        },
        {
          error: new InternalServerErrorException(),
          expectedSeverity: ConversationalErrorSeverity.CRITICAL,
          expectedCategory: ConversationalErrorCategory.SYSTEM
        }
      ];

      for (const testCase of testCases) {
        const context = { timestamp: new Date(), requestId: 'test' } as ConversationalErrorContext;
        const result = await errorHandler.processError(testCase.error, context);

        expect(result.severity).toBe(testCase.expectedSeverity);
        expect(result.category).toBe(testCase.expectedCategory);
      }
    });
  });

  describe('Guidance Generation', () => {
    it('should generate appropriate immediate actions for different error categories', async () => {
      const testCases = [
        {
          error: new BadRequestException(),
          expectedActions: ['Check My Input', 'Show Examples']
        },
        {
          error: new UnauthorizedException(),
          expectedActions: ['Try Logging In Again', 'Reset Password']
        }
      ];

      for (const testCase of testCases) {
        const context = { timestamp: new Date(), requestId: 'test' } as ConversationalErrorContext;
        const result = await errorHandler.processError(testCase.error, context);

        expect(result.guidance.immediateActions).toHaveLength(2);
        expect(result.guidance.immediateActions[0].action).toContain('Check');
      }
    });

    it('should generate alternatives with different difficulty levels', async () => {
      // Arrange
      const error = new BadRequestException();
      const context = { timestamp: new Date(), requestId: 'test' } as ConversationalErrorContext;

      // Act
      const result = await errorHandler.processError(error, context);

      // Assert
      expect(result.guidance.alternatives).toHaveLength(2);
      expect(result.guidance.alternatives[0].difficulty).toBe('EASY');
      expect(result.guidance.alternatives[1].difficulty).toBe('MEDIUM');
      expect(result.guidance.alternatives[0].steps).toBeDefined();
      expect(result.guidance.alternatives[0].estimatedTime).toBeDefined();
    });

    it('should generate prevention tips', async () => {
      // Arrange
      const error = new Error('Test error');
      const context = { timestamp: new Date(), requestId: 'test' } as ConversationalErrorContext;

      // Act
      const result = await errorHandler.processError(error, context);

      // Assert
      expect(result.guidance.preventionTips).toHaveLength(3);
      expect(result.guidance.preventionTips[0]).toHaveProperty('tip');
      expect(result.guidance.preventionTips[0]).toHaveProperty('rationale');
      expect(result.guidance.preventionTips[0]).toHaveProperty('category');
    });

    it('should generate escalation guidance', async () => {
      // Arrange
      const error = new Error('Test error');
      const context = { timestamp: new Date(), requestId: 'test' } as ConversationalErrorContext;

      // Act
      const result = await errorHandler.processError(error, context);

      // Assert
      expect(result.guidance.escalationGuidance).toBeDefined();
      expect(result.guidance.escalationGuidance?.when).toContain('persists');
      expect(result.guidance.escalationGuidance?.how).toContain('support');
      expect(result.guidance.escalationGuidance?.expectedResponse).toContain('hours');
    });

    it('should generate related resources', async () => {
      // Arrange
      const error = new Error('Test error');
      const context = { timestamp: new Date(), requestId: 'test' } as ConversationalErrorContext;

      // Act
      const result = await errorHandler.processError(error, context);

      // Assert
      expect(result.guidance.resources).toHaveLength(2);
      expect(result.guidance.resources[0]).toHaveProperty('title');
      expect(result.guidance.resources[0]).toHaveProperty('url');
      expect(result.guidance.resources[0]).toHaveProperty('type');
      expect(result.guidance.resources[0]).toHaveProperty('difficulty');
    });
  });

  describe('Recovery Recommendations', () => {
    it('should generate recovery recommendations sorted by confidence', async () => {
      // Arrange
      const error = new Error('Test error');
      const context = { timestamp: new Date(), requestId: 'test' } as ConversationalErrorContext;

      // Act
      const result = await errorHandler.processError(error, context);

      // Assert
      expect(result.recoveryRecommendations).toHaveLength(2);

      // Should be sorted by confidence (highest first)
      for (let i = 0; i < result.recoveryRecommendations.length - 1; i++) {
        expect(result.recoveryRecommendations[i].confidence)
          .toBeGreaterThanOrEqual(result.recoveryRecommendations[i + 1].confidence);
      }

      // Each recommendation should have required properties
      result.recoveryRecommendations.forEach(rec => {
        expect(rec).toHaveProperty('strategy');
        expect(rec).toHaveProperty('description');
        expect(rec).toHaveProperty('confidence');
        expect(rec).toHaveProperty('estimatedTime');
        expect(rec).toHaveProperty('requiredActions');
        expect(rec).toHaveProperty('successCriteria');
        expect(rec).toHaveProperty('stage');
      });
    });

    it('should include manual intervention for critical errors', async () => {
      // Arrange
      const error = new InternalServerErrorException('Critical system failure');
      const context = { timestamp: new Date(), requestId: 'test' } as ConversationalErrorContext;

      // Act
      const result = await errorHandler.processError(error, context);

      // Assert
      const manualIntervention = result.recoveryRecommendations.find(
        rec => rec.strategy === 'MANUAL_INTERVENTION'
      );
      expect(manualIntervention).toBeDefined();
      expect(manualIntervention?.requiredActions).toContain('Contact support');
    });
  });

  describe('Performance Requirements', () => {
    it('should process errors within 100ms for simple cases', async () => {
      // Arrange
      const error = new BadRequestException('Simple validation error');
      const context = { timestamp: new Date(), requestId: 'test' } as ConversationalErrorContext;

      // Act
      const startTime = Date.now();
      const result = await errorHandler.processError(error, context);
      const processingTime = Date.now() - startTime;

      // Assert
      expect(processingTime).toBeLessThan(100);
      expect(result.tracking.processingTime).toBeLessThan(100);
    });

    it('should generate unique error IDs', async () => {
      // Arrange
      const error = new Error('Test error');
      const context = { timestamp: new Date(), requestId: 'test' } as ConversationalErrorContext;

      // Act
      const result1 = await errorHandler.processError(error, context);
      const result2 = await errorHandler.processError(error, context);

      // Assert
      expect(result1.errorId).not.toBe(result2.errorId);
      expect(result1.errorId).toMatch(/^PARLANT_\d+_[a-z0-9]+$/);
      expect(result2.errorId).toMatch(/^PARLANT_\d+_[a-z0-9]+$/);
    });
  });

  describe('Context Handling', () => {
    it('should handle minimal context gracefully', async () => {
      // Arrange
      const error = new Error('Test error');
      const minimalContext: ConversationalErrorContext = {
        timestamp: new Date(),
        requestId: 'test'
      };

      // Act
      const result = await errorHandler.processError(error, minimalContext);

      // Assert
      expect(result).toBeDefined();
      expect(result.context).toEqual(minimalContext);
    });

    it('should handle rich context appropriately', async () => {
      // Arrange
      const error = new Error('Test error');
      const richContext: ConversationalErrorContext = {
        userId: 'user-123',
        sessionId: 'session-456',
        userLanguage: 'en',
        userExpertiseLevel: 'EXPERT',
        endpoint: '/api/complex/operation',
        method: 'POST',
        parameters: { complexParam: { nested: 'value' } },
        headers: { 'user-agent': 'Advanced-Client/1.0' },
        timestamp: new Date(),
        requestId: 'req-789',
        systemLoad: 0.85,
        region: 'us-east-1',
        errorHistory: [
          { timestamp: new Date(), errorCode: 'PREV_ERROR', resolved: true }
        ]
      };

      // Act
      const result = await errorHandler.processError(error, richContext);

      // Assert
      expect(result).toBeDefined();
      expect(result.context).toEqual(richContext);
      expect(result.technicalDetails).toBeDefined(); // Expert user should get technical details
    });
  });

  describe('Error Analytics', () => {
    it('should include similar errors count in tracking', async () => {
      // Arrange
      const error = new Error('Test error');
      const context = { timestamp: new Date(), requestId: 'test' } as ConversationalErrorContext;

      // Act
      const result = await errorHandler.processError(error, context);

      // Assert
      expect(result.tracking.similarErrorsCount).toBeGreaterThanOrEqual(0);
      expect(typeof result.tracking.similarErrorsCount).toBe('number');
    });

    it('should include resolution rate in tracking', async () => {
      // Arrange
      const error = new BadRequestException();
      const context = { timestamp: new Date(), requestId: 'test' } as ConversationalErrorContext;

      // Act
      const result = await errorHandler.processError(error, context);

      // Assert
      expect(result.tracking.resolutionRate).toBeGreaterThan(0);
      expect(result.tracking.resolutionRate).toBeLessThanOrEqual(1);
    });
  });
});

describe('ErrorNaturalLanguageProcessor', () => {
  let nlpProcessor: ErrorNaturalLanguageProcessor;

  beforeEach(() => {
    nlpProcessor = new ErrorNaturalLanguageProcessor();
  });

  describe('Natural Language Processing', () => {
    it('should process BadRequestException to natural language', async () => {
      // Arrange
      const error = new BadRequestException('Validation failed for field email');
      const context: ConversationalErrorContext = {
        timestamp: new Date(),
        requestId: 'test',
        userExpertiseLevel: 'BEGINNER',
        endpoint: '/api/users',
        method: 'POST'
      };

      // Act
      const result = await nlpProcessor.processErrorToNaturalLanguage(error, context);

      // Assert
      expect(result).toContain('information you provided');
      expect(result).toContain('/api/users');
      expect(result).toContain('POST');
      expect(result).not.toContain('validation'); // Should be simplified for beginners
    });

    it('should adapt language for different expertise levels', async () => {
      // Arrange
      const error = new Error('Authentication failed');
      const beginnerContext: ConversationalErrorContext = {
        timestamp: new Date(),
        requestId: 'test',
        userExpertiseLevel: 'BEGINNER'
      };
      const expertContext: ConversationalErrorContext = {
        timestamp: new Date(),
        requestId: 'test',
        userExpertiseLevel: 'EXPERT'
      };

      // Act
      const beginnerResult = await nlpProcessor.processErrorToNaturalLanguage(error, beginnerContext);
      const expertResult = await nlpProcessor.processErrorToNaturalLanguage(error, expertContext);

      // Assert
      expect(beginnerResult).toContain('login'); // Simplified terminology
      expect(expertResult).toContain('Check the response headers'); // Technical details
    });

    it('should handle NLP processing failures gracefully', async () => {
      // Arrange
      const error = new Error('Test error');
      const context: ConversationalErrorContext = {
        timestamp: new Date(),
        requestId: 'test'
      };

      // Mock internal methods to throw errors
      jest.spyOn(nlpProcessor as any, 'analyzeError').mockImplementation(() => {
        throw new Error('Analysis failed');
      });

      // Act
      const result = await nlpProcessor.processErrorToNaturalLanguage(error, context);

      // Assert
      expect(result).toContain('An error occurred while processing your request');
      expect(result).toContain(error.message);
    });

    it('should process different error types appropriately', async () => {
      const testCases = [
        {
          error: new UnauthorizedException(),
          expectedContent: ['sign in', 'session', 'expired']
        },
        {
          error: new ForbiddenException(),
          expectedContent: ['permission', 'access', 'privileges']
        },
        {
          error: new NotFoundException(),
          expectedContent: ['information you provided', 'formatting']
        },
        {
          error: new InternalServerErrorException(),
          expectedContent: ['technical issue', 'our end']
        }
      ];

      for (const testCase of testCases) {
        const context: ConversationalErrorContext = {
          timestamp: new Date(),
          requestId: 'test'
        };

        const result = await nlpProcessor.processErrorToNaturalLanguage(testCase.error, context);

        testCase.expectedContent.forEach(content => {
          expect(result.toLowerCase()).toContain(content.toLowerCase());
        });
      }
    });
  });

  describe('Performance', () => {
    it('should process natural language within 50ms', async () => {
      // Arrange
      const error = new BadRequestException('Simple error');
      const context: ConversationalErrorContext = {
        timestamp: new Date(),
        requestId: 'test'
      };

      // Act
      const startTime = Date.now();
      await nlpProcessor.processErrorToNaturalLanguage(error, context);
      const processingTime = Date.now() - startTime;

      // Assert
      expect(processingTime).toBeLessThan(50);
    });
  });
});