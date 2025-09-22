/**
 * PARLANT Phase 1 Function Wrapper Framework - Signature Preserving Wrapper
 *
 * Core implementation of function signature preservation mechanisms that
 * maintain exact parameter types and return types while adding PARLANT
 * conversational validation wrapper functionality.
 *
 * @fileoverview Function signature preservation with TypeScript generics
 * @version 1.0.0
 * @author Function Wrapper Framework Agent
 * @created 2025-09-19
 */

import { Logger } from '@nestjs/common';
// ConversationState is imported from wrapper-types below
import {
  AnyFunction,
  AsyncFunction,
  WrapFunction,
  WrapperConfig,
  WrapperResult,
  ValidationContext,
  ValidationResult,
  ExecutionMetadata,
  PerformanceMetrics,
  AuditTrail,
  WrapperError,
  ErrorCategory,
  CacheStatus,
  UserContext,
  FunctionCall,
  ValidationStep,
  ResultSummary,
  BusinessImpact,
  ValidationLevel,
  ConversationContext,
  ConversationState
} from '../interfaces/wrapper-types';

// Import types needed for PARLANT integration
import {
  ParlantValidationResponse,
  SecurityLevel
} from '../../monitoring/parlant-integration.service';

/**
 * Core signature-preserving wrapper implementation
 * Maintains exact function signatures while adding PARLANT validation
 */
export class SignaturePreservingWrapper<T extends AnyFunction> {
  private readonly logger = new Logger(SignaturePreservingWrapper.name);
  private readonly originalFunction: T;
  private readonly config: WrapperConfig;
  private readonly executionCount = new Map<string, number>();
  private readonly performanceHistory: PerformanceMetrics[] = [];

  constructor(originalFunction: T, config: WrapperConfig) {
    this.originalFunction = originalFunction;
    this.config = config;
    this.logger.log(`Created wrapper for function: ${config.functionId}`);
  }

  /**
   * Create wrapped function with preserved signature
   * Returns function with identical signature but enhanced with PARLANT validation
   *
   * @returns Wrapped function maintaining original signature
   */
  public createWrappedFunction(): WrapFunction<T> {
    const wrapper = this;
    const functionName = this.config.functionId;
    const description = this.config.description;

    // Create wrapped function with preserved signature using TypeScript magic
    const wrappedFunction = async function (...args: Parameters<T>): Promise<WrapperResult<ReturnType<T>>> {
      const executionId = wrapper.generateExecutionId();
      const startTime = Date.now();

      wrapper.logger.debug(`Starting execution ${executionId} for ${functionName} with args:`, args);

      try {
        // Step 1: Capture execution context
        const userContext = wrapper.captureUserContext();
        const validationContext = wrapper.createValidationContext(
          functionName,
          args,
          userContext,
          executionId
        );

        // Step 2: Pre-execution validation through PARLANT
        const validationResult = wrapper.performParlantValidation(
          validationContext
        );

        if (!validationResult.approved) {
          const error = new Error(`Function execution rejected: ${validationResult.reason}`);
          (error as any).code = 'VALIDATION_REJECTED';
          (error as any).category = ErrorCategory.VALIDATION_ERROR;
          (error as any).metadata = {
            validationId: validationResult.validationId,
            functionName,
            arguments: args
          };
          throw error;
        }

        // Step 3: Execute original function with monitoring
        const functionResult = await wrapper.executeWithMonitoring(
          wrapper.originalFunction,
          args,
          executionId
        );

        // Step 4: Post-execution processing
        const executionMetadata = wrapper.createExecutionMetadata(
          executionId,
          startTime,
          validationResult,
          functionResult
        );

        // Step 5: Generate audit trail
        const auditTrail = wrapper.generateAuditTrail(
          executionId,
          functionName,
          args,
          userContext,
          validationResult,
          functionResult,
          startTime
        );

        // Step 6: Log successful execution
        wrapper.logSuccessfulExecution(
          executionId,
          functionName,
          executionMetadata,
          auditTrail
        );

        return {
          result: functionResult,
          metadata: executionMetadata,
          success: true
        };

      } catch (error) {
        // Error handling with comprehensive logging
        const wrapperError = wrapper.handleExecutionError(
          error,
          executionId,
          functionName,
          args,
          startTime
        );

        const executionMetadata = wrapper.createErrorExecutionMetadata(
          executionId,
          startTime,
          wrapperError
        );

        return {
          result: undefined as ReturnType<T>,
          metadata: executionMetadata,
          success: false,
          error: wrapperError
        };
      }
    } as WrapFunction<T>;

    // Preserve function metadata for debugging
    Object.defineProperty(wrappedFunction, 'name', {
      value: `wrapped_${functionName}`,
      configurable: false
    });

    Object.defineProperty(wrappedFunction, '__original', {
      value: this.originalFunction,
      configurable: false,
      writable: false
    });

    Object.defineProperty(wrappedFunction, '__config', {
      value: this.config,
      configurable: false,
      writable: false
    });

    return wrappedFunction;
  }

