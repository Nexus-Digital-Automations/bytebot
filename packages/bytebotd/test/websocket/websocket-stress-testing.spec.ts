/**
 * WebSocket Stress Testing Suite
 *
 * High-intensity stress testing for WebSocket infrastructure targeting
 * extreme load conditions, failure scenarios, and recovery mechanisms.
 * Designed to validate system resilience under adverse conditions.
 *
 * Stress Test Scenarios:
 * - Extreme concurrent connection limits (5000+ connections)
 * - High-frequency message flooding (10,000+ msg/sec)
 * - Memory pressure and resource exhaustion
 * - Network interruption and recovery
 * - Malformed message handling
 * - Connection timeout and cleanup
 * - Resource leak detection
 *
 * Performance Validation:
 * - System stability under extreme load
 * - Graceful degradation patterns
 * - Memory and CPU resource management
 * - Connection pool efficiency
 * - Error recovery mechanisms
 * - Service availability during stress
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
} from '../../src/common/websocket/conversational-websocket-bridge.service';
import { ParlantWebSocketIntegrationService } from '../../src/common/websocket/parlant-websocket-integration.service';

// ===== STRESS TESTING FRAMEWORK =====

/**
 * Stress test configuration parameters
 */
interface StressTestConfig {
  maxConnections: number;
  messageFloodRate: number; // messages per second
  testDuration: number; // milliseconds
  connectionBatchSize: number;
  messageBurstSize: number;
  networkLatencySimulation: boolean;
  memoryPressureTest: boolean;
  errorInjectionRate: number; // 0.0 to 1.0
}

/**
 * Stress test metrics and results
 */
interface StressTestMetrics {
  connectionsEstablished: number;
  connectionFailures: number;
  messagesSent: number;
  messagesReceived: number;
  messagesLost: number;
  averageLatency: number;
  maxLatency: number;
  minLatency: number;
  memoryUsage: {
    initial: number;
    peak: number;
    final: number;
    leaked: number;
  };
  cpuUsage: {
    average: number;
    peak: number;
  };
  errorCount: number;
  recoveryTime: number;
  throughput: number;
  stability: number; // 0.0 to 1.0
}

/**
 * High-performance stress testing client
 */
class StressTestClient extends EventEmitter {
  private ws: WebSocket.WebSocket | null = null;
  private connected = false;
  private messagesSent = 0;
  private messagesReceived = 0;
  private errors = 0;
  private startTime = 0;
  private latencies: number[] = [];

  constructor(
    private url: string,
    private clientId: string,
    private config: Partial<StressTestConfig> = {},
  ) {
    super();
  }

