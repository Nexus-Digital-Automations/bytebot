#!/usr/bin/env typescript
/**
 * Comprehensive Security Compliance Dashboard Service
 * ==================================================
 *
 * Enterprise-grade security reporting and dashboard system with:
 * - Real-time compliance monitoring and visualization
 * - Interactive security metrics and KPI tracking
 * - Framework status monitoring and assessment
 * - Historical trend analysis and compliance posture tracking
 * - Integration with orchestrator security framework
 *
 * This service provides the frontend interface for the compliance reporting engine,
 * offering real-time dashboard capabilities for security teams and executives.
 *
 * Author: Compliance Reporting & Dashboard Agent
 * Version: 1.0.0 - Enterprise Security Dashboard
 */

import { Injectable, Logger } from "@nestjs/common";
import { Observable, BehaviorSubject, interval, combineLatest } from "rxjs";
import { map, switchMap, catchError, shareReplay } from "rxjs/operators";

export interface ComplianceFrameworkStatus {
  framework: string;
  version: string;
  complianceScore: number;
  status: "compliant" | "non-compliant" | "partially-compliant" | "pending";
  lastAssessment: Date;
  nextAssessment: Date;
  criticalFindings: number;
  highRiskFindings: number;
  mediumRiskFindings: number;
  lowRiskFindings: number;
  trendsData: ComplianceTrendData[];
}

export interface ComplianceTrendData {
  date: Date;
  score: number;
  findings: number;
  riskLevel: string;
}

export interface SecurityMetrics {
  totalVulnerabilities: number;
  criticalVulnerabilities: number;
  highVulnerabilities: number;
  mediumVulnerabilities: number;
  lowVulnerabilities: number;
  resolvedThisMonth: number;
  averageResolutionTime: number;
  complianceScore: number;
  securityPostureScore: number;
  incidentCount: number;
  auditEvents: number;
  threatsDetected: number;
  threatsBlocked: number;
}

export interface ComplianceGapSummary {
  totalGaps: number;
  criticalGaps: number;
  highPriorityGaps: number;
  mediumPriorityGaps: number;
  lowPriorityGaps: number;
  topGaps: ComplianceGapDetail[];
  gapsByCategory: Record<string, number>;
  estimatedRemediationTime: string;
}

export interface ComplianceGapDetail {
  id: string;
  title: string;
  description: string;
  riskLevel: "critical" | "high" | "medium" | "low";
  framework: string;
  category: string;
  estimatedEffort: string;
  timelineRecommendation: string;
  businessImpact: string;
  remediationSteps: string[];
}

export interface SecurityEventSummary {
  totalEvents: number;
  criticalEvents: number;
  highPriorityEvents: number;
  correlationsFound: number;
  incidentsInProgress: number;
  averageResponseTime: number;
  recentEvents: SecurityEventDetail[];
  eventsByType: Record<string, number>;
  trendsData: SecurityEventTrendData[];
}

export interface SecurityEventDetail {
  id: string;
  type: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  timestamp: Date;
  source: string;
  description: string;
  status: "open" | "investigating" | "resolved" | "false-positive";
  impactedSystems: string[];
  complianceImpact: string[];
}

export interface SecurityEventTrendData {
  date: Date;
  totalEvents: number;
  criticalEvents: number;
  resolvedEvents: number;
}

export interface ExecutiveDashboard {
  overallRiskLevel: "low" | "medium" | "high" | "critical";
  riskIndicatorColor: "green" | "yellow" | "orange" | "red";
  compliancePercentage: number;
  frameworksCompliant: number;
  frameworksTotal: number;
  criticalIssuesRequiringAttention: number;
  securityPostureTrend: "improving" | "stable" | "declining";
  monthlyComplianceScore: number;
  quarterlyOutlook: string;
  keyRecommendations: string[];
  businessImpactLevel: "minimal" | "moderate" | "significant" | "severe";
}

