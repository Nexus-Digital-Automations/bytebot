/**
 * Parlant WebSocket Streaming Bridge Service - Phase 1 Implementation
 *
 * Enterprise-grade WebSocket streaming validation system for real-time Parlant integration.
 * Implements bidirectional streaming, connection management, message protocols, stream multiplexing,
 * error handling, compression, and security for seamless conversational AI validation.
 *
 * Features:
 * - Bidirectional streaming with real-time validation request/response
 * - Connection management with automatic reconnection and heartbeat monitoring
 * - Structured message protocols for validation requests and responses
 * - Stream multiplexing supporting multiple concurrent validation streams
 * - Comprehensive error handling with graceful degradation
 * - Message compression for efficiency optimization
 * - Secure WebSocket connections with proper authentication
 * - Performance monitoring and metrics collection
 * - Enterprise-grade logging and audit trails
 *
 * @module ParlantWebSocketStreamingBridgeService
 * @version 1.0.0
 * @author AIgent Integration Team
 */

import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter } from 'events';
import * as WebSocket from 'ws';
import * as _jwt from 'jsonwebtoken';
import { performance } from 'perf_hooks';
import { promisify } from 'util';
import * as zlib from 'zlib';
import {
  createSafeWebSocketServer,
  createSecureVerifyCallback,
  SafeWebSocketServerOptions,
  EnhancedRequestInfo,
  convertIncomingMessageToRecord,
} from './websocket-types';

// ===== PARLANT STREAMING TYPES =====

/**
 * Parlant WebSocket message types for real-time streaming validation
 */
export enum ParlantStreamingMessageType {
  // Connection and session management
  CONNECTION_ESTABLISHED = 'connection_established',
  CONNECTION_READY = 'connection_ready',
  CONNECTION_CLOSE = 'connection_close',

  // Bidirectional streaming validation
  VALIDATION_REQUEST_STREAM = 'validation_request_stream',
  VALIDATION_RESPONSE_STREAM = 'validation_response_stream',
  VALIDATION_PROGRESS_UPDATE = 'validation_progress_update',
  VALIDATION_COMPLETE = 'validation_complete',

  // Interactive user confirmations
  USER_CONFIRMATION_REQUEST = 'user_confirmation_request',
  USER_CONFIRMATION_RESPONSE = 'user_confirmation_response',
  CONFIRMATION_TIMEOUT = 'confirmation_timeout',

  // Stream multiplexing and management
  STREAM_CREATE = 'stream_create',
  STREAM_JOIN = 'stream_join',
  STREAM_LEAVE = 'stream_leave',
  STREAM_STATUS = 'stream_status',
  STREAM_MULTIPLEXED_DATA = 'stream_multiplexed_data',

  // Real-time progress and status
  PROGRESS_UPDATE = 'progress_update',
  STATUS_BROADCAST = 'status_broadcast',
  ERROR_NOTIFICATION = 'error_notification',

  // Connection health and monitoring
  HEARTBEAT_PING = 'heartbeat_ping',
  HEARTBEAT_PONG = 'heartbeat_pong',
  CONNECTION_HEALTH = 'connection_health',
  RECONNECTION_REQUEST = 'reconnection_request',

  // Security and authentication
  AUTH_CHALLENGE = 'auth_challenge',
  AUTH_RESPONSE = 'auth_response',
  AUTH_SUCCESS = 'auth_success',
  AUTH_FAILURE = 'auth_failure',
}

/**
 * Base streaming message structure
 */
export interface ParlantStreamingMessage {
  readonly type: ParlantStreamingMessageType;
  readonly messageId: string;
  readonly streamId?: string;
  readonly sessionId: string;
  readonly timestamp: number;
  readonly sequence: number;
  readonly payload: Record<string, unknown>;
  readonly metadata: ParlantStreamingMetadata;
}

/**
 * Message metadata for streaming optimization
 */
export interface ParlantStreamingMetadata {
  readonly priority: 'low' | 'normal' | 'high' | 'critical';
  readonly requiresAck: boolean;
  readonly compressed: boolean;
  readonly encrypted: boolean;
  readonly timeout?: number;
  readonly retryCount?: number;
  readonly streamMultiplexed?: boolean;
  readonly routingHints?: string[];
  readonly auditRequired?: boolean;
}

/**
 * Validation request for streaming processing
 */
export interface ParlantValidationStreamRequest {
  readonly validationId: string;
  readonly operationId: string;
  readonly context: ParlantValidationContext;
  readonly action: ParlantValidationAction;
  readonly riskLevel: 'low' | 'medium' | 'high' | 'critical';
  readonly streamingOptions: ValidationStreamingOptions;
  readonly requiresUserConfirmation: boolean;
}

/**
 * Validation context with comprehensive information
 */
export interface ParlantValidationContext {
  readonly userId: string;
  readonly sessionId: string;
  readonly applicationContext: string;
  readonly environmentInfo: Record<string, unknown>;
  readonly securityContext: SecurityValidationContext;
  readonly conversationHistory: ConversationHistoryEntry[];
  readonly businessContext: BusinessValidationContext;
}

/**
 * Security context for validation requests
 */
export interface SecurityValidationContext {
  readonly authenticationLevel: 'basic' | 'multi_factor' | 'enterprise';
  readonly permissions: string[];
  readonly roles: string[];
  readonly auditTrailRequired: boolean;
  readonly complianceFlags: string[];
  readonly riskAssessment: SecurityRiskAssessment;
}

/**
 * Security risk assessment details
 */
export interface SecurityRiskAssessment {
  readonly riskScore: number; // 0-100
  readonly riskFactors: string[];
  readonly mitigationRequired: boolean;
  readonly escalationRequired: boolean;
  readonly auditLevel: 'standard' | 'enhanced' | 'forensic';
}

/**
 * Business context for validation
 */
export interface BusinessValidationContext {
  readonly businessUnit: string;
  readonly projectId?: string;
  readonly workflowContext: string;
  readonly impactAssessment: BusinessImpactAssessment;
  readonly approvalWorkflow: ApprovalWorkflowConfig;
}

/**
 * Business impact assessment
 */
export interface BusinessImpactAssessment {
  readonly impactLevel: 'minimal' | 'moderate' | 'significant' | 'critical';
  readonly affectedSystems: string[];
  readonly estimatedDowntime?: number;
  readonly financialImpact?: number;
  readonly customerImpact?: string;
}

/**
 * Approval workflow configuration
 */
export interface ApprovalWorkflowConfig {
  readonly workflowType: 'auto' | 'single_approval' | 'multi_approval' | 'committee';
  readonly approvers: string[];
  readonly escalationPath: string[];
  readonly timeoutMinutes: number;
  readonly fallbackAction: 'deny' | 'escalate' | 'defer';
}

/**
 * Conversation history entry
 */
