/**
 * Browser Orchestration Validation Service
 *
 * Comprehensive validation service for browser orchestration operations providing
 * advanced input validation, security constraint enforcement, and business rule
 * validation for multi-agent browser automation workflows.
 *
 * Features:
 * - Orchestration strategy validation and optimization
 * - Multi-agent coordination validation
 * - Resource allocation and constraint validation
 * - Task distribution and dependency validation
 * - Security and compliance validation
 * - Performance optimization recommendations
 * - Orchestration configuration sanitization
 * - Advanced caching and optimization
 *
 * Validation Categories:
 * - Strategy Validation: Orchestration patterns and coordination methods
 * - Resource Validation: CPU, memory, network, and storage constraints
 * - Agent Validation: Agent count, capabilities, and coordination
 * - Task Validation: Task complexity, dependencies, and distribution
 * - Security Validation: Security levels, compliance, and risk assessment
 * - Performance Validation: Optimization and efficiency recommendations
 *
 * @module OrchestrationValidationService
 * @version 1.0.0
 * @author Specialized API Security & Validation Agent
 * @since Browser Orchestration Security Implementation
 */

import {
  Injectable,
  BadRequestException,
  UnprocessableEntityException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  validate,
  ValidationError,
  ValidatorOptions,
  IsInt,
  IsString,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsArray,
  ValidateNested,
  Min,
  Max,
  IsObject,
  ArrayMaxSize,
  ArrayMinSize,
} from 'class-validator';
import { Transform, Type, plainToClass } from 'class-transformer';

// Import base validation components
import {
  BrowserValidationService,
  ValidationResult,
  ValidationIssue,
  IsSafeBrowserSelector,
  IsSafeUrl,
  SanitizeHtml,
} from '../../browser/validation.service';

// Import orchestration types
import {
  OrchestrationStrategy,
  TaskPriority,
  ResourceLimits,
  OrchestrationConfig,
  MultiAgentSession,
  DistributedTask,
  AgentCapability,
  CoordinationMode,
  TaskDistributionStrategy,
  FailoverConfig,
} from '../types/orchestration.types';

// Import security types
import {
  OrchestrationSecurityLevel,
  OrchestrationRiskLevel,
  OrchestrationCompliance,
} from '../decorators/orchestration-security.decorators';

/**
 * Orchestration validation configuration
 */
interface OrchestrationValidationConfig {
  enableStrategyValidation: boolean;
  enableResourceValidation: boolean;
  enableAgentValidation: boolean;
  enableTaskValidation: boolean;
  enableSecurityValidation: boolean;
  enablePerformanceValidation: boolean;
  maxValidationCacheSize: number;
  validationCacheTtl: number;
  strictValidationMode: boolean;
  enableOptimizationRecommendations: boolean;
  maxAgentCount: number;
  maxSessionCount: number;
  maxTaskComplexity: number;
  maxResourceAllocation: ResourceLimits;
}

/**
 * Orchestration validation context
 */
interface OrchestrationValidationContext {
  userId?: string;
  sessionId?: string;
  operationId?: string;
  securityLevel?: OrchestrationSecurityLevel;
  riskLevel?: OrchestrationRiskLevel;
  complianceRequirements?: OrchestrationCompliance[];
  requestId?: string;
  endpoint?: string;
  timestamp: Date;
  userRole?: string;
  permissions?: string[];
}

/**
 * Orchestration validation result
 */
interface OrchestrationValidationResult extends ValidationResult {
  optimizationRecommendations: OptimizationRecommendation[];
  resourceUsageEstimate: ResourceUsageEstimate;
  performanceMetrics: PerformanceValidationMetrics;
  securityAssessment: SecurityValidationAssessment;
  strategyAnalysis: StrategyValidationAnalysis;
}

/**
 * Optimization recommendation
 */
interface OptimizationRecommendation {
  type: 'PERFORMANCE' | 'RESOURCE' | 'SECURITY' | 'STRATEGY';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  impact: string;
  implementation: string;
  estimatedImprovement: number; // percentage
  costBenefit: 'LOW' | 'MEDIUM' | 'HIGH';
}

/**
 * Resource usage estimate
 */
interface ResourceUsageEstimate {
  memoryUsageGB: number;
  cpuUsagePercent: number;
  networkUsageMBps: number;
  storageUsageGB: number;
  estimatedDurationMs: number;
  peakResourceTime: Date;
  resourceEfficiency: number; // 0-1 scale
  scalabilityFactor: number;
}

/**
 * Performance validation metrics
 */
interface PerformanceValidationMetrics {
  expectedThroughput: number;
  latencyEstimateMs: number;
  scalabilityScore: number; // 0-100
  efficiencyRating: number; // 0-100
  bottleneckAnalysis: BottleneckAnalysis[];
  optimizationPotential: number; // 0-100
}

/**
 * Security validation assessment
 */
interface SecurityValidationAssessment {
  overallSecurityScore: number; // 0-100
  vulnerabilities: SecurityVulnerability[];
  complianceStatus: ComplianceStatus[];
  riskFactors: RiskFactor[];
  securityRecommendations: SecurityRecommendation[];
}

/**
 * Strategy validation analysis
 */
interface StrategyValidationAnalysis {
  strategyViability: number; // 0-100
  coordinationComplexity: number; // 0-100
  failoverRobustness: number; // 0-100
  scalabilityPotential: number; // 0-100
  strategicRecommendations: StrategicRecommendation[];
}

/**
 * Bottleneck analysis
 */
interface BottleneckAnalysis {
  component: 'CPU' | 'MEMORY' | 'NETWORK' | 'STORAGE' | 'COORDINATION' | 'TASK_DISTRIBUTION';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  impact: string;
  resolution: string;
  priority: number;
}

/**
 * Security vulnerability
 */
interface SecurityVulnerability {
  type: 'AUTHENTICATION' | 'AUTHORIZATION' | 'COMMUNICATION' | 'DATA' | 'CONFIGURATION';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  affected: string[];
  mitigation: string;
  cveScore?: number;
}

/**
 * Compliance status
 */
interface ComplianceStatus {
  requirement: OrchestrationCompliance;
  status: 'COMPLIANT' | 'NON_COMPLIANT' | 'PARTIAL' | 'UNKNOWN';
  score: number; // 0-100
  gaps: string[];
  remediation: string[];
}

/**
 * Risk factor
 */
interface RiskFactor {
  category: 'OPERATIONAL' | 'SECURITY' | 'COMPLIANCE' | 'PERFORMANCE' | 'FINANCIAL';
  risk: string;
  probability: number; // 0-100
  impact: number; // 0-100
  riskScore: number; // 0-100
  mitigation: string;
}

/**
 * Security recommendation
 */
interface SecurityRecommendation {
  category: 'AUTHENTICATION' | 'AUTHORIZATION' | 'ENCRYPTION' | 'MONITORING' | 'COMPLIANCE';
  recommendation: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  implementation: string;
  benefit: string;
}

/**
 * Strategic recommendation
 */
interface StrategicRecommendation {
  aspect: 'COORDINATION' | 'DISTRIBUTION' | 'FAILOVER' | 'SCALING' | 'OPTIMIZATION';
  recommendation: string;
  rationale: string;
  implementation: string;
  expectedBenefit: string;
  effort: 'LOW' | 'MEDIUM' | 'HIGH';
}

// ===== VALIDATION DTOs =====

/**
 * Orchestration strategy validation DTO
 */
export class OrchestrationStrategyDto {
  @IsInt()
  @Min(1)
  @Max(100)
  maxAgents: number;

  @IsInt()
  @Min(1)
  @Max(250)
  maxSessions: number;

  @IsEnum(CoordinationMode)
  coordinationMode: CoordinationMode;

  @IsEnum(TaskDistributionStrategy)
  taskDistribution: TaskDistributionStrategy;

  @IsString()
  @IsOptional()
  coordinationProtocol?: string;

  @IsBoolean()
  @IsOptional()
  encryptedCommunication?: boolean;

  @IsBoolean()
  @IsOptional()
  agentIsolation?: boolean;

