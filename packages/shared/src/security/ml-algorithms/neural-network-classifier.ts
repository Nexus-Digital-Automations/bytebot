/**
 * Neural Network Classifier for Vulnerability Pattern Detection
 *
 * Enterprise-grade Multi-Layer Perceptron implementation for pattern recognition
 * with training/inference capabilities, gradient descent optimization, and production-ready performance.
 *
 * @fileoverview Neural Network Classifier - Core ML Algorithm Implementation
 * @version 2.0.0
 * @author ML Algorithms Team - Advanced Security Framework
 */

import { performance } from "perf_hooks";
import { VulnerabilitySeverity } from "../vulnerability-assessment-engine";
import { VulnerabilityCategory } from "../vulnerability-assessment-engine";

// ===========================
// CORE TYPES AND INTERFACES
// ===========================

// Helper type for creating complete Records with all VulnerabilitySeverity keys
type CompleteVulnerabilityRecord<T> = Record<VulnerabilitySeverity, T>;

// All severity levels as array for iteration
const ALL_SEVERITIES: readonly VulnerabilitySeverity[] = [
  "info",
  "low",
  "medium",
  "high",
  "critical",
] as const;

/** Optimizer state for Adam optimizer */
export interface AdamOptimizerState {
  t: number; // time step
  m: { weights: number[][]; biases: number[] }; // first moment
  v: { weights: number[][]; biases: number[] }; // second moment
}

/** Union type for optimizer states */
export type OptimizerState = AdamOptimizerState | null;

export interface NeuralNetworkFeatures {
  /** Normalized feature vector */
  readonly features: readonly number[];
  /** Feature names for interpretation */
  readonly featureNames: readonly string[];
}

export interface NeuralNetworkTrainingData {
  readonly features: NeuralNetworkFeatures;
  readonly label: VulnerabilitySeverity;
  readonly category: VulnerabilityCategory;
  readonly weight: number;
  readonly description: string;
}

export interface NeuralNetworkLayer {
  /** Weight matrix for this layer */
  readonly weights: readonly (readonly number[])[];
  /** Bias vector for this layer */
  readonly biases: readonly number[];
  /** Activation function */
  readonly activation: "relu" | "sigmoid" | "tanh" | "softmax" | "linear";
  /** Layer size */
  readonly size: number;
  /** Dropout rate for regularization */
  readonly dropoutRate: number;
}

export interface NeuralNetworkPrediction {
  readonly predictedLabel: VulnerabilitySeverity;
  readonly confidence: number;
  readonly classProbabilities: CompleteVulnerabilityRecord<number>;
  readonly activations: readonly (readonly number[])[];
  readonly featureImportance: Record<string, number>;
  readonly networkPath: {
    readonly inputActivations: readonly number[];
    readonly hiddenActivations: readonly (readonly number[])[];
    readonly outputActivations: readonly number[];
  };
  readonly processingTime: number;
}

export interface NeuralNetworkModel {
  /** Network layers */
  readonly layers: readonly NeuralNetworkLayer[];
  /** Network architecture */
  readonly architecture: {
    readonly inputSize: number;
    readonly hiddenLayers: readonly number[];
    readonly outputSize: number;
    readonly totalParameters: number;
  };
  /** Training history */
  readonly trainingHistory: {
    readonly epochs: readonly {
      readonly epoch: number;
      readonly loss: number;
      readonly accuracy: number;
      readonly validationLoss: number;
      readonly validationAccuracy: number;
      readonly learningRate: number;
    }[];
    readonly bestEpoch: number;
    readonly bestValidationLoss: number;
  };
  /** Feature scaling parameters */
  readonly featureScaling: {
    readonly means: readonly number[];
    readonly standardDeviations: readonly number[];
    readonly mins: readonly number[];
    readonly maxs: readonly number[];
  };
  /** Label encoding */
  readonly labelEncoding: CompleteVulnerabilityRecord<number>;
  /** Model metadata */
  readonly metadata: {
    readonly trainingDataSize: number;
    readonly featureCount: number;
    readonly classDistribution: CompleteVulnerabilityRecord<number>;
    readonly trainedAt: Date;
    readonly version: string;
  };
}

export interface NeuralNetworkConfig {
  /** Hidden layer sizes */
  readonly hiddenLayers: readonly number[];
  /** Learning rate */
  readonly learningRate: number;
  /** Learning rate decay */
  readonly learningRateDecay: number;
  /** Number of training epochs */
  readonly epochs: number;
  /** Batch size for training */
  readonly batchSize: number;
  /** Validation split ratio */
  readonly validationSplit: number;
  /** Early stopping patience */
  readonly earlyStopping: {
    readonly enabled: boolean;
    readonly patience: number;
    readonly minDelta: number;
  };
  /** Regularization */
  readonly regularization: {
    readonly l1: number;
    readonly l2: number;
    readonly dropout: number;
  };
  /** Optimization algorithm */
  readonly optimizer: "sgd" | "adam" | "rmsprop";
  /** Adam optimizer parameters */
  readonly adamConfig: {
    readonly beta1: number;
    readonly beta2: number;
    readonly epsilon: number;
  };
  /** Feature scaling method */
  readonly featureScaling: "standardization" | "normalization" | "none";
  /** Random initialization seed */
  readonly randomSeed: number | null;
  /** Performance optimization */
  readonly optimization: {
    readonly batchSize: number;
    readonly parallelProcessing: boolean;
    readonly memoryOptimization: boolean;
  };
}