  /**
   * Generate unique execution ID for tracking
   *
   * @returns Unique execution identifier
   */
  private generateExecutionId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const count = this.getExecutionCount();
    return `${this.config.functionId}_${timestamp}_${count}_${random}`;
  }

  /**
   * Get and increment execution count for this function
   *
   * @returns Current execution count
   */
  private getExecutionCount(): number {
    const current = this.executionCount.get(this.config.functionId) || 0;
    const next = current + 1;
    this.executionCount.set(this.config.functionId, next);
    return next;
  }

  /**
   * Capture current user context from session
   *
   * @returns User context for validation
   */
  private captureUserContext(): UserContext {
    // TODO: Integrate with actual authentication service
    // For now, return mock context - will be replaced with real implementation
    return {
      userId: 'system',
      authToken: 'mock-token',
      permissions: ['execute'],
      sessionMetadata: {
        sessionId: 'mock-session',
        ipAddress: '127.0.0.1',
        userAgent: 'Node.js'
      }
    };
  }

  /**
   * Create validation context for PARLANT processing
   *
   * @param functionName - Name of function being validated
   * @param parameters - Function parameters
   * @param userContext - User context
   * @param executionId - Unique execution ID
   * @returns Validation context
   */
  private createValidationContext(
    functionName: string,
    parameters: readonly any[],
    userContext: UserContext,
    executionId: string
  ): ValidationContext {
    return {
      functionName,
      parameters,
      userContext,
      conversationId: `conv_${executionId}`,
      previousValidations: [],
      timestamp: new Date(),
      metadata: {
        executionId,
        functionId: this.config.functionId,
        validationLevel: this.config.validationLevel,
        description: this.config.description
      }
    };
  }

  /**
   * Perform PARLANT conversational validation
   *
   * @param context - Validation context
   * @returns Validation result
   */
  private performParlantValidation(
    context: ValidationContext
  ): ValidationResult {
    const startTime = Date.now();

    try {
      // TODO: Integrate with actual PARLANT service
      // For now, simulate validation based on configuration
      const approved = this.simulateParlantValidation(context);
      const executionTime = Date.now() - startTime;

      const conversationContext: ConversationContext = {
        sessionId: context.conversationId,
        messages: [
          {
            id: `msg_${Date.now()}`,
            role: 'system',
            content: `Validating execution of ${context.functionName}`,
            timestamp: new Date()
          },
          {
            id: `msg_${Date.now() + 1}`,
            role: 'assistant',
            content: approved ? 'Execution approved' : 'Execution rejected',
            timestamp: new Date()
          }
        ],
        appliedGuidelines: ['security-validation', 'parameter-safety'],
        toolsInvoked: ['parameter-validator', 'permission-checker'],
        state: approved ? ConversationState.APPROVED : ConversationState.REJECTED
      };

      return {
        approved,
        validationId: `val_${context.conversationId}`,
        reason: approved
          ? `Function ${context.functionName} execution approved based on validation level ${this.config.validationLevel}`
          : `Function ${context.functionName} execution rejected due to security constraints`,
        conversationContext,
        confidence: 0.95,
        executionTime,
        metadata: {
          validationLevel: this.config.validationLevel,
          parameterCount: context.parameters.length,
          userPermissions: context.userContext.permissions
        }
      };

    } catch (error) {
      this.logger.error(`PARLANT validation failed for ${context.functionName}:`, error);

      const errorMessage = error instanceof Error ? error.message : String(error);
      // Return rejection on validation error
      return {
        approved: false,
        validationId: `val_error_${context.conversationId}`,
        reason: `Validation service error: ${errorMessage}`,
        conversationContext: {
          sessionId: context.conversationId,
          messages: [],
          appliedGuidelines: [],
          toolsInvoked: [],
          state: ConversationState.ERROR
        },
        confidence: 0.0,
        executionTime: Date.now() - startTime,
        metadata: { error: errorMessage }
      };
    }
  }

  /**
   * Simulate PARLANT validation based on configuration
   * TODO: Replace with actual PARLANT integration
   *
   * @param context - Validation context
   * @returns Approval decision
   */
  private simulateParlantValidation(context: ValidationContext): boolean {
    // Simulate different validation levels
    switch (this.config.validationLevel) {
      case ValidationLevel.CRITICAL:
        // Critical operations require explicit approval
        return this.hasPermission(context.userContext, 'critical-execute');

      case ValidationLevel.HIGH:
        // High operations require enhanced validation
        return this.hasPermission(context.userContext, 'high-execute');

      case ValidationLevel.MEDIUM:
        // Medium operations require basic validation
        return this.hasPermission(context.userContext, 'execute');

      case ValidationLevel.LOW:
        // Low operations require minimal validation
        return true;

      case ValidationLevel.OPTIONAL:
        // Optional validation always approves
        return true;

      default:
        return false;
    }
  }

  /**
   * Check if user has required permission
   *
   * @param userContext - User context
   * @param permission - Required permission
   * @returns Permission check result
   */
  private hasPermission(userContext: UserContext, permission: string): boolean {
    return userContext.permissions.includes(permission) ||
           userContext.permissions.includes('admin') ||
           userContext.permissions.includes('*');
  }

  /**
   * Execute original function with performance monitoring
   *
   * @param func - Original function to execute
   * @param args - Function arguments
   * @param executionId - Unique execution ID
   * @returns Function result
   */
  private async executeWithMonitoring<U>(
    func: (...args: any[]) => U | Promise<U>,
    args: any[],
    executionId: string
  ): Promise<U> {
    const startTime = Date.now();
    const memoryBefore = this.getMemoryUsage();

    this.logger.debug(`Executing function with monitoring: ${executionId}`);

    try {
      // Handle both sync and async functions
      const result = func.apply(null, args);

      // Type guard for Promise-like objects
      if (result && typeof (result as any).then === 'function') {
        // Async function - await the promise
        return await (result as Promise<U>);
      } else {
        // Sync function - return directly as it's already the correct type
        return result as U;
      }

    } finally {
      const memoryAfter = this.getMemoryUsage();
      const executionTime = Date.now() - startTime;

      // Record performance metrics
      const metrics: PerformanceMetrics = {
        memoryBefore,
        memoryAfter,
        memoryDelta: memoryAfter - memoryBefore,
        cpuTime: executionTime,
        networkRequests: 0, // TODO: Implement network request tracking
        databaseQueries: 0, // TODO: Implement database query tracking
        customMetrics: {
          executionTime,
          memoryUsage: memoryAfter
        }
      };

      this.performanceHistory.push(metrics);
      this.logger.debug(`Function execution completed in ${executionTime}ms`);
    }
  }

  /**
   * Get current memory usage
   *
   * @returns Memory usage in bytes
   */
  private getMemoryUsage(): number {
    const usage = process.memoryUsage();
    return usage.heapUsed;
  }

  /**
   * Create execution metadata for successful execution
   *
   * @param executionId - Unique execution ID
   * @param startTime - Execution start time
   * @param validationResult - Validation result
   * @param functionResult - Function execution result
   * @returns Execution metadata
   */
  private createExecutionMetadata(
    executionId: string,
    startTime: number,
    validationResult: ValidationResult,
    functionResult: any
  ): ExecutionMetadata {
    const totalExecutionTime = Date.now() - startTime;
    const validationExecutionTime = validationResult.executionTime;
    const functionExecutionTime = totalExecutionTime - validationExecutionTime;

    const performanceMetrics = this.performanceHistory[this.performanceHistory.length - 1] || {
      memoryBefore: 0,
      memoryAfter: 0,
      memoryDelta: 0,
      cpuTime: functionExecutionTime,
      networkRequests: 0,
      databaseQueries: 0,
      customMetrics: {}
    };

    // Create audit trail
    const auditTrail = this.generateAuditTrail(
      executionId,
      this.config.functionId,
      [],
      this.captureUserContext(),
      validationResult,
      functionResult,
      startTime
    );

    return {
      executionId,
      totalExecutionTime,
      functionExecutionTime,
      validationExecutionTime,
      cacheStatus: CacheStatus.MISS, // TODO: Implement cache integration
      validationResult,
      performanceMetrics,
      auditTrail
    };
  }

  /**
   * Create execution metadata for failed execution
   *
   * @param executionId - Unique execution ID
   * @param startTime - Execution start time
   * @param error - Wrapper error
   * @returns Execution metadata
   */
  private createErrorExecutionMetadata(
    executionId: string,
    startTime: number,
    error: WrapperError
  ): ExecutionMetadata {
    const totalExecutionTime = Date.now() - startTime;

    // Mock validation result for error case
    const validationResult: ValidationResult = {
      approved: false,
      validationId: `val_error_${executionId}`,
      reason: 'Execution failed',
      conversationContext: {
        sessionId: executionId,
        messages: [],
        appliedGuidelines: [],
        toolsInvoked: [],
        state: ConversationState.ERROR
      },
      confidence: 0.0,
      executionTime: 0,
      metadata: { error: error.message }
    };

    const auditTrail = this.generateAuditTrail(
      executionId,
      this.config.functionId,
      [],
      this.captureUserContext(),
      validationResult,
      null,
      startTime
    );

    return {
      executionId,
      totalExecutionTime,
      functionExecutionTime: 0,
      validationExecutionTime: 0,
      cacheStatus: CacheStatus.ERROR,
      validationResult,
      performanceMetrics: {
        memoryBefore: 0,
        memoryAfter: 0,
        memoryDelta: 0,
        cpuTime: totalExecutionTime,
        networkRequests: 0,
        databaseQueries: 0,
        customMetrics: { errorCode: typeof error.code === 'string' ? parseInt(error.code) || 500 : error.code }
      },
      auditTrail
    };
  }

  /**
   * Generate comprehensive audit trail
   *
   * @param executionId - Unique execution ID
   * @param functionName - Function name
   * @param args - Function arguments
   * @param userContext - User context
   * @param validationResult - Validation result
   * @param result - Function result
   * @param startTime - Execution start time
   * @returns Audit trail
   */
  private generateAuditTrail(
    executionId: string,
    functionName: string,
    args: any[],
    userContext: UserContext,
    validationResult: ValidationResult,
    result: any,
    startTime: number
  ): AuditTrail {
    const endTime = new Date();
    const startTimeDate = new Date(startTime);

    const functionCall: FunctionCall = {
      functionName,
      parameters: args,
      parameterTypes: args.map(arg => typeof arg),
      returnType: result ? typeof result : 'undefined'
    };

    const validationSteps: ValidationStep[] = [
      {
        stepId: `step_context_${executionId}`,
        description: 'Create validation context',
        result: 'passed',
        executionTime: 5,
        metadata: { step: 'context-creation' }
      },
      {
        stepId: `step_validation_${executionId}`,
        description: 'PARLANT conversational validation',
        result: validationResult.approved ? 'passed' : 'failed',
        executionTime: validationResult.executionTime,
        metadata: {
          validationId: validationResult.validationId,
          confidence: validationResult.confidence
        }
      }
    ];

    const resultSummary: ResultSummary = {
      success: validationResult.approved && result !== null,
      resultType: result ? typeof result : 'error',
      resultSize: result ? JSON.stringify(result).length : 0,
      businessImpact: this.assessBusinessImpact(functionName, result)
    };

    return {
      startTime: startTimeDate,
      endTime,
      functionCall,
      userContext,
      validationSteps,
      resultSummary,
      auditMetadata: {
        executionId,
        configurationUsed: this.config.functionId,
        validationLevel: this.config.validationLevel,
        cacheEnabled: this.config.cacheable || false
      }
    };
  }

  /**
   * Assess business impact of function execution
   *
   * @param functionName - Function name
   * @param result - Function result
   * @returns Business impact assessment
   */
  private assessBusinessImpact(functionName: string, result: any): BusinessImpact {
    // Simple business impact assessment based on function type
    const isWriteOperation = functionName.toLowerCase().includes('write') ||
                           functionName.toLowerCase().includes('create') ||
                           functionName.toLowerCase().includes('update') ||
                           functionName.toLowerCase().includes('delete');

    const isCriticalSystem = functionName.toLowerCase().includes('auth') ||
                           functionName.toLowerCase().includes('security') ||
                           functionName.toLowerCase().includes('payment');

    let level: 'low' | 'medium' | 'high' | 'critical' = 'low';

    if (isCriticalSystem) {
      level = 'critical';
    } else if (isWriteOperation) {
      level = 'high';
    } else {
      level = 'medium';
    }

    return {
      level,
      affectedSystems: [functionName.split('.')[0] || 'unknown'],
      dataSensitivity: isCriticalSystem ? 'restricted' : 'internal',
      complianceRequirements: isCriticalSystem ? ['GDPR', 'SOX'] : []
    };
  }

  /**
   * Handle execution errors with comprehensive logging
   *
   * @param error - Original error
   * @param executionId - Unique execution ID
   * @param functionName - Function name
   * @param args - Function arguments
   * @param startTime - Execution start time
   * @returns Wrapper error
   */
  private handleExecutionError(
    error: any,
    executionId: string,
    functionName: string,
    args: any[],
    startTime: number
  ): WrapperError {
    this.logger.error(`Function execution failed: ${functionName}`, {
      executionId,
      error: error.message,
      args,
      executionTime: Date.now() - startTime
    });

    // Determine error category
    let category: ErrorCategory;
    if (error.code === 'VALIDATION_REJECTED') {
      category = ErrorCategory.VALIDATION_ERROR;
    } else if (error.name === 'TimeoutError') {
      category = ErrorCategory.TIMEOUT_ERROR;
    } else if (error.name === 'PermissionError') {
      category = ErrorCategory.PERMISSION_ERROR;
    } else if (error.name === 'NetworkError') {
      category = ErrorCategory.NETWORK_ERROR;
    } else {
      category = ErrorCategory.SYSTEM_ERROR;
    }

    return {
      code: error.code || 'EXECUTION_ERROR',
      message: error.message || 'Unknown execution error',
      originalError: error,
      category,
      metadata: {
        executionId,
        functionName,
        argumentCount: args.length,
        executionTime: Date.now() - startTime
      },
      recoverySuggestions: this.generateRecoverySuggestions(category),
      stackTrace: error.stack
    };
  }

  /**
   * Generate recovery suggestions based on error category
   *
   * @param category - Error category
   * @returns Recovery suggestions
   */
  private generateRecoverySuggestions(category: ErrorCategory): string[] {
    switch (category) {
      case ErrorCategory.VALIDATION_ERROR:
        return [
          'Verify user permissions',
          'Check function parameters',
          'Review validation configuration'
        ];
      case ErrorCategory.TIMEOUT_ERROR:
        return [
          'Increase timeout configuration',
          'Optimize function performance',
          'Check system resources'
        ];
      case ErrorCategory.PERMISSION_ERROR:
        return [
          'Verify user authentication',
          'Check role assignments',
          'Review access control policies'
        ];
      case ErrorCategory.NETWORK_ERROR:
        return [
          'Check network connectivity',
          'Verify service endpoints',
          'Review firewall settings'
        ];
      default:
        return [
          'Check system logs',
          'Verify system configuration',
          'Contact system administrator'
        ];
    }
  }

  /**
   * Log successful execution with audit information
   *
   * @param executionId - Unique execution ID
   * @param functionName - Function name
   * @param metadata - Execution metadata
   * @param auditTrail - Audit trail
   */
  private logSuccessfulExecution(
    executionId: string,
    functionName: string,
    metadata: ExecutionMetadata,
    auditTrail: AuditTrail
  ): void {
    this.logger.log(`Function execution successful: ${functionName}`, {
      executionId,
      totalTime: metadata.totalExecutionTime,
      validationTime: metadata.validationExecutionTime,
      functionTime: metadata.functionExecutionTime,
      validationApproved: metadata.validationResult.approved,
      cacheStatus: metadata.cacheStatus
    });

    // TODO: Send audit trail to audit service
    // await this.auditService.recordExecution(auditTrail);
  }

  /**
   * Get wrapper statistics for monitoring
   *
   * @returns Wrapper statistics
   */
  public getStatistics(): WrapperStatistics {
    const totalExecutions = Array.from(this.executionCount.values())
      .reduce((sum, count) => sum + count, 0);

    const avgExecutionTime = this.performanceHistory.length > 0
      ? this.performanceHistory.reduce((sum, metric) => sum + metric.cpuTime, 0) / this.performanceHistory.length
      : 0;

    const avgMemoryUsage = this.performanceHistory.length > 0
      ? this.performanceHistory.reduce((sum, metric) => sum + metric.memoryAfter, 0) / this.performanceHistory.length
      : 0;

    return {
      functionId: this.config.functionId,
      totalExecutions,
      averageExecutionTime: avgExecutionTime,
      averageMemoryUsage: avgMemoryUsage,
      validationLevel: this.config.validationLevel,
      cacheEnabled: this.config.cacheable || false,
      lastExecutionTime: this.performanceHistory.length > 0
        ? new Date()
        : null
    };
  }

  /**
   * Reset wrapper statistics
   */
  public resetStatistics(): void {
    this.executionCount.clear();
    this.performanceHistory.length = 0;
    this.logger.log(`Statistics reset for function: ${this.config.functionId}`);
  }
}

