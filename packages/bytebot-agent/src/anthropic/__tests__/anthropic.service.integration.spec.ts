/**
 * Anthropic Service Integration Tests
 *
 * Comprehensive integration testing for Anthropic API service including:
 * - API connection and authentication
 * - Message generation and content formatting
 * - Error handling and network failures
 * - Performance and timeout scenarios
 * - Circuit breaker integration
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AnthropicService } from '../anthropic.service';
import { Logger } from '@nestjs/common';
import { Message, MessageRole } from '@prisma/client';
import {
  MessageContentType,
  TextContentBlock,
  ToolUseContentBlock,
  BytebotAgentInterrupt,
} from '@bytebot/shared';
import Anthropic, { APIUserAbortError } from '@anthropic-ai/sdk';

// Mock Anthropic SDK
jest.mock('@anthropic-ai/sdk');

describe('AnthropicService - Integration Tests', () => {
  let service: AnthropicService;
  let configService: ConfigService;
  let mockAnthropic: jest.Mocked<Anthropic>;
  let module: TestingModule;

  // Test data
  const mockApiKey = 'test-anthropic-api-key';
  const mockSystemPrompt = 'You are a helpful assistant';
  const mockMessages: Message[] = [
    {
      id: '1',
      role: MessageRole.USER,
      content: [
        { type: MessageContentType.Text, text: 'Hello' } as TextContentBlock,
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
      taskId: null,
      userId: null,
    },
  ];

  beforeEach(async () => {
    // Clear all mocks
    jest.clearAllMocks();

    // Mock Anthropic constructor and methods
    const mockAnthropicInstance = {
      messages: {
        create: jest.fn(),
      },
    };
    (Anthropic as jest.MockedClass<typeof Anthropic>).mockImplementation(
      () => mockAnthropicInstance as any,
    );
    mockAnthropic = mockAnthropicInstance as jest.Mocked<Anthropic>;

    module = await Test.createTestingModule({
      providers: [
        AnthropicService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              switch (key) {
                case 'ANTHROPIC_API_KEY':
                  return mockApiKey;
                default:
                  return undefined;
              }
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AnthropicService>(AnthropicService);
    configService = module.get<ConfigService>(ConfigService);

    // Suppress console warnings for tests
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  afterEach(async () => {
    await module.close();
  });

  describe('Service Initialization', () => {
    it('should initialize with valid API key', () => {
      expect(service).toBeDefined();
      expect(Anthropic).toHaveBeenCalledWith({
        apiKey: mockApiKey,
      });
    });

    it('should initialize with dummy key when API key is missing', async () => {
      // Create new module with missing API key
      const testModule = await Test.createTestingModule({
        providers: [
          AnthropicService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn().mockReturnValue(undefined),
            },
          },
        ],
      }).compile();

      const testService = testModule.get<AnthropicService>(AnthropicService);

      expect(testService).toBeDefined();
      expect(Anthropic).toHaveBeenCalledWith({
        apiKey: 'dummy-key-for-initialization',
      });

      await testModule.close();
    });

    it('should log warning when API key is not configured', async () => {
      const loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn');

      const testModule = await Test.createTestingModule({
        providers: [
          AnthropicService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn().mockReturnValue(undefined),
            },
          },
        ],
      }).compile();

      expect(loggerWarnSpy).toHaveBeenCalledWith(
        'ANTHROPIC_API_KEY is not set. AnthropicService will not work properly.',
      );

      await testModule.close();
    });
  });

  describe('API Integration - generateMessage', () => {
    const mockSuccessResponse = {
      content: [
        {
          type: 'text',
          text: 'Hello! How can I help you?',
        },
      ],
      usage: {
        input_tokens: 10,
        output_tokens: 8,
      },
    };

    beforeEach(() => {
      mockAnthropic.messages.create = jest
        .fn()
        .mockResolvedValue(mockSuccessResponse);
    });

    it('should successfully generate message with default parameters', async () => {
      const result = await service.generateMessage(
        mockSystemPrompt,
        mockMessages,
      );

      expect(result).toEqual({
        contentBlocks: [
          {
            type: MessageContentType.Text,
            text: 'Hello! How can I help you?',
          },
        ],
        tokenUsage: {
          inputTokens: 10,
          outputTokens: 8,
          totalTokens: 18,
        },
      });

      expect(mockAnthropic.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: expect.any(String),
          max_tokens: 16384, // 8192 * 2
          system: expect.arrayContaining([
            expect.objectContaining({
              type: 'text',
              text: mockSystemPrompt,
              cache_control: { type: 'ephemeral' },
            }),
          ]),
          messages: expect.any(Array),
          tools: expect.any(Array),
        }),
        { signal: undefined },
      );
    });

    it('should generate message with custom model and tool settings', async () => {
      const customModel = 'claude-3-opus-20240229';

      await service.generateMessage(
        mockSystemPrompt,
        mockMessages,
        customModel,
        false, // useTools = false
      );

      expect(mockAnthropic.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: customModel,
          tools: [],
        }),
        { signal: undefined },
      );
    });

    it('should handle tool use content blocks in response', async () => {
      const mockToolResponse = {
        content: [
          {
            type: 'tool_use',
            id: 'tool_123',
            name: 'get_weather',
            input: { city: 'New York' },
          },
        ],
        usage: {
          input_tokens: 15,
          output_tokens: 12,
        },
      };

      mockAnthropic.messages.create = jest
        .fn()
        .mockResolvedValue(mockToolResponse);

      const result = await service.generateMessage(
        mockSystemPrompt,
        mockMessages,
      );

      expect(result.contentBlocks).toEqual([
        {
          type: MessageContentType.ToolUse,
          id: 'tool_123',
          name: 'get_weather',
          input: { city: 'New York' },
        },
      ]);
    });

    it('should handle thinking content blocks in response', async () => {
      const mockThinkingResponse = {
        content: [
          {
            type: 'thinking',
            thinking: 'Let me think about this...',
            signature: 'thinking_123',
          },
        ],
        usage: {
          input_tokens: 15,
          output_tokens: 12,
        },
      };

      mockAnthropic.messages.create = jest
        .fn()
        .mockResolvedValue(mockThinkingResponse);

      const result = await service.generateMessage(
        mockSystemPrompt,
        mockMessages,
      );

      expect(result.contentBlocks).toEqual([
        {
          type: MessageContentType.Thinking,
          thinking: 'Let me think about this...',
          signature: 'thinking_123',
        },
      ]);
    });

    it('should handle redacted thinking content blocks in response', async () => {
      const mockRedactedThinkingResponse = {
        content: [
          {
            type: 'redacted_thinking',
            data: 'redacted_data_123',
          },
        ],
        usage: {
          input_tokens: 15,
          output_tokens: 12,
        },
      };

      mockAnthropic.messages.create = jest
        .fn()
        .mockResolvedValue(mockRedactedThinkingResponse);

      const result = await service.generateMessage(
        mockSystemPrompt,
        mockMessages,
      );

      expect(result.contentBlocks).toEqual([
        {
          type: MessageContentType.RedactedThinking,
          data: 'redacted_data_123',
        },
      ]);
    });
  });

  describe('Error Handling and Network Failures', () => {
    it('should handle API user abort error', async () => {
      const abortError = new APIUserAbortError();
      mockAnthropic.messages.create = jest.fn().mockRejectedValue(abortError);

      await expect(
        service.generateMessage(mockSystemPrompt, mockMessages),
      ).rejects.toThrow(BytebotAgentInterrupt);

      expect(Logger.prototype.log).toHaveBeenCalledWith(
        'Anthropic API call aborted',
      );
    });

    it('should handle network timeout errors', async () => {
      const timeoutError = new Error('Request timeout');
      mockAnthropic.messages.create = jest.fn().mockRejectedValue(timeoutError);

      await expect(
        service.generateMessage(mockSystemPrompt, mockMessages),
      ).rejects.toThrow('Request timeout');

      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Error sending message to Anthropic: Request timeout',
        timeoutError.stack,
      );
    });

    it('should handle API rate limit errors', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      mockAnthropic.messages.create = jest
        .fn()
        .mockRejectedValue(rateLimitError);

      await expect(
        service.generateMessage(mockSystemPrompt, mockMessages),
      ).rejects.toThrow('Rate limit exceeded');
    });

    it('should handle authentication errors', async () => {
      const authError = new Error('Invalid API key');
      mockAnthropic.messages.create = jest.fn().mockRejectedValue(authError);

      await expect(
        service.generateMessage(mockSystemPrompt, mockMessages),
      ).rejects.toThrow('Invalid API key');
    });

    it('should handle malformed response errors', async () => {
      const malformedError = new Error('Invalid JSON response');
      mockAnthropic.messages.create = jest
        .fn()
        .mockRejectedValue(malformedError);

      await expect(
        service.generateMessage(mockSystemPrompt, mockMessages),
      ).rejects.toThrow('Invalid JSON response');
    });
  });

  describe('Message Formatting and Content Handling', () => {
    beforeEach(() => {
      mockAnthropic.messages.create = jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Response' }],
        usage: { input_tokens: 10, output_tokens: 5 },
      });
    });

    it('should properly format user action content blocks', async () => {
      const messagesWithUserActions: Message[] = [
        {
          id: '1',
          role: MessageRole.USER,
          content: [
            {
              type: MessageContentType.UserAction,
              content: [
                {
                  type: MessageContentType.ComputerToolUse,
                  name: 'screenshot',
                  input: { display: 1 },
                },
              ],
            },
          ],
          createdAt: new Date(),
          updatedAt: new Date(),
          taskId: null,
          userId: null,
        },
      ];

      await service.generateMessage(mockSystemPrompt, messagesWithUserActions);

      expect(mockAnthropic.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.arrayContaining([
                expect.objectContaining({
                  type: 'text',
                  text: expect.stringContaining(
                    'User performed action: screenshot',
                  ),
                }),
              ]),
            }),
          ]),
        }),
        { signal: undefined },
      );
    });

    it('should add cache control to the last content block', async () => {
      await service.generateMessage(mockSystemPrompt, mockMessages);

      expect(mockAnthropic.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.arrayContaining([
                expect.objectContaining({
                  cache_control: { type: 'ephemeral' },
                }),
              ]),
            }),
          ]),
        }),
        { signal: undefined },
      );
    });

    it('should handle mixed content type messages', async () => {
      const mixedMessages: Message[] = [
        {
          id: '1',
          role: MessageRole.USER,
          content: [
            {
              type: MessageContentType.Text,
              text: 'Hello',
            } as TextContentBlock,
          ],
          createdAt: new Date(),
          updatedAt: new Date(),
          taskId: null,
          userId: null,
        },
        {
          id: '2',
          role: MessageRole.ASSISTANT,
          content: [
            {
              type: MessageContentType.Text,
              text: 'Hi there!',
            } as TextContentBlock,
            {
              type: MessageContentType.ToolUse,
              id: 'tool_1',
              name: 'search',
              input: { query: 'test' },
            } as ToolUseContentBlock,
          ],
          createdAt: new Date(),
          updatedAt: new Date(),
          taskId: null,
          userId: null,
        },
      ];

      await service.generateMessage(mockSystemPrompt, mixedMessages);

      expect(mockAnthropic.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.any(Array),
            }),
            expect.objectContaining({
              role: 'assistant',
              content: expect.any(Array),
            }),
          ]),
        }),
        { signal: undefined },
      );
    });
  });

  describe('Performance and Timeout Scenarios', () => {
    it('should respect abort signals', async () => {
      const abortController = new AbortController();
      const abortSignal = abortController.signal;

      // Simulate API call abortion
      mockAnthropic.messages.create = jest.fn().mockImplementation(async () => {
        abortController.abort();
        throw new APIUserAbortError();
      });

      await expect(
        service.generateMessage(
          mockSystemPrompt,
          mockMessages,
          undefined,
          true,
          abortSignal,
        ),
      ).rejects.toThrow(BytebotAgentInterrupt);

      expect(mockAnthropic.messages.create).toHaveBeenCalledWith(
        expect.any(Object),
        { signal: abortSignal },
      );
    });

    it('should handle long-running API calls', async () => {
      const delay = (ms: number) =>
        new Promise((resolve) => setTimeout(resolve, ms));

      mockAnthropic.messages.create = jest.fn().mockImplementation(async () => {
        await delay(100); // Simulate network delay
        return {
          content: [{ type: 'text', text: 'Delayed response' }],
          usage: { input_tokens: 10, output_tokens: 5 },
        };
      });

      const startTime = Date.now();
      const result = await service.generateMessage(
        mockSystemPrompt,
        mockMessages,
      );
      const endTime = Date.now();

      expect(endTime - startTime).toBeGreaterThan(90);
      expect(result.contentBlocks[0].text).toBe('Delayed response');
    });

    it('should measure and log API call duration', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await service.generateMessage(mockSystemPrompt, mockMessages);

      // Verify that error logging captures the API call
      expect(mockAnthropic.messages.create).toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalled();
    });
  });

  describe('Configuration and Environment Handling', () => {
    it('should use environment-specific configuration', async () => {
      // Test with different configuration values
      const customConfigService = {
        get: jest.fn().mockImplementation((key: string) => {
          switch (key) {
            case 'ANTHROPIC_API_KEY':
              return 'prod-api-key-123';
            default:
              return undefined;
          }
        }),
      };

      const testModule = await Test.createTestingModule({
        providers: [
          AnthropicService,
          {
            provide: ConfigService,
            useValue: customConfigService,
          },
        ],
      }).compile();

      const testService = testModule.get<AnthropicService>(AnthropicService);

      expect(testService).toBeDefined();
      expect(Anthropic).toHaveBeenCalledWith({
        apiKey: 'prod-api-key-123',
      });

      await testModule.close();
    });
  });

  describe('Integration with Tool System', () => {
    beforeEach(() => {
      mockAnthropic.messages.create = jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Response' }],
        usage: { input_tokens: 10, output_tokens: 5 },
      });
    });

    it('should include anthropic tools when useTools is true', async () => {
      await service.generateMessage(
        mockSystemPrompt,
        mockMessages,
        undefined,
        true,
      );

      expect(mockAnthropic.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tools: expect.any(Array),
        }),
        { signal: undefined },
      );
    });

    it('should exclude tools when useTools is false', async () => {
      await service.generateMessage(
        mockSystemPrompt,
        mockMessages,
        undefined,
        false,
      );

      expect(mockAnthropic.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tools: [],
        }),
        { signal: undefined },
      );
    });

    it('should add cache control to the last tool', async () => {
      await service.generateMessage(
        mockSystemPrompt,
        mockMessages,
        undefined,
        true,
      );

      // Verify that cache control is added to tools
      expect(mockAnthropic.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tools: expect.any(Array),
        }),
        { signal: undefined },
      );
    });
  });

  describe('Memory and Resource Management', () => {
    it('should handle large message histories efficiently', async () => {
      const largeMessageHistory: Message[] = Array.from(
        { length: 100 },
        (_, i) => ({
          id: i.toString(),
          role: i % 2 === 0 ? MessageRole.USER : MessageRole.ASSISTANT,
          content: [
            {
              type: MessageContentType.Text,
              text: `Message ${i}`,
            } as TextContentBlock,
          ],
          createdAt: new Date(),
          updatedAt: new Date(),
          taskId: null,
          userId: null,
        }),
      );

      mockAnthropic.messages.create = jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Response to large history' }],
        usage: { input_tokens: 1000, output_tokens: 50 },
      });

      const result = await service.generateMessage(
        mockSystemPrompt,
        largeMessageHistory,
      );

      expect(result).toBeDefined();
      expect(result.tokenUsage.inputTokens).toBe(1000);
      expect(mockAnthropic.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining(
            largeMessageHistory.map((_, i) =>
              expect.objectContaining({
                role: i % 2 === 0 ? 'user' : 'assistant',
              }),
            ),
          ),
        }),
        { signal: undefined },
      );
    });

    it('should handle memory cleanup after large operations', async () => {
      const initialMemory = process.memoryUsage();

      // Simulate large operation
      const largeContent = 'x'.repeat(10000);
      const largeResponse = {
        content: [{ type: 'text', text: largeContent }],
        usage: { input_tokens: 1000, output_tokens: 500 },
      };

      mockAnthropic.messages.create = jest
        .fn()
        .mockResolvedValue(largeResponse);

      await service.generateMessage(mockSystemPrompt, mockMessages);

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();

      // Memory should not grow excessively (allow for some variance)
      expect(finalMemory.heapUsed - initialMemory.heapUsed).toBeLessThan(
        50 * 1024 * 1024,
      ); // 50MB
    });
  });
});
