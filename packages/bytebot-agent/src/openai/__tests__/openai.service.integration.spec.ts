/**
 * OpenAI Service Integration Tests
 *
 * Comprehensive integration testing for OpenAI API service including:
 * - API connection and authentication with OpenAI responses API
 * - Message generation and content formatting
 * - Reasoning model handling (o-series models)
 * - Error handling and network failures
 * - Performance and timeout scenarios
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OpenAIService } from '../openai.service';
import { SecretsService } from '../../config/secrets.service';
import { Logger } from '@nestjs/common';
import { Message, MessageRole } from '@prisma/client';
import {
  MessageContentType,
  TextContentBlock,
  ToolUseContentBlock,
  ImageContentBlock,
  BytebotAgentInterrupt,
} from '@bytebot/shared';
import OpenAI, { APIUserAbortError } from 'openai';

// Mock OpenAI SDK
jest.mock('openai');

describe('OpenAIService - Integration Tests', () => {
  let service: OpenAIService;
  let configService: ConfigService;
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
        { type: MessageContentType.Text, text: 'Hello' } as TextContentBlock,
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
      taskId: 'task-1',
      summaryId: null,
    },
  ];

  beforeEach(async () => {
    // Clear all mocks
    jest.clearAllMocks();

    // Mock OpenAI constructor and methods
    const mockOpenAIInstance = {
      responses: {
        create: jest.fn(),
      },
    };
    (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(
      () => mockOpenAIInstance as any,
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
          useValue: {
            getSecret: jest.fn().mockReturnValue(mockApiKey),
          },
        },
      ],
    }).compile();

    service = module.get<OpenAIService>(OpenAIService);
    configService = module.get<ConfigService>(ConfigService);

    // Suppress console warnings for tests
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(async () => {
    await module.close();
  });

  describe('Service Initialization', () => {
    it('should initialize with dummy key for deferred authentication', () => {
      expect(service).toBeDefined();
      expect(OpenAI).toHaveBeenCalledWith({
        apiKey: 'dummy-key-for-initialization',
      });
    });

    it('should initialize with dummy key when API key is missing', async () => {
      // Create new module with missing API key
      const testModule = await Test.createTestingModule({
        providers: [
          OpenAIService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn().mockReturnValue(undefined),
            },
          },
          {
            provide: SecretsService,
            useValue: {
              getSecret: jest.fn().mockReturnValue(undefined),
            },
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

    it('should log error when API key is not configured and generateMessage is called', async () => {
      const loggerErrorSpy = jest.spyOn(Logger.prototype, 'error');

      const testModule = await Test.createTestingModule({
        providers: [
          OpenAIService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn().mockReturnValue(undefined),
            },
          },
          {
            provide: SecretsService,
            useValue: {
              getSecret: jest.fn().mockReturnValue(undefined),
            },
          },
        ],
      }).compile();

      const testService = testModule.get<OpenAIService>(OpenAIService);

      // This should trigger the error when trying to get the API key
      await expect(
        testService.generateMessage('Test prompt', mockMessages),
      ).rejects.toThrow('OPENAI_API_KEY is not configured');

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'OPENAI_API_KEY not found in secrets or configuration',
        ),
      );

      await testModule.close();
    });
  });

  describe('API Integration - generateMessage with Responses API', () => {
    const mockSuccessResponse = {
      output: [
        {
          type: 'message',
          role: 'assistant',
          content: [
            {
              type: 'output_text',
              text: 'Hello! How can I help you?',
            },
          ],
        },
      ],
      usage: {
        input_tokens: 10,
        output_tokens: 8,
        total_tokens: 18,
      },
    };

    beforeEach(() => {
      mockOpenAI.responses.create = jest
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

      expect(mockOpenAI.responses.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'o3-2025-04-16', // Default model is o-series which uses reasoning
          max_output_tokens: 8192,
          instructions: mockSystemPrompt,
          input: expect.any(Array),
          tools: expect.any(Array),
          reasoning: { effort: 'medium' }, // o-series models use reasoning
          store: false,
          include: ['reasoning.encrypted_content'], // o-series models include reasoning
        }),
        { signal: undefined },
      );
    });

    it('should handle reasoning models (o-series) with reasoning config', async () => {
      const reasoningModel = 'o1-preview';
      const reasoningResponse = {
        output: [
          {
            type: 'reasoning',
            id: 'reasoning_123',
            encrypted_content: 'Let me think about this step by step...',
            summary: [],
          },
          {
            type: 'message',
            role: 'assistant',
            content: [
              {
                type: 'output_text',
                text: 'Based on my reasoning, here is the answer...',
              },
            ],
          },
        ],
        usage: { input_tokens: 15, output_tokens: 25, total_tokens: 40 },
      };

      mockOpenAI.responses.create = jest
        .fn()
        .mockResolvedValue(reasoningResponse);

      const result = await service.generateMessage(
        mockSystemPrompt,
        mockMessages,
        reasoningModel,
      );

      expect(mockOpenAI.responses.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: reasoningModel,
          reasoning: { effort: 'medium' },
          include: ['reasoning.encrypted_content'],
        }),
        { signal: undefined },
      );

      expect(result.contentBlocks).toEqual([
        {
          type: MessageContentType.Thinking,
          thinking: 'Let me think about this step by step...',
          signature: 'reasoning_123',
        },
        {
          type: MessageContentType.Text,
          text: 'Based on my reasoning, here is the answer...',
        },
      ]);
    });

    it('should generate message with custom model and no tools', async () => {
      const customModel = 'gpt-4-turbo-preview';

      await service.generateMessage(
        mockSystemPrompt,
        mockMessages,
        customModel,
        false, // useTools = false
      );

      expect(mockOpenAI.responses.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: customModel,
          tools: [],
        }),
        { signal: undefined },
      );
    });

    it('should handle function call responses', async () => {
      const mockFunctionResponse = {
        output: [
          {
            type: 'function_call',
            call_id: 'call_123',
            name: 'get_weather',
            arguments: JSON.stringify({ city: 'New York' }),
          },
        ],
        usage: { input_tokens: 15, output_tokens: 12, total_tokens: 27 },
      };

      mockOpenAI.responses.create = jest
        .fn()
        .mockResolvedValue(mockFunctionResponse);

      const result = await service.generateMessage(
        mockSystemPrompt,
        mockMessages,
      );

      expect(result.contentBlocks).toEqual([
        {
          type: MessageContentType.ToolUse,
          id: 'call_123',
          name: 'get_weather',
          input: { city: 'New York' },
        },
      ]);
    });

    it('should handle response refusal', async () => {
      const mockRefusalResponse = {
        output: [
          {
            type: 'message',
            role: 'assistant',
            content: [
              {
                type: 'output_refusal',
                refusal: 'I cannot help with that request.',
              },
            ],
          },
        ],
        usage: { input_tokens: 10, output_tokens: 8, total_tokens: 18 },
      };

      mockOpenAI.responses.create = jest
        .fn()
        .mockResolvedValue(mockRefusalResponse);

      const result = await service.generateMessage(
        mockSystemPrompt,
        mockMessages,
      );

      expect(result.contentBlocks).toEqual([
        {
          type: MessageContentType.Text,
          text: 'Refusal: I cannot help with that request.',
        },
      ]);
    });
  });

  describe('Error Handling and Network Failures', () => {
    it('should handle API user abort error', async () => {
      const abortError = new APIUserAbortError();
      mockOpenAI.responses.create = jest.fn().mockRejectedValue(abortError);

      await expect(
        service.generateMessage(mockSystemPrompt, mockMessages),
      ).rejects.toBeInstanceOf(BytebotAgentInterrupt);

      expect(Logger.prototype.log).toHaveBeenCalledWith(
        'OpenAI API call aborted',
      );
    });

    it('should handle network timeout errors', async () => {
      const timeoutError = new Error('Request timeout');
      mockOpenAI.responses.create = jest.fn().mockRejectedValue(timeoutError);

      await expect(
        service.generateMessage(mockSystemPrompt, mockMessages),
      ).rejects.toThrow('Request timeout');

      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Error sending message to OpenAI: Request timeout',
        timeoutError.stack,
      );
    });

    it('should handle API rate limit errors', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      rateLimitError.name = 'RateLimitError';
      mockOpenAI.responses.create = jest.fn().mockRejectedValue(rateLimitError);

      await expect(
        service.generateMessage(mockSystemPrompt, mockMessages),
      ).rejects.toThrow('Rate limit exceeded');

      expect(console.log).toHaveBeenCalledWith('error name', 'RateLimitError');
    });

    it('should handle authentication errors', async () => {
      const authError = new Error('Invalid API key');
      authError.name = 'AuthenticationError';
      mockOpenAI.responses.create = jest.fn().mockRejectedValue(authError);

      await expect(
        service.generateMessage(mockSystemPrompt, mockMessages),
      ).rejects.toThrow('Invalid API key');
    });

    it('should handle malformed response errors', async () => {
      const malformedError = new Error('Invalid JSON response');
      mockOpenAI.responses.create = jest.fn().mockRejectedValue(malformedError);

      await expect(
        service.generateMessage(mockSystemPrompt, mockMessages),
      ).rejects.toThrow('Invalid JSON response');
    });
  });

  describe('Message Formatting and Content Handling', () => {
    beforeEach(() => {
      mockOpenAI.responses.create = jest.fn().mockResolvedValue({
        output: [
          {
            type: 'message',
            role: 'assistant',
            content: [{ type: 'output_text', text: 'Response' }],
          },
        ],
        usage: { input_tokens: 10, output_tokens: 5, total_tokens: 15 },
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
          taskId: 'test-task-id',
          summaryId: null,
        },
      ];

      await service.generateMessage(mockSystemPrompt, messagesWithUserActions);

      expect(mockOpenAI.responses.create).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.arrayContaining([
            expect.objectContaining({
              type: 'message',
              role: 'user',
              content: expect.arrayContaining([
                expect.objectContaining({
                  type: 'input_text',
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

    it('should handle image content blocks in user actions', async () => {
      const messagesWithImages: Message[] = [
        {
          id: '1',
          role: MessageRole.USER,
          content: [
            {
              type: MessageContentType.UserAction,
              content: [
                {
                  type: MessageContentType.Image,
                  source: {
                    type: 'base64',
                    media_type: 'image/png',
                    data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
                  },
                } as ImageContentBlock,
              ],
            },
          ],
          createdAt: new Date(),
          updatedAt: new Date(),
          taskId: 'test-task-id',
          summaryId: null,
        },
      ];

      await service.generateMessage(mockSystemPrompt, messagesWithImages);

      expect(mockOpenAI.responses.create).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.arrayContaining([
            expect.objectContaining({
              type: 'message',
              role: 'user',
              content: expect.arrayContaining([
                expect.objectContaining({
                  type: 'input_image',
                  detail: 'high',
                  image_url: expect.stringContaining('data:image/png;base64,'),
                }),
              ]),
            }),
          ]),
        }),
        { signal: undefined },
      );
    });

    it('should handle tool result content blocks', async () => {
      const messagesWithToolResults: Message[] = [
        {
          id: '1',
          role: MessageRole.USER,
          content: [
            {
              type: MessageContentType.ToolResult,
              tool_use_id: 'tool_123',
              is_error: false,
              content: [
                {
                  type: MessageContentType.Text,
                  text: 'Tool execution result',
                } as TextContentBlock,
              ],
            },
          ],
          createdAt: new Date(),
          updatedAt: new Date(),
          taskId: 'test-task-id',
          summaryId: null,
        },
      ];

      await service.generateMessage(mockSystemPrompt, messagesWithToolResults);

      expect(mockOpenAI.responses.create).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.arrayContaining([
            expect.objectContaining({
              type: 'function_call_output',
              call_id: 'tool_123',
              output: 'Tool execution result',
            }),
          ]),
        }),
        { signal: undefined },
      );
    });

    it('should handle tool use content blocks in assistant messages', async () => {
      const messagesWithToolUse: Message[] = [
        {
          id: '1',
          role: MessageRole.ASSISTANT,
          content: [
            {
              type: MessageContentType.ToolUse,
              id: 'tool_456',
              name: 'search',
              input: { query: 'test query' },
            } as ToolUseContentBlock,
          ],
          createdAt: new Date(),
          updatedAt: new Date(),
          taskId: 'test-task-id',
          summaryId: null,
        },
      ];

      await service.generateMessage(mockSystemPrompt, messagesWithToolUse);

      expect(mockOpenAI.responses.create).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.arrayContaining([
            expect.objectContaining({
              type: 'function_call',
              call_id: 'tool_456',
              name: 'search',
              arguments: '{"query":"test query"}',
            }),
          ]),
        }),
        { signal: undefined },
      );
    });

    it('should handle thinking content blocks', async () => {
      const messagesWithThinking: Message[] = [
        {
          id: '1',
          role: MessageRole.ASSISTANT,
          content: [
            {
              type: MessageContentType.Thinking,
              thinking: 'Let me think about this...',
              signature: 'thinking_456',
            },
          ],
          createdAt: new Date(),
          updatedAt: new Date(),
          taskId: 'test-task-id',
          summaryId: null,
        },
      ];

      await service.generateMessage(mockSystemPrompt, messagesWithThinking);

      expect(mockOpenAI.responses.create).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.arrayContaining([
            expect.objectContaining({
              type: 'reasoning',
              id: 'thinking_456',
              encrypted_content: 'Let me think about this...',
              summary: [],
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
      mockOpenAI.responses.create = jest.fn().mockImplementation(async () => {
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

      expect(mockOpenAI.responses.create).toHaveBeenCalledWith(
        expect.any(Object),
        { signal: abortSignal },
      );
    });

    it('should handle long-running API calls', async () => {
      const delay = (ms: number) =>
        new Promise((resolve) => setTimeout(resolve, ms));

      mockOpenAI.responses.create = jest.fn().mockImplementation(async () => {
        await delay(100); // Simulate network delay
        return {
          output: [
            {
              type: 'message',
              role: 'assistant',
              content: [{ type: 'output_text', text: 'Delayed response' }],
            },
          ],
          usage: { input_tokens: 10, output_tokens: 5, total_tokens: 15 },
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
  });

  describe('Response Output Item Handling', () => {
    it('should handle unsupported response output item types', async () => {
      const loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn');

      const mockUnsupportedResponse = {
        output: [
          {
            type: 'image_generation_call',
            id: 'img_123',
            prompt: 'Generate an image',
          },
        ],
        usage: { input_tokens: 10, output_tokens: 5, total_tokens: 15 },
      };

      mockOpenAI.responses.create = jest
        .fn()
        .mockResolvedValue(mockUnsupportedResponse);

      const result = await service.generateMessage(
        mockSystemPrompt,
        mockMessages,
      );

      expect(loggerWarnSpy).toHaveBeenCalledWith(
        'Unsupported response output item type: image_generation_call',
      );

      expect(result.contentBlocks[0]).toEqual({
        type: MessageContentType.Text,
        text: JSON.stringify(mockUnsupportedResponse.output[0]),
      });
    });

    it('should handle unknown response output item types', async () => {
      const loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn');

      const mockUnknownResponse = {
        output: [
          {
            type: 'unknown_type',
            data: 'some data',
          },
        ],
        usage: { input_tokens: 10, output_tokens: 5, total_tokens: 15 },
      };

      mockOpenAI.responses.create = jest
        .fn()
        .mockResolvedValue(mockUnknownResponse);

      const result = await service.generateMessage(
        mockSystemPrompt,
        mockMessages,
      );

      expect(loggerWarnSpy).toHaveBeenCalledWith(
        `Unknown response output item type: ${JSON.stringify(mockUnknownResponse.output[0])}`,
      );

      expect(result.contentBlocks[0]).toEqual({
        type: MessageContentType.Text,
        text: JSON.stringify(mockUnknownResponse.output[0]),
      });
    });
  });

  describe('Token Usage and Metrics', () => {
    it('should handle missing usage data gracefully', async () => {
      const responseWithoutUsage = {
        output: [
          {
            type: 'message',
            role: 'assistant',
            content: [{ type: 'output_text', text: 'Response without usage' }],
          },
        ],
        // No usage field
      };

      mockOpenAI.responses.create = jest
        .fn()
        .mockResolvedValue(responseWithoutUsage);

      const result = await service.generateMessage(
        mockSystemPrompt,
        mockMessages,
      );

      expect(result.tokenUsage).toEqual({
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
      });
    });

    it('should handle partial usage data', async () => {
      const responseWithPartialUsage = {
        output: [
          {
            type: 'message',
            role: 'assistant',
            content: [{ type: 'output_text', text: 'Response' }],
          },
        ],
        usage: {
          input_tokens: 15,
          // Missing output_tokens and total_tokens
        },
      };

      mockOpenAI.responses.create = jest
        .fn()
        .mockResolvedValue(responseWithPartialUsage);

      const result = await service.generateMessage(
        mockSystemPrompt,
        mockMessages,
      );

      expect(result.tokenUsage).toEqual({
        inputTokens: 15,
        outputTokens: 0,
        totalTokens: 0,
      });
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
          taskId: 'task-' + i.toString(),
          summaryId: null,
        }),
      );

      mockOpenAI.responses.create = jest.fn().mockResolvedValue({
        output: [
          {
            type: 'message',
            role: 'assistant',
            content: [
              { type: 'output_text', text: 'Response to large history' },
            ],
          },
        ],
        usage: { input_tokens: 1000, output_tokens: 50, total_tokens: 1050 },
      });

      const result = await service.generateMessage(
        mockSystemPrompt,
        largeMessageHistory,
      );

      expect(result).toBeDefined();
      expect(result.tokenUsage.inputTokens).toBe(1000);
      expect(mockOpenAI.responses.create).toHaveBeenCalled();
    });

    it('should handle malformed function arguments gracefully', async () => {
      const loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn');

      const mockMalformedFunctionResponse = {
        output: [
          {
            type: 'function_call',
            call_id: 'call_456',
            name: 'broken_function',
            arguments: '{"invalid": json}', // Malformed JSON
          },
        ],
        usage: { input_tokens: 10, output_tokens: 5, total_tokens: 15 },
      };

      mockOpenAI.responses.create = jest
        .fn()
        .mockResolvedValue(mockMalformedFunctionResponse);

      const result = await service.generateMessage(
        mockSystemPrompt,
        mockMessages,
      );

      expect(loggerWarnSpy).toHaveBeenCalledWith(
        'Failed to parse tool call arguments: {"invalid": json}',
      );

      expect(result.contentBlocks[0]).toEqual({
        type: MessageContentType.ToolUse,
        id: 'call_456',
        name: 'broken_function',
        input: {},
      });
    });
  });
});
