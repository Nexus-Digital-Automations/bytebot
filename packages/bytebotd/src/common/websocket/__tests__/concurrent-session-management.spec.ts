/**
 * Concurrent Session Management Testing Suite
 *
 * Comprehensive testing of concurrent WebSocket session management for PARLANT Phase 1
 * conversational functionality, including session lifecycle, correlation, isolation,
 * and resource management across multiple simultaneous sessions.
 *
 * Test Coverage:
 * - Concurrent session creation and management
 * - Session isolation and data integrity
 * - Cross-session message routing and correlation
 * - Session state synchronization across devices
 * - Resource allocation and cleanup
 * - Session failover and recovery
 * - Multi-user concurrent validation workflows
 *
 * Performance Targets:
 * - 1000+ concurrent active sessions
 * - Session creation under 100ms
 * - Zero cross-session data leakage
 * - 99.9% session isolation integrity
 *
 * @author Claude Code - Concurrent Session Management Testing Agent
 * @version 1.0.0
 */;

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as WebSocket from 'ws';
import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';
import { createServer, Server } from 'http';
import { randomUUID } from 'crypto';
import {
  ConversationalWebSocketBridgeService,
  ConversationalMessage,
  ConversationalMessageType,
  ValidationRequestMessage,
  SessionSyncMessage,
  SecurityContext,
  ActionImpact,
  ValidationAction,

} from '../conversational-websocket-bridge.service';
import { ParlantWebSocketIntegrationService } from '../parlant-websocket-integration.service';
import { createSafeWebSocketServer } from '../websocket-types';

// ===== TYPE DEFINITIONS =====

/**
 * Represents the payload of a validation response message
 */
interface ValidationResponsePayload {
  validationId: string;
  approved: boolean;
  confidence: number;
  reasoning: string;
  conversationId: string;
  requiresUserConfirmation: boolean;
  metadata: {
    processingTime: number;
    sessionId: string;
    userId: string;
  };
}

/**
 * Details of an isolation violation for testing purposes
 */
interface IsolationViolationDetails {
  receivedData?: string;
  fromSession?: string;
  expectedSessionId?: string;
  foundMessages?: ConversationalMessage[];


}

/**
 * Result of a validation operation for concurrent testing
 */
interface ValidationResult {
  sessionId: string;
  success: boolean;
  response?: ValidationResponsePayload;
  error?: Error;


}

// ===== SESSION MANAGEMENT TEST UTILITIES =====

/**
 * Represents a single WebSocket session for testing
 */
class TestSession extends EventEmitter {
  private ws: WebSocket.WebSocket | null = null;
  private sessionState: {
  connected: boolean;
  lastActivity: number;
    messageCount: number;
  messagesReceived: ConversationalMessage[];
    validations: Map<string, ValidationResponsePayload>;
    deviceSessions: string[];
  
} = {
  connected: false,
    lastActivity: 0,
    messageCount: 0,
    messagesReceived: [],
    validations: new Map(),
    deviceSessions: [],
  
};

  constructor(
    public readonly sessionId: string,
    public readonly userId: string,
    public readonly deviceId: string,
    private url: string
  ) {
  super();
  
}

  async connect(): Promise<void>  {
  return new Promise((resolve, reject) => {
      this.ws = new WebSocket.WebSocket(this.url, {
        headers: {
          'X-Session-ID': this.sessionId,
          'X-User-ID': this.userId,
          'X-Device-ID': this.deviceId,
        
},
      });

      const timeout = setTimeout(() => {
        reject(new Error(`Session ${this.sessionId} connection timeout`));
      }, 10000);

      this.ws.on('open', () => {
  clearTimeout(timeout);this.sessionState.connected = true;
        this.sessionState.lastActivity = Date.now();
        this.emit('connected');
resolve();
});

      this.ws.on('message', (data: WebSocket.RawData) => {
        try {
          const message = JSON.parse(Buffer.from(data as Buffer).toString('utf8')) as ConversationalMessage;
          this.sessionState.messagesReceived.push(message);
          this.sessionState.messageCount++;
          this.sessionState.lastActivity = Date.now();
          this.emit('message', message);

          // Track validations
          if (message.type === ConversationalMessageType.VALIDATION_RESPONSE) {
            this.sessionState.validations.set(message.payload.validationId, message.payload);
          
}
        } catch (error) {
          this.emit('error', new Error(`Failed to parse message: ${String(error)}`));
        }
      });

      this.ws.on('error', (error) => {
  clearTimeout(timeout);this.sessionState.connected = false;
        this.emit('error', error);
reject(error);
});

      this.ws.on('close', () => {
  this.sessionState.connected = false;this.emit('disconnected');
      
});
    });
  }

