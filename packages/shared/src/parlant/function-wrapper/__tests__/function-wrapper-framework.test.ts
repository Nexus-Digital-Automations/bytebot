/**
 * PARLANT Phase 1 Function Wrapper Framework - Comprehensive Unit Tests
 *
 * Complete test suite for the PARLANT function wrapper framework including
 * interface validation, signature preservation, factory operations, parameter
 * validation, return value processing, and registry management.
 *
 * @fileoverview Comprehensive unit tests for function wrapper framework
 * @version 1.0.0
 * @author Function Wrapper Framework Agent
 * @created 2025-09-19
 */

import { Test, TestingModule } from "@nestjs/testing";
import { Logger } from "@nestjs/common";

// Import framework components
import {
  ValidationLevel,
  FunctionCategory,
  DataClassification,
  SecurityRiskLevel,
  WrapperConfig,
  UserContext,
  ValidationResult,
  ConversationState,
  ErrorCategory,
} from "../interfaces/wrapper-types";

import {
  SignaturePreservingWrapper,
  TypeSafeWrapperCreator,
  FunctionSignatureInspector,
  WrapperStatistics,
} from "../core/signature-preserving-wrapper";

import {
  EnterpriseFunctionWrapperFactory,
  WrapperCreationError,
  ConfigurationUseCase,
} from "../factories/function-wrapper-factory";

import {
  ParameterCaptureValidationService,
  ParameterSanitizer,
  ParameterTypeAnalyzer,
  ParameterSecurityValidator,
  ParameterPerformanceOptimizer,
  SecurityRiskLevel as ParamSecurityRiskLevel,
} from "../validation/parameter-capture-validation";

import {
  ReturnValueProcessingService,
  ResultAnalyzer,
  ReturnValueSecurityProcessor,
  ResultTransformationEngine,
  DataValueLevel,
} from "../validation/return-value-processing";

import {
  WrapperRegistryManagementService,
  WrapperPerformanceMonitor,
  WrapperHealthMonitor,
  WrapperStatus,
} from "../core/wrapper-registry-management";

/**
 * Test Data and Utilities
 */
class TestUtilities {
  static createMockUserContext(): UserContext {
    return {
      userId: "test-user-123",
      authToken: "mock-jwt-token",
      permissions: ["execute", "access-pii", "access-credentials"],
      sessionMetadata: {
        sessionId: "test-session-456",
        ipAddress: "127.0.0.1",
        userAgent: "Test Agent 1.0",
      },
    };
  }

  static createMockValidationResult(
    approved: boolean = true,
  ): ValidationResult {
    return {
      approved,
      validationId: "val_test_123",
      reason: approved
        ? "Test validation approved"
        : "Test validation rejected",
      conversationContext: {
        sessionId: "conv_test_123",
        messages: [
          {
            id: "msg_1",
            role: "system",
            content: "Test validation message",
            timestamp: new Date(),
          },
        ],
        appliedGuidelines: ["test-guideline"],
        toolsInvoked: ["test-tool"],
        state: approved
          ? ConversationState.APPROVED
          : ConversationState.REJECTED,
      },
      confidence: 0.95,
      executionTime: 100,
      metadata: { test: true },
    };
  }

  static createBasicWrapperConfig(
    functionId: string = "test-function",
  ): WrapperConfig {
    return {
      functionId,
      description: "Test function for unit testing",
      validationLevel: ValidationLevel.MEDIUM,
      cacheable: true,
      monitoring: true,
      metadata: {
        category: FunctionCategory.UTILITY,
        domain: "test",
        dataClassification: DataClassification.INTERNAL,
        dependencies: [],
        tags: ["test", "unit-test"],
      },
    };
  }

  // Test functions for wrapping
  static simpleFunction(a: number, b: number): number {
    return a + b;
  }

  static async asyncFunction(data: string): Promise<string> {
    return new Promise((resolve) => {
      setTimeout(() => resolve(`Processed: ${data}`), 10);
    });
  }

  static complexFunction(config: { name: string; options: any[] }): {
    result: string;
    count: number;
  } {
    return {
      result: `Processed ${config.name}`,
      count: config.options.length,
    };
  }

  static errorFunction(): never {
    throw new Error("Test error function");
  }

  static piiFunction(email: string, ssn: string): { masked: boolean } {
    return { masked: true };
  }
}

/**
 * Function Signature Inspector Tests
 */
describe("FunctionSignatureInspector", () => {
  describe("extractSignature", () => {
    it("should extract signature for simple function", () => {
      const signature = FunctionSignatureInspector.extractSignature(
        TestUtilities.simpleFunction,
      );

      expect(signature.name).toBe("simpleFunction");
      expect(signature.parameterCount).toBe(2);
      expect(signature.parameterNames).toEqual(["a", "b"]);
      expect(signature.isAsync).toBe(false);
      expect(signature.returnTypeHint).toBe("unknown");
    });

    it("should extract signature for async function", () => {
      const signature = FunctionSignatureInspector.extractSignature(
        TestUtilities.asyncFunction,
      );

      expect(signature.name).toBe("asyncFunction");
      expect(signature.parameterCount).toBe(1);
      expect(signature.isAsync).toBe(true);
      expect(signature.originalFunction).toBe(TestUtilities.asyncFunction);
    });

    it("should extract signature for complex function", () => {
      const signature = FunctionSignatureInspector.extractSignature(
        TestUtilities.complexFunction,
      );

      expect(signature.name).toBe("complexFunction");
      expect(signature.parameterCount).toBe(1);
      expect(signature.parameterNames).toEqual(["config"]);
    });

    it("should handle anonymous functions", () => {
      const anonymousFunc = (x: number) => x * 2;
      const signature =
        FunctionSignatureInspector.extractSignature(anonymousFunc);

      expect(signature.name).toBe("");
      expect(signature.parameterCount).toBe(1);
    });
  });

  describe("validateCompatibility", () => {
    it("should validate compatible function", () => {
      const result = FunctionSignatureInspector.validateCompatibility(
        TestUtilities.simpleFunction,
      );

      expect(result.compatible).toBe(true);
      expect(result.issues).toHaveLength(0);
      expect(result.signature.name).toBe("simpleFunction");
    });

    it("should detect incompatible functions", () => {
      const evalFunction = new Function("code", "return eval(code)");
      const result =
        FunctionSignatureInspector.validateCompatibility(evalFunction);

      expect(result.compatible).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0]).toContain("eval()");
    });

    it("should provide warnings for high parameter count", () => {
      const manyParamsFunc = (
        a: any,
        b: any,
        c: any,
        d: any,
        e: any,
        f: any,
        g: any,
        h: any,
        i: any,
        j: any,
        k: any,
      ) => {};
      const result =
        FunctionSignatureInspector.validateCompatibility(manyParamsFunc);

      expect(result.compatible).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain("parameters");
    });
  });
});

