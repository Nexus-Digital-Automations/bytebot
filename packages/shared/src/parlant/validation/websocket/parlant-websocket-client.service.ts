/**
 * PARLANT WebSocket Client Service
 *
 * Enterprise-grade WebSocket client for real-time bidirectional communication
 * with PARLANT for conversational validation. Provides connection management,
 * message routing, error handling, and performance optimization.
 *
 * Features:
 * - Persistent WebSocket connections with automatic reconnection
 * - Message correlation and response tracking
 * - Performance monitoring with sub-1000ms targets
 * - Circuit breaker pattern for connection resilience
 * - Comprehensive error handling and logging
 * - Authentication and session management
 *
 * @module ParlantWebSocketClient
 * @version 1.0.0
 * @author AIgent Integration Team
 */

import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';
import {
  ValidationRequest,
  ValidationResponse,
  ValidationLayerError,
} from '../types/validation-layer.types';

// ===== WEBSOCKET MESSAGE TYPES =====

/**
 * WebSocket message structure for PARLANT communication
 */
interface ParlantWebSocketMessage {
  /** Message type identifier */
  type: ParlantMessageType;
  /** Unique message identifier for correlation */
  messageId: string;
  /** Message payload */
  payload: Record<string, unknown>;
  /** Message timestamp */
  timestamp: number;
  /** Session context */
  sessionContext?: SessionContext;
}

/**
 * PARLANT WebSocket message types
 */
enum ParlantMessageType {
  VALIDATION_REQUEST = 'validation_request',
  VALIDATION_RESPONSE = 'validation_response',
  STATUS_UPDATE = 'status_update',
  ERROR_NOTIFICATION = 'error_notification',
  HEARTBEAT = 'heartbeat',
  AUTH_CHALLENGE = 'auth_challenge',
  AUTH_RESPONSE = 'auth_response',
  SESSION_START = 'session_start',
  SESSION_END = 'session_end',
}

/**
 * Session context for WebSocket communication
 */
interface SessionContext {
  sessionId: string;
  userId: string;
  conversationId?: string;
  authToken: string;
}

/**
 * Connection configuration
 */
interface ConnectionConfig {
  url: string;
  timeout: number;
  maxReconnectAttempts: number;
  reconnectDelay: number;
  heartbeatInterval: number;
  authToken: string;
}

/**
 * Connection metrics for monitoring
 */
interface ConnectionMetrics {
  connectTime: number;
  messagessent: number;
  messagesReceived: number;
  reconnectCount: number;
  lastHeartbeat: number;
  averageResponseTime: number;
  errorCount: number;
}

// ===== WEBSOCKET CLIENT SERVICE =====

@Injectable()
export class ParlantWebSocketClient extends EventEmitter implements OnApplicationShutdown {
  private readonly logger = new Logger(ParlantWebSocketClient.name);
  private websocket: WebSocket | null = null;
  private connectionConfig: ConnectionConfig;
  private isConnected = false;
  private isConnecting = false;
  private reconnectAttempts = 0;
  private sessionContext: SessionContext | null = null;
  private pendingRequests = new Map<string, PendingRequest>();
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private connectionMetrics: ConnectionMetrics;
  private circuitBreakerState: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private lastFailureTime = 0;

  constructor(private readonly configService: ConfigService) {
    super();
    this.initializeConfiguration();
    this.initializeMetrics();
  }

  /**
   * Initialize WebSocket client configuration
   */
  private initializeConfiguration(): void {
    this.connectionConfig = {
      url: this.configService.get<string>('PARLANT_WEBSOCKET_URL') || 'ws://localhost:8080/parlant',
      timeout: this.configService.get<number>('PARLANT_WS_TIMEOUT') || 5000,
      maxReconnectAttempts: this.configService.get<number>('PARLANT_WS_MAX_RECONNECT') || 10,
      reconnectDelay: this.configService.get<number>('PARLANT_WS_RECONNECT_DELAY') || 1000,
      heartbeatInterval: this.configService.get<number>('PARLANT_WS_HEARTBEAT_INTERVAL') || 30000,
      authToken: this.configService.get<string>('PARLANT_AUTH_TOKEN') || '',
    };

    this.logger.log('WebSocket client configuration initialized', {
      url: this.connectionConfig.url,
      timeout: this.connectionConfig.timeout,
    });
  }

  /**
   * Initialize connection metrics
   */
  private initializeMetrics(): void {
    this.connectionMetrics = {
      connectTime: 0,
      messagesSeint: 0,
      messagesReceived: 0,
      reconnectCount: 0,
      lastHeartbeat: 0,
      averageResponseTime: 0,
      errorCount: 0,
    };
  }

