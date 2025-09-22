import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for browser status requests
 */
export class BrowserStatusDto {
  @ApiPropertyOptional({
    description: 'Session ID to check status for (if not provided, returns all sessions)',
    example: 'session_123456789',
  })
  @IsOptional()
  @IsString()
  sessionId?: string;
}

/**
 * Session status information
 */
export interface SessionStatus {
  sessionId: string;
  isActive: boolean;
  isConnected: boolean;
  currentUrl?: string;
  pageTitle?: string;
  createdAt: Date;
  lastActivity: Date;
  browserVersion?: string;
  userAgent?: string;
}

/**
 * System health information
 */
export interface SystemHealth {
  browserServiceRunning: boolean;
  activeSessions: number;
  maxSessions: number;
  memoryUsage: {
    used: number;
    free: number;
    total: number;
  };
  uptime: number;
}

/**
 * Response DTO for browser status
 */
export class BrowserStatusResponseDto {
  @ApiProperty({
    description: 'Overall system health status',
    example: true,
  })
  healthy: boolean;

  @ApiProperty({
    description: 'System health details',
    example: {
      browserServiceRunning: true,
      activeSessions: 2,
      maxSessions: 10,
      memoryUsage: { used: 512, free: 1536, total: 2048 },
      uptime: 86400,
    },
  })
  system: SystemHealth;

  @ApiPropertyOptional({
    description: 'Status of specific session (if sessionId provided)',
    example: {
      sessionId: 'session_123456789',
      isActive: true,
      isConnected: true,
      currentUrl: 'https://example.com',
      pageTitle: 'Example Site',
      createdAt: '2023-09-22T10:30:00Z',
      lastActivity: '2023-09-22T10:35:00Z',
      browserVersion: 'Chrome/117.0.0.0',
      userAgent: 'Mozilla/5.0...',
    },
  })
  session?: SessionStatus;

  @ApiPropertyOptional({
    description: 'List of all active sessions (if no specific sessionId provided)',
    example: [
      {
        sessionId: 'session_123456789',
        isActive: true,
        isConnected: true,
        currentUrl: 'https://example.com',
        pageTitle: 'Example Site',
        createdAt: '2023-09-22T10:30:00Z',
        lastActivity: '2023-09-22T10:35:00Z',
      },
    ],
  })
  sessions?: SessionStatus[];

  @ApiProperty({
    description: 'Timestamp of status check',
    example: '2023-09-22T10:35:00Z',
  })
  timestamp: Date;
}