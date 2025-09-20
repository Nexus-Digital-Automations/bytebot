/**
 * Simplified Security Integration Test
 *
 * Focused test to validate that the security framework components work together
 * and meet the critical performance requirement of sub-1000ms P95 latency.
 *
 * @author Security Integration Test Team
 */

import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { performance } from 'perf_hooks';

// Security components
import { BrowserRequestValidatorService } from '../../validators/browser-request-validator.service';
import { BrowserRateLimiterService } from '../../rate-limiters/browser-rate-limiter.service';
import { BrowserAuditTrailService } from '../../audit/browser-audit-trail.service';

// DTOs
import { BrowserActionType } from '../../dto/browser-task.dto';

/**
 * Performance measurement utility
 */
class SimpleBenchmark {
  private measurements: number[] = [];

  measure<T>(fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    return fn().then(result => {
      const duration = performance.now() - start;
      this.measurements.push(duration);
      return result;
    });
  }

  getP95(): number {
    if (this.measurements.length === 0) return 0;
    const sorted = [...this.measurements].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * 0.95) - 1;
    return sorted[index] || sorted[sorted.length - 1];
  }

  getStats() {
    if (this.measurements.length === 0) {
      return { count: 0, avg: 0, p95: 0, min: 0, max: 0 };
    }
    const count = this.measurements.length;
    const avg = this.measurements.reduce((sum, val) => sum + val, 0) / count;
    const p95 = this.getP95();
    const min = Math.min(...this.measurements);
    const max = Math.max(...this.measurements);
    return { count, avg, p95, min, max };
  }
}

