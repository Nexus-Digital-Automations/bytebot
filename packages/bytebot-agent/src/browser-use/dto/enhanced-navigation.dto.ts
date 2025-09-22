/**
 * Enhanced Navigation DTOs - Secure Browser Navigation
 *
 * This module provides comprehensive Data Transfer Objects for secure browser
 * navigation with advanced URL validation, security controls, and performance
 * optimization. Implements enterprise-grade security measures for web automation.
 *
 * @fileoverview Enhanced navigation DTOs with security and performance features
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
  IsUrl,
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
  IsEmail,
  IsIP,
  IsFQDN,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Navigation wait strategies for different scenarios
 */
export enum NavigationWaitStrategy {
  LOAD = 'load', // Wait for page load event
  DOM_CONTENT_LOADED = 'domcontentloaded', // Wait for DOM ready
  NETWORK_IDLE_0 = 'networkidle0', // No requests for 500ms
  NETWORK_IDLE_2 = 'networkidle2', // Max 2 requests for 500ms
  FIRST_MEANINGFUL_PAINT = 'firstmeaningfulpaint', // Performance metric
  LARGEST_CONTENTFUL_PAINT = 'largestcontentfulpaint', // Performance metric
  CUSTOM_SELECTOR = 'customselector', // Wait for specific element
  JAVASCRIPT_READY = 'javascriptready', // Wait for JS execution
}

/**
 * URL validation severity levels
 */
export enum URLValidationSeverity {
  STRICT = 'strict', // Block any suspicious URLs
  MODERATE = 'moderate', // Warn but allow with logging
  PERMISSIVE = 'permissive', // Log only, minimal blocking
}

/**
 * Navigation timeout strategies
 */
export enum TimeoutStrategy {
  FAIL_FAST = 'fail_fast', // Fail immediately on timeout
  RETRY_WITH_BACKOFF = 'retry_with_backoff', // Retry with exponential backoff
  GRACEFUL_DEGRADATION = 'graceful_degradation', // Continue with partial load
  CUSTOM_HANDLER = 'custom_handler', // Use custom timeout handling
}

/**
 * Browser performance optimization settings
 */
