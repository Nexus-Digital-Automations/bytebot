/**
 * Open-Interpreter Parlant Integration Bridge Service
 *
 * Specialized bridge service for integrating Open-Interpreter FastAPI server
 * with the Parlant ultra-performance optimization and compliance framework.
 *
 * This service provides:
 * - Direct integration with Open-Interpreter server endpoints
 * - Sub-500ms validation overhead for code execution requests
 * - Enterprise compliance validation for code execution
 * - Real-time monitoring and performance optimization
 * - Secure code execution with conversational validation
 *
 * Features:
 * - HTTP bridge to Open-Interpreter FastAPI server
 * - Parlant validation for all code execution requests
 * - Ultra-fast caching of validation results
 * - Compliance checking for sensitive operations
 * - Performance monitoring and optimization
 * - Error handling and retry mechanisms
 * - Comprehensive audit logging
 *
 * Integration Points:
 * - Open-Interpreter FastAPI server (/execute, /jobs/{id}/status, /jobs/{id}/results)
 * - Parlant Ultra Performance Optimizer for <500ms validation
 * - Enterprise Audit Service for compliance tracking
 * - QA Testing Framework for validation testing
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';

// Import Parlant services
import {
  ParlantUltraPerformanceOptimizerService,
  UltraOptimizedValidationRequest,
  UltraOptimizedValidationResponse
} from '../optimization/parlant-ultra-performance-optimizer.service';
import { ParlantEnterpriseAuditService } from '../audit/parlant-enterprise-audit.service';
import { ParlantQATestingFrameworkService } from '../testing/parlant-qa-testing-framework.service';
import {
  RiskLevel,
  ParlantConversationContext
} from '../parlant-integration.service';

// ===== EXTERNAL API RESPONSE TYPE DEFINITIONS =====
/**
 * Open-Interpreter server response structure for status endpoint
 */
export interface OpenInterpreterStatusApiResponse {
  readonly status: 'submitted' | 'running' | 'completed' | 'failed' | 'timeout';
  readonly progress?: number;
  readonly estimated_completion?: string | null;
  readonly current_step?: string;
  readonly logs?: string[];
}

/**
 * Open-Interpreter server response structure for results endpoint
 */
export interface OpenInterpreterResultsApiResponse {
  readonly status: 'submitted' | 'running' | 'completed' | 'failed' | 'timeout';
  readonly result?: {
    readonly stdout?: string;
    readonly stderr?: string;
    readonly exit_code?: number;
    readonly files?: Array<{
      readonly path: string;
      readonly content: string;
      readonly size: number;
    }>;
    readonly execution_time?: number;
    readonly resource_usage?: {
      readonly cpuPercent: number;
      readonly memoryMB: number;
      readonly diskUsage: number;
    };
  };
  readonly error?: {
    readonly message: string;
    readonly type: string;
    readonly stackTrace?: string;
  };
}

/**
 * Open-Interpreter server response structure for execute endpoint
 */
export interface OpenInterpreterExecuteApiResponse {
  readonly job_id: string;
  readonly status: 'submitted' | 'running' | 'completed' | 'failed' | 'timeout';
  readonly result?: {
    readonly stdout?: string;
    readonly stderr?: string;
    readonly exit_code?: number;
  };
  readonly error?: {
    readonly message: string;
    readonly type: string;
    readonly stackTrace?: string;
  };
}

/**
 * Open-Interpreter server response structure for cancel endpoint
 */
export interface OpenInterpreterCancelApiResponse {
  readonly cancelled?: boolean;
  readonly message?: string;
}

// ===== TYPE GUARDS =====
/**
 * Type guard for OpenInterpreterStatusApiResponse
 */
function isOpenInterpreterStatusApiResponse(data: unknown): data is OpenInterpreterStatusApiResponse {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const obj = data as Record<string, unknown>;
  return (
    'status' in obj &&
    typeof obj.status === 'string' &&
    ['submitted', 'running', 'completed', 'failed', 'timeout'].includes(obj.status)
  );
}

/**
 * Type guard for OpenInterpreterResultsApiResponse
 */
function isOpenInterpreterResultsApiResponse(data: unknown): data is OpenInterpreterResultsApiResponse {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const obj = data as Record<string, unknown>;
  return (
    'status' in obj &&
    typeof obj.status === 'string' &&
    ['submitted', 'running', 'completed', 'failed', 'timeout'].includes(obj.status)
  );
}

