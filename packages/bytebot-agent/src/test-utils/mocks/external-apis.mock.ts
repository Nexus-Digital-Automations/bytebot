/**
 * External APIs Mock - Comprehensive Mock Services for Third-Party Integrations
 *
 * Provides enterprise-grade mock implementations for external API services:
 * - Anthropic Claude API client mocks with realistic response simulation
 * - OpenAI API client mocks with GPT and reasoning model support
 * - Google Gemini API client mocks with thinking capabilities
 * - HTTP request/response mocks for network layer testing
 * - API rate limiting and error handling simulation
 * - Realistic latency and error condition simulation
 *
 * Features:
 * - Type-safe mock implementations matching actual service interfaces
 * - Configurable response scenarios (success, error, timeout, rate limit)
 * - Token usage tracking and realistic billing simulation
 * - Request/response logging and validation
 * - Performance testing with simulated network conditions
 * - Error injection for resilience testing
 *
 * @author Claude Code
 * @version 2.0.0
 * @since Bytebot Agent Testing Framework v2
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  MessageContentType,
  TextContentBlock,
  ToolUseContentBlock,
  ThinkingContentBlock,
  MessageContentBlock,
} from '@bytebot/shared';
import {
  BytebotAgentService,
  BytebotAgentResponse,
  BytebotAgentInterrupt,
} from '../../agent/agent.types';
import { Message } from '@prisma/client';

// =============================================================================
// MOCK RESPONSE TEMPLATES & CONFIGURATION
// =============================================================================

/**
 * Mock response configuration for different scenarios
 */
export interface MockApiConfig {
  enableLatencySimulation: boolean;
  latencyRange: [number, number]; // [min, max] in milliseconds
  errorRate: number; // 0-1, probability of errors
  rateLimitRate: number; // 0-1, probability of rate limits
  enableTokenUsageTracking: boolean;
  defaultTokenMultiplier: number; // Tokens per character approximation
  enableRequestLogging: boolean;
  enableResponseValidation: boolean;
}

/**
 * Default mock configuration optimized for testing
 */
export const DEFAULT_MOCK_CONFIG: MockApiConfig = {
  enableLatencySimulation: false,
  latencyRange: [100, 500],
  errorRate: 0,
  rateLimitRate: 0,
  enableTokenUsageTracking: true,
  defaultTokenMultiplier: 0.75,
  enableRequestLogging: true,
  enableResponseValidation: true,
};

/**
 * Mock response templates for different content types
 */
export const MOCK_RESPONSES = {
  TEXT_RESPONSES: [
    'I understand your request. Let me help you with that task.',
    "Based on the information provided, I'll analyze and provide a comprehensive solution.",
    "I'll process this request step by step to ensure accuracy.",
    'Let me break this down and provide you with detailed assistance.',
    "I'll help you implement this feature with best practices in mind.",
  ],

  TOOL_USE_RESPONSES: [
    {
      name: 'bash',
      input: { command: 'echo "Mock command execution"' },
    },
    {
      name: 'read_file',
      input: { file_path: '/mock/path/file.ts' },
    },
    {
      name: 'write_file',
      input: { file_path: '/mock/path/output.ts', content: 'mock content' },
    },
  ],

  THINKING_RESPONSES: [
    'Let me think through this problem systematically...',
    'I need to consider the various approaches and their trade-offs...',
    'The key considerations here are performance, maintainability, and security...',
    'I should analyze the requirements and constraints before proceeding...',
  ],

  ERROR_RESPONSES: {
    RATE_LIMIT: 'Rate limit exceeded. Please retry after a brief delay.',
    INVALID_API_KEY: 'Invalid API key provided. Please check your credentials.',
    MODEL_OVERLOADED:
      'Model is currently overloaded. Please retry in a few moments.',
    CONTENT_FILTERED: 'Content was filtered due to policy violations.',
    CONTEXT_LENGTH_EXCEEDED:
      'Context length exceeded the maximum allowed tokens.',
    NETWORK_ERROR: 'Network error occurred while processing the request.',
  },
};

