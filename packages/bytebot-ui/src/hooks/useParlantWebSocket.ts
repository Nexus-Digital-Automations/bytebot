/**
 * Parlant WebSocket Hook for Real-Time Conversational AI
 * 
 * Revolutionary chat-first interface hook that enables real-time conversation
 * management, Parlant validation workflows, and enterprise-grade conversational
 * AI integration across all AIgent frontend components.
 * 
 * Features:
 * - Real-time conversation state synchronization
 * - WebSocket-based validation workflow visualization
 * - Advanced conversation context management
 * - Enterprise accessibility and performance optimization
 * - Offline conversation capabilities with intelligent sync
 * 
 * @fileoverview Parlant WebSocket hook for conversational interface transformation
 * @version 1.0.0
 * @author Frontend Chat-First Interface Agent #9
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Socket, io } from 'socket.io-client';
import {
  ConversationMessage,
  ConversationParticipant,
  ConversationPriority,
  ConversationState,
  ConversationStatusUpdate,
  ErrorSeverity,
  IntentAnalysis,
  MessageType,
  ParlantConversationContext,
  ParlantError,
  ParlantValidationRequest,
  ParlantValidationResponse,
  ParticipantRole,
  ParticipantType,
  ValidationDecision
} from '@bytebot/shared/types/parlant.types';
import { logDebug, logError, logInfo, logWarn } from '@/utils/logger';

// ===========================
// HOOK TYPES AND INTERFACES
// ===========================

/**
 * Configuration for Parlant WebSocket connection
 */
interface ParlantWebSocketConfig {
  /** Enable/disable WebSocket connection */
  enabled: boolean;
  
  /** Auto-reconnect on connection loss */
  autoReconnect: boolean;
  
  /** Maximum reconnection attempts */
  maxReconnectAttempts: number;
  
  /** Reconnection delay in milliseconds */
  reconnectDelay: number;
  
  /** Connection timeout in milliseconds */
  connectionTimeout: number;
  
  /** Heartbeat interval in milliseconds */
  heartbeatInterval: number;
  
  /** Enable offline message queueing */
  offlineQueue: boolean;
  
  /** Maximum offline queue size */
  maxOfflineQueue: number;
  
  /** Enable conversation persistence */
  persistConversations: boolean;
  
  /** Enable performance tracking */
  enablePerformanceTracking: boolean;
}

/**
 * Real-time conversation performance metrics
 */
interface ConversationMetrics {
  /** Average response time in milliseconds */
  averageResponseTime: number;
  
  /** Total messages exchanged */
  totalMessages: number;
  
  /** Messages per minute rate */
  messagesPerMinute: number;
  
  /** Connection uptime in milliseconds */
  connectionUptime: number;
  
  /** Error rate percentage */
  errorRate: number;
  
  /** Validation success rate */
  validationSuccessRate: number;
  
  /** Last update timestamp */
  lastUpdate: Date;
}

/**
 * Offline message queue entry
 */
interface OfflineMessage {
  /** Unique message identifier */
  id: string;
  
  /** Conversation identifier */
  conversationId: string;
  
  /** Message content */
  message: ConversationMessage;
  
  /** Timestamp when queued */
  queuedAt: Date;
  
  /** Number of retry attempts */
  retryCount: number;
  
  /** Message priority */
  priority: ConversationPriority;
}

/**
 * Conversation search and filter options
 */
interface ConversationSearchOptions {
  /** Search query string */
  query?: string;
  
  /** Filter by conversation state */
  states?: ConversationState[];
  
  /** Filter by date range */
  dateRange?: {
    start: Date;
    end: Date;
  };
  
  /** Filter by participant */
  participantId?: string;
  
  /** Filter by validation status */
  validationStatus?: ValidationDecision[];
  
  /** Sort order */
  sortBy?: 'timestamp' | 'priority' | 'state' | 'activity';
  
  /** Sort direction */
  sortDirection?: 'asc' | 'desc';
  
  /** Maximum results */
  limit?: number;
  
  /** Result offset for pagination */
  offset?: number;
}

/**
 * Hook return interface
 */
interface UseParlantWebSocketReturn {
  // Connection state
  readonly socket: Socket | null;
  readonly isConnected: boolean;
  readonly isReconnecting: boolean;
  readonly connectionError: string | null;
  
  // Current conversation
  readonly currentConversation: ParlantConversationContext | null;
  readonly conversationState: ConversationState;
  readonly participants: ConversationParticipant[];
  readonly messages: ConversationMessage[];
  
  // Performance metrics
  readonly metrics: ConversationMetrics;
  readonly responseTime: number;
  
  // Offline capabilities
  readonly isOffline: boolean;
  readonly offlineQueue: OfflineMessage[];
  readonly queueSize: number;
  
  // Conversation management
  readonly startConversation: (topic?: string, priority?: ConversationPriority) => Promise<string>;
  readonly joinConversation: (conversationId: string) => Promise<void>;
  readonly leaveConversation: () => void;
  readonly endConversation: (conversationId: string) => Promise<void>;
  
