/**
 * Parlant Integration Service - MAXIMUM IMPLEMENTATION
 *
 * Provides comprehensive conversational AI validation for ALL Bytebot functions
 * implementing function-level wrapping with Parlant's conversational validation engine.
 *
 * Features:
 * - Pre-execution conversational validation of all AI operations
 * - Real-time intent verification through natural language processing
 * - Safety guardrails and compliance enforcement
 * - Complete conversational audit trail for enterprise requirements
 * - Performance optimization with intelligent caching
 *
 * Architecture: Parlant conversation engine integration with AIgent function registry
 * Security: Enterprise-grade validation with conversational authentication
 * Performance: Sub-1000ms validation with multi-level caching (target: <500ms)
 */
import { OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
/**
 * Parlant conversation context for function validation
 */
export interface ParlantConversationContext {
  readonly userId: string;
  readonly sessionId?: string;
  readonly agentRole: string;
  readonly securityLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  readonly conversationHistory: ConversationEntry[];
  readonly metadata: Record<string, unknown>;
}
/**
 * Conversation entry for audit trail
 */
export interface ConversationEntry {
  readonly timestamp: Date;
  readonly speaker: 'USER' | 'ASSISTANT' | 'SYSTEM';
  readonly message: string;
  readonly intent?: string;
  readonly confidence?: number;
}
/**
 * Parlant validation request for function calls
 */
export interface ParlantValidationRequest {
  readonly functionName: string;
  readonly functionParams: Record<string, unknown>;
  readonly actionDescription: string;
  readonly context: ParlantConversationContext;
  readonly riskLevel: RiskLevel;
  readonly operationId: string;
}
/**
 * Risk level assessment for function execution
 */
export declare enum RiskLevel {
  MINIMAL = 'MINIMAL', // Read operations, info queries
  LOW = 'LOW', // Safe automation, basic interactions
  MEDIUM = 'MEDIUM', // File operations, application control
  HIGH = 'HIGH', // System modifications, network operations
  CRITICAL = 'CRITICAL',
}
/**
 * Parlant validation response with approval decision
 */
export interface ParlantValidationResponse {
  readonly approved: boolean;
  readonly conversationId: string;
  readonly validationTimestamp: Date;
  readonly reasoning: string;
  readonly confidence: number;
  readonly suggestedAlternatives?: string[];
  readonly additionalContext?: Record<string, unknown>;
  readonly executionContext?: ExecutionContext;
}
/**
 * Execution context for approved operations
 */
export interface ExecutionContext {
  readonly timeoutMs?: number;
  readonly retryAttempts?: number;
  readonly monitoringLevel: 'BASIC' | 'DETAILED' | 'COMPREHENSIVE';
  readonly safeguards: string[];
}
/**
 * Conversational validation error for blocked operations
 */
export declare class ConversationalValidationError extends Error {
  readonly conversationId: string;
  readonly reasoning: string;
  readonly suggestedAlternatives: string[];
  constructor(
    conversationId: string,
    reasoning: string,
    suggestedAlternatives?: string[],
  );
}
/**
 * Parlant audit trail entry for compliance
 */
export interface ParlantAuditEntry {
  readonly operationId: string;
  readonly conversationId: string;
  readonly functionName: string;
  readonly actionDescription: string;
  readonly validationResult: 'APPROVED' | 'DENIED' | 'ERROR';
  readonly executionResult: 'SUCCESS' | 'FAILURE' | 'TIMEOUT' | 'CANCELLED';
  readonly timestamp: Date;
  readonly duration: number;
  readonly userId: string;
  readonly riskLevel: RiskLevel;
  readonly conversationSummary: string;
}
export declare class ParlantIntegrationService
  implements OnApplicationShutdown
{
  private readonly configService;
  private readonly logger;
  private readonly validationCache;
  private readonly conversationSessions;
  private readonly auditTrail;
  private readonly parlantApiClient;
  private parlantWebSocket;
  private readonly parlantServerUrl;
  private readonly parlantApiKey;
  private validationCount;
  private cacheHitCount;
  private averageValidationTime;
  constructor(configService: ConfigService);
  /**
   * Validate function execution through Parlant conversational AI
   *
   * This is the core method for function-level validation that ensures
   * every AI operation is validated against user intent through conversation.
   *
   * @param request - Comprehensive validation request with function details
   * @returns Promise with validation decision and execution context
   * @throws ConversationalValidationError if validation fails
   */
  validateFunctionExecution(
    request: ParlantValidationRequest,
  ): Promise<ParlantValidationResponse>;
  /**
   * Initialize WebSocket connection to Parlant server for real-time updates
   */
  private initializeParlantWebSocket;
  /**
   * Handle incoming WebSocket messages from Parlant
   */
  private handleParlantWebSocketMessage;
  /**
   * Perform actual conversational validation with Parlant API
   *
   * @param request - Validation request with function details
   * @returns Validation response with approval decision
   */
  private performConversationalValidation;
  /**
   * Fallback mock validation when Parlant API is unavailable
   */
  private performMockValidation;
  /**
   * Assess risk-based approval for function execution
   */
  private assessRiskBasedApproval;
  /**
   * Perform context-aware validation based on user history and environment
   */
  private performContextValidation;
  /**
   * Analyze user intent through conversation context (mock - to be replaced with Parlant)
   */
  private analyzeUserIntent;
  private generateCacheKey;
  private getCachedValidation;
  private setCachedValidation;
  private isCacheEntryValid;
  private updatePerformanceMetrics;
  private logPerformanceMetrics;
  private createAuditEntry;
  private isParlantEnabled;
  private isCacheEnabled;
  private isAuditEnabled;
  private hasAppropriateMediumRiskPermissions;
  private hasHighRiskPermissions;
  private hasCriticalRiskPermissions;
  private hasRecentUserInteraction;
  private checkUserPermissions;
  private detectSuspiciousActivity;
  private checkSystemState;
  private assessContextClarity;
  private getDenialReason;
  private generateAlternatives;
  private generateExecutionContext;
  private getTimeoutForRiskLevel;
  private getRetryAttemptsForRiskLevel;
  private getMonitoringLevelForRiskLevel;
  private getSafeguardsForFunction;
  /**
   * Get or create a Parlant session for the user context
   */
  private getOrCreateParlantSession;
  /**
   * Create conversation context in Parlant for function validation
   */
  private createParlantConversationContext;
  /**
   * Submit validation request to Parlant conversation engine
   */
  private submitValidationToParlant;
  /**
   * Perform intent analysis using Parlant's NLP capabilities
   */
  private performParlantIntentAnalysis;
  /**
   * Clean up Parlant resources on service shutdown
   */
  onApplicationShutdown(): Promise<void>;
}