// =============================================================================
// HTTP CLIENT MOCKS
// =============================================================================

/**
 * HTTP request configuration interface
 */
export interface MockHttpConfig {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  timeout?: number;
  signal?: AbortSignal;
  [key: string]: unknown;
}

/**
 * Mock HTTP response for API calls
 */
export interface MockHttpResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  config: MockHttpConfig;
}

/**
 * Mock HTTP request interface
 */
export interface MockHttpRequest {
  url: string;
  method: string;
  headers?: Record<string, string>;
  data?: unknown;
  [key: string]: unknown;
}

/**
 * Mock HTTP error for error simulation
 */
export class MockHttpError extends Error {
  constructor(
    message: string,
    public response?: MockHttpResponse<unknown>,
    public request?: MockHttpRequest,
    public code?: string,
  ) {
    super(message);
    this.name = 'MockHttpError';
  }
}

/**
 * Mock HTTP client for simulating network requests
 */
export class MockHttpClient {
  private static instance: MockHttpClient;
  private readonly logger = new Logger('MockHttpClient');
  private requestLog: Array<{
    url: string;
    method: string;
    data?: unknown;
    timestamp: Date;
  }> = [];

  static getInstance(): MockHttpClient {
    if (!MockHttpClient.instance) {
      MockHttpClient.instance = new MockHttpClient();
    }
    return MockHttpClient.instance;
  }

  /**
   * Mock HTTP GET request
   */
  async get<T = unknown>(
    url: string,
    config?: MockHttpConfig,
  ): Promise<MockHttpResponse<T>> {
    return this.simulateRequest<T>('GET', url, undefined, config);
  }

  /**
   * Mock HTTP POST request
   */
  async post<T = unknown>(
    url: string,
    data?: unknown,
    config?: MockHttpConfig,
  ): Promise<MockHttpResponse<T>> {
    return this.simulateRequest<T>('POST', url, data, config);
  }

  /**
   * Mock HTTP PUT request
   */
  async put<T = unknown>(
    url: string,
    data?: unknown,
    config?: MockHttpConfig,
  ): Promise<MockHttpResponse<T>> {
    return this.simulateRequest<T>('PUT', url, data, config);
  }

  /**
   * Mock HTTP DELETE request
   */
  async delete<T = unknown>(
    url: string,
    config?: MockHttpConfig,
  ): Promise<MockHttpResponse<T>> {
    return this.simulateRequest<T>('DELETE', url, undefined, config);
  }

  /**
   * Type guard to check if data is a record
   */
  private isRecord(data: unknown): data is Record<string, unknown> {
    return data !== null && typeof data === 'object' && !Array.isArray(data);
  }

