/**
 * Decision Tree Classifier for Vulnerability Pattern Detection
 *
 * Enterprise-grade Decision Tree implementation for rule-based vulnerability classification
 * with feature importance analysis, interpretable decision paths, and production-ready optimization.
 *
 * @fileoverview Decision Tree Classifier - Core ML Algorithm Implementation
 * @version 2.0.0
 * @author ML Algorithms Team - Advanced Security Framework
 */

import { performance } from "perf_hooks";
import {
  VulnerabilitySeverity,
  VulnerabilityCategory,
} from "../vulnerability-assessment-engine";

// ===========================
// CORE TYPES AND INTERFACES
// ===========================

export interface DecisionTreeFeatures {
  /** Numerical features */
  readonly numerical: Record<string, number>;
  /** Categorical features */
  readonly categorical: Record<string, string>;
  /** Boolean features */
  readonly boolean: Record<string, boolean>;
  /** Security-specific features */
  readonly securityMetrics: Record<string, number>;
}

export interface DecisionTreeTrainingData {
  readonly features: DecisionTreeFeatures;
  readonly label: VulnerabilitySeverity;
  readonly category: VulnerabilityCategory;
  readonly weight: number;
  readonly description: string;
}

export interface DecisionTreeNode {
  /** Node identifier */
  readonly id: string;
  /** Feature used for splitting */
  readonly feature: string | null;
  /** Feature type */
  readonly featureType: "numerical" | "categorical" | "boolean" | null;
  /** Split threshold or value */
  readonly threshold: number | string | boolean | null;
  /** Predicted class if leaf node */
  readonly prediction: VulnerabilitySeverity | null;
  /** Class probabilities */
  readonly classProbabilities: Record<VulnerabilitySeverity, number>;
  /** Left child node */
  readonly left: DecisionTreeNode | null;
  /** Right child node */
  readonly right: DecisionTreeNode | null;
  /** Node depth */
  readonly depth: number;
  /** Number of samples reaching this node */
  readonly sampleCount: number;
  /** Information gain at this split */
  readonly informationGain: number;
  /** Gini impurity at this node */
  readonly giniImpurity: number;
  /** Is this a leaf node */
  readonly isLeaf: boolean;
}

export interface DecisionTreePrediction {
  readonly predictedLabel: VulnerabilitySeverity;
  readonly confidence: number;
  readonly classProbabilities: Record<VulnerabilitySeverity, number>;
  readonly decisionPath: readonly {
    readonly nodeId: string;
    readonly feature: string;
    readonly condition: string;
    readonly value: number | string | boolean;
  }[];
  readonly featureImportance: Record<string, number>;
  readonly leafNodeInfo: {
    readonly nodeId: string;
    readonly sampleCount: number;
    readonly giniImpurity: number;
  };
  readonly processingTime: number;
}

export interface DecisionTreeModel {
  /** Root node of the decision tree */
  readonly root: DecisionTreeNode;
  /** Feature importance scores */
  readonly featureImportances: Record<string, number>;
  /** Tree statistics */
  readonly treeStatistics: {
    readonly totalNodes: number;
    readonly leafNodes: number;
    readonly maxDepth: number;
    readonly averageDepth: number;
    readonly totalSplits: number;
  };
  /** Model metadata */
  readonly metadata: {
    readonly trainingDataSize: number;
    readonly featureCount: number;
    readonly classDistribution: Record<VulnerabilitySeverity, number>;
    readonly trainedAt: Date;
    readonly version: string;
  };
}

export interface DecisionTreeConfig {
  /** Maximum tree depth */
  readonly maxDepth: number;
  /** Minimum samples required to split a node */
  readonly minSamplesSplit: number;
  /** Minimum samples required in a leaf node */
  readonly minSamplesLeaf: number;
  /** Maximum number of features to consider per split */
  readonly maxFeatures: number | "sqrt" | "log2" | "all";
  /** Minimum information gain required to split */
  readonly minInfoGain: number;
  /** Split criterion */
  readonly criterion: "gini" | "entropy" | "chi_square";
  /** Enable pruning */
  readonly enablePruning: boolean;
  /** Pruning threshold */
  readonly pruningThreshold: number;
  /** Random state for reproducibility */
  readonly randomState: number | null;
  /** Performance optimization */
  readonly optimization: {
    readonly batchSize: number;
    readonly parallelProcessing: boolean;
    readonly memoryOptimization: boolean;
  };
}

