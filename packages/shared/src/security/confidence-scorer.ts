/**
 * Simple Confidence Scorer for Security Vulnerability Assessment
 *
 * Provides practical confidence scoring for vulnerability assessment results
 * without unnecessary ML complexity. Focuses on source reliability weighting
 * and basic confidence normalization.
 *
 * @author Claude Code Assistant
 * @version 1.0.0
 * @created 2025-09-09
 */

/**
 * Configuration for confidence scoring
 */
export interface ConfidenceScorerConfig {
  /** Enable confidence scoring */
  enabled: boolean;

  /** Source reliability weights */
  sourceWeights: {
    owasp_scanner: number;
    configuration_analyzer: number;
    vulnerability_detector: number;
    pattern_matcher: number;
    default: number;
  };

  /** Confidence bounds */
  bounds: {
    minimum: number;
    maximum: number;
  };
}

/**
 * Simple confidence score result
 */
export interface ConfidenceResult {
  /** Final confidence score (0-1) */
  score: number;

  /** Source that provided the original score */
  source: string;

  /** Original confidence before adjustment */
  originalScore: number;

  /** Applied source weight */
  sourceWeight: number;

  /** Calculation timestamp */
  timestamp: Date;
}

/**
 * Simple Confidence Scorer
 *
 * Provides lightweight confidence scoring for vulnerability assessment
 * results based on source reliability weighting.
 */
export class ConfidenceScorer {
  private readonly config: ConfidenceScorerConfig;

  /**
   * Initialize the confidence scorer
   */
  constructor(config?: Partial<ConfidenceScorerConfig>) {
    this.config = {
      enabled: true,
      sourceWeights: {
        owasp_scanner: 0.9,
        configuration_analyzer: 0.85,
        vulnerability_detector: 0.8,
        pattern_matcher: 0.75,
        default: 0.7,
      },
      bounds: {
        minimum: 0.1,
        maximum: 0.95,
      },
      ...config,
    };
  }

  /**
   * Calculate confidence score for a vulnerability assessment result
   */
  public calculateConfidence(
    originalScore: number,
    source: string,
    metadata?: Record<string, unknown>,
  ): ConfidenceResult {
    if (!this.config.enabled) {
      return {
        score: originalScore,
        source,
        originalScore,
        sourceWeight: 1.0,
        timestamp: new Date(),
      };
    }

    // Get source weight
    const sourceWeight = this.getSourceWeight(source);

    // Apply source weighting
    let adjustedScore = originalScore * sourceWeight;

    // Apply metadata adjustments if available
    if (metadata) {
      adjustedScore = this.applyMetadataAdjustments(adjustedScore, metadata);
    }

    // Ensure score is within bounds
    const finalScore = Math.max(
      this.config.bounds.minimum,
      Math.min(this.config.bounds.maximum, adjustedScore),
    );

    return {
      score: finalScore,
      source,
      originalScore,
      sourceWeight,
      timestamp: new Date(),
    };
  }

  /**
   * Batch calculate confidence scores for multiple results
   */
  public calculateBatchConfidence(
    results: Array<{
      score: number;
      source: string;
      metadata?: Record<string, unknown>;
    }>,
  ): ConfidenceResult[] {
    return results.map(({ score, source, metadata }) =>
      this.calculateConfidence(score, source, metadata),
    );
  }

  /**
   * Get source reliability weight
   */
  private getSourceWeight(source: string): number {
    const normalizedSource = source.toLowerCase().replace(/[^a-z_]/g, "_");

    // Check for exact match
    if (normalizedSource in this.config.sourceWeights) {
      return this.config.sourceWeights[
        normalizedSource as keyof typeof this.config.sourceWeights
      ];
    }

    // Check for partial matches
    for (const [weightSource, weight] of Object.entries(
      this.config.sourceWeights,
    )) {
      if (weightSource === "default") continue;

      if (
        normalizedSource.includes(weightSource) ||
        weightSource.includes(normalizedSource)
      ) {
        return weight;
      }
    }

    // Return default weight
    return this.config.sourceWeights.default;
  }

  /**
   * Apply metadata-based adjustments to confidence score
   */
  private applyMetadataAdjustments(
    score: number,
    metadata: Record<string, unknown>,
  ): number {
    let adjustedScore = score;

    // Severity-based adjustment
    if (metadata.severity && typeof metadata.severity === "string") {
      const severityMultiplier = this.getSeverityMultiplier(metadata.severity);
      adjustedScore *= severityMultiplier;
    }

    // Age-based adjustment (newer findings more confident)
    if (metadata.timestamp) {
      const timestampValue =
        metadata.timestamp instanceof Date
          ? metadata.timestamp
          : new Date(metadata.timestamp as string);
      const ageMultiplier = this.getAgeMultiplier(timestampValue);
      adjustedScore *= ageMultiplier;
    }

    // Validation status adjustment
    if (metadata.validated === true) {
      adjustedScore *= 1.1; // 10% boost for validated findings
    }

    return adjustedScore;
  }

  /**
   * Get severity-based confidence multiplier
   */
  private getSeverityMultiplier(severity: string): number {
    const severityMultipliers: Record<string, number> = {
      critical: 1.15,
      high: 1.1,
      medium: 1.0,
      low: 0.9,
      info: 0.8,
    };

    return severityMultipliers[severity.toLowerCase()] || 1.0;
  }

  /**
   * Get age-based confidence multiplier
   */
  private getAgeMultiplier(timestamp: Date): number {
    const now = new Date();
    const ageHours = (now.getTime() - timestamp.getTime()) / (1000 * 60 * 60);

    // Confidence decreases slightly over time
    if (ageHours < 1) return 1.0; // Full confidence for recent findings
    if (ageHours < 24) return 0.98; // Slight decrease after 1 hour
    if (ageHours < 168) return 0.95; // More decrease after 1 day

    return 0.9; // Older than 1 week
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<ConfidenceScorerConfig>): void {
    Object.assign(this.config, newConfig);
  }

  /**
   * Get current configuration
   */
  public getConfig(): ConfidenceScorerConfig {
    return { ...this.config };
  }
}

/**
 * Export default instance with standard configuration
 */
export const defaultConfidenceScorer = new ConfidenceScorer();

/**
 * Export types and classes
 */
export { ConfidenceScorer as default };
