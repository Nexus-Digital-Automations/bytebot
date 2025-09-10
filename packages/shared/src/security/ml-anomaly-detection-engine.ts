/**
 * ML Anomaly Detection Engine for Security Threat Detection
 *
 * Enterprise-grade anomaly detection system using ensemble methods including
 * Isolation Forest, Local Outlier Factor, and Statistical Z-Score analysis
 * for comprehensive security threat pattern recognition.
 *
 * @fileoverview ML Anomaly Detection Engine - Advanced Security Implementation
 * @version 2.0.0
 * @author ML Security Team - Advanced Threat Detection Framework
 */

import { performance } from "perf_hooks";
import { VulnerabilitySeverity } from "./owasp-top10-integration.service";
import { VulnerabilityCategory } from "./vulnerability-assessment-engine";

// ===========================
// CORE TYPES AND INTERFACES
// ===========================

/** Anomaly detection features input */
export interface AnomalyDetectionFeatures {
  /** Normalized feature vector */
  readonly features: readonly number[];
  /** Feature names for interpretation */
  readonly featureNames: readonly string[];
  /** Timestamp of the observation */
  readonly timestamp: Date;
  /** Source identifier */
  readonly source: string;
}

/** Training data for anomaly detection */
export interface AnomalyTrainingData {
  readonly features: AnomalyDetectionFeatures;
  readonly isAnomaly: boolean;
  readonly severity: VulnerabilitySeverity;
  readonly category: VulnerabilityCategory;
  readonly weight: number;
  readonly description: string;
}

/** Isolation tree node */
export interface IsolationTreeNode {
  readonly isLeaf: boolean;
  readonly splitFeature: number | null;
  readonly splitValue: number | null;
  readonly left: IsolationTreeNode | null;
  readonly right: IsolationTreeNode | null;
  readonly size: number;
  readonly height: number;
}

/** Local Outlier Factor data point */
export interface LOFDataPoint {
  readonly features: readonly number[];
  readonly index: number;
  readonly kDistance: number;
  readonly reachabilityDistance: number[];
  readonly lrd: number;
  readonly lof: number;
}

/** Anomaly detection result */
export interface AnomalyDetectionResult {
  readonly isAnomaly: boolean;
  readonly anomalyScore: number;
  readonly confidence: number;
  readonly severity: VulnerabilitySeverity;
  readonly detectionMethods: {
    readonly isolationForest: {
      readonly score: number;
      readonly pathLength: number;
      readonly threshold: number;
    };
    readonly localOutlierFactor: {
      readonly score: number;
      readonly lrd: number;
      readonly threshold: number;
    };
    readonly statisticalZScore: {
      readonly score: number;
      readonly maxZScore: number;
      readonly threshold: number;
    };
  };
  readonly featureContributions: Record<string, number>;
  readonly processingTime: number;
  readonly explanation: string;
}

/** Model configuration */
export interface AnomalyDetectionConfig {
  /** Isolation Forest parameters */
  readonly isolationForest: {
    readonly numberOfTrees: number;
    readonly subsampleSize: number;
    readonly maxTreeHeight: number;
    readonly anomalyThreshold: number;
  };
  /** Local Outlier Factor parameters */
  readonly localOutlierFactor: {
    readonly k: number;
    readonly threshold: number;
    readonly distanceMetric: "euclidean" | "manhattan" | "cosine";
  };
  /** Statistical analysis parameters */
  readonly statistical: {
    readonly zScoreThreshold: number;
    readonly windowSize: number;
    readonly adaptiveThreshold: boolean;
  };
  /** Ensemble parameters */
  readonly ensemble: {
    readonly weights: {
      readonly isolationForest: number;
      readonly localOutlierFactor: number;
      readonly statistical: number;
    };
    readonly votingStrategy: "weighted" | "majority" | "unanimous";
    readonly confidenceThreshold: number;
  };
  /** Performance optimization */
  readonly optimization: {
    readonly batchSize: number;
    readonly parallelProcessing: boolean;
    readonly memoryOptimization: boolean;
    readonly cacheSize: number;
  };
  /** Random seed for reproducibility */
  readonly randomSeed: number | null;
}

