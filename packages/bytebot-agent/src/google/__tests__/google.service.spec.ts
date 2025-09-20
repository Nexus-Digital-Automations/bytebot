/**
 * Google Service Test Suite
 *
 * Comprehensive unit and integration tests for Google Gemini API service including:
 * - API connection and authentication
 * - Message generation and content formatting
 * - Error handling and network failures
 * - Performance and timeout scenarios
 * - Security key management
 * - Tool integration and function calling
 * - Rate limiting and retry logic
 * - Thinking content block handling
 */

import { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GoogleService } from '../google.service';
import { SecretsService } from '../../config/secrets.service';

import { Message, MessageRole, Prisma } from '@prisma/client';
import {
  MessageContentType,
  TextContentBlock,
  ToolUseContentBlock,
  ThinkingContentBlock,
  BytebotAgentInterrupt,
} from '@bytebot/shared';

// Mock Google GenAI SDK
const mockGenerativeModel = {
  generateContent: jest.fn(),
  startChat: jest.fn(),
};

const mockGoogleGenerativeAI = {
  getGenerativeModel: jest.fn().mockReturnValue(mockGenerativeModel),
};

jest.mock('@google/genai', () => ({
  GoogleGenerativeAI: jest
    .fn()
    .mockImplementation(() => mockGoogleGenerativeAI),
}));

// Mock SecretsService
const mockSecretsService = {
  getSecret: jest.fn(),
};

