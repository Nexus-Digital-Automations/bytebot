/**
 * Enterprise Health Monitoring Module
 *
 * Provides comprehensive health monitoring and observability capabilities
 * for the Bytebot Agent service. Integrates with Kubernetes health probes,
 * Prometheus metrics collection, and structured logging.
 *
 * Features:
 * - Kubernetes-compatible health endpoints (liveness, readiness, startup)
 * - Database and external service health monitoring
 * - System resource monitoring and alerting
 * - Performance metrics collection
 * - Structured logging with correlation IDs
 *
 * @author Claude Code - Monitoring & Observability Specialist
 * @version 2.0.0
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * Health monitoring module providing comprehensive observability
 */
@Module({
  imports: [
    // Configuration module for environment variables
    ConfigModule,

    // Database module for health checks
    PrismaModule,
  ],
  controllers: [HealthController],
  providers: [HealthService],
  exports: [HealthService],
})
export class HealthModule {
  constructor() {
    console.log('✅ Health Module initialized - Enterprise monitoring active');
    console.log('📊 Available endpoints:');
    console.log('   - GET /health          - Basic health status');
    console.log('   - GET /health/live     - Kubernetes liveness probe');
    console.log('   - GET /health/ready    - Kubernetes readiness probe');
    console.log('   - GET /health/startup  - Kubernetes startup probe');
    console.log('   - GET /health/status   - Detailed system status');
  }
}