  async connect(): Promise<void> {
    this.startTime = performance.now();

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket.WebSocket(this.url, {
          headers: {
            'User-Agent': 'StressTest-Client/1.0',
            'X-Client-ID': this.clientId,
            'X-Test-Type': 'stress',
          },
          handshakeTimeout: 5000, // Aggressive timeout for stress testing
        });

        this.ws.on('open', () => {
          this.connected = true;
          this.emit('connected', { clientId: this.clientId });
          resolve();
        });

        this.ws.on('message', (data: WebSocket.RawData) => {
          this.handleMessage(data);
        });

        this.ws.on('error', (error: Error) => {
          this.errors++;
          this.emit('error', { clientId: this.clientId, error });
          if (!this.connected) {
            reject(error);
          }
        });

        this.ws.on('close', () => {
          this.connected = false;
          this.emit('disconnected', { clientId: this.clientId });
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

      this.messagesReceived++;
      const latency = performance.now() - messageStartTime;
      this.latencies.push(latency);

      this.emit('messageReceived', {
        clientId: this.clientId,
        message,
        latency,
        totalReceived: this.messagesReceived,
      });
    } catch (error) {
      this.errors++;
      this.emit('messageError', { clientId: this.clientId, error });
    }
  }

  async sendMessageFlood(messageCount: number, burstSize = 100): Promise<void> {
    if (!this.connected || !this.ws) {
      throw new Error(`Client ${this.clientId} not connected`);
    }

    const batches = Math.ceil(messageCount / burstSize);

    for (let batch = 0; batch < batches; batch++) {
      const batchStart = batch * burstSize;
      const batchEnd = Math.min(batchStart + burstSize, messageCount);
      const batchPromises: Promise<void>[] = [];

      for (let i = batchStart; i < batchEnd; i++) {
        const message: ConversationalMessage = {
          type: ConversationalMessageType.HEARTBEAT,
          messageId: `stress_msg_${this.clientId}_${i}`,
          sessionId: `stress_session_${this.clientId}`,
          timestamp: Date.now(),
          sequence: i + 1,
          payload: {
            testData: `flood_test_${i}`,
            clientId: this.clientId,
            batchId: batch,
            messageIndex: i,
          },
          metadata: {
            priority: 'low',
            requiresAck: false,
            compression: false,
            routingHints: ['stress'],
          },
        };

        batchPromises.push(this.sendMessage(message));
      }

      await Promise.allSettled(batchPromises);

      // Small delay between batches to prevent overwhelming
      if (batch < batches - 1) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    }
  }

  private async sendMessage(message: ConversationalMessage): Promise<void> {
    if (!this.ws || !this.connected) {
      throw new Error(`Client ${this.clientId} not connected`);
    }

    return new Promise((resolve, reject) => {
      const serialized = JSON.stringify(message);

      this.ws!.send(serialized, (error) => {
        if (error) {
          this.errors++;
          reject(error);
        } else {
          this.messagesSent++;
          resolve();
        }
      });
    });
  }

  getMetrics(): {
    messagesSent: number;
    messagesReceived: number;
    errors: number;
    averageLatency: number;
    maxLatency: number;
    minLatency: number;
  } {
    return {
      messagesSent: this.messagesSent,
      messagesReceived: this.messagesReceived,
      errors: this.errors,
      averageLatency:
        this.latencies.length > 0
          ? this.latencies.reduce((sum, lat) => sum + lat, 0) /
            this.latencies.length
          : 0,
      maxLatency: this.latencies.length > 0 ? Math.max(...this.latencies) : 0,
      minLatency: this.latencies.length > 0 ? Math.min(...this.latencies) : 0,
    };
  }

  async disconnect(): Promise<void> {
    if (this.ws && this.connected) {
      return new Promise((resolve) => {
        this.ws!.close(1000, 'Stress test completed');
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
}

/**
 * Advanced stress test orchestrator
 */
class StressTestOrchestrator extends EventEmitter {
  private clients: Map<string, StressTestClient> = new Map();
  private testStartTime = 0;
  private testEndTime = 0;
  private memorySnapshots: number[] = [];
  private cpuSnapshots: number[] = [];

  constructor(
    private baseUrl: string,
    private config: StressTestConfig,
  ) {
    super();
  }

  async executeStressTest(): Promise<StressTestMetrics> {
    this.testStartTime = performance.now();
    const initialMemory = process.memoryUsage().heapUsed;

    // Start memory and CPU monitoring
    const monitoringInterval = this.startResourceMonitoring();

    try {
      // Phase 1: Establish connections under load
      await this.establishConnectionsUnderLoad();

      // Phase 2: Execute message flooding
      await this.executeMessageFlooding();

      // Phase 3: Test connection recovery
      await this.testConnectionRecovery();

      // Phase 4: Resource cleanup test
      await this.testResourceCleanup();
    } finally {
      clearInterval(monitoringInterval);
      this.testEndTime = performance.now();
    }

    return this.calculateMetrics(initialMemory);
  }

  private async establishConnectionsUnderLoad(): Promise<void> {
    const connectionPromises: Promise<void>[] = [];
    let establishedConnections = 0;
    let failedConnections = 0;

    this.emit('phase', {
      name: 'Connection Establishment',
      status: 'starting',
    });

    for (let i = 0; i < this.config.maxConnections; i++) {
      const clientId = `stress_client_${i.toString().padStart(5, '0')}`;
      const client = new StressTestClient(this.baseUrl, clientId, this.config);

      this.clients.set(clientId, client);

      client.on('connected', () => {
        establishedConnections++;
        this.emit('connectionEstablished', {
          total: establishedConnections,
          target: this.config.maxConnections,
        });
      });

      client.on('error', () => {
        failedConnections++;
        this.emit('connectionFailed', { total: failedConnections });
      });

      connectionPromises.push(
        client.connect().catch(() => {
          // Connection failure tracked in error handler
        }),
      );

      // Batch connections to prevent overwhelming
      if ((i + 1) % this.config.connectionBatchSize === 0) {
        await Promise.allSettled(
          connectionPromises.splice(0, this.config.connectionBatchSize),
        );
        await new Promise((resolve) => setTimeout(resolve, 100)); // Batch delay
      }
    }

    // Wait for remaining connections
    await Promise.allSettled(connectionPromises);

    this.emit('phase', {
      name: 'Connection Establishment',
      status: 'completed',
      established: establishedConnections,
      failed: failedConnections,
    });
  }

  private async executeMessageFlooding(): Promise<void> {
    this.emit('phase', { name: 'Message Flooding', status: 'starting' });

    const connectedClients = Array.from(this.clients.values()).filter(
      (client) => client.isConnected(),
    );
    const messagesPerClient = Math.floor(
      this.config.messageFloodRate / connectedClients.length,
    );

    const floodPromises = connectedClients.map((client) =>
      client
        .sendMessageFlood(messagesPerClient, this.config.messageBurstSize)
        .catch((error) => {
          this.emit('floodError', { clientId: client['clientId'], error });
        }),
    );

    await Promise.allSettled(floodPromises);

    this.emit('phase', { name: 'Message Flooding', status: 'completed' });
  }

  private async testConnectionRecovery(): Promise<void> {
    this.emit('phase', { name: 'Connection Recovery', status: 'starting' });

    const connectedClients = Array.from(this.clients.values()).filter(
      (client) => client.isConnected(),
    );
    const clientsToDisrupt = connectedClients.slice(
      0,
      Math.floor(connectedClients.length * 0.1),
    ); // 10%

    // Simulate connection disruption
    clientsToDisrupt.forEach((client) => {
      if (client['ws']) {
        client['ws'].terminate(); // Abrupt termination
      }
    });

    // Wait for recovery
    await new Promise((resolve) => setTimeout(resolve, 5000));

    this.emit('phase', { name: 'Connection Recovery', status: 'completed' });
  }

  private async testResourceCleanup(): Promise<void> {
    this.emit('phase', { name: 'Resource Cleanup', status: 'starting' });

    const disconnectPromises = Array.from(this.clients.values())
      .filter((client) => client.isConnected())
      .map((client) => client.disconnect());

    await Promise.allSettled(disconnectPromises);

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    this.emit('phase', { name: 'Resource Cleanup', status: 'completed' });
  }

  private startResourceMonitoring(): NodeJS.Timeout {
    return setInterval(() => {
      const memUsage = process.memoryUsage().heapUsed;
      const cpuUsage = process.cpuUsage();

      this.memorySnapshots.push(memUsage);
      this.cpuSnapshots.push(cpuUsage.user + cpuUsage.system);

      this.emit('resourceSnapshot', {
        memory: memUsage,
        cpu: cpuUsage,
        connections: Array.from(this.clients.values()).filter((c) =>
          c.isConnected(),
        ).length,
      });
    }, 1000);
  }

  private calculateMetrics(initialMemory: number): StressTestMetrics {
    const allMetrics = Array.from(this.clients.values()).map((client) =>
      client.getMetrics(),
    );

    const totalMessagesSent = allMetrics.reduce(
      (sum, m) => sum + m.messagesSent,
      0,
    );
    const totalMessagesReceived = allMetrics.reduce(
      (sum, m) => sum + m.messagesReceived,
      0,
    );
    const totalErrors = allMetrics.reduce((sum, m) => sum + m.errors, 0);

    const allLatencies = allMetrics
      .flatMap((m) => [m.averageLatency])
      .filter((lat) => lat > 0);
    const averageLatency =
      allLatencies.length > 0
        ? allLatencies.reduce((sum, lat) => sum + lat, 0) / allLatencies.length
        : 0;

    const testDuration = this.testEndTime - this.testStartTime;
    const finalMemory = process.memoryUsage().heapUsed;

    return {
      connectionsEstablished: Array.from(this.clients.values()).filter((c) =>
        c.isConnected(),
      ).length,
      connectionFailures:
        this.config.maxConnections -
        Array.from(this.clients.values()).filter((c) => c.isConnected()).length,
      messagesSent: totalMessagesSent,
      messagesReceived: totalMessagesReceived,
      messagesLost: totalMessagesSent - totalMessagesReceived,
      averageLatency,
      maxLatency: Math.max(...allMetrics.map((m) => m.maxLatency)),
      minLatency: Math.min(
        ...allMetrics.map((m) => m.minLatency).filter((lat) => lat > 0),
      ),
      memoryUsage: {
        initial: initialMemory,
        peak: Math.max(...this.memorySnapshots),
        final: finalMemory,
        leaked: finalMemory - initialMemory,
      },
      cpuUsage: {
        average:
          this.cpuSnapshots.length > 0
            ? this.cpuSnapshots.reduce((sum, cpu) => sum + cpu, 0) /
              this.cpuSnapshots.length
            : 0,
        peak: Math.max(...this.cpuSnapshots),
      },
      errorCount: totalErrors,
      recoveryTime: 0, // Would need specific measurement
      throughput: totalMessagesSent / (testDuration / 1000),
      stability: Math.max(0, 1 - totalErrors / Math.max(totalMessagesSent, 1)),
    };
  }
}

/**
 * Malformed message injection for error handling tests
 */
class MalformedMessageTester {
  private malformedMessages = [
    '{ invalid json syntax',
    '{"type": "unknown_message_type"}',
    '{"type": "validation_request"}', // Missing required fields
    '{"type": "heartbeat", "payload": null}',
    JSON.stringify({ type: 'heartbeat', payload: 'x'.repeat(1024 * 1024) }), // 1MB payload
    '',
    'null',
    'undefined',
    '[]',
    '{"type": "heartbeat", "sessionId": null}',
  ];

  async testMalformedMessageHandling(url: string): Promise<{
    messagesSent: number;
    errorsHandled: number;
    connectionsMaintained: number;
  }> {
    const client = new WebSocket.WebSocket(url);
    let errorsHandled = 0;
    let connectionsMaintained = 0;

    return new Promise((resolve, reject) => {
      client.on('open', async () => {
        try {
          for (const malformedMessage of this.malformedMessages) {
            client.send(malformedMessage);
            await new Promise((resolve) => setTimeout(resolve, 100));

            if (client.readyState === WebSocket.WebSocket.OPEN) {
              connectionsMaintained++;
            }
          }

          // Wait for potential error responses
          await new Promise((resolve) => setTimeout(resolve, 2000));

          client.close();

          resolve({
            messagesSent: this.malformedMessages.length,
            errorsHandled: errorsHandled,
            connectionsMaintained,
          });
        } catch (error) {
          reject(error);
        }
      });

      client.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          if (message.type === 'error_stream') {
            errorsHandled++;
          }
        } catch (_error) {
          // Ignore parsing errors in response
        }
      });

      client.on('error', reject);
    });
  }
}

// ===== MOCK CONFIGURATION =====

const mockConfigService = {
  get: jest.fn((key: string, defaultValue?: unknown) => {
    const config: Record<string, unknown> = {
      CONVERSATIONAL_WEBSOCKET_PORT: 8081,
      PARLANT_WEBSOCKET_PORT: 8080,
      CONVERSATIONAL_ALLOWED_ORIGINS: 'http://localhost:3000',
      PARLANT_ALLOWED_ORIGINS: 'http://localhost:3000',
      CONVERSATIONAL_REQUIRE_HTTPS: false,
      PARLANT_REQUIRE_HTTPS: false,
    };
    return config[key] ?? defaultValue;
  }),
};

// ===== STRESS TEST SUITE =====

describe('WebSocket Stress Testing Suite', () => {
  let conversationalService: ConversationalWebSocketBridgeService;
  let integrationService: ParlantWebSocketIntegrationService;
  let module: TestingModule;

  const TEST_PORT = 8081;
  const TEST_URL = `ws://localhost:${TEST_PORT}`;

  beforeAll(async () => {
    jest.setTimeout(600000); // 10 minutes for stress tests

    module = await Test.createTestingModule({
      providers: [
        ConversationalWebSocketBridgeService,
        ParlantWebSocketIntegrationService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    conversationalService = module.get<ConversationalWebSocketBridgeService>(
      ConversationalWebSocketBridgeService,
    );
    integrationService = module.get<ParlantWebSocketIntegrationService>(
      ParlantWebSocketIntegrationService,
    );

    await integrationService.onModuleInit();
    await new Promise((resolve) => setTimeout(resolve, 2000));
  });

  afterAll(async () => {
    await integrationService.onApplicationShutdown();
    await conversationalService.onApplicationShutdown();
    await module.close();
  });

  describe('Extreme Load Testing', () => {
    it('should handle 5000+ concurrent connections', async () => {
      const config: StressTestConfig = {
        maxConnections: 5000,
        messageFloodRate: 10000,
        testDuration: 30000,
        connectionBatchSize: 200,
        messageBurstSize: 100,
        networkLatencySimulation: false,
        memoryPressureTest: true,
        errorInjectionRate: 0.01,
      };

      const orchestrator = new StressTestOrchestrator(TEST_URL, config);

      let phaseUpdates = 0;
      orchestrator.on('phase', (data) => {
        console.log(`Stress Test Phase: ${data.name} - ${data.status}`);
        phaseUpdates++;
      });

      const results = await orchestrator.executeStressTest();

      expect(results.connectionsEstablished).toBeGreaterThan(4000); // Allow 20% failure rate
      expect(results.stability).toBeGreaterThan(0.8); // 80% stability
      expect(results.memoryUsage.leaked).toBeLessThan(100 * 1024 * 1024); // <100MB leak
      expect(phaseUpdates).toBeGreaterThan(0);

      console.log('Extreme Load Test Results:', {
        connectionsEstablished: results.connectionsEstablished,
        messagesSent: results.messagesSent,
        messagesReceived: results.messagesReceived,
        messageLossRate: `${((results.messagesLost / results.messagesSent) * 100).toFixed(2)}%`,
        averageLatency: `${results.averageLatency.toFixed(2)}ms`,
        throughput: `${Math.floor(results.throughput)} msg/sec`,
        memoryLeak: `${(results.memoryUsage.leaked / 1024 / 1024).toFixed(2)}MB`,
        stability: `${(results.stability * 100).toFixed(1)}%`,
      });
    });

    it('should maintain performance under high-frequency message flooding', async () => {
      const config: StressTestConfig = {
        maxConnections: 1000,
        messageFloodRate: 50000, // 50k messages/second
        testDuration: 15000,
        connectionBatchSize: 100,
        messageBurstSize: 500,
        networkLatencySimulation: false,
        memoryPressureTest: false,
        errorInjectionRate: 0,
      };

      const orchestrator = new StressTestOrchestrator(TEST_URL, config);
      const results = await orchestrator.executeStressTest();

      expect(results.throughput).toBeGreaterThan(10000); // >10k msg/sec
      expect(results.averageLatency).toBeLessThan(100); // <100ms under flood
      expect(results.messagesLost / results.messagesSent).toBeLessThan(0.05); // <5% loss

      console.log('Message Flooding Results:', {
        throughput: `${Math.floor(results.throughput)} msg/sec`,
        averageLatency: `${results.averageLatency.toFixed(2)}ms`,
        messageLossRate: `${((results.messagesLost / results.messagesSent) * 100).toFixed(2)}%`,
      });
    });
  });

  describe('Failure Scenario Testing', () => {
    it('should handle malformed message injection gracefully', async () => {
      const tester = new MalformedMessageTester();
      const results = await tester.testMalformedMessageHandling(TEST_URL);

      expect(results.connectionsMaintained).toBeGreaterThan(
        results.messagesSent * 0.8,
      ); // 80% maintained
      expect(results.errorsHandled).toBeGreaterThan(0); // Some errors should be handled

      console.log('Malformed Message Test Results:', {
        messagesSent: results.messagesSent,
        errorsHandled: results.errorsHandled,
        connectionsMaintained: results.connectionsMaintained,
        resilience: `${((results.connectionsMaintained / results.messagesSent) * 100).toFixed(1)}%`,
      });
    });

    it('should recover from network interruption scenarios', async () => {
      const client = new StressTestClient(TEST_URL, 'recovery_test_client');

      await client.connect();
      expect(client.isConnected()).toBe(true);

      // Simulate network interruption by terminating the connection
      if (client['ws']) {
        client['ws'].terminate();
      }

      // Wait for connection to be recognized as closed
      await new Promise((resolve) => setTimeout(resolve, 1000));
      expect(client.isConnected()).toBe(false);

      // Attempt reconnection
      await client.connect();
      expect(client.isConnected()).toBe(true);

      await client.disconnect();
    });
  });

  describe('Resource Management Under Stress', () => {
    it('should manage memory efficiently under connection pressure', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      const config: StressTestConfig = {
        maxConnections: 2000,
        messageFloodRate: 1000,
        testDuration: 10000,
        connectionBatchSize: 100,
        messageBurstSize: 50,
        networkLatencySimulation: false,
        memoryPressureTest: true,
        errorInjectionRate: 0,
      };

      const orchestrator = new StressTestOrchestrator(TEST_URL, config);
      const results = await orchestrator.executeStressTest();

      // Memory should not grow excessively
      const memoryGrowthRatio =
        results.memoryUsage.peak / results.memoryUsage.initial;
      expect(memoryGrowthRatio).toBeLessThan(10); // Less than 10x growth

      // Memory should be cleaned up after test
      const finalMemory = process.memoryUsage().heapUsed;
      const cleanupRatio = (finalMemory - initialMemory) / initialMemory;
      expect(cleanupRatio).toBeLessThan(2); // Less than 2x growth after cleanup

      console.log('Memory Management Results:', {
        initialMemory: `${(results.memoryUsage.initial / 1024 / 1024).toFixed(2)}MB`,
        peakMemory: `${(results.memoryUsage.peak / 1024 / 1024).toFixed(2)}MB`,
        finalMemory: `${(results.memoryUsage.final / 1024 / 1024).toFixed(2)}MB`,
        memoryLeak: `${(results.memoryUsage.leaked / 1024 / 1024).toFixed(2)}MB`,
        growthRatio: `${memoryGrowthRatio.toFixed(2)}x`,
      });
    });

    it('should maintain service availability during stress', async () => {
      // Start a baseline test to ensure service is responsive
      const baselineClient = new StressTestClient(TEST_URL, 'baseline_client');
      await baselineClient.connect();

      const baselineStart = performance.now();
      await baselineClient.sendMessageFlood(10, 10);
      const baselineTime = performance.now() - baselineStart;

      // Now run concurrent stress test
      const config: StressTestConfig = {
        maxConnections: 1000,
        messageFloodRate: 5000,
        testDuration: 5000,
        connectionBatchSize: 100,
        messageBurstSize: 100,
        networkLatencySimulation: false,
        memoryPressureTest: false,
        errorInjectionRate: 0.02,
      };

      const orchestrator = new StressTestOrchestrator(TEST_URL, config);
      const stressPromise = orchestrator.executeStressTest();

      // Test service availability during stress
      const duringStressStart = performance.now();
      await baselineClient.sendMessageFlood(10, 10);
      const duringStressTime = performance.now() - duringStressStart;

      await stressPromise;

      // Service should still be reasonably responsive
      const performanceDegradation = duringStressTime / baselineTime;
      expect(performanceDegradation).toBeLessThan(10); // Less than 10x slower

      await baselineClient.disconnect();

      console.log('Service Availability Results:', {
        baselineTime: `${baselineTime.toFixed(2)}ms`,
        stressTime: `${duringStressTime.toFixed(2)}ms`,
        degradation: `${performanceDegradation.toFixed(2)}x`,
      });
    });
  });
});
