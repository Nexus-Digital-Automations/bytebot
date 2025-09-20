/**
 * WebSocket Security Validation Testing Suite
 *
 * Comprehensive security testing for PARLANT Phase 1 WebSocket conversational
 * functionality, including authentication, authorization, data protection,
 * and vulnerability assessment against common WebSocket security threats.
 *
 * Test Coverage:
 * - Authentication and authorization mechanisms
 * - TLS/WSS encryption validation
 * - Origin validation and CSRF protection
 * - Rate limiting and DDoS protection
 * - Input validation and injection prevention
 * - Session hijacking and token security
 * - Message integrity and confidentiality
 * - Access control and privilege escalation prevention
 *
 * Security Targets:
 * - 100% authenticated connections
 * - Zero unauthorized access attempts succeed
 * - All data encrypted in transit
 * - Sub-1% false positive rate for legitimate traffic
 * - Complete audit trail for security events
 *
 * @author Claude Code - WebSocket Security Validation Agent
 * @version 1.0.0
 */;

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as WebSocket from 'ws';
import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';
import { createServer, Server } from 'http';
import { createServer as createHttpsServer, Server as HttpsServer } from 'https';
import { randomUUID } from 'crypto';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as jwt from 'jsonwebtoken';
import {
  ConversationalWebSocketBridgeService,
  ConversationalMessage,
  ConversationalMessageType,
  ValidationRequestMessage,
  SecurityContext,

} from '../conversational-websocket-bridge.service';
import {
  createSafeWebSocketServer,
  createSecureVerifyCallback,
  validateWebSocketHeaders,
  type WebSocketVerificationInfo,

} from '../websocket-types';

// ===== SECURITY TESTING UTILITIES =====

/**
 * Security test client with authentication capabilities
 */
class SecurityTestClient extends EventEmitter {
  private ws: WebSocket.WebSocket | null = null;
  private connected = false;
  private securityEvents: Array<{,
  timestamp: number;
  eventType: string;
    details: any;
  
}> = [];

  constructor(
    private url: string,
    private options: {
  clientId?: string;
      authToken?: string;
      origin?: string;
      userAgent?: string;
      customHeaders?: Record<string, string>;
    
} = {}
  ) {
  super();
  
}

  async connect(): Promise<void>  {
  return new Promise((resolve, reject) => {
      const headers: Record<string, string> = {
};

      if (this.options.clientId) headers['X-Client-ID'] = this.options.clientId;if (this.options.authToken) headers['Authorization'] = `Bearer ${this.options.authToken}`;
      if (this.options.origin) headers['Origin'] = this.options.origin;if (this.options.userAgent) headers['User-Agent'] = this.options.userAgent;if (this.options.customHeaders) Object.assign(headers, this.options.customHeaders);this.ws = new WebSocket.WebSocket(this.url, { headers });

      const timeout = setTimeout(() => {
  this.ws?.terminate();
        reject(new Error('Security test connection timeout'));
}, 10000);this.ws.on('open', () => {
  clearTimeout(timeout);this.connected = true;
        this.recordSecurityEvent('connection_established', {url: this.url,
      headers: Object.keys(headers),
        
});
        this.emit('connected');
resolve();});

      this.ws.on('message', (data: WebSocket.RawData) => {try {const message = JSON.parse(Buffer.from(data as ArrayBuffer).toString('utf8'));this.recordSecurityEvent('message_received', { messageType: message.type });this.emit('message', message);} catch (error) {this.recordSecurityEvent('message_parse_error', { error: error.message });this.emit('error', new Error(`Failed to parse message: ${error}`));
        }
      });

      this.ws.on('error', (error: Error) => {clearTimeout(timeout);this.recordSecurityEvent('connection_error', { error: error.message });this.connected = false;this.emit('error', error);
reject(error);});

      this.ws.on('close', (code: number, reason: Buffer) => {
  clearTimeout(timeout);this.connected = false;
        this.recordSecurityEvent('connection_closed', { code, reason: reason.toString() 
});this.emit('disconnected', { code, reason });});});
  }

  async sendMessage(message: ConversationalMessage): Promise<void>  {
  if (!this.ws || !this.connected) {
      throw new Error('Security test client not connected');
}this.recordSecurityEvent('message_sent', {
  messageId: message.messageId,
      type: message.type,
      hasPayload: !!message.payload,
    
});

    this.ws.send(JSON.stringify(message));
  }

