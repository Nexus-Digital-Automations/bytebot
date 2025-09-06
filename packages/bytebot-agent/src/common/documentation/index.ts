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

// Swagger/OpenAPI configuration
export * from './swagger.config';
export {
  createSwaggerConfig,
  setupApiDocumentation,
  generateDocumentationMetadata,
  SECURITY_SCHEMES,
  CUSTOM_EXTENSIONS,
} from './swagger.config';

// Default export for convenience
export { default as SwaggerConfig } from './swagger.config';

export default {
  createSwaggerConfig,
  setupApiDocumentation,
  generateDocumentationMetadata,
  SECURITY_SCHEMES,
  CUSTOM_EXTENSIONS,
};
