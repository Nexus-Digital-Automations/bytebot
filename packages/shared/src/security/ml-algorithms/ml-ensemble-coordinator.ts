/**
 * ML Ensemble Coordinator for Vulnerability Pattern Detection
 *
 * Advanced ensemble learning system combining multiple ML algorithms with weighted voting,
 * confidence scoring, meta-learning capabilities, and production-ready optimization.
 *
 * @fileoverview ML Ensemble Coordinator - Advanced ML Algorithm Integration
 * @version 2.0.0
 * @author ML Algorithms Team - Advanced Security Framework
 */

import { performance } from "perf_hooks";
import { VulnerabilitySeverity } from "../owasp-top10-integration.service";
import {
  VulnerabilityCategory,
  VulnerabilitySeverity as DTVulnerabilitySeverity,
} from "../vulnerability-assessment-engine";
import {
  NaiveBayesClassifier,
  type NaiveBayesFeatures,
  type NaiveBayesTrainingData,
  // NaiveBayesPrediction, // Commented for future use
} from "./naive-bayes-classifier";
import {
  DecisionTreeClassifier,
  type DecisionTreeFeatures,
  // DecisionTreePrediction, // Commented for future use
} from "./decision-tree-classifier";
import {
  NeuralNetworkClassifier,
  type NeuralNetworkFeatures,
  type NeuralNetworkTrainingData,
  // NeuralNetworkPrediction, // Commented for future use
} from "./neural-network-classifier";

// ===========================
// CORE TYPES AND INTERFACES
// ===========================

/**
 * Type guard for validating VulnerabilitySeverity values
 */
function isValidVulnerabilitySeverity(
  value: unknown,
): value is VulnerabilitySeverity {
  const validSeverities: VulnerabilitySeverity[] = [
    VulnerabilitySeverity.INFO,
    VulnerabilitySeverity.LOW,
    VulnerabilitySeverity.MEDIUM,
    VulnerabilitySeverity.HIGH,
    VulnerabilitySeverity.CRITICAL,
  ];
  return (
    typeof value === "string" &&
    validSeverities.includes(value as VulnerabilitySeverity)
  );
}

/**
 * Type guard for validating VulnerabilityCategory values
 */
function isValidVulnerabilityCategory(
  value: unknown,
): value is VulnerabilityCategory {
  return typeof value === "string" && value.length > 0;
}

/**
 * Type guard for validating numeric features
 */
function isValidNumericFeature(value: unknown): value is number {
  return typeof value === "number" && isFinite(value) && !isNaN(value);
}

/**
 * Type guard for validating feature objects
 */