export interface DashboardConfiguration {
  refreshInterval: number;
  enableRealTimeUpdates: boolean;
  frameworksToMonitor: string[];
  alertThresholds: {
    criticalFindingsThreshold: number;
    complianceScoreThreshold: number;
    securityEventThreshold: number;
  };
  customWidgets: DashboardWidget[];
}

export interface DashboardWidget {
  id: string;
  type: "chart" | "metric" | "list" | "heatmap" | "trend";
  title: string;
  configuration: Record<string, unknown>;
  position: { x: number; y: number; width: number; height: number };
  refreshInterval?: number;
}

@Injectable()
export class ComplianceDashboardService {
  private readonly logger = new Logger(ComplianceDashboardService.name);

  // Observable state streams
  private readonly frameworkStatusSubject = new BehaviorSubject<
    ComplianceFrameworkStatus[]
  >([]);
  private readonly securityMetricsSubject =
    new BehaviorSubject<SecurityMetrics | null>(null);
  private readonly complianceGapsSubject =
    new BehaviorSubject<ComplianceGapSummary | null>(null);
  private readonly securityEventsSubject =
    new BehaviorSubject<SecurityEventSummary | null>(null);
  private readonly executiveDashboardSubject =
    new BehaviorSubject<ExecutiveDashboard | null>(null);
  private readonly dashboardConfigSubject =
    new BehaviorSubject<DashboardConfiguration>(this.getDefaultConfiguration());

  // Public observables
  public readonly frameworkStatus$ = this.frameworkStatusSubject.asObservable();
  public readonly securityMetrics$ = this.securityMetricsSubject.asObservable();
  public readonly complianceGaps$ = this.complianceGapsSubject.asObservable();
  public readonly securityEvents$ = this.securityEventsSubject.asObservable();
  public readonly executiveDashboard$ =
    this.executiveDashboardSubject.asObservable();
  public readonly dashboardConfig$ = this.dashboardConfigSubject.asObservable();

  // Combined dashboard data stream
  public readonly dashboardData$ = combineLatest([
    this.frameworkStatus$,
    this.securityMetrics$,
    this.complianceGaps$,
    this.securityEvents$,
    this.executiveDashboard$,
  ]).pipe(
    map(([frameworks, metrics, gaps, events, executive]) => ({
      frameworks,
      metrics,
      gaps,
      events,
      executive,
      lastUpdated: new Date(),
      isHealthy: this.assessDashboardHealth(frameworks, metrics, gaps, events),
    })),
    shareReplay(1),
  );

  constructor() {
    this.initializeDashboard();
    this.startRealTimeUpdates();
  }

  /**
   * Initialize the dashboard with default data and configuration
   */
  private initializeDashboard(): void {
    this.logger.log("Initializing Compliance Dashboard Service");

    // Initialize with sample data for demonstration
    this.loadInitialData();

    // Set up periodic data refresh
    this.setupPeriodicRefresh();
  }

  /**
   * Start real-time updates for dashboard data
   */
  private startRealTimeUpdates(): void {
    const config = this.dashboardConfigSubject.value;

    if (config.enableRealTimeUpdates) {
      interval(config.refreshInterval)
        .pipe(
          switchMap(() => this.refreshAllData()),
          catchError((err) => {
            this.logger.error("Error in real-time updates", err);
            return [];
          }),
        )
        .subscribe();
    }
  }

  /**
   * Refresh all dashboard data from backend services
   */
  public async refreshAllData(): Promise<void> {
    try {
      this.logger.debug("Refreshing all dashboard data");

      // Fetch data from orchestrator security services
      const [frameworks, metrics, gaps, events] = await Promise.all([
        this.fetchFrameworkStatus(),
        this.fetchSecurityMetrics(),
        this.fetchComplianceGaps(),
        this.fetchSecurityEvents(),
      ]);

      // Update observable streams
      this.frameworkStatusSubject.next(frameworks);
      this.securityMetricsSubject.next(metrics);
      this.complianceGapsSubject.next(gaps);
      this.securityEventsSubject.next(events);

      // Calculate executive dashboard metrics
      const executiveDashboard = this.calculateExecutiveMetrics(
        frameworks,
        metrics,
        gaps,
        events,
      );
      this.executiveDashboardSubject.next(executiveDashboard);

      this.logger.debug("Dashboard data refresh completed successfully");
    } catch (err) {
      this.logger.error("Failed to refresh dashboard data", err);
      throw err;
    }
  }

