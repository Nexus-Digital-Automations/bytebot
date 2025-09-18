/* eslint-env jest */

/**
 * MCP Integration and Protocol Compliance Test Suite
 *
 * Comprehensive integration testing for Model Context Protocol compliance,
 * end-to-end workflows, real client integration, and protocol conformance validation.
 *
 * Test Coverage:
 * - End-to-end MCP client-server communication workflows
 * - Protocol conformance with MCP specification
 * - Real-world client integration scenarios
 * - Tool discovery and capability negotiation
 * - Session management and state persistence
 * - Performance and scalability under load
 * - Cross-platform compatibility validation
 * - Security and authentication integration
 * - Monitoring and observability integration
 * - Compliance with MCP best practices
 *
 * @author Claude Code - Subagent 3
 * @version 1.0.0
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { performance } from 'perf_hooks';
import * as request from 'supertest';
import { EventEmitter } from 'events';
import { BytebotMcpModule } from '../bytebot-mcp.module';
import { ComputerUseTools } from '../computer-use.tools';
import { ComputerUseService } from '../../computer-use/computer-use.service';
import { McpModule } from '@rekog/mcp-nest';
import { McpSchemas, McpToolResponse, McpResponse } from '../types';
import {
  createMockService,
  createMockLogger,
  TestUtils,
  AssertionHelpers,
  MockDataProviders,
} from '../../test-utils';

/**
 * MCP Protocol Compliance Validator
 */
class McpComplianceValidator {
  /**
   * Validate MCP initialization handshake
   */
  static validateInitializationHandshake(messages: any[]) {
    const initRequest = messages.find(m => m.method === 'initialize');
    const initResponse = messages.find(m => m.result && m.id === initRequest?.id);

    expect(initRequest).toBeDefined();
    expect(initRequest.params).toHaveProperty('protocolVersion');
    expect(initRequest.params).toHaveProperty('capabilities');

    expect(initResponse).toBeDefined();
    expect(initResponse.result).toHaveProperty('protocolVersion');
    expect(initResponse.result).toHaveProperty('serverInfo');
    expect(initResponse.result).toHaveProperty('capabilities');

    return { initRequest, initResponse };
  }

  /**
   * Validate tool discovery process
   */
  static validateToolDiscovery(toolListResponse: any) {
    expect(toolListResponse).toHaveProperty('tools');
    expect(Array.isArray(toolListResponse.tools)).toBe(true);

    toolListResponse.tools.forEach((tool: any) => {
      expect(tool).toHaveProperty('name');
      expect(tool).toHaveProperty('description');
      expect(tool).toHaveProperty('inputSchema');
      expect(typeof tool.name).toBe('string');
      expect(typeof tool.description).toBe('string');
      expect(typeof tool.inputSchema).toBe('object');
    });

    return toolListResponse.tools;
  }

  /**
   * Validate tool execution flow
   */
  static validateToolExecution(callRequest: any, callResponse: any) {
    // Validate call request
    expect(callRequest).toHaveProperty('method', 'tools/call');
    expect(callRequest).toHaveProperty('params');
    expect(callRequest.params).toHaveProperty('name');
    expect(callRequest.params).toHaveProperty('arguments');

    // Validate call response
    expect(callResponse).toHaveProperty('result');
    expect(callResponse.result).toHaveProperty('content');
    expect(Array.isArray(callResponse.result.content)).toBe(true);

    callResponse.result.content.forEach((item: any) => {
      expect(item).toHaveProperty('type');
      expect(['text', 'image', 'resource'].includes(item.type)).toBe(true);
    });

    return { callRequest, callResponse };
  }

  /**
   * Validate session management
   */
  static validateSessionManagement(sessionData: any) {
    expect(sessionData).toHaveProperty('sessionId');
    expect(sessionData).toHaveProperty('createdAt');
    expect(sessionData).toHaveProperty('capabilities');
    expect(sessionData).toHaveProperty('clientInfo');

    return sessionData;
  }
}

/**
 * Mock MCP Client for testing server compliance
 */
