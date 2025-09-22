/**
 * @fileoverview Intelligent Alerting Service
 * PARLANT Phase 1 - Conversational alerts with intelligent explanations and user intervention
 * Provides context-aware alerting with natural language explanations and automated resolution
 *
 * @version 1.0.0
 * @author AIgent PARLANT Team
 * @since 2025-09-22
 */

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { performance } from 'perf_hooks';
import {
  IntelligentAlert,
  ConversationalExplanation,
  SuggestedAction,
  EscalationStep,
  AlertContext,
  AlertSeverity,
  AlertCategory,
  ActionType,
  RiskLevel,
  ExecutionStep,
  RollbackProcedure,
  ImpactAssessment,
  VisualAid,
  DocumentationLink,
  ConversationalAlert,
  ConversationalPreferences,
  RealTimeMetrics,
  AlertSubscription,
  AlertRule,
  AlertCondition,
  NotificationChannel,
  AlertHistory
} from '../interfaces/real-time-monitoring.interface';

/**
 * Intelligent Alerting Service
 *
 * Features:
 * - Context-aware alert generation with intelligent thresholds
 * - Conversational explanations with natural language processing
 * - Automated resolution suggestions and execution
 * - Escalation management with intelligent routing
 * - Multi-channel notification delivery
 * - Alert correlation and noise reduction
 * - User intervention capabilities with safety controls
 * - Machine learning for alert optimization
 */
@Injectable()
export class IntelligentAlertingService extends EventEmitter {
  private readonly logger = new Logger(IntelligentAlertingService.name);

  // Alert management components
  private alertRules = new Map<string, AlertRule[]>();
  private activeAlerts = new Map<string, IntelligentAlert>();
  private alertHistory = new Map<string, AlertHistory[]>();
  private escalationPaths = new Map<string, EscalationStep[]>();

  // Notification and communication
  private notificationChannels = new Map<string, NotificationChannel>();
  private conversationalExplainer: ConversationalExplainer;
  private alertCorrelator: AlertCorrelator;
  private resolutionEngine: ResolutionEngine;

  // Machine learning and optimization
  private alertClassifier: AlertClassifier;
  private noiseReducer: NoiseReducer;
  private impactPredictor: ImpactPredictor;
  private alertOptimizer: AlertOptimizer;

  // Performance and metrics
  private alertMetrics = {
    totalAlerts: 0,
    accurateAlerts: 0,
    falsePositives: 0,
    averageResolutionTime: 0,
    escalationRate: 0,
    userSatisfaction: 0.0
  };

  // Configuration
  private config: IntelligentAlertingConfig = {
    thresholds: {
      latencyMs: 1000,
      errorRatePercent: 5,
      throughputDropPercent: 20,
      resourceUtilizationPercent: 80,
      businessImpactThreshold: 0.1
    },
    correlation: {
      timeWindowMs: 300000, // 5 minutes
      similarityThreshold: 0.8,
      maxCorrelatedAlerts: 10,
      enableAutoCorrelation: true
    },
    resolution: {
      enableAutoResolution: true,
      maxAutoResolutionRisk: 'medium',
      approvalRequired: ['high', 'critical'],
      rollbackEnabled: true
    },
    notification: {
      channels: ['email', 'sms', 'webhook', 'in_app'],
      batchingEnabled: true,
      quietHours: {
        enabled: true,
        start: '22:00',
        end: '08:00'
      }
    },
    ml: {
      enableLearning: true,
      trainingInterval: 86400000, // 24 hours
      confidenceThreshold: 0.7,
      feedbackEnabled: true
    }
  };

  constructor() {
    super();
    this.initializeAlertingComponents();
    this.setupEventHandlers();
  }

