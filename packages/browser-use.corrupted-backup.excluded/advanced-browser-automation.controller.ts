import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
  InternalServerErrorException,
  UseGuards,
  Sse,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Express } from 'express';
import { BrowserSecurityGuard } from '../browser/guards/browser-security.guard';
import {
  BrowserTaskSecurity,
  BrowserSessionSecurity,
  BrowserAdminSecurity,
  BrowserPublic,
} from '../browser/decorators/security.decorators';
import { AdvancedBrowserAutomationService } from './advanced-browser-automation.service';

/**
 * Browser Performance Metrics DTO
 */
export class BrowserPerformanceMetricsDto {
  sessionId: string = '';
  timestamp: Date = new Date();
  navigationTiming: {
    domContentLoaded: number;
    loadComplete: number;
    firstPaint: number;
    firstContentfulPaint: number;
    largestContentfulPaint?: number;
    firstInputDelay?: number;
    cumulativeLayoutShift?: number;
  } = {
    domContentLoaded: 0,
    loadComplete: 0,
    firstPaint: 0,
    firstContentfulPaint: 0,
  };
  resourceMetrics: {
    totalRequests: number;
    totalSize: number;
    jsSize: number;
    cssSize: number;
    imageSize: number;
    failedRequests: number;
  } = {
    totalRequests: 0,
    totalSize: 0,
    jsSize: 0,
    cssSize: 0,
    imageSize: 0,
    failedRequests: 0,
  };
  memoryUsage: {
    jsHeapSizeLimit: number;
    totalJSHeapSize: number;
    usedJSHeapSize: number;
  } = {
    jsHeapSizeLimit: 0,
    totalJSHeapSize: 0,
    usedJSHeapSize: 0,
  };
  cpuUsage?: number;
  networkLatency?: number;
}

/**
 * Browser Profile Configuration DTO
 */
export class BrowserProfileConfigDto {
  profileName: string = '';
  userAgent?: string;
  viewport: {
    width: number;
    height: number;
    deviceScaleFactor?: number;
    isMobile?: boolean;
    hasTouch?: boolean;
  } = {
    width: 1920,
    height: 1080,
  };
  geolocation?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  timezone?: string;
  locale?: string;
  permissions?: string[];
  cookies?: Array<{
    name: string;
    value: string;
    domain: string;
    path?: string;
    expires?: number;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'Strict' | 'Lax' | 'None';
  }>;
  localStorage?: Record<string, string>;
  sessionStorage?: Record<string, string>;
  extensions?: string[]; // Extension IDs or paths
}

/**
 * Mobile Device Emulation DTO
 */
export class MobileDeviceEmulationDto {
  deviceName: string = '';
  userAgent: string = '';
  viewport: {
    width: number;
    height: number;
    deviceScaleFactor: number;
    isMobile: boolean;
    hasTouch: boolean;
    isLandscape?: boolean;
  } = {
    width: 375,
    height: 667,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  };
  network?: {
    offline: boolean;
    downloadThroughput?: number;
    uploadThroughput?: number;
    latency?: number;
  };
}

/**
 * Browser Extension Management DTO
 */
export class BrowserExtensionDto {
  extensionId: string = '';
  name: string = '';
  version: string = '';
  enabled: boolean = true;
  permissions: string[] = [];
  source: 'chrome-web-store' | 'local-file' | 'developer-mode' = 'local-file';
  installPath?: string;
  manifestData?: Record<string, unknown>;
}

/**
 * WebSocket Event Configuration DTO
 */
export class WebSocketEventConfigDto {
  sessionId: string = '';
  eventTypes: ('navigation' | 'dom-mutation' | 'network' | 'console' | 'performance' | 'error')[] = ['navigation'];
  includeScreenshots: boolean = false;
  throttleMs?: number;
  bufferSize?: number;
  compression?: boolean;
}

/**
 * Advanced Form Automation DTO
 */
export class AdvancedFormAutomationDto {
  sessionId: string = '';
  formSelector?: string;
  autoDetectFields: boolean = true;
  fieldMappings: Array<{
    selector?: string;
    fieldName?: string;
    fieldType: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'file';
    value: unknown;
    validation?: {
      required?: boolean;
      pattern?: string;
      minLength?: number;
      maxLength?: number;
      min?: number;
      max?: number;
    };
  }> = [];
  submitButton?: string;
  waitForSubmission: boolean = true;
  captchaHandling?: {
    enabled: boolean;
    service?: 'manual' | 'auto-detect' | 'external-api';
    apiKey?: string;
  };
}

