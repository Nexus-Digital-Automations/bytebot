/**
 * WebSocket Type Utilities
 *
 * Provides type-safe utilities for WebSocket operations, particularly addressing
 * the VerifyClientCallback type incompatibilities between IncomingMessage and
 * custom Record<string, unknown> types.
 *
 * @author Claude Code
 * @version 1.0.0
 */

import type { IncomingMessage } from 'http';
import * as WebSocket from 'ws';

/*** WebSocket verification info structure that bridges IncomingMessage and Record types
 */
export interface WebSocketVerificationInfo {
  readonly req: IncomingMessage;
  readonly origin?: string;
  readonly secure?: boolean;
  readonly extensions?: Record<string, unknown>;
  readonly protocols?: string[];
}

/**
 * Enhanced request info that provides compatibility with both IncomingMessage and Record types
 */
export interface EnhancedRequestInfo extends Record<string, unknown> {
  readonly headers: Record<string, string>;
  readonly url?: string;
  readonly method?: string;
  readonly origin?: string;
  readonly secure?: boolean;
  readonly remoteAddress?: string;
  readonly userAgent?: string;
}

/**
 * Type-safe WebSocket verification callback that handles IncomingMessage conversion
 */
export type SafeVerifyClientCallback = (
  info: WebSocketVerificationInfo,
) => boolean;

/**
 * Async version of the verification callback
 */
export type SafeVerifyClientCallbackAsync = (
  info: WebSocketVerificationInfo,
) => Promise<boolean>;

/**
 * Union type for both sync and async verification callbacks
 */
export type SafeVerifyClientCallbackUnion =
  | SafeVerifyClientCallback
  | SafeVerifyClientCallbackAsync;

/**
 * WebSocket server options with enhanced type safety
 */
export interface SafeWebSocketServerOptions {
  verifyClient?: SafeVerifyClientCallbackUnion;
  port?: number;
  host?: string;
  backlog?: number;
  server?: import('http').Server | import('https').Server;
  path?: string;
  noServer?: boolean;
  clientTracking?: boolean;
  perMessageDeflate?: WebSocket.PerMessageDeflateOptions | false | true;
  maxPayload?: number;
  skipUTF8Validation?: boolean;
}

/**
 * Type guard to check if a callback is async
 */
export function isAsyncVerifyCallback(
  callback: SafeVerifyClientCallbackUnion,
): callback is SafeVerifyClientCallbackAsync {
  return callback.constructor.name === 'AsyncFunction';
} /**
 * Converts IncomingMessage to EnhancedRequestInfo for type compatibility
 */
export function convertIncomingMessageToRecord(
  req: IncomingMessage,
): EnhancedRequestInfo {
  const headers: Record<string, string> = {};

  // Safely convert headers to Record<string, string>
  Object.entries(req.headers).forEach(([key, value]) => {
    if (typeof value === 'string') {
      headers[key] = value;
    } else if (Array.isArray(value)) {
      headers[key] = value.join(', ');
    } else if (value !== undefined) {
      headers[key] = String(value);
    }
  });

  return {
    headers,
    url: req.url,
    method: req.method,
    origin: headers.origin,
    secure: (req.connection as { encrypted?: boolean })?.encrypted === true,
    remoteAddress: req.connection?.remoteAddress,
    userAgent: headers['user-agent'],
    // Add any additional properties from the request
    ...Object.getOwnPropertyNames(req).reduce(
      (acc, key) => {
        const value = (req as unknown as Record<string, unknown>)[key];
        if (
          typeof value === 'string' ||
          typeof value === 'number' ||
          typeof value === 'boolean'
        ) {
          acc[key] = value;
        }
        return acc;
      },
      {} as Record<string, unknown>,
    ),
  };
}

/**
 * Creates a WebSocket verification info object from standard WS callback parameters
 */
export function createVerificationInfo(info: {
  origin: string;
  secure: boolean;
  req: IncomingMessage;
}): WebSocketVerificationInfo {
  return {
    req: info.req,
    origin: info.origin,
    secure: info.secure,
  };
}

/**
 * Type adapter that converts standard WebSocket VerifyClientCallback to our safe types
 */
