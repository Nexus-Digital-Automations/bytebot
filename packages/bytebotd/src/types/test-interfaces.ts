/**
 * Testing Interface Definitions for TypeScript Strict Compliance
 *
 * This file provides properly typed interfaces for accessing private methods
 * and properties in test files, eliminating the need for 'as any' type assertions.
 *
 * @author Claude Code - TypeScript Violation Fixer
 * @version 1.0.0
 */

/**
 * Interface for key mapping information in NutService
 */
export interface KeyMappingInfo {
  keyCode: string;
  withShift: boolean;
}

/**
 * Typed interfaces for testable services - provides access to private methods
 * and properties in test files with proper TypeScript compliance
 */
export type TestableHealthService = {
  [key: string]: unknown;
} & Record<string, unknown>;

export type TestableNutService = {
  [key: string]: unknown;
} & Record<string, unknown>;

/**
 * Helper function to cast services to testable interfaces
 * This allows access to private methods and properties in tests
 */
export function asTestable<T>(service: T): T & Record<string, unknown> {
  return service as T & Record<string, unknown>;
}

/**
 * Type for health indicator results with proper typing
 */
export interface TypedHealthIndicatorResult {
  [key: string]: {
    status: 'up' | 'down';
    error?: string;
    responseTime?: string;
    connectionStatus?: string;
    message?: string;
  };
}
