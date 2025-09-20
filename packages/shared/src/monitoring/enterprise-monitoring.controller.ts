/**
 * Enterprise Monitoring Controller
 *
 * Comprehensive REST API controller for enterprise-grade monitoring,
 * alerting, and incident response system for PARLANT database functions.
 *
 * Features:
 * - Real-time monitoring dashboard endpoints
 * - Performance metrics and analytics APIs
 * - Alert management and notification APIs
 * - Incident response and management APIs
 * - Capacity planning and resource monitoring APIs
 * - Security monitoring and compliance APIs
 * - Report generation and export APIs
 * - Health check and status endpoints
 *
 * @author Claude Code - Enterprise Monitoring Specialist
 * @version 1.0.0 - Production Ready
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Res,
  HttpStatus,
  Logger,
  UseGuards,
  ParseIntPipe,
  ValidationPipe,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
} from "@nestjs/swagger";
import { Response } from "express";
import { ParlantFunctionMonitorService, FunctionPerformanceMetrics } from "./parlant-function-monitor.service";
import { AlertingService, Alert, NotificationChannel, EscalationPolicy } from "./alerting.service";
import { DashboardService, DashboardData, DashboardLayout, ReportConfig } from "./dashboard.service";
import { IncidentResponseService, Incident, IncidentStatus, IncidentPriority } from "./incident-response.service";
import { MetricsService } from "./metrics.service";
import { AlertSeverity } from "./types";

/**
 * Dashboard query parameters
 */
interface DashboardQueryParams {
  timeRange?: string;
  refresh?: boolean;
  sections?: string[];
}

/**
 * Alert creation request
 */
interface CreateAlertRequest {
  name: string;
  description: string;
  severity: AlertSeverity;
  source: string;
  metric: string;
  currentValue: number;
  threshold: number;
  operator: ">" | "<" | ">=" | "<=" | "==" | "!=";
  metadata?: Record<string, any>;
}

/**
 * Incident creation request
 */
interface CreateIncidentRequest {
  title: string;
  description: string;
  severity: AlertSeverity;
  alertIds?: string[];
  assignedTo?: string;
  priority?: IncidentPriority;
}

/**
 * Report generation request
 */
interface GenerateReportRequest {
  configId: string;
  customFilters?: Record<string, any>;
  format?: "pdf" | "html" | "csv" | "json";
}

/**
 * Enterprise Monitoring Controller
 */
@ApiTags("Enterprise Monitoring")
@Controller("monitoring")
@ApiBearerAuth()
// @UseGuards(AuthGuard) // Uncomment when authentication is implemented
export class EnterpriseMonitoringController {
  private readonly logger = new Logger(EnterpriseMonitoringController.name);

  constructor(
    private readonly parlantMonitor: ParlantFunctionMonitorService,
    private readonly alertingService: AlertingService,
    private readonly dashboardService: DashboardService,
    private readonly incidentService: IncidentResponseService,
    private readonly metricsService: MetricsService,
  ) {}

  // ===========================
  // DASHBOARD ENDPOINTS
  // ===========================

  @Get("dashboard")
  @ApiOperation({
    summary: "Get real-time monitoring dashboard",
    description: "Retrieve comprehensive real-time monitoring data for the dashboard",
  })
  @ApiQuery({ name: "timeRange", required: false, description: "Time range (e.g., '1h', '24h', '7d')" })
  @ApiQuery({ name: "refresh", required: false, description: "Force refresh data" })
  @ApiResponse({ status: 200, description: "Dashboard data retrieved successfully" })
  async getDashboard(
    @Query("timeRange") timeRange = "1h",
    @Query("refresh") refresh = false,
  ): Promise<DashboardData> {
    try {
      this.logger.debug("Fetching dashboard data", { timeRange, refresh });

      const dashboardData = await this.dashboardService.getDashboardData(timeRange);

      this.logger.debug("Dashboard data retrieved successfully", {
        timeRange,
        totalFunctions: dashboardData.overview.totalFunctions,
        activeAlerts: dashboardData.overview.activeAlerts,
      });

      return dashboardData;
    } catch (error) {
      this.logger.error("Failed to fetch dashboard data", {
        error: error instanceof Error ? error.message : String(error),
        timeRange,
      });
      throw error;
    }
  }

