import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RateLimiterService } from './rate-limiter.service';
import { RateLimitingMiddleware } from './rate-limiting.middleware';
import { DDoSProtectionService } from '../ddos-protection/ddos-protection.service';
import { APIAbusePreventionService } from '../api-abuse-prevention/api-abuse-prevention.service';
import { TrafficPatternAnalysisService } from '../traffic-analysis/traffic-pattern-analysis.service';
import { SecurityMonitoringService } from './security-monitoring.service';
import { SecurityAlertsService } from './security-alerts.service';
import { SecurityMetricsService } from './security-metrics.service';
import { SecurityDashboardController } from './security-dashboard.controller';

/**
 * Comprehensive Rate Limiting and Security Module
 *
 * Integrates all security services:
 * - Rate limiting with multiple algorithms
 * - DDoS protection and mitigation
 * - API abuse prevention and bot detection
 * - Traffic pattern analysis and ML anomaly detection
 * - Security monitoring and alerting
 * - Performance metrics and optimization
 * - Real-time dashboard and reporting
 */

@Module({
  imports: [ConfigModule],
  providers: [
    // Core security services
    RateLimiterService,
    DDoSProtectionService,
    APIAbusePreventionService,
    TrafficPatternAnalysisService,

    // Monitoring and alerting services
    SecurityMonitoringService,
    SecurityAlertsService,
    SecurityMetricsService,

    // Middleware
    RateLimitingMiddleware,
  ],
  controllers: [SecurityDashboardController],
  exports: [
    RateLimiterService,
    DDoSProtectionService,
    APIAbusePreventionService,
    TrafficPatternAnalysisService,
    SecurityMonitoringService,
    SecurityAlertsService,
    SecurityMetricsService,
  ],
})
export class RateLimitingModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply rate limiting middleware globally
    consumer
      .apply(RateLimitingMiddleware)
      .forRoutes('*');
  }
}