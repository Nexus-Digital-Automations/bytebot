/**
 * Enhanced Session Configuration DTOs - Enterprise Browser Session Management
 *
 * This module provides comprehensive Data Transfer Objects for browser session
 * configuration with advanced security, performance optimization, and enterprise-grade
 * management features. Supports sophisticated browser automation scenarios.
 *
 * @fileoverview Enhanced session configuration DTOs with enterprise features
 * @version 2.0.0
 * @author DTO & Validation Agent
 * @since Browser-Use API Endpoints Implementation
 */

import {
  IsString,
  IsOptional,
  IsEnum,
  IsObject,
  IsArray,
  IsNumber,
  IsBoolean,
  ValidateNested,
  Min,
  Max,
  MinLength,
  MaxLength,
  Matches,
  ArrayMinSize,
  ArrayMaxSize,
  IsUUID,
  IsPositive,
  IsIP,
  IsUrl,
  IsEmail,
  IsFQDN,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Enhanced browser types with version control
 */
export enum BrowserType {
  CHROME = 'chrome',
  CHROMIUM = 'chromium',
  FIREFOX = 'firefox',
  WEBKIT = 'webkit',
  EDGE = 'edge',
  SAFARI = 'safari',
}

/**
 * Browser session security levels
 */
export enum SessionSecurityLevel {
  MINIMAL = 'minimal', // Basic security, maximum performance
  STANDARD = 'standard', // Balanced security and performance
  ENHANCED = 'enhanced', // Higher security with some performance cost
  MAXIMUM = 'maximum', // Maximum security, may impact performance
  COMPLIANCE = 'compliance', // Compliance-focused security settings
}

/**
 * Session isolation levels
 */
export enum SessionIsolationLevel {
  SHARED = 'shared', // Shared browser instance
  PROCESS = 'process', // Separate process per session
  CONTAINER = 'container', // Containerized isolation
  VIRTUAL_MACHINE = 'virtual_machine', // VM-level isolation
}

/**
 * Performance optimization profiles
 */
export enum PerformanceProfile {
  SPEED = 'speed', // Maximum speed, minimal features
  BALANCED = 'balanced', // Balanced speed and features
  QUALITY = 'quality', // Quality over speed
  COMPATIBILITY = 'compatibility', // Maximum compatibility
  CUSTOM = 'custom', // Custom configuration
}

/**
 * Browser automation frameworks
 */
export enum AutomationFramework {
  PUPPETEER = 'puppeteer',
  PLAYWRIGHT = 'playwright',
  SELENIUM = 'selenium',
  CHROMEDP = 'chromedp',
  CUSTOM = 'custom',
}

/**
 * Session monitoring levels
 */
export enum MonitoringLevel {
  NONE = 'none',
  BASIC = 'basic',
  DETAILED = 'detailed',
  COMPREHENSIVE = 'comprehensive',
  DEBUG = 'debug',
}

/**
 * Advanced browser arguments configuration
 */
export class BrowserArguments {
  @ApiPropertyOptional({
    description: 'Security-related browser arguments',
    example: ['--no-sandbox', '--disable-dev-shm-usage'],
    type: [String],
  })
  @IsOptional()
  @IsArray({ message: 'Security args must be an array' })
  @IsString({ each: true, message: 'Each security arg must be a string' })
  @ArrayMaxSize(50, { message: 'Too many security arguments' })
  securityArgs?: string[];

  @ApiPropertyOptional({
    description: 'Performance optimization arguments',
    example: ['--disable-extensions', '--disable-plugins'],
    type: [String],
  })
  @IsOptional()
  @IsArray({ message: 'Performance args must be an array' })
  @IsString({ each: true, message: 'Each performance arg must be a string' })
  @ArrayMaxSize(50, { message: 'Too many performance arguments' })
  performanceArgs?: string[];

  @ApiPropertyOptional({
    description: 'Privacy and tracking arguments',
    example: [
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
    ],
    type: [String],
  })
  @IsOptional()
  @IsArray({ message: 'Privacy args must be an array' })
  @IsString({ each: true, message: 'Each privacy arg must be a string' })
  @ArrayMaxSize(30, { message: 'Too many privacy arguments' })
  privacyArgs?: string[];

  @ApiPropertyOptional({
    description: 'Custom additional arguments',
    example: ['--window-size=1920,1080', '--force-device-scale-factor=1'],
    type: [String],
  })
  @IsOptional()
  @IsArray({ message: 'Custom args must be an array' })
  @IsString({ each: true, message: 'Each custom arg must be a string' })
  @ArrayMaxSize(100, { message: 'Too many custom arguments' })
  customArgs?: string[];

  @ApiPropertyOptional({
    description: 'Feature flags to enable/disable',
    example: { WebRTC: false, WebGL: true },
  })
  @IsOptional()
  @IsObject({ message: 'Feature flags must be an object' })
  featureFlags?: Record<string, boolean>;
}

/**
 * Network configuration for browser sessions
 */
export class NetworkConfiguration {
  @ApiPropertyOptional({
    description: 'HTTP proxy configuration',
  })
  @IsOptional()
  @IsObject()
  httpProxy?: {
    server: string;
    username?: string;
    password?: string;
    bypass?: string[];
  };

  @ApiPropertyOptional({
    description: 'SOCKS proxy configuration',
  })
  @IsOptional()
  @IsObject()
  socksProxy?: {
    server: string;
    username?: string;
    password?: string;
    version?: 4 | 5;
  };

  @ApiPropertyOptional({
    description: 'Custom DNS servers',
    example: ['8.8.8.8', '1.1.1.1'],
    type: [String],
  })
  @IsOptional()
  @IsArray({ message: 'DNS servers must be an array' })
  @IsIP(undefined, { each: true, message: 'Invalid DNS server IP' })
  @ArrayMaxSize(10, { message: 'Too many DNS servers' })
  dnsServers?: string[];

  @ApiPropertyOptional({
    description: 'Network timeout configurations (milliseconds)',
  })
  @IsOptional()
  @IsObject()
  timeouts?: {
    connection?: number;
    response?: number;
    idle?: number;
    dns?: number;
  };

  @ApiPropertyOptional({
    description: 'Request rate limiting',
  })
  @IsOptional()
  @IsObject()
  rateLimiting?: {
    maxConcurrentRequests?: number;
    requestsPerSecond?: number;
    requestsPerMinute?: number;
    burstLimit?: number;
  };

  @ApiPropertyOptional({
    description: 'Network interception rules',
    type: [Object],
  })
  @IsOptional()
  @IsArray({ message: 'Interception rules must be an array' })
  @ArrayMaxSize(100, { message: 'Too many interception rules' })
  interceptionRules?: Array<{
    pattern: string;
    action: 'block' | 'allow' | 'modify';
    response?: {
      status?: number;
      headers?: Record<string, string>;
      body?: string;
    };
  }>;

  @ApiPropertyOptional({
    description: 'Enable offline mode',
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Offline mode must be boolean' })
  offlineMode?: boolean = false;

  @ApiPropertyOptional({
    description: 'Custom user agent string',
    example: 'Mozilla/5.0 (Enterprise Bot 1.0)',
  })
  @IsOptional()
  @IsString({ message: 'User agent must be a string' })
  @MaxLength(500, { message: 'User agent too long' })
  userAgent?: string;

  @ApiPropertyOptional({
    description: 'Extra HTTP headers for all requests',
  })
  @IsOptional()
  @IsObject({ message: 'Extra headers must be an object' })
  extraHeaders?: Record<string, string>;
}

/**
 * Resource management configuration
 */
export class ResourceManagement {
  @ApiPropertyOptional({
    description: 'Maximum memory usage in MB',
    minimum: 128,
    maximum: 32768,
    default: 2048,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Max memory must be a number' })
  @Min(128, { message: 'Max memory too low' })
  @Max(32768, { message: 'Max memory too high' })
  maxMemoryMB?: number = 2048;

  @ApiPropertyOptional({
    description: 'CPU usage limit percentage',
    minimum: 10,
    maximum: 100,
    default: 80,
  })
  @IsOptional()
  @IsNumber({}, { message: 'CPU limit must be a number' })
  @Min(10, { message: 'CPU limit too low' })
  @Max(100, { message: 'CPU limit too high' })
  cpuLimitPercent?: number = 80;

  @ApiPropertyOptional({
    description: 'Disk cache size in MB',
    minimum: 10,
    maximum: 10240,
    default: 256,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Cache size must be a number' })
  @Min(10, { message: 'Cache size too small' })
  @Max(10240, { message: 'Cache size too large' })
  diskCacheSizeMB?: number = 256;

  @ApiPropertyOptional({
    description: 'Maximum number of open tabs',
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Max tabs must be a number' })
  @Min(1, { message: 'Must allow at least 1 tab' })
  @Max(100, { message: 'Too many tabs allowed' })
  maxTabs?: number = 10;

  @ApiPropertyOptional({
    description: 'Session idle timeout in seconds',
    minimum: 60,
    maximum: 86400,
    default: 3600,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Idle timeout must be a number' })
  @Min(60, { message: 'Idle timeout too short' })
  @Max(86400, { message: 'Idle timeout too long' })
  idleTimeoutSeconds?: number = 3600;

  @ApiPropertyOptional({
    description: 'Maximum session duration in seconds',
    minimum: 300,
    maximum: 172800,
    default: 7200,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Max duration must be a number' })
  @Min(300, { message: 'Max duration too short' })
  @Max(172800, { message: 'Max duration too long' })
  maxSessionDurationSeconds?: number = 7200;

  @ApiPropertyOptional({
    description: 'Enable automatic garbage collection',
    default: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'Auto GC must be boolean' })
  enableAutoGarbageCollection?: boolean = true;

  @ApiPropertyOptional({
    description: 'Resource cleanup thresholds',
  })
  @IsOptional()
  @IsObject()
  cleanupThresholds?: {
    memoryThresholdMB?: number;
    cpuThresholdPercent?: number;
    idleTimeSeconds?: number;
    tabCountThreshold?: number;
  };
}

/**
 * Security and compliance configuration
 */
export class SecurityConfiguration {
  @ApiPropertyOptional({
    description: 'Security level for the session',
    enum: SessionSecurityLevel,
    default: SessionSecurityLevel.STANDARD,
  })
  @IsOptional()
  @IsEnum(SessionSecurityLevel, { message: 'Invalid security level' })
  securityLevel?: SessionSecurityLevel = SessionSecurityLevel.STANDARD;

  @ApiPropertyOptional({
    description: 'Session isolation level',
    enum: SessionIsolationLevel,
    default: SessionIsolationLevel.PROCESS,
  })
  @IsOptional()
  @IsEnum(SessionIsolationLevel, { message: 'Invalid isolation level' })
  isolationLevel?: SessionIsolationLevel = SessionIsolationLevel.PROCESS;

  @ApiPropertyOptional({
    description: 'Enable sandbox mode',
    default: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'Sandbox mode must be boolean' })
  enableSandbox?: boolean = true;

  @ApiPropertyOptional({
    description: 'Disable JavaScript execution',
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Disable JavaScript must be boolean' })
  disableJavaScript?: boolean = false;

  @ApiPropertyOptional({
    description: 'Disable web security features',
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Disable web security must be boolean' })
  disableWebSecurity?: boolean = false;

  @ApiPropertyOptional({
    description: 'Content Security Policy',
    example: "default-src 'self'; script-src 'unsafe-inline'",
  })
  @IsOptional()
  @IsString({ message: 'CSP must be a string' })
  @MaxLength(2000, { message: 'CSP too long' })
  contentSecurityPolicy?: string;

  @ApiPropertyOptional({
    description: 'Blocked content types',
    example: ['ads', 'trackers', 'analytics'],
    type: [String],
  })
  @IsOptional()
  @IsArray({ message: 'Blocked content must be an array' })
  @IsString({ each: true, message: 'Each blocked type must be a string' })
  @ArrayMaxSize(20, { message: 'Too many blocked content types' })
  blockedContentTypes?: string[];

  @ApiPropertyOptional({
    description: 'Certificate validation settings',
  })
  @IsOptional()
  @IsObject()
  certificateValidation?: {
    ignoreCertificateErrors?: boolean;
    acceptSelfSignedCertificates?: boolean;
    customCABundle?: string;
    requireValidCertificate?: boolean;
  };

  @ApiPropertyOptional({
    description: 'Privacy settings',
  })
  @IsOptional()
  @IsObject()
  privacySettings?: {
    blockThirdPartyCookies?: boolean;
    disableTracking?: boolean;
    enableDoNotTrack?: boolean;
    clearDataOnExit?: boolean;
    blockFingerprinting?: boolean;
  };

  @ApiPropertyOptional({
    description: 'Compliance requirements',
    example: ['GDPR', 'CCPA', 'SOX'],
    type: [String],
  })
  @IsOptional()
  @IsArray({ message: 'Compliance requirements must be an array' })
  @IsString({ each: true, message: 'Each requirement must be a string' })
  @ArrayMaxSize(10, { message: 'Too many compliance requirements' })
  complianceRequirements?: string[];
}

/**
 * Browser capability configuration
 */
export class BrowserCapabilities {
  @ApiPropertyOptional({
    description: 'Enable headless mode',
    default: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'Headless mode must be boolean' })
  headless?: boolean = true;

  @ApiPropertyOptional({
    description: 'Enable DevTools protocol',
    default: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'DevTools must be boolean' })
  enableDevTools?: boolean = true;

  @ApiPropertyOptional({
    description: 'Viewport configuration',
  })
  @IsOptional()
  @IsObject()
  viewport?: {
    width: number;
    height: number;
    deviceScaleFactor?: number;
    isMobile?: boolean;
    hasTouch?: boolean;
    isLandscape?: boolean;
  };

  @ApiPropertyOptional({
    description: 'Geolocation settings',
  })
  @IsOptional()
  @IsObject()
  geolocation?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };

  @ApiPropertyOptional({
    description: 'Timezone setting',
    example: 'America/New_York',
  })
  @IsOptional()
  @IsString({ message: 'Timezone must be a string' })
  @MaxLength(100, { message: 'Timezone name too long' })
  timezone?: string;

  @ApiPropertyOptional({
    description: 'Locale setting',
    example: 'en-US',
  })
  @IsOptional()
  @IsString({ message: 'Locale must be a string' })
  @Matches(/^[a-z]{2}-[A-Z]{2}$/, { message: 'Invalid locale format' })
  locale?: string;

  @ApiPropertyOptional({
    description: 'Media capabilities',
  })
  @IsOptional()
  @IsObject()
  mediaCapabilities?: {
    enableAudio?: boolean;
    enableVideo?: boolean;
    enableWebRTC?: boolean;
    audioCodecs?: string[];
    videoCodecs?: string[];
  };

  @ApiPropertyOptional({
    description: 'Download behavior',
  })
  @IsOptional()
  @IsObject()
  downloadBehavior?: {
    enabled?: boolean;
    downloadPath?: string;
    autoDownload?: boolean;
    maxDownloadSizeMB?: number;
    allowedFileTypes?: string[];
    blockedFileTypes?: string[];
  };
}

/**
 * Enhanced Session Configuration DTO
 */
export class SessionConfigDto {
  @ApiProperty({
    description: 'Human-readable session name',
    example: 'E-commerce Data Collection Session',
    minLength: 3,
    maxLength: 200,
  })
  @IsString({ message: 'Session name must be a string' })
  @MinLength(3, { message: 'Session name too short' })
  @MaxLength(200, { message: 'Session name too long' })
  @Matches(/^[a-zA-Z0-9\s\-_.()]+$/, {
    message: 'Session name contains invalid characters',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name!: string;

  @ApiPropertyOptional({
    description: 'Detailed session description',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  @MaxLength(1000, { message: 'Description too long' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  description?: string;

  @ApiPropertyOptional({
    description: 'Browser type and version',
    enum: BrowserType,
    default: BrowserType.CHROMIUM,
  })
  @IsOptional()
  @IsEnum(BrowserType, { message: 'Invalid browser type' })
  browserType?: BrowserType = BrowserType.CHROMIUM;

  @ApiPropertyOptional({
    description: 'Automation framework to use',
    enum: AutomationFramework,
    default: AutomationFramework.PUPPETEER,
  })
  @IsOptional()
  @IsEnum(AutomationFramework, { message: 'Invalid automation framework' })
  automationFramework?: AutomationFramework = AutomationFramework.PUPPETEER;

  @ApiPropertyOptional({
    description: 'Performance optimization profile',
    enum: PerformanceProfile,
    default: PerformanceProfile.BALANCED,
  })
  @IsOptional()
  @IsEnum(PerformanceProfile, { message: 'Invalid performance profile' })
  performanceProfile?: PerformanceProfile = PerformanceProfile.BALANCED;

  @ApiPropertyOptional({
    description: 'Session monitoring level',
    enum: MonitoringLevel,
    default: MonitoringLevel.BASIC,
  })
  @IsOptional()
  @IsEnum(MonitoringLevel, { message: 'Invalid monitoring level' })
  monitoringLevel?: MonitoringLevel = MonitoringLevel.BASIC;

  @ApiPropertyOptional({
    description: 'Custom browser executable path',
    example: '/usr/bin/google-chrome',
  })
  @IsOptional()
  @IsString({ message: 'Executable path must be a string' })
  @MaxLength(500, { message: 'Executable path too long' })
  executablePath?: string;

  @ApiPropertyOptional({
    description: 'User data directory for browser profile',
    example: '/tmp/browser-profile-12345',
  })
  @IsOptional()
  @IsString({ message: 'User data directory must be a string' })
  @MaxLength(500, { message: 'User data directory path too long' })
  userDataDir?: string;

  @ApiPropertyOptional({
    description: 'Browser launch arguments configuration',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => BrowserArguments)
  browserArguments?: BrowserArguments;

  @ApiPropertyOptional({
    description: 'Network configuration for the session',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => NetworkConfiguration)
  networkConfig?: NetworkConfiguration;

  @ApiPropertyOptional({
    description: 'Resource management settings',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ResourceManagement)
  resourceManagement?: ResourceManagement;

  @ApiPropertyOptional({
    description: 'Security and compliance configuration',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => SecurityConfiguration)
  securityConfig?: SecurityConfiguration;

  @ApiPropertyOptional({
    description: 'Browser capabilities and features',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => BrowserCapabilities)
  capabilities?: BrowserCapabilities;

  @ApiPropertyOptional({
    description: 'Initial URL to navigate to after session creation',
    example: 'https://example.com/start',
  })
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'] }, { message: 'Invalid initial URL' })
  @MaxLength(2048, { message: 'Initial URL too long' })
  initialUrl?: string;

  @ApiPropertyOptional({
    description: 'Session tags for organization and filtering',
    example: ['automation', 'testing', 'production'],
    type: [String],
  })
  @IsOptional()
  @IsArray({ message: 'Tags must be an array' })
  @IsString({ each: true, message: 'Each tag must be a string' })
  @ArrayMaxSize(20, { message: 'Too many tags' })
  @MaxLength(50, { each: true, message: 'Tag too long' })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Session metadata for tracking and reporting',
  })
  @IsOptional()
  @IsObject({ message: 'Metadata must be an object' })
  metadata?: {
    businessUnit?: string;
    projectId?: string;
    environment?: string;
    costCenter?: string;
    owner?: string;
    purpose?: string;
    dataClassification?: string;
  };

  @ApiPropertyOptional({
    description: 'Enable session persistence across restarts',
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Session persistence must be boolean' })
  enablePersistence?: boolean = false;

  @ApiPropertyOptional({
    description: 'Session scheduling configuration',
  })
  @IsOptional()
  @IsObject()
  scheduling?: {
    scheduleAt?: Date;
    cronExpression?: string;
    timezone?: string;
    maxOccurrences?: number;
    retryPolicy?: {
      maxRetries: number;
      backoffMultiplier: number;
      maxBackoffSeconds: number;
    };
  };

  @ApiPropertyOptional({
    description: 'Custom environment variables for the browser process',
  })
  @IsOptional()
  @IsObject({ message: 'Environment variables must be an object' })
  environmentVariables?: Record<string, string>;
}

/**
 * Session Status Response DTO
 */
export class SessionStatusDto {
  @ApiProperty({ description: 'Unique session identifier' })
  @IsUUID(4, { message: 'Invalid session ID format' })
  id!: string;

  @ApiProperty({ description: 'Session name' })
  @IsString()
  name!: string;

  @ApiProperty({ description: 'Current session status' })
  @IsEnum([
    'initializing',
    'active',
    'idle',
    'suspended',
    'closing',
    'closed',
    'error',
  ])
  status!: string;

  @ApiProperty({ description: 'Session creation timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last activity timestamp' })
  lastActivity!: Date;

  @ApiProperty({ description: 'Session configuration used' })
  configuration!: SessionConfigDto;

  @ApiProperty({ description: 'Real-time session metrics' })
  metrics!: {
    uptime: number;
    memoryUsageMB: number;
    cpuUsagePercent: number;
    networkRequestsCount: number;
    activeTabsCount: number;
    totalPagesVisited: number;
    totalActionsPerformed: number;
    errorCount: number;
    warningCount: number;
  };

  @ApiProperty({ description: 'Session health indicators' })
  health!: {
    overall: 'healthy' | 'warning' | 'critical' | 'unknown';
    indicators: Array<{
      name: string;
      status: 'healthy' | 'warning' | 'critical';
      value: string | number;
      threshold?: string | number;
      message?: string;
    }>;
    lastHealthCheck: Date;
  };

  @ApiProperty({ description: 'Active browser tabs information' })
  @IsOptional()
  tabs?: Array<{
    id: string;
    title: string;
    url: string;
    active: boolean;
    loadingStatus: string;
    lastActivity: Date;
  }>;

  @ApiProperty({ description: 'Current session capabilities' })
  @IsOptional()
  activeCapabilities?: {
    javascriptEnabled: boolean;
    imagesEnabled: boolean;
    cookiesEnabled: boolean;
    localStorageEnabled: boolean;
    geolocationEnabled: boolean;
    notificationsEnabled: boolean;
  };

  @ApiProperty({ description: 'Error information if session failed' })
  @IsOptional()
  error?: {
    code: string;
    message: string;
    category:
      | 'initialization'
      | 'runtime'
      | 'resource'
      | 'security'
      | 'network';
    severity: 'low' | 'medium' | 'high' | 'critical';
    timestamp: Date;
    recoverable: boolean;
    context?: Record<string, unknown>;
  };

  @ApiProperty({ description: 'Response generation timestamp' })
  timestamp!: Date;
}

// Export enhanced session configuration DTOs
export {
  BrowserType,
  SessionSecurityLevel,
  SessionIsolationLevel,
  PerformanceProfile,
  AutomationFramework,
  MonitoringLevel,
  BrowserArguments,
  NetworkConfiguration,
  ResourceManagement,
  SecurityConfiguration,
  BrowserCapabilities,
};