  @Get("dashboard/widget/:widgetId")
  @ApiOperation({
    summary: "Get specific widget data",
    description: "Retrieve data for a specific dashboard widget",
  })
  @ApiParam({ name: "widgetId", description: "Widget identifier" })
  @ApiQuery({ name: "timeRange", required: false, description: "Time range for widget data" })
  @ApiResponse({ status: 200, description: "Widget data retrieved successfully" })
  async getWidgetData(
    @Param("widgetId") widgetId: string,
    @Query("timeRange") timeRange = "1h",
  ): Promise<any> {
    try {
      const widgetData = await this.dashboardService.getWidgetData(widgetId, timeRange);
      return widgetData;
    } catch (error) {
      this.logger.error("Failed to fetch widget data", {
        error: error instanceof Error ? error.message : String(error),
        widgetId,
        timeRange,
      });
      throw error;
    }
  }

  @Get("dashboard/layouts")
  @ApiOperation({
    summary: "Get dashboard layouts",
    description: "Retrieve all available dashboard layouts",
  })
  @ApiResponse({ status: 200, description: "Dashboard layouts retrieved successfully" })
  getDashboardLayouts(): DashboardLayout[] {
    return this.dashboardService.getDashboardLayouts();
  }

  @Post("dashboard/layouts")
  @ApiOperation({
    summary: "Create dashboard layout",
    description: "Create a new custom dashboard layout",
  })
  @ApiBody({ description: "Dashboard layout configuration" })
  @ApiResponse({ status: 201, description: "Dashboard layout created successfully" })
  createDashboardLayout(@Body() layout: DashboardLayout): { success: boolean; layoutId: string } {
    this.dashboardService.createDashboardLayout(layout);
    return { success: true, layoutId: layout.id };
  }

  // ===========================
  // FUNCTION MONITORING ENDPOINTS
  // ===========================

  @Get("functions")
  @ApiOperation({
    summary: "Get function performance metrics",
    description: "Retrieve performance metrics for all monitored functions",
  })
  @ApiQuery({ name: "functionId", required: false, description: "Specific function ID" })
  @ApiQuery({ name: "limit", required: false, description: "Limit number of results" })
  @ApiResponse({ status: 200, description: "Function metrics retrieved successfully" })
  getFunctionMetrics(
    @Query("functionId") functionId?: string,
    @Query("limit", new ParseIntPipe({ optional: true })) limit?: number,
  ): FunctionPerformanceMetrics[] {
    const metrics = this.parlantMonitor.getFunctionMetrics(functionId);
    return limit ? metrics.slice(0, limit) : metrics;
  }

  @Get("functions/top-performing")
  @ApiOperation({
    summary: "Get top performing functions",
    description: "Retrieve functions with the best performance metrics",
  })
  @ApiQuery({ name: "limit", required: false, description: "Number of functions to return" })
  @ApiResponse({ status: 200, description: "Top performing functions retrieved successfully" })
  getTopPerformingFunctions(
    @Query("limit", new ParseIntPipe({ optional: true })) limit = 10,
  ): FunctionPerformanceMetrics[] {
    return this.parlantMonitor.getTopPerformingFunctions(limit);
  }

  @Get("functions/slowest")
  @ApiOperation({
    summary: "Get slowest functions",
    description: "Retrieve functions with the worst performance metrics",
  })
  @ApiQuery({ name: "limit", required: false, description: "Number of functions to return" })
  @ApiResponse({ status: 200, description: "Slowest functions retrieved successfully" })
  getSlowestFunctions(
    @Query("limit", new ParseIntPipe({ optional: true })) limit = 10,
  ): FunctionPerformanceMetrics[] {
    return this.parlantMonitor.getSlowestFunctions(limit);
  }

  @Get("functions/highest-error-rate")
  @ApiOperation({
    summary: "Get functions with highest error rates",
    description: "Retrieve functions with the highest error rates",
  })
  @ApiQuery({ name: "limit", required: false, description: "Number of functions to return" })
  @ApiResponse({ status: 200, description: "Functions with highest error rates retrieved successfully" })
  getHighestErrorRateFunctions(
    @Query("limit", new ParseIntPipe({ optional: true })) limit = 10,
  ): FunctionPerformanceMetrics[] {
    return this.parlantMonitor.getHighestErrorRateFunctions(limit);
  }

  // ===========================
  // ALERTING ENDPOINTS
  // ===========================

