import {
  Controller,
  Post,
  Body,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ComputerUseService } from './computer-use.service';
import { ComputerActionValidationPipe } from './dto/computer-action-validation.pipe';
import { ComputerActionDto } from './dto/computer-action.dto';

// Define interfaces for proper error handling
interface ErrorWithMessage {
  message: string;
}

interface ErrorWithStack extends ErrorWithMessage {
  stack?: string;
}

// Type guard to check if an unknown error has a message property
function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  );
}

// Type guard to check if an error has a stack property
function isErrorWithStack(error: unknown): error is ErrorWithStack {
  return (
    isErrorWithMessage(error) &&
    'stack' in error &&
    (typeof (error as Record<string, unknown>).stack === 'string' ||
      (error as Record<string, unknown>).stack === undefined)
  );
}

// Extract error message safely from unknown error
function getErrorMessage(error: unknown): string {
  if (isErrorWithMessage(error)) return error.message;
  return typeof error === 'string' ? error : JSON.stringify(error);
}

// Extract error stack safely from unknown error
function getErrorStack(error: unknown): string | undefined {
  if (isErrorWithStack(error)) return error.stack;
  return undefined;
}

// Define union type for all possible computer action response types
type ComputerActionResponse =
  | void
  | { image: string }
  | { x: number; y: number }
  | { success: boolean; message: string }
  | {
      success: boolean;
      data?: string;
      name?: string;
      size?: number;
      mediaType?: string;
      message?: string;
    }
  | {
      text: string;
      confidence: number;
      boundingBoxes?: Array<any>;
      processingTimeMs: number;
      method: string;
    }
  | {
      found: boolean;
      matches: Array<{
        text: string;
        x: number;
        y: number;
        width: number;
        height: number;
        confidence: number;
      }>;
      processingTimeMs: number;
    }
  | {
      image: string;
      ocr?: any;
      textDetection?: any;
      processingTimeMs: number;
      enhancementsApplied: string[];
    };

/**
 * Computer Use Controller - Handles HTTP requests for computer automation actions
 *
 * This controller provides a REST API endpoint for executing various computer automation
 * actions such as mouse movements, keyboard input, screenshots, file operations, and
 * advanced vision-based operations like OCR and text finding.
 *
 * Dependencies: ComputerUseService for action execution
 * Security: Uses validation pipe for request sanitization
 */
@Controller('computer-use')
export class ComputerUseController {
  private readonly logger = new Logger(ComputerUseController.name);

  constructor(private readonly computerUseService: ComputerUseService) {}

  /**
   * Execute a computer action with comprehensive error handling and logging
   *
   * Supports all computer automation actions including:
   * - Mouse operations (move, click, drag, scroll)
   * - Keyboard operations (type, press keys)
   * - Application control (launch, focus)
   * - File operations (read, write)
   * - Vision operations (screenshot, OCR, text finding)
   *
   * @param params - Validated computer action parameters
   * @returns Promise<ComputerActionResponse> - Response varies by action type
   * @throws HttpException - On action execution failure with detailed error info
   */
  @Post()
  async action(
    @Body(new ComputerActionValidationPipe()) params: ComputerActionDto,
  ): Promise<ComputerActionResponse> {
    // Generate unique operation ID for tracking this action request
    const operationId = `action_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    try {
      // Create a safe copy for logging (avoid logging sensitive base64 data)
      const paramsCopy = { ...params };
      if (paramsCopy.action === 'write_file') {
        paramsCopy.data = 'base64 data';
      }

      this.logger.log(
        `[${operationId}] Computer action request: ${JSON.stringify(paramsCopy)}`,
        { operationId, action: params.action },
      );

      // Execute the computer action through the service
      // Cast to ComputerActionResponse since we know the service returns proper typed responses
      const result = (await this.computerUseService.action(
        params,
      )) as ComputerActionResponse;

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `[${operationId}] Computer action completed successfully (${processingTime}ms)`,
        { operationId, action: params.action, processingTime },
      );

      return result;
    } catch (error: unknown) {
      const processingTime = Date.now() - startTime;
      const errorMessage = getErrorMessage(error);
      const errorStack = getErrorStack(error);

      // Log the error with comprehensive context for debugging
      this.logger.error(
        `[${operationId}] Error executing computer action: ${errorMessage} (${processingTime}ms)`,
        errorStack,
        {
          operationId,
          action: params.action,
          processingTime,
          errorType: error?.constructor?.name || 'Unknown',
        },
      );

      // Throw HTTP exception with safe error message for client
      throw new HttpException(
        `Failed to execute computer action: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
