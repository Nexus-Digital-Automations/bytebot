import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SecretsService } from '../config/secrets.service';
import {
  isComputerToolUseContentBlock,
  isImageContentBlock,
  isUserActionContentBlock,
  MessageContentBlock,
  MessageContentType,
  TextContentBlock,
  ThinkingContentBlock,
  ToolUseContentBlock,
} from '@bytebot/shared';
import {
  BytebotAgentService,
  BytebotAgentInterrupt,
  BytebotAgentResponse,
} from '../agent/agent.types';
import { Message, MessageRole } from '@prisma/client';
import { googleTools } from './google.tools';
import {
  Content,
  GenerateContentResponse,
  GoogleGenAI,
  Part,
} from '@google/genai';

// Enhanced type definitions for better type safety
interface GoogleApiError extends Error {
  code?: string;
  status?: number;
  details?: unknown;
}

// Type guards for Google API responses
interface ValidatedGenerateContentResponse extends GenerateContentResponse {
  candidates: Array<{
    content: {
      parts: Part[];
    };
  }>;
}

// Enhanced Part interface for our specific use cases
interface ExtendedPart extends Part {
  text?: string;
  thought?: boolean;
  thoughtSignature?: string;
  functionCall?: {
    id: string;
    name: string;
    args: Record<string, unknown>;
  };
  functionResponse?: {
    id: string;
    name: string;
    response: Record<string, unknown>;
  };
  inlineData?: {
    data: string;
    mimeType: string;
  };
}
import { DEFAULT_MODEL } from './google.constants';