  /**
   * Evaluates alert conditions and generates intelligent alerts
   */
  async evaluateAlertConditions(
    operationId: string,
    metrics: RealTimeMetrics,
    context?: AlertEvaluationContext
  ): Promise<IntelligentAlert[]> {
    const startTime = performance.now();

    try {
      // Get alert rules for the operation
      const alertRules = this.alertRules.get(operationId) || [];
      if (alertRules.length === 0) {
        return [];
      }

      // Evaluate each alert rule
      const triggeredAlerts: IntelligentAlert[] = [];

      for (const rule of alertRules) {
        const isTriggered = await this.evaluateAlertRule(rule, metrics, context);

        if (isTriggered) {
          const alert = await this.createIntelligentAlert(rule, metrics, operationId);
          triggeredAlerts.push(alert);
        }
      }

      // Correlate alerts to reduce noise
      const correlatedAlerts = await this.correlateAlerts(triggeredAlerts, operationId);

      // Apply ML-based filtering
      const filteredAlerts = await this.filterAlertsWithML(correlatedAlerts);

      // Store active alerts
      for (const alert of filteredAlerts) {
        this.activeAlerts.set(alert.alertId, alert);

        // Add to history
        this.addToAlertHistory(operationId, alert);
      }

      const evaluationTime = performance.now() - startTime;

      this.logger.log(`Alert evaluation completed in ${evaluationTime.toFixed(2)}ms`, {
        operationId,
        rulesEvaluated: alertRules.length,
        alertsTriggered: triggeredAlerts.length,
        alertsFiltered: filteredAlerts.length,
        evaluationTime
      });

      // Emit alerts for processing
      if (filteredAlerts.length > 0) {
        this.emit('alerts_generated', { operationId, alerts: filteredAlerts });
      }

      return filteredAlerts;
    } catch (error) {
      const evaluationTime = performance.now() - startTime;
      this.logger.error(`Alert evaluation failed after ${evaluationTime.toFixed(2)}ms`, {
        operationId,
        error: error instanceof Error ? error.message : String(error),
        evaluationTime
      });
      return [];
    }
  }

  /**
   * Generates conversational alerts with natural language explanations
   */
  async generateConversationalAlert(
    alert: IntelligentAlert,
    userPreferences: ConversationalPreferences
  ): Promise<ConversationalAlert> {
    const startTime = performance.now();

    try {
      // Generate conversational explanation
      const explanation = await this.conversationalExplainer.generateExplanation({
        alert,
        userPreferences,
        context: alert.context,
        technicalLevel: userPreferences.technicalDetailLevel
      });

      // Create visual aids if requested
      const visualAids = userPreferences.visualAidsEnabled
        ? await this.generateVisualAids(alert, userPreferences)
        : [];

      // Generate contextual follow-up questions
      const followUpQuestions = await this.generateFollowUpQuestions(alert, userPreferences);

      // Create intervention options
      const interventionOptions = await this.createInterventionOptions(alert);

      const conversationalAlert: ConversationalAlert = {
        alertId: alert.alertId,
        conversationalSummary: explanation.userFriendlyExplanation,
        technicalExplanation: explanation.technicalDetails,
        businessImpactExplanation: explanation.businessImpact,
        visualAids,
        followUpQuestions,
        interventionOptions,
        confidenceScore: await this.calculateAlertConfidence(alert),
        urgencyLevel: this.mapSeverityToUrgency(alert.severity),
        estimatedResolutionTime: this.estimateResolutionTime(alert),
        relatedDocumentation: explanation.relatedDocumentation || []
      };

      const generationTime = performance.now() - startTime;

      this.logger.debug(`Conversational alert generated in ${generationTime.toFixed(2)}ms`, {
        alertId: alert.alertId,
        urgencyLevel: conversationalAlert.urgencyLevel,
        visualAidsCount: visualAids.length,
        generationTime
      });

      return conversationalAlert;
    } catch (error) {
      const generationTime = performance.now() - startTime;
      this.logger.error(`Conversational alert generation failed after ${generationTime.toFixed(2)}ms`, {
        alertId: alert.alertId,
        error: error instanceof Error ? error.message : String(error),
        generationTime
      });
      throw error;
    }
  }