/**
 * Wrapper statistics interface
 * Performance and usage statistics for monitoring
 */
export interface WrapperStatistics {
  /** Function identifier */
  readonly functionId: string;

  /** Total number of executions */
  readonly totalExecutions: number;

  /** Average execution time in milliseconds */
  readonly averageExecutionTime: number;

  /** Average memory usage in bytes */
  readonly averageMemoryUsage: number;

  /** Validation level */
  readonly validationLevel: ValidationLevel;

  /** Cache enabled status */
  readonly cacheEnabled: boolean;

  /** Last execution timestamp */
  readonly lastExecutionTime: Date | null;
}

/**
 * Function signature inspection utilities
 * Utilities for analyzing and preserving function signatures
 */
export class FunctionSignatureInspector {
  private static readonly logger = new Logger(FunctionSignatureInspector.name);

  /**
   * Extract function signature information
   *
   * @param func - Function to inspect
   * @returns Function signature information
   */
  public static extractSignature<T extends AnyFunction>(func: T): FunctionSignature<T> {
    const name = func.name || 'anonymous';
    const parameterCount = func.length;
    const isAsync = func.constructor.name === 'AsyncFunction';
    const source = func.toString();

    // Extract parameter names from function source
    const parameterNames = this.extractParameterNames(source);

    // Determine return type (limited inspection in runtime)
    const returnTypeHint = this.inferReturnType(source);

    return {
      name,
      parameterCount,
      parameterNames,
      isAsync,
      returnTypeHint,
      source: source.substring(0, 200) + (source.length > 200 ? '...' : ''),
      originalFunction: func
    };
  }

