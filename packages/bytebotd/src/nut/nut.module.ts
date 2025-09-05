/**
 * NUT Module - Node User Interface Testing Module
 *
 * Provides automation capabilities for keyboard, mouse, and screen interactions
 * using the nut-js library with improved TypeScript support and error handling.
 *
 * Features:
 * - Keyboard input simulation and text typing
 * - Mouse movement, clicking, and wheel scrolling
 * - Screen capture functionality
 * - Cursor position tracking
 * - Comprehensive logging and error handling
 * - Operation tracking with unique IDs
 * - Service health monitoring
 *
 * Dependencies:
 * - @nut-tree-fork/nut-js (for UI automation)
 * - @nestjs/common (for dependency injection)
 *
 * Usage:
 * Import NutModule in your application module and inject NutService
 * where UI automation capabilities are needed.
 *
 * @author Claude Code
 * @version 1.1.0
 */

import { Module } from '@nestjs/common';
import { NutService } from './nut.service';

/**
 * NUT Module configuration
 *
 * Exports NutService for use in other modules while keeping all
 * implementation details encapsulated within the service.
 */
@Module({
  providers: [NutService],
  exports: [NutService],
})
export class NutModule {
  constructor() {
    // Log module initialization for debugging purposes
    console.log('NUT Module initialized - UI automation services available');
  }
}
