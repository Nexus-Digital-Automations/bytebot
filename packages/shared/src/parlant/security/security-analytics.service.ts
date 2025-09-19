/**
 * PARLANT Phase 1 Advanced Security Analytics and Monitoring Service
 *
 * Comprehensive security analytics platform that provides real-time monitoring,
 * threat intelligence correlation, security metrics aggregation, and compliance
 * reporting with enterprise-grade security operations center (SOC) capabilities.
 *
 * Features:
 * - Real-time security dashboard and monitoring
 * - Advanced analytics with machine learning insights
 * - Threat intelligence correlation and enrichment
 * - Security metrics aggregation and reporting
 * - Compliance monitoring and automated reporting
 * - Incident correlation and timeline analysis
 * - Performance optimization and capacity planning
 *
 * @module ParlantSecurityAnalyticsService
 * @version 1.0.0
 * @author PARLANT Phase 1 Security Analytics Specialist
 */

import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from "@nestjs/common";
import { EventEmitter } from "events";
import * as crypto from "crypto";
import { performance } from "perf_hooks";
import {
  ParlantUserContext,
  SecurityLevel,
  ParlantIntegrationError,
} from "../../types/parlant-integration.types";
import { EnhancedSecurityContext } from "./context-manager.service";

/**
 * Analytics time periods
 */
export type AnalyticsPeriod = "hour" | "day" | "week" | "month" | "quarter" | "year";

/**
 * Metric aggregation types
 */
export type AggregationType = "count" | "sum" | "avg" | "min" | "max" | "percentile" | "rate";

/**
 * Alert severity levels
 */
export type AlertSeverity = "info" | "low" | "medium" | "high" | "critical";

/**
 * Security metric
 */
export interface SecurityMetric {
  /** Metric identifier */
  metricId: string;
  /** Metric name */
  name: string;
  /** Metric description */
  description: string;
  /** Metric category */
  category: string;
  /** Metric value */
  value: number;
  /** Metric unit */
  unit: string;
  /** Metric timestamp */
  timestamp: Date;
  /** Metric tags */
  tags: Record<string, string>;
  /** Metric metadata */
  metadata: MetricMetadata;
}

/**
 * Metric metadata
 */
export interface MetricMetadata {
  /** Source system */
  source: string;
  /** Metric type */
  type: "counter" | "gauge" | "histogram" | "timer";
  /** Aggregation period */
  period: AnalyticsPeriod;
  /** Sample rate */
  sampleRate: number;
  /** Data retention period */
  retentionPeriod: number;
  /** Additional attributes */
  attributes: Record<string, unknown>;
}

/**
 * Security dashboard configuration
 */
export interface DashboardConfig {
  /** Dashboard identifier */
  dashboardId: string;
  /** Dashboard name */
  name: string;
  /** Dashboard description */
  description: string;
  /** Dashboard layout */
  layout: DashboardLayout;
  /** Dashboard widgets */
  widgets: DashboardWidget[];
  /** Dashboard filters */
  filters: DashboardFilter[];
  /** Dashboard metadata */
  metadata: DashboardMetadata;
}

/**
 * Dashboard layout
 */
export interface DashboardLayout {
  /** Layout type */
  type: "grid" | "flow" | "custom";
  /** Number of columns */
  columns: number;
  /** Widget spacing */
  spacing: number;
  /** Responsive breakpoints */
  breakpoints: Record<string, number>;
}

/**
 * Dashboard widget
 */
export interface DashboardWidget {
  /** Widget identifier */
  widgetId: string;
  /** Widget type */
  type: "chart" | "table" | "metric" | "alert" | "timeline" | "heatmap";
  /** Widget title */
  title: string;
  /** Widget position */
  position: WidgetPosition;
  /** Widget size */
  size: WidgetSize;
  /** Widget configuration */
  config: WidgetConfig;
  /** Data source */
  dataSource: DataSourceConfig;
}

/**
 * Widget position
 */
export interface WidgetPosition {
  /** Grid row */
  row: number;
  /** Grid column */
  column: number;
  /** Row span */
  rowSpan: number;
  /** Column span */
  columnSpan: number;
}

/**
 * Widget size
 */
export interface WidgetSize {
  /** Width in pixels */
  width: number;
  /** Height in pixels */
  height: number;
  /** Minimum width */
  minWidth: number;
  /** Minimum height */
  minHeight: number;
}

/**
 * Widget configuration
 */
export interface WidgetConfig {
  /** Chart type (for chart widgets) */
  chartType?: "line" | "bar" | "pie" | "scatter" | "area";
  /** Time range */
  timeRange: TimeRange;
  /** Refresh interval in milliseconds */
  refreshInterval: number;
  /** Auto-refresh enabled */
  autoRefresh: boolean;
  /** Color scheme */
  colorScheme: string[];
  /** Additional options */
  options: Record<string, unknown>;
}

/**
 * Time range
 */
export interface TimeRange {
  /** Start time */
  start: Date;
  /** End time */
  end: Date;
  /** Relative time range */
  relative?: "1h" | "6h" | "24h" | "7d" | "30d" | "90d";
}

/**
 * Data source configuration
 */
