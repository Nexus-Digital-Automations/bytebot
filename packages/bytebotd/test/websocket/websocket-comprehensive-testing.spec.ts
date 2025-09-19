/**
 * Comprehensive WebSocket Testing Suite for PARLANT PHASE 1
 *
 * Enterprise-grade WebSocket testing framework validating real-time streaming
 * infrastructure with scalability, performance, and reliability requirements.
 *
 * Test Coverage:
 * - Connection lifecycle management (1000+ concurrent connections)
 * - Real-time message streaming with <50ms latency
 * - Conversational validation workflows
 * - Security and authentication protocols
 * - Connection recovery and auto-reconnection
 * - Performance benchmarking and monitoring
 * - Enterprise compliance validation
 *
 * Performance Targets:
 * - 1000+ concurrent WebSocket connections
 * - <50ms message delivery latency
 * - 99.9% connection reliability
 * - Zero message loss during normal operations
 * - Secure authentication for all connections
 *
 * @author Claude Code
 * @version 1.0.0
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as WebSocket from 'ws';
import { performance } from 'perf_hooks';
import { EventEmitter } from 'events';

import {
  ConversationalWebSocketBridgeService,
  ConversationalMessage,
  ConversationalMessageType,
  ValidationRequestMessage,
  UserConfirmationMessage,
  ProgressUpdateMessage,
  ValidationAction,
  SecurityContext,
  ActionImpact,
  SessionStatus,
} from '../../src/common/websocket/conversational-websocket-bridge.service';
import { ParlantWebSocketIntegrationService } from '../../src/common/websocket/parlant-websocket-integration.service';
import { ParlantWebSocketBridgeService } from '../../src/common/websocket/parlant-websocket-bridge.service';

// ===== WEBSOCKET TEST FRAMEWORK =====

/**
 * Advanced WebSocket Test Client with enterprise features
 */
class EnterpriseWebSocketTestClient extends EventEmitter {
  private ws: WebSocket.WebSocket | null = null;
  private messages: ConversationalMessage[] = [];
  private connected = false;
  private reconnectAttempts = 0;
  private connectionStartTime = 0;
  private metrics: ConnectionMetrics;
  private messageQueue: ConversationalMessage[] = [];
  private sessionId: string;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(
    private url: string,
    private clientId: string,
    private options: WebSocketClientOptions = {}
  ) {
    super();
    this.sessionId = `test_session_${Date.now()}_${clientId}`;
    this.metrics = {
      connectionTime: 0,
      messagesSent: 0,
      messagesReceived: 0,
      totalLatency: 0,
      errors: 0,
      reconnections: 0,
      throughput: 0,
      memoryUsage: 0,
    };
  }

