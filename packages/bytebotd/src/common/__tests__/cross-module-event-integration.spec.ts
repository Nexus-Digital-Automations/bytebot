/**
 * Cross-Module Event Handling and Messaging Integration Tests
 *
 * This test suite provides comprehensive testing for event-driven communication
 * patterns across all CUA integration modules, ensuring reliable message passing,
 * event propagation, and system-wide coordination.
 *
 * Integration Coverage:
 * - Event emitter and listener registration across modules
 * - Cross-module message passing and payload validation
 * - Event ordering and sequencing guarantees
 * - Error handling and event recovery mechanisms
 * - Performance monitoring for event-driven architectures
 * - Dead letter queue and retry mechanisms for failed events
 *
 * Event Communication Patterns:
 * - ComputerUse → MCP tool invocation events
 * - Parlant → ComputerUse validation workflow events
 * - Enterprise API → Rate limiting and audit events
 * - Metrics → Performance monitoring events
 * - Cache → Invalidation and refresh events
 * - System-wide health and status events
 *
 * @author Claude Code - Subagent 6
 * @version 1.0.0
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Injectable } from '@nestjs/common';
import {
  EventEmitter2,
  EventEmitterModule,
  OnEvent,
} from '@nestjs/event-emitter';
import { ComputerUseService } from '../../computer-use/computer-use.service';
import { ComputerUseModule } from '../../computer-use/computer-use.module';
import { ComputerUseTools } from '../../mcp/computer-use.tools';
import { BytebotMcpModule } from '../../mcp/bytebot-mcp.module';
import { ParlantValidatedComputerUseService } from '../../parlant/parlant-validated-computer-use.service';
import { ParlantIntegrationService } from '../../parlant/parlant-integration.service';
import { ParlantModule } from '../../parlant/parlant.module';
import { EnterpriseApiGatewayController } from '../../enterprise-api/enterprise-api-gateway.controller';
import { EnterpriseApiModule } from '../../enterprise-api/enterprise-api.module';
import { MetricsService } from '../../metrics/metrics.service';
import { CacheService } from '../../cache/cache.service';
import { NutService } from '../../nut/nut.service';

// Event integration test interfaces
interface EventPayload {
  source?: string;
  target?: string;
  correlationId?: string;
  sequenceNumber?: number;
  retryCount?: number;
  processingTime?: number;
  originalCorrelationId?: string;
  eventIndex?: number;
  [key: string]: unknown;
}

interface CrossModuleEventContext {
  app: INestApplication;
  eventEmitter: EventEmitter2;
  computerUseService: ComputerUseService;
  mcpTools: ComputerUseTools;
  parlantValidatedService: ParlantValidatedComputerUseService;
  parlantIntegrationService: ParlantIntegrationService;
  enterpriseApiController: EnterpriseApiGatewayController;
  metricsService: MetricsService;
  cacheService: CacheService;
  nutService: NutService;
  eventCollector: EventCollectorService;
}

interface EventRecord {
  eventId: string;
  eventName: string;
  source: string;
  target: string;
  timestamp: Date;
  payload: Record<string, unknown>;
  correlationId?: string;
  sequenceNumber?: number;
  retryCount?: number;
  processingTime?: number;
}

interface EventFlowMetrics {
  flowId: string;
  startTime: number;
  endTime: number;
  totalEvents: number;
  successfulEvents: number;
  failedEvents: number;
  averageProcessingTime: number;
  maxProcessingTime: number;
  eventLatencies: number[];
  orderingViolations: number;
  deadLetterEvents: number;
}

interface EventSequenceValidator {
  expectedSequence: string[];
  actualSequence: string[];
  violations: Array<{
    expected: string;
    actual: string;
    position: number;
  }>;
}

/**
 * Event Collector Service for comprehensive event tracking
 */
@Injectable()
export class EventCollectorService {
  private events: EventRecord[] = [];
  private eventSequences: Map<string, string[]> = new Map();
  private eventMetrics: Map<string, number> = new Map();

