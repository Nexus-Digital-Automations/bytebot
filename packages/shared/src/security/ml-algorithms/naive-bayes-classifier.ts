/**
 * Naive Bayes Classifier for Vulnerability Pattern Detection
 *
 * Enterprise-grade Naive Bayes implementation for text classification of security vulnerabilities
 * with feature extraction, probability calculation, and production-ready performance optimization.
 *
 * @fileoverview Naive Bayes Classifier - Core ML Algorithm Implementation
 * @version 2.0.0
 * @author ML Algorithms Team - Advanced Security Framework
 */

import { performance } from "perf_hooks";
import { VulnerabilitySeverity } from "../owasp-top10-integration.service";
import { VulnerabilityCategory } from "../vulnerability-assessment-engine";

// ===========================
// CORE TYPES AND INTERFACES
// ===========================

export interface NaiveBayesFeatures {
  /** TF-IDF feature vector */
  readonly tfidf: Record<string, number>;
  /** N-gram features */
  readonly ngrams: Record<string, number>;
  /** Security-specific features */
  readonly securityFeatures: Record<string, number>;
  /** Metadata features */
  readonly metadata: Record<string, number>;
}

export interface NaiveBayesTrainingData {
  readonly features: NaiveBayesFeatures;
  readonly label: VulnerabilitySeverity;
  readonly category: VulnerabilityCategory;
  readonly description: string;
  readonly weight: number;
}

export interface NaiveBayesPrediction {
  readonly predictedLabel: VulnerabilitySeverity;
  readonly confidence: number;
  readonly probabilities: Record<VulnerabilitySeverity, number>;
  readonly featureImportance: Record<string, number>;
  readonly processingTime: number;
}

export interface NaiveBayesModel {
  /** Class prior probabilities */
  readonly classPriors: Record<VulnerabilitySeverity, number>;
  /** Feature likelihoods per class */
  readonly featureLikelihoods: Record<
    VulnerabilitySeverity,
    Record<string, number>
  >;
  /** Feature vocabulary */
  readonly vocabulary: Set<string>;
  /** Model metadata */
  readonly metadata: {
    readonly trainingDataSize: number;
    readonly featureCount: number;
    readonly classDistribution: Record<VulnerabilitySeverity, number>;
    readonly trainedAt: Date;
    readonly version: string;
  };
}

export interface NaiveBayesConfig {
  /** Smoothing parameter (Laplace smoothing) */
  readonly alpha: number;
  /** Feature frequency threshold */
  readonly minFeatureFreq: number;
  /** Maximum vocabulary size */
  readonly maxVocabularySize: number;
  /** N-gram size for feature extraction */
  readonly ngramSize: number;
  /** TF-IDF normalization */
  readonly normalizeTfIdf: boolean;
  /** Enable feature selection */
  readonly enableFeatureSelection: boolean;
  /** Performance optimization settings */
  readonly optimization: {
    readonly batchSize: number;
    readonly parallelProcessing: boolean;
    readonly memoryOptimization: boolean;
  };
}

// ===========================
// NAIVE BAYES CLASSIFIER IMPLEMENTATION
// ===========================

/**
 * Naive Bayes Classifier for Vulnerability Pattern Detection
 *
 * Implements multinomial Naive Bayes with Laplace smoothing, TF-IDF feature extraction,
 * and advanced optimization for real-time vulnerability classification.
 */
export class NaiveBayesClassifier {
  private model: NaiveBayesModel | null = null;
  private readonly config: NaiveBayesConfig;
  private readonly logger: Console;
  private trainingStats: {
    totalTrainingTime: number;
    averagePredictionTime: number;
    predictionCount: number;
  } = {
    totalTrainingTime: 0,
    averagePredictionTime: 0,
    predictionCount: 0,
  };

  constructor(config?: Partial<NaiveBayesConfig>) {
    this.config = {
      alpha: 1.0, // Laplace smoothing
      minFeatureFreq: 2,
      maxVocabularySize: 10000,
      ngramSize: 3,
      normalizeTfIdf: true,
      enableFeatureSelection: true,
      optimization: {
        batchSize: 1000,
        parallelProcessing: true,
        memoryOptimization: true,
      },
      ...config,
    };
    this.logger = console;
  }