function isValidFeatureObject(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Comprehensive ML data validation utility
 * Used for runtime validation of training data and features
 */
export class MLDataValidator {
  /**
   * Validates training data structure and types
   * @param data - Unknown data to validate
   * @returns Type guard confirming data is EnsembleTrainingData
   */
  static validateTrainingData(data: unknown): data is EnsembleTrainingData {
    if (!isValidFeatureObject(data)) return false;

    const sample = data as Record<string, unknown>;

    return (
      isValidFeatureObject(sample.features) &&
      isValidVulnerabilitySeverity(sample.label) &&
      isValidVulnerabilityCategory(sample.category) &&
      isValidNumericFeature(sample.weight) &&
      sample.weight > 0 &&
      typeof sample.description === "string"
    );
  }

  /**
   * Validates feature object structure
   * @param features - Unknown features to validate
   * @returns Type guard confirming features are valid
   */
  static validateFeatures(
    features: unknown,
  ): features is Record<string, unknown> {
    return isValidFeatureObject(features);
  }

  /**
   * Validates numeric array structure
   * @param array - Unknown array to validate
   * @returns Type guard confirming array contains only numbers
   */
  static validateNumericArray(array: unknown): array is number[] {
    return (
      Array.isArray(array) && array.every((item) => isValidNumericFeature(item))
    );
  }

  /**
   * Validates string array structure
   * @param array - Unknown array to validate
   * @returns Type guard confirming array contains only strings
   */
  static validateStringArray(array: unknown): array is string[] {
    return (
      Array.isArray(array) && array.every((item) => typeof item === "string")
    );
  }
}

export interface EnsembleBaseModel {
  readonly id: string;
  readonly name: string;
  readonly weight: number;
  readonly enabled: boolean;
  readonly confidence: number;
  readonly lastTrainingTime: Date;
  readonly performanceMetrics: {
    readonly accuracy: number;
    readonly precision: Record<VulnerabilitySeverity, number>;
    readonly recall: Record<VulnerabilitySeverity, number>;
    readonly f1Score: Record<VulnerabilitySeverity, number>;
    readonly averageConfidence: number;
  };
}

export interface EnsemblePrediction {
  readonly finalPrediction: VulnerabilitySeverity;
  readonly confidence: number;
  readonly classProbabilities: Record<VulnerabilitySeverity, number>;
  readonly individualPredictions: readonly {
    readonly modelId: string;
    readonly modelName: string;
    readonly prediction: VulnerabilitySeverity;
    readonly confidence: number;
    readonly weight: number;
    readonly processingTime: number;
  }[];
  readonly votingDetails: {
    readonly votingMethod:
      | "weighted"
      | "majority"
      | "confidence_weighted"
      | "meta_learning";
    readonly votes: Record<VulnerabilitySeverity, number>;
    readonly consensus: number; // 0-1, how much models agree
    readonly uncertainty: number; // 0-1, prediction uncertainty
  };
  readonly featureImportance: Record<string, number>;
  readonly explanations: readonly string[];
  readonly processingTime: number;
  readonly qualityMetrics: {
    readonly modelAgreement: number;
    readonly confidenceConsistency: number;
    readonly predictionStability: number;
  };
}

export interface EnsembleTrainingData {
  readonly features: Record<string, unknown>; // Compatible with all model types
  readonly label: VulnerabilitySeverity;
  readonly category: VulnerabilityCategory;
  readonly weight: number;
  readonly description: string;
  readonly metadata?: Record<string, unknown>;
}

export interface EnsembleConfig {
  /** Voting configuration */
  readonly voting: {
    readonly method:
      | "weighted"
      | "majority"
      | "confidence_weighted"
      | "meta_learning";
    readonly enableDynamicWeighting: boolean;
    readonly confidenceThreshold: number;
    readonly unanimityBonus: number;
  };
  /** Model weighting strategy */
  readonly weighting: {
    readonly strategy:
      | "equal"
      | "performance_based"
      | "adaptive"
      | "meta_learned";
    readonly adaptationRate: number;
    readonly performanceWindow: number;
    readonly minWeight: number;
    readonly maxWeight: number;
  };
  /** Meta-learning configuration */
  readonly metaLearning: {
    readonly enabled: boolean;
    readonly metaModelType: "linear" | "decision_tree" | "neural_network";
    readonly useFeatureImportance: boolean;
    readonly useConfidenceFeatures: boolean;
    readonly retrainInterval: number;
  };
  /** Quality control */
  readonly qualityControl: {
    readonly enableOutlierDetection: boolean;
    readonly minConsensus: number;
    readonly maxUncertainty: number;
    readonly enableFallback: boolean;
    readonly fallbackModel: string;
  };
  /** Performance optimization */
  readonly optimization: {
    readonly parallelProcessing: boolean;
    readonly modelCaching: boolean;
    readonly featureCaching: boolean;
    readonly batchSize: number;
  };
}

export interface EnsembleModel {
  readonly baseModels: readonly EnsembleBaseModel[];
  readonly metaModel: Record<string, unknown> | null; // Meta-learning model
  readonly ensembleMetrics: {
    readonly overallAccuracy: number;
    readonly ensembleConfidence: number;
    readonly modelConsensus: number;
    readonly improvementOverBest: number;
    readonly diversityScore: number;
  };
  readonly training: {
    readonly trainingDataSize: number;
    readonly validationDataSize: number;
    readonly trainingTime: number;
    readonly lastTrainingDate: Date;
    readonly crossValidationScores: readonly number[];
  };
  readonly metadata: {
    readonly version: string;
    readonly createdAt: Date;
    readonly configuration: EnsembleConfig;
  };
}

// ===========================
// ENSEMBLE COORDINATOR IMPLEMENTATION
// ===========================

/**
 * ML Ensemble Coordinator for Vulnerability Pattern Detection
 *
 * Coordinates multiple ML algorithms using advanced ensemble methods including
 * weighted voting, meta-learning, and adaptive weight adjustment based on performance.
 */
export class MLEnsembleCoordinator {
  private readonly config: EnsembleConfig;
  private readonly logger: Console;

  // Individual ML models
  private naiveBayesModel: NaiveBayesClassifier;
  private decisionTreeModel: DecisionTreeClassifier;
  private neuralNetworkModel: NeuralNetworkClassifier;

  private ensembleModel: EnsembleModel | null = null;
  private modelPerformanceHistory: Map<
    string,
    Array<{ accuracy: number; timestamp: Date }>
  > = new Map();

  private readonly stats = {
    totalPredictions: 0,
    averagePredictionTime: 0,
    ensembleAccuracy: 0,
    modelAgreementRate: 0,
  };

  constructor(config?: Partial<EnsembleConfig>) {
    this.config = {
      voting: {
        method: "confidence_weighted",
        enableDynamicWeighting: true,
        confidenceThreshold: 0.7,
        unanimityBonus: 0.1,
      },
      weighting: {
        strategy: "adaptive",
        adaptationRate: 0.1,
        performanceWindow: 100,
        minWeight: 0.1,
        maxWeight: 2.0,
      },
      metaLearning: {
        enabled: true,
        metaModelType: "neural_network",
        useFeatureImportance: true,
        useConfidenceFeatures: true,
        retrainInterval: 1000,
      },
      qualityControl: {
        enableOutlierDetection: true,
        minConsensus: 0.6,
        maxUncertainty: 0.8,
        enableFallback: true,
        fallbackModel: "naive_bayes",
      },
      optimization: {
        parallelProcessing: true,
        modelCaching: true,
        featureCaching: true,
        batchSize: 32,
      },
      ...config,
    };

    this.logger = console;

    // Initialize individual models
    this.naiveBayesModel = new NaiveBayesClassifier();
    this.decisionTreeModel = new DecisionTreeClassifier();
    this.neuralNetworkModel = new NeuralNetworkClassifier();

    this.initializePerformanceTracking();
  }

  /**
   * Train the ensemble system with all base models
   */
  public async trainEnsemble(
    trainingData: readonly EnsembleTrainingData[],
  ): Promise<void> {
    const startTime = performance.now();
    this.logger.info(
      `Training ensemble with ${trainingData.length} samples...`,
    );

    try {
      // Split data for training and validation
      const { trainData, validationData } =
        this.splitTrainingData(trainingData);

      // Train individual models in parallel
      const modelTrainingPromises = [];

      if (this.config.optimization.parallelProcessing) {
        modelTrainingPromises.push(
          this.trainNaiveBayesModel(trainData),
          this.trainDecisionTreeModel(trainData),
          this.trainNeuralNetworkModel(trainData),
        );
      } else {
        // Sequential training
        await this.trainNaiveBayesModel(trainData);
        await this.trainDecisionTreeModel(trainData);
        await this.trainNeuralNetworkModel(trainData);
      }

      if (modelTrainingPromises.length > 0) {
        await Promise.all(modelTrainingPromises);
      }

      // Validate individual models and calculate performance
      const baseModels = await this.validateIndividualModels(validationData);

      // Train meta-learning model if enabled
      let metaModel = null;
      if (this.config.metaLearning.enabled) {
        metaModel = await this.trainMetaLearningModel(validationData);
      }

      // Calculate ensemble metrics
      const ensembleMetrics = await this.calculateEnsembleMetrics(
        validationData,
        baseModels,
      );

      // Create ensemble model
      this.ensembleModel = {
        baseModels,
        metaModel,
        ensembleMetrics,
        training: {
          trainingDataSize: trainData.length,
          validationDataSize: validationData.length,
          trainingTime: performance.now() - startTime,
          lastTrainingDate: new Date(),
          crossValidationScores: [], // TODO: Implement cross-validation
        },
        metadata: {
          version: "2.0.0",
          createdAt: new Date(),
          configuration: this.config,
        },
      };

      const duration = performance.now() - startTime;
      this.logger.info(
        `Ensemble training completed in ${duration.toFixed(2)}ms - ` +
          `Ensemble accuracy: ${ensembleMetrics.overallAccuracy.toFixed(3)}, ` +
          `Models: ${baseModels.length}`,
      );
    } catch (error) {
      this.logger.error("Ensemble training failed:", error);
      throw new Error(
        `Ensemble training failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Make ensemble prediction using all trained models
   */
  public async predict(
    features: Record<string, unknown>,
  ): Promise<EnsemblePrediction> {
    const startTime = performance.now();

    if (!this.ensembleModel) {
      throw new Error("Ensemble not trained. Call trainEnsemble() first.");
    }

    try {
      // Get predictions from all individual models
      const individualPredictions =
        await this.getIndividualPredictions(features);

      // Apply voting strategy
      const votingResult = this.applyVotingStrategy(individualPredictions);

      // Calculate consensus and uncertainty
      const qualityMetrics = this.calculateQualityMetrics(
        individualPredictions,
      );

      // Apply quality control
      const finalPrediction = this.applyQualityControl(
        votingResult,
        individualPredictions,
        qualityMetrics,
      );

      // Aggregate feature importance
      const featureImportance = this.aggregateFeatureImportance(
        individualPredictions,
      );

      // Generate explanations
      const explanations = this.generateExplanations(
        finalPrediction,
        individualPredictions,
        qualityMetrics,
      );

      const processingTime = performance.now() - startTime;

      // Update statistics
      this.updatePredictionStats(processingTime, qualityMetrics.modelAgreement);

      const result: EnsemblePrediction = {
        finalPrediction: finalPrediction.prediction,
        confidence: finalPrediction.confidence,
        classProbabilities: finalPrediction.probabilities,
        individualPredictions: individualPredictions.map((pred) => ({
          modelId: pred.modelId,
          modelName: pred.modelName,
          prediction: pred.prediction,
          confidence: pred.confidence,
          weight: pred.weight,
          processingTime: pred.processingTime,
        })),
        votingDetails: votingResult,
        featureImportance,
        explanations,
        processingTime,
        qualityMetrics,
      };

      return result;
    } catch (error) {
      this.logger.error("Ensemble prediction failed:", error);
      throw new Error(
        `Ensemble prediction failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Batch prediction for multiple samples
   */
  public async predictBatch(
    featuresArray: readonly Record<string, unknown>[],
  ): Promise<EnsemblePrediction[]> {
    const startTime = performance.now();

    if (!this.ensembleModel) {
      throw new Error("Ensemble not trained. Call trainEnsemble() first.");
    }

    try {
      const results: EnsemblePrediction[] = [];
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
        `Ensemble batch prediction completed: ${featuresArray.length} samples in ${totalTime.toFixed(2)}ms`,
      );

      return results;
    } catch (error) {
      this.logger.error("Ensemble batch prediction failed:", error);
      throw new Error(
        `Ensemble batch prediction failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Get ensemble performance statistics
   */
  public getEnsembleStats(): {
    readonly model: EnsembleModel | null;
    readonly stats: {
      totalPredictions: number;
      averagePredictionTime: number;
      ensembleAccuracy: number;
      modelAgreementRate: number;
    };
    readonly modelPerformance: Record<
      string,
      Array<{ accuracy: number; timestamp: Date }>
    >;
  } {
    return {
      model: this.ensembleModel,
      stats: { ...this.stats },
      modelPerformance: Object.fromEntries(this.modelPerformanceHistory),
    };
  }

  /**
   * Update model weights based on recent performance
   */
  public async updateModelWeights(
    recentPredictions: readonly {
      prediction: EnsemblePrediction;
      actualLabel: VulnerabilitySeverity;
    }[],
  ): Promise<void> {
    if (
      !this.ensembleModel ||
      !this.config.weighting.strategy.includes("adaptive")
    ) {
      return;
    }

    this.logger.info(
      `Updating model weights based on ${recentPredictions.length} recent predictions`,
    );

    // Calculate recent accuracy for each model
    const modelAccuracies: Record<string, number> = {};

    for (const { prediction, actualLabel } of recentPredictions) {
      for (const individualPred of prediction.individualPredictions) {
        const isCorrect = individualPred.prediction === actualLabel;

        if (!modelAccuracies[individualPred.modelId]) {
          modelAccuracies[individualPred.modelId] = 0;
        }

        modelAccuracies[individualPred.modelId] += isCorrect ? 1 : 0;
      }
    }

    // Normalize accuracies
    for (const modelId in modelAccuracies) {
      modelAccuracies[modelId] /= recentPredictions.length;
    }

    // Update weights using adaptive strategy
    const updatedModels = this.ensembleModel.baseModels.map((model) => {
      const recentAccuracy =
        modelAccuracies[model.id] || model.performanceMetrics.accuracy;
      const currentWeight = model.weight;

      // Adaptive weight update
      const targetWeight = this.calculateAdaptiveWeight(recentAccuracy);
      const newWeight =
        currentWeight +
        this.config.weighting.adaptationRate * (targetWeight - currentWeight);

      // Clamp weight within bounds
      const clampedWeight = Math.max(
        this.config.weighting.minWeight,
        Math.min(this.config.weighting.maxWeight, newWeight),
      );

      return {
        ...model,
        weight: clampedWeight,
        performanceMetrics: {
          ...model.performanceMetrics,
          accuracy: recentAccuracy,
        },
      };
    });

    this.ensembleModel = {
      ...this.ensembleModel,
      baseModels: updatedModels,
    };

    this.logger.info("Model weights updated successfully");
  }

  // ===========================
  // PRIVATE METHODS
  // ===========================

  /**
   * Initialize performance tracking for all models
   */
  private initializePerformanceTracking(): void {
    this.modelPerformanceHistory.set("naive_bayes", []);
    this.modelPerformanceHistory.set("decision_tree", []);
    this.modelPerformanceHistory.set("neural_network", []);
  }

  /**
   * Split training data into train and validation sets
   */
  private splitTrainingData(data: readonly EnsembleTrainingData[]): {
    trainData: EnsembleTrainingData[];
    validationData: EnsembleTrainingData[];
  } {
    const splitRatio = 0.8;
    const splitIndex = Math.floor(data.length * splitRatio);

    // Shuffle data for random split
    const shuffledData = [...data].sort(() => Math.random() - 0.5);

    return {
      trainData: shuffledData.slice(0, splitIndex),
      validationData: shuffledData.slice(splitIndex),
    };
  }

  /**
   * Train Naive Bayes model
   */
  private async trainNaiveBayesModel(
    trainData: EnsembleTrainingData[],
  ): Promise<void> {
    this.logger.info("Training Naive Bayes model...");

    // Convert data format for Naive Bayes
    const nbTrainingData: NaiveBayesTrainingData[] = trainData.map(
      (sample) => ({
        features: this.convertToNaiveBayesFeatures(sample.features),
        label: sample.label as VulnerabilitySeverity,
        category: sample.category,
        weight: sample.weight,
        description: sample.description,
      }),
    );

    await this.naiveBayesModel.train(nbTrainingData);
    this.logger.info("Naive Bayes training completed");
  }

  /**
   * Train Decision Tree model
   */
  private async trainDecisionTreeModel(
    trainData: EnsembleTrainingData[],
  ): Promise<void> {
    this.logger.info("Training Decision Tree model...");

    // Convert data format for Decision Tree
    const dtTrainingData = trainData.map((sample) => ({
      features: this.convertToDecisionTreeFeatures(sample.features),
      label: this.convertSeverityForDecisionTree(sample.label),
      category: sample.category,
      weight: sample.weight,
      description: sample.description,
    }));

    await this.decisionTreeModel.train(dtTrainingData);
    this.logger.info("Decision Tree training completed");
  }

  /**
   * Train Neural Network model
   */
  private async trainNeuralNetworkModel(
    trainData: EnsembleTrainingData[],
  ): Promise<void> {
    this.logger.info("Training Neural Network model...");

    // Convert data format for Neural Network
    const nnTrainingData: NeuralNetworkTrainingData[] = trainData.map(
      (sample) => ({
        features: this.convertToNeuralNetworkFeatures(sample.features),
        label: sample.label as VulnerabilitySeverity,
        category: sample.category,
        weight: sample.weight,
        description: sample.description,
      }),
    );

    await this.neuralNetworkModel.train(nnTrainingData);
    this.logger.info("Neural Network training completed");
  }

  /**
   * Validate individual models and create base model objects
   */
  private async validateIndividualModels(
    validationData: EnsembleTrainingData[],
  ): Promise<EnsembleBaseModel[]> {
    const baseModels: EnsembleBaseModel[] = [];

    // Validate Naive Bayes
    const nbMetrics = await this.validateModel(
      "naive_bayes",
      this.naiveBayesModel,
      validationData,
    );
    baseModels.push({
      id: "naive_bayes",
      name: "Naive Bayes Classifier",
      weight: 1.0,
      enabled: true,
      confidence: nbMetrics.averageConfidence,
      lastTrainingTime: new Date(),
      performanceMetrics: nbMetrics,
    });

    // Validate Decision Tree
    const dtMetrics = await this.validateModel(
      "decision_tree",
      this.decisionTreeModel,
      validationData,
    );
    baseModels.push({
      id: "decision_tree",
      name: "Decision Tree Classifier",
      weight: 1.0,
      enabled: true,
      confidence: dtMetrics.averageConfidence,
      lastTrainingTime: new Date(),
      performanceMetrics: dtMetrics,
    });

    // Validate Neural Network
    const nnMetrics = await this.validateModel(
      "neural_network",
      this.neuralNetworkModel,
      validationData,
    );
    baseModels.push({
      id: "neural_network",
      name: "Neural Network Classifier",
      weight: 1.0,
      enabled: true,
      confidence: nnMetrics.averageConfidence,
      lastTrainingTime: new Date(),
      performanceMetrics: nnMetrics,
    });

    return baseModels;
  }

  /**
   * Validate a single model and calculate performance metrics
   */
  private async validateModel(
    modelId: string,
    model:
      | NaiveBayesClassifier
      | DecisionTreeClassifier
      | NeuralNetworkClassifier,
    validationData: EnsembleTrainingData[],
  ): Promise<EnsembleBaseModel["performanceMetrics"]> {
    let correctPredictions = 0;
    let totalConfidence = 0;
    const precisionCounts: Record<
      VulnerabilitySeverity,
      { tp: number; fp: number; fn: number }
    > = {} as Record<
      VulnerabilitySeverity,
      { tp: number; fp: number; fn: number }
    >;

    // Initialize counters for each severity
    const severityValues: VulnerabilitySeverity[] = [
      VulnerabilitySeverity.INFO,
      VulnerabilitySeverity.LOW,
      VulnerabilitySeverity.MEDIUM,
      VulnerabilitySeverity.HIGH,
      VulnerabilitySeverity.CRITICAL,
    ];
    for (const severity of severityValues) {
      precisionCounts[severity] = { tp: 0, fp: 0, fn: 0 };
    }

    // Make predictions on validation data
    for (const sample of validationData) {
      try {
        let prediction:
          | {
              predictedLabel?: string;
              prediction?: string;
              confidence?: number;
            }
          | undefined;

        if (modelId === "naive_bayes") {
          prediction = await (model as NaiveBayesClassifier).predict(
            this.convertToNaiveBayesFeatures(sample.features),
          );
        } else if (modelId === "decision_tree") {
          prediction = await (model as DecisionTreeClassifier).predict(
            this.convertToDecisionTreeFeatures(sample.features),
          );
        } else if (modelId === "neural_network") {
          prediction = await (model as NeuralNetworkClassifier).predict(
            this.convertToNeuralNetworkFeatures(sample.features),
          );
        }

        if (!prediction) {
          this.logger.warn(`No prediction returned for model ${modelId}`);
          continue;
        }

        const predicted = prediction.predictedLabel || prediction.prediction;
        const actual = sample.label as string;

        // Update accuracy
        if (predicted === actual) {
          correctPredictions++;
        }

        // Update precision/recall counters
        for (const severity of severityValues) {
          if (predicted === severity && actual === severity) {
            precisionCounts[severity].tp++;
          } else if (predicted === severity && actual !== severity) {
            precisionCounts[severity].fp++;
          } else if (predicted !== severity && actual === severity) {
            precisionCounts[severity].fn++;
          }
        }

        totalConfidence += prediction.confidence || 0;
      } catch (error) {
        this.logger.warn(
          `Model ${modelId} prediction failed for sample:`,
          error,
        );
      }
    }

    const accuracy = correctPredictions / validationData.length;
    const averageConfidence = totalConfidence / validationData.length;

    // Calculate precision, recall, and F1 for each class
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

    for (const severity of severityValues) {
      const { tp, fp, fn } = precisionCounts[severity];

      precision[severity] = tp + fp > 0 ? tp / (tp + fp) : 0;
      recall[severity] = tp + fn > 0 ? tp / (tp + fn) : 0;

      const prec = precision[severity];
      const rec = recall[severity];
      f1Score[severity] =
        prec + rec > 0 ? (2 * (prec * rec)) / (prec + rec) : 0;
    }

    return {
      accuracy,
      precision,
      recall,
      f1Score,
      averageConfidence,
    };
  }

  /**
   * Train meta-learning model
   */
  private async trainMetaLearningModel(
    validationData: EnsembleTrainingData[],
  ): Promise<Record<string, unknown>> {
    this.logger.info("Training meta-learning model...");

    // Generate meta-features from individual model predictions
    const metaFeatures: Array<{
      features: number[];
      label: VulnerabilitySeverity;
    }> = [];

    for (const sample of validationData) {
      const individualPreds = await this.getIndividualPredictions(
        sample.features,
      );

      const features = [
        ...individualPreds.map((p) => p.confidence),
        ...individualPreds.map((p) => this.severityToNumber(p.prediction)),
      ];

      if (this.config.metaLearning.useFeatureImportance) {
        // Add aggregated feature importance as meta-features
        const importance = this.aggregateFeatureImportance(individualPreds);
        features.push(...Object.values(importance).slice(0, 10)); // Top 10 features
      }

      metaFeatures.push({
        features,
        label: sample.label,
      });
    }

    // Train simple meta-model (placeholder - would implement actual meta-learning model)
    const metaModel = {
      type: this.config.metaLearning.metaModelType,
      features: metaFeatures,
      trained: true,
      trainingTime: new Date(),
    };

    this.logger.info("Meta-learning model training completed");
    return metaModel;
  }

  /**
   * Calculate ensemble metrics
   */
  private async calculateEnsembleMetrics(
    validationData: EnsembleTrainingData[],
    baseModels: EnsembleBaseModel[],
  ): Promise<EnsembleModel["ensembleMetrics"]> {
    let ensembleCorrect = 0;
    let totalConfidence = 0;
    let totalConsensus = 0;

    for (const sample of validationData) {
      const individualPreds = await this.getIndividualPredictions(
        sample.features,
      );
      const votingResult = this.applyVotingStrategy(individualPreds);

      if (votingResult.votes[sample.label] > 0) {
        ensembleCorrect++;
      }

      totalConfidence += Math.max(...Object.values(votingResult.votes));
      totalConsensus += this.calculateConsensus(individualPreds);
    }

    const overallAccuracy = ensembleCorrect / validationData.length;
    const ensembleConfidence = totalConfidence / validationData.length;
    const modelConsensus = totalConsensus / validationData.length;

    const bestModelAccuracy = Math.max(
      ...baseModels.map((m) => m.performanceMetrics.accuracy),
    );
    const improvementOverBest = overallAccuracy - bestModelAccuracy;

    const diversityScore = this.calculateModelDiversity(baseModels);

    return {
      overallAccuracy,
      ensembleConfidence,
      modelConsensus,
      improvementOverBest,
      diversityScore,
    };
  }

  /**
   * Get predictions from all individual models
   */
  private async getIndividualPredictions(
    features: Record<string, unknown>,
  ): Promise<
    Array<{
      modelId: string;
      modelName: string;
      prediction: VulnerabilitySeverity;
      confidence: number;
      weight: number;
      processingTime: number;
      probabilities: Record<VulnerabilitySeverity, number>;
    }>
  > {
    if (!this.ensembleModel) {
      throw new Error("Ensemble model not trained");
    }

    const predictions = [];

    // Get Naive Bayes prediction
    try {
      const startTime = performance.now();
      const nbPred = await this.naiveBayesModel.predict(
        this.convertToNaiveBayesFeatures(features),
      );
      const processingTime = performance.now() - startTime;

      const nbModel = this.ensembleModel.baseModels.find(
        (m) => m.id === "naive_bayes",
      )!;

      predictions.push({
        modelId: "naive_bayes",
        modelName: "Naive Bayes",
        prediction: nbPred.predictedLabel as VulnerabilitySeverity,
        confidence: nbPred.confidence,
        weight: nbModel.weight,
        processingTime,
        probabilities: nbPred.probabilities as Record<
          VulnerabilitySeverity,
          number
        >,
      });
    } catch (error) {
      this.logger.warn("Naive Bayes prediction failed:", error);
    }

    // Get Decision Tree prediction
    try {
      const startTime = performance.now();
      const dtPred = await this.decisionTreeModel.predict(
        this.convertToDecisionTreeFeatures(features),
      );
      const processingTime = performance.now() - startTime;

      const dtModel = this.ensembleModel.baseModels.find(
        (m) => m.id === "decision_tree",
      )!;

      predictions.push({
        modelId: "decision_tree",
        modelName: "Decision Tree",
        prediction: dtPred.predictedLabel as VulnerabilitySeverity,
        confidence: dtPred.confidence,
        weight: dtModel.weight,
        processingTime,
        probabilities: dtPred.classProbabilities as Record<
          VulnerabilitySeverity,
          number
        >,
      });
    } catch (error) {
      this.logger.warn("Decision Tree prediction failed:", error);
    }

    // Get Neural Network prediction
    try {
      const startTime = performance.now();
      const nnPred = await this.neuralNetworkModel.predict(
        this.convertToNeuralNetworkFeatures(features),
      );
      const processingTime = performance.now() - startTime;

      const nnModel = this.ensembleModel.baseModels.find(
        (m) => m.id === "neural_network",
      )!;

      predictions.push({
        modelId: "neural_network",
        modelName: "Neural Network",
        prediction: nnPred.predictedLabel as VulnerabilitySeverity,
        confidence: nnPred.confidence,
        weight: nnModel.weight,
        processingTime,
        probabilities: nnPred.classProbabilities as Record<
          VulnerabilitySeverity,
          number
        >,
      });
    } catch (error) {
      this.logger.warn("Neural Network prediction failed:", error);
    }

    return predictions;
  }

  /**
   * Apply voting strategy to combine predictions
   */
  private applyVotingStrategy(
    predictions: Array<{
      modelId: string;
      prediction: VulnerabilitySeverity;
      confidence: number;
      weight: number;
      probabilities: Record<VulnerabilitySeverity, number>;
    }>,
  ): EnsemblePrediction["votingDetails"] {
    const votes: Record<VulnerabilitySeverity, number> = {} as Record<
      VulnerabilitySeverity,
      number
    >;

    // Initialize votes
    const severityValues: VulnerabilitySeverity[] = [
      VulnerabilitySeverity.INFO,
      VulnerabilitySeverity.LOW,
      VulnerabilitySeverity.MEDIUM,
      VulnerabilitySeverity.HIGH,
      VulnerabilitySeverity.CRITICAL,
    ];
    for (const severity of severityValues) {
      votes[severity] = 0;
    }

    switch (this.config.voting.method) {
      case "majority":
        for (const pred of predictions) {
          votes[pred.prediction] += 1;
        }
        break;

      case "weighted":
        for (const pred of predictions) {
          votes[pred.prediction] += pred.weight;
        }
        break;

      case "confidence_weighted":
        for (const pred of predictions) {
          votes[pred.prediction] += pred.weight * pred.confidence;
        }
        break;

      case "meta_learning":
        // TODO: Implement meta-learning prediction
        for (const pred of predictions) {
          votes[pred.prediction] += pred.weight * pred.confidence;
        }
        break;
    }

    // Apply unanimity bonus
    if (this.config.voting.unanimityBonus > 0) {
      const uniquePredictions = new Set(predictions.map((p) => p.prediction));
      if (uniquePredictions.size === 1) {
        const unanimousPrediction = Array.from(uniquePredictions)[0];
        votes[unanimousPrediction] += this.config.voting.unanimityBonus;
      }
    }

    // Calculate consensus
    const totalVotes = Object.values(votes).reduce((sum, v) => sum + v, 0);
    const maxVotes = Math.max(...Object.values(votes));
    const consensus = totalVotes > 0 ? maxVotes / totalVotes : 0;

    // Calculate uncertainty (entropy-based)
    const probabilities = Object.values(votes).map((v) => v / totalVotes);
    const uncertainty = -probabilities.reduce(
      (sum, p) => sum + (p > 0 ? p * Math.log2(p) : 0),
      0,
    );

    return {
      votingMethod: this.config.voting.method,
      votes,
      consensus,
      uncertainty,
    };
  }

  /**
   * Apply quality control measures
   */
  private applyQualityControl(
    votingResult: EnsemblePrediction["votingDetails"],
    individualPredictions: Array<{
      modelId: string;
      prediction: VulnerabilitySeverity;
      confidence: number;
    }>,
    qualityMetrics: EnsemblePrediction["qualityMetrics"],
  ): {
    prediction: VulnerabilitySeverity;
    confidence: number;
    probabilities: Record<VulnerabilitySeverity, number>;
  } {
    // Get highest voted prediction
    const topPrediction = Object.entries(votingResult.votes).reduce(
      (max, [severity, votes]) =>
        votes > max.votes
          ? { severity: severity as VulnerabilitySeverity, votes }
          : max,
      { severity: VulnerabilitySeverity.LOW, votes: -1 },
    );

    let finalPrediction = topPrediction.severity;
    let confidence = votingResult.consensus;

    // Apply quality control checks
    if (this.config.qualityControl.enableOutlierDetection) {
      if (
        qualityMetrics.modelAgreement < this.config.qualityControl.minConsensus
      ) {
        this.logger.warn("Low model consensus detected, reducing confidence");
        confidence *= 0.7;
      }
    }

    if (votingResult.uncertainty > this.config.qualityControl.maxUncertainty) {
      this.logger.warn("High prediction uncertainty detected");
      confidence *= 0.8;
    }

    // Apply fallback if confidence is too low
    if (
      this.config.qualityControl.enableFallback &&
      confidence < this.config.voting.confidenceThreshold
    ) {
      const fallbackModel = individualPredictions.find(
        (p) => p.modelId === this.config.qualityControl.fallbackModel,
      );
      if (fallbackModel) {
        this.logger.warn(
          "Using fallback model prediction due to low ensemble confidence",
        );
        finalPrediction = fallbackModel.prediction;
        confidence = fallbackModel.confidence;
      }
    }

    // Calculate final probabilities
    const totalVotes = Object.values(votingResult.votes).reduce(
      (sum, v) => sum + v,
      0,
    );
    const probabilities: Record<VulnerabilitySeverity, number> = {} as Record<
      VulnerabilitySeverity,
      number
    >;

    const severityValues: VulnerabilitySeverity[] = [
      VulnerabilitySeverity.INFO,
      VulnerabilitySeverity.LOW,
      VulnerabilitySeverity.MEDIUM,
      VulnerabilitySeverity.HIGH,
      VulnerabilitySeverity.CRITICAL,
    ];
    for (const severity of severityValues) {
      probabilities[severity] =
        totalVotes > 0 ? votingResult.votes[severity] / totalVotes : 0;
    }

    return {
      prediction: finalPrediction,
      confidence: Math.min(1, Math.max(0, confidence)),
      probabilities,
    };
  }

  /**
   * Calculate quality metrics for predictions
   */
  private calculateQualityMetrics(
    predictions: Array<{
      prediction: VulnerabilitySeverity;
      confidence: number;
    }>,
  ): EnsemblePrediction["qualityMetrics"] {
    if (predictions.length === 0) {
      return {
        modelAgreement: 0,
        confidenceConsistency: 0,
        predictionStability: 0,
      };
    }

    // Model agreement (how many models agree on the same prediction)
    const predictionCounts: Record<string, number> = {};
    for (const pred of predictions) {
      predictionCounts[pred.prediction] =
        (predictionCounts[pred.prediction] || 0) + 1;
    }
    const maxAgreement = Math.max(...Object.values(predictionCounts));
    const modelAgreement = maxAgreement / predictions.length;

    // Confidence consistency (standard deviation of confidence scores)
    const confidences = predictions.map((p) => p.confidence);
    const meanConfidence =
      confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
    const confidenceVariance =
      confidences.reduce((sum, c) => sum + Math.pow(c - meanConfidence, 2), 0) /
      confidences.length;
    const confidenceConsistency = 1 - Math.sqrt(confidenceVariance); // Higher is more consistent

    // Prediction stability (placeholder - in practice would compare with historical predictions)
    const predictionStability = modelAgreement; // Simplified

    return {
      modelAgreement,
      confidenceConsistency: Math.max(0, confidenceConsistency),
      predictionStability,
    };
  }

  /**
   * Convert ensemble VulnerabilitySeverity to Decision Tree compatible format
   */
  private convertSeverityForDecisionTree(
    severity: VulnerabilitySeverity,
  ): DTVulnerabilitySeverity {
    // Convert enum values to string literals expected by decision tree
    const severityMap: Record<VulnerabilitySeverity, DTVulnerabilitySeverity> =
      {
        [VulnerabilitySeverity.INFO]: "info",
        [VulnerabilitySeverity.LOW]: "low",
        [VulnerabilitySeverity.MEDIUM]: "medium",
        [VulnerabilitySeverity.HIGH]: "high",
        [VulnerabilitySeverity.CRITICAL]: "critical",
      };
    return severityMap[severity];
  }

  // Helper methods for feature format conversion
  private convertToNaiveBayesFeatures(
    features: Record<string, unknown>,
  ): NaiveBayesFeatures {
    if (!MLDataValidator.validateFeatures(features)) {
      throw new Error("Invalid features provided for Naive Bayes conversion");
    }

    // Safely convert features to format expected by Naive Bayes with validation
    const safeExtractNumericRecord = (obj: unknown): Record<string, number> => {
      if (!isValidFeatureObject(obj)) return {};
      const result: Record<string, number> = {};
      for (const [key, value] of Object.entries(obj)) {
        if (isValidNumericFeature(value)) {
          result[key] = value;
        }
      }
      return result;
    };

    return {
      tfidf: safeExtractNumericRecord(features.tfidf),
      ngrams: safeExtractNumericRecord(features.ngrams),
      securityFeatures: safeExtractNumericRecord(features.securityFeatures),
      metadata: safeExtractNumericRecord(features.metadata),
    };
  }

  private convertToDecisionTreeFeatures(
    features: Record<string, unknown>,
  ): DecisionTreeFeatures {
    if (!MLDataValidator.validateFeatures(features)) {
      throw new Error("Invalid features provided for Decision Tree conversion");
    }

    // Safely convert features to format expected by Decision Tree with validation
    const safeExtractNumericRecord = (obj: unknown): Record<string, number> => {
      if (!isValidFeatureObject(obj)) return {};
      const result: Record<string, number> = {};
      for (const [key, value] of Object.entries(obj)) {
        if (isValidNumericFeature(value)) {
          result[key] = value;
        }
      }
      return result;
    };

    const safeExtractStringRecord = (obj: unknown): Record<string, string> => {
      if (!isValidFeatureObject(obj)) return {};
      const result: Record<string, string> = {};
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === "string") {
          result[key] = value;
        }
      }
      return result;
    };

    const safeExtractBooleanRecord = (
      obj: unknown,
    ): Record<string, boolean> => {
      if (!isValidFeatureObject(obj)) return {};
      const result: Record<string, boolean> = {};
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === "boolean") {
          result[key] = value;
        }
      }
      return result;
    };

    return {
      numerical: safeExtractNumericRecord(features.numerical),
      categorical: safeExtractStringRecord(features.categorical),
      boolean: safeExtractBooleanRecord(features.boolean),
      securityMetrics: safeExtractNumericRecord(features.securityMetrics),
    };
  }

  private convertToNeuralNetworkFeatures(
    features: Record<string, unknown>,
  ): NeuralNetworkFeatures {
    if (!MLDataValidator.validateFeatures(features)) {
      throw new Error(
        "Invalid features provided for Neural Network conversion",
      );
    }

    // Safely convert features to format expected by Neural Network with validation
    const featureArray = features.features;
    const featureNames = features.featureNames;

    if (!MLDataValidator.validateNumericArray(featureArray)) {
      throw new Error(
        "Invalid feature array provided for Neural Network - must be numeric array",
      );
    }

    if (!MLDataValidator.validateStringArray(featureNames)) {
      throw new Error(
        "Invalid feature names provided for Neural Network - must be string array",
      );
    }

    if (featureArray.length !== featureNames.length) {
      throw new Error(
        "Feature array and feature names must have the same length",
      );
    }

    return {
      features: featureArray,
      featureNames: featureNames,
    };
  }

  private aggregateFeatureImportance(
    predictions: Array<{ prediction: VulnerabilitySeverity }>,
  ): Record<string, number> {
    const importance: Record<string, number> = {};

    for (const _pred of predictions) {
      // Aggregate feature importance from individual models (placeholder)
      // In practice, would combine feature importance scores
    }

    return importance;
  }

  private generateExplanations(
    finalPrediction: { prediction: VulnerabilitySeverity; confidence: number },
    individualPredictions: Array<{ prediction: VulnerabilitySeverity }>,
    qualityMetrics: { modelAgreement: number },
  ): string[] {
    const explanations = [];

    explanations.push(
      `Final prediction: ${finalPrediction.prediction} (confidence: ${finalPrediction.confidence.toFixed(3)})`,
    );
    explanations.push(
      `Model agreement: ${(qualityMetrics.modelAgreement * 100).toFixed(1)}%`,
    );

    const modelConsensus = individualPredictions.every(
      (p) => p.prediction === finalPrediction.prediction,
    );
    if (modelConsensus) {
      explanations.push("All models agree on this prediction");
    } else {
      explanations.push(
        `${individualPredictions.filter((p) => p.prediction === finalPrediction.prediction).length}/${individualPredictions.length} models agree`,
      );
    }

    return explanations;
  }

  private calculateConsensus(
    predictions: Array<{ prediction: VulnerabilitySeverity }>,
  ): number {
    if (predictions.length === 0) return 0;

    const predictionCounts: Record<string, number> = {};
    for (const pred of predictions) {
      predictionCounts[pred.prediction] =
        (predictionCounts[pred.prediction] || 0) + 1;
    }

    const maxCount = Math.max(...Object.values(predictionCounts));
    return maxCount / predictions.length;
  }

  private calculateModelDiversity(baseModels: EnsembleBaseModel[]): number {
    // Calculate diversity based on different performance characteristics
    // Higher diversity is generally better for ensemble performance
    const accuracies = baseModels.map((m) => m.performanceMetrics.accuracy);
    const meanAccuracy =
      accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length;
    const variance =
      accuracies.reduce(
        (sum, acc) => sum + Math.pow(acc - meanAccuracy, 2),
        0,
      ) / accuracies.length;

    return Math.sqrt(variance); // Standard deviation as diversity measure
  }

  private calculateAdaptiveWeight(recentAccuracy: number): number {
    // Calculate target weight based on recent performance
    // Better performing models get higher weights
    const baseWeight = 1.0;
    const performanceMultiplier = recentAccuracy * 2; // Scale accuracy to weight multiplier

    return baseWeight * performanceMultiplier;
  }

  private severityToNumber(severity: VulnerabilitySeverity): number {
    const mapping: Record<VulnerabilitySeverity, number> = {
      [VulnerabilitySeverity.INFO]: 0,
      [VulnerabilitySeverity.LOW]: 1,
      [VulnerabilitySeverity.MEDIUM]: 2,
      [VulnerabilitySeverity.HIGH]: 3,
      [VulnerabilitySeverity.CRITICAL]: 4,
    };
    return mapping[severity];
  }

  private updatePredictionStats(
    processingTime: number,
    modelAgreement: number,
  ): void {
    this.stats.totalPredictions++;

    // Update moving average
    const alpha = 0.1;
    this.stats.averagePredictionTime =
      alpha * processingTime + (1 - alpha) * this.stats.averagePredictionTime;

    this.stats.modelAgreementRate =
      alpha * modelAgreement + (1 - alpha) * this.stats.modelAgreementRate;
  }
}

/**
 * Export default instance with optimized configuration
 */
export const defaultMLEnsembleCoordinator = new MLEnsembleCoordinator({
  voting: {
    method: "confidence_weighted",
    enableDynamicWeighting: true,
    confidenceThreshold: 0.75,
    unanimityBonus: 0.15,
  },
  weighting: {
    strategy: "adaptive",
    adaptationRate: 0.15,
    performanceWindow: 100,
    minWeight: 0.1,
    maxWeight: 2.5,
  },
  metaLearning: {
    enabled: true,
    metaModelType: "neural_network",
    useFeatureImportance: true,
    useConfidenceFeatures: true,
    retrainInterval: 500,
  },
  qualityControl: {
    enableOutlierDetection: true,
    minConsensus: 0.65,
    maxUncertainty: 0.75,
    enableFallback: true,
    fallbackModel: "neural_network",
  },
  optimization: {
    parallelProcessing: true,
    modelCaching: true,
    featureCaching: true,
    batchSize: 64,
  },
});

/**
 * Export types and main class
 */
export { MLEnsembleCoordinator as default };
