/**
 * PARLANT Phase 1 - Integration Tests
 *
 * End-to-end integration tests for the complete PARLANT error handling system,
 * testing the interaction between all components and real-world scenarios.
 *
 * @version 1.0.0
 * @author PARLANT Phase 1 Implementation Team
 */

import { Test, TestingModule } from "@nestjs/testing";
import { EventEmitter2 } from "@nestjs/event-emitter";
import {
  BadRequestException,
  UnauthorizedException,
  InternalServerErrorException,
} from "@nestjs/common";

import {
  ConversationalErrorHandler,
  ErrorNaturalLanguageProcessor,
  ConversationalErrorContext,
  ConversationalErrorSeverity,
  ConversationalErrorCategory,
} from "../conversational-error-handler";

import {
  AdvancedRecoveryFramework,
  RecoveryWorkflowEngine,
  AutomatedRecoveryStrategies,
} from "../advanced-recovery-framework";

import {
  NaturalLanguageCommunicationSystem,
  MessageGenerationEngine,
  ContextualHelpEngine,
  ProgressiveDisclosureEngine,
  UserCommunicationProfile,
  CommunicationLocale,
} from "../natural-language-communication";

import {
  EnterpriseErrorManagementSystem,
  EnterpriseErrorLogger,
  ErrorPatternRecognitionEngine,
  ErrorAnalyticsDashboardEngine,
} from "../enterprise-error-management";

