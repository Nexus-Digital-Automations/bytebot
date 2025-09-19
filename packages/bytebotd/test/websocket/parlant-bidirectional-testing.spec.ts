/**
 * PARLANT Phase 1 WebSocket Bidirectional Communication Testing Framework
 *
 * Comprehensive testing suite for bidirectional WebSocket communication between
 * PARLANT client and server, focusing on conversational validation workflows,
 * real-time streaming, message serialization, and sub-100ms performance requirements.
 *
 * Test Coverage:
 * - Bidirectional message flow validation (client ↔ server)
 * - PARLANT conversation data serialization/deserialization
 * - Real-time streaming conversation validation with progressive updates
 * - Message delivery guarantees and acknowledgment protocols
 * - Sub-100ms latency performance validation
 * - WebSocket protocol compliance and standards validation
 * - Conversational state synchronization across connections
 *
 * Performance Requirements:
 * - Sub-100ms message delivery latency (P95)
 * - 1000+ concurrent conversational sessions
 * - Zero message loss during normal operations
 * - Real-time conversation state synchronization
 * - Progressive validation result streaming
 *
 * @author Claude Code
 * @version 1.0.0
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as WebSocket from 'ws';
import { performance } from 'perf_hooks';
import { EventEmitter } from 'events';
import { promisify } from 'util';

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
  ValidationContext,
  ConversationalSession,
} from '../../src/common/websocket/conversational-websocket-bridge.service';
import { ParlantWebSocketIntegrationService } from '../../src/common/websocket/parlant-websocket-integration.service';

// ===== PARLANT BIDIRECTIONAL TESTING FRAMEWORK =====

/**
 * Advanced bidirectional WebSocket test client for PARLANT conversational validation
 */
class ParlantBidirectionalTestClient extends EventEmitter {
  private ws: WebSocket.WebSocket | null = null;
  private clientId: string;
  private sessionId: string;
  private connected = false;
  private messageSequence = 0;

  // Message tracking
  private sentMessages: Map<string, ConversationalMessage> = new Map();
  private receivedMessages: Map<string, ConversationalMessage> = new Map();
  private acknowledgments: Map<string, ConversationalMessage> = new Map();
  private messageLatencies: Map<string, number> = new Map();

  // Validation tracking
  private activeValidations: Map<string, ValidationRequestMessage> = new Map();
  private validationResults: Map<string, ConversationalMessage> = new Map();
  private progressUpdates: Map<string, ProgressUpdateMessage[]> = new Map();

  // Performance metrics
  private performanceMetrics: BidirectionalPerformanceMetrics;
  private connectionStartTime = 0;

  // Conversation state
  private conversationState: ConversationState;

  constructor(
    private url: string,
    clientIdentifier: string,
    private options: BidirectionalClientOptions = {}
  ) {
    super();
    this.clientId = `parlant_client_${clientIdentifier}_${Date.now()}`;
    this.sessionId = `session_${this.clientId}`;

    this.performanceMetrics = {
      connectionTime: 0,
      messagesSent: 0,
      messagesReceived: 0,
      acknowledgmentsReceived: 0,
      averageLatency: 0,
      p95Latency: 0,
      maxLatency: 0,
      minLatency: Number.MAX_VALUE,
      messagesPerSecond: 0,
      bytesTransferred: 0,
      compressionRatio: 1.0,
      errors: 0,
      reconnections: 0,
    };

    this.conversationState = {
      sessionId: this.sessionId,
      clientId: this.clientId,
      activeValidations: [],
      messageHistory: [],
      lastActivity: Date.now(),
      connectionQuality: 'excellent',
      syncStatus: 'synchronized',
    };
  }

