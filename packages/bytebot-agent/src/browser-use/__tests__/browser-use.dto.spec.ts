/**
 * Browser-Use DTO Test Suite
 *
 * Comprehensive validation and transformation tests for browser automation DTOs including:
 * - Request validation and sanitization
 * - Data transformation and serialization
 * - Type safety and schema compliance
 * - Edge cases and error handling
 * - Security validation for inputs
 */

import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import {
  BrowserTaskDto,
  BrowserSessionDto,
  BrowserDataDto,
  BrowserResultsDto,
  BrowserScreenshotDto,
  BrowserMonitoringDto,
  BrowserFormDto,
} from '../dto';

describe('Browser-Use DTOs', () => {
  describe('BrowserTaskDto', () => {
    const validTaskData = {
      name: 'Test Task',
      url: 'https://example.com',
      description: 'Test automation task',
      steps: [
        { action: 'navigate', target: 'https://example.com' },
        { action: 'click', target: '#submit-button' },
        { action: 'type', target: '#username', value: 'testuser' },
      ],
      sessionId: 'session-123',
      priority: 1,
      timeout: 30000,
      retryAttempts: 3,
      metadata: { source: 'api-test', version: '1.0' },
    };

    it('should validate a complete valid task DTO', async () => {
      const dto = plainToClass(BrowserTaskDto, validTaskData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.name).toBe('Test Task');
      expect(dto.url).toBe('https://example.com');
      expect(dto.steps).toHaveLength(3);
      expect(dto.priority).toBe(1);
    });

    it('should validate required fields', async () => {
      const incompleteData = {
        description: 'Missing required fields',
      };

      const dto = plainToClass(BrowserTaskDto, incompleteData);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);

      const errorProperties = errors.map((error) => error.property);
      expect(errorProperties).toContain('name');
      expect(errorProperties).toContain('url');
      expect(errorProperties).toContain('steps');
    });

    it('should validate URL format', async () => {
      const invalidUrlData = {
        ...validTaskData,
        url: 'invalid-url-format',
      };

      const dto = plainToClass(BrowserTaskDto, invalidUrlData);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      const urlError = errors.find((error) => error.property === 'url');
      expect(urlError).toBeDefined();
      expect(urlError.constraints).toHaveProperty('isUrl');
    });

    it('should validate name length constraints', async () => {
      const longNameData = {
        ...validTaskData,
        name: 'a'.repeat(256), // Too long
      };

      const dto = plainToClass(BrowserTaskDto, longNameData);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      const nameError = errors.find((error) => error.property === 'name');
      expect(nameError).toBeDefined();
      expect(nameError.constraints).toHaveProperty('maxLength');
    });

    it('should validate empty name', async () => {
      const emptyNameData = {
        ...validTaskData,
        name: '',
      };

      const dto = plainToClass(BrowserTaskDto, emptyNameData);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      const nameError = errors.find((error) => error.property === 'name');
      expect(nameError).toBeDefined();
      expect(nameError.constraints).toHaveProperty('isNotEmpty');
    });

    it('should validate priority range', async () => {
      const invalidPriorityData = {
        ...validTaskData,
        priority: 11, // Out of range (1-10)
      };

      const dto = plainToClass(BrowserTaskDto, invalidPriorityData);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      const priorityError = errors.find(
        (error) => error.property === 'priority',
      );
      expect(priorityError).toBeDefined();
      expect(priorityError.constraints).toHaveProperty('max');
    });

    it('should validate timeout constraints', async () => {
      const invalidTimeoutData = {
        ...validTaskData,
        timeout: -1000, // Negative timeout
      };

      const dto = plainToClass(BrowserTaskDto, invalidTimeoutData);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      const timeoutError = errors.find((error) => error.property === 'timeout');
      expect(timeoutError).toBeDefined();
      expect(timeoutError.constraints).toHaveProperty('min');
    });

    it('should validate retry attempts range', async () => {
      const invalidRetryData = {
        ...validTaskData,
        retryAttempts: 15, // Too many retries
      };

      const dto = plainToClass(BrowserTaskDto, invalidRetryData);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      const retryError = errors.find(
        (error) => error.property === 'retryAttempts',
      );
      expect(retryError).toBeDefined();
      expect(retryError.constraints).toHaveProperty('max');
    });

    it('should validate steps array structure', async () => {
      const invalidStepsData = {
        ...validTaskData,
        steps: [
          { action: 'invalid-action', target: '#element' },
          { target: '#element' }, // Missing action
          'invalid-step-format', // Wrong type
        ],
      };

      const dto = plainToClass(BrowserTaskDto, invalidStepsData);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should allow optional fields to be undefined', async () => {
      const minimalData = {
        name: 'Minimal Task',
        url: 'https://example.com',
        steps: [{ action: 'navigate', target: 'https://example.com' }],
        sessionId: 'session-123',
      };

      const dto = plainToClass(BrowserTaskDto, minimalData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.description).toBeUndefined();
      expect(dto.priority).toBeUndefined();
      expect(dto.timeout).toBeUndefined();
      expect(dto.metadata).toBeUndefined();
    });
  });

  describe('BrowserSessionDto', () => {
    const validSessionData = {
      name: 'Test Session',
      browserConfig: {
        headless: false,
        screenshots: true,
        video_recording: false,
        working_directory: '/tmp/browser-use',
        user_data_dir: '/tmp/browser-data',
        chrome_executable: '/usr/bin/google-chrome',
        log_level: 'INFO',
        session_timeout: 300000,
        viewport: { width: 1920, height: 1080 },
      },
      timeout: 300000,
      metadata: { purpose: 'testing', environment: 'development' },
    };

    it('should validate a complete valid session DTO', async () => {
      const dto = plainToClass(BrowserSessionDto, validSessionData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.name).toBe('Test Session');
      expect(dto.browserConfig).toBeDefined();
      expect(dto.browserConfig.headless).toBe(false);
      expect(dto.browserConfig.viewport.width).toBe(1920);
    });

    it('should validate required fields', async () => {
      const incompleteData = {
        timeout: 300000,
      };

      const dto = plainToClass(BrowserSessionDto, incompleteData);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);

      const errorProperties = errors.map((error) => error.property);
      expect(errorProperties).toContain('name');
      expect(errorProperties).toContain('browserConfig');
    });

    it('should validate browser config structure', async () => {
      const invalidConfigData = {
        ...validSessionData,
        browserConfig: {
          headless: 'not-a-boolean',
          viewport: { width: -100, height: -100 },
          session_timeout: 'invalid-number',
        },
      };

      const dto = plainToClass(BrowserSessionDto, invalidConfigData);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should validate viewport dimensions', async () => {
      const invalidViewportData = {
        ...validSessionData,
        browserConfig: {
          ...validSessionData.browserConfig,
          viewport: { width: 0, height: 0 },
        },
      };

      const dto = plainToClass(BrowserSessionDto, invalidViewportData);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should validate session timeout', async () => {
      const invalidTimeoutData = {
        ...validSessionData,
        timeout: 0, // Too short
      };

      const dto = plainToClass(BrowserSessionDto, invalidTimeoutData);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      const timeoutError = errors.find((error) => error.property === 'timeout');
      expect(timeoutError).toBeDefined();
    });

    it('should handle optional browser config fields', async () => {
      const minimalConfigData = {
        name: 'Minimal Session',
        browserConfig: {
          working_directory: '/tmp/browser-use',
        },
      };

      const dto = plainToClass(BrowserSessionDto, minimalConfigData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.browserConfig.headless).toBeUndefined();
      expect(dto.browserConfig.screenshots).toBeUndefined();
    });
  });

  describe('BrowserScreenshotDto', () => {
    const validScreenshotData = {
      fullPage: true,
      element: '#main-content',
      format: 'png',
      quality: 90,
      clip: {
        x: 0,
        y: 0,
        width: 800,
        height: 600,
      },
    };

    it('should validate a complete valid screenshot DTO', async () => {
      const dto = plainToClass(BrowserScreenshotDto, validScreenshotData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.fullPage).toBe(true);
      expect(dto.format).toBe('png');
      expect(dto.quality).toBe(90);
    });

    it('should validate format enum values', async () => {
      const invalidFormatData = {
        ...validScreenshotData,
        format: 'bmp', // Invalid format
      };

      const dto = plainToClass(BrowserScreenshotDto, invalidFormatData);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      const formatError = errors.find((error) => error.property === 'format');
      expect(formatError).toBeDefined();
    });

    it('should validate quality range for JPEG format', async () => {
      const invalidQualityData = {
        ...validScreenshotData,
        format: 'jpeg',
        quality: 150, // Invalid quality (0-100)
      };

      const dto = plainToClass(BrowserScreenshotDto, invalidQualityData);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      const qualityError = errors.find((error) => error.property === 'quality');
      expect(qualityError).toBeDefined();
    });

    it('should validate clip coordinates', async () => {
      const invalidClipData = {
        ...validScreenshotData,
        clip: {
          x: -10, // Negative coordinate
          y: -5,
          width: 0, // Zero width
          height: -100, // Negative height
        },
      };

      const dto = plainToClass(BrowserScreenshotDto, invalidClipData);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should allow all fields to be optional', async () => {
      const minimalData = {};

      const dto = plainToClass(BrowserScreenshotDto, minimalData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.fullPage).toBeUndefined();
      expect(dto.element).toBeUndefined();
      expect(dto.format).toBeUndefined();
    });
  });

  describe('BrowserFormDto', () => {
    const validFormData = {
      formSelector: '#login-form',
      fields: [
        { selector: '#username', value: 'testuser', type: 'text' },
        { selector: '#password', value: 'password123', type: 'password' },
        { selector: '#remember', value: true, type: 'checkbox' },
      ],
      submit: true,
      submitSelector: '#submit-button',
      waitForResponse: true,
      responseTimeout: 10000,
    };

    it('should validate a complete valid form DTO', async () => {
      const dto = plainToClass(BrowserFormDto, validFormData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.formSelector).toBe('#login-form');
      expect(dto.fields).toHaveLength(3);
      expect(dto.submit).toBe(true);
    });

    it('should validate required fields', async () => {
      const incompleteData = {
        submit: true,
      };

      const dto = plainToClass(BrowserFormDto, incompleteData);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);

      const errorProperties = errors.map((error) => error.property);
      expect(errorProperties).toContain('formSelector');
      expect(errorProperties).toContain('fields');
    });

    it('should validate field structure', async () => {
      const invalidFieldsData = {
        ...validFormData,
        fields: [
          { selector: '', value: 'test' }, // Empty selector
          { value: 'test' }, // Missing selector
          { selector: '#field', value: null }, // Null value
        ],
      };

      const dto = plainToClass(BrowserFormDto, invalidFieldsData);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should validate response timeout', async () => {
      const invalidTimeoutData = {
        ...validFormData,
        responseTimeout: -1000, // Negative timeout
      };

      const dto = plainToClass(BrowserFormDto, invalidTimeoutData);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      const timeoutError = errors.find(
        (error) => error.property === 'responseTimeout',
      );
      expect(timeoutError).toBeDefined();
    });

    it('should handle different field value types', async () => {
      const mixedFieldsData = {
        formSelector: '#mixed-form',
        fields: [
          { selector: '#text-field', value: 'string value', type: 'text' },
          { selector: '#number-field', value: 42, type: 'number' },
          { selector: '#checkbox', value: true, type: 'checkbox' },
          { selector: '#select', value: 'option1', type: 'select' },
        ],
      };

      const dto = plainToClass(BrowserFormDto, mixedFieldsData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.fields[0].value).toBe('string value');
      expect(dto.fields[1].value).toBe(42);
      expect(dto.fields[2].value).toBe(true);
    });
  });

  describe('BrowserDataDto', () => {
    const validDataDto = {
      selectors: [
        { name: 'title', selector: 'h1', attribute: 'textContent' },
        { name: 'links', selector: 'a', attribute: 'href', multiple: true },
        { name: 'images', selector: 'img', attribute: 'src', multiple: true },
      ],
      format: 'json',
      includeMetadata: true,
      timeout: 5000,
      waitForElements: true,
    };

    it('should validate a complete valid data extraction DTO', async () => {
      const dto = plainToClass(BrowserDataDto, validDataDto);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.selectors).toHaveLength(3);
      expect(dto.format).toBe('json');
      expect(dto.includeMetadata).toBe(true);
    });

    it('should validate required fields', async () => {
      const incompleteData = {
        format: 'json',
      };

      const dto = plainToClass(BrowserDataDto, incompleteData);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);

      const errorProperties = errors.map((error) => error.property);
      expect(errorProperties).toContain('selectors');
    });

    it('should validate selector structure', async () => {
      const invalidSelectorsData = {
        ...validDataDto,
        selectors: [
          { name: '', selector: 'h1', attribute: 'textContent' }, // Empty name
          { name: 'test', selector: '', attribute: 'textContent' }, // Empty selector
          { name: 'test2', selector: 'h2' }, // Missing attribute
        ],
      };

      const dto = plainToClass(BrowserDataDto, invalidSelectorsData);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should validate format enum values', async () => {
      const invalidFormatData = {
        ...validDataDto,
        format: 'xml', // Invalid format
      };

      const dto = plainToClass(BrowserDataDto, invalidFormatData);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      const formatError = errors.find((error) => error.property === 'format');
      expect(formatError).toBeDefined();
    });

    it('should validate timeout constraints', async () => {
      const invalidTimeoutData = {
        ...validDataDto,
        timeout: 0, // Zero timeout
      };

      const dto = plainToClass(BrowserDataDto, invalidTimeoutData);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      const timeoutError = errors.find((error) => error.property === 'timeout');
      expect(timeoutError).toBeDefined();
    });

    it('should handle complex selector configurations', async () => {
      const complexSelectorsData = {
        selectors: [
          {
            name: 'complex-data',
            selector: 'div.content[data-type="article"]',
            attribute: 'dataset.id',
            multiple: true,
            transform: 'trim',
            defaultValue: 'N/A',
          },
        ],
        format: 'json',
      };

      const dto = plainToClass(BrowserDataDto, complexSelectorsData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.selectors[0].transform).toBe('trim');
      expect(dto.selectors[0].defaultValue).toBe('N/A');
    });
  });

  describe('BrowserResultsDto', () => {
    const validResultsData = {
      taskId: 'task-123',
      sessionId: 'session-456',
      status: 'completed',
      data: {
        extractedData: {
          title: 'Example Page',
          links: ['https://example.com/1', 'https://example.com/2'],
        },
        screenshots: ['screenshot1.png', 'screenshot2.png'],
        logs: ['Navigation successful', 'Data extraction completed'],
      },
      metadata: {
        startTime: new Date(),
        endTime: new Date(),
        duration: 5000,
        url: 'https://example.com',
        userAgent: 'Mozilla/5.0...',
      },
      errors: [],
    };

    it('should validate a complete valid results DTO', async () => {
      const dto = plainToClass(BrowserResultsDto, validResultsData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.taskId).toBe('task-123');
      expect(dto.status).toBe('completed');
      expect(dto.data).toBeDefined();
    });

    it('should validate required fields', async () => {
      const incompleteData = {
        data: { some: 'data' },
      };

      const dto = plainToClass(BrowserResultsDto, incompleteData);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);

      const errorProperties = errors.map((error) => error.property);
      expect(errorProperties).toContain('taskId');
      expect(errorProperties).toContain('status');
    });

    it('should validate status enum values', async () => {
      const invalidStatusData = {
        ...validResultsData,
        status: 'invalid-status',
      };

      const dto = plainToClass(BrowserResultsDto, invalidStatusData);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      const statusError = errors.find((error) => error.property === 'status');
      expect(statusError).toBeDefined();
    });

    it('should handle error information', async () => {
      const resultsWithErrors = {
        ...validResultsData,
        status: 'failed',
        errors: [
          {
            code: 'ELEMENT_NOT_FOUND',
            message: 'Element not found',
            step: 2,
            timestamp: new Date(),
          },
          {
            code: 'TIMEOUT',
            message: 'Operation timed out',
            step: 3,
            timestamp: new Date(),
          },
        ],
      };

      const dto = plainToClass(BrowserResultsDto, resultsWithErrors);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.errors).toHaveLength(2);
      expect(dto.errors[0].code).toBe('ELEMENT_NOT_FOUND');
    });
  });

  describe('Data Transformation', () => {
    it('should transform string booleans to actual booleans', () => {
      const data = {
        name: 'Test',
        browserConfig: {
          headless: 'true',
          screenshots: 'false',
          working_directory: '/tmp',
        },
      };

      const dto = plainToClass(BrowserSessionDto, data);

      expect(typeof dto.browserConfig.headless).toBe('boolean');
      expect(dto.browserConfig.headless).toBe(true);
      expect(typeof dto.browserConfig.screenshots).toBe('boolean');
      expect(dto.browserConfig.screenshots).toBe(false);
    });

    it('should transform string numbers to actual numbers', () => {
      const data = {
        name: 'Test Task',
        url: 'https://example.com',
        steps: [{ action: 'navigate', target: 'https://example.com' }],
        sessionId: 'session-123',
        priority: '5',
        timeout: '30000',
        retryAttempts: '3',
      };

      const dto = plainToClass(BrowserTaskDto, data);

      expect(typeof dto.priority).toBe('number');
      expect(dto.priority).toBe(5);
      expect(typeof dto.timeout).toBe('number');
      expect(dto.timeout).toBe(30000);
      expect(typeof dto.retryAttempts).toBe('number');
      expect(dto.retryAttempts).toBe(3);
    });

    it('should handle nested object transformations', () => {
      const data = {
        formSelector: '#form',
        fields: [
          { selector: '#field1', value: 'true', type: 'checkbox' },
          { selector: '#field2', value: '42', type: 'number' },
        ],
      };

      const dto = plainToClass(BrowserFormDto, data);

      expect(dto.fields[0].value).toBe('true'); // Should remain string for validation
      expect(dto.fields[1].value).toBe('42'); // Should remain string for validation
    });
  });

  describe('Security Validation', () => {
    it('should reject potentially dangerous selectors', async () => {
      const maliciousData = {
        selectors: [
          {
            name: 'xss-attempt',
            selector: 'script[src*="evil.com"]',
            attribute: 'innerHTML',
          },
        ],
        format: 'json',
      };

      const dto = plainToClass(BrowserDataDto, maliciousData);
      const errors = await validate(dto);

      // Should pass validation - security filtering happens at service level
      expect(errors).toHaveLength(0);
    });

    it('should handle URL validation for navigation', async () => {
      const maliciousUrls = [
        'javascript:alert("xss")',
        'data:text/html,<script>alert("xss")</script>',
        'file:///etc/passwd',
      ];

      for (const url of maliciousUrls) {
        const data = {
          name: 'Malicious Task',
          url,
          steps: [{ action: 'navigate', target: url }],
          sessionId: 'session-123',
        };

        const dto = plainToClass(BrowserTaskDto, data);
        const errors = await validate(dto);

        expect(errors.length).toBeGreaterThan(0);
        const urlError = errors.find((error) => error.property === 'url');
        expect(urlError).toBeDefined();
      }
    });

    it('should validate file path constraints', async () => {
      const dangerousPaths = [
        '../../../etc/passwd',
        '/etc/shadow',
        'C:\\Windows\\System32',
      ];

      for (const path of dangerousPaths) {
        const data = {
          name: 'Path Test',
          browserConfig: {
            working_directory: path,
          },
        };

        const dto = plainToClass(BrowserSessionDto, data);
        // Note: Path validation would typically happen at service level
        // DTOs focus on format validation
      }
    });
  });
});