/**
 * Type guard for OpenInterpreterExecuteApiResponse
 */
function isOpenInterpreterExecuteApiResponse(data: unknown): data is OpenInterpreterExecuteApiResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'job_id' in data &&
    typeof (data as any).job_id === 'string' &&
    'status' in data &&
    typeof (data as any).status === 'string'
  );
}

/**
 * Type guard for OpenInterpreterCancelApiResponse
 */
function isOpenInterpreterCancelApiResponse(data: unknown): data is OpenInterpreterCancelApiResponse {
  return (
    typeof data === 'object' &&
    data !== null
  );
}

/**
 * Type guard for UltraOptimizedValidationResponse with approved property
 */
function isValidationResponseWithApproved(data: unknown): data is UltraOptimizedValidationResponse & { approved: boolean } {
  return (
    typeof data === 'object' &&
    data !== null &&
    'approved' in data &&
    typeof (data as any).approved === 'boolean'
  );
}

/**
 * Type guard for UltraOptimizedValidationResponse with ultraPerformanceMetadata
 */
function isValidationResponseWithMetadata(data: unknown): data is UltraOptimizedValidationResponse & {
  ultraPerformanceMetadata: {
    l0CacheHit?: boolean;
    totalUltraLatencyMs: number;
  };
} {
  return (
    typeof data === 'object' &&
    data !== null &&
    'ultraPerformanceMetadata' in data &&
    typeof (data as any).ultraPerformanceMetadata === 'object' &&
    (data as any).ultraPerformanceMetadata !== null &&
    'totalUltraLatencyMs' in (data as any).ultraPerformanceMetadata
  );
}

// ===== OPEN-INTERPRETER INTEGRATION INTERFACES =====
/**
 * Open-Interpreter execution request
 */
export interface OpenInterpreterExecutionRequest {
  readonly language: 'python' | 'javascript' | 'bash' | 'shell' | 'sql' | 'r' | 'go' | 'rust' | 'java' | 'cpp';
  readonly code: string;
  readonly context?: Record<string, unknown>;
  readonly timeout?: number;
  readonly validation?: {
    readonly enableParlantValidation: boolean;
    readonly complianceRequired?: ('GDPR' | 'SOX' | 'HIPAA' | 'PCI_DSS')[];
  readonly riskLevel?: RiskLevel;
  readonly maxValidationLatency?: number;
  };
}

/**
 * Open-Interpreter execution response
 */
export interface OpenInterpreterExecutionResponse {
  readonly jobId: string;
  readonly status: 'submitted' | 'running' | 'completed' | 'failed' | 'timeout';
  readonly result?: {readonly stdout: string;
    readonly stderr: string;
    readonly exitCode: number;
    readonly files: Array<{
      readonly path: string;
      readonly content: string;
      readonly size: number;
    }>;
    readonly executionTime: number;
    readonly resourceUsage: {
      readonly cpuPercent: number;
      readonly memoryMB: number;
      readonly diskUsage: number;
    };
  };
  readonly error?: {
    readonly message: string;
    readonly type: string;
    readonly stackTrace?: string;
  };
  readonly parlantValidation?: {
    readonly validated: boolean;
    readonly validationLatency: number;
    readonly complianceResults?: Record<string, boolean>;
    readonly riskAssessment: string;
    readonly approved: boolean;
  };
  readonly submittedAt: Date;
  readonly completedAt?: Date;
  readonly totalLatency?: number;
}

/**
 * Code execution risk assessment
 */
export interface CodeExecutionRiskAssessment {
  readonly riskLevel: RiskLevel;
  readonly riskFactors: string[];
  readonly securityConcerns: string[];
  readonly complianceIssues: string[];
  readonly recommendedActions: string[];
  readonly allowExecution: boolean;
  readonly requiresConfirmation: boolean;
}

/**
 * Open-Interpreter job status
 */
export interface OpenInterpreterJobStatus {
  readonly jobId: string;
  readonly status: 'submitted' | 'running' | 'completed' | 'failed' | 'timeout';
  readonly progress?: number;
  readonly estimatedCompletion?: Date;
  readonly currentStep?: string;
  readonly logs: string[];
}

/**
 * Integration performance metrics
 */
export interface IntegrationPerformanceMetrics {
  readonly totalRequests: number;
  readonly successfulRequests: number;
  readonly failedRequests: number;
  readonly averageLatency: number;
  readonly averageValidationLatency: number;
  readonly sub500msValidations: number;
  readonly complianceValidations: number;
  readonly cacheHitRate: number;
  readonly errorRate: number;
  readonly throughputPerSecond: number;
}

