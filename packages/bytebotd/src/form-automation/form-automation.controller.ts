import {
  Controller,
  Post,
  Body,
  Logger,
  HttpException,
  HttpStatus,
  UseGuards,
  UsePipes,
  UseInterceptors,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiTags,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { EnterpriseRateLimitGuard } from '../common/guards/rate-limit.guard';
import { SecuritySanitizationPipes } from '../common/pipes/security-sanitization.pipe';
import { LoggingInterceptor } from '../common/interceptors/logging.interceptor';
import {
  ForVersion,
  SUPPORTED_API_VERSIONS,
} from '../common/versioning/api-version.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  OperatorOrAdmin,
  CurrentUser,
  ByteBotdUser,
} from '../auth/decorators/roles.decorator';
import { FormAutomationService } from './form-automation.service';
import {
  FormActionDto,
  FormDetectionDto,
  FormFillingDto,
  FormSubmissionDto,
  FormValidationDto,
  FormAutoCompleteDto,
  FormActionType
} from './dto/form-action.dto';
import {
  FormDetectionResponseDto,
  FormAutomationResponseDto,
  FormSubmissionResponseDto,
  FormAutoCompleteResponseDto
} from './dto/form-response.dto';

/**
 * Form Automation Controller
 *
 * Provides enterprise-grade APIs for automated form interaction including:
 * - Intelligent form detection and analysis
 * - Automated form filling with validation
 * - Multi-step form submission handling
 * - Auto-complete with user profile data
 * - Form validation and error handling
 * - Screenshot capture for debugging
 *
 * Security Features:
 * - JWT authentication and RBAC authorization
 * - Input sanitization and XSS prevention
 * - Rate limiting with suspicious activity detection
 * - Comprehensive audit logging
 * - Secure file handling for form uploads
 */
@ApiTags('Form Automation API')
@Controller('form-automation')
@UseGuards(JwtAuthGuard, RolesGuard, EnterpriseRateLimitGuard)
@UsePipes(SecuritySanitizationPipes.HIGH_SECURITY)
@UseInterceptors(LoggingInterceptor)
@ApiBearerAuth('bearer')
export class FormAutomationController {
  private readonly logger = new Logger(FormAutomationController.name);

  constructor(private readonly formAutomationService: FormAutomationService) {}

