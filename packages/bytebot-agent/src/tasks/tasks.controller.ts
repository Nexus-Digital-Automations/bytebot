import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  HttpStatus,
  HttpCode,
  Query,
  HttpException,
  UseGuards,
  UseInterceptors,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiProduces,
  ApiConsumes,
  ApiExtraModels,
} from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { Message, Task } from '@prisma/client';
import { AddTaskMessageDto } from './dto/add-task-message.dto';
import { MessagesService } from '../messages/messages.service';
import { ANTHROPIC_MODELS } from '../anthropic/anthropic.constants';
import { OPENAI_MODELS } from '../openai/openai.constants';
import { GOOGLE_MODELS } from '../google/google.constants';
import { BytebotAgentModel } from 'src/agent/agent.types';
import { GlobalValidationPipe } from '../common/pipes/validation.pipe';
import { SanitizationPipe } from '../common/pipes/sanitization.pipe';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';
import { VersionInterceptor } from '../common/versioning/version.interceptor';
import { DeprecationGuard } from '../common/versioning/deprecation.guard';
import {
  ApiVersion,
  ForVersion,
  MultiVersion,
  SUPPORTED_API_VERSIONS,
} from '../common/versioning/api-version.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  Roles,
  Permissions,
  RequirePermission,
  OperatorOrAdmin,
  Authenticated,
  CurrentUser,
} from '../auth/decorators/roles.decorator';
import { User, UserRole, Permission } from '@prisma/client';

// Type definitions for proxy API responses
interface ProxyModelData {
  litellm_params: {
    model: string;
  };
  model_name: string;
}

interface ProxyModelsResponse {
  data: ProxyModelData[];
}

function isProxyModelsResponse(
  response: unknown,
): response is ProxyModelsResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'data' in response &&
    Array.isArray((response as { data: unknown }).data)
  );
}

function isProxyModelData(item: unknown): item is ProxyModelData {
  return (
    typeof item === 'object' &&
    item !== null &&
    'litellm_params' in item &&
    'model_name' in item &&
    typeof (item as { litellm_params: unknown }).litellm_params === 'object' &&
    (item as { litellm_params: unknown }).litellm_params !== null &&
    'model' in
      (item as { litellm_params: { model: unknown } }).litellm_params &&
    typeof (item as { litellm_params: { model: unknown } }).litellm_params
      .model === 'string' &&
    typeof (item as { model_name: unknown }).model_name === 'string'
  );
}

const geminiApiKey = process.env.GEMINI_API_KEY;
const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;

const proxyUrl = process.env.BYTEBOT_LLM_PROXY_URL;

const models = [
  ...(anthropicApiKey ? ANTHROPIC_MODELS : []),
  ...(openaiApiKey ? OPENAI_MODELS : []),
  ...(geminiApiKey ? GOOGLE_MODELS : []),
];

/**
 * Tasks Controller - Enterprise Task Management API
 *
 * Provides comprehensive task management capabilities with API versioning,
 * security integration, and enterprise-grade documentation.
 */
@ApiTags('Tasks')
@Controller('tasks')
@UseGuards(JwtAuthGuard, RolesGuard, RateLimitGuard, DeprecationGuard)
@UseInterceptors(VersionInterceptor)
@ApiBearerAuth('bearer')
@ApiProduces('application/json')
@ApiConsumes('application/json')
@ApiExtraModels(CreateTaskDto, AddTaskMessageDto)
@Authenticated() // Require authentication for all endpoints
export class TasksController {
  private readonly logger = new Logger(TasksController.name);

  constructor(
    private readonly tasksService: TasksService,
    private readonly messagesService: MessagesService,
  ) {}