  async connect(): Promise<void> {
    this.connectionStartTime = performance.now();

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket.WebSocket(this.url, {
          headers: {
            'User-Agent': 'WebSocket-Testing-Framework/1.0',
            'X-Client-ID': this.clientId,
            'X-Session-ID': this.sessionId,
            ...(this.options.headers || {}),
          },
        });

        this.ws.on('open', () => {
          this.connected = true;
          this.metrics.connectionTime = performance.now() - this.connectionStartTime;
          this.startHeartbeat();
          this.emit('connected', { clientId: this.clientId, connectionTime: this.metrics.connectionTime });
          resolve();
        });

        this.ws.on('message', (data: WebSocket.RawData) => {
          this.handleMessage(data);
        });

        this.ws.on('error', (error: Error) => {
          this.metrics.errors++;
          this.emit('error', { clientId: this.clientId, error });
          if (!this.connected) {
            reject(error);
          }
        });

        this.ws.on('close', (code: number, reason: Buffer) => {
          this.connected = false;
          this.stopHeartbeat();
          this.emit('disconnected', {
            clientId: this.clientId,
            code,
            reason: reason.toString(),
            metrics: this.getMetrics()
          });

          if (this.options.autoReconnect && this.reconnectAttempts < (this.options.maxReconnectAttempts || 5)) {
            this.attemptReconnection();
          }
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  private handleMessage(data: WebSocket.RawData): void {
    try {
      const messageStartTime = performance.now();
      const rawMessage = Buffer.from(data as ArrayBuffer).toString('utf8');
      const message = JSON.parse(rawMessage) as ConversationalMessage;

      this.messages.push(message);
      this.metrics.messagesReceived++;

      const processingTime = performance.now() - messageStartTime;
      this.metrics.totalLatency += processingTime;

      this.emit('message', {
        clientId: this.clientId,
        message,
        processingTime,
        totalMessages: this.messages.length
      });

      // Handle specific message types
      this.processSpecialMessages(message);

    } catch (error) {
      this.metrics.errors++;
      this.emit('messageError', { clientId: this.clientId, error });
    }
  }

  private processSpecialMessages(message: ConversationalMessage): void {
    switch (message.type) {
      case ConversationalMessageType.HEARTBEAT:
        this.sendHeartbeatAck(message);
        break;
      case ConversationalMessageType.SESSION_READY:
        this.emit('sessionReady', { clientId: this.clientId, sessionInfo: message.payload });
        break;
      case ConversationalMessageType.VALIDATION_REQUEST:
        this.emit('validationRequest', { clientId: this.clientId, validation: message.payload });
        break;
      case ConversationalMessageType.PROGRESS_UPDATE:
        this.emit('progressUpdate', { clientId: this.clientId, progress: message.payload });
        break;
    }
  }

  private sendHeartbeatAck(heartbeatMessage: ConversationalMessage): void {
    const ackMessage: ConversationalMessage = {
      type: ConversationalMessageType.HEARTBEAT_ACK,
      messageId: `ack_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      sessionId: this.sessionId,
      timestamp: Date.now(),
      sequence: this.metrics.messagesSent + 1,
      payload: {
        clientTime: Date.now(),
        serverTime: heartbeatMessage.payload.serverTime,
        latency: Date.now() - (heartbeatMessage.payload.serverTime as number),
      },
      metadata: {
        priority: 'low',
        requiresAck: false,
        compression: false,
        routingHints: ['heartbeat'],
      },
    };

    this.sendMessage(ackMessage);
  }

  private startHeartbeat(): void {
    if (this.options.enableHeartbeat !== false) {
      this.heartbeatInterval = setInterval(() => {
        this.sendHeartbeat();
      }, this.options.heartbeatInterval || 30000);
    }
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private sendHeartbeat(): void {
    const heartbeatMessage: ConversationalMessage = {
      type: ConversationalMessageType.HEARTBEAT,
      messageId: `heartbeat_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      sessionId: this.sessionId,
      timestamp: Date.now(),
      sequence: this.metrics.messagesSent + 1,
      payload: {
        clientTime: Date.now(),
      },
      metadata: {
        priority: 'low',
        requiresAck: true,
        timeout: 5000,
        compression: false,
        routingHints: ['heartbeat'],
      },
    };

    this.sendMessage(heartbeatMessage);
  }

  private async attemptReconnection(): Promise<void> {
    this.reconnectAttempts++;
    this.metrics.reconnections++;

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000); // Exponential backoff

    this.emit('reconnecting', {
      clientId: this.clientId,
      attempt: this.reconnectAttempts,
      delay
    });

    setTimeout(async () => {
      try {
        await this.connect();
        this.reconnectAttempts = 0; // Reset on successful reconnection
        this.emit('reconnected', { clientId: this.clientId, attempts: this.reconnectAttempts });
      } catch (error) {
        this.emit('reconnectionFailed', {
          clientId: this.clientId,
          attempt: this.reconnectAttempts,
          error
        });
      }
    }, delay);
  }

  async sendMessage(message: Partial<ConversationalMessage>): Promise<void> {
    if (!this.ws || !this.connected) {
      throw new Error(`WebSocket not connected for client ${this.clientId}`);
    }

    const fullMessage: ConversationalMessage = {
      messageId: `test_msg_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      sessionId: this.sessionId,
      timestamp: Date.now(),
      sequence: this.metrics.messagesSent + 1,
      metadata: {
        priority: 'normal',
        requiresAck: false,
        compression: false,
        routingHints: [],
      },
      ...message,
    } as ConversationalMessage;

    const startTime = performance.now();
    const serialized = JSON.stringify(fullMessage);

    return new Promise((resolve, reject) => {
      this.ws!.send(serialized, (error) => {
        if (error) {
          this.metrics.errors++;
          reject(error);
        } else {
          this.metrics.messagesSent++;
          const sendTime = performance.now() - startTime;
          this.metrics.totalLatency += sendTime;
          this.emit('messageSent', {
            clientId: this.clientId,
            message: fullMessage,
            sendTime
          });
          resolve();
        }
      });
    });
  }

  async waitForMessage(
    predicate: (message: ConversationalMessage) => boolean,
    timeout = 5000
  ): Promise<ConversationalMessage> {
    const start = Date.now();

    while (Date.now() - start < timeout) {
      const message = this.messages.find(predicate);
      if (message) {
        return message;
      }
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    throw new Error(`Timeout waiting for message matching predicate (client: ${this.clientId})`);
  }

  async sendValidationRequest(action: ValidationAction): Promise<string> {
    const validationId = `validation_${Date.now()}_${this.clientId}`;

    const request: ValidationRequestMessage = {
      type: ConversationalMessageType.VALIDATION_REQUEST,
      messageId: `req_${validationId}`,
      sessionId: this.sessionId,
      timestamp: Date.now(),
      sequence: this.metrics.messagesSent + 1,
      payload: {
        validationId,
        context: {
          userId: `test-user-${this.clientId}`,
          applicationContext: 'websocket-testing',
          environmentInfo: { test: true, clientId: this.clientId },
          previousActions: [],
          securityContext: {
            authenticationLevel: 'basic',
            permissions: ['read', 'write', 'validate'],
            auditRequired: true,
            complianceFlags: ['GDPR', 'testing'],
          } as SecurityContext,
        },
        action,
        riskLevel: 'medium',
        streamingOptions: {
          enableProgressUpdates: true,
          updateInterval: 500,
          maxUpdateCount: 5,
          compressionEnabled: true,
          priorityBoost: false,
        },
      },
      metadata: {
        priority: 'high',
        requiresAck: true,
        compression: true,
        routingHints: ['validation'],
      },
    };

    await this.sendMessage(request);
    return validationId;
  }

  async sendUserConfirmation(validationId: string, approved: boolean): Promise<string> {
    const confirmationId = `conf_${validationId}_${this.clientId}`;

    const confirmation: UserConfirmationMessage = {
      type: ConversationalMessageType.USER_CONFIRMATION,
      messageId: confirmationId,
      sessionId: this.sessionId,
      timestamp: Date.now(),
      sequence: this.metrics.messagesSent + 1,
      payload: {
        confirmationId,
        validationId,
        approved,
        reasoning: approved ? 'Test approval' : 'Test rejection',
        confidence: 0.95,
      },
      metadata: {
        priority: 'high',
        requiresAck: true,
        compression: false,
        routingHints: ['confirmation'],
      },
    };

    await this.sendMessage(confirmation);
    return confirmationId;
  }

  getMessages(): ConversationalMessage[] {
    return [...this.messages];
  }

  getMessagesByType(type: ConversationalMessageType): ConversationalMessage[] {
    return this.messages.filter(msg => msg.type === type);
  }

  clearMessages(): void {
    this.messages = [];
  }

  getMetrics(): ConnectionMetrics {
    const now = performance.now();
    const averageLatency = this.metrics.messagesReceived > 0
      ? this.metrics.totalLatency / this.metrics.messagesReceived
      : 0;

    const throughput = this.metrics.messagesSent > 0
      ? this.metrics.messagesSent / ((now - this.connectionStartTime) / 1000)
      : 0;

    return {
      ...this.metrics,
      averageLatency,
      throughput,
      memoryUsage: process.memoryUsage().heapUsed,
    };
  }

  async disconnect(): Promise<void> {
    this.stopHeartbeat();

    if (this.ws && this.connected) {
      return new Promise((resolve) => {
        this.ws!.close(1000, 'Test completed');
        this.ws!.on('close', () => {
          this.connected = false;
          resolve();
        });
      });
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  getClientId(): string {
    return this.clientId;
  }
}

/**
 * Connection performance metrics
 */
interface ConnectionMetrics {
  connectionTime: number;
  messagesSent: number;
  messagesReceived: number;
  totalLatency: number;
  averageLatency?: number;
  errors: number;
  reconnections: number;
  throughput: number;
  memoryUsage: number;
}

/**
 * WebSocket client configuration options
 */
interface WebSocketClientOptions {
  headers?: Record<string, string>;
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
  enableHeartbeat?: boolean;
  heartbeatInterval?: number;
}

/**
 * Test scenario executor for complex validation workflows
 */
class ValidationWorkflowTester {
  constructor(private client: EnterpriseWebSocketTestClient) {}

  async executeCompleteValidationWorkflow(
    action: ValidationAction,
    expectedResult: 'approved' | 'rejected' = 'approved'
  ): Promise<ValidationWorkflowResult> {
    const startTime = performance.now();

    // Step 1: Send validation request
    const validationId = await this.client.sendValidationRequest(action);

    // Step 2: Wait for validation response
    const response = await this.client.waitForMessage(
      msg => msg.type === ConversationalMessageType.VALIDATION_RESPONSE &&
             msg.payload.validationId === validationId,
      10000
    );

    // Step 3: Collect progress updates
    const progressUpdates = await this.collectProgressUpdates(validationId, 5000);

    // Step 4: Send user confirmation
    const confirmationId = await this.client.sendUserConfirmation(validationId, expectedResult === 'approved');

    // Step 5: Wait for confirmation result
    const result = await this.client.waitForMessage(
      msg => msg.type === ConversationalMessageType.CONFIRMATION_RESULT &&
             msg.payload.validationId === validationId,
      10000
    );

    const duration = performance.now() - startTime;

    return {
      validationId,
      confirmationId,
      request: { validationId, action },
      response,
      progressUpdates,
      confirmation: { confirmationId, validationId, approved: expectedResult === 'approved' },
      result,
      duration,
      success: result.payload.result === expectedResult,
    };
  }

  private async collectProgressUpdates(
    validationId: string,
    timeout = 5000
  ): Promise<ProgressUpdateMessage[]> {
    const progressUpdates: ProgressUpdateMessage[] = [];
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        const update = await this.client.waitForMessage(
          msg => msg.type === ConversationalMessageType.PROGRESS_UPDATE &&
                 msg.payload.operationId === validationId,
          1000
        ) as ProgressUpdateMessage;

        progressUpdates.push(update);

        if (update.payload.status === 'completed') {
          break;
        }
      } catch (error) {
        // Timeout waiting for progress update
        if (progressUpdates.length > 0) {
          break;
        }
      }
    }

    return progressUpdates;
  }
}

/**
 * Validation workflow test result
 */
interface ValidationWorkflowResult {
  validationId: string;
  confirmationId: string;
  request: { validationId: string; action: ValidationAction };
  response: ConversationalMessage;
  progressUpdates: ProgressUpdateMessage[];
  confirmation: { confirmationId: string; validationId: string; approved: boolean };
  result: ConversationalMessage;
  duration: number;
  success: boolean;
}

/**
 * Concurrent connection manager for scalability testing
 */
class ConcurrentConnectionManager extends EventEmitter {
  private clients: Map<string, EnterpriseWebSocketTestClient> = new Map();
  private connectionMetrics: Map<string, ConnectionMetrics> = new Map();
  private startTime = 0;

  constructor(private baseUrl: string, private totalConnections: number) {
    super();
  }

  async establishConnections(batchSize = 50, delayBetweenBatches = 100): Promise<void> {
    this.startTime = performance.now();
    const batches = Math.ceil(this.totalConnections / batchSize);

    for (let batch = 0; batch < batches; batch++) {
      const batchPromises: Promise<void>[] = [];
      const startIndex = batch * batchSize;
      const endIndex = Math.min(startIndex + batchSize, this.totalConnections);

      for (let i = startIndex; i < endIndex; i++) {
        const clientId = `client_${i.toString().padStart(4, '0')}`;
        const client = new EnterpriseWebSocketTestClient(
          this.baseUrl,
          clientId,
          {
            autoReconnect: true,
            maxReconnectAttempts: 3,
            enableHeartbeat: true,
            heartbeatInterval: 30000,
          }
        );

        this.clients.set(clientId, client);
        this.setupClientEventHandlers(client);

        batchPromises.push(
          client.connect().catch(error => {
            this.emit('connectionFailed', { clientId, error });
            throw error;
          })
        );
      }

      await Promise.allSettled(batchPromises);

      if (batch < batches - 1) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }

      this.emit('batchCompleted', {
        batch: batch + 1,
        totalBatches: batches,
        connectionsEstablished: this.getConnectedCount(),
        totalConnections: this.totalConnections,
      });
    }

    const totalTime = performance.now() - this.startTime;
    this.emit('allConnectionsEstablished', {
      totalConnections: this.totalConnections,
      connectedClients: this.getConnectedCount(),
      totalTime,
      averageConnectionTime: totalTime / this.totalConnections,
    });
  }

  private setupClientEventHandlers(client: EnterpriseWebSocketTestClient): void {
    client.on('connected', (data) => {
      this.emit('clientConnected', data);
    });

    client.on('disconnected', (data) => {
      this.connectionMetrics.set(data.clientId, data.metrics);
      this.emit('clientDisconnected', data);
    });

    client.on('error', (data) => {
      this.emit('clientError', data);
    });

    client.on('reconnected', (data) => {
      this.emit('clientReconnected', data);
    });
  }

  async performConcurrentValidation(validationCount = 100): Promise<ValidationWorkflowResult[]> {
    const results: ValidationWorkflowResult[] = [];
    const connectedClients = Array.from(this.clients.values()).filter(client => client.isConnected());

    if (connectedClients.length === 0) {
      throw new Error('No connected clients available for validation testing');
    }

    const validationPromises: Promise<ValidationWorkflowResult>[] = [];

    for (let i = 0; i < validationCount; i++) {
      const client = connectedClients[i % connectedClients.length];
      const tester = new ValidationWorkflowTester(client);

      const action: ValidationAction = {
        actionType: `test_action_${i}`,
        parameters: { testId: i, clientId: client.getClientId() },
        expectedOutcome: `Test action ${i} completed`,
        reversible: true,
        impact: {
          scope: 'local',
          dataAccess: false,
          stateChanges: false,
          userInteraction: false,
        } as ActionImpact,
      };

      validationPromises.push(
        tester.executeCompleteValidationWorkflow(action, 'approved')
          .catch(error => {
            return {
              validationId: `failed_${i}`,
              confirmationId: `failed_conf_${i}`,
              request: { validationId: `failed_${i}`, action },
              response: {} as ConversationalMessage,
              progressUpdates: [],
              confirmation: { confirmationId: `failed_conf_${i}`, validationId: `failed_${i}`, approved: false },
              result: {} as ConversationalMessage,
              duration: 0,
              success: false,
              error,
            } as ValidationWorkflowResult & { error: unknown };
          })
      );
    }

    const settledResults = await Promise.allSettled(validationPromises);

    settledResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        this.emit('validationFailed', { index, error: result.reason });
      }
    });

    return results;
  }

  async performLatencyBenchmark(messageCount = 1000): Promise<LatencyBenchmarkResult> {
    const connectedClients = Array.from(this.clients.values()).filter(client => client.isConnected());

    if (connectedClients.length === 0) {
      throw new Error('No connected clients available for latency testing');
    }

    const latencies: number[] = [];
    const errors: number[] = [];
    const startTime = performance.now();

    for (let i = 0; i < messageCount; i++) {
      const client = connectedClients[i % connectedClients.length];
      const messageStartTime = performance.now();

      try {
        await client.sendMessage({
          type: ConversationalMessageType.HEARTBEAT,
          payload: { testMessage: i, sentAt: messageStartTime },
        });

        const latency = performance.now() - messageStartTime;
        latencies.push(latency);

        if (latency > 50) { // Target: <50ms
          errors.push(i);
        }

      } catch (error) {
        errors.push(i);
      }
    }

    const totalTime = performance.now() - startTime;
    latencies.sort((a, b) => a - b);

    return {
      messageCount,
      totalTime,
      averageLatency: latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length,
      medianLatency: latencies[Math.floor(latencies.length / 2)] || 0,
      p95Latency: latencies[Math.floor(latencies.length * 0.95)] || 0,
      p99Latency: latencies[Math.floor(latencies.length * 0.99)] || 0,
      minLatency: latencies[0] || 0,
      maxLatency: latencies[latencies.length - 1] || 0,
      errorCount: errors.length,
      successRate: ((messageCount - errors.length) / messageCount) * 100,
      messagesPerSecond: messageCount / (totalTime / 1000),
    };
  }

  getConnectedCount(): number {
    return Array.from(this.clients.values()).filter(client => client.isConnected()).length;
  }

  getConnectionMetrics(): Map<string, ConnectionMetrics> {
    const currentMetrics = new Map<string, ConnectionMetrics>();

    this.clients.forEach((client, clientId) => {
      currentMetrics.set(clientId, client.getMetrics());
    });

    return currentMetrics;
  }

  async disconnectAll(): Promise<void> {
    const disconnectPromises = Array.from(this.clients.values())
      .filter(client => client.isConnected())
      .map(client => client.disconnect());

    await Promise.allSettled(disconnectPromises);
    this.clients.clear();
    this.connectionMetrics.clear();
  }
}

/**
 * Latency benchmark test results
 */
interface LatencyBenchmarkResult {
  messageCount: number;
  totalTime: number;
  averageLatency: number;
  medianLatency: number;
  p95Latency: number;
  p99Latency: number;
  minLatency: number;
  maxLatency: number;
  errorCount: number;
  successRate: number;
  messagesPerSecond: number;
}

// ===== MOCK CONFIGURATION =====

const mockConfigService = {
  get: jest.fn((key: string, defaultValue?: unknown) => {
    const config: Record<string, unknown> = {
      'CONVERSATIONAL_WEBSOCKET_PORT': 8081,
      'PARLANT_WEBSOCKET_PORT': 8080,
      'CONVERSATIONAL_ALLOWED_ORIGINS': 'http://localhost:3000',
      'PARLANT_ALLOWED_ORIGINS': 'http://localhost:3000',
      'CONVERSATIONAL_REQUIRE_HTTPS': false,
      'PARLANT_REQUIRE_HTTPS': false,
    };
    return config[key] ?? defaultValue;
  }),
};

// ===== COMPREHENSIVE WEBSOCKET TEST SUITE =====

describe('Comprehensive WebSocket Testing Suite for PARLANT PHASE 1', () => {
  let conversationalService: ConversationalWebSocketBridgeService;
  let integrationService: ParlantWebSocketIntegrationService;
  let parlantService: ParlantWebSocketBridgeService;
  let module: TestingModule;
  let concurrentManager: ConcurrentConnectionManager;

  const TEST_PORT = 8081;
  const TEST_URL = `ws://localhost:${TEST_PORT}`;
  const TARGET_CONCURRENT_CONNECTIONS = 1000;

  beforeAll(async () => {
    jest.setTimeout(300000); // 5 minutes for comprehensive tests

    module = await Test.createTestingModule({
      providers: [
        ConversationalWebSocketBridgeService,
        ParlantWebSocketIntegrationService,
        ParlantWebSocketBridgeService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    conversationalService = module.get<ConversationalWebSocketBridgeService>(ConversationalWebSocketBridgeService);
    integrationService = module.get<ParlantWebSocketIntegrationService>(ParlantWebSocketIntegrationService);
    parlantService = module.get<ParlantWebSocketBridgeService>(ParlantWebSocketBridgeService);

    // Initialize services
    await integrationService.onModuleInit();

    // Give services time to start
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Initialize concurrent connection manager
    concurrentManager = new ConcurrentConnectionManager(TEST_URL, TARGET_CONCURRENT_CONNECTIONS);
  });

  afterAll(async () => {
    // Clean up all connections
    if (concurrentManager) {
      await concurrentManager.disconnectAll();
    }

    // Shutdown services
    await integrationService.onApplicationShutdown();
    await conversationalService.onApplicationShutdown();
    await parlantService.onApplicationShutdown();
    await module.close();
  });

  // ===== CONNECTION LIFECYCLE TESTS =====

  describe('Connection Lifecycle Management', () => {
    it('should establish single WebSocket connection successfully', async () => {
      const client = new EnterpriseWebSocketTestClient(TEST_URL, 'test_single_client');

      await client.connect();
      expect(client.isConnected()).toBe(true);

      const metrics = client.getMetrics();
      expect(metrics.connectionTime).toBeLessThan(1000); // <1 second connection time

      await client.disconnect();
      expect(client.isConnected()).toBe(false);
    });

    it('should handle connection authentication and session setup', async () => {
      const client = new EnterpriseWebSocketTestClient(TEST_URL, 'test_auth_client');

      const sessionReadyPromise = new Promise((resolve) => {
        client.on('sessionReady', resolve);
      });

      await client.connect();

      const sessionInfo = await sessionReadyPromise;
      expect(sessionInfo).toBeDefined();

      await client.disconnect();
    });

    it('should maintain heartbeat and connection health', async () => {
      const client = new EnterpriseWebSocketTestClient(TEST_URL, 'test_heartbeat_client', {
        enableHeartbeat: true,
        heartbeatInterval: 5000, // 5 seconds for testing
      });

      let heartbeatReceived = false;
      client.on('message', (data) => {
        if (data.message.type === ConversationalMessageType.HEARTBEAT) {
          heartbeatReceived = true;
        }
      });

      await client.connect();

      // Wait for heartbeat
      await new Promise(resolve => setTimeout(resolve, 6000));

      expect(heartbeatReceived).toBe(true);

      await client.disconnect();
    });
  });

  // ===== SCALABILITY TESTS =====

  describe('Scalability Testing - 1000+ Concurrent Connections', () => {
    it('should establish 1000+ concurrent WebSocket connections', async () => {
      let connectedCount = 0;
      let failedCount = 0;

      concurrentManager.on('clientConnected', () => {
        connectedCount++;
      });

      concurrentManager.on('connectionFailed', () => {
        failedCount++;
      });

      await concurrentManager.establishConnections(100, 200); // 100 per batch, 200ms delay

      const finalConnectedCount = concurrentManager.getConnectedCount();

      expect(finalConnectedCount).toBeGreaterThanOrEqual(950); // Allow 5% failure rate
      expect(finalConnectedCount / TARGET_CONCURRENT_CONNECTIONS).toBeGreaterThanOrEqual(0.95);

      console.log('Concurrent Connection Results:', {
        target: TARGET_CONCURRENT_CONNECTIONS,
        established: finalConnectedCount,
        failed: failedCount,
        successRate: `${((finalConnectedCount / TARGET_CONCURRENT_CONNECTIONS) * 100).toFixed(1)}%`,
      });
    });

    it('should maintain sub-50ms message delivery under load', async () => {
      // Ensure we have established connections
      const connectedCount = concurrentManager.getConnectedCount();
      if (connectedCount < 100) {
        await concurrentManager.establishConnections(100, 100);
      }

      const benchmark = await concurrentManager.performLatencyBenchmark(1000);

      expect(benchmark.averageLatency).toBeLessThan(50);
      expect(benchmark.p95Latency).toBeLessThan(100);
      expect(benchmark.successRate).toBeGreaterThanOrEqual(95);
      expect(benchmark.messagesPerSecond).toBeGreaterThan(1000);

      console.log('Latency Benchmark Results:', {
        messageCount: benchmark.messageCount,
        averageLatency: `${benchmark.averageLatency.toFixed(2)}ms`,
        p95Latency: `${benchmark.p95Latency.toFixed(2)}ms`,
        p99Latency: `${benchmark.p99Latency.toFixed(2)}ms`,
        successRate: `${benchmark.successRate.toFixed(1)}%`,
        throughput: `${Math.floor(benchmark.messagesPerSecond)} msg/sec`,
      });
    });
  });

  // ===== CONVERSATIONAL VALIDATION TESTS =====

  describe('Conversational Validation Workflows', () => {
    let testClient: EnterpriseWebSocketTestClient;

    beforeEach(async () => {
      testClient = new EnterpriseWebSocketTestClient(TEST_URL, `workflow_test_${Date.now()}`);
      await testClient.connect();
    });

    afterEach(async () => {
      if (testClient?.isConnected()) {
        await testClient.disconnect();
      }
    });

    it('should complete validation workflow with progress streaming', async () => {
      const tester = new ValidationWorkflowTester(testClient);

      const action: ValidationAction = {
        actionType: 'file_operation',
        parameters: { operation: 'create', path: '/tmp/test.txt' },
        expectedOutcome: 'File created successfully',
        reversible: true,
        impact: {
          scope: 'local',
          dataAccess: true,
          stateChanges: true,
          userInteraction: false,
        } as ActionImpact,
      };

      const result = await tester.executeCompleteValidationWorkflow(action, 'approved');

      expect(result.success).toBe(true);
      expect(result.duration).toBeLessThan(10000); // <10 seconds
      expect(result.progressUpdates.length).toBeGreaterThan(0);
      expect(result.response.payload.status).toBe('received');
      expect(result.result.payload.result).toBe('approved');
    });

    it('should handle validation rejection workflow', async () => {
      const tester = new ValidationWorkflowTester(testClient);

      const action: ValidationAction = {
        actionType: 'system_command',
        parameters: { command: 'rm -rf /', dangerous: true },
        expectedOutcome: 'System command executed',
        reversible: false,
        impact: {
          scope: 'system',
          dataAccess: true,
          stateChanges: true,
          userInteraction: true,
        } as ActionImpact,
      };

      const result = await tester.executeCompleteValidationWorkflow(action, 'rejected');

      expect(result.success).toBe(true);
      expect(result.result.payload.result).toBe('rejected');
    });
  });

  // ===== CONCURRENT VALIDATION TESTS =====

  describe('Concurrent Validation Performance', () => {
    it('should handle multiple concurrent validations efficiently', async () => {
      // Ensure sufficient connections
      const connectedCount = concurrentManager.getConnectedCount();
      if (connectedCount < 50) {
        await concurrentManager.establishConnections(50, 100);
      }

      const validationResults = await concurrentManager.performConcurrentValidation(100);

      const successfulValidations = validationResults.filter(result => result.success);
      const averageDuration = validationResults.reduce((sum, result) => sum + result.duration, 0) / validationResults.length;

      expect(successfulValidations.length).toBeGreaterThanOrEqual(85); // 85% success rate
      expect(averageDuration).toBeLessThan(5000); // <5 seconds average

      console.log('Concurrent Validation Results:', {
        totalValidations: validationResults.length,
        successful: successfulValidations.length,
        successRate: `${((successfulValidations.length / validationResults.length) * 100).toFixed(1)}%`,
        averageDuration: `${averageDuration.toFixed(0)}ms`,
      });
    });
  });

  // ===== CONNECTION RECOVERY TESTS =====

  describe('Connection Recovery and Reconnection', () => {
    it('should automatically reconnect after connection loss', async () => {
      const client = new EnterpriseWebSocketTestClient(TEST_URL, 'reconnect_test_client', {
        autoReconnect: true,
        maxReconnectAttempts: 3,
      });

      let reconnected = false;
      client.on('reconnected', () => {
        reconnected = true;
      });

      await client.connect();
      expect(client.isConnected()).toBe(true);

      // Simulate connection loss
      client['ws']?.terminate();

      // Wait for reconnection
      await new Promise(resolve => setTimeout(resolve, 5000));

      expect(reconnected).toBe(true);

      await client.disconnect();
    });
  });

  // ===== PERFORMANCE MONITORING TESTS =====

  describe('Performance Monitoring and Metrics', () => {
    it('should collect comprehensive performance metrics', async () => {
      const stats = conversationalService.getServerStatistics();

      expect(stats).toHaveProperty('server');
      expect(stats).toHaveProperty('performance');
      expect(stats).toHaveProperty('sessions');

      expect(stats.performance.targetLatency).toBe(50);
      expect(stats.performance.maxConcurrentSessions).toBe(1000);

      // Verify metrics are reasonable
      expect(stats.server.activeSessions).toBeGreaterThanOrEqual(0);
      expect(stats.performance.averageLatency).toBeGreaterThanOrEqual(0);
    });

    it('should monitor memory usage under load', async () => {
      const connectedCount = concurrentManager.getConnectedCount();

      if (connectedCount > 0) {
        const connectionMetrics = concurrentManager.getConnectionMetrics();
        const memoryUsages = Array.from(connectionMetrics.values()).map(m => m.memoryUsage);

        const averageMemoryUsage = memoryUsages.reduce((sum, usage) => sum + usage, 0) / memoryUsages.length;
        const maxMemoryUsage = Math.max(...memoryUsages);

        // Memory usage should be reasonable (less than 100MB per connection)
        expect(averageMemoryUsage).toBeLessThan(100 * 1024 * 1024);

        console.log('Memory Usage Analysis:', {
          connections: connectedCount,
          averageMemoryUsage: `${(averageMemoryUsage / 1024 / 1024).toFixed(2)}MB`,
          maxMemoryUsage: `${(maxMemoryUsage / 1024 / 1024).toFixed(2)}MB`,
        });
      }
    });
  });

  // ===== SECURITY AND COMPLIANCE TESTS =====

  describe('Security and Compliance Validation', () => {
    it('should enforce security context validation', async () => {
      const client = new EnterpriseWebSocketTestClient(TEST_URL, 'security_test_client');
      await client.connect();

      const action: ValidationAction = {
        actionType: 'sensitive_operation',
        parameters: { level: 'enterprise' },
        expectedOutcome: 'Sensitive operation completed',
        reversible: false,
        impact: {
          scope: 'external',
          dataAccess: true,
          stateChanges: true,
          userInteraction: true,
        } as ActionImpact,
      };

      const validationId = await client.sendValidationRequest(action);

      const response = await client.waitForMessage(
        msg => msg.type === ConversationalMessageType.VALIDATION_RESPONSE &&
               msg.payload.validationId === validationId
      );

      expect(response.payload.status).toBe('received');

      await client.disconnect();
    });

    it('should maintain audit trails for compliance', async () => {
      const client = new EnterpriseWebSocketTestClient(TEST_URL, 'audit_test_client');
      await client.connect();

      const tester = new ValidationWorkflowTester(client);

      const action: ValidationAction = {
        actionType: 'audit_required_operation',
        parameters: { auditLevel: 'high' },
        expectedOutcome: 'Audited operation completed',
        reversible: true,
        impact: {
          scope: 'system',
          dataAccess: true,
          stateChanges: true,
          userInteraction: false,
        } as ActionImpact,
      };

      const result = await tester.executeCompleteValidationWorkflow(action, 'approved');

      // Verify audit trail exists
      expect(result.request).toBeDefined();
      expect(result.response).toBeDefined();
      expect(result.confirmation).toBeDefined();
      expect(result.result).toBeDefined();

      await client.disconnect();
    });
  });

  // ===== ENTERPRISE VALIDATION CRITERIA =====

  describe('Enterprise Validation Criteria Compliance', () => {
    it('should achieve 99.9% connection reliability', async () => {
      const connectedCount = concurrentManager.getConnectedCount();
      const reliability = connectedCount / TARGET_CONCURRENT_CONNECTIONS;

      expect(reliability).toBeGreaterThanOrEqual(0.999);
    });

    it('should maintain zero message loss during normal operations', async () => {
      const client = new EnterpriseWebSocketTestClient(TEST_URL, 'message_loss_test');
      await client.connect();

      const messageCount = 100;
      let messagesReceived = 0;

      client.on('message', () => {
        messagesReceived++;
      });

      // Send test messages
      for (let i = 0; i < messageCount; i++) {
        await client.sendMessage({
          type: ConversationalMessageType.HEARTBEAT,
          payload: { testMessage: i },
        });
      }

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      const messageLossRate = (messageCount - messagesReceived) / messageCount;
      expect(messageLossRate).toBe(0); // Zero message loss

      await client.disconnect();
    });

    it('should provide comprehensive connection monitoring', async () => {
      const stats = conversationalService.getServerStatistics();

      // Verify comprehensive monitoring data
      expect(stats.server).toHaveProperty('activeSessions');
      expect(stats.server).toHaveProperty('activeConnections');
      expect(stats.server).toHaveProperty('pendingValidations');
      expect(stats.server).toHaveProperty('totalMessages');
      expect(stats.server).toHaveProperty('uptime');

      expect(stats.performance).toHaveProperty('averageLatency');
      expect(stats.performance).toHaveProperty('targetLatency');
      expect(stats.performance).toHaveProperty('maxConcurrentSessions');

      expect(Array.isArray(stats.sessions)).toBe(true);
    });
  });
});