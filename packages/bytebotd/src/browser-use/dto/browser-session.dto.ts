import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject } from 'class-validator';

export class BrowserSessionDto {
  @ApiProperty({
    description: 'Browser session identifier',
    example: 'session-123',
  })
  @IsString()
  sessionId: string;

  @ApiPropertyOptional({
    description: 'Session configuration options',
    example: { headless: true },
  })
  @IsOptional()
  @IsObject()
  options?: Record<string, any>;
}

export class CreateBrowserSessionResponseDto {
  @ApiProperty({
    description: 'Whether session creation was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Created session identifier',
    example: 'session-123',
  })
  sessionId: string;
}