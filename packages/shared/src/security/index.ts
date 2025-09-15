/**
 * Security Module - Vulnerability Assessment Framework
 *
 * Focused security infrastructure for vulnerability assessment,
 * configuration analysis, and threat detection. Designed for
 * local-only deployment without unnecessary complexity.
 *
 * @fileoverview Security Framework Index - Essential Security Components
 * @version 1.0.0
 * @author Claude Code Assistant
 */

// ===========================
// AVAILABLE SECURITY EXPORTS
// ===========================
// Note: Some large security files are temporarily ignored in ESLint config
// due to timeout issues. Only actively exported types are included here.

// ===========================
// CONFIDENCE SCORING - AVAILABLE
// ===========================

import {
  ConfidenceScorer,
  type ConfidenceScorerConfig,
  type ConfidenceResult,
} from "./confidence-scorer";

// Import real security class implementations
import {
  VulnerabilityAssessmentEngine,
  type VulnerabilityAssessmentConfig,
  type VulnerabilityAssessmentResult,
  type Vulnerability,
} from "./vulnerability-assessment-engine";
import {
  ConfigurationAnalyzer,
  type ConfigurationAnalysisResult,
} from "./configuration-analyzer";
import {
  VulnerabilityReportingEngine,
  type GeneratedReport,
  type ReportConfiguration,
} from "./vulnerability-reporting-engine";

// Export all core security classes and types
export { ConfidenceScorer, type ConfidenceScorerConfig, type ConfidenceResult };
export {
  VulnerabilityAssessmentEngine,
  type VulnerabilityAssessmentConfig,
  type VulnerabilityAssessmentResult,
  type Vulnerability,
};
export { ConfigurationAnalyzer, type ConfigurationAnalysisResult };
export {
  VulnerabilityReportingEngine,
  type GeneratedReport,
  type ReportConfiguration,
};

// ===========================
// OWASP TOP 10 INTEGRATION - AVAILABLE
// ===========================

export {
  OWASPTop10IntegrationService,
  type ScanResult,
  type ScanConfiguration,
  type OWASPCategory,
} from "./owasp-top10-integration.service";

// ===========================
// REAL-TIME PATTERN MATCHING - AVAILABLE
// ===========================

export {
  RealTimePatternMatcher,
  PatternRegistry,
  StreamingPatternProcessor,
  createRealTimePatternMatcher,
  createStreamingProcessor,
  type PatternMatchConfig,
  type PatternMatchResult,
  type BatchMatchResult,
  type PatternType,
  type ConfidenceAlgorithm,
  type ProcessingMode,
  type StreamingConfig,
  type CacheConfig,
  type PatternMatcherConfig,
} from "./real-time-pattern-matcher";

// ===========================
// PATTERN MATCHER INTEGRATIONS - AVAILABLE
// ===========================

export {
  WebApplicationSecurityIntegration,
  ExpressSecurityMiddleware,
  StreamingSecurityAnalyzer,
  APISecurityIntegration,
  PatternMatcherUsageExamples,
} from "./examples/pattern-matcher-integration";

// ===========================
// ML ALGORITHMS SUITE - AVAILABLE
// ===========================

export {
  // Main ML Algorithm Suite
  MLAlgorithmSuite,
  createMLAlgorithmSuite,
  createLightweightMLSuite,

  // Individual ML Algorithms
  NaiveBayesClassifier,
  DecisionTreeClassifier,
  NeuralNetworkClassifier,

  // Feature Extraction and Processing
  FeatureExtractionEngine,

  // Ensemble Learning
  MLEnsembleCoordinator,

  // Performance Evaluation
  MLPerformanceMetrics,

  // Core ML Types and Interfaces
  type MLSuiteConfig,
  type VulnerabilityTrainingData,
  type MLTrainingResults,
  type MLPredictionResult,
  type ComprehensiveMetrics,
  type MLModelsExport,

  // Naive Bayes Types
  type NaiveBayesFeatures,
  type NaiveBayesTrainingData,
  type NaiveBayesPrediction,
  type NaiveBayesModel,
  type NaiveBayesConfig,

  // Decision Tree Types
  type DecisionTreeFeatures,
  type DecisionTreeNode,
  type DecisionTreePrediction,
  type DecisionTreeConfig,

  // Neural Network Types
  type NeuralNetworkFeatures,
  type NeuralNetworkLayer,
  type NeuralNetworkModel,
  type NeuralNetworkConfig,
  type NeuralNetworkPrediction,

  // Feature Extraction Types
  type TextFeatures,
  type SecurityPatternFeatures,
  type FeatureExtractionConfig,
  type VocabularyInfo,
  type FeatureExtractionResult,

  // Ensemble Types
  type EnsembleBaseModel,
  type EnsemblePrediction,
  type EnsembleConfig,
  type EnsembleTrainingData,
  type EnsembleModel,

  // Performance Metrics Types
  type PerformanceMetrics,
  type CrossValidationResults,
  type ModelComparison,
  type LearningCurveData,
  type MetricsReport,
  type PredictionResult,
  type MetricsConfig,
} from "./ml-algorithms";