  /**
   * Execute form automation action
   *
   * Universal endpoint for all form automation operations including detection,
   * filling, submission, validation, and auto-completion. Supports comprehensive
   * configuration options and provides detailed execution results.
   *
   * @param params - Form automation action parameters
   * @param user - Authenticated user context
   * @returns Promise<FormAutomationResponseDto> - Action execution results
   */
  @Post('action')
  @OperatorOrAdmin()
  @ForVersion(SUPPORTED_API_VERSIONS.V1)
  @ApiOperation({
    summary: 'Execute form automation action',
    description: 'Execute various form automation actions including detection, filling, submission, and validation. Supports all form types with intelligent field recognition.',
    operationId: 'executeFormAutomation',
  })
  @ApiResponse({
    status: 200,
    description: 'Form automation action executed successfully',
    type: FormAutomationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid action parameters or unsupported form operation',
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions - OPERATOR or ADMIN role required',
  })
  @ApiResponse({
    status: 404,
    description: 'Form not found on page',
  })
  @ApiResponse({
    status: 429,
    description: 'Rate limit exceeded',
  })
  async executeFormAction(
    @Body() params: FormActionDto,
    @CurrentUser() user: ByteBotdUser,
  ): Promise<any> {
    const operationId = `form_action_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    try {
      this.logger.log(
        `[${operationId}] Form automation request: ${params.action}`,
        {
          operationId,
          action: params.action,
          formSelector: params.formSelector,
          fieldsCount: params.fields?.length || 0,
          userId: user.id,
          username: user.username,
          userRole: user.role,
        },
      );

      const result = await this.formAutomationService.executeFormAction(params);

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `[${operationId}] Form automation completed successfully (${processingTime}ms)`,
        {
          operationId,
          action: params.action,
          processingTime,
          success: result.success !== false,
          userId: user.id,
          username: user.username,
        },
      );

      return result;
    } catch (error: unknown) {
      const processingTime = Date.now() - startTime;
      const errorMessage = this.getErrorMessage(error);

      this.logger.error(
        `[${operationId}] Form automation failed: ${errorMessage} (${processingTime}ms)`,
        this.getErrorStack(error),
        {
          operationId,
          action: params.action,
          processingTime,
          errorType: error?.constructor?.name ?? 'Unknown',
          userId: user.id,
          username: user.username,
        },
      );

      // Map specific errors to appropriate HTTP status codes
      if (errorMessage.includes('not found') || errorMessage.includes('No forms found')) {
        throw new HttpException(
          `Form not found: ${errorMessage}`,
          HttpStatus.NOT_FOUND,
        );
      }

      if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
        throw new HttpException(
          `Form automation timeout: ${errorMessage}`,
          HttpStatus.REQUEST_TIMEOUT,
        );
      }

      throw new HttpException(
        `Form automation failed: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Detect forms on current page
   *
   * Analyzes the current page to identify all forms and their structure.
   * Provides detailed information about form fields, validation requirements,
   * and submission endpoints for automation planning.
   *
   * @param params - Form detection parameters
   * @param user - Authenticated user context
   * @returns Promise<FormDetectionResponseDto> - Detected forms and their structure
   */
  @Post('detect')
  @OperatorOrAdmin()
  @ForVersion(SUPPORTED_API_VERSIONS.V1)
  @ApiOperation({
    summary: 'Detect forms on page',
    description: 'Analyze the current page to identify all forms and their field structure. Supports deep analysis of form validation rules and field types.',
    operationId: 'detectForms',
  })
  @ApiResponse({
    status: 200,
    description: 'Form detection completed successfully',
    type: FormDetectionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid detection parameters',
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions - OPERATOR or ADMIN role required',
  })
  async detectForms(
    @Body() params: FormDetectionDto,
    @CurrentUser() user: ByteBotdUser,
  ): Promise<FormDetectionResponseDto> {
    const operationId = `form_detect_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    this.logger.log(
      `[${operationId}] Form detection request`,
      {
        operationId,
        url: params.url,
        analyzeFields: params.analyzeFields,
        userId: user.id,
        username: user.username,
      },
    );

    const result = await this.formAutomationService.executeFormAction(params);
    return result as FormDetectionResponseDto;
  }

  /**
   * Fill form fields
   *
   * Automatically fills form fields with provided data. Supports all HTML5
   * input types, complex field validation, and smart retry mechanisms for
   * dynamic forms.
   *
   * @param params - Form filling parameters with field data
   * @param user - Authenticated user context
   * @returns Promise<FormAutomationResponseDto> - Filling results and validation status
   */
  @Post('fill')
  @OperatorOrAdmin()
  @ForVersion(SUPPORTED_API_VERSIONS.V1)
  @ApiOperation({
    summary: 'Fill form fields',
    description: 'Automatically fill form fields with provided data. Supports validation, retry mechanisms, and all HTML5 input types.',
    operationId: 'fillForm',
  })
  @ApiResponse({
    status: 200,
    description: 'Form filling completed successfully',
    type: FormAutomationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid filling parameters or field data',
  })
  @ApiResponse({
    status: 404,
    description: 'Form or required fields not found',
  })
  async fillForm(
    @Body() params: FormFillingDto,
    @CurrentUser() user: ByteBotdUser,
  ): Promise<FormAutomationResponseDto> {
    const operationId = `form_fill_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    this.logger.log(
      `[${operationId}] Form filling request`,
      {
        operationId,
        formSelector: params.formSelector,
        fieldsCount: params.fields.length,
        submitAfterFill: params.submitAfterFill,
        userId: user.id,
        username: user.username,
      },
    );

    const result = await this.formAutomationService.executeFormAction(params);
    return result as FormAutomationResponseDto;
  }

  /**
   * Submit form
   *
   * Submits a form after optional validation. Handles form submission workflows,
   * redirect detection, and success/error response analysis. Supports both
   * traditional and AJAX form submissions.
   *
   * @param params - Form submission parameters
   * @param user - Authenticated user context
   * @returns Promise<FormSubmissionResponseDto> - Submission results and response analysis
   */
  @Post('submit')
  @OperatorOrAdmin()
  @ForVersion(SUPPORTED_API_VERSIONS.V1)
  @ApiOperation({
    summary: 'Submit form',
    description: 'Submit a form with comprehensive error handling and response analysis. Supports traditional and AJAX submissions with redirect detection.',
    operationId: 'submitForm',
  })
  @ApiResponse({
    status: 200,
    description: 'Form submission completed',
    type: FormSubmissionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid submission parameters',
  })
  @ApiResponse({
    status: 404,
    description: 'Form or submit button not found',
  })
  async submitForm(
    @Body() params: FormSubmissionDto,
    @CurrentUser() user: ByteBotdUser,
  ): Promise<FormSubmissionResponseDto> {
    const operationId = `form_submit_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    this.logger.log(
      `[${operationId}] Form submission request`,
      {
        operationId,
        formSelector: params.formSelector,
        submitSelector: params.submitSelector,
        expectedRedirect: params.expectedRedirect,
        userId: user.id,
        username: user.username,
      },
    );

    const result = await this.formAutomationService.executeFormAction(params);
    return result as FormSubmissionResponseDto;
  }

  /**
   * Validate form fields
   *
   * Validates form fields against built-in HTML5 validation rules and custom
   * validation patterns. Provides detailed validation results and error messages
   * for each field.
   *
   * @param params - Form validation parameters with custom rules
   * @param user - Authenticated user context
   * @returns Promise<FormAutomationResponseDto> - Validation results for all fields
   */
  @Post('validate')
  @OperatorOrAdmin()
  @ForVersion(SUPPORTED_API_VERSIONS.V1)
  @ApiOperation({
    summary: 'Validate form fields',
    description: 'Validate form fields against HTML5 rules and custom validation patterns. Provides detailed error messages and validation status.',
    operationId: 'validateForm',
  })
  @ApiResponse({
    status: 200,
    description: 'Form validation completed',
    type: FormAutomationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid validation parameters',
  })
  @ApiResponse({
    status: 404,
    description: 'Form not found',
  })
  async validateForm(
    @Body() params: FormValidationDto,
    @CurrentUser() user: ByteBotdUser,
  ): Promise<FormAutomationResponseDto> {
    const operationId = `form_validate_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    this.logger.log(
      `[${operationId}] Form validation request`,
      {
        operationId,
        formSelector: params.formSelector,
        fieldsCount: params.fields?.length || 0,
        hasCustomRules: !!params.validationRules,
        userId: user.id,
        username: user.username,
      },
    );

    const result = await this.formAutomationService.executeFormAction(params);
    return result as FormAutomationResponseDto;
  }

  /**
   * Auto-complete form with profile data
   *
   * Automatically fills form fields using user profile data with intelligent
   * field mapping. Supports custom field mappings and profile data templates
   * for different form types.
   *
   * @param params - Auto-complete parameters with profile data
   * @param user - Authenticated user context
   * @returns Promise<FormAutoCompleteResponseDto> - Auto-completion results
   */
  @Post('auto-complete')
  @OperatorOrAdmin()
  @ForVersion(SUPPORTED_API_VERSIONS.V1)
  @ApiOperation({
    summary: 'Auto-complete form with profile',
    description: 'Automatically fill form fields using user profile data with intelligent field mapping. Supports custom mappings and multiple profile templates.',
    operationId: 'autoCompleteForm',
  })
  @ApiResponse({
    status: 200,
    description: 'Form auto-completion completed',
    type: FormAutoCompleteResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid auto-complete parameters or profile data',
  })
  @ApiResponse({
    status: 404,
    description: 'Form not found',
  })
  async autoCompleteForm(
    @Body() params: FormAutoCompleteDto,
    @CurrentUser() user: ByteBotdUser,
  ): Promise<FormAutoCompleteResponseDto> {
    const operationId = `form_autocomplete_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    this.logger.log(
      `[${operationId}] Form auto-complete request`,
      {
        operationId,
        formSelector: params.formSelector,
        hasFieldMapping: !!params.fieldMapping,
        profileDataKeys: Object.keys(params.profileData),
        userId: user.id,
        username: user.username,
      },
    );

    const result = await this.formAutomationService.executeFormAction(params);
    return result as FormAutoCompleteResponseDto;
  }

  /**
   * Clear form fields
   *
   * Clears all specified form fields or all fields in a form. Useful for
   * resetting forms before filling with new data or testing form validation.
   *
   * @param formSelector - CSS selector for the form to clear
   * @param fieldSelectors - Optional specific field selectors to clear
   * @param user - Authenticated user context
   * @returns Promise<FormAutomationResponseDto> - Clear operation results
   */
  @Post('clear')
  @OperatorOrAdmin()
  @ForVersion(SUPPORTED_API_VERSIONS.V1)
  @ApiOperation({
    summary: 'Clear form fields',
    description: 'Clear all or specific form fields. Useful for form reset operations and testing validation behavior.',
    operationId: 'clearForm',
  })
  @ApiResponse({
    status: 200,
    description: 'Form fields cleared successfully',
    type: FormAutomationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid clear parameters',
  })
  @ApiResponse({
    status: 404,
    description: 'Form not found',
  })
  async clearForm(
    @Body('formSelector') formSelector: string,
    @Body('fieldSelectors') fieldSelectors?: string[],
    @CurrentUser() user: ByteBotdUser,
  ): Promise<FormAutomationResponseDto> {
    const operationId = `form_clear_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    this.logger.log(
      `[${operationId}] Form clear request`,
      {
        operationId,
        formSelector,
        fieldSelectorsCount: fieldSelectors?.length || 0,
        userId: user.id,
        username: user.username,
      },
    );

    const params: FormActionDto = {
      action: FormActionType.CLEAR_FORM,
      formSelector,
      fields: fieldSelectors?.map(selector => ({
        selector,
        type: 'text' as any // Will be determined dynamically
      }))
    };

    const result = await this.formAutomationService.executeFormAction(params);
    return result as FormAutomationResponseDto;
  }

  /**
   * Wait for form to appear
   *
   * Waits for a form to appear on the page. Useful for dynamic pages where
   * forms are loaded asynchronously or after user interactions.
   *
   * @param formSelector - CSS selector for the form to wait for
   * @param timeout - Timeout in milliseconds (default: 10000)
   * @param user - Authenticated user context
   * @returns Promise<FormAutomationResponseDto> - Wait operation results
   */
  @Get('wait/:formSelector')
  @OperatorOrAdmin()
  @ForVersion(SUPPORTED_API_VERSIONS.V1)
  @ApiOperation({
    summary: 'Wait for form to appear',
    description: 'Wait for a specific form to appear on the page. Useful for dynamic forms loaded via JavaScript.',
    operationId: 'waitForForm',
  })
  @ApiParam({
    name: 'formSelector',
    description: 'CSS selector for the form to wait for',
    example: '#dynamicForm'
  })
  @ApiQuery({
    name: 'timeout',
    description: 'Timeout in milliseconds',
    example: 10000,
    required: false
  })
  @ApiResponse({
    status: 200,
    description: 'Form appeared successfully',
    type: FormAutomationResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Form did not appear within timeout',
  })
  @ApiResponse({
    status: 408,
    description: 'Request timeout waiting for form',
  })
  async waitForForm(
    @Param('formSelector') formSelector: string,
    @Query('timeout') timeout?: number,
    @CurrentUser() user: ByteBotdUser,
  ): Promise<FormAutomationResponseDto> {
    const operationId = `form_wait_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    this.logger.log(
      `[${operationId}] Form wait request`,
      {
        operationId,
        formSelector,
        timeout: timeout || 10000,
        userId: user.id,
        username: user.username,
      },
    );

    const params: FormActionDto = {
      action: FormActionType.WAIT_FOR_FORM,
      formSelector,
      config: {
        timeout: timeout || 10000
      }
    };

    const result = await this.formAutomationService.executeFormAction(params);
    return result as FormAutomationResponseDto;
  }

  // Helper methods for error handling

  private getErrorMessage(error: unknown): string {
    if (error && typeof error === 'object' && 'message' in error) {
      return (error as { message: string }).message;
    }
    return typeof error === 'string' ? error : 'Unknown error';
  }

  private getErrorStack(error: unknown): string | undefined {
    if (error && typeof error === 'object' && 'stack' in error) {
      return (error as { stack?: string }).stack;
    }
    return undefined;
  }
}