  // Message handling
  readonly sendMessage: (content: string, type?: MessageType) => Promise<void>;
  readonly sendValidationRequest: (request: ParlantValidationRequest) => Promise<ParlantValidationResponse>;
  readonly respondToValidation: (requestId: string, decision: ValidationDecision, reasoning?: string) => Promise<void>;
  
  // Search and history
  readonly searchConversations: (options: ConversationSearchOptions) => Promise<ParlantConversationContext[]>;
  readonly getConversationHistory: (conversationId: string, limit?: number) => Promise<ConversationMessage[]>;
  readonly exportConversation: (conversationId: string) => Promise<string>;
  
  // Real-time status
  readonly getValidationWorkflow: (requestId: string) => Promise<unknown>;
  readonly subscribeToValidationUpdates: (callback: (update: unknown) => void) => () => void;
  
  // Connection management
  readonly connect: () => void;
  readonly disconnect: () => void;
  readonly reconnect: () => Promise<void>;
  
  // Configuration
  readonly updateConfig: (config: Partial<ParlantWebSocketConfig>) => void;
  readonly getConfig: () => ParlantWebSocketConfig;
  
  // Health and diagnostics
  readonly getHealthStatus: () => {
    connected: boolean;
    reconnecting: boolean;
    error: string | null;
    metrics: ConversationMetrics;
    offlineQueue: {
      size: number;
      enabled: boolean;
      maxSize: number;
    };
    pendingValidations: number;
    currentConversation: string | null;
    uptime: number;
  };
  readonly clearOfflineQueue: () => void;
  readonly retryFailedMessages: () => Promise<void>;
}

/**
 * Hook props interface
 */
interface UseParlantWebSocketProps {
  /** Initial configuration */
  config?: Partial<ParlantWebSocketConfig>;
  
  /** Auto-connect on mount */
  autoConnect?: boolean;
  
  /** Conversation event handlers */
  onConversationStart?: (conversation: ParlantConversationContext) => void;
  onConversationEnd?: (conversationId: string) => void;
  onConversationUpdate?: (conversation: ParlantConversationContext) => void;
  
  /** Message event handlers */
  onMessageReceived?: (message: ConversationMessage) => void;
  onMessageSent?: (message: ConversationMessage) => void;
  onMessageError?: (error: ParlantError) => void;
  
  /** Validation event handlers */
  onValidationRequest?: (request: ParlantValidationRequest) => void;
  onValidationResponse?: (response: ParlantValidationResponse) => void;
  onValidationWorkflowUpdate?: (update: unknown) => void;
  
  /** Participant event handlers */
  onParticipantJoined?: (participant: ConversationParticipant) => void;
  onParticipantLeft?: (participantId: string) => void;
  
  /** Connection event handlers */
  onConnected?: () => void;
  onDisconnected?: () => void;
  onReconnecting?: () => void;
  onError?: (error: ParlantError) => void;
  
  /** Performance event handlers */
  onPerformanceUpdate?: (metrics: ConversationMetrics) => void;
}

// ===========================
// DEFAULT CONFIGURATION
// ===========================

const DEFAULT_CONFIG: ParlantWebSocketConfig = {
  enabled: true,
  autoReconnect: true,
  maxReconnectAttempts: 5,
  reconnectDelay: 2000,
  connectionTimeout: 10000,
  heartbeatInterval: 30000,
  offlineQueue: true,
  maxOfflineQueue: 100,
  persistConversations: true,
  enablePerformanceTracking: true,
};

// ===========================
// UTILITY FUNCTIONS
// ===========================

// Constants for ID generation
const ID_BASE = 36;
const ID_SUBSTRING_START = 2;
const ID_SUBSTRING_LENGTH = 9;

/**
 * Generate unique conversation ID
 */
const generateConversationId = (): string => {
  return `conv_${Date.now()}_${Math.random().toString(ID_BASE).substr(ID_SUBSTRING_START, ID_SUBSTRING_LENGTH)}`;
};

/**
 * Generate unique message ID
 */
const generateMessageId = (): string => {
  return `msg_${Date.now()}_${Math.random().toString(ID_BASE).substr(ID_SUBSTRING_START, ID_SUBSTRING_LENGTH)}`;
};

/**
 * Calculate performance metrics
 */
