/**
 * Conversational Database Integration Examples
 *
 * Comprehensive examples demonstrating how to integrate and use the
 * ConversationalDatabaseService in real-world scenarios. This file provides
 * practical implementation patterns, best practices, and usage examples.
 *
 * Features Demonstrated:
 * - Basic CRUD operations with conversational validation
 * - Risk-based approval workflows
 * - Business logic validation
 * - Backup and recovery operations
 * - Multi-party approval for critical operations
 * - Performance optimization with caching
 * - Error handling and failsafe mechanisms
 *
 * @author Claude Code - Database Integration Examples
 * @version 1.0.0
 */

import { Injectable, Logger, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ConversationalDatabaseService } from '../conversational-database.service';
import { UserConversationalRepositoryService } from '../repositories/user-conversational-repository.service';
// Removed unused import: BaseConversationalRepositoryService
import { UserEntity } from '../../test-utils/database-types';
import { Repository } from '../../types/index';
import { ParlantModule } from '../../parlant/parlant.module';

// ===== EXAMPLE SERVICE IMPLEMENTATIONS =====

/**
 * Example User Management Service with Conversational Database Integration
 */
@Injectable()
export class ExampleUserManagementService {
  private readonly logger = new Logger(ExampleUserManagementService.name);

  constructor(
    private readonly userRepository: UserConversationalRepositoryService,
    private readonly conversationalDbService: ConversationalDatabaseService,
  ) {}

  /**
   * Example: Create a new user with comprehensive validation
   */
  async createUser(userData: {
    email: string;
    password: string;
    role: string;
    name?: string;
  }, operationContext: {
    userId: string;
    userRole: string;
    businessJustification: string;
  }): Promise<UserEntity> {
    this.logger.log('Creating new user with conversational validation', {
      email: userData.email,
      role: userData.role,
      requestedBy: operationContext.userId,
    });

    try {
      // Create user with comprehensive business validation
      const newUser = await this.userRepository.create(
        {
          email: userData.email,
          passwordHash: await this.hashPassword(userData.password),
          role: userData.role,
          isActive: true,
          ...(userData.name && { name: userData.name }),
        } as Omit<UserEntity, 'id' | 'createdAt' | 'updatedAt'>,
        {
          userId: operationContext.userId,
          userRole: operationContext.userRole,
          businessPurpose: operationContext.businessJustification,
          requireEmailValidation: true,
          requirePasswordValidation: true,
          requireRoleValidation: true,
        }
      );

      this.logger.log('User created successfully with conversational validation', {
        userId: newUser.id,
        email: newUser.email,
        role: newUser.role,
      });

      return newUser;

    } catch (error) {
      this.logger.error('Failed to create user', {
        email: userData.email,
        error: error instanceof Error ? error.message : 'Unknown error',
        requestedBy: operationContext.userId,
      });
      throw error;
    }
  }

