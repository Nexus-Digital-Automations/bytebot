/**
 * WebSocket Utilities Index
 * 
 * Exports all WebSocket-related utilities and services for the bytebot shared package.
 * This module provides comprehensive type-safe WebSocket implementations that resolve
 * the VerifyClientCallback type incompatibilities between IncomingMessage and Record types.
 * 
 * @author Claude Code
 * @version 1.0.0
 */

// Export WebSocket type utilities
export {
  // Type definitions
  WebSocketVerificationInfo,
  EnhancedRequestInfo,
  SafeVerifyClientCallback,
  SafeVerifyClientCallbackAsync,
  SafeVerifyClientCallbackUnion,
  SafeWebSocketServerOptions,
  
  // Utility functions
  createSafeWebSocketServer,
  createWebSocketVerifyAdapter,
  createVerificationInfo,
  convertIncomingMessageToRecord,
  validateWebSocketHeaders,
  createSecureVerifyCallback,
  isAsyncVerifyCallback,
  
  // Default export
  default as WebSocketUtils,
} from './websocket-types';

// Export WebSocket bridge services
export { ParlantWebSocketBridgeService } from './parlant-websocket-bridge.service';
export { ConversationalWebSocketBridgeService } from './conversational-websocket-bridge.service';
export { ParlantWebSocketIntegrationService } from './parlant-websocket-integration.service';

// Export conversational WebSocket types
export {
  ConversationalMessage,
  ConversationalMessageType,
  ValidationRequestMessage,
  UserConfirmationMessage,
  ProgressUpdateMessage,
  ConversationalSession,
  SessionStatus,
  ValidationContext,
  ValidationAction,
  SecurityContext,
  ActionImpact,
} from './conversational-websocket-bridge.service';

// Export integration types
export {
  ParlantValidationRequest,
  ParlantValidationResult,
  ValidationPriority,
  ParlantStreamingOptions,
} from './parlant-websocket-integration.service';

/**
 * Re-export commonly used WebSocket types for convenience
 */
export type { Server as WebSocketServer, RawData as WebSocketRawData } from 'ws';

/**
 * Documentation for resolving WebSocket VerifyClientCallback type issues:
 * 
 * PROBLEM:
 * Type '(info: { req: Record<string, unknown> & { headers: Record<string, string>; }; origin?: string; secure?: boolean; }) => boolean' 
 * is not assignable to type 'VerifyClientCallbackAsync<IncomingMessage> | VerifyClientCallbackSync<IncomingMessage>'
 * 
 * SOLUTION:
 * 1. Use `createSafeWebSocketServer` instead of `new WebSocket.Server`
 * 2. Use `SafeVerifyClientCallback` types instead of raw callback functions
 * 3. Use `createWebSocketVerifyAdapter` to convert between type systems
 * 4. Use `convertIncomingMessageToRecord` for manual type conversion
 * 
 * EXAMPLE:
 * ```typescript
 * import { createSafeWebSocketServer, SafeVerifyClientCallback } from './websocket';
 * 
 * const verifyClient: SafeVerifyClientCallback = (info) => {
 *   // info.req is properly typed as IncomingMessage with enhanced headers
 *   return info.req.headers.authorization !== undefined;
 * };
 * 
 * const server = createSafeWebSocketServer({
 *   port: 8080,
 *   verifyClient, // No type errors!
 * });
 * ```
 */