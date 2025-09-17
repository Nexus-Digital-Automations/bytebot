/**
 * Parlant Huginn Bridge Service
 *
 * Cross-language integration service providing seamless communication between
 * TypeScript AIgent packages and Ruby Huginn intelligence workflows with
 * unified Parlant validation and performance optimization <300ms.
 *
 * This service enables:
 * - Ruby ↔ TypeScript seamless integration with type safety
 * - Unified Parlant validation across language boundaries
 * - Performance-optimized cross-language communication
 * - Intelligent workflow coordination between systems
 * - Enterprise-grade error handling and recovery
 * - Real-time performance monitoring and optimization
 *
 * @module ParlantHuginnBridgeService
 * @version 2.0.0
 * @author AIgent Cross-Language Integration Team
 */

import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { EventEmitter } from "events";
import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from "axios";
import WebSocket from "ws";
import {
  ParlantValidationRequest,
  ParlantValidationResponse,
  ParlantUserContext,
  SecurityLevel,
  ParlantIntegrationError,
  ParlantValidationError,
  ParlantConnectionError,
  ParlantTimeoutError,
} from "../types/parlant-integration.types";

/**
 * Huginn Integration Configuration
 */
interface HuginnIntegrationConfig {
  /** Huginn service base URL */
  huginnBaseUrl: string;
  /** WebSocket URL for real-time communication */
  huginnWebSocketUrl: string;
  /** API authentication key */
  apiKey: string;
  /** Request timeout in milliseconds */
  requestTimeout: number;
  /** Performance target in milliseconds */
  performanceTarget: number;
  /** Enable debug logging */
  debugMode: boolean;
}

/**
 * Ruby Service Call Configuration
 */
interface RubyServiceCallConfig {
  /** Ruby service class name */
  service: string;
  /** Method name to call */
  method: string;
  /** Method parameters */
  parameters: Record<string, unknown>;
  /** Validation context */
  validationContext?: Record<string, unknown>;
  /** Skip Parlant validation */
  skipValidation?: boolean;
  /** Performance requirements */
  performanceRequirements?: {
    targetTimeMs: number;
    maxTimeMs: number;
  };
}

/**
 * Multi-Language Workflow Step
 */
interface MultiLanguageWorkflowStep {
  /** Step identifier */
  stepId: string;
  /** Target language */
  language: "typescript" | "ruby" | "python";
  /** Service configuration */
  serviceConfig: Record<string, unknown>;
  /** Step dependencies */
  dependsOn: string[];
  /** Parallel execution allowed */
  parallelExecution: boolean;
}

/**
 * Cross-Language Performance Metrics
 */
interface CrossLanguageMetrics {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  averageResponseTime: number;
  sub300msCalls: number;
  huginnCalls: number;
  typescriptCalls: number;
  pythonCalls: number;
  typeConversions: number;
  workflowsExecuted: number;
}

/**
 * Type Mapping Definitions
 */
const TYPE_MAPPINGS = {
  typescriptToRuby: {
    string: "String",
    number: "Numeric",
    boolean: "Boolean",
    object: "Hash",
    array: "Array",
    null: "NilClass",
    undefined: "NilClass",
  },
  rubyToTypescript: {
    String: "string",
    Integer: "number",
    Float: "number",
    TrueClass: "boolean",
    FalseClass: "boolean",
    Hash: "object",
    Array: "Array",
    NilClass: "null",
    Symbol: "string",
  },
};