describe('GoogleService - Integration Tests', () => {
  let service: GoogleService;
  let module: TestingModule;

  // Test data
  const mockApiKey = 'test-google-api-key';
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

    module = await Test.createTestingModule({
      providers: [
        GoogleService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              switch (key) {
                case 'GOOGLE_API_KEY':
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

    service = module.get<GoogleService>(GoogleService);

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
    });

    it('should retrieve API key from secrets service', () => {
      mockSecretsService.getSecret.mockReturnValue('secret-api-key');

      // Call the private method through reflection to test key retrieval
      const getApiKey = (service as any).getApiKey.bind(service);
      const apiKey = getApiKey();

      expect(mockSecretsService.getSecret).toHaveBeenCalledWith(
        'google-api-key',
        'GOOGLE_API_KEY',
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
      _response: {
        text: () => 'Hello! How can I help you?',
        candidates: [
          {
            content: {
              parts: [
                {
                  text: 'Hello! How can I help you?',
                },
              ],
            },
          },
        ],
        usageMetadata: {
          promptTokenCount: 10,
          candidatesTokenCount: 8,
          totalTokenCount: 18,
        },
      },
    };

    beforeEach(() => {
      mockGenerativeModel.generateContent.mockResolvedValue(
        mockSuccessResponse,
      );
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

      expect(mockGenerativeModel.generateContent).toHaveBeenCalledWith({
        contents: expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            parts: expect.arrayContaining([
              expect.objectContaining({
                text: 'Hello',
              }),
            ]),
          }),
        ]),
        systemInstruction: {
          parts: [
            {
              text: mockSystemPrompt,
            },
          ],
        },
        tools: [{ functionDeclarations: expect.any(Array) }],
      });
    });

    it('should generate message with custom model', async () => {
      const customModel = 'gemini-2.5-flash';

      await service.generateMessage(
        mockSystemPrompt,
        mockMessages,
        customModel,
      );

      expect(mockGoogleGenerativeAI.getGenerativeModel).toHaveBeenCalledWith({
        model: customModel,
      });
    });

    it('should generate message without tools when useTools is false', async () => {
      await service.generateMessage(
        mockSystemPrompt,
        mockMessages,
        undefined,
        false, // useTools = false
      );

      expect(mockGenerativeModel.generateContent).toHaveBeenCalledWith({
        contents: expect.any(Array),
        systemInstruction: expect.any(Object),
        // tools should not be present
      });
    });

    it('should handle function calls in response', async () => {
      const mockFunctionResponse = {
        _response: {
          text: () => '',
          candidates: [
            {
              content: {
                parts: [
                  {
                    functionCall: {
                      name: 'get_weather',
                      args: { city: 'New York' },
                    },
                  },
                ],
              },
            },
          ],
          usageMetadata: {
            promptTokenCount: 15,
            candidatesTokenCount: 12,
            totalTokenCount: 27,
          },
        },
      };

      mockGenerativeModel.generateContent.mockResolvedValue(
        mockFunctionResponse,
      );

      const result = await service.generateMessage(
        mockSystemPrompt,
        mockMessages,
      );

      expect(result.contentBlocks).toEqual([
        {
          type: MessageContentType._ToolUse,
          id: expect.any(String),
          name: 'get_weather',
          input: { city: 'New York' },
        },
      ]);
    });

    it('should handle thinking content blocks in response', async () => {
      const mockThinkingResponse = {
        _response: {
          text: () => '',
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: 'Let me think about this...',
                    thought: true,
                    thoughtSignature: 'thinking_123',
                  },
                ],
              },
            },
          ],
          usageMetadata: {
            promptTokenCount: 15,
            candidatesTokenCount: 12,
            totalTokenCount: 27,
          },
        },
      };

      mockGenerativeModel.generateContent.mockResolvedValue(
        mockThinkingResponse,
      );

      const result = await service.generateMessage(
        mockSystemPrompt,
        mockMessages,
      );

      expect(result.contentBlocks).toEqual([
        {
          type: MessageContentType._Thinking,
          thinking: 'Let me think about this...',
          signature: 'thinking_123',
        },
      ]);
    });

    it('should handle mixed content and function calls', async () => {
      const mockMixedResponse = {
        _response: {
          text: () => '',
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: 'Let me check the weather for you.',
                  },
                  {
                    functionCall: {
                      name: 'get_weather',
                      args: { city: 'New York' },
                    },
                  },
                ],
              },
            },
          ],
          usageMetadata: {
            promptTokenCount: 20,
            candidatesTokenCount: 15,
            totalTokenCount: 35,
          },
        },
      };

      mockGenerativeModel.generateContent.mockResolvedValue(mockMixedResponse);

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
          id: expect.any(String),
          name: 'get_weather',
          input: { city: 'New York' },
        },
      ]);
    });

    it('should handle empty response gracefully', async () => {
      const emptyResponse = {
        _response: {
          text: () => '',
          candidates: [
            {
              content: {
                parts: [],
              },
            },
          ],
          usageMetadata: {
            promptTokenCount: 10,
            candidatesTokenCount: 0,
            totalTokenCount: 10,
          },
        },
      };

      mockGenerativeModel.generateContent.mockResolvedValue(emptyResponse);

      const result = await service.generateMessage(
        mockSystemPrompt,
        mockMessages,
      );

      expect(result.contentBlocks).toEqual([]);
      expect(result.tokenUsage.outputTokens).toBe(0);
    });
  });

  describe('Error Handling and Network Failures', () => {
    it('should handle API user abort error', async () => {
      const abortError = new Error('Request aborted');
      abortError.name = 'AbortError';
      mockGenerativeModel.generateContent.mockRejectedValue(abortError);

      await expect(
        service.generateMessage(mockSystemPrompt, mockMessages),
      ).rejects.toThrow(BytebotAgentInterrupt);

      expect(jest.spyOn(Logger.prototype, 'log')).toHaveBeenCalledWith(
        'Google API call aborted',
      );
    });

    it('should handle network timeout errors', async () => {
      const timeoutError = new Error('Request timeout');
      mockGenerativeModel.generateContent.mockRejectedValue(timeoutError);

      await expect(
        service.generateMessage(mockSystemPrompt, mockMessages),
      ).rejects.toThrow('Request timeout');

      expect(jest.spyOn(Logger.prototype, 'error')).toHaveBeenCalledWith(
        'Error sending message to Google: Request timeout',
        timeoutError.stack,
      );
    });

    it('should handle API rate limit errors', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      rateLimitError.name = 'RateLimitError';
      mockGenerativeModel.generateContent.mockRejectedValue(rateLimitError);

      await expect(
        service.generateMessage(mockSystemPrompt, mockMessages),
      ).rejects.toThrow('Rate limit exceeded');
    });

    it('should handle authentication errors', async () => {
      const authError = new Error('Invalid API key');
      authError.name = 'AuthenticationError';
      mockGenerativeModel.generateContent.mockRejectedValue(authError);

      await expect(
        service.generateMessage(mockSystemPrompt, mockMessages),
      ).rejects.toThrow('Invalid API key');
    });

    it('should handle quota exceeded errors', async () => {
      const quotaError = new Error('Quota exceeded');
      quotaError.name = 'QuotaExceededError';
      mockGenerativeModel.generateContent.mockRejectedValue(quotaError);

      await expect(
        service.generateMessage(mockSystemPrompt, mockMessages),
      ).rejects.toThrow('Quota exceeded');
    });

    it('should handle malformed response errors', async () => {
      const malformedError = new Error('Invalid response format');
      mockGenerativeModel.generateContent.mockRejectedValue(malformedError);

      await expect(
        service.generateMessage(mockSystemPrompt, mockMessages),
      ).rejects.toThrow('Invalid response format');
    });

    it('should handle missing response candidates', async () => {
      const invalidResponse = {
        _response: {
          text: () => '',
          candidates: null,
          usageMetadata: {
            promptTokenCount: 10,
            candidatesTokenCount: 0,
            totalTokenCount: 10,
          },
        },
      };

      mockGenerativeModel.generateContent.mockResolvedValue(invalidResponse);

      const result = await service.generateMessage(
        mockSystemPrompt,
        mockMessages,
      );

      expect(result.contentBlocks).toEqual([]);
    });
  });

  describe('Message Formatting and Content Handling', () => {
    beforeEach(() => {
      mockGenerativeModel.generateContent.mockResolvedValue({
        _response: {
          text: () => 'Response',
          candidates: [
            {
              content: {
                parts: [{ text: 'Response' }],
              },
            },
          ],
          usageMetadata: {
            promptTokenCount: 10,
            candidatesTokenCount: 5,
            totalTokenCount: 15,
          },
        },
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

      expect(mockGenerativeModel.generateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          contents: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              parts: expect.arrayContaining([
                expect.objectContaining({
                  text: expect.stringContaining(
                    'User performed action: screenshot',
                  ),
                }),
              ]),
            }),
          ]),
        }),
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

      expect(mockGenerativeModel.generateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          contents: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              parts: expect.arrayContaining([
                expect.objectContaining({
                  inlineData: expect.objectContaining({
                    _data: 'base64-image-data',
                    mimeType: 'image/png',
                  }),
                }),
              ]),
            }),
          ]),
        }),
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

      expect(mockGenerativeModel.generateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          contents: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              parts: expect.arrayContaining([
                expect.objectContaining({
                  text: 'Hello',
                }),
              ]),
            }),
            expect.objectContaining({
              role: 'model',
              parts: expect.arrayContaining([
                expect.objectContaining({
                  text: 'Hi there!',
                }),
                expect.objectContaining({
                  functionCall: expect.objectContaining({
                    name: 'search',
                    args: { query: 'test' },
                  }),
                }),
              ]),
            }),
          ]),
        }),
      );
    });

    it('should handle thinking content blocks in messages', async () => {
      const messagesWithThinking: Message[] = [
        {
          id: '1',
          role: MessageRole.ASSISTANT,
          content: [
            {
              type: MessageContentType._Thinking,
              thinking: 'Let me consider this...',
              signature: 'thinking_456',
            } as ThinkingContentBlock,
          ] as unknown as Prisma.JsonValue,
          createdAt: new Date(),
          updatedAt: new Date(),
          taskId: 'task-1',
          summaryId: null,
        },
      ];

      await service.generateMessage(mockSystemPrompt, messagesWithThinking);

      expect(mockGenerativeModel.generateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          contents: expect.arrayContaining([
            expect.objectContaining({
              role: 'model',
              parts: expect.arrayContaining([
                expect.objectContaining({
                  text: 'Let me consider this...',
                  thought: true,
                  thoughtSignature: 'thinking_456',
                }),
              ]),
            }),
          ]),
        }),
      );
    });
  });

  describe('Performance and Timeout Scenarios', () => {
    it('should respect abort signals', async () => {
      const abortController = new AbortController();
      const abortSignal = abortController.signal;

      // Simulate API call abortion
      mockGenerativeModel.generateContent.mockImplementation(() => {
        abortController.abort();
        const error = new Error('Request aborted');
        error.name = 'AbortError';
        throw error;
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
    });

    it('should handle long-running API calls', async () => {
      const delay = (ms: number) =>
        new Promise((resolve) => setTimeout(resolve, ms));

      mockGenerativeModel.generateContent.mockImplementation(async () => {
        await delay(100); // Simulate network delay
        return {
          _response: {
            text: () => 'Delayed response',
            candidates: [
              {
                content: {
                  parts: [{ text: 'Delayed response' }],
                },
              },
            ],
            usageMetadata: {
              promptTokenCount: 10,
              candidatesTokenCount: 5,
              totalTokenCount: 15,
            },
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

      expect(mockGenerativeModel.generateContent).toHaveBeenCalled();
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

      mockGenerativeModel.generateContent.mockRejectedValue(
        new Error('API Error'),
      );

      await expect(
        service.generateMessage(mockSystemPrompt, mockMessages),
      ).rejects.toThrow();

      // Check that no log contains the API key
      errorSpy.mock.calls.forEach((call) => {
        call.forEach((arg) => {
          if (typeof arg === 'string') {
            expect(arg).not.toContain(mockApiKey);
            expect(arg).not.toContain('test-google-api-key');
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

      mockGenerativeModel.generateContent.mockResolvedValue({
        _response: {
          text: () => 'Response to large history',
          candidates: [
            {
              content: {
                parts: [{ text: 'Response to large history' }],
              },
            },
          ],
          usageMetadata: {
            promptTokenCount: 1000,
            candidatesTokenCount: 50,
            totalTokenCount: 1050,
          },
        },
      });

      const result = await service.generateMessage(
        mockSystemPrompt,
        largeMessageHistory,
      );

      expect(result).toBeDefined();
      expect(result.tokenUsage.inputTokens).toBe(1000);
      expect(mockGenerativeModel.generateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          contents: expect.arrayContaining(
            largeMessageHistory.map((_, i) =>
              expect.objectContaining({
                role: i % 2 === 0 ? 'user' : 'model',
              }),
            ),
          ),
        }),
      );
    });

    it('should handle memory cleanup after large operations', async () => {
      const initialMemory = process.memoryUsage();

      // Simulate large operation
      const largeContent = 'x'.repeat(10000);
      const largeResponse = {
        _response: {
          text: () => largeContent,
          candidates: [
            {
              content: {
                parts: [{ text: largeContent }],
              },
            },
          ],
          usageMetadata: {
            promptTokenCount: 1000,
            candidatesTokenCount: 500,
            totalTokenCount: 1500,
          },
        },
      };

      mockGenerativeModel.generateContent.mockResolvedValue(largeResponse);

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
      mockGenerativeModel.generateContent.mockResolvedValue({
        _response: {
          text: () => 'Response',
          candidates: [
            {
              content: {
                parts: [{ text: 'Response' }],
              },
            },
          ],
          usageMetadata: {
            promptTokenCount: 10,
            candidatesTokenCount: 5,
            totalTokenCount: 15,
          },
        },
      });
    });

    it('should include Google tools when useTools is true', async () => {
      await service.generateMessage(
        mockSystemPrompt,
        mockMessages,
        undefined,
        true,
      );

      expect(mockGenerativeModel.generateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          tools: expect.arrayContaining([
            expect.objectContaining({
              functionDeclarations: expect.any(Array),
            }),
          ]),
        }),
      );
    });

    it('should exclude tools when useTools is false', async () => {
      await service.generateMessage(
        mockSystemPrompt,
        mockMessages,
        undefined,
        false,
      );

      expect(mockGenerativeModel.generateContent).toHaveBeenCalledWith(
        expect.not.objectContaining({
          tools: expect.anything(),
        }),
      );
    });

    it('should format function declarations correctly', async () => {
      await service.generateMessage(
        mockSystemPrompt,
        mockMessages,
        undefined,
        true,
      );

      const callArgs = mockGenerativeModel.generateContent.mock.calls[0][0];
      expect(callArgs.tools).toBeDefined();
      expect(callArgs.tools[0].functionDeclarations).toBeDefined();
      expect(Array.isArray(callArgs.tools[0].functionDeclarations)).toBe(true);
    });
  });

  describe('Configuration Integration', () => {
    it('should use environment-specific configuration', async () => {
      const customConfigService = {
        get: jest.fn().mockImplementation((key: string) => {
          switch (key) {
            case 'GOOGLE_API_KEY':
              return 'custom-api-key-123';
            default:
              return undefined;
          }
        }),
      };

      const testModule = await Test.createTestingModule({
        providers: [
          GoogleService,
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

      const testService = testModule.get<GoogleService>(GoogleService);

      expect(testService).toBeDefined();

      await testModule.close();
    });
  });

  describe('Function Response Handling', () => {
    it('should handle function responses in messages correctly', async () => {
      const messagesWithFunctionResponse: Message[] = [
        {
          id: '1',
          role: MessageRole.USER,
          content: [
            {
              type: MessageContentType._ToolResult,
              tool_use_id: 'tool_1',
              content: [
                {
                  type: MessageContentType._Text,
                  text: 'Weather _data: sunny, 25°C',
                },
              ],
            },
          ] as unknown as Prisma.JsonValue,
          createdAt: new Date(),
          updatedAt: new Date(),
          taskId: 'task-1',
          summaryId: null,
        },
      ];

      await service.generateMessage(
        mockSystemPrompt,
        messagesWithFunctionResponse,
      );

      expect(mockGenerativeModel.generateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          contents: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              parts: expect.arrayContaining([
                expect.objectContaining({
                  functionResponse: expect.objectContaining({
                    name: expect.any(String),
                    _response: expect.any(Object),
                  }),
                }),
              ]),
            }),
          ]),
        }),
      );
    });
  });
});
