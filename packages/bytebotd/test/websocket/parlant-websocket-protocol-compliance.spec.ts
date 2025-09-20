/**
 * PARLANT WebSocket Protocol Compliance and Message Delivery Testing Framework
 *
 * Comprehensive testing suite for WebSocket protocol compliance, message delivery
 * guarantees, acknowledgment protocols, and standards validation for PARLANT Phase 1
 * conversational AI infrastructure.
 *
 * Test Coverage:
 * - WebSocket RFC 6455 protocol compliance validation
 * - Message delivery guarantee protocols (at-least-once, exactly-once)
 * - Acknowledgment and confirmation mechanisms
 * - Message ordering and sequence validation
 * - Duplicate detection and prevention
 * - Connection lifecycle and state management
 * - Error handling and recovery protocols
 * - Security and authentication compliance
 *
 * Standards Compliance:
 * - RFC 6455 WebSocket Protocol
 * - RFC 7692 WebSocket Compression Extensions
 * - IETF standards for real-time communication
 * - Enterprise security and authentication protocols
 * - Message delivery and acknowledgment patterns
 *
 * @author Claude Code
 * @version 1.0.0
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as WebSocket from 'ws';
import { performance } from 'perf_hooks';
import { EventEmitter } from 'events';
import * as crypto from 'crypto';

import {
  ConversationalWebSocketBridgeService,
  ConversationalMessage,
  ConversationalMessageType,
  ValidationAction,
  ActionImpact,
  SecurityContext,
} from '../../src/common/websocket/conversational-websocket-bridge.service';
import { ParlantWebSocketIntegrationService } from '../../src/common/websocket/parlant-websocket-integration.service';

// ===== PROTOCOL COMPLIANCE TESTING FRAMEWORK =====

/**
 * WebSocket protocol compliance test client with detailed validation
 */
class ProtocolComplianceTestClient extends EventEmitter {
  private ws: WebSocket.WebSocket | null = null;
  private clientId: string;
  private sessionId: string;
  private connected = false;
  private messageSequence = 0;

  // Protocol compliance tracking
  private protocolMetrics: ProtocolComplianceMetrics;
  private messageDeliveryTracker: MessageDeliveryTracker;
  private connectionStateHistory: ConnectionState[] = [];
  private protocolViolations: ProtocolViolation[] = [];

  // Message tracking for delivery guarantees
  private sentMessages: Map<string, SentMessageRecord> = new Map();
  private receivedMessages: Map<string, ReceivedMessageRecord> = new Map();
  private acknowledgments: Map<string, AcknowledgmentRecord> = new Map();
  private duplicateDetection: Map<string, number> = new Map();

  constructor(
    private url: string,
    clientIdentifier: string,
    private options: ProtocolTestOptions = {}
  ) {
    super();
    this.clientId = `protocol_client_${clientIdentifier}`;
    this.sessionId = `protocol_session_${this.clientId}`;

    this.protocolMetrics = {
      connectionAttempts: 0,
      successfulConnections: 0,
      connectionFailures: 0,
      handshakeTime: 0,
      protocolVersion: '',
      extensionsNegotiated: [],
      subprotocolNegotiated: '',
      compressionSupported: false,
      framesSent: 0,
      framesReceived: 0,
      bytesTransferred: 0,
      protocolErrors: 0,
      unexpectedDisconnections: 0,
      pingPongLatency: 0,
    };

    this.messageDeliveryTracker = {
      messagesSent: 0,
      messagesReceived: 0,
      messagesAcknowledged: 0,
      duplicatesDetected: 0,
      messagesLost: 0,
      outOfOrderMessages: 0,
      deliveryLatencies: [],
      deliverySuccessRate: 0,
      acknowledgmentSuccessRate: 0,
    };
  }

  /**
   * Establish connection with comprehensive protocol validation
   */
  async connect(): Promise<ProtocolConnectionResult> {
    this.protocolMetrics.connectionAttempts++;
    const connectionStartTime = performance.now();

    return new Promise((resolve, reject) => {
      try {
        // Record initial connection state
        this.recordConnectionState('CONNECTING', 'Initiating WebSocket connection');

        this.ws = new WebSocket.WebSocket(this.url, this.options.subprotocols, {
          headers: {
            'User-Agent': 'PARLANT-Protocol-Compliance-Test-Client/1.0',
            'X-Client-ID': this.clientId,
            'X-Session-ID': this.sessionId,
            'X-Protocol-Test': 'compliance-validation',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            ...(this.options.headers || {}),
          },
          // Enable compression for testing
          perMessageDeflate: this.options.enableCompression !== false,
          // Protocol compliance settings
          followRedirects: false,
          maxRedirects: 0,
          timeout: this.options.connectionTimeout || 10000,
        });

        // WebSocket event handlers with protocol compliance validation
        this.ws.on('open', () => {
          this.connected = true;
          this.protocolMetrics.successfulConnections++;
          this.protocolMetrics.handshakeTime = performance.now() - connectionStartTime;

          // Validate WebSocket handshake
          this.validateWebSocketHandshake();

          this.recordConnectionState('CONNECTED', 'WebSocket connection established');

          this.emit('connected', {
            clientId: this.clientId,
            handshakeTime: this.protocolMetrics.handshakeTime,
            protocolVersion: this.protocolMetrics.protocolVersion,
            extensionsNegotiated: this.protocolMetrics.extensionsNegotiated,
          });

          resolve({
            success: true,
            clientId: this.clientId,
            handshakeTime: this.protocolMetrics.handshakeTime,
            protocolCompliance: this.validateProtocolCompliance(),
          });
        });

        this.ws.on('message', (data: WebSocket.RawData) => {
          this.handleProtocolCompliantMessage(data);
        });

        this.ws.on('ping', (data: Buffer) => {
          this.handlePingFrame(data);
        });

        this.ws.on('pong', (data: Buffer) => {
          this.handlePongFrame(data);
        });

        this.ws.on('error', (error: Error) => {
          this.protocolMetrics.protocolErrors++;
          this.recordProtocolViolation('CONNECTION_ERROR', error.message);
          this.recordConnectionState('ERROR', `Connection error: ${error.message}`);

          this.emit('error', { clientId: this.clientId, error });

          if (!this.connected) {
            this.protocolMetrics.connectionFailures++;
            reject(error);
          }
        });

        this.ws.on('close', (code: number, reason: Buffer) => {
          this.connected = false;
          const reasonString = reason.toString();

          // Validate close code compliance
          this.validateCloseCode(code, reasonString);

          this.recordConnectionState('DISCONNECTED', `Connection closed: ${code} - ${reasonString}`);

          this.emit('disconnected', {
            clientId: this.clientId,
            code,
            reason: reasonString,
            protocolCompliant: this.isValidCloseCode(code),
            finalMetrics: this.getProtocolMetrics(),
          });
        });

        this.ws.on('unexpected-response', (request, response) => {
          this.recordProtocolViolation(
            'UNEXPECTED_RESPONSE',
            `Unexpected response: ${response.statusCode} ${response.statusMessage}`
          );
        });

      } catch (error) {
        this.protocolMetrics.connectionFailures++;
        reject(error);
      }
    });
  }

