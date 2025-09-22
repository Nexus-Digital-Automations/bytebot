/**
 * Comprehensive Test Type Interfaces
 *
 * Provides type-safe interfaces for all test fixtures, mocks, and data structures
 * used across integration tests, e2e tests, and unit tests.
 *
 * @author Claude Code (TypeScript Specialist)
 * @version 1.0.0
 * @coverage Comprehensive test type safety
 */

import { Request, Response, NextFunction } from 'express';
import { JwtPayload } from 'jsonwebtoken';
import { UserRole } from '@bytebot/shared';

// =============================================================================
// Core User and Authentication Types
// =============================================================================

// UserRole is imported from shared types to ensure consistency
export { UserRole };

/**
 * JWT payload interface with complete user information
 */
export interface TestJwtPayload extends JwtPayload {
  sub: string;
  id: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

/**
 * Login credentials interface
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Login response interface
 */
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    role: UserRole;
  };
  expiresIn: number;
}

/**
 * Token refresh request interface
 */
export interface RefreshTokenRequest {
  refreshToken: string;
}

/**
 * Token refresh response interface
 */
export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// =============================================================================
// Request and Response Extension Types
// =============================================================================

/**
 * Authenticated request interface with user context
 */
export interface AuthenticatedRequest extends Request {
  user?: TestJwtPayload;
}

/**
 * Express.Multer.File interface for file uploads
 */
export interface TestUploadFile {
  originalname: string;
  size: number;
  mimetype?: string;
  buffer?: Buffer;
}

// =============================================================================
// Task and Resource Management Types
// =============================================================================

/**
 * Task creation request interface
 */
export interface CreateTaskRequest {
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  type?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Task response interface
 */
export interface TaskResponse {
  id: string;
  title: string;
  description?: string;
  priority?: string;
  userId: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Resource creation request interface
 */
export interface CreateResourceRequest {
  name: string;
  description?: string;
  type: string;
  metadata?: Record<string, unknown>;
}

/**
 * Resource response interface
 */
export interface ResourceResponse {
  id: string;
  name: string;
  description?: string;
  type: string;
  createdBy: string;
  createdAt: number;
  message?: string;
}

/**
 * Resource deletion response interface
 */
export interface DeleteResourceResponse {
  success: boolean;
  deletedId: string;
  deletedBy: string;
  deletedAt: number;
}

// =============================================================================
// Mock Service and Controller Types
// =============================================================================

/**
 * Mock authentication service interface
 */
export interface MockAuthServiceInterface {
  validateToken(token: string): TestJwtPayload | null;
}

/**
 * Mock JWT service interface
 */
export interface MockJwtServiceInterface {
  verify(token: string): TestJwtPayload;
  verifyAsync(token: string): Promise<TestJwtPayload>;
  sign(payload: Record<string, unknown>): string;
}

/**
 * Mock configuration service interface
 */
export interface MockConfigServiceInterface {
  get(key: string): string | number | undefined;
}

/**
 * Mock controller constructor type
 */
export interface MockControllerConstructor {
  new (authService?: MockAuthServiceInterface): unknown;
}

// =============================================================================
// Health Check and System Types
// =============================================================================

/**
 * Health check response interface
 */
export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version?: string;
  dependencies?: Record<string, unknown>;
}

/**
 * System data response interface
 */
export interface SystemDataResponse {
  status: string;
  version: string;
  uptime: number;
  memory: {
    used: number;
    total: number;
    free: number;
  };
  requestedBy: string;
  timestamp: number;
}

// =============================================================================
// Security and Validation Types
// =============================================================================

/**
 * Security event interface
 */
export interface SecurityEvent {
  type: SecurityEventType;
  userId?: string;
  ip: string;
  userAgent: string;
  timestamp: number;
  details: Record<string, unknown>;
}

/**
 * Security event types enumeration
 */
export enum SecurityEventType {
  LOGIN_ATTEMPT = 'LOGIN_ATTEMPT',
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  TOKEN_REFRESH = 'TOKEN_REFRESH',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
} /**
 * File upload response interface
 */
export interface FileUploadResponse {
  message: string;
  filename: string;
  size: number;
  uploadedBy: string;
  uploadedAt: number;
}

/**
 * User search response interface
 */
export interface UserSearchResponse {
  query: string;
  results: Array<{
    id: string;
    name: string;
    email: string;
  }>;
  searchedBy: string;
  timestamp: number;
}

// =============================================================================
// Error and Exception Types
// =============================================================================

/**
 * API error response interface
 */
export interface ApiErrorResponse {
  message: string;
  error: string;
  statusCode?: number;
  timestamp?: string;
  path?: string;
  details?: Record<string, unknown>;
}

/**
 * Validation error response interface
 */
export interface ValidationErrorResponse extends ApiErrorResponse {
  validationErrors: Array<{
    field: string;
    message: string;
    value?: unknown;
  }>;
}

// =============================================================================
// Test Utility Types
// =============================================================================

/**
 * Test operation context interface
 */
export interface TestOperationContext {
  operationId: string;
  testId: string;
  startTime: number;
  metadata: Record<string, unknown>;
}

/**
 * Rate limit test configuration
 */
export interface RateLimitTestConfig {
  maxRequests: number;
  windowMs: number;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
} /**
 * Security test configuration
 */
export interface SecurityTestConfig {
  enableRateLimit: boolean;
  enableSecurityHeaders: boolean;
  enableCorsProtection: boolean;
  jwtSecret: string;
  corsOrigins: string[];
}

/**
 * Mock middleware function type
 */
export type MockMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => void | Promise<void>;

/**
 * Test logger interface
 */
export interface TestLogger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  debug?(message: string, meta?: Record<string, unknown>): void;
}