  /**
   * Train the Naive Bayes classifier on vulnerability data
   */
  public async train(
    trainingData: readonly NaiveBayesTrainingData[],
  ): Promise<void> {
    const startTime = performance.now();
    this.logger.info(
      `Training Naive Bayes classifier on ${trainingData.length} samples...`,
    );

    try {
      // Validate training data
      this.validateTrainingData(trainingData);

      // Build vocabulary and extract features
      const { vocabulary, processedData } =
        await this.preprocessTrainingData(trainingData);

      // Calculate class priors
      const classPriors = this.calculateClassPriors(processedData);

      // Calculate feature likelihoods
      const featureLikelihoods = this.calculateFeatureLikelihoods(
        processedData,
        vocabulary,
      );

      // Calculate class distribution
      const classDistribution = this.calculateClassDistribution(processedData);

      // Create trained model
      this.model = {
        classPriors,
        featureLikelihoods,
        vocabulary,
        metadata: {
          trainingDataSize: trainingData.length,
          featureCount: vocabulary.size,
          classDistribution,
          trainedAt: new Date(),
          version: "2.0.0",
        },
      };

      const duration = performance.now() - startTime;
      this.trainingStats.totalTrainingTime = duration;

      this.logger.info(
        `Naive Bayes training completed in ${duration.toFixed(2)}ms - ` +
          `Vocabulary: ${vocabulary.size} features, Classes: ${Object.keys(classPriors).length}`,
      );
    } catch (error) {
      this.logger.error("Naive Bayes training failed:", error);
      throw new Error(
        `Training failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Predict vulnerability severity using trained model
   */
  public async predict(
    features: NaiveBayesFeatures,
  ): Promise<NaiveBayesPrediction> {
    const startTime = performance.now();

    if (!this.model) {
      throw new Error("Model not trained. Call train() first.");
    }

    try {
      // Extract relevant features from input
      const relevantFeatures = this.extractRelevantFeatures(features);

      // Calculate log probabilities for each class
      const logProbabilities = this.calculateLogProbabilities(relevantFeatures);

      // Convert to probabilities and normalize
      const probabilities = this.normalizeProbabilities(logProbabilities);

      // Find predicted class
      const predictedLabel = this.getPredictedClass(probabilities);

      // Calculate confidence
      const confidence = this.calculateConfidence(probabilities);

      // Calculate feature importance
      const featureImportance = this.calculateFeatureImportance(
        relevantFeatures,
        predictedLabel,
      );

      const processingTime = performance.now() - startTime;

      // Update prediction statistics
      this.updatePredictionStats(processingTime);

      return {
        predictedLabel,
        confidence,
        probabilities,
        featureImportance,
        processingTime,
      };
    } catch (error) {
      this.logger.error("Naive Bayes prediction failed:", error);
      throw new Error(
        `Prediction failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Batch predict multiple samples for efficiency
   */
  public async predictBatch(
    featuresArray: readonly NaiveBayesFeatures[],
  ): Promise<NaiveBayesPrediction[]> {
    const startTime = performance.now();

    if (!this.model) {
      throw new Error("Model not trained. Call train() first.");
    }

    try {
      const results: NaiveBayesPrediction[] = [];
      const batchSize = this.config.optimization.batchSize;

      // Process in batches for memory optimization
      for (let i = 0; i < featuresArray.length; i += batchSize) {
        const batch = featuresArray.slice(i, i + batchSize);

        const batchResults = await Promise.all(
          batch.map((features) => this.predict(features)),
        );

        results.push(...batchResults);
      }

      const totalTime = performance.now() - startTime;
      this.logger.info(
        `Batch prediction completed: ${featuresArray.length} samples in ${totalTime.toFixed(2)}ms`,
      );

      return results;
    } catch (error) {
      this.logger.error("Batch prediction failed:", error);
      throw new Error(
        `Batch prediction failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Get model information and statistics
   */
  public getModelInfo(): {
    readonly isTrained: boolean;
    readonly model: NaiveBayesModel | null;
    readonly config: NaiveBayesConfig;
    readonly stats: {
      totalTrainingTime: number;
      averagePredictionTime: number;
      predictionCount: number;
    };
  } {
    return {
      isTrained: this.model !== null,
      model: this.model,
      config: this.config,
      stats: { ...this.trainingStats },
    };
  }

  /**
   * Export trained model for persistence
   */
  public exportModel(): string {
    if (!this.model) {
      throw new Error("No trained model to export");
    }

    try {
      return JSON.stringify({
        model: {
          classPriors: this.model.classPriors,
          featureLikelihoods: this.model.featureLikelihoods,
          vocabulary: Array.from(this.model.vocabulary),
          metadata: this.model.metadata,
        },
        config: this.config,
        stats: this.trainingStats,
      });
    } catch (error) {
      throw new Error(
        `Model export failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Import previously trained model
   */
  public importModel(modelData: string): void {
    try {
      const parsed = JSON.parse(modelData);

      this.model = {
        classPriors: parsed.model.classPriors,
        featureLikelihoods: parsed.model.featureLikelihoods,
        vocabulary: new Set(parsed.model.vocabulary),
        metadata: {
          ...parsed.model.metadata,
          trainedAt: new Date(parsed.model.metadata.trainedAt),
        },
      };

      if (parsed.stats) {
        this.trainingStats = parsed.stats;
      }

      this.logger.info(
        `Model imported successfully: ${this.model.vocabulary.size} features`,
      );
    } catch (error) {
      throw new Error(
        `Model import failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // ===========================
  // PRIVATE METHODS
  // ===========================

  /**
   * Validate training data integrity
   */
  private validateTrainingData(data: readonly NaiveBayesTrainingData[]): void {
    if (data.length === 0) {
      throw new Error("Training data cannot be empty");
    }

    const validSeverities: VulnerabilitySeverity[] = [
      VulnerabilitySeverity.INFO,
      VulnerabilitySeverity.LOW,
      VulnerabilitySeverity.MEDIUM,
      VulnerabilitySeverity.HIGH,
      VulnerabilitySeverity.CRITICAL,
    ];

    for (const sample of data) {
      if (!validSeverities.includes(sample.label)) {
        throw new Error(`Invalid label: ${sample.label}`);
      }

      if (sample.weight <= 0) {
        throw new Error(`Invalid weight: ${sample.weight}`);
      }
    }

    // Check class distribution
    const classCount = data.reduce(
      (acc, sample) => {
        acc[sample.label] = (acc[sample.label] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const minSamplesPerClass = 5;
    for (const [className, count] of Object.entries(classCount)) {
      if (count < minSamplesPerClass) {
        this.logger.warn(
          `Low sample count for class ${className}: ${count} samples`,
        );
      }
    }
  }

  /**
   * Preprocess training data and build vocabulary
   */
  private async preprocessTrainingData(
    data: readonly NaiveBayesTrainingData[],
  ): Promise<{
    vocabulary: Set<string>;
    processedData: Array<{
      features: Record<string, number>;
      label: VulnerabilitySeverity;
      weight: number;
    }>;
  }> {
    // Collect all features and their frequencies
    const featureFreqs = new Map<string, number>();
    const processedData: Array<{
      features: Record<string, number>;
      label: VulnerabilitySeverity;
      weight: number;
    }> = [];

    // First pass: collect feature frequencies
    for (const sample of data) {
      const allFeatures = {
        ...sample.features.tfidf,
        ...sample.features.ngrams,
        ...sample.features.securityFeatures,
        ...sample.features.metadata,
      };

      for (const feature of Object.keys(allFeatures)) {
        featureFreqs.set(feature, (featureFreqs.get(feature) || 0) + 1);
      }
    }

    // Filter features by frequency threshold
    const vocabulary = new Set<string>();
    for (const [feature, freq] of Array.from(featureFreqs.entries())) {
      if (freq >= this.config.minFeatureFreq) {
        vocabulary.add(feature);
      }
    }

    // Limit vocabulary size if needed
    if (vocabulary.size > this.config.maxVocabularySize) {
      const sortedFeatures = Array.from(featureFreqs.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, this.config.maxVocabularySize);

      vocabulary.clear();
      for (const [feature] of sortedFeatures) {
        vocabulary.add(feature);
      }
    }

    // Second pass: process training samples with filtered vocabulary
    for (const sample of data) {
      const allFeatures = {
        ...sample.features.tfidf,
        ...sample.features.ngrams,
        ...sample.features.securityFeatures,
        ...sample.features.metadata,
      };

      const filteredFeatures: Record<string, number> = {};
      for (const [feature, value] of Object.entries(allFeatures)) {
        if (vocabulary.has(feature)) {
          filteredFeatures[feature] = value;
        }
      }

      processedData.push({
        features: filteredFeatures,
        label: sample.label,
        weight: sample.weight,
      });
    }

    return { vocabulary, processedData };
  }

  /**
   * Calculate class prior probabilities
   */
  private calculateClassPriors(
    data: Array<{
      features: Record<string, number>;
      label: VulnerabilitySeverity;
      weight: number;
    }>,
  ): Record<VulnerabilitySeverity, number> {
    const classCounts: Record<VulnerabilitySeverity, number> = {} as Record<
      VulnerabilitySeverity,
      number
    >;
    let totalWeight = 0;

    // Count weighted samples per class
    for (const sample of data) {
      classCounts[sample.label] =
        (classCounts[sample.label] || 0) + sample.weight;
      totalWeight += sample.weight;
    }

    // Calculate probabilities with smoothing
    const classPriors: Record<VulnerabilitySeverity, number> = {} as Record<
      VulnerabilitySeverity,
      number
    >;
    const numClasses = Object.keys(classCounts).length;

    const severities: VulnerabilitySeverity[] = [
      VulnerabilitySeverity.INFO,
      VulnerabilitySeverity.LOW,
      VulnerabilitySeverity.MEDIUM,
      VulnerabilitySeverity.HIGH,
      VulnerabilitySeverity.CRITICAL,
    ];
    for (const severity of severities) {
      const count = classCounts[severity] || 0;
      classPriors[severity] =
        (count + this.config.alpha) /
        (totalWeight + this.config.alpha * numClasses);
    }

    return classPriors;
  }

  /**
   * Calculate feature likelihoods for each class
   */
  private calculateFeatureLikelihoods(
    data: Array<{
      features: Record<string, number>;
      label: VulnerabilitySeverity;
      weight: number;
    }>,
    vocabulary: Set<string>,
  ): Record<VulnerabilitySeverity, Record<string, number>> {
    const likelihoods: Record<
      VulnerabilitySeverity,
      Record<string, number>
    > = {} as Record<VulnerabilitySeverity, Record<string, number>>;

    // Initialize likelihood structures
    const severities: VulnerabilitySeverity[] = [
      VulnerabilitySeverity.INFO,
      VulnerabilitySeverity.LOW,
      VulnerabilitySeverity.MEDIUM,
      VulnerabilitySeverity.HIGH,
      VulnerabilitySeverity.CRITICAL,
    ];
    for (const severity of severities) {
      likelihoods[severity] = {};
      for (const feature of Array.from(vocabulary)) {
        likelihoods[severity][feature] = 0;
      }
    }

    // Count feature occurrences per class
    const classTotals: Record<VulnerabilitySeverity, number> = {} as Record<
      VulnerabilitySeverity,
      number
    >;

    for (const sample of data) {
      const className = sample.label;
      classTotals[className] = (classTotals[className] || 0) + sample.weight;

      for (const [feature, value] of Object.entries(sample.features)) {
        if (vocabulary.has(feature)) {
          likelihoods[className][feature] += value * sample.weight;
        }
      }
    }

    // Apply Laplace smoothing and normalize
    const vocabularySize = vocabulary.size;

    for (const severity of severities) {
      const classTotal = classTotals[severity] || 0;
      const denominator = classTotal + this.config.alpha * vocabularySize;

      for (const feature of Array.from(vocabulary)) {
        const numerator = likelihoods[severity][feature] + this.config.alpha;
        likelihoods[severity][feature] = numerator / denominator;
      }
    }

    return likelihoods;
  }

  /**
   * Calculate class distribution in training data
   */
  private calculateClassDistribution(
    data: Array<{
      label: VulnerabilitySeverity;
      weight: number;
    }>,
  ): Record<VulnerabilitySeverity, number> {
    const distribution: Record<VulnerabilitySeverity, number> = {} as Record<
      VulnerabilitySeverity,
      number
    >;

    const severities: VulnerabilitySeverity[] = [
      VulnerabilitySeverity.INFO,
      VulnerabilitySeverity.LOW,
      VulnerabilitySeverity.MEDIUM,
      VulnerabilitySeverity.HIGH,
      VulnerabilitySeverity.CRITICAL,
    ];
    for (const severity of severities) {
      distribution[severity] = 0;
    }

    for (const sample of data) {
      distribution[sample.label] += sample.weight;
    }

    return distribution;
  }

  /**
   * Extract relevant features from input
   */
  private extractRelevantFeatures(
    features: NaiveBayesFeatures,
  ): Record<string, number> {
    if (!this.model) {
      throw new Error("Model not trained");
    }

    const allFeatures = {
      ...features.tfidf,
      ...features.ngrams,
      ...features.securityFeatures,
      ...features.metadata,
    };

    const relevantFeatures: Record<string, number> = {};

    for (const [feature, value] of Object.entries(allFeatures)) {
      if (this.model.vocabulary.has(feature)) {
        relevantFeatures[feature] = value;
      }
    }

    return relevantFeatures;
  }

  /**
   * Calculate log probabilities for each class
   */
  private calculateLogProbabilities(
    features: Record<string, number>,
  ): Record<VulnerabilitySeverity, number> {
    if (!this.model) {
      throw new Error("Model not trained");
    }

    const logProbabilities: Record<VulnerabilitySeverity, number> =
      {} as Record<VulnerabilitySeverity, number>;

    const severities: VulnerabilitySeverity[] = [
      VulnerabilitySeverity.INFO,
      VulnerabilitySeverity.LOW,
      VulnerabilitySeverity.MEDIUM,
      VulnerabilitySeverity.HIGH,
      VulnerabilitySeverity.CRITICAL,
    ];
    for (const severity of severities) {
      // Start with log prior
      let logProb = Math.log(this.model.classPriors[severity]);

      // Add log likelihoods for each feature
      for (const [feature, value] of Object.entries(features)) {
        if (value > 0) {
          const likelihood = this.model.featureLikelihoods[severity][feature];
          if (likelihood > 0) {
            logProb += value * Math.log(likelihood);
          }
        }
      }

      logProbabilities[severity] = logProb;
    }

    return logProbabilities;
  }

  /**
   * Normalize log probabilities to probabilities
   */
  private normalizeProbabilities(
    logProbabilities: Record<VulnerabilitySeverity, number>,
  ): Record<VulnerabilitySeverity, number> {
    // Find maximum for numerical stability
    const maxLogProb = Math.max(...Object.values(logProbabilities));

    // Convert to probabilities
    let totalProb = 0;
    const probabilities: Record<VulnerabilitySeverity, number> = {} as Record<
      VulnerabilitySeverity,
      number
    >;

    const severities: VulnerabilitySeverity[] = [
      VulnerabilitySeverity.INFO,
      VulnerabilitySeverity.LOW,
      VulnerabilitySeverity.MEDIUM,
      VulnerabilitySeverity.HIGH,
      VulnerabilitySeverity.CRITICAL,
    ];
    for (const severity of severities) {
      probabilities[severity] = Math.exp(
        logProbabilities[severity] - maxLogProb,
      );
      totalProb += probabilities[severity];
    }

    // Normalize
    for (const severity of severities) {
      probabilities[severity] /= totalProb;
    }

    return probabilities;
  }

  /**
   * Get predicted class with highest probability
   */
  private getPredictedClass(
    probabilities: Record<VulnerabilitySeverity, number>,
  ): VulnerabilitySeverity {
    let maxProb = -1;
    let predictedClass: VulnerabilitySeverity = VulnerabilitySeverity.LOW;

    for (const [severity, prob] of Object.entries(probabilities) as [
      VulnerabilitySeverity,
      number,
    ][]) {
      if (prob > maxProb) {
        maxProb = prob;
        predictedClass = severity;
      }
    }

    return predictedClass;
  }

  /**
   * Calculate prediction confidence
   */
  private calculateConfidence(
    probabilities: Record<VulnerabilitySeverity, number>,
  ): number {
    const sortedProbs = Object.values(probabilities).sort((a, b) => b - a);

    if (sortedProbs.length < 2) {
      return sortedProbs[0] || 0;
    }

    // Confidence based on gap between top two predictions
    const confidence = sortedProbs[0] - sortedProbs[1];
    return Math.min(1, Math.max(0, confidence));
  }

  /**
   * Calculate feature importance for prediction
   */
  private calculateFeatureImportance(
    features: Record<string, number>,
    predictedClass: VulnerabilitySeverity,
  ): Record<string, number> {
    if (!this.model) {
      throw new Error("Model not trained");
    }

    const importance: Record<string, number> = {};

    for (const [feature, value] of Object.entries(features)) {
      if (value > 0) {
        const likelihood =
          this.model.featureLikelihoods[predictedClass][feature];
        importance[feature] = value * Math.log(likelihood);
      }
    }

    return importance;
  }

  /**
   * Update prediction statistics
   */
  private updatePredictionStats(processingTime: number): void {
    this.trainingStats.predictionCount++;

    // Update moving average
    const alpha = 0.1;
    this.trainingStats.averagePredictionTime =
      alpha * processingTime +
      (1 - alpha) * this.trainingStats.averagePredictionTime;
  }
}

/**
 * Export default instance with optimized configuration
 */
export const defaultNaiveBayesClassifier = new NaiveBayesClassifier({
  alpha: 1.0,
  minFeatureFreq: 3,
  maxVocabularySize: 8000,
  ngramSize: 3,
  normalizeTfIdf: true,
  enableFeatureSelection: true,
  optimization: {
    batchSize: 500,
    parallelProcessing: true,
    memoryOptimization: true,
  },
});

/**
 * Export types and main class
 */
export { NaiveBayesClassifier as default };