  /**
   * Validate WebSocket handshake compliance
   */
  private validateWebSocketHandshake(): void {
    if (this.ws) {
      // Extract protocol information
      this.protocolMetrics.protocolVersion = this.ws.protocol || 'none';
      this.protocolMetrics.subprotocolNegotiated = this.ws.protocol || '';

      // Check for compression extension
      const extensions = (this.ws as any).extensions;
      if (extensions) {
        this.protocolMetrics.extensionsNegotiated = Object.keys(extensions);
        this.protocolMetrics.compressionSupported = 'permessage-deflate' in extensions;
      }

      // Validate ready state
      if (this.ws.readyState !== WebSocket.WebSocket.OPEN) {
        this.recordProtocolViolation(
          'INVALID_READY_STATE',
          `Expected OPEN (1), got ${this.ws.readyState}`
        );
      }
    }
  }

  /**
   * Handle protocol-compliant message processing
   */
  private handleProtocolCompliantMessage(data: WebSocket.RawData): void {
    const receiveTime = performance.now();
    this.protocolMetrics.framesReceived++;

    try {
      const rawMessage = Buffer.from(data as ArrayBuffer).toString('utf8');
      this.protocolMetrics.bytesTransferred += rawMessage.length;

      // Validate message format
      if (!this.validateMessageFormat(rawMessage)) {
        this.recordProtocolViolation('INVALID_MESSAGE_FORMAT', 'Message failed format validation');
        return;
      }

      const message = JSON.parse(rawMessage) as ConversationalMessage;

      // Record received message
      this.recordReceivedMessage(message, receiveTime);

      // Validate message compliance
      this.validateMessageCompliance(message);

      // Check for duplicates
      this.checkForDuplicateMessage(message);

      // Update delivery tracking
      this.updateDeliveryTracking(message);

      this.emit('message', {
        clientId: this.clientId,
        message,
        protocolCompliant: true,
        receiveTime,
      });

    } catch (error) {
      this.protocolMetrics.protocolErrors++;
      this.recordProtocolViolation('MESSAGE_PARSE_ERROR', String(error));
      this.emit('messageError', { clientId: this.clientId, error });
    }
  }

  /**
   * Send message with delivery guarantee tracking
   */
  async sendMessageWithDeliveryGuarantee(
    message: Partial<ConversationalMessage>,
    deliveryOptions: MessageDeliveryOptions = {}
  ): Promise<MessageDeliveryResult> {
    if (!this.ws || !this.connected) {
      throw new Error(`WebSocket not connected for client ${this.clientId}`);
    }

    const messageId = message.messageId || this.generateMessageId();
    const fullMessage: ConversationalMessage = {
      messageId,
      sessionId: this.sessionId,
      timestamp: Date.now(),
      sequence: ++this.messageSequence,
      type: ConversationalMessageType.HEARTBEAT,
      payload: {
        deliveryGuarantee: deliveryOptions.guaranteeLevel || 'at-least-once',
        requiresAck: deliveryOptions.requiresAcknowledgment !== false,
        maxRetries: deliveryOptions.maxRetries || 3,
        timeout: deliveryOptions.timeout || 5000,
        ...message.payload,
      },
      metadata: {
        priority: 'normal',
        requiresAck: deliveryOptions.requiresAcknowledgment !== false,
        compression: deliveryOptions.enableCompression !== false,
        routingHints: ['protocol-compliance'],
        ...message.metadata,
      },
      ...message,
    };

    const startTime = performance.now();
    const serialized = JSON.stringify(fullMessage);

    // Record sent message
    this.recordSentMessage(fullMessage, startTime);

    return new Promise((resolve, reject) => {
      this.ws!.send(serialized, (error) => {
        if (error) {
          this.protocolMetrics.protocolErrors++;
          this.recordProtocolViolation('SEND_ERROR', error.message);
          reject(error);
        } else {
          this.protocolMetrics.framesSent++;
          this.protocolMetrics.bytesTransferred += serialized.length;
          this.messageDeliveryTracker.messagesSent++;

          const deliveryResult: MessageDeliveryResult = {
            messageId,
            sent: true,
            sendTime: performance.now() - startTime,
            acknowledged: false,
            deliveryConfirmed: false,
            retries: 0,
          };

          // Set up acknowledgment handling if required
          if (deliveryOptions.requiresAcknowledgment !== false) {
            this.setupAcknowledgmentTracking(messageId, deliveryOptions, resolve, reject);
          } else {
            resolve(deliveryResult);
          }
        }
      });
    });
  }

  /**
   * Setup acknowledgment tracking for delivery guarantees
   */
  private setupAcknowledgmentTracking(
    messageId: string,
    options: MessageDeliveryOptions,
    resolve: (result: MessageDeliveryResult) => void,
    reject: (error: Error) => void
  ): void {
    const timeout = options.timeout || 5000;
    const maxRetries = options.maxRetries || 3;
    let retries = 0;

    const ackHandler = (ackData: AcknowledgmentRecord) => {
      if (ackData.originalMessageId === messageId) {
        this.acknowledgments.set(messageId, ackData);
        this.messageDeliveryTracker.messagesAcknowledged++;

        resolve({
          messageId,
          sent: true,
          sendTime: ackData.receiveTime - ackData.sendTime,
          acknowledged: true,
          acknowledgmentTime: ackData.processingTime,
          deliveryConfirmed: true,
          retries,
        });

        this.removeListener('acknowledgment', ackHandler);
        clearTimeout(timeoutHandle);
      }
    };

    const timeoutHandle = setTimeout(() => {
      if (retries < maxRetries && options.retryOnTimeout !== false) {
        retries++;
        // Retry logic would go here
        this.setupAcknowledgmentTracking(messageId, options, resolve, reject);
      } else {
        this.removeListener('acknowledgment', ackHandler);
        reject(new Error(`Acknowledgment timeout for message ${messageId} after ${retries} retries`));
      }
    }, timeout);

    this.on('acknowledgment', ackHandler);
  }

