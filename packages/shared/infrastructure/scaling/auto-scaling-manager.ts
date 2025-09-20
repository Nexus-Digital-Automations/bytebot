/**
 * PARLANT Database Function Wrapping System - Auto-Scaling Manager
 * Automated scaling and resource management for 1,520+ function deployments
 */

import { EventEmitter } from 'events';
import { ParlantConfigManager } from '../config-management/config-manager';
import { ParlantKubernetesOrchestrator } from '../orchestration/kubernetes-orchestrator';
import * as k8s from '@kubernetes/client-node';

export interface ScalingMetrics {
  timestamp: Date;
  serviceName: string;
  namespace: string;
  cpu: {
    current: number;
    request: number;
    limit: number;
    utilization: number;
  };
  memory: {
    current: number;
    request: number;
    limit: number;
    utilization: number;
  };
  replicas: {
    current: number;
    desired: number;
    min: number;
    max: number;
  };
  network: {
    requestsPerSecond: number;
    responseTime: number;
    errorRate: number;
  };
  custom: Record<string, number>;
}

export interface ScalingRule {
  id: string;
  name: string;
  serviceName: string;
  enabled: boolean;
  conditions: ScalingCondition[];
  actions: ScalingAction[];
  cooldownPeriod: number; // seconds
  priority: number;
  tags: string[];
}

export interface ScalingCondition {
  metric: string;
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'ne';
  threshold: number;
  duration: number; // seconds the condition must persist
  aggregation: 'avg' | 'max' | 'min' | 'sum' | 'p95' | 'p99';
}

export interface ScalingAction {
  type: 'scale_replicas' | 'scale_resources' | 'restart' | 'notify' | 'custom';
  parameters: Record<string, any>;
  executeOrder: number;
}

export interface ScalingEvent {
  id: string;
  timestamp: Date;
  serviceName: string;
  ruleName: string;
  triggerConditions: ScalingCondition[];
  executedActions: ScalingAction[];
  beforeState: ScalingMetrics;
  afterState?: ScalingMetrics;
  duration: number;
  success: boolean;
  errorMessage?: string;
}

export interface ResourcePrediction {
  serviceName: string;
  timeframe: string;
  predictedMetrics: {
    cpu: number;
    memory: number;
    requests: number;
    replicas: number;
  };
  confidence: number;
  factors: string[];
  recommendations: string[];
}

export interface ResourceOptimization {
  serviceName: string;
  currentResources: {
    cpu: { request: string; limit: string };
    memory: { request: string; limit: string };
  };
  recommendedResources: {
    cpu: { request: string; limit: string };
    memory: { request: string; limit: string };
  };
  potentialSavings: {
    cpu: number;
    memory: number;
    cost: number;
  };
  reasoning: string;
  confidence: number;
}

export class ParlantAutoScalingManager extends EventEmitter {
  private configManager: ParlantConfigManager;
  private orchestrator: ParlantKubernetesOrchestrator;
  private environment: string;
  private namespace: string;

  private metricsApi: k8s.Metrics;
  private scalingRules: Map<string, ScalingRule> = new Map();
  private scalingHistory: ScalingEvent[] = [];
  private lastScalingEvents: Map<string, Date> = new Map();

  private monitoringInterval: NodeJS.Timeout | null = null;
  private predictionInterval: NodeJS.Timeout | null = null;
  private optimizationInterval: NodeJS.Timeout | null = null;

  private readonly METRICS_COLLECTION_INTERVAL = 30000; // 30 seconds
  private readonly PREDICTION_INTERVAL = 300000; // 5 minutes
  private readonly OPTIMIZATION_INTERVAL = 3600000; // 1 hour

  constructor(environment: string, namespace?: string) {
    super();
    this.environment = environment;
    this.namespace = namespace || `parlant-${environment}`;
    this.configManager = new ParlantConfigManager(environment);
    this.orchestrator = new ParlantKubernetesOrchestrator(environment, namespace);

    this.initializeKubernetesMetrics();
  }

  /**
   * Initialize Kubernetes metrics client
   */
  private initializeKubernetesMetrics(): void {
    const kc = new k8s.KubeConfig();

    if (process.env.KUBECONFIG) {
      kc.loadFromFile(process.env.KUBECONFIG);
    } else if (process.env.KUBERNETES_SERVICE_HOST) {
      kc.loadFromCluster();
    } else {
      kc.loadFromDefault();
    }

    this.metricsApi = new k8s.Metrics(kc);
  }

