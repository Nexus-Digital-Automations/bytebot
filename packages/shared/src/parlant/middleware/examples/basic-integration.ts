/**
 * Basic Integration Examples for Enhanced PARLANT Middleware
 * Comprehensive Examples for Getting Started with Enterprise-Grade Validation
 *
 * This file provides practical, ready-to-use examples for integrating the
 * enhanced PARLANT middleware into your Bytebot services. These examples
 * demonstrate basic to intermediate usage patterns.
 *
 * Examples Included:
 * - Basic controller setup with enhanced validation
 * - Simple decorator usage patterns
 * - Basic performance monitoring
 * - Error handling implementation
 * - Cache configuration examples
 * - Security configuration basics
 *
 * @author Claude Code - PARLANT Integration Examples Team
 * @version 2.0.0 - Basic Integration Examples
 * @since 2024-09-22
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpStatus,
  Injectable,
  Module,
  NestModule,
  MiddlewareConsumer,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsArray } from 'class-validator';

// Import enhanced PARLANT middleware components
import {
  EnhancedParlantValidated,
  TypeSafeValidation,
  PerformanceMonitored,
  IntelligentCache,
  ContextAwareAuth,
  ParlantContext,
  EnhancedUser,
} from '../decorators/enhanced-parlant-decorators';

import {
  EnhancedUniversalParlantMiddleware,
  ParlantRequestContext,
} from '../core/universal-parlant-middleware';

import {
  SecurityLevel,
  ValidationMode,
  ApprovalLevel,
  EnhancedParlantRequest,
  UserContext,
} from '../types/enhanced-parlant-types';

// ===== BASIC DTOs =====

export class CreateTaskDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsNumber()
  @IsOptional()
  priority?: number;

  @IsArray()
  @IsOptional()
  tags?: string[];
}

export class UpdateTaskDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';

  @IsNumber()
  @IsOptional()
  priority?: number;
}

export class TaskQueryDto {
  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsNumber()
  @IsOptional()
  page?: number = 1;

  @IsNumber()
  @IsOptional()
  limit?: number = 10;

  @IsString()
  @IsOptional()
  sortBy?: string = 'createdAt';

  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  category?: string;
  priority: number;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  assignedTo?: string;
}

// ===== BASIC SERVICE =====

@Injectable()
export class TasksService {
  private readonly tasks: Task[] = [];

  async create(createTaskDto: CreateTaskDto): Promise<Task> {
    const task: Task = {
      id: `task-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      title: createTaskDto.title,
      description: createTaskDto.description,
      status: 'pending',
      category: createTaskDto.category,
      priority: createTaskDto.priority || 1,
      tags: createTaskDto.tags || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.tasks.push(task);
    return task;
  }

  async findAll(query: TaskQueryDto): Promise<{ tasks: Task[]; total: number; page: number; totalPages: number }> {
    let filteredTasks = [...this.tasks];

    // Apply filters
    if (query.status) {
      filteredTasks = filteredTasks.filter(task => task.status === query.status);
    }

    if (query.category) {
      filteredTasks = filteredTasks.filter(task => task.category === query.category);
    }

    // Apply sorting
    filteredTasks.sort((a, b) => {
      const aValue = a[query.sortBy as keyof Task];
      const bValue = b[query.sortBy as keyof Task];

      if (query.sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    // Apply pagination
    const total = filteredTasks.length;
    const totalPages = Math.ceil(total / query.limit!);
    const startIndex = (query.page! - 1) * query.limit!;
    const endIndex = startIndex + query.limit!;
    const tasks = filteredTasks.slice(startIndex, endIndex);

    return {
      tasks,
      total,
      page: query.page!,
      totalPages,
    };
  }

  async findById(id: string): Promise<Task | null> {
    return this.tasks.find(task => task.id === id) || null;
  }

  async update(id: string, updateTaskDto: UpdateTaskDto): Promise<Task | null> {
    const taskIndex = this.tasks.findIndex(task => task.id === id);
    if (taskIndex === -1) {
      return null;
    }

    const updatedTask = {
      ...this.tasks[taskIndex],
      ...updateTaskDto,
      updatedAt: new Date(),
    };

    this.tasks[taskIndex] = updatedTask;
    return updatedTask;
  }

  async delete(id: string): Promise<boolean> {
    const taskIndex = this.tasks.findIndex(task => task.id === id);
    if (taskIndex === -1) {
      return false;
    }

    this.tasks.splice(taskIndex, 1);
    return true;
  }
}

// ===== BASIC CONTROLLER WITH ENHANCED PARLANT VALIDATION =====

@ApiTags('Tasks')
@Controller('api/tasks')
export class BasicTasksController {
  constructor(private readonly tasksService: TasksService) {}

  /**
   * Create a new task with basic PARLANT validation
   */
  @Post()
  @ApiOperation({ summary: 'Create a new task' })
  @ApiResponse({ status: 201, description: 'Task created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 403, description: 'Access denied by PARLANT validation' })
  @EnhancedParlantValidated({
    intent: 'Create a new task for project management',
    description: 'Standard endpoint for creating tasks with basic validation and monitoring',
    securityLevel: SecurityLevel._MEDIUM,
    enableMetrics: true,
    enableAuditTrail: true,
    performanceTarget: 500, // 500ms target
    cachingStrategy: {
      enabled: false, // Don't cache creation operations
      ttl: 0,
      scope: 'user',
    },
    parameterValidation: {
      validateTypes: true,
      sanitizeInputs: true,
      maxSize: 5000, // 5KB max payload
      maxDepth: 3,
    },
  })
  @TypeSafeValidation({
    validateTypes: true,
    sanitizeInputs: true,
  })
  @PerformanceMonitored(500) // Monitor for 500ms target
  async createTask(
    @Body() createTaskDto: CreateTaskDto,
    @ParlantContext() parlantContext?: ParlantRequestContext,
    @EnhancedUser() user?: UserContext
  ): Promise<Task> {
    // Log the operation with PARLANT context
    console.log('Task creation initiated', {
      operationId: parlantContext?.operationId,
      userId: user?.id,
      securityLevel: parlantContext?.securityLevel,
      validationTime: parlantContext?.processingTime,
    });

    const task = await this.tasksService.create(createTaskDto);

    // Log successful creation
    console.log('Task created successfully', {
      taskId: task.id,
      operationId: parlantContext?.operationId,
      processingTime: parlantContext?.processingTime,
    });

    return task;
  }

  /**
   * Get tasks with intelligent caching
   */
  @Get()
  @ApiOperation({ summary: 'Get tasks with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Tasks retrieved successfully' })
  @EnhancedParlantValidated({
    intent: 'Retrieve task list with filtering and pagination',
    description: 'High-performance endpoint for task retrieval with intelligent caching',
    securityLevel: SecurityLevel._LOW, // Read operations are lower risk
    enableMetrics: true,
    performanceTarget: 300, // 300ms target for read operations
    cachingStrategy: {
      enabled: true,
      ttl: 300000, // 5 minutes cache
      scope: 'user',
      keyGenerator: (context, args) => {
        const query = args[0] as TaskQueryDto;
        return `tasks:list:${JSON.stringify(query)}`;
      },
    },
  })
  @IntelligentCache({
    enabled: true,
    ttl: 300000, // 5 minutes
    scope: 'user',
    compressionEnabled: true,
  })
  @PerformanceMonitored(300)
  async getTasks(
    @Query() query: TaskQueryDto,
    @ParlantContext() parlantContext?: ParlantRequestContext
  ): Promise<{ tasks: Task[]; total: number; page: number; totalPages: number }> {
    console.log('Task list retrieval', {
      operationId: parlantContext?.operationId,
      cacheHit: parlantContext?.cacheHit,
      query,
    });

    return await this.tasksService.findAll(query);
  }

  /**
   * Get a specific task by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a specific task by ID' })
  @ApiResponse({ status: 200, description: 'Task retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @EnhancedParlantValidated({
    intent: 'Retrieve specific task details by unique identifier',
    description: 'Endpoint for fetching individual task information',
    securityLevel: SecurityLevel._LOW,
    cachingStrategy: {
      enabled: true,
      ttl: 600000, // 10 minutes cache for individual tasks
      scope: 'global', // Tasks can be cached globally
    },
  })
  @IntelligentCache({
    enabled: true,
    ttl: 600000,
    scope: 'global',
  })
  async getTaskById(@Param('id') id: string): Promise<Task> {
    const task = await this.tasksService.findById(id);
    if (!task) {
      throw new Error('Task not found');
    }
    return task;
  }

  /**
   * Update a task with medium security validation
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update an existing task' })
  @ApiResponse({ status: 200, description: 'Task updated successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiResponse({ status: 403, description: 'Access denied by PARLANT validation' })
  @EnhancedParlantValidated({
    intent: 'Update existing task with new information',
    description: 'Endpoint for modifying task properties and status',
    securityLevel: SecurityLevel._MEDIUM,
    enableMetrics: true,
    enableAuditTrail: true,
    parameterValidation: {
      validateTypes: true,
      sanitizeInputs: true,
      maxSize: 3000,
    },
    contextRequirements: {
      requireAuthentication: true,
      requiredPermissions: ['TASK_UPDATE'],
    },
  })
  @TypeSafeValidation()
  @PerformanceMonitored(400)
  async updateTask(
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @ParlantContext() parlantContext?: ParlantRequestContext,
    @EnhancedUser() user?: UserContext
  ): Promise<Task> {
    console.log('Task update initiated', {
      taskId: id,
      operationId: parlantContext?.operationId,
      userId: user?.id,
      updateData: Object.keys(updateTaskDto),
    });

    const task = await this.tasksService.update(id, updateTaskDto);
    if (!task) {
      throw new Error('Task not found');
    }

    console.log('Task updated successfully', {
      taskId: id,
      operationId: parlantContext?.operationId,
    });

    return task;
  }

  /**
   * Delete a task with high security validation
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a task' })
  @ApiResponse({ status: 200, description: 'Task deleted successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiResponse({ status: 403, description: 'Access denied - insufficient permissions' })
  @EnhancedParlantValidated({
    intent: 'Permanently delete a task from the system',
    description: 'High-security endpoint for task deletion with comprehensive validation',
    securityLevel: SecurityLevel._HIGH, // Deletion is high-risk
    validationMode: ValidationMode._INTERACTIVE, // Require interactive validation
    approvalLevel: ApprovalLevel._SINGLE_APPROVAL,
    enableMetrics: true,
    enableAuditTrail: true,
    businessCategory: 'DATA_DELETION',
    complianceFlags: ['GDPR_APPLICABLE'],
    contextRequirements: {
      requireAuthentication: true,
      requiredRoles: ['ADMIN', 'TASK_MANAGER'],
      requiredPermissions: ['TASK_DELETE'],
      minimumSecurityClearance: SecurityLevel._MEDIUM,
    },
    customErrorHandling: {
      escalationRules: [
        {
          condition: (error) => error.message.includes('not found'),
          escalationLevel: 'LOW',
          notificationTargets: [],
          requiresHumanIntervention: false,
        },
        {
          condition: (error) => error.message.includes('permission'),
          escalationLevel: 'MEDIUM',
          notificationTargets: ['security@company.com'],
          requiresHumanIntervention: true,
        },
      ],
    },
  })
  @ContextAwareAuth({
    requireAuthentication: true,
    requiredRoles: ['ADMIN', 'TASK_MANAGER'],
    requiredPermissions: ['TASK_DELETE'],
    minimumSecurityClearance: SecurityLevel._MEDIUM,
  })
  @PerformanceMonitored(600)
  async deleteTask(
    @Param('id') id: string,
    @ParlantContext() parlantContext?: ParlantRequestContext,
    @EnhancedUser() user?: UserContext
  ): Promise<{ success: boolean; message: string }> {
    console.log('Task deletion initiated', {
      taskId: id,
      operationId: parlantContext?.operationId,
      userId: user?.id,
      userRoles: user?.roles,
      securityLevel: parlantContext?.securityLevel,
    });

    const success = await this.tasksService.delete(id);
    if (!success) {
      throw new Error('Task not found');
    }

    console.log('Task deleted successfully', {
      taskId: id,
      operationId: parlantContext?.operationId,
      userId: user?.id,
    });

    return {
      success: true,
      message: 'Task deleted successfully',
    };
  }
}

// ===== READ-ONLY CONTROLLER EXAMPLE =====

@ApiTags('Task Reports')
@Controller('api/reports/tasks')
export class TaskReportsController {
  constructor(private readonly tasksService: TasksService) {}

  /**
   * Get task statistics with heavy caching
   */
  @Get('statistics')
  @ApiOperation({ summary: 'Get task statistics and metrics' })
  @EnhancedParlantValidated({
    intent: 'Retrieve comprehensive task statistics and analytics',
    description: 'Read-only endpoint for task metrics with aggressive caching',
    securityLevel: SecurityLevel._LOW,
    cachingStrategy: {
      enabled: true,
      ttl: 1800000, // 30 minutes cache for statistics
      scope: 'global',
    },
  })
  @IntelligentCache({
    enabled: true,
    ttl: 1800000,
    scope: 'global',
    compressionEnabled: true,
  })
  @PerformanceMonitored(200) // Very fast for cached data
  async getTaskStatistics(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byCategory: Record<string, number>;
    averagePriority: number;
  }> {
    const allTasks = await this.tasksService.findAll({ page: 1, limit: 10000 });
    const tasks = allTasks.tasks;

    const byStatus: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    let totalPriority = 0;

    for (const task of tasks) {
      // Count by status
      byStatus[task.status] = (byStatus[task.status] || 0) + 1;

      // Count by category
      if (task.category) {
        byCategory[task.category] = (byCategory[task.category] || 0) + 1;
      }

      // Sum priorities
      totalPriority += task.priority;
    }

    return {
      total: tasks.length,
      byStatus,
      byCategory,
      averagePriority: tasks.length > 0 ? totalPriority / tasks.length : 0,
    };
  }
}

// ===== MODULE CONFIGURATION =====

@Module({
  controllers: [BasicTasksController, TaskReportsController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply the enhanced PARLANT middleware to all routes in this module
    consumer
      .apply(EnhancedUniversalParlantMiddleware)
      .forRoutes(BasicTasksController, TaskReportsController);
  }
}

// ===== APPLICATION MODULE =====

@Module({
  imports: [TasksModule],
})
export class BasicIntegrationAppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Global middleware application
    consumer
      .apply(EnhancedUniversalParlantMiddleware)
      .forRoutes('*'); // Apply to all routes
  }
}

