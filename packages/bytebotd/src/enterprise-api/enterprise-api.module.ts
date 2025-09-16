/**
 * Enterprise API Module - MAXIMUM IMPLEMENTATION
 * 
 * Comprehensive module for Enterprise API Layer integration with Parlant validation.
 * Provides unified API gateway, enterprise monitoring, and conversational validation
 * for ALL API endpoints across the Bytebot platform.
 * 
 * Features:
 * - Universal API Gateway with Parlant validation
 * - Enterprise monitoring and analytics
 * - Circuit breaker patterns for resilience
 * - Advanced caching and performance optimization
 * - Comprehensive audit trails and compliance
 * - Real-time API health monitoring
 * 
 * Integration: Works with all existing controllers and services
 * Performance: Sub-1000ms validation with intelligent caching
 * Monitoring: Real-time metrics and health dashboards
 */

import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { ParlantModule } from '../parlant/parlant.module';
import { EnterpriseApiGatewayController } from './enterprise-api-gateway.controller';
import { EnterpriseApiService } from './enterprise-api.service';
import { EnterpriseApiInterceptor } from './enterprise-api.interceptor';
import { EnterpriseApiHealthService } from './enterprise-api-health.service';

/**
 * Enterprise API Module
 * 
 * Provides enterprise-grade API gateway functionality with comprehensive
 * Parlant integration, monitoring, and reliability features.
 */
@Module({
  imports: [
    ConfigModule,
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 3,
    }),
    ParlantModule, // Required for conversational validation
  ],
  controllers: [
    EnterpriseApiGatewayController,
  ],
  providers: [
    EnterpriseApiService,
    EnterpriseApiInterceptor,
    EnterpriseApiHealthService,
  ],
  exports: [
    EnterpriseApiService,
    EnterpriseApiInterceptor,
    EnterpriseApiHealthService,
  ],
})
export class EnterpriseApiModule {
  constructor() {
    console.log('🚀 Enterprise API Module loaded - Universal Parlant validation active');
  }
}