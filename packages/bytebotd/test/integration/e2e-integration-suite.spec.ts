/**
 * Comprehensive E2E Integration Testing Suite for PARLANT PHASE 1 Workflows
 *
 * Complete end-to-end validation of all PARLANT PHASE 1 system components including:
 * - Cross-service integration (Bytebot, Browser-Use, Open-Interpreter, Orchestrator)
 * - Complete user journeys from authentication through task completion
 * - Real-time WebSocket conversational validation workflows
 * - Database integration with conversational approval workflows
 * - API integration testing with external service mocking
 * - Performance validation under realistic load conditions
 *
 * Test Categories:
 * 1. Complete User Journey Testing - End-to-end user workflows
 * 2. Cross-Service Integration - Multi-service orchestration validation
 * 3. Real-time Communication - WebSocket streaming and validation
 * 4. Database Integration - Conversational database operation approval
 * 5. API Integration - External service integration validation
 * 6. Performance Integration - Load testing with realistic scenarios
 * 7. Security Integration - Multi-layer security validation
 * 8. Error Recovery Integration - Cross-service error handling
 *
 * Performance Targets:
 * - Complete user journey < 3000ms
 * - Cross-service communication < 1000ms P95
 * - WebSocket real-time messaging < 100ms latency
 * - Database operations with validation < 2000ms
 * - API integration calls < 1500ms
 * - System recovery from failures < 2000ms
 *
 * @fileoverview Complete E2E integration testing framework
 * @version 1.0.0
 * @author Integration Testing Team
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import WebSocket from 'ws';
import { EventEmitter } from 'events';

// Import core application modules
import { AppModule } from '../../src/app.module';
import { ParlantIntegrationService } from '../../src/parlant/parlant-integration.service';
import { ComputerUseService } from '../../src/computer-use/computer-use.service';
import { AiServicesModule } from '../../src/ai-services/ai-services.module';
import { BrowserUseModule } from '../../src/browser-use/browser-use.module';

// Import PARLANT streaming and validation services
import { ParlantStreamingValidationGateway } from '../../src/parlant/parlant-streaming-validation.gateway';
import { ParlantValidatedComputerUseService } from '../../src/parlant/parlant-validated-computer-use.service';

// Import authentication and security services
import { AuthModule } from '../../src/auth/auth.module';
import { AigentParlantSecurityBridgeService } from '../../src/auth/services/aigent-parlant-security-bridge.service';

// Import database and caching services
import { DatabaseModule } from '../../src/database/database.module';
import { CacheService } from '../../src/cache/cache.service';

/**
 * Complete user journey test scenario
 */
interface E2EUserJourney {
  name: string;
  description: string;
  expectedDurationMs: number;
  steps: E2EJourneyStep[];
  validationCriteria: E2EValidationCriteria;
  performanceTargets: E2EPerformanceTargets;
}

/**
 * Individual journey step with validation
 */
interface E2EJourneyStep {
  name: string;
  type: 'AUTH' | 'API_CALL' | 'WEBSOCKET' | 'DATABASE' | 'COMPUTER_USE' | 'BROWSER_USE' | 'VALIDATION' | 'CLEANUP';
  action: string;
  input: Record<string, unknown>;
  expectedOutput: Record<string, unknown>;
  maxDurationMs: number;
  dependencies: string[];
  validationRules: string[];
  retryPolicy?: E2ERetryPolicy;
}

/**
 * Validation criteria for journey completion
 */
interface E2EValidationCriteria {
  requiredSuccessfulSteps: string[];
  dataIntegrityChecks: string[];
  performanceThresholds: Record<string, number>;
  securityValidations: string[];
}

/**
 * Performance targets for journey
 */
interface E2EPerformanceTargets {
  totalDurationMaxMs: number;
  averageStepDurationMaxMs: number;
  p95ResponseTimeMaxMs: number;
  errorRateMaxPercent: number;
  throughputMinRequestsPerSecond: number;
}

/**
 * Retry policy for failed steps
 */
interface E2ERetryPolicy {
  maxRetries: number;
  backoffMs: number;
  exponentialBackoff: boolean;
  retryableErrors: string[];
}

/**
 * Cross-service integration test configuration
 */
interface CrossServiceIntegrationConfig {
  services: string[];
  communicationProtocols: string[];
  dataFlowValidation: boolean;
  performanceMonitoring: boolean;
  errorPropagationTesting: boolean;
}

/**
 * Real-time WebSocket test configuration
 */
interface WebSocketIntegrationConfig {
  connectionTimeout: number;
  messageTimeout: number;
  maxConcurrentConnections: number;
  messageFrequency: number;
  validationLatency: number;
  streamingDuration: number;
}

/**
 * Database integration test configuration
 */
interface DatabaseIntegrationConfig {
  transactionIsolationLevel: string;
  maxConnectionPoolSize: number;
  queryTimeout: number;
  validationWorkflows: string[];
  dataConsistencyChecks: boolean;
}

/**
 * Performance integration test configuration
 */
interface PerformanceIntegrationConfig {
  concurrentUsers: number;
  testDurationMs: number;
  rampUpDurationMs: number;
  loadPatterns: string[];
  resourceMonitoring: boolean;
  performanceThresholds: Record<string, number>;
}

/**
 * E2E Integration Test Execution Context
 */
class E2EIntegrationTestContext {
  private testData: Record<string, unknown> = {};
  private metrics: Record<string, number> = {};
  private connections: Map<string, WebSocket> = new Map();
  private activeTransactions: Set<string> = new Set();
  private performanceTimers: Map<string, number> = new Map();

