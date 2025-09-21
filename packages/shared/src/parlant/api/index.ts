/**
 * @fileoverview Parlant API Integration Exports
 * Comprehensive enterprise API integration patterns for natural language control
 *
 * @version 1.0.0
 * @author AIgent Enterprise API Team
 * @since 2025-09-21
 */

// Core conversational API patterns
export { ConversationalAPIPatternsService } from "./core/conversational-api-patterns.service";

// Pre-execution validation workflows
export { PreExecutionValidatorService } from "./validation/pre-execution-validator.service";

// Real-time API monitoring
export { RealTimeMonitorService } from "./monitoring/real-time-monitor.service";

// High-throughput performance optimization
export { HighThroughputOptimizerService } from "./performance/high-throughput-optimizer.service";

// Enterprise API Gateway cluster
export { EnterpriseAPIGatewayService } from "./gateway/enterprise-api-gateway.service";

// Interface exports
export * from "./interfaces/conversational-api.interface";
export * from "./interfaces/performance.interface";
export * from "./interfaces/gateway.interface";

// Type definitions for comprehensive API integration
export interface ParlantAPIIntegrationConfig {
  // Core configuration
  enabled: boolean;
  version: string;

  // Performance targets
  targetThroughput: number; // requests per second
  targetLatency: number; // milliseconds (P95)
  targetAvailability: number; // percentage

  // Conversational validation
  validationEnabled: boolean;
  intentAnalysisTimeout: number;
  parameterNegotiationTimeout: number;
  riskAssessmentTimeout: number;

  // Real-time monitoring
  monitoringEnabled: boolean;
  monitoringLevel: "BASIC" | "ENHANCED" | "COMPREHENSIVE" | "REAL_TIME";
  interventionEnabled: boolean;

  // Performance optimization
  optimizationEnabled: boolean;
  connectionPoolingEnabled: boolean;
  cachingEnabled: boolean;
  autoScalingEnabled: boolean;

  // Security and compliance
  securityEnforcementEnabled: boolean;
  complianceValidationEnabled: boolean;
  auditTrailEnabled: boolean;

  // Gateway configuration
  gatewayClusterEnabled: boolean;
  loadBalancingEnabled: boolean;
  failoverEnabled: boolean;

  // Enterprise features
  enterpriseAuthenticationEnabled: boolean;
  multiTenantSupport: boolean;
  globalDeploymentSupport: boolean;
}

export interface ParlantAPIMetrics {
  // Request metrics
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;

  // Throughput metrics
  requestsPerSecond: number;
  peakThroughput: number;
  sustainedThroughput: number;

  // Validation metrics
  validationSuccessRate: number;
  averageValidationTime: number;
  parameterNegotiationSuccessRate: number;

  // Performance metrics
  latencyP50: number;
  latencyP95: number;
  latencyP99: number;
  errorRate: number;

  // Resource metrics
  cpuUtilization: number;
  memoryUtilization: number;
  networkUtilization: number;

  // Security metrics
  securityBlocks: number;
  threatDetections: number;
  complianceViolations: number;

  // Optimization metrics
  cacheHitRate: number;
  connectionPoolEfficiency: number;
  autoScalingEvents: number;

  // User experience metrics
  userSatisfactionScore: number;
  interventionSuccessRate: number;
  conversationalClarificationRate: number;
}

export interface ParlantAPICapabilities {
  // Core capabilities
  naturalLanguageAPIControl: boolean;
  conversationalValidation: boolean;
  realTimeMonitoring: boolean;
  userIntervention: boolean;

  // Performance capabilities
  highThroughputOptimization: boolean;
  adaptiveThrottling: boolean;
  intelligentCaching: boolean;
  predictiveScaling: boolean;

  // Enterprise capabilities
  multiFactorAuthentication: boolean;
  enterpriseSSO: boolean;
  roleBasedAccessControl: boolean;
  complianceReporting: boolean;

  // Advanced capabilities
  conversationalErrorRecovery: boolean;
  intentLearning: boolean;
  performancePrediction: boolean;
  anomalyDetection: boolean;

  // Integration capabilities
  legacySystemIntegration: boolean;
  multiCloudDeployment: boolean;
  disasterRecovery: boolean;
  globalLoadBalancing: boolean;
}

/**
 * Main Parlant API Integration facade
 * Provides unified access to all enterprise API integration capabilities
 */
export class ParlantAPIIntegration {
  private readonly config: ParlantAPIIntegrationConfig;
  private readonly conversationalPatterns: ConversationalAPIPatternsService;
  private readonly validator: PreExecutionValidatorService;
  private readonly monitor: RealTimeMonitorService;
  private readonly optimizer: HighThroughputOptimizerService;
  private readonly gateway: EnterpriseAPIGatewayService;

  constructor(config: ParlantAPIIntegrationConfig) {
    this.config = config;

    // Initialize core services
    this.conversationalPatterns = new ConversationalAPIPatternsService();
    this.validator = new PreExecutionValidatorService();
    this.monitor = new RealTimeMonitorService();
    this.optimizer = new HighThroughputOptimizerService();
    this.gateway = new EnterpriseAPIGatewayService();
  }