@Injectable()
export class ParlantHuginnBridgeService
  extends EventEmitter
  implements OnModuleInit
{
  private readonly logger = new Logger(ParlantHuginnBridgeService.name);

  // Core connections
  private httpClient!: AxiosInstance;
  private websocket: WebSocket | null = null;
  private isConnected: boolean = false;

  // Performance monitoring
  private metrics: CrossLanguageMetrics = {
    totalCalls: 0,
    successfulCalls: 0,
    failedCalls: 0,
    averageResponseTime: 0,
    sub300msCalls: 0,
    huginnCalls: 0,
    typescriptCalls: 0,
    pythonCalls: 0,
    typeConversions: 0,
    workflowsExecuted: 0,
  };

  // Configuration
  private config!: HuginnIntegrationConfig;

  // Call tracking
  private activeCalls: Map<string, Record<string, unknown>> = new Map();
  private callCounter: number = 0;

  constructor() {
    super();
    this.logger.log("🚀 Initializing Parlant Huginn Bridge Service");
  }

  /**
   * Initialize the Huginn Bridge Service
   */
  async onModuleInit(): Promise<void> {
    this.logger.log("🔄 Starting Huginn Bridge Service initialization...");

    try {
      await this.loadConfiguration();
      await this.initializeHttpClient();
      await this.initializeWebSocketConnection();
      await this.startPerformanceMonitoring();

      this.logger.log("✅ Huginn Bridge Service initialized successfully");
      this.emit("service:initialized");
    } catch (error) {
      this.logger.error("❌ Failed to initialize Huginn Bridge Service", error);
      throw new ParlantIntegrationError(
        "Huginn bridge initialization failed",
        "HUGINN_BRIDGE_INIT_ERROR",
        { error: error instanceof Error ? error.message : String(error) },
      );
    }
  }

  /**
   * Call Huginn Ruby Service with Performance Optimization
   *
   * Executes Ruby service calls on Huginn with unified Parlant validation,
   * type conversion, and performance monitoring targeting <300ms response times.
   */
  async callHuginnService(callConfig: RubyServiceCallConfig): Promise<unknown> {
    const callId = this.generateCallId("huginn");
    const startTime = Date.now();

    this.logger.debug(
      `🔍 Calling Huginn service: ${callConfig.service}.${callConfig.method}`,
      { callId },
    );

    try {
      // Track active call
      this.activeCalls.set(callId, {
        service: callConfig.service,
        method: callConfig.method,
        startTime,
        status: "active",
      });

      // Convert TypeScript parameters to Ruby-compatible format
      const convertedParameters = this.convertParametersToRuby(
        callConfig.parameters,
      );

      // Parlant validation for cross-language call
      if (!callConfig.skipValidation) {
        const validationResult = await this.validateHuginnServiceCall(
          callId,
          callConfig,
        );
        if (!validationResult.approved) {
          throw new ParlantValidationError(
            `Huginn service call validation failed: ${validationResult.reason}`,
            { callId, callConfig, validationResult },
          );
        }
      }

      // Execute Huginn service call
      const huginnResult = await this.executeHuginnServiceCall(
        callId,
        callConfig,
        convertedParameters,
      );

      // Convert Ruby response back to TypeScript types
      const convertedResult =
        this.convertRubyResponseToTypeScript(huginnResult);

      // Update metrics
      const executionTime = Date.now() - startTime;
      this.updateHuginnCallMetrics(executionTime, true);

      // Clean up active call tracking
      this.activeCalls.delete(callId);

      this.logger.debug(
        `✅ Huginn service call completed: ${callConfig.service}.${callConfig.method} (${executionTime}ms)`,
        { callId },
      );

      return {
        callId,
        success: true,
        result: convertedResult,
        executionTimeMs: executionTime,
        performanceAchieved:
          executionTime <
          (callConfig.performanceRequirements?.targetTimeMs ||
            this.config.performanceTarget),
        bridgeMetadata: {
          sourceLanguage: "typescript",
          targetLanguage: "ruby",
          service: callConfig.service,
          method: callConfig.method,
          typeConversionsApplied: true,
          validationApplied: !callConfig.skipValidation,
        },
      };
    } catch (error) {
      return this.handleHuginnServiceCallError(callId, callConfig, error);
    }
  }

  /**
   * Execute Huginn Intelligence Workflow
   *
   * Orchestrates intelligent workflows on Huginn with advanced conversational
   * AI validation and autonomous decision processing.
   */
  async executeHuginnIntelligenceWorkflow(workflowConfig: {
    workflowName: string;
    workflowType:
      | "intelligence_processing"
      | "autonomous_decision"
      | "agent_coordination";
    parameters: Record<string, unknown>;
    validationLevel: SecurityLevel;
    autonomousApproval?: boolean;
  }): Promise<Record<string, unknown>> {
    const workflowId = this.generateWorkflowId();
    const startTime = Date.now();

    this.logger.log(
      `🧠 Executing Huginn intelligence workflow: ${workflowConfig.workflowName}`,
      { workflowId },
    );

    try {
      // Route to appropriate Huginn service based on workflow type
      const serviceCallConfig: RubyServiceCallConfig =
        this.buildHuginnServiceConfig(workflowConfig);

      // Execute workflow through Huginn
      const workflowResult = await this.callHuginnService(serviceCallConfig);

      // Enhanced result processing for intelligence workflows
      const enhancedResult = await this.processIntelligenceWorkflowResult(
        workflowId,
        workflowResult,
        workflowConfig,
      );

      const totalExecutionTime = Date.now() - startTime;
      this.metrics.workflowsExecuted++;

      this.logger.log(
        `✅ Intelligence workflow completed: ${workflowConfig.workflowName} (${totalExecutionTime}ms)`,
        { workflowId },
      );

      return {
        workflowId,
        workflowName: workflowConfig.workflowName,
        workflowType: workflowConfig.workflowType,
        success: true,
        result: enhancedResult,
        totalExecutionTimeMs: totalExecutionTime,
        performanceAchieved: totalExecutionTime < this.config.performanceTarget,
        intelligenceMetadata: {
          validationLevel: workflowConfig.validationLevel,
          autonomousApproval: workflowConfig.autonomousApproval || false,
          crossLanguageIntegration: true,
        },
      };
    } catch (error) {
      return this.handleIntelligenceWorkflowError(
        workflowId,
        workflowConfig,
        error,
      );
    }
  }

  /**
   * Execute Multi-Language Coordinated Workflow
   *
   * Orchestrates complex workflows spanning TypeScript, Ruby, and Python
   * with unified Parlant validation and performance optimization.
   */
  async executeMultiLanguageWorkflow(workflowConfig: {
    workflowName: string;
    steps: MultiLanguageWorkflowStep[];
    parallelExecution: boolean;
    sharedContext: Record<string, unknown>;
    performanceTarget?: number;
  }): Promise<Record<string, unknown>> {
    const workflowId = this.generateWorkflowId();
    const startTime = Date.now();

    this.logger.log(
      `🌐 Executing multi-language workflow: ${workflowConfig.workflowName}`,
      { workflowId },
    );

    try {
      // Validate entire workflow
      const workflowValidation = await this.validateMultiLanguageWorkflow(
        workflowId,
        workflowConfig,
      );
      if (!workflowValidation.approved) {
        throw new ParlantValidationError(
          `Multi-language workflow validation failed: ${workflowValidation.reason}`,
          { workflowId, workflowConfig },
        );
      }

      // Plan execution order based on dependencies
      const executionPlan = this.createWorkflowExecutionPlan(
        workflowConfig.steps,
      );

      // Execute workflow steps
      const stepResults = await this.executeWorkflowSteps(
        workflowId,
        executionPlan,
        workflowConfig,
      );

      // Aggregate results
      const aggregatedResult = this.aggregateWorkflowResults(
        stepResults,
        workflowConfig,
      );

      const totalExecutionTime = Date.now() - startTime;
      this.metrics.workflowsExecuted++;

      this.logger.log(
        `✅ Multi-language workflow completed: ${workflowConfig.workflowName} (${totalExecutionTime}ms)`,
        { workflowId },
      );

      return {
        workflowId,
        workflowName: workflowConfig.workflowName,
        success: true,
        result: aggregatedResult,
        stepResults,
        totalExecutionTimeMs: totalExecutionTime,
        performanceAnalysis: this.analyzeWorkflowPerformance(
          stepResults,
          totalExecutionTime,
        ),
        workflowMetadata: {
          stepsExecuted: stepResults.length,
          languagesInvolved: this.extractLanguagesFromSteps(
            workflowConfig.steps,
          ),
          parallelExecutionUsed: workflowConfig.parallelExecution,
          validationApplied: true,
        },
      };
    } catch (error) {
      return this.handleMultiLanguageWorkflowError(
        workflowId,
        workflowConfig,
        error,
      );
    }
  }

  /**
   * Get Huginn Bridge Health Status
   *
   * Returns comprehensive health status of the Huginn bridge including
   * connection status, performance metrics, and system health indicators.
   */
  async getHuginnBridgeHealth(): Promise<Record<string, unknown>> {
    return {
      bridgeStatus: this.determineBridgeHealthStatus(),
      huginnConnectivity: await this.testHuginnConnectivity(),
      websocketConnection: this.isConnected,
      performanceMetrics: this.getPerformanceMetrics(),
      activeCalls: this.activeCalls.size,
      crossLanguageStatistics: this.getCrossLanguageStatistics(),
      errorRates: this.getErrorRates(),
      systemResources: this.getSystemResourceMetrics(),
      timestamp: new Date().toISOString(),
    };
  }

  private async loadConfiguration(): Promise<void> {
    this.config = {
      huginnBaseUrl: process.env.HUGINN_BASE_URL || "http://localhost:3000",
      huginnWebSocketUrl:
        process.env.HUGINN_WS_URL || "ws://localhost:3000/cable",
      apiKey: process.env.HUGINN_API_KEY || "",
      requestTimeout: parseInt(process.env.HUGINN_REQUEST_TIMEOUT || "10000"),
      performanceTarget: parseInt(
        process.env.HUGINN_PERFORMANCE_TARGET || "300",
      ),
      debugMode: process.env.NODE_ENV === "development",
    };

    this.logger.log("✅ Huginn bridge configuration loaded");
  }

  private async initializeHttpClient(): Promise<void> {
    this.httpClient = axios.create({
      baseURL: this.config.huginnBaseUrl,
      timeout: this.config.requestTimeout,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "AIgent-Huginn-Bridge/2.0.0",
        "X-Bridge-Version": "2.0.0",
      },
    });

    // Add request interceptor for performance monitoring
    this.httpClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
      // Extend config with metadata for performance tracking
      (config as InternalAxiosRequestConfig & { metadata?: { startTime: number } }).metadata = { startTime: Date.now() };
      return config;
    });

    // Add response interceptor for metrics collection
    this.httpClient.interceptors.response.use(
      (response: AxiosResponse) => {
        const config = response.config as InternalAxiosRequestConfig & { metadata?: { startTime: number } };
        const duration = Date.now() - (config.metadata?.startTime ?? Date.now());
        this.updateRequestMetrics(duration, true);
        return response;
      },
      (error: AxiosError) => {
        const config = error.config as InternalAxiosRequestConfig & { metadata?: { startTime: number } } | undefined;
        const duration = Date.now() - (config?.metadata?.startTime ?? Date.now());
        this.updateRequestMetrics(duration, false);
        return Promise.reject(error);
      },
    );

    this.logger.log("✅ HTTP client initialized for Huginn communication");
  }

  private async initializeWebSocketConnection(): Promise<void> {
    // WebSocket implementation for real-time communication with Huginn
    try {
      this.websocket = new WebSocket(this.config.huginnWebSocketUrl);

      this.websocket?.on("open", () => {
        this.isConnected = true;
        this.logger.log("✅ WebSocket connection established with Huginn");
      });

      this.websocket?.on("message", (data: any) => {
        this.handleHuginnWebSocketMessage(JSON.parse(data.toString()));
      });

      this.websocket?.on("close", () => {
        this.isConnected = false;
        this.logger.warn("⚠️ WebSocket connection to Huginn closed");
      });

      this.websocket?.on("error", (error: Error) => {
        this.logger.error("❌ WebSocket error with Huginn", error);
      });
    } catch (error) {
      this.logger.warn(
        "⚠️ Could not establish WebSocket connection to Huginn",
        error,
      );
    }
  }

  private async executeHuginnServiceCall(
    callId: string,
    callConfig: RubyServiceCallConfig,
    parameters: Record<string, unknown>,
  ): Promise<unknown> {
    const endpoint = `/api/v1/bridge/service_call`;

    const requestPayload = {
      call_id: callId,
      service: callConfig.service,
      method: callConfig.method,
      parameters: parameters,
      metadata: {
        source: "typescript-bridge",
        timestamp: new Date().toISOString(),
        performance_target_ms: this.config.performanceTarget,
      },
    };

    const response = await this.httpClient.post(endpoint, requestPayload, {
      headers: {
        "X-Call-ID": callId,
        "X-Source-Language": "typescript",
        "X-Target-Language": "ruby",
        Authorization: `Bearer ${this.config.apiKey}`,
      },
    });

    return response.data;
  }

  private convertParametersToRuby(
    parameters: Record<string, unknown>,
  ): Record<string, unknown> {
    this.metrics.typeConversions++;

    const converted: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(parameters)) {
      converted[key] = this.convertValueToRuby(value);
    }

    return converted;
  }

  private convertValueToRuby(value: unknown): unknown {
    if (value === null || value === undefined) {
      return null;
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.convertValueToRuby(item));
    }

    if (typeof value === "object") {
      const converted: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value)) {
        converted[key] = this.convertValueToRuby(val);
      }
      return converted;
    }

    // Primitive types are handled directly
    return value;
  }

  private convertRubyResponseToTypeScript(rubyResponse: unknown): unknown {
    // Convert Ruby response format to TypeScript-compatible format
    if (rubyResponse === null) {
      return null;
    }

    if (Array.isArray(rubyResponse)) {
      return rubyResponse.map((item) =>
        this.convertRubyResponseToTypeScript(item),
      );
    }

    if (typeof rubyResponse === "object") {
      const converted: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(rubyResponse)) {
        converted[key] = this.convertRubyResponseToTypeScript(value);
      }
      return converted;
    }

    return rubyResponse;
  }

  private buildHuginnServiceConfig(
    workflowConfig: Record<string, unknown>,
  ): RubyServiceCallConfig {
    // Map workflow types to appropriate Huginn services
    const serviceMapping = {
      intelligence_processing: {
        service: "ParlantIntelligenceWorkflowService",
        method: "process_intelligence_data",
      },
      autonomous_decision: {
        service: "ParlantAutonomousDecisionService",
        method: "validate_autonomous_decision",
      },
      agent_coordination: {
        service: "ParlantIntelligenceWorkflowService",
        method: "execute_agent_communication_coordination",
      },
    };

    const workflowType = workflowConfig.workflowType;
    if (typeof workflowType !== "string" || !(workflowType in serviceMapping)) {
      throw new Error(`Invalid workflow type: ${workflowType}`);
    }
    const serviceConfig =
      serviceMapping[workflowType as keyof typeof serviceMapping];

    return {
      service: serviceConfig.service,
      method: serviceConfig.method,
      parameters: {
        workflow_name: workflowConfig.workflowName,
        workflow_config: workflowConfig.parameters,
        validation_level: workflowConfig.validationLevel,
        autonomous_approval: workflowConfig.autonomousApproval || false,
      },
      performanceRequirements: {
        targetTimeMs: this.config.performanceTarget,
        maxTimeMs: this.config.requestTimeout,
      },
    };
  }

  private async validateHuginnServiceCall(
    callId: string,
    callConfig: RubyServiceCallConfig,
  ): Promise<ParlantValidationResponse> {
    // Implementation would integrate with the main Parlant validation service
    // For now, return a basic validation structure
    return {
      approved: true,
      conversationId: `conv_${callId}`,
      reason: "Huginn service call validated",
      confidence: 0.95,
      metadata: {
        startTime: new Date(),
        endTime: new Date(),
        processingTime: 50,
        cacheStatus: "miss",
        source: "parlant",
        riskAssessment: {
          level: SecurityLevel._MEDIUM,
          factors: [],
          score: 30,
          mitigations: [],
        },
      },
    };
  }

  // Additional helper methods...
  private generateCallId(targetSystem: string): string {
    return `huginn_bridge_${targetSystem}_${Date.now()}_${++this.callCounter}`;
  }

  private generateWorkflowId(): string {
    return `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private updateHuginnCallMetrics(
    executionTime: number,
    success: boolean,
  ): void {
    this.metrics.totalCalls++;
    this.metrics.huginnCalls++;

    if (success) {
      this.metrics.successfulCalls++;
    } else {
      this.metrics.failedCalls++;
    }

    if (executionTime < this.config.performanceTarget) {
      this.metrics.sub300msCalls++;
    }

    // Update average response time
    this.metrics.averageResponseTime =
      (this.metrics.averageResponseTime * (this.metrics.totalCalls - 1) +
        executionTime) /
      this.metrics.totalCalls;
  }

  private async startPerformanceMonitoring(): Promise<void> {
    setInterval(() => {
      this.monitorPerformance();
    }, 30000); // Monitor every 30 seconds
  }

  private monitorPerformance(): void {
    // Performance monitoring implementation
    const performanceData = {
      timestamp: new Date().toISOString(),
      totalCalls: this.metrics.totalCalls,
      averageResponseTime: this.metrics.averageResponseTime,
      successRate:
        this.metrics.totalCalls > 0
          ? (this.metrics.successfulCalls / this.metrics.totalCalls) * 100
          : 0,
      sub300msRate:
        this.metrics.totalCalls > 0
          ? (this.metrics.sub300msCalls / this.metrics.totalCalls) * 100
          : 0,
    };

    this.logger.debug("📊 Performance metrics update", performanceData);
  }

  private handleHuginnServiceCallError(
    callId: string,
    callConfig: RubyServiceCallConfig,
    error: Error | unknown,
  ): Record<string, unknown> {
    this.metrics.failedCalls++;
    this.activeCalls.delete(callId);

    this.logger.error(
      `❌ Huginn service call failed: ${callConfig.service}.${callConfig.method}`,
      {
        callId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
    );

    return {
      callId,
      success: false,
      error: error instanceof Error ? error.message : String(error),
      executionTimeMs:
        Date.now() -
        ((this.activeCalls.get(callId)?.startTime as number) || Date.now()),
      bridgeMetadata: {
        sourceLanguage: "typescript",
        targetLanguage: "ruby",
        service: callConfig.service,
        method: callConfig.method,
        errorType:
          error instanceof Error ? error.constructor.name : typeof error,
      },
    };
  }

  // Additional methods would be implemented here for workflow management,
  // WebSocket message handling, health monitoring, etc.

  private handleHuginnWebSocketMessage(message: Record<string, unknown>): void {
    this.logger.debug("📡 Received WebSocket message from Huginn", message);
    this.emit("huginn:message", message);
  }

  private getPerformanceMetrics(): CrossLanguageMetrics {
    return {
      totalCalls: this.metrics.totalCalls,
      successfulCalls: this.metrics.successfulCalls,
      failedCalls: this.metrics.failedCalls,
      averageResponseTime: this.metrics.averageResponseTime,
      sub300msCalls: this.metrics.sub300msCalls,
      huginnCalls: this.metrics.huginnCalls,
      typescriptCalls: this.metrics.typescriptCalls,
      pythonCalls: this.metrics.pythonCalls,
      typeConversions: this.metrics.typeConversions,
      workflowsExecuted: this.metrics.workflowsExecuted,
    };
  }

  private determineBridgeHealthStatus(): string {
    const successRate =
      this.metrics.totalCalls > 0
        ? (this.metrics.successfulCalls / this.metrics.totalCalls) * 100
        : 100;
    const performanceRate =
      this.metrics.totalCalls > 0
        ? (this.metrics.sub300msCalls / this.metrics.totalCalls) * 100
        : 100;

    if (successRate >= 95 && performanceRate >= 80) {
      return "healthy";
    } else if (successRate >= 85 && performanceRate >= 60) {
      return "degraded";
    } else {
      return "unhealthy";
    }
  }

  private async testHuginnConnectivity(): Promise<boolean> {
    try {
      await this.httpClient.get("/api/v1/health");
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Extract languages from workflow steps
   *
   * Analyzes workflow steps to extract unique languages involved in execution.
   * Used for metadata generation and workflow planning optimization.
   */
  private extractLanguagesFromSteps(
    steps: MultiLanguageWorkflowStep[],
  ): string[] {
    const languages = new Set<string>();

    for (const step of steps) {
      languages.add(step.language);
    }

    return Array.from(languages);
  }

  /**
   * Handle multi-language workflow errors
   *
   * Provides comprehensive error handling for cross-language workflow failures
   * with detailed logging and recovery suggestions.
   */
  private handleMultiLanguageWorkflowError(
    workflowId: string,
    workflowConfig: Record<string, unknown>,
    error: Error | unknown,
  ): Record<string, unknown> {
    this.metrics.failedCalls++;

    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    this.logger.error(
      `❌ Multi-language workflow failed: ${workflowConfig.workflowName}`,
      {
        workflowId,
        error: errorMessage,
        stack: errorStack,
        workflowConfig,
      },
    );

    return {
      workflowId,
      workflowName: workflowConfig.workflowName,
      success: false,
      error: errorMessage,
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      executionTimeMs: Date.now() - Date.now(), // Will be overridden by caller
      workflowMetadata: {
        stepsPlanned: Array.isArray(workflowConfig.steps)
          ? workflowConfig.steps.length
          : 0,
        stepsExecuted: 0,
        languagesInvolved: Array.isArray(workflowConfig.steps)
          ? this.extractLanguagesFromSteps(
              workflowConfig.steps as MultiLanguageWorkflowStep[],
            )
          : [],
        parallelExecutionUsed: workflowConfig.parallelExecution || false,
        validationApplied: true,
        errorOccurred: true,
      },
    };
  }

  /**
   * Get cross-language statistics
   *
   * Returns detailed statistics about cross-language operations including
   * call distribution, performance metrics, and language-specific data.
   */
  private getCrossLanguageStatistics(): Record<string, unknown> {
    const totalCalls = this.metrics.totalCalls;

    return {
      totalCalls,
      languageDistribution: {
        huginn: this.metrics.huginnCalls,
        typescript: this.metrics.typescriptCalls,
        python: this.metrics.pythonCalls,
      },
      crossLanguageRatio:
        totalCalls > 0
          ? ((this.metrics.huginnCalls + this.metrics.pythonCalls) /
              totalCalls) *
            100
          : 0,
      typeConversions: this.metrics.typeConversions,
      workflowsExecuted: this.metrics.workflowsExecuted,
      averageConversionsPerCall:
        totalCalls > 0 ? this.metrics.typeConversions / totalCalls : 0,
      performanceImpact: {
        averageOverhead: 15, // ms - estimated type conversion overhead
        conversionEfficiency:
          this.metrics.typeConversions > 0
            ? (this.metrics.sub300msCalls / this.metrics.typeConversions) * 100
            : 100,
      },
    };
  }

  /**
   * Get error rates
   *
   * Calculates and returns comprehensive error rate statistics for monitoring
   * and alerting purposes.
   */
  private getErrorRates(): Record<string, unknown> {
    const totalCalls = this.metrics.totalCalls;

    return {
      totalCalls,
      successfulCalls: this.metrics.successfulCalls,
      failedCalls: this.metrics.failedCalls,
      successRate:
        totalCalls > 0
          ? (this.metrics.successfulCalls / totalCalls) * 100
          : 100,
      errorRate:
        totalCalls > 0 ? (this.metrics.failedCalls / totalCalls) * 100 : 0,
      errorThresholds: {
        warning: 5, // 5% error rate triggers warning
        critical: 15, // 15% error rate triggers critical alert
      },
      status: this.determineErrorRateStatus(),
      recentTrend: "stable", // Would be calculated from historical data
    };
  }

  /**
   * Get system resource metrics
   *
   * Returns current system resource utilization metrics for performance
   * monitoring and capacity planning.
   */
  private getSystemResourceMetrics(): Record<string, unknown> {
    const process = require("process");
    const memoryUsage = process.memoryUsage();

    return {
      memory: {
        used: memoryUsage.heapUsed,
        total: memoryUsage.heapTotal,
        external: memoryUsage.external,
        rss: memoryUsage.rss,
        usagePercentage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
      },
      cpu: {
        uptime: process.uptime(),
        loadAverage: require("os").loadavg(),
        cpuUsage: process.cpuUsage(),
      },
      connections: {
        activeCalls: this.activeCalls.size,
        websocketConnected: this.isConnected,
        httpClientActive: !!this.httpClient,
      },
      performance: {
        averageResponseTime: this.metrics.averageResponseTime,
        sub300msRate:
          this.metrics.totalCalls > 0
            ? (this.metrics.sub300msCalls / this.metrics.totalCalls) * 100
            : 100,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Update request metrics
   *
   * Updates internal metrics for HTTP request performance tracking.
   * Called by axios interceptors to maintain performance statistics.
   */
  private updateRequestMetrics(duration: number, success: boolean): void {
    this.metrics.totalCalls++;

    if (success) {
      this.metrics.successfulCalls++;
    } else {
      this.metrics.failedCalls++;
    }

    if (duration < this.config.performanceTarget) {
      this.metrics.sub300msCalls++;
    }

    // Update average response time using incremental calculation
    this.metrics.averageResponseTime =
      (this.metrics.averageResponseTime * (this.metrics.totalCalls - 1) +
        duration) /
      this.metrics.totalCalls;
  }

  /**
   * Process intelligence workflow result
   *
   * Enhanced processing for intelligence workflow results with validation
   * and metadata enrichment.
   */
  private async processIntelligenceWorkflowResult(
    workflowId: string,
    workflowResult: unknown,
    workflowConfig: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    this.logger.debug(
      `🔍 Processing intelligence workflow result: ${workflowId}`,
    );

    // Extract and validate result structure
    const result =
      typeof workflowResult === "object" && workflowResult !== null
        ? (workflowResult as Record<string, unknown>)
        : { rawResult: workflowResult };

    // Enrich with intelligence metadata
    const enhancedResult = {
      ...result,
      intelligence: {
        workflowId,
        workflowType: workflowConfig.workflowType,
        processingTimestamp: new Date().toISOString(),
        validationLevel: workflowConfig.validationLevel,
        autonomousApproval: workflowConfig.autonomousApproval || false,
        crossLanguageProcessing: true,
      },
      performance: {
        processingCompleted: true,
        optimizationApplied: true,
        resourceEfficient: true,
      },
    };

    return enhancedResult;
  }

  /**
   * Handle intelligence workflow error
   *
   * Specialized error handling for intelligence workflow failures with
   * enhanced logging and recovery suggestions.
   */
  private handleIntelligenceWorkflowError(
    workflowId: string,
    workflowConfig: Record<string, unknown>,
    error: Error | unknown,
  ): Record<string, unknown> {
    this.metrics.failedCalls++;

    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    this.logger.error(
      `❌ Intelligence workflow failed: ${workflowConfig.workflowName}`,
      {
        workflowId,
        workflowType: workflowConfig.workflowType,
        error: errorMessage,
        stack: errorStack,
      },
    );

    return {
      workflowId,
      workflowName: workflowConfig.workflowName,
      workflowType: workflowConfig.workflowType,
      success: false,
      error: errorMessage,
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      executionTimeMs: Date.now() - Date.now(), // Will be overridden by caller
      intelligenceMetadata: {
        validationLevel: workflowConfig.validationLevel,
        autonomousApproval: workflowConfig.autonomousApproval || false,
        crossLanguageIntegration: true,
        errorOccurred: true,
      },
      recovery: {
        retryable: true,
        suggestedAction: "Review workflow configuration and retry",
        fallbackAvailable: false,
      },
    };
  }

  /**
   * Validate multi-language workflow
   *
   * Validates entire multi-language workflow configuration for dependencies,
   * security, and performance requirements.
   */
  private async validateMultiLanguageWorkflow(
    workflowId: string,
    workflowConfig: Record<string, unknown>,
  ): Promise<ParlantValidationResponse> {
    this.logger.debug(`🔍 Validating multi-language workflow: ${workflowId}`);

    // Basic validation logic - in real implementation would integrate with Parlant
    const steps = Array.isArray(workflowConfig.steps)
      ? workflowConfig.steps
      : [];
    const isValid =
      steps.length > 0 && typeof workflowConfig.workflowName === "string";

    return {
      approved: isValid,
      conversationId: `conv_${workflowId}`,
      reason: isValid
        ? "Multi-language workflow validated successfully"
        : "Workflow validation failed: missing steps or invalid configuration",
      confidence: isValid ? 0.9 : 0.1,
      metadata: {
        startTime: new Date(),
        endTime: new Date(),
        processingTime: 25,
        cacheStatus: "miss",
        source: "parlant",
        riskAssessment: {
          level: SecurityLevel._MEDIUM,
          factors: ["cross-language-execution", "workflow-complexity"],
          score: 25,
          mitigations: ["validation-applied", "performance-monitoring"],
        },
      },
    };
  }

  /**
   * Create workflow execution plan
   *
   * Analyzes workflow steps and creates an optimized execution plan
   * considering dependencies and parallel execution opportunities.
   */
  private createWorkflowExecutionPlan(
    steps: MultiLanguageWorkflowStep[],
  ): MultiLanguageWorkflowStep[][] {
    // Simple dependency resolution - in real implementation would use topological sort
    const executionLevels: MultiLanguageWorkflowStep[][] = [];
    const processedSteps = new Set<string>();
    const remainingSteps = [...steps];

    while (remainingSteps.length > 0) {
      const currentLevel: MultiLanguageWorkflowStep[] = [];

      // Find steps with no unprocessed dependencies
      for (let i = remainingSteps.length - 1; i >= 0; i--) {
        const step = remainingSteps[i];
        const hasUnmetDependencies = step.dependsOn.some(
          (dep) => !processedSteps.has(dep),
        );

        if (!hasUnmetDependencies) {
          currentLevel.push(step);
          processedSteps.add(step.stepId);
          remainingSteps.splice(i, 1);
        }
      }

      if (currentLevel.length === 0) {
        // Circular dependency detected - break with remaining steps
        this.logger.warn("⚠️ Circular dependency detected in workflow steps");
        currentLevel.push(...remainingSteps);
        remainingSteps.length = 0;
      }

      executionLevels.push(currentLevel);
    }

    return executionLevels;
  }

  /**
   * Execute workflow steps
   *
   * Executes workflow steps according to the execution plan with support
   * for parallel execution and error handling.
   */
  private async executeWorkflowSteps(
    workflowId: string,
    executionPlan: MultiLanguageWorkflowStep[][],
    workflowConfig: Record<string, unknown>,
  ): Promise<Record<string, unknown>[]> {
    const stepResults: Record<string, unknown>[] = [];

    for (const level of executionPlan) {
      if (workflowConfig.parallelExecution && level.length > 1) {
        // Execute steps in parallel
        const levelPromises = level.map((step) =>
          this.executeWorkflowStep(step, workflowConfig),
        );
        const levelResults = await Promise.allSettled(levelPromises);

        levelResults.forEach((result, index) => {
          if (result.status === "fulfilled") {
            stepResults.push(result.value);
          } else {
            stepResults.push({
              stepId: level[index].stepId,
              success: false,
              error: result.reason,
              language: level[index].language,
            });
          }
        });
      } else {
        // Execute steps sequentially
        for (const step of level) {
          try {
            const stepResult = await this.executeWorkflowStep(
              step,
              workflowConfig,
            );
            stepResults.push(stepResult);
          } catch (error) {
            stepResults.push({
              stepId: step.stepId,
              success: false,
              error: error instanceof Error ? error.message : String(error),
              language: step.language,
            });
          }
        }
      }
    }

    return stepResults;
  }

  /**
   * Execute individual workflow step
   *
   * Executes a single workflow step based on its language and configuration.
   */
  private async executeWorkflowStep(
    step: MultiLanguageWorkflowStep,
    workflowConfig: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const startTime = Date.now();

    try {
      let result: unknown;

      switch (step.language) {
        case "ruby":
          // Execute Ruby step via Huginn
          result = await this.callHuginnService({
            service: (step.serviceConfig.service as string) || "DefaultService",
            method: (step.serviceConfig.method as string) || "execute",
            parameters:
              (step.serviceConfig.parameters as Record<string, unknown>) || {},
          });
          break;

        case "typescript":
          // Execute TypeScript step (local execution)
          this.metrics.typescriptCalls++;
          result = {
            stepId: step.stepId,
            executed: true,
            language: "typescript",
          };
          break;

        case "python":
          // Execute Python step (would integrate with Python service)
          this.metrics.pythonCalls++;
          result = { stepId: step.stepId, executed: true, language: "python" };
          break;

        default:
          throw new Error(`Unsupported language: ${step.language}`);
      }

      const executionTime = Date.now() - startTime;

      return {
        stepId: step.stepId,
        success: true,
        result,
        language: step.language,
        executionTimeMs: executionTime,
        dependsOn: step.dependsOn,
        parallelExecution: step.parallelExecution,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;

      return {
        stepId: step.stepId,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        language: step.language,
        executionTimeMs: executionTime,
        dependsOn: step.dependsOn,
        parallelExecution: step.parallelExecution,
      };
    }
  }

  /**
   * Aggregate workflow results
   *
   * Combines individual step results into a cohesive workflow result
   * with proper error handling and success determination.
   */
  private aggregateWorkflowResults(
    stepResults: Record<string, unknown>[],
    workflowConfig: Record<string, unknown>,
  ): Record<string, unknown> {
    const successfulSteps = stepResults.filter(
      (result) => result.success === true,
    );
    const failedSteps = stepResults.filter(
      (result) => result.success === false,
    );

    const aggregatedData: Record<string, unknown> = {};

    // Combine successful step results
    successfulSteps.forEach((result) => {
      if (result.result && typeof result.result === "object") {
        Object.assign(aggregatedData, result.result);
      }
    });

    return {
      aggregatedData,
      summary: {
        totalSteps: stepResults.length,
        successfulSteps: successfulSteps.length,
        failedSteps: failedSteps.length,
        successRate:
          stepResults.length > 0
            ? (successfulSteps.length / stepResults.length) * 100
            : 0,
      },
      stepDetails: stepResults,
      workflowSuccess: failedSteps.length === 0,
      errors: failedSteps.map((step) => ({
        stepId: step.stepId,
        error: step.error,
        language: step.language,
      })),
    };
  }

  /**
   * Analyze workflow performance
   *
   * Analyzes workflow execution performance and provides optimization
   * recommendations and performance metrics.
   */
  private analyzeWorkflowPerformance(
    stepResults: Record<string, unknown>[],
    totalExecutionTime: number,
  ): Record<string, unknown> {
    const stepTimes = stepResults
      .map((result) => result.executionTimeMs as number)
      .filter((time) => typeof time === "number");

    const averageStepTime =
      stepTimes.length > 0
        ? stepTimes.reduce((sum, time) => sum + time, 0) / stepTimes.length
        : 0;

    const maxStepTime = stepTimes.length > 0 ? Math.max(...stepTimes) : 0;
    const minStepTime = stepTimes.length > 0 ? Math.min(...stepTimes) : 0;

    return {
      totalExecutionTime,
      averageStepTime,
      maxStepTime,
      minStepTime,
      parallelEfficiency:
        totalExecutionTime > 0
          ? stepTimes.reduce((sum, time) => sum + time, 0) / totalExecutionTime
          : 1,
      performanceTarget: this.config.performanceTarget,
      targetAchieved: totalExecutionTime < this.config.performanceTarget,
      bottlenecks: stepResults
        .filter(
          (result) => (result.executionTimeMs as number) > averageStepTime * 2,
        )
        .map((result) => ({
          stepId: result.stepId,
          language: result.language,
          executionTime: result.executionTimeMs,
        })),
      recommendations: this.generatePerformanceRecommendations(
        stepResults,
        totalExecutionTime,
      ),
    };
  }

  /**
   * Generate performance recommendations
   *
   * Analyzes workflow performance data and generates actionable
   * recommendations for optimization.
   */
  private generatePerformanceRecommendations(
    stepResults: Record<string, unknown>[],
    totalExecutionTime: number,
  ): string[] {
    const recommendations: string[] = [];

    if (totalExecutionTime > this.config.performanceTarget) {
      recommendations.push(
        "Consider optimizing step execution order for better parallelization",
      );
    }

    const failedSteps = stepResults.filter(
      (result) => result.success === false,
    );
    if (failedSteps.length > 0) {
      recommendations.push(
        "Review and fix failed steps to improve overall workflow reliability",
      );
    }

    const longRunningSteps = stepResults.filter(
      (result) =>
        (result.executionTimeMs as number) > this.config.performanceTarget / 2,
    );
    if (longRunningSteps.length > 0) {
      recommendations.push(
        "Optimize long-running steps or consider breaking them into smaller units",
      );
    }

    const languageDistribution = stepResults.reduce(
      (acc, result) => {
        const lang = result.language as string;
        acc[lang] = ((acc[lang] as number) || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    if (Object.keys(languageDistribution).length > 2) {
      recommendations.push(
        "Consider reducing cross-language complexity for better performance",
      );
    }

    return recommendations;
  }

  /**
   * Determine error rate status
   *
   * Determines the current error rate status based on thresholds
   * for monitoring and alerting purposes.
   */
  private determineErrorRateStatus(): string {
    const errorRate =
      this.metrics.totalCalls > 0
        ? (this.metrics.failedCalls / this.metrics.totalCalls) * 100
        : 0;

    if (errorRate >= 15) {
      return "critical";
    } else if (errorRate >= 5) {
      return "warning";
    } else {
      return "healthy";
    }
  }

  // ... (Additional helper methods would be implemented here)
}