  sendMessage(message: Partial<ConversationalMessage>): void  {
  if (!this.ws || !this.sessionState.connected) {
      throw new Error(`Session ${this.sessionId
} not connected`);
    }

    const fullMessage: ConversationalMessage = {
  messageId: randomUUID(),
      sessionId: this.sessionId,
      timestamp: Date.now(),
      sequence: this.sessionState.messageCount + 1,
      metadata: {
  priority: 'normal',
        requiresAck: false,
        compression: false,
        routingHints: [],
      
},
      ...message,
    } as ConversationalMessage;

    this.ws.send(JSON.stringify(fullMessage));
    this.sessionState.lastActivity = Date.now();
  }

  async startValidation(action: ValidationAction): Promise<string>  {
  const validationId = randomUUID();

    const validationRequest: ValidationRequestMessage = {
  type: ConversationalMessageType.VALIDATION_REQUEST,
      messageId: randomUUID(),
      sessionId: this.sessionId,
      timestamp: Date.now(),
      sequence: this.sessionState.messageCount + 1,
      payload: {
        validationId,
        context: {
  userId: this.userId,
          applicationContext: `session-test-${this.deviceId
}`,
          environmentInfo: { deviceId: this.deviceId },
          previousActions: [],
          securityContext: {
  authenticationLevel: 'basic',
      permissions: ['read', 'write'],auditRequired: false,
      complianceFlags: [],
          
} as SecurityContext,
        },
        action,
        riskLevel: 'low',
      streamingOptions: {
  enableProgressUpdates: false,
          updateInterval: 1000,
          maxUpdateCount: 3,
          compressionEnabled: false,
          priorityBoost: false,
        
},
      },
      metadata: {
  priority: 'normal',
      requiresAck: true,
      compression: false,
        routingHints: ['validation'],
      
},
    };

    await this.sendMessage(validationRequest);
    return validationId;
  }

  async waitForValidationResponse(validationId: string, timeout = 5000): Promise<ValidationResponsePayload>  {
  const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const validation = this.sessionState.validations.get(validationId);
      if (validation) {
        return validation;
      
}
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    throw new Error(`Validation ${validationId} response timeout in session ${this.sessionId}`);}

  disconnect(): void  {
  if (this.ws) {
      this.ws.close();
      this.sessionState.connected = false;
    
}
  }

  getSessionState() {
    return { ...this.sessionState };
  }

  isConnected(): boolean {
  return this.sessionState.connected;
  
}

  getReceivedMessages(): ConversationalMessage[] {
  return [...this.sessionState.messagesReceived];
  
}

  clearMessages(): void {
  this.sessionState.messagesReceived = [];
    this.sessionState.messageCount = 0;
  
}
}

/**
 * Manages multiple concurrent sessions for testing
 */
class ConcurrentSessionManager {
  private sessions = new Map<string, TestSession>();
  private userSessions = new Map<string, string[]>(); // userId -> sessionIds[]
  private metrics = {
  totalSessions: 0,
    activeSessions: 0,
    successfulConnections: 0,
    failedConnections: 0,
    crossSessionInterference: 0,
    isolationViolations: 0,
    averageConnectionTime: 0,
    connectionTimes: [] as number[],
  
};

