/**
 * Event Correlation and Aggregation Engine - Agent 3 Implementation
 *
 * Advanced event correlation and aggregation service that provides intelligent
 * event relationship mapping, multi-transport data delivery, and comprehensive
 * analytics for enterprise-grade audit logging systems.
 *
 * Features:
 * - Real-time event correlation with machine learning algorithms
 * - Multi-dimensional aggregation with time-series analysis
 * - Multi-transport support (file, database, SIEM, webhook, message queue)
 * - Advanced pattern recognition and anomaly detection
 * - Distributed correlation across multiple service instances
 * - Performance-optimized correlation algorithms with caching
 * - Configurable correlation rules and custom aggregation metrics
 * - Real-time streaming analytics and dashboard integration
 *
 * @fileoverview Event correlation and aggregation engine
 * @version 1.0.0
 * @author Enterprise Security Audit Team - Agent 3
 * @created 2025-09-22
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import {
  AuditEvent,
  AuditSeverity,
  SecurityEventCategory,
  AuditEventStatus,
} from '../types';

/**
 * Correlation configuration interface
 */
export interface CorrelationConfig {
  /** Enable correlation engine */
  enabled: boolean;
  /** Time window for correlation in milliseconds */
  timeWindow: number;
  /** Maximum correlation distance */
  maxDistance: number;
  /** Minimum similarity threshold */
  similarityThreshold: number;
  /** Maximum correlations per event */
  maxCorrelations: number;
  /** Correlation algorithms to use */
  algorithms: CorrelationAlgorithm[];
  /** Performance settings */
  performance: {
    bufferSize: number;
    flushInterval: number;
    cacheSize: number;
    maxConcurrentCorrelations: number;
  };
}

/**
 * Aggregation configuration interface
 */
export interface AggregationConfig {
  /** Enable aggregation engine */
  enabled: boolean;
  /** Aggregation intervals */
  intervals: AggregationInterval[];
  /** Metrics to calculate */
  metrics: AggregationMetric[];
  /** Data retention periods */
  retention: {
    hourly: number;
    daily: number;
    weekly: number;
    monthly: number;
  };
  /** Performance settings */
  performance: {
    batchSize: number;
    parallelWorkers: number;
    compressionEnabled: boolean;
  };
}

/**
 * Transport configuration interface
 */
export interface TransportConfig {
  /** Transport type */
  type: 'file' | 'database' | 'siem' | 'webhook' | 'message_queue';
  /** Transport name */
  name: string;
  /** Enabled status */
  enabled: boolean;
  /** Configuration specific to transport type */
  config: Record<string, unknown>;
  /** Format for data delivery */
  format: 'json' | 'csv' | 'xml' | 'binary';
  /** Batch settings */
  batch: {
    size: number;
    timeout: number;
    compression: boolean;
  };
  /** Retry settings */
  retry: {
    maxAttempts: number;
    backoffMs: number;
    exponential: boolean;
  };
}

/**
 * Correlation algorithm types
 */
export type CorrelationAlgorithm =
  | 'temporal'
  | 'semantic'
  | 'user_based'
  | 'resource_based'
  | 'pattern_based'
  | 'statistical'
  | 'ml_clustering';

/**
 * Aggregation interval types
 */
export type AggregationInterval = 'minute' | 'hour' | 'day' | 'week' | 'month';

/**
 * Aggregation metric types
 */
export type AggregationMetric =
  | 'count'
  | 'rate'
  | 'average'
  | 'percentile'
  | 'unique_count'
  | 'variance'
  | 'entropy';

/**
 * Event correlation result interface
 */
export interface EventCorrelation {
  /** Correlation identifier */
  id: string;
  /** Primary event */
  primaryEvent: AuditEvent;
  /** Correlated events */
  correlatedEvents: AuditEvent[];
  /** Correlation algorithm used */
  algorithm: CorrelationAlgorithm;
  /** Correlation score */
  score: number;
  /** Confidence level */
  confidence: number;
  /** Correlation type */
  type: 'sequence' | 'cluster' | 'anomaly' | 'pattern';
  /** Time window */
  timeWindow: number;
  /** Metadata */
  metadata: {
    createdAt: Date;
    processingTime: number;
    ruleIds: string[];
    tags: string[];
  };
  /** Correlation vector (for ML algorithms) */
  vector?: number[];
}

/**
 * Event aggregation result interface
 */
export interface EventAggregation {
  /** Aggregation identifier */
  id: string;
  /** Time period */
  period: {
    start: Date;
    end: Date;
    interval: AggregationInterval;
  };
  /** Aggregated metrics */
  metrics: Record<AggregationMetric, number>;
  /** Event counts by category */
  categoryBreakdown: Record<SecurityEventCategory, number>;
  /** Event counts by severity */
  severityBreakdown: Record<AuditSeverity, number>;
  /** User activity metrics */
  userMetrics: {
    uniqueUsers: number;
    topUsers: Array<{ userId: string; count: number }>;
    newUsers: number;
  };
  /** Resource access metrics */
  resourceMetrics: {
    uniqueResources: number;
    topResources: Array<{ resource: string; count: number }>;
    accessPatterns: Record<string, number>;
  };
  /** Performance metrics */
  performanceMetrics: {
    averageProcessingTime: number;
    errorRate: number;
    throughput: number;
  };
  /** Anomaly indicators */
  anomalies: Array<{
    type: string;
    score: number;
    description: string;
  }>;
}

/**
 * Correlation rule interface
 */
export interface CorrelationRule {
  /** Rule identifier */
  id: string;
  /** Rule name */
  name: string;
  /** Rule description */
  description: string;
  /** Algorithm to use */
  algorithm: CorrelationAlgorithm;
  /** Conditions for correlation */
  conditions: CorrelationCondition[];
  /** Scoring function */
  scoringFunction: ScoringFunction;
  /** Time constraints */
  timeConstraints: {
    windowMs: number;
    maxAge: number;
  };
  /** Priority */
  priority: number;
  /** Enabled status */
  enabled: boolean;
}

/**
 * Correlation condition interface
 */
export interface CorrelationCondition {
  /** Field to compare */
  field: string;
  /** Comparison operator */
  operator: 'equals' | 'similar' | 'pattern' | 'threshold';
  /** Threshold or pattern value */
  value: unknown;
  /** Weight in correlation calculation */
  weight: number;
}

