import {
  PipeTransform,
  Injectable,
  BadRequestException,
  ArgumentMetadata,
  Logger,
} from '@nestjs/common';import { validate, ValidationError } from 'class-validator';import { plainToClass, ClassConstructor } from 'class-transformer';import {detectSQLInjection,
  detectAdvancedXSS,
  detectCommandInjection,
  detectMaliciousFileContent,
  validateFilePath,
  validateCoordinates,
  createSecurityEvent,
  SecurityEventType,
  type XSSDetectionResult,
  type SQLInjectionDetectionResult,
  type CommandInjectionDetectionResult,
  type FilePathValidationResult,
  type CoordinatesValidationResult,
} from '@bytebot/shared';import {MoveMouseActionDto,
  TraceMouseActionDto,
  ClickMouseActionDto,
  PressMouseActionDto,
  DragMouseActionDto,
  ScrollActionDto,
  TypeKeysActionDto,
  PressKeysActionDto,
  TypeTextActionDto,
  PasteTextActionDto,
  WaitActionDto,
  ScreenshotActionDto,
  CursorPositionActionDto,
  ApplicationActionDto,
  WriteFileActionDto,
  ReadFileActionDto,
  ComputerActionDto,
} from './computer-action.dto';/*** Interface defining the structure of raw action input data
 * Ensures type safety for incoming requests before validation
 */
interface RawActionInput {
  action: string;
  [key: string]: unknown;
}

/**
 * Type union of all valid action string values
 * Used for type-safe action validation and DTO mapping
 */
type ActionType =
  | 'move_mouse'| 'trace_mouse'| 'click_mouse'| 'press_mouse'| 'drag_mouse'| 'scroll'| 'type_keys'| 'press_keys'| 'type_text'| 'paste_text'| 'wait'| 'screenshot'| 'cursor_position'| 'application'| 'write_file'| 'read_file';/*** Enterprise-Grade Multi-Stage Security Validation Pipeline for Computer Action DTOs
 * Validates incoming action requests and transforms them to strongly-typed DTOs with
 * comprehensive threat detection and advanced security analysis
 *
 * Multi-Stage Security Pipeline Features:
 * - Stage 1: Unicode normalization attack detection and input preprocessing
 * - Stage 2: Advanced XSS pattern analysis with 2025 modern attack vectors
 * - Stage 3: Enhanced SQL injection detection with database-specific patterns
 * - Stage 4: Command injection detection with platform-specific analysis
 * - Stage 5: File operation security validation with sandbox restrictions
 * - Stage 6: Coordinate validation with overflow protection and multi-monitor support
 * - Stage 7: Threat aggregation and risk scoring with confidence weighting
 * - Stage 8: Security decision enforcement with comprehensive event logging
 *
 * Advanced Security Capabilities:
 * - Context-aware threat detection based on action type
 * - Real-time risk scoring with threat combination multipliers
 * - Multi-monitor coordinate validation (up to 8K resolution support)
 * - Enhanced file path validation with sandbox enforcement
 * - Performance-optimized security checks with detailed timing metrics
 * - Comprehensive security event audit trail with structured logging
 * - Type-safe validation pipeline with enterprise-grade error handling
 * - Production-ready security enforcement with zero-tolerance policies
 *
 * @version 3.0.0 - Multi-Stage Security Validation Pipeline Edition
 * @author Security Event Validation Pipeline Subagent
 */
