import { IsString, IsOptional, IsObject, IsBoolean, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for browser navigation requests
 */
export class BrowserNavigateDto {
  @ApiProperty({
    description: 'URL to navigate to',
    example: 'https://example.com',
  })
  @IsString()
  url: string;

  @ApiPropertyOptional({
    description: 'Session ID for browser context',
    example: 'session_123456789',
  })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({
    description: 'Navigation options',
    example: { waitUntil: 'networkidle0', timeout: 30000 },
  })
  @IsOptional()
  @IsObject()
  options?: {
    waitUntil?: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2';
    timeout?: number;
    referer?: string;
  };

  @ApiPropertyOptional({
    description: 'Whether to capture a screenshot after navigation',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  captureScreenshot?: boolean;
}

/**
 * Response DTO for navigation results
 */
export class BrowserNavigateResponseDto {
  @ApiProperty({
    description: 'Whether the navigation was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Final URL after navigation (may differ due to redirects)',
    example: 'https://example.com/home',
  })
  finalUrl: string;

  @ApiProperty({
    description: 'HTTP status code of the navigation',
    example: 200,
  })
  statusCode: number;

  @ApiPropertyOptional({
    description: 'Error message if navigation failed',
    example: 'Navigation timeout exceeded',
  })
  error?: string;

  @ApiPropertyOptional({
    description: 'Navigation timing information',
    example: { startTime: 1695123456789, endTime: 1695123459123, duration: 2334 },
  })
  timing?: {
    startTime: number;
    endTime: number;
    duration: number;
  };

  @ApiPropertyOptional({
    description: 'Screenshot path if captured',
    example: '/screenshots/navigation_result.png',
  })
  screenshot?: string;

  @ApiProperty({
    description: 'Session ID used for the navigation',
    example: 'session_123456789',
  })
  sessionId: string;

  @ApiPropertyOptional({
    description: 'Page title after navigation',
    example: 'Example Site - Home',
  })
  pageTitle?: string;
}