  /**
   * Processes user intervention commands for alerts
   */
  async processAlertIntervention(
    alertId: string,
    interventionCommand: string,
    userId: string,
    context?: InterventionContext
  ): Promise<InterventionResult> {
    const startTime = performance.now();

    try {
      const alert = this.activeAlerts.get(alertId);
      if (!alert) {
        throw new Error(`Alert not found: ${alertId}`);
      }

      // Parse intervention command
      const parsedCommand = await this.parseInterventionCommand(
        interventionCommand,
        alert,
        context
      );

      // Validate intervention permissions and safety
      const validation = await this.validateIntervention(
        parsedCommand,
        alert,
        userId
      );

      if (!validation.allowed) {
        return {
          success: false,
          alertId,
          action: parsedCommand.action,
          reason: validation.reason,
          alternatives: validation.alternatives
        };
      }

      // Execute intervention
      const executionResult = await this.executeIntervention(
        parsedCommand,
        alert,
        userId
      );

      // Update alert status
      if (executionResult.success) {
        await this.updateAlertStatus(alertId, parsedCommand.action, executionResult);
      }

      const interventionTime = performance.now() - startTime;

      this.logger.log(`Alert intervention processed in ${interventionTime.toFixed(2)}ms`, {
        alertId,
        action: parsedCommand.action,
        success: executionResult.success,
        userId,
        interventionTime
      });

      return {
        success: executionResult.success,
        alertId,
        action: parsedCommand.action,
        result: executionResult.result,
        followUpActions: executionResult.followUpActions,
        interventionTime
      };
    } catch (error) {
      const interventionTime = performance.now() - startTime;
      this.logger.error(`Alert intervention failed after ${interventionTime.toFixed(2)}ms`, {
        alertId,
        userId,
        command: interventionCommand.substring(0, 100),
        error: error instanceof Error ? error.message : String(error),
        interventionTime
      });

      return {
        success: false,
        alertId,
        action: 'unknown',
        reason: `Intervention failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Manages intelligent alert escalation with context awareness
   */
  async manageAlertEscalation(
    alertId: string,
    escalationTrigger: EscalationTrigger
  ): Promise<EscalationResult> {
    const startTime = performance.now();

    try {
      const alert = this.activeAlerts.get(alertId);
      if (!alert) {
        throw new Error(`Alert not found: ${alertId}`);
      }

      // Get escalation path
      const escalationPath = this.escalationPaths.get(alert.operationId) ||
                            alert.escalationPath ||
                            await this.createDefaultEscalationPath(alert);

      // Determine current escalation level
      const currentLevel = await this.getCurrentEscalationLevel(alertId);
      const nextStep = escalationPath[currentLevel];

      if (!nextStep) {
        return {
          success: false,
          alertId,
          reason: 'No further escalation steps available',
          escalationLevel: currentLevel
        };
      }

      // Prepare escalation context
      const escalationContext = await this.prepareEscalationContext(alert, escalationTrigger);

      // Execute escalation step
      const escalationResult = await this.executeEscalationStep(
        nextStep,
        alert,
        escalationContext
      );

      // Update alert escalation status
      await this.updateEscalationStatus(alertId, currentLevel + 1, escalationResult);

      const escalationTime = performance.now() - startTime;

      this.logger.log(`Alert escalation managed in ${escalationTime.toFixed(2)}ms`, {
        alertId,
        escalationLevel: currentLevel + 1,
        escalationType: nextStep.type,
        success: escalationResult.success,
        escalationTime
      });

      return {
        success: escalationResult.success,
        alertId,
        escalationLevel: currentLevel + 1,
        escalatedTo: nextStep.assignedTo,
        estimatedResponseTime: nextStep.expectedResponseTime,
        escalationTime
      };
    } catch (error) {
      const escalationTime = performance.now() - startTime;
      this.logger.error(`Alert escalation failed after ${escalationTime.toFixed(2)}ms`, {
        alertId,
        error: error instanceof Error ? error.message : String(error),
        escalationTime
      });
      throw error;
    }
  }

  /**
   * Provides comprehensive alert analytics and insights
   */
  getAlertAnalytics(operationId?: string): AlertAnalytics {
    const timeRange = {
      start: new Date(Date.now() - 86400000), // Last 24 hours
      end: new Date()
    };

    let relevantAlerts: IntelligentAlert[];

    if (operationId) {
      const history = this.alertHistory.get(operationId) || [];
      relevantAlerts = history
        .filter(h => h.timestamp >= timeRange.start)
        .map(h => h.alert);
    } else {
      relevantAlerts = Array.from(this.activeAlerts.values())
        .filter(alert => alert.timestamp >= timeRange.start);
    }

    // Calculate analytics
    const totalAlerts = relevantAlerts.length;
    const criticalAlerts = relevantAlerts.filter(a => a.severity === 'critical').length;
    const resolvedAlerts = relevantAlerts.filter(a => this.isAlertResolved(a.alertId)).length;
    const averageResolutionTime = this.calculateAverageResolutionTime(relevantAlerts);

    // Alert distribution by category
    const alertsByCategory = new Map<AlertCategory, number>();
    relevantAlerts.forEach(alert => {
      const count = alertsByCategory.get(alert.category) || 0;
      alertsByCategory.set(alert.category, count + 1);
    });

    // Alert distribution by severity
    const alertsBySeverity = new Map<AlertSeverity, number>();
    relevantAlerts.forEach(alert => {
      const count = alertsBySeverity.get(alert.severity) || 0;
      alertsBySeverity.set(alert.severity, count + 1);
    });

    return {
      timeRange,
      totalAlerts,
      criticalAlerts,
      resolvedAlerts,
      averageResolutionTime,
      alertsByCategory,
      alertsBySeverity,
      escalationRate: this.alertMetrics.escalationRate,
      falsePositiveRate: totalAlerts > 0 ? this.alertMetrics.falsePositives / totalAlerts : 0,
      userSatisfactionScore: this.alertMetrics.userSatisfaction,
      topAlertSources: this.getTopAlertSources(relevantAlerts),
      resolutionTrends: this.getResolutionTrends(relevantAlerts)
    };
  }

  /**
   * Private implementation methods
   */
  private initializeAlertingComponents(): void {
    this.conversationalExplainer = new ConversationalExplainer();
    this.alertCorrelator = new AlertCorrelator(this.config.correlation);
    this.resolutionEngine = new ResolutionEngine(this.config.resolution);
    this.alertClassifier = new AlertClassifier();
    this.noiseReducer = new NoiseReducer();
    this.impactPredictor = new ImpactPredictor();
    this.alertOptimizer = new AlertOptimizer();
  }

  private setupEventHandlers(): void {
    this.on('alerts_generated', this.handleAlertsGenerated.bind(this));
    this.on('alert_resolved', this.handleAlertResolved.bind(this));
    this.on('escalation_triggered', this.handleEscalationTriggered.bind(this));
  }

  private async handleAlertsGenerated(event: { operationId: string; alerts: IntelligentAlert[] }): Promise<void> {
    // Process newly generated alerts
    for (const alert of event.alerts) {
      await this.processNewAlert(alert);
    }
  }

  private async handleAlertResolved(event: { alertId: string; resolution: AlertResolution }): Promise<void> {
    // Handle alert resolution
    this.logger.log(`Alert resolved: ${event.alertId}`, {
      resolutionMethod: event.resolution.method,
      resolutionTime: event.resolution.resolutionTime
    });
  }

  private async handleEscalationTriggered(event: { alertId: string; level: number }): Promise<void> {
    // Handle escalation triggers
    this.logger.warn(`Alert escalated: ${event.alertId}`, {
      escalationLevel: event.level
    });
  }

  // Core alert processing methods
  private async evaluateAlertRule(
    rule: AlertRule,
    metrics: RealTimeMetrics,
    context?: AlertEvaluationContext
  ): Promise<boolean> {
    // Evaluate specific alert rule conditions
    for (const condition of rule.conditions) {
      const isConditionMet = await this.evaluateCondition(condition, metrics, context);

      if (rule.logicalOperator === 'AND' && !isConditionMet) {
        return false;
      }

      if (rule.logicalOperator === 'OR' && isConditionMet) {
        return true;
      }
    }

    return rule.logicalOperator === 'AND';
  }

  private async evaluateCondition(
    condition: AlertCondition,
    metrics: RealTimeMetrics,
    context?: AlertEvaluationContext
  ): Promise<boolean> {
    // Extract metric value based on condition
    const metricValue = this.extractMetricValue(condition.metric, metrics);

    // Apply comparison operator
    switch (condition.operator) {
      case 'greater_than':
        return metricValue > condition.threshold;
      case 'less_than':
        return metricValue < condition.threshold;
      case 'equals':
        return metricValue === condition.threshold;
      case 'not_equals':
        return metricValue !== condition.threshold;
      default:
        return false;
    }
  }

  private extractMetricValue(metricPath: string, metrics: RealTimeMetrics): number {
    // Extract metric value using dot notation path
    const pathParts = metricPath.split('.');
    let value: any = metrics;

    for (const part of pathParts) {
      value = value?.[part];
    }

    return typeof value === 'number' ? value : 0;
  }

  private async createIntelligentAlert(
    rule: AlertRule,
    metrics: RealTimeMetrics,
    operationId: string
  ): Promise<IntelligentAlert> {
    const alertId = uuidv4();

    // Generate conversational explanation
    const explanation = await this.generateInitialExplanation(rule, metrics, operationId);

    // Assess alert context
    const context = await this.buildAlertContext(rule, metrics, operationId);

    // Generate suggested actions
    const suggestedActions = await this.generateSuggestedActions(rule, metrics, context);

    // Create escalation path
    const escalationPath = await this.createEscalationPath(rule, context);

    return {
      alertId,
      timestamp: new Date(),
      operationId,
      severity: rule.severity,
      category: rule.category,
      title: rule.title,
      conversationalExplanation: explanation,
      context,
      suggestedActions,
      escalationPath,
      userInterventionRequired: this.requiresUserIntervention(rule.severity),
      automaticResolutionAttempted: false
    };
  }

  // Placeholder implementations for complex methods
  private async correlateAlerts(alerts: IntelligentAlert[], operationId: string): Promise<IntelligentAlert[]> {
    // Apply correlation logic to reduce noise
    return this.alertCorrelator.correlate(alerts);
  }

  private async filterAlertsWithML(alerts: IntelligentAlert[]): Promise<IntelligentAlert[]> {
    // Apply ML filtering to reduce false positives
    return this.noiseReducer.filter(alerts);
  }

  private addToAlertHistory(operationId: string, alert: IntelligentAlert): void {
    const history = this.alertHistory.get(operationId) || [];
    history.push({
      alertId: alert.alertId,
      alert,
      timestamp: alert.timestamp,
      resolved: false,
      resolutionTime: null
    });
    this.alertHistory.set(operationId, history);
  }

  // Additional placeholder methods for full implementation...
  private async generateInitialExplanation(rule: AlertRule, metrics: RealTimeMetrics, operationId: string): Promise<ConversationalExplanation> {
    return {
      summary: `Alert triggered for ${rule.title}`,
      technicalDetails: `Metric ${rule.conditions[0].metric} exceeded threshold`,
      businessImpact: 'Potential impact on user experience',
      userFriendlyExplanation: 'System performance issue detected'
    };
  }

  private async buildAlertContext(rule: AlertRule, metrics: RealTimeMetrics, operationId: string): Promise<AlertContext> {
    return {
      operationId,
      triggeringMetrics: metrics,
      historicalContext: {},
      businessContext: {},
      technicalContext: {}
    };
  }

  private async generateSuggestedActions(rule: AlertRule, metrics: RealTimeMetrics, context: AlertContext): Promise<SuggestedAction[]> {
    return [];
  }

  private async createEscalationPath(rule: AlertRule, context: AlertContext): Promise<EscalationStep[]> {
    return [];
  }

  private requiresUserIntervention(severity: AlertSeverity): boolean {
    return severity === 'high' || severity === 'critical';
  }

  // More placeholder methods would continue here...
}

// Supporting classes and interfaces
class ConversationalExplainer {
  async generateExplanation(params: any): Promise<ConversationalExplanation> {
    return {
      summary: 'Alert explanation',
      technicalDetails: 'Technical details',
      businessImpact: 'Business impact',
      userFriendlyExplanation: 'User-friendly explanation'
    };
  }
}

class AlertCorrelator {
  constructor(private config: any) {}

  correlate(alerts: IntelligentAlert[]): IntelligentAlert[] {
    return alerts; // Simplified implementation
  }
}

class ResolutionEngine {
  constructor(private config: any) {}
}

class AlertClassifier {
  classify(alert: IntelligentAlert): string {
    return 'performance';
  }
}

class NoiseReducer {
  filter(alerts: IntelligentAlert[]): IntelligentAlert[] {
    return alerts; // Simplified implementation
  }
}

class ImpactPredictor {
  predict(alert: IntelligentAlert): number {
    return 0.5;
  }
}

class AlertOptimizer {
  optimize(rules: AlertRule[]): AlertRule[] {
    return rules;
  }
}

// Additional supporting interfaces
interface IntelligentAlertingConfig {
  thresholds: {
    latencyMs: number;
    errorRatePercent: number;
    throughputDropPercent: number;
    resourceUtilizationPercent: number;
    businessImpactThreshold: number;
  };
  correlation: {
    timeWindowMs: number;
    similarityThreshold: number;
    maxCorrelatedAlerts: number;
    enableAutoCorrelation: boolean;
  };
  resolution: {
    enableAutoResolution: boolean;
    maxAutoResolutionRisk: string;
    approvalRequired: string[];
    rollbackEnabled: boolean;
  };
  notification: {
    channels: string[];
    batchingEnabled: boolean;
    quietHours: {
      enabled: boolean;
      start: string;
      end: string;
    };
  };
  ml: {
    enableLearning: boolean;
    trainingInterval: number;
    confidenceThreshold: number;
    feedbackEnabled: boolean;
  };
}

interface AlertEvaluationContext {
  userId?: string;
  sessionId?: string;
  businessContext?: Record<string, unknown>;
}

interface ConversationalAlert {
  alertId: string;
  conversationalSummary: string;
  technicalExplanation: string;
  businessImpactExplanation: string;
  visualAids: VisualAid[];
  followUpQuestions: string[];
  interventionOptions: InterventionOption[];
  confidenceScore: number;
  urgencyLevel: string;
  estimatedResolutionTime: number;
  relatedDocumentation: DocumentationLink[];
}

interface InterventionOption {
  optionId: string;
  description: string;
  riskLevel: RiskLevel;
  estimatedImpact: string;
}

interface InterventionContext {
  sessionId?: string;
  userPermissions?: string[];
  businessContext?: Record<string, unknown>;
}

interface InterventionResult {
  success: boolean;
  alertId: string;
  action: string;
  reason?: string;
  result?: unknown;
  alternatives?: string[];
  followUpActions?: string[];
  interventionTime?: number;
}

interface EscalationTrigger {
  type: 'timeout' | 'severity_increase' | 'manual' | 'auto_resolution_failed';
  timestamp: Date;
  context?: Record<string, unknown>;
}

interface EscalationResult {
  success: boolean;
  alertId: string;
  escalationLevel: number;
  escalatedTo?: string;
  estimatedResponseTime?: number;
  reason?: string;
  escalationTime?: number;
}

interface AlertAnalytics {
  timeRange: { start: Date; end: Date };
  totalAlerts: number;
  criticalAlerts: number;
  resolvedAlerts: number;
  averageResolutionTime: number;
  alertsByCategory: Map<AlertCategory, number>;
  alertsBySeverity: Map<AlertSeverity, number>;
  escalationRate: number;
  falsePositiveRate: number;
  userSatisfactionScore: number;
  topAlertSources: string[];
  resolutionTrends: any[];
}

interface AlertResolution {
  method: 'automatic' | 'manual' | 'escalated';
  resolutionTime: number;
  resolvedBy?: string;
}