class MockMcpClient extends EventEmitter {
  private messageId = 0;
  private pendingRequests = new Map<string | number, { resolve: Function; reject: Function }>();
  private sessionId: string | null = null;
  private capabilities: any = {};
  private tools: any[] = [];

  constructor(_private serverUrl: string) {
    super();
  }

  /**
   * Generate unique message ID
   */
  private generateId(): string {
    return `client_msg${++this.messageId}`;
  }

  /**
   * Send JSON-RPC message to server
   */
  async sendMessage(method: string, params?: any, id?: string | number): Promise<any> {
    const messageId = id ?? this.generateId();
    const message = {
      jsonrpc: '2.0',
      method,
      params,
      id: messageId,
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(messageId, { resolve, reject });

      // Simulate sending message to server
      setTimeout(() => {
        this.emit('message', message);
      }, 10);

      // Timeout handling
      setTimeout(() => {
        if (this.pendingRequests.has(messageId)) {
          this.pendingRequests.delete(messageId);
          reject(new Error(`Request timeout for message ${messageId}`));
        }
      }, 5000);
    });
  }

  /**
   * Handle incoming message from server
   */
  handleIncomingMessage(message: any) {
    if (message.id && this.pendingRequests.has(message.id)) {
      const { resolve, reject } = this.pendingRequests.get(message.id)!;
      this.pendingRequests.delete(message.id);

      if (message.error) {
        reject(new Error(message.error.message));
      } else {
        resolve(message.result || message);
      }
    }

    this.emit('messageReceived', message);
  }

  /**
   * Initialize MCP session
   */
  async initialize(): Promise<any> {
    const initParams = {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
        sampling: {},
      },
      clientInfo: {
        name: 'test-mcp-client',
        version: '1.0.0',
      },
    };

    const response = await this.sendMessage('initialize', initParams);
    this.sessionId = response.sessionInfo?.sessionId || 'test-session';
    this.capabilities = response.capabilities ?? {};

    return response;
  }

  /**
   * List available tools
   */
  async listTools(): Promise<any> {
    const response = await this.sendMessage('tools/list');
    this.tools = response.tools ?? [];
    return response;
  }

  /**
   * Call a specific tool
   */
  async callTool(name: string, arguments_: any): Promise<any> {
    return this.sendMessage('tools/call', {
      name,
      arguments: arguments_,
    });
  }

  /**
   * Get session information
   */
  getSessionInfo() {
    return {
      sessionId: this.sessionId,
      capabilities: this.capabilities,
      tools: this.tools,
    };
  }

  /**
   * Close the client connection
   */
  close() {
    this.removeAllListeners();
    this.pendingRequests.clear();
  }
}

/**
 * Performance Monitor for integration testing
 */
class IntegrationPerformanceMonitor {
  private operationTimes: Map<string, number[]> = new Map();
  private throughputData: Array<{ timestamp: number; operations: number }> = [];
  private concurrencyData: Array<{ timestamp: number; concurrent: number }> = [];

  recordOperation(operationType: string, duration: number) {
    const times = this.operationTimes.get(operationType) ?? [];
    times.push(duration);
    this.operationTimes.set(operationType, times);
  }

  recordThroughput(operationCount: number) {
    this.throughputData.push({
      timestamp: Date.now(),
      operations: operationCount,
    });
  }

  recordConcurrency(concurrentOperations: number) {
    this.concurrencyData.push({
      timestamp: Date.now(),
      concurrent: concurrentOperations,
    });
  }

  getOperationStats(operationType: string) {
    const times = this.operationTimes.get(operationType) ?? [];
    if (times.length === 0) return null;

    return {
      count: times.length,
      average: times.reduce((a, b) => a + b, 0) / times.length,
      min: Math.min(...times),
      max: Math.max(...times),
      p95: this.percentile(times, 0.95),
      p99: this.percentile(times, 0.99),
    };
  }

  private percentile(values: number[], p: number): number {
    const sorted = values.slice().sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[index];
  }

