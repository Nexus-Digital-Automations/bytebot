/**
 * ML Performance Metrics System for Vulnerability Pattern Detection
 *
 * Comprehensive performance evaluation system for ML algorithms with accuracy, precision,
 * recall, F1-score tracking and comprehensive model validation capabilities.
 *
 * @fileoverview ML Performance Metrics System - Model Evaluation & Validation
 * @version 2.0.0
 * @author ML Algorithms Team - Advanced Security Framework
 */

import { performance } from "perf_hooks";
import {
  VulnerabilitySeverity,
  // VulnerabilityCategory, // Commented for future use
} from "../vulnerability-assessment-engine";

// ===========================
// CORE TYPES AND INTERFACES
// ===========================

export interface PerformanceMetrics {
  readonly accuracy: number;
  readonly precision: Record<VulnerabilitySeverity, number>;
  readonly recall: Record<VulnerabilitySeverity, number>;
  readonly f1Score: Record<VulnerabilitySeverity, number>;
  readonly specificity: Record<VulnerabilitySeverity, number>;
  readonly macroAverages: {
    readonly precision: number;
    readonly recall: number;
    readonly f1Score: number;
    readonly specificity: number;
  };
  readonly weightedAverages: {
    readonly precision: number;
    readonly recall: number;
    readonly f1Score: number;
    readonly specificity: number;
  };
  readonly confusionMatrix: Record<
    VulnerabilitySeverity,
    Record<VulnerabilitySeverity, number>
  >;
  readonly classDistribution: Record<VulnerabilitySeverity, number>;
  readonly totalSamples: number;
}

export interface CrossValidationResults {
  readonly folds: readonly {
    readonly foldIndex: number;
    readonly metrics: PerformanceMetrics;
    readonly trainingTime: number;
    readonly validationTime: number;
  }[];
  readonly averageMetrics: PerformanceMetrics;
  readonly standardDeviations: {
    readonly accuracy: number;
    readonly precision: Record<VulnerabilitySeverity, number>;
    readonly recall: Record<VulnerabilitySeverity, number>;
    readonly f1Score: Record<VulnerabilitySeverity, number>;
  };
  readonly confidenceIntervals: {
    readonly accuracy: { lower: number; upper: number };
    readonly macroF1: { lower: number; upper: number };
  };
}

export interface ModelComparison {
  readonly modelA: {
    readonly name: string;
    readonly metrics: PerformanceMetrics;
  };
  readonly modelB: {
    readonly name: string;
    readonly metrics: PerformanceMetrics;
  };
  readonly comparison: {
    readonly accuracyDifference: number;
    readonly macroF1Difference: number;
    readonly significantDifference: boolean;
    readonly betterModel: string;
    readonly improvementAreas: readonly string[];
  };
}

export interface LearningCurveData {
  readonly trainingSizes: readonly number[];
  readonly trainingScores: readonly number[];
  readonly validationScores: readonly number[];
  readonly trainingTimes: readonly number[];
  readonly convergencePoint: number | null;
  readonly overallTrend: "improving" | "stable" | "declining" | "overfitting";
}

export interface MetricsReport {
  readonly modelName: string;
  readonly timestamp: Date;
  readonly performance: PerformanceMetrics;
  readonly crossValidation?: CrossValidationResults;
  readonly learningCurve?: LearningCurveData;
  readonly recommendations: readonly string[];
  readonly strengths: readonly string[];
  readonly weaknesses: readonly string[];
  readonly metadata: {
    readonly trainingDataSize: number;
    readonly testDataSize: number;
    readonly featureCount: number;
    readonly trainingDuration: number;
    readonly evaluationDuration: number;
  };
}

export interface PredictionResult {
  readonly predicted: VulnerabilitySeverity;
  readonly actual: VulnerabilitySeverity;
  readonly confidence: number;
  readonly probabilities: Record<VulnerabilitySeverity, number>;
  readonly correct: boolean;
}

export interface MetricsConfig {
  readonly crossValidation: {
    readonly enabled: boolean;
    readonly folds: number;
    readonly stratified: boolean;
    readonly shuffle: boolean;
    readonly randomState: number;
  };
  readonly confidenceInterval: {
    readonly level: number; // e.g., 0.95 for 95% CI
    readonly method: "bootstrap" | "normal";
    readonly bootstrapSamples: number;
  };
  readonly reporting: {
    readonly includeConfusionMatrix: boolean;
    readonly includeClassificationReport: boolean;
    readonly includeFeatureImportance: boolean;
    readonly verboseOutput: boolean;
  };
  readonly thresholds: {
    readonly minAccuracy: number;
    readonly minF1Score: number;
    readonly maxTrainingTime: number;
    readonly significanceLevel: number;
  };
}