  @IsBoolean()
  @IsOptional()
  monitoringEnabled?: boolean;

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => FailoverConfigDto)
  failoverConfig?: FailoverConfigDto;

  @IsObject()
  @IsOptional()
  customDistributionLogic?: Record<string, unknown>;

  @IsArray()
  @IsOptional()
  @ArrayMaxSize(20)
  tags?: string[];
}

/**
 * Failover configuration validation DTO
 */
export class FailoverConfigDto {
  @IsBoolean()
  enabled: boolean;

  @IsString()
  @IsEnum(['IMMEDIATE', 'GRACEFUL', 'MANUAL'])
  strategy: string;

  @IsInt()
  @Min(1000)
  @Max(300000)
  timeoutMs: number;

  @IsInt()
  @Min(1)
  @Max(5)
  maxRetries: number;

  @IsArray()
  @IsOptional()
  fallbackAgents?: string[];
}

/**
 * Resource limits validation DTO
 */
export class ResourceLimitsDto {
  @IsInt()
  @Min(1)
  @Max(256)
  maxMemoryGB: number;

  @IsInt()
  @Min(1)
  @Max(64)
  maxCpuCores: number;

  @IsInt()
  @Min(10)
  @Max(10000)
  maxNetworkMBps: number;

  @IsInt()
  @Min(1)
  @Max(1000)
  maxStorageGB: number;

  @IsInt()
  @Min(60000)
  @Max(14400000)
  maxExecutionTimeMs: number;
}

/**
 * Distributed task validation DTO
 */
export class DistributedTaskDto {
  @IsString()
  @Transform(({ value }) => value?.trim())
  name: string;

  @IsString()
  @Transform(({ value }) => value?.trim())
  @SanitizeHtml()
  description: string;

  @IsEnum(TaskPriority)
  priority: TaskPriority;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskActionDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  actions: TaskActionDto[];

  @IsArray()
  @IsOptional()
  dependencies?: string[];

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;

  @IsInt()
  @IsOptional()
  @Min(5000)
  @Max(3600000)
  timeoutMs?: number;
}

/**
 * Task action validation DTO
 */
export class TaskActionDto {
  @IsString()
  @IsEnum(['navigate', 'click', 'type', 'extract', 'screenshot', 'wait', 'custom'])
  type: string;

  @IsString()
  @IsOptional()
  @IsSafeBrowserSelector()
  selector?: string;

  @IsString()
  @IsOptional()
  @IsSafeUrl()
  url?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @SanitizeHtml()
  text?: string;

  @IsObject()
  @IsOptional()
  parameters?: Record<string, unknown>;

  @IsInt()
  @IsOptional()
  @Min(100)
  @Max(60000)
  waitTimeoutMs?: number;
}

/**
 * Orchestration configuration validation DTO
 */
export class OrchestrationConfigDto {
  @ValidateNested()
  @Type(() => OrchestrationStrategyDto)
  strategy: OrchestrationStrategyDto;

  @ValidateNested()
  @Type(() => ResourceLimitsDto)
  resourceLimits: ResourceLimitsDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DistributedTaskDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  tasks: DistributedTaskDto[];

  @IsEnum(OrchestrationSecurityLevel)
  @IsOptional()
  securityLevel?: OrchestrationSecurityLevel;

  @IsArray()
  @IsOptional()
  @IsEnum(OrchestrationCompliance, { each: true })
  complianceRequirements?: OrchestrationCompliance[];

  @IsObject()
  @IsOptional()
  monitoringConfig?: Record<string, unknown>;

  @IsBoolean()
  @IsOptional()
  emergencyMode?: boolean;
}

/**
 * Browser Orchestration Validation Service
 */
@Injectable()
export class OrchestrationValidationService {
  private readonly logger = new Logger(OrchestrationValidationService.name);
  private readonly validationCache = new Map<string, {
    result: OrchestrationValidationResult;
    timestamp: number;
    ttl: number;
  }>();
  private readonly config: OrchestrationValidationConfig;

  // Performance benchmarks for validation
  private readonly performanceBenchmarks = {
    agentEfficiencyThreshold: 0.85,
    resourceUtilizationOptimal: 0.75,
    coordinationOverheadMax: 0.15,
    taskDistributionBalance: 0.9,
    failoverResponseTimeMs: 5000,
    scalabilityFactorMin: 1.5,
  };

  // Security baselines
  private readonly securityBaselines = {
    minimumEncryption: 'TLS_1_2',
    requiredIsolationLevel: 'BASIC',
    mandatoryMonitoring: true,
    complianceScoreThreshold: 80,
    vulnerabilityThreshold: 'MEDIUM',
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly baseValidationService: BrowserValidationService,
  ) {
    this.config = this.loadOrchestrationValidationConfig();

    // Setup cache cleanup
    setInterval(() => this.cleanupValidationCache(), 300000); // Every 5 minutes

    this.logger.log('🔍 Orchestration Validation Service initialized', {
      strategyValidation: this.config.enableStrategyValidation,
      resourceValidation: this.config.enableResourceValidation,
      securityValidation: this.config.enableSecurityValidation,
      performanceValidation: this.config.enablePerformanceValidation,
      strictMode: this.config.strictValidationMode,
      cacheEnabled: this.config.maxValidationCacheSize > 0,
    });
  }

