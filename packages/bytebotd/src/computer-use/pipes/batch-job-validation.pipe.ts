/**
 * Batch Job Validation Pipe - Enterprise-grade Input Validation
 *
 * Comprehensive validation pipeline for batch job submissions with
 * dependency validation, security sanitization, and business rule enforcement.
 *
 * Features:
 * - Batch job specification validation
 * - Dependency graph validation and cycle detection
 * - Security sanitization of action parameters
 * - Business rule enforcement (limits, timeouts, etc.)
 * - Cross-job validation and consistency checks
 * - Performance optimization for large batches
 *
 * @author Claude Code - Enterprise Controller Enhancement Specialist
 * @version 1.0.0
 */

import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import {
  BatchJobSubmissionDto,
  BatchJobSpecDto,
  DependencyType,
  BatchExecutionMode,
} from '../dto/batch-job.dto';
import { JobPriority } from '../dto/async-job.dto';

/**
 * Validation context for tracking validation state
 */
interface ValidationContext {
  jobKeys: Set<string>;
  dependencies: Map<string, string[]>;
  actionTypes: Map<string, string>;
  errors: string[];
  warnings: string[];
}

/**
 * Dependency graph node for cycle detection
 */
interface DependencyNode {
  jobKey: string;
  dependencies: Set<string>;
  visited: boolean;
  inStack: boolean;
}

@Injectable()
export class BatchJobValidationPipe implements PipeTransform {
  private readonly logger = new Logger(BatchJobValidationPipe.name);

  // Business rule constants
  private readonly MAX_BATCH_SIZE = 50;
  private readonly MAX_DEPENDENCY_DEPTH = 10;
  private readonly MAX_TIMEOUT = 3600000; // 1 hour
  private readonly MIN_TIMEOUT = 1000; // 1 second
  private readonly DANGEROUS_ACTIONS = new Set([
    'write_file',
    'delete_file',
    'run_command',
    'launch_app',
  ]);

