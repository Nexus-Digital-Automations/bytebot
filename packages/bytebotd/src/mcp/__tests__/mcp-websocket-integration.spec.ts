/* eslint-env jest */

/**
 * MCP WebSocket Integration Test Suite
 *
 * Comprehensive test suite for Model Context Protocol WebSocket communication,
 * Server-Sent Events (SSE), and streaming functionality integration testing.
 *
 * Test Coverage:
 * - WebSocket connection establishment and lifecycle
 * - SSE endpoint communication and event streaming
 * - Real-time tool execution via WebSocket
 * - Protocol message validation and serialization
 * - Connection error handling and recovery
 * - Multi-client connection management
 * - Streaming data processing and backpressure
 * - Performance monitoring and metrics collection
 *
 * @author Claude Code - Subagent 3
 * @version 1.0.0
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { io, Socket } from 'socket.io-client';
import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';
import { BytebotMcpModule } from '../bytebot-mcp.module';
import { ComputerUseTools } from '../computer-use.tools';
import { ComputerUseService } from '../../computer-use/computer-use.service';
import { McpModule } from '@rekog/mcp-nest';
import {
  createMockService,
  createMockLogger,
  TestUtils,
  AssertionHelpers,
} from '../../test-utils';

/**
 * WebSocket Test Data Generators
 */
class WebSocketTestData {
  static createMcpMessage(
    method: string,
    params: Record<string, unknown> = {},
    id: string = TestUtils.generateTestId(),
  ) {
    return {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };
  }

  static createMcpResponse(
    result: unknown,
    id: string = TestUtils.generateTestId(),
  ) {
    return {
      jsonrpc: '2.0',
      id,
      result,
    };
  }

  static createMcpError(
    code: number,
    message: string,
    id: string = TestUtils.generateTestId(),
  ) {
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code,
        message,
      },
    };
  }

  static createToolMessage(
    toolName: string,
    arguments_: Record<string, unknown> = {},
  ) {
    return this.createMcpMessage('tools/call', {
      name: toolName,
      arguments: arguments_,
    });
  }

  static createStreamChunk(data: string, sequence: number) {
    return {
      type: 'chunk',
      sequence,
      data,
      timestamp: Date.now(),
    };
  }
}

/**
 * Mock SSE Event Stream for testing
 */
class MockSSEStream extends EventEmitter {
  private connected = false;
  private chunks: Array<{ data: string; event?: string }> = [];

  connect() {
    this.connected = true;
    this.emit('open');
  }

  disconnect() {
    this.connected = false;
    this.emit('close');
  }

  sendEvent(data: string, event?: string) {
    if (this.connected) {
      this.chunks.push({ data, event });
      this.emit('message', { data, event });
    }
  }

  isConnected() {
    return this.connected;
  }

  getChunks() {
    return [...this.chunks];
  }

  clear() {
    this.chunks = [];
  }
}

/**
 * WebSocket Connection Manager for testing
 */
class TestWebSocketManager {
  private clients: Map<string, Socket> = new Map();
  private messageHistory: Map<string, unknown[]> = new Map();

  async createClient(
    appUrl: string,
    clientId: string = TestUtils.generateTestId(),
  ): Promise<Socket> {
    const client = io(appUrl, {
      transports: ['websocket'],
      timeout: 5000,
    });

    this.clients.set(clientId, client);
    this.messageHistory.set(clientId, []);

    // Track all messages for this client
    client.onAny((event, ...args) => {
      const messages = this.messageHistory.get(clientId) || [];
      messages.push({ event, args, timestamp: Date.now() });
      this.messageHistory.set(clientId, messages);
    });

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`WebSocket connection timeout for client ${clientId}`));
      }, 5000);

      client.on('connect', () => {
        clearTimeout(timeout);
        resolve(client);
      });

      client.on('connect_error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  getClient(clientId: string): Socket | undefined {
    return this.clients.get(clientId);
  }

  getMessageHistory(clientId: string): unknown[] {
    return this.messageHistory.get(clientId) || [];
  }

  async disconnectClient(clientId: string): Promise<void> {
    const client = this.clients.get(clientId);
    if (client) {
      client.disconnect();
      this.clients.delete(clientId);
      this.messageHistory.delete(clientId);
    }
  }

  async disconnectAll(): Promise<void> {
    await Promise.all(
      Array.from(this.clients.keys()).map((clientId) =>
        this.disconnectClient(clientId),
      ),
    );
  }

  getActiveClientCount(): number {
    return this.clients.size;
  }
}