export class PerformanceOptimization {
  @ApiPropertyOptional({
    description: 'Block unnecessary resource types for faster loading',
    example: ['image', 'stylesheet', 'font'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(
    [
      'document',
      'stylesheet',
      'image',
      'media',
      'font',
      'script',
      'texttrack',
      'xhr',
      'fetch',
      'websocket',
      'manifest',
      'other',
    ],
    { each: true },
  )
  blockResourceTypes?: string[];

  @ApiPropertyOptional({
    description: 'Enable request/response compression',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  enableCompression?: boolean = true;

  @ApiPropertyOptional({
    description: 'Cache strategy for repeated requests',
    enum: ['aggressive', 'standard', 'minimal', 'disabled'],
    default: 'standard',
  })
  @IsOptional()
  @IsEnum(['aggressive', 'standard', 'minimal', 'disabled'])
  cacheStrategy?: string = 'standard';

  @ApiPropertyOptional({
    description: 'Maximum concurrent network requests',
    minimum: 1,
    maximum: 20,
    default: 6,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  maxConcurrentRequests?: number = 6;

  @ApiPropertyOptional({
    description: 'Enable prefetch for likely next navigations',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  enablePrefetch?: boolean = false;

  @ApiPropertyOptional({
    description: 'Lazy load off-screen content',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  enableLazyLoading?: boolean = true;
}

/**
 * Advanced URL security validation
 */
export class URLSecurityValidation {
  @ApiPropertyOptional({
    description: 'URL validation severity level',
    enum: URLValidationSeverity,
    default: URLValidationSeverity.MODERATE,
  })
  @IsOptional()
  @IsEnum(URLValidationSeverity)
  severity?: URLValidationSeverity = URLValidationSeverity.MODERATE;

  @ApiPropertyOptional({
    description: 'Allowed domain patterns (supports wildcards and regex)',
    example: [
      '*.trusted-domain.com',
      '/^https:\\/\\/api\\.(dev|staging|prod)\\.company\\.com/',
    ],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(100)
  allowedDomainPatterns?: string[];

  @ApiPropertyOptional({
    description: 'Blocked domain patterns (takes precedence over allowed)',
    example: ['*.malicious-domain.com', 'suspicious-site.org'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(1000)
  blockedDomainPatterns?: string[];

  @ApiPropertyOptional({
    description: 'Check domain against threat intelligence feeds',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  enableThreatIntelligence?: boolean = true;

  @ApiPropertyOptional({
    description: 'Validate SSL certificate chain',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  validateSSLChain?: boolean = true;

  @ApiPropertyOptional({
    description: 'Maximum allowed redirects',
    minimum: 0,
    maximum: 20,
    default: 5,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(20)
  maxRedirects?: number = 5;

  @ApiPropertyOptional({
    description: 'Block URLs with suspicious query parameters',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  blockSuspiciousQueries?: boolean = true;

  @ApiPropertyOptional({
    description: 'Check for URL shorteners and expand them',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  expandShortUrls?: boolean = true;

  @ApiPropertyOptional({
    description: 'Custom security rules (JavaScript expressions)',
    example: [
      'url.includes("admin") && !user.isAdmin',
      'url.protocol !== "https"',
    ],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  customSecurityRules?: string[];
}

/**
 * Navigation retry configuration
 */
export class NavigationRetryConfig {
  @ApiPropertyOptional({
    description: 'Maximum retry attempts',
    minimum: 0,
    maximum: 10,
    default: 3,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  maxAttempts?: number = 3;

  @ApiPropertyOptional({
    description: 'Initial retry delay in milliseconds',
    minimum: 100,
    maximum: 10000,
    default: 1000,
  })
  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(10000)
  initialDelayMs?: number = 1000;

  @ApiPropertyOptional({
    description: 'Exponential backoff multiplier',
    minimum: 1,
    maximum: 5,
    default: 2,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  backoffMultiplier?: number = 2;

  @ApiPropertyOptional({
    description: 'HTTP status codes that trigger retry',
    example: [408, 429, 500, 502, 503, 504],
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  retryableStatusCodes?: number[] = [408, 429, 500, 502, 503, 504];

  @ApiPropertyOptional({
    description: 'Network errors that trigger retry',
    example: ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  retryableNetworkErrors?: string[] = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'];

  @ApiPropertyOptional({
    description: 'Custom retry condition (JavaScript expression)',
    example: 'error.code === "TIMEOUT" && attempt < 2',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  customRetryCondition?: string;
}

/**
 * Enhanced Navigation DTO with comprehensive security and performance
 */
export class NavigationDto {
  @ApiProperty({
    description: 'Target URL with comprehensive validation',
    example: 'https://api.trusted-domain.com/data',
  })
  @IsUrl(
    {
      protocols: ['http', 'https'],
      require_protocol: true,
      require_host: true,
      require_valid_protocol: true,
    },
    { message: 'Invalid URL format - must be a valid HTTP/HTTPS URL' },
  )
  @MaxLength(4096, { message: 'URL exceeds maximum length of 4096 characters' })
  @Matches(/^https?:\/\/[^\s<>"{}|\\^`\[\]]+$/, {
    message: 'URL contains invalid characters',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  url!: string;

  @ApiPropertyOptional({
    description: 'Navigation wait strategy',
    enum: NavigationWaitStrategy,
    default: NavigationWaitStrategy.NETWORK_IDLE_0,
  })
  @IsOptional()
  @IsEnum(NavigationWaitStrategy, { message: 'Invalid wait strategy' })
  waitStrategy?: NavigationWaitStrategy = NavigationWaitStrategy.NETWORK_IDLE_0;

  @ApiPropertyOptional({
    description: 'Navigation timeout in seconds',
    minimum: 5,
    maximum: 300,
    default: 30,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Timeout must be a number' })
  @Min(5, { message: 'Timeout must be at least 5 seconds' })
  @Max(300, { message: 'Timeout must not exceed 300 seconds' })
  @IsPositive({ message: 'Timeout must be positive' })
  timeoutSeconds?: number = 30;

  @ApiPropertyOptional({
    description: 'Timeout handling strategy',
    enum: TimeoutStrategy,
    default: TimeoutStrategy.RETRY_WITH_BACKOFF,
  })
  @IsOptional()
  @IsEnum(TimeoutStrategy)
  timeoutStrategy?: TimeoutStrategy = TimeoutStrategy.RETRY_WITH_BACKOFF;

  @ApiPropertyOptional({
    description: 'CSS selector to wait for after navigation',
    example: '.content-loaded, #main-content',
  })
  @IsOptional()
  @IsString({ message: 'CSS selector must be a string' })
  @MinLength(1, { message: 'CSS selector cannot be empty' })
  @MaxLength(1000, { message: 'CSS selector too long' })
  @Matches(/^[a-zA-Z0-9\s\-_#.,:[\]()>"'=*+~^$|\\]+$/, {
    message: 'Invalid CSS selector format',
  })
  waitForSelector?: string;

  @ApiPropertyOptional({
    description: 'Take screenshot after successful navigation',
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Screenshot option must be boolean' })
  takeScreenshot?: boolean = false;

  @ApiPropertyOptional({
    description: 'Open URL in new tab instead of current tab',
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'New tab option must be boolean' })
  newTab?: boolean = false;

  @ApiPropertyOptional({
    description: 'Custom HTTP headers for the request',
    example: { 'User-Agent': 'MyBot/1.0', 'Accept-Language': 'en-US' },
  })
  @IsOptional()
  @IsObject({ message: 'Headers must be a valid object' })
  headers?: Record<string, string>;

  @ApiPropertyOptional({
    description: 'HTTP referer header value',
    example: 'https://trusted-domain.com/previous-page',
  })
  @IsOptional()
  @IsString({ message: 'Referer must be a string' })
  @MaxLength(2048, { message: 'Referer URL too long' })
  referer?: string;

  @ApiPropertyOptional({
    description: 'URL security validation configuration',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => URLSecurityValidation)
  securityValidation?: URLSecurityValidation;

  @ApiPropertyOptional({
    description: 'Performance optimization settings',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PerformanceOptimization)
  performanceOptimization?: PerformanceOptimization;

  @ApiPropertyOptional({
    description: 'Navigation retry configuration',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => NavigationRetryConfig)
  retryConfig?: NavigationRetryConfig;

  @ApiPropertyOptional({
    description: 'Viewport settings for this navigation',
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
    description: 'Geographic location for geo-specific content',
  })
  @IsOptional()
  @IsObject()
  geolocation?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };

  @ApiPropertyOptional({
    description: 'Authentication credentials if required',
  })
  @IsOptional()
  @IsObject()
  authentication?: {
    type: 'basic' | 'bearer' | 'oauth' | 'custom';
    credentials: Record<string, string>;
    autoSubmit?: boolean;
  };

  @ApiPropertyOptional({
    description: 'JavaScript code to execute after navigation',
    example: 'document.querySelector(".cookie-banner").style.display = "none"',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10000, { message: 'JavaScript code too long' })
  postNavigationScript?: string;

  @ApiPropertyOptional({
    description: 'Enable comprehensive navigation logging',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  enableLogging?: boolean = true;

  @ApiPropertyOptional({
    description: 'Metadata for navigation tracking and reporting',
  })
  @IsOptional()
  @IsObject()
  metadata?: {
    purpose?: string;
    category?: string;
    tags?: string[];
    businessUnit?: string;
    projectId?: string;
  };
}

/**
 * Navigation Response DTO with comprehensive result data
 */
export class NavigationResponseDto {
  @ApiProperty({ description: 'Navigation success status' })
  @IsBoolean()
  success!: boolean;

  @ApiProperty({ description: 'Final URL after any redirects' })
  @IsUrl()
  finalUrl!: string;

  @ApiProperty({ description: 'HTTP status code of the response' })
  @IsNumber()
  @Min(100)
  @Max(599)
  statusCode!: number;

  @ApiProperty({ description: 'Page title after navigation' })
  @IsString()
  pageTitle!: string;

  @ApiProperty({ description: 'Navigation start timestamp' })
  navigationStartedAt!: Date;

  @ApiProperty({ description: 'Navigation completion timestamp' })
  navigationCompletedAt!: Date;

  @ApiProperty({ description: 'Total navigation time in milliseconds' })
  @IsNumber()
  @Min(0)
  navigationTimeMs!: number;

  @ApiProperty({ description: 'Detailed performance metrics' })
  performanceMetrics!: {
    dnsLookupTimeMs: number;
    tcpConnectTimeMs: number;
    tlsHandshakeTimeMs?: number;
    firstByteTimeMs: number;
    domContentLoadedTimeMs: number;
    loadCompleteTimeMs: number;
    firstContentfulPaintMs?: number;
    largestContentfulPaintMs?: number;
    cumulativeLayoutShift?: number;
    totalBlockedTime?: number;
  };

  @ApiProperty({ description: 'Security validation results' })
  securityResults!: {
    urlValidationPassed: boolean;
    sslValidationPassed: boolean;
    threatIntelligenceStatus: 'safe' | 'suspicious' | 'malicious' | 'unknown';
    redirectChain: Array<{
      url: string;
      statusCode: number;
      headers: Record<string, string>;
    }>;
    blockedRequests: number;
    securityViolations: Array<{
      type: string;
      description: string;
      severity: 'low' | 'medium' | 'high';
    }>;
  };

  @ApiProperty({ description: 'Network activity summary' })
  networkActivity!: {
    totalRequests: number;
    blockedRequests: number;
    failedRequests: number;
    totalBytesTransferred: number;
    resourceTypes: Record<string, number>;
    slowestRequest?: {
      url: string;
      durationMs: number;
      responseSize: number;
    };
  };

  @ApiProperty({ description: 'Page content information' })
  pageInfo!: {
    url: string;
    title: string;
    description?: string;
    language?: string;
    charset?: string;
    canonicalUrl?: string;
    metaTags: Record<string, string>;
    socialMetaTags: Record<string, string>;
  };

  @ApiProperty({ description: 'Screenshot data if captured' })
  @IsOptional()
  screenshot?: {
    screenshotId: string;
    format: 'png' | 'jpeg' | 'webp';
    sizeBytes: number;
    dimensions: {
      width: number;
      height: number;
    };
    base64Data?: string;
    storageUrl?: string;
  };

  @ApiProperty({ description: 'Error information if navigation failed' })
  @IsOptional()
  error?: {
    code: string;
    message: string;
    category: 'network' | 'security' | 'timeout' | 'validation' | 'content';
    severity: 'low' | 'medium' | 'high' | 'critical';
    retryable: boolean;
    retryAttempts: number;
    timestamp: Date;
    context?: Record<string, unknown>;
  };

  @ApiProperty({ description: 'Retry information if retries occurred' })
  @IsOptional()
  retryInfo?: {
    totalAttempts: number;
    successfulAttempt: number;
    totalRetryTimeMs: number;
    retryReasons: string[];
  };

  @ApiProperty({ description: 'Correlation ID for request tracking' })
  @IsUUID()
  correlationId!: string;

  @ApiProperty({ description: 'Response generation timestamp' })
  timestamp!: Date;
}

// Export enhanced navigation DTOs
export {
  NavigationWaitStrategy,
  URLValidationSeverity,
  TimeoutStrategy,
  PerformanceOptimization,
  URLSecurityValidation,
  NavigationRetryConfig,
};
