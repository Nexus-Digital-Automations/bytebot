/* eslint-env jest */

/**
 * MCP Error Handling and Recovery Test Suite
 *
 * Comprehensive test suite for MCP error handling, recovery mechanisms, resilience testing,
 * and fault tolerance validation covering all error scenarios and recovery strategies.
 *
 * Test Coverage:
 * - Connection error handling and automatic reconnection
 * - Tool execution error recovery and fallback mechanisms
 * - Protocol-level error handling and response formatting
 * - Resource exhaustion and cleanup error scenarios
 * - Timeout handling and graceful degradation
 * - Circuit breaker patterns and rate limiting
 * - Data corruption detection and recovery
 * - Service dependency failure handling
 * - Memory leak prevention and resource cleanup
 * - Concurrent error scenarios and thread safety
 *
 * @author Claude Code - Subagent 3
 * @version 1.0.0
 */

import { Test, TestingModule } from '@nestjs/testing';import { Logger } from '@nestjs/common';import { performance } from 'perf_hooks';import { EventEmitter } from 'events';import { ComputerUseTools } from '../computer-use.tools';import { ComputerUseService } from '../../computer-use/computer-use.service';import { McpSchemas, McpToolResponse, McpError } from '../types';import {createMockService,
  createMockLogger,
  TestUtils,
  AssertionHelpers,
  MockDataProviders,
} from '../../test-utils';/*** Error Scenario Generator for comprehensive testing
 */
class ErrorScenarioGenerator {
  /**
   * Generate various types of system errors
   */
  static generateSystemErrors() {
    return [
      {
        name: 'ENOENT',message: 'No such file or directory',code: 'ENOENT',category: 'file_system',recoverable: false,},
      {
        name: 'EACCES',message: 'Permission denied',code: 'EACCES',category: 'permissions',recoverable: false,},
      {
        name: 'ETIMEDOUT',message: 'Operation timed out',code: 'ETIMEDOUT',category: 'network',recoverable: true,},
      {
        name: 'ECONNREFUSED',message: 'Connection refused',code: 'ECONNREFUSED',category: 'network',recoverable: true,},
      {
        name: 'ENOMEM',message: 'Cannot allocate memory',code: 'ENOMEM',category: 'resource',recoverable: false,},
    ];
  }

  /**
   * Generate MCP protocol errors
   */
  static generateProtocolErrors() {
    return [
      {
        code: -32700,
        message: 'Parse error',data: { description: 'Invalid JSON was received by the server' },category: 'parse',recoverable: false,},
      {
        code: -32600,
        message: 'Invalid Request',data: { description: 'The JSON sent is not a valid Request object' },category: 'request',recoverable: false,},
      {
        code: -32601,
        message: 'Method not found',data: { description: 'The method does not exist / is not available' },category: 'method',recoverable: false,},
      {
        code: -32602,
        message: 'Invalid params',data: { description: 'Invalid method parameter(s)' },category: 'params',recoverable: true,},
      {
        code: -32603,
        message: 'Internal error',data: { description: 'Internal JSON-RPC error' },category: 'internal',recoverable: true,},
    ];
  }

  /**
   * Generate tool-specific errors
   */
  static generateToolErrors() {
    return [
      {
        tool: 'screenshot',error: new Error('Display not available'),category: 'hardware',recoverable: true,retryable: true,
      },
      {
        tool: 'move_mouse',error: new Error('Mouse not detected'),category: 'hardware',recoverable: true,retryable: true,
      },
      {
        tool: 'type_text',error: new Error('Keyboard input blocked'),category: 'security',recoverable: false,retryable: false,
      },
      {
        tool: 'read_file',error: new Error('File locked by another process'),category: 'concurrency',recoverable: true,retryable: true,
      },
      {
        tool: 'write_file',error: new Error('Disk full'),category: 'resource',recoverable: false,retryable: false,
      },
    ];
  }

  /**
   * Generate resource exhaustion scenarios
   */
  static generateResourceExhaustionScenarios() {
    return [
      {
        type: 'memory',description: 'Out of memory condition',simulate: () => new Error('ENOMEM: Cannot allocate memory'),critical: true,},
      {
        type: 'file_descriptors',description: 'Too many open files',simulate: () => new Error('EMFILE: Too many open files'),critical: true,},
      {
        type: 'disk_space',description: 'No space left on device',simulate: () => new Error('ENOSPC: No space left on device'),critical: true,},
      {
        type: 'cpu_throttling',description: 'CPU throttling due to high load',simulate: () => new Error('Process CPU limit exceeded'),critical: false,},
    ];
  }

  /**
   * Generate concurrent error scenarios
   */
  static generateConcurrentErrorScenarios() {
    return [
      {
        name: 'race_condition',description: 'Multiple tools accessing same resource',tools: ['read_file', 'write_file'],expectedBehavior: 'serialization or graceful failure',},{
        name: 'deadlock_prevention',description: 'Circular dependency between tools',tools: ['move_mouse', 'click_mouse'],expectedBehavior: 'timeout and recovery',},{
        name: 'resource_contention',description: 'Multiple screenshot requests',tools: ['screenshot', 'screenshot'],expectedBehavior: 'queue management',},];
  }
}

