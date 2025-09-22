/**
 * Advanced Network Security Monitoring and Alerting System
 * Provides real-time security monitoring, metrics collection, and automated alerting
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '../utils/Logger';
import {
  NetworkMetrics,
  BandwidthMetrics,
  ConnectionStats,
  SecurityStats,
  PerformanceStats,
  TopTalker,
  SecurityAlert,
  AlertType,
  AlertStatus,
  VulnerabilitySeverity,
  AlertingConfig,
  MonitoringConfig,
  IntrusionEvent
} from '../types';

interface MetricsCollector {
  name: string;
  interval: number;
  collector: () => Promise<Partial<NetworkMetrics>>;
  enabled: boolean;
}

interface AlertRule {
  id: string;
  name: string;
  description: string;
  condition: (metrics: NetworkMetrics) => boolean;
  severity: VulnerabilitySeverity;
  enabled: boolean;
  throttle_seconds: number;
  last_triggered?: Date;
}

interface Dashboard {
  id: string;
  name: string;
  widgets: DashboardWidget[];
  refresh_interval: number;
  created_at: Date;
  updated_at: Date;
}

interface DashboardWidget {
  id: string;
  type: 'chart' | 'gauge' | 'table' | 'alert' | 'metric';
  title: string;
  config: Record<string, any>;
  position: { x: number; y: number; width: number; height: number };
}

interface SecurityTrend {
  timestamp: Date;
  security_score: number;
  threat_level: 'low' | 'medium' | 'high' | 'critical';
  active_threats: number;
  blocked_attempts: number;
  policy_violations: number;
}

export class SecurityMonitor extends EventEmitter {
  private readonly logger: Logger;
  private config: MonitoringConfig;
  private alertConfig: AlertingConfig;
  private collectors: Map<string, MetricsCollector> = new Map();
  private alertRules: Map<string, AlertRule> = new Map();
  private metricsHistory: NetworkMetrics[] = [];
  private securityTrends: SecurityTrend[] = [];
  private dashboards: Map<string, Dashboard> = new Map();
  private isMonitoring: boolean = false;
  private monitoringIntervals: Map<string, NodeJS.Timeout> = new Map();
  private baseline: NetworkMetrics | null = null;

  constructor(config: MonitoringConfig, alertConfig: AlertingConfig) {
    super();
    this.logger = new Logger('SecurityMonitor');
    this.config = config;
    this.alertConfig = alertConfig;
    this.initializeSystem();
  }

  /**
   * Start security monitoring
   */
  public async startMonitoring(): Promise<void> {
    this.logger.info('Starting security monitoring');

    try {
      if (this.isMonitoring) {
        throw new Error('Security monitoring is already running');
      }

      this.isMonitoring = true;

      // Start metrics collection
      this.startMetricsCollection();

      // Start baseline learning
      this.startBaselineLearning();

      // Start alert processing
      this.startAlertProcessing();

      // Start trend analysis
      this.startTrendAnalysis();

      this.emit('monitoringStarted');
      this.logger.info('Security monitoring started successfully');

    } catch (error) {
      this.logger.error('Failed to start security monitoring', { error });
      this.emit('monitoringStartFailed', { error });
      throw error;
    }
  }

  /**
   * Stop security monitoring
   */
  public async stopMonitoring(): Promise<void> {
    this.logger.info('Stopping security monitoring');

    try {
      this.isMonitoring = false;

      // Stop all monitoring intervals
      for (const [name, interval] of this.monitoringIntervals) {
        clearInterval(interval);
        this.logger.debug('Stopped monitoring interval', { collector: name });
      }
      this.monitoringIntervals.clear();

      this.emit('monitoringStopped');
      this.logger.info('Security monitoring stopped successfully');

    } catch (error) {
      this.logger.error('Failed to stop security monitoring', { error });
      throw error;
    }
  }

  /**
   * Get current security metrics
   */
  public async getCurrentMetrics(): Promise<NetworkMetrics> {
    try {
      const metrics: Partial<NetworkMetrics> = {
        timestamp: new Date()
      };

      // Collect metrics from all enabled collectors
      for (const [name, collector] of this.collectors) {
        if (collector.enabled) {
          try {
            const collectedMetrics = await collector.collector();
            Object.assign(metrics, collectedMetrics);
          } catch (error) {
            this.logger.warn('Metrics collection failed', { collector: name, error });
          }
        }
      }

      return this.validateAndCompleteMetrics(metrics as NetworkMetrics);

    } catch (error) {
      this.logger.error('Failed to get current metrics', { error });
      throw error;
    }
  }

  /**
   * Get historical metrics
   */
  public getHistoricalMetrics(timeRange: { start: Date; end: Date }): NetworkMetrics[] {
    return this.metricsHistory.filter(m =>
      m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
    ).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Get security trends
   */
  public getSecurityTrends(timeRange?: { start: Date; end: Date }): SecurityTrend[] {
    let trends = [...this.securityTrends];

    if (timeRange) {
      trends = trends.filter(t =>
        t.timestamp >= timeRange.start && t.timestamp <= timeRange.end
      );
    }

    return trends.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Create custom dashboard
   */
  public createDashboard(name: string, widgets: Omit<DashboardWidget, 'id'>[]): Dashboard {
    const dashboard: Dashboard = {
      id: uuidv4(),
      name,
      widgets: widgets.map(w => ({ ...w, id: uuidv4() })),
      refresh_interval: 30,
      created_at: new Date(),
      updated_at: new Date()
    };

    this.dashboards.set(dashboard.id, dashboard);
    this.emit('dashboardCreated', { dashboard });

    this.logger.info('Dashboard created', { dashboardId: dashboard.id, name });
    return dashboard;
  }

  /**
   * Get dashboard data
   */
  public async getDashboardData(dashboardId: string): Promise<{
    dashboard: Dashboard;
    data: Record<string, any>;
  } | null> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      return null;
    }

    const data: Record<string, any> = {};

    // Generate data for each widget
    for (const widget of dashboard.widgets) {
      try {
        data[widget.id] = await this.generateWidgetData(widget);
      } catch (error) {
        this.logger.warn('Widget data generation failed', { widgetId: widget.id, error });
        data[widget.id] = null;
      }
    }

    return { dashboard, data };
  }

  /**
   * Add custom alert rule
   */
  public addAlertRule(rule: Omit<AlertRule, 'id'>): string {
    const alertRule: AlertRule = {
      id: uuidv4(),
      ...rule
    };

    this.alertRules.set(alertRule.id, alertRule);
    this.emit('alertRuleAdded', { rule: alertRule });

    this.logger.info('Alert rule added', { ruleId: alertRule.id, name: rule.name });
    return alertRule.id;
  }

  /**
   * Process intrusion event for monitoring
   */
  public processIntrusionEvent(event: IntrusionEvent): void {
    try {
      // Update security statistics
      this.updateSecurityStats(event);

      // Check for alert conditions
      this.checkEventAlerts(event);

      // Update security trends
      this.updateSecurityTrends(event);

      this.emit('intrusionEventProcessed', { event });

    } catch (error) {
      this.logger.error('Failed to process intrusion event', { eventId: event.id, error });
    }
  }

  /**
   * Get real-time security status
   */
  public getSecurityStatus(): {
    overall_status: 'secure' | 'warning' | 'critical';
    threat_level: 'low' | 'medium' | 'high' | 'critical';
    active_alerts: number;
    security_score: number;
    last_updated: Date;
  } {
    const latestTrend = this.securityTrends[this.securityTrends.length - 1];
    const activeAlerts = this.getActiveAlerts().length;

    let overallStatus: 'secure' | 'warning' | 'critical' = 'secure';
    if (activeAlerts > 10 || (latestTrend && latestTrend.security_score < 50)) {
      overallStatus = 'critical';
    } else if (activeAlerts > 5 || (latestTrend && latestTrend.security_score < 80)) {
      overallStatus = 'warning';
    }

    return {
      overall_status: overallStatus,
      threat_level: latestTrend?.threat_level || 'low',
      active_alerts: activeAlerts,
      security_score: latestTrend?.security_score || 100,
      last_updated: new Date()
    };
  }

  /**
   * Initialize monitoring system
   */
  private initializeSystem(): void {
    this.logger.info('Initializing security monitoring system');

    // Initialize metrics collectors
    this.initializeMetricsCollectors();

    // Initialize default alert rules
    this.initializeDefaultAlertRules();

    // Initialize default dashboards
    this.initializeDefaultDashboards();

    this.logger.info('Security monitoring system initialized');
  }

  /**
   * Initialize metrics collectors
   */
  private initializeMetricsCollectors(): void {
    // Bandwidth metrics collector
    this.collectors.set('bandwidth', {
      name: 'Bandwidth Metrics',
      interval: this.config.collection_interval,
      enabled: true,
      collector: async () => ({
        bandwidth_utilization: await this.collectBandwidthMetrics()
      })
    });

    // Connection stats collector
    this.collectors.set('connections', {
      name: 'Connection Statistics',
      interval: this.config.collection_interval,
      enabled: true,
      collector: async () => ({
        connection_stats: await this.collectConnectionStats()
      })
    });

    // Security stats collector
    this.collectors.set('security', {
      name: 'Security Statistics',
      interval: this.config.collection_interval,
      enabled: true,
      collector: async () => ({
        security_stats: await this.collectSecurityStats()
      })
    });

    // Performance stats collector
    this.collectors.set('performance', {
      name: 'Performance Statistics',
      interval: this.config.collection_interval,
      enabled: true,
      collector: async () => ({
        performance_stats: await this.collectPerformanceStats()
      })
    });

    this.logger.info('Metrics collectors initialized', {
      count: this.collectors.size
    });
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    for (const [name, collector] of this.collectors) {
      if (collector.enabled) {
        const interval = setInterval(async () => {
          try {
            const metrics = await this.getCurrentMetrics();
            this.metricsHistory.push(metrics);

            // Maintain history size limit
            if (this.metricsHistory.length > 10000) {
              this.metricsHistory = this.metricsHistory.slice(-8000);
            }

            this.emit('metricsCollected', { metrics });

          } catch (error) {
            this.logger.error('Metrics collection cycle failed', { collector: name, error });
          }
        }, collector.interval);

        this.monitoringIntervals.set(name, interval);
        this.logger.debug('Started metrics collector', { name, interval: collector.interval });
      }
    }
  }

  /**
   * Start baseline learning
   */
  private startBaselineLearning(): void {
    if (this.config.baseline_learning_period > 0) {
      setTimeout(async () => {
        try {
          this.baseline = await this.calculateBaseline();
          this.emit('baselineEstablished', { baseline: this.baseline });
          this.logger.info('Security baseline established');
        } catch (error) {
          this.logger.error('Failed to establish baseline', { error });
        }
      }, this.config.baseline_learning_period);
    }
  }

  /**
   * Start alert processing
   */
  private startAlertProcessing(): void {
    const interval = setInterval(() => {
      try {
        if (this.metricsHistory.length > 0) {
          const latestMetrics = this.metricsHistory[this.metricsHistory.length - 1];
          this.processAlertRules(latestMetrics);
        }
      } catch (error) {
        this.logger.error('Alert processing failed', { error });
      }
    }, 10000); // Check every 10 seconds

    this.monitoringIntervals.set('alertProcessing', interval);
  }

  /**
   * Start trend analysis
   */
  private startTrendAnalysis(): void {
    const interval = setInterval(() => {
      try {
        this.calculateSecurityTrends();
      } catch (error) {
        this.logger.error('Trend analysis failed', { error });
      }
    }, 60000); // Analyze every minute

    this.monitoringIntervals.set('trendAnalysis', interval);
  }

  // Metrics collection methods
  private async collectBandwidthMetrics(): Promise<BandwidthMetrics> {
    // Implementation would interface with system network monitoring
    return {
      inbound_mbps: Math.random() * 100,
      outbound_mbps: Math.random() * 50,
      total_mbps: Math.random() * 150,
      utilization_percentage: Math.random() * 100,
      peak_usage: Math.random() * 200,
      average_usage: Math.random() * 75
    };
  }

  private async collectConnectionStats(): Promise<ConnectionStats> {
    return {
      active_connections: Math.floor(Math.random() * 1000),
      new_connections_per_second: Math.floor(Math.random() * 50),
      failed_connections: Math.floor(Math.random() * 10),
      connection_timeouts: Math.floor(Math.random() * 5),
      top_talkers: await this.getTopTalkers()
    };
  }

  private async collectSecurityStats(): Promise<SecurityStats> {
    return {
      blocked_attempts: Math.floor(Math.random() * 20),
      suspicious_events: Math.floor(Math.random() * 15),
      malware_detected: Math.floor(Math.random() * 3),
      policy_violations: Math.floor(Math.random() * 8),
      threat_score: Math.floor(Math.random() * 100)
    };
  }

  private async collectPerformanceStats(): Promise<PerformanceStats> {
    return {
      latency_ms: Math.random() * 100,
      packet_loss_percentage: Math.random() * 5,
      jitter_ms: Math.random() * 20,
      throughput_mbps: Math.random() * 1000,
      response_time_ms: Math.random() * 500
    };
  }

  private async getTopTalkers(): Promise<TopTalker[]> {
    const topTalkers: TopTalker[] = [];
    for (let i = 0; i < 5; i++) {
      topTalkers.push({
        ip: `192.168.1.${100 + i}`,
        bytes_sent: Math.floor(Math.random() * 1000000),
        bytes_received: Math.floor(Math.random() * 1000000),
        connections: Math.floor(Math.random() * 100),
        protocols: ['tcp', 'udp']
      });
    }
    return topTalkers;
  }

  // Alert processing methods
  private processAlertRules(metrics: NetworkMetrics): void {
    for (const [ruleId, rule] of this.alertRules) {
      if (!rule.enabled) continue;

      try {
        // Check throttling
        if (rule.last_triggered) {
          const timeSinceLastTrigger = Date.now() - rule.last_triggered.getTime();
          if (timeSinceLastTrigger < rule.throttle_seconds * 1000) {
            continue;
          }
        }

        // Evaluate condition
        if (rule.condition(metrics)) {
          this.triggerAlert(rule, metrics);
          rule.last_triggered = new Date();
        }

      } catch (error) {
        this.logger.warn('Alert rule evaluation failed', { ruleId, error });
      }
    }
  }

  private triggerAlert(rule: AlertRule, metrics: NetworkMetrics): void {
    const alert: SecurityAlert = {
      id: uuidv4(),
      timestamp: new Date(),
      type: AlertType.PERFORMANCE_DEGRADATION,
      severity: rule.severity,
      title: rule.name,
      description: rule.description,
      source: 'SecurityMonitor',
      indicators: {
        ruleId: rule.id,
        metrics: metrics
      },
      recommendation: 'Investigate the alert condition and take appropriate action',
      status: AlertStatus.NEW
    };

    this.emit('securityAlert', { alert });
    this.logger.warn('Security alert triggered', {
      alertId: alert.id,
      rule: rule.name,
      severity: rule.severity
    });
  }

  // Dashboard and widget methods
  private async generateWidgetData(widget: DashboardWidget): Promise<any> {
    switch (widget.type) {
      case 'chart':
        return this.generateChartData(widget);
      case 'gauge':
        return this.generateGaugeData(widget);
      case 'table':
        return this.generateTableData(widget);
      case 'alert':
        return this.generateAlertData(widget);
      case 'metric':
        return this.generateMetricData(widget);
      default:
        return null;
    }
  }

  private generateChartData(widget: DashboardWidget): any {
    const timeRange = widget.config.timeRange || '1h';
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - this.parseTimeRange(timeRange));

    const metrics = this.getHistoricalMetrics({ start: startTime, end: endTime });

    return {
      labels: metrics.map(m => m.timestamp),
      datasets: [{
        label: widget.config.metric || 'Security Score',
        data: metrics.map(m => this.extractMetricValue(m, widget.config.metric || 'security_stats.threat_score'))
      }]
    };
  }

  private generateGaugeData(widget: DashboardWidget): any {
    const latestMetrics = this.metricsHistory[this.metricsHistory.length - 1];
    if (!latestMetrics) return { value: 0, max: 100 };

    const value = this.extractMetricValue(latestMetrics, widget.config.metric || 'security_stats.threat_score');
    return {
      value,
      max: widget.config.max || 100,
      thresholds: widget.config.thresholds || { warning: 70, critical: 90 }
    };
  }

  private generateTableData(widget: DashboardWidget): any {
    // Generate table data based on widget configuration
    return {
      headers: ['IP Address', 'Threats', 'Status'],
      rows: [
        ['192.168.1.100', '3', 'High Risk'],
        ['192.168.1.101', '1', 'Medium Risk'],
        ['192.168.1.102', '0', 'Safe']
      ]
    };
  }

  private generateAlertData(widget: DashboardWidget): any {
    return {
      alerts: this.getActiveAlerts().slice(0, widget.config.maxAlerts || 10)
    };
  }

  private generateMetricData(widget: DashboardWidget): any {
    const latestMetrics = this.metricsHistory[this.metricsHistory.length - 1];
    if (!latestMetrics) return { value: 0 };

    return {
      value: this.extractMetricValue(latestMetrics, widget.config.metric || 'security_stats.threat_score'),
      trend: this.calculateMetricTrend(widget.config.metric || 'security_stats.threat_score')
    };
  }

  // Utility methods
  private validateAndCompleteMetrics(metrics: NetworkMetrics): NetworkMetrics {
    // Ensure all required fields are present
    if (!metrics.bandwidth_utilization) {
      metrics.bandwidth_utilization = {
        inbound_mbps: 0,
        outbound_mbps: 0,
        total_mbps: 0,
        utilization_percentage: 0,
        peak_usage: 0,
        average_usage: 0
      };
    }

    if (!metrics.connection_stats) {
      metrics.connection_stats = {
        active_connections: 0,
        new_connections_per_second: 0,
        failed_connections: 0,
        connection_timeouts: 0,
        top_talkers: []
      };
    }

    if (!metrics.security_stats) {
      metrics.security_stats = {
        blocked_attempts: 0,
        suspicious_events: 0,
        malware_detected: 0,
        policy_violations: 0,
        threat_score: 0
      };
    }

    if (!metrics.performance_stats) {
      metrics.performance_stats = {
        latency_ms: 0,
        packet_loss_percentage: 0,
        jitter_ms: 0,
        throughput_mbps: 0,
        response_time_ms: 0
      };
    }

    return metrics;
  }

  private parseTimeRange(timeRange: string): number {
    const timeMap: Record<string, number> = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '12h': 12 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000
    };
    return timeMap[timeRange] || timeMap['1h'];
  }

  private extractMetricValue(metrics: NetworkMetrics, path: string): number {
    const parts = path.split('.');
    let value: any = metrics;

    for (const part of parts) {
      value = value?.[part];
      if (value === undefined) return 0;
    }

    return typeof value === 'number' ? value : 0;
  }

  private calculateMetricTrend(metricPath: string): 'up' | 'down' | 'stable' {
    if (this.metricsHistory.length < 2) return 'stable';

    const recent = this.metricsHistory.slice(-5);
    const current = this.extractMetricValue(recent[recent.length - 1], metricPath);
    const previous = this.extractMetricValue(recent[0], metricPath);

    const change = ((current - previous) / previous) * 100;

    if (change > 5) return 'up';
    if (change < -5) return 'down';
    return 'stable';
  }

  private getActiveAlerts(): SecurityAlert[] {
    // This would return active alerts from an alert store
    return [];
  }

  private async calculateBaseline(): Promise<NetworkMetrics> {
    if (this.metricsHistory.length === 0) {
      throw new Error('No metrics history available for baseline calculation');
    }

    // Calculate average metrics for baseline
    const baseline = this.validateAndCompleteMetrics({
      timestamp: new Date(),
      bandwidth_utilization: {
        inbound_mbps: 0,
        outbound_mbps: 0,
        total_mbps: 0,
        utilization_percentage: 0,
        peak_usage: 0,
        average_usage: 0
      },
      connection_stats: {
        active_connections: 0,
        new_connections_per_second: 0,
        failed_connections: 0,
        connection_timeouts: 0,
        top_talkers: []
      },
      security_stats: {
        blocked_attempts: 0,
        suspicious_events: 0,
        malware_detected: 0,
        policy_violations: 0,
        threat_score: 0
      },
      performance_stats: {
        latency_ms: 0,
        packet_loss_percentage: 0,
        jitter_ms: 0,
        throughput_mbps: 0,
        response_time_ms: 0
      }
    });

    // Calculate averages from history
    const count = this.metricsHistory.length;
    for (const metrics of this.metricsHistory) {
      baseline.bandwidth_utilization.inbound_mbps += metrics.bandwidth_utilization.inbound_mbps / count;
      baseline.bandwidth_utilization.outbound_mbps += metrics.bandwidth_utilization.outbound_mbps / count;
      baseline.security_stats.threat_score += metrics.security_stats.threat_score / count;
      // ... calculate other averages
    }

    return baseline;
  }

  private calculateSecurityTrends(): void {
    if (this.metricsHistory.length === 0) return;

    const latestMetrics = this.metricsHistory[this.metricsHistory.length - 1];
    const securityScore = latestMetrics.security_stats.threat_score;

    let threatLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (securityScore > 80) threatLevel = 'critical';
    else if (securityScore > 60) threatLevel = 'high';
    else if (securityScore > 40) threatLevel = 'medium';

    const trend: SecurityTrend = {
      timestamp: new Date(),
      security_score: 100 - securityScore, // Invert so higher is better
      threat_level: threatLevel,
      active_threats: latestMetrics.security_stats.suspicious_events,
      blocked_attempts: latestMetrics.security_stats.blocked_attempts,
      policy_violations: latestMetrics.security_stats.policy_violations
    };

    this.securityTrends.push(trend);

    // Maintain trends history
    if (this.securityTrends.length > 1000) {
      this.securityTrends = this.securityTrends.slice(-800);
    }

    this.emit('securityTrendUpdated', { trend });
  }

  private updateSecurityStats(event: IntrusionEvent): void {
    // Update security statistics based on intrusion event
    // This would be implemented to update metrics based on events
  }

  private checkEventAlerts(event: IntrusionEvent): void {
    // Check if event triggers any specific alerts
    // This would evaluate event-based alert conditions
  }

  private updateSecurityTrends(event: IntrusionEvent): void {
    // Update security trends based on intrusion event
    // This would adjust security scores and threat levels
  }

  // Default initialization methods
  private initializeDefaultAlertRules(): void {
    const defaultRules: Omit<AlertRule, 'id'>[] = [
      {
        name: 'High Bandwidth Utilization',
        description: 'Alert when bandwidth utilization exceeds 90%',
        condition: (metrics) => metrics.bandwidth_utilization.utilization_percentage > 90,
        severity: VulnerabilitySeverity.HIGH,
        enabled: true,
        throttle_seconds: 300
      },
      {
        name: 'High Threat Score',
        description: 'Alert when threat score exceeds 80',
        condition: (metrics) => metrics.security_stats.threat_score > 80,
        severity: VulnerabilitySeverity.CRITICAL,
        enabled: true,
        throttle_seconds: 60
      },
      {
        name: 'High Connection Failures',
        description: 'Alert when connection failures exceed 100',
        condition: (metrics) => metrics.connection_stats.failed_connections > 100,
        severity: VulnerabilitySeverity.MEDIUM,
        enabled: true,
        throttle_seconds: 180
      }
    ];

    for (const rule of defaultRules) {
      this.addAlertRule(rule);
    }

    this.logger.info('Default alert rules initialized', { count: defaultRules.length });
  }

  private initializeDefaultDashboards(): void {
    // Security Overview Dashboard
    this.createDashboard('Security Overview', [
      {
        type: 'gauge',
        title: 'Security Score',
        config: { metric: 'security_stats.threat_score', max: 100 },
        position: { x: 0, y: 0, width: 6, height: 4 }
      },
      {
        type: 'chart',
        title: 'Threat Trends',
        config: { metric: 'security_stats.threat_score', timeRange: '24h' },
        position: { x: 6, y: 0, width: 6, height: 4 }
      },
      {
        type: 'table',
        title: 'Top Security Events',
        config: { maxRows: 10 },
        position: { x: 0, y: 4, width: 12, height: 4 }
      }
    ]);

    // Performance Dashboard
    this.createDashboard('Performance Monitoring', [
      {
        type: 'gauge',
        title: 'Bandwidth Utilization',
        config: { metric: 'bandwidth_utilization.utilization_percentage', max: 100 },
        position: { x: 0, y: 0, width: 4, height: 4 }
      },
      {
        type: 'gauge',
        title: 'Latency',
        config: { metric: 'performance_stats.latency_ms', max: 1000 },
        position: { x: 4, y: 0, width: 4, height: 4 }
      },
      {
        type: 'gauge',
        title: 'Packet Loss',
        config: { metric: 'performance_stats.packet_loss_percentage', max: 10 },
        position: { x: 8, y: 0, width: 4, height: 4 }
      }
    ]);

    this.logger.info('Default dashboards initialized');
  }
}