  /**
   * Validate complete orchestration configuration
   */
  async validateOrchestrationConfig(
    config: any,
    context: OrchestrationValidationContext,
  ): Promise<OrchestrationValidationResult> {
    const operationId = `validate_orchestration_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    this.logger.debug(`[${operationId}] Validating orchestration configuration`, {
      operationId,
      agentCount: config.strategy?.maxAgents,
      sessionCount: config.strategy?.maxSessions,
      taskCount: config.tasks?.length,
      securityLevel: config.securityLevel,
      userId: context.userId,
    });

    try {
      // Check validation cache
      const cacheKey = this.generateCacheKey('orchestration_config', config, context);
      const cachedResult = this.getFromCache(cacheKey);

      if (cachedResult) {
        this.logger.debug(`[${operationId}] Validation cache hit`, { operationId, cacheKey });
        return { ...cachedResult, cacheHit: true };
      }

      const errors: ValidationIssue[] = [];
      const warnings: ValidationIssue[] = [];
      const optimizationRecommendations: OptimizationRecommendation[] = [];

      // 1. DTO validation with class-validator
      const configDto = await this.validateConfigurationDto(config, errors);

      // 2. Strategy validation
      let strategyAnalysis: StrategyValidationAnalysis;
      if (this.config.enableStrategyValidation) {
        strategyAnalysis = await this.validateOrchestrationStrategy(
          config.strategy,
          context,
          errors,
          warnings,
          optimizationRecommendations,
        );
      }

      // 3. Resource validation
      let resourceUsageEstimate: ResourceUsageEstimate;
      if (this.config.enableResourceValidation) {
        resourceUsageEstimate = await this.validateResourceAllocation(
          config.resourceLimits,
          config.strategy,
          context,
          errors,
          warnings,
          optimizationRecommendations,
        );
      }

      // 4. Agent coordination validation
      if (this.config.enableAgentValidation) {
        await this.validateAgentCoordination(
          config.strategy,
          context,
          errors,
          warnings,
          optimizationRecommendations,
        );
      }

      // 5. Task validation
      if (this.config.enableTaskValidation) {
        await this.validateDistributedTasks(
          config.tasks,
          config.strategy,
          context,
          errors,
          warnings,
          optimizationRecommendations,
        );
      }

      // 6. Security validation
      let securityAssessment: SecurityValidationAssessment;
      if (this.config.enableSecurityValidation) {
        securityAssessment = await this.validateOrchestrationSecurity(
          config,
          context,
          errors,
          warnings,
          optimizationRecommendations,
        );
      }

      // 7. Performance validation
      let performanceMetrics: PerformanceValidationMetrics;
      if (this.config.enablePerformanceValidation) {
        performanceMetrics = await this.validatePerformanceCharacteristics(
          config,
          context,
          errors,
          warnings,
          optimizationRecommendations,
        );
      }

      // 8. Sanitize configuration
      const sanitizedData = await this.sanitizeOrchestrationConfig(config);

      const validationTime = Date.now() - startTime;
      const result: OrchestrationValidationResult = {
        isValid: errors.length === 0,
        errors,
        warnings,
        sanitizedData,
        validationTime,
        optimizationRecommendations,
        resourceUsageEstimate: resourceUsageEstimate || this.getDefaultResourceEstimate(),
        performanceMetrics: performanceMetrics || this.getDefaultPerformanceMetrics(),
        securityAssessment: securityAssessment || this.getDefaultSecurityAssessment(),
        strategyAnalysis: strategyAnalysis || this.getDefaultStrategyAnalysis(),
      };

      // Cache successful validations
      if (result.isValid && this.config.maxValidationCacheSize > 0) {
        this.setCache(cacheKey, result);
      }

      this.logger.log(`[${operationId}] Orchestration validation completed`, {
        operationId,
        isValid: result.isValid,
        errorsCount: errors.length,
        warningsCount: warnings.length,
        optimizationsCount: optimizationRecommendations.length,
        validationTime,
        securityScore: securityAssessment?.overallSecurityScore,
        performanceScore: performanceMetrics?.efficiencyRating,
      });

      return result;

    } catch (error) {
      const validationTime = Date.now() - startTime;

      this.logger.error(`[${operationId}] Orchestration validation failed`, {
        operationId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        validationTime,
      });

      throw new UnprocessableEntityException({
        message: 'Orchestration validation processing failed',
        error: error instanceof Error ? error.message : String(error),
        operationId,
      });
    }
  }

  /**
   * Validate orchestration strategy configuration
   */
  async validateOrchestrationStrategy(
    strategy: any,
    context: OrchestrationValidationContext,
    errors: ValidationIssue[],
    warnings: ValidationIssue[],
    optimizations: OptimizationRecommendation[],
  ): Promise<StrategyValidationAnalysis> {
    let strategyViability = 100;
    let coordinationComplexity = 0;
    let failoverRobustness = 50;
    let scalabilityPotential = 50;
    const strategicRecommendations: StrategicRecommendation[] = [];

    // Validate agent count appropriateness
    if (strategy.maxAgents > this.config.maxAgentCount) {
      errors.push({
        field: 'strategy.maxAgents',
        message: `Agent count exceeds maximum allowed: ${this.config.maxAgentCount}`,
        code: 'AGENT_COUNT_EXCEEDED',
        severity: 'error',
        value: strategy.maxAgents,
        constraint: `maxAgents <= ${this.config.maxAgentCount}`,
      });
      strategyViability -= 30;
    }

    // Validate coordination mode appropriateness
    coordinationComplexity = this.calculateCoordinationComplexity(strategy);
    if (coordinationComplexity > 80 && strategy.maxAgents > 20) {
      warnings.push({
        field: 'strategy.coordinationMode',
        message: 'High coordination complexity with many agents may impact performance',
        code: 'HIGH_COORDINATION_COMPLEXITY',
        severity: 'warning',
        context: { complexity: coordinationComplexity },
      });

      strategicRecommendations.push({
        aspect: 'COORDINATION',
        recommendation: 'Consider hierarchical coordination for large agent counts',
        rationale: 'Reduces coordination overhead and improves scalability',
        implementation: 'Switch to HIERARCHICAL coordination mode',
        expectedBenefit: 'Improved performance and reduced coordination overhead',
        effort: 'LOW',
      });
    }

    // Validate task distribution strategy
    if (strategy.taskDistribution === 'CUSTOM' && !strategy.customDistributionLogic) {
      errors.push({
        field: 'strategy.taskDistribution',
        message: 'Custom task distribution requires distribution logic',
        code: 'MISSING_DISTRIBUTION_LOGIC',
        severity: 'error',
        constraint: 'customDistributionLogic required for CUSTOM distribution',
      });
      strategyViability -= 20;
    }

    // Validate failover configuration
    if (strategy.failoverConfig) {
      failoverRobustness = this.validateFailoverConfiguration(
        strategy.failoverConfig,
        strategy.maxAgents,
        errors,
        warnings,
      );
    } else if (strategy.maxAgents > 10) {
      warnings.push({
        field: 'strategy.failoverConfig',
        message: 'No failover configuration for multi-agent operation',
        code: 'MISSING_FAILOVER_CONFIG',
        severity: 'warning',
        constraint: 'failoverConfig recommended for maxAgents > 10',
      });

      strategicRecommendations.push({
        aspect: 'FAILOVER',
        recommendation: 'Implement failover configuration for robust operation',
        rationale: 'Prevents operation failure when individual agents fail',
        implementation: 'Add failover configuration with graceful strategy',
        expectedBenefit: 'Improved reliability and fault tolerance',
        effort: 'MEDIUM',
      });
    }

    // Calculate scalability potential
    scalabilityPotential = this.calculateScalabilityPotential(strategy);

    // Security recommendations
    if (!strategy.encryptedCommunication && strategy.maxAgents > 5) {
      optimizations.push({
        type: 'SECURITY',
        priority: 'HIGH',
        description: 'Enable encrypted communication for multi-agent operations',
        impact: 'Improved security and data protection',
        implementation: 'Set encryptedCommunication: true in strategy',
        estimatedImprovement: 25,
        costBenefit: 'HIGH',
      });
    }

    if (!strategy.agentIsolation && strategy.maxAgents > 10) {
      optimizations.push({
        type: 'SECURITY',
        priority: 'MEDIUM',
        description: 'Enable agent isolation for large-scale operations',
        impact: 'Prevents cross-agent contamination and improves security',
        implementation: 'Set agentIsolation: true in strategy',
        estimatedImprovement: 15,
        costBenefit: 'MEDIUM',
      });
    }

    return {
      strategyViability,
      coordinationComplexity,
      failoverRobustness,
      scalabilityPotential,
      strategicRecommendations,
    };
  }

  /**
   * Validate resource allocation and generate usage estimates
   */
  async validateResourceAllocation(
    resourceLimits: any,
    strategy: any,
    context: OrchestrationValidationContext,
    errors: ValidationIssue[],
    warnings: ValidationIssue[],
    optimizations: OptimizationRecommendation[],
  ): Promise<ResourceUsageEstimate> {
    // Validate individual resource limits
    const maxLimits = this.config.maxResourceAllocation;

    if (resourceLimits.maxMemoryGB > maxLimits.maxMemoryGB) {
      errors.push({
        field: 'resourceLimits.maxMemoryGB',
        message: `Memory allocation exceeds maximum: ${maxLimits.maxMemoryGB}GB`,
        code: 'MEMORY_LIMIT_EXCEEDED',
        severity: 'error',
        value: resourceLimits.maxMemoryGB,
        constraint: `maxMemoryGB <= ${maxLimits.maxMemoryGB}`,
      });
    }

    if (resourceLimits.maxCpuCores > maxLimits.maxCpuCores) {
      errors.push({
        field: 'resourceLimits.maxCpuCores',
        message: `CPU allocation exceeds maximum: ${maxLimits.maxCpuCores} cores`,
        code: 'CPU_LIMIT_EXCEEDED',
        severity: 'error',
        value: resourceLimits.maxCpuCores,
        constraint: `maxCpuCores <= ${maxLimits.maxCpuCores}`,
      });
    }

    // Calculate resource usage estimates
    const agentCount = strategy.maxAgents || 1;
    const sessionCount = strategy.maxSessions || 1;

    const memoryUsageGB = this.estimateMemoryUsage(resourceLimits, agentCount, sessionCount);
    const cpuUsagePercent = this.estimateCpuUsage(resourceLimits, agentCount, sessionCount);
    const networkUsageMBps = this.estimateNetworkUsage(resourceLimits, agentCount);
    const storageUsageGB = this.estimateStorageUsage(resourceLimits, agentCount);
    const estimatedDurationMs = resourceLimits.maxExecutionTimeMs || 1800000;

    // Calculate efficiency and optimization recommendations
    const resourceEfficiency = this.calculateResourceEfficiency(
      memoryUsageGB,
      cpuUsagePercent,
      networkUsageMBps,
      resourceLimits,
    );

    if (resourceEfficiency < this.performanceBenchmarks.resourceUtilizationOptimal) {
      optimizations.push({
        type: 'RESOURCE',
        priority: 'MEDIUM',
        description: 'Resource allocation can be optimized for better efficiency',
        impact: 'Reduced costs and improved performance',
        implementation: 'Adjust resource limits based on actual usage patterns',
        estimatedImprovement: (this.performanceBenchmarks.resourceUtilizationOptimal - resourceEfficiency) * 100,
        costBenefit: 'HIGH',
      });
    }

    const scalabilityFactor = this.calculateResourceScalabilityFactor(resourceLimits, agentCount);

    return {
      memoryUsageGB,
      cpuUsagePercent,
      networkUsageMBps,
      storageUsageGB,
      estimatedDurationMs,
      peakResourceTime: new Date(Date.now() + estimatedDurationMs * 0.6), // Peak at 60% of execution
      resourceEfficiency,
      scalabilityFactor,
    };
  }

  /**
   * Validate agent coordination configuration
   */
  async validateAgentCoordination(
    strategy: any,
    context: OrchestrationValidationContext,
    errors: ValidationIssue[],
    warnings: ValidationIssue[],
    optimizations: OptimizationRecommendation[],
  ): Promise<void> {
    const agentCount = strategy.maxAgents || 1;

    // Validate coordination protocol
    const supportedProtocols = ['HTTP', 'WEBSOCKET', 'GRPC', 'MQTT'];
    if (strategy.coordinationProtocol && !supportedProtocols.includes(strategy.coordinationProtocol)) {
      errors.push({
        field: 'strategy.coordinationProtocol',
        message: `Unsupported coordination protocol: ${strategy.coordinationProtocol}`,
        code: 'UNSUPPORTED_PROTOCOL',
        severity: 'error',
        value: strategy.coordinationProtocol,
        constraint: `protocol must be one of: ${supportedProtocols.join(', ')}`,
      });
    }

    // Validate coordination mode vs agent count
    if (strategy.coordinationMode === 'PEER_TO_PEER' && agentCount > 20) {
      warnings.push({
        field: 'strategy.coordinationMode',
        message: 'Peer-to-peer coordination may not scale well with many agents',
        code: 'SCALING_CONCERN',
        severity: 'warning',
        context: { agentCount, recommendedMode: 'HIERARCHICAL' },
      });

      optimizations.push({
        type: 'STRATEGY',
        priority: 'MEDIUM',
        description: 'Switch to hierarchical coordination for better scalability',
        impact: 'Improved coordination efficiency at scale',
        implementation: 'Change coordinationMode to HIERARCHICAL',
        estimatedImprovement: 30,
        costBenefit: 'HIGH',
      });
    }

    // Validate monitoring requirements
    if (!strategy.monitoringEnabled && agentCount > 5) {
      warnings.push({
        field: 'strategy.monitoringEnabled',
        message: 'Monitoring recommended for multi-agent operations',
        code: 'MONITORING_RECOMMENDED',
        severity: 'warning',
        constraint: 'monitoringEnabled: true recommended for maxAgents > 5',
      });

      optimizations.push({
        type: 'STRATEGY',
        priority: 'HIGH',
        description: 'Enable monitoring for better observability',
        impact: 'Improved debugging and performance insights',
        implementation: 'Set monitoringEnabled: true',
        estimatedImprovement: 20,
        costBenefit: 'HIGH',
      });
    }
  }

  /**
   * Validate distributed tasks configuration
   */
  async validateDistributedTasks(
    tasks: any[],
    strategy: any,
    context: OrchestrationValidationContext,
    errors: ValidationIssue[],
    warnings: ValidationIssue[],
    optimizations: OptimizationRecommendation[],
  ): Promise<void> {
    if (!Array.isArray(tasks) || tasks.length === 0) {
      errors.push({
        field: 'tasks',
        message: 'At least one task is required for orchestration',
        code: 'NO_TASKS',
        severity: 'error',
        constraint: 'tasks.length >= 1',
      });
      return;
    }

    // Validate task count vs agent capacity
    const agentCount = strategy.maxAgents || 1;
    const taskCount = tasks.length;
    const tasksPerAgent = taskCount / agentCount;

    if (tasksPerAgent > 10) {
      warnings.push({
        field: 'tasks',
        message: 'High task-to-agent ratio may impact performance',
        code: 'HIGH_TASK_RATIO',
        severity: 'warning',
        context: { tasksPerAgent: Math.round(tasksPerAgent * 100) / 100 },
      });

      optimizations.push({
        type: 'STRATEGY',
        priority: 'MEDIUM',
        description: 'Increase agent count or reduce task complexity',
        impact: 'Better task distribution and performance',
        implementation: 'Increase maxAgents or split complex tasks',
        estimatedImprovement: 25,
        costBenefit: 'MEDIUM',
      });
    }

    // Validate individual tasks
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      const taskPrefix = `tasks[${i}]`;

      // Validate task structure
      if (!task.name || typeof task.name !== 'string' || task.name.trim().length === 0) {
        errors.push({
          field: `${taskPrefix}.name`,
          message: 'Task name is required',
          code: 'MISSING_TASK_NAME',
          severity: 'error',
        });
      }

      if (!task.actions || !Array.isArray(task.actions) || task.actions.length === 0) {
        errors.push({
          field: `${taskPrefix}.actions`,
          message: 'Task must have at least one action',
          code: 'NO_TASK_ACTIONS',
          severity: 'error',
        });
      }

      // Validate task actions
      if (task.actions && Array.isArray(task.actions)) {
        for (let j = 0; j < task.actions.length; j++) {
          const action = task.actions[j];
          const actionPrefix = `${taskPrefix}.actions[${j}]`;

          // Use base validation service for action validation
          const actionValidation = await this.baseValidationService.validateBrowserTask(
            { actions: [action] },
            {
              userId: context.userId,
              sessionId: context.sessionId,
              requestId: context.requestId,
              endpoint: context.endpoint,
              timestamp: context.timestamp,
            },
          );

          // Add action-specific errors
          actionValidation.errors.forEach(error => {
            errors.push({
              ...error,
              field: `${actionPrefix}.${error.field}`,
            });
          });

          actionValidation.warnings.forEach(warning => {
            warnings.push({
              ...warning,
              field: `${actionPrefix}.${warning.field}`,
            });
          });
        }
      }

      // Validate task dependencies
      if (task.dependencies && Array.isArray(task.dependencies)) {
        task.dependencies.forEach((dep, depIndex) => {
          if (typeof dep !== 'string') {
            errors.push({
              field: `${taskPrefix}.dependencies[${depIndex}]`,
              message: 'Task dependency must be a string',
              code: 'INVALID_DEPENDENCY_TYPE',
              severity: 'error',
              value: dep,
            });
          }
        });

        // Check for circular dependencies
        if (this.hasCircularDependencies(tasks)) {
          errors.push({
            field: 'tasks',
            message: 'Circular dependencies detected in task configuration',
            code: 'CIRCULAR_DEPENDENCIES',
            severity: 'error',
          });
        }
      }
    }

    // Analyze task complexity and distribution
    const taskComplexityAnalysis = this.analyzeTaskComplexity(tasks);
    if (taskComplexityAnalysis.averageComplexity > this.config.maxTaskComplexity) {
      warnings.push({
        field: 'tasks',
        message: 'Task complexity may impact performance',
        code: 'HIGH_TASK_COMPLEXITY',
        severity: 'warning',
        context: taskComplexityAnalysis,
      });

      optimizations.push({
        type: 'PERFORMANCE',
        priority: 'MEDIUM',
        description: 'Simplify complex tasks or increase resource allocation',
        impact: 'Better performance and reliability',
        implementation: 'Break down complex tasks or increase timeout values',
        estimatedImprovement: 20,
        costBenefit: 'MEDIUM',
      });
    }
  }

  /**
   * Validate orchestration security configuration
   */
  async validateOrchestrationSecurity(
    config: any,
    context: OrchestrationValidationContext,
    errors: ValidationIssue[],
    warnings: ValidationIssue[],
    optimizations: OptimizationRecommendation[],
  ): Promise<SecurityValidationAssessment> {
    let overallSecurityScore = 100;
    const vulnerabilities: SecurityVulnerability[] = [];
    const complianceStatus: ComplianceStatus[] = [];
    const riskFactors: RiskFactor[] = [];
    const securityRecommendations: SecurityRecommendation[] = [];

    // Validate encryption configuration
    if (!config.strategy?.encryptedCommunication) {
      overallSecurityScore -= 20;
      vulnerabilities.push({
        type: 'COMMUNICATION',
        severity: 'HIGH',
        description: 'Agent communication is not encrypted',
        affected: ['agent_coordination', 'data_transfer'],
        mitigation: 'Enable encrypted communication in strategy configuration',
      });

      securityRecommendations.push({
        category: 'ENCRYPTION',
        recommendation: 'Enable encrypted communication for agent coordination',
        priority: 'HIGH',
        implementation: 'Set strategy.encryptedCommunication: true',
        benefit: 'Protects sensitive data during agent coordination',
      });
    }

    // Validate agent isolation
    if (!config.strategy?.agentIsolation && config.strategy?.maxAgents > 5) {
      overallSecurityScore -= 15;
      vulnerabilities.push({
        type: 'CONFIGURATION',
        severity: 'MEDIUM',
        description: 'Agent isolation not enabled for multi-agent operation',
        affected: ['agent_runtime', 'resource_sharing'],
        mitigation: 'Enable agent isolation to prevent cross-contamination',
      });
    }

    // Validate monitoring configuration
    if (!config.strategy?.monitoringEnabled) {
      overallSecurityScore -= 10;
      riskFactors.push({
        category: 'SECURITY',
        risk: 'Limited visibility into orchestration operations',
        probability: 70,
        impact: 60,
        riskScore: 42,
        mitigation: 'Enable comprehensive monitoring and logging',
      });
    }

    // Validate compliance requirements
    if (context.complianceRequirements) {
      for (const requirement of context.complianceRequirements) {
        const complianceResult = this.validateComplianceRequirement(requirement, config);
        complianceStatus.push(complianceResult);

        if (complianceResult.status !== 'COMPLIANT') {
          overallSecurityScore -= (100 - complianceResult.score) * 0.3;
        }
      }
    }

    // Validate resource security
    const resourceLimits = config.resourceLimits;
    if (resourceLimits?.maxMemoryGB > 64 || resourceLimits?.maxCpuCores > 16) {
      riskFactors.push({
        category: 'OPERATIONAL',
        risk: 'High resource allocation may indicate security risk',
        probability: 30,
        impact: 40,
        riskScore: 12,
        mitigation: 'Review resource allocation and implement monitoring',
      });
    }

    // Security score adjustments based on security level
    if (context.securityLevel) {
      const securityLevelMultiplier = {
        [OrchestrationSecurityLevel.BASIC]: 0.8,
        [OrchestrationSecurityLevel.COORDINATED]: 0.9,
        [OrchestrationSecurityLevel.DISTRIBUTED]: 1.0,
        [OrchestrationSecurityLevel.ENTERPRISE]: 1.1,
        [OrchestrationSecurityLevel.CRITICAL]: 1.2,
      }[context.securityLevel] || 1.0;

      overallSecurityScore *= securityLevelMultiplier;
    }

    // Generate optimization recommendations
    if (overallSecurityScore < 80) {
      optimizations.push({
        type: 'SECURITY',
        priority: 'HIGH',
        description: 'Security configuration requires improvement',
        impact: 'Enhanced security posture and compliance',
        implementation: 'Address identified vulnerabilities and enable security features',
        estimatedImprovement: 100 - overallSecurityScore,
        costBenefit: 'HIGH',
      });
    }

    return {
      overallSecurityScore: Math.min(100, Math.max(0, overallSecurityScore)),
      vulnerabilities,
      complianceStatus,
      riskFactors,
      securityRecommendations,
    };
  }

  /**
   * Validate performance characteristics and generate metrics
   */
  async validatePerformanceCharacteristics(
    config: any,
    context: OrchestrationValidationContext,
    errors: ValidationIssue[],
    warnings: ValidationIssue[],
    optimizations: OptimizationRecommendation[],
  ): Promise<PerformanceValidationMetrics> {
    const agentCount = config.strategy?.maxAgents || 1;
    const sessionCount = config.strategy?.maxSessions || 1;
    const taskCount = config.tasks?.length || 0;

    // Calculate performance metrics
    const expectedThroughput = this.calculateExpectedThroughput(agentCount, sessionCount, taskCount);
    const latencyEstimateMs = this.calculateLatencyEstimate(config.strategy, agentCount);
    const scalabilityScore = this.calculateScalabilityScore(config);
    const efficiencyRating = this.calculateEfficiencyRating(config);

    // Analyze bottlenecks
    const bottleneckAnalysis = this.analyzePerformanceBottlenecks(config);

    // Calculate optimization potential
    const optimizationPotential = this.calculateOptimizationPotential(
      scalabilityScore,
      efficiencyRating,
      bottleneckAnalysis,
    );

    // Generate performance warnings
    if (scalabilityScore < 70) {
      warnings.push({
        field: 'strategy',
        message: 'Configuration may not scale well under load',
        code: 'POOR_SCALABILITY',
        severity: 'warning',
        context: { scalabilityScore },
      });
    }

    if (efficiencyRating < 60) {
      warnings.push({
        field: 'resourceLimits',
        message: 'Resource allocation efficiency is below optimal',
        code: 'POOR_EFFICIENCY',
        severity: 'warning',
        context: { efficiencyRating },
      });
    }

    // Generate performance optimizations
    if (optimizationPotential > 30) {
      optimizations.push({
        type: 'PERFORMANCE',
        priority: 'HIGH',
        description: 'Significant performance optimization opportunities identified',
        impact: 'Improved throughput and reduced latency',
        implementation: 'Address identified bottlenecks and optimize resource allocation',
        estimatedImprovement: optimizationPotential,
        costBenefit: 'HIGH',
      });
    }

    return {
      expectedThroughput,
      latencyEstimateMs,
      scalabilityScore,
      efficiencyRating,
      bottleneckAnalysis,
      optimizationPotential,
    };
  }

  // ===== HELPER METHODS =====

  private async validateConfigurationDto(config: any, errors: ValidationIssue[]): Promise<OrchestrationConfigDto> {
    try {
      const configDto = plainToClass(OrchestrationConfigDto, config);
      const validationErrors = await validate(configDto, {
        whitelist: true,
        forbidNonWhitelisted: true,
        validationError: { target: false },
      });

      validationErrors.forEach(error => {
        this.processValidationError(error, errors);
      });

      return configDto;
    } catch (error) {
      errors.push({
        field: 'configuration',
        message: 'Invalid configuration structure',
        code: 'INVALID_CONFIG_STRUCTURE',
        severity: 'error',
        value: error instanceof Error ? error.message : String(error),
      });
      return {} as OrchestrationConfigDto;
    }
  }

  private processValidationError(error: ValidationError, errors: ValidationIssue[], path = ''): void {
    const field = path ? `${path}.${error.property}` : error.property;

    if (error.constraints) {
      Object.entries(error.constraints).forEach(([constraint, message]) => {
        errors.push({
          field,
          message,
          code: constraint.toUpperCase(),
          severity: 'error',
          value: error.value,
          constraint,
        });
      });
    }

    if (error.children && error.children.length > 0) {
      error.children.forEach(child => {
        this.processValidationError(child, errors, field);
      });
    }
  }

  private calculateCoordinationComplexity(strategy: any): number {
    let complexity = 0;
    const agentCount = strategy.maxAgents || 1;

    // Base complexity from agent count
    complexity += Math.min(agentCount * 2, 40);

    // Coordination mode complexity
    const coordinationComplexity = {
      'SIMPLE': 0,
      'PEER_TO_PEER': agentCount > 10 ? 20 : 10,
      'HIERARCHICAL': Math.min(agentCount * 0.5, 15),
      'CUSTOM': 25,
    }[strategy.coordinationMode] || 0;

    complexity += coordinationComplexity;

    // Task distribution complexity
    const distributionComplexity = {
      'ROUND_ROBIN': 0,
      'WEIGHTED': 5,
      'PRIORITY': 10,
      'CUSTOM': 20,
    }[strategy.taskDistribution] || 0;

    complexity += distributionComplexity;

    return Math.min(complexity, 100);
  }

  private validateFailoverConfiguration(
    failoverConfig: any,
    agentCount: number,
    errors: ValidationIssue[],
    warnings: ValidationIssue[],
  ): number {
    let robustness = 50;

    if (!failoverConfig.enabled) {
      warnings.push({
        field: 'strategy.failoverConfig.enabled',
        message: 'Failover is disabled',
        code: 'FAILOVER_DISABLED',
        severity: 'warning',
      });
      return 0;
    }

    // Validate timeout
    if (failoverConfig.timeoutMs < 1000 || failoverConfig.timeoutMs > 300000) {
      errors.push({
        field: 'strategy.failoverConfig.timeoutMs',
        message: 'Failover timeout must be between 1 second and 5 minutes',
        code: 'INVALID_FAILOVER_TIMEOUT',
        severity: 'error',
        value: failoverConfig.timeoutMs,
      });
    } else {
      robustness += 20;
    }

    // Validate strategy
    const validStrategies = ['IMMEDIATE', 'GRACEFUL', 'MANUAL'];
    if (!validStrategies.includes(failoverConfig.strategy)) {
      errors.push({
        field: 'strategy.failoverConfig.strategy',
        message: `Invalid failover strategy: ${failoverConfig.strategy}`,
        code: 'INVALID_FAILOVER_STRATEGY',
        severity: 'error',
        value: failoverConfig.strategy,
      });
    } else {
      robustness += 15;
    }

    // Validate retry configuration
    if (failoverConfig.maxRetries < 1 || failoverConfig.maxRetries > 5) {
      warnings.push({
        field: 'strategy.failoverConfig.maxRetries',
        message: 'Consider 1-5 retries for optimal failover behavior',
        code: 'SUBOPTIMAL_RETRY_COUNT',
        severity: 'warning',
        value: failoverConfig.maxRetries,
      });
    } else {
      robustness += 15;
    }

    return Math.min(robustness, 100);
  }

  private calculateScalabilityPotential(strategy: any): number {
    let potential = 50;
    const agentCount = strategy.maxAgents || 1;

    // Coordination mode scalability
    const coordinationScalability = {
      'SIMPLE': agentCount <= 5 ? 30 : 10,
      'PEER_TO_PEER': agentCount <= 10 ? 25 : 5,
      'HIERARCHICAL': agentCount <= 50 ? 30 : 20,
      'CUSTOM': 15,
    }[strategy.coordinationMode] || 0;

    potential += coordinationScalability;

    // Task distribution scalability
    const distributionScalability = {
      'ROUND_ROBIN': 20,
      'WEIGHTED': 15,
      'PRIORITY': 10,
      'CUSTOM': 5,
    }[strategy.taskDistribution] || 0;

    potential += distributionScalability;

    // Monitoring and isolation boost scalability
    if (strategy.monitoringEnabled) potential += 10;
    if (strategy.agentIsolation) potential += 10;
    if (strategy.encryptedCommunication) potential += 5;

    return Math.min(potential, 100);
  }

  private estimateMemoryUsage(resourceLimits: any, agentCount: number, sessionCount: number): number {
    const baseMemoryPerAgent = 0.5; // GB
    const baseMemoryPerSession = 0.2; // GB
    const overheadFactor = 1.2;

    const estimatedUsage = (agentCount * baseMemoryPerAgent + sessionCount * baseMemoryPerSession) * overheadFactor;
    return Math.min(estimatedUsage, resourceLimits.maxMemoryGB);
  }

  private estimateCpuUsage(resourceLimits: any, agentCount: number, sessionCount: number): number {
    const baseCpuPerAgent = 15; // percent
    const baseCpuPerSession = 5; // percent
    const overheadFactor = 1.3;

    const estimatedUsage = (agentCount * baseCpuPerAgent + sessionCount * baseCpuPerSession) * overheadFactor;
    return Math.min(estimatedUsage, 100);
  }

  private estimateNetworkUsage(resourceLimits: any, agentCount: number): number {
    const baseNetworkPerAgent = 5; // Mbps
    const overheadFactor = 1.5;

    const estimatedUsage = agentCount * baseNetworkPerAgent * overheadFactor;
    return Math.min(estimatedUsage, resourceLimits.maxNetworkMBps);
  }

  private estimateStorageUsage(resourceLimits: any, agentCount: number): number {
    const baseStoragePerAgent = 0.1; // GB
    const overheadFactor = 2.0;

    const estimatedUsage = agentCount * baseStoragePerAgent * overheadFactor;
    return Math.min(estimatedUsage, resourceLimits.maxStorageGB);
  }

  private calculateResourceEfficiency(
    memoryUsage: number,
    cpuUsage: number,
    networkUsage: number,
    resourceLimits: any,
  ): number {
    const memoryEfficiency = memoryUsage / resourceLimits.maxMemoryGB;
    const cpuEfficiency = cpuUsage / 100;
    const networkEfficiency = networkUsage / resourceLimits.maxNetworkMBps;

    const averageEfficiency = (memoryEfficiency + cpuEfficiency + networkEfficiency) / 3;
    return Math.min(averageEfficiency, 1.0);
  }

  private calculateResourceScalabilityFactor(resourceLimits: any, agentCount: number): number {
    const resourcePerAgent = {
      memory: resourceLimits.maxMemoryGB / agentCount,
      cpu: resourceLimits.maxCpuCores / agentCount,
      network: resourceLimits.maxNetworkMBps / agentCount,
    };

    // Higher per-agent resources = better scalability
    const memoryFactor = Math.min(resourcePerAgent.memory / 2, 2); // 2GB per agent optimal
    const cpuFactor = Math.min(resourcePerAgent.cpu / 0.5, 2); // 0.5 cores per agent optimal
    const networkFactor = Math.min(resourcePerAgent.network / 10, 2); // 10Mbps per agent optimal

    return (memoryFactor + cpuFactor + networkFactor) / 3;
  }

  private hasCircularDependencies(tasks: any[]): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (taskName: string): boolean => {
      if (recursionStack.has(taskName)) return true;
      if (visited.has(taskName)) return false;

      visited.add(taskName);
      recursionStack.add(taskName);

      const task = tasks.find(t => t.name === taskName);
      if (task?.dependencies) {
        for (const dep of task.dependencies) {
          if (hasCycle(dep)) return true;
        }
      }

      recursionStack.delete(taskName);
      return false;
    };

    for (const task of tasks) {
      if (!visited.has(task.name) && hasCycle(task.name)) {
        return true;
      }
    }

    return false;
  }

  private analyzeTaskComplexity(tasks: any[]): { averageComplexity: number; maxComplexity: number; distribution: Record<string, number> } {
    const complexities = tasks.map(task => {
      let complexity = 1;

      // Base complexity from action count
      complexity += (task.actions?.length || 0) * 0.5;

      // Dependency complexity
      complexity += (task.dependencies?.length || 0) * 0.3;

      // Timeout complexity (longer = more complex)
      if (task.timeoutMs > 300000) complexity += 2; // > 5 minutes
      else if (task.timeoutMs > 60000) complexity += 1; // > 1 minute

      // Action type complexity
      if (task.actions) {
        task.actions.forEach(action => {
          const actionComplexity = {
            'navigate': 1,
            'click': 0.5,
            'type': 0.5,
            'extract': 1.5,
            'screenshot': 0.3,
            'wait': 0.2,
            'custom': 2,
          }[action.type] || 1;

          complexity += actionComplexity;
        });
      }

      return complexity;
    });

    const averageComplexity = complexities.reduce((sum, c) => sum + c, 0) / complexities.length;
    const maxComplexity = Math.max(...complexities);

    const distribution = {
      low: complexities.filter(c => c < 3).length,
      medium: complexities.filter(c => c >= 3 && c < 6).length,
      high: complexities.filter(c => c >= 6).length,
    };

    return { averageComplexity, maxComplexity, distribution };
  }

  private validateComplianceRequirement(
    requirement: OrchestrationCompliance,
    config: any,
  ): ComplianceStatus {
    let score = 100;
    const gaps: string[] = [];
    const remediation: string[] = [];

    switch (requirement) {
      case OrchestrationCompliance.SOC2:
        if (!config.strategy?.monitoringEnabled) {
          score -= 30;
          gaps.push('Monitoring not enabled');
          remediation.push('Enable comprehensive monitoring');
        }
        if (!config.strategy?.encryptedCommunication) {
          score -= 25;
          gaps.push('Communication not encrypted');
          remediation.push('Enable encrypted communication');
        }
        break;

      case OrchestrationCompliance.GDPR:
        if (!config.strategy?.agentIsolation) {
          score -= 20;
          gaps.push('Agent isolation not configured');
          remediation.push('Enable agent isolation for data protection');
        }
        if (config.resourceLimits?.maxStorageGB > 100) {
          score -= 15;
          gaps.push('High storage allocation may indicate data retention issues');
          remediation.push('Review data retention policies');
        }
        break;

      case OrchestrationCompliance.HIPAA:
        if (!config.strategy?.encryptedCommunication) {
          score -= 40;
          gaps.push('Unencrypted communication violates HIPAA requirements');
          remediation.push('Enable end-to-end encryption');
        }
        if (!config.strategy?.agentIsolation) {
          score -= 30;
          gaps.push('Agent isolation required for PHI protection');
          remediation.push('Enable strict agent isolation');
        }
        break;
    }

    const status = score >= 90 ? 'COMPLIANT' : score >= 70 ? 'PARTIAL' : 'NON_COMPLIANT';

    return {
      requirement,
      status,
      score: Math.max(0, score),
      gaps,
      remediation,
    };
  }

  private calculateExpectedThroughput(agentCount: number, sessionCount: number, taskCount: number): number {
    const baselineTasksPerMinute = 10;
    const agentEfficiencyFactor = Math.log(agentCount + 1) / Math.log(2);
    const sessionOverhead = sessionCount * 0.1;

    return baselineTasksPerMinute * agentEfficiencyFactor * (1 - sessionOverhead) * (taskCount / 10);
  }

  private calculateLatencyEstimate(strategy: any, agentCount: number): number {
    let baseLatency = 100; // ms

    // Coordination overhead
    const coordinationLatency = {
      'SIMPLE': 10,
      'PEER_TO_PEER': agentCount * 5,
      'HIERARCHICAL': Math.log(agentCount) * 20,
      'CUSTOM': 50,
    }[strategy?.coordinationMode] || 20;

    baseLatency += coordinationLatency;

    // Communication protocol overhead
    const protocolLatency = {
      'HTTP': 50,
      'WEBSOCKET': 20,
      'GRPC': 15,
      'MQTT': 30,
    }[strategy?.coordinationProtocol] || 50;

    baseLatency += protocolLatency;

    // Encryption overhead
    if (strategy?.encryptedCommunication) {
      baseLatency += 25;
    }

    return baseLatency;
  }

  private calculateScalabilityScore(config: any): number {
    let score = 50;
    const strategy = config.strategy || {};
    const agentCount = strategy.maxAgents || 1;

    // Coordination mode scalability
    if (strategy.coordinationMode === 'HIERARCHICAL') score += 20;
    else if (strategy.coordinationMode === 'PEER_TO_PEER' && agentCount <= 10) score += 15;
    else if (strategy.coordinationMode === 'SIMPLE' && agentCount <= 5) score += 10;

    // Monitoring and isolation improve scalability
    if (strategy.monitoringEnabled) score += 10;
    if (strategy.agentIsolation) score += 10;

    // Failover configuration
    if (strategy.failoverConfig?.enabled) score += 10;

    return Math.min(score, 100);
  }

  private calculateEfficiencyRating(config: any): number {
    let efficiency = 50;
    const strategy = config.strategy || {};
    const resourceLimits = config.resourceLimits || {};
    const agentCount = strategy.maxAgents || 1;

    // Resource allocation efficiency
    const memoryPerAgent = resourceLimits.maxMemoryGB / agentCount;
    const cpuPerAgent = resourceLimits.maxCpuCores / agentCount;

    if (memoryPerAgent >= 1 && memoryPerAgent <= 4) efficiency += 15; // Optimal range
    if (cpuPerAgent >= 0.5 && cpuPerAgent <= 2) efficiency += 15; // Optimal range

    // Task distribution efficiency
    const taskCount = config.tasks?.length || 0;
    const tasksPerAgent = taskCount / agentCount;
    if (tasksPerAgent >= 2 && tasksPerAgent <= 8) efficiency += 10; // Optimal range

    // Configuration efficiency
    if (strategy.taskDistribution === 'WEIGHTED' || strategy.taskDistribution === 'PRIORITY') {
      efficiency += 10;
    }

    return Math.min(efficiency, 100);
  }

  private analyzePerformanceBottlenecks(config: any): BottleneckAnalysis[] {
    const bottlenecks: BottleneckAnalysis[] = [];
    const strategy = config.strategy || {};
    const resourceLimits = config.resourceLimits || {};
    const agentCount = strategy.maxAgents || 1;

    // CPU bottleneck analysis
    const cpuPerAgent = resourceLimits.maxCpuCores / agentCount;
    if (cpuPerAgent < 0.5) {
      bottlenecks.push({
        component: 'CPU',
        severity: 'HIGH',
        description: 'Insufficient CPU allocation per agent',
        impact: 'Reduced performance and increased latency',
        resolution: 'Increase CPU allocation or reduce agent count',
        priority: 1,
      });
    }

    // Memory bottleneck analysis
    const memoryPerAgent = resourceLimits.maxMemoryGB / agentCount;
    if (memoryPerAgent < 1) {
      bottlenecks.push({
        component: 'MEMORY',
        severity: 'HIGH',
        description: 'Insufficient memory allocation per agent',
        impact: 'Potential out-of-memory errors and crashes',
        resolution: 'Increase memory allocation or reduce agent count',
        priority: 1,
      });
    }

    // Coordination bottleneck analysis
    if (strategy.coordinationMode === 'PEER_TO_PEER' && agentCount > 20) {
      bottlenecks.push({
        component: 'COORDINATION',
        severity: 'MEDIUM',
        description: 'Peer-to-peer coordination may not scale efficiently',
        impact: 'Increased coordination overhead and latency',
        resolution: 'Consider switching to hierarchical coordination',
        priority: 2,
      });
    }

    // Network bottleneck analysis
    const networkPerAgent = resourceLimits.maxNetworkMBps / agentCount;
    if (networkPerAgent < 5) {
      bottlenecks.push({
        component: 'NETWORK',
        severity: 'MEDIUM',
        description: 'Insufficient network bandwidth per agent',
        impact: 'Slow data transfer and increased latency',
        resolution: 'Increase network allocation or optimize data transfer',
        priority: 3,
      });
    }

    return bottlenecks.sort((a, b) => a.priority - b.priority);
  }

  private calculateOptimizationPotential(
    scalabilityScore: number,
    efficiencyRating: number,
    bottlenecks: BottleneckAnalysis[],
  ): number {
    const scalabilityPotential = Math.max(0, 100 - scalabilityScore);
    const efficiencyPotential = Math.max(0, 100 - efficiencyRating);

    const bottleneckPotential = bottlenecks.reduce((total, bottleneck) => {
      const severityWeight = {
        'LOW': 5,
        'MEDIUM': 15,
        'HIGH': 25,
        'CRITICAL': 40,
      }[bottleneck.severity];

      return total + severityWeight;
    }, 0);

    return Math.min((scalabilityPotential + efficiencyPotential + bottleneckPotential) / 3, 100);
  }

  private async sanitizeOrchestrationConfig(config: any): Promise<any> {
    const sanitized = JSON.parse(JSON.stringify(config));

    // Sanitize strategy
    if (sanitized.strategy) {
      // Clamp values to safe ranges
      sanitized.strategy.maxAgents = Math.min(sanitized.strategy.maxAgents || 1, this.config.maxAgentCount);
      sanitized.strategy.maxSessions = Math.min(sanitized.strategy.maxSessions || 1, this.config.maxSessionCount);

      // Ensure security defaults
      if (sanitized.strategy.maxAgents > 5 && sanitized.strategy.encryptedCommunication === undefined) {
        sanitized.strategy.encryptedCommunication = true;
      }

      if (sanitized.strategy.maxAgents > 10 && sanitized.strategy.agentIsolation === undefined) {
        sanitized.strategy.agentIsolation = true;
      }
    }

    // Sanitize resource limits
    if (sanitized.resourceLimits) {
      const maxLimits = this.config.maxResourceAllocation;
      sanitized.resourceLimits.maxMemoryGB = Math.min(
        sanitized.resourceLimits.maxMemoryGB || 4,
        maxLimits.maxMemoryGB,
      );
      sanitized.resourceLimits.maxCpuCores = Math.min(
        sanitized.resourceLimits.maxCpuCores || 2,
        maxLimits.maxCpuCores,
      );
      sanitized.resourceLimits.maxNetworkMBps = Math.min(
        sanitized.resourceLimits.maxNetworkMBps || 100,
        maxLimits.maxNetworkMBps,
      );
    }

    // Sanitize tasks
    if (sanitized.tasks && Array.isArray(sanitized.tasks)) {
      for (const task of sanitized.tasks) {
        if (task.name) {
          task.name = task.name.toString().trim().substring(0, 200);
        }
        if (task.description) {
          task.description = task.description.toString().trim().substring(0, 1000);
        }

        // Use base validation service for action sanitization
        if (task.actions && Array.isArray(task.actions)) {
          const sanitizedTask = await this.baseValidationService.validateBrowserTask(
            { actions: task.actions },
            { timestamp: new Date() },
          );
          if (sanitizedTask.sanitizedData?.actions) {
            task.actions = sanitizedTask.sanitizedData.actions;
          }
        }
      }
    }

    return sanitized;
  }

  // Default value generators
  private getDefaultResourceEstimate(): ResourceUsageEstimate {
    return {
      memoryUsageGB: 4,
      cpuUsagePercent: 50,
      networkUsageMBps: 100,
      storageUsageGB: 10,
      estimatedDurationMs: 1800000,
      peakResourceTime: new Date(Date.now() + 1080000), // Peak at 18 minutes
      resourceEfficiency: 0.75,
      scalabilityFactor: 1.5,
    };
  }

  private getDefaultPerformanceMetrics(): PerformanceValidationMetrics {
    return {
      expectedThroughput: 10,
      latencyEstimateMs: 150,
      scalabilityScore: 70,
      efficiencyRating: 75,
      bottleneckAnalysis: [],
      optimizationPotential: 25,
    };
  }

  private getDefaultSecurityAssessment(): SecurityValidationAssessment {
    return {
      overallSecurityScore: 80,
      vulnerabilities: [],
      complianceStatus: [],
      riskFactors: [],
      securityRecommendations: [],
    };
  }

  private getDefaultStrategyAnalysis(): StrategyValidationAnalysis {
    return {
      strategyViability: 85,
      coordinationComplexity: 30,
      failoverRobustness: 50,
      scalabilityPotential: 70,
      strategicRecommendations: [],
    };
  }

  // Cache management methods
  private generateCacheKey(type: string, config: any, context: OrchestrationValidationContext): string {
    const configHash = this.hashObject({ type, config, userId: context.userId });
    return `${type}_${configHash}`;
  }

  private hashObject(obj: any): string {
    // Simple hash function - in production, use a proper hashing library
    return Buffer.from(JSON.stringify(obj)).toString('base64').substring(0, 16);
  }

  private getFromCache(key: string): OrchestrationValidationResult | null {
    const entry = this.validationCache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.validationCache.delete(key);
      return null;
    }

    return entry.result;
  }

  private setCache(key: string, result: OrchestrationValidationResult): void {
    if (this.validationCache.size >= this.config.maxValidationCacheSize) {
      // Remove oldest entry
      const oldestKey = this.validationCache.keys().next().value;
      this.validationCache.delete(oldestKey);
    }

    this.validationCache.set(key, {
      result,
      timestamp: Date.now(),
      ttl: this.config.validationCacheTtl,
    });
  }

  private cleanupValidationCache(): void {
    const now = Date.now();
    let removedCount = 0;

    for (const [key, entry] of this.validationCache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.validationCache.delete(key);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      this.logger.debug(`Cleaned up ${removedCount} expired orchestration validation cache entries`, {
        cacheSize: this.validationCache.size,
      });
    }
  }

  private loadOrchestrationValidationConfig(): OrchestrationValidationConfig {
    return {
      enableStrategyValidation: this.configService.get<boolean>('ORCHESTRATION_VALIDATION_STRATEGY', true),
      enableResourceValidation: this.configService.get<boolean>('ORCHESTRATION_VALIDATION_RESOURCE', true),
      enableAgentValidation: this.configService.get<boolean>('ORCHESTRATION_VALIDATION_AGENT', true),
      enableTaskValidation: this.configService.get<boolean>('ORCHESTRATION_VALIDATION_TASK', true),
      enableSecurityValidation: this.configService.get<boolean>('ORCHESTRATION_VALIDATION_SECURITY', true),
      enablePerformanceValidation: this.configService.get<boolean>('ORCHESTRATION_VALIDATION_PERFORMANCE', true),
      maxValidationCacheSize: this.configService.get<number>('ORCHESTRATION_VALIDATION_CACHE_SIZE', 500),
      validationCacheTtl: this.configService.get<number>('ORCHESTRATION_VALIDATION_CACHE_TTL', 600000), // 10 minutes
      strictValidationMode: this.configService.get<boolean>('ORCHESTRATION_VALIDATION_STRICT', true),
      enableOptimizationRecommendations: this.configService.get<boolean>('ORCHESTRATION_OPTIMIZATION_ENABLED', true),
      maxAgentCount: this.configService.get<number>('ORCHESTRATION_MAX_AGENTS', 100),
      maxSessionCount: this.configService.get<number>('ORCHESTRATION_MAX_SESSIONS', 250),
      maxTaskComplexity: this.configService.get<number>('ORCHESTRATION_MAX_TASK_COMPLEXITY', 10),
      maxResourceAllocation: {
        maxMemoryGB: this.configService.get<number>('ORCHESTRATION_MAX_MEMORY_GB', 128),
        maxCpuCores: this.configService.get<number>('ORCHESTRATION_MAX_CPU_CORES', 32),
        maxNetworkMBps: this.configService.get<number>('ORCHESTRATION_MAX_NETWORK_MBPS', 2000),
        maxStorageGB: this.configService.get<number>('ORCHESTRATION_MAX_STORAGE_GB', 500),
        maxExecutionTimeMs: this.configService.get<number>('ORCHESTRATION_MAX_EXECUTION_TIME_MS', 14400000), // 4 hours
      },
    };
  }

  /**
   * Get validation statistics and metrics
   */
  getValidationStatistics(): {
    cacheSize: number;
    cacheHitRate: number;
    totalValidations: number;
    averageValidationTime: number;
    configurationEnabled: Record<string, boolean>;
  } {
    return {
      cacheSize: this.validationCache.size,
      cacheHitRate: 0.75, // Mock value - would track in real implementation
      totalValidations: 850, // Mock value - would track in real implementation
      averageValidationTime: 125, // Mock value - would track in real implementation
      configurationEnabled: {
        strategyValidation: this.config.enableStrategyValidation,
        resourceValidation: this.config.enableResourceValidation,
        agentValidation: this.config.enableAgentValidation,
        taskValidation: this.config.enableTaskValidation,
        securityValidation: this.config.enableSecurityValidation,
        performanceValidation: this.config.enablePerformanceValidation,
      },
    };
  }
}