  /**
   * Get framework compliance status with real-time updates
   */
  public getFrameworkStatus(
    frameworkName?: string,
  ): Observable<ComplianceFrameworkStatus[]> {
    return this.frameworkStatus$.pipe(
      map((frameworks) =>
        frameworkName
          ? frameworks.filter((f) => f.framework === frameworkName)
          : frameworks,
      ),
    );
  }

  /**
   * Get security metrics with historical trends
   */
  public getSecurityMetrics(): Observable<SecurityMetrics | null> {
    return this.securityMetrics$;
  }

  /**
   * Get compliance gaps summary with prioritization
   */
  public getComplianceGaps(
    riskLevel?: string,
  ): Observable<ComplianceGapSummary | null> {
    return this.complianceGaps$.pipe(
      map((gaps) => {
        if (!gaps || !riskLevel) return gaps;

        // Filter gaps by risk level
        const filteredGaps = {
          ...gaps,
          topGaps: gaps.topGaps.filter((gap) => gap.riskLevel === riskLevel),
        };

        return filteredGaps;
      }),
    );
  }

  /**
   * Get security events with filtering and sorting
   */
  public getSecurityEvents(
    severityFilter?: string,
  ): Observable<SecurityEventSummary | null> {
    return this.securityEvents$.pipe(
      map((events) => {
        if (!events || !severityFilter) return events;

        // Filter events by severity
        const filteredEvents = {
          ...events,
          recentEvents: events.recentEvents.filter(
            (event) => event.severity === severityFilter,
          ),
        };

        return filteredEvents;
      }),
    );
  }

  /**
   * Get executive dashboard with high-level metrics
   */
  public getExecutiveDashboard(): Observable<ExecutiveDashboard | null> {
    return this.executiveDashboard$;
  }

  /**
   * Update dashboard configuration
   */
  public updateConfiguration(newConfig: Partial<DashboardConfiguration>): void {
    const currentConfig = this.dashboardConfigSubject.value;
    const updatedConfig = { ...currentConfig, ...newConfig };

    this.dashboardConfigSubject.next(updatedConfig);
    this.logger.log("Dashboard configuration updated", updatedConfig);

    // Restart real-time updates with new configuration
    if (
      newConfig.refreshInterval ||
      newConfig.enableRealTimeUpdates !== undefined
    ) {
      this.startRealTimeUpdates();
    }
  }

  /**
   * Add custom widget to dashboard
   */
  public addCustomWidget(widget: DashboardWidget): void {
    const currentConfig = this.dashboardConfigSubject.value;
    const updatedWidgets = [...currentConfig.customWidgets, widget];

    this.updateConfiguration({ customWidgets: updatedWidgets });
    this.logger.log(`Added custom widget: ${widget.title}`);
  }

  /**
   * Remove custom widget from dashboard
   */
  public removeCustomWidget(widgetId: string): void {
    const currentConfig = this.dashboardConfigSubject.value;
    const updatedWidgets = currentConfig.customWidgets.filter(
      (w) => w.id !== widgetId,
    );

    this.updateConfiguration({ customWidgets: updatedWidgets });
    this.logger.log(`Removed custom widget: ${widgetId}`);
  }

