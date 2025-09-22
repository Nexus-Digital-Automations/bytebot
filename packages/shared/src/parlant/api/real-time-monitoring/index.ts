/**
 * @fileoverview Real-Time API Monitoring - Main Exports
 * PARLANT Phase 1 - Comprehensive real-time monitoring system exports
 * Enterprise-grade monitoring with WebSocket integration and conversational AI
 *
 * @version 1.0.0
 * @author AIgent PARLANT Team
 * @since 2025-09-22
 */

// Core interfaces and types
export * from "./interfaces/real-time-monitoring.interface";

// Main monitoring service
export { EnhancedRealTimeAPIMonitorService } from "./services/real-time-api-monitor.service";

// Conversational dashboard
export { ConversationalMonitoringDashboardService } from "./dashboard/conversational-monitoring-dashboard.service";

// WebSocket integration
export { WebSocketIntegrationService } from "./websocket/websocket-integration.service";

// Performance analytics
export { PerformanceAnalyticsService } from "./analytics/performance-analytics.service";

// Intelligent alerting
export { IntelligentAlertingService } from "./alerting/intelligent-alerting.service";

// Security and access control
export { MonitoringSecurityService } from "./security/monitoring-security.service";

// API endpoints
export { MonitoringAPIEndpointsService } from "./api/monitoring-api-endpoints.service";

// Configuration defaults
export const defaultRealTimeMonitoringConfig = {
  enabled: true,
  webSocketPort: 8080,
  maxConnections: 1000,
  maxConnectionsPerUser: 5,
  messageCompressionEnabled: true,
  rateLimiting: {
    messagesPerSecond: 100,
    burstLimit: 200,
    windowSizeMs: 1000,
  },
  monitoring: {
    updateIntervalMs: 100, // Sub-100ms updates
    metricsRetentionMs: 3600000, // 1 hour
    alertThresholds: {
      latencyMs: 1000,
      errorRatePercent: 5,
      throughputDropPercent: 20,
      resourceUtilizationPercent: 80,
      businessMetricThresholds: new Map(),
    },
    conversationalEnabled: true,
  },
  performance: {
    targetLatencyMs: 50,
    maxConcurrentOperations: 1000,
    memoryThresholdMB: 1024,
    cpuThresholdPercent: 70,
  },
  security: {
    authenticationRequired: true,
    encryptionEnabled: true,
    auditLoggingEnabled: true,
    sessionTimeoutMs: 3600000,
  },
};

// Utility functions
export const MonitoringUtils = {
  /**
   * Creates optimized monitoring configuration
   */
  createOptimizedConfig: (baseConfig: any) => {
    return {
      ...defaultRealTimeMonitoringConfig,
      ...baseConfig,
      performance: {
        ...defaultRealTimeMonitoringConfig.performance,
        ...baseConfig.performance,
      },
      security: {
        ...defaultRealTimeMonitoringConfig.security,
        ...baseConfig.security,
      },
    };
  },

  /**
   * Validates monitoring configuration
   */
  validateConfig: (config: any): boolean => {
    return (
      config.enabled !== undefined &&
      config.webSocketPort > 0 &&
      config.maxConnections > 0 &&
      config.performance?.targetLatencyMs > 0
    );
  },

  /**
   * Calculates optimal performance settings
   */
  calculateOptimalSettings: (systemSpecs: any) => {
    const cpuCores = systemSpecs.cpuCores || 4;
    const memoryGB = systemSpecs.memoryGB || 8;

    return {
      maxConnections: Math.min(1000, cpuCores * 100),
      connectionPoolSize: cpuCores * 10,
      bufferSize: Math.min(8192, memoryGB * 1024),
      targetLatencyMs: cpuCores >= 8 ? 25 : 50,
    };
  },
};

/**
 * Main Real-Time Monitoring Module Factory
 * Creates and configures the complete monitoring system
 */
export class RealTimeMonitoringModule {
  private realTimeMonitor: EnhancedRealTimeAPIMonitorService;
  private dashboard: ConversationalMonitoringDashboardService;
  private websocket: WebSocketIntegrationService;
  private analytics: PerformanceAnalyticsService;
  private alerting: IntelligentAlertingService;
  private security: MonitoringSecurityService;
  private apiEndpoints: MonitoringAPIEndpointsService;

  constructor(config: any = defaultRealTimeMonitoringConfig) {
    this.initializeServices(config);
  }

  private initializeServices(config: any): void {
    // Initialize services in dependency order
    this.security = new MonitoringSecurityService();
    this.websocket = new WebSocketIntegrationService();
    this.analytics = new PerformanceAnalyticsService();
    this.alerting = new IntelligentAlertingService();
    this.dashboard = new ConversationalMonitoringDashboardService();
    this.realTimeMonitor = new EnhancedRealTimeAPIMonitorService();
    this.apiEndpoints = new MonitoringAPIEndpointsService();
  }

  /**
   * Gets the main monitoring service
   */
  getMonitoringService(): EnhancedRealTimeAPIMonitorService {
    return this.realTimeMonitor;
  }