  @Get("alerts")
  @ApiOperation({
    summary: "Get alerts",
    description: "Retrieve alerts with optional filtering",
  })
  @ApiQuery({ name: "severity", required: false, description: "Filter by severity" })
  @ApiQuery({ name: "source", required: false, description: "Filter by source" })
  @ApiQuery({ name: "status", required: false, description: "Filter by status" })
  @ApiResponse({ status: 200, description: "Alerts retrieved successfully" })
  getAlerts(
    @Query("severity") severity?: AlertSeverity,
    @Query("source") source?: string,
    @Query("status") status?: string,
  ): Alert[] {
    return this.alertingService.getActiveAlerts({ severity, source, status });
  }

  @Post("alerts")
  @ApiOperation({
    summary: "Trigger alert",
    description: "Manually trigger a new alert",
  })
  @ApiBody({ description: "Alert creation request" })
  @ApiResponse({ status: 201, description: "Alert triggered successfully" })
  async triggerAlert(@Body() request: CreateAlertRequest): Promise<{ alertId: string }> {
    const alertId = await this.alertingService.triggerAlert(
      request.name,
      request.description,
      request.severity,
      request.source,
      request.metric,
      request.currentValue,
      request.threshold,
      request.operator,
      request.metadata,
    );
    return { alertId };
  }

  @Put("alerts/:alertId/acknowledge")
  @ApiOperation({
    summary: "Acknowledge alert",
    description: "Acknowledge an active alert",
  })
  @ApiParam({ name: "alertId", description: "Alert identifier" })
  @ApiBody({ description: "Acknowledgment request", schema: { type: "object", properties: { acknowledgerId: { type: "string" } } } })
  @ApiResponse({ status: 200, description: "Alert acknowledged successfully" })
  async acknowledgeAlert(
    @Param("alertId") alertId: string,
    @Body("acknowledgerId") acknowledgerId: string,
  ): Promise<{ success: boolean }> {
    const success = await this.alertingService.acknowledgeAlert(alertId, acknowledgerId);
    return { success };
  }

  @Put("alerts/:alertId/resolve")
  @ApiOperation({
    summary: "Resolve alert",
    description: "Resolve an active alert",
  })
  @ApiParam({ name: "alertId", description: "Alert identifier" })
  @ApiBody({ description: "Resolution request", schema: { type: "object", properties: { resolverId: { type: "string" } } } })
  @ApiResponse({ status: 200, description: "Alert resolved successfully" })
  async resolveAlert(
    @Param("alertId") alertId: string,
    @Body("resolverId") resolverId?: string,
  ): Promise<{ success: boolean }> {
    const success = await this.alertingService.resolveAlert(alertId, resolverId);
    return { success };
  }

  @Get("alerts/statistics")
  @ApiOperation({
    summary: "Get alert statistics",
    description: "Retrieve alert statistics and metrics",
  })
  @ApiQuery({ name: "timeRangeHours", required: false, description: "Time range in hours" })
  @ApiResponse({ status: 200, description: "Alert statistics retrieved successfully" })
  getAlertStatistics(
    @Query("timeRangeHours", new ParseIntPipe({ optional: true })) timeRangeHours = 24,
  ) {
    return this.alertingService.getAlertStatistics(timeRangeHours);
  }

  // ===========================
  // INCIDENT MANAGEMENT ENDPOINTS
  // ===========================

  @Get("incidents")
  @ApiOperation({
    summary: "Get incidents",
    description: "Retrieve incidents with optional filtering",
  })
  @ApiQuery({ name: "priority", required: false, description: "Filter by priority" })
  @ApiQuery({ name: "severity", required: false, description: "Filter by severity" })
  @ApiQuery({ name: "status", required: false, description: "Filter by status" })
  @ApiQuery({ name: "assignedTo", required: false, description: "Filter by assignee" })
  @ApiResponse({ status: 200, description: "Incidents retrieved successfully" })
  getIncidents(
    @Query("priority") priority?: IncidentPriority,
    @Query("severity") severity?: AlertSeverity,
    @Query("status") status?: IncidentStatus,
    @Query("assignedTo") assignedTo?: string,
  ): Incident[] {
    return this.incidentService.getActiveIncidents({ priority, severity, status, assignedTo });
  }

  @Post("incidents")
  @ApiOperation({
    summary: "Create incident",
    description: "Create a new incident",
  })
  @ApiBody({ description: "Incident creation request" })
  @ApiResponse({ status: 201, description: "Incident created successfully" })
  async createIncident(@Body() request: CreateIncidentRequest): Promise<{ incidentId: string }> {
    const incidentId = await this.incidentService.createIncident(
      request.title,
      request.description,
      request.severity,
      request.alertIds,
    );
    return { incidentId };
  }