// ===== USAGE EXAMPLES =====

/**
 * Example 1: Basic Controller Method
 * Minimal configuration for simple CRUD operations
 */
export class MinimalExampleController {
  @Get('simple')
  @EnhancedParlantValidated({
    intent: 'Simple data retrieval',
    description: 'Basic endpoint with minimal configuration',
    securityLevel: SecurityLevel._LOW,
  })
  async getSimpleData(): Promise<{ message: string }> {
    return { message: 'Hello from PARLANT-validated endpoint!' };
  }
}

/**
 * Example 2: Performance-Optimized Controller
 * Configuration focused on performance and caching
 */
export class PerformanceOptimizedController {
  @Get('fast-data')
  @EnhancedParlantValidated({
    intent: 'High-performance data retrieval',
    description: 'Optimized endpoint with aggressive caching',
    securityLevel: SecurityLevel._LOW,
    performanceTarget: 100, // Very fast target
    cachingStrategy: {
      enabled: true,
      ttl: 3600000, // 1 hour cache
      scope: 'global',
      compressionEnabled: true,
    },
  })
  @IntelligentCache({
    enabled: true,
    ttl: 3600000,
    scope: 'global',
    compressionEnabled: true,
  })
  @PerformanceMonitored(100)
  async getFastData(): Promise<{ data: string; timestamp: Date }> {
    // Simulate some processing
    await new Promise(resolve => setTimeout(resolve, 50));

    return {
      data: 'High-performance cached data',
      timestamp: new Date(),
    };
  }
}

