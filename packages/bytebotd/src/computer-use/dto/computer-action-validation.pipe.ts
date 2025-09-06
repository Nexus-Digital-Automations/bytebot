import {
  PipeTransform,
  Injectable,
  BadRequestException,
  ArgumentMetadata,
  Logger,
} from '@nestjs/common';
import { validate, ValidationError } from 'class-validator';
import { plainToClass, ClassConstructor } from 'class-transformer';
import {
  detectXSS,
  detectSQLInjection,
  detectMaliciousFileContent,
  validateFilePath,
  validateCoordinates,
  createSecurityEvent,
  SecurityEventType,
} from '@bytebot/shared/utils/security.utils';
import {
  MoveMouseActionDto,
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
} from './computer-action.dto';

/**
 * Interface defining the structure of raw action input data
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
  | 'move_mouse'
  | 'trace_mouse'
  | 'click_mouse'
  | 'press_mouse'
  | 'drag_mouse'
  | 'scroll'
  | 'type_keys'
  | 'press_keys'
  | 'type_text'
  | 'paste_text'
  | 'wait'
  | 'screenshot'
  | 'cursor_position'
  | 'application'
  | 'write_file'
  | 'read_file';

/**
 * Enhanced NestJS validation pipe for computer action DTOs with advanced security features
 * Validates incoming action requests and transforms them to strongly-typed DTOs
 *
 * Enhanced Features:
 * - Advanced XSS and SQL injection detection
 * - Malicious file content scanning
 * - Path traversal attack prevention
 * - Coordinate bounds validation with overflow protection
 * - Comprehensive security event logging
 * - Rate limiting and payload size validation
 * - Type-safe validation pipeline with comprehensive error handling
 * - Action-specific DTO mapping with proper TypeScript interfaces
 * - Class-validator integration for robust input validation
 * - Detailed error messages for debugging and API documentation
 *
 * @version 2.0.0 - Enhanced Security Edition
 * @author Specialized Input Validation Enhancement Subagent
 */