  /**
   * Simulate HTTP request with configurable behavior
   */
  private async simulateRequest<T = unknown>(
    method: string,
    url: string,
    data?: unknown,
    config?: MockHttpConfig,
  ): Promise<MockHttpResponse<T>> {
    // Validate and sanitize config
    const sanitizedConfig: MockHttpConfig = config ?? {};

    // Log request
    this.requestLog.push({
      url,
      method,
      data,
      timestamp: new Date(),
    });

    // Simulate latency if configured
    if (DEFAULT_MOCK_CONFIG.enableLatencySimulation) {
      const [min, max] = DEFAULT_MOCK_CONFIG.latencyRange;
      const delay = Math.random() * (max - min) + min;
      await new Promise<void>((resolve) => setTimeout(resolve, delay));
    }

    // Simulate errors if configured
    if (Math.random() < DEFAULT_MOCK_CONFIG.errorRate) {
      throw new MockHttpError(MOCK_RESPONSES.ERROR_RESPONSES.NETWORK_ERROR, {
        data: null,
        status: 500,
        statusText: 'Internal Server Error',
        headers: {},
        config: sanitizedConfig,
      });
    }

    // Simulate rate limiting if configured
    if (Math.random() < DEFAULT_MOCK_CONFIG.rateLimitRate) {
      throw new MockHttpError(MOCK_RESPONSES.ERROR_RESPONSES.RATE_LIMIT, {
        data: { error: { message: MOCK_RESPONSES.ERROR_RESPONSES.RATE_LIMIT } },
        status: 429,
        statusText: 'Too Many Requests',
        headers: { 'retry-after': '60' },
        config: sanitizedConfig,
      });
    }

    // Return successful mock response
    return {
      data: this.generateMockResponseData<T>(
        url,
        method,
        this.isRecord(data) ? data : undefined,
      ),
      status: 200,
      statusText: 'OK',
      headers: {
        'content-type': 'application/json',
        'x-ratelimit-remaining': '999',
        'x-request-id': `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      },
      config: sanitizedConfig,
    };
  }

  /**
   * Generate mock response data based on URL pattern
   */
  private generateMockResponseData<T>(
    url: string,
    method: string,
    requestData?: Record<string, unknown>,
  ): T {
    if (url.includes('anthropic.com')) {
      return this.generateAnthropicResponse(requestData) as T;
    }
    if (url.includes('openai.com')) {
      return this.generateOpenAIResponse(requestData) as T;
    }
    if (url.includes('googleapis.com') || url.includes('generativelanguage')) {
      return this.generateGoogleResponse(requestData) as T;
    }

    // Default mock response
    return {
      message: 'Mock response generated successfully',
      timestamp: new Date().toISOString(),
      requestMethod: method,
      requestUrl: url,
    } as T;
  }

  /**
   * Generate Anthropic-style API response
   */
  private generateAnthropicResponse(
    requestData?: Record<string, unknown>,
  ): Record<string, unknown> {
    const textResponse =
      MOCK_RESPONSES.TEXT_RESPONSES[
        Math.floor(Math.random() * MOCK_RESPONSES.TEXT_RESPONSES.length)
      ];

    return {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'message',
      role: 'assistant',
      content: [
        {
          type: 'text',
          text: textResponse,
        },
      ],
      model: 'claude-3-5-sonnet-20241022',
      stop_reason: 'end_turn',
      stop_sequence: null,
      usage: {
        input_tokens: this.estimateTokens(
          JSON.stringify(
            (requestData as { messages?: unknown })?.messages ?? '',
          ),
        ),
        output_tokens: this.estimateTokens(textResponse),
      },
    };
  }

  /**
   * Generate OpenAI-style API response
   */
  private generateOpenAIResponse(
    requestData?: Record<string, unknown>,
  ): Record<string, unknown> {
    const textResponse =
      MOCK_RESPONSES.TEXT_RESPONSES[
        Math.floor(Math.random() * MOCK_RESPONSES.TEXT_RESPONSES.length)
      ];

    return {
      id: `response_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      object: 'response',
      created: Math.floor(Date.now() / 1000),
      model: 'gpt-4o',
      output: [
        {
          type: 'message',
          role: 'assistant',
          content: [
            {
              type: 'output_text',
              text: textResponse,
            },
          ],
        },
      ],
      usage: {
        input_tokens: this.estimateTokens(
          JSON.stringify((requestData as { input?: unknown })?.input ?? ''),
        ),
        output_tokens: this.estimateTokens(textResponse),
        total_tokens: this.estimateTokens(
          JSON.stringify((requestData as { input?: unknown })?.input ?? '') +
            textResponse,
        ),
      },
    };
  }

  /**
   * Generate Google Gemini-style API response
   */
  private generateGoogleResponse(
    requestData?: Record<string, unknown>,
  ): Record<string, unknown> {
    const textResponse =
      MOCK_RESPONSES.TEXT_RESPONSES[
        Math.floor(Math.random() * MOCK_RESPONSES.TEXT_RESPONSES.length)
      ];

    return {
      candidates: [
        {
          content: {
            parts: [
              {
                text: textResponse,
              },
            ],
            role: 'model',
          },
          finishReason: 'STOP',
          index: 0,
          safetyRatings: [
            {
              category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
              probability: 'NEGLIGIBLE',
            },
            {
              category: 'HARM_CATEGORY_HATE_SPEECH',
              probability: 'NEGLIGIBLE',
            },
          ],
        },
      ],
      usageMetadata: {
        promptTokenCount: this.estimateTokens(
          JSON.stringify(
            (requestData as { contents?: unknown })?.contents ?? '',
          ),
        ),
        candidatesTokenCount: this.estimateTokens(textResponse),
        totalTokenCount: this.estimateTokens(
          JSON.stringify(
            (requestData as { contents?: unknown })?.contents ?? '',
          ) + textResponse,
        ),
      },
    };
  }

  /**
   * Estimate token count from text (rough approximation for testing)
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length * DEFAULT_MOCK_CONFIG.defaultTokenMultiplier);
  }

  /**
   * Get request log for debugging and testing
   */
  getRequestLog(): Array<{
    url: string;
    method: string;
    data?: unknown;
    timestamp: Date;
  }> {
    return [...this.requestLog];
  }

  /**
   * Clear request log
   */
  clearRequestLog(): void {
    this.requestLog = [];
  }
}

// =============================================================================
// ANTHROPIC API MOCKS
// =============================================================================

/**
 * Mock Anthropic API client
 */
@Injectable()
export class MockAnthropicService implements BytebotAgentService {
  private readonly logger = new Logger('MockAnthropicService');
  private readonly httpClient = MockHttpClient.getInstance();

