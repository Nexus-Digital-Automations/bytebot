/**
 * Parlant Monitoring DTOs
 *
 * Data Transfer Objects for the Parlant Conversational Monitoring Controller
 * providing proper type safety for all API responses.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsBoolean, IsDateString, IsNumber, IsObject, Min, Max } from 'class-validator';

// ===== INTERFACES =====

export interface ConversationalDashboardData {
  overallStatus: string;
  keyMetrics: Array<{
    name: string;
    value: number | string;
    status: string;
    trend: string;
    conversationalExplanation: string;
    suggestedActions: string[];
  }>;
  alerts: Array<{
    id: string;
    severity: string;
    message: string;
    timestamp: Date;
    conversationalExplanation: string;
    suggestedActions: string[];
  }>;
  recentActivity: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: Date;
    metadata: Record<string, unknown>;
  }>;
  timestamp: Date;
}

export interface PeriodicInsightsTrend {
  metric: string;
  direction: 'improving' | 'stable' | 'declining';
  change: string;
  explanation: string;
}

export interface PeriodicInsightsPattern {
  type: string;
  description: string;
  significance: number;
  recommendations: string[];
}

export interface PeriodicInsightsData {
  period: string;
  focus: string;
  summary: string;
  trends: PeriodicInsightsTrend[];
  patterns: PeriodicInsightsPattern[];
  recommendations: string[];
  timestamp: Date;
}

// ===== REQUEST DTOs =====

export class MonitoringQueryDto {
  @ApiProperty({
    description: 'Natural language query about monitoring data',
    example: 'How is the API performance over the last hour?',
  })
  @IsString()
  query!: string;

  @ApiPropertyOptional({
    description: 'Start time for query range',
    example: '2024-01-15T10:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  startTime?: string;

  @ApiPropertyOptional({
    description: 'End time for query range',
    example: '2024-01-15T11:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  endTime?: string;

  @ApiPropertyOptional({
    description: 'Specific services to focus on',
    example: ['auth-service', 'task-service'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  services?: string[];

  @ApiPropertyOptional({
    description: 'Security levels to include in analysis',
    example: ['HIGH', 'CRITICAL'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  securityLevels?: string[];

  @ApiPropertyOptional({
    description: 'Include performance metrics in response',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  includePerformance?: boolean;
}

// ===== RESPONSE DTOs =====

export class ConversationalDashboardResponseDto {
  @ApiProperty({ description: 'Overall system status' })
  overallStatus!: string;

  @ApiProperty({
    description: 'Key metrics with conversational explanations',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        value: { oneOf: [{ type: 'number' }, { type: 'string' }] },
        status: { type: 'string' },
        trend: { type: 'string' },
        conversationalExplanation: { type: 'string' },
        suggestedActions: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  keyMetrics!: Array<{
    name: string;
    value: number | string;
    status: string;
    trend: string;
    conversationalExplanation: string;
    suggestedActions: string[];
  }>;

  @ApiProperty({
    description: 'Current alerts with explanations',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        severity: { type: 'string' },
        message: { type: 'string' },
        timestamp: { type: 'string', format: 'date-time' },
        conversationalExplanation: { type: 'string' },
        suggestedActions: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  alerts!: Array<{
    id: string;
    severity: string;
    message: string;
    timestamp: Date;
    conversationalExplanation: string;
    suggestedActions: string[];
  }>;

  @ApiProperty({
    description: 'Recent monitoring events with conversational summaries',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        type: { type: 'string' },
        description: { type: 'string' },
        timestamp: { type: 'string', format: 'date-time' },
        metadata: { type: 'object' },
      },
    },
  })
  recentActivity!: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: Date;
    metadata: Record<string, unknown>;
  }>;

  @ApiProperty({ description: 'Dashboard generation timestamp' })
  timestamp!: Date;
}

export class PeriodicInsightsResponseDto {
  @ApiProperty({ description: 'Time period analyzed' })
  period!: string;

  @ApiProperty({ description: 'Focus area for analysis' })
  focus!: string;

  @ApiProperty({ description: 'Summary of findings' })
  summary!: string;

  @ApiProperty({
    description: 'Trend analysis results',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        metric: { type: 'string' },
        direction: { type: 'string', enum: ['improving', 'stable', 'declining'] },
        change: { type: 'string' },
        explanation: { type: 'string' },
      },
    },
  })
  trends!: PeriodicInsightsTrend[];

  @ApiProperty({
    description: 'Pattern recognition results',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        type: { type: 'string' },
        description: { type: 'string' },
        significance: { type: 'number', minimum: 0, maximum: 1 },
        recommendations: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  patterns!: PeriodicInsightsPattern[];

  @ApiProperty({
    description: 'Actionable recommendations',
    type: 'array',
    items: { type: 'string' },
  })
  recommendations!: string[];

  @ApiProperty({ description: 'Analysis timestamp' })
  timestamp!: Date;
}