  /**
   * Get dashboard health status
   */
  public getDashboardHealth(): Observable<{
    isHealthy: boolean;
    lastUpdated: Date;
    issues: string[];
    dataFreshness: Record<string, Date>;
  }> {
    return this.dashboardData$.pipe(
      map((data) => ({
        isHealthy: data.isHealthy,
        lastUpdated: data.lastUpdated,
        issues: this.identifyHealthIssues(data),
        dataFreshness: {
          frameworks: data.frameworks?.[0]?.lastAssessment || new Date(),
          metrics: data.lastUpdated,
          gaps: data.lastUpdated,
          events: data.events?.recentEvents?.[0]?.timestamp || new Date(),
        },
      })),
    );
  }

  /**
   * Export dashboard data for reporting
   */
  public async exportDashboardData(
    format: "json" | "csv" | "xlsx" = "json",
  ): Promise<string | Blob> {
    const executiveData = this.executiveDashboardSubject.value;
    const dashboardData = {
      frameworks: this.frameworkStatusSubject.value,
      metrics: this.securityMetricsSubject.value,
      gaps: this.complianceGapsSubject.value,
      events: this.securityEventsSubject.value
        ? {
            totalEvents: this.securityEventsSubject.value.totalEvents,
          }
        : undefined,
      executive: executiveData
        ? {
            compliancePercentage: executiveData.compliancePercentage,
            criticalIssuesRequiringAttention:
              executiveData.criticalIssuesRequiringAttention,
          }
        : undefined,
      exportTimestamp: new Date().toISOString(),
      exportFormat: format,
    };

    switch (format) {
      case "json":
        return JSON.stringify(dashboardData, null, 2);

      case "csv":
        return this.convertToCSV(dashboardData);

      case "xlsx":
        return this.convertToExcel(dashboardData);

      default:
        return JSON.stringify(dashboardData, null, 2);
    }
  }

  // Private helper methods

  private async fetchFrameworkStatus(): Promise<ComplianceFrameworkStatus[]> {
    // This would typically call the orchestrator security services
    // For now, return mock data with realistic structure

    const frameworks: ComplianceFrameworkStatus[] = [
      {
        framework: "OWASP Top 10 2021",
        version: "2021",
        complianceScore: 87.5,
        status: "partially-compliant",
        lastAssessment: new Date(Date.now() - 86400000 * 7), // 7 days ago
        nextAssessment: new Date(Date.now() + 86400000 * 23), // 23 days from now
        criticalFindings: 2,
        highRiskFindings: 5,
        mediumRiskFindings: 12,
        lowRiskFindings: 8,
        trendsData: this.generateTrendData(87.5),
      },
      {
        framework: "NIST CSF 2.0",
        version: "2.0",
        complianceScore: 92.3,
        status: "compliant",
        lastAssessment: new Date(Date.now() - 86400000 * 3), // 3 days ago
        nextAssessment: new Date(Date.now() + 86400000 * 27), // 27 days from now
        criticalFindings: 0,
        highRiskFindings: 2,
        mediumRiskFindings: 7,
        lowRiskFindings: 15,
        trendsData: this.generateTrendData(92.3),
      },
      {
        framework: "SOC 2 Type II",
        version: "Current",
        complianceScore: 76.8,
        status: "non-compliant",
        lastAssessment: new Date(Date.now() - 86400000 * 14), // 14 days ago
        nextAssessment: new Date(Date.now() + 86400000 * 16), // 16 days from now
        criticalFindings: 4,
        highRiskFindings: 8,
        mediumRiskFindings: 18,
        lowRiskFindings: 6,
        trendsData: this.generateTrendData(76.8),
      },
    ];

    return frameworks;
  }

  private async fetchSecurityMetrics(): Promise<SecurityMetrics> {
    // Mock security metrics that would come from orchestrator services
    return {
      totalVulnerabilities: 127,
      criticalVulnerabilities: 3,
      highVulnerabilities: 12,
      mediumVulnerabilities: 45,
      lowVulnerabilities: 67,
      resolvedThisMonth: 89,
      averageResolutionTime: 4.2, // days
      complianceScore: 85.2,
      securityPostureScore: 88.7,
      incidentCount: 7,
      auditEvents: 2847,
      threatsDetected: 156,
      threatsBlocked: 152,
    };
  }

