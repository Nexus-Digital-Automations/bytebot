/**
 * False Positive Reduction Engine - Advanced ML Accuracy Optimization
 *
 * Enterprise-grade false positive reduction system that continuously learns
 * and adapts to reduce false positive rates while maintaining security effectiveness.
 * Integrates with ML models to provide real-time feedback and optimization.
 *
 * @fileoverview False Positive Reduction Engine - Production Ready
 * @version 1.0.0
 * @author ML Accuracy Specialist - Advanced Security Framework
 */

import { EventEmitter } from "events";
import { performance } from "perf_hooks";
import {
  FalsePositiveMetric,
  SecurityThreatCategory,
  SecuritySeverity,
  ValidationSource,
  AnalyticsInsight,
  Recommendation,
  TrendDirection,
  MetricEvent,
  MetricEventType,
} from "../types/metrics.types";

// ===========================
// CORE INTERFACES
// ===========================

export interface FalsePositiveReductionConfig {
  readonly enabled: boolean;
  readonly learningRate: number; // 0-1
  readonly confidenceThreshold: number; // 0-1
  readonly adaptationInterval: number; // milliseconds
  readonly maxHistorySize: number;
  readonly validationRequiredThreshold: number; // 0-1
  readonly autoCorrection: boolean;
  readonly expertValidationWeight: number; // 0-1
  readonly crowdsourcedValidationWeight: number; // 0-1
}

export interface DetectionResult {
  readonly id: string;
  readonly timestamp: Date;
  readonly category: SecurityThreatCategory;
  readonly severity: SecuritySeverity;
  readonly confidence: number; // 0-1
  readonly pattern: string;
  readonly evidence: Record<string, unknown>;
  readonly originalModelScore: number;
  readonly adjustedScore: number;
  readonly falsePositiveProbability: number;
}

export interface ValidationFeedback {
  readonly detectionId: string;
  readonly validatorId: string;
  readonly source: ValidationSource;
  readonly isValid: boolean;
  readonly confidence: number; // 0-1
  readonly reasoning: string;
  readonly timestamp: Date;
  readonly expertLevel?: "junior" | "senior" | "expert" | "master";
  readonly additionalContext?: Record<string, unknown>;
}

export interface LearningPattern {
  readonly patternId: string;
  readonly category: SecurityThreatCategory;
  readonly signature: string;
  readonly falsePositiveRate: number; // 0-1
  readonly validationCount: number;
  readonly lastSeen: Date;
  readonly adjustmentFactor: number; // Multiplier for confidence scores
  readonly adaptationHistory: AdaptationRecord[];
}

export interface AdaptationRecord {
  readonly timestamp: Date;
  readonly previousFPRate: number;
  readonly newFPRate: number;
  readonly triggerReason: string;
  readonly validationCount: number;
  readonly adjustmentMade: number;
}

// ===========================
// FALSE POSITIVE REDUCTION ENGINE
// ===========================

export class FalsePositiveReductionEngine extends EventEmitter {
  private readonly config: FalsePositiveReductionConfig;
  private readonly learningPatterns: Map<string, LearningPattern> = new Map();
  private readonly validationHistory: Map<string, ValidationFeedback[]> =
    new Map();
  private readonly recentDetections: DetectionResult[] = [];
  private adaptationTimer: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(config: Partial<FalsePositiveReductionConfig> = {}) {
    super();

    this.config = {
      enabled: true,
      learningRate: 0.1,
      confidenceThreshold: 0.8,
      adaptationInterval: 300000, // 5 minutes
      maxHistorySize: 10000,
      validationRequiredThreshold: 0.7,
      autoCorrection: true,
      expertValidationWeight: 0.9,
      crowdsourcedValidationWeight: 0.3,
      ...config,
    };

    this.setupEventListeners();
  }

  /**
   * Start the false positive reduction engine
   */
  async start(): Promise<void> {
    if (this.isRunning || !this.config.enabled) {
      return;
    }

    this.isRunning = true;
    this.startAdaptationCycle();

    this.emit("engine_started", {
      timestamp: new Date(),
      config: this.config,
    });

    console.info("False Positive Reduction Engine started successfully", {
      learningRate: this.config.learningRate,
      adaptationInterval: this.config.adaptationInterval,
    });
  }