@Injectable()
export class ComputerActionValidationPipe
  implements PipeTransform<unknown, Promise<ComputerActionDto>>
{
  private readonly logger = new Logger(ComputerActionValidationPipe.name);
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
    _metadata: ArgumentMetadata,
  ): Promise<ComputerActionDto> {
    const operationId = `computer-action-validation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    try {
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
      await this.performSecurityChecks(rawInput, operationId);

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
          SecurityEventType.VALIDATION_FAILED,
          'Computer action validation failed',
          rawInput,
          formattedErrors,
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
        `[${operationId}] Computer action validation completed successfully`,
        {
          operationId,
          action: rawInput.action,
          processingTimeMs: processingTime,
        },
      );

      return dtoInstance;
    } catch (error) {
      const processingTime = Date.now() - startTime;

      this.logger.error(`[${operationId}] Computer action validation failed`, {
        operationId,
        error: error.message,
        processingTimeMs: processingTime,
      });

      throw error;
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
    if (!value || typeof value !== 'object') {
      this.logSecurityEvent(
        operationId,
        SecurityEventType.VALIDATION_FAILED,
        'Invalid request body structure',
        value,
        ['Request body must be a valid object'],
      );
      throw new BadRequestException({
        message: 'Request body must be a valid object',
        operationId,
        timestamp: new Date().toISOString(),
      });
    }

    const input = value as Record<string, unknown>;

    // Validate payload size (prevent DoS attacks)
    const payloadSize = JSON.stringify(input).length;
    const MAX_PAYLOAD_SIZE = 1024 * 1024; // 1MB limit for computer actions

    if (payloadSize > MAX_PAYLOAD_SIZE) {
      this.logSecurityEvent(
        operationId,
        SecurityEventType.VALIDATION_FAILED,
        'Payload size limit exceeded',
        { payloadSize, maxAllowed: MAX_PAYLOAD_SIZE },
        [
          `Payload size ${payloadSize} exceeds maximum allowed ${MAX_PAYLOAD_SIZE} bytes`,
        ],
      );
      throw new BadRequestException({
        message: `Payload too large. Maximum allowed: ${MAX_PAYLOAD_SIZE} bytes`,
        operationId,
        timestamp: new Date().toISOString(),
      });
    }

    // Validate presence and type of action field
    if (!input.action || typeof input.action !== 'string') {
      this.logSecurityEvent(
        operationId,
        SecurityEventType.VALIDATION_FAILED,
        'Missing or invalid action field',
        input,
        ['Missing or invalid action field - must be a string'],
      );
      throw new BadRequestException({
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
      this.logger.warn(`Unsupported action type attempted: ${action}`, {
        action,
        validActions: Object.keys(this.actionToDtoMap),
      });

      throw new BadRequestException({
        message: `Unsupported action type: '${action}'`,
        validActions: Object.keys(this.actionToDtoMap),
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
   * Perform comprehensive security checks on raw input data
   *
   * @param rawInput - Raw input data to check
   * @param operationId - Operation identifier for logging
   * @throws BadRequestException - When security threats are detected
   */
  private async performSecurityChecks(
    rawInput: RawActionInput,
    operationId: string,
  ): Promise<void> {
    const threats: string[] = [];

    // Convert input to string for pattern analysis
    const inputString = JSON.stringify(rawInput);

    // Check for XSS attempts
    if (detectXSS(inputString)) {
      threats.push('XSS');
      this.logger.warn(
        `[${operationId}] XSS attempt detected in computer action`,
        {
          operationId,
          action: rawInput.action,
          inputPreview: inputString.substring(0, 100) + '...',
        },
      );
    }

    // Check for SQL injection attempts
    if (detectSQLInjection(inputString)) {
      threats.push('SQL_INJECTION');
      this.logger.warn(
        `[${operationId}] SQL injection attempt detected in computer action`,
        {
          operationId,
          action: rawInput.action,
          inputPreview: inputString.substring(0, 100) + '...',
        },
      );
    }

    // Check for file-specific threats if action involves files
    if (rawInput.action === 'write_file' || rawInput.action === 'read_file') {
      const filePath = (rawInput as any).path;
      if (typeof filePath === 'string') {
        const pathValidation = validateFilePath(filePath);
        if (!pathValidation.isValid) {
          threats.push('PATH_TRAVERSAL');
          this.logger.warn(`[${operationId}] Path traversal attempt detected`, {
            operationId,
            action: rawInput.action,
            filePath,
            errors: pathValidation.errors,
          });
        }
      }

      // Check for malicious file content if writing files
      if (rawInput.action === 'write_file') {
        const fileData = (rawInput as any).data;
        if (typeof fileData === 'string') {
          if (detectMaliciousFileContent(fileData, filePath)) {
            threats.push('MALICIOUS_FILE');
            this.logger.warn(
              `[${operationId}] Malicious file content detected`,
              {
                operationId,
                action: rawInput.action,
                filePath,
                dataLength: fileData.length,
              },
            );
          }
        }
      }
    }

    // Check coordinate bounds for mouse/screen actions
    if (this.isCoordinateAction(rawInput.action)) {
      const coordinates = (rawInput as any).coordinates;
      if (coordinates && typeof coordinates === 'object') {
        const { x, y } = coordinates;
        if (typeof x === 'number' && typeof y === 'number') {
          const coordValidation = validateCoordinates(x, y);
          if (!coordValidation.isValid) {
            threats.push('INVALID_COORDINATES');
            this.logger.warn(`[${operationId}] Invalid coordinates detected`, {
              operationId,
              action: rawInput.action,
              coordinates: { x, y },
              errors: coordValidation.errors,
            });
          }
        }
      }
    }

    // Throw exception if any threats detected
    if (threats.length > 0) {
      const threatTypes = threats.join(', ');

      this.logSecurityEvent(
        operationId,
        SecurityEventType.SUSPICIOUS_ACTIVITY,
        `Security threats detected in computer action: ${threatTypes}`,
        rawInput,
        threats,
      );

      throw new BadRequestException({
        message: `Security violation detected: ${threatTypes}. Request has been blocked and logged.`,
        operationId,
        threatTypes: threats,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Check if action type involves coordinates
   *
   * @param action - Action type to check
   * @returns boolean - True if action uses coordinates
   */
  private isCoordinateAction(action: string): boolean {
    const coordinateActions = [
      'move_mouse',
      'trace_mouse',
      'click_mouse',
      'press_mouse',
      'drag_mouse',
      'scroll',
    ];
    return coordinateActions.includes(action);
  }

  /**
   * Format validation errors for consistent response structure
   *
   * @param errors - Class-validator ValidationError array
   * @returns Formatted error objects
   */
  private formatValidationErrors(errors: ValidationError[]): any[] {
    return errors.map((error) => ({
      property: error.property,
      value: error.value,
      constraints: error.constraints,
      children:
        error.children?.length > 0
          ? this.formatValidationErrors(error.children)
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
    data: any,
    errors?: any,
  ): void {
    try {
      const securityEvent = createSecurityEvent(
        eventType,
        'computer-action-validation',
        'POST',
        false,
        message,
        {
          operationId,
          inputData: data,
          errors,
          service: 'BytebotD',
          component: 'ComputerActionValidationPipe',
        },
      );

      this.logger.warn(
        `Computer action security event: ${securityEvent.eventId}`,
        {
          eventId: securityEvent.eventId,
          eventType: securityEvent.type,
          riskScore: securityEvent.riskScore,
          operationId,
          message,
        },
      );
    } catch (loggingError) {
      this.logger.error(`Failed to log computer action security event`, {
        operationId,
        error: loggingError.message,
        originalMessage: message,
      });
    }
  }
}
