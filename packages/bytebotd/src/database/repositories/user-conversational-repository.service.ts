/**
 * User Conversational Repository Service
 *
 * Specialized repository service for User entities with comprehensive business logic
 * validation, security controls, and conversational approval workflows. Extends the
 * base conversational repository to provide user-specific validation and operations.
 *
 * Features:
 * - User-specific business rule validation
 * - Security-focused conversational validation
 * - Password and sensitive data handling
 * - Role-based access control validation
 * - User lifecycle management with audit trails
 * - Email validation and uniqueness checks
 *
 * @author Claude Code - User Management Specialist
 * @version 1.0.0
 */

import { Injectable, Logger } from '@nestjs/common';import { BaseConversationalRepositoryService, RepositoryOperationContext, BusinessValidationResult } from './base-conversational-repository.service';import { ConversationalDatabaseService } from '../conversational-database.service';import { UserEntity } from '../../test-utils/database-types';import { Repository, QueryOptions } from '../../types/index';/*** User-specific operation context
 */
export interface UserOperationContext extends RepositoryOperationContext {
  requireEmailValidation?: boolean;
  requirePasswordValidation?: boolean;
  requireRoleValidation?: boolean;
  bypassSecurityChecks?: boolean;
}

/**
 * User role validation result
 */
interface UserRoleValidation {
  valid: boolean;
  allowedRoles: string[];
  currentUserRole?: string;
  requiredPermissions: string[];
}

/**
 * User conversational repository service
 */
@Injectable()
export class UserConversationalRepositoryService extends BaseConversationalRepositoryService<UserEntity> {
  private readonly logger = new Logger(UserConversationalRepositoryService.name);

  /** Valid user roles */
  private readonly validRoles = ['admin', 'user', 'moderator', 'guest', 'system'];/** Email validation regex */private readonly emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  /** Sensitive fields to redact in logs */
  private readonly sensitiveFields = ['passwordHash', 'password', 'token', 'secret'];constructor(conversationalDbService: ConversationalDatabaseService,
    baseRepository: Repository<UserEntity>,
  ) {
    super(conversationalDbService, baseRepository);
    this.logger.log('User Conversational Repository Service initialized');}// ===== IMPLEMENTATION OF ABSTRACT METHODS =====

  /**
   * Get entity type name
   */
  protected getEntityType(): string {
    return 'User';
  }

  /**
   * Validate user-specific business rules
   */
  protected async validateBusinessRules(
    operation: string,
    data: Partial<UserEntity>,
    context?: UserOperationContext,
  ): Promise<BusinessValidationResult> {
    const result: BusinessValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      recommendations: [],
    };