  async generateMessage(
    systemPrompt: string,
    messages: Message[],
    model: string = 'claude-3-5-sonnet-20241022',
    useTools: boolean = true,
    signal?: AbortSignal,
  ): Promise<BytebotAgentResponse> {
    this.logger.debug('Generating mock Anthropic response', {
      model,
      messageCount: messages.length,
      useTools,
      systemPromptLength: systemPrompt.length,
    });

    // Handle abort signal
    if (signal?.aborted) {
      throw new BytebotAgentInterrupt();
    }

    // Simulate API call delay if enabled
    if (DEFAULT_MOCK_CONFIG.enableLatencySimulation) {
      const [min, max] = DEFAULT_MOCK_CONFIG.latencyRange;
      const delay = Math.random() * (max - min) + min;
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(resolve, delay);
        signal?.addEventListener('abort', () => {
          clearTimeout(timeout);
          reject(new BytebotAgentInterrupt());
        });
      });
    }

    // Generate mock content blocks
    const contentBlocks: MessageContentBlock[] = [];

    // Add text response
    const textResponse =
      MOCK_RESPONSES.TEXT_RESPONSES[
        Math.floor(Math.random() * MOCK_RESPONSES.TEXT_RESPONSES.length)
      ];
    contentBlocks.push({
      type: MessageContentType.Text,
      text: textResponse,
    } as TextContentBlock);

