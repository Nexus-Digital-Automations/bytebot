import { IsString, IsOptional, IsObject, IsBoolean, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for browser screenshot requests
 */
export class BrowserScreenshotDto {
  @ApiPropertyOptional({
    description: 'Session ID for browser context',
    example: 'session_123456789',
  })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({
    description: 'Screenshot options',
    example: { fullPage: true, quality: 80, format: 'png' },
  })
  @IsOptional()
  @IsObject()
  options?: {
    fullPage?: boolean;
    quality?: number;
    format?: 'png' | 'jpeg' | 'webp';
    clip?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    omitBackground?: boolean;
    path?: string;
  };

  @ApiPropertyOptional({
    description: 'CSS selector to screenshot specific element',
    example: '#main-content',
  })
  @IsOptional()
  @IsString()
  selector?: string;

  @ApiPropertyOptional({
    description: 'Whether to return base64 encoded image data',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  returnBase64?: boolean;
}

/**
 * Response DTO for screenshot results
 */
export class BrowserScreenshotResponseDto {
  @ApiProperty({
    description: 'Whether the screenshot was successful',
    example: true,
  })
  success: boolean;

  @ApiPropertyOptional({
    description: 'File path where screenshot was saved',
    example: '/screenshots/screenshot_20230922_103500.png',
  })
  filePath?: string;

  @ApiPropertyOptional({
    description: 'Base64 encoded image data (if returnBase64 was true)',
    example: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
  })
  base64Data?: string;

  @ApiPropertyOptional({
    description: 'Screenshot metadata',
    example: {
      width: 1920,
      height: 1080,
      format: 'png',
      size: 245760,
      timestamp: '2023-09-22T10:35:00Z',
    },
  })
  metadata?: {
    width: number;
    height: number;
    format: string;
    size: number;
    timestamp: Date;
  };

  @ApiPropertyOptional({
    description: 'Error message if screenshot failed',
    example: 'Element not found: #main-content',
  })
  error?: string;

  @ApiProperty({
    description: 'Session ID used for the screenshot',
    example: 'session_123456789',
  })
  sessionId: string;

  @ApiPropertyOptional({
    description: 'Screenshot timing information',
    example: { startTime: 1695123456789, endTime: 1695123459123, duration: 2334 },
  })
  timing?: {
    startTime: number;
    endTime: number;
    duration: number;
  };
}