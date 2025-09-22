/**
 * Type definitions for Test Generator Framework
 * Comprehensive types for automated test generation from API specifications
 */

import { OpenAPIV3 } from 'openapi-types';

export interface ApiSpecification {
  /** Specification format */
  format: 'openapi' | 'swagger' | 'raml' | 'postman';
  /** Specification version */
  version: string;
  /** Specification content */
  content: string | object;
  /** Source file path */
  sourcePath?: string;
  /** Base URL for API */
  baseUrl?: string;
}

export interface GenerationConfig {
  /** Output configuration */
  output: OutputConfig;
  /** Test generation strategy */
  strategy: GenerationStrategy;
  /** Template configuration */
  templates: TemplateConfig;
  /** Data generation settings */
  dataGeneration: DataGenerationConfig;
  /** Validation settings */
  validation: ValidationConfig;
  /** Coverage requirements */
  coverage: CoverageConfig;
}

export interface OutputConfig {
  /** Output directory */
  directory: string;
  /** Output format */
  format: 'jest' | 'mocha' | 'cucumber' | 'playwright' | 'cypress';
  /** File naming pattern */
  fileNaming: 'endpoint' | 'operation' | 'tag' | 'custom';
  /** Custom naming template */
  namingTemplate?: string;
  /** Generate separate files per endpoint */
  separateFiles: boolean;
  /** Include documentation in output */
  includeDocumentation: boolean;
}

export interface GenerationStrategy {
  /** Coverage strategy */
  coverage: 'minimal' | 'standard' | 'comprehensive' | 'exhaustive';
  /** Test types to generate */
  testTypes: TestType[];
  /** Include negative test cases */
  includeNegativeTests: boolean;
  /** Include edge case tests */
  includeEdgeCases: boolean;
  /** Include security tests */
  includeSecurityTests: boolean;
  /** Include performance tests */
  includePerformanceTests: boolean;
  /** Test data strategy */
  dataStrategy: 'static' | 'dynamic' | 'hybrid';
  /** Authentication handling */
  authenticationStrategy: AuthenticationStrategy;
}

export type TestType =
  | 'smoke'
  | 'functional'
  | 'integration'
  | 'contract'
  | 'security'
  | 'performance'
  | 'regression'
  | 'edge_case'
  | 'negative';

export interface AuthenticationStrategy {
  /** Authentication type */
  type: 'none' | 'basic' | 'bearer' | 'oauth' | 'apikey' | 'custom';
  /** Test user configuration */
  testUsers: AuthTestUser[];
  /** Token management */
  tokenManagement: {
    /** Generate token before tests */
    generateToken: boolean;
    /** Token endpoint */
    tokenEndpoint?: string;
    /** Token refresh handling */
    refreshHandling: boolean;
  };
}

export interface AuthTestUser {
  /** User identifier */
  id: string;
  /** User credentials */
  credentials: Record<string, string>;
  /** User roles */
  roles: string[];
  /** Expected permissions */
  permissions: string[];
  /** Test scenarios */
  scenarios: string[];
}

export interface TemplateConfig {
  /** Template engine */
  engine: 'handlebars' | 'mustache' | 'ejs' | 'custom';
  /** Template directory */
  templateDir: string;
  /** Custom templates */
  customTemplates: Record<string, string>;
  /** Template variables */
  variables: Record<string, unknown>;
  /** Helper functions */
  helpers: Record<string, Function>;
}

export interface DataGenerationConfig {
  /** Faker locale */
  locale: string;
  /** Random seed for reproducibility */
  seed: number;
  /** Data generation rules */
  rules: DataGenerationRule[];
  /** Custom data providers */
  customProviders: Record<string, DataProvider>;
  /** Realistic data constraints */
  constraints: DataConstraints;
}

export interface DataGenerationRule {
  /** Field path or pattern */
  field: string;
  /** Generation strategy */
  strategy: 'faker' | 'static' | 'pattern' | 'custom';
  /** Configuration for strategy */
  config: Record<string, unknown>;
  /** Validation constraints */
  constraints?: FieldConstraints;
}