const calculateMetrics = (
  messages: ConversationMessage[],
  startTime: Date,
  errors: number
): ConversationMetrics => {
  const RESPONSE_TIME_MAX_MS = 30_000;
  const MILLISECONDS_PER_MINUTE = 60_000;
  const PERCENTAGE_MULTIPLIER = 100;
  
  const now = new Date();
  const uptimeMs = now.getTime() - startTime.getTime();
  const totalMessages = messages.length;
  
  // Calculate average response time from message timestamps
  const responseTimes = messages
    .filter((_, index) => index > 0)
    .map((msg, index) => {
      const currentMsg = msg;
      const prevMsg = messages[index];
      if (currentMsg?.timestamp && prevMsg?.timestamp) {
        return currentMsg.timestamp.getTime() - prevMsg.timestamp.getTime();
      }
      return 0;
    })
    .filter(time => time > 0 && time < RESPONSE_TIME_MAX_MS); // Filter unrealistic response times
  
  const averageResponseTime = responseTimes.length > 0
    ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
    : 0;
  
  const messagesPerMinute = uptimeMs > 0
    ? (totalMessages / (uptimeMs / MILLISECONDS_PER_MINUTE))
    : 0;
  
  const errorRate = totalMessages > 0
    ? (errors / totalMessages) * PERCENTAGE_MULTIPLIER
    : 0;
  
  return {
    averageResponseTime: Math.round(averageResponseTime),
    totalMessages,
    messagesPerMinute: Math.round(messagesPerMinute * PERCENTAGE_MULTIPLIER) / PERCENTAGE_MULTIPLIER,
    connectionUptime: uptimeMs,
    errorRate: Math.round(errorRate * PERCENTAGE_MULTIPLIER) / PERCENTAGE_MULTIPLIER,
    validationSuccessRate: 0, // TODO: Calculate from validation responses
    lastUpdate: now,
  };
};

// ===========================
// MAIN HOOK IMPLEMENTATION
// ===========================

/**
 * Parlant WebSocket Hook for Revolutionary Chat-First Interface
 * 
 * Provides comprehensive real-time conversational AI capabilities with
 * enterprise-grade performance, accessibility, and offline support.
 * 
 * @param props - Hook configuration and event handlers
 * @returns Complete WebSocket interface for conversational AI
 */
