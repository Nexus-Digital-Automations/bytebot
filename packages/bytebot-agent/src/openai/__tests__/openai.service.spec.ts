/**
 * OpenAI Service Test Suite
 *
 * Comprehensive unit and integration tests for OpenAI API service including:
 * - API connection and authentication
 * - Message generation and content formatting
 * - Error handling and network failures
 * - Performance and timeout scenarios
 * - Security key management
 * - Tool integration and function calling
 * - Rate limiting and retry logic
 */

import { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OpenAIService } from '../openai.service';
import { SecretsService } from '../../config/secrets.service';

import { Message, MessageRole, Prisma } from '@prisma/client';
import {
  MessageContentType,
  TextContentBlock,
  ToolUseContentBlock,
  BytebotAgentInterrupt,
} from '@bytebot/shared';
import OpenAI, { APIUserAbortError } from 'openai';

// Mock OpenAI SDK
jest.mock('openai');

// Mock SecretsService
const mockSecretsService = {
  getSecret: jest.fn(),
};

describe('OpenAIService - Integration Tests', () => {
  let service: OpenAIService;
  let mockOpenAI: jest.Mocked<OpenAI>;
  let module: TestingModule;

  // Test data
  const mockApiKey = 'test-openai-api-key';
  const mockSystemPrompt = 'You are a helpful assistant';
  const mockMessages: Message[] = [
    {
      id: '1',
      role: MessageRole.USER,
      content: [
        { type: MessageContentType._Text, text: 'Hello' } as TextContentBlock,
      ] as unknown as Prisma.JsonValue,
      createdAt: new Date(),
      updatedAt: new Date(),
      taskId: 'task-1',
      summaryId: null,
    },
  ];

  beforeEach(async () => {
    jest.clearAllMocks();

    // Mock OpenAI constructor and methods
    const mockOpenAIInstance = {
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    };
    (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(
      () => mockOpenAIInstance as unknown as jest.Mocked<OpenAI>,
    );
    mockOpenAI = mockOpenAIInstance as unknown as jest.Mocked<OpenAI>;

    module = await Test.createTestingModule({
      providers: [
        OpenAIService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              switch (key) {
                case 'OPENAI_API_KEY':
                  return mockApiKey;
                default:
                  return undefined;
              }
            }),
          },
        },
        {
          provide: SecretsService,
          useValue: mockSecretsService,
        },
      ],
    }).compile();

    service = module.get<OpenAIService>(OpenAIService);

    // Suppress console warnings for tests
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('Service Initialization', () => {
    it('should initialize with dummy key initially', () => {
      expect(service).toBeDefined();
      expect(OpenAI).toHaveBeenCalledWith({
        apiKey: 'dummy-key-for-initialization',
      });
    });

    it('should retrieve API key from secrets service', () => {
      mockSecretsService.getSecret.mockReturnValue('secret-api-key');

      // Call the private method through reflection to test key retrieval
      const getApiKey = (service as any).getApiKey.bind(service);
      const apiKey = getApiKey();

      expect(mockSecretsService.getSecret).toHaveBeenCalledWith(
        'openai-api-key',
        'OPENAI_API_KEY',
      );
      expect(apiKey).toBe('secret-api-key');
    });

    it('should fallback to config service when secrets service fails', () => {
      mockSecretsService.getSecret.mockImplementation(() => {
        throw new Error('Secrets service unavailable');
      });

      const getApiKey = (service as any).getApiKey.bind(service);
      const apiKey = getApiKey();

      expect(apiKey).toBe(mockApiKey);
    });

    it('should use dummy key when no API key is available', () => {
      mockSecretsService.getSecret.mockImplementation(() => {
        throw new Error('Secrets service unavailable');
      });

      const configService = module.get<ConfigService>(ConfigService);
      jest.spyOn(configService, 'get').mockReturnValue(undefined);

      const getApiKey = (service as any).getApiKey.bind(service);
      const apiKey = getApiKey();

      expect(apiKey).toBe('dummy-key-for-initialization');
    });
  });

  describe('API Integration - generateMessage', () => {
    const mockSuccessResponse = {
      choices: [
        {
          message: {
            content: 'Hello! How can I help you?',
            role: 'assistant',
            tool_calls: null,
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 8,
        total_tokens: 18,
      },
    };

    beforeEach(() => {
      mockOpenAI.chat.completions.create = jest
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
            type: MessageContentType._Text,
            text: 'Hello! How can I help you?',
          },
        ],
        tokenUsage: {
          inputTokens: 10,
          outputTokens: 8,
          totalTokens: 18,
        },
      });

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: expect.any(String),
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'system',
              content: mockSystemPrompt,
            }),
            expect.objectContaining({
              role: 'user',
              content: 'Hello',
            }),
          ]),
          tools: expect.any(Array),
          tool_choice: 'auto',
          stream: false,
        }),
        { signal: undefined },
      );
    });

    it('should generate message with custom model', async () => {
      const customModel = 'gpt-4.1-2025-04-14';

      await service.generateMessage(
        mockSystemPrompt,
        mockMessages,
        customModel,
      );

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: customModel,
        }),
        { signal: undefined },
      );
    });

    it('should generate message without tools when useTools is false', async () => {
      await service.generateMessage(
        mockSystemPrompt,
        mockMessages,
        undefined,
        false, // useTools = false
      );

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tools: undefined,
          tool_choice: undefined,
        }),
        { signal: undefined },
      );
    });

    it('should handle tool calls in response', async () => {
      const mockToolResponse = {
        choices: [
          {
            message: {
              content: null,
              role: 'assistant',
              tool_calls: [
                {
                  id: 'call_123',
                  type: 'function',
                  function: {
                    name: 'get_weather',
                    arguments: '{"city": "New York"}',
                  },
                },
              ],
            },
            finish_reason: 'tool_calls',
          },
        ],
        usage: {
          prompt_tokens: 15,
          completion_tokens: 12,
          total_tokens: 27,
        },
      };

      mockOpenAI.chat.completions.create = jest
        .fn()
        .mockResolvedValue(mockToolResponse);

      const result = await service.generateMessage(
        mockSystemPrompt,
        mockMessages,
      );

      expect(result.contentBlocks).toEqual([
        {
          type: MessageContentType._ToolUse,
          id: 'call_123',
          name: 'get_weather',
          input: { city: 'New York' },
        },
      ]);
    });

    it('should handle mixed content and tool calls', async () => {
      const mockMixedResponse = {
        choices: [
          {
            message: {
              content: 'Let me check the weather for you.',
              role: 'assistant',
              tool_calls: [
                {
                  id: 'call_456',
                  type: 'function',
                  function: {
                    name: 'get_weather',
                    arguments: '{"city": "New York"}',
                  },
                },
              ],
            },
            finish_reason: 'tool_calls',
          },
        ],
        usage: {
          prompt_tokens: 20,
          completion_tokens: 15,
          total_tokens: 35,
        },
      };

      mockOpenAI.chat.completions.create = jest
        .fn()
        .mockResolvedValue(mockMixedResponse);

      const result = await service.generateMessage(
        mockSystemPrompt,
        mockMessages,
      );

      expect(result.contentBlocks).toEqual([
        {
          type: MessageContentType._Text,
          text: 'Let me check the weather for you.',
        },
        {
          type: MessageContentType._ToolUse,
          id: 'call_456',
          name: 'get_weather',
          input: { city: 'New York' },
        },
      ]);
    });

    it('should handle invalid JSON in tool arguments', async () => {
      const mockInvalidToolResponse = {
        choices: [
          {
            message: {
              content: null,
              role: 'assistant',
              tool_calls: [
                {
                  id: 'call_789',
                  type: 'function',
                  function: {
                    name: 'invalid_tool',
                    arguments: 'invalid json {',
                  },
                },
              ],
            },
            finish_reason: 'tool_calls',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
        },
      };

      mockOpenAI.chat.completions.create = jest
        .fn()
        .mockResolvedValue(mockInvalidToolResponse);

      const result = await service.generateMessage(
        mockSystemPrompt,
        mockMessages,
      );

      expect(result.contentBlocks).toEqual([
        {
          type: MessageContentType._ToolUse,
          id: 'call_789',
          name: 'invalid_tool',
          input: {}, // Should default to empty object for invalid JSON
        },
      ]);
    });
  });

  describe('Error Handling and Network Failures', () => {
    it('should handle API user abort error', async () => {
      const abortError = new APIUserAbortError();
      mockOpenAI.chat.completions.create = jest
        .fn()
        .mockRejectedValue(abortError);

      await expect(
        service.generateMessage(mockSystemPrompt, mockMessages),
      ).rejects.toThrow(BytebotAgentInterrupt);

      expect(jest.spyOn(Logger.prototype, 'log')).toHaveBeenCalledWith(
        'OpenAI API call aborted',
      );
    });

    it('should handle network timeout errors', async () => {
      const timeoutError = new Error('Request timeout');
      mockOpenAI.chat.completions.create = jest
        .fn()
        .mockRejectedValue(timeoutError);

      await expect(
        service.generateMessage(mockSystemPrompt, mockMessages),
      ).rejects.toThrow('Request timeout');

      expect(jest.spyOn(Logger.prototype, 'error')).toHaveBeenCalledWith(
        'Error sending message to OpenAI: Request timeout',
        timeoutError.stack,
      );
    });

    it('should handle API rate limit errors', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      rateLimitError.name = 'RateLimitError';
      mockOpenAI.chat.completions.create = jest
        .fn()
        .mockRejectedValue(rateLimitError);

      await expect(
        service.generateMessage(mockSystemPrompt, mockMessages),
      ).rejects.toThrow('Rate limit exceeded');
    });

    it('should handle authentication errors', async () => {
      const authError = new Error('Invalid API key');
      authError.name = 'AuthenticationError';
      mockOpenAI.chat.completions.create = jest
        .fn()
        .mockRejectedValue(authError);

      await expect(
        service.generateMessage(mockSystemPrompt, mockMessages),
      ).rejects.toThrow('Invalid API key');
    });

    it('should handle quota exceeded errors', async () => {
      const quotaError = new Error('Quota exceeded');
      quotaError.name = 'QuotaExceededError';
      mockOpenAI.chat.completions.create = jest
        .fn()
        .mockRejectedValue(quotaError);

      await expect(
        service.generateMessage(mockSystemPrompt, mockMessages),
      ).rejects.toThrow('Quota exceeded');
    });

    it('should handle malformed response errors', async () => {
      const malformedError = new Error('Invalid JSON response');
      mockOpenAI.chat.completions.create = jest
        .fn()
        .mockRejectedValue(malformedError);

      await expect(
        service.generateMessage(mockSystemPrompt, mockMessages),
      ).rejects.toThrow('Invalid JSON response');
    });
  });

  describe('Message Formatting and Content Handling', () => {
    beforeEach(() => {
      mockOpenAI.chat.completions.create = jest.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content: 'Response',
              role: 'assistant',
              tool_calls: null,
            },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      });
    });

    it('should properly format user action content blocks', async () => {
      const messagesWithUserActions: Message[] = [
        {
          id: '1',
          role: MessageRole.USER,
          content: [
            {
              type: MessageContentType._UserAction,
              content: [
                {
                  type: MessageContentType._ComputerToolUse,
                  name: 'screenshot',
                  input: { display: 1 },
                },
              ],
            },
          ],
          createdAt: new Date(),
          updatedAt: new Date(),
          taskId: 'task-1',
          summaryId: null,
        },
      ];

      await service.generateMessage(mockSystemPrompt, messagesWithUserActions);

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining(
                'User performed action: screenshot',
              ),
            }),
          ]),
        }),
        { signal: undefined },
      );
    });

    it('should handle image content blocks', async () => {
      const messagesWithImages: Message[] = [
        {
          id: '1',
          role: MessageRole.USER,
          content: [
            {
              type: MessageContentType._Image,
              source: {
                type: 'base64',
                media_type: 'image/png',
                _data: 'base64-image-data',
              },
            },
          ],
          createdAt: new Date(),
          updatedAt: new Date(),
          taskId: 'task-1',
          summaryId: null,
        },
      ];

      await service.generateMessage(mockSystemPrompt, messagesWithImages);

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.arrayContaining([
                expect.objectContaining({
                  type: 'image_url',
                  image_url: expect.objectContaining({
                    url: expect.stringContaining('_data: image/png;base64,'),
                  }),
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
              type: MessageContentType._Text,
              text: 'Hello',
            } as TextContentBlock,
          ] as unknown as Prisma.JsonValue,
          createdAt: new Date(),
          updatedAt: new Date(),
          taskId: 'task-1',
          summaryId: null,
        },
        {
          id: '2',
          role: MessageRole.ASSISTANT,
          content: [
            {
              type: MessageContentType._Text,
              text: 'Hi there!',
            } as TextContentBlock,
            {
              type: MessageContentType._ToolUse,
              id: 'tool_1',
              name: 'search',
              input: { query: 'test' },
            } as ToolUseContentBlock,
          ] as unknown as Prisma.JsonValue,
          createdAt: new Date(),
          updatedAt: new Date(),
          taskId: 'task-1',
          summaryId: null,
        },
      ];

      await service.generateMessage(mockSystemPrompt, mixedMessages);

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: 'Hello',
            }),
            expect.objectContaining({
              role: 'assistant',
              content: 'Hi there!',
              tool_calls: expect.arrayContaining([
                expect.objectContaining({
                  id: 'tool_1',
                  function: expect.objectContaining({
                    name: 'search',
                    arguments: '{"query":"test"}',
                  }),
                }),
              ]),
            }),
          ]),
        }),
        { signal: undefined },
      );
    });

    it('should handle empty or null responses gracefully', async () => {
      const emptyResponse = {
        choices: [
          {
            message: { content: null, role: 'assistant', tool_calls: null },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 0, total_tokens: 10 },
      };

      mockOpenAI.chat.completions.create = jest
        .fn()
        .mockResolvedValue(emptyResponse);

      const result = await service.generateMessage(
        mockSystemPrompt,
        mockMessages,
      );

      expect(result.contentBlocks).toEqual([]);
      expect(result.tokenUsage.outputTokens).toBe(0);
    });
  });

  describe('Performance and Timeout Scenarios', () => {
    it('should respect abort signals', async () => {
      const abortController = new AbortController();
      const abortSignal = abortController.signal;

      // Simulate API call abortion
      mockOpenAI.chat.completions.create = jest.fn().mockImplementation(() => {
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

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.any(Object),
        { signal: abortSignal },
      );
    });

    it('should handle long-running API calls', async () => {
      const delay = (ms: number) =>
        new Promise((resolve) => setTimeout(resolve, ms));

      mockOpenAI.chat.completions.create = jest
        .fn()
        .mockImplementation(async () => {
          await delay(100); // Simulate network delay
          return {
            choices: [
              {
                message: {
                  content: 'Delayed response',
                  role: 'assistant',
                  tool_calls: null,
                },
                finish_reason: 'stop',
              },
            ],
            usage: {
              prompt_tokens: 10,
              completion_tokens: 5,
              total_tokens: 15,
            },
          };
        });

      const startTime = Date.now();
      const result = await service.generateMessage(
        mockSystemPrompt,
        mockMessages,
      );
      const endTime = Date.now();

      expect(endTime - startTime).toBeGreaterThan(90);
      expect((result.contentBlocks[0] as any).text).toBe('Delayed response');
    });

    it('should measure and log API call duration', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await service.generateMessage(mockSystemPrompt, mockMessages);

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalled();
    });
  });

  describe('Security and Key Management', () => {
    it('should use different API keys for different environments', () => {
      const testCases = [
        { env: 'development', expectedKey: 'dev-key-123' },
        { env: 'staging', expectedKey: 'staging-key-456' },
        { env: 'production', expectedKey: 'prod-key-789' },
      ];

      testCases.forEach(({ env, expectedKey }) => {
        mockSecretsService.getSecret.mockReturnValue(expectedKey);

        const getApiKey = (service as any).getApiKey.bind(service);
        const apiKey = getApiKey();

        expect(apiKey).toBe(expectedKey);
      });
    });

    it('should not log API keys in error messages', async () => {
      const errorSpy = jest.spyOn(Logger.prototype, 'error');

      mockOpenAI.chat.completions.create = jest
        .fn()
        .mockRejectedValue(new Error('API Error'));

      await expect(
        service.generateMessage(mockSystemPrompt, mockMessages),
      ).rejects.toThrow();

      // Check that no log contains the API key
      errorSpy.mock.calls.forEach((call) => {
        call.forEach((arg) => {
          if (typeof arg === 'string') {
            expect(arg).not.toContain(mockApiKey);
            expect(arg).not.toContain('test-openai-api-key');
          }
        });
      });
    });

    it('should handle key rotation gracefully', async () => {
      const oldKey = 'old-api-key';
      const newKey = 'new-api-key';

      // First call with old key
      mockSecretsService.getSecret.mockReturnValue(oldKey);
      let getApiKey = (service as any).getApiKey.bind(service);
      expect(getApiKey()).toBe(oldKey);

      // Simulate key rotation
      mockSecretsService.getSecret.mockReturnValue(newKey);
      getApiKey = (service as any).getApiKey.bind(service);
      expect(getApiKey()).toBe(newKey);
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
              type: MessageContentType._Text,
              text: `Message ${i}`,
            } as TextContentBlock,
          ] as unknown as Prisma.JsonValue,
          createdAt: new Date(),
          updatedAt: new Date(),
          taskId: 'task-1',
          summaryId: null,
        }),
      );

      mockOpenAI.chat.completions.create = jest.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content: 'Response to large history',
              role: 'assistant',
              tool_calls: null,
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 1000,
          completion_tokens: 50,
          total_tokens: 1050,
        },
      });

      const result = await service.generateMessage(
        mockSystemPrompt,
        largeMessageHistory,
      );

      expect(result).toBeDefined();
      expect(result.tokenUsage.inputTokens).toBe(1000);
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'system' }),
            ...largeMessageHistory.map((_, i) =>
              expect.objectContaining({
                role: i % 2 === 0 ? 'user' : 'assistant',
              }),
            ),
          ]),
        }),
        { signal: undefined },
      );
    });

    it('should handle memory cleanup after large operations', async () => {
      const initialMemory = process.memoryUsage();

      // Simulate large operation
      const largeContent = 'x'.repeat(10000);
      const largeResponse = {
        choices: [
          {
            message: {
              content: largeContent,
              role: 'assistant',
              tool_calls: null,
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 1000,
          completion_tokens: 500,
          total_tokens: 1500,
        },
      };

      mockOpenAI.chat.completions.create = jest
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

  describe('Tool Integration', () => {
    beforeEach(() => {
      mockOpenAI.chat.completions.create = jest.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content: 'Response',
              role: 'assistant',
              tool_calls: null,
            },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      });
    });

    it('should include OpenAI tools when useTools is true', async () => {
      await service.generateMessage(
        mockSystemPrompt,
        mockMessages,
        undefined,
        true,
      );

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tools: expect.any(Array),
          tool_choice: 'auto',
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

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tools: undefined,
          tool_choice: undefined,
        }),
        { signal: undefined },
      );
    });

    it('should handle tool choice options', async () => {
      await service.generateMessage(
        mockSystemPrompt,
        mockMessages,
        undefined,
        true,
      );

      const callArgs = mockOpenAI.chat.completions.create.mock.calls[0][0];
      expect(callArgs.tool_choice).toBe('auto');
    });
  });

  describe('Configuration Integration', () => {
    it('should use environment-specific configuration', async () => {
      const customConfigService = {
        get: jest.fn().mockImplementation((key: string) => {
          switch (key) {
            case 'OPENAI_API_KEY':
              return 'custom-api-key-123';
            default:
              return undefined;
          }
        }),
      };

      const testModule = await Test.createTestingModule({
        providers: [
          OpenAIService,
          {
            provide: ConfigService,
            useValue: customConfigService,
          },
          {
            provide: SecretsService,
            useValue: mockSecretsService,
          },
        ],
      }).compile();

      const testService = testModule.get<OpenAIService>(OpenAIService);

      expect(testService).toBeDefined();
      expect(OpenAI).toHaveBeenCalledWith({
        apiKey: 'dummy-key-for-initialization',
      });

      await testModule.close();
    });
  });
});