    try {
      this.logger.debug(`Validating business rules for user ${operation}`, {operation,hasEmail: !!data.email,
        hasRole: !!data.role,
        context: this.sanitizeContext(context),
      });

      // Email validation
      if (data.email && context?.requireEmailValidation !== false) {
        const emailValidation = await this.validateEmail(data.email, operation);
        if (!emailValidation.valid) {
          result.errors.push(...emailValidation.errors);
          result.valid = false;
        }
        result.warnings.push(...emailValidation.warnings);
      }

      // Password validation (for create/update operations)
      if ((data as { password?: string }).password && context?.requirePasswordValidation !== false) {
        const passwordValidation = this.validatePassword((data as { password?: string }).password);
        if (!passwordValidation.valid) {
          result.errors.push(...passwordValidation.errors);
          result.valid = false;
        }
        result.warnings.push(...passwordValidation.warnings);
      }

      // Role validation
      if (data.role && context?.requireRoleValidation !== false) {
        const roleValidation = await this.validateUserRole(data.role, context);
        if (!roleValidation.valid) {
          result.errors.push(`Invalid role: ${data.role}. Allowed roles: ${roleValidation.allowedRoles.join(`, ')}`);
          result.valid = false;
        }
      }

      // Operation-specific validations
      switch (operation) {
        case 'create':await this.validateUserCreation(data, result);break;

        case 'update':await this.validateUserUpdate(data, result, context);break;

        case 'delete':await this.validateUserDeletion(data, result, context);break;

        case 'bulkDelete':
          await this.validateBulkUserDeletion(data, result, context);
          break;
      }

      // Security checks (unless bypassed)
      if (!context?.bypassSecurityChecks) {
        await this.performSecurityChecks(operation, data, result, context);
      }

      this.logger.debug(`Business rule validation completed for user ${operation}`, {
        valid: result.valid,
        errorsCount: result.errors.length,
        warningsCount: result.warnings.length,
        operation,
      });

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Business rule validation failed for user ${operation}: ${errorMessage}`, {operation,error: errorMessage,
        data: this.sanitizeUserData(data),
      });

      result.valid = false;
      result.errors.push(`Validation error: ${errorMessage}`);
      return result;
    }
  }

  /**
   * Transform user entity (redact sensitive data based on context)
   */
  protected async transformEntity(
    entity: UserEntity,
    context?: UserOperationContext,
  ): Promise<UserEntity> {
    // Create a copy to avoid modifying the original
    const transformed = { ...entity };

    // Always redact password hash unless explicitly requested by system
    if (context?.userRole !== 'system' && context?.bypassSecurityChecks !== true) {(transformed as Partial<UserEntity>).passwordHash = '[REDACTED]';
    }

    // Log access for audit purposes
    this.logger.debug(`User entity accessed`, {
      userId: entity.id,
      accessedBy: context?.userId,
      accessorRole: context?.userRole,
      redacted: context?.userRole !== 'system',});return transformed;
  }

  // ===== USER-SPECIFIC VALIDATION METHODS =====

  /**
   * Validate email format and uniqueness
   */
  private async validateEmail(
    email: string,
    operation: string,
  ): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> {
    const result = { valid: true, errors: [] as string[], warnings: [] as string[] };

    // Format validation
    if (!this.emailRegex.test(email)) {
      result.valid = false;
      result.errors.push('Invalid email format');return result;}

    // Domain validation
    const domain = email.split('@')[1];if (!domain || domain.length < 3) {result.valid = false;
      result.errors.push('Invalid email domain');return result;}

    // Uniqueness check (for create operations)
    if (operation === 'create') {try {const existingUsers = await this.baseRepository.findAll({
          filter: { email } as Partial<UserEntity>,
          limit: 1,
        } as QueryOptions);

        if (existingUsers.length > 0) {
          result.valid = false;
          result.errors.push('Email address already exists');}} catch (error) {
        this.logger.warn('Could not check email uniqueness', { email, error });result.warnings.push('Email uniqueness check failed - proceeding with caution');}}

    // Security warnings for common email patterns
    if (email.includes('+') || email.includes('..')) {result.warnings.push('Email contains potentially problematic characters');}return result;
  }

  /**
   * Validate password strength
   */
  private validatePassword(
    password?: string,
  ): { valid: boolean; errors: string[]; warnings: string[] } {
    const result = { valid: true, errors: [] as string[], warnings: [] as string[] };

    if (!password) {
      result.valid = false;
      result.errors.push('Password is required');return result;}

    // Length check
    if (password.length < 8) {
      result.valid = false;
      result.errors.push('Password must be at least 8 characters long');}// Complexity checks
    if (!/[A-Z]/.test(password)) {
      result.warnings.push('Password should contain at least one uppercase letter');}if (!/[a-z]/.test(password)) {
      result.warnings.push('Password should contain at least one lowercase letter');}if (!/\d/.test(password)) {
      result.warnings.push('Password should contain at least one number');
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      result.warnings.push('Password should contain at least one special character');}// Common password check
    const commonPasswords = ['password', '123456', 'qwerty', 'admin'];if (commonPasswords.some(common => password.toLowerCase().includes(common))) {result.valid = false;
      result.errors.push('Password contains common patterns and is not secure');
    }

    return result;
  }

  /**
   * Validate user role and permissions
   */
  private async validateUserRole(
    role: string,
    context?: UserOperationContext,
  ): Promise<UserRoleValidation> {
    const result: UserRoleValidation = {
      valid: false,
      allowedRoles: this.validRoles,
      currentUserRole: context?.userRole,
      requiredPermissions: [],
    };

    // Check if role is valid
    if (!this.validRoles.includes(role)) {
      return result;
    }

    // Check if current user has permission to assign this role
    if (context?.userRole) {
      const canAssignRole = await this.canAssignRole(context.userRole, role);
      result.valid = canAssignRole;

      if (!canAssignRole) {
        result.requiredPermissions.push(`Permission to assign '${role}' role`);
      }
    } else {
      // System operations can assign any valid role
      result.valid = true;
    }

    return result;
  }

  /**
   * Check if current user can assign the specified role
   */
  private async canAssignRole(currentRole: string, targetRole: string): Promise<boolean> {
    // Role hierarchy: admin > moderator > user > guest
    const roleHierarchy = {
      admin: 4,
      moderator: 3,
      user: 2,
      guest: 1,
      system: 5,
    };

    const currentLevel = roleHierarchy[currentRole as keyof typeof roleHierarchy] || 0;
    const targetLevel = roleHierarchy[targetRole as keyof typeof roleHierarchy] || 0;

    // Users can only assign roles at their level or below
    return currentLevel >= targetLevel;
  }

  // ===== OPERATION-SPECIFIC VALIDATIONS =====

  /**
   * Validate user creation
   */
  private async validateUserCreation(
    data: Partial<UserEntity>,
    result: BusinessValidationResult,
  ): Promise<void> {
    // Required fields check
    if (!data.email) {
      result.valid = false;
      result.errors.push('Email is required for user creation');}if (!data.role) {
      result.warnings.push('No role specified, will default to "user"');}// Default values recommendation
    if (data.isActive === undefined) {
      result.recommendations.push('Consider setting isActive explicitly (defaults to true)');}}

  /**
   * Validate user update
   */
  private async validateUserUpdate(
    data: Partial<UserEntity>,
    result: BusinessValidationResult,
    context?: UserOperationContext,
  ): Promise<void> {
    // Check if trying to update sensitive fields
    if (data.passwordHash && context?.userRole !== 'system') {result.valid = false;result.errors.push('Direct password hash updates are not allowed');
    }

    // Role change validation
    if (data.role && context?.userRole) {
      const canChangeRole = await this.canAssignRole(context.userRole, data.role);
      if (!canChangeRole) {
        result.valid = false;
        result.errors.push(`Insufficient permissions to change role to '${data.role}'`);
      }
    }

    // Warn about account deactivation
    if (data.isActive === false) {
      result.warnings.push('This operation will deactivate the user account');}}

  /**
   * Validate user deletion
   */
  private async validateUserDeletion(
    data: Partial<UserEntity>,
    result: BusinessValidationResult,
    context?: UserOperationContext,
  ): Promise<void> {
    // Check if trying to delete self
    if (data.id === context?.userId) {
      result.valid = false;
      result.errors.push('Users cannot delete their own accounts');}// Check permissions for deletion
    if (context?.userRole && !['admin', 'system'].includes(context.userRole)) {result.valid = false;result.errors.push('Insufficient permissions for user deletion');}result.warnings.push('User deletion is irreversible and will remove all associated data');result.recommendations.push('Consider deactivating the user instead of deletion');}/**
   * Validate bulk user deletion
   */
  private async validateBulkUserDeletion(
    data: Partial<UserEntity>,
    result: BusinessValidationResult,
    context?: UserOperationContext,
  ): Promise<void> {
    // Only system and admin can perform bulk deletions
    if (context?.userRole && !['admin', 'system'].includes(context.userRole)) {result.valid = false;result.errors.push('Insufficient permissions for bulk user deletion');}result.warnings.push('Bulk user deletion is a critical operation that cannot be undone');result.recommendations.push('Ensure all affected users have been properly notified');result.recommendations.push('Consider bulk deactivation instead of deletion');}/**
   * Perform security checks
   */
  private async performSecurityChecks(
    operation: string,
    data: Partial<UserEntity>,
    result: BusinessValidationResult,
    context?: UserOperationContext,
  ): Promise<void> {
    // Check for suspicious patterns
    if (data.email && this.isSuspiciousEmail(data.email)) {
      result.warnings.push('Email pattern appears suspicious - may require additional verification');}// Rate limiting check (simplified)
    if (operation === 'create' && await this.isRateLimited(context?.userId)) {result.valid = false;result.errors.push('Rate limit exceeded for user creation operations');}// Audit logging for security-sensitive operations
    if (['delete', 'bulkDelete'].includes(operation)) {
      this.logger.warn(`Security-sensitive user operation: ${operation}`, {
        operation,
        requestedBy: context?.userId,
        userRole: context?.userRole,
        targetData: this.sanitizeUserData(data),
      });
    }
  }

  // ===== UTILITY METHODS =====

  /**
   * Check if email pattern is suspicious
   */
  private isSuspiciousEmail(email: string): boolean {
    const suspiciousPatterns = [
      /^\d+@/, // Starts with numbers
      /@\d+\./,  // Domain starts with numbers
      /\+.*\+/, // Multiple plus signs
      /\.{2,}/, // Multiple consecutive dots
    ];

    return suspiciousPatterns.some(pattern => pattern.test(email));
  }

  /**
   * Check if user is rate limited (simplified implementation)
   */
  private async isRateLimited(_userId?: string): Promise<boolean> {
    // In a real implementation, this would check against a rate limiting service
    // For now, we'll just return falsereturn false;}

  /**
   * Sanitize user data for logging
   */
  private sanitizeUserData(data: Partial<UserEntity>): Partial<UserEntity> {
    if (!data) return data;

    const sanitized = { ...data };
    this.sensitiveFields.forEach(field => {
      if (field in sanitized) {
        (sanitized as Record<string, unknown>)[field] = '[REDACTED]';}});

    return sanitized;
  }

  /**
   * Sanitize context for logging
   */
  private sanitizeContext(context?: UserOperationContext): Partial<UserOperationContext> | undefined {
    if (!context) return context;

    return {
      userId: context.userId,
      userRole: context.userRole,
      businessPurpose: context.businessPurpose,
      sessionId: context.sessionId,
      correlationId: context.correlationId,
      // Omit sensitive flags and metadata
    };
  }

  // ===== PUBLIC USER-SPECIFIC METHODS =====

  /**
   * Find user by email with conversational validation
   */
  async findByEmail(
    email: string,
    context?: UserOperationContext,
  ): Promise<UserEntity | null> {
    this.logger.debug('Finding user by email', { email, context: this.sanitizeContext(context) });try {const users = await this.findAll(
        {
          filter: { email } as Partial<UserEntity>,
          limit: 1,
        } as QueryOptions,
        context,
      );

      return users.length > 0 ? users[0] : null;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to find user by email: ${errorMessage}`, { email, error: errorMessage });
      throw error;
    }
  }

  /**
   * Find users by role with conversational validation
   */
  async findByRole(
    role: string,
    context?: UserOperationContext,
  ): Promise<readonly UserEntity[]> {
    this.logger.debug('Finding users by role', { role, context: this.sanitizeContext(context) });try {return this.findAll(
        {
          filter: { role } as Partial<UserEntity>,
        } as QueryOptions,
        context,
      );

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to find users by role: ${errorMessage}`, { role, error: errorMessage });
      throw error;
    }
  }

  /**
   * Find active users with conversational validation
   */
  async findActiveUsers(context?: UserOperationContext): Promise<readonly UserEntity[]> {
    this.logger.debug('Finding active users', { context: this.sanitizeContext(context) });try {return this.findAll(
        {
          filter: { isActive: true } as Partial<UserEntity>,
        } as QueryOptions,
        context,
      );

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to find active users: ${errorMessage}`, { error: errorMessage });
      throw error;
    }
  }

  /**
   * Deactivate user (alternative to deletion)
   */
  async deactivateUser(
    id: string,
    context?: UserOperationContext,
  ): Promise<UserEntity | null> {
    this.logger.debug('Deactivating user', { id, context: this.sanitizeContext(context) });return this.update(id,
      { isActive: false } as Partial<UserEntity>,
      {
        ...context,
        businessPurpose: context?.businessPurpose ?? 'Deactivate user account',},);
  }

  /**
   * Reactivate user
   */
  async reactivateUser(
    id: string,
    context?: UserOperationContext,
  ): Promise<UserEntity | null> {
    this.logger.debug('Reactivating user', { id, context: this.sanitizeContext(context) });return this.update(id,
      { isActive: true } as Partial<UserEntity>,
      {
        ...context,
        businessPurpose: context?.businessPurpose ?? 'Reactivate user account',
      },
    );
  }
}