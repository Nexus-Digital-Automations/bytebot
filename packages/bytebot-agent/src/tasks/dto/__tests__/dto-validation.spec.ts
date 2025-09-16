/**
 * DTO Validation Tests - Comprehensive Input Validation Testing
 *
 * Production-ready unit tests covering all DTO validation functionality:
 * - CreateTaskDto validation with all fields and edge cases
 * - UpdateTaskDto validation for task modifications
 * - TaskDto validation for response objects
 * - AddTaskMessageDto validation for message inputs
 * - TaskFileDto validation for file uploads
 * - Nested validation and complex object structures
 * - Error messages and validation feedback
 * - Type coercion and transformation testing
 *
 * @author Testing & Quality Assurance Specialist
 * @version 2.0.0
 * @since Phase 1: Bytebot Core Module Testing
 */

import { validate, ValidationError } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { CreateTaskDto, TaskFileDto } from '../create-task.dto';
import { UpdateTaskDto } from '../update-task.dto';
import { AddTaskMessageDto } from '../add-task-message.dto';
import { TaskDto } from '../task.dto';
import { TaskType, TaskPriority, TaskStatus, MessageRole } from '@prisma/client';

describe('DTO Validation Tests', () => {
  describe('CreateTaskDto', () => {
    describe('Valid Input Cases', () => {
      it('should validate minimal valid CreateTaskDto', async () => {
        const dto = plainToClass(CreateTaskDto, {
          description: 'Test task description',
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      });

      it('should validate complete CreateTaskDto with all optional fields', async () => {
        const dto = plainToClass(CreateTaskDto, {
          description: 'Comprehensive test task',
          type: TaskType.IMMEDIATE,
          priority: TaskPriority.HIGH,
          createdBy: MessageRole.USER,
          scheduledFor: new Date('2024-12-25T10:00:00.000Z'),
          model: {
            provider: 'anthropic',
            name: 'claude-3-sonnet',
            temperature: 0.7,
          },
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      });

      it('should validate CreateTaskDto with files', async () => {
        const dto = plainToClass(CreateTaskDto, {
          description: 'Task with file attachments',
          files: [
            {
              name: 'test-file.txt',
              base64: 'data:text/plain;base64,dGVzdCBjb250ZW50',
              type: 'text/plain',
              size: 1024,
            },
            {
              name: 'image.jpg',
              base64: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD',
              type: 'image/jpeg',
              size: 2048,
            },
          ],
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      });

      it('should validate scheduled task with proper date format', async () => {
        const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
        const dto = plainToClass(CreateTaskDto, {
          description: 'Scheduled task',
          type: TaskType.SCHEDULED,
          scheduledFor: futureDate,
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      });

      it('should validate task with complex model configuration', async () => {
        const dto = plainToClass(CreateTaskDto, {
          description: 'Task with advanced model settings',
          model: {
            provider: 'anthropic',
            name: 'claude-3-opus',
            temperature: 0.8,
            maxTokens: 4000,
            topP: 0.9,
            frequencyPenalty: 0.1,
            presencePenalty: 0.1,
            stopSequences: ['Human:', 'Assistant:'],
            systemPrompt: 'You are a helpful assistant.',
          },
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      });
    });

    describe('Invalid Input Cases - Required Fields', () => {
      it('should reject CreateTaskDto without description', async () => {
        const dto = plainToClass(CreateTaskDto, {});

        const errors = await validate(dto);
        expect(errors).toHaveLength(1);
        expect(errors[0].property).toBe('description');
        expect(errors[0].constraints).toHaveProperty('isNotEmpty');
        expect(errors[0].constraints).toHaveProperty('isString');
      });

      it('should reject CreateTaskDto with empty description', async () => {
        const dto = plainToClass(CreateTaskDto, {
          description: '',
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(1);
        expect(errors[0].property).toBe('description');
        expect(errors[0].constraints).toHaveProperty('isNotEmpty');
      });

      it('should reject CreateTaskDto with non-string description', async () => {
        const dto = plainToClass(CreateTaskDto, {
          description: 123,
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(1);
        expect(errors[0].property).toBe('description');
        expect(errors[0].constraints).toHaveProperty('isString');
      });

      it('should reject CreateTaskDto with whitespace-only description', async () => {
        const dto = plainToClass(CreateTaskDto, {
          description: '   ',
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(1);
        expect(errors[0].property).toBe('description');
        expect(errors[0].constraints).toHaveProperty('isNotEmpty');
      });
    });

    describe('Invalid Input Cases - Optional Fields', () => {
      it('should reject CreateTaskDto with invalid task type', async () => {
        const dto = plainToClass(CreateTaskDto, {
          description: 'Valid description',
          type: 'INVALID_TYPE',
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(1);
        expect(errors[0].property).toBe('type');
      });

      it('should reject CreateTaskDto with invalid priority', async () => {
        const dto = plainToClass(CreateTaskDto, {
          description: 'Valid description',
          priority: 'INVALID_PRIORITY',
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(1);
        expect(errors[0].property).toBe('priority');
      });

      it('should reject CreateTaskDto with invalid createdBy role', async () => {
        const dto = plainToClass(CreateTaskDto, {
          description: 'Valid description',
          createdBy: 'INVALID_ROLE',
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(1);
        expect(errors[0].property).toBe('createdBy');
      });

      it('should reject CreateTaskDto with invalid scheduledFor date', async () => {
        const dto = plainToClass(CreateTaskDto, {
          description: 'Valid description',
          scheduledFor: 'not-a-date',
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(1);
        expect(errors[0].property).toBe('scheduledFor');
        expect(errors[0].constraints).toHaveProperty('isDate');
      });

      it('should reject CreateTaskDto with non-array files', async () => {
        const dto = plainToClass(CreateTaskDto, {
          description: 'Valid description',
          files: 'not-an-array',
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(1);
        expect(errors[0].property).toBe('files');
        expect(errors[0].constraints).toHaveProperty('isArray');
      });
    });

    describe('Nested Validation - TaskFileDto', () => {
      it('should validate nested TaskFileDto correctly', async () => {
        const dto = plainToClass(CreateTaskDto, {
          description: 'Task with valid files',
          files: [
            {
              name: 'document.pdf',
              base64: 'data:application/pdf;base64,JVBERi0xLjQ=',
              type: 'application/pdf',
              size: 5120,
            },
          ],
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      });

      it('should reject CreateTaskDto with invalid file structure', async () => {
        const dto = plainToClass(CreateTaskDto, {
          description: 'Task with invalid files',
          files: [
            {
              // Missing required fields
            },
          ],
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(1);
        expect(errors[0].property).toBe('files');
        expect(errors[0].children).toHaveLength(1);

        const fileError = errors[0].children![0];
        expect(fileError.constraints).toBeDefined();
        expect(Object.keys(fileError.constraints || {})).toContain('isNotEmpty');
      });

      it('should reject CreateTaskDto with file missing name', async () => {
        const dto = plainToClass(CreateTaskDto, {
          description: 'Task with incomplete file',
          files: [
            {
              base64: 'data:text/plain;base64,dGVzdA==',
              type: 'text/plain',
              size: 100,
            },
          ],
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(1);
        
        const fileValidation = errors[0].children![0];
        const nameError = fileValidation.children?.find(child => child.property === 'name');
        expect(nameError).toBeDefined();
        expect(nameError?.constraints).toHaveProperty('isNotEmpty');
      });

      it('should reject CreateTaskDto with file missing base64', async () => {
        const dto = plainToClass(CreateTaskDto, {
          description: 'Task with file missing data',
          files: [
            {
              name: 'test.txt',
              type: 'text/plain',
              size: 100,
            },
          ],
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(1);
        
        const fileValidation = errors[0].children![0];
        const base64Error = fileValidation.children?.find(child => child.property === 'base64');
        expect(base64Error).toBeDefined();
        expect(base64Error?.constraints).toHaveProperty('isNotEmpty');
      });

      it('should reject CreateTaskDto with file having invalid size', async () => {
        const dto = plainToClass(CreateTaskDto, {
          description: 'Task with invalid file size',
          files: [
            {
              name: 'test.txt',
              base64: 'data:text/plain;base64,dGVzdA==',
              type: 'text/plain',
              size: 'not-a-number',
            },
          ],
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(1);
        
        const fileValidation = errors[0].children![0];
        const sizeError = fileValidation.children?.find(child => child.property === 'size');
        expect(sizeError).toBeDefined();
        expect(sizeError?.constraints).toHaveProperty('isNumber');
      });
    });

    describe('Edge Cases and Boundary Conditions', () => {
      it('should handle very long descriptions', async () => {
        const longDescription = 'a'.repeat(10000); // 10KB description
        const dto = plainToClass(CreateTaskDto, {
          description: longDescription,
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(0); // Should pass basic validation
      });

      it('should handle many files', async () => {
        const manyFiles = Array.from({ length: 50 }, (_, i) => ({
          name: `file-${i}.txt`,
          base64: `data:text/plain;base64,ZmlsZS0ke2l9IGNvbnRlbnQ=`,
          type: 'text/plain',
          size: 100 + i,
        }));

        const dto = plainToClass(CreateTaskDto, {
          description: 'Task with many files',
          files: manyFiles,
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      });

      it('should handle null values gracefully', async () => {
        const dto = plainToClass(CreateTaskDto, {
          description: 'Valid description',
          type: null,
          priority: null,
          scheduledFor: null,
          files: null,
        });

        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0); // Should have validation errors for null values
      });

      it('should handle undefined values correctly', async () => {
        const dto = plainToClass(CreateTaskDto, {
          description: 'Valid description',
          type: undefined,
          priority: undefined,
          scheduledFor: undefined,
          files: undefined,
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(0); // Undefined should be fine for optional fields
      });
    });
  });

  describe('UpdateTaskDto', () => {
    it('should validate minimal UpdateTaskDto', async () => {
      const dto = plainToClass(UpdateTaskDto, {});

      const errors = await validate(dto);
      expect(errors).toHaveLength(0); // All fields are optional
    });

    it('should validate complete UpdateTaskDto', async () => {
      const dto = plainToClass(UpdateTaskDto, {
        description: 'Updated task description',
        status: TaskStatus.RUNNING,
        priority: TaskPriority.HIGH,
        executedAt: new Date(),
        completedAt: new Date(),
        error: 'Task execution error',
        result: { success: true, data: 'result' },
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject UpdateTaskDto with invalid status', async () => {
      const dto = plainToClass(UpdateTaskDto, {
        status: 'INVALID_STATUS',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('status');
    });

    it('should validate status transitions', async () => {
      const validStatuses = Object.values(TaskStatus);
      
      for (const status of validStatuses) {
        const dto = plainToClass(UpdateTaskDto, { status });
        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      }
    });
  });

  describe('AddTaskMessageDto', () => {
    it('should validate valid AddTaskMessageDto', async () => {
      const dto = plainToClass(AddTaskMessageDto, {
        message: 'Additional guidance for the task',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject AddTaskMessageDto without message', async () => {
      const dto = plainToClass(AddTaskMessageDto, {});

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('message');
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });

    it('should reject AddTaskMessageDto with empty message', async () => {
      const dto = plainToClass(AddTaskMessageDto, {
        message: '',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('message');
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });

    it('should handle very long messages', async () => {
      const longMessage = 'Message content '.repeat(1000); // ~15KB message
      const dto = plainToClass(AddTaskMessageDto, {
        message: longMessage,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should handle messages with special characters', async () => {
      const specialMessage = 'Message with émojis 🚀 and spécial çharaçters: @#$%^&*()';
      const dto = plainToClass(AddTaskMessageDto, {
        message: specialMessage,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('TaskDto', () => {
    it('should validate complete TaskDto response', async () => {
      const dto = plainToClass(TaskDto, {
        id: 'task-123',
        description: 'Task response object',
        type: TaskType.IMMEDIATE,
        status: TaskStatus.PENDING,
        priority: TaskPriority.MEDIUM,
        control: MessageRole.ASSISTANT,
        createdBy: MessageRole.USER,
        userId: 'user-456',
        createdAt: new Date(),
        updatedAt: new Date(),
        scheduledFor: null,
        executedAt: null,
        completedAt: null,
        queuedAt: null,
        error: null,
        result: null,
        model: { provider: 'anthropic', name: 'claude-3-sonnet' },
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate TaskDto with all optional fields populated', async () => {
      const dto = plainToClass(TaskDto, {
        id: 'task-123',
        description: 'Completed task',
        type: TaskType.SCHEDULED,
        status: TaskStatus.COMPLETED,
        priority: TaskPriority.HIGH,
        control: MessageRole.USER,
        createdBy: MessageRole.USER,
        userId: 'user-456',
        createdAt: new Date('2024-01-01T10:00:00.000Z'),
        updatedAt: new Date('2024-01-01T11:00:00.000Z'),
        scheduledFor: new Date('2024-01-01T12:00:00.000Z'),
        executedAt: new Date('2024-01-01T12:00:05.000Z'),
        completedAt: new Date('2024-01-01T12:05:00.000Z'),
        queuedAt: new Date('2024-01-01T11:59:00.000Z'),
        error: null,
        result: { success: true, output: 'Task completed successfully' },
        model: { provider: 'anthropic', name: 'claude-3-opus', temperature: 0.8 },
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should handle TaskDto with error state', async () => {
      const dto = plainToClass(TaskDto, {
        id: 'task-failed-123',
        description: 'Failed task',
        type: TaskType.IMMEDIATE,
        status: TaskStatus.FAILED,
        priority: TaskPriority.MEDIUM,
        control: MessageRole.ASSISTANT,
        createdBy: MessageRole.USER,
        userId: 'user-456',
        createdAt: new Date(),
        updatedAt: new Date(),
        scheduledFor: null,
        executedAt: new Date(),
        completedAt: null,
        queuedAt: null,
        error: 'Task execution failed due to timeout',
        result: null,
        model: null,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('Integration and Complex Scenarios', () => {
    it('should handle DTO transformation from plain objects', async () => {
      const plainObject = {
        description: 'Transform test',
        type: 'IMMEDIATE',
        priority: 'HIGH',
        scheduledFor: '2024-12-25T10:00:00.000Z',
      };

      const dto = plainToClass(CreateTaskDto, plainObject);
      
      expect(dto.description).toBe('Transform test');
      expect(dto.type).toBe('IMMEDIATE');
      expect(dto.priority).toBe('HIGH');
      expect(dto.scheduledFor).toBeInstanceOf(Date);

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate DTOs with JSON-serialized data', async () => {
      const jsonString = JSON.stringify({
        description: 'JSON test task',
        type: TaskType.SCHEDULED,
        model: {
          provider: 'anthropic',
          name: 'claude-3-sonnet',
          parameters: { temperature: 0.7, maxTokens: 2000 },
        },
        files: [
          {
            name: 'config.json',
            base64: 'data:application/json;base64,eyJ0ZXN0IjogdHJ1ZX0=',
            type: 'application/json',
            size: 15,
          },
        ],
      });

      const parsedObject = JSON.parse(jsonString);
      const dto = plainToClass(CreateTaskDto, parsedObject);
      
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should handle concurrent validation of multiple DTOs', async () => {
      const dtos = Array.from({ length: 100 }, (_, i) => 
        plainToClass(CreateTaskDto, {
          description: `Concurrent test task ${i}`,
          type: i % 2 === 0 ? TaskType.IMMEDIATE : TaskType.SCHEDULED,
          priority: Object.values(TaskPriority)[i % Object.values(TaskPriority).length],
        })
      );

      const validationPromises = dtos.map(dto => validate(dto));
      const results = await Promise.all(validationPromises);

      results.forEach((errors, index) => {
        expect(errors).toHaveLength(0);
      });
    });

    it('should provide detailed error information for debugging', async () => {
      const invalidDto = plainToClass(CreateTaskDto, {
        description: '', // Invalid
        type: 'INVALID', // Invalid
        priority: 123, // Invalid type
        scheduledFor: 'not-a-date', // Invalid
        files: [
          {
            name: '', // Invalid
            base64: '', // Invalid
            size: 'not-a-number', // Invalid
          },
        ],
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);

      // Check that errors contain useful debugging information
      errors.forEach(error => {
        expect(error.property).toBeDefined();
        expect(error.constraints).toBeDefined();
        expect(error.value).toBeDefined();
      });
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle validation of large DTOs efficiently', async () => {
      const largeDto = plainToClass(CreateTaskDto, {
        description: 'Large DTO test with extensive data',
        type: TaskType.IMMEDIATE,
        priority: TaskPriority.HIGH,
        model: {
          provider: 'anthropic',
          name: 'claude-3-opus',
          parameters: Object.fromEntries(
            Array.from({ length: 1000 }, (_, i) => [`param${i}`, `value${i}`])
          ),
        },
        files: Array.from({ length: 10 }, (_, i) => ({
          name: `large-file-${i}.bin`,
          base64: 'data:application/octet-stream;base64,' + 'A'.repeat(1000),
          type: 'application/octet-stream',
          size: 1024 * (i + 1),
        })),
      });

      const startTime = Date.now();
      const errors = await validate(largeDto);
      const endTime = Date.now();

      expect(errors).toHaveLength(0);
      expect(endTime - startTime).toBeLessThan(1000); // Should validate within 1 second
    });

    it('should handle malformed input gracefully', async () => {
      const malformedInputs = [
        null,
        undefined,
        '',
        123,
        [],
        { notAValidField: 'value' },
        { description: null },
        { description: undefined },
        { description: {} },
        { description: [] },
      ];

      for (const input of malformedInputs) {
        const dto = plainToClass(CreateTaskDto, input as any);
        const errors = await validate(dto);
        
        // Should either pass (for valid structures) or provide meaningful errors
        if (errors.length > 0) {
          expect(errors[0]).toHaveProperty('property');
          expect(errors[0]).toHaveProperty('constraints');
        }
      }
    });
  });
});