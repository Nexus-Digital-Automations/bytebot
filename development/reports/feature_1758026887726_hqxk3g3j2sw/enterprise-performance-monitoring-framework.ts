/**
 * Enterprise Performance Monitoring Framework
 * Advanced monitoring system for AIgent Parlant Integration Ecosystem
 * 
 * @version 1.0.0
 * @date 2025-09-16
 * @agent Performance Optimization & Enterprise Audit Agent #10
 */

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';

// Performance Metrics Interfaces
interface SystemPerformanceMetrics {
  timestamp: Date;
  cpuUsage: number;
  memoryUsage: MemoryUsage;
  diskIO: DiskIOMetrics;
  networkLatency: NetworkLatencyMetrics;
  activeConnections: number;
  threadPoolUtilization: number;
}

interface MemoryUsage {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  arrayBuffers: number;
  percentageUsed: number;
}

interface DiskIOMetrics {
  readOps: number;
  writeOps: number;
  readThroughput: number;
  writeThroughput: number;
  avgResponseTime: number;
}

interface NetworkLatencyMetrics {
  internalServices: number;
  externalAPIs: number;
  databaseConnections: number;
  cacheConnections: number;
}

interface ConversationPerformanceMetrics {
  activeConversations: number;
  conversationsPerSecond: number;
  averageConversationDuration: number;
  validationsPerSecond: number;
  approvalSuccessRate: number;
  escalationRate: number;
  cacheHitRate: number;
  averageResponseTime: number;
}

interface SecurityPerformanceMetrics {
  authenticationLatency: number;
  authorizationLatency: number;
  threatDetectionLatency: number;
  encryptionOverhead: number;
  auditLogThroughput: number;
  securityEventsPerSecond: number;
  falsePositiveRate: number;
  threatDetectionAccuracy: number;
}

// Performance Threshold Configuration
interface PerformanceThresholds {
  system: {
    cpuUsage: { warning: 70, critical: 85, emergency: 95 };
    memoryUsage: { warning: 75, critical: 90, emergency: 98 };
    diskIO: { warning: 80, critical: 95, emergency: 99 };
    networkLatency: { warning: 100, critical: 250, emergency: 500 };
  };
  
  conversation: {
    responseTime: { warning: 200, critical: 500, emergency: 1000 };
    cacheHitRate: { warning: 80, critical: 70, emergency: 60 };
    approvalSuccessRate: { warning: 95, critical: 90, emergency: 85 };
  };
  
  security: {
    authLatency: { warning: 100, critical: 250, emergency: 500 };
    threatDetection: { warning: 30, critical: 60, emergency: 120 };
    falsePositiveRate: { warning: 5, critical: 10, emergency: 15 };
  };
}

// Alert Severity Levels
enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning', 
  CRITICAL = 'critical',
  EMERGENCY = 'emergency'
}

interface PerformanceAlert {
  id: string;
  timestamp: Date;
  severity: AlertSeverity;
  category: 'system' | 'conversation' | 'security';
  metric: string;
  currentValue: number;
  threshold: number;
  message: string;
  recommendations: string[];
  autoRemediationTaken?: string;
}

// Advanced Performance Monitor Implementation
@Injectable()
export class EnterprisePerformanceMonitor extends EventEmitter {
  private readonly logger = new Logger(EnterprisePerformanceMonitor.name);
  private metricsBuffer: Map<string, any[]> = new Map();
  private alertHistory: PerformanceAlert[] = [];
  private thresholds: PerformanceThresholds;
  
  // Monitoring intervals
  private systemMonitorInterval: NodeJS.Timeout;
  private conversationMonitorInterval: NodeJS.Timeout;
  private securityMonitorInterval: NodeJS.Timeout;
  
  // Performance baselines for comparison
  private performanceBaselines: Map<string, number> = new Map();
  
  constructor() {
    super();
    this.initializeThresholds();
    this.establishPerformanceBaselines();
    this.startMonitoring();
  }