// ===========================
// NEURAL NETWORK IMPLEMENTATION
// ===========================

/**
 * Neural Network Classifier for Vulnerability Pattern Detection
 *
 * Implements a Multi-Layer Perceptron with backpropagation, various activation functions,
 * regularization techniques, and adaptive learning rate optimization.
 */
export class NeuralNetworkClassifier {
  private model: NeuralNetworkModel | null = null;
  private readonly config: NeuralNetworkConfig;
  private readonly logger: Console;
  private trainingStats: {
    totalTrainingTime: number;
    averagePredictionTime: number;
    predictionCount: number;
    forwardPassTime: number;
    backwardPassTime: number;
  } = {
    totalTrainingTime: 0,
    averagePredictionTime: 0,
    predictionCount: 0,
    forwardPassTime: 0,
    backwardPassTime: 0,
  };

  constructor(config?: Partial<NeuralNetworkConfig>) {
    this.config = {
      hiddenLayers: [64, 32, 16],
      learningRate: 0.001,
      learningRateDecay: 0.95,
      epochs: 100,
      batchSize: 32,
      validationSplit: 0.2,
      earlyStopping: {
        enabled: true,
        patience: 10,
        minDelta: 0.001,
      },
      regularization: {
        l1: 0.0001,
        l2: 0.001,
        dropout: 0.3,
      },
      optimizer: "adam",
      adamConfig: {
        beta1: 0.9,
        beta2: 0.999,
        epsilon: 1e-8,
      },
      featureScaling: "standardization",
      randomSeed: 42,
      optimization: {
        batchSize: 500,
        parallelProcessing: true,
        memoryOptimization: true,
      },
      ...config,
    };
    this.logger = console;
  }

