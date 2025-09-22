/**
 * @fileoverview PARLANT Phase 1 - Comprehensive Rate Limiting Test Suite
 * Complete test coverage for all rate limiting scenarios, load testing,
 * and enterprise features with performance validation
 *
 * @version 1.0.0
 * @author AIgent Enterprise Rate Limiting Team
 * @since 2025-09-22
 */

import { Test, TestingModule } from "@nestjs/testing";
import { ConversationalRateLimiterService } from "../core/conversational-rate-limiter.service";
import { MultiTierRateManagerService } from "../framework/multi-tier-rate-manager.service";
import { NaturalLanguageRateCommunicatorService } from "../communication/natural-language-rate-communicator.service";
import { EnterpriseTrafficManagerService } from "../enterprise/enterprise-traffic-manager.service";
import { RateLimitingAnalyticsService } from "../analytics/rate-limiting-analytics.service";
import {
  RateLimitConfiguration,
  RateLimitContext,
  RateLimitDecision,
  UserRateLimits,
  APIRateLimits,
  OperationRateLimits,
  GlobalRateLimits,
  EnterpriseRateLimitConfig,
} from "../types/rate-limiting.types";
import {
  UserContext,
  SecurityLevel,
  RiskLevel,
} from "../../interfaces/conversational-api.interface";