  /**
   * Extract parameter names from function source
   *
   * @param source - Function source code
   * @returns Parameter names
   */
  private static extractParameterNames(source: string): string[] {
    try {
      // Simple regex to extract parameter names
      const match = source.match(/^[^(]*\(([^)]*)\)/);
      if (!match || !match[1]) {
        return [];
      }

      return match[1]
        .split(',')
        .map(param => param.trim().split(/\s+/)[0].split(':')[0])
        .filter(param => param.length > 0 && param !== '...');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to extract parameter names: ${errorMessage}`);
      return [];
    }
  }

  /**
   * Infer return type from function source
   *
   * @param source - Function source code
   * @returns Return type hint
   */
  private static inferReturnType(source: string): string {
    try {
      // Look for TypeScript return type annotation
      const typeMatch = source.match(/\):\s*([^{]+)\s*{/);
      if (typeMatch && typeMatch[1]) {
        return typeMatch[1].trim();
      }

      // Check for async function
      if (source.includes('async')) {
        return 'Promise<unknown>';
      }

      return 'unknown';

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to infer return type: ${errorMessage}`);
      return 'unknown';
    }
  }

  /**
   * Validate function compatibility with wrapper
   *
   * @param func - Function to validate
   * @returns Compatibility result
   */
  public static validateCompatibility<T extends AnyFunction>(func: T): CompatibilityResult {
    const signature = this.extractSignature(func);
    const issues: string[] = [];
    const warnings: string[] = [];

    // Check for common compatibility issues
    if (signature.parameterCount > 10) {
      warnings.push(`Function has ${signature.parameterCount} parameters, consider reducing for better performance`);
    }

    if (signature.source.includes('eval(')) {
      issues.push('Function contains eval() which is not supported');
    }

    if (signature.source.includes('with(')) {
      issues.push('Function contains with() statement which is not supported');
    }

    // Check for arrow function edge cases
    if (signature.source.startsWith('(') && !signature.name) {
      warnings.push('Anonymous arrow functions may have limited debugging information');
    }

    const isCompatible = issues.length === 0;

    return {
      compatible: isCompatible,
      signature,
      issues,
      warnings,
      recommendations: this.generateRecommendations(signature, issues, warnings)
    };
  }

  /**
   * Generate recommendations for function improvement
   *
   * @param signature - Function signature
   * @param issues - Compatibility issues
   * @param warnings - Compatibility warnings
   * @returns Recommendations
   */
  private static generateRecommendations(
    signature: FunctionSignature<any>,
    issues: string[],
    warnings: string[]
  ): string[] {
    const recommendations: string[] = [];

    if (!signature.name) {
      recommendations.push('Consider naming the function for better debugging');
    }

    if (signature.parameterCount === 0) {
      recommendations.push('Consider adding meaningful parameters or documenting why none are needed');
    }

    if (signature.parameterCount > 5) {
      recommendations.push('Consider using object parameters to reduce parameter count');
    }

    if (!signature.isAsync && signature.source.includes('Promise')) {
      recommendations.push('Consider making the function async for better Promise handling');
    }

    if (issues.length > 0) {
      recommendations.push('Resolve compatibility issues before wrapping');
    }

    return recommendations;
  }
}

