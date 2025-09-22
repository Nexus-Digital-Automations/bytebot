/**
 * Browser Automation Controller - Browser-Use Integration API
 *
 * This controller provides REST API endpoints for browser automation using the browser-use
 * Python library. It integrates with the existing bytebot async job infrastructure to provide
 * comprehensive browser automation capabilities including session management, navigation,
 * DOM interaction, form automation, and data extraction.
 *
 * Key Features:
 * - Browser session lifecycle management
 * - Async job integration for long-running automation tasks
 * - DOM interaction and element automation
 * - Form filling and submission
 * - Screenshot capture and visual feedback
 * - Data extraction and scraping capabilities
 * - Error handling and retry mechanisms
 * - Security validation and authentication
 *
 * Dependencies: ComprehensiveJobOrchestratorService, BrowserAutomationService
 */

import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Logger,
  HttpException,
  HttpStatus,
  UseGuards,
  UsePipes,
  UseInterceptors,
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
import {
  ParlantCritical,
  ParlantSecure,
  ParlantValidated,
  SecurityLevel,
  ValidationMode,
  ConversationContext,
  ParlantValidationInterceptor,
} from '@bytebot/shared/src/parlant/parlant-validation.decorator';
import { ConversationContextParameter } from '@bytebot/shared/src/types/conversation-context.types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  OperatorOrAdmin,
  CurrentUser,
  ByteBotdUser,
} from '../auth/decorators/roles.decorator';
import { ComprehensiveJobOrchestratorService } from '../computer-use/services/comprehensive-job-orchestrator.service';
import { BrowserAutomationService } from './browser-automation.service';
import { BrowserAutomationValidationPipe } from './pipes/browser-automation-validation.pipe';
import {
  BrowserSessionCreateDto,
  BrowserSessionResponseDto,
  BrowserNavigationDto,
  BrowserNavigationResponseDto,
  BrowserActionDto,
  BrowserActionResponseDto,
  BrowserSessionListResponseDto,
  BrowserScreenshotResponseDto,
  BrowserElementInteractionDto,
  BrowserFormAutomationDto,
  BrowserDataExtractionDto,
  BrowserDataExtractionResponseDto,
} from './dto/browser-automation.dto';

// Define interfaces for proper error handling
interface ErrorWithMessage {
  message: string;
}

interface ErrorWithStack extends ErrorWithMessage {
  stack?: string;
}

// Type guard to check if an unknown error has a message property
function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  );
}

// Type guard to check if an error has a stack property
function isErrorWithStack(error: unknown): error is ErrorWithStack {
  return (
    isErrorWithMessage(error) &&
    'stack' in error &&
    (typeof (error as Record<string, unknown>).stack === 'string' ||
      (error as Record<string, unknown>).stack === undefined)
  );
}

// Extract error message safely from unknown error
function getErrorMessage(error: unknown): string {
  if (isErrorWithMessage(error)) return error.message;
  return typeof error === 'string' ? error : JSON.stringify(error);
}

// Extract error stack safely from unknown error
function getErrorStack(error: unknown): string | undefined {
  if (isErrorWithStack(error)) return error.stack;
  return undefined;
}

/**
 * Browser Automation Controller - Secured Browser-Use Integration API
 *
 * This controller provides enterprise-grade security for browser automation actions
 * including comprehensive input validation, sanitization, rate limiting, and
 * security monitoring for all browser automation operations.
 *
 * Security Features:
 * - Rate limiting with suspicious activity detection
 * - Input sanitization and XSS/injection prevention
 * - Comprehensive request/response logging
 * - Malicious payload detection and blocking
 *
 * Dependencies: BrowserAutomationService, ComprehensiveJobOrchestratorService
 */
