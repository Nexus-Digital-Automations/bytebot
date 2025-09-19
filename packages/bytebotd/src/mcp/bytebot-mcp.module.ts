/**
 * Bytebot MCP Integration Module
 *
 * This module provides the Model Context Protocol (MCP) server integration for Bytebot,
 * enabling external AI systems to interact with computer use functionality through
 * standardized MCP tools and protocols.
 *
 * Integration Components:
 * - MCP server configuration and initialization
 * - Computer use tools registration and exposure
 * - Server-Sent Events (SSE) endpoint configuration
 * - Tool parameter validation and response formatting
 *
 * MCP Server Configuration:
 * - Server name: 'bytebotd'
 * - Version: '0.0.1'
 * - SSE endpoint: '/mcp'
 * - Tool namespace: computer use operations
 *
 * Dependencies:
 * - @rekog/mcp-nest: MCP server implementation for NestJS
 * - ComputerUseModule: Core computer automation functionality
 * - ComputerUseTools: MCP tool implementations
 *
 * Usage:
 * This module is automatically imported by AppModule and exposes MCP endpoints
 * for external AI agent integration.
 *
 * @author ByteBot Development Team
 * @version 1.0.0
 * @since 2024-01-01
 */

import { Module, Logger } from '@nestjs/common';
import { McpModule } from '@rekog/mcp-nest';
import { ComputerUseModule } from '../computer-use/computer-use.module';
import { ComputerUseTools } from './computer-use.tools';

// Initialize module logger
const logger = new Logger('BytebotMcpModule');

/**
 * Bytebot MCP Module Configuration
 *
 * Configures and initializes the Model Context Protocol server integration
 * with comprehensive computer use tool support.
 *
 * Module Structure:
 * - Imports: ComputerUseModule for core functionality, McpModule for server
 * - Providers: ComputerUseTools for MCP tool implementations
 * - Configuration: Server identity, versioning, and endpoint setup
 */
@Module({
  imports: [
    // Core computer use functionality module
    ComputerUseModule,

    // MCP server configuration with Bytebot-specific settings
    McpModule.forRoot({
      name: 'bytebotd', // MCP server identifier
      version: '0.0.1', // API version for compatibility
      sseEndpoint: '/mcp', // Server-Sent Events endpoint path
    }),
  ],

  // MCP tool implementations for computer use operations
  providers: [ComputerUseTools],
})
export class BytebotMcpModule {
  constructor() {
    logger.log(
      'BytebotMcpModule initialized - MCP server ready for connections',
    );
    logger.log('MCP endpoints available at: /mcp (SSE)');
    logger.log(
      'Available tool categories: mouse, keyboard, screen, file operations',
    );
  }
}