// ===========================
// PERFORMANCE METRICS SYSTEM IMPLEMENTATION
// ===========================

/**
 * ML Performance Metrics System for Vulnerability Pattern Detection
 *
 * Comprehensive evaluation system providing accuracy, precision, recall, F1-score,
 * cross-validation, statistical significance testing, and detailed reporting.
 */
export class MLPerformanceMetrics {
  private readonly config: MetricsConfig;
  private readonly logger: Console;
  private readonly evaluationHistory: Map<string, MetricsReport[]> = new Map();

  constructor(config?: Partial<MetricsConfig>) {
    this.config = {
      crossValidation: {
        enabled: true,
        folds: 5,
        stratified: true,
        shuffle: true,
        randomState: 42,
      },
      confidenceInterval: {
        level: 0.95,
        method: "bootstrap",
        bootstrapSamples: 1000,
      },
      reporting: {
        includeConfusionMatrix: true,
        includeClassificationReport: true,
        includeFeatureImportance: true,
        verboseOutput: false,
      },
      thresholds: {
        minAccuracy: 0.8,
        minF1Score: 0.75,
        maxTrainingTime: 300000, // 5 minutes
        significanceLevel: 0.05,
      },
      ...config,
    };

    this.logger = console;
  }

  /**
   * Evaluate model performance on test data
   */
  public async evaluateModel(
    modelName: string,
    predictions: readonly PredictionResult[],
    metadata?: {
      trainingDataSize: number;
      testDataSize: number;
      featureCount: number;
      trainingDuration: number;
    },
  ): Promise<MetricsReport> {
    const startTime = performance.now();
    this.logger.info(
      `Evaluating model: ${modelName} on ${predictions.length} predictions...`,
    );

    try {
      // Calculate basic performance metrics
      const performanceMetrics = this.calculatePerformanceMetrics(predictions);

      // Generate recommendations and analysis
      const { recommendations, strengths, weaknesses } =
        this.analyzePerformance(performanceMetrics);

      const evaluationDuration = performance.now() - startTime;

      const report: MetricsReport = {
        modelName,
        timestamp: new Date(),
        performance: performanceMetrics,
        recommendations,
        strengths,
        weaknesses,
        metadata: {
          trainingDataSize: metadata?.trainingDataSize || 0,
          testDataSize: predictions.length,
          featureCount: metadata?.featureCount || 0,
          trainingDuration: metadata?.trainingDuration || 0,
          evaluationDuration,
        },
      };

      // Store in evaluation history
      if (!this.evaluationHistory.has(modelName)) {
        this.evaluationHistory.set(modelName, []);
      }
      this.evaluationHistory.get(modelName)!.push(report);

      this.logger.info(
        `Model evaluation completed in ${evaluationDuration.toFixed(2)}ms - ` +
          `Accuracy: ${performanceMetrics.accuracy.toFixed(3)}, ` +
          `Macro F1: ${performanceMetrics.macroAverages.f1Score.toFixed(3)}`,
      );

      return report;
    } catch (error) {
      this.logger.error("Model evaluation failed:", error);
      throw new Error(
        `Model evaluation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Perform k-fold cross-validation
   */
  public async performCrossValidation<T>(
    modelName: string,
    trainAndEvaluate: (
      _trainData: T[],
      _validationData: T[],
    ) => Promise<{ predictions: PredictionResult[]; trainingTime: number }>,
    data: T[],
  ): Promise<CrossValidationResults> {
    const startTime = performance.now();
    this.logger.info(
      `Performing ${this.config.crossValidation.folds}-fold cross-validation for ${modelName}...`,
    );

    try {
      // Create stratified folds
      const folds = this.createStratifiedFolds(
        data as Array<T & { label?: string; actual?: string }>,
        this.config.crossValidation.folds,
      );
      const foldResults: Array<{
        readonly foldIndex: number;
        readonly metrics: PerformanceMetrics;
        readonly trainingTime: number;
        readonly validationTime: number;
      }> = [];

      for (let i = 0; i < folds.length; i++) {
        const foldStartTime = performance.now();

        const validationData = folds[i] as T[];
        const trainingData = folds.filter((_, idx) => idx !== i).flat() as T[];

        this.logger.debug(`Cross-validation fold ${i + 1}/${folds.length}...`);

        // Train and evaluate on fold
        const { predictions, trainingTime } = await trainAndEvaluate(
          trainingData,
          validationData,
        );
        const validationTime = performance.now() - foldStartTime - trainingTime;

        // Calculate metrics for this fold
        const metrics = this.calculatePerformanceMetrics(predictions);

        foldResults.push({
          foldIndex: i,
          metrics,
          trainingTime,
          validationTime,
        });
      }

      // Calculate average metrics and standard deviations
      const averageMetrics = this.calculateAverageMetrics(
        foldResults.map((f) => f.metrics),
      );
      const standardDeviations = this.calculateStandardDeviations(
        foldResults.map((f) => f.metrics),
      );
      const confidenceIntervals = this.calculateConfidenceIntervals(
        foldResults.map((f) => f.metrics),
      );

      const totalTime = performance.now() - startTime;
      this.logger.info(
        `Cross-validation completed in ${totalTime.toFixed(2)}ms - ` +
          `Average accuracy: ${averageMetrics.accuracy.toFixed(3)} ± ${standardDeviations.accuracy.toFixed(3)}`,
      );

      return {
        folds: foldResults,
        averageMetrics,
        standardDeviations,
        confidenceIntervals,
      };
    } catch (error) {
      this.logger.error("Cross-validation failed:", error);
      throw new Error(
        `Cross-validation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Compare performance between two models
   */
  public compareModels(
    modelAName: string,
    modelAMetrics: PerformanceMetrics,
    modelBName: string,
    modelBMetrics: PerformanceMetrics,
  ): ModelComparison {
    const accuracyDifference = modelAMetrics.accuracy - modelBMetrics.accuracy;
    const macroF1Difference =
      modelAMetrics.macroAverages.f1Score - modelBMetrics.macroAverages.f1Score;

    // Simple significance test (would use more sophisticated methods in practice)
    const significantDifference =
      Math.abs(accuracyDifference) > this.config.thresholds.significanceLevel;

    let betterModel = modelAName;
    if (macroF1Difference < 0) {
      betterModel = modelBName;
    } else if (Math.abs(macroF1Difference) < 0.001) {
      betterModel = accuracyDifference >= 0 ? modelAName : modelBName;
    }

    // Analyze improvement areas
    const improvementAreas: string[] = [];

    const severityValues: VulnerabilitySeverity[] = [
      "info",
      "low",
      "medium",
      "high",
      "critical",
    ];
    for (const severity of severityValues) {
      const f1Diff =
        modelAMetrics.f1Score[severity] - modelBMetrics.f1Score[severity];
      if (f1Diff < -0.05) {
        // Model A is significantly worse for this class
        improvementAreas.push(
          `${severity} classification (F1: ${modelAMetrics.f1Score[severity].toFixed(3)} vs ${modelBMetrics.f1Score[severity].toFixed(3)})`,
        );
      }
    }

    return {
      modelA: { name: modelAName, metrics: modelAMetrics },
      modelB: { name: modelBName, metrics: modelBMetrics },
      comparison: {
        accuracyDifference,
        macroF1Difference,
        significantDifference,
        betterModel,
        improvementAreas,
      },
    };
  }

  /**
   * Generate learning curve data
   */
  public async generateLearningCurve<T>(
    modelName: string,
    trainAndEvaluate: (
      _trainData: T[],
      _validationData: T[],
    ) => Promise<{ predictions: PredictionResult[]; trainingTime: number }>,
    trainingData: T[],
    validationData: T[],
    trainingSizes: readonly number[] = [0.1, 0.2, 0.4, 0.6, 0.8, 1.0],
  ): Promise<LearningCurveData> {
    this.logger.info(`Generating learning curve for ${modelName}...`);

    const actualTrainingSizes: number[] = [];
    const trainingScores: number[] = [];
    const validationScores: number[] = [];
    const trainingTimes: number[] = [];

    for (const sizeRatio of trainingSizes) {
      const sampleSize = Math.floor(trainingData.length * sizeRatio);
      const sampledTrainingData = this.shuffleArray([...trainingData]).slice(
        0,
        sampleSize,
      );

      this.logger.debug(
        `Learning curve: training with ${sampleSize} samples...`,
      );

      try {
        const { predictions: valPredictions, trainingTime } =
          await trainAndEvaluate(sampledTrainingData, validationData);

        // Also evaluate on training data for training score
        const { predictions: trainPredictions } = await trainAndEvaluate(
          sampledTrainingData,
          sampledTrainingData.slice(
            0,
            Math.min(100, sampledTrainingData.length),
          ), // Small sample for efficiency
        );

        const trainMetrics = this.calculatePerformanceMetrics(trainPredictions);
        const valMetrics = this.calculatePerformanceMetrics(valPredictions);

        actualTrainingSizes.push(sampleSize);
        trainingScores.push(trainMetrics.accuracy);
        validationScores.push(valMetrics.accuracy);
        trainingTimes.push(trainingTime);
      } catch (error) {
        this.logger.warn(
          `Learning curve failed for size ${sampleSize}:`,
          error,
        );
      }
    }

    // Analyze trend
    const trend = this.analyzeLearningTrend(trainingScores, validationScores);
    const convergencePoint = this.findConvergencePoint(
      actualTrainingSizes,
      validationScores,
    );

    return {
      trainingSizes: actualTrainingSizes,
      trainingScores,
      validationScores,
      trainingTimes,
      convergencePoint,
      overallTrend: trend,
    };
  }

  /**
   * Get evaluation history for a model
   */
  public getEvaluationHistory(modelName: string): readonly MetricsReport[] {
    return this.evaluationHistory.get(modelName) || [];
  }

  /**
   * Get performance summary across all evaluated models
   */
  public getPerformanceSummary(): {
    totalModelsEvaluated: number;
    bestPerformingModel: string | null;
    averageAccuracy: number;
    modelRankings: readonly {
      name: string;
      score: number;
      evaluations: number;
    }[];
  } {
    const modelStats: {
      name: string;
      totalScore: number;
      evaluations: number;
    }[] = [];

    for (const [modelName, reports] of Array.from(
      this.evaluationHistory.entries(),
    )) {
      const totalScore = reports.reduce(
        (sum: number, report: MetricsReport) =>
          sum + report.performance.macroAverages.f1Score,
        0,
      );
      modelStats.push({
        name: modelName,
        totalScore,
        evaluations: reports.length,
      });
    }

    const modelRankings = modelStats
      .map((stat) => ({
        name: stat.name,
        score: stat.totalScore / stat.evaluations,
        evaluations: stat.evaluations,
      }))
      .sort((a, b) => b.score - a.score);

    const bestPerformingModel =
      modelRankings.length > 0 ? modelRankings[0].name : null;
    const averageAccuracy =
      modelRankings.length > 0
        ? modelRankings.reduce((sum, model) => sum + model.score, 0) /
          modelRankings.length
        : 0;

    return {
      totalModelsEvaluated: this.evaluationHistory.size,
      bestPerformingModel,
      averageAccuracy,
      modelRankings,
    };
  }

  // ===========================
  // PRIVATE METHODS
  // ===========================

  /**
   * Calculate comprehensive performance metrics
   */
  private calculatePerformanceMetrics(
    predictions: readonly PredictionResult[],
  ): PerformanceMetrics {
    const severities: VulnerabilitySeverity[] = [
      "info",
      "low",
      "medium",
      "high",
      "critical",
    ];
    const confusionMatrix: Record<
      VulnerabilitySeverity,
      Record<VulnerabilitySeverity, number>
    > = {} as Record<
      VulnerabilitySeverity,
      Record<VulnerabilitySeverity, number>
    >;
    const classDistribution: Record<VulnerabilitySeverity, number> =
      {} as Record<VulnerabilitySeverity, number>;

    // Initialize matrices
    for (const severity of severities) {
      confusionMatrix[severity] = {} as Record<VulnerabilitySeverity, number>;
      classDistribution[severity] = 0;
      for (const predSeverity of severities) {
        confusionMatrix[severity][predSeverity] = 0;
      }
    }

    let correctPredictions = 0;

    // Populate confusion matrix and calculate accuracy
    for (const result of predictions) {
      confusionMatrix[result.actual][result.predicted]++;
      classDistribution[result.actual]++;

      if (result.correct) {
        correctPredictions++;
      }
    }

    const accuracy =
      predictions.length > 0 ? correctPredictions / predictions.length : 0;

    // Calculate per-class metrics
    const precision: Record<VulnerabilitySeverity, number> = {} as Record<
      VulnerabilitySeverity,
      number
    >;
    const recall: Record<VulnerabilitySeverity, number> = {} as Record<
      VulnerabilitySeverity,
      number
    >;
    const f1Score: Record<VulnerabilitySeverity, number> = {} as Record<
      VulnerabilitySeverity,
      number
    >;
    const specificity: Record<VulnerabilitySeverity, number> = {} as Record<
      VulnerabilitySeverity,
      number
    >;

    for (const severity of severities) {
      // True Positives, False Positives, False Negatives, True Negatives
      const tp = confusionMatrix[severity][severity];
      const fp = severities.reduce(
        (sum: number, s: VulnerabilitySeverity) =>
          s !== severity ? sum + confusionMatrix[s][severity] : sum,
        0,
      );
      const fn = severities.reduce(
        (sum: number, s: VulnerabilitySeverity) =>
          s !== severity ? sum + confusionMatrix[severity][s] : sum,
        0,
      );
      const tn = predictions.length - tp - fp - fn;

      // Calculate metrics
      precision[severity] = tp + fp > 0 ? tp / (tp + fp) : 0;
      recall[severity] = tp + fn > 0 ? tp / (tp + fn) : 0;
      specificity[severity] = tn + fp > 0 ? tn / (tn + fp) : 0;

      const prec = precision[severity];
      const rec = recall[severity];
      f1Score[severity] = prec + rec > 0 ? (2 * prec * rec) / (prec + rec) : 0;
    }

    // Calculate macro averages
    const macroAverages = {
      precision:
        severities.reduce(
          (sum: number, s: VulnerabilitySeverity) => sum + precision[s],
          0,
        ) / severities.length,
      recall:
        severities.reduce(
          (sum: number, s: VulnerabilitySeverity) => sum + recall[s],
          0,
        ) / severities.length,
      f1Score:
        severities.reduce(
          (sum: number, s: VulnerabilitySeverity) => sum + f1Score[s],
          0,
        ) / severities.length,
      specificity:
        severities.reduce(
          (sum: number, s: VulnerabilitySeverity) => sum + specificity[s],
          0,
        ) / severities.length,
    };

    // Calculate weighted averages (weighted by class frequency)
    const totalSamples = predictions.length;
    const weightedAverages = {
      precision: severities.reduce(
        (sum: number, s: VulnerabilitySeverity) =>
          sum + precision[s] * (classDistribution[s] / totalSamples),
        0,
      ),
      recall: severities.reduce(
        (sum: number, s: VulnerabilitySeverity) =>
          sum + recall[s] * (classDistribution[s] / totalSamples),
        0,
      ),
      f1Score: severities.reduce(
        (sum: number, s: VulnerabilitySeverity) =>
          sum + f1Score[s] * (classDistribution[s] / totalSamples),
        0,
      ),
      specificity: severities.reduce(
        (sum: number, s: VulnerabilitySeverity) =>
          sum + specificity[s] * (classDistribution[s] / totalSamples),
        0,
      ),
    };

    return {
      accuracy,
      precision,
      recall,
      f1Score,
      specificity,
      macroAverages,
      weightedAverages,
      confusionMatrix,
      classDistribution,
      totalSamples,
    };
  }

  /**
   * Analyze performance and generate recommendations
   */
  private analyzePerformance(metrics: PerformanceMetrics): {
    recommendations: string[];
    strengths: string[];
    weaknesses: string[];
  } {
    const recommendations: string[] = [];
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    // Overall performance analysis
    if (metrics.accuracy >= 0.9) {
      strengths.push("Excellent overall accuracy");
    } else if (metrics.accuracy >= 0.8) {
      strengths.push("Good overall accuracy");
    } else {
      weaknesses.push("Low overall accuracy");
      recommendations.push(
        "Consider feature engineering or algorithm tuning to improve accuracy",
      );
    }

    // Macro F1 analysis
    if (metrics.macroAverages.f1Score >= 0.85) {
      strengths.push("Strong balanced performance across all classes");
    } else if (metrics.macroAverages.f1Score < 0.7) {
      weaknesses.push("Imbalanced performance across vulnerability classes");
      recommendations.push(
        "Address class imbalance with techniques like SMOTE or cost-sensitive learning",
      );
    }

    // Per-class analysis
    const severities: VulnerabilitySeverity[] = [
      "info",
      "low",
      "medium",
      "high",
      "critical",
    ];
    for (const severity of severities) {
      const f1 = metrics.f1Score[severity];
      const precision = metrics.precision[severity];
      const recall = metrics.recall[severity];

      if (f1 < 0.6) {
        weaknesses.push(
          `Poor performance on ${severity} vulnerability classification (F1: ${f1.toFixed(3)})`,
        );

        if (precision < recall) {
          recommendations.push(
            `Reduce false positives for ${severity} class - consider stricter decision thresholds`,
          );
        } else {
          recommendations.push(
            `Improve recall for ${severity} class - consider additional training data or feature engineering`,
          );
        }
      } else if (f1 > 0.85) {
        strengths.push(
          `Excellent ${severity} vulnerability detection (F1: ${f1.toFixed(3)})`,
        );
      }
    }

    // Class imbalance analysis
    const classDistributions = Object.values(metrics.classDistribution);
    const maxClass = Math.max(...classDistributions);
    const minClass = Math.min(...classDistributions.filter((c) => c > 0));

    if (maxClass / minClass > 10) {
      weaknesses.push("Severe class imbalance detected");
      recommendations.push(
        "Consider data augmentation, resampling, or ensemble methods to handle class imbalance",
      );
    }

    // Add general recommendations
    if (recommendations.length === 0) {
      recommendations.push(
        "Model performs well - consider ensemble methods for further improvement",
      );
    }

    return { recommendations, strengths, weaknesses };
  }

  /**
   * Create stratified k-folds
   */
  private createStratifiedFolds<T extends { label?: string; actual?: string }>(
    data: T[],
    folds: number,
  ): T[][] {
    // Group data by class for stratification
    const classGroups: Record<string, T[]> = {};

    for (const item of data) {
      const label = item.label || item.actual || "unknown"; // Flexible label access
      if (!classGroups[label]) {
        classGroups[label] = [];
      }
      classGroups[label].push(item);
    }

    // Create folds
    const foldArrays: T[][] = Array(folds)
      .fill(null)
      .map(() => []);

    // Distribute each class across folds
    for (const [_className, classData] of Object.entries(classGroups)) {
      const shuffledData = this.shuffleArray([...classData]);

      for (let i = 0; i < shuffledData.length; i++) {
        const foldIndex = i % folds;
        foldArrays[foldIndex].push(shuffledData[i]);
      }
    }

    return foldArrays;
  }

  /**
   * Calculate average metrics across folds
   */
  private calculateAverageMetrics(
    metricsArray: PerformanceMetrics[],
  ): PerformanceMetrics {
    const severities: VulnerabilitySeverity[] = [
      "info",
      "low",
      "medium",
      "high",
      "critical",
    ];
    const numFolds = metricsArray.length;

    // Average scalars
    const accuracy =
      metricsArray.reduce(
        (sum: number, m: PerformanceMetrics) => sum + m.accuracy,
        0,
      ) / numFolds;
    const totalSamples = metricsArray.reduce(
      (sum: number, m: PerformanceMetrics) => sum + m.totalSamples,
      0,
    );

    // Average per-class metrics
    const precision: Record<VulnerabilitySeverity, number> = {} as Record<
      VulnerabilitySeverity,
      number
    >;
    const recall: Record<VulnerabilitySeverity, number> = {} as Record<
      VulnerabilitySeverity,
      number
    >;
    const f1Score: Record<VulnerabilitySeverity, number> = {} as Record<
      VulnerabilitySeverity,
      number
    >;
    const specificity: Record<VulnerabilitySeverity, number> = {} as Record<
      VulnerabilitySeverity,
      number
    >;

    for (const severity of severities) {
      precision[severity] =
        metricsArray.reduce(
          (sum: number, m: PerformanceMetrics) => sum + m.precision[severity],
          0,
        ) / numFolds;
      recall[severity] =
        metricsArray.reduce(
          (sum: number, m: PerformanceMetrics) => sum + m.recall[severity],
          0,
        ) / numFolds;
      f1Score[severity] =
        metricsArray.reduce(
          (sum: number, m: PerformanceMetrics) => sum + m.f1Score[severity],
          0,
        ) / numFolds;
      specificity[severity] =
        metricsArray.reduce(
          (sum: number, m: PerformanceMetrics) => sum + m.specificity[severity],
          0,
        ) / numFolds;
    }

    // Average macro/weighted averages
    const macroAverages = {
      precision:
        metricsArray.reduce(
          (sum: number, m: PerformanceMetrics) =>
            sum + m.macroAverages.precision,
          0,
        ) / numFolds,
      recall:
        metricsArray.reduce(
          (sum: number, m: PerformanceMetrics) => sum + m.macroAverages.recall,
          0,
        ) / numFolds,
      f1Score:
        metricsArray.reduce(
          (sum: number, m: PerformanceMetrics) => sum + m.macroAverages.f1Score,
          0,
        ) / numFolds,
      specificity:
        metricsArray.reduce(
          (sum: number, m: PerformanceMetrics) =>
            sum + m.macroAverages.specificity,
          0,
        ) / numFolds,
    };

    const weightedAverages = {
      precision:
        metricsArray.reduce(
          (sum: number, m: PerformanceMetrics) =>
            sum + m.weightedAverages.precision,
          0,
        ) / numFolds,
      recall:
        metricsArray.reduce(
          (sum: number, m: PerformanceMetrics) =>
            sum + m.weightedAverages.recall,
          0,
        ) / numFolds,
      f1Score:
        metricsArray.reduce(
          (sum: number, m: PerformanceMetrics) =>
            sum + m.weightedAverages.f1Score,
          0,
        ) / numFolds,
      specificity:
        metricsArray.reduce(
          (sum: number, m: PerformanceMetrics) =>
            sum + m.weightedAverages.specificity,
          0,
        ) / numFolds,
    };

    // Average confusion matrix and class distribution
    const confusionMatrix: Record<
      VulnerabilitySeverity,
      Record<VulnerabilitySeverity, number>
    > = {} as Record<
      VulnerabilitySeverity,
      Record<VulnerabilitySeverity, number>
    >;
    const classDistribution: Record<VulnerabilitySeverity, number> =
      {} as Record<VulnerabilitySeverity, number>;

    for (const severity of severities) {
      confusionMatrix[severity] = {} as Record<VulnerabilitySeverity, number>;
      classDistribution[severity] = 0;

      for (const predSeverity of severities) {
        confusionMatrix[severity][predSeverity] =
          metricsArray.reduce(
            (sum: number, m: PerformanceMetrics) =>
              sum + m.confusionMatrix[severity][predSeverity],
            0,
          ) / numFolds;
      }

      classDistribution[severity] =
        metricsArray.reduce(
          (sum: number, m: PerformanceMetrics) =>
            sum + m.classDistribution[severity],
          0,
        ) / numFolds;
    }

    return {
      accuracy,
      precision,
      recall,
      f1Score,
      specificity,
      macroAverages,
      weightedAverages,
      confusionMatrix,
      classDistribution,
      totalSamples,
    };
  }

  /**
   * Calculate standard deviations across folds
   */
  private calculateStandardDeviations(
    metricsArray: PerformanceMetrics[],
  ): CrossValidationResults["standardDeviations"] {
    const severities: VulnerabilitySeverity[] = [
      "info",
      "low",
      "medium",
      "high",
      "critical",
    ];
    const numFolds = metricsArray.length;

    // Calculate means first
    const meanAccuracy =
      metricsArray.reduce(
        (sum: number, m: PerformanceMetrics) => sum + m.accuracy,
        0,
      ) / numFolds;

    const meanPrecision: Record<VulnerabilitySeverity, number> = {} as Record<
      VulnerabilitySeverity,
      number
    >;
    const meanRecall: Record<VulnerabilitySeverity, number> = {} as Record<
      VulnerabilitySeverity,
      number
    >;
    const meanF1Score: Record<VulnerabilitySeverity, number> = {} as Record<
      VulnerabilitySeverity,
      number
    >;

    for (const severity of severities) {
      meanPrecision[severity] =
        metricsArray.reduce(
          (sum: number, m: PerformanceMetrics) => sum + m.precision[severity],
          0,
        ) / numFolds;
      meanRecall[severity] =
        metricsArray.reduce(
          (sum: number, m: PerformanceMetrics) => sum + m.recall[severity],
          0,
        ) / numFolds;
      meanF1Score[severity] =
        metricsArray.reduce(
          (sum: number, m: PerformanceMetrics) => sum + m.f1Score[severity],
          0,
        ) / numFolds;
    }

    // Calculate variances
    const accuracyVariance =
      metricsArray.reduce(
        (sum: number, m: PerformanceMetrics) =>
          sum + Math.pow(m.accuracy - meanAccuracy, 2),
        0,
      ) /
      (numFolds - 1);

    const precisionVariance: Record<VulnerabilitySeverity, number> =
      {} as Record<VulnerabilitySeverity, number>;
    const recallVariance: Record<VulnerabilitySeverity, number> = {} as Record<
      VulnerabilitySeverity,
      number
    >;
    const f1ScoreVariance: Record<VulnerabilitySeverity, number> = {} as Record<
      VulnerabilitySeverity,
      number
    >;

    for (const severity of severities) {
      precisionVariance[severity] =
        metricsArray.reduce(
          (sum: number, m: PerformanceMetrics) =>
            sum + Math.pow(m.precision[severity] - meanPrecision[severity], 2),
          0,
        ) /
        (numFolds - 1);
      recallVariance[severity] =
        metricsArray.reduce(
          (sum: number, m: PerformanceMetrics) =>
            sum + Math.pow(m.recall[severity] - meanRecall[severity], 2),
          0,
        ) /
        (numFolds - 1);
      f1ScoreVariance[severity] =
        metricsArray.reduce(
          (sum: number, m: PerformanceMetrics) =>
            sum + Math.pow(m.f1Score[severity] - meanF1Score[severity], 2),
          0,
        ) /
        (numFolds - 1);
    }

    // Convert to standard deviations
    const accuracy = Math.sqrt(accuracyVariance);

    const precision: Record<VulnerabilitySeverity, number> = {} as Record<
      VulnerabilitySeverity,
      number
    >;
    const recall: Record<VulnerabilitySeverity, number> = {} as Record<
      VulnerabilitySeverity,
      number
    >;
    const f1Score: Record<VulnerabilitySeverity, number> = {} as Record<
      VulnerabilitySeverity,
      number
    >;

    for (const severity of severities) {
      precision[severity] = Math.sqrt(precisionVariance[severity]);
      recall[severity] = Math.sqrt(recallVariance[severity]);
      f1Score[severity] = Math.sqrt(f1ScoreVariance[severity]);
    }

    return {
      accuracy,
      precision,
      recall,
      f1Score,
    };
  }

  /**
   * Calculate confidence intervals
   */
  private calculateConfidenceIntervals(
    metricsArray: PerformanceMetrics[],
  ): CrossValidationResults["confidenceIntervals"] {
    const numFolds = metricsArray.length;
    const tValue = this.getTValue(
      numFolds - 1,
      this.config.confidenceInterval.level,
    );

    // Accuracy confidence interval
    const accuracies = metricsArray.map((m: PerformanceMetrics) => m.accuracy);
    const meanAccuracy =
      accuracies.reduce((sum: number, acc: number) => sum + acc, 0) / numFolds;
    const accuracyStd = Math.sqrt(
      accuracies.reduce(
        (sum: number, acc: number) => sum + Math.pow(acc - meanAccuracy, 2),
        0,
      ) /
        (numFolds - 1),
    );
    const accuracyMargin = (tValue * accuracyStd) / Math.sqrt(numFolds);

    // Macro F1 confidence interval
    const macroF1s = metricsArray.map(
      (m: PerformanceMetrics) => m.macroAverages.f1Score,
    );
    const meanMacroF1 =
      macroF1s.reduce((sum: number, f1: number) => sum + f1, 0) / numFolds;
    const macroF1Std = Math.sqrt(
      macroF1s.reduce(
        (sum: number, f1: number) => sum + Math.pow(f1 - meanMacroF1, 2),
        0,
      ) /
        (numFolds - 1),
    );
    const macroF1Margin = (tValue * macroF1Std) / Math.sqrt(numFolds);

    return {
      accuracy: {
        lower: meanAccuracy - accuracyMargin,
        upper: meanAccuracy + accuracyMargin,
      },
      macroF1: {
        lower: meanMacroF1 - macroF1Margin,
        upper: meanMacroF1 + macroF1Margin,
      },
    };
  }

  /**
   * Analyze learning curve trend
   */
  private analyzeLearningTrend(
    trainingScores: number[],
    validationScores: number[],
  ): LearningCurveData["overallTrend"] {
    if (trainingScores.length < 2 || validationScores.length < 2) {
      return "stable";
    }

    const lastTrainingScore = trainingScores[trainingScores.length - 1];
    const lastValidationScore = validationScores[validationScores.length - 1];
    const firstValidationScore = validationScores[0];

    // Check for overfitting (large gap between training and validation)
    const gap = lastTrainingScore - lastValidationScore;
    if (gap > 0.15) {
      return "overfitting";
    }

    // Check improvement trend
    const validationImprovement = lastValidationScore - firstValidationScore;
    if (validationImprovement > 0.05) {
      return "improving";
    } else if (validationImprovement < -0.05) {
      return "declining";
    }

    return "stable";
  }

  /**
   * Find convergence point in learning curve
   */
  private findConvergencePoint(
    trainingSizes: number[],
    validationScores: number[],
  ): number | null {
    if (validationScores.length < 3) {
      return null;
    }

    // Look for point where improvement becomes minimal
    const threshold = 0.01;
    for (let i = 2; i < validationScores.length; i++) {
      const recentImprovement = validationScores[i] - validationScores[i - 1];
      const previousImprovement =
        validationScores[i - 1] - validationScores[i - 2];

      if (
        Math.abs(recentImprovement) < threshold &&
        Math.abs(previousImprovement) < threshold
      ) {
        return trainingSizes[i - 1];
      }
    }

    return null;
  }

  /**
   * Get t-value for confidence intervals
   */
  private getTValue(
    degreesOfFreedom: number,
    _confidenceLevel: number,
  ): number {
    // Simplified t-table lookup (in practice would use statistical library)
    const tTable: Record<number, number> = {
      1: 12.706,
      2: 4.303,
      3: 3.182,
      4: 2.776,
      5: 2.571,
      6: 2.447,
      7: 2.365,
      8: 2.306,
      9: 2.262,
      10: 2.228,
    };

    return tTable[Math.min(degreesOfFreedom, 10)] || 2.0; // Default to 2.0 for larger df
  }

  /**
   * Shuffle array in place
   */
  private shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
}

/**
 * Export default instance with standard configuration
 */
export const defaultMLPerformanceMetrics = new MLPerformanceMetrics({
  crossValidation: {
    enabled: true,
    folds: 5,
    stratified: true,
    shuffle: true,
    randomState: 42,
  },
  confidenceInterval: {
    level: 0.95,
    method: "bootstrap",
    bootstrapSamples: 1000,
  },
  reporting: {
    includeConfusionMatrix: true,
    includeClassificationReport: true,
    includeFeatureImportance: true,
    verboseOutput: false,
  },
  thresholds: {
    minAccuracy: 0.75,
    minF1Score: 0.7,
    maxTrainingTime: 600000, // 10 minutes
    significanceLevel: 0.05,
  },
});

/**
 * Export types and main class
 */
export { MLPerformanceMetrics as default };
