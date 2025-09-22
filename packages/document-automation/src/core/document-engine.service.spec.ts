/**
 * Document Engine Service - Unit Tests
 * Comprehensive test suite for core document generation functionality
 */

import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { DocumentEngineService } from './document-engine.service';
import { TemplateProcessor } from '../services/template-processor.service';
import { FormatConverter } from '../services/format-converter.service';
import { ValidationService } from '../services/validation.service';
import { MetricsCollector } from '../services/metrics-collector.service';
import { AuditLogger } from '../services/audit-logger.service';
import { DocumentGenerationRequest, DocumentFormat, ProcessingStatus } from '../types/document.types';

describe('DocumentEngineService', () => {
  let service: DocumentEngineService;
  let templateProcessor: jest.Mocked<TemplateProcessor>;
  let formatConverter: jest.Mocked<FormatConverter>;
  let validationService: jest.Mocked<ValidationService>;
  let metricsCollector: jest.Mocked<MetricsCollector>;
  let auditLogger: jest.Mocked<AuditLogger>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let cacheManager: jest.Mocked<any>;

  const mockRequest: DocumentGenerationRequest = {
    id: 'test-request-123',
    templateId: 'template-456',
    data: { title: 'Test Document', content: 'Test content' },
    format: DocumentFormat.PDF,
    options: {
      outputFormat: DocumentFormat.PDF,
      customSettings: {}
    },
    metadata: {
      source: 'test',
      userId: 'user-123',
      customProperties: {}
    },
    priority: 'normal',
    createdAt: new Date(),
    requestedBy: 'user-123'
  };

  beforeEach(async () => {
    const mockTemplateProcessor = {
      processTemplate: jest.fn(),
    };

    const mockFormatConverter = {
      convertToFormat: jest.fn(),
    };

    const mockValidationService = {
      validateGenerationRequest: jest.fn(),
      validateDataAgainstSchema: jest.fn(),
    };

    const mockMetricsCollector = {
      recordDocumentGeneration: jest.fn(),
      getAggregatedMetrics: jest.fn(),
    };

    const mockAuditLogger = {
      logActivity: jest.fn(),
      getAuditLogs: jest.fn(),
    };

    const mockEventEmitter = {
      emit: jest.fn(),
    };

    const mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentEngineService,
        { provide: TemplateProcessor, useValue: mockTemplateProcessor },
        { provide: FormatConverter, useValue: mockFormatConverter },
        { provide: ValidationService, useValue: mockValidationService },
        { provide: MetricsCollector, useValue: mockMetricsCollector },
        { provide: AuditLogger, useValue: mockAuditLogger },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    service = module.get<DocumentEngineService>(DocumentEngineService);
    templateProcessor = module.get(TemplateProcessor);
    formatConverter = module.get(FormatConverter);
    validationService = module.get(ValidationService);
    metricsCollector = module.get(MetricsCollector);
    auditLogger = module.get(AuditLogger);
    eventEmitter = module.get(EventEmitter2);
    cacheManager = module.get(CACHE_MANAGER);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateDocument', () => {
    it('should successfully generate a document', async () => {
      // Arrange
      validationService.validateGenerationRequest.mockResolvedValue({
        isValid: true,
        errors: []
      });

      validationService.validateDataAgainstSchema.mockResolvedValue({
        isValid: true,
        errors: []
      });

      templateProcessor.processTemplate.mockResolvedValue(
        Buffer.from('<html><body>Test Document</body></html>')
      );

      formatConverter.convertToFormat.mockResolvedValue(
        Buffer.from('PDF content here')
      );

      cacheManager.get.mockResolvedValue({
        id: 'template-456',
        name: 'Test Template',
        type: 'dynamic',
        version: '1.0.0',
        format: DocumentFormat.HTML,
        schema: {
          version: '1.0.0',
          properties: {},
          required: [],
          additionalProperties: true
        },
        content: '<html><body>{{title}}</body></html>',
        variables: [],
        conditions: [],
        iterations: [],
        metadata: {
          tags: ['test'],
          category: 'test',
          difficulty: 'simple',
          estimatedProcessingTime: 1000,
          customProperties: {}
        },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system'
      });

      // Act
      const result = await service.generateDocument(mockRequest);

      // Assert
      expect(result).toBeDefined();
      expect(result.status).toBe(ProcessingStatus.COMPLETED);
      expect(result.document).toBeDefined();
      expect(result.document?.content).toEqual(Buffer.from('PDF content here'));
      expect(validationService.validateGenerationRequest).toHaveBeenCalledWith(mockRequest);
      expect(templateProcessor.processTemplate).toHaveBeenCalled();
      expect(formatConverter.convertToFormat).toHaveBeenCalled();
      expect(auditLogger.logActivity).toHaveBeenCalledTimes(2); // Start and completion
      expect(eventEmitter.emit).toHaveBeenCalledWith('document.generation.started', expect.any(Object));
      expect(eventEmitter.emit).toHaveBeenCalledWith('document.generation.completed', expect.any(Object));
    });

    it('should handle validation errors', async () => {
      // Arrange
      validationService.validateGenerationRequest.mockResolvedValue({
        isValid: false,
        errors: ['Template ID is required']
      });

      // Act
      const result = await service.generateDocument(mockRequest);

      // Assert
      expect(result.status).toBe(ProcessingStatus.FAILED);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Validation failed');
      expect(auditLogger.logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'document_generation_failed'
        })
      );
    });

    it('should handle template processing errors', async () => {
      // Arrange
      validationService.validateGenerationRequest.mockResolvedValue({
        isValid: true,
        errors: []
      });

      validationService.validateDataAgainstSchema.mockResolvedValue({
        isValid: true,
        errors: []
      });

      const processingError = new Error('Template processing failed');
      templateProcessor.processTemplate.mockRejectedValue(processingError);

      cacheManager.get.mockResolvedValue({
        id: 'template-456',
        schema: { version: '1.0.0', properties: {}, required: [], additionalProperties: true }
      });

      // Act
      const result = await service.generateDocument(mockRequest);

      // Assert
      expect(result.status).toBe(ProcessingStatus.FAILED);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('Template processing failed');
      expect(eventEmitter.emit).toHaveBeenCalledWith('document.generation.failed', expect.any(Object));
    });

    it('should record performance metrics', async () => {
      // Arrange
      validationService.validateGenerationRequest.mockResolvedValue({
        isValid: true,
        errors: []
      });

      validationService.validateDataAgainstSchema.mockResolvedValue({
        isValid: true,
        errors: []
      });

      templateProcessor.processTemplate.mockResolvedValue(
        Buffer.from('<html><body>Test</body></html>')
      );

      formatConverter.convertToFormat.mockResolvedValue(
        Buffer.from('PDF content')
      );

      cacheManager.get.mockResolvedValue({
        id: 'template-456',
        schema: { version: '1.0.0', properties: {}, required: [], additionalProperties: true }
      });

      // Act
      const result = await service.generateDocument(mockRequest);

      // Assert
      expect(result.metrics).toBeDefined();
      expect(result.metrics.processingTimeMs).toBeGreaterThan(0);
      expect(result.metrics.templateRenderTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.metrics.formatConversionTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.metrics.outputSizeBytes).toBeGreaterThan(0);
      expect(metricsCollector.recordDocumentGeneration).toHaveBeenCalledWith(result.metrics);
    });
  });

  describe('getGenerationStatus', () => {
    it('should return null for unknown request ID', async () => {
      // Act
      const status = await service.getGenerationStatus('unknown-id');

      // Assert
      expect(status).toBeNull();
    });
  });

  describe('cancelGeneration', () => {
    it('should return false for unknown request ID', async () => {
      // Act
      const cancelled = await service.cancelGeneration('unknown-id', 'user-123');

      // Assert
      expect(cancelled).toBe(false);
    });
  });

  describe('getProcessingMetrics', () => {
    it('should return aggregated metrics', async () => {
      // Arrange
      const mockMetrics = {
        totalRequests: 10,
        averageProcessingTime: 2500,
        totalProcessingTime: 25000
      };

      metricsCollector.getAggregatedMetrics.mockResolvedValue(mockMetrics);

      // Act
      const metrics = await service.getProcessingMetrics();

      // Assert
      expect(metrics).toEqual(mockMetrics);
      expect(metricsCollector.getAggregatedMetrics).toHaveBeenCalled();
    });
  });
});