export const useParlantWebSocket = (
  props: UseParlantWebSocketProps = {}
): UseParlantWebSocketReturn => {
  // ===========================
  // STATE MANAGEMENT
  // ===========================
  
  const {
    config: userConfig = {},
    autoConnect = true,
    onConversationStart,
    onConversationEnd,
    onConversationUpdate,
    onMessageReceived,
    onMessageSent,
    onMessageError,
    onValidationRequest,
    onValidationResponse,
    onValidationWorkflowUpdate,
    onParticipantJoined,
    onParticipantLeft,
    onConnected,
    onDisconnected,
    onReconnecting,
    onError,
    onPerformanceUpdate,
  } = props;
  
  // Configuration state
  const [config, setConfig] = useState<ParlantWebSocketConfig>({
    ...DEFAULT_CONFIG,
    ...userConfig,
  });
  
  // Connection state
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const connectionStartTime = useRef<Date>(new Date());
  
  // Conversation state
  const [currentConversation, setCurrentConversation] = useState<ParlantConversationContext | null>(null);
  const [conversationState, setConversationState] = useState<ConversationState>(ConversationState._INITIATED);
  const [participants, setParticipants] = useState<ConversationParticipant[]>([]);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  
  // Performance state
  const [metrics, setMetrics] = useState<ConversationMetrics>({
    averageResponseTime: 0,
    totalMessages: 0,
    messagesPerMinute: 0,
    connectionUptime: 0,
    errorRate: 0,
    validationSuccessRate: 0,
    lastUpdate: new Date(),
  });
  const [responseTime, setResponseTime] = useState(0);
  const errorCount = useRef(0);
  
  // Offline state
  const [isOffline, setIsOffline] = useState(false);
  const [offlineQueue, setOfflineQueue] = useState<OfflineMessage[]>([]);
  
  // Timers and cleanup
  const heartbeatTimer = useRef<NodeJS.Timeout | null>(null);
  const metricsTimer = useRef<NodeJS.Timeout | null>(null);
  
  // Validation tracking
  const pendingValidations = useRef<Map<string, {
    resolve: (response: ParlantValidationResponse) => void;
    reject: (error: Error) => void;
    timestamp: Date;
  }>>(new Map());
  
  // ===========================
  // CONNECTION MANAGEMENT
  // ===========================
  
  const connect = useCallback(() => {
    if (!config.enabled) {
      logWarn('Parlant WebSocket is disabled', null, 'useParlantWebSocket');
      return;
    }
    
    if (socketRef.current?.connected === true) {
      logDebug('Already connected to Parlant WebSocket', null, 'useParlantWebSocket');
      return;
    }
    
    try {
      logInfo('Connecting to Parlant WebSocket Bridge...', null, 'useParlantWebSocket');
      
      const socket = io('/parlant-bridge', {
        transports: ['websocket'],
        autoConnect: true,
        reconnection: config.autoReconnect,
        reconnectionAttempts: config.maxReconnectAttempts,
        reconnectionDelay: config.reconnectDelay,
        timeout: config.connectionTimeout,
        auth: {
          token: localStorage.getItem('jwt_token') ?? '',
          service: 'bytebot-ui',
          version: '1.0.0',
        },
      });
      
      // Connection event handlers
      socket.on('connect', () => {
        logInfo('Connected to Parlant WebSocket Bridge', null, 'useParlantWebSocket');
        setIsConnected(true);
        setIsReconnecting(false);
        setConnectionError(null);
        connectionStartTime.current = new Date();
        
        startHeartbeat();
        processOfflineQueue().catch((error) => {
          logError('Failed to process offline queue', error, 'useParlantWebSocket');
        });
        onConnected?.();
      });
      
      socket.on('disconnect', (reason) => {
        logWarn('Disconnected from Parlant WebSocket', { reason }, 'useParlantWebSocket');
        setIsConnected(false);
        setIsOffline(true);
        stopHeartbeat();
        onDisconnected?.();
      });
      
      socket.on('reconnect_attempt', () => {
        logInfo('Attempting to reconnect...', null, 'useParlantWebSocket');
        setIsReconnecting(true);
        onReconnecting?.();
      });
      
      socket.on('connect_error', (error) => {
        logError('Parlant WebSocket connection error', error, 'useParlantWebSocket');
        setConnectionError(error.message);
        errorCount.current++;
        onError?.({
          id: generateMessageId(),
          code: 'CONNECTION_ERROR',
          message: error.message,
          timestamp: new Date(),
          severity: ErrorSeverity._HIGH,
        });
      });
      
      // Parlant-specific event handlers
      socket.on('parlant:message_received', (message: ConversationMessage) => {
        logDebug('Message received from Parlant', { messageId: message.id }, 'useParlantWebSocket');
        setMessages(prev => [...prev, message]);
        onMessageReceived?.(message);
        updatePerformanceMetrics();
      });
      
      socket.on('parlant:validation_result', (response: ParlantValidationResponse) => {
        logDebug('Validation response received', { requestId: response.requestId }, 'useParlantWebSocket');
        const pending = pendingValidations.current.get(response.requestId);
        if (pending) {
          const latency = Date.now() - pending.timestamp.getTime();
          setResponseTime(latency);
          pending.resolve(response);
          pendingValidations.current.delete(response.requestId);
        }
        onValidationResponse?.(response);
        updatePerformanceMetrics();
      });
      
      socket.on('parlant:conversation_status', (status: ConversationStatusUpdate) => {
        logDebug('Conversation status update', { conversationId: status.conversationId, state: status.state }, 'useParlantWebSocket');
        setConversationState(status.state);
        if (typeof currentConversation?.conversationId === 'string' && currentConversation.conversationId === status.conversationId) {
          const updatedConversation = {
            ...currentConversation,
            state: status.state,
            updatedAt: status.timestamp,
          };
          setCurrentConversation(updatedConversation);
          onConversationUpdate?.(updatedConversation);
        }
      });
      
      socket.on('parlant:intent_analysis', (analysis: IntentAnalysis) => {
        logDebug('Intent analysis received', { intent: analysis.intent.name, confidence: analysis.confidence }, 'useParlantWebSocket');
        // Handle intent analysis for command processing
      });
      
      socket.on('parlant:participant_joined', (participant: ConversationParticipant) => {
        logInfo('Participant joined conversation', { participantId: participant.id, name: participant.name }, 'useParlantWebSocket');
        setParticipants(prev => [...prev, participant]);
        onParticipantJoined?.(participant);
      });
      
      socket.on('parlant:participant_left', (participantId: string) => {
        logInfo('Participant left conversation', { participantId }, 'useParlantWebSocket');
        setParticipants(prev => prev.filter(p => p.id !== participantId));
        onParticipantLeft?.(participantId);
      });
      
      socket.on('parlant:error', (error: ParlantError) => {
        logError('Parlant error received', error, 'useParlantWebSocket');
        errorCount.current++;
        onError?.(error);
        onMessageError?.(error);
      });
      
      socketRef.current = socket;
      
    } catch (error) {
      logError('Failed to initialize Parlant WebSocket', error, 'useParlantWebSocket');
      setConnectionError('Failed to initialize connection');
      errorCount.current++;
    }
  }, [config, onConnected, onDisconnected, onReconnecting, onError, onMessageReceived, onValidationResponse, onConversationUpdate, onParticipantJoined, onParticipantLeft, onMessageError, currentConversation]);
  
  const disconnect = useCallback(() => {
    logInfo('Disconnecting from Parlant WebSocket', null, 'useParlantWebSocket');
    
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    
    setIsConnected(false);
    setCurrentConversation(null);
    setMessages([]);
    setParticipants([]);
    stopHeartbeat();
    stopMetricsTracking();
    
    // Clear pending validations
    pendingValidations.current.forEach(({ reject }) => {
      reject(new Error('Connection closed'));
    });
    pendingValidations.current.clear();
    
  }, []);
  
  const reconnect = useCallback(async () => {
    const RECONNECT_DELAY_MS = 1000;
    logInfo('Manual reconnect requested', null, 'useParlantWebSocket');
    disconnect();
    await new Promise(resolve => setTimeout(resolve, RECONNECT_DELAY_MS));
    connect();
  }, [disconnect, connect]);
  
  // ===========================
  // CONVERSATION MANAGEMENT
  // ===========================
  
  const startConversation = useCallback(async (
    topic?: string,
    priority: ConversationPriority = ConversationPriority._NORMAL
  ): Promise<string> => {
    if (!isConnected || !socketRef.current) {
      throw new Error('Not connected to Parlant WebSocket');
    }
    
    const conversationId = generateConversationId();
    const conversation: ParlantConversationContext = {
      conversationId,
      userId: 'current-user', // TODO: Get from auth context
      sessionId: `session_${Date.now()}`,
      state: ConversationState._INITIATED,
      metadata: {
        topic: topic ?? 'New Conversation',
        priority,
        tags: [],
        properties: {},
        history: [],
      },
      participants: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    return new Promise<string>((resolve, reject) => {
      if (!socketRef.current) {
        reject(new Error('Socket not available'));
        return;
      }
      socketRef.current.emit('parlant:start_conversation', conversation, (response: { success: boolean; error?: string }) => {
        if (response.success) {
          setCurrentConversation(conversation);
          setConversationState(ConversationState._ACTIVE);
          setMessages([]);
          setParticipants([]);
          onConversationStart?.(conversation);
          resolve(conversationId);
          logInfo('Started new conversation', { conversationId, topic }, 'useParlantWebSocket');
        } else {
          reject(new Error(response.error ?? 'Failed to start conversation'));
          logError('Failed to start conversation', response.error ?? 'Unknown error', 'useParlantWebSocket');
        }
      });
    });
  }, [isConnected, onConversationStart]);
  
  const joinConversation = useCallback(async (conversationId: string): Promise<void> => {
    if (!isConnected || !socketRef.current) {
      throw new Error('Not connected to Parlant WebSocket');
    }
    
    return new Promise<void>((resolve, reject) => {
      if (!socketRef.current) {
        reject(new Error('Socket not available'));
        return;
      }
      socketRef.current.emit('parlant:join_conversation', conversationId, (response: { success: boolean; error?: string; conversation?: ParlantConversationContext; messages?: ConversationMessage[]; participants?: ConversationParticipant[] }) => {
        if (Boolean(response.success) && Boolean(response.conversation)) {
          const conversation = response.conversation as ParlantConversationContext;
          setCurrentConversation(conversation);
          setConversationState(conversation.state);
          setMessages(response.messages ?? []);
          setParticipants(response.participants ?? []);
          resolve();
          logInfo('Joined conversation', { conversationId }, 'useParlantWebSocket');
        } else {
          reject(new Error(response.error ?? 'Failed to join conversation'));
          logError('Failed to join conversation', response.error ?? 'Unknown error', 'useParlantWebSocket');
        }
      });
    });
  }, [isConnected]);
  
  const leaveConversation = useCallback(() => {
    if (currentConversation === null || socketRef.current === null) {
      return;
    }
    
    socketRef.current.emit('parlant:leave_conversation', currentConversation.conversationId);
    setCurrentConversation(null);
    setMessages([]);
    setParticipants([]);
    logInfo('Left conversation', { conversationId: currentConversation.conversationId }, 'useParlantWebSocket');
  }, [currentConversation]);
  
  const endConversation = useCallback(async (conversationId: string): Promise<void> => {
    if (!isConnected || !socketRef.current) {
      throw new Error('Not connected to Parlant WebSocket');
    }
    
    return new Promise<void>((resolve, reject) => {
      if (!socketRef.current) {
        reject(new Error('Socket not available'));
        return;
      }
      socketRef.current.emit('parlant:end_conversation', conversationId, (response: { success: boolean; error?: string }) => {
        if (response.success) {
          if (currentConversation?.conversationId === conversationId) {
            setCurrentConversation(null);
            setMessages([]);
            setParticipants([]);
          }
          onConversationEnd?.(conversationId);
          resolve();
          logInfo('Ended conversation', { conversationId }, 'useParlantWebSocket');
        } else {
          reject(new Error(response.error ?? 'Failed to end conversation'));
          logError('Failed to end conversation', response.error ?? 'Unknown error', 'useParlantWebSocket');
        }
      });
    });
  }, [isConnected, currentConversation, onConversationEnd]);
  
  // ===========================
  // MESSAGE HANDLING
  // ===========================
  
  const sendMessage = useCallback(async (
    content: string,
    type: MessageType = MessageType._TEXT
  ): Promise<void> => {
    if (currentConversation === null) {
      throw new Error('No active conversation');
    }
    
    const message: ConversationMessage = {
      id: generateMessageId(),
      conversationId: currentConversation.conversationId,
      sender: {
        id: 'current-user', // TODO: Get from auth context
        type: ParticipantType._HUMAN,
        name: 'User', // TODO: Get from auth context
        role: ParticipantRole._REQUESTOR,
        capabilities: [],
        joinedAt: new Date(),
      },
      content,
      type,
      timestamp: new Date(),
      metadata: {},
    };
    
    if (!isConnected || !socketRef.current) {
      // Queue message for offline sending
      if (config.offlineQueue && offlineQueue.length < config.maxOfflineQueue) {
        const offlineMessage: OfflineMessage = {
          id: message.id,
          conversationId: currentConversation.conversationId,
          message,
          queuedAt: new Date(),
          retryCount: 0,
          priority: currentConversation.metadata.priority,
        };
        setOfflineQueue(prev => [...prev, offlineMessage]);
        logInfo('Message queued for offline sending', { messageId: message.id }, 'useParlantWebSocket');
      }
      return;
    }
    
    const MESSAGE_TIMEOUT = 10_000;
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Message send timeout'));
      }, MESSAGE_TIMEOUT);
      
      if (!socketRef.current) {
        clearTimeout(timeout);
        reject(new Error('Socket not available'));
        return;
      }
      
      socketRef.current.emit('parlant:send_message', message, (response: { success: boolean; error?: string }) => {
        clearTimeout(timeout);
        if (response.success) {
          setMessages(prev => [...prev, message]);
          onMessageSent?.(message);
          resolve();
          logDebug('Message sent successfully', { messageId: message.id }, 'useParlantWebSocket');
        } else {
          reject(new Error(response.error ?? 'Failed to send message'));
          logError('Failed to send message', response.error ?? 'Unknown error', 'useParlantWebSocket');
        }
      });
    });
  }, [currentConversation, isConnected, config.offlineQueue, config.maxOfflineQueue, offlineQueue.length, onMessageSent]);
  
  const sendValidationRequest = useCallback(async (
    request: ParlantValidationRequest
  ): Promise<ParlantValidationResponse> => {
    if (!isConnected || !socketRef.current) {
      throw new Error('Not connected to Parlant WebSocket');
    }
    
    const VALIDATION_TIMEOUT = 30_000;
    return new Promise<ParlantValidationResponse>((resolve, reject) => {
      const timeout = setTimeout(() => {
        pendingValidations.current.delete(request.requestId);
        reject(new Error('Validation request timeout'));
      }, VALIDATION_TIMEOUT);
      
      if (!socketRef.current) {
        clearTimeout(timeout);
        reject(new Error('Socket not available'));
        return;
      }
      
      pendingValidations.current.set(request.requestId, {
        resolve: (response: ParlantValidationResponse) => {
          clearTimeout(timeout);
          resolve(response);
        },
        reject: (error: Error) => {
          clearTimeout(timeout);
          reject(error);
        },
        timestamp: new Date(),
      });
      
      socketRef.current.emit('parlant:validate_function', request);
      onValidationRequest?.(request);
      logInfo('Validation request sent', { requestId: request.requestId }, 'useParlantWebSocket');
    });
  }, [isConnected, onValidationRequest]);
  
  const respondToValidation = useCallback(async (
    requestId: string,
    decision: ValidationDecision,
    reasoning?: string
  ): Promise<void> => {
    if (!isConnected || !socketRef.current) {
      throw new Error('Not connected to Parlant WebSocket');
    }
    
    const response = {
      requestId,
      decision,
      reasoning: reasoning ?? '',
      timestamp: new Date(),
    };
    
    return new Promise<void>((resolve, reject) => {
      if (!socketRef.current) {
        reject(new Error('Socket not available'));
        return;
      }
      socketRef.current.emit('parlant:validation_response', response, (result: { success: boolean; error?: string }) => {
        if (result.success) {
          resolve();
          logInfo('Validation response sent', { requestId, decision }, 'useParlantWebSocket');
        } else {
          reject(new Error(result.error ?? 'Failed to send validation response'));
          logError('Failed to send validation response', result.error ?? 'Unknown error', 'useParlantWebSocket');
        }
      });
    });
  }, [isConnected]);
  
  // ===========================
  // SEARCH AND HISTORY
  // ===========================
  
  const searchConversations = useCallback(async (
    options: ConversationSearchOptions
  ): Promise<ParlantConversationContext[]> => {
    if (!isConnected || !socketRef.current) {
      throw new Error('Not connected to Parlant WebSocket');
    }
    
    return new Promise<ParlantConversationContext[]>((resolve, reject) => {
      if (!socketRef.current) {
        reject(new Error('Socket not available'));
        return;
      }
      socketRef.current.emit('parlant:search_conversations', options, (response: { success: boolean; error?: string; conversations: ParlantConversationContext[] }) => {
        if (response.success) {
          resolve(response.conversations);
          logDebug('Conversation search completed', { resultCount: response.conversations.length }, 'useParlantWebSocket');
        } else {
          reject(new Error(response.error ?? 'Search failed'));
          logError('Conversation search failed', response.error ?? 'Unknown error', 'useParlantWebSocket');
        }
      });
    });
  }, [isConnected]);
  
  // Define default limits for conversation history
  const DEFAULT_HISTORY_LIMIT = 100; // Default history limit for conversation messages
  
  const getConversationHistory = useCallback(async (
    conversationId: string,
    limit = DEFAULT_HISTORY_LIMIT
  ): Promise<ConversationMessage[]> => {
    if (!isConnected || !socketRef.current) {
      throw new Error('Not connected to Parlant WebSocket');
    }
    
    return new Promise<ConversationMessage[]>((resolve, reject) => {
      if (!socketRef.current) {
        reject(new Error('Socket not available'));
        return;
      }
      socketRef.current.emit('parlant:get_history', { conversationId, limit }, (response: { success: boolean; error?: string; messages: ConversationMessage[] }) => {
        if (response.success) {
          resolve(response.messages);
          logDebug('Conversation history retrieved', { conversationId, messageCount: response.messages.length }, 'useParlantWebSocket');
        } else {
          reject(new Error(response.error ?? 'Failed to get history'));
          logError('Failed to get conversation history', response.error ?? 'Unknown error', 'useParlantWebSocket');
        }
      });
    });
  }, [isConnected]);
  
  const exportConversation = useCallback(async (conversationId: string): Promise<string> => {
    if (!isConnected || !socketRef.current) {
      throw new Error('Not connected to Parlant WebSocket');
    }
    
    return new Promise<string>((resolve, reject) => {
      if (!socketRef.current) {
        reject(new Error('Socket not available'));
        return;
      }
      socketRef.current.emit('parlant:export_conversation', conversationId, (response: { success: boolean; error?: string; exportData: string }) => {
        if (response.success) {
          resolve(response.exportData);
          logInfo('Conversation exported', { conversationId }, 'useParlantWebSocket');
        } else {
          reject(new Error(response.error ?? 'Export failed'));
          logError('Failed to export conversation', response.error ?? 'Unknown error', 'useParlantWebSocket');
        }
      });
    });
  }, [isConnected]);
  
  // ===========================
  // VALIDATION WORKFLOW
  // ===========================
  
  const getValidationWorkflow = useCallback(async (requestId: string): Promise<unknown> => {
    if (!isConnected || !socketRef.current) {
      throw new Error('Not connected to Parlant WebSocket');
    }
    
    return new Promise<unknown>((resolve, reject) => {
      if (!socketRef.current) {
        reject(new Error('Socket not available'));
        return;
      }
      socketRef.current.emit('parlant:get_workflow', requestId, (response: { success: boolean; error?: string; workflow: unknown }) => {
        if (response.success) {
          resolve(response.workflow);
          logDebug('Validation workflow retrieved', { requestId }, 'useParlantWebSocket');
        } else {
          reject(new Error(response.error ?? 'Failed to get workflow'));
          logError('Failed to get validation workflow', response.error ?? 'Unknown error', 'useParlantWebSocket');
        }
      });
    });
  }, [isConnected]);
  
  const subscribeToValidationUpdates = useCallback((
    callback: (update: unknown) => void
  ): (() => void) => {
    if (!socketRef.current) {
      return (): void => {
        // No-op cleanup function when no socket is available
      };
    }
    
    const handleUpdate = (update: unknown): void => {
      callback(update);
      onValidationWorkflowUpdate?.(update);
    };
    
    socketRef.current.on('parlant:validation_update', handleUpdate);
    
    return () => {
      if (socketRef.current) {
        socketRef.current.off('parlant:validation_update', handleUpdate);
      }
    };
  }, [onValidationWorkflowUpdate]);
  
  // ===========================
  // OFFLINE CAPABILITIES
  // ===========================
  
  const processOfflineQueue = useCallback(async () => {
    if (!isConnected || !socketRef.current || offlineQueue.length === 0) {
      return;
    }
    
    logInfo('Processing offline message queue', { queueSize: offlineQueue.length }, 'useParlantWebSocket');
    setIsOffline(false);
    
    const messagesToProcess = [...offlineQueue];
    setOfflineQueue([]);
    
    // Process messages sequentially to avoid overwhelming the server
    for (const offlineMessage of messagesToProcess) {
      try {
        // Using await in loop is intentional for sequential processing
        await sendMessage(offlineMessage.message.content, offlineMessage.message.type); // eslint-disable-line no-await-in-loop
        logDebug('Offline message sent successfully', { messageId: offlineMessage.id }, 'useParlantWebSocket');
      } catch (error) {
        logError('Failed to send offline message', error, 'useParlantWebSocket');
        // Re-queue message if retry limit not reached
        const MAX_RETRY_COUNT = 3;
        if (offlineMessage.retryCount < MAX_RETRY_COUNT) {
          setOfflineQueue(prev => [...prev, {
            ...offlineMessage,
            retryCount: offlineMessage.retryCount + 1,
          }]);
        }
      }
    }
  }, [isConnected, offlineQueue, sendMessage]);
  
  const clearOfflineQueue = useCallback(() => {
    setOfflineQueue([]);
    logInfo('Offline message queue cleared', null, 'useParlantWebSocket');
  }, []);
  
  const retryFailedMessages = useCallback(async () => {
    await processOfflineQueue();
  }, [processOfflineQueue]);
  
  // ===========================
  // PERFORMANCE TRACKING
  // ===========================
  
  const updatePerformanceMetrics = useCallback(() => {
    if (!config.enablePerformanceTracking) {
      return;
    }
    
    const newMetrics = calculateMetrics(messages, connectionStartTime.current, errorCount.current);
    setMetrics(newMetrics);
    onPerformanceUpdate?.(newMetrics);
  }, [config.enablePerformanceTracking, messages, onPerformanceUpdate]);
  
  const startHeartbeat = useCallback(() => {
    if (heartbeatTimer.current) {
      clearInterval(heartbeatTimer.current);
    }
    
    heartbeatTimer.current = setInterval(() => {
      if (socketRef.current?.connected === true) {
        socketRef.current.emit('parlant:heartbeat', { timestamp: Date.now() });
      }
    }, config.heartbeatInterval);
  }, [config.heartbeatInterval]);
  
  const stopHeartbeat = useCallback(() => {
    if (heartbeatTimer.current) {
      clearInterval(heartbeatTimer.current);
      heartbeatTimer.current = null;
    }
  }, []);
  
  const startMetricsTracking = useCallback(() => {
    if (!config.enablePerformanceTracking) {
      return;
    }
    
    if (metricsTimer.current) {
      clearInterval(metricsTimer.current);
    }
    
    const METRICS_UPDATE_INTERVAL = 5000; // Update metrics every 5 seconds
    metricsTimer.current = setInterval(() => {
      updatePerformanceMetrics();
    }, METRICS_UPDATE_INTERVAL);
  }, [config.enablePerformanceTracking, updatePerformanceMetrics]);
  
  const stopMetricsTracking = useCallback(() => {
    if (metricsTimer.current) {
      clearInterval(metricsTimer.current);
      metricsTimer.current = null;
    }
  }, []);
  
  // ===========================
  // CONFIGURATION MANAGEMENT
  // ===========================
  
  const updateConfig = useCallback((newConfig: Partial<ParlantWebSocketConfig>) => {
    setConfig(prev => {
      const updated = { ...prev, ...newConfig };
      logInfo('WebSocket configuration updated', newConfig, 'useParlantWebSocket');
      return updated;
    });
  }, []);
  
  const getConfig = useCallback(() => config, [config]);
  
  const getHealthStatus = useCallback(() => ({
    connected: isConnected,
    reconnecting: isReconnecting,
    error: connectionError,
    metrics,
    offlineQueue: {
      size: offlineQueue.length,
      enabled: config.offlineQueue,
      maxSize: config.maxOfflineQueue,
    },
    pendingValidations: pendingValidations.current.size,
    currentConversation: currentConversation?.conversationId ?? null,
    uptime: Date.now() - connectionStartTime.current.getTime(),
  }), [isConnected, isReconnecting, connectionError, metrics, offlineQueue.length, config.offlineQueue, config.maxOfflineQueue, currentConversation]);
  
  // ===========================
  // EFFECTS
  // ===========================
  
  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect && config.enabled) {
      connect();
    }
    
    startMetricsTracking();
    
    return (): void => {
      disconnect();
      stopMetricsTracking();
    };
  }, [autoConnect, config.enabled, connect, disconnect, startMetricsTracking, stopMetricsTracking]);
  
  // Update performance metrics when messages change
  useEffect(() => {
    updatePerformanceMetrics();
  }, [messages, updatePerformanceMetrics]);
  
  // Process offline queue when connection is restored
  useEffect(() => {
    if (isConnected && !isOffline && offlineQueue.length > 0) {
      processOfflineQueue().catch((error) => {
        logError('Failed to process offline queue in effect', error, 'useParlantWebSocket');
      });
    }
  }, [isConnected, isOffline, offlineQueue.length, processOfflineQueue]);
  
  // ===========================
  // RETURN INTERFACE
  // ===========================
  
  return {
    // Connection state
    socket: socketRef.current,
    isConnected,
    isReconnecting,
    connectionError,
    
    // Current conversation
    currentConversation,
    conversationState,
    participants,
    messages,
    
    // Performance metrics
    metrics,
    responseTime,
    
    // Offline capabilities
    isOffline,
    offlineQueue,
    queueSize: offlineQueue.length,
    
    // Conversation management
    startConversation,
    joinConversation,
    leaveConversation,
    endConversation,
    
    // Message handling
    sendMessage,
    sendValidationRequest,
    respondToValidation,
    
    // Search and history
    searchConversations,
    getConversationHistory,
    exportConversation,
    
    // Real-time status
    getValidationWorkflow,
    subscribeToValidationUpdates,
    
    // Connection management
    connect,
    disconnect,
    reconnect,
    
    // Configuration
    updateConfig,
    getConfig,
    
    // Health and diagnostics
    getHealthStatus,
    clearOfflineQueue,
    retryFailedMessages,
  };
};

export default useParlantWebSocket;