/**
 * Example 3: Security-Focused Controller
 * Configuration with comprehensive security validation
 */
export class SecurityFocusedController {
  @Post('secure-operation')
  @EnhancedParlantValidated({
    intent: 'Perform secure administrative operation',
    description: 'High-security endpoint with comprehensive validation',
    securityLevel: SecurityLevel._HIGH,
    validationMode: ValidationMode._SYNCHRONOUS,
    approvalLevel: ApprovalLevel._SINGLE_APPROVAL,
    enableAuditTrail: true,
    contextRequirements: {
      requireAuthentication: true,
      requiredRoles: ['ADMIN'],
      requiredPermissions: ['ADMIN_OPERATION'],
      minimumSecurityClearance: SecurityLevel._HIGH,
    },
  })
  @ContextAwareAuth({
    requireAuthentication: true,
    requiredRoles: ['ADMIN'],
    requiredPermissions: ['ADMIN_OPERATION'],
  })
  async performSecureOperation(
    @Body() operationData: any,
    @ParlantContext() parlantContext?: ParlantRequestContext,
    @EnhancedUser() user?: UserContext
  ): Promise<{ success: boolean; operationId: string }> {
    console.log('Secure operation performed', {
      operationId: parlantContext?.operationId,
      userId: user?.id,
      validationTime: parlantContext?.processingTime,
    });

    return {
      success: true,
      operationId: parlantContext?.operationId || 'unknown',
    };
  }
}

// Export all examples for use in other modules
export {
  TasksService,
  BasicTasksController,
  TaskReportsController,
  TasksModule,
  BasicIntegrationAppModule,
  MinimalExampleController,
  PerformanceOptimizedController,
  SecurityFocusedController,
};