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
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { Message, Task } from '@prisma/client';
import { AddTaskMessageDto } from './dto/add-task-message.dto';
import { MessagesService } from '../messages/messages.service';
import { ANTHROPIC_MODELS } from '../anthropic/anthropic.constants';
import { OPENAI_MODELS } from '../openai/openai.constants';
import { GOOGLE_MODELS } from '../google/google.constants';
import { BytebotAgentModel } from 'src/agent/agent.types';

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

@Controller('tasks')
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
    private readonly messagesService: MessagesService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createTaskDto: CreateTaskDto): Promise<Task> {
    return this.tasksService.create(createTaskDto);
  }

  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('statuses') statuses?: string,
  ): Promise<{ tasks: Task[]; total: number; totalPages: number }> {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;

    // Handle both single status and multiple statuses
    let statusFilter: string[] | undefined;
    if (statuses) {
      statusFilter = statuses.split(',');
    } else if (status) {
      statusFilter = [status];
    }

    return this.tasksService.findAll(pageNum, limitNum, statusFilter);
  }

  @Get('models')
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

  @Get(':id')
  async findById(@Param('id') id: string): Promise<Task> {
    return this.tasksService.findById(id);
  }

  @Get(':id/messages')
  async taskMessages(
    @Param('id') taskId: string,
    @Query('limit') limit?: string,
    @Query('page') page?: string,
  ): Promise<Message[]> {
    const options = {
      limit: limit ? parseInt(limit, 10) : undefined,
      page: page ? parseInt(page, 10) : undefined,
    };

    const messages = await this.messagesService.findAll(taskId, options);
    return messages;
  }

  @Post(':id/messages')
  @HttpCode(HttpStatus.CREATED)
  async addTaskMessage(
    @Param('id') taskId: string,
    @Body() guideTaskDto: AddTaskMessageDto,
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
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string): Promise<void> {
    await this.tasksService.delete(id);
  }

  @Post(':id/takeover')
  @HttpCode(HttpStatus.OK)
  async takeOver(@Param('id') taskId: string): Promise<Task> {
    return this.tasksService.takeOver(taskId);
  }

  @Post(':id/resume')
  @HttpCode(HttpStatus.OK)
  async resume(@Param('id') taskId: string): Promise<Task> {
    return this.tasksService.resume(taskId);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(@Param('id') taskId: string): Promise<Task> {
    return this.tasksService.cancel(taskId);
  }
}