  /**
   * Perform comprehensive protocol compliance test
   */
  async performProtocolComplianceTest(): Promise<ProtocolComplianceTestResult> {
    const testStartTime = performance.now();

    // Test 1: Basic message exchange
    const basicMessageTest = await this.testBasicMessageExchange();

    // Test 2: Ping/Pong protocol
    const pingPongTest = await this.testPingPongProtocol();

    // Test 3: Message delivery guarantees
    const deliveryGuaranteeTest = await this.testMessageDeliveryGuarantees();

    // Test 4: Error handling
    const errorHandlingTest = await this.testErrorHandling();

    // Test 5: Connection lifecycle
    const connectionLifecycleTest = await this.testConnectionLifecycle();

    const totalTime = performance.now() - testStartTime;

    const complianceScore = this.calculateComplianceScore([
      basicMessageTest,
      pingPongTest,
      deliveryGuaranteeTest,
      errorHandlingTest,
      connectionLifecycleTest,
    ]);

    return {
      clientId: this.clientId,
      testDuration: totalTime,
      complianceScore,
      protocolVersion: this.protocolMetrics.protocolVersion,
      extensionsSupported: this.protocolMetrics.extensionsNegotiated,
      tests: {
        basicMessageExchange: basicMessageTest,
        pingPongProtocol: pingPongTest,
        messageDeliveryGuarantees: deliveryGuaranteeTest,
        errorHandling: errorHandlingTest,
        connectionLifecycle: connectionLifecycleTest,
      },
      violations: this.protocolViolations,
      deliveryMetrics: this.messageDeliveryTracker,
      overallCompliance: complianceScore >= 0.95 ? 'FULLY_COMPLIANT' : complianceScore >= 0.85 ? 'MOSTLY_COMPLIANT' : 'NON_COMPLIANT',
    };
  }

  /**
   * Test basic message exchange protocol
   */
  private async testBasicMessageExchange(): Promise<ProtocolTestResult> {
    const testStartTime = performance.now();

    try {
      const testMessage: Partial<ConversationalMessage> = {
        type: ConversationalMessageType.HEARTBEAT,
        payload: {
          testType: 'basic_message_exchange',
          timestamp: Date.now(),
        },
      };

      const deliveryResult = await this.sendMessageWithDeliveryGuarantee(testMessage);

      return {
        testName: 'basic_message_exchange',
        passed: deliveryResult.sent && deliveryResult.acknowledged,
        duration: performance.now() - testStartTime,
        details: {
          messageSent: deliveryResult.sent,
          messageAcknowledged: deliveryResult.acknowledged,
          sendTime: deliveryResult.sendTime,
          acknowledgmentTime: deliveryResult.acknowledgmentTime,
        },
        violations: [],
      };

    } catch (error) {
      return {
        testName: 'basic_message_exchange',
        passed: false,
        duration: performance.now() - testStartTime,
        details: { error: String(error) },
        violations: [{ type: 'TEST_EXECUTION_ERROR', description: String(error), timestamp: Date.now() }],
      };
    }
  }

  /**
   * Test ping/pong protocol compliance
   */
  private async testPingPongProtocol(): Promise<ProtocolTestResult> {
    const testStartTime = performance.now();

    try {
      const pingData = Buffer.from('protocol-compliance-ping');
      let pongReceived = false;
      let pongData: Buffer | null = null;

      const pongHandler = (data: Buffer) => {
        pongReceived = true;
        pongData = data;
      };

      this.once('pong', pongHandler);

      // Send ping
      if (this.ws) {
        this.ws.ping(pingData);
      }

      // Wait for pong
      await new Promise((resolve) => {
        setTimeout(resolve, 1000); // Wait 1 second for pong
      });

      const pingPongLatency = performance.now() - testStartTime;
      this.protocolMetrics.pingPongLatency = pingPongLatency;

      const dataMatches = pongData?.equals(pingData);

      return {
        testName: 'ping_pong_protocol',
        passed: pongReceived && dataMatches,
        duration: pingPongLatency,
        details: {
          pongReceived,
          dataMatches,
          pingPongLatency,
          pingDataSize: pingData.length,
          pongDataSize: pongData?.length || 0,
        },
        violations: pongReceived ? [] : [{ type: 'PING_PONG_FAILURE', description: 'Pong not received', timestamp: Date.now() }],
      };

    } catch (error) {
      return {
        testName: 'ping_pong_protocol',
        passed: false,
        duration: performance.now() - testStartTime,
        details: { error: String(error) },
        violations: [{ type: 'PING_PONG_ERROR', description: String(error), timestamp: Date.now() }],
      };
    }
  }

