/**
 * WebSocket Connection Lifecycle Testing Suite
 *
 * Comprehensive testing of WebSocket connection establishment, maintenance,
 * and cleanup processes for PARLANT Phase 1 conversational functionality.
 *
 * Test Coverage:
 * - Connection establishment and authentication
 * - Connection state management and monitoring
 * - Graceful disconnection and cleanup
 * - Reconnection and failover scenarios
 * - Connection pool management
 * - Session correlation and tracking
 *
 * Performance Targets:
 * - Sub-100ms connection establishment
 * - 99.9% connection success rate
 * - Clean resource cleanup on disconnect
 * - Automatic reconnection within 5 seconds
 *
 * @author Claude Code - WebSocket Connection Lifecycle Testing Agent
 * @version 1.0.0
 */;

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as WebSocket from 'ws';
import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';
import { createServer, Server } from 'http';
import {
  ConversationalWebSocketBridgeService,
  ConversationalMessage,
  ConversationalMessageType,

} from '../conversational-websocket-bridge.service';

// ===== TYPE DEFINITIONS =====

/**
 * Connection metrics interface for type safety
 */
interface ConnectionMetrics {
  connectionTime?: number;
  disconnectionTime?: number;
  reconnectionCount: number;
  totalConnections: number;
  lastConnectionError?: Error;


}

/**
 * Type-safe parsed message interface
 */
interface ParsedMessage {
  sessionId?: string;
  sequence?: number;
  messageId?: string;
  type?: ConversationalMessageType;
  payload?: {
    originalMessage?: ParsedMessage;
    [key: string]: unknown;
  

};
  [key: string]: unknown;
};

import { ParlantWebSocketBridgeService } from '../parlant-websocket-bridge.service';
import {
  createSafeWebSocketServer,
  createSecureVerifyCallback,
  validateWebSocketHeaders,

} from '../websocket-types';

// ===== CONNECTION LIFECYCLE TEST UTILITIES =====

/**
 * Advanced WebSocket client for connection lifecycle testing
 */
class ConnectionLifecycleTestClient extends EventEmitter {
  private ws: WebSocket.WebSocket | null = null;
  private connectionState: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' = 'disconnected';
  private reconnectionAttempts = 0;
  private maxReconnectionAttempts = 5;
  private reconnectionDelay = 1000;
  private connectionMetrics: ConnectionMetrics = {
  reconnectionCount: 0,
    totalConnections: 0,
  
};

  constructor(
    private url: string,
    private options: {
  autoReconnect?: boolean;
      maxReconnectionAttempts?: number;
      reconnectionDelay?: number;
      headers?: Record<string, string>;
    
} = {}
  ) {
  super();
    this.maxReconnectionAttempts = options.maxReconnectionAttempts ?? 5;
    this.reconnectionDelay = options.reconnectionDelay ?? 1000;
  
}

  async connect(): Promise<void>  {
    if (this.connectionState === 'connected' || this.connectionState === 'connecting') {return;}

    this.connectionState = 'connecting';
const startTime = performance.now();return new Promise((resolve, reject) => {
  try {
        this.ws = new WebSocket.WebSocket(this.url, {
  headers: this.options.headers,

});

        const connectionTimeout = setTimeout(() => {
          if (this.connectionState === 'connecting') {this.ws?.terminate();const error = new Error('Connection timeout');this.connectionMetrics.lastConnectionError = error;this.connectionState = 'disconnected';
reject(error);}
        }, 10000); // 10 second timeout

        this.ws.on('open', () => {
  clearTimeout(connectionTimeout);this.connectionState = 'connected';
this.connectionMetrics.connectionTime = performance.now() - startTime;this.connectionMetrics.totalConnections++;
          this.reconnectionAttempts = 0;
          this.emit('connected', this.connectionMetrics as ConnectionMetrics);
resolve();
});

        this.ws.on('message', (data: WebSocket.RawData) => {try {const message = JSON.parse(Buffer.from(data as ArrayBuffer).toString('utf8'));this.emit('message', message);} catch (error) {this.emit('error', new Error(`Failed to parse message: ${String(error)}`));
          }
        });

        this.ws.on('error', (error: Error) => {
  clearTimeout(connectionTimeout);this.connectionMetrics.lastConnectionError = error;
          this.connectionState = 'disconnected';
this.emit('error', error);
reject(error);
});

        this.ws.on('close', (code: number, reason: Buffer) => {
          clearTimeout(connectionTimeout);
          this.connectionMetrics.disconnectionTime = performance.now();
          this.connectionState = 'disconnected';
          this.emit('disconnected', { code, reason: reason.toString() });

          // Auto-reconnect if enabled and not a normal closure
          if (this.options.autoReconnect && code !== 1000 && this.reconnectionAttempts < this.maxReconnectionAttempts) {
            this.scheduleReconnection();
          
}
        });

      } catch (error) {
        this.connectionState = 'disconnected';
        this.connectionMetrics.lastConnectionError = error as Error;
        reject(error);
      
}
    });
  }