describe("PARLANT Phase 1 - Full Integration", () => {
  let conversationalHandler: ConversationalErrorHandler;
  let recoveryFramework: AdvancedRecoveryFramework;
  let communicationSystem: NaturalLanguageCommunicationSystem;
  let enterpriseManagement: EnterpriseErrorManagementSystem;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        // Conversational Error Handler
        ConversationalErrorHandler,
        ErrorNaturalLanguageProcessor,

        // Recovery Framework
        AdvancedRecoveryFramework,
        RecoveryWorkflowEngine,
        AutomatedRecoveryStrategies,

        // Communication System
        NaturalLanguageCommunicationSystem,
        MessageGenerationEngine,
        ContextualHelpEngine,
        ProgressiveDisclosureEngine,

        // Enterprise Management
        EnterpriseErrorManagementSystem,
        EnterpriseErrorLogger,
        ErrorPatternRecognitionEngine,
        ErrorAnalyticsDashboardEngine,

        // Event Emitter
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    conversationalHandler = module.get<ConversationalErrorHandler>(
      ConversationalErrorHandler,
    );
    recoveryFramework = module.get<AdvancedRecoveryFramework>(
      AdvancedRecoveryFramework,
    );
    communicationSystem = module.get<NaturalLanguageCommunicationSystem>(
      NaturalLanguageCommunicationSystem,
    );
    enterpriseManagement = module.get<EnterpriseErrorManagementSystem>(
      EnterpriseErrorManagementSystem,
    );
  });

  afterEach(async () => {
    await module.close();
  });

  describe("End-to-End Error Processing Workflow", () => {
    const createTestContext = (): ConversationalErrorContext => ({
      userId: "test-user-123",
      sessionId: "session-456",
      userLanguage: "en",
      userExpertiseLevel: "INTERMEDIATE",
      endpoint: "/api/users",
      method: "POST",
      parameters: { email: "invalid-email", name: "John Doe" },
      headers: { "user-agent": "Mozilla/5.0" },
      timestamp: new Date(),
      requestId: "req-789",
      systemLoad: 0.6,
      region: "us-east-1",
    });

    const createUserProfile = (): UserCommunicationProfile => ({
      userId: "test-user-123",
      communicationStyle: "DETAILED",
      learningStyle: "EXAMPLES",
      expertiseLevels: {
        technical: "INTERMEDIATE",
        domain: "BEGINNER",
        general: "INTERMEDIATE",
      },
      locale: {
        language: "en",
        region: "US",
        culturalStyle: "DIRECT",
        technicalLevel: "MODERATE",
      } as CommunicationLocale,
      interactionHistory: {
        preferredSolutionTypes: ["EXAMPLE", "DOCUMENTATION"],
        commonErrorPatterns: ["validation_errors"],
        successfulRecoveryMethods: ["guided_correction"],
        feedbackPatterns: {
          helpfulnessRating: 4.2,
          clarityRating: 4.0,
          completenessRating: 4.1,
        },
      },
    });

    it("should handle complete user input validation error workflow", async () => {
      // Arrange
      const error = new BadRequestException("Email format is invalid");
      const context = createTestContext();
      const userProfile = createUserProfile();

      // Act - Step 1: Process error with conversational handler
      const errorResponse = await conversationalHandler.processError(
        error,
        context,
      );

      // Assert - Conversational response
      expect(errorResponse.severity).toBe(ConversationalErrorSeverity.WARNING);
      expect(errorResponse.category).toBe(
        ConversationalErrorCategory.USER_INPUT,
      );
      expect(errorResponse.message).toContain("information you provided");
      expect(errorResponse.guidance.immediateActions).toHaveLength(2);

      // Act - Step 2: Initiate recovery
      const recoveryResult = await recoveryFramework.initiateRecovery(
        error,
        context,
      );

      // Assert - Recovery initiation
      expect(recoveryResult.session.workflow.workflowId).toBe(
        "user_input_recovery",
      );
      expect(recoveryResult.initialResult?.strategy).toBe(
        "auto_input_validation",
      );

      // Act - Step 3: Generate communication
      const communication = await communicationSystem.generateCommunication(
        error,
        context,
        userProfile,
        errorResponse.severity,
        errorResponse.category,
      );

      // Assert - Communication generation
      expect(communication.message).toContain("information you provided");
      expect(communication.resources).toHaveLength(2);
      expect(communication.interactive.quickActions).toHaveLength(2);
      expect(communication.interactive.followUpQuestions).toHaveLength(3);

      // Act - Step 4: Enterprise management
      const managementResult = await enterpriseManagement.processError(
        error,
        context,
        errorResponse,
        recoveryResult.session,
      );

      // Assert - Enterprise management
      expect(managementResult.logEntryId).toMatch(/^LOG_/);
      expect(managementResult.dashboard.summary.totalErrors).toBeGreaterThan(0);
      expect(managementResult.patterns.length).toBeGreaterThanOrEqual(0);
    });

    it("should handle authentication error with progressive disclosure", async () => {
      // Arrange
      const error = new UnauthorizedException("Session expired");
      const context = createTestContext();
      const expertProfile: UserCommunicationProfile = {
        ...createUserProfile(),
        expertiseLevels: {
          technical: "EXPERT",
          domain: "EXPERT",
          general: "EXPERT",
        },
        communicationStyle: "TECHNICAL",
      };

      // Act - Complete workflow
      const errorResponse = await conversationalHandler.processError(
        error,
        context,
      );
      const recoveryResult = await recoveryFramework.initiateRecovery(
        error,
        context,
      );
      const communication = await communicationSystem.generateCommunication(
        error,
        context,
        expertProfile,
        errorResponse.severity,
        errorResponse.category,
      );

      // Assert - Expert user gets technical details
      expect(errorResponse.technicalDetails).toBeDefined();
      expect(communication.disclosure.currentLevel).toBe("DETAILED");
      expect(communication.disclosure.availableLevels).toContain(
        "COMPREHENSIVE",
      );
      expect(communication.message).toContain("Check the response headers");

      // Assert - Authentication-specific recovery
      expect(recoveryResult.session.workflow.workflowId).toBe(
        "authentication_recovery",
      );
      expect(recoveryResult.initialResult?.strategy).toBe("session_refresh");
    });

    it("should handle critical system error with escalation", async () => {
      // Arrange
      const error = new InternalServerErrorException(
        "Database connection failed",
      );
      const context = createTestContext();
      const userProfile = createUserProfile();

      // Act - Complete workflow
      const errorResponse = await conversationalHandler.processError(
        error,
        context,
      );
      const recoveryResult = await recoveryFramework.initiateRecovery(
        error,
        context,
      );
      const communication = await communicationSystem.generateCommunication(
        error,
        context,
        userProfile,
        errorResponse.severity,
        errorResponse.category,
      );

      // Assert - Critical error handling
      expect(errorResponse.severity).toBe(ConversationalErrorSeverity.CRITICAL);
      expect(errorResponse.category).toBe(ConversationalErrorCategory.SYSTEM);
      expect(errorResponse.message).toContain("technical issue");

      // Assert - System recovery workflow
      expect(recoveryResult.session.workflow.workflowId).toBe(
        "system_error_recovery",
      );

      // Assert - Manual intervention recommendation
      const manualIntervention = errorResponse.recoveryRecommendations.find(
        (rec) => rec.strategy === "MANUAL_INTERVENTION",
      );
      expect(manualIntervention).toBeDefined();

      // Assert - Escalation guidance
      expect(communication.interactive.quickActions).toContainEqual(
        expect.objectContaining({
          actionId: "get_help",
        }),
      );
    });

    it("should maintain consistency across all components", async () => {
      // Arrange
      const error = new BadRequestException("Validation failed");
      const context = createTestContext();
      const userProfile = createUserProfile();

      // Act - Process through all components
      const errorResponse = await conversationalHandler.processError(
        error,
        context,
      );
      const communication = await communicationSystem.generateCommunication(
        error,
        context,
        userProfile,
        errorResponse.severity,
        errorResponse.category,
      );

      // Assert - Consistency checks
      expect(errorResponse.severity).toBe(ConversationalErrorSeverity.WARNING);
      expect(communication.message).toContain("information you provided");

      // Error IDs should be unique but format consistent
      expect(errorResponse.errorId).toMatch(/^PARLANT_\d+_[a-z0-9]+$/);
      expect(communication.metadata.messageId).toMatch(/^MSG_\d+_[a-z0-9]+$/);

      // Processing times should be reasonable
      expect(errorResponse.tracking.processingTime).toBeLessThan(100);
      expect(communication.metadata.generationTime).toBeLessThan(100);
    });
  });

  describe("Multi-Stage Recovery Integration", () => {
    it("should execute complete recovery workflow with user guidance", async () => {
      // Arrange
      const error = new BadRequestException("Multiple validation errors");
      const context = createTestContext();

      // Act - Initiate recovery
      const { session } = await recoveryFramework.initiateRecovery(
        error,
        context,
      );

      // Simulate multi-stage recovery
      let currentStage = 0;
      let recoveryResult = await recoveryFramework.continueRecovery(
        session.sessionId,
      );

      // Assert - First stage (immediate)
      expect(recoveryResult?.stage).toBe("IMMEDIATE");
      expect(recoveryResult?.strategy).toBe("auto_input_validation");

      // If first stage fails, continue to next stage
      if (!recoveryResult?.success) {
        currentStage++;
        recoveryResult = await recoveryFramework.continueRecovery(
          session.sessionId,
        );

        // Assert - Second stage (guided)
        expect(recoveryResult?.stage).toBe("GUIDED");
        expect(recoveryResult?.strategy).toBe("guided_input_correction");
      }

      // Get final session status
      const finalStatus = recoveryFramework.getRecoveryStatus(
        session.sessionId,
      );

      // Assert - Session tracking
      expect(finalStatus?.attempts.length).toBeGreaterThan(0);
      expect(finalStatus?.currentStage).toBeGreaterThan(0);
    });

    it("should handle recovery completion with user feedback", async () => {
      // Arrange
      const error = new BadRequestException("Test error");
      const context = createTestContext();

      // Act - Complete recovery workflow
      const { session } = await recoveryFramework.initiateRecovery(
        error,
        context,
      );
      await recoveryFramework.continueRecovery(session.sessionId);

      // Complete with user satisfaction
      recoveryFramework.completeRecovery(session.sessionId, 4.2);

      // Assert - Session completed
      const activeSessions = recoveryFramework.getActiveRecoverySessions();
      expect(
        activeSessions.find((s) => s.sessionId === session.sessionId),
      ).toBeUndefined();
    });
  });

  describe("Analytics and Pattern Recognition Integration", () => {
    it("should track patterns across multiple errors", async () => {
      // Arrange
      const errors = [
        new BadRequestException("Email validation failed"),
        new BadRequestException("Phone validation failed"),
        new BadRequestException("Address validation failed"),
      ];
      const context = createTestContext();

      // Act - Process multiple similar errors
      const responses = [];
      for (const error of errors) {
        const response = await conversationalHandler.processError(
          error,
          context,
        );
        responses.push(response);
      }

      // Get analytics
      const analytics = await enterpriseManagement.getErrorAnalytics({
        start: new Date(Date.now() - 60 * 60 * 1000), // Last hour
        end: new Date(),
      });

      // Assert - Pattern detection
      expect(analytics.dashboard.summary.totalErrors).toBeGreaterThanOrEqual(3);
      expect(
        analytics.dashboard.distribution.byCategory[
          ConversationalErrorCategory.USER_INPUT
        ],
      ).toBeGreaterThanOrEqual(3);

      // Should identify validation patterns
      const validationPatterns = analytics.patterns.filter((p) =>
        p.characteristics.commonFactors.some((f) => f.includes("validation")),
      );
      expect(validationPatterns.length).toBeGreaterThan(0);
    });

    it("should generate comprehensive dashboard data", async () => {
      // Arrange
      const testErrors = [
        { error: new BadRequestException("Validation error"), count: 3 },
        { error: new UnauthorizedException("Auth error"), count: 2 },
        { error: new InternalServerErrorException("System error"), count: 1 },
      ];
      const context = createTestContext();

      // Act - Generate test data
      for (const { error, count } of testErrors) {
        for (let i = 0; i < count; i++) {
          await conversationalHandler.processError(error, context);
        }
      }

      // Get analytics
      const analytics = await enterpriseManagement.getErrorAnalytics({
        start: new Date(Date.now() - 60 * 60 * 1000),
        end: new Date(),
      });

      // Assert - Dashboard completeness
      expect(analytics.dashboard.summary.totalErrors).toBe(6);
      expect(analytics.dashboard.summary.uniqueErrors).toBe(3);
      expect(analytics.dashboard.distribution.bySeverity).toBeDefined();
      expect(analytics.dashboard.distribution.byCategory).toBeDefined();
      expect(analytics.dashboard.topIssues.length).toBeGreaterThan(0);
      expect(analytics.dashboard.performance).toBeDefined();
      expect(analytics.dashboard.predictions).toBeDefined();
    });
  });

  describe("Performance Requirements Integration", () => {
    it("should meet end-to-end performance requirements", async () => {
      // Arrange
      const error = new BadRequestException("Performance test error");
      const context = createTestContext();
      const userProfile = createUserProfile();

      // Act - Measure complete workflow performance
      const startTime = Date.now();

      await Promise.all([
        conversationalHandler.processError(error, context),
        recoveryFramework.initiateRecovery(error, context),
        communicationSystem.generateCommunication(
          error,
          context,
          userProfile,
          ConversationalErrorSeverity.WARNING,
          ConversationalErrorCategory.USER_INPUT,
        ),
      ]);

      const totalTime = Date.now() - startTime;

      // Assert - Performance requirements
      expect(totalTime).toBeLessThan(200); // Complete workflow under 200ms
    });

    it("should handle concurrent error processing", async () => {
      // Arrange
      const errors = Array.from(
        { length: 10 },
        (_, i) => new BadRequestException(`Concurrent error ${i}`),
      );
      const context = createTestContext();

      // Act - Process errors concurrently
      const startTime = Date.now();
      const promises = errors.map((error) =>
        conversationalHandler.processError(error, context),
      );

      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      // Assert - Concurrent processing
      expect(results).toHaveLength(10);
      expect(totalTime).toBeLessThan(500); // All 10 errors processed within 500ms
      results.forEach((result) => {
        expect(result.errorId).toBeDefined();
        expect(result.tracking.processingTime).toBeLessThan(100);
      });
    });
  });

  describe("Error Recovery Success Paths", () => {
    it("should successfully recover from user input errors", async () => {
      // Arrange
      const error = new BadRequestException("Email format invalid");
      const context = createTestContext();

      // Act - Full recovery simulation
      const errorResponse = await conversationalHandler.processError(
        error,
        context,
      );
      const { session } = await recoveryFramework.initiateRecovery(
        error,
        context,
      );

      // Simulate successful recovery
      const recoveryResult = await recoveryFramework.continueRecovery(
        session.sessionId,
      );

      // Assert - Successful recovery path
      expect(errorResponse.category).toBe(
        ConversationalErrorCategory.USER_INPUT,
      );
      expect(session.workflow.workflowId).toBe("user_input_recovery");

      // Recovery recommendations should be confidence-sorted
      expect(
        errorResponse.recoveryRecommendations[0].confidence,
      ).toBeGreaterThanOrEqual(
        errorResponse.recoveryRecommendations[1].confidence,
      );

      // Should provide actionable guidance
      expect(errorResponse.guidance.immediateActions).toHaveLength(2);
      expect(errorResponse.guidance.alternatives).toHaveLength(2);
      expect(errorResponse.guidance.preventionTips).toHaveLength(3);
    });
  });

  describe("Localization and Accessibility", () => {
    it("should adapt communication for different cultural styles", async () => {
      // Arrange
      const error = new BadRequestException("Validation error");
      const context = createTestContext();

      const formalProfile: UserCommunicationProfile = {
        ...createUserProfile(),
        locale: {
          language: "en",
          region: "UK",
          culturalStyle: "FORMAL",
          technicalLevel: "DETAILED",
        } as CommunicationLocale,
      };

      const casualProfile: UserCommunicationProfile = {
        ...createUserProfile(),
        locale: {
          language: "en",
          region: "US",
          culturalStyle: "CASUAL",
          technicalLevel: "MINIMAL",
        } as CommunicationLocale,
      };

      // Act
      const formalCommunication =
        await communicationSystem.generateCommunication(
          error,
          context,
          formalProfile,
          ConversationalErrorSeverity.WARNING,
          ConversationalErrorCategory.USER_INPUT,
        );

      const casualCommunication =
        await communicationSystem.generateCommunication(
          error,
          context,
          casualProfile,
          ConversationalErrorSeverity.WARNING,
          ConversationalErrorCategory.USER_INPUT,
        );

      // Assert - Different cultural adaptations
      expect(formalCommunication.message).not.toContain("We're");
      expect(formalCommunication.message).toContain("We are");

      expect(casualCommunication.message).toContain("information you provided");
      expect(formalCommunication.message).toContain("information you provided");

      // Different complexity levels
      expect(formalCommunication.metadata.complexity).not.toBe(
        casualCommunication.metadata.complexity,
      );
    });
  });
});