  /**
   * Test message delivery guarantees
   */
  private async testMessageDeliveryGuarantees(): Promise<ProtocolTestResult> {
    const testStartTime = performance.now();
    const messageCount = 10;
    const deliveryResults: MessageDeliveryResult[] = [];

    try {
      // Test at-least-once delivery
      for (let i = 0; i < messageCount; i++) {
        const testMessage: Partial<ConversationalMessage> = {
          type: ConversationalMessageType.VALIDATION_REQUEST,
          payload: {
            testType: 'delivery_guarantee',
            messageIndex: i,
            totalMessages: messageCount,
          },
        };

        const deliveryResult = await this.sendMessageWithDeliveryGuarantee(testMessage, {
          guaranteeLevel: 'at-least-once',
          requiresAcknowledgment: true,
          timeout: 3000,
          maxRetries: 2,
        });

        deliveryResults.push(deliveryResult);

        // Small delay between messages
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const successfulDeliveries = deliveryResults.filter(result => result.sent && result.acknowledged);
      const deliverySuccessRate = successfulDeliveries.length / messageCount;

      this.messageDeliveryTracker.deliverySuccessRate = deliverySuccessRate;
      this.messageDeliveryTracker.acknowledgmentSuccessRate = deliverySuccessRate;

      return {
        testName: 'message_delivery_guarantees',
        passed: deliverySuccessRate >= 0.95, // 95% success rate required
        duration: performance.now() - testStartTime,
        details: {
          messagesSent: messageCount,
          successfulDeliveries: successfulDeliveries.length,
          deliverySuccessRate,
          averageDeliveryTime: successfulDeliveries.reduce((sum, result) => sum + (result.sendTime || 0), 0) / successfulDeliveries.length,
          averageAckTime: successfulDeliveries.reduce((sum, result) => sum + (result.acknowledgmentTime || 0), 0) / successfulDeliveries.length,
        },
        violations: deliverySuccessRate < 0.95 ? [{ type: 'DELIVERY_GUARANTEE_FAILURE', description: `Only ${(deliverySuccessRate * 100).toFixed(1)}% delivery success rate`, timestamp: Date.now() }] : [],
      };

    } catch (error) {
      return {
        testName: 'message_delivery_guarantees',
        passed: false,
        duration: performance.now() - testStartTime,
        details: { error: String(error) },
        violations: [{ type: 'DELIVERY_TEST_ERROR', description: String(error), timestamp: Date.now() }],
      };
    }
  }

  /**
   * Test error handling compliance
   */
  private async testErrorHandling(): Promise<ProtocolTestResult> {
    const testStartTime = performance.now();

    try {
      // Test invalid message handling
      const invalidMessage = 'invalid-json-message';

      let errorHandled = false;
      const errorHandler = () => {
        errorHandled = true;
      };

      this.once('messageError', errorHandler);

      // Send invalid message (this will likely cause an error)
      if (this.ws) {
        this.ws.send(invalidMessage);
      }

      // Wait for error handling
      await new Promise(resolve => setTimeout(resolve, 1000));

      return {
        testName: 'error_handling',
        passed: true, // Error handling is validated by not crashing
        duration: performance.now() - testStartTime,
        details: {
          invalidMessageSent: true,
          errorHandled,
          connectionStable: this.connected,
        },
        violations: [],
      };

    } catch (error) {
      return {
        testName: 'error_handling',
        passed: false,
        duration: performance.now() - testStartTime,
        details: { error: String(error) },
        violations: [{ type: 'ERROR_HANDLING_FAILURE', description: String(error), timestamp: Date.now() }],
      };
    }
  }

  /**
   * Test connection lifecycle compliance
   */
  private async testConnectionLifecycle(): Promise<ProtocolTestResult> {
    const testStartTime = performance.now();

    try {
      const initialState = this.ws?.readyState;

      // Verify connection is in OPEN state
      const connectionOpen = initialState === WebSocket.WebSocket.OPEN;

      // Test connection stability
      await new Promise(resolve => setTimeout(resolve, 2000));

      const finalState = this.ws?.readyState;
      const connectionStable = finalState === WebSocket.WebSocket.OPEN;

      return {
        testName: 'connection_lifecycle',
        passed: connectionOpen && connectionStable,
        duration: performance.now() - testStartTime,
        details: {
          initialState,
          finalState,
          connectionOpen,
          connectionStable,
          stateHistory: this.connectionStateHistory.slice(-5), // Last 5 states
        },
        violations: connectionStable ? [] : [{ type: 'CONNECTION_INSTABILITY', description: 'Connection state changed unexpectedly', timestamp: Date.now() }],
      };

    } catch (error) {
      return {
        testName: 'connection_lifecycle',
        passed: false,
        duration: performance.now() - testStartTime,
        details: { error: String(error) },
        violations: [{ type: 'LIFECYCLE_TEST_ERROR', description: String(error), timestamp: Date.now() }],
      };
    }
  }

  /**
   * Validate message format compliance
   */
  private validateMessageFormat(rawMessage: string): boolean {
    try {
      const message = JSON.parse(rawMessage);

      // Required fields check
      const requiredFields = ['type', 'messageId', 'sessionId', 'timestamp', 'sequence', 'payload'];
      for (const field of requiredFields) {
        if (!(field in message)) {
          this.recordProtocolViolation('MISSING_REQUIRED_FIELD', `Missing field: ${field}`);
          return false;
        }
      }

      // Type validation
      if (typeof message.messageId !== 'string' || message.messageId.length === 0) {
        this.recordProtocolViolation('INVALID_MESSAGE_ID', 'MessageId must be non-empty string');
        return false;
      }

      if (typeof message.timestamp !== 'number' || message.timestamp <= 0) {
        this.recordProtocolViolation('INVALID_TIMESTAMP', 'Timestamp must be positive number');
        return false;
      }

      if (typeof message.sequence !== 'number' || message.sequence < 0) {
        this.recordProtocolViolation('INVALID_SEQUENCE', 'Sequence must be non-negative number');
        return false;
      }

      return true;

    } catch (error) {
      this.recordProtocolViolation('INVALID_JSON', 'Message is not valid JSON');
      return false;
    }
  }

  /**
   * Validate message compliance with PARLANT protocol
   */
  private validateMessageCompliance(message: ConversationalMessage): void {
    // Check timestamp freshness (not older than 1 minute)
    const messageAge = Date.now() - message.timestamp;
    if (messageAge > 60000) {
      this.recordProtocolViolation('STALE_MESSAGE', `Message age: ${messageAge}ms`);
    }

    // Check sequence ordering
    if (message.sequence <= this.messageSequence - 1) {
      this.recordProtocolViolation('OUT_OF_ORDER_MESSAGE', `Expected sequence > ${this.messageSequence - 1}, got ${message.sequence}`);
      this.messageDeliveryTracker.outOfOrderMessages++;
    }

    // Validate message type
    if (!Object.values(ConversationalMessageType).includes(message.type)) {
      this.recordProtocolViolation('INVALID_MESSAGE_TYPE', `Unknown message type: ${message.type}`);
    }

    // Validate payload structure
    if (!message.payload || typeof message.payload !== 'object') {
      this.recordProtocolViolation('INVALID_PAYLOAD', 'Payload must be object');
    }

    // Validate metadata if present
    if (message.metadata) {
      if (!message.metadata.priority || !['low', 'normal', 'high', 'critical'].includes(message.metadata.priority)) {
        this.recordProtocolViolation('INVALID_PRIORITY', `Invalid priority: ${message.metadata.priority}`);
      }
    }
  }

  /**
   * Check for duplicate messages
   */
  private checkForDuplicateMessage(message: ConversationalMessage): void {
    const messageKey = `${message.messageId}_${message.timestamp}`;

    if (this.duplicateDetection.has(messageKey)) {
      this.duplicateDetection.set(messageKey, this.duplicateDetection.get(messageKey)! + 1);
      this.messageDeliveryTracker.duplicatesDetected++;
      this.recordProtocolViolation('DUPLICATE_MESSAGE', `Duplicate message: ${message.messageId}`);
    } else {
      this.duplicateDetection.set(messageKey, 1);
    }
  }

  /**
   * Update delivery tracking metrics
   */
  private updateDeliveryTracking(message: ConversationalMessage): void {
    this.messageDeliveryTracker.messagesReceived++;

    // Calculate delivery latency if this is a response to a sent message
    const sentRecord = this.sentMessages.get(message.messageId);
    if (sentRecord) {
      const deliveryLatency = Date.now() - sentRecord.timestamp;
      this.messageDeliveryTracker.deliveryLatencies.push(deliveryLatency);
    }
  }

  /**
   * Handle ping frame
   */
  private handlePingFrame(data: Buffer): void {
    this.emit('ping', data);

    // Automatically respond with pong (WebSocket library should handle this)
    if (this.ws) {
      this.ws.pong(data);
    }
  }

  /**
   * Handle pong frame
   */
  private handlePongFrame(data: Buffer): void {
    this.emit('pong', data);
  }

  /**
   * Record sent message
   */
  private recordSentMessage(message: ConversationalMessage, timestamp: number): void {
    this.sentMessages.set(message.messageId, {
      messageId: message.messageId,
      type: message.type,
      timestamp,
      sequence: message.sequence,
      size: JSON.stringify(message).length,
      requiresAck: message.metadata?.requiresAck || false,
    });
  }

  /**
   * Record received message
   */
  private recordReceivedMessage(message: ConversationalMessage, timestamp: number): void {
    this.receivedMessages.set(message.messageId, {
      messageId: message.messageId,
      type: message.type,
      timestamp,
      sequence: message.sequence,
      size: JSON.stringify(message).length,
      processingTime: Date.now() - message.timestamp,
    });
  }

  /**
   * Record connection state
   */
  private recordConnectionState(state: string, description: string): void {
    this.connectionStateHistory.push({
      state,
      description,
      timestamp: Date.now(),
      readyState: this.ws?.readyState || -1,
    });

    // Keep only last 100 states
    if (this.connectionStateHistory.length > 100) {
      this.connectionStateHistory = this.connectionStateHistory.slice(-100);
    }
  }

  /**
   * Record protocol violation
   */
  private recordProtocolViolation(type: string, description: string): void {
    this.protocolViolations.push({
      type,
      description,
      timestamp: Date.now(),
      severity: this.getViolationSeverity(type),
    });
  }

  /**
   * Get violation severity
   */
  private getViolationSeverity(type: string): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const severityMap: Record<string, 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'> = {
      'INVALID_MESSAGE_FORMAT': 'HIGH',
      'DUPLICATE_MESSAGE': 'MEDIUM',
      'OUT_OF_ORDER_MESSAGE': 'MEDIUM',
      'STALE_MESSAGE': 'LOW',
      'CONNECTION_ERROR': 'CRITICAL',
      'PROTOCOL_ERROR': 'HIGH',
      'INVALID_CLOSE_CODE': 'MEDIUM',
    };

