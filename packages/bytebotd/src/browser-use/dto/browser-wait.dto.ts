import { IsString, IsOptional, IsObject, IsNumber, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum WaitType {
  ELEMENT = 'element',
  TIMEOUT = 'timeout',
  NETWORK_IDLE = 'networkidle',
  LOAD = 'load',
  CONDITION = 'condition',
}

/**
 * DTO for browser wait operations
 */
export class BrowserWaitDto {
  @ApiProperty({
    description: 'Type of wait operation to perform',
    enum: WaitType,
    example: WaitType.ELEMENT,
  })
  @IsEnum(WaitType)
  type: WaitType;

  @ApiPropertyOptional({
    description: 'CSS selector or element to wait for (required for element type)',
    example: '#submit-button',
  })
  @IsOptional()
  @IsString()
  selector?: string;

  @ApiPropertyOptional({
    description: 'Timeout in milliseconds',
    example: 30000,
  })
  @IsOptional()
  @IsNumber()
  timeout?: number;

  @ApiPropertyOptional({
    description: 'Session ID for browser context',
    example: 'session_123456789',
  })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({
    description: 'Custom condition function (for condition type)',
    example: 'return document.querySelector("#data").textContent.includes("loaded")',
  })
  @IsOptional()
  @IsString()
  condition?: string;

  @ApiPropertyOptional({
    description: 'Additional wait options',
    example: { visible: true, hidden: false },
  })
  @IsOptional()
  @IsObject()
  options?: {
    visible?: boolean;
    hidden?: boolean;
    enabled?: boolean;
    polling?: number;
  };
}

/**
 * Response DTO for wait operation results
 */
export class BrowserWaitResponseDto {
  @ApiProperty({
    description: 'Whether the wait operation was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Type of wait that was performed',
    enum: WaitType,
    example: WaitType.ELEMENT,
  })
  waitType: WaitType;

  @ApiPropertyOptional({
    description: 'Result data from the wait operation',
    example: { elementFound: true, elementText: 'Submit' },
  })
  result?: any;

  @ApiPropertyOptional({
    description: 'Error message if wait failed',
    example: 'Element #submit-button not found within timeout',
  })
  error?: string;

  @ApiPropertyOptional({
    description: 'Wait timing information',
    example: { startTime: 1695123456789, endTime: 1695123459123, duration: 2334 },
  })
  timing?: {
    startTime: number;
    endTime: number;
    duration: number;
    actualWaitTime: number;
  };

  @ApiProperty({
    description: 'Session ID used for the wait operation',
    example: 'session_123456789',
  })
  sessionId: string;
}