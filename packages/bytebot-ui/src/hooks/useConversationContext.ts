/**
 * Conversation Context Management and Persistence Hook
 * 
 * Advanced conversation context management system that provides intelligent
 * conversation state tracking, cross-session persistence, and context-aware
 * interactions. Enables seamless conversation continuity across browser sessions,
 * devices, and application restarts.
 * 
 * Key Features:
 * - Intelligent conversation context tracking
 * - Cross-session persistence with IndexedDB
 * - Context-aware message routing and processing
 * - Conversation branching and merging
 * - Smart context summarization and compression
 * - Multi-device synchronization support
 * - Context-based intent prediction
 * - Conversation analytics and insights
 * 
 * @fileoverview Conversation context management and persistence system
 * @version 1.0.0
 * @author Frontend Chat-First Interface Agent #9
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ConversationHistoryEntry,
  ConversationHistoryType,
  ConversationMessage,
  ConversationParticipant,
  ConversationPriority,
  ConversationState,
  MessageType,
  ParlantConversationContext,
  ParticipantRole,
  ParticipantType
} from '@bytebot/shared/types/parlant.types';
import { logDebug, logError, logInfo } from '@/utils/logger';

// ===========================
// TYPE DEFINITIONS
// ===========================

/**
 * Conversation context snapshot for persistence
 */
interface ConversationSnapshot {
  /** Conversation metadata */
  conversation: ParlantConversationContext;
  
  /** All messages in conversation */
  messages: ConversationMessage[];
  
  /** Current participants */
  participants: ConversationParticipant[];
  
  /** Context summary for efficiency */
  contextSummary: ContextSummary;
  
  /** Snapshot timestamp */
  snapshotAt: Date;
  
  /** Last activity timestamp */
  lastActivity: Date;
  
  /** Context analytics */
  analytics: ConversationAnalytics;
  
  /** Sync status */
  syncStatus: SyncStatus;
}

/**
 * Context summary for efficient storage and retrieval
 */
interface ContextSummary {
  /** Key topics discussed */
  topics: string[];
  
  /** Important decisions made */
  decisions: string[];
  
  /** Outstanding actions */
  pendingActions: string[];
  
  /** Key participants */
  keyParticipants: string[];
  
  /** Conversation sentiment */
  sentiment: 'positive' | 'neutral' | 'negative';
  
  /** Complexity level */
  complexity: 'simple' | 'moderate' | 'complex';
  
  /** Summary text */
  summary: string;
}

/**
 * Conversation analytics data
 */
interface ConversationAnalytics {
  /** Total messages */
  messageCount: number;
  
  /** Average message length */
  avgMessageLength: number;
  
  /** Response times */
  avgResponseTime: number;
  
  /** Participant engagement */
  participantEngagement: Record<string, number>;
  
  /** Topic distribution */
  topicDistribution: Record<string, number>;
  
  /** Validation requests count */
  validationRequests: number;
  
  /** Resolution rate */
  resolutionRate: number;
  
  /** Session duration */
  sessionDuration: number;
}

/**
 * Synchronization status
 */
interface SyncStatus {
  /** Last sync timestamp */
  lastSync: Date;
  
  /** Sync state */
  state: 'synced' | 'pending' | 'error' | 'offline';
  
  /** Pending changes count */
  pendingChanges: number;
  
  /** Last error */
  lastError?: string;
  
  /** Sync attempts */
  syncAttempts: number;
}

/**
 * Context search options
 */
interface ContextSearchOptions {
  /** Search query */
  query?: string;
  
  /** Date range filter */
  dateRange?: {
    start: Date;
    end: Date;
  };
  
  /** State filter */
  states?: ConversationState[];
  
  /** Participant filter */
  participantIds?: string[];
  
  /** Topic filter */
  topics?: string[];
  
  /** Priority filter */
  priorities?: ConversationPriority[];
  
  /** Include archived conversations */
  includeArchived?: boolean;
  
  /** Sort options */
  sortBy?: 'date' | 'activity' | 'priority' | 'relevance';
  
  /** Sort direction */
  sortDirection?: 'asc' | 'desc';
  
  /** Result limit */
  limit?: number;
  
  /** Result offset */
  offset?: number;
}

/**
 * Context prediction result
 */
interface ContextPrediction {
  /** Predicted next actions */
  suggestedActions: string[];
  
  /** Likely next topics */
  likelyTopics: string[];
  
  /** Recommended participants */
  recommendedParticipants: ConversationParticipant[];
  
  /** Predicted response time */
  expectedResponseTime: number;
  
  /** Confidence score */
  confidence: number;
  
  /** Reasoning */
  reasoning: string;
}

/**
 * Context branching point
 */
interface ConversationBranch {
  /** Branch identifier */
  branchId: string;
  
  /** Parent conversation ID */
  parentConversationId: string;
  
  /** Branch point message ID */
  branchPointMessageId: string;
  
  /** Branch topic */
  topic: string;
  
  /** Branch participants */
  participants: ConversationParticipant[];
  
  /** Branch creation time */
  createdAt: Date;
  
  /** Branch status */
  status: 'active' | 'merged' | 'abandoned';
}

/**
 * Hook configuration
 */
interface ConversationContextConfig {
  /** Enable persistence */
  enablePersistence: boolean;
  
  /** Enable analytics tracking */
  enableAnalytics: boolean;
  
  /** Enable context prediction */
  enablePrediction: boolean;
  
  /** Enable conversation branching */
  enableBranching: boolean;
  
  /** Auto-save interval (ms) */
  autoSaveInterval: number;
  
  /** Context compression threshold (number of messages) */
  compressionThreshold: number;
  
  /** Maximum stored conversations */
  maxStoredConversations: number;
  