    // Add tool use if enabled and randomly selected
    if (useTools && Math.random() > 0.5) {
      const toolResponse =
        MOCK_RESPONSES.TOOL_USE_RESPONSES[
          Math.floor(Math.random() * MOCK_RESPONSES.TOOL_USE_RESPONSES.length)
        ];
      contentBlocks.push({
        type: MessageContentType.ToolUse,
        id: `tool_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: toolResponse.name,
        input: toolResponse.input,
      } as ToolUseContentBlock);
    }

    // Add thinking content occasionally
    if (Math.random() > 0.7) {
      const thinkingResponse =
        MOCK_RESPONSES.THINKING_RESPONSES[
          Math.floor(Math.random() * MOCK_RESPONSES.THINKING_RESPONSES.length)
        ];
      contentBlocks.push({
        type: MessageContentType.Thinking,
        thinking: thinkingResponse,
        signature: `thinking_${Date.now()}`,
      } as ThinkingContentBlock);
    }

    // Calculate token usage
    const inputText = systemPrompt + JSON.stringify(messages);
    const outputText = contentBlocks
      .map((block) =>
        block.type === MessageContentType.Text
          ? block.text
          : block.type === MessageContentType.Thinking
            ? block.thinking
            : JSON.stringify(block),
      )
      .join(' ');

    const inputTokens = this.estimateTokens(inputText);
    const outputTokens = this.estimateTokens(outputText);

    return {
      contentBlocks,
      tokenUsage: {
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
      },
    };
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length * DEFAULT_MOCK_CONFIG.defaultTokenMultiplier);
  }
}

// =============================================================================
// OPENAI API MOCKS
// =============================================================================

/**
 * Mock OpenAI API client
 */
@Injectable()
export class MockOpenAIService implements BytebotAgentService {
  private readonly logger = new Logger('MockOpenAIService');
  private readonly httpClient = MockHttpClient.getInstance();

  async generateMessage(
    systemPrompt: string,
    messages: Message[],
    model: string = 'gpt-4o',
    useTools: boolean = true,
    signal?: AbortSignal,
  ): Promise<BytebotAgentResponse> {
    this.logger.debug('Generating mock OpenAI response', {
      model,
      messageCount: messages.length,
      useTools,
      systemPromptLength: systemPrompt.length,
      isReasoningModel: model.startsWith('o1'),
    });

    // Handle abort signal
    if (signal?.aborted) {
      throw new BytebotAgentInterrupt();
    }

    // Simulate API call delay if enabled
    if (DEFAULT_MOCK_CONFIG.enableLatencySimulation) {
      const [min, max] = DEFAULT_MOCK_CONFIG.latencyRange;
      const delay = Math.random() * (max - min) + min;
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(resolve, delay);
        signal?.addEventListener('abort', () => {
          clearTimeout(timeout);
          reject(new BytebotAgentInterrupt());
        });
      });
    }

    // Generate mock content blocks
    const contentBlocks: MessageContentBlock[] = [];

    // Add reasoning content for o1 models
    if (model.startsWith('o1')) {
      const thinkingResponse =
        MOCK_RESPONSES.THINKING_RESPONSES[
          Math.floor(Math.random() * MOCK_RESPONSES.THINKING_RESPONSES.length)
        ];
      contentBlocks.push({
        type: MessageContentType.Thinking,
        thinking: thinkingResponse,
        signature: `reasoning_${Date.now()}`,
      } as ThinkingContentBlock);
    }

    // Add text response
    const textResponse =
      MOCK_RESPONSES.TEXT_RESPONSES[
        Math.floor(Math.random() * MOCK_RESPONSES.TEXT_RESPONSES.length)
      ];
    contentBlocks.push({
      type: MessageContentType.Text,
      text: textResponse,
    } as TextContentBlock);

    // Add tool use if enabled and randomly selected
    if (useTools && Math.random() > 0.5) {
      const toolResponse =
        MOCK_RESPONSES.TOOL_USE_RESPONSES[
          Math.floor(Math.random() * MOCK_RESPONSES.TOOL_USE_RESPONSES.length)
        ];
      contentBlocks.push({
        type: MessageContentType.ToolUse,
        id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: toolResponse.name,
        input: toolResponse.input,
      } as ToolUseContentBlock);
    }

    // Calculate token usage
    const inputText = systemPrompt + JSON.stringify(messages);
    const outputText = contentBlocks
      .map((block) =>
        block.type === MessageContentType.Text
          ? block.text
          : block.type === MessageContentType.Thinking
            ? block.thinking
            : JSON.stringify(block),
      )
      .join(' ');

    const inputTokens = this.estimateTokens(inputText);
    const outputTokens = this.estimateTokens(outputText);

    return {
      contentBlocks,
      tokenUsage: {
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
      },
    };
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length * DEFAULT_MOCK_CONFIG.defaultTokenMultiplier);
  }
}

// =============================================================================
// GOOGLE GEMINI API MOCKS
// =============================================================================

/**
 * Mock Google Gemini API client
 */
@Injectable()
export class MockGoogleService implements BytebotAgentService {
  private readonly logger = new Logger('MockGoogleService');
  private readonly httpClient = MockHttpClient.getInstance();

  async generateMessage(
    systemPrompt: string,
    messages: Message[],
    model: string = 'gemini-2.0-flash-thinking-exp-1219',
    useTools: boolean = true,
    signal?: AbortSignal,
  ): Promise<BytebotAgentResponse> {
    this.logger.debug('Generating mock Google Gemini response', {
      model,
      messageCount: messages.length,
      useTools,
      systemPromptLength: systemPrompt.length,
      isThinkingModel: model.includes('thinking'),
    });

    // Handle abort signal
    if (signal?.aborted) {
      throw new BytebotAgentInterrupt();
    }

    // Simulate API call delay if enabled
    if (DEFAULT_MOCK_CONFIG.enableLatencySimulation) {
      const [min, max] = DEFAULT_MOCK_CONFIG.latencyRange;
      const delay = Math.random() * (max - min) + min;
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(resolve, delay);
        signal?.addEventListener('abort', () => {
          clearTimeout(timeout);
          reject(new BytebotAgentInterrupt());
        });
      });
    }

    // Generate mock content blocks
    const contentBlocks: MessageContentBlock[] = [];

    // Add thinking content for thinking models
    if (model.includes('thinking')) {
      const thinkingResponse =
        MOCK_RESPONSES.THINKING_RESPONSES[
          Math.floor(Math.random() * MOCK_RESPONSES.THINKING_RESPONSES.length)
        ];
      contentBlocks.push({
        type: MessageContentType.Thinking,
        thinking: thinkingResponse,
        signature: `gemini_thinking_${Date.now()}`,
      } as ThinkingContentBlock);
    }

    // Add text response
    const textResponse =
      MOCK_RESPONSES.TEXT_RESPONSES[
        Math.floor(Math.random() * MOCK_RESPONSES.TEXT_RESPONSES.length)
      ];
    contentBlocks.push({
      type: MessageContentType.Text,
      text: textResponse,
    } as TextContentBlock);

    // Add tool use if enabled and randomly selected
    if (useTools && Math.random() > 0.5) {
      const toolResponse =
        MOCK_RESPONSES.TOOL_USE_RESPONSES[
          Math.floor(Math.random() * MOCK_RESPONSES.TOOL_USE_RESPONSES.length)
        ];
      contentBlocks.push({
        type: MessageContentType.ToolUse,
        id: `gemini_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: toolResponse.name,
        input: toolResponse.input,
      } as ToolUseContentBlock);
    }