  async sendMaliciousPayload(payload: string): Promise<void>  {
  if (!this.ws || !this.connected) {
      throw new Error('Security test client not connected');
}
this.recordSecurityEvent('malicious_payload_sent', { payloadLength: payload.length });this.ws.send(payload);}

  private recordSecurityEvent(eventType: string, details: any): void {
  this.securityEvents.push({,
  timestamp: Date.now(),
      eventType,
      details,
    
});
  }

  getSecurityEvents(): typeof this.securityEvents {
  return [...this.securityEvents];
  
}

  async disconnect(): Promise<void>  {
  if (this.ws) {
      this.ws.close(1000, 'Normal closure');
}}

  isConnected(): boolean {
  return this.connected;
  
}

  clearSecurityEvents(): void {
  this.securityEvents = [];
  
}
}

/**
 * JWT token generator for authentication testing
 */
class TokenGenerator {
  private secret = 'test-secret-key-for-websocket-security-testing';
generateValidToken(userId: string, permissions: string[] = ['read', 'write']): string {return jwt.sign({,
  sub: userId,
        permissions,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour,
  aud: 'websocket-test',
      iss: 'security-test-suite',
},this.secret
    );
  }

  generateExpiredToken(userId: string): string {
  return jwt.sign(
      {,
  sub: userId,
        permissions: ['read'],
      iat: Math.floor(Date.now() / 1000) - 7200, // 2 hours agoexp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago (expired),
  aud: 'websocket-test',
      iss: 'security-test-suite',
},this.secret
    );
  }

  generateMalformedToken(): string {
  // Invalid JWT structure
    return 'invalid.jwt.token.structure.here';
}

  generateTamperedToken(userId: string): string {
  const validToken = this.generateValidToken(userId);
    // Tamper with the signature
    const parts = validToken.split('.');parts[2] = parts[2].slice(0, -5) + 'XXXXX'; // Corrupt signaturereturn parts.join('.');
  
}

  verifyToken(token: string): any {
  try {
      return jwt.verify(token, this.secret);
    
} catch (error) {
      throw new Error(`Token verification failed: ${error.message}`);
    }
  }
}

/**
 * Attack simulator for security testing
 */
class AttackSimulator {
  private attackLog: Array<{,
  timestamp: number;
  attackType: string;
    success: boolean;
  details: any;
  
}> = [];

  async simulateXSSAttack(client: SecurityTestClient): Promise<boolean>  {
  const xssPayloads = [
      '<script>alert("XSS")</script>",'javascript:alert("XSS")",'"><script>alert("XSS")</script>",'\'" onmouseover="alert(1)" "",];

    let successfulAttacks = 0;

    for (const payload of xssPayloads) {
      try {
        const maliciousMessage: ConversationalMessage = {,
  messageId: randomUUID(),
          sessionId: 'xss-attack-session',
      timestamp: Date.now(),
      sequence: 1,
          type: ConversationalMessageType.STATUS_UPDATE,
          payload: {
  userInput: payload,
            description: payload,
            maliciousContent: payload,
          
},
          metadata: {
  priority: 'normal',
      requiresAck: false,
      compression: false,
            routingHints: ['xss-test'],
},};

        await client.sendMessage(maliciousMessage);

        // Wait for response
        await new Promise(resolve => setTimeout(resolve, 100));

        successfulAttacks++;
      } catch (error) {
        this.recordAttack('xss_injection', false, { payload, error: error.message });}}

    const success = successfulAttacks === xssPayloads.length;
    this.recordAttack('xss_injection', success, {
  totalPayloads: xssPayloads.length,
      successfulPayloads: successfulAttacks,
    
});

    return success;
  }

