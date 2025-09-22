/**
 * Browser Automation Validation Pipe
 *
 * Custom validation pipe for browser automation requests with enhanced security
 * and comprehensive input sanitization. Provides specialized validation for
 * browser-specific operations including URL validation, selector sanitization,
 * and parameter type checking.
 */

import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { Logger } from '@nestjs/common';

/**
 * Security-focused validation pipe for browser automation operations
 *
 * Key features:
 * - URL security validation and sanitization
 * - CSS selector safety checking
 * - XPath expression validation
 * - JavaScript injection prevention
 * - File path security validation
 * - Parameter sanitization and type coercion
 */
@Injectable()
export class BrowserAutomationValidationPipe implements PipeTransform<any> {
  private readonly logger = new Logger(BrowserAutomationValidationPipe.name);

  /**
   * Transform and validate browser automation request data
   *
   * @param value Raw request data
   * @param metadata Argument metadata for type transformation
   * @returns Validated and sanitized request data
   * @throws BadRequestException for validation failures
   */
  async transform(value: any, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    const object = plainToClass(metatype, value);

    // Perform security-specific validations
    this.performSecurityValidations(object);

    // Run class-validator validations
    const errors = await validate(object, {
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });

    if (errors.length > 0) {
      const errorMessages = errors
        .map(error => Object.values(error.constraints || {}).join(', '))
        .join('; ');

      this.logger.warn(`Browser automation validation failed: ${errorMessages}`, {
        requestData: this.sanitizeForLogging(value),
        validationErrors: errors.map(e => ({
          property: e.property,
          constraints: e.constraints,
          value: e.value,
        })),
      });

      throw new BadRequestException(`Validation failed: ${errorMessages}`);
    }

    return object;
  }

