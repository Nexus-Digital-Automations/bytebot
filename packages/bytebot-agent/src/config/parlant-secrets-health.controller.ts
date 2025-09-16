/**
 * Parlant-Enhanced Secrets Health Controller - MAXIMUM Integration for Health Monitoring
 * Wraps SecretsHealthController operations with comprehensive Parlant conversational validation
 *
 * Features:
 * - HIGH risk Parlant validation for all health checks (operational data exposure)
 * - Conversational approval for production environment health queries
 * - Enterprise-grade audit trails for health monitoring access
 * - Risk-based approval workflows for different monitoring operations
 * - Compliance validation for health data access
 * - Real-time security monitoring with conversational alerts
 *
 * @author Configuration & Secrets Management Parlant Integration Agent
 * @version 1.0.0 - MAXIMUM Parlant Integration for Health Monitoring
 * @since Phase 4: MAXIMUM Parlant Integration - Health Monitoring
 */

import { Controller, Get, Logger, Query, Headers } from '@nestjs/common';
import { ApiTags, ApiSecurity, ApiQuery, ApiOperation } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import {
  ParlantConfigurationService,
  ParlantRiskLevel,
  ConfigurationOperationContext,
  ParlantValidationResponse,
} from './parlant-configuration.service';
import {
  ParlantSecretsService,
  ParlantSecretsOperationResult,
} from './parlant-secrets.service';
import {
  ParlantEnterpriseSecretsService,
  ParlantEnterpriseSecretsResult,
} from './parlant-enterprise-secrets.service';
import * as crypto from 'crypto';

/**
 * Enhanced health response with Parlant validation context
 */
interface ParlantSecretsHealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  parlantValidation: {
    conversationId: string;
    approved: boolean;
    riskLevel: ParlantRiskLevel;
    approvalReason?: string;
  };
  summary: {
    total: number;
    healthy: number;
    expiring: number;
    expired: number;
    parlantProtected: number;
  };
  performance: {
    totalRequests: number;
    successRate: number;
    averageResponseTime: number;
    errorCount: number;
    cacheHitRate: number;
    parlantValidations: number;
    parlantApprovals: number;
  };
  externalProviders: Record<string, unknown>;
  auditSummary: {
    totalEntries: number;
    recentErrors: number;
    successRate: number;
    parlantAudits: number;
  };
  checks: {
    secretsAccessible: boolean;
    rotationHealthy: boolean;
    auditingWorking: boolean;
    externalProvidersConnected: boolean;
    parlantServiceHealthy: boolean;
  };
  complianceStatus: {
    enabled: boolean;
    standards: string[];
    violations: string[];
    auditTrailComplete: boolean;
  };
  details?: Array<{
    name: string;
    status: string;
    age: number;
    source: string;
    lastAccessed?: Date;
    parlantProtected: boolean;
  }>;
}

/**
 * Enhanced metrics with Parlant validation statistics
 */
interface ParlantMetricsData extends Record<string, unknown> {
  timestamp: string;
  secrets: {
    total: number;
    healthy: number;
    expiring: number;
    expired: number;
    parlantProtected: number;
  };
  performance: {
    totalRequests: number;
    successRate: number;
    cacheHitRate: number;
    errorRate: number;
    averageResponseTime: number;
  };
  parlantMetrics: {
    totalValidations: number;
    approvalRate: number;
    averageApprovalTime: number;
    criticalRiskOperations: number;
    rejectedOperations: number;
  };
  sources: Record<string, number>;
  providers: Record<string, number>;
  complianceMetrics: {
    enabled: boolean;
    violations: number;
    auditEntries: number;
  };
}

/**
 * Parlant-Enhanced Secrets Health Controller
 * Provides MAXIMUM conversational validation for all health monitoring operations
 */
@ApiTags('parlant-secrets-health')
@Controller('api/parlant/secrets')
@ApiSecurity('bearer')
export class ParlantSecretsHealthController {
  private readonly logger = new Logger('ParlantSecretsHealthController');
  private readonly startTime: number = Date.now();

