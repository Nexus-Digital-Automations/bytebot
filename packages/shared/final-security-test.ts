// Simple test to validate security module exports work correctly
import {
  ConfidenceScorer,
  ConfigurationAnalyzer,
  VulnerabilityAssessmentEngine,
  VulnerabilityReportingEngine,
} from "./src/security";

console.log("Security module validation:", {
  ConfidenceScorer: typeof ConfidenceScorer === "function",
  ConfigurationAnalyzer: typeof ConfigurationAnalyzer === "function",
  VulnerabilityAssessmentEngine:
    typeof VulnerabilityAssessmentEngine === "function",
  VulnerabilityReportingEngine:
    typeof VulnerabilityReportingEngine === "function",
});
