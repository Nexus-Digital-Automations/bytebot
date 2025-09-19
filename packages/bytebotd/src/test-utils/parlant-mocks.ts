/**
 * Parlant Mock Services - Comprehensive Testing Framework
 *
 * Provides comprehensive mock implementations for all Parlant integration services
 * enabling high-coverage unit testing without external dependencies.
 *
 * Features:
 * - Complete Parlant API mock with configurable responses
 * - WebSocket connection simulation for real-time features
 * - Realistic latency simulation for performance testing
 * - Error scenario simulation for resilience testing
 * - Comprehensive validation response generation
 *
 * @author Claude Code - Unit Testing Agent
 * @version 1.0.0
 */

import { jest } from '@jest/globals';
import WebSocket from 'ws';
import { EventEmitter } from 'events';
import {
  ParlantValidationRequest,
  ParlantValidationResponse,
  RiskLevel,
  ConversationEntry,
  ParlantConversationContext
} from '../parlant/parlant-integration.service';

// ===== MOCK CONFIGURATION =====

export interface MockConfig {
  readonly simulateLatency: boolean;
  readonly latencyRange: [number, number]; // [min, max] in milliseconds
  readonly successRate: number; // 0.0 to 1.0
  readonly enableWebSocket: boolean;
  readonly enableCaching: boolean;
  readonly maxCacheSize: number;
}

export const DEFAULT_MOCK_CONFIG: MockConfig = {
  simulateLatency: true,
  latencyRange: [10, 50],
  successRate: 0.95,
  enableWebSocket: true,
  enableCaching: true,
  maxCacheSize: 1000,
};

// ===== PARLANT API MOCK =====

export class MockParlantApiClient {
  private readonly config: MockConfig;
  private readonly responseCache = new Map<string, ParlantValidationResponse>();
  private readonly sessionStore = new Map<string, any>();
  private requestCount = 0;
  private readonly logger = jest.fn();

  constructor(config: MockConfig = DEFAULT_MOCK_CONFIG) {
    this.config = config;
  }