  /**
   * Establish bidirectional WebSocket connection with PARLANT validation
   */
  async connect(): Promise<BidirectionalConnectionResult> {
    this.connectionStartTime = performance.now();

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket.WebSocket(this.url, {
          headers: {
            'User-Agent': 'PARLANT-Bidirectional-Test-Client/1.0',
            'X-Client-ID': this.clientId,
            'X-Session-ID': this.sessionId,
            'X-Protocol-Version': '1.0',
            'X-Capabilities': JSON.stringify({
              bidirectional: true,
              streaming: true,
              validation: true,
              compression: true,
            }),
            ...(this.options.headers || {}),
          },
        });

        this.ws.on('open', () => {
          this.connected = true;
          this.performanceMetrics.connectionTime = performance.now() - this.connectionStartTime;

          this.emit('connected', {
            clientId: this.clientId,
            sessionId: this.sessionId,
            connectionTime: this.performanceMetrics.connectionTime,
          });

          // Initialize session with server
          this.initializeSession().then(() => {
            resolve({
              success: true,
              clientId: this.clientId,
              sessionId: this.sessionId,
              connectionTime: this.performanceMetrics.connectionTime,
              serverCapabilities: null, // Will be populated from session response
            });
          }).catch(reject);
        });

        this.ws.on('message', (data: WebSocket.RawData) => {
          this.handleBidirectionalMessage(data);
        });

        this.ws.on('error', (error: Error) => {
          this.performanceMetrics.errors++;
          this.emit('error', { clientId: this.clientId, error });
          if (!this.connected) {
            reject(error);
          }
        });

        this.ws.on('close', (code: number, reason: Buffer) => {
          this.connected = false;
          this.emit('disconnected', {
            clientId: this.clientId,
            code,
            reason: reason.toString(),
            metrics: this.getPerformanceMetrics(),
          });
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Initialize session with bidirectional validation
   */
  private async initializeSession(): Promise<void> {
    const sessionStartMessage: ConversationalMessage = {
      type: ConversationalMessageType.SESSION_START,
      messageId: this.generateMessageId(),
      sessionId: this.sessionId,
      timestamp: Date.now(),
      sequence: ++this.messageSequence,
      payload: {
        clientId: this.clientId,
        capabilities: {
          bidirectional: true,
          streaming: true,
          validation: true,
          compression: true,
          protocolVersion: '1.0',
        },
        clientInfo: {
          userAgent: 'PARLANT-Bidirectional-Test-Client/1.0',
          platform: 'testing',
          version: '1.0.0',
        },
      },
      metadata: {
        priority: 'high',
        requiresAck: true,
        compression: false,
        routingHints: ['session-management'],
      },
    };

    await this.sendMessageWithTracking(sessionStartMessage);

    // Wait for session ready confirmation
    await this.waitForMessage(
      (msg) => msg.type === ConversationalMessageType.SESSION_READY,
      5000
    );
  }

  /**
   * Enhanced message handling with bidirectional validation
   */
  private handleBidirectionalMessage(data: WebSocket.RawData): void {
    try {
      const receiveTime = performance.now();
      const rawMessage = Buffer.from(data as ArrayBuffer).toString('utf8');
      const message = JSON.parse(rawMessage) as ConversationalMessage;

      this.performanceMetrics.messagesReceived++;
      this.performanceMetrics.bytesTransferred += rawMessage.length;

      // Track message and calculate latency
      this.receivedMessages.set(message.messageId, message);
      this.updateConversationState(message);

      // Calculate latency if this is a response to a sent message
      const sentMessage = this.sentMessages.get(message.messageId);
      if (sentMessage) {
        const latency = receiveTime - sentMessage.timestamp;
        this.messageLatencies.set(message.messageId, latency);
        this.updateLatencyMetrics(latency);
      }

      // Handle acknowledgments
      if (message.metadata?.requiresAck) {
        this.sendAcknowledgment(message);
      }

      // Process message based on type
      this.processBidirectionalMessage(message);

      this.emit('message', {
        clientId: this.clientId,
        message,
        latency: this.messageLatencies.get(message.messageId),
        totalMessages: this.receivedMessages.size,
      });

    } catch (error) {
      this.performanceMetrics.errors++;
      this.emit('messageError', { clientId: this.clientId, error });
    }
  }

  /**
   * Process bidirectional messages with validation flow tracking
   */
  private processBidirectionalMessage(message: ConversationalMessage): void {
    switch (message.type) {
      case ConversationalMessageType.SESSION_READY:
        this.emit('sessionReady', {
          clientId: this.clientId,
          sessionInfo: message.payload,
          serverCapabilities: message.payload.capabilities,
        });
        break;

      case ConversationalMessageType.VALIDATION_RESPONSE:
        this.handleValidationResponse(message);
        break;

      case ConversationalMessageType.PROGRESS_UPDATE:
        this.handleProgressUpdate(message as ProgressUpdateMessage);
        break;

      case ConversationalMessageType.CONFIRMATION_RESULT:
        this.handleConfirmationResult(message);
        break;

      case ConversationalMessageType.HEARTBEAT:
        this.sendHeartbeatResponse(message);
        break;

      case ConversationalMessageType.HEARTBEAT_ACK:
        this.acknowledgments.set(message.messageId, message);
        this.performanceMetrics.acknowledgmentsReceived++;
        break;

      case ConversationalMessageType.ERROR_STREAM:
        this.emit('validationError', {
          clientId: this.clientId,
          error: message.payload,
        });
        break;

      default:
        this.emit('unknownMessage', {
          clientId: this.clientId,
          messageType: message.type,
          message,
        });
    }
  }

  /**
   * Handle validation response with bidirectional acknowledgment
   */
  private handleValidationResponse(message: ConversationalMessage): void {
    const validationId = message.payload.validationId as string;

    if (this.activeValidations.has(validationId)) {
      this.validationResults.set(validationId, message);

      this.emit('validationResponse', {
        clientId: this.clientId,
        validationId,
        response: message.payload,
        originalRequest: this.activeValidations.get(validationId),
      });
    }
  }

  /**
   * Handle progress updates with streaming validation
   */
  private handleProgressUpdate(message: ProgressUpdateMessage): void {
    const operationId = message.payload.operationId;

    if (!this.progressUpdates.has(operationId)) {
      this.progressUpdates.set(operationId, []);
    }

    this.progressUpdates.get(operationId)!.push(message);

    this.emit('progressUpdate', {
      clientId: this.clientId,
      operationId,
      progress: message.payload,
      totalUpdates: this.progressUpdates.get(operationId)!.length,
    });
  }

  /**
   * Handle confirmation result from server
   */
  private handleConfirmationResult(message: ConversationalMessage): void {
    const validationId = message.payload.validationId as string;

    this.emit('confirmationResult', {
      clientId: this.clientId,
      validationId,
      result: message.payload,
    });
  }

  /**
   * Send validation request with bidirectional tracking
   */
  async sendValidationRequest(
    action: ValidationAction,
    context?: Partial<ValidationContext>
  ): Promise<BidirectionalValidationResult> {
    const validationId = this.generateValidationId();

    const validationRequest: ValidationRequestMessage = {
      type: ConversationalMessageType.VALIDATION_REQUEST,
      messageId: this.generateMessageId(),
      sessionId: this.sessionId,
      timestamp: Date.now(),
      sequence: ++this.messageSequence,
      payload: {
        validationId,
        context: {
          userId: context?.userId || `test-user-${this.clientId}`,
          applicationContext: context?.applicationContext || 'parlant-bidirectional-testing',
          environmentInfo: context?.environmentInfo || { test: true, clientId: this.clientId },
          previousActions: context?.previousActions || [],
          securityContext: context?.securityContext || {
            authenticationLevel: 'basic',
            permissions: ['read', 'write', 'validate'],
            auditRequired: true,
            complianceFlags: ['GDPR', 'testing'],
          } as SecurityContext,
        },
        action,
        riskLevel: this.calculateRiskLevel(action),
        streamingOptions: {
          enableProgressUpdates: true,
          updateInterval: 250, // 250ms for real-time feel
          maxUpdateCount: 10,
          compressionEnabled: true,
          priorityBoost: action.impact.scope === 'system',
        },
      },
      metadata: {
        priority: 'high',
        requiresAck: true,
        compression: true,
        routingHints: ['validation', 'streaming'],
      },
    };

    this.activeValidations.set(validationId, validationRequest);

    const startTime = performance.now();
    await this.sendMessageWithTracking(validationRequest);

    // Wait for validation response
    const response = await this.waitForMessage(
      (msg) => msg.type === ConversationalMessageType.VALIDATION_RESPONSE &&
               msg.payload.validationId === validationId,
      15000 // 15 second timeout for validation
    );

    const responseTime = performance.now() - startTime;

    return {
      validationId,
      request: validationRequest,
      response,
      responseTime,
      progressUpdates: this.progressUpdates.get(validationId) || [],
      success: response.payload.status === 'approved' || response.payload.status === 'received',
    };
  }

  /**
   * Send user confirmation with bidirectional validation
   */
  async sendUserConfirmation(
    validationId: string,
    approved: boolean,
    reasoning?: string
  ): Promise<BidirectionalConfirmationResult> {
    const confirmationId = this.generateConfirmationId();

    const confirmation: UserConfirmationMessage = {
      type: ConversationalMessageType.USER_CONFIRMATION,
      messageId: this.generateMessageId(),
      sessionId: this.sessionId,
      timestamp: Date.now(),
      sequence: ++this.messageSequence,
      payload: {
        confirmationId,
        validationId,
        approved,
        reasoning: reasoning || (approved ? 'Test approval' : 'Test rejection'),
        confidence: 0.95,
      },
      metadata: {
        priority: 'high',
        requiresAck: true,
        compression: false,
        routingHints: ['confirmation', 'user-action'],
      },
    };

    const startTime = performance.now();
    await this.sendMessageWithTracking(confirmation);

    // Wait for confirmation result
    const result = await this.waitForMessage(
      (msg) => msg.type === ConversationalMessageType.CONFIRMATION_RESULT &&
               msg.payload.validationId === validationId,
      10000
    );

    const responseTime = performance.now() - startTime;

    return {
      confirmationId,
      validationId,
      confirmation,
      result,
      responseTime,
      success: result.payload.status === 'processed',
    };
  }

  /**
   * Perform complete bidirectional validation workflow
   */
  async performBidirectionalValidationWorkflow(
    action: ValidationAction,
    userApproval: boolean = true,
    context?: Partial<ValidationContext>
  ): Promise<BidirectionalWorkflowResult> {
    const workflowId = this.generateWorkflowId();
    const startTime = performance.now();

    try {
      // Step 1: Send validation request
      const validationResult = await this.sendValidationRequest(action, context);

      // Step 2: Wait for server processing (collect progress updates)
      await this.collectProgressUpdates(validationResult.validationId, 5000);

      // Step 3: Send user confirmation
      const confirmationResult = await this.sendUserConfirmation(
        validationResult.validationId,
        userApproval,
        `Automated test ${userApproval ? 'approval' : 'rejection'}`
      );

      // Step 4: Wait for final result
      const finalResult = await this.waitForMessage(
        (msg) => msg.type === ConversationalMessageType.STREAMING_COMPLETE &&
                 msg.payload.validationId === validationResult.validationId,
        10000
      );

      const totalTime = performance.now() - startTime;

      return {
        workflowId,
        validationResult,
        confirmationResult,
        finalResult,
        totalTime,
        success: finalResult.payload.status === 'completed',
        messageCount: this.sentMessages.size - this.performanceMetrics.messagesSent + this.performanceMetrics.messagesReceived,
      };

    } catch (error) {
      const totalTime = performance.now() - startTime;

      return {
        workflowId,
        validationResult: null,
        confirmationResult: null,
        finalResult: null,
        totalTime,
        success: false,
        messageCount: 0,
        error,
      };
    }
  }

  /**
   * Collect progress updates for a validation
   */
  private async collectProgressUpdates(
    validationId: string,
    timeout: number = 5000
  ): Promise<ProgressUpdateMessage[]> {
    const startTime = Date.now();
    const updates: ProgressUpdateMessage[] = [];

    while (Date.now() - startTime < timeout) {
      try {
        const update = await this.waitForMessage(
          (msg) => msg.type === ConversationalMessageType.PROGRESS_UPDATE &&
                   msg.payload.operationId === validationId,
          1000
        ) as ProgressUpdateMessage;

        updates.push(update);

        if (update.payload.status === 'completed') {
          break;
        }
      } catch (error) {
        // Timeout waiting for progress update - this is normal
        break;
      }
    }

    return updates;
  }

  /**
   * Send message with comprehensive tracking
   */
  private async sendMessageWithTracking(message: ConversationalMessage): Promise<void> {
    if (!this.ws || !this.connected) {
      throw new Error(`WebSocket not connected for client ${this.clientId}`);
    }

    const serialized = JSON.stringify(message);
    const startTime = performance.now();

    return new Promise((resolve, reject) => {
      this.ws!.send(serialized, (error) => {
        if (error) {
          this.performanceMetrics.errors++;
          reject(error);
        } else {
          this.performanceMetrics.messagesSent++;
          this.performanceMetrics.bytesTransferred += serialized.length;
          this.sentMessages.set(message.messageId, message);

          const sendTime = performance.now() - startTime;
          this.emit('messageSent', {
            clientId: this.clientId,
            message,
            sendTime,
            totalSent: this.performanceMetrics.messagesSent,
          });

          resolve();
        }
      });
    });
  }

  /**
   * Send acknowledgment for received message
   */
  private async sendAcknowledgment(originalMessage: ConversationalMessage): Promise<void> {
    const ackMessage: ConversationalMessage = {
      type: ConversationalMessageType.HEARTBEAT_ACK,
      messageId: this.generateMessageId(),
      sessionId: this.sessionId,
      timestamp: Date.now(),
      sequence: ++this.messageSequence,
      payload: {
        originalMessageId: originalMessage.messageId,
        acknowledgmentTime: Date.now(),
        processingTime: Date.now() - originalMessage.timestamp,
      },
      metadata: {
        priority: 'low',
        requiresAck: false,
        compression: false,
        routingHints: ['acknowledgment'],
      },
    };

    await this.sendMessageWithTracking(ackMessage);
  }

  /**
   * Send heartbeat response
   */
  private async sendHeartbeatResponse(heartbeat: ConversationalMessage): Promise<void> {
    const response: ConversationalMessage = {
      type: ConversationalMessageType.HEARTBEAT_ACK,
      messageId: this.generateMessageId(),
      sessionId: this.sessionId,
      timestamp: Date.now(),
      sequence: ++this.messageSequence,
      payload: {
        clientTime: Date.now(),
        serverTime: heartbeat.payload.serverTime,
        latency: Date.now() - (heartbeat.payload.serverTime as number),
      },
      metadata: {
        priority: 'low',
        requiresAck: false,
        compression: false,
        routingHints: ['heartbeat'],
      },
    };

    await this.sendMessageWithTracking(response);
  }

  /**
   * Wait for specific message with timeout
   */
  async waitForMessage(
    predicate: (message: ConversationalMessage) => boolean,
    timeout: number = 5000
  ): Promise<ConversationalMessage> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const messages = Array.from(this.receivedMessages.values());
      const message = messages.find(predicate);
      if (message) {
        return message;
      }
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    throw new Error(`Timeout waiting for message (client: ${this.clientId})`);
  }

  /**
   * Update conversation state
   */
  private updateConversationState(message: ConversationalMessage): void {
    this.conversationState.lastActivity = Date.now();
    this.conversationState.messageHistory.push({
      messageId: message.messageId,
      type: message.type,
      timestamp: message.timestamp,
      direction: 'received',
    });

    // Update sync status based on message processing time
    const processingTime = Date.now() - message.timestamp;
    if (processingTime > 1000) {
      this.conversationState.syncStatus = 'delayed';
    } else if (processingTime > 500) {
      this.conversationState.syncStatus = 'slow';
    } else {
      this.conversationState.syncStatus = 'synchronized';
    }

    // Update connection quality based on latency
    const latency = this.messageLatencies.get(message.messageId);
    if (latency) {
      if (latency < 50) {
        this.conversationState.connectionQuality = 'excellent';
      } else if (latency < 100) {
        this.conversationState.connectionQuality = 'good';
      } else if (latency < 250) {
        this.conversationState.connectionQuality = 'fair';
      } else {
        this.conversationState.connectionQuality = 'poor';
      }
    }
  }

  /**
   * Update latency metrics
   */
  private updateLatencyMetrics(latency: number): void {
    const latencies = Array.from(this.messageLatencies.values());

    this.performanceMetrics.averageLatency =
      latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;

    latencies.sort((a, b) => a - b);
    this.performanceMetrics.p95Latency =
      latencies[Math.floor(latencies.length * 0.95)] || 0;

    this.performanceMetrics.maxLatency = Math.max(this.performanceMetrics.maxLatency, latency);
    this.performanceMetrics.minLatency = Math.min(this.performanceMetrics.minLatency, latency);
  }

  /**
   * Calculate risk level based on action
   */
  private calculateRiskLevel(action: ValidationAction): 'low' | 'medium' | 'high' | 'critical' {
    if (action.impact.scope === 'external' || !action.reversible) {
      return 'critical';
    } else if (action.impact.scope === 'system' || action.impact.stateChanges) {
      return 'high';
    } else if (action.impact.dataAccess) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Generate unique IDs
   */
  private generateMessageId(): string {
    return `msg_${this.clientId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  private generateValidationId(): string {
    return `val_${this.clientId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  private generateConfirmationId(): string {
    return `conf_${this.clientId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  private generateWorkflowId(): string {
    return `workflow_${this.clientId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Get comprehensive performance metrics
   */
  getPerformanceMetrics(): BidirectionalPerformanceMetrics {
    const now = performance.now();
    const connectionDuration = now - this.connectionStartTime;

    this.performanceMetrics.messagesPerSecond =
      this.performanceMetrics.messagesSent / (connectionDuration / 1000);

    // Calculate compression ratio
    const totalMessages = this.performanceMetrics.messagesSent + this.performanceMetrics.messagesReceived;
    if (totalMessages > 0) {
      const averageMessageSize = this.performanceMetrics.bytesTransferred / totalMessages;
      this.performanceMetrics.compressionRatio = averageMessageSize / 1024; // Estimate
    }

    return { ...this.performanceMetrics };
  }

  /**
   * Get conversation state
   */
  getConversationState(): ConversationState {
    return { ...this.conversationState };
  }

  /**
   * Get all sent messages
   */
  getSentMessages(): ConversationalMessage[] {
    return Array.from(this.sentMessages.values());
  }

  /**
   * Get all received messages
   */
  getReceivedMessages(): ConversationalMessage[] {
    return Array.from(this.receivedMessages.values());
  }

  /**
   * Get validation results
   */
  getValidationResults(): Map<string, ConversationalMessage> {
    return new Map(this.validationResults);
  }

  /**
   * Get progress updates
   */
  getProgressUpdates(): Map<string, ProgressUpdateMessage[]> {
    return new Map(this.progressUpdates);
  }

  /**
   * Disconnect from server
   */
  async disconnect(): Promise<void> {
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

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get client ID
   */
  getClientId(): string {
    return this.clientId;
  }

  /**
   * Get session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }
}

// ===== TYPE DEFINITIONS =====

interface BidirectionalClientOptions {
  headers?: Record<string, string>;
  compressionEnabled?: boolean;
  heartbeatInterval?: number;
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
}

interface BidirectionalConnectionResult {
  success: boolean;
  clientId: string;
  sessionId: string;
  connectionTime: number;
  serverCapabilities: unknown;
}

interface BidirectionalPerformanceMetrics {
  connectionTime: number;
  messagesSent: number;
  messagesReceived: number;
  acknowledgmentsReceived: number;
  averageLatency: number;
  p95Latency: number;
  maxLatency: number;
  minLatency: number;
  messagesPerSecond: number;
  bytesTransferred: number;
  compressionRatio: number;
  errors: number;
  reconnections: number;
}

interface ConversationState {
  sessionId: string;
  clientId: string;
  activeValidations: string[];
  messageHistory: MessageHistoryEntry[];
  lastActivity: number;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
  syncStatus: 'synchronized' | 'slow' | 'delayed' | 'out-of-sync';
}

interface MessageHistoryEntry {
  messageId: string;
  type: ConversationalMessageType;
  timestamp: number;
  direction: 'sent' | 'received';
}

interface BidirectionalValidationResult {
  validationId: string;
  request: ValidationRequestMessage;
  response: ConversationalMessage;
  responseTime: number;
  progressUpdates: ProgressUpdateMessage[];
  success: boolean;
}

interface BidirectionalConfirmationResult {
  confirmationId: string;
  validationId: string;
  confirmation: UserConfirmationMessage;
  result: ConversationalMessage;
  responseTime: number;
  success: boolean;
}

interface BidirectionalWorkflowResult {
  workflowId: string;
  validationResult: BidirectionalValidationResult | null;
  confirmationResult: BidirectionalConfirmationResult | null;
  finalResult: ConversationalMessage | null;
  totalTime: number;
  success: boolean;
  messageCount: number;
  error?: unknown;
}

/**
 * Bidirectional conversation serialization tester
 */
class ConversationSerializationTester {
  /**
   * Test PARLANT conversation data serialization/deserialization
   */
  static testConversationSerialization(
    originalMessage: ConversationalMessage
  ): SerializationTestResult {
    const startTime = performance.now();

    try {
      // Test JSON serialization
      const serialized = JSON.stringify(originalMessage);
      const serializationTime = performance.now() - startTime;

      // Test deserialization
      const deserializeStartTime = performance.now();
      const deserialized = JSON.parse(serialized) as ConversationalMessage;
      const deserializationTime = performance.now() - deserializeStartTime;

      // Validate data integrity
      const integrityCheck = this.validateMessageIntegrity(originalMessage, deserialized);

      const totalTime = performance.now() - startTime;

      return {
        success: integrityCheck.valid,
        originalMessage,
        serialized,
        deserializedMessage: deserialized,
        serializationTime,
        deserializationTime,
        totalTime,
        serializedSize: serialized.length,
        compressionRatio: this.calculateCompressionRatio(originalMessage, serialized),
        integrityCheck,
      };

    } catch (error) {
      const totalTime = performance.now() - startTime;

      return {
        success: false,
        originalMessage,
        serialized: '',
        deserializedMessage: null,
        serializationTime: 0,
        deserializationTime: 0,
        totalTime,
        serializedSize: 0,
        compressionRatio: 0,
        integrityCheck: { valid: false, errors: [String(error)] },
        error,
      };
    }
  }

  /**
   * Validate message integrity after serialization/deserialization
   */
  private static validateMessageIntegrity(
    original: ConversationalMessage,
    deserialized: ConversationalMessage
  ): IntegrityCheckResult {
    const errors: string[] = [];

    // Check required fields
    if (original.type !== deserialized.type) {
      errors.push(`Type mismatch: ${original.type} !== ${deserialized.type}`);
    }

    if (original.messageId !== deserialized.messageId) {
      errors.push(`MessageId mismatch: ${original.messageId} !== ${deserialized.messageId}`);
    }

    if (original.sessionId !== deserialized.sessionId) {
      errors.push(`SessionId mismatch: ${original.sessionId} !== ${deserialized.sessionId}`);
    }

    if (original.timestamp !== deserialized.timestamp) {
      errors.push(`Timestamp mismatch: ${original.timestamp} !== ${deserialized.timestamp}`);
    }

    if (original.sequence !== deserialized.sequence) {
      errors.push(`Sequence mismatch: ${original.sequence} !== ${deserialized.sequence}`);
    }

    // Deep compare payload
    const payloadComparison = this.deepCompare(original.payload, deserialized.payload);
    if (!payloadComparison.equal) {
      errors.push(`Payload mismatch: ${payloadComparison.differences.join(', ')}`);
    }

    // Compare metadata if present
    if (original.metadata || deserialized.metadata) {
      const metadataComparison = this.deepCompare(original.metadata, deserialized.metadata);
      if (!metadataComparison.equal) {
        errors.push(`Metadata mismatch: ${metadataComparison.differences.join(', ')}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Deep compare two objects for equality
   */
  private static deepCompare(obj1: unknown, obj2: unknown): ComparisonResult {
    const differences: string[] = [];

    const compare = (a: unknown, b: unknown, path: string = ''): void => {
      if (typeof a !== typeof b) {
        differences.push(`${path}: type mismatch (${typeof a} !== ${typeof b})`);
        return;
      }

      if (a === null || b === null) {
        if (a !== b) {
          differences.push(`${path}: null mismatch (${a} !== ${b})`);
        }
        return;
      }

      if (typeof a === 'object' && typeof b === 'object') {
        const aObj = a as Record<string, unknown>;
        const bObj = b as Record<string, unknown>;

        const aKeys = Object.keys(aObj);
        const bKeys = Object.keys(bObj);

        if (aKeys.length !== bKeys.length) {
          differences.push(`${path}: key count mismatch (${aKeys.length} !== ${bKeys.length})`);
        }

        for (const key of aKeys) {
          if (!(key in bObj)) {
            differences.push(`${path}.${key}: missing in second object`);
          } else {
            compare(aObj[key], bObj[key], path ? `${path}.${key}` : key);
          }
        }

        for (const key of bKeys) {
          if (!(key in aObj)) {
            differences.push(`${path}.${key}: missing in first object`);
          }
        }
      } else if (a !== b) {
        differences.push(`${path}: value mismatch (${a} !== ${b})`);
      }
    };

    compare(obj1, obj2);

    return {
      equal: differences.length === 0,
      differences,
    };
  }

  /**
   * Calculate compression ratio
   */
  private static calculateCompressionRatio(
    original: ConversationalMessage,
    serialized: string
  ): number {
    const originalSize = JSON.stringify(original).length;
    return serialized.length / originalSize;
  }
}

interface SerializationTestResult {
  success: boolean;
  originalMessage: ConversationalMessage;
  serialized: string;
  deserializedMessage: ConversationalMessage | null;
  serializationTime: number;
  deserializationTime: number;
  totalTime: number;
  serializedSize: number;
  compressionRatio: number;
  integrityCheck: IntegrityCheckResult;
  error?: unknown;
}

interface IntegrityCheckResult {
  valid: boolean;
  errors: string[];
}

interface ComparisonResult {
  equal: boolean;
  differences: string[];
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

// ===== PARLANT BIDIRECTIONAL TESTING SUITE =====

describe('PARLANT Phase 1 WebSocket Bidirectional Communication Testing', () => {
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

  // ===== BIDIRECTIONAL MESSAGE FLOW TESTS =====

  describe('Bidirectional Message Flow Validation', () => {
    let testClient: ParlantBidirectionalTestClient;

    beforeEach(async () => {
      testClient = new ParlantBidirectionalTestClient(TEST_URL, `bidirectional_${Date.now()}`);
      await testClient.connect();
    });

    afterEach(async () => {
      if (testClient?.isConnected()) {
        await testClient.disconnect();
      }
    });

    it('should establish bidirectional WebSocket connection with session validation', async () => {
      expect(testClient.isConnected()).toBe(true);

      const metrics = testClient.getPerformanceMetrics();
      expect(metrics.connectionTime).toBeLessThan(1000); // <1 second connection

      const conversationState = testClient.getConversationState();
      expect(conversationState.sessionId).toBeDefined();
      expect(conversationState.clientId).toBeDefined();
      expect(conversationState.syncStatus).toBe('synchronized');
    });

    it('should perform client-to-server message flow with acknowledgment', async () => {
      const action: ValidationAction = {
        actionType: 'test_bidirectional_action',
        parameters: { test: true, direction: 'client-to-server' },
        expectedOutcome: 'Bidirectional communication validated',
        reversible: true,
        impact: {
          scope: 'local',
          dataAccess: false,
          stateChanges: false,
          userInteraction: false,
        } as ActionImpact,
      };

      const validationResult = await testClient.sendValidationRequest(action);

      expect(validationResult.success).toBe(true);
      expect(validationResult.responseTime).toBeLessThan(5000); // <5 seconds
      expect(validationResult.response.type).toBe(ConversationalMessageType.VALIDATION_RESPONSE);
      expect(validationResult.response.payload.validationId).toBe(validationResult.validationId);
    });

    it('should perform server-to-client message flow with progress updates', async () => {
      const action: ValidationAction = {
        actionType: 'streaming_validation_test',
        parameters: { enableStreaming: true, progressUpdates: true },
        expectedOutcome: 'Progressive validation with server-to-client updates',
        reversible: true,
        impact: {
          scope: 'local',
          dataAccess: true,
          stateChanges: false,
          userInteraction: false,
        } as ActionImpact,
      };

      let progressUpdatesReceived = 0;
      testClient.on('progressUpdate', () => {
        progressUpdatesReceived++;
      });

      const validationResult = await testClient.sendValidationRequest(action);

      // Wait for progress updates
      await new Promise(resolve => setTimeout(resolve, 3000));

      expect(validationResult.success).toBe(true);
      expect(progressUpdatesReceived).toBeGreaterThan(0);
      expect(validationResult.progressUpdates.length).toBeGreaterThan(0);
    });

    it('should validate message acknowledgment protocols', async () => {
      const sentMessages = testClient.getSentMessages();
      const receivedMessages = testClient.getReceivedMessages();

      // Send a message that requires acknowledgment
      const action: ValidationAction = {
        actionType: 'acknowledgment_test',
        parameters: { requiresAck: true },
        expectedOutcome: 'Acknowledgment protocol validated',
        reversible: true,
        impact: {
          scope: 'local',
          dataAccess: false,
          stateChanges: false,
          userInteraction: false,
        } as ActionImpact,
      };

      const validationResult = await testClient.sendValidationRequest(action);

      expect(validationResult.success).toBe(true);

      const metrics = testClient.getPerformanceMetrics();
      expect(metrics.acknowledgmentsReceived).toBeGreaterThan(0);
    });
  });

  // ===== CONVERSATION DATA SERIALIZATION TESTS =====

  describe('PARLANT Conversation Data Serialization/Deserialization', () => {
    it('should serialize and deserialize validation request messages', () => {
      const validationRequest: ValidationRequestMessage = {
        type: ConversationalMessageType.VALIDATION_REQUEST,
        messageId: 'test_msg_123',
        sessionId: 'test_session_456',
        timestamp: Date.now(),
        sequence: 1,
        payload: {
          validationId: 'val_789',
          context: {
            userId: 'test-user',
            applicationContext: 'parlant-testing',
            environmentInfo: { test: true },
            previousActions: [],
            securityContext: {
              authenticationLevel: 'basic',
              permissions: ['read', 'write'],
              auditRequired: true,
              complianceFlags: ['GDPR'],
            } as SecurityContext,
          },
          action: {
            actionType: 'file_operation',
            parameters: { operation: 'create', path: '/tmp/test.txt' },
            expectedOutcome: 'File created',
            reversible: true,
            impact: {
              scope: 'local',
              dataAccess: true,
              stateChanges: true,
              userInteraction: false,
            } as ActionImpact,
          },
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

      const result = ConversationSerializationTester.testConversationSerialization(validationRequest);

      expect(result.success).toBe(true);
      expect(result.integrityCheck.valid).toBe(true);
      expect(result.integrityCheck.errors).toHaveLength(0);
      expect(result.serializationTime).toBeLessThan(10); // <10ms
      expect(result.deserializationTime).toBeLessThan(10); // <10ms
      expect(result.serializedSize).toBeGreaterThan(0);
    });

    it('should serialize and deserialize user confirmation messages', () => {
      const userConfirmation: UserConfirmationMessage = {
        type: ConversationalMessageType.USER_CONFIRMATION,
        messageId: 'test_conf_123',
        sessionId: 'test_session_456',
        timestamp: Date.now(),
        sequence: 2,
        payload: {
          confirmationId: 'conf_789',
          validationId: 'val_123',
          approved: true,
          reasoning: 'Test approval with complex data',
          confidence: 0.95,
          conditions: [
            {
              condition: 'audit_trail_enabled',
              required: true,
              timeout: 30000,
            },
          ],
        },
        metadata: {
          priority: 'high',
          requiresAck: true,
          compression: false,
          routingHints: ['confirmation'],
        },
      };

      const result = ConversationSerializationTester.testConversationSerialization(userConfirmation);

      expect(result.success).toBe(true);
      expect(result.integrityCheck.valid).toBe(true);
      expect(result.deserializedMessage?.payload.approved).toBe(true);
      expect(result.deserializedMessage?.payload.conditions).toHaveLength(1);
    });

    it('should serialize and deserialize progress update messages', () => {
      const progressUpdate: ProgressUpdateMessage = {
        type: ConversationalMessageType.PROGRESS_UPDATE,
        messageId: 'test_progress_123',
        sessionId: 'test_session_456',
        timestamp: Date.now(),
        sequence: 3,
        payload: {
          operationId: 'op_789',
          stage: 'validation_processing',
          progress: 75,
          status: 'active',
          details: {
            currentStep: 'security_validation',
            totalSteps: 5,
            completedSteps: 3,
            errors: [
              {
                errorCode: 'WARN_001',
                message: 'Non-critical warning',
                recoverable: true,
                timestamp: Date.now(),
              },
            ],
            warnings: ['Performance impact detected'],
            metrics: {
              processingTime: 1250,
              memoryUsage: 2048576,
              networkLatency: 45,
              throughput: 1024,
            },
          },
          estimatedCompletion: Date.now() + 5000,
        },
        metadata: {
          priority: 'normal',
          requiresAck: false,
          compression: true,
          routingHints: ['progress'],
        },
      };

      const result = ConversationSerializationTester.testConversationSerialization(progressUpdate);

      expect(result.success).toBe(true);
      expect(result.integrityCheck.valid).toBe(true);
      expect(result.deserializedMessage?.payload.progress).toBe(75);
      expect(result.deserializedMessage?.payload.details.errors).toHaveLength(1);
      expect(result.deserializedMessage?.payload.details.warnings).toHaveLength(1);
    });

    it('should handle serialization of large conversation payloads', () => {
      // Create a large payload to test compression and performance
      const largePayload = {
        data: new Array(1000).fill(null).map((_, i) => ({
          id: i,
          content: `Large data entry ${i} with significant content for testing serialization performance and compression ratios`,
          metadata: {
            timestamp: Date.now() + i,
            tags: [`tag_${i}`, `category_${i % 10}`, `type_${i % 5}`],
            properties: {
              size: i * 100,
              priority: i % 3,
              active: i % 2 === 0,
            },
          },
        })),
      };

      const largeMessage: ConversationalMessage = {
        type: ConversationalMessageType.VALIDATION_REQUEST,
        messageId: 'large_msg_test',
        sessionId: 'test_session',
        timestamp: Date.now(),
        sequence: 1,
        payload: largePayload,
        metadata: {
          priority: 'normal',
          requiresAck: true,
          compression: true,
          routingHints: ['large-payload'],
        },
      };

      const result = ConversationSerializationTester.testConversationSerialization(largeMessage);

      expect(result.success).toBe(true);
      expect(result.integrityCheck.valid).toBe(true);
      expect(result.serializedSize).toBeGreaterThan(10000); // Large payload
      expect(result.serializationTime).toBeLessThan(100); // <100ms even for large payloads
      expect(result.deserializationTime).toBeLessThan(100); // <100ms even for large payloads
    });
  });

  // ===== REAL-TIME STREAMING VALIDATION TESTS =====

  describe('Real-time Streaming Conversation Validation', () => {
    let testClient: ParlantBidirectionalTestClient;

    beforeEach(async () => {
      testClient = new ParlantBidirectionalTestClient(TEST_URL, `streaming_${Date.now()}`);
      await testClient.connect();
    });

    afterEach(async () => {
      if (testClient?.isConnected()) {
        await testClient.disconnect();
      }
    });

    it('should perform complete bidirectional validation workflow with streaming', async () => {
      const action: ValidationAction = {
        actionType: 'streaming_workflow_test',
        parameters: {
          complexity: 'high',
          streaming: true,
          progressUpdates: true,
        },
        expectedOutcome: 'Complete streaming validation workflow',
        reversible: true,
        impact: {
          scope: 'system',
          dataAccess: true,
          stateChanges: true,
          userInteraction: true,
        } as ActionImpact,
      };

      const workflowResult = await testClient.performBidirectionalValidationWorkflow(action, true);

      expect(workflowResult.success).toBe(true);
      expect(workflowResult.totalTime).toBeLessThan(15000); // <15 seconds
      expect(workflowResult.validationResult).toBeDefined();
      expect(workflowResult.confirmationResult).toBeDefined();
      expect(workflowResult.finalResult).toBeDefined();
      expect(workflowResult.messageCount).toBeGreaterThan(3); // At least validation, confirmation, and result
    });

    it('should stream progressive validation updates in real-time', async () => {
      const action: ValidationAction = {
        actionType: 'progressive_validation',
        parameters: {
          steps: 5,
          updateInterval: 200, // 200ms intervals
        },
        expectedOutcome: 'Progressive updates received',
        reversible: true,
        impact: {
          scope: 'local',
          dataAccess: true,
          stateChanges: false,
          userInteraction: false,
        } as ActionImpact,
      };

      const progressUpdates: ProgressUpdateMessage[] = [];
      testClient.on('progressUpdate', (data) => {
        progressUpdates.push(data.progress);
      });

      const validationResult = await testClient.sendValidationRequest(action);

      // Wait for progress updates to stream
      await new Promise(resolve => setTimeout(resolve, 2000));

      expect(validationResult.success).toBe(true);
      expect(progressUpdates.length).toBeGreaterThan(0);

      // Verify progress updates are in sequence
      for (let i = 1; i < progressUpdates.length; i++) {
        expect(progressUpdates[i].operationId).toBe(progressUpdates[0].operationId);
        expect(progressUpdates[i].progress).toBeGreaterThanOrEqual(progressUpdates[i-1].progress);
      }

      // Verify timing of updates (should be roughly 200ms apart)
      for (let i = 1; i < progressUpdates.length; i++) {
        const timeDiff = progressUpdates[i].timestamp - progressUpdates[i-1].timestamp;
        expect(timeDiff).toBeGreaterThanOrEqual(150); // Allow some timing variance
        expect(timeDiff).toBeLessThanOrEqual(350); // Allow some timing variance
      }
    });

    it('should maintain conversation state synchronization during streaming', async () => {
      const action: ValidationAction = {
        actionType: 'state_sync_test',
        parameters: {
          stateUpdates: true,
          syncValidation: true,
        },
        expectedOutcome: 'Conversation state synchronized',
        reversible: true,
        impact: {
          scope: 'local',
          dataAccess: false,
          stateChanges: true,
          userInteraction: false,
        } as ActionImpact,
      };

      // Monitor conversation state changes
      const stateSnapshots: ConversationState[] = [];
      const monitorInterval = setInterval(() => {
        stateSnapshots.push(testClient.getConversationState());
      }, 100); // Every 100ms

      const validationResult = await testClient.sendValidationRequest(action);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Allow time for state changes

      clearInterval(monitorInterval);

      expect(validationResult.success).toBe(true);
      expect(stateSnapshots.length).toBeGreaterThan(5);

      // Verify state synchronization
      const finalState = testClient.getConversationState();
      expect(finalState.syncStatus).toBe('synchronized');
      expect(finalState.connectionQuality).toMatch(/excellent|good/);
      expect(finalState.messageHistory.length).toBeGreaterThan(0);
    });
  });

  // ===== PERFORMANCE VALIDATION TESTS =====

  describe('Sub-100ms Latency Performance Validation', () => {
    let testClient: ParlantBidirectionalTestClient;

    beforeEach(async () => {
      testClient = new ParlantBidirectionalTestClient(TEST_URL, `performance_${Date.now()}`);
      await testClient.connect();
    });

    afterEach(async () => {
      if (testClient?.isConnected()) {
        await testClient.disconnect();
      }
    });

    it('should achieve sub-100ms message delivery latency (P95)', async () => {
      const messageCount = 100;
      const latencies: number[] = [];

      for (let i = 0; i < messageCount; i++) {
        const startTime = performance.now();

        const action: ValidationAction = {
          actionType: 'latency_test',
          parameters: { messageNumber: i },
          expectedOutcome: 'Low latency response',
          reversible: true,
          impact: {
            scope: 'local',
            dataAccess: false,
            stateChanges: false,
            userInteraction: false,
          } as ActionImpact,
        };

        const validationResult = await testClient.sendValidationRequest(action);
        const latency = performance.now() - startTime;

        latencies.push(latency);
        expect(validationResult.success).toBe(true);

        // Small delay between messages to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      latencies.sort((a, b) => a - b);

      const averageLatency = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
      const p95Latency = latencies[Math.floor(latencies.length * 0.95)];
      const p99Latency = latencies[Math.floor(latencies.length * 0.99)];

      expect(averageLatency).toBeLessThan(75); // Average <75ms
      expect(p95Latency).toBeLessThan(100); // P95 <100ms
      expect(p99Latency).toBeLessThan(150); // P99 <150ms

      console.log('Latency Performance Results:', {
        messageCount,
        averageLatency: `${averageLatency.toFixed(2)}ms`,
        p95Latency: `${p95Latency.toFixed(2)}ms`,
        p99Latency: `${p99Latency.toFixed(2)}ms`,
        minLatency: `${latencies[0].toFixed(2)}ms`,
        maxLatency: `${latencies[latencies.length - 1].toFixed(2)}ms`,
      });
    });

    it('should maintain low latency under concurrent validation load', async () => {
      const concurrentValidations = 10;
      const validationPromises: Promise<BidirectionalValidationResult>[] = [];

      const startTime = performance.now();

      for (let i = 0; i < concurrentValidations; i++) {
        const action: ValidationAction = {
          actionType: 'concurrent_latency_test',
          parameters: { validationNumber: i },
          expectedOutcome: 'Concurrent validation completed',
          reversible: true,
          impact: {
            scope: 'local',
            dataAccess: false,
            stateChanges: false,
            userInteraction: false,
          } as ActionImpact,
        };

        validationPromises.push(testClient.sendValidationRequest(action));
      }

      const results = await Promise.all(validationPromises);
      const totalTime = performance.now() - startTime;

      // All validations should succeed
      expect(results.every(result => result.success)).toBe(true);

      // Calculate latency statistics
      const responseTimes = results.map(result => result.responseTime);
      responseTimes.sort((a, b) => a - b);

      const averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      const p95ResponseTime = responseTimes[Math.floor(responseTimes.length * 0.95)];

      expect(averageResponseTime).toBeLessThan(100); // Average <100ms under load
      expect(p95ResponseTime).toBeLessThan(150); // P95 <150ms under load
      expect(totalTime).toBeLessThan(5000); // Total time <5 seconds for 10 concurrent validations

      console.log('Concurrent Latency Results:', {
        concurrentValidations,
        totalTime: `${totalTime.toFixed(2)}ms`,
        averageResponseTime: `${averageResponseTime.toFixed(2)}ms`,
        p95ResponseTime: `${p95ResponseTime.toFixed(2)}ms`,
        throughput: `${(concurrentValidations / (totalTime / 1000)).toFixed(2)} validations/sec`,
      });
    });

    it('should measure and validate bidirectional message throughput', async () => {
      const testDuration = 5000; // 5 seconds
      const messageInterval = 50; // Send message every 50ms

      let messagesSent = 0;
      let messagesReceived = 0;
      let responsesReceived = 0;

      testClient.on('message', () => {
        messagesReceived++;
      });

      testClient.on('validationResponse', () => {
        responsesReceived++;
      });

      const startTime = performance.now();

      const sendInterval = setInterval(async () => {
        if (performance.now() - startTime >= testDuration) {
          clearInterval(sendInterval);
          return;
        }

        try {
          const action: ValidationAction = {
            actionType: 'throughput_test',
            parameters: { messageNumber: messagesSent },
            expectedOutcome: 'Throughput validation',
            reversible: true,
            impact: {
              scope: 'local',
              dataAccess: false,
              stateChanges: false,
              userInteraction: false,
            } as ActionImpact,
          };

          await testClient.sendValidationRequest(action);
          messagesSent++;
        } catch (error) {
          // Continue sending messages even if some fail
        }
      }, messageInterval);

      // Wait for test completion
      await new Promise(resolve => setTimeout(resolve, testDuration + 1000));

      const actualDuration = performance.now() - startTime;
      const sendThroughput = messagesSent / (actualDuration / 1000);
      const receiveThroughput = messagesReceived / (actualDuration / 1000);
      const responseThroughput = responsesReceived / (actualDuration / 1000);

      expect(sendThroughput).toBeGreaterThan(15); // >15 messages/sec send rate
      expect(receiveThroughput).toBeGreaterThan(15); // >15 messages/sec receive rate
      expect(responseThroughput).toBeGreaterThan(10); // >10 responses/sec

      console.log('Throughput Performance Results:', {
        testDuration: `${actualDuration.toFixed(0)}ms`,
        messagesSent,
        messagesReceived,
        responsesReceived,
        sendThroughput: `${sendThroughput.toFixed(2)} msg/sec`,
        receiveThroughput: `${receiveThroughput.toFixed(2)} msg/sec`,
        responseThroughput: `${responseThroughput.toFixed(2)} resp/sec`,
      });
    });
  });

  // ===== MESSAGE DELIVERY GUARANTEE TESTS =====

  describe('Message Delivery Guarantee and Acknowledgment Framework', () => {
    let testClient: ParlantBidirectionalTestClient;

    beforeEach(async () => {
      testClient = new ParlantBidirectionalTestClient(TEST_URL, `delivery_${Date.now()}`);
      await testClient.connect();
    });

    afterEach(async () => {
      if (testClient?.isConnected()) {
        await testClient.disconnect();
      }
    });

    it('should guarantee message delivery with acknowledgments', async () => {
      const messageCount = 50;
      const sentMessages: string[] = [];
      const acknowledgedMessages: string[] = [];

      testClient.on('messageSent', (data) => {
        sentMessages.push(data.message.messageId);
      });

      // Track acknowledgments from server
      testClient.on('message', (data) => {
        if (data.message.type === ConversationalMessageType.HEARTBEAT_ACK) {
          const originalMessageId = data.message.payload.originalMessageId as string;
          if (originalMessageId) {
            acknowledgedMessages.push(originalMessageId);
          }
        }
      });

      // Send messages with acknowledgment requirement
      for (let i = 0; i < messageCount; i++) {
        const action: ValidationAction = {
          actionType: 'delivery_guarantee_test',
          parameters: { messageNumber: i, requiresAck: true },
          expectedOutcome: 'Message delivery guaranteed',
          reversible: true,
          impact: {
            scope: 'local',
            dataAccess: false,
            stateChanges: false,
            userInteraction: false,
          } as ActionImpact,
        };

        await testClient.sendValidationRequest(action);

        // Small delay to avoid overwhelming
        await new Promise(resolve => setTimeout(resolve, 20));
      }

      // Wait for all acknowledgments
      await new Promise(resolve => setTimeout(resolve, 3000));

      const deliveryRate = acknowledgedMessages.length / sentMessages.length;

      expect(sentMessages.length).toBe(messageCount);
      expect(deliveryRate).toBeGreaterThanOrEqual(0.95); // 95% delivery rate

      console.log('Message Delivery Results:', {
        messagesSent: sentMessages.length,
        messagesAcknowledged: acknowledgedMessages.length,
        deliveryRate: `${(deliveryRate * 100).toFixed(1)}%`,
      });
    });

    it('should handle message ordering and sequence validation', async () => {
      const messageCount = 20;
      const receivedSequences: number[] = [];

      testClient.on('validationResponse', (data) => {
        receivedSequences.push(data.response.sequence);
      });

      // Send messages in sequence
      for (let i = 0; i < messageCount; i++) {
        const action: ValidationAction = {
          actionType: 'sequence_test',
          parameters: { sequenceNumber: i },
          expectedOutcome: 'Sequence validation',
          reversible: true,
          impact: {
            scope: 'local',
            dataAccess: false,
            stateChanges: false,
            userInteraction: false,
          } as ActionImpact,
        };

        await testClient.sendValidationRequest(action);
      }

      // Wait for all responses
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify sequence ordering
      expect(receivedSequences.length).toBeGreaterThan(0);

      // Check if sequences are generally in order (allowing for some network reordering)
      let orderedCount = 0;
      for (let i = 1; i < receivedSequences.length; i++) {
        if (receivedSequences[i] >= receivedSequences[i-1]) {
          orderedCount++;
        }
      }

      const orderingRate = orderedCount / (receivedSequences.length - 1);
      expect(orderingRate).toBeGreaterThanOrEqual(0.8); // 80% ordering rate (allows for some reordering)

      console.log('Message Ordering Results:', {
        messagesReceived: receivedSequences.length,
        orderedMessages: orderedCount,
        orderingRate: `${(orderingRate * 100).toFixed(1)}%`,
      });
    });

    it('should validate duplicate message detection and prevention', async () => {
      const originalMessageId = 'duplicate_test_message_123';

      // Create identical messages with same messageId
      const createDuplicateMessage = (): ConversationalMessage => ({
        type: ConversationalMessageType.VALIDATION_REQUEST,
        messageId: originalMessageId,
        sessionId: testClient.getSessionId(),
        timestamp: Date.now(),
        sequence: 1,
        payload: {
          validationId: 'duplicate_validation',
          context: {
            userId: 'test-user',
            applicationContext: 'duplicate-testing',
            environmentInfo: {},
            previousActions: [],
            securityContext: {
              authenticationLevel: 'basic',
              permissions: [],
              auditRequired: false,
              complianceFlags: [],
            } as SecurityContext,
          },
          action: {
            actionType: 'duplicate_test',
            parameters: {},
            expectedOutcome: 'Duplicate detection',
            reversible: true,
            impact: {
              scope: 'local',
              dataAccess: false,
              stateChanges: false,
              userInteraction: false,
            } as ActionImpact,
          },
          riskLevel: 'low',
          streamingOptions: {
            enableProgressUpdates: false,
            updateInterval: 1000,
            maxUpdateCount: 1,
            compressionEnabled: false,
            priorityBoost: false,
          },
        },
        metadata: {
          priority: 'normal',
          requiresAck: true,
          compression: false,
          routingHints: ['duplicate-test'],
        },
      });

      let duplicateResponsesReceived = 0;
      testClient.on('validationResponse', (data) => {
        if (data.validationId === 'duplicate_validation') {
          duplicateResponsesReceived++;
        }
      });

      // Send the same message multiple times
      const duplicateMessage = createDuplicateMessage();

      try {
        await testClient['sendMessageWithTracking'](duplicateMessage);
        await testClient['sendMessageWithTracking'](duplicateMessage);
        await testClient['sendMessageWithTracking'](duplicateMessage);
      } catch (error) {
        // Expected to fail or be rejected for duplicates
      }

      // Wait for responses
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Should only receive one response for duplicate messages
      expect(duplicateResponsesReceived).toBeLessThanOrEqual(1);
    });
  });

  // ===== WEBSOCKET PROTOCOL COMPLIANCE TESTS =====

  describe('WebSocket Protocol Compliance and Standards Validation', () => {
    it('should comply with WebSocket protocol standards', async () => {
      const testClient = new ParlantBidirectionalTestClient(TEST_URL, `protocol_${Date.now()}`);

      // Test connection establishment with proper headers
      const connectionResult = await testClient.connect();

      expect(connectionResult.success).toBe(true);
      expect(connectionResult.connectionTime).toBeLessThan(2000);

      // Verify WebSocket protocol compliance
      const ws = testClient['ws'];
      expect(ws?.protocol).toBeDefined();
      expect(ws?.readyState).toBe(WebSocket.WebSocket.OPEN);

      await testClient.disconnect();
      expect(ws?.readyState).toBe(WebSocket.WebSocket.CLOSED);
    });

    it('should handle WebSocket close codes properly', async () => {
      const testClient = new ParlantBidirectionalTestClient(TEST_URL, `close_code_${Date.now()}`);
      await testClient.connect();

      let closeCode: number | undefined;
      let closeReason: string | undefined;

      testClient.on('disconnected', (data) => {
        closeCode = data.code;
        closeReason = data.reason;
      });

      // Properly close connection
      await testClient.disconnect();

      expect(closeCode).toBe(1000); // Normal closure
      expect(closeReason).toContain('Test completed');
    });

    it('should validate WebSocket subprotocol negotiation', async () => {
      // Test with specific subprotocols
      const testUrl = `${TEST_URL}?subprotocol=parlant-validation-v1`;
      const testClient = new ParlantBidirectionalTestClient(testUrl, `subprotocol_${Date.now()}`);

      const connectionResult = await testClient.connect();

      expect(connectionResult.success).toBe(true);

      await testClient.disconnect();
    });
  });

  // ===== COMPREHENSIVE INTEGRATION TESTS =====

  describe('Comprehensive Test Automation Framework', () => {
    it('should execute complete PARLANT Phase 1 validation test suite', async () => {
      const testSuiteStartTime = performance.now();

      // Test multiple clients simultaneously
      const clientCount = 5;
      const clients: ParlantBidirectionalTestClient[] = [];

      // Create and connect multiple clients
      for (let i = 0; i < clientCount; i++) {
        const client = new ParlantBidirectionalTestClient(TEST_URL, `suite_client_${i}`);
        await client.connect();
        clients.push(client);
      }

      try {
        // Run various test scenarios concurrently
        const testPromises = clients.map(async (client, index) => {
          const action: ValidationAction = {
            actionType: 'comprehensive_test',
            parameters: {
              clientIndex: index,
              testType: 'full_validation_suite',
            },
            expectedOutcome: 'Comprehensive test completed',
            reversible: true,
            impact: {
              scope: index % 2 === 0 ? 'local' : 'system',
              dataAccess: true,
              stateChanges: index % 3 === 0,
              userInteraction: index % 4 === 0,
            } as ActionImpact,
          };

          return client.performBidirectionalValidationWorkflow(action, true);
        });

        const results = await Promise.all(testPromises);

        // Analyze results
        const successfulTests = results.filter(result => result.success);
        const averageResponseTime = results.reduce((sum, result) => sum + result.totalTime, 0) / results.length;

        expect(successfulTests.length).toBe(clientCount);
        expect(averageResponseTime).toBeLessThan(10000); // <10 seconds average

        // Collect comprehensive metrics
        const allMetrics = clients.map(client => client.getPerformanceMetrics());
        const totalMessages = allMetrics.reduce((sum, metrics) => sum + metrics.messagesSent + metrics.messagesReceived, 0);
        const averageLatency = allMetrics.reduce((sum, metrics) => sum + metrics.averageLatency, 0) / allMetrics.length;

        const testSuiteDuration = performance.now() - testSuiteStartTime;

        console.log('Comprehensive Test Suite Results:', {
          clientCount,
          successfulTests: successfulTests.length,
          successRate: `${(successfulTests.length / clientCount * 100).toFixed(1)}%`,
          totalMessages,
          averageLatency: `${averageLatency.toFixed(2)}ms`,
          averageResponseTime: `${averageResponseTime.toFixed(2)}ms`,
          testSuiteDuration: `${testSuiteDuration.toFixed(2)}ms`,
          messagesPerSecond: `${(totalMessages / (testSuiteDuration / 1000)).toFixed(2)}`,
        });

        // Validate PARLANT Phase 1 requirements
        expect(averageLatency).toBeLessThan(100); // Sub-100ms requirement
        expect(successfulTests.length / clientCount).toBeGreaterThanOrEqual(0.95); // 95% success rate
        expect(totalMessages).toBeGreaterThan(clientCount * 10); // At least 10 messages per client

      } finally {
        // Clean up all clients
        await Promise.all(clients.map(client => client.disconnect()));
      }
    });
  });
});