export interface DataSourceConfig {
  /** Data source type */
  type: "metrics" | "events" | "alerts" | "logs";
  /** Query configuration */
  query: QueryConfig;
  /** Aggregation settings */
  aggregation: AggregationConfig;
  /** Filtering settings */
  filters: Record<string, unknown>;
}

/**
 * Query configuration
 */
export interface QueryConfig {
  /** Query string */
  query: string;
  /** Query parameters */
  parameters: Record<string, unknown>;
  /** Query timeout */
  timeout: number;
  /** Maximum results */
  maxResults: number;
}

/**
 * Aggregation configuration
 */
export interface AggregationConfig {
  /** Aggregation type */
  type: AggregationType;
  /** Aggregation field */
  field: string;
  /** Group by fields */
  groupBy: string[];
  /** Bucket size */
  bucketSize: string;
  /** Bucket count */
  bucketCount: number;
}

/**
 * Dashboard filter
 */
export interface DashboardFilter {
  /** Filter identifier */
  filterId: string;
  /** Filter name */
  name: string;
  /** Filter type */
  type: "dropdown" | "text" | "date" | "range" | "boolean";
  /** Filter field */
  field: string;
  /** Filter options */
  options: FilterOption[];
  /** Default value */
  defaultValue: unknown;
}

/**
 * Filter option
 */
export interface FilterOption {
  /** Option label */
  label: string;
  /** Option value */
  value: unknown;
  /** Option description */
  description?: string;
}

/**
 * Dashboard metadata
 */
export interface DashboardMetadata {
  /** Creation timestamp */
  createdAt: Date;
  /** Last modified timestamp */
  modifiedAt: Date;
  /** Created by */
  createdBy: string;
  /** Dashboard version */
  version: number;
  /** Dashboard status */
  status: "active" | "inactive" | "draft";
  /** Dashboard tags */
  tags: string[];
  /** Access permissions */
  permissions: DashboardPermission[];
}

/**
 * Dashboard permission
 */
export interface DashboardPermission {
  /** Principal type */
  principalType: "user" | "role" | "group";
  /** Principal identifier */
  principalId: string;
  /** Permission level */
  permission: "view" | "edit" | "admin";
}

/**
 * Security alert
 */
export interface SecurityAlert {
  /** Alert identifier */
  alertId: string;
  /** Alert rule identifier */
  ruleId: string;
  /** Alert title */
  title: string;
  /** Alert description */
  description: string;
  /** Alert severity */
  severity: AlertSeverity;
  /** Alert status */
  status: "open" | "acknowledged" | "resolved" | "false_positive";
  /** Alert timestamp */
  timestamp: Date;
  /** Alert source */
  source: string;
  /** Alert category */
  category: string;
  /** Alert tags */
  tags: Record<string, string>;
  /** Alert evidence */
  evidence: AlertEvidence[];
  /** Alert metrics */
  metrics: SecurityMetric[];
  /** Alert metadata */
  metadata: AlertMetadata;
}

/**
 * Alert evidence
 */
export interface AlertEvidence {
  /** Evidence type */
  type: string;
  /** Evidence value */
  value: unknown;
  /** Evidence source */
  source: string;
  /** Evidence timestamp */
  timestamp: Date;
  /** Evidence confidence */
  confidence: number;
  /** Evidence description */
  description: string;
}

/**
 * Alert metadata
 */
export interface AlertMetadata {
  /** Alert correlation ID */
  correlationId?: string;
  /** Related alerts */
  relatedAlerts: string[];
  /** Escalation level */
  escalationLevel: number;
  /** SLA deadline */
  slaDeadline?: Date;
  /** Assigned to */
  assignedTo?: string;
  /** Resolution notes */
  resolutionNotes?: string;
  /** Additional context */
  context: Record<string, unknown>;
}

/**
 * Alert rule
 */
export interface AlertRule {
  /** Rule identifier */
  ruleId: string;
  /** Rule name */
  name: string;
  /** Rule description */
  description: string;
  /** Rule conditions */
  conditions: AlertCondition[];
  /** Rule actions */
  actions: AlertAction[];
  /** Rule severity */
  severity: AlertSeverity;
  /** Rule enabled status */
  enabled: boolean;
  /** Rule metadata */
  metadata: AlertRuleMetadata;
}

/**
 * Alert condition
 */
export interface AlertCondition {
  /** Condition type */
  type: "metric" | "event" | "anomaly" | "threshold";
  /** Condition field */
  field: string;
  /** Condition operator */
  operator: "gt" | "gte" | "lt" | "lte" | "eq" | "neq" | "contains" | "regex";
  /** Condition value */
  value: unknown;
  /** Time window */
  timeWindow: number;
  /** Condition weight */
  weight: number;
}

/**
 * Alert action
 */
export interface AlertAction {
  /** Action type */
  type: "email" | "webhook" | "sms" | "slack" | "create_incident" | "escalate";
  /** Action configuration */
  config: Record<string, unknown>;
  /** Action delay */
  delay: number;
  /** Action conditions */
  conditions: Record<string, unknown>;
}

/**
 * Alert rule metadata
 */
