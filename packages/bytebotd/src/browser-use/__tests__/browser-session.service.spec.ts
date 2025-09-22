/**
 * Unit Tests for BrowserSessionService
 *
 * Comprehensive test suite for browser session management including:
 * - Session creation, retrieval, and destruction
 * - Session lifecycle management
 * - Concurrent session handling
 * - Memory management and resource cleanup
 * - Security validation and session isolation
 * - Performance requirements validation
 *
 * Coverage Target: >95% (Critical browser automation service)
 *
 * @author Testing & Quality Assurance Agent
 * @version 1.0.0
 */

import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { BrowserSessionService } from '../browser-session.service';

describe('BrowserSessionService', () => {
  let service: BrowserSessionService;
  let module: TestingModule;
  let loggerSpy: jest.SpyInstance;

  beforeEach(async () => {
    // Create testing module with BrowserSessionService
    module = await Test.createTestingModule({
      providers: [BrowserSessionService],
    }).compile();

    service = module.get<BrowserSessionService>(BrowserSessionService);

    // Mock logger to capture logging behavior
    loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  afterEach(async () => {
    // Clean up all sessions and reset mocks
    const sessionIds = ['test-session-1', 'test-session-2', 'test-session-3'];
    for (const sessionId of sessionIds) {
      try {
        await service.destroySession(sessionId);
      } catch {
        // Ignore cleanup errors
      }
    }
    jest.clearAllMocks();
    await module.close();
  });

  describe('Service Initialization', () => {
    it('should be defined and properly initialized', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(BrowserSessionService);
    });

    it('should log initialization message on creation', () => {
      expect(loggerSpy).toHaveBeenCalledWith(
        'BrowserSessionService initialized',
      );
    });

    it('should be injectable as singleton', async () => {
      const anotherService = module.get<BrowserSessionService>(
        BrowserSessionService,
      );
      expect(service).toBe(anotherService);
    });

    it('should initialize with empty session map', async () => {
      const nonExistentSession = await service.getSession(
        'non-existent-session',
      );
      expect(nonExistentSession).toBeUndefined();
    });
  });

  describe('createSession method', () => {
    describe('Valid Session Creation', () => {
      it('should create session successfully with valid session ID', async () => {
        const sessionId = 'test-session-123';
        const result = await service.createSession(sessionId);

        expect(result).toEqual({
          success: true,
          sessionId,
        });
        expect(loggerSpy).toHaveBeenCalledWith(
          `Creating browser session: ${sessionId}`,
        );
      });

      it('should create session with alphanumeric session ID', async () => {
        const sessionId = 'session_ABC123_def456';
        const result = await service.createSession(sessionId);

        expect(result.success).toBe(true);
        expect(result.sessionId).toBe(sessionId);
      });

      it('should create session with UUID-like session ID', async () => {
        const sessionId = '550e8400-e29b-41d4-a716-446655440000';
        const result = await service.createSession(sessionId);

        expect(result.success).toBe(true);
        expect(result.sessionId).toBe(sessionId);
      });

      it('should create multiple sessions with different IDs', async () => {
        const sessionIds = ['session-1', 'session-2', 'session-3'];
        const results = [];

        for (const sessionId of sessionIds) {
          const result = await service.createSession(sessionId);
          results.push(result);
        }

        results.forEach((result, index) => {
          expect(result.success).toBe(true);
          expect(result.sessionId).toBe(sessionIds[index]);
        });
      });

      it('should store session data correctly', async () => {
        const sessionId = 'stored-session';
        await service.createSession(sessionId);

        const retrievedSession = await service.getSession(sessionId);
        expect(retrievedSession).toBeDefined();
        expect(retrievedSession.id).toBe(sessionId);
        expect(retrievedSession.createdAt).toBeInstanceOf(Date);
      });
    });

    describe('Session ID Validation and Edge Cases', () => {
      it('should handle empty session ID', async () => {
        const emptySessionId = '';
        const result = await service.createSession(emptySessionId);

        expect(result.success).toBe(true);
        expect(result.sessionId).toBe(emptySessionId);
      });

      it('should handle session ID with special characters', async () => {
        const specialSessionId = 'session-!@#$%^&*()_+-={}[]|\\:";\'<>?,./';
        const result = await service.createSession(specialSessionId);

        expect(result.success).toBe(true);
        expect(result.sessionId).toBe(specialSessionId);
      });

      it('should handle extremely long session ID', async () => {
        const longSessionId = 'session-' + 'a'.repeat(1000);
        const result = await service.createSession(longSessionId);

        expect(result.success).toBe(true);
        expect(result.sessionId).toBe(longSessionId);
      });

      it('should handle Unicode session ID', async () => {
        const unicodeSessionId = 'session-🎉-世界-🌍';
        const result = await service.createSession(unicodeSessionId);

        expect(result.success).toBe(true);
        expect(result.sessionId).toBe(unicodeSessionId);
      });

      it('should handle duplicate session creation', async () => {
        const sessionId = 'duplicate-session';

        // Create session first time
        const result1 = await service.createSession(sessionId);
        expect(result1.success).toBe(true);

        // Create session with same ID again
        const result2 = await service.createSession(sessionId);
        expect(result2.success).toBe(true);
        expect(result2.sessionId).toBe(sessionId);

        // Both sessions should be valid (second overwrites first)
        const retrievedSession = await service.getSession(sessionId);
        expect(retrievedSession).toBeDefined();
      });
    });

    describe('Type Safety and Parameter Validation', () => {
      it('should handle null session ID parameter', async () => {
        // @ts-expect-error Testing null parameter
        const result = await service.createSession(null);

        expect(result.success).toBe(true);
        expect(result.sessionId).toBeNull();
        expect(loggerSpy).toHaveBeenCalledWith(
          'Creating browser session: null',
        );
      });

      it('should handle undefined session ID parameter', async () => {
        // @ts-expect-error Testing undefined parameter
        const result = await service.createSession(undefined);

        expect(result.success).toBe(true);
        expect(result.sessionId).toBeUndefined();
        expect(loggerSpy).toHaveBeenCalledWith(
          'Creating browser session: undefined',
        );
      });

      it('should handle numeric session ID parameter', async () => {
        // @ts-expect-error Testing numeric parameter
        const result = await service.createSession(12345);

        expect(result.success).toBe(true);
        expect(result.sessionId).toBe(12345);
        expect(loggerSpy).toHaveBeenCalledWith(
          'Creating browser session: 12345',
        );
      });

      it('should handle object session ID parameter', async () => {
        const objectSessionId = { id: 'session-1', type: 'browser' };
        // @ts-expect-error Testing object parameter
        const result = await service.createSession(objectSessionId);

        expect(result.success).toBe(true);
        expect(result.sessionId).toBe(objectSessionId);
      });
    });

    describe('Performance Requirements', () => {
      it('should complete session creation within performance threshold', async () => {
        const startTime = performance.now();
        await service.createSession('performance-test-session');
        const endTime = performance.now();
        const executionTime = endTime - startTime;

        // Should complete within 50ms for in-memory operation
        expect(executionTime).toBeLessThan(50);
      });

      it('should handle concurrent session creation', async () => {
        const sessionIds = Array.from(
          { length: 10 },
          (_, i) => `concurrent-session-${i}`,
        );

        const startTime = performance.now();
        const results = await Promise.all(
          sessionIds.map((sessionId) => service.createSession(sessionId)),
        );
        const endTime = performance.now();

        // All sessions should be created successfully
        results.forEach((result, index) => {
          expect(result.success).toBe(true);
          expect(result.sessionId).toBe(sessionIds[index]);
        });

        // Concurrent creation should not significantly impact performance
        expect(endTime - startTime).toBeLessThan(200);
      });

      it('should handle rapid successive session creation', async () => {
        const executionTimes: number[] = [];

        for (let i = 0; i < 100; i++) {
          const startTime = performance.now();
          await service.createSession(`rapid-session-${i}`);
          const endTime = performance.now();
          executionTimes.push(endTime - startTime);
        }

        const averageTime =
          executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length;
        const maxTime = Math.max(...executionTimes);

        expect(averageTime).toBeLessThan(25); // Average under 25ms
        expect(maxTime).toBeLessThan(100); // No single creation over 100ms
      });
    });
  });

  describe('getSession method', () => {
    beforeEach(async () => {
      // Create test sessions for retrieval tests
      await service.createSession('get-test-session-1');
      await service.createSession('get-test-session-2');
    });

    describe('Valid Session Retrieval', () => {
      it('should retrieve existing session successfully', async () => {
        const session = await service.getSession('get-test-session-1');

        expect(session).toBeDefined();
        expect(session.id).toBe('get-test-session-1');
        expect(session.createdAt).toBeInstanceOf(Date);
      });

      it('should return undefined for non-existent session', async () => {
        const session = await service.getSession('non-existent-session');
        expect(session).toBeUndefined();
      });

      it('should maintain session data integrity', async () => {
        const sessionId = 'integrity-test-session';
        const creationTime = new Date();

        await service.createSession(sessionId);
        const retrievedSession = await service.getSession(sessionId);

        expect(retrievedSession.id).toBe(sessionId);
        expect(retrievedSession.createdAt.getTime()).toBeGreaterThanOrEqual(
          creationTime.getTime(),
        );
      });

      it('should retrieve correct session among multiple sessions', async () => {
        const targetSessionId = 'target-session';
        await service.createSession(targetSessionId);

        const targetSession = await service.getSession(targetSessionId);
        const otherSession = await service.getSession('get-test-session-1');

        expect(targetSession.id).toBe(targetSessionId);
        expect(otherSession.id).toBe('get-test-session-1');
        expect(targetSession.id).not.toBe(otherSession.id);
      });
    });

    describe('Edge Cases and Error Handling', () => {
      it('should handle null session ID parameter', async () => {
        // @ts-expect-error Testing null parameter
        const session = await service.getSession(null);
        expect(session).toBeUndefined();
      });

      it('should handle undefined session ID parameter', async () => {
        // @ts-expect-error Testing undefined parameter
        const session = await service.getSession(undefined);
        expect(session).toBeUndefined();
      });

      it('should handle empty string session ID', async () => {
        const session = await service.getSession('');
        expect(session).toBeUndefined();
      });

      it('should handle special character session IDs', async () => {
        const specialSessionId = 'session-!@#$%^&*()';
        await service.createSession(specialSessionId);

        const retrievedSession = await service.getSession(specialSessionId);
        expect(retrievedSession).toBeDefined();
        expect(retrievedSession.id).toBe(specialSessionId);
      });
    });

    describe('Performance Requirements', () => {
      it('should complete session retrieval within performance threshold', async () => {
        const startTime = performance.now();
        await service.getSession('get-test-session-1');
        const endTime = performance.now();
        const executionTime = endTime - startTime;

        // Should complete within 25ms for in-memory lookup
        expect(executionTime).toBeLessThan(25);
      });

      it('should handle concurrent session retrieval', async () => {
        const sessionIds = ['get-test-session-1', 'get-test-session-2'];

        const startTime = performance.now();
        const sessions = await Promise.all(
          sessionIds.map((sessionId) => service.getSession(sessionId)),
        );
        const endTime = performance.now();

        sessions.forEach((session, index) => {
          expect(session).toBeDefined();
          expect(session.id).toBe(sessionIds[index]);
        });

        expect(endTime - startTime).toBeLessThan(100);
      });
    });
  });

  describe('destroySession method', () => {
    beforeEach(async () => {
      // Create test sessions for destruction tests
      await service.createSession('destroy-test-session-1');
      await service.createSession('destroy-test-session-2');
      await service.createSession('destroy-test-session-3');
    });

    describe('Valid Session Destruction', () => {
      it('should destroy existing session successfully', async () => {
        const sessionId = 'destroy-test-session-1';

        // Verify session exists before destruction
        const sessionBefore = await service.getSession(sessionId);
        expect(sessionBefore).toBeDefined();

        // Destroy session
        const result = await service.destroySession(sessionId);
        expect(result).toEqual({ success: true });
        expect(loggerSpy).toHaveBeenCalledWith(
          `Destroying browser session: ${sessionId}`,
        );

        // Verify session no longer exists
        const sessionAfter = await service.getSession(sessionId);
        expect(sessionAfter).toBeUndefined();
      });

      it('should destroy non-existent session gracefully', async () => {
        const nonExistentSessionId = 'non-existent-session';

        const result = await service.destroySession(nonExistentSessionId);
        expect(result).toEqual({ success: true });
        expect(loggerSpy).toHaveBeenCalledWith(
          `Destroying browser session: ${nonExistentSessionId}`,
        );
      });

      it('should destroy multiple sessions independently', async () => {
        const sessionIds = ['destroy-test-session-1', 'destroy-test-session-2'];

        for (const sessionId of sessionIds) {
          const result = await service.destroySession(sessionId);
          expect(result.success).toBe(true);

          const session = await service.getSession(sessionId);
          expect(session).toBeUndefined();
        }

        // Verify other sessions still exist
        const remainingSession = await service.getSession(
          'destroy-test-session-3',
        );
        expect(remainingSession).toBeDefined();
      });

      it('should handle duplicate destruction calls', async () => {
        const sessionId = 'destroy-test-session-1';

        // First destruction
        const result1 = await service.destroySession(sessionId);
        expect(result1.success).toBe(true);

        // Second destruction of same session
        const result2 = await service.destroySession(sessionId);
        expect(result2.success).toBe(true);

        // Session should remain non-existent
        const session = await service.getSession(sessionId);
        expect(session).toBeUndefined();
      });
    });

    describe('Edge Cases and Parameter Validation', () => {
      it('should handle null session ID parameter', async () => {
        // @ts-expect-error Testing null parameter
        const result = await service.destroySession(null);
        expect(result).toEqual({ success: true });
        expect(loggerSpy).toHaveBeenCalledWith(
          'Destroying browser session: null',
        );
      });

      it('should handle undefined session ID parameter', async () => {
        // @ts-expect-error Testing undefined parameter
        const result = await service.destroySession(undefined);
        expect(result).toEqual({ success: true });
        expect(loggerSpy).toHaveBeenCalledWith(
          'Destroying browser session: undefined',
        );
      });

      it('should handle empty string session ID', async () => {
        const result = await service.destroySession('');
        expect(result).toEqual({ success: true });
        expect(loggerSpy).toHaveBeenCalledWith('Destroying browser session: ');
      });

      it('should handle special character session IDs', async () => {
        const specialSessionId = 'session-!@#$%^&*()';
        await service.createSession(specialSessionId);

        const result = await service.destroySession(specialSessionId);
        expect(result.success).toBe(true);

        const session = await service.getSession(specialSessionId);
        expect(session).toBeUndefined();
      });
    });

    describe('Performance Requirements', () => {
      it('should complete session destruction within performance threshold', async () => {
        const startTime = performance.now();
        await service.destroySession('destroy-test-session-1');
        const endTime = performance.now();
        const executionTime = endTime - startTime;

        // Should complete within 25ms for in-memory operation
        expect(executionTime).toBeLessThan(25);
      });

      it('should handle concurrent session destruction', async () => {
        const sessionIds = ['destroy-test-session-1', 'destroy-test-session-2'];

        const startTime = performance.now();
        const results = await Promise.all(
          sessionIds.map((sessionId) => service.destroySession(sessionId)),
        );
        const endTime = performance.now();

        results.forEach((result) => {
          expect(result.success).toBe(true);
        });

        expect(endTime - startTime).toBeLessThan(100);
      });

      it('should handle rapid successive destruction operations', async () => {
        // Create many sessions
        const sessionIds = Array.from(
          { length: 50 },
          (_, i) => `rapid-destroy-session-${i}`,
        );
        for (const sessionId of sessionIds) {
          await service.createSession(sessionId);
        }

        const executionTimes: number[] = [];

        for (const sessionId of sessionIds) {
          const startTime = performance.now();
          await service.destroySession(sessionId);
          const endTime = performance.now();
          executionTimes.push(endTime - startTime);
        }

        const averageTime =
          executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length;
        const maxTime = Math.max(...executionTimes);

        expect(averageTime).toBeLessThan(25); // Average under 25ms
        expect(maxTime).toBeLessThan(100); // No single destruction over 100ms
      });
    });
  });

  describe('Session Lifecycle Management', () => {
    it('should support complete session lifecycle', async () => {
      const sessionId = 'lifecycle-test-session';

      // 1. Create session
      const createResult = await service.createSession(sessionId);
      expect(createResult.success).toBe(true);

      // 2. Retrieve session
      const session = await service.getSession(sessionId);
      expect(session).toBeDefined();
      expect(session.id).toBe(sessionId);

      // 3. Destroy session
      const destroyResult = await service.destroySession(sessionId);
      expect(destroyResult.success).toBe(true);

      // 4. Verify session is gone
      const sessionAfterDestroy = await service.getSession(sessionId);
      expect(sessionAfterDestroy).toBeUndefined();
    });

    it('should handle session recreation after destruction', async () => {
      const sessionId = 'recreation-test-session';

      // Create and destroy session
      await service.createSession(sessionId);
      await service.destroySession(sessionId);

      // Recreate session with same ID
      const recreateResult = await service.createSession(sessionId);
      expect(recreateResult.success).toBe(true);

      // Verify new session exists
      const newSession = await service.getSession(sessionId);
      expect(newSession).toBeDefined();
      expect(newSession.id).toBe(sessionId);
    });

    it('should maintain session isolation', async () => {
      const session1Id = 'isolated-session-1';
      const session2Id = 'isolated-session-2';

      // Create two sessions
      await service.createSession(session1Id);
      await service.createSession(session2Id);

      // Retrieve sessions
      const session1 = await service.getSession(session1Id);
      const session2 = await service.getSession(session2Id);

      // Sessions should be isolated
      expect(session1.id).toBe(session1Id);
      expect(session2.id).toBe(session2Id);
      expect(session1.id).not.toBe(session2.id);

      // Destroying one should not affect the other
      await service.destroySession(session1Id);

      const session1After = await service.getSession(session1Id);
      const session2After = await service.getSession(session2Id);

      expect(session1After).toBeUndefined();
      expect(session2After).toBeDefined();
      expect(session2After.id).toBe(session2Id);
    });
  });

  describe('Memory Management and Resource Efficiency', () => {
    it('should not create memory leaks with many sessions', async () => {
      const initialMemoryUsage = process.memoryUsage();

      // Create and destroy many sessions
      for (let i = 0; i < 1000; i++) {
        await service.createSession(`memory-test-session-${i}`);
        if (i % 2 === 0) {
          await service.destroySession(`memory-test-session-${i}`);
        }
      }

      const finalMemoryUsage = process.memoryUsage();
      const memoryIncrease =
        finalMemoryUsage.heapUsed - initialMemoryUsage.heapUsed;

      // Memory increase should be reasonable (less than 10MB for 1000 sessions)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });

    it('should handle session storage efficiently', async () => {
      const sessionCount = 100;
      const sessionIds: string[] = [];

      // Create many sessions
      const createStartTime = performance.now();
      for (let i = 0; i < sessionCount; i++) {
        const sessionId = `efficient-session-${i}`;
        sessionIds.push(sessionId);
        await service.createSession(sessionId);
      }
      const createEndTime = performance.now();

      // Retrieve all sessions
      const retrieveStartTime = performance.now();
      for (const sessionId of sessionIds) {
        const session = await service.getSession(sessionId);
        expect(session).toBeDefined();
      }
      const retrieveEndTime = performance.now();

      // Performance should scale reasonably
      const createTime = createEndTime - createStartTime;
      const retrieveTime = retrieveEndTime - retrieveStartTime;

      expect(createTime).toBeLessThan(1000); // Creating 100 sessions under 1 second
      expect(retrieveTime).toBeLessThan(500); // Retrieving 100 sessions under 0.5 seconds
    });
  });

  describe('Service Integration and Extensibility', () => {
    it('should be ready for controller integration', () => {
      expect(service.createSession).toBeDefined();
      expect(service.getSession).toBeDefined();
      expect(service.destroySession).toBeDefined();
      expect(typeof service.createSession).toBe('function');
      expect(typeof service.getSession).toBe('function');
      expect(typeof service.destroySession).toBe('function');
    });

    it('should maintain consistent response formats', async () => {
      const sessionId = 'format-test-session';

      const createResult = await service.createSession(sessionId);
      const destroyResult = await service.destroySession(sessionId);

      // Create response format
      expect(createResult).toHaveProperty('success');
      expect(createResult).toHaveProperty('sessionId');
      expect(typeof createResult.success).toBe('boolean');
      expect(createResult.success).toBe(true);

      // Destroy response format
      expect(destroyResult).toHaveProperty('success');
      expect(typeof destroyResult.success).toBe('boolean');
      expect(destroyResult.success).toBe(true);
    });

    it('should support service composition patterns', async () => {
      // Test that service can be used in larger workflows
      const sessionIds = ['compose-1', 'compose-2', 'compose-3'];

      // Batch create
      const createResults = await Promise.all(
        sessionIds.map((id) => service.createSession(id)),
      );

      // Batch retrieve
      const sessions = await Promise.all(
        sessionIds.map((id) => service.getSession(id)),
      );

      // Batch destroy
      const destroyResults = await Promise.all(
        sessionIds.map((id) => service.destroySession(id)),
      );

      createResults.forEach((result) => expect(result.success).toBe(true));
      sessions.forEach((session) => expect(session).toBeDefined());
      destroyResults.forEach((result) => expect(result.success).toBe(true));
    });
  });
});
