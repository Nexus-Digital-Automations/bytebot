/**
 * Validation Pipe Unit Tests - Comprehensive testing for input validation
 * Tests request validation, transformation, and security sanitization
 *
 * Test Coverage:
 * - DTO validation with class-validator
 * - Request body transformation
 * - Query parameter validation
 * - Path parameter validation
 * - Nested object validation
 * - Array validation and transformation
 * - Custom validation rules
 * - Error handling and messaging
 * - Security validation patterns
 * - Performance testing
 *
 * @author Testing & Quality Assurance Specialist
 * @version 1.0.0
 * @since Phase 1: Bytebot API Hardening
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { ValidationPipe } from '../validation.pipe';
import {
  IsString,
  IsEmail,
  IsOptional,
  IsArray,
  IsInt,
  Min,
  Max,
  Length,
  IsEnum,
  ValidateNested,
  IsUUID,
  IsDate,
  IsBoolean,
  Matches,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

// Test DTOs for validation
class CreateUserDto {
  @IsString()
  @Length(2, 50)
  readonly firstName: string;

  @IsString()
  @Length(2, 50)
  readonly lastName: string;

  @IsEmail()
  readonly email: string;

  @IsString()
  @Length(8, 128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
  readonly password: string;

  @IsOptional()
  @IsString()
  @Length(10, 15)
  readonly phoneNumber?: string;
}

enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest',
}

class UpdateUserDto {
  @IsOptional()
  @IsString()
  @Length(2, 50)
  readonly firstName?: string;

  @IsOptional()
  @IsString()
  @Length(2, 50)
  readonly lastName?: string;

  @IsOptional()
  @IsEmail()
  readonly email?: string;

  @IsOptional()
  @IsEnum(UserRole)
  readonly role?: UserRole;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  readonly tags?: string[];
}

class NestedAddressDto {
  @IsString()
  @Length(1, 100)
  readonly street: string;

  @IsString()
  @Length(1, 50)
  readonly city: string;

  @IsString()
  @Length(2, 10)
  readonly postalCode: string;
}

class UserWithAddressDto {
  @IsString()
  @Length(2, 50)
  readonly name: string;

  @ValidateNested()
  @Type(() => NestedAddressDto)
  readonly address: NestedAddressDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NestedAddressDto)
  readonly additionalAddresses?: NestedAddressDto[];
}

class QueryDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  @Max(100)
  readonly limit?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(0)
  readonly offset?: number;

  @IsOptional()
  @IsString()
  readonly search?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  readonly includeDeleted?: boolean;
}

class ParamDto {
  @IsUUID()
  readonly id: string;
}

describe('ValidationPipe', () => {
  let pipe: ValidationPipe;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ValidationPipe],
    }).compile();

    pipe = module.get<ValidationPipe>(ValidationPipe);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('body validation', () => {
    const bodyMetadata: ArgumentMetadata = {
      type: 'body',
      metatype: CreateUserDto,
      data: '',
    };

    it('should validate valid request body', async () => {
      // Arrange
      const validUser = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        password: 'SecurePassword123!',
        phoneNumber: '+1234567890',
      };

      // Act
      const result = await pipe.transform(validUser, bodyMetadata);

      // Assert
      expect(result).toBeInstanceOf(CreateUserDto);
      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Doe');
      expect(result.email).toBe('john.doe@example.com');
      expect(result.phoneNumber).toBe('+1234567890');
    });

    it('should throw BadRequestException for invalid email', async () => {
      // Arrange
      const invalidUser = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'invalid-email',
        password: 'SecurePassword123!',
      };

      // Act & Assert
      await expect(pipe.transform(invalidUser, bodyMetadata)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should validate password strength requirements', async () => {
      // Arrange
      const weakPasswords = [
        'password', // No uppercase, numbers, symbols
        'PASSWORD', // No lowercase, numbers, symbols
        'Password', // No numbers, symbols
        'Password123', // No symbols
        'Pass!', // Too short
        'a'.repeat(129), // Too long
      ];

      for (const password of weakPasswords) {
        const invalidUser = {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          password,
        };

        // Act & Assert
        await expect(pipe.transform(invalidUser, bodyMetadata)).rejects.toThrow(
          BadRequestException,
        );
      }
    });

    it('should validate string length requirements', async () => {
      // Arrange
      const invalidLengthCases = [
        { firstName: 'J', lastName: 'Doe' }, // firstName too short
        { firstName: 'J'.repeat(51), lastName: 'Doe' }, // firstName too long
        { firstName: 'John', lastName: 'D' }, // lastName too short
        { firstName: 'John', lastName: 'D'.repeat(51) }, // lastName too long
      ];

      for (const testCase of invalidLengthCases) {
        const invalidUser = {
          ...testCase,
          email: 'john.doe@example.com',
          password: 'SecurePassword123!',
        };

        // Act & Assert
        await expect(pipe.transform(invalidUser, bodyMetadata)).rejects.toThrow(
          BadRequestException,
        );
      }
    });

    it('should validate required fields', async () => {
      // Arrange
      const incompleteUser = {
        firstName: 'John',
        // Missing required fields: lastName, email, password
      };

      // Act & Assert
      await expect(
        pipe.transform(incompleteUser, bodyMetadata),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate optional fields when provided', async () => {
      // Arrange - invalid optional phone number
      const userWithInvalidPhone = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        password: 'SecurePassword123!',
        phoneNumber: '123', // Too short
      };

      // Act & Assert
      await expect(
        pipe.transform(userWithInvalidPhone, bodyMetadata),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow missing optional fields', async () => {
      // Arrange
      const userWithoutOptional = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        password: 'SecurePassword123!',
        // phoneNumber is optional and missing
      };

      // Act
      const result = await pipe.transform(userWithoutOptional, bodyMetadata);

      // Assert
      expect(result).toBeInstanceOf(CreateUserDto);
      expect(result.phoneNumber).toBeUndefined();
    });
  });

  describe('query parameter validation', () => {
    const queryMetadata: ArgumentMetadata = {
      type: 'query',
      metatype: QueryDto,
      data: '',
    };

    it('should validate and transform query parameters', async () => {
      // Arrange
      const queryParams = {
        limit: '10',
        offset: '20',
        search: 'john',
        includeDeleted: 'true',
      };

      // Act
      const result = await pipe.transform(queryParams, queryMetadata);

      // Assert
      expect(result).toBeInstanceOf(QueryDto);
      expect(result.limit).toBe(10); // Transformed to number
      expect(result.offset).toBe(20); // Transformed to number
      expect(result.search).toBe('john');
      expect(result.includeDeleted).toBe(true); // Transformed to boolean
    });

    it('should validate numeric parameter ranges', async () => {
      // Arrange
      const invalidQueries = [
        { limit: '0' }, // Below minimum
        { limit: '101' }, // Above maximum
        { offset: '-1' }, // Below minimum
      ];

      for (const query of invalidQueries) {
        // Act & Assert
        await expect(pipe.transform(query, queryMetadata)).rejects.toThrow(
          BadRequestException,
        );
      }
    });

    it('should handle string to number transformation errors', async () => {
      // Arrange
      const invalidQuery = {
        limit: 'not-a-number',
        offset: 'invalid',
      };

      // Act & Assert
      await expect(pipe.transform(invalidQuery, queryMetadata)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle boolean transformation', async () => {
      // Arrange
      const booleanQueries = [
        { includeDeleted: 'true', expected: true },
        { includeDeleted: 'false', expected: false },
        { includeDeleted: '1', expected: false }, // Only 'true' should be true
        { includeDeleted: 'yes', expected: false },
      ];

      for (const { includeDeleted, expected } of booleanQueries) {
        // Act
        const result = await pipe.transform({ includeDeleted }, queryMetadata);

        // Assert
        expect(result.includeDeleted).toBe(expected);
      }
    });
  });

  describe('path parameter validation', () => {
    const paramMetadata: ArgumentMetadata = {
      type: 'param',
      metatype: ParamDto,
      data: '',
    };

    it('should validate UUID parameters', async () => {
      // Arrange
      const validUuid = {
        id: '123e4567-e89b-12d3-a456-426614174000',
      };

      // Act
      const result = await pipe.transform(validUuid, paramMetadata);

      // Assert
      expect(result).toBeInstanceOf(ParamDto);
      expect(result.id).toBe(validUuid.id);
    });

    it('should reject invalid UUID parameters', async () => {
      // Arrange
      const invalidUuids = [
        { id: 'not-a-uuid' },
        { id: '123' },
        { id: '123e4567-e89b-12d3-a456' }, // Incomplete UUID
        { id: '' },
      ];

      for (const invalidParam of invalidUuids) {
        // Act & Assert
        await expect(
          pipe.transform(invalidParam, paramMetadata),
        ).rejects.toThrow(BadRequestException);
      }
    });
  });

  describe('nested object validation', () => {
    const nestedMetadata: ArgumentMetadata = {
      type: 'body',
      metatype: UserWithAddressDto,
      data: '',
    };

    it('should validate nested objects', async () => {
      // Arrange
      const userWithAddress = {
        name: 'John Doe',
        address: {
          street: '123 Main St',
          city: 'Anytown',
          postalCode: '12345',
        },
      };

      // Act
      const result = await pipe.transform(userWithAddress, nestedMetadata);

      // Assert
      expect(result).toBeInstanceOf(UserWithAddressDto);
      expect(result.address).toBeInstanceOf(NestedAddressDto);
      expect(result.address.street).toBe('123 Main St');
      expect(result.address.city).toBe('Anytown');
      expect(result.address.postalCode).toBe('12345');
    });

    it('should validate nested object properties', async () => {
      // Arrange
      const userWithInvalidAddress = {
        name: 'John Doe',
        address: {
          street: '', // Too short
          city: 'Anytown',
          postalCode: '12345',
        },
      };

      // Act & Assert
      await expect(
        pipe.transform(userWithInvalidAddress, nestedMetadata),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate arrays of nested objects', async () => {
      // Arrange
      const userWithMultipleAddresses = {
        name: 'John Doe',
        address: {
          street: '123 Main St',
          city: 'Anytown',
          postalCode: '12345',
        },
        additionalAddresses: [
          {
            street: '456 Oak Ave',
            city: 'Another City',
            postalCode: '67890',
          },
          {
            street: '789 Pine Rd',
            city: 'Third City',
            postalCode: '11111',
          },
        ],
      };

      // Act
      const result = await pipe.transform(
        userWithMultipleAddresses,
        nestedMetadata,
      );

      // Assert
      expect(result).toBeInstanceOf(UserWithAddressDto);
      expect(result.additionalAddresses).toHaveLength(2);
      expect(result.additionalAddresses[0]).toBeInstanceOf(NestedAddressDto);
      expect(result.additionalAddresses[1]).toBeInstanceOf(NestedAddressDto);
    });

    it('should validate each object in nested arrays', async () => {
      // Arrange
      const userWithInvalidNestedArray = {
        name: 'John Doe',
        address: {
          street: '123 Main St',
          city: 'Anytown',
          postalCode: '12345',
        },
        additionalAddresses: [
          {
            street: '456 Oak Ave',
            city: 'Another City',
            postalCode: '67890',
          },
          {
            street: '', // Invalid - too short
            city: 'Third City',
            postalCode: '11111',
          },
        ],
      };

      // Act & Assert
      await expect(
        pipe.transform(userWithInvalidNestedArray, nestedMetadata),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('array validation', () => {
    const updateMetadata: ArgumentMetadata = {
      type: 'body',
      metatype: UpdateUserDto,
      data: '',
    };

    it('should validate array properties', async () => {
      // Arrange
      const userUpdate = {
        firstName: 'John',
        tags: ['developer', 'admin', 'active'],
      };

      // Act
      const result = await pipe.transform(userUpdate, updateMetadata);

      // Assert
      expect(result).toBeInstanceOf(UpdateUserDto);
      expect(result.tags).toEqual(['developer', 'admin', 'active']);
    });

    it('should validate array size constraints', async () => {
      // Arrange
      const userWithEmptyTags = {
        firstName: 'John',
        tags: [], // Below minimum size
      };

      const userWithTooManyTags = {
        firstName: 'John',
        tags: Array.from({ length: 11 }, (_, i) => `tag${i}`), // Above maximum size
      };

      // Act & Assert
      await expect(
        pipe.transform(userWithEmptyTags, updateMetadata),
      ).rejects.toThrow(BadRequestException);

      await expect(
        pipe.transform(userWithTooManyTags, updateMetadata),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate each array element', async () => {
      // Arrange
      const userWithInvalidArrayElement = {
        firstName: 'John',
        tags: ['valid-tag', 123, 'another-valid-tag'], // 123 is not a string
      };

      // Act & Assert
      await expect(
        pipe.transform(userWithInvalidArrayElement, updateMetadata),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate enum values', async () => {
      // Arrange
      const validRoleUpdate = {
        firstName: 'John',
        role: UserRole.ADMIN,
      };

      const invalidRoleUpdate = {
        firstName: 'John',
        role: 'invalid-role',
      };

      // Act
      const validResult = await pipe.transform(validRoleUpdate, updateMetadata);

      // Assert
      expect(validResult.role).toBe(UserRole.ADMIN);

      await expect(
        pipe.transform(invalidRoleUpdate, updateMetadata),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('error handling and messaging', () => {
    const bodyMetadata: ArgumentMetadata = {
      type: 'body',
      metatype: CreateUserDto,
      data: '',
    };

    it('should provide detailed error messages', async () => {
      // Arrange
      const invalidUser = {
        firstName: 'J', // Too short
        email: 'invalid-email',
        password: 'weak',
      };

      // Act & Assert
      try {
        await pipe.transform(invalidUser, bodyMetadata);
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.getResponse()).toMatchObject({
          statusCode: 400,
          message: expect.arrayContaining([
            expect.stringContaining('firstName'),
            expect.stringContaining('lastName'),
            expect.stringContaining('email'),
            expect.stringContaining('password'),
          ]),
          error: 'Bad Request',
        });
      }
    });

    it('should handle validation of primitive types', async () => {
      // Arrange
      const primitiveMetadata: ArgumentMetadata = {
        type: 'body',
        metatype: String,
        data: '',
      };

      // Act
      const result = await pipe.transform('simple string', primitiveMetadata);

      // Assert
      expect(result).toBe('simple string');
    });

    it('should handle undefined metatype', async () => {
      // Arrange
      const undefinedMetadata: ArgumentMetadata = {
        type: 'body',
        metatype: undefined,
        data: '',
      };

      // Act
      const result = await pipe.transform({ any: 'data' }, undefinedMetadata);

      // Assert
      expect(result).toEqual({ any: 'data' });
    });

    it('should sanitize error messages to prevent information leakage', async () => {
      // Arrange
      const invalidUser = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        password: 'password-with-secret-info',
      };

      // Act & Assert
      try {
        await pipe.transform(invalidUser, bodyMetadata);
      } catch (error) {
        const errorMessage = JSON.stringify(error.getResponse());
        expect(errorMessage).not.toContain('secret-info');
      }
    });
  });

  describe('security validation', () => {
    const bodyMetadata: ArgumentMetadata = {
      type: 'body',
      metatype: CreateUserDto,
      data: '',
    };

    it('should prevent script injection in string fields', async () => {
      // Arrange
      const maliciousUser = {
        firstName: '<script>alert("xss")</script>',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        password: 'SecurePassword123!',
      };

      // Act & Assert
      // The validation should either sanitize or reject the input
      try {
        const result = await pipe.transform(maliciousUser, bodyMetadata);
        // If it passes validation, it should be sanitized
        expect(result.firstName).not.toContain('<script>');
      } catch (error) {
        // If it's rejected, that's also acceptable
        expect(error).toBeInstanceOf(BadRequestException);
      }
    });

    it('should validate email format strictly', async () => {
      // Arrange
      const maliciousEmails = [
        'user@domain.com<script>',
        'user+<script>@domain.com',
        'user@domain.com\n\rBcc: attacker@evil.com',
        'user@domain.com; DROP TABLE users;',
      ];

      for (const email of maliciousEmails) {
        const user = {
          firstName: 'John',
          lastName: 'Doe',
          email,
          password: 'SecurePassword123!',
        };

        // Act & Assert
        await expect(pipe.transform(user, bodyMetadata)).rejects.toThrow(
          BadRequestException,
        );
      }
    });

    it('should handle very large payloads', async () => {
      // Arrange
      const largeUser = {
        firstName: 'A'.repeat(10000), // Very large string
        lastName: 'Doe',
        email: 'john.doe@example.com',
        password: 'SecurePassword123!',
      };

      // Act & Assert
      await expect(pipe.transform(largeUser, bodyMetadata)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('performance testing', () => {
    const bodyMetadata: ArgumentMetadata = {
      type: 'body',
      metatype: CreateUserDto,
      data: '',
    };

    it('should validate within performance threshold', async () => {
      // Arrange
      const validUser = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        password: 'SecurePassword123!',
      };

      // Act
      const startTime = Date.now();
      await pipe.transform(validUser, bodyMetadata);
      const duration = Date.now() - startTime;

      // Assert
      expect(duration).toBeLessThan(100); // Should complete within 100ms
    });

    it('should handle concurrent validation requests', async () => {
      // Arrange
      const validUser = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        password: 'SecurePassword123!',
      };

      const concurrentRequests = 50;
      const promises = Array.from({ length: concurrentRequests }, () =>
        pipe.transform(validUser, bodyMetadata),
      );

      // Act
      const startTime = Date.now();
      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;

      // Assert
      expect(results).toHaveLength(concurrentRequests);
      expect(results.every((result) => result instanceof CreateUserDto)).toBe(
        true,
      );
      expect(duration).toBeLessThan(2000); // Should handle 50 concurrent validations within 2 seconds
    });

    it('should efficiently validate complex nested objects', async () => {
      // Arrange
      const complexUser = {
        name: 'John Doe',
        address: {
          street: '123 Main St',
          city: 'Anytown',
          postalCode: '12345',
        },
        additionalAddresses: Array.from({ length: 10 }, (_, i) => ({
          street: `${100 + i} Side St`,
          city: `City ${i}`,
          postalCode: `1234${i}`,
        })),
      };

      const nestedMetadata: ArgumentMetadata = {
        type: 'body',
        metatype: UserWithAddressDto,
        data: '',
      };

      // Act
      const startTime = Date.now();
      const result = await pipe.transform(complexUser, nestedMetadata);
      const duration = Date.now() - startTime;

      // Assert
      expect(result).toBeInstanceOf(UserWithAddressDto);
      expect(result.additionalAddresses).toHaveLength(10);
      expect(duration).toBeLessThan(200); // Should handle complex objects within 200ms
    });
  });

  describe('whitelist and transform options', () => {
    it('should remove unknown properties when whitelist is enabled', async () => {
      // This would test the whitelist functionality
      // Implementation depends on the pipe configuration

      // Arrange
      const userWithExtraProps = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        password: 'SecurePassword123!',
        unknownProperty: 'should be removed',
        anotherUnknown: 123,
      };

      const bodyMetadata: ArgumentMetadata = {
        type: 'body',
        metatype: CreateUserDto,
        data: '',
      };

      // Act
      const result = await pipe.transform(userWithExtraProps, bodyMetadata);

      // Assert
      expect(result).toBeInstanceOf(CreateUserDto);
      expect(result).not.toHaveProperty('unknownProperty');
      expect(result).not.toHaveProperty('anotherUnknown');
    });
  });
});