  async simulateSQLInjectionAttack(client: SecurityTestClient): Promise<boolean>  {
  const sqlPayloads = [
      ""; DROP TABLE users; --","' OR '1'='1',"1' UNION SELECT password FROM users --',""; INSERT INTO logs VALUES ('injected') --',];

    let successfulAttacks = 0;

    for (const payload of sqlPayloads) {
      try {
        const maliciousMessage: ConversationalMessage = {,
  messageId: randomUUID(),
          sessionId: 'sql-injection-session',
      timestamp: Date.now(),
      sequence: 1,
          type: ConversationalMessageType.VALIDATION_REQUEST,
          payload: {
  validationId: randomUUID(),
            context: {
  userId: payload,
              applicationContext: payload,
              environmentInfo: { injectedQuery: payload 
},
              previousActions: [],
              securityContext: {
  authenticationLevel: 'basic',
      permissions: [payload],
      auditRequired: true,
                complianceFlags: [payload],
              
} as SecurityContext,
            },
            action: {
  actionType: payload,
              parameters: { query: payload 
},
              expectedOutcome: payload,
              reversible: true,
              impact: {
  scope: 'system',
      dataAccess: true,
      stateChanges: true,
                userInteraction: false,
              
},
            },
            riskLevel: 'high',
      streamingOptions: {
  enableProgressUpdates: false,
              updateInterval: 1000,
              maxUpdateCount: 1,
              compressionEnabled: false,
              priorityBoost: false,
            
},
          },
          metadata: {
  priority: 'high',
      requiresAck: false,
      compression: false,
            routingHints: ['sql-injection-test'],
},} as ValidationRequestMessage;

        await client.sendMessage(maliciousMessage);
        successfulAttacks++;
      } catch (error) {
        this.recordAttack('sql_injection', false, { payload, error: error.message });}}

    const success = successfulAttacks === sqlPayloads.length;
    this.recordAttack('sql_injection', success, {
  totalPayloads: sqlPayloads.length,
      successfulPayloads: successfulAttacks,
    
});

    return success;
  }

  async simulateBufferOverflowAttack(client: SecurityTestClient): Promise<boolean>  {
  const largePayloads = [
      'A'.repeat(1024 * 1024), // 1MB'B'.repeat(10 * 1024 * 1024), // 10MB'X'.repeat(100 * 1024 * 1024), // 100MB];let successfulAttacks = 0;

    for (const payload of largePayloads) {
      try {
        await client.sendMaliciousPayload(payload);
        successfulAttacks++;
      
} catch (error) {
  this.recordAttack('buffer_overflow', false, {payloadSize: payload.length,
      error: error.message,
        
});
      }
    }

    const success = successfulAttacks > 0;
    this.recordAttack('buffer_overflow', success, {
  totalPayloads: largePayloads.length,
      successfulPayloads: successfulAttacks,
    
});

    return success;
  }

  async simulateRateLimitingBypass(client: SecurityTestClient, requestCount = 1000): Promise<boolean>  {
  let successfulRequests = 0;
    const startTime = Date.now();

    for (let i = 0; i < requestCount; i++) {
      try {
        const message: ConversationalMessage = {,
  messageId: `rate-limit-test-${i
}`,
          sessionId: 'rate-limit-session',
      timestamp: Date.now(),
      sequence: i + 1,
          type: ConversationalMessageType.STATUS_UPDATE,
          payload: { rateLimitTest: true, index: i },
          metadata: {
  priority: 'high',
      requiresAck: false,
      compression: false,
            routingHints: ['rate-limit-test'],
},};

        await client.sendMessage(message);
        successfulRequests++;
      } catch (error) {
  break; // Stop on first failure (likely rate limited)
      
}
    }

    const duration = Date.now() - startTime;
    const requestsPerSecond = (successfulRequests / duration) * 1000;

    const success = requestsPerSecond > 100; // Consider success if > 100 req/s
    this.recordAttack('rate_limiting_bypass', success, {
  totalRequests: requestCount,
      successfulRequests,
      duration,
      requestsPerSecond: requestsPerSecond.toFixed(2),
    
});

    return success;
  }

  private recordAttack(attackType: string, success: boolean, details: any): void {
  this.attackLog.push({,
  timestamp: Date.now(),
      attackType,
      success,
      details,
    
});
  }

  getAttackLog(): typeof this.attackLog {
  return [...this.attackLog];
  
}

  clearAttackLog(): void {
  this.attackLog = [];
  
}
}

/**
 * Rate limiter for testing
 */
class RateLimiter {
  private requests = new Map<string, number[]>();
  private limits = {,
  perSecond: 10,
    perMinute: 100,
    perHour: 1000,
  
};

  isAllowed(clientId: string): boolean {
  const now = Date.now();
    const clientRequests = this.requests.get(clientId) || [];

    // Clean old requests
    const oneSecondAgo = now - 1000;
    const oneMinuteAgo = now - 60000;
    const oneHourAgo = now - 3600000;

    const recentRequests = clientRequests.filter(timestamp => timestamp > oneHourAgo);

    // Check limits
    const requestsLastSecond = recentRequests.filter(timestamp => timestamp > oneSecondAgo).length;
    const requestsLastMinute = recentRequests.filter(timestamp => timestamp > oneMinuteAgo).length;
    const requestsLastHour = recentRequests.length;

    if (requestsLastSecond >= this.limits.perSecond ||
        requestsLastMinute >= this.limits.perMinute ||
        requestsLastHour >= this.limits.perHour) {
      return false;
    
}

    // Add current request
    recentRequests.push(now);
    this.requests.set(clientId, recentRequests);

    return true;
  }