  private async fetchComplianceGaps(): Promise<ComplianceGapSummary> {
    // Mock compliance gaps that would come from orchestrator gap analyzer
    const topGaps: ComplianceGapDetail[] = [
      {
        id: "gap_001",
        title: "Missing Multi-Factor Authentication",
        description: "MFA not implemented for administrative accounts",
        riskLevel: "critical",
        framework: "OWASP Top 10 2021",
        category: "Authentication",
        estimatedEffort: "Medium",
        timelineRecommendation: "14-30 days",
        businessImpact: "High security risk",
        remediationSteps: [
          "Deploy MFA solution",
          "Configure administrative accounts",
          "Implement backup authentication",
          "Train administrative users",
        ],
      },
      {
        id: "gap_002",
        title: "Insufficient Logging and Monitoring",
        description: "Critical security events not adequately logged",
        riskLevel: "high",
        framework: "NIST CSF 2.0",
        category: "Detection",
        estimatedEffort: "High",
        timelineRecommendation: "30-60 days",
        businessImpact: "Compliance violation risk",
        remediationSteps: [
          "Implement comprehensive logging",
          "Deploy SIEM solution",
          "Configure alerting rules",
          "Establish monitoring procedures",
        ],
      },
    ];

    return {
      totalGaps: 45,
      criticalGaps: 3,
      highPriorityGaps: 8,
      mediumPriorityGaps: 22,
      lowPriorityGaps: 12,
      topGaps,
      gapsByCategory: {
        Authentication: 8,
        Authorization: 6,
        "Data Protection": 12,
        Monitoring: 7,
        "Incident Response": 4,
        Documentation: 8,
      },
      estimatedRemediationTime: "3-6 months",
    };
  }

  private async fetchSecurityEvents(): Promise<SecurityEventSummary> {
    // Mock security events that would come from orchestrator event correlation
    const recentEvents: SecurityEventDetail[] = [
      {
        id: "event_001",
        type: "Authentication Failure",
        severity: "high",
        timestamp: new Date(Date.now() - 3600000), // 1 hour ago
        source: "Auth Service",
        description: "Multiple failed login attempts detected",
        status: "investigating",
        impactedSystems: ["Auth API", "User Database"],
        complianceImpact: ["OWASP A07:2021", "NIST PR.AC-1"],
      },
      {
        id: "event_002",
        type: "Suspicious Network Traffic",
        severity: "medium",
        timestamp: new Date(Date.now() - 7200000), // 2 hours ago
        source: "Network Monitor",
        description: "Unusual outbound traffic patterns detected",
        status: "open",
        impactedSystems: ["Web Server", "Database Server"],
        complianceImpact: ["NIST DE.AE-1"],
      },
    ];

    return {
      totalEvents: 234,
      criticalEvents: 5,
      highPriorityEvents: 18,
      correlationsFound: 12,
      incidentsInProgress: 7,
      averageResponseTime: 2.3, // hours
      recentEvents,
      eventsByType: {
        Authentication: 45,
        Network: 32,
        Application: 78,
        System: 56,
        "Data Access": 23,
      },
      trendsData: this.generateEventTrendData(),
    };
  }

