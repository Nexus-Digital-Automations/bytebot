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

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { SecurityMonitoringService } from './security-monitoring.service';
import { SecurityAlertsService } from './security-alerts.service';
// import { ThreatIntelligenceService } from './threat-intelligence.service'; // TODO: Create this service
// import { SecurityMetricsService } from './security-metrics.service'; // TODO: Create this service
// import { SecurityMonitoringController } from './security-monitoring.controller'; // TODO: Create this controller
import { PrismaModule } from '../prisma/prisma.module';

/**
 * Security Monitoring Module
 * Provides comprehensive security monitoring and threat detection capabilities
 */
@Module({
  imports: [ConfigModule, EventEmitterModule, ScheduleModule, PrismaModule],
  controllers: [
    /* SecurityMonitoringController */
  ], // TODO: Create this controller
  providers: [
    SecurityMonitoringService,
    SecurityAlertsService,
    // ThreatIntelligenceService, // TODO: Create this service
    // SecurityMetricsService, // TODO: Create this service
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
            enabled: Boolean(
              configService.get<boolean>('SECURITY_MONITORING_ENABLED', true),
            ),
            threatDetection: Boolean(
              configService.get<boolean>('THREAT_DETECTION_ENABLED', true),
            ),
            anomalyDetection: Boolean(
              configService.get<boolean>('ANOMALY_DETECTION_ENABLED', true),
            ),
            automatedResponse: Boolean(
              configService.get<boolean>('AUTOMATED_RESPONSE_ENABLED', false),
            ),
            alerting: Boolean(
              configService.get<boolean>('SECURITY_ALERTING_ENABLED', true),
            ),
          },
          threatIntelligence: {
            enabled: Boolean(
              configService.get<boolean>('THREAT_INTELLIGENCE_ENABLED', true),
            ),
            sources: String(
              configService.get<string>('THREAT_INTEL_SOURCES', ''),
            )
              .split(',')
              .filter(Boolean),
            updateInterval: parseInt(
              String(
                configService.get<string>(
                  'THREAT_INTEL_UPDATE_INTERVAL',
                  '3600',
                ),
              ),
              10,
            ),
          },
          metrics: {
            collection: Boolean(
              configService.get<boolean>('SECURITY_METRICS_ENABLED', true),
            ),
            retentionDays: parseInt(
              String(
                configService.get<string>('SECURITY_METRICS_RETENTION', '30'),
              ),
              10,
            ),
            aggregationInterval: parseInt(
              String(
                configService.get<string>(
                  'METRICS_AGGREGATION_INTERVAL',
                  '300',
                ),
              ),
              10,
            ),
          },
          alerts: {
            enabled: Boolean(
              configService.get<boolean>('SECURITY_ALERTS_ENABLED', true),
            ),
            channels: String(
              configService.get<string>('ALERT_CHANNELS', 'email,webhook'),
            ).split(','),
            severity: String(
              configService.get<string>('MIN_ALERT_SEVERITY', 'MEDIUM'),
            ),
            throttling: {
              enabled: Boolean(
                configService.get<boolean>('ALERT_THROTTLING_ENABLED', true),
              ),
              window: parseInt(
                String(
                  configService.get<string>('ALERT_THROTTLE_WINDOW', '300'),
                ),
                10,
              ),
              maxAlerts: parseInt(
                String(configService.get<string>('ALERT_THROTTLE_MAX', '10')),
                10,
              ),
            },
          },
          _response: {
            automated: Boolean(
              configService.get<boolean>('AUTOMATED_RESPONSE_ENABLED', false),
            ),
            actions: {
              blockIp: Boolean(
                configService.get<boolean>('RESPONSE_BLOCK_IP', true),
              ),
              lockAccount: Boolean(
                configService.get<boolean>('RESPONSE_LOCK_ACCOUNT', false),
              ),
              alertTeam: Boolean(
                configService.get<boolean>('RESPONSE_ALERT_TEAM', true),
              ),
              auditLog: Boolean(
                configService.get<boolean>('RESPONSE_AUDIT_LOG', true),
              ),
            },
            confirmationRequired: Boolean(
              configService.get<boolean>(
                'RESPONSE_CONFIRMATION_REQUIRED',
                true,
              ),
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
    // ThreatIntelligenceService, // TODO: Create this service
    // SecurityMetricsService, // TODO: Create this service
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
      monitoringEnabled: Boolean(
        this.configService.get<boolean>('SECURITY_MONITORING_ENABLED', true),
      ),
      threatDetectionEnabled: Boolean(
        this.configService.get<boolean>('THREAT_DETECTION_ENABLED', true),
      ),
      anomalyDetectionEnabled: Boolean(
        this.configService.get<boolean>('ANOMALY_DETECTION_ENABLED', true),
      ),
      automatedResponseEnabled: Boolean(
        this.configService.get<boolean>('AUTOMATED_RESPONSE_ENABLED', false),
      ),
      alertingEnabled: Boolean(
        this.configService.get<boolean>('SECURITY_ALERTING_ENABLED', true),
      ),
      metricsEnabled: Boolean(
        this.configService.get<boolean>('SECURITY_METRICS_ENABLED', true),
      ),
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