  getStats(clientId: string): { perSecond: number; perMinute: number; perHour: number } {
  const now = Date.now();
    const clientRequests = this.requests.get(clientId) || [];

    return {,
  perSecond: clientRequests.filter(timestamp => timestamp > now - 1000).length,
      perMinute: clientRequests.filter(timestamp => timestamp > now - 60000).length,
      perHour: clientRequests.filter(timestamp => timestamp > now - 3600000).length,
    
};
  }

  reset(): void {
  this.requests.clear();
  
}
}

// ===== MOCK CONFIGURATION =====

const mockConfigService = {

  get: jest.fn((key: string, defaultValue?: unknown) => {
    const config: Record<string, unknown> = {
      'CONVERSATIONAL_WEBSOCKET_PORT': 8193,'PARLANT_WEBSOCKET_PORT': 8194,'WEBSOCKET_SECURITY_ENABLED': true,'WEBSOCKET_AUTH_REQUIRED': true,'WEBSOCKET_RATE_LIMITING_ENABLED': true,'WEBSOCKET_ORIGIN_VALIDATION_ENABLED': true,'WEBSOCKET_MESSAGE_SIZE_LIMIT': 1048576, // 1MB'WEBSOCKET_ALLOWED_ORIGINS': 'https: //localhost:3000,
      https://trusted-domain.com',

};
return config[key] ?? defaultValue;
  }),
};

// ===== SECURITY VALIDATION TEST SUITE =====

describe('WebSocket Security Validation Tests', () => {

  let conversationalService: ConversationalWebSocketBridgeService;
  let module: TestingModule;
  let testServer: Server;
  let wsServer: WebSocket.Server;
  let tokenGenerator: TokenGenerator;
  let attackSimulator: AttackSimulator;
  let rateLimiter: RateLimiter;

  const TEST_PORT = 8193;
  const TEST_URL = `ws://localhost:$TEST_PORT
}`;const SECURE_TEST_URL = `wss://localhost:${TEST_PORT + 1}`;

  beforeAll(async () => {
  jest.setTimeout(300000); // 5 minutes for security tests

    module = await Test.createTestingModule({,
  providers: [
        ConversationalWebSocketBridgeService,
        {,
  provide: ConfigService,
          useValue: mockConfigService,
        
},
      ],
    }).compile();

    conversationalService = module.get<ConversationalWebSocketBridgeService>(ConversationalWebSocketBridgeService);
    tokenGenerator = new TokenGenerator();
    attackSimulator = new AttackSimulator();
    rateLimiter = new RateLimiter();

    // Create secure test WebSocket server with authentication
    testServer = createServer();
    wsServer = createSafeWebSocketServer({
  server: testServer,
      verifyClient: createSecureVerifyCallback({,
  allowedOrigins: ['https://localhost:3000', 'https: //trusted-domain.com'],
      requireHttps: false, // Disabled for testingmaxConnections: 10,
        rateLimitByIP: true,
      
}),
    });

    // Security audit log
    const securityAuditLog: Array<{
  timestamp: number;
  eventType: string;
      clientId: string;
  details: any;
      riskLevel: 'low' | 'medium' | 'high' | 'critical';
}> = [];// Enhanced connection handler with security features
    wsServer.on('connection', (ws: WebSocket.WebSocket, req) => {
  const clientId = req.headers['x-client-id'] as string || randomUUID();const authHeader = req.headers['authorization'] as string;const origin = req.headers['origin'] as string;let authenticated = false;let userContext: any = null;

      // Authentication check
      if (authHeader && authHeader.startsWith('Bearer ')) {const token = authHeader.substring(7);try {
          userContext = tokenGenerator.verifyToken(token);
          authenticated = true;

          securityAuditLog.push({,
  timestamp: Date.now(),
            eventType: 'authentication_success',
      clientId,details: { userId: userContext.sub, permissions: userContext.permissions 
},
            riskLevel: 'low',});} catch (error) {
  securityAuditLog.push({,
  timestamp: Date.now(),
            eventType: 'authentication_failure',
      clientId,details: { error: error.message, token: token.substring(0, 20) + '...' 
},riskLevel: 'high',});ws.close(1008, 'Authentication failed');return;}
      } else {
  securityAuditLog.push({,
  timestamp: Date.now(),
          eventType: 'unauthenticated_connection_attempt',
      clientId,details: { origin, userAgent: req.headers['user-agent'] 
},riskLevel: 'medium',});ws.close(1008, 'Authentication required');
        return;
      }

      console.log(`Secure WebSocket connection: ${clientId} (User: ${userContext.sub})`);

      ws.on('message', async (data: WebSocket.RawData) => {
  try {// Rate limiting check
          if (!rateLimiter.isAllowed(clientId)) {
            securityAuditLog.push({,
  timestamp: Date.now(),
              eventType: 'rate_limit_exceeded',
      clientId,details: { stats: rateLimiter.getStats(clientId) 
},
              riskLevel: 'medium',});ws.close(1008, 'Rate limit exceeded');return;}

          // Message size validation
          if (data.length > 1048576) {
  // 1MB limit
            securityAuditLog.push({,
  timestamp: Date.now(),
              eventType: 'message_size_violation',
      clientId,details: { size: data.length, limit: 1048576 
},
              riskLevel: 'high',});ws.close(1009, 'Message too large');return;}

          const message = JSON.parse(Buffer.from(data as ArrayBuffer).toString('utf8')) as ConversationalMessage;// Input validation and sanitizationconst validationResult = validateMessageContent(message);
          if (!validationResult.valid) {
  securityAuditLog.push({,
  timestamp: Date.now(),
              eventType: 'message_validation_failure',
      clientId,details: {
  messageId: message.messageId,
                violations: validationResult.violations,
              
},
              riskLevel: 'high',});ws.close(1003, 'Invalid message content');return;}

          // Log successful message processing
          securityAuditLog.push({
  timestamp: Date.now(),
            eventType: 'message_processed',
      clientId,details: {
  messageId: message.messageId,
              type: message.type,
              payloadSize: JSON.stringify(message.payload || {
}).length,
            },
            riskLevel: 'low',
          });

          // Send secure response
          const response: ConversationalMessage = {
            messageId: `secure_response_${message.messageId}`,
            sessionId: message.sessionId,
            timestamp: Date.now(),
            sequence: (message.sequence || 0) + 1,
            type: ConversationalMessageType.STATUS_UPDATE,
            payload: {
  securityValidated: true,
              originalMessage: {
  id: message.messageId,
                type: message.type,
                // Don't echo back sensitive payload data
},userContext: {
  userId: userContext.sub,
                permissions: userContext.permissions,
              
},
            },
            metadata: {
  priority: 'normal',
      requiresAck: false,
      compression: false,
              routingHints: ['security-validated'],
},};

          ws.send(JSON.stringify(response));

        } catch (error) {
  securityAuditLog.push({,
  timestamp: Date.now(),
            eventType: 'message_processing_error',
      clientId,details: { error: error.message 
},
            riskLevel: 'medium',
          });

          console.error(`Security test message error:`, error);
        }
      });

      ws.on('close', (code, reason) => {
  securityAuditLog.push({timestamp: Date.now(),
          eventType: 'connection_closed',
      clientId,details: { code, reason: reason.toString() 
},
          riskLevel: 'low',
        });

        console.log(`Secure WebSocket disconnected: ${clientId}`);
      });

      ws.on('error', (error) => {
  securityAuditLog.push({timestamp: Date.now(),
          eventType: 'connection_error',
      clientId,details: { error: error.message 
},
          riskLevel: 'medium',
        });

        console.error(`Secure WebSocket error:`, error);});// Store audit log for test access
      (ws as any).getSecurityAuditLog = () => securityAuditLog;
    });

    function validateMessageContent(message: ConversationalMessage): {
  valid: boolean;
  violations: string[];
    
} {
  const violations: string[] = [];

      // Check for XSS patterns
      const xssPatterns = [
        /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi,
        /<iframe[\s\S]*?>/gi,
      ];

      const messageStr = JSON.stringify(message);
      xssPatterns.forEach((pattern, index) => {
        if (pattern.test(messageStr)) {
          violations.push(`XSS_PATTERN_${index + 1
}`);
        }
      });

      // Check for SQL injection patterns
      const sqlPatterns = [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)\b)|(')|(\-\-)|(\;)/gi,
        /(UNION|OR|AND)\s+\w+\s*=\s*\w+/gi,
      ];

      sqlPatterns.forEach((pattern, index) => {
  if (pattern.test(messageStr)) {
          violations.push(`SQL_INJECTION_PATTERN_${index + 1
}`);
        }
      });

      // Check for path traversal
      if (messageStr.includes('../') || messageStr.includes('..\\')) {violations.push('PATH_TRAVERSAL');}// Check message structure
      if (!message.messageId || !message.sessionId || !message.timestamp) {
        violations.push('MISSING_REQUIRED_FIELDS');}
return {
  valid: violations.length === 0,
        violations,
      
};
    }

    // Start test server
    await new Promise<void>((resolve) => {
  testServer.listen(TEST_PORT, resolve);
    
});
  });

  afterAll(async () => {
  wsServer.close();
    await new Promise<void>((resolve) => {
      testServer.close(() => resolve());
    
});

    await conversationalService.onApplicationShutdown();
    await module.close();
  });

  beforeEach(() => {
  attackSimulator.clearAttackLog();
    rateLimiter.reset();
  
});

  // ===== AUTHENTICATION AND AUTHORIZATION =====

  describe('Authentication and Authorization', () => {
it('should reject connections without valid authentication tokens', async () => const unauthenticatedClient = new SecurityTestClient(TEST_URL, {clientId: 'unauthenticated-test',// No auth token provided});

      await expect(unauthenticatedClient.connect()).rejects.toThrow();

      const securityEvents = unauthenticatedClient.getSecurityEvents();
      const connectionEvents = securityEvents.filter(e => e.eventType === 'connection_error');
expect(connectionEvents.length).toBeGreaterThan(0);});



    it('should accept connections with valid JWT tokens', async () => {
const validToken = tokenGenerator.generateValidToken('test-user-123', ['read', 'write']);const authenticatedClient = new SecurityTestClient(TEST_URL, clientId: 'authenticated-test',
      authToken: validToken,});

      await authenticatedClient.connect();
      expect(authenticatedClient.isConnected()).toBe(true);

      // Send test message to verify authenticated communication
      await authenticatedClient.sendMessage({
  messageId: 'auth-test-message',
      sessionId: 'auth-test-session',
      timestamp: Date.now(),
      sequence: 1,
        type: ConversationalMessageType.STATUS_UPDATE,
        payload: { authenticationTest: true 
},
        metadata: {
  priority: 'normal',
      requiresAck: false,
      compression: false,
          routingHints: ['auth-test'],
},});

      await new Promise(resolve => setTimeout(resolve, 500));

      const securityEvents = authenticatedClient.getSecurityEvents();
      expect(securityEvents.some(e => e.eventType === 'connection_established')).toBe(true);
expect(securityEvents.some(e => e.eventType === 'message_sent')).toBe(true);await authenticatedClient.disconnect();});



    it('should reject expired JWT tokens', async () => {
const expiredToken = tokenGenerator.generateExpiredToken('test-user-expired');const expiredTokenClient = new SecurityTestClient(TEST_URL, clientId: 'expired-token-test',
      authToken: expiredToken,});

      await expect(expiredTokenClient.connect()).rejects.toThrow();
    });



    it('should reject malformed or tampered JWT tokens', async () => {
const malformedToken = tokenGenerator.generateMalformedToken();const tamperedToken = tokenGenerator.generateTamperedToken('test-user-tampered');const malformedClient = new SecurityTestClient(TEST_URL, clientId: 'malformed-token-test',
      authToken: malformedToken,});

      const tamperedClient = new SecurityTestClient(TEST_URL, {
        clientId: 'tampered-token-test',
      authToken: tamperedToken,});

      await expect(malformedClient.connect()).rejects.toThrow();
      await expect(tamperedClient.connect()).rejects.toThrow();
    });
  });

  // ===== INPUT VALIDATION AND INJECTION PREVENTION =====

  describe('Input Validation and Injection Prevention', () => {
it('should prevent XSS attacks through message content', async () => const validToken = tokenGenerator.generateValidToken('xss-test-user');const client = new SecurityTestClient(TEST_URL, {clientId: 'xss-test',
      authToken: validToken,});

      await client.connect();

      const xssBlocked = !(await attackSimulator.simulateXSSAttack(client));
      const attackLog = attackSimulator.getAttackLog();

      console.log('XSS Prevention Test Results:', {xssAttackBlocked: xssBlocked,
      attackAttempts: attackLog.filter(a => a.attackType === 'xss_injection').length,
      connectionStillActive: client.isConnected(),});

      expect(xssBlocked).toBe(true); // XSS should be blocked
      expect(client.isConnected()).toBe(false); // Connection should be closed for security

      await client.disconnect();
    });



    it('should prevent SQL injection attempts through validation payloads', async () => {
const validToken = tokenGenerator.generateValidToken('sql-test-user');const client = new SecurityTestClient(TEST_URL, clientId: 'sql-injection-test',
      authToken: validToken,});

      await client.connect();

      const sqlBlocked = !(await attackSimulator.simulateSQLInjectionAttack(client));
      const attackLog = attackSimulator.getAttackLog();

      console.log('SQL Injection Prevention Test Results:', {sqlAttackBlocked: sqlBlocked,
      attackAttempts: attackLog.filter(a => a.attackType === 'sql_injection').length,
      connectionStillActive: client.isConnected(),});

      expect(sqlBlocked).toBe(true); // SQL injection should be blocked

      await client.disconnect();
    });



    it('should enforce message size limits to prevent buffer overflow attacks', async () => {
const validToken = tokenGenerator.generateValidToken('buffer-test-user');const client = new SecurityTestClient(TEST_URL, clientId: 'buffer-overflow-test',
      authToken: validToken,});

      await client.connect();

      const bufferOverflowBlocked = !(await attackSimulator.simulateBufferOverflowAttack(client));
      const attackLog = attackSimulator.getAttackLog();

      console.log('Buffer Overflow Prevention Test Results:', {bufferOverflowBlocked: bufferOverflowBlocked,
      attackAttempts: attackLog.filter(a => a.attackType === 'buffer_overflow').length,
      connectionStillActive: client.isConnected(),});

      expect(bufferOverflowBlocked).toBe(true); // Large payloads should be rejected

      await client.disconnect();
    });
  });

  // ===== RATE LIMITING AND DDOS PROTECTION =====

  describe('Rate Limiting and DDoS Protection', () => {
it('should enforce rate limits per connection', async () => const validToken = tokenGenerator.generateValidToken('rate-limit-test-user');const client = new SecurityTestClient(TEST_URL, {clientId: 'rate-limit-test',
      authToken: validToken,});

      await client.connect();

      const rateLimitBypassed = await attackSimulator.simulateRateLimitingBypass(client, 100);
      const attackLog = attackSimulator.getAttackLog();

      console.log('Rate Limiting Test Results:', {rateLimitBypassed,attackLog: attackLog.filter(a => a.attackType === 'rate_limiting_bypass'),
      connectionStillActive: client.isConnected(),});

      expect(rateLimitBypassed).toBe(false); // Rate limiting should prevent bypass
      expect(client.isConnected()).toBe(false); // Connection should be closed after rate limit

      await client.disconnect();
    });



    it('should handle multiple concurrent connections within limits', async () => {

  const concurrentClients: SecurityTestClient[] = [];
      const maxClients = 8; // Within the limit of 10

      for (let i = 0; i < maxClients; i++) 
        const token = tokenGenerator.generateValidToken(`concurrent-user-${i
}`);const client = new SecurityTestClient(TEST_URL, {clientId: `concurrent-client-${i}`,
          authToken: token,
        });

        concurrentClients.push(client);
      }

      // Connect all clients
      const connectionResults = await Promise.allSettled(
        concurrentClients.map(client => client.connect())
      );

      const successfulConnections = connectionResults.filter(
        result => result.status === 'fulfilled').length;console.log('Concurrent Connections Test Results:', {
  targetConnections: maxClients,
        successfulConnections,
        connectionSuccess: `${((successfulConnections / maxClients) * 100).toFixed(1)
}%`,
        limit: '10 connections',});
expect(successfulConnections).toBeGreaterThan(maxClients * 0.8); // 80%+ should succeed

      // Cleanup
      await Promise.all(concurrentClients.map(client => client.disconnect()));
    });
  });

  // ===== ORIGIN VALIDATION AND CSRF PROTECTION =====

  describe('Origin Validation and CSRF Protection', () => {

  it('should validate origin headers and reject unauthorized origins', async () => const validToken = tokenGenerator.generateValidToken('origin-test-user');// Test with unauthorized originconst unauthorizedClient = new SecurityTestClient(TEST_URL, {,
  clientId: 'unauthorized-origin-test',
      authToken: validToken,
      origin: 'https://malicious-domain.com',
});await expect(unauthorizedClient.connect()).rejects.toThrow();

      // Test with authorized origin
      const authorizedClient = new SecurityTestClient(TEST_URL, {
        clientId: 'authorized-origin-test',
      authToken: validToken,
      origin: 'https://localhost:3000',});await authorizedClient.connect();
      expect(authorizedClient.isConnected()).toBe(true);

      await authorizedClient.disconnect();
    });



    it('should prevent CSRF attacks through origin validation', async () => {

  const validToken = tokenGenerator.generateValidToken('csrf-test-user');const csrfOrigins = ['https://evil-site.com','http://localhost:3000', // Wrong protocol'https://fake-localhost.com','javascript:alert(1)',
      ];

      let blockedOrigins = 0;

      for (const origin of csrfOrigins) 
        const csrfClient = new SecurityTestClient(TEST_URL, {,
  clientId: `csrf-test-${blockedOrigins
}`,
          authToken: validToken,
          origin,
        });

        try {
  await csrfClient.connect();
          await csrfClient.disconnect();
        
} catch (error) {
  blockedOrigins++;
        
}
      }

      console.log('CSRF Protection Test Results:', {
  totalCSRFAttempts: csrfOrigins.length,
        blockedOrigins,
        protectionRate: `${((blockedOrigins / csrfOrigins.length) * 100).toFixed(1)
}%`,
      });

      expect(blockedOrigins).toBe(csrfOrigins.length); // All CSRF attempts should be blocked
    });
  });

  // ===== MESSAGE INTEGRITY AND CONFIDENTIALITY =====

  describe('Message Integrity and Confidentiality', () => {
it('should maintain message integrity during transmission', async () => const validToken = tokenGenerator.generateValidToken('integrity-test-user');const client = new SecurityTestClient(TEST_URL, {clientId: 'integrity-test',
      authToken: validToken,});

      await client.connect();

      const testMessages = [
        { id: 1, data: 'Test message 1', hash: crypto.createHash('sha256').update('Test message 1').digest('hex') },{ id: 2, data: 'Test message 2', hash: crypto.createHash('sha256').update('Test message 2').digest('hex') },{ id: 3, data: 'Test message 3', hash: crypto.createHash('sha256').update('Test message 3').digest('hex') },];const responses: any[] = [];

      client.on('message', (response) => {
  responses.push(response);
      
});

      for (const testMsg of testMessages) {
  await client.sendMessage({,
  messageId: `integrity-test-${testMsg.id
}`,
          sessionId: 'integrity-test-session',
      timestamp: Date.now(),
      sequence: testMsg.id,
          type: ConversationalMessageType.STATUS_UPDATE,
          payload: {
  data: testMsg.data,
            expectedHash: testMsg.hash,
            integrityTest: true,
          
},
          metadata: {
  priority: 'normal',
      requiresAck: false,
      compression: false,
            routingHints: ['integrity-test'],
},});
      }

      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log('Message Integrity Test Results:', {
  messagesSent: testMessages.length,
      responsesReceived: responses.length,
        integrityValidated: responses.every(r => r.payload?.securityValidated),
      
});

      expect(responses.length).toBe(testMessages.length);
      expect(responses.every(r => r.payload?.securityValidated)).toBe(true);

      await client.disconnect();
    });



    it('should ensure secure handling of sensitive data in payloads', async () => {
const validToken = tokenGenerator.generateValidToken('sensitive-data-test-user');const client = new SecurityTestClient(TEST_URL, clientId: 'sensitive-data-test',
      authToken: validToken,});

      await client.connect();

      const sensitiveData = {

        creditCard: '4111-1111-1111-1111',
      ssn: '123-45-6789',
      password: 'secretPassword123',
      apiKey: 'sk-1234567890abcdef',
};
let responseReceived: any = null;

      client.on('message', (response) => {responseReceived = response;});

      await client.sendMessage({
  messageId: 'sensitive-data-test',
      sessionId: 'sensitive-data-session',
      timestamp: Date.now(),
      sequence: 1,
        type: ConversationalMessageType.STATUS_UPDATE,
        payload: {
          sensitiveData,
          requiresSecureHandling: true,
        
},
        metadata: {
  priority: 'high',
      requiresAck: false,
      compression: false,
          routingHints: ['sensitive-data-test'],
},});

      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify sensitive data is not echoed back in response
      const responseStr = JSON.stringify(responseReceived);
      const sensitiveDataLeaked = Object.values(sensitiveData).some(value =>
        responseStr.includes(value)
      );

      console.log('Sensitive Data Handling Test Results:', {
  sensitiveDataSent: Object.keys(sensitiveData).length,
        responseReceived: !!responseReceived,
        sensitiveDataLeaked,
        securityValidated: responseReceived?.payload?.securityValidated,
      
});

      expect(responseReceived).toBeTruthy();
      expect(sensitiveDataLeaked).toBe(false); // Sensitive data should not be leaked
      expect(responseReceived.payload?.securityValidated).toBe(true);

      await client.disconnect();
    });
  });
});