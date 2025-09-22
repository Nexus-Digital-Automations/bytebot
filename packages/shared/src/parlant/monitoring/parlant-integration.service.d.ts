import {
  ParlantConversationContext,
  RiskLevel,
} from "../../types/parlant.types";
import {
  ParlantValidationRequest as ParlantValidationRequestType,
  ParlantValidationResponse as ParlantValidationResponseType,
} from "../../types/parlant-integration.types";
export {
  ParlantConversationContext,
  RiskLevel,
} from "../../types/parlant.types";
export { SecurityLevel } from "../../types/parlant-integration.types";
export interface ParlantValidationRequest {
  functionName: string;
  functionParams: Record<string, unknown>;
  actionDescription: string;
  context: ParlantConversationContext & {
    metadata: any;
  };
  riskLevel: RiskLevel;
  operationId: string;
}
export interface ParlantValidationResponse {
  approved: boolean;
  conversationId: string;
  reason: string;
  reasoning?: string;
  confidence: number;
  suggestedAlternatives?: string[];
  metadata: {
    startTime: Date;
    endTime: Date;
    processingTime: number;
    cacheStatus: string;
    source: string;
    riskAssessment: {
      level: any;
      factors: string[];
      score: number;
      mitigations: string[];
    };
  };
  cacheKey?: string;
}
export declare class ConversationalValidationError extends Error {
  readonly code: string;
  readonly details: Record<string, unknown>;
  readonly conversationId?: string;
  readonly riskLevel: RiskLevel;
  readonly timestamp: Date;
  readonly reasoning: string;
  readonly suggestedAlternatives: string[];
  readonly confidence: number;
  constructor(
    conversationId: string | undefined,
    reasoning: string,
    suggestedAlternatives?: string[],
    confidence?: number,
    riskLevel?: RiskLevel,
    code?: string,
    details?: Record<string, unknown>,
  );
  toJSON(): Record<string, unknown>;
  static fromValidationResponse(
    response: ParlantValidationResponseType,
    message?: string,
  ): ConversationalValidationError;
}
export interface IParlantIntegrationService {
  validateFunction(
    request: ParlantValidationRequestType,
  ): Promise<ParlantValidationResponseType>;
  validateFunctionExecution(
    request: ParlantValidationRequest,
  ): Promise<ParlantValidationResponse>;
  getCachedValidation(
    cacheKey: string,
  ): Promise<ParlantValidationResponseType | null>;
  createConversationContext(
    userId?: string,
    sessionId?: string,
  ): Promise<ParlantConversationContext>;
  healthCheck(): Promise<{
    status: "healthy" | "degraded" | "unhealthy";
    details: Record<string, unknown>;
  }>;
}
export declare class ParlantIntegrationService
  implements IParlantIntegrationService
{
  private readonly logger;
  private readonly cache;
  private readonly conversations;
  constructor();
  validateFunction(
    request: ParlantValidationRequestType,
  ): Promise<ParlantValidationResponseType>;
  validateFunctionExecution(
    request: ParlantValidationRequest,
  ): Promise<ParlantValidationResponse>;
  private mapRiskLevelToSecurityLevel;
  getCachedValidation(
    cacheKey: string,
  ): Promise<ParlantValidationResponseType | null>;
  createConversationContext(
    userId?: string,
    sessionId?: string,
  ): Promise<ParlantConversationContext>;
  healthCheck(): Promise<{
    status: "healthy" | "degraded" | "unhealthy";
    details: Record<string, unknown>;
  }>;
  private generateCacheKey;
  private generateConversationId;
  private performParlantValidation;
  private calculateRiskScore;
  private mapRiskScore;
  private identifyRiskFactors;
}
export default ParlantIntegrationService;
//# sourceMappingURL=parlant-integration.service.d.ts.map