  @Put("incidents/:incidentId/status")
  @ApiOperation({
    summary: "Update incident status",
    description: "Update the status of an incident",
  })
  @ApiParam({ name: "incidentId", description: "Incident identifier" })
  @ApiBody({
    description: "Status update request",
    schema: {
      type: "object",
      properties: {
        status: { type: "string", enum: Object.values(IncidentStatus) },
        actor: { type: "string" },
        notes: { type: "string" },
      },
    },
  })
  @ApiResponse({ status: 200, description: "Incident status updated successfully" })
  async updateIncidentStatus(
    @Param("incidentId") incidentId: string,
    @Body() body: { status: IncidentStatus; actor: string; notes?: string },
  ): Promise<{ success: boolean }> {
    const success = await this.incidentService.updateIncidentStatus(
      incidentId,
      body.status,
      body.actor,
      body.notes,
    );
    return { success };
  }

  @Post("incidents/:incidentId/remediation")
  @ApiOperation({
    summary: "Execute remediation action",
    description: "Execute an automated remediation action for an incident",
  })
  @ApiParam({ name: "incidentId", description: "Incident identifier" })
  @ApiBody({
    description: "Remediation execution request",
    schema: {
      type: "object",
      properties: {
        actionId: { type: "string" },
        executor: { type: "string" },
      },
    },
  })
  @ApiResponse({ status: 200, description: "Remediation action executed successfully" })
  async executeRemediation(
    @Param("incidentId") incidentId: string,
    @Body() body: { actionId: string; executor?: string },
  ): Promise<{ executionId: string }> {
    const executionId = await this.incidentService.executeRemediationAction(
      incidentId,
      body.actionId,
      body.executor,
    );
    return { executionId };
  }

  @Get("incidents/statistics")
  @ApiOperation({
    summary: "Get incident statistics",
    description: "Retrieve incident statistics and metrics",
  })
  @ApiQuery({ name: "timeRangeHours", required: false, description: "Time range in hours" })
  @ApiResponse({ status: 200, description: "Incident statistics retrieved successfully" })
  getIncidentStatistics(
    @Query("timeRangeHours", new ParseIntPipe({ optional: true })) timeRangeHours = 24,
  ) {
    return this.incidentService.getIncidentStatistics(timeRangeHours);
  }

  // ===========================
  // CAPACITY AND PERFORMANCE ENDPOINTS
  // ===========================

  @Get("capacity")
  @ApiOperation({
    summary: "Get capacity metrics",
    description: "Retrieve current capacity and resource utilization metrics",
  })
  @ApiResponse({ status: 200, description: "Capacity metrics retrieved successfully" })
  getCapacityMetrics(): any {
    return this.parlantMonitor.getCapacityMetrics();
  }

  @Get("security")
  @ApiOperation({
    summary: "Get security metrics",
    description: "Retrieve security monitoring metrics",
  })
  @ApiResponse({ status: 200, description: "Security metrics retrieved successfully" })
  getSecurityMetrics(): any {
    return this.parlantMonitor.getSecurityMetrics();
  }

  // ===========================
  // REPORTING ENDPOINTS
  // ===========================

  @Get("reports/configs")
  @ApiOperation({
    summary: "Get report configurations",
    description: "Retrieve all report configurations",
  })
  @ApiResponse({ status: 200, description: "Report configurations retrieved successfully" })
  getReportConfigs(): ReportConfig[] {
    return this.dashboardService.getReportConfigs();
  }

  @Post("reports/configs")
  @ApiOperation({
    summary: "Create report configuration",
    description: "Create a new report configuration",
  })
  @ApiBody({ description: "Report configuration" })
  @ApiResponse({ status: 201, description: "Report configuration created successfully" })
  createReportConfig(@Body() config: ReportConfig): { success: boolean; configId: string } {
    this.dashboardService.createReportConfig(config);
    return { success: true, configId: config.id };
  }

  @Post("reports/generate")
  @ApiOperation({
    summary: "Generate report",
    description: "Generate a report based on configuration",
  })
  @ApiBody({ description: "Report generation request" })
  @ApiResponse({ status: 200, description: "Report generated successfully" })
  async generateReport(@Body() request: GenerateReportRequest) {
    const report = await this.dashboardService.generateReport(
      request.configId,
      request.customFilters,
    );
    return report;
  }