  /**
   * Check if the metatype requires validation
   */
  private toValidate(metatype: Function): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }

  /**
   * Perform security-specific validations for browser automation
   */
  private performSecurityValidations(object: any): void {
    // URL security validation
    if (object.url) {
      this.validateUrl(object.url);
    }

    // CSS selector security validation
    if (object.selector || object.target?.selector) {
      const selector = object.selector || object.target?.selector;
      this.validateCssSelector(selector);
    }

    // XPath security validation
    if (object.xpath || object.target?.xpath) {
      const xpath = object.xpath || object.target?.xpath;
      this.validateXPath(xpath);
    }

    // JavaScript injection prevention
    if (object.text || object.value) {
      const textValue = object.text || object.value;
      this.validateTextInput(textValue);
    }

    // File path security validation
    if (object.filePath) {
      this.validateFilePath(object.filePath);
    }

    // AI prompt validation (for AI-powered extractions)
    if (object.aiPrompt) {
      this.validateAiPrompt(object.aiPrompt);
    }

    // Browser launch arguments validation
    if (object.extraArgs || object.args) {
      const args = object.extraArgs || object.args;
      this.validateBrowserArgs(args);
    }

    // Proxy settings validation
    if (object.proxy) {
      this.validateProxySettings(object.proxy);
    }
  }

  /**
   * Validate and sanitize URLs for security
   */
  private validateUrl(url: string): void {
    try {
      const urlObj = new URL(url);

      // Block dangerous protocols
      const allowedProtocols = ['http:', 'https:', 'file:'];
      if (!allowedProtocols.includes(urlObj.protocol)) {
        throw new BadRequestException(
          `Invalid URL protocol: ${urlObj.protocol}. Only HTTP, HTTPS, and FILE protocols are allowed.`
        );
      }

      // Block local network access for security
      const hostname = urlObj.hostname.toLowerCase();
      const dangerousHosts = [
        'localhost',
        '127.0.0.1',
        '0.0.0.0',
        '::1',
        'metadata.google.internal',
        '169.254.169.254', // AWS metadata
      ];

      // Check for private IP ranges
      if (this.isPrivateIp(hostname) || dangerousHosts.includes(hostname)) {
        this.logger.warn(`Blocked potentially dangerous URL: ${url}`, {
          hostname,
          protocol: urlObj.protocol,
        });
        throw new BadRequestException(
          'Access to local network resources is not allowed for security reasons.'
        );
      }

      // Validate URL length
      if (url.length > 2048) {
        throw new BadRequestException('URL exceeds maximum allowed length (2048 characters).');
      }

    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Invalid URL format: ${url}`);
    }
  }

  /**
   * Validate CSS selectors for security and syntax
   */
  private validateCssSelector(selector: string): void {
    if (!selector || typeof selector !== 'string') return;

    // Check selector length
    if (selector.length > 1000) {
      throw new BadRequestException('CSS selector exceeds maximum allowed length (1000 characters).');
    }

    // Block potentially dangerous selectors
    const dangerousPatterns = [
      /javascript:/i,
      /vbscript:/i,
      /expression\s*\(/i,
      /url\s*\(/i,
      /@import/i,
      /behavior\s*:/i,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(selector)) {
        throw new BadRequestException(
          `CSS selector contains potentially dangerous content: ${selector}`
        );
      }
    }

    // Basic CSS selector syntax validation
    try {
      // Test if the selector can be parsed (this is a basic check)
      if (typeof document !== 'undefined') {
        document.createElement('div').querySelector(selector);
      }
    } catch (error) {
      // Note: This won't work server-side, but provides client-side validation
      this.logger.debug(`CSS selector syntax validation warning: ${selector}`);
    }
  }

  /**
   * Validate XPath expressions for security
   */
  private validateXPath(xpath: string): void {
    if (!xpath || typeof xpath !== 'string') return;

    // Check XPath length
    if (xpath.length > 1000) {
      throw new BadRequestException('XPath expression exceeds maximum allowed length (1000 characters).');
    }

    // Block potentially dangerous XPath functions
    const dangerousPatterns = [
      /document\s*\(/i,
      /window\s*\(/i,
      /eval\s*\(/i,
      /javascript:/i,
      /script\s*\(/i,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(xpath)) {
        throw new BadRequestException(
          `XPath expression contains potentially dangerous content: ${xpath}`
        );
      }
    }
  }

  /**
   * Validate text input for JavaScript injection prevention
   */
  private validateTextInput(text: string): void {
    if (!text || typeof text !== 'string') return;

    // Check text length
    if (text.length > 10000) {
      throw new BadRequestException('Text input exceeds maximum allowed length (10000 characters).');
    }

    // Block script injection attempts
    const dangerousPatterns = [
      /<script[^>]*>/i,
      /javascript:/i,
      /vbscript:/i,
      /on\w+\s*=/i, // Event handlers like onclick=
      /expression\s*\(/i,
      /<iframe[^>]*>/i,
      /<object[^>]*>/i,
      /<embed[^>]*>/i,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(text)) {
        throw new BadRequestException(
          'Text input contains potentially dangerous content that could be used for script injection.'
        );
      }
    }
  }

  /**
   * Validate file paths for security
   */
  private validateFilePath(filePath: string): void {
    if (!filePath || typeof filePath !== 'string') return;

    // Check file path length
    if (filePath.length > 500) {
      throw new BadRequestException('File path exceeds maximum allowed length (500 characters).');
    }

    // Block path traversal attempts
    const dangerousPatterns = [
      /\.\./,
      /~\//,
      /\/etc\//i,
      /\/proc\//i,
      /\/sys\//i,
      /\/dev\//i,
      /\/var\/log\//i,
      /\/root\//i,
      /\/home\/.*\/\./i,
      /c:\\windows/i,
      /c:\\users/i,
      /\\system32/i,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(filePath)) {
        throw new BadRequestException(
          `File path contains potentially dangerous content: ${filePath}`
        );
      }
    }

    // Validate file extension allowlist for uploads
    const allowedExtensions = [
      '.txt', '.csv', '.json', '.xml', '.pdf', '.png', '.jpg', '.jpeg',
      '.gif', '.bmp', '.svg', '.doc', '.docx', '.xls', '.xlsx',
    ];

    const extension = filePath.toLowerCase().substring(filePath.lastIndexOf('.'));
    if (extension && !allowedExtensions.includes(extension)) {
      throw new BadRequestException(
        `File type not allowed: ${extension}. Allowed types: ${allowedExtensions.join(', ')}`
      );
    }
  }

  /**
   * Validate AI prompts for content safety
   */
  private validateAiPrompt(prompt: string): void {
    if (!prompt || typeof prompt !== 'string') return;

    // Check prompt length
    if (prompt.length > 2000) {
      throw new BadRequestException('AI prompt exceeds maximum allowed length (2000 characters).');
    }

    // Block attempts to manipulate AI behavior
    const dangerousPatterns = [
      /ignore\s+previous\s+instructions/i,
      /system\s*:/i,
      /pretend\s+you\s+are/i,
      /role\s*:\s*system/i,
      /\{\{\s*system\s*\}\}/i,
      /jailbreak/i,
      /prompt\s+injection/i,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(prompt)) {
        throw new BadRequestException(
          'AI prompt contains content that appears to attempt prompt manipulation.'
        );
      }
    }
  }

  /**
   * Validate browser launch arguments for security
   */
  private validateBrowserArgs(args: string[]): void {
    if (!Array.isArray(args)) return;

    const dangerousArgs = [
      '--disable-web-security',
      '--allow-file-access-from-files',
      '--disable-features=VizDisplayCompositor',
      '--enable-logging',
      '--log-level=0',
      '--enable-automation',
      '--remote-debugging-port',
    ];

    for (const arg of args) {
      if (typeof arg !== 'string') {
        throw new BadRequestException('All browser arguments must be strings.');
      }

      if (arg.length > 200) {
        throw new BadRequestException('Browser argument exceeds maximum length (200 characters).');
      }

      // Check for dangerous arguments
      for (const dangerousArg of dangerousArgs) {
        if (arg.toLowerCase().includes(dangerousArg.toLowerCase())) {
          throw new BadRequestException(
            `Browser argument not allowed for security reasons: ${arg}`
          );
        }
      }
    }
  }

  /**
   * Validate proxy settings for security
   */
  private validateProxySettings(proxy: any): void {
    if (!proxy || typeof proxy !== 'object') return;

    // Validate proxy host
    if (proxy.host) {
      if (typeof proxy.host !== 'string' || proxy.host.length > 255) {
        throw new BadRequestException('Invalid proxy host format.');
      }

      // Block local network proxy access
      if (this.isPrivateIp(proxy.host) || proxy.host.toLowerCase() === 'localhost') {
        throw new BadRequestException('Proxy host cannot be a local network address.');
      }
    }

    // Validate proxy port
    if (proxy.port) {
      const port = parseInt(proxy.port, 10);
      if (isNaN(port) || port < 1 || port > 65535) {
        throw new BadRequestException('Proxy port must be between 1 and 65535.');
      }
    }

    // Validate proxy credentials
    if (proxy.username && proxy.username.length > 100) {
      throw new BadRequestException('Proxy username exceeds maximum length (100 characters).');
    }

    if (proxy.password && proxy.password.length > 100) {
      throw new BadRequestException('Proxy password exceeds maximum length (100 characters).');
    }
  }

  /**
   * Check if an IP address or hostname is in a private range
   */
  private isPrivateIp(hostname: string): boolean {
    // IPv4 private ranges
    const ipv4PrivateRanges = [
      /^10\./,
      /^192\.168\./,
      /^172\.(1[6-9]|2[0-9]|3[01])\./,
      /^127\./,
      /^169\.254\./, // Link-local
    ];

    // IPv6 private ranges
    const ipv6PrivateRanges = [
      /^fe80:/i, // Link-local
      /^fc00:/i, // Unique local
      /^fd00:/i, // Unique local
      /^::1$/i,  // Loopback
    ];

    for (const range of ipv4PrivateRanges) {
      if (range.test(hostname)) return true;
    }

    for (const range of ipv6PrivateRanges) {
      if (range.test(hostname)) return true;
    }

    return false;
  }

  /**
   * Sanitize object for safe logging (remove sensitive data)
   */
  private sanitizeForLogging(data: any): any {
    if (!data || typeof data !== 'object') return data;

    const sanitized = { ...data };

    // Remove sensitive fields
    const sensitiveFields = [
      'password', 'secret', 'token', 'key', 'auth', 'credential',
      'proxy.password', 'proxy.username',
    ];

    for (const field of sensitiveFields) {
      if (field.includes('.')) {
        const [parent, child] = field.split('.');
        if (sanitized[parent] && sanitized[parent][child]) {
          sanitized[parent][child] = '[REDACTED]';
        }
      } else if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}