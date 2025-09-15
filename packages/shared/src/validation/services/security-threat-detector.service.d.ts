import { ThreatAnalysisResult, SecurityThreatContext } from "./types";
export declare class SecurityThreatDetector {
  private readonly logger;
  analyzeThreat(
    value: unknown,
    context: SecurityThreatContext,
  ): ThreatAnalysisResult;
  private convertToAnalyzableString;
  private detectBasicThreats;
  private detectAdvancedThreats;
  private detectContextualThreats;
  private calculateOverallRiskScore;
}
export default SecurityThreatDetector;
//# sourceMappingURL=security-threat-detector.service.d.ts.map
