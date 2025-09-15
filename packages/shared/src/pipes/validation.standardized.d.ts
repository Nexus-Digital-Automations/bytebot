import { PipeTransform, ArgumentMetadata } from "@nestjs/common";
import { SanitizationOptions } from "../utils/security.utils";
export declare enum ValidationSecurityLevel {
  _MAXIMUM = "maximum",
  _HIGH = "high",
  _STANDARD = "standard",
  _DEVELOPMENT = "development",
}
export declare enum ValidationServiceType {
  _BYTEBOTD = "bytebotd",
  _BYTEBOT_AGENT = "bytebot-agent",
  _BYTEBOT_UI = "bytebot-ui",
  _SHARED = "shared",
}
interface StandardizedValidationConfig extends Record<string, unknown> {
  serviceType: ValidationServiceType;
  securityLevel: ValidationSecurityLevel;
  environment: string;
  transform: boolean;
  whitelist: boolean;
  forbidNonWhitelisted: boolean;
  enableSanitization: boolean;
  sanitizationOptions: SanitizationOptions;
  maxPayloadSize: number;
  enableThreatDetection: boolean;
  skipMissingProperties: boolean;
  disableErrorMessages: boolean;
  enableDebugLogging: boolean;
  validateNested: boolean;
  stopAtFirstError: boolean;
  validationGroups?: string[];
  auditLogging: {
    enabled: boolean;
    logLevel: "debug" | "info" | "warn" | "error";
    logFailedValidation: boolean;
    logSanitization: boolean;
    logThreatDetection: boolean;
  };
}
export declare class StandardizedValidationPipe
  implements PipeTransform<unknown>
{
  private readonly logger;
  private readonly config;
  constructor(
    serviceType?: ValidationServiceType,
    environment?: string,
    customOptions?: Partial<StandardizedValidationConfig>,
  );
  private buildStandardizedConfig;
  private deepMerge;
  transform(value: unknown, metadata: ArgumentMetadata): Promise<unknown>;
  private isBasicType;
  private sanitizeBasicValue;
  private validatePayloadSize;
  private detectSecurityThreats;
  private sanitizeValue;
  private shouldValidate;
  private validateValue;
  private formatValidationErrors;
  private logSecurityEvent;
  getValidationConfig(): StandardizedValidationConfig;
  static createBytebotDPipe(
    environment?: string,
    customOptions?: Partial<StandardizedValidationConfig>,
  ): StandardizedValidationPipe;
  static createBytebotAgentPipe(
    environment?: string,
    customOptions?: Partial<StandardizedValidationConfig>,
  ): StandardizedValidationPipe;
  static createBytebotUIPipe(
    environment?: string,
    customOptions?: Partial<StandardizedValidationConfig>,
  ): StandardizedValidationPipe;
}
export declare const StandardizedValidationPipes: {
  readonly MAXIMUM_SECURITY: (
    environment?: string,
  ) => StandardizedValidationPipe;
  readonly HIGH_SECURITY: (environment?: string) => StandardizedValidationPipe;
  readonly STANDARD_SECURITY: (
    environment?: string,
  ) => StandardizedValidationPipe;
  readonly DEVELOPMENT: (
    serviceType?: ValidationServiceType,
  ) => StandardizedValidationPipe;
};
export default StandardizedValidationPipe;
//# sourceMappingURL=validation.standardized.d.ts.map