  /**
   * Example: Update user with risk-based validation
   */
  async updateUser(
    userId: string,
    updates: Partial<UserEntity>,
    operationContext: {
      userId: string;
      userRole: string;
      businessJustification?: string;
    }
  ): Promise<UserEntity | null> {
    this.logger.log('Updating user with conversational validation', {
      targetUserId: userId,
      updateFields: Object.keys(updates),
      requestedBy: operationContext.userId,
    });

    try {
      // Check if updating sensitive fields (higher risk)
      const isSensitiveUpdate = ['role', 'isActive', 'passwordHash'].some(
        field => field in updates
      );

      const updatedUser = await this.userRepository.update(
        userId,
        updates,
        {
          userId: operationContext.userId,
          userRole: operationContext.userRole,
          businessPurpose: operationContext.businessJustification ??
            `Update user profile ${isSensitiveUpdate ? '(sensitive fields)' : ''}`,
          requireRoleValidation: 'role' in updates,
        }
      );

      if (updatedUser) {
        this.logger.log('User updated successfully', {
          userId: updatedUser.id,
          changes: Object.keys(updates),
          requestedBy: operationContext.userId,
        });
      } else {
        this.logger.warn('User not found for update', { userId });
      }

      return updatedUser;

    } catch (error) {
      this.logger.error('Failed to update user', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        requestedBy: operationContext.userId,
      });
      throw error;
    }
  }

  /**
   * Example: Delete user with multi-party approval
   */
  async deleteUser(
    userId: string,
    operationContext: {
      userId: string;
      userRole: string;
      businessJustification: string;
      confirmDeletion: boolean;
    }
  ): Promise<boolean> {
    this.logger.warn('Attempting to delete user with multi-party approval', {
      targetUserId: userId,
      requestedBy: operationContext.userId,
      confirmed: operationContext.confirmDeletion,
    });

    try {
      // Get user details for audit trail
      const userToDelete = await this.userRepository.findById(userId, {
        userId: operationContext.userId,
        userRole: operationContext.userRole,
        businessPurpose: 'Pre-deletion verification',
      });

      if (!userToDelete) {
        throw new Error(`User ${userId} not found`);
      }

      this.logger.warn('Proceeding with user deletion', {
        targetUser: {
          id: userToDelete.id,
          email: userToDelete.email,
          role: userToDelete.role,
          isActive: userToDelete.isActive,
        },
        requestedBy: operationContext.userId,
      });

      const deleted = await this.userRepository.delete(
        userId,
        {
          userId: operationContext.userId,
          userRole: operationContext.userRole,
          businessPurpose: operationContext.businessJustification,
          confirmDeletion: operationContext.confirmDeletion,
        }
      );

      if (deleted) {
        this.logger.warn('User deleted successfully', {
          deletedUserId: userId,
          deletedEmail: userToDelete.email,
          requestedBy: operationContext.userId,
        });
      }

      return deleted;

    } catch (error) {
      this.logger.error('Failed to delete user', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        requestedBy: operationContext.userId,
      });
      throw error;
    }
  }

  /**
   * Example: Bulk operations with enhanced validation
   */
  async bulkCreateUsers(
    usersData: Array<{
      email: string;
      password: string;
      role: string;
      name?: string;
    }>,
    operationContext: {
      userId: string;
      userRole: string;
      businessJustification: string;
    }
  ): Promise<UserEntity[]> {
    this.logger.log('Bulk creating users with conversational validation', {
      userCount: usersData.length,
      requestedBy: operationContext.userId,
    });

    try {
      // Convert to repository format
      const repoData = await Promise.all(
        usersData.map(async (userData) => ({
          email: userData.email,
          passwordHash: await this.hashPassword(userData.password),
          role: userData.role,
          isActive: true,
          ...(userData.name && { name: userData.name }),
        }))
      );

      const createdUsers = await this.userRepository.bulkCreate(
        repoData as Array<Omit<UserEntity, 'id' | 'createdAt' | 'updatedAt'>>,
        {
          userId: operationContext.userId,
          userRole: operationContext.userRole,
          businessPurpose: operationContext.businessJustification,
          requireEmailValidation: true,
          requireRoleValidation: true,
        }
      );

      this.logger.log('Bulk user creation completed', {
        requestedCount: usersData.length,
        createdCount: createdUsers.length,
        requestedBy: operationContext.userId,
      });

      return createdUsers;

    } catch (error) {
      this.logger.error('Failed to bulk create users', {
        userCount: usersData.length,
        error: error instanceof Error ? error.message : 'Unknown error',
        requestedBy: operationContext.userId,
      });
      throw error;
    }
  }

  /**
   * Example: Safe user deactivation (alternative to deletion)
   */
  async deactivateInactiveUsers(
    inactiveDays: number,
    operationContext: {
      userId: string;
      userRole: string;
      businessJustification: string;
      dryRun?: boolean;
    }
  ): Promise<{ affected: number; users: UserEntity[] }> {
    this.logger.log('Deactivating inactive users', {
      inactiveDays,
      dryRun: operationContext.dryRun,
      requestedBy: operationContext.userId,
    });

    try {
      // Find inactive users (this would be a more complex query in real implementation)
      const allUsers = await this.userRepository.findActiveUsers({
        userId: operationContext.userId,
        userRole: operationContext.userRole,
        businessPurpose: 'Find users for deactivation analysis',
      });

      // For demonstration, we'll simulate finding inactive users
      const inactiveUsers = allUsers.filter(user =>
        user.lastLoginAt &&
        new Date(user.lastLoginAt).getTime() < Date.now() - (inactiveDays * 24 * 60 * 60 * 1000)
      );

      if (operationContext.dryRun) {
        this.logger.log('Dry run: Would deactivate users', {
          userCount: inactiveUsers.length,
          users: inactiveUsers.map(u => ({ id: u.id, email: u.email, lastLogin: u.lastLoginAt })),
        });

        return { affected: inactiveUsers.length, users: inactiveUsers };
      }

      // Deactivate users one by one with individual validation
      const deactivatedUsers: UserEntity[] = [];

      for (const user of inactiveUsers) {
        try {
          const deactivated = await this.userRepository.deactivateUser(
            user.id,
            {
              userId: operationContext.userId,
              userRole: operationContext.userRole,
              businessPurpose: `${operationContext.businessJustification} - User inactive for ${inactiveDays} days`,
            }
          );

          if (deactivated) {
            deactivatedUsers.push(deactivated);
          }
        } catch (error) {
          this.logger.error('Failed to deactivate individual user', {
            userId: user.id,
            email: user.email,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          // Continue with other users
        }
      }

      this.logger.log('User deactivation completed', {
        targetCount: inactiveUsers.length,
        deactivatedCount: deactivatedUsers.length,
        requestedBy: operationContext.userId,
      });

      return { affected: deactivatedUsers.length, users: deactivatedUsers };

    } catch (error) {
      this.logger.error('Failed to deactivate inactive users', {
        inactiveDays,
        error: error instanceof Error ? error.message : 'Unknown error',
        requestedBy: operationContext.userId,
      });
      throw error;
    }
  }

  /**
   * Example: Complex user search with conversational validation
   */
  async searchUsers(
    criteria: {
      email?: string;
      role?: string;
      isActive?: boolean;
      namePattern?: string;
    },
    operationContext: {
      userId: string;
      userRole: string;
      businessJustification?: string;
    }
  ): Promise<UserEntity[]> {
    this.logger.log('Searching users with conversational validation', {
      criteria,
      requestedBy: operationContext.userId,
    });

    try {
      let users: readonly UserEntity[] = [];

      // Different search strategies based on criteria
      if (criteria.email) {
        const user = await this.userRepository.findByEmail(
          criteria.email,
          {
            userId: operationContext.userId,
            userRole: operationContext.userRole,
            businessPurpose: operationContext.businessJustification ?? 'Search user by email',
          }
        );
        users = user ? [user] : [];
      } else if (criteria.role) {
        users = await this.userRepository.findByRole(
          criteria.role,
          {
            userId: operationContext.userId,
            userRole: operationContext.userRole,
            businessPurpose: operationContext.businessJustification ?? `Search users by role: ${criteria.role}`,
          }
        );
      } else if (criteria.isActive !== undefined) {
        if (criteria.isActive) {
          users = await this.userRepository.findActiveUsers({
            userId: operationContext.userId,
            userRole: operationContext.userRole,
            businessPurpose: operationContext.businessJustification ?? 'Search active users',
          });
        } else {
          // Find all users and filter inactive (in real implementation, this would be a proper query)
          const allUsers = await this.userRepository.findAll(
            undefined,
            {
              userId: operationContext.userId,
              userRole: operationContext.userRole,
              businessPurpose: operationContext.businessJustification ?? 'Search inactive users',
            }
          );
          users = allUsers.filter(user => !user.isActive);
        }
      } else {
        // General search
        users = await this.userRepository.findAll(
          undefined,
          {
            userId: operationContext.userId,
            userRole: operationContext.userRole,
            businessPurpose: operationContext.businessJustification ?? 'General user search',
          }
        );
      }

      // Apply name pattern filtering if specified
      let filteredUsers = Array.from(users);
      if (criteria.namePattern?.trim()) {
        const pattern = criteria.namePattern.toLowerCase();
        filteredUsers = filteredUsers.filter(user =>
          user.email.toLowerCase().includes(pattern) ||
          (user as UserEntity & { name?: string }).name?.toLowerCase().includes(pattern)
        );
      }

      this.logger.log('User search completed', {
        criteria,
        totalFound: filteredUsers.length,
        requestedBy: operationContext.userId,
      });

      return filteredUsers;

    } catch (error) {
      this.logger.error('Failed to search users', {
        criteria,
        error: error instanceof Error ? error.message : 'Unknown error',
        requestedBy: operationContext.userId,
      });
      throw error;
    }
  }

  /**
   * Example: Get repository metrics and health information
   */
  async getRepositoryHealth(): Promise<{
    metrics: ReturnType<ConversationalDatabaseService['getMetrics']>;
    cacheStatus: ReturnType<ConversationalDatabaseService['getCacheStatus']>;
    backupStatus: ReturnType<ConversationalDatabaseService['getBackupStatus']>;
  }> {
    this.logger.log('Getting repository health information');

    try {
      const metrics = this.conversationalDbService.getMetrics();
      const cacheStatus = this.conversationalDbService.getCacheStatus();
      const backupStatus = this.conversationalDbService.getBackupStatus();

      this.logger.log('Repository health retrieved', {
        totalOperations: metrics.totalOperations,
        approvalRate: (metrics.approvedOperations / (metrics.totalOperations ?? 1)) * 100,
        cacheHitRate: cacheStatus.hitRate,
        totalBackups: backupStatus.totalBackups,
      });

      return { metrics, cacheStatus, backupStatus };

    } catch (error) {
      this.logger.error('Failed to get repository health', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Helper method to hash passwords (mock implementation)
   */
  private async hashPassword(password: string): Promise<string> {
    // In a real implementation, this would use bcrypt or similar
    return `hashed_${password}_${Date.now()}`;
  }
}

// ===== USAGE EXAMPLES =====

/**
 * Example usage patterns for the conversational database service
 */
export class ConversationalDatabaseUsageExamples {
  private readonly logger = new Logger(ConversationalDatabaseUsageExamples.name);

  constructor(
    private readonly userManagementService: ExampleUserManagementService,
  ) {}

  /**
   * Example: Administrative user creation workflow
   */
  async exampleAdminUserCreation(): Promise<void> {
    this.logger.log('=== Example: Admin User Creation Workflow ===');

    try {
      const newUser = await this.userManagementService.createUser(
        {
          email: 'admin@example.com',
          password: 'SecurePassword123!',
          role: 'admin',
          name: 'System Administrator',
        },
        {
          userId: 'system',
          userRole: 'system',
          businessJustification: 'Creating initial system administrator account for platform setup',
        }
      );

      this.logger.log('Admin user created successfully', {
        userId: newUser.id,
        email: newUser.email,
        role: newUser.role,
      });

    } catch (error) {
      this.logger.error('Admin user creation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Example: Bulk user import workflow
   */
  async exampleBulkUserImport(): Promise<void> {
    this.logger.log('=== Example: Bulk User Import Workflow ===');

    try {
      const usersToImport = [
        { email: 'user1@example.com', password: 'Password1!', role: 'user', name: 'User One' },
        { email: 'user2@example.com', password: 'Password2!', role: 'user', name: 'User Two' },
        { email: 'moderator@example.com', password: 'ModPass123!', role: 'moderator', name: 'Moderator User' },
      ];

      const createdUsers = await this.userManagementService.bulkCreateUsers(
        usersToImport,
        {
          userId: 'admin_123',
          userRole: 'admin',
          businessJustification: 'Bulk import of initial user accounts for team onboarding',
        }
      );

      this.logger.log('Bulk user import completed', {
        requestedCount: usersToImport.length,
        createdCount: createdUsers.length,
        users: createdUsers.map(u => ({ id: u.id, email: u.email, role: u.role })),
      });

    } catch (error) {
      this.logger.error('Bulk user import failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Example: User role change workflow (sensitive operation)
   */
  async exampleUserRoleChange(): Promise<void> {
    this.logger.log('=== Example: User Role Change Workflow ===');

    try {
      // First, find the user
      const users = await this.userManagementService.searchUsers(
        { email: 'user1@example.com' },
        {
          userId: 'admin_123',
          userRole: 'admin',
          businessJustification: 'Find user for role elevation',
        }
      );

      if (users.length === 0) {
        this.logger.warn('User not found for role change');
        return;
      }

      const user = users[0];

      // Update user role (sensitive operation requiring high-level approval)
      const updatedUser = await this.userManagementService.updateUser(
        user.id,
        { role: 'moderator' },
        {
          userId: 'admin_123',
          userRole: 'admin',
          businessJustification: 'Promote user to moderator role based on performance review and team needs',
        }
      );

      if (updatedUser) {
        this.logger.log('User role changed successfully', {
          userId: updatedUser.id,
          email: updatedUser.email,
          oldRole: user.role,
          newRole: updatedUser.role,
        });
      }

    } catch (error) {
      this.logger.error('User role change failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Example: User deactivation workflow (alternative to deletion)
   */
  async exampleUserDeactivation(): Promise<void> {
    this.logger.log('=== Example: User Deactivation Workflow ===');

    try {
      // Perform dry run first
      const dryRunResult = await this.userManagementService.deactivateInactiveUsers(
        90, // 90 days of inactivity
        {
          userId: 'admin_123',
          userRole: 'admin',
          businessJustification: 'Quarterly cleanup of inactive user accounts for security compliance',
          dryRun: true,
        }
      );

      this.logger.log('Dry run completed - users that would be deactivated', {
        affectedCount: dryRunResult.affected,
        users: dryRunResult.users.map(u => ({ id: u.id, email: u.email, lastLogin: u.lastLoginAt })),
      });

      // If dry run shows reasonable results, proceed with actual deactivation
      if (dryRunResult.affected > 0 && dryRunResult.affected < 100) { // Safety check
        const actualResult = await this.userManagementService.deactivateInactiveUsers(
          90,
          {
            userId: 'admin_123',
            userRole: 'admin',
            businessJustification: 'Quarterly cleanup of inactive user accounts for security compliance',
            dryRun: false,
          }
        );

        this.logger.log('User deactivation completed', {
          deactivatedCount: actualResult.affected,
          users: actualResult.users.map(u => ({ id: u.id, email: u.email })),
        });
      } else {
        this.logger.warn('Dry run results require manual review', {
          affectedCount: dryRunResult.affected,
        });
      }

    } catch (error) {
      this.logger.error('User deactivation workflow failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Example: Critical user deletion workflow (requires multi-party approval)
   */
  async exampleCriticalUserDeletion(): Promise<void> {
    this.logger.log('=== Example: Critical User Deletion Workflow ===');

    try {
      // Find user to delete
      const users = await this.userManagementService.searchUsers(
        { email: 'test_user_to_delete@example.com' },
        {
          userId: 'admin_123',
          userRole: 'admin',
          businessJustification: 'Find user account for deletion due to policy violation',
        }
      );

      if (users.length === 0) {
        this.logger.warn('User not found for deletion');
        return;
      }

      const userToDelete = users[0];

      // Attempt deletion (this will require conversational approval and multi-party consent)
      const deleted = await this.userManagementService.deleteUser(
        userToDelete.id,
        {
          userId: 'admin_123',
          userRole: 'admin',
          businessJustification: 'Delete user account due to confirmed policy violation and security breach. Legal review completed.',
          confirmDeletion: true,
        }
      );

      if (deleted) {
        this.logger.warn('User account deleted successfully', {
          deletedUserId: userToDelete.id,
          deletedEmail: userToDelete.email,
        });
      } else {
        this.logger.warn('User deletion was not completed (may require additional approvals)');
      }

    } catch (error) {
      this.logger.error('Critical user deletion failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Example: Repository health monitoring
   */
  async exampleRepositoryHealthMonitoring(): Promise<void> {
    this.logger.log('=== Example: Repository Health Monitoring ===');

    try {
      const health = await this.userManagementService.getRepositoryHealth();

      this.logger.log('Repository Health Report', {
        totalOperations: health.metrics.totalOperations,
        approvedOperations: health.metrics.approvedOperations,
        rejectedOperations: health.metrics.rejectedOperations,
        approvalRate: health.metrics.totalOperations > 0
          ? (health.metrics.approvedOperations / health.metrics.totalOperations) * 100
          : 0,
        averageValidationTime: health.metrics.averageValidationTime,
        cacheSize: health.cacheStatus.size,
        cacheHitRate: health.cacheStatus.hitRate,
        totalBackups: health.backupStatus.totalBackups,
      });

      // Alert if metrics indicate issues
      if (health.metrics.rejectedOperations > health.metrics.approvedOperations) {
        this.logger.warn('High rejection rate detected - may indicate permission or validation issues');
      }

      if (health.metrics.averageValidationTime > 5000) { // 5 seconds
        this.logger.warn('High validation time detected - may indicate performance issues');
      }

      if (health.cacheStatus.hitRate < 50) {
        this.logger.warn('Low cache hit rate - may indicate inefficient query patterns');
      }

    } catch (error) {
      this.logger.error('Repository health monitoring failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Run all examples in sequence
   */
  async runAllExamples(): Promise<void> {
    this.logger.log('=== Running All Conversational Database Examples ===');

    try {
      await this.exampleAdminUserCreation();
      await this.exampleBulkUserImport();
      await this.exampleUserRoleChange();
      await this.exampleUserDeactivation();
      await this.exampleCriticalUserDeletion();
      await this.exampleRepositoryHealthMonitoring();

      this.logger.log('=== All Examples Completed Successfully ===');

    } catch (error) {
      this.logger.error('Examples execution failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

// ===== EXAMPLE MODULE =====

/**
 * Example module demonstrating how to integrate conversational database services
 */
@Module({
  imports: [
    ConfigModule,
    ParlantModule,
  ],
  providers: [
    ConversationalDatabaseService,
    // In a real implementation, you would inject actual repository implementations
    {
      provide: UserConversationalRepositoryService,
      useFactory: (conversationalDbService: ConversationalDatabaseService) => {
        // Mock repository for example purposes
        const mockRepository = {
          findById: async () => null,
          findAll: async () => [],
          create: async (data: Partial<UserEntity>) => ({ id: 'mock-id', ...data } as UserEntity),
          update: async () => null,
          delete: async () => false,
          count: async () => 0,
        };
        return new UserConversationalRepositoryService(conversationalDbService, mockRepository as unknown as Repository<UserEntity>);
      },
      inject: [ConversationalDatabaseService],
    },
    ExampleUserManagementService,
    ConversationalDatabaseUsageExamples,
  ],
  exports: [
    ConversationalDatabaseService,
    ExampleUserManagementService,
    ConversationalDatabaseUsageExamples,
  ],
})
export class ConversationalDatabaseExampleModule {}

// Note: Classes already exported above with export keyword