    // Calculate token usage
    const inputText = systemPrompt + JSON.stringify(messages);
    const outputText = contentBlocks
      .map((block) =>
        block.type === MessageContentType.Text
          ? block.text
          : block.type === MessageContentType.Thinking
            ? block.thinking
            : JSON.stringify(block),
      )
      .join(' ');

    const inputTokens = this.estimateTokens(inputText);
    const outputTokens = this.estimateTokens(outputText);

    return {
      contentBlocks,
      tokenUsage: {
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
      },
    };
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length * DEFAULT_MOCK_CONFIG.defaultTokenMultiplier);
  }
}

// =============================================================================
// API ERROR SIMULATION UTILITIES
// =============================================================================

/**
 * Utility class for simulating various API error conditions
 */
export class MockApiErrorSimulator {
  /**
   * Simulate rate limit error
   */
  static createRateLimitError(): Error {
    const error = new Error(MOCK_RESPONSES.ERROR_RESPONSES.RATE_LIMIT);
    error.name = 'RateLimitError';
    return error;
  }

  /**
   * Simulate authentication error
   */
  static createAuthError(): Error {
    const error = new Error(MOCK_RESPONSES.ERROR_RESPONSES.INVALID_API_KEY);
    error.name = 'AuthenticationError';
    return error;
  }

  /**
   * Simulate model overload error
   */
  static createOverloadError(): Error {
    const error = new Error(MOCK_RESPONSES.ERROR_RESPONSES.MODEL_OVERLOADED);
    error.name = 'OverloadError';
    return error;
  }

  /**
   * Simulate content policy violation error
   */
  static createContentFilterError(): Error {
    const error = new Error(MOCK_RESPONSES.ERROR_RESPONSES.CONTENT_FILTERED);
    error.name = 'ContentFilterError';
    return error;
  }

  /**
   * Simulate context length exceeded error
   */
  static createContextLengthError(): Error {
    const error = new Error(
      MOCK_RESPONSES.ERROR_RESPONSES.CONTEXT_LENGTH_EXCEEDED,
    );
    error.name = 'ContextLengthError';
    return error;
  }