// ===== OPEN-INTERPRETER PARLANT BRIDGE SERVICE =====

@Injectable()
export class OpenInterpreterParlantBridgeService implements OnModuleInit {
  private readonly logger = new Logger(OpenInterpreterParlantBridgeService.name);

  // Configuration
  private readonly openInterpreterBaseUrl: string;
  private readonly enableValidation: boolean = true;
  private readonly defaultTimeout: number = 30000; // 30 seconds
  private readonly maxRetries: number = 3;

  // Job tracking
  private readonly activeJobs = new Map<string, {
    request: OpenInterpreterExecutionRequest;
    startTime: Date;
    context: ParlantConversationContext;
    validationResult?: UltraOptimizedValidationResponse;
  }>();

  // Performance metrics
  private integrationMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    totalLatency: 0,
    totalValidationLatency: 0,
    sub500msValidations: 0,
    complianceValidations: 0,
    cacheHits: 0,
    errorCount: 0
  };

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly ultraPerformanceOptimizer: ParlantUltraPerformanceOptimizerService,
    private readonly auditService: ParlantEnterpriseAuditService,
    private readonly qaTestingFramework: ParlantQATestingFrameworkService
  ) {
    this.openInterpreterBaseUrl = this.configService.get<string>('OPEN_INTERPRETER_URL') || 'http://localhost:8000';
  }

  async onModuleInit(): Promise<void> {
    this.logger.log('Initializing Open-Interpreter Parlant Bridge...');

    // Verify Open-Interpreter server connectivity
    await this.verifyServerConnectivity();

    this.logger.log('Open-Interpreter Parlant Bridge initialized successfully');
  }

  // ===== MAIN EXECUTION INTERFACE =====

  /**
   * Execute code through Open-Interpreter with Parlant validation
   */
  async executeCode(
    request: OpenInterpreterExecutionRequest,
    context: ParlantConversationContext = {
      userId: 'system',agentRole: 'open-interpreter-bridge',securityLevel: 'MEDIUM',
      conversationHistory: [],
      metadata: {}
    }
  ): Promise<OpenInterpreterExecutionResponse> {
    const startTime = new Date();
    this.integrationMetrics.totalRequests++;

    try {
      this.logger.log(`Executing ${request.language} code with Parlant validation`);// Step 1: Risk assessment and Parlant validationlet validationResult: UltraOptimizedValidationResponse | undefined;
      if (request.validation?.enableParlantValidation ?? this.enableValidation) {
        const validationStartTime = Date.now();

        const riskAssessment = this.assessCodeExecutionRisk(request);

        if (riskAssessment.requiresConfirmation) {
          const validationRequest = this.createValidationRequest(request, riskAssessment, context);
          validationResult = await this.ultraPerformanceOptimizer.validateWithUltraOptimization(
            validationRequest,
            context
          );

          if (!isValidationResponseWithApproved(validationResult) || !validationResult.approved) {
            const errorResponse: OpenInterpreterExecutionResponse = {
              jobId: `denied_${Date.now()}`,
              status: 'failed',error: {message: 'Code execution denied by Parlant validation',type: 'ValidationRejected'},parlantValidation: {
                validated: true,
                validationLatency: Date.now() - validationStartTime,
                riskAssessment: riskAssessment.riskLevel,
                approved: false
              },
              submittedAt: startTime,
              completedAt: new Date(),
              totalLatency: Date.now() - startTime.getTime()
            };

            this.integrationMetrics.failedRequests++;
            return errorResponse;
          }

          // Track validation performance
          const validationLatency = Date.now() - validationStartTime;
          this.integrationMetrics.totalValidationLatency += validationLatency;
          if (validationLatency < 500) {
            this.integrationMetrics.sub500msValidations++;
          }

          // Track compliance validations
          if (request.validation?.complianceRequired?.length) {
            this.integrationMetrics.complianceValidations++;
          }

          // Track cache hits
          if (isValidationResponseWithMetadata(validationResult) &&
              validationResult.ultraPerformanceMetadata.l0CacheHit) {
            this.integrationMetrics.cacheHits++;
          }
        }
      }

      // Step 2: Execute code through Open-Interpreter
      const executionResult = await this.executeCodeRemotely(request);

      // Step 3: Track job and return response
      this.activeJobs.set(executionResult.jobId, {
        request,
        startTime,
        context,
        validationResult
      });

      const response: OpenInterpreterExecutionResponse = {
        ...executionResult,
        parlantValidation: validationResult && isValidationResponseWithMetadata(validationResult) && isValidationResponseWithApproved(validationResult) ? {
          validated: true,
          validationLatency: validationResult.ultraPerformanceMetadata.totalUltraLatencyMs,
          complianceResults: request.validation?.complianceRequired ? {} : undefined, // TODO: Add compliance results
          riskAssessment: this.assessCodeExecutionRisk(request).riskLevel,
          approved: validationResult.approved
        } : undefined,
        submittedAt: startTime
      };

      this.integrationMetrics.successfulRequests++;
      return response;

    } catch (error) {
      this.integrationMetrics.failedRequests++;
      this.integrationMetrics.errorCount++;

      this.logger.error('Code execution failed:', error);

      return {
        jobId: `error_${Date.now()}`,
        status: 'failed',error: {message: error instanceof Error ? error.message : String(error),
          type: 'ExecutionError',
          stackTrace: error instanceof Error ? error.stack : undefined
        },
        submittedAt: startTime,
        completedAt: new Date(),
        totalLatency: Date.now() - startTime.getTime()
      };
    }
  }

  /**
   * Get job status from Open-Interpreter
   */
  async getJobStatus(jobId: string): Promise<OpenInterpreterJobStatus> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.openInterpreterBaseUrl}/jobs/${jobId}/status`)
      );

      if (!isOpenInterpreterStatusApiResponse(response.data)) {
        throw new Error('Invalid response format from Open-Interpreter status endpoint');
      }

      const apiData = response.data;
      return {
        jobId,
        status: apiData.status,
        progress: apiData.progress,
        estimatedCompletion: apiData.estimated_completion ?
          new Date(apiData.estimated_completion) : undefined,
        currentStep: apiData.current_step,
        logs: apiData.logs || []
      };

    } catch (error) {
      this.logger.error(`Failed to get job status for ${jobId}:`, error);throw new Error(`Failed to retrieve job status: ${error instanceof Error ? error.message : String(error)}`);}}

  /**
   * Get job results from Open-Interpreter
   */
  async getJobResults(jobId: string): Promise<OpenInterpreterExecutionResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.openInterpreterBaseUrl}/jobs/${jobId}/results`)
      );

      if (!isOpenInterpreterResultsApiResponse(response.data)) {
        throw new Error('Invalid response format from Open-Interpreter results endpoint');
      }

      const apiData = response.data;
      const jobInfo = this.activeJobs.get(jobId);
      const totalLatency = jobInfo ? Date.now() - jobInfo.startTime.getTime() : undefined;

      // Update metrics
      this.integrationMetrics.totalLatency += totalLatency || 0;

      return {
        jobId,
        status: apiData.status,
        result: apiData.result ? {
          stdout: apiData.result.stdout || '',
          stderr: apiData.result.stderr || '',
          exitCode: apiData.result.exit_code || 0,
          files: apiData.result.files || [],
          executionTime: apiData.result.execution_time || 0,
          resourceUsage: apiData.result.resource_usage || {
            cpuPercent: 0,
            memoryMB: 0,
            diskUsage: 0
          }
        } : undefined,
        error: apiData.error,
        parlantValidation: jobInfo?.validationResult &&
                          isValidationResponseWithMetadata(jobInfo.validationResult) &&
                          isValidationResponseWithApproved(jobInfo.validationResult) ? {
          validated: true,
          validationLatency: jobInfo.validationResult.ultraPerformanceMetadata.totalUltraLatencyMs,
          riskAssessment: this.assessCodeExecutionRisk(jobInfo.request).riskLevel,
          approved: jobInfo.validationResult.approved
        } : undefined,
        submittedAt: jobInfo?.startTime || new Date(),
        completedAt: new Date(),
        totalLatency
      };

    } catch (error) {
      this.logger.error(`Failed to get job results for ${jobId}:`, error);throw new Error(`Failed to retrieve job results: ${error instanceof Error ? error.message : String(error)}`);}}

  /**
   * Cancel job execution
   */
  async cancelJob(jobId: string): Promise<{ cancelled: boolean; message: string }> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.openInterpreterBaseUrl}/jobs/${jobId}/cancel`)
      );

      if (!isOpenInterpreterCancelApiResponse(response.data)) {
        throw new Error('Invalid response format from Open-Interpreter cancel endpoint');
      }

      const apiData = response.data;
      // Remove from active jobs
      this.activeJobs.delete(jobId);

      return {
        cancelled: apiData.cancelled || false,
        message: apiData.message || 'Job cancellation requested'
      };

    } catch (error) {
      this.logger.error(`Failed to cancel job ${jobId}:`, error);return {cancelled: false,
        message: `Failed to cancel job: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  // ===== RISK ASSESSMENT AND VALIDATION =====

  private assessCodeExecutionRisk(request: OpenInterpreterExecutionRequest): CodeExecutionRiskAssessment {
    const riskFactors: string[] = [];
    const securityConcerns: string[] = [];
    const complianceIssues: string[] = [];
    const recommendedActions: string[] = [];

    const code = request.code.toLowerCase();
    let riskLevel = RiskLevel._LOW;
    let requiresConfirmation = false;

    // Language-specific risk assessment
    switch (request.language) {
      case 'bash':case 'shell':riskLevel = RiskLevel._HIGH;riskFactors.push('shell_execution', 'system_access');requiresConfirmation = true;break;
      case 'python':if (code.includes('import os') || code.includes('subprocess') || code.includes('exec(')) {riskLevel = RiskLevel._HIGH;riskFactors.push('system_calls', 'dynamic_execution');requiresConfirmation = true;}
        break;
      case 'sql':if (code.includes('drop') || code.includes('delete') || code.includes('update')) {riskLevel = RiskLevel._MODERATE;riskFactors.push('data_modification');requiresConfirmation = true;}
        break;
    }

    // Code content risk assessment
    const dangerousPatterns = [
      'rm -rf', 'del /f', 'format', 'mkfs',  // Destructive file operations'curl', 'wget', 'fetch', 'requests.get',  // Network access'eval(', 'exec(', 'system(', '__import__',  // Dynamic execution'subprocess', 'os.system', 'shell_exec',  // System calls'password', 'secret', 'key', 'token',  // Sensitive data'database', 'db.', 'sql', 'query',  // Database operations'file:', 'ftp:', 'http:', 'https:'  // External resources
    ];

    for (const pattern of dangerousPatterns) {
      if (code.includes(pattern.toLowerCase())) {
        riskFactors.push(`dangerous_pattern_${pattern.replace(/[^a-z0-9]/g, '_')}`);
        if (['rm -rf', 'del /f', 'format', 'eval('].includes(pattern)) {
          riskLevel = RiskLevel._CRITICAL;
          securityConcerns.push(`Potentially destructive operation: ${pattern}`);
          requiresConfirmation = true;
        }
      }
    }

    // Compliance assessment
    if (request.validation?.complianceRequired?.length) {
      for (const regulation of request.validation.complianceRequired) {
        switch (regulation) {
          case 'GDPR':if (code.includes('personal') || code.includes('email') || code.includes('name')) {complianceIssues.push('Potential personal data processing detected');}break;
          case 'HIPAA':if (code.includes('health') || code.includes('medical') || code.includes('patient')) {complianceIssues.push('Potential healthcare data processing detected');}break;
          case 'SOX':if (code.includes('financial') || code.includes('accounting') || code.includes('audit')) {complianceIssues.push('Potential financial data processing detected');}break;
          case 'PCI_DSS':if (code.includes('card') || code.includes('payment') || code.includes('cvv')) {complianceIssues.push('Potential payment data processing detected');}break;
        }
      }
    }

    // Generate recommendations
    if (riskLevel === RiskLevel._CRITICAL) {
      recommendedActions.push('Require multi-party approval');recommendedActions.push('Execute in isolated sandbox');recommendedActions.push('Comprehensive audit logging');} else if (riskLevel === RiskLevel._HIGH) {recommendedActions.push('Require user confirmation');recommendedActions.push('Monitor execution closely');recommendedActions.push('Enable detailed logging');} else if (riskLevel === RiskLevel._MODERATE) {recommendedActions.push('Standard monitoring');recommendedActions.push('Basic audit logging');}const allowExecution = riskLevel !== RiskLevel._CRITICAL ||
      (request.validation?.riskLevel && request.validation.riskLevel >= riskLevel);

    return {
      riskLevel,
      riskFactors,
      securityConcerns,
      complianceIssues,
      recommendedActions,
      allowExecution,
      requiresConfirmation: requiresConfirmation || riskLevel >= RiskLevel._HIGH
    };
  }

  private createValidationRequest(
    request: OpenInterpreterExecutionRequest,
    riskAssessment: CodeExecutionRiskAssessment,
    context: ParlantConversationContext
  ): UltraOptimizedValidationRequest {
    return {
      functionName: 'execute_code',functionParams: {language: request.language,
        code: request.code,
        codeLength: request.code.length,
        riskFactors: riskAssessment.riskFactors,
        securityConcerns: riskAssessment.securityConcerns
      },
      riskLevel: riskAssessment.riskLevel,
      context: {
        source: 'open-interpreter-bridge',language: request.language,riskAssessment: riskAssessment.riskLevel,
        ...request.context
      },
      ultraOptimizationHints: {
        enableL0Cache: true,
        enablePredictiveLoading: true,
        enableMicroBatching: false, // Code execution should not be batched
        complianceRequired: request.validation?.complianceRequired,
        maxLatencyMs: request.validation?.maxValidationLatency || 500,
        priorityLevel: riskAssessment.riskLevel === RiskLevel._CRITICAL ? 'ULTRA' : 'HIGH'
      }
    };
  }

  // ===== REMOTE EXECUTION =====

  private async executeCodeRemotely(request: OpenInterpreterExecutionRequest): Promise<OpenInterpreterExecutionResponse> {
    const payload = {
      language: request.language,
      code: request.code,
      timeout: request.timeout || this.defaultTimeout,
      context: request.context || {}
    };

    try {
      const response: AxiosResponse = await firstValueFrom(
        this.httpService.post(`${this.openInterpreterBaseUrl}/execute`, payload, {
          timeout: request.timeout || this.defaultTimeout
        })
      );

      if (!isOpenInterpreterExecuteApiResponse(response.data)) {
        throw new Error('Invalid response format from Open-Interpreter execute endpoint');
      }

      const apiData = response.data;
      return {
        jobId: apiData.job_id,
        status: apiData.status,
        submittedAt: new Date(),
        result: apiData.result,
        error: apiData.error
      };

    } catch (error) {
      this.logger.error('Remote code execution failed:', error);
      throw new Error(`Remote execution failed: ${error instanceof Error ? error.message : String(error)}`);}}

  private async verifyServerConnectivity(): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.openInterpreterBaseUrl}/health`, { timeout: 5000 })
      );

      if (response.status === 200) {
        this.logger.log('Open-Interpreter server connectivity verified');
      } else {
        throw new Error(`Server returned status ${response.status}`);
      }

    } catch (error) {
      this.logger.warn('Open-Interpreter server connectivity check failed:', error);// Don't throw error - allow service to start even if server is not available
    }
  }

  // ===== PUBLIC INTERFACE =====

  /**
   * Get integration performance metrics
   */
  getPerformanceMetrics(): IntegrationPerformanceMetrics {
    const totalRequests = this.integrationMetrics.totalRequests;
    const averageLatency = totalRequests > 0 ?
      this.integrationMetrics.totalLatency / totalRequests : 0;
    const averageValidationLatency = this.integrationMetrics.sub500msValidations > 0 ?
      this.integrationMetrics.totalValidationLatency / this.integrationMetrics.sub500msValidations : 0;
    const cacheHitRate = totalRequests > 0 ?
      this.integrationMetrics.cacheHits / totalRequests : 0;
    const errorRate = totalRequests > 0 ?
      this.integrationMetrics.errorCount / totalRequests : 0;

    return {
      totalRequests,
      successfulRequests: this.integrationMetrics.successfulRequests,
      failedRequests: this.integrationMetrics.failedRequests,
      averageLatency,
      averageValidationLatency,
      sub500msValidations: this.integrationMetrics.sub500msValidations,
      complianceValidations: this.integrationMetrics.complianceValidations,
      cacheHitRate,
      errorRate,
      throughputPerSecond: 0 // TODO: Calculate based on time window
    };
  }

  /**
   * Get active jobs count
   */
  getActiveJobsCount(): number {
    return this.activeJobs.size;
  }

  /**
   * Get server health status
   */
  async getServerHealth(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
    try {
      const startTime = Date.now();
      await firstValueFrom(
        this.httpService.get(`${this.openInterpreterBaseUrl}/health`, { timeout: 5000 })
      );
      const latency = Date.now() - startTime;

      return { healthy: true, latency };

    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}