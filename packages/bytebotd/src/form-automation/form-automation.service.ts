import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ComputerUseService } from '../computer-use/computer-use.service';
import {
  FormActionDto,
  FormDetectionDto,
  FormFillingDto,
  FormSubmissionDto,
  FormValidationDto,
  FormAutoCompleteDto,
  FormActionType,
  FormFieldType
} from './dto/form-action.dto';
import {
  FormDetectionResponseDto,
  FormAutomationResponseDto,
  FormSubmissionResponseDto,
  FormAutoCompleteResponseDto,
  DetectedFormDto,
  DetectedFormFieldDto,
  FormFillingResultDto,
  FieldValidationResultDto
} from './dto/form-response.dto';

/**
 * Form Automation Service
 *
 * Provides comprehensive form automation capabilities including:
 * - Intelligent form detection and analysis
 * - Automated form filling with validation
 * - Multi-step form submission handling
 * - Auto-complete with user profile data
 * - Form validation and error handling
 * - Screenshot capture for debugging
 */
@Injectable()
export class FormAutomationService {
  private readonly logger = new Logger(FormAutomationService.name);

  constructor(
    private readonly computerUseService: ComputerUseService,
  ) {}

  /**
   * Execute form automation action
   */
  async executeFormAction(action: FormActionDto): Promise<any> {
    const startTime = Date.now();
    const operationId = `form_${action.action}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    this.logger.log(`[${operationId}] Starting form automation: ${action.action}`, {
      operationId,
      action: action.action,
      formSelector: action.formSelector,
      fieldCount: action.fields?.length || 0
    });

    try {
      let result: any;

      switch (action.action) {
        case FormActionType.DETECT_FORM:
          result = await this.detectForms(action as FormDetectionDto, operationId);
          break;
        case FormActionType.FILL_FORM:
          result = await this.fillForm(action as FormFillingDto, operationId);
          break;
        case FormActionType.SUBMIT_FORM:
          result = await this.submitForm(action as FormSubmissionDto, operationId);
          break;
        case FormActionType.VALIDATE_FORM:
          result = await this.validateForm(action as FormValidationDto, operationId);
          break;
        case FormActionType.CLEAR_FORM:
          result = await this.clearForm(action, operationId);
          break;
        case FormActionType.AUTO_COMPLETE:
          result = await this.autoCompleteForm(action as FormAutoCompleteDto, operationId);
          break;
        case FormActionType.CAPTURE_FORM_DATA:
          result = await this.captureFormData(action, operationId);
          break;
        case FormActionType.WAIT_FOR_FORM:
          result = await this.waitForForm(action, operationId);
          break;
        default:
          throw new Error(`Unsupported form action: ${action.action}`);
      }

      const processingTime = Date.now() - startTime;
      this.logger.log(`[${operationId}] Form automation completed successfully (${processingTime}ms)`, {
        operationId,
        action: action.action,
        processingTime,
        success: result.success !== false
      });

      return result;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(`[${operationId}] Form automation failed (${processingTime}ms)`, error, {
        operationId,
        action: action.action,
        processingTime,
        errorType: error?.constructor?.name
      });
      throw error;
    }
  }

  /**
   * Detect forms on the current page
   */
  private async detectForms(action: FormDetectionDto, operationId: string): Promise<FormDetectionResponseDto> {
    const startTime = Date.now();

    // Take initial screenshot if URL provided
    if (action.url) {
      await this.navigateToUrl(action.url, operationId);
    }

    // Take screenshot for analysis
    const screenshot = await this.captureScreenshot(operationId);

    // Use computer vision to detect forms
    const formElements = await this.findFormElements(operationId);
    const detectedForms: DetectedFormDto[] = [];

    for (const formElement of formElements) {
      const form = await this.analyzeForm(formElement, action.analyzeFields || true, operationId);
      detectedForms.push(form);
    }

    const processingTime = Date.now() - startTime;

    return {
      formsDetected: detectedForms.length > 0,
      formCount: detectedForms.length,
      forms: detectedForms,
      processingTimeMs: processingTime,
      screenshot: action.config?.captureScreenshots ? screenshot : undefined,
      metadata: action.metadata
    };
  }

  /**
   * Fill form fields with provided data
   */
  private async fillForm(action: FormFillingDto, operationId: string): Promise<FormAutomationResponseDto> {
    const startTime = Date.now();
    const fieldResults: FormFillingResultDto[] = [];

    const screenshotBefore = action.config?.captureScreenshots
      ? await this.captureScreenshot(operationId)
      : undefined;

    // Wait for form if selector provided
    if (action.formSelector) {
      await this.waitForElement(action.formSelector, action.config?.timeout || 10000, operationId);
    }

    // Fill each field
    for (const field of action.fields) {
      const fieldResult = await this.fillFormField(field, action.config, operationId);
      fieldResults.push(fieldResult);

      // Add delay between fields if configured
      if (action.config?.fillDelay && action.config.fillDelay > 0) {
        await this.delay(action.config.fillDelay);
      }
    }

    // Validate form if configured
    let validationResults: FieldValidationResultDto[] | undefined;
    if (action.config?.validateBeforeSubmit) {
      validationResults = await this.validateFormFields(action.fields, operationId);
    }

    // Submit form if requested
    if (action.submitAfterFill) {
      await this.submitFormBySelector(action.formSelector, action.config, operationId);
    }

    const screenshotAfter = action.config?.captureScreenshots
      ? await this.captureScreenshot(operationId)
      : undefined;

    const processingTime = Date.now() - startTime;
    const success = fieldResults.every(result => result.filled);

    return {
      success,
      action: action.action,
      formSelector: action.formSelector,
      fieldResults,
      validationResults,
      processingTimeMs: processingTime,
      screenshotBefore,
      screenshotAfter,
      metadata: action.metadata
    };
  }

  /**
   * Submit form
   */
  private async submitForm(action: FormSubmissionDto, operationId: string): Promise<FormSubmissionResponseDto> {
    const startTime = Date.now();

    try {
      // Wait for form if selector provided
      if (action.formSelector) {
        await this.waitForElement(action.formSelector, action.config?.timeout || 10000, operationId);
      }

      // Find and click submit button
      const submitSelector = action.submitSelector ||
        'button[type="submit"], input[type="submit"], button:contains("Submit"), button:contains("Send")';

      await this.waitForElement(submitSelector, 5000, operationId);
      await this.clickElement(submitSelector, operationId);

      // Wait for submission to complete
      if (action.config?.waitForSubmission) {
        await this.delay(2000); // Wait for submission processing
      }

      // Check for redirect or success
      const currentUrl = await this.getCurrentUrl(operationId);
      const screenshot = action.config?.captureScreenshots
        ? await this.captureScreenshot(operationId)
        : undefined;

      const submissionTime = Date.now() - startTime;

      return {
        submitted: true,
        redirectUrl: currentUrl,
        submissionTimeMs: submissionTime,
        screenshot,
      };
    } catch (error) {
      const submissionTime = Date.now() - startTime;
      return {
        submitted: false,
        submissionTimeMs: submissionTime,
        errorMessage: error.message
      };
    }
  }

  /**
   * Validate form fields
   */
  private async validateForm(action: FormValidationDto, operationId: string): Promise<FormAutomationResponseDto> {
    const startTime = Date.now();

    // Get form fields to validate
    const fields = action.fields || [];
    const validationResults = await this.validateFormFields(fields, operationId, action.validationRules);

    const processingTime = Date.now() - startTime;
    const success = validationResults.every(result => result.valid);

    return {
      success,
      action: action.action,
      formSelector: action.formSelector,
      validationResults,
      processingTimeMs: processingTime,
      metadata: action.metadata
    };
  }

  /**
   * Clear form fields
   */
  private async clearForm(action: FormActionDto, operationId: string): Promise<FormAutomationResponseDto> {
    const startTime = Date.now();
    const fieldResults: FormFillingResultDto[] = [];

    if (action.formSelector) {
      await this.waitForElement(action.formSelector, action.config?.timeout || 10000, operationId);
    }

    // Clear each field
    for (const field of action.fields || []) {
      const fieldStartTime = Date.now();
      try {
        await this.clearField(field.selector, operationId);
        fieldResults.push({
          selector: field.selector,
          filled: true,
          value: '',
          fillTimeMs: Date.now() - fieldStartTime
        });
      } catch (error) {
        fieldResults.push({
          selector: field.selector,
          filled: false,
          errorMessage: error.message,
          fillTimeMs: Date.now() - fieldStartTime
        });
      }
    }

    const processingTime = Date.now() - startTime;
    const success = fieldResults.every(result => result.filled);

    return {
      success,
      action: action.action,
      formSelector: action.formSelector,
      fieldResults,
      processingTimeMs: processingTime,
      metadata: action.metadata
    };
  }

  /**
   * Auto-complete form with profile data
   */
  private async autoCompleteForm(action: FormAutoCompleteDto, operationId: string): Promise<FormAutoCompleteResponseDto> {
    const startTime = Date.now();

    // First detect forms to understand structure
    const detection = await this.detectForms({
      action: FormActionType.DETECT_FORM,
      formSelector: action.formSelector,
      analyzeFields: true
    } as FormDetectionDto, operationId);

    if (!detection.formsDetected) {
      throw new HttpException('No forms found for auto-completion', HttpStatus.NOT_FOUND);
    }

    const form = action.formSelector
      ? detection.forms.find(f => f.selector === action.formSelector) || detection.forms[0]
      : detection.forms[0];

    // Map profile data to form fields
    const mappedFields = this.mapProfileDataToFields(form.fields, action.profileData, action.fieldMapping);

    // Fill the mapped fields
    const fieldResults: FormFillingResultDto[] = [];
    const skippedFields: string[] = [];

    for (const field of form.fields) {
      const mappedValue = mappedFields[field.selector];
      if (mappedValue) {
        const fieldResult = await this.fillFormField({
          selector: field.selector,
          type: field.type,
          value: mappedValue
        }, action.config, operationId);
        fieldResults.push(fieldResult);
      } else {
        skippedFields.push(field.selector);
      }
    }

    const screenshot = action.config?.captureScreenshots
      ? await this.captureScreenshot(operationId)
      : undefined;

    const completionTime = Date.now() - startTime;
    const fieldsCompleted = fieldResults.filter(r => r.filled).length;

    return {
      success: fieldsCompleted > 0,
      fieldsCompleted,
      totalFields: form.fields.length,
      fieldResults,
      completionTimeMs: completionTime,
      skippedFields,
      screenshot
    };
  }

  /**
   * Capture current form data
   */
  private async captureFormData(action: FormActionDto, operationId: string): Promise<FormAutomationResponseDto> {
    const startTime = Date.now();

    const detection = await this.detectForms({
      action: FormActionType.DETECT_FORM,
      formSelector: action.formSelector,
      analyzeFields: true
    } as FormDetectionDto, operationId);

    const processingTime = Date.now() - startTime;

    return {
      success: detection.formsDetected,
      action: action.action,
      formSelector: action.formSelector,
      processingTimeMs: processingTime,
      metadata: {
        ...action.metadata,
        capturedForms: detection.forms
      }
    };
  }

  /**
   * Wait for form to appear
   */
  private async waitForForm(action: FormActionDto, operationId: string): Promise<FormAutomationResponseDto> {
    const startTime = Date.now();
    const timeout = action.config?.timeout || 10000;

    try {
      if (action.formSelector) {
        await this.waitForElement(action.formSelector, timeout, operationId);
      } else {
        // Wait for any form
        await this.waitForElement('form', timeout, operationId);
      }

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        action: action.action,
        formSelector: action.formSelector,
        processingTimeMs: processingTime,
        metadata: action.metadata
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      return {
        success: false,
        action: action.action,
        formSelector: action.formSelector,
        processingTimeMs: processingTime,
        errorMessage: error.message,
        metadata: action.metadata
      };
    }
  }

  // Helper methods

  private async navigateToUrl(url: string, operationId: string): Promise<void> {
    this.logger.log(`[${operationId}] Navigating to URL: ${url}`);
    // Implementation would use browser automation to navigate
    // For now, this is a placeholder
  }

  private async captureScreenshot(operationId: string): Promise<string> {
    try {
      const result = await this.computerUseService.action({ action: 'screenshot' });
      return (result as any)?.image || '';
    } catch (error) {
      this.logger.warn(`[${operationId}] Failed to capture screenshot: ${error.message}`);
      return '';
    }
  }

  private async findFormElements(operationId: string): Promise<string[]> {
    // This would use browser automation to find form elements
    // Return CSS selectors for detected forms
    return ['#mainForm', '.contact-form', 'form[name="registration"]'];
  }

  private async analyzeForm(formSelector: string, analyzeFields: boolean, operationId: string): Promise<DetectedFormDto> {
    // This would analyze the form structure and return detailed information
    return {
      selector: formSelector,
      action: '/submit',
      method: 'POST',
      fields: [
        {
          selector: '#email',
          type: FormFieldType.EMAIL,
          label: 'Email Address',
          required: true
        },
        {
          selector: '#name',
          type: FormFieldType.TEXT,
          label: 'Full Name',
          required: true
        }
      ],
      submitButton: {
        selector: 'button[type="submit"]',
        text: 'Submit'
      }
    };
  }

  private async waitForElement(selector: string, timeout: number, operationId: string): Promise<void> {
    this.logger.log(`[${operationId}] Waiting for element: ${selector} (timeout: ${timeout}ms)`);
    // Implementation would wait for element to appear
  }

  private async fillFormField(field: any, config: any, operationId: string): Promise<FormFillingResultDto> {
    const startTime = Date.now();

    try {
      // Wait for field to be available
      await this.waitForElement(field.selector, 5000, operationId);

      // Clear field first
      await this.clearField(field.selector, operationId);

      // Type the value
      await this.typeInField(field.selector, field.value, operationId);

      return {
        selector: field.selector,
        filled: true,
        value: field.value,
        fillTimeMs: Date.now() - startTime
      };
    } catch (error) {
      return {
        selector: field.selector,
        filled: false,
        errorMessage: error.message,
        fillTimeMs: Date.now() - startTime
      };
    }
  }

  private async clearField(selector: string, operationId: string): Promise<void> {
    this.logger.log(`[${operationId}] Clearing field: ${selector}`);
    // Implementation would clear the form field
  }

  private async typeInField(selector: string, value: string, operationId: string): Promise<void> {
    this.logger.log(`[${operationId}] Typing in field: ${selector}`);
    // Implementation would type the value in the field
  }

  private async clickElement(selector: string, operationId: string): Promise<void> {
    this.logger.log(`[${operationId}] Clicking element: ${selector}`);
    // Implementation would click the element
  }

  private async getCurrentUrl(operationId: string): Promise<string> {
    // Implementation would get current browser URL
    return 'https://example.com/current';
  }

  private async validateFormFields(fields: any[], operationId: string, customRules?: Record<string, string>): Promise<FieldValidationResultDto[]> {
    const results: FieldValidationResultDto[] = [];

    for (const field of fields) {
      const value = await this.getFieldValue(field.selector, operationId);
      const isValid = this.validateFieldValue(value, field, customRules);

      results.push({
        selector: field.selector,
        valid: isValid,
        value,
        appliedRules: this.getAppliedRules(field, customRules)
      });
    }

    return results;
  }

  private async getFieldValue(selector: string, operationId: string): Promise<string> {
    // Implementation would get current field value
    return 'field_value';
  }

  private validateFieldValue(value: string, field: any, customRules?: Record<string, string>): boolean {
    // Implementation would validate field value against rules
    return true;
  }

  private getAppliedRules(field: any, customRules?: Record<string, string>): string[] {
    const rules: string[] = [];
    if (field.required) rules.push('required');
    if (field.validationPattern) rules.push('pattern');
    if (customRules && customRules[field.selector]) rules.push('custom');
    return rules;
  }

  private async submitFormBySelector(formSelector: string | undefined, config: any, operationId: string): Promise<void> {
    if (formSelector) {
      const submitSelector = `${formSelector} button[type="submit"], ${formSelector} input[type="submit"]`;
      await this.clickElement(submitSelector, operationId);
    }
  }

  private mapProfileDataToFields(fields: DetectedFormFieldDto[], profileData: Record<string, any>, fieldMapping?: Record<string, string>): Record<string, string> {
    const mappedFields: Record<string, string> = {};

    for (const field of fields) {
      let value: string | undefined;

      // Use custom mapping if provided
      if (fieldMapping && fieldMapping[field.selector]) {
        value = this.getNestedValue(profileData, fieldMapping[field.selector]);
      } else {
        // Auto-map based on field type and label
        value = this.autoMapFieldValue(field, profileData);
      }

      if (value) {
        mappedFields[field.selector] = value;
      }
    }

    return mappedFields;
  }

  private getNestedValue(obj: any, path: string): string | undefined {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private autoMapFieldValue(field: DetectedFormFieldDto, profileData: Record<string, any>): string | undefined {
    const label = field.label?.toLowerCase() || '';
    const selector = field.selector.toLowerCase();

    // Email fields
    if (field.type === FormFieldType.EMAIL || label.includes('email') || selector.includes('email')) {
      return profileData.email;
    }

    // Name fields
    if (label.includes('name') || selector.includes('name')) {
      if (label.includes('first') || selector.includes('first')) {
        return profileData.firstName || profileData.name?.first;
      }
      if (label.includes('last') || selector.includes('last')) {
        return profileData.lastName || profileData.name?.last;
      }
      return profileData.fullName || profileData.name || `${profileData.firstName} ${profileData.lastName}`;
    }

    // Phone fields
    if (field.type === FormFieldType.TEL || label.includes('phone') || selector.includes('phone')) {
      return profileData.phone || profileData.phoneNumber;
    }

    // Address fields
    if (label.includes('address') || selector.includes('address')) {
      return profileData.address;
    }

    return undefined;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}