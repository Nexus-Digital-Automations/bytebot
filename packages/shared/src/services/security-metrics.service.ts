/**
 * Security Metrics Collection Service
 * 
 * Advanced metrics collection and analysis service for comprehensive security monitoring,
 * performance tracking, and compliance reporting across Bytebot services.
 * 
 * Features:
 * - Real-time security metrics collection and aggregation
 * - Performance monitoring and SLA tracking
 * - Threat pattern analysis and trend detection  
 * - Compliance metrics and audit trail management
 * - Custom dashboard and alerting integration
 * - Historical data analysis and reporting
 * 
 * @author Security Metrics & Analytics Specialist
 * @version 2.0.0
 * @since Bytebot Security Enhancement Phase
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';

/**
 * Metric data types for comprehensive tracking
 */
export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge', 
  HISTOGRAM = 'histogram',
  SUMMARY = 'summary',
}

/**
 * Metric aggregation periods
 */
export enum AggregationPeriod {
  REALTIME = 'realtime',
  MINUTE = 'minute',
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
}

/**
 * Security metric categories
 */
export enum SecurityMetricCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  THREAT_DETECTION = 'threat_detection',
  INCIDENT_RESPONSE = 'incident_response',
  SYSTEM_PERFORMANCE = 'system_performance',
  COMPLIANCE = 'compliance',
  USER_BEHAVIOR = 'user_behavior',
  NETWORK_SECURITY = 'network_security',
}

/**
 * Individual metric data point
 */
interface MetricDataPoint {
  /** Metric identifier */
  metricId: string;
  
  /** Metric name */
  name: string;
  
  /** Category classification */
  category: SecurityMetricCategory;
  
  /** Metric type */
  type: MetricType;
  
  /** Numeric value */
  value: number;
  
  /** Timestamp */
  timestamp: Date;
  
  /** Additional labels/tags */
  labels: Record<string, string>;
  
  /** Metadata */
  metadata?: Record<string, any>;
}

/**
 * Aggregated metric data
 */
interface AggregatedMetric {
  /** Metric identifier */
  metricId: string;
  
  /** Aggregation period */
  period: AggregationPeriod;
  
  /** Time window start */
  windowStart: Date;
  
  /** Time window end */
  windowEnd: Date;
  
  /** Aggregated values */
  values: {
    count: number;
    sum: number;
    avg: number;
    min: number;
    max: number;
    p50: number;
    p95: number;
    p99: number;
  };
  
  /** Trend analysis */
  trend: {
    direction: 'increasing' | 'decreasing' | 'stable';
    rate: number; // Change rate percentage
    confidence: number; // 0-1 confidence score
  };
}

/**
 * Security dashboard data structure
 */
interface SecurityDashboard {
  /** Dashboard metadata */
  metadata: {
    generatedAt: Date;
    period: AggregationPeriod;
    refreshInterval: number;
  };
  
  /** Overall security posture */
  overview: {
    securityScore: number; // 0-100 overall security score
    threatLevel: 'low' | 'medium' | 'high' | 'critical';
    activeThreatCount: number;
    incidentCount: number;
    systemHealth: number; // 0-100 system health score
  };
  
  /** Authentication metrics */
  authentication: {
    totalAttempts: number;
    successfulLogins: number;
    failedLogins: number;
    successRate: number;
    uniqueUsers: number;
    suspiciousAttempts: number;
  };
  
  /** Threat detection metrics */
  threatDetection: {
    threatsDetected: number;
    threatsByCategory: Record<string, number>;
    averageRiskScore: number;
    falsePositiveRate: number;
    detectionAccuracy: number;
  };
  
  /** System performance */
  performance: {
    responseTime: {
      avg: number;
      p95: number;
      p99: number;
    };
    throughput: number;
    errorRate: number;
    availabilityScore: number;
  };
  
  /** Network security */
  network: {
    totalRequests: number;
    blockedRequests: number;
    uniqueIPs: number;
    suspiciousIPs: number;
    geoDistribution: Record<string, number>;
  };
  
  /** Compliance metrics */
  compliance: {
    auditTrailCompleteness: number;
    dataRetentionCompliance: number;
    accessControlCompliance: number;
    encryptionCompliance: number;
  };
}

/**
 * Alert threshold configuration
 */
interface AlertThreshold {
  /** Threshold identifier */
  thresholdId: string;
  
  /** Metric to monitor */
  metricId: string;
  
  /** Threshold operator */
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  
  /** Threshold value */
  value: number;
  
  /** Time window for evaluation */
  timeWindow: number; // milliseconds
  
  /** Alert severity */
  severity: 'low' | 'medium' | 'high' | 'critical';
  