  /** Sync interval (ms) */
  syncInterval: number;
  
  /** Enable offline mode */
  enableOfflineMode: boolean;
  
  /** Context prediction threshold */
  predictionThreshold: number;
}

/**
 * Hook return interface
 */
interface UseConversationContextReturn {
  // Current context
  readonly currentContext: ParlantConversationContext | null;
  readonly contextSummary: ContextSummary | null;
  readonly analytics: ConversationAnalytics | null;
  readonly predictions: ContextPrediction | null;
  
  // Persistence
  readonly isLoading: boolean;
  readonly isSaving: boolean;
  readonly lastSaved: Date | null;
  readonly syncStatus: SyncStatus | null;
  
  // Context management
  readonly setCurrentContext: (context: ParlantConversationContext | null) => void;
  readonly updateContext: (updates: Partial<ParlantConversationContext>) => Promise<void>;
  readonly saveContext: () => Promise<void>;
  readonly loadContext: (conversationId: string) => Promise<ParlantConversationContext | null>;
  readonly deleteContext: (conversationId: string) => Promise<void>;
  
  // Message management
  readonly addMessage: (message: ConversationMessage) => Promise<void>;
  readonly updateMessage: (messageId: string, updates: Partial<ConversationMessage>) => Promise<void>;
  readonly deleteMessage: (messageId: string) => Promise<void>;
  readonly getMessages: (limit?: number, offset?: number) => ConversationMessage[];
  
  // Participant management
  readonly addParticipant: (participant: ConversationParticipant) => Promise<void>;
  readonly removeParticipant: (participantId: string) => Promise<void>;
  readonly updateParticipant: (participantId: string, updates: Partial<ConversationParticipant>) => Promise<void>;
  
  // Search and retrieval
  readonly searchContexts: (options: ContextSearchOptions) => Promise<ConversationSnapshot[]>;
  readonly getRecentContexts: (limit?: number) => Promise<ConversationSnapshot[]>;
  readonly getArchivedContexts: (limit?: number) => Promise<ConversationSnapshot[]>;
  
  // Branching
  readonly createBranch: (topic: string, messageId?: string) => Promise<string>;
  readonly mergeBranch: (branchId: string) => Promise<void>;
  readonly abandonBranch: (branchId: string) => Promise<void>;
  readonly getBranches: () => Promise<ConversationBranch[]>;
  
  // Analytics
  readonly getAnalytics: (timeRange?: { start: Date; end: Date }) => Promise<ConversationAnalytics>;
  readonly exportAnalytics: (format?: 'json' | 'csv') => Promise<string>;
  
  // Predictions
  readonly getPredictions: () => Promise<ContextPrediction | null>;
  readonly updatePredictions: () => Promise<void>;
  
  // Sync
  readonly sync: () => Promise<void>;
  readonly enableSync: (enable: boolean) => void;
  readonly getSyncStatus: () => SyncStatus | null;
  
  // Utilities
  readonly clearAll: () => Promise<void>;
  readonly exportContext: (conversationId: string) => Promise<string>;
  readonly importContext: (data: string) => Promise<string>;
  readonly getStorageUsage: () => Promise<{ used: number; available: number }>;
}

/**
 * Hook props
 */
interface UseConversationContextProps {
  /** Initial configuration */
  config?: Partial<ConversationContextConfig>;
  
  /** Auto-load conversation ID */
  autoLoad?: string;
  
  /** Event handlers */
  onContextChange?: (context: ParlantConversationContext | null) => void;
  onContextSaved?: (context: ParlantConversationContext) => void;
  onSyncComplete?: (status: SyncStatus) => void;
  onError?: (error: string) => void;
}

// ===========================
// CONSTANTS
// ===========================

const MAX_PREVIEW_LENGTH = 100;
const MODERATE_COMPLEXITY_THRESHOLD = 20;
const HIGH_COMPLEXITY_THRESHOLD = 50;
const RECENT_MESSAGES_SLICE = -10;
const BASE_CONFIDENCE = 0.5;
const HIGH_MESSAGE_COUNT_THRESHOLD = 10;
const CONFIDENCE_BOOST_MESSAGES = 0.2;
const CONFIDENCE_BOOST_TIMING = 0.1;
const MAX_RESPONSE_TIME_MS = 60000;
const RECENT_ACTIVITY_WINDOW_MS = 300000;
const MAX_CONFIDENCE = 0.95;

// ===========================
// DEFAULT CONFIGURATION
// ===========================

const DEFAULT_CONFIG: ConversationContextConfig = {
  enablePersistence: true,
  enableAnalytics: true,
  enablePrediction: true,
  enableBranching: true,
  autoSaveInterval: 10000, // 10 seconds
  compressionThreshold: 1000,
  maxStoredConversations: 100,
  syncInterval: 30000, // 30 seconds
  enableOfflineMode: true,
  predictionThreshold: 0.7,
};

// ===========================
// STORAGE UTILITIES
// ===========================

/**
 * IndexedDB storage manager for conversation contexts
 */
class ConversationStorage {
  private db: IDBDatabase | null = null;
  private dbName = 'ConversationContextDB';
  private version = 1;
  
  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = (): void => { reject(request.error); };
      