export function createWebSocketVerifyAdapter(
  callback: SafeVerifyClientCallbackUnion,
): WebSocket.VerifyClientCallbackSync | WebSocket.VerifyClientCallbackAsync {
  if (isAsyncVerifyCallback(callback)) {
    // Return async adapter
    return async (info: {
      origin: string;
      secure: boolean;
      req: IncomingMessage;
    }) => {
      const verificationInfo = createVerificationInfo({
        origin: info.origin,
        secure: info.secure,
        req: info.req,
      });
      return await callback(verificationInfo);
    };
  } else {
    // Return sync adapter
    return (info: {
      origin: string;
      secure: boolean;
      req: IncomingMessage;
    }) => {
      const verificationInfo = createVerificationInfo({
        origin: info.origin,
        secure: info.secure,
        req: info.req,
      });
      return callback(verificationInfo);
    };
  }
}

/**
 * Factory function to create type-safe WebSocket server with proper verification callback
 */
export function createSafeWebSocketServer(
  options: SafeWebSocketServerOptions,
): WebSocket.Server {
  const wsOptions: WebSocket.ServerOptions = { ...options };

  // Convert our safe callback to standard WebSocket callback if provided
  if (options.verifyClient) {
    wsOptions.verifyClient = createWebSocketVerifyAdapter(options.verifyClient);
  }

  return new WebSocket.Server(wsOptions);
}

/**
 * Utility function to validate WebSocket request headers
 */
export function validateWebSocketHeaders(headers: Record<string, string>): {
  valid: boolean;
  reason?: string;
} {
  // Check required WebSocket headers
  if (!headers.upgrade || headers.upgrade.toLowerCase() !== 'websocket') {
    return { valid: false, reason: 'Missing or invalid Upgrade header' };
  }

  if (!headers.connection?.toLowerCase().includes('upgrade')) {
    return { valid: false, reason: 'Missing or invalid Connection header' };
  }

  if (!headers['sec-websocket-key']) {
    return { valid: false, reason: 'Missing Sec-WebSocket-Key header' };
  }

  if (!headers['sec-websocket-version']) {
    return { valid: false, reason: 'Missing Sec-WebSocket-Version header' };
  }
  return { valid: true };
}

/**
 * Security-focused WebSocket verification callback that implements common security checks
 */
export function createSecureVerifyCallback(
  options: {
    allowedOrigins?: string[];
    requireHttps?: boolean;
    maxConnections?: number;
    rateLimitByIP?: boolean;
  } = {},
): SafeVerifyClientCallback {
  const connectionCount = new Map<string, number>();
  const lastConnectionTime = new Map<string, number>();

  return (info: WebSocketVerificationInfo): boolean => {
    const { req, origin, secure } = info;
    const remoteAddress = req.connection?.remoteAddress;

    // HTTPS requirement check
    if (options.requireHttps && !secure) {
      console.warn('WebSocket connection rejected: HTTPS required');
      return false;
    }

    // Origin validation
    if (options.allowedOrigins && origin) {
      if (!options.allowedOrigins.includes(origin)) {
        console.warn(
          `WebSocket connection rejected: Origin ${origin} not allowed`,
        );
        return false;
      }
    }

    // Rate limiting by IP
    if (options.rateLimitByIP && remoteAddress) {
      const now = Date.now();
      const lastTime = lastConnectionTime.get(remoteAddress);

      if (lastTime && now - lastTime < 1000) {
        // 1 second rate limit
        console.warn(
          `WebSocket connection rejected: Rate limit exceeded for ${remoteAddress}`,
        );
        return false;
      }

      lastConnectionTime.set(remoteAddress, now);
    }

    // Connection count limiting
    if (options.maxConnections && remoteAddress) {
      const currentCount = connectionCount.get(remoteAddress) ?? 0;
      if (currentCount >= options.maxConnections) {
        console.warn(
          `WebSocket connection rejected: Max connections exceeded for ${remoteAddress}`,
        );
        return false;
      }
    }

    // Header validation
    const convertedReq = convertIncomingMessageToRecord(req);
    const headerValidation = validateWebSocketHeaders(convertedReq.headers);
    if (!headerValidation.valid) {
      console.warn(`WebSocket connection rejected: ${headerValidation.reason}`);
      return false;
    }

    return true;
  };
}