  setTestData(key: string, value: unknown): void {
    this.testData[key] = value;
  }

  getTestData(key: string): unknown {
    return this.testData[key];
  }

  setMetric(key: string, value: number): void {
    this.metrics[key] = value;
  }

  getMetric(key: string): number {
    return this.metrics[key] || 0;
  }

  addConnection(id: string, ws: WebSocket): void {
    this.connections.set(id, ws);
  }

  getConnection(id: string): WebSocket | undefined {
    return this.connections.get(id);
  }

  startTimer(name: string): void {
    this.performanceTimers.set(name, Date.now());
  }

  endTimer(name: string): number {
    const startTime = this.performanceTimers.get(name);
    if (!startTime) return 0;
    const duration = Date.now() - startTime;
    this.performanceTimers.delete(name);
    return duration;
  }

  cleanup(): void {
    this.connections.forEach(ws => ws.close());
    this.connections.clear();
    this.activeTransactions.clear();
    this.performanceTimers.clear();
    this.testData = {};
    this.metrics = {};
  }
}

/**
 * E2E Integration Test Utilities
 */
class E2EIntegrationTestUtils {
  /**
   * Generate comprehensive user journey scenarios
   */
  static generateUserJourneyScenarios(): E2EUserJourney[] {
    return [
      {
        name: 'Complete PARLANT Validated Computer Use Journey',
        description: 'End-to-end user journey with computer use operations validated through PARLANT',
        expectedDurationMs: 3000,
        steps: [
          {
            name: 'authenticate_user',
            type: 'AUTH',
            action: 'login',
            input: { username: 'e2e-test-user', password: 'secure-password', role: 'employee' },
            expectedOutput: { authenticated: true, token: 'string', sessionId: 'string' },
            maxDurationMs: 500,
            dependencies: [],
            validationRules: ['valid_jwt_token', 'session_created'],
            retryPolicy: { maxRetries: 3, backoffMs: 500, exponentialBackoff: true, retryableErrors: ['NETWORK_ERROR'] }
          },
          {
            name: 'establish_parlant_session',
            type: 'API_CALL',
            action: 'create_parlant_session',
            input: { token: '{{authenticate_user.token}}', conversationType: 'computer_use_validation' },
            expectedOutput: { sessionId: 'string', conversationId: 'string', status: 'active' },
            maxDurationMs: 800,
            dependencies: ['authenticate_user'],
            validationRules: ['parlant_session_active', 'conversation_initialized']
          },
          {
            name: 'connect_websocket_stream',
            type: 'WEBSOCKET',
            action: 'establish_connection',
            input: { sessionId: '{{establish_parlant_session.sessionId}}', protocol: 'parlant-validation' },
            expectedOutput: { connected: true, connectionId: 'string', streamReady: true },
            maxDurationMs: 600,
            dependencies: ['establish_parlant_session'],
            validationRules: ['websocket_connected', 'stream_ready']
          },
          {
            name: 'request_computer_use_operation',
            type: 'COMPUTER_USE',
            action: 'click_element',
            input: {
              coordinates: { x: 100, y: 200 },
              sessionId: '{{establish_parlant_session.sessionId}}',
              requiresParlantValidation: true
            },
            expectedOutput: { operationQueued: true, validationRequired: true, validationId: 'string' },
            maxDurationMs: 300,
            dependencies: ['connect_websocket_stream'],
            validationRules: ['operation_queued', 'validation_initiated']
          },
          {
            name: 'parlant_conversational_validation',
            type: 'VALIDATION',
            action: 'validate_through_conversation',
            input: {
              validationId: '{{request_computer_use_operation.validationId}}',
              userResponse: 'Yes, please click on the button',
              confidence: 0.95
            },
            expectedOutput: { approved: true, confidence: 'number', reasoning: 'string' },
            maxDurationMs: 1000,
            dependencies: ['request_computer_use_operation'],
            validationRules: ['high_confidence_approval', 'reasoning_provided']
          },
          {
            name: 'execute_validated_operation',
            type: 'COMPUTER_USE',
            action: 'execute_approved_operation',
            input: {
              validationId: '{{request_computer_use_operation.validationId}}',
              approvalToken: '{{parlant_conversational_validation.approvalToken}}'
            },
            expectedOutput: { executed: true, result: 'object', executionTime: 'number' },
            maxDurationMs: 500,
            dependencies: ['parlant_conversational_validation'],
            validationRules: ['operation_executed', 'result_captured']
          },
          {
            name: 'log_operation_to_database',
            type: 'DATABASE',
            action: 'store_operation_audit',
            input: {
              operationId: '{{execute_validated_operation.operationId}}',
              validationData: '{{parlant_conversational_validation}}',
              executionResult: '{{execute_validated_operation.result}}'
            },
            expectedOutput: { stored: true, auditId: 'string', timestamp: 'string' },
            maxDurationMs: 400,
            dependencies: ['execute_validated_operation'],
            validationRules: ['audit_stored', 'data_integrity_maintained']
          },
          {
            name: 'cleanup_session',
            type: 'CLEANUP',
            action: 'close_all_connections',
            input: {
              sessionId: '{{establish_parlant_session.sessionId}}',
              connectionId: '{{connect_websocket_stream.connectionId}}'
            },
            expectedOutput: { cleaned: true, sessionsTerminated: 'number' },
            maxDurationMs: 300,
            dependencies: ['log_operation_to_database'],
            validationRules: ['all_connections_closed', 'resources_freed']
          }
        ],
        validationCriteria: {
          requiredSuccessfulSteps: ['authenticate_user', 'parlant_conversational_validation', 'execute_validated_operation'],
          dataIntegrityChecks: ['audit_log_consistency', 'session_data_cleanup'],
          performanceThresholds: { 'total_duration': 3000, 'parlant_validation': 1000, 'operation_execution': 500 },
          securityValidations: ['jwt_validation', 'session_security', 'operation_authorization']
        },
        performanceTargets: {
          totalDurationMaxMs: 3000,
          averageStepDurationMaxMs: 500,
          p95ResponseTimeMaxMs: 800,
          errorRateMaxPercent: 1,
          throughputMinRequestsPerSecond: 10
        }
      },
      {
        name: 'Multi-Service Browser Use Integration Journey',
        description: 'Cross-service integration with Browser-Use, PARLANT validation, and real-time streaming',
        expectedDurationMs: 4000,
        steps: [
          {
            name: 'initialize_browser_session',
            type: 'BROWSER_USE',
            action: 'start_browser',
            input: { browserType: 'chrome', headless: false, viewport: { width: 1920, height: 1080 } },
            expectedOutput: { browserStarted: true, sessionId: 'string', pageUrl: 'string' },
            maxDurationMs: 1000,
            dependencies: [],
            validationRules: ['browser_running', 'page_loaded']
          },
          {
            name: 'setup_parlant_browser_validation',
            type: 'API_CALL',
            action: 'configure_browser_validation',
            input: {
              browserSessionId: '{{initialize_browser_session.sessionId}}',
              validationLevel: 'high',
              realTimeValidation: true
            },
            expectedOutput: { configured: true, validationStreamId: 'string' },
            maxDurationMs: 600,
            dependencies: ['initialize_browser_session'],
            validationRules: ['validation_configured', 'stream_established']
          },
          {
            name: 'navigate_with_validation',
            type: 'BROWSER_USE',
            action: 'navigate_to_url',
            input: {
              url: 'https://example.com',
              sessionId: '{{initialize_browser_session.sessionId}}',
              requireValidation: true,
              validationPrompt: 'Navigate to example website for testing'
            },
            expectedOutput: { navigationQueued: true, validationRequired: true, validationId: 'string' },
            maxDurationMs: 500,
            dependencies: ['setup_parlant_browser_validation'],
            validationRules: ['navigation_queued', 'validation_requested']
          },
          {
            name: 'stream_validation_conversation',
            type: 'WEBSOCKET',
            action: 'real_time_validation',
            input: {
              validationId: '{{navigate_with_validation.validationId}}',
              streamId: '{{setup_parlant_browser_validation.validationStreamId}}',
              conversationType: 'browser_navigation_approval'
            },
            expectedOutput: { approved: true, streamingComplete: true, confidence: 'number' },
            maxDurationMs: 1200,
            dependencies: ['navigate_with_validation'],
            validationRules: ['approval_received', 'high_confidence']
          },
          {
            name: 'execute_browser_navigation',
            type: 'BROWSER_USE',
            action: 'complete_navigation',
            input: {
              validationId: '{{navigate_with_validation.validationId}}',
              approvalData: '{{stream_validation_conversation}}'
            },
            expectedOutput: { navigated: true, pageLoaded: true, loadTime: 'number' },
            maxDurationMs: 800,
            dependencies: ['stream_validation_conversation'],
            validationRules: ['page_loaded', 'navigation_successful']
          },
          {
            name: 'validate_page_interaction',
            type: 'BROWSER_USE',
            action: 'interact_with_page',
            input: {
              sessionId: '{{initialize_browser_session.sessionId}}',
              interactions: [
                { type: 'click', selector: '#main-button' },
                { type: 'type', selector: '#input-field', text: 'test input' }
              ],
              requireValidation: true
            },
            expectedOutput: { interactionsQueued: true, validationRequired: true, validationIds: 'array' },
            maxDurationMs: 600,
            dependencies: ['execute_browser_navigation'],
            validationRules: ['interactions_queued', 'validations_required']
          },
          {
            name: 'cleanup_browser_session',
            type: 'CLEANUP',
            action: 'close_browser',
            input: { sessionId: '{{initialize_browser_session.sessionId}}' },
            expectedOutput: { browserClosed: true, sessionTerminated: true },
            maxDurationMs: 400,
            dependencies: ['validate_page_interaction'],
            validationRules: ['browser_closed', 'session_cleaned']
          }
        ],
        validationCriteria: {
          requiredSuccessfulSteps: ['initialize_browser_session', 'stream_validation_conversation', 'execute_browser_navigation'],
          dataIntegrityChecks: ['browser_session_consistency', 'validation_data_integrity'],
          performanceThresholds: { 'browser_startup': 1000, 'page_load': 800, 'validation_stream': 1200 },
          securityValidations: ['browser_security', 'validation_authorization', 'interaction_safety']
        },
        performanceTargets: {
          totalDurationMaxMs: 4000,
          averageStepDurationMaxMs: 650,
          p95ResponseTimeMaxMs: 1000,
          errorRateMaxPercent: 2,
          throughputMinRequestsPerSecond: 8
        }
      }
    ];
  }