// ===========================
// DECISION TREE CLASSIFIER IMPLEMENTATION
// ===========================

/**
 * Decision Tree Classifier for Vulnerability Pattern Detection
 *
 * Implements CART (Classification and Regression Trees) algorithm with Gini impurity,
 * information gain, pruning, and interpretable decision path generation.
 */
export class DecisionTreeClassifier {
  private model: DecisionTreeModel | null = null;
  private readonly config: DecisionTreeConfig;
  private readonly logger: Console;
  private nodeIdCounter: number = 0;
  private trainingStats: {
    totalTrainingTime: number;
    averagePredictionTime: number;
    predictionCount: number;
    treeConstructionTime: number;
    pruningTime: number;
  } = {
    totalTrainingTime: 0,
    averagePredictionTime: 0,
    predictionCount: 0,
    treeConstructionTime: 0,
    pruningTime: 0,
  };

  constructor(config?: Partial<DecisionTreeConfig>) {
    this.config = {
      maxDepth: 10,
      minSamplesSplit: 10,
      minSamplesLeaf: 5,
      maxFeatures: "sqrt",
      minInfoGain: 0.01,
      criterion: "gini",
      enablePruning: true,
      pruningThreshold: 0.05,
      randomState: null,
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
   * Train the Decision Tree classifier on vulnerability data
   */
  public async train(
    trainingData: readonly DecisionTreeTrainingData[],
  ): Promise<void> {
    const startTime = performance.now();
    this.logger.info(
      `Training Decision Tree classifier on ${trainingData.length} samples...`,
    );

    try {
      // Reset node counter
      this.nodeIdCounter = 0;

      // Validate training data
      this.validateTrainingData(trainingData);

      // Preprocess training data
      const processedData = await this.preprocessTrainingData(trainingData);

      // Build decision tree
      const treeStartTime = performance.now();
      const root = await this.buildTree(processedData, 0);
      this.trainingStats.treeConstructionTime =
        performance.now() - treeStartTime;

      // Apply pruning if enabled
      let prunedRoot = root;
      if (this.config.enablePruning) {
        const pruningStartTime = performance.now();
        prunedRoot = this.pruneTree(root);
        this.trainingStats.pruningTime = performance.now() - pruningStartTime;
      }

      // Calculate feature importances
      const featureImportances = this.calculateFeatureImportances(prunedRoot);

      // Calculate tree statistics
      const treeStatistics = this.calculateTreeStatistics(prunedRoot);

      // Calculate class distribution
      const classDistribution = this.calculateClassDistribution(trainingData);

      // Create trained model
      this.model = {
        root: prunedRoot,
        featureImportances,
        treeStatistics,
        metadata: {
          trainingDataSize: trainingData.length,
          featureCount: this.countUniqueFeatures(processedData),
          classDistribution,
          trainedAt: new Date(),
          version: "2.0.0",
        },
      };

      const duration = performance.now() - startTime;
      this.trainingStats.totalTrainingTime = duration;

      this.logger.info(
        `Decision Tree training completed in ${duration.toFixed(2)}ms - ` +
          `Nodes: ${treeStatistics.totalNodes}, Depth: ${treeStatistics.maxDepth}, ` +
          `Features: ${Object.keys(featureImportances).length}`,
      );
    } catch (error) {
      this.logger.error("Decision Tree training failed:", error);
      throw new Error(
        `Training failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Predict vulnerability severity using trained model
   */
  public async predict(
    features: DecisionTreeFeatures,
  ): Promise<DecisionTreePrediction> {
    const startTime = performance.now();

    if (!this.model) {
      throw new Error("Model not trained. Call train() first.");
    }

    try {
      // Traverse decision tree and record path
      const { prediction, classProbabilities, decisionPath, leafNodeInfo } =
        this.traverseTree(this.model.root, features);

      // Calculate confidence
      const confidence = this.calculateConfidence(classProbabilities);

      // Get feature importance for this prediction
      const featureImportance = this.getRelevantFeatureImportance(decisionPath);

      const processingTime = performance.now() - startTime;

      // Update prediction statistics
      this.updatePredictionStats(processingTime);

      return {
        predictedLabel: prediction,
        confidence,
        classProbabilities,
        decisionPath,
        featureImportance,
        leafNodeInfo,
        processingTime,
      };
    } catch (error) {
      this.logger.error("Decision Tree prediction failed:", error);
      throw new Error(
        `Prediction failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Get decision rules as human-readable text
   */
  public generateDecisionRules(): readonly string[] {
    if (!this.model) {
      throw new Error("Model not trained. Call train() first.");
    }

    const rules: string[] = [];
    this.extractRulesFromNode(this.model.root, [], rules);
    return rules;
  }

  /**
   * Get feature importance ranking
   */
  public getFeatureImportances(): Record<string, number> {
    if (!this.model) {
      throw new Error("Model not trained. Call train() first.");
    }

    return { ...this.model.featureImportances };
  }

  /**
   * Visualize tree structure (simplified text representation)
   */
  public visualizeTree(maxDepth: number = 5): string {
    if (!this.model) {
      throw new Error("Model not trained. Call train() first.");
    }

    const lines: string[] = [];
    this.visualizeNode(this.model.root, "", true, lines, 0, maxDepth);
    return lines.join("\n");
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
        `Decision Tree model imported successfully: ${this.model?.treeStatistics.totalNodes} nodes`,
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
    data: readonly DecisionTreeTrainingData[],
  ): void {
    if (data.length === 0) {
      throw new Error("Training data cannot be empty");
    }

    const validSeverities: VulnerabilitySeverity[] = [
      "info",
      "low",
      "medium",
      "high",
      "critical",
    ];

    for (const sample of data) {
      if (!validSeverities.includes(sample.label)) {
        throw new Error(`Invalid label: ${sample.label}`);
      }

      if (sample.weight <= 0) {
        throw new Error(`Invalid weight: ${sample.weight}`);
      }
    }
  }

  /**
   * Preprocess training data
   */
  private async preprocessTrainingData(
    data: readonly DecisionTreeTrainingData[],
  ): Promise<
    Array<{
      features: DecisionTreeFeatures;
      label: VulnerabilitySeverity;
      weight: number;
    }>
  > {
    return data.map((sample) => ({
      features: sample.features,
      label: sample.label,
      weight: sample.weight,
    }));
  }

  /**
   * Build decision tree recursively
   */
  private async buildTree(
    data: Array<{
      features: DecisionTreeFeatures;
      label: VulnerabilitySeverity;
      weight: number;
    }>,
    depth: number,
  ): Promise<DecisionTreeNode> {
    const nodeId = `node_${this.nodeIdCounter++}`;

    // Calculate class probabilities
    const classProbabilities = this.calculateClassProbabilities(data);

    // Check stopping criteria
    if (this.shouldStopSplitting(data, depth)) {
      // Create leaf node
      const prediction = this.getMajorityClass(classProbabilities);
      const giniImpurity = this.calculateGiniImpurity(classProbabilities);

      return {
        id: nodeId,
        feature: null,
        featureType: null,
        threshold: null,
        prediction,
        classProbabilities,
        left: null,
        right: null,
        depth,
        sampleCount: data.length,
        informationGain: 0,
        giniImpurity,
        isLeaf: true,
      };
    }

    // Find best split
    const bestSplit = await this.findBestSplit(data);

    if (!bestSplit || bestSplit.informationGain < this.config.minInfoGain) {
      // Create leaf node if no good split found
      const prediction = this.getMajorityClass(classProbabilities);
      const giniImpurity = this.calculateGiniImpurity(classProbabilities);

      return {
        id: nodeId,
        feature: null,
        featureType: null,
        threshold: null,
        prediction,
        classProbabilities,
        left: null,
        right: null,
        depth,
        sampleCount: data.length,
        informationGain: 0,
        giniImpurity,
        isLeaf: true,
      };
    }

    // Split data
    const { leftData, rightData } = this.splitData(data, bestSplit);

    // Recursively build child nodes
    const left = await this.buildTree(leftData, depth + 1);
    const right = await this.buildTree(rightData, depth + 1);

    const giniImpurity = this.calculateGiniImpurity(classProbabilities);

    return {
      id: nodeId,
      feature: bestSplit.feature,
      featureType: bestSplit.featureType,
      threshold: bestSplit.threshold,
      prediction: null,
      classProbabilities,
      left,
      right,
      depth,
      sampleCount: data.length,
      informationGain: bestSplit.informationGain,
      giniImpurity,
      isLeaf: false,
    };
  }

  /**
   * Check if we should stop splitting
   */
  private shouldStopSplitting(
    data: Array<{
      features: DecisionTreeFeatures;
      label: VulnerabilitySeverity;
      weight: number;
    }>,
    depth: number,
  ): boolean {
    return (
      depth >= this.config.maxDepth ||
      data.length < this.config.minSamplesSplit ||
      this.isDataPure(data)
    );
  }

  /**
   * Check if all samples have the same label
   */
  private isDataPure(
    data: Array<{
      label: VulnerabilitySeverity;
    }>,
  ): boolean {
    if (data.length <= 1) return true;

    const firstLabel = data[0].label;
    return data.every((sample) => sample.label === firstLabel);
  }

  /**
   * Find the best split for the current node
   */
  private async findBestSplit(
    data: Array<{
      features: DecisionTreeFeatures;
      label: VulnerabilitySeverity;
      weight: number;
    }>,
  ): Promise<{
    feature: string;
    featureType: "numerical" | "categorical" | "boolean";
    threshold: number | string | boolean;
    informationGain: number;
  } | null> {
    let bestSplit: {
      feature: string;
      featureType: "numerical" | "categorical" | "boolean";
      threshold: number | string | boolean;
      informationGain: number;
    } | null = null;

    // Get current impurity
    const currentClassProbs = this.calculateClassProbabilities(data);
    const currentImpurity = this.calculateGiniImpurity(currentClassProbs);

    // Try all features and potential splits
    const allFeatures = this.getAllFeatureNames(data);
    const featuresToTry = this.selectFeatures(allFeatures);

    for (const featureName of featuresToTry) {
      const splits = await this.generatePotentialSplits(data, featureName);

      for (const split of splits) {
        const informationGain = this.calculateInformationGain(
          data,
          split,
          currentImpurity,
        );

        if (!bestSplit || informationGain > bestSplit.informationGain) {
          bestSplit = {
            feature: featureName,
            featureType: split.featureType,
            threshold: split.threshold,
            informationGain,
          };
        }
      }
    }

    return bestSplit;
  }

  /**
   * Generate potential splits for a feature
   */
  private async generatePotentialSplits(
    data: Array<{
      features: DecisionTreeFeatures;
    }>,
    featureName: string,
  ): Promise<
    Array<{
      featureType: "numerical" | "categorical" | "boolean";
      threshold: number | string | boolean;
    }>
  > {
    const splits: Array<{
      featureType: "numerical" | "categorical" | "boolean";
      threshold: number | string | boolean;
    }> = [];

    // Determine feature type and generate splits
    const firstSample = data[0];
    const _featureType: "numerical" | "categorical" | "boolean" | null = null;

    if (featureName in firstSample.features.numerical) {
      // Process numerical features
      const values = data
        .map((sample) => sample.features.numerical[featureName])
        .filter((val) => val !== undefined)
        .sort((a, b) => a - b);

      // Generate threshold splits for numerical features
      for (let i = 0; i < values.length - 1; i++) {
        if (values[i] !== values[i + 1]) {
          splits.push({
            featureType: "numerical",
            threshold: (values[i] + values[i + 1]) / 2,
          });
        }
      }
    } else if (featureName in firstSample.features.categorical) {
      // Process categorical features
      const uniqueValues = Array.from(
        new Set(
          data
            .map((sample) => sample.features.categorical[featureName])
            .filter((val) => val !== undefined),
        ),
      );

      // Generate splits for each unique value
      for (const value of uniqueValues) {
        splits.push({
          featureType: "categorical",
          threshold: value,
        });
      }
    } else if (featureName in firstSample.features.boolean) {
      // Process boolean features
      splits.push({
        featureType: "boolean",
        threshold: true,
      });
      splits.push({
        featureType: "boolean",
        threshold: false,
      });
    } else if (featureName in firstSample.features.securityMetrics) {
      // Process security metrics as numerical features
      const values = data
        .map((sample) => sample.features.securityMetrics[featureName])
        .filter((val) => val !== undefined)
        .sort((a, b) => a - b);

      for (let i = 0; i < values.length - 1; i++) {
        if (values[i] !== values[i + 1]) {
          splits.push({
            featureType: "numerical",
            threshold: (values[i] + values[i + 1]) / 2,
          });
        }
      }
    }

    return splits;
  }

  /**
   * Calculate information gain for a split
   */
  private calculateInformationGain(
    data: Array<{
      features: DecisionTreeFeatures;
      label: VulnerabilitySeverity;
      weight: number;
    }>,
    split: {
      featureType: "numerical" | "categorical" | "boolean";
      threshold: number | string | boolean;
    },
    currentImpurity: number,
  ): number {
    const { leftData, rightData } = this.splitData(data, {
      feature: this.findFeatureName(data, split),
      ...split,
    });

    if (leftData.length === 0 || rightData.length === 0) {
      return 0;
    }

    const totalSamples = data.length;
    const leftWeight = leftData.length / totalSamples;
    const rightWeight = rightData.length / totalSamples;

    const leftClassProbs = this.calculateClassProbabilities(leftData);
    const rightClassProbs = this.calculateClassProbabilities(rightData);

    const leftImpurity = this.calculateGiniImpurity(leftClassProbs);
    const rightImpurity = this.calculateGiniImpurity(rightClassProbs);

    const weightedImpurity =
      leftWeight * leftImpurity + rightWeight * rightImpurity;

    return currentImpurity - weightedImpurity;
  }

  /**
   * Split data based on feature and threshold
   */
  private splitData(
    data: Array<{
      features: DecisionTreeFeatures;
      label: VulnerabilitySeverity;
      weight: number;
    }>,
    split: {
      feature: string;
      featureType: "numerical" | "categorical" | "boolean";
      threshold: number | string | boolean;
    },
  ): {
    leftData: Array<{
      features: DecisionTreeFeatures;
      label: VulnerabilitySeverity;
      weight: number;
    }>;
    rightData: Array<{
      features: DecisionTreeFeatures;
      label: VulnerabilitySeverity;
      weight: number;
    }>;
  } {
    const leftData: Array<{
      features: DecisionTreeFeatures;
      label: VulnerabilitySeverity;
      weight: number;
    }> = [];
    const rightData: Array<{
      features: DecisionTreeFeatures;
      label: VulnerabilitySeverity;
      weight: number;
    }> = [];

    for (const sample of data) {
      let value: number | string | boolean | undefined;

      if (split.featureType === "numerical") {
        value =
          sample.features.numerical[split.feature] ??
          sample.features.securityMetrics[split.feature];
      } else if (split.featureType === "categorical") {
        value = sample.features.categorical[split.feature];
      } else if (split.featureType === "boolean") {
        value = sample.features.boolean[split.feature];
      }

      if (value === undefined) {
        // Handle missing values by putting in right branch
        rightData.push(sample);
        continue;
      }

      let goLeft = false;

      if (split.featureType === "numerical") {
        goLeft = (value as number) <= (split.threshold as number);
      } else if (split.featureType === "categorical") {
        goLeft = value === split.threshold;
      } else if (split.featureType === "boolean") {
        goLeft = value === split.threshold;
      }

      if (goLeft) {
        leftData.push(sample);
      } else {
        rightData.push(sample);
      }
    }

    return { leftData, rightData };
  }

  /**
   * Calculate class probabilities
   */
  private calculateClassProbabilities(
    data: Array<{
      label: VulnerabilitySeverity;
      weight: number;
    }>,
  ): Record<VulnerabilitySeverity, number> {
    const classCounts: Record<string, number> = {};
    let totalWeight = 0;

    for (const sample of data) {
      classCounts[sample.label] =
        (classCounts[sample.label] || 0) + sample.weight;
      totalWeight += sample.weight;
    }

    const probabilities: Record<VulnerabilitySeverity, number> = {} as Record<
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
      probabilities[severity] = (classCounts[severity] || 0) / totalWeight;
    }

    return probabilities;
  }

  /**
   * Calculate Gini impurity
   */
  private calculateGiniImpurity(
    classProbabilities: Record<VulnerabilitySeverity, number>,
  ): number {
    let impurity = 1.0;

    for (const prob of Object.values(classProbabilities)) {
      impurity -= prob * prob;
    }

    return impurity;
  }

  /**
   * Get majority class
   */
  private getMajorityClass(
    classProbabilities: Record<VulnerabilitySeverity, number>,
  ): VulnerabilitySeverity {
    let maxProb = -1;
    let majorityClass: VulnerabilitySeverity = "low";

    for (const [severity, prob] of Object.entries(classProbabilities) as [
      VulnerabilitySeverity,
      number,
    ][]) {
      if (prob > maxProb) {
        maxProb = prob;
        majorityClass = severity;
      }
    }

    return majorityClass;
  }

  /**
   * Traverse tree to make prediction
   */
  private traverseTree(
    node: DecisionTreeNode,
    features: DecisionTreeFeatures,
  ): {
    prediction: VulnerabilitySeverity;
    classProbabilities: Record<VulnerabilitySeverity, number>;
    decisionPath: Array<{
      nodeId: string;
      feature: string;
      condition: string;
      value: number | string | boolean;
    }>;
    leafNodeInfo: {
      nodeId: string;
      sampleCount: number;
      giniImpurity: number;
    };
  } {
    const decisionPath: Array<{
      nodeId: string;
      feature: string;
      condition: string;
      value: number | string | boolean;
    }> = [];

    let currentNode = node;

    while (!currentNode.isLeaf) {
      if (!currentNode.feature || !currentNode.featureType) {
        throw new Error("Non-leaf node missing feature information");
      }

      let value: number | string | boolean | undefined;

      if (currentNode.featureType === "numerical") {
        value =
          features.numerical[currentNode.feature] ??
          features.securityMetrics[currentNode.feature];
      } else if (currentNode.featureType === "categorical") {
        value = features.categorical[currentNode.feature];
      } else if (currentNode.featureType === "boolean") {
        value = features.boolean[currentNode.feature];
      }

      let goLeft = false;
      let condition = "";

      if (value === undefined) {
        // Handle missing values - go right
        goLeft = false;
        condition = "is missing";
      } else if (currentNode.featureType === "numerical") {
        goLeft = (value as number) <= (currentNode.threshold as number);
        condition = goLeft
          ? `<= ${currentNode.threshold}`
          : `> ${currentNode.threshold}`;
      } else if (currentNode.featureType === "categorical") {
        goLeft = value === currentNode.threshold;
        condition = goLeft
          ? `== '${currentNode.threshold}'`
          : `!= '${currentNode.threshold}'`;
      } else if (currentNode.featureType === "boolean") {
        goLeft = value === currentNode.threshold;
        condition = goLeft
          ? `== ${currentNode.threshold}`
          : `!= ${currentNode.threshold}`;
      }

      decisionPath.push({
        nodeId: currentNode.id,
        feature: currentNode.feature,
        condition,
        value: value ?? "missing",
      });

      currentNode = goLeft ? currentNode.left! : currentNode.right!;
    }

    const prediction = currentNode.prediction!;
    const classProbabilities = currentNode.classProbabilities;

    return {
      prediction,
      classProbabilities,
      decisionPath,
      leafNodeInfo: {
        nodeId: currentNode.id,
        sampleCount: currentNode.sampleCount,
        giniImpurity: currentNode.giniImpurity,
      },
    };
  }

  /**
   * Calculate confidence based on class probabilities
   */
  private calculateConfidence(
    classProbabilities: Record<VulnerabilitySeverity, number>,
  ): number {
    const sortedProbs = Object.values(classProbabilities).sort((a, b) => b - a);

    if (sortedProbs.length < 2) {
      return sortedProbs[0] || 0;
    }

    // Confidence based on gap between top two predictions
    return Math.max(0, Math.min(1, sortedProbs[0] - sortedProbs[1]));
  }

  /**
   * Get relevant feature importance for prediction path
   */
  private getRelevantFeatureImportance(
    decisionPath: readonly {
      feature: string;
    }[],
  ): Record<string, number> {
    if (!this.model) {
      return {};
    }

    const pathFeatures = new Set(decisionPath.map((step) => step.feature));
    const relevantImportances: Record<string, number> = {};

    Array.from(pathFeatures).forEach((feature) => {
      if (this.model && feature in this.model.featureImportances) {
        relevantImportances[feature] = this.model.featureImportances[feature];
      }
    });

    return relevantImportances;
  }

  /**
   * Calculate feature importances based on tree structure
   */
  private calculateFeatureImportances(
    root: DecisionTreeNode,
  ): Record<string, number> {
    const importances: Record<string, number> = {};
    const totalSamples = root.sampleCount;

    this.calculateNodeImportance(root, importances, totalSamples);

    // Normalize importances
    const totalImportance = Object.values(importances).reduce(
      (sum, imp) => sum + imp,
      0,
    );

    if (totalImportance > 0) {
      for (const feature in importances) {
        importances[feature] /= totalImportance;
      }
    }

    return importances;
  }

  /**
   * Calculate importance for a single node
   */
  private calculateNodeImportance(
    node: DecisionTreeNode,
    importances: Record<string, number>,
    totalSamples: number,
  ): void {
    if (node.isLeaf || !node.feature) {
      return;
    }

    const nodeWeight = node.sampleCount / totalSamples;
    const importance = nodeWeight * node.informationGain;

    importances[node.feature] = (importances[node.feature] || 0) + importance;

    if (node.left) {
      this.calculateNodeImportance(node.left, importances, totalSamples);
    }
    if (node.right) {
      this.calculateNodeImportance(node.right, importances, totalSamples);
    }
  }

  /**
   * Prune tree to prevent overfitting
   */
  private pruneTree(node: DecisionTreeNode): DecisionTreeNode {
    if (node.isLeaf) {
      return node;
    }

    // Recursively prune children first
    const prunedLeft = node.left ? this.pruneTree(node.left) : null;
    const prunedRight = node.right ? this.pruneTree(node.right) : null;

    // Check if both children are leaves with same prediction
    if (
      prunedLeft?.isLeaf &&
      prunedRight?.isLeaf &&
      prunedLeft.prediction === prunedRight.prediction &&
      node.informationGain < this.config.pruningThreshold
    ) {
      // Convert to leaf
      return {
        ...node,
        prediction: prunedLeft.prediction,
        left: null,
        right: null,
        isLeaf: true,
      };
    }

    return {
      ...node,
      left: prunedLeft,
      right: prunedRight,
    };
  }

  /**
   * Calculate tree statistics
   */
  private calculateTreeStatistics(root: DecisionTreeNode): {
    totalNodes: number;
    leafNodes: number;
    maxDepth: number;
    averageDepth: number;
    totalSplits: number;
  } {
    let totalNodes = 0;
    let leafNodes = 0;
    let maxDepth = 0;
    let totalDepth = 0;
    let totalSplits = 0;

    const traverse = (node: DecisionTreeNode): void => {
      totalNodes++;
      maxDepth = Math.max(maxDepth, node.depth);

      if (node.isLeaf) {
        leafNodes++;
        totalDepth += node.depth;
      } else {
        totalSplits++;
        if (node.left) traverse(node.left);
        if (node.right) traverse(node.right);
      }
    };

    traverse(root);

    return {
      totalNodes,
      leafNodes,
      maxDepth,
      averageDepth: leafNodes > 0 ? totalDepth / leafNodes : 0,
      totalSplits,
    };
  }

  /**
   * Extract rules from tree
   */
  private extractRulesFromNode(
    node: DecisionTreeNode,
    conditions: string[],
    rules: string[],
  ): void {
    if (node.isLeaf) {
      const rule = `IF ${conditions.join(" AND ")} THEN ${node.prediction} (confidence: ${Math.max(...Object.values(node.classProbabilities)).toFixed(3)})`;
      rules.push(rule);
      return;
    }

    if (node.feature && node.left && node.right) {
      // Left branch
      let leftCondition = "";
      if (node.featureType === "numerical") {
        leftCondition = `${node.feature} <= ${node.threshold}`;
      } else if (node.featureType === "categorical") {
        leftCondition = `${node.feature} == '${node.threshold}'`;
      } else if (node.featureType === "boolean") {
        leftCondition = `${node.feature} == ${node.threshold}`;
      }

      this.extractRulesFromNode(
        node.left,
        [...conditions, leftCondition],
        rules,
      );

      // Right branch
      let rightCondition = "";
      if (node.featureType === "numerical") {
        rightCondition = `${node.feature} > ${node.threshold}`;
      } else if (node.featureType === "categorical") {
        rightCondition = `${node.feature} != '${node.threshold}'`;
      } else if (node.featureType === "boolean") {
        rightCondition = `${node.feature} != ${node.threshold}`;
      }

      this.extractRulesFromNode(
        node.right,
        [...conditions, rightCondition],
        rules,
      );
    }
  }

  /**
   * Visualize tree node
   */
  private visualizeNode(
    node: DecisionTreeNode,
    prefix: string,
    isLast: boolean,
    lines: string[],
    currentDepth: number,
    maxDepth: number,
  ): void {
    if (currentDepth > maxDepth) return;

    const connector = isLast ? "└── " : "├── ";
    let nodeDescription = "";

    if (node.isLeaf) {
      nodeDescription = `LEAF: ${node.prediction} (samples: ${node.sampleCount}, gini: ${node.giniImpurity.toFixed(3)})`;
    } else {
      nodeDescription = `${node.feature} ${node.featureType} ${node.threshold} (samples: ${node.sampleCount}, gain: ${node.informationGain.toFixed(3)})`;
    }

    lines.push(prefix + connector + nodeDescription);

    if (!node.isLeaf && currentDepth < maxDepth) {
      const newPrefix = prefix + (isLast ? "    " : "│   ");

      if (node.left) {
        this.visualizeNode(
          node.left,
          newPrefix,
          !node.right,
          lines,
          currentDepth + 1,
          maxDepth,
        );
      }
      if (node.right) {
        this.visualizeNode(
          node.right,
          newPrefix,
          true,
          lines,
          currentDepth + 1,
          maxDepth,
        );
      }
    }
  }

  // Helper methods
  private getAllFeatureNames(
    data: Array<{ features: DecisionTreeFeatures }>,
  ): string[] {
    const features = new Set<string>();

    for (const sample of data) {
      Object.keys(sample.features.numerical).forEach((f) => features.add(f));
      Object.keys(sample.features.categorical).forEach((f) => features.add(f));
      Object.keys(sample.features.boolean).forEach((f) => features.add(f));
      Object.keys(sample.features.securityMetrics).forEach((f) =>
        features.add(f),
      );
    }

    return Array.from(features);
  }

  private selectFeatures(allFeatures: string[]): string[] {
    if (this.config.maxFeatures === "all") {
      return allFeatures;
    }

    let numFeatures: number;
    if (this.config.maxFeatures === "sqrt") {
      numFeatures = Math.floor(Math.sqrt(allFeatures.length));
    } else if (this.config.maxFeatures === "log2") {
      numFeatures = Math.floor(Math.log2(allFeatures.length));
    } else {
      numFeatures = Math.min(
        this.config.maxFeatures as number,
        allFeatures.length,
      );
    }

    // Randomly select features if random state is set
    if (this.config.randomState !== null) {
      const rng = this.createSeededRNG(this.config.randomState);
      return this.shuffleArray(allFeatures, rng).slice(0, numFeatures);
    }

    return allFeatures.slice(0, numFeatures);
  }

  private createSeededRNG(seed: number): () => number {
    let state = seed;
    return () => {
      state = (state * 1664525 + 1013904223) % 4294967296;
      return state / 4294967296;
    };
  }

  private shuffleArray<T>(array: T[], rng: () => number): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private findFeatureName(
    data: Array<{ features: DecisionTreeFeatures }>,
    split: { featureType: string; threshold: number | string | boolean },
  ): string {
    // This is a helper to find the feature name from the split
    // In practice, this should be passed along with the split
    const sample = data[0];

    if (split.featureType === "numerical") {
      for (const [name, _value] of Object.entries(sample.features.numerical)) {
        if (typeof split.threshold === "number") return name;
      }
      for (const [name, _value] of Object.entries(
        sample.features.securityMetrics,
      )) {
        if (typeof split.threshold === "number") return name;
      }
    } else if (split.featureType === "categorical") {
      for (const name of Object.keys(sample.features.categorical)) {
        return name;
      }
    } else if (split.featureType === "boolean") {
      for (const name of Object.keys(sample.features.boolean)) {
        return name;
      }
    }

    return "unknown_feature";
  }

  private countUniqueFeatures(
    data: Array<{ features: DecisionTreeFeatures }>,
  ): number {
    return this.getAllFeatureNames(data).length;
  }

  private calculateClassDistribution(
    data: readonly DecisionTreeTrainingData[],
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
export const defaultDecisionTreeClassifier = new DecisionTreeClassifier({
  maxDepth: 8,
  minSamplesSplit: 15,
  minSamplesLeaf: 7,
  maxFeatures: "sqrt",
  minInfoGain: 0.005,
  criterion: "gini",
  enablePruning: true,
  pruningThreshold: 0.02,
  randomState: 42,
  optimization: {
    batchSize: 500,
    parallelProcessing: true,
    memoryOptimization: true,
  },
});

/**
 * Export types and main class
 */
export { DecisionTreeClassifier as default };