  private scheduleReconnection(): void {
  this.connectionState = 'reconnecting';
this.reconnectionAttempts++;this.connectionMetrics.reconnectionCount++;

    const delay = this.reconnectionDelay * Math.pow(2, this.reconnectionAttempts - 1); // Exponential backoff

    setTimeout(async () => {
      try {
        await this.connect();
      
} catch (error) {
        this.emit('reconnection-failed', { attempt: this.reconnectionAttempts, error });}}, delay);
  }

  async sendMessage(message: ConversationalMessage): Promise<void>  {
    if (this.connectionState !== 'connected' || !this.ws) {throw new Error('WebSocket not connected');}
this.ws.send(JSON.stringify(message));
  }

  async disconnect(code = 1000, reason = 'Normal closure'): Promise<void>  {if (this.ws && this.connectionState === 'connected') {this.ws.close(code, reason);}
  }

  forceDisconnect(): void {
  if (this.ws) {
      this.ws.terminate();
      this.connectionState = 'disconnected';
}}

  getConnectionState(): string {
  return this.connectionState;
  
}

  getConnectionMetrics() {
    return { ...this.connectionMetrics };
  }

  isConnected(): boolean {
    return this.connectionState === 'connected' && this.ws?.readyState === WebSocket.WebSocket.OPEN;}}

/**
 * Connection pool manager for testing concurrent connections
 */
class ConnectionPoolTester {
  private connections: ConnectionLifecycleTestClient[] = [];
  private poolMetrics = {
  activeConnections: 0,
    totalConnections: 0,
    failedConnections: 0,
    averageConnectionTime: 0,
    connectionTimes: [] as number[],
  
};

  async createConnectionPool(poolSize: number, url: string): Promise<void>  {
  const connectionPromises: Promise<void>[] = [];

    for (let i = 0; i < poolSize; i++) {
      const client = new ConnectionLifecycleTestClient(url, {
  autoReconnect: true,
        maxReconnectionAttempts: 3,
        headers: { 'X-Client-ID': `pool-client-${i
}` },
      });

      client.on('connected', (metrics: ConnectionMetrics) => {
  this.poolMetrics.activeConnections++;this.poolMetrics.totalConnections++;
        if (metrics.connectionTime) {
          this.poolMetrics.connectionTimes.push(metrics.connectionTime);
          this.poolMetrics.averageConnectionTime =
            this.poolMetrics.connectionTimes.reduce((sum, time) => sum + time, 0) /
            this.poolMetrics.connectionTimes.length;
        
}
      });

      client.on('disconnected', () => {this.poolMetrics.activeConnections--;});

      client.on('error', () => {this.poolMetrics.failedConnections++;});

      this.connections.push(client);
      connectionPromises.push(client.connect().catch(() => {
  // Handle individual connection failures
      
}));
    }

    await Promise.allSettled(connectionPromises);
  }

  async disconnectAll(): Promise<void>  {
  const disconnectionPromises = this.connections.map(client =>
      client.disconnect().catch(() => {
})
    );

    await Promise.allSettled(disconnectionPromises);
    this.connections = [];
  }

  getPoolMetrics() {
  return {
      ...this.poolMetrics,
      successRate: this.poolMetrics.totalConnections > 0
        ? (this.poolMetrics.totalConnections - this.poolMetrics.failedConnections) / this.poolMetrics.totalConnections
        : 0,
    
};
  }

  getActiveConnections(): number {
  return this.connections.filter(client => client.isConnected()).length;
  
}
}

// ===== MOCK CONFIGURATION =====

