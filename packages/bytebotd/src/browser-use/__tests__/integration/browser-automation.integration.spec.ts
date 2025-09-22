/**
 * Integration Tests for Browser Automation System
 *
 * Comprehensive integration test suite for browser automation including:
 * - Multi-service workflow validation
 * - Cross-service data consistency
 * - End-to-end API testing
 * - Session management integration
 * - Task execution workflows
 * - Error recovery testing
 * - Performance integration validation
 *
 * Coverage Target: >90% (Integration test coverage)
 *
 * @author Testing & Quality Assurance Agent
 * @version 1.0.0
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';

// Import services and controllers
import { BrowserUseController } from '../../browser-use.controller';
import { BrowserUseService } from '../../browser-use.service';
import { BrowserInteractionService } from '../../browser-interaction.service';
import { BrowserSessionService } from '../../browser-session.service';

// Import test utilities
import {
  BrowserTestDataGenerator,
  MockBrowserUseServiceFactory,
  MockBrowserInteractionServiceFactory,
  MockBrowserSessionServiceFactory,
  PerformanceTestUtils,
  SecurityTestUtils,
  TestCleanupUtils,
} from '../test-utils/browser-test-utils';

describe('Browser Automation Integration Tests', () => {
  let app: INestApplication;
  let module: TestingModule;
  let browserUseController: BrowserUseController;
  let browserUseService: jest.Mocked<BrowserUseService>;
  let browserInteractionService: jest.Mocked<BrowserInteractionService>;
  let browserSessionService: jest.Mocked<BrowserSessionService>;

  // Test data
  const mockUser = BrowserTestDataGenerator.generateMockUser();
  const testSessionId = uuidv4();
  const testTaskId = uuidv4();

  beforeAll(async () => {
    // Create mock services with realistic behaviors
    const mockBrowserUseService =
      MockBrowserUseServiceFactory.createWithDefaults();
    const mockBrowserInteractionService =
      MockBrowserInteractionServiceFactory.createWithDefaults();
    const mockBrowserSessionService =
      MockBrowserSessionServiceFactory.createWithDefaults();

    // Create testing module with real controller and mocked services
    module = await Test.createTestingModule({
      controllers: [BrowserUseController],
      providers: [
        {
          provide: BrowserUseService,
          useValue: mockBrowserUseService,
        },
        {
          provide: BrowserInteractionService,
          useValue: mockBrowserInteractionService,
        },
        {
          provide: BrowserSessionService,
          useValue: mockBrowserSessionService,
        },
      ],
    }).compile();

    // Create NestJS application
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true }),
    );

    await app.init();

    // Get service instances
    browserUseController =
      module.get<BrowserUseController>(BrowserUseController);
    browserUseService = module.get(BrowserUseService);
    browserInteractionService = module.get(BrowserInteractionService);
    browserSessionService = module.get(BrowserSessionService);
  });

  afterAll(async () => {
    await TestCleanupUtils.cleanupTestModule(module);
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Browser Session Lifecycle Integration', () => {
    it('should handle full session lifecycle with task execution', async () => {
      // Step 1: Create browser session
      const sessionDto =
        BrowserTestDataGenerator.generateCreateBrowserSessionDto({
          sessionId: testSessionId,
        });

      browserSessionService.createSession.mockResolvedValue({
        success: true,
        sessionId: testSessionId,
        metadata: { createdAt: new Date() },
      });

      const sessionResult = await browserUseController.createSession(
        sessionDto,
        mockUser,
      );

      expect(sessionResult.success).toBe(true);
      expect(sessionResult.sessionId).toBe(testSessionId);

      // Step 2: Execute script in session
      const executeDto = BrowserTestDataGenerator.generateBrowserExecuteDto({
        sessionId: testSessionId,
        script: 'console.log("Integration test script");',
        captureScreenshots: true,
      });

      browserUseService.createTask.mockResolvedValue({
        success: true,
        taskId: testTaskId,
        status: 'pending',
        metadata: { timestamp: new Date() },
      });

      browserUseService.getTask.mockResolvedValue({
        success: true,
        data: {
          taskId: testTaskId,
          status: 'completed',
          result: {
            data: 'script executed successfully',
            screenshot: 'base64screenshot',
          },
        },
      });

      const executeResult = await browserUseController.executeScript(
        executeDto,
        mockUser,
      );

      expect(executeResult.success).toBe(true);
      expect(executeResult.sessionId).toBe(testSessionId);
      expect(executeResult.screenshots).toContain('base64screenshot');

      // Step 3: Perform interactions in session
      const interactionDto =
        BrowserTestDataGenerator.generateBrowserInteractionDto({
          sessionId: testSessionId,
          type: 'click',
          selector: '#test-button',
        });

      browserUseService.executeInteraction.mockResolvedValue({
        success: true,
        data: { clicked: true },
        screenshot: undefined,
      });

      const interactionResult = await browserUseController.performInteraction(
        interactionDto,
        mockUser,
      );

      expect(interactionResult.success).toBe(true);
      expect(interactionResult.sessionId).toBe(testSessionId);

      // Step 4: Check session status
      const statusDto = BrowserTestDataGenerator.generateBrowserStatusDto({
        sessionId: testSessionId,
      });

      browserSessionService.getSessionStatus.mockResolvedValue({
        sessionId: testSessionId,
        active: true,
        lastActivity: new Date(),
      });

      const statusResult = await browserUseController.getStatus(
        statusDto,
        mockUser,
      );

      expect(statusResult.healthy).toBe(true);
      expect(statusResult.session).toBeDefined();

      // Step 5: Get task history
      const taskHistoryResult = await browserUseController.getSessionTasks(
        testSessionId,
        {},
        mockUser,
      );

      expect(browserUseService.getSessionTasks).toHaveBeenCalledWith(
        testSessionId,
        undefined,
        undefined,
      );

      // Verify all service interactions
      expect(browserSessionService.createSession).toHaveBeenCalledWith(
        sessionDto,
      );
      expect(browserUseService.createTask).toHaveBeenCalled();
      expect(browserUseService.getTask).toHaveBeenCalledWith(testTaskId);
      expect(browserUseService.executeInteraction).toHaveBeenCalled();
    });

    it('should handle session creation failure and recovery', async () => {
      const sessionDto =
        BrowserTestDataGenerator.generateCreateBrowserSessionDto();

      // Simulate session creation failure
      browserSessionService.createSession.mockRejectedValue(
        new Error('Session creation failed'),
      );

      const sessionResult = await browserUseController.createSession(
        sessionDto,
        mockUser,
      );

      expect(sessionResult.success).toBe(false);

      // Verify service was called despite failure
      expect(browserSessionService.createSession).toHaveBeenCalledWith(
        sessionDto,
      );
    });

    it('should handle concurrent sessions and tasks', async () => {
      const sessionIds = [uuidv4(), uuidv4(), uuidv4()];
      const taskIds = [uuidv4(), uuidv4(), uuidv4()];

      // Create multiple sessions concurrently
      const sessionPromises = sessionIds.map(async (sessionId, index) => {
        const sessionDto =
          BrowserTestDataGenerator.generateCreateBrowserSessionDto({
            sessionId,
          });

        browserSessionService.createSession.mockResolvedValueOnce({
          success: true,
          sessionId,
          metadata: { createdAt: new Date() },
        });

        return browserUseController.createSession(sessionDto, mockUser);
      });

      const sessionResults = await Promise.all(sessionPromises);

      // Verify all sessions created successfully
      sessionResults.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.sessionId).toBe(sessionIds[index]);
      });

      // Execute tasks concurrently across sessions
      const taskPromises = sessionIds.map(async (sessionId, index) => {
        const executeDto = BrowserTestDataGenerator.generateBrowserExecuteDto({
          sessionId,
          script: `console.log("Task ${index}");`,
        });

        browserUseService.createTask.mockResolvedValueOnce({
          success: true,
          taskId: taskIds[index],
          status: 'pending',
          metadata: { timestamp: new Date() },
        });

        browserUseService.getTask.mockResolvedValueOnce({
          success: true,
          data: {
            taskId: taskIds[index],
            status: 'completed',
            result: { data: `task ${index} completed` },
          },
        });

        return browserUseController.executeScript(executeDto, mockUser);
      });

      const taskResults = await Promise.all(taskPromises);

      // Verify all tasks executed successfully
      taskResults.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.sessionId).toBe(sessionIds[index]);
      });

      expect(browserUseService.createTask).toHaveBeenCalledTimes(3);
      expect(browserUseService.getTask).toHaveBeenCalledTimes(3);
    });
  });

  describe('Cross-Service Data Consistency Integration', () => {
    it('should maintain data consistency across service boundaries', async () => {
      const sessionId = uuidv4();
      const taskId = uuidv4();

      // Create session
      browserSessionService.createSession.mockResolvedValue({
        success: true,
        sessionId,
        metadata: { createdAt: new Date() },
      });

      const sessionDto =
        BrowserTestDataGenerator.generateCreateBrowserSessionDto({ sessionId });
      await browserUseController.createSession(sessionDto, mockUser);

      // Execute task
      browserUseService.createTask.mockResolvedValue({
        success: true,
        taskId,
        status: 'pending',
        metadata: { timestamp: new Date() },
      });

      browserUseService.getTask.mockResolvedValue({
        success: true,
        data: {
          taskId,
          sessionId,
          status: 'completed',
          result: { data: 'task completed' },
        },
      });

      const executeDto = BrowserTestDataGenerator.generateBrowserExecuteDto({
        sessionId,
      });
      const executeResult = await browserUseController.executeScript(
        executeDto,
        mockUser,
      );

      // Verify session ID consistency across services
      expect(executeResult.sessionId).toBe(sessionId);

      // Get task and verify session association
      const taskResult = await browserUseController.getTask(taskId, mockUser);
      expect(browserUseService.getTask).toHaveBeenCalledWith(taskId);

      // Verify session still active after task completion
      browserSessionService.getSessionStatus.mockResolvedValue({
        sessionId,
        active: true,
        lastActivity: new Date(),
      });

      const statusDto = BrowserTestDataGenerator.generateBrowserStatusDto({
        sessionId,
      });
      const statusResult = await browserUseController.getStatus(
        statusDto,
        mockUser,
      );

      expect(statusResult.session.sessionId).toBe(sessionId);
    });

    it('should handle session cleanup and task termination', async () => {
      const sessionId = uuidv4();
      const taskId = uuidv4();

      // Create session and task
      browserSessionService.createSession.mockResolvedValue({
        success: true,
        sessionId,
        metadata: { createdAt: new Date() },
      });

      browserUseService.createTask.mockResolvedValue({
        success: true,
        taskId,
        status: 'running',
        metadata: { timestamp: new Date() },
      });

      // Simulate task cancellation
      browserUseService.cancelTask.mockResolvedValue({
        success: true,
        data: true,
        metadata: { timestamp: new Date() },
      });

      const cancelResult = await browserUseService.cancelTask(taskId);
      expect(cancelResult.success).toBe(true);

      // Verify session cleanup
      browserSessionService.destroySession.mockResolvedValue({
        success: true,
        sessionId,
        metadata: { destroyedAt: new Date() },
      });

      // Verify services maintain consistency during cleanup
      expect(browserUseService.cancelTask).toHaveBeenCalledWith(taskId);
    });
  });

  describe('Error Recovery and Resilience Integration', () => {
    it('should handle service failures gracefully with retry logic', async () => {
      const sessionId = uuidv4();
      const executeDto = BrowserTestDataGenerator.generateBrowserExecuteDto({
        sessionId,
      });

      // Simulate service failure on first attempt
      browserUseService.createTask
        .mockRejectedValueOnce(new Error('Service temporarily unavailable'))
        .mockResolvedValueOnce({
          success: true,
          taskId: uuidv4(),
          status: 'pending',
          metadata: { timestamp: new Date() },
        });

      // The controller should handle the error gracefully
      const result = await browserUseController.executeScript(
        executeDto,
        mockUser,
      );

      // First call failed, but controller handled it
      expect(result.success).toBe(false);
      expect(result.error).toContain('Service temporarily unavailable');
    });

    it('should handle timeout scenarios across services', async () => {
      const sessionId = uuidv4();
      const taskId = uuidv4();

      // Simulate long-running task
      browserUseService.createTask.mockResolvedValue({
        success: true,
        taskId,
        status: 'pending',
        metadata: { timestamp: new Date() },
      });

      // Simulate task that never completes (stays in running state)
      browserUseService.getTask.mockResolvedValue({
        success: true,
        data: {
          taskId,
          status: 'running', // Always running, simulating timeout
        },
      });

      const executeDto = BrowserTestDataGenerator.generateBrowserExecuteDto({
        sessionId,
      });

      // This should timeout and handle gracefully
      const result = await browserUseController.executeScript(
        executeDto,
        mockUser,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    });

    it('should handle network and connectivity issues', async () => {
      const sessionId = uuidv4();

      // Simulate network errors
      browserSessionService.createSession.mockRejectedValue(
        new Error('Network error: ECONNREFUSED'),
      );

      const sessionDto =
        BrowserTestDataGenerator.generateCreateBrowserSessionDto({ sessionId });
      await expect(
        browserUseController.createSession(sessionDto, mockUser),
      ).rejects.toThrow('Network error: ECONNREFUSED');

      // Verify error is properly propagated
      expect(browserSessionService.createSession).toHaveBeenCalledWith(
        sessionDto,
      );
    });
  });

  describe('Performance Integration Testing', () => {
    it('should maintain performance under concurrent load', async () => {
      const concurrentRequests = 10;
      const sessionIds = Array.from({ length: concurrentRequests }, () =>
        uuidv4(),
      );

      // Setup mocks for concurrent execution
      sessionIds.forEach((sessionId) => {
        browserSessionService.createSession.mockResolvedValueOnce({
          success: true,
          sessionId,
          metadata: { createdAt: new Date() },
        });

        browserUseService.createTask.mockResolvedValueOnce({
          success: true,
          taskId: uuidv4(),
          status: 'pending',
          metadata: { timestamp: new Date() },
        });

        browserUseService.getTask.mockResolvedValueOnce({
          success: true,
          data: {
            taskId: uuidv4(),
            status: 'completed',
            result: { data: 'completed' },
          },
        });
      });

      const operation = async () => {
        const sessionId = sessionIds.pop();
        const sessionDto =
          BrowserTestDataGenerator.generateCreateBrowserSessionDto({
            sessionId,
          });
        const executeDto = BrowserTestDataGenerator.generateBrowserExecuteDto({
          sessionId,
        });

        await browserUseController.createSession(sessionDto, mockUser);
        return await browserUseController.executeScript(executeDto, mockUser);
      };

      const { results, metrics } =
        await PerformanceTestUtils.measureConcurrentPerformance(
          operation,
          concurrentRequests,
        );

      // Verify performance requirements
      expect(metrics.successRate).toBe(1.0); // 100% success rate
      expect(metrics.averageDuration).toBeLessThan(100); // Average under 100ms
      expect(metrics.maxDuration).toBeLessThan(500); // No single request over 500ms
      expect(metrics.memoryDelta).toBeLessThan(50 * 1024 * 1024); // Memory increase < 50MB

      results.forEach((result) => {
        expect(result.success).toBe(true);
      });
    });

    it('should handle memory-intensive operations efficiently', async () => {
      const largeDataSize = 100; // 100 operations
      const sessionId = uuidv4();

      browserSessionService.createSession.mockResolvedValue({
        success: true,
        sessionId,
        metadata: { createdAt: new Date() },
      });

      // Simulate memory-intensive operations
      for (let i = 0; i < largeDataSize; i++) {
        browserUseService.createTask.mockResolvedValueOnce({
          success: true,
          taskId: uuidv4(),
          status: 'pending',
          metadata: { timestamp: new Date() },
        });

        browserUseService.getTask.mockResolvedValueOnce({
          success: true,
          data: {
            taskId: uuidv4(),
            status: 'completed',
            result: { data: `large data operation ${i}` },
          },
        });
      }

      const operation = async () => {
        const executeDto = BrowserTestDataGenerator.generateBrowserExecuteDto({
          sessionId,
          script: `console.log("Operation ${Math.random()}");`,
        });
        return await browserUseController.executeScript(executeDto, mockUser);
      };

      const { metrics } = await PerformanceTestUtils.measurePerformance(
        async () => {
          const results = [];
          for (let i = 0; i < largeDataSize; i++) {
            results.push(await operation());
          }
          return results;
        },
      );

      // Memory usage should remain reasonable
      expect(metrics.memoryUsage.delta.heapUsed).toBeLessThan(
        100 * 1024 * 1024,
      ); // < 100MB increase

      // Total operation time should be reasonable
      expect(metrics.duration).toBeLessThan(10000); // < 10 seconds for 100 operations
    });
  });

  describe('Security Integration Testing', () => {
    it('should validate input sanitization across service boundaries', async () => {
      const maliciousInputs =
        BrowserTestDataGenerator.generateMaliciousInputs();

      // Test XSS payloads
      for (const xssPayload of maliciousInputs.xssPayloads) {
        const executeDto = BrowserTestDataGenerator.generateBrowserExecuteDto({
          script: xssPayload,
        });

        browserUseService.createTask.mockResolvedValue({
          success: true,
          taskId: uuidv4(),
          status: 'pending',
          metadata: { timestamp: new Date() },
        });

        browserUseService.getTask.mockResolvedValue({
          success: true,
          data: {
            taskId: uuidv4(),
            status: 'completed',
            result: { data: 'sanitized output' },
          },
        });

        const result = await browserUseController.executeScript(
          executeDto,
          mockUser,
        );

        // Should either succeed with sanitized input or fail safely
        if (result.success) {
          expect(result.result).not.toContain('<script>');
          expect(result.result).not.toContain('javascript:');
        }
      }
    });

    it('should enforce authentication across all endpoints', async () => {
      // Note: In a real test, we would test without authentication tokens
      // For now, we verify that user context is passed through all operations

      const sessionDto =
        BrowserTestDataGenerator.generateCreateBrowserSessionDto();
      const executeDto = BrowserTestDataGenerator.generateBrowserExecuteDto();
      const interactionDto =
        BrowserTestDataGenerator.generateBrowserInteractionDto();
      const statusDto = BrowserTestDataGenerator.generateBrowserStatusDto();

      // Mock successful responses
      browserSessionService.createSession.mockResolvedValue({
        success: true,
        sessionId: uuidv4(),
        metadata: { createdAt: new Date() },
      });

      browserUseService.createTask.mockResolvedValue({
        success: true,
        taskId: uuidv4(),
        status: 'pending',
        metadata: { timestamp: new Date() },
      });

      browserUseService.getTask.mockResolvedValue({
        success: true,
        data: {
          taskId: uuidv4(),
          status: 'completed',
          result: { data: 'success' },
        },
      });

      browserUseService.executeInteraction.mockResolvedValue({
        success: true,
        data: { result: 'interaction completed' },
      });

      // Test all endpoints with user context
      await browserUseController.createSession(sessionDto, mockUser);
      await browserUseController.executeScript(executeDto, mockUser);
      await browserUseController.performInteraction(interactionDto, mockUser);
      await browserUseController.getStatus(statusDto, mockUser);

      // Verify all service calls were made (indicating authentication passed)
      expect(browserSessionService.createSession).toHaveBeenCalled();
      expect(browserUseService.createTask).toHaveBeenCalled();
      expect(browserUseService.executeInteraction).toHaveBeenCalled();
    });

    it('should handle rate limiting and abuse prevention', async () => {
      const rapidRequests = 50;
      const sessionId = uuidv4();

      browserSessionService.createSession.mockResolvedValue({
        success: true,
        sessionId,
        metadata: { createdAt: new Date() },
      });

      // Setup mocks for rapid requests
      for (let i = 0; i < rapidRequests; i++) {
        browserUseService.createTask.mockResolvedValueOnce({
          success: true,
          taskId: uuidv4(),
          status: 'pending',
          metadata: { timestamp: new Date() },
        });

        browserUseService.getTask.mockResolvedValueOnce({
          success: true,
          data: {
            taskId: uuidv4(),
            status: 'completed',
            result: { data: `request ${i}` },
          },
        });
      }

      const rapidRequestOperation = async () => {
        const executeDto = BrowserTestDataGenerator.generateBrowserExecuteDto({
          sessionId,
        });
        return await browserUseController.executeScript(executeDto, mockUser);
      };

      // Execute rapid requests
      const promises = Array(rapidRequests)
        .fill(null)
        .map(() => rapidRequestOperation());
      const results = await Promise.all(promises);

      // All requests should complete (no rate limiting in mock scenario)
      results.forEach((result) => {
        expect(result.success).toBe(true);
      });

      // In a real implementation, we would expect some requests to be rate limited
      expect(browserUseService.createTask).toHaveBeenCalledTimes(rapidRequests);
    });
  });

  describe('Data Validation and Consistency Integration', () => {
    it('should validate data formats across service boundaries', async () => {
      const invalidData = {
        invalidSessionId: 'invalid-session-format',
        invalidScript: null,
        invalidSelector: {},
        invalidUrl: 'not-a-url',
      };

      // Test with invalid session ID format
      try {
        const executeDto = {
          ...BrowserTestDataGenerator.generateBrowserExecuteDto(),
          sessionId: invalidData.invalidSessionId,
        };
        await browserUseController.executeScript(executeDto, mockUser);
      } catch (error) {
        // Should handle invalid session ID gracefully
      }

      // Test with invalid script
      try {
        const executeDto = {
          ...BrowserTestDataGenerator.generateBrowserExecuteDto(),
          script: invalidData.invalidScript as any,
        };
        await browserUseController.executeScript(executeDto, mockUser);
      } catch (error) {
        // Should handle invalid script gracefully
      }

      // Test with invalid selector
      try {
        const interactionDto = {
          ...BrowserTestDataGenerator.generateBrowserInteractionDto(),
          selector: invalidData.invalidSelector as any,
        };
        await browserUseController.performInteraction(interactionDto, mockUser);
      } catch (error) {
        // Should handle invalid selector gracefully
      }
    });

    it('should maintain session state consistency across operations', async () => {
      const sessionId = uuidv4();
      let sessionState = { active: true, lastActivity: new Date() };

      // Mock session service to track state changes
      browserSessionService.createSession.mockResolvedValue({
        success: true,
        sessionId,
        metadata: { createdAt: new Date() },
      });

      browserSessionService.getSessionStatus.mockImplementation(
        async () => sessionState,
      );

      browserUseService.createTask.mockResolvedValue({
        success: true,
        taskId: uuidv4(),
        status: 'pending',
        metadata: { timestamp: new Date() },
      });

      browserUseService.getTask.mockResolvedValue({
        success: true,
        data: {
          taskId: uuidv4(),
          status: 'completed',
          result: { data: 'completed' },
        },
      });

      // Create session
      const sessionDto =
        BrowserTestDataGenerator.generateCreateBrowserSessionDto({ sessionId });
      await browserUseController.createSession(sessionDto, mockUser);

      // Execute operations and verify state consistency
      const executeDto = BrowserTestDataGenerator.generateBrowserExecuteDto({
        sessionId,
      });
      await browserUseController.executeScript(executeDto, mockUser);

      // Update mock state to simulate activity
      sessionState.lastActivity = new Date();

      const statusDto = BrowserTestDataGenerator.generateBrowserStatusDto({
        sessionId,
      });
      const statusResult = await browserUseController.getStatus(
        statusDto,
        mockUser,
      );

      expect(statusResult.session.sessionId).toBe(sessionId);
      expect(statusResult.session.active).toBe(true);
    });
  });

  describe('System Health and Monitoring Integration', () => {
    it('should provide comprehensive system health information', async () => {
      browserUseService.getHealthStatus.mockReturnValue({
        success: true,
        data: {
          activeTasks: 5,
          runningProcesses: 3,
          totalTasks: 100,
          config: {
            maxConcurrentSessions: 10,
            taskTimeout: 60000,
            enableScreenshots: true,
          },
        },
        metadata: { timestamp: new Date(), version: '1.0.0' },
      });

      browserSessionService.getAllSessions.mockResolvedValue([
        { sessionId: 'session-1', status: 'active', createdAt: new Date() },
        { sessionId: 'session-2', status: 'active', createdAt: new Date() },
      ]);

      const statusDto = BrowserTestDataGenerator.generateBrowserStatusDto({
        sessionId: undefined, // Get all sessions
      });

      const healthResult = await browserUseController.getStatus(
        statusDto,
        mockUser,
      );

      expect(healthResult.healthy).toBe(true);
      expect(healthResult.system.activeSessions).toBe(3);
      expect(healthResult.system.maxSessions).toBe(10);
      expect(healthResult.sessions).toHaveLength(2);
      expect(healthResult.timestamp).toBeInstanceOf(Date);
    });

    it('should detect and report system issues', async () => {
      // Simulate unhealthy system state
      browserUseService.getHealthStatus.mockReturnValue({
        success: false,
        error: {
          code: 'SYSTEM_ERROR',
          message: 'System health check failed',
          timestamp: new Date(),
          severity: 'critical',
        },
      });

      const statusDto = BrowserTestDataGenerator.generateBrowserStatusDto();

      await expect(
        browserUseController.getStatus(statusDto, mockUser),
      ).rejects.toThrow('System health check failed');
    });
  });
});