export interface DataProvider {
  /** Provider name */
  name: string;
  /** Provider function */
  provider: (options?: any) => unknown;
  /** Provider options schema */
  optionsSchema?: object;
}

export interface DataConstraints {
  /** String constraints */
  strings: {
    minLength: number;
    maxLength: number;
    allowEmpty: boolean;
  };
  /** Number constraints */
  numbers: {
    min: number;
    max: number;
    precision: number;
  };
  /** Array constraints */
  arrays: {
    minItems: number;
    maxItems: number;
  };
  /** Date constraints */
  dates: {
    minDate: string;
    maxDate: string;
    format: string;
  };
}

export interface FieldConstraints {
  /** Required field */
  required?: boolean;
  /** Field type */
  type?: string;
  /** Minimum value */
  minimum?: number;
  /** Maximum value */
  maximum?: number;
  /** String pattern */
  pattern?: string;
  /** Enum values */
  enum?: unknown[];
  /** Custom validation */
  customValidation?: (value: unknown) => boolean;
}

export interface ValidationConfig {
  /** Schema validation */
  schema: {
    /** Enable schema validation */
    enabled: boolean;
    /** Strict validation */
    strict: boolean;
    /** Additional properties handling */
    additionalProperties: 'allow' | 'warn' | 'error';
  };
  /** Response validation */
  response: {
    /** Validate response structure */
    structure: boolean;
    /** Validate response content */
    content: boolean;
    /** Validate response headers */
    headers: boolean;
    /** Custom response validators */
    customValidators: ResponseValidator[];
  };
  /** Contract validation */
  contract: {
    /** Enable contract validation */
    enabled: boolean;
    /** Contract type */
    type: 'pact' | 'openapi' | 'custom';
    /** Strict contract adherence */
    strict: boolean;
  };
}

export interface ResponseValidator {
  /** Validator name */
  name: string;
  /** Validation function */
  validator: (response: any) => ValidationResult;
  /** Validator configuration */
  config?: Record<string, unknown>;
}

export interface ValidationResult {
  /** Validation passed */
  valid: boolean;
  /** Validation errors */
  errors: ValidationError[];
  /** Validation warnings */
  warnings: ValidationWarning[];
}