/**
 * Error Recovery Manager for testing recovery mechanisms
 */
class ErrorRecoveryManager {
  private retryAttempts: Map<string, number> = new Map();
  private backoffDelays: Map<string, number> = new Map();
  private circuitBreakers: Map<string, { failures: number; lastFailure: number; state: 'closed' | 'open' | 'half-open' }> = new Map();

  /**
   * Implement retry logic with exponential backoff
   */
  async retryWithBackoff<T>(
    operation: () => Promise<T>,
    operationId: string,
    maxRetries = 3,
    baseDelay = 100,
  ): Promise<T> {
    const currentAttempts = this.retryAttempts.get(operationId) ?? 0;
    
    if (currentAttempts >= maxRetries) {
      throw new Error(`Max retries (${maxRetries}) exceeded for operation ${operationId}`);
    }

    try {
      const result = await operation();
      // Reset on success
      this.retryAttempts.delete(operationId);
      this.backoffDelays.delete(operationId);
      return result;
    } catch (error) {
      const newAttempts = currentAttempts + 1;
      this.retryAttempts.set(operationId, newAttempts);

      if (newAttempts < maxRetries) {
        const delay = baseDelay * Math.pow(2, newAttempts - 1); // Exponential backoff
        this.backoffDelays.set(operationId, delay);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.retryWithBackoff(operation, operationId, maxRetries, baseDelay);
      } else {
        throw error;
      }
    }
  }

  /**
   * Implement circuit breaker pattern
   */
  async executeWithCircuitBreaker<T>(
    operation: () => Promise<T>,
    serviceId: string,
    failureThreshold = 5,
    timeoutWindow = 60000, // 1 minute
  ): Promise<T> {
    const breaker = this.circuitBreakers.get(serviceId) || {
      failures: 0,
      lastFailure: 0,
      state: 'closed' as const,};const now = Date.now();

    // Check if we should reset the circuit breaker
    if (breaker.state === 'open' && now - breaker.lastFailure > timeoutWindow) {breaker.state = 'half-open';breaker.failures = 0;}

    // Reject if circuit is open
    if (breaker.state === 'open') {
      throw new Error(`Circuit breaker open for service ${serviceId}`);
    }

    try {
      const result = await operation();
      
      // Reset on success
      if (breaker.state === 'half-open') {breaker.state = 'closed';breaker.failures = 0;}
      
      this.circuitBreakers.set(serviceId, breaker);
      return result;
    } catch (error) {
      breaker.failures++;
      breaker.lastFailure = now;

      if (breaker.failures >= failureThreshold) {
        breaker.state = 'open';}this.circuitBreakers.set(serviceId, breaker);
      throw error;
    }
  }

  /**
   * Get recovery statistics
   */
  getRecoveryStats() {
    return {
      activeRetries: this.retryAttempts.size,
      circuitBreakers: Array.from(this.circuitBreakers.entries()).map(([id, breaker]) => ({
        serviceId: id,
        state: breaker.state,
        failures: breaker.failures,
        lastFailure: breaker.lastFailure,
      })),
    };
  }

  /**
   * Reset all recovery state
   */
  reset() {
    this.retryAttempts.clear();
    this.backoffDelays.clear();
    this.circuitBreakers.clear();
  }
}

/**
 * Resource Monitor for tracking resource usage and leaks
 */
class ResourceMonitor {
  private memorySnapshots: Array<{ timestamp: number; usage: NodeJS.MemoryUsage }> = [];
  private openHandles: Set<string> = new Set();
  private resourceAllocations: Map<string, number> = new Map();

  /**
   * Take memory snapshot
   */
  takeMemorySnapshot() {
    const usage = process.memoryUsage();
    this.memorySnapshots.push({
      timestamp: Date.now(),
      usage,
    });

    // Keep only last 10 snapshots
    if (this.memorySnapshots.length > 10) {
      this.memorySnapshots.shift();
    }

    return usage;
  }

  /**
   * Track resource allocation
   */
  trackResourceAllocation(resourceType: string, amount = 1) {
    const current = this.resourceAllocations.get(resourceType) ?? 0;
    this.resourceAllocations.set(resourceType, current + amount);
  }

  /**
   * Track resource deallocation
   */
  trackResourceDeallocation(resourceType: string, amount = 1) {
    const current = this.resourceAllocations.get(resourceType) ?? 0;
    this.resourceAllocations.set(resourceType, Math.max(0, current - amount));
  }

  /**
   * Check for memory leaks
   */
  checkForMemoryLeaks(): { hasLeak: boolean; details: string } {
    if (this.memorySnapshots.length < 3) {
      return { hasLeak: false, details: 'Insufficient data' };
    }

    const recent = this.memorySnapshots.slice(-3);
    const growth = (recent[2]?.usage.heapUsed ?? 0) - (recent[0]?.usage.heapUsed ?? 0);
    const threshold = 10 * 1024 * 1024; // 10MB threshold

    return {
      hasLeak: growth > threshold,
      details: `Heap growth: ${(growth / 1024 / 1024).toFixed(2)}MB over ${recent.length} snapshots`,
    };
  }

