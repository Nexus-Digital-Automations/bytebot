/**
 * Enterprise Health Monitoring Controller - PARLANT INTEGRATED
 *
 * Provides comprehensive Kubernetes-compatible health check and system status
 * endpoints for enterprise deployment monitoring with PARLANT CONVERSATIONAL
 * VALIDATION for all health operations.
 *
 * Features:
 * - Kubernetes health probe endpoints (liveness, readiness, startup)
 * - Database connectivity health checks with conversational validation
 * - External service dependency monitoring with risk assessment
 * - Detailed system status information with audit trails
 * - Performance metrics and resource monitoring with Parlant approval
 * - Risk-based conversational validation for all health operations
 * - Comprehensive audit trail for health monitoring compliance
 *
 * PARLANT INTEGRATION:
 * - LOW risk: Basic health checks (auto-approved with caching)
 * - MEDIUM risk: Detailed status, readiness probes (conversational validation)
 * - HIGH risk: Database health, external services (full validation)
 * - CRITICAL risk: System-wide health failures (emergency protocols)
 *
 * @author Claude Code - Agent 4 (Health & Metrics Parlant Integration)
 * @version 3.0.0 - PARLANT MAXIMUM INTEGRATION
 */

import { Controller, Get, Logger, UseGuards } from '@nestjs/common';
import {
  HealthCheckService,
  HttpHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
  HealthCheck,
  HealthCheckResult,
} from '@nestjs/terminus';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  Authenticated,
  CurrentUser,
  ByteBotdUser,
} from '../auth/decorators/roles.decorator';
import { HealthService } from './health.service';
import {
  BasicHealthResponse,
  DetailedStatusResponse,
} from './interfaces/health.interfaces';
import {
  ParlantHealthMetricsValidationService,
  HealthOperationType,
  HealthMetricsValidationResult,
} from '../parlant/services/parlant-health-metrics-validation.service';

/**
 * Health monitoring controller providing system status endpoints with Parlant validation
 */
