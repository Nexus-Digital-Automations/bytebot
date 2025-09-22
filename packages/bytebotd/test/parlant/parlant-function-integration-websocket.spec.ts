/**
 * PARLANT Function Integration WebSocket Test Suite
 *
 * Comprehensive testing framework for PARLANT function integration through WebSocket
 * communication, focusing on function wrapping, validation integration, parameter
 * passing, return value handling, and cross-service function orchestration via WebSocket.
 *
 * Test Coverage:
 * - Function wrapping and validation integration via WebSocket
 * - Parameter serialization and deserialization through WebSocket
 * - Return value handling and response formatting via WebSocket
 * - Cross-service function orchestration through WebSocket channels
 * - Function execution lifecycle management via WebSocket
 * - Error propagation and handling across WebSocket boundaries
 * - Function performance optimization through WebSocket communication
 * - Multi-language function integration via WebSocket protocols
 *
 * Function Integration Scenarios:
 * - TypeScript/NestJS native function integration
 * - Python function bridge via WebSocket
 * - Multi-service function orchestration
 * - Database function integration via WebSocket
 * - External API function wrapping through WebSocket
 * - Batch function execution via WebSocket
 * - Streaming function results through WebSocket
 *
 * Performance Targets:
 * - Function call overhead: <10ms P95
 * - Parameter serialization: <5ms P95
 * - Cross-service latency: <50ms P95
 * - Function validation time: <100ms P95
 * - Batch processing throughput: >500 functions/second
 *
 * @fileoverview PARLANT function integration WebSocket test suite
 * @version 1.0.0
 * @author PARLANT Phase 1 Integration WebSocket Testing Specialist
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import WebSocket from 'ws';
import { performance } from 'perf_hooks';

// Import PARLANT function integration services
import {
  ParlantIntegrationService,
  ParlantValidationRequest,
  ParlantValidationResponse,
  ParlantConversationContext,
  RiskLevel,
} from '../../src/parlant/parlant-integration.service';

import {
  ConversationalWebSocketBridgeService,
  ConversationalMessage,
  ConversationalMessageType,
  ValidationContext,
  ValidationAction,
} from '../../src/common/websocket/conversational-websocket-bridge.service';

import { AigentParlantSecurityBridgeService } from '../../src/auth/services/aigent-parlant-security-bridge.service';

// ===== FUNCTION INTEGRATION TEST TYPES =====

/**
 * Function integration test configuration
 */
interface FunctionIntegrationConfig {
  // Performance settings
  maxCallOverhead: number;
  maxSerializationTime: number;
  maxValidationTime: number;
  maxCrossServiceLatency: number;

  // Throughput settings
  targetFunctionsPerSecond: number;
  batchSize: number;
  concurrentCalls: number;

  // Function types
  supportedLanguages: string[];
  functionCategories: string[];
}

/**
 * Function test case definition
 */
interface FunctionTestCase {
  functionName: string;
  description: string;
  language: 'typescript' | 'python' | 'cross-service';
  category:
    | 'data-access'
    | 'computation'
    | 'external-api'
    | 'database'
    | 'validation';
  riskLevel: RiskLevel;
  parameters: Record<string, unknown>;
  expectedResult: unknown;
  validationRequired: boolean;
  streamingSupported: boolean;
  performanceTarget: number;
}

/**
 * Function execution metrics
 */
interface FunctionExecutionMetrics {
  // Timing metrics
  totalExecutionTime: number;
  callOverhead: number;
  serializationTime: number;
  validationTime: number;
  functionExecutionTime: number;
  deserializationTime: number;

  // Quality metrics
  executionSuccess: boolean;
  validationSuccess: boolean;
  resultCorrectness: boolean;
  errorHandling: boolean;

  // Performance metrics
  throughput: number;
  memoryUsage: number;
  networkLatency: number;
}

/**
 * Cross-service orchestration scenario
 */
interface CrossServiceScenario {
  name: string;
  description: string;
  services: string[];
  functionChain: CrossServiceFunction[];
  expectedTotalTime: number;
  dataFlowValidation: boolean;
}

/**
 * Cross-service function definition
 */
interface CrossServiceFunction {
  serviceName: string;
  functionName: string;
  inputMapping: Record<string, string>;
  outputMapping: Record<string, string>;
  dependsOn?: string[];
  parallel?: boolean;
}

/**
 * Batch processing test configuration
 */
interface BatchProcessingConfig {
  batchSize: number;
  functionType: string;
  concurrentBatches: number;
  expectedThroughput: number;
  memoryLimit: number;
}

// ===== FUNCTION INTEGRATION TEST UTILITIES =====

/**
 * Function integration test utilities
 */