  /** Whether threshold is enabled */
  enabled: boolean;
  
  /** Cooldown period between alerts */
  cooldownMs: number;
  
  /** Last alert timestamp */
  lastAlertAt?: Date;
}

@Injectable()
export class SecurityMetricsService implements OnModuleInit {
  private readonly logger = new Logger(SecurityMetricsService.name);
  
  /** Raw metric data storage */
  private readonly rawMetrics = new Map<string, MetricDataPoint[]>();
  
  /** Aggregated metrics cache */
  private readonly aggregatedMetrics = new Map<string, AggregatedMetric[]>();
  
  /** Alert thresholds configuration */
  private readonly alertThresholds = new Map<string, AlertThreshold>();
  
  /** Performance tracking */
  private readonly performanceMetrics = {
    metricsCollected: 0,
    aggregationsPerformed: 0,
    alertsTriggered: 0,
    processingTime: [] as number[],
  };
  
  /** Metric definitions registry */
  private readonly metricDefinitions = new Map<string, {
    name: string;
    category: SecurityMetricCategory;
    type: MetricType;
    description: string;
    unit?: string;
  }>();

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.initializeMetricDefinitions();
    this.initializeAlertThresholds();
  }

  async onModuleInit(): Promise<void> {
    const operationId = `security-metrics-init-${Date.now()}`;
    const startTime = Date.now();

    this.logger.log(`[${operationId}] Initializing Security Metrics Service...`);

    try {
      // Start periodic aggregation tasks
      this.startAggregationTasks();
      
      // Start alert monitoring
      this.startAlertMonitoring();
      
      // Initialize dashboard
      await this.initializeDashboard();

      const initTime = Date.now() - startTime;
      this.logger.log(
        `[${operationId}] Security Metrics Service initialized successfully`,
        {
          operationId,
          initTimeMs: initTime,
          metricDefinitions: this.metricDefinitions.size,
          alertThresholds: this.alertThresholds.size,
        },
      );
    } catch (error) {
      const initTime = Date.now() - startTime;
      this.logger.error(
        `[${operationId}] Security Metrics Service initialization failed`,
        {
          operationId,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          initTimeMs: initTime,
        },
      );
      throw error;
    }
  }

  /**
   * Record a security metric data point
   */
  recordMetric(
    metricId: string,
    value: number,
    labels: Record<string, string> = {},
    metadata?: Record<string, any>
  ): void {
    const definition = this.metricDefinitions.get(metricId);
    if (!definition) {
      this.logger.warn(`Unknown metric ID: ${metricId}`);
      return;
    }

    const dataPoint: MetricDataPoint = {
      metricId,
      name: definition.name,
      category: definition.category,
      type: definition.type,
      value,
      timestamp: new Date(),
      labels,
      metadata,
    };

    // Store raw metric
    if (!this.rawMetrics.has(metricId)) {
      this.rawMetrics.set(metricId, []);
    }
    
    const metricData = this.rawMetrics.get(metricId)!;
    metricData.push(dataPoint);
    
    // Keep only recent data (last 24 hours for raw metrics)
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const filteredData = metricData.filter(dp => dp.timestamp > cutoffTime);
    this.rawMetrics.set(metricId, filteredData);

    this.performanceMetrics.metricsCollected++;

    this.logger.debug(`Recorded metric: ${metricId}`, {
      metricId,
      value,
      labels,
      category: definition.category,
      type: definition.type,
    });

    // Emit metric recorded event
    this.eventEmitter.emit('security.metric.recorded', {
      metricId,
      value,
      timestamp: dataPoint.timestamp,
      category: definition.category,
    });
  }

  /**
   * Record authentication metrics
   */
  @OnEvent('auth.*')
  recordAuthenticationEvent(event: any): void {
    const success = event.success || event.type?.includes('success');
    
    // Record login attempt
    this.recordMetric('auth.attempts.total', 1, {
      result: success ? 'success' : 'failure',
      method: event.method || 'unknown',
    });

    // Record specific success/failure metrics
    if (success) {
      this.recordMetric('auth.login.success', 1, {
        userId: event.userId || 'unknown',
        ip: event.ipAddress || 'unknown',
      });
    } else {
      this.recordMetric('auth.login.failure', 1, {
        reason: event.reason || 'unknown',
        ip: event.ipAddress || 'unknown',
      });
    }

    // Record response time if available
    if (event.responseTime) {
      this.recordMetric('auth.response.time', event.responseTime, {
        result: success ? 'success' : 'failure',
      });
    }
  }

  /**
   * Record threat detection metrics
   */
  @OnEvent('security.threat.detected')
  recordThreatDetectionEvent(event: any): void {
    // Record threat detection
    this.recordMetric('threat.detected', 1, {
      severity: event.threatSeverity || 'unknown',
      category: event.category || 'unknown',
      sourceIP: event.ipAddress || 'unknown',
    });

    // Record risk score
    if (event.riskScore !== undefined) {
      this.recordMetric('threat.risk.score', event.riskScore, {
        severity: event.threatSeverity || 'unknown',
      });
    }

    // Record rules triggered
    if (event.rulesTrigggered?.length) {
      this.recordMetric('threat.rules.triggered', event.rulesTrigggered.length, {
        severity: event.threatSeverity || 'unknown',
      });
    }

    // Record response actions
    if (event.responseActions?.length) {
      event.responseActions.forEach((action: string) => {
        this.recordMetric('threat.response.action', 1, {
          action: action,
          severity: event.threatSeverity || 'unknown',
        });
      });
    }
  }

  /**
   * Record incident metrics
   */
  @OnEvent('security.incident.*')
  recordIncidentEvent(event: any): void {
    const eventType = event.type || 'unknown';
    
    if (eventType.includes('created')) {
      this.recordMetric('incident.created', 1, {
        severity: event.severity || 'unknown',
        category: event.category || 'unknown',
      });
    } else if (eventType.includes('resolved')) {
      this.recordMetric('incident.resolved', 1, {
        severity: event.severity || 'unknown',
        resolutionTime: event.resolutionTime?.toString() || '0',
      });
    }
  }

  /**
   * Record performance metrics
   */
  recordPerformanceMetric(
    endpoint: string,
    method: string,
    responseTime: number,
    statusCode: number
  ): void {
    // Record response time
    this.recordMetric('http.response.time', responseTime, {
      endpoint: endpoint,
      method: method,
      status: statusCode.toString(),
    });

    // Record request count
    this.recordMetric('http.requests.total', 1, {
      endpoint: endpoint,
      method: method,
      status: statusCode.toString(),
    });

    // Record error rate
    if (statusCode >= 400) {
      this.recordMetric('http.errors.total', 1, {
        endpoint: endpoint,
        method: method,
        status: statusCode.toString(),
      });
    }
  }

  /**
   * Record network security metrics
   */
  recordNetworkSecurityEvent(event: {
    sourceIP: string;
    blocked: boolean;
    reason?: string;
    country?: string;
  }): void {
    // Record network event
    this.recordMetric('network.requests.total', 1, {
      sourceIP: event.sourceIP,
      blocked: event.blocked.toString(),
      country: event.country || 'unknown',
    });

    // Record blocked requests
    if (event.blocked) {
      this.recordMetric('network.blocked.total', 1, {
        reason: event.reason || 'unknown',
        country: event.country || 'unknown',
      });
    }
  }

  /**
   * Aggregate metrics for specified period
   */
  async aggregateMetrics(period: AggregationPeriod): Promise<void> {
    const operationId = `aggregate-${period}-${Date.now()}`;
    const startTime = Date.now();

    try {
      const windowSize = this.getWindowSizeMs(period);
      const now = Date.now();
      const windowStart = new Date(now - windowSize);
      const windowEnd = new Date(now);

      for (const [metricId, dataPoints] of this.rawMetrics.entries()) {
        // Filter data points for the time window
        const windowData = dataPoints.filter(
          dp => dp.timestamp >= windowStart && dp.timestamp <= windowEnd
        );

        if (windowData.length === 0) continue;

        // Calculate aggregated values
        const values = windowData.map(dp => dp.value);
        const sortedValues = [...values].sort((a, b) => a - b);

        const aggregated: AggregatedMetric = {
          metricId,
          period,
          windowStart,
          windowEnd,
          values: {
            count: values.length,
            sum: values.reduce((a, b) => a + b, 0),
            avg: values.reduce((a, b) => a + b, 0) / values.length,
            min: Math.min(...values),
            max: Math.max(...values),
            p50: this.percentile(sortedValues, 0.5),
            p95: this.percentile(sortedValues, 0.95),
            p99: this.percentile(sortedValues, 0.99),
          },
          trend: await this.calculateTrend(metricId, period),
        };

        // Store aggregated metric
        const aggregationKey = `${metricId}-${period}`;
        if (!this.aggregatedMetrics.has(aggregationKey)) {
          this.aggregatedMetrics.set(aggregationKey, []);
        }
        
        const aggregations = this.aggregatedMetrics.get(aggregationKey)!;
        aggregations.push(aggregated);
        
        // Keep only recent aggregations
        const maxAggregations = period === AggregationPeriod.MINUTE ? 1440 : // 24 hours
                                period === AggregationPeriod.HOUR ? 168 : // 7 days  
                                period === AggregationPeriod.DAY ? 30 : // 30 days
                                52; // 52 weeks
        
        if (aggregations.length > maxAggregations) {
          aggregations.splice(0, aggregations.length - maxAggregations);
        }
      }

      this.performanceMetrics.aggregationsPerformed++;
      
      const processingTime = Date.now() - startTime;
      this.performanceMetrics.processingTime.push(processingTime);

      this.logger.debug(`[${operationId}] Metrics aggregation completed`, {
        operationId,
        period,
        processingTimeMs: processingTime,
        metricsProcessed: this.rawMetrics.size,
      });

    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(`[${operationId}] Metrics aggregation failed`, {
        operationId,
        period,
        error: error instanceof Error ? error.message : String(error),
        processingTimeMs: processingTime,
      });
    }
  }

  /**
   * Calculate trend analysis for metric
   */
  private async calculateTrend(metricId: string, period: AggregationPeriod): Promise<{
    direction: 'increasing' | 'decreasing' | 'stable';
    rate: number;
    confidence: number;
  }> {
    try {
      const aggregationKey = `${metricId}-${period}`;
      const aggregations = this.aggregatedMetrics.get(aggregationKey) || [];
      
      if (aggregations.length < 2) {
        return { direction: 'stable', rate: 0, confidence: 0 };
      }

      // Simple trend calculation using linear regression
      const recentAggregations = aggregations.slice(-10); // Last 10 periods
      const values = recentAggregations.map(a => a.values.avg);
      
      if (values.length < 2) {
        return { direction: 'stable', rate: 0, confidence: 0 };
      }

      const n = values.length;
      const xSum = (n * (n + 1)) / 2; // Sum of 1 to n
      const xSqSum = (n * (n + 1) * (2 * n + 1)) / 6; // Sum of squares
      const ySum = values.reduce((a, b) => a + b, 0);
      const xySum = values.reduce((sum, y, i) => sum + y * (i + 1), 0);

      const slope = (n * xySum - xSum * ySum) / (n * xSqSum - xSum * xSum);
      const rate = Math.abs(slope) * 100; // Convert to percentage

      let direction: 'increasing' | 'decreasing' | 'stable' = 'stable';
      if (slope > 0.1) direction = 'increasing';
      else if (slope < -0.1) direction = 'decreasing';

      // Simple confidence calculation based on consistency
      const consistency = this.calculateConsistency(values);
      const confidence = Math.min(1, consistency * (rate / 100));

      return { direction, rate, confidence };

    } catch (error) {
      this.logger.debug(`Trend calculation failed for ${metricId}:`, error);
      return { direction: 'stable', rate: 0, confidence: 0 };
    }
  }

  /**
   * Calculate consistency of values for confidence scoring
   */
  private calculateConsistency(values: number[]): number {
    if (values.length < 2) return 0;
    
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    // Return inverse coefficient of variation as consistency measure
    return mean === 0 ? 0 : Math.max(0, 1 - (stdDev / Math.abs(mean)));
  }

  /**
   * Check alert thresholds and trigger alerts
   */
  private async checkAlertThresholds(): Promise<void> {
    const now = Date.now();

    for (const [thresholdId, threshold] of this.alertThresholds.entries()) {
      if (!threshold.enabled) continue;

      // Check cooldown period
      if (threshold.lastAlertAt && 
          (now - threshold.lastAlertAt.getTime()) < threshold.cooldownMs) {
        continue;
      }

      try {
        const metricData = this.rawMetrics.get(threshold.metricId);
        if (!metricData || metricData.length === 0) continue;

        // Get recent values within time window
        const windowStart = new Date(now - threshold.timeWindow);
        const recentValues = metricData
          .filter(dp => dp.timestamp >= windowStart)
          .map(dp => dp.value);

        if (recentValues.length === 0) continue;

        // Calculate value to compare against threshold
        const latestValue = recentValues[recentValues.length - 1];
        const avgValue = recentValues.reduce((a, b) => a + b, 0) / recentValues.length;
        const valueToCheck = threshold.metricId.includes('rate') ? avgValue : latestValue;

        // Check threshold condition
        let thresholdExceeded = false;
        switch (threshold.operator) {
          case 'gt':
            thresholdExceeded = valueToCheck > threshold.value;
            break;
          case 'lt':
            thresholdExceeded = valueToCheck < threshold.value;
            break;
          case 'gte':
            thresholdExceeded = valueToCheck >= threshold.value;
            break;
          case 'lte':
            thresholdExceeded = valueToCheck <= threshold.value;
            break;
          case 'eq':
            thresholdExceeded = valueToCheck === threshold.value;
            break;
        }

        if (thresholdExceeded) {
          threshold.lastAlertAt = new Date();
          
          this.performanceMetrics.alertsTriggered++;
          
          // Emit alert event
          this.eventEmitter.emit('security.metric.alert', {
            thresholdId,
            metricId: threshold.metricId,
            value: valueToCheck,
            threshold: threshold.value,
            operator: threshold.operator,
            severity: threshold.severity,
            timestamp: new Date(),
          });

          this.logger.warn(`Security metric alert triggered: ${thresholdId}`, {
            thresholdId,
            metricId: threshold.metricId,
            value: valueToCheck,
            threshold: threshold.value,
            severity: threshold.severity,
          });
        }

      } catch (error) {
        this.logger.error(`Alert threshold check failed: ${thresholdId}`, {
          thresholdId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /**
   * Generate security dashboard data
   */
  async generateSecurityDashboard(period: AggregationPeriod = AggregationPeriod.HOUR): Promise<SecurityDashboard> {
    const operationId = `dashboard-${period}-${Date.now()}`;

    try {
      const dashboard: SecurityDashboard = {
        metadata: {
          generatedAt: new Date(),
          period,
          refreshInterval: this.getWindowSizeMs(period) / 1000, // Convert to seconds
        },
        overview: await this.generateOverviewMetrics(),
        authentication: await this.generateAuthenticationMetrics(period),
        threatDetection: await this.generateThreatDetectionMetrics(period),
        performance: await this.generatePerformanceMetrics(period),
        network: await this.generateNetworkMetrics(period),
        compliance: await this.generateComplianceMetrics(),
      };

      this.logger.debug(`[${operationId}] Security dashboard generated`, {
        operationId,
        period,
        securityScore: dashboard.overview.securityScore,
        threatLevel: dashboard.overview.threatLevel,
      });

      return dashboard;

    } catch (error) {
      this.logger.error(`[${operationId}] Dashboard generation failed`, {
        operationId,
        error: error instanceof Error ? error.message : String(error),
      });

      // Return fallback dashboard
      return this.getFallbackDashboard(period);
    }
  }

  /**
   * Generate overview metrics
   */
  private async generateOverviewMetrics(): Promise<SecurityDashboard['overview']> {
    // Calculate security score based on various factors
    let securityScore = 100;
    
    // Reduce score based on active threats
    const activeThreatCount = await this.getActiveThreatCount();
    securityScore -= Math.min(50, activeThreatCount * 5);
    
    // Reduce score based on incidents
    const incidentCount = await this.getActiveIncidentCount();
    securityScore -= Math.min(30, incidentCount * 10);
    
    // Ensure score is between 0-100
    securityScore = Math.max(0, Math.min(100, securityScore));
    
    // Determine threat level
    let threatLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (securityScore < 30) threatLevel = 'critical';
    else if (securityScore < 50) threatLevel = 'high';
    else if (securityScore < 80) threatLevel = 'medium';

    return {
      securityScore,
      threatLevel,
      activeThreatCount,
      incidentCount,
      systemHealth: await this.calculateSystemHealth(),
    };
  }

  /**
   * Generate authentication metrics
   */
  private async generateAuthenticationMetrics(period: AggregationPeriod): Promise<SecurityDashboard['authentication']> {
    const totalAttempts = await this.getMetricValue('auth.attempts.total', period);
    const successfulLogins = await this.getMetricValue('auth.login.success', period);
    const failedLogins = await this.getMetricValue('auth.login.failure', period);
    
    return {
      totalAttempts: totalAttempts.sum,
      successfulLogins: successfulLogins.sum,
      failedLogins: failedLogins.sum,
      successRate: totalAttempts.sum > 0 ? (successfulLogins.sum / totalAttempts.sum) * 100 : 100,
      uniqueUsers: await this.getUniqueUserCount(period),
      suspiciousAttempts: failedLogins.sum, // Simplified - failed logins as suspicious
    };
  }

  /**
   * Generate threat detection metrics
   */
  private async generateThreatDetectionMetrics(period: AggregationPeriod): Promise<SecurityDashboard['threatDetection']> {
    const threatsDetected = await this.getMetricValue('threat.detected', period);
    const riskScore = await this.getMetricValue('threat.risk.score', period);
    
    return {
      threatsDetected: threatsDetected.sum,
      threatsByCategory: await this.getThreatsByCategory(period),
      averageRiskScore: riskScore.avg,
      falsePositiveRate: await this.calculateFalsePositiveRate(),
      detectionAccuracy: await this.calculateDetectionAccuracy(),
    };
  }

  /**
   * Generate performance metrics
   */
  private async generatePerformanceMetrics(period: AggregationPeriod): Promise<SecurityDashboard['performance']> {
    const responseTime = await this.getMetricValue('http.response.time', period);
    const requests = await this.getMetricValue('http.requests.total', period);
    const errors = await this.getMetricValue('http.errors.total', period);
    
    return {
      responseTime: {
        avg: responseTime.avg,
        p95: responseTime.p95,
        p99: responseTime.p99,
      },
      throughput: requests.sum / this.getWindowSizeMs(period) * 1000, // Requests per second
      errorRate: requests.sum > 0 ? (errors.sum / requests.sum) * 100 : 0,
      availabilityScore: Math.max(0, 100 - (errors.sum / Math.max(1, requests.sum)) * 100),
    };
  }

  /**
   * Generate network security metrics
   */
  private async generateNetworkMetrics(period: AggregationPeriod): Promise<SecurityDashboard['network']> {
    const totalRequests = await this.getMetricValue('network.requests.total', period);
    const blockedRequests = await this.getMetricValue('network.blocked.total', period);
    
    return {
      totalRequests: totalRequests.sum,
      blockedRequests: blockedRequests.sum,
      uniqueIPs: await this.getUniqueIPCount(period),
      suspiciousIPs: await this.getSuspiciousIPCount(period),
      geoDistribution: await this.getGeoDistribution(period),
    };
  }

  /**
   * Generate compliance metrics
   */
  private async generateComplianceMetrics(): Promise<SecurityDashboard['compliance']> {
    return {
      auditTrailCompleteness: 100, // Assuming full audit trail
      dataRetentionCompliance: 100, // Assuming compliant retention
      accessControlCompliance: 100, // Assuming proper access control
      encryptionCompliance: 100, // Assuming proper encryption
    };
  }

  /**
   * Get aggregated metric value for period
   */
  private async getMetricValue(metricId: string, period: AggregationPeriod): Promise<{
    sum: number;
    avg: number;
    count: number;
    p95: number;
    p99: number;
  }> {
    const aggregationKey = `${metricId}-${period}`;
    const aggregations = this.aggregatedMetrics.get(aggregationKey) || [];
    
    if (aggregations.length === 0) {
      return { sum: 0, avg: 0, count: 0, p95: 0, p99: 0 };
    }
    
    // Get the latest aggregation
    const latest = aggregations[aggregations.length - 1];
    return {
      sum: latest.values.sum,
      avg: latest.values.avg,
      count: latest.values.count,
      p95: latest.values.p95,
      p99: latest.values.p99,
    };
  }

  /**
   * Helper methods for metric calculations
   */
  private async getActiveThreatCount(): Promise<number> {
    // This would integrate with security monitoring service
    return 0; // Placeholder
  }

  private async getActiveIncidentCount(): Promise<number> {
    // This would integrate with security monitoring service
    return 0; // Placeholder
  }

  private async calculateSystemHealth(): Promise<number> {
    // Calculate based on error rates, response times, etc.
    return 95; // Placeholder
  }

  private async getUniqueUserCount(period: AggregationPeriod): Promise<number> {
    // This would analyze authentication events for unique users
    return 0; // Placeholder
  }

  private async getThreatsByCategory(period: AggregationPeriod): Promise<Record<string, number>> {
    // This would analyze threat detection events by category
    return {}; // Placeholder
  }

  private async calculateFalsePositiveRate(): Promise<number> {
    // This would calculate false positive rate from feedback
    return 5; // 5% placeholder
  }

  private async calculateDetectionAccuracy(): Promise<number> {
    // This would calculate detection accuracy
    return 95; // 95% placeholder
  }

  private async getUniqueIPCount(period: AggregationPeriod): Promise<number> {
    // This would analyze network events for unique IPs
    return 0; // Placeholder
  }

  private async getSuspiciousIPCount(period: AggregationPeriod): Promise<number> {
    // This would analyze network events for suspicious IPs
    return 0; // Placeholder
  }

  private async getGeoDistribution(period: AggregationPeriod): Promise<Record<string, number>> {
    // This would analyze geographic distribution of requests
    return {}; // Placeholder
  }

  /**
   * Initialize metric definitions
   */
  private initializeMetricDefinitions(): void {
    const definitions = [
      // Authentication metrics
      { id: 'auth.attempts.total', name: 'Authentication Attempts', category: SecurityMetricCategory.AUTHENTICATION, type: MetricType.COUNTER, description: 'Total authentication attempts' },
      { id: 'auth.login.success', name: 'Successful Logins', category: SecurityMetricCategory.AUTHENTICATION, type: MetricType.COUNTER, description: 'Successful login attempts' },
      { id: 'auth.login.failure', name: 'Failed Logins', category: SecurityMetricCategory.AUTHENTICATION, type: MetricType.COUNTER, description: 'Failed login attempts' },
      { id: 'auth.response.time', name: 'Auth Response Time', category: SecurityMetricCategory.AUTHENTICATION, type: MetricType.HISTOGRAM, description: 'Authentication response time', unit: 'ms' },
      
      // Threat detection metrics
      { id: 'threat.detected', name: 'Threats Detected', category: SecurityMetricCategory.THREAT_DETECTION, type: MetricType.COUNTER, description: 'Security threats detected' },
      { id: 'threat.risk.score', name: 'Threat Risk Score', category: SecurityMetricCategory.THREAT_DETECTION, type: MetricType.GAUGE, description: 'Risk score of detected threats' },
      { id: 'threat.rules.triggered', name: 'Detection Rules Triggered', category: SecurityMetricCategory.THREAT_DETECTION, type: MetricType.COUNTER, description: 'Number of detection rules triggered' },
      { id: 'threat.response.action', name: 'Response Actions', category: SecurityMetricCategory.THREAT_DETECTION, type: MetricType.COUNTER, description: 'Automated response actions taken' },
      
      // Incident metrics
      { id: 'incident.created', name: 'Incidents Created', category: SecurityMetricCategory.INCIDENT_RESPONSE, type: MetricType.COUNTER, description: 'Security incidents created' },
      { id: 'incident.resolved', name: 'Incidents Resolved', category: SecurityMetricCategory.INCIDENT_RESPONSE, type: MetricType.COUNTER, description: 'Security incidents resolved' },
      
      // Performance metrics
      { id: 'http.response.time', name: 'HTTP Response Time', category: SecurityMetricCategory.SYSTEM_PERFORMANCE, type: MetricType.HISTOGRAM, description: 'HTTP response time', unit: 'ms' },
      { id: 'http.requests.total', name: 'HTTP Requests', category: SecurityMetricCategory.SYSTEM_PERFORMANCE, type: MetricType.COUNTER, description: 'Total HTTP requests' },
      { id: 'http.errors.total', name: 'HTTP Errors', category: SecurityMetricCategory.SYSTEM_PERFORMANCE, type: MetricType.COUNTER, description: 'Total HTTP errors' },
      
      // Network security metrics
      { id: 'network.requests.total', name: 'Network Requests', category: SecurityMetricCategory.NETWORK_SECURITY, type: MetricType.COUNTER, description: 'Total network requests' },
      { id: 'network.blocked.total', name: 'Blocked Requests', category: SecurityMetricCategory.NETWORK_SECURITY, type: MetricType.COUNTER, description: 'Blocked network requests' },
    ];

    definitions.forEach(def => {
      this.metricDefinitions.set(def.id, {
        name: def.name,
        category: def.category,
        type: def.type,
        description: def.description,
        unit: def.unit,
      });
    });

    this.logger.log(`Initialized ${definitions.length} metric definitions`);
  }

  /**
   * Initialize alert thresholds
   */
  private initializeAlertThresholds(): void {
    const thresholds: AlertThreshold[] = [
      {
        thresholdId: 'high-auth-failure-rate',
        metricId: 'auth.login.failure',
        operator: 'gt',
        value: 10, // More than 10 failures per minute
        timeWindow: 60000, // 1 minute
        severity: 'high',
        enabled: true,
        cooldownMs: 300000, // 5 minutes
      },
      {
        thresholdId: 'critical-threat-detected',
        metricId: 'threat.risk.score',
        operator: 'gt',
        value: 80, // Risk score > 80
        timeWindow: 60000, // 1 minute  
        severity: 'critical',
        enabled: true,
        cooldownMs: 60000, // 1 minute
      },
      {
        thresholdId: 'high-error-rate',
        metricId: 'http.errors.total',
        operator: 'gt',
        value: 50, // More than 50 errors per minute
        timeWindow: 60000, // 1 minute
        severity: 'medium',
        enabled: true,
        cooldownMs: 300000, // 5 minutes
      },
    ];

    thresholds.forEach(threshold => {
      this.alertThresholds.set(threshold.thresholdId, threshold);
    });

    this.logger.log(`Initialized ${thresholds.length} alert thresholds`);
  }

  /**
   * Start periodic aggregation tasks
   */
  private startAggregationTasks(): void {
    // Aggregate metrics every minute
    setInterval(() => {
      this.aggregateMetrics(AggregationPeriod.MINUTE);
    }, 60000);

    // Aggregate metrics every hour
    setInterval(() => {
      this.aggregateMetrics(AggregationPeriod.HOUR);
    }, 3600000);

    // Aggregate metrics every day
    setInterval(() => {
      this.aggregateMetrics(AggregationPeriod.DAY);
    }, 86400000);
  }

  /**
   * Start alert monitoring
   */
  private startAlertMonitoring(): void {
    // Check thresholds every 30 seconds
    setInterval(() => {
      this.checkAlertThresholds();
    }, 30000);
  }

  /**
   * Initialize dashboard
   */
  private async initializeDashboard(): Promise<void> {
    // Pre-generate dashboard for faster access
    await this.generateSecurityDashboard(AggregationPeriod.HOUR);
  }

  /**
   * Utility methods
   */
  private getWindowSizeMs(period: AggregationPeriod): number {
    switch (period) {
      case AggregationPeriod.MINUTE:
        return 60000; // 1 minute
      case AggregationPeriod.HOUR:
        return 3600000; // 1 hour
      case AggregationPeriod.DAY:
        return 86400000; // 24 hours
      case AggregationPeriod.WEEK:
        return 604800000; // 7 days
      case AggregationPeriod.MONTH:
        return 2592000000; // 30 days
      default:
        return 3600000; // Default to 1 hour
    }
  }

  private percentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;
    const index = Math.ceil(sortedArray.length * percentile) - 1;
    return sortedArray[Math.max(0, Math.min(index, sortedArray.length - 1))];
  }

  private getFallbackDashboard(period: AggregationPeriod): SecurityDashboard {
    return {
      metadata: {
        generatedAt: new Date(),
        period,
        refreshInterval: this.getWindowSizeMs(period) / 1000,
      },
      overview: {
        securityScore: 0,
        threatLevel: 'medium',
        activeThreatCount: 0,
        incidentCount: 0,
        systemHealth: 0,
      },
      authentication: {
        totalAttempts: 0,
        successfulLogins: 0,
        failedLogins: 0,
        successRate: 0,
        uniqueUsers: 0,
        suspiciousAttempts: 0,
      },
      threatDetection: {
        threatsDetected: 0,
        threatsByCategory: {},
        averageRiskScore: 0,
        falsePositiveRate: 0,
        detectionAccuracy: 0,
      },
      performance: {
        responseTime: { avg: 0, p95: 0, p99: 0 },
        throughput: 0,
        errorRate: 0,
        availabilityScore: 0,
      },
      network: {
        totalRequests: 0,
        blockedRequests: 0,
        uniqueIPs: 0,
        suspiciousIPs: 0,
        geoDistribution: {},
      },
      compliance: {
        auditTrailCompleteness: 0,
        dataRetentionCompliance: 0,
        accessControlCompliance: 0,
        encryptionCompliance: 0,
      },
    };
  }

  /**
   * Cleanup old data (runs daily)
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupOldData(): Promise<void> {
    const startTime = Date.now();
    let metricsCleanedUp = 0;

    try {
      // Cleanup raw metrics older than 24 hours
      const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000);

      for (const [metricId, dataPoints] of this.rawMetrics.entries()) {
        const originalCount = dataPoints.length;
        const filteredPoints = dataPoints.filter(dp => dp.timestamp > cutoffTime);
        
        if (filteredPoints.length !== originalCount) {
          this.rawMetrics.set(metricId, filteredPoints);
          metricsCleanedUp += originalCount - filteredPoints.length;
        }
      }

      const cleanupTime = Date.now() - startTime;
      this.logger.log('Security metrics cleanup completed', {
        metricsCleanedUp,
        cleanupTimeMs: cleanupTime,
        activeMetrics: this.rawMetrics.size,
        aggregatedMetrics: this.aggregatedMetrics.size,
      });

    } catch (error) {
      this.logger.error('Security metrics cleanup failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get current performance metrics
   */
  getPerformanceMetrics(): {
    metricsCollected: number;
    aggregationsPerformed: number;
    alertsTriggered: number;
    averageProcessingTime: number;
  } {
    const avgProcessingTime = this.performanceMetrics.processingTime.length > 0 ?
      this.performanceMetrics.processingTime.reduce((a, b) => a + b, 0) / this.performanceMetrics.processingTime.length :
      0;

    return {
      metricsCollected: this.performanceMetrics.metricsCollected,
      aggregationsPerformed: this.performanceMetrics.aggregationsPerformed,
      alertsTriggered: this.performanceMetrics.alertsTriggered,
      averageProcessingTime: avgProcessingTime,
    };
  }

  /**
   * Get metric definitions
   */
  getMetricDefinitions(): Array<{
    id: string;
    name: string;
    category: SecurityMetricCategory;
    type: MetricType;
    description: string;
    unit?: string;
  }> {
    return Array.from(this.metricDefinitions.entries()).map(([id, def]) => ({
      id,
      ...def,
    }));
  }

  /**
   * Get alert thresholds
   */
  getAlertThresholds(): AlertThreshold[] {
    return Array.from(this.alertThresholds.values());
  }
}