  /**
   * Initialize performance thresholds based on enterprise standards
   */
  private initializeThresholds(): void {
    this.thresholds = {
      system: {
        cpuUsage: { warning: 70, critical: 85, emergency: 95 },
        memoryUsage: { warning: 75, critical: 90, emergency: 98 },
        diskIO: { warning: 80, critical: 95, emergency: 99 },
        networkLatency: { warning: 100, critical: 250, emergency: 500 }
      },
      conversation: {
        responseTime: { warning: 200, critical: 500, emergency: 1000 },
        cacheHitRate: { warning: 80, critical: 70, emergency: 60 },
        approvalSuccessRate: { warning: 95, critical: 90, emergency: 85 }
      },
      security: {
        authLatency: { warning: 100, critical: 250, emergency: 500 },
        threatDetection: { warning: 30, critical: 60, emergency: 120 },
        falsePositiveRate: { warning: 5, critical: 10, emergency: 15 }
      }
    };
  }

  /**
   * Establish performance baselines for comparison
   */
  private establishPerformanceBaselines(): void {
    // Target baselines based on optimization results
    this.performanceBaselines.set('build_time', 3200); // 3.2 seconds in ms
    this.performanceBaselines.set('auth_latency', 95); // 95ms
    this.performanceBaselines.set('validation_time', 185); // 185ms  
    this.performanceBaselines.set('db_query_time', 32); // 32ms
    this.performanceBaselines.set('cache_operation', 3); // 3ms
    this.performanceBaselines.set('memory_per_service', 650); // 650MB
    this.performanceBaselines.set('conversation_throughput', 2500); // 2500/second
    this.performanceBaselines.set('cache_hit_rate', 90); // 90%
    
    this.logger.log('Performance baselines established', {
      baselines: Object.fromEntries(this.performanceBaselines)
    });
  }

  /**
   * Start all monitoring processes
   */
  private startMonitoring(): void {
    // System metrics - every 10 seconds
    this.systemMonitorInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, 10000);

    // Conversation metrics - every 5 seconds  
    this.conversationMonitorInterval = setInterval(() => {
      this.collectConversationMetrics();
    }, 5000);

    // Security metrics - every 15 seconds
    this.securityMonitorInterval = setInterval(() => {
      this.collectSecurityMetrics();
    }, 15000);