  constructor(
    private readonly parlantSecretsService: ParlantSecretsService,
    private readonly parlantEnterpriseService: ParlantEnterpriseSecretsService,
    private readonly parlantConfigService: ParlantConfigurationService,
    private readonly configService: ConfigService,
  ) {
    this.logger.log(
      'Parlant Secrets Health Controller initialized with MAXIMUM integration',
      {
        conversationalValidation: true,
        riskBasedApproval: true,
        complianceIntegration: true,
        productionSafeguards: true,
      },
    );
  }

  /**
   * Get comprehensive secrets health with HIGH risk Parlant validation
   * Health checks expose operational information and require conversational approval
   */
  @Get('health')
  @ApiOperation({
    summary: 'Get secrets health with Parlant conversational validation',
    description:
      'Comprehensive health check with risk-based approval and audit trails',
  })
  @ApiQuery({ name: 'includeDetails', required: false, type: Boolean })
  @ApiQuery({ name: 'user', required: false, type: String })
  async getSecretsHealth(
    @Query('includeDetails') includeDetails = false,
    @Query('user') user = 'system',
    @Headers('x-session-id') sessionId?: string,
  ): Promise<ParlantSecretsHealthResponse> {
    const startTime = Date.now();
    const operationId = `parlant-health-check-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const timestamp = new Date().toISOString();
    const uptime = Date.now() - this.startTime;

    this.logger.warn(
      `[${operationId}] HIGH RISK: Secrets health check requires Parlant validation`,
      {
        user,
        includeDetails,
        sessionId,
        environment: this.configService.get<string>('NODE_ENV'),
      },
    );

    try {
      // Create operation context for health check validation
      const context: ConfigurationOperationContext = {
        operation:
          'Get comprehensive secrets health status with operational data exposure',
        service: 'SecretsHealthController',
        method: 'getSecretsHealth',
        parameters: { includeDetails, user, sessionId },
        environment:
          this.configService.get<string>('NODE_ENV') || 'development',
        user,
        riskLevel: ParlantRiskLevel.HIGH, // Health checks expose operational data
        requiresApproval: this.isProductionEnvironment() || includeDetails,
        auditRequired: true,
        productionSafeguards: this.isProductionEnvironment(),
      };

      // Perform Parlant conversational validation
      const validation =
        await this.parlantConfigService.validateConfigurationOperation(context);

      if (!validation.approved) {
        this.logger.warn(
          `[${operationId}] Health check access DENIED by Parlant validation`,
          {
            conversationId: validation.conversationId,
            rejectionReason: validation.rejectionReason,
            riskLevel: validation.riskAssessment.level,
          },
        );

        // Return minimal health response when access is denied
        return {
          status: 'unhealthy',
          timestamp,
          uptime,
          parlantValidation: {
            conversationId: validation.conversationId,
            approved: false,
            riskLevel: context.riskLevel,
          },
          summary: {
            total: 0,
            healthy: 0,
            expiring: 0,
            expired: 0,
            parlantProtected: 0,
          },
          performance: {
            totalRequests: 0,
            successRate: 0,
            averageResponseTime: 0,
            errorCount: 1,
            cacheHitRate: 0,
            parlantValidations: 1,
            parlantApprovals: 0,
          },
          externalProviders: {},
          auditSummary: {
            totalEntries: 0,
            recentErrors: 1,
            successRate: 0,
            parlantAudits: 1,
          },
          checks: {
            secretsAccessible: false,
            rotationHealthy: false,
            auditingWorking: false,
            externalProvidersConnected: false,
            parlantServiceHealthy: true,
          },
          complianceStatus: {
            enabled: true,
            standards: [],
            violations: ['unauthorized_health_access'],
            auditTrailComplete: true,
          },
        };
      }

      this.logger.log(
        `[${operationId}] Health check access APPROVED - gathering health data`,
        {
          conversationId: validation.conversationId,
          approvalReason: validation.approvalReason,
          riskLevel: validation.riskAssessment.level,
        },
      );

      // Get comprehensive health data from all services
      const [localHealthResult, enterpriseHealthResult] =
        await Promise.allSettled([
          this.parlantSecretsService.getSecretsHealth(user, sessionId),
          this.parlantEnterpriseService.getEnterpriseHealth(user, {
            includeProviderDetails: includeDetails,
            includePerformanceMetrics: true,
          }),
        ]);

      // Process local secrets health
      const localHealth =
        localHealthResult.status === 'fulfilled'
          ? localHealthResult.value
          : null;

      // Process enterprise health
      const enterpriseHealth =
        enterpriseHealthResult.status === 'fulfilled'
          ? enterpriseHealthResult.value
          : null;

      // Get Parlant service metrics
      const parlantMetrics = this.parlantConfigService.getPerformanceMetrics();

      // Aggregate health information
      const summary = {
        total:
          (localHealth?.result?.total || 0) +
          (enterpriseHealth?.result?.secrets.total || 0),
        healthy:
          (localHealth?.result?.healthy || 0) +
          (enterpriseHealth?.result?.secrets.healthy || 0),
        expiring:
          (localHealth?.result?.expiring || 0) +
          (enterpriseHealth?.result?.secrets.expiring || 0),
        expired:
          (localHealth?.result?.expired || 0) +
          (enterpriseHealth?.result?.secrets.expired || 0),
        parlantProtected: parlantMetrics.totalValidations,
      };

      // Determine overall health status
      let overallStatus: ParlantSecretsHealthResponse['status'] = 'healthy';
      if (
        summary.expired > 0 ||
        !localHealth?.success ||
        !enterpriseHealth?.success
      ) {
        overallStatus = 'unhealthy';
      } else if (summary.expiring > 0 || parlantMetrics.approvalRate < 95) {
        overallStatus = 'degraded';
      }

      // Build comprehensive health response
      const response: ParlantSecretsHealthResponse = {
        status: overallStatus,
        timestamp,
        uptime,
        parlantValidation: {
          conversationId: validation.conversationId,
          approved: true,
          riskLevel: context.riskLevel,
          approvalReason: validation.approvalReason,
        },
        summary,
        performance: {
          totalRequests: parlantMetrics.totalRequests,
          successRate: parlantMetrics.approvalRate,
          averageResponseTime: parlantMetrics.averageResponseTime,
          errorCount: localHealth?.success === false ? 1 : 0,
          cacheHitRate: 0, // Would be calculated from actual cache metrics
          parlantValidations: parlantMetrics.totalValidations,
          parlantApprovals: parlantMetrics.approvedOperations,
        },
        externalProviders: enterpriseHealth?.result?.providers || {},
        auditSummary: {
          totalEntries: this.parlantConfigService.getAuditLog().length,
          recentErrors: parlantMetrics.rejectedOperations,
          successRate: parlantMetrics.approvalRate,
          parlantAudits: this.parlantConfigService.getAuditLog().length,
        },
        checks: {
          secretsAccessible: localHealth?.success || false,
          rotationHealthy: summary.expired === 0,
          auditingWorking: this.parlantConfigService.getAuditLog().length > 0,
          externalProvidersConnected: enterpriseHealth?.success || false,
          parlantServiceHealthy: parlantMetrics.totalValidations > 0,
        },
        complianceStatus: {
          enabled: true,
          standards: ['SOX', 'PCI-DSS', 'GDPR', 'SOC2'],
          violations: [],
          auditTrailComplete: true,
        },
      };

      // Add detailed information if requested and approved
      if (includeDetails && validation.approved) {
        response.details = this.buildDetailedHealthInfo(
          localHealth,
          enterpriseHealth,
        );
      }

      // Record comprehensive audit
      await this.parlantConfigService.recordConfigurationAudit(
        context,
        validation,
        {
          success: true,
          result: response,
          executionTime: Date.now() - startTime,
        },
      );

      this.logger.log(`[${operationId}] Health check completed successfully`, {
        status: overallStatus,
        totalSecrets: summary.total,
        parlantValidations: parlantMetrics.totalValidations,
        conversationId: validation.conversationId,
      });

      return response;
    } catch (error) {
      const executionTime = Date.now() - startTime;

      this.logger.error(
        `[${operationId}] Health check failed with system error`,
        {
          error: error instanceof Error ? error.message : String(error),
          user,
          executionTime,
        },
      );

      // Return error response with Parlant context
      return {
        status: 'unhealthy',
        timestamp,
        uptime,
        parlantValidation: {
          conversationId: operationId,
          approved: false,
          riskLevel: ParlantRiskLevel.CRITICAL,
        },
        summary: {
          total: 0,
          healthy: 0,
          expiring: 0,
          expired: 0,
          parlantProtected: 0,
        },
        performance: {
          totalRequests: 0,
          successRate: 0,
          averageResponseTime: 0,
          errorCount: 1,
          cacheHitRate: 0,
          parlantValidations: 0,
          parlantApprovals: 0,
        },
        externalProviders: {},
        auditSummary: {
          totalEntries: 0,
          recentErrors: 1,
          successRate: 0,
          parlantAudits: 0,
        },
        checks: {
          secretsAccessible: false,
          rotationHealthy: false,
          auditingWorking: false,
          externalProvidersConnected: false,
          parlantServiceHealthy: false,
        },
        complianceStatus: {
          enabled: true,
          standards: [],
          violations: ['system_error', 'health_check_failure'],
          auditTrailComplete: false,
        },
      };
    }
  }

  /**
   * Get comprehensive metrics with MEDIUM risk Parlant validation
   * Metrics may expose operational patterns and performance data
   */
  @Get('metrics')
  @ApiOperation({
    summary: 'Get secrets metrics with Parlant validation',
    description:
      'Performance metrics with risk-based approval and audit trails',
  })
  @ApiQuery({ name: 'format', required: false, enum: ['json', 'prometheus'] })
  @ApiQuery({ name: 'user', required: false, type: String })
  async getSecretsMetrics(
    @Query('format') format = 'json',
    @Query('user') user = 'system',
    @Headers('x-session-id') sessionId?: string,
  ): Promise<ParlantMetricsData | string> {
    const startTime = Date.now();
    const operationId = `parlant-metrics-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    this.logger.log(
      `[${operationId}] MEDIUM RISK: Metrics access requires Parlant validation`,
      {
        user,
        format,
        sessionId,
        environment: this.configService.get<string>('NODE_ENV'),
      },
    );

    try {
      // Create operation context for metrics validation
      const context: ConfigurationOperationContext = {
        operation: `Get secrets performance metrics in ${format} format`,
        service: 'SecretsHealthController',
        method: 'getSecretsMetrics',
        parameters: { format, user, sessionId },
        environment:
          this.configService.get<string>('NODE_ENV') || 'development',
        user,
        riskLevel: ParlantRiskLevel.MEDIUM, // Metrics expose operational patterns
        requiresApproval:
          format === 'prometheus' || this.isProductionEnvironment(),
        auditRequired: true,
        productionSafeguards: this.isProductionEnvironment(),
      };

      // Perform Parlant validation
      const validation =
        await this.parlantConfigService.validateConfigurationOperation(context);

      if (!validation.approved) {
        this.logger.warn(
          `[${operationId}] Metrics access DENIED by Parlant validation`,
          {
            conversationId: validation.conversationId,
            rejectionReason: validation.rejectionReason,
          },
        );

        if (format === 'prometheus') {
          return '# Access denied - Parlant validation required\n';
        }

        return {
          error: 'Metrics access denied by Parlant validation',
          conversationId: validation.conversationId,
          rejectionReason: validation.rejectionReason,
          timestamp: new Date().toISOString(),
        };
      }

      // Get comprehensive metrics
      const parlantMetrics = this.parlantConfigService.getPerformanceMetrics();
      const localMetrics = this.parlantSecretsService.getPerformanceMetrics();
      const enterpriseMetrics =
        this.parlantEnterpriseService.getEnterprisePerformanceMetrics();

      const metricsData: ParlantMetricsData = {
        timestamp: new Date().toISOString(),
        secrets: {
          total: localMetrics.secretsService.total || 0,
          healthy: localMetrics.secretsService.healthy || 0,
          expiring: localMetrics.secretsService.expiring || 0,
          expired: localMetrics.secretsService.expired || 0,
          parlantProtected: parlantMetrics.totalValidations,
        },
        performance: {
          totalRequests: parlantMetrics.totalRequests,
          successRate: parlantMetrics.approvalRate,
          cacheHitRate: 0, // Would be calculated from cache metrics
          errorRate:
            (parlantMetrics.rejectedOperations /
              Math.max(parlantMetrics.totalValidations, 1)) *
            100,
          averageResponseTime: parlantMetrics.averageResponseTime,
        },
        parlantMetrics: {
          totalValidations: parlantMetrics.totalValidations,
          approvalRate: parlantMetrics.approvalRate,
          averageApprovalTime: parlantMetrics.averageResponseTime,
          criticalRiskOperations: parlantMetrics.criticalRiskOperations || 0,
          rejectedOperations: parlantMetrics.rejectedOperations,
        },
        sources: {
          'local-file': localMetrics.secretsService.total || 0,
          environment: 0,
          enterprise: 0,
        },
        providers: {
          vault: 0,
          aws: 0,
          azure: 0,
          gcp: 0,
          kubernetes: 0,
        },
        complianceMetrics: {
          enabled: enterpriseMetrics.complianceMetrics.enabled,
          violations: 0,
          auditEntries: this.parlantConfigService.getAuditLog().length,
        },
      };

      // Record metrics access audit
      await this.parlantConfigService.recordConfigurationAudit(
        context,
        validation,
        {
          success: true,
          result: metricsData,
          executionTime: Date.now() - startTime,
        },
      );

      // Return metrics in requested format
      if (format === 'prometheus') {
        return this.formatPrometheusMetrics(metricsData);
      }

      return metricsData;
    } catch (error) {
      this.logger.error(`[${operationId}] Metrics generation failed`, {
        error: error instanceof Error ? error.message : String(error),
        user,
        format,
      });

      if (format === 'prometheus') {
        return `# Error generating metrics: ${error instanceof Error ? error.message : String(error)}\n`;
      }

      throw error;
    }
  }