// =============================================================================
// Performance and Monitoring Types
// =============================================================================

/**
 * Performance metrics interface
 */
export interface PerformanceMetrics {
  requestCount: number;
  averageResponseTime: number;
  successRate: number;
  errorRate: number;
  throughputPerSecond: number;
}

/**
 * Load test result interface
 */
export interface LoadTestResult {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  rateLimitedRequests: number;
  averageResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
  executionTime: number;
}

// =============================================================================
// Configuration and Setup Types
// =============================================================================

/**
 * Test configuration interface
 */
export interface TestConfiguration {
  security: SecurityTestConfig;
  rateLimit: RateLimitTestConfig;
  database: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
  };
  jwt: {
    secret: string;
    expirationTime: string;
  };
}

/**
 * Test module setup interface
 */
export interface TestModuleSetup {
  controllers: MockControllerConstructor[];
  providers: unknown[];
  imports: unknown[];
  exports?: unknown[];
}

// =============================================================================
// HTTP Testing Types
// =============================================================================

/**
 * HTTP test case interface
 */
export interface HttpTestCase {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS';
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
  expectedStatus: number | number[];
  expectedHeaders?: Record<string, string>;
  token?: string;
  timeout?: number;
}

/**
 * Concurrent request test configuration
 */
export interface ConcurrentRequestConfig {
  count: number;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  authToken?: string;
  payload?: unknown;
  expectedStatuses: number[];
}

// =============================================================================
// Security Attack Simulation Types
// =============================================================================

/**
 * Attack simulation configuration
 */
export interface AttackSimulationConfig {
  type:
    | 'XSS'
    | 'SQL_INJECTION'
    | 'HEADER_INJECTION'
    | 'REQUEST_SMUGGLING'
    | 'DIRECTORY_TRAVERSAL';
  payloads: string[];
  targetEndpoint: string;
  expectedBehavior: 'BLOCK' | 'SANITIZE' | 'LOG_AND_CONTINUE';
}

/**
 * Penetration test result interface
 */
export interface PenetrationTestResult {
  attackType: string;
  payloadsTested: number;
  successfulBlocks: number;
  failedBlocks: number;
  sanitizedResponses: number;
  vulnerabilitiesFound: number;
  recommendations: string[];
}

// =============================================================================
// Export all types for easy importing
// =============================================================================

export type {
  // Re-export commonly used Express types
  Request as ExpressRequest,
  Response as ExpressResponse,
  NextFunction as ExpressNextFunction,
  JwtPayload as BaseJwtPayload,
};

// Default export with commonly used types grouped
export default {
  UserRole,
  SecurityEventType,
  // Add other enums and constants as needed
};