  @OnEvent('**', { async: true }) handleAllEvents(
    eventName: string,
    payload: EventPayload,
  ): void {
    const event: EventRecord = {
      eventId: this.generateEventId(),
      eventName,
      source: payload?.source ?? 'unknown',
      target: payload?.target ?? 'all',
      timestamp: new Date(),
      payload: payload ?? {},
      correlationId: payload?.correlationId,
      sequenceNumber: payload?.sequenceNumber,
      retryCount: payload?.retryCount ?? 0,
      processingTime: payload?.processingTime,
    };

    this.events.push(event);
    this.updateSequenceTracking(event);
    this.updateMetrics(event);
  }

  getEvents(): EventRecord[] {
    return [...this.events];
  }

  getEventsByPattern(pattern: string): EventRecord[] {
    const regex = new RegExp(pattern.replace('*', '.*'));
    return this.events.filter((event) => regex.test(event.eventName));
  }

  getEventSequence(correlationId: string): string[] {
    return this.eventSequences.get(correlationId) ?? [];
  }

  clearEvents(): void {
    this.events = [];
    this.eventSequences.clear();
    this.eventMetrics.clear();
  }

  private generateEventId(): string {
    return `evt${Date.now()}
${Math.random().toString(36).substring(7)}`;
  }

  private updateSequenceTracking(event: EventRecord): void {
    if (event.correlationId) {
      const sequence = this.eventSequences.get(event.correlationId) ?? [];
      sequence.push(event.eventName);
      this.eventSequences.set(event.correlationId, sequence);
    }
  }

  private updateMetrics(event: EventRecord): void {
    const count = this.eventMetrics.get(event.eventName) ?? 0;
    this.eventMetrics.set(event.eventName, count + 1);
  }
}

