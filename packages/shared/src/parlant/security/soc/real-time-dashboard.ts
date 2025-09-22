/**
 * Real-Time Security Operations Center (SOC) Dashboard
 *
 * Comprehensive real-time dashboard for monitoring security events,
 * threat indicators, compliance status, and incident response
 *
 * @fileoverview SOC Real-Time Dashboard
 * @version 2.0.0
 * @author PARLANT SOC Dashboard Specialist
 */

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Dashboard Widget Types
 */
export enum WidgetType {
  THREAT_OVERVIEW = 'threat_overview',
  SECURITY_METRICS = 'security_metrics',
  INCIDENT_TRACKER = 'incident_tracker',
  COMPLIANCE_STATUS = 'compliance_status',
  REAL_TIME_ALERTS = 'real_time_alerts',
  BEHAVIORAL_ANALYTICS = 'behavioral_analytics',
  NETWORK_MONITORING = 'network_monitoring',
  ACCESS_LOGS = 'access_logs',
  VULNERABILITY_STATUS = 'vulnerability_status',
  AUDIT_TRAIL = 'audit_trail',
  GEOGRAPHIC_VIEW = 'geographic_view',
  TREND_ANALYSIS = 'trend_analysis'
}

/**
 * Dashboard Layout Configuration
 */
export interface DashboardLayout {
  layoutId: string;
  name: string;
  description: string;
  createdBy: string;
  createdAt: Date;
  lastModified: Date;
  isDefault: boolean;

  widgets: WidgetConfiguration[];
  filters: DashboardFilter[];
  refreshInterval: number; // milliseconds

  permissions: {
    view: string[];
    edit: string[];
    share: string[];
  };
}

export interface WidgetConfiguration {
  widgetId: string;
  type: WidgetType;
  title: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  config: WidgetConfig;
  dataSource: DataSourceConfig;
  refreshInterval?: number;
  visible: boolean;
}

export interface WidgetConfig {
  // Chart/visualization settings
  chartType?: 'line' | 'bar' | 'pie' | 'scatter' | 'heatmap' | 'gauge' | 'table';
  timeRange?: TimeRange;
  aggregation?: 'sum' | 'avg' | 'count' | 'max' | 'min';

  // Display settings
  showLegend?: boolean;
  showGrid?: boolean;
  colorScheme?: string;
  theme?: 'light' | 'dark';

  // Thresholds and alerts
  thresholds?: Threshold[];
  alerting?: AlertConfig;

  // Widget-specific settings
  customSettings?: Record<string, unknown>;
}

export interface DataSourceConfig {
  source: 'security_events' | 'audit_logs' | 'threat_intel' | 'compliance_data' | 'behavioral_data';
  query: QueryConfig;
  filters: DataFilter[];
  joinSources?: DataSourceConfig[];
}

export interface QueryConfig {
  fields: string[];
  conditions: QueryCondition[];
  groupBy?: string[];
  orderBy?: { field: string; direction: 'asc' | 'desc' }[];
  limit?: number;
}

export interface QueryCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in' | 'between';
  value: unknown;
}

export interface DataFilter {
  id: string;
  name: string;
  field: string;
  type: 'text' | 'number' | 'date' | 'select' | 'multiselect';
  values?: FilterOption[];
  defaultValue?: unknown;
}

export interface FilterOption {
  label: string;
  value: unknown;
  count?: number;
}

export interface DashboardFilter {
  filterId: string;
  name: string;
  type: 'global' | 'widget_specific';
  targetWidgets?: string[];
  config: DataFilter;
}

export interface TimeRange {
  type: 'relative' | 'absolute';
  // Relative: last 1h, 24h, 7d, 30d
  relative?: { amount: number; unit: 'minutes' | 'hours' | 'days' | 'weeks' | 'months' };
  // Absolute: specific start/end times
  absolute?: { start: Date; end: Date };
}

export interface Threshold {
  id: string;
  name: string;
  value: number;
  operator: 'greater_than' | 'less_than' | 'equals';
  severity: 'info' | 'warning' | 'critical';
  color: string;
}

export interface AlertConfig {
  enabled: boolean;
  conditions: AlertCondition[];
  notifications: NotificationConfig[];
}

export interface AlertCondition {
  field: string;
  operator: string;
  value: unknown;
  duration?: number; // seconds
}

export interface NotificationConfig {
  type: 'email' | 'slack' | 'webhook' | 'sms';
  recipients: string[];
  template?: string;
  enabled: boolean;
}

/**
 * Real-Time Dashboard Data
 */
export interface DashboardSnapshot {
  snapshotId: string;
  layoutId: string;
  timestamp: Date;
  widgets: WidgetSnapshot[];
  metadata: {
    refreshDuration: number;
    dataLatency: number;
    errorCount: number;
    warningCount: number;
  };
}

export interface WidgetSnapshot {
  widgetId: string;
  type: WidgetType;
  data: WidgetData;
  status: 'success' | 'warning' | 'error' | 'loading';
  lastUpdated: Date;
  metadata: {
    queryTime: number;
    dataPoints: number;
    cacheHit: boolean;
  };
}

export interface WidgetData {
  // Chart data
  series?: DataSeries[];

  // Table data
  rows?: TableRow[];
  columns?: TableColumn[];

