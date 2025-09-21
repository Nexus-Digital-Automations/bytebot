/**
 * Security Framework Validation Test
 *
 * Minimal test to verify the security framework components are working
 * and can meet basic performance requirements.
 *
 * @author Security Validation Team
 */

import { Test, TestingModule } from '@nestjs/testing';import { Logger } from '@nestjs/common';// Security components (individual imports to avoid module issues)import { BrowserRequestValidatorService } from '../../validators/browser-request-validator.service';import { BrowserRateLimiterService } from '../../rate-limiters/browser-rate-limiter.service';import { BrowserAuditTrailService, BrowserAuditEventType, AuditEventSeverity } from '../../audit/browser-audit-trail.service';// DTOs and enumsimport { BrowserActionType } from '../../dto/browser-task.dto';describe('Security Framework Validation', () => {let module: TestingModule;let validator: BrowserRequestValidatorService;
  let rateLimiter: BrowserRateLimiterService;
  let auditTrail: BrowserAuditTrailService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [
        BrowserRequestValidatorService,
        BrowserRateLimiterService,
        BrowserAuditTrailService,
      ],
    }).compile();

    validator = module.get<BrowserRequestValidatorService>(BrowserRequestValidatorService);
    rateLimiter = module.get<BrowserRateLimiterService>(BrowserRateLimiterService);
    auditTrail = module.get<BrowserAuditTrailService>(BrowserAuditTrailService);
  });

  afterAll(async () => {
    await module.close();
  });

  describe('🔒 Security Framework Components', () => {it('should instantiate all security services successfully', () => {expect(validator).toBeDefined();expect(rateLimiter).toBeDefined();
      expect(auditTrail).toBeDefined();
    });

    it('should validate legitimate browser task requests', async () => {const validTask = {name: 'Test Browser Task',description: 'A legitimate browser automation task',actions: [{
            type: BrowserActionType.NAVIGATE,
            url: 'https://example.com',},{
            type: BrowserActionType.CLICK,
            selector: '.submit-button',},],
      };

      const userContext = {
        userId: 'test-user',role: 'USER',permissions: ['browser:task:create'],trustLevel: 'MEDIUM' as const,};const securityContext = {
        ipAddress: '127.0.0.1',userAgent: 'test-agent',sessionId: 'test-session',
        timestamp: new Date(),
      };

      const startTime = performance.now();
      const result = await validator.validateBrowserTaskRequest(
        validTask,
        userContext,
        securityContext
      );
      const duration = performance.now() - startTime;

      expect(result).toBeDefined();
      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(duration).toBeLessThan(1000); // Should be fast

      console.log(`✅ Validation completed in ${duration.toFixed(2)}ms`);
    });

    it('should detect malicious requests', async () => {
      const maliciousTask = {
        name: ""; DROP TABLE users; --",
        description: '<script>alert("XSS")</script>",actions: [
          {
            type: BrowserActionType.TYPE,
            selector: '.input',text: '<img src="x" onerror="eval(atob(\'YWxlcnQoXCJYU1NcIik=\'))" />",},
        ],
      };

      const userContext = {
        userId: 'test-user',role: 'USER',permissions: ['browser:task:create'],trustLevel: 'LOW' as const,};const securityContext = {
        ipAddress: '127.0.0.1',userAgent: 'test-agent',sessionId: 'test-session',timestamp: new Date(),};

      const result = await validator.validateBrowserTaskRequest(
        maliciousTask,
        userContext,
        securityContext
      );

      expect(result).toBeDefined();
      expect(result.valid).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);

      // Should detect SQL injection and XSS
      const violationTypes = result.violations.map(v => v.type);
      expect(violationTypes).toContain('SQL_INJECTION');expect(violationTypes).toContain('XSS_ATTACK');

      console.log(`🛡️ Detected ${result.violations.length} security violations`);
    });

    it('should handle rate limiting correctly', async () => {const rateLimitContext = {userId: 'rate-test-user',ipAddress: '127.0.0.1',endpoint: '/api/browser/task',operation: {type: 'create_task',resourceIntensive: false,},
        user: {
          userId: 'rate-test-user',role: 'USER',permissions: ['browser:task:create'],trustLevel: 'MEDIUM' as const,},session: {
          sessionId: 'rate-test-session',createdAt: new Date(),lastActivity: new Date(),
        },
        security: {
          ipAddress: '127.0.0.1',userAgent: 'test-agent',sessionId: 'rate-test-session',timestamp: new Date(),},
        environment: {
          timestamp: new Date(),
          source: 'test',
        },
      };

      // Test multiple rapid requests
      const results = [];
      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();
        const result = await rateLimiter.evaluateRateLimit(rateLimitContext);
        const duration = performance.now() - startTime;

        results.push({ result, duration });

        expect(duration).toBeLessThan(100); // Rate limiting should be very fast
      }

      // At least the first few should be allowed
      const allowedCount = results.filter(r => r.result.allowed).length;
      expect(allowedCount).toBeGreaterThan(0);

      const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
      console.log(`⚡ Rate limiting average: ${avgDuration.toFixed(2)}ms`);
    });

    it('should record audit events successfully', async () => {const startTime = performance.now();const eventId = await auditTrail.recordEvent({
        eventType: BrowserAuditEventType.BROWSER_TASK_CREATED,
        severity: AuditEventSeverity.MEDIUM,
        userId: 'audit-test-user',sessionId: 'audit-test-session',description: 'Test audit event for security framework validation',resource: '/api/browser/task',action: 'POST',outcome: 'SUCCESS',ipAddress: '127.0.0.1',userAgent: 'test-agent',data: { test: true, framework: 'security-validation' },complianceFlags: ['TEST', 'VALIDATION'],});const duration = performance.now() - startTime;

      expect(eventId).toBeDefined();
      expect(typeof eventId).toBe('string');
      expect(duration).toBeLessThan(500); // Audit should be reasonably fast

      console.log(`📝 Audit recorded in ${duration.toFixed(2)}ms`);
    });

    it('should meet overall performance requirements', async () => {console.log('\n🚀 COMPREHENSIVE PERFORMANCE TEST');console.log('='.repeat(50));

      const iterations = 20;
      const timings: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const overallStart = performance.now();

        // 1. Validation
        const validationStart = performance.now();
        const validationResult = await validator.validateBrowserTaskRequest(
          {
            name: `Performance Test ${i}`,
            description: 'Performance testing task',actions: [{
                type: BrowserActionType.NAVIGATE,
                url: 'https://example.com/perf-test',},{
                type: BrowserActionType.CLICK,
                selector: '.test-element',},],
          },
          {
            userId: 'perf-test-user',role: 'USER',permissions: ['browser:task:create'],trustLevel: 'MEDIUM' as const,},{
            ipAddress: '127.0.0.1',userAgent: 'perf-test-agent',sessionId: 'perf-test-session',
            timestamp: new Date(),
          }
        );
        const validationTime = performance.now() - validationStart;

        // 2. Rate limiting
        const rateLimitStart = performance.now();
        const rateLimitResult = await rateLimiter.evaluateRateLimit({
          userId: `perf-user-${i % 5}`, // 5 different users
          ipAddress: '127.0.0.1',endpoint: '/api/browser/task',operation: {type: 'create_task',
            resourceIntensive: false,
          },
          user: {
            userId: `perf-user-${i % 5}`,
            role: 'USER',permissions: ['browser:task:create'],trustLevel: 'MEDIUM' as const,
          },
          session: {
            sessionId: `perf-session-${i}`,
            createdAt: new Date(),
            lastActivity: new Date(),
          },
          security: {
            ipAddress: '127.0.0.1',userAgent: 'perf-test-agent',
            sessionId: `perf-session-${i}`,
            timestamp: new Date(),
          },
          environment: {
            timestamp: new Date(),
            source: 'performance-test',
          },
        });
        const rateLimitTime = performance.now() - rateLimitStart;

        // 3. Audit
        const auditStart = performance.now();
        await auditTrail.recordEvent({
          eventType: BrowserAuditEventType.BROWSER_TASK_CREATED,
          severity: AuditEventSeverity.LOW,
          userId: `perf-user-${i % 5}`,sessionId: `perf-session-${i}`,description: `Performance test iteration ${i}`,
          resource: '/api/browser/task',action: 'POST',outcome: validationResult.valid && rateLimitResult.allowed ? 'SUCCESS' : 'FAILURE',ipAddress: '127.0.0.1',userAgent: 'perf-test-agent',data: { iteration: i, validationTime, rateLimitTime },complianceFlags: ['PERFORMANCE_TEST'],
        });
        const auditTime = performance.now() - auditStart;

        const totalTime = performance.now() - overallStart;
        timings.push(totalTime);

        if (i % 5 === 0) {
          console.log(`  Iteration ${i}: ${totalTime.toFixed(1)}ms (val: ${validationTime.toFixed(1)}ms, rate: ${rateLimitTime.toFixed(1)}ms, audit: ${auditTime.toFixed(1)}ms)`);
        }
      }

      // Calculate statistics
      const sortedTimings = [...timings].sort((a, b) => a - b);
      const average = timings.reduce((sum, time) => sum + time, 0) / timings.length;
      const p95Index = Math.ceil(timings.length * 0.95) - 1;
      const p95 = sortedTimings[p95Index];
      const min = Math.min(...timings);
      const max = Math.max(...timings);

      console.log('\n📊 PERFORMANCE RESULTS:');
      console.log(`   Iterations: ${iterations}`);console.log(`   Average: ${average.toFixed(2)}ms`);console.log(`   P95: ${p95.toFixed(2)}ms`);console.log(`   Range: ${min.toFixed(2)}ms - ${max.toFixed(2)}ms`);// CRITICAL ASSERTIONSexpect(p95).toBeLessThan(1000); // Main requirement: P95 < 1000ms
      expect(average).toBeLessThan(500); // Average should be much faster

      console.log(`\n✅ P95 REQUIREMENT MET: ${p95.toFixed(2)}ms < 1000ms`);
      console.log('='.repeat(50));}, 30000); // 30 second timeout});

  describe('🔍 Integration Health Check', () => {it('should demonstrate security framework is fully operational', async () => {const healthCheck = {validator: false,
        rateLimiter: false,
        auditTrail: false,
        performance: false,
      };

      try {
        // Test validator
        const validationResult = await validator.validateBrowserTaskRequest(
          {
            name: 'Health Check Task',description: 'Testing validator functionality',actions: [{ type: BrowserActionType.NAVIGATE, url: 'https://example.com' }],},{
            userId: 'health-check-user',role: 'USER',permissions: ['browser:task:create'],trustLevel: 'MEDIUM' as const,},{
            ipAddress: '127.0.0.1',userAgent: 'health-check-agent',sessionId: 'health-check-session',timestamp: new Date(),}
        );
        healthCheck.validator = validationResult.valid;

        // Test rate limiter
        const rateLimitResult = await rateLimiter.evaluateRateLimit({
          userId: 'health-check-user',ipAddress: '127.0.0.1',endpoint: '/api/browser/task',operation: { type: 'create_task', resourceIntensive: false },user: {userId: 'health-check-user',role: 'USER',permissions: ['browser:task:create'],trustLevel: 'MEDIUM' as const,},session: {
            sessionId: 'health-check-session',createdAt: new Date(),lastActivity: new Date(),
          },
          security: {
            ipAddress: '127.0.0.1',userAgent: 'health-check-agent',sessionId: 'health-check-session',timestamp: new Date(),},
          environment: {
            timestamp: new Date(),
            source: 'health-check',},});
        healthCheck.rateLimiter = rateLimitResult.allowed;

        // Test audit trail
        const eventId = await auditTrail.recordEvent({
          eventType: BrowserAuditEventType.SYSTEM_HEALTH_CHECK,
          severity: AuditEventSeverity.INFO,
          userId: 'health-check-user',sessionId: 'health-check-session',description: 'Security framework health check completed',resource: '/api/health',action: 'GET',outcome: 'SUCCESS',ipAddress: '127.0.0.1',userAgent: 'health-check-agent',data: healthCheck,complianceFlags: ['HEALTH_CHECK'],});healthCheck.auditTrail = !!eventId;

        // Performance check
        const perfStart = performance.now();
        await Promise.all([
          validator.validateBrowserTaskRequest(
            {
              name: 'Perf Check',description: 'Performance validation',actions: [{ type: BrowserActionType.NAVIGATE, url: 'https://example.com' }],},{
              userId: 'perf-check-user',role: 'USER',permissions: ['browser:task:create'],trustLevel: 'MEDIUM' as const,},{
              ipAddress: '127.0.0.1',userAgent: 'perf-check-agent',sessionId: 'perf-check-session',timestamp: new Date(),}
          ),
          rateLimiter.evaluateRateLimit({
            userId: 'perf-check-user',ipAddress: '127.0.0.1',endpoint: '/api/browser/task',operation: { type: 'create_task', resourceIntensive: false },user: {userId: 'perf-check-user',role: 'USER',permissions: ['browser:task:create'],trustLevel: 'MEDIUM' as const,},session: {
              sessionId: 'perf-check-session',createdAt: new Date(),lastActivity: new Date(),
            },
            security: {
              ipAddress: '127.0.0.1',userAgent: 'perf-check-agent',sessionId: 'perf-check-session',timestamp: new Date(),},
            environment: {
              timestamp: new Date(),
              source: 'perf-check',},}),
        ]);
        const perfTime = performance.now() - perfStart;
        healthCheck.performance = perfTime < 200; // Should be very fast when concurrent

        console.log('\n🏥 SECURITY FRAMEWORK HEALTH CHECK:');
        console.log(`   ✅ Validator: ${healthCheck.validator ? 'HEALTHY' : 'FAILED'}`);console.log(`   ✅ Rate Limiter: ${healthCheck.rateLimiter ? 'HEALTHY' : 'FAILED'}`);console.log(`   ✅ Audit Trail: ${healthCheck.auditTrail ? 'HEALTHY' : 'FAILED'}`);console.log(`   ✅ Performance: ${healthCheck.performance ? 'HEALTHY' : 'FAILED'} (${perfTime.toFixed(1)}ms)`);

        // All components should be healthy
        expect(healthCheck.validator).toBe(true);
        expect(healthCheck.rateLimiter).toBe(true);
        expect(healthCheck.auditTrail).toBe(true);
        expect(healthCheck.performance).toBe(true);

        console.log('\n🎉 SECURITY FRAMEWORK IS FULLY OPERATIONAL!');} catch (error) {console.error('Health check failed:', error);
        throw error;
      }
    });
  });
});