// Simple ID generator to avoid TypeScript strict mode issues
const generateId = (): string => {
  return `generated-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

@Injectable()
export class GoogleService implements BytebotAgentService {
  private google: GoogleGenAI;
  private readonly logger = new Logger(GoogleService.name);
  private currentApiKey = 'dummy-key-for-initialization';

  constructor(
    private readonly configService: ConfigService,
    private readonly secretsService: SecretsService,
  ) {
    // Initialize with dummy key - actual key will be loaded dynamically
    this.google = new GoogleGenAI({
      apiKey: this.currentApiKey,
    });
  }

  /**
   * Get Google Gemini API key securely from secrets management
   * @private
   * @throws {GoogleApiError} When API key is not found or retrieval fails
   */
  private getApiKey(): string {
    const operationId = `get-gemini-key-${Date.now()}`;

    try {
      // Try to get from secrets service first (Kubernetes secrets)
      const secretKey = this.secretsService.getSecret(
        'gemini-api-key',
        'GEMINI_API_KEY',
      );

      if (secretKey) {
        this.logger.debug(
          `[${operationId}] API key retrieved from secrets service`,
        );
        return secretKey;
      }

      // Fallback to configuration service (environment variables)
      const configKey = this.configService.get<string>('GEMINI_API_KEY');

      if (configKey) {
        this.logger.debug(
          `[${operationId}] API key retrieved from configuration`,
        );
        return configKey;
      }

      this.logger.error(
        `[${operationId}] GEMINI_API_KEY not found in secrets or configuration`,
      );
      const error = new Error(
        'GEMINI_API_KEY is not configured',
      ) as GoogleApiError;
      error.code = 'MISSING_API_KEY';
      throw error;
    } catch (error) {
      this.logger.error(`[${operationId}] Failed to retrieve Gemini API key`, {
        error: error instanceof Error ? error.message : String(error),
      });
      if (error instanceof Error) {
        const googleError = error as GoogleApiError;
        googleError.code = googleError.code || 'API_KEY_RETRIEVAL_ERROR';
        throw googleError;
      }
      throw error;
    }
  }

  async generateMessage(
    systemPrompt: string,
    messages: Message[],
    model: string = DEFAULT_MODEL.name,
    useTools: boolean = true,
    signal?: AbortSignal,
  ): Promise<BytebotAgentResponse> {
    // Ensure we have a valid API key before proceeding
    const apiKey = this.getApiKey();

    // Update Google client with actual API key if needed
    // Note: GoogleGenAI client requires recreation for API key changes
    if (this.currentApiKey === 'dummy-key-for-initialization') {
      // Recreate client with actual API key
      this.currentApiKey = apiKey;
      this.google = new GoogleGenAI({
        apiKey: apiKey,
      });
    }

    try {
      const maxTokens = 8192;

      // Convert our message content blocks to Anthropic's expected format
      const googleMessages = this.formatMessagesForGoogle(messages);

      const response: GenerateContentResponse =
        await this.google.models.generateContent({
          model,
          contents: googleMessages,
          config: {
            thinkingConfig: {
              thinkingBudget: 24576,
            },
            maxOutputTokens: maxTokens,
            systemInstruction: systemPrompt,
            tools: useTools
              ? [
                  {
                    functionDeclarations: googleTools,
                  },
                ]
              : [],
            abortSignal: signal,
          },
        });

      // Validate response structure
      if (!this.isValidGenerateContentResponse(response)) {
        const error = new Error(
          'Invalid response structure from Google Gemini API',
        ) as GoogleApiError;
        error.code = 'INVALID_API_RESPONSE';
        throw error;
      }

      const candidate = response.candidates[0]; // We've validated this exists
      const content = candidate.content;
      const parts = content.parts;

      return {
        contentBlocks: this.formatGoogleResponse(parts),
        tokenUsage: {
          inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
          outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
          totalTokens: response.usageMetadata?.totalTokenCount ?? 0,
        },
      };
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('AbortError')) {
        throw new BytebotAgentInterrupt();
      }

      let googleError: GoogleApiError;
      if (error instanceof Error) {
        googleError = error as GoogleApiError;
        googleError.code = googleError.code || 'GENERATION_ERROR';
      } else {
        const errorMessage = (() => {
          if (typeof error === 'string') return error;
          if (error instanceof Error) return error.message;
          try {
            return JSON.stringify(error);
          } catch {
            return '[Unserializable Error]';
          }
        })();
        googleError = new Error(errorMessage) as GoogleApiError;
        googleError.code = 'UNKNOWN_ERROR';
      }

      this.logger.error(
        `Error sending message to Google Gemini: ${googleError.message}`,
        {
          code: googleError.code,
          stack: googleError.stack,
          details: googleError.details,
        },
      );
      throw googleError;
    }
  }

  /**
   * Convert our MessageContentBlock format to Google Gemini's message format
   */
  private formatMessagesForGoogle(messages: Message[]): Content[] {
    const googleMessages: Content[] = [];

    // Process each message content block
    for (const message of messages) {
      const messageContentBlocks = message.content as MessageContentBlock[];

      const parts: Part[] = [];

      if (
        messageContentBlocks.every((block) => isUserActionContentBlock(block))
      ) {
        const userActionContentBlocks = messageContentBlocks.flatMap(
          (block) => block.content,
        );
        for (const block of userActionContentBlocks) {
          if (isComputerToolUseContentBlock(block)) {
            parts.push({
              text: `User performed action: ${block.name}\n${JSON.stringify(block.input, null, 2)}`,
            });
          } else if (isImageContentBlock(block)) {
            parts.push({
              inlineData: {
                data: block.source.data,
                mimeType: block.source.media_type,
              },
            });
          }
        }
      } else {
        for (const block of messageContentBlocks) {
          switch (block.type) {
            case MessageContentType.Text:
              parts.push({
                text: block.text,
              });
              break;
            case MessageContentType.ToolUse:
              parts.push({
                functionCall: {
                  id: block.id,
                  name: block.name,
                  args: block.input,
                },
              });
              break;
            case MessageContentType.Image:
              parts.push({
                inlineData: {
                  data: block.source.data,
                  mimeType: block.source.media_type,
                },
              });
              break;
            case MessageContentType.ToolResult: {
              const toolResultContentBlock = block.content[0];
              if (toolResultContentBlock.type === MessageContentType.Image) {
                parts.push({
                  functionResponse: {
                    id: block.tool_use_id,
                    name: 'screenshot',
                    response: {
                      ...(!block.is_error && {
                        output: 'screenshot successful',
                      }),
                      ...(block.is_error && { error: block.content[0] }),
                    },
                  },
                });
                parts.push({
                  inlineData: {
                    data: toolResultContentBlock.source.data,
                    mimeType: toolResultContentBlock.source.media_type,
                  },
                });
                break;
              }

              parts.push({
                functionResponse: {
                  id: block.tool_use_id,
                  name: this.getToolName(block.tool_use_id, messages),
                  response: {
                    ...(!block.is_error && { output: block.content[0] }),
                    ...(block.is_error && { error: block.content[0] }),
                  },
                },
              });
              break;
            }
            case MessageContentType.Thinking:
              parts.push({
                text: block.thinking,
                thoughtSignature: block.signature,
                thought: true,
              });
              break;
            default:
              parts.push({
                text: JSON.stringify(block),
              });
              break;
          }
        }
      }

      googleMessages.push({
        role: message.role === MessageRole.USER ? 'user' : 'model',
        parts: parts,
      });
    }

    return googleMessages;
  }

  /**
   * Find the content block with the tool_use_id and return the tool name
   * @private
   */
  private getToolName(tool_use_id: string, messages: Message[]): string {
    const toolMessage = messages.find((message) => {
      const contentBlocks = message.content as MessageContentBlock[];
      return contentBlocks.some(
        (block) =>
          block.type === MessageContentType.ToolUse && block.id === tool_use_id,
      );
    });

    if (!toolMessage) {
      this.logger.warn(
        `Tool message not found for tool_use_id: ${tool_use_id}`,
      );
      return 'unknown_tool';
    }

    const toolBlock = (toolMessage.content as MessageContentBlock[]).find(
      (block) =>
        block.type === MessageContentType.ToolUse && block.id === tool_use_id,
    ) as ToolUseContentBlock | undefined;

    if (!toolBlock) {
      this.logger.warn(`Tool block not found for tool_use_id: ${tool_use_id}`);
      return 'unknown_tool';
    }

    return toolBlock.name;
  }

  /**
   * Type guard to validate Google API response structure
   * @private
   */
  private isValidGenerateContentResponse(
    response: GenerateContentResponse,
  ): response is ValidatedGenerateContentResponse {
    return (
      Array.isArray(response.candidates) &&
      response.candidates.length > 0 &&
      Boolean(response.candidates[0]?.content?.parts) &&
      Array.isArray(response.candidates[0]?.content?.parts)
    );
  }

  /**
   * Convert Google Gemini's response content to our MessageContentBlock format
   * @private
   */
  private formatGoogleResponse(parts: Part[]): MessageContentBlock[] {
    return parts.map((part) => {
      const extendedPart = part as ExtendedPart;

      // Handle text content
      if (extendedPart.text && !extendedPart.thought) {
        return {
          type: MessageContentType.Text,
          text: extendedPart.text,
        } as TextContentBlock;
      }

      // Handle thinking content
      if (extendedPart.thought && extendedPart.text) {
        return {
          type: MessageContentType.Thinking,
          signature: extendedPart.thoughtSignature ?? '',
          thinking: extendedPart.text,
        } as ThinkingContentBlock;
      }

      // Handle function calls
      if (extendedPart.functionCall) {
        return {
          type: MessageContentType.ToolUse,
          id: extendedPart.functionCall.id || generateId(),
          name: extendedPart.functionCall.name || 'function_call',
          input: extendedPart.functionCall.args || {},
        } as ToolUseContentBlock;
      }

      // Handle unknown content types with proper logging
      this.logger.warn('Unknown content type from Google API', {
        partKeys: Object.keys(extendedPart),
        partContent: JSON.stringify(extendedPart, null, 2),
      });

      return {
        type: MessageContentType.Text,
        text: JSON.stringify(extendedPart),
      } as TextContentBlock;
    });
  }
}