// ===========================
// PLACEHOLDER TYPES FOR IGNORED FILES
// ===========================
// These provide type safety until the large files can be processed

// Placeholder interfaces removed - using real implementations from imported files

export interface ConfigurationIssue {
  readonly id: string;
  readonly severity: string;
}

export interface ReportTemplate {
  readonly name: string;
  readonly template: string;
}

// ===========================
// REAL SECURITY CLASS IMPLEMENTATIONS
// ===========================
// Exported above with imports

// ===========================
// SECURITY POLICY
// ===========================

export { SecurityPolicyValidatorService } from "./policy/security-policy-validator.service";

/**
 * Configuration interface for vulnerability assessment system
 */
interface VulnerabilityAssessmentSystemConfig {
  enableConfidenceScoring?: boolean;
  enableReporting?: boolean;
  owaspScanEnabled?: boolean;
  configAnalysisEnabled?: boolean;
}

/**
 * Create a complete vulnerability assessment system
 * with integrated confidence scoring and reporting
 */
export function createVulnerabilityAssessmentSystem(
  config?: VulnerabilityAssessmentSystemConfig,
) {
  let confidenceScorer: InstanceType<typeof ConfidenceScorer> | undefined =
    undefined;
  try {
    confidenceScorer =
      config?.enableConfidenceScoring !== false
        ? new ConfidenceScorer()
        : undefined;
  } catch (error) {
    console.warn("Failed to initialize ConfidenceScorer:", error);
    confidenceScorer = undefined;
  }

  let assessmentEngine: VulnerabilityAssessmentEngine;
  try {
    assessmentEngine = new VulnerabilityAssessmentEngine();
  } catch (error) {
    throw new Error(
      `Failed to initialize VulnerabilityAssessmentEngine: ${String(error)}`,
    );
  }

  let configAnalyzer: ConfigurationAnalyzer | undefined;
  try {
    configAnalyzer =
      config?.configAnalysisEnabled !== false
        ? new ConfigurationAnalyzer()
        : undefined;
  } catch (error) {
    console.warn("Failed to initialize ConfigurationAnalyzer:", error);
    configAnalyzer = undefined;
  }

  let reportingEngine: VulnerabilityReportingEngine | undefined;
  try {
    reportingEngine =
      config?.enableReporting !== false
        ? new VulnerabilityReportingEngine()
        : undefined;
  } catch (error) {
    console.warn("Failed to initialize VulnerabilityReportingEngine:", error);
    reportingEngine = undefined;
  }

  return {
    assessmentEngine,
    configAnalyzer,
    confidenceScorer,
    reportingEngine,

    async performAssessment(
      assessmentConfig: VulnerabilityAssessmentConfig,
    ): Promise<VulnerabilityAssessmentResult> {
      try {
        const results: VulnerabilityAssessmentResult =
          await assessmentEngine.assessVulnerabilities(assessmentConfig);

        if (confidenceScorer) {
          // Apply confidence scoring to results
          const updatedVulnerabilities = results.vulnerabilities.map(
            (vulnerability) => {
              const confidenceResult = confidenceScorer.calculateConfidence(
                vulnerability.confidence / 100 || 0.7, // Convert percentage to decimal
                "vulnerability_scanner",
                {
                  severity: vulnerability.severity,
                  timestamp: new Date().toISOString(),
                },
              );
              return {
                ...vulnerability,
                confidence: Math.round(confidenceResult.score * 100), // Convert back to percentage
              };
            },
          );

          // Create new result with updated vulnerabilities
          return {
            ...results,
            vulnerabilities: updatedVulnerabilities,
          };
        }

        return results;
      } catch (error) {
        throw new Error(`Assessment failed: ${String(error)}`);
      }
    },

    async generateReport(
      results: VulnerabilityAssessmentResult,
      reportConfig?: Partial<{
        format:
          | "json"
          | "xml"
          | "html"
          | "pdf"
          | "csv"
          | "sarif"
          | "markdown"
          | "xlsx";
        reportType:
          | "vulnerability"
          | "configuration"
          | "compliance"
          | "executive"
          | "technical"
          | "trend";
        scope: "full" | "summary" | "critical_only";
        title: string;
        description: string;
      }>,
    ): Promise<GeneratedReport> {
      if (!reportingEngine) {
        throw new Error("Reporting engine not enabled");
      }

      if (!("generateReport" in reportingEngine)) {
        throw new Error("Reporting engine does not support report generation");
      }

      try {
        const config = {
          reportType: reportConfig?.reportType || ("vulnerability" as const),
          format: reportConfig?.format || ("json" as const),
          scope: reportConfig?.scope || ("full" as const),
          title: reportConfig?.title || "Vulnerability Assessment Report",
          description:
            reportConfig?.description ||
            "Generated vulnerability assessment report",
        };

        return await reportingEngine.generateReport(config, [results]);
      } catch (error) {
        throw new Error(`Report generation failed: ${String(error)}`);
      }
    },
  };
}

/**
 * Default vulnerability assessment system with standard configuration
 */
export const defaultVulnerabilityAssessmentSystem =
  createVulnerabilityAssessmentSystem();