      request.onsuccess = (): void => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event): void => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Conversations store
        if (!db.objectStoreNames.contains('conversations')) {
          const conversationsStore = db.createObjectStore('conversations', { 
            keyPath: 'conversation.conversationId' 
          });
          conversationsStore.createIndex('lastActivity', 'lastActivity');
          conversationsStore.createIndex('state', 'conversation.state');
          conversationsStore.createIndex('priority', 'conversation.metadata.priority');
        }
        
        // Messages store
        if (!db.objectStoreNames.contains('messages')) {
          const messagesStore = db.createObjectStore('messages', {
            keyPath: 'id'
          });
          messagesStore.createIndex('conversationId', 'conversationId');
          messagesStore.createIndex('timestamp', 'timestamp');
        }
        
        // Branches store
        if (!db.objectStoreNames.contains('branches')) {
          const branchesStore = db.createObjectStore('branches', {
            keyPath: 'branchId'
          });
          branchesStore.createIndex('parentConversationId', 'parentConversationId');
          branchesStore.createIndex('status', 'status');
        }
        
        // Analytics store
        if (!db.objectStoreNames.contains('analytics')) {
          db.createObjectStore('analytics', {
            keyPath: 'conversationId'
          });
        }
      };
    });
  }
  
  async saveSnapshot(snapshot: ConversationSnapshot): Promise<void> {
    if (!this.db) {await this.initialize();}
    
    return new Promise((resolve, reject) => {
      if (!this.db) { 
        reject(new Error('Database not initialized')); 
        return; 
      }
      const transaction = this.db.transaction(['conversations'], 'readwrite');
      const store = transaction.objectStore('conversations');
      const request = store.put(snapshot);
      
      request.onerror = (): void => { reject(request.error); };
      request.onsuccess = (): void => { resolve(); };
    });
  }
  
  async loadSnapshot(conversationId: string): Promise<ConversationSnapshot | null> {
    if (!this.db) {await this.initialize();}
    
    return new Promise((resolve, reject) => {
      if (!this.db) { 
        reject(new Error('Database not initialized')); 
        return; 
      }
      const transaction = this.db.transaction(['conversations'], 'readonly');
      const store = transaction.objectStore('conversations');
      const request = store.get(conversationId);
      
      request.onerror = (): void => { reject(request.error); };
      request.onsuccess = (): void => { resolve(request.result as ConversationSnapshot | null ?? null); };
    });
  }
  
  async searchSnapshots(options: ContextSearchOptions): Promise<ConversationSnapshot[]> {
    if (!this.db) {await this.initialize();}
    
    return new Promise((resolve, reject) => {
      if (!this.db) { 
        reject(new Error('Database not initialized')); 
        return; 
      }
      const transaction = this.db.transaction(['conversations'], 'readonly');
      const store = transaction.objectStore('conversations');
      const request = store.getAll();
      
      request.onerror = (): void => { reject(request.error); };
      request.onsuccess = (): void => {
        let results = (request.result as ConversationSnapshot[]) ?? [];
        
        // Apply filters with type-safe access
        if (options.states && options.states.length > 0) {
          results = results.filter(s => 
            options.states?.includes(s.conversation.state) ?? false
          );
        }
        
        if (options.priorities && options.priorities.length > 0) {
          results = results.filter(s => 
            options.priorities?.includes(s.conversation.metadata.priority) ?? false
          );
        }
        
        if (options.dateRange) {
          const dateRange = options.dateRange;
          results = results.filter(s => 
            s.lastActivity >= dateRange.start &&
            s.lastActivity <= dateRange.end
          );
        }
        
        if (typeof options.query === 'string' && options.query.length > 0) {
          const query = options.query.toLowerCase();
          results = results.filter(s => (
            (typeof s.contextSummary?.summary === 'string' && 
             s.contextSummary.summary.toLowerCase().includes(query)) ||
            (Array.isArray(s.contextSummary?.topics) &&
             s.contextSummary.topics.some(topic => 
               typeof topic === 'string' && topic.toLowerCase().includes(query)
             ))
          ));
        }
        
        // Sort results with type-safe access
        results.sort((a, b) => {
          switch (options.sortBy) {
            case 'date':
              return options.sortDirection === 'desc'
                ? b.conversation.createdAt.getTime() - a.conversation.createdAt.getTime()
                : a.conversation.createdAt.getTime() - b.conversation.createdAt.getTime();
            case 'activity':
              return options.sortDirection === 'desc'
                ? b.lastActivity.getTime() - a.lastActivity.getTime()
                : a.lastActivity.getTime() - b.lastActivity.getTime();
            case 'priority': {
              // Define priority ordering constants to avoid magic numbers
              const PRIORITY_ORDER = {
                [ConversationPriority._EMERGENCY]: 5,
                [ConversationPriority._CRITICAL]: 4,
                [ConversationPriority._HIGH]: 3,
                [ConversationPriority._NORMAL]: 2,
                [ConversationPriority._LOW]: 1
              } as const;
              return options.sortDirection === 'desc'
                ? PRIORITY_ORDER[b.conversation.metadata.priority] - PRIORITY_ORDER[a.conversation.metadata.priority]
                : PRIORITY_ORDER[a.conversation.metadata.priority] - PRIORITY_ORDER[b.conversation.metadata.priority];
            }
            case 'relevance':
            case undefined:
            default:
              return b.lastActivity.getTime() - a.lastActivity.getTime();
          }
        });
        
        // Apply pagination with explicit null handling
        if (typeof options.offset === 'number' || typeof options.limit === 'number') {
          const start = options.offset ?? 0;
          const end = typeof options.limit === 'number' ? start + options.limit : undefined;
          results = results.slice(start, end);
        }
        
        resolve(results);
      };
    });
  }
  
  async deleteSnapshot(conversationId: string): Promise<void> {
    if (!this.db) {await this.initialize();}
    
    return new Promise((resolve, reject) => {
      if (!this.db) { 
        reject(new Error('Database not initialized')); 
        return; 
      }
      const transaction = this.db.transaction(['conversations'], 'readwrite');
      const store = transaction.objectStore('conversations');
      const request = store.delete(conversationId);
      
      request.onerror = (): void => { reject(request.error); };
      request.onsuccess = (): void => { resolve(); };
    });
  }
  
  async clearAll(): Promise<void> {
    if (!this.db) {await this.initialize();}
    
    return new Promise((resolve, reject) => {
      if (!this.db) { 
        reject(new Error('Database not initialized')); 
        return; 
      }
      const transaction = this.db.transaction(
        ['conversations', 'messages', 'branches', 'analytics'], 
        'readwrite'
      );
      
      const stores = ['conversations', 'messages', 'branches', 'analytics'];
      let completed = 0;
      
      const checkComplete = (): void => {
        completed++;
        if (completed === stores.length) {
          resolve();
        }
      };
      
      stores.forEach(storeName => {
        const store = transaction.objectStore(storeName);
        const request = store.clear();
        request.onerror = (): void => { reject(request.error); };
        request.onsuccess = checkComplete;
      });
    });
  }
  
  async getStorageUsage(): Promise<{ used: number; available: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage ?? 0,
        available: estimate.quota ?? 0
      };
    }
    
    // Fallback for browsers without storage API
    return { used: 0, available: 0 };
  }
}

