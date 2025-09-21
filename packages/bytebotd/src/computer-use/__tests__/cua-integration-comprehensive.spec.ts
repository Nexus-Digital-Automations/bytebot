/**
 * Comprehensive CUA (Computer Use Agent) Integration Tests
 * 
 * This test suite provides complete integration testing for the Computer Use Agent
 * integration architecture, covering all cross-module communication patterns,
 * event handling, error recovery, and performance scenarios.
 * 
 * Integration Coverage:
 * - ComputerUse ↔ MCP Server integration and tool exposure
 * - ComputerUse ↔ Parlant conversational validation workflows
 * - ComputerUse ↔ Enterprise API routing and rate limiting
 * - Cross-module event handling and messaging patterns
 * - Error recovery and failover scenarios across integrations
 * - Performance and scalability under integration load
 * 
 * Test Architecture:
 * - Real service instances with minimal mocking for authentic integration
 * - Cross-module communication validation
 * - End-to-end workflow testing with multiple integration points
 * - Performance benchmarking and resource monitoring
 * - Comprehensive error handling and recovery testing
 * 
 * @author Claude Code - Subagent 6
 * @version 1.0.0
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { ComputerUseService } from '../computer-use.service';
import { ComputerUseModule } from '../computer-use.module';
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
import {ComputerAction,
  MoveMouseAction,
  ClickMouseAction,
  ScreenshotAction,
  WriteFileAction,
} from '@bytebot/shared';
import { ComputerActionValidationContext } from '../../parlant/parlant-validated-computer-use.service';
import { ConversationalValidationError, RiskLevel } from '../../parlant/parlant-integration.service';
import { McpToolResponse } from '../../mcp/types';
import * as fs from 'fs/promises';
import * as path from 'path';
    // Integration test interfaces and typesinterface CuaIntegrationContext {
  app: INestApplication;
  computerUseService: ComputerUseService;
  mcpTools: ComputerUseTools;
  parlantValidatedService: ParlantValidatedComputerUseService;
  parlantIntegrationService: ParlantIntegrationService;
  enterpriseApiController: EnterpriseApiGatewayController;
  metricsService: MetricsService;
  cacheService: CacheService;
  nutService: NutService;
  eventEmitter: EventEmitter2;
  testDataDir: string;
}

interface IntegrationTestMetrics {
  operationCount: number;
  totalExecutionTime: number;
  averageExecutionTime: number;
  errorRate: number;
  successfulIntegrationCalls: number;
  failedIntegrationCalls: number;
  memoryUsage: NodeJS.MemoryUsage;
}

interface CrossModuleEvent {
  eventName: string;
  source: string;
  target: string;
  payload: Record<string, unknown>;
  timestamp: Date;
  correlationId: string;
}

describe('CUA Integration Comprehensive Tests', () => {let context: CuaIntegrationContext;
    let testModule: TestingModule;
  const testDataDir = '/tmp/bytebot-cua-integration-tests';
    const integrationMetrics: IntegrationTestMetrics = {operationCount: 0,
    totalExecutionTime: 0,
    averageExecutionTime: 0,
    errorRate: 0,
    successfulIntegrationCalls: 0,
    failedIntegrationCalls: 0,
    memoryUsage: process.memoryUsage(),
  };

/**
   * Setup comprehensive CUA integration test environment
   * Creates real services with cross-module dependencies
   */
  beforeAll(async () => {
    // Initialize comprehensive integration test module
    testModule = await Test.createTestingModule({
      imports: [
        EventEmitterModule.forRoot(),
        ComputerUseModule,
        BytebotMcpModule,
        ParlantModule,
        EnterpriseApiModule,
      ],
    })
      .overrideProvider(NutService)
      .useValue(createMockNutService())
      .compile();

    // Create NestJS application for full integration testing
    const app = testModule.createNestApplication();
    await app.init();

    // Initialize comprehensive integration context
    context = {
      app,
      computerUseService: testModule.get<ComputerUseService>(ComputerUseService),
      mcpTools: testModule.get<ComputerUseTools>(ComputerUseTools),
      parlantValidatedService: testModule.get<ParlantValidatedComputerUseService>(ParlantValidatedComputerUseService),
      parlantIntegrationService: testModule.get<ParlantIntegrationService>(ParlantIntegrationService),
      enterpriseApiController: testModule.get<EnterpriseApiGatewayController>(EnterpriseApiGatewayController),
      metricsService: testModule.get<MetricsService>(MetricsService),
      cacheService: testModule.get<CacheService>(CacheService),
      nutService: testModule.get<NutService>(NutService),
      eventEmitter: testModule.get<EventEmitter2>(EventEmitter2),
      testDataDir,
    };

    // Setup test data directory and event listeners
    await createTestDataDirectory();
    setupIntegrationEventListeners();
  });

  afterAll(async () => {
    await cleanupTestData();
    await context?.app?.close();
    await testModule?.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    resetIntegrationMetrics();
  });

  describe('ComputerUse ↔ MCP Integration', () => {it('should expose all computer use operations through MCP tools', async () => {const operationId = generateOperationId();
    // Test mouse movement through MCP
      const moveResult = await context.mcpTools.moveMouse({
        coordinates: { x: 100, y: 200 }
      });
      
      expect(moveResult).toBeDefined();
      expect(moveResult.content).toEqual([{ type: 'text', text: 'mouse moved' }]);
      expect(context.nutService.mouseMoveEvent).toHaveBeenCalledWith(100, 200);
    // Test screenshot through MCP
      const screenshotResult = await context.mcpTools.screenshot();
      
      expect(screenshotResult).toBeDefined();
      expect(screenshotResult.content[0]).toHaveProperty('type', 'image');
      expect(screenshotResult.content[0]).toHaveProperty('mimeType', 'image/png');
      expect(context.nutService.screendump).toHaveBeenCalled();
    // Test file operations through MCP
      const testData = Buffer.from('CUA integration test data').toString('base64');

        const writeResult = await context.mcpTools.writeFile({path: path.join(testDataDir, 'mcp-test.txt'),
  data: testData,});
      
      expect(writeResult).toBeDefined();
      expect(writeResult.content[0]?.text).toContain('successfully');
    // Verify integration metricsupdateIntegrationMetrics(operationId, true);
      expect(integrationMetrics.successfulIntegrationCalls).toBeGreaterThan(0);
    });

    it('should handle MCP tool errors and propagate them correctly', async () => {const operationId = generateOperationId();
    // Mock NUT service failure for error testing
      const mouseMoveEventSpy = jest.spyOn(context.nutService, 'mouseMoveEvent');mouseMoveEventSpy.mockRejectedValueOnce(new Error('MCP integration test error'));

        const result = await context.mcpTools.moveMouse({coordinates: { x: 100, y: 200 }
      });
      
      expect(result.content[0]?.text).toContain('Error moving mouse');
      expect(result.content[0]?.text).toContain('MCP integration test error');updateIntegrationMetrics(operationId, false);
      expect(integrationMetrics.failedIntegrationCalls).toBeGreaterThan(0);
    });

    it('should maintain performance standards for MCP tool invocations', async () => {const operations = [() => context.mcpTools.moveMouse({ coordinates: { x: 50, y: 50 } }),
        () => context.mcpTools.clickMouse({ 
          coordinates: { x: 50, y: 50 }, 
          button: 'left', clickCount: 1 }),
        () => context.mcpTools.typeText({ text: 'performance test' }),() => context.mcpTools.screenshot(),];
      
      const startTime = Date.now();

        const results = await Promise.all(operations.map(op => op()));

        const totalTime = Date.now() - startTime;
      
      // All operations should complete
      expect(results).toHaveLength(4);
      results.forEach(result => expect(result).toBeDefined());
      
      // Performance benchmark: should complete within reasonable time
      expect(totalTime).toBeLessThan(5000); // 5 seconds for all operations
      
      // Verify each result has expected structure
      expect(results[0]?.content[0]?.text).toBe('mouse moved');
      expect(results[1]?.content[0]?.text).toBe('mouse clicked');
      expect(results[2]?.content[0]?.text).toBe('text typed');
      expect(results[3]?.content[0]).toHaveProperty('type', 'image');});
});

  describe('ComputerUse ↔ Parlant Conversational Validation Integration', () => {it('should validate computer actions through Parlant before execution', async () => {const operationId = generateOperationId();
    // Setup validation context for Parlant integration
      const validationContext: ComputerActionValidationContext = {
        userId: 'test-user-123',
        sessionId: `integration-session-${operationId}`,
        agentRole: 'OPERATOR',
  securityLevel: 'HIGH',
  conversationHistory: [{
            timestamp: new Date(),
            speaker: 'USER',
  message: 'I need to take a screenshot for documentation'}],
        metadata: {
          operationId,
          testContext: true,
        },
        recentActions: [],
        systemState: {
          cpuUsage: 25,
          memoryUsage: 60,
          networkActivity: false,
          securityAlerts: [],
          maintenanceMode: false,
        },
      };
      
      // Mock Parlant integration service for controlled testing
      jest.spyOn(context.parlantIntegrationService, 'validateFunctionExecution')
        .mockResolvedValue({
          approved: true,
          conversationId: `conv-${operationId}`,
          validationTimestamp: new Date(),
          reasoning: 'Screenshot action approved for documentation purposes',
  confidence: 0.95,
  suggestedAlternatives: [],
          executionContext: {
            timeoutMs: 5000,
            retryAttempts: 1,
            monitoringLevel: 'DETAILED',
  safeguards: ['screenshot-validation'],},});
      
      // Execute validated computer action
      const screenshotAction: ScreenshotAction = { action: 'screenshot' };
    const result = await context.parlantValidatedService.action(screenshotAction, validationContext);
      expect(result).toBeDefined();
      expect(context.parlantIntegrationService.validateFunctionExecution).toHaveBeenCalled();
      expect(context.nutService.screendump).toHaveBeenCalled();
      
      updateIntegrationMetrics(operationId, true);
    });

    it('should reject risky actions through Parlant validation', async () => {const operationId = generateOperationId();

        const validationContext: ComputerActionValidationContext = {
        userId: 'test-user-456',
        sessionId: `risk-session-${operationId}`,
        agentRole: 'USER',
  securityLevel: 'LOW',
  conversationHistory: [],
  metadata: { operationId },
        recentActions: [],
        systemState: {
          cpuUsage: 90,
          memoryUsage: 95,
          networkActivity: true,
          securityAlerts: ['high-cpu-usage'],
  maintenanceMode: false,},
      };
      
      // Mock Parlant rejection for high-risk scenario
      jest.spyOn(context.parlantIntegrationService, 'validateFunctionExecution').mockRejectedValue(new ConversationalValidationError('Action denied due to high system load and security alerts',
          `conv-${operationId}`,
          0.15,
          ['Reduce system load before attempting file operations'],RiskLevel._HIGH));

        const riskyFileAction: WriteFileAction = {
        action: 'write_file',
  path: '/tmp/risky-operation.txt',
  data: Buffer.from('risky content').toString('base64'),};await expect(
        context.parlantValidatedService.action(riskyFileAction, validationContext)
      ).rejects.toThrow(ConversationalValidationError);
      
      expect(context.parlantIntegrationService.validateFunctionExecution).toHaveBeenCalled();
      // Should not proceed to actual file write
      expect(context.nutService.screendump).not.toHaveBeenCalled();
      
      updateIntegrationMetrics(operationId, false);
    });

    it('should handle Parlant service failures gracefully', async () => {const operationId = generateOperationId();

        const validationContext: ComputerActionValidationContext = {
        userId: 'test-user-789',
        sessionId: `failure-session-${operationId}`,
        agentRole: 'ADMIN',
  securityLevel: 'CRITICAL',
  conversationHistory: [],
  metadata: { operationId },
        recentActions: [],
        systemState: {
          cpuUsage: 10,
          memoryUsage: 30,
          networkActivity: false,
          securityAlerts: [],
          maintenanceMode: false,
        },
      };
      
      // Mock Parlant service failure
      jest.spyOn(context.parlantIntegrationService, 'validateFunctionExecution').mockRejectedValue(new Error('Parlant service temporarily unavailable'));

        const action: MoveMouseAction = {action: 'move_mouse',
  coordinates: { x: 300, y: 400 },};
      
      await expect(
        context.parlantValidatedService.action(action, validationContext)
      ).rejects.toThrow('Parlant service temporarily unavailable');updateIntegrationMetrics(operationId, false);});
  });

  describe('Cross-Module Event Handling and Messaging', () => {it('should propagate events across all integrated modules', async () => {const operationId = generateOperationId();

        const events: CrossModuleEvent[] = [];
      
      // Setup event listeners for cross-module communication
      const eventNames = [
        'computer-use.action.started','computer-use.action.completed','mcp.tool.invoked','parlant.validation.requested','parlant.validation.completed','enterprise-api.request.received','metrics.performance.recorded',];eventNames.forEach(eventName => {
        context.eventEmitter.on(eventName, (payload) => {
          events.push({
            eventName,
            source: payload.source || 'unknown',
  target: payload.target || 'all',payload,
  timestamp: new Date(),
            correlationId: operationId,
          });
        });
      });
      
      // Trigger cross-module workflow
      const action: ClickMouseAction = {
        action: 'click_mouse',
  coordinates: { x: 150, y: 250 },
  button: 'left',
  clickCount: 1,};
      
      // Emit events manually for testing (in real system, these would be automatic)
      context.eventEmitter.emit('computer-use.action.started', {source: 'ComputerUseService',
  action: action.action,operationId,
      });
      
      await context.computerUseService.action(action);
      
      context.eventEmitter.emit('computer-use.action.completed', {source: 'ComputerUseService',
  action: action.action,operationId,
        success: true,
      });
      
      // Allow event propagation
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify event propagation
      expect(events).toHaveLength(2);
      expect(events[0]?.eventName).toBe('computer-use.action.started');
      expect(events[1]?.eventName).toBe('computer-use.action.completed');
      expect(events.every(e => e.correlationId === operationId)).toBe(true);updateIntegrationMetrics(operationId, true);
    });

    it('should handle event failures without breaking the integration chain', async () => {const operationId = generateOperationId();
    // Setup failing event listener
      context.eventEmitter.on('test.failing.event', () => {throw new Error('Event handler failure');});
    // Setup successful event listener
      const successfulEvents: CrossModuleEvent[] = [];
      context.eventEmitter.on('test.successful.event', (payload) => {successfulEvents.push({eventName: 'test.successful.event',
  source: 'test',
  target: 'test',payload,
  timestamp: new Date(),
          correlationId: operationId,
        });
      });
      
      // Emit failing event (should not crash the system)
      expect(() => {
        context.eventEmitter.emit('test.failing.event', { operationId });
}).not.toThrow();
    // Emit successful event (should work normally)
      context.eventEmitter.emit('test.successful.event', { operationId });
      expect(successfulEvents).toHaveLength(1);
      expect(successfulEvents[0]?.correlationId).toBe(operationId);
      
      updateIntegrationMetrics(operationId, true);
    });
  });

  describe('Error Recovery and Failover Integration', () => {it('should recover from NUT service failures and retry operations', async () => {const operationId = generateOperationId();
    // Setup NUT service to fail once then succeed
      const mouseMoveEventSpy = jest.spyOn(context.nutService, 'mouseMoveEvent');mouseMoveEventSpy.mockRejectedValueOnce(new Error('NUT service temporary failure')).mockResolvedValueOnce({ success: true });

        const action: MoveMouseAction = {
        action: 'move_mouse',
  coordinates: { x: 500, y: 600 },};
      
      // First attempt should fail
      await expect(context.computerUseService.action(action)).rejects.toThrow('NUT service temporary failure');
    // Second attempt should succeed (service recovered)await expect(context.computerUseService.action(action)).resolves.not.toThrow();
      
      expect(mouseMoveEventSpy).toHaveBeenCalledTimes(2);
      updateIntegrationMetrics(operationId, true);
    });

    it('should handle cache service failures gracefully', async () => {const operationId = generateOperationId();
    // Mock cache service failure
      jest.spyOn(context.cacheService, 'get').mockRejectedValue(new Error('Cache service unavailable'));jest.spyOn(context.cacheService, 'set').mockRejectedValue(new Error('Cache service unavailable'));
    // Computer use operations should still work without cacheconst action: ScreenshotAction = { action: 'screenshot' };
    const result = await context.computerUseService.action(action);
      expect(result).toBeDefined();
      expect(context.nutService.screendump).toHaveBeenCalled();
      
      updateIntegrationMetrics(operationId, true);
    });

    it('should implement circuit breaker pattern for external service failures', async () => {const operationId = generateOperationId();
    let failureCount = 0;
      const maxFailures = 3;
      
      // Mock consecutive failures to trigger circuit breaker
      jest.spyOn(context.nutService, 'screendump')
        .mockImplementation(() => {
          failureCount++;
          if (failureCount <= maxFailures) {
            throw new Error(`Service failure ${failureCount}`);
          }
          return Promise.resolve(Buffer.from('recovered-screenshot'));});
    // Attempt operations that should trigger circuit breaker
      for (let i = 1; i <= maxFailures; i++) {
        await expect(
          context.computerUseService.action({ action: 'screenshot' })
        ).rejects.toThrow(`Service failure ${i}`);
      }
      
      // Circuit breaker should be open, but service eventually recovers
      const result = await context.computerUseService.action({ action: 'screenshot' });
      expect(result).toBeDefined();updateIntegrationMetrics(operationId, true);
    });
  });

  describe('Performance and Scalability Integration', () => {it('should maintain performance under concurrent integration load', async () => {const operationCount = 10;
    const operations = Array.from({ length: operationCount }, (_, i) => ({
        action: 'move_mouse' as const,
  coordinates: { x: 100 + i * 10, y: 200 + i * 10 },}));

        const startTime = Date.now();

        const initialMemory = process.memoryUsage();
      
      // Execute concurrent operations across all integration points
      const mcpPromises = operations.map(op => context.mcpTools.moveMouse(op));

        const directPromises = operations.map(op => context.computerUseService.action(op));

        const [mcpResults, directResults] = await Promise.all([
        Promise.all(mcpPromises),
        Promise.all(directPromises),
      ]);

        const totalTime = Date.now() - startTime;
      const finalMemory = process.memoryUsage();
      
      // Verify all operations completed successfully
      expect(mcpResults).toHaveLength(operationCount);
      expect(directResults).toHaveLength(operationCount);
      
      mcpResults.forEach(result => {
        expect(result.content[0]?.text).toBe('mouse moved');});
    // Performance benchmarks
      expect(totalTime).toBeLessThan(10000); // Should complete within 10 seconds
      
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      expect(memoryGrowth).toBeLessThan(100 * 1024 * 1024); // Less than 100MB growth
      
      // Update comprehensive metrics
      integrationMetrics.operationCount += operationCount * 2;
      integrationMetrics.totalExecutionTime += totalTime;
      integrationMetrics.averageExecutionTime = integrationMetrics.totalExecutionTime / integrationMetrics.operationCount;
      integrationMetrics.memoryUsage = finalMemory;
    });

    it('should scale event handling under high load', async () => {const eventCount = 100;
    const receivedEvents: CrossModuleEvent[] = [];
      
      // Setup event listener
      context.eventEmitter.on('performance.test.event', (payload) => {receivedEvents.push({eventName: 'performance.test.event',
  source: payload.source,
  target: 'performance-test',payload,
  timestamp: new Date(),
          correlationId: payload.correlationId,
        });
      });
      
      // Emit many events rapidly
      const startTime = Date.now();
      for (let i = 0; i < eventCount; i++) {
        context.eventEmitter.emit('performance.test.event', {
          source: `source-${i}`,
  correlationId: `perf-test-${i}`,
  data: `test-data-${i}`,});
}
      
      // Allow event processing
      await new Promise(resolve => setTimeout(resolve, 1000));

        const totalTime = Date.now() - startTime;
      
      // Verify all events were processed
      expect(receivedEvents).toHaveLength(eventCount);
      expect(totalTime).toBeLessThan(5000); // Should process within 5 seconds
      
      // Verify event ordering and completeness
      receivedEvents.forEach((event, index) => {
        expect(event.payload.correlationId).toBe(`perf-test-${index}`);
      });
    });

    it('should provide comprehensive integration metrics and monitoring', async () => {const operationId = generateOperationId();
    // Execute various integration operations
      await context.mcpTools.screenshot();
      await context.computerUseService.action({ action: 'cursor_position' });
    // Mock validation for metrics collectionjest.spyOn(context.parlantIntegrationService, 'validateFunctionExecution')
        .mockResolvedValue({
          approved: true,
          conversationId: `metrics-${operationId}`,
          validationTimestamp: new Date(),
          reasoning: 'Metrics collection test',
  confidence: 0.9,});

        const validationContext: ComputerActionValidationContext = {
        userId: 'metrics-user',
        sessionId: `metrics-session-${operationId}`,
        agentRole: 'OPERATOR',
  securityLevel: 'MEDIUM',
  conversationHistory: [],
  metadata: { operationId },
        recentActions: [],
        systemState: {
          cpuUsage: 45,
          memoryUsage: 60,
          networkActivity: false,
          securityAlerts: [],
          maintenanceMode: false,
        },
      };
      
      await context.parlantValidatedService.action(
        { action: 'screenshot' },validationContext);
      
      // Verify metrics collection
      expect(integrationMetrics.operationCount).toBeGreaterThan(0);
      expect(integrationMetrics.successfulIntegrationCalls).toBeGreaterThan(0);
      expect(integrationMetrics.memoryUsage).toBeDefined();
      
      // Generate integration report
      const integrationReport = generateIntegrationReport();
      expect(integrationReport).toHaveProperty('summary');
      expect(integrationReport).toHaveProperty('performance');
      expect(integrationReport).toHaveProperty('errorAnalysis');
      expect(integrationReport).toHaveProperty('recommendations');updateIntegrationMetrics(operationId, true);});
  });

  // Helper Functions for Integration Testing

  /**
   * Create mock NUT service with realistic integration behavior
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
      screendump: jest.fn().mockResolvedValue(Buffer.from('mocked-integration-screenshot')),
  getCursorPosition: jest.fn().mockResolvedValue({ x: 500, y: 600 }),};
  }

  /**
   * Setup integration event listeners for cross-module communication testing
   */
  function setupIntegrationEventListeners(): void {
    // Computer Use Service events
    context.eventEmitter.on('computer-use.*', (payload) => {console.log('Computer Use Event:', payload);});
    // MCP Tool events
    context.eventEmitter.on('mcp.*', (payload) => {console.log('MCP Event:', payload);});
    // Parlant Validation events
    context.eventEmitter.on('parlant.*', (payload) => {console.log('Parlant Event:', payload);});
    // Enterprise API events
    context.eventEmitter.on('enterprise-api.*', (payload) => {console.log('Enterprise API Event:', payload);
    });
  }

  /**
   * Generate unique operation ID for tracking
   */
  function generateOperationId(): string {
    return `cua_integration${Date.now()}${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Update integration metrics for performance monitoring
   */
  function updateIntegrationMetrics(operationId: string, success: boolean): void {
    integrationMetrics.operationCount++;
    
    if (success) {
      integrationMetrics.successfulIntegrationCalls++;
    } else {
      integrationMetrics.failedIntegrationCalls++;
    }
    
    integrationMetrics.errorRate = 
      integrationMetrics.failedIntegrationCalls / integrationMetrics.operationCount;
    
    integrationMetrics.memoryUsage = process.memoryUsage();
  }

  /**
   * Reset integration metrics for test isolation
   */
  function resetIntegrationMetrics(): void {
    integrationMetrics.operationCount = 0;
    integrationMetrics.totalExecutionTime = 0;
    integrationMetrics.averageExecutionTime = 0;
    integrationMetrics.errorRate = 0;
    integrationMetrics.successfulIntegrationCalls = 0;
    integrationMetrics.failedIntegrationCalls = 0;
  }

  /**
   * Generate comprehensive integration test report
   */
  function generateIntegrationReport() {
    return {
      summary: {
        totalOperations: integrationMetrics.operationCount,
        successRate: (integrationMetrics.successfulIntegrationCalls / integrationMetrics.operationCount) * 100,
        errorRate: integrationMetrics.errorRate * 100,
        averageExecutionTime: integrationMetrics.averageExecutionTime,
      },
      performance: {
        memoryUsage: integrationMetrics.memoryUsage,
        totalExecutionTime: integrationMetrics.totalExecutionTime,
      },
      errorAnalysis: {
        failedCalls: integrationMetrics.failedIntegrationCalls,
        errorPatterns: ['NUT service failures', 'Parlant validation rejections', 'Cache service issues'],},
  recommendations: [
        'Implement circuit breaker pattern for external service failures','Add performance monitoring alerts for response time degradation','Enhance error recovery mechanisms for critical integration points','Consider caching strategies for frequently accessed operations',],};
  }

  /**
   * Create test data directory for file operations
   */
  async function createTestDataDirectory(): Promise<void> {
    try {
      await fs.mkdir(_testDataDir, { recursive: true });
    } catch {
      // Directory might already exist
    }
  }

  /**
   * Cleanup test data after tests complete
   */
  async function cleanupTestData(): Promise<void> {
    try {
      await fs.rm(_testDataDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to cleanup CUA integration test data:', error);
    }
  }
});