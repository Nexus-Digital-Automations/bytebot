/**
 * Tracing Service Comprehensive Unit Tests
 * Tests distributed tracing, span management, and OpenTelemetry integration
 *
 * @author Claude Code - Testing & Quality Assurance Specialist
 * @version 2.0.0
 */

import { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  TracingService,
  TraceSpan,
  TraceContext,
  TracingConfig,
} from '../tracing.service';
import { MetricsService } from '../../metrics/metrics.service';

describe('TracingService', () => {
  let service: TracingService;
  let configService: jest.Mocked<ConfigService>;
  let metricsService: jest.Mocked<MetricsService>;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn(),
    };

    const mockMetricsService = {
      recordTracingSpan: jest.fn(),
      recordTracingError: jest.fn(),
      recordLogEvent: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TracingService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: MetricsService,
          useValue: mockMetricsService,
        },
      ],
    }).compile();

    service = module.get<TracingService>(TracingService);
    configService = module.get(ConfigService);
    metricsService = module.get(MetricsService);

    // Setup default config values
    configService.get.mockImplementation((key: string, defaultValue?: any) => {
      const mockValues = {
        TRACING_ENABLED: true,
        SERVICE_NAME: 'bytebot-agent-test',
        JAEGER_ENDPOINT: 'http://localhost:14268/api/traces',
        TRACING_SAMPLE_RATE: 0.1,
        TRACING_INSTRUMENTATIONS: 'http,express,nestjs',
        TRACING_EXPORT_TIMEOUT: 30000,
        TRACING_MAX_SPANS: 1000,
      };
      return mockValues[key] || defaultValue;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined and properly initialized', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(TracingService);
    });

    it('should initialize configuration correctly', () => {
      const config = service.getConfiguration();

      expect(config.enabled).toBe(true);
      expect(config.serviceName).toBe('bytebot-agent-test');
      expect(config.jaegerEndpoint).toBe('http://localhost:14268/api/traces');
      expect(config.sampleRate).toBe(0.1);
      expect(config.exportTimeout).toBe(30000);
      expect(config.maxSpansPerTrace).toBe(1000);
      expect(config.instrumentations).toEqual(['http', 'express', 'nestjs']);
    });

    it('should use default values when config is missing', () => {
      configService.get.mockReturnValue(undefined);

      // Create new service instance to test defaults
      const defaultService = new TracingService(configService, metricsService);
      const config = defaultService.getConfiguration();

      expect(config.enabled).toBe(false); // Default is false
      expect(config.serviceName).toBe('bytebot-agent'); // Default service name
      expect(config.sampleRate).toBe(0.1); // Default sample rate
    });

    it('should initialize tracing when enabled', async () => {
      await service.onModuleInit();

      expect(metricsService.recordTracingSpan).toHaveBeenCalledWith(
        'bytebot-agent-test',
        'tracing_initialization',
        'success',
      );

      expect(service.isTracingEnabled()).toBe(true);
    });

    it('should skip initialization when tracing is disabled', async () => {
      configService.get.mockImplementation(
        (key: string, defaultValue?: any) => {
          if (key === 'TRACING_ENABLED') return false;
          return defaultValue;
        },
      );

      const disabledService = new TracingService(configService, metricsService);
      await disabledService.onModuleInit();

      expect(disabledService.isTracingEnabled()).toBe(false);
    });

    it('should handle initialization errors gracefully', async () => {
      // Mock metrics service to throw error
      metricsService.recordTracingSpan.mockImplementation(() => {
        throw new Error('Metrics service unavailable');
      });

      await expect(service.onModuleInit()).rejects.toThrow(
        'Metrics service unavailable',
      );

      expect(metricsService.recordTracingError).toHaveBeenCalledWith(
        'bytebot-agent-test',
        'initialization_error',
      );
    });
  });

  describe('Span Creation and Management', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should create spans successfully', () => {
      const span = service.startSpan('test-operation', undefined, {
        'custom.tag': 'test-value',
        'span.kind': 'server',
      });

      expect(span).toBeDefined();
      expect(span.spanId).toMatch(/^span_\d+_[\w]+$/);
      expect(span.traceId).toMatch(/^trace_\d+_[\w]+$/);
      expect(span.operationName).toBe('test-operation');
      expect(span.serviceName).toBe('bytebot-agent-test');
      expect(span.status).toBe('started');
      expect(span.tags['custom.tag']).toBe('test-value');
      expect(span.tags['span.kind']).toBe('server');
      expect(span.tags['service.name']).toBe('bytebot-agent-test');
      expect(span.startTime).toBeGreaterThan(0);
      expect(span.logs).toEqual([]);
    });

    it('should create child spans with parent context', () => {
      const parentSpan = service.startSpan('parent-operation');
      const parentContext: TraceContext = {
        traceId: parentSpan.traceId,
        spanId: parentSpan.spanId,
      };

      const childSpan = service.startSpan('child-operation', parentContext, {
        'child.tag': 'value',
      });

      expect(childSpan.traceId).toBe(parentSpan.traceId);
      expect(childSpan.parentSpanId).toBe(parentSpan.spanId);
      expect(childSpan.spanId).not.toBe(parentSpan.spanId);
      expect(childSpan.tags['child.tag']).toBe('value');
    });

    it('should record metrics when creating spans', () => {
      service.startSpan('metrics-test-operation');

      expect(metricsService.recordTracingSpan).toHaveBeenCalledWith(
        'bytebot-agent-test',
        'metrics-test-operation',
        'success',
      );
    });

    it('should store spans in trace storage', () => {
      const span1 = service.startSpan('operation-1');
      const span2 = service.startSpan('operation-2', {
        traceId: span1.traceId,
        spanId: span1.spanId,
      });

      const trace = service.getTrace(span1.traceId);
      expect(trace).toHaveLength(2);
      expect(trace?.find((s) => s.spanId === span1.spanId)).toBeDefined();
      expect(trace?.find((s) => s.spanId === span2.spanId)).toBeDefined();
    });

    it('should track active spans', () => {
      const span1 = service.startSpan('active-1');
      const span2 = service.startSpan('active-2');

      const activeSpans = service.getActiveSpans();
      expect(activeSpans).toHaveLength(2);
      expect(activeSpans.find((s) => s.spanId === span1.spanId)).toBeDefined();
      expect(activeSpans.find((s) => s.spanId === span2.spanId)).toBeDefined();
    });

    it('should set default span kind when not provided', () => {
      const span = service.startSpan('default-kind-test');
      expect(span.tags['span.kind']).toBe('internal');
    });

    it('should generate unique span and trace IDs', () => {
      const spans = Array.from({ length: 10 }, () =>
        service.startSpan('unique-test'),
      );

      const spanIds = spans.map((s) => s.spanId);
      const traceIds = spans.map((s) => s.traceId);

      expect(new Set(spanIds).size).toBe(10); // All span IDs should be unique
      expect(new Set(traceIds).size).toBe(10); // All trace IDs should be unique
    });
  });

  describe('Span Completion', () => {
    let testSpan: TraceSpan;

    beforeEach(async () => {
      await service.onModuleInit();
      testSpan = service.startSpan('completion-test', undefined, {
        test: 'completion',
      });
    });

    it('should finish spans successfully', () => {
      const finishTime = Date.now();
      service.finishSpan(testSpan.spanId, { 'final.tag': 'finished' });

      // Should no longer be in active spans
      const activeSpans = service.getActiveSpans();
      expect(
        activeSpans.find((s) => s.spanId === testSpan.spanId),
      ).toBeUndefined();

      // Should still be accessible in trace
      const trace = service.getTrace(testSpan.traceId);
      const finishedSpan = trace?.find((s) => s.spanId === testSpan.spanId);

      expect(finishedSpan).toBeDefined();
      expect(finishedSpan?.status).toBe('finished');
      expect(finishedSpan?.endTime).toBeGreaterThanOrEqual(finishTime);
      expect(finishedSpan?.duration).toBeGreaterThan(0);
      expect(finishedSpan?.tags['final.tag']).toBe('finished');
      expect(finishedSpan?.logs.length).toBeGreaterThan(0);
    });

    it('should handle finishing non-existent spans gracefully', () => {
      expect(() => {
        service.finishSpan('non-existent-span-id');
      }).not.toThrow();
    });

    it('should add completion log when finishing spans', () => {
      service.finishSpan(testSpan.spanId);

      const trace = service.getTrace(testSpan.traceId);
      const finishedSpan = trace?.find((s) => s.spanId === testSpan.spanId);
      const completionLog = finishedSpan?.logs.find(
        (log) => log.message === 'Span completed',
      );

      expect(completionLog).toBeDefined();
      expect(completionLog?.level).toBe('info');
      expect(completionLog?.fields?.operationName).toBe('completion-test');
    });

    it('should calculate span duration correctly', () => {
      const startTime = Date.now();
      const span = service.startSpan('duration-test');

      // Simulate some processing time
      const processingTime = 50;
      setTimeout(() => {
        service.finishSpan(span.spanId);
      }, processingTime);

      // Wait for async completion
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const trace = service.getTrace(span.traceId);
          const finishedSpan = trace?.find((s) => s.spanId === span.spanId);

          expect(finishedSpan?.duration).toBeGreaterThanOrEqual(
            processingTime - 10,
          ); // Allow some variance
          resolve();
        }, processingTime + 20);
      });
    });
  });

  describe('Error Handling in Spans', () => {
    let testSpan: TraceSpan;

    beforeEach(async () => {
      await service.onModuleInit();
      testSpan = service.startSpan('error-test', undefined, { test: 'error' });
    });

    it('should mark spans as error with Error objects', () => {
      const error = new Error('Test error message');
      error.stack = 'Test stack trace';

      service.setSpanError(testSpan.spanId, error, { 'error.context': 'test' });

      const trace = service.getTrace(testSpan.traceId);
      const errorSpan = trace?.find((s) => s.spanId === testSpan.spanId);

      expect(errorSpan?.status).toBe('error');
      expect(errorSpan?.tags.error).toBe(true);
      expect(errorSpan?.tags['error.kind']).toBe('Error');
      expect(errorSpan?.tags['error.message']).toBe('Test error message');
      expect(errorSpan?.tags['error.stack']).toBe('Test stack trace');
      expect(errorSpan?.tags['error.context']).toBe('test');
    });

    it('should mark spans as error with string errors', () => {
      service.setSpanError(testSpan.spanId, 'String error message');

      const trace = service.getTrace(testSpan.traceId);
      const errorSpan = trace?.find((s) => s.spanId === testSpan.spanId);

      expect(errorSpan?.status).toBe('error');
      expect(errorSpan?.tags.error).toBe(true);
      expect(errorSpan?.tags['error.kind']).toBe('string');
      expect(errorSpan?.tags['error.message']).toBe('String error message');
      expect(errorSpan?.tags['error.stack']).toBeUndefined();
    });

    it('should add error logs when marking spans as error', () => {
      const errorMessage = 'Test error for logging';
      service.setSpanError(testSpan.spanId, errorMessage);

      const trace = service.getTrace(testSpan.traceId);
      const errorSpan = trace?.find((s) => s.spanId === testSpan.spanId);
      const errorLog = errorSpan?.logs.find(
        (log) => log.message === errorMessage && log.level === 'error',
      );

      expect(errorLog).toBeDefined();
      expect(errorLog?.fields?.error).toBe(true);
      expect(errorLog?.fields?.errorType).toBe('string');
    });

    it('should record error metrics when marking spans as error', () => {
      const error = new TypeError('Type error for metrics test');
      service.setSpanError(testSpan.spanId, error);

      expect(metricsService.recordTracingError).toHaveBeenCalledWith(
        'bytebot-agent-test',
        'TypeError',
      );
    });

    it('should handle error marking on non-existent spans gracefully', () => {
      expect(() => {
        service.setSpanError('non-existent-span', new Error('Test'));
      }).not.toThrow();
    });
  });

  describe('Span Logging and Tagging', () => {
    let testSpan: TraceSpan;

    beforeEach(async () => {
      await service.onModuleInit();
      testSpan = service.startSpan('logging-test');
    });

    it('should add logs to spans', () => {
      service.addSpanLog(testSpan, 'info', 'Test log message', {
        custom: 'field',
        count: 42,
      });

      expect(testSpan.logs).toHaveLength(1);
      expect(testSpan.logs[0].level).toBe('info');
      expect(testSpan.logs[0].message).toBe('Test log message');
      expect(testSpan.logs[0].fields?.custom).toBe('field');
      expect(testSpan.logs[0].fields?.count).toBe(42);
      expect(testSpan.logs[0].timestamp).toBeGreaterThan(0);
    });

    it('should record log metrics when adding span logs', () => {
      service.addSpanLog(testSpan, 'warn', 'Warning message');

      expect(metricsService.recordLogEvent).toHaveBeenCalledWith(
        'warn',
        'tracing',
        testSpan.traceId,
      );
    });

    it('should support different log levels', () => {
      const levels = ['debug', 'info', 'warn', 'error'] as const;

      levels.forEach((level, index) => {
        service.addSpanLog(testSpan, level, `${level} message ${index}`);
      });

      expect(testSpan.logs).toHaveLength(4);
      levels.forEach((level, index) => {
        expect(testSpan.logs[index].level).toBe(level);
        expect(testSpan.logs[index].message).toBe(`${level} message ${index}`);
      });
    });

    it('should set span tags', () => {
      service.setSpanTag(testSpan.spanId, 'dynamic.tag', 'dynamic-value');
      service.setSpanTag(testSpan.spanId, 'number.tag', 123);
      service.setSpanTag(testSpan.spanId, 'boolean.tag', true);

      expect(testSpan.tags['dynamic.tag']).toBe('dynamic-value');
      expect(testSpan.tags['number.tag']).toBe('123'); // Converted to string
      expect(testSpan.tags['boolean.tag']).toBe('true'); // Converted to string
    });

    it('should handle setting tags on non-existent spans gracefully', () => {
      expect(() => {
        service.setSpanTag('non-existent-span', 'test.tag', 'value');
      }).not.toThrow();
    });
  });

  describe('Trace Context Management', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should create child contexts correctly', () => {
      const parentContext: TraceContext = {
        traceId: 'parent-trace-123',
        spanId: 'parent-span-456',
        baggage: { key1: 'value1', key2: 'value2' },
      };

      const childContext = service.createChildContext(
        parentContext,
        'child-span-789',
      );

      expect(childContext.traceId).toBe('parent-trace-123');
      expect(childContext.spanId).toBe('child-span-789');
      expect(childContext.baggage).toEqual({ key1: 'value1', key2: 'value2' });
    });

    it('should preserve baggage in child contexts', () => {
      const parentContext: TraceContext = {
        traceId: 'trace-123',
        spanId: 'span-456',
        baggage: { userId: 'user123', tenantId: 'tenant456' },
      };

      const childContext = service.createChildContext(
        parentContext,
        'child-span',
      );

      expect(childContext.baggage?.userId).toBe('user123');
      expect(childContext.baggage?.tenantId).toBe('tenant456');
    });

    it('should handle contexts without baggage', () => {
      const parentContext: TraceContext = {
        traceId: 'trace-123',
        spanId: 'span-456',
      };

      const childContext = service.createChildContext(
        parentContext,
        'child-span',
      );

      expect(childContext.baggage).toEqual({});
    });

    it('should return null for current trace context by default', () => {
      const currentContext = service.getCurrentTraceContext();
      expect(currentContext).toBeNull();
    });
  });

  describe('Trace Retrieval and Statistics', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should retrieve complete traces', () => {
      const parentSpan = service.startSpan('parent-operation');
      const childSpan1 = service.startSpan('child-1', {
        traceId: parentSpan.traceId,
        spanId: parentSpan.spanId,
      });
      const childSpan2 = service.startSpan('child-2', {
        traceId: parentSpan.traceId,
        spanId: parentSpan.spanId,
      });

      const trace = service.getTrace(parentSpan.traceId);

      expect(trace).toHaveLength(3);
      expect(trace?.find((s) => s.spanId === parentSpan.spanId)).toBeDefined();
      expect(trace?.find((s) => s.spanId === childSpan1.spanId)).toBeDefined();
      expect(trace?.find((s) => s.spanId === childSpan2.spanId)).toBeDefined();
    });

    it('should return null for non-existent traces', () => {
      const trace = service.getTrace('non-existent-trace-id');
      expect(trace).toBeNull();
    });

    it('should provide comprehensive tracing statistics', () => {
      // Create some test spans
      const span1 = service.startSpan('stats-test-1');
      const span2 = service.startSpan('stats-test-2');
      const span3 = service.startSpan('stats-test-3', {
        traceId: span1.traceId,
        spanId: span1.spanId,
      });

      // Mark one as error
      service.setSpanError(span2.spanId, 'Test error');

      // Finish one span
      service.finishSpan(span3.spanId);

      const stats = service.getTracingStats();

      expect(stats.activeSpans).toBe(2); // span1 and span2 still active
      expect(stats.totalTraces).toBe(2); // Two different traces
      expect(stats.totalSpans).toBe(3); // Three spans total
      expect(stats.errorSpans).toBe(1); // One error span
    });

    it('should track statistics across multiple traces', () => {
      // Create spans in different traces
      const trace1Spans = [
        service.startSpan('trace1-span1'),
        service.startSpan('trace1-span2'),
      ];
      const trace2Spans = [
        service.startSpan('trace2-span1'),
        service.startSpan('trace2-span2'),
        service.startSpan('trace2-span3'),
      ];

      // Mark some as errors
      service.setSpanError(trace1Spans[0].spanId, 'Error 1');
      service.setSpanError(trace2Spans[1].spanId, 'Error 2');

      const stats = service.getTracingStats();

      expect(stats.activeSpans).toBe(5);
      expect(stats.totalTraces).toBe(2);
      expect(stats.totalSpans).toBe(5);
      expect(stats.errorSpans).toBe(2);
    });
  });

  describe('Trace Cleanup and Memory Management', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should clean up old traces', () => {
      // Create some spans with manipulated timestamps
      const oldSpan = service.startSpan('old-operation');
      const newSpan = service.startSpan('new-operation');

      // Manually set old timestamp (simulate old trace)
      const trace = service.getTrace(oldSpan.traceId);
      if (trace) {
        trace[0].startTime = Date.now() - 7200000; // 2 hours ago
      }

      // Clean up traces older than 1 hour
      const cleanedCount = service.cleanupOldTraces(3600000); // 1 hour

      expect(cleanedCount).toBe(1);

      // Old trace should be gone
      expect(service.getTrace(oldSpan.traceId)).toBeNull();

      // New trace should still exist
      expect(service.getTrace(newSpan.traceId)).not.toBeNull();
    });

    it('should use default cleanup age when not specified', () => {
      const span = service.startSpan('cleanup-default-test');

      // Should not clean up recent traces with default age (1 hour)
      const cleanedCount = service.cleanupOldTraces();
      expect(cleanedCount).toBe(0);

      expect(service.getTrace(span.traceId)).not.toBeNull();
    });

    it('should handle cleanup with no old traces', () => {
      service.startSpan('recent-operation');

      const cleanedCount = service.cleanupOldTraces(100); // Very short age
      expect(cleanedCount).toBe(0); // No traces should be old enough
    });

    it('should handle cleanup with empty trace storage', () => {
      const cleanedCount = service.cleanupOldTraces();
      expect(cleanedCount).toBe(0);
    });
  });

  describe('Service Lifecycle Management', () => {
    it('should shutdown gracefully', async () => {
      await service.onModuleInit();

      // Create some active spans
      const span1 = service.startSpan('shutdown-test-1');
      const span2 = service.startSpan('shutdown-test-2');

      expect(service.getActiveSpans()).toHaveLength(2);

      await service.onModuleDestroy();

      // All active spans should be finished
      expect(service.getActiveSpans()).toHaveLength(0);

      // Traces should be cleared
      expect(service.getTrace(span1.traceId)).toBeNull();
      expect(service.getTrace(span2.traceId)).toBeNull();

      // Service should no longer be enabled
      expect(service.isTracingEnabled()).toBe(false);
    });

    it('should handle shutdown errors gracefully', async () => {
      await service.onModuleInit();

      // Mock an error during span finishing
      const originalFinishSpan = service.finishSpan;
      service.finishSpan = jest.fn().mockImplementation(() => {
        throw new Error('Finish span error');
      });

      // Should not throw during shutdown
      await expect(service.onModuleDestroy()).resolves.not.toThrow();

      // Restore original method
      service.finishSpan = originalFinishSpan;
    });

    it('should handle shutdown when not initialized', async () => {
      // Don't initialize, just shutdown
      await expect(service.onModuleDestroy()).resolves.not.toThrow();
    });
  });

  describe('Configuration Management', () => {
    it('should return configuration safely', () => {
      const config1 = service.getConfiguration();
      const config2 = service.getConfiguration();

      // Should return copies, not the same object
      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);

      // Modifying returned config should not affect service
      config1.enabled = false;
      expect(service.getConfiguration().enabled).toBe(true);
    });

    it('should correctly report tracing enabled status', async () => {
      // Before initialization
      expect(service.isTracingEnabled()).toBe(false);

      // After initialization with enabled config
      await service.onModuleInit();
      expect(service.isTracingEnabled()).toBe(true);

      // After shutdown
      await service.onModuleDestroy();
      expect(service.isTracingEnabled()).toBe(false);
    });

    it('should handle disabled tracing configuration', () => {
      configService.get.mockImplementation(
        (key: string, defaultValue?: any) => {
          if (key === 'TRACING_ENABLED') return false;
          return defaultValue;
        },
      );

      const disabledService = new TracingService(configService, metricsService);
      expect(disabledService.isTracingEnabled()).toBe(false);
    });
  });

  describe('Performance and Scalability', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should handle large numbers of spans efficiently', () => {
      const startTime = Date.now();
      const spanCount = 1000;

      // Create many spans
      const spans = Array.from({ length: spanCount }, (_, i) =>
        service.startSpan(`performance-test-${i}`),
      );

      const creationTime = Date.now() - startTime;

      // Should complete within reasonable time
      expect(creationTime).toBeLessThan(1000); // 1 second

      expect(service.getActiveSpans()).toHaveLength(spanCount);

      // Finish all spans
      const finishStartTime = Date.now();
      spans.forEach((span) => service.finishSpan(span.spanId));
      const finishTime = Date.now() - finishStartTime;

      expect(finishTime).toBeLessThan(1000); // 1 second
      expect(service.getActiveSpans()).toHaveLength(0);
    });

    it('should handle concurrent span operations', async () => {
      const concurrentOperations = 100;

      const promises = Array.from(
        { length: concurrentOperations },
        async (_, i) => {
          const span = service.startSpan(`concurrent-test-${i}`);

          // Simulate some async work
          await new Promise((resolve) =>
            setTimeout(resolve, Math.random() * 10),
          );

          service.setSpanTag(span.spanId, 'iteration', i.toString());
          service.addSpanLog(span, 'info', `Concurrent operation ${i}`);
          service.finishSpan(span.spanId);

          return span.spanId;
        },
      );

      const completedSpanIds = await Promise.all(promises);

      expect(completedSpanIds).toHaveLength(concurrentOperations);
      expect(new Set(completedSpanIds).size).toBe(concurrentOperations); // All unique

      // All spans should be finished
      expect(service.getActiveSpans()).toHaveLength(0);
    });

    it('should maintain trace relationships under load', () => {
      const traceCount = 10;
      const spansPerTrace = 50;

      const traceData: { traceId: string; spanIds: string[] }[] = [];

      // Create multiple traces with many spans each
      for (let t = 0; t < traceCount; t++) {
        const rootSpan = service.startSpan(`trace-${t}-root`);
        const spanIds = [rootSpan.spanId];

        for (let s = 1; s < spansPerTrace; s++) {
          const childSpan = service.startSpan(`trace-${t}-span-${s}`, {
            traceId: rootSpan.traceId,
            spanId: rootSpan.spanId,
          });
          spanIds.push(childSpan.spanId);
        }

        traceData.push({ traceId: rootSpan.traceId, spanIds });
      }

      // Verify all traces have correct number of spans
      traceData.forEach(({ traceId, spanIds }) => {
        const trace = service.getTrace(traceId);
        expect(trace).toHaveLength(spansPerTrace);

        // Verify all spans are in the trace
        spanIds.forEach((spanId) => {
          expect(trace?.find((s) => s.spanId === spanId)).toBeDefined();
        });
      });

      const stats = service.getTracingStats();
      expect(stats.totalTraces).toBe(traceCount);
      expect(stats.totalSpans).toBe(traceCount * spansPerTrace);
    });
  });

  describe('Error Conditions and Edge Cases', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should handle malformed configuration gracefully', () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'TRACING_INSTRUMENTATIONS') return 'malformed,data,';
        if (key === 'TRACING_SAMPLE_RATE') return 'not-a-number';
        if (key === 'TRACING_MAX_SPANS') return -1;
        return undefined;
      });

      const malformedService = new TracingService(
        configService,
        metricsService,
      );
      const config = malformedService.getConfiguration();

      // Should handle malformed values gracefully
      expect(Array.isArray(config.instrumentations)).toBe(true);
      expect(typeof config.sampleRate).toBe('number');
      expect(typeof config.maxSpansPerTrace).toBe('number');
    });

    it('should handle empty operation names', () => {
      const span = service.startSpan('');
      expect(span.operationName).toBe('');
      expect(span.spanId).toBeDefined();
    });

    it('should handle null/undefined values in tags and logs', () => {
      const span = service.startSpan('null-test');

      service.setSpanTag(span.spanId, 'null-tag', null);
      service.setSpanTag(span.spanId, 'undefined-tag', undefined);

      service.addSpanLog(span, 'info', 'null-test', {
        nullField: null,
        undefinedField: undefined,
      });

      expect(span.tags['null-tag']).toBe('null');
      expect(span.tags['undefined-tag']).toBe('undefined');
      expect(span.logs[0].fields?.nullField).toBe(null);
      expect(span.logs[0].fields?.undefinedField).toBe(undefined);
    });

    it('should handle very long operation names and messages', () => {
      const longName = 'x'.repeat(1000);
      const longMessage = 'y'.repeat(5000);

      const span = service.startSpan(longName);
      service.addSpanLog(span, 'info', longMessage);

      expect(span.operationName).toBe(longName);
      expect(span.logs[0].message).toBe(longMessage);
    });

    it('should handle special characters in operation names', () => {
      const specialName = 'test/with:special|chars?and&symbols=value';
      const span = service.startSpan(specialName);

      expect(span.operationName).toBe(specialName);
    });

    it('should handle metrics service failures gracefully', () => {
      metricsService.recordTracingSpan.mockImplementation(() => {
        throw new Error('Metrics service down');
      });

      // Should not prevent span creation
      expect(() => {
        service.startSpan('metrics-failure-test');
      }).not.toThrow();
    });

    it('should handle export failures gracefully', () => {
      const span = service.startSpan('export-failure-test');

      // Mock configuration with invalid endpoint
      configService.get.mockImplementation(
        (key: string, defaultValue?: any) => {
          if (key === 'JAEGER_ENDPOINT') return 'invalid-endpoint';
          return defaultValue;
        },
      );

      // Should not throw when finishing span (which triggers export)
      expect(() => {
        service.finishSpan(span.spanId);
      }).not.toThrow();
    });
  });
});