  /**
   * Simulate network connectivity error
   */
  static createNetworkError(): Error {
    const error = new Error(MOCK_RESPONSES.ERROR_RESPONSES.NETWORK_ERROR);
    error.name = 'NetworkError';
    return error;
  }

  /**
   * Simulate abort/cancellation error
   */
  static createAbortError(): BytebotAgentInterrupt {
    return new BytebotAgentInterrupt();
  }
}

// =============================================================================
// MOCK FACTORY AND TESTING UTILITIES
// =============================================================================

/**
 * Factory for creating configured mock API services
 */
export class MockApiServiceFactory {
  /**
   * Create mock Anthropic service with custom configuration
   */
  static createAnthropicService(
    config?: Partial<MockApiConfig>,
  ): MockAnthropicService {
    if (config) {
      Object.assign(DEFAULT_MOCK_CONFIG, config);
    }
    return new MockAnthropicService();
  }

  /**
   * Create mock OpenAI service with custom configuration
   */
  static createOpenAIService(
    config?: Partial<MockApiConfig>,
  ): MockOpenAIService {
    if (config) {
      Object.assign(DEFAULT_MOCK_CONFIG, config);
    }
    return new MockOpenAIService();
  }

  /**
   * Create mock Google service with custom configuration
   */
  static createGoogleService(
    config?: Partial<MockApiConfig>,
  ): MockGoogleService {
    if (config) {
      Object.assign(DEFAULT_MOCK_CONFIG, config);
    }
    return new MockGoogleService();
  }

  /**
   * Reset all mock configurations to defaults
   */
  static resetConfiguration(): void {
    Object.assign(DEFAULT_MOCK_CONFIG, {
      enableLatencySimulation: false,
      latencyRange: [100, 500],
      errorRate: 0,
      rateLimitRate: 0,
      enableTokenUsageTracking: true,
      defaultTokenMultiplier: 0.75,
      enableRequestLogging: true,
      enableResponseValidation: true,
    });
  }
}

// =============================================================================
// JEST MOCK HELPERS
// =============================================================================

/**
 * Jest mock helpers for external API services
 */
export const mockExternalApis = {
  /**
   * Mock all Anthropic SDK methods
   */
  mockAnthropic: () => {
    const mockService = new MockAnthropicService();

    return {
      AnthropicService: jest.fn(() => mockService),
      mockGenerateMessage: jest.spyOn(mockService, 'generateMessage'),
    };
  },

  /**
   * Mock all OpenAI SDK methods
   */
  mockOpenAI: () => {
    const mockService = new MockOpenAIService();

    return {
      OpenAIService: jest.fn(() => mockService),
      mockGenerateMessage: jest.spyOn(mockService, 'generateMessage'),
    };
  },

  /**
   * Mock all Google Gemini SDK methods
   */
  mockGoogle: () => {
    const mockService = new MockGoogleService();

    return {
      GoogleService: jest.fn(() => mockService),
      mockGenerateMessage: jest.spyOn(mockService, 'generateMessage'),
    };
  },

  /**
   * Mock HTTP client for network-level testing
   */
  mockHttpClient: () => {
    const mockClient = MockHttpClient.getInstance();

    return {
      MockHttpClient: jest.fn(() => mockClient),
      mockGet: jest.spyOn(mockClient, 'get'),
      mockPost: jest.spyOn(mockClient, 'post'),
      mockPut: jest.spyOn(mockClient, 'put'),
      mockDelete: jest.spyOn(mockClient, 'delete'),
    };
  },

  /**
   * Configure mock behavior for testing scenarios
   */
  configure: (config: Partial<MockApiConfig>) => {
    Object.assign(DEFAULT_MOCK_CONFIG, config);
  },

  /**
   * Reset all mocks to default behavior
   */
  reset: () => {
    MockApiServiceFactory.resetConfiguration();
    MockHttpClient.getInstance().clearRequestLog();
    jest.clearAllMocks();
  },
};

// All classes and interfaces are exported inline above