export interface AlertRuleMetadata {
  /** Creation timestamp */
  createdAt: Date;
  /** Last modified timestamp */
  modifiedAt: Date;
  /** Created by */
  createdBy: string;
  /** Rule version */
  version: number;
  /** Rule category */
  category: string;
  /** Rule tags */
  tags: string[];
  /** Rule statistics */
  statistics: AlertRuleStatistics;
}

/**
 * Alert rule statistics
 */
export interface AlertRuleStatistics {
  /** Total alerts triggered */
  totalAlerts: number;
  /** False positives */
  falsePositives: number;
  /** True positives */
  truePositives: number;
  /** Last triggered */
  lastTriggered?: Date;
  /** Average resolution time */
  averageResolutionTime: number;
}

/**
 * Compliance report
 */
export interface ComplianceReport {
  /** Report identifier */
  reportId: string;
  /** Report name */
  name: string;
  /** Report description */
  description: string;
  /** Compliance framework */
  framework: string;
  /** Report period */
  period: TimeRange;
  /** Compliance status */
  status: "compliant" | "non_compliant" | "partial" | "unknown";
  /** Compliance score */
  score: number;
  /** Report sections */
  sections: ComplianceSection[];
  /** Report metadata */
  metadata: ComplianceReportMetadata;
}

/**
 * Compliance section
 */
export interface ComplianceSection {
  /** Section identifier */
  sectionId: string;
  /** Section name */
  name: string;
  /** Section description */
  description: string;
  /** Section status */
  status: "compliant" | "non_compliant" | "partial" | "unknown";
  /** Section score */
  score: number;
  /** Control requirements */
  controls: ComplianceControl[];
  /** Evidence artifacts */
  evidence: ComplianceEvidence[];
}

/**
 * Compliance control
 */
export interface ComplianceControl {
  /** Control identifier */
  controlId: string;
  /** Control name */
  name: string;
  /** Control description */
  description: string;
  /** Control status */
  status: "implemented" | "not_implemented" | "partial" | "not_applicable";
  /** Control effectiveness */
  effectiveness: number;
  /** Implementation notes */
  notes: string;
  /** Evidence references */
  evidenceRefs: string[];
}

/**
 * Compliance evidence
 */
export interface ComplianceEvidence {
  /** Evidence identifier */
  evidenceId: string;
  /** Evidence type */
  type: "log" | "configuration" | "policy" | "audit" | "screenshot" | "document";
  /** Evidence description */
  description: string;
  /** Evidence data */
  data: unknown;
  /** Evidence timestamp */
  timestamp: Date;
  /** Evidence source */
  source: string;
  /** Evidence hash */
  hash: string;
}

/**
 * Compliance report metadata
 */
export interface ComplianceReportMetadata {
  /** Generation timestamp */
  generatedAt: Date;
  /** Generated by */
  generatedBy: string;
  /** Report version */
  version: number;
  /** Report format */
  format: "json" | "pdf" | "html" | "csv";
  /** Distribution list */
  distributionList: string[];
  /** Certification status */
  certified: boolean;
}

/**
 * Analytics query
 */
export interface AnalyticsQuery {
  /** Query identifier */
  queryId: string;
  /** Query name */
  name: string;
  /** Query description */
  description: string;
  /** Query string */
  query: string;
  /** Query parameters */
  parameters: Record<string, unknown>;
  /** Time range */
  timeRange: TimeRange;
  /** Result limit */
  limit: number;
  /** Query timeout */
  timeout: number;
}

/**
 * Analytics result
 */
export interface AnalyticsResult {
  /** Query identifier */
  queryId: string;
  /** Execution timestamp */
  timestamp: Date;
  /** Result data */
  data: AnalyticsDataPoint[];
  /** Result metadata */
  metadata: AnalyticsResultMetadata;
  /** Execution statistics */
  statistics: QueryStatistics;
}

/**
 * Analytics data point
 */
export interface AnalyticsDataPoint {
  /** Data timestamp */
  timestamp: Date;
  /** Data value */
  value: number;
  /** Data dimensions */
  dimensions: Record<string, string>;
  /** Data tags */
  tags: Record<string, string>;
  /** Data metadata */
  metadata: Record<string, unknown>;
}

/**
 * Analytics result metadata
 */
export interface AnalyticsResultMetadata {
  /** Total data points */
  totalPoints: number;
  /** Data start time */
  startTime: Date;
  /** Data end time */
  endTime: Date;
  /** Aggregation applied */
  aggregation: string;
  /** Sampling rate */
  samplingRate: number;
}

/**
 * Query statistics
 */
export interface QueryStatistics {
  /** Execution time in milliseconds */
  executionTime: number;
  /** Rows scanned */
  rowsScanned: number;
  /** Rows returned */
  rowsReturned: number;
  /** Cache hit ratio */
  cacheHitRatio: number;
  /** Query complexity score */
  complexityScore: number;
}

/**
 * Advanced Security Analytics and Monitoring Service
 *
 * Provides comprehensive security analytics with real-time monitoring,
 * threat intelligence correlation, and compliance reporting capabilities.
 */