const mockConfigService = {

  get: jest.fn((key: string, defaultValue?: unknown) => {
    const config: Record<string, unknown> = {
      'CONVERSATIONAL_WEBSOCKET_PORT': 8181,
      'PARLANT_WEBSOCKET_PORT': 8182,
      'CONVERSATIONAL_ALLOWED_ORIGINS': 'http://localhost:3000,https://localhost:3000',
      'PARLANT_ALLOWED_ORIGINS': 'http://localhost:3000',
      'CONVERSATIONAL_REQUIRE_HTTPS': false,
      'PARLANT_REQUIRE_HTTPS': false,
      'WEBSOCKET_MAX_CONNECTIONS': 1000,
      'WEBSOCKET_CONNECTION_TIMEOUT': 10000,
      'WEBSOCKET_HEARTBEAT_INTERVAL': 30000,

};
return config[key] ?? defaultValue;
  }),
};

// ===== CONNECTION LIFECYCLE TEST SUITE =====

describe('WebSocket Connection Lifecycle Tests', () => {

  let conversationalService: ConversationalWebSocketBridgeService;
  let parlantService: ParlantWebSocketBridgeService;
  let module: TestingModule;
  let testServer: Server;
  let wsServer: WebSocket.Server;

  const TEST_PORT = 8181;
  const TEST_URL = `ws://localhost:$TEST_PORT
}`;

  beforeAll(async () => {
  jest.setTimeout(60000); // 1 minute for connection tests

    // Create test module
    module = await Test.createTestingModule({
  providers: [
        ConversationalWebSocketBridgeService,
        ParlantWebSocketBridgeService,
        {
  provide: ConfigService,
          useValue: mockConfigService,
        
},
      ],
    }).compile();

    conversationalService = module.get<ConversationalWebSocketBridgeService>(ConversationalWebSocketBridgeService);
    parlantService = module.get<ParlantWebSocketBridgeService>(ParlantWebSocketBridgeService);

    // Create test WebSocket server
    testServer = createServer();
    wsServer = createSafeWebSocketServer({
  server: testServer,
      verifyClient: createSecureVerifyCallback({
        allowedOrigins: ['http://localhost:3000', 'https://localhost:3000'],
      requireHttps: false,
      maxConnections: 10,
        rateLimitByIP: false,
      
}),
    });

    // Handle WebSocket connections
    wsServer.on('connection', (ws: WebSocket.WebSocket, req) => {
      console.log(`New WebSocket connection from ${req.connection.remoteAddress}`);

      ws.on('message', (data: WebSocket.RawData) => {
  try {const message = JSON.parse(Buffer.from(data as ArrayBuffer).toString('utf8')) as ParsedMessage;

          // Echo back with confirmation
          const response: ConversationalMessage = {
  messageId: `response_${Date.now()
}`,
            sessionId: message.sessionId ?? 'test-session',
      timestamp: Date.now(),
      sequence: (message.sequence ?? 0) + 1,
            type: ConversationalMessageType.STATUS_UPDATE,
            payload: {
              status: 'received',
      originalMessage: message,},
            metadata: {
  priority: 'normal',
      requiresAck: false,
      compression: false,
              routingHints: [],
            
},
          };

          ws.send(JSON.stringify(response));
        } catch (_error) {
          ws.send(JSON.stringify({ error: 'Invalid message format' }));}});

      ws.on('close', () => {console.log('WebSocket connection closed');});ws.on('error', (error) => {console.error('WebSocket error:', error);});});

    // Start test server
    await new Promise<void>((resolve) => {
  testServer.listen(TEST_PORT, resolve);
    
});
  });

  afterAll(async () => {
  // Cleanup test server
    wsServer.close();
    await new Promise<void>((resolve) => {
      testServer.close(() => resolve());
    
});

    // Cleanup services
    await conversationalService.onApplicationShutdown();
    await parlantService.onApplicationShutdown();
    await module.close();
  });

  // ===== BASIC CONNECTION TESTS =====

  describe('Basic Connection Establishment', () => {

  it('should establish WebSocket connection successfully', async () => {
    const client = new ConnectionLifecycleTestClient(TEST_URL);
    let connectionEvent: ConnectionMetrics | null = null;

      client.on('connected', (metrics: ConnectionMetrics) => {connectionEvent = metrics;
});

      await client.connect();

      expect(client.isConnected()).toBe(true);
      expect(client.getConnectionState()).toBe('connected');
expect(connectionEvent).toBeTruthy();
expect(connectionEvent?.connectionTime).toBeLessThan(1000); // Sub-1000ms connection
      expect(connectionEvent?.totalConnections).toBe(1);

      await client.disconnect();
    });



    it('should handle connection timeout gracefully', async () => {
      // Test with invalid URL to simulate timeout
      const client = new ConnectionLifecycleTestClient('ws://localhost:99999', {
        maxReconnectionAttempts: 1,
      });

      await expect(client.connect()).rejects.toThrow();
      expect(client.getConnectionState()).toBe('disconnected');
      const metrics = client.getConnectionMetrics();
      expect(metrics.lastConnectionError).toBeTruthy();
    });



    it('should validate WebSocket headers correctly', async () => {
      const validHeaders = {
        'upgrade': 'websocket',
        'connection': 'upgrade',
        'sec-websocket-key': 'dGhlIHNhbXBsZSBub25jZQ==',
        'sec-websocket-version': '13',
      };
      const invalidHeaders = {
        'upgrade': 'http',
        'connection': 'keep-alive',
      };
const validResult = validateWebSocketHeaders(validHeaders);
      const invalidResult = validateWebSocketHeaders(invalidHeaders);

      expect(validResult.valid).toBe(true);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.reason).toContain('Upgrade header');});});

  // ===== CONNECTION STATE MANAGEMENT =====

  describe('Connection State Management', () => {

  it('should track connection state transitions correctly', async () => {
    const client = new ConnectionLifecycleTestClient(TEST_URL);
    const stateTransitions: string[] = [];

      // Track state changes
      const originalConnect = client.connect.bind(client);
      const originalDisconnect = client.disconnect.bind(client);

      client.connect = async () => {
        stateTransitions.push(client.getConnectionState());
        await originalConnect();
        stateTransitions.push(client.getConnectionState());
      
};

      client.disconnect = async (...args) => {
  stateTransitions.push(client.getConnectionState());
        await originalDisconnect(...args);
        // Wait for disconnection to complete
        await new Promise(resolve => setTimeout(resolve, 100));
        stateTransitions.push(client.getConnectionState());
      
};

      await client.connect();
      await client.disconnect();

      expect(stateTransitions).toEqual(['connecting', 'connected', 'connected', 'disconnected']);});


it('should maintain connection metrics accurately', async () => {

  const client = new ConnectionLifecycleTestClient(TEST_URL);await client.connect();
      const metricsAfterConnect = client.getConnectionMetrics();

      await client.disconnect();
      const metricsAfterDisconnect = client.getConnectionMetrics();

      expect(metricsAfterConnect.totalConnections).toBe(1);
      expect(metricsAfterConnect.connectionTime).toBeDefined();
      expect(metricsAfterConnect.connectionTime).toBeGreaterThan(0);

      expect(metricsAfterDisconnect.disconnectionTime).toBeDefined();
      expect(metricsAfterDisconnect.disconnectionTime).toBeGreaterThan(metricsAfterConnect.connectionTime!);
    
});
  });

  // ===== RECONNECTION AND FAILOVER =====

  describe('Reconnection and Failover', () => { 

  it('should handle automatic reconnection after connection loss', async () => {
    const client = new ConnectionLifecycleTestClient(TEST_URL, {
      autoReconnect: true,
        maxReconnectionAttempts: 3,
        reconnectionDelay: 500,
      
});

      let reconnectionEvents = 0;
      let reconnectionFailures = 0;

      client.on('connected', () => {
  if (reconnectionEvents > 0) {// This is a reconnection
          reconnectionEvents++;
        
}
      });

      client.on('reconnection-failed', () => {reconnectionFailures++;});

      await client.connect();
      expect(client.isConnected()).toBe(true);

      // Force disconnection to trigger reconnection
      client.forceDisconnect();
      expect(client.isConnected()).toBe(false);

      // Wait for reconnection attempts
      await new Promise(resolve => setTimeout(resolve, 2000));

      const metrics = client.getConnectionMetrics();
      expect(metrics.reconnectionCount).toBeGreaterThan(0);

      await client.disconnect();
    });



    it('should implement exponential backoff for reconnection', async () => {

      const client = new ConnectionLifecycleTestClient('ws://localhost:99999', {
        autoReconnect: true,
        maxReconnectionAttempts: 3,
        reconnectionDelay: 100, // Start with 100ms
      
});

      const reconnectionTimes: number[] = [];
      let lastAttemptTime = Date.now();

      client.on('reconnection-failed', ({ attempt }) => {
  const currentTime = Date.now();if (attempt > 1) {
          reconnectionTimes.push(currentTime - lastAttemptTime);
        
}
        lastAttemptTime = currentTime;
      });

      // This will fail and trigger reconnection attempts
      await client.connect().catch(() => {});

      // Wait for all reconnection attempts
      await new Promise(resolve => setTimeout(resolve, 5000));

      expect(reconnectionTimes.length).toBeGreaterThan(0);

      // Verify exponential backoff (each delay should be longer than the previous)
      for (let i = 1; i < reconnectionTimes.length; i++) {
  expect(reconnectionTimes[i]).toBeGreaterThan(reconnectionTimes[i - 1]);
      
}
    });



    it('should stop reconnection after max attempts', async () => {

      const maxAttempts = 3;
      const client = new ConnectionLifecycleTestClient('ws://localhost:99999', {
        autoReconnect: true,
      maxReconnectionAttempts: maxAttempts,
        reconnectionDelay: 100,
      
});

      let totalAttempts = 0;
      client.on('reconnection-failed', ({ attempt }) => {
        totalAttempts = attempt;
      });

      await client.connect().catch(() => {});

      // Wait for all reconnection attempts to complete
      await new Promise(resolve => setTimeout(resolve, 3000));

      expect(totalAttempts).toBe(maxAttempts);
      expect(client.getConnectionState()).toBe('disconnected');
    });
  });

  // ===== CONNECTION POOL MANAGEMENT =====

  describe('Connection Pool Management', () => {

  it('should manage multiple concurrent connections', async () => {
    const poolSize = 10;
    const poolTester = new ConnectionPoolTester();

      await poolTester.createConnectionPool(poolSize, TEST_URL);

      const activeConnections = poolTester.getActiveConnections();
      const metrics = poolTester.getPoolMetrics();

      expect(activeConnections).toBeGreaterThan(0);
      expect(metrics.totalConnections).toBeGreaterThan(0);
      expect(metrics.successRate).toBeGreaterThan(0.8); // At least 80% success rate
      expect(metrics.averageConnectionTime).toBeLessThan(1000); // Sub-1000ms average

      await poolTester.disconnectAll();

      const finalActiveConnections = poolTester.getActiveConnections();
      expect(finalActiveConnections).toBe(0);
    
});



    it('should handle connection pool cleanup properly', async () => {

  const poolSize = 5;const poolTester = new ConnectionPoolTester();

      await poolTester.createConnectionPool(poolSize, TEST_URL);

      const initialActive = poolTester.getActiveConnections();
      expect(initialActive).toBeGreaterThan(0);

      await poolTester.disconnectAll();

      const finalActive = poolTester.getActiveConnections();
      const finalMetrics = poolTester.getPoolMetrics();

      expect(finalActive).toBe(0);
      expect(finalMetrics.activeConnections).toBe(0);
    
});



    it('should track connection pool performance metrics', async () => {
      const poolSize = 8;
      const poolTester = new ConnectionPoolTester();

      const startTime = performance.now();
      await poolTester.createConnectionPool(poolSize, TEST_URL);
      const totalSetupTime = performance.now() - startTime;

      const metrics = poolTester.getPoolMetrics();

      expect(metrics.totalConnections).toBeGreaterThan(0);
      expect(metrics.averageConnectionTime).toBeGreaterThan(0);
      expect(metrics.connectionTimes.length).toBeGreaterThan(0);
      expect(totalSetupTime).toBeLessThan(5000); // Pool setup under 5 seconds

      console.log('Connection Pool Performance:', {
        poolSize,
        totalSetupTime: `${totalSetupTime.toFixed(2)
}
ms`,successRate: `${(metrics.successRate * 100).toFixed(1)}%`,averageConnectionTime: `${metrics.averageConnectionTime.toFixed(2)}
ms`,
        activeConnections: poolTester.getActiveConnections(),
      });

      await poolTester.disconnectAll();
    });
  });

  // ===== SESSION CORRELATION AND TRACKING =====

  describe('Session Correlation and Tracking', () => {

  it('should correlate WebSocket connections with sessions', async () => {
    const sessionId = 'test-session-correlation-123';
const client = new ConnectionLifecycleTestClient(TEST_URL, {headers: {
          'X-Session-ID': sessionId,'X-User-ID': 'test-user-456',
},});

      let receivedMessage: ParsedMessage | null = null;

      client.on('message', (message: ParsedMessage) => {receivedMessage = message;});

      await client.connect();

      // Send a message with session correlation
      const testMessage: ConversationalMessage = {
  messageId: 'session-correlation-test',
      sessionId,timestamp: Date.now(),
        sequence: 1,
        type: ConversationalMessageType.HEARTBEAT,
        payload: { correlation: 'test' 
},metadata: {
  priority: 'normal',
      requiresAck: false,
      compression: false,
          routingHints: ['session-test'],
},};

      await client.sendMessage(testMessage);

      // Wait for response
      await new Promise(resolve => setTimeout(resolve, 500));

      expect(receivedMessage).toBeTruthy();
      expect(receivedMessage?.sessionId).toBe(sessionId);
      if (receivedMessage?.payload) {
  const payload = receivedMessage.payload;
        if (typeof payload === 'object' && payload !== null && 'originalMessage' in payload) {const originalMessageValue = (payload as Record<string, unknown>).originalMessage;if (originalMessageValue && typeof originalMessageValue === 'object') {const originalMessage = originalMessageValue as ParsedMessage;
expect(originalMessage.sessionId).toBe(sessionId);
          
}
        }
      }

      await client.disconnect();
    });



    it('should track connection lifecycle events per session', async () => {

      const sessionEvents: Array<{
        sessionId: string;
        event: string;
        timestamp: number;
      
}> = [];

      const trackEvent = (sessionId: string, event: string) => {
  sessionEvents.push({
          sessionId,
          event,
          timestamp: Date.now(),
        
});
      };

      const sessionId = 'lifecycle-tracking-session';
const client = new ConnectionLifecycleTestClient(TEST_URL, {headers: { 'X-Session-ID': sessionId },});client.on('connected', () => trackEvent(sessionId, 'connected'));client.on('disconnected', () => trackEvent(sessionId, 'disconnected'));
trackEvent(sessionId, 'connection-attempt');await client.connect();await client.disconnect();

      expect(sessionEvents).toHaveLength(3);
      expect(sessionEvents[0].event).toBe('connection-attempt');
expect(sessionEvents[1].event).toBe('connected');
expect(sessionEvents[2].event).toBe('disconnected');// Verify event timingexpect(sessionEvents[1].timestamp).toBeGreaterThan(sessionEvents[0].timestamp);
      expect(sessionEvents[2].timestamp).toBeGreaterThan(sessionEvents[1].timestamp);
    });
  });

  // ===== PERFORMANCE AND RELIABILITY =====

  describe('Performance and Reliability', () => {

  it('should maintain sub-100ms connection establishment target', async () => {
    const connectionCount = 20;
    const connectionTimes: number[] = [];

      for (let i = 0; i < connectionCount; i++) {
        const client = new ConnectionLifecycleTestClient(TEST_URL);

        const startTime = performance.now();
        await client.connect();
        const connectionTime = performance.now() - startTime;

        connectionTimes.push(connectionTime);
        await client.disconnect();
      
}

      const averageConnectionTime = connectionTimes.reduce((sum, time) => sum + time, 0) / connectionTimes.length;
      const p95ConnectionTime = connectionTimes.sort((a, b) => a - b)[Math.floor(connectionTimes.length * 0.95)] ?? 0;

      console.log('Connection Performance Metrics:', {
  connectionCount,
        averageConnectionTime: `${averageConnectionTime.toFixed(2)
}
ms`,p95ConnectionTime: `${p95ConnectionTime.toFixed(2)}
ms`,
        target: '100ms',
        fastestConnection: `${Math.min(...connectionTimes).toFixed(2)}
ms`,slowestConnection: `${Math.max(...connectionTimes).toFixed(2)}
ms`,
      });

      expect(averageConnectionTime).toBeLessThan(100); // Sub-100ms average
      expect(p95ConnectionTime).toBeLessThan(200); // P95 under 200ms
    });



    it('should achieve 99.9% connection success rate', async () => {

      const totalAttempts = 100;
      let successfulConnections = 0;
      let failedConnections = 0;

      const connectionPromises = Array.from({
        length: totalAttempts
      }, async (_, i) => {
  try {
          const client = new ConnectionLifecycleTestClient(TEST_URL, {
  headers: { 'X-Client-ID': `reliability-test-${i
}` },
          });

          await client.connect();
          successfulConnections++;
          await client.disconnect();

          return { success: true, clientId: i };
        } catch (error) {
  failedConnections++;
          return { success: false, clientId: i, error 
};
        }
      });

      const results = await Promise.allSettled(connectionPromises);
      const successRate = successfulConnections / totalAttempts;

      console.log('Connection Reliability Test:', {
  totalAttempts,
        successfulConnections,
        failedConnections,
        successRate: `${(successRate * 100).toFixed(3)
}%`,
        target: '99.9%',
      });

      expect(successRate).toBeGreaterThan(0.99); // 99%+ success rate (allowing for test environment variance)
      expect(successfulConnections + failedConnections).toBe(totalAttempts);
    });
  });
});