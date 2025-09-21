/**
 * Database Module - COMPREHENSIVE PARLANT INTEGRATION
 *
 * Central module that provides conversational validation for all database operations
 * in the Bytebot system. Integrates with the ConversationalDatabaseService to ensure
 * all data access operations are validated through conversational AI.
 *
 * Features:
 * - Centralized database service registration
 * - Conversational validation for all database operations
 * - Repository pattern with Parlant integration
 * - Performance monitoring and metrics collection
 * - Backup and audit trail management
 * - Risk-based operation approval workflows
 *
 * @author Claude Code - Database Integration Specialist
 * @version 1.0.0
 */

import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ConversationalDatabaseService } from './conversational-database.service';
import { ParlantModule } from '../parlant/parlant.module';

/**
 * Global database module with conversational validation
 */
@Global()
@Module({
  imports: [
    ConfigModule,
    ParlantModule,
  ],
  providers: [
    ConversationalDatabaseService,
  ],
  exports: [
    ConversationalDatabaseService,
  ],
})
export class DatabaseModule {
  constructor(private readonly databaseService: ConversationalDatabaseService) {
    // Initialize cleanup interval
    setInterval(() => {
      try {
        this.databaseService.cleanup();
      } catch (error: unknown) {
        console.error('Database cleanup failed:', error);
      }
    }, 600000); // 10 minutes
  }
}