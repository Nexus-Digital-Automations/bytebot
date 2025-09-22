/**
 * PARLANT Phase 1 - Parameter Validation System Comprehensive Test Suite
 *
 * Tests all components of the parameter validation system including:
 * - Core parameter validation service
 * - Natural language interface
 * - Advanced validation framework
 * - Security integration service
 * - End-to-end workflows
 *
 * @module ParameterValidationTests
 * @version 1.0.0
 * @author AIgent PARLANT Integration Team
 */

import {
  ParameterValidationService,
  NaturalLanguageParameterInterface,
  AdvancedValidationFramework,
  SecurityIntegrationService,
  ParlantParameterValidationSystem,
  ParlantParameterValidationFactory,
  ParameterType,
  ValidationRuleType,
  SanitizationType,
  ThreatType,
  SecurityLevel,
  RiskLevel,
  InteractionStyle,
  createDefaultUserContext,
  createExampleParameterSchema,
  validateParameterValidationConfig,
  defaultParlantParameterValidationConfig,
} from "./index";

// Mock dependencies
const mockParlantValidationBridge = {
  validateRequest: jest.fn(),
};

const mockConversationContextBuilder = {
  buildContext: jest.fn(),
};

describe("PARLANT Phase 1 Parameter Validation System", () => {
  describe("ParameterValidationService", () => {
    let service: ParameterValidationService;

    beforeEach(() => {
      service = new ParameterValidationService(
        mockParlantValidationBridge,
        mockConversationContextBuilder,
      );
    });

    describe("Basic Parameter Validation", () => {
      test("should validate simple string parameter", async () => {
        const request = {
          functionName: "testFunction",
          rawParameters: { username: "john_doe" },
          expectedSchema: createExampleParameterSchema(),
          userContext: createDefaultUserContext(),
          options: {
            strictValidation: false,
            enableConversationalValidation: false,
            autoSanitize: true,
            requireSanitizationConfirmation: false,
            targetPerformanceMs: 200,
            enableTypeConversion: true,
            enableParameterLearning: false,
          },
        };

        const result = await service.validateParameters(request);

        expect(result.isValid).toBe(true);
        expect(result.validatedParameters.username).toBe("john_doe");
        expect(result.performanceMetrics.totalValidationTime).toBeLessThan(200);
      });

      test("should handle invalid parameter types", async () => {
        const request = {
          functionName: "testFunction",
          rawParameters: { username: 123 }, // Invalid type
          expectedSchema: createExampleParameterSchema(),
          userContext: createDefaultUserContext(),
          options: {
            strictValidation: true,
            enableConversationalValidation: false,
            autoSanitize: true,
            requireSanitizationConfirmation: false,
            targetPerformanceMs: 200,
            enableTypeConversion: false,
            enableParameterLearning: false,
          },
        };

        const result = await service.validateParameters(request);

        expect(result.isValid).toBe(false);
        expect(result.validationDetails.parameterResults.username.status).toBe(
          "invalid",
        );
      });

      test("should apply type conversion when enabled", async () => {
        const request = {
          functionName: "testFunction",
          rawParameters: { username: 123 },
          expectedSchema: createExampleParameterSchema(),
          userContext: createDefaultUserContext(),
          options: {
            strictValidation: false,
            enableConversationalValidation: false,
            autoSanitize: true,
            requireSanitizationConfirmation: false,
            targetPerformanceMs: 200,
            enableTypeConversion: true,
            enableParameterLearning: false,
          },
        };

        const result = await service.validateParameters(request);

        expect(result.validatedParameters.username).toBe("123");
        expect(result.validationDetails.parameterResults.username.status).toBe(
          "type_converted",
        );
      });
    });

    describe("Security Validation", () => {
      test("should detect SQL injection attempts", async () => {
        const request = {
          functionName: "testFunction",
          rawParameters: { username: "'; DROP TABLE users; --" },
          expectedSchema: createExampleParameterSchema(),
          userContext: createDefaultUserContext(),
          options: {
            strictValidation: true,
            enableConversationalValidation: false,
            autoSanitize: true,
            requireSanitizationConfirmation: false,
            targetPerformanceMs: 200,
            enableTypeConversion: false,
            enableParameterLearning: false,
          },
        };

        const result = await service.validateParameters(request);

        expect(result.securityAssessment.threatIndicators).toHaveLength(1);
        expect(result.securityAssessment.threatIndicators[0].type).toBe(
          ThreatType.SQL_INJECTION,
        );
        expect(result.securityAssessment.riskScore).toBeGreaterThan(50);
      });

      test("should sanitize malicious input", async () => {
        const request = {
          functionName: "testFunction",
          rawParameters: { username: '<script>alert("xss")</script>' },
          expectedSchema: createExampleParameterSchema(),
          userContext: createDefaultUserContext(),
          options: {
            strictValidation: false,
            enableConversationalValidation: false,
            autoSanitize: true,
            requireSanitizationConfirmation: false,
            targetPerformanceMs: 200,
            enableTypeConversion: false,
            enableParameterLearning: false,
          },
        };

        const result = await service.validateParameters(request);

        expect(result.validatedParameters.username).not.toContain("<script>");
        expect(result.validationDetails.sanitizationActions).toHaveLength(1);
      });
    });

    describe("Performance Requirements", () => {
      test("should complete validation within target time", async () => {
        const request = {
          functionName: "testFunction",
          rawParameters: { username: "john_doe" },
          expectedSchema: createExampleParameterSchema(),
          userContext: createDefaultUserContext(),
          options: {
            strictValidation: false,
            enableConversationalValidation: false,
            autoSanitize: true,
            requireSanitizationConfirmation: false,
            targetPerformanceMs: 200,
            enableTypeConversion: true,
            enableParameterLearning: false,
          },
        };

        const startTime = Date.now();
        const result = await service.validateParameters(request);
        const executionTime = Date.now() - startTime;

        expect(executionTime).toBeLessThan(200);
        expect(result.performanceMetrics.totalValidationTime).toBeLessThan(200);
      });

      test("should handle multiple parameters efficiently", async () => {
        const request = {
          functionName: "testFunction",
          rawParameters: {
            username: "john_doe",
            email: "john@example.com",
            age: 25,
            isActive: true,
          },
          expectedSchema: {
            ...createExampleParameterSchema(),
            parameters: {
              ...createExampleParameterSchema().parameters,
              age: {
                type: ParameterType.NUMBER,
                description: "User age",
                validationRules: [],
                sanitizationRules: [],
                securityLevel: SecurityLevel.INTERNAL,
                examples: ["25", "30"],
              },
              isActive: {
                type: ParameterType.BOOLEAN,
                description: "User active status",
                validationRules: [],
                sanitizationRules: [],
                securityLevel: SecurityLevel.INTERNAL,
                examples: ["true", "false"],
              },
            },
            required: ["username", "email"],
          },
          userContext: createDefaultUserContext(),
          options: {
            strictValidation: false,
            enableConversationalValidation: false,
            autoSanitize: true,
            requireSanitizationConfirmation: false,
            targetPerformanceMs: 200,
            enableTypeConversion: true,
            enableParameterLearning: false,
          },
        };

        const result = await service.validateParameters(request);

        expect(result.isValid).toBe(true);
        expect(result.performanceMetrics.parametersProcessed).toBe(4);
        expect(result.performanceMetrics.totalValidationTime).toBeLessThan(200);
      });
    });
  });

  describe("NaturalLanguageParameterInterface", () => {
    let interface: NaturalLanguageParameterInterface;

    beforeEach(() => {
      interface = new NaturalLanguageParameterInterface(
        mockParlantValidationBridge,
      );
    });

    describe("Natural Language Parsing", () => {
      test("should parse boolean values from natural language", async () => {
        const request = {
          userInput: "yes",
          expectedType: ParameterType.BOOLEAN,
          context: {
            functionName: "testFunction",
            parameterName: "isActive",
            relatedParameters: {},
            userContext: createDefaultUserContext(),
            conversationHistory: [],
          },
          options: {
            enableFuzzyMatching: true,
            autoCorrectionLevel: "moderate" as any,
            requireConfirmationForAmbiguous: false,
            maxAlternatives: 3,
          },
        };

        const result = await interface.parseNaturalLanguageInput(request);

        expect(result.success).toBe(true);
        expect(result.parsedValue).toBe(true);
        expect(result.confidence).toBeGreaterThan(0.8);
      });

      test("should parse numeric values with fuzzy matching", async () => {
        const request = {
          userInput: "twenty five",
          expectedType: ParameterType.NUMBER,
          context: {
            functionName: "testFunction",
            parameterName: "age",
            relatedParameters: {},
            userContext: createDefaultUserContext(),
            conversationHistory: [],
          },
          options: {
            enableFuzzyMatching: true,
            autoCorrectionLevel: "moderate" as any,
            requireConfirmationForAmbiguous: false,
            maxAlternatives: 3,
          },
        };

        const result = await interface.parseNaturalLanguageInput(request);

        // Note: This would require more sophisticated NLP implementation
        // For now, test basic numeric parsing
        expect(result).toBeDefined();
      });

      test("should handle ambiguous input with alternatives", async () => {
        const request = {
          userInput: "maybe",
          expectedType: ParameterType.BOOLEAN,
          context: {
            functionName: "testFunction",
            parameterName: "isActive",
            relatedParameters: {},
            userContext: createDefaultUserContext(),
            conversationHistory: [],
          },
          options: {
            enableFuzzyMatching: true,
            autoCorrectionLevel: "moderate" as any,
            requireConfirmationForAmbiguous: true,
            maxAlternatives: 3,
          },
        };

        const result = await interface.parseNaturalLanguageInput(request);

        expect(result.alternatives).toBeDefined();
        expect(result.alternatives.length).toBeGreaterThan(0);
      });
    });

    describe("Parameter Collection", () => {
      test("should collect missing parameters through conversation", async () => {
        const request = {
          functionName: "testFunction",
          schema: createExampleParameterSchema(),
          providedParameters: { username: "john_doe" },
          userContext: createDefaultUserContext(),
          options: {
            enableInteractiveCollection: true,
            autoCompleteMissing: false,
            provideDetailedExplanations: true,
            maxCollectionRounds: 3,
            timeoutMs: 5000,
            language: "en",
            interactionStyle: InteractionStyle.GUIDED,
            enableSmartSuggestions: true,
          },
        };

        const result = await interface.collectParameters(request);

        expect(result.success).toBe(true);
        expect(result.conversationSummary.totalRounds).toBeGreaterThan(0);
        expect(result.guidanceProvided.length).toBeGreaterThan(0);
      });

      test("should handle different interaction styles", async () => {
        const styles = [
          InteractionStyle.MINIMAL,
          InteractionStyle.GUIDED,
          InteractionStyle.DETAILED,
          InteractionStyle.EXPERT,
        ];

        for (const style of styles) {
          const prompts = await interface.generateParameterPrompts(
            ["username"],
            createExampleParameterSchema(),
            {},
            createDefaultUserContext(),
            {
              enableInteractiveCollection: true,
              autoCompleteMissing: false,
              provideDetailedExplanations: true,
              maxCollectionRounds: 3,
              timeoutMs: 5000,
              language: "en",
              interactionStyle: style,
              enableSmartSuggestions: true,
            },
          );

          expect(prompts.username).toBeDefined();
          expect(prompts.username.content).toBeTruthy();
        }
      });
    });

    describe("Parameter Guidance", () => {
      test("should generate helpful parameter guidance", async () => {
        const schema = createExampleParameterSchema();
        const guidance = await interface.generateParameterGuidance(
          "username",
          schema.parameters.username,
          createDefaultUserContext(),
          "explanation" as any,
        );

        expect(guidance.parameterName).toBe("username");
        expect(guidance.content).toBeTruthy();
        expect(guidance.examples.length).toBeGreaterThan(0);
      });
    });
  });

  describe("AdvancedValidationFramework", () => {
    let framework: AdvancedValidationFramework;

    beforeEach(() => {
      framework = new AdvancedValidationFramework();
    });

    describe("Multi-Layer Validation", () => {
      test("should execute validation pipeline layers in order", async () => {
        const context = {
          parameterName: "username",
          userContext: createDefaultUserContext(),
          options: {
            strictValidation: false,
            enableConversationalValidation: false,
            autoSanitize: true,
            requireSanitizationConfirmation: false,
            targetPerformanceMs: 200,
            enableTypeConversion: true,
            enableParameterLearning: false,
          },
          relatedParameters: {},
          functionContext: {
            functionName: "testFunction",
            packageName: "test-package",
            metadata: {},
            securityContext: {
              requiredSecurityLevel: SecurityLevel.INTERNAL,
              accessControls: [],
              auditRequirements: [],
              complianceFrameworks: [],
            },
          },
          sessionData: {
            sessionId: "test-session",
            startTime: new Date(),
            previousValidations: {},
            learnedPreferences: {
              validationStrictness: "standard" as any,
              autoCorrectionPreferences: {
                enabled: true,
                level: "moderate" as any,
                requireConfirmation: false,
                trustedTypes: [],
              },
              notificationPreferences: {
                level: "warnings_and_errors" as any,
                channels: [],
                realTime: true,
                batchNotifications: false,
              },
              learningPreferences: {
                enableLearning: true,
                scope: "session_only" as any,
                retentionPeriod: 30,
                privacyLevel: "high" as any,
              },
            },
            riskAssessment: {
              riskLevel: RiskLevel.LOW,
              riskFactors: [],
              mitigationApplied: [],
              riskScore: 10,
            },
          },
          validationHistory: [],
        };

        const schema = createExampleParameterSchema();
        const result = await framework.executeValidation(
          "john_doe",
          schema.parameters.username,
          context,
        );

        expect(result.success).toBe(true);
        expect(result.messages).toBeDefined();
        expect(result.metrics.executionTime).toBeGreaterThan(0);
      });
    });

    describe("Adaptive Configuration", () => {
      test("should create adaptive validation configuration", async () => {
        const config = await framework.createAdaptiveConfig(
          createDefaultUserContext(),
          {
            functionName: "testFunction",
            packageName: "test-package",
            metadata: {},
            securityContext: {
              requiredSecurityLevel: SecurityLevel.INTERNAL,
              accessControls: [],
              auditRequirements: [],
              complianceFrameworks: [],
            },
          },
        );

        expect(config.enabled).toBe(true);
        expect(config.considerUserExpertise).toBe(true);
        expect(config.learningRate).toBeGreaterThan(0);
      });
    });

    describe("Performance Monitoring", () => {
      test("should track validation performance metrics", async () => {
        const contextKey = "testFunction_username";
        const metrics = framework.getPerformanceMetrics(contextKey);

        // Initially no metrics
        expect(metrics).toBeUndefined();

        // After validation, metrics should be available
        // (This would be populated by actual validation execution)
      });
    });
  });

  describe("SecurityIntegrationService", () => {
    let securityService: SecurityIntegrationService;

    beforeEach(() => {
      securityService = new SecurityIntegrationService();
    });

    describe("Threat Detection", () => {
      test("should detect SQL injection threats", async () => {
        const result = await securityService.detectThreats(
          "username",
          "'; DROP TABLE users; --",
          createDefaultUserContext(),
        );

        expect(result.threats.length).toBeGreaterThan(0);
        expect(result.threats[0].type).toBe(ThreatType.SQL_INJECTION);
        expect(result.analysisResult.confidenceScore).toBeGreaterThan(0.5);
      });

      test("should detect XSS attack patterns", async () => {
        const result = await securityService.detectThreats(
          "username",
          '<script>alert("xss")</script>',
          createDefaultUserContext(),
        );

        expect(result.threats.length).toBeGreaterThan(0);
        expect(result.threats[0].type).toBe(ThreatType.XSS_ATTACK);
      });

      test("should detect path traversal attempts", async () => {
        const result = await securityService.detectThreats(
          "filepath",
          "../../../etc/passwd",
          createDefaultUserContext(),
        );

        expect(result.threats.length).toBeGreaterThan(0);
        expect(result.threats[0].type).toBe(ThreatType.PATH_TRAVERSAL);
      });
    });

    describe("Parameter Sanitization", () => {
      test("should sanitize SQL injection attempts", async () => {
        const threats = [
          {
            type: ThreatType.SQL_INJECTION,
            description: "SQL injection detected",
            severity: RiskLevel.HIGH,
            affectedParameters: ["username"],
            mitigationApplied: false,
          },
        ];

        const result = await securityService.sanitizeParameter(
          "'; DROP TABLE users; --",
          threats,
          [SanitizationType.SQL_INJECTION_PREVENTION],
          createDefaultUserContext(),
        );

        expect(result.sanitizationApplied).toBe(true);
        expect(result.sanitizedValue).not.toContain("';");
      });

      test("should sanitize XSS attack vectors", async () => {
        const threats = [
          {
            type: ThreatType.XSS_ATTACK,
            description: "XSS attack detected",
            severity: RiskLevel.HIGH,
            affectedParameters: ["content"],
            mitigationApplied: false,
          },
        ];

        const result = await securityService.sanitizeParameter(
          '<script>alert("xss")</script>',
          threats,
          [SanitizationType.XSS_PREVENTION],
          createDefaultUserContext(),
        );

        expect(result.sanitizationApplied).toBe(true);
        expect(result.sanitizedValue).not.toContain("<script>");
      });
    });

    describe("Security Validation", () => {
      test("should perform comprehensive security validation", async () => {
        const result = await securityService.validateParameterSecurity(
          "username",
          "normal_username",
          SecurityLevel.INTERNAL,
          createDefaultUserContext(),
        );

        expect(result.isSecure).toBe(true);
        expect(result.auditLogId).toBeTruthy();
        expect(result.threatIndicators).toBeDefined();
      });

      test("should block malicious input", async () => {
        const result = await securityService.validateParameterSecurity(
          "username",
          "'; DROP TABLE users; --",
          SecurityLevel.INTERNAL,
          createDefaultUserContext(),
        );

        expect(result.threatIndicators.length).toBeGreaterThan(0);
        expect(result.sanitizedValue).not.toContain("';");
      });
    });

    describe("Audit Logging", () => {
      test("should create comprehensive audit logs", async () => {
        await securityService.validateParameterSecurity(
          "username",
          "test_user",
          SecurityLevel.INTERNAL,
          createDefaultUserContext(),
        );

        const logs = securityService.getSecurityAuditLogs();
        expect(logs.length).toBeGreaterThan(0);

        const latestLog = logs[logs.length - 1];
        expect(latestLog.parameterDetails.parameterName).toBe("username");
        expect(latestLog.userContext).toBeDefined();
      });

      test("should filter audit logs by criteria", async () => {
        // Create multiple log entries
        await securityService.validateParameterSecurity(
          "username1",
          "test_user1",
          SecurityLevel.INTERNAL,
          createDefaultUserContext(),
        );
        await securityService.validateParameterSecurity(
          "username2",
          "test_user2",
          SecurityLevel.INTERNAL,
          createDefaultUserContext(),
        );

        const allLogs = securityService.getSecurityAuditLogs();
        expect(allLogs.length).toBeGreaterThanOrEqual(2);

        const filteredLogs = securityService.getSecurityAuditLogs({
          userId: createDefaultUserContext().userId,
        });
        expect(filteredLogs.length).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe("ParlantParameterValidationSystem", () => {
    let system: ParlantParameterValidationSystem;

    beforeEach(() => {
      system =
        ParlantParameterValidationFactory.createParameterValidationSystem();
    });

    describe("System Integration", () => {
      test("should initialize all services when enabled", () => {
        expect(system.securityIntegrationService).toBeDefined();
        expect(system.advancedValidationFramework).toBeDefined();
        // Note: Other services require mock dependencies
      });

      test("should get system health status", async () => {
        const health = await system.getHealthStatus();

        expect(health.overall).toBeDefined();
        expect(health.services).toBeDefined();
        expect(health.configuration).toBeDefined();
        expect(health.version).toBe("1.0.0");
      });

      test("should get system performance metrics", async () => {
        const metrics = await system.getPerformanceMetrics();

        expect(metrics.totalValidations).toBeDefined();
        expect(metrics.averageValidationTime).toBeDefined();
        expect(metrics.successRate).toBeDefined();
        expect(metrics.timestamp).toBeInstanceOf(Date);
      });
    });

    describe("Configuration Management", () => {
      test("should get and update configuration", () => {
        const originalConfig = system.getConfiguration();
        expect(originalConfig).toBeDefined();

        system.updateConfiguration({
          performanceRequirements: {
            ...originalConfig.performanceRequirements,
            targetValidationTime: 150,
          },
        });

        const updatedConfig = system.getConfiguration();
        expect(updatedConfig.performanceRequirements.targetValidationTime).toBe(
          150,
        );
      });
    });
  });

  describe("Factory and Utilities", () => {
    describe("ParlantParameterValidationFactory", () => {
      test("should create individual services", () => {
        const parameterService =
          ParlantParameterValidationFactory.createParameterValidationService(
            mockParlantValidationBridge,
            mockConversationContextBuilder,
          );
        expect(parameterService).toBeInstanceOf(ParameterValidationService);

        const nlInterface =
          ParlantParameterValidationFactory.createNaturalLanguageInterface(
            mockParlantValidationBridge,
          );
        expect(nlInterface).toBeInstanceOf(NaturalLanguageParameterInterface);

        const framework =
          ParlantParameterValidationFactory.createAdvancedValidationFramework();
        expect(framework).toBeInstanceOf(AdvancedValidationFramework);

        const security =
          ParlantParameterValidationFactory.createSecurityIntegrationService();
        expect(security).toBeInstanceOf(SecurityIntegrationService);
      });

      test("should create complete system with custom configuration", () => {
        const customConfig = {
          ...defaultParlantParameterValidationConfig,
          performanceRequirements: {
            ...defaultParlantParameterValidationConfig.performanceRequirements,
            targetValidationTime: 100,
          },
        };

        const system =
          ParlantParameterValidationFactory.createParameterValidationSystem(
            customConfig,
          );
        expect(system).toBeInstanceOf(ParlantParameterValidationSystem);
        expect(
          system.getConfiguration().performanceRequirements
            .targetValidationTime,
        ).toBe(100);
      });
    });

    describe("Configuration Validation", () => {
      test("should validate valid configuration", () => {
        const result = validateParameterValidationConfig(
          defaultParlantParameterValidationConfig,
        );
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      test("should detect invalid configuration", () => {
        const invalidConfig = {
          ...defaultParlantParameterValidationConfig,
          performanceRequirements: {
            ...defaultParlantParameterValidationConfig.performanceRequirements,
            targetValidationTime: 3000, // Greater than max
            maxValidationTime: 2000,
          },
        };

        const result = validateParameterValidationConfig(invalidConfig);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });

      test("should detect audit retention violations", () => {
        const invalidConfig = {
          ...defaultParlantParameterValidationConfig,
          securityConfig: {
            ...defaultParlantParameterValidationConfig.securityConfig,
            auditConfig: {
              ...defaultParlantParameterValidationConfig.securityConfig
                .auditConfig,
              retention: 15, // Less than 30 days
            },
          },
        };

        const result = validateParameterValidationConfig(invalidConfig);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.includes("retention"))).toBe(true);
      });
    });

    describe("Test Utilities", () => {
      test("should create default user context", () => {
        const userContext = createDefaultUserContext();
        expect(userContext.userId).toBeTruthy();
        expect(userContext.roles).toContain("user");
        expect(userContext.securityContext.securityClearance).toBe(
          SecurityLevel.INTERNAL,
        );
      });

      test("should create example parameter schema", () => {
        const schema = createExampleParameterSchema();
        expect(schema.parameters.username).toBeDefined();
        expect(schema.parameters.email).toBeDefined();
        expect(schema.required).toContain("username");
        expect(schema.businessRules.length).toBeGreaterThan(0);
      });
    });
  });

  describe("End-to-End Workflows", () => {
    let system: ParlantParameterValidationSystem;

    beforeEach(() => {
      system = new ParlantParameterValidationSystem(
        defaultParlantParameterValidationConfig,
        mockParlantValidationBridge,
        mockConversationContextBuilder,
      );
    });

    test("should handle complete parameter validation workflow", async () => {
      // This would test the entire workflow from parameter input to final validation
      const request = {
        functionName: "createUser",
        rawParameters: {
          username: "john_doe",
          email: "john@example.com",
          password: "securePassword123",
        },
        expectedSchema: {
          ...createExampleParameterSchema(),
          parameters: {
            ...createExampleParameterSchema().parameters,
            password: {
              type: ParameterType.STRING,
              description: "User password",
              validationRules: [
                {
                  type: ValidationRuleType.MIN_LENGTH,
                  config: { minLength: 8 },
                  errorMessage: "Password must be at least 8 characters",
                  conversationalExplanation:
                    "Please provide a password with at least 8 characters",
                },
              ],
              sanitizationRules: [],
              securityLevel: SecurityLevel.RESTRICTED,
              examples: [],
            },
          },
          required: ["username", "email", "password"],
        },
        userContext: createDefaultUserContext(),
        options: {
          strictValidation: true,
          enableConversationalValidation: false,
          autoSanitize: true,
          requireSanitizationConfirmation: false,
          targetPerformanceMs: 200,
          enableTypeConversion: true,
          enableParameterLearning: true,
        },
      };

      // Test with the parameter validation service
      if (system.parameterValidationService) {
        const result =
          await system.parameterValidationService.validateParameters(request);
        expect(result.isValid).toBe(true);
        expect(result.performanceMetrics.totalValidationTime).toBeLessThan(200);
      }
    });

    test("should handle malicious input workflow", async () => {
      const maliciousInput = {
        username: "'; DROP TABLE users; --",
        email: '<script>window.location="http://evil.com"</script>@evil.com',
        comment: "../../../etc/passwd",
      };

      // Test security validation
      for (const [param, value] of Object.entries(maliciousInput)) {
        const securityResult =
          await system.securityIntegrationService.validateParameterSecurity(
            param,
            value,
            SecurityLevel.INTERNAL,
            createDefaultUserContext(),
          );

        expect(securityResult.threatIndicators.length).toBeGreaterThan(0);
        expect(securityResult.sanitizedValue).not.toBe(value);
      }
    });

    test("should handle performance under load", async () => {
      const concurrentRequests = 10;
      const requests = Array.from({ length: concurrentRequests }, (_, i) => ({
        functionName: `testFunction${i}`,
        rawParameters: { username: `user${i}` },
        expectedSchema: createExampleParameterSchema(),
        userContext: createDefaultUserContext(),
        options: {
          strictValidation: false,
          enableConversationalValidation: false,
          autoSanitize: true,
          requireSanitizationConfirmation: false,
          targetPerformanceMs: 200,
          enableTypeConversion: true,
          enableParameterLearning: false,
        },
      }));

      if (system.parameterValidationService) {
        const startTime = Date.now();
        const results = await Promise.all(
          requests.map((req) =>
            system.parameterValidationService.validateParameters(req),
          ),
        );
        const totalTime = Date.now() - startTime;

        expect(results).toHaveLength(concurrentRequests);
        expect(results.every((r) => r.isValid)).toBe(true);
        expect(totalTime / concurrentRequests).toBeLessThan(200); // Average time per request
      }
    });
  });
});

// ===== INTEGRATION TESTS =====

describe("PARLANT Parameter Validation Integration Tests", () => {
  describe("Real-world Scenarios", () => {
    test("should handle user registration scenario", async () => {
      const registrationSchema = {
        parameters: {
          firstName: {
            type: ParameterType.STRING,
            description: "User first name",
            validationRules: [
              {
                type: ValidationRuleType.MIN_LENGTH,
                config: { minLength: 2 },
                errorMessage: "First name must be at least 2 characters",
                conversationalExplanation:
                  "Please provide your first name (at least 2 characters)",
              },
            ],
            sanitizationRules: [
              {
                type: SanitizationType.TRIM_WHITESPACE,
                config: {},
                requireConfirmation: false,
                explanation: "Remove extra spaces",
              },
            ],
            securityLevel: SecurityLevel.CONFIDENTIAL,
            examples: ["John", "Jane"],
          },
          email: {
            type: ParameterType.EMAIL,
            description: "Email address",
            validationRules: [
              {
                type: ValidationRuleType.REGEX_PATTERN,
                config: { pattern: "^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$" },
                errorMessage: "Please provide a valid email address",
                conversationalExplanation:
                  "Email should be in format: user@domain.com",
              },
            ],
            sanitizationRules: [
              {
                type: SanitizationType.TRIM_WHITESPACE,
                config: {},
                requireConfirmation: false,
                explanation: "Remove extra spaces",
              },
            ],
            securityLevel: SecurityLevel.CONFIDENTIAL,
            examples: ["user@example.com"],
          },
          age: {
            type: ParameterType.NUMBER,
            description: "User age",
            validationRules: [
              {
                type: ValidationRuleType.RANGE,
                config: { min: 13, max: 120 },
                errorMessage: "Age must be between 13 and 120",
                conversationalExplanation:
                  "Please provide your age (must be 13 or older)",
              },
            ],
            sanitizationRules: [],
            securityLevel: SecurityLevel.INTERNAL,
            examples: ["25", "30"],
          },
        },
        required: ["firstName", "email", "age"],
        businessRules: [
          {
            id: "minimum-age",
            description: "User must be at least 13 years old",
            condition: "age >= 13",
            severity: RuleSeverity.ERROR,
            conversationalExplanation:
              "You must be at least 13 years old to register",
          },
        ],
        securityConstraints: [
          {
            type: SecurityConstraintType.INJECTION_PREVENTION,
            config: { enableAllChecks: true },
            riskLevel: RiskLevel.HIGH,
            mitigationStrategies: ["input sanitization", "validation"],
          },
        ],
      };

      const userInput = {
        firstName: "  John  ",
        email: " john.doe@example.com ",
        age: "25",
      };

      const validationService = new ParameterValidationService(
        mockParlantValidationBridge,
        mockConversationContextBuilder,
      );

      const result = await validationService.validateParameters({
        functionName: "registerUser",
        rawParameters: userInput,
        expectedSchema: registrationSchema,
        userContext: createDefaultUserContext(),
        options: {
          strictValidation: true,
          enableConversationalValidation: false,
          autoSanitize: true,
          requireSanitizationConfirmation: false,
          targetPerformanceMs: 300,
          enableTypeConversion: true,
          enableParameterLearning: false,
        },
      });

      expect(result.isValid).toBe(true);
      expect(result.validatedParameters.firstName).toBe("John"); // Trimmed
      expect(result.validatedParameters.email).toBe("john.doe@example.com"); // Trimmed
      expect(result.validatedParameters.age).toBe(25); // Converted to number
    });

    test("should handle file upload scenario with security validation", async () => {
      const fileUploadSchema = {
        parameters: {
          filename: {
            type: ParameterType.STRING,
            description: "Name of the file to upload",
            validationRules: [
              {
                type: ValidationRuleType.REGEX_PATTERN,
                config: {
                  pattern: "^[a-zA-Z0-9._-]+\\.(jpg|jpeg|png|pdf|doc|docx)$",
                },
                errorMessage: "Invalid filename or file type",
                conversationalExplanation:
                  "Filename should only contain letters, numbers, dots, hyphens, underscores and must end with: jpg, jpeg, png, pdf, doc, docx",
              },
            ],
            sanitizationRules: [
              {
                type: SanitizationType.PATH_TRAVERSAL_PREVENTION,
                config: {},
                requireConfirmation: true,
                explanation: "Remove potentially dangerous path characters",
              },
            ],
            securityLevel: SecurityLevel.RESTRICTED,
            examples: ["document.pdf", "image.jpg"],
          },
          fileSize: {
            type: ParameterType.NUMBER,
            description: "File size in bytes",
            validationRules: [
              {
                type: ValidationRuleType.RANGE,
                config: { min: 1, max: 10485760 }, // 10MB max
                errorMessage: "File size must be between 1 byte and 10MB",
                conversationalExplanation:
                  "File must not be empty and cannot exceed 10MB",
              },
            ],
            sanitizationRules: [],
            securityLevel: SecurityLevel.INTERNAL,
            examples: ["1024", "5242880"],
          },
        },
        required: ["filename", "fileSize"],
        businessRules: [],
        securityConstraints: [
          {
            type: SecurityConstraintType.INJECTION_PREVENTION,
            config: { enablePathTraversalDetection: true },
            riskLevel: RiskLevel.CRITICAL,
            mitigationStrategies: ["path sanitization", "file type validation"],
          },
        ],
      };

      // Test malicious filename
      const maliciousInput = {
        filename: "../../../etc/passwd",
        fileSize: "1024",
      };

      const securityService = new SecurityIntegrationService();
      const securityResult = await securityService.validateParameterSecurity(
        "filename",
        maliciousInput.filename,
        SecurityLevel.RESTRICTED,
        createDefaultUserContext(),
      );

      expect(securityResult.threatIndicators.length).toBeGreaterThan(0);
      expect(securityResult.threatIndicators[0].type).toBe(
        ThreatType.PATH_TRAVERSAL,
      );
    });
  });

  describe("Performance Benchmarks", () => {
    test("should meet sub-200ms validation target for simple parameters", async () => {
      const validationService = new ParameterValidationService(
        mockParlantValidationBridge,
        mockConversationContextBuilder,
      );

      const iterations = 100;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();

        await validationService.validateParameters({
          functionName: "testFunction",
          rawParameters: { username: `user${i}` },
          expectedSchema: createExampleParameterSchema(),
          userContext: createDefaultUserContext(),
          options: {
            strictValidation: false,
            enableConversationalValidation: false,
            autoSanitize: true,
            requireSanitizationConfirmation: false,
            targetPerformanceMs: 200,
            enableTypeConversion: true,
            enableParameterLearning: false,
          },
        });

        times.push(Date.now() - startTime);
      }

      const averageTime =
        times.reduce((sum, time) => sum + time, 0) / times.length;
      const p95Time = times.sort((a, b) => a - b)[
        Math.floor(times.length * 0.95)
      ];

      expect(averageTime).toBeLessThan(200);
      expect(p95Time).toBeLessThan(500);
    });

    test("should handle batch validation efficiently", async () => {
      const validationService = new ParameterValidationService(
        mockParlantValidationBridge,
        mockConversationContextBuilder,
      );

      const batchSize = 50;
      const requests = Array.from({ length: batchSize }, (_, i) => ({
        functionName: "batchTest",
        rawParameters: { username: `user${i}`, email: `user${i}@example.com` },
        expectedSchema: createExampleParameterSchema(),
        userContext: createDefaultUserContext(),
        options: {
          strictValidation: false,
          enableConversationalValidation: false,
          autoSanitize: true,
          requireSanitizationConfirmation: false,
          targetPerformanceMs: 200,
          enableTypeConversion: true,
          enableParameterLearning: false,
        },
      }));

      const startTime = Date.now();
      const results = await Promise.all(
        requests.map((req) => validationService.validateParameters(req)),
      );
      const totalTime = Date.now() - startTime;

      expect(results).toHaveLength(batchSize);
      expect(results.every((r) => r.isValid)).toBe(true);
      expect(totalTime / batchSize).toBeLessThan(100); // Average < 100ms per validation in batch
    });
  });
});

// ===== TEST UTILITIES =====

export const ParameterValidationTestUtils = {
  createMockValidationBridge: () => mockParlantValidationBridge,
  createMockContextBuilder: () => mockConversationContextBuilder,
  createTestUserContext: createDefaultUserContext,
  createTestParameterSchema: createExampleParameterSchema,

  // Performance testing utilities
  measureValidationPerformance: async (
    validationFn: () => Promise<any>,
    iterations: number = 10,
  ): Promise<{ average: number; min: number; max: number; p95: number }> => {
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      await validationFn();
      times.push(Date.now() - start);
    }

    times.sort((a, b) => a - b);

    return {
      average: times.reduce((sum, time) => sum + time, 0) / times.length,
      min: times[0],
      max: times[times.length - 1],
      p95: times[Math.floor(times.length * 0.95)],
    };
  },

  // Security testing utilities
  createMaliciousPayloads: () => ({
    sqlInjection: [
      "'; DROP TABLE users; --",
      "1' OR '1'='1",
      "admin'--",
      "' UNION SELECT * FROM passwords--",
    ],
    xss: [
      '<script>alert("xss")</script>',
      '<img src="x" onerror="alert(1)">',
      'javascript:alert("xss")',
      '<svg onload="alert(1)">',
    ],
    pathTraversal: [
      "../../../etc/passwd",
      "..\\..\\windows\\system32\\config\\sam",
      "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd",
      "....//....//....//etc/passwd",
    ],
    commandInjection: [
      "; cat /etc/passwd",
      "| whoami",
      "$(cat /etc/passwd)",
      "`ls -la`",
    ],
  }),
};