describe('Security Framework Integration (Simplified)', () => {
  let module: TestingModule;
  let validator: BrowserRequestValidatorService;
  let rateLimiter: BrowserRateLimiterService;
  let auditTrail: BrowserAuditTrailService;
  let logger: Logger;

  beforeAll(async () => {
    logger = new Logger('SecurityIntegrationTest');

    module = await Test.createTestingModule({
      providers: [
        BrowserRequestValidatorService,
        BrowserRateLimiterService,
        BrowserAuditTrailService,
        Logger,
      ],
    }).compile();

    validator = module.get<BrowserRequestValidatorService>(BrowserRequestValidatorService);
    rateLimiter = module.get<BrowserRateLimiterService>(BrowserRateLimiterService);
    auditTrail = module.get<BrowserAuditTrailService>(BrowserAuditTrailService);
  });

  afterAll(async () => {
    await module.close();
  });

  describe('🚀 Core Performance Requirements', () => {
    it('should meet P95 latency requirement for validation workflow', async () => {
      const benchmark = new SimpleBenchmark();
      const iterations = 100;

      // Test data
      const validTaskRequest = {
        name: 'Test Browser Task',
        description: 'Performance test task',
        actions: [
          {
            type: BrowserActionType.NAVIGATE,
            url: 'https://example.com',
          },
          {
            type: BrowserActionType.CLICK,
            selector: '.test-button',
          },
        ],
      };

      const userContext = {
        trustLevel: 'MEDIUM' as const,
        permissions: ['browser:task:create'],
      };

      for (let i = 0; i < iterations; i++) {
        await benchmark.measure(async () => {
          return await validator.validateBrowserTaskRequest(validTaskRequest, userContext);
        });
      }

      const stats = benchmark.getStats();
      logger.log(`\n🎯 Validation Performance Results:`);
      logger.log(`   Iterations: ${stats.count}`);
      logger.log(`   Average: ${stats.avg.toFixed(2)}ms`);
      logger.log(`   P95: ${stats.p95.toFixed(2)}ms`);
      logger.log(`   Range: ${stats.min.toFixed(2)}ms - ${stats.max.toFixed(2)}ms`);

      // CRITICAL ASSERTION: P95 must be reasonable for validation
      expect(stats.p95).toBeLessThan(500); // Validation should be fast
      expect(stats.avg).toBeLessThan(100); // Average should be very fast
    });

    it('should meet P95 latency requirement for rate limiting', async () => {
      const benchmark = new SimpleBenchmark();
      const iterations = 100;

      const rateLimitContext = {
        userId: 'test-user-performance',
        ipAddress: '127.0.0.1',
        endpoint: '/api/browser/task',
        operation: {
          type: 'create_task',
          resourceIntensive: false,
        },
      };

      for (let i = 0; i < iterations; i++) {
        await benchmark.measure(async () => {
          return await rateLimiter.evaluateRateLimit(rateLimitContext);
        });
      }

      const stats = benchmark.getStats();
      logger.log(`\n⚡ Rate Limiting Performance Results:`);
      logger.log(`   Iterations: ${stats.count}`);
      logger.log(`   Average: ${stats.avg.toFixed(2)}ms`);
      logger.log(`   P95: ${stats.p95.toFixed(2)}ms`);
      logger.log(`   Range: ${stats.min.toFixed(2)}ms - ${stats.max.toFixed(2)}ms`);

      // CRITICAL ASSERTION: Rate limiting should be very fast
      expect(stats.p95).toBeLessThan(50); // Rate limiting should be ultra-fast
      expect(stats.avg).toBeLessThan(20); // Average should be extremely fast
    });

    it('should meet P95 latency requirement for audit recording', async () => {
      const benchmark = new SimpleBenchmark();
      const iterations = 50; // Fewer iterations for audit due to I/O

      for (let i = 0; i < iterations; i++) {
        await benchmark.measure(async () => {
          return await auditTrail.recordEvent({
            eventType: 'BROWSER_TASK_CREATED',
            severity: 'MEDIUM',
            userId: `perf-test-user-${i}`,
            sessionId: `perf-session-${i}`,
            description: 'Performance test audit event',
            resource: '/api/browser/task',
            action: 'POST',
            outcome: 'SUCCESS',
            ipAddress: '127.0.0.1',
            userAgent: 'performance-test-agent',
            data: { iteration: i },
            complianceFlags: ['PERFORMANCE_TEST'],
          });
        });
      }

      const stats = benchmark.getStats();
      logger.log(`\n📝 Audit Trail Performance Results:`);
      logger.log(`   Iterations: ${stats.count}`);
      logger.log(`   Average: ${stats.avg.toFixed(2)}ms`);
      logger.log(`   P95: ${stats.p95.toFixed(2)}ms`);
      logger.log(`   Range: ${stats.min.toFixed(2)}ms - ${stats.max.toFixed(2)}ms`);

      // CRITICAL ASSERTION: Audit recording should be fast
      expect(stats.p95).toBeLessThan(300); // Audit should be reasonably fast
      expect(stats.avg).toBeLessThan(150); // Average should be fast
    });

    it('should meet overall P95 latency requirement for combined workflow', async () => {
      const benchmark = new SimpleBenchmark();
      const iterations = 50;

      const validTaskRequest = {
        name: 'Combined Workflow Test',
        description: 'Testing complete security workflow',
        actions: [
          {
            type: BrowserActionType.NAVIGATE,
            url: 'https://example.com/workflow-test',
          },
          {
            type: BrowserActionType.WAIT,
            selector: '.content-loaded',
          },
        ],
      };

      const userContext = {
        trustLevel: 'MEDIUM' as const,
        permissions: ['browser:task:create'],
      };

      const rateLimitContext = {
        userId: 'combined-workflow-user',
        ipAddress: '127.0.0.1',
        endpoint: '/api/browser/task',
        operation: {
          type: 'create_task',
          resourceIntensive: false,
        },
      };

      for (let i = 0; i < iterations; i++) {
        await benchmark.measure(async () => {
          // Simulate complete security workflow
          // 1. Validation
          const validationResult = await validator.validateBrowserTaskRequest(
            validTaskRequest,
            userContext
          );

          if (!validationResult.valid) {
            throw new Error('Validation failed');
          }

          // 2. Rate limiting
          const rateLimitResult = await rateLimiter.evaluateRateLimit(rateLimitContext);

          if (!rateLimitResult.allowed) {
            throw new Error('Rate limit exceeded');
          }

          // 3. Audit recording
          await auditTrail.recordEvent({
            eventType: 'BROWSER_TASK_CREATED',
            severity: 'MEDIUM',
            userId: 'combined-workflow-user',
            sessionId: `workflow-session-${i}`,
            description: 'Combined workflow security validation completed',
            resource: '/api/browser/task',
            action: 'POST',
            outcome: 'SUCCESS',
            ipAddress: '127.0.0.1',
            userAgent: 'workflow-test-agent',
            data: { workflowIteration: i },
            complianceFlags: ['WORKFLOW_TEST'],
          });

          return 'success';
        });
      }

      const stats = benchmark.getStats();
      logger.log(`\n🚀 COMBINED WORKFLOW PERFORMANCE RESULTS:`);
      logger.log(`   Iterations: ${stats.count}`);
      logger.log(`   Average: ${stats.avg.toFixed(2)}ms`);
      logger.log(`   P95: ${stats.p95.toFixed(2)}ms`);
      logger.log(`   Range: ${stats.min.toFixed(2)}ms - ${stats.max.toFixed(2)}ms`);

      // 🎯 CRITICAL ASSERTION: The main requirement
      expect(stats.p95).toBeLessThan(1000); // < 1000ms P95 requirement
      logger.log(`\n✅ P95 REQUIREMENT MET: ${stats.p95.toFixed(2)}ms < 1000ms`);
    });
  });

  describe('🔒 Security Validation', () => {
    it('should detect SQL injection attacks', async () => {
      const maliciousRequest = {
        name: "'; DROP TABLE users; --",
        description: 'Malicious task with SQL injection',
        actions: [
          {
            type: BrowserActionType.NAVIGATE,
            url: 'https://example.com',
          },
        ],
      };

      const userContext = {
        trustLevel: 'LOW' as const,
        permissions: ['browser:task:create'],
      };

      const result = await validator.validateBrowserTaskRequest(maliciousRequest, userContext);

      expect(result.valid).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations.some(v => v.type === 'SQL_INJECTION')).toBe(true);
    });

    it('should detect XSS attacks', async () => {
      const maliciousRequest = {
        name: 'Test Task',
        description: '<script>alert("XSS")</script>',
        actions: [
          {
            type: BrowserActionType.TYPE,
            selector: '.input',
            text: '<img src="x" onerror="alert(\'XSS\')" />',
          },
        ],
      };

      const userContext = {
        trustLevel: 'LOW' as const,
        permissions: ['browser:task:create'],
      };

      const result = await validator.validateBrowserTaskRequest(maliciousRequest, userContext);

      expect(result.valid).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations.some(v => v.type === 'XSS_ATTACK')).toBe(true);
    });

    it('should enforce rate limits', async () => {
      const rateLimitContext = {
        userId: 'rate-limit-test-user',
        ipAddress: '127.0.0.1',
        endpoint: '/api/browser/task',
        operation: {
          type: 'create_task',
          resourceIntensive: false,
        },
      };

      // Make multiple rapid requests
      const results = [];
      for (let i = 0; i < 20; i++) {
        const result = await rateLimiter.evaluateRateLimit(rateLimitContext);
        results.push(result);
      }

      // Some requests should be blocked due to rate limiting
      const blockedRequests = results.filter(r => !r.allowed);
      expect(blockedRequests.length).toBeGreaterThan(0);
    });

    it('should maintain audit trail integrity', async () => {
      const testEvents = [];

      // Record multiple events
      for (let i = 0; i < 5; i++) {
        const eventId = await auditTrail.recordEvent({
          eventType: 'SECURITY_TEST',
          severity: 'LOW',
          userId: 'audit-test-user',
          sessionId: `audit-session-${i}`,
          description: `Security test event ${i}`,
          resource: '/api/test',
          action: 'POST',
          outcome: 'SUCCESS',
          ipAddress: '127.0.0.1',
          userAgent: 'audit-test-agent',
          data: { testIndex: i },
          complianceFlags: ['AUDIT_TEST'],
        });

        testEvents.push(eventId);
      }

      // Verify all events were recorded
      expect(testEvents).toHaveLength(5);
      testEvents.forEach(eventId => {
        expect(eventId).toBeDefined();
        expect(typeof eventId).toBe('string');
      });

      // Verify audit integrity
      const auditQuery = await auditTrail.getEvents({
        userId: 'audit-test-user',
        startTime: new Date(Date.now() - 60000),
        endTime: new Date(),
        verifyIntegrity: true,
      });

      expect(auditQuery.events.length).toBeGreaterThanOrEqual(5);
      expect(auditQuery.integrityStatus).toBe('VERIFIED');
    });
  });

  describe('📊 System Health', () => {
    it('should handle concurrent requests efficiently', async () => {
      const concurrency = 20;
      const benchmark = new SimpleBenchmark();

      const promises = Array.from({ length: concurrency }, (_, i) =>
        benchmark.measure(async () => {
          const validTaskRequest = {
            name: `Concurrent Task ${i}`,
            description: 'Concurrent request test',
            actions: [
              {
                type: BrowserActionType.NAVIGATE,
                url: `https://example.com/concurrent/${i}`,
              },
            ],
          };

          return await validator.validateBrowserTaskRequest(validTaskRequest, {
            trustLevel: 'MEDIUM' as const,
            permissions: ['browser:task:create'],
          });
        })
      );

      await Promise.all(promises);

      const stats = benchmark.getStats();
      logger.log(`\n⚡ Concurrent Request Performance:`);
      logger.log(`   Requests: ${stats.count}`);
      logger.log(`   P95: ${stats.p95.toFixed(2)}ms`);

      // Performance should not degrade significantly under concurrency
      expect(stats.p95).toBeLessThan(1000);
    });

    it('should not have memory leaks during extended operation', async () => {
      const initialMemory = process.memoryUsage();
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        await validator.validateBrowserTaskRequest(
          {
            name: `Memory Test ${i}`,
            description: 'Memory leak test',
            actions: [
              {
                type: BrowserActionType.NAVIGATE,
                url: 'https://example.com/memory-test',
              },
            ],
          },
          {
            trustLevel: 'MEDIUM' as const,
            permissions: ['browser:task:create'],
          }
        );

        // Force garbage collection periodically
        if (i % 20 === 0 && global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage();
      const heapIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const heapIncreaseMB = heapIncrease / 1024 / 1024;

      logger.log(`\n💾 Memory Usage Analysis:`);
      logger.log(`   Heap increase: ${heapIncreaseMB.toFixed(1)}MB`);
      logger.log(`   Per operation: ${(heapIncreaseMB / iterations * 1024).toFixed(1)}KB`);

      // Memory increase should be reasonable
      expect(heapIncreaseMB).toBeLessThan(50); // Less than 50MB increase
    });
  });
});