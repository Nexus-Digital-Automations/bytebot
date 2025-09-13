/**
 * Comprehensive TypeScript Type Safety Library for BytebotD
 *
 * Enterprise-grade type definitions providing comprehensive type safety,
 * generic utilities, and advanced TypeScript patterns for the BytebotD package.
 *
 * This library implements:
 * - Strict null safety with proper optional handling
 * - Advanced generic types and utility types
 * - Type-safe configuration and API interfaces
 * - Performance monitoring type definitions
 * - Security and authentication type safety
 * - Error handling and validation types
 * - Express.js middleware type safety
 *
 * @author Claude Code (TypeScript Type Safety Specialist)
 * @version 1.0.0
 * @coverage Enterprise-grade type safety for BytebotD
 */

import { Request, Response, NextFunction } from 'express';
import type {
  ParamsDictionary,
  Query as ExpressQuery,
} from 'express-serve-static-core';
import { JwtPayload as BaseJwtPayload } from 'jsonwebtoken';
// import type { BufferEncoding } from 'node:buffer'; // Causing import issues - use string instead

// =============================================================================
// Core Utility Types - Advanced TypeScript Patterns
// =============================================================================

/**
 * Represents a successful operation result with typed data
 */
export interface Success<T = unknown> {
  readonly success: true;
  readonly data: T;
  readonly timestamp: string;
  readonly operationId: string;
}

/**
 * Represents a failed operation result with typed error information
 */
export interface Failure<E = Error> {
  readonly success: false;
  readonly error: E;
  readonly timestamp: string;
  readonly operationId: string;
  readonly stack?: string;
}

/**
 * Generic Result type for safe error handling
 * @template T - Success data type
 * @template E - Error type
 */
export type Result<T, E = Error> = Success<T> | Failure<E>;

/**
 * Helper type for nullable values with explicit undefined handling
 * @template T - The base type
 */
export type Optional<T> = T | null | undefined;

/**
 * Helper type for non-nullable values with compile-time guarantees
 * @template T - The base type
 */
export type NonNullable<T> = T extends null | undefined ? never : T;

/**
 * Deep readonly type for immutable data structures
 * @template T - The type to make deeply readonly
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends (infer U)[]
    ? DeepReadonlyArray<U>
    : T[P] extends Record<string, unknown>
      ? DeepReadonly<T[P]>
      : T[P];
};

/**
 * Deep readonly array type
 * @template T - Array element type
 */
export interface DeepReadonlyArray<T> extends ReadonlyArray<DeepReadonly<T>> {}

/**
 * Type-safe object with string keys and known value type
 * @template T - Value type
 */
export type StrictRecord<T> = Record<string, T>;

/**
 * Partial type with nested partial properties
 * @template T - The type to make deeply partial
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends (infer U)[]
    ? DeepPartial<U>[]
    : T[P] extends Record<string, unknown>
      ? DeepPartial<T[P]>
      : T[P];
};

// =============================================================================
// Performance Monitoring Types
// =============================================================================

/**
 * Comprehensive performance metrics interface with strict typing
 */
export interface PerformanceMetrics {
  readonly requestCount: number;
  readonly averageResponseTime: number;
  readonly successRate: number;
  readonly errorRate: number;
  readonly throughputPerSecond: number;
  readonly p95ResponseTime: Optional<number>;
  readonly p99ResponseTime: Optional<number>;
  readonly memoryUsage: MemoryUsageMetrics;
  readonly timestamp: string;
}

/**
 * Memory usage metrics with proper null safety
 */
export interface MemoryUsageMetrics {
  readonly used: number;
  readonly free: number;
  readonly total: number;
  readonly heapUsed: number;
  readonly heapTotal: number;
  readonly external: number;
  readonly arrayBuffers: number;
}

/**
 * Performance interceptor interface with proper null handling
 */
export interface PerformanceInterceptor {
  readonly name: string;
  readonly enabled: boolean;
  readonly metrics: PerformanceMetrics;
  readonly startTime: number;
  readonly endTime: Optional<number>;

  start(): void;
  stop(): PerformanceMetrics;
  reset(): void;
  getMetrics(): PerformanceMetrics;
}

/**
 * Compression interceptor interface with type safety
 */
