/**
 * Proper TypeScript test interfaces for ESLint compliance
 */
import type { HealthIndicatorResult as _HealthIndicatorResult } from '@nestjs/terminus';
import type { HealthService } from '../health/health.service';
import type { NutService } from '../nut/nut.service';

export interface KeyMappingInfo {
  keyCode: string;
  withShift: boolean;
}

export interface ServiceResponse {
  success: boolean;
  message?: string;
}

export interface Coordinates {
  x: number;
  y: number;
}

export interface KeyInfo {
  keyCode: string;
  withShift: boolean;
}

export type MouseButton = 'left' | 'right' | 'middle';
export type ScrollDirection = 'up' | 'down' | 'left' | 'right';

/**
 * Type-safe interface for HealthService testing including private methods
 */
export type TestableHealthService = HealthService & {
  checkServiceHealth?(): {
    database: 'connected' | 'disconnected' | 'unknown';
    cache: 'available' | 'unavailable' | 'unknown';
    external: 'reachable' | 'unreachable' | 'unknown';
  };
  performDatabasePing?(): Promise<boolean>;
  checkExternalService?(
    url: string,
    timeout?: number,
  ): Promise<{
    status: string;
    responseTime?: string;
  }>;
  getPerformanceMetrics?(): {
    requestsPerSecond: number;
    averageResponseTime: number;
  };
};

/**
 * Type-safe interface for NutService testing
 */
export type TestableNutService = NutService & {
  validateKey?(key: string): string;
  charToKeyInfo?(char: string): KeyInfo | null;
  getErrorMessage?(error: unknown): string;
  delay?(ms: number): Promise<void>;
  generateOperationId?(): string;
  getServiceStatus?(): Record<string, unknown>;
};

export function asTestable<T>(service: T): T & Record<string, unknown> {
  return service as T & Record<string, unknown>;
}

export interface TypedHealthIndicatorResult {
  [key: string]: {
    status: 'up' | 'down';
    error?: string;
    responseTime?: string;
    connectionStatus?: string;
    message?: string;
  };
}