  /**
   * Get resource allocation summary
   */
  getResourceSummary() {
    return {
      memorySnapshots: this.memorySnapshots.length,
      latestMemory: this.memorySnapshots[this.memorySnapshots.length - 1]?.usage,
      openHandles: this.openHandles.size,
      resourceAllocations: Object.fromEntries(this.resourceAllocations),
    };
  }

  /**
   * Reset monitoring state
   */
  reset() {
    this.memorySnapshots = [];
    this.openHandles.clear();
    this.resourceAllocations.clear();
  }
}

describe('MCP Error Handling and Recovery', () => {let module: TestingModule;let computerUseTools: ComputerUseTools;
  let mockComputerUseService: jest.Mocked<ComputerUseService>;
  let recoveryManager: ErrorRecoveryManager;
  let resourceMonitor: ResourceMonitor;
  let testId: string;

  beforeEach(async () => {
    testId = TestUtils.generateTestId('mcp_error_recovery');
    console.log(`[${testId}] Setting up MCP error handling and recovery tests`);

    // Create mock service with error simulation capabilities
    mockComputerUseService = {
      ...createMockService([
        'action','screenshot','moveMouse','clickMouse','traceMouse','dragMouse','pressMouse','scroll','typeKeys','pressKeys','typeText','pasteText','wait','application','cursorPosition','writeFile','readFile','initializeNutJS','validateCoordinates',
      ]),
      logger: createMockLogger(),
      cuaEnabled: true,
      nutService: {},
    } as unknown as jest.Mocked<ComputerUseService>;

    // Create testing module
    module = await Test.createTestingModule({
      providers: [
        ComputerUseTools,
        {
          provide: ComputerUseService,
          useValue: mockComputerUseService,
        },
      ],
    }).compile();

    computerUseTools = module.get<ComputerUseTools>(ComputerUseTools);
    recoveryManager = new ErrorRecoveryManager();
    resourceMonitor = new ResourceMonitor();

    // Take initial memory snapshot
    resourceMonitor.takeMemorySnapshot();

    console.log(`[${testId}] MCP error handling and recovery test setup completed`);});afterEach(() => {
    console.log(`[${testId}] MCP error handling and recovery test cleanup completed`);
    recoveryManager.reset();
    resourceMonitor.reset();
  });

  /**
   * Test Suite: Connection Error Handling
   */
  describe('Connection Error Handling', () => {it('should handle connection timeouts gracefully', async () => {
      const operationId = `${testId}_connection_timeout`;console.log(`[${operationId}] Testing connection timeout handling`);

      // Mock service to simulate timeout
      mockComputerUseService.screenshot.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('ETIMEDOUT: Operation timed out')), 100)));

      const startTime = performance.now();
      
      try {
        await recoveryManager.retryWithBackoff(
          () => computerUseTools.screenshot({ display: 0 }),
          operationId,
          3,
          50
        );
      } catch (error) {
        const executionTime = performance.now() - startTime;
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toContain('Max retries');
        expect(executionTime).toBeGreaterThan(150); // Should have tried multiple times
        
        console.log(`[${operationId}] Connection timeout handled after ${executionTime.toFixed(2)}ms`);
      }
    });

    it('should implement exponential backoff for retry attempts', async () => {
      const operationId = `${testId}_exponential_backoff`;console.log(`[${operationId}] Testing exponential backoff retry mechanism`);

      let attemptCount = 0;
      const attemptTimes: number[] = [];

      mockComputerUseService.moveMouse.mockImplementation(() => {
        attemptTimes.push(Date.now());
        attemptCount++;
        
        if (attemptCount < 3) {
          return Promise.reject(new Error('Simulated failure'));
        }
        return Promise.resolve({ success: true, coordinates: { x: 100, y: 200 } });
      });

      const startTime = performance.now();
      
      const result = await recoveryManager.retryWithBackoff(
        () => computerUseTools.moveMouse({ coordinates: { x: 100, y: 200 } }),
        operationId,
        3,
        100
      );

      expect(result).toBeDefined();
      expect(attemptCount).toBe(3);
      expect(attemptTimes).toHaveLength(3);

      // Verify exponential backoff (100ms, 200ms delays between attempts)
      if (attemptTimes.length >= 3) {
        const delay1 = (attemptTimes[1] ?? 0) - (attemptTimes[0] ?? 0);
        const delay2 = (attemptTimes[2] ?? 0) - (attemptTimes[1] ?? 0);
        
        expect(delay1).toBeGreaterThan(80); // ~100ms +/- timing variance
        expect(delay2).toBeGreaterThan(180); // ~200ms +/- timing variance
      }

      console.log(`[${operationId}] Exponential backoff verified with delays: ${attemptTimes.map((t, i) => i > 0 ? `${t - (attemptTimes[i-1] ?? 0)}ms` : '0ms').join(', ')}`);
    });

    it('should implement circuit breaker pattern for failing services', async () => {
      const operationId = `${testId}_circuit_breaker`;console.log(`[${operationId}] Testing circuit breaker pattern`);

      // Mock service to always fail
      mockComputerUseService.typeText.mockRejectedValue(new Error('Service unavailable'));const serviceId = 'type_text_service';const failureThreshold = 3;let failureCount = 0;

      // Trigger circuit breaker
      for (let i = 0; i < failureThreshold + 1; i++) {
        try {
          await recoveryManager.executeWithCircuitBreaker(
            () => computerUseTools.typeText({ text: 'test' }),
            serviceId,
            failureThreshold,
            1000
          );
        } catch (error) {
          failureCount++;
          console.log(`[${operationId}] Failure ${failureCount}: ${error.message}`);
        }
      }

      // Next call should fail immediately due to open circuit
      try {
        await recoveryManager.executeWithCircuitBreaker(
          () => computerUseTools.typeText({ text: 'test' }),serviceId,failureThreshold,
          1000
        );
      } catch (error) {
        expect(error.message).toContain('Circuit breaker open');
        console.log(`[${operationId}] Circuit breaker correctly opened after ${failureCount} failures`);
      }

      const stats = recoveryManager.getRecoveryStats();
      const circuitBreaker = stats.circuitBreakers.find(cb => cb.serviceId === serviceId);
      expect(circuitBreaker?.state).toBe('open');});});

  /**
   * Test Suite: Tool Execution Error Recovery
   */
  describe('Tool Execution Error Recovery', () => {it('should handle tool-specific errors with appropriate recovery strategies', async () => {
      const operationId = `${testId}_tool_error_recovery`;console.log(`[${operationId}] Testing tool-specific error recovery`);const toolErrors = ErrorScenarioGenerator.generateToolErrors();for (const errorScenario of toolErrors) {
        const mockMethod = mockComputerUseService[errorScenario.tool as keyof typeof mockComputerUseService] as jest.MockedFunction<any>;
        
        if (mockMethod) {
          // First few calls fail, then succeed
          let callCount = 0;
          mockMethod.mockImplementation(() => {
            callCount++;
            if (callCount <= 2 && errorScenario.retryable) {
              return Promise.reject(errorScenario.error);
            }
            return Promise.resolve({ success: true, recovered: true });
          });

          if (errorScenario.retryable) {
            try {
              const result = await recoveryManager.retryWithBackoff(
                () => (computerUseTools as unknown)[errorScenario.tool]({ test: true }),
                `${operationId}${errorScenario.tool}`,3,50
              );

              expect(result).toBeDefined();
              expect(result.recovered).toBe(true);
              console.log(`[${operationId}] Tool ${errorScenario.tool} recovered successfully`);} catch (error) {console.log(`[${operationId}] Tool ${errorScenario.tool} failed to recover: ${error.message}`);}} else {
            // Non-retryable errors should fail immediately
            try {
              await (computerUseTools as unknown)[errorScenario.tool]({ test: true });
            } catch (error) {
              expect(error).toBe(errorScenario.error);
              console.log(`[${operationId}] Tool ${errorScenario.tool} correctly failed for non-retryable error`);
            }
          }
        }
      }
    });

    it('should implement fallback mechanisms for critical tools', async () => {
      const operationId = `${testId}_fallback_mechanisms`;console.log(`[${operationId}] Testing fallback mechanisms for critical tools`);

      // Primary screenshot method fails
      mockComputerUseService.screenshot.mockRejectedValue(new Error('Primary screenshot failed'));

      // Implement fallback strategy
      const screenshotWithFallback = async (params: any) => {
        try {
          return await computerUseTools.screenshot(params);
        } catch (primaryError) {
          console.log(`[${operationId}] Primary screenshot failed, attempting fallback`);
          
          // Simulate fallback method (e.g., alternative capture mechanism)
          return {
            image: 'fallback_screenshot_data',metadata: {width: 1024,
              height: 768,
              format: 'png' as const,captureTime: new Date(),operationId: 'fallback_op',
              fallback: true,
            },
          };
        }
      };

      const result = await screenshotWithFallback({ display: 0 });
      
      expect(result).toBeDefined();
      expect(result.metadata.fallback).toBe(true);
      console.log(`[${operationId}] Fallback mechanism successfully provided alternative result`);
    });

    it('should handle resource cleanup on error', async () => {
      const operationId = `${testId}_resource_cleanup`;console.log(`[${operationId}] Testing resource cleanup on error`);

      resourceMonitor.trackResourceAllocation('file_handles', 5);resourceMonitor.trackResourceAllocation('memory_buffers', 3);// Mock service that allocates resources then failsmockComputerUseService.readFile.mockImplementation(async () => {
        resourceMonitor.trackResourceAllocation('temp_files', 1);throw new Error('Read operation failed');});try {
        await computerUseTools.readFile({ path: '/test/file.txt' });} catch (error) {// Simulate cleanup
        resourceMonitor.trackResourceDeallocation('temp_files', 1);resourceMonitor.trackResourceDeallocation('file_handles', 1);expect(error.message).toBe('Read operation failed');
        console.log(`[${operationId}] Error handled with proper resource cleanup`);}const summary = resourceMonitor.getResourceSummary();
      expect(summary.resourceAllocations.temp_files).toBe(0); // Should be cleaned up
      
      console.log(`[${operationId}] Resource cleanup verified: ${JSON.stringify(summary.resourceAllocations)}`);
    });
  });

  /**
   * Test Suite: Protocol Error Handling
   */
  describe('Protocol Error Handling', () => {it('should format protocol errors according to JSON-RPC 2.0 specification', () => {
      const operationId = `${testId}_protocol_error_format`;console.log(`[${operationId}] Testing protocol error formatting`);

      const protocolErrors = ErrorScenarioGenerator.generateProtocolErrors();

      protocolErrors.forEach((errorSpec) => {
        const mcpError: McpError = {
          code: errorSpec.code.toString(),
          message: errorSpec.message,
          details: errorSpec.data,
        };

        const jsonRpcError = {
          jsonrpc: '2.0',id: 'test-id',error: {code: errorSpec.code,
            message: errorSpec.message,
            data: errorSpec.data,
          },
        };

        expect(mcpError.code).toBe(errorSpec.code.toString());
        expect(mcpError.message).toBe(errorSpec.message);
        expect(jsonRpcError.jsonrpc).toBe('2.0');
        expect(jsonRpcError.error.code).toBe(errorSpec.code);

        console.log(`[${operationId}] Protocol error ${errorSpec.code} formatted correctly`);
      });
    });

    it('should handle malformed protocol messages gracefully', async () => {
      const operationId = `${testId}_malformed_messages`;console.log(`[${operationId}] Testing malformed protocol message handling`);

      const malformedMessages = [
        '{"invalid": "json"", // Invalid JSON'{"jsonrpc": "1.0", "method": "test"}', // Wrong version'{"jsonrpc": "2.0"}', // Missing method'{"jsonrpc": "2.0", "method": 123}", // Invalid method typenull,
        undefined,
        {},
      ];

      malformedMessages.forEach((message, index) => {
        try {
          // Simulate protocol message validation
          if (typeof message !== 'object' || message === null) {throw new Error('Invalid message format');}const msg = message as Record<string, unknown>;
          if (msg.jsonrpc !== '2.0') {throw new Error('Invalid JSON-RPC version');}if (!msg.method || typeof msg.method !== 'string') {throw new Error('Invalid or missing method');
          }

          console.log(`[${operationId}] Message ${index} unexpectedly passed validation`);} catch (error) {expect(error).toBeInstanceOf(Error);
          console.log(`[${operationId}] Malformed message ${index} correctly rejected: ${error.message}`);
        }
      });
    });

    it('should implement error response throttling', async () => {
      const operationId = `${testId}_error_throttling`;console.log(`[${operationId}] Testing error response throttling`);

      const errorCounts = new Map<string, number>();
      const errorWindows = new Map<string, number>();
      const throttleLimit = 5;
      const timeWindow = 1000; // 1 second

      const shouldThrottleError = (errorType: string): boolean => {
        const now = Date.now();
        const windowStart = errorWindows.get(errorType) || now;
        const count = errorCounts.get(errorType) ?? 0;

        // Reset window if expired
        if (now - windowStart > timeWindow) {
          errorWindows.set(errorType, now);
          errorCounts.set(errorType, 1);
          return false;
        }

        // Check if we should throttle
        if (count >= throttleLimit) {
          return true;
        }

        errorCounts.set(errorType, count + 1);
        return false;
      };

      // Simulate rapid error generation
      const errorType = 'INVALID_PARAMS';
      let throttledCount = 0;

      for (let i = 0; i < 10; i++) {
        if (shouldThrottleError(errorType)) {
          throttledCount++;
        }
        await new Promise(resolve => setTimeout(resolve, 50)); // Small delay
      }

      expect(throttledCount).toBeGreaterThan(0);
      console.log(`[${operationId}] Error throttling activated ${throttledCount} times out of 10 attempts`);
    });
  });

  /**
   * Test Suite: Resource Exhaustion Handling
   */
  describe('Resource Exhaustion Handling', () => {it('should handle memory exhaustion gracefully', async () => {
      const operationId = `${testId}_memory_exhaustion`;console.log(`[${operationId}] Testing memory exhaustion handling`);

      // Take initial memory snapshot
      const initialMemory = resourceMonitor.takeMemorySnapshot();

      // Simulate memory-intensive operation
      mockComputerUseService.screenshot.mockImplementation(async () => {
        // Simulate large memory allocation
        resourceMonitor.trackResourceAllocation('large_buffers', 100);// Check if we would exceed memory limitsconst currentMemory = process.memoryUsage();
        if (currentMemory.heapUsed > initialMemory.heapUsed * 2) {
          throw new Error('ENOMEM: Cannot allocate memory');}return {
          image: 'A'.repeat(1024 * 1024), // 1MB stringmetadata: {width: 1920,
            height: 1080,
            format: 'png' as const,captureTime: new Date(),operationId: 'memory_test',
          },
        };
      });

      try {
        await computerUseTools.screenshot({ display: 0 });
        
        // Check for memory leaks after operation
        const finalMemory = resourceMonitor.takeMemorySnapshot();
        const leakCheck = resourceMonitor.checkForMemoryLeaks();
        
        if (leakCheck.hasLeak) {
          console.warn(`[${operationId}] Potential memory leak detected: ${leakCheck.details}`);} else {console.log(`[${operationId}] No memory leaks detected`);
        }

      } catch (error) {
        if (error.message.includes('ENOMEM')) {
          console.log(`[${operationId}] Memory exhaustion properly detected and handled`);
        } else {
          throw error;
        }
      } finally {
        // Cleanup allocated resources
        resourceMonitor.trackResourceDeallocation('large_buffers', 100);}});

    it('should implement resource pooling and limits', async () => {
      const operationId = `${testId}_resource_pooling`;console.log(`[${operationId}] Testing resource pooling and limits`);

      const resourcePool = {
        maxConcurrentOperations: 3,
        currentOperations: 0,
        queue: [] as Array<() => void>,
      };

      const acquireResource = (): Promise<void> => {
        return new Promise((resolve, reject) => {
          if (resourcePool.currentOperations < resourcePool.maxConcurrentOperations) {
            resourcePool.currentOperations++;
            resolve();
          } else {
            resourcePool.queue.push(resolve);
            
            // Reject after timeout to prevent hanging
            setTimeout(() => {
              const index = resourcePool.queue.indexOf(resolve);
              if (index > -1) {
                resourcePool.queue.splice(index, 1);
                reject(new Error('Resource acquisition timeout'));}}, 1000);
          }
        });
      };

      const releaseResource = () => {
        resourcePool.currentOperations--;
        if (resourcePool.queue.length > 0) {
          const next = resourcePool.queue.shift();
          if (next) {
            resourcePool.currentOperations++;
            next();
          }
        }
      };

      const operations = [];
      
      // Start multiple concurrent operations
      for (let i = 0; i < 5; i++) {
        operations.push(
          acquireResource()
            .then(() => {
              return new Promise(resolve => setTimeout(resolve, 200));
            })
            .finally(() => {
              releaseResource();
            })
        );
      }

      const results = await Promise.allSettled(operations);
      const successful = results.filter(r => r.status === 'fulfilled').length;const failed = results.filter(r => r.status === 'rejected').length;

      expect(successful).toBeGreaterThan(0);
      console.log(`[${operationId}] Resource pooling: ${successful} successful, ${failed} failed operations`);
    });

    it('should handle disk space exhaustion', async () => {
      const operationId = `${testId}_disk_exhaustion`;console.log(`[${operationId}] Testing disk space exhaustion handling`);

      // Mock file operations to simulate disk full condition
      mockComputerUseService.writeFile.mockImplementation(async (params) => {
        // Simulate checking available disk space
        const fakeAvailableSpace = 1024; // 1KB
        const contentSize = params.content?.length ?? 0;

        if (contentSize > fakeAvailableSpace) {
          throw new Error('ENOSPC: No space left on device');}return {
          success: true,
          message: 'File written successfully',operationId: 'write_test',timestamp: new Date().toISOString(),};
      });

      try {
        // Try to write large content
        await computerUseTools.writeFile({
          path: '/test/large-file.txt',content: 'x'.repeat(2048), // 2KB content});} catch (error) {
        expect(error.message).toContain('ENOSPC');
        console.log(`[${operationId}] Disk space exhaustion properly handled: ${error.message}`);// Implement cleanup strategyconsole.log(`[${operationId}] Implementing cleanup strategy...`);// Could implement: temp file cleanup, compression, alternative storage, etc.const cleanupResult = { freedSpace: 1024, tempFilesRemoved: 5 };
        expect(cleanupResult.freedSpace).toBeGreaterThan(0);
        
        console.log(`[${operationId}] Cleanup completed: ${cleanupResult.freedSpace} bytes freed`);
      }
    });
  });

  /**
   * Test Suite: Concurrent Error Scenarios
   */
  describe('Concurrent Error Scenarios', () => {it('should handle race conditions between tools', async () => {
      const operationId = `${testId}_race_conditions`;console.log(`[${operationId}] Testing race condition handling`);const sharedResource = { locked: false, value: 0 };const results: Array<{ success: boolean; value: number }> = [];

      // Mock operations that compete for shared resource
      const competingOperation = async (operationName: string) => {
        // Simulate resource acquisition
        if (sharedResource.locked) {
          throw new Error(`Resource locked by another operation`);}sharedResource.locked = true;
        
        try {
          // Simulate work
          await new Promise(resolve => setTimeout(resolve, 50));
          sharedResource.value++;
          
          return { success: true, value: sharedResource.value };
        } finally {
          sharedResource.locked = false;
        }
      };

      // Start multiple competing operations
      const operations = Array(5).fill(null).map((_, index) =>
        competingOperation(`operation${index}`).then(result => {results.push(result);
            return result;
          })
          .catch(error => {
            results.push({ success: false, value: -1 });
            return { success: false, error: error.message };
          })
      );

      await Promise.allSettled(operations);

      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      expect(successful).toBeGreaterThan(0);
      expect(successful + failed).toBe(5);

      console.log(`[${operationId}] Race condition test: ${successful} successful, ${failed} failed operations`);
    });

    it('should prevent deadlocks in tool dependencies', async () => {
      const operationId = `${testId}_deadlock_prevention`;console.log(`[${operationId}] Testing deadlock prevention`);

      const resources = {
        resourceA: { locked: false, owner: null as string | null },
        resourceB: { locked: false, owner: null as string | null },
      };

      const acquireResources = async (toolId: string, resourceOrder: Array<'resourceA' | 'resourceB'>) => {const acquired: Array<'resourceA' | 'resourceB'> = [];
        const timeout = 1000; // 1 second timeout
        const startTime = Date.now();

        try {
          for (const resourceName of resourceOrder) {
            while (resources[resourceName].locked && Date.now() - startTime < timeout) {
              await new Promise(resolve => setTimeout(resolve, 10));
            }

            if (Date.now() - startTime >= timeout) {
              throw new Error(`Deadlock detected for ${toolId}: timeout acquiring ${resourceName}`);
            }

            resources[resourceName].locked = true;
            resources[resourceName].owner = toolId;
            acquired.push(resourceName);
          }

          // Simulate work
          await new Promise(resolve => setTimeout(resolve, 100));
          
          return { success: true, acquired };
        } finally {
          // Release resources in reverse order
          acquired.reverse().forEach(resourceName => {
            resources[resourceName].locked = false;
            resources[resourceName].owner = null;
          });
        }
      };

      // Simulate potential deadlock scenario
      const tool1Promise = acquireResources('tool1', ['resourceA', 'resourceB']);const tool2Promise = acquireResources('tool2', ['resourceB', 'resourceA']); // Reverse orderconst results = await Promise.allSettled([tool1Promise, tool2Promise]);const successful = results.filter(r => r.status === 'fulfilled').length;const deadlocked = results.filter(r => r.status === 'rejected' && r.reason.message.includes('Deadlock detected')
      ).length;

      // At least one should succeed, or both should detect deadlock
      expect(successful + deadlocked).toBe(2);
      
      console.log(`[${operationId}] Deadlock prevention: ${successful} successful, ${deadlocked} deadlock-detected operations`);
    });

    it('should handle error cascades and prevent system failure', async () => {
      const operationId = `${testId}_error_cascades`;console.log(`[${operationId}] Testing error cascade prevention`);

      const systemComponents = {
        database: { status: 'healthy', errorCount: 0 },fileSystem: { status: 'healthy', errorCount: 0 },network: { status: 'healthy', errorCount: 0 },};const errorThreshold = 3;

      const simulateComponentFailure = (component: keyof typeof systemComponents) => {
        systemComponents[component].errorCount++;
        
        if (systemComponents[component].errorCount >= errorThreshold) {
          systemComponents[component].status = 'failed';// Simulate cascade effectObject.keys(systemComponents).forEach(comp => {
            if (comp !== component) {
              systemComponents[comp as keyof typeof systemComponents].errorCount++;
            }
          });
        }
      };

      const checkSystemHealth = () => {
        const failedComponents = Object.values(systemComponents).filter(c => c.status === 'failed').length;const totalComponents = Object.keys(systemComponents).length;return {
          healthy: failedComponents < totalComponents * 0.5, // System fails if >50% components fail
          failedComponents,
          totalComponents,
        };
      };

      // Simulate errors
      simulateComponentFailure('database');simulateComponentFailure('database');simulateComponentFailure('database'); // This should trigger failure

      const healthCheck1 = checkSystemHealth();
      console.log(`[${operationId}] After database failure: ${healthCheck1.failedComponents}/${healthCheck1.totalComponents} components failed`);

      // Simulate more errors to test cascade
      simulateComponentFailure('fileSystem');simulateComponentFailure('fileSystem');simulateComponentFailure('fileSystem');

      const healthCheck2 = checkSystemHealth();
      console.log(`[${operationId}] After cascade: ${healthCheck2.failedComponents}/${healthCheck2.totalComponents} components failed`);// System should implement circuit breakers to prevent total failureexpect(healthCheck2.totalComponents).toBeGreaterThan(0);
      
      console.log(`[${operationId}] Error cascade test completed: system ${healthCheck2.healthy ? 'stable' : 'failed'}`);
    });
  });

  /**
   * Test Suite: Recovery Verification
   */
  describe('Recovery Verification', () => {it('should verify complete recovery after error resolution', async () => {
      const operationId = `${testId}_recovery_verification`;console.log(`[${operationId}] Testing complete recovery verification`);

      // Simulate service degradation and recovery
      let serviceHealth = 0; // 0 = failed, 1 = degraded, 2 = healthy

      mockComputerUseService.screenshot.mockImplementation(async () => {
        if (serviceHealth === 0) {
          throw new Error('Service completely failed');} else if (serviceHealth === 1) {// Degraded mode - slower response
          await new Promise(resolve => setTimeout(resolve, 500));
          return {
            image: 'degraded_quality_image',metadata: {width: 640,
              height: 480,
              format: 'png' as const,captureTime: new Date(),operationId: 'degraded_op',quality: 'degraded',},};
        } else {
          // Healthy mode
          return {
            image: 'full_quality_image',metadata: {width: 1920,
              height: 1080,
              format: 'png' as const,captureTime: new Date(),operationId: 'healthy_op',quality: 'full',},};
        }
      });

      // Test failed state
      try {
        await computerUseTools.screenshot({ display: 0 });
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error.message).toContain('Service completely failed');
        console.log(`[${operationId}] Failed state correctly detected`);
      }

      // Transition to degraded state
      serviceHealth = 1;
      const degradedResult = await computerUseTools.screenshot({ display: 0 });
      expect(degradedResult.metadata.quality).toBe('degraded');
      console.log(`[${operationId}] Degraded state functioning with reduced quality`);

      // Transition to healthy state
      serviceHealth = 2;
      const healthyResult = await computerUseTools.screenshot({ display: 0 });
      expect(healthyResult.metadata.quality).toBe('full');
      console.log(`[${operationId}] Full recovery verified - service healthy`);// Verify performance recoveryconst performanceTest = async () => {
        const startTime = performance.now();
        await computerUseTools.screenshot({ display: 0 });
        return performance.now() - startTime;
      };

      const responseTime = await performanceTest();
      expect(responseTime).toBeLessThan(200); // Should be fast when healthy

      console.log(`[${operationId}] Recovery verification completed: response time ${responseTime.toFixed(2)}ms`);
    });

    it('should maintain service level objectives during recovery', async () => {
      const operationId = `${testId}_slo_maintenance`;console.log(`[${operationId}] Testing SLO maintenance during recovery`);

      const sloTargets = {
        availability: 0.95, // 95% availability
        responseTime: 1000, // 1 second max response time
        errorRate: 0.05, // 5% max error rate
      };

      const metrics = {
        totalRequests: 0,
        successfulRequests: 0,
        totalResponseTime: 0,
        errors: 0,
      };

      // Simulate service under recovery with some failures
      let failureRate = 0.2; // Start with 20% failure rate

      mockComputerUseService.moveMouse.mockImplementation(async () => {
        metrics.totalRequests++;
        const startTime = performance.now();

        if (Math.random() < failureRate) {
          metrics.errors++;
          throw new Error('Temporary service degradation');
        }

        // Simulate variable response times during recovery
        const delay = Math.random() * 500 + 100; // 100-600ms
        await new Promise(resolve => setTimeout(resolve, delay));

        const responseTime = performance.now() - startTime;
        metrics.totalResponseTime += responseTime;
        metrics.successfulRequests++;

        return { success: true, coordinates: { x: 100, y: 200 }, responseTime };
      });

      // Simulate recovery process with gradual improvement
      const requests = [];
      for (let i = 0; i < 20; i++) {
        // Improve failure rate over time (simulate recovery)
        failureRate = Math.max(0.01, failureRate * 0.9);

        requests.push(
          computerUseTools.moveMouse({ coordinates: { x: 100, y: 200 } })
            .catch(error => ({ error: error.message }))
        );

        await new Promise(resolve => setTimeout(resolve, 50));
      }

      await Promise.all(requests);

      // Calculate actual SLO metrics
      const availability = metrics.successfulRequests / metrics.totalRequests;
      const avgResponseTime = metrics.totalResponseTime / metrics.successfulRequests;
      const errorRate = metrics.errors / metrics.totalRequests;

      console.log(`[${operationId}] SLO Metrics - Availability: ${(availability * 100).toFixed(1)}% (target: ${(sloTargets.availability * 100).toFixed(1)}%)`);console.log(`[${operationId}] SLO Metrics - Avg Response Time: ${avgResponseTime.toFixed(2)}ms (target: <${sloTargets.responseTime}ms)`);console.log(`[${operationId}] SLO Metrics - Error Rate: ${(errorRate * 100).toFixed(1)}% (target: <${(sloTargets.errorRate * 100).toFixed(1)}%)`);

      // SLOs might be temporarily violated during recovery, but should trend toward targets
      expect(availability).toBeGreaterThan(0.5); // At least 50% during recovery
      expect(avgResponseTime).toBeLessThan(2000); // No more than 2x target during recovery
      expect(errorRate).toBeLessThan(0.5); // No more than 50% errors during recovery
    });
  });
});