export interface CompressionInterceptor {
  readonly name: string;
  readonly enabled: boolean;
  readonly compressionRatio: number;
  readonly algorithm: 'gzip' | 'deflate' | 'br';
  readonly threshold: number;

  compress(data: Buffer): Promise<Buffer>;
  decompress(data: Buffer): Promise<Buffer>;
  getCompressionRatio(): number;
}

/**
 * Load test result interface with comprehensive metrics
 */
export interface LoadTestResult {
  readonly totalRequests: number;
  readonly successfulRequests: number;
  readonly failedRequests: number;
  readonly rateLimitedRequests: number;
  readonly averageResponseTime: number;
  readonly maxResponseTime: number;
  readonly minResponseTime: number;
  readonly p95ResponseTime: number;
  readonly p99ResponseTime: number;
  readonly executionTime: number;
  readonly throughput: number;
  readonly errorRate: number;
  readonly successRate: number;
}

// =============================================================================
// Security and Authentication Types
// =============================================================================

/**
 * User roles enumeration with comprehensive access levels
 * NOTE: Using underscore prefixes to match shared package compatibility
 */
export enum UserRole {
  _ADMIN = 'admin',
  _OPERATOR = 'operator',
  _VIEWER = 'viewer',
  _USER = 'user',
  _GUEST = 'guest',
}

/**
 * Permission types for role-based access control
 */
export interface Permission {
  readonly resource: string;
  readonly action: 'create' | 'read' | 'update' | 'delete' | 'execute';
  readonly scope: 'global' | 'organization' | 'team' | 'personal';
  readonly conditions?: StrictRecord<unknown>;
}

/**
 * Role-based permissions mapping with type safety
 */
export type RolePermissions = StrictRecord<Permission[]>;

/**
 * Enhanced JWT payload interface with strict typing
 */
export interface JwtPayload extends BaseJwtPayload {
  readonly sub: string;
  readonly id: string;
  readonly email: string;
  readonly role: UserRole;
  readonly permissions: Permission[];
  readonly sessionId: string;
  readonly iat: number;
  readonly exp: number;
  readonly iss?: string;
  readonly aud?: string;
}

/**
 * Authentication request interface
 */
export interface AuthRequest {
  readonly email: string;
  readonly password: string;
  readonly rememberMe?: boolean;
  readonly twoFactorCode?: string;
}

/**
 * Authentication response interface
 */
export interface AuthResponse {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly user: UserInfo;
  readonly expiresIn: number;
  readonly tokenType: 'Bearer';
  readonly permissions: Permission[];
}

/**
 * User information interface
 */
export interface UserInfo {
  readonly id: string;
  readonly email: string;
  readonly role: UserRole;
  readonly name?: string;
  readonly avatar?: string;
  readonly lastLogin?: string;
  readonly isActive: boolean;
}

// =============================================================================
// Configuration Types with Proper Index Signatures
// =============================================================================

/**
 * Base configuration interface with type-safe key access
 */
export interface BaseConfiguration {
  readonly [key: string]: string | number | boolean | undefined;
}

/**
 * JWT configuration interface with strict typing
 */
export interface JwtConfiguration extends BaseConfiguration {
  readonly JWT_SECRET: string;
  readonly JWT_REFRESH_SECRET: string;
  readonly JWT_EXPIRATION: string;
  readonly JWT_REFRESH_EXPIRATION: string;
  readonly JWT_ISSUER?: string;
  readonly JWT_AUDIENCE?: string;
}

/**
 * Security configuration interface
 */
export interface SecurityConfiguration extends BaseConfiguration {
  readonly RATE_LIMIT_WINDOW: number;
  readonly RATE_LIMIT_MAX: number;
  readonly SESSION_TIMEOUT: number;
  readonly MAX_FAILED_ATTEMPTS: number;
  readonly ACCOUNT_LOCKOUT_DURATION: number;
  readonly CORS_ORIGINS: string;
  readonly HELMET_ENABLED: boolean;
}

/**
 * Database configuration interface
 */
export interface DatabaseConfiguration extends BaseConfiguration {
  readonly DB_HOST: string;
  readonly DB_PORT: number;
  readonly DB_NAME: string;
  readonly DB_USER: string;
  readonly DB_PASSWORD: string;
  readonly DB_SSL: boolean;
  readonly DB_POOL_SIZE: number;
}