    this.logger.log('Enterprise performance monitoring started');
  }

  /**
   * Collect comprehensive system performance metrics
   */
  private async collectSystemMetrics(): Promise<void> {
    const startTime = performance.now();
    
    try {
      const memoryUsage = process.memoryUsage();
      const cpuUsage = await this.getCPUUsage();
      const diskIO = await this.getDiskIOMetrics();
      const networkLatency = await this.getNetworkLatencyMetrics();
      
      const metrics: SystemPerformanceMetrics = {
        timestamp: new Date(),
        cpuUsage: cpuUsage,
        memoryUsage: {
          heapUsed: memoryUsage.heapUsed,
          heapTotal: memoryUsage.heapTotal,
          external: memoryUsage.external,
          rss: memoryUsage.rss,
          arrayBuffers: memoryUsage.arrayBuffers,
          percentageUsed: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100
        },
        diskIO: diskIO,
        networkLatency: networkLatency,
        activeConnections: await this.getActiveConnections(),
        threadPoolUtilization: await this.getThreadPoolUtilization()
      };

      this.storeMetrics('system', metrics);
      this.checkSystemThresholds(metrics);
      
      const collectionTime = performance.now() - startTime;
      this.logger.debug(`System metrics collected in ${collectionTime.toFixed(2)}ms`);
      
    } catch (error) {
      this.logger.error('Error collecting system metrics', error);
    }
  }

  /**
   * Collect Parlant conversation performance metrics
   */
  private async collectConversationMetrics(): Promise<void> {
    const startTime = performance.now();
    
    try {
      const metrics: ConversationPerformanceMetrics = {
        activeConversations: await this.getActiveConversationCount(),
        conversationsPerSecond: await this.getConversationThroughput(),
        averageConversationDuration: await this.getAverageConversationDuration(),
        validationsPerSecond: await this.getValidationThroughput(), 
        approvalSuccessRate: await this.getApprovalSuccessRate(),
        escalationRate: await this.getEscalationRate(),
        cacheHitRate: await this.getCacheHitRate(),
        averageResponseTime: await this.getAverageResponseTime()
      };

      this.storeMetrics('conversation', metrics);
      this.checkConversationThresholds(metrics);
      
      const collectionTime = performance.now() - startTime;
      this.logger.debug(`Conversation metrics collected in ${collectionTime.toFixed(2)}ms`);
      
    } catch (error) {
      this.logger.error('Error collecting conversation metrics', error);
    }
  }

  /**
   * Collect security performance metrics
   */
  private async collectSecurityMetrics(): Promise<void> {
    const startTime = performance.now();
    
    try {
      const metrics: SecurityPerformanceMetrics = {
        authenticationLatency: await this.getAuthenticationLatency(),
        authorizationLatency: await this.getAuthorizationLatency(),
        threatDetectionLatency: await this.getThreatDetectionLatency(),
        encryptionOverhead: await this.getEncryptionOverhead(),
        auditLogThroughput: await this.getAuditLogThroughput(),
        securityEventsPerSecond: await this.getSecurityEventRate(),
        falsePositiveRate: await this.getFalsePositiveRate(),
        threatDetectionAccuracy: await this.getThreatDetectionAccuracy()
      };

      this.storeMetrics('security', metrics);
      this.checkSecurityThresholds(metrics);
      
      const collectionTime = performance.now() - startTime;
      this.logger.debug(`Security metrics collected in ${collectionTime.toFixed(2)}ms`);
      
    } catch (error) {
      this.logger.error('Error collecting security metrics', error);
    }
  }

  /**
   * Store metrics in time-series buffer
   */
  private storeMetrics(category: string, metrics: any): void {
    if (!this.metricsBuffer.has(category)) {
      this.metricsBuffer.set(category, []);
    }
    
    const categoryMetrics = this.metricsBuffer.get(category);
    categoryMetrics.push(metrics);
    
    // Keep only last 1000 entries per category (sliding window)
    if (categoryMetrics.length > 1000) {
      categoryMetrics.splice(0, categoryMetrics.length - 1000);
    }
    
    // Emit metrics for real-time subscribers
    this.emit('metrics', { category, metrics });
  }

  /**
   * Check system performance thresholds
   */
  private checkSystemThresholds(metrics: SystemPerformanceMetrics): void {
    // CPU Usage Check
    this.checkThreshold('system', 'cpuUsage', metrics.cpuUsage, this.thresholds.system.cpuUsage, 
      'CPU usage exceeded threshold', ['Scale horizontally', 'Optimize CPU-intensive operations']);
    
    // Memory Usage Check
    this.checkThreshold('system', 'memoryUsage', metrics.memoryUsage.percentageUsed, 
      this.thresholds.system.memoryUsage, 'Memory usage exceeded threshold', 
      ['Implement garbage collection optimization', 'Scale vertically']);
    
    // Network Latency Check
    const avgNetworkLatency = (metrics.networkLatency.internalServices + 
      metrics.networkLatency.externalAPIs) / 2;
    this.checkThreshold('system', 'networkLatency', avgNetworkLatency, 
      this.thresholds.system.networkLatency, 'Network latency exceeded threshold',
      ['Optimize network topology', 'Implement connection pooling']);
  }

  /**
   * Check conversation performance thresholds
   */
  private checkConversationThresholds(metrics: ConversationPerformanceMetrics): void {
    // Response Time Check
    this.checkThreshold('conversation', 'responseTime', metrics.averageResponseTime,
      this.thresholds.conversation.responseTime, 'Conversation response time exceeded threshold',
      ['Optimize caching strategy', 'Scale conversation services']);
    
    // Cache Hit Rate Check (inverse threshold - lower is worse)
    this.checkInverseThreshold('conversation', 'cacheHitRate', metrics.cacheHitRate,
      this.thresholds.conversation.cacheHitRate, 'Cache hit rate below threshold',
      ['Optimize cache warming', 'Increase cache capacity']);
    
    // Approval Success Rate Check (inverse threshold - lower is worse)  
    this.checkInverseThreshold('conversation', 'approvalSuccessRate', metrics.approvalSuccessRate,
      this.thresholds.conversation.approvalSuccessRate, 'Approval success rate below threshold',
      ['Review approval workflows', 'Improve conversation training']);
  }

  /**
   * Check security performance thresholds
   */
  private checkSecurityThresholds(metrics: SecurityPerformanceMetrics): void {
    // Authentication Latency Check
    this.checkThreshold('security', 'authLatency', metrics.authenticationLatency,
      this.thresholds.security.authLatency, 'Authentication latency exceeded threshold',
      ['Optimize authentication pipeline', 'Implement auth caching']);
    
    // Threat Detection Latency Check
    this.checkThreshold('security', 'threatDetection', metrics.threatDetectionLatency,
      this.thresholds.security.threatDetection, 'Threat detection latency exceeded threshold',
      ['Optimize threat detection algorithms', 'Scale security services']);
  }

  /**
   * Generic threshold checking with alerting
   */
  private checkThreshold(
    category: string,
    metric: string,
    value: number,
    thresholds: { warning: number; critical: number; emergency: number },
    message: string,
    recommendations: string[]
  ): void {
    let severity: AlertSeverity | null = null;
    let threshold: number = 0;
    
    if (value >= thresholds.emergency) {
      severity = AlertSeverity.EMERGENCY;
      threshold = thresholds.emergency;
    } else if (value >= thresholds.critical) {
      severity = AlertSeverity.CRITICAL;  
      threshold = thresholds.critical;
    } else if (value >= thresholds.warning) {
      severity = AlertSeverity.WARNING;
      threshold = thresholds.warning;
    }
    
    if (severity) {
      this.createAlert(category, metric, value, threshold, severity, message, recommendations);
    }
  }

  /**
   * Inverse threshold checking (for metrics where lower is worse)
   */
  private checkInverseThreshold(
    category: string,
    metric: string, 
    value: number,
    thresholds: { warning: number; critical: number; emergency: number },
    message: string,
    recommendations: string[]
  ): void {
    let severity: AlertSeverity | null = null;
    let threshold: number = 0;
    
    if (value <= thresholds.emergency) {
      severity = AlertSeverity.EMERGENCY;
      threshold = thresholds.emergency;
    } else if (value <= thresholds.critical) {
      severity = AlertSeverity.CRITICAL;
      threshold = thresholds.critical;
    } else if (value <= thresholds.warning) {
      severity = AlertSeverity.WARNING; 
      threshold = thresholds.warning;
    }
    
    if (severity) {
      this.createAlert(category, metric, value, threshold, severity, message, recommendations);
    }
  }

  /**
   * Create and process performance alert
   */
  private createAlert(
    category: string,
    metric: string,
    currentValue: number,
    threshold: number,
    severity: AlertSeverity,
    message: string,
    recommendations: string[]
  ): void {
    const alert: PerformanceAlert = {
      id: this.generateAlertId(),
      timestamp: new Date(),
      severity,
      category: category as 'system' | 'conversation' | 'security',
      metric,
      currentValue,
      threshold,
      message,
      recommendations,
    };
    
    // Check for auto-remediation
    const autoRemediation = this.attemptAutoRemediation(alert);
    if (autoRemediation) {
      alert.autoRemediationTaken = autoRemediation;
    }
    
    this.alertHistory.push(alert);
    this.emit('alert', alert);
    
    this.logger.warn(`Performance Alert: ${message}`, {
      category,
      metric, 
      currentValue,
      threshold,
      severity,
      recommendations
    });
    
    // Escalate critical and emergency alerts
    if (severity === AlertSeverity.CRITICAL || severity === AlertSeverity.EMERGENCY) {
      this.escalateAlert(alert);
    }
  }

  /**
   * Attempt automatic remediation for known issues
   */
  private attemptAutoRemediation(alert: PerformanceAlert): string | null {
    const remediationActions: Map<string, () => Promise<string>> = new Map([
      ['system.memoryUsage', async () => {
        if (global.gc) {
          global.gc();
          return 'Forced garbage collection';
        }
        return null;
      }],
      ['conversation.cacheHitRate', async () => {
        // Trigger cache warming
        await this.triggerCacheWarming();
        return 'Initiated intelligent cache warming';
      }],
      ['system.cpuUsage', async () => {
        // Reduce thread pool size temporarily
        process.env.UV_THREADPOOL_SIZE = String(Math.max(4, parseInt(process.env.UV_THREADPOOL_SIZE) - 2));
        return 'Reduced thread pool size to manage CPU load';
      }]
    ]);
    
    const key = `${alert.category}.${alert.metric}`;
    const action = remediationActions.get(key);
    
    if (action) {
      action().then(result => {
        if (result) {
          this.logger.log(`Auto-remediation successful: ${result}`, { alertId: alert.id });
        }
      }).catch(error => {
        this.logger.error(`Auto-remediation failed for alert ${alert.id}`, error);
      });
      
      return 'Auto-remediation initiated';
    }
    
    return null;
  }

  /**
   * Get performance summary for dashboard
   */
  public getPerformanceSummary(): any {
    const latestSystem = this.getLatestMetrics('system') as SystemPerformanceMetrics;
    const latestConversation = this.getLatestMetrics('conversation') as ConversationPerformanceMetrics;
    const latestSecurity = this.getLatestMetrics('security') as SecurityPerformanceMetrics;
    
    return {
      timestamp: new Date(),
      system: {
        cpuUsage: latestSystem?.cpuUsage || 0,
        memoryUsage: latestSystem?.memoryUsage?.percentageUsed || 0,
        networkLatency: latestSystem?.networkLatency || {},
        status: this.getHealthStatus('system')
      },
      conversation: {
        activeConversations: latestConversation?.activeConversations || 0,
        throughput: latestConversation?.conversationsPerSecond || 0,
        averageResponseTime: latestConversation?.averageResponseTime || 0,
        cacheHitRate: latestConversation?.cacheHitRate || 0,
        status: this.getHealthStatus('conversation')
      },
      security: {
        authLatency: latestSecurity?.authenticationLatency || 0,
        threatDetectionAccuracy: latestSecurity?.threatDetectionAccuracy || 0,
        falsePositiveRate: latestSecurity?.falsePositiveRate || 0,
        status: this.getHealthStatus('security')
      },
      alerts: {
        active: this.getActiveAlerts().length,
        critical: this.getActiveAlerts().filter(a => a.severity === AlertSeverity.CRITICAL).length,
        emergency: this.getActiveAlerts().filter(a => a.severity === AlertSeverity.EMERGENCY).length
      }
    };
  }

  /**
   * Generate comprehensive performance report
   */
  public generatePerformanceReport(): any {
    const timeRange = 24 * 60 * 60 * 1000; // 24 hours
    const cutoffTime = new Date(Date.now() - timeRange);
    
    return {
      reportTimestamp: new Date(),
      timeRange: '24 hours',
      summary: this.getPerformanceSummary(),
      trends: {
        system: this.calculateTrends('system', cutoffTime),
        conversation: this.calculateTrends('conversation', cutoffTime),
        security: this.calculateTrends('security', cutoffTime)
      },
      alerts: this.alertHistory.filter(a => a.timestamp >= cutoffTime),
      recommendations: this.generateRecommendations(),
      benchmarkComparison: this.compareToBenchmarks()
    };
  }

  // Helper methods for metric collection (implement based on actual monitoring infrastructure)
  private async getCPUUsage(): Promise<number> {
    // Implement CPU usage calculation
    return Math.random() * 100; // Placeholder
  }

  private async getDiskIOMetrics(): Promise<DiskIOMetrics> {
    return {
      readOps: Math.random() * 1000,
      writeOps: Math.random() * 500, 
      readThroughput: Math.random() * 100,
      writeThroughput: Math.random() * 50,
      avgResponseTime: Math.random() * 10
    };
  }

  private async getNetworkLatencyMetrics(): Promise<NetworkLatencyMetrics> {
    return {
      internalServices: Math.random() * 50,
      externalAPIs: Math.random() * 200,
      databaseConnections: Math.random() * 10,
      cacheConnections: Math.random() * 5
    };
  }

  private async getActiveConnections(): Promise<number> {
    return Math.floor(Math.random() * 1000);
  }

  private async getThreadPoolUtilization(): Promise<number> {
    return Math.random() * 100;
  }

  private async getActiveConversationCount(): Promise<number> {
    return Math.floor(Math.random() * 500);
  }

  private async getConversationThroughput(): Promise<number> {
    return Math.random() * 2500;
  }

  private async getAverageConversationDuration(): Promise<number> {
    return Math.random() * 300;
  }

  private async getValidationThroughput(): Promise<number> {
    return Math.random() * 1000;
  }

  private async getApprovalSuccessRate(): Promise<number> {
    return 90 + Math.random() * 10;
  }

  private async getEscalationRate(): Promise<number> {
    return Math.random() * 5;
  }

  private async getCacheHitRate(): Promise<number> {
    return 80 + Math.random() * 20;
  }

  private async getAverageResponseTime(): Promise<number> {
    return 50 + Math.random() * 200;
  }

  private async getAuthenticationLatency(): Promise<number> {
    return Math.random() * 200;
  }

  private async getAuthorizationLatency(): Promise<number> {
    return Math.random() * 150;
  }

  private async getThreatDetectionLatency(): Promise<number> {
    return Math.random() * 100;
  }

  private async getEncryptionOverhead(): Promise<number> {
    return Math.random() * 20;
  }

  private async getAuditLogThroughput(): Promise<number> {
    return Math.random() * 10000;
  }

  private async getSecurityEventRate(): Promise<number> {
    return Math.random() * 50;
  }

  private async getFalsePositiveRate(): Promise<number> {
    return Math.random() * 5;
  }

  private async getThreatDetectionAccuracy(): Promise<number> {
    return 95 + Math.random() * 5;
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private escalateAlert(alert: PerformanceAlert): void {
    // Implement alert escalation logic
    this.logger.error(`ESCALATED ALERT: ${alert.message}`, alert);
  }

  private async triggerCacheWarming(): Promise<void> {
    // Implement cache warming logic
    this.logger.log('Cache warming initiated');
  }

  private getLatestMetrics(category: string): any {
    const metrics = this.metricsBuffer.get(category);
    return metrics && metrics.length > 0 ? metrics[metrics.length - 1] : null;
  }

  private getHealthStatus(category: string): 'healthy' | 'warning' | 'critical' | 'emergency' {
    const activeAlerts = this.getActiveAlerts().filter(a => a.category === category);
    
    if (activeAlerts.some(a => a.severity === AlertSeverity.EMERGENCY)) return 'emergency';
    if (activeAlerts.some(a => a.severity === AlertSeverity.CRITICAL)) return 'critical';
    if (activeAlerts.some(a => a.severity === AlertSeverity.WARNING)) return 'warning';
    return 'healthy';
  }

  private getActiveAlerts(): PerformanceAlert[] {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return this.alertHistory.filter(a => a.timestamp >= oneHourAgo);
  }

  private calculateTrends(category: string, since: Date): any {
    const metrics = this.metricsBuffer.get(category) || [];
    const filteredMetrics = metrics.filter(m => m.timestamp >= since);
    
    if (filteredMetrics.length < 2) return { trend: 'insufficient-data' };
    
    // Calculate trends for key metrics
    const first = filteredMetrics[0];
    const last = filteredMetrics[filteredMetrics.length - 1];
    
    return {
      dataPoints: filteredMetrics.length,
      timeSpan: last.timestamp.getTime() - first.timestamp.getTime(),
      // Add specific trend calculations based on category
    };
  }

  private generateRecommendations(): string[] {
    const recommendations = [];
    const summary = this.getPerformanceSummary();
    
    // Generate recommendations based on current performance
    if (summary.system.cpuUsage > 80) {
      recommendations.push('Consider horizontal scaling to reduce CPU load');
    }
    
    if (summary.conversation.cacheHitRate < 85) {
      recommendations.push('Optimize cache strategy to improve hit rate');
    }
    
    if (summary.security.authLatency > 100) {
      recommendations.push('Implement authentication caching to reduce latency');
    }
    
    return recommendations;
  }

  private compareToBenchmarks(): any {
    const summary = this.getPerformanceSummary();
    const comparisons = {};
    
    // Compare current metrics to established baselines
    for (const [metric, baseline] of this.performanceBaselines) {
      // Extract current value based on metric name
      let currentValue = 0;
      // Add logic to extract current values for comparison
      
      comparisons[metric] = {
        baseline,
        current: currentValue,
        improvement: ((baseline - currentValue) / baseline) * 100,
        status: currentValue <= baseline ? 'meeting-target' : 'needs-improvement'
      };
    }
    
    return comparisons;
  }

  /**
   * Cleanup monitoring on shutdown
   */
  public shutdown(): void {
    if (this.systemMonitorInterval) clearInterval(this.systemMonitorInterval);
    if (this.conversationMonitorInterval) clearInterval(this.conversationMonitorInterval);
    if (this.securityMonitorInterval) clearInterval(this.securityMonitorInterval);
    
    this.logger.log('Enterprise performance monitoring shutdown complete');
  }
}

