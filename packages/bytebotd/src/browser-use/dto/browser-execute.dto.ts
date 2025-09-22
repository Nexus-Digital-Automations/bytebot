import {
  IsString,
  IsOptional,
  IsObject,
  IsArray,
  IsBoolean,
  IsNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for browser automation execution requests
 */
export class BrowserExecuteDto {
  @ApiProperty({
    description: 'The automation script or command to execute',
    example: 'click #submit-button',
  })
  @IsString()
  script: string;

  @ApiPropertyOptional({
    description: 'Session ID for browser context',
    example: 'session_123456789',
  })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({
    description: 'Additional parameters for the execution',
    example: { timeout: 30000, waitForNavigation: true },
  })
  @IsOptional()
  @IsObject()
  parameters?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Whether to capture screenshots during execution',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  captureScreenshots?: boolean;
}

/**
 * Response DTO for browser execution results
 */
export class BrowserExecuteResponseDto {
  @ApiProperty({
    description: 'Whether the execution was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Detailed result data from the execution',
    example: { elementFound: true, value: 'Form submitted' },
  })
  result: any;

  @ApiPropertyOptional({
    description: 'Error message if execution failed',
    example: 'Element not found: #submit-button',
  })
  error?: string;

  @ApiPropertyOptional({
    description: 'Execution timing information',
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
    description: 'Array of screenshot paths if captured',
    example: ['/screenshots/step1.png', '/screenshots/step2.png'],
  })
  screenshots?: string[];

  @ApiProperty({
    description: 'Session ID used for the execution',
    example: 'session_123456789',
  })
  sessionId: string;
}
