import { Module } from '@nestjs/common';
import { ContentMonitoringController } from './content-monitoring.controller';
import { ContentMonitoringService } from './content-monitoring.service';
import { ComputerUseModule } from '../computer-use/computer-use.module';

/**
 * Content Monitoring Module
 *
 * Provides comprehensive content monitoring capabilities including:
 * - Real-time page content monitoring with change detection
 * - Multiple change detection methods (DOM, text, visual, hash)
 * - Configurable notification systems (email, webhook, SMS, Slack)
 * - Monitor lifecycle management (start, stop, pause, resume)
 * - Historical change tracking and analytics
 * - Bulk monitor operations for enterprise scale
 * - Advanced filtering and pattern matching
 * - Performance monitoring and optimization
 *
 * Dependencies:
 * - ComputerUseModule: For browser automation and content extraction
 * - Common modules: Security, validation, and authentication
 */
@Module({
  imports: [ComputerUseModule],
  controllers: [ContentMonitoringController],
  providers: [ContentMonitoringService],
  exports: [ContentMonitoringService],
})
export class ContentMonitoringModule {}