/**
 * Signature Preserving Wrapper Tests
 */
describe("SignaturePreservingWrapper", () => {
  let wrapper: SignaturePreservingWrapper<typeof TestUtilities.simpleFunction>;
  let config: WrapperConfig;

  beforeEach(() => {
    config = TestUtilities.createBasicWrapperConfig("test-simple-function");
    wrapper = new SignaturePreservingWrapper(
      TestUtilities.simpleFunction,
      config,
    );
  });

  describe("createWrappedFunction", () => {
    it("should create wrapped function that preserves signature", async () => {
      const wrappedFunction = wrapper.createWrappedFunction();

      expect(typeof wrappedFunction).toBe("function");
      expect(wrappedFunction.name).toBe("wrapped_test-simple-function");

      // Test execution
      const result = await wrappedFunction(5, 3);
      expect(result.success).toBe(true);
      expect(result.result).toBe(8);
      expect(result.metadata).toBeDefined();
      expect(result.metadata.executionId).toBeDefined();
    });

    it("should handle async functions correctly", async () => {
      const asyncConfig = TestUtilities.createBasicWrapperConfig(
        "test-async-function",
      );
      const asyncWrapper = new SignaturePreservingWrapper(
        TestUtilities.asyncFunction,
        asyncConfig,
      );
      const wrappedFunction = asyncWrapper.createWrappedFunction();

      const result = await wrappedFunction("test data");
      expect(result.success).toBe(true);
      expect(result.result).toBe("Processed: test data");
    });

    it("should handle function errors gracefully", async () => {
      const errorConfig = TestUtilities.createBasicWrapperConfig(
        "test-error-function",
      );
      const errorWrapper = new SignaturePreservingWrapper(
        TestUtilities.errorFunction,
        errorConfig,
      );
      const wrappedFunction = errorWrapper.createWrappedFunction();

      const result = await wrappedFunction();
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe("EXECUTION_ERROR");
    });

    it("should generate audit trail", async () => {
      const wrappedFunction = wrapper.createWrappedFunction();
      const result = await wrappedFunction(10, 20);

      expect(result.metadata.auditTrail).toBeDefined();
      expect(result.metadata.auditTrail.functionCall.functionName).toBe(
        "test-simple-function",
      );
      expect(result.metadata.auditTrail.functionCall.parameters).toEqual([
        10, 20,
      ]);
      expect(result.metadata.auditTrail.resultSummary.success).toBe(true);
    });
  });

  describe("getStatistics", () => {
    it("should track wrapper statistics", async () => {
      const wrappedFunction = wrapper.createWrappedFunction();

      // Execute function multiple times
      await wrappedFunction(1, 2);
      await wrappedFunction(3, 4);
      await wrappedFunction(5, 6);

      const stats = wrapper.getStatistics();
      expect(stats.functionId).toBe("test-simple-function");
      expect(stats.totalExecutions).toBe(3);
      expect(stats.averageExecutionTime).toBeGreaterThan(0);
      expect(stats.validationLevel).toBe(ValidationLevel.MEDIUM);
    });

    it("should reset statistics", async () => {
      const wrappedFunction = wrapper.createWrappedFunction();
      await wrappedFunction(1, 2);

      wrapper.resetStatistics();
      const stats = wrapper.getStatistics();
      expect(stats.totalExecutions).toBe(0);
    });
  });
});

/**
 * Type Safe Wrapper Creator Tests
 */
describe("TypeSafeWrapperCreator", () => {
  describe("createWrapper", () => {
    it("should create type-safe wrapper", () => {
      const config = TestUtilities.createBasicWrapperConfig("type-safe-test");
      const wrappedFunction = TypeSafeWrapperCreator.createWrapper(
        TestUtilities.simpleFunction,
        config,
      );

      expect(typeof wrappedFunction).toBe("function");
    });

    it("should reject incompatible functions", () => {
      const config =
        TestUtilities.createBasicWrapperConfig("incompatible-test");
      const evalFunction = new Function("code", "return eval(code)");

      expect(() => {
        TypeSafeWrapperCreator.createWrapper(evalFunction, config);
      }).toThrow();
    });
  });

  describe("createValidatedWrapper", () => {
    it("should create wrapper with type validation", () => {
      const config = TestUtilities.createBasicWrapperConfig("validated-test");
      const typeValidator = {
        validateInputs: jest.fn().mockReturnValue({ valid: true, errors: [] }),
        validateOutput: jest.fn().mockReturnValue({ valid: true, errors: [] }),
      };

      const wrappedFunction = TypeSafeWrapperCreator.createValidatedWrapper(
        TestUtilities.simpleFunction,
        config,
        typeValidator,
      );

      expect(typeof wrappedFunction).toBe("function");
    });
  });
});

/**
 * Enterprise Function Wrapper Factory Tests
 */
