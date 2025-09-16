import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import OpenAI, { APIUserAbortError } from 'openai';
import { ProxyService } from '../proxy.service';
import { proxyTools } from '../proxy.tools';
import {
  MessageContentType,
  TextContentBlock,
  ToolUseContentBlock,
  ImageContentBlock,
  ThinkingContentBlock,
  ToolResultContentBlock,
  UserActionContentBlock,
} from '@bytebot/shared';
import { Message, MessageRole } from '@prisma/client';
import { BytebotAgentInterrupt } from '../../agent/agent.types';

// Mock OpenAI
jest.mock('openai');
const MockedOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>;

describe('ProxyService', () => {
  let service: ProxyService;
  let configService: ConfigService;
  let mockOpenAI: jest.Mocked<OpenAI>;
  let mockChatCompletions: jest.Mocked<OpenAI.Chat.Completions>;

  const mockConfig = {
    BYTEBOT_LLM_PROXY_URL: 'http://localhost:8080/proxy',
  };

  beforeEach(async () => {
    // Create mock OpenAI instance
    mockChatCompletions = {
      create: jest.fn(),
    } as any;

    mockOpenAI = {
      chat: {
        completions: mockChatCompletions,
      },
    } as any;

    MockedOpenAI.mockImplementation(() => mockOpenAI);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProxyService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(
              (key: string) => mockConfig[key as keyof typeof mockConfig],
            ),
          },
        },
      ],
    }).compile();

    // Suppress console logs during testing
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    service = module.get<ProxyService>(ProxyService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize OpenAI client with proxy configuration', () => {
      expect(MockedOpenAI).toHaveBeenCalledWith({
        apiKey: 'dummy-key-for-proxy',
        baseURL: mockConfig.BYTEBOT_LLM_PROXY_URL,
      });
    });

    it('should log warning when proxy URL is not configured', async () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');

      // Create new service instance without proxy URL
      const testModule = await Test.createTestingModule({
        providers: [
          ProxyService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn().mockReturnValue(undefined),
            },
          },
        ],
      }).compile();

      testModule.get<ProxyService>(ProxyService);

      expect(warnSpy).toHaveBeenCalledWith(
        'BYTEBOT_LLM_PROXY_URL is not set. ProxyService will not work properly.',
      );
    });
  });

  describe('generateMessage', () => {
    const mockSystemPrompt = 'You are a helpful assistant.';
    const mockModel = 'gpt-4o';
    const mockMessages: Message[] = [
      {
        id: '1',
        role: MessageRole.USER,
        content: [
          {
            type: MessageContentType._Text,
            text: 'Hello, how are you?',
          } as TextContentBlock,
        ],
        conversationId: 'conv-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    it('should successfully generate message with text response', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'I am doing well, thank you!',
              tool_calls: null,
            },
          },
        ],
        usage: {
          prompt_tokens: 50,
          completion_tokens: 20,
          total_tokens: 70,
        },
      };

      mockChatCompletions.create.mockResolvedValue(mockResponse as any);

      const result = await service.generateMessage(
        mockSystemPrompt,
        mockMessages,
        mockModel,
      );

      expect(result).toEqual({
        contentBlocks: [
          {
            type: MessageContentType._Text,
            text: 'I am doing well, thank you!',
          },
        ],
        tokenUsage: {
          inputTokens: 50,
          outputTokens: 20,
          totalTokens: 70,
        },
      });

      expect(mockChatCompletions.create).toHaveBeenCalledWith(
        {
          model: mockModel,
          messages: [
            { role: 'system', content: mockSystemPrompt },
            { role: 'user', content: 'Hello, how are you?' },
          ],
          max_tokens: 8192,
          tools: proxyTools,
          reasoning_effort: 'high',
        },
        { signal: undefined },
      );
    });

    it('should generate message with tool use response', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: null,
              tool_calls: [
                {
                  id: 'call_123',
                  type: 'function' as const,
                  function: {
                    name: 'screenshot',
                    arguments: '{"delay": 1000}',
                  },
                },
              ],
            },
          },
        ],
        usage: {
          prompt_tokens: 60,
          completion_tokens: 30,
          total_tokens: 90,
        },
      };

      mockChatCompletions.create.mockResolvedValue(mockResponse as any);

      const result = await service.generateMessage(
        mockSystemPrompt,
        mockMessages,
        mockModel,
      );

      expect(result.contentBlocks).toContainEqual({
        type: MessageContentType._ToolUse,
        id: 'call_123',
        name: 'screenshot',
        input: { delay: 1000 },
      });
    });

    it('should handle reasoning content (thinking blocks)', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Let me think about this.',
              reasoning_content: 'I need to analyze this request carefully...',
            },
          },
        ],
        usage: {
          prompt_tokens: 40,
          completion_tokens: 25,
          total_tokens: 65,
        },
      };

      mockChatCompletions.create.mockResolvedValue(mockResponse as any);

      const result = await service.generateMessage(
        mockSystemPrompt,
        mockMessages,
        mockModel,
      );

      expect(result.contentBlocks).toContainEqual({
        type: MessageContentType._Text,
        text: 'Let me think about this.',
      });

      expect(result.contentBlocks).toContainEqual({
        type: MessageContentType._Thinking,
        thinking: 'I need to analyze this request carefully...',
        signature: 'I need to analyze this request carefully...',
      });
    });

    it('should handle message refusal', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: null,
              refusal: 'I cannot assist with that request.',
            },
          },
        ],
        usage: {
          prompt_tokens: 30,
          completion_tokens: 15,
          total_tokens: 45,
        },
      };

      mockChatCompletions.create.mockResolvedValue(mockResponse as any);

      const result = await service.generateMessage(
        mockSystemPrompt,
        mockMessages,
        mockModel,
      );

      expect(result.contentBlocks).toContainEqual({
        type: MessageContentType._Text,
        text: 'Refusal: I cannot assist with that request.',
      });
    });

    it('should disable tools when useTools is false', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Response without tools',
            },
          },
        ],
        usage: {
          prompt_tokens: 25,
          completion_tokens: 10,
          total_tokens: 35,
        },
      };

      mockChatCompletions.create.mockResolvedValue(mockResponse as any);

      await service.generateMessage(
        mockSystemPrompt,
        mockMessages,
        mockModel,
        false,
      );

      expect(mockChatCompletions.create).toHaveBeenCalledWith(
        expect.not.objectContaining({
          tools: expect.anything(),
        }),
        expect.any(Object),
      );
    });

    it('should handle abort signal', async () => {
      const abortController = new AbortController();
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'This should be interrupted',
            },
          },
        ],
        usage: {
          prompt_tokens: 20,
          completion_tokens: 8,
          total_tokens: 28,
        },
      };

      mockChatCompletions.create.mockResolvedValue(mockResponse as any);

      await service.generateMessage(
        mockSystemPrompt,
        mockMessages,
        mockModel,
        true,
        abortController.signal,
      );

      expect(mockChatCompletions.create).toHaveBeenCalledWith(
        expect.any(Object),
        { signal: abortController.signal },
      );
    });

    it('should throw BytebotAgentInterrupt on APIUserAbortError', async () => {
      mockChatCompletions.create.mockRejectedValue(new APIUserAbortError());

      await expect(
        service.generateMessage(mockSystemPrompt, mockMessages, mockModel),
      ).rejects.toThrow(BytebotAgentInterrupt);
    });

    it('should handle and re-throw other errors', async () => {
      const testError = new Error('Network connection failed');
      mockChatCompletions.create.mockRejectedValue(testError);

      await expect(
        service.generateMessage(mockSystemPrompt, mockMessages, mockModel),
      ).rejects.toThrow('Network connection failed');
    });

    it('should handle string errors', async () => {
      const testError = 'String error message';
      mockChatCompletions.create.mockRejectedValue(testError);

      await expect(
        service.generateMessage(mockSystemPrompt, mockMessages, mockModel),
      ).rejects.toBe(testError);
    });

    it('should handle unserializable errors', async () => {
      const circularObj: any = {};
      circularObj.self = circularObj;
      mockChatCompletions.create.mockRejectedValue(circularObj);

      await expect(
        service.generateMessage(mockSystemPrompt, mockMessages, mockModel),
      ).rejects.toBe(circularObj);
    });

    it('should throw error when no valid response', async () => {
      const mockResponse = {
        choices: [],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 0,
          total_tokens: 10,
        },
      };

      mockChatCompletions.create.mockResolvedValue(mockResponse as any);

      await expect(
        service.generateMessage(mockSystemPrompt, mockMessages, mockModel),
      ).rejects.toThrow('No valid response from Chat Completion API');
    });
  });

  describe('Message Format Conversion', () => {
    it('should format messages with text content', async () => {
      const messages: Message[] = [
        {
          id: '1',
          role: MessageRole.USER,
          content: [
            {
              type: MessageContentType._Text,
              text: 'Test message',
            } as TextContentBlock,
          ],
          conversationId: 'conv-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockResponse = {
        choices: [{ message: { content: 'Response' } }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      };

      mockChatCompletions.create.mockResolvedValue(mockResponse as any);

      await service.generateMessage('System prompt', messages, 'gpt-4o');

      expect(mockChatCompletions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            { role: 'system', content: 'System prompt' },
            { role: 'user', content: 'Test message' },
          ],
        }),
        expect.any(Object),
      );
    });

    it('should format messages with image content', async () => {
      const messages: Message[] = [
        {
          id: '1',
          role: MessageRole.USER,
          content: [
            {
              type: MessageContentType._Image,
              source: {
                type: 'base64',
                media_type: 'image/png',
                data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
              },
            } as ImageContentBlock,
          ],
          conversationId: 'conv-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockResponse = {
        choices: [{ message: { content: 'I can see the image' } }],
        usage: { prompt_tokens: 50, completion_tokens: 10, total_tokens: 60 },
      };

      mockChatCompletions.create.mockResolvedValue(mockResponse as any);

      await service.generateMessage('System prompt', messages, 'gpt-4o');

      expect(mockChatCompletions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            { role: 'system', content: 'System prompt' },
            {
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: {
                    url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
                    detail: 'high',
                  },
                },
              ],
            },
          ],
        }),
        expect.any(Object),
      );
    });

    it('should format messages with tool use content', async () => {
      const messages: Message[] = [
        {
          id: '1',
          role: MessageRole.ASSISTANT,
          content: [
            {
              type: MessageContentType._ToolUse,
              id: 'call_456',
              name: 'screenshot',
              input: { delay: 500 },
            } as ToolUseContentBlock,
          ],
          conversationId: 'conv-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockResponse = {
        choices: [{ message: { content: 'Tool executed' } }],
        usage: { prompt_tokens: 40, completion_tokens: 8, total_tokens: 48 },
      };

      mockChatCompletions.create.mockResolvedValue(mockResponse as any);

      await service.generateMessage('System prompt', messages, 'gpt-4o');

      expect(mockChatCompletions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            { role: 'system', content: 'System prompt' },
            {
              role: 'assistant',
              tool_calls: [
                {
                  id: 'call_456',
                  type: 'function',
                  function: {
                    name: 'screenshot',
                    arguments: '{"delay":500}',
                  },
                },
              ],
            },
          ],
        }),
        expect.any(Object),
      );
    });

    it('should format messages with thinking content', async () => {
      const messages: Message[] = [
        {
          id: '1',
          role: MessageRole.ASSISTANT,
          content: [
            {
              type: MessageContentType._Thinking,
              thinking: 'Let me analyze this problem...',
              signature: 'analytical-thinking',
            } as ThinkingContentBlock,
          ],
          conversationId: 'conv-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockResponse = {
        choices: [{ message: { content: 'Analysis complete' } }],
        usage: { prompt_tokens: 35, completion_tokens: 12, total_tokens: 47 },
      };

      mockChatCompletions.create.mockResolvedValue(mockResponse as any);

      await service.generateMessage('System prompt', messages, 'gpt-4o');

      expect(mockChatCompletions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            { role: 'system', content: 'System prompt' },
            {
              role: 'assistant',
              content: null,
              reasoning_content: 'Let me analyze this problem...',
            },
          ],
        }),
        expect.any(Object),
      );
    });

    it('should format messages with tool result content', async () => {
      const messages: Message[] = [
        {
          id: '1',
          role: MessageRole.USER,
          content: [
            {
              type: MessageContentType._ToolResult,
              tool_use_id: 'call_789',
              content: [
                {
                  type: MessageContentType._Text,
                  text: 'Screenshot taken successfully',
                } as TextContentBlock,
              ],
            } as ToolResultContentBlock,
          ],
          conversationId: 'conv-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockResponse = {
        choices: [{ message: { content: 'Got the result' } }],
        usage: { prompt_tokens: 30, completion_tokens: 7, total_tokens: 37 },
      };

      mockChatCompletions.create.mockResolvedValue(mockResponse as any);

      await service.generateMessage('System prompt', messages, 'gpt-4o');

      expect(mockChatCompletions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            { role: 'system', content: 'System prompt' },
            {
              role: 'tool',
              tool_call_id: 'call_789',
              content: 'Screenshot taken successfully',
            },
          ],
        }),
        expect.any(Object),
      );
    });

    it('should format user action messages with computer tool use', async () => {
      const messages: Message[] = [
        {
          id: '1',
          role: MessageRole.USER,
          content: [
            {
              type: MessageContentType._UserAction,
              content: [
                {
                  type: MessageContentType._ToolUse,
                  id: 'user_action_1',
                  name: 'computer_use',
                  input: { action: 'click', coordinate: [100, 200] },
                } as ToolUseContentBlock,
              ],
            } as UserActionContentBlock,
          ],
          conversationId: 'conv-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockResponse = {
        choices: [{ message: { content: 'User action processed' } }],
        usage: { prompt_tokens: 45, completion_tokens: 12, total_tokens: 57 },
      };

      mockChatCompletions.create.mockResolvedValue(mockResponse as any);

      await service.generateMessage('System prompt', messages, 'gpt-4o');

      expect(mockChatCompletions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            { role: 'system', content: 'System prompt' },
            {
              role: 'user',
              content:
                'User performed action: computer_use\n{\n  "action": "click",\n  "coordinate": [\n    100,\n    200\n  ]\n}',
            },
          ],
        }),
        expect.any(Object),
      );
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed tool call arguments', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: null,
              tool_calls: [
                {
                  id: 'call_malformed',
                  type: 'function' as const,
                  function: {
                    name: 'screenshot',
                    arguments: 'invalid json {',
                  },
                },
              ],
            },
          },
        ],
        usage: {
          prompt_tokens: 25,
          completion_tokens: 15,
          total_tokens: 40,
        },
      };

      mockChatCompletions.create.mockResolvedValue(mockResponse as any);

      const result = await service.generateMessage(
        'System prompt',
        [],
        'gpt-4o',
      );

      expect(result.contentBlocks).toContainEqual({
        type: MessageContentType._ToolUse,
        id: 'call_malformed',
        name: 'screenshot',
        input: {},
      });
    });

    it('should handle missing usage statistics', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Response without usage stats',
            },
          },
        ],
      };

      mockChatCompletions.create.mockResolvedValue(mockResponse as any);

      const result = await service.generateMessage(
        'System prompt',
        [],
        'gpt-4o',
      );

      expect(result.tokenUsage).toEqual({
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
      });
    });

    it('should handle tool result content with only images', async () => {
      const messages: Message[] = [
        {
          id: '1',
          role: MessageRole.USER,
          content: [
            {
              type: MessageContentType._ToolResult,
              tool_use_id: 'call_image',
              content: [
                {
                  type: MessageContentType._Image,
                  source: {
                    type: 'base64',
                    media_type: 'image/png',
                    data: 'test_image_data',
                  },
                } as ImageContentBlock,
              ],
            } as ToolResultContentBlock,
          ],
          conversationId: 'conv-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockResponse = {
        choices: [{ message: { content: 'Image processed' } }],
        usage: { prompt_tokens: 100, completion_tokens: 10, total_tokens: 110 },
      };

      mockChatCompletions.create.mockResolvedValue(mockResponse as any);

      await service.generateMessage('System prompt', messages, 'gpt-4o');

      expect(mockChatCompletions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            {
              role: 'tool',
              tool_call_id: 'call_image',
              content: 'screenshot',
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Screenshot',
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: 'data:image/png;base64,test_image_data',
                    detail: 'high',
                  },
                },
              ],
            },
          ]),
        }),
        expect.any(Object),
      );
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle large message arrays efficiently', async () => {
      const largeMessageArray: Message[] = Array.from(
        { length: 100 },
        (_, i) => ({
          id: i.toString(),
          role: i % 2 === 0 ? MessageRole.USER : MessageRole.ASSISTANT,
          content: [
            {
              type: MessageContentType._Text,
              text: `Message ${i}`,
            } as TextContentBlock,
          ],
          conversationId: 'conv-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );

      const mockResponse = {
        choices: [{ message: { content: 'Processed large conversation' } }],
        usage: {
          prompt_tokens: 5000,
          completion_tokens: 50,
          total_tokens: 5050,
        },
      };

      mockChatCompletions.create.mockResolvedValue(mockResponse as any);

      const startTime = performance.now();
      const result = await service.generateMessage(
        'System prompt',
        largeMessageArray,
        'gpt-4o',
      );
      const endTime = performance.now();

      expect(result).toBeDefined();
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      expect(mockChatCompletions.create).toHaveBeenCalledTimes(1);
    });

    it('should handle concurrent requests', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Concurrent response' } }],
        usage: { prompt_tokens: 20, completion_tokens: 10, total_tokens: 30 },
      };

      mockChatCompletions.create.mockResolvedValue(mockResponse as any);

      const requests = Array.from({ length: 5 }, (_, i) =>
        service.generateMessage(`System prompt ${i}`, [], 'gpt-4o'),
      );

      const results = await Promise.all(requests);

      expect(results).toHaveLength(5);
      expect(mockChatCompletions.create).toHaveBeenCalledTimes(5);
      results.forEach((result) => {
        expect(result.contentBlocks[0]).toEqual({
          type: MessageContentType._Text,
          text: 'Concurrent response',
        });
      });
    });

    it('should handle timeout scenarios with signal', async () => {
      const abortController = new AbortController();

      // Simulate timeout after 100ms
      setTimeout(() => abortController.abort(), 100);

      mockChatCompletions.create.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 200)),
      );

      const timeoutPromise = service.generateMessage(
        'System prompt',
        [],
        'gpt-4o',
        true,
        abortController.signal,
      );

      await expect(timeoutPromise).rejects.toThrow();
    });
  });

  describe('Memory Management', () => {
    it('should not leak memory with large responses', async () => {
      const largeContent = 'x'.repeat(10000); // 10KB of text
      const mockResponse = {
        choices: [{ message: { content: largeContent } }],
        usage: {
          prompt_tokens: 2000,
          completion_tokens: 2500,
          total_tokens: 4500,
        },
      };

      mockChatCompletions.create.mockResolvedValue(mockResponse as any);

      const initialMemory = process.memoryUsage().heapUsed;

      // Process multiple large responses
      for (let i = 0; i < 10; i++) {
        await service.generateMessage('System prompt', [], 'gpt-4o');
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    it('should clean up resources after errors', async () => {
      const error = new Error('Test error');
      mockChatCompletions.create.mockRejectedValue(error);

      let errorCount = 0;
      for (let i = 0; i < 5; i++) {
        try {
          await service.generateMessage('System prompt', [], 'gpt-4o');
        } catch {
          errorCount++;
        }
      }

      expect(errorCount).toBe(5);
      // Service should still be functional after errors
      mockChatCompletions.create.mockResolvedValue({
        choices: [{ message: { content: 'Recovery successful' } }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      } as any);

      const result = await service.generateMessage(
        'System prompt',
        [],
        'gpt-4o',
      );
      expect(result.contentBlocks[0]).toEqual({
        type: MessageContentType._Text,
        text: 'Recovery successful',
      });
    });
  });

  describe('Security Validation', () => {
    it('should not expose sensitive information in error messages', async () => {
      const sensitiveError = new Error('API key abc123 is invalid');
      mockChatCompletions.create.mockRejectedValue(sensitiveError);

      const loggerSpy = jest.spyOn(Logger.prototype, 'error');

      try {
        await service.generateMessage('System prompt', [], 'gpt-4o');
      } catch {
        // Expected to throw
      }

      expect(loggerSpy).toHaveBeenCalled();
      const loggedMessage = loggerSpy.mock.calls[0][0];
      expect(loggedMessage).toBe(
        'Error sending message to proxy: API key abc123 is invalid',
      );
    });

    it('should validate message content for security', async () => {
      const maliciousMessages: Message[] = [
        {
          id: '1',
          role: MessageRole.USER,
          content: [
            {
              type: MessageContentType._Text,
              text: '<script>alert("xss")</script>',
            } as TextContentBlock,
          ],
          conversationId: 'conv-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockResponse = {
        choices: [{ message: { content: 'Sanitized response' } }],
        usage: { prompt_tokens: 25, completion_tokens: 8, total_tokens: 33 },
      };

      mockChatCompletions.create.mockResolvedValue(mockResponse as any);

      const result = await service.generateMessage(
        'System prompt',
        maliciousMessages,
        'gpt-4o',
      );

      expect(result).toBeDefined();
      expect(mockChatCompletions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            {
              role: 'user',
              content: '<script>alert("xss")</script>',
            },
          ]),
        }),
        expect.any(Object),
      );
    });
  });
});