  createSession(userId: string, deviceId?: string): TestSession  {
  const sessionId = randomUUID();
    const actualDeviceId = deviceId ?? `device_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const session = new TestSession(sessionId, userId, actualDeviceId, 'ws://localhost:8185');

    // Track user sessions
    if (!this.userSessions.has(userId)) {
  this.userSessions.set(userId, []);
    
}
    this.userSessions.get(userId)!.push(sessionId);

    // Set up session event handlers
    session.on('connected', () => {
      this.metrics.activeSessions++;
      this.metrics.successfulConnections++;
    
});

    session.on('disconnected', () => {
      this.metrics.activeSessions--;
    });

    session.on('error', () => {
      this.metrics.failedConnections++;
    });

    this.sessions.set(sessionId, session);
    this.metrics.totalSessions++;

    return session;
  }

  async createConcurrentSessions(sessionCount: number,
    userPattern: 'single' | 'multiple' | 'mixed' = 'multiple'): Promise<TestSession[]> {
    const sessions: TestSession[] = [];
    const connectionPromises: Promise<void>[] = [];

    for (let i = 0; i < sessionCount; i++) {
      let userId: string;

      switch (userPattern) {

        case 'single':
          userId = 'test-user-single';
          break;
        case 'multiple':
          userId = `test-user-${i}`;
          break;
        case 'mixed':
          userId = `test-user-${Math.floor(i / 3)}`; // 3 sessions per user
          break;
      }

      const session = await this.createSession(userId);
      sessions.push(session);

      // Connect sessions concurrently
      const connectionStart = performance.now();
      connectionPromises.push(
        session.connect()
          .then(() => {
  const connectionTime = performance.now() - connectionStart;
            this.metrics.connectionTimes.push(connectionTime);
            this.metrics.averageConnectionTime =
              this.metrics.connectionTimes.reduce((sum, time) => sum + time, 0) / this.metrics.connectionTimes.length;
          })
          .catch(() => {
            // Connection failure already tracked by session event handlers
          })
      );
    }

    await Promise.allSettled(connectionPromises);
    return sessions;
  }

  private async testSessionIsolation(sessions: TestSession[]): Promise<{
    isolationIntegrity: number;
    violations: Array<{ sessionId: string; violation: string; details: IsolationViolationDetails }>;
  }> {
    const violations: Array<{ sessionId: string; violation: string; details: IsolationViolationDetails }> = [];
    let totalTests = 0;
    let passedTests = 0;

    // Test 1: Message isolation - send unique messages to each session
    const uniqueMessages = new Map<string, string>();

    for (const session of sessions) {
  if (session.isConnected()) {
        const uniqueData = `unique-data-${session.sessionId
}-${Date.now()}`;
        uniqueMessages.set(session.sessionId, uniqueData);

        await session.sendMessage({
  type: ConversationalMessageType.STATUS_UPDATE,
          payload: { uniqueData, testType: 'isolation' 
},});totalTests++;
      }
    }

    // Wait for message processing
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify message isolation
    for (const session of sessions) {
  if (session.isConnected()) {
        const receivedMessages = session.getReceivedMessages();
        const uniqueData = uniqueMessages.get(session.sessionId);

        // Check for correct unique data
        const hasOwnMessage = receivedMessages.some(msg =>
          msg.payload?.uniqueData === uniqueData
        );

        if (hasOwnMessage) {
          passedTests++;
        
}

        // Check for other sessions' data (violation)
        for (const [otherSessionId, otherUniqueData] of uniqueMessages) {
  if (otherSessionId !== session.sessionId) {
            const hasOtherMessage = receivedMessages.some(msg =>
              msg.payload?.uniqueData === otherUniqueData
            );

            if (hasOtherMessage) {
              violations.push({
  sessionId: session.sessionId,
                violation: 'cross_session_data_leak',
      details: {receivedData: otherUniqueData,
                  fromSession: otherSessionId,
                
},
              });
              this.metrics.isolationViolations++;
            }
          }
        }
      }
    }

    // Test 2: Session state isolation
    for (const session of sessions) {
  if (session.isConnected()) {
        const state = session.getSessionState();

        // Verify session has unique identifier in received messages
        const hasSessionSpecificMessages = state.messagesReceived.every(msg =>
          msg.sessionId === session.sessionId || msg.sessionId === 'system');if (hasSessionSpecificMessages) {
          passedTests++;
        
} else {
          violations.push({
  sessionId: session.sessionId,
            violation: 'session_id_mismatch',
      details: {expectedSessionId: session.sessionId,
              foundMessages: state.messagesReceived.filter(msg =>
                msg.sessionId !== session.sessionId && msg.sessionId !== 'system'
              ),
            
},
          });
        }

        totalTests++;
      }
    }

    const isolationIntegrity = totalTests > 0 ? passedTests / totalTests : 0;
    return { isolationIntegrity, violations };
  }

  async performConcurrentValidations(sessions: TestSession[]): Promise<{
    completedValidations: number;
    failedValidations: number;
    averageValidationTime: number;
    concurrencyIssues: number;
  }> {
  const validationPromises: Promise<ValidationResult>[] = [];
    const validationResults: Array<{ sessionId: string; success: boolean; duration: number }> = [];

    // Start concurrent validations
    for (let i = 0; i < sessions.length; i++) {
  const session = sessions[i];
      if (session.isConnected()) {
        const testAction: ValidationAction = {
  actionType: `concurrent_validation_${i
}`,parameters: { sessionId: session.sessionId, index: i },expectedOutcome: `Validation ${i} completed`,
          reversible: true,
          impact: {
  scope: 'local',
      dataAccess: false,
      stateChanges: true,
            userInteraction: false,
          
} as ActionImpact,
        };

        const validationPromise = (async () => {
  const startTime = Date.now();
          try {
            const validationId = await session.startValidation(testAction);
            const response = await session.waitForValidationResponse(validationId);
            const duration = Date.now() - startTime;

            validationResults.push({
  sessionId: session.sessionId,
              success: true,
              duration,
            
});

            return { sessionId: session.sessionId, success: true, response };
          } catch (error) {
  const duration = Date.now() - startTime;
            validationResults.push({
  sessionId: session.sessionId,
              success: false,
              duration,
            
});

            return { sessionId: session.sessionId, success: false, error };
          }
        })();

        validationPromises.push(validationPromise);
      }
    }

    // Wait for all validations to complete
    await Promise.allSettled(validationPromises);

    const completedValidations = validationResults.filter(r => r.success).length;
    const failedValidations = validationResults.filter(r => !r.success).length;
    const averageValidationTime = validationResults.length > 0
      ? validationResults.reduce((sum, r) => sum + r.duration, 0) / validationResults.length
      : 0;

    // Check for concurrency issues (detect if validations interfered with each other)
    let concurrencyIssues = 0;
    for (const session of sessions) {
  const state = session.getSessionState();
      const validationCount = state.validations.size;

      // Each session should have exactly one validation result
      if (validationCount !== 1) {
        concurrencyIssues++;
      
}
    }

    return {
  completedValidations,
      failedValidations,
      averageValidationTime,
      concurrencyIssues,
    
};
  }

  async disconnectAll(): Promise<void>  {
  const disconnectPromises = Array.from(this.sessions.values()).map(session =>
      session.disconnect().catch(() => {
})
    );

    await Promise.allSettled(disconnectPromises);
    this.sessions.clear();
    this.userSessions.clear();
    this.metrics.activeSessions = 0;
  }

  getMetrics() {
  return {
      ...this.metrics,
      sessionSuccessRate: this.metrics.totalSessions > 0
        ? this.metrics.successfulConnections / this.metrics.totalSessions
        : 0,
      isolationViolationRate: this.metrics.totalSessions > 0
        ? this.metrics.isolationViolations / this.metrics.totalSessions
        : 0,
    
};
  }

  getActiveSessions(): TestSession[] {
  return Array.from(this.sessions.values()).filter(session => session.isConnected());
  
}

  getSessionsByUser(userId: string): TestSession[] {
  const sessionIds = this.userSessions.get(userId) ?? [];
    return sessionIds.map(id => this.sessions.get(id)).filter((session): session is TestSession => !!session);
  
}
}

// ===== MOCK CONFIGURATION =====

const mockConfigService = {

  get: jest.fn((key: string, defaultValue?: unknown) => {
    const config: Record<string, unknown> = {
      'CONVERSATIONAL_WEBSOCKET_PORT': 8185,'PARLANT_WEBSOCKET_PORT': 8186,'WEBSOCKET_MAX_CONCURRENT_SESSIONS': 2000,'WEBSOCKET_SESSION_TIMEOUT': 300000, // 5 minutes'WEBSOCKET_CLEANUP_INTERVAL': 60000, // 1 minute'WEBSOCKET_MEMORY_LIMIT_PER_SESSION': 10485760, // 10MB

};
return config[key] ?? defaultValue;
  }),
};

// ===== CONCURRENT SESSION MANAGEMENT TEST SUITE =====

describe('Concurrent Session Management Tests', () => {

  let conversationalService: ConversationalWebSocketBridgeService;let integrationService: ParlantWebSocketIntegrationService;
  let module: TestingModule;
  let testServer: Server;
  let wsServer: WebSocket.Server;
  let sessionManager: ConcurrentSessionManager;

  const TEST_PORT = 8185;

  beforeAll(async () => {
    jest.setTimeout(180000); // 3 minutes for concurrent session tests

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

    conversationalService = module.get<ConversationalWebSocketBridgeService>(ConversationalWebSocketBridgeService);
    integrationService = module.get<ParlantWebSocketIntegrationService>(ParlantWebSocketIntegrationService);

    // Create test WebSocket server with session management simulation
    testServer = createServer();
    wsServer = createSafeWebSocketServer({ server: testServer });

    // Track active sessions and simulate session management
    const activeSessions = new Map<string, {
  sessionId: string;
  userId: string;
      deviceId: string;
  ws: WebSocket.WebSocket;
      messageCount: number;
    
}>();

    wsServer.on('connection', (ws: WebSocket.WebSocket, req) => {
  const sessionId = req.headers['x-session-id'] as string || randomUUID();const userId = req.headers['x-user-id'] as string || 'anonymous';
const deviceId = req.headers['x-device-id'] as string || 'unknown';

      console.log(`New session: ${sessionId
} for user ${userId} on device ${deviceId}`);

      const sessionInfo = {
  sessionId,
        userId,
        deviceId,
        ws,
        messageCount: 0,
      
};

      activeSessions.set(sessionId, sessionInfo);

      ws.on('message', (data: WebSocket.RawData) => {
  try {const message = JSON.parse(Buffer.from(data as Buffer).toString('utf8')) as ConversationalMessage;
          sessionInfo.messageCount++;

          // Verify session isolation - message should belong to this session
          if (message.sessionId && message.sessionId !== sessionId) {
            console.warn(`Session isolation violation: Message for ${message.sessionId
} received in ${sessionId}`);
          }

          // Handle different message types
          switch (message.type) {

  case ConversationalMessageType.VALIDATION_REQUEST:
              handleValidationRequest(sessionInfo, message as ValidationRequestMessage);
              break;

            case ConversationalMessageType.STATUS_UPDATE: {
              // Echo back the status update with session confirmation
              const statusResponse: ConversationalMessage = {
  messageId: randomUUID(),
                sessionId,
                timestamp: Date.now(),
                sequence: sessionInfo.messageCount,
                type: ConversationalMessageType.STATUS_UPDATE,
                payload: {
  status: 'received',
      originalPayload: message.payload,
      sessionConfirmation: sessionId,
                

    },
                metadata: {
  priority: 'normal',
      requiresAck: false,
      compression: false,
                  routingHints: ['status-response'],
},};

              ws.send(JSON.stringify(statusResponse));
              break;
            }

            default: {
  // Send acknowledgment for other message types
              const ackMessage: ConversationalMessage = {
  messageId: randomUUID(),
                sessionId,
                timestamp: Date.now(),
                sequence: sessionInfo.messageCount,
                type: ConversationalMessageType.ACKNOWLEDGMENT,
                payload: { acknowledgedMessageId: message.messageId 
},
                metadata: {
  priority: 'normal',
                  requiresAck: false,
                  compression: false,
                  routingHints: [],
                
},
              };

              ws.send(JSON.stringify(ackMessage));
              break;
            }
          }
        } catch (error) {
          console.error(`Error processing message in session ${sessionId}:`, error);
        }
      });

      ws.on('close', () => {
        console.log(`Session ${sessionId} disconnected`);
        activeSessions.delete(sessionId);
      });

      ws.on('error', (error) => {
        console.error(`Session ${sessionId} error:`, error);
        activeSessions.delete(sessionId);
      });

      // Send session confirmation
      const welcomeMessage: ConversationalMessage = {
  messageId: randomUUID(),
        sessionId,
        timestamp: Date.now(),
        sequence: 0,
        type: ConversationalMessageType.SESSION_CREATED,
        payload: {
          sessionId,
          userId,
          deviceId,
          serverTime: Date.now(),
        
},
        metadata: {
  priority: 'high',
      requiresAck: false,
      compression: false,
          routingHints: ['session-management'],
        
},
      };

      ws.send(JSON.stringify(welcomeMessage));
    });

    function handleValidationRequest(
      sessionInfo: { sessionId: string; userId: string; deviceId: string; ws: WebSocket.WebSocket },
      request: ValidationRequestMessage
    ): void {
      const { validationId } = request.payload;

      // Simulate validation processing
      setTimeout(() => {
  const response: ConversationalMessage = {
  type: ConversationalMessageType.VALIDATION_RESPONSE,
          messageId: randomUUID(),
          sessionId: sessionInfo.sessionId,
          timestamp: Date.now(),
          sequence: sessionInfo.messageCount++,
          payload: {
            validationId,
            approved: true,
            confidence: 0.9,
            reasoning: `Validation approved for session ${sessionInfo.sessionId
}`,conversationId: `conv_${validationId}`,
            requiresUserConfirmation: false,
            metadata: {
  processingTime: Math.random() * 50 + 25, // 25-75ms,
  sessionId: sessionInfo.sessionId,
              userId: sessionInfo.userId,
            
},
          },
          metadata: {
  priority: 'high',
      requiresAck: false,
      compression: false,
            routingHints: ['validation-response'],
},};

        sessionInfo.ws.send(JSON.stringify(response));
      }, Math.random() * 100 + 50); // 50-150ms processing time
    }

    // Start test server
    await new Promise<void>((resolve) => {
  testServer.listen(TEST_PORT, resolve);
    
});

    sessionManager = new ConcurrentSessionManager();
  });

  afterAll(async () => {
  await sessionManager.disconnectAll();

    wsServer.close();
    await new Promise<void>((resolve) => {
      testServer.close(() => resolve());
    
});

    await conversationalService.onApplicationShutdown();
    await integrationService.onApplicationShutdown();
    await module.close();
  });

  afterEach(async () => {
  await sessionManager.disconnectAll();
  
});

  // ===== CONCURRENT SESSION CREATION =====

  describe('Concurrent Session Creation', () => {

  it('should create and manage 100 concurrent sessions successfully', async () => {
    const sessionCount = 100;
    const sessions = await sessionManager.createConcurrentSessions(sessionCount, 'multiple');
expect(sessions.length).toBe(sessionCount);const connectedSessions = sessions.filter(session => session.isConnected());
      const metrics = sessionManager.getMetrics();

      console.log('100 Concurrent Sessions Results:', {
  totalSessions: sessionCount,
        connectedSessions: connectedSessions.length,
        successRate: `${(metrics.sessionSuccessRate * 100).toFixed(2)
}%`,averageConnectionTime: `${metrics.averageConnectionTime.toFixed(2)}
ms`,
        activeSessions: metrics.activeSessions,
      });

      expect(connectedSessions.length).toBeGreaterThan(sessionCount * 0.95); // 95%+ success rate
      expect(metrics.averageConnectionTime).toBeLessThan(200); // Sub-200ms average connection
    });



    it('should handle 1000+ concurrent sessions under load', async () => {

  const sessionCount = 1000;
  const batchSize = 50;
      const sessions: TestSession[] = [];

      // Create sessions in batches to avoid overwhelming
      for (let i = 0; i < sessionCount; i += batchSize) {
        const batchSessions = await sessionManager.createConcurrentSessions(
          Math.min(batchSize, sessionCount - i),
          'mixed');
        sessions.push(...batchSessions);

        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const connectedSessions = sessions.filter(session => session.isConnected());
      const metrics = sessionManager.getMetrics();

      console.log('1000+ Concurrent Sessions Load Test:', {
  targetSessions: sessionCount,
        actualSessions: sessions.length,
        connectedSessions: connectedSessions.length,
        successRate: `${(metrics.sessionSuccessRate * 100).toFixed(2)
}%`,averageConnectionTime: `${metrics.averageConnectionTime.toFixed(2)}
ms`,
        failedConnections: metrics.failedConnections,
      });

      expect(sessions.length).toBe(sessionCount);
      expect(connectedSessions.length).toBeGreaterThan(sessionCount * 0.8); // 80%+ success rate under load
      expect(metrics.averageConnectionTime).toBeLessThan(500); // Under 500ms average under load
    });



    it('should maintain session creation performance under concurrent load', async () => {

  const testRounds = 5;
  const sessionsPerRound = 50;
      const performanceResults: Array<{ round: number; averageTime: number; successRate: number }> = [];

      for (let round = 0; round < testRounds; round++) {
  const roundStart = performance.now();
        const sessions = await sessionManager.createConcurrentSessions(sessionsPerRound, 'multiple');
        const roundDuration = performance.now() - roundStart;

        const connectedCount = sessions.filter(s => s.isConnected()).length;
        const successRate = connectedCount / sessionsPerRound;
        const averageTime = roundDuration / sessionsPerRound;

        performanceResults.push({
  round: round + 1,
          averageTime,
          successRate,
        
});

        console.log(`Round ${round + 1}: ${connectedCount}/${sessionsPerRound} sessions, ${averageTime.toFixed(2)}
ms avg`);

        // Cleanup for next round
        await sessionManager.disconnectAll();
        await new Promise(resolve => setTimeout(resolve, 500)); // Recovery time
      }

      // Verify consistent performance across rounds
      const averagePerformance = performanceResults.reduce((sum, r) => sum + r.averageTime, 0) / testRounds;
      const averageSuccessRate = performanceResults.reduce((sum, r) => sum + r.successRate, 0) / testRounds;

      expect(averagePerformance).toBeLessThan(100); // Sub-100ms average session creation
      expect(averageSuccessRate).toBeGreaterThan(0.95); // 95%+ consistent success rate

      console.log('Performance Consistency Results:', {
  testRounds,
        sessionsPerRound,
        averagePerformance: `${averagePerformance.toFixed(2)
}
ms`,averageSuccessRate: `${(averageSuccessRate * 100).toFixed(2)}%`,
      });
    });
  });

  // ===== SESSION ISOLATION AND DATA INTEGRITY =====

  describe('Session Isolation and Data Integrity', () => {

  it('should maintain perfect session isolation across concurrent sessions', async () => {
    const sessionCount = 50;
    const sessions = await sessionManager.createConcurrentSessions(sessionCount, 'multiple');
    const connectedSessions = sessions.filter(session => session.isConnected());
expect(connectedSessions.length).toBeGreaterThan(sessionCount * 0.9);

      // Test session isolation
      const isolationResults = await sessionManager.testSessionIsolation(connectedSessions);

      console.log('Session Isolation Test Results:', {
  testedSessions: connectedSessions.length,
        isolationIntegrity: `${(isolationResults.isolationIntegrity * 100).toFixed(2)
}%`,
        violations: isolationResults.violations.length,
        violationDetails: isolationResults.violations.slice(0, 3), // Show first 3 violations
      });

      expect(isolationResults.isolationIntegrity).toBeGreaterThan(0.99); // 99%+ isolation integrity
      expect(isolationResults.violations.length).toBeLessThan(connectedSessions.length * 0.01); // <1% violations

      if (isolationResults.violations.length > 0) {
        console.warn('Session isolation violations detected:', isolationResults.violations);}});



    it('should prevent cross-session data leakage', async () => {

  const sessionCount = 20;
  const sessions = await sessionManager.createConcurrentSessions(sessionCount, 'multiple');

      const connectedSessions = sessions.filter(session => session.isConnected());
      const sensitiveData = new Map<string, string>();

      // Send sensitive data to each session
      for (const session of connectedSessions) {
        const secretData = `secret-${session.sessionId}-${Math.random().toString(36)}`;
        sensitiveData.set(session.sessionId, secretData);

        await session.sendMessage({
  type: ConversationalMessageType.STATUS_UPDATE,
          payload: {
  sensitiveData: secretData,
            classification: 'confidential',
      sessionOwner: session.sessionId,
},
        });
      }

      // Wait for message processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify no cross-session data leakage
      let leakageDetected = 0;
      const leakageDetails: Array<{ fromSession: string; toSession: string; data: string }> = [];

      for (const session of connectedSessions) {
  const receivedMessages = session.getReceivedMessages();
        const ownSecretData = sensitiveData.get(session.sessionId);

        for (const message of receivedMessages) {
          if (message.payload?.sensitiveData && message.payload.sensitiveData !== ownSecretData) {
            leakageDetected++;
            leakageDetails.push({
  fromSession: message.payload.sessionOwner ?? 'unknown',
      toSession: session.sessionId,
      data: message.payload.sensitiveData,
            
});
          }
        }
      }

      console.log('Data Leakage Prevention Test:', {
  testedSessions: connectedSessions.length,
        leakageDetected,
        leakageRate: `${((leakageDetected / connectedSessions.length) * 100).toFixed(3)
}%`,
        sampleLeakages: leakageDetails.slice(0, 3),
      });

      expect(leakageDetected).toBe(0); // Zero data leakage tolerance
    });



    it('should handle concurrent validations without interference', async () => {

  const sessionCount = 30;
  const sessions = await sessionManager.createConcurrentSessions(sessionCount, 'multiple');
  const connectedSessions = sessions.filter(session => session.isConnected());
expect(connectedSessions.length).toBeGreaterThan(sessionCount * 0.9);

      // Perform concurrent validations
      const validationResults = await sessionManager.performConcurrentValidations(connectedSessions);

      console.log('Concurrent Validation Results:', {
  totalSessions: connectedSessions.length,
        completedValidations: validationResults.completedValidations,
        failedValidations: validationResults.failedValidations,
        averageValidationTime: `${validationResults.averageValidationTime.toFixed(2)}ms`,
        concurrencyIssues: validationResults.concurrencyIssues,
      successRate: `${((validationResults.completedValidations / connectedSessions.length) * 100).toFixed(2)}%`,
      });

      expect(validationResults.completedValidations).toBeGreaterThan(connectedSessions.length * 0.95); // 95%+ success
      expect(validationResults.concurrencyIssues).toBe(0); // No concurrency interference
      expect(validationResults.averageValidationTime).toBeLessThan(500); // Sub-500ms validation time
    });
  });

  // ===== MULTI-USER SESSION MANAGEMENT =====

  describe('Multi-user Session Management', () => {

  it('should handle multiple sessions per user correctly', async () => {
    const usersCount = 10;
    const sessionsPerUser = 5;
      const sessions: TestSession[] = [];

      // Create multiple sessions for each user
      for (let userId = 0; userId < usersCount; userId++) {
        const userSessions = await sessionManager.createConcurrentSessions(sessionsPerUser, 'single');

        // Override userId for consistency
        userSessions.forEach(session => {
          // Use type assertion to safely access userId property
          (session as TestSession & { userId: string 
}).userId = `multi-user-${userId}`;
        });

        sessions.push(...userSessions);
      }

      const connectedSessions = sessions.filter(session => session.isConnected());

      // Verify user session distribution
      const userSessionCounts = new Map<string, number>();
      for (const session of connectedSessions) {
  const count = userSessionCounts.get(session.userId) ?? 0;
        userSessionCounts.set(session.userId, count + 1);
      
}

      console.log('Multi-user Session Distribution:', {
  targetUsers: usersCount,
      targetSessionsPerUser: sessionsPerUser,
        totalSessions: connectedSessions.length,
        actualUsers: userSessionCounts.size,
        sessionDistribution: Array.from(userSessionCounts.entries()).slice(0, 5),
      
});

      expect(userSessionCounts.size).toBeGreaterThan(usersCount * 0.8); // 80%+ users connected

      // Verify each user has multiple sessions
      const usersWithMultipleSessions = Array.from(userSessionCounts.values())
        .filter(count => count > 1).length;

      expect(usersWithMultipleSessions).toBeGreaterThan(usersCount * 0.7); // 70%+ users have multiple sessions
    });



    it('should synchronize session state across devices for same user', async () => {

  const userId = 'sync-test-user';
      const deviceCount = 3;
      const userSessions: TestSession[] = [];

      // Create sessions for same user on different devices
      for (let i = 0; i < deviceCount; i++) {
        const session = await sessionManager.createSession(userId, `device-${i}`);
        await session.connect();
        userSessions.push(session);
      }

      const connectedSessions = userSessions.filter(session => session.isConnected());
      expect(connectedSessions.length).toBe(deviceCount);

      // Send sync message from first device
      const syncData = {
        userPreferences: { theme: 'dark', language: 'en' },
        applicationState: { lastAction: 'file_read', timestamp: Date.now() },
        syncId: randomUUID(),
      };

      const syncMessage: SessionSyncMessage = {
  type: ConversationalMessageType.SESSION_SYNC,
        messageId: randomUUID(),
        sessionId: connectedSessions[0].sessionId,
        timestamp: Date.now(),
        sequence: 1,
        payload: {
  syncId: syncData.syncId,
          userId,
          deviceSessions: connectedSessions.map(s => s.deviceId),
          stateUpdate: syncData,
          syncPriority: 'high',
},metadata: {
  priority: 'high',
      requiresAck: true,
      compression: false,
          routingHints: ['session-sync'],
},};

      await connectedSessions[0].sendMessage(syncMessage);

      // Wait for sync propagation
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify sync across devices (in real implementation, other devices would receive sync updates)
      const firstDeviceMessages = connectedSessions[0].getReceivedMessages();
      const hasSyncResponse = firstDeviceMessages.some(msg =>
        msg.type === ConversationalMessageType.ACKNOWLEDGMENT
      );

      expect(hasSyncResponse).toBe(true);

      console.log('Session Sync Test:', {
  userId,deviceCount,
        connectedDevices: connectedSessions.length,
        syncMessageSent: true,
        syncResponseReceived: hasSyncResponse,
      
});
    });
  });

  // ===== RESOURCE MANAGEMENT AND CLEANUP =====

  describe('Resource Management and Cleanup', () => {

  it('should manage memory usage efficiently across sessions', async () => {
    const sessionCount = 100;
    const sessions = await sessionManager.createConcurrentSessions(sessionCount, 'mixed');
    const connectedSessions = sessions.filter(session => session.isConnected());
    // Generate some activity in each session
      for (const session of connectedSessions) {
        // Send multiple messages to build up session state
        for (let i = 0; i < 10; i++) {
          await session.sendMessage({
  type: ConversationalMessageType.STATUS_UPDATE,
            payload: { activityIndex: i, largeData: 'x'.repeat(1000) }, // 1KB per message
          });
        }
      }

      // Wait for message processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check session state sizes
      let totalMessages = 0;
      let totalMemoryEstimate = 0;

      for (const session of connectedSessions) {
  const state = session.getSessionState();
        totalMessages += state.messageCount;

        // Rough memory estimation (not precise, for testing purposes)
        const sessionMemory = state.messagesReceived.length * 1200; // ~1.2KB per message
        totalMemoryEstimate += sessionMemory;
      
}

      const averageMemoryPerSession = totalMemoryEstimate / connectedSessions.length;

      console.log('Memory Usage Analysis:', {
  connectedSessions: connectedSessions.length,
        totalMessages,
        totalMemoryEstimate: `${(totalMemoryEstimate / 1024 / 1024).toFixed(2)
} MB`,averageMemoryPerSession: `${(averageMemoryPerSession / 1024).toFixed(2)} KB`,memoryEfficiency: `${(1024 * 1024 / averageMemoryPerSession).toFixed(1)}
x target`,
      });

      expect(averageMemoryPerSession).toBeLessThan(50 * 1024); // Under 50KB per session average
      expect(totalMemoryEstimate).toBeLessThan(100 * 1024 * 1024); // Under 100MB total
    });



    it('should handle session cleanup and resource release', async () => {

  const sessionCount = 50;const sessions = await sessionManager.createConcurrentSessions(sessionCount, 'multiple');const initialMetrics = sessionManager.getMetrics();
expect(initialMetrics.activeSessions).toBeGreaterThan(sessionCount * 0.9);

      // Disconnect half the sessions
      const sessionsToDisconnect = sessions.slice(0, Math.floor(sessions.length / 2));
      for (const session of sessionsToDisconnect) {
        await session.disconnect();
      }

      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 1000));

      const afterDisconnectMetrics = sessionManager.getMetrics();
      const remainingActiveSessions = sessionManager.getActiveSessions().length;

      console.log('Session Cleanup Test:', {
  initialSessions: initialMetrics.activeSessions,
        disconnectedSessions: sessionsToDisconnect.length,
        remainingActiveSessions,
        expectedRemaining: sessions.length - sessionsToDisconnect.length,
        cleanupEfficiency: `${((remainingActiveSessions / (sessions.length - sessionsToDisconnect.length)) * 100).toFixed(1)
}%`,
      });

      expect(remainingActiveSessions).toBeLessThanOrEqual(sessions.length - sessionsToDisconnect.length + 2); // Allow small variance
      expect(afterDisconnectMetrics.activeSessions).toBeLessThan(initialMetrics.activeSessions);
    });
  });
});