import { Module } from '@nestjs/common';
import { ComputerUseService } from './computer-use.service';
import { AsyncJobService } from './async-job.service';
import { ComputerUseController } from './computer-use.controller';
import { NutModule } from '../nut/nut.module';
import { CacheModule } from '../cache/cache.module';
import { MetricsModule } from '../metrics/metrics.module';
import { SecurityModule } from '../common/security/security.module';

@Module({
  imports: [
    NutModule,
    CacheModule, // Import cache service for result caching
    MetricsModule, // Import metrics service for performance monitoring
    SecurityModule, // Import security module for rate limiting providers
  ],
  controllers: [ComputerUseController],
  providers: [ComputerUseService, AsyncJobService],
  exports: [ComputerUseService, AsyncJobService],
})
export class ComputerUseModule {}