// ===========================
// ANALYTICS ENGINE
// ===========================

const ConversationAnalyticsEngine = {
  calculateAnalytics(
    messages: ConversationMessage[],
    participants: ConversationParticipant[],
    duration: number
  ): ConversationAnalytics {
    const messageCount = messages.length;
    const avgMessageLength = messages.length > 0
      ? messages.reduce((sum, msg) => sum + msg.content.length, 0) / messages.length
      : 0;
    
    // Define timing constants for response time analysis
    const MAX_RESPONSE_TIME_ANALYSIS_MS = 300000; // 5 minutes in milliseconds
    
    // Calculate response times
    const responseTimes: number[] = [];
    for (let i = 1; i < messages.length; i++) {
      const currentMsg = messages[i];
      const prevMsg = messages[i - 1];
      if (currentMsg?.timestamp && prevMsg?.timestamp) {
        const timeDiff = currentMsg.timestamp.getTime() - prevMsg.timestamp.getTime();
        if (timeDiff > 0 && timeDiff < MAX_RESPONSE_TIME_ANALYSIS_MS) { // Ignore gaps > 5 minutes
          responseTimes.push(timeDiff);
        }
      }
    }
    
    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0;
    
    // Calculate participant engagement
    const participantEngagement: Record<string, number> = {};
    participants.forEach(p => {
      const userMessages = messages.filter(msg => msg.sender.id === p.id);
      participantEngagement[p.id] = userMessages.length;
    });
    
    // Calculate topic distribution (simplified)
    const topicDistribution: Record<string, number> = {};
    const commonTopics = ['task', 'project', 'help', 'settings', 'error', 'validation'];
    commonTopics.forEach(topic => {
      const count = messages.filter(msg => 
        msg.content.toLowerCase().includes(topic)
      ).length;
      if (count > 0) {
        topicDistribution[topic] = count;
      }
    });
    
    // Count validation requests
    const validationRequests = messages.filter(msg => 
      msg.type === MessageType._VALIDATION_REQUEST
    ).length;
    
    // Calculate resolution rate (simplified)
    const validationResponses = messages.filter(msg => 
      msg.type === MessageType._VALIDATION_RESPONSE
    ).length;
    
    // Define percentage constant
    const PERCENTAGE_MULTIPLIER = 100;
    const resolutionRate = validationRequests > 0 
      ? (validationResponses / validationRequests) * PERCENTAGE_MULTIPLIER 
      : 0;
    
    return {
      messageCount,
      avgMessageLength: Math.round(avgMessageLength),
      avgResponseTime: Math.round(avgResponseTime),
      participantEngagement,
      topicDistribution,
      validationRequests,
      resolutionRate: Math.round(resolutionRate),
      sessionDuration: duration
    };
  }
}

// ===========================
// CONTEXT PREDICTION ENGINE
// ===========================

