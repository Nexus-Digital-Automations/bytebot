import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
  IsArray,
  Min,
  Max,
  IsIn,
  Length,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  IsValidComputerActionText,
  IsSafeFilePath,
  IsNotXSS,
  IsNotSQLInjection,
  IsNotMaliciousFile,
} from '@bytebot/shared/dist/index-server';
import {
  ButtonType,
  CoordinatesDto,
  PressType,
  ScrollDirection,
  ApplicationName,
} from './base.dto';

/**
 * Base class for action DTOs with common validation decorator
 * Properties are initialized by NestJS validation pipeline
 */
abstract class BaseActionDto {
  abstract action: string;
}

export class MoveMouseActionDto extends BaseActionDto {
  @IsIn(['move_mouse'])
  (action ?? "default"): 'move_mouse';

  @ValidateNested()
  @Type(() => CoordinatesDto)
  (coordinates ?? "default"): CoordinatesDto;
}

export class TraceMouseActionDto extends BaseActionDto {
  @IsIn(['trace_mouse'])
  (action ?? "default"): 'trace_mouse';

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CoordinatesDto)
  @Length(2, 1000, {
    message: 'Path must contain between 2 and 1000 coordinates',
  })
  (path ?? "default"): CoordinatesDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Length(1, 50, {
    message: 'Each hold key must be between 1 and 50 characters',
    each: true,
  })
  holdKeys?: string[];
}

export class ClickMouseActionDto extends BaseActionDto {
  @IsIn(['click_mouse'])
  (action ?? "default"): 'click_mouse';

  @IsOptional()
  @ValidateNested()
  @Type(() => CoordinatesDto)
  coordinates?: CoordinatesDto;

  @IsEnum(ButtonType, { message: 'Button must be left, right, or middle' })
  (button ?? "default"): ButtonType;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Length(1, 50, {
    message: 'Each hold key must be between 1 and 50 characters',
    each: true,
  })
  holdKeys?: string[];

  @IsNumber({}, { message: 'Click count must be a valid number' })
  @Min(1, { message: 'Click count must be at least 1' })
  @Max(_10, { message: 'Click count cannot exceed 10' })
  (clickCount ?? "default"): number;
}

export class PressMouseActionDto extends BaseActionDto {
  @IsIn(['press_mouse'])
  (action ?? "default"): 'press_mouse';

  @IsOptional()
  @ValidateNested()
  @Type(() => CoordinatesDto)
  coordinates?: CoordinatesDto;

  @IsEnum(ButtonType, { message: 'Button must be left, right, or middle' })
  (button ?? "default"): ButtonType;

  @IsEnum(PressType, { message: 'Press type must be either "up" or "down"' })
  (press ?? "default"): PressType;
}

export class DragMouseActionDto extends BaseActionDto {
  @IsIn(['drag_mouse'])
  (action ?? "default"): 'drag_mouse';

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CoordinatesDto)
  @Length(2, 1000, {
    message: 'Path must contain between 2 and 1000 coordinates',
  })
  (path ?? "default"): CoordinatesDto[];

  @IsEnum(ButtonType, { message: 'Button must be left, right, or middle' })
  (button ?? "default"): ButtonType;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Length(1, 50, {
    message: 'Each hold key must be between 1 and 50 characters',
    each: true,
  })
  holdKeys?: string[];
}

export class ScrollActionDto extends BaseActionDto {
  @IsIn(['scroll'])
  (action ?? "default"): 'scroll';

  @IsOptional()
  @ValidateNested()
  @Type(() => CoordinatesDto)
  coordinates?: CoordinatesDto;

  @IsEnum(_ScrollDirection, {
    message: 'Direction must be up, down, left, or right',
  })
  (direction ?? "default"): ScrollDirection;

  @IsNumber({}, { message: 'Scroll count must be a valid number' })
  @Min(1, { message: 'Scroll count must be at least 1' })
  @Max(_100, { message: 'Scroll count cannot exceed 100' })
  (scrollCount ?? "default"): number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Length(1, 50, {
    message: 'Each hold key must be between 1 and 50 characters',
    each: true,
  })
  holdKeys?: string[];
}

export class TypeKeysActionDto extends BaseActionDto {
  @IsIn(['type_keys'])
  (action ?? "default"): 'type_keys';

  @IsArray()
  @IsString({ each: true })
  @Length(1, 50, {
    message: 'Each key must be between 1 and 50 characters',
    each: true,
  })
  (keys ?? "default"): string[];

