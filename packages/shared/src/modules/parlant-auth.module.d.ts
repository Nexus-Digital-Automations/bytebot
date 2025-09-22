import {
  DynamicModule,
  Type,
  ForwardReference,
  Provider,
  InjectionToken,
  OptionalFactoryDependency,
} from "@nestjs/common";
import { ModuleMetadata } from "@nestjs/common/interfaces";
export interface ParlantAuthModuleOptions {
  enableConversationalAuth?: boolean;
  enableConversationalAuthz?: boolean;
  enableConversationalMFA?: boolean;
  riskAssessment?: {
    enabled?: boolean;
    thresholds?: {
      low: number;
      medium: number;
      high: number;
      critical: number;
    };
  };
  mfa?: {
    challengeExpiry?: number;
    maxAttempts?: number;
    supportedMethods?: string[];
  };
  conversation?: {
    timeout?: number;
    cacheTTL?: number;
  };
  performance?: {
    caching?: boolean;
    cacheTTL?: number;
    targetResponseTime?: number;
  };
  security?: {
    jwtSecret?: string;
    jwtExpiresIn?: string;
    auditLogging?: boolean;
  };
  fallback?: {
    enabled?: boolean;
    timeout?: number;
  };
}
export interface ParlantAuthModuleAsyncOptions
  extends Pick<ModuleMetadata, "imports"> {
  imports?: Array<
    Type<unknown> | DynamicModule | Promise<DynamicModule> | ForwardReference
  >;
  providers?: Provider[];
  useFactory?: (
    ..._args: unknown[]
  ) => Promise<ParlantAuthModuleOptions> | ParlantAuthModuleOptions;
  inject?: (InjectionToken | OptionalFactoryDependency)[];
}
export declare class ParlantAuthModule {
  static forRoot(options?: ParlantAuthModuleOptions): DynamicModule;
  static forRootAsync(options: ParlantAuthModuleAsyncOptions): DynamicModule;
  static forFeature(features: {
    auth?: boolean;
    authz?: boolean;
    mfa?: boolean;
    riskAssessment?: boolean;
  }): DynamicModule;
}
export declare function createEnvironmentConfig(): ParlantAuthModuleOptions;
export declare function validateParlantAuthConfig(
  options: ParlantAuthModuleOptions,
): void;
//# sourceMappingURL=parlant-auth.module.d.ts.map