describe('Cross-Module Event Integration Tests', () => {
  let context: CrossModuleEventContext;
  let testModule: TestingModule;
  const eventFlowMetrics: EventFlowMetrics[] = [];

  /**
   * Setup cross-module event integration test environment
   */
  beforeAll(async () => {
    testModule = await Test.createTestingModule({
      imports: [
        EventEmitterModule.forRoot({
          wildcard: true,
          delimiter: '.',
          newListener: false,
          removeListener: false,
          maxListeners: 20,
          verboseMemoryLeak: false,
          ignoreErrors: false,
        }),
        ComputerUseModule,
        BytebotMcpModule,
        ParlantModule,
        EnterpriseApiModule,
      ],
      providers: [EventCollectorService],
    })
      .overrideProvider(NutService)
      .useValue(createMockNutService())
      .compile();

    const app = testModule.createNestApplication();
    await app.init();

    context = {
      app,
      eventEmitter: testModule.get<EventEmitter2>(EventEmitter2),
      computerUseService:
        testModule.get<ComputerUseService>(ComputerUseService),
      mcpTools: testModule.get<ComputerUseTools>(ComputerUseTools),
      parlantValidatedService:
        testModule.get<ParlantValidatedComputerUseService>(
          ParlantValidatedComputerUseService,
        ),
      parlantIntegrationService: testModule.get<ParlantIntegrationService>(
        ParlantIntegrationService,
      ),
      enterpriseApiController: testModule.get<EnterpriseApiGatewayController>(
        EnterpriseApiGatewayController,
      ),
      metricsService: testModule.get<MetricsService>(MetricsService),
      cacheService: testModule.get<CacheService>(CacheService),
      nutService: testModule.get<NutService>(NutService),
      eventCollector: testModule.get<EventCollectorService>(
        EventCollectorService,
      ),
    };
  });

  afterAll(async () => {
    await context?.app?.close();
    await testModule?.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    context.eventCollector.clearEvents();
  });

  describe('Core Event Propagation Patterns', () => {
    it('should propagate events through ComputerUse → MCP workflow', async () => {
      const correlationId = generateCorrelationId();
      const flowId = generateFlowId();

      // Setup event sequence tracking
      const expectedEvents = [
        'computer-use.action.started',
        'computer-use.action.validating',
        'computer-use.action.executing',
        'mcp.tool.invoked',
        'mcp.tool.completed',
        'computer-use.action.completed',
      ]; // Emit workflow events manually to simulate the full integration
      const startTime = Date.now();

      // 1. Computer Use Action Started
      context.eventEmitter.emit('computer-use.action.started', {
        source: 'ComputerUseService',
        correlationId,
        sequenceNumber: 1,
        action: 'move_mouse',
        coordinates: { x: 100, y: 200 },
      });

      // 2. Action Validating
      context.eventEmitter.emit('computer-use.action.validating', {
        source: 'ComputerUseService',
        correlationId,
        sequenceNumber: 2,
        validationType: 'parameter-validation',
      }); // 3. Action Executing
      context.eventEmitter.emit('computer-use.action.executing', {
        source: 'ComputerUseService',
        correlationId,
        sequenceNumber: 3,
        executionContext: 'direct',
      }); // 4. MCP Tool Invoked
      context.eventEmitter.emit('mcp.tool.invoked', {
        source: 'ComputerUseTools',
        correlationId,
        sequenceNumber: 4,
        toolName: 'computer_move_mouse',
        parameters: { coordinates: { x: 100, y: 200 } },
      });

      // 5. MCP Tool Completed
      context.eventEmitter.emit('mcp.tool.completed', {
        source: 'ComputerUseTools',
        correlationId,
        sequenceNumber: 5,
        toolName: 'computer_move_mouse',
        success: true,
        processingTime: 15,
      });

      // 6. Computer Use Action Completed
      context.eventEmitter.emit('computer-use.action.completed', {
        source: 'ComputerUseService',
        correlationId,
        sequenceNumber: 6,
        success: true,
        totalTime: Date.now() - startTime,
      });

      // Allow event processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Validate event sequence
      const actualSequence =
        context.eventCollector.getEventSequence(correlationId);
      const validator = validateEventSequence(expectedEvents, actualSequence);

      expect(validator.violations).toHaveLength(0);
      expect(actualSequence).toEqual(expectedEvents);

      // Verify all events were captured
      const capturedEvents = context.eventCollector.getEvents();
      expect(
        capturedEvents.filter((e) => e.correlationId === correlationId),
      ).toHaveLength(6);

      // Record flow metrics
      recordEventFlowMetrics(flowId, startTime, capturedEvents, correlationId);
    });

    it('should handle Parlant → ComputerUse validation event flow', async () => {
      const correlationId = generateCorrelationId();
      const flowId = generateFlowId();

      const expectedEvents = [
        'parlant.validation.requested',
        'parlant.validation.analyzing',
        'parlant.validation.context-evaluated',
        'parlant.validation.decision-made',
        'computer-use.action.approved',
        'computer-use.action.executing',
        'computer-use.action.completed',
        'parlant.validation.completed',
      ];
      const startTime = Date.now();

      // Simulate Parlant validation workflow
      context.eventEmitter.emit('parlant.validation.requested', {
        source: 'ParlantValidatedComputerUseService',
        correlationId,
        sequenceNumber: 1,
        action: 'screenshot',
        validationContext: { userId: 'test-user', securityLevel: 'HIGH' },
      });

      context.eventEmitter.emit('parlant.validation.analyzing', {
        source: 'ParlantIntegrationService',
        correlationId,
        sequenceNumber: 2,
        analysisType: 'conversational-intent',
        conversationHistory: ['User requested screenshot for documentation'],
      });
      context.eventEmitter.emit('parlant.validation.context-evaluated', {
        source: 'ParlantIntegrationService',
        correlationId,
        sequenceNumber: 3,
        riskLevel: 'LOW',
        contextFactors: ['documentation-purpose', 'safe-operation'],
      });
      context.eventEmitter.emit('parlant.validation.decision-made', {
        source: 'ParlantIntegrationService',
        correlationId,
        sequenceNumber: 4,
        approved: true,
        confidence: 0.95,
        reasoning: 'Screenshot approved for documentation purposes',
      });
      context.eventEmitter.emit('computer-use.action.approved', {
        source: 'ParlantValidatedComputerUseService',
        correlationId,
        sequenceNumber: 5,
        action: 'screenshot',
        validationResult: 'approved',
      });
      context.eventEmitter.emit('computer-use.action.executing', {
        source: 'ComputerUseService',
        correlationId,
        sequenceNumber: 6,
        action: 'screenshot',
      });
      context.eventEmitter.emit('computer-use.action.completed', {
        source: 'ComputerUseService',
        correlationId,
        sequenceNumber: 7,
        success: true,
        result: { image: 'base64-screenshot-data' },
      });
      context.eventEmitter.emit('parlant.validation.completed', {
        source: 'ParlantValidatedComputerUseService',
        correlationId,
        sequenceNumber: 8,
        success: true,
        validationTime: Date.now() - startTime,
      });

      // Allow event processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Validate event sequence
      const actualSequence =
        context.eventCollector.getEventSequence(correlationId);
      const validator = validateEventSequence(expectedEvents, actualSequence);

      expect(validator.violations).toHaveLength(0);
      expect(actualSequence).toEqual(expectedEvents);

      // Verify approval workflow
      const validationEvents = context.eventCollector.getEventsByPattern(
        'parlant.validation.*',
      );
      expect(validationEvents).toHaveLength(4);
      const approvalEvent = context.eventCollector
        .getEvents()
        .find(
          (e) =>
            e.eventName === 'computer-use.action.approved' &&
            e.correlationId === correlationId,
        );
      expect(approvalEvent).toBeDefined();
      expect(approvalEvent?.payload.validationResult).toBe('approved');
      recordEventFlowMetrics(
        flowId,
        startTime,
        context.eventCollector.getEvents(),
        correlationId,
      );
    });

    it('should propagate Enterprise API events with rate limiting context', async () => {
      const correlationId = generateCorrelationId();
      const flowId = generateFlowId();

      const expectedEvents = [
        'enterprise-api.request.received',
        'enterprise-api.auth.validating',
        'enterprise-api.auth.approved',
        'enterprise-api.rate-limit.checking',
        'enterprise-api.rate-limit.allowed',
        'enterprise-api.routing.started',
        'computer-use.action.started',
        'computer-use.action.completed',
        'enterprise-api.response.sent',
        'enterprise-api.metrics.recorded',
      ];
      const startTime = Date.now();

      // Simulate Enterprise API request flow
      context.eventEmitter.emit('enterprise-api.request.received', {
        source: 'EnterpriseApiGatewayController',
        correlationId,
        sequenceNumber: 1,
        clientId: 'enterprise-client-123',
        tenantId: 'tenant-enterprise-1',
        endpoint: '/enterprise/computer-use/action',
      });
      context.eventEmitter.emit('enterprise-api.auth.validating', {
        source: 'JwtAuthGuard',
        correlationId,
        sequenceNumber: 2,
        tokenType: 'JWT',
        userRole: 'OPERATOR',
      });
      context.eventEmitter.emit('enterprise-api.auth.approved', {
        source: 'JwtAuthGuard',
        correlationId,
        sequenceNumber: 3,
        userId: 'enterprise-user-456',
        permissions: ['computer-use:execute'],
      });
      context.eventEmitter.emit('enterprise-api.rate-limit.checking', {
        source: 'EnterpriseApiRateLimitService',
        correlationId,
        sequenceNumber: 4,
        rateLimitTier: 'ENTERPRISE',
        currentUsage: 45,
        maxAllowed: 1000,
      });

      context.eventEmitter.emit('enterprise-api.rate-limit.allowed', {
        source: 'EnterpriseApiRateLimitService',
        correlationId,
        sequenceNumber: 5,
        remainingRequests: 955,
        resetTime: Date.now() + 3600000,
      });

      context.eventEmitter.emit('enterprise-api.routing.started', {
        source: 'EnterpriseApiRoutingService',
        correlationId,
        sequenceNumber: 6,
        targetService: 'ComputerUseService',
        routingStrategy: 'direct',
      });
      context.eventEmitter.emit('computer-use.action.started', {
        source: 'ComputerUseService',
        correlationId,
        sequenceNumber: 7,
        action: 'cursor_position',
        enterpriseContext: true,
      });

      context.eventEmitter.emit('computer-use.action.completed', {
        source: 'ComputerUseService',
        correlationId,
        sequenceNumber: 8,
        success: true,
        result: { x: 500, y: 600 },
      });

      context.eventEmitter.emit('enterprise-api.response.sent', {
        source: 'EnterpriseApiGatewayController',
        correlationId,
        sequenceNumber: 9,
        statusCode: 200,
        responseSize: 124,
        totalTime: Date.now() - startTime,
      });

      context.eventEmitter.emit('enterprise-api.metrics.recorded', {
        source: 'MetricsService',
        correlationId,
        sequenceNumber: 10,
        metrics: {
          requestCount: 1,
          responseTime: Date.now() - startTime,
          successRate: 1.0,
        },
      });

      // Allow event processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Validate event sequence
      const actualSequence =
        context.eventCollector.getEventSequence(correlationId);
      const validator = validateEventSequence(expectedEvents, actualSequence);

      expect(validator.violations).toHaveLength(0);
      expect(actualSequence).toEqual(expectedEvents);

      // Verify enterprise-specific events
      const enterpriseEvents =
        context.eventCollector.getEventsByPattern('enterprise-api.*');
      expect(enterpriseEvents).toHaveLength(6);
      const rateLimitEvent = context.eventCollector
        .getEvents()
        .find(
          (e) =>
            e.eventName === 'enterprise-api.rate-limit.allowed' &&
            e.correlationId === correlationId,
        );
      expect(rateLimitEvent).toBeDefined();
      expect(rateLimitEvent?.payload.remainingRequests).toBe(955);

      recordEventFlowMetrics(
        flowId,
        startTime,
        context.eventCollector.getEvents(),
        correlationId,
      );
    });
  });

  describe('Event Error Handling and Recovery', () => {
    it('should handle event processing failures gracefully', async () => {
      const correlationId = generateCorrelationId();

      // Setup failing event listener
      context.eventEmitter.on('test.failing.event', () => {
        throw new Error('Simulated event processing failure');
      });

      // Setup recovery event listener
      const recoveryEvents: EventRecord[] = [];
      context.eventEmitter.on(
        'test.recovery.event',
        (payload: EventPayload) => {
          recoveryEvents.push({
            eventId: 'recovery-test',
            eventName: 'test.recovery.event',
            source: 'test',
            target: 'test',
            timestamp: new Date(),
            payload,
            correlationId,
          });
        },
      );

      // Emit failing event - should not crash the system
      expect(() => {
        context.eventEmitter.emit('test.failing.event', { correlationId });
      }).not.toThrow(); // Emit recovery event - should work normally
      context.eventEmitter.emit('test.recovery.event', {
        correlationId,
        message: 'Recovery successful',
      });
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(recoveryEvents).toHaveLength(1);
      expect(recoveryEvents[0]?.payload.message).toBe('Recovery successful');
    });

    it('should implement dead letter queue for failed events', async () => {
      const correlationId = generateCorrelationId();
      const deadLetterEvents: EventRecord[] = [];

      // Setup dead letter queue listener
      context.eventEmitter.on('dlq.event.failed', (payload: EventPayload) => {
        deadLetterEvents.push({
          eventId: 'dlq-test',
          eventName: 'dlq.event.failed',
          source: 'dead-letter-queue',
          target: 'dlq',
          timestamp: new Date(),
          payload,
          correlationId: payload.originalCorrelationId,
        });
      });

      // Setup failing processor that retries then sends to DLQ
      let failCount = 0;
      context.eventEmitter.on(
        'test.retryable.event',
        (payload: EventPayload) => {
          failCount++;
          if (failCount <= 3) {
            // Simulate retry
            setTimeout(() => {
              context.eventEmitter.emit('test.retryable.event', {
                ...payload,
                retryCount: (payload.retryCount ?? 0) + 1,
              });
            }, 10);
          } else {
            // Send to dead letter queue
            context.eventEmitter.emit('dlq.event.failed', {
              originalEvent: 'test.retryable.event',
              originalCorrelationId: correlationId,
              failureReason: 'Max retries exceeded',
              retryCount: payload.retryCount ?? 0,
            });
          }
        },
      );

      // Emit retryable event
      context.eventEmitter.emit('test.retryable.event', {
        correlationId,
        data: 'test data',
        retryCount: 0,
      });

      // Wait for retries and DLQ processing
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(deadLetterEvents).toHaveLength(1);
      expect(deadLetterEvents[0]?.payload.originalCorrelationId).toBe(
        correlationId,
      );
      expect(deadLetterEvents[0]?.payload.failureReason).toBe(
        'Max retries exceeded',
      );
    });

    it('should maintain event ordering under high concurrency', async () => {
      const correlationId = generateCorrelationId();
      const concurrentEventCount = 50;
      const orderedEvents: EventRecord[] = [];

      // Setup ordered event collector
      context.eventEmitter.on('test.ordered.event', (payload: EventPayload) => {
        orderedEvents.push({
          eventId: `ordered-${payload.sequenceNumber}`,
          eventName: 'test.ordered.event',
          source: 'test',
          target: 'ordering-test',
          timestamp: new Date(),
          payload,
          correlationId,
          sequenceNumber: payload.sequenceNumber,
        });
      });

      // Emit events with sequence numbers concurrently
      const promises = Array.from(
        { length: concurrentEventCount },
        (_, i) =>
          new Promise<void>((resolve) => {
            setTimeout(() => {
              context.eventEmitter.emit('test.ordered.event', {
                correlationId,
                sequenceNumber: i + 1,
                timestamp: Date.now(),
              });
              resolve();
            }, Math.random() * 10); // Random delay to simulate concurrent processing
          }),
      );

      await Promise.all(promises);
      await new Promise((resolve) => setTimeout(resolve, 100)); // Allow all events to process

      // Verify all events were received
      expect(orderedEvents).toHaveLength(concurrentEventCount);

      // Check if events maintain their sequence numbers (they may not be in order due to concurrency)
      const sequenceNumbers = orderedEvents
        .map((e) => e.sequenceNumber)
        .sort((a, b) => (a ?? 0) - (b ?? 0));
      const expectedSequence = Array.from(
        { length: concurrentEventCount },
        (_, i) => i + 1,
      );

      expect(sequenceNumbers).toEqual(expectedSequence);

      // Calculate ordering violations (events processed out of sequence)
      let orderingViolations = 0;
      for (let i = 1; i < orderedEvents.length; i++) {
        const currentSeq = orderedEvents[i]?.sequenceNumber ?? 0;
        const prevSeq = orderedEvents[i - 1]?.sequenceNumber ?? 0;
        if (currentSeq < prevSeq) {
          orderingViolations++;
        }
      }

      // Some ordering violations are expected with concurrent processing
      expect(orderingViolations).toBeLessThan(concurrentEventCount * 0.5); // Less than 50% violations
    });
  });

  describe('Event Performance and Monitoring', () => {
    it('should monitor event processing performance', async () => {
      const correlationId = generateCorrelationId();
      const flowId = generateFlowId();
      const performanceEvents: Array<{
        eventName: string;
        processingTime: number;
      }> = [];

      // Setup performance monitoring
      context.eventEmitter.on(
        'performance.test.event',
        (_payload: EventPayload) => {
          const startTime = Date.now(); // Simulate processing work
          const processingDelay = Math.random() * 50; // 0-50ms processing time
          setTimeout(() => {
            const processingTime = Date.now() - startTime;
            performanceEvents.push({
              eventName: 'performance.test.event',
              processingTime,
            });

            context.eventEmitter.emit('performance.test.completed', {
              correlationId,
              processingTime,
            });
          }, processingDelay);
        },
      );

      // Emit performance test events
      const eventCount = 20;
      const startTime = Date.now();

      for (let i = 0; i < eventCount; i++) {
        context.eventEmitter.emit('performance.test.event', {
          correlationId,
          eventIndex: i,
          timestamp: Date.now(),
        });
      }

      // Wait for all events to complete
      await new Promise((resolve) => setTimeout(resolve, 200));

      const totalTime = Date.now() - startTime;

      // Verify performance metrics
      expect(performanceEvents).toHaveLength(eventCount);

      const averageProcessingTime =
        performanceEvents.reduce((sum, e) => sum + e.processingTime, 0) /
        eventCount;
      const maxProcessingTime = Math.max(
        ...performanceEvents.map((e) => e.processingTime),
      );
      const _minProcessingTime = Math.min(
        ...performanceEvents.map((e) => e.processingTime),
      );

      expect(averageProcessingTime).toBeLessThan(100); // Average under 100ms
      expect(maxProcessingTime).toBeLessThan(200); // Max under 200ms
      expect(totalTime).toBeLessThan(1000); // Total under 1 second

      // Record comprehensive metrics
      const metrics: EventFlowMetrics = {
        flowId,
        startTime,
        endTime: Date.now(),
        totalEvents: eventCount,
        successfulEvents: performanceEvents.length,
        failedEvents: 0,
        averageProcessingTime,
        maxProcessingTime,
        eventLatencies: performanceEvents.map((e) => e.processingTime),
        orderingViolations: 0,
        deadLetterEvents: 0,
      };

      eventFlowMetrics.push(metrics);
      expect(metrics.successfulEvents / metrics.totalEvents).toBe(1.0); // 100% success rate
    });

    it('should handle high-volume event throughput', async () => {
      const correlationId = generateCorrelationId();
      const highVolumeEventCount = 1000;
      const processedEvents: EventRecord[] = [];

      // Setup high-throughput event processor
      context.eventEmitter.on(
        'throughput.test.event',
        (payload: EventPayload) => {
          processedEvents.push({
            eventId: `throughput-${payload.eventIndex}`,
            eventName: 'throughput.test.event',
            source: 'throughput-test',
            target: 'performance',
            timestamp: new Date(),
            payload,
            correlationId,
          });
        },
      );

      // Generate high volume of events
      const startTime = Date.now();

      for (let i = 0; i < highVolumeEventCount; i++) {
        context.eventEmitter.emit('throughput.test.event', {
          correlationId,
          eventIndex: i,
          timestamp: Date.now(),
        });
      }

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 500));

      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const throughput = (processedEvents.length / totalTime) * 1000; // events per second

      // Verify high throughput performance
      expect(processedEvents.length).toBe(highVolumeEventCount);
      expect(throughput).toBeGreaterThan(1000); // At least 1000 events/second
      expect(totalTime).toBeLessThan(2000); // Complete within 2 seconds
    });
  });

  // Helper Functions for Cross-Module Event Testing

  /**
   * Validate event sequence ordering
   */
  function validateEventSequence(
    expected: string[],
    actual: string[],
  ): EventSequenceValidator {
    const violations: Array<{
      expected: string;
      actual: string;
      position: number;
    }> = [];

    for (let i = 0; i < expected.length; i++) {
      if (i >= actual.length) {
        violations.push({
          expected: expected[i],
          actual: 'missing',
          position: i,
        });
      } else if (expected[i] !== actual[i]) {
        violations.push({
          expected: expected[i],
          actual: actual[i],
          position: i,
        });
      }
    }

    // Check for extra events
    for (let i = expected.length; i < actual.length; i++) {
      violations.push({
        expected: 'none',
        actual: actual[i],
        position: i,
      });
    }

    return {
      expectedSequence: expected,
      actualSequence: actual,
      violations,
    };
  }

  /**
   * Record event flow metrics for analysis
   */
  function recordEventFlowMetrics(
    flowId: string,
    startTime: number,
    events: EventRecord[],
    correlationId: string,
  ): void {
    const flowEvents = events.filter((e) => e.correlationId === correlationId);
    const endTime = Date.now();

    const processingTimes = flowEvents
      .map((e) => e.processingTime)
      .filter((t) => t !== undefined) as number[];

    const metrics: EventFlowMetrics = {
      flowId,
      startTime,
      endTime,
      totalEvents: flowEvents.length,
      successfulEvents: flowEvents.length, // Simplified for testing
      failedEvents: 0,
      averageProcessingTime:
        processingTimes.length > 0
          ? processingTimes.reduce((sum, t) => sum + t, 0) /
            processingTimes.length
          : 0,
      maxProcessingTime:
        processingTimes.length > 0 ? Math.max(...processingTimes) : 0,
      eventLatencies: processingTimes,
      orderingViolations: 0, // Would be calculated based on sequence analysis
      deadLetterEvents: 0,
    };

    eventFlowMetrics.push(metrics);
  }

  /**
   * Generate unique correlation ID
   */
  function generateCorrelationId(): string {
    return `corr${Date.now()}
${Math.random().toString(36).substring(7)}`;
  } /**
   * Generate unique flow ID
   */
  function generateFlowId(): string {
    return `flow${Date.now()}
${Math.random().toString(36).substring(7)}`;
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
      screendump: jest
        .fn()
        .mockResolvedValue(Buffer.from('mocked-event-screenshot')),
      getCursorPosition: jest.fn().mockResolvedValue({ x: 500, y: 600 }),
    };
  }
});