describe("EnterpriseFunctionWrapperFactory", () => {
  let factory: EnterpriseFunctionWrapperFactory;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EnterpriseFunctionWrapperFactory],
    }).compile();

    factory = module.get<EnterpriseFunctionWrapperFactory>(
      EnterpriseFunctionWrapperFactory,
    );
  });

  describe("createWrapper", () => {
    it("should create wrapper successfully", () => {
      const config = TestUtilities.createBasicWrapperConfig("factory-test");
      const wrappedFunction = factory.createWrapper(
        TestUtilities.simpleFunction,
        config,
      );

      expect(typeof wrappedFunction).toBe("function");
    });

    it("should validate configuration", () => {
      const invalidConfig = {
        functionId: "",
        description: "",
        validationLevel: "invalid" as ValidationLevel,
      };

      expect(() => {
        factory.createWrapper(
          TestUtilities.simpleFunction,
          invalidConfig as WrapperConfig,
        );
      }).toThrow();
    });

    it("should enhance configuration with defaults", () => {
      const minimalConfig: WrapperConfig = {
        functionId: "minimal-test",
        description: "Minimal test configuration",
        validationLevel: ValidationLevel.LOW,
      };

      const wrappedFunction = factory.createWrapper(
        TestUtilities.simpleFunction,
        minimalConfig,
      );
      expect(typeof wrappedFunction).toBe("function");
    });
  });

  describe("createBatchWrappers", () => {
    it("should create multiple wrappers", () => {
      const functions = {
        simpleFunc: TestUtilities.simpleFunction,
        asyncFunc: TestUtilities.asyncFunction,
        complexFunc: TestUtilities.complexFunction,
      };

      const configs = {
        simpleFunc: TestUtilities.createBasicWrapperConfig("batch-simple"),
        asyncFunc: TestUtilities.createBasicWrapperConfig("batch-async"),
        complexFunc: TestUtilities.createBasicWrapperConfig("batch-complex"),
      };

      const wrappedFunctions = factory.createBatchWrappers(functions, configs);

      expect(Object.keys(wrappedFunctions)).toHaveLength(3);
      expect(typeof wrappedFunctions.simpleFunc).toBe("function");
      expect(typeof wrappedFunctions.asyncFunc).toBe("function");
      expect(typeof wrappedFunctions.complexFunc).toBe("function");
    });
  });

  describe("createConfigurationTemplate", () => {
    it("should create database read template", () => {
      const template = factory.createConfigurationTemplate(
        ConfigurationUseCase.DATABASE_READ,
      );

      expect(template.cacheable).toBe(true);
      expect(template.metadata?.category).toBe(FunctionCategory.DATABASE_READ);
      expect(template.validationLevel).toBe(ValidationLevel.MEDIUM);
    });

    it("should create authentication template", () => {
      const template = factory.createConfigurationTemplate(
        ConfigurationUseCase.AUTHENTICATION,
      );

      expect(template.cacheable).toBe(false);
      expect(template.metadata?.category).toBe(FunctionCategory.AUTHENTICATION);
      expect(template.validationLevel).toBe(ValidationLevel.CRITICAL);
    });
  });

  describe("registerValidationRule", () => {
    it("should register global validation rule", () => {
      const rule = {
        id: "test-rule",
        description: "Test validation rule",
        validator: jest.fn().mockResolvedValue({ approved: true }),
        priority: 5,
      };

      factory.registerValidationRule(rule);

      const config = factory.getConfiguration();
      expect(config.globalValidationRules).toContainEqual(rule);
    });
  });
});

/**
 * Parameter Capture Validation Service Tests
 */
describe("ParameterCaptureValidationService", () => {
  let service: ParameterCaptureValidationService;
  let userContext: UserContext;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ParameterCaptureValidationService],
    }).compile();

    service = module.get<ParameterCaptureValidationService>(
      ParameterCaptureValidationService,
    );
    userContext = TestUtilities.createMockUserContext();
  });

  describe("captureAndValidateParameters", () => {
    it("should capture and validate simple parameters", async () => {
      const parameters = [123, "test string", true];
      const result = await service.captureAndValidateParameters(
        "test-function",
        parameters,
        userContext,
        ValidationLevel.MEDIUM,
      );

      expect(result.validationPassed).toBe(true);
      expect(result.capturedParameters).toHaveLength(3);
      expect(result.capturedParameters[0].type).toBe("number");
      expect(result.capturedParameters[1].type).toBe("string");
      expect(result.capturedParameters[2].type).toBe("boolean");
    });

    it("should detect PII in parameters", async () => {
      const parameters = ["user@example.com", "123-45-6789"];
      const result = await service.captureAndValidateParameters(
        "pii-function",
        parameters,
        userContext,
        ValidationLevel.HIGH,
      );

      expect(result.capturedParameters[0].metadata.containsPII).toBe(true);
      expect(result.capturedParameters[1].metadata.containsPII).toBe(true);
    });

    it("should detect credentials in parameters", async () => {
      const parameters = [{ password: "secret123", apiKey: "abc123" }];
      const result = await service.captureAndValidateParameters(
        "credential-function",
        parameters,
        userContext,
        ValidationLevel.CRITICAL,
      );

      expect(result.capturedParameters[0].metadata.containsCredentials).toBe(
        true,
      );
    });

    it("should handle complex nested objects", async () => {
      const complexParam = {
        user: {
          id: 123,
          profile: {
            name: "John Doe",
            email: "john@example.com",
            settings: {
              theme: "dark",
              notifications: true,
            },
          },
        },
        metadata: {
          timestamp: new Date(),
          source: "api",
        },
      };

      const result = await service.captureAndValidateParameters(
        "complex-function",
        [complexParam],
        userContext,
        ValidationLevel.MEDIUM,
      );

      expect(result.validationPassed).toBe(true);
      expect(result.capturedParameters[0].metadata.complexity).toBeGreaterThan(
        50,
      );
      expect(result.typeAnalysis.complexityScore).toBeGreaterThan(30);
    });
  });

  describe("createParameterSummaryForConversation", () => {
    it("should create human-readable summary", async () => {
      const parameters = [123, "test", { key: "value" }];
      const captureResult = await service.captureAndValidateParameters(
        "summary-test",
        parameters,
        userContext,
        ValidationLevel.MEDIUM,
      );

      const summary = service.createParameterSummaryForConversation(
        captureResult.capturedParameters,
        "summary-test",
        userContext,
      );

      expect(summary.functionName).toBe("summary-test");
      expect(summary.parameterCount).toBe(3);
      expect(summary.humanReadableDescription).toContain("summary-test");
      expect(summary.humanReadableDescription).toContain("3 parameter");
    });
  });

  describe("validateParameterChanges", () => {
    it("should validate parameter modifications", async () => {
      const originalParams = [1, "original"];
      const originalCaptureResult = await service.captureAndValidateParameters(
        "change-test",
        originalParams,
        userContext,
        ValidationLevel.MEDIUM,
      );

      const modifiedParams = [1, "modified"];
      const changeResult = await service.validateParameterChanges(
        originalCaptureResult.capturedParameters,
        modifiedParams,
        userContext,
      );

      expect(changeResult.changeAnalysis.hasChanges).toBe(true);
      expect(changeResult.changeAnalysis.changes).toHaveLength(1);
      expect(changeResult.changeAnalysis.changes[0].changeType).toBe(
        "modified",
      );
    });
  });
});

