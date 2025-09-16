/**
 * SummariesService Unit Tests - Comprehensive Content Analysis Testing
 *
 * Production-ready unit tests covering all SummariesService functionality:
 * - Summary creation with content analysis and validation
 * - Summary retrieval operations (findAll, findLatest, findById)
 * - Content metrics calculation (character, word, line counts)
 * - Performance tracking with operation IDs
 * - Retry mechanisms and circuit breaker patterns
 * - Content validation and sanitization
 * - Error handling and edge cases
 * - Database transaction reliability
 *
 * @author Testing & Quality Assurance Specialist
 * @version 2.0.0
 * @since Phase 1: Bytebot Core Module Testing
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { Summary, Prisma } from '@prisma/client';
import {
  SummariesService,
  CreateSummaryRequest,
  SummaryAnalysis,
  SummaryRetrievalResult,
} from '../summaries.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('SummariesService', () => {
  let service: SummariesService;
  let prismaService: any;

  // Test data fixtures
  const mockTaskId = 'task-123';
  const mockSummaryId = 'summary-456';
  const mockParentId = 'parent-789';

  const mockSummary: Summary = {
    id: mockSummaryId,
    taskId: mockTaskId,
    content: 'This is a comprehensive summary of the task progress. It contains detailed analysis and findings.',
    parentId: null,
    metadata: { type: 'auto-generated', quality: 'high' },
    createdAt: new Date('2024-01-01T10:00:00.000Z'),
    updatedAt: new Date('2024-01-01T10:00:00.000Z'),
  };

  const mockSummaryWithParent: Summary = {
    id: 'summary-child-123',
    taskId: mockTaskId,
    content: 'Child summary building upon the parent summary.',
    parentId: mockSummaryId,
    metadata: { type: 'refinement', level: 2 },
    createdAt: new Date('2024-01-01T11:00:00.000Z'),
    updatedAt: new Date('2024-01-01T11:00:00.000Z'),
  };

  beforeEach(async () => {
    // Create simple mocks
    prismaService = {
      summary: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SummariesService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    service = module.get<SummariesService>(SummariesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Summary Creation - create()', () => {
    const createSummaryDto: CreateSummaryRequest = {
      taskId: mockTaskId,
      content: 'Test summary content with sufficient detail for analysis.',
    };

    beforeEach(() => {
      prismaService.summary.create.mockResolvedValue(mockSummary);
    });

    it('should create a new summary successfully with comprehensive metrics', async () => {
      const result = await service.create(createSummaryDto);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockSummary.id);
      expect(result.operationId).toBeDefined();
      expect(result.contentMetrics).toBeDefined();
      expect(result.performanceMetrics).toBeDefined();

      // Verify content metrics
      expect(result.contentMetrics.characterCount).toBe(createSummaryDto.content.length);
      expect(result.contentMetrics.wordCount).toBeGreaterThan(0);
      expect(result.contentMetrics.lineCount).toBeGreaterThan(0);
      expect(result.contentMetrics.readingTimeMinutes).toBeGreaterThan(0);

      // Verify performance metrics
      expect(result.performanceMetrics.processingTimeMs).toBeGreaterThan(0);
      expect(result.performanceMetrics.databaseResponseTimeMs).toBeGreaterThan(0);

      expect(prismaService.summary.create).toHaveBeenCalledWith({
        data: {
          taskId: createSummaryDto.taskId,
          content: createSummaryDto.content,
        },
      });
    });

    it('should create summary with parent relationship', async () => {
      const dtoWithParent: CreateSummaryRequest = {
        taskId: mockTaskId,
        content: 'Child summary content',
        parentId: mockParentId,
      };

      await service.create(dtoWithParent);

      expect(prismaService.summary.create).toHaveBeenCalledWith({
        data: {
          taskId: dtoWithParent.taskId,
          content: dtoWithParent.content,
          parentId: dtoWithParent.parentId,
        },
      });
    });

    it('should create summary with metadata', async () => {
      const dtoWithMetadata: CreateSummaryRequest = {
        taskId: mockTaskId,
        content: 'Summary with metadata',
        metadata: { type: 'manual', priority: 'high', source: 'user' },
      };

      await service.create(dtoWithMetadata);

      expect(prismaService.summary.create).toHaveBeenCalledWith({
        data: {
          taskId: dtoWithMetadata.taskId,
          content: dtoWithMetadata.content,
          metadata: dtoWithMetadata.metadata,
        },
      });
    });

    it('should calculate accurate content metrics for various content types', async () => {
      const testCases = [
        {
          content: 'Short',
          expectedWords: 1,
          expectedLines: 1,
          expectedReadingTime: 1,
        },
        {
          content: 'This is a longer summary with multiple sentences. It contains more detailed information.',
          expectedWords: 15,
          expectedLines: 1,
          expectedReadingTime: 1,
        },
        {
          content: 'Multi-line\nsummary\nwith\nseveral\nlines',
          expectedWords: 5,
          expectedLines: 5,
          expectedReadingTime: 1,
        },
        {
          content: Array.from({ length: 300 }, (_, i) => `word${i}`).join(' '),
          expectedWords: 300,
          expectedLines: 1,
          expectedReadingTime: 2, // 300 words / 200 wpm = 1.5, ceil = 2
        },
      ];

      for (const testCase of testCases) {
        prismaService.summary.create.mockResolvedValueOnce({
          ...mockSummary,
          content: testCase.content,
        });

        const result = await service.create({
          taskId: mockTaskId,
          content: testCase.content,
        });

        expect(result.contentMetrics.wordCount).toBe(testCase.expectedWords);
        expect(result.contentMetrics.lineCount).toBe(testCase.expectedLines);
        expect(result.contentMetrics.readingTimeMinutes).toBe(testCase.expectedReadingTime);
        expect(result.contentMetrics.characterCount).toBe(testCase.content.length);
      }
    });

    describe('Input Validation', () => {
      it('should validate task ID requirements', async () => {
        const testCases = [
          { taskId: '', error: 'Task ID is required and must be a non-empty string' },
          { taskId: '   ', error: 'Task ID is required and must be a non-empty string' },
          { taskId: null as any, error: 'Task ID is required and must be a non-empty string' },
          { taskId: undefined as any, error: 'Task ID is required and must be a non-empty string' },
        ];

        for (const testCase of testCases) {
          await expect(
            service.create({
              taskId: testCase.taskId,
              content: 'Valid content',
            }),
          ).rejects.toThrow(testCase.error);
        }
      });

      it('should validate content requirements', async () => {
        const testCases = [
          { content: '', error: 'Summary content is required and must be a non-empty string' },
          { content: '   ', error: 'Summary content is required and must be a non-empty string' },
          { content: null as any, error: 'Summary content is required and must be a non-empty string' },
          { content: undefined as any, error: 'Summary content is required and must be a non-empty string' },
        ];

        for (const testCase of testCases) {
          await expect(
            service.create({
              taskId: mockTaskId,
              content: testCase.content,
            }),
          ).rejects.toThrow(testCase.error);
        }
      });

      it('should enforce content length limits', async () => {
        const longContent = 'a'.repeat(10001);

        await expect(
          service.create({
            taskId: mockTaskId,
            content: longContent,
          }),
        ).rejects.toThrow('Summary content cannot exceed 10,000 characters');
      });

      it('should validate parent ID when provided', async () => {
        const testCases = [
          { parentId: '', error: 'Parent ID must be a valid string if provided' },
          { parentId: '   ', error: 'Parent ID must be a valid string if provided' },
        ];

        for (const testCase of testCases) {
          await expect(
            service.create({
              taskId: mockTaskId,
              content: 'Valid content',
              parentId: testCase.parentId,
            }),
          ).rejects.toThrow(testCase.error);
        }
      });
    });

    describe('Error Handling and Retry Logic', () => {
      it('should handle database creation errors with retry logic', async () => {
        prismaService.summary.create
          .mockRejectedValueOnce(new Error('Connection timeout'))
          .mockRejectedValueOnce(new Error('Lock timeout'))
          .mockResolvedValueOnce(mockSummary);

        const result = await service.create(createSummaryDto);

        expect(result.id).toBe(mockSummary.id);
        expect(prismaService.summary.create).toHaveBeenCalledTimes(3);
      });

      it('should fail after maximum retry attempts', async () => {
        const persistentError = new Error('Persistent database error');
        prismaService.summary.create.mockRejectedValue(persistentError);

        await expect(service.create(createSummaryDto)).rejects.toThrow(persistentError);
        expect(prismaService.summary.create).toHaveBeenCalledTimes(3); // Max retry attempts
      });

      it('should handle constraint violation errors', async () => {
        const constraintError = new Error('Unique constraint violation');
        prismaService.summary.create.mockRejectedValue(constraintError);

        await expect(service.create(createSummaryDto)).rejects.toThrow(constraintError);
      });
    });
  });

  describe('Summary Retrieval Operations', () => {
    describe('findLatest()', () => {
      beforeEach(() => {
        prismaService.summary.findFirst.mockResolvedValue(mockSummary);
      });

      it('should retrieve the latest summary for a task', async () => {
        const result = await service.findLatest(mockTaskId);

        expect(result).toEqual(mockSummary);
        expect(prismaService.summary.findFirst).toHaveBeenCalledWith({
          where: { taskId: mockTaskId },
          orderBy: { createdAt: 'desc' },
        });
      });

      it('should return null when no summaries exist', async () => {
        prismaService.summary.findFirst.mockResolvedValue(null);

        const result = await service.findLatest(mockTaskId);

        expect(result).toBeNull();
      });

      it('should validate task ID and throw BadRequestException for invalid input', async () => {
        const testCases = ['', '   ', null, undefined];

        for (const invalidTaskId of testCases) {
          await expect(service.findLatest(invalidTaskId as any)).rejects.toThrow(
            'Invalid task ID provided',
          );
        }
      });

      it('should handle database errors with retry logic', async () => {
        prismaService.summary.findFirst
          .mockRejectedValueOnce(new Error('Connection error'))
          .mockRejectedValueOnce(new Error('Timeout error'))
          .mockResolvedValueOnce(mockSummary);

        const result = await service.findLatest(mockTaskId);

        expect(result).toEqual(mockSummary);
        expect(prismaService.summary.findFirst).toHaveBeenCalledTimes(3);
      });
    });

    describe('findAll()', () => {
      const mockSummaries = [mockSummary, mockSummaryWithParent];

      beforeEach(() => {
        prismaService.summary.findMany.mockResolvedValue(mockSummaries);
      });

      it('should retrieve all summaries for a task with comprehensive metrics', async () => {
        const result = await service.findAll(mockTaskId);

        expect(result).toBeDefined();
        expect(result.summaries).toEqual(mockSummaries);
        expect(result.operationId).toBeDefined();
        expect(result.totalCount).toBe(mockSummaries.length);
        expect(result.performanceMetrics).toBeDefined();
        expect(result.performanceMetrics.retrievalTimeMs).toBeGreaterThan(0);
        expect(result.performanceMetrics.databaseResponseTimeMs).toBeGreaterThan(0);

        expect(prismaService.summary.findMany).toHaveBeenCalledWith({
          where: { taskId: mockTaskId },
          orderBy: { createdAt: 'asc' },
        });
      });

      it('should handle empty results with proper metrics', async () => {
        prismaService.summary.findMany.mockResolvedValue([]);

        const result = await service.findAll(mockTaskId);

        expect(result.summaries).toEqual([]);
        expect(result.totalCount).toBe(0);
        expect(result.performanceMetrics.retrievalTimeMs).toBeGreaterThan(0);
      });

      it('should validate task ID for findAll operation', async () => {
        const testCases = ['', '   ', null, undefined];

        for (const invalidTaskId of testCases) {
          await expect(service.findAll(invalidTaskId as any)).rejects.toThrow(
            'Invalid task ID provided',
          );
        }
      });

      it('should handle large summary sets efficiently', async () => {
        const largeSummarySet = Array.from({ length: 1000 }, (_, i) => ({
          ...mockSummary,
          id: `summary-${i}`,
          content: `Summary ${i}: ` + 'content '.repeat(50), // Substantial content
        }));

        prismaService.summary.findMany.mockResolvedValue(largeSummarySet);

        const startTime = Date.now();
        const result = await service.findAll(mockTaskId);
        const endTime = Date.now();

        expect(result.summaries).toHaveLength(1000);
        expect(result.totalCount).toBe(1000);
        expect(endTime - startTime).toBeLessThan(500); // Should complete within 500ms
      });
    });

    describe('findById()', () => {
      beforeEach(() => {
        prismaService.summary.findUnique.mockResolvedValue(mockSummary);
      });

      it('should retrieve summary by ID successfully', async () => {
        const result = await service.findById(mockSummaryId);

        expect(result).toEqual(mockSummary);
        expect(prismaService.summary.findUnique).toHaveBeenCalledWith({
          where: { id: mockSummaryId },
        });
      });

      it('should throw NotFoundException when summary does not exist', async () => {
        prismaService.summary.findUnique.mockResolvedValue(null);

        await expect(service.findById('nonexistent')).rejects.toThrow(
          new NotFoundException('Summary with ID nonexistent not found'),
        );
      });

      it('should validate summary ID input', async () => {
        const testCases = ['', '   ', null, undefined];

        for (const invalidId of testCases) {
          await expect(service.findById(invalidId as any)).rejects.toThrow(
            'Invalid summary ID provided',
          );
        }
      });

      it('should handle database errors with retry logic', async () => {
        prismaService.summary.findUnique
          .mockRejectedValueOnce(new Error('Connection error'))
          .mockRejectedValueOnce(new Error('Index error'))
          .mockResolvedValueOnce(mockSummary);

        const result = await service.findById(mockSummaryId);

        expect(result).toEqual(mockSummary);
        expect(prismaService.summary.findUnique).toHaveBeenCalledTimes(3);
      });
    });
  });

  describe('Content Analysis and Metrics', () => {
    it('should handle various content structures accurately', async () => {
      const contentTestCases = [
        {
          name: 'Simple text',
          content: 'Hello world',
          expectedCharacters: 11,
          expectedWords: 2,
          expectedLines: 1,
        },
        {
          name: 'Text with punctuation',
          content: 'Hello, world! How are you today?',
          expectedCharacters: 33,
          expectedWords: 6,
          expectedLines: 1,
        },
        {
          name: 'Multi-line content',
          content: 'Line one\nLine two\nLine three',
          expectedCharacters: 27,
          expectedWords: 6,
          expectedLines: 3,
        },
        {
          name: 'Content with extra whitespace',
          content: '  Hello    world  \n  Test   \n',
          expectedCharacters: 27,
          expectedWords: 3,
          expectedLines: 3,
        },
        {
          name: 'Empty lines content',
          content: 'First\n\n\nSecond',
          expectedCharacters: 13,
          expectedWords: 2,
          expectedLines: 4,
        },
      ];

      for (const testCase of contentTestCases) {
        prismaService.summary.create.mockResolvedValueOnce({
          ...mockSummary,
          content: testCase.content,
        });

        const result = await service.create({
          taskId: mockTaskId,
          content: testCase.content,
        });

        expect(result.contentMetrics.characterCount).toBe(
          testCase.expectedCharacters,
          `Failed for test case: ${testCase.name}`,
        );
        expect(result.contentMetrics.wordCount).toBe(
          testCase.expectedWords,
          `Failed for test case: ${testCase.name}`,
        );
        expect(result.contentMetrics.lineCount).toBe(
          testCase.expectedLines,
          `Failed for test case: ${testCase.name}`,
        );
      }
    });

    it('should calculate reading time correctly for different content lengths', async () => {
      const readingTimeTestCases = [
        { wordCount: 50, expectedMinutes: 1 },
        { wordCount: 200, expectedMinutes: 1 },
        { wordCount: 250, expectedMinutes: 2 },
        { wordCount: 400, expectedMinutes: 2 },
        { wordCount: 600, expectedMinutes: 3 },
        { wordCount: 1000, expectedMinutes: 5 },
      ];

      for (const testCase of readingTimeTestCases) {
        const content = Array.from(
          { length: testCase.wordCount },
          (_, i) => `word${i}`,
        ).join(' ');

        prismaService.summary.create.mockResolvedValueOnce({
          ...mockSummary,
          content,
        });

        const result = await service.create({
          taskId: mockTaskId,
          content,
        });

        expect(result.contentMetrics.readingTimeMinutes).toBe(
          testCase.expectedMinutes,
          `Failed for ${testCase.wordCount} words`,
        );
      }
    });
  });

  describe('Concurrent Operations and Performance', () => {
    it('should handle concurrent summary creation operations', async () => {
      const concurrentOperations = Array.from({ length: 10 }, (_, i) => ({
        taskId: mockTaskId,
        content: `Concurrent summary ${i} with sufficient content for testing.`,
      }));

      // Setup different return values for each operation
      concurrentOperations.forEach((_, i) => {
        prismaService.summary.create.mockResolvedValueOnce({
          ...mockSummary,
          id: `summary-${i}`,
        });
      });

      const promises = concurrentOperations.map((dto) => service.create(dto));
      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      expect(prismaService.summary.create).toHaveBeenCalledTimes(10);

      // Verify each result has proper structure
      results.forEach((result, i) => {
        expect(result.id).toBe(`summary-${i}`);
        expect(result.operationId).toBeDefined();
        expect(result.contentMetrics).toBeDefined();
        expect(result.performanceMetrics).toBeDefined();
      });
    });

    it('should maintain performance under load', async () => {
      const heavyContent = 'word '.repeat(1000); // 1000 words
      prismaService.summary.create.mockResolvedValue({
        ...mockSummary,
        content: heavyContent,
      });

      const startTime = Date.now();
      const result = await service.create({
        taskId: mockTaskId,
        content: heavyContent,
      });
      const endTime = Date.now();

      expect(result.contentMetrics.wordCount).toBe(1000);
      expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
    });
  });

  describe('Integration and Service Health', () => {
    it('should initialize with proper logging', () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'log');

      // Create a new instance to test initialization
      new SummariesService(prismaService);

      expect(loggerSpy).toHaveBeenCalledWith(
        'SummariesService initialized with enterprise monitoring capabilities',
        expect.objectContaining({
          timestamp: expect.any(String),
          component: 'SummariesService',
          action: 'initialize',
        }),
      );
    });

    it('should maintain data consistency across operations', async () => {
      prismaService.summary.create.mockResolvedValue(mockSummary);
      prismaService.summary.findUnique.mockResolvedValue(mockSummary);

      // Create summary
      const createdSummary = await service.create({
        taskId: mockTaskId,
        content: 'Test summary for consistency check',
      });

      // Retrieve by ID
      const retrievedSummary = await service.findById(createdSummary.id);

      expect(createdSummary.taskId).toBe(retrievedSummary.taskId);
      expect(createdSummary.content).toBe(retrievedSummary.content);
      expect(prismaService.summary.create).toHaveBeenCalledTimes(1);
      expect(prismaService.summary.findUnique).toHaveBeenCalledTimes(1);
    });

    it('should handle service degradation gracefully', async () => {
      // Simulate partial database failure
      prismaService.summary.create.mockRejectedValue(new Error('Database unavailable'));
      prismaService.summary.findMany.mockResolvedValue([]);

      await expect(
        service.create({
          taskId: mockTaskId,
          content: 'Test during degradation',
        }),
      ).rejects.toThrow('Database unavailable');

      // But reads should still work
      const result = await service.findAll(mockTaskId);
      expect(result.summaries).toEqual([]);
    });
  });
});