  // Metric data
  value?: number | string;
  previousValue?: number | string;
  trend?: 'up' | 'down' | 'stable';
  trendPercentage?: number;

  // Status data
  status?: 'healthy' | 'warning' | 'critical' | 'unknown';
  details?: StatusDetail[];

  // Geographic data
  locations?: GeoDataPoint[];

  // Raw data for custom widgets
  raw?: Record<string, unknown>[];
}

export interface DataSeries {
  name: string;
  data: DataPoint[];
  color?: string;
  type?: 'line' | 'bar' | 'area';
}

export interface DataPoint {
  timestamp?: Date;
  value: number;
  label?: string;
  metadata?: Record<string, unknown>;
}

export interface TableRow {
  id: string;
  cells: TableCell[];
  status?: 'normal' | 'warning' | 'error';
  actions?: RowAction[];
}

export interface TableCell {
  value: unknown;
  displayValue?: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'status' | 'action';
  formatting?: CellFormatting;
}

export interface CellFormatting {
  color?: string;
  backgroundColor?: string;
  fontWeight?: 'normal' | 'bold';
  alignment?: 'left' | 'center' | 'right';
  prefix?: string;
  suffix?: string;
}

export interface TableColumn {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'status' | 'action';
  width?: number;
  sortable?: boolean;
  filterable?: boolean;
}

export interface RowAction {
  id: string;
  label: string;
  type: 'button' | 'link' | 'dropdown';
  action: string;
  confirmation?: string;
  permissions?: string[];
}

export interface StatusDetail {
  label: string;
  value: string | number;
  status?: 'normal' | 'warning' | 'error';
  description?: string;
}

export interface GeoDataPoint {
  latitude: number;
  longitude: number;
  value: number;
  label: string;
  metadata?: Record<string, unknown>;
}

/**
 * Real-Time Event Streaming
 */
export interface RealTimeEvent {
  eventId: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  source: string;
  data: Record<string, unknown>;
  affectedWidgets: string[];
}

@Injectable()
export class RealTimeSOCDashboard {
  private readonly logger = new Logger(RealTimeSOCDashboard.name);
  private readonly eventEmitter: EventEmitter2;

  // Dashboard state
  private readonly dashboardLayouts: Map<string, DashboardLayout> = new Map();
  private readonly activeSnapshots: Map<string, DashboardSnapshot> = new Map();
  private readonly widgetCache: Map<string, { data: WidgetData; timestamp: Date }> = new Map();

  // Real-time streaming
  private readonly activeConnections: Map<string, WebSocketConnection> = new Map();
  private readonly eventBuffer: Map<string, RealTimeEvent[]> = new Map();

  // Configuration
  private readonly defaultRefreshInterval = 30000; // 30 seconds
  private readonly maxEventBufferSize = 1000;
  private readonly cacheExpiration = 60000; // 1 minute

  // Statistics
  private totalDashboardViews = 0;
  private totalWidgetRenders = 0;
  private averageResponseTime = 0;

  constructor(eventEmitter: EventEmitter2) {
    this.eventEmitter = eventEmitter;
    this.initializeDefaultDashboards();
    this.startRealTimeEventProcessing();
    this.logger.log('Real-Time SOC Dashboard initialized');
  }

  /**
   * Initialize default dashboard layouts
   */
  private initializeDefaultDashboards(): void {
    const securityOverviewDashboard = this.createSecurityOverviewDashboard();
    const incidentResponseDashboard = this.createIncidentResponseDashboard();
    const complianceDashboard = this.createComplianceDashboard();
    const threatHuntingDashboard = this.createThreatHuntingDashboard();

    this.dashboardLayouts.set(securityOverviewDashboard.layoutId, securityOverviewDashboard);
    this.dashboardLayouts.set(incidentResponseDashboard.layoutId, incidentResponseDashboard);
    this.dashboardLayouts.set(complianceDashboard.layoutId, complianceDashboard);
    this.dashboardLayouts.set(threatHuntingDashboard.layoutId, threatHuntingDashboard);

    this.logger.log(`Initialized ${this.dashboardLayouts.size} default dashboard layouts`);
  }

