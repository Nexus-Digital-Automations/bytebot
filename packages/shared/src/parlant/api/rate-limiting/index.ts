/**
 * @fileoverview PARLANT Phase 1 - Rate Limiting System Exports
 * Comprehensive rate limiting with conversational capabilities and
 * enterprise-grade traffic management
 *
 * @version 1.0.0
 * @author AIgent Enterprise Rate Limiting Team
 * @since 2025-09-22
 */

// Core rate limiting services
export { ConversationalRateLimiterService } from './core/conversational-rate-limiter.service';

// Multi-tier framework
export { MultiTierRateManagerService } from './framework/multi-tier-rate-manager.service';

// Natural language communication
export { NaturalLanguageRateCommunicatorService } from './communication/natural-language-rate-communicator.service';

// Enterprise traffic management
export { EnterpriseTrafficManagerService } from './enterprise/enterprise-traffic-manager.service';

// Analytics and monitoring
export { RateLimitingAnalyticsService } from './analytics/rate-limiting-analytics.service';

// Type definitions
export * from './types/rate-limiting.types';

// Re-export key interfaces from conversational API
export {
  UserContext,
  SecurityLevel,
  RiskLevel,
  APIRequest,
  ConversationalPreExecutionValidator,
  IntentAnalysis,
  RiskAssessment
} from '../interfaces/conversational-api.interface';

/**
 * PARLANT Phase 1 Rate Limiting System
 *
 * Features:
 * - Conversational rate limiting with natural language explanations
 * - Multi-tier rate management (user, API, operation, global)
 * - Enterprise traffic management with SLA compliance
 * - Real-time analytics and predictive modeling
 * - Intelligent user negotiation and education
 * - Sub-50ms processing with 10,000+ requests/second support
 *
 * Usage Example:
 * ```typescript
 * import {
 *   ConversationalRateLimiterService,
 *   RateLimitConfiguration,
 *   RateLimitContext
 * } from '@bytebot/shared/parlant/api/rate-limiting';
 *
 * const rateLimiter = new ConversationalRateLimiterService(configuration);
 * const decision = await rateLimiter.evaluateRequest(context);
 *
 * console.log(decision.conversationalResponse.explanation);
 * ```
 */