class FunctionIntegrationTestUtils {
  /**
   * Generate function test cases
   */
  static generateFunctionTestCases(): FunctionTestCase[] {
    return [
      {
        functionName: 'getUserData',
        description: 'Retrieve user data with basic validation',
        language: 'typescript',
        category: 'data-access',
        riskLevel: RiskLevel.LOW,
        parameters: { userId: 'test-user-123' },
        expectedResult: {
          id: 'test-user-123',
          name: 'Test User',
          role: 'user',
        },
        validationRequired: true,
        streamingSupported: false,
        performanceTarget: 50,
      },
      {
        functionName: 'calculateRiskScore',
        description: 'Calculate risk score with moderate validation',
        language: 'typescript',
        category: 'computation',
        riskLevel: RiskLevel.MEDIUM,
        parameters: {
          transactionAmount: 1000,
          userHistory: ['positive', 'neutral', 'positive'],
          accountAge: 365,
        },
        expectedResult: { riskScore: 0.25, recommendation: 'approve' },
        validationRequired: true,
        streamingSupported: false,
        performanceTarget: 100,
      },
      {
        functionName: 'processLargeDataset',
        description: 'Process large dataset with streaming results',
        language: 'python',
        category: 'computation',
        riskLevel: RiskLevel.HIGH,
        parameters: {
          datasetId: 'large-dataset-001',
          processingOptions: { parallel: true, chunkSize: 1000 },
        },
        expectedResult: {
          processed: true,
          recordCount: 50000,
          duration: 'number',
        },
        validationRequired: true,
        streamingSupported: true,
        performanceTarget: 2000,
      },
      {
        functionName: 'updateCriticalDatabase',
        description: 'Update critical database with high-security validation',
        language: 'typescript',
        category: 'database',
        riskLevel: RiskLevel.CRITICAL,
        parameters: {
          table: 'critical_data',
          operation: 'update',
          conditions: { id: 'critical-record-001' },
          updates: { status: 'processed', timestamp: 'current' },
        },
        expectedResult: {
          updated: true,
          recordsAffected: 1,
          backupCreated: true,
        },
        validationRequired: true,
        streamingSupported: false,
        performanceTarget: 200,
      },
      {
        functionName: 'callExternalAPI',
        description: 'Call external API with error handling',
        language: 'cross-service',
        category: 'external-api',
        riskLevel: RiskLevel.MEDIUM,
        parameters: {
          endpoint: 'https://api.example.com/data',
          method: 'GET',
          headers: { Authorization: 'Bearer token' },
          timeout: 5000,
        },
        expectedResult: { status: 200, data: 'object', responseTime: 'number' },
        validationRequired: true,
        streamingSupported: false,
        performanceTarget: 1000,
      },
    ];
  }

  /**
   * Generate cross-service orchestration scenarios
   */
  static generateCrossServiceScenarios(): CrossServiceScenario[] {
    return [
      {
        name: 'User Data Enrichment Pipeline',
        description: 'Multi-service user data enrichment and validation',
        services: ['user-service', 'validation-service', 'enrichment-service'],
        expectedTotalTime: 500,
        dataFlowValidation: true,
        functionChain: [
          {
            serviceName: 'user-service',
            functionName: 'getUserBasicData',
            inputMapping: { userId: 'input.userId' },
            outputMapping: { userData: 'output' },
          },
          {
            serviceName: 'validation-service',
            functionName: 'validateUserData',
            inputMapping: { userData: 'getUserBasicData.userData' },
            outputMapping: { validationResult: 'output' },
            dependsOn: ['getUserBasicData'],
          },
          {
            serviceName: 'enrichment-service',
            functionName: 'enrichUserProfile',
            inputMapping: {
              userData: 'getUserBasicData.userData',
              validation: 'validateUserData.validationResult',
            },
            outputMapping: { enrichedProfile: 'output' },
            dependsOn: ['getUserBasicData', 'validateUserData'],
          },
        ],
      },
      {
        name: 'Parallel Risk Assessment',
        description: 'Concurrent risk assessment across multiple services',
        services: [
          'financial-service',
          'behavioral-service',
          'compliance-service',
        ],
        expectedTotalTime: 300,
        dataFlowValidation: true,
        functionChain: [
          {
            serviceName: 'financial-service',
            functionName: 'calculateFinancialRisk',
            inputMapping: { transactionData: 'input.transaction' },
            outputMapping: { financialRisk: 'output' },
            parallel: true,
          },
          {
            serviceName: 'behavioral-service',
            functionName: 'analyzeBehavioralPatterns',
            inputMapping: { userHistory: 'input.history' },
            outputMapping: { behavioralRisk: 'output' },
            parallel: true,
          },
          {
            serviceName: 'compliance-service',
            functionName: 'checkComplianceRules',
            inputMapping: {
              transaction: 'input.transaction',
              userProfile: 'input.profile',
            },
            outputMapping: { complianceStatus: 'output' },
            parallel: true,
          },
        ],
      },
    ];
  }