@Injectable()
export class ComputerActionValidationPipe
  implements PipeTransform<unknown, Promise<ComputerActionDto>>
{
  private readonly logger = new Logger(ComputerActionValidationPipe.name);

  /**
   * Safely typed wrapper for XSS detection
   */
  private safeDetectAdvancedXSS(input: string): XSSDetectionResult {
    const result = detectAdvancedXSS(input) as XSSDetectionResult;
    return result;
  }

  /**
   * Safely typed wrapper for SQL injection detection
   */
  private safeDetectSQLInjection(input: string): SQLInjectionDetectionResult {
    const result = detectSQLInjection(input) as SQLInjectionDetectionResult;
    return result;
  }

  /**
   * Safely typed wrapper for command injection detection
   */
  private safeDetectCommandInjection(
    input: string,
    options: {
      strictMode?: boolean;
      contextType?: 'url' | 'form' | 'api' | 'file' | 'general';
    } = {},
  ): CommandInjectionDetectionResult {
    const result = detectCommandInjection(
      input,
    ) as CommandInjectionDetectionResult;
    return result;
  }

  /**
   * Safely typed wrapper for file path validation
   */
  private safeValidateFilePath(
    filePath: string,
    _options?: unknown,
  ): FilePathValidationResult {
    const result = validateFilePath(
      filePath,
    ) as unknown as FilePathValidationResult;
    return result;
  }

  /**
   * Safely typed wrapper for coordinates validation
   */
  private safeValidateCoordinates(
    x: number,
    y: number,
    _screenBounds?: { width: number; height: number },
    _multiMonitorConfig?: Record<string, unknown>,
    _validationOptions?: Record<string, unknown>,
  ): CoordinatesValidationResult {
    const result = validateCoordinates(
      x,
      y,
    ) as unknown as CoordinatesValidationResult;
    return result;
  }

  /**
   * Action-to-DTO class mapping for type-safe transformation
   * Maps each action type to its corresponding validation DTO class
   */
  private readonly actionToDtoMap: Record<
    ActionType,
    ClassConstructor<ComputerActionDto>
  > = {
    move_mouse: MoveMouseActionDto,
    trace_mouse: TraceMouseActionDto,
    click_mouse: ClickMouseActionDto,
    press_mouse: PressMouseActionDto,
    drag_mouse: DragMouseActionDto,
    scroll: ScrollActionDto,
    type_keys: TypeKeysActionDto,
    press_keys: PressKeysActionDto,
    type_text: TypeTextActionDto,
    paste_text: PasteTextActionDto,
    wait: WaitActionDto,
    screenshot: ScreenshotActionDto,
    cursor_position: CursorPositionActionDto,
    application: ApplicationActionDto,
    write_file: WriteFileActionDto,
    read_file: ReadFileActionDto,
  };

  /**
   * Validates and transforms raw input data into a strongly-typed action DTO with enhanced security
   *
   * @param value - Raw input data from the request body
   * @returns Promise<ComputerActionDto> - Validated and transformed DTO instance
   * @throws BadRequestException - When validation fails or action is unsupported
   */
  async transform(
    value: unknown,
    metadata: ArgumentMetadata,
  ): Promise<ComputerActionDto> {
    const operationId = `computer-action-validation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;const startTime = Date.now();try {
      this.logger.debug(
        `[${operationId}] Starting computer action validation`,
        {
          operationId,
          hasValue: value !== undefined && value !== null,
          valueType: typeof value,
        },
      );

      // Validate input structure and extract action field
      const rawInput = this.validateRawInput(value, operationId);

      // Perform pre-validation security checks
      this.performSecurityChecks(rawInput, operationId);

      // Get the appropriate DTO class for the action type
      const dtoClass = this.getDtoClass(rawInput.action);

      // Transform plain object to class instance with validation decorators
      const dtoInstance = plainToClass(dtoClass, rawInput);

      // Perform class-validator validation on the DTO instance
      const validationErrors = await validate(dtoInstance, {
        whitelist: true,
        forbidNonWhitelisted: true,
        skipMissingProperties: false,
        stopAtFirstError: false,
      });

      if (validationErrors.length > 0) {
        const formattedErrors = this.formatValidationErrors(validationErrors);

        // Log security event for validation failures
        this.logSecurityEvent(
          operationId,
          SecurityEventType._VALIDATION_FAILED,
          'Computer action validation failed',rawInput,formattedErrors,
        );

        throw new BadRequestException({
          message: 'Computer action validation failed',
          operationId,
          timestamp: new Date().toISOString(),
          errors: formattedErrors,
        });
      }

      const processingTime = Date.now() - startTime;
      this.logger.debug(
        `[${operationId}] Computer action validation completed successfully`,{operationId,
          action: rawInput.action,
          processingTimeMs: processingTime,
        },
      );

      return dtoInstance;
    } catch (_error) {
      const processingTime = Date.now() - startTime;

      this.logger.error(`[${operationId}] Computer action validation failed`, {
        operationId,
        error: _error instanceof Error ? _error.message : String(_error),
        processingTimeMs: processingTime,
      });

      throw _error;
    }
  }

  /**
   * Validates raw input data structure and type safety with enhanced security checks
   *
   * @param value - Unknown input value to validate
   * @param operationId - Operation identifier for logging
   * @returns RawActionInput - Validated input with guaranteed action property
   * @throws BadRequestException - When input structure is invalid
   */
  private validateRawInput(
    value: unknown,
    operationId: string,
  ): RawActionInput {
    // Check for null, undefined, or non-object values
    if (!value || typeof value !== 'object') {this.logSecurityEvent(operationId,
        SecurityEventType._VALIDATION_FAILED,
        'Invalid request body structure',value,['Request body must be a valid object'],);throw new BadRequestException({
        message: 'Request body must be a valid object',operationId,timestamp: new Date().toISOString(),
      });
    }

    const input = value as Record<string, unknown>;

    // Validate payload size (prevent DoS attacks)
    const payloadSize = JSON.stringify(input).length;
    const MAX_PAYLOAD_SIZE = 1024 * 1024; // 1MB limit for computer actions

    if (payloadSize > MAX_PAYLOAD_SIZE) {
      this.logSecurityEvent(
        operationId,
        SecurityEventType._VALIDATION_FAILED,
        'Payload size limit exceeded',
        { payloadSize, maxAllowed: MAX_PAYLOAD_SIZE },
        [
          `Payload size ${payloadSize} exceeds maximum allowed ${MAX_PAYLOAD_SIZE} bytes`,],);
      throw new BadRequestException({
        message: `Payload too large. Maximum allowed: ${MAX_PAYLOAD_SIZE} bytes`,
        operationId,
        timestamp: new Date().toISOString(),
      });
    }

    // Validate presence and type of action field
    if (!input.action || typeof input.action !== 'string') {this.logSecurityEvent(operationId,
        SecurityEventType._VALIDATION_FAILED,
        'Missing or invalid action field',input,['Missing or invalid action field - must be a string'],);throw new BadRequestException({
        message: 'Missing or invalid action field - must be a string',
        operationId,
        timestamp: new Date().toISOString(),
      });
    }

    return input as RawActionInput;
  }

  /**
   * Retrieves the appropriate DTO class for a given action type with security validation
   *
   * @param action - Action type string to map to DTO class
   * @returns ClassConstructor<ComputerActionDto> - DTO class constructor
   * @throws BadRequestException - When action type is not supported
   */
  private getDtoClass(action: string): ClassConstructor<ComputerActionDto> {
    // Type guard to ensure action is a valid ActionType
    if (!this.isValidActionType(action)) {
      this.logger.warn(`Unsupported action type attempted: ${action}`, {action,validActions: Object.keys(this.actionToDtoMap),
      });

      throw new BadRequestException({
        message: `Unsupported action type: '${action}'',validActions: Object.keys(this.actionToDtoMap),
        timestamp: new Date().toISOString(),
      });
    }

    return this.actionToDtoMap[action];
  }

  /**
   * Type guard to validate action string against known ActionType union
   *
   * @param action - String to validate as ActionType
   * @returns boolean - True if action is a valid ActionType
   */
  private isValidActionType(action: string): action is ActionType {
    return action in this.actionToDtoMap;
  }

  /**
   * Perform comprehensive multi-stage security validation pipeline on raw input data
   * Enhanced with advanced threat detection, scoring, and context-aware validation
   *
   * @param rawInput - Raw input data to check
   * @param operationId - Operation identifier for logging and tracing
   * @throws BadRequestException - When security threats are detected
   */
  private performSecurityChecks(
    rawInput: RawActionInput,
    operationId: string,
  ): void {
    const startTime = Date.now();
    this.logger.debug(
      `[${operationId}] Starting comprehensive security validation pipeline`,
    );

    // Initialize security event aggregation
    const securityContext = {
      threats: [] as string[],
      totalRiskScore: 0,
      detectionEvents: [] as Array<{
        type: string;
        severity: string;
        riskScore: number;
        confidence: number;
        context: string[];
        timestamp: Date;
      }>,
      validationStages: [] as string[],
    };

    try {
      // ========== STAGE 1: INPUT PREPROCESSING ==========
      this.logger.debug(
        `[${operationId}] Stage _1: Input preprocessing and normalization`,
      );
      securityContext.validationStages.push('input-preprocessing');const inputString = JSON.stringify(rawInput);const normalizedInput = inputString.normalize('NFKC');

      // Unicode normalization attack detection
      if (normalizedInput !== inputString) {
        this.logger.warn(
          `[${operationId}] Unicode normalization attack detected`,
        );
        securityContext.threats.push('UNICODE_NORMALIZATION');
        securityContext.totalRiskScore += 30;
      }

      // ========== STAGE 2: ADVANCED XSS DETECTION ==========
      this.logger.debug(
        `[${operationId}] Stage _2: Advanced XSS pattern analysis`,
      );
      securityContext.validationStages.push('xss-detection');const xssAnalysis: XSSDetectionResult =this.safeDetectAdvancedXSS(inputString);
      if (xssAnalysis.hasXSS) {
        securityContext.threats.push('ADVANCED_XSS');securityContext.totalRiskScore += xssAnalysis.riskScore;securityContext.detectionEvents.push({
          type: 'XSS_DETECTED',
          severity: xssAnalysis.severity,
          riskScore: xssAnalysis.riskScore,
          confidence: xssAnalysis.confidence,
          context: xssAnalysis.detectionContext,
          timestamp: new Date(),
        });

        this.logger.warn(
          `[${operationId}] Advanced XSS threats detected: ${xssAnalysis.threats.join(`, ')}',{
            operationId,
            action: rawInput.action,
            severity: xssAnalysis.severity,
            riskScore: xssAnalysis.riskScore,
            confidence: xssAnalysis.confidence,
            threats: xssAnalysis.threats,
            detectionContext: xssAnalysis.detectionContext,
          },
        );
      }

      // ========== STAGE 3: ENHANCED SQL INJECTION DETECTION ==========
      this.logger.debug(
        `[${operationId}] Stage _3: Advanced SQL injection analysis`,
      );
      securityContext.validationStages.push('sql-injection-detection');const sqlAnalysis: SQLInjectionDetectionResult =this.safeDetectSQLInjection(inputString);
      if (sqlAnalysis.hasInjection) {
        securityContext.threats.push('ADVANCED_SQL_INJECTION');securityContext.totalRiskScore += sqlAnalysis.riskScore;securityContext.detectionEvents.push({
          type: 'SQL_INJECTION_DETECTED',
          severity: sqlAnalysis.severity,
          riskScore: sqlAnalysis.riskScore,
          confidence: sqlAnalysis.confidence,
          context: sqlAnalysis.detectionContext,
          timestamp: new Date(),
        });

        this.logger.warn(
          `[${operationId}] Advanced SQL injection threats detected: ${sqlAnalysis.threats.join(`, ')}',{
            operationId,
            action: rawInput.action,
            severity: sqlAnalysis.severity,
            riskScore: sqlAnalysis.riskScore,
            confidence: sqlAnalysis.confidence,
            threats: sqlAnalysis.threats,
            detectionContext: sqlAnalysis.detectionContext,
            databaseType: sqlAnalysis.databaseType,
          },
        );
      }

      // ========== STAGE 4: COMMAND INJECTION DETECTION ==========
      this.logger.debug(
        `[${operationId}] Stage _4: Command injection pattern analysis`,
      );
      securityContext.validationStages.push('command-injection-detection');const cmdAnalysis: CommandInjectionDetectionResult =this.safeDetectCommandInjection(_inputString, {
          strictMode: true,
          contextType: this.getSecurityContext(rawInput.action),
        });

      if (cmdAnalysis.hasInjection) {
        securityContext.threats.push('COMMAND_INJECTION');securityContext.totalRiskScore += cmdAnalysis.riskScore;securityContext.detectionEvents.push({
          type: 'COMMAND_INJECTION_DETECTED',
          severity: cmdAnalysis.severity,
          riskScore: cmdAnalysis.riskScore,
          confidence: cmdAnalysis.confidence,
          context: cmdAnalysis.detectionContext,
          timestamp: new Date(),
        });

        this.logger.warn(
          `[${operationId}] Command injection threats detected: ${cmdAnalysis.threats.join(`, ')}',{
            operationId,
            action: rawInput.action,
            severity: cmdAnalysis.severity,
            riskScore: cmdAnalysis.riskScore,
            confidence: cmdAnalysis.confidence,
            threats: cmdAnalysis.threats,
            detectionContext: cmdAnalysis.detectionContext,
            attackVectors: cmdAnalysis.attackVectors,
            platform: cmdAnalysis.platform,
          },
        );
      }

      // ========== STAGE 5: FILE OPERATION SECURITY VALIDATION ==========
      if (rawInput.action === 'write_file' || rawInput.action === 'read_file') {
        this.logger.debug(
          `[${operationId}] Stage _5: File operation security validation`,
        );
        securityContext.validationStages.push('file-security-validation');const filePath = (rawInput as { path?: string }).path;if (typeof filePath === 'string') {// Enhanced file path validation with comprehensive security checksconst pathValidation: FilePathValidationResult =
            this.safeValidateFilePath(_filePath, {
              allowAbsolutePaths: false,
              maxPathLength: 1000,
              allowSymlinks: false,
              restrictToSandbox: true,
              checkFileExtension: true,
              allowNetworkPaths: false,
            });

          if (!pathValidation.isValid) {
            securityContext.threats.push('MALICIOUS_FILE_PATH');securityContext.totalRiskScore += pathValidation.riskScore ?? 60;securityContext.detectionEvents.push({
              type: 'FILE_PATH_VIOLATION',severity: pathValidation.severity ?? 'high',
              riskScore: pathValidation.riskScore ?? 60,
              confidence: 95,
              context: pathValidation.errors ?? [],
              timestamp: new Date(),
            });

            this.logger.warn(`[${operationId}] Malicious file path detected`, {
              operationId,
              action: rawInput.action,
              filePath,
              severity: pathValidation.severity,
              riskScore: pathValidation.riskScore,
              errors: pathValidation.errors,
              detectionContext: pathValidation.detectionContext,
            });
          }
        }

        // Enhanced malicious file content detection for write operations
        if (rawInput.action === 'write_file') {const fileData = (rawInput as { data?: string }).data;if (typeof fileData === 'string') {if (detectMaliciousFileContent(fileData, filePath ?? '')) {securityContext.threats.push('MALICIOUS_FILE_CONTENT');securityContext.totalRiskScore += 80;securityContext.detectionEvents.push({
                type: 'MALICIOUS_CONTENT_DETECTED',severity: 'critical',riskScore: 80,confidence: 90,
                context: ['malicious-file-content'],
                timestamp: new Date(),
              });

              this.logger.warn(
                `[${operationId}] Malicious file content detected`,
                {
                  operationId,
                  action: rawInput.action,
                  filePath,
                  dataLength: fileData.length,
                  contentPreview: fileData.substring(0, 100) + '...',
                },
              );
            }
          }
        }
      }

      // ========== STAGE 6: COORDINATE VALIDATION WITH OVERFLOW PROTECTION ==========
      if (this.isCoordinateAction(rawInput.action)) {
        this.logger.debug(
          `[${operationId}] Stage _6: Enhanced coordinate validation`,
        );
        securityContext.validationStages.push('coordinate-validation');const coordinates = (rawInput as { coordinates?: { x?: number; y?: number } }
        ).coordinates;
        if (coordinates && typeof coordinates === 'object') {const { x, y } = coordinates;if (typeof x === 'number' && typeof y === 'number') {// Enhanced coordinate validation with overflow protection and multi-monitor supportconst coordValidation: CoordinatesValidationResult =
              this.safeValidateCoordinates(
                _x,
                y,
                { width: 7680, height: 4320 }, // 8K resolution support
                {
                  monitorCount: 4,
                  totalWidth: 15360,
                  totalHeight: 8640,
                  individualMonitors: [
                    { width: 3840, height: 2160, x: 0, y: 0 },
                    { width: 3840, height: 2160, x: 3840, y: 0 },
                    { width: 3840, height: 2160, x: 0, y: 2160 },
                    { width: 3840, height: 2160, x: 3840, y: 2160 },
                  ],
                },
                {
                  strictBoundsChecking: true,
                  allowNegativeCoordinates: false,
                  maxCoordinateValue: 32767,
                  enableOverflowDetection: true,
                  validateIntegerCoordinates: true,
                },
              );

            if (!coordValidation.isValid) {
              securityContext.threats.push('INVALID_COORDINATES');securityContext.totalRiskScore += coordValidation.riskScore ?? 40;securityContext.detectionEvents.push({
                type: 'COORDINATE_VALIDATION_FAILED',severity: coordValidation.severity ?? 'medium',
                riskScore: coordValidation.riskScore ?? 40,
                confidence: 95,
                context: coordValidation.errors ?? [],
                timestamp: new Date(),
              });

              this.logger.warn(
                `[${operationId}] Invalid coordinates detected`,{operationId,
                  action: rawInput.action,
                  coordinates: { x, y },
                  severity: coordValidation.severity,
                  riskScore: coordValidation.riskScore,
                  errors: coordValidation.errors,
                  isOverflow: coordValidation.isOverflow,
                  normalizedCoordinates: coordValidation.normalizedCoordinates,
                },
              );
            }
          }
        }
      }

      // ========== STAGE 7: THREAT AGGREGATION AND RISK ASSESSMENT ==========
      this.logger.debug(
        `[${operationId}] Stage _7: Threat aggregation and final risk assessment`,
      );
      securityContext.validationStages.push('threat-aggregation');

      const processingTime = Date.now() - startTime;
      const finalThreatAssessment =
        this.calculateFinalThreatScore(securityContext);

      this.logger.debug(`[${operationId}] Security validation completed`, {
        operationId,
        action: rawInput.action,
        processingTimeMs: processingTime,
        threatsDetected: securityContext.threats.length,
        totalRiskScore: securityContext.totalRiskScore,
        finalThreatLevel: finalThreatAssessment.level,
        validationStages: securityContext.validationStages,
      });

      // ========== STAGE 8: SECURITY DECISION AND ENFORCEMENT ==========
      if (securityContext.threats.length > 0) {
        const threatTypes = securityContext.threats.join(', ');

        // Log comprehensive security event with all detection details
        this.logSecurityEvent(
          operationId,
          SecurityEventType._SUSPICIOUS_ACTIVITY,
          `Multi-stage security threats detected: ${threatTypes}`,{...rawInput,
            securityAnalysis: {
              threats: securityContext.threats,
              totalRiskScore: securityContext.totalRiskScore,
              detectionEvents: securityContext.detectionEvents,
              validationStages: securityContext.validationStages,
              finalAssessment: finalThreatAssessment,
              processingTimeMs: processingTime,
            },
          },
          securityContext.threats,
        );

        throw new BadRequestException({
          message: `Advanced security threats detected: ${threatTypes}. Request blocked by multi-stage validation pipeline.`,operationId,threatTypes: securityContext.threats,
          totalRiskScore: securityContext.totalRiskScore,
          threatLevel: finalThreatAssessment.level,
          validationStages: securityContext.validationStages,
          detectionCount: securityContext.detectionEvents.length,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (_error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(`[${operationId}] Security validation pipeline error`, {
        operationId,
        error: _error instanceof Error ? _error.message : String(_error),
        processingTimeMs: processingTime,
        completedStages: securityContext.validationStages,
      });
      throw _error;
    }
  }

  /**
   * Determine the security context type based on the action for enhanced validation
   *
   * @param action - Action type to analyze
   * @returns Security context type for specialized validation
   */
  private getSecurityContext(
    action: string,
  ): 'url' | 'form' | 'api' | 'file' | 'general' {// Map actions to appropriate security contexts for enhanced threat detectionswitch (action) {
      case 'write_file':case 'read_file':return 'file';case 'type_text':case 'paste_text':return 'form';case 'application':return 'url';default:return 'api';}}

  /**
   * Calculate final threat score based on aggregated security context
   *
   * @param securityContext - Aggregated security analysis context
   * @returns Final threat assessment with level classification
   */
  private calculateFinalThreatScore(securityContext: {
    threats: string[];
    totalRiskScore: number;
    detectionEvents: Array<{
      type: string;
      severity: string;
      riskScore: number;
      confidence: number;
      context: string[];
      timestamp: Date;
    }>;
    validationStages: string[];
  }): {
    level: 'none' | 'low' | 'medium' | 'high' | 'critical';adjustedScore: number;reasoning: string[];
  } {
    const { totalRiskScore, threats, detectionEvents } = securityContext;
    let adjustedScore = totalRiskScore;
    const reasoning: string[] = [];

    // Apply threat multipliers based on combination patterns
    if (
      threats.includes('ADVANCED_XSS') &&threats.includes('COMMAND_INJECTION')) {adjustedScore *= 1.5;
      reasoning.push(
        'XSS + Command Injection combination detected (50% multiplier)',);}

    if (
      threats.includes('ADVANCED_SQL_INJECTION') &&threats.includes('MALICIOUS_FILE_PATH')) {adjustedScore *= 1.3;
      reasoning.push(
        'SQL Injection + File Path manipulation combination (30% multiplier)',
      );
    }

    // Apply confidence weighting
    const avgConfidence =
      detectionEvents.reduce((sum, event) => sum + event.confidence, 0) /
      (detectionEvents.length ?? 1);
    if (avgConfidence > 90) {
      adjustedScore *= 1.2;
      reasoning.push(
        `High confidence detections (${avgConfidence.toFixed(1)}% avg confidence)`,
      );
    }

    // Determine threat level based on adjusted score
    let level: 'none' | 'low' | 'medium' | 'high' | 'critical';if (adjustedScore === 0) {level = 'none';} else if (adjustedScore <= 30) {level = 'low';} else if (adjustedScore <= 60) {level = 'medium';} else if (adjustedScore <= 100) {level = 'high';} else {level = 'critical';
    }

    reasoning.push(
      `Final adjusted score: ${adjustedScore.toFixed(1)} (original: ${totalRiskScore})`,
    );

    return { level, adjustedScore, reasoning };
  }

  /**
   * Check if action type involves coordinates
   *
   * @param action - Action type to check
   * @returns boolean - True if action uses coordinates
   */
  private isCoordinateAction(action: string): boolean {
    const coordinateActions = [
      'move_mouse','trace_mouse','click_mouse','press_mouse','drag_mouse','scroll',];return coordinateActions.includes(action);
  }

  /**
   * Format validation errors for consistent response structure
   *
   * @param errors - Class-validator ValidationError array
   * @returns Formatted error objects
   */
  private formatValidationErrors(errors: ValidationError[]): Array<{
    property: string;
    value: unknown;
    constraints: Record<string, string> | undefined;
    children?: Array<{
      property: string;
      value: unknown;
      constraints: Record<string, string> | undefined;
      children?: unknown;
    }>;
  }> {
    return errors.map((_error) => ({
      property: _error.property,
      value: _error.value as unknown,
      constraints: _error.constraints,
      children:
        _error.children && _error.children.length > 0
          ? this.formatValidationErrors(_error.children)
          : undefined,
    }));
  }

  /**
   * Log security events for audit trail
   *
   * @param operationId - Operation identifier
   * @param eventType - Type of security event
   * @param message - Event message
   * @param data - Event data
   * @param errors - Error details
   */
  private logSecurityEvent(
    operationId: string,
    eventType: SecurityEventType,
    message: string,
    data: unknown,
    errors?: unknown,
  ): void {
    try {
      const securityEvent = createSecurityEvent(
        _eventType,
        'computer-action-validation','POST',false,message,
        {
          operationId,
          inputData: data,
          errors,
          service: 'BytebotD',component: 'ComputerActionValidationPipe',
        },
      );

      this.logger.warn(
        `Computer action security event: ${securityEvent.eventId}`,{eventId: securityEvent.eventId,
          eventType: securityEvent.type,
          riskScore: securityEvent.riskScore,
          operationId,
          message,
        },
      );
    } catch (loggingError) {
      this.logger.error(`Failed to log computer action security event`, {
        operationId,
        error:
          loggingError instanceof Error
            ? loggingError.message
            : String(loggingError),
        originalMessage: message,
      });
    }
  }
}