/**
 * Function signature information
 * Detailed information about a function's signature
 */
export interface FunctionSignature<T extends AnyFunction> {
  /** Function name */
  readonly name: string;

  /** Number of parameters */
  readonly parameterCount: number;

  /** Parameter names */
  readonly parameterNames: readonly string[];

  /** Is async function */
  readonly isAsync: boolean;

  /** Return type hint */
  readonly returnTypeHint: string;

  /** Function source (truncated) */
  readonly source: string;

  /** Original function reference */
  readonly originalFunction: T;
}

/**
 * Compatibility validation result
 * Result of function compatibility check
 */
export interface CompatibilityResult {
  /** Function is compatible with wrapper */
  readonly compatible: boolean;

  /** Function signature information */
  readonly signature: FunctionSignature<any>;

  /** Compatibility issues (prevent wrapping) */
  readonly issues: readonly string[];

  /** Compatibility warnings (non-blocking) */
  readonly warnings: readonly string[];

  /** Improvement recommendations */
  readonly recommendations: readonly string[];
}

/**
 * Type-safe wrapper creation utility
 * Ensures proper TypeScript type preservation
 */
export class TypeSafeWrapperCreator {
  private static readonly logger = new Logger(TypeSafeWrapperCreator.name);

  /**
   * Create type-safe wrapper with full signature preservation
   *
   * @param originalFunction - Function to wrap
   * @param config - Wrapper configuration
   * @returns Type-safe wrapped function
   */
  public static createWrapper<T extends AnyFunction>(
    originalFunction: T,
    config: WrapperConfig
  ): WrapFunction<T> {
    // Validate compatibility
    const compatibility = FunctionSignatureInspector.validateCompatibility(originalFunction);

    if (!compatibility.compatible) {
      throw new Error(`Function is not compatible with wrapper: ${compatibility.issues.join(', ')}`);
    }

    // Log warnings
    if (compatibility.warnings.length > 0) {
      this.logger.warn(`Function wrapper warnings for ${config.functionId}:`, compatibility.warnings);
    }

    // Create signature-preserving wrapper
    const wrapper = new SignaturePreservingWrapper(originalFunction, config);
    return wrapper.createWrappedFunction();
  }

