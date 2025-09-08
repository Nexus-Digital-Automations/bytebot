/**
 * API Documentation Module - Comprehensive Export Index
 *
 * This module exports all documentation-related functionality including Swagger
 * configuration, OpenAPI setup, and documentation generation utilities.
 *
 * @fileoverview API documentation module exports
 * @version 1.0.0
 * @author API Versioning & Documentation Specialist
 */

// Swagger/OpenAPI configuration - individual function exports
export {
  createSwaggerConfig,
  setupApiDocumentation,
  generateDocumentationMetadata,
} from './swagger.config';

// Default export includes all configuration constants and functions
export { default as SwaggerConfig } from './swagger.config';

// Re-export all from swagger.config for convenience
export * from './swagger.config';

// Import the default export for our typed re-export
import SwaggerConfigDefault from './swagger.config';

// Type-safe default export object
export default SwaggerConfigDefault;