export interface ValidationError {
  /** Error path */
  path: string;
  /** Error message */
  message: string;
  /** Error code */
  code: string;
  /** Error severity */
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface ValidationWarning {
  /** Warning path */
  path: string;
  /** Warning message */
  message: string;
  /** Warning code */
  code: string;
  /** Recommended action */
  recommendation: string;
}

export interface CoverageConfig {
  /** Endpoint coverage requirements */
  endpoints: {
    /** Minimum percentage of endpoints to cover */
    minCoverage: number;
    /** Exclude patterns */
    excludePatterns: string[];
    /** Include patterns */
    includePatterns: string[];
  };
  /** HTTP method coverage */
  methods: {
    /** Methods to cover */
    include: HttpMethod[];
    /** Methods to exclude */
    exclude: HttpMethod[];
    /** Minimum coverage per method */
    minCoveragePerMethod: number;
  };
  /** Status code coverage */
  statusCodes: {
    /** Include success codes */
    includeSuccess: boolean;
    /** Include client error codes */
    includeClientErrors: boolean;
    /** Include server error codes */
    includeServerErrors: boolean;
    /** Specific codes to test */
    specificCodes: number[];
  };
  /** Schema coverage */
  schemas: {
    /** Cover request schemas */
    requests: boolean;
    /** Cover response schemas */
    responses: boolean;
    /** Minimum field coverage percentage */
    minFieldCoverage: number;
  };
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

export interface GeneratedTest {
  /** Test identifier */
  id: string;
  /** Test name */
  name: string;
  /** Test description */
  description: string;
  /** Test type */
  type: TestType;
  /** Test priority */
  priority: 'low' | 'medium' | 'high' | 'critical';
  /** Source endpoint */
  endpoint: EndpointInfo;
  /** Test code */
  code: string;
  /** Test metadata */
  metadata: TestMetadata;
  /** Test dependencies */
  dependencies: string[];
  /** Test tags */
  tags: string[];
}

export interface EndpointInfo {
  /** HTTP method */
  method: HttpMethod;
  /** Endpoint path */
  path: string;
  /** Operation ID */
  operationId?: string;
  /** Operation summary */
  summary?: string;
  /** Operation description */
  description?: string;
  /** Operation tags */
  tags: string[];
  /** Parameters */
  parameters: ParameterInfo[];
  /** Request body */
  requestBody?: RequestBodyInfo;
  /** Responses */
  responses: ResponseInfo[];
  /** Security requirements */
  security?: SecurityRequirement[];
}

export interface ParameterInfo {
  /** Parameter name */
  name: string;
  /** Parameter location */
  in: 'query' | 'header' | 'path' | 'cookie';
  /** Parameter description */
  description?: string;
  /** Required parameter */
  required: boolean;
  /** Parameter schema */
  schema: SchemaInfo;
  /** Example value */
  example?: unknown;
}

export interface RequestBodyInfo {
  /** Request description */
  description?: string;
  /** Required request body */
  required: boolean;
  /** Content types */
  content: Record<string, ContentInfo>;
}

export interface ResponseInfo {
  /** Status code */
  statusCode: string;
  /** Response description */
  description: string;
  /** Response headers */
  headers?: Record<string, HeaderInfo>;
  /** Response content */
  content?: Record<string, ContentInfo>;
}

export interface ContentInfo {
  /** Media type */
  mediaType: string;
  /** Content schema */
  schema: SchemaInfo;
  /** Example content */
  example?: unknown;
  /** Multiple examples */
  examples?: Record<string, ExampleInfo>;
}

export interface HeaderInfo {
  /** Header description */
  description?: string;
  /** Required header */
  required: boolean;
  /** Header schema */
  schema: SchemaInfo;
}

export interface ExampleInfo {
  /** Example summary */
  summary?: string;
  /** Example description */
  description?: string;
  /** Example value */
  value: unknown;
}

export interface SchemaInfo {
  /** Schema type */
  type?: string;
  /** Schema format */
  format?: string;
  /** Schema properties */
  properties?: Record<string, SchemaInfo>;
  /** Required properties */
  required?: string[];
  /** Additional properties */
  additionalProperties?: boolean | SchemaInfo;
  /** Array items */
  items?: SchemaInfo;
  /** Enum values */
  enum?: unknown[];
  /** Default value */
  default?: unknown;
  /** Example value */
  example?: unknown;
  /** Minimum value */
  minimum?: number;
  /** Maximum value */
  maximum?: number;
  /** String pattern */
  pattern?: string;
  /** Minimum length */
  minLength?: number;
  /** Maximum length */
  maxLength?: number;
  /** Minimum items */
  minItems?: number;
  /** Maximum items */
  maxItems?: number;
}

export interface SecurityRequirement {
  /** Security scheme name */
  name: string;
  /** Security scopes */
  scopes: string[];
}

export interface TestMetadata {
  /** Generation timestamp */
  generatedAt: Date;
  /** Generator version */
  generatorVersion: string;
  /** Source specification */
  sourceSpec: string;
  /** Generation configuration */
  config: Partial<GenerationConfig>;
  /** Estimated execution time */
  estimatedDuration: number;
  /** Test complexity score */
  complexityScore: number;
}

export interface GenerationResult {
  /** Generation summary */
  summary: GenerationSummary;
  /** Generated tests */
  tests: GeneratedTest[];
  /** Generation errors */
  errors: GenerationError[];
  /** Generation warnings */
  warnings: GenerationWarning[];
  /** Coverage report */
  coverage: CoverageReport;
}

export interface GenerationSummary {
  /** Total endpoints processed */
  totalEndpoints: number;
  /** Total tests generated */
  totalTests: number;
  /** Tests by type */
  testsByType: Record<TestType, number>;
  /** Tests by priority */
  testsByPriority: Record<string, number>;
  /** Generation duration */
  duration: number;
  /** Success rate */
  successRate: number;
}

export interface GenerationError {
  /** Error type */
  type: 'parsing' | 'validation' | 'generation' | 'template' | 'output';
  /** Error message */
  message: string;
  /** Error location */
  location?: string;
  /** Error details */
  details?: Record<string, unknown>;
  /** Error severity */
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface GenerationWarning {
  /** Warning type */
  type: 'incomplete' | 'assumption' | 'limitation' | 'recommendation';
  /** Warning message */
  message: string;
  /** Warning location */
  location?: string;
  /** Recommended action */
  recommendation?: string;
}

export interface CoverageReport {
  /** Endpoint coverage */
  endpoints: {
    total: number;
    covered: number;
    percentage: number;
    uncovered: string[];
  };
  /** HTTP method coverage */
  methods: Record<HttpMethod, {
    total: number;
    covered: number;
    percentage: number;
  }>;
  /** Status code coverage */
  statusCodes: {
    success: number;
    clientError: number;
    serverError: number;
    total: number;
  };
  /** Schema coverage */
  schemas: {
    request: number;
    response: number;
    fields: number;
    total: number;
  };
}

export interface TestSuiteGenerator {
  /** Generate test suite from specification */
  generateTestSuite(spec: ApiSpecification, config: GenerationConfig): Promise<GenerationResult>;