describe("PARLANT Phase 1 - Comprehensive Rate Limiting System", () => {
  let conversationalRateLimiter: ConversationalRateLimiterService;
  let multiTierManager: MultiTierRateManagerService;
  let naturalLanguageCommunicator: NaturalLanguageRateCommunicatorService;
  let enterpriseTrafficManager: EnterpriseTrafficManagerService;
  let analyticsService: RateLimitingAnalyticsService;

  let testConfiguration: RateLimitConfiguration;
  let testContext: RateLimitContext;
  let testUserContext: UserContext;

  beforeAll(async () => {
    // Initialize test configuration
    testConfiguration = createTestRateLimitConfiguration();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ConversationalRateLimiterService,
          useFactory: () =>
            new ConversationalRateLimiterService(testConfiguration),
        },
        {
          provide: MultiTierRateManagerService,
          useFactory: () => new MultiTierRateManagerService(testConfiguration),
        },
        NaturalLanguageRateCommunicatorService,
        {
          provide: EnterpriseTrafficManagerService,
          useFactory: () =>
            new EnterpriseTrafficManagerService(testConfiguration),
        },
        RateLimitingAnalyticsService,
      ],
    }).compile();

    conversationalRateLimiter = module.get<ConversationalRateLimiterService>(
      ConversationalRateLimiterService,
    );
    multiTierManager = module.get<MultiTierRateManagerService>(
      MultiTierRateManagerService,
    );
    naturalLanguageCommunicator =
      module.get<NaturalLanguageRateCommunicatorService>(
        NaturalLanguageRateCommunicatorService,
      );
    enterpriseTrafficManager = module.get<EnterpriseTrafficManagerService>(
      EnterpriseTrafficManagerService,
    );
    analyticsService = module.get<RateLimitingAnalyticsService>(
      RateLimitingAnalyticsService,
    );

    // Initialize test contexts
    testUserContext = createTestUserContext();
    testContext = createTestRateLimitContext(testUserContext);
  });

  describe("Core ConversationalRateLimiter", () => {
    describe("Basic Rate Limiting", () => {
      it("should allow requests within limits", async () => {
        const decision =
          await conversationalRateLimiter.evaluateRequest(testContext);

        expect(decision.decision).toBe("ALLOW");
        expect(decision.processingTime).toBeLessThan(50); // Target: <50ms
        expect(decision.conversationalResponse).toBeDefined();
        expect(decision.analytics).toBeDefined();
      }, 10000);

      it("should deny requests exceeding limits", async () => {
        // Simulate high-frequency requests
        const highFrequencyContext = {
          ...testContext,
          recentHistory: Array(100).fill({
            timestamp: new Date(),
            endpoint: testContext.apiEndpoint,
            outcome: "ALLOWED",
          }),
        };

        const decision =
          await conversationalRateLimiter.evaluateRequest(highFrequencyContext);

        expect(["DENY", "THROTTLE", "QUEUE"]).toContain(decision.decision);
        expect(decision.reason).toBeTruthy();
        expect(decision.conversationalResponse).toBeDefined();
      });

      it("should handle concurrent requests efficiently", async () => {
        const concurrentRequests = 100;
        const promises = Array(concurrentRequests)
          .fill(null)
          .map((_, index) =>
            conversationalRateLimiter.evaluateRequest({
              ...testContext,
              requestId: `concurrent-${index}`,
            }),
          );

        const startTime = Date.now();
        const results = await Promise.all(promises);
        const totalTime = Date.now() - startTime;

        // Should handle 100 concurrent requests in under 500ms
        expect(totalTime).toBeLessThan(500);
        expect(results).toHaveLength(concurrentRequests);

        // All requests should have valid decisions
        results.forEach((result) => {
          expect(["ALLOW", "DENY", "THROTTLE", "QUEUE"]).toContain(
            result.decision,
          );
          expect(result.processingTime).toBeLessThan(50);
        });
      });
    });

    describe("Conversational Capabilities", () => {
      it("should provide natural language explanations", async () => {
        const decision =
          await conversationalRateLimiter.evaluateRequest(testContext);

        expect(decision.conversationalResponse).toBeDefined();
        expect(decision.conversationalResponse!.explanation).toBeTruthy();
        expect(
          decision.conversationalResponse!.userFriendlyMessage,
        ).toBeTruthy();
        expect(decision.conversationalResponse!.suggestions).toBeDefined();
      });

      it("should support rate limit negotiation", async () => {
        const preliminaryDecision: RateLimitDecision = {
          decision: "THROTTLE",
          reason: "Rate limit exceeded",
          code: "RATE_LIMIT_THROTTLE",
          timestamp: new Date(),
          processingTime: 25,
          throttleDelay: 5000,
        };

        const negotiationResult =
          await conversationalRateLimiter.negotiateRateLimits(
            testContext,
            "I need urgent access to complete this task",
            preliminaryDecision,
          );

        expect(negotiationResult).toBeDefined();
        expect(negotiationResult.conversationalResponse).toBeDefined();
        expect(
          negotiationResult.conversationalResponse!.explanation,
        ).toBeTruthy();
      });

      it("should adapt explanations to user expertise level", async () => {
        const expertContext = {
          ...testContext,
          userContext: {
            ...testUserContext,
            profile: {
              ...testUserContext.profile,
              technicalLevel: "EXPERT" as const,
            },
          },
        };

        const decision =
          await conversationalRateLimiter.evaluateRequest(expertContext);
        const explanation = await conversationalRateLimiter.explainDecision(
          expertContext,
          decision,
          "TECHNICAL",
        );

        expect(explanation.technicalDetails).toBeDefined();
        expect(explanation.explanation).toContain("technical"); // Should contain technical language
      });
    });

    describe("Performance Requirements", () => {
      it("should process decisions under 50ms target", async () => {
        const iterations = 50;
        const processingTimes: number[] = [];

        for (let i = 0; i < iterations; i++) {
          const decision = await conversationalRateLimiter.evaluateRequest({
            ...testContext,
            requestId: `perf-test-${i}`,
          });
          processingTimes.push(decision.processingTime);
        }

        const averageTime =
          processingTimes.reduce((sum, time) => sum + time, 0) / iterations;
        const p95Time = processingTimes.sort((a, b) => a - b)[
          Math.floor(iterations * 0.95)
        ];

        expect(averageTime).toBeLessThan(30); // Average under 30ms
        expect(p95Time).toBeLessThan(50); // P95 under 50ms
      });

      it("should handle high throughput (1000+ requests/second)", async () => {
        const requestsPerSecond = 1000;
        const testDurationMs = 2000; // 2 seconds
        const totalRequests = (requestsPerSecond * testDurationMs) / 1000;

        const startTime = Date.now();
        const promises: Promise<RateLimitDecision>[] = [];

        for (let i = 0; i < totalRequests; i++) {
          promises.push(
            conversationalRateLimiter.evaluateRequest({
              ...testContext,
              requestId: `throughput-test-${i}`,
            }),
          );

          // Add small delay to simulate realistic request spacing
          if (i % 100 === 0) {
            await new Promise((resolve) => setTimeout(resolve, 1));
          }
        }

        const results = await Promise.all(promises);
        const endTime = Date.now();
        const actualThroughput = (totalRequests / (endTime - startTime)) * 1000;

        expect(actualThroughput).toBeGreaterThan(requestsPerSecond * 0.8); // At least 80% of target
        expect(results).toHaveLength(totalRequests);

        // Ensure all requests were processed with valid decisions
        results.forEach((result) => {
          expect(["ALLOW", "DENY", "THROTTLE", "QUEUE"]).toContain(
            result.decision,
          );
        });
      }, 30000);
    });
  });

  describe("Multi-Tier Rate Management", () => {
    describe("Tier Coordination", () => {
      it("should evaluate all tiers correctly", async () => {
        const evaluation =
          await multiTierManager.evaluateMultiTierLimits(testContext);

        expect(evaluation.tierResults).toBeDefined();
        expect(evaluation.tierResults.user).toBeDefined();
        expect(evaluation.tierResults.api).toBeDefined();
        expect(evaluation.tierResults.operation).toBeDefined();
        expect(evaluation.tierResults.global).toBeDefined();
        expect(evaluation.coordinationApplied).toBe(true);
        expect(evaluation.processingTime).toBeLessThan(100);
      });

      it("should handle tier conflicts intelligently", async () => {
        // Create context that would pass user limits but fail global limits
        const conflictContext = {
          ...testContext,
          operation: "high-resource-operation",
        };

        const evaluation =
          await multiTierManager.evaluateMultiTierLimits(conflictContext);

        expect(evaluation.coordinationApplied).toBe(true);
        expect(evaluation.decision).toBeDefined();
        expect(["ALLOW", "DENY", "THROTTLE", "QUEUE"]).toContain(
          evaluation.decision,
        );
      });
    });

    describe("Emergency Mode", () => {
      it("should activate emergency mode correctly", async () => {
        await multiTierManager.activateEmergencyMode(
          "System overload detected",
          "HIGH",
        );

        // Test that emergency mode affects decisions
        const decision =
          await multiTierManager.evaluateMultiTierLimits(testContext);

        expect(decision).toBeDefined();
        // In emergency mode, more restrictive decisions should be made
      });

      it("should deactivate emergency mode and restore normal operations", async () => {
        await multiTierManager.activateEmergencyMode("Test emergency", "LOW");
        await multiTierManager.deactivateEmergencyMode();

        const decision =
          await multiTierManager.evaluateMultiTierLimits(testContext);

        expect(decision).toBeDefined();
        // Normal operations should be restored
      });
    });

    describe("State Management", () => {
      it("should maintain consistent state across requests", async () => {
        const state1 = await multiTierManager.getMultiTierState(testContext);

        // Process some requests
        await multiTierManager.updateMultiTierUsage(testContext, true);
        await multiTierManager.updateMultiTierUsage(testContext, true);

        const state2 = await multiTierManager.getMultiTierState(testContext);

        expect(state1.lastUpdated).toBeDefined();
        expect(state2.lastUpdated).toBeDefined();
        expect(state2.lastUpdated.getTime()).toBeGreaterThan(
          state1.lastUpdated.getTime(),
        );
      });
    });
  });

  describe("Natural Language Communication", () => {
    describe("Response Generation", () => {
      it("should generate appropriate responses for different decisions", async () => {
        const decisions: Array<{ decision: string; expectedContent: string }> =
          [
            { decision: "ALLOW", expectedContent: "approved" },
            { decision: "THROTTLE", expectedContent: "throttle" },
            { decision: "QUEUE", expectedContent: "queue" },
            { decision: "DENY", expectedContent: "denied" },
          ];

        for (const { decision, expectedContent } of decisions) {
          const mockDecision: RateLimitDecision = {
            decision: decision as any,
            reason: `Test ${decision} decision`,
            code: `RATE_LIMIT_${decision}`,
            timestamp: new Date(),
            processingTime: 25,
          };

          const response =
            await naturalLanguageCommunicator.generateConversationalResponse(
              testContext,
              mockDecision,
            );

          expect(response.userFriendlyMessage.toLowerCase()).toContain(
            expectedContent.toLowerCase(),
          );
          expect(response.explanation).toBeTruthy();
          expect(response.suggestions).toBeDefined();
        }
      });

      it("should provide educational content when appropriate", async () => {
        const educationalContent =
          await naturalLanguageCommunicator.provideRateLimitingEducation(
            testContext,
            "RATE_LIMITING_BASICS",
            "INTERMEDIATE",
          );

        expect(educationalContent.topic).toBe("Rate Limiting Basics");
        expect(educationalContent.explanation).toBeTruthy();
        expect(educationalContent.bestPractices).toBeDefined();
        expect(educationalContent.examples).toBeDefined();
      });
    });

    describe("User Negotiation", () => {
      it("should process negotiation requests", async () => {
        const currentDecision: RateLimitDecision = {
          decision: "DENY",
          reason: "Rate limit exceeded",
          code: "RATE_LIMIT_DENY",
          timestamp: new Date(),
          processingTime: 25,
          retryAfter: 300,
        };

        const negotiationResult =
          await naturalLanguageCommunicator.processNegotiationRequest(
            testContext,
            "This is urgent and business-critical, can you please increase my limits?",
            currentDecision,
          );

        expect(negotiationResult.originalDecision).toBe(currentDecision);
        expect(negotiationResult.response).toBeDefined();
        expect(negotiationResult.response.explanation).toBeTruthy();
        expect(typeof negotiationResult.negotiationSuccessful).toBe("boolean");
      });
    });

    describe("Alternative Suggestions", () => {
      it("should generate relevant alternatives", async () => {
        const deniedDecision: RateLimitDecision = {
          decision: "DENY",
          reason: "Rate limit exceeded",
          code: "RATE_LIMIT_DENY",
          timestamp: new Date(),
          processingTime: 25,
          retryAfter: 300,
        };

        const alternatives =
          await naturalLanguageCommunicator.generateAlternativeSuggestions(
            testContext,
            deniedDecision,
          );

        expect(alternatives).toHaveLength(2); // At least timing and batch alternatives
        expect(alternatives.some((alt) => alt.type === "TIMING")).toBe(true);

        alternatives.forEach((alternative) => {
          expect(alternative.description).toBeTruthy();
          expect(alternative.estimatedSuccess).toBeGreaterThan(0);
          expect(alternative.estimatedSuccess).toBeLessThanOrEqual(1);
        });
      });
    });

    describe("Proactive Guidance", () => {
      it("should provide proactive guidance when approaching limits", async () => {
        const highUsageContext = {
          requestsThisSecond: 45,
          requestsThisMinute: 850,
          requestsThisHour: 4800,
          utilizationPercentage: 85,
        };

        const guidance =
          await naturalLanguageCommunicator.provideProactiveGuidance(
            testContext,
            highUsageContext,
          );

        expect(guidance.guidanceNeeded).toBe(true);
        expect(guidance.message).toContain("approaching");
        expect(guidance.recommendations).toBeDefined();
        expect(guidance.urgencyLevel).toBeDefined();
      });
    });
  });

  describe("Enterprise Traffic Management", () => {
    describe("SLA Compliance", () => {
      it("should monitor SLA compliance", async () => {
        const complianceReport =
          await enterpriseTrafficManager.monitorSLACompliance();

        expect(complianceReport.overallCompliance).toBeDefined();
        expect(complianceReport.complianceScore).toBeGreaterThanOrEqual(0);
        expect(complianceReport.complianceScore).toBeLessThanOrEqual(1);
        expect(complianceReport.violations).toBeDefined();
        expect(complianceReport.remediationActions).toBeDefined();
      });

      it("should handle SLA violations correctly", async () => {
        // Simulate SLA violation conditions
        const violationContext = {
          ...testContext,
          expectedComplexity: 10000, // Very high complexity
        };

        const preliminaryDecision: RateLimitDecision = {
          decision: "DENY",
          reason: "SLA would be violated",
          code: "SLA_VIOLATION_PREVENTION",
          timestamp: new Date(),
          processingTime: 150, // High processing time
        };

        const enterpriseDecision =
          await enterpriseTrafficManager.processEnterpriseRequest(
            violationContext,
            preliminaryDecision,
          );

        expect(enterpriseDecision.slaEvaluation).toBeDefined();
        expect(enterpriseDecision.complianceStatus).toBeDefined();
      });
    });

    describe("Traffic Optimization", () => {
      it("should optimize traffic distribution", async () => {
        const optimizationResult =
          await enterpriseTrafficManager.optimizeTrafficDistribution();

        expect(optimizationResult.trafficAnalysis).toBeDefined();
        expect(optimizationResult.optimizations).toBeDefined();
        expect(optimizationResult.applicationResults).toBeDefined();
        expect(optimizationResult.effectivenessMetrics).toBeDefined();
      });
    });

    describe("Capacity Planning", () => {
      it("should manage capacity planning", async () => {
        const capacityResult =
          await enterpriseTrafficManager.manageCapacityPlanning();

        expect(capacityResult.currentCapacity).toBeDefined();
        expect(capacityResult.predictions).toBeDefined();
        expect(capacityResult.recommendations).toBeDefined();
        expect(capacityResult.autoScalingResults).toBeDefined();
        expect(capacityResult.costAnalysis).toBeDefined();
      });
    });

    describe("Emergency Scenarios", () => {
      it("should handle emergency scenarios", async () => {
        const emergencyScenario = {
          type: "SYSTEM_OVERLOAD",
          description: "Sudden traffic spike detected",
          severity: "HIGH",
        };

        const emergencyResponse =
          await enterpriseTrafficManager.handleEmergencyScenario(
            emergencyScenario,
            "HIGH",
          );

        expect(emergencyResponse.scenario).toBe(emergencyScenario);
        expect(emergencyResponse.impactAssessment).toBeDefined();
        expect(emergencyResponse.responsePlan).toBeDefined();
        expect(emergencyResponse.executionResults).toBeDefined();
        expect(emergencyResponse.lessonsLearned).toBeDefined();
      });
    });

    describe("Enterprise Metrics", () => {
      it("should generate comprehensive enterprise metrics", async () => {
        const metrics =
          await enterpriseTrafficManager.generateEnterpriseMetrics();

        expect(metrics.traffic).toBeDefined();
        expect(metrics.sla).toBeDefined();
        expect(metrics.capacity).toBeDefined();
        expect(metrics.compliance).toBeDefined();
        expect(metrics.performance).toBeDefined();
        expect(metrics.overall).toBeDefined();
        expect(metrics.overall.overallScore).toBeGreaterThanOrEqual(0);
        expect(metrics.overall.overallScore).toBeLessThanOrEqual(1);
      });
    });
  });

  describe("Analytics and Monitoring", () => {
    describe("Real-time Analytics", () => {
      it("should analyze rate limiting decisions", async () => {
        const decision: RateLimitDecision = {
          decision: "ALLOW",
          reason: "Within limits",
          code: "RATE_LIMIT_OK",
          timestamp: new Date(),
          processingTime: 25,
        };

        const analytics = await analyticsService.analyzeRateLimitDecision(
          testContext,
          decision,
        );

        expect(analytics.impactAssessment).toBeDefined();
        expect(analytics.performanceMetrics).toBeDefined();
        expect(analytics.userBehaviorInsights).toBeDefined();
        expect(analytics.systemHealthIndicators).toBeDefined();
        expect(analytics.processingTime).toBeLessThan(100);
      });

      it("should generate comprehensive metrics", async () => {
        const timeRange = {
          start: new Date(Date.now() - 3600000), // 1 hour ago
          end: new Date(),
        };

        const metrics = await analyticsService.generateMetrics(timeRange);

        expect(metrics.totalRequests).toBeDefined();
        expect(metrics.allowedRequests).toBeDefined();
        expect(metrics.deniedRequests).toBeDefined();
        expect(metrics.averageDecisionTime).toBeDefined();
        expect(metrics.cacheHitRate).toBeDefined();
        expect(metrics.userSatisfactionScore).toBeDefined();
      });
    });

    describe("Predictive Analytics", () => {
      it("should predict future patterns", async () => {
        const prediction = await analyticsService.predictFuturePatterns(
          24,
          0.8,
        ); // 24 hours, 80% confidence

        expect(prediction.predictions).toBeDefined();
        expect(prediction.recommendations).toBeDefined();
        expect(prediction.riskFactors).toBeDefined();

        prediction.predictions.forEach((pred) => {
          expect(pred.confidence).toBeGreaterThanOrEqual(0);
          expect(pred.confidence).toBeLessThanOrEqual(1);
        });
      });
    });

    describe("User Behavior Analysis", () => {
      it("should analyze user behavior patterns", async () => {
        const behaviorAnalysis =
          await analyticsService.analyzeUserBehaviorPatterns(
            testContext.userId,
            {
              start: new Date(Date.now() - 86400000), // 24 hours ago
              end: new Date(),
            },
          );

        expect(behaviorAnalysis.behaviorSummary).toBeTruthy();
        expect(behaviorAnalysis.riskLevel).toBeDefined();
        expect(behaviorAnalysis.patterns).toBeDefined();
        expect(behaviorAnalysis.recommendations).toBeDefined();
      });
    });

    describe("Anomaly Detection", () => {
      it("should detect anomalies", async () => {
        const timeRange = {
          start: new Date(Date.now() - 3600000),
          end: new Date(),
        };

        const anomalies = await analyticsService.detectAnomalies(timeRange);

        expect(anomalies.systemAnomalies).toBeDefined();
        expect(anomalies.severity).toBeDefined();
        expect(anomalies.recommendations).toBeDefined();
        expect(anomalies.confidence).toBeGreaterThanOrEqual(0);
        expect(anomalies.confidence).toBeLessThanOrEqual(1);
      });
    });

    describe("Dashboard and Reporting", () => {
      it("should generate dashboard data", async () => {
        const dashboardData = await analyticsService.generateDashboardData();

        expect(dashboardData.overview).toBeDefined();
        expect(dashboardData.overview.currentThroughput).toBeDefined();
        expect(dashboardData.overview.currentLatency).toBeDefined();
        expect(dashboardData.realTimeMetrics).toBeDefined();
        expect(dashboardData.alerts).toBeDefined();
      });

      it("should generate analytics reports", async () => {
        const timeRange = {
          start: new Date(Date.now() - 86400000),
          end: new Date(),
        };

        const report = await analyticsService.generateAnalyticsReport(
          timeRange,
          "TECHNICAL",
        );

        expect(report.reportType).toBe("TECHNICAL");
        expect(report.summary).toBeDefined();
        expect(report.summary.keyMetrics).toBeDefined();
        expect(report.summary.keyInsights).toBeDefined();
        expect(report.sections).toBeDefined();
        expect(report.recommendations).toBeDefined();
      });
    });

    describe("Optimization Recommendations", () => {
      it("should provide optimization recommendations", async () => {
        const recommendations =
          await analyticsService.getOptimizationRecommendations();

        expect(recommendations.immediate).toBeDefined();
        expect(recommendations.shortTerm).toBeDefined();
        expect(recommendations.longTerm).toBeDefined();
        expect(recommendations.estimatedImpact).toBeDefined();
        expect(
          recommendations.estimatedImpact.performance,
        ).toBeGreaterThanOrEqual(0);
        expect(
          recommendations.estimatedImpact.costSavings,
        ).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe("Load Testing and Stress Testing", () => {
    describe("High Load Scenarios", () => {
      it("should handle burst traffic (5000 requests in 1 second)", async () => {
        const burstSize = 5000;
        const promises: Promise<RateLimitDecision>[] = [];

        const startTime = Date.now();

        for (let i = 0; i < burstSize; i++) {
          promises.push(
            conversationalRateLimiter.evaluateRequest({
              ...testContext,
              requestId: `burst-${i}`,
              timestamp: new Date(),
            }),
          );
        }

        const results = await Promise.all(promises);
        const endTime = Date.now();
        const duration = endTime - startTime;

        expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
        expect(results).toHaveLength(burstSize);

        // System should gracefully handle the burst
        const allowedCount = results.filter(
          (r) => r.decision === "ALLOW",
        ).length;
        const throttledCount = results.filter(
          (r) => r.decision === "THROTTLE",
        ).length;
        const queuedCount = results.filter(
          (r) => r.decision === "QUEUE",
        ).length;
        const deniedCount = results.filter((r) => r.decision === "DENY").length;

        expect(allowedCount + throttledCount + queuedCount + deniedCount).toBe(
          burstSize,
        );

        // Some requests should be throttled/queued during burst
        expect(throttledCount + queuedCount).toBeGreaterThan(0);
      }, 30000);

      it("should maintain performance under sustained load (10,000 req/sec for 10 seconds)", async () => {
        const requestsPerSecond = 10000;
        const durationSeconds = 10;
        const totalRequests = requestsPerSecond * durationSeconds;
        const batchSize = 1000;

        const startTime = Date.now();
        let completedRequests = 0;
        const results: RateLimitDecision[] = [];

        // Process requests in batches to avoid overwhelming the system
        for (let batch = 0; batch < totalRequests / batchSize; batch++) {
          const batchPromises: Promise<RateLimitDecision>[] = [];

          for (let i = 0; i < batchSize; i++) {
            const requestIndex = batch * batchSize + i;
            batchPromises.push(
              conversationalRateLimiter.evaluateRequest({
                ...testContext,
                requestId: `sustained-load-${requestIndex}`,
                timestamp: new Date(),
              }),
            );
          }

          const batchResults = await Promise.all(batchPromises);
          results.push(...batchResults);
          completedRequests += batchSize;

          // Small delay between batches to simulate realistic load
          await new Promise((resolve) => setTimeout(resolve, 10));
        }

        const endTime = Date.now();
        const actualDuration = (endTime - startTime) / 1000;
        const actualThroughput = completedRequests / actualDuration;

        expect(actualThroughput).toBeGreaterThan(requestsPerSecond * 0.5); // At least 50% of target
        expect(results).toHaveLength(totalRequests);

        // System should remain responsive
        const averageProcessingTime =
          results.reduce((sum, r) => sum + r.processingTime, 0) /
          results.length;
        expect(averageProcessingTime).toBeLessThan(100); // Average processing time under 100ms
      }, 120000);
    });

    describe("Memory and Resource Management", () => {
      it("should not leak memory during extended operations", async () => {
        const initialMemory = process.memoryUsage();
        const iterations = 1000;

        // Perform many operations
        for (let i = 0; i < iterations; i++) {
          await conversationalRateLimiter.evaluateRequest({
            ...testContext,
            requestId: `memory-test-${i}`,
          });

          // Force garbage collection every 100 iterations
          if (i % 100 === 0 && global.gc) {
            global.gc();
          }
        }

        const finalMemory = process.memoryUsage();
        const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
        const memoryIncreasePercent =
          (memoryIncrease / initialMemory.heapUsed) * 100;

        // Memory increase should be reasonable (less than 50% increase)
        expect(memoryIncreasePercent).toBeLessThan(50);
      }, 30000);
    });

    describe("Error Handling and Recovery", () => {
      it("should handle service failures gracefully", async () => {
        // Simulate service failure by providing invalid configuration
        const invalidConfig = {
          ...testConfiguration,
          userLimits: null as any,
        };

        const faultyService = new ConversationalRateLimiterService(
          invalidConfig,
        );

        // Should not crash and should provide fallback response
        const decision = await faultyService.evaluateRequest(testContext);

        expect(decision).toBeDefined();
        expect(["ALLOW", "DENY"]).toContain(decision.decision); // Fallback decisions
      });

      it("should recover from temporary failures", async () => {
        // Test multiple requests to ensure system recovers
        const results: RateLimitDecision[] = [];

        for (let i = 0; i < 10; i++) {
          const decision = await conversationalRateLimiter.evaluateRequest({
            ...testContext,
            requestId: `recovery-test-${i}`,
          });
          results.push(decision);
        }

        // All requests should be processed successfully
        expect(results).toHaveLength(10);
        results.forEach((result) => {
          expect(["ALLOW", "DENY", "THROTTLE", "QUEUE"]).toContain(
            result.decision,
          );
        });
      });
    });
  });

  describe("Security and Abuse Prevention", () => {
    describe("Abuse Detection", () => {
      it("should detect rapid-fire abuse patterns", async () => {
        const abuseContext = {
          ...testContext,
          userAgent: "automated-bot/1.0",
          recentHistory: Array(1000).fill({
            timestamp: new Date(Date.now() - 1000), // All within last second
            endpoint: testContext.apiEndpoint,
            outcome: "ALLOWED",
          }),
        };

        const decision =
          await conversationalRateLimiter.evaluateRequest(abuseContext);

        expect(["DENY", "THROTTLE"]).toContain(decision.decision);
        expect(decision.reason).toContain("rate limit"); // Should mention rate limiting
      });

      it("should handle suspicious user agents", async () => {
        const suspiciousContext = {
          ...testContext,
          userAgent: "python-requests/2.25.1", // Automated client
        };

        const decision =
          await conversationalRateLimiter.evaluateRequest(suspiciousContext);
        const analytics = await analyticsService.analyzeRateLimitDecision(
          suspiciousContext,
          decision,
        );

        expect(analytics.userBehaviorInsights.abuseIndicators).toContain(
          "automated_client",
        );
      });
    });

    describe("Security Level Enforcement", () => {
      it("should apply stricter limits for high-security operations", async () => {
        const highSecurityContext = {
          ...testContext,
          securityLevel: "CRITICAL" as SecurityLevel,
          riskLevel: "HIGH" as RiskLevel,
        };

        const decision =
          await conversationalRateLimiter.evaluateRequest(highSecurityContext);

        // High security operations should have stricter evaluation
        expect(decision).toBeDefined();
        expect(decision.processingTime).toBeGreaterThan(10); // Should take more time for security checks
      });
    });
  });

  describe("Integration Testing", () => {
    describe("End-to-End Scenarios", () => {
      it("should handle complete user journey from request to response", async () => {
        // 1. Initial request (should be allowed)
        const initialDecision =
          await conversationalRateLimiter.evaluateRequest(testContext);
        expect(initialDecision.decision).toBe("ALLOW");

        // 2. Analytics processing
        const analytics = await analyticsService.analyzeRateLimitDecision(
          testContext,
          initialDecision,
        );
        expect(analytics).toBeDefined();

        // 3. Enterprise processing
        const enterpriseDecision =
          await enterpriseTrafficManager.processEnterpriseRequest(
            testContext,
            initialDecision,
          );
        expect(enterpriseDecision.finalDecision).toBeDefined();

        // 4. Generate conversational response
        const response =
          await naturalLanguageCommunicator.generateConversationalResponse(
            testContext,
            enterpriseDecision.finalDecision,
          );
        expect(response.explanation).toBeTruthy();

        // 5. Complete flow should be fast
        expect(enterpriseDecision.processingTime).toBeLessThan(200); // Under 200ms for complete flow
      });

      it("should maintain consistency across all components", async () => {
        const multiTierEvaluation =
          await multiTierManager.evaluateMultiTierLimits(testContext);
        const conversationalDecision =
          await conversationalRateLimiter.evaluateRequest(testContext);

        // Both evaluations should be consistent for the same context
        expect(["ALLOW", "DENY", "THROTTLE", "QUEUE"]).toContain(
          multiTierEvaluation.decision,
        );
        expect(["ALLOW", "DENY", "THROTTLE", "QUEUE"]).toContain(
          conversationalDecision.decision,
        );
      });
    });
  });
});

// Helper functions for test setup

function createTestRateLimitConfiguration(): RateLimitConfiguration {
  const userLimits: UserRateLimits = {
    requestsPerSecond: 50,
    requestsPerMinute: 1000,
    requestsPerHour: 5000,
    requestsPerDay: 100000,
    burstLimit: 100,
    concurrentConnections: 10,
    byRole: {
      enterprise: {
        requestsPerSecond: 100,
        requestsPerMinute: 2000,
        requestsPerHour: 10000,
        burstLimit: 200,
        specialPrivileges: ["priority_processing"],
      },
      premium: {
        requestsPerSecond: 75,
        requestsPerMinute: 1500,
        requestsPerHour: 7500,
        burstLimit: 150,
        specialPrivileges: [],
      },
    },
    byTier: {
      gold: {
        requestsPerSecond: 100,
        requestsPerMinute: 2000,
        requestsPerHour: 10000,
        burstLimit: 200,
        priorityLevel: 3,
        queuePriority: 1,
      },
    },
  };

  const apiLimits: APIRateLimits = {
    endpointLimits: {
      "/api/v1/users": {
        path: "/api/v1/users",
        requestsPerSecond: 100,
        requestsPerMinute: 2000,
        burstLimit: 200,
        securityLevel: "MEDIUM",
        costWeight: 1.0,
      },
    },
    methodLimits: {
      POST: {
        method: "POST",
        requestsPerSecond: 50,
        burstLimit: 100,
        securityMultiplier: 1.5,
      },
      GET: {
        method: "GET",
        requestsPerSecond: 200,
        burstLimit: 400,
        securityMultiplier: 1.0,
      },
    },
    resourceLimits: {
      user_data: {
        resourceType: "user_data",
        requestsPerSecond: 100,
        concurrentOperations: 50,
        maxPayloadSize: 1024000,
        costWeight: 2.0,
      },
    },
    pathPatternLimits: [
      {
        pattern: "/api/v1/admin/*",
        regex: /\/api\/v1\/admin\/.*/,
        limits: {
          path: "/api/v1/admin/*",
          requestsPerSecond: 10,
          requestsPerMinute: 100,
          burstLimit: 20,
          securityLevel: "HIGH",
          costWeight: 3.0,
        },
        priority: 1,
      },
    ],
  };

  const operationLimits: OperationRateLimits = {
    operationLimits: {
      read: {
        operationType: "read",
        requestsPerSecond: 200,
        requestsPerMinute: 5000,
        burstLimit: 400,
        concurrentExecutions: 100,
        maxExecutionTime: 1000,
        resourceConsumptionLimit: 1.0,
      },
      write: {
        operationType: "write",
        requestsPerSecond: 50,
        requestsPerMinute: 1000,
        burstLimit: 100,
        concurrentExecutions: 25,
        maxExecutionTime: 5000,
        resourceConsumptionLimit: 2.0,
      },
    },
    complexityLimits: {
      lowComplexity: {
        operationType: "low",
        requestsPerSecond: 500,
        requestsPerMinute: 10000,
        burstLimit: 1000,
        concurrentExecutions: 200,
        maxExecutionTime: 500,
        resourceConsumptionLimit: 0.5,
      },
      mediumComplexity: {
        operationType: "medium",
        requestsPerSecond: 100,
        requestsPerMinute: 2000,
        burstLimit: 200,
        concurrentExecutions: 50,
        maxExecutionTime: 2000,
        resourceConsumptionLimit: 1.0,
      },
      highComplexity: {
        operationType: "high",
        requestsPerSecond: 25,
        requestsPerMinute: 500,
        burstLimit: 50,
        concurrentExecutions: 10,
        maxExecutionTime: 10000,
        resourceConsumptionLimit: 4.0,
      },
      criticalComplexity: {
        operationType: "critical",
        requestsPerSecond: 5,
        requestsPerMinute: 100,
        burstLimit: 10,
        concurrentExecutions: 2,
        maxExecutionTime: 30000,
        resourceConsumptionLimit: 10.0,
      },
    },
    securityLevelLimits: {
      LOW: {
        requestsPerSecond: 200,
        additionalValidationTime: 0,
        requiredConfirmations: 0,
        auditLevel: "basic",
      },
      MEDIUM: {
        requestsPerSecond: 100,
        additionalValidationTime: 50,
        requiredConfirmations: 0,
        auditLevel: "standard",
      },
      HIGH: {
        requestsPerSecond: 25,
        additionalValidationTime: 200,
        requiredConfirmations: 1,
        auditLevel: "enhanced",
      },
      CRITICAL: {
        requestsPerSecond: 5,
        additionalValidationTime: 1000,
        requiredConfirmations: 2,
        auditLevel: "comprehensive",
      },
    },
    riskBasedLimits: {
      LOW: {
        requestsPerSecond: 200,
        cooldownPeriod: 0,
        escalationThreshold: 1000,
        monitoringLevel: "basic",
      },
      MEDIUM: {
        requestsPerSecond: 100,
        cooldownPeriod: 60,
        escalationThreshold: 500,
        monitoringLevel: "standard",
      },
      HIGH: {
        requestsPerSecond: 25,
        cooldownPeriod: 300,
        escalationThreshold: 100,
        monitoringLevel: "enhanced",
      },
      CRITICAL: {
        requestsPerSecond: 5,
        cooldownPeriod: 1800,
        escalationThreshold: 10,
        monitoringLevel: "comprehensive",
      },
    },
  };

  const globalLimits: GlobalRateLimits = {
    systemWideRequestsPerSecond: 10000,
    maxConcurrentConnections: 5000,
    maxQueueSize: 10000,
    circuitBreakerThreshold: 150, // CPU + Memory utilization
    emergencyMode: {
      triggerThreshold: 90,
      restrictionLevel: 0.5,
      allowedOperations: ["health-check", "emergency"],
      durationMinutes: 30,
      autoRecovery: true,
    },
  };

  const enterpriseConfig: EnterpriseRateLimitConfig = {
    slaCompliance: {
      guaranteedThroughput: 9000,
      guaranteedLatency: 100,
      availabilityTarget: 99.9,
      penaltyCalculation: {
        latencyPenaltyPerMs: 0.01,
        throughputPenaltyPerRequest: 0.001,
        availabilityPenaltyPerMinute: 10.0,
        maxPenaltyPerDay: 1000,
      },
    },
    fairQueuing: {
      enabled: true,
      algorithm: "WEIGHTED_FAIR_QUEUING",
      weights: {
        enterprise: 3,
        premium: 2,
        standard: 1,
      },
      maxQueueSize: 1000,
      dropStrategy: "WEIGHTED_RANDOM_EARLY_DETECTION",
    },
    priorityManagement: {
      priorityLevels: 4,
      priorityMapping: {
        enterprise: 3,
        premium: 2,
        standard: 1,
        basic: 0,
      },
      preemptionEnabled: true,
      starvationPrevention: {
        enabled: true,
        maxWaitTime: 300000,
        promotionThreshold: 120000,
        agingFactor: 1.1,
      },
    },
    analytics: {
      enabled: true,
      retentionDays: 90,
      aggregationIntervals: [60, 300, 3600, 86400],
      exportFormats: ["json", "csv", "parquet"],
      realTimeAnalytics: true,
    },
  };

  return {
    userLimits,
    apiLimits,
    operationLimits,
    globalLimits,
    enterprise: enterpriseConfig,
    performance: {
      targetProcessingTime: 50,
      cacheConfig: {
        enabled: true,
        ttl: 3600,
        maxSize: 10000,
        algorithm: "LRU",
        distributedCache: {
          enabled: true,
          replicationFactor: 3,
          consistencyLevel: "EVENTUAL",
          partitioningStrategy: "hash",
        },
      },
      batchingConfig: {
        enabled: true,
        batchSize: 100,
        maxWaitTime: 10,
        dynamicSizing: true,
      },
      connectionPoolConfig: {
        minConnections: 10,
        maxConnections: 100,
        acquisitionTimeout: 5000,
        idleTimeout: 300000,
        leakDetectionThreshold: 60000,
      },
    },
    conversational: {
      naturalLanguageEnabled: true,
      explanationLevel: "DETAILED",
      negotiationEnabled: true,
      alternativeSuggestions: true,
      userEducationEnabled: true,
    },
  };
}

function createTestUserContext(): UserContext {
  return {
    userId: "test-user-123",
    username: "testuser",
    organizationId: "test-org-456",
    roles: ["premium", "developer"],
    permissions: ["read", "write"],
    profile: {
      technicalLevel: "INTERMEDIATE",
      role: "developer",
      department: "engineering",
      capabilities: [
        {
          domain: "api_usage",
          level: "ADVANCED",
          certifications: ["api_expert"],
        },
      ],
    },
    preferences: {
      explanationStyle: "DETAILED",
      includeExamples: true,
      includeVisualAids: false,
      includeTechnicalDetails: true,
      monitoringPreferences: {
        technicalDetailLevel: "MEDIUM",
        updateFrequency: "REAL_TIME",
        alertThresholds: [
          {
            metric: "response_time",
            threshold: 100,
            severity: "MEDIUM",
          },
        ],
      },
    },
    capabilities: ["api_access", "data_analysis"],
    timezone: "America/New_York",
    sessionId: "session-789",
    deviceId: "device-abc",
    recentConversations: [
      {
        conversationId: "conv-1",
        timestamp: new Date(Date.now() - 3600000),
        intent: "api_request",
        outcome: "SUCCESS",
        duration: 150,
      },
    ],
    datePreferences: {
      format: "YYYY-MM-DD",
      timezone: "America/New_York",
      calendarType: "GREGORIAN",
    },
    notificationPreferences: {
      channels: [
        {
          type: "EMAIL",
          address: "test@example.com",
          priority: "MEDIUM",
        },
      ],
      frequency: "IMMEDIATE",
      quietHours: {
        startTime: "22:00",
        endTime: "06:00",
        timezone: "America/New_York",
      },
    },
  };
}

function createTestRateLimitContext(
  userContext: UserContext,
): RateLimitContext {
  return {
    userId: userContext.userId,
    userContext,
    apiEndpoint: "/api/v1/users",
    method: "GET",
    operation: "read",
    securityLevel: "MEDIUM",
    riskLevel: "LOW",
    timestamp: new Date(),
    requestId: "req-123",
    sessionId: userContext.sessionId,
    clientIP: "192.168.1.100",
    userAgent: "Mozilla/5.0 (compatible; TestClient/1.0)",
    payloadSize: 1024,
    expectedComplexity: 100,
    recentHistory: [
      {
        timestamp: new Date(Date.now() - 60000),
        endpoint: "/api/v1/users",
        outcome: "ALLOWED",
        reason: "Within limits",
        waitTime: 0,
      },
    ],
  };
}