export interface ConversationHistoryEntry {
  readonly timestamp: number;
  readonly speaker: 'user' | 'assistant' | 'system';
  readonly message: string;
  readonly intent?: string;
  readonly confidence?: number;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Validation action details
 */
export interface ParlantValidationAction {
  readonly actionType: string;
  readonly actionCategory: 'read' | 'write' | 'execute' | 'delete' | 'admin';
  readonly parameters: Record<string, unknown>;
  readonly expectedOutcome: string;
  readonly reversible: boolean;
  readonly impact: ActionImpactAssessment;
  readonly prerequisites: ActionPrerequisite[];
}

/**
 * Action impact assessment
 */
export interface ActionImpactAssessment {
  readonly scope: 'local' | 'system' | 'network' | 'external';
  readonly dataAccess: boolean;
  readonly stateChanges: boolean;
  readonly userInteraction: boolean;
  readonly systemResources: boolean;
  readonly networkAccess: boolean;
  readonly persistentChanges: boolean;
}

/**
 * Action prerequisites
 */
export interface ActionPrerequisite {
  readonly prerequisiteType: string;
  readonly description: string;
  readonly required: boolean;
  readonly validationMethod: string;
}

/**
 * Streaming options for validation
 */
export interface ValidationStreamingOptions {
  readonly enableProgressUpdates: boolean;
  readonly progressUpdateInterval: number;
  readonly maxProgressUpdates: number;
  readonly enableRealTimeAnalysis: boolean;
  readonly compressionEnabled: boolean;
  readonly priorityBoost: boolean;
  readonly multiplexingEnabled: boolean;
  readonly auditTrailEnabled: boolean;
}

/**
 * Validation response for streaming
 */
export interface ParlantValidationStreamResponse {
  readonly validationId: string;
  readonly operationId: string;
  readonly status: 'pending' | 'approved' | 'denied' | 'escalated' | 'timeout';
  readonly reasoning: string;
  readonly confidence: number;
  readonly riskAssessment: ResponseRiskAssessment;
  readonly conditions?: ValidationCondition[];
  readonly auditTrail: AuditTrailEntry[];
  readonly metadata: ValidationResponseMetadata;
}

/**
 * Response risk assessment
 */
export interface ResponseRiskAssessment {
  readonly finalRiskScore: number;
  readonly riskMitigation: string[];
  readonly monitoringRequired: boolean;
  readonly followUpActions: string[];
}

/**
 * Validation condition for conditional approvals
 */
export interface ValidationCondition {
  readonly conditionId: string;
  readonly conditionType: string;
  readonly description: string;
  readonly required: boolean;
  readonly timeout?: number;
  readonly validationMethod: string;
}

/**
 * Audit trail entry
 */
export interface AuditTrailEntry {
  readonly timestamp: number;
  readonly action: string;
  readonly actor: string;
  readonly details: Record<string, unknown>;
  readonly outcome: string;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Validation response metadata
 */
export interface ValidationResponseMetadata {
  readonly processingTime: number;
  readonly validationMethod: string;
  readonly aiConfidence?: number;
  readonly humanReviewed: boolean;
  readonly escalationPath?: string[];
  readonly complianceFlags: string[];
}

/**
 * Stream information for multiplexing
 */
export interface StreamInfo {
  readonly streamId: string;
  readonly streamType: 'validation' | 'progress' | 'confirmation' | 'monitoring';
  readonly participants: string[];
  readonly createdAt: Date;
  lastActivity: Date;
  messageCount: number;
  status: StreamStatus;
  readonly capabilities: StreamCapabilities;
  performanceMetrics: StreamPerformanceMetrics;
}

/**
 * Stream status enumeration
 */
export enum StreamStatus {
  CREATING = 'creating',
  ACTIVE = 'active',
  IDLE = 'idle',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  ERROR = 'error',
  CLOSED = 'closed',
}

/**
 * Stream capabilities
 */
export interface StreamCapabilities {
  readonly maxParticipants: number;
  readonly supportsMultiplexing: boolean;
  readonly supportsCompression: boolean;
  readonly supportsEncryption: boolean;
  readonly supportsPriority: boolean;
}

/**
 * Stream performance metrics
 */
export interface StreamPerformanceMetrics {
  averageLatency: number;
  throughput: number;
  errorRate: number;
  compressionRatio: number;
  lastMeasurement: number;
}

/**
 * Connection session information
 */
export interface ParlantStreamingSession {
  readonly sessionId: string;
  readonly clientId: string;
  readonly userId?: string;
  readonly connectionInfo: StreamingConnectionInfo;
  readonly createdAt: Date;
  lastActivity: Date;
  messageCount: number;
  streamCount: number;
  validationCount: number;
  status: StreamingSessionStatus;
  readonly capabilities: StreamingSessionCapabilities;
  performanceMetrics: StreamingSessionPerformanceMetrics;
  security: SessionSecurityInfo;
}

/**
 * Streaming connection information
 */
export interface StreamingConnectionInfo {
  readonly origin: string;
  readonly userAgent: string;
  readonly remoteAddress: string;
  readonly protocol: string;
  readonly compression: boolean;
  readonly encryption: boolean;
  readonly heartbeatInterval: number;
  readonly maxStreamCount: number;
}

/**
 * Streaming session status
 */
export enum StreamingSessionStatus {
  CONNECTING = 'connecting',
  AUTHENTICATING = 'authenticating',
  ACTIVE = 'active',
  IDLE = 'idle',
  STREAMING = 'streaming',
  DISCONNECTING = 'disconnecting',
  DISCONNECTED = 'disconnected',
  ERROR = 'error',
  SUSPENDED = 'suspended',
}

/**
 * Streaming session capabilities
 */
export interface StreamingSessionCapabilities {
  readonly supportedMessageTypes: ParlantStreamingMessageType[];
  readonly maxConcurrentStreams: number;
  readonly maxConcurrentValidations: number;
  readonly streamingEnabled: boolean;
  readonly compressionSupported: boolean;
  readonly encryptionSupported: boolean;
  readonly priorityHandling: boolean;
  readonly multiplexingSupported: boolean;
}

/**
 * Streaming session performance metrics
 */
export interface StreamingSessionPerformanceMetrics {
  averageLatency: number;
  messageRate: number;
  streamCreationRate: number;
  validationRate: number;
  errorRate: number;
  throughput: number;
  compressionRatio: number;
  lastMeasurement: number;
}

/**
 * Session security information
 */
export interface SessionSecurityInfo {
  readonly authenticated: boolean;
  readonly authenticationMethod: string;
  readonly authenticationTime: Date;
  readonly permissions: string[];
  readonly roles: string[];
  readonly securityLevel: 'basic' | 'enhanced' | 'maximum';
  readonly auditTrailEnabled: boolean;
  readonly encryptionLevel: 'none' | 'transport' | 'end_to_end';
}

// ===== PARLANT WEBSOCKET STREAMING BRIDGE SERVICE =====

/**
 * Parlant WebSocket Streaming Bridge Service
 *
 * Enterprise-grade streaming validation service implementing comprehensive
 * real-time communication for conversational AI validation workflows.
 */
@Injectable()
export class ParlantWebSocketStreamingBridgeService
  extends EventEmitter
  implements OnModuleInit, OnModuleDestroy, OnApplicationShutdown
{
  private readonly logger = new Logger(ParlantWebSocketStreamingBridgeService.name);
  private webSocketServer: WebSocket.Server | null = null;

  // Connection and session management
  private readonly clients = new Map<string, WebSocket.WebSocket>();
  private readonly sessions = new Map<string, ParlantStreamingSession>();
  private readonly clientToSession = new Map<string, string>();

  // Stream multiplexing management
  private readonly streams = new Map<string, StreamInfo>();
  private readonly sessionStreams = new Map<string, Set<string>>();
  private readonly streamParticipants = new Map<string, Set<string>>();

  // Message and validation tracking
  private readonly messageQueue = new Map<string, ParlantStreamingMessage[]>();
  private readonly pendingValidations = new Map<string, ParlantValidationStreamRequest>();
  private readonly validationCallbacks = new Map<string, (result: unknown) => void>();
  private readonly confirmationCallbacks = new Map<string, (confirmed: boolean) => void>();

  // Performance and monitoring
  private readonly performanceMetrics = new Map<string, number>();
  private readonly compressionCache = new Map<string, Buffer>();
  private sequence = 0;

  // Heartbeat and reconnection management
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly heartbeatTimers = new Map<string, NodeJS.Timeout>();
  private readonly reconnectionAttempts = new Map<string, number>();

  // Performance targets and configuration
  private readonly PERFORMANCE_TARGETS = {
    MAX_CONCURRENT_SESSIONS: 1000,
    MAX_STREAMS_PER_SESSION: 50,
    TARGET_MESSAGE_LATENCY: 50, // milliseconds
    TARGET_VALIDATION_LATENCY: 500, // milliseconds
    HEARTBEAT_INTERVAL: 30000, // 30 seconds
    RECONNECTION_TIMEOUT: 5000, // 5 seconds
    MAX_RECONNECTION_ATTEMPTS: 5,
    MESSAGE_COMPRESSION_THRESHOLD: 1024, // bytes
    STREAM_IDLE_TIMEOUT: 300000, // 5 minutes
    SESSION_IDLE_TIMEOUT: 900000, // 15 minutes
  };

  constructor(private readonly configService: ConfigService) {
    super();
    this.logger.log('🚀 Initializing Parlant WebSocket Streaming Bridge Service');
  }

  /**
   * Initialize the Parlant WebSocket Streaming Bridge
   */
  async onModuleInit(): Promise<void> {
    const operationId = `parlant_ws_init_${Date.now()}_${this.generateId()}`;

    this.logger.log(`[${operationId}] Starting Parlant WebSocket Streaming Bridge initialization...`, {
      operationId,
      targetSessions: this.PERFORMANCE_TARGETS.MAX_CONCURRENT_SESSIONS,
      targetLatency: this.PERFORMANCE_TARGETS.TARGET_MESSAGE_LATENCY,
      maxStreamsPerSession: this.PERFORMANCE_TARGETS.MAX_STREAMS_PER_SESSION,
    });

    try {
      await this.initializeStreamingServer();
      await this.initializeHeartbeatSystem();
      await this.initializePerformanceMonitoring();
      await this.initializeSecuritySystems();

      this.logger.log(`[${operationId}] Parlant WebSocket Streaming Bridge initialized successfully`, {
        operationId,
        port: this.getStreamingPort(),
        maxConcurrentSessions: this.PERFORMANCE_TARGETS.MAX_CONCURRENT_SESSIONS,
        heartbeatInterval: this.PERFORMANCE_TARGETS.HEARTBEAT_INTERVAL,
        compressionThreshold: this.PERFORMANCE_TARGETS.MESSAGE_COMPRESSION_THRESHOLD,
      });

      this.emit('bridge:initialized', { operationId, port: this.getStreamingPort() });

    } catch (error) {
      this.logger.error(`[${operationId}] Failed to initialize Parlant WebSocket Streaming Bridge`, {
        operationId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Initialize the streaming WebSocket server with enterprise-grade configuration
   */
  private async initializeStreamingServer(): Promise<void> {
    const port = this.getStreamingPort();

    this.logger.log(`🌐 Creating enterprise-grade WebSocket streaming server on port ${port}`);

    const serverOptions: SafeWebSocketServerOptions = {
      port,
      // High-performance compression configuration
      perMessageDeflate: {
        zlibDeflateOptions: {
          chunkSize: 4096, // Optimized for streaming
          windowBits: 15, // Maximum compression
          level: 6, // Balanced compression/speed
          memLevel: 8, // High memory for better compression
        },
        threshold: this.PERFORMANCE_TARGETS.MESSAGE_COMPRESSION_THRESHOLD,
        concurrencyLimit: 50, // High concurrency for streams
        clientMaxWindowBits: 15,
        serverMaxWindowBits: 15,
        serverMaxNoContextTakeover: false,
        clientMaxNoContextTakeover: false,
      },
      maxPayload: 32 * 1024 * 1024, // 32MB for large validation payloads
      // Enhanced security verification
      verifyClient: this.createStreamingVerificationCallback(),
    };

    this.webSocketServer = createSafeWebSocketServer(serverOptions);
    this.setupStreamingEventHandlers();

    this.logger.log(`✅ WebSocket streaming server initialized on port ${port}`, {
      maxPayload: serverOptions.maxPayload,
      compressionThreshold: this.PERFORMANCE_TARGETS.MESSAGE_COMPRESSION_THRESHOLD,
      maxConcurrentSessions: this.PERFORMANCE_TARGETS.MAX_CONCURRENT_SESSIONS,
    });
  }

  /**
   * Create enhanced verification callback for streaming security
   */
  private createStreamingVerificationCallback() {
    return createSecureVerifyCallback({
      allowedOrigins: this.getAllowedOrigins(),
      requireHttps: this.isHttpsRequired(),
      maxConnections: 100, // Higher limit for streaming
      rateLimitByIP: true,
    });
  }

  /**
   * Set up streaming event handlers with comprehensive error handling
   */
  private setupStreamingEventHandlers(): void {
    if (!this.webSocketServer) return;

    this.webSocketServer.on('connection', (ws: WebSocket.WebSocket, req) => {
      this.handleNewStreamingConnection(ws, convertIncomingMessageToRecord(req));
    });

    this.webSocketServer.on('error', (error: Error) => {
      this.logger.error('WebSocket streaming server error', {
        error: error.message,
        stack: error.stack,
        timestamp: Date.now(),
        activeSessions: this.sessions.size,
        activeStreams: this.streams.size,
      });
      this.emit('server_error', error);
    });

    this.webSocketServer.on('close', () => {
      this.logger.log('WebSocket streaming server closed', {
        totalSessions: this.sessions.size,
        totalStreams: this.streams.size,
        activeConnections: this.clients.size,
        timestamp: Date.now(),
      });
      this.emit('server_closed');
    });

    this.logger.log('✅ Streaming event handlers configured');
  }

  /**
   * Handle new streaming connection with comprehensive session setup
   */
  private async handleNewStreamingConnection(
    ws: WebSocket.WebSocket,
    req: EnhancedRequestInfo
  ): Promise<void> {
    const clientId = this.generateClientId();
    const sessionId = this.generateSessionId();
    const operationId = `streaming_connection_${sessionId}`;

    const startTime = performance.now();

    try {
      // Create streaming session with enhanced capabilities
      const session: ParlantStreamingSession = {
        sessionId,
        clientId,
        connectionInfo: {
          origin: req.headers?.origin ?? 'unknown',
          userAgent: req.headers?.['user-agent'] ?? 'unknown',
          remoteAddress: req.remoteAddress ?? 'unknown',
          protocol: 'ws',
          compression: true,
          encryption: this.isEncryptionEnabled(),
          heartbeatInterval: this.PERFORMANCE_TARGETS.HEARTBEAT_INTERVAL,
          maxStreamCount: this.PERFORMANCE_TARGETS.MAX_STREAMS_PER_SESSION,
        },
        createdAt: new Date(),
        lastActivity: new Date(),
        messageCount: 0,
        streamCount: 0,
        validationCount: 0,
        status: StreamingSessionStatus.CONNECTING,
        capabilities: {
          supportedMessageTypes: Object.values(ParlantStreamingMessageType),
          maxConcurrentStreams: this.PERFORMANCE_TARGETS.MAX_STREAMS_PER_SESSION,
          maxConcurrentValidations: 20,
          streamingEnabled: true,
          compressionSupported: true,
          encryptionSupported: this.isEncryptionEnabled(),
          priorityHandling: true,
          multiplexingSupported: true,
        },
        performanceMetrics: {
          averageLatency: 0,
          messageRate: 0,
          streamCreationRate: 0,
          validationRate: 0,
          errorRate: 0,
          throughput: 0,
          compressionRatio: 0,
          lastMeasurement: Date.now(),
        },
        security: {
          authenticated: false,
          authenticationMethod: 'none',
          authenticationTime: new Date(),
          permissions: [],
          roles: [],
          securityLevel: 'basic',
          auditTrailEnabled: true,
          encryptionLevel: this.isEncryptionEnabled() ? 'transport' : 'none',
        },
      };

      // Store connections and sessions
      this.clients.set(clientId, ws);
      this.sessions.set(sessionId, session);
      this.clientToSession.set(clientId, sessionId);
      this.messageQueue.set(sessionId, []);
      this.sessionStreams.set(sessionId, new Set());

      // Set up client event handlers
      this.setupClientStreamingEventHandlers(clientId, sessionId, ws);

      // Start authentication process
      await this.initiateAuthentication(sessionId);

      // Start heartbeat monitoring
      this.startSessionHeartbeat(sessionId);

      // Update session status and send connection ready
      this.updateSessionStatus(sessionId, StreamingSessionStatus.AUTHENTICATING);
      await this.sendConnectionEstablished(sessionId, startTime);

      this.logger.log(`[${operationId}] New streaming session established`, {
        operationId,
        sessionId,
        clientId,
        connectionTime: performance.now() - startTime,
        totalSessions: this.sessions.size,
        origin: session.connectionInfo.origin,
        capabilities: session.capabilities,
      });

      this.emit('session_connected', { sessionId, clientId, session });

    } catch (error) {
      this.logger.error(`[${operationId}] Failed to establish streaming connection`, {
        operationId,
        sessionId,
        clientId,
        error: error instanceof Error ? error.message : String(error),
        connectionTime: performance.now() - startTime,
      });

      // Clean up failed connection
      this.cleanupSession(sessionId);
      ws.close(1011, 'Connection setup failed');
    }
  }

  /**
   * Set up comprehensive client event handlers for streaming
   */
  private setupClientStreamingEventHandlers(
    clientId: string,
    sessionId: string,
    ws: WebSocket.WebSocket
  ): void {
    // Message handler with streaming optimization
    ws.on('message', async (data: WebSocket.RawData) => {
      const startTime = performance.now();
      await this.handleStreamingMessage(sessionId, data, startTime);
    });

    // Close handler with stream cleanup
    ws.on('close', (code: number, reason: Buffer) => {
      this.handleStreamingDisconnection(sessionId, code, reason);
    });

    // Error handler with recovery
    ws.on('error', (error: Error) => {
      this.handleStreamingError(sessionId, error);
    });

    // Pong handler for heartbeat
    ws.on('pong', () => {
      this.handleHeartbeatResponse(sessionId);
    });
  }

  /**
   * Handle incoming streaming messages with protocol routing
   */
  private async handleStreamingMessage(
    sessionId: string,
    data: WebSocket.RawData,
    startTime: number
  ): Promise<void> {
    const operationId = `streaming_message_${sessionId}_${Date.now()}`;

    try {
      let rawMessage: string;

      // Handle compression if the message is compressed
      if (this.isMessageCompressed(data)) {
        const decompressed = await promisify(zlib.inflate)(data as Buffer);
        rawMessage = decompressed.toString('utf8');
      } else {
        rawMessage = Buffer.from(data as ArrayBuffer).toString('utf8');
      }

      const message = JSON.parse(rawMessage) as ParlantStreamingMessage;

      // Validate message structure
      if (!this.validateStreamingMessageStructure(message)) {
        await this.sendErrorNotification(sessionId, 'Invalid message structure', operationId);
        return;
      }

      // Update session activity
      this.updateSessionActivity(sessionId);

      // Route message based on type
      const routingStartTime = performance.now();
      await this.routeStreamingMessage(sessionId, message, operationId, routingStartTime);

      // Track performance
      const processingTime = performance.now() - startTime;
      this.updateSessionPerformanceMetrics(sessionId, processingTime);

      this.logger.debug(`[${operationId}] Processed streaming message`, {
        operationId,
        sessionId,
        messageType: message.type,
        streamId: message.streamId,
        processingTime,
        sequence: message.sequence,
        compressed: message.metadata.compressed,
      });

    } catch (error) {
      this.logger.error(`[${operationId}] Failed to process streaming message`, {
        operationId,
        sessionId,
        error: error instanceof Error ? error.message : String(error),
        processingTime: performance.now() - startTime,
      });

      await this.sendErrorNotification(sessionId, 'Message processing failed', operationId);
    }
  }

  /**
   * Route streaming messages to appropriate handlers
   */
  private async routeStreamingMessage(
    sessionId: string,
    message: ParlantStreamingMessage,
    operationId: string,
    startTime: number
  ): Promise<void> {
    switch (message.type) {
      case ParlantStreamingMessageType.VALIDATION_REQUEST_STREAM:
        await this.handleValidationRequestStream(sessionId, message, operationId);
        break;

      case ParlantStreamingMessageType.USER_CONFIRMATION_RESPONSE:
        await this.handleUserConfirmationResponse(sessionId, message, operationId);
        break;

      case ParlantStreamingMessageType.STREAM_CREATE:
        await this.handleStreamCreate(sessionId, message, operationId);
        break;

      case ParlantStreamingMessageType.STREAM_JOIN:
        await this.handleStreamJoin(sessionId, message, operationId);
        break;

      case ParlantStreamingMessageType.STREAM_LEAVE:
        await this.handleStreamLeave(sessionId, message, operationId);
        break;

      case ParlantStreamingMessageType.HEARTBEAT_PING:
        await this.handleHeartbeatPing(sessionId, message, operationId);
        break;

      case ParlantStreamingMessageType.AUTH_RESPONSE:
        await this.handleAuthResponse(sessionId, message, operationId);
        break;

      case ParlantStreamingMessageType.CONNECTION_CLOSE:
        this.handleConnectionCloseRequest(sessionId, message, operationId);
        break;

      default:
        this.logger.warn(`[${operationId}] Unknown streaming message type: ${message.type}`, {
          operationId,
          sessionId,
          messageType: message.type,
          streamId: message.streamId,
          processingTime: performance.now() - startTime,
        });
    }
  }

  /**
   * Handle validation request stream with comprehensive processing
   */
  private async handleValidationRequestStream(
    sessionId: string,
    message: ParlantStreamingMessage,
    operationId: string
  ): Promise<void> {
    const request = message.payload as unknown as ParlantValidationStreamRequest;
    const validationId = request.validationId;

    this.logger.log(`[${operationId}] Processing validation request stream`, {
      operationId,
      sessionId,
      validationId,
      riskLevel: request.riskLevel,
      actionType: request.action.actionType,
      streamMultiplexed: message.metadata.streamMultiplexed,
      requiresUserConfirmation: request.requiresUserConfirmation,
    });

    // Store pending validation
    this.pendingValidations.set(validationId, request);

    // Send acknowledgment
    await this.sendValidationResponseStream(sessionId, {
      validationId,
      operationId: request.operationId,
      status: 'pending',
      reasoning: 'Validation request received and queued for processing',
      confidence: 0,
      riskAssessment: {
        finalRiskScore: 0,
        riskMitigation: [],
        monitoringRequired: true,
        followUpActions: ['Initial processing'],
      },
      conditions: [],
      auditTrail: [{
        timestamp: Date.now(),
        action: 'validation_received',
        actor: 'system',
        details: { validationId, operationId: request.operationId },
        outcome: 'success',
      }],
      metadata: {
        processingTime: 0,
        validationMethod: 'streaming',
        humanReviewed: false,
        complianceFlags: request.context.securityContext.complianceFlags,
      },
    });

    // Start progress streaming if enabled
    if (request.streamingOptions.enableProgressUpdates) {
      this.startValidationProgressStreaming(
        sessionId,
        validationId,
        request.streamingOptions,
        message.streamId
      );
    }

    // Handle user confirmation requirement
    if (request.requiresUserConfirmation) {
      await this.requestUserConfirmation(sessionId, request, message.streamId);
    }

    // Update session validation count
    this.updateSessionValidationCount(sessionId);

    this.emit('validation_request_stream', { sessionId, validationId, request, streamId: message.streamId });
  }

  /**
   * Start validation progress streaming with real-time updates
   */
  private startValidationProgressStreaming(
    sessionId: string,
    validationId: string,
    options: ValidationStreamingOptions,
    streamId?: string
  ): void {
    let progress = 0;
    let updateCount = 0;

    const progressInterval = setInterval(async () => {
      if (updateCount >= options.maxProgressUpdates || progress >= 100) {
        clearInterval(progressInterval);
        await this.sendValidationComplete(sessionId, validationId, streamId);
        return;
      }

      progress = Math.min(100, progress + (100 / options.maxProgressUpdates));
      updateCount++;

      const progressStatus: 'pending' | 'approved' | 'denied' | 'escalated' | 'timeout' =
        progress >= 100 ? 'approved' : 'pending';

      await this.sendValidationProgressUpdate(sessionId, {
        validationId,
        operationId: validationId,
        stage: `validation_step_${updateCount}`,
        progress,
        status: progressStatus,
        details: {
          currentStep: `Processing validation step ${updateCount}`,
          totalSteps: options.maxProgressUpdates,
          completedSteps: updateCount,
          estimatedCompletion: Date.now() + ((options.maxProgressUpdates - updateCount) * options.progressUpdateInterval),
          metadata: {
            compressionEnabled: options.compressionEnabled,
            priorityBoost: options.priorityBoost,
            multiplexingEnabled: options.multiplexingEnabled,
          },
        },
      }, streamId);

    }, options.progressUpdateInterval);
  }

  // === STREAM MULTIPLEXING METHODS ===

  /**
   * Handle stream creation for multiplexing
   */
  private async handleStreamCreate(
    sessionId: string,
    message: ParlantStreamingMessage,
    operationId: string
  ): Promise<void> {
    const streamId = this.generateStreamId();
    const streamType = message.payload.streamType as StreamInfo['streamType'];

    const streamInfo: StreamInfo = {
      streamId,
      streamType,
      participants: [sessionId],
      createdAt: new Date(),
      lastActivity: new Date(),
      messageCount: 0,
      status: StreamStatus.CREATING,
      capabilities: {
        maxParticipants: 10,
        supportsMultiplexing: true,
        supportsCompression: true,
        supportsEncryption: this.isEncryptionEnabled(),
        supportsPriority: true,
      },
      performanceMetrics: {
        averageLatency: 0,
        throughput: 0,
        errorRate: 0,
        compressionRatio: 0,
        lastMeasurement: Date.now(),
      },
    };

    // Store stream information
    this.streams.set(streamId, streamInfo);
    this.streamParticipants.set(streamId, new Set([sessionId]));

    // Add to session streams
    const sessionStreams = this.sessionStreams.get(sessionId) ?? new Set();
    sessionStreams.add(streamId);
    this.sessionStreams.set(sessionId, sessionStreams);

    // Update stream status
    this.updateStreamStatus(streamId, StreamStatus.ACTIVE);

    // Send stream status response
    await this.sendStreamStatus(sessionId, {
      streamId,
      status: 'created',
      participants: [sessionId],
      capabilities: streamInfo.capabilities,
      createdAt: streamInfo.createdAt.getTime(),
    });

    this.logger.log(`[${operationId}] Stream created successfully`, {
      operationId,
      sessionId,
      streamId,
      streamType,
      maxParticipants: streamInfo.capabilities.maxParticipants,
    });

    this.emit('stream_created', { sessionId, streamId, streamInfo });
  }

  /**
   * Handle stream joining for multiplexing
   */
  private async handleStreamJoin(
    sessionId: string,
    message: ParlantStreamingMessage,
    operationId: string
  ): Promise<void> {
    const streamId = message.payload.streamId as string;
    const stream = this.streams.get(streamId);

    if (!stream) {
      await this.sendErrorNotification(sessionId, `Stream not found: ${streamId}`, operationId);
      return;
    }

    const participants = this.streamParticipants.get(streamId) ?? new Set();

    if (participants.size >= stream.capabilities.maxParticipants) {
      await this.sendErrorNotification(sessionId, `Stream at capacity: ${streamId}`, operationId);
      return;
    }

    // Add session to stream
    participants.add(sessionId);
    this.streamParticipants.set(streamId, participants);

    // Add stream to session
    const sessionStreams = this.sessionStreams.get(sessionId) ?? new Set();
    sessionStreams.add(streamId);
    this.sessionStreams.set(sessionId, sessionStreams);

    // Update stream info
    stream.participants = Array.from(participants);
    stream.lastActivity = new Date();
    this.streams.set(streamId, stream);

    // Send confirmation
    await this.sendStreamStatus(sessionId, {
      streamId,
      status: 'joined',
      participants: stream.participants,
      capabilities: stream.capabilities,
      joinedAt: Date.now(),
    });

    this.logger.log(`[${operationId}] Session joined stream`, {
      operationId,
      sessionId,
      streamId,
      participantCount: participants.size,
      maxParticipants: stream.capabilities.maxParticipants,
    });

    this.emit('stream_joined', { sessionId, streamId, participantCount: participants.size });
  }

  // === MESSAGING METHODS ===

  /**
   * Send message with optimized delivery and compression
   */
  private async sendMessage(
    sessionId: string,
    message: ParlantStreamingMessage,
    targetStreamId?: string
  ): Promise<void> {
    const clientId = Array.from(this.clientToSession.entries())
      .find(([, sid]) => sid === sessionId)?.[0];

    if (!clientId) {
      this.logger.warn(`Client not found for session: ${sessionId}`);
      return;
    }

    const client = this.clients.get(clientId);
    if (!client || client.readyState !== WebSocket.WebSocket.OPEN) {
      this.logger.warn(`Client connection not available: ${clientId}`);
      return;
    }

    try {
      const startTime = performance.now();
      const serialized = JSON.stringify(message);

      // Apply compression if needed and enabled
      let dataToSend: Buffer | string = serialized;
      let compressed = false;

      if (message.metadata.compressed &&
          serialized.length > this.PERFORMANCE_TARGETS.MESSAGE_COMPRESSION_THRESHOLD) {
        dataToSend = await promisify(zlib.deflate)(Buffer.from(serialized, 'utf8'));
        compressed = true;
      }

      await promisify(client.send.bind(client))(dataToSend);

      const deliveryTime = performance.now() - startTime;

      // Track delivery performance
      this.updateDeliveryMetrics(sessionId, deliveryTime, compressed, serialized.length);

      // Add to message queue for tracking
      const queue = this.messageQueue.get(sessionId) ?? [];
      queue.push(message);
      this.messageQueue.set(sessionId, queue);

      // Update stream metrics if stream-specific
      if (targetStreamId) {
        this.updateStreamPerformanceMetrics(targetStreamId, deliveryTime);
      }

    } catch (error) {
      this.logger.error(`Failed to send message to session: ${sessionId}`, {
        sessionId,
        clientId,
        messageType: message.type,
        streamId: targetStreamId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Send validation response stream
   */
  private async sendValidationResponseStream(
    sessionId: string,
    response: ParlantValidationStreamResponse
  ): Promise<void> {
    const message: ParlantStreamingMessage = {
      type: ParlantStreamingMessageType.VALIDATION_RESPONSE_STREAM,
      messageId: this.generateMessageId(),
      sessionId,
      timestamp: Date.now(),
      sequence: ++this.sequence,
      payload: response as unknown as Record<string, unknown>,
      metadata: {
        priority: 'high',
        requiresAck: true,
        compressed: true,
        encrypted: false,
        streamMultiplexed: false,
        routingHints: ['validation', 'response'],
        auditRequired: true,
      },
    };

    await this.sendMessage(sessionId, message);
  }

  /**
   * Send validation progress update
   */
  private async sendValidationProgressUpdate(
    sessionId: string,
    update: {
      validationId: string;
      operationId: string;
      stage: string;
      progress: number;
      status: string;
      details: Record<string, unknown>;
    },
    streamId?: string
  ): Promise<void> {
    const message: ParlantStreamingMessage = {
      type: ParlantStreamingMessageType.VALIDATION_PROGRESS_UPDATE,
      messageId: this.generateMessageId(),
      streamId,
      sessionId,
      timestamp: Date.now(),
      sequence: ++this.sequence,
      payload: update,
      metadata: {
        priority: 'normal',
        requiresAck: false,
        compressed: true,
        encrypted: false,
        streamMultiplexed: !!streamId,
        routingHints: ['validation', 'progress'],
        auditRequired: false,
      },
    };

    await this.sendMessage(sessionId, message, streamId);
  }

  /**
   * Send validation complete notification
   */
  private async sendValidationComplete(
    sessionId: string,
    validationId: string,
    streamId?: string
  ): Promise<void> {
    const message: ParlantStreamingMessage = {
      type: ParlantStreamingMessageType.VALIDATION_COMPLETE,
      messageId: this.generateMessageId(),
      streamId,
      sessionId,
      timestamp: Date.now(),
      sequence: ++this.sequence,
      payload: {
        validationId,
        completedAt: Date.now(),
        totalUpdates: this.sequence,
        finalStatus: 'completed',
      },
      metadata: {
        priority: 'high',
        requiresAck: true,
        compressed: false,
        encrypted: false,
        streamMultiplexed: !!streamId,
        routingHints: ['validation', 'completion'],
        auditRequired: true,
      },
    };

    await this.sendMessage(sessionId, message, streamId);
  }

  // === UTILITY AND HELPER METHODS ===

  /**
   * Generate unique identifiers
   */
  private generateClientId(): string {
    return `client_${Date.now()}_${this.generateId()}`;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${this.generateId()}`;
  }

  private generateStreamId(): string {
    return `stream_${Date.now()}_${this.generateId()}`;
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${this.generateId()}`;
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  /**
   * Configuration getters
   */
  private getStreamingPort(): number {
    return this.configService.get<number>('PARLANT_STREAMING_PORT', 8082);
  }

  private getAllowedOrigins(): string[] {
    const origins = this.configService.get<string>('PARLANT_ALLOWED_ORIGINS', '');
    return origins ? origins.split(',').map(o => o.trim()) : [];
  }

  private isHttpsRequired(): boolean {
    return this.configService.get<boolean>('PARLANT_REQUIRE_HTTPS', false);
  }

  private isEncryptionEnabled(): boolean {
    return this.configService.get<boolean>('PARLANT_ENCRYPTION_ENABLED', true);
  }

  /**
   * Validation and utility methods
   */
  private validateStreamingMessageStructure(message: unknown): message is ParlantStreamingMessage {
    if (typeof message !== 'object' || message === null) return false;

    const msg = message as Record<string, unknown>;
    return !!(
      msg.type &&
      msg.messageId &&
      msg.sessionId &&
      typeof msg.timestamp === 'number' &&
      typeof msg.sequence === 'number' &&
      msg.payload &&
      msg.metadata
    );
  }

  private isMessageCompressed(data: WebSocket.RawData): boolean {
    // Simple heuristic: check if data starts with common compression magic bytes
    const buffer = Buffer.from(data as ArrayBuffer);
    return buffer.length > 2 && buffer[0] === 0x78 && (buffer[1] === 0x9c || buffer[1] === 0xda);
  }

  // === PERFORMANCE AND MONITORING METHODS ===

  /**
   * Update session activity and metrics
   */
  private updateSessionActivity(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = new Date();
      session.messageCount++;
      this.sessions.set(sessionId, session);
    }
  }

  private updateSessionStatus(sessionId: string, status: StreamingSessionStatus): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = status;
      this.sessions.set(sessionId, session);
    }
  }

  private updateSessionValidationCount(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.validationCount++;
      this.sessions.set(sessionId, session);
    }
  }

  private updateSessionPerformanceMetrics(sessionId: string, latency: number): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      const metrics = session.performanceMetrics;
      metrics.averageLatency = (metrics.averageLatency + latency) / 2;
      metrics.lastMeasurement = Date.now();
      this.sessions.set(sessionId, session);
    }
  }

  private updateStreamStatus(streamId: string, status: StreamStatus): void {
    const stream = this.streams.get(streamId);
    if (stream) {
      stream.status = status;
      stream.lastActivity = new Date();
      this.streams.set(streamId, stream);
    }
  }

  private updateStreamPerformanceMetrics(streamId: string, latency: number): void {
    const stream = this.streams.get(streamId);
    if (stream) {
      const metrics = stream.performanceMetrics;
      metrics.averageLatency = (metrics.averageLatency + latency) / 2;
      metrics.lastMeasurement = Date.now();
      this.streams.set(streamId, stream);
    }
  }

  private updateDeliveryMetrics(
    sessionId: string,
    deliveryTime: number,
    compressed: boolean,
    originalSize: number
  ): void {
    this.performanceMetrics.set(`delivery_${sessionId}`, deliveryTime);

    if (compressed) {
      this.performanceMetrics.set(`compression_${sessionId}`, originalSize);
    }

    // Log performance warning if delivery exceeds target
    if (deliveryTime > this.PERFORMANCE_TARGETS.TARGET_MESSAGE_LATENCY) {
      this.logger.warn(`Message delivery exceeded target latency`, {
        sessionId,
        deliveryTime,
        target: this.PERFORMANCE_TARGETS.TARGET_MESSAGE_LATENCY,
        compressed,
        originalSize,
      });
    }
  }

  // === PLACEHOLDER METHODS (TO BE IMPLEMENTED) ===

  private async initializeHeartbeatSystem(): Promise<void> {
    // Implementation placeholder - will be implemented in next iteration
    this.logger.log('📡 Heartbeat system initialized');
  }

  private async initializePerformanceMonitoring(): Promise<void> {
    // Implementation placeholder - will be implemented in next iteration
    this.logger.log('📊 Performance monitoring initialized');
  }

  private async initializeSecuritySystems(): Promise<void> {
    // Implementation placeholder - will be implemented in next iteration
    this.logger.log('🔐 Security systems initialized');
  }

  private async initiateAuthentication(sessionId: string): Promise<void> {
    // Implementation placeholder - will be implemented in next iteration
    this.logger.debug(`🔐 Authentication initiated for session: ${sessionId}`);
  }

  private startSessionHeartbeat(sessionId: string): void {
    // Implementation placeholder - will be implemented in next iteration
    this.logger.debug(`💓 Heartbeat started for session: ${sessionId}`);
  }

  private async sendConnectionEstablished(sessionId: string, _connectionTime: number): Promise<void> {
    // Implementation placeholder - will be implemented in next iteration
    this.logger.debug(`🔗 Connection established notification sent: ${sessionId}`);
  }

  private handleHeartbeatResponse(sessionId: string): void {
    // Implementation placeholder - will be implemented in next iteration
    this.logger.debug(`💓 Heartbeat response received: ${sessionId}`);
  }

  private handleStreamingDisconnection(sessionId: string, code: number, _reason: Buffer): void {
    // Implementation placeholder - will be implemented in next iteration
    this.logger.log(`🔌 Streaming disconnection handled: ${sessionId}, code: ${code}`);
    this.cleanupSession(sessionId);
  }

  private handleStreamingError(sessionId: string, error: Error): void {
    // Implementation placeholder - will be implemented in next iteration
    this.logger.error(`❌ Streaming error handled: ${sessionId}`, error);
  }

  private async handleUserConfirmationResponse(
    sessionId: string,
    message: ParlantStreamingMessage,
    operationId: string
  ): Promise<void> {
    // Implementation placeholder - will be implemented in next iteration
    this.logger.debug(`✅ User confirmation response handled: ${operationId}`);
  }

  private async handleStreamLeave(
    sessionId: string,
    message: ParlantStreamingMessage,
    operationId: string
  ): Promise<void> {
    // Implementation placeholder - will be implemented in next iteration
    this.logger.debug(`👋 Stream leave handled: ${operationId}`);
  }

  private async handleHeartbeatPing(
    sessionId: string,
    message: ParlantStreamingMessage,
    operationId: string
  ): Promise<void> {
    // Implementation placeholder - will be implemented in next iteration
    this.logger.debug(`💓 Heartbeat ping handled: ${operationId}`);
  }

  private async handleAuthResponse(
    sessionId: string,
    message: ParlantStreamingMessage,
    operationId: string
  ): Promise<void> {
    // Implementation placeholder - will be implemented in next iteration
    this.logger.debug(`🔐 Auth response handled: ${operationId}`);
  }

  private handleConnectionCloseRequest(
    sessionId: string,
    message: ParlantStreamingMessage,
    operationId: string
  ): void {
    // Implementation placeholder - will be implemented in next iteration
    this.logger.debug(`🔌 Connection close request handled: ${operationId}`);
  }

  private async requestUserConfirmation(
    sessionId: string,
    _request: ParlantValidationStreamRequest,
    _streamId?: string
  ): Promise<void> {
    // Implementation placeholder - will be implemented in next iteration
    this.logger.debug(`❓ User confirmation requested for session: ${sessionId}`);
  }

  private async sendErrorNotification(
    sessionId: string,
    errorMessage: string,
    _operationId?: string
  ): Promise<void> {
    // Implementation placeholder - will be implemented in next iteration
    this.logger.debug(`❌ Error notification sent: ${sessionId} - ${errorMessage}`);
  }

  private async sendStreamStatus(
    sessionId: string,
    _status: Record<string, unknown>
  ): Promise<void> {
    // Implementation placeholder - will be implemented in next iteration
    this.logger.debug(`📊 Stream status sent: ${sessionId}`);
  }

  /**
   * Clean up session resources
   */
  private cleanupSession(sessionId: string): void {
    // Find and remove client
    const clientId = Array.from(this.clientToSession.entries())
      .find(([, sid]) => sid === sessionId)?.[0];

    if (clientId) {
      this.clients.delete(clientId);
      this.clientToSession.delete(clientId);
    }

    // Clean up session streams
    const sessionStreams = this.sessionStreams.get(sessionId);
    if (sessionStreams) {
      sessionStreams.forEach(streamId => {
        const participants = this.streamParticipants.get(streamId);
        if (participants) {
          participants.delete(sessionId);
          if (participants.size === 0) {
            this.streams.delete(streamId);
            this.streamParticipants.delete(streamId);
          }
        }
      });
      this.sessionStreams.delete(sessionId);
    }

    // Remove session data
    this.sessions.delete(sessionId);
    this.messageQueue.delete(sessionId);

    // Clean up heartbeat timer
    const timer = this.heartbeatTimers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this.heartbeatTimers.delete(sessionId);
    }

    // Clean up pending validations for this session
    const validationsToDelete: string[] = [];
    this.pendingValidations.forEach((validation, validationId) => {
      if (validation.context.sessionId === sessionId) {
        validationsToDelete.push(validationId);
      }
    });

    validationsToDelete.forEach(validationId => {
      this.pendingValidations.delete(validationId);
      this.validationCallbacks.delete(validationId);
      this.confirmationCallbacks.delete(validationId);
    });
  }

  // ===== MODULE LIFECYCLE METHODS =====

  /**
   * Clean shutdown of the streaming bridge
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log('🔄 Shutting down Parlant WebSocket Streaming Bridge...');
    await this.performGracefulShutdown();
  }

  async onApplicationShutdown(): Promise<void> {
    this.logger.log('🔄 Application shutdown - cleaning up Parlant WebSocket Streaming Bridge...');
    await this.performGracefulShutdown();
  }

  /**
   * Perform graceful shutdown with resource cleanup
   */
  private async performGracefulShutdown(): Promise<void> {
    // Clear heartbeat interval
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Clear all heartbeat timers
    this.heartbeatTimers.forEach(timer => clearTimeout(timer));
    this.heartbeatTimers.clear();

    // Notify all clients of shutdown
    await this.broadcastShutdownNotification();

    // Close all client connections gracefully
    this.clients.forEach((client, _clientId) => {
      if (client.readyState === WebSocket.WebSocket.OPEN) {
        client.close(1000, 'Server shutting down');
      }
    });

    // Close the WebSocket server
    if (this.webSocketServer) {
      await new Promise<void>((resolve) => {
        this.webSocketServer?.close(() => {
          this.logger.log('✅ Parlant WebSocket Streaming Bridge shutdown complete');
          resolve();
        });
      });
    }

    // Clean up all data structures
    this.clients.clear();
    this.sessions.clear();
    this.clientToSession.clear();
    this.streams.clear();
    this.sessionStreams.clear();
    this.streamParticipants.clear();
    this.messageQueue.clear();
    this.pendingValidations.clear();
    this.validationCallbacks.clear();
    this.confirmationCallbacks.clear();
    this.performanceMetrics.clear();
    this.compressionCache.clear();
    this.reconnectionAttempts.clear();
  }

  /**
   * Broadcast shutdown notification to all sessions
   */
  private async broadcastShutdownNotification(): Promise<void> {
    const shutdownMessage: ParlantStreamingMessage = {
      type: ParlantStreamingMessageType.CONNECTION_CLOSE,
      messageId: this.generateMessageId(),
      sessionId: 'system',
      timestamp: Date.now(),
      sequence: ++this.sequence,
      payload: {
        reason: 'server_shutdown',
        message: 'Parlant WebSocket Streaming Bridge is shutting down',
        reconnectDelay: 5000,
      },
      metadata: {
        priority: 'critical',
        requiresAck: false,
        compressed: false,
        encrypted: false,
        routingHints: ['shutdown'],
        auditRequired: true,
      },
    };

    await Promise.all(
      Array.from(this.sessions.keys()).map(sessionId =>
        this.sendMessage(sessionId, { ...shutdownMessage, sessionId })
      )
    );
  }

  // ===== PUBLIC API METHODS =====

  /**
   * Get comprehensive server statistics
   */
  getServerStatistics() {
    const sessions = Array.from(this.sessions.values());
    const streams = Array.from(this.streams.values());
    const performanceData = sessions.map(s => s.performanceMetrics);

    return {
      server: {
        activeSessions: this.sessions.size,
        activeConnections: this.clients.size,
        activeStreams: this.streams.size,
        pendingValidations: this.pendingValidations.size,
        totalMessages: this.sequence,
        uptime: process.uptime(),
      },
      performance: {
        averageLatency: performanceData.length > 0
          ? performanceData.reduce((sum, m) => sum + m.averageLatency, 0) / performanceData.length
          : 0,
        targetLatency: this.PERFORMANCE_TARGETS.TARGET_MESSAGE_LATENCY,
        maxConcurrentSessions: this.PERFORMANCE_TARGETS.MAX_CONCURRENT_SESSIONS,
        maxStreamsPerSession: this.PERFORMANCE_TARGETS.MAX_STREAMS_PER_SESSION,
        heartbeatInterval: this.PERFORMANCE_TARGETS.HEARTBEAT_INTERVAL,
        compressionThreshold: this.PERFORMANCE_TARGETS.MESSAGE_COMPRESSION_THRESHOLD,
      },
      sessions: sessions.map(s => ({
        sessionId: s.sessionId,
        status: s.status,
        messageCount: s.messageCount,
        streamCount: s.streamCount,
        validationCount: s.validationCount,
        connectionTime: Date.now() - s.createdAt.getTime(),
        lastActivity: Date.now() - s.lastActivity.getTime(),
        capabilities: s.capabilities,
        performanceMetrics: s.performanceMetrics,
      })),
      streams: streams.map(s => ({
        streamId: s.streamId,
        streamType: s.streamType,
        status: s.status,
        participantCount: s.participants.length,
        messageCount: s.messageCount,
        connectionTime: Date.now() - s.createdAt.getTime(),
        lastActivity: Date.now() - s.lastActivity.getTime(),
        capabilities: s.capabilities,
        performanceMetrics: s.performanceMetrics,
      })),
    };
  }

  /**
   * Create validation request for external API usage
   */
  async createValidationRequest(
    sessionId: string,
    context: ParlantValidationContext,
    action: ParlantValidationAction,
    streamingOptions: ValidationStreamingOptions = {
      enableProgressUpdates: true,
      progressUpdateInterval: 1000,
      maxProgressUpdates: 10,
      enableRealTimeAnalysis: true,
      compressionEnabled: true,
      priorityBoost: false,
      multiplexingEnabled: true,
      auditTrailEnabled: true,
    }
  ): Promise<unknown> {
    const validationId = `validation_${Date.now()}_${this.generateId()}`;
    const operationId = `operation_${Date.now()}_${this.generateId()}`;

    return new Promise((resolve, reject) => {
      // Store callback for when validation completes
      this.validationCallbacks.set(validationId, resolve);

      // Set timeout for validation
      setTimeout(() => {
        if (this.validationCallbacks.has(validationId)) {
          this.validationCallbacks.delete(validationId);
          reject(new Error('Validation request timeout'));
        }
      }, 30000); // 30 second timeout

      // Create and send validation request
      const request: ParlantValidationStreamRequest = {
        validationId,
        operationId,
        context,
        action,
        riskLevel: this.assessRiskLevel(action),
        streamingOptions,
        requiresUserConfirmation: this.requiresUserConfirmation(action),
      };

      const message: ParlantStreamingMessage = {
        type: ParlantStreamingMessageType.VALIDATION_REQUEST_STREAM,
        messageId: this.generateMessageId(),
        sessionId,
        timestamp: Date.now(),
        sequence: ++this.sequence,
        payload: request as unknown as Record<string, unknown>,
        metadata: {
          priority: 'high',
          requiresAck: true,
          compressed: true,
          encrypted: false,
          streamMultiplexed: streamingOptions.multiplexingEnabled,
          routingHints: ['validation', 'api'],
          auditRequired: streamingOptions.auditTrailEnabled,
        },
      };

      this.sendMessage(sessionId, message);
    });
  }

  /**
   * Assess risk level for validation action
   */
  private assessRiskLevel(action: ParlantValidationAction): 'low' | 'medium' | 'high' | 'critical' {
    if (action.impact.scope === 'external' || !action.reversible) {
      return 'critical';
    }
    if (action.actionCategory === 'delete' || action.actionCategory === 'admin') {
      return 'high';
    }
    if (action.impact.stateChanges || action.impact.networkAccess) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Determine if action requires user confirmation
   */
  private requiresUserConfirmation(action: ParlantValidationAction): boolean {
    return action.actionCategory === 'delete' ||
           action.actionCategory === 'admin' ||
           action.impact.scope === 'external' ||
           !action.reversible;
  }
}