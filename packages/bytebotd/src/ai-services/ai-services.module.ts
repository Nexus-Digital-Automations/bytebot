/**
 * AI Services Module - MAXIMUM Parlant Integration
 *
 * Comprehensive module providing all AI services with full Parlant conversational
 * validation integration. This module serves as the central hub for all AI operations
 * in the Bytebot package with enterprise-grade validation and audit capabilities.
 *
 * Features:
 * - Complete AI model service integration (Anthropic, OpenAI, Google)
 * - AI agent processing services with conversational validation
 * - Comprehensive audit trails and performance monitoring
 * - Enterprise-grade security and compliance features
 * - Intelligent caching and performance optimization
 *
 * Architecture: Modular AI services with centralized Parlant validation
 * Security: Every AI operation validated through conversational authentication
 * Performance: Optimized for enterprise-scale AI processing with monitoring
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ParlantModule } from '../parlant/parlant.module';

// Import all AI services
import { AnthropicService } from './anthropic.service';
import { OpenAIService } from './openai.service';
import { GoogleService } from './google.service';
import { MessagesService } from './messages.service';
import { ParlantValidatedInputCaptureService } from './parlant-validated-input-capture.service';

// Additional AI services for complete coverage
import { TasksService } from './tasks.service';
import { SummariesService } from './summaries.service';
import { ProxyService } from './proxy.service';
import { AIAuditService } from './ai-audit.service';

// Import supporting modules
import { InputTrackingModule } from '../input-tracking/input-tracking.module';

@Module({
  imports: [ConfigModule, ParlantModule, InputTrackingModule],
  providers: [
    // Core AI Model Services
    AnthropicService,
    OpenAIService,
    GoogleService,

    // AI Agent Processing Services
    MessagesService,
    TasksService,
    SummariesService,
    ProxyService,
    ParlantValidatedInputCaptureService,

    // AI Operations Support Services
    AIAuditService,
  ],
  exports: [
    // Export all services for use in other modules
    AnthropicService,
    OpenAIService,
    GoogleService,
    MessagesService,
    TasksService,
    SummariesService,
    ProxyService,
    ParlantValidatedInputCaptureService,
    AIAuditService,
  ],
})
export class AIServicesModule {
  constructor() {
    // Module initialization logging will be handled by individual services
  }
}