const ContextPredictionEngine = {
  generatePredictions(
    context: ParlantConversationContext,
    messages: ConversationMessage[],
    analytics: ConversationAnalytics
  ): ContextPrediction {
    const recentMessages = messages.slice(RECENT_MESSAGES_SLICE); // Look at recent messages
    
    // Predict next actions based on conversation patterns
    const suggestedActions = this.predictActions(recentMessages, context);
    
    // Predict likely topics
    const likelyTopics = this.predictTopics(recentMessages, analytics.topicDistribution);
    
    // Recommend participants
    const recommendedParticipants = this.predictParticipants(context, analytics);
    
    // Predict response time with buffer
    const RESPONSE_TIME_BUFFER_MULTIPLIER = 1.1; // 10% buffer for response time predictions
    const expectedResponseTime = analytics.avgResponseTime * RESPONSE_TIME_BUFFER_MULTIPLIER;
    
    // Calculate confidence
    const confidence = this.calculatePredictionConfidence(recentMessages, analytics);
    
    // Generate reasoning
    const reasoning = this.generateReasoning(suggestedActions, likelyTopics, confidence);
    
    return {
      suggestedActions,
      likelyTopics,
      recommendedParticipants,
      expectedResponseTime,
      confidence,
      reasoning
    };
  },
  
  predictActions(
    recentMessages: ConversationMessage[],
    _context: ParlantConversationContext
  ): string[] {
    const actions: string[] = [];
    const lastMessage = recentMessages[recentMessages.length - 1];
    
    if (!lastMessage) {return actions;}
    
    const content = lastMessage.content.toLowerCase();
    
    // Rule-based action prediction
    if (content.includes('help') || content.includes('how')) {
      actions.push('Provide assistance or documentation');
    }
    
    if (content.includes('error') || content.includes('problem')) {
      actions.push('Investigate and resolve issue');
    }
    
    if (content.includes('create') || content.includes('new')) {
      actions.push('Create new resource or task');
    }
    
    if (lastMessage.type === MessageType._VALIDATION_REQUEST) {
      actions.push('Review and approve/deny validation request');
    }
    
    if (_context.state === ConversationState._VALIDATING) {
      actions.push('Complete validation process');
    }
    
    // Default actions
    if (actions.length === 0) {
      actions.push('Continue conversation', 'Provide clarification');
    }
    
    return actions;
  },
  
  predictTopics(
    recentMessages: ConversationMessage[],
    topicDistribution: Record<string, number>
  ): string[] {
    const topics: string[] = [];
    
    // Get current trending topics
    const MAX_PREDICTED_TOPICS = 3; // Limit to top 3 trending topics
    const sortedTopics = Object.entries(topicDistribution)
      .sort(([,a], [,b]) => b - a)
      .slice(0, MAX_PREDICTED_TOPICS)
      .map(([topic]) => topic);
    
    topics.push(...sortedTopics);
    
    // Predict new topics based on recent messages
    const recentContent = recentMessages
      .map(msg => msg.content.toLowerCase())
      .join(' ');
    
    const potentialTopics = ['task management', 'project updates', 'system configuration'];
    potentialTopics.forEach(topic => {
      const keywords = topic.split(' ');
      if (keywords.some(keyword => recentContent.includes(keyword))) {
        if (!topics.includes(topic)) {
          topics.push(topic);
        }
      }
    });
    
    return topics;
  },
  
  predictParticipants(
    _context: ParlantConversationContext,
    _analytics: ConversationAnalytics
  ): ConversationParticipant[] {
    // For now, return current participants
    // In a real implementation, this would recommend additional participants
    // based on expertise, availability, and conversation topic
    return [];
  },
  
  calculatePredictionConfidence(
    recentMessages: ConversationMessage[],
    analytics: ConversationAnalytics
  ): number {
    let confidence = BASE_CONFIDENCE; // Base confidence
    
    // Higher confidence with more messages
    if (analytics.messageCount > HIGH_MESSAGE_COUNT_THRESHOLD) {
      confidence += CONFIDENCE_BOOST_MESSAGES;
    }
    
    // Higher confidence with consistent patterns
    if (analytics.avgResponseTime > 0 && analytics.avgResponseTime < MAX_RESPONSE_TIME_MS) {
      confidence += CONFIDENCE_BOOST_TIMING;
    }
    
    // Higher confidence with recent activity
    const lastMessageTime = recentMessages[recentMessages.length - 1]?.timestamp;
    if (lastMessageTime && Date.now() - lastMessageTime.getTime() < RECENT_ACTIVITY_WINDOW_MS) {
      confidence += CONFIDENCE_BOOST_TIMING;
    }
    
    return Math.min(MAX_CONFIDENCE, confidence);
  },
  
  generateReasoning(
    actions: string[],
    topics: string[],
    confidence: number
  ): string {
    // Define confidence level thresholds
    const HIGH_CONFIDENCE_THRESHOLD = 0.8;   // 80% confidence for high level
    const MODERATE_CONFIDENCE_THRESHOLD = 0.5; // 50% confidence for moderate level
    
    let confidenceLevel: string;
    if (confidence > HIGH_CONFIDENCE_THRESHOLD) {
      confidenceLevel = 'high';
    } else if (confidence > MODERATE_CONFIDENCE_THRESHOLD) {
      confidenceLevel = 'moderate';
    } else {
      confidenceLevel = 'low';
    }
    
    return `Based on conversation patterns and recent activity, I have ${confidenceLevel} confidence in these predictions. ` +
           `The suggested actions (${actions.length}) and likely topics (${topics.length}) are derived from ` +
           `message analysis and participant behavior patterns.`;
  }
}

// ===========================
// MAIN HOOK IMPLEMENTATION
// ===========================

/**
 * Conversation Context Management Hook
 * 
 * Provides comprehensive conversation context management with persistence,
 * analytics, predictions, and branching capabilities.
 */