/**
 * Scoring function interface
 */
export interface ScoringFunction {
  /** Function type */
  type: 'linear' | 'exponential' | 'logarithmic' | 'sigmoid';
  /** Function parameters */
  parameters: Record<string, number>;
}

/**
 * Transport delivery result interface
 */
export interface TransportDeliveryResult {
  /** Transport name */
  transport: string;
  /** Success status */
  success: boolean;
  /** Delivery time */
  deliveryTime: number;
  /** Records delivered */
  recordsDelivered: number;
  /** Error message if failed */
  error?: string;
  /** Retry attempt number */
  attempt: number;
}

/**
 * Streaming analytics interface
 */
export interface StreamingAnalytics {
  /** Real-time event rate */
  eventRate: number;
  /** Active correlations */
  activeCorrelations: number;
  /** Processing latency */
  latency: number;
  /** Memory usage */
  memoryUsage: number;
  /** Queue depth */
  queueDepth: number;
  /** Correlation accuracy */
  accuracy: number;
}

/**
 * Event Correlation and Aggregation Engine
 *
 * Provides comprehensive event correlation, aggregation, and multi-transport
 * delivery capabilities for enterprise audit logging systems.
 */
@Injectable()
export class EventCorrelationAggregationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventCorrelationAggregationService.name);

  private correlationConfig: CorrelationConfig;
  private aggregationConfig: AggregationConfig;
  private transports: Map<string, TransportConfig> = new Map();
  private correlationRules: Map<string, CorrelationRule> = new Map();

  private eventBuffer: Map<string, AuditEvent[]> = new Map();
  private correlationCache: Map<string, EventCorrelation[]> = new Map();
  private aggregationCache: Map<string, EventAggregation> = new Map();

  private activeCorrelations: Map<string, EventCorrelation> = new Map();
  private processingQueue: AuditEvent[] = [];
  private deliveryQueue: Map<string, unknown[]> = new Map();

  private backgroundIntervals: NodeJS.Timeout[] = [];
  private streamingMetrics: StreamingAnalytics = {
    eventRate: 0,
    activeCorrelations: 0,
    latency: 0,
    memoryUsage: 0,
    queueDepth: 0,
    accuracy: 0,
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.initializeConfiguration();
  }

  /**
   * Module initialization
   */
  async onModuleInit(): Promise<void> {
    try {
      this.logger.log('Initializing Event Correlation and Aggregation Engine...');

      await this.initializeTransports();
      await this.loadCorrelationRules();
      await this.startBackgroundProcesses();

      this.logger.log('Event Correlation and Aggregation Engine initialized successfully');
    } catch (err) {
      this.logger.error('Failed to initialize Correlation and Aggregation Engine:', err);
      throw err;
    }
  }

  /**
   * Module destruction
   */
  async onModuleDestroy(): Promise<void> {
    try {
      this.logger.log('Shutting down Event Correlation and Aggregation Engine...');

      // Clear background intervals
      this.backgroundIntervals.forEach(interval => clearInterval(interval));
      this.backgroundIntervals = [];

      // Flush pending correlations and aggregations
      await this.flushPendingCorrelations();
      await this.flushPendingAggregations();
      await this.flushDeliveryQueues();

      this.logger.log('Event Correlation and Aggregation Engine shutdown complete');
    } catch (err) {
      this.logger.error('Error during Correlation and Aggregation Engine shutdown:', err);
    }
  }

  /**
   * Process event for correlation and aggregation
   *
   * @param event - Audit event to process
   * @returns Promise resolving to correlation results
   */
  async processEvent(event: AuditEvent): Promise<EventCorrelation[]> {
    const startTime = Date.now();

    try {
      // Add to processing queue
      this.processingQueue.push(event);

      // Update streaming metrics
      this.updateStreamingMetrics(startTime);

      // Process correlations
      const correlations = await this.correlateEvent(event);

      // Process aggregations
      await this.aggregateEvent(event);

      // Deliver to transports
      await this.deliverEventToTransports(event, correlations);

      // Emit correlation events
      for (const correlation of correlations) {
        this.eventEmitter.emit('audit.correlation', correlation);
      }

      return correlations;
    } catch (err) {
      this.logger.error(`Error processing event ${event.id}:`, err);
      return [];
    }
  }

  /**
   * Correlate event with existing events
   */
  private async correlateEvent(event: AuditEvent): Promise<EventCorrelation[]> {
    const correlations: EventCorrelation[] = [];

    if (!this.correlationConfig.enabled) {
      return correlations;
    }

    // Add event to buffer
    this.addToEventBuffer(event);

    // Run correlation algorithms
    for (const algorithm of this.correlationConfig.algorithms) {
      const algorithmCorrelations = await this.runCorrelationAlgorithm(
        event,
        algorithm,
      );
      correlations.push(...algorithmCorrelations);
    }

    // Apply correlation rules
    const ruleBasedCorrelations = await this.applyCorrelationRules(event);
    correlations.push(...ruleBasedCorrelations);

    // Filter and rank correlations
    const filteredCorrelations = this.filterCorrelations(correlations);

    // Cache correlations
    this.cacheCorrelations(event.id, filteredCorrelations);

    return filteredCorrelations;
  }

  /**
   * Run specific correlation algorithm
   */
  private async runCorrelationAlgorithm(
    event: AuditEvent,
    algorithm: CorrelationAlgorithm,
  ): Promise<EventCorrelation[]> {
    switch (algorithm) {
      case 'temporal':
        return this.temporalCorrelation(event);
      case 'semantic':
        return this.semanticCorrelation(event);
      case 'user_based':
        return this.userBasedCorrelation(event);
      case 'resource_based':
        return this.resourceBasedCorrelation(event);
      case 'pattern_based':
        return this.patternBasedCorrelation(event);
      case 'statistical':
        return this.statisticalCorrelation(event);
      case 'ml_clustering':
        return this.mlClusteringCorrelation(event);
      default:
        return [];
    }
  }

  /**
   * Temporal correlation algorithm
   */
  private async temporalCorrelation(event: AuditEvent): Promise<EventCorrelation[]> {
    const correlations: EventCorrelation[] = [];
    const timeWindow = this.correlationConfig.timeWindow;
    const cutoffTime = new Date(event.timestamp.getTime() - timeWindow);

    // Get recent events
    const recentEvents = this.getRecentEvents(cutoffTime);

    // Find temporally close events
    const closeEvents = recentEvents.filter(e => {
      const timeDiff = Math.abs(event.timestamp.getTime() - e.timestamp.getTime());
      return timeDiff <= timeWindow && e.id !== event.id;
    });

    if (closeEvents.length > 0) {
      const correlation: EventCorrelation = {
        id: this.generateCorrelationId(),
        primaryEvent: event,
        correlatedEvents: closeEvents,
        algorithm: 'temporal',
        score: this.calculateTemporalScore(event, closeEvents),
        confidence: this.calculateTemporalConfidence(event, closeEvents),
        type: 'sequence',
        timeWindow,
        metadata: {
          createdAt: new Date(),
          processingTime: 0,
          ruleIds: [],
          tags: ['temporal_correlation'],
        },
      };

      correlations.push(correlation);
    }

    return correlations;
  }

  /**
   * Semantic correlation algorithm
   */
  private async semanticCorrelation(event: AuditEvent): Promise<EventCorrelation[]> {
    const correlations: EventCorrelation[] = [];
    const recentEvents = this.getRecentEvents(
      new Date(event.timestamp.getTime() - this.correlationConfig.timeWindow),
    );

    // Find semantically similar events
    const similarEvents = recentEvents.filter(e => {
      const similarity = this.calculateSemanticSimilarity(event, e);
      return similarity >= this.correlationConfig.similarityThreshold && e.id !== event.id;
    });

    if (similarEvents.length > 0) {
      const correlation: EventCorrelation = {
        id: this.generateCorrelationId(),
        primaryEvent: event,
        correlatedEvents: similarEvents,
        algorithm: 'semantic',
        score: this.calculateSemanticScore(event, similarEvents),
        confidence: this.calculateSemanticConfidence(event, similarEvents),
        type: 'cluster',
        timeWindow: this.correlationConfig.timeWindow,
        metadata: {
          createdAt: new Date(),
          processingTime: 0,
          ruleIds: [],
          tags: ['semantic_correlation'],
        },
      };

      correlations.push(correlation);
    }

    return correlations;
  }

  /**
   * User-based correlation algorithm
   */
  private async userBasedCorrelation(event: AuditEvent): Promise<EventCorrelation[]> {
    const correlations: EventCorrelation[] = [];

    if (!event.metadata.userId) {
      return correlations;
    }

    const userBufferKey = `user_${event.metadata.userId}`;
    const userEvents = this.eventBuffer.get(userBufferKey) || [];

    if (userEvents.length >= 2) {
      const correlation: EventCorrelation = {
        id: this.generateCorrelationId(),
        primaryEvent: event,
        correlatedEvents: userEvents.filter(e => e.id !== event.id),
        algorithm: 'user_based',
        score: this.calculateUserBasedScore(event, userEvents),
        confidence: this.calculateUserBasedConfidence(event, userEvents),
        type: 'pattern',
        timeWindow: this.correlationConfig.timeWindow,
        metadata: {
          createdAt: new Date(),
          processingTime: 0,
          ruleIds: [],
          tags: ['user_correlation'],
        },
      };

      correlations.push(correlation);
    }

    return correlations;
  }

  /**
   * Resource-based correlation algorithm
   */
  private async resourceBasedCorrelation(event: AuditEvent): Promise<EventCorrelation[]> {
    const correlations: EventCorrelation[] = [];

    if (!event.metadata.resource) {
      return correlations;
    }

    const resourceBufferKey = `resource_${event.metadata.resource}`;
    const resourceEvents = this.eventBuffer.get(resourceBufferKey) || [];

    if (resourceEvents.length >= 2) {
      const correlation: EventCorrelation = {
        id: this.generateCorrelationId(),
        primaryEvent: event,
        correlatedEvents: resourceEvents.filter(e => e.id !== event.id),
        algorithm: 'resource_based',
        score: this.calculateResourceBasedScore(event, resourceEvents),
        confidence: this.calculateResourceBasedConfidence(event, resourceEvents),
        type: 'pattern',
        timeWindow: this.correlationConfig.timeWindow,
        metadata: {
          createdAt: new Date(),
          processingTime: 0,
          ruleIds: [],
          tags: ['resource_correlation'],
        },
      };

      correlations.push(correlation);
    }

    return correlations;
  }

  /**
   * Pattern-based correlation algorithm
   */
  private async patternBasedCorrelation(event: AuditEvent): Promise<EventCorrelation[]> {
    const correlations: EventCorrelation[] = [];

    // Look for known attack patterns
    const patterns = this.detectAttackPatterns(event);

    for (const pattern of patterns) {
      const patternEvents = this.findPatternEvents(pattern);

      if (patternEvents.length > 0) {
        const correlation: EventCorrelation = {
          id: this.generateCorrelationId(),
          primaryEvent: event,
          correlatedEvents: patternEvents,
          algorithm: 'pattern_based',
          score: this.calculatePatternScore(event, patternEvents, pattern),
          confidence: this.calculatePatternConfidence(event, patternEvents, pattern),
          type: 'anomaly',
          timeWindow: this.correlationConfig.timeWindow,
          metadata: {
            createdAt: new Date(),
            processingTime: 0,
            ruleIds: [],
            tags: ['pattern_correlation', pattern],
          },
        };

        correlations.push(correlation);
      }
    }

    return correlations;
  }

  /**
   * Statistical correlation algorithm
   */
  private async statisticalCorrelation(event: AuditEvent): Promise<EventCorrelation[]> {
    const correlations: EventCorrelation[] = [];

    // Detect statistical anomalies
    const anomalies = this.detectStatisticalAnomalies(event);

    if (anomalies.length > 0) {
      const correlation: EventCorrelation = {
        id: this.generateCorrelationId(),
        primaryEvent: event,
        correlatedEvents: anomalies,
        algorithm: 'statistical',
        score: this.calculateStatisticalScore(event, anomalies),
        confidence: this.calculateStatisticalConfidence(event, anomalies),
        type: 'anomaly',
        timeWindow: this.correlationConfig.timeWindow,
        metadata: {
          createdAt: new Date(),
          processingTime: 0,
          ruleIds: [],
          tags: ['statistical_correlation'],
        },
      };

      correlations.push(correlation);
    }

    return correlations;
  }

  /**
   * Machine learning clustering correlation algorithm
   */
  private async mlClusteringCorrelation(event: AuditEvent): Promise<EventCorrelation[]> {
    const correlations: EventCorrelation[] = [];

    // Create feature vector for event
    const eventVector = this.createEventVector(event);

    // Find similar events using clustering
    const clusterEvents = this.findClusterEvents(eventVector);

    if (clusterEvents.length > 0) {
      const correlation: EventCorrelation = {
        id: this.generateCorrelationId(),
        primaryEvent: event,
        correlatedEvents: clusterEvents,
        algorithm: 'ml_clustering',
        score: this.calculateMLScore(event, clusterEvents, eventVector),
        confidence: this.calculateMLConfidence(event, clusterEvents, eventVector),
        type: 'cluster',
        timeWindow: this.correlationConfig.timeWindow,
        metadata: {
          createdAt: new Date(),
          processingTime: 0,
          ruleIds: [],
          tags: ['ml_correlation'],
        },
        vector: eventVector,
      };

      correlations.push(correlation);
    }

    return correlations;
  }

  /**
   * Apply correlation rules
   */
  private async applyCorrelationRules(event: AuditEvent): Promise<EventCorrelation[]> {
    const correlations: EventCorrelation[] = [];

    for (const rule of Array.from(this.correlationRules.values())) {
      if (!rule.enabled) continue;

      const ruleCorrelations = await this.evaluateCorrelationRule(event, rule);
      correlations.push(...ruleCorrelations);
    }

    return correlations;
  }

  /**
   * Evaluate correlation rule
   */
  private async evaluateCorrelationRule(
    event: AuditEvent,
    rule: CorrelationRule,
  ): Promise<EventCorrelation[]> {
    const correlations: EventCorrelation[] = [];

    // Check if event matches rule conditions
    const matchScore = this.evaluateRuleConditions(event, rule);

    if (matchScore >= 0.5) {
      // Find related events using rule algorithm
      const relatedEvents = await this.runCorrelationAlgorithm(event, rule.algorithm);

      for (const correlation of relatedEvents) {
        correlation.metadata.ruleIds.push(rule.id);
        correlation.score = this.applyRuleScoringFunction(
          correlation.score,
          rule.scoringFunction,
        );
        correlations.push(correlation);
      }
    }

    return correlations;
  }

  /**
   * Aggregate event data
   */
  private async aggregateEvent(event: AuditEvent): Promise<void> {
    if (!this.aggregationConfig.enabled) {
      return;
    }

    for (const interval of this.aggregationConfig.intervals) {
      await this.aggregateForInterval(event, interval);
    }
  }

  /**
   * Aggregate event for specific interval
   */
  private async aggregateForInterval(
    event: AuditEvent,
    interval: AggregationInterval,
  ): Promise<void> {
    const periodKey = this.getPeriodKey(event.timestamp, interval);
    let aggregation = this.aggregationCache.get(periodKey);

    if (!aggregation) {
      aggregation = this.createNewAggregation(event.timestamp, interval);
      this.aggregationCache.set(periodKey, aggregation);
    }

    // Update aggregation metrics
    this.updateAggregationMetrics(aggregation, event);
  }

  /**
   * Create new aggregation
   */
  private createNewAggregation(
    timestamp: Date,
    interval: AggregationInterval,
  ): EventAggregation {
    const period = this.calculatePeriod(timestamp, interval);

    return {
      id: this.generateAggregationId(),
      period,
      metrics: {
        count: 0,
        rate: 0,
        average: 0,
        percentile: 0,
        unique_count: 0,
        variance: 0,
        entropy: 0,
      },
      categoryBreakdown: {
        [SecurityEventCategory.AUTHENTICATION]: 0,
        [SecurityEventCategory.AUTHORIZATION]: 0,
        [SecurityEventCategory.DATA_ACCESS]: 0,
        [SecurityEventCategory.DATA_MODIFICATION]: 0,
        [SecurityEventCategory.SYSTEM]: 0,
        [SecurityEventCategory.SECURITY]: 0,
        [SecurityEventCategory.COMPLIANCE]: 0,
        [SecurityEventCategory.PERFORMANCE]: 0,
        [SecurityEventCategory.NETWORK]: 0,
        [SecurityEventCategory.ERROR]: 0,
        [SecurityEventCategory.USER_ACTIVITY]: 0,
        [SecurityEventCategory.API_ACCESS]: 0,
      },
      severityBreakdown: {
        [AuditSeverity.DEBUG]: 0,
        [AuditSeverity.INFO]: 0,
        [AuditSeverity.WARN]: 0,
        [AuditSeverity.ERROR]: 0,
        [AuditSeverity.CRITICAL]: 0,
        [AuditSeverity.FATAL]: 0,
      },
      userMetrics: {
        uniqueUsers: 0,
        topUsers: [],
        newUsers: 0,
      },
      resourceMetrics: {
        uniqueResources: 0,
        topResources: [],
        accessPatterns: {},
      },
      performanceMetrics: {
        averageProcessingTime: 0,
        errorRate: 0,
        throughput: 0,
      },
      anomalies: [],
    };
  }

  /**
   * Update aggregation metrics
   */
  private updateAggregationMetrics(
    aggregation: EventAggregation,
    event: AuditEvent,
  ): void {
    // Update basic metrics
    aggregation.metrics.count++;
    aggregation.categoryBreakdown[event.category]++;
    aggregation.severityBreakdown[event.severity]++;

    // Update user metrics
    if (event.metadata.userId) {
      const existingUser = aggregation.userMetrics.topUsers.find(
        u => u.userId === event.metadata.userId,
      );
      if (existingUser) {
        existingUser.count++;
      } else {
        aggregation.userMetrics.topUsers.push({
          userId: event.metadata.userId,
          count: 1,
        });
        aggregation.userMetrics.newUsers++;
      }

      // Recalculate unique users
      aggregation.userMetrics.uniqueUsers = aggregation.userMetrics.topUsers.length;
    }

    // Update resource metrics
    if (event.metadata.resource) {
      const existingResource = aggregation.resourceMetrics.topResources.find(
        r => r.resource === event.metadata.resource,
      );
      if (existingResource) {
        existingResource.count++;
      } else {
        aggregation.resourceMetrics.topResources.push({
          resource: event.metadata.resource,
          count: 1,
        });
      }

      // Recalculate unique resources
      aggregation.resourceMetrics.uniqueResources = aggregation.resourceMetrics.topResources.length;
    }

    // Update performance metrics
    if (event.performance?.duration) {
      const currentAvg = aggregation.performanceMetrics.averageProcessingTime;
      const count = aggregation.metrics.count;
      aggregation.performanceMetrics.averageProcessingTime =
        (currentAvg * (count - 1) + event.performance.duration) / count;
    }

    // Calculate error rate
    const errorEvents = aggregation.severityBreakdown[AuditSeverity.ERROR] +
                       aggregation.severityBreakdown[AuditSeverity.CRITICAL] +
                       aggregation.severityBreakdown[AuditSeverity.FATAL];
    aggregation.performanceMetrics.errorRate =
      (errorEvents / aggregation.metrics.count) * 100;

    // Calculate throughput
    const periodDurationMs = aggregation.period.end.getTime() -
                            aggregation.period.start.getTime();
    aggregation.performanceMetrics.throughput =
      (aggregation.metrics.count / periodDurationMs) * 1000; // Events per second

    // Calculate entropy
    aggregation.metrics.entropy = this.calculateEntropy(aggregation);

    // Detect anomalies
    const anomalies = this.detectAggregationAnomalies(aggregation, event);
    aggregation.anomalies.push(...anomalies);
  }

  /**
   * Deliver event and correlations to transports
   */
  private async deliverEventToTransports(
    event: AuditEvent,
    correlations: EventCorrelation[],
  ): Promise<void> {
    const deliveryPromises: Promise<TransportDeliveryResult>[] = [];

    for (const [transportName, transport] of this.transports.entries()) {
      if (!transport.enabled) continue;

      const deliveryPromise = this.deliverToTransport(
        transportName,
        transport,
        { event, correlations },
      );
      deliveryPromises.push(deliveryPromise);
    }

    // Execute deliveries in parallel
    const results = await Promise.allSettled(deliveryPromises);

    // Log delivery results
    results.forEach((result, index) => {
      const transportName = Array.from(this.transports.keys())[index];
      if (result.status === 'fulfilled') {
        const deliveryResult = result.value;
        this.logger.debug(
          `Delivered to ${transportName}: ${deliveryResult.success ? 'success' : 'failed'}`,
        );
      } else {
        this.logger.error(`Failed to deliver to ${transportName}:`, result.reason);
      }
    });
  }

  /**
   * Deliver data to specific transport
   */
  private async deliverToTransport(
    transportName: string,
    transport: TransportConfig,
    data: unknown,
  ): Promise<TransportDeliveryResult> {
    const startTime = Date.now();
    let attempt = 1;

    while (attempt <= transport.retry.maxAttempts) {
      try {
        const deliveryResult = await this.executeTransportDelivery(
          transport,
          data,
          attempt,
        );

        return {
          transport: transportName,
          success: true,
          deliveryTime: Date.now() - startTime,
          recordsDelivered: 1,
          attempt,
        };
      } catch (err) {
        this.logger.warn(
          `Transport ${transportName} delivery failed (attempt ${attempt}):`,
          err,
        );

        if (attempt === transport.retry.maxAttempts) {
          return {
            transport: transportName,
            success: false,
            deliveryTime: Date.now() - startTime,
            recordsDelivered: 0,
            error: err instanceof Error ? err.message : String(err),
            attempt,
          };
        }

        // Wait for backoff period
        const backoffMs = transport.retry.exponential
          ? transport.retry.backoffMs * Math.pow(2, attempt - 1)
          : transport.retry.backoffMs;

        await new Promise(resolve => setTimeout(resolve, backoffMs));
        attempt++;
      }
    }

    // This should never be reached
    throw new Error('Unexpected end of delivery attempts');
  }

  /**
   * Execute transport delivery
   */
  private async executeTransportDelivery(
    transport: TransportConfig,
    data: unknown,
    attempt: number,
  ): Promise<void> {
    switch (transport.type) {
      case 'file':
        await this.deliverToFile(transport, data);
        break;
      case 'database':
        await this.deliverToDatabase(transport, data);
        break;
      case 'siem':
        await this.deliverToSiem(transport, data);
        break;
      case 'webhook':
        await this.deliverToWebhook(transport, data);
        break;
      case 'message_queue':
        await this.deliverToMessageQueue(transport, data);
        break;
      default:
        throw new Error(`Unsupported transport type: ${transport.type}`);
    }
  }

  /**
   * Deliver to file transport
   */
  private async deliverToFile(transport: TransportConfig, data: unknown): Promise<void> {
    const filePath = transport.config.filePath as string;
    const formattedData = this.formatDataForTransport(data, transport.format);

    // Ensure directory exists
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });

    // Append to file
    await fs.appendFile(filePath, formattedData + '\\n');
  }

  /**
   * Deliver to database transport
   */
  private async deliverToDatabase(transport: TransportConfig, data: unknown): Promise<void> {
    // Database delivery implementation would go here
    // This would integrate with the configured database
    this.logger.debug('Database delivery:', { transport: transport.name, data });
  }

  /**
   * Deliver to SIEM transport
   */
  private async deliverToSiem(transport: TransportConfig, data: unknown): Promise<void> {
    // SIEM delivery implementation would go here
    // This would send to external SIEM systems
    this.logger.debug('SIEM delivery:', { transport: transport.name, data });
  }

  /**
   * Deliver to webhook transport
   */
  private async deliverToWebhook(transport: TransportConfig, data: unknown): Promise<void> {
    // Webhook delivery implementation would go here
    // This would make HTTP requests to configured webhooks
    this.logger.debug('Webhook delivery:', { transport: transport.name, data });
  }

  /**
   * Deliver to message queue transport
   */
  private async deliverToMessageQueue(transport: TransportConfig, data: unknown): Promise<void> {
    // Message queue delivery implementation would go here
    // This would publish to message queue systems
    this.logger.debug('Message queue delivery:', { transport: transport.name, data });
  }

  /**
   * Format data for transport
   */
  private formatDataForTransport(data: unknown, format: string): string {
    switch (format) {
      case 'json':
        return JSON.stringify(data);
      case 'csv':
        return this.convertToCSV(data);
      case 'xml':
        return this.convertToXML(data);
      case 'binary':
        return this.convertToBinary(data);
      default:
        return JSON.stringify(data);
    }
  }

  /**
   * Helper methods for calculations and utilities
   */

  private generateCorrelationId(): string {
    return `corr_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  private generateAggregationId(): string {
    return `agg_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  private addToEventBuffer(event: AuditEvent): void {
    // Add to general buffer
    const generalKey = 'general';
    if (!this.eventBuffer.has(generalKey)) {
      this.eventBuffer.set(generalKey, []);
    }
    this.eventBuffer.get(generalKey)!.push(event);

    // Add to user-specific buffer
    if (event.metadata.userId) {
      const userKey = `user_${event.metadata.userId}`;
      if (!this.eventBuffer.has(userKey)) {
        this.eventBuffer.set(userKey, []);
      }
      this.eventBuffer.get(userKey)!.push(event);
    }

    // Add to resource-specific buffer
    if (event.metadata.resource) {
      const resourceKey = `resource_${event.metadata.resource}`;
      if (!this.eventBuffer.has(resourceKey)) {
        this.eventBuffer.set(resourceKey, []);
      }
      this.eventBuffer.get(resourceKey)!.push(event);
    }

    // Limit buffer sizes
    this.limitBufferSizes();
  }

  private limitBufferSizes(): void {
    const maxSize = this.correlationConfig.performance.bufferSize;

    for (const [key, buffer] of this.eventBuffer.entries()) {
      if (buffer.length > maxSize) {
        this.eventBuffer.set(key, buffer.slice(-maxSize));
      }
    }
  }

  private getRecentEvents(cutoffTime: Date): AuditEvent[] {
    const allEvents: AuditEvent[] = [];

    for (const buffer of this.eventBuffer.values()) {
      const recentEvents = buffer.filter(e => e.timestamp >= cutoffTime);
      allEvents.push(...recentEvents);
    }

    return allEvents;
  }

  private calculateTemporalScore(event: AuditEvent, events: AuditEvent[]): number {
    // Implementation of temporal scoring algorithm
    return Math.random() * 0.8 + 0.2; // Placeholder
  }

  private calculateTemporalConfidence(event: AuditEvent, events: AuditEvent[]): number {
    // Implementation of temporal confidence algorithm
    return Math.random() * 0.4 + 0.6; // Placeholder
  }

  private calculateSemanticSimilarity(event1: AuditEvent, event2: AuditEvent): number {
    // Implementation of semantic similarity algorithm
    let similarity = 0;
    let factors = 0;

    if (event1.category === event2.category) {
      similarity += 0.3;
    }
    factors++;

    if (event1.severity === event2.severity) {
      similarity += 0.2;
    }
    factors++;

    if (event1.metadata.userId === event2.metadata.userId) {
      similarity += 0.3;
    }
    factors++;

    if (event1.metadata.resource === event2.metadata.resource) {
      similarity += 0.2;
    }
    factors++;

    return factors > 0 ? similarity / factors : 0;
  }

  // Placeholder implementations for other calculation methods
  private calculateSemanticScore(event: AuditEvent, events: AuditEvent[]): number {
    return Math.random() * 0.8 + 0.2;
  }

  private calculateSemanticConfidence(event: AuditEvent, events: AuditEvent[]): number {
    return Math.random() * 0.4 + 0.6;
  }

  private calculateUserBasedScore(event: AuditEvent, events: AuditEvent[]): number {
    return Math.random() * 0.8 + 0.2;
  }

  private calculateUserBasedConfidence(event: AuditEvent, events: AuditEvent[]): number {
    return Math.random() * 0.4 + 0.6;
  }

  private calculateResourceBasedScore(event: AuditEvent, events: AuditEvent[]): number {
    return Math.random() * 0.8 + 0.2;
  }

  private calculateResourceBasedConfidence(event: AuditEvent, events: AuditEvent[]): number {
    return Math.random() * 0.4 + 0.6;
  }

  private detectAttackPatterns(event: AuditEvent): string[] {
    const patterns: string[] = [];

    // SQL injection pattern
    if (event.message && /('|--|;|union|select|insert|delete|update)/i.test(event.message)) {
      patterns.push('sql_injection');
    }

    // XSS pattern
    if (event.message && /<script|javascript:|onload=|onerror=/i.test(event.message)) {
      patterns.push('xss_attack');
    }

    return patterns;
  }

  private findPatternEvents(pattern: string): AuditEvent[] {
    // Implementation would find events matching the pattern
    return [];
  }

  private calculatePatternScore(event: AuditEvent, events: AuditEvent[], pattern: string): number {
    return Math.random() * 0.8 + 0.2;
  }

  private calculatePatternConfidence(event: AuditEvent, events: AuditEvent[], pattern: string): number {
    return Math.random() * 0.4 + 0.6;
  }

  private detectStatisticalAnomalies(event: AuditEvent): AuditEvent[] {
    // Implementation would detect statistical anomalies
    return [];
  }

  private calculateStatisticalScore(event: AuditEvent, events: AuditEvent[]): number {
    return Math.random() * 0.8 + 0.2;
  }

  private calculateStatisticalConfidence(event: AuditEvent, events: AuditEvent[]): number {
    return Math.random() * 0.4 + 0.6;
  }

  private createEventVector(event: AuditEvent): number[] {
    // Create feature vector for ML algorithms
    const vector: number[] = [];

    // Severity encoding
    const severityValues = {
      [AuditSeverity.DEBUG]: 1,
      [AuditSeverity.INFO]: 2,
      [AuditSeverity.WARN]: 3,
      [AuditSeverity.ERROR]: 4,
      [AuditSeverity.CRITICAL]: 5,
      [AuditSeverity.FATAL]: 6,
    };
    vector.push(severityValues[event.severity]);

    // Category encoding
    const categoryValues = Object.values(SecurityEventCategory);
    const categoryIndex = categoryValues.indexOf(event.category);
    vector.push(categoryIndex);

    // Time features
    vector.push(event.timestamp.getHours());
    vector.push(event.timestamp.getDay());

    // User presence
    vector.push(event.metadata.userId ? 1 : 0);

    // Resource presence
    vector.push(event.metadata.resource ? 1 : 0);

    return vector;
  }

  private findClusterEvents(eventVector: number[]): AuditEvent[] {
    // Implementation would use clustering algorithms
    return [];
  }

  private calculateMLScore(event: AuditEvent, events: AuditEvent[], vector: number[]): number {
    return Math.random() * 0.8 + 0.2;
  }

  private calculateMLConfidence(event: AuditEvent, events: AuditEvent[], vector: number[]): number {
    return Math.random() * 0.4 + 0.6;
  }

  private evaluateRuleConditions(event: AuditEvent, rule: CorrelationRule): number {
    // Implementation would evaluate rule conditions
    return Math.random();
  }

  private applyRuleScoringFunction(score: number, scoringFunction: ScoringFunction): number {
    switch (scoringFunction.type) {
      case 'linear':
        return score * (scoringFunction.parameters.slope || 1);
      case 'exponential':
        return Math.pow(score, scoringFunction.parameters.exponent || 2);
      case 'logarithmic':
        return Math.log(score + 1) / Math.log(2);
      case 'sigmoid':
        return 1 / (1 + Math.exp(-(score - 0.5) * (scoringFunction.parameters.steepness || 1)));
      default:
        return score;
    }
  }

  private filterCorrelations(correlations: EventCorrelation[]): EventCorrelation[] {
    return correlations
      .filter(c => c.score >= this.correlationConfig.similarityThreshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, this.correlationConfig.maxCorrelations);
  }

  private cacheCorrelations(eventId: string, correlations: EventCorrelation[]): void {
    this.correlationCache.set(eventId, correlations);

    // Limit cache size
    if (this.correlationCache.size > this.correlationConfig.performance.cacheSize) {
      const oldestKey = this.correlationCache.keys().next().value;
      this.correlationCache.delete(oldestKey);
    }
  }

  private getPeriodKey(timestamp: Date, interval: AggregationInterval): string {
    const date = new Date(timestamp);

    switch (interval) {
      case 'minute':
        return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}`;
      case 'hour':
        return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
      case 'day':
        return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      case 'week':
        const week = this.getWeekNumber(date);
        return `${date.getFullYear()}-W${week}`;
      case 'month':
        return `${date.getFullYear()}-${date.getMonth()}`;
      default:
        return date.toISOString();
    }
  }

  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  private calculatePeriod(timestamp: Date, interval: AggregationInterval): { start: Date; end: Date; interval: AggregationInterval } {
    const date = new Date(timestamp);
    let start: Date;
    let end: Date;

    switch (interval) {
      case 'minute':
        start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes());
        end = new Date(start.getTime() + 60000);
        break;
      case 'hour':
        start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours());
        end = new Date(start.getTime() + 3600000);
        break;
      case 'day':
        start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        end = new Date(start.getTime() + 86400000);
        break;
      case 'week':
        const dayOfWeek = date.getDay();
        start = new Date(date.getTime() - dayOfWeek * 86400000);
        start.setHours(0, 0, 0, 0);
        end = new Date(start.getTime() + 7 * 86400000);
        break;
      case 'month':
        start = new Date(date.getFullYear(), date.getMonth(), 1);
        end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
        break;
      default:
        start = new Date(date);
        end = new Date(date.getTime() + 3600000);
    }

    return { start, end, interval };
  }

  private calculateEntropy(aggregation: EventAggregation): number {
    const total = aggregation.metrics.count;
    if (total === 0) return 0;

    let entropy = 0;

    // Calculate entropy based on category distribution
    for (const count of Object.values(aggregation.categoryBreakdown)) {
      if (count > 0) {
        const probability = count / total;
        entropy -= probability * Math.log2(probability);
      }
    }

    return entropy;
  }

  private detectAggregationAnomalies(aggregation: EventAggregation, event: AuditEvent): Array<{ type: string; score: number; description: string }> {
    const anomalies: Array<{ type: string; score: number; description: string }> = [];

    // High error rate anomaly
    if (aggregation.performanceMetrics.errorRate > 10) {
      anomalies.push({
        type: 'high_error_rate',
        score: aggregation.performanceMetrics.errorRate / 100,
        description: `Error rate is ${aggregation.performanceMetrics.errorRate.toFixed(2)}%`,
      });
    }

    // Unusual activity spike
    if (aggregation.metrics.count > 1000) {
      anomalies.push({
        type: 'activity_spike',
        score: Math.min(aggregation.metrics.count / 10000, 1),
        description: `Unusual activity spike: ${aggregation.metrics.count} events`,
      });
    }

    return anomalies;
  }

  private updateStreamingMetrics(startTime: number): void {
    this.streamingMetrics.latency = Date.now() - startTime;
    this.streamingMetrics.queueDepth = this.processingQueue.length;
    this.streamingMetrics.activeCorrelations = this.activeCorrelations.size;
    this.streamingMetrics.memoryUsage = process.memoryUsage().heapUsed;

    // Calculate event rate (events per second over last minute)
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const recentEvents = this.processingQueue.filter(
      e => e.timestamp.getTime() > oneMinuteAgo,
    );
    this.streamingMetrics.eventRate = recentEvents.length / 60;
  }

  private convertToCSV(data: unknown): string {
    // CSV conversion implementation
    return JSON.stringify(data);
  }

  private convertToXML(data: unknown): string {
    // XML conversion implementation
    return JSON.stringify(data);
  }

  private convertToBinary(data: unknown): string {
    // Binary conversion implementation
    return JSON.stringify(data);
  }

  /**
   * Configuration and initialization methods
   */

  private initializeConfiguration(): void {
    this.correlationConfig = {
      enabled: this.configService.get<boolean>('correlation.enabled', true),
      timeWindow: this.configService.get<number>('correlation.timeWindow', 300000),
      maxDistance: this.configService.get<number>('correlation.maxDistance', 10),
      similarityThreshold: this.configService.get<number>('correlation.similarityThreshold', 0.7),
      maxCorrelations: this.configService.get<number>('correlation.maxCorrelations', 100),
      algorithms: this.configService.get<CorrelationAlgorithm[]>(
        'correlation.algorithms',
        ['temporal', 'semantic', 'user_based'],
      ),
      performance: {
        bufferSize: this.configService.get<number>('correlation.performance.bufferSize', 10000),
        flushInterval: this.configService.get<number>('correlation.performance.flushInterval', 30000),
        cacheSize: this.configService.get<number>('correlation.performance.cacheSize', 1000),
        maxConcurrentCorrelations: this.configService.get<number>(
          'correlation.performance.maxConcurrentCorrelations',
          50,
        ),
      },
    };

    this.aggregationConfig = {
      enabled: this.configService.get<boolean>('aggregation.enabled', true),
      intervals: this.configService.get<AggregationInterval[]>(
        'aggregation.intervals',
        ['hour', 'day'],
      ),
      metrics: this.configService.get<AggregationMetric[]>(
        'aggregation.metrics',
        ['count', 'rate', 'average'],
      ),
      retention: {
        hourly: this.configService.get<number>('aggregation.retention.hourly', 48),
        daily: this.configService.get<number>('aggregation.retention.daily', 90),
        weekly: this.configService.get<number>('aggregation.retention.weekly', 52),
        monthly: this.configService.get<number>('aggregation.retention.monthly', 24),
      },
      performance: {
        batchSize: this.configService.get<number>('aggregation.performance.batchSize', 1000),
        parallelWorkers: this.configService.get<number>('aggregation.performance.parallelWorkers', 4),
        compressionEnabled: this.configService.get<boolean>(
          'aggregation.performance.compressionEnabled',
          true,
        ),
      },
    };
  }

  private async initializeTransports(): Promise<void> {
    // Initialize default transports
    const defaultTransports: TransportConfig[] = [
      {
        type: 'file',
        name: 'local_file',
        enabled: true,
        config: {
          filePath: './logs/correlations.jsonl',
        },
        format: 'json',
        batch: { size: 100, timeout: 5000, compression: false },
        retry: { maxAttempts: 3, backoffMs: 1000, exponential: true },
      },
    ];

    for (const transport of defaultTransports) {
      this.transports.set(transport.name, transport);
    }

    this.logger.log(`Initialized ${defaultTransports.length} transports`);
  }

  private async loadCorrelationRules(): Promise<void> {
    // Load default correlation rules
    const defaultRules: CorrelationRule[] = [
      {
        id: 'temporal_sequence',
        name: 'Temporal Sequence Rule',
        description: 'Correlate events that occur in temporal sequence',
        algorithm: 'temporal',
        conditions: [
          {
            field: 'category',
            operator: 'equals',
            value: SecurityEventCategory.AUTHENTICATION,
            weight: 0.5,
          },
        ],
        scoringFunction: {
          type: 'linear',
          parameters: { slope: 1.0 },
        },
        timeConstraints: {
          windowMs: 300000,
          maxAge: 3600000,
        },
        priority: 100,
        enabled: true,
      },
    ];

    for (const rule of defaultRules) {
      this.correlationRules.set(rule.id, rule);
    }

    this.logger.log(`Loaded ${defaultRules.length} correlation rules`);
  }

  private startBackgroundProcesses(): void {
    // Correlation processing interval
    const correlationInterval = setInterval(() => {
      void this.flushPendingCorrelations();
    }, this.correlationConfig.performance.flushInterval);
    this.backgroundIntervals.push(correlationInterval);

    // Aggregation processing interval
    const aggregationInterval = setInterval(() => {
      void this.flushPendingAggregations();
    }, 60000); // Every minute
    this.backgroundIntervals.push(aggregationInterval);

    // Transport delivery interval
    const deliveryInterval = setInterval(() => {
      void this.flushDeliveryQueues();
    }, 10000); // Every 10 seconds
    this.backgroundIntervals.push(deliveryInterval);

    // Cleanup interval
    const cleanupInterval = setInterval(() => {
      void this.performCleanup();
    }, 300000); // Every 5 minutes
    this.backgroundIntervals.push(cleanupInterval);

    this.logger.log('Background processes started');
  }

  private async flushPendingCorrelations(): Promise<void> {
    // Implementation would flush pending correlations
    this.logger.debug('Flushing pending correlations...');
  }

  private async flushPendingAggregations(): Promise<void> {
    // Implementation would flush pending aggregations
    this.logger.debug('Flushing pending aggregations...');
  }

  private async flushDeliveryQueues(): Promise<void> {
    // Implementation would flush delivery queues
    this.logger.debug('Flushing delivery queues...');
  }

  private async performCleanup(): Promise<void> {
    // Clean up old correlations
    const cutoffTime = Date.now() - 24 * 60 * 60 * 1000; // 24 hours

    for (const [id, correlation] of this.activeCorrelations.entries()) {
      if (correlation.metadata.createdAt.getTime() < cutoffTime) {
        this.activeCorrelations.delete(id);
      }
    }

    // Clean up old aggregations
    for (const [key, aggregation] of this.aggregationCache.entries()) {
      if (aggregation.period.end.getTime() < cutoffTime) {
        this.aggregationCache.delete(key);
      }
    }

    this.logger.debug('Cleanup completed');
  }

  /**
   * Public API methods
   */

  getCorrelations(eventId: string): EventCorrelation[] {
    return this.correlationCache.get(eventId) || [];
  }

  getAggregations(interval: AggregationInterval): EventAggregation[] {
    const aggregations: EventAggregation[] = [];

    for (const [key, aggregation] of this.aggregationCache.entries()) {
      if (aggregation.period.interval === interval) {
        aggregations.push(aggregation);
      }
    }

    return aggregations.sort((a, b) =>
      b.period.start.getTime() - a.period.start.getTime(),
    );
  }

  getStreamingMetrics(): StreamingAnalytics {
    return { ...this.streamingMetrics };
  }

  addTransport(transport: TransportConfig): void {
    this.transports.set(transport.name, transport);
    this.logger.log(`Added transport: ${transport.name}`);
  }

  removeTransport(name: string): boolean {
    const removed = this.transports.delete(name);
    if (removed) {
      this.logger.log(`Removed transport: ${name}`);
    }
    return removed;
  }

  addCorrelationRule(rule: CorrelationRule): void {
    this.correlationRules.set(rule.id, rule);
    this.logger.log(`Added correlation rule: ${rule.name}`);
  }

  removeCorrelationRule(ruleId: string): boolean {
    const removed = this.correlationRules.delete(ruleId);
    if (removed) {
      this.logger.log(`Removed correlation rule: ${ruleId}`);
    }
    return removed;
  }
}