/**
 * PARLANT Integration Layer - Database Function Validation Communication Bridge
 *
 * Main export file for the PARLANT validation integration layer that enables
 * wrapped database functions to request conversational validation from PARLANT
 * before execution, with intelligent caching and bypass mechanisms.
 *
 * This module creates the communication bridge for PARLANT Phase 1 implementation.
 *
 * @module ParlantValidationLayer
 * @version 1.0.0
 * @author AIgent Integration Team
 */

// Core communication bridge
export { ParlantValidationBridge } from './parlant-validation-bridge.service';

// WebSocket communication layer
export { ParlantWebSocketClient } from './websocket/parlant-websocket-client.service';
export { ParlantWebSocketManager } from './websocket/parlant-websocket-manager.service';

// Conversation context builders
export { ConversationContextBuilder } from './context/conversation-context-builder.service';
export { FunctionParameterMapper } from './context/function-parameter-mapper.service';

// Validation response processing
export { ValidationResponseProcessor } from './response/validation-response-processor.service';
export { ActionDeterminationEngine } from './response/action-determination-engine.service';

// Intelligent caching system
export { IntelligentCacheManager } from './cache/intelligent-cache-manager.service';
export { CacheHitOptimizer } from './cache/cache-hit-optimizer.service';

// Emergency bypass mechanisms
export { EmergencyBypassController } from './bypass/emergency-bypass-controller.service';
export { CriticalOperationManager } from './bypass/critical-operation-manager.service';

// Types and interfaces
export type {
  ValidationRequest,
  ValidationResponse,
  ConversationContext,
  CacheEntry,
  BypassConfiguration,
  ValidationMetrics,
} from './types/validation-layer.types';

// Configuration
export { ValidationLayerConfig } from './config/validation-layer.config';

// Main module
export { ParlantValidationModule } from './parlant-validation.module';