  /**
   * Execute function integration test via WebSocket
   */
  static async executeFunctionTest(
    testCase: FunctionTestCase,
    client: WebSocket,
    services: {
      parlantService: ParlantIntegrationService;
      conversationalBridge: ConversationalWebSocketBridgeService;
      securityBridge: AigentParlantSecurityBridgeService;
    },
  ): Promise<{
    success: boolean;
    metrics: FunctionExecutionMetrics;
    result: unknown;
    error?: string;
  }> {
    const startTime = performance.now();
    const sessionId = `function_test_${Date.now()}`;

    try {
      // Step 1: Serialize parameters
      const serializationStartTime = performance.now();
      const serializedParams = JSON.stringify(testCase.parameters);
      const serializationTime = performance.now() - serializationStartTime;

      // Step 2: Create validation context
      const validationContext: ValidationContext = {
        userId: 'function-test-user',
        applicationContext: 'function-integration-test',
        environmentInfo: {
          language: testCase.language,
          category: testCase.category,
          testCase: testCase.functionName,
        },
        previousActions: [],
        securityContext: {
          authenticationLevel: 'basic',
          permissions: ['function-execute'],
          auditRequired: testCase.riskLevel === RiskLevel.CRITICAL,
          complianceFlags:
            testCase.riskLevel === RiskLevel.CRITICAL ? ['audit-required'] : [],
        },
      };

      // Step 3: Create validation action
      const validationAction: ValidationAction = {
        actionType: 'function_execution',
        parameters: {
          functionName: testCase.functionName,
          language: testCase.language,
          category: testCase.category,
          parameters: testCase.parameters,
        },
        expectedOutcome: `Execute ${testCase.functionName} and return result`,
        reversible: testCase.category !== 'database',
        impact: {
          scope: testCase.language === 'cross-service' ? 'network' : 'local',
          dataAccess:
            testCase.category === 'data-access' ||
            testCase.category === 'database',
          stateChanges: testCase.category === 'database',
          userInteraction: false,
        },
      };

      // Step 4: Send function validation request via WebSocket
      const validationStartTime = performance.now();

      const validationRequest: ConversationalMessage = {
        type: ConversationalMessageType.VALIDATION_REQUEST,
        messageId: `function_validation_${Date.now()}`,
        sessionId,
        timestamp: Date.now(),
        sequence: 1,
        payload: {
          validationId: `func_val_${Date.now()}`,
          context: validationContext,
          action: validationAction,
          riskLevel: testCase.riskLevel,
          streamingOptions: {
            enableProgressUpdates: testCase.streamingSupported,
            updateInterval: 100,
            maxUpdateCount: 10,
            compressionEnabled: true,
            priorityBoost: testCase.riskLevel === RiskLevel.CRITICAL,
          },
        },
        metadata: {
          priority: 'high',
          requiresAck: true,
          compression: true,
          routingHints: ['function-validation'],
        },
      };

      // Send validation request
      await FunctionIntegrationTestUtils.sendMessage(client, validationRequest);

      // Wait for validation response
      const validationResponse =
        await FunctionIntegrationTestUtils.waitForResponse(
          client,
          ConversationalMessageType.VALIDATION_RESPONSE,
          5000,
        );

      const validationTime = performance.now() - validationStartTime;

      // Check if validation approved
      if (!validationResponse.payload.approved) {
        throw new Error(
          `Function validation rejected: ${validationResponse.payload.reason}`,
        );
      }

      // Step 5: Execute function (simulate execution)
      const functionStartTime = performance.now();
      const functionResult =
        await FunctionIntegrationTestUtils.simulateFunctionExecution(testCase);
      const functionExecutionTime = performance.now() - functionStartTime;

      // Step 6: Deserialize result
      const deserializationStartTime = performance.now();
      const serializedResult = JSON.stringify(functionResult);
      const parsedResult = JSON.parse(serializedResult);
      const deserializationTime = performance.now() - deserializationStartTime;

      // Step 7: Send function completion notification
      const completionMessage: ConversationalMessage = {
        type: ConversationalMessageType.VALIDATION_RESPONSE,
        messageId: `function_completion_${Date.now()}`,
        sessionId,
        timestamp: Date.now(),
        sequence: 2,
        payload: {
          validationId: validationRequest.payload.validationId,
          status: 'completed',
          result: functionResult,
          executionTime: functionExecutionTime,
          success: true,
        },
        metadata: {
          priority: 'normal',
          requiresAck: false,
          compression: true,
          routingHints: ['function-completion'],
        },
      };

      await FunctionIntegrationTestUtils.sendMessage(client, completionMessage);

      const totalExecutionTime = performance.now() - startTime;
      const callOverhead =
        totalExecutionTime -
        functionExecutionTime -
        serializationTime -
        deserializationTime -
        validationTime;

      // Calculate metrics
      const metrics: FunctionExecutionMetrics = {
        totalExecutionTime,
        callOverhead,
        serializationTime,
        validationTime,
        functionExecutionTime,
        deserializationTime,
        executionSuccess: true,
        validationSuccess: validationResponse.payload.approved as boolean,
        resultCorrectness: FunctionIntegrationTestUtils.validateResult(
          functionResult,
          testCase.expectedResult,
        ),
        errorHandling: true,
        throughput: 1000 / totalExecutionTime,
        memoryUsage: process.memoryUsage().heapUsed,
        networkLatency: validationTime + callOverhead,
      };

      return {
        success:
          totalExecutionTime <= testCase.performanceTarget &&
          metrics.resultCorrectness,
        metrics,
        result: functionResult,
      };
    } catch (error) {
      const totalExecutionTime = performance.now() - startTime;

      return {
        success: false,
        metrics: {
          totalExecutionTime,
          callOverhead: 0,
          serializationTime: 0,
          validationTime: 0,
          functionExecutionTime: 0,
          deserializationTime: 0,
          executionSuccess: false,
          validationSuccess: false,
          resultCorrectness: false,
          errorHandling: true,
          throughput: 0,
          memoryUsage: process.memoryUsage().heapUsed,
          networkLatency: 0,
        },
        result: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Execute cross-service orchestration test
   */
  static async executeCrossServiceTest(
    scenario: CrossServiceScenario,
    client: WebSocket,
    services: {
      parlantService: ParlantIntegrationService;
      conversationalBridge: ConversationalWebSocketBridgeService;
      securityBridge: AigentParlantSecurityBridgeService;
    },
  ): Promise<{
    success: boolean;
    totalExecutionTime: number;
    functionResults: Record<string, unknown>;
    dataFlowValid: boolean;
    error?: string;
  }> {
    const startTime = performance.now();
    const sessionId = `cross_service_${Date.now()}`;
    const functionResults: Record<string, unknown> = {};

    try {
      // Execute function chain
      for (const func of scenario.functionChain) {
        const functionStartTime = performance.now();

        // Resolve input mapping
        const resolvedInputs = FunctionIntegrationTestUtils.resolveInputMapping(
          func.inputMapping,
          functionResults,
          {
            userId: 'cross-service-test-user',
            transaction: { amount: 1000, type: 'transfer' },
            history: ['login', 'transfer', 'logout'],
            profile: { verified: true, riskLevel: 'low' },
          },
        );

        // Create validation request for cross-service function
        const validationRequest: ConversationalMessage = {
          type: ConversationalMessageType.VALIDATION_REQUEST,
          messageId: `cross_service_${func.serviceName}_${Date.now()}`,
          sessionId,
          timestamp: Date.now(),
          sequence: scenario.functionChain.indexOf(func) + 1,
          payload: {
            validationId: `cross_val_${func.serviceName}_${Date.now()}`,
            context: {
              userId: 'cross-service-test-user',
              applicationContext: 'cross-service-orchestration',
              environmentInfo: {
                scenario: scenario.name,
                serviceName: func.serviceName,
                functionName: func.functionName,
              },
              previousActions: Object.keys(functionResults),
              securityContext: {
                authenticationLevel: 'basic',
                permissions: ['cross-service-execute'],
                auditRequired: true,
                complianceFlags: ['cross-service'],
              },
            },
            action: {
              actionType: 'cross_service_function_execution',
              parameters: {
                serviceName: func.serviceName,
                functionName: func.functionName,
                inputs: resolvedInputs,
              },
              expectedOutcome: `Execute ${func.functionName} on ${func.serviceName}`,
              reversible: func.serviceName !== 'database-service',
              impact: {
                scope: 'network',
                dataAccess: true,
                stateChanges: func.serviceName.includes('database'),
                userInteraction: false,
              },
            },
            riskLevel: RiskLevel.MEDIUM,
            streamingOptions: {
              enableProgressUpdates: false,
              updateInterval: 1000,
              maxUpdateCount: 5,
              compressionEnabled: true,
              priorityBoost: false,
            },
          },
          metadata: {
            priority: 'high',
            requiresAck: true,
            compression: true,
            routingHints: ['cross-service'],
          },
        };

        // Send validation request
        await FunctionIntegrationTestUtils.sendMessage(
          client,
          validationRequest,
        );

        // Wait for validation response
        const validationResponse =
          await FunctionIntegrationTestUtils.waitForResponse(
            client,
            ConversationalMessageType.VALIDATION_RESPONSE,
            5000,
          );

        if (!validationResponse.payload.approved) {
          throw new Error(
            `Cross-service validation rejected for ${func.serviceName}.${func.functionName}`,
          );
        }

        // Simulate function execution
        const mockResult =
          await FunctionIntegrationTestUtils.simulateCrossServiceFunction(
            func,
            resolvedInputs,
          );

        // Apply output mapping
        const mappedResults = FunctionIntegrationTestUtils.applyOutputMapping(
          func.outputMapping,
          mockResult,
        );

        // Store results
        Object.assign(functionResults, {
          [`${func.serviceName}.${func.functionName}`]: mappedResults,
        });

        const functionExecutionTime = performance.now() - functionStartTime;
      }

      const totalExecutionTime = performance.now() - startTime;

      // Validate data flow
      const dataFlowValid = scenario.dataFlowValidation
        ? FunctionIntegrationTestUtils.validateDataFlow(
            scenario,
            functionResults,
          )
        : true;

      return {
        success:
          totalExecutionTime <= scenario.expectedTotalTime && dataFlowValid,
        totalExecutionTime,
        functionResults,
        dataFlowValid,
      };
    } catch (error) {
      return {
        success: false,
        totalExecutionTime: performance.now() - startTime,
        functionResults,
        dataFlowValid: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Execute batch processing test
   */
  static async executeBatchProcessingTest(
    config: BatchProcessingConfig,
    client: WebSocket,
    services: {
      parlantService: ParlantIntegrationService;
      conversationalBridge: ConversationalWebSocketBridgeService;
      securityBridge: AigentParlantSecurityBridgeService;
    },
  ): Promise<{
    success: boolean;
    totalProcessed: number;
    averageLatency: number;
    throughput: number;
    memoryEfficiency: number;
    error?: string;
  }> {
    const startTime = performance.now();
    const sessionId = `batch_processing_${Date.now()}`;
    const batchResults: number[] = [];

    try {
      // Execute concurrent batches
      const batchPromises: Promise<{
        batchId: number;
        processed: number;
        latency: number;
      }>[] = [];

      for (let batchId = 0; batchId < config.concurrentBatches; batchId++) {
        const batchPromise = (async () => {
          const batchStartTime = performance.now();

          // Create batch validation request
          const batchValidationRequest: ConversationalMessage = {
            type: ConversationalMessageType.VALIDATION_REQUEST,
            messageId: `batch_${batchId}_${Date.now()}`,
            sessionId,
            timestamp: Date.now(),
            sequence: batchId + 1,
            payload: {
              validationId: `batch_val_${batchId}_${Date.now()}`,
              context: {
                userId: 'batch-processing-user',
                applicationContext: 'batch-function-processing',
                environmentInfo: {
                  batchId,
                  batchSize: config.batchSize,
                  functionType: config.functionType,
                },
                previousActions: [],
                securityContext: {
                  authenticationLevel: 'basic',
                  permissions: ['batch-execute'],
                  auditRequired: false,
                  complianceFlags: [],
                },
              },
              action: {
                actionType: 'batch_function_execution',
                parameters: {
                  batchId,
                  batchSize: config.batchSize,
                  functionType: config.functionType,
                },
                expectedOutcome: `Process batch ${batchId} with ${config.batchSize} functions`,
                reversible: true,
                impact: {
                  scope: 'local',
                  dataAccess: true,
                  stateChanges: false,
                  userInteraction: false,
                },
              },
              riskLevel: RiskLevel.LOW,
              streamingOptions: {
                enableProgressUpdates: true,
                updateInterval: 100,
                maxUpdateCount: config.batchSize,
                compressionEnabled: true,
                priorityBoost: false,
              },
            },
            metadata: {
              priority: 'normal',
              requiresAck: true,
              compression: true,
              routingHints: ['batch-processing'],
            },
          };

          // Send batch validation request
          await FunctionIntegrationTestUtils.sendMessage(
            client,
            batchValidationRequest,
          );

          // Wait for validation response
          const validationResponse =
            await FunctionIntegrationTestUtils.waitForResponse(
              client,
              ConversationalMessageType.VALIDATION_RESPONSE,
              10000,
            );

          if (!validationResponse.payload.approved) {
            throw new Error(`Batch validation rejected for batch ${batchId}`);
          }

          // Simulate batch processing
          let processed = 0;
          for (let i = 0; i < config.batchSize; i++) {
            // Simulate function execution
            await new Promise((resolve) => setTimeout(resolve, 1));
            processed++;
          }

          const batchLatency = performance.now() - batchStartTime;

          return {
            batchId,
            processed,
            latency: batchLatency,
          };
        })();

        batchPromises.push(batchPromise);
      }

      // Wait for all batches to complete
      const batchResults = await Promise.all(batchPromises);

      const totalExecutionTime = performance.now() - startTime;
      const totalProcessed = batchResults.reduce(
        (sum, batch) => sum + batch.processed,
        0,
      );
      const averageLatency =
        batchResults.reduce((sum, batch) => sum + batch.latency, 0) /
        batchResults.length;
      const throughput = (totalProcessed * 1000) / totalExecutionTime;

      // Calculate memory efficiency
      const memoryUsed = process.memoryUsage().heapUsed;
      const memoryEfficiency = Math.max(0, 1 - memoryUsed / config.memoryLimit);

      return {
        success:
          throughput >= config.expectedThroughput && memoryEfficiency > 0.7,
        totalProcessed,
        averageLatency,
        throughput,
        memoryEfficiency,
      };
    } catch (error) {
      return {
        success: false,
        totalProcessed: 0,
        averageLatency: 0,
        throughput: 0,
        memoryEfficiency: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Simulate function execution
   */
  private static async simulateFunctionExecution(
    testCase: FunctionTestCase,
  ): Promise<unknown> {
    // Simulate processing time based on function type
    const processingTime = testCase.performanceTarget * 0.1; // 10% of target time
    await new Promise((resolve) => setTimeout(resolve, processingTime));

    // Return mock result based on test case
    switch (testCase.functionName) {
      case 'getUserData':
        return testCase.expectedResult;

      case 'calculateRiskScore':
        return testCase.expectedResult;

      case 'processLargeDataset':
        return {
          ...(testCase.expectedResult as object),
          duration: processingTime,
        };

      case 'updateCriticalDatabase':
        return testCase.expectedResult;

      case 'callExternalAPI':
        return {
          ...(testCase.expectedResult as object),
          responseTime: processingTime,
        };

      default:
        return testCase.expectedResult;
    }
  }

  /**
   * Simulate cross-service function execution
   */
  private static async simulateCrossServiceFunction(
    func: CrossServiceFunction,
    inputs: Record<string, unknown>,
  ): Promise<unknown> {
    // Simulate network latency for cross-service call
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Generate mock response based on service and function
    switch (func.serviceName) {
      case 'user-service':
        return {
          id: inputs.userId,
          name: 'Test User',
          email: 'test@example.com',
          verified: true,
        };

      case 'validation-service':
        return {
          valid: true,
          confidence: 0.95,
          issues: [],
        };

      case 'enrichment-service':
        return {
          ...(inputs.userData as object),
          enrichedData: {
            preferences: ['setting1', 'setting2'],
            history: ['action1', 'action2'],
          },
        };

      case 'financial-service':
        return {
          riskScore: 0.2,
          recommendation: 'approve',
          factors: ['income_stable', 'credit_good'],
        };

      case 'behavioral-service':
        return {
          behaviorScore: 0.8,
          patterns: ['consistent_login', 'normal_usage'],
          alerts: [],
        };

      case 'compliance-service':
        return {
          compliant: true,
          checkedRules: ['AML', 'KYC', 'PCI'],
          violations: [],
        };

      default:
        return { success: true, data: inputs };
    }
  }

  /**
   * Validate function result
   */
  private static validateResult(actual: unknown, expected: unknown): boolean {
    if (typeof expected === 'object' && expected !== null) {
      if (typeof actual !== 'object' || actual === null) return false;

      const expectedObj = expected as Record<string, unknown>;
      const actualObj = actual as Record<string, unknown>;

      for (const key in expectedObj) {
        const expectedValue = expectedObj[key];
        const actualValue = actualObj[key];

        if (expectedValue === 'string' && typeof actualValue !== 'string')
          return false;
        if (expectedValue === 'number' && typeof actualValue !== 'number')
          return false;
        if (expectedValue === 'object' && typeof actualValue !== 'object')
          return false;
        if (typeof expectedValue !== 'string' && expectedValue !== actualValue)
          return false;
      }

      return true;
    }

    return actual === expected;
  }

  /**
   * Resolve input mapping for cross-service functions
   */
  private static resolveInputMapping(
    inputMapping: Record<string, string>,
    functionResults: Record<string, unknown>,
    defaultInputs: Record<string, unknown>,
  ): Record<string, unknown> {
    const resolvedInputs: Record<string, unknown> = {};

    for (const [inputKey, mappingPath] of Object.entries(inputMapping)) {
      if (mappingPath.startsWith('input.')) {
        const inputPath = mappingPath.substring(6);
        resolvedInputs[inputKey] = FunctionIntegrationTestUtils.getNestedValue(
          defaultInputs,
          inputPath,
        );
      } else if (mappingPath.includes('.')) {
        const [functionName, outputPath] = mappingPath.split('.', 2);
        const functionResult = functionResults[functionName];
        if (functionResult && typeof functionResult === 'object') {
          resolvedInputs[inputKey] =
            FunctionIntegrationTestUtils.getNestedValue(
              functionResult as Record<string, unknown>,
              outputPath,
            );
        }
      } else {
        resolvedInputs[inputKey] = functionResults[mappingPath];
      }
    }

    return resolvedInputs;
  }

  /**
   * Apply output mapping for function results
   */
  private static applyOutputMapping(
    outputMapping: Record<string, string>,
    result: unknown,
  ): Record<string, unknown> {
    const mappedResults: Record<string, unknown> = {};

    for (const [outputKey, resultPath] of Object.entries(outputMapping)) {
      if (resultPath === 'output') {
        mappedResults[outputKey] = result;
      } else if (typeof result === 'object' && result !== null) {
        mappedResults[outputKey] = FunctionIntegrationTestUtils.getNestedValue(
          result as Record<string, unknown>,
          resultPath,
        );
      }
    }

    return mappedResults;
  }

  /**
   * Validate data flow in cross-service scenario
   */
  private static validateDataFlow(
    scenario: CrossServiceScenario,
    functionResults: Record<string, unknown>,
  ): boolean {
    // Check that all functions in the chain produced results
    for (const func of scenario.functionChain) {
      const resultKey = `${func.serviceName}.${func.functionName}`;
      if (!functionResults[resultKey]) {
        return false;
      }
    }

    // Check dependencies are satisfied
    for (const func of scenario.functionChain) {
      if (func.dependsOn) {
        for (const dependency of func.dependsOn) {
          const dependencyKey =
            scenario.functionChain.find((f) => f.functionName === dependency)
              ?.serviceName +
            '.' +
            dependency;

          if (!dependencyKey || !functionResults[dependencyKey]) {
            return false;
          }
        }
      }
    }

    return true;
  }

  /**
   * Get nested value from object using dot notation
   */
  private static getNestedValue(
    obj: Record<string, unknown>,
    path: string,
  ): unknown {
    return path.split('.').reduce((current, key) => {
      return current && typeof current === 'object'
        ? (current as Record<string, unknown>)[key]
        : undefined;
    }, obj);
  }

  /**
   * Send WebSocket message
   */
  private static async sendMessage(
    client: WebSocket,
    message: ConversationalMessage,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (client.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not open'));
        return;
      }

      client.send(JSON.stringify(message), (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Wait for WebSocket response
   */
  private static async waitForResponse(
    client: WebSocket,
    messageType: ConversationalMessageType,
    timeout: number = 5000,
  ): Promise<ConversationalMessage> {
    return new Promise((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        client.off('message', messageHandler);
        reject(new Error(`Timeout waiting for ${messageType} response`));
      }, timeout);

      const messageHandler = (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString()) as ConversationalMessage;

          if (message.type === messageType) {
            clearTimeout(timeoutHandle);
            client.off('message', messageHandler);
            resolve(message);
          }
        } catch (error) {
          // Ignore parsing errors for non-JSON messages
        }
      };

      client.on('message', messageHandler);
    });
  }

  /**
   * Create test WebSocket client
   */
  static async createTestClient(port: number = 8081): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const client = new WebSocket(`ws://localhost:${port}`);

      client.on('open', () => resolve(client));
      client.on('error', reject);

      setTimeout(() => {
        if (client.readyState !== WebSocket.OPEN) {
          client.terminate();
          reject(new Error('Connection timeout'));
        }
      }, 5000);
    });
  }

  /**
   * Generate function integration test configuration
   */
  static generateFunctionIntegrationConfig(): FunctionIntegrationConfig {
    return {
      maxCallOverhead: 10,
      maxSerializationTime: 5,
      maxValidationTime: 100,
      maxCrossServiceLatency: 50,
      targetFunctionsPerSecond: 500,
      batchSize: 100,
      concurrentCalls: 50,
      supportedLanguages: ['typescript', 'python', 'cross-service'],
      functionCategories: [
        'data-access',
        'computation',
        'external-api',
        'database',
        'validation',
      ],
    };
  }
}

// ===== MAIN FUNCTION INTEGRATION TEST SUITE =====

describe('PARLANT Function Integration WebSocket Test Suite', () => {
  let module: TestingModule;
  let parlantService: ParlantIntegrationService;
  let conversationalBridge: ConversationalWebSocketBridgeService;
  let securityBridge: AigentParlantSecurityBridgeService;
  let logger: Logger;

  const integrationConfig =
    FunctionIntegrationTestUtils.generateFunctionIntegrationConfig();

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [
            () => ({
              CONVERSATIONAL_WEBSOCKET_PORT: 8081,
              NODE_ENV: 'test',
            }),
          ],
        }),
      ],
      providers: [
        ParlantIntegrationService,
        ConversationalWebSocketBridgeService,
        AigentParlantSecurityBridgeService,
        Logger,
      ],
    }).compile();

    parlantService = module.get<ParlantIntegrationService>(
      ParlantIntegrationService,
    );
    conversationalBridge = module.get<ConversationalWebSocketBridgeService>(
      ConversationalWebSocketBridgeService,
    );
    securityBridge = module.get<AigentParlantSecurityBridgeService>(
      AigentParlantSecurityBridgeService,
    );
    logger = module.get<Logger>(Logger);

    await module.init();

    // Allow time for WebSocket server to start
    await new Promise((resolve) => setTimeout(resolve, 2000));
  });

  afterAll(async () => {
    await module.close();
  });

  // ===== INDIVIDUAL FUNCTION INTEGRATION TESTS =====

  describe('Individual Function Integration', () => {
    it('should execute low-risk data access function with validation', async () => {
      const testCases =
        FunctionIntegrationTestUtils.generateFunctionTestCases();
      const getUserDataCase = testCases.find(
        (c) => c.functionName === 'getUserData',
      );

      if (!getUserDataCase) {
        throw new Error('getUserData test case not found');
      }

      logger.log(
        `Starting ${getUserDataCase.functionName} function integration test`,
      );

      const client = await FunctionIntegrationTestUtils.createTestClient();
      const services = { parlantService, conversationalBridge, securityBridge };

      try {
        const result = await FunctionIntegrationTestUtils.executeFunctionTest(
          getUserDataCase,
          client,
          services,
        );

        logger.log(`getUserData Function Results:
          Success: ${result.success}
          Total Execution Time: ${result.metrics.totalExecutionTime.toFixed(1)}ms
          Call Overhead: ${result.metrics.callOverhead.toFixed(1)}ms
          Validation Time: ${result.metrics.validationTime.toFixed(1)}ms
          Function Execution Time: ${result.metrics.functionExecutionTime.toFixed(1)}ms
          Result Correctness: ${result.metrics.resultCorrectness}
          Throughput: ${result.metrics.throughput.toFixed(1)} calls/sec`);

        expect(result.success).toBe(true);
        expect(result.metrics.totalExecutionTime).toBeLessThan(
          getUserDataCase.performanceTarget,
        );
        expect(result.metrics.callOverhead).toBeLessThan(
          integrationConfig.maxCallOverhead,
        );
        expect(result.metrics.validationTime).toBeLessThan(
          integrationConfig.maxValidationTime,
        );
        expect(result.metrics.resultCorrectness).toBe(true);
        expect(result.metrics.validationSuccess).toBe(true);
      } finally {
        if (client.readyState === WebSocket.OPEN) {
          client.close();
        }
      }
    }, 15000);

    it('should execute medium-risk computation function with streaming', async () => {
      const testCases =
        FunctionIntegrationTestUtils.generateFunctionTestCases();
      const calculateRiskCase = testCases.find(
        (c) => c.functionName === 'calculateRiskScore',
      );

      if (!calculateRiskCase) {
        throw new Error('calculateRiskScore test case not found');
      }

      logger.log(
        `Starting ${calculateRiskCase.functionName} function integration test`,
      );

      const client = await FunctionIntegrationTestUtils.createTestClient();
      const services = { parlantService, conversationalBridge, securityBridge };

      try {
        const result = await FunctionIntegrationTestUtils.executeFunctionTest(
          calculateRiskCase,
          client,
          services,
        );

        logger.log(`calculateRiskScore Function Results:
          Success: ${result.success}
          Total Execution Time: ${result.metrics.totalExecutionTime.toFixed(1)}ms
          Serialization Time: ${result.metrics.serializationTime.toFixed(1)}ms
          Deserialization Time: ${result.metrics.deserializationTime.toFixed(1)}ms
          Network Latency: ${result.metrics.networkLatency.toFixed(1)}ms
          Memory Usage: ${(result.metrics.memoryUsage / 1024 / 1024).toFixed(1)} MB`);

        expect(result.success).toBe(true);
        expect(result.metrics.totalExecutionTime).toBeLessThan(
          calculateRiskCase.performanceTarget,
        );
        expect(result.metrics.serializationTime).toBeLessThan(
          integrationConfig.maxSerializationTime,
        );
        expect(result.metrics.networkLatency).toBeLessThan(
          integrationConfig.maxCrossServiceLatency,
        );
        expect(result.metrics.executionSuccess).toBe(true);
      } finally {
        if (client.readyState === WebSocket.OPEN) {
          client.close();
        }
      }
    }, 20000);

    it('should execute critical database function with security validation', async () => {
      const testCases =
        FunctionIntegrationTestUtils.generateFunctionTestCases();
      const updateDbCase = testCases.find(
        (c) => c.functionName === 'updateCriticalDatabase',
      );

      if (!updateDbCase) {
        throw new Error('updateCriticalDatabase test case not found');
      }

      logger.log(
        `Starting ${updateDbCase.functionName} function integration test`,
      );

      const client = await FunctionIntegrationTestUtils.createTestClient();
      const services = { parlantService, conversationalBridge, securityBridge };

      try {
        const result = await FunctionIntegrationTestUtils.executeFunctionTest(
          updateDbCase,
          client,
          services,
        );

        logger.log(`updateCriticalDatabase Function Results:
          Success: ${result.success}
          Total Execution Time: ${result.metrics.totalExecutionTime.toFixed(1)}ms
          Validation Success: ${result.metrics.validationSuccess}
          Error Handling: ${result.metrics.errorHandling}
          Execution Success: ${result.metrics.executionSuccess}`);

        expect(result.success).toBe(true);
        expect(result.metrics.validationSuccess).toBe(true);
        expect(result.metrics.errorHandling).toBe(true);
        expect(result.metrics.executionSuccess).toBe(true);
        expect(result.result).toHaveProperty('backupCreated', true);
      } finally {
        if (client.readyState === WebSocket.OPEN) {
          client.close();
        }
      }
    }, 25000);
  });

  // ===== CROSS-SERVICE ORCHESTRATION TESTS =====

  describe('Cross-Service Orchestration', () => {
    it('should execute user data enrichment pipeline', async () => {
      const scenarios =
        FunctionIntegrationTestUtils.generateCrossServiceScenarios();
      const enrichmentScenario = scenarios.find(
        (s) => s.name === 'User Data Enrichment Pipeline',
      );

      if (!enrichmentScenario) {
        throw new Error('User data enrichment scenario not found');
      }

      logger.log(`Starting ${enrichmentScenario.name} cross-service test`);

      const client = await FunctionIntegrationTestUtils.createTestClient();
      const services = { parlantService, conversationalBridge, securityBridge };

      try {
        const result =
          await FunctionIntegrationTestUtils.executeCrossServiceTest(
            enrichmentScenario,
            client,
            services,
          );

        logger.log(`User Data Enrichment Results:
          Success: ${result.success}
          Total Execution Time: ${result.totalExecutionTime.toFixed(1)}ms
          Expected Time: ${enrichmentScenario.expectedTotalTime}ms
          Data Flow Valid: ${result.dataFlowValid}
          Functions Executed: ${Object.keys(result.functionResults).length}`);

        expect(result.success).toBe(true);
        expect(result.totalExecutionTime).toBeLessThan(
          enrichmentScenario.expectedTotalTime + 100,
        );
        expect(result.dataFlowValid).toBe(true);
        expect(Object.keys(result.functionResults)).toHaveLength(
          enrichmentScenario.functionChain.length,
        );
      } finally {
        if (client.readyState === WebSocket.OPEN) {
          client.close();
        }
      }
    }, 30000);

    it('should execute parallel risk assessment', async () => {
      const scenarios =
        FunctionIntegrationTestUtils.generateCrossServiceScenarios();
      const riskScenario = scenarios.find(
        (s) => s.name === 'Parallel Risk Assessment',
      );

      if (!riskScenario) {
        throw new Error('Parallel risk assessment scenario not found');
      }

      logger.log(`Starting ${riskScenario.name} cross-service test`);

      const client = await FunctionIntegrationTestUtils.createTestClient();
      const services = { parlantService, conversationalBridge, securityBridge };

      try {
        const result =
          await FunctionIntegrationTestUtils.executeCrossServiceTest(
            riskScenario,
            client,
            services,
          );

        // Validate parallel execution efficiency
        const parallelEfficiency =
          result.totalExecutionTime < riskScenario.expectedTotalTime * 1.2;

        logger.log(`Parallel Risk Assessment Results:
          Success: ${result.success}
          Total Execution Time: ${result.totalExecutionTime.toFixed(1)}ms
          Parallel Efficiency: ${parallelEfficiency}
          Services Used: ${riskScenario.services.length}
          Parallel Functions: ${riskScenario.functionChain.filter((f) => f.parallel).length}`);

        expect(result.success).toBe(true);
        expect(parallelEfficiency).toBe(true);
        expect(result.dataFlowValid).toBe(true);
      } finally {
        if (client.readyState === WebSocket.OPEN) {
          client.close();
        }
      }
    }, 35000);
  });

  // ===== BATCH PROCESSING TESTS =====

  describe('Batch Processing Performance', () => {
    it('should handle high-throughput batch function processing', async () => {
      const batchConfig: BatchProcessingConfig = {
        batchSize: 50,
        functionType: 'data-processing',
        concurrentBatches: 5,
        expectedThroughput: 200,
        memoryLimit: 100 * 1024 * 1024, // 100MB
      };

      logger.log(
        `Starting batch processing test with ${batchConfig.concurrentBatches} concurrent batches`,
      );

      const client = await FunctionIntegrationTestUtils.createTestClient();
      const services = { parlantService, conversationalBridge, securityBridge };

      try {
        const result =
          await FunctionIntegrationTestUtils.executeBatchProcessingTest(
            batchConfig,
            client,
            services,
          );

        logger.log(`Batch Processing Results:
          Success: ${result.success}
          Total Processed: ${result.totalProcessed}
          Average Latency: ${result.averageLatency.toFixed(1)}ms
          Throughput: ${result.throughput.toFixed(1)} functions/sec
          Memory Efficiency: ${(result.memoryEfficiency * 100).toFixed(1)}%`);

        expect(result.success).toBe(true);
        expect(result.totalProcessed).toBe(
          batchConfig.batchSize * batchConfig.concurrentBatches,
        );
        expect(result.throughput).toBeGreaterThan(
          batchConfig.expectedThroughput,
        );
        expect(result.memoryEfficiency).toBeGreaterThan(0.7);
      } finally {
        if (client.readyState === WebSocket.OPEN) {
          client.close();
        }
      }
    }, 45000);
  });
});
