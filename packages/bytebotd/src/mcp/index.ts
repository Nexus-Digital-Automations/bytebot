/**
 * MCP Integration Public API
 *
 * This module serves as the primary export point for Bytebot's Model Context Protocol
 * integration components. It provides a clean public API for importing MCP-related
 * functionality throughout the application.
 *
 * Available Exports:
 * - BytebotMcpModule: Main MCP server module for NestJS integration
 * - ComputerUseTools: Tool implementations for computer use operations
 * - Base64ImageCompressor: Image compression utilities
 * - Compression interfaces and types
 *
 * Usage:
 * import { BytebotMcpModule } from './mcp';
 *
 * The module is designed for easy integration with the main application module
 * and provides all necessary components for MCP server functionality.
 *
 * @author ByteBot Development Team
 * @version 1.0.0
 * @since 2024-01-01
 */

// Primary MCP module export
export * from './bytebot-mcp.module';

// MCP tools and utilities
export * from './computer-use.tools';
export * from './compressor';
