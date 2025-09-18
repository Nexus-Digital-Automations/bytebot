/**
 * Browser Form Automation DTOs
 *
 * Data Transfer Objects for form filling, validation, and submission operations.
 * Supports comprehensive form automation including field detection, validation,
 * and intelligent form completion with error handling.
 */

import {
  IsString,
  IsOptional,
  IsEnum,
  IsObject,
  IsArray,
  IsBoolean,
  ValidateNested,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum FormFieldType {
  TEXT = 'text',
  EMAIL = 'email',
  PASSWORD = 'password',
  NUMBER = 'number',
  TEL = 'tel',
  URL = 'url',
  TEXTAREA = 'textarea',
  SELECT = 'select',
  CHECKBOX = 'checkbox',
  RADIO = 'radio',
  FILE = 'file',
  DATE = 'date',
  TIME = 'time',
  DATETIME_LOCAL = 'datetime-local',
  RANGE = 'range',
  COLOR = 'color',
}

export enum FormSubmissionMethod {
  CLICK_SUBMIT = 'click_submit',
  PRESS_ENTER = 'press_enter',
  FORM_SUBMIT = 'form_submit',
}

export class FormField {
  @ApiProperty({ description: 'Field name or identifier' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({ description: 'Field value to set' })
  @IsString()
  value!: string;

  @ApiPropertyOptional({ description: 'Field type', enum: FormFieldType })
  @IsOptional()
  @IsEnum(FormFieldType)
  type?: FormFieldType;

  @ApiPropertyOptional({ description: 'CSS selector for the field' })
  @IsOptional()
  @IsString()
  selector?: string;

  @ApiPropertyOptional({ description: 'XPath selector for the field' })
  @IsOptional()
  @IsString()
  xpath?: string;

  @ApiPropertyOptional({ description: 'Field label text' })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({ description: 'Field placeholder text' })
  @IsOptional()
  @IsString()
  placeholder?: string;

  @ApiPropertyOptional({ description: 'Whether field is required' })
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiPropertyOptional({ description: 'Validation rules for the field' })
  @IsOptional()
  @IsObject()
  validation?: {
    pattern?: string; // Regex pattern
    minLength?: number;
    maxLength?: number;
    min?: number; // For number fields
    max?: number; // For number fields
    customRules?: Record<string, any>;
  };

  @ApiPropertyOptional({
    description: 'Options for select, radio, or checkbox fields',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];
}

export class FillFormDto {
  @ApiPropertyOptional({ description: 'CSS selector of the form' })
  @IsOptional()
  @IsString()
  formSelector?: string;

  @ApiPropertyOptional({ description: 'XPath selector of the form' })
  @IsOptional()
  @IsString()
  formXpath?: string;

  @ApiProperty({ description: 'Fields to fill in the form', type: [FormField] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FormField)
  fields!: FormField[];

  @ApiPropertyOptional({
    description: 'Clear existing field values before filling',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  clearFields?: boolean = true;

  @ApiPropertyOptional({
    description: 'Validate fields before submission',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  validateFields?: boolean = true;

  @ApiPropertyOptional({
    description: 'Skip fields that are not found',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  skipMissingFields?: boolean = false;

  @ApiPropertyOptional({
    description: 'Wait for dynamic form loading',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  waitForDynamic?: boolean = true;

  @ApiPropertyOptional({
    description: 'Timeout for form filling in seconds',
    default: 30,
  })
  @IsOptional()
  @IsBoolean()
  timeoutSeconds?: number = 30;

  @ApiPropertyOptional({
    description: 'Delay between field interactions in milliseconds',
    default: 100,
  })
  @IsOptional()
  @IsBoolean()
  fieldDelayMs?: number = 100;
}

export class SubmitFormDto {
  @ApiPropertyOptional({ description: 'CSS selector of the form' })
  @IsOptional()
  @IsString()
  formSelector?: string;

  @ApiPropertyOptional({ description: 'CSS selector of submit button' })
  @IsOptional()
  @IsString()
  submitButtonSelector?: string;

  @ApiPropertyOptional({
    description: 'Method to use for form submission',
    enum: FormSubmissionMethod,
    default: FormSubmissionMethod.CLICK_SUBMIT,
  })
  @IsOptional()
  @IsEnum(FormSubmissionMethod)
  method?: FormSubmissionMethod = FormSubmissionMethod.CLICK_SUBMIT;

  @ApiPropertyOptional({
    description: 'Wait for navigation after submission',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  waitForNavigation?: boolean = true;

  @ApiPropertyOptional({
    description: 'Wait for specific element to appear after submission',
  })
  @IsOptional()
  @IsString()
  waitForElement?: string;

  @ApiPropertyOptional({
    description: 'Timeout for form submission in seconds',
    default: 30,
  })
  @IsOptional()
  @IsBoolean()
  timeoutSeconds?: number = 30;

  @ApiPropertyOptional({
    description: 'Validate form before submission',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  preValidate?: boolean = true;

  @ApiPropertyOptional({
    description: 'Expected success indicators after submission',
  })
  @IsOptional()
  @IsObject()
  successIndicators?: {
    urlContains?: string;
    elementExists?: string;
    textContains?: string;
    titleContains?: string;
  };

  @ApiPropertyOptional({
    description: 'Expected error indicators after submission',
  })
  @IsOptional()
  @IsObject()
  errorIndicators?: {
    elementExists?: string;
    textContains?: string;
    classContains?: string;
  };
}

export class FormValidationResult {
  @ApiProperty({ description: 'Field name' })
  field!: string;

  @ApiProperty({ description: 'Whether field is valid' })
  valid!: boolean;

  @ApiProperty({ description: 'Field current value' })
  value!: string;

  @ApiProperty({ description: 'Validation error message if invalid' })
  error?: string;

  @ApiProperty({ description: 'Expected field type' })
  expectedType?: FormFieldType;

  @ApiProperty({ description: 'Whether field was found' })
  found!: boolean;

  @ApiProperty({ description: 'Field selector used' })
  selector?: string;
}

export class FormValidationResponseDto {
  @ApiProperty({ description: 'Whether form filling was successful' })
  success!: boolean;

  @ApiProperty({ description: 'Overall operation message' })
  message!: string;

  @ApiProperty({ description: 'Form selector that was targeted' })
  formSelector?: string;

  @ApiProperty({ description: 'Number of fields processed' })
  fieldsProcessed!: number;

  @ApiProperty({ description: 'Number of fields successfully filled' })
  fieldsSuccessful!: number;

  @ApiProperty({ description: 'Number of fields that failed' })
  fieldsFailed!: number;

  @ApiProperty({
    description: 'Validation results for each field',
    type: [FormValidationResult],
  })
  fieldResults!: FormValidationResult[];

  @ApiProperty({ description: 'Operation timestamp' })
  timestamp!: Date;

  @ApiProperty({ description: 'Operation duration in milliseconds' })
  durationMs!: number;

  @ApiProperty({ description: 'Form information discovered' })
  formInfo?: {
    action?: string;
    method?: string;
    encoding?: string;
    totalFields: number;
    requiredFields: number;
    fieldTypes: Record<string, number>;
  };

  @ApiProperty({ description: 'Screenshot after form operations (base64)' })
  screenshot?: string;

  @ApiProperty({ description: 'Error details if operation failed' })
  error?: {
    code: string;
    message: string;
    failedField?: string;
    details?: any;
  };

  @ApiProperty({ description: 'Warnings encountered during operation' })
  warnings?: string[];
}

// Type aliases for backward compatibility
export type BrowserFormDto = FillFormDto;
