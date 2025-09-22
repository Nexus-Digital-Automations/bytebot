import {
  IsString,
  IsOptional,
  IsObject,
  IsEnum,
  IsArray,
  IsNumber,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum InteractionType {
  CLICK = 'click',
  TYPE = 'type',
  SELECT = 'select',
  HOVER = 'hover',
  SCROLL = 'scroll',
  DRAG_AND_DROP = 'dragAndDrop',
  KEYBOARD = 'keyboard',
  FORM_FILL = 'formFill',
}

/**
 * DTO for browser DOM interaction requests
 */
export class BrowserInteractionDto {
  @ApiProperty({
    description: 'Type of interaction to perform',
    enum: InteractionType,
    example: InteractionType.CLICK,
  })
  @IsEnum(InteractionType)
  type: InteractionType;

  @ApiProperty({
    description: 'CSS selector for the target element',
    example: '#submit-button',
  })
  @IsString()
  selector: string;

  @ApiPropertyOptional({
    description: 'Session ID for browser context',
    example: 'session_123456789',
  })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({
    description: 'Value to type or select (for type/select interactions)',
    example: 'Hello World',
  })
  @IsOptional()
  @IsString()
  value?: string;

  @ApiPropertyOptional({
    description: 'Interaction options',
    example: { delay: 100, waitForElement: true },
  })
  @IsOptional()
  @IsObject()
  options?: {
    delay?: number;
    force?: boolean;
    waitForElement?: boolean;
    timeout?: number;
    modifiers?: string[];
    button?: 'left' | 'right' | 'middle';
    clickCount?: number;
    coordinates?: { x: number; y: number };
    scrollDirection?: 'up' | 'down' | 'left' | 'right';
    scrollAmount?: number;
  };

  @ApiPropertyOptional({
    description: 'Form data for form fill interactions',
    example: { name: 'John Doe', email: 'john@example.com' },
  })
  @IsOptional()
  @IsObject()
  formData?: Record<string, string>;

  @ApiPropertyOptional({
    description: 'Target selector for drag and drop operations',
    example: '#drop-zone',
  })
  @IsOptional()
  @IsString()
  targetSelector?: string;

  @ApiPropertyOptional({
    description: 'Whether to capture a screenshot after interaction',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  captureScreenshot?: boolean;
}

/**
 * Response DTO for interaction results
 */
export class BrowserInteractionResponseDto {
  @ApiProperty({
    description: 'Whether the interaction was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Type of interaction that was performed',
    enum: InteractionType,
    example: InteractionType.CLICK,
  })
  interactionType: InteractionType;

  @ApiPropertyOptional({
    description: 'Result data from the interaction',
    example: { elementFound: true, clicked: true, newValue: 'Hello World' },
  })
  result?: any;

  @ApiPropertyOptional({
    description: 'Error message if interaction failed',
    example: 'Element not found: #submit-button',
  })
  error?: string;

  @ApiPropertyOptional({
    description: 'Element information that was interacted with',
    example: {
      tagName: 'BUTTON',
      text: 'Submit',
      attributes: { id: 'submit-button', class: 'btn btn-primary' },
      boundingBox: { x: 100, y: 200, width: 80, height: 32 },
    },
  })
  elementInfo?: {
    tagName: string;
    text?: string;
    attributes: Record<string, string>;
    boundingBox?: { x: number; y: number; width: number; height: number };
  };

  @ApiPropertyOptional({
    description: 'Interaction timing information',
    example: {
      startTime: 1695123456789,
      endTime: 1695123459123,
      duration: 2334,
    },
  })
  timing?: {
    startTime: number;
    endTime: number;
    duration: number;
  };

  @ApiPropertyOptional({
    description: 'Screenshot path if captured',
    example: '/screenshots/interaction_result.png',
  })
  screenshot?: string;

  @ApiProperty({
    description: 'Session ID used for the interaction',
    example: 'session_123456789',
  })
  sessionId: string;
}