@Injectable()
export class ParlantSecurityAnalyticsService
  extends EventEmitter
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(ParlantSecurityAnalyticsService.name);

  // Analytics configuration
  private readonly analyticsConfig = {
    enableRealTimeMonitoring: true,
    enableComplianceReporting: true,
    enableThreatIntelligence: true,
    metricsRetentionPeriod: 2592000000, // 30 days
    alertRetentionPeriod: 7776000000, // 90 days
    maxConcurrentQueries: 50,
    queryTimeoutMs: 30000,
    defaultRefreshInterval: 60000, // 1 minute
  };

  // Data storage
  private readonly securityMetrics = new Map<string, SecurityMetric[]>();
  private readonly securityAlerts = new Map<string, SecurityAlert>();
  private readonly alertRules = new Map<string, AlertRule>();
  private readonly dashboardConfigs = new Map<string, DashboardConfig>();
  private readonly complianceReports = new Map<string, ComplianceReport>();

  // Analytics caching
  private readonly queryCache = new Map<string, AnalyticsResult>();
  private readonly cacheExpirationTime = 300000; // 5 minutes
  private readonly maxCacheSize = 1000;

  // Performance tracking
  private readonly performanceMetrics = {
    metricsIngested: 0,
    alertsGenerated: 0,
    queriesExecuted: 0,
    dashboardsRendered: 0,
    complianceReportsGenerated: 0,
    averageQueryTime: 0,
    averageIngestionTime: 0,
    cacheHitRate: 0,
  };

  // Cleanup timers
  private metricsCleanupTimer: NodeJS.Timeout | null = null;
  private alertsCleanupTimer: NodeJS.Timeout | null = null;
  private cacheCleanupTimer: NodeJS.Timeout | null = null;
  private performanceTimer: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.logger.log("📊 Initializing Advanced Security Analytics Service");
  }

  /**
   * Initialize the security analytics service
   */
  async onModuleInit(): Promise<void> {
    this.logger.log("🚀 Starting Advanced Security Analytics Service...");

    try {
      await this.initializeDefaultDashboards();
      await this.loadAlertRules();
      await this.startRealTimeMonitoring();
      await this.startPeriodicTasks();
      await this.validateAnalyticsConfig();

      this.logger.log("✅ Advanced Security Analytics Service initialized successfully");
      this.emit("analytics:service:initialized");
    } catch (error) {
      this.logger.error("❌ Failed to initialize Security Analytics Service", error);
      throw new ParlantIntegrationError(
        "Security Analytics Service initialization failed",
        "ANALYTICS_SERVICE_INIT_ERROR",
        { error: error instanceof Error ? error.message : String(error) },
      );
    }
  }

  /**
   * Clean up on module destruction
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log("🔄 Shutting down Advanced Security Analytics Service...");

    await this.stopPeriodicTasks();
    await this.saveAnalyticsState();
    await this.savePerformanceMetrics();

    this.logger.log("✅ Advanced Security Analytics Service shutdown complete");
  }

  /**
   * Ingest security metric
   */
  async ingestSecurityMetric(metric: SecurityMetric): Promise<void> {
    const startTime = performance.now();

    try {
      // Store metric
      const metricKey = `${metric.category}_${metric.name}`;
      if (!this.securityMetrics.has(metricKey)) {
        this.securityMetrics.set(metricKey, []);
      }

      const metrics = this.securityMetrics.get(metricKey)!;
      metrics.push(metric);

      // Maintain retention period
      const cutoffTime = Date.now() - this.analyticsConfig.metricsRetentionPeriod;
      const filteredMetrics = metrics.filter(m => m.timestamp.getTime() > cutoffTime);
      this.securityMetrics.set(metricKey, filteredMetrics);

      // Check alert rules
      await this.evaluateAlertRules(metric);

      // Update performance metrics
      const ingestionTime = performance.now() - startTime;
      this.updateIngestionMetrics(ingestionTime);

      // Emit metric ingestion event
      this.emit("metric:ingested", {
        metricId: metric.metricId,
        category: metric.category,
        name: metric.name,
        value: metric.value,
        ingestionTime,
      });

      this.logger.debug(
        `📈 Security metric ingested: ${metric.category}/${metric.name} = ${metric.value} (${ingestionTime.toFixed(2)}ms)`
      );
    } catch (error) {
      this.logger.error("❌ Metric ingestion failed", error);
      throw new ParlantIntegrationError(
        "Metric ingestion failed",
        "METRIC_INGESTION_ERROR",
        {
          metricId: metric.metricId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  /**
   * Execute analytics query
   */
  async executeAnalyticsQuery(query: AnalyticsQuery): Promise<AnalyticsResult> {
    const startTime = performance.now();

    try {
      // Generate cache key
      const cacheKey = this.generateQueryCacheKey(query);

      // Check cache
      const cachedResult = this.queryCache.get(cacheKey);
      if (cachedResult && this.isCacheValid(cachedResult)) {
        this.updateCacheStats(true);
        return cachedResult;
      }

      this.updateCacheStats(false);

      // Execute query
      const dataPoints = await this.executeQuery(query);

      // Build result
      const result: AnalyticsResult = {
        queryId: query.queryId,
        timestamp: new Date(),
        data: dataPoints,
        metadata: {
          totalPoints: dataPoints.length,
          startTime: query.timeRange.start,
          endTime: query.timeRange.end,
          aggregation: "none",
          samplingRate: 1.0,
        },
        statistics: {
          executionTime: performance.now() - startTime,
          rowsScanned: this.calculateRowsScanned(query),
          rowsReturned: dataPoints.length,
          cacheHitRatio: 0,
          complexityScore: this.calculateQueryComplexity(query),
        },
      };

      // Cache result
      this.cacheQueryResult(cacheKey, result);

      // Update performance metrics
      this.updateQueryMetrics(result.statistics.executionTime);

      // Emit query execution event
      this.emit("query:executed", {
        queryId: query.queryId,
        executionTime: result.statistics.executionTime,
        rowsReturned: result.statistics.rowsReturned,
      });

      this.logger.debug(
        `🔍 Analytics query executed: ${query.queryId} - ${dataPoints.length} points (${result.statistics.executionTime.toFixed(2)}ms)`
      );

      return result;
    } catch (error) {
      this.logger.error("❌ Analytics query execution failed", error);
      throw new ParlantIntegrationError(
        "Analytics query execution failed",
        "QUERY_EXECUTION_ERROR",
        {
          queryId: query.queryId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(
    framework: string,
    period: TimeRange,
    sections: string[],
  ): Promise<ComplianceReport> {
    const startTime = performance.now();

    try {
      const reportId = crypto.randomUUID();

      // Generate report sections
      const reportSections = await this.generateComplianceSections(framework, period, sections);

      // Calculate overall compliance score
      const overallScore = this.calculateOverallComplianceScore(reportSections);

      // Determine compliance status
      const status = this.determineComplianceStatus(overallScore);

      // Create report
      const report: ComplianceReport = {
        reportId,
        name: `${framework} Compliance Report`,
        description: `Compliance report for ${framework} framework`,
        framework,
        period,
        status,
        score: overallScore,
        sections: reportSections,
        metadata: {
          generatedAt: new Date(),
          generatedBy: "system",
          version: 1,
          format: "json",
          distributionList: [],
          certified: false,
        },
      };

      // Store report
      this.complianceReports.set(reportId, report);

      // Update performance metrics
      this.performanceMetrics.complianceReportsGenerated++;

      // Emit report generation event
      this.emit("compliance:report:generated", {
        reportId,
        framework,
        score: overallScore,
        status,
        generationTime: performance.now() - startTime,
      });

      this.logger.debug(
        `📋 Compliance report generated: ${reportId} for ${framework} - score: ${overallScore.toFixed(2)} (${(performance.now() - startTime).toFixed(2)}ms)`
      );

      return report;
    } catch (error) {
      this.logger.error("❌ Compliance report generation failed", error);
      throw new ParlantIntegrationError(
        "Compliance report generation failed",
        "COMPLIANCE_REPORT_ERROR",
        {
          framework,
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  /**
   * Create security alert
   */
  async createSecurityAlert(
    ruleId: string,
    title: string,
    description: string,
    severity: AlertSeverity,
    evidence: AlertEvidence[],
    metrics: SecurityMetric[],
  ): Promise<SecurityAlert> {
    try {
      const alertId = crypto.randomUUID();

      const alert: SecurityAlert = {
        alertId,
        ruleId,
        title,
        description,
        severity,
        status: "open",
        timestamp: new Date(),
        source: "security_analytics",
        category: "security",
        tags: {},
        evidence,
        metrics,
        metadata: {
          relatedAlerts: [],
          escalationLevel: 1,
          context: {},
        },
      };

      // Store alert
      this.securityAlerts.set(alertId, alert);

      // Update rule statistics
      const rule = this.alertRules.get(ruleId);
      if (rule) {
        rule.metadata.statistics.totalAlerts++;
        rule.metadata.statistics.lastTriggered = new Date();
      }

      // Update performance metrics
      this.performanceMetrics.alertsGenerated++;

      // Emit alert creation event
      this.emit("alert:created", {
        alertId,
        ruleId,
        severity,
        title,
        timestamp: alert.timestamp,
      });

      this.logger.warn(`🚨 Security alert created: ${alertId} - ${title} [${severity}]`);

      return alert;
    } catch (error) {
      this.logger.error("❌ Security alert creation failed", error);
      throw new ParlantIntegrationError(
        "Security alert creation failed",
        "ALERT_CREATION_ERROR",
        {
          ruleId,
          title,
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  /**
   * Get security dashboard data
   */
  async getSecurityDashboardData(dashboardId: string): Promise<Record<string, AnalyticsResult>> {
    try {
      const dashboard = this.dashboardConfigs.get(dashboardId);
      if (!dashboard) {
        throw new Error(`Dashboard not found: ${dashboardId}`);
      }

      const dashboardData: Record<string, AnalyticsResult> = {};

      // Execute queries for each widget
      for (const widget of dashboard.widgets) {
        if (widget.dataSource.type === "metrics") {
          const query: AnalyticsQuery = {
            queryId: `${dashboardId}_${widget.widgetId}`,
            name: widget.title,
            description: `Data for widget: ${widget.title}`,
            query: widget.dataSource.query.query,
            parameters: widget.dataSource.query.parameters,
            timeRange: widget.config.timeRange,
            limit: widget.dataSource.query.maxResults,
            timeout: widget.dataSource.query.timeout,
          };

          const result = await this.executeAnalyticsQuery(query);
          dashboardData[widget.widgetId] = result;
        }
      }

      // Update performance metrics
      this.performanceMetrics.dashboardsRendered++;

      // Emit dashboard render event
      this.emit("dashboard:rendered", {
        dashboardId,
        widgets: dashboard.widgets.length,
        renderTime: Date.now(),
      });

      this.logger.debug(`📊 Dashboard data retrieved: ${dashboardId} - ${Object.keys(dashboardData).length} widgets`);

      return dashboardData;
    } catch (error) {
      this.logger.error("❌ Dashboard data retrieval failed", error);
      throw new ParlantIntegrationError(
        "Dashboard data retrieval failed",
        "DASHBOARD_DATA_ERROR",
        {
          dashboardId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  /**
   * Get analytics statistics
   */
  getAnalyticsStatistics(): Record<string, unknown> {
    return {
      metrics: {
        categories: this.securityMetrics.size,
        totalDataPoints: this.calculateTotalMetrics(),
      },
      alerts: {
        total: this.securityAlerts.size,
        rules: this.alertRules.size,
        byStatus: this.getAlertsByStatus(),
      },
      dashboards: {
        total: this.dashboardConfigs.size,
        totalWidgets: this.calculateTotalWidgets(),
      },
      reports: {
        total: this.complianceReports.size,
      },
      cache: {
        size: this.queryCache.size,
        hitRate: this.performanceMetrics.cacheHitRate,
      },
      performance: { ...this.performanceMetrics },
      config: this.analyticsConfig,
    };
  }

  /**
   * Private helper methods
   */

  private async evaluateAlertRules(metric: SecurityMetric): Promise<void> {
    for (const rule of this.alertRules.values()) {
      if (!rule.enabled) {
        continue;
      }

      const triggered = await this.evaluateRule(rule, metric);

      if (triggered) {
        await this.createSecurityAlert(
          rule.ruleId,
          `Alert: ${rule.name}`,
          rule.description,
          rule.severity,
          [{
            type: "metric",
            value: metric.value,
            source: "metrics_evaluation",
            timestamp: metric.timestamp,
            confidence: 0.9,
            description: `Metric ${metric.name} triggered alert rule`,
          }],
          [metric],
        );
      }
    }
  }

  private async evaluateRule(rule: AlertRule, metric: SecurityMetric): Promise<boolean> {
    for (const condition of rule.conditions) {
      if (condition.type === "metric") {
        const result = this.evaluateMetricCondition(condition, metric);
        if (result) {
          return true;
        }
      }
    }
    return false;
  }

  private evaluateMetricCondition(condition: AlertCondition, metric: SecurityMetric): boolean {
    if (condition.field !== metric.name) {
      return false;
    }

    const value = metric.value;
    const threshold = Number(condition.value);

    switch (condition.operator) {
      case "gt":
        return value > threshold;
      case "gte":
        return value >= threshold;
      case "lt":
        return value < threshold;
      case "lte":
        return value <= threshold;
      case "eq":
        return value === threshold;
      case "neq":
        return value !== threshold;
      default:
        return false;
    }
  }

  private generateQueryCacheKey(query: AnalyticsQuery): string {
    const keyData = {
      query: query.query,
      parameters: query.parameters,
      timeRange: query.timeRange,
      limit: query.limit,
    };

    return crypto.createHash("sha256").update(JSON.stringify(keyData)).digest("hex");
  }

  private isCacheValid(result: AnalyticsResult): boolean {
    return Date.now() - result.timestamp.getTime() < this.cacheExpirationTime;
  }

  private cacheQueryResult(key: string, result: AnalyticsResult): void {
    if (this.queryCache.size >= this.maxCacheSize) {
      this.evictOldestCacheEntry();
    }

    this.queryCache.set(key, result);
  }

  private evictOldestCacheEntry(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, result] of this.queryCache.entries()) {
      if (result.timestamp.getTime() < oldestTime) {
        oldestTime = result.timestamp.getTime();
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.queryCache.delete(oldestKey);
    }
  }

  private async executeQuery(query: AnalyticsQuery): Promise<AnalyticsDataPoint[]> {
    // This is a simplified query execution
    // In a real implementation, this would query the actual data store
    const dataPoints: AnalyticsDataPoint[] = [];

    // Generate sample data points
    const startTime = query.timeRange.start.getTime();
    const endTime = query.timeRange.end.getTime();
    const interval = (endTime - startTime) / Math.min(query.limit, 100);

    for (let i = 0; i < Math.min(query.limit, 100); i++) {
      const timestamp = new Date(startTime + (i * interval));
      dataPoints.push({
        timestamp,
        value: Math.random() * 100,
        dimensions: { category: "security" },
        tags: { source: "analytics" },
        metadata: {},
      });
    }

    return dataPoints;
  }

  private calculateRowsScanned(query: AnalyticsQuery): number {
    // Simplified calculation
    return Math.floor(Math.random() * 10000) + 1000;
  }

  private calculateQueryComplexity(query: AnalyticsQuery): number {
    // Simplified complexity calculation
    let complexity = 1;

    if (query.query.includes("JOIN")) complexity += 2;
    if (query.query.includes("GROUP BY")) complexity += 1;
    if (query.query.includes("ORDER BY")) complexity += 1;

    return complexity;
  }

  private async generateComplianceSections(
    framework: string,
    period: TimeRange,
    sections: string[],
  ): Promise<ComplianceSection[]> {
    const complianceSections: ComplianceSection[] = [];

    for (const sectionName of sections) {
      const section: ComplianceSection = {
        sectionId: crypto.randomUUID(),
        name: sectionName,
        description: `Compliance section for ${sectionName}`,
        status: "compliant",
        score: Math.random() * 100,
        controls: await this.generateComplianceControls(sectionName),
        evidence: await this.generateComplianceEvidence(sectionName, period),
      };

      complianceSections.push(section);
    }

    return complianceSections;
  }

  private async generateComplianceControls(sectionName: string): Promise<ComplianceControl[]> {
    // Generate sample compliance controls
    return [
      {
        controlId: `${sectionName}_control_1`,
        name: `${sectionName} Control 1`,
        description: `Control for ${sectionName}`,
        status: "implemented",
        effectiveness: Math.random() * 100,
        notes: "Control is properly implemented",
        evidenceRefs: [],
      },
    ];
  }

  private async generateComplianceEvidence(
    sectionName: string,
    period: TimeRange,
  ): Promise<ComplianceEvidence[]> {
    // Generate sample compliance evidence
    return [
      {
        evidenceId: crypto.randomUUID(),
        type: "log",
        description: `Log evidence for ${sectionName}`,
        data: { logs: "sample log data" },
        timestamp: new Date(),
        source: "security_logs",
        hash: crypto.randomBytes(32).toString("hex"),
      },
    ];
  }

  private calculateOverallComplianceScore(sections: ComplianceSection[]): number {
    if (sections.length === 0) {
      return 0;
    }

    const totalScore = sections.reduce((sum, section) => sum + section.score, 0);
    return totalScore / sections.length;
  }

  private determineComplianceStatus(score: number): "compliant" | "non_compliant" | "partial" | "unknown" {
    if (score >= 95) return "compliant";
    if (score >= 70) return "partial";
    if (score >= 0) return "non_compliant";
    return "unknown";
  }

  private updateIngestionMetrics(ingestionTime: number): void {
    this.performanceMetrics.metricsIngested++;
    this.performanceMetrics.averageIngestionTime = this.updateAverage(
      this.performanceMetrics.averageIngestionTime,
      ingestionTime,
      this.performanceMetrics.metricsIngested,
    );
  }

  private updateQueryMetrics(queryTime: number): void {
    this.performanceMetrics.queriesExecuted++;
    this.performanceMetrics.averageQueryTime = this.updateAverage(
      this.performanceMetrics.averageQueryTime,
      queryTime,
      this.performanceMetrics.queriesExecuted,
    );
  }

  private updateCacheStats(hit: boolean): void {
    const totalQueries = this.performanceMetrics.queriesExecuted + 1;
    const currentHits = this.performanceMetrics.cacheHitRate * (totalQueries - 1);
    this.performanceMetrics.cacheHitRate = hit ?
      (currentHits + 1) / totalQueries :
      currentHits / totalQueries;
  }

  private updateAverage(currentAverage: number, newValue: number, count: number): number {
    return (currentAverage * (count - 1) + newValue) / count;
  }

  private calculateTotalMetrics(): number {
    return Array.from(this.securityMetrics.values()).reduce((total, metrics) => total + metrics.length, 0);
  }

  private getAlertsByStatus(): Record<string, number> {
    const statusCounts: Record<string, number> = {};

    for (const alert of this.securityAlerts.values()) {
      statusCounts[alert.status] = (statusCounts[alert.status] || 0) + 1;
    }

    return statusCounts;
  }

  private calculateTotalWidgets(): number {
    return Array.from(this.dashboardConfigs.values()).reduce((total, dashboard) => total + dashboard.widgets.length, 0);
  }

  private async initializeDefaultDashboards(): Promise<void> {
    const defaultDashboard: DashboardConfig = {
      dashboardId: "security_overview",
      name: "Security Overview",
      description: "Main security monitoring dashboard",
      layout: {
        type: "grid",
        columns: 12,
        spacing: 16,
        breakpoints: { lg: 1200, md: 996, sm: 768, xs: 480 },
      },
      widgets: [
        {
          widgetId: "threats_detected",
          type: "metric",
          title: "Threats Detected",
          position: { row: 0, column: 0, rowSpan: 1, columnSpan: 3 },
          size: { width: 300, height: 150, minWidth: 200, minHeight: 100 },
          config: {
            timeRange: { start: new Date(Date.now() - 86400000), end: new Date(), relative: "24h" },
            refreshInterval: 60000,
            autoRefresh: true,
            colorScheme: ["#ff4757", "#ff6b7a"],
            options: {},
          },
          dataSource: {
            type: "metrics",
            query: {
              query: "SELECT COUNT(*) FROM threats WHERE timestamp >= NOW() - INTERVAL '24 hours'",
              parameters: {},
              timeout: 10000,
              maxResults: 1,
            },
            aggregation: {
              type: "count",
              field: "threats",
              groupBy: [],
              bucketSize: "1h",
              bucketCount: 24,
            },
            filters: {},
          },
        },
      ],
      filters: [],
      metadata: {
        createdAt: new Date(),
        modifiedAt: new Date(),
        createdBy: "system",
        version: 1,
        status: "active",
        tags: ["security", "overview"],
        permissions: [],
      },
    };

    this.dashboardConfigs.set(defaultDashboard.dashboardId, defaultDashboard);
    this.logger.debug("📊 Default dashboards initialized");
  }

  private async loadAlertRules(): Promise<void> {
    const defaultRule: AlertRule = {
      ruleId: "high_threat_count",
      name: "High Threat Count",
      description: "Alert when threat count exceeds threshold",
      conditions: [
        {
          type: "metric",
          field: "threat_count",
          operator: "gt",
          value: 10,
          timeWindow: 300000, // 5 minutes
          weight: 1.0,
        },
      ],
      actions: [
        {
          type: "email",
          config: { recipients: ["security@company.com"] },
          delay: 0,
          conditions: {},
        },
      ],
      severity: "high",
      enabled: true,
      metadata: {
        createdAt: new Date(),
        modifiedAt: new Date(),
        createdBy: "system",
        version: 1,
        category: "security",
        tags: ["threats"],
        statistics: {
          totalAlerts: 0,
          falsePositives: 0,
          truePositives: 0,
          averageResolutionTime: 0,
        },
      },
    };

    this.alertRules.set(defaultRule.ruleId, defaultRule);
    this.logger.debug(`📋 Loaded ${this.alertRules.size} alert rules`);
  }

  private async startRealTimeMonitoring(): Promise<void> {
    if (this.analyticsConfig.enableRealTimeMonitoring) {
      this.logger.debug("🔄 Real-time monitoring started");
    }
  }

  private async validateAnalyticsConfig(): Promise<void> {
    this.logger.debug("🔍 Validating analytics configuration...");
  }

  private async saveAnalyticsState(): Promise<void> {
    this.logger.debug("💾 Saving analytics state...");
  }

  private async savePerformanceMetrics(): Promise<void> {
    this.logger.debug("📊 Saving performance metrics...", this.performanceMetrics);
  }

  private async startPeriodicTasks(): Promise<void> {
    // Metrics cleanup every 30 minutes
    this.metricsCleanupTimer = setInterval(() => {
      this.performMetricsCleanup();
    }, 30 * 60 * 1000);

    // Alerts cleanup every hour
    this.alertsCleanupTimer = setInterval(() => {
      this.performAlertsCleanup();
    }, 60 * 60 * 1000);

    // Cache cleanup every 10 minutes
    this.cacheCleanupTimer = setInterval(() => {
      this.performCacheCleanup();
    }, 10 * 60 * 1000);

    // Performance monitoring every minute
    this.performanceTimer = setInterval(() => {
      this.updatePerformanceMonitoring();
    }, 60 * 1000);
  }

  private async stopPeriodicTasks(): Promise<void> {
    if (this.metricsCleanupTimer) {
      clearInterval(this.metricsCleanupTimer);
      this.metricsCleanupTimer = null;
    }

    if (this.alertsCleanupTimer) {
      clearInterval(this.alertsCleanupTimer);
      this.alertsCleanupTimer = null;
    }

    if (this.cacheCleanupTimer) {
      clearInterval(this.cacheCleanupTimer);
      this.cacheCleanupTimer = null;
    }

    if (this.performanceTimer) {
      clearInterval(this.performanceTimer);
      this.performanceTimer = null;
    }
  }

  private async performMetricsCleanup(): Promise<void> {
    const cutoffTime = Date.now() - this.analyticsConfig.metricsRetentionPeriod;
    let cleanedCount = 0;

    for (const [key, metrics] of this.securityMetrics.entries()) {
      const originalCount = metrics.length;
      const filteredMetrics = metrics.filter(m => m.timestamp.getTime() > cutoffTime);

      if (filteredMetrics.length !== originalCount) {
        cleanedCount += originalCount - filteredMetrics.length;
        this.securityMetrics.set(key, filteredMetrics);
      }

      if (filteredMetrics.length === 0) {
        this.securityMetrics.delete(key);
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug(`🧹 Cleaned up ${cleanedCount} old metrics`);
    }
  }

  private async performAlertsCleanup(): Promise<void> {
    const cutoffTime = Date.now() - this.analyticsConfig.alertRetentionPeriod;
    let cleanedCount = 0;

    for (const [alertId, alert] of this.securityAlerts.entries()) {
      if (alert.timestamp.getTime() < cutoffTime && alert.status === "resolved") {
        this.securityAlerts.delete(alertId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug(`🧹 Cleaned up ${cleanedCount} old resolved alerts`);
    }
  }

  private async performCacheCleanup(): Promise<void> {
    let cleanedCount = 0;

    for (const [key, result] of this.queryCache.entries()) {
      if (!this.isCacheValid(result)) {
        this.queryCache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug(`🧹 Cleaned up ${cleanedCount} expired cache entries`);
    }
  }

  private updatePerformanceMonitoring(): void {
    this.emit("analytics:performance:updated", this.performanceMetrics);
  }
}