/**
 * Browser Automation Recording DTO
 */
export class BrowserAutomationRecordingDto {
  sessionId: string = '';
  recordingName: string = '';
  includeEvents: ('click' | 'type' | 'scroll' | 'navigation' | 'form-submission')[] = ['click', 'type', 'navigation'];
  includeScreenshots: boolean = false;
  maxDuration?: number; // in milliseconds
  outputFormat: 'json' | 'puppeteer-script' | 'selenium-script' | 'cypress-script' = 'json';
}

/**
 * Advanced Browser Automation Controller
 *
 * Provides specialized REST API endpoints for advanced browser automation capabilities
 * including performance monitoring, mobile emulation, extension management, and
 * real-time WebSocket communication.
 *
 * Key Features:
 * - Browser performance monitoring and metrics collection
 * - Advanced browser profile management with custom configurations
 * - Mobile device emulation and responsive testing
 * - Browser extension injection and management
 * - Real-time WebSocket communication for live automation monitoring
 * - Advanced form automation with intelligent field detection
 * - Browser automation recording and script generation
 * - Network traffic analysis and manipulation
 *
 * Security Features:
 * - Enhanced JWT authentication with specialized permissions
 * - Role-based access control for advanced features
 * - Comprehensive input validation and sanitization
 * - Extension security scanning and validation
 * - Performance monitoring privacy controls
 *
 * @author Advanced Browser Automation Specialist
 * @version 1.0.0 - Advanced Features Implementation
 * @since Advanced Browser Automation Integration
 */
@ApiTags('Advanced Browser Automation')
@Controller('browser-use/advanced')
@UseGuards(BrowserSecurityGuard)
@ApiBearerAuth()
export class AdvancedBrowserAutomationController {
  private readonly logger = new Logger(AdvancedBrowserAutomationController.name);

  constructor(
    private readonly advancedBrowserService: AdvancedBrowserAutomationService,
  ) {
    this.logger.log('Advanced Browser Automation Controller initialized');
  }

  // ===========================
  // PERFORMANCE MONITORING
  // ===========================

  /**
   * Start performance monitoring for a browser session
   */
  @Post('performance/monitor/start/:sessionId')
  @HttpCode(HttpStatus.CREATED)
  @BrowserSessionSecurity()
  @ApiOperation({
    summary: 'Start performance monitoring',
    description: 'Begin collecting performance metrics for a browser session including Core Web Vitals, resource timing, and memory usage.',
  })
  @ApiParam({ name: 'sessionId', description: 'Browser session identifier' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Performance monitoring started successfully',
    type: Object,
  })
  async startPerformanceMonitoring(
    @Param('sessionId') sessionId: string,
  ): Promise<{ monitoringId: string; status: string; metricsCollected: string[] }> {
    this.logger.log(`Starting performance monitoring for session: ${sessionId}`);

    try {
      const result = await this.advancedBrowserService.startPerformanceMonitoring(sessionId);
      return result;
    } catch (error) {
      this.logger.error(`Failed to start performance monitoring: ${error instanceof Error ? error.message : String(error)}`);
      throw new InternalServerErrorException('Failed to start performance monitoring');
    }
  }

  /**
   * Get performance metrics for a session
   */
  @Get('performance/metrics/:sessionId')
  @BrowserSessionSecurity()
  @ApiOperation({
    summary: 'Get performance metrics',
    description: 'Retrieve comprehensive performance metrics including Core Web Vitals, resource timing, and memory usage.',
  })
  @ApiParam({ name: 'sessionId', description: 'Browser session identifier' })
  @ApiQuery({ name: 'timeRange', required: false, description: 'Time range in minutes for metrics aggregation' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Performance metrics retrieved successfully',
    type: BrowserPerformanceMetricsDto,
  })
  async getPerformanceMetrics(
    @Param('sessionId') sessionId: string,
    @Query('timeRange') timeRange?: number,
  ): Promise<BrowserPerformanceMetricsDto> {
    this.logger.log(`Getting performance metrics for session: ${sessionId}`);

    try {
      const metrics = await this.advancedBrowserService.getPerformanceMetrics(sessionId, timeRange);
      return metrics;
    } catch (error) {
      this.logger.error(`Failed to get performance metrics: ${error instanceof Error ? error.message : String(error)}`);
      throw new NotFoundException('Performance metrics not found or session inactive');
    }
  }

  // ===========================
  // ADVANCED BROWSER PROFILES
  // ===========================