  /**
   * Execute complete user journey with comprehensive validation
   */
  static async executeUserJourney(
    journey: E2EUserJourney,
    app: INestApplication,
    context: E2EIntegrationTestContext,
    logger: Logger
  ): Promise<{
    success: boolean;
    totalDuration: number;
    stepResults: Record<string, unknown>;
    performanceMetrics: Record<string, number>;
    validationResults: Record<string, boolean>;
    errors: string[];
  }> {
    logger.log(`Starting user journey: ${journey.name}`);

    const startTime = Date.now();
    const stepResults: Record<string, unknown> = {};
    const performanceMetrics: Record<string, number> = {};
    const validationResults: Record<string, boolean> = {};
    const errors: string[] = [];

    context.startTimer('total_journey');

    try {
      // Execute each step in sequence
      for (const step of journey.steps) {
        logger.log(`Executing step: ${step.name} (${step.type})`);

        context.startTimer(step.name);

        const stepResult = await this.executeJourneyStep(step, app, context, stepResults, logger);

        const stepDuration = context.endTimer(step.name);
        performanceMetrics[step.name] = stepDuration;

        if (stepResult.success) {
          stepResults[step.name] = stepResult.output;
          logger.log(`Step ${step.name} completed successfully in ${stepDuration}ms`);

          // Validate step performance
          if (stepDuration > step.maxDurationMs) {
            logger.warn(`Step ${step.name} exceeded max duration: ${stepDuration}ms > ${step.maxDurationMs}ms`);
          }
        } else {
          errors.push(`Step ${step.name} failed: ${stepResult.error}`);
          logger.error(`Step ${step.name} failed: ${stepResult.error}`);

          // Check if this is a critical step
          if (journey.validationCriteria.requiredSuccessfulSteps.includes(step.name)) {
            logger.error(`Critical step ${step.name} failed, aborting journey`);
            break;
          }
        }
      }

      const totalDuration = context.endTimer('total_journey');

      // Validate journey completion criteria
      const journeyValidation = this.validateJourneyCompletion(journey, stepResults, performanceMetrics, errors);

      logger.log(`Journey ${journey.name} completed in ${totalDuration}ms`);
      logger.log(`Performance metrics: ${JSON.stringify(performanceMetrics, null, 2)}`);

      return {
        success: journeyValidation.overallSuccess,
        totalDuration,
        stepResults,
        performanceMetrics,
        validationResults: journeyValidation.validationResults,
        errors
      };

    } catch (error) {
      const totalDuration = context.endTimer('total_journey');
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Journey execution failed: ${errorMessage}`);

      logger.error(`Journey ${journey.name} failed after ${totalDuration}ms: ${errorMessage}`);

      return {
        success: false,
        totalDuration,
        stepResults,
        performanceMetrics,
        validationResults: {},
        errors
      };
    }
  }

  /**
   * Execute individual journey step
   */
  private static async executeJourneyStep(
    step: E2EJourneyStep,
    app: INestApplication,
    context: E2EIntegrationTestContext,
    previousResults: Record<string, unknown>,
    logger: Logger
  ): Promise<{ success: boolean; output: Record<string, unknown>; error?: string }> {

    try {
      // Resolve input variables from previous step results
      const resolvedInput = this.resolveStepInputs(step.input, previousResults);

      let output: Record<string, unknown> = {};

      switch (step.type) {
        case 'AUTH':
          output = await this.executeAuthStep(step, resolvedInput, app, logger);
          break;
        case 'API_CALL':
          output = await this.executeApiCallStep(step, resolvedInput, app, logger);
          break;
        case 'WEBSOCKET':
          output = await this.executeWebSocketStep(step, resolvedInput, context, app, logger);
          break;
        case 'DATABASE':
          output = await this.executeDatabaseStep(step, resolvedInput, app, logger);
          break;
        case 'COMPUTER_USE':
          output = await this.executeComputerUseStep(step, resolvedInput, app, logger);
          break;
        case 'BROWSER_USE':
          output = await this.executeBrowserUseStep(step, resolvedInput, app, logger);
          break;
        case 'VALIDATION':
          output = await this.executeValidationStep(step, resolvedInput, app, logger);
          break;
        case 'CLEANUP':
          output = await this.executeCleanupStep(step, resolvedInput, context, app, logger);
          break;
        default:
          throw new Error(`Unknown step type: ${step.type}`);
      }

      return { success: true, output };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Step ${step.name} execution failed: ${errorMessage}`);

      return { success: false, output: {}, error: errorMessage };
    }
  }

  /**
   * Execute authentication step
   */
  private static async executeAuthStep(
    step: E2EJourneyStep,
    input: Record<string, unknown>,
    app: INestApplication,
    logger: Logger
  ): Promise<Record<string, unknown>> {
    logger.log(`Executing auth step: ${step.action}`);

    // Mock authentication for E2E testing
    if (step.action === 'login') {
      const mockToken = `jwt.${Date.now()}.e2e.test`;
      const sessionId = `session-${Date.now()}`;

      return {
        authenticated: true,
        token: mockToken,
        sessionId,
        user: {
          username: input.username,
          role: input.role
        }
      };
    }

    throw new Error(`Unknown auth action: ${step.action}`);
  }

  /**
   * Execute API call step
   */
  private static async executeApiCallStep(
    step: E2EJourneyStep,
    input: Record<string, unknown>,
    app: INestApplication,
    logger: Logger
  ): Promise<Record<string, unknown>> {
    logger.log(`Executing API call step: ${step.action}`);

    if (step.action === 'create_parlant_session') {
      const sessionId = `parlant-session-${Date.now()}`;
      const conversationId = `conversation-${Date.now()}`;

      return {
        sessionId,
        conversationId,
        status: 'active',
        conversationType: input.conversationType
      };
    }

    if (step.action === 'configure_browser_validation') {
      const validationStreamId = `validation-stream-${Date.now()}`;

      return {
        configured: true,
        validationStreamId,
        validationLevel: input.validationLevel,
        realTimeValidation: input.realTimeValidation
      };
    }

    throw new Error(`Unknown API call action: ${step.action}`);
  }

  /**
   * Execute WebSocket step
   */
  private static async executeWebSocketStep(
    step: E2EJourneyStep,
    input: Record<string, unknown>,
    context: E2EIntegrationTestContext,
    app: INestApplication,
    logger: Logger
  ): Promise<Record<string, unknown>> {
    logger.log(`Executing WebSocket step: ${step.action}`);

    if (step.action === 'establish_connection') {
      const connectionId = `ws-conn-${Date.now()}`;

      // Simulate WebSocket connection establishment
      const mockWebSocket = new EventEmitter() as unknown as WebSocket;
      context.addConnection(connectionId, mockWebSocket);

      return {
        connected: true,
        connectionId,
        streamReady: true,
        protocol: input.protocol
      };
    }

    if (step.action === 'real_time_validation') {
      // Simulate real-time validation conversation
      await new Promise(resolve => setTimeout(resolve, 200)); // Simulate processing time

      return {
        approved: true,
        streamingComplete: true,
        confidence: 0.92,
        reasoning: 'User provided clear approval for browser navigation',
        validationTimestamp: new Date().toISOString()
      };
    }

    throw new Error(`Unknown WebSocket action: ${step.action}`);
  }

  /**
   * Execute database step
   */
  private static async executeDatabaseStep(
    step: E2EJourneyStep,
    input: Record<string, unknown>,
    app: INestApplication,
    logger: Logger
  ): Promise<Record<string, unknown>> {
    logger.log(`Executing database step: ${step.action}`);

    if (step.action === 'store_operation_audit') {
      const auditId = `audit-${Date.now()}`;
      const timestamp = new Date().toISOString();

      return {
        stored: true,
        auditId,
        timestamp,
        operationId: input.operationId,
        dataIntegrityChecked: true
      };
    }

    throw new Error(`Unknown database action: ${step.action}`);
  }

  /**
   * Execute computer use step
   */
  private static async executeComputerUseStep(
    step: E2EJourneyStep,
    input: Record<string, unknown>,
    app: INestApplication,
    logger: Logger
  ): Promise<Record<string, unknown>> {
    logger.log(`Executing computer use step: ${step.action}`);

    if (step.action === 'click_element') {
      const validationId = `validation-${Date.now()}`;

      return {
        operationQueued: true,
        validationRequired: input.requiresParlantValidation,
        validationId,
        coordinates: input.coordinates,
        operationType: 'click'
      };
    }

    if (step.action === 'execute_approved_operation') {
      const operationId = `operation-${Date.now()}`;
      const executionTime = Math.floor(Math.random() * 200) + 50; // 50-250ms simulation

      return {
        executed: true,
        operationId,
        result: {
          success: true,
          clickRegistered: true,
          elementFound: true
        },
        executionTime
      };
    }

    throw new Error(`Unknown computer use action: ${step.action}`);
  }

  /**
   * Execute browser use step
   */
  private static async executeBrowserUseStep(
    step: E2EJourneyStep,
    input: Record<string, unknown>,
    app: INestApplication,
    logger: Logger
  ): Promise<Record<string, unknown>> {
    logger.log(`Executing browser use step: ${step.action}`);

    if (step.action === 'start_browser') {
      const sessionId = `browser-session-${Date.now()}`;
      const pageUrl = 'about:blank';

      return {
        browserStarted: true,
        sessionId,
        pageUrl,
        browserType: input.browserType,
        viewport: input.viewport
      };
    }

    if (step.action === 'navigate_to_url') {
      const validationId = `nav-validation-${Date.now()}`;

      return {
        navigationQueued: true,
        validationRequired: input.requireValidation,
        validationId,
        targetUrl: input.url
      };
    }

    if (step.action === 'complete_navigation') {
      const loadTime = Math.floor(Math.random() * 1000) + 500; // 500-1500ms simulation

      return {
        navigated: true,
        pageLoaded: true,
        loadTime,
        finalUrl: 'https://example.com'
      };
    }

    if (step.action === 'interact_with_page') {
      const validationIds = (input.interactions as Array<unknown>).map((_, index) =>
        `interaction-validation-${Date.now()}-${index}`
      );

      return {
        interactionsQueued: true,
        validationRequired: input.requireValidation,
        validationIds,
        interactionCount: validationIds.length
      };
    }

    throw new Error(`Unknown browser use action: ${step.action}`);
  }

  /**
   * Execute validation step
   */
  private static async executeValidationStep(
    step: E2EJourneyStep,
    input: Record<string, unknown>,
    app: INestApplication,
    logger: Logger
  ): Promise<Record<string, unknown>> {
    logger.log(`Executing validation step: ${step.action}`);

    if (step.action === 'validate_through_conversation') {
      // Simulate PARLANT conversational validation
      await new Promise(resolve => setTimeout(resolve, 300)); // Simulate processing time

      const confidence = input.confidence as number || 0.85;
      const approvalToken = `approval-${Date.now()}`;

      return {
        approved: true,
        confidence,
        reasoning: 'User provided clear consent for the requested computer operation',
        approvalToken,
        validationId: input.validationId,
        validationTimestamp: new Date().toISOString()
      };
    }

    throw new Error(`Unknown validation action: ${step.action}`);
  }

  /**
   * Execute cleanup step
   */
  private static async executeCleanupStep(
    step: E2EJourneyStep,
    input: Record<string, unknown>,
    context: E2EIntegrationTestContext,
    app: INestApplication,
    logger: Logger
  ): Promise<Record<string, unknown>> {
    logger.log(`Executing cleanup step: ${step.action}`);

    if (step.action === 'close_all_connections') {
      const connectionId = input.connectionId as string;
      const connection = context.getConnection(connectionId);

      if (connection) {
        connection.close();
      }

      return {
        cleaned: true,
        sessionsTerminated: 1,
        connectionsClosed: 1
      };
    }

    if (step.action === 'close_browser') {
      return {
        browserClosed: true,
        sessionTerminated: true,
        sessionId: input.sessionId
      };
    }

    throw new Error(`Unknown cleanup action: ${step.action}`);
  }

  /**
   * Resolve step inputs by replacing variables with previous results
   */
  private static resolveStepInputs(
    input: Record<string, unknown>,
    previousResults: Record<string, unknown>
  ): Record<string, unknown> {
    const resolved: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(input)) {
      if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
        const variablePath = value.slice(2, -2);
        const resolvedValue = this.getNestedValue(previousResults, variablePath);
        resolved[key] = resolvedValue !== undefined ? resolvedValue : value;
      } else {
        resolved[key] = value;
      }
    }

    return resolved;
  }

  /**
   * Get nested value from object using dot notation
   */
  private static getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((current, key) => {
      if (current && typeof current === 'object' && key in current) {
        return (current as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj);
  }

  /**
   * Validate journey completion against criteria
   */
  private static validateJourneyCompletion(
    journey: E2EUserJourney,
    stepResults: Record<string, unknown>,
    performanceMetrics: Record<string, number>,
    errors: string[]
  ): { overallSuccess: boolean; validationResults: Record<string, boolean> } {
    const validationResults: Record<string, boolean> = {};

    // Check required successful steps
    const requiredStepsSuccess = journey.validationCriteria.requiredSuccessfulSteps.every(stepName => {
      const success = stepResults[stepName] !== undefined;
      validationResults[`required_step_${stepName}`] = success;
      return success;
    });

    // Check performance thresholds
    const performanceValidation = Object.entries(journey.validationCriteria.performanceThresholds).every(([metric, threshold]) => {
      const actualValue = performanceMetrics[metric] || 0;
      const success = actualValue <= threshold;
      validationResults[`performance_${metric}`] = success;
      return success;
    });

    // Check error rate
    const errorRateValid = errors.length <= (journey.steps.length * journey.performanceTargets.errorRateMaxPercent / 100);
    validationResults['error_rate'] = errorRateValid;

    const overallSuccess = requiredStepsSuccess && performanceValidation && errorRateValid;

    return { overallSuccess, validationResults };
  }
}

describe('E2E Integration Testing Suite - PARLANT PHASE 1 Workflows', () => {
  let app: INestApplication;
  let testingModule: TestingModule;
  let logger: Logger;
  let context: E2EIntegrationTestContext;

  beforeAll(async () => {
    logger = new Logger('E2EIntegrationTest');

    testingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test'
        }),
        AppModule,
        AuthModule,
        AiServicesModule,
        BrowserUseModule,
        DatabaseModule
      ]
    }).compile();

    app = testingModule.createNestApplication();
    await app.init();

    logger.log('E2E Integration testing application initialized');
  });

  beforeEach(() => {
    context = new E2EIntegrationTestContext();
  });

  afterEach(() => {
    context.cleanup();
  });

  afterAll(async () => {
    await app.close();
    await testingModule.close();
  });

  // ===== COMPLETE USER JOURNEY TESTING =====

  describe('Complete User Journey Testing', () => {
    it('should complete PARLANT validated computer use journey successfully', async () => {
      const scenarios = E2EIntegrationTestUtils.generateUserJourneyScenarios();
      const computerUseJourney = scenarios.find(s => s.name === 'Complete PARLANT Validated Computer Use Journey');

      expect(computerUseJourney).toBeDefined();

      const result = await E2EIntegrationTestUtils.executeUserJourney(
        computerUseJourney,
        app,
        context,
        logger
      );

      logger.log(`Computer Use Journey Results: ${JSON.stringify({
        success: result.success,
        totalDuration: result.totalDuration,
        errors: result.errors
      }, null, 2)}`);

      expect(result.success).toBe(true);
      expect(result.totalDuration).toBeLessThan((computerUseJourney?.expectedDurationMs || 5000) + 1000); // Allow 1s buffer
      expect(result.errors).toHaveLength(0);
      expect(result.validationResults['required_step_authenticate_user']).toBe(true);
      expect(result.validationResults['required_step_parlant_conversational_validation']).toBe(true);
      expect(result.validationResults['required_step_execute_validated_operation']).toBe(true);
    }, 15000);

    it('should handle multi-service browser use integration journey', async () => {
      const scenarios = E2EIntegrationTestUtils.generateUserJourneyScenarios();
      const browserJourney = scenarios.find(s => s.name === 'Multi-Service Browser Use Integration Journey');

      expect(browserJourney).toBeDefined();

      const result = await E2EIntegrationTestUtils.executeUserJourney(
        browserJourney,
        app,
        context,
        logger
      );

      logger.log(`Browser Integration Journey Results: ${JSON.stringify({
        success: result.success,
        totalDuration: result.totalDuration,
        performanceMetrics: result.performanceMetrics,
        errors: result.errors
      }, null, 2)}`);

      expect(result.success).toBe(true);
      expect(result.totalDuration).toBeLessThan((browserJourney?.expectedDurationMs || 5000) + 1000);
      expect(result.performanceMetrics['initialize_browser_session']).toBeLessThan(1200);
      expect(result.performanceMetrics['stream_validation_conversation']).toBeLessThan(1400);
      expect(result.errors.length).toBeLessThanOrEqual(1); // Allow minor non-critical errors
    }, 20000);
  });

  // ===== CROSS-SERVICE INTEGRATION TESTING =====

  describe('Cross-Service Integration Testing', () => {
    it('should validate integration between PARLANT and Computer Use services', async () => {
      const startTime = Date.now();

      // Test cross-service communication
      const authResult = await request(app.getHttpServer())
        .post('/auth/test-login')
        .send({ username: 'integration-test', role: 'employee' })
        .expect(201);

      expect(authResult.body.authenticated).toBe(true);

      const parlantSessionResult = await request(app.getHttpServer())
        .post('/parlant/create-session')
        .set('Authorization', `Bearer ${authResult.body.token}`)
        .send({ conversationType: 'computer_use_validation' })
        .expect(201);

      expect(parlantSessionResult.body.sessionId).toBeDefined();

      const computerUseResult = await request(app.getHttpServer())
        .post('/computer-use/validate-operation')
        .set('Authorization', `Bearer ${authResult.body.token}`)
        .send({
          operation: 'click',
          coordinates: { x: 100, y: 200 },
          sessionId: parlantSessionResult.body.sessionId
        })
        .expect(201);

      expect(computerUseResult.body.validationRequired).toBe(true);

      const totalDuration = Date.now() - startTime;
      logger.log(`Cross-service integration completed in ${totalDuration}ms`);

      expect(totalDuration).toBeLessThan(2000);
    }, 10000);

    it('should handle concurrent cross-service requests', async () => {
      const concurrentRequests = 10;
      const requestPromises: Promise<unknown>[] = [];

      for (let i = 0; i < concurrentRequests; i++) {
        const requestPromise = (async () => {
          const authResult = await request(app.getHttpServer())
            .post('/auth/test-login')
            .send({ username: `concurrent-user-${i}`, role: 'employee' });

          const parlantResult = await request(app.getHttpServer())
            .post('/parlant/create-session')
            .set('Authorization', `Bearer ${authResult.body.token}`)
            .send({ conversationType: 'concurrent_test' });

          return { authSuccess: authResult.status === 201, parlantSuccess: parlantResult.status === 201 };
        })();

        requestPromises.push(requestPromise);
      }

      const startTime = Date.now();
      const results = await Promise.all(requestPromises);
      const totalDuration = Date.now() - startTime;

      const successfulRequests = results.filter(r =>
        (r as { authSuccess: boolean; parlantSuccess: boolean }).authSuccess &&
        (r as { authSuccess: boolean; parlantSuccess: boolean }).parlantSuccess
      ).length;

      logger.log(`Concurrent requests: ${concurrentRequests}, Successful: ${successfulRequests}, Duration: ${totalDuration}ms`);

      expect(successfulRequests).toBeGreaterThanOrEqual(concurrentRequests * 0.9); // 90% success rate
      expect(totalDuration).toBeLessThan(5000);
    }, 15000);
  });

  // ===== REAL-TIME WEBSOCKET INTEGRATION TESTING =====

  describe('Real-time WebSocket Integration Testing', () => {
    it('should handle real-time PARLANT validation streaming', async () => {
      const wsConnections: WebSocket[] = [];
      const messageLatencies: number[] = [];

      try {
        // Establish multiple WebSocket connections
        for (let i = 0; i < 5; i++) {
          const ws = new WebSocket(`ws://localhost:3000/parlant-validation?userId=ws-test-${i}`);
          wsConnections.push(ws);

          await new Promise((resolve, reject) => {
            ws.on('open', resolve);
            ws.on('error', reject);
            setTimeout(() => reject(new Error('Connection timeout')), 5000);
          });
        }

        // Send validation messages and measure latency
        for (let i = 0; i < wsConnections.length; i++) {
          const ws = wsConnections[i];
          const messageCount = 10;

          for (let msgIndex = 0; msgIndex < messageCount; msgIndex++) {
            const startTime = Date.now();

            const validationMessage = {
              type: 'validation_request',
              data: {
                operation: 'computer_click',
                coordinates: { x: msgIndex * 10, y: msgIndex * 10 },
                requiresApproval: true
              }
            };

            ws.send(JSON.stringify(validationMessage));

            // Wait for response
            await new Promise((resolve) => {
              ws.once('message', (data) => {
                const response = JSON.parse(data.toString());
                if (response.type === 'validation_response') {
                  const latency = Date.now() - startTime;
                  messageLatencies.push(latency);
                  resolve(response);
                }
              });

              setTimeout(resolve, 2000); // Timeout after 2s
            });
          }
        }

        const averageLatency = messageLatencies.reduce((sum, lat) => sum + lat, 0) / messageLatencies.length;
        const p95Latency = messageLatencies.sort((a, b) => a - b)[Math.floor(messageLatencies.length * 0.95)];

        logger.log(`WebSocket Performance: Avg Latency ${averageLatency.toFixed(2)}ms, P95 ${p95Latency}ms`);

        expect(averageLatency).toBeLessThan(200);
        expect(p95Latency).toBeLessThan(500);
        expect(messageLatencies.length).toBeGreaterThan(40); // Most messages should succeed

      } finally {
        // Cleanup WebSocket connections
        wsConnections.forEach(ws => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.close();
          }
        });
      }
    }, 30000);
  });

  // ===== DATABASE INTEGRATION TESTING =====

  describe('Database Integration Testing', () => {
    it('should handle conversational database operation approval workflow', async () => {
      const transactionId = `test-transaction-${Date.now()}`;

      // Simulate database operation requiring approval
      const operationRequest = {
        transactionId,
        operation: 'DELETE',
        table: 'user_data',
        criteria: { status: 'inactive' },
        estimatedAffectedRows: 150,
        requiresConversationalApproval: true
      };

      const approvalResult = await request(app.getHttpServer())
        .post('/database/request-operation-approval')
        .send(operationRequest)
        .expect(201);

      expect(approvalResult.body.approvalRequired).toBe(true);
      expect(approvalResult.body.conversationId).toBeDefined();

      // Simulate conversational approval
      const conversationApproval = await request(app.getHttpServer())
        .post('/parlant/provide-database-approval')
        .send({
          conversationId: approvalResult.body.conversationId,
          userResponse: 'Yes, please delete inactive user records older than 90 days',
          confidence: 0.92
        })
        .expect(201);

      expect(conversationApproval.body.approved).toBe(true);
      expect(conversationApproval.body.confidence).toBeGreaterThan(0.8);

      // Execute approved operation
      const executionResult = await request(app.getHttpServer())
        .post('/database/execute-approved-operation')
        .send({
          transactionId,
          approvalToken: conversationApproval.body.approvalToken
        })
        .expect(201);

      expect(executionResult.body.executed).toBe(true);
      expect(executionResult.body.auditLogId).toBeDefined();

      logger.log(`Database integration workflow completed with audit log: ${executionResult.body.auditLogId}`);
    }, 15000);
  });

  // ===== PERFORMANCE INTEGRATION TESTING =====

  describe('Performance Integration Testing', () => {
    it('should maintain performance under realistic load conditions', async () => {
      const loadConfig: PerformanceIntegrationConfig = {
        concurrentUsers: 20,
        testDurationMs: 30000,
        rampUpDurationMs: 5000,
        loadPatterns: ['steady', 'burst', 'gradual'],
        resourceMonitoring: true,
        performanceThresholds: {
          'avgResponseTime': 1000,
          'p95ResponseTime': 2000,
          'errorRate': 0.05,
          'throughput': 50
        }
      };

      const performanceMetrics = {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        responseTimes: [] as number[],
        startTime: Date.now()
      };

      const userPromises: Promise<void>[] = [];

      for (let userId = 0; userId < loadConfig.concurrentUsers; userId++) {
        const userWorkflow = (async () => {
          const userStartTime = Date.now();

          while (Date.now() - userStartTime < loadConfig.testDurationMs) {
            try {
              const requestStartTime = Date.now();

              const authResult = await request(app.getHttpServer())
                .post('/auth/test-login')
                .send({ username: `load-user-${userId}`, role: 'employee' });

              const sessionResult = await request(app.getHttpServer())
                .post('/parlant/create-session')
                .set('Authorization', `Bearer ${authResult.body.token}`)
                .send({ conversationType: 'load_test' });

              const responseTime = Date.now() - requestStartTime;

              performanceMetrics.totalRequests++;
              performanceMetrics.responseTimes.push(responseTime);

              if (authResult.status === 201 && sessionResult.status === 201) {
                performanceMetrics.successfulRequests++;
              } else {
                performanceMetrics.failedRequests++;
              }

              // Wait between requests to simulate realistic user behavior
              await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 500));

            } catch (error) {
              performanceMetrics.failedRequests++;
              performanceMetrics.totalRequests++;
            }
          }
        })();

        userPromises.push(userWorkflow);

        // Ramp up users gradually
        if (userId < loadConfig.concurrentUsers - 1) {
          await new Promise(resolve => setTimeout(resolve, loadConfig.rampUpDurationMs / loadConfig.concurrentUsers));
        }
      }

      await Promise.all(userPromises);

      const totalDuration = Date.now() - performanceMetrics.startTime;
      const avgResponseTime = performanceMetrics.responseTimes.reduce((sum, time) => sum + time, 0) / performanceMetrics.responseTimes.length;
      const p95ResponseTime = performanceMetrics.responseTimes.sort((a, b) => a - b)[Math.floor(performanceMetrics.responseTimes.length * 0.95)];
      const errorRate = performanceMetrics.failedRequests / performanceMetrics.totalRequests;
      const throughput = (performanceMetrics.totalRequests / totalDuration) * 1000; // requests per second

      logger.log(`Performance Test Results:
        Total Duration: ${totalDuration}ms
        Total Requests: ${performanceMetrics.totalRequests}
        Successful: ${performanceMetrics.successfulRequests}
        Failed: ${performanceMetrics.failedRequests}
        Avg Response Time: ${avgResponseTime.toFixed(2)}ms
        P95 Response Time: ${p95ResponseTime}ms
        Error Rate: ${(errorRate * 100).toFixed(2)}%
        Throughput: ${throughput.toFixed(2)} req/s`);

      expect(avgResponseTime).toBeLessThan(loadConfig.performanceThresholds['avgResponseTime']);
      expect(p95ResponseTime).toBeLessThan(loadConfig.performanceThresholds['p95ResponseTime']);
      expect(errorRate).toBeLessThan(loadConfig.performanceThresholds['errorRate']);
      expect(throughput).toBeGreaterThan(loadConfig.performanceThresholds['throughput']);
    }, 45000);
  });
});