  /**
   * Create Security Overview Dashboard
   */
  private createSecurityOverviewDashboard(): DashboardLayout {
    return {
      layoutId: 'security_overview',
      name: 'Security Overview',
      description: 'High-level security posture and key metrics',
      createdBy: 'system',
      createdAt: new Date(),
      lastModified: new Date(),
      isDefault: true,
      refreshInterval: 30000,

      widgets: [
        {
          widgetId: 'threat_level_gauge',
          type: WidgetType.THREAT_OVERVIEW,
          title: 'Current Threat Level',
          position: { x: 0, y: 0 },
          size: { width: 4, height: 3 },
          config: {
            chartType: 'gauge',
            thresholds: [
              { id: 'low', name: 'Low', value: 30, operator: 'less_than', severity: 'info', color: '#28a745' },
              { id: 'medium', name: 'Medium', value: 60, operator: 'less_than', severity: 'warning', color: '#ffc107' },
              { id: 'high', name: 'High', value: 80, operator: 'less_than', severity: 'warning', color: '#fd7e14' },
              { id: 'critical', name: 'Critical', value: 100, operator: 'less_than', severity: 'critical', color: '#dc3545' }
            ]
          },
          dataSource: {
            source: 'security_events',
            query: {
              fields: ['threat_score'],
              conditions: []
            },
            filters: []
          },
          visible: true
        },
        {
          widgetId: 'active_incidents',
          type: WidgetType.INCIDENT_TRACKER,
          title: 'Active Security Incidents',
          position: { x: 4, y: 0 },
          size: { width: 8, height: 3 },
          config: {
            chartType: 'table',
            timeRange: { type: 'relative', relative: { amount: 24, unit: 'hours' } }
          },
          dataSource: {
            source: 'security_events',
            query: {
              fields: ['incident_id', 'severity', 'status', 'created_at', 'assigned_to'],
              conditions: [
                { field: 'status', operator: 'in', value: ['open', 'investigating', 'escalated'] }
              ]
            },
            filters: []
          },
          visible: true
        },
        {
          widgetId: 'security_events_timeline',
          type: WidgetType.REAL_TIME_ALERTS,
          title: 'Security Events Timeline',
          position: { x: 0, y: 3 },
          size: { width: 12, height: 4 },
          config: {
            chartType: 'line',
            timeRange: { type: 'relative', relative: { amount: 24, unit: 'hours' } },
            aggregation: 'count'
          },
          dataSource: {
            source: 'security_events',
            query: {
              fields: ['timestamp', 'severity'],
              conditions: [],
              groupBy: ['severity']
            },
            filters: []
          },
          visible: true
        },
        {
          widgetId: 'compliance_overview',
          type: WidgetType.COMPLIANCE_STATUS,
          title: 'Compliance Status Overview',
          position: { x: 0, y: 7 },
          size: { width: 6, height: 3 },
          config: {
            chartType: 'pie'
          },
          dataSource: {
            source: 'compliance_data',
            query: {
              fields: ['framework', 'compliance_score'],
              conditions: []
            },
            filters: []
          },
          visible: true
        },
        {
          widgetId: 'top_threats',
          type: WidgetType.THREAT_OVERVIEW,
          title: 'Top Threat Categories',
          position: { x: 6, y: 7 },
          size: { width: 6, height: 3 },
          config: {
            chartType: 'bar',
            timeRange: { type: 'relative', relative: { amount: 7, unit: 'days' } }
          },
          dataSource: {
            source: 'security_events',
            query: {
              fields: ['threat_category', 'count'],
              conditions: [],
              groupBy: ['threat_category'],
              orderBy: [{ field: 'count', direction: 'desc' }],
              limit: 10
            },
            filters: []
          },
          visible: true
        }
      ],

      filters: [
        {
          filterId: 'time_range',
          name: 'Time Range',
          type: 'global',
          config: {
            id: 'global_time_range',
            name: 'Time Range',
            field: 'timestamp',
            type: 'select',
            values: [
              { label: 'Last 1 Hour', value: { type: 'relative', relative: { amount: 1, unit: 'hours' } } },
              { label: 'Last 24 Hours', value: { type: 'relative', relative: { amount: 24, unit: 'hours' } } },
              { label: 'Last 7 Days', value: { type: 'relative', relative: { amount: 7, unit: 'days' } } },
              { label: 'Last 30 Days', value: { type: 'relative', relative: { amount: 30, unit: 'days' } } }
            ],
            defaultValue: { type: 'relative', relative: { amount: 24, unit: 'hours' } }
          }
        },
        {
          filterId: 'severity_filter',
          name: 'Severity',
          type: 'global',
          config: {
            id: 'global_severity',
            name: 'Severity',
            field: 'severity',
            type: 'multiselect',
            values: [
              { label: 'Critical', value: 'critical' },
              { label: 'High', value: 'high' },
              { label: 'Medium', value: 'medium' },
              { label: 'Low', value: 'low' }
            ]
          }
        }
      ],

      permissions: {
        view: ['analyst', 'senior_analyst', 'manager', 'admin'],
        edit: ['senior_analyst', 'manager', 'admin'],
        share: ['manager', 'admin']
      }
    };
  }