  /**
   * Stop the false positive reduction engine
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.adaptationTimer) {
      clearTimeout(this.adaptationTimer);
      this.adaptationTimer = null;
    }

    this.emit("engine_stopped", {
      timestamp: new Date(),
      learningPatternsCount: this.learningPatterns.size,
    });

    console.info("False Positive Reduction Engine stopped successfully");
  }

  /**
   * Process a detection result and apply false positive reduction
   */
  async processDetection(
    detection: Omit<
      DetectionResult,
      "adjustedScore" | "falsePositiveProbability"
    >,
  ): Promise<DetectionResult> {
    const startTime = performance.now();

    try {
      // Calculate false positive probability
      const falsePositiveProbability = this.calculateFalsePositiveProbability(
        detection.category,
        detection.pattern,
        detection.confidence,
      );

      // Adjust confidence score based on learned patterns
      const adjustedScore = this.adjustConfidenceScore(
        detection.originalModelScore,
        detection.category,
        detection.pattern,
        falsePositiveProbability,
      );

      const enrichedDetection: DetectionResult = {
        ...detection,
        adjustedScore,
        falsePositiveProbability,
      };

      // Store for learning
      this.addToRecentDetections(enrichedDetection);

      // Emit event for monitoring
      this.emitMetricEvent("detection_processed", {
        detectionId: detection.id,
        category: detection.category,
        originalScore: detection.originalModelScore,
        adjustedScore,
        falsePositiveProbability,
        processingTimeMs: performance.now() - startTime,
      });

      // Check if validation is required
      if (this.isValidationRequired(enrichedDetection)) {
        this.requestValidation(enrichedDetection);
      }

      return enrichedDetection;
    } catch (error) {
      this.emitMetricEvent("detection_processing_error", {
        detectionId: detection.id,
        error: error instanceof Error ? error.message : String(error),
        processingTimeMs: performance.now() - startTime,
      });

      throw new Error(
        `Failed to process detection: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Add validation feedback to improve accuracy
   */
  async addValidationFeedback(feedback: ValidationFeedback): Promise<void> {
    try {
      // Store validation feedback
      const existingFeedback =
        this.validationHistory.get(feedback.detectionId) || [];
      existingFeedback.push(feedback);
      this.validationHistory.set(feedback.detectionId, existingFeedback);

      // Find the corresponding detection
      const detection = this.recentDetections.find(
        (d) => d.id === feedback.detectionId,
      );
      if (detection) {
        // Update learning patterns
        await this.updateLearningPatterns(detection, feedback);

        this.emitMetricEvent("validation_feedback_processed", {
          detectionId: feedback.detectionId,
          isValid: feedback.isValid,
          source: feedback.source,
          confidence: feedback.confidence,
        });
      }

      // Cleanup old history
      this.cleanupValidationHistory();
    } catch (error) {
      console.error("Failed to process validation feedback:", error);
      throw new Error(
        `Failed to process validation feedback: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Get false positive metrics for monitoring
   */
  getFalsePositiveMetrics(): FalsePositiveMetric[] {
    const metrics: FalsePositiveMetric[] = [];
    const now = new Date();

    for (const [patternId, pattern] of Array.from(this.learningPatterns)) {
      const validationFeedback = Array.from(this.validationHistory.values())
        .flat()
        .filter((feedback) => {
          const detection = this.recentDetections.find(
            (d) => d.id === feedback.detectionId,
          );
          return detection && detection.pattern === pattern.signature;
        });

      const totalValidations = validationFeedback.length;
      const falsePositives = validationFeedback.filter(
        (f) => !f.isValid,
      ).length;

      if (totalValidations > 0) {
        metrics.push({
          id: `fp-metric-${patternId}`,
          timestamp: now,
          modelId: "false-positive-reduction-engine",
          category: pattern.category,
          severity: this.getSeverityFromFPRate(pattern.falsePositiveRate),
          falsePositiveRate: pattern.falsePositiveRate,
          expectedPositives: totalValidations - falsePositives,
          actualPositives: totalValidations,
          falsePositives,
          confidenceScore: this.calculatePatternConfidence(pattern),
          pattern: pattern.signature,
          context: {
            adaptationHistory: pattern.adaptationHistory,
            lastSeen: pattern.lastSeen,
            adjustmentFactor: pattern.adjustmentFactor,
          },
          correctionApplied: this.config.autoCorrection,
          validationSource:
            this.getDominantValidationSource(validationFeedback),
        });
      }
    }

    return metrics;
  }

  /**
   * Get analytics insights about false positive patterns
   */
  getAnalyticsInsights(): AnalyticsInsight[] {
    const insights: AnalyticsInsight[] = [];

    // Analyze trending false positive rates
    const trendingPatterns = this.identifyTrendingPatterns();
    for (const pattern of trendingPatterns) {
      if (pattern.trend === "increasing" && pattern.falsePositiveRate > 0.2) {
        insights.push({
          type: "degradation",
          severity: pattern.falsePositiveRate > 0.5 ? "high" : "medium",
          description: `Increasing false positive rate detected for ${pattern.category} patterns`,
          evidence: {
            patternId: pattern.patternId,
            currentRate: pattern.falsePositiveRate,
            trend: pattern.trend,
            validationCount: pattern.validationCount,
          },
          confidence: 0.85,
        });
      }
    }

    // Identify improvement opportunities
    const improvementOpportunities = this.identifyImprovementOpportunities();
    for (const opportunity of improvementOpportunities) {
      insights.push({
        type: "opportunity",
        severity: "medium",
        description: opportunity.description,
        evidence: opportunity.evidence,
        confidence: opportunity.confidence,
      });
    }

    return insights;
  }

  /**
   * Get recommendations for reducing false positives
   */
  getRecommendations(): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Analyze patterns with high false positive rates
    const highFPPatterns = Array.from(this.learningPatterns.values())
      .filter((pattern) => pattern.falsePositiveRate > 0.3)
      .sort((a, b) => b.falsePositiveRate - a.falsePositiveRate);

    for (const pattern of highFPPatterns.slice(0, 5)) {
      recommendations.push({
        id: `reduce-fp-${pattern.patternId}`,
        category: "accuracy",
        priority: pattern.falsePositiveRate > 0.5 ? "high" : "medium",
        title: `Reduce False Positives for ${pattern.category}`,
        description: `Pattern "${pattern.signature}" has a high false positive rate of ${(pattern.falsePositiveRate * 100).toFixed(1)}%`,
        implementation: [
          "Review and refine detection pattern",
          "Adjust confidence thresholds",
          "Add additional validation rules",
          "Implement context-aware filtering",
        ],
        estimatedImpact: Math.min(90, pattern.falsePositiveRate * 100),
        estimatedEffort: "medium",
      });
    }

    // Recommend validation for uncertain patterns
    const uncertainPatterns = Array.from(this.learningPatterns.values()).filter(
      (pattern) =>
        pattern.validationCount < 10 && pattern.falsePositiveRate > 0.1,
    );

    if (uncertainPatterns.length > 0) {
      recommendations.push({
        id: "increase-validation",
        category: "accuracy",
        priority: "medium",
        title: "Increase Validation Coverage",
        description: `${uncertainPatterns.length} patterns need more validation data for accurate false positive assessment`,
        implementation: [
          "Set up automated validation requests",
          "Engage security experts for pattern review",
          "Implement crowdsourced validation",
          "Create validation incentive programs",
        ],
        estimatedImpact: 60,
        estimatedEffort: "low",
      });
    }

    return recommendations;
  }

  // ===========================
  // PRIVATE METHODS
  // ===========================

  private setupEventListeners(): void {
    this.on("pattern_learned", (data) => {
      console.debug("New pattern learned:", data);
    });

    this.on("adaptation_complete", (data) => {
      console.info("Adaptation cycle completed:", data);
    });
  }

  private startAdaptationCycle(): void {
    if (!this.isRunning) {
      return;
    }

    this.adaptationTimer = setTimeout(async () => {
      try {
        await this.performAdaptation();
        this.startAdaptationCycle(); // Schedule next cycle
      } catch (error) {
        console.error("Adaptation cycle failed:", error);
        this.startAdaptationCycle(); // Continue despite errors
      }
    }, this.config.adaptationInterval);
  }

  private async performAdaptation(): Promise<void> {
    const startTime = performance.now();
    let adaptationsMade = 0;

    // Update learning patterns based on recent validations
    for (const [patternId, pattern] of Array.from(this.learningPatterns)) {
      const recentValidations = this.getRecentValidations(pattern.signature);

      if (recentValidations.length >= 5) {
        // Minimum validations for adaptation
        const newFPRate = this.calculateFalsePositiveRate(recentValidations);

        if (Math.abs(newFPRate - pattern.falsePositiveRate) > 0.05) {
          const updatedPattern = this.adaptPattern(pattern, newFPRate);
          this.learningPatterns.set(patternId, updatedPattern);
          adaptationsMade++;
        }
      }
    }

    const processingTime = performance.now() - startTime;

    this.emit("adaptation_complete", {
      timestamp: new Date(),
      adaptationsMade,
      processingTimeMs: processingTime,
      totalPatterns: this.learningPatterns.size,
    });

    this.emitMetricEvent("adaptation_cycle_completed", {
      adaptationsMade,
      processingTimeMs: processingTime,
      totalPatterns: this.learningPatterns.size,
    });
  }

  private calculateFalsePositiveProbability(
    category: SecurityThreatCategory,
    pattern: string,
    confidence: number,
  ): number {
    const learningPattern = this.findLearningPattern(category, pattern);

    if (learningPattern && learningPattern.validationCount >= 3) {
      // Use learned false positive rate, adjusted by confidence
      const baseRate = learningPattern.falsePositiveRate;
      const confidenceAdjustment = (1 - confidence) * 0.3; // Low confidence increases FP probability
      return Math.min(1, baseRate + confidenceAdjustment);
    }

    // Default estimation based on category and confidence
    const categoryBaseFPRate = this.getCategoryBaseFPRate(category);
    const confidenceAdjustment = (1 - confidence) * 0.4;
    return Math.min(1, categoryBaseFPRate + confidenceAdjustment);
  }

  private adjustConfidenceScore(
    originalScore: number,
    category: SecurityThreatCategory,
    pattern: string,
    falsePositiveProbability: number,
  ): number {
    if (!this.config.autoCorrection) {
      return originalScore;
    }

    const learningPattern = this.findLearningPattern(category, pattern);
    const adjustmentFactor = learningPattern
      ? learningPattern.adjustmentFactor
      : 1.0;

    // Apply learned adjustment and false positive probability
    let adjustedScore = originalScore * adjustmentFactor;
    adjustedScore = adjustedScore * (1 - falsePositiveProbability * 0.5);

    return Math.max(0, Math.min(1, adjustedScore));
  }

  private findLearningPattern(
    category: SecurityThreatCategory,
    pattern: string,
  ): LearningPattern | undefined {
    for (const learningPattern of Array.from(this.learningPatterns.values())) {
      if (
        learningPattern.category === category &&
        learningPattern.signature === pattern
      ) {
        return learningPattern;
      }
    }
    return undefined;
  }

  private addToRecentDetections(detection: DetectionResult): void {
    this.recentDetections.push(detection);

    // Keep only recent detections
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours
    const recentIndex = this.recentDetections.findIndex(
      (d) => d.timestamp >= cutoffTime,
    );
    if (recentIndex > 0) {
      this.recentDetections.splice(0, recentIndex);
    }

    // Enforce maximum history size
    if (this.recentDetections.length > this.config.maxHistorySize) {
      this.recentDetections.splice(
        0,
        this.recentDetections.length - this.config.maxHistorySize,
      );
    }
  }

  private isValidationRequired(detection: DetectionResult): boolean {
    return (
      detection.falsePositiveProbability >
        this.config.validationRequiredThreshold ||
      detection.confidence < this.config.confidenceThreshold
    );
  }

  private requestValidation(detection: DetectionResult): void {
    this.emitMetricEvent("validation_requested", {
      detectionId: detection.id,
      category: detection.category,
      severity: detection.severity,
      falsePositiveProbability: detection.falsePositiveProbability,
      confidence: detection.confidence,
    });
  }

  private async updateLearningPatterns(
    detection: DetectionResult,
    feedback: ValidationFeedback,
  ): Promise<void> {
    const patternKey = `${detection.category}-${this.hashPattern(detection.pattern)}`;

    let pattern = this.learningPatterns.get(patternKey);
    if (!pattern) {
      pattern = {
        patternId: patternKey,
        category: detection.category,
        signature: detection.pattern,
        falsePositiveRate: feedback.isValid ? 0 : 1,
        validationCount: 1,
        lastSeen: detection.timestamp,
        adjustmentFactor: 1.0,
        adaptationHistory: [],
      };
    } else {
      // Update false positive rate using weighted average
      const weight = this.getValidationWeight(
        feedback.source,
        feedback.expertLevel,
      );
      const totalWeight = pattern.validationCount + weight;
      const currentFPContribution =
        pattern.falsePositiveRate * pattern.validationCount;
      const newFPContribution = (feedback.isValid ? 0 : 1) * weight;

      pattern = {
        ...pattern,
        falsePositiveRate:
          (currentFPContribution + newFPContribution) / totalWeight,
        validationCount: pattern.validationCount + 1,
        lastSeen: detection.timestamp,
        adjustmentFactor: this.calculateAdjustmentFactor(
          pattern.falsePositiveRate,
        ),
      };
    }

    this.learningPatterns.set(patternKey, pattern);

    this.emit("pattern_learned", {
      patternId: patternKey,
      category: detection.category,
      falsePositiveRate: pattern.falsePositiveRate,
      validationCount: pattern.validationCount,
    });
  }

  private getValidationWeight(
    source: ValidationSource,
    expertLevel?: string,
  ): number {
    switch (source) {
      case "expert":
        switch (expertLevel) {
          case "master":
            return 1.0;
          case "expert":
            return 0.9;
          case "senior":
            return 0.7;
          case "junior":
            return 0.5;
          default:
            return this.config.expertValidationWeight;
        }
      case "automated":
        return 0.6;
      case "crowdsourced":
        return this.config.crowdsourcedValidationWeight;
      case "manual":
        return 0.8;
      default:
        return 0.5;
    }
  }

  private calculateAdjustmentFactor(falsePositiveRate: number): number {
    // Reduce confidence for patterns with high false positive rates
    return Math.max(0.3, 1 - falsePositiveRate * 0.7);
  }

  private hashPattern(pattern: string): string {
    // Simple hash function for pattern identification
    let hash = 0;
    for (let i = 0; i < pattern.length; i++) {
      const char = pattern.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  private cleanupValidationHistory(): void {
    const cutoffTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days

    for (const [detectionId, feedbacks] of Array.from(this.validationHistory)) {
      const recentFeedbacks = feedbacks.filter(
        (f) => f.timestamp >= cutoffTime,
      );
      if (recentFeedbacks.length === 0) {
        this.validationHistory.delete(detectionId);
      } else if (recentFeedbacks.length !== feedbacks.length) {
        this.validationHistory.set(detectionId, recentFeedbacks);
      }
    }
  }

  private getCategoryBaseFPRate(category: SecurityThreatCategory): number {
    // Default false positive rates by category (can be tuned)
    const baseFPRates: Record<SecurityThreatCategory, number> = {
      sql_injection: 0.15,
      xss: 0.2,
      csrf: 0.1,
      authentication: 0.12,
      authorization: 0.08,
      data_exposure: 0.18,
      malware: 0.05,
      phishing: 0.25,
      network_intrusion: 0.3,
    };

    return baseFPRates[category] || 0.15;
  }

  private getSeverityFromFPRate(fpRate: number): SecuritySeverity {
    if (fpRate >= 0.7) {
      return "critical";
    }
    if (fpRate >= 0.5) {
      return "high";
    }
    if (fpRate >= 0.3) {
      return "medium";
    }
    if (fpRate >= 0.1) {
      return "low";
    }
    return "info";
  }

  private calculatePatternConfidence(pattern: LearningPattern): number {
    // Confidence based on validation count and consistency
    const validationFactor = Math.min(1, pattern.validationCount / 20);
    const consistencyFactor = 1 - Math.abs(0.5 - pattern.falsePositiveRate); // More confident when clearly true or false
    return (validationFactor + consistencyFactor) / 2;
  }

  private getDominantValidationSource(
    feedbacks: ValidationFeedback[],
  ): ValidationSource {
    const sourceCounts: Record<ValidationSource, number> = {
      manual: 0,
      automated: 0,
      expert: 0,
      crowdsourced: 0,
    };

    for (const feedback of feedbacks) {
      sourceCounts[feedback.source]++;
    }

    return Object.entries(sourceCounts).sort(
      ([, a], [, b]) => b - a,
    )[0][0] as ValidationSource;
  }

  private identifyTrendingPatterns(): Array<
    LearningPattern & { trend: TrendDirection }
  > {
    const trendingPatterns: Array<LearningPattern & { trend: TrendDirection }> =
      [];

    for (const pattern of Array.from(this.learningPatterns.values())) {
      if (pattern.adaptationHistory.length >= 3) {
        const recentAdaptations = pattern.adaptationHistory.slice(-3);
        const trend = this.calculateTrend(
          recentAdaptations.map((a) => a.newFPRate),
        );

        trendingPatterns.push({
          ...pattern,
          trend,
        });
      }
    }

    return trendingPatterns;
  }

  private calculateTrend(values: number[]): TrendDirection {
    if (values.length < 2) {
      return "stable";
    }

    const first = values[0];
    const last = values[values.length - 1];
    const change = (last - first) / first;

    if (Math.abs(change) < 0.1) {
      return "stable";
    }
    if (change > 0.3) {
      return "increasing";
    }
    if (change < -0.3) {
      return "decreasing";
    }
    return change > 0 ? "increasing" : "decreasing";
  }

  private identifyImprovementOpportunities(): Array<{
    description: string;
    evidence: Record<string, unknown>;
    confidence: number;
  }> {
    const opportunities: Array<{
      description: string;
      evidence: Record<string, unknown>;
      confidence: number;
    }> = [];

    // Look for patterns that could benefit from more validation
    const underValidatedPatterns = Array.from(
      this.learningPatterns.values(),
    ).filter((p) => p.validationCount < 5 && p.falsePositiveRate > 0.2);

    if (underValidatedPatterns.length > 0) {
      opportunities.push({
        description: `${underValidatedPatterns.length} patterns need more validation to improve accuracy`,
        evidence: {
          patterns: underValidatedPatterns.map((p) => ({
            category: p.category,
            validationCount: p.validationCount,
            fpRate: p.falsePositiveRate,
          })),
        },
        confidence: 0.8,
      });
    }

    return opportunities;
  }

  private getRecentValidations(signature: string): ValidationFeedback[] {
    const recentValidations: ValidationFeedback[] = [];
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours

    for (const feedbacks of Array.from(this.validationHistory.values())) {
      for (const feedback of feedbacks) {
        if (feedback.timestamp >= cutoffTime) {
          const detection = this.recentDetections.find(
            (d) => d.id === feedback.detectionId,
          );
          if (detection && detection.pattern === signature) {
            recentValidations.push(feedback);
          }
        }
      }
    }

    return recentValidations;
  }

  private calculateFalsePositiveRate(
    validations: ValidationFeedback[],
  ): number {
    if (validations.length === 0) {
      return 0;
    }

    const falsePositives = validations.filter((v) => !v.isValid).length;
    return falsePositives / validations.length;
  }

  private adaptPattern(
    pattern: LearningPattern,
    newFPRate: number,
  ): LearningPattern {
    const adaptationRecord: AdaptationRecord = {
      timestamp: new Date(),
      previousFPRate: pattern.falsePositiveRate,
      newFPRate,
      triggerReason: "scheduled_adaptation",
      validationCount: pattern.validationCount,
      adjustmentMade: newFPRate - pattern.falsePositiveRate,
    };

    return {
      ...pattern,
      falsePositiveRate: newFPRate,
      adjustmentFactor: this.calculateAdjustmentFactor(newFPRate),
      adaptationHistory: [...pattern.adaptationHistory, adaptationRecord].slice(
        -20,
      ), // Keep last 20 adaptations
    };
  }

  private emitMetricEvent(
    type: MetricEventType,
    payload: Record<string, unknown>,
  ): void {
    const event: MetricEvent = {
      eventId: `fp-engine-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type,
      payload: {
        data: payload,
        metadata: {
          engine: "false-positive-reduction",
          version: "1.0.0",
        },
      },
      source: "FalsePositiveReductionEngine",
      priority: type.includes("error") ? "high" : "normal",
    };

    this.emit("metric_event", event);
  }
}

// ===========================
// UTILITY FUNCTIONS
// ===========================

/**
 * Create a default false positive reduction engine configuration
 */
export function createDefaultFPReductionConfig(): FalsePositiveReductionConfig {
  return {
    enabled: true,
    learningRate: 0.1,
    confidenceThreshold: 0.8,
    adaptationInterval: 300000, // 5 minutes
    maxHistorySize: 10000,
    validationRequiredThreshold: 0.7,
    autoCorrection: true,
    expertValidationWeight: 0.9,
    crowdsourcedValidationWeight: 0.3,
  };
}

/**
 * Create a high-accuracy false positive reduction engine configuration
 */
export function createHighAccuracyFPReductionConfig(): FalsePositiveReductionConfig {
  return {
    enabled: true,
    learningRate: 0.05, // Slower learning for stability
    confidenceThreshold: 0.9,
    adaptationInterval: 180000, // 3 minutes
    maxHistorySize: 20000,
    validationRequiredThreshold: 0.6,
    autoCorrection: true,
    expertValidationWeight: 0.95,
    crowdsourcedValidationWeight: 0.2,
  };
}