  /**
   * Create advanced browser profile with custom configuration
   */
  @Post('profiles')
  @HttpCode(HttpStatus.CREATED)
  @BrowserAdminSecurity()
  @ApiOperation({
    summary: 'Create browser profile',
    description: 'Create a custom browser profile with specific configurations for user agent, viewport, geolocation, and extensions.',
  })
  @ApiBody({ type: BrowserProfileConfigDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Browser profile created successfully',
    type: Object,
  })
  async createBrowserProfile(
    @Body() profileConfig: BrowserProfileConfigDto,
  ): Promise<{ profileId: string; status: string; configuration: BrowserProfileConfigDto }> {
    this.logger.log(`Creating browser profile: ${profileConfig.profileName}`);

    try {
      const result = await this.advancedBrowserService.createBrowserProfile(profileConfig);
      return result;
    } catch (error) {
      this.logger.error(`Failed to create browser profile: ${error instanceof Error ? error.message : String(error)}`);
      throw new InternalServerErrorException('Failed to create browser profile');
    }
  }

  /**
   * Launch session with specific browser profile
   */
  @Post('profiles/:profileId/launch')
  @HttpCode(HttpStatus.CREATED)
  @BrowserSessionSecurity()
  @ApiOperation({
    summary: 'Launch session with profile',
    description: 'Start a new browser session using a specific browser profile configuration.',
  })
  @ApiParam({ name: 'profileId', description: 'Browser profile identifier' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Browser session launched with profile',
    type: Object,
  })
  async launchSessionWithProfile(
    @Param('profileId') profileId: string,
  ): Promise<{ sessionId: string; profileId: string; status: string; configuration: unknown }> {
    this.logger.log(`Launching session with profile: ${profileId}`);

    try {
      const result = await this.advancedBrowserService.launchSessionWithProfile(profileId);
      return result;
    } catch (error) {
      this.logger.error(`Failed to launch session with profile: ${error instanceof Error ? error.message : String(error)}`);
      throw new InternalServerErrorException('Failed to launch session with profile');
    }
  }

  // ===========================
  // MOBILE DEVICE EMULATION
  // ===========================

  /**
   * Enable mobile device emulation
   */
  @Post('mobile/emulate/:sessionId')
  @HttpCode(HttpStatus.OK)
  @BrowserSessionSecurity()
  @ApiOperation({
    summary: 'Enable mobile emulation',
    description: 'Configure browser session to emulate specific mobile devices with custom viewport and network conditions.',
  })
  @ApiParam({ name: 'sessionId', description: 'Browser session identifier' })
  @ApiBody({ type: MobileDeviceEmulationDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Mobile device emulation enabled',
    type: Object,
  })
  async enableMobileEmulation(
    @Param('sessionId') sessionId: string,
    @Body() emulationConfig: MobileDeviceEmulationDto,
  ): Promise<{ sessionId: string; deviceEmulated: string; status: string }> {
    this.logger.log(`Enabling mobile emulation for session: ${sessionId}, device: ${emulationConfig.deviceName}`);

    try {
      const result = await this.advancedBrowserService.enableMobileEmulation(sessionId, emulationConfig);
      return result;
    } catch (error) {
      this.logger.error(`Failed to enable mobile emulation: ${error instanceof Error ? error.message : String(error)}`);
      throw new InternalServerErrorException('Failed to enable mobile emulation');
    }
  }

  /**
   * Get predefined mobile device configurations
   */
  @Get('mobile/devices')
  @BrowserPublic()
  @ApiOperation({
    summary: 'Get mobile device configurations',
    description: 'Retrieve list of predefined mobile device configurations for emulation.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Mobile device configurations retrieved',
    type: [MobileDeviceEmulationDto],
  })
  async getMobileDeviceConfigurations(): Promise<MobileDeviceEmulationDto[]> {
    this.logger.log('Getting mobile device configurations');

    try {
      const devices = await this.advancedBrowserService.getMobileDeviceConfigurations();
      return devices;
    } catch (error) {
      this.logger.error(`Failed to get mobile device configurations: ${error instanceof Error ? error.message : String(error)}`);
      throw new InternalServerErrorException('Failed to get mobile device configurations');
    }
  }

  // ===========================
  // BROWSER EXTENSION MANAGEMENT
  // ===========================

