import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FormFieldType } from './form-action.dto';

/**
 * Detected form field information
 */
export class DetectedFormFieldDto {
  @ApiProperty({
    description: 'Field selector that can be used for automation',
    example: '#email'
  })
  selector: string;

  @ApiProperty({
    description: 'Field type detected',
    enum: FormFieldType,
    example: FormFieldType.EMAIL
  })
  type: FormFieldType;

  @ApiPropertyOptional({
    description: 'Field label or placeholder text',
    example: 'Email Address'
  })
  label?: string;

  @ApiPropertyOptional({
    description: 'Current field value',
    example: ''
  })
  value?: string;

  @ApiPropertyOptional({
    description: 'Whether field is required',
    example: true
  })
  required?: boolean;

  @ApiPropertyOptional({
    description: 'Field validation pattern if detected',
    example: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
  })
  validationPattern?: string;

  @ApiPropertyOptional({
    description: 'Available options for select/radio fields',
    example: ['Option 1', 'Option 2', 'Option 3']
  })
  options?: string[];

  @ApiPropertyOptional({
    description: 'Field position and dimensions',
    example: { x: 100, y: 200, width: 300, height: 40 }
  })
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * Detected form information
 */
export class DetectedFormDto {
  @ApiProperty({
    description: 'Form selector that can be used for automation',
    example: '#loginForm'
  })
  selector: string;

  @ApiPropertyOptional({
    description: 'Form action URL',
    example: '/api/login'
  })
  action?: string;

  @ApiPropertyOptional({
    description: 'Form method (GET, POST, etc.)',
    example: 'POST'
  })
  method?: string;

  @ApiPropertyOptional({
    description: 'Form encoding type',
    example: 'application/x-www-form-urlencoded'
  })
  enctype?: string;

  @ApiProperty({
    description: 'Detected form fields',
    type: [DetectedFormFieldDto]
  })
  fields: DetectedFormFieldDto[];

  @ApiPropertyOptional({
    description: 'Submit button information',
    example: { selector: '#submitBtn', text: 'Login' }
  })
  submitButton?: {
    selector: string;
    text: string;
  };

  @ApiPropertyOptional({
    description: 'Form position and dimensions',
    example: { x: 50, y: 100, width: 400, height: 300 }
  })
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * Form detection response
 */
export class FormDetectionResponseDto {
  @ApiProperty({
    description: 'Whether forms were detected',
    example: true
  })
  formsDetected: boolean;

  @ApiProperty({
    description: 'Number of forms found',
    example: 2
  })
  formCount: number;

  @ApiProperty({
    description: 'List of detected forms',
    type: [DetectedFormDto]
  })
  forms: DetectedFormDto[];

  @ApiProperty({
    description: 'Processing time in milliseconds',
    example: 1250
  })
  processingTimeMs: number;

  @ApiPropertyOptional({
    description: 'Screenshot of the page with forms highlighted',
    example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
  })
  screenshot?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata about the detection',
    example: { url: 'https://example.com/contact', userAgent: 'Mozilla/5.0...' }
  })
  metadata?: Record<string, any>;
}

/**
 * Field validation result
 */
export class FieldValidationResultDto {
  @ApiProperty({
    description: 'Field selector',
    example: '#email'
  })
  selector: string;

  @ApiProperty({
    description: 'Whether field validation passed',
    example: true
  })
  valid: boolean;

  @ApiPropertyOptional({
    description: 'Field value that was validated',
    example: 'user@example.com'
  })
  value?: string;

  @ApiPropertyOptional({
    description: 'Validation error message if failed',
    example: 'Please enter a valid email address'
  })
  errorMessage?: string;

  @ApiPropertyOptional({
    description: 'Applied validation rules',
    example: ['required', 'email']
  })
  appliedRules?: string[];
}

/**
 * Form filling result
 */
export class FormFillingResultDto {
  @ApiProperty({
    description: 'Field selector',
    example: '#firstName'
  })
  selector: string;

  @ApiProperty({
    description: 'Whether field was successfully filled',
    example: true
  })
  filled: boolean;