  /**
   * Create wrapper with type validation
   *
   * @param originalFunction - Function to wrap
   * @param config - Wrapper configuration
   * @param typeValidator - Optional type validator
   * @returns Type-safe wrapped function with validation
   */
  public static createValidatedWrapper<T extends AnyFunction>(
    originalFunction: T,
    config: WrapperConfig,
    typeValidator?: TypeValidator<T>
  ): WrapFunction<T> {
    const wrappedFunction = this.createWrapper(originalFunction, config);

    if (!typeValidator) {
      return wrappedFunction;
    }

    // Add type validation layer
    return this.addTypeValidation(wrappedFunction, typeValidator);
  }

  /**
   * Add type validation to wrapped function
   *
   * @param wrappedFunction - Already wrapped function
   * @param typeValidator - Type validator
   * @returns Function with type validation
   */
  private static addTypeValidation<T extends AnyFunction>(
    wrappedFunction: WrapFunction<T>,
    typeValidator: TypeValidator<T>
  ): WrapFunction<T> {
    return (async (...args: Parameters<T>) => {
      // Validate input types
      const inputValidation = typeValidator.validateInputs(args);
      if (!inputValidation.valid) {
        throw new Error(`Type validation failed: ${inputValidation.errors.join(', ')}`);
      }

      // Execute wrapped function
      const result = await wrappedFunction(...args);

      // Validate output types if successful
      if (result.success && typeValidator.validateOutput) {
        const outputValidation = typeValidator.validateOutput(result.result);
        if (!outputValidation.valid) {
          this.logger.warn(`Output type validation failed:`, outputValidation.errors);
        }
      }

      return result;
    }) as WrapFunction<T>;
  }
}

/**
 * Type validator interface
 * Validates function input and output types
 */
export interface TypeValidator<T extends AnyFunction> {
  /**
   * Validate function inputs
   *
   * @param inputs - Function parameters
   * @returns Validation result
   */
  validateInputs(inputs: Parameters<T>): TypeValidationResult;

  /**
   * Validate function output (optional)
   *
   * @param output - Function result
   * @returns Validation result
   */
  validateOutput?(output: ReturnType<T>): TypeValidationResult;
}

/**
 * Type validation result
 * Result of type validation check
 */
export interface TypeValidationResult {
  /** Validation passed */
  readonly valid: boolean;

  /** Validation errors */
  readonly errors: readonly string[];

  /** Validation metadata */
  readonly metadata?: Record<string, any>;
}