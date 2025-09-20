import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';import { IsString, IsObject, IsOptional, IsBoolean, IsArray, IsEnum, IsNumber, ValidateNested } from 'class-validator';import { Type } from 'class-transformer';/*** Form field types supported by the automation system
 */
export enum FormFieldType {
  TEXT = 'text',EMAIL = 'email',PASSWORD = 'password',NUMBER = 'number',TEXTAREA = 'textarea',SELECT = 'select',CHECKBOX = 'checkbox',RADIO = 'radio',FILE = 'file',DATE = 'date',TIME = 'time',DATETIME = 'datetime-local',URL = 'url',TEL = 'tel',SEARCH = 'search',RANGE = 'range',COLOR = 'color',HIDDEN = 'hidden'}/**
 * Form action types for automation operations
 */
export enum FormActionType {
  DETECT_FORM = 'detect_form',FILL_FORM = 'fill_form',SUBMIT_FORM = 'submit_form',VALIDATE_FORM = 'validate_form',CLEAR_FORM = 'clear_form',AUTO_COMPLETE = 'auto_complete',CAPTURE_FORM_DATA = 'capture_form_data',WAIT_FOR_FORM = 'wait_for_form'}/**
 * Form field definition for automation
 */
export class FormFieldDto {
  @ApiProperty({
    description: 'Field selector (CSS, XPath, or name)',example: '#email, input[name="email"], //input[@type="email"]"})
  @IsString()
  selector: string;

  @ApiProperty({
    description: 'Field type',enum: FormFieldType,example: FormFieldType.EMAIL
  })
  @IsEnum(FormFieldType)
  type: FormFieldType;

  @ApiPropertyOptional({
    description: 'Value to fill in the field',example: 'user@example.com'})@IsOptional()
  @IsString()
  value?: string;

  @ApiPropertyOptional({
    description: 'Field label for identification',example: 'Email Address'})@IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({
    description: 'Whether field is required',example: true,default: false
  })
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiPropertyOptional({
    description: 'Field validation pattern (regex)',example: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'})@IsOptional()
  @IsString()
  validationPattern?: string;

  @ApiPropertyOptional({
    description: 'Options for select/radio fields',example: ['option1', 'option2', 'option3']})@IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];
}

/**
 * Form automation configuration
 */
export class FormAutomationConfigDto {
  @ApiPropertyOptional({
    description: 'Timeout for form operations in milliseconds',example: 5000,default: 10000
  })
  @IsOptional()
  @IsNumber()
  timeout?: number;

  @ApiPropertyOptional({
    description: 'Whether to take screenshots during automation',example: true,default: false
  })
  @IsOptional()
  @IsBoolean()
  captureScreenshots?: boolean;

  @ApiPropertyOptional({
    description: 'Delay between field fills in milliseconds',example: 500,default: 100
  })
  @IsOptional()
  @IsNumber()
  fillDelay?: number;

  @ApiPropertyOptional({
    description: 'Whether to validate form before submission',example: true,default: true
  })
  @IsOptional()
  @IsBoolean()
  validateBeforeSubmit?: boolean;

  @ApiPropertyOptional({
    description: 'Maximum retry attempts for failed operations',example: 3,default: 1
  })
  @IsOptional()
  @IsNumber()
  maxRetries?: number;

  @ApiPropertyOptional({
    description: 'Whether to wait for form submission to complete',example: true,default: true
  })
  @IsOptional()
  @IsBoolean()
  waitForSubmission?: boolean;
}

/**
 * Base form automation action DTO
 */
export class FormActionDto {
  @ApiProperty({
    description: 'Type of form action to perform',enum: FormActionType,example: FormActionType.FILL_FORM
  })
  @IsEnum(FormActionType)
  action: FormActionType;

  @ApiPropertyOptional({
    description: 'Browser session ID for the automation',example: 'session_123456789'})@IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({
    description: 'Form selector (CSS, XPath, or ID)',example: '#loginForm, form[name="login"], //form[@id="registration"]"})
  @IsOptional()
  @IsString()
  formSelector?: string;

  @ApiPropertyOptional({
    description: 'Form fields to interact with',type: [FormFieldDto]})
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FormFieldDto)
  fields?: FormFieldDto[];

  @ApiPropertyOptional({
    description: 'Form automation configuration',type: FormAutomationConfigDto})
  @IsOptional()
  @ValidateNested()
  @Type(() => FormAutomationConfigDto)
  config?: FormAutomationConfigDto;

  @ApiPropertyOptional({
    description: 'Additional metadata for the operation',example: { sessionId: 'abc123', userId: 'user456' }})@IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

/**
 * Form detection action DTO
 */
export class FormDetectionDto extends FormActionDto {
  @ApiProperty({
    description: 'Action type for form detection',enum: [FormActionType.DETECT_FORM],example: FormActionType.DETECT_FORM
  })
  @IsEnum([FormActionType.DETECT_FORM])
  action: FormActionType.DETECT_FORM;

  @ApiPropertyOptional({
    description: 'Page URL to detect forms on',example: 'https://example.com/contact'})@IsOptional()
  @IsString()
  url?: string;

  @ApiPropertyOptional({
    description: 'Whether to include field analysis',example: true,default: true
  })
  @IsOptional()
  @IsBoolean()
  analyzeFields?: boolean;
}

/**
 * Form filling action DTO
 */
export class FormFillingDto extends FormActionDto {
  @ApiProperty({
    description: 'Action type for form filling',enum: [FormActionType.FILL_FORM],example: FormActionType.FILL_FORM
  })
  @IsEnum([FormActionType.FILL_FORM])
  action: FormActionType.FILL_FORM;

  @ApiProperty({
    description: 'Form fields to fill',type: [FormFieldDto]})
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FormFieldDto)
  fields: FormFieldDto[];

  @ApiPropertyOptional({
    description: 'Whether to submit form after filling',example: false,default: false
  })
  @IsOptional()
  @IsBoolean()
  submitAfterFill?: boolean;
}

/**
 * Form submission action DTO
 */
export class FormSubmissionDto extends FormActionDto {
  @ApiProperty({
    description: 'Action type for form submission',enum: [FormActionType.SUBMIT_FORM],example: FormActionType.SUBMIT_FORM
  })
  @IsEnum([FormActionType.SUBMIT_FORM])
  action: FormActionType.SUBMIT_FORM;

  @ApiPropertyOptional({
    description: 'Submit button selector',example: 'button[type="submit"], input[type="submit"], #submitBtn"})
  @IsOptional()
  @IsString()
  submitSelector?: string;

  @ApiPropertyOptional({
    description: 'Expected redirect URL after submission',example: 'https://example.com/success'})@IsOptional()
  @IsString()
  expectedRedirect?: string;
}

/**
 * Form validation action DTO
 */
export class FormValidationDto extends FormActionDto {
  @ApiProperty({
    description: 'Action type for form validation',enum: [FormActionType.VALIDATE_FORM],example: FormActionType.VALIDATE_FORM
  })
  @IsEnum([FormActionType.VALIDATE_FORM])
  action: FormActionType.VALIDATE_FORM;

  @ApiPropertyOptional({
    description: 'Custom validation rules',example: { 'email': '^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$' }})@IsOptional()
  @IsObject()
  validationRules?: Record<string, string>;
}

/**
 * Form auto-complete action DTO
 */
export class FormAutoCompleteDto extends FormActionDto {
  @ApiProperty({
    description: 'Action type for auto-complete',enum: [FormActionType.AUTO_COMPLETE],example: FormActionType.AUTO_COMPLETE
  })
  @IsEnum([FormActionType.AUTO_COMPLETE])
  action: FormActionType.AUTO_COMPLETE;

  @ApiProperty({
    description: 'User profile data for auto-completion',example: {name: 'John Doe',email: 'john@example.com',phone: '+1-555-123-4567',address: '123 Main St, City, State 12345'}})
  @IsObject()
  profileData: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Field mapping for profile data',example: {'firstName': 'name.first','lastName': 'name.last','emailAddress': 'email','phoneNumber': 'phone'
    }
  })
  @IsOptional()
  @IsObject()
  fieldMapping?: Record<string, string>;
}