  /**
   * Connect to PARLANT WebSocket server
   */
  async connect(sessionContext: SessionContext): Promise<void> {
    if (this.isConnected || this.isConnecting) {
      this.logger.warn('Connection already established or in progress');
      return;
    }

    if (this.circuitBreakerState === CircuitBreakerState.OPEN) {
      const timeSinceFailure = Date.now() - this.lastFailureTime;
      if (timeSinceFailure < 60000) { // 1 minute circuit breaker timeout
        throw new ValidationLayerError(
          'Circuit breaker open - connection temporarily disabled',
          'CIRCUIT_BREAKER_OPEN'
        );
      }
      this.circuitBreakerState = CircuitBreakerState.HALF_OPEN;
    }

    this.isConnecting = true;
    this.sessionContext = sessionContext;

    try {
      const startTime = performance.now();

      await this.establishConnection();

      this.connectionMetrics.connectTime = performance.now() - startTime;
      this.isConnected = true;
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      this.circuitBreakerState = CircuitBreakerState.CLOSED;

      this.setupEventHandlers();
      this.startHeartbeat();
      await this.authenticateSession();

      this.logger.log('WebSocket connection established successfully', {
        connectTime: this.connectionMetrics.connectTime,
        sessionId: sessionContext.sessionId,
      });

      this.emit('connected', { sessionContext, connectTime: this.connectionMetrics.connectTime });

    } catch (error) {
      this.handleConnectionError(error as Error);
      throw error;
    }
  }