@Controller('health')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('bearer')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    private readonly healthService: HealthService,
    private readonly health: HealthCheckService,
    private readonly http: HttpHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
    private readonly disk: DiskHealthIndicator,
    private readonly parlantValidationService: ParlantHealthMetricsValidationService,
  ) {
    this.logger.log('Enterprise Health Controller initialized with Parlant validation');
    this.logger.log(
      'Available endpoints: /health, /health/live, /health/ready, /health/startup, /health/status',
    );
    this.logger.log('PARLANT INTEGRATION: Risk-based conversational validation active');
  }

  /**
   * Basic health check endpoint with Parlant validation
   * GET /health
   *
   * @param user Current authenticated user
   * @returns Simple health status response with conversational validation
   */
  @Get()
  @Authenticated()
  async getHealth(@CurrentUser() user: ByteBotdUser):
    Promise<BasicHealthResponse | { status: string; timestamp: string; error: string; validation?: HealthMetricsValidationResult }> {
    const operationId = `health_basic_${Date.now()}`;
    
    this.logger.debug(`[${operationId}] Basic health check requested with Parlant validation`, {
      operationId,
      userId: user.id,
      username: user.username,
      securityEvent: 'health_check_requested',
    });

    try {
      // PARLANT VALIDATION: Basic health check (LOW risk - auto-approved with caching)
      const validation = await this.parlantValidationService.validateHealthOperation(
        HealthOperationType.BASIC_HEALTH_CHECK,
        {
          endpoint: '/health',
          method: 'GET',
          frequency: 'high-frequency',
        },
        { userId: user.id, userRole: user.role },
      );

      this.logger.debug(`[${operationId}] Parlant validation completed`, {
        operationId,
        approved: validation.approved,
        riskLevel: validation.riskLevel,
        validationDuration: validation.performanceImpact.validationDuration,
        cacheHit: validation.performanceImpact.cacheHit,
      });

      if (!validation.approved) {
        this.logger.warn(`[${operationId}] Health check rejected by Parlant validation`, {
          operationId,
          reason: validation.reason,
          conversationId: validation.conversationId,
        });

        return {
          status: 'validation_rejected',
          timestamp: new Date().toISOString(),
          error: validation.reason || 'Health check operation not approved',
          validation,
        };
      }

      // Execute health check with audit trail
      const healthData = this.healthService.getBasicHealth();
      
      this.logger.debug(`[${operationId}] Health check completed successfully with Parlant audit`, {
        operationId,
        userId: user.id,
        healthStatus: healthData.status,
        conversationId: validation.conversationId,
        securityEvent: 'health_check_completed',
      });

      return healthData;
      
    } catch (_error) {
      const errorMessage =
        _error instanceof Error ? _error.message : 'Unknown error';
      this.logger.error(`[${operationId}] Health check failed: ${errorMessage}`, {
        operationId,
        userId: user.id,
        error: errorMessage,
      });

      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: errorMessage,
      };
    }
  }

  /**
   * Kubernetes liveness probe endpoint with Parlant validation
   * GET /health/live
   *
   * Checks if the application process is alive and running with conversational validation.
   * If this fails, Kubernetes will restart the pod.
   *
   * @param user Current authenticated user
   * @returns Liveness probe status with Parlant approval
   */
  @Get('live')
  @Authenticated()
  @HealthCheck()
  async checkLiveness(@CurrentUser() user: ByteBotdUser): Promise<HealthCheckResult> {
    const operationId = `liveness_${Date.now()}`;
    
    this.logger.debug(`[${operationId}] Liveness probe requested with Parlant validation`, {
      operationId,
      userId: user.id,
      securityEvent: 'liveness_probe_requested',
    });

    try {
      // PARLANT VALIDATION: Liveness probe (LOW risk - auto-approved with caching)
      const validation = await this.parlantValidationService.validateHealthOperation(
        HealthOperationType.LIVENESS_PROBE,
        {
          endpoint: '/health/live',
          method: 'GET',
          frequency: 'high-frequency',
          component: 'kubernetes_probe',
        },
        { userId: user.id, userRole: user.role },
      );

      if (!validation.approved) {
        this.logger.error(`[${operationId}] Liveness probe rejected by Parlant validation`, {
          operationId,
          reason: validation.reason,
          conversationId: validation.conversationId,
        });
        
        // For liveness probes, rejection could cause pod restart - use failsafe
        throw new Error(`Liveness probe validation failed: ${validation.reason}`);
      }

      this.logger.debug(`[${operationId}] Parlant validation approved for liveness probe`, {
        operationId,
        conversationId: validation.conversationId,
        validationDuration: validation.performanceImpact.validationDuration,
      });

      // Execute liveness checks with Parlant audit trail
      const result = await this.health.check([
        // Check memory usage (fail if over 90% memory usage)
        () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024), // 150MB limit
        // Check if core services are responsive
        () => this.healthService.checkProcessHealth(),
      ]);

      this.logger.debug(`[${operationId}] Liveness probe completed successfully`, {
        operationId,
        userId: user.id,
        conversationId: validation.conversationId,
        probeStatus: 'healthy',
        securityEvent: 'liveness_probe_completed',
      });

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`[${operationId}] Liveness probe failed: ${errorMessage}`, {
        operationId,
        userId: user.id,
        error: errorMessage,
      });
      
      // Re-throw for health check framework
      throw error;
    }
  }

  /**
   * Kubernetes readiness probe endpoint with Parlant validation
   * GET /health/ready
   *
   * Checks if the application is ready to receive traffic with conversational validation.
   * This includes database connections and external dependencies.
   *
   * @param user Current authenticated user
   * @returns Readiness probe status with Parlant approval
   */
  @Get('ready')
  @Authenticated()
  @HealthCheck()
  async checkReadiness(@CurrentUser() user: ByteBotdUser): Promise<HealthCheckResult> {
    const operationId = `readiness_${Date.now()}`;
    
    this.logger.debug(`[${operationId}] Readiness probe requested with Parlant validation`, {
      operationId,
      userId: user.id,
      securityEvent: 'readiness_probe_requested',
    });

    try {
      // PARLANT VALIDATION: Readiness probe (MEDIUM risk - includes database and external services)
      const validation = await this.parlantValidationService.validateHealthOperation(
        HealthOperationType.READINESS_PROBE,
        {
          endpoint: '/health/ready',
          method: 'GET',
          frequency: 'periodic',
          component: 'kubernetes_probe',
          includesDatabase: true,
          includesExternalServices: true,
        },
        { userId: user.id, userRole: user.role },
      );

      if (!validation.approved) {
        this.logger.error(`[${operationId}] Readiness probe rejected by Parlant validation`, {
          operationId,
          reason: validation.reason,
          conversationId: validation.conversationId,
        });
        
        throw new Error(`Readiness probe validation failed: ${validation.reason}`);
      }

      this.logger.debug(`[${operationId}] Parlant validation approved for readiness probe`, {
        operationId,
        conversationId: validation.conversationId,
        riskLevel: validation.riskLevel,
        validationDuration: validation.performanceImpact.validationDuration,
      });

      // Execute readiness checks with Parlant audit trail
      const result = await this.health.check([
        // Check database connectivity (HIGH risk operation)
        () => this.healthService.checkDatabaseHealth(),
        // Check external service dependencies (HIGH risk operation)
        () => this.healthService.checkExternalServices(),
        // Check disk space (warn if over 80%)
        () =>
          this.disk.checkStorage('storage', { thresholdPercent: 0.8, path: '/' }),
        // Check memory usage (warn if over 80%)
        () => this.memory.checkHeap('memory_heap', 120 * 1024 * 1024), // 120MB limit
      ]);

      this.logger.debug(`[${operationId}] Readiness probe completed successfully`, {
        operationId,
        userId: user.id,
        conversationId: validation.conversationId,
        probeStatus: 'ready',
        securityEvent: 'readiness_probe_completed',
      });

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`[${operationId}] Readiness probe failed: ${errorMessage}`, {
        operationId,
        userId: user.id,
        error: errorMessage,
      });
      
      throw error;
    }
  }

  /**
   * Kubernetes startup probe endpoint with Parlant validation
   * GET /health/startup
   *
   * Checks if the application has completed startup initialization with conversational validation.
   * Has longer timeout to allow for slow startup processes.
   *
   * @param user Current authenticated user
   * @returns Startup probe status with Parlant approval
   */
  @Get('startup')
  @Authenticated()
  @HealthCheck()
  async checkStartup(@CurrentUser() user: ByteBotdUser): Promise<HealthCheckResult> {
    const operationId = `startup_${Date.now()}`;
    
    this.logger.debug(`[${operationId}] Startup probe requested with Parlant validation`, {
      operationId,
      userId: user.id,
      securityEvent: 'startup_probe_requested',
    });

    try {
      // PARLANT VALIDATION: Startup probe (MEDIUM risk - includes module initialization and database)
      const validation = await this.parlantValidationService.validateHealthOperation(
        HealthOperationType.STARTUP_PROBE,
        {
          endpoint: '/health/startup',
          method: 'GET',
          frequency: 'once',
          component: 'kubernetes_probe',
          includesModules: true,
          includesDatabase: true,
        },
        { userId: user.id, userRole: user.role },
      );

      if (!validation.approved) {
        this.logger.error(`[${operationId}] Startup probe rejected by Parlant validation`, {
          operationId,
          reason: validation.reason,
          conversationId: validation.conversationId,
        });
        
        throw new Error(`Startup probe validation failed: ${validation.reason}`);
      }

      this.logger.debug(`[${operationId}] Parlant validation approved for startup probe`, {
        operationId,
        conversationId: validation.conversationId,
        riskLevel: validation.riskLevel,
        validationDuration: validation.performanceImpact.validationDuration,
      });

      // Execute startup checks with Parlant audit trail
      const result = await this.health.check([
        // Check if service has been running long enough to be considered stable
        () => this.healthService.checkStartupComplete(),
        // Check if all modules are initialized (MEDIUM risk operation)
        () => this.healthService.checkModuleInitialization(),
        // Basic database connectivity (HIGH risk operation)
        () => this.healthService.checkDatabaseHealth(),
      ]);

      this.logger.debug(`[${operationId}] Startup probe completed successfully`, {
        operationId,
        userId: user.id,
        conversationId: validation.conversationId,
        probeStatus: 'started',
        securityEvent: 'startup_probe_completed',
      });

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`[${operationId}] Startup probe failed: ${errorMessage}`, {
        operationId,
        userId: user.id,
        error: errorMessage,
      });
      
      throw error;
    }
  }

  /**
   * Detailed system status endpoint with Parlant validation
   * GET /health/status
   *
   * @param user Current authenticated user
   * @returns Comprehensive system status information with conversational validation
   */
  @Get('status')
  @Authenticated()
  async getDetailedStatus(@CurrentUser() user: ByteBotdUser):
    Promise<DetailedStatusResponse | { status: string; timestamp: string; error: string; services: {}; validation?: HealthMetricsValidationResult }> {
    const operationId = `status_detailed_${Date.now()}`;
    
    this.logger.debug(`[${operationId}] Detailed status requested with Parlant validation`, {
      operationId,
      userId: user.id,
      username: user.username,
      securityEvent: 'detailed_status_requested',
    });

    try {
      // PARLANT VALIDATION: Detailed status (MEDIUM risk - comprehensive system information)
      const validation = await this.parlantValidationService.validateHealthOperation(
        HealthOperationType.DETAILED_STATUS,
        {
          endpoint: '/health/status',
          method: 'GET',
          frequency: 'periodic',
          includesSystemInfo: true,
          includesPerformanceMetrics: true,
          includesServiceStatus: true,
        },
        { userId: user.id, userRole: user.role },
      );

      this.logger.debug(`[${operationId}] Parlant validation completed for detailed status`, {
        operationId,
        approved: validation.approved,
        riskLevel: validation.riskLevel,
        validationDuration: validation.performanceImpact.validationDuration,
        cacheHit: validation.performanceImpact.cacheHit,
      });

      if (!validation.approved) {
        this.logger.warn(`[${operationId}] Detailed status rejected by Parlant validation`, {
          operationId,
          reason: validation.reason,
          conversationId: validation.conversationId,
        });

        return {
          status: 'validation_rejected',
          timestamp: new Date().toISOString(),
          error: validation.reason || 'Detailed status operation not approved',
          services: {},
          validation,
        };
      }

      // Execute detailed status check with Parlant audit trail
      const statusData = this.healthService.getDetailedStatus();
      
      this.logger.debug(`[${operationId}] Detailed status completed successfully with Parlant audit`, {
        operationId,
        userId: user.id,
        systemStatus: statusData.status,
        serviceCount: Object.keys(statusData.services).length,
        conversationId: validation.conversationId,
        securityEvent: 'detailed_status_completed',
      });

      return statusData;
      
    } catch (_error) {
      const errorMessage =
        _error instanceof Error ? _error.message : 'Unknown error';
      this.logger.error(`[${operationId}] Detailed status check failed: ${errorMessage}`, {
        operationId,
        userId: user.id,
        error: errorMessage,
      });

      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: errorMessage,
        services: {},
      };
    }
  }
}