/**
 * Return Value Processing Service Tests
 */
describe("ReturnValueProcessingService", () => {
  let service: ReturnValueProcessingService;
  let userContext: UserContext;
  let validationResult: ValidationResult;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReturnValueProcessingService],
    }).compile();

    service = module.get<ReturnValueProcessingService>(
      ReturnValueProcessingService,
    );
    userContext = TestUtilities.createMockUserContext();
    validationResult = TestUtilities.createMockValidationResult();
  });

  describe("processReturnValue", () => {
    it("should process simple return value", async () => {
      const returnValue = { result: "success", count: 42 };
      const result = await service.processReturnValue(
        "test-function",
        returnValue,
        userContext,
        ValidationLevel.MEDIUM,
        validationResult,
        {},
      );

      expect(result.processingSuccessful).toBe(true);
      expect(result.originalValue).toEqual(returnValue);
      expect(result.resultAnalysis.resultType).toBe("object");
      expect(result.resultAnalysis.size).toBeGreaterThan(0);
    });

    it("should handle return values with PII", async () => {
      const returnValue = {
        user: "john@example.com",
        ssn: "123-45-6789",
        data: "some other data",
      };

      const result = await service.processReturnValue(
        "pii-function",
        returnValue,
        userContext,
        ValidationLevel.HIGH,
        validationResult,
        {},
      );

      expect(result.processingSuccessful).toBe(true);
      expect(result.resultAnalysis.contentAnalysis.containsPII).toBe(true);
      expect(result.resultAnalysis.dataClassification).toBe(
        DataClassification.CONFIDENTIAL,
      );
    });

    it("should handle large return values", async () => {
      const largeArray = new Array(10000)
        .fill(0)
        .map((_, i) => ({ id: i, data: `item-${i}` }));
      const result = await service.processReturnValue(
        "large-data-function",
        largeArray,
        userContext,
        ValidationLevel.MEDIUM,
        validationResult,
        {},
      );

      expect(result.processingSuccessful).toBe(true);
      expect(result.resultAnalysis.structure.isCollection).toBe(true);
      expect(result.resultAnalysis.structure.elementCount).toBe(10000);
      expect(
        result.performanceAnalysis.optimizationOpportunities.length,
      ).toBeGreaterThan(0);
    });

    it("should assess business impact", async () => {
      const criticalResult = {
        transactionId: "tx-12345",
        amount: 10000,
        status: "completed",
      };

      const result = await service.processReturnValue(
        "payment-processing",
        criticalResult,
        userContext,
        ValidationLevel.CRITICAL,
        validationResult,
        {},
      );

      expect(result.businessImpact.impactLevel).toBeTruthy();
      expect(result.businessImpact.affectedSystems.length).toBeGreaterThan(0);
    });
  });

  describe("validateReturnValueSchema", () => {
    it("should validate return value against schema", async () => {
      const returnValue = { name: "John", age: 30, active: true };
      const schema = {
        type: "object",
        properties: {
          name: { type: "string", required: true },
          age: { type: "number", required: true },
          active: { type: "boolean", required: false },
        },
      };

      const result = await service.validateReturnValueSchema(
        returnValue,
        schema,
        "test-function",
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.compliance).toBe(100);
    });

    it("should detect schema violations", async () => {
      const returnValue = { name: "John", age: "thirty" }; // age should be number
      const schema = {
        type: "object",
        properties: {
          name: { type: "string", required: true },
          age: { type: "number", required: true },
        },
      };

      const result = await service.validateReturnValueSchema(
        returnValue,
        schema,
        "test-function",
      );

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.compliance).toBeLessThan(100);
    });
  });

  describe("transformReturnValueForTransmission", () => {
    it("should transform return value for secure transmission", async () => {
      const returnValue = {
        user: "john@example.com",
        password: "secret123",
        data: "normal data",
      };

      const options = {
        sanitizePII: true,
        redactCredentials: true,
        compressLargeData: false,
        normalizeFormat: true,
      };

      const result = await service.transformReturnValueForTransmission(
        returnValue,
        options,
      );

      expect(result.transformationSuccessful).toBe(true);
      expect(result.appliedTransformations).toContain("pii_sanitization");
      expect(result.appliedTransformations).toContain("credential_redaction");
    });
  });
});

/**
 * Wrapper Registry Management Service Tests
 */