/**
 * Testing and Error Handling Types
 */

/**
 * Error recovery metrics for testing scenarios
 */
export interface ErrorRecoveryMetrics {
  totalFailures: number;
  successfulRecoveries: number;
  averageRecoveryTime: number;
  recoverySuccessRate: number;
}

/**
 * Test error scenario configuration
 */
export interface TestErrorScenario {
  type: string;
  message?: string;
  recoverySuccessRate: number;
  attempt?: number;
  delay?: number;
}

/**
 * Performance metrics for testing
 */
export interface TestPerformanceMetrics {
  duration: number;
  messagesSent: number;
  messagesReceived: number;
  errors: number;
  averageLatency: number;
  throughput: number;
}

/**
 * Connection lifecycle metrics
 */
export interface ConnectionLifecycleMetrics {
  connectionsOpened: number;
  connectionsClosed: number;
  totalDuration: number;
  averageConnectionTime: number;
}

/**
 * Message validation result
 */
export interface MessageValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * WebSocket test client configuration
 */
export interface WebSocketTestClientConfig {
  url: string;
  protocols?: string[];
  timeout?: number;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

/**
 * Stress test configuration
 */
export interface StressTestConfig {
  clientCount: number;
  messagesPerClient: number;
  messageSize: number;
  duration: number;
  rampUpTime: number;
}

/**
 * Error injection configuration
 */
export interface ErrorInjectionConfig {
  errorRate: number;
  errorTypes: string[];
  delayRange: [number, number];
  recoveryTime: number;
}

/**
 * Type-safe error object
 */
export interface TypedError {
  name: string;
  message: string;
  stack?: string;
  code?: string | number;
  details?: Record<string, unknown>;
}

/**
 * Typed metrics collection interface
 */
export interface MetricsCollection {
  [key: string]: number | string | boolean | Record<string, unknown>;
}

/**
 * Safe message handler type
 */
export type SafeMessageHandler<T = unknown> = (
  message: T,
  context?: Record<string, unknown>,
) => void | Promise<void>;

/**
 * Safe error handler type
 */
export type SafeErrorHandler = (
  error: TypedError,
  context?: Record<string, unknown>,
) => void | Promise<void>;

/**
 * Helper function to create typed error
 */
export function createTypedError(
  name: string,
  message: string,
  details?: Record<string, unknown>,
): TypedError {
  return {
    name,
    message,
    details,
    stack: new Error().stack,
  };
}

/**
 * Type guard for TypedError
 */
export function isTypedError(value: unknown): value is TypedError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'name' in value &&
    'message' in value &&
    typeof (value as TypedError).name === 'string' &&
    typeof (value as TypedError).message === 'string'
  );
}

/**
 * Safe type assertion for unknown values
 */
export function assertType<T>(
  value: unknown,
  validator: (val: unknown) => val is T,
): T {
  if (!validator(value)) {
    throw createTypedError(
      'TypeAssertionError',
      'Value does not match expected type',
      { value },
    );
  }
  return value;
}

/**
 * Type-safe object property access
 */
export function safeGet<T>(
  obj: Record<string, unknown>,
  key: string,
  defaultValue: T,
): T {
  const value = obj[key];
  return value !== undefined ? (value as T) : defaultValue;
}

/**
 * Type-safe numeric conversion
 */
export function safeToNumber(value: unknown, defaultValue = 0): number {
  if (typeof value === 'number' && !isNaN(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  }
  return defaultValue;
}

/**
 * Type-safe string conversion
 */
export function safeToString(value: unknown, defaultValue = ''): string {
  if (typeof value === 'string') {
    return value;
  }
  if (value === null || value === undefined) {
    return defaultValue;
  }
  return String(value);
}

// Default export with all utilities
export default {
  createSafeWebSocketServer,
  createWebSocketVerifyAdapter,
  createVerificationInfo,
  convertIncomingMessageToRecord,
  validateWebSocketHeaders,
  createSecureVerifyCallback,
  isAsyncVerifyCallback,
  createTypedError,
  isTypedError,
  assertType,
  safeGet,
  safeToNumber,
  safeToString,
};