  /**
   * Create a new task
   */
  @Post()
  @RequirePermission(Permission.TASK_WRITE)
  @ForVersion(SUPPORTED_API_VERSIONS.V1)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new task',
    description:
      'Creates a new task with the provided details and starts processing it through the AI automation pipeline.',
    operationId: 'createTask',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Task created successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: 'task-123e4567' },
        title: { type: 'string', example: 'Process document upload' },
        status: { type: 'string', example: 'pending' },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid task data provided',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Authentication required',
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Rate limit exceeded',
  })
  async create(
    @Body(GlobalValidationPipe, SanitizationPipe) createTaskDto: CreateTaskDto,
    @CurrentUser() user: User,
  ): Promise<Task> {
    const operationId = `create-task-${Date.now()}`;
    const startTime = Date.now();

    this.logger.log(`[${operationId}] Creating task`, {
      operationId,
      title: createTaskDto.title,
      userId: user.id,
      username: user.username,
      userRole: user.role,
      securityEvent: 'task_creation_requested',
    });

    try {
      const task = await this.tasksService.create(createTaskDto);

      const processingTime = Date.now() - startTime;
      this.logger.log(`[${operationId}] Task created successfully`, {
        operationId,
        taskId: task.id,
        processingTimeMs: processingTime,
        userId: user.id,
        username: user.username,
        securityEvent: 'task_creation_completed',
      });

      return task;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(`[${operationId}] Task creation failed`, {
        operationId,
        error: error.message,
        processingTimeMs: processingTime,
      });
      throw error;
    }
  }

  /**
   * Get all tasks with pagination and filtering
   */
  @Get()
  @Authenticated()
  @MultiVersion([SUPPORTED_API_VERSIONS.V1, SUPPORTED_API_VERSIONS.V2])
  @ApiOperation({
    summary: 'Get all tasks',
    description:
      'Retrieves a paginated list of tasks with optional filtering by status, category, and other criteria.',
    operationId: 'getTasks',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (1-based)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page',
    example: 10,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    description: 'Filter by single task status',
    example: 'pending',
  })
  @ApiQuery({
    name: 'statuses',
    required: false,
    type: String,
    description: 'Filter by multiple task statuses (comma-separated)',
    example: 'pending,in_progress',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tasks retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        tasks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              status: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        total: { type: 'number', example: 100 },
        totalPages: { type: 'number', example: 10 },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid query parameters',
  })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('statuses') statuses?: string,
    @CurrentUser() user: User,
  ): Promise<{ tasks: Task[]; total: number; totalPages: number }> {
    const operationId = `get-tasks-${Date.now()}`;
    const startTime = Date.now();

    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;

    // Handle both single status and multiple statuses
    let statusFilter: string[] | undefined;
    if (statuses) {
      statusFilter = statuses.split(',');
    } else if (status) {
      statusFilter = [status];
    }

    this.logger.log(`[${operationId}] Retrieving tasks`, {
      operationId,
      page: pageNum,
      limit: limitNum,
      statusFilter,
      userId: user.id,
      username: user.username,
      userRole: user.role,
      securityEvent: 'tasks_list_requested',
    });

    try {
      const result = await this.tasksService.findAll(
        pageNum,
        limitNum,
        statusFilter,
      );

      const processingTime = Date.now() - startTime;
      this.logger.log(`[${operationId}] Tasks retrieved successfully`, {
        operationId,
        count: result.tasks.length,
        total: result.total,
        processingTimeMs: processingTime,
      });

      return result;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(`[${operationId}] Task retrieval failed`, {
        operationId,
        error: error.message,
        processingTimeMs: processingTime,
      });
      throw error;
    }
  }

  /**
   * Get available AI models
   */
  @Get('models')
  @Authenticated()
  @MultiVersion([SUPPORTED_API_VERSIONS.V1, SUPPORTED_API_VERSIONS.V2])
  @ApiOperation({
    summary: 'Get available AI models',
    description:
      'Retrieves a list of available AI models that can be used for task processing, including both local and proxy-hosted models.',
    operationId: 'getAvailableModels',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Available models retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          provider: { type: 'string', example: 'anthropic' },
          name: { type: 'string', example: 'claude-3-sonnet' },
          title: { type: 'string', example: 'Claude 3 Sonnet' },
          contextWindow: { type: 'number', example: 200000 },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_GATEWAY,
    description: 'Failed to fetch models from proxy server',
  })
  async getModels() {
    if (proxyUrl) {
      try {
        const response = await fetch(`${proxyUrl}/model/info`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new HttpException(
            `Failed to fetch models from proxy: ${response.statusText}`,
            HttpStatus.BAD_GATEWAY,
          );
        }

        const proxyModels: unknown = await response.json();

        if (!isProxyModelsResponse(proxyModels)) {
          throw new HttpException(
            'Invalid response format from proxy',
            HttpStatus.BAD_GATEWAY,
          );
        }

        // Map proxy response to BytebotAgentModel format with type validation
        const models: BytebotAgentModel[] = proxyModels.data
          .filter(isProxyModelData)
          .map((model) => ({
            provider: 'proxy',
            name: model.litellm_params.model,
            title: model.model_name,
            contextWindow: 128000,
          }));

        return models;
      } catch (error) {
        if (error instanceof HttpException) {
          throw error;
        }
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        throw new HttpException(
          `Error fetching models: ${errorMessage}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
    return models;
  }

  /**
   * Get task by ID
   */
  @Get(':id')
  @Authenticated()
  @MultiVersion([SUPPORTED_API_VERSIONS.V1, SUPPORTED_API_VERSIONS.V2])
  @ApiOperation({
    summary: 'Get task by ID',
    description:
      'Retrieves a specific task by its unique identifier with all associated details and current status.',
    operationId: 'getTaskById',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique task identifier',
    example: 'task-123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Task retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        title: { type: 'string' },
        status: { type: 'string' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Task not found',
  })
  async findById(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<Task> {
    const operationId = `get-task-${Date.now()}`;
    const startTime = Date.now();

    this.logger.log(`[${operationId}] Retrieving task by ID`, {
      operationId,
      taskId: id,
      userId: user.id,
      username: user.username,
      userRole: user.role,
      securityEvent: 'task_details_requested',
    });

    try {
      const task = await this.tasksService.findById(id);

      const processingTime = Date.now() - startTime;
      this.logger.log(`[${operationId}] Task retrieved successfully`, {
        operationId,
        taskId: id,
        status: task.status,
        processingTimeMs: processingTime,
      });

      return task;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(`[${operationId}] Task retrieval failed`, {
        operationId,
        taskId: id,
        error: error.message,
        processingTimeMs: processingTime,
      });
      throw error;
    }
  }

  @Get(':id/messages')
  @Authenticated()
  async taskMessages(
    @Param('id') taskId: string,
    @Query('limit') limit?: string,
    @Query('page') page?: string,
    @CurrentUser() user: User,
  ): Promise<Message[]> {
    const options = {
      limit: limit ? parseInt(limit, 10) : undefined,
      page: page ? parseInt(page, 10) : undefined,
    };

    const messages = await this.messagesService.findAll(taskId, options);
    return messages;
  }

  @Post(':id/messages')
  @OperatorOrAdmin()
  @HttpCode(HttpStatus.CREATED)
  async addTaskMessage(
    @Param('id') taskId: string,
    @Body() guideTaskDto: AddTaskMessageDto,
    @CurrentUser() user: User,
  ): Promise<Task> {
    return this.tasksService.addTaskMessage(taskId, guideTaskDto);
  }

  @Get(':id/messages/raw')
  async taskRawMessages(
    @Param('id') taskId: string,
    @Query('limit') limit?: string,
    @Query('page') page?: string,
  ): Promise<Message[]> {
    const options = {
      limit: limit ? parseInt(limit, 10) : undefined,
      page: page ? parseInt(page, 10) : undefined,
    };

    return this.messagesService.findRawMessages(taskId, options);
  }

  @Get(':id/messages/processed')
  async taskProcessedMessages(
    @Param('id') taskId: string,
    @Query('limit') limit?: string,
    @Query('page') page?: string,
  ) {
    const options = {
      limit: limit ? parseInt(limit, 10) : undefined,
      page: page ? parseInt(page, 10) : undefined,
    };

    return this.messagesService.findProcessedMessages(taskId, options);
  }

  @Delete(':id')
  @OperatorOrAdmin()
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    await this.tasksService.delete(id);
  }

  @Post(':id/takeover')
  @OperatorOrAdmin()
  @HttpCode(HttpStatus.OK)
  async takeOver(
    @Param('id') taskId: string,
    @CurrentUser() user: User,
  ): Promise<Task> {
    return this.tasksService.takeOver(taskId);
  }

  @Post(':id/resume')
  @OperatorOrAdmin()
  @HttpCode(HttpStatus.OK)
  async resume(
    @Param('id') taskId: string,
    @CurrentUser() user: User,
  ): Promise<Task> {
    return this.tasksService.resume(taskId);
  }

  @Post(':id/cancel')
  @OperatorOrAdmin()
  @HttpCode(HttpStatus.OK)
  async cancel(
    @Param('id') taskId: string,
    @CurrentUser() user: User,
  ): Promise<Task> {
    return this.tasksService.cancel(taskId);
  }
}