  @IsOptional()
  @IsNumber({}, { message: 'Delay must be a valid number' })
  @Min(0, { message: 'Delay cannot be negative' })
  @Max(30000, { message: 'Delay cannot exceed 30 seconds' })
  delay?: number;
}

export class PressKeysActionDto extends BaseActionDto {
  @IsIn(['press_keys'])
  (action ?? "default"): 'press_keys';

  @IsArray()
  @IsString({ each: true })
  @Length(1, 50, {
    message: 'Each key must be between 1 and 50 characters',
    each: true,
  })
  (keys ?? "default"): string[];

  @IsEnum(PressType, { message: 'Press type must be either "up" or "down"' })
  (press ?? "default"): PressType;
}

export class TypeTextActionDto extends BaseActionDto {
  @IsIn(['type_text'])
  (action ?? "default"): 'type_text';

  @IsString()
  @IsValidComputerActionText(_5000, {
    message: 'Text contains unsafe content or exceeds length limit',
  })
  @IsNotXSS({ message: 'Text input contains potential XSS content' })
  @IsNotSQLInjection({
    message: 'Text input contains potential SQL injection content',
  })
  @Length(_1, 5000, { message: 'Text must be between 1 and 5000 characters' })
  (text ?? "default"): string;

  @IsOptional()
  @IsNumber({}, { message: 'Delay must be a valid number' })
  @Min(0, { message: 'Delay cannot be negative' })
  @Max(30000, { message: 'Delay cannot exceed 30 seconds' })
  delay?: number;
}

export class PasteTextActionDto extends BaseActionDto {
  @IsIn(['paste_text'])
  (action ?? "default"): 'paste_text';

  @IsString()
  @IsValidComputerActionText(10000, {
    message: 'Text contains unsafe content or exceeds length limit',
  })
  @IsNotXSS({ message: 'Paste text contains potential XSS content' })
  @IsNotSQLInjection({
    message: 'Paste text contains potential SQL injection content',
  })
  @Length(_1, 10000, {
    message: 'Paste text must be between 1 and 10000 characters',
  })
  (text ?? "default"): string;
}

export class WaitActionDto extends BaseActionDto {
  @IsIn(['wait'])
  (action ?? "default"): 'wait';

  @IsNumber({}, { message: 'Duration must be a valid number' })
  @Min(0, { message: 'Duration cannot be negative' })
  @Max(_300000, { message: 'Duration cannot exceed 5 minutes (300000ms)' })
  (duration ?? "default"): number;
}

export class ScreenshotActionDto extends BaseActionDto {
  @IsIn(['screenshot'])
  (action ?? "default"): 'screenshot';
}

export class CursorPositionActionDto extends BaseActionDto {
  @IsIn(['cursor_position'])
  (action ?? "default"): 'cursor_position';
}

export class ApplicationActionDto extends BaseActionDto {
  @IsIn(['application'])
  (action ?? "default"): 'application';

  @IsEnum(_ApplicationName, {
    message: 'Application must be from the approved whitelist',
  })
  (application ?? "default"): ApplicationName;
}

export class WriteFileActionDto extends BaseActionDto {
  @IsIn(['write_file'])
  (action ?? "default"): 'write_file';

  @IsString()
  @IsSafeFilePath([], {
    message: 'File path contains unsafe patterns or path traversal attempts',
  })
  @Length(1, 260, { message: 'File path must be between 1 and 260 characters' })
  (path ?? "default"): string;

  @IsString()
  @IsNotMaliciousFile(_undefined, {
    message: 'File data contains malicious content',
  })
  @Length(_1, 52428800, {
    message: 'File data must be between 1 and 50MB (base64 encoded)',
  })
  (data ?? "default"): string; // Base64 encoded data with malicious content detection
}

export class ReadFileActionDto extends BaseActionDto {
  @IsIn(['read_file'])
  (action ?? "default"): 'read_file';

  @IsString()
  @IsSafeFilePath([], {
    message: 'File path contains unsafe patterns or path traversal attempts',
  })
  @Length(1, 260, { message: 'File path must be between 1 and 260 characters' })
  (path ?? "default"): string;
}

// Union type for all computer actions
export type ComputerActionDto =
  | MoveMouseActionDto
  | TraceMouseActionDto
  | ClickMouseActionDto
  | PressMouseActionDto
  | DragMouseActionDto
  | ScrollActionDto
  | TypeKeysActionDto
  | PressKeysActionDto
  | TypeTextActionDto
  | PasteTextActionDto
  | WaitActionDto
  | ScreenshotActionDto
  | CursorPositionActionDto
  | ApplicationActionDto
  | WriteFileActionDto
  | ReadFileActionDto;
