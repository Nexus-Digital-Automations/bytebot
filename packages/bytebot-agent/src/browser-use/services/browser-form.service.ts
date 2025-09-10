/**
 * Browser Form Service
 *
 * Specialized service for form automation including intelligent form filling,
 * field validation, form discovery, and submission handling. Provides enterprise-grade
 * form automation capabilities with comprehensive error handling and validation.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  FillFormDto,
  SubmitFormDto,
  FormValidationResponseDto,
  FormField,
  FormFieldType,
  FormSubmissionMethod,
} from '../dto/browser-form.dto';
import { BrowserUseService } from '../browser-use.service';
import {
  BrowserDomService,
  PageElement,
  PageState,
} from './browser-dom.service';
import { BrowserSessionService } from './browser-session.service';

export interface FormInfo {
  formIndex: number;
  selector: string;
  action?: string;
  method?: string;
  encoding?: string;
  fields: FormFieldInfo[];
  submitButtons: PageElement[];
  totalFields: number;
  requiredFields: number;
  fieldTypes: Record<string, number>;
}

export interface FormFieldInfo {
  element: PageElement;
  fieldType: FormFieldType;
  name: string;
  label?: string;
  placeholder?: string;
  required: boolean;
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
  };
  options?: string[]; // For select, radio, checkbox
}

export interface FieldFillResult {
  field: string;
  success: boolean;
  value: string;
  error?: string;
  elementIndex?: number;
  validationPassed: boolean;
}

@Injectable()
export class BrowserFormService {
  private readonly logger = new Logger(BrowserFormService.name);
  private readonly formsCache = new Map<
    string,
    { forms: FormInfo[]; timestamp: Date }
  >();
  private readonly cacheExpiryMs: number;
  private readonly defaultTimeout: number;

  constructor(
    private readonly browserUseService: BrowserUseService,
    private readonly domService: BrowserDomService,
    private readonly sessionService: BrowserSessionService,
    private readonly configService: ConfigService,
  ) {
    this.cacheExpiryMs = this.configService.get<number>(
      'BROWSER_FORM_CACHE_EXPIRY_MS',
      60000, // 1 minute
    );
    this.defaultTimeout = this.configService.get<number>(
      'BROWSER_DEFAULT_TIMEOUT_MS',
      30000,
    );
  }

  /**
   * Fill out a form with provided field data
   */
  async fillForm(
    sessionId: string,
    fillFormDto: FillFormDto,
  ): Promise<FormValidationResponseDto> {
    const timestamp = new Date();
    const startTime = Date.now();

    try {
      this.logger.debug(`Filling form in session: ${sessionId}`);

      // Validate session
      const session = await this.sessionService.getSession(sessionId);
      if (!session) {
        return {
          success: false,
          message: `Browser session ${sessionId} not found`,
          fieldsProcessed: 0,
          fieldsSuccessful: 0,
          fieldsFailed: 0,
          fieldResults: [],
          timestamp,
          durationMs: 0,
          error: {
            code: 'SESSION_NOT_FOUND',
            message: `Browser session ${sessionId} not found`,
          },
        };
      }

      // Get current page state
      const pageState = await this.domService.getPageState(sessionId, {
        includeElements: true,
        useCache: false,
      });

      if (!pageState) {
        return {
          success: false,
          message: 'Could not retrieve page state',
          fieldsProcessed: 0,
          fieldsSuccessful: 0,
          fieldsFailed: 0,
          fieldResults: [],
          timestamp,
          durationMs: Date.now() - startTime,
          error: {
            code: 'PAGE_STATE_ERROR',
            message: 'Could not retrieve current page state',
          },
        };
      }

      // Discover forms on the page
      const forms = await this.discoverForms(pageState);
      if (forms.length === 0) {
        return {
          success: false,
          message: 'No forms found on the current page',
          fieldsProcessed: 0,
          fieldsSuccessful: 0,
          fieldsFailed: 0,
          fieldResults: [],
          timestamp,
          durationMs: Date.now() - startTime,
          error: {
            code: 'NO_FORMS_FOUND',
            message: 'No forms found on the current page',
          },
        };
      }

      // Select target form
      const targetForm = this.selectTargetForm(forms, fillFormDto);
      if (!targetForm) {
        return {
          success: false,
          message: 'Target form not found',
          fieldsProcessed: 0,
          fieldsSuccessful: 0,
          fieldsFailed: 0,
          fieldResults: [],
          timestamp,
          durationMs: Date.now() - startTime,
          error: {
            code: 'TARGET_FORM_NOT_FOUND',
            message: 'Could not locate target form using provided selectors',
          },
        };
      }

      // Wait for dynamic content if needed
      if (fillFormDto.waitForDynamic) {
        await this.waitForDynamicContent(
          sessionId,
          fillFormDto.timeoutSeconds ?? 30,
        );
      }

      // Fill form fields
      const fieldResults = await this.fillFormFields(
        sessionId,
        targetForm,
        fillFormDto.fields,
        {
          clearFields: fillFormDto.clearFields ?? true,
          skipMissingFields: fillFormDto.skipMissingFields ?? false,
          fieldDelayMs: fillFormDto.fieldDelayMs ?? 100,
          validateFields: fillFormDto.validateFields ?? true,
        },
      );

      const successfulFields = fieldResults.filter((r) => r.success);
      const failedFields = fieldResults.filter((r) => !r.success);

      const durationMs = Date.now() - startTime;
      const success =
        failedFields.length === 0 || fillFormDto.skipMissingFields;

      this.logger.log(
        `Form filling completed: ${successfulFields.length}/${fieldResults.length} fields successful`,
      );

      return {
        success,
        message: success
          ? `Successfully filled ${successfulFields.length} of ${fieldResults.length} fields`
          : `Form filling failed: ${failedFields.length} fields failed`,
        formSelector: targetForm.selector,
        fieldsProcessed: fieldResults.length,
        fieldsSuccessful: successfulFields.length,
        fieldsFailed: failedFields.length,
        fieldResults: fieldResults.map((result) => ({
          field: result.field,
          valid: result.validationPassed,
          value: result.value,
          error: result.error,
          found: result.success,
          selector:
            result.elementIndex !== undefined
              ? targetForm.fields.find(
                  (f) => f.element.index === result.elementIndex,
                )?.element.selector
              : undefined,
        })),
        timestamp,
        durationMs,
        formInfo: {
          action: targetForm.action,
          method: targetForm.method,
          encoding: targetForm.encoding,
          totalFields: targetForm.totalFields,
          requiredFields: targetForm.requiredFields,
          fieldTypes: targetForm.fieldTypes,
        },
        error:
          !success && failedFields.length > 0
            ? {
                code: 'FIELD_FILL_ERRORS',
                message: `${failedFields.length} fields failed to fill`,
                failedField: failedFields[0]?.field,
              }
            : undefined,
      };
    } catch (error) {
      this.logger.error(`Form filling error: ${error.message}`, error.stack);

      return {
        success: false,
        message: `Form filling failed: ${error.message}`,
        fieldsProcessed: 0,
        fieldsSuccessful: 0,
        fieldsFailed: 0,
        fieldResults: [],
        timestamp,
        durationMs: Date.now() - startTime,
        error: {
          code: 'FORM_FILL_ERROR',
          message: error.message,
        },
      };
    }
  }

  /**
   * Submit a form using various methods
   */
  async submitForm(
    sessionId: string,
    submitDto: SubmitFormDto,
  ): Promise<FormValidationResponseDto> {
    const timestamp = new Date();
    const startTime = Date.now();

    try {
      this.logger.debug(`Submitting form in session: ${sessionId}`);

      // Pre-validation if enabled
      if (submitDto.preValidate) {
        const validation = await this.validateFormState(sessionId, submitDto);
        if (!validation.success) {
          return {
            ...validation,
            message: `Form validation failed before submission: ${validation.message}`,
          };
        }
      }

      let submitResult: { success: boolean; error?: string; result?: any };

      switch (submitDto.method ?? FormSubmissionMethod.CLICK_SUBMIT) {
        case FormSubmissionMethod.CLICK_SUBMIT:
          submitResult = await this.submitByButtonClick(sessionId, submitDto);
          break;

        case FormSubmissionMethod.PRESS_ENTER:
          submitResult = await this.submitByEnterKey(sessionId, submitDto);
          break;

        case FormSubmissionMethod.FORM_SUBMIT:
          submitResult = await this.submitByFormSubmit(sessionId, submitDto);
          break;

        default:
          throw new Error(`Unsupported submission method: ${submitDto.method}`);
      }

      if (!submitResult.success) {
        return {
          success: false,
          message: `Form submission failed: ${submitResult.error}`,
          fieldsProcessed: 0,
          fieldsSuccessful: 0,
          fieldsFailed: 1,
          fieldResults: [],
          timestamp,
          durationMs: Date.now() - startTime,
          error: {
            code: 'SUBMISSION_FAILED',
            message: submitResult.error ?? 'Form submission failed',
          },
        };
      }

      // Wait for navigation or specific elements after submission
      if (submitDto.waitForNavigation) {
        await this.waitForNavigationOrElement(sessionId, submitDto);
      }

      // Validate submission success
      const submissionValidation = await this.validateSubmissionResult(
        sessionId,
        submitDto,
      );

      const durationMs = Date.now() - startTime;

      this.logger.log(`Form submission completed successfully`);

      return {
        success: true,
        message: 'Form submitted successfully',
        fieldsProcessed: 1,
        fieldsSuccessful: 1,
        fieldsFailed: 0,
        fieldResults: [
          {
            field: 'form_submission',
            valid: true,
            value: 'submitted',
            found: true,
          },
        ],
        timestamp,
        durationMs,
        warnings: submissionValidation.warnings,
      };
    } catch (error) {
      this.logger.error(`Form submission error: ${error.message}`, error.stack);

      return {
        success: false,
        message: `Form submission failed: ${error.message}`,
        fieldsProcessed: 0,
        fieldsSuccessful: 0,
        fieldsFailed: 1,
        fieldResults: [],
        timestamp,
        durationMs: Date.now() - startTime,
        error: {
          code: 'SUBMISSION_ERROR',
          message: error.message,
        },
      };
    }
  }

  /**
   * Discover and analyze forms on the current page
   */
  async discoverForms(pageState: PageState): Promise<FormInfo[]> {
    const forms: FormInfo[] = [];

    // Use cached forms if available and recent
    const cached = this.formsCache.get(pageState.url);
    if (
      cached &&
      Date.now() - cached.timestamp.getTime() < this.cacheExpiryMs
    ) {
      return cached.forms;
    }

    // Analyze form elements from page state
    for (const form of pageState.forms) {
      const formInfo: FormInfo = {
        formIndex: form.index,
        selector: `form:nth-child(${form.index + 1})`,
        action: form.action,
        method: form.method ?? 'GET',
        encoding: 'application/x-www-form-urlencoded',
        fields: [],
        submitButtons: [],
        totalFields: 0,
        requiredFields: 0,
        fieldTypes: {},
      };

      // Analyze form fields
      for (const fieldElement of form.fields) {
        const fieldInfo = this.analyzeFormField(fieldElement);
        formInfo.fields.push(fieldInfo);

        // Count field types
        const fieldType = fieldInfo.fieldType;
        formInfo.fieldTypes[fieldType] =
          (formInfo.fieldTypes[fieldType] || 0) + 1;

        if (fieldInfo.required) {
          formInfo.requiredFields++;
        }
      }

      // Find submit buttons
      formInfo.submitButtons = pageState.buttons.filter(
        (button) =>
          button.attributes.type === 'submit' ||
          button.text?.toLowerCase().includes('submit') ||
          button.text?.toLowerCase().includes('send'),
      );

      formInfo.totalFields = formInfo.fields.length;
      forms.push(formInfo);
    }

    // Cache the results
    this.formsCache.set(pageState.url, {
      forms,
      timestamp: new Date(),
    });

    this.logger.debug(
      `Discovered ${forms.length} forms on page: ${pageState.url}`,
    );

    return forms;
  }

  /**
   * Private helper methods
   */
  private analyzeFormField(element: PageElement): FormFieldInfo {
    const tagName = element.tagName.toLowerCase();
    const type = element.type?.toLowerCase() ?? 'text';

    let fieldType: FormFieldType;
    switch (tagName) {
      case 'input':
        fieldType = this.mapInputTypeToFieldType(type);
        break;
      case 'textarea':
        fieldType = FormFieldType.TEXTAREA;
        break;
      case 'select':
        fieldType = FormFieldType.SELECT;
        break;
      default:
        fieldType = FormFieldType.TEXT;
    }

    const name =
      element.attributes.name || element.id || `field_${element.index}`;
    const label = this.extractFieldLabel(element);
    const placeholder = element.attributes.placeholder;
    const required = 'required' in element.attributes;

    return {
      element,
      fieldType,
      name,
      label,
      placeholder,
      required,
      validation: this.extractValidationRules(element),
      options: this.extractFieldOptions(element),
    };
  }

  private mapInputTypeToFieldType(inputType: string): FormFieldType {
    const typeMap: Record<string, FormFieldType> = {
      text: FormFieldType.TEXT,
      email: FormFieldType.EMAIL,
      password: FormFieldType.PASSWORD,
      number: FormFieldType.NUMBER,
      tel: FormFieldType.TEL,
      url: FormFieldType.URL,
      checkbox: FormFieldType.CHECKBOX,
      radio: FormFieldType.RADIO,
      file: FormFieldType.FILE,
      date: FormFieldType.DATE,
      time: FormFieldType.TIME,
      'datetime-local': FormFieldType.DATETIME_LOCAL,
      range: FormFieldType.RANGE,
      color: FormFieldType.COLOR,
    };

    return typeMap[inputType] || FormFieldType.TEXT;
  }

  private extractFieldLabel(element: PageElement): string | undefined {
    // Try to find associated label
    if (element.id) {
      // Look for label with for attribute
      // This would require DOM traversal - simplified for this implementation
      return element.attributes['aria-label'] || element.attributes.title;
    }

    return element.attributes['aria-label'] || element.attributes.title;
  }

  private extractValidationRules(element: PageElement): any {
    const validation: any = {};

    if (element.attributes.pattern) {
      validation.pattern = element.attributes.pattern;
    }

    if (element.attributes.minlength) {
      validation.minLength = parseInt(element.attributes.minlength, 10);
    }

    if (element.attributes.maxlength) {
      validation.maxLength = parseInt(element.attributes.maxlength, 10);
    }

    if (element.attributes.min) {
      validation.min = parseFloat(element.attributes.min);
    }

    if (element.attributes.max) {
      validation.max = parseFloat(element.attributes.max);
    }

    return Object.keys(validation).length > 0 ? validation : undefined;
  }

  private extractFieldOptions(element: PageElement): string[] | undefined {
    if (element.tagName.toLowerCase() === 'select') {
      // In a real implementation, you'd parse the option elements
      // This is simplified for the example
      return [];
    }

    return undefined;
  }

  private selectTargetForm(
    forms: FormInfo[],
    fillFormDto: FillFormDto,
  ): FormInfo | undefined {
    if (fillFormDto.formSelector) {
      return forms.find((form) =>
        form.selector.includes(fillFormDto.formSelector),
      );
    }

    if (fillFormDto.formXpath) {
      // XPath matching would require additional logic
      return forms[0];
    }

    // Default to first form
    return forms[0];
  }

  private async waitForDynamicContent(
    sessionId: string,
    timeoutSeconds: number,
  ): Promise<void> {
    // Wait for any dynamic loading to complete
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  private async fillFormFields(
    sessionId: string,
    form: FormInfo,
    fieldsToFill: FormField[],
    options: {
      clearFields: boolean;
      skipMissingFields: boolean;
      fieldDelayMs: number;
      validateFields: boolean;
    },
  ): Promise<FieldFillResult[]> {
    const results: FieldFillResult[] = [];

    for (const fieldData of fieldsToFill) {
      const result = await this.fillSingleField(
        sessionId,
        form,
        fieldData,
        options,
      );
      results.push(result);

      // Delay between fields
      if (options.fieldDelayMs > 0) {
        await new Promise((resolve) =>
          setTimeout(resolve, options.fieldDelayMs),
        );
      }
    }

    return results;
  }

  private async fillSingleField(
    sessionId: string,
    form: FormInfo,
    fieldData: FormField,
    options: any,
  ): Promise<FieldFillResult> {
    try {
      // Find matching form field
      const formField = this.findFormField(form, fieldData);
      if (!formField) {
        if (options.skipMissingFields) {
          return {
            field: fieldData.name,
            success: true,
            value: '',
            error: 'Field not found but skipped',
            validationPassed: false,
          };
        }

        return {
          field: fieldData.name,
          success: false,
          value: '',
          error: 'Field not found on form',
          validationPassed: false,
        };
      }

      // Validate field value if enabled
      if (options.validateFields) {
        const validationResult = this.validateFieldValue(fieldData, formField);
        if (!validationResult.valid) {
          return {
            field: fieldData.name,
            success: false,
            value: fieldData.value,
            error: validationResult.error,
            elementIndex: formField.element.index,
            validationPassed: false,
          };
        }
      }

      // Fill the field based on its type
      await this.fillFieldByType(sessionId, formField, fieldData, options);

      return {
        field: fieldData.name,
        success: true,
        value: fieldData.value,
        elementIndex: formField.element.index,
        validationPassed: true,
      };
    } catch (error) {
      return {
        field: fieldData.name,
        success: false,
        value: fieldData.value,
        error: error.message,
        validationPassed: false,
      };
    }
  }

  private findFormField(
    form: FormInfo,
    fieldData: FormField,
  ): FormFieldInfo | undefined {
    // Try to match by name first
    let match = form.fields.find((f) => f.name === fieldData.name);

    if (!match && fieldData.selector) {
      // Try to match by selector
      match = form.fields.find(
        (f) => f.element.selector === fieldData.selector,
      );
    }

    if (!match && fieldData.xpath) {
      // Try to match by xpath
      match = form.fields.find((f) => f.element.xpath === fieldData.xpath);
    }

    if (!match && fieldData.label) {
      // Try to match by label
      match = form.fields.find((f) => f.label === fieldData.label);
    }

    if (!match && fieldData.placeholder) {
      // Try to match by placeholder
      match = form.fields.find((f) => f.placeholder === fieldData.placeholder);
    }

    return match;
  }

  private validateFieldValue(
    fieldData: FormField,
    formField: FormFieldInfo,
  ): { valid: boolean; error?: string } {
    if (formField.required && !fieldData.value) {
      return { valid: false, error: 'Required field cannot be empty' };
    }

    if (formField.validation) {
      const validation = formField.validation;

      if (validation.pattern) {
        const regex = new RegExp(validation.pattern);
        if (!regex.test(fieldData.value)) {
          return {
            valid: false,
            error: 'Value does not match required pattern',
          };
        }
      }

      if (
        validation.minLength &&
        fieldData.value.length < validation.minLength
      ) {
        return {
          valid: false,
          error: `Value too short (minimum ${validation.minLength} characters)`,
        };
      }

      if (
        validation.maxLength &&
        fieldData.value.length > validation.maxLength
      ) {
        return {
          valid: false,
          error: `Value too long (maximum ${validation.maxLength} characters)`,
        };
      }

      if (
        validation.min !== undefined &&
        parseFloat(fieldData.value) < validation.min
      ) {
        return {
          valid: false,
          error: `Value too small (minimum ${validation.min})`,
        };
      }

      if (
        validation.max !== undefined &&
        parseFloat(fieldData.value) > validation.max
      ) {
        return {
          valid: false,
          error: `Value too large (maximum ${validation.max})`,
        };
      }
    }

    return { valid: true };
  }

  private async fillFieldByType(
    sessionId: string,
    formField: FormFieldInfo,
    fieldData: FormField,
    options: any,
  ): Promise<void> {
    const elementIndex = formField.element.index;

    switch (formField.fieldType) {
      case FormFieldType.TEXT:
      case FormFieldType.EMAIL:
      case FormFieldType.PASSWORD:
      case FormFieldType.NUMBER:
      case FormFieldType.TEL:
      case FormFieldType.URL:
      case FormFieldType.TEXTAREA:
        await this.domService.typeText(sessionId, {
          elementIndex,
          text: fieldData.value,
          clearExisting: options.clearFields,
          delay: 50,
        });
        break;

      case FormFieldType.SELECT:
        await this.browserUseService.selectOption({
          sessionId,
          elementIndex,
          value: fieldData.value,
        });
        break;

      case FormFieldType.CHECKBOX:
      case FormFieldType.RADIO:
        if (fieldData.value === 'true' || fieldData.value === '1') {
          await this.domService.clickElement(sessionId, {
            elementIndex,
          });
        }
        break;

      case FormFieldType.FILE:
        await this.browserUseService.uploadFile({
          sessionId,
          elementIndex,
          filePath: fieldData.value,
        });
        break;

      default:
        await this.domService.typeText(sessionId, {
          elementIndex,
          text: fieldData.value,
          clearExisting: options.clearFields,
        });
    }
  }

  private async submitByButtonClick(
    sessionId: string,
    submitDto: SubmitFormDto,
  ): Promise<{ success: boolean; error?: string; result?: any }> {
    try {
      // Find submit button
      const pageState = await this.domService.getPageState(sessionId);
      if (!pageState) {
        return { success: false, error: 'Could not get page state' };
      }

      let submitButton: PageElement | undefined;

      if (submitDto.submitButtonSelector) {
        submitButton = pageState.elements.find(
          (el) => el.selector === submitDto.submitButtonSelector,
        );
      } else {
        // Find submit button automatically
        submitButton = pageState.buttons.find(
          (button) =>
            button.attributes.type === 'submit' ||
            button.text?.toLowerCase().includes('submit'),
        );
      }

      if (!submitButton) {
        return { success: false, error: 'Submit button not found' };
      }

      // Click submit button
      const clickResult = await this.domService.clickElement(sessionId, {
        elementIndex: submitButton.index,
        waitForNavigation: submitDto.waitForNavigation,
      });

      return {
        success: clickResult.success,
        error: clickResult.error?.message,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  private async submitByEnterKey(
    sessionId: string,
    submitDto: SubmitFormDto,
  ): Promise<{ success: boolean; error?: string; result?: any }> {
    try {
      // Press Enter key
      const result = await this.browserUseService.keyPress({
        sessionId,
        key: 'Enter',
      });

      return {
        success: result.success,
        error: result.error,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  private async submitByFormSubmit(
    sessionId: string,
    submitDto: SubmitFormDto,
  ): Promise<{ success: boolean; error?: string; result?: any }> {
    try {
      // Execute form submit via JavaScript
      const result = await this.browserUseService.executeScript({
        sessionId,
        script: `
          const form = document.querySelector('${submitDto.formSelector || 'form'}');
          if (form) {
            form.submit();
            return { success: true };
          }
          return { success: false, error: 'Form not found' };
        `,
      });

      return {
        success: result.success && result.result?.success,
        error: result.error || result.result?.error,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  private async waitForNavigationOrElement(
    sessionId: string,
    submitDto: SubmitFormDto,
  ): Promise<void> {
    if (submitDto.waitForElement) {
      await this.domService.waitForElement(sessionId, {
        selector: submitDto.waitForElement,
        timeout: submitDto.timeoutSeconds ?? 30,
      });
    }
  }

  private async validateSubmissionResult(
    sessionId: string,
    submitDto: SubmitFormDto,
  ): Promise<{ success: boolean; warnings?: string[] }> {
    const warnings: string[] = [];

    // Check success indicators
    if (submitDto.successIndicators) {
      const pageState = await this.domService.getPageState(sessionId);
      if (!pageState) {
        warnings.push(
          'Could not validate submission success - page state unavailable',
        );
        return { success: true, warnings };
      }

      if (submitDto.successIndicators.urlContains) {
        if (!pageState.url.includes(submitDto.successIndicators.urlContains)) {
          warnings.push('Expected URL pattern not found after submission');
        }
      }

      if (submitDto.successIndicators.titleContains) {
        if (
          !pageState.title.includes(submitDto.successIndicators.titleContains)
        ) {
          warnings.push('Expected title pattern not found after submission');
        }
      }
    }

    // Check error indicators
    if (submitDto.errorIndicators) {
      // Implementation for error checking
      warnings.push('Error indicator validation not fully implemented');
    }

    return {
      success: true,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  private async validateFormState(
    sessionId: string,
    submitDto: SubmitFormDto,
  ): Promise<FormValidationResponseDto> {
    // Basic validation - check if form exists
    const pageState = await this.domService.getPageState(sessionId);

    if (!pageState) {
      return {
        success: false,
        message: 'Could not retrieve page state for validation',
        fieldsProcessed: 0,
        fieldsSuccessful: 0,
        fieldsFailed: 0,
        fieldResults: [],
        timestamp: new Date(),
        durationMs: 0,
      };
    }

    if (pageState.forms.length === 0) {
      return {
        success: false,
        message: 'No forms found on current page',
        fieldsProcessed: 0,
        fieldsSuccessful: 0,
        fieldsFailed: 0,
        fieldResults: [],
        timestamp: new Date(),
        durationMs: 0,
      };
    }

    return {
      success: true,
      message: 'Form validation passed',
      fieldsProcessed: 0,
      fieldsSuccessful: 0,
      fieldsFailed: 0,
      fieldResults: [],
      timestamp: new Date(),
      durationMs: 0,
    };
  }

  /**
   * Cleanup on service destruction
   */
  async onModuleDestroy(): Promise<void> {
    this.formsCache.clear();
    this.logger.log('Browser form service cleanup completed');
  }
}