  /**
   * Create Incident Response Dashboard
   */
  private createIncidentResponseDashboard(): DashboardLayout {
    return {
      layoutId: 'incident_response',
      name: 'Incident Response',
      description: 'Real-time incident tracking and response coordination',
      createdBy: 'system',
      createdAt: new Date(),
      lastModified: new Date(),
      isDefault: true,
      refreshInterval: 15000, // 15 seconds for incident response

      widgets: [
        {
          widgetId: 'incident_queue',
          type: WidgetType.INCIDENT_TRACKER,
          title: 'Incident Response Queue',
          position: { x: 0, y: 0 },
          size: { width: 12, height: 6 },
          config: {
            chartType: 'table',
            alerting: {
              enabled: true,
              conditions: [
                { field: 'severity', operator: 'equals', value: 'critical' },
                { field: 'age_minutes', operator: 'greater_than', value: 30 }
              ],
              notifications: [
                {
                  type: 'email',
                  recipients: ['soc@company.com'],
                  enabled: true
                }
              ]
            }
          },
          dataSource: {
            source: 'security_events',
            query: {
              fields: ['incident_id', 'title', 'severity', 'status', 'assigned_to', 'created_at', 'age_minutes'],
              conditions: [
                { field: 'type', operator: 'equals', value: 'incident' }
              ],
              orderBy: [
                { field: 'severity', direction: 'desc' },
                { field: 'created_at', direction: 'desc' }
              ]
            },
            filters: []
          },
          visible: true
        },
        {
          widgetId: 'response_metrics',
          type: WidgetType.SECURITY_METRICS,
          title: 'Response Time Metrics',
          position: { x: 0, y: 6 },
          size: { width: 6, height: 4 },
          config: {
            chartType: 'line',
            timeRange: { type: 'relative', relative: { amount: 7, unit: 'days' } }
          },
          dataSource: {
            source: 'security_events',
            query: {
              fields: ['date', 'avg_response_time', 'avg_resolution_time'],
              conditions: [
                { field: 'type', operator: 'equals', value: 'incident' },
                { field: 'status', operator: 'equals', value: 'resolved' }
              ],
              groupBy: ['date']
            },
            filters: []
          },
          visible: true
        },
        {
          widgetId: 'incident_distribution',
          type: WidgetType.INCIDENT_TRACKER,
          title: 'Incident Distribution by Severity',
          position: { x: 6, y: 6 },
          size: { width: 6, height: 4 },
          config: {
            chartType: 'pie'
          },
          dataSource: {
            source: 'security_events',
            query: {
              fields: ['severity', 'count'],
              conditions: [
                { field: 'type', operator: 'equals', value: 'incident' }
              ],
              groupBy: ['severity']
            },
            filters: []
          },
          visible: true
        }
      ],

      filters: [],

      permissions: {
        view: ['analyst', 'senior_analyst', 'manager', 'admin'],
        edit: ['senior_analyst', 'manager', 'admin'],
        share: ['manager', 'admin']
      }
    };
  }

  /**
   * Create Compliance Dashboard
   */
  private createComplianceDashboard(): DashboardLayout {
    return {
      layoutId: 'compliance_monitoring',
      name: 'Compliance Monitoring',
      description: 'SOC2, GDPR, HIPAA, and PCI DSS compliance monitoring',
      createdBy: 'system',
      createdAt: new Date(),
      lastModified: new Date(),
      isDefault: true,
      refreshInterval: 300000, // 5 minutes

      widgets: [
        {
          widgetId: 'compliance_scores',
          type: WidgetType.COMPLIANCE_STATUS,
          title: 'Compliance Framework Scores',
          position: { x: 0, y: 0 },
          size: { width: 12, height: 4 },
          config: {
            chartType: 'bar',
            thresholds: [
              { id: 'failing', name: 'Failing', value: 70, operator: 'less_than', severity: 'critical', color: '#dc3545' },
              { id: 'needs_improvement', name: 'Needs Improvement', value: 85, operator: 'less_than', severity: 'warning', color: '#ffc107' },
              { id: 'good', name: 'Good', value: 95, operator: 'less_than', severity: 'info', color: '#17a2b8' },
              { id: 'excellent', name: 'Excellent', value: 100, operator: 'less_than', severity: 'info', color: '#28a745' }
            ]
          },
          dataSource: {
            source: 'compliance_data',
            query: {
              fields: ['framework', 'compliance_score', 'last_assessment'],
              conditions: []
            },
            filters: []
          },
          visible: true
        },
        {
          widgetId: 'audit_findings',
          type: WidgetType.AUDIT_TRAIL,
          title: 'Recent Audit Findings',
          position: { x: 0, y: 4 },
          size: { width: 8, height: 6 },
          config: {
            chartType: 'table'
          },
          dataSource: {
            source: 'audit_logs',
            query: {
              fields: ['finding_id', 'framework', 'severity', 'description', 'status', 'due_date'],
              conditions: [
                { field: 'type', operator: 'equals', value: 'compliance_finding' }
              ],
              orderBy: [{ field: 'severity', direction: 'desc' }]
            },
            filters: []
          },
          visible: true
        },
        {
          widgetId: 'evidence_collection',
          type: WidgetType.COMPLIANCE_STATUS,
          title: 'Evidence Collection Status',
          position: { x: 8, y: 4 },
          size: { width: 4, height: 6 },
          config: {
            chartType: 'gauge'
          },
          dataSource: {
            source: 'compliance_data',
            query: {
              fields: ['evidence_collection_percentage'],
              conditions: []
            },
            filters: []
          },
          visible: true
        }
      ],

      filters: [
        {
          filterId: 'framework_filter',
          name: 'Compliance Framework',
          type: 'global',
          config: {
            id: 'framework_filter',
            name: 'Framework',
            field: 'framework',
            type: 'multiselect',
            values: [
              { label: 'SOC2 Type II', value: 'SOC2' },
              { label: 'GDPR', value: 'GDPR' },
              { label: 'HIPAA', value: 'HIPAA' },
              { label: 'PCI DSS', value: 'PCI_DSS' }
            ]
          }
        }
      ],

      permissions: {
        view: ['compliance_officer', 'auditor', 'manager', 'admin'],
        edit: ['compliance_officer', 'manager', 'admin'],
        share: ['manager', 'admin']
      }
    };
  }