  /**
   * Install browser extension
   */
  @Post('extensions/install/:sessionId')
  @HttpCode(HttpStatus.CREATED)
  @BrowserAdminSecurity()
  @ApiOperation({
    summary: 'Install browser extension',
    description: 'Install a browser extension from the Chrome Web Store or local file in a browser session.',
  })
  @ApiParam({ name: 'sessionId', description: 'Browser session identifier' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('extensionFile'))
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Browser extension installed successfully',
    type: BrowserExtensionDto,
  })
  async installBrowserExtension(
    @Param('sessionId') sessionId: string,
    @Body() installConfig: { extensionId?: string; source: 'chrome-web-store' | 'local-file' },
    @UploadedFile() extensionFile?: any,
  ): Promise<BrowserExtensionDto> {
    this.logger.log(`Installing browser extension for session: ${sessionId}`);

    if (installConfig.source === 'local-file' && !extensionFile) {
      throw new BadRequestException('Extension file is required for local installation');
    }

    try {
      const result = await this.advancedBrowserService.installBrowserExtension(
        sessionId,
        installConfig,
        extensionFile,
      );
      return result;
    } catch (error) {
      this.logger.error(`Failed to install browser extension: ${error instanceof Error ? error.message : String(error)}`);
      throw new InternalServerErrorException('Failed to install browser extension');
    }
  }

  /**
   * List installed extensions
   */
  @Get('extensions/:sessionId')
  @BrowserSessionSecurity()
  @ApiOperation({
    summary: 'List installed extensions',
    description: 'Get list of all installed browser extensions in a session.',
  })
  @ApiParam({ name: 'sessionId', description: 'Browser session identifier' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Installed extensions retrieved',
    type: [BrowserExtensionDto],
  })
  async getInstalledExtensions(
    @Param('sessionId') sessionId: string,
  ): Promise<BrowserExtensionDto[]> {
    this.logger.log(`Getting installed extensions for session: ${sessionId}`);

    try {
      const extensions = await this.advancedBrowserService.getInstalledExtensions(sessionId);
      return extensions;
    } catch (error) {
      this.logger.error(`Failed to get installed extensions: ${error instanceof Error ? error.message : String(error)}`);
      throw new NotFoundException('Extensions not found or session inactive');
    }
  }

  // ===========================
  // REAL-TIME WEBSOCKET COMMUNICATION
  // ===========================

  /**
   * Start WebSocket event streaming
   */
  @Post('websocket/start/:sessionId')
  @HttpCode(HttpStatus.CREATED)
  @BrowserSessionSecurity()
  @ApiOperation({
    summary: 'Start WebSocket event streaming',
    description: 'Begin real-time WebSocket streaming of browser events including DOM mutations, network requests, and performance metrics.',
  })
  @ApiParam({ name: 'sessionId', description: 'Browser session identifier' })
  @ApiBody({ type: WebSocketEventConfigDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'WebSocket event streaming started',
    type: Object,
  })
  async startWebSocketEventStreaming(
    @Param('sessionId') sessionId: string,
    @Body() eventConfig: WebSocketEventConfigDto,
  ): Promise<{ connectionId: string; wsUrl: string; eventTypes: string[]; status: string }> {
    this.logger.log(`Starting WebSocket event streaming for session: ${sessionId}`);

    try {
      const result = await this.advancedBrowserService.startWebSocketEventStreaming(sessionId, eventConfig);
      return result;
    } catch (error) {
      this.logger.error(`Failed to start WebSocket event streaming: ${error instanceof Error ? error.message : String(error)}`);
      throw new InternalServerErrorException('Failed to start WebSocket event streaming');
    }
  }

  /**
   * Real-time browser events SSE stream
   */
  @Sse('events/stream/:sessionId')
  @ApiOperation({
    summary: 'Real-time browser events stream',
    description: 'Server-Sent Events stream for real-time browser automation monitoring with live updates.',
  })
  @ApiParam({ name: 'sessionId', description: 'Browser session identifier' })
  @ApiQuery({ name: 'eventTypes', required: false, description: 'Comma-separated event types to stream' })
  async streamBrowserEvents(
    @Param('sessionId') sessionId: string,
    @Query('eventTypes') eventTypes?: string,
  ): Promise<Observable<{ data: unknown; type?: string; id?: string; retry?: number }>> {
    this.logger.log(`Starting event stream for session: ${sessionId}`);

    const eventTypeList = eventTypes ? eventTypes.split(',') : ['all'];

    return this.advancedBrowserService.getBrowserEventStream(sessionId, eventTypeList).pipe(
      map(event => ({
        data: event,
        type: event.type || 'browser-event',
        id: event.id || Date.now().toString(),
        retry: 1000,
      })),
    );
  }

  // ===========================
  // ADVANCED FORM AUTOMATION
  // ===========================

  /**
   * Intelligent form automation with auto-detection
   */
  @Post('forms/auto-fill/:sessionId')
  @HttpCode(HttpStatus.OK)
  @BrowserTaskSecurity()
  @ApiOperation({
    summary: 'Intelligent form automation',
    description: 'Automatically detect and fill form fields with intelligent field mapping and validation.',
  })
  @ApiParam({ name: 'sessionId', description: 'Browser session identifier' })
  @ApiBody({ type: AdvancedFormAutomationDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Form automated successfully',
    type: Object,
  })
  async automateFormIntelligently(
    @Param('sessionId') sessionId: string,
    @Body() formConfig: AdvancedFormAutomationDto,
  ): Promise<{ sessionId: string; fieldsProcessed: number; validationResults: unknown; status: string }> {
    this.logger.log(`Starting intelligent form automation for session: ${sessionId}`);

    try {
      const result = await this.advancedBrowserService.automateFormIntelligently(sessionId, formConfig);
      return result;
    } catch (error) {
      this.logger.error(`Failed to automate form: ${error instanceof Error ? error.message : String(error)}`);
      throw new InternalServerErrorException('Failed to automate form');
    }
  }

  // ===========================
  // AUTOMATION RECORDING
  // ===========================

  /**
   * Start recording browser automation
   */
  @Post('recording/start/:sessionId')
  @HttpCode(HttpStatus.CREATED)
  @BrowserSessionSecurity()
  @ApiOperation({
    summary: 'Start automation recording',
    description: 'Begin recording browser interactions to generate automation scripts in various formats.',
  })
  @ApiParam({ name: 'sessionId', description: 'Browser session identifier' })
  @ApiBody({ type: BrowserAutomationRecordingDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Automation recording started',
    type: Object,
  })
  async startAutomationRecording(
    @Param('sessionId') sessionId: string,
    @Body() recordingConfig: BrowserAutomationRecordingDto,
  ): Promise<{ recordingId: string; sessionId: string; status: string; outputFormat: string }> {
    this.logger.log(`Starting automation recording for session: ${sessionId}`);

    try {
      const result = await this.advancedBrowserService.startAutomationRecording(sessionId, recordingConfig);
      return result;
    } catch (error) {
      this.logger.error(`Failed to start automation recording: ${error instanceof Error ? error.message : String(error)}`);
      throw new InternalServerErrorException('Failed to start automation recording');
    }
  }

  /**
   * Stop recording and generate script
   */
  @Post('recording/stop/:recordingId')
  @HttpCode(HttpStatus.OK)
  @BrowserSessionSecurity()
  @ApiOperation({
    summary: 'Stop recording and generate script',
    description: 'Stop automation recording and generate executable script in the specified format.',
  })
  @ApiParam({ name: 'recordingId', description: 'Recording identifier' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Recording stopped and script generated',
    type: Object,
  })
  async stopAutomationRecording(
    @Param('recordingId') recordingId: string,
  ): Promise<{ recordingId: string; script: string; format: string; statistics: unknown }> {
    this.logger.log(`Stopping automation recording: ${recordingId}`);

    try {
      const result = await this.advancedBrowserService.stopAutomationRecording(recordingId);
      return result;
    } catch (error) {
      this.logger.error(`Failed to stop automation recording: ${error instanceof Error ? error.message : String(error)}`);
      throw new InternalServerErrorException('Failed to stop automation recording');
    }
  }

  // ===========================
  // HEALTH AND CAPABILITIES
  // ===========================

  /**
   * Get advanced automation capabilities
   */
  @Get('capabilities')
  @BrowserPublic()
  @ApiOperation({
    summary: 'Get advanced automation capabilities',
    description: 'Retrieve information about available advanced automation features and system capabilities.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Advanced capabilities retrieved',
    type: Object,
  })
  async getAdvancedCapabilities(): Promise<{
    performanceMonitoring: boolean;
    mobileEmulation: boolean;
    extensionManagement: boolean;
    realtimeWebSocket: boolean;
    formAutomation: boolean;
    automationRecording: boolean;
    supportedDevices: string[];
    supportedBrowsers: string[];
    maxConcurrentSessions: number;
  }> {
    this.logger.log('Getting advanced automation capabilities');

    try {
      const capabilities = await this.advancedBrowserService.getAdvancedCapabilities();
      return capabilities;
    } catch (error) {
      this.logger.error(`Failed to get advanced capabilities: ${error instanceof Error ? error.message : String(error)}`);
      throw new InternalServerErrorException('Failed to get advanced capabilities');
    }
  }
}