  private calculateExecutiveMetrics(
    frameworks: ComplianceFrameworkStatus[],
    metrics: SecurityMetrics | null,
    gaps: ComplianceGapSummary | null,
    _events: SecurityEventSummary | null,
  ): ExecutiveDashboard {
    const avgCompliance =
      frameworks.reduce((sum, f) => sum + f.complianceScore, 0) /
        frameworks.length || 0;
    const totalCritical = frameworks.reduce(
      (sum, f) => sum + f.criticalFindings,
      0,
    );

    let riskLevel: "low" | "medium" | "high" | "critical" = "low";
    let riskColor: "green" | "yellow" | "orange" | "red" = "green";

    if (totalCritical > 5 || avgCompliance < 70) {
      riskLevel = "critical";
      riskColor = "red";
    } else if (totalCritical > 2 || avgCompliance < 85) {
      riskLevel = "high";
      riskColor = "orange";
    } else if (totalCritical > 0 || avgCompliance < 95) {
      riskLevel = "medium";
      riskColor = "yellow";
    }

    return {
      overallRiskLevel: riskLevel,
      riskIndicatorColor: riskColor,
      compliancePercentage: Math.round(avgCompliance * 10) / 10,
      frameworksCompliant: frameworks.filter((f) => f.status === "compliant")
        .length,
      frameworksTotal: frameworks.length,
      criticalIssuesRequiringAttention: totalCritical,
      securityPostureTrend: "stable", // This would be calculated from historical data
      monthlyComplianceScore: Math.round(avgCompliance * 10) / 10,
      quarterlyOutlook: this.generateQuarterlyOutlook(riskLevel, avgCompliance),
      keyRecommendations: this.generateKeyRecommendations(frameworks, gaps),
      businessImpactLevel: this.calculateBusinessImpact(
        riskLevel,
        totalCritical,
      ),
    };
  }

  private generateTrendData(currentScore: number): ComplianceTrendData[] {
    const trends: ComplianceTrendData[] = [];
    const days = 30;

    for (let i = days; i >= 0; i--) {
      const variance = (Math.random() - 0.5) * 10; // +/- 5 points variance
      const score = Math.max(0, Math.min(100, currentScore + variance));
      const findings = Math.floor(Math.random() * 20) + 5;

      trends.push({
        date: new Date(Date.now() - i * 86400000),
        score,
        findings,
        riskLevel:
          score > 90
            ? "low"
            : score > 80
              ? "medium"
              : score > 70
                ? "high"
                : "critical",
      });
    }

    return trends;
  }

  private generateEventTrendData(): SecurityEventTrendData[] {
    const trends: SecurityEventTrendData[] = [];
    const days = 30;

    for (let i = days; i >= 0; i--) {
      const totalEvents = Math.floor(Math.random() * 50) + 10;
      const criticalEvents = Math.floor(Math.random() * 5);
      const resolvedEvents = Math.floor(totalEvents * 0.7); // 70% resolution rate

      trends.push({
        date: new Date(Date.now() - i * 86400000),
        totalEvents,
        criticalEvents,
        resolvedEvents,
      });
    }

    return trends;
  }

  private generateQuarterlyOutlook(
    riskLevel: string,
    avgCompliance: number,
  ): string {
    if (riskLevel === "critical") {
      return "Critical remediation required. Focus on immediate threat mitigation.";
    } else if (riskLevel === "high") {
      return "High priority improvements needed. Implement security enhancements.";
    } else if (avgCompliance < 95) {
      return "Good progress. Focus on achieving full compliance certification.";
    } else {
      return "Excellent security posture. Maintain current standards and monitoring.";
    }
  }

  private generateKeyRecommendations(
    frameworks: ComplianceFrameworkStatus[],
    gaps: ComplianceGapSummary | null,
  ): string[] {
    const recommendations: string[] = [];

    // Framework-specific recommendations
    const nonCompliantFrameworks = frameworks.filter(
      (f) => f.status !== "compliant",
    );
    if (nonCompliantFrameworks.length > 0) {
      recommendations.push(
        `Address compliance gaps in ${nonCompliantFrameworks.map((f) => f.framework).join(", ")}`,
      );
    }

    // Gap-based recommendations
    if (gaps && gaps.criticalGaps > 0) {
      recommendations.push(
        `Immediately address ${gaps.criticalGaps} critical security gaps`,
      );
    }

    // General recommendations
    recommendations.push(
      "Implement continuous compliance monitoring",
      "Enhance security awareness training",
      "Establish regular penetration testing",
      "Deploy advanced threat detection",
    );

    return recommendations.slice(0, 5); // Top 5 recommendations
  }

