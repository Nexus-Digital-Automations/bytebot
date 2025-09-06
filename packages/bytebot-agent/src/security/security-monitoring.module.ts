/**
 * Security Monitoring Module - Comprehensive security monitoring and threat detection
 * Configures advanced security monitoring system with real-time threat detection
 *
 * Features:
 * - Security event processing and correlation
 * - Real-time threat detection and response
 * - Security metrics collection and monitoring
 * - Incident management and alerting
 * - Threat intelligence integration
 *
 * @author Security Monitoring & Threat Detection Specialist
 * @version 1.0.0
 * @since Phase 1: Bytebot API Security Enhancement
 */

import { Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { SecurityMonitoringService } from './security-monitoring.service';
import { SecurityAlertsService } from './security-alerts.service';
import { ThreatIntelligenceService } from './threat-intelligence.service';
import { SecurityMetricsService } from './security-metrics.service';
import { SecurityMonitoringController } from './security-monitoring.controller';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * Security Monitoring Module
 * Provides comprehensive security monitoring and threat detection capabilities
 */
@Module({
  imports: [ConfigModule, EventEmitterModule, ScheduleModule, PrismaModule],
  controllers: [SecurityMonitoringController],
  providers: [
    SecurityMonitoringService,
    SecurityAlertsService,
    ThreatIntelligenceService,
    SecurityMetricsService,
    {
      provide: 'SECURITY_CONFIG',
      useFactory: (configService: ConfigService) => {
        const logger = new Logger('SecurityMonitoringModule');
        const operationId = `security-config-${Date.now()}`;

        logger.log(
          `[${operationId}] Loading security monitoring configuration...`,
        );

        const config = {
          monitoring: {
            enabled: configService.get('SECURITY_MONITORING_ENABLED', true),
            threatDetection: configService.get(
              'THREAT_DETECTION_ENABLED',
              true,
            ),
            anomalyDetection: configService.get(
              'ANOMALY_DETECTION_ENABLED',
              true,
            ),
            automatedResponse: configService.get(
              'AUTOMATED_RESPONSE_ENABLED',
              false,
            ),
            alerting: configService.get('SECURITY_ALERTING_ENABLED', true),
          },
          threatIntelligence: {
            enabled: configService.get('THREAT_INTELLIGENCE_ENABLED', true),
            sources: configService
              .get('THREAT_INTEL_SOURCES', '')
              .split(',')
              .filter(Boolean),
            updateInterval: parseInt(
              configService.get('THREAT_INTEL_UPDATE_INTERVAL', '3600'),
              10,
            ),
          },
          metrics: {
            collection: configService.get('SECURITY_METRICS_ENABLED', true),
            retentionDays: parseInt(
              configService.get('SECURITY_METRICS_RETENTION', '30'),
              10,
            ),
            aggregationInterval: parseInt(
              configService.get('METRICS_AGGREGATION_INTERVAL', '300'),
              10,
            ),
          },
          alerts: {
            enabled: configService.get('SECURITY_ALERTS_ENABLED', true),
            channels: configService
              .get('ALERT_CHANNELS', 'email,webhook')
              .split(','),
            severity: configService.get('MIN_ALERT_SEVERITY', 'MEDIUM'),
            throttling: {
              enabled: configService.get('ALERT_THROTTLING_ENABLED', true),
              window: parseInt(
                configService.get('ALERT_THROTTLE_WINDOW', '300'),
                10,
              ),
              maxAlerts: parseInt(
                configService.get('ALERT_THROTTLE_MAX', '10'),
                10,
              ),
            },
          },
          response: {
            automated: configService.get('AUTOMATED_RESPONSE_ENABLED', false),
            actions: {
              blockIp: configService.get('RESPONSE_BLOCK_IP', true),
              lockAccount: configService.get('RESPONSE_LOCK_ACCOUNT', false),
              alertTeam: configService.get('RESPONSE_ALERT_TEAM', true),
              auditLog: configService.get('RESPONSE_AUDIT_LOG', true),
            },
            confirmationRequired: configService.get(
              'RESPONSE_CONFIRMATION_REQUIRED',
              true,
            ),
          },
        };

        logger.log(
          `[${operationId}] Security monitoring configuration loaded`,
          {
            operationId,
            monitoringEnabled: config.monitoring.enabled,
            threatDetectionEnabled: config.monitoring.threatDetection,
            automatedResponseEnabled: config.monitoring.automatedResponse,
            threatIntelSources: config.threatIntelligence.sources.length,
            alertChannels: config.alerts.channels.length,
          },
        );

        // Validate configuration
        if (
          config.monitoring.automatedResponse &&
          !config.response.confirmationRequired
        ) {
          logger.warn(
            `[${operationId}] Automated response enabled without confirmation - potential security risk`,
          );
        }

        if (
          config.threatIntelligence.enabled &&
          config.threatIntelligence.sources.length === 0
        ) {
          logger.warn(
            `[${operationId}] Threat intelligence enabled but no sources configured`,
          );
        }

        return config;
      },
      inject: [ConfigService],
    },
  ],
  exports: [
    SecurityMonitoringService,
    SecurityAlertsService,
    ThreatIntelligenceService,
    SecurityMetricsService,
  ],
})
export class SecurityMonitoringModule {
  private readonly logger = new Logger(SecurityMonitoringModule.name);

  constructor(private readonly configService: ConfigService) {
    const operationId = `security-monitoring-module-init-${Date.now()}`;
    const startTime = Date.now();

    this.logger.log(
      `[${operationId}] Security Monitoring Module initializing...`,
    );

    // Log module initialization status
    const securityConfig = {
      monitoringEnabled: this.configService.get(
        'SECURITY_MONITORING_ENABLED',
        true,
      ),
      threatDetectionEnabled: this.configService.get(
        'THREAT_DETECTION_ENABLED',
        true,
      ),
      anomalyDetectionEnabled: this.configService.get(
        'ANOMALY_DETECTION_ENABLED',
        true,
      ),
      automatedResponseEnabled: this.configService.get(
        'AUTOMATED_RESPONSE_ENABLED',
        false,
      ),
      alertingEnabled: this.configService.get(
        'SECURITY_ALERTING_ENABLED',
        true,
      ),
      metricsEnabled: this.configService.get('SECURITY_METRICS_ENABLED', true),
    };

    const initTime = Date.now() - startTime;
    this.logger.log(
      `[${operationId}] Security Monitoring Module initialized successfully`,
      {
        operationId,
        initTimeMs: initTime,
        configuration: securityConfig,
      },
    );

    // Log security warnings if needed
    if (!securityConfig.monitoringEnabled) {
      this.logger.warn(
        `[${operationId}] Security monitoring is disabled - potential security risk`,
      );
    }

    if (!securityConfig.threatDetectionEnabled) {
      this.logger.warn(
        `[${operationId}] Threat detection is disabled - reduced security posture`,
      );
    }

    if (securityConfig.automatedResponseEnabled) {
      this.logger.log(
        `[${operationId}] Automated response is enabled - enhanced security protection`,
      );
    }
  }
}