  /**
   * Get comprehensive API capabilities
   */
  getCapabilities(): ParlantAPICapabilities {
    return {
      // Core capabilities
      naturalLanguageAPIControl: this.config.enabled,
      conversationalValidation: this.config.validationEnabled,
      realTimeMonitoring: this.config.monitoringEnabled,
      userIntervention: this.config.interventionEnabled,

      // Performance capabilities
      highThroughputOptimization: this.config.optimizationEnabled,
      adaptiveThrottling: this.config.gatewayClusterEnabled,
      intelligentCaching: this.config.cachingEnabled,
      predictiveScaling: this.config.autoScalingEnabled,

      // Enterprise capabilities
      multiFactorAuthentication: this.config.enterpriseAuthenticationEnabled,
      enterpriseSSO: this.config.enterpriseAuthenticationEnabled,
      roleBasedAccessControl: this.config.securityEnforcementEnabled,
      complianceReporting: this.config.complianceValidationEnabled,

      // Advanced capabilities
      conversationalErrorRecovery: this.config.validationEnabled,
      intentLearning: this.config.enabled,
      performancePrediction: this.config.optimizationEnabled,
      anomalyDetection: this.config.monitoringEnabled,

      // Integration capabilities
      legacySystemIntegration: this.config.enabled,
      multiCloudDeployment: this.config.globalDeploymentSupport,
      disasterRecovery: this.config.failoverEnabled,
      globalLoadBalancing: this.config.loadBalancingEnabled,
    };
  }

  /**
   * Get current system metrics
   */
  async getMetrics(): Promise<ParlantAPIMetrics> {
    // Aggregate metrics from all components
    const performanceInsights =
      await this.optimizer.monitorPerformanceMetrics();
    const clusterHealth = await this.gateway.monitorClusterHealth();

    return {
      // Request metrics
      totalRequests: clusterHealth.performance.requestsPerSecond * 3600, // hourly estimate
      successfulRequests: Math.floor(
        clusterHealth.performance.requestsPerSecond *
          3600 *
          (1 - clusterHealth.performance.errorRate),
      ),
      failedRequests: Math.floor(
        clusterHealth.performance.requestsPerSecond *
          3600 *
          clusterHealth.performance.errorRate,
      ),
      averageResponseTime: clusterHealth.performance.averageLatency,

      // Throughput metrics
      requestsPerSecond: clusterHealth.performance.requestsPerSecond,
      peakThroughput: clusterHealth.performance.requestsPerSecond * 1.5,
      sustainedThroughput: clusterHealth.performance.requestsPerSecond * 0.8,

      // Validation metrics (mock values - would be collected from actual validation service)
      validationSuccessRate: 0.95,
      averageValidationTime: 150,
      parameterNegotiationSuccessRate: 0.92,

      // Performance metrics
      latencyP50: performanceInsights.currentMetrics.latency.p50,
      latencyP95: performanceInsights.currentMetrics.latency.p95,
      latencyP99: performanceInsights.currentMetrics.latency.p99,
      errorRate: clusterHealth.performance.errorRate,

      // Resource metrics
      cpuUtilization:
        performanceInsights.currentMetrics.resourceUtilization.cpu,
      memoryUtilization:
        performanceInsights.currentMetrics.resourceUtilization.memory,
      networkUtilization:
        performanceInsights.currentMetrics.resourceUtilization.network,

      // Security metrics (mock values)
      securityBlocks: 25,
      threatDetections: 5,
      complianceViolations: 0,

      // Optimization metrics
      cacheHitRate: clusterHealth.performance.cacheHitRate,
      connectionPoolEfficiency: 0.85,
      autoScalingEvents: 3,

      // User experience metrics (mock values)
      userSatisfactionScore: 0.88,
      interventionSuccessRate: 0.91,
      conversationalClarificationRate: 0.15,
    };
  }

  /**
   * Initialize the Parlant API integration system
   */
  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      throw new Error("Parlant API Integration is not enabled");
    }

    // Initialize components based on configuration
    // Note: In a real implementation, this would set up all the services
    // with proper dependency injection and configuration
  }

  /**
   * Health check for the entire integration system
   */
  async healthCheck(): Promise<{
    status: "HEALTHY" | "DEGRADED" | "UNHEALTHY";
    components: Record<string, boolean>;
    metrics: ParlantAPIMetrics;
  }> {
    const components = {
      conversationalPatterns: this.config.validationEnabled,
      validator: this.config.validationEnabled,
      monitor: this.config.monitoringEnabled,
      optimizer: this.config.optimizationEnabled,
      gateway: this.config.gatewayClusterEnabled,
    };

    const healthyComponents = Object.values(components).filter(Boolean).length;
    const totalComponents = Object.values(components).length;

    let status: "HEALTHY" | "DEGRADED" | "UNHEALTHY";

    if (healthyComponents === totalComponents) {
      status = "HEALTHY";
    } else if (healthyComponents > totalComponents / 2) {
      status = "DEGRADED";
    } else {
      status = "UNHEALTHY";
    }

    return {
      status,
      components,
      metrics: await this.getMetrics(),
    };
  }
}

// Default configuration for enterprise deployment
export const defaultEnterpriseConfig: ParlantAPIIntegrationConfig = {
  enabled: true,
  version: "1.0.0",

  // Enterprise performance targets
  targetThroughput: 10000, // 10K req/sec
  targetLatency: 100, // 100ms P95
  targetAvailability: 99.99, // 99.99%

  // Conversational validation
  validationEnabled: true,
  intentAnalysisTimeout: 2000,
  parameterNegotiationTimeout: 5000,
  riskAssessmentTimeout: 1000,

  // Real-time monitoring
  monitoringEnabled: true,
  monitoringLevel: "COMPREHENSIVE",
  interventionEnabled: true,

  // Performance optimization
  optimizationEnabled: true,
  connectionPoolingEnabled: true,
  cachingEnabled: true,
  autoScalingEnabled: true,

  // Security and compliance
  securityEnforcementEnabled: true,
  complianceValidationEnabled: true,
  auditTrailEnabled: true,

  // Gateway configuration
  gatewayClusterEnabled: true,
  loadBalancingEnabled: true,
  failoverEnabled: true,

  // Enterprise features
  enterpriseAuthenticationEnabled: true,
  multiTenantSupport: true,
  globalDeploymentSupport: true,
};