/**
 * Complete application configuration interface
 */
export interface ApplicationConfiguration
  extends JwtConfiguration,
    SecurityConfiguration,
    DatabaseConfiguration {
  readonly NODE_ENV: 'development' | 'staging' | 'production' | 'test';
  readonly PORT: number;
  readonly API_VERSION: string;
  readonly LOG_LEVEL: 'error' | 'warn' | 'info' | 'debug';
}

// =============================================================================
// Express.js Type Safety Enhancements
// =============================================================================

/**
 * Type-safe authenticated request interface
 * @template Body - Request body type
 * @template Query - Query parameters type extending Express Query
 * @template Params - Route parameters type extending ParamsDictionary
 */
export interface AuthenticatedRequest<
  Body = unknown,
  Query extends ExpressQuery = ExpressQuery,
  Params extends ParamsDictionary = ParamsDictionary,
> extends Request<Params, unknown, Body, Query> {
  readonly user: JwtPayload;
  readonly sessionId: string;
  readonly requestId: string;
  readonly startTime: number;
}

/**
 * Type-safe API response interface
 */
export interface ApiResponse<T = unknown> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: ApiError;
  readonly pagination?: PaginationInfo;
  readonly metadata?: StrictRecord<unknown>;
  readonly timestamp: string;
  readonly requestId: string;
}

/**
 * Pagination information interface
 */
export interface PaginationInfo {
  readonly page: number;
  readonly limit: number;
  readonly total: number;
  readonly totalPages: number;
  readonly hasNext: boolean;
  readonly hasPrev: boolean;
}

/**
 * API error interface with structured error information
 */
export interface ApiError {
  readonly code: string;
  readonly message: string;
  readonly details?: StrictRecord<unknown>;
  readonly stack?: string;
  readonly timestamp: string;
  readonly path: string;
  readonly method: string;
}

/**
 * Type-safe middleware function with proper Express types
 */
export type TypedMiddleware<
  Req extends Request = Request,
  Res extends Response = Response,
> = (req: Req, res: Res, next: NextFunction) => void | Promise<void>;

/**
 * Authenticated middleware function type
 * @template Body - Request body type
 * @template Query - Query parameters type extending Express Query
 * @template Params - Route parameters type extending ParamsDictionary
 */
export type AuthenticatedMiddleware<
  Body = unknown,
  Query extends ExpressQuery = ExpressQuery,
  Params extends ParamsDictionary = ParamsDictionary,
> = TypedMiddleware<
  AuthenticatedRequest<Body, Query, Params>,
  Response<ApiResponse>
>;

// =============================================================================
// File Upload and Buffer Handling Types
// =============================================================================

/**
 * Type-safe file upload interface
 */
export interface SafeUploadFile {
  readonly originalname: string;
  readonly mimetype: string;
  readonly size: number;
  readonly buffer: Buffer;
  readonly encoding: string;
  readonly fieldname: string;
}

/**
 * File upload options with validation
 */
export interface FileUploadOptions {
  readonly maxSize: number;
  readonly allowedMimeTypes: readonly string[];
  readonly allowedExtensions: readonly string[];
  readonly virusScanEnabled: boolean;
}

/**
 * Buffer creation helper with proper null safety
 */
export interface SafeBufferOptions {
  readonly encoding: BufferEncoding;
  readonly maxLength: number;
  readonly allowEmpty: boolean;
}

// =============================================================================
// Health Check and System Monitoring Types
// =============================================================================

/**
 * Health check status enumeration
 */
export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  UNKNOWN = 'unknown',
}

/**
 * Service health information interface
 */
export interface ServiceHealth {
  readonly name: string;
  readonly status: HealthStatus;
  readonly responseTime?: number;
  readonly lastCheck: string;
  readonly error?: string;
  readonly metadata?: StrictRecord<unknown>;
}

/**
 * Comprehensive system health interface
 */
export interface SystemHealth {
  readonly status: HealthStatus;
  readonly timestamp: string;
  readonly uptime: number;
  readonly version: string;
  readonly environment: string;
  readonly services: readonly ServiceHealth[];
  readonly memory: MemoryUsageMetrics;
  readonly performance: PerformanceMetrics;
}

// =============================================================================
// Validation and Error Handling Types
// =============================================================================