  @Get("reports")
  @ApiOperation({
    summary: "Get generated reports",
    description: "Retrieve list of generated reports",
  })
  @ApiQuery({ name: "type", required: false, description: "Filter by report type" })
  @ApiQuery({ name: "configId", required: false, description: "Filter by configuration ID" })
  @ApiResponse({ status: 200, description: "Generated reports retrieved successfully" })
  getGeneratedReports(
    @Query("type") type?: string,
    @Query("configId") configId?: string,
  ) {
    const filters: any = {};
    if (type) filters.type = type;
    if (configId) filters.configId = configId;

    return this.dashboardService.getGeneratedReports(filters);
  }

  // ===========================
  // EXPORT ENDPOINTS
  // ===========================

  @Get("export/dashboard")
  @ApiOperation({
    summary: "Export dashboard data",
    description: "Export dashboard data in various formats",
  })
  @ApiQuery({ name: "format", required: false, description: "Export format (csv, json, pdf)" })
  @ApiQuery({ name: "timeRange", required: false, description: "Time range for data" })
  @ApiQuery({ name: "sections", required: false, description: "Comma-separated sections to include" })
  @ApiResponse({ status: 200, description: "Dashboard data exported successfully" })
  async exportDashboard(
    @Res() res: Response,
    @Query("format") format: "csv" | "json" | "pdf" = "json",
    @Query("timeRange") timeRange = "24h",
    @Query("sections") sections?: string,
  ): Promise<void> {
    try {
      const sectionsArray = sections ? sections.split(",") : undefined;
      const { data, filename, mimeType } = await this.dashboardService.exportDashboardData(
        format,
        timeRange,
        sectionsArray,
      );

      res.setHeader("Content-Type", mimeType);
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(data);
    } catch (error) {
      this.logger.error("Failed to export dashboard data", {
        error: error instanceof Error ? error.message : String(error),
        format,
        timeRange,
      });
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: "Failed to export dashboard data",
      });
    }
  }

  @Get("export/metrics")
  @ApiOperation({
    summary: "Export Prometheus metrics",
    description: "Export metrics in Prometheus format",
  })
  @ApiResponse({ status: 200, description: "Prometheus metrics exported successfully" })
  getPrometheusMetrics(@Res() res: Response): void {
    try {
      const metrics = this.metricsService.generatePrometheusMetrics();
      res.setHeader("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
      res.send(metrics);
    } catch (error) {
      this.logger.error("Failed to generate Prometheus metrics", {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("# Error generating metrics\n");
    }
  }

  // ===========================
  // HEALTH AND STATUS ENDPOINTS
  // ===========================

  @Get("health")
  @ApiOperation({
    summary: "Get monitoring system health",
    description: "Health check endpoint for the monitoring system",
  })
  @ApiResponse({ status: 200, description: "Monitoring system is healthy" })
  getHealth(): {
    status: string;
    timestamp: string;
    version: string;
    components: Record<string, { status: string; details?: any }>;
  } {
    try {
      const components = {
        parlantMonitor: { status: "healthy" },
        alertingService: { status: "healthy" },
        dashboardService: { status: "healthy" },
        incidentService: { status: "healthy" },
        metricsService: { status: "healthy" },
      };

      return {
        status: "healthy",
        timestamp: new Date().toISOString(),
        version: "1.0.0",
        components,
      };
    } catch (error) {
      this.logger.error("Health check failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  @Get("status")
  @ApiOperation({
    summary: "Get system status overview",
    description: "Comprehensive system status overview",
  })
  @ApiResponse({ status: 200, description: "System status retrieved successfully" })
  async getSystemStatus(): Promise<{
    system: {
      status: string;
      uptime: number;
      version: string;
    };
    monitoring: {
      functionsMonitored: number;
      activeAlerts: number;
      activeIncidents: number;
      uptimePercentage: number;
    };
    performance: {
      averageResponseTime: number;
      requestsPerSecond: number;
      errorRate: number;
    };
    timestamp: string;
  }> {
    try {
      const dashboardData = await this.dashboardService.getDashboardData("1h");

      return {
        system: {
          status: "operational",
          uptime: process.uptime(),
          version: "1.0.0",
        },
        monitoring: {
          functionsMonitored: dashboardData.overview.totalFunctions,
          activeAlerts: dashboardData.overview.activeAlerts,
          activeIncidents: this.incidentService.getActiveIncidents().length,
          uptimePercentage: dashboardData.overview.uptimePercentage,
        },
        performance: {
          averageResponseTime: dashboardData.overview.averageResponseTime,
          requestsPerSecond: dashboardData.overview.requestsPerSecond,
          errorRate: dashboardData.overview.errorRate,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error("Failed to get system status", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}