  @ApiPropertyOptional({
    description: 'Value that was filled',
    example: 'John'
  })
  value?: string;

  @ApiPropertyOptional({
    description: 'Error message if filling failed',
    example: 'Field not found or not writable'
  })
  errorMessage?: string;

  @ApiProperty({
    description: 'Time taken to fill field in milliseconds',
    example: 150
  })
  fillTimeMs: number;
}

/**
 * Form automation response
 */
export class FormAutomationResponseDto {
  @ApiProperty({
    description: 'Whether the automation was successful',
    example: true
  })
  success: boolean;

  @ApiProperty({
    description: 'Action that was performed',
    example: 'fill_form'
  })
  action: string;

  @ApiPropertyOptional({
    description: 'Form selector that was used',
    example: '#contactForm'
  })
  formSelector?: string;

  @ApiPropertyOptional({
    description: 'Results of field operations',
    type: [FormFillingResultDto]
  })
  fieldResults?: FormFillingResultDto[];

  @ApiPropertyOptional({
    description: 'Form validation results',
    type: [FieldValidationResultDto]
  })
  validationResults?: FieldValidationResultDto[];

  @ApiProperty({
    description: 'Total processing time in milliseconds',
    example: 2500
  })
  processingTimeMs: number;

  @ApiPropertyOptional({
    description: 'Screenshot before automation',
    example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
  })
  screenshotBefore?: string;

  @ApiPropertyOptional({
    description: 'Screenshot after automation',
    example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
  })
  screenshotAfter?: string;

  @ApiPropertyOptional({
    description: 'Error message if automation failed',
    example: 'Form not found on page'
  })
  errorMessage?: string;

  @ApiPropertyOptional({
    description: 'Additional result metadata',
    example: {
      submissionUrl: 'https://example.com/submit',
      redirectUrl: 'https://example.com/success'
    }
  })
  metadata?: Record<string, any>;
}

/**
 * Form submission response
 */
export class FormSubmissionResponseDto {
  @ApiProperty({
    description: 'Whether form submission was successful',
    example: true
  })
  submitted: boolean;

  @ApiPropertyOptional({
    description: 'HTTP status code of submission',
    example: 200
  })
  statusCode?: number;

  @ApiPropertyOptional({
    description: 'URL after form submission',
    example: 'https://example.com/success'
  })
  redirectUrl?: string;

  @ApiPropertyOptional({
    description: 'Response text or HTML content',
    example: 'Thank you for your submission!'
  })
  responseText?: string;

  @ApiProperty({
    description: 'Time taken for submission in milliseconds',
    example: 1800
  })
  submissionTimeMs: number;

  @ApiPropertyOptional({
    description: 'Screenshot after submission',
    example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
  })
  screenshot?: string;

  @ApiPropertyOptional({
    description: 'Form validation errors if submission failed',
    type: [FieldValidationResultDto]
  })
  validationErrors?: FieldValidationResultDto[];

  @ApiPropertyOptional({
    description: 'Error message if submission failed',
    example: 'Network error during submission'
  })
  errorMessage?: string;
}

/**
 * Auto-complete profile application response
 */
export class FormAutoCompleteResponseDto {
  @ApiProperty({
    description: 'Whether auto-complete was successful',
    example: true
  })
  success: boolean;

  @ApiProperty({
    description: 'Number of fields successfully filled',
    example: 5
  })
  fieldsCompleted: number;

  @ApiProperty({
    description: 'Total number of fields processed',
    example: 6
  })
  totalFields: number;

  @ApiProperty({
    description: 'Detailed results for each field',
    type: [FormFillingResultDto]
  })
  fieldResults: FormFillingResultDto[];

  @ApiProperty({
    description: 'Time taken for auto-completion in milliseconds',
    example: 3200
  })
  completionTimeMs: number;

  @ApiPropertyOptional({
    description: 'Fields that could not be auto-completed',
    example: ['#captcha', '#customField']
  })
  skippedFields?: string[];

  @ApiPropertyOptional({
    description: 'Screenshot showing completed form',
    example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
  })
  screenshot?: string;
}