  /**
   * Train the Neural Network classifier on vulnerability data
   */
  public async train(
    trainingData: readonly NeuralNetworkTrainingData[],
  ): Promise<void> {
    const startTime = performance.now();
    this.logger.info(
      `Training Neural Network classifier on ${trainingData.length} samples...`,
    );

    try {
      // Validate training data
      this.validateTrainingData(trainingData);

      // Prepare data for training
      const {
        X,
        y,
        featureNames: _featureNames,
      } = await this.prepareTrainingData(trainingData);

      // Split into training and validation sets
      const { trainX, trainY, valX, valY } = this.trainValidationSplit(X, y);

      // Scale features
      const featureScaling = this.calculateFeatureScaling(trainX);
      const scaledTrainX = this.scaleFeatures(trainX, featureScaling);
      const scaledValX = this.scaleFeatures(valX, featureScaling);

      // Initialize network architecture
      const layers = this.initializeNetwork(
        scaledTrainX[0].length,
        y[0].length,
      );

      // Create label encoding
      const labelEncoding = this.createLabelEncoding();

      // Training loop
      const trainingHistory = await this.trainNetwork(
        layers,
        scaledTrainX,
        trainY,
        scaledValX,
        valY,
      );

      // Calculate class distribution
      const classDistribution = this.calculateClassDistribution(trainingData);

      // Create trained model
      this.model = {
        layers,
        architecture: {
          inputSize: scaledTrainX[0].length,
          hiddenLayers: this.config.hiddenLayers,
          outputSize: y[0].length,
          totalParameters: this.calculateTotalParameters(layers),
        },
        trainingHistory,
        featureScaling,
        labelEncoding,
        metadata: {
          trainingDataSize: trainingData.length,
          featureCount: scaledTrainX[0].length,
          classDistribution,
          trainedAt: new Date(),
          version: "2.0.0",
        },
      };

      const duration = performance.now() - startTime;
      this.trainingStats.totalTrainingTime = duration;

      this.logger.info(
        `Neural Network training completed in ${duration.toFixed(2)}ms - ` +
          `Layers: ${layers.length}, Parameters: ${this.model.architecture.totalParameters}, ` +
          `Best Loss: ${trainingHistory.bestValidationLoss.toFixed(4)}`,
      );
    } catch (error) {
      this.logger.error("Neural Network training failed:", error);
      throw new Error(
        `Training failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Predict vulnerability severity using trained model
   */
  public async predict(
    features: NeuralNetworkFeatures,
  ): Promise<NeuralNetworkPrediction> {
    const startTime = performance.now();

    if (!this.model) {
      throw new Error("Model not trained. Call train() first.");
    }

    try {
      // Scale input features
      const scaledFeatures = this.scaleFeatures(
        [features.features as number[]],
        {
          means: [...this.model.featureScaling.means],
          standardDeviations: [...this.model.featureScaling.standardDeviations],
          mins: [...this.model.featureScaling.mins],
          maxs: [...this.model.featureScaling.maxs],
        },
      )[0];

      // Forward pass through network
      const forwardStartTime = performance.now();
      const { activations, output } = this.forwardPass(
        scaledFeatures,
        this.model.layers as NeuralNetworkLayer[],
      );
      this.trainingStats.forwardPassTime = performance.now() - forwardStartTime;

      // Convert output to probabilities
      const classProbabilities = this.outputToProbabilities(output);

      // Get predicted class
      const predictedLabel = this.getPredictedClass(classProbabilities);

      // Calculate confidence
      const confidence = this.calculateConfidence(classProbabilities);

      // Calculate feature importance using gradient-based method
      const featureImportance = await this.calculateFeatureImportance(
        scaledFeatures,
        features.featureNames as string[],
      );

      // Create network path for interpretability
      const networkPath = {
        inputActivations: scaledFeatures,
        hiddenActivations: activations.slice(0, -1),
        outputActivations: output,
      };

      const processingTime = performance.now() - startTime;

      // Update prediction statistics
      this.updatePredictionStats(processingTime);

      return {
        predictedLabel,
        confidence,
        classProbabilities,
        activations,
        featureImportance,
        networkPath,
        processingTime,
      };
    } catch (error) {
      this.logger.error("Neural Network prediction failed:", error);
      throw new Error(
        `Prediction failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Batch predict multiple samples for efficiency
   */
  public async predictBatch(
    featuresArray: readonly NeuralNetworkFeatures[],
  ): Promise<NeuralNetworkPrediction[]> {
    const startTime = performance.now();

    if (!this.model) {
      throw new Error("Model not trained. Call train() first.");
    }

    try {
      const results: NeuralNetworkPrediction[] = [];
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
        `Neural Network batch prediction completed: ${featuresArray.length} samples in ${totalTime.toFixed(2)}ms`,
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
   * Get model architecture information
   */
  public getModelInfo(): {
    readonly isTrained: boolean;
    readonly model: NeuralNetworkModel | null;
    readonly config: NeuralNetworkConfig;
    readonly stats: {
      totalTrainingTime: number;
      averagePredictionTime: number;
      predictionCount: number;
      forwardPassTime: number;
      backwardPassTime: number;
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
   * Get training history for visualization
   */
  public getTrainingHistory(): NeuralNetworkModel["trainingHistory"] | null {
    return this.model?.trainingHistory || null;
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
        `Neural Network model imported successfully: ${this.model?.architecture.totalParameters} parameters`,
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
  private validateTrainingData(
    data: readonly NeuralNetworkTrainingData[],
  ): void {
    if (data.length === 0) {
      throw new Error("Training data cannot be empty");
    }

    const expectedFeatureLength = data[0].features.features.length;

    for (const sample of data) {
      if (!ALL_SEVERITIES.includes(sample.label)) {
        throw new Error(`Invalid label: ${sample.label}`);
      }

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
   * Prepare training data for neural network
   */
  private async prepareTrainingData(
    data: readonly NeuralNetworkTrainingData[],
  ): Promise<{
    X: number[][];
    y: number[][];
    featureNames: string[];
  }> {
    const X: number[][] = [];
    const y: number[][] = [];
    const featureNames = data[0].features.featureNames as string[];

    // Create one-hot encoded labels
    const severityToIndex: Record<VulnerabilitySeverity, number> = {
      info: 0,
      low: 1,
      medium: 2,
      high: 3,
      critical: 4,
    };

    const numClasses = Object.keys(severityToIndex).length;

    for (const sample of data) {
      // Features
      X.push(sample.features.features as number[]);

      // One-hot encoded labels
      const oneHot = new Array(numClasses).fill(0);
      oneHot[severityToIndex[sample.label]] = 1;
      y.push(oneHot);
    }

    return { X, y, featureNames };
  }

  /**
   * Split data into training and validation sets
   */
  private trainValidationSplit(
    X: number[][],
    y: number[][],
  ): {
    trainX: number[][];
    trainY: number[][];
    valX: number[][];
    valY: number[][];
  } {
    const totalSamples = X.length;
    const valSize = Math.floor(totalSamples * this.config.validationSplit);
    const trainSize = totalSamples - valSize;

    // Shuffle data if random seed is set
    const indices = Array.from({ length: totalSamples }, (_, i) => i);
    if (this.config.randomSeed !== null) {
      this.shuffleArray(indices, this.config.randomSeed);
    }

    const trainIndices = indices.slice(0, trainSize);
    const valIndices = indices.slice(trainSize);

    return {
      trainX: trainIndices.map((i) => X[i]),
      trainY: trainIndices.map((i) => y[i]),
      valX: valIndices.map((i) => X[i]),
      valY: valIndices.map((i) => y[i]),
    };
  }

  /**
   * Calculate feature scaling parameters
   */
  private calculateFeatureScaling(X: number[][]): {
    means: number[];
    standardDeviations: number[];
    mins: number[];
    maxs: number[];
  } {
    const numFeatures = X[0].length;
    const means = new Array(numFeatures).fill(0);
    const standardDeviations = new Array(numFeatures).fill(1);
    const mins = new Array(numFeatures).fill(0);
    const maxs = new Array(numFeatures).fill(1);

    if (this.config.featureScaling === "none") {
      return { means, standardDeviations, mins, maxs };
    }

    const numSamples = X.length;

    // Calculate means and min/max
    for (let j = 0; j < numFeatures; j++) {
      let sum = 0;
      let min = X[0][j];
      let max = X[0][j];

      for (let i = 0; i < numSamples; i++) {
        const value = X[i][j];
        sum += value;
        min = Math.min(min, value);
        max = Math.max(max, value);
      }

      means[j] = sum / numSamples;
      mins[j] = min;
      maxs[j] = max;
    }

    // Calculate standard deviations for standardization
    if (this.config.featureScaling === "standardization") {
      for (let j = 0; j < numFeatures; j++) {
        let sumSquaredDiff = 0;

        for (let i = 0; i < numSamples; i++) {
          const diff = X[i][j] - means[j];
          sumSquaredDiff += diff * diff;
        }

        standardDeviations[j] = Math.sqrt(sumSquaredDiff / numSamples);

        // Avoid division by zero
        if (standardDeviations[j] === 0) {
          standardDeviations[j] = 1;
        }
      }
    }

    return { means, standardDeviations, mins, maxs };
  }

  /**
   * Scale features using calculated parameters
   */
  private scaleFeatures(
    X: number[][],
    scaling: {
      means: number[];
      standardDeviations: number[];
      mins: number[];
      maxs: number[];
    },
  ): number[][] {
    if (this.config.featureScaling === "none") {
      return X.map((row) => [...row]);
    }

    return X.map((row) =>
      row.map((value, j) => {
        if (this.config.featureScaling === "standardization") {
          return (value - scaling.means[j]) / scaling.standardDeviations[j];
        } else if (this.config.featureScaling === "normalization") {
          const range = scaling.maxs[j] - scaling.mins[j];
          return range === 0 ? 0 : (value - scaling.mins[j]) / range;
        }
        return value;
      }),
    );
  }

  /**
   * Initialize neural network layers
   */
  private initializeNetwork(
    inputSize: number,
    outputSize: number,
  ): NeuralNetworkLayer[] {
    const layers: NeuralNetworkLayer[] = [];
    const rng =
      this.config.randomSeed !== null
        ? this.createSeededRNG(this.config.randomSeed)
        : Math.random;

    let previousSize = inputSize;

    // Hidden layers
    for (const layerSize of this.config.hiddenLayers) {
      const weights = this.initializeWeights(previousSize, layerSize, rng);
      const biases = new Array(layerSize).fill(0).map(() => rng() * 0.1 - 0.05);

      layers.push({
        weights,
        biases,
        activation: "relu",
        size: layerSize,
        dropoutRate: this.config.regularization.dropout,
      });

      previousSize = layerSize;
    }

    // Output layer
    const outputWeights = this.initializeWeights(previousSize, outputSize, rng);
    const outputBiases = new Array(outputSize).fill(0);

    layers.push({
      weights: outputWeights,
      biases: outputBiases,
      activation: "softmax",
      size: outputSize,
      dropoutRate: 0, // No dropout on output layer
    });

    return layers;
  }

  /**
   * Initialize weights using Xavier/Glorot initialization
   */
  private initializeWeights(
    inputSize: number,
    outputSize: number,
    rng: () => number,
  ): number[][] {
    const limit = Math.sqrt(6 / (inputSize + outputSize));
    const weights: number[][] = [];

    for (let i = 0; i < outputSize; i++) {
      const row: number[] = [];
      for (let j = 0; j < inputSize; j++) {
        row.push(rng() * 2 * limit - limit);
      }
      weights.push(row);
    }

    return weights;
  }

  /**
   * Train the neural network
   */
  private async trainNetwork(
    layers: NeuralNetworkLayer[],
    trainX: number[][],
    trainY: number[][],
    valX: number[][],
    valY: number[][],
  ): Promise<NeuralNetworkModel["trainingHistory"]> {
    const trainingHistory: Array<{
      epoch: number;
      loss: number;
      accuracy: number;
      validationLoss: number;
      validationAccuracy: number;
      learningRate: number;
    }> = [];
    let bestValidationLoss = Infinity;
    let bestEpoch = 0;
    let patienceCounter = 0;
    let currentLearningRate = this.config.learningRate;

    // Initialize optimizer states
    const optimizerStates = this.initializeOptimizerStates(layers);

    for (let epoch = 0; epoch < this.config.epochs; epoch++) {
      const epochStartTime = performance.now();

      // Training phase
      const { loss: trainLoss, accuracy: trainAccuracy } =
        await this.trainEpoch(
          layers,
          trainX,
          trainY,
          currentLearningRate,
          optimizerStates,
        );

      // Validation phase
      const { loss: valLoss, accuracy: valAccuracy } = this.evaluateNetwork(
        layers,
        valX,
        valY,
      );

      // Record history
      (
        trainingHistory as Array<{
          epoch: number;
          loss: number;
          accuracy: number;
          validationLoss: number;
          validationAccuracy: number;
          learningRate: number;
        }>
      ).push({
        epoch: epoch + 1,
        loss: trainLoss,
        accuracy: trainAccuracy,
        validationLoss: valLoss,
        validationAccuracy: valAccuracy,
        learningRate: currentLearningRate,
      });

      // Check for improvement
      if (valLoss < bestValidationLoss - this.config.earlyStopping.minDelta) {
        bestValidationLoss = valLoss;
        bestEpoch = epoch + 1;
        patienceCounter = 0;
      } else {
        patienceCounter++;
      }

      // Early stopping
      if (
        this.config.earlyStopping.enabled &&
        patienceCounter >= this.config.earlyStopping.patience
      ) {
        this.logger.info(`Early stopping at epoch ${epoch + 1}`);
        break;
      }

      // Learning rate decay
      currentLearningRate *= this.config.learningRateDecay;

      const epochTime = performance.now() - epochStartTime;
      this.logger.debug(
        `Epoch ${epoch + 1}/${this.config.epochs} - ` +
          `Loss: ${trainLoss.toFixed(4)}, Acc: ${trainAccuracy.toFixed(4)}, ` +
          `Val Loss: ${valLoss.toFixed(4)}, Val Acc: ${valAccuracy.toFixed(4)} ` +
          `(${epochTime.toFixed(2)}ms)`,
      );
    }

    return {
      epochs: trainingHistory,
      bestEpoch,
      bestValidationLoss,
    };
  }

  /**
   * Train single epoch
   */
  private async trainEpoch(
    layers: NeuralNetworkLayer[],
    trainX: number[][],
    trainY: number[][],
    learningRate: number,
    optimizerStates: (AdamOptimizerState | null)[],
  ): Promise<{ loss: number; accuracy: number }> {
    const numSamples = trainX.length;
    const batchSize = this.config.batchSize;
    let totalLoss = 0;
    let totalCorrect = 0;

    // Shuffle training data
    const indices = Array.from({ length: numSamples }, (_, i) => i);
    if (this.config.randomSeed !== null) {
      this.shuffleArray(indices, this.config.randomSeed);
    }

    // Process batches
    for (let i = 0; i < numSamples; i += batchSize) {
      const batchIndices = indices.slice(
        i,
        Math.min(i + batchSize, numSamples),
      );
      const batchX = batchIndices.map((idx) => trainX[idx]);
      const batchY = batchIndices.map((idx) => trainY[idx]);

      const { loss, accuracy, gradients } = this.forwardBackwardPass(
        layers,
        batchX,
        batchY,
        true, // training mode
      );

      // Update weights
      this.updateWeights(layers, gradients, learningRate, optimizerStates);

      totalLoss += loss * batchX.length;
      totalCorrect += accuracy * batchX.length;
    }

    return {
      loss: totalLoss / numSamples,
      accuracy: totalCorrect / numSamples,
    };
  }

  /**
   * Forward and backward pass
   */
  private forwardBackwardPass(
    layers: NeuralNetworkLayer[],
    batchX: number[][],
    batchY: number[][],
    training: boolean,
  ): {
    loss: number;
    accuracy: number;
    gradients: Array<{
      weights: number[][];
      biases: number[];
    }>;
  } {
    const batchSize = batchX.length;
    const gradients: Array<{ weights: number[][]; biases: number[] }> = [];

    // Initialize gradients
    for (const layer of layers) {
      gradients.push({
        weights: layer.weights.map((row) => new Array(row.length).fill(0)),
        biases: new Array(layer.biases.length).fill(0),
      });
    }

    let totalLoss = 0;
    let totalCorrect = 0;

    // Process each sample in batch
    for (let sampleIdx = 0; sampleIdx < batchSize; sampleIdx++) {
      const x = batchX[sampleIdx];
      const y = batchY[sampleIdx];

      // Forward pass
      const { activations, output } = this.forwardPass(x, layers, training);

      // Calculate loss
      const loss = this.calculateCrossEntropyLoss(output, y);
      totalLoss += loss;

      // Calculate accuracy
      const predicted = this.argmax(output);
      const actual = this.argmax(y);
      if (predicted === actual) {
        totalCorrect++;
      }

      // Backward pass
      const sampleGradients = this.backwardPass(layers, activations, output, y);

      // Accumulate gradients
      for (let layerIdx = 0; layerIdx < layers.length; layerIdx++) {
        const layerGrad = gradients[layerIdx];
        const sampleGrad = sampleGradients[layerIdx];

        for (let i = 0; i < layerGrad.weights.length; i++) {
          for (let j = 0; j < layerGrad.weights[i].length; j++) {
            layerGrad.weights[i][j] += sampleGrad.weights[i][j];
          }
        }

        for (let i = 0; i < layerGrad.biases.length; i++) {
          layerGrad.biases[i] += sampleGrad.biases[i];
        }
      }
    }

    // Average gradients
    for (const layerGrad of gradients) {
      for (let i = 0; i < layerGrad.weights.length; i++) {
        for (let j = 0; j < layerGrad.weights[i].length; j++) {
          layerGrad.weights[i][j] /= batchSize;
        }
      }

      for (let i = 0; i < layerGrad.biases.length; i++) {
        layerGrad.biases[i] /= batchSize;
      }
    }

    return {
      loss: totalLoss / batchSize,
      accuracy: totalCorrect / batchSize,
      gradients,
    };
  }

  /**
   * Forward pass through network
   */
  private forwardPass(
    input: number[],
    layers: NeuralNetworkLayer[],
    training: boolean = false,
  ): { activations: number[][]; output: number[] } {
    const activations: number[][] = [input];
    let currentInput = input;

    for (let layerIdx = 0; layerIdx < layers.length; layerIdx++) {
      const layer = layers[layerIdx];

      // Linear transformation: z = W * x + b
      const z = this.matrixVectorMultiply(
        layer.weights,
        currentInput,
        layer.biases,
      );

      // Apply activation function
      let activation = this.applyActivation(z, layer.activation);

      // Apply dropout during training
      if (training && layer.dropoutRate > 0 && layerIdx < layers.length - 1) {
        activation = this.applyDropout(activation, layer.dropoutRate);
      }

      activations.push(activation);
      currentInput = activation;
    }

    return {
      activations,
      output: currentInput,
    };
  }

  /**
   * Backward pass (backpropagation)
   */
  private backwardPass(
    layers: NeuralNetworkLayer[],
    activations: number[][],
    output: number[],
    target: number[],
  ): Array<{ weights: number[][]; biases: number[] }> {
    const gradients: Array<{ weights: number[][]; biases: number[] }> = [];

    // Calculate output layer error
    let delta = output.map((out, i) => out - target[i]);

    // Backpropagate through layers
    for (let layerIdx = layers.length - 1; layerIdx >= 0; layerIdx--) {
      const layer = layers[layerIdx];
      const layerInput = activations[layerIdx];

      // Calculate gradients for weights and biases
      const weightGrad = this.outerProduct(delta, layerInput);
      const biasGrad = [...delta];

      // Add regularization
      const regularizedWeightGrad = weightGrad.map((row, i) =>
        row.map((w, j) => {
          let grad = w;
          // L1 regularization
          grad +=
            this.config.regularization.l1 * Math.sign(layer.weights[i][j]);
          // L2 regularization
          grad += this.config.regularization.l2 * layer.weights[i][j];
          return grad;
        }),
      );

      gradients.unshift({
        weights: regularizedWeightGrad,
        biases: biasGrad,
      });

      // Calculate error for previous layer
      if (layerIdx > 0) {
        const prevActivations = activations[layerIdx];
        delta = this.matrixVectorMultiplyTranspose(layer.weights, delta);

        // Apply derivative of activation function
        const prevLayer = layerIdx > 0 ? layers[layerIdx - 1] : null;
        if (prevLayer && prevLayer.activation !== "linear") {
          delta = delta.map(
            (d, i) =>
              d *
              this.activationDerivative(
                prevActivations[i],
                prevLayer.activation,
              ),
          );
        }
      }
    }

    return gradients;
  }

  /**
   * Update network weights using optimizer
   */
  private updateWeights(
    layers: NeuralNetworkLayer[],
    gradients: Array<{ weights: number[][]; biases: number[] }>,
    learningRate: number,
    optimizerStates: (AdamOptimizerState | null)[],
  ): void {
    for (let layerIdx = 0; layerIdx < layers.length; layerIdx++) {
      const layer = layers[layerIdx];
      const grad = gradients[layerIdx];
      const state = optimizerStates[layerIdx];

      if (this.config.optimizer === "sgd") {
        this.updateWeightsSGD(layer, grad, learningRate);
      } else if (this.config.optimizer === "adam" && state) {
        this.updateWeightsAdam(layer, grad, learningRate, state);
      }
    }
  }

  /**
   * SGD weight update
   */
  private updateWeightsSGD(
    layer: NeuralNetworkLayer,
    gradients: { weights: number[][]; biases: number[] },
    learningRate: number,
  ): void {
    // Update weights
    for (let i = 0; i < layer.weights.length; i++) {
      for (let j = 0; j < layer.weights[i].length; j++) {
        (layer.weights[i] as number[])[j] -=
          learningRate * gradients.weights[i][j];
      }
    }

    // Update biases
    for (let i = 0; i < layer.biases.length; i++) {
      (layer.biases as number[])[i] -= learningRate * gradients.biases[i];
    }
  }

  /**
   * Adam weight update
   */
  private updateWeightsAdam(
    layer: NeuralNetworkLayer,
    gradients: { weights: number[][]; biases: number[] },
    learningRate: number,
    state: OptimizerState,
  ): void {
    if (!state) {
      throw new Error("Adam optimizer state is required but not provided");
    }

    const { beta1, beta2, epsilon } = this.config.adamConfig;

    state.t = (state.t || 0) + 1;

    // Update weights
    for (let i = 0; i < layer.weights.length; i++) {
      for (let j = 0; j < layer.weights[i].length; j++) {
        const grad = gradients.weights[i][j];

        // Update biased first moment estimate
        state.m.weights[i][j] =
          beta1 * state.m.weights[i][j] + (1 - beta1) * grad;

        // Update biased second raw moment estimate
        state.v.weights[i][j] =
          beta2 * state.v.weights[i][j] + (1 - beta2) * grad * grad;

        // Compute bias-corrected first moment estimate
        const mHat = state.m.weights[i][j] / (1 - Math.pow(beta1, state.t));

        // Compute bias-corrected second raw moment estimate
        const vHat = state.v.weights[i][j] / (1 - Math.pow(beta2, state.t));

        // Update weights
        (layer.weights[i] as number[])[j] -=
          (learningRate * mHat) / (Math.sqrt(vHat) + epsilon);
      }
    }

    // Update biases
    for (let i = 0; i < layer.biases.length; i++) {
      const grad = gradients.biases[i];

      state.m.biases[i] = beta1 * state.m.biases[i] + (1 - beta1) * grad;
      state.v.biases[i] = beta2 * state.v.biases[i] + (1 - beta2) * grad * grad;

      const mHat = state.m.biases[i] / (1 - Math.pow(beta1, state.t));
      const vHat = state.v.biases[i] / (1 - Math.pow(beta2, state.t));

      (layer.biases as number[])[i] -=
        (learningRate * mHat) / (Math.sqrt(vHat) + epsilon);
    }
  }

  /**
   * Evaluate network performance
   */
  private evaluateNetwork(
    layers: NeuralNetworkLayer[],
    X: number[][],
    y: number[][],
  ): { loss: number; accuracy: number } {
    let totalLoss = 0;
    let totalCorrect = 0;

    for (let i = 0; i < X.length; i++) {
      const { output } = this.forwardPass(X[i], layers, false);

      const loss = this.calculateCrossEntropyLoss(output, y[i]);
      totalLoss += loss;

      const predicted = this.argmax(output);
      const actual = this.argmax(y[i]);
      if (predicted === actual) {
        totalCorrect++;
      }
    }

    return {
      loss: totalLoss / X.length,
      accuracy: totalCorrect / X.length,
    };
  }

  /**
   * Calculate feature importance using gradients
   */
  private async calculateFeatureImportance(
    scaledFeatures: number[],
    featureNames: string[],
  ): Promise<Record<string, number>> {
    if (!this.model) {
      return {};
    }

    const importance: Record<string, number> = {};

    // Use gradient-based feature importance
    const epsilon = 1e-7;
    const baseOutput = this.forwardPass(
      scaledFeatures,
      this.model.layers as NeuralNetworkLayer[],
    ).output;

    for (let i = 0; i < scaledFeatures.length; i++) {
      const perturbedFeatures = [...scaledFeatures];
      perturbedFeatures[i] += epsilon;

      const perturbedOutput = this.forwardPass(
        perturbedFeatures,
        this.model.layers as NeuralNetworkLayer[],
      ).output;

      // Calculate gradient
      let gradient = 0;
      for (let j = 0; j < baseOutput.length; j++) {
        gradient += Math.abs(perturbedOutput[j] - baseOutput[j]) / epsilon;
      }

      importance[featureNames[i]] = gradient;
    }

    // Normalize importance scores
    const maxImportance = Math.max(...Object.values(importance));
    if (maxImportance > 0) {
      for (const feature in importance) {
        importance[feature] /= maxImportance;
      }
    }

    return importance;
  }

  // ===========================
  // UTILITY METHODS
  // ===========================

  private createLabelEncoding(): Record<VulnerabilitySeverity, number> {
    return {
      info: 0,
      low: 1,
      medium: 2,
      high: 3,
      critical: 4,
    };
  }

  private outputToProbabilities(
    output: number[],
  ): Record<VulnerabilitySeverity, number> {
    const severities: VulnerabilitySeverity[] = [
      "info",
      "low",
      "medium",
      "high",
      "critical",
    ];
    const probabilities: Record<VulnerabilitySeverity, number> = {} as Record<
      VulnerabilitySeverity,
      number
    >;

    for (let i = 0; i < output.length && i < severities.length; i++) {
      probabilities[severities[i]] = output[i];
    }

    return probabilities;
  }

  private getPredictedClass(
    probabilities: Record<VulnerabilitySeverity, number>,
  ): VulnerabilitySeverity {
    let maxProb = -1;
    let predictedClass: VulnerabilitySeverity = "low";

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

  private calculateConfidence(
    probabilities: Record<VulnerabilitySeverity, number>,
  ): number {
    const sortedProbs = Object.values(probabilities).sort((a, b) => b - a);

    if (sortedProbs.length < 2) {
      return sortedProbs[0] || 0;
    }

    // Confidence based on gap between top two predictions
    return Math.max(0, Math.min(1, sortedProbs[0] - sortedProbs[1]));
  }

  private calculateClassDistribution(
    data: readonly NeuralNetworkTrainingData[],
  ): Record<VulnerabilitySeverity, number> {
    const distribution: Record<VulnerabilitySeverity, number> = {} as Record<
      VulnerabilitySeverity,
      number
    >;

    const severities: VulnerabilitySeverity[] = [
      "info",
      "low",
      "medium",
      "high",
      "critical",
    ];
    for (const severity of severities) {
      distribution[severity] = 0;
    }

    for (const sample of data) {
      distribution[sample.label] += sample.weight;
    }

    return distribution;
  }

  private calculateTotalParameters(layers: NeuralNetworkLayer[]): number {
    return layers.reduce((total, layer) => {
      const weightParams = layer.weights.reduce(
        (sum, row) => sum + row.length,
        0,
      );
      const biasParams = layer.biases.length;
      return total + weightParams + biasParams;
    }, 0);
  }

  private initializeOptimizerStates(
    layers: NeuralNetworkLayer[],
  ): (AdamOptimizerState | null)[] {
    return layers.map((layer) => {
      if (this.config.optimizer === "adam") {
        return {
          t: 0,
          m: {
            weights: layer.weights.map((row) => new Array(row.length).fill(0)),
            biases: new Array(layer.biases.length).fill(0),
          },
          v: {
            weights: layer.weights.map((row) => new Array(row.length).fill(0)),
            biases: new Array(layer.biases.length).fill(0),
          },
        } as AdamOptimizerState;
      }
      return null;
    });
  }

  // Mathematical utility methods
  private matrixVectorMultiply(
    matrix: readonly (readonly number[])[],
    vector: number[],
    bias?: readonly number[],
  ): number[] {
    const result: number[] = [];

    for (let i = 0; i < matrix.length; i++) {
      let sum = 0;
      for (let j = 0; j < vector.length; j++) {
        sum += matrix[i][j] * vector[j];
      }
      result.push(sum + (bias ? bias[i] : 0));
    }

    return result;
  }

  private matrixVectorMultiplyTranspose(
    matrix: readonly (readonly number[])[],
    vector: number[],
  ): number[] {
    const result = new Array(matrix[0].length).fill(0);

    for (let i = 0; i < matrix.length; i++) {
      for (let j = 0; j < matrix[i].length; j++) {
        result[j] += matrix[i][j] * vector[i];
      }
    }

    return result;
  }

  private outerProduct(a: number[], b: number[]): number[][] {
    return a.map((ai) => b.map((bi) => ai * bi));
  }

  private applyActivation(z: number[], activation: string): number[] {
    switch (activation) {
      case "relu":
        return z.map((x) => Math.max(0, x));
      case "sigmoid":
        return z.map((x) => 1 / (1 + Math.exp(-x)));
      case "tanh":
        return z.map((x) => Math.tanh(x));
      case "softmax": {
        const maxZ = Math.max(...z);
        const expZ = z.map((x) => Math.exp(x - maxZ));
        const sumExpZ = expZ.reduce((sum, x) => sum + x, 0);
        return expZ.map((x) => x / sumExpZ);
      }
      case "linear":
      default:
        return [...z];
    }
  }

  private activationDerivative(activation: number, type: string): number {
    switch (type) {
      case "relu":
        return activation > 0 ? 1 : 0;
      case "sigmoid":
        return activation * (1 - activation);
      case "tanh":
        return 1 - activation * activation;
      case "linear":
      default:
        return 1;
    }
  }

  private applyDropout(input: number[], rate: number): number[] {
    const rng =
      this.config.randomSeed !== null
        ? this.createSeededRNG(this.config.randomSeed)
        : Math.random;

    return input.map((x) => (rng() < rate ? 0 : x / (1 - rate)));
  }

  private calculateCrossEntropyLoss(
    predicted: number[],
    actual: number[],
  ): number {
    let loss = 0;
    for (let i = 0; i < predicted.length; i++) {
      const p = Math.max(1e-15, Math.min(1 - 1e-15, predicted[i])); // Clip to prevent log(0)
      loss -= actual[i] * Math.log(p);
    }
    return loss;
  }

  private argmax(array: number[]): number {
    let maxIndex = 0;
    let maxValue = array[0];

    for (let i = 1; i < array.length; i++) {
      if (array[i] > maxValue) {
        maxValue = array[i];
        maxIndex = i;
      }
    }

    return maxIndex;
  }

  private shuffleArray<T>(array: T[], seed: number): void {
    const rng = this.createSeededRNG(seed);

    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  private createSeededRNG(seed: number): () => number {
    let state = seed;
    return () => {
      state = (state * 1664525 + 1013904223) % 4294967296;
      return state / 4294967296;
    };
  }

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
export const defaultNeuralNetworkClassifier = new NeuralNetworkClassifier({
  hiddenLayers: [128, 64, 32],
  learningRate: 0.001,
  learningRateDecay: 0.95,
  epochs: 150,
  batchSize: 32,
  validationSplit: 0.2,
  earlyStopping: {
    enabled: true,
    patience: 15,
    minDelta: 0.001,
  },
  regularization: {
    l1: 0.0001,
    l2: 0.001,
    dropout: 0.3,
  },
  optimizer: "adam",
  adamConfig: {
    beta1: 0.9,
    beta2: 0.999,
    epsilon: 1e-8,
  },
  featureScaling: "standardization",
  randomSeed: 42,
  optimization: {
    batchSize: 100,
    parallelProcessing: true,
    memoryOptimization: true,
  },
});

/**
 * Export types and main class
 */
export { NeuralNetworkClassifier as default };
