/**
 * QA Automation Platform - Core Module
 *
 * Enterprise-grade QA automation platform with comprehensive testing capabilities
 * including intelligent test generation, cross-platform execution, visual regression,
 * performance testing, accessibility validation, and continuous quality monitoring.
 *
 * @fileoverview Core NestJS module providing QA automation platform infrastructure
 * @author Bytebot Team
 * @version 1.0.0
 */

import { Module, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TestGenerationModule } from '../test-generation/test-generation.module';
import { CrossPlatformModule } from '../cross-platform/cross-platform.module';
import { VisualRegressionModule } from '../visual-regression/visual-regression.module';
import { PerformanceTestingModule } from '../performance/performance-testing.module';
import { AccessibilityTestingModule } from '../accessibility/accessibility-testing.module';
import { TestDataModule } from '../test-data/test-data.module';
import { MonitoringModule } from '../monitoring/monitoring.module';
import { DefectPredictionModule } from '../defect-prediction/defect-prediction.module';
import { QAPlatformController } from '../controllers/qa-platform.controller';
import { QAPlatformService } from '../services/qa-platform.service';
import { TestCase } from '../entities/test-case.entity';
import { TestExecution } from '../entities/test-execution.entity';
import { QualityMetrics } from '../entities/quality-metrics.entity';
import { DefectPrediction } from '../entities/defect-prediction.entity';

/**
 * QA Platform Core Module
 *
 * Orchestrates all QA automation components and provides enterprise-grade
 * testing capabilities with local-only architecture compliance.
 */
@Module({
  imports: [
    // Configuration management
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Database configuration with local-only architecture
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const dbType = configService.get('DATABASE_TYPE', 'sqlite');

        if (dbType === 'sqlite') {
          return {
            type: 'sqlite',
            database: configService.get('DATABASE_PATH', './data/qa-platform.db'),
            entities: [TestCase, TestExecution, QualityMetrics, DefectPrediction],
            synchronize: configService.get('NODE_ENV') !== 'production',
            logging: configService.get('DB_LOGGING', false),
          };
        }

        // Local PostgreSQL configuration
        return {
          type: 'postgres',
          host: configService.get('DB_HOST', 'localhost'),
          port: configService.get('DB_PORT', 5432),
          username: configService.get('DB_USERNAME', 'postgres'),
          password: configService.get('DB_PASSWORD', 'password'),
          database: configService.get('DB_NAME', 'qa_platform'),
          entities: [TestCase, TestExecution, QualityMetrics, DefectPrediction],
          synchronize: configService.get('NODE_ENV') !== 'production',
          ssl: false, // Local deployment only
        };
      },
      inject: [ConfigService],
    }),

    // Core entity repositories
    TypeOrmModule.forFeature([
      TestCase,
      TestExecution,
      QualityMetrics,
      DefectPrediction,
    ]),

    // Feature modules
    TestGenerationModule,
    CrossPlatformModule,
    VisualRegressionModule,
    PerformanceTestingModule,
    AccessibilityTestingModule,
    TestDataModule,
    MonitoringModule,
    DefectPredictionModule,
  ],
  controllers: [QAPlatformController],
  providers: [
    QAPlatformService,
    {
      provide: Logger,
      useFactory: () => new Logger('QAPlatform'),
    },
  ],
  exports: [QAPlatformService],
})
export class QAPlatformModule {
  private readonly logger = new Logger(QAPlatformModule.name);

  constructor() {
    this.logger.log('QA Automation Platform module initialized');
    this.logger.log('Enterprise-grade testing capabilities activated');
    this.logger.log('Local-only architecture compliance ensured');
  }
}