/**
 * Performance Dashboard Service
 * Real-time dashboard for monitoring system performance
 */
@Injectable()
export class PerformanceDashboardService {
  private readonly logger = new Logger(PerformanceDashboardService.name);
  
  constructor(
    private readonly performanceMonitor: EnterprisePerformanceMonitor
  ) {
    this.setupDashboardUpdates();
  }

  private setupDashboardUpdates(): void {
    // Set up real-time dashboard updates
    this.performanceMonitor.on('metrics', (data) => {
      this.updateDashboard(data);
    });
    
    this.performanceMonitor.on('alert', (alert) => {
      this.displayAlert(alert);
    });
  }

  private updateDashboard(data: any): void {
    // Update real-time dashboard with new metrics
    // Implement WebSocket or Server-Sent Events for real-time updates
  }

  private displayAlert(alert: PerformanceAlert): void {
    // Display alert on dashboard
    // Implement alert notification system
  }

  /**
   * Get dashboard data for web interface
   */
  public getDashboardData(): any {
    return {
      performance: this.performanceMonitor.getPerformanceSummary(),
      report: this.performanceMonitor.generatePerformanceReport(),
      timestamp: new Date()
    };
  }
}

export { 
  SystemPerformanceMetrics,
  ConversationPerformanceMetrics, 
  SecurityPerformanceMetrics,
  PerformanceThresholds,
  PerformanceAlert,
  AlertSeverity
};