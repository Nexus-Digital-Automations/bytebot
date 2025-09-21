/**
 * Conversation Context Types
 *
 * Type definitions for conversational context objects used throughout
 * the application for PARLANT integration and conversational interfaces.
 */

export interface ConversationContext {
  /** Unique conversation identifier */
  conversationId?: string;

  /** Session identifier */
  sessionId?: string;

  /** User identifier */
  userId?: string;

  /** Previous queries in the conversation */
  previousQueries?: string[];

  /** Context metadata */
  metadata?: Record<string, unknown>;

  /** Conversation start timestamp */
  startedAt?: Date;

  /** Last activity timestamp */
  lastActivity?: Date;

  /** Current conversation state */
  state?: 'active' | 'paused' | 'ended';

  /** Current topic or focus area */
  currentTopic?: string;

  /** User preferences for this conversation */
  preferences?: {
    verbosity?: 'low' | 'medium' | 'high';
    includeDetails?: boolean;
    format?: 'concise' | 'detailed' | 'technical';
  };

  /** Security context */
  securityContext?: {
    permissions?: string[];
    role?: string;
    accessLevel?: string;
  };
}

export interface ParlantConversationContext extends ConversationContext {
  /** PARLANT-specific conversation data */
  parlantData?: {
    /** Conversation analysis */
    analysis?: {
      sentiment?: 'positive' | 'neutral' | 'negative';
      intent?: string;
      confidence?: number;
    };

    /** Suggested follow-up questions */
    suggestedQuestions?: string[];

    /** Context understanding */
    understanding?: {
      keyEntities?: string[];
      mainConcerns?: string[];
      actionItems?: string[];
    };
  };
}

export type ConversationContextParameter = ConversationContext | ParlantConversationContext | undefined;