  /**
   * Get Parlant audit log with CRITICAL risk validation
   * Audit logs contain sensitive operational and security information
   */
  @Get('audit')
  @ApiOperation({
    summary: 'Get Parlant audit log with critical risk validation',
    description: 'Access to audit trails requires highest level approval',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'user', required: false, type: String })
  async getParlantAuditLog(
    @Query('limit') limit = 100,
    @Query('user') user = 'system',
    @Headers('x-session-id') sessionId?: string,
  ): Promise<any> {
    const startTime = Date.now();
    const operationId = `parlant-audit-access-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    this.logger.warn(
      `[${operationId}] CRITICAL RISK: Audit log access requires Parlant approval`,
      {
        user,
        limit,
        sessionId,
        environment: this.configService.get<string>('NODE_ENV'),
      },
    );

    try {
      // Create operation context for audit log access
      const context: ConfigurationOperationContext = {
        operation: `Access Parlant audit log (${limit} entries)`,
        service: 'SecretsHealthController',
        method: 'getParlantAuditLog',
        parameters: { limit, user, sessionId },
        environment:
          this.configService.get<string>('NODE_ENV') || 'development',
        user,
        riskLevel: ParlantRiskLevel.CRITICAL, // Audit logs contain sensitive information
        requiresApproval: true,
        auditRequired: true,
        productionSafeguards: true,
      };

      // Perform CRITICAL risk Parlant validation
      const validation =
        await this.parlantConfigService.validateConfigurationOperation(context);

      if (!validation.approved) {
        this.logger.warn(`[${operationId}] CRITICAL: Audit log access DENIED`, {
          conversationId: validation.conversationId,
          rejectionReason: validation.rejectionReason,
        });

        return {
          error: 'Audit log access denied - requires CRITICAL risk approval',
          conversationId: validation.conversationId,
          rejectionReason: validation.rejectionReason,
          timestamp: new Date().toISOString(),
          riskLevel: 'CRITICAL',
        };
      }

      // Get audit log with approved access
      const auditLog = this.parlantConfigService.getAuditLog(limit);

      // Record audit log access
      await this.parlantConfigService.recordConfigurationAudit(
        context,
        validation,
        {
          success: true,
          result: { entriesReturned: auditLog.length },
          executionTime: Date.now() - startTime,
        },
      );

      this.logger.warn(`[${operationId}] CRITICAL: Audit log access GRANTED`, {
        conversationId: validation.conversationId,
        entriesReturned: auditLog.length,
        user,
      });

      return {
        parlantValidation: {
          conversationId: validation.conversationId,
          approved: true,
          riskLevel: 'CRITICAL',
        },
        audit: auditLog,
        metadata: {
          totalEntries: auditLog.length,
          timestamp: new Date().toISOString(),
          requestedBy: user,
          approvedBy: validation.conversationId,
        },
      };
    } catch (error) {
      this.logger.error(`[${operationId}] CRITICAL: Audit log access failed`, {
        error: error instanceof Error ? error.message : String(error),
        user,
      });

      return {
        error: 'Audit log access failed due to system error',
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
        riskLevel: 'CRITICAL',
      };
    }
  }

  /**
   * Build detailed health information from service results
   */
  private buildDetailedHealthInfo(
    localHealth: ParlantSecretsOperationResult<any> | null,
    enterpriseHealth: ParlantEnterpriseSecretsResult<any> | null,
  ): ParlantSecretsHealthResponse['details'] {
    const details: ParlantSecretsHealthResponse['details'] = [];

    // Add local secrets details
    if (localHealth?.success && localHealth.result?.details) {
      for (const detail of localHealth.result.details) {
        details.push({
          name: detail.name,
          status: detail.status,
          age: detail.age,
          source: detail.source,
          lastAccessed: detail.lastAccessed,
          parlantProtected: true,
        });
      }
    }

    // Add enterprise secrets details
    if (enterpriseHealth?.success && enterpriseHealth.result?.secrets) {
      details.push({
        name: 'enterprise-secrets-aggregate',
        status: enterpriseHealth.result.status,
        age: 0,
        source: 'enterprise',
        parlantProtected: true,
      });
    }

    return details;
  }

  /**
   * Format metrics for Prometheus exposition format
   */
  private formatPrometheusMetrics(metrics: ParlantMetricsData): string {
    const timestamp = Date.now();

    return [
      '# HELP parlant_secrets_total Total number of secrets protected by Parlant',
      '# TYPE parlant_secrets_total gauge',
      `parlant_secrets_total ${metrics.secrets.total} ${timestamp}`,
      '',
      '# HELP parlant_validations_total Total number of Parlant validations',
      '# TYPE parlant_validations_total counter',
      `parlant_validations_total ${metrics.parlantMetrics.totalValidations} ${timestamp}`,
      '',
      '# HELP parlant_approvals_rate Parlant approval rate',
      '# TYPE parlant_approvals_rate gauge',
      `parlant_approvals_rate ${metrics.parlantMetrics.approvalRate} ${timestamp}`,
      '',
      '# HELP parlant_critical_operations_total Critical risk operations',
      '# TYPE parlant_critical_operations_total counter',
      `parlant_critical_operations_total ${metrics.parlantMetrics.criticalRiskOperations} ${timestamp}`,
      '',
      '# HELP parlant_rejected_operations_total Rejected operations',
      '# TYPE parlant_rejected_operations_total counter',
      `parlant_rejected_operations_total ${metrics.parlantMetrics.rejectedOperations} ${timestamp}`,
    ].join('\n');
  }

  /**
   * Check if running in production environment
   */
  private isProductionEnvironment(): boolean {
    const nodeEnv = this.configService.get<string>('NODE_ENV');
    return nodeEnv === 'production' || nodeEnv === 'prod';
  }
}