  /**
   * Mock session creation
   */
  async createSession(userId: string, agentRole: string): Promise<{ sessionId: string }> {
    await this.simulateDelay();

    const sessionId = `mock_session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const session = {
      id: sessionId,
      agent_id: agentRole,
      customer_id: userId,
      title: `Mock Session for ${userId}`,
      status: 'active',
      created_at: new Date().toISOString(),
    };

    this.sessionStore.set(sessionId, session);
    this.requestCount++;

    return { sessionId };
  }

  /**
   * Mock validation request
   */
  async validateFunction(request: ParlantValidationRequest): Promise<ParlantValidationResponse> {
    await this.simulateDelay();

    // Check cache first
    const cacheKey = this.generateCacheKey(request);
    if (this.config.enableCaching && this.responseCache.has(cacheKey)) {
      const cached = this.responseCache.get(cacheKey)!;
      return { ...cached, cached: true };
    }

    // Simulate success/failure based on success rate
    const isSuccess = Math.random() < this.config.successRate;
    const response = isSuccess
      ? this.generateSuccessResponse(request)
      : this.generateFailureResponse(request);

    // Cache the response
    if (this.config.enableCaching && this.responseCache.size < this.config.maxCacheSize) {
      this.responseCache.set(cacheKey, response);
    }

    this.requestCount++;
    return response;
  }

  /**
   * Mock batch validation
   */
  async validateBatch(requests: ParlantValidationRequest[]): Promise<ParlantValidationResponse[]> {
    await this.simulateDelay(requests.length * 5); // Batch processing overhead

    const responses = await Promise.all(
      requests.map(request => this.validateFunction(request))
    );

    return responses;
  }

  /**
   * Generate realistic success response
   */
  private generateSuccessResponse(request: ParlantValidationRequest): ParlantValidationResponse {
    const confidence = this.calculateConfidence(request);
    const approved = confidence > 0.7;

    return {
      approved,
      confidence,
      reasoning: this.generateReasoning(request, approved),
      intent: this.extractIntent(request),
      suggestedAlternatives: approved ? [] : this.generateAlternatives(request),
      validationTimestamp: new Date(),
      conversationId: request.context.sessionId || 'mock_conversation',
      executionContext: {
        riskLevel: request.riskLevel,
        validationTimeMs: this.randomInRange(10, 50),
        cacheHit: false,
      },
      cached: false,
    };
  }

  /**
   * Generate realistic failure response
   */
  private generateFailureResponse(request: ParlantValidationRequest): ParlantValidationResponse {
    return {
      approved: false,
      confidence: 0.1,
      reasoning: `Mock validation failure for ${request.functionName}: ${this.generateErrorReason()}`,
      intent: 'DENIED',
      suggestedAlternatives: [],
      validationTimestamp: new Date(),
      conversationId: request.context.sessionId || 'mock_conversation',
      executionContext: {
        riskLevel: request.riskLevel,
        validationTimeMs: this.randomInRange(5, 20),
        cacheHit: false,
      },
      cached: false,
    };
  }

  /**
   * Calculate confidence based on request characteristics
   */
  private calculateConfidence(request: ParlantValidationRequest): number {
    let confidence = 0.8; // Base confidence

    // Adjust based on risk level
    switch (request.riskLevel) {
      case RiskLevel.MINIMAL:
        confidence += 0.15;
        break;
      case RiskLevel.LOW:
        confidence += 0.1;
        break;
      case RiskLevel.MEDIUM:
        confidence += 0.0;
        break;
      case RiskLevel.HIGH:
        confidence -= 0.1;
        break;
      case RiskLevel.CRITICAL:
        confidence -= 0.2;
        break;
    }

    // Adjust based on function name patterns
    if (request.functionName.includes('read') || request.functionName.includes('get')) {
      confidence += 0.1;
    }
    if (request.functionName.includes('delete') || request.functionName.includes('remove')) {
      confidence -= 0.15;
    }

    return Math.max(0.1, Math.min(0.99, confidence));
  }

  /**
   * Generate reasoning text
   */
  private generateReasoning(request: ParlantValidationRequest, approved: boolean): string {
    const action = approved ? 'approved' : 'denied';
    const risk = request.riskLevel.toLowerCase();

    return `Mock validation ${action} for ${request.functionName} with ${risk} risk level. ` +
           `Action: ${request.actionDescription}. ` +
           `Context includes ${request.context.conversationHistory.length} conversation entries.`;
  }

  /**
   * Extract intent from request
   */
  private extractIntent(request: ParlantValidationRequest): string {
    const functionName = request.functionName.toLowerCase();

    if (functionName.includes('read') || functionName.includes('get')) {
      return 'QUERY_INFORMATION';
    }
    if (functionName.includes('create') || functionName.includes('add')) {
      return 'CREATE_RESOURCE';
    }
    if (functionName.includes('update') || functionName.includes('modify')) {
      return 'MODIFY_RESOURCE';
    }
    if (functionName.includes('delete') || functionName.includes('remove')) {
      return 'DELETE_RESOURCE';
    }

    return 'GENERAL_ACTION';
  }

  /**
   * Generate alternative suggestions
   */
  private generateAlternatives(request: ParlantValidationRequest): string[] {
    return [
      `Consider using a read-only version of ${request.functionName}`,
      `Add additional confirmation for ${request.actionDescription}`,
      `Use a lower-risk alternative approach`,
    ];
  }

  /**
   * Generate error reason
   */
  private generateErrorReason(): string {
    const reasons = [
      'Insufficient permissions for requested action',
      'Action conflicts with current security policy',
      'Request parameters contain potentially unsafe values',
      'Context indicates user intent mismatch',
      'Risk level exceeds allowed threshold',
    ];

    return reasons[Math.floor(Math.random() * reasons.length)];
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(request: ParlantValidationRequest): string {
    const keyData = {
      functionName: request.functionName,
      riskLevel: request.riskLevel,
      paramsHash: this.hashObject(request.functionParams),
    };

    return JSON.stringify(keyData);
  }

  /**
   * Hash object for cache key generation
   */
  private hashObject(obj: Record<string, unknown>): string {
    return JSON.stringify(obj, Object.keys(obj).sort());
  }

  /**
   * Simulate network latency
   */
  private async simulateDelay(extraMs: number = 0): Promise<void> {
    if (!this.config.simulateLatency) return;

    const [min, max] = this.config.latencyRange;
    const delay = this.randomInRange(min, max) + extraMs;

    return new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Generate random number in range
   */
  private randomInRange(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Get mock statistics
   */
  getStats() {
    return {
      requestCount: this.requestCount,
      cacheSize: this.responseCache.size,
      sessionCount: this.sessionStore.size,
      config: this.config,
    };
  }

  /**
   * Reset mock state
   */
  reset(): void {
    this.responseCache.clear();
    this.sessionStore.clear();
    this.requestCount = 0;
  }
}

// ===== WEBSOCKET MOCK =====

export class MockParlantWebSocket extends EventEmitter {
  public readyState: number = WebSocket.CONNECTING;
  private readonly config: MockConfig;
  private messageQueue: any[] = [];

  constructor(url: string, config: MockConfig = DEFAULT_MOCK_CONFIG) {
    super();
    this.config = config;

    // Simulate connection
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      this.emit('open');
    }, this.randomInRange(10, 50));
  }

  send(data: string): void {
    const message = JSON.parse(data);
    this.messageQueue.push(message);

    // Simulate response
    setTimeout(() => {
      this.emit('message', JSON.stringify({
        type: 'response',
        conversation_id: message.conversation_id,
        data: { status: 'received', timestamp: new Date().toISOString() }
      }));
    }, this.randomInRange(5, 25));
  }

  close(): void {
    this.readyState = WebSocket.CLOSED;
    this.emit('close');
  }

  private randomInRange(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}

// ===== MOCK PROVIDERS =====

export const createParlantMocks = (config: MockConfig = DEFAULT_MOCK_CONFIG) => {
  return {
    mockApiClient: new MockParlantApiClient(config),
    mockWebSocket: MockParlantWebSocket,
    mockConfig: config,
  };
};

// ===== TEST DATA GENERATORS =====

export const generateMockConversationContext = (overrides: Partial<ParlantConversationContext> = {}): ParlantConversationContext => {
  return {
    userId: `mock_user_${Math.random().toString(36).substring(7)}`,
    sessionId: `mock_session_${Date.now()}`,
    agentRole: 'AI_ASSISTANT',
    securityLevel: 'MEDIUM',
    conversationHistory: generateMockConversationHistory(),
    metadata: {
      source: 'unit_test',
      timestamp: new Date().toISOString(),
    },
    ...overrides,
  };
};

export const generateMockConversationHistory = (count: number = 3): ConversationEntry[] => {
  const entries: ConversationEntry[] = [];

  for (let i = 0; i < count; i++) {
    entries.push({
      timestamp: new Date(Date.now() - (count - i) * 60000),
      speaker: i % 2 === 0 ? 'USER' : 'ASSISTANT',
      message: `Mock conversation message ${i + 1}`,
      intent: i % 2 === 0 ? 'REQUEST_ACTION' : 'PROVIDE_RESPONSE',
      confidence: 0.8 + Math.random() * 0.2,
    });
  }

  return entries;
};

export const generateMockValidationRequest = (overrides: Partial<ParlantValidationRequest> = {}): ParlantValidationRequest => {
  return {
    functionName: 'mockFunction',
    functionParams: { param1: 'value1', param2: 42 },
    actionDescription: 'Mock function execution for testing',
    context: generateMockConversationContext(),
    riskLevel: RiskLevel.LOW,
    operationId: `mock_op_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    ...overrides,
  };
};