  async transform(value: unknown, metadata: ArgumentMetadata): Promise<BatchJobSubmissionDto> {
    if (metadata.type !== 'body' || !value) {
      throw new BadRequestException('Invalid batch job submission data');
    }
    const operationId = `validation_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    try {
      this.logger.debug(`[${operationId}] Starting batch job validation`);

      // Transform and validate DTO structure
      const batchRequest = plainToClass(BatchJobSubmissionDto, value);
      const validationErrors = await validate(batchRequest, {
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      });
      if (validationErrors.length > 0) {
        const errorMessages = this.formatValidationErrors(validationErrors);
        throw new BadRequestException(
          `Batch validation failed: ${errorMessages.join(', ')}`,
        );
      }

      // Perform comprehensive business validation
      const validationContext = await this.performComprehensiveValidation(
        batchRequest,
        operationId,
      );
      if (validationContext.errors.length > 0) {
        throw new BadRequestException(
          `Batch validation failed: ${validationContext.errors.join(', ')}`,
        );
      }

      // Log warnings if any
      if (validationContext.warnings.length > 0) {
        this.logger.warn(
          `[${operationId}] Batch validation warnings: ${validationContext.warnings.join(', ')}`,
        );
      }

      const processingTime = Date.now() - startTime;
      this.logger.debug(
        `[${operationId}] Batch validation completed successfully (${processingTime}ms)`,
        {
          operationId,
          totalJobs: batchRequest.jobs.length,
          executionMode: batchRequest.executionMode,
          processingTime,
          warningCount: validationContext.warnings.length,
        },
      );

      return batchRequest;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(
        `[${operationId}] Batch validation failed (${processingTime}ms): ${error}`,
        error instanceof Error ? error.stack : undefined,\n        {
          operationId,
          processingTime,
          errorType: error?.constructor?.name ?? 'Unknown',\n        },\n      );
  if (error instanceof BadRequestException) {
        throw error;\n      }
  throw new BadRequestException(\n        `Batch validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,\n      );\n    }\n  }\n\n  /**
 * Perform comprehensive validation of batch job submission\n   */
  private async performComprehensiveValidation(
    batchRequest: BatchJobSubmissionDto,
    operationId: string,\n  ): Promise<ValidationContext> {
    const context: ValidationContext = {
      jobKeys: new Set(),
      dependencies: new Map(),
      actionTypes: new Map(),
      errors: [],
      warnings: [],\n    };\n\n    // 1. Validate batch size limits
    this.validateBatchSize(batchRequest, context);\n\n    // 2. Validate job keys uniqueness
    this.validateJobKeysUniqueness(batchRequest, context);\n\n    // 3. Validate individual job specifications
    await this.validateJobSpecifications(batchRequest, context, operationId);\n\n    // 4. Validate dependency relationships
    this.validateDependencies(batchRequest, context);\n\n    // 5. Validate dependency graph for cycles
    this.validateDependencyGraph(batchRequest, context);\n\n    // 6. Validate execution mode compatibility
    this.validateExecutionModeCompatibility(batchRequest, context);\n\n    // 7. Validate security and safety constraints
    this.validateSecurityConstraints(batchRequest, context);\n\n    // 8. Validate performance and resource constraints
    this.validateResourceConstraints(batchRequest, context);
  return context;\n  }\n\n  /**
 * Validate batch size is within limits\n   */
  private validateBatchSize(batchRequest: BatchJobSubmissionDto, context: ValidationContext): void {
    if (batchRequest.jobs.length === 0) {
      context.errors.push('Batch must contain at least one job');\n    }
  if (batchRequest.jobs.length > this.MAX_BATCH_SIZE) {
      context.errors.push(\n        `Batch size (${batchRequest.jobs.length}) exceeds maximum allowed (${this.MAX_BATCH_SIZE})`,\n      );\n    }if (batchRequest.jobs.length > 20) {context.warnings.push(\n        `Large batch size (${batchRequest.jobs.length}) may impact performance`,\n      );\n    }\n  }\n\n  /*** Validate all job keys are unique\n   */private validateJobKeysUniqueness(
    batchRequest: BatchJobSubmissionDto,
    context: ValidationContext,\n  ): void {
    const jobKeys = new Set<string>();
    const duplicates = new Set<string>();
  batchRequest.jobs.forEach((job) => {
      if (jobKeys.has(job.jobKey)) {
        duplicates.add(job.jobKey);\n      }
      jobKeys.add(job.jobKey);
      context.jobKeys.add(job.jobKey);\n    });
  if (duplicates.size > 0) {
      context.errors.push(\n        `Duplicate job keys found: ${Array.from(duplicates).join(`, ')}',\n      );\n    }\n  }\n\n  /*** Validate individual job specifications\n   */
  private async validateJobSpecifications(
    batchRequest: BatchJobSubmissionDto,
    context: ValidationContext,
    operationId: string,\n  ): Promise<void> {
    for (const [index, job] of batchRequest.jobs.entries()) {
      await this.validateSingleJobSpec(job, index, context, operationId);\n    }\n  }\n\n  /**
 * Validate a single job specification\n   */
  private async validateSingleJobSpec(
    job: BatchJobSpecDto,
    index: number,
    context: ValidationContext,
    operationId: string,\n  ): Promise<void> {
    const jobPrefix = `Job ${index + 1} (${job.jobKey})`;\n\n    // Validate job key formatif (!job.jobKey || job.jobKey.trim().length === 0) {context.errors.push(`${jobPrefix}: Job key cannot be empty`);\n    }if (job.jobKey.length > 100) {context.errors.push(`${jobPrefix}: Job key too long (max 100 characters)`);\n    }if (!/^[a-zA-Z0-9_-]+$/.test(job.jobKey)) {context.errors.push(\n        `${jobPrefix}: Job key must contain only alphanumeric characters, hyphens, and underscores`,\n      );\n    }\n\n    // Validate action specificationif (!job.action || !job.action.action) {context.errors.push(`${jobPrefix}: Action specification is required`);\n    } else {context.actionTypes.set(job.jobKey, job.action.action);\n      \n      // Validate action-specific parametersawait this.validateActionParameters(job, jobPrefix, context, operationId);\n    }\n\n    // Validate timeout
    if (job.timeout !== undefined) {
      if (job.timeout < this.MIN_TIMEOUT) {
        context.errors.push(\n          `${jobPrefix}: Timeout (${job.timeout}ms) is below minimum (${this.MIN_TIMEOUT}ms)`,\n        );\n      }if (job.timeout > this.MAX_TIMEOUT) {context.errors.push(\n          `${jobPrefix}: Timeout (${job.timeout}ms) exceeds maximum (${this.MAX_TIMEOUT}ms)`,\n        );\n      }\n    }\n\n    // Validate priorityif (job.priority && !Object.values(JobPriority).includes(job.priority)) {context.errors.push(\n        `${jobPrefix}: Invalid priority '${job.priority}'. Must be one of: ${Object.values(JobPriority).join(', ')}',\n      );\n    }\n  }\n\n  /*** Validate action-specific parameters\n   */
  private async validateActionParameters(
    job: BatchJobSpecDto,
    jobPrefix: string,
    context: ValidationContext,
    operationId: string,\n  ): Promise<void> {
    const action = job.action.action;\n\n    // Validate dangerous actions
    if (this.DANGEROUS_ACTIONS.has(action)) {
      context.warnings.push(\n        `${jobPrefix}: Action '${action}' requires careful review for security implications',\n      );\n    }\n\n    // Action-specific validationswitch (action) {
      case 'click':case 'double_click':case 'right_click':this.validateMouseAction(job, jobPrefix, context);break;
      case 'type':this.validateTypeAction(job, jobPrefix, context);break;
      case 'move_mouse':this.validateMouseMoveAction(job, jobPrefix, context);break;
      case 'scroll':this.validateScrollAction(job, jobPrefix, context);break;
      case 'write_file':this.validateFileWriteAction(job, jobPrefix, context);break;
      case 'screenshot':\n        // Screenshot requires no additional parameters
        break;
      default:
        context.warnings.push(\n          `${jobPrefix}: Action '${action}' validation not implemented',\n        );\n    }\n  }\n\n  /*** Validate mouse action parameters\n   */
  private validateMouseAction(job: BatchJobSpecDto, jobPrefix: string, context: ValidationContext): void {
    const params = job.action;
  if (params.x === undefined || params.y === undefined) {
      context.errors.push(`${jobPrefix}: Mouse action requires x and y coordinates`);\n    }if (params.x !== undefined && (params.x < 0 || params.x > 10000)) {context.errors.push(`${jobPrefix}: X coordinate (${params.x}) is out of reasonable range`);\n    }if (params.y !== undefined && (params.y < 0 || params.y > 10000)) {context.errors.push(`${jobPrefix}: Y coordinate (${params.y}) is out of reasonable range`);\n    }\n  }\n\n  /*** Validate type action parameters\n   */private validateTypeAction(job: BatchJobSpecDto, jobPrefix: string, context: ValidationContext): void {
    const params = job.action;
  if (!params.text || params.text.trim().length === 0) {
      context.errors.push(`${jobPrefix}: Type action requires non-empty text`);\n    }if (params.text && params.text.length > 10000) {context.warnings.push(\n        `${jobPrefix}: Very long text input (${params.text.length} chars) may cause performance issues`,\n      );\n    }\n  }\n\n  /*** Validate mouse move action parameters\n   */private validateMouseMoveAction(job: BatchJobSpecDto, jobPrefix: string, context: ValidationContext): void {
    const params = job.action;
  if (params.x === undefined || params.y === undefined) {
      context.errors.push(`${jobPrefix}: Mouse move action requires x and y coordinates`);\n    }\n  }\n\n  /**
 * Validate scroll action parameters\n   */
  private validateScrollAction(job: BatchJobSpecDto, jobPrefix: string, context: ValidationContext): void {
    const params = job.action;
  if (params.scrollDirection && !['up', 'down', 'left', 'right'].includes(params.scrollDirection)) {
      context.errors.push(\n        `${jobPrefix}: Invalid scroll direction '${params.scrollDirection}'. Must be: up, down, left, right',\n      );\n    }\n  }\n\n  /*** Validate file write action parameters\n   */
  private validateFileWriteAction(job: BatchJobSpecDto, jobPrefix: string, context: ValidationContext): void {
    const params = job.action;
  if (!params.filename) {
      context.errors.push(`${jobPrefix}: File write action requires filename`);\n    }if (!params.data) {context.errors.push(`${jobPrefix}: File write action requires data`);\n    }\n\n    // Security check for dangerous file paths
    if (params.filename) {
      const dangerousPaths = ['/etc/', '/usr/', '/bin/', '/sbin/', 'C:\\\\Windows\\\\', 'C:\\\\Program Files\\\\'];
      const isDangerous = dangerousPaths.some(path => params.filename.startsWith(path));
  if (isDangerous) {
        context.errors.push(\n          `${jobPrefix}: Writing to system directory '${params.filename}' is not allowed',\n        );\n      }\n    }\n  }\n\n  /*** Validate dependency relationships\n   */
  private validateDependencies(batchRequest: BatchJobSubmissionDto, context: ValidationContext): void {
    batchRequest.jobs.forEach((job) => {
      if (job.dependencies) {
        const jobDeps: string[] = [];
  job.dependencies.forEach((dep) => {\n          // Check if dependency job key exists
          if (!context.jobKeys.has(dep.dependsOnJobId)) {
            context.errors.push(\n              `Job '${job.jobKey}' depends on non-existent job '${dep.dependsOnJobId}'',\n            );\n          }\n\n          // Check for self-dependencyif (dep.dependsOnJobId === job.jobKey) {
            context.errors.push(\n              `Job '${job.jobKey}' cannot depend on itself',\n            );\n          }\n\n          // Validate dependency typeif (!Object.values(DependencyType).includes(dep.type)) {
            context.errors.push(\n              `Job '${job.jobKey}' has invalid dependency type '${dep.type}'',\n            );\n          }jobDeps.push(dep.dependsOnJobId);\n        });
  context.dependencies.set(job.jobKey, jobDeps);\n      }\n    });\n  }\n\n  /**
 * Validate dependency graph for cycles and depth\n   */
  private validateDependencyGraph(batchRequest: BatchJobSubmissionDto, context: ValidationContext): void {
    const nodes = new Map<string, DependencyNode>();\n    \n    // Build dependency graph
    context.jobKeys.forEach((jobKey) => {
      nodes.set(jobKey, {
        jobKey,
        dependencies: new Set(context.dependencies.get(jobKey) || []),
        visited: false,
        inStack: false,\n      });\n    });\n\n    // Check for cycles using DFS
    const hasCycle = (nodeKey: string, depth: number = 0): boolean => {
      const node = nodes.get(nodeKey);
      if (!node) return false;
  if (depth > this.MAX_DEPENDENCY_DEPTH) {
        context.errors.push(\n          `Dependency chain too deep (>${this.MAX_DEPENDENCY_DEPTH}) starting from job '${nodeKey}'',\n        );return true;\n      }
  if (node.inStack) {
        // Cycle detected
        context.errors.push(\n          `Circular dependency detected involving job '${nodeKey}'',\n        );return true;\n      }
  if (node.visited) {
        return false;\n      }
  node.visited = true;
      node.inStack = true;
  for (const depKey of node.dependencies) {
        if (hasCycle(depKey, depth + 1)) {
          return true;\n        }\n      }
  node.inStack = false;
      return false;\n    };\n\n    // Check all nodes for cycles
    context.jobKeys.forEach((jobKey) => {
      const node = nodes.get(jobKey);
      if (node && !node.visited) {
        hasCycle(jobKey);\n      }\n    });\n  }\n\n  /**
 * Validate execution mode compatibility\n   */
  private validateExecutionModeCompatibility(
    batchRequest: BatchJobSubmissionDto,
    context: ValidationContext,\n  ): void {
    const mode = batchRequest.executionMode;
    const hasDependencies = batchRequest.jobs.some(job => job.dependencies && job.dependencies.length > 0);
  if (mode === BatchExecutionMode.PARALLEL && hasDependencies) {
      context.warnings.push(\n        'Parallel execution mode with dependencies may not respect dependency order',\n      );\n    }if (mode === BatchExecutionMode.SEQUENTIAL && batchRequest.jobs.length > 10) {context.warnings.push(\n        'Sequential execution of large batch may take significant time',\n      );\n    }\n  }\n\n  /**
 * Validate security constraints\n   */
  private validateSecurityConstraints(
    batchRequest: BatchJobSubmissionDto,
    context: ValidationContext,\n  ): void {
    const dangerousActionCount = batchRequest.jobs.filter(job => 
      this.DANGEROUS_ACTIONS.has(job.action.action)\n    ).length;
  if (dangerousActionCount > 5) {
      context.warnings.push(\n        `Batch contains ${dangerousActionCount} potentially dangerous actions - review recommended`,\n      );\n    }\n\n    // Check for suspicious patterns
    const fileWriteJobs = batchRequest.jobs.filter(job => job.action.action === 'write_file');
    if (fileWriteJobs.length > 10) {
      context.warnings.push(\n        `Batch contains ${fileWriteJobs.length} file write operations - verify necessity`,\n      );\n    }\n  }\n\n  /*** Validate resource constraints\n   */private validateResourceConstraints(
    batchRequest: BatchJobSubmissionDto,
    context: ValidationContext,\n  ): Promise<void> {
    const totalTimeout = batchRequest.jobs.reduce(\n      (sum, job) => sum + (job.timeout || 30000),\n      0,\n    );
  const batchTimeout = batchRequest.batchTimeout || 300000;
  if (batchRequest.executionMode === BatchExecutionMode.SEQUENTIAL && totalTimeout > batchTimeout) {
      context.warnings.push(\n        `Sequential execution timeout (${totalTimeout}ms) exceeds batch timeout (${batchTimeout}ms)`,\n      );\n    }\n\n    // Estimate memory usage for large data operations
    const dataIntensiveJobs = batchRequest.jobs.filter(job => \n      ['screenshot', 'write_file', 'read_file'].includes(job.action.action)\n    ).length;
  if (dataIntensiveJobs > 20) {
      context.warnings.push(\n        `Batch contains ${dataIntensiveJobs} data-intensive operations - may require significant memory`,\n      );\n    }
  return Promise.resolve();\n  }\n\n  /**
 * Format validation errors into readable messages\n   */
  private formatValidationErrors(errors: Array<{ constraints?: Record<string, string>; children?: Array<{ constraints?: Record<string, string>; children?: unknown[] }> }>): string[] {
    const messages: string[] = [];
  errors.forEach((error) => {
      if (error.constraints) {
        Object.values(error.constraints).forEach((constraint) => {
          messages.push(constraint as string);\n        });\n      }
  if (error.children) {
        const childMessages = this.formatValidationErrors(error.children);
        messages.push(...childMessages);\n      }\n    });
  return messages;\n  }\n}