  /**
   * Create Threat Hunting Dashboard
   */
  private createThreatHuntingDashboard(): DashboardLayout {
    return {
      layoutId: 'threat_hunting',
      name: 'Threat Hunting',
      description: 'Advanced threat detection and hunting dashboard',
      createdBy: 'system',
      createdAt: new Date(),
      lastModified: new Date(),
      isDefault: false,
      refreshInterval: 60000, // 1 minute

      widgets: [
        {
          widgetId: 'behavioral_anomalies',
          type: WidgetType.BEHAVIORAL_ANALYTICS,
          title: 'Behavioral Anomalies',
          position: { x: 0, y: 0 },
          size: { width: 8, height: 5 },
          config: {
            chartType: 'scatter',
            timeRange: { type: 'relative', relative: { amount: 24, unit: 'hours' } }
          },
          dataSource: {
            source: 'behavioral_data',
            query: {
              fields: ['user_id', 'anomaly_score', 'risk_score', 'timestamp'],
              conditions: [
                { field: 'anomaly_score', operator: 'greater_than', value: 0.5 }
              ]
            },
            filters: []
          },
          visible: true
        },
        {
          widgetId: 'network_traffic_analysis',
          type: WidgetType.NETWORK_MONITORING,
          title: 'Network Traffic Analysis',
          position: { x: 8, y: 0 },
          size: { width: 4, height: 5 },
          config: {
            chartType: 'heatmap'
          },
          dataSource: {
            source: 'security_events',
            query: {
              fields: ['source_ip', 'destination_ip', 'traffic_volume'],
              conditions: [
                { field: 'event_type', operator: 'equals', value: 'network_traffic' }
              ]
            },
            filters: []
          },
          visible: true
        },
        {
          widgetId: 'geographic_threats',
          type: WidgetType.GEOGRAPHIC_VIEW,
          title: 'Geographic Threat Distribution',
          position: { x: 0, y: 5 },
          size: { width: 12, height: 5 },
          config: {
            chartType: 'heatmap'
          },
          dataSource: {
            source: 'security_events',
            query: {
              fields: ['latitude', 'longitude', 'threat_count'],
              conditions: []
            },
            filters: []
          },
          visible: true
        }
      ],

      filters: [],

      permissions: {
        view: ['threat_hunter', 'senior_analyst', 'manager', 'admin'],
        edit: ['threat_hunter', 'senior_analyst', 'manager', 'admin'],
        share: ['manager', 'admin']
      }
    };
  }

  /**
   * Get dashboard snapshot with real-time data
   */
  public async getDashboardSnapshot(
    layoutId: string,
    userId: string,
    filters?: Record<string, unknown>
  ): Promise<DashboardSnapshot> {
    const startTime = Date.now();

    try {
      const layout = this.dashboardLayouts.get(layoutId);
      if (!layout) {
        throw new Error(`Dashboard layout not found: ${layoutId}`);
      }

      // Check permissions
      if (!this.hasPermission(userId, layout, 'view')) {
        throw new Error(`Insufficient permissions to view dashboard: ${layoutId}`);
      }

      const snapshotId = this.generateSnapshotId();
      const widgetSnapshots: WidgetSnapshot[] = [];
      let errorCount = 0;
      let warningCount = 0;

      // Process each widget
      for (const widget of layout.widgets) {
        if (!widget.visible) continue;

        try {
          const widgetData = await this.getWidgetData(widget, filters);
          const snapshot: WidgetSnapshot = {
            widgetId: widget.widgetId,
            type: widget.type,
            data: widgetData,
            status: 'success',
            lastUpdated: new Date(),
            metadata: {
              queryTime: 0, // Would be measured in real implementation
              dataPoints: this.countDataPoints(widgetData),
              cacheHit: this.widgetCache.has(widget.widgetId)
            }
          };

          widgetSnapshots.push(snapshot);
          this.totalWidgetRenders++;

        } catch (error) {
          this.logger.error(`Widget data retrieval failed: ${widget.widgetId}`, error);

          const errorSnapshot: WidgetSnapshot = {
            widgetId: widget.widgetId,
            type: widget.type,
            data: { status: 'error', details: [{ label: 'Error', value: error.message }] },
            status: 'error',
            lastUpdated: new Date(),
            metadata: {
              queryTime: 0,
              dataPoints: 0,
              cacheHit: false
            }
          };

          widgetSnapshots.push(errorSnapshot);
          errorCount++;
        }
      }

      const processingTime = Date.now() - startTime;
      this.averageResponseTime = (this.averageResponseTime + processingTime) / 2;

      const snapshot: DashboardSnapshot = {
        snapshotId,
        layoutId,
        timestamp: new Date(),
        widgets: widgetSnapshots,
        metadata: {
          refreshDuration: processingTime,
          dataLatency: 0, // Would be calculated based on data timestamps
          errorCount,
          warningCount
        }
      };

      this.activeSnapshots.set(snapshotId, snapshot);
      this.totalDashboardViews++;

      this.logger.debug(`Dashboard snapshot generated: ${snapshotId} - Widgets: ${widgetSnapshots.length}, Time: ${processingTime}ms`);

      // Emit dashboard viewed event
      this.eventEmitter.emit('dashboard.snapshot.generated', {
        snapshotId,
        layoutId,
        userId,
        widgetCount: widgetSnapshots.length,
        processingTime
      });

      return snapshot;

    } catch (error) {
      this.logger.error(`Dashboard snapshot generation failed: ${layoutId}`, error);
      throw new Error(`Dashboard snapshot generation failed: ${error.message}`);
    }
  }