// ===== JEST MOCK FACTORIES =====

export const createJestMockParlantService = () => {
  const mockService = {
    validateFunction: jest.fn(),
    createSession: jest.fn(),
    validateBatch: jest.fn(),
    getValidationHistory: jest.fn(),
    clearCache: jest.fn(),
    getPerformanceMetrics: jest.fn(),
    onApplicationShutdown: jest.fn(),
  };

  // Configure default implementations
  mockService.validateFunction.mockImplementation(async (request: ParlantValidationRequest) => {
    return {
      approved: true,
      confidence: 0.9,
      reasoning: `Mock approval for ${request.functionName}`,
      intent: 'APPROVED_ACTION',
      suggestedAlternatives: [],
      validationTimestamp: new Date(),
      conversationId: request.context.sessionId || 'mock_conversation',
      executionContext: {
        riskLevel: request.riskLevel,
        validationTimeMs: 25,
        cacheHit: false,
      },
      cached: false,
    };
  });

  mockService.createSession.mockImplementation(async (userId: string) => {
    return { sessionId: `mock_session_${userId}_${Date.now()}` };
  });

  return mockService;
};

export default {
  MockParlantApiClient,
  MockParlantWebSocket,
  createParlantMocks,
  generateMockConversationContext,
  generateMockConversationHistory,
  generateMockValidationRequest,
  createJestMockParlantService,
  DEFAULT_MOCK_CONFIG,
};