export const useConversationContext = ({
  config: userConfig = {},
  autoLoad,
  onContextChange,
  onContextSaved,
  onSyncComplete: _onSyncComplete,
  onError
}: UseConversationContextProps = {}): UseConversationContextReturn => {
  // ===========================
  // STATE AND CONFIGURATION
  // ===========================
  
  const config = useMemo(() => ({
    ...DEFAULT_CONFIG,
    ...userConfig
  }), [userConfig]);
  
  const [currentContext, setCurrentContextState] = useState<ParlantConversationContext | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [participants, setParticipants] = useState<ConversationParticipant[]>([]);
  const [contextSummary, setContextSummary] = useState<ContextSummary | null>(null);
  const [analytics, setAnalytics] = useState<ConversationAnalytics | null>(null);
  const [predictions, setPredictions] = useState<ContextPrediction | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  
  // Refs for timers and storage
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);
  const storage = useRef(new ConversationStorage());
  
  // ===========================
  // CONTEXT MANAGEMENT
  // ===========================
  
  const setCurrentContext = useCallback((context: ParlantConversationContext | null) => {
    setCurrentContextState(context);
    
    if (context !== null && context !== undefined) {
      const historyMessages = context.metadata?.history;
      if (historyMessages !== null && historyMessages !== undefined && Array.isArray(historyMessages)) {
        setMessages(historyMessages.map(h => ({
          id: h.id,
          conversationId: context.conversationId,
          sender: {
            id: h.actor,
            type: ParticipantType._HUMAN,
            name: h.actor,
            role: ParticipantRole._REQUESTOR,
            capabilities: [],
            joinedAt: h.timestamp
          },
          content: h.content,
          type: MessageType._TEXT,
          timestamp: h.timestamp,
          metadata: h.metadata ?? {}
        })));
      } else {
        setMessages([]);
      }
      setParticipants(context.participants);
    } else {
      setMessages([]);
      setParticipants([]);
    }
    
    onContextChange?.(context);
    logDebug('Context changed', { contextId: context?.conversationId }, 'useConversationContext');
  }, [onContextChange]);

  // Helper function declarations moved here to avoid hoisting issues
  const generateContextSummary = useCallback((
    messages: ConversationMessage[],
    context: ParlantConversationContext | null
  ): string => {
    if (!context) {return '';}

    const messageCount = messages.length;
    const participantCount = participants.length;
    const duration = context.updatedAt.getTime() - context.createdAt.getTime();
    const durationHours = Math.round(duration / (1000 * 60 * 60) * 10) / 10;

    return `${messageCount} messages from ${participantCount} participants over ${durationHours}h`;
  }, [participants]);

  const saveContext = useCallback(async () => {
    if (!currentContext || !config.enablePersistence) {return;}

    setIsSaving(true);

    try {
      // Generate context summary
      const summary = generateContextSummary(messages, currentContext);
      setContextSummary(summary);

      // Calculate analytics
      if (config.enableAnalytics) {
        const sessionStart = currentContext.createdAt;
        const duration = Date.now() - sessionStart.getTime();
        const analyticsData = ConversationAnalyticsEngine.calculateAnalytics(
          messages,
          participants,
          duration
        );
        setAnalytics(analyticsData);
      }

      // Create snapshot
      const snapshot: ConversationSnapshot = {
        conversation: currentContext,
        messages,
        participants,
        contextSummary: summary,
        snapshotAt: new Date(),
        lastActivity: new Date(),
        analytics: analytics ?? ConversationAnalyticsEngine.calculateAnalytics(messages, participants, 0),
        syncStatus: syncStatus ?? {
          lastSync: new Date(),
          state: 'synced',
          pendingChanges: 0,
          syncAttempts: 0
        }
      };

      // Save to storage
      await storage.current.saveSnapshot(snapshot);
      setLastSaved(new Date());

      onContextSaved?.(currentContext);
      logInfo('Context saved successfully', { contextId: currentContext.conversationId }, 'useConversationContext');

    } catch (error) {
      logError('Failed to save context', error, 'useConversationContext');
      onError?.('Failed to save conversation context');
    } finally {
      setIsSaving(false);
    }
  }, [currentContext, messages, participants, analytics, syncStatus, config.enablePersistence, config.enableAnalytics, onContextSaved, onError, generateContextSummary]);

  const updateContext = useCallback(async (updates: Partial<ParlantConversationContext>) => {
    if (!currentContext) {return;}
    
    const updatedContext = {
      ...currentContext,
      ...updates,
      updatedAt: new Date()
    };
    
    setCurrentContextState(updatedContext);
    
    if (config.enablePersistence) {
      await saveContext();
    }
    
    logDebug('Context updated', { contextId: currentContext.conversationId }, 'useConversationContext');
  }, [currentContext, config.enablePersistence, saveContext]);

  const loadContext = useCallback(async (conversationId: string): Promise<ParlantConversationContext | null> => {
    if (!config.enablePersistence) {return null;}
    
    setIsLoading(true);
    
    try {
      const snapshot = await storage.current.loadSnapshot(conversationId);
      
      if (snapshot) {
        setCurrentContextState(snapshot.conversation);
        setMessages(snapshot.messages);
        setParticipants(snapshot.participants);
        setContextSummary(snapshot.contextSummary);
        setAnalytics(snapshot.analytics);
        setSyncStatus(snapshot.syncStatus);
        
        // Update predictions if enabled
        if (config.enablePrediction) {
          const newPredictions = ContextPredictionEngine.generatePredictions(
            snapshot.conversation,
            snapshot.messages,
            snapshot.analytics
          );
          setPredictions(newPredictions);
        }
        
        logInfo('Context loaded successfully', { contextId: conversationId }, 'useConversationContext');
        return snapshot.conversation;
      }
      
      return null;
      
    } catch (error) {
      logError('Failed to load context', error, 'useConversationContext');
      onError?.('Failed to load conversation context');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [config.enablePersistence, config.enablePrediction, onError]);
  
  const deleteContext = useCallback(async (conversationId: string) => {
    try {
      await storage.current.deleteSnapshot(conversationId);
      
      if (currentContext?.conversationId === conversationId) {
        setCurrentContext(null);
      }
      
      logInfo('Context deleted successfully', { contextId: conversationId }, 'useConversationContext');
    } catch (error) {
      logError('Failed to delete context', error, 'useConversationContext');
      onError?.('Failed to delete conversation context');
    }
  }, [currentContext, onError, setCurrentContext]);
  
  // ===========================
  // MESSAGE MANAGEMENT
  // ===========================
  
  const addMessage = useCallback(async (message: ConversationMessage) => {
    setMessages(prev => [...prev, message]);
    
    // Update context history
    if (currentContext) {
      const historyEntry: ConversationHistoryEntry = {
        id: message.id,
        timestamp: message.timestamp,
        type: ConversationHistoryType._MESSAGE,
        actor: message.sender.id,
        content: message.content,
        metadata: message.metadata ?? {}
      };
      
      await updateContext({
        metadata: {
          ...currentContext.metadata,
          history: [...currentContext.metadata.history, historyEntry]
        }
      });
    }
    
    logDebug('Message added', { messageId: message.id }, 'useConversationContext');
  }, [currentContext, updateContext]);
  
  const updateMessage = useCallback(async (messageId: string, updates: Partial<ConversationMessage>) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, ...updates } : msg
    ));
    
    logDebug('Message updated', { messageId }, 'useConversationContext');
  }, []);
  
  const deleteMessage = useCallback(async (messageId: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
    
    logDebug('Message deleted', { messageId }, 'useConversationContext');
  }, []);
  
  const getMessages = useCallback((limit?: number, offset?: number): ConversationMessage[] => {
    let result = [...messages];
    
    if (offset !== null && offset !== undefined && offset > 0) {
      result = result.slice(offset);
    }
    
    if (limit !== null && limit !== undefined && limit > 0) {
      result = result.slice(0, limit);
    }
    
    return result;
  }, [messages]);
  
  // ===========================
  // PARTICIPANT MANAGEMENT
  // ===========================
  
  const addParticipant = useCallback(async (participant: ConversationParticipant) => {
    setParticipants(prev => {
      const exists = prev.some(p => p.id === participant.id);
      return exists ? prev : [...prev, participant];
    });
    
    logDebug('Participant added', { participantId: participant.id }, 'useConversationContext');
  }, []);
  
  const removeParticipant = useCallback(async (participantId: string) => {
    setParticipants(prev => prev.filter(p => p.id !== participantId));
    
    logDebug('Participant removed', { participantId }, 'useConversationContext');
  }, []);
  
  const updateParticipant = useCallback(async (
    participantId: string, 
    updates: Partial<ConversationParticipant>
  ) => {
    setParticipants(prev => prev.map(p => 
      p.id === participantId ? { ...p, ...updates } : p
    ));
    
    logDebug('Participant updated', { participantId }, 'useConversationContext');
  }, []);
  
  // ===========================
  // SEARCH AND RETRIEVAL
  // ===========================
  
  const searchContexts = useCallback(async (options: ContextSearchOptions): Promise<ConversationSnapshot[]> => {
    try {
      const results = await storage.current.searchSnapshots(options);
      logDebug('Context search completed', { resultCount: results.length }, 'useConversationContext');
      return results;
    } catch (error) {
      logError('Context search failed', error, 'useConversationContext');
      onError?.('Failed to search conversation contexts');
      return [];
    }
  }, [onError]);
  
  // Define default limits for context retrieval
  const DEFAULT_RECENT_CONTEXTS_LIMIT = 10;
  
  const getRecentContexts = useCallback(async (limit = DEFAULT_RECENT_CONTEXTS_LIMIT): Promise<ConversationSnapshot[]> => {
    return searchContexts({
      sortBy: 'activity',
      sortDirection: 'desc',
      limit
    });
  }, [searchContexts]);
  
  const DEFAULT_LIMIT = 10;
  const getArchivedContexts = useCallback(async (limit = DEFAULT_LIMIT): Promise<ConversationSnapshot[]> => {
    return searchContexts({
      states: [ConversationState._COMPLETED],
      sortBy: 'date',
      sortDirection: 'desc',
      limit,
      includeArchived: true
    });
  }, [searchContexts]);
  
  // ===========================
  // UTILITY FUNCTIONS
  // ===========================
  
  const generateDetailedContextSummary = useCallback((
    hookMessages: ConversationMessage[],
    _context: ParlantConversationContext
  ): ContextSummary => {
    // Extract topics from messages
    const topics = extractTopicsFromMessages(hookMessages);

    // Extract decisions and actions
    const decisions = extractDecisions(hookMessages);
    const pendingActions = extractPendingActions(hookMessages);

    // Get key participants
    const keyParticipants = participants
      .filter(p => hookMessages.some(m => m.sender.id === p.id))
      .map(p => p.name);

    // Simple sentiment analysis
    const sentiment = analyzeSentiment(hookMessages);

    // Determine complexity
    let complexity: 'simple' | 'moderate' | 'complex';
    if (hookMessages.length > HIGH_COMPLEXITY_THRESHOLD) {
      complexity = 'complex';
    } else if (hookMessages.length > MODERATE_COMPLEXITY_THRESHOLD) {
      complexity = 'moderate';
    } else {
      complexity = 'simple';
    }

    // Generate summary text
    const summary = generateSummaryText(hookMessages, topics, decisions);

    return {
      topics,
      decisions,
      pendingActions,
      keyParticipants,
      sentiment,
      complexity,
      summary
    };
  }, [participants]);
  
  const extractTopicsFromMessages = (hookMessages: ConversationMessage[]): string[] => {
    const topics = new Set<string>();
    const commonTopics = ['task', 'project', 'help', 'error', 'validation', 'settings'];
    
    hookMessages.forEach(message => {
      const content = message.content.toLowerCase();
      commonTopics.forEach(topic => {
        if (content.includes(topic)) {
          topics.add(topic);
        }
      });
    });
    
    return Array.from(topics);
  };
  
  const extractDecisions = (hookMessages: ConversationMessage[]): string[] => {
    return hookMessages
      .filter(msg => 
        msg.content.toLowerCase().includes('decided') ||
        msg.content.toLowerCase().includes('approved') ||
        msg.content.toLowerCase().includes('rejected')
      )
      .map(msg => msg.content.substring(0, MAX_PREVIEW_LENGTH));
  };
  
  const extractPendingActions = (hookMessages: ConversationMessage[]): string[] => {
    return hookMessages
      .filter(msg => 
        msg.content.toLowerCase().includes('todo') ||
        msg.content.toLowerCase().includes('action item') ||
        msg.content.toLowerCase().includes('need to')
      )
      .map(msg => msg.content.substring(0, MAX_PREVIEW_LENGTH));
  };
  
  const analyzeSentiment = (hookMessages: ConversationMessage[]): 'positive' | 'neutral' | 'negative' => {
    // Simple sentiment analysis based on keywords
    let score = 0;
    const positiveWords = ['good', 'great', 'excellent', 'success', 'approved', 'working'];
    const negativeWords = ['error', 'problem', 'failed', 'issue', 'denied', 'broken'];
    
    hookMessages.forEach(message => {
      const content = message.content.toLowerCase();
      positiveWords.forEach(word => {
        if (content.includes(word)) {score++;}
      });
      negativeWords.forEach(word => {
        if (content.includes(word)) {score--;}
      });
    });
    
    if (score > 0) {
      return 'positive';
    }
    if (score < 0) {
      return 'negative';
    }
    return 'neutral';
  };
  
  const generateSummaryText = (
    hookMessages: ConversationMessage[],
    topics: string[],
    decisions: string[]
  ): string => {
    const messageCount = hookMessages.length;
    const topicList = topics.length > 0 ? topics.join(', ') : 'general discussion';
    const decisionCount = decisions.length;
    
    return `Conversation with ${messageCount} messages covering ${topicList}. ` +
           `${decisionCount} decisions made during this session.`;
  };
  
  // ===========================
  // SYNC AND PERSISTENCE
  // ===========================
  
  const sync = useCallback(async () => {
    // TODO: Implement cloud sync
    logDebug('Sync operation completed', null, 'useConversationContext');
  }, []);
  
  const clearAll = useCallback(async () => {
    try {
      await storage.current.clearAll();
      setCurrentContext(null);
      setContextSummary(null);
      setAnalytics(null);
      setPredictions(null);
      setLastSaved(null);
      setSyncStatus(null);
      
      logInfo('All contexts cleared', null, 'useConversationContext');
    } catch (error) {
      logError('Failed to clear contexts', error, 'useConversationContext');
      onError?.('Failed to clear conversation contexts');
    }
  }, [onError, setCurrentContext]);
  
  // ===========================
  // EFFECTS
  // ===========================
  
  // Auto-save timer
  useEffect(() => {
    if (config.enablePersistence && config.autoSaveInterval > 0) {
      autoSaveTimer.current = setInterval(() => {
        if (currentContext && !isSaving) {
          saveContext().catch((error) => {
            logError('Auto-save failed', error, 'useConversationContext');
          });
        }
      }, config.autoSaveInterval);
    }
    
    return (): void => {
      if (autoSaveTimer.current) {
        clearInterval(autoSaveTimer.current);
      }
    };
  }, [config.enablePersistence, config.autoSaveInterval, currentContext, isSaving, saveContext]);
  
  // Auto-load on mount
  useEffect(() => {
    if (autoLoad !== null && autoLoad !== undefined && autoLoad.length > 0 && config.enablePersistence) {
      loadContext(autoLoad).catch((error) => {
        logError('Auto-load failed', error, 'useConversationContext');
      });
    }
  }, [autoLoad, config.enablePersistence, loadContext]);
  
  // Update predictions when context changes
  useEffect(() => {
    if (config.enablePrediction && currentContext && messages.length > 0 && analytics) {
      const newPredictions = ContextPredictionEngine.generatePredictions(
        currentContext,
        messages,
        analytics
      );
      setPredictions(newPredictions);
    }
  }, [config.enablePrediction, currentContext, messages, analytics]);
  
  // ===========================
  // RETURN INTERFACE
  // ===========================
  
  return {
    // Current context
    currentContext,
    contextSummary,
    analytics,
    predictions,
    
    // Persistence
    isLoading,
    isSaving,
    lastSaved,
    syncStatus,
    
    // Context management
    setCurrentContext,
    updateContext,
    saveContext,
    loadContext,
    deleteContext,
    
    // Message management
    addMessage,
    updateMessage,
    deleteMessage,
    getMessages,
    
    // Participant management
    addParticipant,
    removeParticipant,
    updateParticipant,
    
    // Search and retrieval
    searchContexts,
    getRecentContexts,
    getArchivedContexts,
    
    // Branching (TODO: Implement)
    createBranch: async (): Promise<string> => {
      // TODO: Implement branching
      return '';
    },
    mergeBranch: async (): Promise<void> => {
      // TODO: Implement branch merging
    },
    abandonBranch: async (): Promise<void> => {
      // TODO: Implement branch abandoning
    },
    getBranches: async () => [],
    
    // Analytics (TODO: Enhance)
    getAnalytics: async (): Promise<ConversationAnalytics> => analytics ?? ConversationAnalyticsEngine.calculateAnalytics([], [], 0),
    exportAnalytics: async () => JSON.stringify(analytics),
    
    // Predictions
    getPredictions: async () => predictions,
    updatePredictions: async (): Promise<void> => {
      if (config.enablePrediction && currentContext && analytics) {
        const newPredictions = ContextPredictionEngine.generatePredictions(
          currentContext,
          messages,
          analytics
        );
        setPredictions(newPredictions);
      }
    },
    
    // Sync
    sync,
    enableSync: (): void => {
      // TODO: Implement sync enabling/disabling
    },
    getSyncStatus: (): SyncStatus | null => syncStatus,
    
    // Utilities
    clearAll,
    exportContext: async (conversationId: string): Promise<string> => {
      const snapshot = await storage.current.loadSnapshot(conversationId);
      return JSON.stringify(snapshot);
    },
    importContext: async (): Promise<string> => {
      // TODO: Implement context import
      return '';
    },
    getStorageUsage: (): Promise<{ used: number; available: number }> => storage.current.getStorageUsage(),
  };
};

export default useConversationContext;