/** Trained anomaly detection model */
export interface AnomalyDetectionModel {
  readonly isolationForest: {
    readonly trees: readonly IsolationTreeNode[];
    readonly subsampleSize: number;
    readonly averagePathLength: number;
  };
  readonly localOutlierFactor: {
    readonly trainingData: readonly LOFDataPoint[];
    readonly k: number;
    readonly threshold: number;
  };
  readonly statistical: {
    readonly featureMeans: readonly number[];
    readonly featureStandardDeviations: readonly number[];
    readonly correlationMatrix: readonly (readonly number[])[];
    readonly threshold: number;
  };
  readonly metadata: {
    readonly trainingDataSize: number;
    readonly featureCount: number;
    readonly anomalyRate: number;
    readonly trainedAt: Date;
    readonly version: string;
  };
}

// ===========================
// ANOMALY DETECTION ENGINE IMPLEMENTATION
// ===========================

/**
 * ML Anomaly Detection Engine for Security Threat Detection
 *
 * Implements ensemble anomaly detection using multiple algorithms to provide
 * robust and accurate identification of security threats and anomalous behavior.
 */
export class MLAnomalyDetectionEngine {
  private model: AnomalyDetectionModel | null = null;
  private readonly config: AnomalyDetectionConfig;
  private readonly logger: Console;
  private trainingStats = {
    totalTrainingTime: 0,
    averageDetectionTime: 0,
    detectionCount: 0,
    isolationForestTime: 0,
    lofTime: 0,
    statisticalTime: 0,
  };

  constructor(config?: Partial<AnomalyDetectionConfig>) {
    this.config = {
      isolationForest: {
        numberOfTrees: 100,
        subsampleSize: 256,
        maxTreeHeight: 20,
        anomalyThreshold: 0.6,
      },
      localOutlierFactor: {
        k: 20,
        threshold: 1.5,
        distanceMetric: "euclidean",
      },
      statistical: {
        zScoreThreshold: 3.0,
        windowSize: 100,
        adaptiveThreshold: true,
      },
      ensemble: {
        weights: {
          isolationForest: 0.4,
          localOutlierFactor: 0.35,
          statistical: 0.25,
        },
        votingStrategy: "weighted",
        confidenceThreshold: 0.7,
      },
      optimization: {
        batchSize: 1000,
        parallelProcessing: true,
        memoryOptimization: true,
        cacheSize: 10000,
      },
      randomSeed: 42,
      ...config,
    };
    this.logger = console;
  }