  /** Validate specification */
  validateSpecification(spec: ApiSpecification): Promise<ValidationResult>;

  /** Generate single test */
  generateTest(endpoint: EndpointInfo, config: GenerationConfig): Promise<GeneratedTest>;

  /** Generate test data */
  generateTestData(schema: SchemaInfo, config: DataGenerationConfig): unknown;
}

export interface SpecificationParser {
  /** Parse API specification */
  parse(content: string | object): Promise<ParsedSpecification>;

  /** Validate specification format */
  validate(content: string | object): Promise<ValidationResult>;

  /** Extract endpoints */
  extractEndpoints(spec: ParsedSpecification): EndpointInfo[];

  /** Extract schemas */
  extractSchemas(spec: ParsedSpecification): Record<string, SchemaInfo>;
}

export interface ParsedSpecification {
  /** Original specification */
  original: OpenAPIV3.Document | any;
  /** Normalized specification */
  normalized: NormalizedSpecification;
  /** Metadata */
  metadata: SpecificationMetadata;
}

export interface NormalizedSpecification {
  /** Specification info */
  info: {
    title: string;
    version: string;
    description?: string;
  };
  /** Base URL */
  baseUrl: string;
  /** Endpoints */
  endpoints: EndpointInfo[];
  /** Schemas */
  schemas: Record<string, SchemaInfo>;
  /** Security schemes */
  security: Record<string, SecurityScheme>;
}

export interface SecurityScheme {
  /** Scheme type */
  type: 'http' | 'apiKey' | 'oauth2' | 'openIdConnect';
  /** Scheme details */
  details: Record<string, unknown>;
}

export interface SpecificationMetadata {
  /** Format */
  format: string;
  /** Version */
  version: string;
  /** Parser used */
  parser: string;
  /** Parsing timestamp */
  parsedAt: Date;
  /** Statistics */
  statistics: {
    endpoints: number;
    schemas: number;
    operations: number;
  };
}

export interface TestTemplate {
  /** Template name */
  name: string;
  /** Template content */
  content: string;
  /** Template engine */
  engine: string;
  /** Template variables */
  variables: Record<string, unknown>;
  /** Template helpers */
  helpers: Record<string, Function>;
}

export interface TemplateEngine {
  /** Render template */
  render(template: TestTemplate, data: Record<string, unknown>): Promise<string>;

  /** Compile template */
  compile(content: string): Promise<CompiledTemplate>;

  /** Register helper */
  registerHelper(name: string, helper: Function): void;

  /** Register partial */
  registerPartial(name: string, partial: string): void;
}

export interface CompiledTemplate {
  /** Render with data */
  render(data: Record<string, unknown>): string;

  /** Template metadata */
  metadata: {
    variables: string[];
    helpers: string[];
    partials: string[];
  };
}