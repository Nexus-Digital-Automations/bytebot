/**
 * Test Generators Framework - Main Entry Point
 * Automated test generation from API specifications
 */

// Core exports
export * from './generators';
export * from './parsers';
export * from './templates';
export * from './validators';
export * from './types';

// Main generator classes
export { OpenApiTestGenerator } from './generators/openapi-generator';
export { SwaggerTestGenerator } from './generators/swagger-generator';
export { ContractTestGenerator } from './generators/contract-generator';

// Parser exports
export { OpenApiParser } from './parsers/openapi-parser';
export { SwaggerParser } from './parsers/swagger-parser';

// Template engines
export { HandlebarsEngine } from './templates/handlebars-engine';
export { MustacheEngine } from './templates/mustache-engine';

// Validators
export { SpecificationValidator } from './validators/specification-validator';
export { TestValidator } from './validators/test-validator';

// Re-export key types for convenience
export type {
  ApiSpecification,
  GenerationConfig,
  GeneratedTest,
  GenerationResult,
  TestSuiteGenerator,
  SpecificationParser,
  ValidationResult
} from './types';