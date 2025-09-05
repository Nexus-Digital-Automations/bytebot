import {
  PipeTransform,
  Injectable,
  BadRequestException,
  ArgumentMetadata,
} from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToClass, ClassConstructor } from 'class-transformer';
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
 * NestJS validation pipe for computer action DTOs
 * Validates incoming action requests and transforms them to strongly-typed DTOs
 *
 * Features:
 * - Type-safe validation pipeline with comprehensive error handling
 * - Action-specific DTO mapping with proper TypeScript interfaces
 * - Class-validator integration for robust input validation
 * - Detailed error messages for debugging and API documentation
 */
@Injectable()
export class ComputerActionValidationPipe
  implements PipeTransform<unknown, Promise<ComputerActionDto>>
{
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
   * Validates and transforms raw input data into a strongly-typed action DTO
   *
   * @param value - Raw input data from the request body
   * @param _metadata - ArgumentMetadata (required by interface but unused)
   * @returns Promise<ComputerActionDto> - Validated and transformed DTO instance
   * @throws BadRequestException - When validation fails or action is unsupported
   */
  async transform(
    value: unknown,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _metadata: ArgumentMetadata,
  ): Promise<ComputerActionDto> {
    // Validate input structure and extract action field
    const rawInput = this.validateRawInput(value);

    // Get the appropriate DTO class for the action type
    const dtoClass = this.getDtoClass(rawInput.action);

    // Transform plain object to class instance with validation decorators
    const dtoInstance = plainToClass(dtoClass, rawInput);

    // Perform class-validator validation on the DTO instance
    const validationErrors = await validate(dtoInstance);

    if (validationErrors.length > 0) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: validationErrors.map((error) => ({
          property: error.property,
          constraints: error.constraints,
          value: error.value as unknown,
        })),
      });
    }

    return dtoInstance;
  }

  /**
   * Validates raw input data structure and type safety
   *
   * @param value - Unknown input value to validate
   * @returns RawActionInput - Validated input with guaranteed action property
   * @throws BadRequestException - When input structure is invalid
   */
  private validateRawInput(value: unknown): RawActionInput {
    // Check for null, undefined, or non-object values
    if (!value || typeof value !== 'object') {
      throw new BadRequestException('Request body must be a valid object');
    }

    const input = value as Record<string, unknown>;

    // Validate presence and type of action field
    if (!input.action || typeof input.action !== 'string') {
      throw new BadRequestException(
        'Missing or invalid action field - must be a string',
      );
    }

    return input as RawActionInput;
  }

  /**
   * Retrieves the appropriate DTO class for a given action type
   *
   * @param action - Action type string to map to DTO class
   * @returns ClassConstructor<ComputerActionDto> - DTO class constructor
   * @throws BadRequestException - When action type is not supported
   */
  private getDtoClass(action: string): ClassConstructor<ComputerActionDto> {
    // Type guard to ensure action is a valid ActionType
    if (!this.isValidActionType(action)) {
      throw new BadRequestException(
        `Unsupported action type: '${action}'. ` +
          `Valid actions: ${Object.keys(this.actionToDtoMap).join(', ')}`,
      );
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
}
