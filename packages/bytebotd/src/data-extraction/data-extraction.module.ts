import { Module } from '@nestjs/common';import { DataExtractionController } from './data-extraction.controller';import { DataExtractionService } from './data-extraction.service';import { ComputerUseModule } from '../computer-use/computer-use.module';

/**
 * Data Extraction Module
 *
 * Provides comprehensive data extraction capabilities including:
 * - Table data extraction with header detection
 * - List extraction with nested support
 * - Text content extraction with pattern matching
 * - Link and image extraction with metadata
 * - Custom pattern extraction with CSS selectors
 * - Structured data extraction (JSON-LD, microdata)
 * - Multi-format output support (JSON, CSV, XML, YAML)
 * - Pagination and infinite scroll handling
 *
 * Dependencies:
 * - ComputerUseModule: For browser automation and web page interaction
 * - Common modules: Security, validation, and authentication
 */
@Module({
  imports: [ComputerUseModule],
  controllers: [DataExtractionController],
  providers: [DataExtractionService],
  exports: [DataExtractionService],
})
export class DataExtractionModule {}