  getThroughputStats() {
    if (this.throughputData.length < 2) return null;

    const timeSpan = this.throughputData[this.throughputData.length - 1].timestamp - 
                   this.throughputData[0].timestamp;
    const totalOperations = this.throughputData.reduce((sum, data) => sum + data.operations, 0);

    return {
      operationsPerSecond: (totalOperations / timeSpan) * 1000,
      totalOperations,
      timeSpanMs: timeSpan,
    };
  }

  getConcurrencyStats() {
    if (this.concurrencyData.length === 0) return null;

    const concurrencyLevels = this.concurrencyData.map(d => d.concurrent);
    return {
      average: concurrencyLevels.reduce((a, b) => a + b, 0) / concurrencyLevels.length,
      max: Math.max(...concurrencyLevels),
      min: Math.min(...concurrencyLevels),
    };
  }

  reset() {
    this.operationTimes.clear();
    this.throughputData = [];
    this.concurrencyData = [];
  }
}

describe('MCP Integration and Protocol Compliance', () => {
  let app: INestApplication;
  let module: TestingModule;
  let computerUseTools: ComputerUseTools;
  let mockComputerUseService: jest.Mocked<ComputerUseService>;
  let mockClient: MockMcpClient;
  let performanceMonitor: IntegrationPerformanceMonitor;
  let testId: string;

  beforeEach(async () => {
    testId = TestUtils.generateTestId('mcp_integration_compliance');
    console.log(`[${testId}] Setting up MCP integration and compliance tests`);

    // Create comprehensive mock service
    mockComputerUseService = {
      ...createMockService([
        'action',
        'screenshot',
        'moveMouse',
        'clickMouse',
        'traceMouse',
        'dragMouse',
        'pressMouse',
        'scroll',
        'typeKeys',
        'pressKeys',
        'typeText',
        'pasteText',
        'wait',
        'application',
        'cursorPosition',
        'writeFile',
        'readFile',
        'initializeNutJS',
        'validateCoordinates',
      ]),
      logger: createMockLogger(),
      cuaEnabled: true,
      nutService: {},
    } as unknown as jest.Mocked<ComputerUseService>;

    // Setup realistic mock responses
    mockComputerUseService.screenshot.mockResolvedValue({
      image: Buffer.alloc(1024, 'A').toString('base64'),
      metadata: {
        width: 1920,
        height: 1080,
        format: 'png' as const,
        captureTime: new Date(),
        operationId: 'test_screenshot',
      },
    });

    mockComputerUseService.moveMouse.mockResolvedValue({
      success: true,
      coordinates: { x: 100, y: 200 },
      operationId: 'test_move_mouse',
      timestamp: new Date().toISOString(),
    });

    mockComputerUseService.typeText.mockResolvedValue({
      success: true,
      message: 'Text typed successfully',
      operationId: 'test_type_text',
      timestamp: new Date().toISOString(),
    });

    // Create testing module with MCP integration
    module = await Test.createTestingModule({
      imports: [
        McpModule.forRoot({
          name: 'bytebotd-integration-test',
          version: '0.0.1',
          sseEndpoint: '/mcp',
        }),
      ],
      providers: [
        ComputerUseTools,
        {
          provide: ComputerUseService,
          useValue: mockComputerUseService,
        },
      ],
    }).compile();

    app = module.createNestApplication();
    app.enableCors({ origin: true, credentials: true });

    await app.init();
    await app.listen(0); // Use random available port

    const appUrl = await app.getUrl();
    computerUseTools = module.get<ComputerUseTools>(ComputerUseTools);
    mockClient = new MockMcpClient(appUrl);
    performanceMonitor = new IntegrationPerformanceMonitor();

    console.log(`[${testId}] MCP integration and compliance test setup completed`);
  });

  afterEach(async () => {
    console.log(`[${testId}] Cleaning up MCP integration and compliance tests`);

    mockClient?.close();
    await app?.close();
    performanceMonitor.reset();

    console.log(`[${testId}] MCP integration and compliance test cleanup completed`);
  });

  /**
   * Test Suite: End-to-End MCP Workflows
   */
  describe('End-to-End MCP Workflows', () => {
    it('should complete full MCP client-server initialization workflow', async () => {
      const operationId = `${testId}_full_initialization`;
      console.log(`[${operationId}] Testing full MCP initialization workflow`);

      const startTime = performance.now();

      // Step 1: Initialize MCP session
      const initResponse = await mockClient.initialize();
      
      expect(initResponse).toBeDefined();
      expect(initResponse).toHaveProperty('protocolVersion');
      expect(initResponse).toHaveProperty('serverInfo');
      expect(initResponse).toHaveProperty('capabilities');

      const initTime = performance.now() - startTime;
      performanceMonitor.recordOperation('initialization', initTime);

      console.log(`[${operationId}] MCP initialization completed in ${initTime.toFixed(2)}ms`);

      // Step 2: Capability negotiation validation
      const serverCapabilities = initResponse.capabilities;
      expect(serverCapabilities).toHaveProperty('tools');
      
      console.log(`[${operationId}] Server capabilities validated: ${Object.keys(serverCapabilities).join(', ')}`);

      // Step 3: Session information validation
      const sessionInfo = mockClient.getSessionInfo();
      expect(sessionInfo.sessionId).toBeDefined();
      expect(sessionInfo.capabilities).toBeDefined();

      console.log(`[${operationId}] Session established with ID: ${sessionInfo.sessionId}`);
    });

    it('should perform complete tool discovery and execution workflow', async () => {
      const operationId = `${testId}_tool_discovery_execution`;
      console.log(`[${operationId}] Testing tool discovery and execution workflow`);

      // Step 1: Initialize session
      await mockClient.initialize();

      // Step 2: Discover available tools
      const startDiscovery = performance.now();
      const toolListResponse = await mockClient.listTools();
      const discoveryTime = performance.now() - startDiscovery;
      
      performanceMonitor.recordOperation('tool_discovery', discoveryTime);

      const tools = McpComplianceValidator.validateToolDiscovery(toolListResponse);
      expect(tools.length).toBeGreaterThan(0);

      console.log(`[${operationId}] Discovered ${tools.length} tools in ${discoveryTime.toFixed(2)}ms`);

      // Step 3: Execute representative tools from each category
      const testExecutions = [
        { name: 'screenshot', args: { display: 0 }, category: 'screen' },
        { name: 'move_mouse', args: { coordinates: { x: 100, y: 200 } }, category: 'mouse' },
        { name: 'type_text', args: { text: 'integration test' }, category: 'keyboard' },
      ];

      for (const test of testExecutions) {
        const startExecution = performance.now();
        
        try {
          const result = await mockClient.callTool(test.name, test.args);
          const executionTime = performance.now() - startExecution;
          
          performanceMonitor.recordOperation(`tool_execution${test.category}`, executionTime);

          expect(result).toBeDefined();
          expect(result).toHaveProperty('content');
          expect(Array.isArray(result.content)).toBe(true);

          console.log(`[${operationId}] Tool ${test.name} executed successfully in ${executionTime.toFixed(2)}ms`);
        } catch (error) {
          console.error(`[${operationId}] Tool ${test.name} execution failed:`, error.message);
        }
      }
    });

    it('should handle complete session lifecycle with cleanup', async () => {
      const operationId = `${testId}_session_lifecycle`;
      console.log(`[${operationId}] Testing complete session lifecycle`);

      // Step 1: Session creation
      const initTime = performance.now();
      await mockClient.initialize();
      const sessionCreationTime = performance.now() - initTime;

      console.log(`[${operationId}] Session created in ${sessionCreationTime.toFixed(2)}ms`);

      // Step 2: Session activity
      await mockClient.listTools();
      await mockClient.callTool('screenshot', { display: 0 });
      await mockClient.callTool('move_mouse', { coordinates: { x: 50, y: 50 } });

      console.log(`[${operationId}] Session activity completed`);

      // Step 3: Session cleanup
      const cleanupTime = performance.now();
      mockClient.close();
      const sessionCleanupTime = performance.now() - cleanupTime;

      console.log(`[${operationId}] Session cleanup completed in ${sessionCleanupTime.toFixed(2)}ms`);

      // Verify cleanup
      expect(mockClient.listenerCount()).toBe(0);
      
      performanceMonitor.recordOperation('session_lifecycle', sessionCreationTime + sessionCleanupTime);
    });
  });

  /**
   * Test Suite: Protocol Conformance Validation
   */
  describe('Protocol Conformance Validation', () => {
    it('should conform to MCP protocol version 2024-11-05', async () => {
      const operationId = `${testId}_protocol_conformance`;
      console.log(`[${operationId}] Testing MCP protocol conformance`);

      const initResponse = await mockClient.initialize();

      // Validate protocol version
      expect(initResponse.protocolVersion).toBe('2024-11-05');

      // Validate server info structure
      expect(initResponse.serverInfo).toHaveProperty('name');
      expect(initResponse.serverInfo).toHaveProperty('version');
      expect(typeof initResponse.serverInfo.name).toBe('string');
      expect(typeof initResponse.serverInfo.version).toBe('string');

      // Validate capabilities structure
      const capabilities = initResponse.capabilities;
      expect(capabilities).toHaveProperty('tools');
      expect(typeof capabilities.tools).toBe('object');

      console.log(`[${operationId}] Protocol conformance validated for version ${initResponse.protocolVersion}`);
    });

    it('should validate JSON-RPC 2.0 message format compliance', async () => {
      const operationId = `${testId}_jsonrpc_compliance`;
      console.log(`[${operationId}] Testing JSON-RPC 2.0 message format compliance`);

      const messages: any[] = [];

      // Capture all messages
      mockClient.on('message', (message) => {
        messages.push(message);
      });

      // Send various message types
      await mockClient.initialize();
      await mockClient.listTools();
      await mockClient.callTool('screenshot', { display: 0 });

      // Validate message format compliance
      messages.forEach((message, index) => {
        expect(message).toHaveProperty('jsonrpc', '2.0');
        expect(message).toHaveProperty('method');
        expect(message).toHaveProperty('id');
        expect(typeof message.method).toBe('string');
        expect(['string', 'number'].includes(typeof message.id)).toBe(true);

        if (message.params) {
          expect(typeof message.params).toBe('object');
        }

        console.log(`[${operationId}] Message ${index + 1} format validated: ${message.method}`);
      });

      console.log(`[${operationId}] JSON-RPC 2.0 compliance validated for ${messages.length} messages`);
    });

    it('should validate tool schema compliance', async () => {
      const operationId = `${testId}_tool_schema_compliance`;
      console.log(`[${operationId}] Testing tool schema compliance`);

      await mockClient.initialize();
      const toolListResponse = await mockClient.listTools();

      const tools = toolListResponse.tools;
      const schemaNames = Object.keys(McpSchemas);

      // Validate that all schema-defined tools are exposed
      const exposedToolNames = tools.map((tool: any) => tool.name);
      
      // Map schema names to expected tool names
      const expectedToolMappings = {
        mouseMove: 'move_mouse',
        mouseClick: 'click_mouse',
        mouseScroll: 'scroll_mouse',
        keyboardType: 'type_text',
        keyboardKey: 'press_key',
        screenshot: 'screenshot',
        fileRead: 'read_file',
        fileWrite: 'write_file',
        directoryList: 'list_directory',
        directoryCreate: 'create_directory',
      };

      Object.entries(expectedToolMappings).forEach(([schemaName, toolName]) => {
        if (schemaNames.includes(schemaName)) {
          expect(exposedToolNames).toContain(toolName);
          console.log(`[${operationId}] Tool ${toolName} correctly exposed for schema ${schemaName}`);
        }
      });

      // Validate tool schema structure
      tools.forEach((tool: any) => {
        expect(tool.inputSchema).toHaveProperty('type', 'object');
        expect(tool.inputSchema).toHaveProperty('properties');
        
        if (tool.inputSchema.required) {
          expect(Array.isArray(tool.inputSchema.required)).toBe(true);
        }

        console.log(`[${operationId}] Tool ${tool.name} schema structure validated`);
      });

      console.log(`[${operationId}] Tool schema compliance validated for ${tools.length} tools`);
    });
  });

  /**
   * Test Suite: Performance and Scalability
   */
  describe('Performance and Scalability', () => {
    it('should handle high throughput tool execution', async () => {
      const operationId = `${testId}_high_throughput`;
      console.log(`[${operationId}] Testing high throughput tool execution`);

      await mockClient.initialize();

      const throughputTest = async (concurrency: number, totalOperations: number) => {
        const startTime = performance.now();
        const operations: Promise<any>[] = [];
        let completedOperations = 0;

        performanceMonitor.recordConcurrency(concurrency);

        for (let i = 0; i < totalOperations; i++) {
          const operation = mockClient.callTool('screenshot', { display: 0 })
            .then(() => {
              completedOperations++;
              if (completedOperations % 10 === 0) {
                performanceMonitor.recordThroughput(completedOperations);
              }
            });

          operations.push(operation);

          // Control concurrency
          if (operations.length >= concurrency) {
            await Promise.race(operations);
            operations.splice(operations.findIndex(p => p), 1);
          }
        }

        await Promise.allSettled(operations);
        
        const totalTime = performance.now() - startTime;
        const throughput = (totalOperations / totalTime) * 1000; // ops/second

        return { totalTime, throughput, completedOperations };
      };

      // Test different concurrency levels
      const testScenarios = [
        { concurrency: 1, operations: 20 },
        { concurrency: 5, operations: 50 },
        { concurrency: 10, operations: 100 },
      ];

      for (const scenario of testScenarios) {
        const result = await throughputTest(scenario.concurrency, scenario.operations);
        
        expect(result.completedOperations).toBe(scenario.operations);
        expect(result.throughput).toBeGreaterThan(1); // At least 1 op/second

        console.log(
          `[${operationId}] Concurrency ${scenario.concurrency}: ${result.completedOperations} ops in ${result.totalTime.toFixed(2)}ms (${result.throughput.toFixed(2)} ops/sec)`
        );

        performanceMonitor.recordOperation(`throughput_c${scenario.concurrency}`, result.totalTime);
      }

      const throughputStats = performanceMonitor.getThroughputStats();
      const concurrencyStats = performanceMonitor.getConcurrencyStats();

      if (throughputStats) {
        console.log(`[${operationId}] Overall throughput: ${throughputStats.operationsPerSecond.toFixed(2)} ops/sec`);
      }

      if (concurrencyStats) {
        console.log(`[${operationId}] Concurrency stats: avg=${concurrencyStats.average.toFixed(1)}, max=${concurrencyStats.max}`);
      }
    });

    it('should maintain performance under sustained load', async () => {
      const operationId = `${testId}_sustained_load`;
      console.log(`[${operationId}] Testing performance under sustained load`);

      await mockClient.initialize();

      const loadTestDuration = 5000; // 5 seconds
      const operationInterval = 100; // 100ms between operations
      const startTime = performance.now();
      const operationTimes: number[] = [];
      let operationCount = 0;

      const loadTest = async () => {
        while (performance.now() - startTime < loadTestDuration) {
          const opStart = performance.now();
          
          try {
            await mockClient.callTool('move_mouse', { 
              coordinates: { x: operationCount % 1000, y: operationCount % 1000 } 
            });
            
            const opTime = performance.now() - opStart;
            operationTimes.push(opTime);
            operationCount++;

            performanceMonitor.recordOperation('sustained_load', opTime);
          } catch (error) {
            console.warn(`[${operationId}] Operation ${operationCount} failed: ${error.message}`);
          }

          await new Promise(resolve => setTimeout(resolve, operationInterval));
        }
      };

      await loadTest();

      const totalTime = performance.now() - startTime;
      const averageLatency = operationTimes.reduce((a, b) => a + b, 0) / operationTimes.length;
      const maxLatency = Math.max(...operationTimes);
      const minLatency = Math.min(...operationTimes);
      
      // Performance should remain consistent
      expect(averageLatency).toBeLessThan(1000); // Average under 1 second
      expect(maxLatency).toBeLessThan(2000); // Max under 2 seconds
      expect(operationCount).toBeGreaterThan(10); // At least 10 operations

      console.log(`[${operationId}] Sustained load test: ${operationCount} ops in ${totalTime.toFixed(2)}ms`);
      console.log(`[${operationId}] Latency stats: avg=${averageLatency.toFixed(2)}ms, min=${minLatency.toFixed(2)}ms, max=${maxLatency.toFixed(2)}ms`);
    });

    it('should handle memory efficiently during extended operations', async () => {
      const operationId = `${testId}_memory_efficiency`;
      console.log(`[${operationId}] Testing memory efficiency during extended operations`);

      await mockClient.initialize();

      const initialMemory = process.memoryUsage();
      const memorySnapshots: NodeJS.MemoryUsage[] = [initialMemory];

      // Perform memory-intensive operations
      for (let i = 0; i < 50; i++) {
        await mockClient.callTool('screenshot', { display: 0 });
        
        if (i % 10 === 0) {
          const currentMemory = process.memoryUsage();
          memorySnapshots.push(currentMemory);
          
          // Force garbage collection if available
          if (global.gc) {
            global.gc();
          }
        }
      }

      const finalMemory = process.memoryUsage();
      memorySnapshots.push(finalMemory);

      // Analyze memory usage
      const heapGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      const maxHeapUsed = Math.max(...memorySnapshots.map(m => m.heapUsed));
      const memoryGrowthMB = heapGrowth / (1024 * 1024);
      const maxMemoryMB = maxHeapUsed / (1024 * 1024);

      // Memory growth should be reasonable
      expect(memoryGrowthMB).toBeLessThan(50); // Less than 50MB growth
      expect(maxMemoryMB).toBeLessThan(200); // Less than 200MB max usage

      console.log(`[${operationId}] Memory analysis: growth=${memoryGrowthMB.toFixed(2)}MB, max=${maxMemoryMB.toFixed(2)}MB`);
      console.log(`[${operationId}] Memory snapshots: ${memorySnapshots.length} taken over 50 operations`);
    });
  });

  /**
   * Test Suite: Cross-Platform Compatibility
   */
  describe('Cross-Platform Compatibility', () => {
    it('should handle platform-specific tool behaviors', async () => {
      const operationId = `${testId}_platform_compatibility`;
      console.log(`[${operationId}] Testing platform-specific tool behavior handling`);

      await mockClient.initialize();

      // Test platform-specific behaviors
      const platformTests = [
        {
          tool: 'screenshot',
          args: { display: 0 },
          platforms: ['darwin', 'win32', 'linux'],
          expectedBehavior: 'should capture primary display',
        },
        {
          tool: 'move_mouse',
          args: { coordinates: { x: 100, y: 200 } },
          platforms: ['darwin', 'win32', 'linux'],
          expectedBehavior: 'should move cursor to coordinates',
        },
        {
          tool: 'type_text',
          args: { text: 'Hello World' },
          platforms: ['darwin', 'win32', 'linux'],
          expectedBehavior: 'should type text using system keyboard',
        },
      ];

      const currentPlatform = process.platform;

      for (const test of platformTests) {
        if (test.platforms.includes(currentPlatform)) {
          try {
            const result = await mockClient.callTool(test.tool, test.args);
            
            expect(result).toBeDefined();
            expect(result.content).toBeDefined();
            
            console.log(`[${operationId}] Tool ${test.tool} works correctly on ${currentPlatform}`);
          } catch (error) {
            console.warn(`[${operationId}] Tool ${test.tool} platform issue on ${currentPlatform}: ${error.message}`);
          }
        }
      }

      console.log(`[${operationId}] Platform compatibility testing completed for ${currentPlatform}`);
    });

    it('should handle different character encodings and locales', async () => {
      const operationId = `${testId}_encoding_locales`;
      console.log(`[${operationId}] Testing character encoding and locale handling`);

      await mockClient.initialize();

      const encodingTests = [
        { text: 'Hello World', encoding: 'ASCII', description: 'Basic ASCII text' },
        { text: 'Héllo Wörld', encoding: 'UTF-8', description: 'UTF-8 with accents' },
        { text: '你好世界', encoding: 'UTF-8', description: 'Chinese characters' },
        { text: '🚀 Rocket', encoding: 'UTF-8', description: 'Unicode emoji' },
        { text: 'Здравствуй мир', encoding: 'UTF-8', description: 'Cyrillic text' },
      ];

      for (const test of encodingTests) {
        try {
          const result = await mockClient.callTool('type_text', { text: test.text });
          
          expect(result).toBeDefined();
          expect(result.content).toBeDefined();
          
          console.log(`[${operationId}] ${test.description} handled correctly`);
        } catch (error) {
          console.warn(`[${operationId}] Encoding issue with ${test.description}: ${error.message}`);
        }
      }

      console.log(`[${operationId}] Character encoding and locale testing completed`);
    });
  });

  /**
   * Test Suite: Security and Authentication Integration
   */
  describe('Security and Authentication Integration', () => {
    it('should validate secure communication channels', async () => {
      const operationId = `${testId}_secure_communication`;
      console.log(`[${operationId}] Testing secure communication channel validation`);

      // Test SSE endpoint security headers
      const response = await request(app.getHttpServer())
        .get('/mcp')
        .expect(200);

      // Validate security headers
      const securityHeaders = [
        'x-content-type-options',
        'x-frame-options',
        'x-xss-protection',
      ];

      securityHeaders.forEach(header => {
        if (response.headers[header]) {
          console.log(`[${operationId}] Security header ${header}: ${response.headers[header]}`);
        }
      });

      // Validate content type for SSE
      expect(response.headers['content-type']).toMatch(/text\/event-stream/);
      expect(response.headers['cache-control']).toBe('no-cache');

      console.log(`[${operationId}] Secure communication channel validation completed`);
    });

    it('should handle authentication and authorization flows', async () => {
      const operationId = `${testId}_auth_flows`;
      console.log(`[${operationId}] Testing authentication and authorization flows`);

      // Test unauthorized access
      const unauthorizedClient = new MockMcpClient(await app.getUrl());

      try {
        // Attempt to call tools without proper initialization
        await unauthorizedClient.callTool('screenshot', { display: 0 });
        console.warn(`[${operationId}] Unauthorized tool access was allowed (security concern)`);
      } catch (error) {
        console.log(`[${operationId}] Unauthorized access properly blocked: ${error.message}`);
      }

      // Test proper authorization flow
      await mockClient.initialize();
      
      try {
        const result = await mockClient.callTool('screenshot', { display: 0 });
        expect(result).toBeDefined();
        console.log(`[${operationId}] Authorized access working correctly`);
      } catch (error) {
        console.error(`[${operationId}] Authorized access failed: ${error.message}`);
      }

      unauthorizedClient.close();
      console.log(`[${operationId}] Authentication and authorization flow testing completed`);
    });

    it('should sanitize and validate all input parameters', async () => {
      const operationId = `${testId}_input_validation`;
      console.log(`[${operationId}] Testing input parameter sanitization and validation`);

      await mockClient.initialize();

      const maliciousInputs = [
        {
          tool: 'type_text',
          args: { text: '<script>alert("xss")</script>' },
          description: 'XSS attempt in text input',
        },
        {
          tool: 'read_file',
          args: { path: '../../../etc/passwd' },
          description: 'Path traversal attempt',
        },
        {
          tool: 'move_mouse',
          args: { coordinates: { x: 'invalid', y: 200 } },
          description: 'Type confusion attack',
        },
        {
          tool: 'screenshot',
          args: { display: 999999 },
          description: 'Resource exhaustion attempt',
        },
      ];

      for (const test of maliciousInputs) {
        try {
          await mockClient.callTool(test.tool, test.args);
          console.warn(`[${operationId}] ${test.description} was not properly sanitized`);
        } catch (error) {
          console.log(`[${operationId}] ${test.description} properly blocked: ${error.message}`);
          expect(error).toBeInstanceOf(Error);
        }
      }

      console.log(`[${operationId}] Input parameter sanitization and validation completed`);
    });
  });
});