/**
 * Validation error interface with field-level details
 */
export interface ValidationError {
  readonly field: string;
  readonly message: string;
  readonly value: unknown;
  readonly constraint: string;
}

/**
 * Validation result interface with type safety
 */
export interface ValidationResult<T> {
  readonly isValid: boolean;
  readonly data?: T;
  readonly errors: readonly ValidationError[];
}

/**
 * Type guard utility type
 */
export type TypeGuard<T> = (value: unknown) => value is T;

/**
 * Validator function type
 */
export type Validator<T> = (value: T) => ValidationResult<T>;

// =============================================================================
// Generic Repository and Service Patterns
// =============================================================================

/**
 * Base entity interface with common fields
 */
export interface BaseEntity {
  readonly id: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly version: number;
}

/**
 * Generic repository interface pattern
 */
export interface Repository<T extends BaseEntity> {
  findById(id: string): Promise<Optional<T>>;
  findAll(options?: QueryOptions): Promise<readonly T[]>;
  create(data: Omit<T, keyof BaseEntity>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<Optional<T>>;
  delete(id: string): Promise<boolean>;
  count(filter?: Partial<T>): Promise<number>;
}

/**
 * Query options interface for repositories
 */
export interface QueryOptions {
  readonly limit?: number;
  readonly offset?: number;
  readonly orderBy?: string;
  readonly orderDirection?: 'asc' | 'desc';
  readonly filter?: StrictRecord<unknown>;
}

// =============================================================================
// Event and Message Types
// =============================================================================

/**
 * Domain event interface for event-driven architecture
 */
export interface DomainEvent<T = unknown> {
  readonly id: string;
  readonly type: string;
  readonly aggregateId: string;
  readonly data: T;
  readonly timestamp: string;
  readonly version: number;
  readonly correlationId?: string;
  readonly causationId?: string;
}

/**
 * Message queue message interface
 */
export interface QueueMessage<T = unknown> {
  readonly id: string;
  readonly topic: string;
  readonly payload: T;
  readonly headers: StrictRecord<string>;
  readonly timestamp: string;
  readonly retryCount: number;
  readonly maxRetries: number;
}

// =============================================================================
// Export All Types for Easy Importing
// =============================================================================

// Re-export commonly used Express types with enhanced type safety
export type {
  Request as ExpressRequest,
  Response as ExpressResponse,
  NextFunction as ExpressNextFunction,
};

// Export utility functions for type safety
export const TypeSafetyUtils = {
  /**
   * Type-safe assertion helper
   */
  assertNonNull: <T>(value: Optional<T>, message?: string): NonNullable<T> => {
    if (value == null) {
      throw new Error(message ?? 'Value is null or undefined');
    }
    return value as NonNullable<T>;
  },

  /**
   * Type-safe object creation helper
   */
  createStrictRecord: <T>(obj: Record<string, T>): StrictRecord<T> => {
    return obj;
  },

  /**
   * Result helper functions
   */
  success: <T>(data: T, operationId: string): Success<T> => ({
    success: true,
    data,
    timestamp: new Date().toISOString(),
    operationId,
  }),

  failure: <E>(error: E, operationId: string): Failure<E> => ({
    success: false,
    error,
    timestamp: new Date().toISOString(),
    operationId,
    stack: error instanceof Error ? error.stack : undefined,
  }),

  /**
   * Type guard for checking if value is defined
   */
  isDefined: <T>(value: Optional<T>): value is NonNullable<T> => {
    return value != null;
  },

  /**
   * Type guard for checking if value is null or undefined
   */
  isNullish: <T>(value: Optional<T>): value is null | undefined => {
    return value == null;
  },
} as const;

// =============================================================================
// Security Testing and Client Information Types
// =============================================================================

/**
 * Client information interface for security sessions
 */
export interface ClientInfo {
  readonly userAgent?: string;
  readonly ipAddress?: string;
  readonly platform?: string;
  readonly browser?: string;
  readonly version?: string;
  readonly deviceType?: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  readonly screenResolution?: string;
  readonly timestamp: string;
}

/**
 * Enhanced task data interface with strict typing
 */
export interface TaskData {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly status: 'pending' | 'in_progress' | 'completed' | 'failed';
  readonly priority: 'low' | 'medium' | 'high' | 'critical';
  readonly createdBy?: string;
  readonly updatedBy?: string;
  readonly assignedTo?: string;
  readonly createdAt?: number;
  readonly updatedAt?: number;
  readonly dueDate?: number;
  readonly metadata?: StrictRecord<string | number | boolean>;
}

/**
 * JWT token data with proper typing
 */
export interface TokenData {
  readonly token: string;
  readonly refreshToken?: string;
  readonly expiresIn: number | string;
  readonly tokenType: 'Bearer' | 'JWT';
  readonly scope?: string[];
  readonly issuedAt: number;
}

/**
 * Decoded JWT payload with enhanced type safety
 */
export interface DecodedJwtPayload extends BaseJwtPayload {
  readonly sub: string;
  readonly email: string;
  readonly role: UserRole;
  readonly sessionId?: string;
  readonly permissions?: string[];
  readonly exp: number;
  readonly iat: number;
  readonly iss?: string;
  readonly aud?: string | string[];
}

/**
 * Security event data interface
 */
export interface SecurityEventData {
  readonly eventType:
    | 'login'
    | 'logout'
    | 'failed_attempt'
    | 'session_timeout'
    | 'permission_denied';
  readonly userId?: string;
  readonly sessionId?: string;
  readonly ipAddress?: string;
  readonly userAgent?: string;
  readonly timestamp: number;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly details?: StrictRecord<string | number | boolean>;
}

/**
 * Mock server response data interface
 */
export interface MockResponseData {
  readonly status: number;
  readonly message: string;
  readonly data?: unknown;
  readonly timestamp: string;
  readonly requestId: string;
  readonly duration?: number;
}

/**
 * Express.js Request extension with user info
 */
export interface EnhancedRequest extends Request {
  user?: {
    readonly sub: string;
    readonly email: string;
    readonly role: UserRole;
    readonly sessionId?: string;
    readonly permissions?: string[];
    readonly clientInfo?: ClientInfo;
  };
  session?: {
    readonly id: string;
    readonly data: StrictRecord<unknown>;
    readonly expiresAt: number;
  };
  requestId?: string;
  startTime?: number;
}

// =============================================================================
// Generic Type Constraints for Common Patterns
// =============================================================================

/**
 * Generic type for enhanced API responses (extends existing ApiResponse)
 * @template T - The data type returned in the response
 */
export interface EnhancedApiResponse<T = unknown> extends ApiResponse<T> {
  readonly duration?: number;
  readonly correlationId?: string;
  readonly metadata?: StrictRecord<unknown>;
}

/**
 * Generic type for paginated responses
 * @template T - The type of items in the response
 */
export interface PaginatedResponse<T> {
  readonly items: readonly T[];
  readonly totalCount: number;
  readonly pageSize: number;
  readonly currentPage: number;
  readonly totalPages: number;
  readonly hasNextPage: boolean;
  readonly hasPreviousPage: boolean;
}

/**
 * Generic type for event handlers with proper typing
 * @template T - The event data type
 */
export type EventHandler<T = unknown> = (event: T) => void | Promise<void>;

/**
 * Generic type for middleware functions
 * @template T - Request context type
 * @template R - Response type
 */
export type MiddlewareFunction<T = Request, R = Response> = (
  req: T,
  res: R,
  next: NextFunction,
) => void | Promise<void>;

/**
 * Generic type for service methods with consistent error handling
 * @template T - Return type
 * @template E - Error type
 */
export type ServiceMethod<T, E = Error> = (
  ...args: unknown[]
) => Promise<Result<T, E>>;

/**
 * Generic type for configuration objects with required and optional fields
 * @template R - Required configuration fields
 * @template O - Optional configuration fields
 */
export type Configuration<R, O = Record<string, never>> = R & Partial<O>;

/**
 * Generic type for database entities with audit fields
 * @template T - Entity-specific fields
 */
export type DatabaseEntity<T> = T & {
  readonly id: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly version?: number;
};

/**
 * Generic type for mock implementations
 * @template T - The interface being mocked
 */
export type MockImplementation<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R
    ? jest.MockedFunction<(...args: A) => R>
    : T[K];
};

// Default export with grouped types for convenience
export default {
  UserRole,
  HealthStatus,
  TypeSafetyUtils,
} as const;