  private calculateBusinessImpact(
    riskLevel: string,
    criticalIssues: number,
  ): "minimal" | "moderate" | "significant" | "severe" {
    if (riskLevel === "critical" || criticalIssues > 5) return "severe";
    if (riskLevel === "high" || criticalIssues > 2) return "significant";
    if (riskLevel === "medium" || criticalIssues > 0) return "moderate";
    return "minimal";
  }

  private assessDashboardHealth(
    frameworks: ComplianceFrameworkStatus[],
    metrics: SecurityMetrics | null,
    gaps: ComplianceGapSummary | null,
    events: SecurityEventSummary | null,
  ): boolean {
    // Dashboard is healthy if data is recent and no critical issues
    const dataAge =
      Date.now() - (frameworks[0]?.lastAssessment?.getTime() || 0);
    const isDataFresh = dataAge < 86400000 * 7; // Within 7 days
    const noCriticalIssues = frameworks.every((f) => f.criticalFindings < 5);

    return (
      isDataFresh &&
      noCriticalIssues &&
      metrics !== null &&
      gaps !== null &&
      events !== null
    );
  }

  private identifyHealthIssues(data: {
    metrics?: unknown;
    gaps?: unknown;
    events?: unknown;
    frameworks?: ComplianceFrameworkStatus[];
  }): string[] {
    const issues: string[] = [];

    if (!data.metrics) issues.push("Security metrics unavailable");
    if (!data.gaps) issues.push("Compliance gap data unavailable");
    if (!data.events) issues.push("Security event data unavailable");
    if (
      data.frameworks?.some(
        (f: ComplianceFrameworkStatus) => f.criticalFindings > 5,
      )
    ) {
      issues.push("Critical security findings detected");
    }

    return issues;
  }

  private convertToCSV(data: {
    executive?: {
      compliancePercentage?: number;
      criticalIssuesRequiringAttention?: number;
    };
    events?: { totalEvents?: number };
    exportTimestamp?: string;
  }): string {
    // Simple CSV conversion for dashboard export
    const headers = ["Metric", "Value", "Timestamp"];
    const rows = [
      headers.join(","),
      `Overall Compliance,${data.executive?.compliancePercentage || 0}%,${data.exportTimestamp}`,
      `Critical Findings,${data.executive?.criticalIssuesRequiringAttention || 0},${data.exportTimestamp}`,
      `Security Events,${data.events?.totalEvents || 0},${data.exportTimestamp}`,
    ];

    return rows.join("\n");
  }

  private convertToExcel(data: Record<string, unknown>): Blob {
    // This would typically use a library like ExcelJS
    // For now, return as JSON blob
    const jsonString = JSON.stringify(data, null, 2);
    return new Blob([jsonString], { type: "application/json" });
  }

  private getDefaultConfiguration(): DashboardConfiguration {
    return {
      refreshInterval: 30000, // 30 seconds
      enableRealTimeUpdates: true,
      frameworksToMonitor: [
        "OWASP Top 10 2021",
        "NIST CSF 2.0",
        "SOC 2 Type II",
      ],
      alertThresholds: {
        criticalFindingsThreshold: 5,
        complianceScoreThreshold: 80,
        securityEventThreshold: 50,
      },
      customWidgets: [],
    };
  }

  private loadInitialData(): void {
    // Load initial dashboard data
    this.refreshAllData().catch((err) => {
      this.logger.error("Failed to load initial dashboard data", err);
    });
  }

  private setupPeriodicRefresh(): void {
    // Set up periodic refresh every 5 minutes for baseline updates
    interval(300000)
      .pipe(
        switchMap(() => this.refreshAllData()),
        catchError((err) => {
          this.logger.error("Error in periodic refresh", err);
          return [];
        }),
      )
      .subscribe();
  }
}
