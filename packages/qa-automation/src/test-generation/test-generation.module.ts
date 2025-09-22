/**
 * Intelligent Test Generation Module
 *
 * Advanced AI-powered test generation from user stories, specifications,
 * and existing application behavior patterns. Supports multiple test types
 * including unit, integration, E2E, performance, and security tests.
 *
 * @fileoverview NestJS module for intelligent test generation capabilities
 * @author Bytebot Team
 * @version 1.0.0
 */

import { Module, Logger } from '@nestjs/common';
import { TestGenerationController } from './test-generation.controller';
import { TestGenerationService } from './test-generation.service';
import { UserStoryAnalyzer } from './services/user-story-analyzer.service';
import { SpecificationParser } from './services/specification-parser.service';
import { TestTemplateEngine } from './services/test-template-engine.service';
import { CodeAnalysisService } from './services/code-analysis.service';
import { AITestGenerator } from './services/ai-test-generator.service';

@Module({
  controllers: [TestGenerationController],
  providers: [
    TestGenerationService,
    UserStoryAnalyzer,
    SpecificationParser,
    TestTemplateEngine,
    CodeAnalysisService,
    AITestGenerator,
    {
      provide: Logger,
      useFactory: () => new Logger('TestGeneration'),
    },
  ],
  exports: [TestGenerationService],
})
export class TestGenerationModule {
  private readonly logger = new Logger(TestGenerationModule.name);

  constructor() {
    this.logger.log('Intelligent Test Generation module initialized');
  }
}