  /**
   * Gets the conversational dashboard service
   */
  getDashboardService(): ConversationalMonitoringDashboardService {
    return this.dashboard;
  }

  /**
   * Gets the WebSocket integration service
   */
  getWebSocketService(): WebSocketIntegrationService {
    return this.websocket;
  }

  /**
   * Gets the performance analytics service
   */
  getAnalyticsService(): PerformanceAnalyticsService {
    return this.analytics;
  }

  /**
   * Gets the intelligent alerting service
   */
  getAlertingService(): IntelligentAlertingService {
    return this.alerting;
  }

  /**
   * Gets the security service
   */
  getSecurityService(): MonitoringSecurityService {
    return this.security;
  }

  /**
   * Gets the API endpoints service
   */
  getAPIEndpointsService(): MonitoringAPIEndpointsService {
    return this.apiEndpoints;
  }

  /**
   * Initializes the complete monitoring system
   */
  async initialize(): Promise<void> {
    // Initialize all services
    await Promise.all([
      this.security.onModuleInit?.(),
      this.websocket.onModuleInit?.(),
      this.realTimeMonitor.onModuleInit?.(),
    ]);
  }

  /**
   * Shuts down the monitoring system gracefully
   */
  async shutdown(): Promise<void> {
    // Shutdown all services
    await Promise.all([
      this.realTimeMonitor.onModuleDestroy?.(),
      this.websocket.onModuleDestroy?.(),
      this.security.onModuleDestroy?.(),
    ]);
  }

  /**
   * Gets comprehensive system health status
   */
  async getSystemHealth(): Promise<SystemHealthStatus> {
    const healthChecks = await Promise.allSettled([
      this.checkServiceHealth("monitoring", this.realTimeMonitor),
      this.checkServiceHealth("dashboard", this.dashboard),
      this.checkServiceHealth("websocket", this.websocket),
      this.checkServiceHealth("analytics", this.analytics),
      this.checkServiceHealth("alerting", this.alerting),
      this.checkServiceHealth("security", this.security),
      this.checkServiceHealth("api", this.apiEndpoints),
    ]);

    const services: Record<string, ServiceHealth> = {};
    healthChecks.forEach((result, index) => {
      const serviceName = [
        "monitoring",
        "dashboard",
        "websocket",
        "analytics",
        "alerting",
        "security",
        "api",
      ][index];
      services[serviceName] =
        result.status === "fulfilled"
          ? result.value
          : { status: "unhealthy", error: "Health check failed" };
    });

    const overallStatus = Object.values(services).every(
      (s) => s.status === "healthy",
    )
      ? "healthy"
      : Object.values(services).some((s) => s.status === "healthy")
        ? "degraded"
        : "unhealthy";

    return {
      status: overallStatus,
      timestamp: new Date(),
      services,
      uptime: process.uptime() * 1000,
      version: "1.0.0",
    };
  }

  private async checkServiceHealth(
    name: string,
    service: any,
  ): Promise<ServiceHealth> {
    try {
      // Basic health check - verify service is initialized
      if (!service) {
        return { status: "unhealthy", error: "Service not initialized" };
      }

      // Check if service has health check method
      if (typeof service.healthCheck === "function") {
        const health = await service.healthCheck();
        return { status: health.healthy ? "healthy" : "unhealthy", ...health };
      }

      return { status: "healthy" };
    } catch (error) {
      return {
        status: "unhealthy",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

// Type definitions for module
interface SystemHealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: Date;
  services: Record<string, ServiceHealth>;
  uptime: number;
  version: string;
}

interface ServiceHealth {
  status: "healthy" | "degraded" | "unhealthy";
  error?: string;
  metrics?: any;
  lastCheck?: Date;
}

// Version and metadata
export const REAL_TIME_MONITORING_VERSION = "1.0.0";
export const REAL_TIME_MONITORING_BUILD = "2025.09.22.001";

/**
 * Feature flags for enterprise deployment
 */
export const FeatureFlags = {
  WEBSOCKET_COMPRESSION: true,
  ML_BASED_ALERTING: true,
  CONVERSATIONAL_AI: true,
  ENTERPRISE_SECURITY: true,
  REAL_TIME_ANALYTICS: true,
  SUB_100MS_LATENCY: true,
  AUTO_SCALING: true,
  PREDICTIVE_INSIGHTS: true,
};

/**
 * Monitoring system capabilities
 */
export const SystemCapabilities = {
  maxConcurrentOperations: 1000,
  maxWebSocketConnections: 1000,
  targetLatencyMs: 50,
  supportedAlertTypes: ["performance", "security", "business", "system"],
  supportedLanguages: ["en", "es", "fr", "de", "ja", "zh"],
  enterpriseFeatures: [
    "SSO Integration",
    "RBAC Authorization",
    "Audit Logging",
    "Encryption at Rest",
    "Zero Trust Security",
    "Compliance Reporting",
  ],
};