  /**
   * Establish WebSocket connection
   */
  private async establishConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new ValidationLayerError(
          `Connection timeout after ${this.connectionConfig.timeout}ms`,
          'CONNECTION_TIMEOUT'
        ));
      }, this.connectionConfig.timeout);

      this.websocket = new WebSocket(this.connectionConfig.url);

      this.websocket.on('open', () => {
        clearTimeout(timeout);
        resolve();
      });

      this.websocket.on('error', (error) => {
        clearTimeout(timeout);
        reject(new ValidationLayerError(
          `WebSocket connection error: ${error.message}`,
          'CONNECTION_ERROR',
          { error: error.message }
        ));
      });
    });
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.websocket) return;

    this.websocket.on('message', (data) => {
      this.handleIncomingMessage(data.toString());
    });

    this.websocket.on('close', (code, reason) => {
      this.handleConnectionClose(code, reason.toString());
    });

    this.websocket.on('error', (error) => {
      this.handleWebSocketError(error);
    });

    this.websocket.on('ping', () => {
      this.websocket?.pong();
    });
  }

  /**
   * Authenticate WebSocket session
   */
  private async authenticateSession(): Promise<void> {
    if (!this.sessionContext) {
      throw new ValidationLayerError('No session context available for authentication', 'NO_SESSION_CONTEXT');
    }

    const authMessage: ParlantWebSocketMessage = {
      type: ParlantMessageType.AUTH_CHALLENGE,
      messageId: this.generateMessageId(),
      payload: {
        sessionId: this.sessionContext.sessionId,
        userId: this.sessionContext.userId,
        authToken: this.sessionContext.authToken,
      },
      timestamp: Date.now(),
      sessionContext: this.sessionContext,
    };

    await this.sendMessage(authMessage);
  }

  /**
   * Send validation request to PARLANT
   */
  async sendValidationRequest(request: ValidationRequest): Promise<ValidationResponse> {
    if (!this.isConnected) {
      throw new ValidationLayerError('WebSocket not connected', 'NOT_CONNECTED');
    }

    const startTime = performance.now();
    const messageId = this.generateMessageId();

    const message: ParlantWebSocketMessage = {
      type: ParlantMessageType.VALIDATION_REQUEST,
      messageId,
      payload: {
        validationRequest: request,
      },
      timestamp: Date.now(),
      sessionContext: this.sessionContext || undefined,
    };

    return new Promise((resolve, reject) => {
      // Setup timeout for response
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(messageId);
        reject(new ValidationLayerError(
          `Validation request timeout after ${request.timeoutMs}ms`,
          'REQUEST_TIMEOUT',
          { requestId: request.id, messageId }
        ));
      }, request.timeoutMs);

      // Track pending request
      this.pendingRequests.set(messageId, {
        request,
        resolve,
        reject,
        timeout,
        startTime,
      });

      // Send message
      this.sendMessage(message).catch((error) => {
        clearTimeout(timeout);
        this.pendingRequests.delete(messageId);
        reject(error);
      });
    });
  }

  /**
   * Send WebSocket message
   */
  private async sendMessage(message: ParlantWebSocketMessage): Promise<void> {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      throw new ValidationLayerError('WebSocket not ready for sending', 'NOT_READY');
    }

    try {
      const messageData = JSON.stringify(message);
      this.websocket.send(messageData);
      this.connectionMetrics.messagesSeint++;

      this.logger.debug('WebSocket message sent', {
        type: message.type,
        messageId: message.messageId,
        size: messageData.length,
      });

    } catch (error) {
      this.connectionMetrics.errorCount++;
      throw new ValidationLayerError(
        `Failed to send WebSocket message: ${(error as Error).message}`,
        'SEND_ERROR',
        { messageType: message.type, messageId: message.messageId }
      );
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleIncomingMessage(data: string): void {
    try {
      const message: ParlantWebSocketMessage = JSON.parse(data);
      this.connectionMetrics.messagesReceived++;

      this.logger.debug('WebSocket message received', {
        type: message.type,
        messageId: message.messageId,
      });

      switch (message.type) {
        case ParlantMessageType.VALIDATION_RESPONSE:
          this.handleValidationResponse(message);
          break;

        case ParlantMessageType.STATUS_UPDATE:
          this.handleStatusUpdate(message);
          break;

        case ParlantMessageType.ERROR_NOTIFICATION:
          this.handleErrorNotification(message);
          break;

        case ParlantMessageType.HEARTBEAT:
          this.handleHeartbeat(message);
          break;

        case ParlantMessageType.AUTH_RESPONSE:
          this.handleAuthResponse(message);
          break;

        default:
          this.logger.warn('Unknown message type received', { type: message.type });
      }

    } catch (error) {
      this.connectionMetrics.errorCount++;
      this.logger.error('Failed to process incoming message', {
        error: (error as Error).message,
        data: data.substring(0, 500), // Truncate for logging
      });
    }
  }

  /**
   * Handle validation response
   */
  private handleValidationResponse(message: ParlantWebSocketMessage): void {
    const response = message.payload.validationResponse as ValidationResponse;
    const pendingRequest = this.pendingRequests.get(message.messageId);

    if (!pendingRequest) {
      this.logger.warn('Received response for unknown request', {
        messageId: message.messageId,
        responseId: response.requestId,
      });
      return;
    }

    // Clear timeout and remove pending request
    clearTimeout(pendingRequest.timeout);
    this.pendingRequests.delete(message.messageId);

    // Update metrics
    const responseTime = performance.now() - pendingRequest.startTime;
    this.updateAverageResponseTime(responseTime);

    // Resolve the promise
    pendingRequest.resolve(response);

    this.logger.debug('Validation response processed', {
      requestId: response.requestId,
      decision: response.decision,
      responseTime,
    });
  }

  /**
   * Handle status updates
   */
  private handleStatusUpdate(message: ParlantWebSocketMessage): void {
    const status = message.payload.status;
    this.emit('statusUpdate', status);

    this.logger.debug('Status update received', { status });
  }

  /**
   * Handle error notifications
   */
  private handleErrorNotification(message: ParlantWebSocketMessage): void {
    const error = message.payload.error;
    this.connectionMetrics.errorCount++;

    // Check if this is related to a pending request
    const messageId = message.payload.relatedMessageId as string;
    if (messageId) {
      const pendingRequest = this.pendingRequests.get(messageId);
      if (pendingRequest) {
        clearTimeout(pendingRequest.timeout);
        this.pendingRequests.delete(messageId);
        pendingRequest.reject(new ValidationLayerError(
          error.message || 'PARLANT error notification',
          error.code || 'PARLANT_ERROR',
          error
        ));
      }
    }

    this.emit('error', error);
    this.logger.error('Error notification received', { error });
  }

  /**
   * Handle heartbeat messages
   */
  private handleHeartbeat(message: ParlantWebSocketMessage): void {
    this.connectionMetrics.lastHeartbeat = Date.now();

    // Respond to heartbeat
    const response: ParlantWebSocketMessage = {
      type: ParlantMessageType.HEARTBEAT,
      messageId: this.generateMessageId(),
      payload: { response: 'pong' },
      timestamp: Date.now(),
      sessionContext: this.sessionContext || undefined,
    };

    this.sendMessage(response).catch((error) => {
      this.logger.error('Failed to respond to heartbeat', { error: error.message });
    });
  }

  /**
   * Handle authentication response
   */
  private handleAuthResponse(message: ParlantWebSocketMessage): void {
    const authResult = message.payload.authResult;

    if (authResult.success) {
      this.logger.log('Session authenticated successfully', {
        sessionId: this.sessionContext?.sessionId,
      });
      this.emit('authenticated', authResult);
    } else {
      this.logger.error('Authentication failed', { reason: authResult.reason });
      this.emit('authenticationFailed', authResult);
    }
  }

  /**
   * Start heartbeat mechanism
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected) {
        const heartbeat: ParlantWebSocketMessage = {
          type: ParlantMessageType.HEARTBEAT,
          messageId: this.generateMessageId(),
          payload: { ping: true },
          timestamp: Date.now(),
          sessionContext: this.sessionContext || undefined,
        };

        this.sendMessage(heartbeat).catch((error) => {
          this.logger.error('Heartbeat failed', { error: error.message });
        });
      }
    }, this.connectionConfig.heartbeatInterval);
  }

  /**
   * Handle connection close
   */
  private handleConnectionClose(code: number, reason: string): void {
    this.isConnected = false;
    this.clearHeartbeat();

    this.logger.warn('WebSocket connection closed', { code, reason });

    // Reject all pending requests
    this.rejectPendingRequests(new ValidationLayerError(
      'Connection closed',
      'CONNECTION_CLOSED',
      { code, reason }
    ));

    this.emit('disconnected', { code, reason });

    // Attempt reconnection if not intentional
    if (code !== 1000 && this.reconnectAttempts < this.connectionConfig.maxReconnectAttempts) {
      this.scheduleReconnection();
    }
  }

  /**
   * Handle WebSocket errors
   */
  private handleWebSocketError(error: Error): void {
    this.connectionMetrics.errorCount++;
    this.logger.error('WebSocket error', { error: error.message });
    this.emit('error', error);
  }

  /**
   * Handle connection errors
   */
  private handleConnectionError(error: Error): void {
    this.isConnecting = false;
    this.connectionMetrics.errorCount++;
    this.lastFailureTime = Date.now();

    if (this.connectionMetrics.errorCount > 5) {
      this.circuitBreakerState = CircuitBreakerState.OPEN;
      this.logger.error('Circuit breaker opened due to repeated failures');
    }

    this.logger.error('Connection error', { error: error.message });
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnection(): void {
    const delay = this.connectionConfig.reconnectDelay * Math.pow(2, this.reconnectAttempts);

    this.logger.log(`Scheduling reconnection attempt ${this.reconnectAttempts + 1} in ${delay}ms`);

    setTimeout(() => {
      if (this.sessionContext) {
        this.reconnectAttempts++;
        this.connectionMetrics.reconnectCount++;
        this.connect(this.sessionContext).catch((error) => {
          this.logger.error('Reconnection failed', { error: error.message });
        });
      }
    }, delay);
  }

  /**
   * Reject all pending requests
   */
  private rejectPendingRequests(error: ValidationLayerError): void {
    for (const [messageId, pendingRequest] of this.pendingRequests) {
      clearTimeout(pendingRequest.timeout);
      pendingRequest.reject(error);
    }
    this.pendingRequests.clear();
  }

  /**
   * Clear heartbeat timer
   */
  private clearHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Update average response time metric
   */
  private updateAverageResponseTime(responseTime: number): void {
    const currentAverage = this.connectionMetrics.averageResponseTime;
    const messageCount = this.connectionMetrics.messagesReceived;

    this.connectionMetrics.averageResponseTime =
      ((currentAverage * (messageCount - 1)) + responseTime) / messageCount;
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Disconnect from WebSocket server
   */
  async disconnect(): Promise<void> {
    if (!this.isConnected && !this.isConnecting) {
      return;
    }

    this.clearHeartbeat();
    this.rejectPendingRequests(new ValidationLayerError(
      'Client disconnecting',
      'CLIENT_DISCONNECT'
    ));

    if (this.websocket) {
      this.websocket.close(1000, 'Client disconnect');
      this.websocket = null;
    }

    this.isConnected = false;
    this.isConnecting = false;
    this.sessionContext = null;

    this.logger.log('WebSocket client disconnected');
  }

  /**
   * Get connection metrics
   */
  getMetrics(): ConnectionMetrics {
    return { ...this.connectionMetrics };
  }

  /**
   * Get connection status
   */
  getStatus(): { connected: boolean; connecting: boolean; circuitBreakerState: CircuitBreakerState } {
    return {
      connected: this.isConnected,
      connecting: this.isConnecting,
      circuitBreakerState: this.circuitBreakerState,
    };
  }

  /**
   * Application shutdown handler
   */
  async onApplicationShutdown(): Promise<void> {
    await this.disconnect();
  }
}

// ===== SUPPORTING INTERFACES =====

interface PendingRequest {
  request: ValidationRequest;
  resolve: (response: ValidationResponse) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
  startTime: number;
}

enum CircuitBreakerState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open',
}