  /**
   * Train the anomaly detection model on historical data
   */
  public async train(
    trainingData: readonly AnomalyTrainingData[],
  ): Promise<void> {
    const startTime = performance.now();
    this.logger.info(
      `Training anomaly detection model on ${trainingData.length} samples...`,
    );

    try {
      // Validate training data
      this.validateTrainingData(trainingData);

      // Prepare features matrix
      const features = trainingData.map(
        (sample) => sample.features.features as number[],
      );
      const labels = trainingData.map((sample) => sample.isAnomaly);

      // Train Isolation Forest
      this.logger.debug("Training Isolation Forest...");
      const isolationForest = await this.trainIsolationForest(features);

      // Train Local Outlier Factor
      this.logger.debug("Training Local Outlier Factor...");
      const localOutlierFactor = await this.trainLocalOutlierFactor(features);

      // Train Statistical Model
      this.logger.debug("Training Statistical Model...");
      const statistical = await this.trainStatisticalModel(features, labels);

      // Calculate anomaly rate
      const anomalyCount = labels.filter((label) => label).length;
      const anomalyRate = anomalyCount / labels.length;

      // Create trained model
      this.model = {
        isolationForest,
        localOutlierFactor,
        statistical,
        metadata: {
          trainingDataSize: trainingData.length,
          featureCount: features[0].length,
          anomalyRate,
          trainedAt: new Date(),
          version: "2.0.0",
        },
      };

      const duration = performance.now() - startTime;
      this.trainingStats.totalTrainingTime = duration;

      this.logger.info(
        `Anomaly detection training completed in ${duration.toFixed(2)}ms - ` +
          `Features: ${features[0].length}, Anomaly Rate: ${(anomalyRate * 100).toFixed(2)}%`,
      );
    } catch (error) {
      this.logger.error("Anomaly detection training failed:", error);
      throw new Error(
        `Training failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Detect anomalies in new data
   */
  public async detect(
    features: AnomalyDetectionFeatures,
  ): Promise<AnomalyDetectionResult> {
    const startTime = performance.now();

    if (!this.model) {
      throw new Error("Model not trained. Call train() first.");
    }

    try {
      const featureVector = features.features as number[];

      // Run ensemble detection
      const isolationResult =
        await this.detectWithIsolationForest(featureVector);
      const lofResult = await this.detectWithLOF(featureVector);
      const statisticalResult = await this.detectWithStatistical(featureVector);

      // Combine results using ensemble strategy
      const ensembleScore = this.combineEnsembleResults(
        isolationResult,
        lofResult,
        statisticalResult,
      );

      // Determine if anomaly
      const isAnomaly =
        ensembleScore > this.config.ensemble.confidenceThreshold;

      // Calculate severity based on score
      const severity = this.calculateSeverity(ensembleScore);

      // Calculate feature contributions
      const featureContributions = await this.calculateFeatureContributions(
        featureVector,
        features.featureNames as string[],
      );

      // Generate explanation
      const explanation = this.generateExplanation(
        isAnomaly,
        ensembleScore,
        isolationResult,
        lofResult,
        statisticalResult,
      );

      const processingTime = performance.now() - startTime;
      this.updateDetectionStats(processingTime);

      return {
        isAnomaly,
        anomalyScore: ensembleScore,
        confidence: this.calculateConfidence(ensembleScore),
        severity,
        detectionMethods: {
          isolationForest: isolationResult,
          localOutlierFactor: lofResult,
          statisticalZScore: statisticalResult,
        },
        featureContributions,
        processingTime,
        explanation,
      };
    } catch (error) {
      this.logger.error("Anomaly detection failed:", error);
      throw new Error(
        `Detection failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Batch detect anomalies for multiple samples
   */
  public async detectBatch(
    featuresArray: readonly AnomalyDetectionFeatures[],
  ): Promise<AnomalyDetectionResult[]> {
    const startTime = performance.now();

    if (!this.model) {
      throw new Error("Model not trained. Call train() first.");
    }

    try {
      const results: AnomalyDetectionResult[] = [];
      const batchSize = this.config.optimization.batchSize;

      // Process in batches for memory optimization
      for (let i = 0; i < featuresArray.length; i += batchSize) {
        const batch = featuresArray.slice(i, i + batchSize);

        const batchResults = await Promise.all(
          batch.map((features) => this.detect(features)),
        );

        results.push(...batchResults);
      }

      const totalTime = performance.now() - startTime;
      this.logger.info(
        `Batch anomaly detection completed: ${featuresArray.length} samples in ${totalTime.toFixed(2)}ms`,
      );

      return results;
    } catch (error) {
      this.logger.error("Batch detection failed:", error);
      throw new Error(
        `Batch detection failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Get model information and statistics
   */
  public getModelInfo() {
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
        model: this.model,
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
        ...parsed.model,
        metadata: {
          ...parsed.model.metadata,
          trainedAt: new Date(parsed.model.metadata.trainedAt),
        },
      };

      if (parsed.stats) {
        this.trainingStats = parsed.stats;
      }

      this.logger.info(
        `Anomaly detection model imported successfully: ${this.model?.metadata.featureCount} features`,
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
   * Validate training data
   */
  private validateTrainingData(data: readonly AnomalyTrainingData[]): void {
    if (data.length === 0) {
      throw new Error("Training data cannot be empty");
    }

    const expectedFeatureLength = data[0].features.features.length;

    for (const sample of data) {
      if (sample.weight <= 0) {
        throw new Error(`Invalid weight: ${sample.weight}`);
      }

      if (sample.features.features.length !== expectedFeatureLength) {
        throw new Error(
          `Inconsistent feature length: expected ${expectedFeatureLength}, got ${sample.features.features.length}`,
        );
      }

      // Check for NaN or infinite values
      for (const value of sample.features.features) {
        if (!isFinite(value)) {
          throw new Error("Feature contains NaN or infinite values");
        }
      }
    }
  }

  /**
   * Train Isolation Forest
   */
  private async trainIsolationForest(
    features: number[][],
  ): Promise<AnomalyDetectionModel["isolationForest"]> {
    const trees: IsolationTreeNode[] = [];
    const subsampleSize = Math.min(
      this.config.isolationForest.subsampleSize,
      features.length,
    );

    for (let i = 0; i < this.config.isolationForest.numberOfTrees; i++) {
      // Create random subsample
      const subsample = this.randomSubsample(features, subsampleSize);

      // Build isolation tree
      const tree = this.buildIsolationTree(
        subsample,
        0,
        this.config.isolationForest.maxTreeHeight,
      );

      trees.push(tree);
    }

    // Calculate average path length for normalization
    const averagePathLength = this.calculateAveragePathLength(subsampleSize);

    return {
      trees,
      subsampleSize,
      averagePathLength,
    };
  }

  /**
   * Train Local Outlier Factor
   */
  private async trainLocalOutlierFactor(
    features: number[][],
  ): Promise<AnomalyDetectionModel["localOutlierFactor"]> {
    const k = this.config.localOutlierFactor.k;
    const trainingData: LOFDataPoint[] = [];

    // Calculate LOF for each training point
    for (let i = 0; i < features.length; i++) {
      const point = features[i];

      // Find k-nearest neighbors
      const distances = features.map((otherPoint, idx) => ({
        index: idx,
        distance: this.calculateDistance(
          point,
          otherPoint,
          this.config.localOutlierFactor.distanceMetric,
        ),
      }));

      distances.sort((a, b) => a.distance - b.distance);
      const kNeighbors = distances.slice(1, k + 1); // Exclude self

      // Calculate k-distance
      const kDistance = kNeighbors[kNeighbors.length - 1].distance;

      // Calculate reachability distances
      const reachabilityDistance = kNeighbors.map((neighbor) =>
        Math.max(
          neighbor.distance,
          this.getKDistance(features, neighbor.index, k),
        ),
      );

      // Calculate local reachability density
      const avgReachabilityDistance =
        reachabilityDistance.reduce((sum, dist) => sum + dist, 0) / k;
      const lrd = k / avgReachabilityDistance;

      // Calculate local outlier factor
      const neighborLRDs = kNeighbors.map((neighbor) =>
        this.calculateLRD(features, neighbor.index, k),
      );
      const avgNeighborLRD =
        neighborLRDs.reduce((sum, lrd) => sum + lrd, 0) / k;
      const lof = avgNeighborLRD / lrd;

      trainingData.push({
        features: point,
        index: i,
        kDistance,
        reachabilityDistance,
        lrd,
        lof,
      });
    }

    return {
      trainingData,
      k,
      threshold: this.config.localOutlierFactor.threshold,
    };
  }

  /**
   * Train Statistical Model
   */
  private async trainStatisticalModel(
    features: number[][],
    _labels: boolean[],
  ): Promise<AnomalyDetectionModel["statistical"]> {
    const featureCount = features[0].length;
    const featureMeans = new Array(featureCount).fill(0);
    const featureStandardDeviations = new Array(featureCount).fill(1);

    // Calculate means
    for (let j = 0; j < featureCount; j++) {
      let sum = 0;
      for (let i = 0; i < features.length; i++) {
        sum += features[i][j];
      }
      featureMeans[j] = sum / features.length;
    }

    // Calculate standard deviations
    for (let j = 0; j < featureCount; j++) {
      let sumSquaredDiff = 0;
      for (let i = 0; i < features.length; i++) {
        const diff = features[i][j] - featureMeans[j];
        sumSquaredDiff += diff * diff;
      }
      featureStandardDeviations[j] = Math.sqrt(
        sumSquaredDiff / features.length,
      );

      // Avoid division by zero
      if (featureStandardDeviations[j] === 0) {
        featureStandardDeviations[j] = 1;
      }
    }

    // Calculate correlation matrix
    const correlationMatrix = this.calculateCorrelationMatrix(
      features,
      featureMeans,
      featureStandardDeviations,
    );

    return {
      featureMeans,
      featureStandardDeviations,
      correlationMatrix,
      threshold: this.config.statistical.zScoreThreshold,
    };
  }

  /**
   * Detect anomalies using Isolation Forest
   */
  private async detectWithIsolationForest(
    features: number[],
  ): Promise<AnomalyDetectionResult["detectionMethods"]["isolationForest"]> {
    if (!this.model) {
      throw new Error("Model not trained");
    }

    const startTime = performance.now();
    let totalPathLength = 0;

    // Calculate average path length across all trees
    for (const tree of this.model.isolationForest.trees) {
      const pathLength = this.calculatePathLength(features, tree, 0);
      totalPathLength += pathLength;
    }

    const averagePathLength =
      totalPathLength / this.model.isolationForest.trees.length;

    // Normalize using average path length
    const normalizedScore = Math.pow(
      2,
      -averagePathLength / this.model.isolationForest.averagePathLength,
    );

    this.trainingStats.isolationForestTime += performance.now() - startTime;

    return {
      score: normalizedScore,
      pathLength: averagePathLength,
      threshold: this.config.isolationForest.anomalyThreshold,
    };
  }

  /**
   * Detect anomalies using Local Outlier Factor
   */
  private async detectWithLOF(
    features: number[],
  ): Promise<AnomalyDetectionResult["detectionMethods"]["localOutlierFactor"]> {
    if (!this.model) {
      throw new Error("Model not trained");
    }

    const startTime = performance.now();
    const k = this.model.localOutlierFactor.k;

    // Find k-nearest neighbors in training data
    const distances = this.model.localOutlierFactor.trainingData.map(
      (trainPoint) => ({
        point: trainPoint,
        distance: this.calculateDistance(
          features,
          trainPoint.features,
          this.config.localOutlierFactor.distanceMetric,
        ),
      }),
    );

    distances.sort((a, b) => a.distance - b.distance);
    const kNeighbors = distances.slice(0, k);

    // Calculate reachability distances
    const reachabilityDistances = kNeighbors.map((neighbor) =>
      Math.max(neighbor.distance, neighbor.point.kDistance),
    );

    // Calculate local reachability density
    const avgReachabilityDistance =
      reachabilityDistances.reduce((sum, dist) => sum + dist, 0) / k;
    const lrd = k / avgReachabilityDistance;

    // Calculate local outlier factor
    const neighborLRDs = kNeighbors.map((neighbor) => neighbor.point.lrd);
    const avgNeighborLRD = neighborLRDs.reduce((sum, lrd) => sum + lrd, 0) / k;
    const lof = avgNeighborLRD / lrd;

    this.trainingStats.lofTime += performance.now() - startTime;

    return {
      score: lof,
      lrd,
      threshold: this.config.localOutlierFactor.threshold,
    };
  }

  /**
   * Detect anomalies using Statistical Z-Score
   */
  private async detectWithStatistical(
    features: number[],
  ): Promise<AnomalyDetectionResult["detectionMethods"]["statisticalZScore"]> {
    if (!this.model) {
      throw new Error("Model not trained");
    }

    const startTime = performance.now();
    let maxZScore = 0;

    // Calculate Z-scores for each feature
    for (let i = 0; i < features.length; i++) {
      const zScore = Math.abs(
        (features[i] - this.model.statistical.featureMeans[i]) /
          this.model.statistical.featureStandardDeviations[i],
      );
      maxZScore = Math.max(maxZScore, zScore);
    }

    // Normalize Z-score to 0-1 range
    const normalizedScore = Math.min(
      1,
      maxZScore / this.config.statistical.zScoreThreshold,
    );

    this.trainingStats.statisticalTime += performance.now() - startTime;

    return {
      score: normalizedScore,
      maxZScore,
      threshold: this.config.statistical.zScoreThreshold,
    };
  }

  // ===========================
  // UTILITY METHODS
  // ===========================

  private combineEnsembleResults(
    isolationResult: AnomalyDetectionResult["detectionMethods"]["isolationForest"],
    lofResult: AnomalyDetectionResult["detectionMethods"]["localOutlierFactor"],
    statisticalResult: AnomalyDetectionResult["detectionMethods"]["statisticalZScore"],
  ): number {
    const weights = this.config.ensemble.weights;

    // Normalize LOF score (higher LOF means more anomalous)
    const normalizedLOF = Math.min(1, Math.max(0, (lofResult.score - 1) / 2));

    // Weighted combination
    const weightedScore =
      weights.isolationForest * isolationResult.score +
      weights.localOutlierFactor * normalizedLOF +
      weights.statistical * statisticalResult.score;

    return Math.min(1, Math.max(0, weightedScore));
  }

  private calculateSeverity(score: number): VulnerabilitySeverity {
    if (score >= 0.9) return VulnerabilitySeverity.CRITICAL;
    if (score >= 0.7) return VulnerabilitySeverity.HIGH;
    if (score >= 0.5) return VulnerabilitySeverity.MEDIUM;
    if (score >= 0.3) return VulnerabilitySeverity.LOW;
    return VulnerabilitySeverity.INFO;
  }

  private calculateConfidence(score: number): number {
    // Confidence based on distance from decision boundary
    const distanceFromBoundary = Math.abs(
      score - this.config.ensemble.confidenceThreshold,
    );
    return Math.min(1, distanceFromBoundary * 2);
  }

  private async calculateFeatureContributions(
    features: number[],
    featureNames: string[],
  ): Promise<Record<string, number>> {
    const contributions: Record<string, number> = {};

    if (!this.model) {
      return contributions;
    }

    // Calculate relative contribution of each feature to anomaly score
    for (let i = 0; i < features.length; i++) {
      const zScore = Math.abs(
        (features[i] - this.model.statistical.featureMeans[i]) /
          this.model.statistical.featureStandardDeviations[i],
      );
      contributions[featureNames[i]] =
        zScore / this.config.statistical.zScoreThreshold;
    }

    // Normalize contributions
    const maxContribution = Math.max(...Object.values(contributions));
    if (maxContribution > 0) {
      for (const feature in contributions) {
        contributions[feature] /= maxContribution;
      }
    }

    return contributions;
  }

  private generateExplanation(
    isAnomaly: boolean,
    score: number,
    isolationResult: AnomalyDetectionResult["detectionMethods"]["isolationForest"],
    lofResult: AnomalyDetectionResult["detectionMethods"]["localOutlierFactor"],
    statisticalResult: AnomalyDetectionResult["detectionMethods"]["statisticalZScore"],
  ): string {
    if (!isAnomaly) {
      return `Normal behavior detected (score: ${score.toFixed(3)})`;
    }

    const methods = [];
    if (isolationResult.score > isolationResult.threshold) {
      methods.push("Isolation Forest");
    }
    if (lofResult.score > lofResult.threshold) {
      methods.push("Local Outlier Factor");
    }
    if (statisticalResult.score > statisticalResult.threshold) {
      methods.push("Statistical Analysis");
    }

    return `Anomaly detected by ${methods.join(", ")} (score: ${score.toFixed(3)})`;
  }

  private updateDetectionStats(processingTime: number): void {
    this.trainingStats.detectionCount++;

    // Update moving average
    const alpha = 0.1;
    this.trainingStats.averageDetectionTime =
      alpha * processingTime +
      (1 - alpha) * this.trainingStats.averageDetectionTime;
  }

  // Mathematical utility methods
  private randomSubsample<T>(data: T[], size: number): T[] {
    const result: T[] = [];
    const indices = new Set<number>();

    while (indices.size < size && indices.size < data.length) {
      const randomIndex = Math.floor(Math.random() * data.length);
      if (!indices.has(randomIndex)) {
        indices.add(randomIndex);
        result.push(data[randomIndex]);
      }
    }

    return result;
  }

  private buildIsolationTree(
    data: number[][],
    height: number,
    maxHeight: number,
  ): IsolationTreeNode {
    if (height >= maxHeight || data.length <= 1) {
      return {
        isLeaf: true,
        splitFeature: null,
        splitValue: null,
        left: null,
        right: null,
        size: data.length,
        height,
      };
    }

    // Randomly select feature and split value
    const splitFeature = Math.floor(Math.random() * data[0].length);
    const featureValues = data.map((row) => row[splitFeature]);
    const minValue = Math.min(...featureValues);
    const maxValue = Math.max(...featureValues);

    if (minValue === maxValue) {
      return {
        isLeaf: true,
        splitFeature: null,
        splitValue: null,
        left: null,
        right: null,
        size: data.length,
        height,
      };
    }

    const splitValue = minValue + Math.random() * (maxValue - minValue);

    // Split data
    const leftData = data.filter((row) => row[splitFeature] < splitValue);
    const rightData = data.filter((row) => row[splitFeature] >= splitValue);

    return {
      isLeaf: false,
      splitFeature,
      splitValue,
      left: this.buildIsolationTree(leftData, height + 1, maxHeight),
      right: this.buildIsolationTree(rightData, height + 1, maxHeight),
      size: data.length,
      height,
    };
  }

  private calculatePathLength(
    features: number[],
    node: IsolationTreeNode,
    currentDepth: number,
  ): number {
    if (node.isLeaf) {
      return currentDepth + this.calculateAveragePathLength(node.size);
    }

    if (node.splitFeature === null || node.splitValue === null) {
      return currentDepth;
    }

    if (features[node.splitFeature] < node.splitValue) {
      return this.calculatePathLength(features, node.left!, currentDepth + 1);
    } else {
      return this.calculatePathLength(features, node.right!, currentDepth + 1);
    }
  }

  private calculateAveragePathLength(n: number): number {
    if (n <= 1) return 0;
    return 2 * (Math.log(n - 1) + 0.5772156649) - (2 * (n - 1)) / n;
  }

  private calculateDistance(
    point1: readonly number[],
    point2: readonly number[],
    metric: "euclidean" | "manhattan" | "cosine",
  ): number {
    switch (metric) {
      case "euclidean": {
        let sum = 0;
        for (let i = 0; i < point1.length; i++) {
          const diff = point1[i] - point2[i];
          sum += diff * diff;
        }
        return Math.sqrt(sum);
      }
      case "manhattan": {
        let sum = 0;
        for (let i = 0; i < point1.length; i++) {
          sum += Math.abs(point1[i] - point2[i]);
        }
        return sum;
      }
      case "cosine": {
        let dotProduct = 0;
        let norm1 = 0;
        let norm2 = 0;
        for (let i = 0; i < point1.length; i++) {
          dotProduct += point1[i] * point2[i];
          norm1 += point1[i] * point1[i];
          norm2 += point2[i] * point2[i];
        }
        const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
        return magnitude === 0 ? 1 : 1 - dotProduct / magnitude;
      }
      default:
        throw new Error(`Unknown distance metric: ${metric}`);
    }
  }

  private getKDistance(
    data: number[][],
    pointIndex: number,
    k: number,
  ): number {
    const point = data[pointIndex];
    const distances = data.map((otherPoint, idx) => ({
      index: idx,
      distance: this.calculateDistance(
        point,
        otherPoint,
        this.config.localOutlierFactor.distanceMetric,
      ),
    }));

    distances.sort((a, b) => a.distance - b.distance);
    return distances[k].distance; // k+1th nearest neighbor (excluding self)
  }

  private calculateLRD(
    data: number[][],
    pointIndex: number,
    k: number,
  ): number {
    const point = data[pointIndex];
    const distances = data.map((otherPoint, idx) => ({
      index: idx,
      distance: this.calculateDistance(
        point,
        otherPoint,
        this.config.localOutlierFactor.distanceMetric,
      ),
    }));

    distances.sort((a, b) => a.distance - b.distance);
    const kNeighbors = distances.slice(1, k + 1); // Exclude self

    const reachabilityDistances = kNeighbors.map((neighbor) =>
      Math.max(neighbor.distance, this.getKDistance(data, neighbor.index, k)),
    );

    const avgReachabilityDistance =
      reachabilityDistances.reduce((sum, dist) => sum + dist, 0) / k;
    return k / avgReachabilityDistance;
  }

  private calculateCorrelationMatrix(
    features: number[][],
    means: number[],
    standardDeviations: number[],
  ): number[][] {
    const featureCount = features[0].length;
    const correlationMatrix: number[][] = [];

    for (let i = 0; i < featureCount; i++) {
      correlationMatrix[i] = [];
      for (let j = 0; j < featureCount; j++) {
        if (i === j) {
          correlationMatrix[i][j] = 1;
        } else {
          let covariance = 0;
          for (let k = 0; k < features.length; k++) {
            covariance +=
              ((features[k][i] - means[i]) / standardDeviations[i]) *
              ((features[k][j] - means[j]) / standardDeviations[j]);
          }
          correlationMatrix[i][j] = covariance / features.length;
        }
      }
    }

    return correlationMatrix;
  }
}

/**
 * Export default instance with optimized configuration
 */
export const defaultMLAnomalyDetectionEngine = new MLAnomalyDetectionEngine({
  isolationForest: {
    numberOfTrees: 150,
    subsampleSize: 256,
    maxTreeHeight: 25,
    anomalyThreshold: 0.55,
  },
  localOutlierFactor: {
    k: 25,
    threshold: 1.8,
    distanceMetric: "euclidean",
  },
  statistical: {
    zScoreThreshold: 2.5,
    windowSize: 200,
    adaptiveThreshold: true,
  },
  ensemble: {
    weights: {
      isolationForest: 0.45,
      localOutlierFactor: 0.35,
      statistical: 0.2,
    },
    votingStrategy: "weighted",
    confidenceThreshold: 0.65,
  },
  optimization: {
    batchSize: 2000,
    parallelProcessing: true,
    memoryOptimization: true,
    cacheSize: 15000,
  },
  randomSeed: 42,
});

/**
 * Export types and main class
 */
export { MLAnomalyDetectionEngine as default };
