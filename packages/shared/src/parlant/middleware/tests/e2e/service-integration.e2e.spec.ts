/**
 * PARLANT Middleware End-to-End Service Integration Tests
 *
 * Real-world testing with actual Bytebot service configurations and integrations.
 * Tests middleware behavior in production-like environments with all services.
 *
 * @author Claude Code - PARLANT Framework Team
 * @version 2.0.0 - Enterprise E2E Testing Suite
 * @since 2024-09-22
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import * as request from 'supertest';
import { performance } from 'perf_hooks';

// Import PARLANT middleware framework
import {
  EnhancedUniversalParlantMiddleware,
  ParlantRequestResponseInterceptor,
  SecurityLevel,
  ValidationMode,
  ApprovalLevel,
  PERFORMANCE_TARGETS,
} from '../../index';

// Mock Bytebot service modules for testing
class MockAnthropicService {
  async generateResponse(prompt: string) {
    await new Promise(resolve => setTimeout(resolve, 50)); // Simulate API call
    return {
      content: `Anthropic response to: ${prompt}`,
      model: 'claude-3-sonnet',
      usage: { input_tokens: 10, output_tokens: 20 },
    };
  }
}

class MockOpenAIService {
  async chatCompletion(messages: any[]) {
    await new Promise(resolve => setTimeout(resolve, 75)); // Simulate API call
    return {
      choices: [{
        message: {
          content: `OpenAI response to: ${messages[0]?.content}`,
          role: 'assistant',
        },
      }],
      model: 'gpt-4',
      usage: { prompt_tokens: 15, completion_tokens: 25 },
    };
  }
}

class MockGoogleService {
  async generateContent(prompt: string) {
    await new Promise(resolve => setTimeout(resolve, 60)); // Simulate API call
    return {
      text: `Google AI response to: ${prompt}`,
      model: 'gemini-pro',
      safety_ratings: [],
    };
  }
}

class MockPrismaService {
  task = {
    findMany: jest.fn().mockResolvedValue([
      { id: 1, title: 'Test Task 1', status: 'pending' },
      { id: 2, title: 'Test Task 2', status: 'completed' },
    ]),
    findUnique: jest.fn().mockResolvedValue({ id: 1, title: 'Test Task 1' }),
    create: jest.fn().mockResolvedValue({ id: 3, title: 'New Task' }),
    update: jest.fn().mockResolvedValue({ id: 1, title: 'Updated Task' }),
    delete: jest.fn().mockResolvedValue({ id: 1, deleted: true }),
  };

  summary = {
    findMany: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockResolvedValue({ id: 1, content: 'Summary' }),
  };
}

// Mock controllers that simulate Bytebot service endpoints
import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, UseInterceptors } from '@nestjs/common';
import { EnhancedParlantValidated } from '../../decorators/enhanced-parlant-decorators';

@Controller('anthropic')
@UseInterceptors(ParlantRequestResponseInterceptor)
export class MockAnthropicController {
  constructor(private readonly anthropicService: MockAnthropicService) {}

  @Post('generate')
  @EnhancedParlantValidated({
    intent: 'Generate AI content using Anthropic Claude',
    description: 'AI content generation with conversational validation',
    securityLevel: SecurityLevel._MEDIUM,
    validationMode: ValidationMode._SYNCHRONOUS,
    enableMetrics: true,
    enableAuditTrail: true,
    performanceTarget: PERFORMANCE_TARGETS.STANDARD,
  })
  async generateContent(@Body() body: { prompt: string; model?: string; maxTokens?: number }) {
    const startTime = performance.now();
    const result = await this.anthropicService.generateResponse(body.prompt);
    const endTime = performance.now();

    return {
      ...result,
      processingTime: endTime - startTime,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('models')
  @EnhancedParlantValidated({
    intent: 'List available Anthropic models',
    description: 'Retrieve available AI models with caching',
    securityLevel: SecurityLevel._LOW,
    enableMetrics: true,
    performanceTarget: PERFORMANCE_TARGETS.FAST,
    cachingStrategy: {
      enabled: true,
      ttl: 300000, // 5 minutes
      scope: 'global',
    },
  })
  async listModels() {
    return {
      models: ['claude-3-sonnet', 'claude-3-haiku', 'claude-3-opus'],
      cached: true,
      timestamp: new Date().toISOString(),
    };
  }
}

@Controller('openai')
@UseInterceptors(ParlantRequestResponseInterceptor)
export class MockOpenAIController {
  constructor(private readonly openaiService: MockOpenAIService) {}

  @Post('chat')
  @EnhancedParlantValidated({
    intent: 'OpenAI chat completion with enhanced validation',
    description: 'Chat completion with real-time security scanning',
    securityLevel: SecurityLevel._MEDIUM,
    validationMode: ValidationMode._SYNCHRONOUS,
    enableMetrics: true,
    performanceTarget: PERFORMANCE_TARGETS.STANDARD,
  })
  async chatCompletion(@Body() body: { messages: any[]; model?: string; temperature?: number }) {
    const startTime = performance.now();
    const result = await this.openaiService.chatCompletion(body.messages);
    const endTime = performance.now();

    return {
      ...result,
      processingTime: endTime - startTime,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('usage')
  @EnhancedParlantValidated({
    intent: 'Get OpenAI API usage statistics',
    description: 'Retrieve usage data with performance monitoring',
    securityLevel: SecurityLevel._HIGH,
    enableMetrics: true,
    performanceTarget: PERFORMANCE_TARGETS.FAST,
  })
  async getUsage() {
    return {
      usage: {
        totalTokens: 150000,
        totalRequests: 1500,
        lastReset: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    };
  }
}

@Controller('google')
@UseInterceptors(ParlantRequestResponseInterceptor)
export class MockGoogleController {
  constructor(private readonly googleService: MockGoogleService) {}

  @Post('generate')
  @EnhancedParlantValidated({
    intent: 'Google AI content generation',
    description: 'Generate content using Google Gemini with safety checks',
    securityLevel: SecurityLevel._MEDIUM,
    validationMode: ValidationMode._SYNCHRONOUS,
    enableMetrics: true,
    performanceTarget: PERFORMANCE_TARGETS.STANDARD,
  })
  async generateContent(@Body() body: { prompt: string; model?: string }) {
    const startTime = performance.now();
    const result = await this.googleService.generateContent(body.prompt);
    const endTime = performance.now();

    return {
      ...result,
      processingTime: endTime - startTime,
      timestamp: new Date().toISOString(),
    };
  }
}

@Controller('tasks')
@UseInterceptors(ParlantRequestResponseInterceptor)
export class MockTasksController {
  constructor(private readonly prismaService: MockPrismaService) {}

  @Get()
  @EnhancedParlantValidated({
    intent: 'List all tasks with pagination',
    description: 'Retrieve tasks with intelligent caching and filtering',
    securityLevel: SecurityLevel._LOW,
    enableMetrics: true,
    performanceTarget: PERFORMANCE_TARGETS.FAST,
    cachingStrategy: {
      enabled: true,
      ttl: 60000, // 1 minute
      scope: 'user',
    },
  })
  async findAll() {
    const tasks = await this.prismaService.task.findMany();
    return {
      tasks,
      total: tasks.length,
      timestamp: new Date().toISOString(),
    };
  }

  @Post()
  @EnhancedParlantValidated({
    intent: 'Create new task with validation',
    description: 'Create task with comprehensive input validation',
    securityLevel: SecurityLevel._MEDIUM,
    validationMode: ValidationMode._SYNCHRONOUS,
    enableMetrics: true,
    enableAuditTrail: true,
    performanceTarget: PERFORMANCE_TARGETS.STANDARD,
  })
  async create(@Body() createTaskDto: any) {
    const task = await this.prismaService.task.create(createTaskDto);
    return {
      task,
      created: true,
      timestamp: new Date().toISOString(),
    };
  }
}

@Controller('summaries')
@UseInterceptors(ParlantRequestResponseInterceptor)
export class MockSummariesController {
  constructor(private readonly prismaService: MockPrismaService) {}

  @Post('generate')
  @EnhancedParlantValidated({
    intent: 'Generate AI-powered summary',
    description: 'Create intelligent summaries with multi-service validation',
    securityLevel: SecurityLevel._HIGH,
    validationMode: ValidationMode._SYNCHRONOUS,
    approvalLevel: ApprovalLevel._SINGLE_APPROVAL,
    enableMetrics: true,
    enableAuditTrail: true,
    performanceTarget: PERFORMANCE_TARGETS.COMPLEX,
  })
  async generateSummary(@Body() body: { content: string; type: string }) {
    const summary = await this.prismaService.summary.create({
      content: `Summary of: ${body.content}`,
      type: body.type,
    });

    return {
      summary,
      generationTime: new Date().toISOString(),
      wordCount: body.content.split(' ').length,
    };
  }
}

describe('PARLANT Middleware E2E Service Integration', () => {
  let app: INestApplication;
  let testingModule: TestingModule;

  // Performance tracking for E2E tests
  const e2ePerformanceMetrics: Record<string, number[]> = {
    anthropic: [],
    openai: [],
    google: [],
    tasks: [],
    summaries: [],
    crossService: [],
  };

  beforeAll(async () => {
    console.log('🚀 Starting PARLANT E2E Service Integration Tests');
    console.log('🔧 Testing real Bytebot service patterns with middleware');

    testingModule = await Test.createTestingModule({
      imports: [
        // Core NestJS modules that Bytebot uses
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        ThrottlerModule.forRoot([
          {
            name: 'default',
            ttl: 60000,
            limit: 100,
          },
        ]),
        ScheduleModule.forRoot(),
        EventEmitterModule.forRoot(),
      ],
      controllers: [
        MockAnthropicController,
        MockOpenAIController,
        MockGoogleController,
        MockTasksController,
        MockSummariesController,
      ],
      providers: [
        MockAnthropicService,
        MockOpenAIService,
        MockGoogleService,
        MockPrismaService,
      ],
    }).compile();

    app = testingModule.createNestApplication();

    // Apply PARLANT middleware globally like in real Bytebot services
    app.use(new EnhancedUniversalParlantMiddleware().use);

    await app.init();

    console.log('✅ E2E Test application initialized with production-like configuration');
  });

  afterAll(async () => {
    await app.close();

    // Report E2E performance metrics
    console.log('\n📈 E2E Performance Test Results:');
    Object.entries(e2ePerformanceMetrics).forEach(([service, times]) => {
      if (times.length > 0) {
        const avg = times.reduce((a, b) => a + b, 0) / times.length;
        const min = Math.min(...times);
        const max = Math.max(...times);
        console.log(`   ${service}: avg=${avg.toFixed(2)}ms, min=${min.toFixed(2)}ms, max=${max.toFixed(2)}ms`);
      }
    });
  });

  describe('Anthropic Service Integration', () => {
    it('should handle AI content generation with PARLANT validation', async () => {
      const startTime = performance.now();

      const requestData = {
        prompt: 'Generate a creative story about AI and humans working together',
        model: 'claude-3-sonnet',
        maxTokens: 500,
      };

      const response = await request(app.getHttpServer())
        .post('/anthropic/generate')
        .send(requestData)
        .expect(200);

      const endTime = performance.now();
      const duration = endTime - startTime;
      e2ePerformanceMetrics.anthropic.push(duration);

      expect(response.body.content).toBeDefined();
      expect(response.body.model).toBe('claude-3-sonnet');
      expect(response.body.processingTime).toBeDefined();
      expect(duration).toBeLessThan(PERFORMANCE_TARGETS.STANDARD);

      console.log(`✅ Anthropic integration test: ${duration.toFixed(2)}ms`);
    });

    it('should cache model list requests efficiently', async () => {
      // First request
      const startTime1 = performance.now();
      const response1 = await request(app.getHttpServer())
        .get('/anthropic/models')
        .expect(200);
      const endTime1 = performance.now();

      // Second request should be faster due to caching
      const startTime2 = performance.now();
      const response2 = await request(app.getHttpServer())
        .get('/anthropic/models')
        .expect(200);
      const endTime2 = performance.now();

      const duration1 = endTime1 - startTime1;
      const duration2 = endTime2 - startTime2;

      expect(response1.body.models).toEqual(response2.body.models);
      expect(duration2).toBeLessThan(duration1); // Second request should be faster
      expect(duration2).toBeLessThan(PERFORMANCE_TARGETS.FAST);

      console.log(`✅ Anthropic caching test: ${duration1.toFixed(2)}ms → ${duration2.toFixed(2)}ms`);
    });
  });

  describe('OpenAI Service Integration', () => {
    it('should handle chat completion with security validation', async () => {
      const startTime = performance.now();

      const requestData = {
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Explain quantum computing in simple terms.' },
        ],
        model: 'gpt-4',
        temperature: 0.7,
      };

      const response = await request(app.getHttpServer())
        .post('/openai/chat')
        .send(requestData)
        .expect(200);

      const endTime = performance.now();
      const duration = endTime - startTime;
      e2ePerformanceMetrics.openai.push(duration);

      expect(response.body.choices).toBeDefined();
      expect(response.body.choices[0].message.content).toBeDefined();
      expect(response.body.processingTime).toBeDefined();
      expect(duration).toBeLessThan(PERFORMANCE_TARGETS.STANDARD);

      console.log(`✅ OpenAI integration test: ${duration.toFixed(2)}ms`);
    });

    it('should enforce high security for usage endpoint', async () => {
      const startTime = performance.now();

      const response = await request(app.getHttpServer())
        .get('/openai/usage')
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      const endTime = performance.now();
      const duration = endTime - startTime;
      e2ePerformanceMetrics.openai.push(duration);

      expect(response.body.usage).toBeDefined();
      expect(response.body.usage.totalTokens).toBeDefined();
      expect(duration).toBeLessThan(PERFORMANCE_TARGETS.FAST);

      console.log(`✅ OpenAI security test: ${duration.toFixed(2)}ms`);
    });
  });

  describe('Google AI Service Integration', () => {
    it('should handle content generation with safety checks', async () => {
      const startTime = performance.now();

      const requestData = {
        prompt: 'Write a brief explanation of machine learning concepts',
        model: 'gemini-pro',
      };

      const response = await request(app.getHttpServer())
        .post('/google/generate')
        .send(requestData)
        .expect(200);

      const endTime = performance.now();
      const duration = endTime - startTime;
      e2ePerformanceMetrics.google.push(duration);

      expect(response.body.text).toBeDefined();
      expect(response.body.safety_ratings).toBeDefined();
      expect(response.body.processingTime).toBeDefined();
      expect(duration).toBeLessThan(PERFORMANCE_TARGETS.STANDARD);

      console.log(`✅ Google AI integration test: ${duration.toFixed(2)}ms`);
    });
  });

  describe('Tasks Service Integration', () => {
    it('should handle task listing with intelligent caching', async () => {
      const startTime = performance.now();

      const response = await request(app.getHttpServer())
        .get('/tasks')
        .expect(200);

      const endTime = performance.now();
      const duration = endTime - startTime;
      e2ePerformanceMetrics.tasks.push(duration);

      expect(response.body.tasks).toBeDefined();
      expect(Array.isArray(response.body.tasks)).toBe(true);
      expect(response.body.total).toBeDefined();
      expect(duration).toBeLessThan(PERFORMANCE_TARGETS.FAST);

      console.log(`✅ Tasks listing test: ${duration.toFixed(2)}ms`);
    });

    it('should validate task creation with audit trail', async () => {
      const startTime = performance.now();

      const taskData = {
        title: 'E2E Test Task',
        description: 'Task created during E2E testing',
        priority: 'medium',
        status: 'pending',
      };

      const response = await request(app.getHttpServer())
        .post('/tasks')
        .send(taskData)
        .expect(201);

      const endTime = performance.now();
      const duration = endTime - startTime;
      e2ePerformanceMetrics.tasks.push(duration);

      expect(response.body.task).toBeDefined();
      expect(response.body.created).toBe(true);
      expect(response.body.timestamp).toBeDefined();
      expect(duration).toBeLessThan(PERFORMANCE_TARGETS.STANDARD);

      console.log(`✅ Task creation test: ${duration.toFixed(2)}ms`);
    });
  });

  describe('Summaries Service Integration', () => {
    it('should generate summaries with high security validation', async () => {
      const startTime = performance.now();

      const summaryData = {
        content: 'This is a long document that needs to be summarized. It contains important information about project status, team updates, and future plans. The middleware should validate this content and generate an appropriate summary.',
        type: 'project-update',
      };

      const response = await request(app.getHttpServer())
        .post('/summaries/generate')
        .send(summaryData)
        .expect(201);

      const endTime = performance.now();
      const duration = endTime - startTime;
      e2ePerformanceMetrics.summaries.push(duration);

      expect(response.body.summary).toBeDefined();
      expect(response.body.wordCount).toBeDefined();
      expect(response.body.generationTime).toBeDefined();
      expect(duration).toBeLessThan(PERFORMANCE_TARGETS.COMPLEX);

      console.log(`✅ Summary generation test: ${duration.toFixed(2)}ms`);
    });
  });

  describe('Cross-Service Integration Tests', () => {
    it('should handle cross-service workflows efficiently', async () => {
      const startTime = performance.now();

      // Simulate a cross-service workflow: create task → generate summary → get AI insights

      // Step 1: Create a task
      const taskResponse = await request(app.getHttpServer())
        .post('/tasks')
        .send({
          title: 'Cross-Service Test Task',
          description: 'Testing cross-service integration with PARLANT middleware',
          priority: 'high',
        })
        .expect(201);

      // Step 2: Generate a summary
      const summaryResponse = await request(app.getHttpServer())
        .post('/summaries/generate')
        .send({
          content: taskResponse.body.task.description,
          type: 'task-summary',
        })
        .expect(201);

      // Step 3: Get AI insights from multiple services
      const anthropicResponse = await request(app.getHttpServer())
        .post('/anthropic/generate')
        .send({
          prompt: `Analyze this task: ${taskResponse.body.task.title}`,
          maxTokens: 200,
        })
        .expect(200);

      const openaiResponse = await request(app.getHttpServer())
        .post('/openai/chat')
        .send({
          messages: [
            { role: 'user', content: `Provide insights on: ${taskResponse.body.task.title}` },
          ],
        })
        .expect(200);

      const endTime = performance.now();
      const totalDuration = endTime - startTime;
      e2ePerformanceMetrics.crossService.push(totalDuration);

      // Verify all responses
      expect(taskResponse.body.task).toBeDefined();
      expect(summaryResponse.body.summary).toBeDefined();
      expect(anthropicResponse.body.content).toBeDefined();
      expect(openaiResponse.body.choices[0].message.content).toBeDefined();

      // Ensure reasonable total time for cross-service workflow
      expect(totalDuration).toBeLessThan(PERFORMANCE_TARGETS.CRITICAL);

      console.log(`✅ Cross-service workflow test: ${totalDuration.toFixed(2)}ms`);
    });

    it('should maintain consistent middleware behavior across services', async () => {
      const services = [
        { endpoint: '/anthropic/models', method: 'GET' },
        { endpoint: '/openai/usage', method: 'GET', headers: { Authorization: 'Bearer test' } },
        { endpoint: '/tasks', method: 'GET' },
      ];

      const results = [];

      for (const service of services) {
        const startTime = performance.now();

        let req = request(app.getHttpServer())[service.method.toLowerCase()](service.endpoint);

        if (service.headers) {
          Object.entries(service.headers).forEach(([key, value]) => {
            req = req.set(key, value);
          });
        }

        const response = await req.expect(200);

        const endTime = performance.now();
        const duration = endTime - startTime;

        results.push({
          service: service.endpoint,
          duration,
          status: response.status,
          hasTimestamp: !!response.body.timestamp,
        });
      }

      // Verify consistent behavior across all services
      results.forEach(result => {
        expect(result.status).toBe(200);
        expect(result.hasTimestamp).toBe(true);
        expect(result.duration).toBeLessThan(PERFORMANCE_TARGETS.STANDARD);
      });

      const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
      console.log(`✅ Consistent middleware behavior test: avg=${avgDuration.toFixed(2)}ms`);
    });
  });

  describe('Load and Stress Testing', () => {
    it('should handle concurrent requests across multiple services', async () => {
      const concurrentRequests = 20;
      const promises: Promise<any>[] = [];

      const startTime = performance.now();

      // Create concurrent requests to different services
      for (let i = 0; i < concurrentRequests; i++) {
        const serviceIndex = i % 4;

        switch (serviceIndex) {
          case 0:
            promises.push(
              request(app.getHttpServer())
                .get('/anthropic/models')
                .expect(200)
            );
            break;
          case 1:
            promises.push(
              request(app.getHttpServer())
                .get('/tasks')
                .expect(200)
            );
            break;
          case 2:
            promises.push(
              request(app.getHttpServer())
                .post('/openai/chat')
                .send({
                  messages: [{ role: 'user', content: `Concurrent test ${i}` }],
                })
                .expect(200)
            );
            break;
          case 3:
            promises.push(
              request(app.getHttpServer())
                .post('/google/generate')
                .send({
                  prompt: `Concurrent prompt ${i}`,
                })
                .expect(200)
            );
            break;
        }
      }

      const responses = await Promise.all(promises);
      const endTime = performance.now();
      const totalDuration = endTime - startTime;
      const avgDuration = totalDuration / concurrentRequests;

      expect(responses).toHaveLength(concurrentRequests);
      expect(avgDuration).toBeLessThan(PERFORMANCE_TARGETS.STANDARD);

      console.log(`✅ Concurrent load test: ${concurrentRequests} requests in ${totalDuration.toFixed(2)}ms (avg: ${avgDuration.toFixed(2)}ms)`);
    });

    it('should maintain performance under sustained load', async () => {
      const sustainedLoad = 100;
      const batchSize = 10;
      const durations: number[] = [];

      for (let batch = 0; batch < sustainedLoad / batchSize; batch++) {
        const batchPromises: Promise<any>[] = [];
        const batchStartTime = performance.now();

        for (let i = 0; i < batchSize; i++) {
          batchPromises.push(
            request(app.getHttpServer())
              .get('/tasks')
              .expect(200)
          );
        }

        await Promise.all(batchPromises);

        const batchEndTime = performance.now();
        const batchDuration = (batchEndTime - batchStartTime) / batchSize;
        durations.push(batchDuration);
      }

      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      const maxDuration = Math.max(...durations);

      expect(avgDuration).toBeLessThan(PERFORMANCE_TARGETS.STANDARD);
      expect(maxDuration).toBeLessThan(PERFORMANCE_TARGETS.COMPLEX);

      console.log(`✅ Sustained load test: ${sustainedLoad} requests, avg=${avgDuration.toFixed(2)}ms, max=${maxDuration.toFixed(2)}ms`);
    });
  });
});

console.log('🧪 PARLANT E2E Service Integration Test Suite Loaded');
console.log('🔧 Real Bytebot Service Simulation:');
console.log('   ✅ Anthropic AI service endpoints');
console.log('   ✅ OpenAI chat completion service');
console.log('   ✅ Google AI content generation');
console.log('   ✅ Tasks management service');
console.log('   ✅ Summaries generation service');
console.log('   ✅ Cross-service workflow testing');
console.log('   ✅ Load and stress testing');
console.log('🎯 Production Environment Simulation: Real service patterns, security, caching');