  /**
   * Start auto-scaling monitoring and management
   */
  async start(): Promise<void> {
    console.log('Starting PARLANT Auto-Scaling Manager...');

    // Load scaling rules from configuration
    await this.loadScalingRules();

    // Start metrics collection
    this.startMetricsCollection();

    // Start predictive scaling
    this.startPredictiveScaling();

    // Start resource optimization
    this.startResourceOptimization();

    console.log(`Auto-scaling manager started for environment: ${this.environment}`);
    this.emit('started');
  }

  /**
   * Stop auto-scaling monitoring
   */
  async stop(): Promise<void> {
    console.log('Stopping PARLANT Auto-Scaling Manager...');

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    if (this.predictionInterval) {
      clearInterval(this.predictionInterval);
      this.predictionInterval = null;
    }

    if (this.optimizationInterval) {
      clearInterval(this.optimizationInterval);
      this.optimizationInterval = null;
    }

    console.log('Auto-scaling manager stopped');
    this.emit('stopped');
  }

  /**
   * Load scaling rules from configuration
   */
  private async loadScalingRules(): Promise<void> {
    const config = await this.configManager.loadConfiguration();

    // Default scaling rules for PARLANT functions
    const defaultRules: ScalingRule[] = [
      {
        id: 'high-cpu-scale-up',
        name: 'High CPU Usage Scale Up',
        serviceName: '*', // Apply to all services
        enabled: true,
        conditions: [
          {
            metric: 'cpu.utilization',
            operator: 'gte',
            threshold: 80,
            duration: 180, // 3 minutes
            aggregation: 'avg'
          }
        ],
        actions: [
          {
            type: 'scale_replicas',
            parameters: { increment: 2, max: 20 },
            executeOrder: 1
          }
        ],
        cooldownPeriod: 300, // 5 minutes
        priority: 1,
        tags: ['cpu', 'scale-up']
      },
      {
        id: 'low-cpu-scale-down',
        name: 'Low CPU Usage Scale Down',
        serviceName: '*',
        enabled: true,
        conditions: [
          {
            metric: 'cpu.utilization',
            operator: 'lte',
            threshold: 20,
            duration: 600, // 10 minutes
            aggregation: 'avg'
          }
        ],
        actions: [
          {
            type: 'scale_replicas',
            parameters: { decrement: 1, min: 1 },
            executeOrder: 1
          }
        ],
        cooldownPeriod: 600, // 10 minutes
        priority: 2,
        tags: ['cpu', 'scale-down']
      },
      {
        id: 'high-memory-scale-up',
        name: 'High Memory Usage Scale Up',
        serviceName: '*',
        enabled: true,
        conditions: [
          {
            metric: 'memory.utilization',
            operator: 'gte',
            threshold: 85,
            duration: 120, // 2 minutes
            aggregation: 'avg'
          }
        ],
        actions: [
          {
            type: 'scale_replicas',
            parameters: { increment: 2, max: 15 },
            executeOrder: 1
          }
        ],
        cooldownPeriod: 300, // 5 minutes
        priority: 1,
        tags: ['memory', 'scale-up']
      },
      {
        id: 'high-error-rate-scale-up',
        name: 'High Error Rate Scale Up',
        serviceName: '*',
        enabled: true,
        conditions: [
          {
            metric: 'network.errorRate',
            operator: 'gte',
            threshold: 5, // 5% error rate
            duration: 60, // 1 minute
            aggregation: 'avg'
          }
        ],
        actions: [
          {
            type: 'scale_replicas',
            parameters: { increment: 3, max: 25 },
            executeOrder: 1
          },
          {
            type: 'notify',
            parameters: {
              channels: ['slack', 'email'],
              severity: 'warning',
              message: 'High error rate detected, scaling up service'
            },
            executeOrder: 2
          }
        ],
        cooldownPeriod: 180, // 3 minutes
        priority: 0, // Highest priority
        tags: ['errors', 'scale-up', 'alert']
      },
      {
        id: 'response-time-scale-up',
        name: 'High Response Time Scale Up',
        serviceName: '*',
        enabled: true,
        conditions: [
          {
            metric: 'network.responseTime',
            operator: 'gte',
            threshold: 2000, // 2 seconds
            duration: 120, // 2 minutes
            aggregation: 'p95'
          }
        ],
        actions: [
          {
            type: 'scale_replicas',
            parameters: { increment: 2, max: 20 },
            executeOrder: 1
          }
        ],
        cooldownPeriod: 240, // 4 minutes
        priority: 1,
        tags: ['performance', 'scale-up']
      }
    ];

    // Environment-specific rule modifications
    if (this.environment === 'production') {
      // More aggressive scaling for production
      defaultRules.forEach(rule => {
        if (rule.id.includes('scale-up')) {
          rule.cooldownPeriod = Math.max(120, rule.cooldownPeriod / 2);
        }
      });
    } else if (this.environment === 'development') {
      // More conservative scaling for development
      defaultRules.forEach(rule => {
        rule.actions.forEach(action => {
          if (action.type === 'scale_replicas') {
            action.parameters.max = Math.min(action.parameters.max || 10, 5);
          }
        });
      });
    }

    // Load rules into manager
    defaultRules.forEach(rule => {
      this.scalingRules.set(rule.id, rule);
    });

    console.log(`Loaded ${this.scalingRules.size} scaling rules`);
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.collectAndEvaluateMetrics();
      } catch (error) {
        console.error('Error during metrics collection:', error);
        this.emit('metricsError', error);
      }
    }, this.METRICS_COLLECTION_INTERVAL);

    console.log('Metrics collection started');
  }

  /**
   * Collect metrics and evaluate scaling rules
   */
  private async collectAndEvaluateMetrics(): Promise<void> {
    const deploymentStatuses = await this.orchestrator.getAllDeploymentStatuses();

    for (const [serviceName, status] of deploymentStatuses) {
      try {
        const metrics = await this.collectServiceMetrics(serviceName);
        await this.evaluateScalingRules(serviceName, metrics);
      } catch (error) {
        console.warn(`Failed to collect metrics for ${serviceName}:`, error.message);
      }
    }
  }

  /**
   * Collect metrics for a specific service
   */
  private async collectServiceMetrics(serviceName: string): Promise<ScalingMetrics> {
    try {
      // Get pod metrics
      const podMetrics = await this.metricsApi.getPodMetrics(this.namespace);
      const serviceMetrics = podMetrics.items.filter(pod =>
        pod.metadata?.labels?.app === serviceName
      );

      // Get deployment info
      const deploymentStatus = await this.orchestrator.getDeploymentStatus(serviceName, this.namespace);

      // Calculate aggregated metrics
      let totalCpuUsage = 0;
      let totalMemoryUsage = 0;
      const podCount = serviceMetrics.length;

      serviceMetrics.forEach(pod => {
        pod.containers?.forEach(container => {
          const cpuUsage = this.parseResourceValue(container.usage?.cpu || '0');
          const memoryUsage = this.parseResourceValue(container.usage?.memory || '0');

          totalCpuUsage += cpuUsage;
          totalMemoryUsage += memoryUsage;
        });
      });

      // Mock network metrics (in real implementation, get from monitoring system)
      const networkMetrics = await this.getNetworkMetrics(serviceName);

      return {
        timestamp: new Date(),
        serviceName,
        namespace: this.namespace,
        cpu: {
          current: totalCpuUsage,
          request: 100, // TODO: Get from deployment spec
          limit: 500,   // TODO: Get from deployment spec
          utilization: (totalCpuUsage / (100 * podCount)) * 100
        },
        memory: {
          current: totalMemoryUsage,
          request: 128 * 1024 * 1024, // TODO: Get from deployment spec
          limit: 512 * 1024 * 1024,   // TODO: Get from deployment spec
          utilization: (totalMemoryUsage / (128 * 1024 * 1024 * podCount)) * 100
        },
        replicas: {
          current: deploymentStatus.replicas.current,
          desired: deploymentStatus.replicas.desired,
          min: 1, // TODO: Get from HPA
          max: 10 // TODO: Get from HPA
        },
        network: networkMetrics,
        custom: {}
      };

    } catch (error) {
      throw new Error(`Failed to collect metrics for ${serviceName}: ${error.message}`);
    }
  }

  /**
   * Parse Kubernetes resource values (CPU and memory)
   */
  private parseResourceValue(value: string): number {
    // Parse CPU (e.g., "100m" = 0.1 cores)
    if (value.endsWith('m')) {
      return parseInt(value.slice(0, -1)) / 1000;
    }
    if (value.endsWith('n')) {
      return parseInt(value.slice(0, -1)) / 1000000000;
    }

    // Parse memory (e.g., "128Mi" = 128 * 1024 * 1024 bytes)
    if (value.endsWith('Ki')) {
      return parseInt(value.slice(0, -2)) * 1024;
    }
    if (value.endsWith('Mi')) {
      return parseInt(value.slice(0, -2)) * 1024 * 1024;
    }
    if (value.endsWith('Gi')) {
      return parseInt(value.slice(0, -2)) * 1024 * 1024 * 1024;
    }

    return parseFloat(value) || 0;
  }

  /**
   * Get network metrics (mock implementation)
   */
  private async getNetworkMetrics(serviceName: string): Promise<{
    requestsPerSecond: number;
    responseTime: number;
    errorRate: number;
  }> {
    // In a real implementation, this would query your monitoring system
    // (Prometheus, CloudWatch, etc.)
    return {
      requestsPerSecond: Math.random() * 100,
      responseTime: 100 + Math.random() * 900,
      errorRate: Math.random() * 10
    };
  }

  /**
   * Evaluate scaling rules for a service
   */
  private async evaluateScalingRules(serviceName: string, metrics: ScalingMetrics): Promise<void> {
    const applicableRules = Array.from(this.scalingRules.values())
      .filter(rule => rule.enabled && (rule.serviceName === '*' || rule.serviceName === serviceName))
      .sort((a, b) => a.priority - b.priority);

    for (const rule of applicableRules) {
      const lastExecution = this.lastScalingEvents.get(`${serviceName}-${rule.id}`);
      const cooldownExpired = !lastExecution ||
        (Date.now() - lastExecution.getTime()) > (rule.cooldownPeriod * 1000);

      if (!cooldownExpired) {
        continue;
      }

      const triggeredConditions = this.evaluateConditions(rule.conditions, metrics);
      if (triggeredConditions.length > 0) {
        await this.executeScalingActions(rule, metrics, triggeredConditions);
        break; // Execute only one rule per evaluation cycle
      }
    }
  }

  /**
   * Evaluate scaling conditions
   */
  private evaluateConditions(conditions: ScalingCondition[], metrics: ScalingMetrics): ScalingCondition[] {
    const triggeredConditions: ScalingCondition[] = [];

    for (const condition of conditions) {
      const value = this.getMetricValue(condition.metric, metrics);
      const satisfied = this.evaluateOperator(value, condition.operator, condition.threshold);

      if (satisfied) {
        triggeredConditions.push(condition);
      }
    }

    // For now, require all conditions to be met (AND logic)
    return triggeredConditions.length === conditions.length ? triggeredConditions : [];
  }

  /**
   * Get metric value by path
   */
  private getMetricValue(metricPath: string, metrics: ScalingMetrics): number {
    const parts = metricPath.split('.');
    let value: any = metrics;

    for (const part of parts) {
      value = value?.[part];
    }

    return typeof value === 'number' ? value : 0;
  }

  /**
   * Evaluate comparison operator
   */
  private evaluateOperator(value: number, operator: string, threshold: number): boolean {
    switch (operator) {
      case 'gt': return value > threshold;
      case 'gte': return value >= threshold;
      case 'lt': return value < threshold;
      case 'lte': return value <= threshold;
      case 'eq': return value === threshold;
      case 'ne': return value !== threshold;
      default: return false;
    }
  }

  /**
   * Execute scaling actions
   */
  private async executeScalingActions(
    rule: ScalingRule,
    beforeMetrics: ScalingMetrics,
    triggeredConditions: ScalingCondition[]
  ): Promise<void> {
    const scalingEvent: ScalingEvent = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      serviceName: beforeMetrics.serviceName,
      ruleName: rule.name,
      triggerConditions: triggeredConditions,
      executedActions: [],
      beforeState: beforeMetrics,
      duration: 0,
      success: false
    };

    const startTime = Date.now();

    try {
      const sortedActions = rule.actions.sort((a, b) => a.executeOrder - b.executeOrder);

      for (const action of sortedActions) {
        await this.executeScalingAction(action, beforeMetrics);
        scalingEvent.executedActions.push(action);
      }

      // Wait a bit and collect after metrics
      await this.sleep(10000); // 10 seconds
      scalingEvent.afterState = await this.collectServiceMetrics(beforeMetrics.serviceName);

      scalingEvent.success = true;
      this.lastScalingEvents.set(`${beforeMetrics.serviceName}-${rule.id}`, new Date());

      console.log(`Successfully executed scaling rule: ${rule.name} for ${beforeMetrics.serviceName}`);
      this.emit('scalingExecuted', scalingEvent);

    } catch (error) {
      scalingEvent.errorMessage = error.message;
      console.error(`Failed to execute scaling rule: ${rule.name}`, error);
      this.emit('scalingError', { rule, error });
    } finally {
      scalingEvent.duration = Date.now() - startTime;
      this.scalingHistory.push(scalingEvent);

      // Keep only last 1000 events
      if (this.scalingHistory.length > 1000) {
        this.scalingHistory = this.scalingHistory.slice(-1000);
      }
    }
  }

  /**
   * Execute a single scaling action
   */
  private async executeScalingAction(action: ScalingAction, metrics: ScalingMetrics): Promise<void> {
    switch (action.type) {
      case 'scale_replicas':
        await this.executeReplicaScaling(action, metrics);
        break;

      case 'scale_resources':
        await this.executeResourceScaling(action, metrics);
        break;

      case 'restart':
        await this.executeRestart(action, metrics);
        break;

      case 'notify':
        await this.executeNotification(action, metrics);
        break;

      case 'custom':
        await this.executeCustomAction(action, metrics);
        break;

      default:
        throw new Error(`Unknown scaling action type: ${action.type}`);
    }
  }

  /**
   * Execute replica scaling
   */
  private async executeReplicaScaling(action: ScalingAction, metrics: ScalingMetrics): Promise<void> {
    const currentReplicas = metrics.replicas.current;
    let newReplicas = currentReplicas;

    if (action.parameters.increment) {
      newReplicas = Math.min(
        currentReplicas + action.parameters.increment,
        action.parameters.max || metrics.replicas.max
      );
    } else if (action.parameters.decrement) {
      newReplicas = Math.max(
        currentReplicas - action.parameters.decrement,
        action.parameters.min || metrics.replicas.min
      );
    } else if (action.parameters.target) {
      newReplicas = Math.max(
        action.parameters.min || metrics.replicas.min,
        Math.min(action.parameters.target, action.parameters.max || metrics.replicas.max)
      );
    }

    if (newReplicas !== currentReplicas) {
      await this.orchestrator.scaleDeployment(metrics.serviceName, newReplicas);
      console.log(`Scaled ${metrics.serviceName} from ${currentReplicas} to ${newReplicas} replicas`);
    }
  }

  /**
   * Execute resource scaling (CPU/Memory limits)
   */
  private async executeResourceScaling(action: ScalingAction, metrics: ScalingMetrics): Promise<void> {
    // TODO: Implement resource scaling (requires patching deployment spec)
    console.log(`Resource scaling for ${metrics.serviceName}:`, action.parameters);
  }

  /**
   * Execute restart action
   */
  private async executeRestart(action: ScalingAction, metrics: ScalingMetrics): Promise<void> {
    // TODO: Implement rolling restart
    console.log(`Restarting ${metrics.serviceName}`);
  }

  /**
   * Execute notification
   */
  private async executeNotification(action: ScalingAction, metrics: ScalingMetrics): Promise<void> {
    const notification = {
      service: metrics.serviceName,
      message: action.parameters.message || 'Auto-scaling action executed',
      severity: action.parameters.severity || 'info',
      metrics: {
        cpu: metrics.cpu.utilization,
        memory: metrics.memory.utilization,
        replicas: metrics.replicas.current
      }
    };

    // TODO: Implement actual notification sending
    console.log(`Notification:`, notification);
    this.emit('notification', notification);
  }

  /**
   * Execute custom action
   */
  private async executeCustomAction(action: ScalingAction, metrics: ScalingMetrics): Promise<void> {
    // TODO: Implement custom action execution
    console.log(`Custom action for ${metrics.serviceName}:`, action.parameters);
    this.emit('customAction', { action, metrics });
  }

  /**
   * Start predictive scaling
   */
  private startPredictiveScaling(): void {
    this.predictionInterval = setInterval(async () => {
      try {
        await this.performPredictiveScaling();
      } catch (error) {
        console.error('Error during predictive scaling:', error);
        this.emit('predictionError', error);
      }
    }, this.PREDICTION_INTERVAL);

    console.log('Predictive scaling started');
  }

  /**
   * Perform predictive scaling analysis
   */
  private async performPredictiveScaling(): Promise<void> {
    const deploymentStatuses = await this.orchestrator.getAllDeploymentStatuses();

    for (const [serviceName] of deploymentStatuses) {
      try {
        const prediction = await this.generateResourcePrediction(serviceName);
        await this.applyPredictiveScaling(serviceName, prediction);
      } catch (error) {
        console.warn(`Failed predictive scaling for ${serviceName}:`, error.message);
      }
    }
  }

  /**
   * Generate resource prediction for a service
   */
  private async generateResourcePrediction(serviceName: string): Promise<ResourcePrediction> {
    // Mock implementation - in real scenario, use ML models or time series analysis
    const currentMetrics = await this.collectServiceMetrics(serviceName);

    return {
      serviceName,
      timeframe: '30m',
      predictedMetrics: {
        cpu: currentMetrics.cpu.utilization * 1.2, // 20% increase predicted
        memory: currentMetrics.memory.utilization * 1.1, // 10% increase predicted
        requests: Math.random() * 1000,
        replicas: Math.ceil(currentMetrics.replicas.current * 1.15)
      },
      confidence: 0.75,
      factors: ['historical_trends', 'time_of_day', 'day_of_week'],
      recommendations: ['Consider pre-scaling before predicted load increase']
    };
  }

  /**
   * Apply predictive scaling
   */
  private async applyPredictiveScaling(serviceName: string, prediction: ResourcePrediction): Promise<void> {
    if (prediction.confidence < 0.7) {
      return; // Only act on high-confidence predictions
    }

    const currentMetrics = await this.collectServiceMetrics(serviceName);

    // Predictive scale-up if high confidence and significant increase predicted
    if (prediction.predictedMetrics.cpu > 70 && prediction.confidence > 0.8) {
      const targetReplicas = Math.min(
        prediction.predictedMetrics.replicas,
        currentMetrics.replicas.max
      );

      if (targetReplicas > currentMetrics.replicas.current) {
        console.log(`Predictive scaling: ${serviceName} to ${targetReplicas} replicas`);
        await this.orchestrator.scaleDeployment(serviceName, targetReplicas);

        this.emit('predictiveScaling', {
          serviceName,
          prediction,
          action: 'scale_up',
          from: currentMetrics.replicas.current,
          to: targetReplicas
        });
      }
    }
  }

  /**
   * Start resource optimization
   */
  private startResourceOptimization(): void {
    this.optimizationInterval = setInterval(async () => {
      try {
        await this.performResourceOptimization();
      } catch (error) {
        console.error('Error during resource optimization:', error);
        this.emit('optimizationError', error);
      }
    }, this.OPTIMIZATION_INTERVAL);

    console.log('Resource optimization started');
  }

  /**
   * Perform resource optimization analysis
   */
  private async performResourceOptimization(): Promise<void> {
    const deploymentStatuses = await this.orchestrator.getAllDeploymentStatuses();

    for (const [serviceName] of deploymentStatuses) {
      try {
        const optimization = await this.generateResourceOptimization(serviceName);
        await this.reportOptimizationRecommendations(serviceName, optimization);
      } catch (error) {
        console.warn(`Failed resource optimization for ${serviceName}:`, error.message);
      }
    }
  }

  /**
   * Generate resource optimization recommendations
   */
  private async generateResourceOptimization(serviceName: string): Promise<ResourceOptimization> {
    const metrics = await this.collectServiceMetrics(serviceName);

    // Analyze historical usage patterns (mock implementation)
    const avgCpuUtilization = metrics.cpu.utilization;
    const avgMemoryUtilization = metrics.memory.utilization;

    // Calculate recommended resources based on actual usage
    const cpuRecommendation = this.calculateOptimalResource(
      metrics.cpu.request,
      avgCpuUtilization,
      'cpu'
    );
    const memoryRecommendation = this.calculateOptimalResource(
      metrics.memory.request,
      avgMemoryUtilization,
      'memory'
    );

    return {
      serviceName,
      currentResources: {
        cpu: { request: '100m', limit: '500m' }, // TODO: Get from deployment
        memory: { request: '128Mi', limit: '512Mi' } // TODO: Get from deployment
      },
      recommendedResources: {
        cpu: cpuRecommendation,
        memory: memoryRecommendation
      },
      potentialSavings: {
        cpu: Math.max(0, (avgCpuUtilization - 60) / 100), // Save if under 60% utilization
        memory: Math.max(0, (avgMemoryUtilization - 70) / 100), // Save if under 70% utilization
        cost: 0 // TODO: Calculate cost savings
      },
      reasoning: `Based on ${avgCpuUtilization.toFixed(1)}% CPU and ${avgMemoryUtilization.toFixed(1)}% memory utilization`,
      confidence: 0.8
    };
  }

  /**
   * Calculate optimal resource allocation
   */
  private calculateOptimalResource(
    currentRequest: number,
    utilization: number,
    resourceType: 'cpu' | 'memory'
  ): { request: string; limit: string } {
    const targetUtilization = resourceType === 'cpu' ? 60 : 70; // Target utilization percentages
    const bufferMultiplier = resourceType === 'cpu' ? 1.5 : 1.3; // Buffer for limits

    const optimalRequest = Math.max(
      currentRequest * (utilization / targetUtilization),
      currentRequest * 0.5 // Don't reduce by more than 50%
    );

    const optimalLimit = optimalRequest * bufferMultiplier;

    if (resourceType === 'cpu') {
      return {
        request: `${Math.round(optimalRequest)}m`,
        limit: `${Math.round(optimalLimit)}m`
      };
    } else {
      return {
        request: `${Math.round(optimalRequest / (1024 * 1024))}Mi`,
        limit: `${Math.round(optimalLimit / (1024 * 1024))}Mi`
      };
    }
  }

  /**
   * Report optimization recommendations
   */
  private async reportOptimizationRecommendations(
    serviceName: string,
    optimization: ResourceOptimization
  ): Promise<void> {
    if (optimization.potentialSavings.cpu > 0.2 || optimization.potentialSavings.memory > 0.2) {
      console.log(`Resource optimization opportunity for ${serviceName}:`);
      console.log(`  Current: CPU ${optimization.currentResources.cpu.request}, Memory ${optimization.currentResources.memory.request}`);
      console.log(`  Recommended: CPU ${optimization.recommendedResources.cpu.request}, Memory ${optimization.recommendedResources.memory.request}`);
      console.log(`  Reasoning: ${optimization.reasoning}`);

      this.emit('optimizationRecommendation', optimization);
    }
  }

  /**
   * Get scaling history
   */
  getScalingHistory(serviceName?: string, limit = 100): ScalingEvent[] {
    let history = this.scalingHistory;

    if (serviceName) {
      history = history.filter(event => event.serviceName === serviceName);
    }

    return history.slice(-limit);
  }

  /**
   * Get scaling rules
   */
  getScalingRules(): ScalingRule[] {
    return Array.from(this.scalingRules.values());
  }

  /**
   * Add or update scaling rule
   */
  addScalingRule(rule: ScalingRule): void {
    this.scalingRules.set(rule.id, rule);
    console.log(`Added scaling rule: ${rule.name}`);
  }

  /**
   * Remove scaling rule
   */
  removeScalingRule(ruleId: string): boolean {
    const removed = this.scalingRules.delete(ruleId);
    if (removed) {
      console.log(`Removed scaling rule: ${ruleId}`);
    }
    return removed;
  }

  /**
   * Get current metrics for all services
   */
  async getCurrentMetrics(): Promise<Map<string, ScalingMetrics>> {
    const metrics = new Map<string, ScalingMetrics>();
    const deploymentStatuses = await this.orchestrator.getAllDeploymentStatuses();

    for (const [serviceName] of deploymentStatuses) {
      try {
        const serviceMetrics = await this.collectServiceMetrics(serviceName);
        metrics.set(serviceName, serviceMetrics);
      } catch (error) {
        console.warn(`Failed to collect metrics for ${serviceName}:`, error.message);
      }
    }

    return metrics;
  }

  /**
   * Utility method to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}