  /**
   * Get widget data based on configuration
   */
  private async getWidgetData(
    widget: WidgetConfiguration,
    globalFilters?: Record<string, unknown>
  ): Promise<WidgetData> {
    // Check cache first
    const cacheKey = this.generateCacheKey(widget, globalFilters);
    const cached = this.widgetCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp.getTime() < this.cacheExpiration) {
      return cached.data;
    }

    // Generate mock data based on widget type and configuration
    const widgetData = await this.generateWidgetData(widget, globalFilters);

    // Cache the result
    this.widgetCache.set(cacheKey, {
      data: widgetData,
      timestamp: new Date()
    });

    return widgetData;
  }

  /**
   * Generate widget data (mock implementation)
   */
  private async generateWidgetData(
    widget: WidgetConfiguration,
    globalFilters?: Record<string, unknown>
  ): Promise<WidgetData> {
    const now = new Date();

    switch (widget.type) {
      case WidgetType.THREAT_OVERVIEW:
        return this.generateThreatOverviewData(widget, now);

      case WidgetType.SECURITY_METRICS:
        return this.generateSecurityMetricsData(widget, now);

      case WidgetType.INCIDENT_TRACKER:
        return this.generateIncidentTrackerData(widget, now);

      case WidgetType.COMPLIANCE_STATUS:
        return this.generateComplianceStatusData(widget, now);

      case WidgetType.REAL_TIME_ALERTS:
        return this.generateRealTimeAlertsData(widget, now);

      case WidgetType.BEHAVIORAL_ANALYTICS:
        return this.generateBehavioralAnalyticsData(widget, now);

      case WidgetType.NETWORK_MONITORING:
        return this.generateNetworkMonitoringData(widget, now);

      case WidgetType.ACCESS_LOGS:
        return this.generateAccessLogsData(widget, now);

      case WidgetType.VULNERABILITY_STATUS:
        return this.generateVulnerabilityStatusData(widget, now);

      case WidgetType.AUDIT_TRAIL:
        return this.generateAuditTrailData(widget, now);

      case WidgetType.GEOGRAPHIC_VIEW:
        return this.generateGeographicViewData(widget, now);

      case WidgetType.TREND_ANALYSIS:
        return this.generateTrendAnalysisData(widget, now);

      default:
        throw new Error(`Unsupported widget type: ${widget.type}`);
    }
  }

  /**
   * Generate threat overview data
   */
  private generateThreatOverviewData(widget: WidgetConfiguration, now: Date): WidgetData {
    if (widget.config.chartType === 'gauge') {
      const threatLevel = Math.floor(Math.random() * 100);
      return {
        value: threatLevel,
        status: threatLevel > 80 ? 'critical' : threatLevel > 60 ? 'warning' : 'healthy',
        details: [
          { label: 'Current Level', value: `${threatLevel}/100` },
          { label: 'Last Updated', value: now.toLocaleTimeString() },
          { label: 'Trend', value: 'Stable' }
        ]
      };
    }

    if (widget.config.chartType === 'bar') {
      return {
        series: [
          {
            name: 'Threat Count',
            data: [
              { label: 'Malware', value: Math.floor(Math.random() * 50) },
              { label: 'Phishing', value: Math.floor(Math.random() * 30) },
              { label: 'DDoS', value: Math.floor(Math.random() * 20) },
              { label: 'Insider Threat', value: Math.floor(Math.random() * 15) },
              { label: 'Data Breach', value: Math.floor(Math.random() * 10) }
            ]
          }
        ]
      };
    }

    return { status: 'healthy' };
  }

  /**
   * Generate security metrics data
   */
  private generateSecurityMetricsData(widget: WidgetConfiguration, now: Date): WidgetData {
    const hours = 24;
    const dataPoints: DataPoint[] = [];

    for (let i = hours; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 3600000);
      dataPoints.push({
        timestamp,
        value: Math.floor(Math.random() * 100) + 50
      });
    }

    return {
      series: [
        {
          name: 'Security Events',
          data: dataPoints,
          type: 'line'
        }
      ]
    };
  }

  /**
   * Generate incident tracker data
   */
  private generateIncidentTrackerData(widget: WidgetConfiguration, now: Date): WidgetData {
    const incidents = [
      {
        id: 'INC-001',
        cells: [
          { value: 'INC-001', type: 'text' },
          { value: 'Suspicious Login Activity', type: 'text' },
          { value: 'High', type: 'status', formatting: { color: '#fd7e14' } },
          { value: 'Investigating', type: 'status' },
          { value: 'John Doe', type: 'text' },
          { value: new Date(now.getTime() - 3600000), type: 'date' }
        ] as TableCell[]
      },
      {
        id: 'INC-002',
        cells: [
          { value: 'INC-002', type: 'text' },
          { value: 'Malware Detection', type: 'text' },
          { value: 'Critical', type: 'status', formatting: { color: '#dc3545' } },
          { value: 'Open', type: 'status' },
          { value: 'Jane Smith', type: 'text' },
          { value: new Date(now.getTime() - 7200000), type: 'date' }
        ] as TableCell[]
      }
    ];

    return {
      rows: incidents,
      columns: [
        { id: 'incident_id', name: 'Incident ID', type: 'text', sortable: true },
        { id: 'title', name: 'Title', type: 'text', sortable: true },
        { id: 'severity', name: 'Severity', type: 'status', sortable: true },
        { id: 'status', name: 'Status', type: 'status', sortable: true },
        { id: 'assigned_to', name: 'Assigned To', type: 'text', sortable: true },
        { id: 'created_at', name: 'Created', type: 'date', sortable: true }
      ]
    };
  }

  /**
   * Generate compliance status data
   */
  private generateComplianceStatusData(widget: WidgetConfiguration, now: Date): WidgetData {
    if (widget.config.chartType === 'pie') {
      return {
        series: [
          {
            name: 'Compliance Status',
            data: [
              { label: 'SOC2', value: 95 },
              { label: 'GDPR', value: 88 },
              { label: 'HIPAA', value: 92 },
              { label: 'PCI DSS', value: 87 }
            ]
          }
        ]
      };
    }

    if (widget.config.chartType === 'gauge') {
      return {
        value: 91,
        status: 'healthy',
        details: [
          { label: 'Overall Compliance', value: '91%' },
          { label: 'SOC2', value: '95%', status: 'normal' },
          { label: 'GDPR', value: '88%', status: 'warning' },
          { label: 'HIPAA', value: '92%', status: 'normal' },
          { label: 'PCI DSS', value: '87%', status: 'warning' }
        ]
      };
    }

    return {
      series: [
        {
          name: 'Compliance Scores',
          data: [
            { label: 'SOC2', value: 95 },
            { label: 'GDPR', value: 88 },
            { label: 'HIPAA', value: 92 },
            { label: 'PCI DSS', value: 87 }
          ]
        }
      ]
    };
  }

  /**
   * Generate real-time alerts data
   */
  private generateRealTimeAlertsData(widget: WidgetConfiguration, now: Date): WidgetData {
    const hours = 24;
    const severities = ['low', 'medium', 'high', 'critical'];
    const series: DataSeries[] = [];

    severities.forEach(severity => {
      const dataPoints: DataPoint[] = [];

      for (let i = hours; i >= 0; i--) {
        const timestamp = new Date(now.getTime() - i * 3600000);
        dataPoints.push({
          timestamp,
          value: Math.floor(Math.random() * 20)
        });
      }

      series.push({
        name: severity.charAt(0).toUpperCase() + severity.slice(1),
        data: dataPoints,
        type: 'line'
      });
    });

    return { series };
  }

  // Additional data generators for other widget types...
  private generateBehavioralAnalyticsData(widget: WidgetConfiguration, now: Date): WidgetData {
    const dataPoints: DataPoint[] = [];

    for (let i = 0; i < 50; i++) {
      dataPoints.push({
        value: Math.random(),
        metadata: {
          userId: `user_${i}`,
          anomalyScore: Math.random(),
          riskScore: Math.random()
        }
      });
    }

    return {
      series: [
        {
          name: 'Anomaly vs Risk',
          data: dataPoints,
          type: 'line'
        }
      ]
    };
  }

  private generateNetworkMonitoringData(widget: WidgetConfiguration, now: Date): WidgetData {
    return {
      value: Math.floor(Math.random() * 1000),
      trend: Math.random() > 0.5 ? 'up' : 'down',
      trendPercentage: Math.floor(Math.random() * 20),
      details: [
        { label: 'Active Connections', value: Math.floor(Math.random() * 5000) },
        { label: 'Bandwidth Usage', value: `${Math.floor(Math.random() * 100)}%` },
        { label: 'Suspicious IPs', value: Math.floor(Math.random() * 10) }
      ]
    };
  }

  private generateAccessLogsData(widget: WidgetConfiguration, now: Date): WidgetData {
    const logs = Array.from({ length: 10 }, (_, i) => ({
      id: `log_${i}`,
      cells: [
        { value: `user_${i}`, type: 'text' },
        { value: new Date(now.getTime() - i * 600000), type: 'date' },
        { value: `192.168.1.${Math.floor(Math.random() * 255)}`, type: 'text' },
        { value: Math.random() > 0.8 ? 'Failed' : 'Success', type: 'status' },
        { value: 'Web Application', type: 'text' }
      ] as TableCell[]
    }));

    return {
      rows: logs,
      columns: [
        { id: 'user', name: 'User', type: 'text' },
        { id: 'timestamp', name: 'Time', type: 'date' },
        { id: 'ip', name: 'IP Address', type: 'text' },
        { id: 'status', name: 'Status', type: 'status' },
        { id: 'resource', name: 'Resource', type: 'text' }
      ]
    };
  }

  private generateVulnerabilityStatusData(widget: WidgetConfiguration, now: Date): WidgetData {
    return {
      series: [
        {
          name: 'Vulnerabilities by Severity',
          data: [
            { label: 'Critical', value: Math.floor(Math.random() * 5) },
            { label: 'High', value: Math.floor(Math.random() * 15) },
            { label: 'Medium', value: Math.floor(Math.random() * 30) },
            { label: 'Low', value: Math.floor(Math.random() * 50) }
          ]
        }
      ]
    };
  }

  private generateAuditTrailData(widget: WidgetConfiguration, now: Date): WidgetData {
    const trails = Array.from({ length: 10 }, (_, i) => ({
      id: `audit_${i}`,
      cells: [
        { value: `audit_${i}`, type: 'text' },
        { value: 'SOC2', type: 'text' },
        { value: Math.random() > 0.7 ? 'High' : 'Medium', type: 'status' },
        { value: 'Access control review needed', type: 'text' },
        { value: Math.random() > 0.5 ? 'Open' : 'Remediated', type: 'status' },
        { value: new Date(now.getTime() + i * 86400000), type: 'date' }
      ] as TableCell[]
    }));

    return {
      rows: trails,
      columns: [
        { id: 'finding_id', name: 'Finding ID', type: 'text' },
        { id: 'framework', name: 'Framework', type: 'text' },
        { id: 'severity', name: 'Severity', type: 'status' },
        { id: 'description', name: 'Description', type: 'text' },
        { id: 'status', name: 'Status', type: 'status' },
        { id: 'due_date', name: 'Due Date', type: 'date' }
      ]
    };
  }

  private generateGeographicViewData(widget: WidgetConfiguration, now: Date): WidgetData {
    const locations: GeoDataPoint[] = [
      { latitude: 40.7128, longitude: -74.0060, value: Math.floor(Math.random() * 100), label: 'New York' },
      { latitude: 51.5074, longitude: -0.1278, value: Math.floor(Math.random() * 100), label: 'London' },
      { latitude: 35.6762, longitude: 139.6503, value: Math.floor(Math.random() * 100), label: 'Tokyo' },
      { latitude: -33.8688, longitude: 151.2093, value: Math.floor(Math.random() * 100), label: 'Sydney' },
      { latitude: 55.7558, longitude: 37.6176, value: Math.floor(Math.random() * 100), label: 'Moscow' }
    ];

    return { locations };
  }

  private generateTrendAnalysisData(widget: WidgetConfiguration, now: Date): WidgetData {
    const days = 30;
    const dataPoints: DataPoint[] = [];

    for (let i = days; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 86400000);
      dataPoints.push({
        timestamp,
        value: Math.floor(Math.random() * 100) + Math.sin(i / 5) * 20
      });
    }

    return {
      series: [
        {
          name: 'Security Trend',
          data: dataPoints,
          type: 'line'
        }
      ]
    };
  }

  // Utility Methods

  private hasPermission(userId: string, layout: DashboardLayout, permission: 'view' | 'edit' | 'share'): boolean {
    // Simplified permission check - would integrate with actual RBAC system
    const userRole = 'analyst'; // Would be looked up from user context
    return layout.permissions[permission].includes(userRole);
  }

  private countDataPoints(data: WidgetData): number {
    if (data.series) {
      return data.series.reduce((sum, series) => sum + series.data.length, 0);
    }
    if (data.rows) {
      return data.rows.length;
    }
    if (data.locations) {
      return data.locations.length;
    }
    return 1;
  }

  private generateSnapshotId(): string {
    return `SNAP_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`.toUpperCase();
  }

  private generateCacheKey(widget: WidgetConfiguration, filters?: Record<string, unknown>): string {
    const filterHash = filters ? JSON.stringify(filters) : '';
    return `${widget.widgetId}_${JSON.stringify(widget.config)}_${filterHash}`;
  }

  private startRealTimeEventProcessing(): void {
    // Process real-time events and update relevant widgets
    setInterval(() => {
      this.processRealTimeEvents();
    }, 5000); // Every 5 seconds
  }

  private processRealTimeEvents(): void {
    // Simulate real-time event processing
    const event: RealTimeEvent = {
      eventId: `EVT_${Date.now()}`,
      type: 'security_alert',
      severity: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)] as any,
      timestamp: new Date(),
      source: 'threat_detection',
      data: { message: 'Simulated security event' },
      affectedWidgets: ['threat_level_gauge', 'security_events_timeline']
    };

    // Emit event for real-time dashboard updates
    this.eventEmitter.emit('dashboard.realtime.event', event);
  }

  /**
   * Get dashboard statistics
   */
  public getDashboardStatistics(): {
    totalLayouts: number;
    totalViews: number;
    totalWidgetRenders: number;
    averageResponseTime: number;
    activeConnections: number;
    cacheHitRate: number;
  } {
    const cacheHitRate = this.totalWidgetRenders > 0
      ? (this.widgetCache.size / this.totalWidgetRenders) * 100
      : 0;

    return {
      totalLayouts: this.dashboardLayouts.size,
      totalViews: this.totalDashboardViews,
      totalWidgetRenders: this.totalWidgetRenders,
      averageResponseTime: this.averageResponseTime,
      activeConnections: this.activeConnections.size,
      cacheHitRate
    };
  }
}

// WebSocket connection interface for real-time updates
interface WebSocketConnection {
  connectionId: string;
  userId: string;
  dashboardId: string;
  connected: boolean;
  lastActivity: Date;
}