@ApiTags('Browser Automation API')
@Controller('browser-automation')
@UseGuards(JwtAuthGuard, RolesGuard, EnterpriseRateLimitGuard)
@UsePipes(SecuritySanitizationPipes.HIGH_SECURITY)
@UseInterceptors(LoggingInterceptor, ParlantValidationInterceptor)
@ApiBearerAuth('bearer')
export class BrowserAutomationController {
  private readonly logger = new Logger(BrowserAutomationController.name);

  constructor(
    private readonly browserAutomationService: BrowserAutomationService,
    private readonly comprehensiveJobOrchestrator: ComprehensiveJobOrchestratorService,
  ) {}

  // ===== BROWSER SESSION MANAGEMENT ENDPOINTS =====

  /**
   * Create a new browser session for automation
   *
   * Creates a new browser automation session with configurable options including
   * headless mode, viewport size, user agent, and proxy settings. Returns session
   * details for subsequent automation operations.
   *
   * @param sessionRequest Browser session configuration
   * @param user Authenticated user context
   * @returns Promise<BrowserSessionResponseDto> Session creation details
   */
  @Post('sessions')
  @OperatorOrAdmin()
  @ForVersion(SUPPORTED_API_VERSIONS.V1)
  @ApiOperation({
    summary: 'Create browser session',
    description:
      'Create a new browser automation session with configurable options including headless mode, viewport size, and proxy settings.',
    operationId: 'createBrowserSession',
  })
  @ApiResponse({
    status: 201,
    description: 'Browser session created successfully',
    type: BrowserSessionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid session configuration',
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
    status: 429,
    description: 'Rate limit exceeded',
  })
  @ParlantCritical(
    'Create browser automation session with comprehensive security validation and configuration management',
    {
      securityLevel: SecurityLevel.CRITICAL,
      validationMode: ValidationMode.EXPLICIT,
      businessCategory: 'BROWSER_SESSION_CREATION',
      complianceFlags: ['BROWSER_AUTOMATION', 'SESSION_MANAGEMENT'],
      requiredRoles: ['OPERATOR', 'ADMIN'],
      customRules: [
        {
          name: 'headless_mode_validation',
          condition: 'headless_mode_required',
          action: 'APPROVE',
          priority: 5,
        },
        {
          name: 'proxy_configuration_validation',
          condition: 'proxy_settings_present',
          action: 'REQUIRE_CONFIRMATION',
          priority: 8,
        },
      ],
    },
  )
  async createSession(
    @Body(new BrowserAutomationValidationPipe()) sessionRequest: BrowserSessionCreateDto,
    @CurrentUser() user: ByteBotdUser,
  ): Promise<BrowserSessionResponseDto> {
    const operationId = `browser_session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    try {
      this.logger.log(
        `[${operationId}] Creating browser session`,
        {
          operationId,
          userId: user.id,
          username: user.username,
          headless: sessionRequest.headless,
          viewport: sessionRequest.viewport,
        },
      );

      const sessionResponse = await this.browserAutomationService.createSession(
        sessionRequest,
        {
          userId: user.id,
          username: user.username,
          operationId,
          submittedVia: 'api',
        },
      );

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `[${operationId}] Browser session created: ${sessionResponse.sessionId} (${processingTime}ms)`,
        {
          operationId,
          sessionId: sessionResponse.sessionId,
          processingTime,
          userId: user.id,
          username: user.username,
        },
      );

      return sessionResponse;
    } catch (error: unknown) {
      const processingTime = Date.now() - startTime;
      const errorMessage = getErrorMessage(error);

      this.logger.error(
        `[${operationId}] Error creating browser session: ${errorMessage} (${processingTime}ms)`,
        getErrorStack(error),
        {
          operationId,
          processingTime,
          errorType: error?.constructor?.name ?? 'Unknown',
          userId: user.id,
          username: user.username,
        },
      );

      throw new HttpException(
        `Failed to create browser session: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get list of active browser sessions
   *
   * Retrieves a list of all active browser automation sessions for the current user
   * with session metadata, status information, and resource usage details.
   *
   * @param user Authenticated user context
   * @returns Promise<BrowserSessionListResponseDto> List of active sessions
   */
  @Get('sessions')
  @OperatorOrAdmin()
  @ForVersion(SUPPORTED_API_VERSIONS.V1)
  @ApiOperation({
    summary: 'List browser sessions',
    description:
      'Retrieve list of active browser automation sessions with metadata and status information.',
    operationId: 'listBrowserSessions',
  })
  @ApiResponse({
    status: 200,
    description: 'Browser sessions retrieved successfully',
    type: BrowserSessionListResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions - OPERATOR or ADMIN role required',
  })
  @ParlantValidated({
    intent: 'Retrieve list of active browser automation sessions with status and metadata',
    securityLevel: SecurityLevel.LOW,
    validationMode: ValidationMode.AUTOMATIC,
    businessCategory: 'BROWSER_SESSION_MONITORING',
    complianceFlags: ['SESSION_MONITORING', 'RESOURCE_TRACKING'],
    cacheable: true,
    timeout: 5000,
  })
  async listSessions(
    @CurrentUser() user: ByteBotdUser,
  ): Promise<BrowserSessionListResponseDto> {
    const operationId = `list_sessions_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    try {
      this.logger.log(`[${operationId}] Listing browser sessions`, {
        operationId,
        userId: user.id,
        username: user.username,
      });

      const sessionList = await this.browserAutomationService.listSessions(user.id);

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `[${operationId}] Sessions retrieved: ${sessionList.sessions.length} active (${processingTime}ms)`,
        {
          operationId,
          sessionCount: sessionList.sessions.length,
          processingTime,
          userId: user.id,
          username: user.username,
        },
      );

      return sessionList;
    } catch (error: unknown) {
      const processingTime = Date.now() - startTime;
      const errorMessage = getErrorMessage(error);

      this.logger.error(
        `[${operationId}] Error listing sessions: ${errorMessage} (${processingTime}ms)`,
        getErrorStack(error),
        {
          operationId,
          processingTime,
          errorType: error?.constructor?.name ?? 'Unknown',
          userId: user.id,
          username: user.username,
        },
      );

      throw new HttpException(
        `Failed to list browser sessions: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Close a browser session
   *
   * Closes an active browser automation session and cleans up all associated
   * resources including browser processes, temporary files, and session data.
   *
   * @param sessionId Session identifier to close
   * @param user Authenticated user context
   * @returns Promise<{ closed: boolean; message: string }> Closure confirmation
   */
  @Delete('sessions/:sessionId')
  @OperatorOrAdmin()
  @ForVersion(SUPPORTED_API_VERSIONS.V1)
  @ApiOperation({
    summary: 'Close browser session',
    description:
      'Close an active browser automation session and clean up all associated resources.',
    operationId: 'closeBrowserSession',
  })
  @ApiParam({
    name: 'sessionId',
    description: 'Browser session identifier',
    example: 'session_1702983456789_abc123',
  })
  @ApiResponse({
    status: 200,
    description: 'Session closed successfully',
    schema: {
      type: 'object',
      properties: {
        closed: { type: 'boolean' },
        message: { type: 'string' },
        sessionId: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Session not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions - OPERATOR or ADMIN role required',
  })
  async closeSession(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: ByteBotdUser,
  ): Promise<{ closed: boolean; message: string; sessionId: string }> {
    const operationId = `close_session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    try {
      this.logger.log(`[${operationId}] Closing browser session: ${sessionId}`, {
        operationId,
        sessionId,
        userId: user.id,
        username: user.username,
      });

      const closed = await this.browserAutomationService.closeSession(sessionId, user.id);

      const processingTime = Date.now() - startTime;
      const message = closed
        ? 'Session closed successfully'
        : 'Session could not be closed (may not exist or already closed)';

      this.logger.log(
        `[${operationId}] Session closure result: ${closed} (${processingTime}ms)`,
        {
          operationId,
          sessionId,
          closed,
          processingTime,
          userId: user.id,
          username: user.username,
        },
      );

      return {
        closed,
        message,
        sessionId,
      };
    } catch (error: unknown) {
      const processingTime = Date.now() - startTime;
      const errorMessage = getErrorMessage(error);

      this.logger.error(
        `[${operationId}] Error closing session: ${errorMessage} (${processingTime}ms)`,
        getErrorStack(error),
        {
          operationId,
          sessionId,
          processingTime,
          errorType: error?.constructor?.name ?? 'Unknown',
          userId: user.id,
          username: user.username,
        },
      );

      throw new HttpException(
        `Failed to close browser session: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ===== BROWSER NAVIGATION ENDPOINTS =====

  /**
   * Navigate browser to URL (async)
   *
   * Navigates a browser session to a specified URL asynchronously. Returns immediately
   * with a job ID for tracking navigation progress and completion status.
   *
   * @param sessionId Browser session identifier
   * @param navigationRequest Navigation configuration
   * @param user Authenticated user context
   * @returns Promise<{ jobId: string; submittedAt: string }> Navigation job details
   */
  @Post('sessions/:sessionId/navigate')
  @OperatorOrAdmin()
  @ForVersion(SUPPORTED_API_VERSIONS.V1)
  @ApiOperation({
    summary: 'Navigate browser to URL',
    description:
      'Navigate a browser session to a specified URL with async job tracking for completion status.',
    operationId: 'navigateBrowser',
  })
  @ApiParam({
    name: 'sessionId',
    description: 'Browser session identifier',
    example: 'session_1702983456789_abc123',
  })
  @ApiResponse({
    status: 202,
    description: 'Navigation submitted successfully for async execution',
    schema: {
      type: 'object',
      properties: {
        jobId: { type: 'string' },
        submittedAt: { type: 'string' },
        sessionId: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid URL or navigation parameters',
  })
  @ApiResponse({
    status: 404,
    description: 'Session not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions - OPERATOR or ADMIN role required',
  })
  @ParlantSecure(
    'Navigate browser session to specified URL with security validation and tracking',
    {
      securityLevel: SecurityLevel.HIGH,
      validationMode: ValidationMode.EXPLICIT,
      businessCategory: 'BROWSER_NAVIGATION',
      complianceFlags: ['URL_VALIDATION', 'NAVIGATION_TRACKING'],
      requiredRoles: ['OPERATOR', 'ADMIN'],
      customRules: [
        {
          name: 'url_security_validation',
          condition: 'url_security_check',
          action: 'REQUIRE_CONFIRMATION',
          priority: 9,
        },
        {
          name: 'domain_whitelist_check',
          condition: 'domain_allowed',
          action: 'APPROVE',
          priority: 6,
        },
      ],
    },
  )
  async navigateToUrl(
    @Param('sessionId') sessionId: string,
    @Body(new BrowserAutomationValidationPipe()) navigationRequest: BrowserNavigationDto,
    @CurrentUser() user: ByteBotdUser,
  ): Promise<{ jobId: string; submittedAt: string; sessionId: string }> {
    const operationId = `navigate_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    try {
      this.logger.log(
        `[${operationId}] Submitting navigation job for session ${sessionId}`,
        {
          operationId,
          sessionId,
          url: navigationRequest.url,
          userId: user.id,
          username: user.username,
        },
      );

      // Submit navigation job via comprehensive orchestrator
      const jobId = await this.comprehensiveJobOrchestrator.submitJob(
        'browser_navigate',
        {
          sessionId,
          ...navigationRequest,
        },
        {
          userId: user.id,
          username: user.username,
          operationId,
          source: 'browser-automation-api',
        },
      );

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `[${operationId}] Navigation job submitted: ${jobId} (${processingTime}ms)`,
        {
          operationId,
          jobId,
          sessionId,
          url: navigationRequest.url,
          processingTime,
          userId: user.id,
        },
      );

      return {
        jobId,
        submittedAt: new Date().toISOString(),
        sessionId,
      };
    } catch (error: unknown) {
      const processingTime = Date.now() - startTime;
      const errorMessage = getErrorMessage(error);

      this.logger.error(
        `[${operationId}] Error submitting navigation job: ${errorMessage} (${processingTime}ms)`,
        getErrorStack(error),
        {
          operationId,
          sessionId,
          url: navigationRequest.url,
          processingTime,
          errorType: error?.constructor?.name ?? 'Unknown',
          userId: user.id,
          username: user.username,
        },
      );

      throw new HttpException(
        `Failed to submit navigation job: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ===== BROWSER ACTION ENDPOINTS =====

  /**
   * Execute browser action (async)
   *
   * Executes a browser automation action such as clicking elements, typing text,
   * scrolling, or form interactions. Returns immediately with a job ID for tracking
   * action execution progress and results.
   *
   * @param sessionId Browser session identifier
   * @param actionRequest Action configuration and parameters
   * @param user Authenticated user context
   * @returns Promise<{ jobId: string; submittedAt: string }> Action job details
   */
  @Post('sessions/:sessionId/actions')
  @OperatorOrAdmin()
  @ForVersion(SUPPORTED_API_VERSIONS.V1)
  @ApiOperation({
    summary: 'Execute browser action',
    description:
      'Execute browser automation action such as clicking, typing, scrolling, or form interactions with async job tracking.',
    operationId: 'executeBrowserAction',
  })
  @ApiParam({
    name: 'sessionId',
    description: 'Browser session identifier',
    example: 'session_1702983456789_abc123',
  })
  @ApiResponse({
    status: 202,
    description: 'Action submitted successfully for async execution',
    schema: {
      type: 'object',
      properties: {
        jobId: { type: 'string' },
        submittedAt: { type: 'string' },
        sessionId: { type: 'string' },
        action: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid action parameters',
  })
  @ApiResponse({
    status: 404,
    description: 'Session not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions - OPERATOR or ADMIN role required',
  })
  @ParlantCritical(
    'Execute browser automation action with comprehensive security validation and monitoring',
    {
      securityLevel: SecurityLevel.CRITICAL,
      validationMode: ValidationMode.EXPLICIT,
      businessCategory: 'BROWSER_ACTION_EXECUTION',
      complianceFlags: ['DOM_INTERACTION', 'USER_SIMULATION', 'HIGH_RISK'],
      requiredRoles: ['OPERATOR', 'ADMIN'],
      customRules: [
        {
          name: 'click_action_validation',
          condition: 'action_type === "click"',
          action: 'REQUIRE_CONFIRMATION',
          priority: 8,
        },
        {
          name: 'type_action_validation',
          condition: 'action_type === "type"',
          action: 'REQUIRE_CONFIRMATION',
          priority: 7,
        },
        {
          name: 'form_submission_validation',
          condition: 'action_type === "submit_form"',
          action: 'REQUIRE_CONFIRMATION',
          priority: 9,
        },
      ],
    },
  )
  async executeAction(
    @Param('sessionId') sessionId: string,
    @Body(new BrowserAutomationValidationPipe()) actionRequest: BrowserActionDto,
    @CurrentUser() user: ByteBotdUser,
  ): Promise<{ jobId: string; submittedAt: string; sessionId: string; action: string }> {
    const operationId = `action_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    try {
      this.logger.log(
        `[${operationId}] Submitting browser action job: ${actionRequest.action}`,
        {
          operationId,
          sessionId,
          action: actionRequest.action,
          userId: user.id,
          username: user.username,
        },
      );

      // Submit action job via comprehensive orchestrator
      const jobId = await this.comprehensiveJobOrchestrator.submitJob(
        `browser_${actionRequest.action}`,
        {
          sessionId,
          ...actionRequest,
        },
        {
          userId: user.id,
          username: user.username,
          operationId,
          source: 'browser-automation-api',
        },
      );

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `[${operationId}] Browser action job submitted: ${jobId} (${processingTime}ms)`,
        {
          operationId,
          jobId,
          sessionId,
          action: actionRequest.action,
          processingTime,
          userId: user.id,
        },
      );

      return {
        jobId,
        submittedAt: new Date().toISOString(),
        sessionId,
        action: actionRequest.action,
      };
    } catch (error: unknown) {
      const processingTime = Date.now() - startTime;
      const errorMessage = getErrorMessage(error);

      this.logger.error(
        `[${operationId}] Error submitting browser action job: ${errorMessage} (${processingTime}ms)`,
        getErrorStack(error),
        {
          operationId,
          sessionId,
          action: actionRequest.action,
          processingTime,
          errorType: error?.constructor?.name ?? 'Unknown',
          userId: user.id,
          username: user.username,
        },
      );

      throw new HttpException(
        `Failed to submit browser action job: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ===== BROWSER SCREENSHOT ENDPOINT =====

  /**
   * Capture browser screenshot
   *
   * Captures a screenshot of the current browser session state. Returns the
   * screenshot as base64 encoded image data with metadata.
   *
   * @param sessionId Browser session identifier
   * @param user Authenticated user context
   * @returns Promise<BrowserScreenshotResponseDto> Screenshot data and metadata
   */
  @Get('sessions/:sessionId/screenshot')
  @OperatorOrAdmin()
  @ForVersion(SUPPORTED_API_VERSIONS.V1)
  @ApiOperation({
    summary: 'Capture browser screenshot',
    description:
      'Capture a screenshot of the current browser session state with metadata.',
    operationId: 'captureBrowserScreenshot',
  })
  @ApiParam({
    name: 'sessionId',
    description: 'Browser session identifier',
    example: 'session_1702983456789_abc123',
  })
  @ApiResponse({
    status: 200,
    description: 'Screenshot captured successfully',
    type: BrowserScreenshotResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Session not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions - OPERATOR or ADMIN role required',
  })
  @ParlantValidated({
    intent: 'Capture screenshot of browser session for visual feedback and monitoring',
    securityLevel: SecurityLevel.LOW,
    validationMode: ValidationMode.AUTOMATIC,
    businessCategory: 'BROWSER_SCREENSHOT',
    complianceFlags: ['VISUAL_MONITORING', 'SESSION_STATE'],
    cacheable: false,
    timeout: 10000,
  })
  async captureScreenshot(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: ByteBotdUser,
  ): Promise<BrowserScreenshotResponseDto> {
    const operationId = `screenshot_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    try {
      this.logger.log(`[${operationId}] Capturing screenshot for session: ${sessionId}`, {
        operationId,
        sessionId,
        userId: user.id,
        username: user.username,
      });

      const screenshot = await this.browserAutomationService.captureScreenshot(
        sessionId,
        user.id,
      );

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `[${operationId}] Screenshot captured (${processingTime}ms)`,
        {
          operationId,
          sessionId,
          imageSize: screenshot.image.length,
          processingTime,
          userId: user.id,
        },
      );

      return screenshot;
    } catch (error: unknown) {
      const processingTime = Date.now() - startTime;
      const errorMessage = getErrorMessage(error);

      this.logger.error(
        `[${operationId}] Error capturing screenshot: ${errorMessage} (${processingTime}ms)`,
        getErrorStack(error),
        {
          operationId,
          sessionId,
          processingTime,
          errorType: error?.constructor?.name ?? 'Unknown',
          userId: user.id,
          username: user.username,
        },
      );

      throw new HttpException(
        `Failed to capture screenshot: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ===== DATA EXTRACTION ENDPOINTS =====

  /**
   * Extract data from browser session (async)
   *
   * Extracts structured data from the current browser session using CSS selectors,
   * XPath expressions, or AI-powered content analysis. Returns immediately with
   * a job ID for tracking extraction progress and results.
   *
   * @param sessionId Browser session identifier
   * @param extractionRequest Data extraction configuration
   * @param user Authenticated user context
   * @returns Promise<{ jobId: string; submittedAt: string }> Extraction job details
   */
  @Post('sessions/:sessionId/extract')
  @OperatorOrAdmin()
  @ForVersion(SUPPORTED_API_VERSIONS.V1)
  @ApiOperation({
    summary: 'Extract data from browser session',
    description:
      'Extract structured data from browser session using CSS selectors, XPath, or AI-powered analysis with async job tracking.',
    operationId: 'extractBrowserData',
  })
  @ApiParam({
    name: 'sessionId',
    description: 'Browser session identifier',
    example: 'session_1702983456789_abc123',
  })
  @ApiResponse({
    status: 202,
    description: 'Data extraction submitted successfully for async execution',
    schema: {
      type: 'object',
      properties: {
        jobId: { type: 'string' },
        submittedAt: { type: 'string' },
        sessionId: { type: 'string' },
        extractionType: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid extraction parameters',
  })
  @ApiResponse({
    status: 404,
    description: 'Session not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions - OPERATOR or ADMIN role required',
  })
  @ParlantSecure(
    'Extract structured data from browser session with AI-powered analysis and validation',
    {
      securityLevel: SecurityLevel.HIGH,
      validationMode: ValidationMode.EXPLICIT,
      businessCategory: 'DATA_EXTRACTION',
      complianceFlags: ['DATA_SCRAPING', 'CONTENT_ANALYSIS', 'AI_PROCESSING'],
      requiredRoles: ['OPERATOR', 'ADMIN'],
      customRules: [
        {
          name: 'ai_extraction_validation',
          condition: 'extraction_type === "ai_powered"',
          action: 'REQUIRE_CONFIRMATION',
          priority: 9,
        },
        {
          name: 'css_selector_validation',
          condition: 'extraction_type === "css_selector"',
          action: 'APPROVE',
          priority: 5,
        },
      ],
    },
  )
  async extractData(
    @Param('sessionId') sessionId: string,
    @Body(new BrowserAutomationValidationPipe()) extractionRequest: BrowserDataExtractionDto,
    @CurrentUser() user: ByteBotdUser,
  ): Promise<{ jobId: string; submittedAt: string; sessionId: string; extractionType: string }> {
    const operationId = `extract_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    try {
      this.logger.log(
        `[${operationId}] Submitting data extraction job: ${extractionRequest.extractionType}`,
        {
          operationId,
          sessionId,
          extractionType: extractionRequest.extractionType,
          userId: user.id,
          username: user.username,
        },
      );

      // Submit extraction job via comprehensive orchestrator
      const jobId = await this.comprehensiveJobOrchestrator.submitJob(
        'browser_extract_data',
        {
          sessionId,
          ...extractionRequest,
        },
        {
          userId: user.id,
          username: user.username,
          operationId,
          source: 'browser-automation-api',
        },
      );

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `[${operationId}] Data extraction job submitted: ${jobId} (${processingTime}ms)`,
        {
          operationId,
          jobId,
          sessionId,
          extractionType: extractionRequest.extractionType,
          processingTime,
          userId: user.id,
        },
      );

      return {
        jobId,
        submittedAt: new Date().toISOString(),
        sessionId,
        extractionType: extractionRequest.extractionType,
      };
    } catch (error: unknown) {
      const processingTime = Date.now() - startTime;
      const errorMessage = getErrorMessage(error);

      this.logger.error(
        `[${operationId}] Error submitting data extraction job: ${errorMessage} (${processingTime}ms)`,
        getErrorStack(error),
        {
          operationId,
          sessionId,
          extractionType: extractionRequest.extractionType,
          processingTime,
          errorType: error?.constructor?.name ?? 'Unknown',
          userId: user.id,
          username: user.username,
        },
      );

      throw new HttpException(
        `Failed to submit data extraction job: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}