describe("WrapperRegistryManagementService", () => {
  let registryService: WrapperRegistryManagementService;
  let factory: EnterpriseFunctionWrapperFactory;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WrapperRegistryManagementService,
        EnterpriseFunctionWrapperFactory,
      ],
    }).compile();

    factory = module.get<EnterpriseFunctionWrapperFactory>(
      EnterpriseFunctionWrapperFactory,
    );
    registryService = new WrapperRegistryManagementService(factory);

    await registryService.onModuleInit();
  });

  afterEach(async () => {
    await registryService.onModuleDestroy();
  });

  describe("registerWrapper", () => {
    it("should register wrapper successfully", async () => {
      const config = TestUtilities.createBasicWrapperConfig("registry-test-1");
      const metadata = {
        registeredBy: "test-user",
        version: "1.0.0",
        tags: ["test", "registry"],
        description: "Test wrapper registration",
      };

      const result = await registryService.registerWrapper(
        "registry-test-1",
        TestUtilities.simpleFunction,
        config,
        metadata,
      );

      expect(result.success).toBe(true);
      expect(result.functionId).toBe("registry-test-1");
      expect(result.wrappedFunction).toBeDefined();
      expect(result.registrationTime).toBeGreaterThan(0);
    });

    it("should prevent duplicate registrations", async () => {
      const config = TestUtilities.createBasicWrapperConfig("registry-test-2");

      // First registration should succeed
      const result1 = await registryService.registerWrapper(
        "registry-test-2",
        TestUtilities.simpleFunction,
        config,
      );
      expect(result1.success).toBe(true);

      // Second registration should fail
      const result2 = await registryService.registerWrapper(
        "registry-test-2",
        TestUtilities.simpleFunction,
        config,
      );
      expect(result2.success).toBe(false);
      expect(result2.error).toBeDefined();
    });
  });

  describe("unregisterWrapper", () => {
    it("should unregister wrapper successfully", async () => {
      const config = TestUtilities.createBasicWrapperConfig("registry-test-3");

      // Register first
      await registryService.registerWrapper(
        "registry-test-3",
        TestUtilities.simpleFunction,
        config,
      );

      // Then unregister
      const result = await registryService.unregisterWrapper("registry-test-3");

      expect(result.success).toBe(true);
      expect(result.functionId).toBe("registry-test-3");
      expect(result.finalStatistics).toBeDefined();
    });

    it("should handle unregistering non-existent wrapper", async () => {
      const result = await registryService.unregisterWrapper("non-existent");

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("getWrapper", () => {
    it("should retrieve wrapper information", async () => {
      const config = TestUtilities.createBasicWrapperConfig("registry-test-4");

      await registryService.registerWrapper(
        "registry-test-4",
        TestUtilities.simpleFunction,
        config,
      );

      const wrapperInfo = registryService.getWrapper("registry-test-4");

      expect(wrapperInfo).toBeDefined();
      expect(wrapperInfo!.functionId).toBe("registry-test-4");
      expect(wrapperInfo!.config).toEqual(config);
      expect(wrapperInfo!.status).toBe(WrapperStatus.ACTIVE);
    });

    it("should return null for non-existent wrapper", () => {
      const wrapperInfo = registryService.getWrapper("non-existent");
      expect(wrapperInfo).toBeNull();
    });
  });

  describe("listWrappers", () => {
    beforeEach(async () => {
      // Register multiple wrappers for testing
      const configs = [
        {
          ...TestUtilities.createBasicWrapperConfig("list-test-1"),
          validationLevel: ValidationLevel.LOW,
        },
        {
          ...TestUtilities.createBasicWrapperConfig("list-test-2"),
          validationLevel: ValidationLevel.HIGH,
        },
        {
          ...TestUtilities.createBasicWrapperConfig("list-test-3"),
          validationLevel: ValidationLevel.MEDIUM,
        },
      ];

      for (let i = 0; i < configs.length; i++) {
        await registryService.registerWrapper(
          `list-test-${i + 1}`,
          TestUtilities.simpleFunction,
          configs[i],
        );
      }
    });

    it("should list all wrappers", () => {
      const wrappers = registryService.listWrappers();
      expect(wrappers.length).toBeGreaterThanOrEqual(3);
    });

    it("should filter by validation level", () => {
      const highValidationWrappers = registryService.listWrappers({
        validationLevel: ValidationLevel.HIGH,
      });

      expect(highValidationWrappers.length).toBe(1);
      expect(highValidationWrappers[0].functionId).toBe("list-test-2");
    });

    it("should filter by category", () => {
      const utilityWrappers = registryService.listWrappers({
        category: FunctionCategory.UTILITY,
      });

      expect(utilityWrappers.length).toBeGreaterThanOrEqual(3);
    });

    it("should apply pagination", () => {
      const firstPage = registryService.listWrappers({ limit: 2, offset: 0 });
      const secondPage = registryService.listWrappers({ limit: 2, offset: 2 });

      expect(firstPage.length).toBe(2);
      expect(secondPage.length).toBeGreaterThanOrEqual(1);
      expect(firstPage[0].functionId).not.toBe(secondPage[0].functionId);
    });
  });

  describe("getRegistryStatistics", () => {
    it("should provide comprehensive statistics", async () => {
      // Register a few wrappers
      for (let i = 0; i < 3; i++) {
        const config = TestUtilities.createBasicWrapperConfig(
          `stats-test-${i}`,
        );
        await registryService.registerWrapper(
          `stats-test-${i}`,
          TestUtilities.simpleFunction,
          config,
        );
      }

      const stats = registryService.getRegistryStatistics();

      expect(stats.totalWrappers).toBeGreaterThanOrEqual(3);
      expect(stats.activeWrappers).toBeGreaterThanOrEqual(3);
      expect(stats.statusDistribution).toBeDefined();
      expect(stats.categoryDistribution).toBeDefined();
      expect(stats.validationLevelDistribution).toBeDefined();
      expect(stats.uptime).toBeGreaterThan(0);
    });
  });

  describe("performHealthCheck", () => {
    it("should perform health check on all wrappers", async () => {
      const config = TestUtilities.createBasicWrapperConfig("health-test-1");
      await registryService.registerWrapper(
        "health-test-1",
        TestUtilities.simpleFunction,
        config,
      );

      const healthResults = await registryService.performHealthCheck();

      expect(healthResults.length).toBeGreaterThanOrEqual(1);
      expect(healthResults[0].functionId).toBeDefined();
      expect(healthResults[0].healthy).toBeDefined();
      expect(healthResults[0].healthScore).toBeDefined();
    });

    it("should perform health check on specific wrapper", async () => {
      const config = TestUtilities.createBasicWrapperConfig("health-test-2");
      await registryService.registerWrapper(
        "health-test-2",
        TestUtilities.simpleFunction,
        config,
      );

      const healthResults =
        await registryService.performHealthCheck("health-test-2");

      expect(healthResults.length).toBe(1);
      expect(healthResults[0].functionId).toBe("health-test-2");
    });
  });

  describe("searchWrappers", () => {
    beforeEach(async () => {
      const searchConfigs = [
        {
          ...TestUtilities.createBasicWrapperConfig("search-user-service"),
          description: "User management service",
        },
        {
          ...TestUtilities.createBasicWrapperConfig("search-auth-service"),
          description: "Authentication service",
        },
        {
          ...TestUtilities.createBasicWrapperConfig("search-data-processor"),
          description: "Data processing utility",
        },
      ];

      for (const config of searchConfigs) {
        await registryService.registerWrapper(
          config.functionId,
          TestUtilities.simpleFunction,
          config,
        );
      }
    });

    it("should search by function ID", () => {
      const results = registryService.searchWrappers({ functionId: "user" });

      expect(results.length).toBe(1);
      expect(results[0].functionId).toBe("search-user-service");
      expect(results[0].matches).toContain("functionId");
    });

    it("should search by description", () => {
      const results = registryService.searchWrappers({
        description: "service",
      });

      expect(results.length).toBe(2);
      expect(results[0].matches).toContain("description");
    });

    it("should limit search results", () => {
      const results = registryService.searchWrappers({
        description: "service",
        limit: 1,
      });

      expect(results.length).toBe(1);
    });
  });

  describe("exportWrapperConfigurations", () => {
    it("should export all wrapper configurations", async () => {
      const config = TestUtilities.createBasicWrapperConfig("export-test-1");
      await registryService.registerWrapper(
        "export-test-1",
        TestUtilities.simpleFunction,
        config,
      );

      const exportData = registryService.exportWrapperConfigurations();

      expect(exportData.exportId).toBeDefined();
      expect(exportData.totalConfigurations).toBeGreaterThanOrEqual(1);
      expect(exportData.configurations.length).toBeGreaterThanOrEqual(1);
      expect(exportData.registryVersion).toBeDefined();
    });

    it("should export specific wrapper configurations", async () => {
      const config1 = TestUtilities.createBasicWrapperConfig("export-test-2");
      const config2 = TestUtilities.createBasicWrapperConfig("export-test-3");

      await registryService.registerWrapper(
        "export-test-2",
        TestUtilities.simpleFunction,
        config1,
      );
      await registryService.registerWrapper(
        "export-test-3",
        TestUtilities.simpleFunction,
        config2,
      );

      const exportData = registryService.exportWrapperConfigurations([
        "export-test-2",
      ]);

      expect(exportData.totalConfigurations).toBe(1);
      expect(exportData.configurations[0].functionId).toBe("export-test-2");
    });
  });
});

/**
 * Integration Tests
 */
describe("Function Wrapper Framework Integration", () => {
  let factory: EnterpriseFunctionWrapperFactory;
  let registry: WrapperRegistryManagementService;
  let parameterService: ParameterCaptureValidationService;
  let returnValueService: ReturnValueProcessingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnterpriseFunctionWrapperFactory,
        ParameterCaptureValidationService,
        ReturnValueProcessingService,
      ],
    }).compile();

    factory = module.get<EnterpriseFunctionWrapperFactory>(
      EnterpriseFunctionWrapperFactory,
    );
    parameterService = module.get<ParameterCaptureValidationService>(
      ParameterCaptureValidationService,
    );
    returnValueService = module.get<ReturnValueProcessingService>(
      ReturnValueProcessingService,
    );
    registry = new WrapperRegistryManagementService(factory);

    await registry.onModuleInit();
  });

  afterEach(async () => {
    await registry.onModuleDestroy();
  });

  describe("End-to-End Wrapper Lifecycle", () => {
    it("should handle complete wrapper lifecycle", async () => {
      // 1. Create wrapper configuration
      const config = TestUtilities.createBasicWrapperConfig("e2e-test");

      // 2. Register wrapper
      const registrationResult = await registry.registerWrapper(
        "e2e-test",
        TestUtilities.complexFunction,
        config,
        { registeredBy: "integration-test" },
      );

      expect(registrationResult.success).toBe(true);

      // 3. Get wrapper and execute
      const wrapperInfo = registry.getWrapper("e2e-test");
      expect(wrapperInfo).toBeDefined();

      // 4. Execute wrapped function
      const testInput = { name: "test", options: ["a", "b", "c"] };
      const result = await registrationResult.wrappedFunction!(testInput);

      expect(result.success).toBe(true);
      expect(result.result).toEqual({ result: "Processed test", count: 3 });

      // 5. Check statistics
      const stats = registry.getRegistryStatistics();
      expect(stats.totalWrappers).toBeGreaterThanOrEqual(1);

      // 6. Perform health check
      const healthCheck = await registry.performHealthCheck("e2e-test");
      expect(healthCheck[0].healthy).toBe(true);

      // 7. Unregister wrapper
      const unregistrationResult = await registry.unregisterWrapper("e2e-test");
      expect(unregistrationResult.success).toBe(true);

      // 8. Verify wrapper is removed
      const removedWrapper = registry.getWrapper("e2e-test");
      expect(removedWrapper).toBeNull();
    });

    it("should handle wrapper errors gracefully", async () => {
      const config = TestUtilities.createBasicWrapperConfig("error-test");

      const registrationResult = await registry.registerWrapper(
        "error-test",
        TestUtilities.errorFunction,
        config,
      );

      expect(registrationResult.success).toBe(true);

      // Execute function that throws error
      const result = await registrationResult.wrappedFunction!();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.category).toBe(ErrorCategory.SYSTEM_ERROR);
    });

    it("should validate parameters and return values in integrated workflow", async () => {
      const config = TestUtilities.createBasicWrapperConfig("validation-test");
      config.validationLevel = ValidationLevel.HIGH;

      const registrationResult = await registry.registerWrapper(
        "validation-test",
        TestUtilities.piiFunction,
        config,
      );

      expect(registrationResult.success).toBe(true);

      // Test with PII data
      const email = "user@example.com";
      const ssn = "123-45-6789";
      const result = await registrationResult.wrappedFunction!(email, ssn);

      expect(result.success).toBe(true);
      expect(result.metadata.validationResult.approved).toBe(true);
    });
  });

  describe("Performance and Scalability", () => {
    it("should handle multiple concurrent wrapper executions", async () => {
      const config = TestUtilities.createBasicWrapperConfig("concurrent-test");

      const registrationResult = await registry.registerWrapper(
        "concurrent-test",
        TestUtilities.asyncFunction,
        config,
      );

      expect(registrationResult.success).toBe(true);

      // Execute multiple concurrent operations
      const promises = Array.from({ length: 10 }, (_, i) =>
        registrationResult.wrappedFunction!(`test-data-${i}`),
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      results.forEach((result, i) => {
        expect(result.success).toBe(true);
        expect(result.result).toBe(`Processed: test-data-${i}`);
      });
    });

    it("should maintain performance with large datasets", async () => {
      const config = TestUtilities.createBasicWrapperConfig("performance-test");

      const registrationResult = await registry.registerWrapper(
        "performance-test",
        (data: any[]) => data.length,
        config,
      );

      expect(registrationResult.success).toBe(true);

      // Test with large dataset
      const largeDataset = new Array(10000).fill(0).map((_, i) => ({ id: i }));
      const startTime = Date.now();

      const result = await registrationResult.wrappedFunction!(largeDataset);
      const executionTime = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(result.result).toBe(10000);
      expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });

  describe("Error Recovery and Resilience", () => {
    it("should recover from validation service failures", async () => {
      const config = TestUtilities.createBasicWrapperConfig("resilience-test");

      const registrationResult = await registry.registerWrapper(
        "resilience-test",
        TestUtilities.simpleFunction,
        config,
      );

      expect(registrationResult.success).toBe(true);

      // Function should still work even if validation has issues
      const result = await registrationResult.wrappedFunction!(5, 10);

      expect(result.success).toBe(true);
      expect(result.result).toBe(15);
    });

    it("should maintain wrapper registry integrity during failures", async () => {
      const configs = Array.from({ length: 5 }, (_, i) =>
        TestUtilities.createBasicWrapperConfig(`integrity-test-${i}`),
      );

      // Register multiple wrappers
      const registrationPromises = configs.map((config, i) =>
        registry.registerWrapper(
          `integrity-test-${i}`,
          TestUtilities.simpleFunction,
          config,
        ),
      );

      const results = await Promise.allSettled(registrationPromises);

      // All registrations should succeed
      results.forEach((result) => {
        expect(result.status).toBe("fulfilled");
        if (result.status === "fulfilled") {
          expect(result.value.success).toBe(true);
        }
      });

      // Registry should have all wrappers
      const stats = registry.getRegistryStatistics();
      expect(stats.totalWrappers).toBeGreaterThanOrEqual(5);
    });
  });
});

/**
 * Component-Specific Edge Cases
 */
describe("Edge Cases and Error Handling", () => {
  describe("Parameter Edge Cases", () => {
    let service: ParameterCaptureValidationService;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [ParameterCaptureValidationService],
      }).compile();

      service = module.get<ParameterCaptureValidationService>(
        ParameterCaptureValidationService,
      );
    });

    it("should handle null and undefined parameters", async () => {
      const parameters = [null, undefined, 0, "", false];
      const userContext = TestUtilities.createMockUserContext();

      const result = await service.captureAndValidateParameters(
        "edge-case-test",
        parameters,
        userContext,
        ValidationLevel.MEDIUM,
      );

      expect(result.validationPassed).toBe(true);
      expect(result.capturedParameters).toHaveLength(5);
    });

    it("should handle circular references in parameters", async () => {
      const obj: any = { name: "test" };
      obj.self = obj; // Create circular reference

      const parameters = [obj];
      const userContext = TestUtilities.createMockUserContext();

      const result = await service.captureAndValidateParameters(
        "circular-test",
        parameters,
        userContext,
        ValidationLevel.MEDIUM,
      );

      expect(result.validationPassed).toBe(true);
      expect(result.capturedParameters[0].serializedValue).toContain(
        "Circular Reference",
      );
    });

    it("should handle very large parameters", async () => {
      const largeString = "x".repeat(1000000); // 1MB string
      const parameters = [largeString];
      const userContext = TestUtilities.createMockUserContext();

      const result = await service.captureAndValidateParameters(
        "large-param-test",
        parameters,
        userContext,
        ValidationLevel.MEDIUM,
      );

      expect(result.validationPassed).toBe(true);
      expect(result.capturedParameters[0].metadata.size).toBeGreaterThan(
        999999,
      );
    });
  });

  describe("Return Value Edge Cases", () => {
    let service: ReturnValueProcessingService;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [ReturnValueProcessingService],
      }).compile();

      service = module.get<ReturnValueProcessingService>(
        ReturnValueProcessingService,
      );
    });

    it("should handle null return values", async () => {
      const userContext = TestUtilities.createMockUserContext();
      const validationResult = TestUtilities.createMockValidationResult();

      const result = await service.processReturnValue(
        "null-return-test",
        null,
        userContext,
        ValidationLevel.MEDIUM,
        validationResult,
        {},
      );

      expect(result.processingSuccessful).toBe(true);
      expect(result.originalValue).toBeNull();
      expect(result.resultAnalysis.resultType).toBe("null");
    });

    it("should handle functions as return values", async () => {
      const returnFunction = () => "test";
      const userContext = TestUtilities.createMockUserContext();
      const validationResult = TestUtilities.createMockValidationResult();

      const result = await service.processReturnValue(
        "function-return-test",
        returnFunction,
        userContext,
        ValidationLevel.MEDIUM,
        validationResult,
        {},
      );

      expect(result.processingSuccessful).toBe(true);
      expect(result.resultAnalysis.resultType).toBe("function");
    });

    it("should handle error objects as return values", async () => {
      const errorObj = new Error("Test error");
      const userContext = TestUtilities.createMockUserContext();
      const validationResult = TestUtilities.createMockValidationResult();

      const result = await service.processReturnValue(
        "error-return-test",
        errorObj,
        userContext,
        ValidationLevel.MEDIUM,
        validationResult,
        {},
      );

      expect(result.processingSuccessful).toBe(true);
      expect(result.resultAnalysis.resultType).toBe("error");
    });
  });

  describe("Registry Edge Cases", () => {
    let registry: WrapperRegistryManagementService;
    let factory: EnterpriseFunctionWrapperFactory;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [EnterpriseFunctionWrapperFactory],
      }).compile();

      factory = module.get<EnterpriseFunctionWrapperFactory>(
        EnterpriseFunctionWrapperFactory,
      );
      registry = new WrapperRegistryManagementService(factory);
      await registry.onModuleInit();
    });

    afterEach(async () => {
      await registry.onModuleDestroy();
    });

    it("should handle invalid function IDs", async () => {
      const config = TestUtilities.createBasicWrapperConfig("invalid@id#test");

      const result = await registry.registerWrapper(
        "invalid@id#test",
        TestUtilities.simpleFunction,
        config,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should handle empty configurations", async () => {
      const emptyConfig = {
        functionId: "",
        description: "",
        validationLevel: ValidationLevel.MEDIUM,
      };

      const result = await registry.registerWrapper(
        "empty-config-test",
        TestUtilities.simpleFunction,
        emptyConfig as WrapperConfig,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});

/**
 * Performance Benchmarks
 */
describe("Performance Benchmarks", () => {
  it("should create wrapper within performance threshold", () => {
    const config = TestUtilities.createBasicWrapperConfig("perf-test");
    const startTime = Date.now();

    const wrappedFunction = TypeSafeWrapperCreator.createWrapper(
      TestUtilities.simpleFunction,
      config,
    );
    const creationTime = Date.now() - startTime;

    expect(typeof wrappedFunction).toBe("function");
    expect(creationTime).toBeLessThan(100); // Should create within 100ms
  });

  it("should execute wrapped function within performance threshold", async () => {
    const config = TestUtilities.createBasicWrapperConfig("exec-perf-test");
    const wrappedFunction = TypeSafeWrapperCreator.createWrapper(
      TestUtilities.simpleFunction,
      config,
    );

    const startTime = Date.now();
    const result = await wrappedFunction(10, 20);
    const executionTime = Date.now() - startTime;

    expect(result.success).toBe(true);
    expect(result.result).toBe(30);
    expect(executionTime).toBeLessThan(1000); // Should execute within 1 second
  });

  it("should handle batch wrapper creation efficiently", () => {
    const functions = {};
    const configs = {};

    // Create 100 test functions and configs
    for (let i = 0; i < 100; i++) {
      functions[`func${i}`] = (x: number) => x * i;
      configs[`func${i}`] = TestUtilities.createBasicWrapperConfig(
        `batch-perf-${i}`,
      );
    }

    const factory = new EnterpriseFunctionWrapperFactory();
    const startTime = Date.now();

    const wrappedFunctions = factory.createBatchWrappers(functions, configs);
    const batchTime = Date.now() - startTime;

    expect(Object.keys(wrappedFunctions)).toHaveLength(100);
    expect(batchTime).toBeLessThan(5000); // Should complete within 5 seconds
  });
});

/**
 * Security Tests
 */
describe("Security Validation", () => {
  describe("Parameter Security", () => {
    let service: ParameterCaptureValidationService;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [ParameterCaptureValidationService],
      }).compile();

      service = module.get<ParameterCaptureValidationService>(
        ParameterCaptureValidationService,
      );
    });

    it("should detect and handle SQL injection attempts", async () => {
      const maliciousParams = ["'; DROP TABLE users; --", "normal data"];
      const userContext = TestUtilities.createMockUserContext();

      const result = await service.captureAndValidateParameters(
        "sql-injection-test",
        maliciousParams,
        userContext,
        ValidationLevel.HIGH,
      );

      expect(result.validationPassed).toBe(true);
      expect(result.sanitizedParameters[0].serializedValue).not.toContain(
        "DROP TABLE",
      );
    });

    it("should detect JWT tokens in parameters", async () => {
      const jwtToken =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
      const params = [{ authorization: `Bearer ${jwtToken}` }];
      const userContext = TestUtilities.createMockUserContext();

      const result = await service.captureAndValidateParameters(
        "jwt-test",
        params,
        userContext,
        ValidationLevel.CRITICAL,
      );

      expect(result.capturedParameters[0].metadata.containsCredentials).toBe(
        true,
      );
    });

    it("should enforce permission requirements", async () => {
      const restrictedUserContext: UserContext = {
        userId: "restricted-user",
        authToken: "limited-token",
        permissions: [], // No permissions
        sessionMetadata: { sessionId: "restricted-session" },
      };

      const piiParams = ["user@example.com"];

      const result = await service.captureAndValidateParameters(
        "permission-test",
        piiParams,
        restrictedUserContext,
        ValidationLevel.HIGH,
      );

      expect(result.validationPassed).toBe(false);
      expect(result.securityValidation.violations.length).toBeGreaterThan(0);
    });
  });

  describe("Return Value Security", () => {
    let service: ReturnValueProcessingService;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [ReturnValueProcessingService],
      }).compile();

      service = module.get<ReturnValueProcessingService>(
        ReturnValueProcessingService,
      );
    });

    it("should sanitize PII in return values", async () => {
      const piiReturnValue = {
        users: [
          { email: "user1@example.com", ssn: "123-45-6789" },
          { email: "user2@example.com", ssn: "987-65-4321" },
        ],
      };

      const options = {
        sanitizePII: true,
        redactCredentials: false,
        compressLargeData: false,
        normalizeFormat: false,
      };

      const result = await service.transformReturnValueForTransmission(
        piiReturnValue,
        options,
      );

      expect(result.transformationSuccessful).toBe(true);
      expect(result.appliedTransformations).toContain("pii_sanitization");

      const transformedString = JSON.stringify(result.transformedValue);
      expect(transformedString).not.toContain("user1@example.com");
      expect(transformedString).not.toContain("123-45-6789");
    });
  });
});

/**
 * Clean up after all tests
 */
afterAll(async () => {
  // Clean up any remaining resources
  jest.clearAllMocks();
});