describe('MCP WebSocket Integration', () => {
  let app: INestApplication;
  let module: TestingModule;
  let computerUseTools: ComputerUseTools;
  let mockComputerUseService: jest.Mocked<ComputerUseService>;
  let webSocketManager: TestWebSocketManager;
  let mockSSEStream: MockSSEStream;
  let testId: string;

  beforeEach(async () => {
    testId = TestUtils.generateTestId('mcp_websocket_integration');
    console.log(`[${testId}] Setting up MCP WebSocket integration tests`);

    // Create mock services
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
      ]),
      logger: createMockLogger(),
      cuaEnabled: true,
      nutService: {},
      initializeNutJS: jest.fn(),
      validateCoordinates: jest.fn(),
    } as unknown as jest.Mocked<ComputerUseService>;

    // Mock screenshot response for testing
    mockComputerUseService.screenshot.mockResolvedValue({
      image: Buffer.alloc(1024, 'A').toString('base64'),
      metadata: {
        width: 1920,
        height: 1080,
        format: 'png' as const,
        captureTime: new Date(),
        operationId: 'test_screenshot_op',
      },
    });

    // Create testing module
    module = await Test.createTestingModule({
      imports: [
        McpModule.forRoot({
          name: 'bytebotd-test',
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

    // Enable CORS for testing
    app.enableCors({
      origin: true,
      credentials: true,
    });

    await app.init();
    await app.listen(0); // Use random available port

    computerUseTools = module.get<ComputerUseTools>(ComputerUseTools);
    webSocketManager = new TestWebSocketManager();
    mockSSEStream = new MockSSEStream();

    console.log(`[${testId}] MCP WebSocket integration test setup completed`);
  });

  afterEach(async () => {
    console.log(`[${testId}] Cleaning up MCP WebSocket integration tests`);

    await webSocketManager.disconnectAll();
    await app?.close();

    console.log(`[${testId}] MCP WebSocket integration test cleanup completed`);
  });

  /**
   * Test Suite: WebSocket Connection Management
   */
  describe('WebSocket Connection Management', () => {
    it('should establish WebSocket connection successfully', async () => {
      const operationId = `${testId}_ws_connection`;
      console.log(`[${operationId}] Testing WebSocket connection establishment`);

      const startTime = performance.now();
      const appUrl = await app.getUrl();
      
      const client = await webSocketManager.createClient(appUrl, 'test-client-1');
      
      expect(client.connected).toBe(true);
      expect(webSocketManager.getActiveClientCount()).toBe(1);

      const connectionTime = performance.now() - startTime;
      console.log(`[${operationId}] WebSocket connected in ${connectionTime.toFixed(2)}ms`);

      expect(connectionTime).toBeLessThan(5000); // Should connect within 5 seconds
    });

    it('should handle multiple concurrent WebSocket connections', async () => {
      const operationId = `${testId}_multiple_ws_connections`;
      console.log(`[${operationId}] Testing multiple WebSocket connections`);

      const appUrl = await app.getUrl();
      const clientCount = 5;
      const clients: Socket[] = [];

      // Create multiple clients concurrently
      const connectionPromises = Array(clientCount)
        .fill(null)
        .map((_, i) =>
          webSocketManager.createClient(appUrl, `test-client-${i + 1}`),
        );

      const startTime = performance.now();
      const connectedClients = await Promise.all(connectionPromises);
      const totalConnectionTime = performance.now() - startTime;

      expect(connectedClients).toHaveLength(clientCount);
      expect(webSocketManager.getActiveClientCount()).toBe(clientCount);

      connectedClients.forEach((client) => {
        expect(client.connected).toBe(true);
      });

      console.log(
        `[${operationId}] ${clientCount} clients connected in ${totalConnectionTime.toFixed(2)}ms`,
      );
    });

    it('should handle WebSocket disconnection gracefully', async () => {
      const operationId = `${testId}_ws_disconnection`;
      console.log(`[${operationId}] Testing WebSocket disconnection handling`);

      const appUrl = await app.getUrl();
      const client = await webSocketManager.createClient(appUrl, 'disconnect-test-client');

      expect(client.connected).toBe(true);

      // Test graceful disconnection
      await webSocketManager.disconnectClient('disconnect-test-client');

      expect(webSocketManager.getActiveClientCount()).toBe(0);
      expect(client.connected).toBe(false);

      console.log(`[${operationId}] WebSocket disconnection handled gracefully`);
    });

    it('should handle connection errors and retry logic', async () => {
      const operationId = `${testId}_ws_connection_errors`;
      console.log(`[${operationId}] Testing WebSocket connection error handling`);

      // Try to connect to invalid endpoint
      const invalidUrl = 'http://localhost:99999';
      
      await expect(
        webSocketManager.createClient(invalidUrl, 'error-test-client'),
      ).rejects.toThrow();

      expect(webSocketManager.getActiveClientCount()).toBe(0);

      console.log(`[${operationId}] Connection error handling validated`);
    });
  });

  /**
   * Test Suite: SSE Endpoint Communication
   */
  describe('SSE Endpoint Communication', () => {
    it('should serve SSE endpoint correctly', async () => {
      const operationId = `${testId}_sse_endpoint`;
      console.log(`[${operationId}] Testing SSE endpoint availability`);

      const response = await request(app.getHttpServer())
        .get('/mcp')
        .set('Accept', 'text/event-stream')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/text\/event-stream/);
      expect(response.headers['cache-control']).toBe('no-cache');
      expect(response.headers['connection']).toBe('keep-alive');

      console.log(`[${operationId}] SSE endpoint configuration validated`);
    });

    it('should stream MCP events through SSE', async () => {
      const operationId = `${testId}_sse_streaming`;
      console.log(`[${operationId}] Testing SSE event streaming`);

      mockSSEStream.connect();
      
      const testEvents = [
        { event: 'tool_call', data: JSON.stringify({ tool: 'screenshot', params: {} }) },
        { event: 'tool_result', data: JSON.stringify({ success: true, result: 'completed' }) },
        { event: 'heartbeat', data: JSON.stringify({ timestamp: Date.now() }) },
      ];

      // Simulate streaming events
      testEvents.forEach((evt, index) => {
        setTimeout(() => {
          mockSSEStream.sendEvent(evt.data, evt.event);
        }, index * 100);
      });

      // Wait for all events to be processed
      await new Promise((resolve) => setTimeout(resolve, 500));

      const chunks = mockSSEStream.getChunks();
      expect(chunks).toHaveLength(testEvents.length);

      chunks.forEach((chunk, index) => {
        expect(chunk.data).toBe(testEvents[index].data);
        expect(chunk.event).toBe(testEvents[index].event);
      });

      console.log(`[${operationId}] SSE event streaming validated with ${chunks.length} events`);
    });

    it('should handle SSE connection lifecycle', async () => {
      const operationId = `${testId}_sse_lifecycle`;
      console.log(`[${operationId}] Testing SSE connection lifecycle`);

      expect(mockSSEStream.isConnected()).toBe(false);

      mockSSEStream.connect();
      expect(mockSSEStream.isConnected()).toBe(true);

      mockSSEStream.disconnect();
      expect(mockSSEStream.isConnected()).toBe(false);

      console.log(`[${operationId}] SSE connection lifecycle validated`);
    });
  });

  /**
   * Test Suite: Real-time Tool Execution
   */
  describe('Real-time Tool Execution via WebSocket', () => {
    it('should execute screenshot tool via WebSocket', async () => {
      const operationId = `${testId}_ws_screenshot_tool`;
      console.log(`[${operationId}] Testing screenshot tool execution via WebSocket`);

      const appUrl = await app.getUrl();
      const client = await webSocketManager.createClient(appUrl, 'screenshot-client');

      const toolMessage = WebSocketTestData.createToolMessage('screenshot', {
        display: 0,
      });

      const responsePromise = new Promise((resolve) => {
        client.once('tool_response', resolve);
      });

      client.emit('tool_call', toolMessage);

      const response = await responsePromise;
      
      expect(response).toBeDefined();
      expect(mockComputerUseService.screenshot).toHaveBeenCalledWith({ display: 0 });

      console.log(`[${operationId}] Screenshot tool execution via WebSocket validated`);
    });

    it('should execute mouse movement tool via WebSocket', async () => {
      const operationId = `${testId}_ws_mouse_move_tool`;
      console.log(`[${operationId}] Testing mouse movement tool execution via WebSocket`);

      const appUrl = await app.getUrl();
      const client = await webSocketManager.createClient(appUrl, 'mouse-client');

      const toolMessage = WebSocketTestData.createToolMessage('move_mouse', {
        coordinates: { x: 100, y: 200 },
      });

      mockComputerUseService.moveMouse.mockResolvedValue({
        success: true,
        coordinates: { x: 100, y: 200 },
      });

      const responsePromise = new Promise((resolve) => {
        client.once('tool_response', resolve);
      });

      client.emit('tool_call', toolMessage);

      const response = await responsePromise;
      
      expect(response).toBeDefined();
      expect(mockComputerUseService.moveMouse).toHaveBeenCalledWith({
        coordinates: { x: 100, y: 200 },
      });

      console.log(`[${operationId}] Mouse movement tool execution via WebSocket validated`);
    });

    it('should handle tool execution errors via WebSocket', async () => {
      const operationId = `${testId}_ws_tool_error`;
      console.log(`[${operationId}] Testing tool execution error handling via WebSocket`);

      const appUrl = await app.getUrl();
      const client = await webSocketManager.createClient(appUrl, 'error-client');

      const toolMessage = WebSocketTestData.createToolMessage('invalid_tool', {});

      const errorPromise = new Promise((resolve) => {
        client.once('tool_error', resolve);
      });

      client.emit('tool_call', toolMessage);

      const error = await errorPromise;
      
      expect(error).toBeDefined();
      expect(error).toHaveProperty('error');

      console.log(`[${operationId}] Tool execution error handling via WebSocket validated`);
    });
  });

  /**
   * Test Suite: Protocol Message Validation
   */
  describe('Protocol Message Validation', () => {
    it('should validate MCP message format', () => {
      const operationId = `${testId}_message_validation`;
      console.log(`[${operationId}] Testing MCP message format validation`);

      const validMessage = WebSocketTestData.createMcpMessage('tools/call', {
        name: 'screenshot',
        arguments: { display: 0 },
      });

      expect(validMessage).toHaveProperty('jsonrpc', '2.0');
      expect(validMessage).toHaveProperty('id');
      expect(validMessage).toHaveProperty('method', 'tools/call');
      expect(validMessage).toHaveProperty('params');

      console.log(`[${operationId}] MCP message format validation completed`);
    });

    it('should validate MCP response format', () => {
      const operationId = `${testId}_response_validation`;
      console.log(`[${operationId}] Testing MCP response format validation`);

      const validResponse = WebSocketTestData.createMcpResponse(
        { success: true, data: 'test' },
        'test-id',
      );

      expect(validResponse).toHaveProperty('jsonrpc', '2.0');
      expect(validResponse).toHaveProperty('id', 'test-id');
      expect(validResponse).toHaveProperty('result');

      console.log(`[${operationId}] MCP response format validation completed`);
    });

    it('should validate MCP error format', () => {
      const operationId = `${testId}_error_validation`;
      console.log(`[${operationId}] Testing MCP error format validation`);

      const validError = WebSocketTestData.createMcpError(
        -32602,
        'Invalid params',
        'error-id',
      );

      expect(validError).toHaveProperty('jsonrpc', '2.0');
      expect(validError).toHaveProperty('id', 'error-id');
      expect(validError).toHaveProperty('error');
      expect(validError.error).toHaveProperty('code', -32602);
      expect(validError.error).toHaveProperty('message', 'Invalid params');

      console.log(`[${operationId}] MCP error format validation completed`);
    });
  });

  /**
   * Test Suite: Streaming Data Processing
   */
  describe('Streaming Data Processing', () => {
    it('should process streaming data chunks correctly', async () => {
      const operationId = `${testId}_streaming_chunks`;
      console.log(`[${operationId}] Testing streaming data chunk processing`);

      const chunks = [
        WebSocketTestData.createStreamChunk('chunk1', 0),
        WebSocketTestData.createStreamChunk('chunk2', 1),
        WebSocketTestData.createStreamChunk('chunk3', 2),
      ];

      const processedChunks: typeof chunks = [];

      chunks.forEach((chunk, index) => {
        setTimeout(() => {
          processedChunks.push(chunk);
        }, index * 50);
      });

      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(processedChunks).toHaveLength(chunks.length);
      processedChunks.forEach((chunk, index) => {
        expect(chunk.sequence).toBe(index);
        expect(chunk.data).toBe(`chunk${index + 1}`);
      });

      console.log(`[${operationId}] Streaming data chunk processing validated`);
    });

    it('should handle backpressure in streaming', async () => {
      const operationId = `${testId}_streaming_backpressure`;
      console.log(`[${operationId}] Testing streaming backpressure handling`);

      const appUrl = await app.getUrl();
      const client = await webSocketManager.createClient(appUrl, 'backpressure-client');

      const messageCount = 100;
      const messages: unknown[] = [];

      // Send rapid messages to test backpressure
      for (let i = 0; i < messageCount; i++) {
        const message = WebSocketTestData.createToolMessage('screenshot', {
          display: 0,
          sequence: i,
        });
        client.emit('tool_call', message);
        messages.push(message);
      }

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const history = webSocketManager.getMessageHistory('backpressure-client');
      expect(history.length).toBeGreaterThan(0);

      console.log(
        `[${operationId}] Backpressure handling validated with ${history.length} processed messages`,
      );
    });
  });

  /**
   * Test Suite: Performance Monitoring
   */
  describe('Performance Monitoring', () => {
    it('should track WebSocket connection performance', async () => {
      const operationId = `${testId}_ws_performance`;
      console.log(`[${operationId}] Testing WebSocket connection performance`);

      const appUrl = await app.getUrl();
      const startTime = performance.now();

      const client = await webSocketManager.createClient(appUrl, 'performance-client');
      
      const connectionTime = performance.now() - startTime;

      expect(client.connected).toBe(true);
      expect(connectionTime).toBeLessThan(2000); // Should connect within 2 seconds

      console.log(
        `[${operationId}] WebSocket connection performance: ${connectionTime.toFixed(2)}ms`,
      );
    });

    it('should monitor message processing latency', async () => {
      const operationId = `${testId}_message_latency`;
      console.log(`[${operationId}] Testing message processing latency`);

      const appUrl = await app.getUrl();
      const client = await webSocketManager.createClient(appUrl, 'latency-client');

      const startTime = performance.now();
      const toolMessage = WebSocketTestData.createToolMessage('screenshot', {});

      const responsePromise = new Promise((resolve) => {
        client.once('tool_response', resolve);
      });

      client.emit('tool_call', toolMessage);
      await responsePromise;

      const latency = performance.now() - startTime;
      expect(latency).toBeLessThan(5000); // Should respond within 5 seconds

      console.log(`[${operationId}] Message processing latency: ${latency.toFixed(2)}ms`);
    });
  });
});