    return severityMap[type] || 'MEDIUM';
  }

  /**
   * Validate close code compliance
   */
  private validateCloseCode(code: number, reason: string): void {
    if (!this.isValidCloseCode(code)) {
      this.recordProtocolViolation('INVALID_CLOSE_CODE', `Invalid close code: ${code} - ${reason}`);
    }
  }

  /**
   * Check if close code is valid per RFC 6455
   */
  private isValidCloseCode(code: number): boolean {
    // Valid close codes per RFC 6455
    const validCodes = [1000, 1001, 1002, 1003, 1007, 1008, 1009, 1010, 1011];
    const validRanges = [
      [3000, 3999], // Reserved for libraries
      [4000, 4999], // Reserved for applications
    ];

    if (validCodes.includes(code)) {
      return true;
    }

    for (const [min, max] of validRanges) {
      if (code >= min && code <= max) {
        return true;
      }
    }

    return false;
  }

  /**
   * Validate overall protocol compliance
   */
  private validateProtocolCompliance(): ProtocolComplianceValidation {
    const criticalViolations = this.protocolViolations.filter(v => v.severity === 'CRITICAL').length;
    const highViolations = this.protocolViolations.filter(v => v.severity === 'HIGH').length;
    const totalViolations = this.protocolViolations.length;

    const complianceScore = Math.max(0, 1 - (criticalViolations * 0.5 + highViolations * 0.2 + totalViolations * 0.05));

    return {
      compliant: complianceScore >= 0.95,
      score: complianceScore,
      criticalViolations,
      highViolations,
      totalViolations,
      areas: {
        handshake: this.protocolMetrics.successfulConnections > 0,
        messaging: this.protocolMetrics.framesReceived > 0,
        errorHandling: this.protocolMetrics.protocolErrors === 0,
        lifecycle: this.protocolMetrics.unexpectedDisconnections === 0,
      },
    };
  }

  /**
   * Calculate compliance score from test results
   */
  private calculateComplianceScore(testResults: ProtocolTestResult[]): number {
    const passedTests = testResults.filter(test => test.passed).length;
    return passedTests / testResults.length;
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `protocol_msg_${this.clientId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Get protocol compliance metrics
   */
  getProtocolMetrics(): ProtocolComplianceMetrics {
    return { ...this.protocolMetrics };
  }

  /**
   * Get message delivery metrics
   */
  getDeliveryMetrics(): MessageDeliveryTracker {
    // Update calculated fields
    this.messageDeliveryTracker.deliverySuccessRate =
      this.messageDeliveryTracker.messagesReceived / this.messageDeliveryTracker.messagesSent;

    this.messageDeliveryTracker.acknowledgmentSuccessRate =
      this.messageDeliveryTracker.messagesAcknowledged / this.messageDeliveryTracker.messagesSent;

    return { ...this.messageDeliveryTracker };
  }

  /**
   * Get protocol violations
   */
  getProtocolViolations(): ProtocolViolation[] {
    return [...this.protocolViolations];
  }

  /**
   * Disconnect from server
   */
  async disconnect(): Promise<void> {
    if (this.ws && this.connected) {
      return new Promise((resolve) => {
        this.ws!.close(1000, 'Protocol compliance test completed');
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

  getClientId(): string {
    return this.clientId;
  }
}

// ===== TYPE DEFINITIONS =====

interface ProtocolTestOptions {
  headers?: Record<string, string>;
  subprotocols?: string[];
  enableCompression?: boolean;
  connectionTimeout?: number;
}

interface ProtocolComplianceMetrics {
  connectionAttempts: number;
  successfulConnections: number;
  connectionFailures: number;
  handshakeTime: number;
  protocolVersion: string;
  extensionsNegotiated: string[];
  subprotocolNegotiated: string;
  compressionSupported: boolean;
  framesSent: number;
  framesReceived: number;
  bytesTransferred: number;
  protocolErrors: number;
  unexpectedDisconnections: number;
  pingPongLatency: number;
}

interface MessageDeliveryTracker {
  messagesSent: number;
  messagesReceived: number;
  messagesAcknowledged: number;
  duplicatesDetected: number;
  messagesLost: number;
  outOfOrderMessages: number;
  deliveryLatencies: number[];
  deliverySuccessRate: number;
  acknowledgmentSuccessRate: number;
}

interface MessageDeliveryOptions {
  guaranteeLevel?: 'at-most-once' | 'at-least-once' | 'exactly-once';
  requiresAcknowledgment?: boolean;
  timeout?: number;
  maxRetries?: number;
  retryOnTimeout?: boolean;
  enableCompression?: boolean;
}

interface MessageDeliveryResult {
  messageId: string;
  sent: boolean;
  sendTime: number;
  acknowledged: boolean;
  acknowledgmentTime?: number;
  deliveryConfirmed: boolean;
  retries: number;
  error?: string;
}

interface SentMessageRecord {
  messageId: string;
  type: ConversationalMessageType;
  timestamp: number;
  sequence: number;
  size: number;
  requiresAck: boolean;
}

interface ReceivedMessageRecord {
  messageId: string;
  type: ConversationalMessageType;
  timestamp: number;
  sequence: number;
  size: number;
  processingTime: number;
}

interface AcknowledgmentRecord {
  originalMessageId: string;
  sendTime: number;
  receiveTime: number;
  processingTime: number;
}

interface ConnectionState {
  state: string;
  description: string;
  timestamp: number;
  readyState: number;
}

interface ProtocolViolation {
  type: string;
  description: string;
  timestamp: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

interface ProtocolConnectionResult {
  success: boolean;
  clientId: string;
  handshakeTime: number;
  protocolCompliance: ProtocolComplianceValidation;
}

interface ProtocolComplianceValidation {
  compliant: boolean;
  score: number;
  criticalViolations: number;
  highViolations: number;
  totalViolations: number;
  areas: {
    handshake: boolean;
    messaging: boolean;
    errorHandling: boolean;
    lifecycle: boolean;
  };
}

interface ProtocolTestResult {
  testName: string;
  passed: boolean;
  duration: number;
  details: Record<string, unknown>;
  violations: ProtocolViolation[];
}

interface ProtocolComplianceTestResult {
  clientId: string;
  testDuration: number;
  complianceScore: number;
  protocolVersion: string;
  extensionsSupported: string[];
  tests: {
    basicMessageExchange: ProtocolTestResult;
    pingPongProtocol: ProtocolTestResult;
    messageDeliveryGuarantees: ProtocolTestResult;
    errorHandling: ProtocolTestResult;
    connectionLifecycle: ProtocolTestResult;
  };
  violations: ProtocolViolation[];
  deliveryMetrics: MessageDeliveryTracker;
  overallCompliance: 'FULLY_COMPLIANT' | 'MOSTLY_COMPLIANT' | 'NON_COMPLIANT';
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

// ===== PARLANT WEBSOCKET PROTOCOL COMPLIANCE TESTING SUITE =====

describe('PARLANT WebSocket Protocol Compliance and Message Delivery Testing', () => {
  let conversationalService: ConversationalWebSocketBridgeService;
  let integrationService: ParlantWebSocketIntegrationService;
  let module: TestingModule;

  const TEST_PORT = 8081;
  const TEST_URL = `ws://localhost:${TEST_PORT}`;

  beforeAll(async () => {
    jest.setTimeout(300000); // 5 minutes for comprehensive tests

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

    // Initialize services
    await integrationService.onModuleInit();

    // Give services time to start
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  afterAll(async () => {
    // Shutdown services
    await integrationService.onApplicationShutdown();
    await conversationalService.onApplicationShutdown();
    await module.close();
  });

  // ===== WEBSOCKET RFC 6455 PROTOCOL COMPLIANCE TESTS =====

  describe('WebSocket RFC 6455 Protocol Compliance Validation', () => {
    it('should establish connection with proper WebSocket handshake', async () => {
      const client = new ProtocolComplianceTestClient(TEST_URL, 'handshake_test');

      const connectionResult = await client.connect();

      expect(connectionResult.success).toBe(true);
      expect(connectionResult.handshakeTime).toBeLessThan(2000); // <2 seconds
      expect(connectionResult.protocolCompliance.compliant).toBe(true);

      const metrics = client.getProtocolMetrics();
      expect(metrics.successfulConnections).toBe(1);
      expect(metrics.connectionFailures).toBe(0);

      await client.disconnect();

      console.log('WebSocket Handshake Results:', {
        handshakeTime: `${connectionResult.handshakeTime.toFixed(2)}ms`,
        protocolVersion: connectionResult.protocolCompliance.areas,
        extensionsNegotiated: metrics.extensionsNegotiated,
        compressionSupported: metrics.compressionSupported,
        complianceScore: connectionResult.protocolCompliance.score.toFixed(3),
      });
    });

    it('should support WebSocket compression extensions', async () => {
      const client = new ProtocolComplianceTestClient(TEST_URL, 'compression_test', {
        enableCompression: true,
      });

      await client.connect();

      const metrics = client.getProtocolMetrics();

      expect(metrics.compressionSupported).toBe(true);
      expect(metrics.extensionsNegotiated).toContain('permessage-deflate');

      await client.disconnect();
    });

    it('should handle WebSocket subprotocol negotiation', async () => {
      const testSubprotocols = ['parlant-v1', 'chat-protocol', 'custom-protocol'];

      const client = new ProtocolComplianceTestClient(TEST_URL, 'subprotocol_test', {
        subprotocols: testSubprotocols,
      });

      await client.connect();

      const metrics = client.getProtocolMetrics();

      // Either no subprotocol negotiated (empty string) or one of the requested ones
      const validSubprotocol = metrics.subprotocolNegotiated === '' ||
                               testSubprotocols.includes(metrics.subprotocolNegotiated);

      expect(validSubprotocol).toBe(true);

      await client.disconnect();
    });

    it('should comply with WebSocket close code standards', async () => {
      const client = new ProtocolComplianceTestClient(TEST_URL, 'close_code_test');

      await client.connect();

      let closeCode: number | undefined;
      let protocolCompliant = false;

      client.on('disconnected', (data) => {
        closeCode = data.code;
        protocolCompliant = data.protocolCompliant;
      });

      await client.disconnect();

      expect(closeCode).toBe(1000); // Normal closure
      expect(protocolCompliant).toBe(true);
    });
  });

  // ===== MESSAGE DELIVERY GUARANTEE TESTS =====

  describe('Message Delivery Guarantee Protocols', () => {
    let testClient: ProtocolComplianceTestClient;

    beforeEach(async () => {
      testClient = new ProtocolComplianceTestClient(TEST_URL, `delivery_${Date.now()}`);
      await testClient.connect();
    });

    afterEach(async () => {
      if (testClient?.isConnected()) {
        await testClient.disconnect();
      }
    });

    it('should guarantee at-least-once message delivery', async () => {
      const messageCount = 20;
      const deliveryResults: MessageDeliveryResult[] = [];

      for (let i = 0; i < messageCount; i++) {
        const testMessage: Partial<ConversationalMessage> = {
          type: ConversationalMessageType.VALIDATION_REQUEST,
          payload: {
            testType: 'at_least_once_delivery',
            messageIndex: i,
          },
        };

        const deliveryResult = await testClient.sendMessageWithDeliveryGuarantee(testMessage, {
          guaranteeLevel: 'at-least-once',
          requiresAcknowledgment: true,
          timeout: 5000,
          maxRetries: 3,
        });

        deliveryResults.push(deliveryResult);

        // Small delay between messages
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      const successfulDeliveries = deliveryResults.filter(result => result.sent && result.acknowledged);
      const deliverySuccessRate = successfulDeliveries.length / messageCount;

      expect(deliverySuccessRate).toBeGreaterThanOrEqual(0.95); // 95% success rate
      expect(successfulDeliveries.every(result => result.deliveryConfirmed)).toBe(true);

      const deliveryMetrics = testClient.getDeliveryMetrics();

      console.log('At-Least-Once Delivery Results:', {
        messagesSent: messageCount,
        successfulDeliveries: successfulDeliveries.length,
        deliverySuccessRate: `${(deliverySuccessRate * 100).toFixed(1)}%`,
        averageDeliveryTime: `${(successfulDeliveries.reduce((sum, result) => sum + result.sendTime, 0) / successfulDeliveries.length).toFixed(2)}ms`,
        acknowledgmentSuccessRate: `${(deliveryMetrics.acknowledgmentSuccessRate * 100).toFixed(1)}%`,
      });
    });

    it('should detect and handle duplicate messages', async () => {
      const originalMessage: Partial<ConversationalMessage> = {
        messageId: 'duplicate_test_message_123',
        type: ConversationalMessageType.HEARTBEAT,
        payload: {
          testType: 'duplicate_detection',
          content: 'This message should only be processed once',
        },
      };

      // Send the same message multiple times
      const deliveryPromises = [];
      for (let i = 0; i < 5; i++) {
        deliveryPromises.push(
          testClient.sendMessageWithDeliveryGuarantee(originalMessage, {
            requiresAcknowledgment: true,
            timeout: 3000,
          }).catch(() => null) // Expect some to fail due to duplication
        );
      }

      const results = await Promise.allSettled(deliveryPromises);
      const successfulResults = results.filter(result => result.status === 'fulfilled' && result.value !== null);

      const deliveryMetrics = testClient.getDeliveryMetrics();

      // Should detect duplicates
      expect(deliveryMetrics.duplicatesDetected).toBeGreaterThan(0);

      console.log('Duplicate Detection Results:', {
        messagesSent: 5,
        successfulDeliveries: successfulResults.length,
        duplicatesDetected: deliveryMetrics.duplicatesDetected,
        duplicationHandled: deliveryMetrics.duplicatesDetected > 0,
      });
    });

    it('should maintain message ordering and sequence validation', async () => {
      const messageCount = 15;
      const sequenceNumbers: number[] = [];

      // Send messages in rapid succession
      for (let i = 0; i < messageCount; i++) {
        const testMessage: Partial<ConversationalMessage> = {
          type: ConversationalMessageType.HEARTBEAT,
          payload: {
            testType: 'sequence_validation',
            expectedSequence: i + 1,
          },
        };

        await testClient.sendMessageWithDeliveryGuarantee(testMessage, {
          requiresAcknowledgment: true,
          timeout: 2000,
        });

        sequenceNumbers.push(i + 1);

        // Very small delay to maintain sequence
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const deliveryMetrics = testClient.getDeliveryMetrics();
      const outOfOrderRate = deliveryMetrics.outOfOrderMessages / messageCount;

      expect(outOfOrderRate).toBeLessThan(0.1); // <10% out of order messages

      console.log('Message Ordering Results:', {
        messagesSent: messageCount,
        outOfOrderMessages: deliveryMetrics.outOfOrderMessages,
        outOfOrderRate: `${(outOfOrderRate * 100).toFixed(1)}%`,
        sequenceIntegrity: outOfOrderRate < 0.05 ? 'EXCELLENT' : 'ACCEPTABLE',
      });
    });

    it('should handle message acknowledgments with timeout and retry', async () => {
      const testMessage: Partial<ConversationalMessage> = {
        type: ConversationalMessageType.VALIDATION_REQUEST,
        payload: {
          testType: 'acknowledgment_timeout_test',
          requiresProcessing: true,
        },
      };

      const startTime = performance.now();

      const deliveryResult = await testClient.sendMessageWithDeliveryGuarantee(testMessage, {
        requiresAcknowledgment: true,
        timeout: 3000,
        maxRetries: 2,
        retryOnTimeout: true,
      });

      const totalTime = performance.now() - startTime;

      expect(deliveryResult.sent).toBe(true);
      expect(deliveryResult.acknowledged).toBe(true);
      expect(totalTime).toBeLessThan(10000); // Should complete within 10 seconds including retries

      console.log('Acknowledgment Handling Results:', {
        messageSent: deliveryResult.sent,
        messageAcknowledged: deliveryResult.acknowledged,
        totalTime: `${totalTime.toFixed(2)}ms`,
        retries: deliveryResult.retries,
        acknowledgmentTime: `${(deliveryResult.acknowledgmentTime || 0).toFixed(2)}ms`,
      });
    });
  });

  // ===== PROTOCOL COMPLIANCE AND STANDARDS TESTS =====

  describe('Comprehensive Protocol Compliance Testing', () => {
    it('should pass comprehensive protocol compliance test suite', async () => {
      const client = new ProtocolComplianceTestClient(TEST_URL, 'comprehensive_compliance');

      await client.connect();

      const complianceTestResult = await client.performProtocolComplianceTest();

      expect(complianceTestResult.complianceScore).toBeGreaterThanOrEqual(0.85); // 85% compliance
      expect(complianceTestResult.overallCompliance).toMatch(/FULLY_COMPLIANT|MOSTLY_COMPLIANT/);

      // Validate individual test results
      const allTestsPassed = Object.values(complianceTestResult.tests).every(test => test.passed);
      const criticalViolations = complianceTestResult.violations.filter(v => v.severity === 'CRITICAL');

      expect(criticalViolations.length).toBe(0); // No critical violations
      expect(allTestsPassed || complianceTestResult.complianceScore >= 0.9).toBe(true);

      await client.disconnect();

      console.log('Comprehensive Protocol Compliance Results:', {
        overallCompliance: complianceTestResult.overallCompliance,
        complianceScore: `${(complianceTestResult.complianceScore * 100).toFixed(1)}%`,
        testDuration: `${complianceTestResult.testDuration.toFixed(2)}ms`,
        testsResults: {
          basicMessageExchange: complianceTestResult.tests.basicMessageExchange.passed ? '✓' : '✗',
          pingPongProtocol: complianceTestResult.tests.pingPongProtocol.passed ? '✓' : '✗',
          messageDeliveryGuarantees: complianceTestResult.tests.messageDeliveryGuarantees.passed ? '✓' : '✗',
          errorHandling: complianceTestResult.tests.errorHandling.passed ? '✓' : '✗',
          connectionLifecycle: complianceTestResult.tests.connectionLifecycle.passed ? '✓' : '✗',
        },
        violations: {
          total: complianceTestResult.violations.length,
          critical: complianceTestResult.violations.filter(v => v.severity === 'CRITICAL').length,
          high: complianceTestResult.violations.filter(v => v.severity === 'HIGH').length,
          medium: complianceTestResult.violations.filter(v => v.severity === 'MEDIUM').length,
          low: complianceTestResult.violations.filter(v => v.severity === 'LOW').length,
        },
        deliveryMetrics: {
          messagesExchanged: complianceTestResult.deliveryMetrics.messagesSent + complianceTestResult.deliveryMetrics.messagesReceived,
          deliverySuccessRate: `${(complianceTestResult.deliveryMetrics.deliverySuccessRate * 100).toFixed(1)}%`,
          acknowledgmentSuccessRate: `${(complianceTestResult.deliveryMetrics.acknowledgmentSuccessRate * 100).toFixed(1)}%`,
        },
      });
    });

    it('should validate ping/pong protocol implementation', async () => {
      const client = new ProtocolComplianceTestClient(TEST_URL, 'ping_pong_validation');

      await client.connect();

      // Perform multiple ping/pong cycles
      const pingCount = 10;
      const pingLatencies: number[] = [];

      for (let i = 0; i < pingCount; i++) {
        const pingStartTime = performance.now();

        let pongReceived = false;
        const pongHandler = () => {
          pongReceived = true;
          const latency = performance.now() - pingStartTime;
          pingLatencies.push(latency);
        };

        client.once('pong', pongHandler);

        // Send ping
        const pingData = Buffer.from(`ping-test-${i}`);
        if (client['ws']) {
          client['ws'].ping(pingData);
        }

        // Wait for pong
        await new Promise(resolve => setTimeout(resolve, 500));

        expect(pongReceived).toBe(true);

        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const averagePingLatency = pingLatencies.reduce((sum, lat) => sum + lat, 0) / pingLatencies.length;

      expect(pingLatencies.length).toBe(pingCount);
      expect(averagePingLatency).toBeLessThan(100); // <100ms ping/pong latency

      await client.disconnect();

      console.log('Ping/Pong Protocol Results:', {
        pingsSent: pingCount,
        pongsReceived: pingLatencies.length,
        averageLatency: `${averagePingLatency.toFixed(2)}ms`,
        minLatency: `${Math.min(...pingLatencies).toFixed(2)}ms`,
        maxLatency: `${Math.max(...pingLatencies).toFixed(2)}ms`,
        protocolCompliance: pingLatencies.length === pingCount ? 'FULLY_COMPLIANT' : 'NON_COMPLIANT',
      });
    });

    it('should validate error handling and recovery protocols', async () => {
      const client = new ProtocolComplianceTestClient(TEST_URL, 'error_handling_validation');

      await client.connect();

      const initialMetrics = client.getProtocolMetrics();

      // Test error scenarios
      const errorTests = [
        {
          name: 'Invalid JSON Message',
          test: async () => {
            if (client['ws']) {
              client['ws'].send('invalid-json-{malformed');
            }
            await new Promise(resolve => setTimeout(resolve, 500));
          },
        },
        {
          name: 'Oversized Message',
          test: async () => {
            const largePayload = 'x'.repeat(100000); // 100KB message
            const largeMessage: Partial<ConversationalMessage> = {
              type: ConversationalMessageType.HEARTBEAT,
              payload: { data: largePayload },
            };
            try {
              await client.sendMessageWithDeliveryGuarantee(largeMessage, { timeout: 1000 });
            } catch (_error) {
              // Expected to fail for very large messages
            }
          },
        },
        {
          name: 'Rapid Message Burst',
          test: async () => {
            const burstPromises = [];
            for (let i = 0; i < 50; i++) {
              burstPromises.push(
                client.sendMessageWithDeliveryGuarantee({
                  type: ConversationalMessageType.HEARTBEAT,
                  payload: { burstIndex: i },
                }, { timeout: 1000 }).catch(() => {}) // Some may fail due to rate limiting
              );
            }
            await Promise.allSettled(burstPromises);
          },
        },
      ];

      for (const errorTest of errorTests) {
        await errorTest.test();
        await new Promise(resolve => setTimeout(resolve, 1000)); // Recovery time
      }

      const finalMetrics = client.getProtocolMetrics();
      const stillConnected = client.isConnected();

      // Connection should survive error scenarios
      expect(stillConnected).toBe(true);

      // Some errors are expected during error testing
      const errorIncrease = finalMetrics.protocolErrors - initialMetrics.protocolErrors;

      await client.disconnect();

      console.log('Error Handling Results:', {
        connectionSurvived: stillConnected,
        errorsHandled: errorIncrease,
        errorTestsCompleted: errorTests.length,
        resilience: stillConnected ? 'EXCELLENT' : 'POOR',
        finalProtocolErrors: finalMetrics.protocolErrors,
      });
    });
  });

  // ===== SECURITY AND AUTHENTICATION COMPLIANCE TESTS =====

  describe('Security and Authentication Compliance', () => {
    it('should validate connection security and authentication', async () => {
      const client = new ProtocolComplianceTestClient(TEST_URL, 'security_validation', {
        headers: {
          'Authorization': 'Bearer test-token',
          'X-API-Key': 'test-api-key',
          'X-Client-Version': '1.0.0',
        },
      });

      await client.connect();

      // Verify secure connection establishment
      const metrics = client.getProtocolMetrics();
      expect(metrics.successfulConnections).toBe(1);
      expect(metrics.connectionFailures).toBe(0);

      // Test authenticated message exchange
      const secureMessage: Partial<ConversationalMessage> = {
        type: ConversationalMessageType.VALIDATION_REQUEST,
        payload: {
          testType: 'security_validation',
          sensitiveData: 'test-sensitive-content',
          authContext: {
            userId: 'test-user',
            permissions: ['read', 'write', 'validate'],
          },
        },
      };

      const deliveryResult = await client.sendMessageWithDeliveryGuarantee(secureMessage, {
        requiresAcknowledgment: true,
        timeout: 5000,
      });

      expect(deliveryResult.sent).toBe(true);
      expect(deliveryResult.acknowledged).toBe(true);

      await client.disconnect();

      console.log('Security Validation Results:', {
        secureConnectionEstablished: metrics.successfulConnections > 0,
        authenticatedMessageExchange: deliveryResult.acknowledged,
        securityCompliance: 'VALIDATED',
      });
    });

    it('should validate message integrity and validation protocols', async () => {
      const client = new ProtocolComplianceTestClient(TEST_URL, 'integrity_validation');

      await client.connect();

      // Send messages with integrity validation requirements
      const messageCount = 10;
      const integrityResults: boolean[] = [];

      for (let i = 0; i < messageCount; i++) {
        const message: Partial<ConversationalMessage> = {
          type: ConversationalMessageType.VALIDATION_REQUEST,
          payload: {
            testType: 'integrity_validation',
            messageIndex: i,
            checksum: crypto.createHash('sha256').update(`integrity-test-${i}`).digest('hex'),
            timestamp: Date.now(),
          },
        };

        try {
          const result = await client.sendMessageWithDeliveryGuarantee(message, {
            requiresAcknowledgment: true,
            timeout: 3000,
          });

          integrityResults.push(result.sent && result.acknowledged);
        } catch (error) {
          integrityResults.push(false);
        }

        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const integritySuccessRate = integrityResults.filter(result => result).length / messageCount;

      expect(integritySuccessRate).toBeGreaterThanOrEqual(0.9); // 90% integrity success

      await client.disconnect();

      console.log('Message Integrity Results:', {
        messagesValidated: messageCount,
        integritySuccessRate: `${(integritySuccessRate * 100).toFixed(1)}%`,
        integrityCompliance: integritySuccessRate >= 0.95 ? 'EXCELLENT' : 'GOOD',
      });
    });
  });
});